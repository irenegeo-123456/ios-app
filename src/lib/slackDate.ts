// Slack's date and time formatting, ported line for line (en-US) from the webapp:
//
//   js/lib/core/src/util/date-time/format-date.ts            formatDate: the `<!date^ts^{token}…>` tokens
//   js/lib/core/src/util/date-time/format-date-day-divider.ts day dividers
//   js/lib/core/src/util/date-time/to-time-ago.ts            "5 minutes ago", "in 2 days", "<1m"
//   js/lib/core/src/util/date-time/{to-time,to-calendar-date,to-day-of-the-week,to-date,maybe-get-relative-day,
//     prettify-date-string,should-exclude-year,to-calendar-date-or-named-day}.ts and constants.ts
//   js/modern/components/message/utility/{get-full-timestamp,get-thread-timestamp-format}.ts
//
// and checked against the production bundle (2026-09-24). Slack formats through dayjs; `formatDayjs` below
// implements the dayjs format tokens those files use, with dayjs's English locale. "Now" is always read from
// `new Date()` at call time, so the demo clock (src/demo/clock.ts, `?clock=`) moves every relative label.
//
// Unix timestamps follow Slack's toDateObject: seconds, or milliseconds for values of 1e10 and up.

export type Timestamp = number | string | Date

const MINUTE_IN_MS = 60 * 1000
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** dayjs's English ordinal: 1st 2nd 3rd 4th … 11th 12th 13th … 21st. */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

const pad = (n: number, len = 2) => String(Math.abs(n)).padStart(len, '0')

// dayjs en-US `formats` (localizedFormat plugin), from js/lib/core/src/util/date-time/locales/dayjs/en-us.ts.
const LOCALIZED: Record<string, string> = {
  LTS: 'h:mm:ss A',
  LT: 'h:mm A',
  L: 'MM/DD/YYYY',
  LL: 'MMMM D, YYYY',
  LLL: 'MMMM D, YYYY h:mm A',
  LLLL: 'dddd, MMMM D, YYYY h:mm A',
}

/** `dayjs(date).format(fmt)` for the tokens Slack's date utilities use (plus `[escaped]` text). */
export function formatDayjs(d: Date, fmt: string): string {
  const expanded = fmt.replace(/(\[[^\]]+])|(LTS|LT|LLLL|LLL|LL|L)/g, (m, esc: string | undefined, loc: string | undefined) => (esc ? esc : LOCALIZED[loc!] ?? m))
  const h = d.getHours()
  return expanded.replace(/\[([^\]]+)]|Do|Y{4}|Y{2}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|X|x/g, (m, esc: string | undefined) => {
    if (esc) return esc
    switch (m) {
      case 'YYYY':
        return pad(d.getFullYear(), 4)
      case 'YY':
        return String(d.getFullYear()).slice(-2)
      case 'M':
        return String(d.getMonth() + 1)
      case 'MM':
        return pad(d.getMonth() + 1)
      case 'MMM':
        return MONTHS[d.getMonth()].slice(0, 3)
      case 'MMMM':
        return MONTHS[d.getMonth()]
      case 'D':
        return String(d.getDate())
      case 'DD':
        return pad(d.getDate())
      case 'Do':
        return ordinal(d.getDate())
      case 'd':
        return String(d.getDay())
      case 'dd':
        return DAYS[d.getDay()].slice(0, 2)
      case 'ddd':
        return DAYS[d.getDay()].slice(0, 3)
      case 'dddd':
        return DAYS[d.getDay()]
      case 'H':
        return String(h)
      case 'HH':
        return pad(h)
      case 'h':
        return String(h % 12 || 12)
      case 'hh':
        return pad(h % 12 || 12)
      case 'a':
        return h < 12 ? 'am' : 'pm'
      case 'A':
        return h < 12 ? 'AM' : 'PM'
      case 'm':
        return String(d.getMinutes())
      case 'mm':
        return pad(d.getMinutes())
      case 's':
        return String(d.getSeconds())
      case 'ss':
        return pad(d.getSeconds())
      case 'X':
        return String(Math.floor(d.getTime() / 1000))
      case 'x':
        return String(d.getTime())
      default:
        return m
    }
  })
}

