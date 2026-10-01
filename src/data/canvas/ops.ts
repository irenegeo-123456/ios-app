import type { CanvasBlock, CanvasListItem } from '../types'
import { isListType, newId, normalizeBlocks, units, type ListType, type TextType, type Unit } from './model'

// Pure edits on the canvas model, ported from the web kit (slack-remix src/components/canvas/ops.ts) and extended with
// what the iOS editing toolbar and format picker do (CanvasToolbarLayoutBuilder.swift, CanvasFormatPickerPresenter.swift):
// checking a checklist item, inserting a divider. Each returns the new model and where the caret goes (a unit id and
// a character offset; mentions and line breaks count as one character). Nothing here touches the DOM, so the logic runs
// (and is tested) without a browser.

export interface Model {
  title: string
  blocks: CanvasBlock[]
}

export interface Caret {
  id: string
  offset: number
}

export interface EditResult {
  model: Model
  caret: Caret | null
}

type TextBlock = Extract<CanvasBlock, { html: string }>
type ListBlock = Extract<CanvasBlock, { items: CanvasListItem[] }>

const clone = (m: Model): Model => ({ title: m.title, blocks: m.blocks.map((b) => ('items' in b ? { ...b, items: b.items.map((i) => ({ ...i })) } : { ...b })) })

// ---- inline HTML, without a DOM ----------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return ENTITIES[e.toLowerCase()] ?? m
  })

/** Splits canvas inline HTML into text runs and tags; a mention control is one token. */
function tokens(html: string): { kind: 'text' | 'tag' | 'control' | 'atom'; v: string }[] {
  const out: { kind: 'text' | 'tag' | 'control' | 'atom'; v: string }[] = []
  const re = /<control\b[\s\S]*?<\/control>|<br\s*\/?>|<img\b[^>]*>|<[^>]+>|[^<]+/gi
  for (const m of html.matchAll(re)) {
    const v = m[0]
    if (/^<control\b/i.test(v)) out.push({ kind: 'control', v })
    else if (/^<(br|img)\b/i.test(v)) out.push({ kind: 'atom', v })
    else if (v[0] === '<') out.push({ kind: 'tag', v })
    else out.push({ kind: 'text', v })
  }
  return out
}

/** Character length of inline HTML, counting mentions and line breaks as one (the editor's caret offsets). */
export function htmlLength(html: string): number {
  let n = 0
  for (const t of tokens(html)) {
    if (t.kind === 'text') n += decode(t.v).length
    else if (t.kind === 'control' || t.kind === 'atom') n += 1
  }
  return n
}

/** Plain text of inline HTML (a mention reads as its label, "@Priya"). */
export function htmlText(html: string): string {
  let s = ''
  for (const t of tokens(html)) {
    if (t.kind === 'text') s += decode(t.v)
    else if (t.kind === 'control') s += decode(t.v.replace(/<[^>]+>/g, ''))
  }
  return s.replace(/\u200B/g, '')
}

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---- helpers ------------------------------------------------------------------------------------

function find(m: Model, id: string): Unit | undefined {
  return units(m.blocks).find((u) => u.id === id)
}

/** Splits a list around one item: [items before] [paragraph] [items after]. */
function listToParagraphAt(blocks: CanvasBlock[], u: Unit, html: string): { blocks: CanvasBlock[]; id: string } {
  const list = blocks[u.block] as ListBlock
  const before = list.items.slice(0, u.item)
  const after = list.items.slice((u.item ?? 0) + 1)
  const p: CanvasBlock = { id: list.items[u.item ?? 0].id, type: 'p', html }
  const parts: CanvasBlock[] = []
  if (before.length) parts.push({ ...list, items: before })
  parts.push(p)
  if (after.length) parts.push({ id: newId(), type: list.type, items: after })
  return { blocks: [...blocks.slice(0, u.block), ...parts, ...blocks.slice(u.block + 1)], id: p.id }
}

export function setUnitHtml(m: Model, id: string, html: string) {
  for (const b of m.blocks) {
    if ('items' in b) {
      const it = b.items.find((i) => i.id === id)
      if (it) it.html = html
    } else if ('html' in b && b.id === id) b.html = html
  }
}

/** The style of the unit a caret is in: a text block's type, or its list's. */
export function unitStyle(m: Model, id: string, titleId: string): TextType | ListType | 'title' | null {
  if (id === titleId) return 'title'
  const u = find(m, id)
  if (!u) return null
  return m.blocks[u.block].type as TextType | ListType
}

