import type { ReactNode } from 'react'
import { useApp } from '../app/store'
import { useLongPress } from '../app/gestures'
import { RichText, InlineText } from '../app/text/RichText'
import { MessageBlocks } from '../blocks/MessageBlocks'
import { Emoji } from '../emoji/Emoji'
import { Icon } from '../icons/Icon'
import { useDevice } from '../sim/store'
import { SKBadge } from '../slackkit/SKBadge'
import { SKMemberAvatar } from '../slackkit/SKMemberAvatar'
import type { BlockKitBlock, Conversation, Message } from '../data/types'
import { MKAttachment } from './MKAttachment'
import { MKFiles } from './MKFiles'
import { MKReactions } from './MKReactions'
import { MKRepliesInfo } from './MKRepliesInfo'
import { displayName, isAppUser, isSaved, threadInfo, threadReplyTime, timeOnly } from './format'
import { huddleCard } from './huddle'
import './messagekit.css'

// MKMessageView (Modules/UIInfra/MessageKit/Implementation/MKMessageView.swift, spec messages.md §1-§7): a message in
// the channel transcript or a thread. Top to bottom:
//
//   [pre-header]        pinned / saved / ephemeral / "Also sent to the channel", 8 pt above the row (§1.1, §9.8)
//   avatar 36 ·12· [name · APP · 10:42 AM]                         nothing of it when grouped (§1.2, §9.2)
//                  [Replied to a thread: / parent]                 broadcast copies in the channel (§7.4)
//                  [text | blocks] [files] [unfurls] [reactions]  8 pt apart (§2)
//                  [3 replies · Today at 10:42 AM]                 channel only, 8 pt below (§7)
//
// Tap → the thread (in a channel); press and hold → message actions; tap a name or avatar → the profile.

export type MKBackground = 'none' | 'pinned' | 'savedForLater' | 'broadcast' | 'huddle' | 'ephemeral' | 'highlighted'

export interface MKMessageViewProps {
  message: Message
  conversationId: string
  /** set in a thread (the root's ts): thread-reply timestamps, no reply bar, broadcast styling (§1.2, §7.3) */
  threadTs?: string
  /** a rolled-up continuation of the previous message: no avatar, name, badge or time, 4 pt top inset (§9.2) */
  grouped?: boolean
  /** the jumped-to message: surface_highlight_3 (§1.4; SKEntityBackgroundView.swift:111-114 [Sept]) */
  focused?: boolean
  /** a system row (join/leave): its body in content_secondary, not tappable (JoinLeaveMessageTransformationPath.swift:26-66,
   *  129-130 [Sept]; June sk_foreground_max_solid) */
  system?: boolean
  /** in a thread: this reply was also sent to the channel (base_highlight_3 and "Also sent to the channel", §10.7) */
  broadcast?: boolean
}

