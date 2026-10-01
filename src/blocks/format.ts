import type { Fixture } from '../data/types'
import type { InputBlock, InteractiveElement, OptionGroupObject, OptionObject, TextObject } from './types'
import type { StateValue } from './views'

// The strings Slack iOS shows for elements: select and picker labels, placeholders and date / time formats
// (spec blockkit.md §4.3–4.8; converters in Modules/Unlayered/Services/BlockKitPresentation/Implementation/Elements/).
// Strings are localized_strings.yaml's (key noted), dates the en-US DateFormatter styles iOS uses.

/** `more` (yaml:11693): the overflow button in a section */
export const MORE = 'More'
/** `more_options` (yaml:11708): the overflow button anywhere else */
export const MORE_OPTIONS = 'More Options'
/** `choose_an_option` (yaml:3825): the overflow sheet */
export const CHOOSE_AN_OPTION = 'Choose an option…'
/** `pick_an_option` / `pick_your_options` (yaml:13914, 13917) */
export const PICK_AN_OPTION = 'Pick an option'
export const PICK_YOUR_OPTIONS = 'Pick your options'
/** `picker_select` (yaml:13920) */
export const PICKER_SELECT = 'Select'
/** `write_something` (yaml:22391) and the other text input placeholders (BKSimpleTextInputView+PresentationObject.swift:113-208) */
export const TEXT_PLACEHOLDERS: Record<string, string> = {
  plain_text_input: 'Write something',
  number_input: 'Enter a number', // enter_a_number (yaml:5881)
  email_text_input: 'Enter an email', // enter_an_email (yaml:5891)
  url_text_input: 'Enter a URL', // enter_a_url (yaml:5884)
  rich_text_input: 'Write something',
}
/** `plain_text_input_done_button_hint` (yaml:14006) */
export const DONE_HINT = 'Press ‘done’ when you’re finished.'
/** `optional_in_brackets` (yaml:13372) */
export const OPTIONAL = ' (optional)'

export const textOf = (t: TextObject | string | undefined): string => (t === undefined ? '' : typeof t === 'string' ? t : (t.text ?? ''))

/** Every option of a select, groups flattened. */
export function allOptions(el: { options?: OptionObject[]; option_groups?: OptionGroupObject[] }): OptionObject[] {
  return [...(el.options ?? []), ...(el.option_groups ?? []).flatMap((g) => g.options ?? [])]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD → a local Date. */
export function parseIsoDate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** DateFormatter dateStyle .short, en-US: "2/2/22" (DatePickerBlockElement+BKBlockConvertible.swift:107-142). */
export const shortDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`

/** DateFormatter timeStyle .short, en-US: "11:37 PM" (with the narrow no-break space iOS puts before AM/PM). */
export const shortTime = (d: Date, timeZone?: string) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) })

/** DateFormatter dateStyle .medium + timeStyle .short, en-US: "Feb 2, 2022 at 11:37 PM". */
export const mediumDateTime = (d: Date) => `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${shortTime(d)}`

/** TimeZone.abbreviation(): "PDT" (the clone asks Intl for the short name). */
export function tzAbbreviation(timeZone?: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')
    return part?.value ?? ''
  } catch {
    return ''
  }
}

/** HH:mm → a Date today at that time (local). */
export function timeToDate(hhmm: string): Date | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return undefined
  const d = new Date()
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return d
}

// ------------------------------------------------------------------------------------------------
// Labels

export interface ElementLabel {
  text: string
  /** the placeholder is showing (input rows draw it in content_secondary) */
  placeholder: boolean
}

type SelectLike = InteractiveElement | InputBlock['element']

/** The name iOS shows for a user id: display name, else real name. */
const userLabel = (fx: Fixture, id: string) => fx.users[id]?.name || fx.users[id]?.realName || id

/** A conversation's label: "#name" for channels, the person's name for DMs (DynamicSelectBlockElement+BKBlockConvertible.swift:108-180). */
function conversationLabel(fx: Fixture, id: string): string {
  const c = fx.conversations[id]
  if (!c) return id
  if (c.type === 'channel' || c.type === 'private') return `#${c.name}`
  if ((c.type === 'im' || c.type === 'app') && c.userId) return userLabel(fx, c.userId)
  return c.name
}

