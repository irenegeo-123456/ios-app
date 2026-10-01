import type { Fixture, Message } from '../../../data/types'

// Later's items (spec dms-activity.md §6): the fixture's saved messages (fx.later) merged with the ones saved this
// session (the store's `saved` keys). A key in `saved` flips a seeded in-progress item off (isSaved in
// src/messagekit/format.ts); on anything else it saves the message again, In Progress. setLaterStatus moves an item
// between tabs and settles both.

export type LaterTab = 'in_progress' | 'archived' | 'completed'

/** The default tab order (TasksListFeatureInterface.swift:54-76): in_progress_title, archived_title, completed_title. */
export const LATER_TABS: { id: LaterTab; title: string }[] = [
  { id: 'in_progress', title: 'In Progress' },
  { id: 'archived', title: 'Archived' },
  { id: 'completed', title: 'Completed' },
]

export interface LaterEntry {
  key: string
  conversationId: string
  ts: string
  /** the thread's parent ts when the saved message is a reply */
  threadTs?: string
  status: LaterTab
  /** the reminder (seconds, as a ts string) */
  due?: string
  /** undefined when the message is gone: the "A message you saved was deleted." row */
  message?: Message
}

/** A message by conversation and ts: in the history, or among a thread's replies (with that thread's ts). */
export function findMessage(messages: Record<string, Message[]>, threads: Record<string, Message[]>, conversationId: string, ts: string, threadTs?: string): { message: Message; threadTs?: string } | undefined {
  if (threadTs) {
    const m = threads[`${conversationId}/${threadTs}`]?.find((r) => r.ts === ts)
    if (m) return { message: m, threadTs }
  }
  const m = messages[conversationId]?.find((x) => x.ts === ts)
  if (m) return { message: m }
  for (const [key, replies] of Object.entries(threads)) {
    if (!key.startsWith(`${conversationId}/`)) continue
    const r = replies.find((x) => x.ts === ts)
    if (r) return { message: r, threadTs: key.slice(conversationId.length + 1) }
  }
  return undefined
}

/** Everything in Later, newest saves first: this session's, then the seeded ones in their order. */
export function laterEntries(fx: Fixture, saved: string[], messages: Record<string, Message[]>, threads: Record<string, Message[]>): LaterEntry[] {
  const seeded = fx.later ?? []
  const seededAt = new Map(seeded.map((l) => [`${l.conversationId}/${l.ts}`, l]))
  const out: LaterEntry[] = []
  for (const key of [...saved].reverse()) {
    const l = seededAt.get(key)
    // a seeded in-progress item toggled once is no longer saved
    if (l && (l.status ?? 'in_progress') === 'in_progress') continue
    const slash = key.indexOf('/')
    const conversationId = key.slice(0, slash)
    const ts = key.slice(slash + 1)
    const found = findMessage(messages, threads, conversationId, ts, l?.threadTs)
    out.push({ key, conversationId, ts, threadTs: found?.threadTs, status: 'in_progress', message: found?.message })
  }
  for (const l of seeded) {
    const key = `${l.conversationId}/${l.ts}`
    if (saved.includes(key)) continue
    const found = findMessage(messages, threads, l.conversationId, l.ts, l.threadTs)
    out.push({ key, conversationId: l.conversationId, ts: l.ts, threadTs: found?.threadTs ?? l.threadTs, status: l.status ?? 'in_progress', due: l.due, message: found?.message })
  }
  return out
}

/** SavedItem.hasDueDate (SavedItem.swift:102-104): a reminder is only shown while the item is in progress. */
export const hasDueDate = (e: LaterEntry) => e.status === 'in_progress' && !!e.due && parseFloat(e.due) > 0

/** SavedItem.isOverdue (:92-100) */
export const isOverdue = (e: LaterEntry, now = Date.now()) => hasDueDate(e) && parseFloat(e.due!) * 1000 < now
