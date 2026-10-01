import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { cx, ellipsePath, svgMask } from './util'
import './ornaments.css'

// SKDecoratedIcon (DeveloperComponents/DecoratedIcon/SKDecoratedIcon.swift:20-257): an icon with a small badge at its
// top-right, used for bar-button badges. `circle`: a dot of min(w, h) / 2.5 centered on the icon's top-right corner
// (plus `offset`), with the icon cleared in an ellipse a quarter of the dot larger around it. `icon`: a 14 pt icon in
// the top-right corner, optionally on a radius-2 background, with the icon cleared 2 pt around it. The frame is the
// union of the padded icon and the badge (:118-160, :162-229). Spec: slackkit-components.md › SKDecoratedIcon.
//
//   <SKDecoratedIcon icon="notifications" badge={{ circle: { color: 'var(--dt_color_base_inverse_important)' } }} />
//   <SKDecoratedIcon icon="headphones" size={24} badge={{ icon: { icon: 'computer', backgroundColor: 'var(--dt_color_base_highlight_2)' } }} />

type Insets = { top: number; left: number; bottom: number; right: number }
const ZERO: Insets = { top: 0, left: 0, bottom: 0, right: 0 }

export type SKDecoratedIconBadge =
  | { circle: { color: string; offset?: { x: number; y: number } } }
  | { icon: { icon: string; iconColorOverride?: string; backgroundColor?: string; padding?: Insets } }
  | 'none'

interface Props {
  icon: string
  /** the icon's size (default 20 × 20) */
  size?: number | { width: number; height: number }
  /** default primary.contentPrimary */
  color?: string
  /** a fill behind the icon */
  backgroundColor?: string
  padding?: Insets
  badge?: SKDecoratedIconBadge
  className?: string
  style?: CSSProperties
}

/** Constants: decoratingIconSize 14, decoratingIconBackgroundCornerRadius 2, iconCutoutPadding 2 */
const DECO = 14

export function SKDecoratedIcon({ icon, size = 20, color = 'var(--dt_color_content_primary)', backgroundColor, padding = ZERO, badge = 'none', className, style }: Props) {
  const w = typeof size === 'number' ? size : size.width
  const h = typeof size === 'number' ? size : size.height
  const icon0 = { x: padding.left, y: padding.top, w, h }
  const main = { w: w + padding.left + padding.right, h: h + padding.top + padding.bottom }
  // badgeRect (:131-152)
  let b: { x: number; y: number; w: number; h: number } | null = null
  if (badge !== 'none' && 'circle' in badge) {
    const side = Math.round((Math.min(w, h) / 2.5) * 3) / 3
    const off = badge.circle.offset ?? { x: 0, y: 0 }
    b = { x: off.x + padding.left + w - side / 2, y: off.y + padding.top - side / 2, w: side, h: side }
  } else if (badge !== 'none' && 'icon' in badge) {
    const p = badge.icon.padding ?? ZERO
    b = { x: padding.left + padding.right + w - p.right - p.left - DECO, y: 0, w: DECO + p.left + p.right, h: DECO + p.top + p.bottom }
  }
  // bounding size = union of the main rect and the badge; shift both so the badge doesn't overhang (:118-128, :169-181)
  let W = main.w
  let H = main.h
  let dx = 0
  let dy = 0
  if (b) {
    const minX = Math.min(0, b.x)
    const minY = Math.min(0, b.y)
    W = Math.max(main.w, b.x + b.w) - minX
    H = Math.max(main.h, b.y + b.h) - minY
    if (b.x + b.w > W) dx = b.x + b.w - W
    if (b.y < 0) dy = -b.y
  }
  const ix = icon0.x + dx
  const iy = icon0.y + dy
  let mask: string | undefined
  let badgeEl = null
  if (b) {
    const bx = b.x + dx
    const by = b.y + dy
    // the cut-out: the badge rect outset by a quarter of its size (circle) or 2 pt (icon), as an ellipse (:198-212)
    const out = 'circle' in (badge as object) ? b.w / 4 : 2
    mask = svgMask(W, H, `M0 0H${W}V${H}H0Z ${ellipsePath(bx - out, by - out, b.w + 2 * out, b.h + 2 * out)}`)
    if (badge !== 'none' && 'circle' in badge)
      badgeEl = <span className="sk-decorated-icon__dot" style={{ left: bx, top: by, width: b.w, height: b.h, background: badge.circle.color }} />
    else if (badge !== 'none' && 'icon' in badge) {
      const p = badge.icon.padding ?? ZERO
      badgeEl = (
        <span className="sk-decorated-icon__badge" style={{ left: bx, top: by, width: b.w, height: b.h, background: badge.icon.backgroundColor }}>
          <Icon name={badge.icon.icon} size={DECO} color={badge.icon.iconColorOverride ?? color} style={{ position: 'absolute', left: p.left, top: p.top }} />
        </span>
      )
    }
  }
  return (
    <span className={cx('sk-decorated-icon', className)} style={{ width: W, height: H, ...style }} role="img" aria-label={icon}>
      <span className="sk-decorated-icon__layer" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <span style={{ position: 'absolute', left: ix, top: iy, width: w, height: h, background: backgroundColor }}>
          <Icon name={icon} size={Math.min(w, h)} color={color} />
        </span>
      </span>
      {badgeEl}
    </span>
  )
}
