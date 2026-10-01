import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKEntityRow } from '../../../slackkit/SKEntity'
import { SKTokenView } from '../../../slackkit/SKTokenView'
import { MKMessagePreview } from '../../../messagekit/MKMessagePreview'
import { conversationTitle, displayName, ordinalSuffix, tsDate } from '../../../messagekit/format'
import type { Conversation, Fixture, Message } from '../../../data/types'
import { SheetBar } from '../ui/SheetBar'
import { findMessage, useDismissIfMissing } from '../shared'
import './forward.css'

// Forward Message (ShareMessage; SM = Modules/Features/ShareMessage/Implementation, SMVC = SM/ShareMessageViewController
// .swift). A form sheet: "Cancel" and "Send" in Lato Bold 17 highlight1 (Send only once there's a destination), then
// between two 1 pt outlineTertiary rules the 50 pt destination field — "Forward to…" — the message field "Add a message,
// if you’d like" (placeholder contentTertiary, SM/ShareMessagePresenter.swift:184-187, September 2026), and the message:
// since September MessageKit's MKMessagePreview 15 pt in, in a 1 px outlinePrimary border with 8 pt corners
// (SMVC:215-219,491-492,1330-1348; SM/ShareMessageDataTypes.swift:229-251). June drew the legacy ShareMessageView card
// (24 pt avatar, "Posted in #channel | date"), as `useMessageKitForShareMessage` was off; that view is gone now.
// This assumes the team allows forwarding private messages
// (teamAllowsPrivateMessageForwarding): the wording is "Forward …" rather than "Share …". Sending posts your text with the
// message attached, closes, and opens the destination (navigateToConversationAfterSharing, NavigationDestination.swift:29-36).
//
//   presentSheet('forward', { conversationId, ts, threadTs? })

interface Props {
  sheetKey: string
  conversationId: string
  ts: string
  threadTs?: string
}

const HIGHLIGHT = 'var(--dt_color_content_highlight_1)'

