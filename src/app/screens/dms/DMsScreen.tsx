import { useEffect, useMemo, useState } from 'react'
import { useApp, useMe } from '../../store'
import { screenDef, sheetDef } from '../../nav/registry'
import { GlassButton, NAVBAR_BOTTOM, RootNavBar, rootTitleOpacity, useNavbarBottom } from '../../nav/NavBar'
import { SKTabBar } from '../../../slackkit/SKTabBar'
import { memberPresence } from '../../../slackkit/SKMemberAvatar'
import { useTheme } from '../../../theme/ThemeStyle'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKBadge } from '../../../slackkit/SKBadge'
import { SKEmptyState, type SKEmptyStateContent } from '../../../slackkit/SKEmptyState'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { SKOrnamentBox } from '../../../slackkit/SKOrnamentBox'
import { MKGroupAvatar, MKMessagePreview, mkPreviewContent, mkTimestamp } from '../../../messagekit/MKMessagePreview'
import type { User } from '../../../data/types'
import { buildDMRows, DM_FILTER_PILLS, frecentPeople, type DMFilter, type DMRow } from './rows'
import { SwipeRow } from '../drafts/SwipeRow'
import { markAsRead, toggleMute } from '../../sheets/conversation-menu/actions'
import './dms.css'
import { openMenu } from '../../sheets/ui/Menu'

// The DMs tab on iOS 26 (spec dms-activity.md §2; shell-navigation.md §2.1–2.2): the tab root's clear bar ("DMs" in
// Lato Black 22, your avatar in Liquid Glass) over the theme's header gradient, then one list (DMPresentationObjectFactory
// .swift:176-222): the people carousel, the filter pills (All / Unreads / External), a row per DM (MKMessagePreview;
// swipe right toggles read, swipe left mute), "Add Teammates", or the empty state; and the compose button above
// Search. That's production (reference/device/IMG_2249) and, since June's ios_ia_next_dms_filters and ios_swipe_actions
// went away, the only layout in 14b3cbaf: the header's filter menu and the filter banner are gone
// (DMNavigationBarControlsManager.swift was deleted) and rows always swipe. No VIP sections.


