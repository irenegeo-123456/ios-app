import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { AltTextBadge, EditIconBadge, MultiSelectBadge, VideoDurationBadge } from './attachmentBadges'
import { fileTypeIcon, fileTypeLegacyColor, fileTypePrimaryColor, type SKFileType } from './fileTypes'
import { SKLoadingShimmer } from './SKLoadingShimmer'
import { cx } from './util'
import './attachments.css'

// SKThumbnailAttachment (DesignerComponents/ThumbnailAttachment/SKThumbnailAttachment.swift): a square attachment
// tile (small 64, medium 96, or any side) for the composer strip, pickers and grids. Radius min(20, 0.225 × side);
// a 1 pt outlineTertiary border drawn over the content (none for `plain`), basePrimary behind. States: an image
// (aspect fill; the "ALT" badge follows altTextBadgeVisibility, hidden by default since September 2026, and an edit
// icon badge at the bottom-left replaces it when displayEditIcon, :362-367), a video (duration badge), a file-type icon
// (36 pt in its legacy color; lists and canvases 32 pt white on their palette color), loading (a 32 pt outlineTertiary
// file icon, or the shimmer), an error icon (20 pt, important.content by default), "+N" (bodyBold contentSecondary) or a
// 24 pt placeholder icon.
// Selection: a MultiSelectBadge at the top-right; selected adds a 3 pt sk_secondary_highlight border and an
// sk_black_high_contrast dim. Badges sit min(8, radius − 8) from the edges; pressed alpha 0.6 (:85-110, :288-470,
// :540-586). Spec: slackkit-components.md › SKThumbnailAttachment.
//
//   <SKThumbnailAttachment state={{ image: { src: photo, altText: 'A cat' } }} />
//   <SKThumbnailAttachment state={{ video: { src: poster, durationInSeconds: 83 } }} size="medium" />
//   <SKThumbnailAttachment state={{ file: 'pdf' }} selection={{ selected: 2 }} />
//   <SKThumbnailAttachment state={{ overflow: 3 }} onSelected={showAll} />

export type SKThumbnailAttachmentState =
  | 'loading'
  | { loading: { shimmer: boolean } }
  | { image: { src: string; altText?: string } }
  | { video: { src: string; durationInSeconds?: number } }
  | { file: SKFileType }
  | 'error'
  | { error: { icon: string; color?: string } }
  | { overflow: number }
  | { placeholder: { icon: string; color?: string } }

/** Selection: none (decorated, the default), plain (no border, square), unselected, selected(position:) */
export type SKThumbnailSelection = 'none' | 'plain' | 'unselected' | { selected: number }

/** Size (:696-711) */
export const THUMBNAIL_SIZES = { small: 64, medium: 96 } as const

