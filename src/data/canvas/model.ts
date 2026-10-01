import type { CanvasBlock, CanvasDoc, CanvasListItem, Fixture, User } from '../types'
import { parseInline, type Inline } from '../../lib/mrkdwn'
import { findEmoji } from '../../emoji/Emoji'

// The canvas document model and its Quip markup (live capture: reference/dom/canvas-view.html).
// The editor keeps the DOM as the source of truth while you type; structural edits serialize the
// article back into blocks (`parseArticle`) and re-render it (`renderArticle`), which also normalizes it.

export type TextType = 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'code'
export type ListType = 'bullet' | 'ordered' | 'checklist'

/** Quip `data-section-style` per block type (title is 48/64). */
export const SECTION_STYLE: Record<TextType | ListType | 'hr' | 'embed', string> = {
  p: '0',
  h1: '1',
  h2: '2',
  h3: '3',
  code: '4',
  quote: '16',
  bullet: '5',
  ordered: '6',
  checklist: '7',
  hr: '18',
  embed: '44',
}
const STYLE_TEXT: Record<string, TextType> = { '0': 'p', '1': 'h1', '2': 'h2', '3': 'h3', '4': 'code', '16': 'quote', '47': 'p' }
const STYLE_LIST: Record<string, ListType> = { '5': 'bullet', '6': 'ordered', '7': 'checklist' }