/** Slack's toDateObject: a Date as-is; a unix timestamp in seconds, or in ms when it's 1e10 or more. */
export function toDateObject(ts?: Timestamp): Date {
  if (ts instanceof Date) return ts
  if (ts === undefined) return new Date()
  const n = typeof ts === 'string' ? parseFloat(ts) : ts
  return n >= 10000000000 ? new Date(n) : new Date(n * 1000)
}

const isValid = (d: Date) => !Number.isNaN(d.getTime())
const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000
const isSameDay = (a: Date, b: Date) => dayNumber(a) === dayNumber(b)
const isSameYear = (a: Date, b: Date) => a.getFullYear() === b.getFullYear()
/** dayjs `diff` without the float flag truncates toward zero. */
const truncate = (n: number) => (n < 0 ? Math.ceil(n) || 0 : Math.floor(n))
const distanceInSeconds = (a: Date, b: Date) => truncate((a.getTime() - b.getTime()) / 1000)
const distanceInMinutesFractional = (a: Date, b: Date) => (a.getTime() - b.getTime()) / MINUTE_IN_MS

// ------------------------------------------------------------------------------------------------
// to-time.ts (en-US timeFormat: time24 HH:mm[:ss]; time12 h:mm[:ss], with meridiem LT / LTS)

export interface ToTimeOptions {
  /** 24-hour clock (Slack's `time24` pref). en-US defaults to 12-hour. */
  do24hrTime?: boolean
  /** AM/PM; defaults to the opposite of `do24hrTime` */
  includeMeridiem?: boolean
  includeSeconds?: boolean
  /** a dayjs format that overrides everything else */
  timeFormat?: string
}

export function toTime(ts: Timestamp, { do24hrTime = false, includeMeridiem = !do24hrTime, includeSeconds = false, timeFormat }: ToTimeOptions = {}): string {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error('The toTime() utility couldn’t create a dayjs object')
  if (timeFormat) return formatDayjs(date, timeFormat)
  let format: { default: string; includeSeconds: string } = { default: 'HH:mm', includeSeconds: 'HH:mm:ss' }
  if (!do24hrTime) format = includeMeridiem ? { default: 'LT', includeSeconds: 'LTS' } : { default: 'h:mm', includeSeconds: 'h:mm:ss' }
  return formatDayjs(date, includeSeconds ? format.includeSeconds : format.default)
}

// ------------------------------------------------------------------------------------------------
// to-calendar-date.ts (en-US CalendarDateFormatByLocale)

export interface ToCalendarDateOptions {
  /** Dec instead of December */
  shortenMonth?: boolean
  /** drops the ordinal: 23 instead of 23rd */
  shortenDay?: boolean
  excludeYear?: boolean
  /** month and year only */
  excludeDay?: boolean
  excludeCommaSeparator?: boolean
}

export function toCalendarDate(ts: Timestamp, { shortenMonth = false, shortenDay = false, excludeYear = false, excludeDay = false, excludeCommaSeparator = false }: ToCalendarDateOptions = {}): string {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error('We couldn’t create a date object in toCalendarDate()')
  const comma = excludeCommaSeparator ? '' : ','
  const f = {
    MMMD: 'MMM D',
    MMMDo: 'MMM Do',
    MMMMD: 'MMMM D',
    MMMMDo: 'MMMM Do',
    MMMDYYYY: `MMM D${comma} YYYY`,
    MMMYYYY: 'MMM YYYY',
    MMMMYYYY: 'MMMM YYYY',
    MMMDoYYYY: `MMM Do${comma} YYYY`,
    MMMMDoYYYY: `MMMM Do${comma} YYYY`,
  }
  if (shortenMonth && shortenDay && excludeYear) return formatDayjs(date, f.MMMD)
  if (shortenMonth && shortenDay && !excludeYear) return formatDayjs(date, f.MMMDYYYY)
  if (!shortenMonth && shortenDay && excludeYear) return formatDayjs(date, f.MMMMD)
  if (shortenMonth && excludeYear) return formatDayjs(date, f.MMMDo)
  if (shortenMonth && excludeDay) return formatDayjs(date, f.MMMYYYY)
  if (shortenMonth) return formatDayjs(date, f.MMMDoYYYY)
  if (excludeYear) return formatDayjs(date, f.MMMMDo)
  if (excludeDay) return formatDayjs(date, f.MMMMYYYY)
  return formatDayjs(date, f.MMMMDoYYYY)
}

