import type { CSSProperties } from 'react'
import { asset } from '../lib/asset'
import { AltTextBadge, VideoDurationBadge } from './attachmentBadges'
import { cx, roundToAutoLayoutScale } from './util'
import './attachments.css'

// SKExpandedAttachment (DesignerComponents/ExpandedAttachment/SKExpandedAttachment.swift): a large inline image or
// video preview. As wide as its container (or the image's known width, if smaller); height = width × the known aspect
// ratio (5/8 without one), clamped to 2 × radius … 400 (:69-86, :422-441, :542-563). Corner radius 15 (`cornerRadius`
// .moreRounded; .standard 12, or a custom value, :88-97, :621-628), a 1 pt border over the content (outlineTertiary)
// and a fill behind it (baseSecondary), both overridable since September 2026 (:120-131, :235-239). The badges sit at
// margins set up once with the default radius (:241-282), so they don't follow `cornerRadius`: "ALT" 7⅔ pt
// (roundToScreenScale(15 / 2)) in from the bottom-left, a video's medium duration badge 15 − 8 = 7 pt. Aspect fill
// without a known size, aspect fit with one (:608); an aspect-filled crop favors `anchor` (default center;
// SlackKitFoundations ImageContentAnchor.swift:13-71, September 2026). Pressed alpha 0.6. Spec:
// slackkit-components.md › SKExpandedAttachment.
//
// The ALT badge follows `altTextBadgeVisibility` (Helpers/AltText/AltTextBadgeVisibility.swift:6-27, September 2026):
// .hidden never, .visibleIfPresent (the default) only with alt text, .visibleAlways also the "+ALT" reminder without
// it; June's `allowAltTextReminder` is .visibleAlways (SKAttachmentBar.swift:874-879). Videos never show it (:395).
//
//   <SKExpandedAttachment state={{ image: { src: photo, altText: 'Launch day' } }} knownImageSize={{ width: 1200, height: 800 }} />
//   <SKExpandedAttachment state={{ video: { src: poster, durationInSeconds: 95 } }} />
//   <SKExpandedAttachment state={{ image: { src: photo } }} borderColor="transparent" backgroundColor="transparent" cornerRadius="standard" />

export type SKExpandedAttachmentState = { image: { src: string; altText?: string } } | { video: { src: string; durationInSeconds?: number } }

/** AltTextBadgeVisibility (Helpers/AltText/AltTextBadgeVisibility.swift:6-27) */
export type SKAltTextBadgeVisibility = 'hidden' | 'visibleIfPresent' | 'visibleAlways'

export const altTextBadgeShown = (visibility: SKAltTextBadgeVisibility, altTextMissing: boolean) =>
  visibility === 'visibleAlways' || (visibility === 'visibleIfPresent' && !altTextMissing)

/** ImageContentAnchor (SlackKitFoundations/Implementation/Image/ImageContentAnchor.swift:13-71) */
export type SKImageContentAnchor = 'center' | 'top' | 'bottom' | 'leading' | 'trailing' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing'

/** the aspect-fill crop's object-position: the anchor's edge stays, the other axis centers (contentsRect(imageSize:containerSize:)) */
export function anchorObjectPosition(anchor: SKImageContentAnchor) {
  const x = /Leading|^leading/.test(anchor) ? 'left' : /Trailing|^trailing/.test(anchor) ? 'right' : 'center'
  const y = /^top/.test(anchor) ? 'top' : /^bottom/.test(anchor) ? 'bottom' : 'center'
  return `${x} ${y}`
}

/** PresentationObject.CornerRadius (:621-628) */
export type SKExpandedAttachmentCornerRadius = 'standard' | 'moreRounded' | number

const cornerRadiusValue = (r: SKExpandedAttachmentCornerRadius) => (r === 'standard' ? 12 : r === 'moreRounded' ? 15 : r)

