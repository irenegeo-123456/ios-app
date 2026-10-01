import { useMemo, useState } from 'react'
import { useApp, type Route } from '../../store'
import { NavBar } from '../../nav/NavBar'
import { BackButton, ConvoBar } from '../conversation/ConversationNavBar'
import { SKGenericEntity, SKHeaderEntity } from '../../../slackkit/SKEntities'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { VideoDurationBadge } from '../../../slackkit/attachmentBadges'
import { mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { asset } from '../../../lib/asset'
import { FileTypeOrnament, attachmentKind, attachmentStyle } from '../files/fileTypes'
import type { FileAttachment, Fixture, Message } from '../../../data/types'
import { TitlePill, channelLabel, isChannelConversation, useScreenConversation } from './shared'
import './conversation-files.css'

// The conversation's Files page (spec channels-people.md §7; MG/ = Modules/Features/MediaGallery/Implementation), with
// `ios_channel_links_in_files_tab` off, its default: one scrolling page on basePrimary — "Documents - N"
// ("Show All" past 3) and at most 3 document rows, then "Images & Videos - N" and the media by month in a 3-column
// grid of square tiles (MG/MediaGalleryPresenter.swift:100-182; MediaGalleryLayoutDelegate.swift:12-15,72-102). "Show
// All" pushes the documents list, titled "Documents" over "#channel" (FilesList, FilesListPresenter.swift:115-154). A
// document or a tile opens the file viewer.
//
//   push({ screen: 'conversation-files', conversationId })
//   push({ screen: 'conversation-files', conversationId, documents: true })      the full documents list

interface Shared {
  file: FileAttachment
  message: Message
  threadTs?: string
}

/** Everything shared in the conversation and its threads, newest first. */
function sharedFiles(conversationId: string, messages: Message[] | undefined, threads: Record<string, Message[]>): Shared[] {
  const out: Shared[] = []
  for (const m of messages ?? []) for (const file of m.files ?? []) out.push({ file, message: m })
  for (const [key, replies] of Object.entries(threads)) {
    const [cid, parent] = key.split('/')
    if (cid !== conversationId) continue
    for (const m of replies) if (m.ts !== parent) for (const file of m.files ?? []) out.push({ file, message: m, threadTs: parent })
  }
  return out.sort((a, b) => parseFloat(b.message.ts) - parseFloat(a.message.ts))
}

const isMedia = (f: FileAttachment) => {
  const kind = attachmentKind(f)
  return kind === 'image' || kind === 'video'
}

/** "This Month" (yaml:20042), "Last Month" (yaml:9852), else "MMMM yyyy" (MG/FileSegmenter.swift:11-62). */
function monthTitle(ts: string, now = new Date()): string {
  const d = new Date(parseFloat(ts) * 1000)
  const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth()
  if (months <= 0) return 'This Month'
  if (months === 1) return 'Last Month'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** "%@ · %@" (`search_file_metadata`, yaml:16162): the uploader and relativeFromTodayString .simple (MG:274-289). */
function fileSubtitle(fx: Fixture, s: Shared): string {
  const user = fx.users[s.message.userId]
  const when = mkTimestamp(s.message.ts, 'relative')
  return user ? `${user.name} · ${when}` : when
}

export function ConversationFilesScreen({ route }: { route: Route }) {
  const id = useScreenConversation(route)
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => (id ? s.messages[id] : undefined))
  const threads = useApp((s) => s.threads)
  const push = useApp((s) => s.push)
  const presentSheet = useApp((s) => s.presentSheet)
  const [scrolled, setScrolled] = useState(false)
  const all = useMemo(() => (id ? sharedFiles(id, messages, threads) : []), [id, messages, threads])
  const conv = id ? fx.conversations[id] : undefined
  if (!id || !conv)
    return (
      <div className="ios-pushed-screen cfiles" data-screen="conversation-files">
        <ConvoBar leading={<BackButton />} />
      </div>
    )

  const docs = all.filter((s) => !isMedia(s.file))
  const media = all.filter((s) => isMedia(s.file))
  const open = (s: Shared) => presentSheet('file-viewer', { conversationId: id, ts: s.message.ts, fileId: s.file.id })
  const docRow = (s: Shared) => (
    <SKGenericEntity
      key={`${s.message.ts}/${s.file.id}`}
      // the file-type box, 36 pt, radius 9, the type's palette _50 with a white glyph (UIColor+FileTypeExtensions.swift:15-130)
      ornament={<FileTypeOrnament style={attachmentStyle(s.file)} size={36} />}
      primaryText={s.file.title || s.file.name}
      primaryTextNumberOfLines={3}
      secondaryText={fileSubtitle(fx, s)}
      secondaryTextNumberOfLines={2}
      size="medium"
      onSelected={() => open(s)}
    />
  )

  // ---- "Show All": the documents list (FilesList), "Documents" over "#channel"
  if (route.documents) {
    return (
      <div className="ios-pushed-screen cfiles" data-screen="conversation-files">
        <div className="ios-scroll cfiles__list" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
          {docs.map(docRow)}
          <div className="cfiles__end" />
        </div>
        <NavBar scrolled={scrolled} title={<SKNavigationTitle title="Documents" subtitle={isChannelConversation(conv) ? channelLabel(conv) : undefined} />} />
      </div>
    )
  }

  // media by month, newest first
  const months: { title: string; items: Shared[] }[] = []
  for (const s of media) {
    const title = monthTitle(s.message.ts)
    const last = months.at(-1)
    if (last?.title === title) last.items.push(s)
    else months.push({ title, items: [s] })
  }

  return (
    <div className="ios-pushed-screen cfiles" data-screen="conversation-files">
      <div className="ios-scroll cfiles__list" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        {/* "Documents" (yaml:5358) + " - N"; "Show All" (yaml:17695) when N > 3 (MG/MediaGalleryPresenter.swift:143-159) */}
        <SKHeaderEntity
          primaryText={docs.length ? `Documents - ${docs.length}` : 'Documents'}
          rightButton={docs.length > 3 ? { text: 'Show All' } : undefined}
          onRightButtonTapped={() => push({ screen: 'conversation-files', conversationId: id, documents: true })}
        />
        {docs.length ? (
          docs.slice(0, 3).map(docRow)
        ) : (
          // "No documents shared yet." (`no_documents_new`, yaml:12187): files.svg in contentSecondary on surfacePrimary (MG:47-54,107-124)
          <SKGenericEntity
            primaryText={<span className="cfiles__empty-text">No documents shared yet.</span>}
            primaryTextNumberOfLines={2}
            ornament={{ icon: { icon: 'files', color: 'var(--dt_color_content_secondary)' }, backgroundColor: 'var(--dt_color_surface_primary)' }}
            size="medium"
          />
        )}
        {/* "Images & Videos" (yaml:8908) + " - N", the documents section's footer drawn as a header (MG:161-171) */}
        <SKHeaderEntity primaryText={media.length ? `Images & Videos - ${media.length}` : 'Images & Videos'} />
        {media.length === 0 ? (
          // "No images or videos shared yet." (`no_images_or_videos_new`, yaml:12214) with image_input.svg (MG:253-270)
          <SKGenericEntity
            primaryText={<span className="cfiles__empty-text">No images or videos shared yet.</span>}
            primaryTextNumberOfLines={2}
            ornament={{ icon: { icon: 'image_input', color: 'var(--dt_color_content_secondary)' }, backgroundColor: 'var(--dt_color_surface_primary)' }}
            size="medium"
          />
        ) : (
          months.map((m) => (
            <section key={m.title}>
              {/* SKListHeaderView .small, the title in smallBodyBold contentPrimary (MG/MediaGalleryPresenter.swift:179-182) */}
              <SKHeaderEntity size="small" primaryText={<span className="cfiles__month">{m.title}</span>} />
              <div className="cfiles__grid">
                {m.items.map((s) => {
                  const video = attachmentKind(s.file) === 'video'
                  const src = video ? (s.file.preview ?? s.file.url) : s.file.url
                  return (
                    <button key={`${s.message.ts}/${s.file.id}`} type="button" className="cfiles__tile" onClick={() => open(s)} aria-label={s.file.title || s.file.name} data-tap>
                      <img src={asset(src)} alt="" draggable={false} />
                      {video && <VideoDurationBadge durationInSeconds={s.file.duration} className="cfiles__duration" />}
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
        <div className="cfiles__end" />
      </div>
      {/* the conversation's header on its Files page: files_filled, the name, "Files" (`channel_tab_files`, yaml:3714) */}
      <ConvoBar leading={<BackButton />} scrolled={scrolled} title={<TitlePill conversationId={id} page={{ icon: 'files_filled', title: 'Files' }} />} />
    </div>
  )
}
