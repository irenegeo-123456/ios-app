import { useMemo, useState, type ReactNode } from 'react'
import { useApp, useMe } from '../../store'
import { GlassButton, GlassGroup, GlassGroupItem, NAVBAR_BOTTOM, RootNavBar, rootTitleOpacity, useNavbarBottom } from '../../nav/NavBar'
import { useTheme } from '../../../theme/ThemeStyle'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKWorkspaceAvatar } from '../../../slackkit/SKWorkspaceAvatar'
import { SKBadge } from '../../../slackkit/SKBadge'
import { RowIcon, SKEntityRow, SKListFooter } from '../../../slackkit/SKEntity'
import { sheetDef, screenDef } from '../../nav/registry'
import { useFlag } from '../../flags'
import { buildHomeSections, type HomeSection } from './sections'
import { TilesRow } from './Tiles'
import { ConversationRow } from './ConversationRow'
import './SectionBrowser'
import './home.css'
import { SKBanner } from '../../../slackkit/SKBanner'

// The Home tab on iOS 26 (spec home.md, shell-navigation.md §2.2): a clear navigation bar (workspace avatar, workspace
// name in Lato Black 22, your avatar and the filter button in Liquid Glass) over the theme's header gradient, then one
// list: the quick-view tiles, the unread sections and your sections, "Add Teammates", and the compose button above
// Search. Production (Sept 2026, reference/device/IMG_2246): section headers with their icon, "Title ›" and the caret up
// while expanded (June's iaNextHomeTabV3, the only header in 14b3cbaf), the list in the dt_* colors of ListThemeOptions.ia4Phone
// (ListThemeOptions.swift:65-87 [Sept]: contentPrimary / contentSecondary / contentTertiary, outlineTertiary dividers).

export function HomeScreen() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const open = useApp((s) => s.openConversation)
  const push = useApp((s) => s.push)
  const presentSheet = useApp((s) => s.presentSheet)
  const me = useMe()
  const theme = useTheme((s) => s.input)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showAllDMs, setShowAllDMs] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const prefs = useApp((s) => s.homePrefs)
  const agentsBadging = useFlag('agentsAndAppsBadging')
  const agentsInDms = useFlag('agentsInDms')
  const addTeammates = useFlag('refreshedOnboardingV2')
  const sections = useMemo(
    () => buildHomeSections(fx, messages, { showAllDMs, prefs, agentsBadging, agentsInDms, addTeammates }),
    [fx, messages, showAllDMs, prefs, agentsBadging, agentsInDms, addTeammates],
  )
  const onDark = theme.brightness >= 4

  // Title fades over the first 10 % of the top inset; the gradient fades once the list has scrolled 32 pt (spec §2.2).
  const navbarBottom = useNavbarBottom()
  const topInset = NAVBAR_BOTTOM
  const titleOpacity = rootTitleOpacity(scrollY, navbarBottom)
  const gradientVisible = scrollY <= 32

  return (
    <div className="ios-root-screen home" data-screen="home">
      <div className="ios-scroll home__list" style={{ paddingTop: topInset }} onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)} data-qa="home_list">
        <div className={`root-header-gradient${gradientVisible ? '' : ' is-faded'}`} />
        <TilesRow />
        {prefs.filterMode === 'external' && <ExternalFilterBanner />}
        {sections.map((sec, i) => (
          <Section
            key={sec.id}
            sec={sec}
            last={i === sections.length - 1}
            collapsed={!!collapsed[sec.id]}
            onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
            showAllDMs={showAllDMs}
            setShowAllDMs={setShowAllDMs}
            onOpen={open}
            browsable={prefs.sortMode === 'sections'}
          />
        ))}
        <div className="home__bottom-space" />
      </div>
      <RootNavBar
        onDark={onDark}
        scrolled={!gradientVisible}
        titleOpacity={titleOpacity}
        title={fx.workspace.name}
        leading={
          // The workspace button: SKWorkspaceAvatar .smallPlus 28 pt, concentric (round, its unread dot on the edge at
          // 45°) in a 44 pt glass circle (PrimaryNavigationHeaderService.swift:629-671 [Sept]; device IMG_2246, iOS 26.7:
          // avatar x 28–56 in the circle x 20–64). The 32 pt .toolbarItem is the edge-to-edge avatar, only when built
          // with the iOS 27 SDK and run on iOS 27 (`#if compiler(>=6.4)` + `#available(iOS 27.0, *)`, :548-559,
          // :592-598, :643-653): production differs from that path (shell-navigation.md §2.2).
          <GlassButton label="Open Workspace Panel" dark={onDark && gradientVisible} onClick={() => presentSheet('workspaces')}>
            <SKWorkspaceAvatar name={fx.workspace.name} initials={fx.workspace.initials} src={fx.workspace.iconUrl} size="smallPlus" round />
          </GlassButton>
        }
        trailing={
          // rightButtons = [filter, user], leading to trailing (Sept, HomeInteractor.swift:258-268; June's [user, filter]
          // was trailing-first): the filter, then the profile avatar rightmost, sharing one capsule.
          <GlassGroup dark={onDark && gradientVisible}>
            <GlassGroupItem label="Sort and Filter Home" onClick={() => presentSheet('home-filter')}>
              <Icon name="refine" size={20} />
            </GlassGroupItem>
            {/* with a status emoji 74 pt: 12 + 22 emoji + 8 + 28 avatar + 4 (SKBarButtonAvatarItem.swift; nav.css .is-status) */}
            <GlassGroupItem label="Profile menu" onClick={() => useApp.getState().presentSheet('you')} className={me.statusEmoji ? 'is-status' : undefined}>
              {me.statusEmoji && <Emoji name={me.statusEmoji} size={22} className="home__status-emoji" />}
              <SKMemberAvatar src={me.avatar} name={me.realName} size="smallPlus" round presence={me.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActiveInverted)" />
            </GlassGroupItem>
          </GlassGroup>
        }
      />
      <ComposeFab />
    </div>
  )
}

