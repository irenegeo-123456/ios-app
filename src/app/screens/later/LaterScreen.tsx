import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Route } from '../../store'
import { useApp } from '../../store'
import { GlassButton, GlassGroup, NavBar } from '../../nav/NavBar'
import { openMenu, showAlert, type MenuAction } from '../../sheets'
import { Icon } from '../../../icons/Icon'
import { SKPageController } from '../../../slackkit/SKPageController'
import { SKButton } from '../../../slackkit/SKButton'
import { SKEmptyState, type SKEmptyStateContent } from '../../../slackkit/SKEmptyState'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKOrnamentBox } from '../../../slackkit/SKOrnamentBox'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { MKMessagePreview, mkPreviewContent, mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { conversationTitle, displayName } from '../../../messagekit/format'
import type { Conversation, Fixture } from '../../../data/types'
import { LATER_TABS, hasDueDate, isOverdue, laterEntries, type LaterEntry, type LaterTab } from './model'
import { toTimeAgo } from './time'
import './later.css'

// Later (Modules/Features/Tasks; spec dms-activity.md §6), pushed from Home's Later tile (LaterTile.swift:131-139): the
// standard bar ("Later", saved_for_later_title) with the tab's buttons, then an SKPageController with underline tabs at
// the top, equal widths, no swiping between pages (TasksViewController.swift:176-206): "In Progress" + its count,
// "Archived", "Completed". Each page is a list of saved messages, one section each: an MKMessagePreview (the author's
// avatar and name, where it's from and its reminder above) and, In Progress, [Complete] [⏰] (TasksListPresenter.swift
// :63-79, :199-225, :310-360). Default flags: laterTodos, todosV2 and laterCreateReminder off.

/** Emoji states once a tab you had items on is emptied (TasksListPresenter.swift:141-157), in Slack's order. */
const CONGRATS: Record<LaterTab, { emoji: string; title: string; body: string }[]> = {
  in_progress: [
    { emoji: 'sports_medal', title: 'You made a lot of progress', body: 'You checked everything off your list.' },
    { emoji: 'leaves', title: 'Nothing here', body: 'Enjoy a little moment to yourself.' },
    { emoji: 'whale', title: 'All done', body: 'Look at you go.' },
  ],
  archived: [{ emoji: 'package', title: 'Nothing rattling around in here', body: 'Archive messages from in progress if you want to come back to them often.' }],
  completed: [{ emoji: 'sparkles', title: 'All clear', body: 'The future is yours.' }],
}

/** The empty states (TasksListPresenter.swift:124-162; TasksListDataTypes.swift:208-232). */
const EMPTY: Record<LaterTab, { illustration: 'later_in_progress' | 'later_archived' | 'later_completed'; title: string; body: string }> = {
  in_progress: {
    illustration: 'later_in_progress',
    title: 'Your place to organize messages',
    body: 'Get started by saving a message from a conversation or setting a reminder for a task. Learn more',
  },
  archived: {
    illustration: 'later_archived',
    title: 'Out of sight, but not out of mind',
    // the double space is in the source string (later_archived_empty_state_description)
    body: 'No more wasting time searching for  messages. Archive messages you come back to often.',
  },
  completed: {
    illustration: 'later_completed',
    title: 'Feels good to check things off your to-do list',
    body: 'See all the things you’ve completed in one place. Sometimes you need a reminder of how awesome you are.',
  },
}

/** SavedUpdateActionType.alertMessage (SavedConstants.swift:70-100): the toast after a move. */
const MOVED: Record<LaterTab, string> = { completed: 'Completed', archived: 'Archived', in_progress: 'Unarchived' }

export function LaterScreen({ route }: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const saved = useApp((s) => s.saved)
  const setLaterStatus = useApp((s) => s.setLaterStatus)
  const showToast = useApp((s) => s.showToast)
  const root = useRef<HTMLDivElement>(null)
  const initial = LATER_TABS.findIndex((t) => t.id === route.tab)
  const [page, setPage] = useState(initial === -1 ? 0 : initial)
  // "Upcoming reminders" (the later_show_upcoming_reminders pref, on by default): off hides items due in the future
  const [showUpcoming, setShowUpcoming] = useState(true)
  useMinuteTick()
  const tab = LATER_TABS[page].id
  const entries = useMemo(() => laterEntries(fx, saved, messages, threads), [fx, saved, messages, threads])
  const lists = useMemo(() => {
    const now = Date.now()
    const upcoming = (e: LaterEntry) => hasDueDate(e) && parseFloat(e.due!) * 1000 > now
    return Object.fromEntries(
      LATER_TABS.map((t) => [t.id, entries.filter((e) => e.status === t.id && (t.id !== 'in_progress' || showUpcoming || !upcoming(e)))]),
    ) as Record<LaterTab, LaterEntry[]>
  }, [entries, showUpcoming])
  const inProgressCount = entries.filter((e) => e.status === 'in_progress').length

  // Emptying a tab that showed items counts (didEmptyTasksListCount, TasksListInteractor.swift:150-155) and shows a
  // congratulation, the count's turn in the tab's list: In Progress 🍃, then 🐳, then 🏅, and round again
  // (TasksListPresenter.swift:141-168: inProgressCongratulatoryMessages[clearCount % 3]; June picked one at random)
  const emptied = useRef<Partial<Record<LaterTab, { count: number; wasEmpty: boolean }>>>({})
  const congrats: Partial<Record<LaterTab, number>> = {}
  for (const t of LATER_TABS) {
    const st = (emptied.current[t.id] ??= { count: 0, wasEmpty: true })
    const empty = lists[t.id].length === 0
    if (!st.wasEmpty && empty) st.count += 1
    st.wasEmpty = empty
    if (st.count > 0) congrats[t.id] = st.count % CONGRATS[t.id].length
  }

  const openFilter = () =>
    // svgRefine, "Filter": a menu titled "Show" with a checkable "Upcoming reminders" (TasksViewController.swift:77-82)
    openMenu({
      anchor: root.current?.querySelector('[aria-label="Filter"]'),
      title: 'Show',
      sections: [{ items: [{ title: 'Upcoming reminders', checked: showUpcoming, onSelect: () => setShowUpcoming((v) => !v) }] }],
    })

  const clearAll = () => {
    // clearAllCompletedItems (TasksListFeature.swift:321-331): no confirmation, then a toast
    for (const e of lists.completed) setLaterStatus(e.conversationId, e.ts, null)
    showToast('Completed items cleared', 'toast_checkmark')
  }

  let trailing: ReactNode = null
  if (tab === 'in_progress')
    trailing = (
      <GlassButton label="Filter" onClick={openFilter}>
        <Icon name="refine" size={20} />
      </GlassButton>
    )
  else if (tab === 'completed' && lists.completed.length)
    trailing = (
      // "Clear all" (clear_all): since September 2026 a plain `.title(clear_all, .default)` bar button, an SKButton
      // .systemDefault at .barButton, Lato Bold 17 in highlight1 (TasksViewController.swift:62-70; June used a medium
      // SKButton as a custom view)
      <GlassGroup className="later__clear-all">
        <SKButton title="Clear all" buttonStyle="systemDefault" size="barButton" isPadded={false} onClick={clearAll} data-qa="later_clear_all" />
      </GlassGroup>
    )

  return (
    <div className="ios-pushed-screen later" data-screen="later" ref={root}>
      <div className="later__pager">
        <SKPageController
          tabBarPosition="top"
          tabBarWidthMode="fitToBar"
          isScrollEnabled={false}
          isAnimatedPageIndexTransition
          pageIndex={page}
          onTabTapped={setPage}
          pages={LATER_TABS.map((t) => ({
            id: t.id,
            // In Progress is followed by its count, .label (TasksViewController.swift:184-189)
            tab: { title: t.title, count: t.id === 'in_progress' ? { label: String(inProgressCount) } : undefined },
            content: <LaterList tab={t.id} entries={lists[t.id]} congrats={congrats[t.id]} />,
          }))}
        />
      </div>
      <NavBar title="Later" trailing={trailing} />
    </div>
  )
}

/** Relative times and due dates move on without a data change. */
function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
}

