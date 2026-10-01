import { useMemo, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { Fixture, Message, User } from '../../../data/types'
import { SheetBar } from '../ui/SheetBar'
import { TokenField } from '../ui/TokenField'
import { useDismissIfMissing } from '../shared'
import { InviteMemberRow, InviteNoMatchesRow } from './InviteMemberRow'
import './invite.css'

// Add Members (InviteToChannelRoute → InvitePicker; I2C = Modules/Features/InviteToChannel/Implementation, IP =
// Modules/Features/InvitePicker/Implementation). A form sheet: "Cancel" (VoiceOver "Close": the picker relabels its left
// item, IP/InvitePickerViewController.swift:96-102) and "Add" (enabled once someone is picked) around "Add Members", the
// tokenized search "Laura, @mahesh, name@example.com" over a one-pixel outlineTertiary rule, then .small member rows
// with an always-visible subtitle — their title, or "Already in channel" (deactivated, no checkbox) — and a checkbox
// (I2C/Helpers/I2CInvitePickerConfigFactory.swift:81-130; IP/InvitePickerViewController.swift:116-176;
// IP/InvitePickerDisplayProvider.swift:520-569; InviteMemberRow.tsx). With no query: the people you talk to most, then
// everyone else (the adapter's frecent + paginated users, InviteToChannelInvitePickerAdapter.swift:245-260).
//
//   presentSheet('invite-to-channel', { conversationId })

export function InviteToChannelSheet({ conversationId }: { sheetKey: string; conversationId: string }) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const conv = fx.conversations[conversationId]
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const members = useMemo(() => new Set(conv?.memberIds ?? [fx.me]), [conv, fx.me])
  const people = useMemo(() => candidates(fx, messages, query), [fx, messages, query])
  useDismissIfMissing(!conv)
  if (!conv) return null

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    setQuery('')
  }
  // I2C adds them and closes; the channel shows their join messages (no toast)
  const add = () => sheet?.dismiss(() => useApp.getState().addMembers(conversationId, picked))

  return (
    <div className="inv">
      <SheetBar
        title="Add Members"
        leading={{ title: 'Cancel', onClick: () => sheet?.dismiss(), accessibilityLabel: 'Close' }}
        trailing={{ title: 'Add', onClick: add, disabled: !picked.length }}
        scrolled={scrolled}
      />
      <div className="inv__search">
        <TokenField
          tokens={picked.map((id) => ({ id, text: fx.users[id]?.name || fx.users[id]?.realName || id, ornament: { member: { src: fx.users[id]?.avatar } } }))}
          query={query}
          onQuery={setQuery}
          onRemove={(id) => setPicked((p) => p.filter((x) => x !== id))}
          selected={selected}
          onSelect={setSelected}
          placeholder="Laura, @mahesh, name@example.com"
          label="Search"
        />
        <div className="inv__rule" />
      </div>
      <div className="inv__list ios-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        {people.length === 0 ? (
          <InviteNoMatchesRow />
        ) : (
          people.map((u) => <InviteMemberRow key={u.id} user={u} inChannel={members.has(u.id)} isOn={picked.includes(u.id)} onToggle={() => toggle(u.id)} />)
        )}
      </div>
    </div>
  )
}

/** Everyone but you: people you've talked with lately first, then A–Z; filtered by name when searching. */
function candidates(fx: Fixture, messages: Record<string, Message[]>, query: string): User[] {
  const q = query.trim().toLowerCase().replace(/^@/, '')
  const all = Object.values(fx.users).filter((u) => u.id !== fx.me && !u.isBot && !u.isApp && u.id !== 'USLACKBOT')
  if (q) {
    const hit = (s?: string) => !!s && (s.toLowerCase().startsWith(q) || s.toLowerCase().split(/[\s._-]+/).some((w) => w.startsWith(q)))
    return all.filter((u) => hit(u.name) || hit(u.realName) || hit(u.email)).sort((a, b) => a.realName.localeCompare(b.realName))
  }
  const last = new Map<string, number>()
  for (const c of Object.values(fx.conversations)) {
    if (c.type !== 'im' || !c.userId) continue
    last.set(c.userId, parseFloat(messages[c.id]?.at(-1)?.ts ?? '0'))
  }
  const frecent = all.filter((u) => last.has(u.id)).sort((a, b) => (last.get(b.id) ?? 0) - (last.get(a.id) ?? 0))
  const rest = all.filter((u) => !last.has(u.id)).sort((a, b) => a.realName.localeCompare(b.realName))
  return [...frecent, ...rest]
}
