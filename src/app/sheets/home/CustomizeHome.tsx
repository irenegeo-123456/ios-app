import { useRef, useState } from 'react'
import { useApp, type HomeTilePref } from '../../store'
import { useSim } from '../../../sim/store'
import type { Fixture } from '../../../data/types'
import { overflowItems } from '../../screens/more/MoreScreen'
import { Icon } from '../../../icons/Icon'
import { SKSwitch } from '../../../slackkit/SKSwitch'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { useLongPress } from '../../gestures'
import { openMenu } from '../ui/Menu'
import './home-sheets.css'

// Customize Home (spec home.md §7.6; Modules/Features/Home/Implementation/SyntheticTileCustomization/, STC below). A
// native sheet with one medium detent and the grabber (STC Feature.swift:20-28); its title and close button are set
// but never drawn (the view controller isn't in a navigation controller), so it opens on the list's header: "Customize
// Home" / "Drag to reorder quick views in Home". Each tile is a 60 pt row: its icon, its name, a visibility switch
// (Drafts & Sent has none) and a "More Options" button with Move Before / Move After (STC Presenter.swift:40-109).
// Rows reorder by long-press and drag; every change saves at once and Home follows (STC Interactor.swift:47-132).

/** The tiles Home shows, in PerTabPreferencesService's default order (the ids Home's Tiles.tsx uses). */
export const TILES: { id: string; title: string; icon: string; toggle: boolean }[] = [
  { id: 'catch_up', title: 'Catch Up', icon: 'stacked_cards', toggle: true },
  { id: 'slackbot', title: 'Slackbot', icon: 'slackbot_color', toggle: true },
  { id: 'threads', title: 'Threads', icon: 'threads', toggle: true },
  { id: 'huddles', title: 'Huddles', icon: 'headphones', toggle: true },
  { id: 'later', title: 'Later', icon: 'bookmark', toggle: true },
  // "Drafts & Sent" has no switch (MOCAP-498, STC Presenter.swift:49-51)
  { id: 'drafts', title: 'Drafts & Sent', icon: 'send', toggle: false },
]

type TileListDef = (typeof TILES)[number]

/**
 * The More page's destinations, as tile ids in Home's tile order. With the Slackbot tab in More's place (flag
 * slackbotBottomTab), each destination the More page enables is a customizable tile (OverflowTabTile.swift:51-89,
 * slack-objc 14b3cbaf), listed with a switch like the others (SyntheticTileCustomizationPresenter.swift:47-80). The list
 * is the saved state filtered to the available tiles (SyntheticTileCustomizationInteractor.swift:121-141), and the
 * default state is every customizable tile in SyntheticViewsTileIdentifier order (PerTabPreferencesService.swift:30-34,
 * PerTabPreferencesServiceInterface+Home.swift:31-53), so they follow Drafts & Sent as docs → sales → agentforce →
 * assignedToYou → externalConnections. The ids are the More page's (screens/more overflowItems) and Home's tiles'.
 */
const OVERFLOW_TILE_ORDER = ['docs', 'sales', 'agentforce', 'assigned_to_you', 'external_connections']

/**
 * The tiles Customize Home lists: the Slackbot tile only without the Slackbot tab (SlackbotAiTile.swift:106-116), then,
 * with it, the More page's destinations (titles and icons as the More page draws them:
 * SyntheticTileCustomizationPresenter.swift:150-160, :199-209 — Files canvas_browser, Sales sales, Agentforce agentforce,
 * Assigned to you user_groups, External Connections buildings).
 */
export function customizableTiles(fx: Fixture, slackbotTab: boolean): TileListDef[] {
  if (!slackbotTab) return TILES
  const items = overflowItems(fx, { listsNuxSeen: true, open: () => {}, notInPrototype: () => {} })
  const overflow = OVERFLOW_TILE_ORDER.flatMap((id) => items.filter((i) => i.id === id)).map((i) => ({ id: i.id, title: i.title, icon: i.icon, toggle: true }))
  return [...TILES.filter((t) => t.id !== 'slackbot'), ...overflow]
}

/** The saved order and visibility of `defs` (Home's tiles by default), the rest in their default order. */
export function homeTileState(saved: HomeTilePref[], defs: readonly { id: string }[] = TILES): HomeTilePref[] {
  const known = saved.filter((t) => defs.some((d) => d.id === t.id))
  const missing = defs.filter((d) => !known.some((t) => t.id === d.id)).map((d) => ({ id: d.id, visible: true }))
  return [...known, ...missing]
}

