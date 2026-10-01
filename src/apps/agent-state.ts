import { create } from 'zustand'
import type { Message } from '../data/types'
import type { RegisteredApp } from './index'
import type { SuggestedPrompts, ThreadContext } from './kit'

// The agent state and the pieces of the agent runtime that don't touch the client store, so the app registry
// (src/apps/index.ts) and prototypes can load them without a browser. src/apps/agent.ts re-exports all of it.

// Agent runtime state: what Slack's ai-apps store keeps per conversation (status, suggested prompts, titles, thread
// context) plus text streaming. A conversation is a thread; it's keyed `${channel}/${threadTs}` like the store's threads.
// The UI reads this store (and the status is mirrored into the app store's typing indicator); runtime.ts turns handler
// calls into these updates. Ported from the web kit (slack-remix src/apps/agent-state.ts).

export interface AgentStatus {
  /** "is thinking…" (drawn after the agent's name) */
  status: string
  loadingMessages?: string[]
  botUserId: string
  /** `typing`: the thread footer line; `banner`: the "working on it" line under an @-mention in a channel */
  type: 'typing' | 'banner'
}

export interface AgentStore {
  status: Record<string, AgentStatus>
  /** suggested prompts by thread key; agent-view DMs keep theirs by channel id (the top of Messages) */
  prompts: Record<string, SuggestedPrompts>
  titles: Record<string, string>
  contexts: Record<string, ThreadContext>
  /** placeholder roots of assistant-view conversations (Slack's `assistant_app_thread` messages; never drawn) */
  roots: Record<string, true>
  /** the conversation the Chat tab / split view shows, by agent bot user id */
  active: Record<string, string | undefined>
  /** messages still streaming in, by `${channel}/${ts}` */
  streaming: Record<string, true>
  /** the agent last opened from the top bar (its button shows that agent) */
  current?: string
}

export const useAgentStore = create<AgentStore>()(() => ({ status: {}, prompts: {}, titles: {}, contexts: {}, roots: {}, active: {}, streaming: {} }))

/** 'agent' (Slack's agent_view, the default) or 'assistant' (legacy assistant_view: Chat / History tabs). */
export const agentView = (app: RegisteredApp): 'agent' | 'assistant' => app.def.agent?.view ?? 'agent'

// ------------------------------------------------------------------------------------------------
// Seeded conversations (AgentDefinition.history)

/** Adds an agent's past conversations to its DM: a root, then question / answer replies a minute apart. */
export function seedHistory(app: RegisteredApp, fx: { messages: Record<string, Message[]>; threads?: Record<string, Message[]>; me: string }, ts: (minutesAgo: number) => string) {
  const history = app.def.agent?.history ?? []
  if (!history.length) return
  const view = agentView(app)
  const threads = (fx.threads = fx.threads ?? {})
  const roots: Record<string, true> = {}
  const titles: Record<string, string> = {}
  for (const conv of history) {
    const start = conv.minutesAgo
    const first = conv.turns[0]
    // Assistant view: a placeholder root from the agent; agent view: the user's first question is the root.
    const rootTs = ts(start)
    const root: Message = view === 'assistant' ? { ts: rootTs, userId: app.botUserId, text: conv.title } : { ts: rootTs, userId: fx.me, text: first?.user ?? conv.title }
    fx.messages[app.dmId] = [...(fx.messages[app.dmId] ?? []), root]
    const key = `${app.dmId}/${rootTs}` // threadKey() in messages.ts
    const replies: Message[] = []
    conv.turns.forEach((turn, i) => {
      if (view === 'assistant' || i > 0) replies.push({ ts: ts(start - i * 2 - 0.2), userId: fx.me, text: turn.user })
      const answer = typeof turn.agent === 'string' ? { text: turn.agent } : turn.agent
      replies.push({ ts: ts(start - i * 2 - 0.5), userId: app.botUserId, text: answer.text ?? '', ...(answer.blocks?.length ? { blocks: answer.blocks } : {}) })
    })
    threads[key] = replies
    if (view === 'assistant') roots[key] = true
    titles[key] = conv.title
  }
  fx.messages[app.dmId].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  useAgentStore.setState((s) => ({ roots: { ...s.roots, ...roots }, titles: { ...s.titles, ...titles } }))
}
