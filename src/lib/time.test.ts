import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ariaTime, clockTime, dayLabel, longDate, makeTs, relativeTime, shortClock, stringifyTime } from './time'

const ts = (s: string) => makeTs(new Date(s))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('Sep 25 2026 13:32:00'))
})
afterEach(() => vi.useRealTimers())

describe('message list timestamps', () => {
  it('clock times', () => {
    expect(clockTime(ts('Sep 25 2026 17:53:25'))).toBe('5:53 PM')
    expect(shortClock(ts('Sep 25 2026 17:54:00'))).toBe('5:54')
    expect(stringifyTime(ts('Sep 25 2026 00:05:00'))).toBe('[12:05 AM]')
  })

  it('day dividers', () => {
    expect(dayLabel(ts('Sep 25 2026 09:00:00'))).toBe('Today')
    expect(dayLabel(ts('Sep 24 2026 09:00:00'))).toBe('Yesterday')
    expect(dayLabel(ts('Sep 22 2026 09:00:00'))).toBe('Tuesday, September 22nd')
    expect(dayLabel(ts('Aug 5 2025 09:00:00'))).toBe('August 5th, 2025')
  })

  it('aria-labels (getFullTimestamp)', () => {
    expect(ariaTime(ts('Sep 25 2026 13:25:09'))).toBe('Today at 1:25:09 PM')
    expect(ariaTime(ts('Sep 22 2026 17:53:25'))).toBe('Sep 22nd at 5:53:25 PM')
  })

  it('thread times go Just now → 7 minutes ago → Today at 1:25 PM', () => {
    expect(relativeTime(ts('Sep 25 2026 13:31:30'))).toBe('Just now')
    expect(relativeTime(ts('Sep 25 2026 13:25:00'))).toBe('7 minutes ago')
    expect(relativeTime(ts('Sep 25 2026 12:25:00'))).toBe('Today at 12:25 PM')
    expect(relativeTime(ts('Sep 24 2026 13:25:00'))).toBe('Yesterday at 1:25 PM')
    expect(relativeTime(ts('Sep 21 2026 13:25:00'))).toBe('Monday at 1:25 PM')
    expect(relativeTime(ts('Aug 21 2026 13:25:00'))).toBe('Aug 21st at 1:25 PM')
  })

  it('channel intro dates', () => {
    expect(longDate('2018-01-10')).toBe('January 10th, 2018')
  })
})
