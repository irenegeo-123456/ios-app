import type { ReactNode } from 'react'
import { useApp } from '../../store'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { ModalPage, useModalNav } from '../../screens/you/ModalStack'
import { Blank, NavRow, RadioRow, SectionFooter, SectionHeader, SwitchRow } from '../../screens/you/SettingsRows'
import { OverridesBanner, channelName } from '../../screens/notifications/NotificationPages'
import {
  effectiveLevel,
  effectiveMobile,
  isCustomized,
  resetConversation,
  setConversationLevel,
  useNotificationPrefs,
  type NoiseLevel,
} from '../../screens/notifications/prefs'
import '../../screens/notifications/notifications.css'

// A conversation's notification settings (Modules/Features/NotificationConversationNoiseSettings, spec you-settings.md
// §4): pushed from the header menu's "Notifications" row and Channel details (NotificationConversationNoiseSettingsRoute,
// a plain push: …RouteExecution.swift:17-22), and from the exception lists inside Notifications. Titled "Channel
// Notifications" (channel_notifications 3685) over the conversation's name, "Reset" on the right once anything is
// customized; the list sits 8 pt in from the sides (…ViewController.swift:19-60). Choices save at once: All new posts /
// Just mentions set the conversation's level and Mute Channel mutes it (store.setNotify, which Home and the
// notification banners read) (…Interactor.swift:187-219). Channels and group DMs only; DMs have no such screen.
//
//   push({ screen: 'notification-settings', conversationId })

type Props = { conversationId?: string }

const desktopOf = (level: 'all' | 'mentions'): NoiseLevel => (level === 'all' ? 'everything' : 'mentions_dms')

export function ConversationNotificationsPage({ conversationId }: Props) {
  const nav = useModalNav()
  const fx = useApp((s) => s.fx)
  const conv = typeof conversationId === 'string' ? fx.conversations[conversationId] : undefined
  const p = useNotificationPrefs()
  if (!conv) return <ModalPage title="Channel Notifications">{null}</ModalPage>

  const prefs = p.conversations[conv.id]
  const level = effectiveLevel(conv, p.desktop)
  const muted = !!conv.muted
  const mobile = effectiveMobile(conv, p.desktop, p.mobile, prefs)
  const pushOn = mobile !== 'nothing'
  const customized = isCustomized(conv, p.desktop, prefs)
  const overrides = mobile !== 'nothing' && mobile !== desktopOf(level)
  const current = muted ? 'muted' : level

  const choose = (next: 'all' | 'mentions' | 'muted') => {
    // the current option does nothing; a conversation-level mobile override that matched desktop follows it (:187-219,
    // NotificationPreferencesService.swift:194-207)
    if (next === current) return
    if (next !== 'muted' && prefs?.mobile && prefs.mobile === desktopOf(level)) p.setConversation(conv.id, { mobile: desktopOf(next) })
    setConversationLevel(conv.id, next)
  }
  const togglePush = (on: boolean) => p.setConversation(conv.id, { mobile: on ? desktopOf(level) : 'nothing' })

  // banners, in priority order (Presenter 204-306): all new posts without push > mobile overrides > (temporary mute) > customized
  let banner: ReactNode = null
  if (level === 'all' && !muted && !pushOn)
    banner = (
      <div className="ns-banner">
        <SKBanner type="small" tone="warning" ornament="hidden" text="If you want to be notified about all new posts, you’ll need to turn on mobile notifications." />
      </div>
    )
  else if (overrides) banner = <OverridesBanner onSelect={() => nav.push('notifications-overrides', { conversationId: conv.id })} />
  else if (customized)
    banner = (
      <div className="ns-banner">
        <SKBanner type="small" tone="info" ornament="hidden" text="You’ve customized notifications for this channel so things may look different from your default settings." />
      </div>
    )

  return (
    <ModalPage
      title={<SKNavigationTitle title="Channel Notifications" subtitle={channelName(fx, conv)} />}
      trailing={customized ? { title: 'Reset', weight: 'bold', color: 'var(--dt_color_content_highlight_1)', onClick: () => (resetConversation(conv), useApp.getState().showToast('Reset', 'toast_checkmark')) } : undefined}
      className="ns-inset"
      data-screen="notification-settings"
    >
      {banner && (
        <>
          <Blank />
          {banner}
        </>
      )}
      <SectionHeader title="How to notify you" />
      <SwitchRow icon="mobile_notification" title="Mobile notifications" isOn={pushOn} onChange={togglePush} />
      <SectionFooter />
      <SectionHeader title="Let you know about" />
      <RadioRow icon="notifications_all_new_posts" title="All new posts" subtitle="Messages and threads you follow" isOn={current === 'all'} onSelect={() => choose('all')} />
      <RadioRow icon="notifications" title="Just mentions" subtitle="@you, @channel, @here" isOn={current === 'mentions'} onSelect={() => choose('mentions')} />
      <RadioRow icon="notifications_off" title="Mute Channel" subtitle="Only get notified if someone @mentions you personally" isOn={current === 'muted'} onSelect={() => choose('muted')} />
      {!muted && (
        <>
          <SectionFooter />
          {/* .filters is an icon-font glyph with no SVG (SKIconManifest+SVGMapping.swift:262); the filters imageset is the closest */}
          <NavRow icon="filters" title="Advanced options" subtitle="Customize your defaults" onSelect={() => nav.push('conversation-notifications-advanced', { conversationId: conv.id })} />
        </>
      )}
    </ModalPage>
  )
}

