import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { useDevice } from '../../../sim/store'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { InlineText } from '../../text/RichText'
import { SKButton } from '../../../slackkit/SKButton'
import { SKIconButton } from '../../../slackkit/SKIconButton'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKEntityRow, SKListFooter } from '../../../slackkit/SKEntity'
import { conversationTitle, plural } from '../../../messagekit/format'
import type { Conversation, Fixture } from '../../../data/types'
import { conversationTabs } from '../../screens/conversation/tabs'
import { openMenu, screenRect, type AnchorRect } from '../ui/Menu'
import { sheetDef, screenDef } from '../../nav/registry'
import { isChannel, openOrToast, openRegistered, useDismissIfMissing } from '../shared'
import { canLeave, copyChannelLink, leaveChannel, moveMenuSections, notifyLevel, toggleStar } from './actions'
import './conversation-menu.css'

// The conversation header menu (spec sheets-menus.md §6.2; slack-objc main @ 14b3cbaf. HM/ = Modules/Features/
// ConversationHeaderMenu/Implementation/MenuFeature/, CTMV = HM/ConversationTabsMenuView.swift, TIV = the title view in
// Modules/UIInfra/NavigationController/Implementation/ConversationNavigationTitleView.swift). Tapping the title pill
// morphs it into a card on the top safe area, 8 pt from the sides, 20 pt corners — iOS 26: non-interactive Liquid Glass
// (a capsule closed, 20 pt open) on a clear scrim, a 1 pt outlineTertiary border while open in dark mode — while the
// list fades in and the "…" button grows from 0.1; the smooth spring, 0.4 s (CTMV:32-66,181-245,386-489). The real
// pill hides while the card is out (HM/ConversationTabsMenuFeature.swift:298-321). Inside: the expanded title (close
// button, "#"/lock and name, the topic), Add · Star · Search, the conversation's pages, then Members / Notifications (or
// View Profile) and Settings & Details (HM/ConversationTabsMenuPresenter.swift:46-337). The list stops at 70 % of the
// screen and scrolls; tap outside or swipe up to close. Not drawn: the rows and looks September added behind toggles
// that default off — "Agents & Apps" (ios_channel_agents_apps_screen), Slackbot's "Skills"
// (ios_slackbot_skills_header_entry), the find-in-channel Search (ios_find_in_channel, quick_switch icon) — and the
// frontline-worker / temporary-channel rules (Presenter:77-82,234-245,306-323,437-440,482-485).

interface Props {
  sheetKey: string
  conversationId: string
  /** the title pill's frame, to morph from (default: the pill on screen) */
  anchor?: AnchorRect
}

/** smooth spring: medium 0.4 s, fast 0.2 s (UIView+SpringAnimation.swift:123-126); navigating closes it fast (Feature:181-233) */
const MEDIUM = 400
const FAST = 200

