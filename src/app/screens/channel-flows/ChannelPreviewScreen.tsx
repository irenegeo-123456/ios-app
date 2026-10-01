import { useLayoutEffect, useRef, useState } from 'react'
import { useApp, type Route } from '../../store'
import { Composer } from '../../composer/Composer'
import { MessageList } from '../conversation/MessageList'
import { BackButton, ConvoBar, HuddleButton } from '../conversation/ConversationNavBar'
import { conversationTabs } from '../conversation/tabs'
import { SKButton } from '../../../slackkit/SKButton'
import type { Conversation } from '../../../data/types'
import { channelLabel, isChannelConversation, isMember, TitlePill, useScreenConversation } from './shared'
import './channel-preview.css'

// A channel you aren't in (spec channels-people.md §3; BD = Modules/Features/AnyConversation/Implementation/Plugins/
// ConversationBottomDrawerPlugin.swift). Its history shows as usual, with no NEW line, and the join drawer takes the
// composer's (and context bar's) place (BD:53-102,285-293): on iOS 26 an interactive Liquid Glass card, radius 32, 16 pt
// from the sides and 12 above the bottom (ConversationBottomDrawerViewController.swift:92-104), holding an SKDialog
// (margins 20 / 24): "#name" (bodyBold, centered), the purpose 4 pt below (smallBody contentSecondary, 2 lines), and
// 20 pt below that a full-width "Join Channel" (.primary, .medium) (BD:470-503). The header keeps the title pill but has
// no huddle button (ConversationHeaderState.swift:139). Join: you're in, the composer replaces the drawer at once, the
// join message posts, and a channel with added tabs opens its tabs menu (AnyConversationInteractor.swift:624-639). Once
// you're a member the screen is just the conversation.
//
//   push({ screen: 'channel-preview', conversationId })

export function ChannelPreviewScreen({ route }: { route: Route }) {
  const id = useScreenConversation(route)
  const conv = useApp((s) => (id ? s.fx.conversations[id] : undefined))
  const member = useApp((s) => !conv || !isChannelConversation(conv) || isMember(s.fx, conv))
  const presentSheet = useApp((s) => s.presentSheet)
  const [composerHeight, setComposerHeight] = useState(60)
  const [drawerHeight, setDrawerHeight] = useState(118)
  const [scrolled, setScrolled] = useState(false)

  if (!id || !conv)
    return (
      <div className="ios-pushed-screen convo" data-screen="channel-preview">
        <ConvoBar leading={<BackButton />} />
      </div>
    )

  const join = () => {
    const s = useApp.getState()
    s.joinChannel(conv.id)
    // a channel with added tabs (its canvas, lists) opens the tabs menu once you've joined
    const added = conversationTabs(s.fx, conv.id, s.messages[conv.id]).some((t) => t.id.startsWith('canvas:') || t.id.startsWith('list:'))
    if (added) requestAnimationFrame(() => presentSheet('conversation-menu', { conversationId: conv.id }))
  }

  return (
    <div className="ios-pushed-screen convo chp" data-screen="channel-preview" data-conversation={conv.id}>
      <MessageList conversationId={conv.id} composerHeight={member ? composerHeight : drawerHeight} topInset="calc(var(--navbar-bottom))" onScrolled={setScrolled} />
      <ConvoBar
        leading={<BackButton />}
        scrolled={scrolled}
        title={<TitlePill conversationId={conv.id} onClick={() => presentSheet('conversation-menu', { conversationId: conv.id })} />}
        trailing={member ? <HuddleButton conversationId={conv.id} /> : undefined}
      />
      {member ? <Composer conversationId={conv.id} onHeight={setComposerHeight} /> : <JoinDrawer conv={conv} onJoin={join} onHeight={setDrawerHeight} />}
    </div>
  )
}

/** The join drawer (BD:470-503, SKDialog spacing SKDialog.swift:231-244,271-280). */
function JoinDrawer({ conv, onJoin, onHeight }: { conv: Conversation; onJoin: () => void; onHeight: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => onHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeight])
  // the name and the purpose open Channel details (BD:298-310) — iOS presents it modally (displayAsModal: true); the
  // clone's channel details is a pushed screen only
  const details = () => useApp.getState().push({ screen: 'channel-details', conversationId: conv.id })
  return (
    <div className="chp-drawer">
      <div ref={ref} className="chp-card glass">
        <button type="button" className="chp-card__name" onClick={details} data-tap>
          {channelLabel(conv)}
        </button>
        {conv.description && (
          <button type="button" className="chp-card__purpose" onClick={details} data-tap>
            {conv.description}
          </button>
        )}
        {/* "Join Channel" (`join_channel`, yaml:10326) */}
        <SKButton title="Join Channel" buttonStyle="primary" size="medium" onClick={onJoin} className="chp-card__join" />
      </div>
    </div>
  )
}
