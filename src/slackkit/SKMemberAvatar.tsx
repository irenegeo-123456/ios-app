import { useState, type CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { cx, ellipsePath, roundRectToScreenScale, svgMask, svgMaskSubtract } from './util'
import { useLinearGrayscale } from './grayscale'

// SKMemberAvatar (DesignerComponents/MemberAvatar/SKMemberAvatar.swift): a person's rounded-square photo, initials or
// icon, with an annotation at the bottom-right in a cut-out: a presence dot, a single-channel-guest triangle, a
// multi-channel-guest square, an external member's workspace icon, a small icon, or an external member's presence.
// Radius min(20, 0.25 × side) (or a circle); with an annotation the bottom-right corner is square, except that a round
// (concentric) avatar with presence stays a circle and centers the presence icon and its cut-out on its edge
// (September 2026). Annotations show from small (24) to jumbo (120). Initials in SKFont.body on the image placeholder (baseTertiary); deactivated members
// are desaturated. Geometry :87-144, :222-452; configure :456-565. Spec: slackkit-components.md › SKMemberAvatar.
//
//   <SKMemberAvatar src={u.avatar} name={u.name} size="large" presence="active" />
//   <SKMemberAvatar src={u.avatar} name={u.name} size="extraLarge" avatarType={{ externalMember: org.icon }} />
//   <SKMemberAvatar name="Steve Jobs" size="large" />                        initials "SJ"
//   <SKMemberAvatar icon="user_hide" name="Hidden" size="small" presence="active" />

/** Size side lengths (:885-918) */
export const AVATAR_SIZES = { tiny: 16, verySmall: 20, small: 24, smallPlus: 28, medium: 32, large: 36, extraLarge: 56, jumbo: 120, presentation: 150, profile: 256 } as const
export type AvatarSize = keyof typeof AVATAR_SIZES

/**
 * Presence (:668-839): online (active) / offline (away), each optionally DND, for full members, ultra-restricted
 * (single-channel) guests (`ura-`) and restricted or external members (`external-`); slackbot draws a heart.
 */
export type Presence =
  | 'active'
  | 'away'
  | 'dnd-active'
  | 'dnd-away'
  | 'slackbot'
  | 'ura-active'
  | 'ura-away'
  | 'ura-dnd-active'
  | 'ura-dnd-away'
  | 'external-active'
  | 'external-away'
  | 'external-dnd-active'
  | 'external-dnd-away'
  | 'none'

/** Presence.icon (:776-806) */
const PRESENCE_ICONS: Record<Exclude<Presence, 'none'>, string> = {
  active: 'status_member_filled',
  'dnd-active': 'status_member_dnd_filled',
  away: 'status_member',
  'dnd-away': 'status_member_dnd',
  slackbot: 'heart_filled',
  'ura-active': 'status_single_channel_guest_filled',
  'ura-dnd-active': 'status_single_channel_guest_dnd_filled',
  'ura-away': 'status_single_channel_guest',
  'ura-dnd-away': 'status_single_channel_guest_dnd',
  'external-active': 'status_guest_filled',
  'external-dnd-active': 'status_guest_dnd_filled',
  'external-away': 'status_guest',
  'external-dnd-away': 'status_guest_dnd',
}

/**
 * Presence(isActive:isDnd:isRestricted:isUltraRestricted:isExternal:isInvited:isSlackbot:isSlackSecurity:
 * isChannelExpert:) (:711-748): invited reads offline, Slackbot and Slack Security get the heart, channel experts are
 * always online.
 */
export function memberPresence(m: {
  isActive: boolean
  isDnd?: boolean
  isRestricted?: boolean
  isUltraRestricted?: boolean
  isExternal?: boolean
  isInvited?: boolean
  isSlackbot?: boolean
  isSlackSecurity?: boolean
  isChannelExpert?: boolean
}): Presence {
  if (m.isInvited) return 'away'
  if (m.isSlackbot || m.isSlackSecurity) return 'slackbot'
  if (m.isChannelExpert) return 'active'
  const kind = m.isUltraRestricted ? 'ura-' : m.isRestricted || m.isExternal ? 'external-' : ''
  return `${kind}${m.isDnd ? 'dnd-' : ''}${m.isActive ? 'active' : 'away'}` as Presence
}

/**
 * AvatarType (:639-666). `member` with a `presence` is memberWithPresence; `externalMemberWithPresence` also takes
 * `presence`.
 */
export type SKMemberAvatarType =
  | 'member'
  | 'singleChannelGuest'
  | 'multiChannelGuest'
  | { externalMember: string }
  | { memberWithIcon: { icon: string; color?: string } }
  | 'externalMemberWithPresence'

interface Props {
  /** avatarSource .image */
  src?: string
  /** avatarSource .icon: an icon tinted contentPrimary on the placeholder (used when there's no src) */
  icon?: string
  /** memberName: the initials (with no src or icon) and the VoiceOver label */
  name: string
  size?: AvatarSize | number
  avatarType?: SKMemberAvatarType
  presence?: Presence
  /** Presence.Colors (ListThemeOptions on Home: active = theme.baseInverseHighlight2) */
  activeColor?: string
  awayColor?: string
  /** shouldMakeConcentric: a circle */
  round?: boolean
  /** shouldRoundCorners: false gives square corners */
  shouldRoundCorners?: boolean
  /** the initials' background (default: the image placeholder, primary.baseTertiary) */
  fallbackBackgroundColor?: string
  /** a grayscale image (CIColorControls saturation 0) */
  isDeactivated?: boolean
  /** isInteractionEnabled: the avatar is a button firing `tapped` */
  onTapped?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

/** "Steve Jobs" → "SJ": the first letter of the first two words, uppercased (WorkspaceAvatarTitleHelpers.swift:16-28) */
export function initialsOf(name: string) {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  const words = Segmenter
    ? [...new Segmenter(undefined, { granularity: 'word' }).segment(name)].filter((s) => s.isWordLike).map((s) => s.segment)
    : name.split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => [...w][0]!)
    .join('')
    .toUpperCase()
}

/** The presence cut-out and icon box (presenceCutoutPath :391-405, layout :237-244). */
export function presenceGeometry(side: number, scale = 1) {
  const pcs = 10 + 0.1 * side
  const cutoutR = (1.1 * pcs) / 2
  const center = side - cutoutR + pcs / 3
  const box = 1.4 * scale * pcs
  return { pcs, cutoutR, center, box, origin: side - box + 0.48 * pcs }
}

/** Size.iconSize (:947-971) for the icon avatar source */
const iconSizeFor = (side: number) => (side <= 16 ? 14 : side <= 20 ? 18 : side >= 256 ? 50 : 20)

export function SKMemberAvatar({
  src,
  icon,
  name,
  size = 'large',
  avatarType = 'member',
  presence = 'none',
  activeColor,
  awayColor,
  round = false,
  shouldRoundCorners = true,
  fallbackBackgroundColor,
  isDeactivated = false,
  onTapped,
  accessibilityLabel,
  className,
  style,
}: Props) {
  const W = typeof size === 'number' ? size : AVATAR_SIZES[size]
  const [failed, setFailed] = useState(false)
  const gray = useLinearGrayscale()
  const radius = !shouldRoundCorners ? 0 : round ? W / 2 : Math.min(20, 0.25 * W)
  // shouldShowUserTypeAnnotation: small … jumbo (:973-988)
  const annotates = W >= 24 && W <= 120
  const type = avatarType === 'member' && presence !== 'none' ? 'memberWithPresence' : avatarType
  const withPresence = (type === 'memberWithPresence' || type === 'externalMemberWithPresence') && presence !== 'none'
  const annotated = annotates && type !== 'member' && (withPresence || (type !== 'memberWithPresence' && type !== 'externalMemberWithPresence'))
  const scale = presence === 'slackbot' ? 0.75 : 1
  const gap = 2 + 0.015 * W // annotationGapWidth
  const guest = 6 + 0.05 * W // guestCutoutSideLength
  const m = 10 + 0.15 * W // memberCutoutSideLength
  const g = presenceGeometry(W, scale)
  // isCircular (September 2026, SKMemberAvatar.swift:92-96, cornersToMask :368-376): a concentric avatar with presence
  // keeps its circle; the icon and a 1.1 × presence-side cut-out circle share their center where the edge crosses the
  // bottom-right diagonal, half outside it (presenceIconFrame :135-147, presenceCutoutPath :415-422,
  // AvatarAnnotationGeometry.swift concentricAnnotationFrame / edgeCenter)
  const circular = round && type === 'memberWithPresence'
  const edge = W / 2 + ((W / 2) * Math.SQRT2) / 2

  let cutout = ''
  let annotation = null
  if (annotated) {
    if (withPresence) {
      if (type === 'externalMemberWithPresence') {
        // a square cut-out 0.75 × the presence side, its top-left rounded by a third (:407-426)
        const s = 0.75 * g.pcs
        const q = roundRectToScreenScale(W - s, W - s, s, s)
        const r = s / 3
        cutout = `M${q.x} ${q.y + q.h}V${q.y + r}A${r} ${r} 0 0 1 ${q.x + r} ${q.y}H${q.x + q.w}V${q.y + q.h}Z`
      } else if (circular) {
        cutout = ellipsePath(edge - g.cutoutR, edge - g.cutoutR, 2 * g.cutoutR, 2 * g.cutoutR)
      } else {
        const R = g.cutoutR
        cutout = `M${g.center - R} ${g.center}A${R} ${R} 0 1 0 ${g.center + R} ${g.center}A${R} ${R} 0 1 0 ${g.center - R} ${g.center}Z`
      }
      const away = presence.endsWith('away')
      const color = away ? (awayColor ?? 'var(--dt_color_content_tertiary)') : (activeColor ?? 'var(--dt_color_content_highlight_2)')
      const f = circular ? roundRectToScreenScale(edge - g.box / 2, edge - g.box / 2, g.box, g.box) : roundRectToScreenScale(g.origin, g.origin, g.box, g.box)
      annotation = (
        <Icon name={PRESENCE_ICONS[presence as Exclude<Presence, 'none'>]} size={f.w} color={color} className="sk-avatar__presence" style={{ left: f.x, top: f.y }} />
      )
    } else if (type === 'singleChannelGuest') {
      // a triangle cut-out with legs 6 + 0.05 W, and a contentTertiary triangle `gap` smaller in it (:357-365, :430-437)
      cutout = `M${W - guest} ${W}L${W} ${W - guest}L${W} ${W}Z`
      const l = guest - gap
      annotation = (
        <svg className="sk-avatar__guest" width={W} height={W} viewBox={`0 0 ${W} ${W}`} aria-hidden>
          <path d={`M${W - l} ${W}L${W} ${W - l}L${W} ${W}Z`} />
        </svg>
      )
    } else if (type === 'multiChannelGuest') {
      // a square cut-out, top-left radius 0.33 × side, and a rounded contentTertiary square `gap` smaller (:367-371, :439-452)
      const q = roundRectToScreenScale(W - guest, W - guest, guest, guest)
      const r = 0.33 * guest
      cutout = `M${q.x} ${q.y + q.h}V${q.y + r}A${r} ${r} 0 0 1 ${q.x + r} ${q.y}H${q.x + q.w}V${q.y + q.h}Z`
      const s = guest - gap
      const k = roundRectToScreenScale(W - s, W - s, s, s)
      annotation = (
        <svg className="sk-avatar__guest" width={W} height={W} viewBox={`0 0 ${W} ${W}`} aria-hidden>
          <rect x={k.x} y={k.y} width={k.w} height={k.h} rx={(r / 2) * (s / guest)} />
        </svg>
      )
    } else if (typeof type === 'object') {
      // external member / member with icon: a (10 + 0.15 W) tile at W − side + gap, radius side / 4, in a cut-out whose
      // top-left corner is a quadratic curve (memberSquareCutoutPath :373-389, layout :246-285)
      const adj = m - 4 // memberCutoutOverhangLength
      const x0 = W - adj - gap
      const r = m / 3
      cutout = `M${x0} ${W}L${x0} ${W - adj + r}Q${x0} ${x0} ${x0 + r} ${x0}L${W} ${x0}L${W} ${W}Z`
      const f = roundRectToScreenScale(W - m + gap, W - m + gap, m, m)
      const box: CSSProperties = { left: f.x, top: f.y, width: f.w, height: f.h, borderRadius: m / 4 }
      annotation =
        'externalMember' in type ? (
          <span className="sk-avatar__workspace" style={box}>
            <img src={asset(type.externalMember)} alt="" draggable={false} />
          </span>
        ) : (
          <span className="sk-avatar__icon-annotation" style={box}>
            <Icon name={type.memberWithIcon.icon} size={f.w} color={type.memberWithIcon.color ?? 'var(--dt_color_content_primary)'} />
          </span>
        )
    }
  }

  // memberPath: the rounded rect (bottom-right square when annotated) minus the cut-out (:87-90, :363-377); a circular
  // avatar's cut-out reaches past it, so it's subtracted rather than appended (AvatarAnnotationGeometry.carve, :312)
  const r = radius
  const body = !annotated
    ? ''
    : circular
      ? ellipsePath(0, 0, W, W)
      : `M${r} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V${W}H${r}A${r} ${r} 0 0 1 0 ${W - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
  const mask = !annotated ? undefined : circular ? svgMaskSubtract(W, W, body, cutout) : svgMask(W, W, body + cutout)
  const showImage = !!src && !failed
  const label =
    accessibilityLabel ??
    `${
      type === 'singleChannelGuest'
        ? 'Single-channel guest'
        : type === 'multiChannelGuest'
          ? 'Multi-channel guest'
          : typeof type === 'object' && 'externalMember' in type
            ? 'External member'
            : name || 'Member'
    }: Avatar`
  return (
    <span
      className={cx('sk-avatar', onTapped && 'is-interactive', className)}
      style={{ width: W, height: W, ...style }}
      role={onTapped ? 'button' : 'img'}
      aria-label={label}
      onClick={onTapped}
      data-tap={onTapped ? '' : undefined}
    >
      <span
        className="sk-avatar__image"
        style={{
          borderRadius: annotated ? 0 : r,
          WebkitMaskImage: mask,
          maskImage: mask,
          background: !showImage && !icon && fallbackBackgroundColor ? fallbackBackgroundColor : undefined,
          // ImageTransformation.grayscale, CIColorControls saturation 0 in linear light (:317)
          filter: isDeactivated && showImage ? gray.filter : undefined,
        }}
      >
        {showImage ? (
          <img src={asset(src)} alt="" draggable={false} onError={() => setFailed(true)} />
        ) : icon ? (
          <Icon name={icon} size={iconSizeFor(W) * scale} color="var(--dt_color_content_primary)" />
        ) : (
          <span className="sk-avatar__initials">{initialsOf(name)}</span>
        )}
      </span>
      {annotation}
      {isDeactivated && showImage && gray.def}
    </span>
  )
}