export function ConversationMenu({ conversationId, anchor }: Props) {
  const sheet = useSheet()
  const device = useDevice()
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages[conversationId])
  const conv = fx.conversations[conversationId] as Conversation | undefined
  const textRef = useRef<HTMLSpanElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [pill] = useState<{ rect?: AnchorRect; el: HTMLElement | null }>(() => {
    const el = document.querySelector<HTMLElement>('.ios-screen .convo-title')
    return { el, rect: anchor ?? screenRect(el) }
  })
  const [size, setSize] = useState({ text: 34, list: 0 })
  const [entered, setEntered] = useState(false)
  const [speed, setSpeed] = useState(MEDIUM)
  const [pull, setPull] = useState(0)
  const swipe = useRef<{ y: number; t: number; k: number } | null>(null)

  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(r)
  }, [])
  // "so they aren't both visible": the pill hides under the card and comes back once the card has folded into it
  useEffect(() => {
    const el = pill.el
    if (!el) return
    el.style.visibility = 'hidden'
    return () => {
      el.style.visibility = ''
    }
  }, [pill.el])
  // the expanded title's text and the list, measured (the card animates between fixed heights)
  useLayoutEffect(() => {
    const t = textRef.current
    const l = listRef.current
    if (!t || !l) return
    const measure = () => setSize({ text: t.offsetHeight, list: l.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(t)
    ro.observe(l)
    return () => ro.disconnect()
  }, [])

  useDismissIfMissing(!conv)
  if (!conv) return null
  const channel = isChannel(conv)
  const dm = conv.type === 'im'
  const user = conv.userId ? fx.users[conv.userId] : undefined
  const shown = entered && !sheet?.closing

  /** closes the menu (fast when something opens after it), then runs `then` */
  const close = (then?: () => void) => {
    const ms = then ? FAST : MEDIUM
    setSpeed(ms)
    sheet?.dismiss()
    if (then) setTimeout(then, ms)
  }

  // ---- the card, between the pill's frame (hidden) and its own (visible) (CTMV:386-445,542-608)
  const W = device.width
  const from = pill.rect ?? { x: 68, y: device.safeTop, width: W - 136, height: 44 }
  const headH = size.text + 16 // + titleInfoViewVerticalPadding (Spacing.xLarge), centered: 8 above and below (CTMV:48,329-343)
  const listH = Math.min(size.list, device.height * 0.7) // menuListMaxHeightPercentage (CTMV:56,107-115)
  const frame: CSSProperties = shown
    ? { left: 8, top: device.safeTop, width: W - 16, height: headH + listH, borderRadius: 20 }
    : { left: from.x, top: from.y, width: from.width, height: from.height, borderRadius: from.height / 2 }
  // swipe up: rubber-banded (√(|dy| / 300)), up to 7 % smaller going up, 2 % larger going down, from the top (CTMV:491-523)
  const k = Math.sqrt(Math.abs(pull) / 300)
  const scale = pull ? 1 + (pull < 0 ? -0.07 : 0.02) * k : 1

  // ---- the title: the pill's layout collapsed, the expanded one open (TIV:451-541,939-993)
  const ornamentW = shown ? 52 : dm ? 44 : 36 // closeButtonContainerSize / memberOrnamentSize / selectedPageIconContainerSize
  const prefix = channel ? (conv.type === 'private' ? { icon: 'lock_filled', size: 14, gap: 2 } : { icon: 'channel_filled', size: 16, gap: -1 }) : null
  const tabs = conversationTabs(fx, conversationId, messages)
  const tabsText = plural(tabs.length, '1 tab', '%@ tabs')
  const members = conv.type === 'mpim' ? (conv.userIds?.length ?? 0) + (conv.userIds?.includes(fx.me) ? 0 : 1) : (conv.memberCount ?? conv.memberIds?.length ?? 1)
  const collapsed = collapsedSubtitle(conv, user, tabsText, members)
  const expanded = expandedSubtitle(fx, conv, user) ?? collapsed

  // ---- the "…" menu: details, copy link, leave (ConversationTabsMenuPresenter.swift:397-422; ConversationActionBuilder
  // .swift:95-100,154-168,228-235). Archive / Unarchive need the server's permission and Copy Channel ID is internal
  // builds only (:409-416), so neither is drawn.
  const more = (el: Element) =>
    openMenu({
      anchor: el,
      sections: [
        {
          items: [
            { title: channel ? 'Channel Details' : 'Conversation Details', icon: 'info', onSelect: () => close(() => useApp.getState().push({ screen: 'channel-details', conversationId })) },
            { title: 'Copy Channel Link', icon: 'link', onSelect: () => copyChannelLink(fx, conversationId) },
            ...(canLeave(fx, conv) ? [{ title: 'Leave Channel', icon: 'sign_out', destructive: true, onSelect: () => close(() => leaveChannel(fx, conv)) }] : []),
          ],
        },
      ],
    })

  // ---- pages: Messages is the one on screen; the others open their screens (ConversationTabsBuilder.swift:134-230)
  const openTab = (id: string) => {
    if (id === 'messages') return close()
    close(() => {
      if (id.startsWith('canvas:')) openOrToast(['canvas'], { canvasId: id.slice(7), conversationId })
      else if (id.startsWith('list:')) openOrToast(['list'], { listId: id.slice(5), conversationId })
      else if (id === 'files') openOrToast(['conversation-files', 'files'], { conversationId })
      else if (id === 'pins') openOrToast(['conversation-pins', 'pins'], { conversationId })
      else openOrToast(['new-canvas', 'create-canvas'], { conversationId })
    })
  }
  // Add: channels → Add Members (InviteToChannelRoute); DMs and group DMs → the member picker, which starts a new group
  // DM — here New Message with these people already in "To:" (ConversationTabsMenuFeature.swift:384-400)
  const addPeople = () => {
    if (channel) return openOrToast(['invite-to-channel', 'add-members'], { conversationId })
    const people = conv.type === 'mpim' ? (conv.userIds ?? []).filter((u) => u !== fx.me) : conv.userId ? [conv.userId] : []
    useApp.getState().push({ screen: 'compose', to: people })
  }
  const pins = (messages ?? []).filter((m) => m.pinnedBy).length
  const level = notifyLevel(conv)

  return (
    <div
      className={`cm-scrim${shown ? ' is-open' : ''}`}
      style={{ ['--cm-speed' as string]: `${swipe.current ? 0 : speed}ms` }}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        swipe.current = { y: e.clientY, t: performance.now(), k: el.getBoundingClientRect().height / el.offsetHeight || 1 }
      }}
      onPointerMove={(e) => swipe.current && setPull((e.clientY - swipe.current.y) / swipe.current.k)}
      onPointerUp={(e) => {
        const s = swipe.current
        swipe.current = null
        if (!s) return
        const dy = (e.clientY - s.y) / s.k
        const v = (dy / Math.max(1, performance.now() - s.t)) * 1000
        setPull(0)
        // a tap on the scrim, or a swipe up past 75 pt or 500 pt/s (CTMV:59-63,511-517,610-615,632-634)
        if (Math.abs(dy) < 6 || dy < -75 || v < -500) close()
      }}
      onPointerCancel={() => {
        swipe.current = null
        setPull(0)
      }}
    >
      <div className="cm-card" style={{ ...frame, transform: scale !== 1 ? `scale(${scale})` : undefined }} role="dialog" aria-label={conversationTitle(fx, conv)}>
        <div className="cm-head" style={{ height: shown ? headH : from.height, paddingRight: shown ? 52 : 6 }}>
          <span className="cm-head__ornament" style={{ width: ornamentW, marginRight: !shown && dm ? 4 : 0 }}>
            <span className="cm-head__page" aria-hidden>
              {dm ? <SKMemberAvatar src={user?.avatar} name={user?.realName ?? conv.name} size="large" round presence={user?.presence === 'away' ? 'away' : 'active'} /> : <Icon name={conv.type === 'private' ? 'lock_filled' : conv.type === 'mpim' ? 'message_filled' : 'channel_filled'} size={20} />}
            </span>
            {/* SKIconButton .small (40), close, "Close"; 8 pt from the top of its 52 pt slot (TIV:468,644-671, :65) */}
            <span className="cm-head__close">
              <SKIconButton icon="close" size="small" accessibilityLabel="Close" onClick={() => close()} />
            </span>
          </span>
          <span className="cm-head__text" ref={textRef}>
            {/* smallBodyBlack contentPrimary, one line; a channel's "#" (16 pt, −1) or lock (14 pt, 2) before it when open
                (ConversationHeaderPresentationObject.swift:298-306,346-367; TIV:879-937) */}
            <span className="cm-head__name">
              {prefix && (
                <span className="cm-head__prefix" style={{ width: shown ? prefix.size : 0, height: prefix.size, marginRight: shown ? prefix.gap : 0 }}>
                  <Icon name={prefix.icon} size={prefix.size} />
                </span>
              )}
              <span className="cm-head__label">{conversationTitle(fx, conv)}</span>
            </span>
            {/* caption contentSecondary; the collapsed and expanded subtitles cross-fade over 0.1 s (TIV:838-877) */}
            <span className="cm-head__subtitle">
              <span className="cm-head__sub is-collapsed">{collapsed}</span>
              <span className="cm-head__sub is-expanded">{expanded}</span>
            </span>
          </span>
        </div>
        {/* SKIconButton .small, ellipsis_horizontal_filled, "More actions": 8 pt down, 6 pt in, from 0.1 (CTMV:39-51,606-628).
            None for the Slackbot DM while Slackbot AI is on (the demo's case): rightButtonPO returns nil and the view just
            hides the button, keeping the title's layout (ConversationTabsMenuPresenter.swift:370-394,
            ConversationTabsMenuView.swift:370-376). Neither the card nor its "…" menu has Mute or Copy Email rows for any
            conversation; those are the DMs list's long-press menu (DMInteractor.swift:1318-1360). */}
        {conv.userId !== 'USLACKBOT' && (
          <span className="cm-more">
            <SKIconButton icon="ellipsis_horizontal_filled" size="small" accessibilityLabel="More actions" onClick={() => more(document.querySelector('.cm-more')!)} />
          </span>
        )}
        <div className="cm-list ios-scroll" style={{ height: shown ? listH : 0 }}>
          <div ref={listRef}>
            {/* Add · Star · Search: SKButtonEntity, equal widths 8 apart, padding 4 / 16; clear with a 1 pt outlineTertiary
                border, .medium (ConversationTabsMenuPresenter.swift:195-212,424-466; SKButtonEntity.swift:25-27) */}
            <div className="cm-buttons">
              {/* not for app homes or Slackbot (or frontline workers who can't invite) (Presenter:437-440) */}
              {conv.userId !== 'USLACKBOT' && (
                <SKButton title="Add" icon="user_add" buttonStyle="custom" customColors={CLEAR} size="medium" numberOfLines={1} accessibilityLabel="Add Members" onClick={() => close(addPeople)} />
              )}
              {/* Star on free plans (toggles); on paid plans "Move", the star (filled when starred) and a pull-down of the
                  section moves, "Move To Section" to VoiceOver (ConversationTabsMenuPresenter.swift:469-546) */}
              {fx.workspace.plan === 'free' ? (
                <SKButton title={conv.starred ? 'Starred' : 'Star'} icon={conv.starred ? 'star_filled' : 'star'} buttonStyle="custom" customColors={CLEAR} size="medium" numberOfLines={1} accessibilityLabel="Star Conversation" onClick={() => toggleStar(conv)} />
              ) : (
                <SKButton
                  title="Move"
                  icon={conv.starred ? 'star_filled' : 'star'}
                  buttonStyle="custom"
                  customColors={CLEAR}
                  size="medium"
                  numberOfLines={1}
                  accessibilityLabel="Move To Section"
                  onClick={() => openMenu({ anchor: document.querySelector('.cm-buttons [aria-label="Move To Section"]'), sections: moveMenuSections(fx, conv) })}
                />
              )}
              <SKButton title="Search" icon="search" buttonStyle="custom" customColors={CLEAR} size="medium" numberOfLines={1} accessibilityLabel="Search in Channel" onClick={() => close(() => openOrToast(['search-in-channel', 'conversation-search'], { conversationId }))} />
            </div>
            {/* pages: an 8 pt blank above, a hairline below; the current one filled, bodyBold, selected (Presenter:76-176) */}
            <div className="cm-blank" />
            {tabs.map((t, i) => (
              <SKEntityRow
                key={t.id}
                className={`cm-row${i === 0 ? ' is-current' : ''}`}
                ornament={<Icon name={i === 0 ? t.selectedIcon : t.icon} size={20} />}
                title={t.title}
                accessories={t.id === 'pins' && pins ? <span className="cm-accessory">{pins}</span> : undefined}
                onClick={() => openTab(t.id)}
              />
            ))}
            <SKListFooter />
            {/* navigation rows, 8 pt blanks around (Presenter:214-337) */}
            <div className="cm-blank" />
            {!dm && <NavRow icon="user_directory" title="Members" accessory={members > 0 ? String(members) : undefined} onClick={() => close(() => useApp.getState().push({ screen: 'conversation-members', conversationId }))} />}
            {!dm && (
              <NavRow
                icon={level.icon}
                title="Notifications"
                accessory={level.label}
                // Slack pushes NotificationConversationNoiseSettings (Feature:291-294); until someone registers
                // 'notification-settings', its three choices as a menu
                onClick={(el) => {
                  const names = ['notification-settings', 'conversation-notifications']
                  if (registered(names)) return close(() => openRegistered(names, { conversationId }))
                  openMenu({
                    anchor: el,
                    align: 'trailing',
                    sections: [
                      {
                        items: [
                          { title: 'All', icon: 'notifications_all_new_posts', checked: level.label === 'All', onSelect: () => useApp.getState().setNotify(conversationId, 'all') },
                          { title: 'Mentions', icon: 'notifications', checked: level.label === 'Mentions', onSelect: () => useApp.getState().setNotify(conversationId, 'mentions') },
                          { title: 'Muted', icon: 'notifications_off', checked: level.label === 'Muted', onSelect: () => useApp.getState().setNotify(conversationId, 'muted') },
                        ],
                      },
                    ],
                  })
                }}
              />
            )}
            {dm && user && conv.type === 'im' && <NavRow icon="user" title="View Profile" onClick={() => close(() => useApp.getState().push({ screen: 'profile', userId: user.id }))} />}
            {/* "Settings & Details": .cogO → svgSettings (SKIconManifest+SVGMapping.swift:69); pushes §4 (Feature:193-194) */}
            <NavRow icon="settings" title="Settings & Details" onClick={() => close(() => useApp.getState().push({ screen: 'channel-details', conversationId }))} />
            <div className="cm-blank" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** topLevelButtonStyle = .custom(clear, contentPrimary, outlineTertiary) (CTMV:66) */
const CLEAR = { backgroundColor: 'transparent', titleColor: 'var(--dt_color_content_primary)', borderColor: 'var(--dt_color_outline_tertiary)' }

const registered = (names: string[]) => names.some((n) => sheetDef(n) || screenDef(n))

/** An S row with an icon, accessory text (body, contentSecondary) and a chevron (Presenter:214-337). */
function NavRow({ icon, title, accessory, onClick }: { icon: string; title: string; accessory?: string; onClick: (el: Element) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref}>
      <SKEntityRow
        className="cm-row"
        ornament={<Icon name={icon} size={20} />}
        title={title}
        accessories={
          <>
            {accessory && <span className="cm-accessory">{accessory}</span>}
            <Icon name="caret_right_full" size={20} color="var(--dt_color_content_secondary)" />
          </>
        }
        onClick={() => ref.current && onClick(ref.current)}
      />
    </div>
  )
}

