import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../store'
import { Composer } from '../../composer/Composer'
import { Icon } from '../../../icons/Icon'
import { SKNavigationTitle, type SKNavigationTitleOrnament } from '../../../slackkit/SKNavigationTitle'
import { MKMessageView } from '../../../messagekit/MKMessageView'
import { MKDivider } from '../../../messagekit/MKDivider'
import { conversationTitle, threadInfo } from '../../../messagekit/format'
import { buildTranscript } from '../conversation/transcript'
import { ChannelIntro } from '../conversation/ChannelIntro'
import type { Conversation, Fixture, Message } from '../../../data/types'
import type { CatchUpItem } from './model'

// A conversation card (UnreadConversationFeature; spec dms-activity.md §5): the outer card (CardContentView: radius 38
// on iOS 26, base_tertiary, a 1 pt outline_tertiary border in dark mode) holding the content container (radius 14,
// base_primary, a 1 pt gray_10 border): the title bar (≥ 48 pt, an SKNavigationTitle inside 12 pt, a 1 pt
// sk_foreground_low divider), then the conversation's transcript opened at the last read message, with its composer
// floating 12 pt from the bottom and sides (UnreadConversationView.swift:31-60, :203-316; CardContentView.swift:11-55;
// UnreadConversationFeature.swift:76-131; ComposerViewConstants.swift:43-47). The swipe overlays sit on top.

const EMPTY: Message[] = []

export type SwipeDir = 'left' | 'right'

interface Props {
  item: CatchUpItem
  /** only the top card takes touches (SwipeCardStack.swift:131-136) */
  isTop: boolean
  /** the swipe overlays' progress, 0…1 (AllUnreadsOverlayView.setProgress) */
  overlay: { left: number; right: number }
  /** a message sent from the card's composer swipes it right (forceSwipeCard, AllUnreadsViewController.swift:413-420) */
  onSent: () => void
}

export function CatchUpCard({ item, isTop, overlay, onSent }: Props) {
  const fx = useApp((s) => s.fx)
  const history = useApp((s) => s.messages[item.conversationId]) ?? EMPTY
  const threads = useApp((s) => s.threads)
  const sendMessage = useApp((s) => s.sendMessage)
  const conv = fx.conversations[item.conversationId]
  const scrollRef = useRef<HTMLDivElement>(null)
  const [composerH, setComposerH] = useState(60)

  // The transcript as the card first showed it: the NEW line stays before the first unread message
  // (MessageTranscriptFeatureConfig overrideMessageAnchor: .lastRead)
  const [anchor] = useState(() => {
    if (item.kind === 'thread') {
      const replies = threads[`${item.conversationId}/${item.threadTs}`] ?? []
      return replies[Math.max(0, replies.length - item.unread)]?.ts
    }
    return history[Math.max(0, history.length - item.unread)]?.ts
  })
  const rows = useMemo(() => {
    if (item.kind === 'thread') {
      const root = history.find((m) => m.ts === item.threadTs)
      const replies = threads[`${item.conversationId}/${item.threadTs}`] ?? []
      return buildTranscript(fx, root ? [root, ...replies] : replies, { conversationId: item.conversationId, newTs: anchor, isThread: true, replyCount: () => 0 })
    }
    return buildTranscript(fx, history, { conversationId: item.conversationId, newTs: anchor, replyCount: (m) => threadInfo(fx, threads, item.conversationId, m).count })
  }, [fx, history, threads, item, anchor])

  // open at the NEW line, or at the bottom; again as the composer settles its height, until you scroll
  const touched = useRef(false)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || touched.current) return
    const divider = el.querySelector<HTMLElement>('[data-new-divider]')
    el.scrollTop = divider ? divider.offsetTop : el.scrollHeight
  }, [composerH])

  if (!conv) return null
  return (
    <div className={`catch-up-card${isTop ? ' is-top' : ''}`} data-qa={`catch_up_card_${item.key}`}>
      <div className="catch-up-card__container">
        <div className="catch-up-card__title">
          <CardTitle fx={fx} conv={conv} item={item} />
        </div>
        <div className="catch-up-card__body" style={{ ['--catch-up-composer-h' as string]: `${composerH}px` }}>
          <div className="ios-scroll catch-up-card__transcript" ref={scrollRef} onPointerDown={() => (touched.current = true)} onWheel={() => (touched.current = true)}>
            <div className="catch-up-card__rows">
              {item.kind === 'conversation' && <ChannelIntro conversationId={item.conversationId} />}
              {rows.map((row) => {
                if (row.kind === 'divider')
                  return (
                    <div key={row.key} data-new-divider={row.isNew || undefined}>
                      <MKDivider date={row.date} isNew={row.isNew} />
                    </div>
                  )
                if (row.kind === 'join') return <MKMessageView key={row.key} message={{ ...row.message, text: row.text }} conversationId={item.conversationId} system />
                return <MKMessageView key={row.key} message={row.message} conversationId={item.conversationId} threadTs={item.kind === 'thread' && row.message.ts !== item.threadTs ? item.threadTs : undefined} grouped={row.grouped} />
              })}
            </div>
          </div>
          <Composer
            conversationId={item.conversationId}
            threadTs={item.kind === 'thread' ? item.threadTs : undefined}
            onHeight={setComposerH}
            onSend={(text, files) => {
              sendMessage(item.conversationId, text, item.kind === 'thread' ? item.threadTs : undefined, files.length ? { files } : undefined)
              onSent()
            }}
          />
        </div>
      </div>
      <SwipeOverlay dir="right" progress={overlay.right} />
      <SwipeOverlay dir="left" progress={overlay.left} />
    </div>
  )
}

