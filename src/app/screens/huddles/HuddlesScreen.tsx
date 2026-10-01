import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApp, type Route } from '../../store'
import { GlassButton, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { SKButton } from '../../../slackkit/SKButton'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKListHeader } from '../../../slackkit/SKEntity'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { openMenu } from '../../sheets/ui/Menu'
import { MKRepliesInfo } from '../../../messagekit/MKRepliesInfo'
import { huddleCard } from '../../../messagekit/huddle'
import { dayDividerLabel, displayName, sameDay, threadInfo, timeOnly, tsDate } from '../../../messagekit/format'
import type { Conversation, Fixture, HuddleRecord, Message } from '../../../data/types'
import { useHuddle, type LiveRoom } from '../../huddle/state'
import { openCallSheet } from '../../huddle/actions'
import { FacePile } from '../../huddle/parts'
import '../../huddle/huddle.css'
import './huddles.css'

// The Huddles page (spec search-slackbot-huddles.md §3.11; Modules/Features/HuddlesPage/Implementation/
// HuddlesPagePresenter.swift:41-508, Views/*): Home's Huddles tile pushes it. Title "Huddles"
// (live_huddles_synthetic_section_title), a "+" to start one; "Live huddles" as a row of 165 × 88 cards (or "Suggested
// huddles" when none are live), then "Past huddles": the filters row, date dividers and one message-style row per huddle,
// 16 pt spacers with a hairline between the huddles of a day.

export function HuddlesScreen(_: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const rooms = useHuddle((s) => s.rooms)
  const [missedOnly, setMissedOnly] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const live = Object.values(rooms).filter((r) => !r.threadTs && fx.conversations[r.conversationId])

  // The duration labels tick every second (LiveHuddlesRow.swift:38-45).
  useEffect(() => {
    if (!live.length) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [live.length])

  const suggestions = useMemo(() => (live.length ? [] : suggestedConversations(fx, messages)), [live.length, fx, messages])
  const past = useMemo(() => {
    const list = [...(fx.huddles ?? [])].filter((h) => fx.conversations[h.conversationId]).sort((a, b) => parseFloat(b.start) - parseFloat(a.start))
    return missedOnly ? list.filter((h) => isMissed(fx, h)) : list
  }, [fx, missedOnly])

  const showToast = useApp((s) => s.showToast)
  return (
    <div className="ios-pushed-screen huddles-page" data-screen="huddles">
      <div className="ios-scroll huddles-page__list" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 4)}>
        {(live.length > 0 || suggestions.length > 0) && (
          <section>
            <SKListHeader title={live.length ? 'Live huddles' : 'Suggested huddles'} collapsible={false} className="huddles-page__header" />
            <div className="huddles-live" data-scroll-x>
              {live.length
                ? live
                    .sort((a, b) => Number(b.peers.some((p) => p.userId === fx.me)) - Number(a.peers.some((p) => p.userId === fx.me)))
                    .map((r) => <LiveCard key={r.id} room={r} now={now} />)
                : suggestions.map((c) => <SuggestedCard key={c.id} conv={c} />)}
            </div>
            {/* footer: blankDivider (HuddlesPagePresenter.swift:103) */}
            <div style={{ height: 8 }} aria-hidden />
          </section>
        )}
        <section>
          <SKListHeader title="Past huddles" collapsible={false} className={live.length || suggestions.length ? undefined : 'huddles-page__header'} />
          <div className="huddles-filters" data-scroll-x>
            {/* .small custom buttons with chevronDown on the right: basePrimary / contentSecondary / outlineTertiary, or
                highlight1.baseInverse with white when set (HuddlesPagePresenter.swift:313-395) */}
            <FilterButton
              title={missedOnly ? 'Missed huddles' : 'All huddles'}
              highlighted={missedOnly}
              onClick={(el) =>
                openMenu({
                  anchor: el,
                  sections: [
                    {
                      // the selected filter carries svgCheck as its image, not a checked state (HuddlesPagePresenter.swift:
                      // 343-346; SKMenu.swift:222-233 maps the icon to UIAction.image)
                      items: [
                        { title: 'All huddles', icon: missedOnly ? undefined : 'check', onSelect: () => setMissedOnly(false) },
                        { title: 'Missed huddles', icon: missedOnly ? 'check' : undefined, onSelect: () => setMissedOnly(true) },
                      ],
                    },
                  ],
                })
              }
            />
            <FilterButton title="With" onClick={() => showToast('Not in the prototype')} />
            <FilterButton title="In" onClick={() => showToast('Not in the prototype')} />
          </div>
          {past.length === 0 ? (
            missedOnly ? (
              <SKEmptyState title="Nothing turned up" body="You may want to try adjusting your filters." className="huddles-empty" />
            ) : (
              <SKEmptyState content={{ icon: 'headphones' }} body="Easily find and reference past huddle conversations here." className="huddles-empty" />
            )
          ) : (
            <PastRows fx={fx} past={past} messages={messages} threads={threads} />
          )}
        </section>
      </div>
      <NavBar
        title="Huddles"
        scrolled={scrolled}
        trailing={
          <GlassButton label="Start a new huddle" onClick={() => showToast('Not in the prototype')}>
            <Icon name="plus" size={20} />
          </GlassButton>
        }
      />
    </div>
  )
}

