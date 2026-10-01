import type { ReactNode } from 'react'
import type { Fixture } from '../../../data/types'
import { useApp } from '../../store'
import { useSim } from '../../../sim/store'
import { screenDef } from '../../nav/registry'
import { Icon } from '../../../icons/Icon'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { useHuddle } from '../../huddle/state'
import { customizableTiles, homeTileState } from '../../sheets/home/CustomizeHome'
import { SLACKBOT_AVATAR } from '../slackbot/constants'

// The quick-view tiles row (SyntheticViewsHomePlugin, spec home.md §7): content-width tiles, 8 pt apart, scrolling
// sideways, with a 48 pt "Customize" circle at the end. Each tile: 20 pt icon, a 15 pt title (Black when unread) and
// subtitle; unread tiles are tinted with the theme (spec §7.3 colors, --theme_tileUnread*).
//
// Which tiles show (slack-objc 14b3cbaf): a tile is drawn while its state isn't nil, and the whole row only while some
// tile has activity (SyntheticViewsModularHomePlugin.swift:227-232; the edu-onboarding empty state isn't modeled).
// Catch Up has a state only with unread conversations or unread threads (AllUnreadsTile.swift:84-95), Slackbot only
// without the Slackbot tab (SlackbotAiTile.swift:50); with the Slackbot tab in More's place, the More page's
// destinations (Files, Assigned to you, External Connections, Sales) become tiles after Drafts & Sent, title only
// (OverflowTabTile.swift:52-79, :127-136). Huddles, Later and Drafts & Sent show at zero ("0 live", "0 items": the
// device, reference/device/IMG_2246).

interface TileDef {
  id: string
  title: string
  subtitle: string
  icon: string
  unreadIcon?: string
  unread?: boolean
  badge?: boolean
  /** what keeps the row on screen (each tile's hasActivity) */
  activity?: boolean
  onClick: () => void
  ornament?: ReactNode
}

