import type { Conversation, Fixture, Message } from '../../../data/types'
import type { HomePrefs } from '../../store'
import { SLACKBOT_DM, SLACKBOT_USER_ID } from '../slackbot/constants'

// Home's section pipeline, default settings (Sort: Sections, Unreads: Move to the Top), as
// ConversationListPipelineFactory builds it (spec home.md §6.2, §6.5):
//
//   Unread DMs    unread 1:1 and group DMs (no bots), newest first, 3 unless expanded ("Show All N")
//   Mentions      the rest with a mention badge (no bots)
//   Unreads       the rest that are unread and not muted, if you have no custom sections and nothing starred;
//                 otherwise each section's unread conversations go in an unread copy of that section
//   then every section with its read conversations: channels, then DMs, muted last; "Add channel" at the end of
//   Channels and "Start a new message" at the end of Direct Messages.
//
// A section only appears when something is in it. Sections with unreads sort above the rest.

export interface HomeRow {
  id: string
  conv: Conversation
  unread: boolean
  mentions: number
  muted: boolean
}

export interface HomeSection {
  /** stable id, for collapse state */
  id: string
  name: string
  /** the kind of the section it comes from (unread copies keep their section's kind) */
  kind: 'unread_dms' | 'mentions' | 'unreads' | 'recent' | 'muted' | 'add_teammates' | Fixture['sections'][number]['kind']
  /** the icon before the title: the section kind's default icon, none for custom and dated sections */
  icon?: string
  /** the server section it shows (the section browser opens on it); unset for group sections */
  sectionId?: string
  /** a section without a header (Add Teammates: a lone action row) */
  headerless?: boolean
  /** title in Black: the section holds unread conversations */
  unread: boolean
  collapsible: boolean
  rows: HomeRow[]
  /** an action row at the end */
  action?: 'add_channel' | 'new_message' | 'add_teammates'
  /** Unread DMs: how many there are in all (for "Show All N") */
  total?: number
}

const DIRECT = new Set(['im', 'mpim'])

export function isBotConversation(fx: Fixture, conv: Conversation) {
  if (conv.type === 'app') return true
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return !!(u?.isBot || u?.isApp)
}

function lastTs(messages: Record<string, Message[]>, id: string) {
  const list = messages[id]
  return list?.length ? parseFloat(list[list.length - 1].ts) : 0
}

/** A conversation with someone from another organization (Slack Connect): Home's "External people" filter. */
export function isExternalConversation(fx: Fixture, conv: Conversation) {
  const ids = [conv.userId, ...(conv.userIds ?? []), ...(conv.memberIds ?? [])].filter((x): x is string => !!x)
  return ids.some((id) => fx.users[id]?.isExternal)
}

const DEFAULT_PREFS: HomePrefs = { sortMode: 'sections', prioritization: 'unreadsOnTop', filterMode: 'all' }

export interface HomeSectionOptions {
  showAllDMs?: boolean
  prefs?: HomePrefs
  /** `ios_agents_and_apps_badging`: the ai_agents icon, and "Agents & Apps" unless agentsInDms */
  agentsBadging?: boolean
  /** `ios_agents_in_dms`: the apps section stays "Apps", and agents' DMs (Slackbot's) list under Direct Messages */
  agentsInDms?: boolean
  /** `ios_refreshed_onboarding_v2`: the header-less "Add Teammates" row after the last section (sections sort only) */
  addTeammates?: boolean
}

/**
 * The section kind's icon (GroupingPipeSection.defaultSectionIcon, Sept GroupingPipeSection.swift:242-265; the group
 * sections' own: Unread DMs svgDirectMessages, Mentions svgMentions, UnreadDMsPeekAndShowAllGroupingPipe.swift:61,
 * MentionsPartialGroupingPipe.swift:35). Unreads, Muted, dated and custom sections (without an emoji) have none.
 */