export function DMsScreen() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const me = useMe()
  const theme = useTheme((s) => s.input)
  const [filter, setFilter] = useState<DMFilter>('all')
  const [scrollY, setScrollY] = useState(0)
  useMinuteTick()
  const all = useMemo(() => buildDMRows(fx, messages, 'all'), [fx, messages])
  const rows = useMemo(() => (filter === 'all' ? all : buildDMRows(fx, messages, filter)), [all, fx, messages, filter])
  const people = useMemo(() => frecentPeople(fx, messages, all), [fx, messages, all])
  const onDark = theme.brightness >= 4
  // Add Teammates → the invite flow; Browse Teammates → the people browser (DMInteractor.swift:520-543), when this
  // build has them (another area registers them); otherwise the tap does nothing.
  const invite = () => sheetDef('invite') && presentSheet('invite')
  const browse = () => (screenDef('directories') ? push({ screen: 'directories' }) : screenDef('people') && push({ screen: 'people' }))

  // Title fades over the first 10 % of the top inset; the gradient fades once the list has scrolled 32 pt (spec §2.2).
  const navbarBottom = useNavbarBottom()
  const topInset = NAVBAR_BOTTOM
  const titleOpacity = rootTitleOpacity(scrollY, navbarBottom)
  const gradientVisible = scrollY <= 32

  // Sections (DMPresentationObjectFactory.swift:176-222), the first with SKList's 8 pt default header
  // (SKList.swift:2015-2016): the carousel whenever there are frecent people (even with no DMs), the pills always.
  const hasDMs = rows.length > 0
  const showFaces = people.length > 0
  const showAddTeammates = hasDMs && filter === 'all'

  return (
    <div className="ios-root-screen dms" data-screen="dms">
      <div className="ios-scroll dms__list" style={{ paddingTop: topInset }} onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)} data-qa="dms_list">
        <div className={`root-header-gradient${gradientVisible ? '' : ' is-faded'}`} />
        <div className="dms__first-header" />
        {showFaces && (
          <section className="dms-section" data-section="faces">
            <PeopleCarousel people={people} />
            <div className="dms-blank-footer" />
          </section>
        )}
        {/* the filterTabBar section: no header, the 54 pt pill row, an 8 pt blank footer (DPOF:147-148, :164-173) */}
        <section className="dms-section dms__pills" data-section="filterTabBar">
          <FilterPills filter={filter} onSelect={setFilter} />
          <div className="dms-blank-footer" />
        </section>
        {hasDMs && (
          <section className="dms-section" data-section="messages">
            {rows.map((r) => (
              <DMPreviewRow key={r.id} row={r} />
            ))}
            {/* .hairlineDivider(hidesWhenLastRow: true) (:193-196) */}
            {showAddTeammates && <SKListFooter />}
          </section>
        )}
        {showAddTeammates && (
          <section className="dms-section" data-section="add_teammates">
            <AddTeammatesRow onClick={invite} />
            <div className="dms-blank-footer" />
          </section>
        )}
        {!hasDMs && <DMsEmptyState filter={filter} workspace={fx.workspace.name} onShowAll={() => setFilter('all')} onCompose={() => push({ screen: 'compose' })} onBrowse={browse} />}
        <div className="dms__bottom-space" />
      </div>
      <RootNavBar
        onDark={onDark}
        scrolled={!gradientVisible}
        titleOpacity={titleOpacity}
        title="DMs"
        trailing={
          // rightButtons = [user] (DMInteractor.swift:603-615): the avatar in its own glass circle
          <GlassButton label="Profile menu" dark={onDark && gradientVisible} onClick={() => useApp.getState().presentSheet('you')} className={me.statusEmoji ? 'is-status' : undefined}>
            {me.statusEmoji && <Emoji name={me.statusEmoji} size={22} className="dms__status-emoji" />}
            <SKMemberAvatar src={me.avatar} name={me.realName} size="smallPlus" round presence={me.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActiveInverted)" />
          </GlassButton>
        }
      />
      {/* CreationEntryPointsFABHelper (spec §2.11): DM-specific create options */}
      <button type="button" className="compose-fab" aria-label="Create New" onClick={() => presentSheet('create', { source: 'dms' })} data-tap>
        <Icon name="plus" size={20} />
      </button>
    </div>
  )
}

/** Relative timestamps ("now", "5m ago") move on without a data change: re-render once a minute. */
function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
}

// ------------------------------------------------------------------------------------------------------------ rows

/**
 * One DM (DMPresentationObjectFactory.swift:444-553; spec §2.5): the other person's photo with presence in the list
 * theme's colors (a group avatar for group DMs), the name (+ status emoji) in bodyBlack when unread, bodyBold when read,
 * contentPrimary, the relative time and the unread count at the right, and the latest message ("You: " when it's yours)
 * in smallBody contentSecondary, 2 lines; muted DMs get notifications_off_filled in contentTertiary after it
 * (DMPresentationObjectFactory.swift:424-427, DMInteractor.swift:1309).
 *
 * Swipes, always on in 14b3cbaf (DMInteractor.swift:1223-1271; the user's defaults, SwipeActionsManager.swift:18-35): right
 * uncovers "Mark as Read" / "Mark Unread" (mark_as_read(_filled) / mark_as_unread(_filled)) on highlight1.baseInverse,
 * left "Mute" / "Unmute" (notifications_off(_filled) / notifications(_filled)) on honeycomb_50, both
 * contentInversePrimary; they run the context menu's handlers (:899-914) and bounce back.
 */
