// Slack's jest tables for js/lib/core/src/util/date-time/* and js/modern/components/message/utility/* (en-US),
// ported to vitest. Slack runs these with TZ=Asia/Tokyo; so do we.
process.env.TZ = 'Asia/Tokyo'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  formatDateDayDivider,
  formatSlackDate,
  getFullTimestamp,
  getThreadTimestampFormat,
  getTimeZoneOffsetMinutes,
  maybeGetRelativeDay,
  prettifyDateString,
  shouldExcludeYear,
  toCalendarDate,
  toTime,
  toTimeAgo,
} from './slackDate'

const unix = (dateStr: string) => Math.floor(new Date(dateStr).getTime() / 1000)
const at = (d: Date | string) => vi.setSystemTime(typeof d === 'string' ? new Date(d) : d)

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

it('runs in Slack’s jest time zone', () => {
  expect(new Date('2015-03-31T00:00:00Z').getHours()).toBe(9)
})

describe('formatDate (format-date.jest.ts)', () => {
  const baseTime = new Date('Mar 31 2015 12:00:00')
  // 'Mar 31 2015 12:00:00 AM' GMT/UTC
  const unixTimeStamp = 1427760000
  const testFormatDate = (input: string, tokenString: string, expected: string) => {
    at(baseTime)
    expect(formatDate(unix(input), tokenString)).toEqual(expected)
  }

  it.each([
    ['Mon Dec 23 2013 16:44:50', '{date_num}', '2013-12-23'],
    ['Tue Dec 03 2014 02:34:50', '{date_num}', '2014-12-03'],
    ['Mon Jan 12 2015 23:59:59', '{date_num}', '2015-01-12'],
    ['Fri Jun 12 2015 23:59:59', '{date_num}', '2015-06-12'],
    ['Fri Feb 02 2016 16:44:50', '{date_num}', '2016-02-02'],
  ])('%s as %s is %s', testFormatDate)

  it.each([
    ['Mon Dec 23 2013 16:44:50', '{date_slash}', '12/23/2013'],
    ['Tue Dec 03 2014 02:34:50', '{date_slash}', '12/03/2014'],
    ['Mon Jan 12 2015 23:59:59', '{date_slash}', '01/12/2015'],
    ['Fri Jun 12 2015 23:59:59', '{date_slash}', '06/12/2015'],
    ['Fri Feb 02 2016 16:44:50', '{date_slash}', '02/02/2016'],
  ])('%s as %s is %s', testFormatDate)

  it('returns a custom formatted date when customFormat is passed to date_num', () => {
    expect(formatDate(unix('Mon Dec 23 2013 16:44:50'), '{date_num}', { customFormat: 'YYYY-MM-DD, LT' })).toEqual('2013-12-23, 4:44 PM')
  })

  describe('date_slash and time with varying "timezone"', () => {
    const dstDate = unix('Tue Mar 10 2015 03:30:00 GMT-0600 (Mountain Daylight Time)')
    it.each([
      [unixTimeStamp, '{date_slash}', 'UTC', '03/31/2015'],
      [unixTimeStamp, '{date_slash}', 'PST8PDT', '03/30/2015'],
      [unixTimeStamp, '{date_slash}', 'NZ', '03/31/2015'],
      [unixTimeStamp, '{date_slash}', 'Asia/Tokyo', '03/31/2015'],
      [unixTimeStamp, '{date_slash}', 'Canada/Newfoundland', '03/30/2015'],
      [unixTimeStamp, '{date_slash}', 'America/Los_Angeles', '03/30/2015'],
      [dstDate, '{date_slash}', 'UTC', '03/10/2015'],
      [unixTimeStamp, '{time}', 'UTC', '12:00 AM'],
      [unixTimeStamp, '{time}', 'PST8PDT', '5:00 PM'],
      [unixTimeStamp, '{time}', 'NZ', '1:00 PM'],
      [unixTimeStamp, '{time}', 'Asia/Tokyo', '9:00 AM'],
      [unixTimeStamp, '{time}', 'Canada/Newfoundland', '9:30 PM'],
      [unixTimeStamp, '{time}', 'America/Los_Angeles', '5:00 PM'],
      [dstDate, '{time}', 'UTC', '9:30 AM'],
    ])('%s %s in %s is %s', (input, tokenString, timezone, expected) => {
      expect(formatDate(input, tokenString, { timezone })).toEqual(expected)
    })

    it('falls back to local time (no conversion) for an invalid timezone', () => {
      expect(formatDate(unixTimeStamp, '{time}', { timezone: 'Not/AZone' })).toEqual(formatDate(unixTimeStamp, '{time}'))
    })
  })

  describe('getTimeZoneOffsetMinutes', () => {
    it.each([
      ['2024-03-10T06:30:00Z', 'America/New_York', -300],
      ['2024-03-10T07:00:00Z', 'America/New_York', -240],
      ['2024-03-10T07:30:00Z', 'America/New_York', -240],
      ['2024-03-10T08:30:00Z', 'America/New_York', -240],
      ['2024-03-10T09:30:00Z', 'America/New_York', -240],
      ['2024-03-10T12:00:00Z', 'America/New_York', -240],
      ['2024-11-03T05:30:00Z', 'America/New_York', -240],
      ['2024-11-03T06:30:00Z', 'America/New_York', -300],
      ['2024-06-01T00:00:00Z', 'Asia/Kolkata', 330],
      ['2024-06-01T00:00:00Z', 'Asia/Kathmandu', 345],
      ['2024-06-01T00:00:00Z', 'Pacific/Chatham', 765],
      ['2024-06-01T00:00:00Z', 'UTC', 0],
      ['2024-10-06T15:30:00Z', 'Australia/Sydney', 660],
    ])('returns %s in %s as %d minutes east of UTC', (iso, timeZone, expected) => {
      expect(getTimeZoneOffsetMinutes(new Date(iso), timeZone)).toEqual(expected)
    })
  })

  it('calendar_header returns December 2013 for Mon Dec 23 2013 16:44:50', () => {
    testFormatDate('Mon Dec 23 2013 16:44:50', '{calendar_header}', 'December 2013')
  })

  describe('status_expiration', () => {
    it('returns only the time when the expiration is later the same day', () => testFormatDate('Mar 31 2015 15:30:00', '{status_expiration}', '3:30 PM'))
    it('returns "Tomorrow" at the end of the current day (23:59)', () => testFormatDate('Mar 31 2015 23:59:00', '{status_expiration}', 'Tomorrow'))
    it('returns "Next week" at the end of the upcoming Friday', () => testFormatDate('Apr 3 2015 23:59:00', '{status_expiration}', 'Next week'))
    it('returns relative day + time for tomorrow', () => testFormatDate('Apr 1 2015 15:30:00', '{status_expiration}', 'Tomorrow, 3:30 PM'))
    it('returns weekday, date, and time for a further-out expiration', () => testFormatDate('Apr 20 2015 15:30:00', '{status_expiration}', 'Mon, April 20th, 3:30 PM'))
    it('returns the following day (no time) for a further-out end-of-day expiration', () => testFormatDate('Apr 20 2015 23:59:00', '{status_expiration}', 'Tue, April 21st'))
  })

  describe('corner cases', () => {
    it('invalid dates return fallbacks', () => {
      expect(formatDate('9999999999999999', '', { fallbackString: 'test' })).toEqual('test')
    })
    it('Improper timestamps return fallbacks', () => {
      expect(formatDate('152241120022.33333', '', { fallbackString: 'test' })).toEqual('test')
    })
  })

  const invalid = ['{invalid}', '{DATE_NUM}', '{date_nu}', '{date_lon}', '{date_long_prett}', '{dat}', '{date_prett}', '{date_shor}', '{date_short_prett}', 'Posted at {tim}', 'Posted at {time_sec}', '{ag}']
  it.each(invalid)('returns the fallback for the invalid token in %s', (tokenString) => {
    at(baseTime)
    expect(formatDate(unix('Thu Dec 25 2014 12:00:00'), tokenString, { fallbackString: 'FALLBACK' })).toEqual('FALLBACK')
  })
  it.each(invalid.filter((t) => t !== '{DATE_NUM}'))('returns %s itself when there is no fallback', (tokenString) => {
    testFormatDate('Thu Dec 25 2014 12:00:00', tokenString, tokenString)
  })

  describe('shouldCapitalize', () => {
    const pretty = ['{date_pretty}', '{date_long_pretty}', '{date_short_pretty}', '{day_divider_pretty}']
    const table = (time: string, capital: string[], lower: string[]) =>
      it.each(pretty.flatMap((tokenString, i) => [[tokenString, true, capital[i]] as const, [tokenString, false, lower[i]] as const]))('%s with shouldCapitalize %s is %s', (tokenString, shouldCapitalize, expected) => {
        at(baseTime)
        expect(formatDate(unix(time), tokenString, { shouldCapitalize })).toBe(expected)
      })
    describe('today', () => table('Mar 31 2015 12:00:00', ['Today', 'Today', 'Today', 'Today'], ['today', 'today', 'today', 'today']))
    describe('one day ago', () => table('Mar 30 2015 12:00:00', Array(4).fill('Yesterday'), Array(4).fill('yesterday')))
    describe('one day in the future', () => table('April 1 2015 12:00:00', Array(4).fill('Tomorrow'), Array(4).fill('tomorrow')))
    const plain = ['March 1st', 'Sunday, March 1st', 'Mar 1', 'Sunday, March 1st']
    describe('dates that cannot be prettified', () => table('March 1 2015 12:00:00', plain, plain))
  })
})