export function toDayOfTheWeek(ts: Timestamp, { shortenDay = false }: { shortenDay?: boolean } = {}): string {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error(`We couldn't create a date object in toDayOfTheWeek()`)
  return formatDayjs(date, shortenDay ? 'ddd' : 'dddd')
}

/** `{date_num}`: 2015-01-26 (or any dayjs format). */
export function toDate(ts: Timestamp, dateFormat = 'YYYY-MM-DD'): string {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error(`Couldn't create the dayjsObj in toDate()`)
  return formatDayjs(date, dateFormat)
}

// ------------------------------------------------------------------------------------------------
// maybe-get-relative-day.ts, prettify-date-string.ts, should-exclude-year.ts, to-calendar-date-or-named-day.ts

/** "Today", "Yesterday" or "Tomorrow" (lower-cased with `uncapitalized`), else undefined. */
export function maybeGetRelativeDay(ts: Timestamp, { uncapitalized = false }: { uncapitalized?: boolean } = {}): string | undefined {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error(`Couldn't create currentDate in maybeGetRelativeDay()`)
  const offset = dayNumber(date) - dayNumber(new Date())
  const word = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : offset === 1 ? 'Tomorrow' : ''
  if (!word) return undefined
  return uncapitalized ? word.toLowerCase() : word
}

export function prettifyDateString(ts: Timestamp, { fallbackString = '', uncapitalized = false }: { fallbackString?: string; uncapitalized?: boolean } = {}): string {
  return maybeGetRelativeDay(ts, { uncapitalized }) ?? fallbackString
}

/** The year is redundant this calendar year, and for dates at most 31 days back into last year. */
export function shouldExcludeYear(ts: Timestamp): boolean {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error(`Couldn't create a date object in shouldExcludeYear()`)
  const now = new Date()
  if (date.getFullYear() > now.getFullYear()) return false
  if (now.getFullYear() === date.getFullYear()) return true
  const monthOfTime = 31 * 24 * 60 * 60
  return Math.floor(now.getTime() / 1000) - Math.floor(date.getTime() / 1000) <= monthOfTime
}

/** "Today", "Yesterday", or a calendar date like "December 22nd, 2014" ("Dec 22nd" with `shortenMonth`, this year). */
export function toCalendarDateOrNamedDay(ts: Timestamp, { shortenMonth = false, excludeYear = false, uncapitalizedRelativeDay = false }: { shortenMonth?: boolean; excludeYear?: boolean; uncapitalizedRelativeDay?: boolean } = {}): string {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error(`Couldn't create a valid date object in toCalendarDateOrNameDay()`)
  const relativeDay = maybeGetRelativeDay(date, { uncapitalized: uncapitalizedRelativeDay })
  if (relativeDay) return relativeDay
  return toCalendarDate(date, { shortenMonth, excludeYear: excludeYear || shouldExcludeYear(date) })
}

// ------------------------------------------------------------------------------------------------
// to-time-ago.ts (en-US TimeAgoByLocale)