export function ForwardSheet({ conversationId, ts, threadTs }: Props) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const message = useApp((s) => findMessage(s, conversationId, ts, threadTs))
  const origin = fx.conversations[conversationId]
  const [to, setTo] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [picking, setPicking] = useState(false)
  const [text, setText] = useState('')
  const [tokenSelected, setTokenSelected] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const note = useRef<HTMLTextAreaElement>(null)
  const results = useMemo(() => destinations(fx, messages, query), [fx, messages, query])
  useDismissIfMissing(!message || !origin)
  if (!message || !origin) return null

  const privateOrigin = origin.type !== 'channel'
  const title = privateOrigin ? 'Forward Private Message' : 'Forward Message'
  const pick = (id: string) => {
    setTo(id)
    setQuery('')
    setPicking(false)
    setTimeout(() => note.current?.focus(), 0)
  }
  const send = () => {
    if (!to) return
    const dest = to
    useApp.getState().forwardMessage({ conversationId, ts, threadTs }, dest, text.trim())
    sheet?.dismiss(() => useApp.getState().openConversation(dest))
  }
  const dest = to ? fx.conversations[to] : undefined

  return (
    <div className="fw">
      <SheetBar
        title={title}
        leading={{ title: 'Cancel', onClick: () => sheet?.dismiss(), weight: 'bold', color: HIGHLIGHT }}
        trailing={{ title: 'Send', onClick: send, disabled: !to, weight: 'bold', color: HIGHLIGHT }}
      />
      <div className="fw__body ios-scroll">
        <div className="fw__rule" />
        {/* the destination picker, 50 pt (SMVC:355, :517) */}
        <div className="fw__to" onClick={() => input.current?.focus()}>
          {dest ? (
            <SKTokenView
              ornament={destinationOrnament(fx, dest)}
              text={destinationName(fx, dest)}
              isSelected={tokenSelected}
              isDismissible={tokenSelected}
              onViewTapped={() => setTokenSelected((x) => !x)}
              onDismissTapped={() => {
                setTo(null)
                setTokenSelected(false)
                setTimeout(() => input.current?.focus(), 0)
              }}
            />
          ) : (
            <input
              ref={input}
              className="fw__to-input"
              value={query}
              placeholder="Forward to…"
              aria-label="Forward to"
              autoComplete="off"
              spellCheck={false}
              onFocus={() => setPicking(true)}
              onBlur={() => setTimeout(() => setPicking(false), 150)}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>
        <div className="fw__rule" />
        {picking && !dest ? (
          <div className="fw__results">
            {results.map((c) => (
              <SKEntityRow key={c.id} ornament={<DestinationOrnament fx={fx} conv={c} />} title={destinationName(fx, c)} onClick={() => pick(c.id)} />
            ))}
          </div>
        ) : (
          <>
            <textarea
              ref={note}
              className="fw__note"
              value={text}
              placeholder="Add a message, if you’d like"
              aria-label="Add a message, if you’d like"
              rows={1}
              onChange={(e) => {
                setText(e.target.value)
                e.currentTarget.style.height = 'auto'
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
              }}
            />
            <MessageCard fx={fx} message={message} />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The forwarded message: MKMessagePreview with the author header (no status emoji), every line of the text, no reactions,
 * attachments in their message-details styling and the default relative timestamp (SM/ShareMessageDataTypes.swift:239-251;
 * MessageViewPresentationObjectFactory.swift:351-352; TimestampMapper.swift:29-30), inside the bordered preview card.
 */
function MessageCard({ fx, message }: { fx: Fixture; message: Message }) {
  const author = fx.users[message.userId]
  return (
    <div className="fw-card">
      <MKMessagePreview
        ornament={<SKMemberAvatar src={author?.avatar} name={author?.realName ?? ''} size="large" />}
        primaryText={displayName(author)}
        timestamp={relativeFromToday(message.ts)}
        body={message.text || undefined}
        bodyLines={1000}
        files={message.files}
        unfurls={message.attachments}
      />
    </div>
  )
}

/**
 * TimeUtility.relativeFromTodayString(.simple) (Modules/Data/I18n/Implementation/TimeUtility.swift:546-610): "now", "1m ago",
 * "5m ago", "1h ago", "3h ago", "1d ago" (yesterday), else "Jan 1st, 2025" (shortOrdinalDisplayString, year always shown).
 */
function relativeFromToday(ts: string, now = new Date()): string {
  const d = tsDate(ts)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (day === today - 86400000) return '1d ago'
  if (day !== today) return `${MONTHS[d.getMonth()]} ${d.getDate()}${ordinalSuffix(d.getDate())}, ${d.getFullYear()}`
  const secs = Math.max(0, (now.getTime() - d.getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor(secs / 60)
  if (h > 1) return `${h}h ago`
  if (h === 1) return '1h ago'
  if (m > 1) return `${m}m ago`
  if (m === 1 || secs > 1) return '1m ago'
  return 'now'
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Conversations to forward to: the most recently active first; filtered by name when typing. */
function destinations(fx: Fixture, messages: Record<string, Message[]>, query: string): Conversation[] {
  const q = query.trim().toLowerCase().replace(/^[#@]/, '')
  const mine = Object.values(fx.conversations).filter((c) => c.type !== 'app' && (c.type === 'im' || c.type === 'mpim' || (c.memberIds ?? [fx.me]).includes(fx.me)))
  const last = (c: Conversation) => parseFloat(messages[c.id]?.at(-1)?.ts ?? '0')
  const list = q ? mine.filter((c) => destinationName(fx, c).toLowerCase().split(/[\s,._-]+/).some((w) => w.startsWith(q)) || destinationName(fx, c).toLowerCase().startsWith(q)) : mine
  return list.sort((a, b) => last(b) - last(a)).slice(0, 30)
}

const destinationName = (fx: Fixture, c: Conversation) => conversationTitle(fx, c)

function destinationOrnament(fx: Fixture, c: Conversation) {
  if (c.type === 'channel' || c.type === 'private') return { channel: { type: c.type === 'private' ? ('private' as const) : ('public' as const) } }
  if (c.type === 'mpim') return { number: (c.userIds?.filter((u) => u !== fx.me).length ?? 1) + 1 }
  return { member: { src: c.userId ? fx.users[c.userId]?.avatar : undefined } }
}

function DestinationOrnament({ fx, conv }: { fx: Fixture; conv: Conversation }): ReactNode {
  if (conv.type === 'channel' || conv.type === 'private') return <Icon name={conv.type === 'private' ? 'lock' : 'channel'} size={20} />
  if (conv.type === 'mpim') return <Icon name="user_groups" size={20} />
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return <SKMemberAvatar src={u?.avatar} name={u?.realName ?? conv.name} size="small" presence={u?.presence === 'away' ? 'away' : 'active'} />
}
