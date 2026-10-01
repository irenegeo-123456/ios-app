import { useApp } from '../app/store'
import { markdownToBlocks } from '../blocks/markdown'
import type { RtElement, RtInline } from '../blocks/rich-text'
import type { KitBlock } from '../blocks/types'
import type { Message } from '../data/types'
import { kitAppByUser, type RegisteredApp } from './index'
import { findMessage, insertMessage, mapMessage, nextTs, threadKey } from './messages'
import { taskFields } from './kit'
import { agentView, useAgentStore, type AgentStatus } from './agent-state'
import type {
  AgentDefinition,
  AnyBlock,
  ChatStream,
  PlanBlock,
  PlanTask,
  PostedMessage,
  StatusInput,
  StreamChunk,
  SuggestedPrompt,
  SuggestedPrompts,
  TaskCardBlock,
  TaskDisplayMode,
  ThreadContext,
} from './kit'

// The agent runtime of the web kit (slack-remix src/apps/agent.ts) on the mobile store: statuses, suggested prompts,
// titles, thread context and streamed messages (chat.startStream / appendStream / stopStream). The mobile UI for the
// agent surfaces (prompts, History) isn't built; statuses also show as the conversation's typing indicator.

export { agentView, seedHistory, useAgentStore, type AgentStatus, type AgentStore } from './agent-state'

// ------------------------------------------------------------------------------------------------
// Lookups

/** The registered app for an agent's bot user (undefined for everyone else). */
export function agentApp(userId: string | undefined): (RegisteredApp & { def: { agent: AgentDefinition } }) | undefined {
  const app = kitAppByUser(userId)
  return app?.def.agent ? (app as RegisteredApp & { def: { agent: AgentDefinition } }) : undefined
}

export const isAgent = (userId: string | undefined) => !!agentApp(userId)


/** The app settings' suggested prompts (assistant_suggested_prompts). */
export function staticPrompts(app: RegisteredApp): SuggestedPrompts | undefined {
  const p = app.def.agent?.suggestedPrompts
  if (!p) return undefined
  const obj = Array.isArray(p) ? { prompts: p } : p
  return obj.prompts.length ? { title: obj.title, prompts: obj.prompts.slice(0, 4) } : undefined
}

export const normalizePrompts = (p: SuggestedPrompts | SuggestedPrompt[]): SuggestedPrompts => {
  const obj = Array.isArray(p) ? { prompts: p } : p
  return { ...(obj.title ? { title: obj.title } : {}), prompts: obj.prompts.slice(0, 4) }
}

/** Agent conversations (thread roots) in an agent's DM, newest first. */
export function conversations(dmId: string): Message[] {
  const s = useApp.getState()
  return (s.messages[dmId] ?? []).filter((m) => (s.threads[threadKey(dmId, m.ts)]?.length ?? 0) > 0).sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts))
}

/** The ts of the latest reply in a conversation (or its root). */
export function lastActivity(dmId: string, ts: string): string {
  const replies = useApp.getState().threads[threadKey(dmId, ts)] ?? []
  return replies.length ? replies[replies.length - 1].ts : ts
}

// ------------------------------------------------------------------------------------------------
// Status ("is thinking…"), prompts, titles, context

const STATUS_TTL = 2 * 60_000
const statusTimers = new Map<string, number>()

/** Sets a conversation's status. An empty status clears it, except for the `banner` loader (it shows the agent's name). */
export function setStatus(key: string, botUserId: string, input: string | StatusInput, type: AgentStatus['type'] = 'typing') {
  const { status, loading_messages } = typeof input === 'string' ? { status: input, loading_messages: undefined } : input
  if (!status && type !== 'banner') return clearStatus(key)
  useAgentStore.setState((s) => ({ status: { ...s.status, [key]: { status, loadingMessages: loading_messages?.length ? loading_messages : undefined, botUserId, type } } }))
  mirrorTyping(key, botUserId, true)
  // Slack clears a status after two minutes without a reply.
  window.clearTimeout(statusTimers.get(key))
  statusTimers.set(key, window.setTimeout(() => clearStatus(key), STATUS_TTL))
}