export const isTextType = (t: string): t is TextType => t === 'p' || t === 'h1' || t === 'h2' || t === 'h3' || t === 'quote' || t === 'code'
export const isListType = (t: string): t is ListType => t === 'bullet' || t === 'ordered' || t === 'checklist'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
/** An 11-character Quip-style section id ("BYX9CAlyDsA"). */
export function newId(): string {
  let s = ''
  for (let i = 0; i < 11; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The emoji character for a short name (canvases store emoji as text, like Quip). */
export function emojiChar(name: string): string | null {
  const e = findEmoji(name)
  if (!e) return null
  return String.fromCodePoint(...e.u.split('-').map((h) => parseInt(h, 16)))
}

// ---- inline markup ---------------------------------------------------------------------------

export interface InlineCtx {
  users: Record<string, User>
  conversations: Fixture['conversations']
  me: string
  domain: string
}

/** `<control class="c50">`: a Slack member mention inside a canvas. */
export function userMentionHtml(ctx: InlineCtx, userId: string): string {
  const u = ctx.users[userId]
  const self = userId === ctx.me
  return (
    `<control class="c50" contenteditable="false" data-mention="user" data-mention-id="${esc(userId)}">` +
    `<a class="content mention slack-mention${self ? ' slack-self' : ''}" href="https://${esc(ctx.domain)}.slack.com/team/${esc(userId)}" data-member-id="${esc(userId)}" tabindex="-1" spellcheck="false">@${esc(u?.name ?? 'unknown')}</a></control>`
  )
}

const LOCK_SVG =
  '<svg viewBox="0 0 20 20" width="0.75em" height="0.75em" aria-hidden="true" style="vertical-align:-0.05em"><path fill="currentColor" fill-rule="evenodd" d="M6 6.5V8H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6.5a4 4 0 0 0-8 0ZM12.5 8V6.5a2.5 2.5 0 0 0-5 0V8h5Z" clip-rule="evenodd"/></svg>'

/** `<control class="c49">`: a channel mention (private channels get the lock icon). */
export function channelMentionHtml(ctx: InlineCtx, channelId: string, fallbackName?: string): string {
  const c = ctx.conversations[channelId]
  const name = c?.name ?? fallbackName ?? 'unknown-channel'
  const priv = c?.type === 'private'
  return (
    `<control class="c49" contenteditable="false" data-mention="channel" data-mention-id="${esc(channelId)}">` +
    `<a class="content mention slack-mention${priv ? ' has-lock-icon' : ''}" href="https://${esc(ctx.domain)}.slack.com/archives/${esc(channelId)}" tabindex="-1" spellcheck="false">` +
    (priv ? `<span class="slack-icon-font lock">${LOCK_SVG}</span>${esc(name)}` : `#${esc(name)}`) +
    `</a></control>`
  )
}

export const linkHtml = (url: string, label: string) => `<a href="${esc(url)}" target="_blank" rel="nofollow noreferrer popup=0" spellcheck="false">${esc(label)}</a>`

function inlineNode(el: Inline, ctx: InlineCtx): string {
  switch (el.t) {
    case 'text': {
      let h = esc(el.v)
      const st = el.style ?? {}
      if (st.code) h = `<code>${h}</code>`
      if (st.strike) h = `<del>${h}</del>`
      if (st.italic) h = `<i>${h}</i>`
      if (st.bold) h = `<b>${h}</b>`
      return h
    }
    case 'br':
      return '<br>'
    case 'emoji':
      return esc(emojiChar(el.name) ?? `:${el.name}:`)
    case 'user':
      return userMentionHtml(ctx, el.id)
    case 'channel':
      return channelMentionHtml(ctx, el.id, el.name)
    case 'link':
      return linkHtml(el.url, el.label ?? el.url)
    case 'broadcast':
      return esc(`@${el.range}`)
    case 'usergroup':
      return esc(el.label ?? '@group')
    case 'date':
      return esc(el.fallback ?? '')
    case 'color':
      return esc(el.value)
    default:
      return ''
  }
}

/** Slack mrkdwn (one line) → canvas inline HTML. Used to author demo canvases readably. */
export const mrkdwnToHtml = (src: string, ctx: InlineCtx) =>
  parseInline(src)
    .map((el) => inlineNode(el, ctx))
    .join('')

// ---- rendering ---------------------------------------------------------------------------------

const EVENTS = 'data-click="section" data-clicktrack="0" data-mousedown="section" data-mouseover="section" data-mouseout="section" data-paste="section" data-copy="section" data-cut="section"'
const ENTRY = '<editor-ui class="a11y-section-menu-entrypoint a11y-sr-only" contenteditable="false" tabindex="0" aria-hidden="true"></editor-ui>'
const PARTICLES = Array.from({ length: 8 }, () => '<div class="particle" aria-hidden="true"></div>').join('')
const EMPTY = '<br>'

export interface RenderOpts {
  /** HTML of embedded message / file cards (rendered with Slack's components) */
  embedHtml?: (block: Extract<CanvasBlock, { type: 'message' } | { type: 'file' }>) => string
  /** section data-ids that show their placeholder (empty title / first paragraph) */
  placeholders?: Record<string, string>
}

/** The article's children for a document: Quip's remote caret layer, the title, then one section per block. */
export function renderArticle(doc: Pick<CanvasDoc, 'id' | 'title' | 'blocks'>, opts: RenderOpts = {}): string {
  let n = 0
  const domId = () => `id-${++n}`
  const titleId = titleSectionId(doc.id)
  const ghost = (id: string) => (opts.placeholders?.[id] ? `<div class="ghost-text-placeholder-overlay" contenteditable="false" aria-hidden="true">${esc(opts.placeholders[id])}</div>` : '')

  const text = (id: string, style: string, html: string, level?: number) => {
    const heading = level ? ` role="heading" aria-level="${level}"` : ''
    return (
      `<div class="section on-focus-outer-box-shadow" ${EVENTS} data-id="${id}" data-section-style="${style}" data-section-type="0"${heading} id="${domId()}" data-focusin="section">` +
      `${ENTRY}${ghost(id)}<div class="content" data-id="${id}" data-contextmenu="section-context-menu"${level ? ' role="none"' : ''}>${html || EMPTY}</div></div>`
    )
  }

  const list = (b: Extract<CanvasBlock, { items: CanvasListItem[] }>) => {
    const check = b.type === 'checklist'
    const liIds: string[] = []
    const items = b.items
      .map((it) => {
        const li = `list-item-e-${++n}`
        const sec = domId()
        liIds.push(li)
        const indent = Math.max(0, Math.min(4, it.indent ?? 0))
        const marker = check
          ? `<editor-ui class="list-item-marker-container checkbox-container" contenteditable="false" data-mousedown="checkbox-container"><input class="checkbox" type="checkbox" data-change="list-checkbox" data-mousedown="list-checkbox" data-keydown="list-checkbox" aria-labelledby="${sec}"${it.checked ? ' checked' : ''}><label for="${sec}" aria-hidden="true"></label><div class="particle-container" aria-hidden="true">${PARTICLES}</div></editor-ui>`
          : '<editor-ui class="list-item-marker-container" contenteditable="false"><editor-ui class="pseudo-before" contenteditable="false"></editor-ui></editor-ui>'
        const events = check ? EVENTS.replace('data-mousedown="section"', 'data-mousedown="a11y-list-item-section"') : EVENTS.replace(' data-mousedown="section"', '')
        return (
          `<li id="${li}" role="listitem" class="with-list-item-marker-container${check ? ' slackified-checkbox' : ''}${it.checked ? ' checked' : ''}" data-indent="${indent}" style="margin-left: ${indent * 26}px; margin-right: 0px;">${marker}` +
          `<div class="section on-focus-outer-box-shadow" ${events} data-id="${it.id}" data-section-style="0" data-section-type="0" id="${sec}" data-focusin="section"${check ? '' : ' role="none"'}>` +
          `${ENTRY}<div class="content" data-id="${it.id}" data-contextmenu="section-context-menu"${check ? '' : ' role="none"'}>${it.html || EMPTY}</div></div></li>`
        )
      })
      .join('')
    return (
      `<div class="section" ${EVENTS} data-id="${b.id}" data-section-style="${SECTION_STYLE[b.type]}" data-section-type="1" id="${domId()}" data-focusin="section">` +
      `<div class="content" data-id="${b.id}"><div class="list-section-container" data-contextmenu="section-context-menu"><ul class="draggable">${items}</ul>` +
      `<editor-ui class="a11y-list-structure-container" contenteditable="false"><div><div id="list-e-${++n}-0" role="list" aria-owns="${liIds.join(' ')}"></div></div></editor-ui></div></div></div>`
    )
  }

  const hr = (id: string) =>
    `<div class="section a11y-navigable-object-section" ${EVENTS} data-id="${id}" data-section-style="18" data-section-type="16" tabindex="-1" id="${domId()}" data-focusin="section">` +
    `${ENTRY}<div class="content" data-id="${id}"><div class="a11y-navigable-object-container" contenteditable="false"><div class="a11y-navigable-object-activator a11y-sr-only a11y-navigable-object-activator-hidden" tabindex="-1" role="none" aria-roledescription="" aria-hidden="true">Horizontal Rule</div><div class="a11y-navigable-object-overflow-preventer"></div><hr></div></div></div>`

  const embed = (b: Extract<CanvasBlock, { type: 'message' } | { type: 'file' }>) => {
    const data = b.type === 'message' ? `data-embed="message" data-embed-conversation="${esc(b.conversationId)}" data-embed-ts="${esc(b.ts)}"` : `data-embed="file" data-embed-file="${esc(b.fileId)}"`
    const inner = opts.embedHtml?.(b) ?? ''
    return (
      `<div class="section embedded-ui-section a11y-navigable-object-section" ${EVENTS} data-id="${b.id}" data-section-style="44" data-section-type="56" ${data} id="${domId()}" data-focusin="section">` +
      `${ENTRY}<div class="content embedded-ui-content" data-id="${b.id}"><div contenteditable="false" class="a11y-navigable-object-container">` +
      `<div class="a11y-navigable-object-activator a11y-sr-only" tabindex="0" role="button" aria-roledescription="${b.type === 'message' ? 'Message' : 'File'} button" aria-hidden="true"></div><div class="a11y-navigable-object-overflow-preventer"></div>` +
      `<div><div class="card-view is-not-offscreen${b.type === 'file' ? ' card-view__file_card' : ''}" style="contain-intrinsic-size: auto 200px auto 100px;">` +
      `<div id="collab-embedded-ui-main-${b.id}" contenteditable="false" role="dialog" aria-modal="true" aria-hidden="true" aria-label="${b.type === 'message' ? 'Message preview' : 'File preview'}"><div><div role="none" style="display: contents;"><div class="offscreen" aria-hidden="true" tabindex="-1"></div>` +
      `<div class="embeddedUiCardContainer__KANvY c-card_container c-card_container--elevation_1 c-card_container--size_medium" data-qa="card" data-qa-elevation="1" data-qa-size="medium"><div class="">${inner}</div><span hidden data-sk="popover-trigger"></span></div>` +
      `<div class="offscreen" aria-hidden="true" tabindex="-1"></div></div></div></div></div></div>` +
      `<div class="section-margin-filler bottom" aria-hidden="true"></div></div></div></div>`
    )
  }

  const title =
    `<div class="section on-focus-outer-box-shadow" ${EVENTS} data-id="${titleId}" data-section-style="48" data-section-type="64" role="heading" aria-level="1" id="${domId()}" data-focusin="section">` +
    `${ghost(titleId)}<div class="content" data-id="${titleId}" data-contextmenu="section-context-menu" role="none">${esc(doc.title) || EMPTY}</div></div>`

  const body = doc.blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
        case 'code':
        case 'quote':
          return text(b.id, SECTION_STYLE[b.type], b.html)
        case 'h1':
        case 'h2':
        case 'h3':
          return text(b.id, SECTION_STYLE[b.type], b.html, Number(b.type[1]))
        case 'bullet':
        case 'ordered':
        case 'checklist':
          return list(b)
        case 'hr':
          return hr(b.id)
        case 'message':
        case 'file':
          return embed(b)
      }
    })
    .join('')
  return `<editor-ui class="remote-caret-ranges" contenteditable="false" aria-hidden="true"><div></div></editor-ui>${title}${body}`
}

