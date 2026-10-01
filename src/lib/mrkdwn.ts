// Slack mrkdwn, parsed the way Slack parses it: Slack's own tokenizer (TSF, vendored in ./vendor/TSF.slim.source.js and
// checked token-for-token against the production bundle) and its token → tree step (tokensToMessageContent, ported in
// ./vendor/tokens-to-message-content.ts). On top of that tree this module keeps the kit's two shapes:
//
//   parseMrkdwn(text)  → Block[]   a message as rich text: sections, lists, code blocks and quotes (.p-rich_text_block)
//   parseInline(text)  → Inline[]  styled runs for one-off text (Block Kit mrkdwn, attachments, previews…)
//   mrkdwnContent(text)            Slack's exact tree (ProcessedToken[]), for renderers that mirror Slack's legacy
//                                  Mrkdwn component element for element (text stays HTML-escaped; unescapeEntities it)
//
// Kit text is mrkdwn "as typed": `&`, `<` and `>` may be raw, and bare URLs are linked (Slack's server wraps them in
// `<…>` when a message is posted). `\*` `\_` `\~` `` \` `` `\:` `\<` show the character literally (a kit-only escape).
// Lists (lines starting "• ", "- ", "* " or "1. ") are the composer's list shortcut; TSF itself has no lists.

import { TSF } from './vendor/TSF.slim.source.js'
import type { TsfMode } from './vendor/TSF.slim.source.js'
import { tokensToMessageContent, TokenTypes, type ProcessedToken } from './vendor/tokens-to-message-content'
import { isHtmlEntity, unescapeEntities } from './vendor/unescape-entities'

export { unescapeEntities, TokenTypes }
export type { ProcessedToken, TsfMode }

export interface TextStyle {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
}

export type Inline =
  | { t: 'text'; v: string; style?: TextStyle }
  | { t: 'emoji'; name: string }
  /** `label` is the `<@U123|name>` fallback name, if the text had one */
  | { t: 'user'; id: string; label?: string }
  | { t: 'channel'; id: string; name?: string }
  | { t: 'link'; url: string; label?: string; style?: TextStyle; truncated?: boolean }
  | { t: 'br' }
  /** a blank line: Slack's 8px `c-mrkdwn__br` paragraph break */
  | { t: 'pbr' }
  | { t: 'tab' }
  /** <!here> <!channel> <!everyone> <!group> */
  | { t: 'broadcast'; range: string }
  /** <!subteam^S123|@handle>; `label` is the fallback handle */
  | { t: 'usergroup'; id: string; label?: string }
  /** <!date^ts^format^link|fallback> */
  | { t: 'date'; ts: number; format: string; url?: string; fallback?: string }
  /** a hex color (`#1D9BD1`): the value and a swatch */
  | { t: 'color'; value: string }

export type Block =
  | { t: 'section'; els: Inline[] }
  | { t: 'list'; ordered: boolean; items: Inline[][] }
  | { t: 'pre'; text: string }
  | { t: 'quote'; els: Inline[] }

// ------------------------------------------------------------------------------------------------
// Kit text → the text Slack's API would carry

/** Kit-only backslash escapes → private-use stand-ins that TSF leaves alone (restored in the output). */
const ESCAPED: Record<string, string> = { '*': '\uE0F1', _: '\uE0F2', '~': '\uE0F3', '`': '\uE0F4', ':': '\uE0F5' }
/** A typed tab, kept through TSF (which would make it four hard spaces) when rich text wants it back. */
const TAB = '\uE0F7'
const UNESCAPED: Record<string, string> = { ...Object.fromEntries(Object.entries(ESCAPED).map(([k, v]) => [v, k])), [TAB]: '\t' }
const ESCAPED_RX = /[\uE0F1-\uE0F5\uE0F7]/g
const restore = (s: string) => (s ? s.replace(ESCAPED_RX, (c) => UNESCAPED[c]) : s)