export function sectionIcon(kind: HomeSection['kind'], agentsBadging = false): string | undefined {
  switch (kind) {
    case 'stars':
      return 'star'
    case 'channels':
      return 'channel'
    case 'direct_messages':
    case 'unread_dms':
      return 'direct_messages'
    case 'recent_apps':
      return agentsBadging ? 'ai_agents' : 'apps'
    case 'salesforce':
      return 'sf_cloud'
    case 'mentions':
      return 'mentions'
    default:
      return undefined
  }
}

export function buildHomeSections(fx: Fixture, messages: Record<string, Message[]>, opts: HomeSectionOptions = {}): HomeSection[] {
  const out = buildSections(fx, messages, opts)
  for (const sec of out) sec.icon ??= sectionIcon(sec.kind, opts.agentsBadging)
  if (opts.agentsInDms) addSlackbotDM(fx, out)
  // Add Teammates: last, no header, one "+" row (AddTeammatesPipe.swift:13-31), in the sections sort only
  // (ConversationListPipelineFactory.swift:216, :306-308)
  if (opts.addTeammates && (opts.prefs ?? DEFAULT_PREFS).sortMode === 'sections')
    out.push({ id: 'add_teammates', name: 'Add Teammates', kind: 'add_teammates', unread: false, collapsible: false, rows: [], action: 'add_teammates', headerless: true })
  return out
}

/**
 * With agents in DMs (`ios_agents_in_dms`), an agent's DM, Slackbot's included, is routed to Direct Messages
 * (SectionsReadsFinalGroupingPipe.swift:254-274: `user.isShownAsAgent`, before the bots' recent-apps branch), where it
 * sorts right after your self-DM (ExceptionsConversationSortingPipe.swift:177-213): production shows "You", then
 * Slackbot with the heart (reference/device/IMG_2246). Every workspace has the Slackbot DM; the demo's sidebar doesn't
 * list it, so it's added here, read (its threads' unreads aren't in fx.unreads).
 */
function addSlackbotDM(fx: Fixture, out: HomeSection[]) {
  if (!fx.users[SLACKBOT_USER_ID]) return
  if (out.some((s) => s.rows.some((r) => r.conv.userId === SLACKBOT_USER_ID))) return
  const dms = out.find((s) => s.kind === 'direct_messages' && !s.id.startsWith('unreads-'))
  if (!dms) return
  const conv: Conversation = fx.conversations[SLACKBOT_DM] ?? { id: SLACKBOT_DM, type: 'im', name: 'Slackbot', userId: SLACKBOT_USER_ID }
  const row: HomeRow = { id: conv.id, conv, unread: false, mentions: 0, muted: false }
  const self = dms.rows.findIndex((r) => r.conv.type === 'im' && r.conv.userId === fx.me)
  dms.rows.splice(self + 1, 0, row)
}

