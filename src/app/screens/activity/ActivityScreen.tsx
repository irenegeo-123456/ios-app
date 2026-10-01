import { useEffect, useMemo, useState } from 'react'
import { useApp, useMe } from '../../store'
import { GlassButton, NAVBAR_BOTTOM, RootNavBar, rootTitleOpacity, useNavbarBottom } from '../../nav/NavBar'
import { screenDef, sheetDef } from '../../nav/registry'
import { useTheme } from '../../../theme/ThemeStyle'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKTabBar } from '../../../slackkit/SKTabBar'
import { SKPillButton } from '../../../slackkit/SKPillButton'
import { SKEmptyState, type SKEmptyStateContent } from '../../../slackkit/SKEmptyState'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { MKMessagePreview } from '../../../messagekit/MKMessagePreview'
import { openMenu } from '../../sheets'
import { SwipeRow } from '../drafts/SwipeRow'
import { ACTIVITY_VIEWS, activityRow, filterActivity, type ActivityFilter } from './rows'
import './activity.css'

// The Activity tab on iOS 26 (spec dms-activity.md §3; shell-navigation.md §2.1–2.2): the tab root's clear bar
// ("Activity", your avatar) over the theme's header gradient, then one list (ActivityPresenter.swift:52-113, :348-515):
// the filter pills, the feed (MKMessagePreview rows with 1 px separators) or the empty state for the filter, and the
// floating "Unreads" pill above the tab bar. Production (reference/device/IMG_2250) and 14b3cbaf's only path (June's
// ios_activity_views and ios_activity_row_redesign are gone): the views layout (text-only All / DMs / Mentions /
// Threads) and the redesigned rows (the type badge in the avatar's corner, the context line under the name, a hairline
// under the pills).


/** Unreads with nothing unread: re-picked on each row tap or Unreads toggle (ActivityDataTypes.swift:198-216). */
const CONGRATS = [
  { emoji: 'raised_hands', title: 'You’re all caught up', body: 'Nice work!' },
  { emoji: 'sun_with_face', title: 'Nothing new', body: 'Carry on.' },
  { emoji: 'tada', title: 'Ta-da!', body: 'You’re up to date' },
  { emoji: 'horse', title: "You've read all the unreads", body: "Here's a pony." },
  { emoji: 'otter', title: 'No unread activity', body: "Isn't that nice?" },
]
const pickCongrats = () => Math.floor(Math.random() * CONGRATS.length)