function FilterButton({ title, highlighted, onClick }: { title: string; highlighted?: boolean; onClick: (el: HTMLElement) => void }) {
  return (
    <span onClickCapture={(e) => onClick(((e.target as HTMLElement).closest('button') ?? e.currentTarget) as HTMLElement)} style={{ display: 'contents' }}>
      <SKButton
        title={title}
        size="small"
        icon="caret_down"
        iconPosition="right"
        buttonStyle="custom"
        customColors={
          highlighted
            ? { backgroundColor: 'var(--dt_color_base_inverse_highlight_1)', titleColor: 'var(--dt_color_content_inverse_primary)', borderColor: 'var(--dt_color_base_inverse_highlight_1)' }
            : { backgroundColor: 'var(--dt_color_base_primary)', titleColor: 'var(--dt_color_content_secondary)', borderColor: 'var(--dt_color_outline_tertiary)' }
        }
      />
    </span>
  )
}

/** A live huddle's card (LiveHuddlesCell.swift): up to 3 faces (you first), "+N others", the name, the running time. */
function LiveCard({ room, now }: { room: LiveRoom; now: number }) {
  const fx = useApp((s) => s.fx)
  const conv = fx.conversations[room.conversationId]
  const mine = room.peers.some((p) => p.userId === fx.me)
  const ids = [...room.peers.map((p) => p.userId)].sort((a, b) => (a === fx.me ? -1 : b === fx.me ? 1 : 0))
  const extra = ids.length - Math.min(3, ids.length)
  // "+1 other" / "+%i others" (plus_one_other_participant / plus_many_other_participants)
  const overflow = extra === 1 ? '+1 other' : extra > 1 ? `+${extra} others` : ''
  const secs = Math.max(0, Math.floor((now - room.startedAt) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  // "%ihr %im %is" / "%im %is" / "%is" (live_huddle_duration_*, yaml:10743-10755)
  const duration = h ? `${h}hr ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`
  const open = () => (mine ? openCallSheet() : useApp.getState().presentSheet('huddle', { conversationId: room.conversationId }))
  return (
    <button type="button" className={`huddles-card huddles-card--live${mine ? ' is-outlined' : ''}`} onClick={open} data-tap aria-label={`${ids.length} people are in a huddle in ${conv?.name ?? ''}`}>
      <span className="huddle-bg" />
      <span className="huddles-card__overlay" />
      <span className="huddles-card__stack">
        <span className="huddles-card__faces">
          <FacePile users={ids.slice(0, 3).map((id) => fx.users[id])} border={null} />
          {overflow && <span>{overflow}</span>}
        </span>
        <span className="huddles-card__name">{conv ? nameWithPrefix(fx, conv) : 'Private channel'}</span>
        <span className="huddles-card__duration">{duration}</span>
      </span>
    </button>
  )
}

/** "Start a huddle in\n#channel?" / "Start a huddle with\n**name**?" (start_a_huddle_in_channel / start_a_huddle_with_user). */
function SuggestedCard({ conv }: { conv: Conversation }) {
  const fx = useApp((s) => s.fx)
  const other = conv.type === 'im' && conv.userId ? fx.users[conv.userId] : undefined
  let avatar: ReactNode
  let label: ReactNode
  if (conv.type === 'channel' || conv.type === 'private') {
    avatar = (
      <span className="huddles-channel-avatar">
        <Icon name={conv.type === 'private' ? 'lock' : 'channel'} size={20} />
      </span>
    )
    label = (
      <>
        Start a huddle in{'\n'}
        <b>{conv.type === 'private' ? conv.name : `#${conv.name}`}</b>?
      </>
    )
  } else {
    const name = other ? displayName(other) : conv.name
    avatar = other ? (
      <SKMemberAvatar src={other.avatar} name={other.realName} size="medium" />
    ) : (
      <span className="huddles-channel-avatar">
        <Icon name="user_groups" size={20} />
      </span>
    )
    label = (
      <>
        Start a huddle with{'\n'}
        <b>{name}</b>?
      </>
    )
  }
  return (
    <button type="button" className="huddles-card huddles-card--suggested" onClick={() => useApp.getState().presentSheet('huddle', { conversationId: conv.id })} data-tap>
      {avatar}
      <span className="huddles-card__suggest-label">{label}</span>
    </button>
  )
}

function PastRows({ fx, past, messages, threads }: { fx: Fixture; past: HuddleRecord[]; messages: Record<string, Message[]>; threads: Record<string, Message[]> }) {
  const now = new Date()
  let previous = now
  return (
    <>
      {past.map((h, i) => {
        const d = tsDate(h.start)
        // A divider when the day changes, starting from today (HuddlesPagePresenter.swift:269-286)
        const divider = !sameDay(d, previous)
        if (divider) previous = d
        return (
          <Fragment key={h.id}>
            {divider ? <div className="huddles-divider">{dayDividerLabel(h.start, now)}</div> : i > 0 && <div className="huddles-spacer" aria-hidden />}
            <PastRow fx={fx} h={h} messages={messages} threads={threads} />
          </Fragment>
        )
      })}
    </>
  )
}

function PastRow({ fx, h, messages, threads }: { fx: Fixture; h: HuddleRecord; messages: Record<string, Message[]>; threads: Record<string, Message[]> }) {
  const conv = fx.conversations[h.conversationId]
  const cardMsg = (messages[h.conversationId] ?? []).find((m) => m.subtype === 'huddle_thread' && (m.room?.id === h.id || m.ts === h.start))
  const missed = isMissed(fx, h)
  // The body is the card's own copy (MessageFormattingHuddleUtility.threadText), ended at start + minutes.
  const end = `${Math.floor(parseFloat(h.start)) + h.minutes * 60}.000000`
  const pseudo: Message = { ts: h.start, userId: h.participantIds[0] ?? fx.me, text: '', subtype: 'huddle_thread', room: { id: h.id, participantIds: h.participantIds, start: h.start, end } }
  const body = huddleCard(fx, conv, pseudo)?.body ?? ''
  const info = cardMsg ? threadInfo(fx, threads, h.conversationId, cardMsg) : undefined
  const open = () => {
    const s = useApp.getState()
    if (cardMsg) s.openThread(h.conversationId, cardMsg.ts)
    else s.openConversation(h.conversationId)
  }
  return (
    <div className="huddles-row" role="button" data-tap onClick={open} data-qa={`huddle_row_${h.id}`}>
      {/* missed: important.content on important.base; ended: contentSecondary on surfacePrimary (HuddlesPagePresenter.swift:463-484) */}
      <span
        className="huddles-row__ornament"
        style={missed ? { background: 'var(--dt_color_base_important)', color: 'var(--dt_color_content_important)' } : { background: 'var(--dt_color_surface_primary)', color: 'var(--dt_color_content_secondary)' }}
        aria-hidden
      >
        <Icon name="headphones" size={20} />
      </span>
      <div className="huddles-row__column">
        <div className="huddles-row__header">
          <span className="huddles-row__name" style={{ color: missed ? 'var(--dt_color_content_important)' : 'var(--dt_color_content_primary)' }}>
            {conv ? nameWithPrefix(fx, conv) : 'Private channel'}
          </span>
          <span className="huddles-row__time">{timeOnly(h.start)}</span>
        </div>
        {body && <div className="huddles-row__body">{body}</div>}
        {h.notes && (
          <div className="huddles-row__notes" onClick={(e) => e.stopPropagation()}>
            {/* the "View AI Notes" actions block: a Block Kit button (.medium outlineDefault) with svgAiSummary (:486-492) */}
            <SKButton title="View AI Notes" icon="ai_summary" size="medium" buttonStyle="outlineDefault" onClick={open} />
          </div>
        )}
        {info && info.count > 0 && (
          <div className="huddles-row__replies">
            <MKRepliesInfo conversationId={h.conversationId} ts={cardMsg!.ts} count={info.count} users={info.users} latest={info.latest} first />
          </div>
        )}
      </div>
    </div>
  )
}

/** The conversation's name with its icon prefix (Conversation.nameWithIconPrefix): #, a lock, or the person. */
function nameWithPrefix(fx: Fixture, conv: Conversation): ReactNode {
  if (conv.type === 'channel') return <span>#{conv.name}</span>
  if (conv.type === 'private')
    return (
      <>
        <Icon name="lock" size={16} />
        <span>{conv.name}</span>
      </>
    )
  if (conv.type === 'mpim') return <span>{(conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => displayName(fx.users[id])).join(', ')}</span>
  return <span>{conv.userId ? displayName(fx.users[conv.userId]) : conv.name}</span>
}

/** You missed it: a DM huddle you weren't in (PastHuddle.missed). */
const isMissed = (fx: Fixture, h: HuddleRecord) => fx.conversations[h.conversationId]?.type === 'im' && !h.participantIds.includes(fx.me)

/**
 * When nothing's live, Slack suggests places to huddle (the server's suggestedConversations); here: the conversations
 * with the most recent messages, channels and DMs with people.
 */
function suggestedConversations(fx: Fixture, messages: Record<string, Message[]>): Conversation[] {
  const last = (id: string) => parseFloat(messages[id]?.at(-1)?.ts ?? '0')
  return Object.values(fx.conversations)
    .filter((c) => (c.type === 'channel' || c.type === 'private' || c.type === 'im' || c.type === 'mpim') && !(c.type === 'im' && (c.userId === fx.me || fx.users[c.userId ?? '']?.isApp)))
    .sort((a, b) => last(b.id) - last(a.id))
    .slice(0, 5)
}
