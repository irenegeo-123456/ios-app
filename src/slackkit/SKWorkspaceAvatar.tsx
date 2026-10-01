import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { SKBadge } from './SKBadge'
import { AVATAR_SIZES, initialsOf, type AvatarSize } from './SKMemberAvatar'
import { cx, ellipsePath, roundRectToScreenScale, svgMaskSubtract } from './util'
import govSlackVariant from './assets/gov_slack_variant.svg'

// SKWorkspaceAvatar (DesignerComponents/WorkspaceAvatar/SKWorkspaceAvatar.swift): a workspace icon, or its initials in
// SKFont.title (Lato Black 22) on the image placeholder, radius min(20, 0.25 × side) or a circle, with a 1 px
// outlineTertiary hairline under the image. Types: a mention-count SKBadge (a dot at medium), an unreads dot, a lock
// for pending authentication (each in a cut-out at the top-right, which squares that corner; smallPlus and up), or an
// "active" ring (medium and up). GovSlack adds a lagoon_90 tile at the bottom-right. September 2026: the cut-out is
// subtracted from the image and the hairline follows the carved outline, stopping at the gap (:312-316); a round
// (concentric) avatar keeps its circle and puts the unreads dot on its edge at 45° (:253-262, :475-482); the 32 pt
// `toolbarItem` size (the unified header's workspace switcher) widens the unreads collar to 2.5 pt (:116-126). Geometry
// :95-157, layout :239-318, configure :321-441, cut-outs :454-496, sizes :589-750. Spec: slackkit-components.md ›
// SKWorkspaceAvatar.
//
//   <SKWorkspaceAvatar name="Acme" src={logo} size="extraLarge" workspaceType={{ mentionCount: 3 }} />
//   <SKWorkspaceAvatar name="Acme" src={logo} size="large" workspaceType="active" />
//   <SKWorkspaceAvatar name="Test Workspace" size="extraLarge" />                  initials "TW"

/** WorkspaceType (:512-530) */
export type SKWorkspaceType = 'standard' | { mentionCount: number } | 'pendingAuthentication' | 'hasUnreads' | { hasUnreads: { badgeColor?: string } } | 'active'

interface Props {
  /** workspaceImageSource; none (or a failed load) shows the initials */
  src?: string
  /** workspaceName: the initials and the label */
  name: string
  /** overrides the initials derived from the name */
  initials?: string
  /** toolbarItem (September 2026): 32 pt, the unified header's workspace button (sizes :589-626) */
  size?: Exclude<AvatarSize, 'presentation' | 'profile'> | 'toolbarItem' | number
  workspaceType?: SKWorkspaceType
  workspaceVariant?: 'default' | 'govSlack'
  /** shouldMakeConcentric: a circle */
  round?: boolean
  /** @deprecated the earlier API for workspaceType={{ hasUnreads: { badgeColor } }} */
  unreadDot?: string
  className?: string
  style?: CSSProperties
}

/** Size.strokeWidth (:672-681), for numeric sides too; toolbarItem is 3 like large */
const strokeWidthFor = (W: number, toolbarItem = false) => (toolbarItem ? 3 : W < 32 ? 0 : W < 36 ? 2 : W < 120 ? 3 : 4)
/** Size.variantCornerRadius, variantSizeRatio, variantImageInset (:687-744); toolbarItem takes large's values */
const VARIANT: [number, number, number, number][] = [
  // side, radius, ratio, inset
  [16, 4, 0.75, 4],
  [20, 5, 0.7, 4],
  [24, 5, 0.62, 4],
  [28, 5, 0.59, 4],
  [32, 5, 0.56, 5],
  [36, 6, 0.55, 5],
  [56, 7, 0.42, 5],
  [120, 10, 0.42, 6],
]

