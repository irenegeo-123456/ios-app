import type { CSSProperties } from 'react'
import { useApp } from '../app/store'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import type { FileAttachment } from '../data/types'
import { fileSize, plural } from './format'

// A message's files (spec messages.md §4), the transcript's `.mixed` attachment styling
// (MessageViewPresentationObjectFactory.swift:101-154; SKAttachmentBar.swift:267-323, 448-538):
//   2+ images → the media carousel (FilesAndAttachmentsMapper.swift:383-434)
//   any other file → full-size cards, file cards first, then images
//   one image → one expanded image, sized from its pixel size

const isImage = (f: FileAttachment) => f.mimetype.startsWith('image/')
const isVideo = (f: FileAttachment) => f.mimetype.startsWith('video/')
const isMedia = (f: FileAttachment) => isImage(f) || isVideo(f)

/** File type → the tile's `_50` palette color and filled icon (UIColor+FileTypeExtensions.swift:48-128; SKIconManifest+FileType.swift:48-127). */
export function fileTypeStyle(f: FileAttachment): { color: string; icon: string } {
  const t = (f.filetype ?? f.name.split('.').pop() ?? '').toLowerCase()
  const p = (name: string) => `var(--dt_color_palettes_${name}_50)`
  if (['jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp', 'heic', 'webp', 'svg'].includes(t) || isImage(f)) return { color: p('ocean'), icon: 'image_filled' }
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'm4r'].includes(t) || f.mimetype.startsWith('audio/')) return { color: p('ocean'), icon: 'sound_filled' }
  if (['mov', 'mp4', 'mpv', '3gp'].includes(t) || isVideo(f)) return { color: p('mojito'), icon: 'video_filled' }
  switch (t) {
    case 'pdf':
      return { color: p('flamingo'), icon: 'pdf_file_filled' }
    case 'email':
      return { color: p('ocean'), icon: 'email_filled' }
    case 'binary':
    case 'zip':
    case 'numbers':
      return { color: p('gray'), icon: 'number' }
    case 'canvas':
    case 'quip':
      return { color: p('lagoon'), icon: 'canvas_content_filled' }
    case 'html':
    case 'js':
    case 'javascript':
      return { color: p('tomato'), icon: 'code' }
    case 'sql':
      return { color: p('tomato'), icon: 'database' }
    case 'key':
    case 'pages':
    case 'rtf':
      return { color: p('ocean'), icon: 'file_filled' }
    case 'gpres':
      return { color: p('tangerine'), icon: 'presentation' }
    case 'gsheet':
      return { color: p('mojito'), icon: 'spreadsheet' }
    case 'gdoc':
      return { color: p('ocean'), icon: 'document' }
    case 'doc':
    case 'docx':
      return { color: p('ocean'), icon: 'brand_microsoft_word_filled' }
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'csv':
      return { color: p('mojito'), icon: 'brand_microsoft_excel_filled' }
    case 'ppt':
    case 'pptx':
      return { color: p('tomato'), icon: 'brand_microsoft_ppt_filled' }
    case 'markdown':
    case 'md':
      return { color: p('gray'), icon: 'brand_markdown_filled' }
    case 'text':
    case 'txt':
      return { color: p('ocean'), icon: 'text' }
    case 'list':
      return { color: p('honeycomb'), icon: 'lists_filled' }
    default:
      return { color: 'var(--dt_color_surface_primary)', icon: 'file_filled' }
  }
}

interface Props {
  files: FileAttachment[]
  conversationId: string
  ts: string
  /** the text column's width, for expanded images (313 on a 393 pt screen) */
  columnWidth: number
}

export function MKFiles({ files, conversationId, ts, columnWidth }: Props) {
  const media = files.filter(isMedia)
  const others = files.filter((f) => !isMedia(f))
  if (media.length >= 2) {
    return (
      <>
        <MKMediaCarousel files={media} conversationId={conversationId} ts={ts} />
        {others.length > 0 && (
          <div className="mk-files">
            {others.map((f) => (
              <MKFileCard key={f.id} file={f} conversationId={conversationId} ts={ts} />
            ))}
          </div>
        )}
      </>
    )
  }
  return (
    <div className="mk-files">
      {others.map((f) => (
        <MKFileCard key={f.id} file={f} conversationId={conversationId} ts={ts} />
      ))}
      {media.map((f) => (
        <MKExpandedImage key={f.id} file={f} conversationId={conversationId} ts={ts} columnWidth={columnWidth} />
      ))}
    </div>
  )
}

