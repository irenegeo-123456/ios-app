import type { CanvasBlock, CanvasDoc } from '../../../data/types'
import {
  channelMentionHtml,
  cleanInline,
  emojiChar,
  esc,
  isListType,
  linkHtml,
  normalizeBlocks,
  parseArticle,
  plainText,
  renderArticle,
  titleSectionId,
  userMentionHtml,
  type InlineCtx,
  type ListType,
  type TextType,
} from '../../../data/canvas/model'
import {
  backspaceAtStart,
  canIndent,
  deleteAtEnd,
  deleteBetween,
  indent,
  insertDivider,
  pasteLines,
  setType,
  split,
  toDivider,
  toggleChecked,
  type Caret,
  type EditResult,
  type Model,
} from '../../../data/canvas/ops'

// The canvas editor, ported from the web kit (slack-remix src/components/canvas/editor.ts): a contenteditable <article>
// holding Quip's markup (src/data/canvas/model.ts). Typing inside a section is left to the browser; anything that
// changes the structure (Return, joining sections, markdown shortcuts, pasting lines, deleting across sections, the
// toolbar's section styles, undo) is done on the model and the article is re-rendered from it.
//
// On top of the web kit's editor this one answers the iOS editing toolbar (CanvasToolbarLayoutBuilder.swift) and the
// format picker (CanvasFormatPickerPresenter.swift): what's active at the caret (formats()), section styles, inline
// styles, links, indent / outdent, dividers, emoji. The simulated keyboard types with execCommand, which fires no
// keydown or beforeinput, so a backspace from it is left to the browser and the article is repaired afterwards.

export type AcKind = 'member' | 'channel' | 'emoji'

export interface AcTrigger {
  kind: AcKind
  query: string
  /** where the trigger character sits, to replace `@que` with the chosen item */
  node: Text
  start: number
  /** the trigger character's box, in client coordinates */
  rect: { left: number; top: number; bottom: number }
}

export interface EditorHost {
  doc: () => CanvasDoc | undefined
  ctx: () => InlineCtx
  save: (patch: { title: string; blocks: CanvasBlock[] }) => void
  /** after every (re-)render: embedded cards and checkboxes need their React content again */
  rendered: () => void
  /** after any change of the text or the caret (placeholders, the toolbar's state, keeping the caret in view) */
  changed: () => void
  autocomplete: (t: AcTrigger | null) => void
  openMention: (kind: 'user' | 'channel', id: string) => void
  openEmbed: (section: HTMLElement) => void
  openLink: (href: string) => void
}

/** The section style a toolbar or format picker button sets. */
export type SectionStyle = 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'bullet' | 'ordered' | 'checklist'
export type InlineMark = 'bold' | 'italic' | 'underline' | 'strike' | 'code'

/** What the toolbar shows for the caret (FormatButtonItemState.swift / CanvasToolbarLayoutBuilder.swift). */
export interface Formats {
  /** the caret is in the canvas (the editor has the selection) */
  focused: boolean
  /** the title section: formatting is disabled there */
  inTitle: boolean
  /** the focused section's style */
  style: SectionStyle | 'code' | null
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  code: boolean
  /** the caret or selection is in a link */
  link: boolean
  /** text is selected (the range toolbar) */
  ranged: boolean
  canIndent: boolean
  canOutdent: boolean
}

export const NO_FORMATS: Formats = { focused: false, inTitle: false, style: null, bold: false, italic: false, underline: false, strike: false, code: false, link: false, ranged: false, canIndent: false, canOutdent: false }

const TEXT_CONTENT = '.section[data-section-type="0"] > .content, .section[data-section-type="64"] > .content'
const ATOMIC = new Set(['CONTROL', 'IMG', 'BR'])
const STYLE_OF: Record<string, SectionStyle | 'code'> = { '0': 'p', '1': 'h1', '2': 'h2', '3': 'h3', '4': 'code', '16': 'quote', '5': 'bullet', '6': 'ordered', '7': 'checklist' }

