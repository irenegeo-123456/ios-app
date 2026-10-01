import type { CSSProperties } from 'react'
import { Icon } from '../../../icons/Icon'
import { asset } from '../../../lib/asset'
import { fileTypeColor, fileTypeIcon } from '../../../messagekit/MKMessagePreview'
import type { FileAttachment, WorkspaceFile } from '../../../data/types'

// File-type ornaments, as Files (Docs), Search results and Slackbot's sources draw them (spec search-slackbot-huddles.md
// §4.2 "File rows"): a box with a white filled type icon on the type's palette _50 (UIColor+FileTypeExtensions.swift:54-125,
// SKIconManifest+FileType.swift:48-110); canvases are lagoon _50 with canvas_content_filled, lists honeycomb _50 with
// lists_filled; unknown types a surfacePrimary box with a contentSecondary icon (:16, :39). Images and videos with a
// thumbnail show the thumbnail instead. The box is SKOrnamentBox-shaped: radius 0.25 × side (36 → 9, measured ≈9 in
// CanvasSyntheticViewControllerSnapshotTests/testView@3x.png), the glyph in a 20 pt box.

export type FileKind = WorkspaceFile['kind'] | 'audio' | 'email' | 'text' | 'binary' | 'gdoc' | 'gsheet' | 'gpres' | 'ppt' | 'unknown'

export interface FileTypeStyle {
  /** the box fill */
  color: string
  icon: string
  /** the glyph's tint: white on a palette box, contentSecondary on the unknown box */
  tint: string
}

const WHITE = 'var(--dt_color_constants_white)'

/** A More › Files kind (or a type we know by name) → its box color and icon (§4.2 table). */
export function fileKindStyle(kind: FileKind): FileTypeStyle {
  switch (kind) {
    case 'canvas':
      return { color: 'var(--dt_color_palettes_lagoon_50)', icon: 'canvas_content_filled', tint: WHITE }
    case 'list':
      return { color: 'var(--dt_color_palettes_honeycomb_50)', icon: 'lists_filled', tint: WHITE }
    case 'pdf':
      return { color: 'var(--dt_color_palettes_flamingo_50)', icon: 'pdf_file_filled', tint: WHITE }
    case 'image':
      return { color: 'var(--dt_color_palettes_ocean_50)', icon: 'image_filled', tint: WHITE }
    case 'audio':
      return { color: 'var(--dt_color_palettes_ocean_50)', icon: 'sound_filled', tint: WHITE }
    case 'video':
      return { color: 'var(--dt_color_palettes_mojito_50)', icon: 'video_filled', tint: WHITE }
    case 'email':
      return { color: 'var(--dt_color_palettes_ocean_50)', icon: 'email_filled', tint: WHITE }
    case 'doc':
      return { color: 'var(--dt_color_palettes_ocean_50)', icon: 'brand_microsoft_word_filled', tint: WHITE }
    case 'spreadsheet':
      return { color: 'var(--dt_color_palettes_mojito_50)', icon: 'brand_microsoft_excel_filled', tint: WHITE }
    case 'ppt':
      return { color: 'var(--dt_color_palettes_tomato_50)', icon: 'brand_microsoft_ppt_filled', tint: WHITE }
    case 'gdoc':
      return { color: 'var(--dt_color_palettes_ocean_50)', icon: 'document', tint: WHITE }
    case 'gsheet':
      return { color: 'var(--dt_color_palettes_mojito_50)', icon: 'spreadsheet', tint: WHITE }
    case 'gpres':
      return { color: 'var(--dt_color_palettes_tangerine_50)', icon: 'presentation', tint: WHITE }
    case 'text':
      return { color: 'var(--dt_color_palettes_ocean_50)', icon: 'text', tint: WHITE }
    case 'binary':
      return { color: 'var(--dt_color_palettes_gray_50)', icon: 'number', tint: WHITE }
    default:
      return { color: 'var(--dt_color_surface_primary)', icon: 'file', tint: 'var(--dt_color_content_secondary)' }
  }
}

