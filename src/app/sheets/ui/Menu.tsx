import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useSheet, dismissSheetThen } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { useDevice } from '../../../sim/store'
import { useDismissIfMissing } from '../shared'
import './ios.css'

// A UIMenu as iOS 26 draws it (SKMenu → UIMenu, Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/Menu/
// SKMenu.swift:197-273): a Liquid Glass platter with 34 pt corners, 45 pt rows, the item's icon on the leading side and
// its title after it, a chevron for submenus, inline sections separated by 10 pt of space (no rule), destructive
// items in red. Slack's icons are 20 × 20 template images, emoji and workspace avatars 24 × 24 (SKMenu.swift:62-66).
// Geometry measured on Apple's iOS 26 HIG render of a Notes pull-down menu (menu-secondary-actions-expanded@2x.png,
// 536 px = 402 pt): 254 wide, rows 45, icons centered 38.5 pt from the leading edge, titles at 66, the chevron 28 pt
// from the trailing edge, 10 pt above the first and below the last row; a checkmark in the leading column at 16–26
// (menus-toggled-item@2x.png). Colors are UIKit's (label, secondaryLabel, tertiaryLabel, iOS 26 systemRed #ff383c).
//
//   openMenu({ anchor: buttonElement, sections: [{ items: [{ title: 'Copy', icon: 'copy', onSelect }] }] })
//
// A pull-down menu opens over its button (it grows out of it, a few points larger), aligned to the button's side of
// the screen; tapping outside closes it. `title` draws the menu's title above the first section.

export type MenuIcon = string | { emoji: string } | { node: ReactNode }

export interface MenuAction {
  title: string
  subtitle?: string
  icon?: MenuIcon
  destructive?: boolean
  disabled?: boolean
  /** UIMenuElement.State: true = on (checkmark), false = off; leave it out for plain actions */
  checked?: boolean
  onSelect?: () => void
  submenu?: undefined
}

export interface MenuSubmenu {
  title: string
  subtitle?: string
  icon?: MenuIcon
  submenu: MenuSection[]
  destructive?: undefined
  checked?: undefined
  disabled?: boolean
}

export type MenuElement = MenuAction | MenuSubmenu

export interface MenuSection {
  title?: string
  items: MenuElement[]
}

export interface MenuSpec {
  title?: string
  sections: MenuSection[]
}

export interface AnchorRect {
  x: number
  y: number
  width: number
  height: number
}

/** A rect in screen points (inside .ios-screen), from an element or a rect. */
export function screenRect(el: Element | AnchorRect | null | undefined): AnchorRect | undefined {
  if (!el) return undefined
  if (!(el instanceof Element)) return el
  const screen = el.closest('.ios-screen') ?? document.querySelector('.ios-screen')
  if (!screen) return undefined
  const s = screen.getBoundingClientRect()
  const scale = s.width / (screen as HTMLElement).offsetWidth || 1
  const r = el.getBoundingClientRect()
  return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, width: r.width / scale, height: r.height / scale }
}

export interface OpenMenuOptions extends MenuSpec {
  /** the button it opens from (element or screen rect) */
  anchor?: Element | AnchorRect | null
  /** which edge of the anchor the menu lines up with; default: the anchor's side of the screen */
  align?: 'leading' | 'trailing'
}

/** Presents a pull-down menu (the 'menu' overlay). */
export function openMenu(opts: OpenMenuOptions) {
  const { anchor, ...rest } = opts
  useApp.getState().presentSheet('menu', { ...rest, anchor: screenRect(anchor ?? null) })
}

// ------------------------------------------------------------------------------------------------ the overlay

