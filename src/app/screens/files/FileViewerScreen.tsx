import { useMemo, useState } from 'react'
import { useApp, type Route } from '../../store'
import { GlassButton, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { asset } from '../../../lib/asset'
import { SKButton } from '../../../slackkit/SKButton'
import { mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { FileTypeOrnament, attachmentStyle, fileKindLabel, fileKindStyle, attachmentKind } from './fileTypes'
import { findFile } from './data'

// A file opened from Files, Search or Slackbot's sources (FileRoute): a brief stand-in for Slack's viewers
// (ImageViewer, PDFViewer, the file details page), in a pushed screen with the file's name as the title. Images and PDF
// previews show fitted; anything else shows its type box, name and details, and "Open in …" for Drive files.
// The viewers themselves aren't specced (spec search-slackbot-huddles.md §4.2 only names FileRoute).

/** "1.2 MB", "482 KB" (FileSizeUtility's short byte format) */
function bytes(n?: number) {
  if (!n) return undefined
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} MB`
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`
  return `${n} B`
}

export function FileViewerScreen({ route }: { route: Route }) {
  const id = String(route.fileId ?? route.id ?? '')
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const presentSheet = useApp((s) => s.presentSheet)
  const [scrolled, setScrolled] = useState(false)
  const found = useMemo(() => findFile({ fx, messages, threads }, id), [fx, messages, threads, id])
  const att = found.attachment
  const file = found.file
  // the More › Files title first: it's the name the row showed
  const title = file?.title || att?.title || att?.name || 'File'
  const kind = att ? attachmentKind(att) : (file?.kind ?? 'unknown')
  const style = att ? attachmentStyle(att) : fileKindStyle(kind)
  const typeLabel = att?.prettyType ?? fileKindLabel(kind)
  const who = found.sharedBy ? fx.users[found.sharedBy]?.name : undefined
  const when = found.sharedAt ? mkTimestamp(found.sharedAt, 'absolute') : undefined
  // "Name · date" (search_file_metadata "%@ · %@", yaml:16162)
  const meta = [who, when].filter(Boolean).join(' · ')
  const image = att && att.mimetype.startsWith('image/') ? att.url : att?.preview
  const missing = !att && !file
  // tapping the preview opens the file carousel (images, PDFs, the file's preview page)
  const view = () => presentSheet('file-viewer', { fileId: id })

  return (
    <div className="ios-pushed-screen file-viewer" data-screen="file">
      <div className="ios-scroll file-viewer__scroll" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 0)}>
        <div className="file-viewer__content">
          {missing ? (
            <div className="file-viewer__missing">
              <Icon name="lock_filled" size={20} color="var(--dt_color_content_primary)" />
              {/* FileNoAccessOverlayView's defaults: file_access_denied_title / _message (yaml:6498, 6494) */}
              <div className="file-viewer__missing-title">This file isn’t visible to you</div>
              <div className="file-viewer__missing-body">This file is only visible to members of the conversation where it was originally shared.</div>
            </div>
          ) : image ? (
            <button type="button" className="file-viewer__media" aria-label={`View ${title}`} onClick={view}>
              <img src={asset(image)} alt={title} draggable={false} />
            </button>
          ) : (
            <div className="file-viewer__card" onClick={(e) => !(e.target as Element).closest('button') && view()}>
              <FileTypeOrnament style={style} size={56} />
              <div className="file-viewer__name">{title}</div>
              <div className="file-viewer__type">{[typeLabel, bytes(att?.size)].filter(Boolean).join(' · ')}</div>
              {att?.externalUrl && (
                <SKButton
                  title={`Open in ${att.prettyType ?? 'browser'}`}
                  buttonStyle="outlineDefault"
                  size="medium"
                  onClick={() => window.open(att.externalUrl, '_blank', 'noopener')}
                />
              )}
            </div>
          )}
          {!missing && meta && <div className="file-viewer__meta">{meta}</div>}
        </div>
      </div>
      <NavBar
        title={title}
        subtitle={typeLabel}
        scrolled={scrolled}
        trailing={
          !missing && (
            <GlassButton
              label="Show more options"
              // the file's actions are the FileAction sheet, as from the file carousel (FileActionsSheet.tsx)
              onClick={() =>
                presentSheet('file-actions', {
                  title,
                  kind: att?.mimetype.startsWith('image/') ? 'image' : att?.mimetype.startsWith('video/') ? 'video' : att?.mimetype.startsWith('audio/') ? 'audio' : 'file',
                  mine: (found.sharedBy ?? file?.creatorId) === fx.me,
                })
              }
            >
              <Icon name="ellipsis_horizontal_filled" size={20} />
            </GlassButton>
          )
        }
      />
    </div>
  )
}
