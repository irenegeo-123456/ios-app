import type { RtElement, RtInline, RtList, RtStyle } from './rich-text'
import type { KitBlock, TableBlock, TableCell } from './types'

// Slack's `markdown` block (what AI agents send) → the blocks Slack actually renders: runs of text become
// rich_text, `#` headings become header blocks (levels 1–4), `---` a divider and pipe tables a table block.
// Blank lines are paragraph breaks, placed like the live client does (see reference/dom/blockkit-richtext.html).

// ------------------------------------------------------------------------------------------------
// Inline: **bold** __bold__ *italic* _italic_ ~~strike~~ `code` [text](url) ![alt](url) <url> bare URLs,
// :emoji:, <@U123> and <#C123>.

const BARE_URL = /^https?:\/\/[^\s<>()]+[^\s<>().,:;!?"']/

export function mdInline(src: string, style: RtStyle = {}): RtInline[] {
  const out: RtInline[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push(Object.keys(style).length ? { type: 'text', text: buf, style: { ...style } } : { type: 'text', text: buf })
    buf = ''
  }
  const wrap = (open: string, close: string, key: keyof RtStyle, i: number): number => {
    if (!src.startsWith(open, i)) return -1
    const end = src.indexOf(close, i + open.length)
    if (end <= i + open.length || src[i + open.length] === ' ') return -1
    flush()
    out.push(...mdInline(src.slice(i + open.length, end), { ...style, [key]: true }))
    return end + close.length
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const rest = src.slice(i)
    if (c === '\\' && i + 1 < src.length) {
      buf += src[i + 1]
      i += 2
      continue
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1)
      if (end > i) {
        flush()
        out.push({ type: 'text', text: src.slice(i + 1, end), style: { ...style, code: true } })
        i = end + 1
        continue
      }
    }
    const link = /^!?\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest)
    if (link) {
      flush()
      out.push({ type: 'link', url: link[2], text: link[1] || undefined, ...(Object.keys(style).length ? { style: { ...style } } : {}) })
      i += link[0].length
      continue
    }
    if (c === '<') {
      const m = /^<(@[UW][A-Z0-9]+|#C[A-Z0-9]+|https?:\/\/[^>\s]+)>/.exec(rest)
      if (m) {
        flush()
        const body = m[1]
        if (body.startsWith('@')) out.push({ type: 'user', user_id: body.slice(1) })
        else if (body.startsWith('#')) out.push({ type: 'channel', channel_id: body.slice(1) })
        else out.push({ type: 'link', url: body })
        i += m[0].length
        continue
      }
    }
    if (c === 'h' && /^https?:\/\//.test(rest)) {
      const m = BARE_URL.exec(rest)
      if (m) {
        flush()
        out.push({ type: 'link', url: m[0], truncated: true })
        i += m[0].length
        continue
      }
    }
    if (c === ':') {
      const m = /^:([a-z0-9_+'-]+(?:::skin-tone-[2-6])?):/.exec(rest)
      if (m) {
        flush()
        out.push({ type: 'emoji', name: m[1] })
        i += m[0].length
        continue
      }
    }
    let next = -1
    if (c === '*' || c === '_') next = wrap(c + c, c + c, 'bold', i)
    if (next < 0 && c === '~') next = wrap('~~', '~~', 'strike', i)
    if (next < 0 && (c === '*' || c === '_') && src[i + 1] !== c) {
      const prev = i === 0 ? ' ' : src[i - 1]
      // Intra-word underscores (snake_case) stay literal.
      if (c === '*' || !/\w/.test(prev)) next = wrap(c, c, 'italic', i)
    }
    if (next >= 0) {
      i = next
      continue
    }
    buf += c
    i++
  }
  flush()
  return out
}

// ------------------------------------------------------------------------------------------------
// Blocks

type Token =
  | { k: 'para'; lines: string[] }
  | { k: 'heading'; level: number; text: string }
  | { k: 'hr' }
  | { k: 'code'; text: string; lang?: string }
  | { k: 'quote'; lines: string[] }
  | { k: 'list'; items: { indent: number; ordered: boolean; n: number; text: string }[] }
  | { k: 'table'; rows: string[][]; align: ('left' | 'center' | 'right' | undefined)[] }
  | { k: 'blank' }

const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))

