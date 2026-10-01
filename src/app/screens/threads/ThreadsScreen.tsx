import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Route } from '../../store'
import { useApp } from '../../store'
import { NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { SKButton } from '../../../slackkit/SKButton'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKPillButton } from '../../../slackkit/SKPillButton'
import { MKMessageView } from '../../../messagekit/MKMessageView'
import { MKDivider } from '../../../messagekit/MKDivider'
import { displayName } from '../../../messagekit/format'
import type { ActivityItem, Conversation, Fixture, Message } from '../../../data/types'
import './threads.css'

// All threads (Modules/Features/AllThreads; spec dms-activity.md §4), pushed from Home's Threads tile: the standard
// bar ("Threads", with "N unread(s)" under it when some are), then one section per thread you're in, most recent first:
// a header (the conversation, who replied), the root message, "N more replies", the latest replies, the NEW line and
// the unread replies, [Mark as Read] [Reply], and a 12 pt emphasized band between sections. Rows are full messages
// (MKMessageView). Default flags: allThreadsRefresh and threadDiscrepanciesFix off.

/** The latest read replies the thread view shows (latest_replies). */
const LATEST = 2

interface ThreadModel {
  key: string
  conv: Conversation
  root: Message
  replies: Message[]
  /** the replies you haven't read (from the Activity feed's unread thread row, if any) */
  unread: Message[]
  latest: Message[]
  moreCount: number
  /** the header's second line: up to 4 repliers, then ", and N others" */
  description: string
}

/** Threads you're part of: you started them or replied (PaginatedThreadSubscription; ThreadsState most relevant first). */
function buildThreads(fx: Fixture, messages: Record<string, Message[]>, threads: Record<string, Message[]>, activity: ActivityItem[], readKeys: Set<string>): ThreadModel[] {
  const out: ThreadModel[] = []
  for (const [key, replies] of Object.entries(threads)) {
    if (!replies.length) continue
    const [conversationId, rootTs] = key.split('/')
    const conv = fx.conversations[conversationId]
    const root = messages[conversationId]?.find((m) => m.ts === rootTs)
    if (!conv || !root) continue
    const mine = root.userId === fx.me || replies.some((r) => r.userId === fx.me)
    if (!mine) continue
    const sorted = [...replies].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
    const item = activity.find((a) => a.type === 'thread' && a.conversationId === conversationId && a.threadTs === rootTs && a.unread)
    const unreadCount = item && !readKeys.has(key) ? Math.min(sorted.length, item.unreadCount ?? 1) : 0
    const unread = unreadCount ? sorted.slice(-unreadCount) : []
    const read = unreadCount ? sorted.slice(0, -unreadCount) : sorted
    // Off: every latest reply is listed; the server sends the last ones (AllThreadsInteractor.swift:367-390)
    const latest = read.slice(-LATEST)
    const replyCount = Math.max(root.replyCount ?? 0, sorted.length)
    const moreCount = replyCount - latest.length - unread.length
    // up to 4 reply authors, then ", and 1 other" / ", and %@ others" (PaginatedThreadSubscription.swift:270-289)
    const replyUsers = [...new Set([...(root.replyUsers ?? []), ...sorted.map((r) => r.userId)])]
    const names = replyUsers.slice(0, 4).map((id) => displayName(fx.users[id]))
    const leftover = replyUsers.length - names.length
    const description = names.join(', ') + (leftover > 0 ? `, ${leftover === 1 ? 'and 1 other' : `and ${leftover} others`}` : '')
    out.push({ key, conv, root, replies: sorted, unread, latest, moreCount, description })
  }
  const last = (t: ThreadModel) => parseFloat(t.replies.at(-1)?.ts ?? t.root.ts)
  return out.sort((a, b) => last(b) - last(a))
}