const TIME_AGO = {
  past: { sec45: '< 1 minute ago', sec90: '1 minute ago', min45: '%d minutes ago', min90: '1 hour ago', hrs24: '%d hours ago', day: '1 day ago', days: '%d days ago', month: '%d month ago', months: '%d months ago', year: '1 year ago', years: '%d years ago' },
  future: { sec45: 'in < 1 minute', sec90: 'in 1 minute', min45: 'in %d minutes', min90: 'in 1 hour', hrs24: 'in %d hours', day: 'in 1 day', days: 'in %d days', month: 'in %d month', months: 'in %d months', year: 'in 1 year', years: 'in %d years' },
  futureLeft: { sec45: '< 1 min left', sec90: '1 min left', min45: '%d mins left', min90: '1 hour left', hrs24: '%d hours left', day: '1 day left', days: '%d days left', month: '1 month left', months: '%d months left', year: '1 year left', years: '%d years left' },
  compact: { sec45: '<1m', sec90: '1m', min45: '%dm', min90: '1h', hrs24: '%dh', day: '1d', days: '%dd', year: '1y', years: '%dy' },
}

export interface ToTimeAgoOptions {
  /** very compact: "<1m", "5m", "2d", "Oct 30", "1y" */
  compact?: boolean
  /** never a future string like "in < 1 minute" */
  alwaysAgo?: boolean
  /** time left: "< 1 min left" */
  left?: boolean
  /** the current time, if it shouldn't be read from the clock */
  currentTime?: Timestamp
}

/** "< 1 minute ago", "1 minute ago", "5 minutes ago", "1 hour ago", "3 hours ago", "1 day ago", "4 months ago", "in 2 days"… */
export function toTimeAgo(ts: Timestamp, { compact = false, alwaysAgo = false, left = false, currentTime }: ToTimeAgoOptions = {}): string {
  const date = toDateObject(ts)
  if (!isValid(date)) throw new Error('We couldn’t create a date object in toTimeAgo()')
  const today = currentTime ? toDateObject(currentTime) : new Date()
  const rawSeconds = distanceInSeconds(today, date)
  const isFuture = !alwaysAgo && rawSeconds < 0
  const seconds = Math.abs(rawSeconds)
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24
  const months = days / (365 / 12)
  const years = days / 365
  const f = TIME_AGO[isFuture && left ? 'futureLeft' : isFuture ? 'future' : 'past']
  const c = TIME_AGO.compact
  const n = (s: string, v: number) => s.replace(/%d/, Math.round(v).toString())

  if (seconds < 45) return compact ? c.sec45 : f.sec45
  if (seconds < 90) return compact ? c.sec90 : f.sec90
  if (minutes < 45) return n(compact ? c.min45 : f.min45, minutes)
  if (minutes < 90) return compact ? c.min90 : f.min90
  if (hours < 24) return n(compact ? c.hrs24 : f.hrs24, hours)
  if (days < 2) return compact ? c.day : f.day
  if (days < 30) return n(compact ? c.days : f.days, days)
  if (days < 365) {
    if (compact && !isFuture) return toCalendarDate(ts, { shortenDay: true, shortenMonth: true, excludeYear: true })
    return n(months < 1.5 ? f.month : f.months, months)
  }
  if (years < 1.5) return compact ? c.year : f.year
  return n(compact ? c.years : f.years, years)
}

// ------------------------------------------------------------------------------------------------
// format-date-day-divider.ts

/**
 * Day divider label: "Today" / "Yesterday", "Thursday, August 5th" this year, and "August 5th, 2015" (no weekday)
 * for any other year. The year check comes first, so on January 1st yesterday reads "December 31st, <last year>".
 */
export function formatDateDayDivider(unixTime: number | undefined, options?: { displayAsLowerCase: boolean }): string {
  if (!unixTime) return ''
  const date = new Date(unixTime * 1000)
  if (date.getFullYear() !== new Date().getFullYear()) return toCalendarDate(date)
  const relativeDay = maybeGetRelativeDay(date, { uncapitalized: !!options?.displayAsLowerCase })
  if (relativeDay) return relativeDay
  return `${toDayOfTheWeek(date)}, ${toCalendarDate(date, { excludeYear: true })}`
}

// ------------------------------------------------------------------------------------------------
// format-date.ts