function Section({
  sec,
  last,
  collapsed,
  onToggle,
  showAllDMs,
  setShowAllDMs,
  onOpen,
  browsable,
}: {
  sec: HomeSection
  last: boolean
  collapsed: boolean
  onToggle: () => void
  showAllDMs: boolean
  setShowAllDMs: (v: boolean) => void
  onOpen: (id: string) => void
  /** the sections sort: the title opens the section browser (DefaultTransformingPipe.swift:152-155 [Sept]) */
  browsable: boolean
}) {
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const collapsedMentions = collapsed ? sec.rows.filter((r) => r.mentions > 0).length : 0
  const button =
    sec.kind === 'unread_dms' && (sec.total ?? 0) > 3
      ? showAllDMs
        ? { text: 'Show Less', label: 'Show Less', onClick: () => setShowAllDMs(false) }
        : { text: `Show All ${sec.total}`, label: `Show All ${sec.total}`, onClick: () => setShowAllDMs(true) }
      : undefined
  const badge = collapsedMentions ? <SKBadge count={collapsedMentions} className="home-badge" /> : undefined
  // Add Teammates → InviteEmailRoute (ConversationListHomePlugin.swift:482-483 [Sept]); the invite sheet when this build has
  // no email form
  const invite = () => (sheetDef('invite-by-email') ? presentSheet('invite-by-email') : sheetDef('invite') && presentSheet('invite'))
  // the section browser (home.md §11), when this build has it
  const browse = browsable && sec.sectionId && screenDef('section-browser') ? () => push({ screen: 'section-browser', sectionId: sec.sectionId }) : undefined
  return (
    <section className="home-section" data-section={sec.id}>
      {sec.headerless ? (
        // .blankDivider header: 8 pt (DefaultTransformingPipe.swift:213 [Sept]; SKList.swift:2076-2081)
        <div className="home-section__blank-header" />
      ) : (
        <HomeSectionHeader sec={sec} collapsed={collapsed} onToggle={sec.collapsible ? onToggle : undefined} chevron={browsable} onBrowse={browse} button={button} badge={badge} />
      )}
      {!collapsed && sec.rows.map((r) => <ConversationRow key={r.id} row={r} onOpen={onOpen} />)}
      {!collapsed && sec.action === 'add_channel' && <SKEntityRow state="action" ornament={<RowIcon name="plus" />} title="Add channel" onClick={() => presentSheet('add-channel')} />}
      {!collapsed && sec.action === 'new_message' && <SKEntityRow state="action" ornament={<RowIcon name="plus" />} title="Start a new message" onClick={() => push({ screen: 'compose' })} />}
      {sec.action === 'add_teammates' && <SKEntityRow state="action" ornament={<RowIcon name="plus" />} title="Add Teammates" onClick={invite} data-qa="home_add_teammates" />}
      {/* .hairlineDivider(color: listThemeOptions.dividerColor) = outlineTertiary (Sept ListThemeOptions.swift:81) */}
      {!last && <SKListFooter />}
    </section>
  )
}