/** `<@U1>` `<#C1|name>` `<!here>` `<https://…|label>` `<mailto:…>`: everything else in angle brackets is text. */
const CONTROL_RX = /<(?:[@#!][^<>\n]*|(?:[a-z][a-z0-9+.-]*:|www\.)[^<>\s|]*(?:\|[^<>\n]*)?)>/gi
/** Code spans and blocks, where bare URLs stay text. */
const CODE_RX = /```[\s\S]*?```|`[^`\n]+`/g
/** A bare URL (the kit's own rule, as before): http(s)://…, not ending in punctuation. */
const URL_RX = /(^|[^\w/])(https?:\/\/[^\s<>]*[^\s<>.,:;!?)"'\uE0F1-\uE0F5])/gi

const escapeAmp = (s: string) => s.replace(/&#?[a-z0-9]+;|&/gi, (m) => (m === '&' || !isHtmlEntity(m) ? m.replace('&', '&amp;') : m))
const escapeText = (s: string) => escapeAmp(s).replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Kit mrkdwn → Slack API text: raw `&` `<` `>` escaped (existing entities and `<…>` control sequences kept), bare URLs
 * wrapped in `<…>` outside code, and the kit's backslash escapes swapped for stand-ins.
 */
export function toApiText(text: string, { linkify = true, keepTabs = false }: { linkify?: boolean; keepTabs?: boolean } = {}): string {
  let src = text.replace(/\\([*_~`:<])/g, (_m, c: string) => (c === '<' ? '\uE0F6' : ESCAPED[c]))
  if (keepTabs) src = src.replace(/\t/g, TAB)
  const code: [number, number][] = []
  if (linkify) for (const m of src.matchAll(CODE_RX)) code.push([m.index, m.index + m[0].length])
  const inCode = (i: number) => code.some(([a, b]) => i >= a && i < b)
  let out = ''
  let last = 0
  const plain = (s: string, offset: number) => {
    if (!linkify) return escapeText(s)
    let res = ''
    let at = 0
    for (const m of s.matchAll(URL_RX)) {
      const start = m.index + m[1].length
      if (inCode(offset + start)) continue
      res += escapeText(s.slice(at, start)) + `<${escapeAmp(m[2])}>`
      at = start + m[2].length
    }
    return res + escapeText(s.slice(at))
  }
  for (const m of src.matchAll(CONTROL_RX)) {
    out += plain(src.slice(last, m.index), last) + escapeAmp(m[0])
    last = m.index + m[0].length
  }
  out += plain(src.slice(last), last)
  return out.replace(/\uE0F6/g, '&lt;')
}

// ------------------------------------------------------------------------------------------------
// TSF

export interface MrkdwnOptions {
  /** TSF mode; NORMAL (default) formats, NOMRKDWN only links and emoji (Slack's `noSpecials`) */
  mode?: TsfMode
  /** mark emoji-only text as jumbomoji (default true, like Slack's Mrkdwn component) */
  jumbomoji?: boolean
  /** link bare URLs (default true) */
  linkify?: boolean
  /** keep typed tabs as tabs (rich text) instead of TSF's four hard spaces (legacy) */
  keepTabs?: boolean
}

const HIGHLIGHT_CHARS_RX = /\uE000|\uE001/

/** Slack's TSF tokens for kit text, the way Slack's Mrkdwn component asks for them. */
export function mrkdwnTokens(text: string, { mode = 'NORMAL', jumbomoji = true, linkify = true, keepTabs = false }: MrkdwnOptions = {}): string[] {
  let tokens = TSF.getTokensArray(toApiText(text, { linkify, keepTabs }), mode, { jumbomoji, allow_intra_word_formatting: true })
  // Search highlight markers (\uE000 … \uE001) become their own tokens, as in Slack's Mrkdwn component.
  if (HIGHLIGHT_CHARS_RX.test(text))
    tokens = tokens.flatMap((str) =>
      str
        .replace(/\uE000/g, '<HIGHLIGHT:START>')
        .replace(/\uE001/g, '<HIGHLIGHT:END>')
        .split(/(<HIGHLIGHT:START>|<HIGHLIGHT:END>)/g)
        .filter(Boolean),
    )
  return tokens
}

const cache = new Map<string, unknown>()
function cached<T>(key: string, make: () => T): T {
  const hit = cache.get(key)
  if (hit !== undefined) return hit as T
  const value = make()
  if (cache.size > 1500) cache.delete(cache.keys().next().value!)
  cache.set(key, value)
  return value
}