describe('formatDate: the tokens the clone used to get wrong', () => {
  beforeEach(() => at('Sep 25 2026 12:00:00'))

  it('leaves the year out within ±182 days of now, not "this calendar year"', () => {
    expect(formatDate(unix('Mar 28 2026 12:00:00'), '{date}')).toBe('March 28th')
    expect(formatDate(unix('Mar 20 2026 12:00:00'), '{date}')).toBe('March 20th, 2026')
    expect(formatDate(unix('Jan 5 2027 12:00:00'), '{date_short}')).toBe('Jan 5')
    expect(formatDate(unix('Aug 5 2025 12:00:00'), '{date_long}')).toBe('Tuesday, August 5th, 2025')
  })

  it('{date_long_full} has no weekday', () => {
    expect(formatDate(unix('Aug 9 2020 12:00:00'), '{date_long_full}')).toBe('August 9th, 2020')
  })

  it('{date_full} is not a token; {date_slash} is', () => {
    expect(formatDate(unix('Aug 9 2020 12:00:00'), '{date_full}', { fallbackString: 'Aug 9' })).toBe('Aug 9')
    expect(formatDate(unix('Aug 9 2020 12:00:00'), '{date_slash}')).toBe('08/09/2020')
  })

  it('{ago} reads "< 1 minute ago" and capitalizes when it opens the string', () => {
    expect(formatDate(unix('Sep 25 2026 11:59:40'), '{ago}')).toBe('< 1 minute ago')
    // units switch at 45 s / 90 s / 45 min / 90 min: 50 minutes is "1 hour"
    expect(formatDate(unix('Sep 25 2026 11:10:00'), 'posted {ago}')).toBe('posted 1 hour ago')
    expect(formatDate(unix('Sep 25 2026 11:59:00'), '{ago}')).toBe('1 minute ago')
    expect(formatDate(unix('Sep 18 2026 12:00:00'), '{ago}')).toBe('7 days ago')
    expect(formatDate(unix('Sep 20 2026 12:00:00'), '{ago}')).toBe('5 days ago')
    expect(formatDate(unix('Sep 30 2026 12:00:00'), '{ago}')).toBe('In 5 days')
  })

  it('day dividers for other years have no weekday', () => {
    expect(formatDate(unix('Aug 5 2015 12:00:00'), '{day_divider_pretty}')).toBe('August 5th, 2015')
    expect(formatDate(unix('Sep 22 2026 12:00:00'), '{day_divider_pretty}')).toBe('Tuesday, September 22nd')
  })

  it('time and time_secs follow the 24-hour pref', () => {
    expect(formatDate(unix('Sep 25 2026 09:05:07'), '{time} / {time_secs}')).toBe('9:05 AM / 9:05:07 AM')
    expect(formatDate(unix('Sep 25 2026 21:05:07'), '{time} / {time_secs}', { do24hrTime: true })).toBe('21:05 / 21:05:07')
  })
})

