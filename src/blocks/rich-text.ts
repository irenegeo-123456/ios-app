import type { Inline, TextStyle } from '../lib/mrkdwn'

// Slack `rich_text` JSON (what apps, agents and the composer send), drawn with the live client's markup.
// Ground truth: the Sep 24 production bundle's rich-text renderer (RichTextRenderer and its elements, SUI
// rich_text_* renderables), reference/dom/blockkit-richtext.html (Block Kit Builder capture). Field names follow
// the API's input schemas (block-kit/input/elements/*.json).

export interface RtStyle extends TextStyle {
  underline?: boolean
  highlight?: boolean
  client_highlight?: boolean
  semantic_highlight?: boolean
  unlink?: boolean
}

export type RtTagColor = 'gray' | 'brown' | 'purple' | 'indigo' | 'blue' | 'green' | 'yellow' | 'orange' | 'red'

export type RtCitationDetails =
  | { citation_type: 'web'; display_name: string; title?: string; snippet?: string }
  | { citation_type: 'external'; app_name: string; app_icon_url: string }
  | { citation_type: 'file'; file_id: string; descriptor?: string }
  | { citation_type: 'message'; channel: string; message_ts: string }
  | { citation_type: 'memory'; memory_id: string }

export type RtInline =
  | { type: 'text'; text: string; style?: RtStyle }
  /** `truncated` is the host-name link slug Slack draws for a bare URL in a markdown block */
  | { type: 'link'; url: string; text?: string; style?: RtStyle; unsafe?: boolean; truncated?: boolean; from_llm?: boolean; is_slack_url?: boolean }
  | { type: 'emoji'; name: string; unicode?: string; skin_tone?: number; display_url?: string; display_alias?: string; display_team_id?: string; url?: string; style?: RtStyle }
  | { type: 'user'; user_id: string; style?: RtStyle; from_llm?: boolean }
  | { type: 'usergroup'; usergroup_id: string; style?: RtStyle }
  | { type: 'channel'; channel_id: string; tab_id?: string; style?: RtStyle; from_llm?: boolean }
  | { type: 'broadcast'; range: 'here' | 'channel' | 'everyone' | 'sf:accountteam' | 'sf:dealteam' | 'assistant:einstein'; style?: RtStyle }
  | { type: 'date'; timestamp: number; format: string; url?: string; fallback?: string; timezone?: string; style?: RtStyle }
  | { type: 'color'; value: string; style?: RtStyle }
  | { type: 'team'; team_id: string; style?: RtStyle }
  | { type: 'tag'; text: string; color?: RtTagColor; style?: RtStyle }
  | { type: 'citation'; text: string; url: string; index: number; details: RtCitationDetails; from_llm?: boolean; is_slack_url?: boolean }
  | { type: 'file'; file_id: string; text?: string; url?: string; style?: RtStyle; is_skill_invocation?: boolean }
  | { type: 'canvas'; file_id: string; text?: string; url?: string; label?: string; hide_title?: boolean; section_id?: string; style?: RtStyle; is_skill_invocation?: boolean }
  | { type: 'list_record'; file_id: string; record_id?: string; view_id?: string; text?: string; url?: string; style?: RtStyle }
  | { type: 'message_mention'; message_ts: string; channel_id: string; author_id?: string; thread_ts?: string; text?: string; url?: string; style?: RtStyle }
  | { type: 'workflow_mention'; workflow_id: string; function_trigger_id: string; text: string; url?: string; channel_id?: string; ts?: string; style?: RtStyle }
  | {
      type: 'attachment_mention'
      url: string
      text?: string
      app_id?: string
      entity_id?: string
      icon_url?: string
      icon_name?: string
      channel_id?: string
      ts?: string
      full_size_preview_enabled?: boolean
      reference_object_type?: string
      product_name?: string
      style?: RtStyle
    }
  | { type: 'work_object_mention'; entity_id: string; app_id: string; text: string; url: string; icon_url?: string; icon_name?: string; full_size_preview_enabled?: boolean; product_name?: string; style?: RtStyle }
  | { type: 'canvas_user_mention'; user_id: string; thread_id?: string; style?: RtStyle }
  | { type: 'workflowtoken'; id: string; data_type: string; property?: string; style?: RtStyle }

