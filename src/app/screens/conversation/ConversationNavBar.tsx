import type { ReactNode } from 'react'
import { useApp } from '../../store'
import { useFlag } from '../../flags'
import { GlassButton, GlassGroup, GlassGroupItem } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { conversationTitle, displayName, plural } from '../../../messagekit/format'
import { openCallSheet, useLiveHuddle } from '../../huddle'
import { conversationTabs } from './tabs'

// The conversation's navigation bar on iOS 26 (spec shell-navigation.md §3, messages.md §10.2): a clear bar with the
// Slack caret in a 44 pt glass circle, the glass title pill filling the space up to the right buttons, and on the right
// one glass capsule with the Slackbot entry and the huddle headphones (production, reference/device/IMG_2247–2248:
// capsule x 321–420 on 440 pt). Content scrolls under the bar (AnyConversationViewController.swift:170, 250).

/** The Slack caret in a glass circle (SKBarButtonItem .back, `caret_left_full.svg` 20 pt, content_primary; spec §3.3). */
export function BackButton({ onClick }: { onClick?: () => void }) {
  const pop = useApp((s) => s.pop)
  return (
    <GlassButton label="Back" onClick={onClick ?? (() => pop())} className="convo-bar-button">
      <Icon name="caret_left_full" size={20} />
    </GlassButton>
  )
}

/**
 * The huddle button with no huddle going on (Sept: SKBarButtonItem `.huddle`, drawn by SKHuddleBarButtonView): a 32 × 32
 * badge centering a 20 pt `headphones.svg` SKIconButton in content_primary, "Start Huddle" (yaml:20629); on glass it draws
 * no circle of its own (SKHuddleBarButtonView.swift:15-31, :122-130, :190-212; HeaderHelperService.swift:520-557;
 * colors HeaderBarButtonPresentable.swift:153-164), so a lone one is UIKit's glass circle and, next to Slackbot, a 44 pt
 * slot in the shared capsule (the device's glyph sits at x 389.7–406, y 75–92 on 440 pt, as here, IMG_2247).
 */
export function HuddleButton({ conversationId }: { conversationId: string }) {
  const presentSheet = useApp((s) => s.presentSheet)
  const live = useLiveHuddle(conversationId)
  if (live.live) return <ActiveHuddleButton conversationId={conversationId} {...live} />
  return (
    <GlassButton label="Start Huddle" onClick={() => presentSheet('huddle', { conversationId })} className="convo-bar-button">
      <Icon name="headphones" size={20} />
    </GlassButton>
  )
}

/**
 * The huddle button while a huddle is live in the conversation (HuddleStateResolvable.swift:69-99: the channel's active
 * huddle, its activeMembers.count). SKHuddleBarButtonView's active state (SKHuddleBarButtonView.swift:151-188): an SKButton
 * `.huddleBarButton(isLiquidGlass: true)` with `svgHeadphones` 16 pt, 5 pt, then the member count in Lato Bold 15
 * (`smallBodyBold`), padding 8 × 6 (SKButton+Types.swift:253-254, :284-285, :338-339, :372-373; SKButton+PresentationObject
 * .swift:208-209), title and icon `sk_off_white` (HeaderHelperService.swift:27, :532-541); the count is blank at 0. On glass the
 * button is clear and the item takes UIKit's `.prominent` style tinted `highlight2.baseInverse` (core, not the theme:
 * HeaderHelperService.swift:533; SKBarButtonItem.swift:232-238, :546-553): the filled capsule is the pill, its own capsule
 * rather than a slot in the Slackbot item's (UIKit's, unmeasured: no snapshot draws it, the iOS_26 / iOS_27
 * HeaderHelperBarButtonItemTests testActive* PNGs are blank). No animation (the pulse is the coachmark's, :73-90), no
 * bounce (disableAnimations, :176). VoiceOver "Join huddle, 3 members" (`join_huddle` yaml:10336, `one_member` /
 * `other_members`). Tap: the same `.huddleButtonTapped` → HuddlesStartService.initiateHuddle (AnyConversationInteractor
 * .swift:347-356; HuddlesStartService.swift:61-104): already in it, the huddle sheet comes up; otherwise the join preview.
 */
function ActiveHuddleButton({ conversationId, participantIds, joined }: { conversationId: string; participantIds: string[]; joined: boolean }) {
  const presentSheet = useApp((s) => s.presentSheet)
  const count = participantIds.length
  const label = `Join huddle, ${plural(count, '1 member', '%@ members')}`
  return (
    <button
      type="button"
      className="convo-huddle-live"
      aria-label={label}
      onClick={() => (joined ? openCallSheet() : presentSheet('huddle', { conversationId }))}
      data-tap
    >
      <Icon name="headphones" size={16} />
      {count > 0 && <span className="convo-huddle-live__count">{count.toLocaleString('en-US')}</span>}
    </button>
  )
}