export function SKWorkspaceAvatar({ src, name, initials, size = 'large', workspaceType, workspaceVariant = 'default', round = false, unreadDot, className, style }: Props) {
  const toolbarItem = size === 'toolbarItem'
  const W = typeof size === 'number' ? size : size === 'toolbarItem' ? 32 : AVATAR_SIZES[size]
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [failed, setFailed] = useState(false)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const mentions = typeof workspaceType === 'object' && 'mentionCount' in workspaceType ? workspaceType.mentionCount : null
  // SKBadge.size(for:) is the rendered badge's width: estimated from the text, then measured (which follows font loads)
  const [badgeWidth, setBadgeWidth] = useState(() => (mentions === null ? 24 : Math.max(24, textWidth(mentions > 9 ? '9+' : String(mentions)) + 18)))
  useLayoutEffect(() => {
    const el = badgeRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBadgeWidth(e!.borderBoxSize[0]!.inlineSize))
    ro.observe(el)
    return () => ro.disconnect()
  }, [mentions, size])
  const type: SKWorkspaceType = workspaceType ?? (unreadDot ? { hasUnreads: { badgeColor: unreadDot } } : 'standard')
  const radius = round ? W / 2 : Math.min(20, 0.25 * W)
  // shouldShowWorkspaceTypeAnnotation: smallPlus and up (:588-600)
  const annotates = W >= 28 && W <= 120
  const kind = typeof type === 'object' ? ('mentionCount' in type ? 'mentionCount' : 'hasUnreads') : type
  const annotated = annotates && (kind === 'mentionCount' || kind === 'hasUnreads' || kind === 'pendingAuthentication')
  // the mention dot is for `.medium` only (:296-300); toolbarItem is 32 pt too but draws the badge
  const medium = W >= 32 && W < 36 && !toolbarItem
  const gap = W / 40 // annotationGapWidth
  const c = 4 + W / 5 // circleCutoutSideLength = lockCutoutSideLength
  const off = W / 20 // circleOffset

  let cutout = ''
  let annotation = null
  if (annotated) {
    if (kind === 'hasUnreads' || (kind === 'mentionCount' && medium)) {
      // unreadsCutoutPath (:475-496): a circle of c + unreadsCutoutGap, shifted up and right by W / 20; a 0.75 c dot
      // in it (:100-103, :253-262). unreadsCutoutGap is the annotation gap, or for toolbarItem the gap that makes a
      // 2.5 pt collar: 2 × 2.5 − 0.25 c (:116-126). Concentric: both centered where the edge crosses the top-right
      // diagonal (AvatarAnnotationGeometry.concentricAnnotationFrame / concentricCutoutPath)
      const ugap = toolbarItem ? 2 * 2.5 - 0.25 * c : gap
      const D = c + ugap
      const s = 0.75 * c
      const e = { x: W / 2 + ((W / 2) * Math.SQRT2) / 2, y: W / 2 - ((W / 2) * Math.SQRT2) / 2 }
      const cxy = round ? e : { x: W - D / 2 + off, y: D / 2 - off }
      cutout = ellipsePath(cxy.x - D / 2, cxy.y - D / 2, D, D)
      const f = round ? roundRectToScreenScale(e.x - s / 2, e.y - s / 2, s, s) : roundRectToScreenScale(W + off - c + gap, -off + (c - s) - gap, s, s)
      const color =
        kind === 'mentionCount' ? 'var(--dt_color_base_inverse_important)' : ((type as { hasUnreads: { badgeColor?: string } }).hasUnreads?.badgeColor ?? 'var(--dt_color_content_primary)')
      annotation = <span className="sk-ws-avatar__dot" style={{ left: f.x, top: f.y, width: f.w, height: f.h, background: color }} />
    } else if (kind === 'mentionCount') {
      // an emphasized SKBadge(count:) at maxX − 4/5 of its width, minY − 1/5 of its height; the cut-out is its frame
      // outset by 2 × gap as a capsule (:222-227, :417-422)
      const count = (type as { mentionCount: number }).mentionCount
      // SKBadge.size(for:): the rendered badge's width (18 tall, at least 24 wide)
      const bw = badgeWidth
      const bh = 18
      const f = roundRectToScreenScale(W - (4 * bw) / 5, -bh / 5, bw, bh)
      const o = { x: f.x - 2 * gap, y: f.y - 2 * gap, w: f.w + 4 * gap, h: f.h + 4 * gap }
      const r = Math.min(o.w, o.h) / 2
      cutout = `M${o.x + r} ${o.y}H${o.x + o.w - r}A${r} ${r} 0 0 1 ${o.x + o.w - r} ${o.y + o.h}H${o.x + r}A${r} ${r} 0 0 1 ${o.x + r} ${o.y}Z`
      annotation = (
        <span ref={badgeRef} className="sk-ws-avatar__badge" style={{ left: f.x, top: f.y }}>
          <SKBadge count={count} />
        </span>
      )
    } else {
      // lockCutoutPath (:424-436): a c × c notch whose bottom-left corner is a quadratic curve of c / 2; the lock
      // (0.25 W + 6) sits 0.25 of its width past the trailing edge and 0.3 of its height above the top (:186-189)
      const k = c / 2
      cutout = `M${W - c} 0L${W - c} ${c - k}Q${W - c} ${c} ${W - c + k} ${c}L${W} ${c}L${W} 0Z`
      const lw = 0.25 * W + 6
      annotation = <Icon name="lock_filled" size={lw} color="var(--dt_color_content_primary)" className="sk-ws-avatar__lock" style={{ left: W - 0.75 * lw, top: -0.3 * lw }} />
    }
  }

  // the image's rounded rect: the top-right corner is square when a top-right annotation shows, unless the avatar is
  // concentric (squaring a circle's corner makes a teardrop) (:373-379). The cut-out is subtracted (carve
  // `.avatarHasBorder`, :312) and the hairline strokes the carved outline: the rect's edge outside the cut-out and the
  // cut-out's edge inside the rect (:314-316).
  const r = radius
  const squared = annotated && !round
  const body = squared
    ? `M${r} 0H${W}V${W - r}A${r} ${r} 0 0 1 ${W - r} ${W}H${r}A${r} ${r} 0 0 1 0 ${W - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
    : `M${r} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V${W - r}A${r} ${r} 0 0 1 ${W - r} ${W}H${r}A${r} ${r} 0 0 1 0 ${W - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
  const mask = annotated ? svgMaskSubtract(W, W, body, cutout) : undefined
  const showImage = !!src && !failed

  // active: a contentPrimary ring 2 × its width outside the image, radius + that offset (:276-280, :610-622)
  const sw = strokeWidthFor(W, toolbarItem)
  const ring = kind === 'active' && sw > 0 ? <span className="sk-ws-avatar__ring" style={{ inset: -2 * sw, borderWidth: sw, borderRadius: radius + 2 * sw }} /> : null

  let variant = null
  if (workspaceVariant === 'govSlack') {
    const [, vr, ratio, inset] = (toolbarItem ? VARIANT.find(([s]) => s === 36) : VARIANT.find(([s]) => W <= s)) ?? VARIANT[VARIANT.length - 1]!
    const side = W * ratio + 2
    const o = W - side + 2 + 2 * sw
    variant = (
      <span className="sk-ws-avatar__variant" style={{ left: o, top: o, width: side, height: side, borderRadius: vr }}>
        <i style={{ inset, WebkitMaskImage: `url("${govSlackVariant}")`, maskImage: `url("${govSlackVariant}")` }} />
      </span>
    )
  }

  const label = [
    typeof type === 'object' && 'mentionCount' in type ? `${type.mentionCount} ${type.mentionCount === 1 ? 'mention' : 'mentions'}` : '',
    kind === 'pendingAuthentication' ? 'Pending authentication' : kind === 'hasUnreads' ? 'Has unread messages' : kind === 'active' ? 'Selected' : '',
    workspaceVariant === 'govSlack' ? 'GovSlack' : '',
  ].filter(Boolean)
  return (
    <span className={cx('sk-ws-avatar', className)} style={{ width: W, height: W, ...style }} role="img" aria-label={[name, ...label, 'Workspace'].join(', ')}>
      <svg className="sk-ws-avatar__hairline" width={W} height={W} viewBox={`0 0 ${W} ${W}`} aria-hidden>
        {annotated ? (
          <>
            <defs>
              <mask id={`${uid}-out`} maskUnits="userSpaceOnUse" x={-W} y={-W} width={3 * W} height={3 * W}>
                <rect x={-W} y={-W} width={3 * W} height={3 * W} fill="white" />
                <path d={cutout} fill="black" />
              </mask>
              <clipPath id={`${uid}-in`}>
                <path d={body} />
              </clipPath>
            </defs>
            <path d={body} mask={`url(#${uid}-out)`} />
            <path d={cutout} clipPath={`url(#${uid}-in)`} />
          </>
        ) : (
          <path d={body} />
        )}
      </svg>
      <span className="sk-ws-avatar__image" style={{ borderRadius: annotated ? 0 : r, WebkitMaskImage: mask, maskImage: mask }}>
        {showImage ? (
          <img src={asset(src)} alt="" draggable={false} onError={() => setFailed(true)} />
        ) : (
          <span className="sk-ws-avatar__initials">{initials ?? initialsOf(name)}</span>
        )}
      </span>
      {annotation}
      {ring}
      {variant}
    </span>
  )
}

let measureCtx: CanvasRenderingContext2D | null | undefined
/** A first estimate of SKFont.microBold (Lato Bold 12) text width, before the badge can be measured. */
function textWidth(text: string) {
  measureCtx ??= typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (!measureCtx) return text.length * 7
  measureCtx.font = '700 12px Lato'
  return measureCtx.measureText(text).width
}
