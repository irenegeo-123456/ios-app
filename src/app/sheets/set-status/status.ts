import { create } from 'zustand'
import { useApp } from '../../store'

// The custom status model behind Set a Status (Modules/Features/EditStatus, spec you-settings.md §1): how long a status
// lasts (ExpiryDuration, Modules/Data/DataModels/Implementation/Constants/ExpiryDuration.swift) and the workspace's
// presets (the `custom_status_presets` team pref; Slack's defaults, as the iOS test fixture carries them).

/** ExpiryDuration (ExpiryDuration.swift:12-21); custom carries the end time (ms). */
export type Expiry = 'dontClear' | 'thirtyMinutes' | 'oneHour' | 'twoHours' | 'fourHours' | 'today' | 'thisWeek' | { custom: number }

/** ExpiryDuration(string:) — the server's preset durations (:23-52); "custom" and anything else → nil. */
export function expiryFromServer(s: string): Expiry | null {
  switch (s) {
    case 'no_expiration':
      return 'dontClear'
    case '30_minutes':
      return 'thirtyMinutes'
    case '1_hour':
      return 'oneHour'
    case '2_hours':
      return 'twoHours'
    case '4_hours':
      return 'fourHours'
    case 'all_day':
      return 'today'
    case 'week':
    case 'this_week':
      return 'thisWeek'
    default:
      return null
  }
}

/** ExpiryDuration.title (:54-72): expiry_dont_clear 6168, custom 4665, thirty_minutes 19910, one_hour 12947,
 *  two_hours 20911, four_hours 6951, expiry_today 6174, expiry_this_week 6171 */
export function expiryTitle(e: Expiry): string {
  if (typeof e === 'object') return 'Custom'
  return { dontClear: 'Don’t Clear', thirtyMinutes: '30 minutes', oneHour: '1 hour', twoHours: '2 hours', fourHours: '4 hours', today: 'Today', thisWeek: 'This Week' }[e]
}

/**
 * ExpiryDuration.date (:93-122): minutes and hours from now; today = the start of tomorrow − 1 s (11:59:59 PM);
 * this week = the start of the next weekend − 1 s (Friday 11:59:59 PM; Calendar.nextWeekend, Saturday in the US);
 * Don't Clear = none.
 */
export function expiryDate(e: Expiry, now = new Date()): Date | null {
  if (typeof e === 'object') return new Date(e.custom)
  const plus = (min: number) => new Date(now.getTime() + min * 60_000)
  switch (e) {
    case 'dontClear':
      return null
    case 'thirtyMinutes':
      return plus(30)
    case 'oneHour':
      return plus(60)
    case 'twoHours':
      return plus(120)
    case 'fourHours':
      return plus(240)
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, -1)
    case 'thisWeek': {
      // nextWeekend(startingAfter:): the next Saturday 00:00 after now
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      do d.setDate(d.getDate() + 1)
      while (d.getDay() !== 6)
      return new Date(d.getTime() - 1000)
    }
  }
}

export const sameExpiry = (a: Expiry, b: Expiry) => (typeof a === 'object' && typeof b === 'object' ? a.custom === b.custom : a === b)

/** A status preset: [emoji, text, localized text, duration] in custom_status_presets. */
export interface StatusPreset {
  emoji: string
  text: string
  expiry: Expiry
}

/**
 * Slack's default custom_status_presets with their durations, as June's iOS test fixture had them
 * (Modules/NetworkPersistence/SlackAPI/Tests/Mocks/Fixtures/InlineTestData.swift:225-231 at cd22922; that fixture is gone
 * from 14b3cbaf, whose i18n fixture lists the same five texts, plus "On a call", without durations:
 * TranslationsGetRequestTests.swift:38-62). The real list is the workspace's (CustomStatusInteractor reads the team
 * pref, CustomStatusInteractor.swift:177-183, :305-319); prototypes can replace it with setStatusPresets().
 */
export const DEFAULT_PRESETS: StatusPreset[] = [
  { emoji: 'spiral_calendar_pad', text: 'In a meeting', expiry: 'oneHour' },
  { emoji: 'bus', text: 'Commuting', expiry: 'thirtyMinutes' },
  { emoji: 'face_with_thermometer', text: 'Out sick', expiry: 'today' },
  { emoji: 'palm_tree', text: 'Vacationing', expiry: 'dontClear' },
  { emoji: 'house_with_garden', text: 'Working remotely', expiry: 'today' },
]

/** The emoji a status gets while you've typed text but picked none: speech_balloon (CustomStatusInteractor.swift:47,
 *  :597-633). (The team pref custom_status_default_emoji, June's InlineTestData.swift:239, is never read on iOS.) */
export const DEFAULT_STATUS_EMOJI = 'speech_balloon'

