import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { useDevice } from '../../../sim/store'
import type { SheetProps } from '../../nav/registry'
import { Icon } from '../../../icons/Icon'
import { asset } from '../../../lib/asset'
import { SKButton } from '../../../slackkit/SKButton'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { fileTypeGlyphColor, fileTypeIcon, mkShortOrdinal, mkTime } from '../../../messagekit/MKMessagePreview'
import type { Conversation, FileAttachment, Fixture, Message, WorkspaceFile } from '../../../data/types'
import { attachmentKind, fileKindLabel } from './fileTypes'

// The file viewer: Slack's file carousel (FileCarouselViewController, opened from a message's image or file card —
// BlockMediaHandler.swift:43-297 — with the iOS 26 zoom transition), for the 'file-viewer' overlay:
//
//   presentSheet('file-viewer', { conversationId, ts, fileId })     a message's file (swipe between its files)
//   presentSheet('file-viewer', { fileId })                         any file the workspace has
//
// Black behind everything (ColorSet.Constants.black, FileCarouselViewController.swift:517-528). The chrome is two
// Liquid Glass toolbars forced to the dark style (FileCarouselToolbarHelper.swift: overrideUserInterfaceStyle = .dark):
// on top, the header title item (FileCarouselHeaderTitleView: a 28 pt round avatar, 6 pt, the author in smallBodyBold
// and the time in smallBody 4 pt later, the conversation below in caption; insets 0 / 5 / 0 / 8) and the close button
// (svgClose, its own glass); at the bottom, the actions left-aligned (thread with its reply count, share; bookmark for
// files that aren't images or media) and the options menu on the right (FileCarouselPresenter.swift:108-180). Tapping
// toggles the chrome (0.3 s spring, the bars sliding 50 pt out, :1060-1076); pages swipe sideways; pulling down
// dismisses past 20 % of the height or 1000 pt/s, the view rounding to 16 pt and shrinking 5 % per half screen
// (MediaPlayerTransitionDelegate.swift:90-124; FileCarouselViewController.swift:1193-1204, 1436-1440).
// Images fit the screen (ImageViewer); PDFs show their page on sk_foreground_soft_solid (PDFViewerViewController.swift:35);
// anything else is GenericFileViewController's preview: a 72 pt file icon, the file info in bodyBold
// sk_foreground_high_solid and a primary "View File" button, 12 pt apart on black (GenericFileViewController.swift:20-100).

interface Props extends SheetProps {
  conversationId?: string
  ts?: string
  fileId: string
}

interface Item {
  id: string
  title: string
  attachment?: FileAttachment
  file?: WorkspaceFile
}

interface Resolved {
  items: Item[]
  index: number
  message?: Message
  conversationId?: string
  threadTs?: string
}

type Sources = { fx: Fixture; messages: Record<string, Message[]>; threads: Record<string, Message[]> }

/** The message that holds the file (the one given, else the first that shares it) and its files as the pages. */
function resolve(src: Sources, fileId: string, conversationId?: string, ts?: string): Resolved {
  const find = (): { m: Message; c: string; threadTs?: string } | undefined => {
    if (conversationId && ts) {
      const m = src.messages[conversationId]?.find((x) => x.ts === ts)
      if (m) return { m, c: conversationId }
      for (const [k, list] of Object.entries(src.threads))
        if (k.startsWith(`${conversationId}/`)) {
          const r = list.find((x) => x.ts === ts)
          if (r) return { m: r, c: conversationId, threadTs: k.split('/')[1] }
        }
    }
    for (const [c, list] of Object.entries(src.messages)) {
      const m = list.find((x) => x.files?.some((f) => f.id === fileId))
      if (m) return { m, c }
    }
    for (const [k, list] of Object.entries(src.threads)) {
      const m = list.find((x) => x.files?.some((f) => f.id === fileId))
      if (m) return { m, c: k.split('/')[0], threadTs: k.split('/')[1] }
    }
    return undefined
  }
  const hit = find()
  const listed = (src.fx.files ?? []).find((f) => f.id === fileId)
  if (hit && hit.m.files?.some((f) => f.id === fileId)) {
    const items = hit.m.files.map((f) => ({ id: f.id, title: f.title || f.name, attachment: f, file: (src.fx.files ?? []).find((w) => w.id === f.id) }))
    return { items, index: Math.max(0, items.findIndex((i) => i.id === fileId)), message: hit.m, conversationId: hit.c, threadTs: hit.threadTs }
  }
  if (listed) return { items: [{ id: listed.id, title: listed.title, file: listed }], index: 0 }
  return { items: [{ id: fileId, title: 'File' }], index: 0 }
}