/** The 'menu' overlay: a pull-down menu over its anchor. */
export function MenuOverlay(props: { sheetKey: string } & Omit<OpenMenuOptions, 'anchor'> & { anchor?: AnchorRect }) {
  const sheet = useSheet()
  const device = useDevice()
  const sections = Array.isArray(props.sections) ? props.sections.filter((x) => Array.isArray(x?.items)) : []
  useDismissIfMissing(!sections.some((x) => x.items.length))
  if (!sections.some((x) => x.items.length)) return null
  const a = typeof props.anchor?.x === 'number' && typeof props.anchor.y === 'number' ? props.anchor : { x: device.width - 16 - 44, y: device.safeTop, width: 44, height: 44 }
  const trailing = props.align ? props.align === 'trailing' : a.x + a.width / 2 > device.width / 2
  // UIKit: the menu grows out of the button, 6 pt above its top edge, flush with its outer side (measured, above).
  const style: CSSProperties = { top: Math.max(device.safeTop - 8, a.y - 6) }
  if (trailing) style.right = Math.max(8, device.width - (a.x + a.width) - 1)
  else style.left = Math.max(8, a.x - 1)
  style.transformOrigin = `${trailing ? 'right' : 'left'} top`
  return (
    <div className="ios-menu-overlay" onPointerDown={(e) => e.target === e.currentTarget && sheet?.dismiss()}>
      <MenuPlatter spec={{ title: props.title, sections }} className="ios-menu--pulldown" style={style} onDone={(then) => { sheet?.dismiss(); then?.() }} maxHeight={device.height - (style.top as number) - device.safeBottom - 8} />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ the platter

interface PlatterProps {
  spec: MenuSpec
  className?: string
  style?: CSSProperties
  /** closes the menu and runs the chosen action (the menu's content is frozen while it fades) */
  onDone: (then?: () => void) => void
  maxHeight?: number
}

/** The menu itself: sections of items, with submenus that open in place. */
export function MenuPlatter({ spec, className, style, onDone, maxHeight }: PlatterProps) {
  const [path, setPath] = useState<MenuSubmenu[]>([])
  const level: MenuSpec = path.length ? { title: undefined, sections: path[path.length - 1].submenu ?? [] } : { title: spec.title, sections: spec.sections ?? [] }
  const items = level.sections.flatMap((s) => s.items ?? [])
  const hasIcons = items.some((i) => i.icon !== undefined)
  const hasChecks = items.some((i) => i.checked !== undefined)
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | undefined>(undefined)
  // Submenus replace the menu's content in place; the platter animates to the new height.
  useLayoutEffect(() => {
    const inner = ref.current?.firstElementChild as HTMLElement | null
    if (inner) setH(inner.offsetHeight)
  }, [path])

  const choose = (item: MenuElement) => {
    if (item.disabled) return
    if (item.submenu) return setPath((p) => [...p, item])
    onDone(item.onSelect)
  }

  return (
    <div ref={ref} className={['ios-menu glass-platter', hasIcons && 'has-icons', hasChecks && 'has-checks', className].filter(Boolean).join(' ')} style={{ ...style, height: h, maxHeight }} role="menu">
      <div className="ios-menu__inner">
        {path.length > 0 && (
          <button type="button" className="ios-menu__back" onClick={() => setPath((p) => p.slice(0, -1))} data-tap>
            <span className="ios-menu__back-title">{path[path.length - 1].title}</span>
            <ChevronDown className="ios-menu__back-chevron" />
          </button>
        )}
        {level.title && <div className="ios-menu__title">{level.title}</div>}
        {level.sections.map((sec, i) => (
          <div key={i} className="ios-menu__section" role="group">
            {sec.title && <div className="ios-menu__section-title">{sec.title}</div>}
            {(sec.items ?? []).map((item, j) => (
              <MenuRow key={j} item={item} onClick={() => choose(item)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MenuRow({ item, onClick }: { item: MenuElement; onClick: () => void }) {
  const cls = ['ios-menu__item', item.destructive && 'is-destructive', item.disabled && 'is-disabled'].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'} aria-checked={item.checked} data-tap={item.disabled ? undefined : ''}>
      {item.checked && <Checkmark className="ios-menu__check" />}
      {item.icon !== undefined && <span className="ios-menu__icon">{renderIcon(item.icon)}</span>}
      <span className="ios-menu__text">
        <span className="ios-menu__item-title">{item.title}</span>
        {item.subtitle && <span className="ios-menu__item-subtitle">{item.subtitle}</span>}
      </span>
      {item.submenu && <ChevronRight className="ios-menu__chevron" />}
    </button>
  )
}

function renderIcon(icon: MenuIcon) {
  if (typeof icon === 'string') return <Icon name={icon} size={20} />
  if ('emoji' in icon) return <Emoji name={icon.emoji} size={24} />
  return icon.node
}

/** SF Symbols checkmark (semibold, as UIMenu draws the on state). */
export const Checkmark = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
    <path d="M2.2 8.1 5.9 11.8 12.9 3.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** SF Symbols chevron.right, as UIMenu draws a submenu's disclosure (7 × 12 ink, tertiaryLabel). */
export const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden>
    <path d="M1.5 1.5 6.5 6.5 1.5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} width="13" height="8" viewBox="0 0 13 8" fill="none" aria-hidden>
    <path d="M1.5 1.5 6.5 6.5 11.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Closes the menu overlay, then runs `fn` (for callers outside the platter). */
export const afterMenu = (key: string | undefined, fn?: () => void) => dismissSheetThen(key, fn)