// ------------------------------------------------------------------------------------------------------------ list

function LaterList({ tab, entries, congrats }: { tab: LaterTab; entries: LaterEntry[]; congrats?: number }) {
  return (
    <div className="ios-scroll later__list" data-qa={`later_list_${tab}`}>
      {entries.length ? (
        entries.map((e, i) => <LaterSection key={e.key} entry={e} tab={tab} last={i === entries.length - 1} />)
      ) : (
        <LaterEmpty tab={tab} congrats={congrats} />
      )}
      <div className="later__bottom-space" />
    </div>
  )
}

/** The list's empty-state row fills what's left of the list, the SKEmptyState centered in it (SKList.swift:1991-1993). */
function LaterEmpty({ tab, congrats }: { tab: LaterTab; congrats?: number }) {
  let content: SKEmptyStateContent
  let title: string
  let body: string
  if (congrats !== undefined) {
    const c = CONGRATS[tab][congrats]
    content = { emoji: c.emoji }
    title = c.title
    body = c.body
  } else {
    const e = EMPTY[tab]
    content = { illustration: e.illustration }
    title = e.title
    body = e.body
  }
  return (
    <div className="later__empty">
      <SKEmptyState content={content} title={title} body={body} backgroundColor="var(--sk_primary_background)" />
    </div>
  )
}