// --------------------------------------------------------------------------------------------- formatting

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`

/** "5:00 PM": h:mm, a no-break space, a (TimeUtility.timeFormatter, TimeUtility.swift:200-201, :228-235). */
export function formatTime(d: Date): string {
  const h = d.getHours()
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/**
 * A custom "Clear after…" time: DateFormattingUtilities.formatText("{date_pretty} {time}") — "Today 5:00 PM",
 * "Tomorrow 5:00 PM", "October 6th 5:00 PM", ", 2027" after the date when it's more than six months away (today 20276,
 * tomorrow 20393, yesterday 22638, st/nd/rd/th; DateFormattingUtilities.swift:56-68, :118-266). Past dates: nothing
 * (CustomStatusInteractor.swift:880-888).
 */
export function formatCustomExpiry(d: Date, now = new Date()): string {
  if (d.getTime() <= now.getTime()) return ''
  let date: string
  if (sameDay(d, now)) date = 'Today'
  else if (sameDay(d, addDays(now, 1))) date = 'Tomorrow'
  else if (sameDay(d, addDays(now, -1))) date = 'Yesterday'
  else {
    date = `${MONTHS[d.getMonth()]} ${ord(d.getDate())}`
    const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
    if (d > sixMonths) date += `, ${d.getFullYear()}`
  }
  return `${date} ${formatTime(d)}`
}

/** What the "Clear after…" row says for a choice (CustomStatusPresenter.swift:163-171). */
export const expiryLabel = (e: Expiry, now = new Date()) => (typeof e === 'object' ? formatCustomExpiry(new Date(e.custom), now) : expiryTitle(e))

/** The earliest custom time: the next :00 or :30 (CustomStatusExpirationInteractor.swift:140-153). */
export function nextHalfHour(now = new Date()): Date {
  const d = new Date(now)
  d.setSeconds(0, 0)
  if (d.getMinutes() < 30) d.setMinutes(30)
  else d.setHours(d.getHours() + 1, 0)
  return d
}

// ------------------------------------------------------------------------------------------- the store

/**
 * Sets the signed-in user's status (users.profile.set: status_text, status_emoji, status_expiration;
 * CustomStatusInteractor.swift:636-665): the store's setStatus for the emoji and text, then its end time.
 */
export function setMyStatus(emoji: string, text: string, expiration: number | null) {
  const app = useApp.getState()
  app.setStatus(emoji, text)
  useApp.setState((s) => {
    const me = s.fx.users[s.fx.me]
    if (!me) return {}
    const next = { ...me }
    if (expiration && (emoji || text)) next.statusExpiration = expiration
    else delete next.statusExpiration
    return { fx: { ...s.fx, users: { ...s.fx.users, [me.id]: next } } }
  })
}

/** A status you've set, for "Recent" (users.customStatus.list; CustomStatusInteractor.swift:316-343). */
export interface RecentStatus {
  emoji: string
  text: string
  expiry: Expiry
}

/** Recent statuses per user, newest first (the session's own; the server's list isn't in the prototype). */
export const useRecentStatuses = create<{ byUser: Record<string, RecentStatus[]>; add: (userId: string, s: RecentStatus) => void; remove: (userId: string, s: RecentStatus) => void }>()((set) => ({
  byUser: {},
  add: (userId, r) =>
    set((s) => {
      const list = (s.byUser[userId] ?? []).filter((x) => !(x.emoji === r.emoji && x.text === r.text))
      return { byUser: { ...s.byUser, [userId]: [r, ...list] } }
    }),
  // the X: users.customStatus.hide (:467-475)
  remove: (userId, r) => set((s) => ({ byUser: { ...s.byUser, [userId]: (s.byUser[userId] ?? []).filter((x) => !(x.emoji === r.emoji && x.text === r.text)) } })),
}))

/** The workspace's presets: Slack's defaults, unless a prototype sets its own. */
export const useStatusPresets = create<{ presets: StatusPreset[]; setPresets: (p: StatusPreset[]) => void }>()((set) => ({
  presets: DEFAULT_PRESETS,
  setPresets: (presets) => set({ presets }),
}))

// ------------------------------------------------------------------------------------------- expiring

let timer: ReturnType<typeof setTimeout> | null = null
let installed = false

/** Clears the signed-in user's status when its time comes (the server does on Slack), whoever is signed in. */
export function installStatusExpiry() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = null
    const s = useApp.getState()
    const me = s.fx.users[s.fx.me]
    const at = me?.statusExpiration
    if (!me || !at || (!me.statusEmoji && !me.statusText)) return
    const wait = at - Date.now()
    if (wait <= 0) return setMyStatus('', '', null)
    // setTimeout tops out at 2^31 − 1 ms (24.8 days): check again then
    timer = setTimeout(schedule, Math.min(wait, 2 ** 31 - 1))
  }
  let last: unknown = undefined
  useApp.subscribe((s) => {
    const me = s.fx.users[s.fx.me]
    const key = `${s.fx.me}|${me?.statusExpiration ?? ''}|${me?.statusEmoji ?? ''}|${me?.statusText ?? ''}`
    if (key === last) return
    last = key
    schedule()
  })
  schedule()
}
