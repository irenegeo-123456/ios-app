import { describe, expect, it } from 'vitest'
import { expiryDate, expiryFromServer, expiryLabel, formatCustomExpiry, nextHalfHour } from './status'

// ExpiryDuration (Modules/Data/DataModels/Implementation/Constants/ExpiryDuration.swift) and the "Clear after…" row's
// custom format (DateFormattingUtilities "{date_pretty} {time}").

const wed = new Date(2026, 8, 30, 14, 10, 0) // Wednesday, September 30 2026, 2:10 PM
/** TimeUtility's h:mm a puts a no-break space before AM / PM */
const t = (s: string) => s.replace(' AM', '\u00a0AM').replace(' PM', '\u00a0PM')

describe('status expiry', () => {
  it('maps the server preset durations', () => {
    expect(expiryFromServer('1_hour')).toBe('oneHour')
    expect(expiryFromServer('all_day')).toBe('today')
    expect(expiryFromServer('no_expiration')).toBe('dontClear')
    expect(expiryFromServer('this_week')).toBe('thisWeek')
    expect(expiryFromServer('custom')).toBeNull()
  })

  it('ends today at 11:59:59 PM and this week on Friday at 11:59:59 PM', () => {
    expect(expiryDate('today', wed)).toEqual(new Date(2026, 8, 30, 23, 59, 59))
    expect(expiryDate('thisWeek', wed)).toEqual(new Date(2026, 9, 2, 23, 59, 59))
    expect(expiryDate('thirtyMinutes', wed)).toEqual(new Date(2026, 8, 30, 14, 40, 0))
    expect(expiryDate('dontClear', wed)).toBeNull()
  })

  it('formats a custom end time', () => {
    expect(formatCustomExpiry(new Date(2026, 8, 30, 17, 0), wed)).toBe(t('Today 5:00 PM'))
    expect(formatCustomExpiry(new Date(2026, 9, 1, 9, 30), wed)).toBe(t('Tomorrow 9:30 AM'))
    expect(formatCustomExpiry(new Date(2026, 9, 6, 17, 0), wed)).toBe(t('October 6th 5:00 PM'))
    expect(formatCustomExpiry(new Date(2027, 5, 1, 17, 0), wed)).toBe(t('June 1st, 2027 5:00 PM'))
    expect(formatCustomExpiry(new Date(2026, 8, 30, 9, 0), wed)).toBe('')
    expect(expiryLabel('fourHours', wed)).toBe('4 hours')
  })

  it('starts custom times at the next half hour', () => {
    expect(nextHalfHour(wed)).toEqual(new Date(2026, 8, 30, 14, 30, 0))
    expect(nextHalfHour(new Date(2026, 8, 30, 14, 40))).toEqual(new Date(2026, 8, 30, 15, 0, 0))
  })
})