/**
 * SKExpandedAttachment's size: the original size in pixels taken as points, capped by the column and 400; height from the
 * aspect ratio (5 : 8 when unknown), clamped to [2 × radius, 400] (SKExpandedAttachment.swift:77-85, 422-440, 542-572).
 */
export function expandedImageSize(width: number | undefined, height: number | undefined, columnWidth: number) {
  const w = Math.min(width || columnWidth, columnWidth, 400)
  const ratio = width && height ? height / width : 0.625
  return { width: w, height: Math.max(30, Math.min(400, w * ratio)) }
}

function openFile(file: FileAttachment, conversationId: string, ts: string) {
  // Remote files (Google Drive) open their link; the rest the full-screen file carousel
  // (AttachmentsAndLinksActionHandler.swift:116-199)
  if (file.externalUrl) window.open(file.externalUrl, '_blank', 'noopener')
  else useApp.getState().presentSheet('file-viewer', { conversationId, ts, fileId: file.id })
}

export function MKExpandedImage({ file, conversationId, ts, columnWidth, style }: { file: FileAttachment; conversationId: string; ts: string; columnWidth: number; style?: CSSProperties }) {
  const size = expandedImageSize(file.width, file.height, columnWidth)
  return (
    <button
      type="button"
      className="mk-image"
      style={{ width: size.width, height: size.height, ...style }}
      aria-label={file.title}
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        openFile(file, conversationId, ts)
      }}
    >
      <img src={asset(file.url)} alt="" draggable={false} />
    </button>
  )
}

export function MKFileCard({ file, conversationId, ts }: { file: FileAttachment; conversationId: string; ts: string }) {
  const { color, icon } = fileTypeStyle(file)
  // "<size> <type>" (FileUtility.swift:34-71)
  const subtitle = [fileSize(file.size), file.prettyType ?? file.filetype?.toUpperCase()].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className="mk-file"
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        openFile(file, conversationId, ts)
      }}
    >
      <span className="mk-file__row">
        <span className="mk-file__tile" style={{ background: color }}>
          <Icon name={icon} size={20} />
        </span>
        <span className="mk-file__text">
          <span className="mk-file__title">{file.title || file.name}</span>
          {subtitle && <span className="mk-file__subtitle">{subtitle}</span>}
        </span>
      </span>
      {file.preview && (
        <>
          <span className="mk-file__divider" />
          <span className="mk-file__preview" style={file.previewWidth && file.previewHeight ? { aspectRatio: `${file.previewWidth} / ${file.previewHeight}` } : undefined}>
            <img src={asset(file.preview)} alt="" draggable={false} />
          </span>
        </>
      )}
    </button>
  )
}

/** Several images or videos: "N attachments" over a 196 pt row that scrolls sideways (MediaCarouselEmbeddableViewController.swift:16-23, 92-111, 137-193). */
export function MKMediaCarousel({ files, conversationId, ts }: { files: FileAttachment[]; conversationId: string; ts: string }) {
  return (
    <div className="mk-carousel">
      <div className="mk-carousel__label">{plural(files.length, '1 attachment', '%@ attachments')}</div>
      <div className="mk-carousel__row" data-scroll-x data-no-swipe>
        {files.map((f) => {
          const landscape = !f.width || !f.height || f.width > f.height
          return (
            <button
              key={f.id}
              type="button"
              className="mk-image"
              style={{ width: landscape ? 260 : 164, height: 196 }}
              aria-label={f.title}
              data-tap
              onClick={(e) => {
                e.stopPropagation()
                openFile(f, conversationId, ts)
              }}
            >
              <img src={asset(f.url)} alt="" draggable={false} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