/** Minutes east of UTC for `timeZone` at `date` (Slack derives it from Intl rather than dayjs's tz plugin). */
export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, { type, value }) => ((acc[type] = value), acc), {})
  const wallClockAsUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return Math.round((wallClockAsUTC - date.getTime()) / MINUTE_IN_MS)
}

export function isResolvableTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone })
    return true
  } catch {
    return false
  }
}

/** A date shifted so its local wall clock shows `timeZone`'s wall clock. */
function inTimeZone(date: Date, timeZone: string): Date {
  const deltaMs = (date.getTimezoneOffset() + getTimeZoneOffsetMinutes(date, timeZone)) * MINUTE_IN_MS
  return new Date(date.getTime() + deltaMs)
}

/** The year is left out within ±182 days of now ("a little more than half a year"). */
function excludeYearHelper(date: Date): boolean {
  const minuteDistance = distanceInMinutesFractional(date, new Date())
  const maxMinuteDistance = 182 * 24 * 60
  return minuteDistance > -maxMinuteDistance && minuteDistance < maxMinuteDistance
}

/** `{member_local_time}` with memberLocalTime's defaults: the time in America/Los_Angeles. */
function memberLocalTime(date: Date, opts: ToTimeOptions): string {
  return toTime(isResolvableTimeZone('America/Los_Angeles') ? inTimeZone(date, 'America/Los_Angeles') : new Date(date.getTime() + (date.getTimezoneOffset() - 420) * MINUTE_IN_MS), opts)
}

export interface FormatDateOptions {
  /** returned when a token is unknown or the date is invalid; defaults to the token string itself */
  fallbackString?: string | null
  /** 24-hour clock (Slack's `time24` pref) */
  do24hrTime?: boolean
  /** capitalize Today / Yesterday / Tomorrow / the `{ago}` text when they open the string */
  shouldCapitalize?: boolean
  includeMeridiem?: boolean
  includeSeconds?: boolean
  /** dayjs format for `{date_num}` and `{time}` */
  customFormat?: string
  /** IANA zone to show the date in, instead of the viewer's */
  timezone?: string
}

/**
 * Slack's formatDate: substitutes the tokens in `tokenString` for the unix time `unixTime`. Unknown tokens make the
 * whole result the fallback. Tokens: {date_num} 2014-02-18 · {date_slash} 02/18/2014 · {date_long} Tuesday,
 * February 18th[, 2014] · {date_long_full} February 18th, 2014 · {date_long_pretty} · {date} February 18th[, 2014] ·
 * {date_pretty} · {date_short} Feb 18[, 2014] · {date_short_full} Feb 18, 2014 · {date_short_pretty} ·
 * {day_divider_pretty} · {time} 6:39 AM · {time_secs} 6:39:42 AM · {ago} 3 minutes ago · {member_local_time} ·
 * {status_expiration} · {calendar_header} February 2014. The bracketed years only show more than 182 days from now.
 */
