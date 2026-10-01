import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { useSheet } from '../../app/nav/SheetHost'
import { SKButton } from '../../slackkit'
import { isoDate, parseIsoDate, timeToDate } from '../format'
import { settle } from '../present'

// The date / time sheet (spec blockkit.md §5.3; Modules/Features/DateTimePicker/Implementation/DateTimePickerViewController.swift:
// 42-46,186-259, DateTimePickerPresenter.swift:26-33): Sept presents it as a native sheet with one self-sized detent
// and the grabber (DateTimePickerFeature.swift:52-63; June: Slack's SKBottomSheet unless bottomsheetMigration). The
// date is clamped to min / max (:268-277). A header row — "Select
// a date" / "Select a time" / "Select a date and time" (Lato Bold 15) and "Done" (Lato Bold 17, content_highlight_1) —
// then UIKit's UIDatePicker (inline calendar for dates, wheels for times) tinted content_highlight_1, then an outline
// "Clear" button; margins 20 / 16 / 12 / 16, 12 pt apart. The choice applies on Done.
//
// The calendar is UIKit's; it's drawn from DateTimePickerSnapshotTests/testScreenshotDate@3x.png and
// testScreenshotDateAndTime@3x.png (measured): the month label 37 pt below the picker's top, weekday symbols (13 pt
// semibold caps, tertiaryLabel) 42.5 below it, day rows 45.7 apart and columns 45.25 apart centered on the sheet, SF
// Pro 20 digits, the chosen day bold in the tint on a 44 pt circle of the tint at 12 %; date + time adds a "Time" row
// with the time in a capsule. Time wheels have no snapshot: they follow UIKit's 216 pt wheel picker.

type Mode = 'date' | 'time' | 'datetime'
type Props = { sheetKey: string; resultId?: string; mode?: Mode; value?: string | number | null; timezone?: string }

const TITLES: Record<Mode, string> = { date: 'Select a date', time: 'Select a time', datetime: 'Select a date and time' }
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n: number) => String(n).padStart(2, '0')

function initialDate(mode: Mode, value: Props['value']): Date {
  if (mode === 'date' && typeof value === 'string') return parseIsoDate(value) ?? new Date()
  if (mode === 'time' && typeof value === 'string') return timeToDate(value) ?? new Date()
  if (mode === 'datetime' && typeof value === 'number') return new Date(value * 1000)
  return new Date()
}

export function DateTimeSheet({ sheetKey, resultId, mode = 'date', value }: Props) {
  const sheet = useSheet()
  const [date, setDate] = useState(() => initialDate(mode, value))
  const [wheels, setWheels] = useState(mode === 'time')
  const closing = !!sheet?.closing
  useEffect(() => {
    if (closing) settle(resultId, null)
  }, [closing, resultId])
  const finish = (v: string | number | null) => {
    settle(resultId, { value: v })
    if (sheet) sheet.dismiss()
    else useApp.getState().dismissSheet(sheetKey)
  }
  const done = () => finish(mode === 'date' ? isoDate(date) : mode === 'time' ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : Math.floor(date.getTime() / 1000))

  return (
    <div className="bk-datetime">
      <div className="bk-datetime__header">
        <span className="bk-datetime__title">{TITLES[mode]}</span>
        <button type="button" className="bk-datetime__done" onClick={done} data-tap>
          Done
        </button>
      </div>
      {mode !== 'time' && <Calendar date={date} onChange={setDate} />}
      {mode === 'datetime' && (
        <div className="bk-datetime__time-row">
          <span>Time</span>
          <button type="button" className={`bk-datetime__time-pill${wheels ? ' is-open' : ''}`} onClick={() => setWheels((w) => !w)} data-tap>
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </button>
        </div>
      )}
      {wheels && <TimeWheels date={date} onChange={setDate} />}
      {/* "Clear" (clear, yaml:3871): an outline medium SKButton as wide as the picker */}
      <SKButton title="Clear" buttonStyle="outlineDefault" size="medium" className="bk-button is-fill bk-datetime__clear" onClick={() => finish(null)} />
    </div>
  )
}

function Calendar({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const [month, setMonth] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1))
  const today = new Date()
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const cells: (number | null)[] = Array.from({ length: first.getDay() }, () => null)
    for (let d = 1; d <= count; d++) cells.push(d)
    // UIKit keeps six rows so the picker doesn't change height between months
    while (cells.length < 42) cells.push(null)
    return cells
  }, [month])
  const same = (d: number, ref: Date) => ref.getFullYear() === month.getFullYear() && ref.getMonth() === month.getMonth() && ref.getDate() === d
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
  return (
    <div className="bk-calendar">
      <div className="bk-calendar__head">
        <span className="bk-calendar__month">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
          <svg className="bk-calendar__chevron" width="9" height="15" viewBox="0 0 9 15" aria-hidden>
            <path d="M1.5 1.5 7.5 7.5l-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="bk-calendar__nav">
          <button type="button" aria-label="Previous Month" onClick={() => shift(-1)} data-tap>
            <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
              <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" aria-label="Next Month" onClick={() => shift(1)} data-tap>
            <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
              <path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </span>
      </div>
      <div className="bk-calendar__weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="bk-calendar__grid">
        {days.map((d, i) =>
          d === null ? (
            <span key={i} className="bk-calendar__day is-empty" />
          ) : (
            <button
              key={i}
              type="button"
              className={['bk-calendar__day', same(d, date) && 'is-selected', same(d, today) && 'is-today'].filter(Boolean).join(' ')}
              onClick={() => onChange(new Date(month.getFullYear(), month.getMonth(), d, date.getHours(), date.getMinutes()))}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

const ROW = 32
const VISIBLE = 216

/** UIDatePicker .wheels for time: hours, minutes, AM / PM; the row under the selection band is the value. */
function TimeWheels({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const h12 = date.getHours() % 12 || 12
  const pm = date.getHours() >= 12
  const set = (hour12: number, minute: number, isPm: boolean) => {
    const d = new Date(date)
    d.setHours((hour12 % 12) + (isPm ? 12 : 0), minute, 0, 0)
    onChange(d)
  }
  return (
    <div className="bk-wheels" style={{ height: VISIBLE }}>
      <div className="bk-wheels__band" />
      <Wheel items={Array.from({ length: 12 }, (_, i) => String(i + 1))} index={h12 - 1} onIndex={(i) => set(i + 1, date.getMinutes(), pm)} align="end" />
      <Wheel items={Array.from({ length: 60 }, (_, i) => pad(i))} index={date.getMinutes()} onIndex={(i) => set(h12, i, pm)} />
      <Wheel items={['AM', 'PM']} index={pm ? 1 : 0} onIndex={(i) => set(h12, date.getMinutes(), i === 1)} align="start" />
    </div>
  )
}

function Wheel({ items, index, onIndex, align = 'center' }: { items: string[]; index: number; onIndex: (i: number) => void; align?: 'start' | 'center' | 'end' }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW
  }, [index])
  const onScroll = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)))
      el.scrollTo({ top: i * ROW, behavior: 'smooth' })
      if (i !== index) onIndex(i)
    }, 120)
  }
  const pad = (VISIBLE - ROW) / 2
  return (
    <div ref={ref} className={`bk-wheel ios-scroll is-${align}`} onScroll={onScroll} data-sheet-scroll>
      <div style={{ height: pad }} />
      {items.map((t, i) => (
        <div key={t} className={`bk-wheel__item${i === index ? ' is-selected' : ''}`} style={{ height: ROW }} onClick={() => onIndex(i)}>
          {t}
        </div>
      ))}
      <div style={{ height: pad }} />
    </div>
  )
}
