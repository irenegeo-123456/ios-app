import { useMemo, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKChannelEntity, SKMemberEntity, SKMultiPersonDirectMessageEntity } from '../../../slackkit/SKEntities'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import type { Conversation, Fixture, Message, User } from '../../../data/types'
import { SheetBar } from '../ui/SheetBar'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import './new-huddle.css'

// "New Huddle" (spec canvas-lists-creation.md §4): what + Create › Huddle and the Huddles page's "+" open, a
// UserConversationPickerFeature in single-select mode (CreationEntryPointsHandler.swift:110-190 at
// 14b3cbaf, presented with .dismissesAllModals; HuddlesPageFeature.swift:190-250). A form sheet in a navigation controller titled "New Huddle"
// (new_huddle_menu_option, yaml:12828) with the automatic close button; an SKSearchView under the bar; one list of
// frecent people, group DMs and channels you're in, then search results — SKMemberEntity / SKMultiPersonDirectMessage-
// Entity / SKChannelEntity rows at .small, no accessories (UserConversationPickerPresenter.swift:218-553). There's no
// confirm button: tapping a row (a person through their DM) presents the start preview ('huddle') over the picker; its
// "Huddle" starts the call, and the huddle sheet closes everything below it (HuddlesSessionManager.swift:586-589).
//
//   presentSheet('new-huddle')

type Row = { kind: 'user'; user: User; conv?: Conversation } | { kind: 'mpim'; conv: Conversation } | { kind: 'channel'; conv: Conversation }

/** at most 100 frecent conversations before typing (FrecentUserConversationEmptyStateService.swift:28-53) */
const FRECENT = 100

const isPerson = (u: User | undefined, me: string): u is User => !!u && u.id !== me && !u.isBot && !u.isApp && u.id !== 'USLACKBOT'

/** Channels you're in: the sidebar's, or ones that list you as a member (no archived ones in the demo data). */
function myChannels(fx: Fixture): Conversation[] {
  const inSidebar = new Set(fx.sections.flatMap((s) => s.conversationIds))
  return Object.values(fx.conversations).filter((c) => (c.type === 'channel' || c.type === 'private') && (inSidebar.has(c.id) || !!c.memberIds?.includes(fx.me)))
}

const lastTs = (messages: Record<string, Message[]>, id: string) => parseFloat(messages[id]?.at(-1)?.ts ?? '0')

/** The frecent list: conversations you've been in lately (people through their DMs), newest first. */
function frecent(fx: Fixture, messages: Record<string, Message[]>): Row[] {
  const rows: { row: Row; ts: number }[] = []
  for (const c of Object.values(fx.conversations)) {
    if (c.type === 'im') {
      const u = c.userId ? fx.users[c.userId] : undefined
      if (isPerson(u, fx.me)) rows.push({ row: { kind: 'user', user: u, conv: c }, ts: lastTs(messages, c.id) })
    } else if (c.type === 'mpim') rows.push({ row: { kind: 'mpim', conv: c }, ts: lastTs(messages, c.id) })
  }
  for (const c of myChannels(fx)) rows.push({ row: { kind: 'channel', conv: c }, ts: lastTs(messages, c.id) })
  return rows
    .sort((a, b) => b.ts - a.ts)
    .slice(0, FRECENT)
    .map((r) => r.row)
}

const words = (s: string) => s.toLowerCase().split(/[\s._,-]+/).filter(Boolean)
/** a word of the name starts with the query (or the whole name does) */
const matches = (name: string | undefined, q: string) => !!name && (name.toLowerCase().startsWith(q) || words(name).some((w) => w.startsWith(q)))

