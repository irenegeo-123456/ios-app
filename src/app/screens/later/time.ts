import { mkTime } from '../../../messagekit/MKMessagePreview'

// Later's time strings: the due-date "In 2 hours" / "3 days ago" (TimeUtility.toTimeAgo) and the reminder picker's
// titles (TasksTimeUtilities.friendlyTitleForDate), en-US.

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const addMonths = (d: Date, n: number) => {
  const r = new Date(d)
  const day = r.getDate()
  r.setDate(1)
  r.setMonth(r.getMonth() + n)
  // Calendar clamps to the month's last day (Jan 31 + 1 month = Feb 28)
  r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()))
  return r
}
const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from:to:), as magnitudes and a direction. */
function calendarDiff(from: Date, to: Date) {
  const past = to.getTime() < from.getTime()
  const [a, b] = past ? [to, from] : [from, to]
  let year = b.getFullYear() - a.getFullYear()
  while (year > 0 && addMonths(a, year * 12) > b) year--
  const y = addMonths(a, year * 12)
  let month = (b.getFullYear() - y.getFullYear()) * 12 + b.getMonth() - y.getMonth()
  while (month > 0 && addMonths(y, month) > b) month--
  const m = addMonths(y, month)
  let day = Math.floor((b.getTime() - m.getTime()) / 86_400_000) + 1
  while (day > 0 && addDays(m, day) > b) day--
  const rest = Math.floor((b.getTime() - addDays(m, day).getTime()) / 1000)
  return { past, year, month, day, hour: Math.floor(rest / 3600), minute: Math.floor((rest % 3600) / 60), second: rest % 60 }
}

/** SLKPluralization: "1 minute" / "%@ minutes" (one_minute / other_minutes, yaml:12986 / 13637), hours, days, months, years. */
const plural = (unit: 'minute' | 'hour' | 'day' | 'month' | 'year', n: number) => (n === 1 ? `1 ${unit}` : `${n} ${unit}s`)

/**
 * TimeUtility.toTimeAgo (TimeUtility.swift:1051-1155): the largest unit, rounded up past half of the next smaller one
 * (> 5 months, > 14 days, > 11 hours, > 29 minutes, > 29 seconds), "<1 minute" under a minute; "In " + it (in_uppercase)
 * for the future, it + " ago" for the past.
 */
export function toTimeAgo(dueSeconds: number, now: number = Date.now()): string {
  const c = calendarDiff(new Date(now), new Date(dueSeconds * 1000))
  let time: string
  if (c.year > 1) time = plural('year', c.month > 5 ? c.year + 1 : c.year)
  else if (c.year === 1) time = plural('year', c.month > 5 ? 2 : 1)
  else if (c.month > 1) time = plural('month', c.day > 14 ? c.month + 1 : c.month)
  else if (c.month === 1) time = plural('month', c.day > 14 ? 2 : 1)
  else if (c.day > 1) time = plural('day', c.hour > 11 ? c.day + 1 : c.day)
  else if (c.day === 1) time = plural('day', c.hour > 11 ? 2 : 1)
  else if (c.hour > 1) time = plural('hour', c.minute > 29 ? c.hour + 1 : c.hour)
  else if (c.hour === 1) time = plural('hour', c.minute > 29 ? 2 : 1)
  else if (c.minute > 1) time = plural('minute', c.second > 29 ? c.minute + 1 : c.minute)
  else if (c.minute === 1) time = plural('minute', c.second > 29 ? 2 : 1)
  else time = '<1 minute' // less_than_one_minute_lowercased (yaml:10102)
  return c.past ? `${time} ago` : `In ${time}`
}

/**
 * TasksTimeUtilities.friendlyTitleForDate (TasksTimeUtilities.swift:13-50): "Later today at 3:00 PM" (later_today_at_x),
 * "Tomorrow at 9:00 AM" (tomorrow_at), "Monday at 9:00 AM" (weekday_at_x) within a week, else the long date and short
 * time ("October 13, 2026 at 9:00 AM").
 */
export function friendlyReminderTitle(d: Date, now = new Date()): string {
  const time = mkTime(d)
  if (sameDay(d, now)) return `Later today at ${time}`
  if (sameDay(d, addDays(now, 1))) return `Tomorrow at ${time}`
  if (d.getTime() < addDays(now, 7).getTime()) {
    // next_Monday_at_x only when both are Sundays (weekday 1), as the source has it
    if (d.getDay() === 0 && now.getDay() === 0) return `Next Monday at ${time}`
    return `${WEEKDAYS[d.getDay()]} at ${time}`
  }
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${time}`
}

/** Date.formatted(.dateTime.month(.abbreviated).day()): "Oct 1". */
export const shortMonthDay = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`

/** Date.tomorrowNineAM / nextMondayNineAM. */
export function tomorrowNineAM(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0)
}
export function nextMondayNineAM(now = new Date()) {
  const days = ((8 - now.getDay()) % 7) || 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9, 0, 0)
}

/**
 * TasksTimeUtilities.suggestDates (:53-109): tomorrow at 9 AM and next Monday at 9 AM on weekdays; from Friday afternoon
 * (after 12) through the weekend, only next Monday.
 */
export function suggestedReminderDates(now = new Date()): Date[] {
  const day = now.getDay()
  const fridayAfternoonOrWeekend = (day === 5 && now.getHours() > 12) || day === 0 || day === 6
  return fridayAfternoonOrWeekend ? [nextMondayNineAM(now)] : [tomorrowNineAM(now), nextMondayNineAM(now)]
}

export { sameDay, addDays }