/**
 * What a select or picker says: the chosen value(s) (single: the option / person / "#channel"; multi: "%d selected",
 * `n_selected` yaml:11930), else its placeholder, else the default.
 */
export function elementLabel(el: SelectLike, value: StateValue | null | undefined, fx: Fixture): ElementLabel {
  const placeholder = (fallback: string): ElementLabel => ({ text: textOf((el as { placeholder?: TextObject }).placeholder) || fallback, placeholder: true })
  const multi = (n: number, fallback = PICK_YOUR_OPTIONS): ElementLabel => (n ? { text: `${n} selected`, placeholder: false } : placeholder(fallback))
  switch (el.type) {
    case 'static_select':
    case 'external_select': {
      const o = value && 'selected_option' in value ? value.selected_option : null
      return o ? { text: textOf(o.text), placeholder: false } : placeholder(PICK_AN_OPTION)
    }
    case 'multi_static_select':
    case 'multi_external_select':
      return multi(value && 'selected_options' in value ? value.selected_options.length : 0)
    case 'users_select': {
      const u = value?.type === 'users_select' ? value.selected_user : null
      return u ? { text: userLabel(fx, u), placeholder: false } : placeholder(PICK_AN_OPTION)
    }
    case 'multi_users_select':
      return multi(value?.type === 'multi_users_select' ? value.selected_users.length : 0)
    case 'channels_select': {
      const id = value?.type === 'channels_select' ? value.selected_channel : null
      return id ? { text: conversationLabel(fx, id), placeholder: false } : placeholder(PICK_AN_OPTION)
    }
    case 'conversations_select': {
      const id = value?.type === 'conversations_select' ? value.selected_conversation : null
      return id ? { text: conversationLabel(fx, id), placeholder: false } : placeholder(PICK_AN_OPTION)
    }
    case 'multi_channels_select':
      return multi(value?.type === 'multi_channels_select' ? value.selected_channels.length : 0)
    case 'multi_conversations_select':
      return multi(value?.type === 'multi_conversations_select' ? value.selected_conversations.length : 0)
    case 'datepicker': {
      const d = value?.type === 'datepicker' && value.selected_date ? parseIsoDate(value.selected_date) : undefined
      return d ? { text: shortDate(d), placeholder: false } : placeholder(PICKER_SELECT)
    }
    case 'timepicker': {
      const t = value?.type === 'timepicker' && value.selected_time ? timeToDate(value.selected_time) : undefined
      if (!t) return placeholder(PICKER_SELECT)
      // "11:37 PM (PDT)" only when the app set a timezone (`time_and_timezone`, TimePickerBlockElement+BKBlockConvertible.swift:120-145)
      const tz = el.timezone ? tzAbbreviation(el.timezone) : ''
      return { text: tz ? `${shortTime(t)} (${tz})` : shortTime(t), placeholder: false }
    }
    case 'datetimepicker': {
      const secs = value?.type === 'datetimepicker' ? value.selected_date_time : null
      const tz = tzAbbreviation()
      // "Select date & time (PDT)" (`date_time_picker_placeholder`, yaml:4830); set: medium date + short time + "(PDT)"
      return secs ? { text: `${mediumDateTime(new Date(secs * 1000))}(${tz})`, placeholder: false } : { text: `Select date & time (${tz})`, placeholder: true }
    }
    case 'rich_text_input': {
      const v = value?.type === 'rich_text_input' ? value.rich_text_value : null
      const text = v ? richPlain(v) : ''
      return text.trim() ? { text, placeholder: false } : placeholder(TEXT_PLACEHOLDERS.rich_text_input)
    }
    default:
      return placeholder(PICKER_SELECT)
  }
}

function richPlain(v: unknown): string {
  if (!v || typeof v !== 'object') return ''
  const o = v as { type?: string; text?: string; elements?: unknown[]; name?: string; url?: string }
  if (o.type === 'text' || o.type === 'link') return o.text ?? o.url ?? ''
  if (o.type === 'emoji') return `:${o.name}:`
  if (typeof o.text === 'string' && o.type === 'rich_text') return o.text
  return (o.elements ?? []).map(richPlain).join(o.type === 'rich_text' ? '\n' : '')
}
