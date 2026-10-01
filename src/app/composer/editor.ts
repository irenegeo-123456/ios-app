import type { Fixture } from '../../data/types'
import { emojiSrc, findEmoji } from '../../emoji/Emoji'
import { parseMrkdwn, type Inline, type TextStyle } from '../../lib/mrkdwn'

// The composer's text view as a contenteditable (iOS: SKTextInput with the Wysiwyg text processor, spec composer.md §4,
// §8). The browser edits the DOM (the simulated keyboard types with execCommand('insertText')); this module keeps it in
// Slack's shape and converts it to and from mrkdwn:
//
//   <div class="cmp-l" data-k="p|ul|ol|q|pre" data-i="0…">   one line; lists, quotes and code blocks are line styles
//     text, <b> <i> <u> <s> <code class="cmp-code">          inline styles (execCommand's tags, plus our code)
//     <a class="cmp-link" href>                              a link (the link editor)
//     <span class="cmp-atom cmp-mention" data-kind data-id>  a mention "slug": @person, #channel, @here, @group
//     <img class="cmp-atom cmp-emoji" data-emoji>            an emoji glyph
//
// U+200B is the style-latching spacer iOS uses too (WysiwygAutocompleteOpportunity.swift: "\u200B"): typing after a
// converted `*bold*` goes into a plain spacer, not into the bold run. It's dropped when the text is read.

export type LineKind = 'p' | 'ul' | 'ol' | 'q' | 'pre'
export type Mark = 'b' | 'i' | 'u' | 's' | 'code'
export type AtomKind = 'user' | 'channel' | 'broadcast' | 'group'

export const ZWSP = '\u200B'
/** stands in for an atom (mention, emoji) in text read from the DOM */
export const ATOM = '\uFFFC'
const LINE = 'cmp-l'

// ------------------------------------------------------------------------------------------------ lines

export function makeLine(kind: LineKind = 'p', indent = 0): HTMLDivElement {
  const d = document.createElement('div')
  d.className = LINE
  d.dataset.k = kind
  if (indent) d.dataset.i = String(indent)
  d.appendChild(document.createElement('br'))
  return d
}

export const linesOf = (root: HTMLElement) => [...root.children].filter((c): c is HTMLElement => c instanceof HTMLElement && c.classList.contains(LINE))

export function lineOf(node: Node | null, root: HTMLElement): HTMLElement | null {
  let n: Node | null = node
  while (n && n.parentNode !== root) n = n.parentNode
  return n instanceof HTMLElement && n.classList.contains(LINE) ? n : null
}

export const kindOf = (line: HTMLElement): LineKind => (line.dataset.k as LineKind) || 'p'
export const indentOf = (line: HTMLElement) => Number(line.dataset.i ?? 0)

export function setKind(line: HTMLElement, kind: LineKind, indent = 0) {
  line.dataset.k = kind
  if (indent > 0 && (kind === 'ul' || kind === 'ol')) line.dataset.i = String(indent)
  else delete line.dataset.i
}

export const isAtom = (n: Node | null): boolean => n instanceof HTMLElement && n.classList.contains('cmp-atom')

/**
 * Keeps the editor in shape after the browser edits it: every top-level node sits in a line div, the editor has at
 * least one line, and empty lines hold a <br> (so they have height and a caret). The caret is kept.
 */
export function normalize(root: HTMLElement) {
  const sel = document.getSelection()
  const saved = sel && sel.rangeCount && sel.anchorNode && root.contains(sel.anchorNode) ? ([sel.anchorNode, sel.anchorOffset, sel.focusNode!, sel.focusOffset] as const) : null
  let moved = false
  let run: Node[] = []
  const flush = (before: Node | null) => {
    if (!run.length) return
    const line = document.createElement('div')
    line.className = LINE
    line.dataset.k = 'p'
    root.insertBefore(line, before)
    for (const n of run) line.appendChild(n)
    run = []
    moved = true
  }
  for (const n of [...root.childNodes]) {
    if (n instanceof HTMLElement && (n.tagName === 'DIV' || n.tagName === 'P')) {
      flush(n)
      if (!n.classList.contains(LINE)) {
        n.className = LINE
        n.dataset.k ||= 'p'
      }
      continue
    }
    run.push(n)
  }
  flush(null)
  let empty: HTMLElement | null = null
  if (!root.firstChild) {
    empty = makeLine()
    root.appendChild(empty)
  }
  for (const line of linesOf(root)) {
    // a line the browser nested inside another (rare, after odd deletions): lift it out
    for (const inner of [...line.children]) if (inner.tagName === 'DIV') line.after(inner)
    if (!line.firstChild) line.appendChild(document.createElement('br'))
  }
  renumber(root)
  if (empty) placeCaret(empty, 0)
  else if (moved && saved && sel) {
    try {
      sel.setBaseAndExtent(saved[0], saved[1], saved[2], saved[3])
    } catch {
      // the saved position no longer exists
    }
  }
}