export interface RtSection {
  type: 'rich_text_section'
  elements: RtInline[]
  /** a checklist item's state */
  checked?: boolean
}
export interface RtList {
  type: 'rich_text_list'
  style: 'bullet' | 'ordered' | 'check'
  elements: RtSection[]
  indent?: number
  offset?: number
  start?: number
  border?: number
  /** the default state of a checklist's items */
  checked?: boolean
  /** a checklist (the newer spelling of `style: 'check'`) */
  checklist?: boolean
}
export interface RtQuote {
  type: 'rich_text_quote'
  elements: RtInline[]
  border?: number
}
export interface RtPre {
  type: 'rich_text_preformatted'
  elements: RtInline[]
  border?: number
  /** a code block with a language gets Slack's highlighted code-block chrome */
  language?: string
}
export interface RtHeader {
  type: 'rich_text_header'
  elements: RtInline[]
  level?: 1 | 2 | 3
}
export interface RtDivider {
  type: 'rich_text_divider'
}
/** Everything a `rich_text` block's `elements` may hold. */
export type RtElement = RtSection | RtList | RtQuote | RtPre | RtHeader | RtDivider
/** The same as RtElement (the name from before dividers joined it). */
export type RtBlockElement = RtElement

/** Any element as it arrives: future or client-only types carry a `fallback`, `text` or `url` (FALLBACK.md). */
type LooseElement = { type?: string; text?: string; url?: string; fallback?: unknown; elements?: unknown; [k: string]: unknown }

/**
 * rich_text JSON inline elements → the shared inline model (so messages and blocks draw identically).
 * `raw` keeps newlines as text (preformatted blocks, like Slack's rawLineBreaks). Types the shared model
 * doesn't know are skipped: `RichInlines` draws them.
 */
export function toInlines(els: RtInline[] = [], raw = false): Inline[] {
  const out: Inline[] = []
  const style = (s?: RtStyle): TextStyle | undefined => (s ? { bold: s.bold, italic: s.italic, strike: s.strike, code: s.code } : undefined)
  els.forEach((el, index) => {
    switch (el.type) {
      case 'text': {
        if (raw) {
          if (el.text) out.push({ t: 'text', v: el.text, style: style(el.style) })
          break
        }
        for (const piece of textPieces(el.text, index === 0, !!el.style?.code)) {
          if (piece === BR) out.push({ t: 'br' })
          else if (piece === PBR) out.push({ t: 'pbr' })
          else if (piece === '\t') out.push({ t: 'tab' })
          else out.push({ t: 'text', v: piece, style: style(el.style) })
        }
        break
      }
      case 'link':
        out.push({ t: 'link', url: el.url, label: el.text || undefined, style: style(el.style), truncated: el.truncated })
        break
      case 'emoji':
        out.push({ t: 'emoji', name: el.skin_tone && el.skin_tone > 1 ? `${el.name}::skin-tone-${el.skin_tone}` : el.name })
        break
      case 'user':
        out.push({ t: 'user', id: el.user_id })
        break
      case 'usergroup':
        out.push({ t: 'usergroup', id: el.usergroup_id })
        break
      case 'channel':
        out.push({ t: 'channel', id: el.channel_id })
        break
      case 'broadcast':
        out.push({ t: 'broadcast', range: el.range })
        break
      case 'date':
        out.push({ t: 'date', ts: el.timestamp, format: el.format, url: el.url, fallback: el.fallback })
        break
      case 'color':
        out.push({ t: 'color', value: el.value })
        break
    }
  })
  return out
}

// ------------------------------------------------------------------------------------------------
// Text (rich-text-elements/text.tsx BaseText + utility/with-formatting-styles.tsx)

const BR = '\u0000br'
const PBR = '\u0000pbr'

/**
 * Slack's newline rule: a run of n ≥ 2 newlines is n - 1 paragraph breaks, a lone newline a line break, and a
 * leading newline at the start of a section opens with a paragraph break. Tabs outside code become their own
 * pieces (convert-tabs.ts), which BaseText draws as `c-mrkdwn__tab`.
 */
function textPieces(text: string, firstInSection: boolean, code: boolean): string[] {
  const out: string[] = []
  const src = firstInSection && text.startsWith('\n') ? `\n${text}` : text
  for (const part of src.split(/((?:\n[ \t\u00a0]*)+\n|\n)/)) {
    if (!part) continue
    if (part === '\n') out.push(BR)
    else if (part.startsWith('\n')) for (let k = 2; k < part.split('\n').length; k++) out.push(PBR)
    else if (code) out.push(part)
    else for (const run of part.split(/(\t)/)) if (run) out.push(run)
  }
  return out
}