function DMPreviewRow({ row }: { row: DMRow }) {
  const fx = useApp((s) => s.fx)
  const open = useApp((s) => s.openConversation)
  const markUnread = useApp((s) => s.markUnread)
  const presentSheet = useApp((s) => s.presentSheet)
  const unread = (fx.unreads[row.id]?.count ?? 0) > 0 && !row.conv.muted
  const hasUnreads = (fx.unreads[row.id]?.count ?? 0) > 0
  const latest = row.latest
  const mine = latest?.userId === fx.me
  const content = latest ? mkPreviewContent(latest) : {}
  const body = content.body !== undefined ? (mine ? `You: ${content.body}` : content.body) : mine && (content.files || content.unfurls) ? 'You:' : undefined
  const status = row.conv.type === 'im' ? row.user?.statusEmoji : undefined
  const muted = !!row.conv.muted
  const readAction = hasUnreads
    ? { label: 'Mark as Read', icon: 'mark_as_read', activeIcon: 'mark_as_read_filled', onAction: () => markAsRead(fx, row.conv) }
    : { label: 'Mark Unread', icon: 'mark_as_unread', activeIcon: 'mark_as_unread_filled', onAction: () => latest && markUnread(row.id, latest.ts) }
  const muteAction = muted
    ? { label: 'Unmute', icon: 'notifications', activeIcon: 'notifications_filled', onAction: () => toggleMute(fx, row.conv) }
    : { label: 'Mute', icon: 'notifications_off', activeIcon: 'notifications_off_filled', onAction: () => toggleMute(fx, row.conv) }
  // Long press: a menu titled with the conversation (DMInteractor.swift:1318-1360): Mark as Read / Mark Unread, VIP (with
  // priority access), Mute / Unmute Conversation (never for Slackbot) | View Profile (1:1 DMs), Copy DM Email
  // (ConversationActionBuilder.swift:54-67, 111-125, 191-217; strings mark_channel_as_read_context_menu, mark_unread,
  // mute_/unmute_conversation_context_menu, huddle_go_to_profile, copy_dm_email_context_menu)
  const isSlackbot = row.user?.id === 'USLACKBOT' || row.user?.name === 'Slackbot'
  const openDMRowMenu = (el: HTMLElement) =>
    openMenu({
      anchor: el,
      title: row.name,
      sections: [
        {
          items: [
            hasUnreads
              ? { title: 'Mark as Read', icon: 'mark_as_read', onSelect: () => markAsRead(fx, row.conv) }
              : { title: 'Mark Unread', icon: 'mark_as_unread', onSelect: () => latest && markUnread(row.id, latest.ts) },
            ...(isSlackbot ? [] : [{ title: muted ? 'Unmute Conversation' : 'Mute Conversation', icon: muted ? 'notifications' : 'notifications_off', onSelect: () => toggleMute(fx, row.conv) }]),
          ],
        },
        {
          items: [
            ...(row.conv.type === 'im' && row.user ? [{ title: 'View Profile', icon: 'user', onSelect: () => useApp.getState().openProfile(row.user!.id) }] : []),
            { title: 'Copy DM Email', icon: 'email', onSelect: () => useApp.getState().showToast('Copied DM email address') },
          ],
        },
      ],
    })
  return (
    <SwipeRow
      left={{ ...readAction, background: 'var(--dt_color_base_inverse_highlight_1)', foreground: 'var(--dt_color_content_inverse_primary)' }}
      right={{ ...muteAction, background: 'var(--dt_color_palettes_honeycomb_50)', foreground: 'var(--dt_color_content_inverse_primary)' }}
    >
      <MKMessagePreview
        ornament={<DMOrnament row={row} />}
        primaryText={
          <>
            {row.name}
            {status && (
              <>
                {' '}
                <Emoji name={status} className="rt-emoji" />
              </>
            )}
          </>
        }
        primaryFont={unread ? 'var(--sk-body-black)' : 'var(--sk-body-bold)'}
        // contentPrimary (AuthorMapper.swift:53-55 [Sept]; June sk_primary_foreground)
        primaryColor="var(--dt_color_content_primary)"
        timestamp={latest ? mkTimestamp(latest.ts, 'relative') : undefined}
        accessory={row.unread > 0 ? { badge: <DMBadge count={row.unread} /> } : undefined}
        body={body}
        bodyFont="var(--sk-small-body)"
        // listThemeOptions.itemSecondaryForegroundColor = contentSecondary (DMPresentationObjectFactory.swift:441,
        // ListThemeOptions.swift:77 [Sept]; June sk_foreground_max_solid)
        bodyColor="var(--dt_color_content_secondary)"
        bodyAccessory={muted ? <Icon name="notifications_off_filled" size={20} color="var(--dt_color_content_tertiary)" /> : undefined}
        files={content.files}
        unfurls={content.unfurls}
        onClick={() => open(row.id, { tab: 'dms' })}
        onLongPress={(el) => openDMRowMenu(el)}
        data-qa={`dm_row_${row.id}`}
      />
    </SwipeRow>
  )
}

