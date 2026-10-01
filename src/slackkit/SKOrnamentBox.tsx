import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { SKEmoji } from './SKEmoji'
import { asset } from '../lib/asset'
import { SKBadge } from './SKBadge'
import { SKGroupAvatar } from './SKGroupAvatar'
import { SKMemberAvatar, type Presence } from './SKMemberAvatar'
import { SKSpinner, type SKSpinnerColor, type SKSpinnerSize } from './SKSpinner'
import { cx, proportionalRadius } from './util'
import rainbowBorder from './assets/rainbow_stories_border.png'
import './ornaments.css'

// SKOrnamentBox (DesignerComponents/OrnamentBox/SKOrnamentBox.swift): the square or circular tile that holds one
// leading ornament for rows and chips (an icon, emoji, image, "/" glyph, badge, member avatar, spinner or placeholder),
// centered. Sides 16…120; radius min(20, 0.25 × side) or a circle; background primary.surfacePrimary from medium up
// (none at tiny / verySmall / small unless forced) (:106-127, :243-256, :455-612). A badge ornament takes the badge's
// own size. Spec: slackkit-components.md › SKOrnamentBox.
//
//   <SKOrnamentBox ornament={{ icon: 'channel' }} size="large" />
//   <SKOrnamentBox ornament={{ emoji: 'tada' }} size="medium" shape="circle" />
//   <SKOrnamentBox ornament={{ badge: { title: 'PRO' } }} size="verySmall" />

/** SKOrnamentBox.PresentationObject.Size side lengths (:560-590) */
export const ORNAMENT_SIZES = { tiny: 16, verySmall: 20, small: 24, medium: 32, large: 36, extraLarge: 56, jumbo: 120 } as const
export type SKOrnamentBoxSize = keyof typeof ORNAMENT_SIZES

/** OrnamentType (:543-552) */
export type SKOrnament =
  | { icon: string; color?: string; highlighted?: { icon?: string; color?: string } }
  | { emoji: string }
  | { image: string }
  | { slashCommand: true; color?: string; highlightedColor?: string }
  | { badge: Parameters<typeof SKBadge>[0] }
  | { memberAvatar: { name: string; src?: string; presence?: Presence } }
  /** groupAvatar(memberCount:) (September 2026, SKOrnamentBox.swift:601-604): an mpdm's member count in SKGroupAvatar's
   *  count square, for the small sizes (verySmall 20, small 24), clipped to the box (:395-413) */
  | { groupAvatar: { memberCount: number } }
  | { spinner: { size?: SKSpinnerSize; color?: SKSpinnerColor } }
  | { placeholder: true }

interface Props {
  ornament: SKOrnament
  size: SKOrnamentBoxSize
  shape?: 'roundedRectangle' | 'circle'
  /** Style.backgroundColor (default primary.surfacePrimary) */
  backgroundColor?: string
  /** Style.iconAlpha, applied to icon and "/" ornaments */
  iconAlpha?: number
  /** Style.forceBackgroundStyle: draw the background at tiny / verySmall / small too */
  forceBackgroundStyle?: boolean
  /** Border: none, rainbow (the rainbow_stories_border image), or a 1 pt color */
  border?: 'none' | 'rainbow' | { color: string }
  /** shows the icon / slash command's highlighted variant (the parent row is pressed) */
  isHighlighted?: boolean
  /** isInteractionEnabled: a tap fires `tapped` */
  onTapped?: () => void
  className?: string
  style?: CSSProperties
}

export function SKOrnamentBox({
  ornament,
  size,
  shape = 'roundedRectangle',
  backgroundColor,
  iconAlpha = 1,
  forceBackgroundStyle = false,
  border = 'none',
  isHighlighted = false,
  onTapped,
  className,
  style,
}: Props) {
  const side = ORNAMENT_SIZES[size]
  const small = side <= 24
  const bg = small && !forceBackgroundStyle ? 'transparent' : (backgroundColor ?? 'var(--dt_color_surface_primary)')
  const radius = shape === 'circle' ? side / 2 : proportionalRadius(side)
  // Icons and emoji are 20 pt (SKIcon / SKEmoji intrinsic), squeezed to fit smaller boxes.
  const glyph = Math.min(20, side)
  let content
  if ('badge' in ornament) {
    return <SKBadge {...ornament.badge} className={cx(ornament.badge.className, className)} />
  } else if ('icon' in ornament) {
    const hi = isHighlighted ? ornament.highlighted : undefined
    content = <Icon name={hi?.icon ?? ornament.icon} size={glyph} color={hi?.color ?? ornament.color ?? 'var(--dt_color_content_primary)'} style={{ opacity: iconAlpha }} />
  } else if ('emoji' in ornament) {
    content = <SKEmoji name={ornament.emoji} size={glyph} />
  } else if ('image' in ornament) {
    content = <img className="sk-ornament__image" src={asset(ornament.image)} alt="" draggable={false} />
  } else if ('slashCommand' in ornament) {
    // "/" in the slack-icons font at the box height (:149-156, :326-329); drawn with the "slash" icon here
    content = <Icon name="slash" size={side * 0.7} color={(isHighlighted && ornament.highlightedColor) || ornament.color || 'var(--dt_color_content_primary)'} style={{ opacity: iconAlpha }} />
  } else if ('memberAvatar' in ornament) {
    content = <SKMemberAvatar name={ornament.memberAvatar.name} src={ornament.memberAvatar.src} presence={ornament.memberAvatar.presence} size={side} />
  } else if ('groupAvatar' in ornament) {
    content = <SKGroupAvatar count={ornament.groupAvatar.memberCount} size={size === 'verySmall' ? 'verySmall' : 'small'} />
  } else if ('spinner' in ornament) {
    content = <SKSpinner size={ornament.spinner.size} color={ornament.spinner.color} />
  } else {
    content = null
  }
  const hasColorBorder = typeof border === 'object'
  return (
    <span
      className={cx('sk-ornament', 'image' in ornament && 'has-image', 'memberAvatar' in ornament && 'has-avatar', 'groupAvatar' in ornament && 'has-group', onTapped && 'is-interactive', className)}
      style={{
        width: side,
        height: side,
        borderRadius: radius,
        background: 'memberAvatar' in ornament ? 'transparent' : bg,
        boxShadow: hasColorBorder ? `inset 0 0 0 1px ${border.color}` : undefined,
        ...style,
      }}
      onClick={onTapped}
      role={onTapped ? 'button' : undefined}
      data-tap={onTapped ? '' : undefined}
    >
      {content}
      {border === 'rainbow' && <img className="sk-ornament__rainbow" src={rainbowBorder} alt="" draggable={false} />}
    </span>
  )
}
