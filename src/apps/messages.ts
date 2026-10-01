import { useApp } from '../app/store'
import type { Message } from '../data/types'
import type { AnyBlock, MessageInput, PostedMessage, ResponseInput } from './kit'

// Message plumbing shared by the App Kit runtime (runtime.ts) and the agent runtime (agent.ts): where a message
// lives, adding one the way Slack delivers it, and editing or removing it in place. The web kit's
// (slack-remix src/apps/messages.ts), on the mobile store.

let seq = 0
/** A unique, increasing ts for "now". */
export function nextTs() {
  seq = (seq + 1) % 1000
  return `${Math.floor(Date.now() / 1000)}.${String(700000 + seq * 97).padStart(6, '0')}`
}

export const normalize = (msg: MessageInput | ResponseInput): { text?: string; blocks?: AnyBlock[]; thread_ts?: string } => (typeof msg === 'string' ? { text: msg } : msg)

export const threadKey = (channel: string, ts: string) => `${channel}/${ts}`

/** Finds a message wherever it lives (history or a thread). */
export function findMessage(conversationId: string, ts: string): { msg: Message; threadTs?: string } | undefined {
  const s = useApp.getState()
  const top = s.messages[conversationId]?.find((m) => m.ts === ts)
  if (top) return { msg: top }
  for (const [key, list] of Object.entries(s.threads)) {
    if (!key.startsWith(`${conversationId}/`)) continue
    const m = list.find((x) => x.ts === ts)
    if (m) return { msg: m, threadTs: key.slice(conversationId.length + 1) }
  }
  return undefined
}

/**
 * Adds a message. Ephemeral ones (and `quiet` ones, like an agent's placeholder thread root) skip unread badges;
 * the others arrive like a live message from someone else (receiveMessage: badges, mentions, typing cleared).
 */
export function insertMessage(conversationId: string, msg: Message, threadTs?: string, quiet = false): PostedMessage {
  if (msg.ephemeral || quiet) {
    useApp.setState((s) => {
      if (threadTs) {
        const key = threadKey(conversationId, threadTs)
        return { threads: { ...s.threads, [key]: [...(s.threads[key] ?? []), msg] } }
      }
      return { messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), msg] } }
    })
  } else useApp.getState().receiveMessage(conversationId, msg, threadTs)
  return { channel: conversationId, ts: msg.ts, threadTs }
}

/** Replaces (or, when `fn` returns null, removes) a message wherever it lives. */
export function mapMessage(conversationId: string, ts: string, fn: (m: Message) => Message | null) {
  useApp.setState((s) => {
    const apply = (list: Message[]) => list.flatMap((m) => (m.ts === ts ? (fn(m) ?? []) : [m]))
    const threads: Record<string, Message[]> = {}
    for (const [k, list] of Object.entries(s.threads)) threads[k] = k.startsWith(`${conversationId}/`) ? apply(list) : list
    return { messages: { ...s.messages, [conversationId]: apply(s.messages[conversationId] ?? []) }, threads }
  })
}