function buildSections(fx: Fixture, messages: Record<string, Message[]>, opts: HomeSectionOptions): HomeSection[] {
  const prefs = opts.prefs ?? DEFAULT_PREFS
  const sectionName = (sec: Fixture['sections'][number]) => homeSectionName(sec, !!opts.agentsBadging && !opts.agentsInDms)
  const seen = new Set<string>()
  const rowOf = (id: string): HomeRow | null => {
    const conv = fx.conversations[id]
    if (!conv) return null
    const u = fx.unreads[id]
    const muted = !!conv.muted
    return { id, conv, unread: !!u && u.count > 0 && !muted, mentions: u?.mentions ?? 0, muted }
  }
  const all: HomeRow[] = []
  for (const sec of fx.sections)
    for (const id of sec.conversationIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const r = rowOf(id)
      if (r) all.push(r)
    }
  // Filter: External people keeps only conversations with other companies (home.md §8)
  if (prefs.filterMode === 'external') {
    const keep = all.filter((r) => isExternalConversation(fx, r.conv))
    all.length = 0
    all.push(...keep)
  }
  if (prefs.sortMode === 'recency') return recencySections(all, messages)

  const taken = new Set<string>()
  const out: HomeSection[] = []
  const inAll = (id: string) => all.find((r) => r.id === id)

  // Unreads "Show in order": no unread groups; unread rows stay (bold) in their own sections, in server order (§6.3)
  if (prefs.prioritization === 'none') {
    for (const sec of fx.sections) {
      const rows = sec.conversationIds.map(inAll).filter((r): r is HomeRow => !!r && !taken.has(r.id))
      rows.forEach((r) => taken.add(r.id))
      const action = sec.kind === 'channels' ? 'add_channel' : sec.kind === 'direct_messages' ? 'new_message' : undefined
      if (!rows.length && !action) continue
      out.push({ id: sec.id, sectionId: sec.id, name: sectionName(sec), kind: sec.kind, unread: rows.some((r) => r.unread), collapsible: true, rows: sortRows(fx, sec.kind, rows), action })
    }
    return out
  }

  // Unread DMs
  const unreadDMs = all.filter((r) => DIRECT.has(r.conv.type) && r.unread && !isBotConversation(fx, r.conv)).sort((a, b) => lastTs(messages, b.id) - lastTs(messages, a.id))
  if (unreadDMs.length) {
    const shown = opts.showAllDMs ? unreadDMs : unreadDMs.slice(0, 3)
    shown.forEach((r) => taken.add(r.id))
    out.push({ id: 'unread_dms', name: 'Unread DMs', kind: 'unread_dms', unread: true, collapsible: false, rows: shown, total: unreadDMs.length })
  }

  // Mentions, in section order then recency
  const mentions = all.filter((r) => !taken.has(r.id) && r.mentions > 0 && !isBotConversation(fx, r.conv))
  if (mentions.length) {
    mentions.forEach((r) => taken.add(r.id))
    out.push({ id: 'mentions', name: 'Mentions', kind: 'mentions', unread: true, collapsible: true, rows: mentions })
  }

  const custom = fx.sections.some((s) => s.kind === 'custom')
  const starred = fx.sections.some((s) => s.kind === 'stars' && s.conversationIds.length)
  const unreadCopies: HomeSection[] = []
  if (!custom && !starred) {
    const rest = all.filter((r) => !taken.has(r.id) && r.unread)
    rest.forEach((r) => taken.add(r.id))
    if (rest.length) unreadCopies.push({ id: 'unreads', name: 'Unreads', kind: 'unreads', unread: true, collapsible: true, rows: rest })
  } else {
    for (const sec of fx.sections) {
      const rows = sec.conversationIds.map((id) => all.find((r) => r.id === id)).filter((r): r is HomeRow => !!r && !taken.has(r.id) && r.unread)
      rows.forEach((r) => taken.add(r.id))
      if (rows.length) unreadCopies.push({ id: `unreads-${sec.id}`, sectionId: sec.id, name: sectionName(sec), kind: sec.kind, unread: true, collapsible: true, rows: sortRows(fx, sec.kind, rows) })
    }
  }
  out.push(...unreadCopies)

  // Read sections, in server order
  for (const sec of fx.sections) {
    const rows = sec.conversationIds.map((id) => all.find((r) => r.id === id)).filter((r): r is HomeRow => !!r && !taken.has(r.id))
    rows.forEach((r) => taken.add(r.id))
    const action = sec.kind === 'channels' ? 'add_channel' : sec.kind === 'direct_messages' ? 'new_message' : undefined
    if (!rows.length && !action) continue
    out.push({ id: sec.id, sectionId: sec.id, name: sectionName(sec), kind: sec.kind, unread: false, collapsible: true, rows: sortRows(fx, sec.kind, rows), action })
  }
  // An unread copy of Channels takes the "Add channel" row when every channel is unread.
  if (!out.some((s) => s.action === 'add_channel')) {
    const copy = out.find((s) => s.kind === 'channels')
    if (copy) copy.action = 'add_channel'
  }
  return out
}

/**
 * A section's title: the server's name, except the localized default sections (SectionItemActionDataTypes.swift:19-36 [Sept]):
 * "Direct Messages", and "Apps" for recent apps ("Agents & Apps" with agents badging when agents don't show in DMs).
 */
export const homeSectionName = (sec: Fixture['sections'][number], agentsAndApps = false) =>
  sec.kind === 'direct_messages' ? 'Direct Messages' : sec.kind === 'recent_apps' ? (agentsAndApps ? 'Agents & Apps' : 'Apps') : sec.name

