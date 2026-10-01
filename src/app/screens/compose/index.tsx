import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { registerScreen } from '../../nav/registry'
import { GlassButton, GlassGroup, NavBar } from '../../nav/NavBar'
import { useApp, type Route } from '../../store'
import type { Conversation, FileAttachment, Fixture, Message, User } from '../../../data/types'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKAdjacentLabel, SKEntityRow } from '../../../slackkit/SKEntity'
import { SKGroupAvatar } from '../../../slackkit/SKGroupAvatar'
import { SKCheckbox } from '../../../slackkit/SKCheckbox'
import { SKTokenView } from '../../../slackkit/SKTokenView'
import { SKButton } from '../../../slackkit/SKButton'
import { Composer, composerDrafts } from '../../composer/Composer'
import { MessageList } from '../conversation/MessageList'
import { conversationName } from '../home/sections'
import { asset } from '../../../lib/asset'
import './compose.css'

// New Message (spec composer.md §19; Modules/Features/ComposeMessage): a conversation screen with a "To:" field as the
// list's top drawer, the frecent people and channels under it while you pick, and the normal composer at the bottom.
// Up to 8 people (a DM or group DM) or one channel. Sending opens the conversation (openDm / openConversation).
//
//   push({ screen: 'compose' })                                  a fresh New Message, the "To:" field focused
//   push({ screen: 'compose', to: ['U04PRIYAPT'] })              with recipients (user or channel ids)

type Recipient = { kind: 'user'; id: string } | { kind: 'channel'; id: string }

/** maxSelectableItems = 8 (ComposeMessageFeature+Dependencies.swift:115) */
const MAX_PEOPLE = 8

type Row = { kind: 'user'; user: User } | { kind: 'channel'; conv: Conversation } | { kind: 'mpim'; conv: Conversation }

const lastTs = (messages: Record<string, Message[]>, id: string) => parseFloat(messages[id]?.at(-1)?.ts ?? '0')

/** Frecent conversations (UserConversationPicker's empty query): the most recently active DMs, group DMs and channels. */
function frecent(fx: Fixture, messages: Record<string, Message[]>): Row[] {
  const rows: { row: Row; ts: number }[] = []
  for (const c of Object.values(fx.conversations)) {
    const ts = lastTs(messages, c.id)
    if ((c.type === 'im' || c.type === 'app') && c.userId && c.userId !== fx.me && fx.users[c.userId]) rows.push({ row: { kind: 'user', user: fx.users[c.userId] }, ts })
    else if (c.type === 'mpim') rows.push({ row: { kind: 'mpim', conv: c }, ts })
    else if (c.type === 'channel' || c.type === 'private') rows.push({ row: { kind: 'channel', conv: c }, ts })
  }
  // people you have no DM with come after, A–Z
  const dmUsers = new Set(rows.flatMap((r) => (r.row.kind === 'user' ? [r.row.user.id] : [])))
  const others = Object.values(fx.users)
    .filter((u) => u.id !== fx.me && !dmUsers.has(u.id))
    .sort((a, b) => a.realName.localeCompare(b.realName))
    .map((u) => ({ row: { kind: 'user', user: u } as Row, ts: 0 }))
  // most recent first; apps after people and channels (the demo's bots post the newest messages)
  const isApp = (r: Row) => (r.kind === 'user' && (r.user.isApp || r.user.isBot) ? 1 : 0)
  return [...rows.sort((a, b) => isApp(a.row) - isApp(b.row) || b.ts - a.ts), ...others].map((r) => r.row)
}

function matches(name: string, q: string) {
  const n = name.toLowerCase()
  return n.startsWith(q) || n.split(/[\s._-]+/).some((w) => w.startsWith(q))
}

function searchRows(fx: Fixture, q: string): Row[] {
  const query = q.trim().toLowerCase()
  const people = Object.values(fx.users)
    .filter((u) => matches(u.name, query) || matches(u.realName, query))
    .sort((a, b) => Number(a.id === fx.me) - Number(b.id === fx.me) || a.realName.localeCompare(b.realName))
    .map((user) => ({ kind: 'user', user }) as Row)
  const convs = Object.values(fx.conversations)
    .filter((c) => (c.type === 'channel' || c.type === 'private' ? matches(c.name, query) : c.type === 'mpim' ? matches(conversationName(fx, c), query) : false))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ kind: c.type === 'mpim' ? 'mpim' : 'channel', conv: c }) as Row)
  return [...people, ...convs]
}

/** The DM, group DM or channel these recipients already have, without creating one. */
function existingConversation(fx: Fixture, to: Recipient[]): string | null {
  if (!to.length) return null
  if (to[0].kind === 'channel') return to[0].id
  const ids = to.map((r) => r.id).filter((id) => id !== fx.me)
  const want = ids.length ? ids : [fx.me]
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const c = Object.values(fx.conversations).find((x) => (want.length === 1 ? (x.type === 'im' || x.type === 'app') && x.userId === want[0] : x.type === 'mpim' && same((x.userIds ?? []).filter((u) => u !== fx.me), want)))
  return c?.id ?? null
}

