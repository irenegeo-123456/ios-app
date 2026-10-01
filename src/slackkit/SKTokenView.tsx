import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { SKSpinner, type SKSpinnerColor } from './SKSpinner'
import { SKWorkspaceAvatar } from './SKWorkspaceAvatar'
import { cx, withAlpha } from './util'
import './tokens.css'

// SKTokenView (DesignerComponents/TokenView/SKTokenView.swift): a chip for a selected person, channel or workspace
// ("To:" fields, filters) or a small tag. A square ornament tile as tall as the chip, flush left with its own fill; the
// label in Lato Bold 17 with 6 / 6 pt vertical margins (2 / 2 inline), so 32.67 pt tall (24.67 inline); an optional
// share-type icon and a dismiss ✕ (44 pt target). 8 pt between items (4 inline), 8 pt padding right of the text (4),
// 8 pt left when there's no ornament; radius 8 (:54-60, :160-228, :486-560). Colors from state, tone, selection and
// disabled (:803-872). Spec: slackkit-components.md › SKTokenView.
//
//   <SKTokenView ornament={{ channel: { type: 'public' } }} text="design" />
//   <SKTokenView ornament={{ member: { src: avatar } }} text="Steve" isSelected isDismissible onDismissTapped={…} />
//   <SKTokenView state="unresolved" text="someone@acme.com" />
//   <SKTokenView ornament={{ icon: 'lists' }} text="Lists" spacing="inline" colors="uniform" />       a tag

/** Ornament (:710-718) */
export type SKTokenOrnament =
  | { member: { src?: string; icon?: string; appliesInnerCornerRadius?: boolean } }
  | { channel: { type?: 'public' | 'private' | 'archived'; shareType?: 'none' | 'enterprise' | 'external' } }
  /** September 2026: an SKWorkspaceAvatar, size small (24), centered in the tile, so a missing image shows the initials and
   *  GovSlack its badge (SKTokenView.swift:375-385; June drew the bare image filling the tile) */
  | { workspace: { src?: string; name?: string; variant?: 'default' | 'govSlack'; /** @deprecated June only */ appliesInnerCornerRadius?: boolean } }
  | { image: { src: string; appliesInnerCornerRadius?: boolean } }
  | { icon: string }
  /** the multi-person DM icon for 2–15 members, else a square (:405-440) */
  | { number: number }
  | { spinner: SKSpinnerColor }
  | 'none'

/** Colors (:746-800): the token fill, the ornament tile, text, icons */
export interface SKTokenColors {
  tokenBackgroundColor: string
  ornamentBackgroundColor?: string
  textColor: string
  iconColor: string
}

