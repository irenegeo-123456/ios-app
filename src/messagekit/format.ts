import type { Conversation, Fixture, Message, User } from '../data/types'

// The strings MessageKit puts around a message: timestamps (Modules/Data/I18n/Implementation/TimeUtility.swift), plurals
// (SLKPluralString+Helpers.swift) and file sizes (FileSizeUtility.swift), en-US. Values and yaml line numbers are in
// reference/ios/specs/messages.md §1.2, §7.2, §8; the functions cite the Swift they port.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const tsDate = (ts: string) => new Date(parseFloat(ts) * 1000)

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
export const sameDay = (a: Date, b: Date) => startOfDay(a) === startOfDay(b)
const isYesterday = (d: Date, now: Date) => sameDay(d, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

/** "1st" "2nd" "3rd" "4th" … "11th" "12th" "13th" … "21st" (TimeUtility.swift:1155-1169). */
export function ordinalSuffix(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

/** "10:42 AM": `h:mm a` with a no-break space before the meridiem (TimeUtility.swift:208-211). */
export function clock(d: Date): string {
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** A channel message's time, `.timeOnly` (MessageTransformationMapper.swift:147-151). */
export const timeOnly = (ts: string) => clock(tsDate(ts))

/** "Jun 4th", or "Jun 4th, 2025" in another year: the prefix formatter + ordinal (TimeUtility.swift:879-927). */
export function ordinalDate(d: Date, now = new Date()): string {
  const s = `${MONTHS[d.getMonth()]} ${d.getDate()}${ordinalSuffix(d.getDate())}`
  return d.getFullYear() === now.getFullYear() ? s : `${s}, ${d.getFullYear()}`
}

/** Date divider label: "Today", "Yesterday", "Jun 4th", "Jun 4th, 2025", never a weekday (TimeUtility.swift:879-927). */
export function dayDividerLabel(ts: string, now = new Date()): string {
  const d = tsDate(ts)
  if (sameDay(d, now)) return 'Today' // `today`, yaml:21781
  if (isYesterday(d, now)) return 'Yesterday' // `yesterday`, yaml:24196
  return ordinalDate(d, now)
}

/**
 * shortOrdinalDisplayString (TimeUtility.swift:713-786): "Today at 10:42 AM", "Yesterday at 10:42 AM",
 * "Jun 4th at 10:42 AM", "Jun 4th, 2025 at 10:42 AM". The reply bar's last-reply time and the thread root's `.absolute`
 * timestamp (TimestampMapper.swift:31-33).
 */
export function shortOrdinal(ts: string, now = new Date()): string {
  const d = tsDate(ts)
  const time = clock(d)
  if (sameDay(d, now)) return `Today at ${time}` // `today_at_x`, yaml:21784
  if (isYesterday(d, now)) return `Yesterday at ${time}` // `yesterday_at_x`, yaml:24199
  return `${ordinalDate(d, now)} at ${time}` // `date_at_time` "%@ at %@", yaml:5175
}

/**
 * threadReplyTimestamp (TimeUtility.swift:466-501), a reply's time inside a thread: "Just now", "23 mins", "5:10 PM" (today
 * or < 8 h), "Yesterday at 5:10 PM", "Monday at 5:10 PM" (< 7 days), "May 21st at 5:10 PM", "May 21st, 2022 at 5:10 PM".
 */
export function threadReplyTime(ts: string, now = new Date()): string {
  const d = tsDate(ts)
  const secs = (now.getTime() - d.getTime()) / 1000
  const time = clock(d)
  if (secs < 60) return 'Just now' // `just_now`, yaml:10496
  if (secs < 3600) return plural(Math.floor(secs / 60), '1 min', '%@ mins') // `one_mins` / `other_mins`, yaml:13764 / 14442
  if (sameDay(d, now) || secs < 8 * 3600) return time
  if (isYesterday(d, now)) return `Yesterday at ${time}`
  if (secs < 7 * 86400) return `${WEEKDAYS[d.getDay()]} at ${time}`
  return `${ordinalDate(d, now)} at ${time}`
}

/** "today" / "yesterday" / "on June 11, 2013" (paneFillingDisplayString, TimeUtility.swift:701-711; `.long` date style). */
export function paneFillingDate(d: Date, now = new Date()): string {
  if (sameDay(d, now)) return 'today' // `today_lowercased`, yaml:21790
  if (isYesterday(d, now)) return 'yesterday' // `yesterday_lowercased`, yaml:24202
  return `on ${LONG_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` // `on_date`, yaml:13631
}

/** SLKPluralization for en-US: `one` for 1, `other` (with "%@" = the count, grouped) otherwise. */
export function plural(n: number, one: string, other: string): string {
  return n === 1 ? one : other.replace('%@', n.toLocaleString('en-US'))
}

/** "1 reply" / "%@ replies" (`one_reply` yaml:13872, `other_replies` yaml:14397). */
export const repliesText = (n: number) => plural(n, '1 reply', '%@ replies')

/** ByteCountFormatter, file style (decimal): "482 KB", "1.2 MB", "3.05 GB" (FileSizeUtility.swift:8-24). */
export function fileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes === 1) return '1 byte'
  if (bytes < 1000) return `${bytes} bytes`
  const units: [number, string, number][] = [
    [1e12, 'TB', 2],
    [1e9, 'GB', 2],
    [1e6, 'MB', 1],
    [1e3, 'KB', 0],
  ]
  for (const [size, unit, digits] of units) {
    if (bytes >= size) {
      const v = bytes / size
      const s = digits ? String(Number(v.toFixed(digits))) : String(Math.round(v))
      return `${s} ${unit}`
    }
  }
  return ''
}

// ------------------------------------------------------------------------------------------------ people and places

/** The name MessageKit shows for a person: their display name (Message.swift:652-675). */
export const displayName = (u?: User) => (u ? u.name || u.realName : 'User')

/** Bots and apps: the APP badge, the app avatar, the app profile (BadgeMapper.swift:73-99). */
export const isAppUser = (u?: User) => !!(u?.isApp || u?.isBot)

/** Everyone who replied to a thread, first repliers first, you included (RepliesInfoMapper.swift:30-47). */
export function threadInfo(fx: Fixture, threads: Record<string, Message[]>, conversationId: string, m: Message) {
  const replies = threads[`${conversationId}/${m.ts}`] ?? []
  const count = Math.max(m.replyCount ?? 0, replies.length)
  const users: string[] = []
  for (const r of replies) if (!users.includes(r.userId)) users.push(r.userId)
  for (const u of m.replyUsers ?? []) if (!users.includes(u)) users.push(u)
  const latest = replies.at(-1)?.ts ?? m.latestReply
  void fx
  return { replies, count, users, latest }
}

/** The name a conversation shows in its header: channel name, the person, or the group's other members A→Z. */
export function conversationTitle(fx: Fixture, conv: Conversation): string {
  if (conv.type === 'im' || conv.type === 'app') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    return u ? displayName(u) : conv.name
  }
  if (conv.type === 'mpim') {
    const names = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => displayName(fx.users[id]))
    return names.sort((a, b) => a.localeCompare(b)).join(', ') || conv.name
  }
  return conv.name
}

/**
 * A message is saved for later (SavedItemState.inProgress): seeded in More › Later and still in progress, or saved in this
 * session. `toggleSaved` flips a key in `saved`, so a seeded item toggled once is no longer saved.
 */
export function isSaved(fx: Fixture, saved: string[], conversationId: string, ts: string): boolean {
  const seeded = (fx.later ?? []).some((l) => l.conversationId === conversationId && l.ts === ts && (l.status ?? 'in_progress') === 'in_progress')
  return seeded !== saved.includes(`${conversationId}/${ts}`)
}
