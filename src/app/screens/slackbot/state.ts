import { create } from 'zustand'
import { useApp } from '../../store'
import { makeTs } from '../../../lib/time'
import { blocksFromLines } from '../../../data/canvas/templates'
import type { Fixture, SlackbotChatSeed, SlackList, WorkspaceFile } from '../../../data/types'
import { answer, provisionalTitle, type Artifact, type PlanSpec, type Step, type Turn } from './engine'
import { SLACKBOT_DM, SLACKBOT_USER_ID } from './constants'

// Slackbot's conversations (spec search-slackbot-huddles.md §2.1): each one is a thread in the Slackbot DM, seeded from
// the workspace's `fx.slackbot.chats` and re-seeded when a prototype replaces the workspace. Sending a prompt starts a
// thread (or continues the open one); the answer works through its timeline steps about 0.9 s apart, then streams in
// word by word (ported from the web clone, slack-remix src/components/slackbot/state.ts).

export interface Timeline {
  /** steps revealed so far */
  steps: Step[]
  /** header once done: the answer's summary */
  summary?: Step
  done: boolean
}

export type TaskStatus = 'pending' | 'in_progress' | 'complete'

export interface PlanState {
  title: string
  tasks: { title: string; details?: string; status: TaskStatus }[]
}

export interface SbMessage {
  ts: string
  role: 'user' | 'bot'
  /** mrkdwn */
  text: string
  /** bot: characters of `text` revealed so far (undefined = all) */
  shown?: number
  phase?: 'thinking' | 'streaming' | 'done' | 'stopped'
  timeline?: Timeline
  plan?: PlanState
  feedback?: 'good' | 'bad'
}

export interface SbChat {
  /** thread ts (the root message's ts) */
  id: string
  title: string
  messages: SbMessage[]
  /** ts of the last message */
  updated: string
  starred?: boolean
  followUp?: string
}

interface SlackbotState {
  chats: SbChat[]
  /** the thread on screen; null = the landing page */
  chatId: string | null
  /** a new welcome line each time the landing page comes on screen (SlackbotAiLandingContentPlugin.swift:201-221) */
  landingKey: number
  openChat: (id: string) => void
  newChat: () => void
  ask: (question: string) => void
  stop: (chatId: string) => void
  deleteChat: (chatId: string) => void
  setFeedback: (chatId: string, ts: string, value: 'good' | 'bad') => void
}

let seq = 0
function nowTs() {
  seq = (seq + 1) % 1000
  return makeTs(new Date(), 700 + seq)
}
const tsAt = (secs: number, n: number) => `${Math.floor(secs)}.${String(200000 + n * 1777).padStart(6, '0')}`

/** Seeded conversations: each turn becomes a question + a finished answer, a minute or so apart. */
function seedChats(fx: Fixture): SbChat[] {
  const seeds: SlackbotChatSeed[] = fx.slackbot?.chats ?? []
  const chats = seeds.map((seed): SbChat => {
    const start = parseFloat(seed.id)
    const messages: SbMessage[] = []
    seed.turns.forEach((t, i) => {
      const base = start + i * 90
      messages.push({ ts: i === 0 ? seed.id : tsAt(base, i * 2), role: 'user', text: t.question })
      messages.push({
        ts: tsAt(base + 6, i * 2 + 1),
        role: 'bot',
        text: t.answer,
        phase: 'done',
        timeline: t.status ? { steps: (t.steps ?? [t.status]).map((text) => ({ icon: 'search', text })), summary: { icon: 'search', text: t.status }, done: true } : undefined,
      })
    })
    return { id: seed.id, title: seed.title, messages, updated: messages[messages.length - 1]?.ts ?? seed.id, starred: seed.starred, followUp: seed.turns[seed.turns.length - 1]?.followUp }
  })
  // A scheduled task that ran today posted its result as a thread Slackbot started (History emphasizes those,
  // AiHistoryPresenter.swift:152-164).
  for (const task of fx.slackbot?.tasks ?? []) {
    if (!task.enabled || !task.lastRun) continue
    const result = answer(task.prompt, { fx, messages: fx.messages, threads: fx.threads ?? {}, history: [] })
    chats.push({ id: task.lastRun, title: task.title, messages: [{ ts: task.lastRun, role: 'bot', text: `*${task.title}*\n${result.text}`, phase: 'done', timeline: { steps: result.steps, summary: result.summary, done: true } }], updated: task.lastRun, followUp: result.followUp })
  }
  return chats.sort((a, b) => parseFloat(b.updated) - parseFloat(a.updated))
}

