import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

// UIDatePicker, .wheels style (the Custom row's date picker, NotificationsPausePresenter.swift:150-163,
// preferredDatePickerStyle: .wheels), and UIPickerView. UIKit draws them, so this is an approximation of the system
// controls: wheels (day, hour, minute, AM/PM; or hour, minute, AM/PM in .time mode) in UIPickerView's 216 pt frame,
// 32 pt rows, the selected row on a rounded tertiarySystemFill band, rows dimming toward the wheel's edges; dragging
// scrolls a wheel and it settles on a row. Dates before `min` spring back to it, as the system picker does with
// minimumDate; `minuteInterval` (UIDatePicker.minuteInterval) steps the minute wheel.

const ROW = 32
const HEIGHT = 216
const PAD = (HEIGHT - ROW) / 2
const DAYS = 90
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  value: Date
  /** the earliest date (dateAndTime mode) */
  min?: Date
  onChange: (d: Date) => void
  /** UIDatePicker.Mode: .dateAndTime (default) or .time */
  mode?: 'dateAndTime' | 'time'
  /** UIDatePicker.minuteInterval (default 1) */
  minuteInterval?: number
}

export function DateWheels({ value, min, onChange, mode = 'dateAndTime', minuteInterval = 1 }: Props) {
  const floor = min ?? new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const start = new Date(floor.getFullYear(), floor.getMonth(), floor.getDate())
  const days = Array.from({ length: DAYS }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const dayIndex = Math.max(0, Math.round((new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime() - start.getTime()) / 86_400_000))
  const h24 = value.getHours()
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12
  const pm = h24 >= 12
  const minutes = Array.from({ length: Math.ceil(60 / minuteInterval) }, (_, i) => i * minuteInterval)
  const minuteIndex = Math.max(0, minutes.findIndex((m) => m >= value.getMinutes() - (value.getMinutes() % minuteInterval)))

  const commit = (dayI: number, hour: number, minute: number, isPm: boolean) => {
    const d = mode === 'time' ? value : days[Math.max(0, Math.min(DAYS - 1, dayI))]
    const hh = (hour % 12) + (isPm ? 12 : 0)
    let next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, minute, 0)
    if (mode !== 'time' && min && next < min) next = new Date(min)
    onChange(next)
  }

  return (
    <div className={`you-wheels${mode === 'time' ? ' is-time' : ''}`} data-no-swipe>
      <div className="you-wheels__band" />
      {mode !== 'time' && (
        <Wheel
          className="is-day"
          items={days.map((d, i) => (i === 0 && sameDay(d, new Date()) ? 'Today' : `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`))}
          index={dayIndex}
          align="right"
          onSelect={(i) => commit(i, hour12, value.getMinutes(), pm)}
        />
      )}
      <Wheel className="is-hour" items={Array.from({ length: 12 }, (_, i) => String(i + 1))} index={hour12 - 1} align="right" onSelect={(i) => commit(dayIndex, i + 1, value.getMinutes(), pm)} />
      <Wheel className="is-minute" items={minutes.map((m) => String(m).padStart(2, '0'))} index={minuteIndex} align="left" onSelect={(i) => commit(dayIndex, hour12, minutes[i], pm)} />
      <Wheel className="is-meridiem" items={['AM', 'PM']} index={pm ? 1 : 0} align="left" onSelect={(i) => commit(dayIndex, hour12, value.getMinutes(), i === 1)} />
    </div>
  )
}

/** UIPickerView with one component (NotificationTimingPickerRow.swift:45-121): one centered wheel of titles. */
export function PickerWheel({ items, index, onSelect }: { items: string[]; index: number; onSelect: (i: number) => void }) {
  return (
    <div className="you-wheels is-single" data-no-swipe>
      <div className="you-wheels__band" />
      <Wheel className="is-single" items={items} index={index} align="center" onSelect={onSelect} />
    </div>
  )
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function Wheel({ items, index, align, onSelect, className }: { items: string[]; index: number; align: 'left' | 'right' | 'center'; onSelect: (i: number) => void; className?: string }) {
  const [offset, setOffset] = useState(index * ROW)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ y: number; o: number; t: number; v: number } | null>(null)
  const max = (items.length - 1) * ROW

  // Follow the value when it changes elsewhere (clamped to the minimum date).
  useEffect(() => {
    if (!drag.current) setOffset(index * ROW)
  }, [index])

  const settle = (o: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(o / ROW)))
    setOffset(i * ROW)
    if (i !== index) onSelect(i)
  }
  const scale = (e: ReactPointerEvent) => {
    const el = e.currentTarget as HTMLElement
    return el.getBoundingClientRect().height / el.offsetHeight || 1
  }
  const onDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { y: e.clientY, o: offset, t: performance.now(), v: 0 }
    setDragging(true)
  }
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = (e.clientY - d.y) / scale(e)
    const now = performance.now()
    const next = d.o - dy
    d.v = (next - offset) / Math.max(1, now - d.t)
    d.t = now
    // rubber-band past the ends
    setOffset(next < 0 ? next / 3 : next > max ? max + (next - max) / 3 : next)
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    setDragging(false)
    if (!d) return
    settle(Math.max(0, Math.min(max, offset + d.v * 180)))
  }

  return (
    <div
      className={`you-wheel ${className ?? ''}`}
      style={{ height: HEIGHT }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onWheel={(e) => settle(Math.max(0, Math.min(max, offset + Math.sign(e.deltaY) * ROW)))}
      data-no-drag
    >
      <div className={`you-wheel__rows${dragging ? ' is-dragging' : ''}`} style={{ transform: `translateY(${PAD - offset}px)`, textAlign: align }}>
        {items.map((label, i) => {
          const dist = Math.abs(i * ROW - offset) / ROW
          if (dist > 4) return <div key={i} className="you-wheel__row" />
          return (
            // a cylinder seen from the front: rows away from the band are squashed by cos(angle) and fade
            <div key={i} className={`you-wheel__row${dist < 0.5 ? ' is-selected' : ''}`} style={{ opacity: Math.max(0.25, 1 - dist * 0.22), transform: `scaleY(${Math.cos(Math.min(1.2, dist * 0.33)).toFixed(3)})` }} onClick={() => settle(i * ROW)}>
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