export function MKMessageView({ message: m, conversationId, threadTs, grouped, focused, system, broadcast }: MKMessageViewProps) {
  const fx = useApp((s) => s.fx)
  const threads = useApp((s) => s.threads)
  const saved = useApp((s) => s.saved)
  const openThread = useApp((s) => s.openThread)
  const presentSheet = useApp((s) => s.presentSheet)
  const device = useDevice()
  const conv = fx.conversations[conversationId]
  const author = fx.users[m.userId]
  const inThread = !!threadTs
  const huddle = huddleCard(fx, conv, m)
  const broadcastCopy = !inThread && !!m.threadTs && m.threadTs !== m.ts
  const broadcastReply = inThread && !!broadcast
  const pinned = !!m.pinnedBy
  const isSavedForLater = isSaved(fx, saved, conversationId, m.ts)

  // Background style, in BackgroundStyleMapper's order (BackgroundStyleMapper.swift:11-49)
  const bg: MKBackground = m.ephemeral
    ? 'ephemeral'
    : huddle?.live
      ? 'huddle'
      : pinned
        ? 'pinned'
        : isSavedForLater
          ? 'savedForLater'
          : broadcastReply
            ? 'broadcast'
            : 'none'

  // Long press → message actions (MessageListActionHandler.swift:79-85); a thread's replies carry the root's ts
  const lp = useLongPress(() => presentSheet('message-actions', { conversationId, ts: m.ts, threadTs: inThread ? threadTs : m.threadTs }))
  const tappable = !inThread && !system && !m.ephemeral
  const onTap = () => {
    // Tap a channel message → its thread (MessageListActionHandler.swift:410-439, 402-471); a broadcast copy opens the
    // thread it was sent from. In a thread, tapping a reply does nothing.
    if (!tappable) return
    openThread(conversationId, broadcastCopy ? m.threadTs! : m.ts)
  }
  const openProfile = (e: React.MouseEvent) => {
    // Tap the avatar or name → the profile, the app's for bots (PrimaryMessageActionHandler.swift:150-199)
    e.stopPropagation()
    if (author) useApp.getState().openProfile(author.id)
  }

  const preheader = preHeaderOf({ ephemeral: m.ephemeral, pinned, saved: isSavedForLater, broadcast: broadcastReply, conv })
  const thread = !inThread && !broadcastCopy ? threadInfo(fx, threads, conversationId, m) : null
  const columnWidth = device.width - 80 // 16 + 36 + 12 … 16 (§1.1)

  const content = (
    <MKMessageContent
      message={m}
      conversationId={conversationId}
      columnWidth={columnWidth}
      bodyText={huddle ? huddle.body : undefined}
      muted={system || !!m.ephemeral || !!huddle}
      showAddReaction={(m.reactions?.length ?? 0) > 0}
      afterText={
        huddle?.canJoin ? (
          <button
            type="button"
            className="mk-join-huddle"
            data-tap
            onClick={(e) => {
              e.stopPropagation()
              presentSheet('huddle', { conversationId })
            }}
          >
            Join huddle
          </button>
        ) : undefined
      }
      startsWithHeader={!grouped}
    />
  )

  return (
    <div
      className={['mk-message', `mk-message--${bg}`, grouped && 'is-grouped', focused && 'is-focused'].filter(Boolean).join(' ')}
      data-tap
      data-ts={m.ts}
      role="article"
      {...lp}
      onClick={onTap}
    >
      {preheader && (
        <div className={`mk-preheader${preheader.icon ? '' : ' is-iconless'}`}>
          {preheader.icon && <Icon name={preheader.icon} size={12.48} className="mk-preheader__icon" style={{ color: preheader.iconColor }} />}
          <span className="mk-preheader__text" style={{ color: preheader.color }}>
            {preheader.text}
          </span>
        </div>
      )}
      <div className="mk-message__main">
        {!grouped &&
          (huddle ? (
            // huddle cards: the headphones glyph in a 36 pt ornament box (MessageFormattingHuddleUtility.swift avatar(for:))
            <span className="mk-ornament" style={{ background: huddle.background, color: huddle.icon }}>
              <Icon name="headphones" size={20} />
            </span>
          ) : (
            <button type="button" className="mk-message__avatar" aria-label={displayName(author)} data-tap onClick={openProfile}>
              <SKMemberAvatar src={author?.avatar} name={author?.realName ?? displayName(author)} size="large" />
            </button>
          ))}
        <div className="mk-message__column">
          {!grouped && (
            <div className="mk-header">
              {huddle ? (
                <span className="mk-header__name">{huddle.title}</span>
              ) : (
                <span className="mk-header__name" role="button" data-tap onClick={openProfile}>
                  {displayName(author)}
                  {/* the author's status emoji, after a space (AuthorMapper.swift:38-46, 136-138) */}
                  {author?.statusEmoji && <Emoji name={author.statusEmoji} size={17} className="rt-emoji" />}
                </span>
              )}
              {huddle?.badge && <SKBadge text={huddle.badge} className={`mk-header__badge mk-header__badge--${huddle.badge === 'LIVE' ? 'live' : 'missed'}`} />}
              {/* bots and apps: "APP" (`app_badge`, yaml:1931; BadgeMapper.swift:73-99) */}
              {!huddle && isAppUser(author) && <SKBadge text="APP" className="mk-header__badge" />}
              <span className="mk-header__time">{inThread ? threadReplyTime(m.ts) : timeOnly(m.ts)}</span>
            </div>
          )}
          {broadcastCopy && <BroadcastMustache conversationId={conversationId} parentTs={m.threadTs!} />}
          {content}
          {thread && <MKRepliesInfo conversationId={conversationId} ts={m.ts} count={thread.count} users={thread.users} latest={thread.latest} />}
          {broadcastCopy && <NewerReplies conversationId={conversationId} message={m} />}
        </div>
      </div>
    </div>
  )
}

interface PreHeader {
  icon?: string
  iconColor?: string
  text: string
  color?: string
}

