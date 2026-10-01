import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { showAlert } from '../../sheets/ui/Alert'
import { openMenu } from '../../sheets/ui/Menu'
import { conversationTitle } from '../../sheets/shared'
import { playSound } from '../../../lib/sounds'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { ModalPage, useModalNav } from '../you/ModalStack'
import { Blank, NavRow, RadioRow, SectionFooter, SectionHeader, SwitchRow, iconOrnament } from '../you/SettingsRows'
import { DateWheels, PickerWheel } from '../you/DateWheels'
import { MultiLineInput } from '../you/MultiLineInput'
import { memberIds } from './NotificationsRoot'
import {
  MINUTES,
  SOUND_OPTIONS,
  WEEKDAYS,
  effectiveLevel,
  effectiveMobile,
  formatHHmm,
  fromHHmm,
  hasMobileOverrides,
  isChannelLike,
  isCustomized,
  notificationSummary,
  resetConversation,
  toHHmm,
  useNotificationPrefs,
  type NoiseLevel,
  type PushIdleWait,
  type Weekday,
} from './prefs'
import './notifications.css'

// The screens Notifications pushes (spec you-settings.md §3.2-§3.9). Each saves as soon as you change it (no Save button)
// except Keywords, which saves when you leave it.

const mentions = (l: NoiseLevel) => l !== 'everything'

/** "Your desktop and mobile notifications don’t match.\n<link>Edit Mobile Overrides</link>": a small warning banner,
 *  its .caption text with the link span bold in highlight1.content (NotificationGlobalDefaultsPresenter.swift:28-55;
 *  slack-objc 14b3cbaf — June: sk_primary_foreground / sk_highlight). */
