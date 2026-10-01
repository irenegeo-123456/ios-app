import { useState } from 'react'
import { create } from 'zustand'
import { useApp, useMe } from '../../store'
import { GlassButton, RootNavBar } from '../../nav/NavBar'
import { screenDef } from '../../nav/registry'
import { useTheme } from '../../../theme/ThemeStyle'
import { useDevice } from '../../../sim/store'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKBadge } from '../../../slackkit/SKBadge'
import type { Fixture } from '../../../data/types'
import { BlankDivider, EntityRow, SectionFooter } from './EntityRow'
import './more.css'

// The More tab on iOS 26 (TabBarOverflowPage, spec shell-navigation.md §4.1-§4.2): the tab root's clear navigation bar
// (title "More", your avatar in Liquid Glass) over the theme's header gradient, then one section per overflow item, in
// TabBarOverflowPageFeature+Dependencies.swift:116-118's order: Sales, Agentforce, Files, Assigned to you, External
// Connections, each shown only when enabled. There are no Later, Huddles or Directories rows on iOS 26: those are
// Home's tiles. Each row is an SKGenericEntity .medium with a clear 36 pt box holding a 20 pt contentPrimary icon,
// the title in .body (.bodyBold when Sales has alerts) and the subtitle in .caption contentSecondary
// (TabBarOverflowPagePresenter.swift:60-90); badges PRO > count > NEW (:92-119).

/** The list's top inset: status bar + the 44 pt bar (measurements.md), as Home. */
const BAR = 44

/** The Lists megaphone behind "Assigned to you"'s NEW badge: seen once the row is selected (ListsOverflowTabItem.swift:120-140). */
const useMoreState = create<{ listsNuxSeen: boolean }>(() => ({ listsNuxSeen: false }))

export interface OverflowItem {
  id: string
  title: string
  subtitle: string
  icon: string
  /** PRO (not on a paid plan), a count, or NEW */
  badge?: 'pro' | 'new' | number
  bold?: boolean
  onSelect: () => void
}

/** The items TabBarOverflowService enables for this workspace, in display order. Exported for Home's tiles and Customize
 * Home, which show the same destinations while the Slackbot tab takes More's place (OverflowTabTile.swift:51-89). */
export function overflowItems(fx: Fixture, opts: { listsNuxSeen: boolean; open: (screen: string) => void; notInPrototype: () => void }): OverflowItem[] {
  const paid = fx.workspace.plan !== 'free'
  const items: OverflowItem[] = []
  // Sales: when Sales Home is visible (a Salesforce-connected workspace) and on iOS 26 (SalesOverflowTabItem.swift:54)
  if (fx.sections.some((s) => s.kind === 'salesforce')) {
    items.push({ id: 'sales', title: 'Sales', subtitle: 'View and update your Salesforce info', icon: 'sales', onSelect: opts.notInPrototype })
  }
  // Files: always on iOS 26 (DocsOverflowTabItem.swift:25-37) → DocsRoute(.moreTab)
  items.push({ id: 'docs', title: 'Files', subtitle: 'Browse your canvases, lists and attachments', icon: 'canvas_browser', onSelect: () => opts.open('files') })
  // Assigned to you: Lists on and not todosV2; PRO while Lists is an upsell, NEW until the Lists megaphone is seen
  // (ListsOverflowTabItem.swift:41-65, :85-105)
  items.push({
    id: 'assigned_to_you',
    title: 'Assigned to you',
    subtitle: 'Check off your tasks',
    icon: 'user_groups',
    badge: !paid ? 'pro' : opts.listsNuxSeen ? undefined : 'new',
    onSelect: () => {
      useMoreState.setState({ listsNuxSeen: true })
      if (screenDef('assigned')) opts.open('assigned')
      else opts.notInPrototype()
    },
  })
  // External Connections: always; PRO when the team isn't on a paid plan (ExternalConnectionsOverflowTabItem.swift:41-42)
  items.push({
    id: 'external_connections',
    title: 'External Connections',
    subtitle: 'Work with people from other organizations',
    icon: 'buildings',
    badge: !paid ? 'pro' : undefined,
    onSelect: opts.notInPrototype,
  })
  return items
}