export function ThreadsScreen(_: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const markActivityRead = useApp((s) => s.markActivityRead)
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set())
  const [scrolled, setScrolled] = useState(false)
  // the first thread's root message has scrolled out of view: the "Back to Top" pill (ElevatorPillInteractor.swift:74-81,
  // AllThreadsInteractor.swift:609-625: the list's top is an endOfList item while the first row isn't visible)
  const [pastFirstRow, setPastFirstRow] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const activity = fx.activity ?? []
  const list = useMemo(() => buildThreads(fx, messages, threads, activity, readKeys), [fx, messages, threads, activity, readKeys])
  const unreadCount = list.filter((t) => t.unread.length > 0).length

  const markRead = (t: ThreadModel) => {
    setReadKeys((s) => new Set(s).add(t.key))
    for (const a of activity) if (a.type === 'thread' && `${a.conversationId}/${a.threadTs}` === t.key) markActivityRead(a.id)
  }

  return (
    <div className="ios-pushed-screen threads" data-screen="threads">
      <div
        ref={listRef}
        className="ios-scroll threads__list"
        onScroll={(e) => {
          const el = e.target as HTMLElement
          setScrolled(el.scrollTop > 0)
          const first = el.querySelector<HTMLElement>('.threads__message')
          // visible rows count from under the bar (the list's top inset)
          setPastFirstRow(!!first && first.offsetTop + first.offsetHeight - el.scrollTop <= parseFloat(getComputedStyle(el).paddingTop))
        }}
        data-qa="threads_list"
      >
        {list.length ? (
          list.map((t, i) => <ThreadSection key={t.key} thread={t} last={i === list.length - 1} onMarkRead={() => markRead(t)} />)
        ) : (
          // SKEmptyState with 🧵 (AllThreadsPresenter.swift:231-239)
          <SKEmptyState
            className="threads__empty"
            content={{ emoji: 'thread' }}
            title="Have thoughts on a specific message?"
            body="Reply directly in a thread to keep the conversation organized and on topic."
          />
        )}
        <div className="threads__bottom-space" />
      </div>
      {pastFirstRow && (
        // ElevatorPillViewController, style .floatingActionButton with the core colors (contentPrimary on baseTertiary,
        // a 1 pt outlineTertiary outline, glass), the caret (svgCaretUpFull; the arrow with messageTranscriptElevatorPill),
        // a .medium icon pill, its leading edge 65 pt from the trailing edge and 16 pt above the bottom
        // (ElevatorPillViewController.swift:21-23, :73-78, :97-132; ColorSetFABConfigurator.swift:25-75;
        // SKFloatingActionButton+Extensions.swift:103-140); tap scrolls back to the top
        <SKPillButton
          className="threads__back-to-top"
          icon="caret_up_full"
          iconColor="var(--dt_color_content_primary)"
          size="medium"
          unselectedColor="var(--dt_color_base_tertiary)"
          selectedColor="var(--dt_color_base_tertiary)"
          outlineColor="var(--dt_color_outline_tertiary)"
          shouldAnimateTransition
          accessibilityLabel="Back to Top"
          onClick={() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      )}
      <NavBar
        title="Threads"
        // "%@ unread" / "%@ unreads", smallBody 15 content_secondary (AllThreadsViewController.swift:191-224)
        subtitle={unreadCount > 0 ? <span className="threads__subtitle">{unreadCount === 1 ? '1 unread' : `${unreadCount} unreads`}</span> : undefined}
        scrolled={scrolled}
      />
    </div>
  )
}