const timers = new Map<string, number[]>()
function clearTimers(chatId: string) {
  for (const t of timers.get(chatId) ?? []) window.clearTimeout(t)
  timers.delete(chatId)
}
function later(chatId: string, ms: number, fn: () => void) {
  const t = window.setTimeout(fn, ms)
  timers.set(chatId, [...(timers.get(chatId) ?? []), t])
}

/** Word-ish cut points in mrkdwn that never split a `<…>` token, emoji or formatting run. */
export function streamCuts(text: string): number[] {
  const cuts: number[] = []
  let inAngle = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '<') inAngle = true
    else if (c === '>' && inAngle) inAngle = false
    if (!inAngle && (c === ' ' || c === '\n') && balanced(text.slice(0, i))) cuts.push(i)
  }
  cuts.push(text.length)
  return cuts
}

function balanced(prefix: string) {
  // Unclosed *bold*, _italic_, ~strike~ or `code` would flash as raw markers; wait for the closer.
  const line = prefix.slice(prefix.lastIndexOf('\n') + 1)
  const bare = line.replace(/<[^>]*>/g, '').replace(/:[a-z0-9_+-]+:/g, '')
  for (const mark of ['*', '_', '~', '`']) if ((bare.split(mark).length - 1) % 2 === 1) return false
  // A list item or quote that has only its marker so far would render as an empty bullet.
  if (/^(?:[•\-*]|\d+\.|>)$/.test(line.trim())) return false
  // An emoji shortcode in progress (":white_check_ma").
  return !/:[a-z0-9_+-]+$/.test(line)
}

const planState = (p: PlanSpec): PlanState => ({ title: p.title, tasks: p.tasks.map((t, i) => ({ ...t, status: i === 0 ? 'in_progress' : 'pending' })) })

export const useSlackbot = create<SlackbotState>()((set, get) => ({
  chats: seedChats(useApp.getState().fx),
  chatId: null,
  landingKey: 0,

  openChat: (id) => set({ chatId: id }),
  newChat: () => set((s) => ({ chatId: null, landingKey: s.landingKey + 1 })),
  deleteChat: (chatId) => {
    clearTimers(chatId)
    set((s) => ({ chats: s.chats.filter((c) => c.id !== chatId), ...(s.chatId === chatId ? { chatId: null, landingKey: s.landingKey + 1 } : {}) }))
  },
  setFeedback: (chatId, ts, value) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id !== chatId ? c : { ...c, messages: c.messages.map((m) => (m.ts === ts ? { ...m, feedback: m.feedback === value ? undefined : value } : m)) })),
    })),

  ask: (question) => {
    const text = question.trim()
    if (!text) return
    const s = get()
    const app = useApp.getState()
    const existing = s.chatId ? s.chats.find((c) => c.id === s.chatId) : undefined
    const userTs = nowTs()
    const chatId = existing?.id ?? userTs
    const history: Turn[] = []
    if (existing)
      existing.messages.forEach((m, i) => {
        if (m.role === 'user') history.push({ question: m.text, answer: existing.messages[i + 1]?.text, title: existing.title })
      })
    const result = answer(text, { fx: app.fx, messages: app.messages, threads: app.threads, history })
    const botTs = nowTs()
    const bot: SbMessage = { ts: botTs, role: 'bot', text: result.text, shown: 0, phase: 'thinking', timeline: { steps: [result.steps[0]], done: false }, plan: result.plan && planState(result.plan) }
    const user: SbMessage = { ts: userTs, role: 'user', text }
    const chat: SbChat = existing
      ? { ...existing, messages: [...existing.messages, user, bot], updated: botTs, followUp: undefined }
      : { id: chatId, title: provisionalTitle(text), messages: [user, bot], updated: botTs }
    set((st) => ({ chats: [chat, ...st.chats.filter((c) => c.id !== chatId)], chatId }))
    // "Slackbot is typing…": the composer draws the context bar from the store's typing state (§2.5d)
    app.setTyping(SLACKBOT_DM, [SLACKBOT_USER_ID])

    const patchBot = (fn: (m: SbMessage) => SbMessage, chatPatch: Partial<SbChat> = {}) =>
      set((st) => ({ chats: st.chats.map((c) => (c.id !== chatId ? c : { ...c, ...chatPatch, messages: c.messages.map((m) => (m.ts === botTs ? fn(m) : m)) })) }))

    // Timeline (and the plan's tasks, one per step): a step roughly every 0.9 s, then the answer streams in.
    let t = 900
    const planSteps = result.plan?.tasks.length ?? 0
    const beats = Math.max(result.steps.length - 1, planSteps)
    for (let i = 1; i <= beats; i++) {
      const step = result.steps[i]
      later(chatId, t, () =>
        patchBot((m) => ({
          ...m,
          timeline: step ? { ...m.timeline!, steps: [...m.timeline!.steps, step] } : m.timeline,
          plan: m.plan && { ...m.plan, tasks: m.plan.tasks.map((task, k) => ({ ...task, status: k < i ? 'complete' : k === i ? 'in_progress' : task.status })) },
        })),
      )
      t += 850
    }
    const cuts = streamCuts(result.text)
    later(chatId, t, () =>
      patchBot(
        (m) => ({ ...m, phase: 'streaming', timeline: { ...m.timeline!, summary: result.summary, done: true }, plan: m.plan && { ...m.plan, tasks: m.plan.tasks.map((task) => ({ ...task, status: 'complete' })) } }),
        { title: result.title },
      ),
    )
    if (result.artifact) later(chatId, t, () => addArtifact(result.artifact!))
    let i = 0
    const tick = () => {
      i = Math.min(cuts.length - 1, i + 2 + Math.floor(Math.random() * 3))
      const done = i >= cuts.length - 1
      patchBot((m) => ({ ...m, shown: done ? undefined : cuts[i], phase: done ? 'done' : 'streaming' }), done ? { followUp: result.followUp, updated: botTs } : {})
      if (!done) later(chatId, 40 + Math.random() * 35, tick)
      else {
        clearTimers(chatId)
        useApp.getState().setTyping(SLACKBOT_DM, [])
      }
    }
    later(chatId, t + 120, tick)
  },

  stop: (chatId) => {
    clearTimers(chatId)
    useApp.getState().setTyping(SLACKBOT_DM, [])
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id !== chatId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) =>
                m.role === 'bot' && (m.phase === 'thinking' || m.phase === 'streaming')
                  ? {
                      ...m,
                      phase: 'stopped',
                      text: m.text.slice(0, m.shown ?? 0),
                      shown: undefined,
                      timeline: m.timeline && { ...m.timeline, done: true, summary: m.timeline.summary ?? m.timeline.steps[m.timeline.steps.length - 1] },
                    }
                  : m,
              ),
            },
      ),
    }))
  },
}))