/** The title section keeps a stable id per document so the caret can come back to it. */
export const titleSectionId = (docId: string) => `T${docId.replace(/[^A-Za-z0-9]/g, '').slice(-10)}`

// ---- parsing (DOM → model) ---------------------------------------------------------------------

const INLINE_TAGS: Record<string, string> = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', DEL: 'del', S: 'del', STRIKE: 'del', CODE: 'code', U: 'u' }

/** Sanitizes a section's content to the canvas inline vocabulary (b, i, u, del, code, a, br, mentions). */
export function cleanInline(root: Node, ctx: InlineCtx): string {
  let out = ''
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += esc((child.textContent ?? '').replace(/​/g, ''))
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const el = child as HTMLElement
      const tag = el.tagName
      if (tag === 'EDITOR-UI' || el.classList.contains('ghost-text-placeholder-overlay')) continue
      if (tag === 'CONTROL') {
        const kind = el.dataset.mention
        const id = el.dataset.mentionId ?? ''
        if (kind === 'user') out += userMentionHtml(ctx, id)
        else if (kind === 'channel') out += channelMentionHtml(ctx, id)
        continue
      }
      if (tag === 'BR') {
        out += '<br>'
        continue
      }
      if (tag === 'A') {
        const href = el.getAttribute('href') ?? ''
        out += `<a href="${esc(href)}" target="_blank" rel="nofollow noreferrer popup=0" spellcheck="false">`
        walk(el)
        out += '</a>'
        continue
      }
      const inline = INLINE_TAGS[tag]
      if (inline) {
        out += `<${inline}>`
        walk(el)
        out += `</${inline}>`
        continue
      }
      // Pasted blocks inside a section: keep their text on separate lines.
      const block = tag === 'DIV' || tag === 'P' || tag === 'LI'
      if (block && out && !out.endsWith('<br>')) out += '<br>'
      walk(el)
    }
  }
  walk(root)
  // A lone trailing <br> is just the caret placeholder of an empty or line-ending section.
  return out.replace(/<br>$/, '').replace(/<(b|i|u|del|code)><\/\1>/g, '')
}