interface Props {
  state: SKExpandedAttachmentState
  /** the image's size in pixels; sets the aspect ratio and caps the width */
  knownImageSize?: { width: number; height: number }
  /** the container's width (default: fill it) */
  width?: number
  /** default visibleIfPresent (September 2026) */
  altTextBadgeVisibility?: SKAltTextBadgeVisibility
  /** @deprecated June's flag: true is altTextBadgeVisibility visibleAlways */
  allowAltTextReminder?: boolean
  /** default moreRounded, 15 (September 2026) */
  cornerRadius?: SKExpandedAttachmentCornerRadius
  /** @deprecated June's flag: false is cornerRadius standard */
  useMoreRoundedCornerRadius?: boolean
  /** default outlineTertiary (September 2026) */
  borderColor?: string
  /** default baseSecondary (September 2026) */
  backgroundColor?: string
  /** default aspect fill without a known size, aspect fit with one */
  contentMode?: 'scaleAspectFill' | 'scaleAspectFit'
  /** where an aspect-filled crop favors (September 2026); default center */
  anchor?: SKImageContentAnchor
  isInteractionEnabled?: boolean
  onSelected?: () => void
  onAltBadgeSelected?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

/** SKExpandedAttachment.size(for:presentationObject:) (:422-431, heightForWidth :554-563) */
export function expandedAttachmentSize(width: number, knownImageSize?: { width: number; height: number }, radius = 15) {
  const w = Math.min(knownImageSize?.width ?? width, width)
  const ratio = knownImageSize && knownImageSize.width > 0 ? knownImageSize.height / knownImageSize.width : 5 / 8
  return { width: w, height: roundToAutoLayoutScale(Math.min(Math.max(w * ratio, 2 * radius), 400)) }
}

// set up in init, before any presentation object, with the default .moreRounded radius (:103-106, :256-258, :282)
const VIDEO_BADGE_MARGIN = 15 - 8
const ALT_BADGE_MARGIN = Math.round((15 / 2) * 3) / 3

export function SKExpandedAttachment({
  state,
  knownImageSize,
  width,
  altTextBadgeVisibility,
  allowAltTextReminder,
  cornerRadius,
  useMoreRoundedCornerRadius,
  borderColor,
  backgroundColor,
  contentMode,
  anchor = 'center',
  isInteractionEnabled = true,
  onSelected,
  onAltBadgeSelected,
  accessibilityLabel,
  className,
  style,
}: Props) {
  const radius = cornerRadiusValue(cornerRadius ?? (useMoreRoundedCornerRadius === false ? 'standard' : 'moreRounded'))
  const visibility = altTextBadgeVisibility ?? (allowAltTextReminder ? 'visibleAlways' : 'visibleIfPresent')
  const fill = (contentMode ?? (knownImageSize ? 'scaleAspectFit' : 'scaleAspectFill')) === 'scaleAspectFill'
  const ratio = knownImageSize && knownImageSize.width > 0 ? knownImageSize.height / knownImageSize.width : 5 / 8
  const box: CSSProperties =
    width != null
      ? expandedAttachmentSize(width, knownImageSize, radius)
      : { width: knownImageSize ? `min(100%, ${knownImageSize.width}px)` : '100%', aspectRatio: `1 / ${ratio}`, minHeight: 2 * radius, maxHeight: 400 }
  const image = 'image' in state ? state.image : null
  const src = image ? image.src : 'video' in state ? state.video.src : ''
  const missing = image ? !image.altText : false
  const interactive = isInteractionEnabled && !!onSelected
  return (
    <span
      className={cx('sk-expanded-attachment', interactive && 'is-interactive', className)}
      style={{
        ...box,
        borderRadius: radius,
        ...(backgroundColor != null && { background: backgroundColor }),
        ...(borderColor != null && ({ '--ea-border': borderColor } as CSSProperties)),
        ...style,
      }}
      role={interactive ? 'button' : 'img'}
      aria-label={accessibilityLabel ?? image?.altText}
      onClick={interactive ? onSelected : undefined}
      data-tap={interactive ? '' : undefined}
    >
      <img src={asset(src)} alt={image?.altText ?? ''} draggable={false} style={{ objectFit: fill ? 'cover' : 'contain', objectPosition: fill ? anchorObjectPosition(anchor) : undefined }} />
      {'video' in state && <VideoDurationBadge size="medium" durationInSeconds={state.video.durationInSeconds} className="sk-expanded-attachment__badge" style={{ left: VIDEO_BADGE_MARGIN, bottom: VIDEO_BADGE_MARGIN, maxWidth: `calc(100% - ${2 * VIDEO_BADGE_MARGIN}px)` }} />}
      {image && altTextBadgeShown(visibility, missing) && (
        <AltTextBadge
          showPlusIcon={missing}
          onTapped={isInteractionEnabled ? onAltBadgeSelected : undefined}
          className="sk-expanded-attachment__badge"
          style={{ left: ALT_BADGE_MARGIN, bottom: ALT_BADGE_MARGIN }}
        />
      )}
    </span>
  )
}