function tokenize(src: string): Token[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const out: Token[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      if (out[out.length - 1]?.k !== 'blank') out.push({ k: 'blank' })
      continue
    }
    const fence = /^\s*(```|~~~)\s*([\w+-]*)\s*$/.exec(line)
    if (fence) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++])
      out.push({ k: 'code', text: body.join('\n'), lang: fence[2] || undefined })
      continue
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      out.push({ k: 'heading', level: Math.min(heading[1].length, 4), text: heading[2] })
      continue
    }
    if (HR.test(line)) {
      out.push({ k: 'hr' })
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = splitRow(line)
      const align = splitRow(lines[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : undefined))
      const rows = [header]
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]))
      i--
      out.push({ k: 'table', rows, align })
      continue
    }
    if (/^\s{0,3}>/.test(line)) {
      const q: string[] = []
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) q.push(lines[i++].replace(/^\s{0,3}> ?/, ''))
      i--
      out.push({ k: 'quote', lines: q })
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      const items: Extract<Token, { k: 'list' }>['items'] = []
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i])
        if (!m) break
        const ordered = /\d/.test(m[2])
        items.push({ indent: Math.floor(m[1].replace(/\t/g, '    ').length / 2), ordered, n: ordered ? parseInt(m[2], 10) : 0, text: m[3] })
        i++
      }
      i--
      out.push({ k: 'list', items })
      continue
    }
    const prev = out[out.length - 1]
    if (prev?.k === 'para') prev.lines.push(line)
    else out.push({ k: 'para', lines: [line] })
  }
  return out
}

/** One list token → Slack's list elements: a new element whenever the style or indent changes. */
function listElements(items: Extract<Token, { k: 'list' }>['items']): RtList[] {
  const out: RtList[] = []
  for (const it of items) {
    const style = it.ordered ? 'ordered' : 'bullet'
    const last = out[out.length - 1]
    const section = { type: 'rich_text_section' as const, elements: mdInline(it.text) }
    if (last && last.style === style && (last.indent ?? 0) === it.indent) last.elements.push(section)
    else out.push({ type: 'rich_text_list', style, indent: it.indent, elements: [section], ...(it.ordered && it.n > 1 ? { offset: it.n - 1 } : {}) })
  }
  return out
}

const tableCell = (text: string): TableCell => ({ type: 'rich_text', elements: [{ type: 'rich_text_section', elements: mdInline(text) }] })

/** Converts a markdown block's text into the blocks Slack renders for it. */
export function markdownToBlocks(text: string): KitBlock[] {
  const tokens = tokenize(text)
  const blocks: KitBlock[] = []
  let rich: RtElement[] = []
  const flushRich = () => {
    if (rich.length) blocks.push({ type: 'rich_text', elements: rich })
    rich = []
  }
  // Appends a paragraph break: at the end of the previous section, else at the start of the next paragraph,
  // else as a section of its own (these are the live client's placements).
  let pendingLead = false
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t]
    const prev = rich[rich.length - 1]
    switch (tok.k) {
      case 'blank': {
        const next = tokens[t + 1]
        if (!next || !rich.length) break
        if (prev?.type === 'rich_text_section') prev.elements.push({ type: 'text', text: '\n\n' })
        else if (next.k === 'para') pendingLead = true
        else if (next.k === 'list' || next.k === 'quote' || next.k === 'code') rich.push({ type: 'rich_text_section', elements: [{ type: 'text', text: '\n' }] })
        break
      }
      case 'para': {
        const els = mdInline(tok.lines.join('\n'))
        if (pendingLead) els.unshift({ type: 'text', text: '\n' })
        pendingLead = false
        rich.push({ type: 'rich_text_section', elements: els })
        break
      }
      case 'list':
        rich.push(...listElements(tok.items))
        break
      case 'quote':
        rich.push({ type: 'rich_text_quote', elements: mdInline(tok.lines.join('\n')) })
        break
      case 'code':
        rich.push({ type: 'rich_text_preformatted', elements: [{ type: 'text', text: tok.text }], ...(tok.lang ? { language: tok.lang } : {}) })
        break
      case 'heading':
        flushRich()
        blocks.push({ type: 'header', text: { type: 'plain_text', text: tok.text.replace(/\*\*|__|`/g, '') }, level: tok.level })
        break
      case 'hr':
        flushRich()
        blocks.push({ type: 'divider' })
        break
      case 'table': {
        flushRich()
        const width = Math.max(...tok.rows.map((r) => r.length))
        const table: TableBlock = {
          type: 'table',
          rows: tok.rows.map((r) => Array.from({ length: width }, (_, c) => tableCell(r[c] ?? ''))),
          column_settings: tok.align.map((a) => (a ? { align: a } : null)),
        }
        blocks.push(table)
        break
      }
    }
  }
  flushRich()
  return blocks
}

/** Replaces each markdown block with the blocks it renders as (stable block ids). */
export function expandMarkdown(blocks: KitBlock[]): KitBlock[] {
  if (!blocks.some((b) => b.type === 'markdown')) return blocks
  return blocks.flatMap((b, i): KitBlock[] => (b.type === 'markdown' ? markdownToBlocks(b.text).map((x, j) => ({ ...x, block_id: `${b.block_id ?? `md${i}`}-${j}` }) as KitBlock) : [b]))
}
