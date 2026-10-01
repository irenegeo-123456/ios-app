import type { CSSProperties, ReactNode } from 'react'
import { useApp } from '../store'
import { useDevice } from '../../sim/store'
import { Icon } from '../../icons/Icon'

// iOS 26 navigation bars (SKNavigationBarLiquidGlass, spec shell-navigation.md §2.2 and §3). The bar itself is clear;
// its buttons are Liquid Glass: a 44 pt circle for a single button, a 44 pt capsule for adjacent ones (UIKit groups
// items that share a background). Measured on real iOS 26 Slack screenshots (measurements.md): the bar region is 54 pt
// under the status bar, its buttons at the top of it (y = safe top … +44), 16 pt from the edges on 402 pt screens
// (UIKit's margin; 20 on Max); content starts at safe top + 54 (--navbar-bottom, nav.css).
//
//   <NavBar title="# design" subtitle="16 members" trailing={…} />       a pushed screen: back circle, centered title
//   <RootNavBar title="Northstar" leading={…} trailing={…} />            a tab root: leading title, Lato Black 22

/** iOS 26's navigation bar region under the status bar (nav.css --navbar-h; reference/device/IMG_2246, measured). */
export const NAVBAR_H = 54
/** The top of a screen's content under its bar, for style props (nav.css --navbar-bottom = safe top + 54). */
export const NAVBAR_BOTTOM = 'var(--navbar-bottom)'
/** The same in points on the current device (status bar + 54: 116 on the Pro and Pro Max), for scroll effects. */
export const useNavbarBottom = () => useDevice().safeTop + NAVBAR_H

/**
 * SKNavigationItem.TitleFadeScrollEffect on a tab root's title: 1 at rest, gone once the list has scrolled 10 % of the
 * top inset (SKNavigationItem+ScrollEffect.swift:79-95, SKScrollEffectValue.swift:19-25; shell-navigation.md §2.2).
 */
export const rootTitleOpacity = (scrollY: number, topInset: number) => Math.max(0, 1 - scrollY / (0.1 * topInset))

export function GlassButton({ children, label, onClick, className, style, dark }: { children: ReactNode; label: string; onClick?: () => void; className?: string; style?: CSSProperties; dark?: boolean }) {
  return (
    <button type="button" className={['glass-button glass', dark && 'glass--on-dark', className].filter(Boolean).join(' ')} aria-label={label} onClick={onClick} style={style} data-tap>
      {children}
    </button>
  )
}

/**
 * Adjacent bar button items sharing one glass capsule (nav.css), in screen order. UIKit lays `rightBarButtonItems` out
 * from the trailing edge inward, so June 2026's `rightButtons = [user, filter]` is <filter/><user/> here; since
 * September Slack's `rightButtons` are already leading-to-trailing (docs/conventions.md, "Bar button order"). A lone
 * item is a GlassButton.
 */
export function GlassGroup({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <div className={['glass-group glass', dark && 'glass--on-dark', className].filter(Boolean).join(' ')}>{children}</div>
}

export function GlassGroupItem({ children, label, onClick, width, className }: { children: ReactNode; label: string; onClick?: () => void; width?: number; className?: string }) {
  return (
    <button type="button" className={['glass-group__item', className].filter(Boolean).join(' ')} aria-label={label} onClick={onClick} style={width ? { width } : undefined} data-tap>
      {children}
    </button>
  )
}

/**
 * The back button's glyph: Slack's caret, not UIKit's chevron. SKNavigationController gives every pushed screen an
 * SKBarButtonItem `.back` unless it sets its own back item (SKNavigationController.swift:68-81, :92-102, :112-117 [Sept];
 * June the same): `svgCaretLeftFull` 20 pt, no side padding on iOS 26, in contentPrimary baked light / dark, tint ignored
 * (SKBarButtonItem.swift:133-143, :258-275, :277-288). Production agrees: a real iPhone (iOS 26.7, Sept 2026,
 * reference/device/IMG_2247–2248) draws the caret's ink at x 37.5–46.3, y 75.5–92.2 in the 44 pt circle at x 20–64,
 * y 62–106 (caret_left_full's 5.5–14.8 × 1.7–18.3 of a centered 20 pt box) in (248,248,248) = contentPrimary. UIKit's
 * own chevron only appears in the flagged `rootNavigationUpdates` stacks (shell-navigation.md §3.1, mode C).
 */
export const BackChevron = () => <Icon name="caret_left_full" size={20} />

interface NavBarProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** replaces the default back button (null: none) */
  leading?: ReactNode | null
  trailing?: ReactNode
  onBack?: () => void
  onTitleClick?: () => void
  /** the bar's background once content scrolls under it */
  scrolled?: boolean
  className?: string
}

export function NavBar({ title, subtitle, leading, trailing, onBack, onTitleClick, scrolled, className }: NavBarProps) {
  const pop = useApp((s) => s.pop)
  return (
    <div className={['ios-navbar', scrolled && 'is-scrolled', className].filter(Boolean).join(' ')}>
      <div className="ios-navbar__edge" />
      <div className="ios-navbar__bar">
        <div className="ios-navbar__leading">
          {leading === undefined ? (
            <GlassButton label="Back" onClick={onBack ?? (() => pop())} className="glass-button--back">
              <BackChevron />
            </GlassButton>
          ) : (
            leading
          )}
        </div>
        {title !== undefined && (
          <div className={`ios-navbar__title${onTitleClick ? ' is-tappable' : ''}`} onClick={onTitleClick} role={onTitleClick ? 'button' : undefined}>
            <div className="ios-navbar__title-text">{title}</div>
            {subtitle && <div className="ios-navbar__subtitle">{subtitle}</div>}
          </div>
        )}
        <div className="ios-navbar__trailing">{trailing}</div>
      </div>
    </div>
  )
}

interface RootNavBarProps {
  title: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  /** SKNavigationItem.TitleFadeScrollEffect: 1 at rest, 0 once scrolled ~10 % of the top inset */
  titleOpacity?: number
  /** the header gradient is dark (brightness ≥ 4): white title, glass tinted for dark content */
  onDark?: boolean
  /** the list has scrolled past the gradient: the bar shows the soft scroll edge */
  scrolled?: boolean
  onTitleClick?: () => void
}

/** A tab root's bar (PrimaryNavigationHeaderService): leading title in SKFont.title (Lato Black 22). */
export function RootNavBar({ title, leading, trailing, titleOpacity = 1, onDark, scrolled, onTitleClick }: RootNavBarProps) {
  return (
    <div className={['ios-navbar ios-navbar--root', onDark && !scrolled && 'is-on-dark', scrolled && 'is-scrolled'].filter(Boolean).join(' ')}>
      <div className="ios-navbar__edge" />
      <div className="ios-navbar__bar">
        {leading && <div className="ios-navbar__leading">{leading}</div>}
        {/* Home's title is .leading(inset: 0) after the workspace button, the other tabs' .leading(inset: 8)
            (PrimaryNavigationHeaderService.swift:291-325); UIKit puts 12 pt between it and the button (the bar's gap) */}
        <div className="ios-navbar__root-title" style={{ opacity: titleOpacity, marginLeft: leading ? 0 : 8, pointerEvents: titleOpacity < 1 ? 'none' : undefined }} onClick={onTitleClick}>
          {title}
        </div>
        <div className="ios-navbar__trailing">{trailing}</div>
      </div>
    </div>
  )
}

export { Icon }
