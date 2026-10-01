import type { CanvasDoc, FileAttachment, Fixture, Message, SlackList, WorkspaceFile } from '../../../data/types'
import { mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { attachmentKind, attachmentStyle, fileKindStyle, type FileKind, type FileTypeStyle } from './fileTypes'
import type { DocsFileType, FilterMode, SortMode } from './state'

// What the Files screen lists: the workspace's canvases, lists and attachments (DocsItem: .canvas, .list, .thirdParty),
// from More › Files (fx.files), the canvases and lists the workspace holds (fx.canvases, fx.lists) and the files people
// shared in messages. The server's search.modules.files query is replaced by filtering and sorting here, the way
// DocsInteractor asks for it (filter type × file types × sort, DocsInteractor.swift:559-600).

export interface DocItem {
  id: string
  title: string
  kind: FileKind
  /** what tapping opens: CanvasRoute, ListViewRoute or FileRoute (DocsInteractor.swift:341-364) */
  opens: 'canvas' | 'list' | 'file'
  creatorId?: string
  /** ts of the last time you viewed it (lastRead) */
  lastViewed?: string
  /** ts it was last edited (lastEditedTimestamp, else created) */
  updated?: string
  sharedWithYou: boolean
  isTemplate?: boolean
  isSkill?: boolean
  /** images and videos: the 80 px thumbnail used as the ornament (DocsPresenter.swift:549-556) */
  thumbnail?: string
  /** the message attachment behind a file, when there is one */
  attachment?: FileAttachment
  style: FileTypeStyle
  fileType: DocsFileType
}

interface Sources {
  fx: Fixture
  messages: Record<string, Message[]>
  threads: Record<string, Message[]>
}

/** Which File types row a kind belongs to (the search query's type:… terms, DocsPaginationFilter.swift:92-116). */
export function fileTypeOf(kind: FileKind): DocsFileType {
  switch (kind) {
    case 'list':
      return 'lists'
    case 'spreadsheet':
    case 'gsheet':
      return 'spreadsheets'
    case 'ppt':
    case 'gpres':
      return 'presentations'
    case 'pdf':
      return 'pdfs'
    case 'audio':
      return 'audio'
    case 'video':
      return 'videos'
    case 'image':
      return 'images'
    case 'text':
      return 'snippets'
    case 'email':
      return 'emails'
    default:
      // canvases ("type:quip") and documents ("type:documents")
      return 'canvasAndDocs'
  }
}

const later = (a?: string, b?: string) => (!a ? b : !b ? a : parseFloat(a) >= parseFloat(b) ? a : b)
const earlier = (a?: string, b?: string) => (!a ? b : !b ? a : parseFloat(a) <= parseFloat(b) ? a : b)

interface Shared {
  file: FileAttachment
  userId: string
  first: string
  last: string
}

/** Every file attached to a message, by id: who shared it first, and when it was first and last shared. */
function sharedFiles({ messages, threads }: Sources): Map<string, Shared> {
  const out = new Map<string, Shared>()
  const visit = (m: Message) => {
    for (const f of m.files ?? []) {
      const prev = out.get(f.id)
      if (!prev) out.set(f.id, { file: f, userId: m.userId, first: m.ts, last: m.ts })
      else {
        if (parseFloat(m.ts) < parseFloat(prev.first)) Object.assign(prev, { userId: m.userId, first: m.ts })
        prev.last = later(prev.last, m.ts)!
      }
    }
  }
  for (const list of Object.values(messages)) list.forEach(visit)
  for (const list of Object.values(threads)) list.forEach(visit)
  return out
}

/** The newest message that links a file id (lists carry no timestamps of their own). */
function lastLinked({ messages, threads }: Sources, id: string): string | undefined {
  let ts: string | undefined
  const visit = (m: Message) => {
    if (m.text.includes(id)) ts = later(ts, m.ts)
  }
  for (const list of Object.values(messages)) list.forEach(visit)
  for (const list of Object.values(threads)) list.forEach(visit)
  return ts
}

const isImage = (f?: FileAttachment) => !!f && (f.mimetype.startsWith('image/') || f.mimetype.startsWith('video/'))

/** Every file the screen can list, unfiltered. */
export function allDocs(src: Sources): DocItem[] {
  const { fx } = src
  const shared = sharedFiles(src)
  const out = new Map<string, DocItem>()
  const canvases: Record<string, CanvasDoc> = fx.canvases ?? {}
  const lists: Record<string, SlackList> = fx.lists ?? {}

  // More › Files
  for (const w of (fx.files ?? []) as WorkspaceFile[]) {
    const att = shared.get(w.id)?.file
    const kind: FileKind = w.kind
    const canvas = canvases[w.id]
    out.set(w.id, {
      id: w.id,
      title: w.title,
      kind,
      opens: kind === 'canvas' ? 'canvas' : kind === 'list' ? 'list' : 'file',
      creatorId: w.creatorId,
      lastViewed: w.lastViewed,
      updated: canvas?.updated ?? w.lastViewed,
      sharedWithYou: w.sharedWithYou ?? w.creatorId !== fx.me,
      thumbnail: isImage(att) ? att!.url : undefined,
      attachment: att,
      style: att && kind !== 'canvas' && kind !== 'list' ? attachmentStyle(att) : fileKindStyle(kind),
      fileType: fileTypeOf(kind),
    })
  }
  // Canvases and lists the workspace has that More › Files doesn't list
  for (const c of Object.values(canvases)) {
    if (out.has(c.id)) continue
    out.set(c.id, {
      id: c.id,
      title: c.title,
      kind: 'canvas',
      opens: 'canvas',
      creatorId: c.creatorId,
      lastViewed: c.updated,
      updated: c.updated,
      sharedWithYou: c.creatorId !== fx.me,
      style: fileKindStyle('canvas'),
      fileType: 'canvasAndDocs',
    })
  }
  for (const l of Object.values(lists)) {
    if (out.has(l.id)) continue
    const ts = lastLinked(src, l.id)
    out.set(l.id, {
      id: l.id,
      title: l.title,
      kind: 'list',
      opens: 'list',
      creatorId: l.creatorId,
      lastViewed: ts,
      updated: ts,
      sharedWithYou: l.creatorId !== fx.me,
      style: fileKindStyle('list'),
      fileType: 'lists',
    })
  }
  // Files shared in messages ("attachments")
  for (const s of shared.values()) {
    const existing = out.get(s.file.id)
    if (existing) continue
    const kind = attachmentKind(s.file)
    out.set(s.file.id, {
      id: s.file.id,
      title: s.file.title || s.file.name,
      kind,
      opens: kind === 'canvas' && canvases[s.file.id] ? 'canvas' : kind === 'list' && lists[s.file.id] ? 'list' : 'file',
      creatorId: s.userId,
      lastViewed: s.last,
      updated: earlier(s.first, s.last),
      sharedWithYou: s.userId !== fx.me,
      thumbnail: isImage(s.file) ? (s.file.mimetype.startsWith('video/') ? s.file.preview : s.file.url) : undefined,
      attachment: s.file,
      style: attachmentStyle(s.file),
      fileType: fileTypeOf(kind),
    })
  }
  return [...out.values()]
}

export interface Overrides {
  starred: Record<string, boolean>
  deleted: Record<string, true>
  viewed: Record<string, string>
}

/** The rows for the current chip, file types and sort (DocsInteractor.applyFilterWithSort / getSortFunction). */
export function visibleDocs(items: DocItem[], me: string, filter: FilterMode, sort: SortMode, types: string[], o: Overrides): DocItem[] {
  const wanted = new Set(types)
  const viewedAt = (d: DocItem) => later(o.viewed[d.id], d.lastViewed)
  const rows = items
    .filter((d) => !o.deleted[d.id])
    .map((d) => ({ ...d, lastViewed: viewedAt(d) }))
    .filter((d) => wanted.has(d.fileType))
    .filter((d) => (filter === 'starred' ? !!o.starred[d.id] : filter === 'createdByYou' ? d.creatorId === me : filter === 'sharedWithYou' ? d.sharedWithYou : true))
  const ts = (x?: string) => (x ? parseFloat(x) : 0)
  // recently viewed = lastEngaged; last updated / created by you = timestampdesc; starred = relevant (kept in
  // recently-viewed order here)
  const byViewed = (a: DocItem, b: DocItem) => ts(b.lastViewed) - ts(a.lastViewed)
  const byUpdated = (a: DocItem, b: DocItem) => ts(b.updated) - ts(a.updated)
  if (filter === 'createdByYou') return rows.sort(byUpdated)
  if (filter === 'starred') return rows.sort(byViewed)
  return rows.sort(sort === 'recentlyViewed' ? byViewed : byUpdated)
}

/**
 * The row's secondary line, DocsItem.getLastRead / getLastUpdate (DocsDataTypes.swift:183-243): "Name · Last viewed
 * 5m ago" (last_viewed_time 9884, search_file_metadata 16162) under All + Recently viewed, else "Name · Updated 1d ago"
 * (lists_updated_time_subtitle 10734); under a minute "Just viewed now" (9794) / "Updated < 1 minute ago" (9881).
 * The time is relativeFromTodayString(verbosity: .simple): 5m ago, 3h ago, 1d ago, Sep 12th.
 */
export function docSubtitle(d: DocItem, fx: Fixture, filter: FilterMode, sort: SortMode, now = Date.now()): string | undefined {
  const viewed = filter === 'all' && sort === 'recentlyViewed'
  const ts = viewed ? (d.lastViewed ?? d.updated) : (d.updated ?? d.lastViewed)
  if (!ts) return undefined
  const minutes = Math.floor((now - parseFloat(ts) * 1000) / 60000)
  const time = minutes < 1 ? (viewed ? 'Just viewed now' : 'Updated < 1 minute ago') : `${viewed ? 'Last viewed' : 'Updated'} ${mkTimestamp(ts, 'relative', now)}`
  const user = d.creatorId ? fx.users[d.creatorId] : undefined
  return user ? `${user.name} · ${time}` : time
}

/** A file's permalink, for Copy Link (files.slack.com's /docs and /lists paths, as demo-canvas.ts writes them). */
export function docLink(fx: Fixture, d: DocItem): string {
  const base = `https://${fx.workspace.domain}.slack.com`
  if (d.opens === 'canvas') return `${base}/docs/${fx.workspace.id}/${d.id}`
  if (d.opens === 'list') return `${base}/lists/${fx.workspace.id}/${d.id}`
  return `${base}/files/${fx.me}/${d.id}`
}

/** A file by id, for the viewers: its attachment (from any message) and its More › Files entry. */
export function findFile(src: Sources, id: string): { attachment?: FileAttachment; file?: WorkspaceFile; sharedBy?: string; sharedAt?: string } {
  const s = sharedFiles(src).get(id)
  const file = (src.fx.files ?? []).find((f) => f.id === id)
  return { attachment: s?.file, file, sharedBy: s?.userId ?? file?.creatorId, sharedAt: s?.first ?? file?.lastViewed }
}