/** ListThemeOptions.ia4Phone badgeStyle: .text(theme.contentInverseImportant on theme.baseInverseImportant) (spec §2.5). */
const DMBadge = ({ count }: { count: number }) => (
  <SKBadge count={count} badgeStyle="text" backgroundColor="var(--theme_baseInverseImportant)" textColor="var(--theme_contentInverseImportant)" />
)

const presenceOf = (u?: User) => (!u ? 'none' : u.presence === 'away' ? 'away' : 'active')

/** AvatarMapper.swift:68-103: the partner (or you) with presence; a group avatar of the first two other members. */
function DMOrnament({ row }: { row: DMRow }) {
  if (row.conv.type === 'mpim') {
    const faces = row.members.slice(0, 2).map((u) => ({ src: u.avatar, name: u.realName }))
    return <MKGroupAvatar faces={faces} />
  }
  const u = row.user
  return (
    <SKMemberAvatar
      src={u?.avatar}
      name={u?.realName ?? row.name}
      size="large"
      presence={presenceOf(u)}
      activeColor="var(--theme_presenceActive)"
      awayColor="var(--dt_color_content_tertiary)"
    />
  )
}

// ---------------------------------------------------------------------------------------------------- the pills

/**
 * The filter pills (DMPresentationObjectFactory.swift:913-944, DMFilterBarCustomRow.swift:38-39): an edge-to-edge 54 pt
 * row of SKTabBar .pillButton(theme.baseInverseSecondary, contentSecondary, theme.contentInversePrimary,
 * outlineTertiary), .fitAllContent, insets 12 at the sides, no automatic tab change.
 * Measured on a device (IMG_2249, 440 pt): All x 16–123, Unreads 131–273.7, External 281.3–424, 36 tall.
 */
function FilterPills({ filter, onSelect }: { filter: DMFilter; onSelect: (f: DMFilter) => void }) {
  return (
    <SKTabBar
      tabs={DM_FILTER_PILLS.map((p) => ({ title: p.title, ornament: { icon: p.icon }, ornamentPosition: 'leading' as const }))}
      selectionProgress={DM_FILTER_PILLS.findIndex((p) => p.id === filter)}
      tabDisplayStyle="pillButton"
      selectedBackgroundColor="var(--theme_baseInverseSecondary)"
      textColor="var(--dt_color_content_secondary)"
      selectedTextColor="var(--theme_contentInversePrimary)"
      borderColor="var(--dt_color_outline_tertiary)"
      widthMode="fitAllContent"
      shouldAutomaticallyPerformTabChange={false}
      backgroundColor="var(--dt_color_base_primary)"
      contentInset={{ left: 12, right: 12 }}
      onTabTapped={(i) => onSelect(DM_FILTER_PILLS[i].id)}
    />
  )
}

// ------------------------------------------------------------------------------------------------------ the carousel

/**
 * SKMemberCollectionEntity (DMPresentationObjectFactory.swift:558-596; spec §2.3): a sideways scroller, insets 8 / 16 /
 * 0 / 16 on iOS 26, 16 pt apart; each item 4 pt down, a 56 pt avatar with presence, 8 pt, the name in smallBody 15,
 * centered, 2 lines, as wide as the avatar. Pressed items dim to 0.4. Tapping opens the DM.
 */