/** A message attachment's box, from its Slack filetype (MessageKit's mapping, MKMessagePreview.tsx). */
export function attachmentStyle(f: FileAttachment): FileTypeStyle {
  return { color: fileTypeColor(f), icon: fileTypeIcon(f), tint: WHITE }
}

/** A message attachment's kind, from its Slack filetype and mimetype (the same buckets as the table in §4.2). */
export function attachmentKind(f: FileAttachment): FileKind {
  const t = (f.filetype ?? f.name.split('.').pop() ?? '').toLowerCase()
  const mime = f.mimetype ?? ''
  if (t === 'canvas' || t === 'quip') return 'canvas'
  if (t === 'list') return 'list'
  if (mime.startsWith('image/') || /^(jpe?g|png|gif|tiff|bmp|heic|webp)$/.test(t)) return 'image'
  if (mime.startsWith('video/') || /^(mov|mp4|mpv|3gp)$/.test(t)) return 'video'
  if (mime.startsWith('audio/') || /^(mp3|m4a|wav|aac)$/.test(t)) return 'audio'
  if (t === 'pdf') return 'pdf'
  if (t === 'gdoc') return 'gdoc'
  if (t === 'gsheet') return 'gsheet'
  if (t === 'gpres') return 'gpres'
  if (t === 'doc' || t === 'docx') return 'doc'
  if (t === 'xls' || t === 'xlsx' || t === 'csv') return 'spreadsheet'
  if (t === 'ppt' || t === 'pptx') return 'ppt'
  if (t === 'email' || t === 'eml') return 'email'
  if (t === 'text' || t === 'txt' || t === 'snippet' || t === 'markdown') return 'text'
  if (t === 'binary' || t === 'numbers') return 'binary'
  return 'unknown'
}

/** "Canvas", "List", "PDF", "PNG"… for secondary lines (the file's pretty type). */
export function fileKindLabel(kind: FileKind): string {
  const labels: Partial<Record<FileKind, string>> = {
    canvas: 'Canvas',
    list: 'List',
    pdf: 'PDF',
    doc: 'Word Document',
    spreadsheet: 'Excel Spreadsheet',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    email: 'Email',
    gdoc: 'Google Docs',
    gsheet: 'Google Sheets',
    gpres: 'Google Slides',
    ppt: 'PowerPoint Presentation',
    text: 'Plain Text',
  }
  return labels[kind] ?? 'File'
}

interface OrnamentProps {
  style: FileTypeStyle
  /** 36 (medium rows) or 24 (small rows) */
  size?: number
  /** an image or video thumbnail: shown instead of the icon box (§4.2 "Other files") */
  thumbnail?: string
  className?: string
  cssStyle?: CSSProperties
}

/** The file-type box. */
export function FileTypeOrnament({ style, size = 36, thumbnail, className, cssStyle }: OrnamentProps) {
  // Image ornaments use the entity's image radius (large 6, small 4); boxes the proportional radius.
  const radius = thumbnail ? (size >= 36 ? 6 : 4) : Math.min(20, size * 0.25)
  if (thumbnail)
    return (
      <span className={['file-ornament', className].filter(Boolean).join(' ')} style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', display: 'block', background: 'var(--dt_color_base_tertiary)', ...cssStyle }}>
        <img src={asset(thumbnail)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </span>
    )
  return (
    <span
      className={['file-ornament', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, borderRadius: radius, background: style.color, display: 'grid', placeItems: 'center', flex: 'none', ...cssStyle }}
    >
      <Icon name={style.icon} size={size >= 36 ? 20 : 16} color={style.tint} />
    </span>
  )
}

/** The trailing star on a starred row: star_filled in sk_sunshine_yellow (starAccessory, DocsPresenter.swift:1196-1207). */
export const StarredAccessory = () => <Icon name="star_filled" size={20} color="var(--sk_sunshine_yellow)" title="starred" />