/** Plain text of a content element (the title is plain text). */
export const plainText = (el: Element) =>
  Array.from(el.childNodes)
    .filter((n) => !(n instanceof HTMLElement && (n.tagName === 'EDITOR-UI' || n.classList.contains('ghost-text-placeholder-overlay'))))
    .map((n) => n.textContent ?? '')
    .join('')
    .replace(/​/g, '')
    .replace(/\n/g, ' ')

/** Reads the document back from the editor DOM. Tolerant of whatever the browser left behind. */
export function parseArticle(article: HTMLElement, ctx: InlineCtx, prev: CanvasDoc): { title: string; blocks: CanvasBlock[] } {
  let title = prev.title
  const blocks: CanvasBlock[] = []
  let stray: Node[] = []
  const flushStray = () => {
    if (!stray.length) return
    const holder = document.createElement('div')
    stray.forEach((n) => holder.appendChild(n.cloneNode(true)))
    const html = cleanInline(holder, ctx)
    if (html) blocks.push({ id: newId(), type: 'p', html })
    stray = []
  }
  for (const node of Array.from(article.childNodes)) {
    if (!(node instanceof HTMLElement) || !node.classList.contains('section')) {
      if (node instanceof HTMLElement && node.tagName === 'EDITOR-UI') continue
      if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()) continue
      stray.push(node)
      continue
    }
    flushStray()
    const sec = node
    const style = sec.dataset.sectionStyle ?? '0'
    const id = sec.dataset.id || newId()
    const content = sec.querySelector(':scope > .content')
    if (style === '48') {
      title = content ? plainText(content).trim() : title
      continue
    }
    if (STYLE_TEXT[style]) {
      blocks.push({ id, type: STYLE_TEXT[style], html: content ? cleanInline(content, ctx) : '' })
      continue
    }
    if (STYLE_LIST[style]) {
      const items: CanvasListItem[] = []
      sec.querySelectorAll(':scope > .content > .list-section-container > ul > li').forEach((li) => {
        const inner = li.querySelector(':scope > .section')
        const c = inner?.querySelector(':scope > .content') ?? li
        const item: CanvasListItem = { id: (inner as HTMLElement | null)?.dataset.id || newId(), html: cleanInline(c, ctx) }
        const indent = Number((li as HTMLElement).dataset.indent ?? 0)
        if (indent) item.indent = indent
        if (li.classList.contains('checked')) item.checked = true
        items.push(item)
      })
      if (items.length) blocks.push({ id, type: STYLE_LIST[style], items })
      continue
    }
    if (style === '18') {
      blocks.push({ id, type: 'hr' })
      continue
    }
    if (style === '44') {
      if (sec.dataset.embed === 'message' && sec.dataset.embedConversation && sec.dataset.embedTs) blocks.push({ id, type: 'message', conversationId: sec.dataset.embedConversation, ts: sec.dataset.embedTs })
      else if (sec.dataset.embed === 'file' && sec.dataset.embedFile) blocks.push({ id, type: 'file', fileId: sec.dataset.embedFile })
    }
  }
  flushStray()
  return { title, blocks: normalizeBlocks(blocks) }
}