export function TilesRow() {
  const fx = useApp((s) => s.fx)
  const saved = useApp((s) => s.saved)
  const push = useApp((s) => s.push)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const tilePrefs = useApp((s) => s.homeTiles)
  const slackbotTab = useSim((s) => s.slackbotTab)

  const unreadConvs = Object.values(fx.unreads).filter((u) => u.count > 0).length
  const unreadThreads = (fx.activity ?? []).filter((a) => a.type === 'thread' && a.unread).length
  const threadMentions = (fx.activity ?? []).filter((a) => a.type === 'mention' && a.threadTs && a.unread).length
  const mentions = Object.values(fx.unreads).some((u) => u.mentions > 0)
  const catchUp = unreadConvs + unreadThreads
  const liveHuddles = useHuddle((h) => Object.keys(h.rooms).length)
  const laterCount = (fx.later ?? []).filter((l) => l.status !== 'completed' && l.status !== 'archived').length + saved.length
  const drafts = (fx.drafts ?? []).length

  const tiles: TileDef[] = [
    {
      id: 'catch_up',
      title: 'Catch Up',
      subtitle: catchUp > 99 ? '99+ new' : `${catchUp} new`,
      icon: 'stacked_cards',
      unreadIcon: 'stacked_cards_filled',
      unread: mentions || unreadThreads > 0,
      badge: mentions || threadMentions > 0,
      activity: mentions || unreadConvs > 0,
      onClick: () => push({ screen: 'catch-up' }),
    },
    {
      id: 'slackbot',
      title: 'Slackbot',
      subtitle: 'Ask anything',
      icon: 'slackbot_color',
      onClick: () => push({ screen: 'slackbot' }),
      // the full-bleed Slackbot image, 18 pt with a 1 pt inset in the 20 pt slot, radius 4 (SyntheticViewTile.swift:26-30,
      // :308-333): the SVG glyphs beside it draw ~1.3 pt short of 20; measured 18 pt on a device (IMG_2246)
      ornament: <img className="tile__slackbot" src={SLACKBOT_AVATAR} alt="" draggable={false} />,
    },
    {
      id: 'threads',
      title: 'Threads',
      subtitle: threadMentions ? (threadMentions === 1 ? '1 mention' : `${threadMentions} mentions`) : `${unreadThreads} new`,
      icon: 'threads',
      unreadIcon: 'threads_filled',
      unread: unreadThreads > 0 || threadMentions > 0,
      badge: threadMentions > 0,
      activity: threadMentions > 0 || unreadThreads > 0,
      onClick: () => push({ screen: 'threads' }),
    },
    { id: 'huddles', title: 'Huddles', subtitle: `${liveHuddles} live`, icon: 'headphones', unreadIcon: 'headphones_filled', activity: liveHuddles > 0, onClick: () => push({ screen: 'huddles' }) },
    { id: 'later', title: 'Later', subtitle: laterCount === 1 ? '1 item' : `${laterCount} items`, icon: 'bookmark', unreadIcon: 'bookmark_filled', activity: laterCount > 0, onClick: () => push({ screen: 'later' }) },
    { id: 'drafts', title: 'Drafts & Sent', subtitle: drafts === 1 ? '1 item' : `${drafts} items`, icon: 'send', activity: drafts > 0, onClick: () => push({ screen: 'drafts' }) },
  ]

  // Customize Home's order and visibility (home.md §7.6), over the same tile list it edits: with the Slackbot tab on,
  // Slackbot leaves and More's overflow items join (customizableTiles)
  const all = slackbotTab ? [...tiles, ...overflowTiles(fx, (screen) => push({ screen }), () => showToast('Not in the prototype'))] : tiles
  const shown = homeTileState(tilePrefs, customizableTiles(fx, slackbotTab))
    .filter((p) => p.visible)
    .map((p) => all.find((t) => t.id === p.id))
    .filter((t): t is TileDef => !!t)
    .filter((t) => (t.id === 'catch_up' ? unreadConvs > 0 || unreadThreads > 0 : t.id === 'slackbot' ? !slackbotTab : true))

  // No tile with activity: no row (SyntheticViewsModularHomePlugin.swift:227-232)
  if (!shown.some((t) => t.activity)) return null

  return (
    <div className="tiles-section">
      <div className="tiles-row" data-scroll-x>
        {shown.map((t) => (
          <button key={t.id} type="button" className={`tile${t.unread ? ' is-unread' : ''}`} onClick={t.onClick} data-tap data-qa={`tile_${t.id}`}>
            <span className={`tile__icon-row${t.ornament ? ' is-image' : ''}`}>
              <span className={`tile__icon${t.badge ? ' has-badge' : ''}`}>
                {t.ornament ?? <Icon name={t.unread && t.unreadIcon ? t.unreadIcon : t.icon} size={20} />}
                {t.badge && <span className="tile__badge" />}
              </span>
            </span>
            <span className="tile__title">{t.title}</span>
            {t.subtitle && <span className="tile__subtitle">{t.subtitle}</span>}
          </button>
        ))}
        <button type="button" className="tile-circle" aria-label="Customize" onClick={() => presentSheet('customize-home')} data-tap>
          <Icon name="settings" size={20} />
        </button>
      </div>
      <SKListFooter />
    </div>
  )
}

/**
 * The More page's destinations as Home tiles while the Slackbot tab takes More's place (OverflowTabTile, one per
 * enabled overflow item, in the tile order docs → sales → agentforce → assignedToYou → externalConnections,
 * PerTabPreferencesServiceInterface+Home.swift:29-50): the item's icon and title, no subtitle, unread with its badge
 * (none in the demo). The items are the More page's (screens/more, TabBarOverflowService): Files always, Sales with a
 * Salesforce section, Assigned to you, External Connections.
 */
function overflowTiles(fx: Fixture, open: (screen: string) => void, notInPrototype: () => void): TileDef[] {
  const out: TileDef[] = [{ id: 'docs', title: 'Files', subtitle: '', icon: 'canvas_browser', onClick: () => open('files') }]
  if (fx.sections.some((s) => s.kind === 'salesforce')) out.push({ id: 'sales', title: 'Sales', subtitle: '', icon: 'sales', onClick: notInPrototype })
  out.push({ id: 'assigned_to_you', title: 'Assigned to you', subtitle: '', icon: 'user_groups', onClick: () => (screenDef('assigned') ? open('assigned') : notInPrototype()) })
  out.push({ id: 'external_connections', title: 'External Connections', subtitle: '', icon: 'buildings', onClick: notInPrototype })
  return out
}