export function CustomizeHome() {
  const fx = useApp((s) => s.fx)
  const saved = useApp((s) => s.homeTiles)
  const setTiles = useApp((s) => s.setHomeTiles)
  const slackbotTab = useSim((s) => s.slackbotTab)
  const defs = customizableTiles(fx, slackbotTab)
  const tiles = homeTileState(saved, defs)
  const [dragging, setDragging] = useState<{ id: string; dy: number; y0: number } | null>(null)
  const list = useRef<HTMLDivElement>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= tiles.length || from === to) return
    const next = [...tiles]
    const [t] = next.splice(from, 1)
    next.splice(to, 0, t)
    setTiles(next)
  }
  const toggle = (id: string, visible: boolean) => setTiles(tiles.map((t) => (t.id === id ? { ...t, visible } : t)))

  // Long-press, then drag: the row follows the pointer and the others make room (UICollectionView drag and drop).
  const ROW = 60
  const lock = (on: boolean) => list.current?.closest('.ios-sheet')?.toggleAttribute('data-drag-locked', on)
  const startDrag = (id: string, e: PointerEvent | React.PointerEvent) => {
    lock(true)
    setDragging({ id, dy: 0, y0: e.clientY })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const scale = list.current ? list.current.getBoundingClientRect().height / list.current.offsetHeight || 1 : 1
    setDragging({ ...dragging, dy: (e.clientY - dragging.y0) / scale })
  }
  const onUp = () => {
    lock(false)
    if (!dragging) return
    const from = tiles.findIndex((t) => t.id === dragging.id)
    const to = Math.max(0, Math.min(tiles.length - 1, from + Math.round(dragging.dy / ROW)))
    setDragging(null)
    move(from, to)
  }
  const dragFrom = dragging ? tiles.findIndex((t) => t.id === dragging.id) : -1
  const dragTo = dragging ? Math.max(0, Math.min(tiles.length - 1, dragFrom + Math.round(dragging.dy / ROW))) : -1

  return (
    <div className="ch" data-qa="customize_home">
      {/* SKHeaderEntity .medium: title smallBodyBold contentPrimary, subtitle smallBody contentSecondary, 12 / 16
          margins, 4 pt apart, 8 pt more on top (SKHeaderEntity.swift:80-87,300,454-474), then a hairline footer */}
      <div className="ch-header">
        <div className="ch-header__title">Customize Home</div>
        <div className="ch-header__subtitle">Drag to reorder quick views in Home</div>
      </div>
      <SKListFooter />
      <div className="ch-list" ref={list} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {tiles.map((t, i) => {
          const def = defs.find((d) => d.id === t.id)!
          let shift = 0
          if (dragging && t.id !== dragging.id) {
            if (dragFrom < dragTo && i > dragFrom && i <= dragTo) shift = -ROW
            if (dragFrom > dragTo && i < dragFrom && i >= dragTo) shift = ROW
          }
          return (
            <Row
              key={t.id}
              def={def}
              visible={t.visible}
              index={i}
              count={tiles.length}
              lifted={dragging?.id === t.id}
              offset={dragging?.id === t.id ? dragging.dy : shift}
              onToggle={(v) => toggle(t.id, v)}
              onMove={(to) => move(i, to)}
              onLift={(e) => startDrag(t.id, e)}
            />
          )
        })}
      </div>
    </div>
  )
}

function Row({
  def,
  visible,
  index,
  count,
  lifted,
  offset,
  onToggle,
  onMove,
  onLift,
}: {
  def: TileListDef
  visible: boolean
  index: number
  count: number
  lifted: boolean
  offset: number
  onToggle: (v: boolean) => void
  onMove: (to: number) => void
  onLift: (e: React.PointerEvent) => void
}) {
  const last = useRef<React.PointerEvent | null>(null)
  const lp = useLongPress(() => last.current && onLift(last.current))
  const more = (el: Element) =>
    openMenu({
      anchor: el,
      sections: [
        {
          // First row: only Move After; last: only Move Before (STC Presenter.swift:95-109; DataTypes.swift:22-39)
          items: [
            ...(index > 0 ? [{ title: 'Move Before', icon: 'arrow_left', onSelect: () => onMove(index - 1) }] : []),
            ...(index < count - 1 ? [{ title: 'Move After', icon: 'arrow_right', onSelect: () => onMove(index + 1) }] : []),
          ],
        },
      ],
    })
  return (
    <div
      className={`ch-row${lifted ? ' is-lifted' : ''}`}
      style={{ transform: offset ? `translateY(${offset}px)` : undefined, transition: lifted ? 'none' : undefined }}
      role="button"
      // tapping a row flips its switch (SKList.swift:2156-2175)
      onClick={() => def.toggle && onToggle(!visible)}
      data-tap
      {...lp}
      onPointerDown={(e) => {
        last.current = e
        lp.onPointerDown(e)
      }}
    >
      <span className="ch-row__bg" />
      <span className="ch-row__ornament">
        <Icon name={def.icon} size={20} />
      </span>
      <span className="ch-row__title">{def.title}</span>
      {def.toggle && (
        <span className="ch-row__switch" onClick={(e) => e.stopPropagation()}>
          <SKSwitch isOn={visible} onToggled={onToggle} accessibilityLabel={def.title} />
        </span>
      )}
      {/* SKIconButton .small: 40 × 40, ellipsis_horizontal_filled 20 contentPrimary, "More Options" (more_options, 11706) */}
      <button
        type="button"
        className="ch-row__more"
        aria-label="More Options"
        onClick={(e) => {
          e.stopPropagation()
          more(e.currentTarget)
        }}
      >
        <Icon name="ellipsis_horizontal_filled" size={20} />
      </button>
    </div>
  )
}