describe('formatSlackDate (what DateCommand renders)', () => {
  beforeEach(() => at('Sep 25 2026 12:00:00'))
  it('formats, falls back on unknown tokens, and shows nothing for the bare format', () => {
    const ts = unix('Sep 21 2026 10:13:00')
    expect(formatSlackDate(ts, '{date_short_pretty} at {time}')).toBe('Sep 21 at 10:13 AM')
    expect(formatSlackDate(ts, '{date_full}', { fallback: 'Sep 21' })).toBe('Sep 21')
    expect(formatSlackDate(ts, '{date_full}')).toBe('')
    expect(formatSlackDate(ts, 'no tokens')).toBe('')
  })
  it('accepts a legacy `now` as the third argument', () => {
    expect(formatSlackDate(unix('Sep 21 2026 10:13:00'), '{date_pretty}', new Date('Sep 22 2026 08:00:00'))).toBe('Yesterday')
  })
})

describe('formatDateDayDivider (format-date-day-divider.jest.ts)', () => {
  beforeEach(() => at('Mar 31 2015 12:00:00'))
  it.each([
    ['March 31 2015 16:44:50', 'today'],
    ['March 30 2015 16:44:50', 'yesterday'],
  ])('%s is %s in lower case', (input, expected) => {
    expect(formatDateDayDivider(unix(input), { displayAsLowerCase: true })).toEqual(expected)
  })
  it.each([
    ['March 31 2015 16:44:50', 'Today'],
    ['March 30 2015 16:44:50', 'Yesterday'],
    ['March 29 2015 16:44:50', 'Sunday, March 29th'],
    ['March 28 2015 16:44:50', 'Saturday, March 28th'],
    ['March 27 2015 16:44:50', 'Friday, March 27th'],
    ['March 26 2015 16:44:50', 'Thursday, March 26th'],
    ['March 26 2014 16:44:50', 'March 26th, 2014'],
  ])('%s is %s', (input, expected) => {
    expect(formatDateDayDivider(unix(input))).toEqual(expected)
  })
  it('checks the year before Today/Yesterday, like Slack (New Year’s Day)', () => {
    at('Jan 1 2016 09:00:00')
    expect(formatDateDayDivider(unix('Dec 31 2015 18:00:00'))).toBe('December 31st, 2015')
  })
})

