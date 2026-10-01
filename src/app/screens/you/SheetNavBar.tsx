import type { ReactNode } from 'react'
import { Icon } from '../../../icons/Icon'
import './you.css'

// The navigation bar of a modal Slack presents in a navigation controller on iOS 26 (a form sheet at the large detent:
// You, Pause Notifications, Preferences, Notifications, Set a Status). These modals keep the legacy SKNavigationController
// (FeatureNavigationController.swift:23-39, useModernNavController defaults off) and the legacy navigation variant
// (NavigationArchitectureVariant.swift:130-140, `.legacy` unless a toggle opts in), so UIKit draws the bar; Slack only
// sets the title's font and color (Lato Bold 17, contentPrimary: Modules/UIInfra/NavigationController/Implementation/
// UINavigationBar+SlackStyles.swift:84) and adds the automatic close button, SF Symbol "xmark" tinted contentPrimary
// (UIViewController+CloseButton.swift:61-77). Geometry and glass measured on Apple's iOS 26 HIG render of a large sheet
// (sheets-large-detent@2x.png, 536 px = 402 pt): the 44 pt glass circle sits 16 pt from the sheet's leading edge and top
// edge (x 16.5–59.3, y 76.5–119.3 on a sheet whose top is 60.8), its fill UIKit's systemFill over the sheet (#e9e9ea on
// white = rgba(120,120,128,.16); dark #39393d on #1c1c1e = .3), the xmark ≈16 pt of ink. A pushed page's back button is
// the same circle holding the back item Slack's SKNavigationController adds to every pushed screen: SKBarButtonItem
// .back, svgCaretLeftFull 20 pt in contentPrimary, "Back" (SKNavigationController.swift:92-117, SKBarButtonItem.swift:
// 133-143, :241-296; SNAP/SKBarButtonItemTests/testBackButtons). Title items are their text plus 12 pt a side in the
// capsule (measurements.md; SKBarButtonItem.swift:170-172); with Slack's style (.title(style: .default) → SKButton
// .systemDefault at .barButton: Lato Bold 17 in highlight1.content, contentSecondary when disabled:
// SKBarButtonItem.swift:185-213, SKButton+Types.swift:200-207, 255-256, SKButton.swift:242-251) they pass weight 'bold'
// and that color. (slack-objc 14b3cbaf.)

/** A bar button item: a title ("Save", "Cancel") in a glass capsule, or an icon (svgCheck) in a glass circle. */
export interface SheetBarItem {
  title?: string
  icon?: string
  /** VoiceOver label of an icon item */
  label?: string
  onClick: () => void
  disabled?: boolean
  /** the title's or icon's color (Slack's titleTextAttributes / tint); default contentPrimary */
  color?: string
  /** Slack's Lato attributes on a title (slackNavbarActionFont / …BoldFont, UIFont+LegacySupport.swift:332-340);
   *  without, UIKit's default SF 17 */
  weight?: 'bold' | 'regular'
}

interface Props {
  title: ReactNode
  onClose?: () => void
  /** a pushed page: the back chevron instead of the close button */
  onBack?: () => void
  /** a title item on the left instead of close / back ("Cancel") */
  leading?: SheetBarItem
  /** the right bar button item ("Save") */
  trailing?: SheetBarItem
  /** the list has scrolled under the bar: iOS 26's soft scroll edge shows */
  scrolled?: boolean
}

export function SheetNavBar({ title, onClose, onBack, leading, trailing, scrolled }: Props) {
  return (
    <div className={`you-sheet-bar${scrolled ? ' is-scrolled' : ''}`}>
      <div className="you-sheet-bar__edge" />
      {leading ? (
        <BarItemButton item={leading} side="leading" />
      ) : onBack ? (
        <button type="button" className="you-sheet-glass you-sheet-bar__close" aria-label="Back" onClick={onBack} data-tap>
          <Icon name="caret_left_full" size={20} />
        </button>
      ) : (
        onClose && (
          <button type="button" className="you-sheet-glass you-sheet-bar__close" aria-label="Close" onClick={onClose} data-tap>
            <XMark />
          </button>
        )
      )}
      <div className={`you-sheet-bar__title${leading?.title || trailing?.title ? ' is-narrow' : ''}`}>{title}</div>
      {trailing && <BarItemButton item={trailing} side="trailing" />}
    </div>
  )
}

function BarItemButton({ item, side }: { item: SheetBarItem; side: 'leading' | 'trailing' }) {
  if (item.icon)
    return (
      <button
        type="button"
        className={`you-sheet-glass you-sheet-bar__icon-button is-${side}`}
        aria-label={item.label ?? item.title}
        onClick={item.onClick}
        disabled={item.disabled}
        data-tap={item.disabled ? undefined : ''}
      >
        <Icon name={item.icon} size={20} color={item.disabled ? undefined : item.color} />
      </button>
    )
  return (
    <button
      type="button"
      className={['you-sheet-glass you-sheet-bar__text-button', `is-${side}`, item.weight && `is-${item.weight}`].filter(Boolean).join(' ')}
      onClick={item.onClick}
      disabled={item.disabled}
      style={item.color && !item.disabled ? { color: item.color } : undefined}
      data-tap={item.disabled ? undefined : ''}
    >
      {item.title}
    </button>
  )
}

/** SF Symbols "xmark" at the bar's point size (the render's ink is 15.75 pt square). */
export const XMark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M1.9 1.9 14.1 14.1M14.1 1.9 1.9 14.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