/** Whether any message in the chat is still being written. */
export const isWorking = (chat?: SbChat) => !!chat?.messages.some((m) => m.phase === 'thinking' || m.phase === 'streaming')

/** The chat on screen. */
export const useCurrentChat = () => useSlackbot((s) => (s.chatId ? s.chats.find((c) => c.id === s.chatId) : undefined))

// A prototype that replaces the workspace brings its own Slackbot history.
useApp.subscribe((s, prev) => {
  if (s.fx.slackbot === prev.fx.slackbot && s.fx.me === prev.fx.me) return
  for (const id of timers.keys()) clearTimers(id)
  useSlackbot.setState({ chats: seedChats(s.fx), chatId: null })
})

/** What a Create prompt made: a canvas (fx.canvases) or a list (fx.lists), listed in Files as yours, just viewed. */
function addArtifact(a: Artifact) {
  const s = useApp.getState()
  const fx = s.fx
  const ts = makeTs(new Date(), 999)
  const file: WorkspaceFile = { id: a.id, title: a.title, kind: a.kind, creatorId: fx.me, lastViewed: ts }
  if (a.kind === 'canvas') {
    const blocks = blocksFromLines(a.lines, { users: fx.users, conversations: fx.conversations, me: fx.me, domain: fx.workspace.domain })
    const doc = { id: a.id, title: a.title, creatorId: fx.me, created: ts, updated: ts, lastEditorId: fx.me, blocks }
    useApp.setState({ fx: { ...fx, canvases: { ...fx.canvases, [a.id]: doc }, files: [file, ...(fx.files ?? [])] } })
    return
  }
  const list: SlackList = {
    id: a.id,
    title: a.title,
    creatorId: fx.me,
    columns: [
      { id: 'Col01TASK', name: 'Task', type: 'text', width: 320 },
      { id: 'Col02OWNR', name: 'Assignee', type: 'person', width: 200 },
      { id: 'Col03DUE', name: 'Due date', type: 'date', width: 140 },
      { id: 'Col04DONE', name: 'Completed', type: 'checkbox', width: 120 },
    ],
    rows: a.items.map((it, i) => ({ id: `Rec${String(i + 1).padStart(2, '0')}SBOT`, cells: { Col01TASK: it.title, Col02OWNR: it.ownerId ?? '', Col03DUE: it.due ?? '', Col04DONE: 'false' } })),
  }
  useApp.setState({ fx: { ...fx, lists: { ...fx.lists, [a.id]: list }, files: [file, ...(fx.files ?? [])] } })
}