export function ActivityScreen() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const openMessage = useApp((s) => s.openMessage)
  const markActivityRead = useApp((s) => s.markActivityRead)
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const me = useMe()
  const theme = useTheme((s) => s.input)
  const tabs = ACTIVITY_VIEWS
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [unreadsOnly, setUnreadsOnly] = useState(false)
  const [congrats, setCongrats] = useState(pickCongrats)
  const [scrollY, setScrollY] = useState(0)
  // items you cleared (Clear in the menu or a left swipe): they leave the feed (the inbox's archive)
  const [cleared, setCleared] = useState<Set<string>>(() => new Set())
  const showToast = useApp((s) => s.showToast)
  useMinuteTick()
  const feed = fx.activity ?? []
  const items = useMemo(() => filterActivity(feed, filter, unreadsOnly).filter((a) => !cleared.has(a.id)), [feed, filter, unreadsOnly, cleared])
  const rows = useMemo(() => items.map((a) => activityRow(fx, messages, threads, a)), [items, fx, messages, threads])
  const onDark = theme.brightness >= 4
  // New users who never had activity see no filter bar and no Unreads pill (APres:290, :354-356).
  const hasEverHadActivity = feed.length > 0

  const navbarBottom = useNavbarBottom()
  const topInset = NAVBAR_BOTTOM
  const titleOpacity = rootTitleOpacity(scrollY, navbarBottom)
  const gradientVisible = scrollY <= 32

  // The row's actions, as its menu and swipes offer them (ActivityPresentationObject.standardMenuItems,
  // ActivityPresentationObject.swift:870-924; swipes ActivityInteractor.swift:1374-1423, the user's defaults
  // SwipeActionsManager.swift:37-54, always on in 14b3cbaf): Mark as Read / Mark Unread (not for reactions when swiping),
  // Clear; each confirmed by a dark banner ("Marked as read", "Marked as unread", "Activity item cleared" with Undo,
  // ActivityFeature.swift:826-890; here a toast, without Undo).
  const setRead = (id: string, read: boolean) => {
    markActivityRead(id, read)
    setCongrats(pickCongrats())
    showToast(read ? 'Marked as read' : 'Marked as unread')
  }
  const clear = (id: string) => {
    setCleared((c) => new Set(c).add(id))
    showToast('Activity item cleared', 'eraser')
  }
  const rowMenu = (el: HTMLElement, id: string, unread: boolean) =>
    openMenu({
      anchor: el,
      sections: [
        {
          items: [
            unread ? { title: 'Mark as Read', icon: 'mark_as_read', onSelect: () => setRead(id, true) } : { title: 'Mark Unread', icon: 'mark_as_unread', onSelect: () => setRead(id, false) },
            { title: 'Clear', icon: 'eraser', onSelect: () => clear(id) },
          ],
        },
      ],
    })

  const toggleUnreads = () => {
    setUnreadsOnly((u) => !u)
    setCongrats(pickCongrats())
  }

  return (
    <div className="ios-root-screen activity" data-screen="activity">
      <div className="ios-scroll activity__list" style={{ paddingTop: topInset }} onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)} data-qa="activity_list">
        <div className={`root-header-gradient${gradientVisible ? '' : ' is-faded'}`} />
        {hasEverHadActivity && (
          // the tabBar section: SKList's 8 pt default header, the 54 pt pill row, an 8 pt footer with a 1 px
          // outline_tertiary hairline (APres:414-418)
          <section className="activity__tabs has-footer" data-section="tabBar">
            <SKTabBar
              tabs={tabs.map((t) => ({ title: t.title }))}
              selectionProgress={tabs.findIndex((t) => t.id === filter)}
              tabDisplayStyle="pillButton"
              selectedBackgroundColor="var(--theme_baseInverseSecondary)"
              textColor="var(--dt_color_content_secondary)"
              selectedTextColor="var(--theme_contentInversePrimary)"
              borderColor="var(--dt_color_outline_tertiary)"
              widthMode="fitAllContent"
              shouldAutomaticallyPerformTabChange={false}
              backgroundColor="var(--sk_primary_background)"
              contentInset={{ left: 12, right: 12 }}
              onTabTapped={(i) => {
                // picking a tab keeps the Unreads toggle as it was (ActivityInteractor.swift:1509-1521)
                setFilter(tabs[i].id)
                setCongrats(pickCongrats())
              }}
            />
            <SKListFooter />
          </section>
        )}
        {rows.length > 0 ? (
          <section className="activity__rows" data-section="messages">
            {rows.map((r) => {
              const unread = !!r.item.unread
              const swipeColors = { background: 'var(--dt_color_base_inverse_highlight_1)', foreground: 'var(--dt_color_content_inverse_primary)' }
              return (
                <div key={r.item.id} className="activity__row">
                  <SwipeRow
                    left={
                      r.item.type === 'reaction'
                        ? undefined
                        : unread
                          ? { label: 'Mark as Read', icon: 'mark_as_read', activeIcon: 'mark_as_read_filled', ...swipeColors, onAction: () => setRead(r.item.id, true) }
                          : { label: 'Mark Unread', icon: 'mark_as_unread', activeIcon: 'mark_as_unread_filled', ...swipeColors, onAction: () => setRead(r.item.id, false) }
                    }
                    right={{ label: 'Clear', icon: 'eraser', iconRight: true, slideAway: true, ...swipeColors, onAction: () => clear(r.item.id) }}
                  >
                    <MKMessagePreview
                      {...r.props}
                      onClick={() => {
                        // Tapping marks the row read, then opens the thread or the conversation at the message (AInt:1239-1422)
                        markActivityRead(r.item.id)
                        setCongrats(pickCongrats())
                        openMessage(r.target.conversationId, r.target.ts, { tab: 'activity', threadTs: r.target.threadTs })
                      }}
                      onLongPress={(el) => rowMenu(el, r.item.id, unread)}
                      onReactionLongPress={sheetDef('reactors') ? () => presentSheet('reactors', { conversationId: r.item.conversationId, ts: r.item.ts, viewOnly: true }) : undefined}
                      data-qa={`activity_row_${r.item.id}`}
                    />
                  </SwipeRow>
                  {/* a 1 px outline_tertiary separator under every row (SKListRowSeparatorDecorationView.swift:13, :33) */}
                  <div className="activity__separator" />
                </div>
              )
            })}
          </section>
        ) : (
          <ActivityEmptyState filter={filter} unreadsOnly={unreadsOnly} hasEverHadActivity={hasEverHadActivity} congrats={congrats} onBrowse={() => screenDef('browse-channels') && push({ screen: 'browse-channels' })} />
        )}
        <div className="activity__bottom-space" />
      </div>
      <RootNavBar
        onDark={onDark}
        scrolled={!gradientVisible}
        titleOpacity={titleOpacity}
        title="Activity"
        trailing={
          <GlassButton label="Profile menu" dark={onDark && gradientVisible} onClick={() => useApp.getState().presentSheet('you')} className={me.statusEmoji ? 'is-status' : undefined}>
            {me.statusEmoji && <Emoji name={me.statusEmoji} size={22} className="activity__status-emoji" />}
            <SKMemberAvatar src={me.avatar} name={me.realName} size="smallPlus" round presence={me.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActiveInverted)" />
          </GlassButton>
        }
      />
      {hasEverHadActivity && <UnreadsPill selected={unreadsOnly} onClick={toggleUnreads} />}
    </div>
  )
}