const INLINE_MARKS: Record<string, { re: RegExp; tag: string }> = {
  '*': { re: /(^|[\s(])\*([^*\s](?:[^*]*[^*\s])?)\*$/, tag: 'b' },
  _: { re: /(^|[\s(])_([^_\s](?:[^_]*[^_\s])?)_$/, tag: 'i' },
  '~': { re: /(^|[\s(])~([^~\s](?:[^~]*[^~\s])?)~$/, tag: 'del' },
  '`': { re: /(^|[\s(])`([^`]+)`$/, tag: 'code' },
}

const BLOCK_SHORTCUTS: [RegExp, TextType | ListType][] = [
  [/^###$/, 'h3'],
  [/^##$/, 'h2'],
  [/^#$/, 'h1'],
  [/^[-*•]$/, 'bullet'],
  [/^1[.)]$/, 'ordered'],
  [/^\[ ?\]$/, 'checklist'],
  [/^>$/, 'quote'],
]

function unitLength(n: Node): number {
  if (n.nodeType === Node.TEXT_NODE) return n.textContent?.length ?? 0
  if (!(n instanceof Element)) return Array.from(n.childNodes).reduce((a, c) => a + unitLength(c), 0)
  if (n.tagName === 'EDITOR-UI') return 0
  if (ATOMIC.has(n.tagName)) return 1
  return Array.from(n.childNodes).reduce((a, c) => a + unitLength(c), 0)
}

const qs = (cmd: string) => {
  try {
    return document.queryCommandState(cmd)
  } catch {
    return false
  }
}

export class CanvasEditor {
  readonly titleId: string
  private saveTimer = 0
  private checkpointTimer = 0
  private lastSaved = ''
  private history: { key: string; model: Model; caret: Caret | null }[] = []
  private future: { key: string; model: Model; caret: Caret | null }[] = []
  private ac: AcTrigger | null = null
  private readonly article: HTMLElement
  private readonly docId: string
  private readonly host: EditorHost

  constructor(article: HTMLElement, docId: string, host: EditorHost) {
    this.article = article
    this.docId = docId
    this.host = host
    this.titleId = titleSectionId(docId)
  }

  // ---- model <-> DOM --------------------------------------------------------------------------

  mount() {
    const doc = this.host.doc()
    if (!doc) return
    const model = { title: doc.title, blocks: normalizeBlocks(doc.blocks) }
    this.lastSaved = JSON.stringify({ title: doc.title, blocks: doc.blocks })
    this.render(model, null)
    this.history = [{ key: JSON.stringify(model), model, caret: null }]
  }

  destroy() {
    this.flush()
    window.clearTimeout(this.checkpointTimer)
  }

  /** The store changed the document: re-render unless it's our own write. */
  external(doc: CanvasDoc | undefined) {
    if (!doc) return
    const key = JSON.stringify({ title: doc.title, blocks: doc.blocks })
    if (key === this.lastSaved) return
    this.lastSaved = key
    const caret = this.focused() ? this.caret() : null
    this.render({ title: doc.title, blocks: normalizeBlocks(doc.blocks) }, caret)
  }

  private render(model: Model, caret: Caret | null) {
    this.article.innerHTML = renderArticle({ id: this.docId, title: model.title, blocks: model.blocks })
    this.host.rendered()
    this.host.changed()
    if (caret) this.place(caret)
  }

  read(): Model {
    const doc = this.host.doc()
    const prev: CanvasDoc = doc ?? { id: this.docId, title: '', creatorId: '', created: '', updated: '', blocks: [] }
    return parseArticle(this.article, this.host.ctx(), prev)
  }

  /** Debounced save to the store (immediately with `now`). */
  save(now = false) {
    window.clearTimeout(this.saveTimer)
    if (now) this.flush()
    else this.saveTimer = window.setTimeout(() => this.flush(), 250)
  }

  flush() {
    window.clearTimeout(this.saveTimer)
    if (!this.article.isConnected) return
    const m = this.read()
    const key = JSON.stringify(m)
    if (key === this.lastSaved) return
    this.lastSaved = key
    this.host.save(m)
  }

  // ---- history ---------------------------------------------------------------------------------

  private checkpoint() {
    window.clearTimeout(this.checkpointTimer)
    const model = this.read()
    const key = JSON.stringify(model)
    if (this.history[this.history.length - 1]?.key === key) return
    this.history.push({ key, model, caret: this.caret() })
    if (this.history.length > 200) this.history.shift()
    this.future = []
  }

  undo() {
    this.checkpoint()
    if (this.history.length < 2) return
    this.future.push(this.history.pop()!)
    const s = this.history[this.history.length - 1]
    this.render(s.model, s.caret ?? this.endCaret(s.model))
    this.save(true)
  }

  /** There's something to take back: an earlier state, or typing since the last checkpoint (the bar's Undo). */
  canUndo(): boolean {
    if (this.history.length > 1) return true
    const first = this.history[0]
    return !!first && first.key !== JSON.stringify(this.read())
  }

  /** Something undone can come back (the bar's Redo). */
  canRedo(): boolean {
    return this.future.length > 0
  }

  redo() {
    const s = this.future.pop()
    if (!s) return
    this.history.push(s)
    this.render(s.model, s.caret ?? this.endCaret(s.model))
    this.save(true)
  }

  private endCaret(m: Model): Caret {
    const last = [...m.blocks].reverse().find((b) => 'html' in b || 'items' in b)
    if (!last) return { id: this.titleId, offset: m.title.length }
    if ('items' in last) return { id: last.items[last.items.length - 1].id, offset: 9999 }
    return { id: last.id, offset: 9999 }
  }

  /** Runs a model edit: snapshot, edit, re-render, place the caret, save. */
  private apply(edit: (m: Model) => EditResult | null) {
    this.checkpoint()
    const r = edit(this.read())
    if (!r) return
    this.render({ title: r.model.title, blocks: normalizeBlocks(r.model.blocks) }, r.caret)
    this.save(true)
    this.checkpoint()
  }

  // ---- caret -------------------------------------------------------------------------------------

  focused() {
    return this.article.contains(document.activeElement) || document.activeElement === this.article
  }

  /** The text section content that holds `node`. */
  contentOf(node: Node | null): HTMLElement | null {
    const el = node instanceof Element ? node : node?.parentElement
    const c = el?.closest(TEXT_CONTENT) as HTMLElement | null
    return c && this.article.contains(c) ? c : null
  }

  private textContents(): HTMLElement[] {
    return Array.from(this.article.querySelectorAll<HTMLElement>(TEXT_CONTENT))
  }

  /** The text content at a range boundary, looking forward/backward when the boundary sits between sections. */
  private contentAt(container: Node, offset: number, forward: boolean): HTMLElement | null {
    const direct = this.contentOf(container)
    if (direct) return direct
    const probe = container.nodeType === Node.ELEMENT_NODE && container.childNodes[offset] ? container.childNodes[offset] : container
    const all = this.textContents()
    if (forward) return all.find((c) => probe === c || !!(probe.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)) ?? null
    return [...all].reverse().find((c) => probe === c || !!(probe.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_PRECEDING)) ?? null
  }

  range(): Range | null {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return null
    const r = sel.getRangeAt(0)
    return this.article.contains(r.commonAncestorContainer) || r.commonAncestorContainer === this.article ? r : null
  }

  private offsetIn(content: HTMLElement, node: Node, offset: number): number {
    const r = document.createRange()
    r.setStart(content, 0)
    try {
      r.setEnd(node, offset)
    } catch {
      return 0
    }
    return unitLength(r.cloneContents())
  }

  caret(): Caret | null {
    const r = this.range()
    if (!r) return null
    const c = this.contentOf(r.startContainer)
    if (!c?.dataset.id) return null
    return { id: c.dataset.id, offset: this.offsetIn(c, r.startContainer, r.startOffset) }
  }

  place(caret: Caret) {
    const content = this.article.querySelector<HTMLElement>(`.section[data-id="${CSS.escape(caret.id)}"] > .content`)
    if (!content) return
    const r = document.createRange()
    let rem = caret.offset
    const walk = (node: Node): boolean => {
      for (const ch of Array.from(node.childNodes)) {
        if (ch.nodeType === Node.TEXT_NODE) {
          const len = ch.textContent?.length ?? 0
          if (rem <= len) {
            r.setStart(ch, rem)
            return true
          }
          rem -= len
          continue
        }
        if (!(ch instanceof Element) || ch.tagName === 'EDITOR-UI') continue
        if (ATOMIC.has(ch.tagName)) {
          if (rem === 0) {
            r.setStartBefore(ch)
            return true
          }
          rem -= 1
          if (rem === 0 && ch.tagName !== 'BR' && !ch.nextSibling) {
            r.setStartAfter(ch)
            return true
          }
          continue
        }
        if (walk(ch)) return true
      }
      return false
    }
    if (!walk(content)) {
      const last = content.lastChild
      if (last?.nodeName === 'BR') r.setStartBefore(last)
      else {
        r.selectNodeContents(content)
        r.collapse(false)
      }
    }
    r.collapse(true)
    this.article.focus({ preventScroll: true })
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
    this.host.changed()
  }

  /** Focus the end of the document (taps below the last section). */
  focusEnd() {
    const all = this.textContents()
    const last = all[all.length - 1]
    if (last?.dataset.id) this.place({ id: last.dataset.id, offset: unitLength(last) - (last.lastChild?.nodeName === 'BR' ? 1 : 0) })
  }

  /** Focus the title (a new canvas starts there). */
  focusTitle() {
    this.place({ id: this.titleId, offset: 9999 })
  }

  /** A tap that starts editing: the caret goes where the finger was (caretRangeFromPoint), or to the end. */
  focusAt(x: number, y: number) {
    const r = document.caretRangeFromPoint?.(x, y)
    if (r && this.contentOf(r.startContainer)) {
      this.article.focus({ preventScroll: true })
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
      this.host.changed()
      return
    }
    this.focusEnd()
  }

  private isTitle(content: HTMLElement) {
    return (content.parentElement as HTMLElement | null)?.dataset.sectionStyle === '48'
  }

  private styleOf(content: HTMLElement): string {
    const li = content.closest('li')
    if (li && this.article.contains(li)) return 'li'
    return (content.parentElement as HTMLElement | null)?.dataset.sectionStyle ?? '0'
  }

  /** The section style of the block a content element belongs to (lists by their list section). */
  private blockStyleOf(content: HTMLElement): SectionStyle | 'code' | null {
    const li = content.closest('li')
    const sec = li ? (li.closest('.section[data-section-type="1"]') as HTMLElement | null) : (content.parentElement as HTMLElement | null)
    return STYLE_OF[sec?.dataset.sectionStyle ?? ''] ?? null
  }

  /** True when the selection covers more than one section. */
  private spansSections(r: Range): boolean {
    if (r.collapsed) return false
    const a = this.contentAt(r.startContainer, r.startOffset, true)
    const b = this.contentAt(r.endContainer, r.endOffset, false)
    return !a || !b || a !== b || !this.contentOf(r.startContainer) || !this.contentOf(r.endContainer)
  }

  /** Deletes a selection that spans sections (joins the first and last). Returns false if there's nothing to do. */
  private deleteSelection(r: Range): boolean {
    const s = this.contentAt(r.startContainer, r.startOffset, true)
    const e = this.contentAt(r.endContainer, r.endOffset, false)
    if (!s || !e || !s.dataset.id || !e.dataset.id) return false
    const ctx = this.host.ctx()
    const headR = document.createRange()
    headR.setStart(s, 0)
    if (this.contentOf(r.startContainer) === s) headR.setEnd(r.startContainer, r.startOffset)
    else headR.setEnd(s, 0)
    const tailR = document.createRange()
    if (this.contentOf(r.endContainer) === e) tailR.setStart(r.endContainer, r.endOffset)
    else tailR.setStart(e, e.childNodes.length)
    tailR.setEnd(e, e.childNodes.length)
    const head = cleanInline(headR.cloneContents(), ctx)
    const tail = cleanInline(tailR.cloneContents(), ctx)
    const sId = s.dataset.id
    const eId = e.dataset.id
    if (sId === eId) return false
    this.apply((m) => deleteBetween(m, this.titleId, sId, head, eId, tail))
    return true
  }

  // ---- what the toolbar shows ------------------------------------------------------------------------

  formats(): Formats {
    const r = this.range()
    if (!r || !this.focused()) return NO_FORMATS
    const content = this.contentOf(r.startContainer) ?? this.contentAt(r.startContainer, r.startOffset, true)
    if (!content) return { ...NO_FORMATS, focused: true }
    const inTitle = this.isTitle(content)
    const style = inTitle ? null : this.blockStyleOf(content)
    const el = r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement
    const inCode = !!el?.closest('code') && this.article.contains(el)
    const inLink = !!el?.closest('a[href]:not(.slack-mention)') && this.article.contains(el)
    const id = content.dataset.id ?? ''
    const isList = style === 'bullet' || style === 'ordered' || style === 'checklist'
    const model = isList ? this.read() : null
    return {
      focused: true,
      inTitle,
      style,
      bold: !inTitle && qs('bold'),
      italic: !inTitle && qs('italic'),
      underline: !inTitle && qs('underline'),
      strike: !inTitle && qs('strikeThrough'),
      code: inCode,
      link: inLink,
      ranged: !r.collapsed,
      canIndent: !!model && canIndent(model, id, 1),
      canOutdent: !!model && canIndent(model, id, -1),
    }
  }

  // ---- toolbar actions -------------------------------------------------------------------------------

  /** The section style buttons: body, the three headings, quote and the three lists. Again on an active list or
   *  quote turns it back into body text. Applies to every section a selection touches. */
  applySection(style: SectionStyle) {
    const r = this.range()
    if (!r) return
    const start = this.contentAt(r.startContainer, r.startOffset, true)
    const end = this.contentAt(r.endContainer, r.endOffset, false) ?? start
    if (!start || this.isTitle(start)) return
    const all = this.textContents().filter((c) => !this.isTitle(c))
    const i = all.indexOf(start)
    const j = end ? all.indexOf(end) : i
    const ids = all.slice(i, Math.max(i, j) + 1).map((c) => c.dataset.id!).filter(Boolean)
    const current = this.blockStyleOf(start)
    const off = current === style && (isListType(style) || style === 'quote')
    const target: TextType | ListType = off ? 'p' : style
    const caret = this.caret()
    this.apply((m0) => {
      let m = m0
      for (const id of ids) m = setType(m, id, target, id === caret?.id ? caret.offset : 0).model
      return { model: m, caret }
    })
  }

  /** Bold, italic, underline, strikethrough (the browser's commands) and inline code (our <code>). */
  toggleInline(mark: InlineMark) {
    const r = this.range()
    if (!r) return
    const content = this.contentOf(r.startContainer)
    if (!content || this.isTitle(content)) return
    if (mark === 'code') return this.toggleCode(r)
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(mark === 'bold' ? 'bold' : mark === 'italic' ? 'italic' : mark === 'underline' ? 'underline' : 'strikeThrough')
    this.save()
    this.host.changed()
  }

  private toggleCode(r: Range) {
    const el = r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement
    const code = el?.closest('code')
    if (code && this.article.contains(code)) {
      // unwrap the code run the caret is in
      const parent = code.parentNode!
      while (code.firstChild) parent.insertBefore(code.firstChild, code)
      code.remove()
    } else if (!r.collapsed) {
      const c = document.createElement('code')
      c.appendChild(r.extractContents())
      c.querySelectorAll('code').forEach((x) => x.replaceWith(...Array.from(x.childNodes)))
      r.insertNode(c)
      const sel = window.getSelection()
      const nr = document.createRange()
      nr.selectNodeContents(c)
      sel?.removeAllRanges()
      sel?.addRange(nr)
    } else {
      // a caret: the next characters go into a code run
      const c = document.createElement('code')
      c.textContent = '​'
      r.insertNode(c)
      const sel = window.getSelection()
      const nr = document.createRange()
      nr.setStart(c.firstChild!, 1)
      nr.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(nr)
    }
    this.save()
    this.host.changed()
  }

  /** The "+" sheet's Divider (CanvasDividerPlugin.swift). */
  insertDivider() {
    const c = this.caret()
    const id = c?.id ?? this.endCaret(this.read()).id
    this.apply((m) => insertDivider(m, id, this.titleId))
  }

  /** The toolbar's Indent / Outdent (CanvasToolbarItem.ButtonId.indent / .outdent). */
  indentBy(delta: 1 | -1) {
    const c = this.caret()
    if (!c) return
    this.apply((m) => {
      const res = indent(m, c.id, delta)
      return res ? { ...res, caret: c } : null
    })
  }

  /** Puts the selection back (a sheet took the focus) and inserts HTML at it. */
  insertHtml(html: string, at?: Caret | null) {
    if (at) this.place(at)
    let r = this.range()
    if (!r) {
      this.focusEnd()
      r = this.range()
    }
    if (!r) return
    const content = this.contentOf(r.startContainer)
    if (!content) return
    if (this.isTitle(content)) {
      document.execCommand('insertText', false, html.replace(/<[^>]+>/g, ''))
    } else {
      r.deleteContents()
      const tpl = document.createElement('template')
      tpl.innerHTML = html
      const last = tpl.content.lastChild
      r.insertNode(tpl.content)
      if (last) {
        const nr = document.createRange()
        if (last.nodeType === Node.TEXT_NODE) nr.setStart(last, (last as Text).length)
        else nr.setStartAfter(last)
        nr.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(nr)
      }
    }
    this.save()
    this.checkpoint()
    this.host.changed()
  }

  /** The emoji picker's choice, as the emoji character (canvases store emoji as text, like Quip). */
  insertEmoji(name: string, at?: Caret | null) {
    const ch = emojiChar(name.replace(/^:|:$/g, ''))
    if (ch) this.insertHtml(esc(ch), at)
  }

  /** The link under the caret, or the selected text, for the link editor. */
  linkTarget(): { label: string; url: string; isEdit: boolean; range: Range } | null {
    const r = this.range()
    if (!r) return null
    const content = this.contentOf(r.startContainer)
    if (!content || this.isTitle(content)) return null
    const el = r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement
    const a = el?.closest('a[href]:not(.slack-mention)') as HTMLAnchorElement | null
    if (a && this.article.contains(a)) {
      const ar = document.createRange()
      ar.selectNode(a)
      return { label: a.textContent ?? '', url: a.getAttribute('href') ?? '', isEdit: true, range: ar }
    }
    return { label: r.toString(), url: '', isEdit: false, range: r.cloneRange() }
  }

  /** The link editor's result: replace the range with a link, or (null url) unlink it. */
  setLink(range: Range, label: string, url: string | null) {
    const sel = window.getSelection()
    this.article.focus({ preventScroll: true })
    const node = range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as Element).childNodes[range.startOffset] : null
    const existing = node instanceof HTMLAnchorElement ? node : null
    if (url === null) {
      if (existing) existing.replaceWith(...Array.from(existing.childNodes))
    } else {
      range.deleteContents()
      const tpl = document.createElement('template')
      tpl.innerHTML = linkHtml(url, label || url)
      const a = tpl.content.firstChild!
      range.insertNode(a)
      const after = document.createTextNode('​')
      a.parentNode!.insertBefore(after, a.nextSibling)
      const nr = document.createRange()
      nr.setStart(after, 1)
      nr.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(nr)
    }
    this.save(true)
    this.checkpoint()
    this.host.changed()
  }

  /** The range toolbar's back button: drop the selection, keep the caret at its end. */
  collapseSelection() {
    const r = this.range()
    if (!r) return
    r.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
    this.host.changed()
  }

  /** A checklist checkbox (an SKCheckbox drawn into the item's marker) was toggled. */
  setChecked(itemId: string, on: boolean) {
    const caret = this.focused() ? this.caret() : null
    this.checkpoint()
    const m = toggleChecked(this.read(), itemId, on)
    // Only the item's class changes, so the caret and the rest of the DOM stay put.
    const li = this.article.querySelector(`.section[data-id="${CSS.escape(itemId)}"]`)?.closest('li')
    if (li) li.classList.toggle('checked', on)
    else this.render(m, caret)
    this.save(true)
    this.checkpoint()
  }

  // ---- keyboard ----------------------------------------------------------------------------------

  /** Returns true when the key was handled (the caller prevents the default). */
  keydown(e: KeyboardEvent): boolean {
    const mod = e.metaKey || e.ctrlKey
    const r = this.range()
    if (!r) return false
    const content = this.contentOf(r.startContainer)
    const inTitle = !!content && this.isTitle(content)
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase()
      if (k === 'z') {
        if (e.shiftKey) this.redo()
        else this.undo()
        return true
      }
      if (k === 'y') {
        this.redo()
        return true
      }
      const mark: InlineMark | null = k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'u' ? 'underline' : k === 'x' && e.shiftKey ? 'strike' : null
      if (mark) {
        if (!inTitle) this.toggleInline(mark)
        return true
      }
      if (k === 'a') return false
    }
    if (e.key === 'Enter' && !e.isComposing) {
      this.enter(e.shiftKey)
      return true
    }
    if (e.key === 'Tab') {
      if (content && this.styleOf(content) === 'li' && content.dataset.id) {
        const id = content.dataset.id
        const caret = this.caret()
        this.apply((m) => {
          const res = indent(m, id, e.shiftKey ? -1 : 1)
          return res ? { ...res, caret } : null
        })
      }
      return true
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (this.spansSections(r)) return this.deleteSelection(r)
      if (!r.collapsed || !content?.dataset.id) return false
      const id = content.dataset.id
      const offset = this.offsetIn(content, r.startContainer, r.startOffset)
      if (e.key === 'Backspace' && offset === 0) {
        this.apply((m) => backspaceAtStart(m, id, this.titleId))
        return true
      }
      const len = unitLength(content) - (content.lastChild?.nodeName === 'BR' ? 1 : 0)
      if (e.key === 'Delete' && offset >= len) {
        this.apply((m) => deleteAtEnd(m, id, this.titleId, offset))
        return true
      }
    }
    return false
  }

  private enter(soft: boolean) {
    let r = this.range()
    if (!r) return
    if (this.spansSections(r)) {
      this.deleteSelection(r)
      r = this.range()
      if (!r) return
    }
    if (!r.collapsed) {
      r.deleteContents()
      r = this.range()
      if (!r) return
    }
    const content = this.contentOf(r.startContainer)
    if (!content?.dataset.id) return
    const style = this.styleOf(content)
    if (soft && !this.isTitle(content)) {
      document.execCommand('insertLineBreak')
      this.save()
      return
    }
    if (style === '4') {
      // Code blocks keep their lines; Return on an empty one leaves it.
      if (!plainText(content).trim()) {
        const id = content.dataset.id
        this.apply((m) => setType(m, id, 'p'))
      } else {
        document.execCommand('insertLineBreak')
        this.save()
      }
      return
    }
    const ctx = this.host.ctx()
    const after = document.createRange()
    after.setStart(r.startContainer, r.startOffset)
    after.setEnd(content, content.childNodes.length)
    const tailFrag = after.cloneContents()
    const before = document.createRange()
    before.setStart(content, 0)
    before.setEnd(r.startContainer, r.startOffset)
    const headFrag = before.cloneContents()
    const title = this.isTitle(content)
    const head = title ? esc(plainText(wrap(headFrag))) : cleanInline(headFrag, ctx)
    const tail = title ? esc(plainText(wrap(tailFrag))) : cleanInline(tailFrag, ctx)
    const id = content.dataset.id
    this.apply((m) => split(m, id, this.titleId, head, tail))
  }

  // ---- input ---------------------------------------------------------------------------------------

  /** `beforeinput`: returns true when handled. */
  beforeInput(e: InputEvent): boolean {
    const r = this.range()
    if (!r) return false
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
      this.enter(e.inputType === 'insertLineBreak')
      return true
    }
    if (e.inputType === 'historyUndo') {
      this.undo()
      return true
    }
    if (e.inputType === 'historyRedo') {
      this.redo()
      return true
    }
    if ((e.inputType.startsWith('insert') || e.inputType.startsWith('delete')) && this.spansSections(r)) {
      if (!this.deleteSelection(r)) return true
      if (e.inputType === 'insertText' && e.data) document.execCommand('insertText', false, e.data)
      return true
    }
    // Typing where there is no text section (between sections, on a divider): go to the nearest one.
    if (e.inputType === 'insertText' && !this.contentOf(r.startContainer)) {
      const c = this.contentAt(r.startContainer, r.startOffset, true) ?? this.contentAt(r.startContainer, r.startOffset, false)
      if (c?.dataset.id) {
        this.place({ id: c.dataset.id, offset: 0 })
        if (e.data) document.execCommand('insertText', false, e.data)
      }
      return true
    }
    return false
  }

  input(e: InputEvent) {
    // A delete the browser did by itself (the simulated keyboard's ⌫ runs execCommand('delete')) may have merged
    // sections: put the markup back in shape.
    if (e.inputType?.startsWith('delete') && this.repair()) return
    this.save()
    window.clearTimeout(this.checkpointTimer)
    this.checkpointTimer = window.setTimeout(() => this.checkpoint(), 700)
    if (e.inputType === 'insertText' && e.data) {
      if (e.data === ' ' && this.blockShortcut()) return
      if (e.data === '-' && this.dividerShortcut()) return
      if (e.data === '`' && this.codeShortcut()) return
      if (INLINE_MARKS[e.data]) this.inlineShortcut(e.data)
      if (e.data === ':') this.emojiShortcut()
    }
    this.updateAutocomplete()
    this.host.changed()
  }

  /**
   * After the browser joined two sections on its own: a section left without its content (its text moved into the one
   * above) is dropped, and the article is rendered again from what's left. Returns true when it re-rendered.
   */
  private repair(): boolean {
    const broken = Array.from(this.article.children).some((n) => {
      if (!(n instanceof HTMLElement)) return false
      if (n.tagName === 'EDITOR-UI') return false
      if (!n.classList.contains('section')) return true
      return !n.querySelector(':scope > .content')
    })
    const strayItems = this.article.querySelectorAll('li > .section:not(:has(> .content))').length > 0
    if (!broken && !strayItems) return false
    const caret = this.caret()
    // drop the husks before reading, so they don't come back as empty paragraphs
    this.article.querySelectorAll(':scope > .section:not(:has(> .content)), li:has(> .section:not(:has(> .content)))').forEach((n) => n.remove())
    const m = this.read()
    this.render({ title: m.title, blocks: normalizeBlocks(m.blocks) }, caret ?? this.endCaret(m))
    this.save(true)
    return true
  }

  private textBeforeCaret(): { content: HTMLElement; text: string } | null {
    const r = this.range()
    if (!r || !r.collapsed) return null
    const content = this.contentOf(r.startContainer)
    if (!content) return null
    const before = document.createRange()
    before.setStart(content, 0)
    before.setEnd(r.startContainer, r.startOffset)
    return { content, text: before.toString() }
  }

  private blockShortcut(): boolean {
    const t = this.textBeforeCaret()
    if (!t || this.isTitle(t.content) || !t.content.dataset.id) return false
    const style = this.styleOf(t.content)
    if (style !== '0' && style !== 'li') return false
    const text = t.text.replace(/ /g, ' ')
    if (!text.endsWith(' ')) return false
    const marker = text.slice(0, -1)
    const hit = BLOCK_SHORTCUTS.find(([re]) => re.test(marker))
    if (!hit) return false
    if (style === 'li' && !(hit[1] === 'bullet' || hit[1] === 'ordered' || hit[1] === 'checklist')) return false
    this.removeBeforeCaret(t.content)
    const id = t.content.dataset.id
    this.apply((m) => setType(m, id, hit[1]))
    return true
  }

  private dividerShortcut(): boolean {
    const t = this.textBeforeCaret()
    if (!t || !t.content.dataset.id || this.styleOf(t.content) !== '0' || this.isTitle(t.content)) return false
    if (plainText(t.content) !== '---') return false
    const id = t.content.dataset.id
    this.apply((m) => toDivider(m, id))
    return true
  }

  private codeShortcut(): boolean {
    const t = this.textBeforeCaret()
    if (!t || !t.content.dataset.id || this.styleOf(t.content) !== '0' || this.isTitle(t.content)) return false
    if (t.text !== '```') return false
    this.removeBeforeCaret(t.content)
    const id = t.content.dataset.id
    this.apply((m) => setType(m, id, 'code'))
    return true
  }

  private removeBeforeCaret(content: HTMLElement) {
    const r = this.range()
    if (!r) return
    const before = document.createRange()
    before.setStart(content, 0)
    before.setEnd(r.startContainer, r.startOffset)
    before.deleteContents()
  }

  /** `*bold*`, `_italic_`, `~strike~` and `` `code` `` as you type the closing mark. */
  private inlineShortcut(mark: string) {
    const r = this.range()
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE) return
    const content = this.contentOf(r.startContainer)
    if (!content || this.isTitle(content) || this.styleOf(content) === '4') return
    const node = r.startContainer as Text
    if (node.parentElement?.closest('code')) return
    const text = node.data.slice(0, r.startOffset)
    const m = INLINE_MARKS[mark].re.exec(text)
    if (!m) return
    const inner = m[2]
    const start = r.startOffset - inner.length - 2
    const rest = node.data.slice(r.startOffset)
    node.data = node.data.slice(0, start)
    const el = document.createElement(INLINE_MARKS[mark].tag)
    el.textContent = inner
    const after = document.createTextNode(rest || '​')
    node.after(el, after)
    const sel = window.getSelection()
    const nr = document.createRange()
    nr.setStart(after, rest ? 0 : 1)
    nr.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(nr)
    this.save()
  }

  /** `:tada:` becomes 🎉 when you type the closing colon. */
  private emojiShortcut() {
    const r = this.range()
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE) return
    const node = r.startContainer as Text
    const text = node.data.slice(0, r.startOffset)
    const m = /(^|[\s(]):([a-z0-9_+'-]+):$/.exec(text)
    if (!m) return
    const ch = emojiChar(m[2])
    if (!ch) return
    const start = r.startOffset - m[2].length - 2
    const rest = node.data.slice(r.startOffset)
    node.data = node.data.slice(0, start) + ch + rest
    const nr = document.createRange()
    nr.setStart(node, start + ch.length)
    nr.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(nr)
    this.close()
    this.save()
  }

  // ---- autocomplete ------------------------------------------------------------------------------

  updateAutocomplete() {
    const r = this.range()
    const trigger = r && r.collapsed && r.startContainer.nodeType === Node.TEXT_NODE ? this.trigger(r) : null
    this.ac = trigger
    this.host.autocomplete(trigger)
  }

  private trigger(r: Range): AcTrigger | null {
    const content = this.contentOf(r.startContainer)
    if (!content || this.isTitle(content) || this.styleOf(content) === '4') return null
    const node = r.startContainer as Text
    if (node.parentElement?.closest('code, a')) return null
    const text = node.data.slice(0, r.startOffset)
    const m = /(^|[\s(​ ])([@#:])([^\s@#: ]*)$/.exec(text)
    if (!m) return null
    const [, , ch, query] = m
    // ":" opens after a character (an empty ":" shows nothing, composer.md §18.1)
    if (ch === ':' && query.length < 1) return null
    const start = r.startOffset - query.length - 1
    const probe = document.createRange()
    probe.setStart(node, start)
    probe.setEnd(node, start + 1)
    const rect = probe.getBoundingClientRect()
    return { kind: ch === '@' ? 'member' : ch === '#' ? 'channel' : 'emoji', query, node, start, rect: { left: rect.left, top: rect.top, bottom: rect.bottom } }
  }

  close() {
    if (!this.ac) return
    this.ac = null
    this.host.autocomplete(null)
  }

  /** Replaces the `@query` / `#query` / `:query` with the chosen member, channel or emoji. */
  choose(item: { kind: 'member'; id: string } | { kind: 'channel'; id: string } | { kind: 'emoji'; name: string }) {
    const t = this.ac
    const r = this.range()
    if (!t || !r || !t.node.isConnected) return this.close()
    const ctx = this.host.ctx()
    const del = document.createRange()
    del.setStart(t.node, t.start)
    del.setEnd(r.startContainer, r.startOffset)
    del.deleteContents()
    const html =
      item.kind === 'member' ? userMentionHtml(ctx, item.id) + ' ' : item.kind === 'channel' ? channelMentionHtml(ctx, item.id) + ' ' : esc(emojiChar(item.name) ?? `:${item.name}:`)
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    const last = tpl.content.lastChild
    del.insertNode(tpl.content)
    if (last) {
      const nr = document.createRange()
      if (last.nodeType === Node.TEXT_NODE) nr.setStart(last, (last as Text).length)
      else nr.setStartAfter(last)
      nr.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(nr)
    }
    this.close()
    this.save()
    this.checkpoint()
    this.host.changed()
  }

  hasAutocomplete() {
    return !!this.ac
  }

  // ---- clipboard, clicks ---------------------------------------------------------------------------

  paste(e: ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    if (!text) return
    let r = this.range()
    if (!r) return
    if (this.spansSections(r)) {
      this.deleteSelection(r)
      r = this.range()
      if (!r) return
    }
    const content = this.contentOf(r.startContainer)
    if (!content?.dataset.id) return
    const url = /^https?:\/\/\S+$/.test(text.trim()) ? text.trim() : null
    if (url && !this.isTitle(content)) {
      if (!r.collapsed) document.execCommand('createLink', false, url)
      else document.execCommand('insertHTML', false, linkHtml(url, url))
      this.save()
      return
    }
    const lines = text.replace(/\r/g, '').split('\n')
    if (lines.length === 1 || this.isTitle(content) || this.styleOf(content) === '4') {
      document.execCommand('insertText', false, this.isTitle(content) ? lines.join(' ') : text)
      this.save()
      return
    }
    if (!r.collapsed) r.deleteContents()
    const ctx = this.host.ctx()
    const before = document.createRange()
    before.setStart(content, 0)
    before.setEnd(r.startContainer, r.startOffset)
    const after = document.createRange()
    after.setStart(r.startContainer, r.startOffset)
    after.setEnd(content, content.childNodes.length)
    const head = cleanInline(before.cloneContents(), ctx)
    const tail = cleanInline(after.cloneContents(), ctx)
    const id = content.dataset.id
    this.apply((m) => pasteLines(m, id, this.titleId, head, tail, lines, esc))
  }

  cut(e: ClipboardEvent) {
    const r = this.range()
    if (!r || !this.spansSections(r)) return
    e.preventDefault()
    e.clipboardData?.setData('text/plain', window.getSelection()?.toString() ?? '')
    this.deleteSelection(r)
  }

  /** Taps on mentions, cards and links. Returns true when the tap was one of those (it shouldn't start editing). */
  click(e: MouseEvent): boolean {
    const target = e.target as HTMLElement
    const mention = target.closest('control[data-mention]') as HTMLElement | null
    if (mention) {
      e.preventDefault()
      const kind = mention.dataset.mention === 'channel' ? 'channel' : 'user'
      if (mention.dataset.mentionId) this.host.openMention(kind, mention.dataset.mentionId)
      return true
    }
    const card = target.closest('.card-view')
    if (card) {
      e.preventDefault()
      const section = card.closest('.section[data-embed]') as HTMLElement | null
      if (section) this.host.openEmbed(section)
      return true
    }
    if (target.closest('.checkbox-container')) return true
    const link = target.closest('a[href]') as HTMLAnchorElement | null
    if (link && this.article.contains(link)) {
      e.preventDefault()
      // While editing, a tap in a link places the caret (the toolbar's link button edits it); otherwise it opens.
      if (!this.focused()) {
        this.host.openLink(link.href)
        return true
      }
    }
    return false
  }
}

function wrap(frag: DocumentFragment): HTMLElement {
  const d = document.createElement('div')
  d.appendChild(frag)
  return d
}