const alpha = (n: number): string => (n <= 0 ? '' : alpha(Math.floor((n - 1) / 26)) + String.fromCharCode(97 + ((n - 1) % 26)))
const roman = (n: number): string => {
  const R: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
  let out = ''
  for (const [v, s] of R) while (n >= v) {
    out += s
    n -= v
  }
  return out
}

/**
 * Numbers the numbered list items: "1." "a." "i." for levels 0/1/2, then again (OrderedListPrefixGenerator.swift:11-25).
 * A bulleted item ends the numbering at its level and deeper, anything else ends every list (toMrkdwn counts the same
 * way). Drawn from data-n; CSS counters can't restart after a sibling's reset in Chrome.
 */
export function renumber(root: HTMLElement) {
  const ordinal: number[] = []
  for (const line of linesOf(root)) {
    const kind = kindOf(line)
    const indent = indentOf(line)
    if (kind === 'ol') {
      ordinal.length = indent + 1
      const n = (ordinal[indent] = (ordinal[indent] ?? 0) + 1)
      const label = `${indent % 3 === 0 ? n : indent % 3 === 1 ? alpha(n) : roman(n)}.`
      if (line.dataset.n !== label) line.dataset.n = label
      continue
    }
    ordinal.length = kind === 'ul' ? Math.min(ordinal.length, indent) : 0
    if (line.dataset.n) delete line.dataset.n
  }
}

// ------------------------------------------------------------------------------------------------ atoms

/** A mention "slug" (spec §8): mention text on the highlight_1 fill; yours and broadcasts on highlight_3. */
export function mentionEl(kind: AtomKind, id: string, label: string, self = false): HTMLSpanElement {
  const s = document.createElement('span')
  s.className = `cmp-atom cmp-mention${self || kind === 'broadcast' ? ' cmp-mention--self' : ''}`
  s.contentEditable = 'false'
  s.dataset.kind = kind
  s.dataset.id = id
  s.textContent = label
  return s
}

export function emojiEl(name: string): HTMLImageElement | null {
  const e = findEmoji(name)
  if (!e) return null
  const img = document.createElement('img')
  img.className = 'cmp-atom cmp-emoji'
  img.dataset.emoji = name
  img.alt = `:${name}:`
  img.src = emojiSrc(e.u)
  img.draggable = false
  return img
}

const atomMrkdwn = (el: HTMLElement) => {
  if (el.tagName === 'IMG') return `:${el.dataset.emoji}:`
  const id = el.dataset.id ?? ''
  switch (el.dataset.kind as AtomKind) {
    case 'user':
      return `<@${id}>`
    case 'channel':
      return `<#${id}>`
    case 'broadcast':
      return `<!${id}>`
    case 'group':
      return `<!subteam^${id}|${el.textContent ?? ''}>`
    default:
      return el.textContent ?? ''
  }
}

// ------------------------------------------------------------------------------------------------ selection

export function selectionRange(root: HTMLElement): Range | null {
  const sel = document.getSelection()
  if (!sel || !sel.rangeCount) return null
  const r = sel.getRangeAt(0)
  return root.contains(r.commonAncestorContainer) ? r : null
}

export function placeCaret(node: Node, offset: number) {
  const sel = document.getSelection()
  if (!sel) return
  const r = document.createRange()
  r.setStart(node, offset)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
}

export function placeCaretAfter(node: Node) {
  const sel = document.getSelection()
  if (!sel) return
  const r = document.createRange()
  r.setStartAfter(node)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
}

/** Puts the caret at the end of the editor. */
export function caretToEnd(root: HTMLElement) {
  const last = linesOf(root).at(-1)
  if (!last) return
  const br = last.lastChild
  if (br instanceof HTMLBRElement) placeCaret(last, [...last.childNodes].indexOf(br))
  else placeCaret(last, last.childNodes.length)
}