describe('toTimeAgo (to-time-ago.jest.ts, en-US)', () => {
  beforeEach(() => at('Dec 1 2016 12:00:00'))
  it('throws if the date object is invalid', () => {
    expect(() => toTimeAgo('aaaa')).toThrow()
  })
  const future = ['Dec 1 2016 12:00:25', 'Dec 1 2016 12:00:55', 'Dec 1 2016 12:05:00', 'Dec 1 2016 23:05:00', 'Dec 2 2016 12:05:00', 'Dec 3 2016 12:05:00', 'Apr 1 2017 11:59:59', 'Jan 1 2018 12:00:00', 'Jan 1 2019 12:00:00']
  const past = ['Dec 1 2016 11:59:55', 'Dec 1 2016 11:58:58', 'Dec 1 2016 11:55:01', 'Dec 1 2016 10:59:59', 'Dec 1 2016 00:00:00', 'Nov 18 2016 12:00:00', 'Nov 29 2016 11:59:59', 'Nov 30 2016 11:59:59', 'Oct 30 2016 11:59:59', 'Dec 1 2015 12:00:00', 'Jan 1 2015 12:00:00']
  const cases: [string, string[], string[], Parameters<typeof toTimeAgo>[1]][] = [
    ['future', future, ['in < 1 minute', 'in 1 minute', 'in 5 minutes', 'in 11 hours', 'in 1 day', 'in 2 days', 'in 4 months', 'in 1 year', 'in 2 years'], {}],
    ['ago', future, ['< 1 minute ago', '1 minute ago', '5 minutes ago', '11 hours ago', '1 day ago', '2 days ago', '4 months ago', '1 year ago', '2 years ago'], { alwaysAgo: true }],
    ['left', future, ['< 1 min left', '1 min left', '5 mins left', '11 hours left', '1 day left', '2 days left', '4 months left', '1 year left', '2 years left'], { left: true }],
    ['past', past, ['< 1 minute ago', '1 minute ago', '5 minutes ago', '1 hour ago', '12 hours ago', '13 days ago', '2 days ago', '1 day ago', '1 month ago', '1 year ago', '2 years ago'], {}],
    ['compact', past, ['<1m', '1m', '5m', '1h', '12h', '13d', '2d', '1d', 'Oct 30', '1y', '2y'], { compact: true }],
  ]
  for (const [kind, inputs, outputs, opts] of cases)
    it.each(inputs.map((input, i) => [input, outputs[i]]))(`${kind}: %s is %s`, (input, expected) => {
      expect(toTimeAgo(unix(input), opts)).toEqual(expected)
    })
})

