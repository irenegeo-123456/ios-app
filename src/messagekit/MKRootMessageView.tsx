import { useApp } from '../app/store'
import { useLongPress } from '../app/gestures'
import { Emoji } from '../emoji/Emoji'
import { Icon } from '../icons/Icon'
import { useDevice } from '../sim/store'
import { SKMemberAvatar } from '../slackkit/SKMemberAvatar'
import type { Message } from '../data/types'
import { MKMessageContent } from './MKMessageView'
import { displayName, isSaved, repliesText, shortOrdinal } from './format'
import { huddleCard } from './huddle'
import './messagekit.css'

// A thread's root message (MKRootMessageView, spec messages.md §10.7): 12 pt padding, a 36 pt avatar at (12, 12), the
// name with the time under it as its "mustache", the body full width from x 12, and the add-reaction pill always shown
// (MessageTransformationMapper.swift:259-277). Then the thread toolbar (MKThreadToolbar) between two hairlines.

export function MKRootMessageView({ message: m, conversationId, focused }: { message: Message; conversationId: string; focused?: boolean }) {
  const fx = useApp((s) => s.fx)
  const presentSheet = useApp((s) => s.presentSheet)
  const device = useDevice()
  const saved = useApp((s) => s.saved)
  const author = fx.users[m.userId]
  const huddle = huddleCard(fx, fx.conversations[conversationId], m)
  // the row's background style, as for any message (BackgroundStyleMapper.swift:11-49; testRootMessageCustomBackgroundStyle)
  const bg = m.ephemeral ? 'ephemeral' : huddle?.live ? 'huddle' : m.pinnedBy ? 'pinned' : isSaved(fx, saved, conversationId, m.ts) ? 'savedForLater' : 'none'
  const lp = useLongPress(() => presentSheet('message-actions', { conversationId, ts: m.ts, threadTs: m.ts }))
  const openProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (author && !huddle) useApp.getState().openProfile(author.id)
  }
  return (
    <div className={`mk-root mk-message--${bg}${focused ? ' is-focused' : ''}`} data-tap data-ts={m.ts} role="article" {...lp}>
      <div className="mk-root__header">
        {huddle ? (
          <span className="mk-ornament" style={{ background: huddle.background, color: huddle.icon }}>
            <Icon name="headphones" size={20} />
          </span>
        ) : (
          <button type="button" className="mk-message__avatar" aria-label={displayName(author)} data-tap onClick={openProfile}>
            <SKMemberAvatar src={author?.avatar} name={author?.realName ?? displayName(author)} size="large" />
          </button>
        )}
        <div className="mk-root__names">
          <span className="mk-root__name" role={huddle ? undefined : 'button'} data-tap={huddle ? undefined : true} onClick={openProfile}>
            {huddle ? huddle.title : displayName(author)}
            {!huddle && author?.statusEmoji && <Emoji name={author.statusEmoji} size={17} className="rt-emoji" />}
          </span>
          {/* `.absolute`: "Today at 10:42 AM" (TimestampMapper.swift:31-33) */}
          <span className="mk-root__time">{shortOrdinal(m.ts)}</span>
        </div>
      </div>
      <div className="mk-root__content">
        <MKMessageContent
          message={m}
          conversationId={conversationId}
          columnWidth={device.width - 24}
          bodyText={huddle ? huddle.body : undefined}
          muted={!!huddle || !!m.ephemeral}
          showAddReaction
          root
        />
      </div>
    </div>
  )
}

/**
 * MKMessageActionToolbar under the root (ThreadRootMessagePlugin.swift:314-399; MKMessageActionToolbar.swift:79-190):
 * "N replies" (inactive) or "Reply in Thread", then Save, Forward and More.
 */
export function MKThreadToolbar({ message: m, conversationId, replyCount, onReply }: { message: Message; conversationId: string; replyCount: number; onReply: () => void }) {
  const fx = useApp((s) => s.fx)
  const saved = useApp((s) => s.saved)
  const toggleSaved = useApp((s) => s.toggleSaved)
  const presentSheet = useApp((s) => s.presentSheet)
  const isSavedForLater = isSaved(fx, saved, conversationId, m.ts)
  const canReply = !m.ephemeral
  return (
    <div className="mk-toolbar">
      {replyCount > 0 ? (
        <button type="button" className="mk-toolbar__title" disabled>
          {repliesText(replyCount)}
        </button>
      ) : (
        canReply && (
          // "Reply in Thread" (`reply_in_thread`, yaml:16447) with the `smallReply` glyph (a speech bubble; `threads` is
          // the same drawing); tap focuses the composer (ThreadRootMessagePlugin.swift:280-281)
          <button type="button" className="mk-toolbar__title" data-tap onClick={onReply}>
            <Icon name="threads" size={20} />
            Reply in Thread
          </button>
        )
      )}
      <span className="mk-toolbar__spacer" />
      <button
        type="button"
        className="mk-toolbar__button"
        aria-label={isSavedForLater ? 'Remove From Saved Items' : 'Save'} // yaml:16231 / 16880
        style={isSavedForLater ? { ['--mk-toolbar-tint' as string]: 'var(--dt_color_content_highlight_1)' } : undefined}
        data-tap
        onClick={() => toggleSaved(conversationId, m.ts)}
      >
        {/* bookmark glyph, svgBookmarkFilled in content_highlight_1 when saved */}
        <Icon name={isSavedForLater ? 'bookmark_filled' : 'bookmark'} size={20} />
      </button>
      <button type="button" className="mk-toolbar__button" aria-label="Forward Message" data-tap onClick={() => presentSheet('forward', { conversationId, ts: m.ts })}>
        <Icon name="share_message" size={20} />
      </button>
      <button
        type="button"
        className="mk-toolbar__button"
        aria-label="Show more options" // `show_more_options`, yaml:18972
        data-tap
        onClick={() => presentSheet('message-actions', { conversationId, ts: m.ts, threadTs: m.ts })}
      >
        <Icon name="ellipsis_horizontal_filled" size={20} />
      </button>
    </div>
  )
}
