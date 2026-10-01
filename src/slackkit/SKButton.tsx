import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SKSpinner } from './SKSpinner'
import { cx, darken } from './util'
import './buttons.css'

// SKButton (DesignerComponents/Button/SKButton.swift, SKButton+Types.swift, SKButton+PresentationObject.swift): Slack's
// text button. Text-only (default, system*), filled (primary, danger), outlined (outline*), custom and quickAction
// styles; 13 sizes; an icon left, right or on top; a loading state that keeps the size and shows an 18 pt spinner.
// Size = content + padding (at least 18 × 18); a 1 pt border when the style has one; pressed bounce 0.96 (none for the
// text-only styles). Spec: slackkit-components.md › SKButton (sizes, colors per state).
//
//   <SKButton title="Save" buttonStyle="primary" onClick={save} />
//   <SKButton title="Remind me" icon="reminder" size="large" />
//   <SKButton title="Delete" buttonStyle="danger" state="processing" />
//   <SKButton title="" icon="reminder" />                                  icon only (44 × 40 at medium)
//   <SKButton title="Done" icon="check_circle_filled" iconColor="var(--dt_color_content_highlight_2)" />
//   <SKButton title="Done" buttonStyle="systemDefault" isPadded={false} size="barButton" />

/** SKButton.PresentationObject.Style (Types:24-35). `default` takes `textColor`, `custom` takes `customColors`. */
export type SKButtonStyle =
  | 'default'
  | 'outlineDefault'
  | 'systemDefault'
  | 'systemDanger'
  | 'primary'
  | 'danger'
  | 'outlinePrimary'
  | 'outlineDanger'
  | 'custom'
  | 'quickAction'

/** SKButton.PresentationObject.Size (Types:81-111) */
export type SKButtonSize =
  | 'extraSmall'
  | 'small'
  | 'medium'
  | 'large'
  | 'xLarge'
  | 'barButton'
  | 'toastButton'
  | 'huddleBarButton'
  | 'channelDetailBarButton'
  | 'singleRecordViewQuickAction'
  | 'workflowComposerButton'
  | 'messageActionsPrimaryButton'
  | 'recapFooterButton'

/** SKButton.PresentationObject.ButtonState (Types:41-45): inactive = disabled, processing = spinner */
export type SKButtonState = 'enabled' | 'inactive' | 'processing'

export interface SKButtonProps {
  /** a string, or text with emoji; '' (or nothing) makes an icon-only button */
  title?: ReactNode
  /** Style (default .outlineDefault) */
  buttonStyle?: SKButtonStyle
  /** .default(textColor:), default primary.contentPrimary */
  textColor?: string
  /** .systemDefault(isPadded:) / .systemDanger(isPadded:): false drops the horizontal padding */
  isPadded?: boolean
  /** .custom(backgroundColor:titleColor:borderColor:) */
  customColors?: { backgroundColor: string; titleColor: string; borderColor: string }
  /** .quickAction(isSelected:); for other styles UIButton.isSelected, which shows the pressed colors and bounce */
  isSelected?: boolean
  state?: SKButtonState
  size?: SKButtonSize
  /** huddleBarButton(isLiquidGlass:) / workflowComposerButton(isLiquidGlass:) */
  isLiquidGlass?: boolean
  /** singleRecordViewQuickAction(inCompactHeight:) */
  inCompactHeight?: boolean
  /** an Icons.xcassets name (SKIconManifest), tinted like the title */
  icon?: string
  /** iconPresentationObject's colorOverride (September 2026): the icon keeps this color in every state instead of the
   *  title's (SKButton+PresentationObject.swift:18-19, SKButton.swift:452-461) */
  iconColor?: string
  iconPosition?: 'left' | 'right' | 'top'
  /** 0 = unlimited (default); the title wraps when the button is narrower than it */
  numberOfLines?: number
  /** turns off the pressed bounce */
  disableAnimations?: boolean
  /** scale the whole button (default) or only its title and icon */
  animationStyle?: 'default' | 'scaleContentOnly'
  /** buttonTapped */
  onClick?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
  'data-qa'?: string
}

