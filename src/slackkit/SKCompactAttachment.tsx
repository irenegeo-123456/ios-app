import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { VideoDurationBadge } from './attachmentBadges'
import { fileTypeIcon, fileTypePrimaryColor, fileTypeSecondaryColor, type SKFileType } from './fileTypes'
import { SKOrnamentBox } from './SKOrnamentBox'
import { SKCircularProgressIndicator } from './SKSpinner'
import { SKThumbnailAttachment } from './SKThumbnailAttachment'
import { cx } from './util'
import './attachments.css'

// SKCompactAttachment (DesignerComponents/CompactAttachment/SKCompactAttachment.swift): the one-row attachment card
// in messages and the composer. 12 pt padding, a 36 pt AttachmentOrnament, 8 pt, then the title (smallBodyBold
// contentPrimary) over the subtitle (caption contentTertiary), 2 pt apart; an unfurl's detail (caption
// contentSecondary) and a 12 pt accessory icon follow the title, 6 pt apart. Radius 15, a 1 pt outlineTertiary border,
// basePrimary. It hugs its content (size(for:) :386-475) unless its container stretches it. A file's preview image
// sits below a 1 px divider at the file's aspect ratio, at most 300 tall (since September 2026 from the full available width, :479-480). Pressed alpha 0.6 (:71-93, :485-633).
// AttachmentOrnament (Helpers/AttachmentOrnament/AttachmentOrnament.swift): a file-type tile (an SKOrnamentBox large
// on the type's palette color, the filled glyph in white; inverted: the outline glyph on baseSecondary), an image
// (radius 6), a video (image + a centered "Video" badge), audio (a basePrimary play on sk_sky_blue), an error icon.
// Spec: slackkit-components.md › SKCompactAttachment, AttachmentOrnament.
//
//   <SKCompactAttachment state={{ file: { type: 'pdf', title: 'Q3 plan.pdf', subtitle: '10 KB PDF' } }} onSelected={open} />
//   <SKCompactAttachment state={{ error: { title: 'Error', subtitle: 'Something went wrong.' } }} />

type Title = ReactNode
export interface SKAttachmentIcon {
  icon: string
  color?: string
}

export type SKCompactAttachmentState =
  | 'loading'
  | { image: { title: Title; subtitle?: Title; src?: string } }
  | { video: { title: Title; subtitle?: Title; src?: string } }
  | { audio: { title: Title; subtitle?: Title } }
  | {
      file: {
        type: SKFileType
        title: Title
        subtitle?: Title
        /** the outline glyph in the type's color on baseSecondary */
        invertOrnamentColors?: boolean
        /** a preview below the row, at width × height's aspect ratio (≤ 300 tall) */
        previewImage?: { src: string; width: number; height: number }
        /** 12 pt, after the title (the AI summary sparkle) */
        accessoryIcon?: string | SKAttachmentIcon
        /** SKLoadingIndicatorState.progress: an upload ring over the card, 0…1 */
        progress?: number
      }
    }
  | {
      unfurl: {
        title: Title
        titleDetail?: Title
        subtitle?: Title
        ornament?: { icon: string; color?: string; backgroundColor?: string } | { image: string }
      }
    }
  | { table: { title: Title; subtitle?: Title } }
  | { error: { title: Title; subtitle?: Title; icon?: SKAttachmentIcon; titleLineLimit?: number; subtitleLineLimit?: number } }

interface Props {
  state: SKCompactAttachmentState
  isInteractionEnabled?: boolean
  onSelected?: () => void
  /** accessoryIconInfoSelected (VoiceOver "View summary") */
  onAccessoryIconSelected?: () => void
  className?: string
  style?: CSSProperties
}

/** AttachmentOrnament.PresentationObject (:165-179) */
export type SKAttachmentOrnament =
  | 'loading'
  | 'audio'
  | { image: string }
  | { video: string }
  | { file: SKFileType; invertOrnamentColors?: boolean }
  | { icon: string; color?: string; backgroundColor?: string }
  | { error: SKAttachmentIcon }

/** The 36 pt leading tile of attachment rows. */
export function AttachmentOrnament({ ornament }: { ornament: SKAttachmentOrnament }) {
  if (ornament === 'loading') return <SKOrnamentBox ornament={{ placeholder: true }} size="large" backgroundColor="var(--dt_color_base_tertiary)" />
  if (ornament === 'audio') return <SKOrnamentBox ornament={{ icon: 'play_filled', color: 'var(--dt_color_base_primary)' }} size="large" backgroundColor="var(--sk_sky_blue)" />
  if ('image' in ornament || 'video' in ornament) {
    const src = 'image' in ornament ? ornament.image : ornament.video
    return (
      <span className="sk-attachment-ornament">
        <img src={asset(src)} alt="" draggable={false} />
        {'video' in ornament && <VideoDurationBadge className="sk-attachment-ornament__video" />}
      </span>
    )
  }
  if ('file' in ornament) {
    const inverted = !!ornament.invertOrnamentColors
    return (
      <SKOrnamentBox
        ornament={{ icon: fileTypeIcon(ornament.file, inverted ? 'unfilled' : 'filled'), color: inverted ? fileTypePrimaryColor(ornament.file) : fileTypeSecondaryColor(ornament.file) }}
        size="large"
        backgroundColor={inverted ? 'var(--dt_color_base_secondary)' : fileTypePrimaryColor(ornament.file)}
      />
    )
  }
  if ('error' in ornament)
    return <SKOrnamentBox ornament={{ icon: ornament.error.icon, color: ornament.error.color ?? 'var(--dt_color_content_primary)' }} size="large" backgroundColor="transparent" />
  return <SKOrnamentBox ornament={{ icon: ornament.icon, color: ornament.color }} size="large" backgroundColor={ornament.backgroundColor} />
}

