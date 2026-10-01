import type { ReactNode } from 'react'
import { GlassGroup } from '../../app/nav/NavBar'

// The navigation bar of a sheet presented in a UINavigationController (app modals, the full-screen option and people
// pickers, the text editor). Slack only sets its items' text: Lato 17 in content_highlight_1, content_tertiary when
// disabled (AppViewViewController.swift:195-244); the bar itself is UIKit's, which isn't in Slack's source (spec
// blockkit.md §10). On iOS 26 its items are Liquid Glass capsules 16 pt from the sheet's top and sides (Apple's
// sheets-large-detent render: a 44 pt glass circle at x 16, 16 below the sheet's edge), drawn with the app's glass
// (GlassGroup, as the compose screen's text items are); the title is centered on them.

export interface SheetNavItem {
  label: string
  onClick: () => void
  disabled?: boolean
  /** UIBarButtonItem.Style.done: bold (semibold in the system font) */
  done?: boolean
  /**
   * The item's font: 'lato' (default) is the app modal's Lato 17 (AppViewViewController.swift:195-244); 'bold' Slack's
   * SKBarButtonItem titles, Lato Bold 17 (people / channel pickers); 'system' a plain UIBarButtonItem(title:style:)
   * with no title attributes, UIKit's 17 pt system font in the bar tint (option pickers). All in highlight1.
   */
  font?: 'lato' | 'bold' | 'system'
}

/** `titleFont`: 'small' is the app modal's AppViewTitleView (Lato Bold 15 over Lato 13); 'nav' a plain navigationItem.title, Lato Bold 17. */
export function SheetNav({ title, subtitle, leading, trailing, titleFont = 'small' }: { title?: ReactNode; subtitle?: ReactNode; leading?: SheetNavItem | null; trailing?: SheetNavItem | null; titleFont?: 'small' | 'nav' }) {
  const item = (it: SheetNavItem) => (
    <GlassGroup className={`bk-sheet-nav__item${it.disabled ? ' is-disabled' : ''}`}>
      <button type="button" className={['bk-sheet-nav__button', it.done && 'is-done', it.font && it.font !== 'lato' && `is-${it.font}`].filter(Boolean).join(' ')} disabled={it.disabled} onClick={it.onClick} data-tap={it.disabled ? undefined : ''}>
        {it.label}
      </button>
    </GlassGroup>
  )
  return (
    <div className="bk-sheet-nav">
      <div className="bk-sheet-nav__side">{leading && item(leading)}</div>
      {title !== undefined && (
        <div className={`bk-sheet-nav__title${titleFont === 'nav' ? ' is-nav' : ''}`}>
          <div className="bk-sheet-nav__title-text">{title}</div>
          {subtitle && <div className="bk-sheet-nav__subtitle">{subtitle}</div>}
        </div>
      )}
      <div className="bk-sheet-nav__side is-trailing">{trailing && item(trailing)}</div>
    </div>
  )
}