export function MoreScreen() {
  const fx = useApp((s) => s.fx)
  const push = useApp((s) => s.push)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const me = useMe()
  const theme = useTheme((s) => s.input)
  const device = useDevice()
  const listsNuxSeen = useMoreState((s) => s.listsNuxSeen)
  const [scrollY, setScrollY] = useState(0)
  const onDark = theme.brightness >= 4

  // Title fades over the first 10 % of the top inset (TitleFadeScrollEffect, TabBarOverflowPagePresenter.swift:121-126);
  // the gradient fades once the list has scrolled 32 pt (shell-navigation.md §2.2).
  const inset = device.safeTop + BAR
  const titleOpacity = Math.max(0, 1 - scrollY / (0.1 * inset))
  const gradientVisible = scrollY <= 32

  const items = overflowItems(fx, {
    listsNuxSeen,
    open: (screen) => push({ screen }),
    notInPrototype: () => showToast('Not in the prototype'),
  })

  return (
    <div className="ios-root-screen more" data-screen="more">
      <div className="ios-scroll more__list" style={{ paddingTop: inset }} onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)} data-qa="more_list">
        <div className={`root-header-gradient${gradientVisible ? '' : ' is-faded'}`} />
        {items.map((it) => (
          // header .blankDivider(hidesWhenFirstRow: false), footer .hairlineDivider(hidesWhenLastRow: false, hasPadding: true):
          // 8 · row · 8 + line, for every section including the last (TabBarOverflowPagePresenter.swift:86-87)
          <section key={it.id} className="more-section" data-section={it.id}>
            <BlankDivider />
            <EntityRow
              size="medium"
              ornament={<Icon name={it.icon} size={20} />}
              title={it.title}
              bold={it.bold}
              subtitle={it.subtitle}
              subtitleLines={1}
              accessories={<OverflowBadge badge={it.badge} />}
              onClick={it.onSelect}
              data-qa={`more_row_${it.id}`}
            />
            <SectionFooter />
          </section>
        ))}
        <div className="more__bottom-space" />
      </div>
      <RootNavBar
        onDark={onDark}
        scrolled={!gradientVisible}
        titleOpacity={titleOpacity}
        title="More"
        trailing={
          // rightButtons = [user] alone (TabBarOverflowPageInteractor.swift:181-185): its own glass circle, 74 pt wide with a
          // status emoji. PrimaryNavigationHeaderService.swift:401-442: the user button presents You (YouRoute, §4.3)
          <GlassButton label="Profile menu" dark={onDark && gradientVisible} onClick={() => presentSheet('you')} className={me.statusEmoji ? 'is-status' : undefined}>
            {me.statusEmoji && <Emoji name={me.statusEmoji} size={22} className="more__status-emoji" />}
            <SKMemberAvatar src={me.avatar} name={me.realName} size="smallPlus" round presence={me.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActiveInverted)" />
          </GlassButton>
        }
      />
    </div>
  )
}

function OverflowBadge({ badge }: { badge: OverflowItem['badge'] }) {
  if (badge === undefined) return null
  // PRO: literal "PRO" (not localized), white on aubergine _70, rounded rectangle (TabBarOverflowPagePresenter.swift:95-105)
  if (badge === 'pro') return <SKBadge title="PRO" badgeStyle="text" textColor="var(--dt_color_constants_white)" backgroundColor="var(--dt_color_palettes_aubergine_70)" shape="roundedRectangle" />
  // NEW: new_all_caps, highlight1.content on highlight1.base (:108-115)
  if (badge === 'new') return <SKBadge title="NEW" badgeStyle="text" textColor="var(--dt_color_content_highlight_1)" backgroundColor="var(--dt_color_base_highlight_1)" />
  // a count, in the list theme's badge style (:106-107)
  return <SKBadge count={badge} className="more-badge" />
}
