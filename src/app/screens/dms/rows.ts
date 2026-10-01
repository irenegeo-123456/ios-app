import type { Conversation, Fixture, Message, User } from '../../../data/types'
import { conversationName, isBotConversation } from '../home/sections'

// The DMs tab's data (spec dms-activity.md §2): every 1:1 and group DM except those with bots, apps and Slackbot
// (PaginatedDirectMessageSubscription.swift:202; DirectMessageQuery.swift:272-274), newest first with ties broken by
// id (:342-358), filtered by the filter pills:
//
//   all        every DM
//   unreads    conversations with unreads
//   external   Slack Connect conversations (none in the Northstar demo)

export type DMFilter = 'all' | 'unreads' | 'external'

/** The filter pills (DMPresentationObjectFactory.swift:913-944, PerTabPreferencesServiceInterface+DM.swift:20-52):
 *  "All" (`all`), "Unreads" (`unreads`), "External" (`external`), each with its icon. VIP (with priority access) isn't
 *  in the demo. */
export const DM_FILTER_PILLS: { id: DMFilter; title: string; icon: string }[] = [
  { id: 'all', title: 'All', icon: 'direct_messages' },
  { id: 'unreads', title: 'Unreads', icon: 'mark_as_unread' },
  { id: 'external', title: 'External', icon: 'buildings' },
]

export interface DMRow {
  id: string
  conv: Conversation
  /** the name line: the person, "Name (you)", or the members A→Z */
  name: string
  /** 1:1 only: the other person (you, for your self-DM) */
  user?: User
  /** group DMs: the other members, in the conversation's order */
  members: User[]
  latest?: Message
  /** conversation.badgeCount: unread messages (0 hides the badge) */
  unread: number
}

const latestOf = (messages: Record<string, Message[]>, id: string) => {
  const list = messages[id]
  // Thread replies that weren't sent to the channel aren't the conversation's latest message.
  for (let i = (list?.length ?? 0) - 1; i >= 0; i--) {
    const m = list![i]
    if (!m.threadTs || m.threadTs === m.ts) return m
  }
  return undefined
}

/** Conversation.isExternalShared: a DM with someone from another organization. The demo has none. */
export const isExternal = (fx: Fixture, conv: Conversation) => {
  const ids = conv.type === 'mpim' ? (conv.userIds ?? []) : conv.userId ? [conv.userId] : []
  return ids.some((id) => fx.users[id]?.isExternal === true)
}

export function buildDMRows(fx: Fixture, messages: Record<string, Message[]>, filter: DMFilter): DMRow[] {
  const rows: DMRow[] = []
  for (const conv of Object.values(fx.conversations)) {
    if (conv.type !== 'im' && conv.type !== 'mpim') continue
    if (conv.type === 'im' && isBotConversation(fx, conv)) continue
    const count = fx.unreads[conv.id]?.count ?? 0
    // Muted conversations don't badge (as on Home, sections.ts)
    const unread = conv.muted ? 0 : count
    if (filter === 'unreads' && count <= 0) continue
    if (filter === 'external' && !isExternal(fx, conv)) continue
    const members = conv.type === 'mpim' ? (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => fx.users[id]).filter((u): u is User => !!u) : []
    rows.push({
      id: conv.id,
      conv,
      name: conversationName(fx, conv),
      user: conv.type === 'im' && conv.userId ? fx.users[conv.userId] : undefined,
      members,
      latest: latestOf(messages, conv.id),
      unread,
    })
  }
  const ts = (r: DMRow) => (r.latest ? parseFloat(r.latest.ts) : 0)
  return rows.sort((a, b) => ts(b) - ts(a) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
}

/**
 * The people carousel (DMInteractor.swift:1070-1126, :849-882): up to 30 people you talk to, not you, not apps or
 * bots; the active ones first, then by how recently you've been in touch (your DMs, then their latest message); Slackbot
 * first when Slackbot AI is visible (DMInteractor.swift:1121-1123 [Sept]; production, reference/device/IMG_2249).
 */
export function frecentPeople(fx: Fixture, messages: Record<string, Message[]>, dmRows: DMRow[]): User[] {
  const score = new Map<string, number>()
  const bump = (id: string, ts: number) => score.set(id, Math.max(score.get(id) ?? 0, ts))
  // Frecency first comes from your DMs, then from anything they've posted where you are.
  for (const r of dmRows) {
    const t = r.latest ? parseFloat(r.latest.ts) + 1e10 : 1e10
    if (r.user && r.user.id !== fx.me) bump(r.user.id, t)
    for (const m of r.members) bump(m.id, t - 1)
  }
  for (const list of Object.values(messages)) for (const m of list) if (m.userId !== fx.me) bump(m.userId, parseFloat(m.ts))
  const people = Object.values(fx.users).filter((u) => u.id !== fx.me && !u.isBot && !u.isApp)
  const rank = (u: User) => (u.presence === 'active' ? 0 : 1)
  const sorted = people.sort((a, b) => rank(a) - rank(b) || (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || a.realName.localeCompare(b.realName)).slice(0, 30)
  const slackbot = fx.users.USLACKBOT
  return slackbot ? [slackbot, ...sorted] : sorted
}