export function clearStatus(key: string) {
  window.clearTimeout(statusTimers.get(key))
  statusTimers.delete(key)
  const current = useAgentStore.getState().status[key]
  if (!current) return
  mirrorTyping(key, current.botUserId, false)
  useAgentStore.setState((s) => {
    const status = { ...s.status }
    delete status[key]
    return { status }
  })
}

/**
 * The mobile conversation screen shows who's typing from the app store (`typing[conversationId]`); an agent's status
 * shows there too, so "Beacon is typing…" appears while it works (the web kit draws its own status line).
 */
function mirrorTyping(key: string, botUserId: string, on: boolean) {
  const channel = key.slice(0, key.indexOf('/') === -1 ? key.length : key.indexOf('/'))
  const s = useApp.getState()
  const others = (s.typing[channel] ?? []).filter((id) => id !== botUserId)
  const next = on ? [...others, botUserId] : others
  if (next.length !== (s.typing[channel] ?? []).length || on) s.setTyping(channel, next)
}

export function setPrompts(key: string, prompts: SuggestedPrompts | undefined) {
  useAgentStore.setState((s) => {
    const next = { ...s.prompts }
    if (prompts?.prompts.length) next[key] = prompts
    else delete next[key]
    return { prompts: next }
  })
}

export function setTitle(channel: string, ts: string, title: string) {
  const key = threadKey(channel, ts)
  useAgentStore.setState((s) => ({ titles: { ...s.titles, [key]: title } }))
  // The placeholder root of an assistant conversation carries the title (History, DM previews, search).
  if (useAgentStore.getState().roots[key]) mapMessage(channel, ts, (m) => ({ ...m, text: title }))
}

export function setContext(key: string, context: ThreadContext) {
  useAgentStore.setState((s) => ({ contexts: { ...s.contexts, [key]: context } }))
}

/** The conversation on screen, as assistant_thread_started's `context` (the split view reads along in it). */
export function currentContext(): ThreadContext {
  const s = useApp.getState()
  // Mobile: the conversation (or its thread) on top of the current tab's stack.
  const top = s.stacks[s.tab].at(-1)?.route
  const id = top ? ((top.screen === 'conversation' ? top.id : top.conversationId) as string | undefined) : undefined
  const conv = id ? s.fx.conversations[id] : undefined
  return { channel_id: conv?.id, team_id: s.fx.workspace.id, enterprise_id: null }
}

export const setActive = (botUserId: string, ts: string | undefined) => useAgentStore.setState((s) => ({ active: { ...s.active, [botUserId]: ts } }))

/** Starts an assistant-view conversation: a hidden placeholder root from the agent (assistant.threads start). */
export function createAssistantThread(app: RegisteredApp): string {
  const ts = nextTs()
  insertMessage(app.dmId, { ts, userId: app.botUserId, text: 'New chat' }, undefined, true)
  const key = threadKey(app.dmId, ts)
  useAgentStore.setState((s) => ({ roots: { ...s.roots, [key]: true } }))
  setContext(key, currentContext())
  return ts
}

// ------------------------------------------------------------------------------------------------
// Streaming (chat.startStream / appendStream / stopStream). The message's content is known as it's appended; the
// reveal runs at Slack's streaming speed (250 characters a second, redrawn every 30ms), so text appears token by
// token even when a prototype appends a whole paragraph at once. Only rich text animates: task cards, plans,
// headers and tables appear whole when the reveal reaches them, like Slack's StreamingBlocks.

const CHARS_PER_SECOND = 250
const TICK_MS = 30

type Segment = { kind: 'md'; text: string } | { kind: 'task'; task: PlanTask } | { kind: 'plan'; plan: PlanBlock } | { kind: 'blocks'; blocks: AnyBlock[] }

