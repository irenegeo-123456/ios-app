import { useState, type ReactNode } from 'react'
import { useApp, type Route } from '../../store'
import { GlassButton, GlassGroup, GlassGroupItem } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { conversationTitle, plural } from '../../../messagekit/format'
import { conversationTabs } from '../conversation/tabs'
import type { Conversation, Fixture } from '../../../data/types'
import './channel-flows.css'

// What the channel and people flows share (spec reference/ios/specs/channels-people.md): which conversation a screen is
// about, membership, the plain text bar button, and the conversation's title pill for the screens that show it without
// being the conversation itself (the preview, a page, find mode).

export const isChannelConversation = (c?: Conversation): c is Conversation => !!c && (c.type === 'channel' || c.type === 'private')

/** You're in it; a channel without `memberIds` is just you (as Search reads it, searchIndex.ts isMember). */
export const isMember = (fx: Fixture, c: Conversation) => !c.memberIds || c.memberIds.includes(fx.me)

/** A channel you can see: public ones, and private ones you're in (search.modules only returns those, spec §2.3). */
export const isVisibleChannel = (fx: Fixture, c: Conversation) => c.type === 'channel' || (c.type === 'private' && isMember(fx, c))

/**
 * The conversation a screen is about: its route's `conversationId` (or `id`), else the nearest conversation on the stack
 * below it (Channel details' Apps and Agents rows don't pass one), else the workspace's first conversation (a screen
 * pushed by hand, the self-test). Resolved once, so the screen doesn't change under you.
 */
export function useScreenConversation(route: Route): string | undefined {
  const [id] = useState(() => {
    const s = useApp.getState()
    const has = (x: unknown): x is string => typeof x === 'string' && !!s.fx.conversations[x]
    const own = route.conversationId ?? route.id
    if (has(own)) return own
    for (const e of [...s.stacks[s.tab]].reverse()) {
      const c = e.route.conversationId ?? e.route.id
      if (has(c)) return c
    }
    if (has(s.fx.initial?.conversationId)) return s.fx.initial.conversationId
    return Object.values(s.fx.conversations).find((c) => isChannelConversation(c))?.id
  })
  return id
}

/**
 * A title bar button item on iOS 26 (a plain `UIBarButtonItem`): its title in UIKit's 17 pt system font, in the bar's
 * tint highlight1.content (SLAppearance.swift:37), in a glass capsule. `prominent` is `.prominent`: the capsule filled
 * with the tint, a white title (ChannelVisibilityPickerViewController.swift:62-66).
 */
export function BarTextButton({ title, onClick, disabled, prominent }: { title: string; onClick?: () => void; disabled?: boolean; prominent?: boolean }) {
  return (
    <GlassGroup className={['chf-bar', prominent && 'is-prominent', disabled && 'is-disabled'].filter(Boolean).join(' ')}>
      <GlassGroupItem label={title} onClick={disabled ? undefined : onClick}>
        <span className="chf-bar__text">{title}</span>
      </GlassGroupItem>
    </GlassGroup>
  )
}

/**
 * UIKit's system done item with glass styling, as iOS 26 draws `SKBarButtonItem.system(.done, useGlassStyling: true)`:
 * the SF Symbol "checkmark", style `.prominent` — a 44 pt glass circle filled with the bar's tint highlight1.content
 * (SLAppearance.swift:37), the symbol white; VoiceOver "Done" (SKBarButtonItem.swift:375-394, 419-421;
 * HeaderHelperService.swift:229-235, 413-414). Find mode's only bar button since September (June: the text "Done").
 */
export function DoneCheckButton({ onClick }: { onClick: () => void }) {
  return (
    <GlassButton label="Done" onClick={onClick} className="chf-done">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M3.4 9.6 7.2 13.4 14.6 4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </GlassButton>
  )
}

/** A page of the conversation (Pins, Files): its selected icon replaces the type icon, its name the subtitle. */
export interface TitlePage {
  icon: string
  title: string
}

