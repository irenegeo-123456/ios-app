// Message timestamps, day dividers and thread times, the way Slack's message list renders them. The formatting
// itself is the port in ./slackDate.ts (formatDateDayDivider, getFullTimestamp, getThreadTimestampFormat, toTime).

import { formatDateDayDivider, getFullTimestamp, getThreadTimestampFormat, ordinal, toCalendarDate, toTime } from './slackDate'

export { ordinal }

/** "January 10th, 2018": the format Slack uses in channel intros. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toCalendarDate(new Date(y, m - 1, d))
}

export const tsToDate = (ts: string) => new Date(parseFloat(ts) * 1000)

/** Slack message ts for a moment: "1790286805.707579". */
export function makeTs(date: Date, seq = 0): string {
  const secs = Math.floor(date.getTime() / 1000)
  return `${secs}.${String(100000 + ((seq * 7919) % 900000)).padStart(6, '0')}`
}

/** Local midnight of the message's day, in ms (Slack's day-divider key). */
export function dayStart(ts: string): number {
  const d = tsToDate(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "5:53 PM" */
export const clockTime = (ts: string) => toTime(tsToDate(ts))

/** "5:54": the hover timestamp on grouped messages (Slack's Timestamp with `meridiem={false}`). */
export const shortClock = (ts: string) => toTime(tsToDate(ts), { includeMeridiem: false })

/** Day divider pill text: "Today", "Yesterday", "Monday, September 22nd", or "August 5th, 2015" in other years. */
export const dayLabel = (ts: string) => formatDateDayDivider(parseFloat(ts))

/** Timestamp aria-label and tooltip: "Today at 5:53:25 PM", "Sep 22nd at 5:53:25 PM". */
export const ariaTime = (ts: string) => getFullTimestamp({ timestamp: tsToDate(ts) })

/** "[5:53 PM]" for data-stringify-text */
export const stringifyTime = (ts: string) => `[${clockTime(ts)}]`

/** Thread-pane time: "Just now", "7 minutes ago", "Today at 1:25 PM", "Yesterday at…", "Friday at…", "May 21st at…". */
export function relativeTime(ts: string, now = Date.now()): string {
  return getThreadTimestampFormat(tsToDate(ts), undefined, now)
}

/** Permalink path fragment: "p1790286805707579" */
export const permalinkId = (ts: string) => `p${ts.replace('.', '')}`
