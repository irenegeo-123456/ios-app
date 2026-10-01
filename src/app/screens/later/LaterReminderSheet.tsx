import { useMemo } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SKEntityRow, SKListFooter, SKListHeader } from '../../../slackkit/SKEntity'
import { friendlyReminderTitle, suggestedReminderDates } from './time'
import './later.css'

// The reminder picker a Later row's ⏰ button and "Set reminder" / "Edit reminder" / "Snooze" open
// (TasksCustomReminder/*; spec dms-activity.md §6): an SKBottomSheet sized to its list. From the Later list it has the
// presets, the suggested times and "Custom date and time" (+ "Clear Due Date" when a reminder is set), no accessory
// dates (TasksCustomReminderFeature.swift:42-46): a .medium header with a hairline under it, then .small generic rows
// (TasksCustomReminderPresenter.swift:57-80, :140-260).

interface Props extends SheetProps {
  conversationId: string
  ts: string
  /** the current reminder, if any */
  due?: string
  overdue?: boolean
}

/** CommonPresets (TasksCustomReminderPresenter.swift:147-172): "In …", or "For …" to snooze an overdue item. */
const PRESETS = [
  { minutes: 30, title: 'In 30 minutes', snooze: 'For 30 minutes' },
  { minutes: 60, title: 'In 1 hour', snooze: 'For 1 hour' },
  { minutes: 180, title: 'In 3 hours', snooze: 'For 3 hours' },
]

export function LaterReminderSheet({ conversationId, ts, due, overdue }: Props) {
  const sheet = useSheet()
  const setLaterDue = useApp((s) => s.setLaterDue)
  const showToast = useApp((s) => s.showToast)
  const now = useMemo(() => new Date(), [])
  const suggested = useMemo(() => suggestedReminderDates(now), [now])
  // TitleType (:19-44): Snooze when overdue, Edit reminder when one is set, else Set a reminder
  const title = overdue ? 'Snooze' : due ? 'Edit reminder' : 'Set a reminder'

  const choose = (d: Date) =>
    sheet?.dismiss(() => {
      // timestamp(from:) rounds up to the second (:274-276); updateDueDate → "Reminder Updated"
      setLaterDue(conversationId, ts, String(Math.ceil(d.getTime() / 1000)))
      showToast('Reminder Updated', 'toast_checkmark')
    })
  const clear = () =>
    sheet?.dismiss(() => {
      setLaterDue(conversationId, ts, null)
      showToast('Reminder Removed', 'toast_checkmark')
    })

  return (
    <div className="later-reminder" data-qa="later_reminder_sheet">
      <SKListHeader title={title} collapsible={false} className="later-reminder__header" />
      <SKListFooter />
      {PRESETS.map((p) => (
        <SKEntityRow key={p.minutes} title={overdue ? p.snooze : p.title} onClick={() => choose(new Date(now.getTime() + p.minutes * 60_000))} />
      ))}
      {suggested.map((d) => (
        <SKEntityRow key={d.getTime()} title={friendlyReminderTitle(d, now)} onClick={() => choose(d)} />
      ))}
      {/* the date and time wheels aren't in the prototype */}
      <SKEntityRow title="Custom date and time" onClick={() => showToast('Not in the prototype')} />
      {due && <SKEntityRow title={<span className="later-reminder__clear">Clear Due Date</span>} onClick={clear} />}
    </div>
  )
}