function PeopleCarousel({ people }: { people: User[] }) {
  const open = useApp((s) => s.openConversation)
  const openDm = useApp((s) => s.openDm)
  const push = useApp((s) => s.push)
  return (
    <div className="dms-faces" data-scroll-x data-qa="dms_faces">
      {people.map((u) => (
        <button
          key={u.id}
          type="button"
          className="dms-face"
          aria-label={`${u.name}, ${u.presence === 'away' ? 'Away' : 'Active'}`}
          onClick={() => (u.id === 'USLACKBOT' ? push({ screen: 'slackbot' }) : open(openDm([u.id]), { tab: 'dms' }))}
          data-tap
        >
          <SKMemberAvatar
            src={u.avatar}
            name={u.realName}
            size="extraLarge"
            presence={u.id === 'USLACKBOT' ? memberPresence({ isActive: true, isSlackbot: true }) : presenceOf(u)}
            activeColor="var(--theme_presenceActive)"
            awayColor="var(--dt_color_content_tertiary)"
          />
          <span className="dms-face__name">{u.name}</span>
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------------ add row

/**
 * "Add Teammates" (DMPresentationObjectFactory.swift:403-438): SKGenericEntity .medium, a 36 pt ornament box with
 * svgUserAdd in theme.contentInversePrimary on theme.baseInversePrimary, "Add Teammates" body 17 and "By SMS, email, or
 * phone contacts" caption 13 content_secondary.
 */
function AddTeammatesRow({ onClick }: { onClick: () => void }) {
  return (
    <div className="dms-generic-row" role="button" onClick={onClick} data-tap data-qa="dms_add_teammates">
      <div className="dms-generic-row__bg" />
      <SKOrnamentBox ornament={{ icon: 'user_add', color: 'var(--theme_contentInversePrimary)' }} size="large" backgroundColor="var(--theme_baseInversePrimary)" />
      <div className="dms-generic-row__text">
        <span className="dms-generic-row__primary">Add Teammates</span>
        <span className="dms-generic-row__secondary">By SMS, email, or phone contacts</span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------------ empty state

/** Unreads with nothing unread: one of five, picked at random (DMInteractor.swift:1428-1444). */
const CONGRATS = [
  { emoji: 'raised_hands', title: 'You’re all caught up', body: 'Nice work!' },
  { emoji: 'tada', title: 'Ta-da!', body: 'You’re up to date.' },
  { emoji: 'sun_with_face', title: 'Nothing new', body: 'Carry on.' },
  { emoji: 'horse', title: "You've read all the unreads", body: "Here's a pony." },
  { emoji: 'otter', title: 'No unread DMs', body: "Isn't that nice?" },
]

/**
 * SKPaddedEmptyStateDeprecated (30 pt top padding) around SKEmptyState (DMPresentationObjectFactory.swift:762-975; spec
 * §2.9), for an active user with DMs before: All → "Slack is better when ⏎ everyone’s here" / "Browse Teammates";
 * Unreads → a congratulatory emoji state with "Show all DMs"; External → the Slack Connect copy.
 */
function DMsEmptyState({ filter, workspace, onShowAll, onCompose, onBrowse }: { filter: DMFilter; workspace: string; onShowAll: () => void; onCompose: () => void; onBrowse: () => void }) {
  const [pick] = useState(() => CONGRATS[Math.floor(Math.random() * CONGRATS.length)])
  const image: SKEmptyStateContent = { illustration: 'dms' }
  let props: { content: SKEmptyStateContent; title: string; body: string; button: string; onClick: () => void }
  if (filter === 'unreads') props = { content: { emoji: pick.emoji }, title: pick.title, body: pick.body, button: 'Show all DMs', onClick: onShowAll }
  else if (filter === 'external')
    props = {
      content: image,
      title: `No conversations with people outside ${workspace}... yet.`,
      body: 'Use Slack Connect to collaborate securely with external clients, vendors, and partners.',
      button: 'Start a Conversation',
      onClick: onCompose,
    }
  else props = { content: image, title: 'Slack is better when \neveryone’s here', body: `Browse everyone in ${workspace} and strike up a conversation.`, button: 'Browse Teammates', onClick: onBrowse }
  return (
    <div className="dms-empty">
      <SKEmptyState content={props.content} title={props.title} body={props.body} buttons={[{ title: props.button, buttonStyle: 'primary', onClick: props.onClick }]} />
    </div>
  )
}