/** SF Symbols "xmark", as UIKit draws the automatic close button (UIViewController+CloseButton.swift:61-76). */
const XMark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M2.5 2.5 13.5 13.5M13.5 2.5 2.5 13.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
)

function ComposeScreen({ route }: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const pop = useApp((s) => s.pop)
  const openDm = useApp((s) => s.openDm)
  const openConversation = useApp((s) => s.openConversation)
  const sendMessage = useApp((s) => s.sendMessage)
  const showToast = useApp((s) => s.showToast)
  const initial = ((route.to as string[] | undefined) ?? []).map((id): Recipient => (fx.conversations[id] ? { kind: 'channel', id } : { kind: 'user', id }))
  const [to, setTo] = useState<Recipient[]>(initial)
  const [query, setQuery] = useState('')
  const [selectedToken, setSelectedToken] = useState<number | null>(null)
  // the list shows while the "To:" field was edited last and more people can be picked (ComposeMessageFrecentConversationsPlugin.swift:326-402)
  const [picking, setPicking] = useState(true)
  const input = useRef<HTMLInputElement>(null)
  const [composerH, setComposerH] = useState(60)

  // focused automatically on a fresh New Message (ComposeMessageDestinationPickerWidget.swift:492-494)
  useEffect(() => {
    if (!initial.length) {
      const t = setTimeout(() => input.current?.focus(), 350)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const destination = existingConversation(fx, to)
  const rows = useMemo(() => (query.trim() ? searchRows(fx, query) : frecent(fx, messages)), [fx, messages, query])
  const isSelected = (r: Row) => to.some((t) => (r.kind === 'user' ? t.kind === 'user' && t.id === r.user.id : t.kind === 'channel' && t.id === r.conv.id))
  const showList = picking && (to.length === 0 || to[0].kind === 'user')

  const toggle = (r: Row) => {
    setQuery('')
    setSelectedToken(null)
    if (r.kind === 'mpim') {
      // a group DM row picks its members
      const ids = (r.conv.userIds ?? []).filter((u) => u !== fx.me)
      setTo(ids.map((id) => ({ kind: 'user', id })))
      return
    }
    if (isSelected(r)) {
      setTo((t) => t.filter((x) => !(r.kind === 'user' ? x.kind === 'user' && x.id === r.user.id : x.kind === 'channel' && x.id === r.conv.id)))
      return
    }
    // ComposeMessageDestinationError.swift:120-132
    if (r.kind === 'channel') {
      if (to.some((x) => x.kind === 'user')) return showToast('Cannot address a message to both a channel and users') // yaml:4424
      if (to.some((x) => x.kind === 'channel')) return showToast('You can only message one channel at a time.') // yaml:4427
      setTo([{ kind: 'channel', id: r.conv.id }])
      setPicking(false)
      return
    }
    if (to.some((x) => x.kind === 'channel')) return showToast('Cannot address a message to both a channel and users')
    if (to.length >= MAX_PEOPLE) return showToast('Only 8 people can be added. Create a channel to add more.') // yaml:4416
    setTo((t) => [...t, { kind: 'user', id: r.user.id }])
    input.current?.focus()
  }

  // Backspace in the empty field selects the last token, a second one removes it (SKTokenView's selected state)
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace' || query) return
    if (selectedToken !== null) {
      setTo((t) => t.filter((_, i) => i !== selectedToken))
      setSelectedToken(null)
    } else if (to.length) setSelectedToken(to.length - 1)
  }

  const onSend = (text: string, files: FileAttachment[]) => {
    if (!to.length) return
    const id = to[0].kind === 'channel' ? to[0].id : openDm(to.map((r) => r.id))
    sendMessage(id, text, undefined, { files: files.length ? files : undefined })
    // the conversation takes the New Message screen's place (the post-send navigation isn't traced, spec §21)
    pop()
    openConversation(id)
  }

  const close = () => {
    // "Draft saved" (draft_saved, yaml:5867) when there's something typed (DiscardDraftAlertHandler.swift:39-72)
    const typed = document.querySelector<HTMLElement>('[data-screen="compose"] .cmp-editor')?.textContent?.trim()
    if (typed) showToast('Draft saved')
    // the next New Message starts empty
    composerDrafts.delete('compose')
    pop()
  }

  // the composer's placeholder: "Write a message" until there's a recipient, then "Message …" (PlaceholderTextPublisher.swift:174-176)
  const people = to.filter((r) => r.kind === 'user').map((r) => fx.users[r.id]).filter((u): u is User => !!u)
  let placeholder: string | undefined
  if (!to.length) placeholder = 'Write a message'
  else if (!destination) placeholder = `Message ${people.map((u) => u.name).join(', ')}`

  const drafts = fx.drafts?.length ?? 0

  return (
    <div className="ios-pushed-screen compose" data-screen="compose" onFocusCapture={(e) => (e.target as HTMLElement).classList.contains('cmp-editor') && to.length > 0 && setPicking(false)}>
      <div className="compose__body">
        {/* the "To:" field (ComposeMessageDestinationPickerPresentable.swift:24-94) */}
        <div className="compose__to" onClick={() => input.current?.focus()}>
          {/* to_with_colons "To: " (yaml:21777) */}
          <span className="compose__prefix">To:</span>
          {to.map((r, i) => {
            const selected = selectedToken === i
            if (r.kind === 'channel') {
              const c = fx.conversations[r.id]
              return <SKTokenView key={r.id} ornament={{ channel: { type: c?.type === 'private' ? 'private' : 'public' } }} text={c?.name ?? r.id} isSelected={selected} onViewTapped={() => setSelectedToken(selected ? null : i)} />
            }
            const u = fx.users[r.id]
            return <SKTokenView key={r.id} ornament={{ member: { src: u?.avatar ? asset(u.avatar) : undefined } }} text={u?.name ?? r.id} isSelected={selected} onViewTapped={() => setSelectedToken(selected ? null : i)} />
          })}
          <input
            ref={input}
            className="compose__input"
            value={query}
            placeholder={to.length ? '' : 'Search for a channel or conversation'}
            aria-label="To"
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedToken(null)
            }}
            onFocus={() => setPicking(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {showList ? (
          <div className="compose__list ios-scroll" data-qa="compose_list">
            {rows.length ? (
              rows.map((r) => <PickerRow key={r.kind === 'user' ? r.user.id : r.conv.id} row={r} fx={fx} selected={isSelected(r)} onToggle={() => toggle(r)} />)
            ) : (
              // no_matches_found_try_an_email (yaml:13000): contentTertiary, a question mark in a surfacePrimary box
              <SKEntityRow className="compose__empty" ornament={<span className="compose__empty-box"><Icon name="help" size={20} /></span>} title="No matches found. Try an email?" />
            )}
            <div className="compose__list-end" />
          </div>
        ) : destination ? (
          // the destination's transcript, once the picker's done (the screen is a conversation screen with the "To:"
          // field as its top drawer, ComposeMessageViewController.swift:33-48)
          <div className="compose__transcript">
            <MessageList key={destination} conversationId={destination} composerHeight={composerH} topInset="0px" />
          </div>
        ) : (
          <div className="compose__list" />
        )}
      </div>
      <NavBar
        title="New Message"
        leading={
          <GlassButton label="Close" onClick={close} className="compose__close">
            <XMark />
          </GlassButton>
        }
        trailing={
          drafts > 0 && (
            // drafts_title_case "Drafts" / drafts_count "Drafts (%d)" (yaml:5883, 5873): an SKBarButtonItem title, an
            // SKButton .systemDefault .barButton (SKBarButtonItem.swift:185-208), in a glass capsule
            <GlassGroup className="compose__drafts">
              <SKButton title={drafts > 1 ? `Drafts (${drafts})` : 'Drafts'} buttonStyle="systemDefault" size="barButton" onClick={() => showToast('Not in the prototype')} />
            </GlassGroup>
          )
        }
      />
      <Composer conversationId={destination ?? 'compose'} draftKey="compose" placeholder={placeholder} onSend={onSend} onHeight={setComposerH} />
    </div>
  )
}

/** A 44 pt picker row (cellSize .small, ComposeMessageFeature+Dependencies.swift:105-117) with its multi-select checkbox. */
function PickerRow({ row, fx, selected, onToggle }: { row: Row; fx: Fixture; selected: boolean; onToggle: () => void }) {
  const check = <SKCheckbox isOn={selected} onToggled={onToggle} accessibilityLabel="Select" />
  if (row.kind === 'user') {
    const u = row.user
    const bot = u.isApp || u.isBot
    return (
      <SKEntityRow
        ornament={bot ? <img className="compose__app" src={asset(u.avatar)} alt="" draggable={false} /> : <SKMemberAvatar src={u.avatar} name={u.realName} size="small" presence={u.presence === 'away' ? 'away' : 'active'} />}
        title={<b className="compose__name">{u.id === fx.me ? `${u.name} (you)` : u.name}</b>}
        inline={
          <>
            {u.realName !== u.name && <span className="compose__secondary">{u.realName}</span>}
            {u.statusEmoji && <Emoji name={u.statusEmoji} size={20} />}
            {bot && <SKAdjacentLabel>APP</SKAdjacentLabel>}
          </>
        }
        accessories={check}
        onClick={onToggle}
      />
    )
  }
  if (row.kind === 'mpim') {
    const members = (row.conv.userIds ?? []).filter((id) => id !== fx.me)
    return <SKEntityRow ornament={<SKGroupAvatar count={members.length} />} title={conversationName(fx, row.conv)} accessories={check} onClick={onToggle} />
  }
  const c = row.conv
  return (
    <SKEntityRow
      ornament={<Icon name={c.type === 'private' ? 'lock_filled' : 'channel_filled'} size={20} />}
      title={<b className="compose__name">{c.name}</b>}
      accessories={check}
      onClick={onToggle}
    />
  )
}

registerScreen('compose', ComposeScreen, { tabBar: false })