/** One saved item: its preview, In Progress its buttons, and a hairline footer (none after the last). */
function LaterSection({ entry: e, tab, last }: { entry: LaterEntry; tab: LaterTab; last: boolean }) {
  const fx = useApp((s) => s.fx)
  const openMessage = useApp((s) => s.openMessage)
  const setLaterStatus = useApp((s) => s.setLaterStatus)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const m = e.message

  const move = (status: LaterTab) => {
    setLaterStatus(e.conversationId, e.ts, status)
    showToast(MOVED[status], 'toast_checkmark')
  }
  const remove = () => {
    setLaterStatus(e.conversationId, e.ts, null)
    showToast('Removed from Later', 'toast_checkmark')
  }
  const reminder = () => presentSheet('later-reminder', { conversationId: e.conversationId, ts: e.ts, due: hasDueDate(e) ? e.due : undefined, overdue: isOverdue(e) })

  if (!m) {
    // A deleted message: SKGenericEntity .medium, svgTrash and the text in content_secondary; tapping asks to remove it
    // (TasksListPresenter.swift:251-308; TasksListInteractor.swift:294-360)
    const onClick = () =>
      showAlert({
        title: 'Remove Saved Item',
        message: 'A message you saved was deleted. Remove it from Later?',
        actions: [{ title: 'Cancel', style: 'cancel' }, { title: 'Remove', style: 'destructive', onPress: remove }],
      })
    return (
      <section className="later__section">
        <div className="later__deleted" role="button" onClick={onClick} data-tap>
          <SKOrnamentBox ornament={{ icon: 'trash', color: 'var(--dt_color_content_secondary)' }} size="large" />
          <span className="later__deleted-text mk-label">A message you saved was deleted.</span>
        </div>
        {!last && <SKListFooter />}
      </section>
    )
  }

  const author = fx.users[m.userId]
  const conv = fx.conversations[e.conversationId]
  const content = mkPreviewContent(m)

  // TasksMenuPresenter.swift:11-98, icons and titles TasksListDataTypes.swift:145-175 (glyph icons: nearest SVGs)
  const menu = (): MenuAction[] => {
    const removeItem: MenuAction = { title: 'Remove from Later', icon: 'trash', destructive: true, onSelect: remove }
    if (tab === 'in_progress')
      return [
        { title: 'Complete', icon: 'check', onSelect: () => move('completed') },
        { title: 'Archive', icon: 'archive', onSelect: () => move('archived') },
        hasDueDate(e) ? { title: isOverdue(e) ? 'Snooze' : 'Edit reminder', icon: 'clock', onSelect: reminder } : { title: 'Set reminder', icon: 'clock', onSelect: reminder },
        removeItem,
      ]
    if (tab === 'archived') return [{ title: 'Move to In Progress', icon: 'bookmark', onSelect: () => move('in_progress') }, removeItem]
    return [{ title: 'Mark as incomplete', icon: 'checkbox', onSelect: () => move('in_progress') }, removeItem]
  }

  return (
    <section className="later__section" data-later={e.key}>
      <MKMessagePreview
        // headerStyling .author: the author's avatar, no presence (MessageViewPresentationObjectFactory.swift:159-171)
        ornament={<SKMemberAvatar src={author?.avatar} name={author?.realName ?? ''} size="large" />}
        header={<LaterHeader fx={fx} conv={conv} entry={e} />}
        headerFont="var(--sk-micro)"
        headerColor="var(--dt_color_content_tertiary)"
        // makeAuthorName: bodyBlack content_primary, no status emoji (SavedItemMessagePreview.swift:398-432)
        primaryText={displayName(author)}
        primaryFont="var(--sk-body-black)"
        primaryColor="var(--dt_color_content_primary)"
        timestamp={mkTimestamp(m.ts, 'relative')}
        body={content.body}
        files={content.files}
        unfurls={content.unfurls}
        // messages open the thread (replies) or the conversation at the message (TasksListInteractor.swift:288-303)
        onClick={() => openMessage(e.conversationId, e.ts, { threadTs: e.threadTs })}
        onLongPress={(el) => openMenu({ anchor: el, sections: [{ items: menu() }] })}
        data-qa={`later_row_${e.ts}`}
      />
      {tab === 'in_progress' && (
        // SKButtonEntity .wrapContent(indentedForMessageAlignment: true): "Complete" (complete_title) in
        // .custom(sk_lilypad_green, white, clear), then an outline icon-only svgReminder, "Edit reminder" (:199-225)
        <div className="later__buttons">
          <SKButton
            title="Complete"
            buttonStyle="custom"
            customColors={{ backgroundColor: 'var(--sk_lilypad_green)', titleColor: 'var(--dt_color_constants_white)', borderColor: 'transparent' }}
            onClick={() => move('completed')}
          />
          <SKButton title="" icon="reminder" buttonStyle="outlineDefault" accessibilityLabel="Edit reminder" onClick={reminder} />
        </div>
      )}
      {!last && <SKListFooter />}
    </section>
  )
}

