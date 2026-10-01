import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { SKBadge } from './SKBadge'
import { cx, svgMask, roundedRectPath } from './util'
import './ornaments.css'

// SKHuddleFacePile (DeveloperComponents/HuddleFacePile/SKHuddleFacePile.swift:20-380): the huddle participant strip.
// A headphones count badge (SKBadge, max 99, emphasized in the given color) or a custom icon circle (baseTertiary),
// then up to 5 circular faces (small 18, medium 24), overlapping by 5 / 8 pt, the leftmost on top. Every item fills
// the row's height (the stack aligns .fill, so the badge is 24 pt tall at medium) and has a 1 pt border: basePrimary
// (default), sk_dark_gray (dark), or a 1 pt transparent gap instead (clear, drawn with a mask) (:74-80, :141-229,
// :325-372). Spec: slackkit-components.md › SKHuddleFacePile.
//
//   <SKHuddleFacePile avatars={[a, b, c]} badge={{ huddle: { count: 12, color: 'var(--dt_color_base_inverse_highlight_1)' } }} />
//   <SKHuddleFacePile avatars={[a, b]} size="small" border="clear" />

export type SKHuddleFacePileBadge = { huddle: { count: number; color: string } } | { custom: { icon: string; color: string } } | 'none'

interface Props {
  /** image URLs (null draws an empty face), up to 5 */
  avatars: (string | null)[]
  badge?: SKHuddleFacePileBadge
  size?: 'small' | 'medium'
  border?: 'default' | 'dark' | 'clear'
  /** isInteractionEnabled: huddleFacePileTapped */
  onTapped?: () => void
  className?: string
  style?: CSSProperties
}

const SIZE = { small: { image: 18, overlap: 5 }, medium: { image: 24, overlap: 8 } } as const

export function SKHuddleFacePile({ avatars, badge = 'none', size = 'medium', border = 'default', onTapped, className, style }: Props) {
  const { image, overlap } = SIZE[size]
  const faces = avatars.slice(0, 5)
  const borderColor = border === 'default' ? 'var(--dt_color_base_primary)' : border === 'dark' ? 'var(--sk_dark_gray)' : undefined
  const ring = borderColor ? `inset 0 0 0 1px ${borderColor}` : undefined
  // The row is as tall as its tallest item (18 pt badge vs the faces), and every item fills that height.
  const h = image
  const items: React.ReactNode[] = []
  if (badge !== 'none' && 'huddle' in badge)
    items.push(
      <SKBadge
        key="badge"
        count={badge.huddle.count}
        maxBadgeCount={99}
        icon="headphones"
        backgroundColor={badge.huddle.color}
        className="sk-face-pile__badge"
        style={{ height: h, borderRadius: h / 2, boxShadow: ring }}
      />,
    )
  if (badge !== 'none' && 'custom' in badge)
    items.push(
      <span key="custom" className="sk-face-pile__custom" style={{ width: h, height: h, boxShadow: ring }}>
        <Icon name={badge.custom.icon} size={20} color={badge.custom.color} />
      </span>,
    )
  faces.forEach((src, i) =>
    items.push(
      <span key={i} className="sk-face-pile__face" style={{ width: h, height: h }}>
        {src && <img src={asset(src)} alt="" draggable={false} />}
        {ring && <i style={{ boxShadow: ring }} />}
      </span>,
    ),
  )
  return (
    <span
      className={cx('sk-face-pile', border === 'clear' && 'is-clear', onTapped && 'is-interactive', className)}
      style={{ height: h, ...style }}
      role={onTapped ? 'button' : 'img'}
      aria-label={`${faces.length} huddle participant${faces.length === 1 ? '' : 's'}`}
      onClick={onTapped}
    >
      {items.map((node, i) => (
        <span
          key={i}
          className="sk-face-pile__item"
          style={{
            marginLeft: i ? -overlap : 0,
            // the leftmost item is frontmost (the stack sends each arranged subview to the back in order, :27-29)
            zIndex: items.length - i,
            ...(border === 'clear' && i > 0 ? clearMask(h, overlap) : null),
          }}
        >
          {node}
        </span>
      ))}
    </span>
  )
}

/** .clear: a 1 pt transparent gap where the item in front overlaps this one (updateMaskLayerIfNeeded, :305-340). */
function clearMask(h: number, overlap: number): CSSProperties {
  // The previous (front) item's right edge sits `overlap` pt into this one: cut its capsule out, outset by 1 pt.
  const long = 3 * h
  const mask = svgMask(h, h, `M0 0H${h}V${h}H0Z ${roundedRectPath(overlap + 1 - long, -1, long, h + 2, (h + 2) / 2)}`)
  return { WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: `${h}px ${h}px`, maskSize: `${h}px ${h}px`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }
}