/** relativeFromTodayString(verbosity: .extended): "5h", "3m", "now" today; "Yesterday at 10:40 AM"; "Sep 25th at 9:10 AM"
 *  (TimeUtility.swift:556-620; FileCarouselInteractor.swift:594-597). */
function extendedTime(ts: string, now = new Date()): string {
  const d = new Date(parseFloat(ts) * 1000)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((day(now) - day(d)) / 86_400_000)
  if (days === 1) return `Yesterday at ${mkTime(d)}`
  if (days !== 0) return `${mkShortOrdinal(d, now)} at ${mkTime(d)}`
  const secs = Math.floor((now.getTime() - d.getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 1) return `${h}h`
  if (h === 1) return '1h'
  if (m >= 1 || secs > 1) return `${Math.max(1, m)}m`
  return 'now'
}

/** conversation.nameWithIconPrefix: "#name", a lock before a private channel's name, else the conversation's name */
function ConversationName({ conv, fx }: { conv?: Conversation; fx: Fixture }) {
  if (!conv) return null
  if (conv.type === 'channel') return <>#{conv.name}</>
  if (conv.type === 'private')
    return (
      <>
        <Icon name="lock" size={12} className="fv-title__lock" />
        {conv.name}
      </>
    )
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return <>{u?.name ?? conv.name}</>
}

/** A stand-in attachment for a More › Files entry without one, so it gets its type's icon and color. */
function asAttachment(f: WorkspaceFile): FileAttachment {
  const filetype = { canvas: 'canvas', list: 'list', pdf: 'pdf', doc: 'docx', spreadsheet: 'xlsx', image: 'png', video: 'mp4' }[f.kind]
  const mimetype = f.kind === 'image' ? 'image/png' : f.kind === 'video' ? 'video/mp4' : 'application/octet-stream'
  return { id: f.id, name: f.title, title: f.title, mimetype, url: '', filetype }
}

export function FileViewerSheet({ sheetKey, conversationId, ts, fileId }: Props) {
  const sheet = useSheet()
  const device = useDevice()
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const dismissSheet = useApp((s) => s.dismissSheet)
  const openThread = useApp((s) => s.openThread)
  const showToast = useApp((s) => s.showToast)
  const r = useMemo(() => resolve({ fx, messages, threads }, fileId, conversationId, ts), [fx, messages, threads, fileId, conversationId, ts])
  const [page, setPage] = useState(r.index)
  const [chrome, setChrome] = useState(true)
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [drag, setDrag] = useState<{ dx: number; dy: number; axis: 'x' | 'y' | null; active: boolean }>({ dx: 0, dy: 0, axis: null, active: false })
  const g = useRef<{ x0: number; y0: number; t0: number; scale: number; h: number; w: number } | null>(null)
  const item = r.items[page] ?? r.items[0]
  const close = (then?: () => void) => (sheet ? sheet.dismiss(then) : (dismissSheet(sheetKey), then?.()))

  const author = r.message ? fx.users[r.message.userId] : item.file ? fx.users[item.file.creatorId] : undefined
  const time = r.message ? extendedTime(r.message.ts) : item.file ? extendedTime(item.file.lastViewed) : ''
  const conv = r.conversationId ? fx.conversations[r.conversationId] : undefined
  const replyCount = r.message?.replyCount ?? 0

  // --------------------------------------------------------------------------------------------- gestures
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest('button, a, [data-no-drag]')) return
    const el = e.currentTarget
    const box = el.getBoundingClientRect()
    g.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), scale: box.width / el.offsetWidth || 1, h: el.offsetHeight, w: el.offsetWidth }
    el.setPointerCapture?.(e.pointerId)
    setDrag({ dx: 0, dy: 0, axis: null, active: true })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = g.current
    if (!s) return
    const dx = (e.clientX - s.x0) / s.scale
    const dy = (e.clientY - s.y0) / s.scale
    setDrag((d) => {
      let axis = d.axis
      if (!axis && Math.hypot(dx, dy) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      return { dx, dy, axis, active: true }
    })
  }
  const onPointerUp = () => {
    const s = g.current
    g.current = null
    if (!s) return
    const secs = Math.max(0.016, (performance.now() - s.t0) / 1000)
    const d = drag
    setDrag({ dx: 0, dy: 0, axis: null, active: false })
    if (!d.axis) return setChrome((c) => !c) // a tap toggles the chrome (didTapScreen)
    if (d.axis === 'x') {
      const v = d.dx / secs
      if ((d.dx < -s.w * 0.25 || v < -500) && page < r.items.length - 1) setPage(page + 1)
      else if ((d.dx > s.w * 0.25 || v > 500) && page > 0) setPage(page - 1)
      return
    }
    // pull down to dismiss: past 20 % of the height or faster than 1000 pt/s
    if (d.dy > 0 && (d.dy / s.h > 0.2 || d.dy / secs > 1000)) close()
  }

  const pull = drag.axis === 'y' ? Math.max(0, drag.dy) : 0
  const h = g.current?.h ?? device.height
  const progress = Math.min(1, pull / h)
  // 5 % smaller per half screen of pull, 16 pt corners while dragging
  const pullStyle = pull ? { transform: `translateY(${pull}px) scale(${1 - 0.05 * (pull / (h / 2))})`, borderRadius: 16 } : undefined
  const trackDx = drag.axis === 'x' ? drag.dx * (page === 0 && drag.dx > 0 ? 0.35 : page === r.items.length - 1 && drag.dx < 0 ? 0.35 : 1) : 0

  const att = item.attachment ?? (item.file ? asAttachment(item.file) : undefined)
  const isImage = !!item.attachment && (item.attachment.mimetype.startsWith('image/') || attachmentKind(item.attachment) === 'image')
  const isMedia = !!att && (att.mimetype.startsWith('video/') || att.mimetype.startsWith('audio/'))

  // The options button presents the FileAction sheet, not a menu (FileCarouselToolbarHelper.swift:168-176 has no menu;
  // FileCarouselFeature.swift:408-436): see FileActionsSheet.tsx
  const optionsMenu = () =>
    useApp.getState().presentSheet('file-actions', {
      title: item.title,
      kind: isImage ? 'image' : att?.mimetype.startsWith('video/') ? 'video' : att?.mimetype.startsWith('audio/') ? 'audio' : 'file',
      mine: (r.message?.userId ?? item.file?.creatorId) === fx.me,
      saved: !!saved[item.id],
      onToggleSaved: () => setSaved((s) => ({ ...s, [item.id]: !s[item.id] })),
    })
  const showBookmark = !!att && !isImage && !isMedia

  return (
    <div className={`fv${sheet?.closing ? ' is-closing' : ''}${drag.active ? ' is-dragging' : ''}`} data-screen="file-viewer">
      <div className="fv__backdrop" style={{ opacity: 1 - progress * 0.8 }} />
      <div className="fv__stage" style={pullStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {r.items.map((it, i) => (
          <div key={it.id ?? i} className="fv__page" style={{ transform: `translateX(calc(${(i - page) * 100}% + ${trackDx}px))` }} aria-hidden={i !== page || undefined}>
            <Page item={it} onOpen={(url) => window.open(url, '_blank', 'noopener')} onViewFile={() => showToast('Not in the prototype')} />
          </div>
        ))}
      </div>

      <div className={`fv__chrome fv__top${chrome ? '' : ' is-hidden'}`} data-appearance="dark">
        <div className="fv-glass fv-title" role="heading" aria-level={1}>
          <SKMemberAvatar src={author?.avatar} name={author?.realName ?? item.title} size={28} round />
          <div className="fv-title__info">
            <div className="fv-title__line">
              <span className="fv-title__name">{author?.name ?? item.title}</span>
              {time && <span className="fv-title__time">{time}</span>}
            </div>
            {conv && (
              <div className="fv-title__context">
                <ConversationName conv={conv} fx={fx} />
              </div>
            )}
          </div>
        </div>
        <button type="button" className="fv-glass fv-circle" aria-label="Dismiss" onClick={() => close()} data-tap>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className={`fv__chrome fv__bottom${chrome ? '' : ' is-hidden'}`} data-appearance="dark">
        <div className="fv-glass fv-group">
          {r.message && (
            <button
              type="button"
              className="fv-group__item"
              aria-label="Reply in Thread"
              onClick={() => close(() => openThread(r.conversationId!, r.threadTs ?? r.message!.ts))}
              data-tap
            >
              <Icon name="threads" size={20} />
              {replyCount > 0 && <span className="fv-group__count">{replyCount}</span>}
            </button>
          )}
          <button type="button" className="fv-group__item" aria-label="Share" onClick={() => showToast('Not in the prototype')} data-tap>
            <Icon name="share_message" size={20} />
          </button>
          {showBookmark && (
            <button type="button" className="fv-group__item" aria-label={saved[item.id] ? 'Saved' : 'Save'} onClick={() => setSaved((s) => ({ ...s, [item.id]: !s[item.id] }))} data-tap>
              <Icon name={saved[item.id] ? 'bookmark_filled' : 'bookmark'} size={20} />
            </button>
          )}
        </div>
        <button type="button" className="fv-glass fv-circle" aria-label="More" onClick={optionsMenu} data-tap>
          <Icon name="ellipsis_horizontal_filled" size={20} />
        </button>
      </div>
      {r.items.length > 1 && <div className="fv__sr" aria-live="polite">{`${page + 1} of ${r.items.length}`}</div>}
    </div>
  )
}

