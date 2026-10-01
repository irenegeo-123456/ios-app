import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useApp } from '../store'
import { useSheet, type SheetContextValue } from '../nav/SheetHost'
import type { SheetProps } from '../nav/registry'
import { useDevice } from '../../sim/store'
import { Icon } from '../../icons/Icon'
import { SKButton } from '../../slackkit/SKButton'
import { SKMemberAvatar } from '../../slackkit/SKMemberAvatar'
import { displayName } from '../../messagekit/format'
import type { Conversation, Fixture, User } from '../../data/types'
import { useHuddle, type LiveRoom } from './state'
import { joinHuddle, openCallSheet, startHuddle } from './actions'
import './huddle.css'

// The start / join preview (spec search-slackbot-huddles.md §3.2; HuddlesPreviewViewController.swift:151-219, 522-535,
// September 2026): on iPhone a UIKit sheet with one self-sized detent (HuddlesPreviewFeature.swift:72-78), the detent
// being the scroll content's height, UIKit adding the bottom safe area. The participants row (66 pt, 56 pt avatars in
// 66 pt cells, centered, at least 16 pt in) starts 32 pt below the sheet's edge; 16 pt later the title (.subtitle,
// centered) and subtitle (.body, centered, 6 pt apart), then 24 pt to the buttons (.large, stacked 8 pt apart, 16 pt side
// margins) and the content's bottom. Matches HuddlesPreviewViewControllerSnapshotTest/testDMPreview@3x.png. `<channel>`
// spans are channel mentions in highlight1.content bold (HuddlesPreviewViewStateMapperInterface.swift:64-90). The Cancel
// button is configured but never added to the view (not in actionsStackView, :28-45), so a drag cancels.

type Copy = { title: ReactNode; subtitle: ReactNode; join: boolean }

export function HuddlePreviewSheet({ conversationId, threadTs }: SheetProps & { conversationId?: string; threadTs?: string }) {
  const fx = useApp((s) => s.fx)
  const sheet = useSheet()
  const device = useDevice()
  const mine = useHuddle((s) => s.mine)
  const live = useHuddle((s) => Object.values(s.rooms).find((r) => r.conversationId === conversationId && (r.threadTs ?? '') === (threadTs ?? '')))
  const [joining, setJoining] = useState(false)

  // Already in this huddle (the header's active pill): straight to its sheet.
  useLayoutEffect(() => {
    if (live && mine?.roomId === live.id) openCallSheet()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const conv = conversationId ? fx.conversations[conversationId] : undefined
  if (!conv || !conversationId) return <div className="huddle-preview" />

  const members = previewMembers(fx, conv, live)
  const copy = previewCopy(fx, conv, live, threadTs)
  // As many 66 pt cells as fit inside the 16 pt minimum insets (HuddlePreviewParticipantsView.swift:70, 129-134).
  const fit = Math.max(1, Math.floor((device.width - 32) / 66))

  const primary = () => {
    setJoining(true)
    // The joining state (processing, "Joining") lasts until the huddle connects, then the sheet presents (§3.2).
    window.setTimeout(() => {
      if (live) joinHuddle(live.id)
      else startHuddle(conversationId, { threadTs })
      openCallSheet()
    }, 700)
  }

  return (
    <div className="huddle-preview" data-qa="huddle_preview">
      <div className="huddle-preview__participants">
        {members.slice(0, fit).map((u) => (
          <span key={u.id} className="huddle-preview__participant">
            <SKMemberAvatar src={u.avatar} name={u.realName} size="extraLarge" />
          </span>
        ))}
      </div>
      <div className="huddle-preview__text">
        <div className="huddle-preview__title">{copy.title}</div>
        <div className="huddle-preview__subtitle">{copy.subtitle}</div>
      </div>
      <div className="huddle-preview__actions">
        <SKButton
          title={joining ? 'Joining' : copy.join ? 'Join huddle' : 'Huddle'}
          size="large"
          icon={joining ? undefined : 'headphones'}
          state={joining ? 'processing' : 'enabled'}
          buttonStyle="custom"
          // HuddlesStartPreviewViewStateMapper.swift:43-100: highlight2.baseInverse fill, white text, same border; joining
          // is baseTertiary / contentSecondary with the spinner
          customColors={
            joining
              ? { backgroundColor: 'var(--dt_color_base_tertiary)', titleColor: 'var(--dt_color_content_secondary)', borderColor: 'transparent' }
              : { backgroundColor: 'var(--dt_color_base_inverse_highlight_2)', titleColor: 'var(--dt_color_constants_white)', borderColor: 'var(--dt_color_base_inverse_highlight_2)' }
          }
          onClick={primary}
          accessibilityLabel={copy.join ? 'Join huddle' : 'Huddle'}
          className="huddle-preview__primary"
          data-qa="huddle_preview_primary"
        />
      </div>
      <CancelOnEscape sheet={sheet} />
    </div>
  )
}

/** Escape (accessibilityPerformEscape → cancel, :334-337). */
function CancelOnEscape({ sheet }: { sheet: SheetContextValue | null }) {
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && sheet?.dismiss()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])
  return null
}