describe('shouldExcludeYear (should-exclude-year.jest.ts)', () => {
  beforeEach(() => at('Feb 14 2017 07:41:00'))
  it('throws if the date is invalid', () => {
    expect(() => shouldExcludeYear('aaaa')).toThrow()
  })
  it('returns false for a date in a later year', () => {
    expect(shouldExcludeYear(unix(`Tue Jan 14 ${new Date().getFullYear() + 1} 16:44:50`))).toEqual(false)
  })
  it.each([
    ['Tue Jan 14 2014 16:44:50', false],
    ['Tue Jan 14 2017 07:41:00', true],
    ['Thu Dec 15 2016 00:08:10', false],
    ['Thu Feb 2 2017 00:00:00', true],
  ])('%s → %s', (input, expected) => {
    expect(shouldExcludeYear(unix(input))).toEqual(expected)
  })
})

describe('toCalendarDate (to-calendar-date.jest.ts, en-US)', () => {
  it('throws if a date can’t be created', () => {
    expect(() => toCalendarDate('aaa')).toThrow()
  })
  const inputs = ['Tue Dec 23 2014 16:44:50', 'Sat Feb 1 2020 00:08:10', 'Thu Jun 16 2022 02:34:50']
  it.each([
    [{}, ['December 23rd, 2014', 'February 1st, 2020', 'June 16th, 2022']],
    [{ excludeCommaSeparator: true }, ['December 23rd 2014', 'February 1st 2020', 'June 16th 2022']],
    [{ shortenMonth: true }, ['Dec 23rd, 2014', 'Feb 1st, 2020', 'Jun 16th, 2022']],
    [{ shortenMonth: true, excludeCommaSeparator: true }, ['Dec 23rd 2014', 'Feb 1st 2020', 'Jun 16th 2022']],
    [{ shortenMonth: true, shortenDay: true }, ['Dec 23, 2014', 'Feb 1, 2020', 'Jun 16, 2022']],
    [{ shortenMonth: true, shortenDay: true, excludeCommaSeparator: true }, ['Dec 23 2014', 'Feb 1 2020', 'Jun 16 2022']],
    [{ excludeYear: true }, ['December 23rd', 'February 1st', 'June 16th']],
    [{ excludeDay: true }, ['December 2014', 'February 2020', 'June 2022']],
    [{ shortenMonth: true, excludeYear: true }, ['Dec 23rd', 'Feb 1st', 'Jun 16th']],
    [{ shortenMonth: true, shortenDay: true, excludeYear: true }, ['Dec 23', 'Feb 1', 'Jun 16']],
    [{ shortenMonth: true, excludeDay: true }, ['Dec 2014', 'Feb 2020', 'Jun 2022']],
    [{ shortenDay: true, excludeYear: true }, ['December 23', 'February 1', 'June 16']],
  ])('%o', (opts, expected) => {
    expect(inputs.map((i) => toCalendarDate(unix(i), opts))).toEqual(expected)
  })
})

