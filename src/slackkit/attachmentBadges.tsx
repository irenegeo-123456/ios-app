import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { cx } from './util'
import './attachments.css'

// The badges attachment views overlay on images (Implementation/Helpers):
// - VideoDurationBadge (VideoDurationBadge/VideoDurationBadge.swift:16-200): a white play icon (small 12 / medium 20)
//   and the duration, 1 unit, abbreviated and rounded ("3h", "17m", "10s"; "Video" without one), white captionBold /
//   smallBodyBold, on sk_black @70 %, radius 8, insets 2 / 4, 2 pt apart.
// - AltTextBadge (AltText/AltTextHelper.swift:14-134): "ALT" in white captionBold on sk_black @70 %, radius 6, insets
//   2 / 4; the reminder variant (no alt text yet) leads with a white plus. Centered badges are at least 52 wide.
// - MultiSelectBadge (MultiSelectBadge/MultiSelectBadge.swift:15-110): a 20 pt circle; unselected sk_black @70 % with a
//   2 pt white border, selected white with the position in sk_black smallBodyBold capped at 14 pt.
// - EditIconBadge (September 2026, EditIconBadge/EditIconBadge.swift:13-55): a 12 pt white edit_filled with 4 pt
//   (Spacing.small) around it on sk_black @70 %, radius 8, continuous: a 20 × 20 square.

/** DateComponentsFormatter(maximumUnitCount: 1, allowedUnits: [.hour, .minute, .second], unitsStyle: .abbreviated) */
export function formatVideoDuration(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return 'Video'
  // the largest unit, rounded: 10000 s → "3h", 1000 s → "17m" (SKThumbnailAttachmentSnapshotTests)
  const sec = Math.round(Math.max(0, seconds))
  if (sec < 60) return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  return `${Math.round(sec / 3600)}h`
}

export function VideoDurationBadge({ durationInSeconds, size = 'small', className, style }: { durationInSeconds?: number | null; size?: 'small' | 'medium'; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('sk-video-badge', `sk-video-badge--${size}`, className)} style={style}>
      <Icon name="play_filled" size={size === 'small' ? 12 : 20} color="var(--dt_color_constants_white)" />
      <span className="sk-video-badge__label">{formatVideoDuration(durationInSeconds)}</span>
    </span>
  )
}

export function AltTextBadge({ showPlusIcon = false, centered = false, onTapped, className, style }: { showPlusIcon?: boolean; centered?: boolean; onTapped?: () => void; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={cx('sk-alt-badge', centered && 'is-centered', onTapped && 'is-interactive', className)}
      style={style}
      role={onTapped ? 'button' : undefined}
      onClick={
        onTapped &&
        ((e) => {
          e.stopPropagation()
          onTapped()
        })
      }
    >
      {showPlusIcon && <Icon name="plus" size={20} color="var(--dt_color_constants_white)" />}
      <span className="sk-alt-badge__label">ALT</span>
    </span>
  )
}

export function MultiSelectBadge({ position, className, style }: { /** the selection position; null draws the unselected circle */ position: number | null; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('sk-multiselect-badge', position != null && 'is-selected', className)} style={style} aria-hidden>
      {position != null && position}
    </span>
  )
}

export function EditIconBadge({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('sk-edit-badge', className)} style={style} aria-hidden>
      <Icon name="edit_filled" size={12} color="var(--dt_color_constants_white)" />
    </span>
  )
}