/** Who the participants row shows: who's in a live huddle; else you and the people you'd call. */
function previewMembers(fx: Fixture, conv: Conversation, live: LiveRoom | undefined): User[] {
  const u = (id: string | undefined) => (id ? fx.users[id] : undefined)
  const ids = live
    ? live.peers.map((p) => p.userId)
    : conv.type === 'im'
      ? [fx.me, conv.userId]
      : conv.type === 'mpim'
        ? [fx.me, ...(conv.userIds ?? []).filter((id) => id !== fx.me)]
        : [fx.me]
  return ids.map(u).filter((x): x is User => !!x)
}

/** A `<channel>` span: the channel mention, # or lock, in highlight1.content bold (TextFormatHelper.formattedText). */
const ChannelSpan = ({ conv }: { conv: Conversation }) => (
  <span className="huddle-preview__channel">
    {conv.type === 'private' ? <Icon name="lock" size={15} className="huddle-preview__lock" /> : '#'}
    {conv.name}
  </span>
)

function previewCopy(fx: Fixture, conv: Conversation, live: LiveRoom | undefined, threadTs: string | undefined): Copy {
  const isChannel = conv.type === 'channel' || conv.type === 'private'
  const name = (id: string) => displayName(fx.users[id])
  if (live && live.peers.every((p) => p.userId !== fx.me)) {
    // Join (HuddlesJoinPreviewViewStateMapper.swift:180-315)
    const others = live.peers.map((p) => p.userId).filter((id) => id !== fx.me)
    const n = others.length
    let title: ReactNode
    if (conv.type === 'im') title = conv.userId ? name(conv.userId) : ''
    else if (n === 0) title = 'There’s a huddle happening now' // huddle_join_channel_title
    else if (n === 1) title = `Join ${name(others[0])} in the huddle` // huddle_join_one_title
    else if (n === 2) title = `Join ${name(others[0])} and ${name(others[1])} in the huddle` // huddle_join_two_title
    else title = `Join ${name(others[0])} and ${n - 1} others in the huddle` // huddle_join_multiple_title
    let subtitle: ReactNode
    if (n === 0) subtitle = 'Drop in if you’d like.' // huddle_join_default_message
    else if (n === 1)
      subtitle = isChannel ? (
        <>
          {name(others[0])} is already in the huddle in <ChannelSpan conv={conv} />. Drop in if you’d like.
        </>
      ) : (
        `${name(others[0])} is already in the huddle. Drop in if you’d like.` // huddle_join_one_message
      )
    else if (n === 2)
      subtitle = isChannel ? (
        <>
          {name(others[0])} and {name(others[1])} are talking in <ChannelSpan conv={conv} />. Drop in if you’d like.
        </>
      ) : (
        `${name(others[0])} and ${name(others[1])} are talking. Drop in if you’d like.` // huddle_join_two_message
      )
    else
      subtitle = isChannel ? (
        <>
          {name(others[0])} and {n - 1} other people are talking in <ChannelSpan conv={conv} />. Drop in if you’d like.
        </>
      ) : (
        `${name(others[0])} and ${n - 1} other people are talking. Drop in if you’d like.` // huddle_join_multiple_message
      )
    return { title, subtitle, join: true }
  }

  // Start (HuddlesStartPreviewViewStateMapper.swift:130-220)
  if (threadTs) {
    const subtitle =
      conv.type === 'mpim' ? (
        'Use this message as a jumping off point for a huddle. All members of this conversation will be able to join.' // huddle_start_thread_message_mpdm
      ) : isChannel ? (
        <>
          Use this message as a jumping off point for a huddle. All members of <ChannelSpan conv={conv} /> will be able to join.
        </>
      ) : (
        'Use this message as a jumping off point for a huddle.' // huddle_start_thread_message_dm
      )
    return { title: 'Continue this conversation in a huddle', subtitle, join: false } // huddle_start_thread_title
  }
  if (isChannel)
    return {
      title: 'Talk it out in a huddle', // huddle_start_channel_title
      subtitle: (
        <>
          Anyone in <ChannelSpan conv={conv} /> can drop in to join the conversation.
        </>
      ), // huddle_start_channel_message
      join: false,
    }
  const members = conv.type === 'im' ? [conv.userId].filter(Boolean) as string[] : (conv.userIds ?? []).filter((id) => id !== fx.me)
  let title: string
  if (members.length === 0) title = 'Talk it out in a huddle'
  else if (members.length === 1) title = `Start a huddle with ${name(members[0])}` // huddle_start_with_one_title
  else if (members.length === 2) title = `Start a huddle with ${name(members[0])} and ${name(members[1])}` // huddle_start_with_two_title
  else title = `Start a huddle with ${name(members[0])} and ${members.length - 1} others` // huddle_start_with_multiple_title
  return { title, subtitle: 'They’ll receive a notification to join.', join: false } // huddle_start_notification_message
}
