import type { ReactNode } from 'react'
import { useApp } from '../store'
import { Icon } from '../../icons/Icon'
import { SKBadge } from '../../slackkit/SKBadge'
import { SKButton } from '../../slackkit/SKButton'
import { huddleCard } from '../../messagekit/huddle'
import { timeOnly } from '../../messagekit/format'
import { useLongPress } from '../gestures'
import type { Message } from '../../data/types'
import { useHuddle } from './state'
import { joinHuddle, openCallSheet } from './actions'
import './card.css'

// A huddle's card in a conversation (spec search-slackbot-huddles.md §3.10): the whole message row for a
// `huddle_thread` message, drawn with MKMessageView's anatomy so MessageKit can put it where a message row goes. The copy
// comes from MessageKit's own mapping (src/messagekit/huddle.ts, ported from MessageFormattingHuddleUtility.swift), so
// the card and MessageKit's rows always agree; the live huddle state adds the Join action.
//
//   <HuddleMessageCard conversationId={id} message={m} footer={<MKRepliesInfo … />} />
//
// Tap: the huddle's thread (a channel message opens its thread, MessageListActionHandler.swift:356-385). Long press:
// message actions. "Join huddle" (SKButton .primary) shows while the huddle is live and you're not in it; it opens the
// join preview (§3.2) (HuddleMessageEmbeddablePresenter.swift:30).

export interface HuddleMessageCardProps {
  conversationId: string
  message: Message
  /** the reply bar / reactions MessageKit draws under a message, 8 pt below the content */
  footer?: ReactNode
  /** replaces the default tap (open the huddle's thread) */
  onPress?: () => void
}

export function HuddleMessageCard({ conversationId, message, footer, onPress }: HuddleMessageCardProps) {
  const fx = useApp((s) => s.fx)
  const conv = fx.conversations[conversationId]
  const liveRoom = useHuddle((s) => (message.room ? s.rooms[message.room.id] : undefined))
  const mine = useHuddle((s) => s.mine)
  const lp = useLongPress(() => useApp.getState().presentSheet('message-actions', { conversationId, ts: message.ts }))
  const card = huddleCard(fx, conv, message)
  if (!card) return null
  // AI notes being taken: " AI notes and transcription are on." in bodyBold after the text (huddles_summary_thread_status)
  const notesOn = card.live && !!message.room?.notes
  const join = () => {
    if (liveRoom && mine?.roomId === liveRoom.id) return openCallSheet()
    useApp.getState().presentSheet('huddle', { conversationId })
  }
  const open = onPress ?? (() => useApp.getState().openThread(conversationId, message.ts))
  return (
    <div className={`huddle-card${card.live ? ' is-live' : ''}`} role="article" data-tap onClick={open} data-ts={message.ts} data-qa="huddle_card" {...lp}>
      <span className="huddle-card__ornament" style={{ background: card.background, color: card.icon }} aria-hidden>
        <Icon name="headphones" size={20} />
      </span>
      <div className="huddle-card__column">
        <div className="huddle-card__header">
          <span className="huddle-card__title">{card.title}</span>
          {card.badge === 'LIVE' && (
            // ColorSet.Constants.white on highlight2.baseInverse (HuddleMessageTransformationPath.swift:214-222)
            <SKBadge title="LIVE" badgeStyle="text" textColor="var(--dt_color_constants_white)" backgroundColor="var(--dt_color_base_inverse_highlight_2)" className="huddle-card__badge" />
          )}
          {card.badge === 'MISSED' && (
            <SKBadge title="MISSED" badgeStyle="text" textColor="var(--dt_color_content_important)" backgroundColor="var(--dt_color_base_important)" className="huddle-card__badge" />
          )}
          <span className="huddle-card__time">{timeOnly(message.ts)}</span>
        </div>
        {(card.body || notesOn) && (
          <div className="huddle-card__body">
            {card.body}
            {notesOn && <b> AI notes and transcription are on.</b>}
          </div>
        )}
        {card.canJoin && (
          <div className="huddle-card__join" onClick={(e) => e.stopPropagation()}>
            <SKButton title="Join huddle" buttonStyle="primary" size="medium" onClick={join} />
          </div>
        )}
        {footer && <div className="huddle-card__footer">{footer}</div>}
      </div>
    </div>
  )
}

/** Join the live huddle a card belongs to, straight away (for callers that skip the preview). */
export function joinFromCard(message: Message) {
  const id = message.room?.id
  if (!id || !useHuddle.getState().rooms[id]) return false
  joinHuddle(id)
  openCallSheet()
  return true
}