export function formatDate(unixTime: Timestamp, tokenString: string, { fallbackString = null, do24hrTime = false, shouldCapitalize = true, includeMeridiem = !do24hrTime, includeSeconds = false, customFormat, timezone }: FormatDateOptions = {}): string {
  let date = momentLike(unixTime)
  if (timezone && isResolvableTimeZone(timezone) && isValid(date)) date = inTimeZone(date, timezone)

  const fallback = fallbackString ?? tokenString
  if (!isValid(date)) return fallback
  if (fallbackString && String(unixTime).split('.')[0].length > 11) return fallback

  let invalidTokenFound = false
  const replaced = tokenString.replace(/{(.*?)}/g, (_match, token: string, offset: number) => {
    const opensString = (name: string) => tokenString.indexOf(`{${name}}`) === 0 && offset === 0
    switch (token) {
      case 'day_divider_pretty':
        return formatDateDayDivider(Math.floor(date.getTime() / 1000), { displayAsLowerCase: !shouldCapitalize })
      case 'date_num':
        return customFormat ? toDate(date, customFormat) : toDate(date)
      case 'date_slash':
        return toDate(date, 'L')
      case 'date_long':
        return `${toDayOfTheWeek(date)}, ${toCalendarDate(date, { excludeYear: excludeYearHelper(date) })}`
      case 'date_long_full':
        return toCalendarDate(date, { shortenMonth: false })
      case 'date_long_pretty':
        return prettifyDateString(date, {
          fallbackString: `${toDayOfTheWeek(date)}, ${toCalendarDate(date, { shortenMonth: false, excludeYear: excludeYearHelper(date) })}`,
          uncapitalized: !shouldCapitalize || !opensString('date_long_pretty'),
        })
      case 'date':
        return toCalendarDate(date, { shortenMonth: false, excludeYear: excludeYearHelper(date) })
      case 'date_pretty':
        return prettifyDateString(date, {
          fallbackString: toCalendarDate(date, { shortenMonth: false, excludeYear: excludeYearHelper(date) }),
          uncapitalized: !shouldCapitalize || !opensString('date_pretty'),
        })
      case 'date_short':
        return toCalendarDate(date, { shortenMonth: true, shortenDay: true, excludeYear: excludeYearHelper(date) })
      case 'date_short_full':
        return toCalendarDate(date, { shortenMonth: true, shortenDay: true })
      case 'date_short_pretty':
        return prettifyDateString(date, {
          fallbackString: toCalendarDate(date, { shortenDay: true, shortenMonth: true, excludeYear: excludeYearHelper(date) }),
          uncapitalized: !shouldCapitalize || !opensString('date_short_pretty'),
        })
      case 'time':
        return toTime(date, { includeSeconds, includeMeridiem, do24hrTime, timeFormat: customFormat })
      case 'member_local_time':
        return memberLocalTime(date, { includeSeconds: false, includeMeridiem: !do24hrTime, do24hrTime })
      case 'time_secs':
        return toTime(date, { includeSeconds: true, includeMeridiem: !do24hrTime, do24hrTime })
      case 'ago': {
        const ago = toTimeAgo(date)
        return shouldCapitalize && opensString('ago') && ago ? ago.charAt(0).toLocaleUpperCase() + ago.slice(1) : ago
      }
      case 'status_expiration':
        return statusExpiration(date, { shouldCapitalize, do24hrTime })
      case 'calendar_header':
        return toCalendarDate(date, { excludeDay: true })
      default:
        invalidTokenFound = true
        return ''
    }
  })
  return invalidTokenFound ? fallback : replaced
}

/** formatDate reads its input through toDateObject's moment path, where only 12+ digit numbers are milliseconds. */
function momentLike(ts: Timestamp): Date {
  if (ts instanceof Date) return new Date(ts.getTime())
  const n = typeof ts === 'string' ? parseFloat(ts) : ts
  if (typeof n !== 'number' || Number.isNaN(n)) return new Date(NaN)
  return n.toString().split('.')[0].length > 11 ? new Date(n) : new Date(n * 1000)
}

function statusExpiration(date: Date, { shouldCapitalize, do24hrTime }: { shouldCapitalize: boolean; do24hrTime: boolean }): string {
  const today = new Date()
  const time = (d: Date) => toTime(d, { includeMeridiem: !do24hrTime, do24hrTime })
  // Exclude the time if it's the end of the relative day
  if (date.getHours() === 23 && date.getMinutes() === 59) {
    const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, date.getHours(), date.getMinutes(), date.getSeconds())
    if (isSameDay(date, today)) {
      const relativeNextDay = maybeGetRelativeDay(nextDay, { uncapitalized: !shouldCapitalize })
      if (relativeNextDay) return relativeNextDay
    }
    // "Next week" at the end of the upcoming Friday (getIndexOfNextDayOfWeek(5): this Friday, or next week's once it's past)
    const friday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (today.getDay() <= 5 ? 5 - today.getDay() : 12 - today.getDay()))
    if (isSameDay(date, friday)) return shouldCapitalize ? 'Next week' : 'next week'
    return `${toDayOfTheWeek(nextDay, { shortenDay: true })}, ${toCalendarDate(nextDay, { shortenMonth: false, excludeYear: true })}`
  }
  if (isSameDay(date, today)) return time(date)
  const relativeDay = maybeGetRelativeDay(date, { uncapitalized: !shouldCapitalize })
  if (relativeDay) return `${relativeDay}, ${time(date)}`
  return `${toDayOfTheWeek(date, { shortenDay: true })}, ${toCalendarDate(date, { shortenMonth: false, excludeYear: true })}, ${time(date)}`
}

