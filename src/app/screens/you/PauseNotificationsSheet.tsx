import { useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SKRadioButton } from '../../../slackkit/SKRadioButton'
import { SKSwitch } from '../../../slackkit/SKSwitch'
import { EntityRow, SectionFooter, BlankDivider } from '../more/EntityRow'
import { SheetNavBar } from './SheetNavBar'
import { DateWheels } from './DateWheels'
import { PRESETS, defaultStartTime, isPaused, pauseStatusString, presetEnd, shortOrdinal, usePause, type PausePreset } from './pause'

// Pause Notifications (Modules/Features/NotificationsPause/Implementation, spec shell-navigation.md §4.5): a form sheet in
// a navigation controller titled "Pause Notifications" (pause_notifications, 14615), the close button on the left and
// "Save" (save, 16880) on the right, on basePrimary (NotificationsPauseViewController.swift:25; slack-objc 14b3cbaf).
// Since September nothing is chosen when the sheet opens (June preselected 30 minutes) and Save stays disabled until a
// preset is picked or the custom date is moved (shouldEnableSaveButton: chosenPauseTime != nil,
// NotificationsPauseInteractor.swift:171-177, :184-252; NotificationsPausePresenter.swift:224-229). Sections
// (NotificationsPausePresenter.swift:37-90), with the VIP switch showing:
//
//   Resume notifications   only while paused; sk_raspberry_red (still a legacy color, :133-134), the end time below
//                                                                                           footer: hairline
//   30 minutes … Until next week   radio rows (none on until you pick one)                  header: blank divider
//   Custom                 a radio row; tapping it opens a wheels date picker below it       footer: hairline
//   Always allow notifications from VIPs   a switch
//
// Picking a preset only moves the radio; Save pauses (toast: the end time) and Resume resumes (toast "Notifications
// resumed"), and both dismiss (NotificationsPauseInteractor.swift:254-296, NotificationsPauseFeature.swift:78-81).

type Choice = { kind: 'preset'; id: PausePreset } | { kind: 'custom'; date: Date }

export function PauseNotificationsSheet(_props: SheetProps) {
  const sheet = useSheet()
  const showToast = useApp((s) => s.showToast)
  const dismissSheet = useApp((s) => s.dismissSheet)
  const { until, vipBreakthrough, pause, resume, setVipBreakthrough } = usePause()
  // nothing chosen until you pick (NotificationsPauseInteractor.swift:173: chosenPauseTime starts nil)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [picker, setPicker] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const paused = isPaused(until)
  const now = new Date()

  const close = () => (sheet ? sheet.dismiss() : dismissSheet())
  const save = () => {
    if (!choice) return
    const end = choice.kind === 'preset' ? presetEnd(choice.id) : choice.date
    pause(end)
    // presentSuccessAlert: the pause status string with toast_checkmark (NotificationsPauseInteractor.swift:352-360)
    showToast(pauseStatusString(end), 'toast_checkmark')
    close()
  }
  const resumeNow = () => {
    resume()
    showToast('Notifications resumed', 'toast_checkmark')
    close()
  }
  const selectPreset = (id: PausePreset) => {
    setPicker(false)
    setChoice({ kind: 'preset', id })
  }
  const selectCustom = () => {
    // handleCustomPause: the picker opens at defaultStartTime (the next half hour) and nothing is chosen until its date
    // changes (setChosenPauseTime(nil), NotificationsPauseInteractor.swift:203-212, :214-250)
    if (!picker) {
      setPicker(true)
      setChoice(null)
    }
  }
  const [pickerDate, setPickerDate] = useState<Date | null>(null)
  const customDate = choice?.kind === 'custom' ? choice.date : (pickerDate ?? defaultStartTime())
  const customSubtitle =
    picker && choice?.kind === 'custom'
      ? shortOrdinal(choice.date, { excludeYear: false, includeTime: true, includeDayOfWeek: false, shortMonthFormat: true })
      : undefined

  return (
    <div className="you-pause" data-screen="pause-notifications">
      <div className="ios-scroll you-pause__list" onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)} data-sheet-scroll>
        {paused && until !== null && (
          <section>
            {/* header .blankDivider(): hidden as the first section */}
            <EntityRow
              size="small"
              title="Resume notifications"
              titleColor="var(--sk_raspberry_red)"
              titleLines={0}
              subtitle={pauseStatusString(new Date(until), now)}
              subtitleLines={0}
              onClick={resumeNow}
              className="you-pause__resume"
              data-qa="pause_resume"
            />
            <SectionFooter />
          </section>
        )}
        <section>
          {paused && <BlankDivider />}
          {PRESETS.map((p) => {
            const on = choice?.kind === 'preset' && choice.id === p.id
            return (
              <EntityRow
                key={p.id}
                size="small"
                title={p.title}
                accessories={<SKRadioButton isOn={on} onToggled={() => selectPreset(p.id)} accessibilityLabel={p.title} />}
                onClick={() => selectPreset(p.id)}
                data-qa={`pause_${p.id}`}
              />
            )
          })}
          {/* the presets' footer is .none while the VIP switch shows, and the Custom section has no header */}
          <EntityRow
            size="small"
            title="Custom"
            titleLines={0}
            subtitle={customSubtitle}
            accessories={<SKRadioButton isOn={picker} onToggled={selectCustom} accessibilityLabel="Custom" />}
            onClick={selectCustom}
            data-qa="pause_custom"
          />
          {picker && (
            <DateWheels
              value={customDate}
              min={now}
              onChange={(date) => {
                setPickerDate(date)
                setChoice({ kind: 'custom', date })
              }}
            />
          )}
          <SectionFooter />
        </section>
        <section>
          <EntityRow
            size="small"
            title="Always allow notifications from VIPs"
            titleLines={0}
            accessories={<SKSwitch isOn={vipBreakthrough} onToggled={setVipBreakthrough} accessibilityLabel="Always allow notifications from VIPs" />}
            data-qa="pause_vip"
          />
        </section>
        <div className="you-list__bottom" />
      </div>
      <SheetNavBar title={<span className="you-title">Pause Notifications</span>} onClose={close} trailing={{ title: 'Save', onClick: save, disabled: !choice }} scrolled={scrollY > 0} />
    </div>
  )
}
