import type { Conversation, Fixture, User, UserGroup } from '../../data/types'
import { EMOJI, type EmojiEntry } from '../../emoji/Emoji'
import keywords from '../../emoji/emoji-keywords.json'
import { ATOM, closestIn, kindOf, lineOf, linesOf, selectionRange, textToCaret, posAt } from './editor'
import { appCommandList } from '../../apps'

// Autocomplete for @people, #channels, :emoji: and /commands (spec composer.md §18). The trigger rules are
// WysiwygAutocompleteOpportunity.swift's regexes; the results are the demo workspace's, ranked simply (Slack ranks
// server-side with a model): exact and prefix matches first.

export type AcType = '@' | '#' | ':' | '/'

export interface Opportunity {
  type: AcType
  query: string
  /** the trigger + query to replace when a row is picked */
  range: Range
}

/**
 * [@#/] followed by up to 3 words (single spaces), or : followed by a word, at the end of the text before the caret,
 * right after the start, whitespace, U+200B or one of { [ ( * _ / " “ ' ‘ ’ < : (WAO:90-115).
 */
const OPPORTUNITY_RX = /(?<=^|\s|[{[(*_/"“'‘’<:]|\u200B)(?:[#@/](?:[^\s#@:/\n]+\s?){0,3}$|:[^\s#@:/\n]*$)/

/** The autocomplete opportunity at the caret, if any. */
export function findOpportunity(root: HTMLElement): Opportunity | null {
  const range = selectionRange(root)
  if (!range || !range.collapsed) return null
  const line = lineOf(range.startContainer, root)
  if (!line || kindOf(line) === 'pre' || closestIn(range.startContainer, root, 'code, a')) return null
  const { text, segs } = textToCaret(line, range.startContainer, range.startOffset)
  if (!text) return null
  const m = OPPORTUNITY_RX.exec(text)
  if (!m || m[0].includes(ATOM)) return null
  const type = m[0][0] as AcType
  // "/" only as the very first character of the message (WAO:146-150)
  if (type === '/' && (linesOf(root)[0] !== line || text.slice(0, m.index).replace(/\u200B/g, ''))) return null
  const start = posAt(segs, m.index)
  if (!start) return null
  const r = document.createRange()
  r.setStart(start.node, start.offset)
  r.setEnd(range.startContainer, range.startOffset)
  return { type, query: m[0].slice(1), range: r }
}

// ------------------------------------------------------------------------------------------------ results

export interface Command {
  name: string
  description: string
  /** an App Kit app's command: its usage hint and bot user */
  usage?: string
  appId?: string
}

/**
 * Slack's own slash commands, as the demo's server would return them (their names and descriptions are server data,
 * not in the iOS app; these are the web clone's demo list, slack-remix src/components/composer/Autocomplete.tsx).
 */
export const COMMANDS: Command[] = [
  { name: '/remind', description: 'Set a reminder' },
  { name: '/status', description: 'Set or clear your custom status' },
  { name: '/away', description: 'Toggle your “away” status' },
  { name: '/dnd', description: 'Starts or ends a Do Not Disturb session' },
  { name: '/invite', description: 'Invite another member to a channel' },
  { name: '/topic', description: 'Set the channel topic' },
  { name: '/mute', description: 'Mutes [channel] or unmutes the current channel' },
  { name: '/shrug', description: 'Appends ¯\\_(ツ)_/¯ to your message' },
  { name: '/feed', description: 'Manage RSS subscriptions' },
]

export type AcRow =
  | { kind: 'user'; user: User; notInChannel: boolean }
  | { kind: 'broadcast'; name: 'here' | 'channel' | 'everyone'; disabled: boolean }
  | { kind: 'group'; group: UserGroup }
  | { kind: 'channel'; conv: Conversation }
  | { kind: 'emoji'; name: string }
  | { kind: 'command'; cmd: Command }

/** At most 24 results (ARPC:217; LegacyAutocompleteDataProvider.swift:365-366). */
const MAX = 24

const words = (s: string) => s.toLowerCase().split(/[\s._-]+/).filter(Boolean)

/** A name matches when the query's words are prefixes of consecutive words of the name (or of the whole name). */
function nameMatch(name: string, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 1
  const n = name.toLowerCase()
  if (n === q) return 4
  if (n.startsWith(q)) return 3
  const w = words(name)
  const qw = q.split(/\s+/)
  for (let i = 0; i + qw.length <= w.length; i++) if (qw.every((x, j) => w[i + j].startsWith(x))) return 2
  return 0
}

export interface AcContext {
  fx: Fixture
  conversationId: string
  threadTs?: string
}

function people(query: string, { fx, conversationId, threadTs }: AcContext): AcRow[] {
  const conv = fx.conversations[conversationId]
  const channel = conv && (conv.type === 'channel' || conv.type === 'private')
  const members = channel ? new Set(conv.memberIds ?? [fx.me]) : null
  const q = query.trim()
  const users = Object.values(fx.users)
    .map((u) => ({ u, score: Math.max(nameMatch(u.name, q), nameMatch(u.realName, q)) }))
    .filter((x) => x.score > 0 && !(!q && x.u.id === fx.me))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // frecent stand-in: people in this conversation first, apps last, then A–Z
      const inA = members ? Number(members.has(a.u.id)) : 1
      const inB = members ? Number(members.has(b.u.id)) : 1
      if (inA !== inB) return inB - inA
      const appA = Number(!!(a.u.isApp || a.u.isBot))
      const appB = Number(!!(b.u.isApp || b.u.isBot))
      if (appA !== appB) return appA - appB
      return a.u.name.localeCompare(b.u.name)
    })
  const rows: AcRow[] = users.map(({ u }) => ({ kind: 'user', user: u, notInChannel: !!members && !members.has(u.id) && !u.isApp && !u.isBot }))
  if (q) {
    // @here / @channel / @everyone in channels (ARVM:552-564); @everyone only in #general; disabled in threads
    if (channel) {
      const broadcasts: ('here' | 'channel' | 'everyone')[] = conv.name === 'general' ? ['here', 'channel', 'everyone'] : ['here', 'channel']
      for (const b of broadcasts) if (b.startsWith(q.toLowerCase())) rows.unshift({ kind: 'broadcast', name: b, disabled: !!threadTs })
    }
    for (const g of fx.userGroups ?? []) if (nameMatch(g.handle, q) || nameMatch(g.name, q)) rows.push({ kind: 'group', group: g })
  }
  return rows.slice(0, MAX)
}

function channels(query: string, { fx }: AcContext): AcRow[] {
  const q = query.trim()
  const order = fx.sections.flatMap((s) => s.conversationIds)
  const rank = (id: string) => {
    const i = order.indexOf(id)
    return i === -1 ? 1e6 : i
  }
  return Object.values(fx.conversations)
    .filter((c) => c.type === 'channel' || c.type === 'private')
    .map((c) => ({ c, score: nameMatch(c.name, q) || (q && c.name.toLowerCase().includes(q.toLowerCase()) ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (q ? a.c.name.localeCompare(b.c.name) : rank(a.c.id) - rank(b.c.id)))
    .slice(0, MAX)
    .map(({ c }) => ({ kind: 'channel', conv: c }))
}

const KEYWORDS = keywords as Record<string, string[]>

function emoji(query: string): AcRow[] {
  const q = query.toLowerCase()
  // empty ":" shows nothing (spec §18.1)
  if (!q) return []
  const scored: { name: string; score: number; i: number }[] = []
  EMOJI.forEach((e: EmojiEntry, i) => {
    if (e.c < 0 && !e.n.some((n) => n === q)) return
    let best = 0
    let name = e.n[0]
    for (const n of e.n) {
      const s = n === q ? 5 : n.startsWith(q) ? 4 : n.split(/[_-]/).some((w) => w.startsWith(q)) ? 3 : 0
      if (s > best) {
        best = s
        name = n
      }
    }
    if (!best && (KEYWORDS[e.n[0]] ?? []).some((k) => k.startsWith(q))) best = 1
    if (best) scored.push({ name, score: best, i })
  })
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, MAX)
    .map((x) => ({ kind: 'emoji', name: x.name }))
}

function commands(query: string): AcRow[] {
  const q = query.trim().toLowerCase()
  // the workspace's apps' commands (App Kit, src/apps) first, then Slack's own
  const all: Command[] = [...appCommandList(), ...COMMANDS.filter((c) => !appCommandList().some((a) => a.name === c.name))]
  return all.filter((c) => c.name.slice(1).startsWith(q)).map((cmd) => ({ kind: 'command', cmd }))
}

export function search(type: AcType, query: string, ctx: AcContext): AcRow[] {
  switch (type) {
    case '@':
      return people(query, ctx)
    case '#':
      return channels(query, ctx)
    case ':':
      return emoji(query)
    case '/':
      return commands(query)
  }
}

export const rowKey = (r: AcRow) =>
  r.kind === 'user' ? r.user.id : r.kind === 'channel' ? r.conv.id : r.kind === 'group' ? r.group.id : r.kind === 'broadcast' ? r.name : r.kind === 'emoji' ? r.name : r.cmd.name
