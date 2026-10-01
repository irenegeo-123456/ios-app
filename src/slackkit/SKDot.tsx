import type { CSSProperties } from 'react'
import { cx } from './util'
import './controls.css'

// SKDot (DesignerComponents/Dot/SKDot.swift, new in September 2026): a small filled circle used as a status
// indicator, most often an unread marker. A 12 pt circle centered in a 16 pt view (2 pt of padding all round, so it
// keeps its breathing room against neighbouring content, :23-30, :48-65), in important.baseInverse by default
// (#E01E5A / #D3305D, :21). Decorative unless given an accessibility label (:100-111). Also a list-row accessory
// (SKListCellAccessory.dot, SKListCellAccessory.swift:43-44, :480-490). Spec: slackkit-components.md › SKDot.
//
//   <SKDot />
//   <SKDot color="var(--dt_color_palettes_grass_70)" accessibilityLabel="Unread" />

interface Props {
  /** default important.baseInverse (SKDot.defaultColor) */
  color?: string
  /** makes the dot its own accessibility element; without it the dot is decorative */
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKDot({ color, accessibilityLabel, className, style }: Props) {
  return (
    <span
      className={cx('sk-dot', className)}
      style={{ ...(color && ({ '--sk-dot-color': color } as CSSProperties)), ...style }}
      role={accessibilityLabel ? 'img' : undefined}
      aria-label={accessibilityLabel}
      aria-hidden={accessibilityLabel ? undefined : true}
    >
      <span className="sk-dot__circle" />
    </span>
  )
}