// the default error icon: .svgWarningFilled in important.content since September 2026 (:846; June sk_raspberry_red)
const ERROR_ICON: SKAttachmentIcon = { icon: 'warning_filled', color: 'var(--dt_color_content_important)' }

function ornamentFor(state: SKCompactAttachmentState): SKAttachmentOrnament | null {
  if (state === 'loading') return 'loading'
  if ('image' in state) return state.image.src ? { image: state.image.src } : null
  if ('video' in state) return state.video.src ? { video: state.video.src } : null
  if ('audio' in state) return 'audio'
  if ('file' in state) return { file: state.file.type, invertOrnamentColors: state.file.invertOrnamentColors }
  if ('unfurl' in state) {
    const o = state.unfurl.ornament
    return !o ? null : 'image' in o ? { image: o.image } : o
  }
  if ('table' in state) return null
  return { error: state.error.icon ?? ERROR_ICON }
}

export function SKCompactAttachment({ state, isInteractionEnabled = true, onSelected, onAccessoryIconSelected, className, style }: Props) {
  const ornament = ornamentFor(state)
  const body = state === 'loading' ? null : Object.values(state)[0] as { title: Title; subtitle?: Title; titleDetail?: Title; titleLineLimit?: number; subtitleLineLimit?: number }
  const file = typeof state === 'object' && 'file' in state ? state.file : null
  const accessory = file?.accessoryIcon ? (typeof file.accessoryIcon === 'string' ? { icon: file.accessoryIcon } : file.accessoryIcon) : null
  const preview = file?.previewImage
  const interactive = isInteractionEnabled && !!onSelected
  const lines = (n = 1): CSSProperties => (n === 1 ? {} : { WebkitLineClamp: n || 'none', whiteSpace: 'normal', display: '-webkit-box', WebkitBoxOrient: 'vertical' })
  return (
    <span
      className={cx('sk-compact-attachment', interactive && 'is-interactive', className)}
      style={style}
      role={interactive ? 'button' : undefined}
      onClick={interactive ? onSelected : undefined}
      data-tap={interactive ? '' : undefined}
    >
      <span className="sk-compact-attachment__row">
        {ornament && <AttachmentOrnament ornament={ornament} />}
        {body && (
          <span className="sk-compact-attachment__labels">
            <span className="sk-compact-attachment__primary">
              <span className="sk-compact-attachment__title" style={lines(body.titleLineLimit)}>
                {body.title}
              </span>
              {body.titleDetail && <span className="sk-compact-attachment__detail">{body.titleDetail}</span>}
              {accessory && (
                <span
                  className="sk-compact-attachment__accessory"
                  onClick={
                    onAccessoryIconSelected &&
                    ((e) => {
                      e.stopPropagation()
                      onAccessoryIconSelected()
                    })
                  }
                  aria-label={onAccessoryIconSelected ? 'View summary' : undefined}
                >
                  <Icon name={accessory.icon} size={12} color={accessory.color ?? 'var(--dt_color_content_primary)'} />
                </span>
              )}
            </span>
            {body.subtitle && (
              <span className="sk-compact-attachment__subtitle" style={lines(body.subtitleLineLimit)}>
                {body.subtitle}
              </span>
            )}
          </span>
        )}
      </span>
      {preview && (
        <>
          <span className="sk-compact-attachment__divider" />
          <span className="sk-compact-attachment__preview" style={{ aspectRatio: `${preview.width} / ${preview.height}` }}>
            <img src={asset(preview.src)} alt="" draggable={false} />
          </span>
        </>
      )}
      {file?.progress != null && <SKCircularProgressIndicator size="large" progress={file.progress} className="sk-compact-attachment__progress" />}
    </span>
  )
}

/**
 * SKCompactOverflow (DesignerComponents/CompactOverflow/SKCompactOverflow.swift:31-143): the last compact card of a
 * truncated list with a 64 pt "+N" thumbnail after it, 8 pt apart, centered; radius 12, no border, pressed alpha 0.6.
 */
export function SKCompactOverflow({ state, count, isInteractionEnabled = true, onSelected, onShowMore, className, style }: Props & { count: number; onShowMore?: () => void }) {
  return (
    <span className={cx('sk-compact-overflow', className)} style={style}>
      <SKCompactAttachment state={state} isInteractionEnabled={isInteractionEnabled} onSelected={onSelected} className="sk-compact-overflow__card" />
      <SKThumbnailAttachment state={{ overflow: count }} isInteractionEnabled={isInteractionEnabled} onSelected={onShowMore} accessibilityLabel={`There are ${count} more attachments.`} />
    </span>
  )
}