function Page({ item, onOpen, onViewFile }: { item: Item; onOpen: (url: string) => void; onViewFile: () => void }) {
  const a = item.attachment
  if (a && (a.mimetype.startsWith('image/') || attachmentKind(a) === 'image') && a.url)
    return (
      <div className="fv-image">
        <img src={asset(a.url)} alt={item.title} draggable={false} />
      </div>
    )
  if (a && a.preview && attachmentKind(a) === 'pdf')
    return (
      <div className="fv-pdf">
        <img src={asset(a.preview)} alt={item.title} draggable={false} />
      </div>
    )
  if (!a && !item.file)
    return (
      <div className="fv-generic">
        <Icon name="lock_filled" size={20} color="var(--dt_color_content_inverse_primary)" />
        {/* FileNoAccessOverlayView's defaults (file_access_denied_title / _message, yaml:6498 / 6494) */}
        <div className="fv-generic__info">This file isn’t visible to you</div>
      </div>
    )
  const f = a ?? asAttachment(item.file!)
  const kind = attachmentKind(f)
  const gdoc = kind === 'gdoc' || kind === 'gsheet' || kind === 'gpres'
  // fileInfoText / actionButtonText (GenericFileInteractor.swift:100-136): Google files point to Drive
  // (the_most_up_to_date_version_of_this_file_is_in_google_drive, view_in_browser); else "<type> File" and View File
  const info = gdoc ? 'The most up to date version of this file is in Google Drive' : `${f.prettyType ?? fileKindLabel(kind)} File`
  return (
    <div className="fv-generic">
      <Icon name={fileTypeIcon(f)} size={72} color={fileTypeGlyphColor(f)} />
      <div className="fv-generic__info">{info}</div>
      <SKButton
        title={gdoc ? 'View in Browser' : 'View File'}
        buttonStyle="primary"
        size="medium"
        onClick={() => (gdoc && (f.externalUrl ?? f.url) ? onOpen(f.externalUrl ?? f.url) : onViewFile())}
      />
    </div>
  )
}