describe('toTime (to-time.jest.ts, en-US)', () => {
  it('throws when a date can’t be created', () => {
    expect(() => toTime('aaaa')).toThrow()
  })
  it('does the right thing when includeMeridiem is false and includeSeconds is true', () => {
    expect(toTime(unix('Tue Dec 23 2014 16:44:50'), { includeMeridiem: false, includeSeconds: true })).toEqual('4:44:50')
  })
  it('takes a Date as input', () => {
    expect(toTime(new Date('Tue Dec 23 2014 16:44:50'))).toEqual('4:44 PM')
  })
  const inputs = ['Tue Dec 23 2014 16:44:50', 'Tue Dec 23 2014 02:34:50', 'Thu Dec 25 2014 00:08:10', 'Thu Dec 24 2014 23:59:59', 'Thu Dec 25 2014 00:00:00', 'Thu Dec 25 2014 12:00:00']
  it.each([
    [{ includeMeridiem: false }, ['4:44', '2:34', '12:08', '11:59', '12:00', '12:00']],
    [{}, ['4:44 PM', '2:34 AM', '12:08 AM', '11:59 PM', '12:00 AM', '12:00 PM']],
    [{ includeMeridiem: true, includeSeconds: true }, ['4:44:50 PM', '2:34:50 AM', '12:08:10 AM', '11:59:59 PM', '12:00:00 AM', '12:00:00 PM']],
    [{ do24hrTime: true }, ['16:44', '02:34', '00:08', '23:59', '00:00', '12:00']],
    [{ do24hrTime: true, includeMeridiem: true }, ['16:44', '02:34', '00:08', '23:59', '00:00', '12:00']],
    [{ includeSeconds: true, do24hrTime: true, includeMeridiem: true }, ['16:44:50', '02:34:50', '00:08:10', '23:59:59', '00:00:00', '12:00:00']],
  ])('%o', (opts, expected) => {
    expect(inputs.map((i) => toTime(unix(i), opts))).toEqual(expected)
  })
  it.each([
    ['Tue Dec 23 2014 16:44:50', 'December'],
    ['Tue Jan 23 2014 02:34:50', 'January'],
    ['Thu Feb 25 2014 00:08:10', 'February'],
    ['Thu Mar 24 2014 23:59:59', 'March'],
    ['Thu Apr 25 2014 00:00:00', 'April'],
    ['Thu May 25 2014 12:00:00', 'May'],
  ])('a custom time format overrides the defaults: %s is %s', (input, expected) => {
    expect(toTime(unix(input), { timeFormat: 'MMMM', includeMeridiem: true, includeSeconds: true })).toEqual(expected)
  })
})

