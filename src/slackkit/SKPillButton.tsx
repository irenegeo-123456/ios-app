import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SKEmoji } from './SKEmoji'
import { SKBadge } from './SKBadge'
import { cx } from './util'
import './buttons.css'

// SKPillButton (DesignerComponents/PillButton/SKPillButton.swift): a capsule with an optional emoji, a label, an
// optional icon (left or right) and a count badge, 8 pt apart, inside the size's insets (small 8/12, medium 12/12,
// custom). Radius = height / 2; at least as wide as tall. Fill primary.surfacePrimary, or surfaceSecondary while pressed
// or selected; 0.9 bounce only with shouldAnimateTransition; disabled alpha 0.35 (:18-23, :165-199, :311-387). The badge
// overlaps the top-right corner: its top 5 pt above the pill, its center 5 pt in from the trailing edge (:22, :195-198).
// Spec: slackkit-components.md › SKPillButton.
//
//   <SKPillButton text="Add Reaction" />
//   <SKPillButton emoji="man-shrugging" text="Add Reaction" icon="channel" iconPosition="right" badge={{ count: 5 }} />
//   <SKPillButton text="Unreads" size="small" outlineColor="var(--sk_foreground_max_solid)" />

export type SKPillButtonSize = 'small' | 'medium' | { top: number; left: number; bottom: number; right: number }

interface Props {
  /** the label (SKLabel: Lato 17, contentPrimary unless textFont / textColor say otherwise) */
  text?: ReactNode
  textFont?: string
  textColor?: string
  /** an Icons.xcassets name, 20 pt */
  icon?: string
  iconColor?: string
  iconPosition?: 'left' | 'right'
  /** an emoji short name, always first, 20 pt */
  emoji?: string
  badge?: Parameters<typeof SKBadge>[0]
  size?: SKPillButtonSize
  /** fill (default primary.surfacePrimary) */
  unselectedColor?: string
  /** fill while pressed or selected (default primary.surfaceSecondary) */
  selectedColor?: string
  /** 1 pt border */
  outlineColor?: string
  isSelected?: boolean
  isEnabled?: boolean
  /** false: no touches (isInteractive) */
  isInteractive?: boolean
  /** animate the 0.9 bounce (and icon show/hide) */
  shouldAnimateTransition?: boolean
  /** buttonTapped */
  onClick?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

const INSETS = { small: { top: 8, left: 12, bottom: 8, right: 12 }, medium: { top: 12, left: 12, bottom: 12, right: 12 } }

export function SKPillButton({
  text,
  textFont,
  textColor,
  icon,
  iconColor,
  iconPosition = 'left',
  emoji,
  badge,
  size = 'medium',
  unselectedColor = 'var(--dt_color_surface_primary)',
  selectedColor = 'var(--dt_color_surface_secondary)',
  outlineColor,
  isSelected = false,
  isEnabled = true,
  isInteractive = true,
  shouldAnimateTransition = false,
  onClick,
  accessibilityLabel,
  className,
  style,
}: Props) {
  const insets = typeof size === 'string' ? INSETS[size] : size
  const iconEl = icon ? <Icon name={icon} size={20} color={iconColor ?? 'var(--dt_color_content_primary)'} className="sk-pill-button__icon" /> : null
  const live = isEnabled && isInteractive
  return (
    <button
      type="button"
      className={cx('sk-pill-button', shouldAnimateTransition && 'sk-bounce', isSelected && 'is-selected', !isEnabled && 'is-disabled', className)}
      style={
        {
          '--pill-fill': unselectedColor,
          '--pill-fill-selected': selectedColor,
          padding: `${insets.top}px ${insets.right}px ${insets.bottom}px ${insets.left}px`,
          boxShadow: outlineColor ? `inset 0 0 0 1px ${outlineColor}` : undefined,
          pointerEvents: isInteractive ? undefined : 'none',
          ...style,
        } as CSSProperties
      }
      disabled={!isEnabled}
      aria-label={accessibilityLabel}
      aria-pressed={isSelected || undefined}
      onClick={live ? onClick : undefined}
      data-tap={live ? '' : undefined}
    >
      {emoji && <SKEmoji name={emoji} size={20} className="sk-pill-button__emoji" />}
      {iconPosition === 'left' && iconEl}
      {text !== undefined && text !== null && (
        <span className="sk-pill-button__label" style={{ font: textFont, color: textColor }}>
          {text}
        </span>
      )}
      {iconPosition === 'right' && iconEl}
      {badge && (
        <span className="sk-pill-button__badge">
          <SKBadge {...badge} />
        </span>
      )}
    </button>
  )
}