/**
 * The conversation's title pill (ConversationNavigationTitleView; content ConversationHeaderPresentationObject.swift):
 * the same glass capsule and classes as the conversation's own (src/app/screens/conversation/conversation.css), drawn
 * here because that one isn't exported. On the Messages page: the type icon (or the DM avatar), the name in Lato
 * Black 15, "N members • N tabs" in Lato 13. On another page (`page`): the page's selected icon in contentPrimary,
 * the name with the channel's prefix icon (channel_filled 16 pt, −1 pt to the name; lock_filled 14 pt, 2 pt), the
 * page's title as the subtitle (:266-306, :343-361). `onClick` absent: not tappable (find mode,
 * NewConversationHeaderHelperService.swift:402-418).
 */
export function TitlePill({ conversationId, page, onClick }: { conversationId: string; page?: TitlePage; onClick?: () => void }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages[conversationId])
  const conv = fx.conversations[conversationId]
  if (!conv) return null
  const title = conversationTitle(fx, conv)
  let ornament: ReactNode
  let subtitle: ReactNode
  let statusEmoji: string | undefined
  let prefix: ReactNode = null
  if (page) {
    ornament = (
      <span className="convo-title__icon">
        <Icon name={page.icon} size={20} />
      </span>
    )
    subtitle = page.title
    if (isChannelConversation(conv))
      prefix =
        conv.type === 'private' ? (
          <Icon name="lock_filled" size={14} className="chf-pill__prefix" style={{ display: 'inline-block', marginRight: 2 }} />
        ) : (
          <Icon name="channel_filled" size={16} className="chf-pill__prefix" style={{ display: 'inline-block', marginRight: -1 }} />
        )
  } else if (conv.type === 'im') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    ornament = (
      <span className="convo-title__avatar">
        <SKMemberAvatar src={u?.avatar} name={u?.realName ?? conv.name} size="large" round presence={u?.presence === 'away' ? 'away' : 'active'} />
      </span>
    )
    const tabs = conversationTabs(fx, conversationId, messages).length
    if (u?.statusEmoji) {
      statusEmoji = u.statusEmoji
      subtitle = u.statusText ?? ''
    } else subtitle = plural(tabs, '1 tab', '%@ tabs') // `one_tab` / `many_tabs`, yaml:13120 / 10994
  } else {
    const icon = conv.type === 'private' ? 'lock_filled' : conv.type === 'mpim' ? 'message_filled' : 'channel_filled'
    ornament = (
      <span className="convo-title__icon">
        <Icon name={icon} size={20} />
      </span>
    )
    const tabs = conversationTabs(fx, conversationId, messages).length
    const members = conv.type === 'mpim' ? (conv.userIds?.length ?? 0) + (conv.userIds?.includes(fx.me) ? 0 : 1) : (conv.memberCount ?? conv.memberIds?.length ?? 1)
    // `one_member` / `other_members` (yaml:12974 / 13534), " • " (ConversationHeaderPresentationObject.swift:394)
    subtitle = `${plural(members, '1 member', '%@ members')} • ${plural(tabs, '1 tab', '%@ tabs')}`
  }
  const body = (
    <>
      {ornament}
      <span className="convo-title__text">
        <span className="convo-title__name">
          {prefix}
          {title}
        </span>
        <span className="convo-title__subtitle">
          {statusEmoji && <Emoji name={statusEmoji} size={12} className="convo-title__status" />}
          <span className="convo-title__subtitle-text">{subtitle}</span>
        </span>
      </span>
    </>
  )
  if (!onClick)
    return (
      <div className={`convo-title glass chf-pill${conv.type === 'im' && !page ? ' is-dm' : ''}`} aria-label={title}>
        {body}
      </div>
    )
  return (
    <button type="button" className={`convo-title glass${conv.type === 'im' && !page ? ' is-dm' : ''}`} onClick={onClick} aria-label={title} aria-description="Open Menu" data-tap>
      {body}
    </button>
  )
}

/** A channel's name with its "#", for public and private channels alike (`channel_label_format` "#%@", Unlocalized.swift:15-17). */
export const channelLabel = (c: Conversation) => `#${c.name}`