// ---- structural edits ---------------------------------------------------------------------------

/** Enter: split the unit at the caret (`head` stays, `tail` moves to a new unit). */
export function split(m0: Model, id: string, titleId: string, head: string, tail: string): EditResult {
  const m = clone(m0)
  if (id === titleId) {
    m.title = htmlText(head).trim()
    // Return at the end of the title goes down into an empty first paragraph (a new canvas's) rather than adding one
    const first = m.blocks[0]
    if (!htmlText(tail).trim() && first?.type === 'p' && !htmlText(first.html).trim() && !/<(control|img)\b/i.test(first.html)) return { model: m, caret: { id: first.id, offset: 0 } }
    const p: CanvasBlock = { id: newId(), type: 'p', html: tail }
    m.blocks = [p, ...m.blocks]
    return { model: m, caret: { id: p.id, offset: 0 } }
  }
  const u = find(m, id)
  if (!u) return { model: m, caret: null }
  const b = m.blocks[u.block]
  if ('items' in b && u.item !== undefined) {
    const item = b.items[u.item]
    if (!head && !tail) {
      // Enter on an empty item leaves the list (or outdents a nested one).
      if (item.indent) {
        item.indent -= 1
        if (!item.indent) delete item.indent
        return { model: m, caret: { id, offset: 0 } }
      }
      const r = listToParagraphAt(m.blocks, u, '')
      return { model: { ...m, blocks: r.blocks }, caret: { id: r.id, offset: 0 } }
    }
    item.html = head
    const next: CanvasListItem = { id: newId(), html: tail }
    if (item.indent) next.indent = item.indent
    b.items.splice(u.item + 1, 0, next)
    return { model: m, caret: { id: next.id, offset: 0 } }
  }
  const tb = b as TextBlock
  if (tb.type === 'quote' && !head && !tail) {
    m.blocks[u.block] = { ...tb, type: 'p' }
    return { model: m, caret: { id, offset: 0 } }
  }
  tb.html = head
  // Headings continue as text, like the live editor (unless you split one in the middle).
  const type: TextType = tb.type.startsWith('h') && !tail ? 'p' : tb.type
  const nb: CanvasBlock = { id: newId(), type, html: tail }
  m.blocks.splice(u.block + 1, 0, nb)
  return { model: m, caret: { id: nb.id, offset: 0 } }
}

/** Backspace at the very start of a unit. */
export function backspaceAtStart(m0: Model, id: string, titleId: string): EditResult | null {
  if (id === titleId) return null
  const m = clone(m0)
  const all = units(m.blocks)
  const idx = all.findIndex((u) => u.id === id)
  const u = all[idx]
  if (!u) return null
  const b = m.blocks[u.block]
  if ('items' in b && u.item !== undefined) {
    const item = b.items[u.item]
    if (item.indent) {
      item.indent -= 1
      if (!item.indent) delete item.indent
      return { model: m, caret: { id, offset: 0 } }
    }
    const r = listToParagraphAt(m.blocks, u, item.html)
    return { model: { ...m, blocks: r.blocks }, caret: { id: r.id, offset: 0 } }
  }
  const tb = b as TextBlock
  if (tb.type !== 'p') {
    m.blocks[u.block] = { ...tb, type: 'p' }
    return { model: m, caret: { id, offset: 0 } }
  }
  // A divider or card right above goes away first.
  const prevBlock = m.blocks[u.block - 1]
  if (prevBlock && (prevBlock.type === 'hr' || prevBlock.type === 'message' || prevBlock.type === 'file')) {
    m.blocks.splice(u.block - 1, 1)
    return { model: m, caret: { id, offset: 0 } }
  }
  if (u.block === 0) {
    // Merge into the title (as plain text).
    const offset = m.title.length
    m.title = (m.title + htmlText(tb.html)).replace(/\s+/g, ' ')
    m.blocks.splice(0, 1)
    return { model: m, caret: { id: titleId, offset } }
  }
  const prev = all[idx - 1]
  const pb = m.blocks[prev.block]
  let prevHtml: string
  if ('items' in pb && prev.item !== undefined) prevHtml = pb.items[prev.item].html
  else prevHtml = (pb as TextBlock).html
  const offset = htmlLength(prevHtml)
  const merged = prevHtml + tb.html
  if ('items' in pb && prev.item !== undefined) pb.items[prev.item].html = merged
  else (pb as TextBlock).html = merged
  m.blocks.splice(u.block, 1)
  return { model: m, caret: { id: prev.id, offset } }
}

