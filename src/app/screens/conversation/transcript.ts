import type { Conversation, Fixture, Message } from '../../../data/types'
import { dayDividerLabel, tsDate } from '../../../messagekit/format'

// The transcript pipeline (Modules/Features/MessageTranscript/Implementation/Pipeline, spec messages.md §9.1-§9.3), in the
// order the app runs it (MessageTranscriptPipelineFactory.swift:101-114): date dividers → join/leave rollup → the read
// marker ("NEW") → profile rollup (grouping) → rows.

export type TranscriptRow =
  | { kind: 'divider'; key: string; date?: string; isNew?: boolean }
  | { kind: 'message'; key: string; message: Message; grouped: boolean }
  /** consecutive join/leave messages rolled into one row (JoinLeaveRollupMessageTranscriptPipeline.swift:58-99) */
  | { kind: 'join'; key: string; message: Message; text: string }

const isJoin = (m: Message) => m.subtype === 'channel_join'
const dayOf = (ts: string) => {
  const d = tsDate(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** A reply that was also sent to the channel shows up in the channel with its thread's ts. */
export const isBroadcastCopy = (m: Message) => !!m.threadTs && m.threadTs !== m.ts

export interface TranscriptOptions {
  conversationId: string
  /** the first unread message when the conversation was opened (useApp's newMarker) */
  newTs?: string
  /** reply counts, from the store's threads */
  replyCount: (m: Message) => number
  /** thread transcripts have no date dividers (DateDividerInterjectorMessageTranscriptPipeline.swift:26-29) */
  isThread?: boolean
}

export function buildTranscript(fx: Fixture, list: Message[], opts: TranscriptOptions): TranscriptRow[] {
  const conv = fx.conversations[opts.conversationId]
  const rows: TranscriptRow[] = []
  // "NEW" goes before the oldest unread message you can mark: your own messages and join/leave are skipped
  // (ReadMarkerMessageTranscriptPipeline.swift:39-52, 82-87)
  let newTs: string | undefined
  if (opts.newTs) {
    const start = list.findIndex((m) => m.ts === opts.newTs)
    if (start >= 0) newTs = list.slice(start).find((m) => m.userId !== fx.me && !isJoin(m))?.ts
  }
  let prev: Message | null = null
  let prevDay: number | null = null
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    const day = dayOf(m.ts)
    // date dividers between days, and above the first message (the top of history is always loaded here)
    const dateHere = !opts.isThread && day !== prevDay
    const newHere = newTs === m.ts
    if (dateHere || newHere) {
      rows.push({ kind: 'divider', key: `d-${m.ts}`, date: dateHere ? dayDividerLabel(m.ts) : undefined, isNew: newHere })
      prev = null // a divider resets grouping (ProfileRollupMessageTranscriptPipeline.swift:37-49)
    }
    prevDay = day
    if (isJoin(m)) {
      const group = [m]
      while (i + 1 < list.length && isJoin(list[i + 1]) && dayOf(list[i + 1].ts) === day && list[i + 1].ts !== newTs) group.push(list[++i])
      rows.push({ kind: 'join', key: `m-${m.ts}`, message: m, text: joinText(fx, conv, group) })
      prev = m
      continue
    }
    rows.push({ kind: 'message', key: `m-${m.ts}`, message: m, grouped: !!prev && shouldRollUp(m, prev, opts.replyCount) })
    prev = m
  }
  return rows
}

/**
 * ProfileRollupMessageTranscriptPipeline.shouldDrawName (:53-78), inverted: true when `m` continues `prev` without a
 * header. The first check that decides wins.
 */
export function shouldRollUp(m: Message, prev: Message, replyCount: (m: Message) => number): boolean {
  if (isJoin(prev) || isJoin(m)) return false // join/leave (:95-98)
  if (replyCount(m) > 0 || replyCount(prev) > 0) return false // thread replies (:105-112)
  if (isBroadcastCopy(m) || isBroadcastCopy(prev)) return false // thread broadcasts (:114-121)
  if (parseFloat(m.ts) - parseFloat(prev.ts) >= 300) return false // ≥ 5 minutes (:123-130)
  if (m.subtype === 'huddle_thread') return false // huddle messages (:148-155)
  return m.userId === prev.userId // same author (:157-174)
}

/**
 * "joined #channel. " / " along with A. " / " along with A and B. " / " along with A, B, and C. " (JoinLeaveMessageHelper.swift:
 * 221-420; `joined_x_channel` yaml:10447, `along_with_a_user` 1619, `along_with_multiple_users` 1622, `along_with` 1616,
 * `join_leave_and_user_1` 9640, `join_leave_and_usercount_others` 9658). Names are mentions; the channel is plain text.
 */
function joinText(fx: Fixture, conv: Conversation | undefined, group: Message[]): string {
  const where = conv ? (conv.type === 'channel' ? `#${conv.name}` : conv.name) : 'the channel'
  const others = [...new Set(group.slice(1).map((m) => m.userId))].filter((id) => id !== group[0].userId)
  const u = (id: string) => `<@${id}>`
  const MAX = 8 // maximumNumberOfJoinedOrLeftUsersForOneMessage (:78)
  let text = `joined ${where}`
  if (!others.length) text += '. '
  else if (others.length === 1) text += ` along with ${u(others[0])}. `
  else if (others.length === 2) text += ` along with ${u(others[0])} and ${u(others[1])}. `
  else if (others.length < MAX) text += ` along with ${others.slice(0, -1).map(u).join(', ')}, and ${u(others.at(-1)!)}. `
  else if (others.length === MAX) text += ` along with ${others.slice(0, -1).map(u).join(', ')}, and ${u(others.at(-1)!)}. `
  else text += ` along with ${others.slice(0, MAX).map(u).join(', ')}, and ${others.length - MAX} others. `
  void fx
  return text.trimEnd()
}
