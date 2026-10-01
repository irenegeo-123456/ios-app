import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { cx, roundedRectPath, svgMask } from './util'
import './ornaments.css'

// SKAvatarPile (DesignerComponents/AvatarPile/SKAvatarPile.swift): a row of square avatars with proportional corners
// (0.25 × side, SKImageView .proportional), overlapping by side / 4 or spaced by side / 4, and an optional "+N" tile
// (baseTertiary, contentTertiary, Lato Bold 15, or 12 above 9; "99+" above 99). When overlapping, each item cuts a
// rounded hole in the one before it, grown by side / 8 across and side / 16 up and down, which leaves a visible gap
// (:103-178, :258-307). Sizes: extraSmall 16, small 28, medium 32, large 64. Spec: slackkit-components.md ›
// SKAvatarPile.
//
//   <SKAvatarPile avatars={[a, b, c]} shouldOverlap />
//   <SKAvatarPile avatars={people.map((p) => p.avatar)} maxAvatarCount={2} shouldOverlap shouldShowOverflowCount />

export const AVATAR_PILE_SIZES = { extraSmall: 16, small: 28, medium: 32, large: 64 } as const

/** AvatarSource: an image URL, an icon, or nothing (skipped, as iOS does for .none) */
export type SKAvatarPileSource = string | { icon: string; color?: string } | null

interface Props {
  avatars: SKAvatarPileSource[]
  maxAvatarCount?: number
  shouldOverlap: boolean
  size?: keyof typeof AVATAR_PILE_SIZES
  shouldShowOverflowCount?: boolean
  className?: string
  style?: CSSProperties
}

export function SKAvatarPile({ avatars, maxAvatarCount = 5, shouldOverlap, size = 'small', shouldShowOverflowCount = false, className, style }: Props) {
  const side = AVATAR_PILE_SIZES[size]
  const overlap = side / 4
  const step = side + (shouldOverlap ? -overlap : overlap)
  const overflow = avatars.length - maxAvatarCount
  const items: ({ kind: 'avatar'; src: Exclude<SKAvatarPileSource, null> } | { kind: 'overflow'; n: number })[] = avatars
    .slice(0, maxAvatarCount)
    .filter((a): a is Exclude<SKAvatarPileSource, null> => a !== null)
    .map((src) => ({ kind: 'avatar' as const, src }))
  if (shouldShowOverflowCount && overflow > 0) items.push({ kind: 'overflow', n: overflow })
  const radius = 0.25 * side
  // the hole the next item cuts into this one, in this one's coordinates (recomputeLayout, :119-153)
  const hx = step - overlap / 2
  const hy = -overlap / 4
  const hw = side + overlap
  const hh = side + overlap / 2
  const mask = shouldOverlap ? svgMask(side, side, `M0 0H${side}V${side}H0Z ${roundedRectPath(hx, hy, hw, hh, 0.25 * Math.min(hw, hh))}`) : undefined
  const width = items.length ? (items.length - 1) * step + side : 0
  return (
    <span className={cx('sk-avatar-pile', className)} style={{ width, height: side, ...style }} role="img" aria-label={`${items.length} members`}>
      {items.map((it, i) => {
        const cut = mask && i < items.length - 1 ? { WebkitMaskImage: mask, maskImage: mask } : undefined
        const pos: CSSProperties = { left: i * step, width: side, height: side, borderRadius: radius, ...cut }
        if (it.kind === 'overflow')
          return (
            <span key="overflow" className="sk-avatar-pile__overflow" style={{ ...pos, font: it.n > 9 ? 'var(--sk-micro-bold)' : 'var(--sk-small-body-bold)' }}>
              {it.n > 99 ? '99+' : `+${it.n}`}
            </span>
          )
        if (typeof it.src === 'object')
          return (
            <span key={i} className="sk-avatar-pile__icon" style={pos}>
              <Icon name={it.src.icon} size={side} color={it.src.color ?? 'var(--dt_color_content_primary)'} />
            </span>
          )
        return (
          <span key={i} className="sk-avatar-pile__image" style={pos}>
            <img src={asset(it.src)} alt="" draggable={false} />
          </span>
        )
      })}
    </span>
  )
}
