import { useApp } from '../../store'
import type { Fixture } from '../../../data/types'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { usePause } from '../you/pause'
import { ModalPage, useModalNav } from '../you/ModalStack'
import { Blank, NavRow, SectionFooter, SectionHeader, SwitchRow } from '../you/SettingsRows'
import { formatHHmm, hasMobileOverrides, isChannelLike, isCustomized, soundLabel, timingLabel, useNotificationPrefs } from './prefs'
import './notifications.css'

// Notifications (Modules/Features/NotificationSettings, spec you-settings.md §3.1; slack-objc 14b3cbaf): the modal You
// and Preferences open with NotificationSettingsRoute — a form sheet over You (it can't push into You's modal), or a
// push inside Preferences (NotificationSettingsRouteExecution.swift:11-26). Titled "Notifications" (notifications 13451)
// with a Help Center item on the right (.questionCircle, NotificationSettingsPresenter.swift:34-50,
// NotificationSettingsViewController.swift:28-32). One list of SKGenericEntity .small rows under SKHeaderEntity .medium
// headers; the current value is each row's secondary text, and every change saves at once
// (NotificationSettingsPresenter.swift:52-557, NotificationSettingsInteractor.swift:423-517). Sections that need flags
// that default off (What to show in Activity, Calendar) and the internal debug row aren't drawn.

/** The conversations you're in: the ones in your sidebar sections. */
export const memberIds = (fx: Fixture) => new Set(fx.sections.flatMap((s) => s.conversationIds))

export function NotificationsRoot() {
  const nav = useModalNav()
  const fx = useApp((s) => s.fx)
  const showToast = useApp((s) => s.showToast)
  const p = useNotificationPrefs()
  const vip = usePause((s) => s.vipBreakthrough)
  const setVip = usePause((s) => s.setVipBreakthrough)
  const notInPrototype = () => showToast('Not in the prototype')

  // the OS permission is granted in the simulator: the switch is global_mobile != nothing (Interactor 142-159)
  const pushOn = p.mobile !== 'nothing'
  const everything = p.desktop === 'everything'
  // VIP rows need VIP access (priority access: a paid plan, PriorityHasAccessService.swift:22-24)
  const vipAccess = fx.workspace.plan !== 'free'
  const members = memberIds(fx)
  const customized = Object.values(fx.conversations).filter((c) => members.has(c.id) && isCustomized(c, p.desktop, p.conversations[c.id]))
  const channels = customized.filter(isChannelLike)
  const dms = customized.filter((c) => c.type === 'im' || c.type === 'mpim')

  const togglePush = (on: boolean) => {
    // on: mobile takes the desktop value, a legacy `nothing` desktop migrating to mentions_dms first (:423-458)
    if (!on) return p.set({ mobile: 'nothing' })
    const desktop = p.desktop === 'nothing' ? 'mentions_dms' : p.desktop
    p.set({ desktop, mobile: desktop })
  }

  return (
    <ModalPage title={<SKNavigationTitle title="Notifications" />} trailing={{ icon: 'help', label: 'Help Center', onClick: notInPrototype }} data-screen="notifications">
      {everything && !pushOn && (
        // turn_on_mobile_notifications_to_receive_everything 22332: small warning banner, no ornament, .caption with
        // the <bold> part bold (Presenter 106-136); header .default, footer .none
        <>
          <Blank />
          <div className="ns-banner">
            <SKBanner
              type="small"
              tone="warning"
              ornament="hidden"
              text={
                <>
                  If you want to be notified about <b>everything</b>, you’ll need to turn mobile notifications on.
                </>
              }
            />
          </div>
        </>
      )}
      <SectionHeader title="How to notify you" />
      <SwitchRow icon="mobile_notification" title="Mobile notifications" isOn={pushOn} onChange={togglePush} />
      <SectionFooter />

      <SectionHeader title="What to notify you about" />
      <NavRow
        icon={everything ? 'notifications_all_new_posts' : 'notifications'}
        title="Let you know about"
        // "Custom" with mobile overrides, else the desktop level (`nothing` reads as mentions) (Interactor 129-141, 606-626)
        subtitle={hasMobileOverrides(p.desktop, p.mobile) ? 'Custom' : everything ? 'Everything' : 'Mentions and direct messages'}
        onSelect={() => nav.push('notifications-global')}
      />
      <SectionFooter />

      <SectionHeader title="Also notify you about:" />
      <SwitchRow icon="threads" title="Threads you follow" isOn={p.threadsEverything} onChange={(on) => p.set({ threadsEverything: on })} />
      <SwitchRow icon="headphones" title="New huddles" subtitle="You'll see incoming huddles on your home screen." isOn={p.huddleInvites} onChange={(on) => p.set({ huddleInvites: on })} />
      <SwitchRow icon="apps" title="Incoming messages" subtitle="See every new message while you’re active in a workspace" isOn={p.inAppNotifications} onChange={(on) => p.set({ inAppNotifications: on })} />
      {vipAccess && (
        // priority_dnd_override: the same pref as Pause Notifications' "Always allow notifications from VIPs"
        <SwitchRow icon="vip" title="VIP messages, even if paused" isOn={vip} onChange={setVip} />
      )}
      {vipAccess && vip && <NavRow icon="sound" title="VIP sound" subtitle={soundLabel(p.vipSound)} onSelect={() => nav.push('notifications-sounds', { vip: true })} />}
      <NavRow icon="key" title="Add channel keywords" subtitle={p.keywords || 'None'} onSelect={() => nav.push('notifications-keywords')} />
      <SectionFooter />

      <SectionHeader title="Notification schedule" />
      <NavRow icon="schedule_send" title="Allow notifications" subtitle={{ every_day: 'Every day', weekdays: 'Weekdays', custom: 'Custom' }[p.schedule.days]} onSelect={() => nav.push('notifications-schedule')} />
      <NavRow
        icon="clock"
        title="Default reminder time"
        subtitle={p.reminderTime ? formatHHmm(p.reminderTime) : undefined}
        // a DateTimePickerRoute sheet (NotificationSettingsFeature.swift:183-227)
        onSelect={() => useApp.getState().presentSheet('notification-reminder-time')}
      />
      <NavRow icon="mobile" title="Notify me on mobile" subtitle={timingLabel(p.pushIdleWait)} onSelect={() => nav.push('notifications-timing')} />
      <SectionFooter />

      <SectionHeader title="Sound & appearances" />
      <NavRow icon="sound" title="Sound" subtitle={soundLabel(p.sound)} onSelect={() => nav.push('notifications-sounds')} />
      <SwitchRow icon="presentation" title="Include a preview" subtitle="Disable this for extra privacy" isOn={p.showPreview} onChange={(on) => p.set({ showPreview: on })} />
      <SectionFooter />

      {(channels.length > 0 || dms.length > 0) && (
        <>
          <SectionHeader title="Exceptions to the defaults" secondary="You've set specific guidance for the conversations below." />
          {channels.length > 0 && <NavRow icon="channel" title="Channels" subtitle={String(channels.length)} onSelect={() => nav.push('notifications-exceptions', { kind: 'channels' })} />}
          {dms.length > 0 && <NavRow icon="direct_messages" title="Direct messages" subtitle={String(dms.length)} onSelect={() => nav.push('notifications-exceptions', { kind: 'dms' })} />}
          <SectionFooter />
        </>
      )}

      <SectionHeader title="Troubleshooting" />
      <NavRow icon="mobile_notification" title="Troubleshoot notifications" onSelect={notInPrototype} />
    </ModalPage>
  )
}
