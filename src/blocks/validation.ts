import { kitBlockId } from './ids'
import type { InputBlock, KitBlock, RichTextBlockKit } from './types'
import type { StateValue, ViewStateValues } from './views'

// Client-side validation of input blocks, as Slack iOS does it (spec blockkit.md §6): every element validates its
// own value (Modules/Data/BlockKitDataModels/Implementation/BlockElements/*BlockElement.swift `validationStatus()`),
// text rules come from BlockKitTextValidator.swift, the strings from BlockElementValidationStatus.swift:33-40 and
// localized_strings.yaml. Text inputs validate on blur / Done, every input on Submit (modals only enforce
// `optional: false`: ModernAppViewInteractor.swift:779-782).

/** `this_field_is_required` (yaml:19965) */
export const REQUIRED_TEXT = 'This field is required.'
/** `too_many_items_selected` (yaml:20409) */
export const TOO_MANY_TEXT = 'Too many items selected.'
/** `please_enter_at_least_x_characters` (yaml:14046) */
export const minCharsText = (n: number) => `Please enter at least ${n} characters.`
/** `you_cant_enter_more_than_x_characters` (yaml:22741) */
export const maxCharsText = (n: number) => `You can’t enter more than ${n} characters.`
/** `minimum_number_is_x` (yaml:11635) */
export const minNumberText = (v: string) => `Number cannot be lower than ${v}.`
/** `maximum_number_is_x` (yaml:11104) */
export const maxNumberText = (v: string) => `Number cannot be greater than ${v}.`
/** `invalid_email_string` (yaml:9121) */
export const INVALID_EMAIL_TEXT = 'You must enter a valid email address.'
/** `invalid_url_string` (yaml:9144) */
export const INVALID_URL_TEXT = 'You must enter a valid URL.'

const blank = (s: string | null | undefined) => !s || !s.trim()

/** The text of a rich_text value (what counts as "entered"). */
export function richTextPlain(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const v = value as { type?: string; text?: unknown; name?: string; url?: string; elements?: unknown[]; user_id?: string; channel_id?: string }
  if (typeof v.text === 'string' && (v.type === 'text' || v.type === 'link' || v.type === 'rich_text')) return v.text || (v.type === 'link' ? (v.url ?? '') : '')
  if (v.type === 'link') return v.url ?? ''
  if (v.type === 'emoji') return `:${v.name}:`
  if (v.type === 'user') return `@${v.user_id}`
  if (v.type === 'channel') return `#${v.channel_id}`
  const inner = (v.elements ?? []).map(richTextPlain)
  return v.type === 'rich_text' || v.type === 'rich_text_list' ? inner.join('\n') : inner.join('')
}

/** EmailAddressUtility.isValidEmailAddress: local@domain.tld */
export const isValidEmail = (s: string) => /^[A-Z0-9a-z._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s)

/** BlockKitTextValidator.isValid(uriString:): a URL whose host has at least two non-empty dot-separated parts. */
function hasHost(s: string): boolean {
  try {
    const host = new URL(s).host
    const parts = host.split('.')
    return parts.length > 1 && parts.every((p) => p.length > 0)
  } catch {
    return false
  }
}
/** URLs are accepted without a scheme when "https://" makes them valid (BlockKitTextValidator.swift validateUrlFormat). */
export const isValidUrl = (s: string) => hasHost(s) || hasHost(`https://${s}`)

/** BlockKitInputValidator.sanitizeNumber: digits, one leading "-", one "." when decimals are allowed. */
export function sanitizeNumber(s: string, allowDecimal: boolean): string {
  const allowed = new Set('0123456789-' + (allowDecimal ? '.' : ''))
  let out = [...s].filter((c) => allowed.has(c)).join('')
  if (!out) return out
  out = out[0] + out.slice(1).replace(/-/g, '')
  if (allowDecimal) {
    let seen = false
    out = [...out].filter((c) => (c === '.' ? (seen ? false : (seen = true)) : true)).join('')
  }
  return out
}

