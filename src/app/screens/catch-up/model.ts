import type { ActivityItem, Fixture, Message } from '../../../data/types'
import { isBotConversation } from '../home/sections'

// Catch Up's cards (Modules/Features/AllUnreads/Implementation/Data; spec dms-activity.md §5): every unread
// conversation that isn't muted and every unread thread, ranked in groups (AllUnreadsRankingModel.swift:56-160):
// DMs (not bots) → mentions → threads → the other channels (and bot DMs), each group newest first. There's no VIP
// list in the prototype, so no VIP groups.

export interface CatchUpItem {
  key: string
  kind: 'conversation' | 'thread'
  conversationId: string
  /** the thread's parent ts */
  threadTs?: string
  /** the Activity row that makes the thread unread (marking the card read marks it read) */
  activityId?: string
  /** unread messages: the last `unread` of the conversation, or of the thread's replies */
  unread: number
  /** ranking: the latest message's ts */
  latest: number
}

const lastTs = (list: Message[] | undefined) => (list?.length ? parseFloat(list[list.length - 1].ts) : 0)

export function catchUpItems(fx: Fixture, messages: Record<string, Message[]>, threads: Record<string, Message[]>): CatchUpItem[] {
  const dms: CatchUpItem[] = []
  const mentions: CatchUpItem[] = []
  const channels: CatchUpItem[] = []
  const threadItems: CatchUpItem[] = []
  for (const [id, u] of Object.entries(fx.unreads)) {
    const conv = fx.conversations[id]
    if (!conv || !u || u.count <= 0 || conv.muted) continue
    const item: CatchUpItem = { key: `c-${id}`, kind: 'conversation', conversationId: id, unread: u.count, latest: lastTs(messages[id]) }
    const direct = conv.type === 'im' || conv.type === 'mpim' || conv.type === 'app'
    if (direct && !isBotConversation(fx, conv)) dms.push(item)
    else if (u.mentions > 0) mentions.push(item)
    else channels.push(item)
  }
  const seen = new Set<string>()
  for (const a of fx.activity ?? ([] as ActivityItem[])) {
    if (a.type !== 'thread' || !a.unread || !a.threadTs) continue
    const key = `${a.conversationId}/${a.threadTs}`
    const conv = fx.conversations[a.conversationId]
    if (seen.has(key) || !conv || conv.muted) continue
    seen.add(key)
    const replies = threads[key] ?? []
    threadItems.push({
      key: `t-${key}`,
      kind: 'thread',
      conversationId: a.conversationId,
      threadTs: a.threadTs,
      activityId: a.id,
      unread: Math.max(1, Math.min(replies.length || 1, a.unreadCount ?? 1)),
      latest: lastTs(replies) || parseFloat(a.ts),
    })
  }
  const byLatest = (a: CatchUpItem, b: CatchUpItem) => b.latest - a.latest
  return [...dms.sort(byLatest), ...mentions.sort(byLatest), ...threadItems.sort(byLatest), ...channels.sort(byLatest)]
}