export function OverridesBanner({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="ns-banner">
      <SKBanner
        type="small"
        tone="warning"
        ornament="hidden"
        isSelectable
        onSelected={onSelect}
        text={
          <span className="ns-banner__text">
            Your desktop and mobile notifications don’t match.
            <br />
            <span className="ns-banner__link">Edit Mobile Overrides</span>
          </span>
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------------- What to notify you about

/** NotificationGlobalDefaults: "Let you know about" Everything / Mentions and direct messages (Presenter 57-119). */
export function GlobalDefaultsPage() {
  const nav = useModalNav()
  const p = useNotificationPrefs()
  const overrides = hasMobileOverrides(p.desktop, p.mobile)
  const choose = (desktop: NoiseLevel) => {
    // saveGlobalNotificationPrefs: mobile follows when it was equal (NotificationPreferencesService.swift:209-222)
    const follow = p.mobile === p.desktop || (p.mobile === 'mentions_dms' && p.desktop === 'nothing')
    p.set({ desktop, ...(follow ? { mobile: desktop } : {}) })
  }
  return (
    <ModalPage title={<SKNavigationTitle title="What to notify you about" />} data-screen="notifications-global">
      {overrides && (
        <>
          <Blank />
          <OverridesBanner onSelect={() => nav.push('notifications-overrides')} />
        </>
      )}
      <SectionHeader title="Let you know about" />
      <RadioRow icon="notifications_all_new_posts" title="Everything" isOn={p.desktop === 'everything'} onSelect={() => choose('everything')} />
      <RadioRow icon="notifications" title="Mentions and direct messages" isOn={mentions(p.desktop)} onSelect={() => choose('mentions_dms')} />
      {p.mobile !== 'nothing' && (
        <>
          <SectionFooter />
          <NavRow icon="mobile_notification" title="Mobile notification overrides" onSelect={() => nav.push('notifications-overrides')} />
        </>
      )}
    </ModalPage>
  )
}

// ------------------------------------------------------------------------------------------- Push overrides

/**
 * CustomizeMobileNotifications ("Push overrides", mobile_overrides 11688): the mobile level, globally or for one
 * conversation (then subtitled with its name). The option matching desktop says "Same as desktop"; picking the other
 * asks "Are you sure?" first (CustomizeMobileNotificationsPresenter.swift:30-71, Interactor 77-134).
 */
export function PushOverridesPage({ conversationId }: { conversationId?: string }) {
  const p = useNotificationPrefs()
  const conv = useApp((s) => (typeof conversationId === 'string' ? s.fx.conversations[conversationId] : undefined))
  const fx = useApp((s) => s.fx)
  const desktop: NoiseLevel = conv ? (effectiveLevel(conv, p.desktop) === 'all' ? 'everything' : 'mentions_dms') : p.desktop === 'nothing' ? 'mentions_dms' : p.desktop
  const mobile: NoiseLevel = conv ? effectiveMobile(conv, p.desktop, p.mobile, p.conversations[conv.id]) : p.mobile
  const write = (level: NoiseLevel) => (conv ? p.setConversation(conv.id, { mobile: level }) : p.set({ mobile: level }))
  const pick = (level: NoiseLevel) => {
    if (level === mobile) return
    if (level === desktop) return write(level)
    showAlert({
      title: 'Are you sure?',
      message: 'That means your mobile and desktop notifications will be different.',
      actions: [
        { title: 'Cancel', style: 'cancel' },
        { title: 'Save', onPress: () => write(level) },
      ],
    })
  }
  const options: [NoiseLevel, string][] = conv
    ? [
        ['everything', 'All new posts'],
        ['mentions_dms', 'Just mentions'],
      ]
    : [
        ['everything', 'Everything'],
        ['mentions_dms', 'Mentions and direct messages'],
      ]
  return (
    <ModalPage title={<SKNavigationTitle title="Push overrides" subtitle={conv ? channelName(fx, conv) : undefined} />} data-screen="notifications-overrides">
      <SectionHeader title="Mobile notification overrides" secondary="Impacts your mobile push notifications only, not Activity updates in Slack, or desktop notifications." />
      {options.map(([level, title]) => (
        <RadioRow key={level} title={title} subtitle={level === desktop ? 'Same as desktop' : undefined} isOn={mobile === level} onSelect={() => pick(level)} />
      ))}
    </ModalPage>
  )
}

/** Conversation.nameWithIconPrefix: "#name" for channels, the plain name otherwise. */
export const channelName = (fx: ReturnType<typeof useApp.getState>['fx'], conv: NonNullable<ReturnType<typeof useApp.getState>['fx']['conversations'][string]>) =>
  `${isChannelLike(conv) ? '#' : ''}${conversationTitle(fx, conv)}`

// --------------------------------------------------------------------------------------------------- Timing

/** NotificationTiming ("Timing", timing 20208): "Send notifications:" and, for "After…", a minutes wheel (Presenter 61-184). */
export function TimingPage() {
  const p = useNotificationPrefs()
  const w = p.pushIdleWait
  const keys = Object.keys(MINUTES).map(Number) as Exclude<PushIdleWait, -1 | 0>[]
  return (
    <ModalPage title="Timing" data-screen="notifications-timing">
      <SectionHeader title="Send notifications:" />
      <RadioRow title="Always, even when I’m active" isOn={w === -1} onSelect={() => p.set({ pushIdleWait: -1 })} />
      <RadioRow title="As soon as I’m inactive" isOn={w === 0} onSelect={() => p.set({ pushIdleWait: 0 })} />
      {/* "After I’ve been idle on desktop" writes 1 (one minute) (NotificationTimingInteractor.swift:77-93) */}
      <RadioRow title="After I’ve been idle on desktop" isOn={w > 0} onSelect={() => w <= 0 && p.set({ pushIdleWait: 1 })} />
      {w > 0 && (
        <>
          <SectionFooter />
          <PickerWheel items={keys.map((k) => MINUTES[k])} index={Math.max(0, keys.indexOf(w as (typeof keys)[number]))} onSelect={(i) => p.set({ pushIdleWait: keys[i] })} />
        </>
      )}
    </ModalPage>
  )
}

// ------------------------------------------------------------------------------------------------- Schedule

const DAY_TITLES: Record<Weekday, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }

/** dnd_schedule_info / …_day_disabled: contentSecondary with the "Learn more" link in highlight1.content
 *  (NotificationSchedulePresenter.swift:206-215, NotificationCustomSchedulePresenter.swift:222-229, Text+Display.swift:740-753) */
function ScheduleInfo({ disabled }: { disabled?: boolean }) {
  const showToast = useApp((s) => s.showToast)
  return (
    <SKGenericEntity
      primaryTextNumberOfLines={0}
      primaryText={
        <span className="ns-info">
          {disabled ? 'Turn on notifications to receive notifications in the hours you choose. ' : 'You’ll only receive notifications during the hours you selected. '}
          <span className="ns-info__link" role="link" onClick={() => showToast('Not in the prototype')}>
            Learn more
          </span>
        </span>
      }
    />
  )
}

/** Start / End rows with the time as accessory text; tapping one opens a .wheels .time picker under it (:134-184). */
function HoursRows({ start, end, onChange }: { start: string; end: string; onChange: (patch: { start?: string; end?: string }) => void }) {
  const [editing, setEditing] = useState<'start' | 'end' | null>(null)
  const row = (which: 'start' | 'end', title: string, value: string) => (
    <>
      <SKGenericEntity primaryText={title} accessoryText={formatHHmm(value)} onSelected={() => setEditing(editing === which ? null : which)} accessibilityLabel={`${which === 'start' ? 'Start' : 'End'} notifications at ${formatHHmm(value)}. Tap to edit.`} />
      {editing === which && (
        <div className="ns-picker">
          <DateWheels mode="time" value={fromHHmm(value)} onChange={(d) => onChange({ [which]: toHHmm(d) })} />
        </div>
      )}
    </>
  )
  return (
    <>
      {row('start', 'Start', start)}
      {row('end', 'End', end)}
    </>
  )
}

/** The service keeps the window at least 30 minutes long (DndService.swift:98-134). */
function atLeast30(start: string, end: string, changed: 'start' | 'end'): { start: string; end: string } {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const hhmm = (v: number) => `${String(Math.floor(((v + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((v % 60) + 60) % 60).padStart(2, '0')}`
  if (m(end) - m(start) >= 30) return { start, end }
  return changed === 'start' ? { start, end: hhmm(Math.min(m(start) + 30, 1439)) } : { start: hhmm(Math.max(m(end) - 30, 0)), end }
}

/** NotificationSchedule ("Notification Schedule", 12519): Every day / Weekdays / Custom and the hours (Presenter 62-233). */
export function SchedulePage() {
  const nav = useModalNav()
  const p = useNotificationPrefs()
  const s = p.schedule
  return (
    <ModalPage title="Notification Schedule" className="ns-inset" data-screen="notifications-schedule">
      <SectionHeader title="Allow notifications:" />
      <RadioRow title="Every day" isOn={s.days === 'every_day'} onSelect={() => p.setSchedule({ days: 'every_day' })} />
      <RadioRow title="Weekdays" isOn={s.days === 'weekdays'} onSelect={() => p.setSchedule({ days: 'weekdays' })} />
      <RadioRow title="Custom" isOn={s.days === 'custom'} onSelect={() => p.setSchedule({ days: 'custom' })} />
      <SectionFooter />
      <Blank />
      {s.days === 'custom' ? (
        WEEKDAYS.map((d) => {
          const w = s.perDay[d]
          return <NavRow key={d} title={DAY_TITLES[d]} subtitle={w.on ? `${formatHHmm(w.start)} - ${formatHHmm(w.end)}` : 'Notifications off'} onSelect={() => nav.push('notifications-schedule-day', { day: d })} />
        })
      ) : (
        <HoursRows start={s.start} end={s.end} onChange={(patch) => p.setSchedule(atLeast30(patch.start ?? s.start, patch.end ?? s.end, patch.start ? 'start' : 'end'))} />
      )}
      <SectionFooter />
      <Blank />
      <ScheduleInfo />
    </ModalPage>
  )
}

/** NotificationCustomSchedule: a day's "Notifications" switch and hours (NotificationCustomSchedulePresenter.swift:124-249). */
export function ScheduleDayPage({ day }: { day?: string }) {
  const p = useNotificationPrefs()
  const d = (WEEKDAYS as readonly string[]).includes(day ?? '') ? (day as Weekday) : 'monday'
  const w = p.schedule.perDay[d]
  const toggle = (on: boolean) => {
    // turning off the last day on: "Pick at least one time window…" with Ok (Interactor 130-135)
    if (!on && WEEKDAYS.every((x) => x === d || !p.schedule.perDay[x].on)) {
      showAlert({ message: 'Pick at least one time window to set a schedule. To turn off notifications entirely, adjust your preferences in Notification Settings', actions: [{ title: 'Ok', style: 'cancel' }] })
      return
    }
    p.setDay(d, { on })
  }
  return (
    <ModalPage title={DAY_TITLES[d]} className="ns-inset" data-screen="notifications-schedule-day">
      <Blank />
      <SwitchRow title="Notifications" isOn={w.on} onChange={toggle} />
      <SectionFooter />
      {w.on && (
        <>
          <HoursRows start={w.start} end={w.end} onChange={(patch) => p.setDay(d, atLeast30(patch.start ?? w.start, patch.end ?? w.end, patch.start ? 'start' : 'end'))} />
          <SectionFooter />
        </>
      )}
      <ScheduleInfo disabled={!w.on} />
    </ModalPage>
  )
}

// ---------------------------------------------------------------------------------------------------- Sound

/**
 * NotificationSounds ("Sound", 20502): one section 8 pt down, radio rows with svgSound (svgSoundOff for None) in
 * contentPrimary (June sk_primary_foreground); a pick saves and plays the sound (not None or Device Default)
 * (NotificationSoundsPresenter.swift:44-72, Interactor 48-91).
 * { vip: true } edits the VIP sound (priority_mobile_sound).
 */
export function SoundsPage({ vip }: { vip?: boolean }) {
  const p = useNotificationPrefs()
  const current = vip ? p.vipSound : p.sound
  return (
    <ModalPage title="Sound" data-screen="notifications-sounds">
      <Blank />
      {SOUND_OPTIONS.map((o) => (
        <RadioRow
          key={o.pref}
          ornament={iconOrnament(o.pref === 'none' ? 'sound_off' : 'sound', 'var(--dt_color_content_primary)')}
          title={o.label}
          isOn={current === o.pref}
          onSelect={() => {
            p.set(vip ? { vipSound: o.pref } : { sound: o.pref })
            if (o.pref !== 'none' && o.pref !== 'deviceDefault') playSound(o.pref)
          }}
        />
      ))}
    </ModalPage>
  )
}

// ------------------------------------------------------------------------------------------------- Keywords

/** NotificationKeywords ("Keywords", 9819): a comma-separated field, saved when you leave (Interactor 43-68). */
export function KeywordsPage() {
  const initial = useNotificationPrefs((s) => s.keywords)
  const [text, setText] = useState(initial)
  const latest = useRef(text)
  latest.current = text
  useEffect(
    () => () => {
      // viewWillDisappear: save if it changed
      const s = useNotificationPrefs.getState()
      if (latest.current !== s.keywords) s.set({ keywords: latest.current })
    },
    [],
  )
  return (
    <ModalPage title={<SKNavigationTitle title="Keywords" />} data-screen="notifications-keywords">
      <SectionHeader title="Channel keywords" secondary="These act like mentions and trigger notifications about topics that are important to you." />
      <MultiLineInput value={text} onChange={setText} placeholder="" accessibilityLabel="Keywords" autoFocus={!initial} />
      <SKGenericEntity primaryTextNumberOfLines={0} primaryText={<span className="ns-helper">Use commas to separate each keyword. Keywords are not case sensitive.</span>} />
    </ModalPage>
  )
}

// ------------------------------------------------------------------------------------------------ Exceptions

/**
 * NotificationChannelList ("Channel exceptions" 3738 / "Direct messages exceptions" 5455): your customized conversations,
 * by name; M rows with the name (contentSecondary when muted, else contentPrimary: :119-122, June sk_foreground_max_solid
 * / sk_primary_foreground), the summary, a chevron (not for DMs); a long press offers Reset to default, Go to
 * conversation and Leave channel (NotificationChannelListPresenter.swift:29-165).
 */
export function ExceptionsPage({ kind }: { kind?: string }) {
  const nav = useModalNav()
  const fx = useApp((s) => s.fx)
  const p = useNotificationPrefs()
  const channels = kind !== 'dms'
  const members = memberIds(fx)
  const rows = Object.values(fx.conversations)
    .filter((c) => members.has(c.id) && (channels ? isChannelLike(c) : c.type === 'im' || c.type === 'mpim') && isCustomized(c, p.desktop, p.conversations[c.id]))
    .sort((a, b) => conversationTitle(fx, a).localeCompare(conversationTitle(fx, b)))
  const longPress = (id: string, el: HTMLElement) => {
    const c = useApp.getState().fx.conversations[id]
    if (!c) return
    const leave = () =>
      showAlert({
        title: `Leave ${channelName(fx, c)}?`,
        message: c.type === 'private' ? 'To rejoin, someone must add you to this channel again.' : 'You can rejoin anytime.',
        actions: [
          { title: 'Leave Channel', style: 'destructive', onPress: () => (useApp.getState().leaveConversation(c.id), useApp.getState().showToast(`You’ve left ${channelName(fx, c)}`, 'toast_checkmark')) },
          { title: 'Cancel', style: 'cancel' },
        ],
      })
    openMenu({
      anchor: el,
      title: channelName(fx, c),
      sections: [
        {
          items: [
            { title: 'Reset to default', icon: 'refresh', onSelect: () => (resetConversation(c), useApp.getState().showToast('Reset', 'toast_checkmark')) },
            { title: 'Go to conversation', icon: 'arrow_right_channel', onSelect: () => nav.close(() => useApp.getState().openConversation(c.id)) },
            ...(isChannelLike(c) ? [{ title: 'Leave channel', icon: 'sign_out', destructive: true, onSelect: leave }] : []),
          ],
        },
      ],
    })
  }
  return (
    <ModalPage title={channels ? 'Channel exceptions' : 'Direct messages exceptions'} data-screen="notifications-exceptions">
      {rows.map((c) => {
        const color = c.muted ? 'var(--dt_color_content_secondary)' : 'var(--dt_color_content_primary)'
        const user = c.type === 'im' ? fx.users[c.userId ?? ''] : undefined
        return (
          <SKGenericEntity
            key={c.id}
            size="medium"
            primaryText={<span style={{ color }}>{conversationTitle(fx, c)}</span>}
            secondaryText={notificationSummary(c)}
            ornament={
              user
                ? { memberAvatar: { src: user.avatar, name: user.realName } }
                : c.type === 'mpim'
                  ? { groupAvatar: { count: (c.userIds ?? []).filter((u) => u !== fx.me).length } }
                  : { icon: { icon: c.type === 'private' ? 'lock' : 'channel', color }, backgroundColor: 'transparent' }
            }
            accessories={c.type === 'im' ? [] : ['chevron']}
            onSelected={c.type === 'im' ? undefined : () => nav.push('conversation-notifications', { conversationId: c.id })}
            onLongPress={(el) => longPress(c.id, el)}
          />
        )
      })}
    </ModalPage>
  )
}

// ------------------------------------------------------------------------------------- Default reminder time

/**
 * The "Default reminder time" picker (DateTimePickerRoute, NotificationSettingsFeature.swift:183-227): a native sheet sized
 * to its content (DateTimePickerFeature.swift:50-64, September 2026; June an SKBottomSheet), margins 20 / 16 / 12 / 16,
 * "Set a default time for reminder notifications:" (.smallBodyBold), the .time wheels (1-minute steps), then the note in
 * .caption contentSecondary; no Done button — the time saves when the sheet goes away (DateTimePickerViewController.swift:
 * 42-46, :76-122, :261-299; selectionMode .onDismissal).
 */
export function ReminderTimeSheet(_props: SheetProps) {
  const sheet = useSheet()
  const initial = useNotificationPrefs((s) => s.reminderTime) ?? '09:00'
  const [value, setValue] = useState(initial)
  const latest = useRef(value)
  latest.current = value
  const closing = sheet?.closing
  useEffect(() => {
    if (closing) useNotificationPrefs.getState().set({ reminderTime: latest.current })
  }, [closing])
  return (
    <div className="ns-reminder" data-screen="notification-reminder-time">
      <div className="ns-reminder__title">Set a default time for reminder notifications:</div>
      <DateWheels mode="time" value={fromHHmm(value)} onChange={(d) => setValue(toHHmm(d))} />
      <div className="ns-reminder__note">Reminders you set for a specific day (like "tomorrow") will be sent at the time you select.</div>
    </div>
  )
}