/** Keeps the document editable: merges adjacent lists of the same kind and ends with a text block. */
export function normalizeBlocks(blocks: CanvasBlock[]): CanvasBlock[] {
  const out: CanvasBlock[] = []
  for (const b of blocks) {
    const last = out[out.length - 1]
    if (last && isListType(b.type) && last.type === b.type && 'items' in last && 'items' in b) {
      out[out.length - 1] = { ...last, items: [...last.items, ...b.items] }
      continue
    }
    out.push(b)
  }
  const last = out[out.length - 1]
  if (!last || last.type === 'hr' || last.type === 'message' || last.type === 'file') out.push({ id: newId(), type: 'p', html: '' })
  return out
}

// ---- model helpers ---------------------------------------------------------------------------

/** A text-bearing unit in document order: a text block or one list item. */
export interface Unit {
  id: string
  block: number
  item?: number
}

export function units(blocks: CanvasBlock[]): Unit[] {
  const out: Unit[] = []
  blocks.forEach((b, i) => {
    if ('items' in b) b.items.forEach((it, j) => out.push({ id: it.id, block: i, item: j }))
    else out.push({ id: b.id, block: i })
  })
  return out
}

export function unitHtml(blocks: CanvasBlock[], u: Unit): string | null {
  const b = blocks[u.block]
  if (u.item !== undefined && 'items' in b) return b.items[u.item].html
  return 'html' in b ? b.html : null
}

/** Word count → Slack's "N min read" (200 wpm, at least 1). */
export function readMinutes(doc: CanvasDoc): number {
  const html = doc.blocks.map((b) => ('html' in b ? b.html : 'items' in b ? b.items.map((i) => i.html).join(' ') : '')).join(' ')
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Plain text of inline HTML (for previews). */
export const htmlText = (html: string) => {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent ?? ''
}
