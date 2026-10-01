import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { useLongPress } from '../app/gestures'
import { SKSpinner } from './SKSpinner'
import { cx } from './util'
import './buttons.css'

// SKIconButton (DesignerComponents/IconButton/SKIconButton.swift): a 20 pt icon, bare or on a circular backdrop (the
// floating-action "FAB" style), with an optional caption 8 pt below (Lato 17, contentSecondary). Sizes: small 40,
// medium 56, accessory 20, nativeMinimum 44 (:442-464). With a backdrop, pressing or selecting scales it to 0.9 with
// the bounce timing and switches to the selected fill, icon and color; a bare icon dims to alpha 0.75 instead.
// Disabled and processing are alpha 0.35 (processing hides the icon behind an 18 pt spinner) (:228-277). Optional
// shadow (black 10 %, y 6, radius 7), 1 pt outlineTertiary stroke, pulsing halo, and the iOS 26 glass circle.
// Spec: slackkit-components.md › SKIconButton.
//
//   <SKIconButton icon="add_reaction" onClick={…} />
//   <SKIconButton icon="plus" size="medium" backdrop={{ unselected: 'var(--sk_foreground_low_solid)', withShadow: true }} />
//   <SKIconButton icon="compose" size="medium" useGlassEffect backdrop={{ unselected: 'var(--theme_fabBackground)' }} />

/** SKIconButton.PresentationObject.Size (:442-464) */
export const ICON_BUTTON_SIZES = { small: 40, medium: 56, accessory: 20, nativeMinimum: 44 } as const
export type SKIconButtonSize = keyof typeof ICON_BUTTON_SIZES

export interface SKIconButtonBackdrop {
  /** the circle's fill; the Circle's own default is primary.baseTertiary (:691) */
  unselected?: string
  selected?: string
  withShadow?: boolean
  withStroke?: boolean
  /** Pulse(color, repeatCount): an oval behind the circle scaling to 1.5 over 1 s, ease-in, autoreversing (:729-738) */
  withPulse?: { color: string; repeatCount?: number }
}

interface Props {
  icon: string
  /** defaults to `icon` */
  selectedIcon?: string
  /** default primary.contentPrimary */
  iconColor?: string
  selectedIconColor?: string
  /** .circle(unselected:selected:withShadow:withStroke:withPulse:); omit for .none */
  backdrop?: SKIconButtonBackdrop
  size?: SKIconButtonSize
  /** a caption under the circle */
  title?: ReactNode
  interactionState?: 'enabled' | 'disabled' | 'processing'
  isSelected?: boolean
  /** iOS 26 UIGlassEffect(.clear), tinted with the backdrop color, as a capsule (:31-56, :264-275) */
  useGlassEffect?: boolean
  /** iconScaleFactor (September 2026, :504, :527): the 20 pt icon drawn at this scale about its center
   *  (SKIcon.swift:93-99) */
  iconScaleFactor?: number
  /** buttonTapped */
  onClick?: () => void
  /** buttonLongPressed */
  onLongPress?: (el: HTMLElement) => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
  'data-qa'?: string
}

export function SKIconButton({
  icon,
  selectedIcon,
  iconColor = 'var(--dt_color_content_primary)',
  selectedIconColor,
  backdrop,
  size = 'small',
  title,
  interactionState = 'enabled',
  isSelected = false,
  useGlassEffect = false,
  iconScaleFactor = 1,
  onClick,
  onLongPress,
  accessibilityLabel,
  className,
  style,
  ...rest
}: Props) {
  const side = ICON_BUTTON_SIZES[size]
  const enabled = interactionState === 'enabled'
  const lp = useLongPress((el) => onLongPress?.(el))
  const unselected = backdrop?.unselected ?? 'var(--dt_color_base_tertiary)'
  const vars = {
    '--ib-size': `${side}px`,
    '--ib-fill': unselected,
    '--ib-fill-selected': backdrop?.selected ?? unselected,
    '--ib-icon': iconColor,
    '--ib-icon-selected': selectedIconColor ?? iconColor,
  } as CSSProperties
  return (
    <button
      type="button"
      className={cx(
        'sk-icon-button',
        backdrop ? 'has-backdrop sk-bounce' : 'no-backdrop',
        isSelected && 'is-selected',
        !enabled && 'is-disabled',
        interactionState === 'processing' && 'is-processing',
        className,
      )}
      style={{ ...vars, ...style }}
      disabled={!enabled}
      aria-label={accessibilityLabel ?? (typeof title === 'string' ? title : icon)}
      aria-pressed={isSelected || undefined}
      onClick={enabled ? onClick : undefined}
      data-tap={enabled ? '' : undefined}
      data-qa={rest['data-qa']}
      {...(onLongPress && enabled ? lp : {})}
    >
      <span className={cx('sk-icon-button__circle', backdrop?.withShadow && 'has-shadow', backdrop?.withStroke && 'has-stroke', useGlassEffect && backdrop && 'is-glass')}>
        {backdrop?.withPulse && (
          <span
            className="sk-icon-button__pulse"
            style={{ background: backdrop.withPulse.color, animationIterationCount: (backdrop.withPulse.repeatCount ?? 1) * 2 }}
            aria-hidden
          />
        )}
        <Icon name={icon} size={20 * iconScaleFactor} className="sk-icon-button__icon" />
        <Icon name={selectedIcon ?? icon} size={20 * iconScaleFactor} className="sk-icon-button__icon is-selected-icon" />
        {interactionState === 'processing' && <SKSpinner size="medium" color="lightOnDark" className="sk-icon-button__spinner" />}
      </span>
      {title !== undefined && title !== null && <span className="sk-icon-button__title">{title}</span>}
    </button>
  )
}