/**
 * The conversation's right bar items. With the Slackbot entry (flag slackbotConversationHeaderEntry; Sept: shown when
 * Slackbot AI is on and this isn't the Slackbot DM, NewConversationHeaderHelperService.swift:1093-1108; June: behind
 * `ios_slackbot_modal`, :846): rightButtons = [slackbotEntry, huddle], ordered leading → trailing
 * (HeaderBarButtonPresentable.swift:196, :281-298), so Slackbot sits left of the headphones in one glass capsule (no
 * fixed space between them; SKBarButtonItem.swift:59-61). Slackbot: `slackbot_color` 25 × 25 drawn in its own colors
 * (.alwaysOriginal), 10 pt top and bottom padding, none at the sides on glass (SKBarButtonItem.swift:110-118, :258-275),
 * so UIKit's item is 25 + 2 × 11 = 47 wide; the headphones item is UIKit's 44 minimum (measured, IMG_2247–2248:
 * capsule x 321–420, glyph centers 344.5 and 397.5). Tap: the Slackbot DM itself, with this conversation (or thread) as
 * its context, presented as a bottom sheet (AnyConversationInteractor.swift:401-407, :945-957; AnyConversationFeature.swift:
 * 525-529 [Sept]); the clone has no Slackbot-DM sheet yet, so it pushes the Slackbot screen, as June did without
 * slackbotModal.
 */
export function ConversationBarTrailing({ conversationId, huddle = true }: { conversationId: string; huddle?: boolean }) {
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const conv = useApp((s) => s.fx.conversations[conversationId])
  const hasSlackbot = useApp((s) => !!s.fx.users.USLACKBOT)
  const entry = useFlag('slackbotConversationHeaderEntry') && hasSlackbot && conv?.userId !== 'USLACKBOT'
  const live = useLiveHuddle(conversationId)
  if (!entry) return huddle ? <HuddleButton conversationId={conversationId} /> : null
  // a live huddle's prominent capsule stands apart, leaving Slackbot's item alone in its glass (ActiveHuddleButton)
  if (huddle && live.live)
    return (
      <>
        <GlassGroup className="convo-bar-group">
          <GlassGroupItem label="Slackbot" width={47} onClick={() => useApp.getState().presentSheet('slackbot-dm')} className="convo-bar-slackbot">
            <Icon name="slackbot_color" size={25} />
          </GlassGroupItem>
        </GlassGroup>
        <ActiveHuddleButton conversationId={conversationId} {...live} />
      </>
    )
  return (
    <GlassGroup className="convo-bar-group">
      <GlassGroupItem label="Slackbot" width={47} onClick={() => useApp.getState().presentSheet('slackbot-dm')} className="convo-bar-slackbot">
        <Icon name="slackbot_color" size={25} />
      </GlassGroupItem>
      {huddle && (
        <GlassGroupItem label="Start Huddle" width={44} onClick={() => presentSheet('huddle', { conversationId })} className="convo-bar-button">
          <Icon name="headphones" size={20} />
        </GlassGroupItem>
      )}
    </GlassGroup>
  )
}

/** The bar itself: the status bar, then the 54 pt bar region with its 44 pt row of glass controls at the top (nav.css). */
export function ConvoBar({ leading, title, trailing, scrolled, solid }: { leading: ReactNode; title?: ReactNode; trailing?: ReactNode; scrolled?: boolean; solid?: boolean }) {
  return (
    <div className={['ios-navbar convo-navbar', scrolled && 'is-scrolled', solid && 'is-solid'].filter(Boolean).join(' ')}>
      <div className="ios-navbar__edge" />
      <div className="ios-navbar__bar">
        <div className="ios-navbar__leading">{leading}</div>
        {title}
        <div className="ios-navbar__trailing">{trailing}</div>
      </div>
    </div>
  )
}

export function ConversationNavBar({ conversationId, scrolled }: { conversationId: string; scrolled?: boolean }) {
  const conv = useApp((s) => s.fx.conversations[conversationId])
  const presentSheet = useApp((s) => s.presentSheet)
  if (!conv) return <ConvoBar leading={<BackButton />} scrolled={scrolled} />
  const isApp = conv.type === 'app'
  return (
    <ConvoBar
      leading={<BackButton />}
      scrolled={scrolled}
      solid={isApp}
      title={isApp ? <AppTitle conversationId={conversationId} /> : <TitlePill conversationId={conversationId} onClick={() => presentSheet('conversation-menu', { conversationId })} />}
      // Huddle (or call) only with people: nothing to huddle with in an app DM (HuddleStateResolvable.swift:87-99)
      trailing={isApp ? undefined : <ConversationBarTrailing conversationId={conversationId} />}
    />
  )
}