/** Scrolls the text view so the caret's line shows, with the 4 pt top and 12 pt bottom insets (UITextView does this). */
export function keepCaretVisible(root: HTMLElement) {
  if (root.scrollHeight <= root.clientHeight) return
  const r = selectionRange(root)
  if (!r) return
  const rects = r.getClientRects()
  const rect = rects.length ? rects[rects.length - 1] : (lineOf(r.startContainer, root) ?? (r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement))?.getBoundingClientRect()
  if (!rect) return
  const box = root.getBoundingClientRect()
  const scale = box.width / root.offsetWidth || 1
  const top = (rect.top - box.top) / scale
  const bottom = (rect.bottom - box.top) / scale
  if (bottom + 12 > root.clientHeight) root.scrollTop += bottom + 12 - root.clientHeight
  else if (top < 4) root.scrollTop += top - 4
}

/** The element of the given tag the caret (or node) sits in, inside the editor. */
export function closestIn(node: Node | null, root: HTMLElement, selector: string): HTMLElement | null {
  const el = node instanceof Element ? node : node?.parentElement
  const hit = el?.closest(selector) as HTMLElement | null
  return hit && root.contains(hit) && hit !== root ? hit : null
}

interface Seg {
  node: Text
  start: number
}

/**
 * The text of a line up to the caret (atoms as U+FFFC), and where each text node starts in it, so string offsets can
 * be turned back into DOM positions.
 */
export function textToCaret(line: HTMLElement, caretNode: Node, caretOffset: number): { text: string; segs: Seg[] } {
  let text = ''
  const segs: Seg[] = []
  let done = false
  const visit = (n: Node) => {
    if (done) return
    if (n === caretNode && n.nodeType !== Node.TEXT_NODE) {
      const kids = [...n.childNodes]
      for (let i = 0; i < caretOffset && i < kids.length; i++) visit(kids[i])
      done = true
      return
    }
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text
      segs.push({ node: t, start: text.length })
      if (t === caretNode) {
        text += t.data.slice(0, caretOffset)
        done = true
      } else text += t.data
      return
    }
    if (isAtom(n)) {
      text += ATOM
      return
    }
    for (const c of [...n.childNodes]) {
      visit(c)
      if (done) return
    }
  }
  visit(line)
  return { text, segs }
}

/** A DOM position for a string offset from textToCaret. */
export function posAt(segs: Seg[], index: number): { node: Text; offset: number } | null {
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i]
    if (s.start <= index) return { node: s.node, offset: Math.min(index - s.start, s.node.length) }
  }
  return null
}

// ------------------------------------------------------------------------------------------------ reading

/** True when there's nothing to send: no text but spaces and no atoms. */
export function isBlank(root: HTMLElement) {
  return !(root.textContent ?? '').replace(/[\s\u200B]/g, '') && !root.querySelector('.cmp-atom')
}

/** True when the placeholder should show: an empty single plain line. */
export function isEmpty(root: HTMLElement) {
  const lines = linesOf(root)
  if (lines.length > 1) return false
  if (lines[0] && kindOf(lines[0]) !== 'p') return false
  return !(root.textContent ?? '').replace(/\u200B/g, '') && !root.querySelector('.cmp-atom')
}

/** The first line with content, as HTML, for the collapsed composer's one-line draft preview (spec §3). */
export function previewHtml(root: HTMLElement): string {
  const line = linesOf(root).find((l) => (l.textContent ?? '').replace(/[\s\u200B]/g, '') || l.querySelector('.cmp-atom'))
  if (!line) return ''
  const clone = line.cloneNode(true) as HTMLElement
  clone.querySelectorAll('br').forEach((b) => b.remove())
  return clone.innerHTML
}

const MARK_ORDER: Mark[] = ['b', 'i', 's', 'code']
const DELIM: Record<Mark, string> = { b: '*', i: '_', s: '~', code: '`', u: '' }