/**
 * Sort = "Newest to Oldest" (home.md §6.4; RecentActivityFinalGroupingPipe.swift:33-116): dated sections by last
 * activity, newest first: "Today", "Yesterday", "Last 7 days", "Last 30 days", one per year, "Earlier" without a date;
 * "Muted" (every muted conversation) last. Rows newest first; the newest dated section gets "Add channel".
 */
function recencySections(all: HomeRow[], messages: Record<string, Message[]>, now = new Date()): HomeSection[] {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = day(now)
  const bucket = (ts: number): { id: string; name: string; order: number } => {
    if (!ts) return { id: 'earlier', name: 'Earlier', order: -1 }
    const d = new Date(ts * 1000)
    const days = Math.round((today - day(d)) / 86_400_000)
    if (days <= 0) return { id: 'today', name: 'Today', order: 1e9 }
    if (days === 1) return { id: 'yesterday', name: 'Yesterday', order: 1e9 - 1 }
    if (days < 7) return { id: 'last7', name: 'Last 7 days', order: 1e9 - 2 }
    if (days < 30) return { id: 'last30', name: 'Last 30 days', order: 1e9 - 3 }
    return { id: `year-${d.getFullYear()}`, name: String(d.getFullYear()), order: d.getFullYear() }
  }
  const groups = new Map<string, { name: string; order: number; rows: { row: HomeRow; ts: number }[] }>()
  const muted: { row: HomeRow; ts: number }[] = []
  for (const row of all) {
    const ts = lastTs(messages, row.id)
    if (row.muted) {
      muted.push({ row, ts })
      continue
    }
    const b = bucket(ts)
    if (!groups.has(b.id)) groups.set(b.id, { name: b.name, order: b.order, rows: [] })
    groups.get(b.id)!.rows.push({ row, ts })
  }
  const newest = (xs: { row: HomeRow; ts: number }[]) => xs.sort((a, b) => b.ts - a.ts).map((x) => x.row)
  const out: HomeSection[] = [...groups.entries()]
    .sort((a, b) => b[1].order - a[1].order)
    .map(([id, g]) => ({ id: `recent-${id}`, name: g.name, kind: 'recent' as const, unread: g.rows.some((x) => x.row.unread), collapsible: true, rows: newest(g.rows) }))
  if (out.length) out[0].action = 'add_channel'
  if (muted.length) out.push({ id: 'recent-muted', name: 'Muted', kind: 'muted', unread: false, collapsible: true, rows: newest(muted) })
  return out
}

/** Inside a section: channels A→Z (then DMs, your self-DM first); muted conversations last (GroupingPipeSection). */
function sortRows(fx: Fixture, kind: HomeSection['kind'], rows: HomeRow[]): HomeRow[] {
  const isChannel = (r: HomeRow) => r.conv.type === 'channel' || r.conv.type === 'private'
  const key = (r: HomeRow) => (r.muted ? 2 : 0) + (isChannel(r) ? 0 : 1)
  const sorted = [...rows]
  if (kind === 'channels') sorted.sort((a, b) => a.conv.name.localeCompare(b.conv.name))
  if (kind === 'direct_messages') {
    const self = (r: HomeRow) => r.conv.type === 'im' && r.conv.userId === fx.me
    sorted.sort((a, b) => Number(self(b)) - Number(self(a)))
  }
  return sorted.sort((a, b) => key(a) - key(b))
}

/** The name a row shows: channel name, person, "Name (you)", or the group's members A→Z (MpdmNamingHelper). */
export function conversationName(fx: Fixture, conv: Conversation): string {
  if (conv.type === 'im' || conv.type === 'app') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    const name = u?.realName ?? conv.name
    return conv.userId === fx.me ? `${name} (you)` : name
  }
  if (conv.type === 'mpim') {
    const names = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => fx.users[id]?.realName ?? id)
    return names.sort((a, b) => a.localeCompare(b)).join(', ') || conv.name
  }
  return conv.name
}