function ThreadSection({ thread: t, last, onMarkRead }: { thread: ThreadModel; last: boolean; onMarkRead: () => void }) {
  const fx = useApp((s) => s.fx)
  const open = useApp((s) => s.openConversation)
  const push = useApp((s) => s.push)
  const convId = t.conv.id
  // Tapping a message opens the thread at it (AllThreadsInteractor.swift:627-757)
  const openAt = (ts?: string) => push({ screen: 'thread', conversationId: convId, ts: t.root.ts, ...(ts ? { jumpTs: ts } : {}) })
  // Reply opens the thread at its latest message, highlighted, with the keyboard up (AllThreadsInteractor.swift:655-658)
  const reply = () => {
    const latest = t.replies.at(-1)?.ts
    push({ screen: 'thread', conversationId: convId, ts: t.root.ts, ...(latest ? { jumpTs: latest } : {}) })
    window.setTimeout(() => {
      const screens = document.querySelectorAll('[data-screen="thread"]')
      screens[screens.length - 1]?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
    }, 350)
  }
  const row = (m: Message) => (
    <div key={m.ts} className="threads__message" onClick={() => openAt(m.ts === t.root.ts ? undefined : m.ts)}>
      <MKMessageView message={m} conversationId={convId} threadTs={t.root.ts} />
    </div>
  )
  return (
    <section className="threads__section" data-thread={t.key}>
      {/* SKHeaderEntity .medium, always tappable: the conversation's name in bodyBold, the repliers under it */}
      <div className="threads__header" role="button" onClick={() => open(convId)} data-tap>
        <div className="threads__header-title mk-label">
          <ConversationName fx={fx} conv={t.conv} />
        </div>
        {t.description && <div className="threads__header-subtitle mk-label">{t.description}</div>}
      </div>
      {row(t.root)}
      {t.moreCount > 0 && (
        // "1 more reply" / "%@ more replies" (`one_more_reply`, `other_more_replies`), a link indented with the messages
        <div className="threads__more" role="link" onClick={() => openAt()} data-tap>
          <span className="mk-label">{t.moreCount === 1 ? '1 more reply' : `${t.moreCount} more replies`}</span>
        </div>
      )}
      {t.latest.map(row)}
      {t.unread.length > 0 && <MKDivider isNew />}
      {t.unread.map(row)}
      {/* SKButtonEntity .wrapContent(indented): [Mark as Read] [Reply], .medium, 8 pt apart (AllThreadsPresenter.swift:147-153) */}
      <div className="threads__buttons">
        {t.unread.length > 0 && <SKButton title="Mark as Read" buttonStyle="primary" onClick={onMarkRead} />}
        <SKButton title="Reply" buttonStyle="outlineDefault" onClick={reply} />
      </div>
      {/* .emphasized footer: a 12 pt base_secondary band with hairlines, not after the last section */}
      {!last && <div className="threads__band" />}
    </section>
  )
}

/**
 * ConversationNameUtils.displayName (AllThreads/Utility/ConversationNameUtils.swift:18-71): "#name" for public channels,
 * the lock + name for private ones, the group-DM icon + names, the person's presence icon + name; " (archived)".
 */
function ConversationName({ fx, conv }: { fx: Fixture; conv: Conversation }): ReactNode {
  if (conv.type === 'channel') return <>#{conv.name}</>
  if (conv.type === 'private')
    return (
      <>
        <Icon name="lock_filled" className="threads__name-icon" />
        {conv.name}
      </>
    )
  if (conv.type === 'mpim') {
    const others = (conv.userIds ?? []).filter((id) => id !== fx.me)
    const names = others.map((id) => displayName(fx.users[id])).sort((a, b) => a.localeCompare(b)).join(', ')
    // SLKIconHelpers.iconForMPDM(count): the multiparty DM glyph for the member count
    const n = Math.min(Math.max(others.length, 2), 15)
    return (
      <>
        <Icon name={`multiparty_dm_${n}_filled`} className="threads__name-icon" />
        {names}
      </>
    )
  }
  const u = conv.userId ? fx.users[conv.userId] : undefined
  const away = u?.presence === 'away'
  return (
    <>
      <Icon name={away ? 'status_member' : 'status_member_filled'} className="threads__name-icon" color={away ? 'var(--dt_color_content_tertiary)' : 'var(--theme_presenceActive)'} />
      {displayName(u)}
    </>
  )
}