/**
 * UnreadConversationPresenter.title (:69-210): channels "#name" (the lock for private ones), DMs the person with their
 * 20 pt avatar, group DMs the names with the member count, a trailing caret; bodyBold 17 sk_primary_foreground, and
 * "You are @mentioned" in captionBold theme.contentSecondary under a channel that mentions you. Threads: "Thread", with
 * the conversation as the subtitle.
 */
function CardTitle({ fx, conv, item }: { fx: Fixture; conv: Conversation; item: CatchUpItem }) {
  const content = titleContent(fx, conv)
  if (item.kind === 'thread')
    return <SKNavigationTitle title="Thread" subtitle={content.text} leftSubtitleOrnament={content.left} rightSubtitleOrnament={{ icon: 'caret_down' }} />
  const mentioned = conv.type !== 'im' && conv.type !== 'mpim' && (fx.unreads[conv.id]?.mentions ?? 0) > 0
  return <SKNavigationTitle title={content.text} leftTitleOrnament={content.left} rightTitleOrnament={{ icon: 'caret_down' }} subtitle={mentioned ? 'You are @mentioned' : undefined} />
}

function titleContent(fx: Fixture, conv: Conversation): { text: ReactNode; left?: SKNavigationTitleOrnament } {
  if (conv.type === 'channel') return { text: `#${conv.name}` }
  if (conv.type === 'private')
    return {
      text: (
        <>
          <Icon name="lock_filled" className="catch-up-card__lock" />
          {conv.name}
        </>
      ),
    }
  if (conv.type === 'mpim') return { text: conversationTitle(fx, conv), left: { count: (conv.userIds ?? []).length } }
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return { text: conversationTitle(fx, conv), left: u?.avatar ? { image: u.avatar } : undefined }
}

/**
 * AllUnreadsOverlayView (:9-120): a radial gradient from the swipe's side (jade_50 → jade_80 for Mark as Read, ocean_50 →
 * ocean_80 for Keep Unread, at 95 %, light-mode palette values), faded in with the swipe; 20 pt in from the top and that
 * side, a 48 pt ring drawing itself clockwise (3 pt white) around a 24 pt icon, filling white at 100 % with the icon in
 * the darker color (AllUnreadsOverlayProgressView.swift:79-108), and the action in headline 28 white, 4 pt below.
 */
function SwipeOverlay({ dir, progress }: { dir: SwipeDir; progress: number }) {
  const p = Math.max(0, Math.min(1, progress))
  const full = p >= 1
  const r = 24
  // the arc from −90° clockwise, as a stroke dash over the circle's circumference
  const circumference = 2 * Math.PI * r
  return (
    <div className={`catch-up-overlay is-${dir}`} style={{ opacity: p }} aria-hidden>
      <div className="catch-up-overlay__stack">
        <span className={`catch-up-overlay__ring${full ? ' is-full' : ''}`}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${circumference * p} ${circumference}`} transform="rotate(-90 24 24)" />
          </svg>
          <Icon name={dir === 'right' ? 'check_filled' : 'eye_closed'} size={24} className="catch-up-overlay__icon" />
        </span>
        <span className="catch-up-overlay__title mk-label">{dir === 'right' ? 'Mark as Read' : 'Keep Unread'}</span>
      </div>
    </div>
  )
}