/**
 * SavedItemMessagePreview.makeHeaderText (:313-396): where it's from in micro 12 bold content_tertiary ("#launch", the
 * lock + name for private channels, "Direct Message", the group DM's names), two spaces, then with a reminder "●  " and
 * toTimeAgo ("In 2 hours"), sk_raspberry_red when overdue.
 */
function LaterHeader({ fx, conv, entry }: { fx: Fixture; conv?: Conversation; entry: LaterEntry }) {
  let where: ReactNode = null
  if (conv) {
    if (conv.type === 'im' || conv.type === 'app') where = 'Direct Message'
    else if (conv.type === 'mpim') where = conversationTitle(fx, conv)
    else if (conv.type === 'private')
      where = (
        <>
          {/* the channel span's lock (modifierForChannel, Text+Display.swift:1806-1846), in the text's color */}
          <Icon name="lock_filled" className="later-header__icon" />
          {conv.name}
        </>
      )
    else where = `#${conv.name}`
  }
  const due = hasDueDate(entry) ? parseFloat(entry.due!) : undefined
  return (
    <span className="later-header">
      {where !== null && (
        <>
          <b className="later-header__detail">{where}</b>
          {'  '}
        </>
      )}
      {due !== undefined && (
        <>
          <b className="later-header__detail">{'●  '}</b>
          <b className={`later-header__detail${isOverdue(entry) ? ' is-overdue' : ''}`}>{toTimeAgo(due)}</b>
        </>
      )}
    </span>
  )
}