/** Restores the kit's escaped characters and joins two-tone skin tones (`:handshake::skin-tone-2-4:`). */
function tidy(nodes: ProcessedToken[]): ProcessedToken[] {
  const out: ProcessedToken[] = []
  for (const n of nodes) {
    const prev = out[out.length - 1]
    if ((n.type === 'emoji' || n.type === 'jumbomoji') && /^:skin-tone-[2-6]-[2-6]:$/.test(n.name ?? '') && prev?.type === n.type && prev.name && !prev.name.includes('::')) {
      out[out.length - 1] = { ...prev, name: `${prev.name}${n.name!.slice(0, -1)}` }
      continue
    }
    const m: ProcessedToken = { ...n }
    if (m.text !== undefined) m.text = restore(m.text)
    if (m.url !== undefined) m.url = restore(m.url)
    if (m.contents) m.contents = tidy(m.contents)
    out.push(m)
  }
  return out
}

/**
 * Slack's message-content tree for kit text (TSF → tokensToMessageContent), exactly what Slack's Mrkdwn component
 * renders. Text nodes are still HTML-escaped as TSF leaves them: pass them through `unescapeEntities` to display.
 * Cached; treat the result as read-only.
 */
export function mrkdwnContent(text: string, opts: MrkdwnOptions = {}): ProcessedToken[] {
  return cached(`c${opts.mode ?? ''}${opts.jumbomoji ?? ''}${opts.linkify ?? ''}${opts.keepTabs ?? ''}\u0001${text}`, () => tidy(tokensToMessageContent(mrkdwnTokens(text, opts))))
}

// ------------------------------------------------------------------------------------------------
// Tree → Inline runs

type Flavor = 'legacy' | 'rich'

const plainText = (nodes: ProcessedToken[] = []): string =>
  nodes
    .map((n) => {
      if (n.text !== undefined) return unescapeEntities(n.text)
      if (n.type === 'emoji' || n.type === 'jumbomoji') return n.name ?? ''
      if (n.type === 'space_hard') return '\u00A0'
      if (n.type === 'line_break') return '\n'
      if (n.type === 'paragraph_break') return '\n\n'
      if (n.type === 'member') return `<@${n.id}>`
      if (n.type === 'channel') return `#${n.name ?? n.id}`
      if (n.type === 'command') return n.data?.label ?? n.fallback ?? ''
      if (n.contents) return plainText(n.contents)
      return ''
    })
    .join('')

/** The one style every run of a link label shares (`<url|*label*>`), if any. */
function uniformStyle(nodes: ProcessedToken[], style: TextStyle): TextStyle {
  const one = nodes.length === 1 ? nodes[0] : undefined
  const key = one && ({ bold: 'bold', italic: 'italic', strike: 'strike', code: 'code' } as Record<string, keyof TextStyle>)[one.type ?? '']
  return key ? uniformStyle(one!.contents ?? [], { ...style, [key]: true }) : style
}

function command(n: ProcessedToken, style: TextStyle): Inline {
  const data = n.data ?? { type: 'unknown' }
  switch (data.type) {
    case 'here':
    case 'channel':
    case 'everyone':
    case 'group':
      return { t: 'broadcast', range: data.type }
    case 'subteam':
      return { t: 'usergroup', id: data.id ?? '', label: data.label }
    case 'date':
      if (!data.ts || !data.format) return { t: 'text', v: unescapeEntities(data.label ?? ''), style: { ...style } }
      return { t: 'date', ts: Number(data.ts), format: unescapeEntities(data.format), url: data.link && unescapeEntities(data.link), fallback: data.label && unescapeEntities(data.label) }
    default: {
      // Salesforce fields and unknown commands show their label, or the command itself.
      const body = unescapeEntities(n.fallback ?? '')
      const bar = body.indexOf('|')
      return { t: 'text', v: bar >= 0 ? body.slice(bar + 1) : `<!${body}>`, style: { ...style } }
    }
  }
}