/**
 * ConversationNavigationTitleView (ConversationNavigationTitleView.swift:451-541; ConversationHeaderPresentationObject.swift:
 * 186-263, 376-442 [Sept]): a 44 pt interactive glass capsule, `[ornament] [name / subtitle]`. Channels: a 20 pt type icon
 * in a 36 pt slot, no gap; DMs: the 36 pt round avatar in a 44 pt slot, 4 pt gap. 6 pt from the text to the trailing edge
 * (2 + 4). VoiceOver: one button, hint "Open Menu" (`open_menu`, yaml:14085; ConversationNavigationTitleView.swift:154-159,
 * :177-183), labelled `[title, subtitle].joined(", ")` (ConversationHeaderPresentationObject.swift:234): the title is the
 * name, then "Public Channel" / "Private Channel" / "Group", or for a DM the avatar's presence ("Active" / "Away") and
 * "Member" (HeaderTitlePresentable.swift:224-258; SKMemberAvatar.swift:885-900); the subtitle is "12 members, 4 tabs",
 * "3 tabs", or a status's emoji name and text (ConversationHeaderPresentationObject.swift:376-441).
 */
function TitlePill({ conversationId, onClick }: { conversationId: string; onClick: () => void }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages[conversationId])
  const conv = fx.conversations[conversationId]
  const tabs = conversationTabs(fx, conversationId, messages).length
  const tabsText = plural(tabs, '1 tab', '%@ tabs') // `one_tab` / `many_tabs`, yaml:13899 / 11714
  let ornament: ReactNode
  let subtitle: ReactNode
  let statusEmoji: string | undefined
  // the VoiceOver label's parts (see above)
  let titleA11y: string[] = []
  let subtitleA11y: string[] = []
  if (conv.type === 'im') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    // presence: online highlight2.content, away content_tertiary (spec §3.4)
    ornament = (
      <span className="convo-title__avatar">
        <SKMemberAvatar src={u?.avatar} name={u?.realName ?? conv.name} size="large" round presence={u?.presence === 'away' ? 'away' : 'active'} />
      </span>
    )
    // a person's status replaces "N tabs": the 12 pt emoji, 5 pt, the text (ConversationHeaderPresentationObject.swift:418-436)
    if (u?.statusEmoji) {
      statusEmoji = u.statusEmoji
      subtitle = u.statusText ?? ''
      // the emoji's VoiceOver name (its shortcode here, the closest the demo has) and the status text
      subtitleA11y = u.statusText ? [u.statusEmoji.replace(/_/g, ' '), u.statusText] : []
    } else {
      subtitle = tabsText
      subtitleA11y = [tabsText]
    }
    titleA11y = [u?.presence === 'away' ? 'Away' : 'Active', 'Member'] // `away` / `active` / `member` (yaml:2364 / 577 / 11998)
  } else {
    const icon = conv.type === 'private' ? 'lock_filled' : conv.type === 'mpim' ? 'message_filled' : 'channel_filled'
    ornament = (
      <span className="convo-title__icon">
        <Icon name={icon} size={20} />
      </span>
    )
    const members = conv.type === 'mpim' ? (conv.userIds?.length ?? 0) + (conv.userIds?.includes(fx.me) ? 0 : 1) : (conv.memberCount ?? conv.memberIds?.length ?? 1)
    const membersText = plural(members, '1 member', '%@ members') // `one_member` / `other_members`, yaml:13753 / 14340
    subtitle = `${membersText} • ${tabsText}`
    subtitleA11y = [membersText, tabsText]
    // `public_channel` / `private_channel` / `group` (yaml:15381 / 15223 / 7746)
    titleA11y = [conv.type === 'private' ? 'Private Channel' : conv.type === 'mpim' ? 'Group' : 'Public Channel']
  }
  const title = conversationTitle(fx, conv)
  const a11yLabel = [title, ...titleA11y, ...subtitleA11y].filter(Boolean).join(', ')
  return (
    <button type="button" className={`convo-title glass${conv.type === 'im' ? ' is-dm' : ''}`} onClick={onClick} aria-label={a11yLabel} aria-description="Open Menu" data-tap>
      {ornament}
      <span className="convo-title__text">
        <span className="convo-title__name">{title}</span>
        <span className="convo-title__subtitle">
          {statusEmoji && <Emoji name={statusEmoji} size={12} className="convo-title__status" />}
          <span className="convo-title__subtitle-text">{subtitle}</span>
        </span>
      </span>
    </button>
  )
}

/**
 * App DMs keep the legacy title (HeaderTitleView as the bar's title view, which UIKit centers; not a capsule for `.app`,
 * HeaderTitlePresentable.swift:278-288): the app's 32 pt round avatar, 16 pt, its name in Lato Black 17 content_primary
 * (HeaderTitleView.swift:425-435 [Sept]; June sk_primary_foreground), no subtitle, nudged 6 pt right for the back button
 * (ConversationUtility.swift:16-30).
 */
function AppTitle({ conversationId }: { conversationId: string }) {
  const fx = useApp((s) => s.fx)
  const push = useApp((s) => s.push)
  const conv = fx.conversations[conversationId]
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return (
    <div className="convo-center-title">
      <button type="button" className="convo-app-title" data-tap onClick={() => u && push({ screen: 'profile', userId: u.id })} aria-label={displayName(u)}>
        <SKMemberAvatar src={u?.avatar} name={u?.realName ?? conv.name} size="medium" round />
        <span className="convo-app-title__name">{u ? displayName(u) : conv.name}</span>
      </button>
    </div>
  )
}
