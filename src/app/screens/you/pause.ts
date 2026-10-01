import { create } from 'zustand'
import { ordinal, toTime } from '../../../lib/slackDate'

// Pause notifications (DND "snooze"), as NotificationsPause models it (Modules/Features/NotificationsPause/Implementation):
// the presets and their end times (NotificationsPauseDataTypes.swift:69-179), and the strings the sheet, its toast and
// the You row show (NotificationsPauseInteractor.swift:385-431). Nothing is sent anywhere: the pause lives here.

export type PausePreset = 'thirtyMinutes' | 'oneHour' | 'twoHours' | 'fourHours' | 'tomorrow' | 'nextWeek'

/** PauseNotifPreset.allGenericCases with their titles (thirty_minutes 19910, one_hour 12947, two_hours 20911, four_hours
 *  6951, until_tomorrow 21178, until_next_week 21175) */
export const PRESETS: { id: PausePreset; title: string }[] = [
  { id: 'thirtyMinutes', title: '30 minutes' },
  { id: 'oneHour', title: '1 hour' },
  { id: 'twoHours', title: '2 hours' },
  { id: 'fourHours', title: '4 hours' },
  { id: 'tomorrow', title: 'Until tomorrow' },
  { id: 'nextWeek', title: 'Until next week' },
]

/** When a preset ends: minutes from now, tomorrow at 9 AM, next Monday at 9 AM (Date+CustomTime.swift:11-44). */
export function presetEnd(preset: PausePreset, now = new Date()): Date {
  const minutes = { thirtyMinutes: 30, oneHour: 60, twoHours: 120, fourHours: 240 } as const
  if (preset in minutes) return new Date(now.getTime() + minutes[preset as keyof typeof minutes] * 60_000)
  if (preset === 'tomorrow') return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0)
  // the next date after now matching weekday 2 (Monday) at 9:00
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)
  do d.setDate(d.getDate() + 1)
  while (d.getDay() !== 1)
  return d
}

/** Date.defaultStartTime (NotificationsPauseInteractor.swift:438-458): now rounded up to the next half hour. */
export function defaultStartTime(now = new Date()): Date {
  const d = new Date(now)
  d.setSeconds(0, 0)
  if (d.getMinutes() < 30) d.setMinutes(30)
  else {
    d.setMinutes(0)
    d.setHours(d.getHours() + 1)
  }
  return d
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const time = (d: Date) => toTime(d)

/**
 * TimeUtility.shortOrdinalDisplayString (Modules/Data/I18n/Implementation/TimeUtility.swift:723-790): "Today at 3:30 PM",
 * "Oct 6th at 9:00 AM" (shortMonthFormat), "Monday, October 6th at 9:00 AM" (includeDayOfWeek), with ", 2027" in
 * another year unless excludeYear (today_at_x, date_at_time "%@ at %@", dayOfWeek_comma_date "%@, %@").
 */
export function shortOrdinal(d: Date, opts: { excludeYear: boolean; includeTime: boolean; includeDayOfWeek: boolean; shortMonthFormat: boolean }, now = new Date()): string {
  if (sameDay(d, now)) return opts.includeTime ? `Today at ${time(d)}` : 'Today'
  if (sameDay(d, addDays(now, -1))) return opts.includeTime ? `Yesterday at ${time(d)}` : 'Yesterday'
  const month = opts.shortMonthFormat ? MONTHS[d.getMonth()].slice(0, 3) : MONTHS[d.getMonth()]
  let date = `${month} ${ordinal(d.getDate())}`
  if (d.getFullYear() !== now.getFullYear() && !opts.excludeYear) date += `, ${d.getFullYear()}`
  if (opts.includeDayOfWeek) date = `${DAYS[d.getDay()]}, ${date}`
  return opts.includeTime ? `${date} at ${time(d)}` : date
}

/**
 * Date.pauseStatusString (NotificationsPauseInteractor.swift:411-434): "Notifications paused until 3:45 PM" (snooze_until),
 * "… until tomorrow at 9:00 AM" (snooze_until_tomorrow), "… until\nMonday, October 6th at 9:00 AM" (snooze_until_date_time).
 */
export function pauseStatusString(until: Date, now = new Date()): string {
  if (sameDay(until, now)) return `Notifications paused until ${time(until)}`
  if (sameDay(until, addDays(now, 1))) return `Notifications paused until tomorrow at ${time(until)}`
  return `Notifications paused until\n${shortOrdinal(until, { excludeYear: true, includeTime: true, includeDayOfWeek: true, shortMonthFormat: false }, now)}`
}

interface PauseState {
  /** ms when notifications resume; null when they aren't paused */
  until: number | null
  /** "Always allow notifications from VIPs" (the userPriorityDNDOverride pref) */
  vipBreakthrough: boolean
  pause: (until: Date) => void
  resume: () => void
  setVipBreakthrough: (on: boolean) => void
}

export const usePause = create<PauseState>()((set) => ({
  until: null,
  vipBreakthrough: false,
  pause: (until) => set({ until: until.getTime() }),
  resume: () => set({ until: null }),
  setVipBreakthrough: (vipBreakthrough) => set({ vipBreakthrough }),
}))

/** Paused right now (an expired pause reads as not paused, as the service's state does once it ends). */
export const isPaused = (until: number | null, now = Date.now()) => until !== null && until > now