function toInlines(nodes: ProcessedToken[], style: TextStyle, flavor: Flavor, out: Inline[] = []): Inline[] {
  const text = (v: string, st: TextStyle = style) => {
    if (!v) return
    const prev = out[out.length - 1]
    if (prev?.t === 'text' && sameStyle(prev.style, st)) prev.v += v
    else out.push({ t: 'text', v, style: { ...st } })
  }
  // A code block or quote met in inline text sits on its own line(s), as in Slack's legacy rendering.
  const isBreak = (el?: Inline) => el?.t === 'br' || el?.t === 'pbr'
  let afterBlock = false
  const lineBefore = () => {
    if (out.length && !isBreak(out[out.length - 1])) out.push({ t: 'br' })
  }
  for (const n of nodes) {
    if (afterBlock && n.type !== 'line_break' && n.type !== 'paragraph_break') lineBefore()
    afterBlock = false
    if (n.text !== undefined) {
      text(unescapeEntities(n.text))
      continue
    }
    switch (n.type) {
      case 'bold':
      case 'italic':
      case 'strike':
      case 'code':
        toInlines(n.contents ?? [], { ...style, [n.type]: true }, flavor, out)
        break
      case 'pre':
        // A code block inside inline text (legacy Slack draws a <pre>): its text, in code style.
        lineBefore()
        preText(n)
          .split('\n')
          .forEach((line, i) => {
            if (i) out.push({ t: 'br' })
            text(line, { ...style, code: true })
          })
        afterBlock = true
        break
      case 'quote':
        lineBefore()
        out.push(...quoteEls(n, flavor, style))
        afterBlock = true
        break
      case 'highlight':
        toInlines(n.contents ?? [], style, flavor, out)
        break
      case 'link': {
        const url = unescapeEntities(n.url ?? '')
        const label = plainText(n.contents)
        const st = uniformStyle(n.contents ?? [], style)
        out.push({ t: 'link', url, ...(label && label !== url ? { label } : {}), ...(Object.keys(st).length ? { style: { ...st } } : {}) })
        break
      }
      case 'command':
        out.push(command(n, style))
        break
      case 'member':
        out.push({ t: 'user', id: n.id ?? '', ...(n.fallback ? { label: unescapeEntities(n.fallback) } : {}) })
        break
      case 'channel':
        out.push({ t: 'channel', id: n.id ?? '', name: n.name && unescapeEntities(n.name) })
        break
      case 'emoji':
      case 'jumbomoji':
        out.push({ t: 'emoji', name: (n.name ?? '').replace(/^:|:$/g, '') })
        break
      case 'hex': {
        // TSF leaves the hex in the text and adds a swatch; the kit's `color` run draws both.
        const value = n.color ?? ''
        const prev = out[out.length - 1]
        if (prev?.t === 'text' && prev.v.endsWith(value)) {
          prev.v = prev.v.slice(0, -value.length)
          if (!prev.v) out.pop()
        }
        // The composer turns typed hex codes into upper-case `color` elements; legacy mrkdwn keeps them as typed.
        out.push({ t: 'color', value: flavor === 'rich' ? value.toUpperCase() : value })
        break
      }
      case 'line_break':
        out.push({ t: 'br' })
        break
      case 'paragraph_break':
        out.push({ t: 'pbr' })
        break
      case 'space_hard':
        // Legacy mrkdwn draws a no-break space; rich text keeps the space that was typed.
        text(flavor === 'rich' ? ' ' : '\u00A0')
        break
      case 'quote_prefix':
      case 'long_quote_prefix':
        break
      default:
        text(unescapeEntities(n.token ?? ''))
    }
  }
  return out
}

const sameStyle = (a: TextStyle = {}, b: TextStyle = {}) => !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.strike === !!b.strike && !!a.code === !!b.code

/** A code block's text as typed: breaks and hard spaces back to characters, links and mentions as written. */
function preText(n: ProcessedToken): string {
  const raw = (nodes: ProcessedToken[] = []): string =>
    nodes
      .map((c) => {
        if (c.text !== undefined) return unescapeEntities(c.text)
        switch (c.type) {
          case 'line_break':
            return '\n'
          case 'paragraph_break':
            return '\n\n'
          case 'space_hard':
            return ' '
          case 'link': {
            const url = unescapeEntities(c.url ?? '')
            const label = raw(c.contents)
            return label && label !== url ? `<${url}|${label}>` : `<${url}>`
          }
          case 'member':
            return `<@${c.id}${c.fallback ? `|${c.fallback}` : ''}>`
          case 'channel':
            return `<#${c.id}${c.name ? `|${c.name}` : ''}>`
          case 'command':
            return unescapeEntities(c.token ?? '')
          case 'emoji':
          case 'jumbomoji':
            return c.name ?? ''
          case 'hex':
            return ''
          default:
            return c.contents ? raw(c.contents) : unescapeEntities(c.token ?? '')
        }
      })
      .join('')
  return raw(n.contents).replace(/\n$/, '')
}