/** How many items a select-type value holds. */
function itemCount(v: StateValue | null | undefined): number {
  if (!v) return 0
  switch (v.type) {
    case 'static_select':
    case 'external_select':
    case 'radio_buttons':
      return v.selected_option ? 1 : 0
    case 'multi_static_select':
    case 'multi_external_select':
    case 'checkboxes':
      return v.selected_options.length
    case 'users_select':
      return v.selected_user ? 1 : 0
    case 'multi_users_select':
      return v.selected_users.length
    case 'channels_select':
      return v.selected_channel ? 1 : 0
    case 'conversations_select':
      return v.selected_conversation ? 1 : 0
    case 'multi_channels_select':
      return v.selected_channels.length
    case 'multi_conversations_select':
      return v.selected_conversations.length
    default:
      return 0
  }
}

/**
 * The first problem with an element's value, worded like iOS, or null. `required` is the input block's
 * `!optional` on surfaces that enforce it (modals).
 */
export function elementError(el: InputBlock['element'], v: StateValue | null | undefined, required: boolean): string | null {
  const e = el as { min_length?: number; max_length?: number; min_value?: string; max_value?: string; max_selected_items?: number }
  switch (el.type) {
    case 'plain_text_input': {
      const text = v && 'value' in v ? (v.value ?? '') : ''
      if (blank(text)) return required ? REQUIRED_TEXT : null
      const n = [...text.trim()].length
      if ((e.min_length ?? 0) > 0 && n < e.min_length!) return minCharsText(e.min_length!)
      if ((e.max_length ?? 0) > 0 && n > e.max_length!) return maxCharsText(e.max_length!)
      return null
    }
    case 'number_input': {
      const text = v && 'value' in v ? (v.value ?? '') : ''
      if (blank(text)) return required ? REQUIRED_TEXT : null
      const n = Number(text.trim())
      if (!Number.isFinite(n)) return null
      const min = e.min_value !== undefined && Number.isFinite(Number(e.min_value)) ? Number(e.min_value) : -Infinity
      const max = e.max_value !== undefined && Number.isFinite(Number(e.max_value)) ? Number(e.max_value) : Infinity
      if (n < min) return minNumberText(e.min_value ?? '')
      if (n > max) return maxNumberText(e.max_value ?? '')
      return null
    }
    case 'email_text_input': {
      const text = v && 'value' in v ? (v.value ?? '') : ''
      if (blank(text)) return required ? REQUIRED_TEXT : null
      return isValidEmail(text.trim()) ? null : INVALID_EMAIL_TEXT
    }
    case 'url_text_input': {
      const text = v && 'value' in v ? (v.value ?? '') : ''
      if (blank(text)) return required ? REQUIRED_TEXT : null
      return isValidUrl(text.trim()) ? null : INVALID_URL_TEXT
    }
    case 'rich_text_input': {
      const rich = v?.type === 'rich_text_input' ? v.rich_text_value : null
      return !rich || blank(richTextPlain(rich as RichTextBlockKit)) ? (required ? REQUIRED_TEXT : null) : null
    }
    case 'datepicker':
      return v?.type === 'datepicker' && v.selected_date ? null : required ? REQUIRED_TEXT : null
    case 'timepicker':
      return v?.type === 'timepicker' && v.selected_time ? null : required ? REQUIRED_TEXT : null
    case 'datetimepicker':
      return v?.type === 'datetimepicker' && v.selected_date_time ? null : required ? REQUIRED_TEXT : null
    case 'file_input':
      return v?.type === 'file_input' && v.files.length ? null : required ? REQUIRED_TEXT : null
    default: {
      const n = itemCount(v)
      if (e.max_selected_items !== undefined && n > e.max_selected_items) return TOO_MANY_TEXT
      if (n === 0 && required) return REQUIRED_TEXT
      return null
    }
  }
}

/**
 * Every input's error in a list of blocks (block_id → message): what a modal checks on Submit. `enforceRequired` is
 * false on the App Home, where `optional: false` isn't enforced.
 */
export function validateInputs(blocks: KitBlock[], values: ViewStateValues, enforceRequired = true): Record<string, string> {
  const errors: Record<string, string> = {}
  blocks.forEach((b, i) => {
    if (b.type !== 'input' || !b.element) return
    const id = kitBlockId(b, i)
    const error = elementError(b.element, values[id]?.[b.element.action_id], enforceRequired && !b.optional)
    if (error) errors[id] = error
  })
  return errors
}