interface Stream {
  app: RegisteredApp
  channel: string
  threadTs?: string
  ts: string
  mode: TaskDisplayMode
  segments: Segment[]
  final: AnyBlock[]
  revealed: number
  inserted: boolean
  stopped: boolean
  timer?: number
  last: number
  done: Promise<PostedMessage>
  resolve: (p: PostedMessage) => void
}

const streams = new Map<string, Stream>()

/** Opens a stream in a conversation; the message appears with its first token. */
export function openStream(app: RegisteredApp, channel: string, threadTs: string | undefined, mode: TaskDisplayMode = 'timeline'): ChatStream {
  const ts = nextTs()
  let resolve!: (p: PostedMessage) => void
  const done = new Promise<PostedMessage>((r) => (resolve = r))
  const st: Stream = { app, channel, threadTs, ts, mode, segments: [], final: [], revealed: 0, inserted: false, stopped: false, last: 0, done, resolve }
  const key = `${channel}/${ts}`
  streams.set(key, st)
  useAgentStore.setState((s) => ({ streaming: { ...s.streaming, [key]: true } }))
  return {
    channel,
    ts,
    append: async ({ markdown_text, chunks } = {}) => {
      if (st.stopped) return
      checkCall(st, 'appendStream', markdown_text, chunks)
      addContent(st, markdown_text, chunks)
      pump(st)
    },
    stop: async ({ markdown_text, chunks, blocks } = {}) => {
      if (!st.stopped) {
        checkCall(st, 'stopStream', markdown_text, chunks)
        addContent(st, markdown_text, chunks)
        st.final = blocks ?? []
        st.stopped = true
        pump(st)
      }
      return st.done
    },
  }
}

/** Whether a message is still streaming in. */
export const isStreaming = (channel: string, ts: string) => !!useAgentStore.getState().streaming[`${channel}/${ts}`]

/** Stops every stream in a conversation (the composer's stop button, a reset). */
export function stopStreams(channel?: string) {
  for (const st of streams.values()) if (!channel || st.channel === channel) finish(st, true)
}

function addContent(st: Stream, markdown?: string, chunks: StreamChunk[] = []) {
  const all: StreamChunk[] = [...(markdown ? [{ type: 'markdown_text' as const, text: markdown }] : []), ...chunks]
  for (const c of all) {
    if (c.type === 'markdown_text') {
      const text = c.text ?? (c as unknown as { markdown_text?: string }).markdown_text ?? ''
      const last = st.segments[st.segments.length - 1]
      if (last?.kind === 'md') last.text += text
      else st.segments.push({ kind: 'md', text })
    } else if (c.type === 'task_update') {
      const task: PlanTask = taskFields(c)
      if (st.mode === 'plan') {
        const plan = planSegment(st)
        const i = plan.tasks.findIndex((t) => t.task_id === task.task_id)
        plan.tasks = i === -1 ? [...plan.tasks, task] : plan.tasks.map((t, j) => (j === i ? { ...t, ...task } : t))
      } else {
        const seg = st.segments.find((s): s is Extract<Segment, { kind: 'task' }> => s.kind === 'task' && s.task.task_id === task.task_id)
        if (seg) seg.task = { ...seg.task, ...task }
        else st.segments.push({ kind: 'task', task })
      }
    } else if (c.type === 'plan_update') {
      // Plans only exist in plan mode (a message can't mix a plan block with task cards).
      if (st.mode === 'plan') planSegment(st).title = c.title
    } else if (c.type === 'blocks') {
      st.segments.push({ kind: 'blocks', blocks: c.blocks })
    }
  }
  // Task and plan updates change blocks the reveal already passed: redraw right away.
  if (st.inserted) draw(st)
}

function planSegment(st: Stream): PlanBlock {
  let seg = st.segments.find((s): s is Extract<Segment, { kind: 'plan' }> => s.kind === 'plan')
  if (!seg) {
    seg = { kind: 'plan', plan: { type: 'plan', plan_id: `plan_${st.ts.replace('.', '')}`, title: 'Plan', tasks: [] } }
    st.segments.push(seg)
  }
  return seg.plan
}