/**
 * Inline mrkdwn as styled runs, parsed by Slack's TSF: *bold* _italic_ ~strike~ `code`, links, mentions, broadcasts,
 * user groups, dates, :emoji:, hex colors, line breaks and (blank line) paragraph breaks. Block constructs flatten:
 * a code block becomes code-styled text and a quote its text. `style` is added to every run. `paragraphs` is kept for
 * compatibility: TSF always makes a blank line a paragraph break.
 */
export function parseInline(src: string, style: TextStyle = {}, paragraphs = false): Inline[] {
  void paragraphs
  const els = cached(`i\u0001${src}`, () => {
    if (!src.trim()) return src ? [{ t: 'text', v: src, style: {} } as Inline] : []
    const out = toInlines(mrkdwnContent(src), {}, 'legacy')
    // TSF trims its input, but callers build lines out of several pieces ("*Priya* commented on " + a link): keep the
    // spaces at either end.
    const lead = /^[ \t]+/.exec(src)?.[0]
    const trail = /[ \t]+$/.exec(src)?.[0]
    const plain = (el?: Inline) => el?.t === 'text' && !Object.keys(el.style ?? {}).length
    if (lead) {
      if (plain(out[0])) (out[0] as { v: string }).v = lead + (out[0] as { v: string }).v
      else out.unshift({ t: 'text', v: lead, style: {} })
    }
    if (trail) {
      const last = out[out.length - 1]
      if (plain(last)) (last as { v: string }).v += trail
      else out.push({ t: 'text', v: trail, style: {} })
    }
    return out
  })
  if (!Object.keys(style).length) return els
  return els.map((el) => (el.t === 'text' || el.t === 'link' ? { ...el, style: { ...style, ...el.style } } : el))
}

// ------------------------------------------------------------------------------------------------
// Tree → rich text blocks

/** Joins lines of runs with Slack's rich-text newline rule: one newline is a line break, n ≥ 2 are n - 1 paragraph breaks. */
function joinLines(lines: Inline[][]): Inline[] {
  const blank = (line: Inline[]) => line.every((el) => el.t === 'text' && !el.v.trim())
  const out: Inline[] = []
  let newlines = 0
  lines.forEach((line, i) => {
    if (i > 0) newlines++
    if (blank(line) && i < lines.length - 1) return
    if (blank(line) && i > 0) {
      // trailing newlines
      if (newlines) out.push(...breaks(newlines))
      return
    }
    if (newlines) out.push(...breaks(newlines))
    newlines = 0
    out.push(...line)
  })
  return out
}
const breaks = (n: number): Inline[] => (n === 1 ? [{ t: 'br' }] : Array.from({ length: n - 1 }, () => ({ t: 'pbr' }) as Inline))

const BULLET_RX = /^[•\-*] /
const ORDERED_RX = /^\d+\. /

/** A line's list marker, if the line starts with one (the composer's list shortcut). */
function listMarker(line: ProcessedToken[]): { ordered: boolean; marker: string } | null {
  const first = line[0]
  if (first?.text === undefined) return null
  const text = unescapeEntities(first.text)
  const b = BULLET_RX.exec(text)
  if (b) return { ordered: false, marker: b[0] }
  const o = ORDERED_RX.exec(text)
  return o ? { ordered: true, marker: o[0] } : null
}

function stripMarker(line: ProcessedToken[], marker: string): ProcessedToken[] {
  const [first, ...rest] = line
  const text = unescapeEntities(first.text!).slice(marker.length)
  return text ? [{ text }, ...rest] : rest
}