interface Props {
  state: SKThumbnailAttachmentState
  selection?: SKThumbnailSelection
  size?: keyof typeof THUMBNAIL_SIZES | number
  /** a favorited image: a 36 pt white heart at the bottom-right */
  displayHeartIcon?: boolean
  /** AltTextBadgeVisibility (September 2026, :642-666; AltText/AltTextBadgeVisibility.swift): hidden (the default: e.g.
   *  message previews and the attachment bar), visibleIfPresent ("ALT" when there is alt text) or visibleAlways ("+ ALT"
   *  when there isn't) */
  altTextBadgeVisibility?: 'hidden' | 'visibleIfPresent' | 'visibleAlways'
  /** @deprecated June's flag: true is altTextBadgeVisibility 'visibleAlways' */
  allowAltTextReminder?: boolean
  /** displayEditIcon (September 2026): the 20 pt EditIconBadge at the bottom-left; it takes the ALT badge's place */
  displayEditIcon?: boolean
  isInteractionEnabled?: boolean
  onSelected?: () => void
  onAltBadgeSelected?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKThumbnailAttachment({
  state,
  selection = 'none',
  size = 'small',
  displayHeartIcon = false,
  altTextBadgeVisibility,
  allowAltTextReminder = false,
  displayEditIcon = false,
  isInteractionEnabled = true,
  onSelected,
  onAltBadgeSelected,
  accessibilityLabel,
  className,
  style,
}: Props) {
  const side = typeof size === 'number' ? size : THUMBNAIL_SIZES[size]
  const radius = Math.min(20, 0.225 * side)
  // min(8, cornerRadius − the video badge's 8) keeps the badges concentric with the corner (layoutSubviews :446-451)
  const inset = Math.round(Math.min(8, radius - 8) * 3) / 3
  const selected = typeof selection === 'object' ? selection.selected : null
  const file = typeof state === 'object' && 'file' in state ? state.file : null
  const tinted = file === 'list' || file === 'canvas'
  let content = null
  let badges = null
  if (state === 'loading' || (typeof state === 'object' && 'loading' in state)) {
    content =
      typeof state === 'object' && state.loading.shimmer ? (
        <SKLoadingShimmer />
      ) : (
        <Icon name="file_filled" size={32} color="var(--dt_color_outline_tertiary)" className="sk-thumbnail__icon" />
      )
  } else if (state === 'error' || (typeof state === 'object' && 'error' in state)) {
    // the default error icon is .svgWarningFilled in important.content since September 2026 (:753; June sk_raspberry_red)
    const e = typeof state === 'object' ? state.error : { icon: 'warning_filled', color: 'var(--dt_color_content_important)' }
    content = <Icon name={e.icon} size={20} color={e.color ?? 'var(--dt_color_content_primary)'} className="sk-thumbnail__icon" />
  } else if ('image' in state) {
    const missing = !state.image.altText
    const altVisibility = altTextBadgeVisibility ?? (allowAltTextReminder ? 'visibleAlways' : 'hidden')
    const showsAlt = !displayEditIcon && (altVisibility === 'visibleAlways' || (altVisibility === 'visibleIfPresent' && !missing))
    content = <img className="sk-thumbnail__image" src={asset(state.image.src)} alt={state.image.altText ?? ''} draggable={false} />
    badges = (
      <>
        {displayHeartIcon && <Icon name="heart_filled" size={36} color="var(--dt_color_constants_white)" className="sk-thumbnail__heart" style={{ right: inset, bottom: inset }} />}
        {displayEditIcon && <EditIconBadge className="sk-thumbnail__edit" style={{ left: inset, bottom: inset }} />}
        {showsAlt && (
          <AltTextBadge
            centered
            showPlusIcon={missing}
            onTapped={isInteractionEnabled ? onAltBadgeSelected : undefined}
            className="sk-thumbnail__alt"
            style={{ bottom: inset, maxWidth: side - 2 * inset, minWidth: Math.min(52, side - 2 * inset) }}
          />
        )}
      </>
    )
  } else if ('video' in state) {
    content = <img className="sk-thumbnail__image" src={asset(state.video.src)} alt="" draggable={false} />
    badges = <VideoDurationBadge durationInSeconds={state.video.durationInSeconds} className="sk-thumbnail__video" style={{ left: inset, bottom: inset, maxWidth: side - 2 * inset }} />
  } else if ('file' in state) {
    content = (
      <Icon
        name={fileTypeIcon(state.file)}
        size={tinted ? 32 : 36}
        color={fileTypeLegacyColor(state.file)}
        className="sk-thumbnail__icon"
      />
    )
  } else if ('overflow' in state) {
    content = <span className="sk-thumbnail__overflow">+{state.overflow}</span>
  } else if ('placeholder' in state) {
    content = <Icon name={state.placeholder.icon} size={24} color={state.placeholder.color ?? 'var(--dt_color_content_primary)'} className="sk-thumbnail__icon" />
  }
  const interactive = isInteractionEnabled && !!onSelected
  const overflowLabel = typeof state === 'object' && 'overflow' in state ? `There are ${state.overflow} more attachments.` : undefined
  return (
    <span
      className={cx('sk-thumbnail', selection === 'plain' && 'is-plain', selected != null && 'is-selected', interactive && 'is-interactive', className)}
      style={{
        width: side,
        height: side,
        borderRadius: selection === 'plain' ? 0 : radius,
        background: tinted ? fileTypePrimaryColor(file!) : undefined,
        ...style,
      }}
      role={interactive ? 'button' : 'img'}
      aria-label={accessibilityLabel ?? overflowLabel}
      aria-pressed={selected != null ? true : selection === 'unselected' ? false : undefined}
      onClick={interactive ? onSelected : undefined}
      data-tap={interactive ? '' : undefined}
    >
      {content}
      {selected != null && <span className="sk-thumbnail__dim" />}
      {(selection === 'unselected' || selected != null) && <MultiSelectBadge position={selected} className="sk-thumbnail__select" style={{ top: inset, right: inset }} />}
      {badges}
    </span>
  )
}