/** Relative timestamps ("now", "5m ago") move on without a data change. */
function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
}

/**
 * The floating "Unreads" pill (ActivityViewController.swift:52-74, :107; spec §3.4): a glass SKPillButton, smallBodyBold
 * 15, 14 / 20 padding, a capsule; content_primary on base_tertiary (dark: gray_10 on gray_90), selected
 * theme.contentInverseImportant on theme.baseInverseImportant with a trailing ✕, drawn at 0.9. It sits 16 pt above the
 * tab bar, its trailing edge on the tab bar's (FabHorizontalConstraintManager).
 */
function UnreadsPill({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  const fg = selected ? 'var(--theme_contentInverseImportant)' : 'var(--activity-pill-fg)'
  const bg = selected ? 'var(--theme_baseInverseImportant)' : 'var(--activity-pill-bg)'
  return (
    <SKPillButton
      className={`activity__unreads${selected ? ' is-on' : ''}`}
      text="Unreads"
      textFont="var(--sk-small-body-bold)"
      textColor={fg}
      icon={selected ? 'close' : undefined}
      iconColor={fg}
      iconPosition="right"
      size={{ top: 14, left: 20, bottom: 14, right: 20 }}
      unselectedColor={bg}
      selectedColor={bg}
      shouldAnimateTransition
      accessibilityLabel="Only Unreads"
      onClick={onClick}
    />
  )
}

/**
 * EmptyStateFactory.swift for an active user (spec §3.9): with Unreads on, a rotating congratulation (a per-filter title
 * for Mentions, Threads, Apps, Invitations and Reactions, :165-197); with it off, on every view, ✅ "Nothing to see here"
 * (`easter_egg_message_thirteen`) / "Looks like you’re all caught up. Enjoy this moment of peace." and no button
 * (:24-52, AllCaughtUpEmptyStatePresentationObject.swift:15-20; June showed the large-team joiner's "Nothing to see
 * here...yet." with Browse Channels). New users who never had activity get "No unread activity...yet." with Browse
 * Channels while Unreads is on.
 */
function ActivityEmptyState({
  filter,
  unreadsOnly,
  hasEverHadActivity,
  congrats,
  onBrowse,
}: {
  filter: ActivityFilter
  unreadsOnly: boolean
  hasEverHadActivity: boolean
  congrats: number
  onBrowse: () => void
}) {
  let content: SKEmptyStateContent = { illustration: 'activity' }
  let title: string
  let body: string
  let button: string | undefined = 'Browse Channels'
  if (unreadsOnly && hasEverHadActivity) {
    const c = CONGRATS[congrats]
    const perFilter: Partial<Record<ActivityFilter, string>> = {
      mentions: 'No unread mentions',
      threads: 'No unread replies',
      apps: 'No unread apps',
      invitations: 'No unread invitations',
      reactions: 'No unread reactions',
    }
    content = { emoji: c.emoji }
    title = perFilter[filter] ?? c.title
    body = c.body
    button = undefined
  } else if (unreadsOnly) {
    title = 'No unread activity...yet.'
    body = 'You’ll start to see activity if you join some conversations.'
  } else {
    content = { emoji: 'white_check_mark' }
    title = 'Nothing to see here'
    body = 'Looks like you’re all caught up. Enjoy this moment of peace.'
    button = undefined
  }
  return (
    <div className="activity-empty">
      <SKEmptyState content={content} title={title} body={body} buttons={button ? [{ title: button, buttonStyle: 'primary', onClick: onBrowse }] : undefined} />
    </div>
  )
}
