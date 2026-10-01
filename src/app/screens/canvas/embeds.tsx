import { useMemo } from 'react'
import { useApp } from '../../store'
import { MKMessagePreview, MKMemberOrnament, mkPreviewContent, mkTimestamp } from '../../../messagekit/MKMessagePreview'
import type { Message } from '../../../data/types'
import { FileTypeOrnament, fileKindLabel, fileKindStyle, attachmentStyle } from '../files/fileTypes'
import { allDocs } from '../files/data'

// The cards a canvas embeds (the Quip markup's .card-view, drawn with Slack's components): a message as MessageKit's
// preview, a canvas / list / file as its type box, title and type. Drawn into the article with portals.

/** An embedded message: MessageKit's preview in a card (the canvas's embeddedUiCardContainer). */
export function MessageEmbed({ conversationId, ts }: { conversationId: string; ts: string }) {
  const fx = useApp((s) => s.fx)
  const msg = useApp((s) => findMessage(s.messages, s.threads, conversationId, ts))
  const openMessage = useApp((s) => s.openMessage)
  if (!msg) return null
  const u = fx.users[msg.userId]
  const conv = fx.conversations[conversationId]
  const content = mkPreviewContent(msg)
  const where = conv ? (conv.type === 'channel' || conv.type === 'private' ? `#${conv.name}` : conv.name) : undefined
  return (
    <div className="cv-embed" onClick={(e) => e.stopPropagation()}>
      <MKMessagePreview
        ornament={<MKMemberOrnament src={u?.avatar} name={u?.realName ?? 'Someone'} />}
        primaryText={u?.name ?? 'Someone'}
        timestamp={mkTimestamp(ts, 'relative')}
        body={content.body}
        files={content.files}
        header={where}
        onClick={() => openMessage(conversationId, ts)}
      />
    </div>
  )
}

/** An embedded canvas, list or file: its type box, title and type (a file card). */
export function FileEmbed({ fileId }: { fileId: string }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const push = useApp((s) => s.push)
  const d = useMemo(() => allDocs({ fx, messages, threads }).find((x) => x.id === fileId), [fx, messages, threads, fileId])
  if (!d) return null
  const open = () => (d.opens === 'canvas' ? push({ screen: 'canvas', canvasId: d.id }) : d.opens === 'list' ? push({ screen: 'list', listId: d.id }) : push({ screen: 'file', fileId: d.id }))
  const style = d.attachment ? attachmentStyle(d.attachment) : fileKindStyle(d.kind)
  return (
    <div className="cv-embed cv-file" role="button" data-tap onClick={(e) => (e.stopPropagation(), open())}>
      <FileTypeOrnament style={style} thumbnail={d.thumbnail} />
      <div className="cv-file__text">
        <div className="cv-file__title">{d.title}</div>
        <div className="cv-file__type">{fileKindLabel(d.kind)}</div>
      </div>
    </div>
  )
}

function findMessage(messages: Record<string, Message[]>, threads: Record<string, Message[]>, conversationId: string, ts: string): Message | undefined {
  const m = messages[conversationId]?.find((x) => x.ts === ts)
  if (m) return m
  for (const [k, list] of Object.entries(threads))
    if (k.startsWith(`${conversationId}/`)) {
      const r = list.find((x) => x.ts === ts)
      if (r) return r
    }
  return undefined
}
