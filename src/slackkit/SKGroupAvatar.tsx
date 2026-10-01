import type { CSSProperties } from 'react'
import { SKMemberAvatar } from './SKMemberAvatar'
import { cx, proportionalRadius, svgMask } from './util'
import './ornaments.css'

// SKGroupAvatar (DeveloperComponents/GroupAvatar/SKGroupAvatar.swift:22-432): the group-DM avatar. Small sizes show
// the member count (Lato Bold 13, contentPrimary) on primary.baseTertiary, 24 × 24 (verySmall 20 × 20 since September
// 2026, countLabelSideLength :265-277; June drew 12 × 12); large and
// extraLarge show two photos (24 / 36 pt) top-left and bottom-right in a 1.5× frame, the top-left one cut away around
// the other with a gap of 2 + 0.015 × side. Radius min(20, 0.25 × image side). In a pressed row the count box is
// basePrimary @13 % (:86, :240-257). Spec: slackkit-components.md › SKGroupAvatar.
//
//   <SKGroupAvatar count={3} />                                          the Home row's count box
//   <SKGroupAvatar size="large" primarySrc={a} secondarySrc={b} count={4} />

export type SKGroupAvatarSize = 'verySmall' | 'small' | 'large' | 'extraLarge'

interface Props {
  /** totalMembers */
  count: number
  /** a Size, or (earlier API) a pixel side for the count box */
  size?: SKGroupAvatarSize | number
  primarySrc?: string
  secondarySrc?: string
  primaryName?: string
  secondaryName?: string
  className?: string
  style?: CSSProperties
}

const IMAGE_SIDE = { verySmall: 16, small: 24, large: 24, extraLarge: 36 } as const

export function SKGroupAvatar({ count, size = 'small', primarySrc, secondarySrc, primaryName = '', secondaryName = '', className, style }: Props) {
  if (typeof size === 'number' || size === 'small' || size === 'verySmall') {
    const side = typeof size === 'number' ? size : size === 'small' ? 24 : 20
    const radius = typeof size === 'number' ? side / 4 : proportionalRadius(IMAGE_SIDE[size])
    return (
      <span className={cx('sk-group-avatar', className)} style={{ width: side, height: side, borderRadius: radius, ...style }} role="img" aria-label={`${count} members`}>
        {count}
      </span>
    )
  }
  const img = IMAGE_SIDE[size]
  const frame = img * 1.5
  const r = proportionalRadius(img)
  const gap = 2 + 0.015 * img
  // the top-left photo is cut away around the bottom-right one, outset by the gap, its top-left corner rounded by
  // r × (side + 2 gap) / side (ImageContainerView.topLeftImageMaskPath)
  const hole = img / 2 - gap
  const outer = (r * (img + 2 * gap)) / img
  const mask = svgMask(img, img, `M0 0H${img}V${img}H0Z M${hole} ${img + gap}V${hole + outer}A${outer} ${outer} 0 0 1 ${hole + outer} ${hole}H${img + gap}V${img + gap}Z`)
  return (
    <span className={cx('sk-group-avatar-pair', className)} style={{ width: frame, height: frame, ...style }} role="img" aria-label={`${count} members`}>
      <span className="sk-group-avatar-pair__top" style={{ width: img, height: img, borderRadius: `${r}px ${r}px 0 ${r}px`, WebkitMaskImage: mask, maskImage: mask }}>
        <SKMemberAvatar src={primarySrc} name={primaryName} size={img} />
      </span>
      <SKMemberAvatar src={secondarySrc} name={secondaryName} size={img} className="sk-group-avatar-pair__bottom" style={{ left: img / 2, top: img / 2 }} />
    </span>
  )
}