function markOf(el: HTMLElement): Mark | null {
  switch (el.tagName) {
    case 'B':
    case 'STRONG':
      return 'b'
    case 'I':
    case 'EM':
      return 'i'
    case 'U':
      return 'u'
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return 's'
    case 'CODE':
      return 'code'
  }
  // execCommand with styleWithCSS writes spans
  const st = el.style
  if (st.fontWeight === 'bold' || Number(st.fontWeight) >= 600) return 'b'
  if (st.fontStyle === 'italic') return 'i'
  if (st.textDecorationLine?.includes('line-through') || st.textDecoration?.includes('line-through')) return 's'
  return null
}

type Run = { raw: boolean; v: string; marks: Mark[] }

function lineRuns(line: HTMLElement): Run[] {
  const out: Run[] = []
  const walk = (n: Node, marks: Mark[]) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const v = (n as Text).data.replace(/\u200B/g, '')
      if (v) out.push({ raw: false, v, marks })
      return
    }
    if (!(n instanceof HTMLElement)) return
    if (n.tagName === 'BR') {
      if (n.nextSibling) out.push({ raw: true, v: '\n', marks: [] })
      return
    }
    if (isAtom(n)) {
      out.push({ raw: true, v: atomMrkdwn(n), marks })
      return
    }
    if (n.tagName === 'A') {
      const url = n.getAttribute('href') ?? ''
      const label = (n.textContent ?? '').replace(/\u200B/g, '')
      out.push({ raw: true, v: label && label !== url ? `<${url}|${label.replace(/[<>|]/g, '')}>` : `<${url}>`, marks })
      return
    }
    const m = markOf(n)
    const next = m && m !== 'u' && !marks.includes(m) ? [...marks, m].sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b)) : marks
    for (const c of [...n.childNodes]) walk(c, next)
  }
  for (const c of [...line.childNodes]) walk(c, [])
  return out
}