/** The line above a message (PreHeaderMapper.swift:58-262; strings in spec §9.8). */
function preHeaderOf({ ephemeral, pinned, saved, broadcast, conv }: { ephemeral?: boolean; pinned: boolean; saved: boolean; broadcast: boolean; conv?: Conversation }): PreHeader | null {
  if (ephemeral) return { icon: 'eye_open', iconColor: 'var(--dt_color_content_secondary)', text: 'Only visible to you' } // yaml:14002
  if (broadcast) {
    // "Also sent to the channel" / "…to the conversation" (yaml:21608 / 21611); the `jump` glyph (#←, U+E084) has no SVG:
    // channel_arrow_left is the same drawing
    const direct = conv?.type === 'im' || conv?.type === 'mpim'
    const text = direct ? 'Also sent to the conversation' : 'Also sent to the channel'
    // the icon in content_highlight_1 (PreHeaderMapper.swift:58-157 [Sept]; June sk_highlight)
    return { icon: 'channel_arrow_left', iconColor: 'var(--dt_color_content_highlight_1)', text: pinned ? `${text} • pinned` : text }
  }
  if (pinned) {
    // content_highlight_3 #6b5000 / #dea700, svgPinFilled (PreHeaderMapper.swift)
    const c = 'var(--dt_color_content_highlight_3)'
    return { icon: 'pin_filled', iconColor: c, text: saved ? 'Pinned • Saved for later' : 'Pinned', color: c } // yaml:14768 / 14762
  }
  if (saved) {
    const c = 'var(--dt_color_content_highlight_1)'
    return { icon: 'bookmark_filled', iconColor: c, text: 'Saved for later', color: c } // yaml:16921
  }
  return null
}

/** "Replied to a thread: " / the parent's text, 2 lines (BroadcastMessageMapper.swift:17-43; `replied_to_a_thread`, yaml:16427). */
function BroadcastMustache({ conversationId, parentTs }: { conversationId: string; parentTs: string }) {
  const parent = useApp((s) => (s.messages[conversationId] ?? []).find((x) => x.ts === parentTs))
  return (
    <div className="mk-mustache">
      {'Replied to a thread: '}
      <br />
      <span className="mk-mustache__parent">{parent ? <InlineText text={parent.text.split('\n')[0]} /> : 'Thread'}</span>
    </div>
  )
}

/** "View newer replies" on a channel copy when the thread has moved on (ViewNewerRepliesMapper.swift:11-26; yaml:23246). */
function NewerReplies({ conversationId, message: m }: { conversationId: string; message: Message }) {
  const newer = useApp((s) => (s.threads[`${conversationId}/${m.threadTs}`] ?? []).some((r) => parseFloat(r.ts) > parseFloat(m.ts) + 5))
  const openThread = useApp((s) => s.openThread)
  if (!newer) return null
  return (
    <span
      className="mk-newer-replies"
      role="link"
      onClick={(e) => {
        e.stopPropagation()
        openThread(conversationId, m.threadTs!)
      }}
    >
      View newer replies
    </span>
  )
}

interface ContentProps {
  message: Message
  conversationId: string
  columnWidth: number
  /** replaces the message text (huddle cards, rolled-up join/leave rows) */
  bodyText?: string
  /** content_secondary body: ephemeral, system and huddle messages (DefaultTransformationPath.swift:892-896 [Sept];
   *  MessageFormattingHuddleUtility.swift:108-124) */
  muted?: boolean
  /** the add-reaction pill (channels and replies: once there's a reaction; the thread root: always) */
  showAddReaction?: boolean
  afterText?: ReactNode
  /** a header row sits above: 4 pt between it and a leading file or unfurl (MKMessageView.swift:271-273) */
  startsWithHeader?: boolean
  /** the thread root: its body starts at the top of its slot (MKRootMessageView lays items 12 apart) */
  root?: boolean
}

/** MKMessageContentView (spec §2): text or blocks, files, unfurls, reactions, 8 pt apart. */
export function MKMessageContent({ message: m, conversationId, columnWidth, bodyText, muted, showAddReaction, afterText, startsWithHeader, root }: ContentProps) {
  const text = bodyText ?? m.text
  const blocks = m.blocks as BlockKitBlock[] | undefined
  const hasText = !!text.trim()
  const hasBlocks = !!blocks?.length
  const startsWithAttachment = startsWithHeader && !hasText && !hasBlocks && !afterText
  return (
    <div className={['mk-content', startsWithAttachment && 'starts-with-attachment', root && 'is-root'].filter(Boolean).join(' ')}>
      {hasText && (
        <div className={['mk-text', muted && 'is-muted', hasBlocks && 'mk-text--fallback'].filter(Boolean).join(' ')}>
          <RichText text={text} edited={m.edited && !bodyText} />
        </div>
      )}
      {hasBlocks && (
        <div className="mk-blocks">
          <MessageBlocks blocks={blocks!} conversationId={conversationId} ts={m.ts} />
        </div>
      )}
      {afterText}
      {m.files && m.files.length > 0 && <MKFiles files={m.files} conversationId={conversationId} ts={m.ts} columnWidth={columnWidth} />}
      {m.attachments && m.attachments.length > 0 && (
        <div className="mk-attachments">
          {m.attachments.map((a, i) => (
            <MKAttachment key={`${a.id}-${i}`} attachment={a} columnWidth={columnWidth} />
          ))}
        </div>
      )}
      {((m.reactions?.length ?? 0) > 0 || (root && showAddReaction)) && <MKReactions conversationId={conversationId} ts={m.ts} reactions={m.reactions} showAdd={showAddReaction} />}
    </div>
  )
}