/** The pill's subtitle: "N members • N tabs", or for a DM "N tabs" or the person's status (ConversationHeaderPresentationObject.swift:372-442). */
function collapsedSubtitle(conv: Conversation, user: Fixture['users'][string] | undefined, tabsText: string, members: number): ReactNode {
  if (conv.type === 'im') {
    if (user?.statusEmoji)
      return (
        <>
          <Emoji name={user.statusEmoji} size={12} className="cm-head__status" />
          <span className="cm-head__sub-text">{user.statusText ?? ''}</span>
        </>
      )
    return <span className="cm-head__sub-text">{tabsText}</span>
  }
  return <span className="cm-head__sub-text">{`${plural(members, '1 member', '%@ members')} • ${tabsText}`}</span>
}

/** The open menu's subtitle: the topic, else a person's pronouns (status stays), else the collapsed one (…PresentationObject.swift:459-488). */
function expandedSubtitle(fx: Fixture, conv: Conversation, user: Fixture['users'][string] | undefined): ReactNode | null {
  if (conv.topic)
    return (
      <span className="cm-head__sub-text">
        <InlineText text={conv.topic} />
      </span>
    )
  if (conv.type === 'im' && user && !user.statusEmoji && user.pronouns) return <span className="cm-head__sub-text">{user.pronouns}</span>
  void fx
  return null
}
