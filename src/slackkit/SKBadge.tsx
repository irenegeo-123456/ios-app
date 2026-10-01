import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { cx } from './util'

// SKBadge (DesignerComponents/Badge/SKBadge.swift): a count ("3", "9+"), text ("Last used") or tag badge, with an
// optional 12 pt icon and pulse. Pill: 18 pt tall, 9 pt side margins, fully rounded; rounded rectangle: 20 pt tall,
// 4 pt margins, radius min(20, 0.25 × h). At least 24 pt and at least its height wide (:186-237). Styles (:357-420):
// emphasized (important.baseInverse / contentInversePrimary, Lato Bold 12), deemphasized (clear / contentSecondary,
// Lato 12), text (surfacePrimary / contentSecondary), tag (grass_5 / grass_70). Spec: slackkit-components.md › SKBadge.
//
//   <SKBadge count={3} />                          emphasized; counts over maxBadgeCount (9) read "9+"
//   <SKBadge count={222} icon="headphones" />      "🎧 9+"
//   <SKBadge title="Last used" />                  text style
//   <SKBadge title="PRO" badgeStyle="emphasized" backgroundColor="var(--sk_aubergine)" shape="roundedRectangle" />
//
// Home passes its theme colors with a class (.home-badge sets background and color); `background` / `color` / `text` /
// `max` are the earlier names of backgroundColor / textColor / title / maxBadgeCount and still work.

export type SKBadgeStyle = 'emphasized' | 'deemphasized' | 'text' | 'tag'

interface Props {
  /** init(count:): shows the count, or "N+" above maxBadgeCount (R.strings.badgeCountNumberPlus "%@+") */
  count?: number
  maxBadgeCount?: number
  /** init(title:): a free-text badge */
  title?: ReactNode
  icon?: string
  /** Style; default emphasized for counts, text for titles */
  badgeStyle?: SKBadgeStyle
  /** the style's background / text colors (emphasized, text and tag take them) */
  backgroundColor?: string
  textColor?: string
  /** emphasized(withPulse:): a same-shape halo that scales 1 → 1.5 over 1 s, autoreversing, repeatCount times */
  withPulse?: { color: string; repeatCount?: number }
  shape?: 'pill' | 'roundedRectangle'
  /** badgeTapped(typeIdentifier), only when interactive */
  onBadgeTapped?: () => void
  className?: string
  style?: CSSProperties
  /** @deprecated use title */
  text?: ReactNode
  /** @deprecated use maxBadgeCount */
  max?: number
  /** @deprecated use backgroundColor */
  background?: string
  /** @deprecated use textColor */
  color?: string
}

/** "9+" for counts over the max (SKBadge.swift:309-337) */
export const badgeCountText = (count: number, max = 9) => (count > max ? `${max}+` : String(count))

export function SKBadge({
  count,
  maxBadgeCount,
  max,
  title,
  text,
  icon,
  badgeStyle,
  backgroundColor,
  textColor,
  background,
  color,
  withPulse,
  shape = 'pill',
  onBadgeTapped,
  className,
  style,
}: Props) {
  const label = title ?? text ?? (count === undefined ? '' : badgeCountText(count, maxBadgeCount ?? max ?? 9))
  const kind: SKBadgeStyle = badgeStyle ?? (title !== undefined ? 'text' : 'emphasized')
  const bg = backgroundColor ?? background
  const fg = textColor ?? color
  const vars: Record<string, string> = {}
  if (bg) vars['--badge-bg'] = bg
  if (fg) vars['--badge-fg'] = fg
  return (
    <span
      className={cx('sk-badge', `sk-badge--${kind}`, shape === 'roundedRectangle' && 'sk-badge--rounded', withPulse && 'has-pulse', onBadgeTapped && 'is-interactive', className)}
      style={{ ...vars, ...style } as CSSProperties}
      onClick={onBadgeTapped}
      role={onBadgeTapped ? 'button' : undefined}
    >
      {withPulse && (
        <span
          className="sk-badge__pulse"
          style={{ background: withPulse.color, animationIterationCount: (withPulse.repeatCount ?? 1) * 2 }}
          aria-hidden
        />
      )}
      {icon && <Icon name={icon} size={12} className="sk-badge__icon" />}
      {label !== '' && <span className="sk-badge__label">{label}</span>}
    </span>
  )
}
