import type { CSSProperties, ReactNode } from 'react'
import { SKButton, type SKButtonProps } from './SKButton'
import { SKOrnamentBox, type SKOrnament } from './SKOrnamentBox'
import { SKListRowAccessoryStack, type SKListCellAccessory } from './SKListCellAccessory'
import { cx } from './util'
import './banner.css'

// SKBanner (DesignerComponents/Banner/SKBanner.swift, Banner.swift): an inline alert card. A leading ornament (the
// tone's icon in an SKOrnamentBox, 20 pt regular / 16 pt small), then a heading (regular only, Lato Bold 17, 4 pt above
// the body), the body (Lato 17 / 13) and an optional action button 12 pt below; trailing accessories. Padding 16/12
// (regular) or 12/8 (small), 12 / 8 pt between the columns, radius 12 / 10, a 1 pt outline per tone (dark mode only
// for trials and coachmark). Selectable banners dim to alpha 0.6 while pressed (Banner.swift:41-47, :150-437;
// SKBanner.swift:108-395). Spec: slackkit-components.md › SKBanner (colors per tone).
//
//   <SKBanner type="regular" tone="info" text="All of the alert text goes here." />
//   <SKBanner type="regular" tone="genericLight" heading="Your alert heading" text="All of the alert text goes here." />
//   <SKBanner type="small" tone="coachmark" text="…" actionButton={{ title: 'Action' }} />
//   <SKBanner type="regular" tone="info" text="…" accessories={['chevron']} isSelectable onSelected={…} />

export type SKBannerTone =
  | 'genericLight'
  | 'genericDark'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'trials'
  | 'trials_new'
  | 'business_trial'
  | 'pro'
  | 'coachmark'
  | 'custom'

/** Tone.CustomToneProperties (SKBanner.swift:184-199) */
export interface SKBannerCustomTone {
  backgroundColor: string
  textColor: string
  ornamentColor: string
  /** OutlineColor(light:dark:); no light color means no outline in light mode */
  outlineColor?: { light?: string; dark: string }
}

/** Ornament (SKBanner.swift:372-388) */
export type SKBannerOrnament =
  | 'default'
  | 'hidden'
  | { icon: string; color?: string; backgroundCircle?: { color?: string } }
  | { emoji: string; backgroundCircle?: { color?: string } }
  | { image: string }
  | { badge: string; textColor?: string; backgroundColor?: string; shape?: 'pill' | 'roundedRectangle' }

/** The tone's default ornament (SKBanner.swift:317-342) */
export const BANNER_TONE_ICONS: Record<SKBannerTone, string> = {
  genericLight: 'slack_logo',
  genericDark: 'slack_logo',
  info: 'info_filled',
  success: 'check_circle_filled',
  warning: 'warning_filled',
  error: 'warning_filled',
  trials: 'sparkles_filled',
  trials_new: 'sparkles_filled',
  business_trial: 'rocket',
  pro: 'rocket',
  coachmark: 'slack_logo',
  custom: 'sparkles_filled',
}

interface Props {
  type: 'regular' | 'small'
  tone: SKBannerTone
  customTone?: SKBannerCustomTone
  /** the body (links allowed) */
  text: ReactNode
  /** regular only; hidden for small (Banner.swift:170-179) */
  heading?: ReactNode
  ornament?: SKBannerOrnament
  accessories?: SKListCellAccessory[]
  /** an SKButton below the text */
  actionButton?: SKButtonProps
  /** opaque: the tone's base; transparent: the tone's surface */
  backgroundStyle?: 'opaque' | 'transparent'
  /** the whole banner is tappable (`selected`) */
  isSelectable?: boolean
  onSelected?: () => void
  onActionButtonTapped?: () => void
  className?: string
  style?: CSSProperties
}

export function SKBanner({
  type,
  tone,
  customTone,
  text,
  heading,
  ornament = 'default',
  accessories = [],
  actionButton,
  backgroundStyle = 'opaque',
  isSelectable = false,
  onSelected,
  onActionButtonTapped,
  className,
  style,
}: Props) {
  const regular = type === 'regular'
  const vars: Record<string, string> = {}
  if (tone === 'custom' && customTone) {
    vars['--bn-bg'] = customTone.backgroundColor
    vars['--bn-text'] = customTone.textColor
    vars['--bn-ornament'] = customTone.ornamentColor
    vars['--bn-outline-light'] = customTone.outlineColor?.light ?? 'transparent'
    vars['--bn-outline-dark'] = customTone.outlineColor?.dark ?? 'transparent'
  }
  const box = orn(ornament, tone, regular)
  return (
    <div
      className={cx('sk-banner', `sk-banner--${type}`, `sk-banner--${tone}`, backgroundStyle === 'transparent' && 'is-transparent', isSelectable && 'is-selectable', className)}
      style={{ ...vars, ...style } as CSSProperties}
      role={isSelectable ? 'button' : 'status'}
      onClick={isSelectable ? onSelected : undefined}
      data-tap={isSelectable ? '' : undefined}
    >
      {box}
      <div className="sk-banner__content">
        {regular && heading !== undefined && heading !== null && <div className="sk-banner__heading">{heading}</div>}
        <div className="sk-banner__text">{text}</div>
        {actionButton && (
          <div className="sk-banner__action" onClick={(e) => e.stopPropagation()}>
            <SKButton
              {...actionButton}
              onClick={() => {
                actionButton.onClick?.()
                onActionButtonTapped?.()
              }}
            />
          </div>
        )}
      </div>
      {accessories.length > 0 && <SKListRowAccessoryStack accessories={accessories} className="sk-banner__accessories" />}
    </div>
  )
}

function orn(ornament: SKBannerOrnament, tone: SKBannerTone, regular: boolean) {
  if (ornament === 'hidden') return null
  const size = regular ? 'verySmall' : 'tiny'
  const color = 'var(--bn-ornament)'
  if (ornament === 'default') return <SKOrnamentBox className="sk-banner__ornament" size={size} ornament={{ icon: BANNER_TONE_ICONS[tone], color }} />
  if ('badge' in ornament)
    return (
      <SKOrnamentBox
        className="sk-banner__ornament"
        size={size}
        ornament={{
          badge: {
            title: ornament.badge,
            badgeStyle: 'text',
            textColor: ornament.textColor ?? 'var(--bn-text)',
            backgroundColor: ornament.backgroundColor ?? 'var(--bn-ornament)',
            shape: ornament.shape ?? 'pill',
          },
        }}
      />
    )
  if ('image' in ornament) return <SKOrnamentBox className="sk-banner__ornament sk-banner__ornament--image" size={size} ornament={{ image: ornament.image }} />
  const inner: SKOrnament = 'icon' in ornament ? { icon: ornament.icon, color: ornament.color ?? color } : { emoji: ornament.emoji }
  // With a background circle the ornament grows to a 32 pt circle (Banner.swift:312-343)
  if (ornament.backgroundCircle)
    return <SKOrnamentBox className="sk-banner__ornament" size="medium" shape="circle" backgroundColor={ornament.backgroundCircle.color ?? color} ornament={inner} />
  return <SKOrnamentBox className="sk-banner__ornament" size={size} ornament={inner} />
}