export interface SKTokenViewProps {
  /** resolved (default), unresolved (a spinner ornament) or error (an info ornament) */
  state?: 'resolved' | 'unresolved' | 'error'
  /** the resolved ornament */
  ornament?: SKTokenOrnament
  /** the resolved tone; custom colors fade to 20 % when selected */
  tone?: 'default' | 'warning' | { tokenBackgroundColor: string; ornamentBackgroundColor?: string; textColor?: string; iconColor?: string }
  text?: ReactNode
  isSelected?: boolean
  isDisabled?: boolean
  isDismissible?: boolean
  /** trailingAccessoryIcon (September 2026): a trailing icon (e.g. a dropdown chevron) that takes the place of the
   *  channel's share-type accessory; independent of the dismiss ✕ (:425-430, :652-655) */
  trailingAccessoryIcon?: string
  /** avatar (default) or inline (tighter, for tags) */
  spacing?: 'avatar' | 'inline'
  /** overrides the state's colors; 'uniform' = the default colors with no ornament fill (Colors.uniform()) */
  colors?: SKTokenColors | 'uniform'
  /** the label's font (SKTokenBar styling: bodyBold emphasized, body light) */
  font?: string
  /** isTapEnabled: viewTapped */
  onViewTapped?: () => void
  onDismissTapped?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

const P = 'var(--dt_color_content_primary)'
const INV = 'var(--dt_color_content_inverse_primary)'

/** Colors(state:isSelected:isDisabled:) (:803-872) */
export function tokenColors(state: SKTokenViewProps['state'] = 'resolved', tone: SKTokenViewProps['tone'] = 'default', isSelected = false, isDisabled = false): SKTokenColors {
  if (state === 'resolved' && isDisabled)
    return { tokenBackgroundColor: 'var(--dt_color_base_tertiary)', ornamentBackgroundColor: 'var(--dt_color_surface_primary)', textColor: 'var(--dt_color_content_tertiary)', iconColor: 'var(--dt_color_content_tertiary)' }
  if (state === 'error')
    return isSelected
      ? { tokenBackgroundColor: 'var(--dt_color_base_inverse_important)', ornamentBackgroundColor: 'var(--dt_color_surface_important)', textColor: INV, iconColor: INV }
      : { tokenBackgroundColor: 'var(--dt_color_base_important)', ornamentBackgroundColor: 'var(--dt_color_surface_important)', textColor: P, iconColor: 'var(--dt_color_content_important)' }
  if (state === 'unresolved')
    return isSelected
      ? { tokenBackgroundColor: 'var(--dt_color_base_inverse_primary)', ornamentBackgroundColor: 'var(--dt_color_surface_primary)', textColor: INV, iconColor: INV }
      : { tokenBackgroundColor: 'var(--dt_color_base_tertiary)', ornamentBackgroundColor: 'var(--dt_color_surface_primary)', textColor: P, iconColor: P }
  if (tone === 'warning')
    return isSelected
      ? { tokenBackgroundColor: 'var(--dt_color_base_inverse_highlight_3)', ornamentBackgroundColor: 'var(--dt_color_surface_primary)', textColor: P, iconColor: P }
      : { tokenBackgroundColor: 'var(--dt_color_base_highlight_3)', ornamentBackgroundColor: 'var(--dt_color_surface_highlight_3)', textColor: P, iconColor: P }
  if (typeof tone === 'object') {
    const t = { textColor: P, iconColor: P, ...tone }
    const a = (c?: string) => (c && isSelected ? withAlpha(c, 0.2) : c)
    return { tokenBackgroundColor: a(t.tokenBackgroundColor)!, ornamentBackgroundColor: a(t.ornamentBackgroundColor), textColor: a(t.textColor)!, iconColor: a(t.iconColor)! }
  }
  return isSelected
    ? { tokenBackgroundColor: 'var(--dt_color_base_inverse_highlight_1)', ornamentBackgroundColor: 'var(--dt_color_surface_highlight_1)', textColor: INV, iconColor: INV }
    : { tokenBackgroundColor: 'var(--dt_color_base_highlight_1)', ornamentBackgroundColor: 'var(--dt_color_surface_highlight_1)', textColor: P, iconColor: P }
}

const CHANNEL_ICONS = { public: 'channel', private: 'lock_filled', archived: 'archive_filled' } as const
const SHARE_ICONS = { none: null, enterprise: 'org_shared_channel', external: 'shared_channel_filled' } as const

export function SKTokenView({
  state = 'resolved',
  ornament = 'none',
  tone = 'default',
  text,
  isSelected = false,
  isDisabled = false,
  isDismissible = false,
  trailingAccessoryIcon,
  spacing = 'avatar',
  colors,
  font,
  onViewTapped,
  onDismissTapped,
  accessibilityLabel,
  className,
  style,
}: SKTokenViewProps) {
  const c: SKTokenColors = colors === 'uniform' ? { ...tokenColors('resolved', 'default', false, false), ornamentBackgroundColor: 'transparent' } : (colors ?? tokenColors(state, tone, isSelected, isDisabled))
  // unresolved shows a spinner (lightOnDark when selected), error an info icon (:606-613)
  const orn: SKTokenOrnament = state === 'unresolved' ? { spinner: isSelected ? 'lightOnDark' : 'darkOnLight' } : state === 'error' ? { icon: 'info' } : ornament
  const inline = spacing === 'inline'
  const hasText = text !== undefined && text !== null && text !== ''
  const hasOrnament = orn !== 'none'
  const iconInset = inline ? 2 : 6
  let tile: ReactNode = null
  let pad = 0
  if (orn !== 'none') {
    if ('channel' in orn) tile = <Icon name={CHANNEL_ICONS[orn.channel.type ?? 'public']} size={20} color={c.iconColor} />
    else if ('icon' in orn) tile = <Icon name={orn.icon} size={20} color={c.iconColor} />
    else if ('number' in orn)
      tile = <Icon name={orn.number >= 2 && orn.number <= 15 ? `multiparty_dm_${orn.number}_filled` : 'square'} size={20} color={c.iconColor} />
    else if ('spinner' in orn) tile = <SKSpinner size="medium" color={orn.spinner} />
    else if ('workspace' in orn) tile = <SKWorkspaceAvatar size="small" src={orn.workspace.src} name={orn.workspace.name ?? ''} workspaceVariant={orn.workspace.variant} />
    else {
      const img = 'member' in orn ? orn.member : orn.image
      if ('member' in orn && orn.member.icon && !orn.member.src) tile = <Icon name={orn.member.icon} size={20} color={c.iconColor} />
      else if (img.src) tile = <img className="sk-token__image" src={asset(img.src)} alt="" draggable={false} style={{ borderRadius: img.appliesInnerCornerRadius ? 6 : 0 }} />
    }
    pad = typeof orn === 'object' && 'spinner' in orn ? iconInset + 1 : iconInset
  }
  // an explicit trailing icon wins over the channel-derived accessory (:425-430)
  const accessory = trailingAccessoryIcon ?? (orn !== 'none' && 'channel' in orn ? SHARE_ICONS[orn.channel.shareType ?? 'none'] : null)
  const tappable = !!onViewTapped
  return (
    <span
      className={cx('sk-token', inline && 'is-inline', !hasText && 'no-text', tappable && 'is-tappable', className)}
      style={
        {
          '--tk-bg': c.tokenBackgroundColor,
          '--tk-ornament-bg': c.ornamentBackgroundColor ?? 'transparent',
          '--tk-text': c.textColor,
          '--tk-icon': c.iconColor,
          '--tk-pad': `${pad}px`,
          paddingLeft: hasOrnament ? 0 : inline ? 4 : 8,
          paddingRight: hasText ? (inline ? 4 : 8) : 0,
          ...style,
        } as CSSProperties
      }
      role={tappable ? 'button' : undefined}
      aria-label={accessibilityLabel}
      onClick={onViewTapped}
      data-tap={tappable ? '' : undefined}
    >
      {hasOrnament && <span className={cx('sk-token__ornament', !hasText && 'is-alone')}>{tile}</span>}
      {hasText && (
        <span className="sk-token__text" style={font ? { font } : undefined}>
          {text}
        </span>
      )}
      {accessory && <Icon name={accessory} size={20} color={c.iconColor} className="sk-token__accessory" />}
      {isDismissible && (
        <button
          type="button"
          className="sk-token__dismiss"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation()
            onDismissTapped?.()
          }}
        >
          <Icon name="close" size={20} color={c.iconColor} />
        </button>
      )}
    </span>
  )
}