const TASK_UPDATE_STATUSES = ['in_progress', 'complete', 'error']
const CHUNK_TITLE_LIMIT = 256

/**
 * What Slack's API would reject in a stream call (docs.slack.dev chat.startStream / appendStream, 2026-09-25). The kit
 * still draws it, and says so in the console, so prototypes stay portable to Bolt.
 */
function checkCall(st: Stream, method: string, markdown?: string, chunks?: StreamChunk[]) {
  const problems: string[] = []
  if (markdown && chunks?.length) problems.push('pass markdown_text or chunks, not both')
  for (const c of chunks ?? []) {
    if (c.type === 'task_update' && !TASK_UPDATE_STATUSES.includes(c.status)) problems.push(`task_update status is in_progress, complete or error (got "${c.status}")`)
    if ((c.type === 'task_update' || c.type === 'plan_update') && c.title.length > CHUNK_TITLE_LIMIT) problems.push(`${c.type} titles are limited to ${CHUNK_TITLE_LIMIT} characters`)
    if (c.type === 'plan_update' && st.mode !== 'plan') problems.push('plan_update needs task_display_mode: "plan" (ignored)')
  }
  if (problems.length) console.warn(`[app kit] ${st.app.def.name} chat.${method}: ${problems.join('; ')}`)
}

function pump(st: Stream) {
  if (st.timer !== undefined) return
  st.last = performance.now()
  const tick = () => {
    const now = performance.now()
    const step = Math.max(1, Math.floor(((now - st.last) / 1000) * CHARS_PER_SECOND))
    st.last = now
    const total = contentLength(st)
    st.revealed = Math.min(total, st.revealed + step)
    draw(st)
    if (st.revealed >= total) {
      st.timer = undefined
      if (st.stopped) finish(st)
      return
    }
    st.timer = window.setTimeout(tick, TICK_MS)
  }
  st.timer = window.setTimeout(tick, TICK_MS)
}

/** Characters (tokens) of streamable text; everything else is instant. */
function contentLength(st: Stream) {
  return st.segments.reduce((n, s) => n + (s.kind === 'md' ? mdBlocks(s.text).reduce((k, b) => k + blockLength(b), 0) : 0), 0)
}

const mdCache = new Map<string, KitBlock[]>()
function mdBlocks(text: string): KitBlock[] {
  let b = mdCache.get(text)
  if (!b) {
    b = markdownToBlocks(text)
    if (mdCache.size > 200) mdCache.clear()
    mdCache.set(text, b)
  }
  return b
}

/** The blocks the reveal has reached. `complete` adds the final blocks. */
function visibleBlocks(st: Stream, complete: boolean): { blocks: AnyBlock[]; text: string } {
  let budget = complete ? Infinity : st.revealed
  const out: AnyBlock[] = []
  const texts: string[] = []
  let n = 0
  const id = () => `${st.ts.slice(-6)}s${n++}`
  for (const seg of st.segments) {
    if (budget <= 0 && !complete) break
    if (seg.kind === 'md') {
      texts.push(seg.text)
      for (const b of mdBlocks(seg.text)) {
        if (budget <= 0) break
        const len = blockLength(b)
        if (len <= budget) {
          out.push({ ...b, block_id: id() })
          budget -= len
        } else {
          // Only rich text animates; a header or table waits until the reveal reaches it in full.
          if (b.type === 'rich_text' && b.elements) out.push({ type: 'rich_text', block_id: id(), elements: sliceElements(b.elements, budget) } as KitBlock)
          budget = 0
        }
      }
    } else if (seg.kind === 'task') {
      // Task cards have no `pending` (checkCall flags it); draw one as in progress.
      out.push({ type: 'task_card', block_id: id(), ...seg.task, status: seg.task.status === 'pending' ? 'in_progress' : seg.task.status } satisfies TaskCardBlock)
    } else if (seg.kind === 'plan') {
      out.push({ ...seg.plan, block_id: id() })
    } else {
      out.push(...seg.blocks)
    }
  }
  if (complete) out.push(...st.final)
  return { blocks: out, text: texts.join('') }
}