/** Lines of top-level nodes → sections and lists, the way the kit has always split them. */
function regionBlocks(lines: ProcessedToken[][], blocks: Block[]) {
  let para: ProcessedToken[][] = []
  const flushPara = () => {
    if (para.length) blocks.push({ t: 'section', els: joinLines(para.map((l) => toInlines(l, {}, 'rich'))) })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const m = listMarker(lines[i])
    if (!m) {
      para.push(lines[i])
      continue
    }
    flushPara()
    const items: Inline[][] = []
    while (i < lines.length) {
      const mi = listMarker(lines[i])
      if (!mi || mi.ordered !== m.ordered) break
      items.push(toInlines(stripMarker(lines[i], mi.marker), {}, 'rich'))
      i++
    }
    i--
    blocks.push({ t: 'list', ordered: m.ordered, items })
  }
  flushPara()
}

/**
 * How many newlines a break token stands for. TSF turns one newline into <LINE:BREAK> and a run of n ≥ 2 into n - 1
 * <PARA:BREAK>s, so the first paragraph break of a run is two newlines and each one after it is one more.
 */
const newlinesFor = (n: ProcessedToken, prev?: ProcessedToken) => (n.type === 'line_break' ? 1 : prev?.type === 'paragraph_break' ? 1 : 2)

/** A quote's runs: prefixes dropped, one space after each `>` trimmed, lines joined like a section. */
function quoteEls(n: ProcessedToken, flavor: Flavor = 'rich', style: TextStyle = {}): Inline[] {
  const lines: ProcessedToken[][] = [[]]
  let prev: ProcessedToken | undefined
  for (const c of n.contents ?? []) {
    const before = prev
    prev = c
    if (c.type === 'line_break' || c.type === 'paragraph_break') for (let k = newlinesFor(c, before); k > 0; k--) lines.push([])
    else if (c.type === 'quote_prefix' || c.type === 'long_quote_prefix') continue
    else {
      const line = lines[lines.length - 1]
      if (!line.length && c.text !== undefined && c.text.startsWith(' ')) {
        if (c.text.length > 1) line.push({ text: c.text.slice(1) })
      } else line.push(c)
    }
  }
  return joinLines(lines.map((l) => toInlines(l, style, flavor)))
}

function blocksOf(text: string): Block[] {
  const blocks: Block[] = []
  let lines: ProcessedToken[][] = [[]]
  let afterBlock = false
  const flushRegion = () => {
    // The line a code block or quote starts on isn't a line of the region before it.
    if (lines.length > 1 && !lines[lines.length - 1].length) lines.pop()
    if (lines.length > 1 || lines[0].length) regionBlocks(lines, blocks)
    lines = [[]]
  }
  let prev: ProcessedToken | undefined
  for (const n of mrkdwnContent(text, { keepTabs: true })) {
    const before = prev
    prev = n
    if (n.type === 'pre' || n.type === 'quote') {
      flushRegion()
      blocks.push(n.type === 'pre' ? { t: 'pre', text: preText(n) } : { t: 'quote', els: quoteEls(n) })
      afterBlock = true
      continue
    }
    if (n.type === 'line_break' || n.type === 'paragraph_break') {
      let count = newlinesFor(n, before)
      // The first newline after a code block or quote only ends that block's line.
      if (afterBlock && lines.length === 1 && !lines[0].length) count--
      for (let k = 0; k < count; k++) lines.push([])
      if (count) afterBlock = false
      continue
    }
    afterBlock = false
    lines[lines.length - 1].push(n)
  }
  flushRegion()
  return blocks
}

/** Parses a full message into rich text blocks (Slack's TSF for everything inline; the kit's list shortcut). */
export function parseMrkdwn(src: string): Block[] {
  return cached(`m\u0001${src}`, () => blocksOf(src))
}

/** True when a message is only emoji (≤ 23, like Slack) — rendered large ("jumbomoji"). */
export function isJumbomoji(blocks: Block[]): boolean {
  if (blocks.length !== 1 || blocks[0].t !== 'section') return false
  const els = blocks[0].els.filter((e) => !(e.t === 'text' && !e.v.trim()))
  return els.length > 0 && els.length <= 23 && els.every((e) => e.t === 'emoji')
}
