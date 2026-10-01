import type { ReactNode } from 'react'
import './ios.css'
import './sheet-bar.css'

// The navigation bar of a modal Slack shows in a navigation controller, as a form sheet at the large detent (Add
// Members, Edit Channel, Forward Message). UIKit draws it on iOS 26: a clear bar, bar button items in Liquid Glass — a
// 44 pt circle for an icon, a 44 pt capsule for a title — 16 pt from the sheet's sides and top (measured on Apple's
// iOS 26 render of a large sheet, sheets-large-detent@2x.png: 536 px = 402 pt). Slack sets the title (Lato Bold 17,
// contentPrimary; Modules/UIInfra/NavigationController/Implementation/UINavigationBar+SlackStyles.swift:84) and, per
// screen, a bar button's font and color (slackNavbarActionFont / slackNavbarActionBoldFont = Lato 17 / Lato Bold 17,
// UIFont+LegacySupport.swift:332-340).

export interface SheetBarButton {
  title: string
  onClick: () => void
  disabled?: boolean
  /** Slack's attributes: Lato Bold 17 ('bold') or Lato 17 ('regular') in `color`; without, UIKit's default (SF 17) */
  weight?: 'bold' | 'regular'
  color?: string
  /** the title color Slack sets for .disabled (setTitleTextAttributes(_:for: .disabled)); without, UIKit's dimmed tint */
  disabledColor?: string
  /** VoiceOver's label when it isn't the title (a "Cancel" that dismisses reads "Close") */
  accessibilityLabel?: string
}

interface Props {
  title: ReactNode
  /** the automatic close button (xmark), or a title button ("Cancel") */
  leading?: 'close' | SheetBarButton
  onClose?: () => void
  trailing?: SheetBarButton
  /** content has scrolled under the bar: iOS 26's soft scroll edge */
  scrolled?: boolean
}

export function SheetBar({ title, leading, onClose, trailing, scrolled }: Props) {
  return (
    <div className={`sheet-bar${scrolled ? ' is-scrolled' : ''}`}>
      <div className="sheet-bar__edge" />
      {leading === 'close' ? (
        <button type="button" className="sheet-bar__glass sheet-bar__close" aria-label="Close" onClick={onClose} data-tap>
          <XMark />
        </button>
      ) : leading ? (
        <BarText button={leading} side="leading" />
      ) : null}
      <div className="sheet-bar__title">{title}</div>
      {trailing && <BarText button={trailing} side="trailing" />}
    </div>
  )
}

function BarText({ button, side }: { button: SheetBarButton; side: 'leading' | 'trailing' }) {
  const cls = ['sheet-bar__glass', 'sheet-bar__text', `is-${side}`, button.weight && `is-${button.weight}`, button.disabled && button.disabledColor && 'has-disabled-color'].filter(Boolean).join(' ')
  const color = button.disabled ? button.disabledColor : button.color
  return (
    <button
      type="button"
      className={cls}
      style={color ? { color } : undefined}
      aria-label={button.accessibilityLabel}
      onClick={button.onClick}
      disabled={button.disabled}
      data-tap={button.disabled ? undefined : ''}
    >
      {button.title}
    </button>
  )
}

/** SF Symbols "xmark" as UIKit draws the automatic close button (Modules/UIInfra/NavigationController/Implementation/
 * UIViewController+CloseButton.swift:61-77). */
export const XMark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M1.9 1.9 14.1 14.1M14.1 1.9 1.9 14.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