/** Search: people, group DMs and your channels whose names match; "#" limits to channels, "@" to people (UserConversationPickerDataTypes.swift:89-95). */
function results(fx: Fixture, messages: Record<string, Message[]>, query: string): Row[] {
  const raw = query.trim()
  const only = raw.startsWith('#') ? 'channel' : raw.startsWith('@') ? 'user' : null
  const q = raw.replace(/^[#@]/, '').toLowerCase()
  const rows: Row[] = []
  if (only !== 'channel') {
    const ims = new Map(Object.values(fx.conversations).filter((c) => c.type === 'im' && c.userId).map((c) => [c.userId!, c]))
    Object.values(fx.users)
      .filter((u) => isPerson(u, fx.me) && (!q || matches(u.name, q) || matches(u.realName, q)))
      .sort((a, b) => lastTs(messages, ims.get(b.id)?.id ?? '') - lastTs(messages, ims.get(a.id)?.id ?? '') || a.realName.localeCompare(b.realName))
      .forEach((u) => rows.push({ kind: 'user', user: u, conv: ims.get(u.id) }))
    if (!only)
      Object.values(fx.conversations)
        .filter((c) => c.type === 'mpim' && (!q || (c.userIds ?? []).some((id) => matches(fx.users[id]?.name, q) || matches(fx.users[id]?.realName, q))))
        .forEach((c) => rows.push({ kind: 'mpim', conv: c }))
  }
  if (only !== 'user')
    myChannels(fx)
      .filter((c) => !q || matches(c.name, q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((c) => rows.push({ kind: 'channel', conv: c }))
  return rows
}

export function NewHuddleSheet(props: SheetProps) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const rows = useMemo(() => (query.trim() ? results(fx, messages, query) : frecent(fx, messages)), [fx, messages, query])

  const close = () => (sheet ? sheet.dismiss() : useApp.getState().dismissSheet(props.sheetKey))
  // a person resolves to the DM (userImResolver.imConversation, CreationEntryPointsFeature.swift:251-265); the start
  // preview goes on top of the picker, which stays (shouldDismissOnSelection false)
  const pick = (r: Row) => {
    const s = useApp.getState()
    const conversationId = r.kind === 'user' ? (r.conv?.id ?? s.openDm([r.user.id])) : r.conv.id
    // presenting the preview takes the keyboard down (the search field resigns)
    dismissKeyboard()
    s.presentSheet('huddle', { conversationId })
  }

  const prefix = query.trim()[0]
  return (
    <div className="nh">
      {/* the automatic close button (SF xmark), the title in Lato Bold 17 (UINavigationBar+SlackStyles.swift:84) */}
      <SheetBar title="New Huddle" leading="close" onClose={close} scrolled={scrolled} />
      {/* SKSearchView: 16 / 12 pt insets, "Search" (search, yaml:16105) (SKSearchView.swift:24-33, :167) */}
      <div className="nh__search">
        <SKSearchBar text={query} onTextChanged={setQuery} placeholderText="Search" accessibilityLabel="Search" />
      </div>
      <div className="nh__rule" />
      <div className="nh__list ios-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)} data-sheet-scroll>
        {rows.length === 0 ? (
          query.trim() ? (
            // no_conversation_matches_keywords (yaml:12177); "#" / "@": no_channel_ / no_user_matches_keywords
            // (yaml:12165 / 12358); clear_search (yaml:3893) (UserConversationPickerPresenter.swift:359-424)
            <SKEmptyState
              content={{ illustration: 'emoji_no_results' }}
              title={prefix === '#' ? 'No channel matches these keywords.' : prefix === '@' ? 'No user matches these keywords.' : 'No conversation matches these keywords.'}
              buttons={[{ title: 'Clear search', onClick: () => setQuery('') }]}
            />
          ) : (
            // no_conversation_found (yaml:12174)
            <SKEmptyState content={{ illustration: 'emoji_no_results' }} title="No conversation found" />
          )
        ) : (
          rows.map((r) => <PickerRow key={r.kind === 'user' ? `u:${r.user.id}` : r.conv.id} row={r} fx={fx} onPick={() => pick(r)} />)
        )}
      </div>
    </div>
  )
}

function PickerRow({ row: r, fx, onPick }: { row: Row; fx: Fixture; onPick: () => void }) {
  if (r.kind === 'user') {
    const u = r.user
    // SKMemberEntity .small: a 24 pt avatar with presence, the display name in bodyBold, the real name after it, the
    // status emoji (SKListCellPresentationObject+Member.swift:120-162)
    return (
      <SKMemberEntity
        name={u.name || u.realName}
        displayName={u.realName && u.realName !== u.name ? u.realName : undefined}
        avatar={u.avatar}
        presence={u.presence === 'away' ? 'away' : 'active'}
        statusEmoji={u.statusEmoji}
        onSelected={onPick}
      />
    )
  }
  if (r.kind === 'mpim') {
    const others = (r.conv.userIds ?? []).filter((id) => id !== fx.me)
    const names = others.map((id) => fx.users[id]?.name || fx.users[id]?.realName || id).join(', ')
    return <SKMultiPersonDirectMessageEntity names={names || r.conv.name} count={others.length + 1} primarySrc={fx.users[others[0]]?.avatar} secondarySrc={fx.users[others[1]]?.avatar} onSelected={onPick} />
  }
  const c = r.conv
  // SKChannelEntity .small: svgChannelFilled / svgLockFilled; muted ones the outline icons in contentTertiary (SKChannelEntity.swift:176-198)
  return (
    <SKChannelEntity
      name={c.name}
      channelType={c.type === 'private' ? 'private' : 'public'}
      iconStyle={c.muted ? 'unfilled' : 'filled'}
      iconColor={c.muted ? 'var(--dt_color_content_tertiary)' : 'var(--dt_color_content_primary)'}
      onSelected={onPick}
    />
  )
}