/** Metrics per size: font, vertical padding, horizontal padding, radius, icon, horizontal gap (Types:249-383, PO:170-196). */
export function buttonMetrics(size: SKButtonSize, opts: { isLiquidGlass?: boolean; inCompactHeight?: boolean } = {}) {
  const g = !!opts.isLiquidGlass
  const c = !!opts.inCompactHeight
  switch (size) {
    case 'extraSmall':
      return { font: 'var(--sk-micro-bold)', v: 2, h: 4, r: 8, icon: 20, gap: 4 }
    case 'small':
      return { font: 'var(--sk-caption-bold)', v: 7, h: 9, r: 10, icon: 20, gap: 4 }
    case 'large':
      return { font: 'var(--sk-body-bold)', v: 14, h: 16, r: 14, icon: 20, gap: 8 }
    case 'xLarge':
      return { font: 'var(--sk-title)', v: 20, h: 20, r: 28, icon: 36, gap: 8 }
    case 'barButton':
      return { font: 'var(--sk-body-bold)', v: 7, h: 0, r: 0, icon: 20, gap: 0 }
    case 'toastButton':
      return { font: 'var(--sk-body)', v: 0, h: 0, r: 0, icon: 20, gap: 0 }
    case 'huddleBarButton':
      return { font: g ? 'var(--sk-small-body-bold)' : 'var(--sk-micro-bold)', v: 6, h: 8, r: 14, icon: 16, gap: 5 }
    case 'channelDetailBarButton':
      return { font: 'var(--sk-body-bold)', v: 6, h: 6, r: 0, icon: 24, gap: 5 }
    case 'singleRecordViewQuickAction':
      return { font: 'var(--sk-caption-bold)', v: c ? 7 : 20, h: 8, r: 12, icon: c ? 20 : 24, gap: c ? 6 : 8 }
    case 'workflowComposerButton':
      // smallBodyBold capped at 20 pt for Dynamic Type
      return { font: 'var(--sk-small-body-bold)', v: g ? 8 : 10, h: 12, r: g ? 18 : 12, icon: 20, gap: 10 }
    case 'messageActionsPrimaryButton':
      return { font: 'var(--sk-caption-bold)', v: 24, h: 8, r: 12, icon: 24, gap: 8 }
    case 'recapFooterButton':
      return { font: 'var(--sk-micro-bold)', v: 6, h: 8, r: 0, icon: 16, gap: 5 }
    default:
      return { font: 'var(--sk-small-body-bold)', v: 10, h: 12, r: 12, icon: 20, gap: 6 }
  }
}

const NO_BOUNCE: SKButtonStyle[] = ['default', 'systemDefault', 'systemDanger']

export function SKButton({
  title,
  buttonStyle = 'outlineDefault',
  textColor,
  isPadded = true,
  customColors,
  isSelected = false,
  state = 'enabled',
  size = 'medium',
  isLiquidGlass,
  inCompactHeight,
  icon,
  iconColor,
  iconPosition = 'left',
  numberOfLines = 0,
  disableAnimations = false,
  animationStyle = 'default',
  onClick,
  accessibilityLabel,
  className,
  style,
  ...rest
}: SKButtonProps) {
  const m = buttonMetrics(size, { isLiquidGlass, inCompactHeight })
  const hasTitle = title !== undefined && title !== null && title !== ''
  const enabled = state === 'enabled'
  const bounces = !NO_BOUNCE.includes(buttonStyle) && !disableAnimations
  const padH = (buttonStyle === 'systemDefault' || buttonStyle === 'systemDanger') && !isPadded ? 0 : m.h
  const vertical = iconPosition === 'top'
  // vertical gap 6 (8 for messageActionsPrimaryButton) (Types:361-368)
  const gap = hasTitle && icon ? (vertical ? (size === 'messageActionsPrimaryButton' ? 8 : 6) : m.gap) : 0

  const vars: Record<string, string | number> = {
    '--btn-font': m.font,
    '--btn-pad-v': `${m.v}px`,
    '--btn-pad-h': `${padH}px`,
    '--btn-radius': `${m.r}px`,
    '--btn-gap': `${gap}px`,
  }
  // A disabled title is always contentSecondary (SKButton.swift:242-251), so the given title colors apply when enabled.
  if (buttonStyle === 'default' && textColor && enabled) vars['--btn-title'] = textColor
  if (buttonStyle === 'custom' && customColors) {
    const bg = customColors.backgroundColor
    const clear = /^(transparent|clear)$/i.test(bg)
    vars['--btn-bg'] = bg
    // .custom: pressed fill is backgroundColor.darken(0.2); a clear fill stays clear (Types:181-195)
    vars['--btn-bg-pressed'] = clear ? 'transparent' : darken(bg, 0.2)
    if (enabled) vars['--btn-title'] = customColors.titleColor
    vars['--btn-border'] = customColors.borderColor
  }

  const iconEl = icon ? <Icon name={icon} size={m.icon} color={iconColor} className="sk-button__icon" /> : null
  const titleEl = hasTitle ? (
    <span
      className="sk-button__title"
      style={numberOfLines > 0 ? { WebkitLineClamp: numberOfLines, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
    >
      {title}
    </span>
  ) : null

  return (
    <button
      type="button"
      className={cx(
        'sk-button',
        `sk-button--${buttonStyle}`,
        buttonStyle === 'quickAction' && isSelected && 'sk-button--quickAction-selected',
        !enabled && 'is-disabled',
        state === 'processing' && 'is-processing',
        // UIButton.isSelected shows the pressed colors; for quickAction it's the style's own selected look instead
        isSelected && buttonStyle !== 'quickAction' && 'is-selected',
        bounces && (animationStyle === 'scaleContentOnly' ? 'sk-button--bounce-content' : 'sk-bounce'),
        className,
      )}
      style={{ ...vars, ...style } as CSSProperties}
      disabled={!enabled}
      aria-label={accessibilityLabel ?? (typeof title === 'string' && title ? undefined : icon)}
      aria-busy={state === 'processing' || undefined}
      onClick={enabled ? onClick : undefined}
      data-tap={enabled ? '' : undefined}
      data-qa={rest['data-qa']}
    >
      <span className={cx('sk-button__content', vertical && 'is-vertical')}>
        {iconPosition !== 'right' && iconEl}
        {titleEl}
        {iconPosition === 'right' && iconEl}
      </span>
      {state === 'processing' && <SKSpinner size="medium" color="darkOnLight" className="sk-button__spinner" />}
    </button>
  )
}