export interface FormatSlackDateOptions extends Omit<FormatDateOptions, 'fallbackString'> {
  /** the `|fallback` text of a `<!date>` command */
  fallback?: string
}

/**
 * What Slack's DateCommand shows for `<!date^ts^format^link|fallback>` and rich_text `date` elements:
 * formatDate's result, the fallback when a token is unknown, or '' when there's nothing to show (Slack renders
 * nothing when the result is just the format string back). The third argument may also be a `now` Date (legacy).
 */
export function formatSlackDate(ts: number, format: string, opts: FormatSlackDateOptions | Date = {}): string {
  if (opts instanceof Date) return withNow(opts, () => formatSlackDate(ts, format))
  const { fallback, ...rest } = opts
  const out = formatDate(ts, format, { fallbackString: fallback, ...rest })
  return !out || out === format ? '' : out
}

/** Runs `fn` with `new Date()` / `Date.now()` pinned to `now` (for callers that pass an explicit clock). */
function withNow<T>(now: Date, fn: () => T): T {
  const RealDate = Date
  const pinned = now.getTime()
  class PinnedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(pinned)
      else super(...(args as [string | number | Date]))
    }
    static now() {
      return pinned
    }
  }
  globalThis.Date = PinnedDate as DateConstructor
  try {
    return fn()
  } finally {
    globalThis.Date = RealDate
  }
}

// ------------------------------------------------------------------------------------------------
// js/modern/components/message/utility/get-full-timestamp.ts and get-thread-timestamp-format.ts

/**
 * A message timestamp's aria-label and tooltip: "Today at 5:53:25 PM", "Sep 22nd at 5:53:25 PM",
 * "Sep 22nd, 2025 at 5:53:25 PM" (the year after 31 days into the next year).
 */
export function getFullTimestamp({ timestamp, time24, includeSeconds = true, showWeekday }: { timestamp: Date; time24?: boolean; includeSeconds?: boolean; showWeekday?: boolean }): string {
  const date = showWeekday ? formatDate(timestamp.getTime() / 1000, '{date_long}') : toCalendarDateOrNamedDay(timestamp, { shortenMonth: true })
  return `${date} at ${toTime(timestamp, { do24hrTime: time24, includeSeconds })}`
}

/**
 * Thread and Slackbot timestamps: "Just now", "7 minutes ago", "Today at 1:25 PM", "Yesterday at 1:25 PM",
 * "Friday at 12:00 PM", "May 21st at 3:31 AM", "May 21st, 2022 at 12:00 PM".
 */
export function getThreadTimestampFormat(dateObject: Date, time24?: boolean, passedCurrentTime?: Timestamp): string {
  const currentTime = passedCurrentTime ? toDateObject(passedCurrentTime) : new Date()
  const seconds = Math.abs(distanceInSeconds(currentTime, dateObject))
  const minutes = seconds / 60
  const days = minutes / 60 / 24
  const time = () => toTime(dateObject, { do24hrTime: time24 })
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return toTimeAgo(dateObject, { alwaysAgo: true, currentTime: passedCurrentTime })
  if (isSameDay(currentTime, dateObject)) return `Today at ${time()}`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(dateObject, yesterday)) return `Yesterday at ${time()}`
  if (days < 7) return `${toDayOfTheWeek(dateObject)} at ${time()}`
  return `${toCalendarDate(dateObject, { shortenMonth: true, excludeYear: isSameYear(currentTime, dateObject) })} at ${time()}`
}