/**
 * A Home section header, Sept 2026 (DefaultTransformingPipe.swift:194-230; SKHeaderEntity.swift [Sept]): .medium, 52 pt
 * (8 pt above the 44 pt content), 16 pt margins, 12 pt between items:
 *
 *   [icon in a 24 pt box] [Title][›]  …  [badge] [+ / text button] [caret]
 *
 * The icon is the section kind's (sectionIcon), tinted contentPrimary (no color passed, SKIcon.swift:159); the title
 * smallBody Bold 15 contentPrimary, Black when the section has unreads; the "›" (.chevronRight → caret_right, 20 pt,
 * contentPrimary, no gap; SKHeaderEntity.swift:51-63, :262-267) and the title open the section browser; the rest of the
 * header and the caret toggle collapse. The caret (caret_down_full, contentTertiary) points up while expanded and down
 * when collapsed (collapseIndicatorCollapsedOrientation .down, :720-726). Measured on a device (IMG_2246): icon ink x 20–35,
 * title x 52.7, caret x 405–423, headers 52 pt.
 */
function HomeSectionHeader({
  sec,
  collapsed,
  onToggle,
  chevron,
  onBrowse,
  button,
  badge,
}: {
  sec: HomeSection
  collapsed: boolean
  onToggle?: () => void
  /** the "›" after the title: the sections sort only (primaryTextBehavior .customAction, DefaultTransformingPipe.swift:152-155) */
  chevron: boolean
  onBrowse?: () => void
  button?: { text: string; label: string; onClick: () => void }
  badge?: ReactNode
}) {
  const title = <span className="sk-list-header__title">{sec.name}</span>
  return (
    <div className={['sk-list-header', 'home-header', sec.unread && 'is-unread'].filter(Boolean).join(' ')} role="heading" aria-level={2}>
      <div className="sk-list-header__content" onClick={onToggle} data-tap-fade>
        {sec.icon && (
          <span className="home-header__ornament">
            <Icon name={sec.icon} size={20} />
          </span>
        )}
        <button
          type="button"
          className="home-header__title"
          aria-label={sec.name}
          aria-description={onBrowse ? 'Show all Conversations' : undefined}
          onClick={(e) => {
            if (!onBrowse) return
            e.stopPropagation()
            onBrowse()
          }}
        >
          {title}
          {chevron && <Icon name="caret_right" size={20} className="home-header__chevron" />}
        </button>
        <span className="sk-list-header__spacer" />
        {badge}
        {button && (
          <button
            type="button"
            className="sk-list-header__text-button"
            aria-label={button.label}
            onClick={(e) => {
              e.stopPropagation()
              button.onClick()
            }}
          >
            {button.text}
          </button>
        )}
        {sec.collapsible && <Icon name="caret_down_full" size={20} className={`sk-list-header__caret home-header__caret${collapsed ? ' is-collapsed' : ''}`} />}
      </div>
    </div>
  )
}

/** The compose "+" (CreationEntryPointsFABHelper): a 56 pt glass circle above the Search tab, theme-tinted. */
function ComposeFab() {
  const presentSheet = useApp((s) => s.presentSheet)
  return (
    <button type="button" className="compose-fab" aria-label="Create New" onClick={() => presentSheet('create')} data-tap>
      <Icon name="plus" size={20} />
    </button>
  )
}

/**
 * The active-filter banner: "**External people** only" with ×, first in the list while the filter is on; tapping it
 * or × clears the filter (home.md §8; ConversationListFilteringBannerHomePlugin.swift:77-182). Card inset 12/16 in its
 * row (SKBannerEntity.swift:23).
 */
function ExternalFilterBanner() {
  const setHomePrefs = useApp((s) => s.setHomePrefs)
  const clear = () => setHomePrefs({ filterMode: 'all' })
  return (
    <div className="home-filter-banner">
      <SKBanner
        type="regular"
        tone="genericLight"
        text={
          <>
            <b>External people</b> only
          </>
        }
        ornament={{ icon: 'buildings' }}
        accessories={[{ delete: { onClick: clear } }]}
        isSelectable
        onSelected={clear}
      />
    </div>
  )
}