function draw(st: Stream) {
  const { blocks, text } = visibleBlocks(st, false)
  if (!blocks.length) return
  const plain = plainText(text).slice(0, Math.max(1, st.revealed))
  if (!st.inserted) {
    st.inserted = true
    // The agent answering clears its "is thinking…" status (Slack does this when the message is posted).
    if (st.threadTs) clearStatus(threadKey(st.channel, st.threadTs))
    insertMessage(st.channel, { ts: st.ts, userId: st.app.botUserId, text: plain, blocks }, st.threadTs)
    return
  }
  mapMessage(st.channel, st.ts, (m) => ({ ...m, text: plain, blocks }))
}

function finish(st: Stream, interrupted = false) {
  const key = `${st.channel}/${st.ts}`
  if (!streams.has(key)) return
  streams.delete(key)
  window.clearTimeout(st.timer)
  st.timer = undefined
  const { blocks, text } = visibleBlocks(st, !interrupted)
  if (blocks.length) {
    if (!st.inserted) {
      st.inserted = true
      if (st.threadTs) clearStatus(threadKey(st.channel, st.threadTs))
      insertMessage(st.channel, { ts: st.ts, userId: st.app.botUserId, text: plainText(text), blocks }, st.threadTs)
    } else mapMessage(st.channel, st.ts, (m) => ({ ...m, text: plainText(text), blocks }))
  }
  useAgentStore.setState((s) => {
    const streaming = { ...s.streaming }
    delete streaming[key]
    return { streaming }
  })
  st.resolve({ channel: st.channel, ts: st.ts, threadTs: st.threadTs })
}

/** Markdown → a plain fallback (notifications, search, the DMs list). */
function plainText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Rich text tokens: every character of a text element is one, any other element (link, emoji, mention) is one.

function inlineLength(els: RtInline[]) {
  return els.reduce((n, e) => n + (e.type === 'text' ? Math.max(1, e.text.length) : 1), 0)
}

function elementLength(el: RtElement): number {
  if (el.type === 'rich_text_divider') return 1
  return el.type === 'rich_text_list' ? el.elements.reduce((n, s) => n + inlineLength(s.elements), 0) : inlineLength(el.elements)
}

export function blockLength(b: KitBlock): number {
  if (b.type === 'rich_text') return b.elements ? b.elements.reduce((n, e) => n + elementLength(e), 0) : (b.text?.length ?? 0)
  return 0
}

function sliceInlines(els: RtInline[], budget: number): { els: RtInline[]; used: number } {
  const out: RtInline[] = []
  let used = 0
  for (const e of els) {
    if (used >= budget) break
    if (e.type === 'text') {
      const len = Math.max(1, e.text.length)
      const take = Math.min(len, budget - used)
      out.push(take >= len ? e : { ...e, text: e.text.slice(0, take) })
      used += take
    } else {
      out.push(e)
      used += 1
    }
  }
  return { els: out, used }
}

function sliceElements(elements: RtElement[], budget: number): RtElement[] {
  const out: RtElement[] = []
  let left = budget
  for (const el of elements) {
    if (left <= 0) break
    if (el.type === 'rich_text_list') {
      const items = []
      for (const sec of el.elements) {
        if (left <= 0) break
        const { els, used } = sliceInlines(sec.elements, left)
        items.push({ ...sec, elements: els })
        left -= used
      }
      out.push({ ...el, elements: items })
    } else if (el.type === 'rich_text_divider') {
      // a divider has no text; it streams in as one unit
      out.push(el)
      left -= 1
    } else {
      const { els, used } = sliceInlines(el.elements, left)
      out.push({ ...el, elements: els } as RtElement)
      left -= used
    }
  }
  return out
}

/** Finds the conversation (thread root ts) a message belongs to. */
export function conversationOf(channel: string, ts: string): string | undefined {
  const found = findMessage(channel, ts)
  if (!found) return undefined
  return found.threadTs ?? ts
}