/** Delete at the very end of a unit: pull the next unit up into it. */
export function deleteAtEnd(m0: Model, id: string, titleId: string, currentLength: number): EditResult | null {
  const m = clone(m0)
  if (id === titleId) {
    const first = m.blocks[0]
    if (!first || !('html' in first)) return null
    m.title = (m.title + htmlText(first.html)).replace(/\s+/g, ' ')
    m.blocks.splice(0, 1)
    return { model: m, caret: { id, offset: currentLength } }
  }
  const all = units(m.blocks)
  const idx = all.findIndex((u) => u.id === id)
  const u = all[idx]
  if (!u) return null
  const nextBlockIndex = u.item !== undefined && 'items' in m.blocks[u.block] && u.item < (m.blocks[u.block] as ListBlock).items.length - 1 ? u.block : u.block + 1
  const nb = m.blocks[nextBlockIndex]
  if (nb && nextBlockIndex !== u.block && (nb.type === 'hr' || nb.type === 'message' || nb.type === 'file')) {
    m.blocks.splice(nextBlockIndex, 1)
    return { model: m, caret: { id, offset: currentLength } }
  }
  const next = all[idx + 1]
  if (!next) return null
  const b = m.blocks[u.block]
  const nextBlock = m.blocks[next.block]
  let nextHtml: string
  if ('items' in nextBlock && next.item !== undefined) {
    nextHtml = nextBlock.items[next.item].html
    nextBlock.items.splice(next.item, 1)
    if (!nextBlock.items.length) m.blocks.splice(next.block, 1)
  } else {
    nextHtml = (nextBlock as TextBlock).html
    m.blocks.splice(next.block, 1)
  }
  if ('items' in b && u.item !== undefined) b.items[u.item].html += nextHtml
  else (b as TextBlock).html += nextHtml
  return { model: m, caret: { id, offset: currentLength } }
}

/** Deletes everything from inside unit `startId` to inside unit `endId`, joining what's left. */
export function deleteBetween(m0: Model, titleId: string, startId: string, head: string, endId: string, tail: string): EditResult {
  const m = clone(m0)
  const all = units(m.blocks)
  const pos = (u: Unit) => [u.block, u.item ?? -1] as const
  const after = (a: readonly [number, number], b: readonly [number, number]) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])
  const end = all.find((u) => u.id === endId)
  const endPos = end ? pos(end) : ([-1, -1] as const)
  const startPos =
    startId === titleId
      ? ([-1, 99999] as const)
      : (() => {
          const s = all.find((u) => u.id === startId)
          return s ? pos(s) : ([-1, 99999] as const)
        })()
  const removed = (p: readonly [number, number]) => after(p, startPos) && !after(p, endPos)
  const blocks: CanvasBlock[] = []
  m.blocks.forEach((b, i) => {
    if ('items' in b) {
      const items = b.items.filter((_, j) => !removed([i, j]))
      if (items.length) blocks.push({ ...b, items })
      return
    }
    if (!removed([i, -1])) blocks.push(b)
  })
  m.blocks = blocks
  if (startId === titleId) {
    m.title = (htmlText(head) + htmlText(tail)).replace(/\s+/g, ' ')
    return { model: m, caret: { id: titleId, offset: htmlText(head).length } }
  }
  setUnitHtml(m, startId, head + tail)
  return { model: m, caret: { id: startId, offset: htmlLength(head) } }
}

/**
 * Turns the unit into another block type (a markdown shortcut, or a section style from the format picker: body,
 * Big/Medium/Small heading, quote, bulleted / numbered / checklist). The caret keeps its offset.
 */