/**
 * Advanced options (Modules/Features/NotificationConversationNoiseAdvanced): "Also notify you about:" — Follow every
 * thread; Badge every unread message (all new posts, not group DMs) or Include @channel and @here (mentions) — and
 * "Overrides" › Mobile notification overrides while push is on (…Presenter.swift:58-243).
 */
export function ConversationAdvancedPage({ conversationId }: Props) {
  const nav = useModalNav()
  const fx = useApp((s) => s.fx)
  const conv = typeof conversationId === 'string' ? fx.conversations[conversationId] : undefined
  const p = useNotificationPrefs()
  if (!conv) return <ModalPage title="Advanced options">{null}</ModalPage>
  const prefs = p.conversations[conv.id] ?? {}
  const level = effectiveLevel(conv, p.desktop)
  const mobile = effectiveMobile(conv, p.desktop, p.mobile, p.conversations[conv.id])
  const overrides = mobile !== 'nothing' && mobile !== desktopOf(level)
  return (
    <ModalPage title={<SKNavigationTitle title="Advanced options" subtitle={channelName(fx, conv)} />} className="ns-inset" data-screen="notification-settings-advanced">
      {overrides && (
        <>
          <Blank />
          <OverridesBanner onSelect={() => nav.push('notifications-overrides', { conversationId: conv.id })} />
        </>
      )}
      <SectionHeader title="Also notify you about:" />
      <SwitchRow icon="threads" title="Follow every thread" isOn={!!prefs.followAllThreads} onChange={(on) => p.setConversation(conv.id, { followAllThreads: on })} />
      {level === 'all' && conv.type !== 'mpim' && (
        <SwitchRow icon="mark_as_unread" title="Badge every unread message" isOn={!!prefs.badgeAllUnreads} onChange={(on) => p.setConversation(conv.id, { badgeAllUnreads: on })} />
      )}
      {level === 'mentions' && (
        <SwitchRow
          icon="channel"
          title={
            <>
              Include <b>@channel</b> and <b>@here</b>
            </>
          }
          isOn={!prefs.suppressAtChannel}
          onChange={(on) => p.setConversation(conv.id, { suppressAtChannel: !on })}
        />
      )}
      {mobile !== 'nothing' && (
        <>
          <SectionFooter />
          <SectionHeader title="Overrides" />
          <NavRow icon="mobile_notification" title="Mobile notification overrides" subtitle="Customize options only for mobile push notifications." onSelect={() => nav.push('notifications-overrides', { conversationId: conv.id })} />
        </>
      )}
    </ModalPage>
  )
}