describe('maybeGetRelativeDay and prettifyDateString (en-US)', () => {
  const baseTime = new Date('2015-04-30T07:41:00')
  beforeEach(() => at(baseTime))
  it('throws for invalid dates', () => {
    expect(() => maybeGetRelativeDay('aaa')).toThrow()
  })
  it.each([
    ['Today', -1000, false],
    ['today', -1000, true],
    ['Yesterday', -24 * 60 * 60 * 1000, false],
    ['yesterday', -24 * 60 * 60 * 1000, true],
    ['Tomorrow', 24 * 60 * 60 * 1000, false],
    ['tomorrow', 24 * 60 * 60 * 1000, true],
    [undefined, -2 * 24 * 60 * 60 * 1000, false],
  ] as const)('%s', (expected, offset, uncapitalized) => {
    expect(maybeGetRelativeDay((baseTime.getTime() + offset) / 1000, { uncapitalized })).toBe(expected)
    expect(prettifyDateString((baseTime.getTime() + offset) / 1000, { uncapitalized })).toBe(expected ?? '')
  })
  it('returns the fallback string for older dates', () => {
    expect(prettifyDateString((baseTime.getTime() - 2 * 86_400_000) / 1000, { fallbackString: 'test' })).toBe('test')
  })
})

describe('getThreadTimestampFormat (get-thread-timestamp-format.jest.ts)', () => {
  const current = new Date('2024-07-11 04:39:14')
  const minus = (ms: number) => new Date(current.getTime() - ms)
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR
  it('when less than 60 seconds', () => expect(getThreadTimestampFormat(current, true, current)).toBe('Just now'))
  it('when less than 60 minutes', () => expect(getThreadTimestampFormat(minus(40 * MIN), true, current)).toBe('40 minutes ago'))
  it('when earlier today', () => expect(getThreadTimestampFormat(minus(4 * HOUR), false, current)).toBe('Today at 12:39 AM'))
  it('when earlier today with time24', () => expect(getThreadTimestampFormat(minus(4 * HOUR), true, current)).toBe('Today at 00:39'))
  it('when yesterday', () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    expect(getThreadTimestampFormat(yesterday, false, now)).toBe(`Yesterday at ${toTime(yesterday)}`)
  })
  it('when within the last week', () => expect(getThreadTimestampFormat(minus(6 * DAY), false, current)).toBe('Friday at 4:39 AM'))
  it('when within the last week with time24', () => expect(getThreadTimestampFormat(minus(6 * DAY), true, current)).toBe('Friday at 04:39'))
  it('when earlier this year', () => expect(getThreadTimestampFormat(new Date('2024-01-11 04:39:14'), false, current)).toBe('Jan 11th at 4:39 AM'))
  it('when in previous years', () => expect(getThreadTimestampFormat(new Date('2018-07-11 04:39:14'), false, current)).toBe('Jul 11th, 2018 at 4:39 AM'))
  it('goes Just now → 7 minutes ago → 1 hour ago → Today at …', () => {
    expect(getThreadTimestampFormat(minus(59_000), false, current)).toBe('Just now')
    expect(getThreadTimestampFormat(minus(7 * MIN), false, current)).toBe('7 minutes ago')
    expect(getThreadTimestampFormat(minus(50 * MIN), false, current)).toBe('1 hour ago')
    expect(getThreadTimestampFormat(minus(2 * HOUR + 14 * MIN), false, current)).toBe('Today at 2:25 AM')
  })
})

describe('getFullTimestamp (get-full-timestamp.ts)', () => {
  beforeEach(() => at('Sep 25 2026 18:00:00'))
  it.each([
    ['Sep 25 2026 17:53:25', 'Today at 5:53:25 PM'],
    ['Sep 24 2026 09:02:03', 'Yesterday at 9:02:03 AM'],
    ['Sep 22 2026 17:53:25', 'Sep 22nd at 5:53:25 PM'],
    ['Aug 5 2025 17:53:25', 'Aug 5th, 2025 at 5:53:25 PM'],
  ])('%s → %s', (input, expected) => {
    expect(getFullTimestamp({ timestamp: new Date(input) })).toBe(expected)
  })
  it('shows the weekday on request and drops seconds for full timestamps', () => {
    expect(getFullTimestamp({ timestamp: new Date('Sep 22 2026 17:53:25'), showWeekday: true, includeSeconds: false })).toBe('Tuesday, September 22nd at 5:53 PM')
  })
})