const sameMarks = (a: Mark[], b: Mark[]) => a.length === b.length && a.every((m, i) => m === b[i])
/** Characters that would turn into formatting (or a control sequence) if sent as typed: the kit's backslash escapes. */
const escapePlain = (s: string) => s.replace(/[*_~`<]/g, (c) => `\\${c}`)

/** One line's inline content as mrkdwn: styles become delimiters, kept outside the run's leading/trailing spaces. */
function inlineMrkdwn(runs: Run[]): string {
  // merge runs with the same styles, then move edge whitespace out of styled runs
  const merged: Run[] = []
  for (const r of runs) {
    const prev = merged.at(-1)
    if (prev && !prev.raw && !r.raw && sameMarks(prev.marks, r.marks)) prev.v += r.v
    else merged.push({ ...r })
  }
  const parts: Run[] = []
  for (const r of merged) {
    if (r.raw || !r.marks.length || r.marks.includes('code')) {
      parts.push(r)
      continue
    }
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.v)!
    if (m[1]) parts.push({ raw: false, v: m[1], marks: [] })
    if (m[2]) parts.push({ raw: false, v: m[2], marks: r.marks })
    if (m[3]) parts.push({ raw: false, v: m[3], marks: [] })
  }
  let out = ''
  let open: Mark[] = []
  for (const p of parts) {
    const want = p.marks
    let k = 0
    while (k < open.length && k < want.length && open[k] === want[k]) k++
    for (let j = open.length - 1; j >= k; j--) out += DELIM[open[j]]
    for (let j = k; j < want.length; j++) out += DELIM[want[j]]
    open = [...want]
    out += p.raw || want.includes('code') ? p.v : escapePlain(p.v)
  }
  for (let j = open.length - 1; j >= 0; j--) out += DELIM[open[j]]
  return out
}

/**
 * The editor's content as Slack mrkdwn, the way the message is stored: *bold* _italic_ ~strike~ `code`, <url|label>,
 * <@U…> <#C…> <!here>, :emoji:, "• " and "1. " list lines, "> " quotes, ``` code blocks. Underline has no mrkdwn
 * form and is sent as plain text.
 */
export function toMrkdwn(root: HTMLElement): string {
  const lines = linesOf(root)
  const out: string[] = []
  const ordinal: number[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const kind = kindOf(line)
    if (kind === 'pre') {
      const block: string[] = []
      while (i < lines.length && kindOf(lines[i]) === 'pre') {
        block.push((lines[i].textContent ?? '').replace(/\u200B/g, ''))
        i++
      }
      i--
      out.push('```' + block.join('\n') + '```')
      ordinal.length = 0
      continue
    }
    const text = inlineMrkdwn(lineRuns(line))
    const indent = indentOf(line)
    if (kind === 'ol') {
      ordinal.length = indent + 1
      ordinal[indent] = (ordinal[indent] ?? 0) + 1
      out.push(`${'    '.repeat(indent)}${ordinal[indent]}. ${text}`)
      continue
    }
    // a bulleted item ends the numbering at its level and deeper; anything else ends every list
    ordinal.length = kind === 'ul' ? Math.min(ordinal.length, indent) : 0
    if (kind === 'ul') out.push(`${'    '.repeat(indent)}• ${text}`)
    else if (kind === 'q') out.push(`> ${text}`)
    else out.push(text)
  }
  return out.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '')
}

// ------------------------------------------------------------------------------------------------ loading

function styledText(v: string, style?: TextStyle): Node {
  let n: Node = document.createTextNode(v)
  const wrap = (tag: string, cls?: string) => {
    const el = document.createElement(tag)
    if (cls) el.className = cls
    el.appendChild(n)
    n = el
  }
  if (style?.code) wrap('code', 'cmp-code')
  if (style?.strike) wrap('s')
  if (style?.italic) wrap('i')
  if (style?.bold) wrap('b')
  return n
}

function inlineNodes(els: Inline[], fx: Fixture): Node[] {
  const nodes: Node[] = []
  for (const el of els) {
    switch (el.t) {
      case 'text':
        nodes.push(styledText(el.v, el.style))
        break
      case 'tab':
        nodes.push(document.createTextNode('\t'))
        break
      case 'emoji':
        nodes.push(emojiEl(el.name) ?? document.createTextNode(`:${el.name}:`))
        break
      case 'user': {
        const u = fx.users[el.id]
        nodes.push(mentionEl('user', el.id, `@${u?.name ?? el.label ?? el.id}`, el.id === fx.me))
        break
      }
      case 'channel':
        nodes.push(mentionEl('channel', el.id, `#${fx.conversations[el.id]?.name ?? el.name ?? el.id}`))
        break
      case 'broadcast':
        nodes.push(mentionEl('broadcast', el.range, `@${el.range}`))
        break
      case 'usergroup':
        nodes.push(mentionEl('group', el.id, el.label ?? '@group'))
        break
      case 'link': {
        const a = document.createElement('a')
        a.className = 'cmp-link'
        a.href = el.url
        a.appendChild(styledText(el.label ?? el.url.replace(/^mailto:/, ''), el.style))
        nodes.push(a)
        break
      }
      case 'date':
        nodes.push(document.createTextNode(el.fallback ?? ''))
        break
      case 'color':
        nodes.push(document.createTextNode(el.value))
        break
    }
  }
  return nodes
}

/** Splits inline runs at line breaks; a paragraph break (a blank line) adds an empty line. */
function splitLines(els: Inline[]): Inline[][] {
  const lines: Inline[][] = [[]]
  for (const el of els) {
    if (el.t === 'br') lines.push([])
    else if (el.t === 'pbr') lines.push([], [])
    else lines[lines.length - 1].push(el)
  }
  return lines
}

function lineWith(kind: LineKind, els: Inline[], fx: Fixture): HTMLDivElement {
  const line = makeLine(kind)
  const nodes = inlineNodes(els, fx)
  if (nodes.length) {
    line.textContent = ''
    nodes.forEach((n) => line.appendChild(n))
  }
  return line
}

/** Loads mrkdwn into the editor (editing a sent message, spec §11). */
export function loadMrkdwn(root: HTMLElement, text: string, fx: Fixture) {
  root.textContent = ''
  for (const b of parseMrkdwn(text)) {
    if (b.t === 'section') splitLines(b.els).forEach((els) => root.appendChild(lineWith('p', els, fx)))
    else if (b.t === 'quote') splitLines(b.els).forEach((els) => root.appendChild(lineWith('q', els, fx)))
    else if (b.t === 'list') b.items.forEach((els) => root.appendChild(lineWith(b.ordered ? 'ol' : 'ul', els, fx)))
    else
      b.text.split('\n').forEach((t) => {
        const line = makeLine('pre')
        if (t) line.textContent = t
        root.appendChild(line)
      })
  }
  if (!root.firstChild) root.appendChild(makeLine())
}

export function clearEditor(root: HTMLElement) {
  root.textContent = ''
  const line = makeLine()
  root.appendChild(line)
  if (document.activeElement === root) placeCaret(line, 0)
}

// ------------------------------------------------------------------------------------------------ live mrkdwn

const INLINE_DELIMS: Record<string, Mark> = { '*': 'b', '＊': 'b', _: 'i', '＿': 'i', '~': 's', '`': 'code', '｀': 'code' }
const rxEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function wrapTag(mark: Mark): HTMLElement {
  const tag = { b: 'b', i: 'i', u: 'u', s: 's', code: 'code' }[mark]
  const el = document.createElement(tag)
  if (mark === 'code') el.className = 'cmp-code'
  return el
}

/** Puts a style-latching spacer after an element and the caret after it, so typing continues unstyled. */
function latchAfter(el: Node) {
  const spacer = document.createTextNode(ZWSP)
  el.parentNode!.insertBefore(spacer, el.nextSibling)
  placeCaret(spacer, 1)
}

/**
 * Converts typed mrkdwn as you type (spec §8 "Markdown shortcuts"; WysiwygMrkdwnDelimiter.swift,
 * WysiwygLineStyleIntent.swift): a closing `*` `_` `~` or backtick styles the phrase it closes; "1." "*" "-" ">" plus a
 * space at the start of a line make it a list or quote; a third backtick after "``" makes a code block; a closing ":"
 * after a known :emoji_name: puts in the emoji. Returns true if it changed anything.
 */
export function applyShortcuts(root: HTMLElement, typed: string): boolean {
  const range = selectionRange(root)
  if (!range || !range.collapsed) return false
  const line = lineOf(range.startContainer, root)
  if (!line) return false
  const kind = kindOf(line)
  if (kind === 'pre' || closestIn(range.startContainer, root, 'code')) return false
  const { text, segs } = textToCaret(line, range.startContainer, range.startOffset)

  // line styles: the whole line before the caret is the token
  const lead = text.replace(/\u200B/g, '')
  if (kind === 'p' && typed === ' ' && /^(1\.|\*|-|>) $/.test(lead)) {
    const token = lead.trim()
    removeLeading(line, text.length)
    setKind(line, token === '1.' ? 'ol' : token === '>' ? 'q' : 'ul')
    return true
  }
  if ((kind === 'p' || kind === 'q') && typed === '`' && lead === '```') {
    removeLeading(line, text.length)
    setKind(line, 'pre')
    return true
  }

  // emoji: ":name:" with a known name becomes the glyph (ComposerInputInteractor.swift:399-415)
  if (typed === ':') {
    const m = /(?:^|[\s\u200B])(:([a-z0-9_+'-]+):)$/i.exec(text)
    if (m && findEmoji(m[2])) {
      const start = posAt(segs, text.length - m[1].length)
      const end = posAt(segs, text.length)
      const img = emojiEl(m[2])
      if (start && end && img) {
        const r = document.createRange()
        r.setStart(start.node, start.offset)
        r.setEnd(end.node, end.offset)
        r.deleteContents()
        r.insertNode(img)
        placeCaretAfter(img)
        return true
      }
    }
  }

  // inline styles: the closing delimiter was just typed
  const mark = INLINE_DELIMS[typed]
  if (!mark) return false
  const d = rxEscape(typed)
  const rx = new RegExp(`(?:^|\\u200B|\\s|\\p{P})(${d})([^${d}\\s]|[^${d}\\s][^${d}\\n]*[^${d}\\s])${d}$`, 'u')
  const m = rx.exec(text)
  if (!m) return false
  const openAt = text.length - m[2].length - 2
  const o = posAt(segs, openAt)
  const oEnd = posAt(segs, openAt + 1)
  const c = posAt(segs, text.length - 1)
  const cEnd = posAt(segs, text.length)
  if (!o || !oEnd || !c || !cEnd) return false
  const content = document.createRange()
  content.setStart(oEnd.node, oEnd.offset)
  content.setEnd(c.node, c.offset)
  const closeR = document.createRange()
  closeR.setStart(c.node, c.offset)
  closeR.setEnd(cEnd.node, cEnd.offset)
  const openR = document.createRange()
  openR.setStart(o.node, o.offset)
  openR.setEnd(oEnd.node, oEnd.offset)
  closeR.deleteContents()
  openR.deleteContents()
  const el = wrapTag(mark)
  el.appendChild(content.extractContents())
  content.insertNode(el)
  latchAfter(el)
  return true
}

/** Deletes the first `count` characters of a line (a typed line-style token). */
function removeLeading(line: HTMLElement, count: number) {
  const { segs } = textToCaret(line, line, line.childNodes.length)
  const end = posAt(segs, count)
  if (!end) return
  const r = document.createRange()
  r.setStart(line, 0)
  r.setEnd(end.node, end.offset)
  r.deleteContents()
  if (!line.firstChild || (line.childNodes.length === 1 && line.firstChild.nodeType === Node.TEXT_NODE && !(line.firstChild as Text).data)) {
    line.textContent = ''
    line.appendChild(document.createElement('br'))
  }
  placeCaret(line, 0)
}

// ------------------------------------------------------------------------------------------------ formatting

export interface Formats {
  b: boolean
  i: boolean
  u: boolean
  s: boolean
  code: boolean
  link: boolean
  /** a link can be added (text is selected) or edited (the caret is in one) */
  linkable: boolean
  kind: LineKind
  indent: number
}

export const NO_FORMATS: Formats = { b: false, i: false, u: false, s: false, code: false, link: false, linkable: false, kind: 'p', indent: 0 }

const qs = (cmd: string) => {
  try {
    return document.queryCommandState(cmd)
  } catch {
    return false
  }
}

/** The styles in effect for typing (a caret) or for the whole selection (spec §7 "Active state"). */
export function activeFormats(root: HTMLElement): Formats {
  const range = selectionRange(root)
  if (!range) return NO_FORMATS
  const line = lineOf(range.startContainer, root) ?? linesOf(root)[0]
  const kind = line ? kindOf(line) : 'p'
  const link = !!closestIn(range.startContainer, root, 'a')
  return {
    b: qs('bold'),
    i: qs('italic'),
    u: qs('underline'),
    s: qs('strikeThrough'),
    code: !!closestIn(range.startContainer, root, 'code') && (range.collapsed || !!closestIn(range.endContainer, root, 'code')),
    link,
    linkable: link || (!range.collapsed && !!range.toString().trim()),
    kind,
    indent: line ? indentOf(line) : 0,
  }
}

const EXEC: Partial<Record<Mark, string>> = { b: 'bold', i: 'italic', u: 'underline', s: 'strikeThrough' }

/** Toggles an inline style on the selection, or for what's typed next at a caret (ComposerWysiwygPlugin.swift:33-63). */
export function toggleMark(root: HTMLElement, mark: Mark, on: boolean) {
  const range = selectionRange(root)
  if (!range) return
  const cmd = EXEC[mark]
  if (cmd) {
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(cmd)
    return
  }
  // inline code: our own element
  const code = closestIn(range.startContainer, root, 'code')
  if (on && code) {
    if (range.collapsed) latchAfter(code)
    else unwrap(code)
    return
  }
  if (range.collapsed) {
    const el = wrapTag('code')
    el.appendChild(document.createTextNode(ZWSP))
    range.insertNode(el)
    placeCaret(el.firstChild!, 1)
    return
  }
  // a run of code never crosses lines: wrap the selected part of each line
  const lines = selectedLines(root)
  const wrapped: HTMLElement[] = []
  for (const l of lines) {
    const r = document.createRange()
    r.selectNodeContents(l)
    if (l === lines[0]) r.setStart(range.startContainer, range.startOffset)
    if (l === lines[lines.length - 1]) r.setEnd(range.endContainer, range.endOffset)
    if (r.collapsed || !r.toString().replace(/\u200B/g, '')) continue
    const el = wrapTag('code')
    el.appendChild(r.extractContents())
    el.querySelectorAll('code').forEach(unwrap)
    el.querySelectorAll('br').forEach((b) => b.remove())
    r.insertNode(el)
    wrapped.push(el)
  }
  if (!wrapped.length) return
  const sel = document.getSelection()!
  const r = document.createRange()
  r.setStartBefore(wrapped[0])
  r.setEndAfter(wrapped[wrapped.length - 1])
  sel.removeAllRanges()
  sel.addRange(r)
}

function unwrap(el: Element) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  el.remove()
}

/** The lines the selection touches. */
export function selectedLines(root: HTMLElement): HTMLElement[] {
  const range = selectionRange(root)
  const lines = linesOf(root)
  if (!range) return []
  const a = lineOf(range.startContainer, root) ?? lines[0]
  const b = lineOf(range.endContainer, root) ?? a
  const i = lines.indexOf(a)
  const j = lines.indexOf(b)
  return lines.slice(Math.min(i, j), Math.max(i, j) + 1)
}

/** Toggles a line style (list, quote, code block) on the selected lines. */
export function toggleLineKind(root: HTMLElement, kind: LineKind) {
  const lines = selectedLines(root)
  if (!lines.length) return
  const all = lines.every((l) => kindOf(l) === kind)
  const sel = document.getSelection()
  const saved = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null
  for (const l of lines) {
    setKind(l, all ? 'p' : kind, all ? 0 : indentOf(l))
    // a code block holds plain text
    if (!all && kind === 'pre') {
      l.querySelectorAll('b,i,u,s,strike,code,a').forEach(unwrap)
    }
  }
  if (saved && sel) {
    sel.removeAllRanges()
    sel.addRange(saved)
  }
}

/** Indent / de-dent the selected list items one level (spec §7 rows 9–10). */
export function shiftIndent(root: HTMLElement, by: 1 | -1) {
  for (const l of selectedLines(root)) {
    const k = kindOf(l)
    if (k !== 'ul' && k !== 'ol') continue
    setKind(l, k, Math.max(0, Math.min(5, indentOf(l) + by)))
  }
}

/** Replaces the selection with a link, or updates the link the caret is in. */
export function setLink(root: HTMLElement, range: Range, label: string, url: string) {
  const existing = closestIn(range.startContainer, root, 'a')
  if (existing) {
    existing.setAttribute('href', url)
    existing.textContent = label
    latchAfter(existing)
    return
  }
  range.deleteContents()
  const a = document.createElement('a')
  a.className = 'cmp-link'
  a.href = url
  a.textContent = label
  range.insertNode(a)
  latchAfter(a)
}

export function removeLink(root: HTMLElement, range: Range) {
  const a = closestIn(range.startContainer, root, 'a')
  if (a) unwrap(a)
}

// ------------------------------------------------------------------------------------------------ keys

/**
 * Return inside the text view (a new line; spec §4): a list or quote line that's empty ends the list or quote, a
 * code block continues, everything else splits the line and the new line keeps the line style.
 */
export function insertNewline(root: HTMLElement) {
  const range = selectionRange(root)
  if (!range) return
  const line = lineOf(range.startContainer, root)
  if (line && kindOf(line) !== 'p' && !(line.textContent ?? '').replace(/\u200B/g, '') && !line.querySelector('.cmp-atom')) {
    setKind(line, 'p')
    return
  }
  const kind = line ? kindOf(line) : 'p'
  const indent = line ? indentOf(line) : 0
  document.execCommand('insertParagraph')
  normalize(root)
  const now = selectionRange(root)
  const next = now && lineOf(now.startContainer, root)
  if (next && next !== line) {
    setKind(next, kind, indent)
    // a new line starts unstyled inline: drop empty style wrappers the browser carried over
    if (!(next.textContent ?? '').replace(/\u200B/g, '')) {
      next.textContent = ''
      next.appendChild(document.createElement('br'))
      placeCaret(next, 0)
    }
  }
}

/**
 * Backspace at the start of a styled line takes the line style off instead of joining the lines. Returns true when it
 * handled the key.
 */
export function backspaceAtLineStart(root: HTMLElement): boolean {
  const range = selectionRange(root)
  if (!range || !range.collapsed) return false
  const line = lineOf(range.startContainer, root)
  if (!line || kindOf(line) === 'p') return false
  const { text } = textToCaret(line, range.startContainer, range.startOffset)
  if (text.replace(/\u200B/g, '')) return false
  const k = kindOf(line)
  if ((k === 'ul' || k === 'ol') && indentOf(line) > 0) setKind(line, k, indentOf(line) - 1)
  else setKind(line, 'p')
  return true
}

/** Inserts plain text (a paste), line by line. */
export function insertPlainText(root: HTMLElement, text: string) {
  const parts = text.replace(/\r\n?/g, '\n').split('\n')
  parts.forEach((p, i) => {
    if (i > 0) insertNewline(root)
    if (p) document.execCommand('insertText', false, p)
  })
}