export function setType(m0: Model, id: string, type: TextType | ListType, offset = 0): EditResult {
  const m = clone(m0)
  const u = find(m, id)
  if (!u) return { model: m, caret: null }
  const b = m.blocks[u.block]
  if ('items' in b && u.item !== undefined) {
    if (isListType(type)) {
      if (type === b.type) return { model: m, caret: { id, offset } }
      // Change just this item's list kind by splitting it out.
      const item = b.items[u.item]
      const before = b.items.slice(0, u.item)
      const after = b.items.slice(u.item + 1)
      const parts: CanvasBlock[] = []
      if (before.length) parts.push({ ...b, items: before })
      const moved: CanvasListItem = { ...item }
      if (type !== 'checklist') delete moved.checked
      parts.push({ id: newId(), type, items: [moved] })
      if (after.length) parts.push({ id: newId(), type: b.type, items: after })
      m.blocks.splice(u.block, 1, ...parts)
      return { model: m, caret: { id, offset } }
    }
    const r = listToParagraphAt(m.blocks, u, b.items[u.item].html)
    const blocks = r.blocks.map((x) => (x.id === r.id && 'html' in x ? { ...x, type } : x)) as CanvasBlock[]
    return { model: { ...m, blocks }, caret: { id: r.id, offset } }
  }
  const tb = b as TextBlock
  if (isListType(type)) {
    m.blocks[u.block] = { id: newId(), type, items: [{ id: tb.id, html: tb.html }] }
  } else {
    m.blocks[u.block] = { ...tb, type }
  }
  return { model: m, caret: { id, offset } }
}

/** `---`: the paragraph becomes a divider, with a fresh paragraph after it. */
export function toDivider(m0: Model, id: string): EditResult {
  const m = clone(m0)
  const u = find(m, id)
  if (!u || u.item !== undefined) return { model: m, caret: null }
  const p: CanvasBlock = { id: newId(), type: 'p', html: '' }
  m.blocks.splice(u.block, 1, { id: newId(), type: 'hr' }, p)
  return { model: m, caret: { id: p.id, offset: 0 } }
}

/**
 * The "+" sheet's Divider (CanvasDividerPlugin.swift): a horizontal rule at the caret. An empty paragraph becomes the
 * divider; otherwise the divider goes after the caret's block (its list), with a new paragraph to keep typing in.
 */
export function insertDivider(m0: Model, id: string, titleId: string): EditResult {
  const u = id === titleId ? undefined : find(m0, id)
  const b = u ? m0.blocks[u.block] : undefined
  if (u && b && b.type === 'p' && !htmlText(b.html).trim() && !/<control/.test(b.html)) return toDivider(m0, id)
  const m = clone(m0)
  const at = u ? u.block + 1 : 0
  const p: CanvasBlock = { id: newId(), type: 'p', html: '' }
  m.blocks.splice(at, 0, { id: newId(), type: 'hr' }, p)
  return { model: m, caret: { id: p.id, offset: 0 } }
}

/** Tab / Shift+Tab on a list item, and the toolbar's Indent / Outdent. Returns null when nothing changes. */
export function indent(m0: Model, id: string, delta: number): EditResult | null {
  const m = clone(m0)
  const u = find(m, id)
  if (!u || u.item === undefined) return null
  const b = m.blocks[u.block] as ListBlock
  const item = b.items[u.item]
  const prevIndent = u.item > 0 ? (b.items[u.item - 1].indent ?? 0) : -1
  const next = Math.max(0, Math.min((item.indent ?? 0) + delta, prevIndent + 1, 4))
  if (next === (item.indent ?? 0)) return null
  if (next) item.indent = next
  else delete item.indent
  return { model: m, caret: null }
}

/** Whether Indent / Outdent can do anything for this unit (canvasIndentationDisallowed: not in a list). */
export function canIndent(m: Model, id: string, delta: number): boolean {
  return indent(m, id, delta) !== null
}

/** A checklist item's checkbox (the Quip checkbox; read-only canvases can't toggle it). */
export function toggleChecked(m0: Model, itemId: string, checked?: boolean): Model {
  const m = clone(m0)
  for (const b of m.blocks) {
    if (b.type !== 'checklist') continue
    const it = b.items.find((i) => i.id === itemId)
    if (!it) continue
    const on = checked ?? !it.checked
    if (on) it.checked = true
    else delete it.checked
  }
  return m
}

/** Pasting several lines: the first joins the caret's unit, the rest become units of the same kind. */
export function pasteLines(m0: Model, id: string, titleId: string, head: string, tail: string, lines: string[], esc: (s: string) => string = escText): EditResult {
  let m = clone(m0)
  let curId = id
  let curHead = head + esc(lines[0])
  for (let i = 1; i < lines.length; i++) {
    const r = split(m, curId, titleId, curHead, '')
    m = r.model
    curId = r.caret?.id ?? curId
    curHead = esc(lines[i])
  }
  const offset = htmlLength(curHead)
  if (curId === titleId) m.title = htmlText(curHead + tail)
  else setUnitHtml(m, curId, curHead + tail)
  m.blocks = normalizeBlocks(m.blocks)
  return { model: m, caret: { id: curId, offset } }
}
