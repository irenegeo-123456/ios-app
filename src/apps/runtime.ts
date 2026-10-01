import { useMemo } from 'react'
import { create } from 'zustand'
import { useApp } from '../app/store'
import { addToFixture, kitAppById, kitAppByUser, kitApps, onAppRegistered, type RegisteredApp } from './index'
import { closeViews, openView, pushView, updateView } from '../blocks/modal-state'
import type { ModalView, ViewPayload, ViewResponse } from '../blocks/views'
import type { KitAction, KitBlock } from '../blocks/types'
import type { Fixture, Message } from '../data/types'
import type { ActionPayload, AppContext, ChannelRef, Handler, MessageInput, MessageRef, ModalDefinition, PostedMessage, ResponseInput, SuggestedPrompt, ThreadContext, Trigger, UserRef } from './kit'
import { findMessage, insertMessage, mapMessage, nextTs, normalize, threadKey } from './messages'
import {
  agentApp,
  agentView,
  clearStatus,
  createAssistantThread,
  currentContext,
  normalizePrompts,
  openStream,
  setActive,
  setContext,
  setPrompts,
  setStatus as setAgentStatus,
  setTitle as setAgentTitle,
  staticPrompts,
  useAgentStore,
} from './agent'

// App Kit runtime: turns taps, commands, submissions and messages into handler calls with an AppContext, and turns
// the context's calls (say, respond, update, openModal, publishHome, setStatus, sayStream…) into store changes.
// Nothing leaves the browser; a short simulated latency makes apps feel like they talk to a server. The web kit's
// runtime (slack-remix src/apps/runtime.ts) on the mobile store: modals are the 'app-modal' sheet
// (src/blocks/modal-state.ts), toasts the store's showToast.
//
// The API other areas call:
//   runSlashCommand(conversationId, text, threadTs?)   the composer, when the text starts with "/" (true: handled)
//   dispatchDirectMessage(conversationId, text)         the composer, after sending a message in an app DM
//   runBlockAction(appUserId, target, action)           Block Kit elements in messages and App Homes (src/blocks)
//   runMessageShortcut / runGlobalShortcut              message actions › app shortcuts, the composer's / menu
//   useKitHome(appUserId)                               an App Home's blocks (re-rendered on setState / publishHome)

// ------------------------------------------------------------------------------------------------
// App state and published App Homes

interface KitStore {
  /** per-app state, by app id */
  states: Record<string, unknown>
  /** views.publish overrides, by app id */
  homes: Record<string, KitBlock[] | undefined>
  /** App Homes waiting on views.publish (the loading overlay, spec blockkit.md §8 › Home tab), by app id */
  publishing: Record<string, boolean>
}

export const useKitStore = create<KitStore>()(() => ({ states: {}, homes: {}, publishing: {} }))

const initialState = (app: RegisteredApp) => structuredClone(app.def.state ?? {}) as Record<string, unknown>

function appState(app: RegisteredApp): Record<string, unknown> {
  const s = useKitStore.getState().states[app.def.id]
  if (s !== undefined) return s as Record<string, unknown>
  const initial = initialState(app)
  useKitStore.setState((st) => ({ states: { ...st.states, [app.def.id]: initial } }))
  return initial
}

function setAppState(app: RegisteredApp, patch: object | ((s: Record<string, unknown>) => object)) {
  const cur = appState(app)
  const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) }
  useKitStore.setState((st) => ({ states: { ...st.states, [app.def.id]: next } }))
}

const appRef = (app: RegisteredApp) => ({ id: app.def.id, name: app.def.name, botUserId: app.botUserId, dmId: app.dmId })

function userRef(id: string): UserRef {
  const s = useApp.getState()
  const u = s.fx.users[id]
  return { id, name: u?.name ?? id, realName: u?.realName ?? id, avatar: u?.avatar ?? '', title: u?.title, isMe: id === s.fx.me, isApp: !!(u?.isApp || u?.isBot) }
}

const userName = (id: string) => useApp.getState().fx.users[id]?.realName ?? id

function channelRef(idOrName: string | undefined): ChannelRef | undefined {
  if (!idOrName) return undefined
  const { fx } = useApp.getState()
  const name = idOrName.replace(/^#/, '')
  const conv = fx.conversations[idOrName] ?? Object.values(fx.conversations).find((c) => (c.type === 'channel' || c.type === 'private') && c.name === name)
  if (!conv) return undefined
  const isChannel = conv.type === 'channel' || conv.type === 'private'
  const label = conv.type === 'im' || conv.type === 'app' ? (fx.users[conv.userId ?? '']?.realName ?? conv.name) : conv.name
  return { id: conv.id, name: label, type: conv.type, isChannel }
}

/** The App Home blocks for an app user, or undefined when it isn't a kit app with a Home. Re-renders on setState. */
export function useKitHome(appUserId: string | undefined): KitBlock[] | undefined {
  const app = kitAppByUser(appUserId)
  const state = useKitStore((s) => (app ? s.states[app.def.id] : undefined))
  const published = useKitStore((s) => (app ? s.homes[app.def.id] : undefined))
  const me = useApp((s) => s.fx.me)
  return useMemo(() => {
    if (!app?.def.home) return published
    if (published) return published
    if (typeof app.def.home !== 'function') return app.def.home
    try {
      return app.def.home({ state: (state as Record<string, unknown>) ?? initialState(app), user: userRef(me), app: appRef(app), userName })
    } catch (e) {
      console.error(`[app kit] ${app.def.name} home failed`, e)
      return []
    }
  }, [app, state, published, me])
}

/** True while an app's Home tab waits on views.publish. */
export const useHomePublishing = (appUserId: string | undefined) => useKitStore((s) => !!kitAppByUser(appUserId) && !!s.publishing[kitAppByUser(appUserId)!.def.id])

// ------------------------------------------------------------------------------------------------
// Messages

function messageRef(conversationId: string, ts: string): MessageRef | undefined {
  const found = findMessage(conversationId, ts)
  if (!found) return undefined
  const domain = useApp.getState().fx.workspace.domain
  return {
    channel: conversationId,
    ts,
    threadTs: found.threadTs,
    text: found.msg.text,
    user: found.msg.userId,
    blocks: found.msg.blocks as KitBlock[] | undefined,
    permalink: `https://${domain}.slack.com/archives/${conversationId}/p${ts.replace('.', '')}${found.threadTs ? `?thread_ts=${found.threadTs}` : ''}`,
  }
}

/** Resolves chat.postMessage's `channel`: a conversation id, 'name' / '#name', a user id (→ the app DM), or 'app'. */
function resolveChannel(app: RegisteredApp, channel: string | undefined): string | undefined {
  if (!channel || channel === 'app' || channel === 'dm') return app.dmId
  const { fx } = useApp.getState()
  if (fx.conversations[channel]) return channel
  if (fx.users[channel]) return app.dmId
  return channelRef(channel)?.id
}

function post(app: RegisteredApp, conversationId: string, msg: MessageInput | ResponseInput, opts: { threadTs?: string; ephemeral?: boolean; userId?: string } = {}): PostedMessage {
  const { text = '', blocks } = normalize(msg)
  const m: Message = {
    ts: nextTs(),
    userId: opts.userId ?? app.botUserId,
    text,
    ...(blocks?.length ? { blocks } : {}),
    // Ephemeral responses always start a new group (avatar + name), like Slack draws them.
    ...(opts.ephemeral ? { ephemeral: true, subtype: 'bot_message' as const } : {}),
  }
  // An agent posting in a conversation clears its "is thinking…" status, like Slack does.
  if (opts.threadTs && (opts.userId ?? app.botUserId) === app.botUserId) clearStatus(threadKey(conversationId, opts.threadTs))
  return insertMessage(conversationId, m, opts.threadTs)
}

// ------------------------------------------------------------------------------------------------
// The handler context

interface Origin {
  trigger: Trigger
  channelId?: string
  threadTs?: string
  command?: { name: string; text: string; args: string[] }
  action?: KitAction
  surface?: 'message' | 'app_home' | 'modal'
  /** the message an action or shortcut came from */
  source?: { conversationId: string; ts: string }
  view?: ViewPayload['view']
  values?: ViewPayload['values']
  /** agents: the conversation (thread) and what the user asked */
  thread?: { channel: string; ts: string }
  text?: string
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function actionPayload(a: KitAction): ActionPayload {
  return {
    type: a.type,
    action_id: a.actionId,
    block_id: a.blockId,
    ...(a.value !== undefined ? { value: a.value } : {}),
    ...(a.label !== undefined && a.value !== undefined && a.type !== 'button' ? { selected_option: { value: a.value, text: a.label } } : {}),
    ...(a.selectedOptions ? { selected_options: a.selectedOptions.map((o) => ({ value: o.value, text: o.label })) } : {}),
    ...(a.selectedUser ? { selected_user: a.selectedUser } : {}),
    ...(a.selectedUsers ? { selected_users: a.selectedUsers } : {}),
    ...(a.selectedChannel ? { selected_channel: a.selectedChannel } : {}),
    ...(a.selectedDate ? { selected_date: a.selectedDate } : {}),
  }
}

function makeContext(app: RegisteredApp, origin: Origin): AppContext<Record<string, unknown>> {
  const s = useApp.getState()
  const message = origin.source ? messageRef(origin.source.conversationId, origin.source.ts) : undefined
  const threadTs = origin.thread?.ts ?? origin.threadTs ?? message?.threadTs
  const channelId = origin.thread?.channel ?? origin.channelId ?? origin.source?.conversationId
  const target = (t?: PostedMessage | MessageRef) => (t ? { channel: t.channel, ts: t.ts } : message ? { channel: message.channel, ts: message.ts } : undefined)
  // The conversation the Assistant utilities act on: the handler's thread, else the thread the action came from.
  const thread = origin.thread ?? (channelId && threadTs ? { channel: channelId, ts: threadTs } : undefined)
  const convKey = thread ? threadKey(thread.channel, thread.ts) : undefined

  const ctx: AppContext<Record<string, unknown>> = {
    app: appRef(app),
    trigger: origin.trigger,
    user: userRef(s.fx.me),
    channel: channelRef(channelId),
    threadTs,
    command: origin.command,
    action: origin.action ? actionPayload(origin.action) : undefined,
    surface: origin.surface,
    message,
    view: origin.view ? { id: origin.view.id, callback_id: origin.view.callback_id, private_metadata: origin.view.private_metadata, state: origin.view.state, blocks: origin.view.blocks } : undefined,
    values: origin.values ?? {},
    get state() {
      return appState(app)
    },
    setState: (patch) => setAppState(app, patch as object),

    say: async (msg) => {
      const channel = channelId ?? app.dmId
      const t = normalize(msg).thread_ts ?? threadTs
      return post(app, channel, msg, { threadTs: t })
    },
    post: async (channel, msg) => {
      const id = resolveChannel(app, channel)
      if (!id) {
        console.warn(`[app kit] ${app.def.name}: no conversation "${channel}"`)
        return undefined
      }
      return post(app, id, msg, { threadTs: normalize(msg).thread_ts })
    },
    reply: async (msg, to) => {
      const t = to ?? message
      if (!t) return ctx.say(msg)
      return post(app, t.channel, msg, { threadTs: t.threadTs ?? t.ts })
    },
    respond: async (msg) => {
      const r = normalize(msg) as Exclude<ResponseInput, string>
      if (r.delete_original) {
        ctx.deleteMessage()
        return undefined
      }
      if (r.replace_original && message) {
        ctx.update(r)
        return { channel: message.channel, ts: message.ts, threadTs: message.threadTs }
      }
      const channel = channelId ?? app.dmId
      const t = r.thread_ts ?? threadTs
      if (r.response_type === 'in_channel') {
        // Slack shows the command itself when an app answers a slash command in the channel.
        if (origin.command) post(app, channel, `${origin.command.name}${origin.command.text ? ` ${origin.command.text}` : ''}`, { threadTs: t, userId: s.fx.me })
        return post(app, channel, r, { threadTs: t })
      }
      return post(app, channel, r, { threadTs: t, ephemeral: true })
    },
    ephemeral: async (msg, channel) => post(app, resolveChannel(app, channel ?? channelId) ?? app.dmId, msg, { threadTs: channel ? undefined : threadTs, ephemeral: true }),
    update: (msg, t) => {
      const where = target(t)
      if (!where) return
      const { text, blocks } = normalize(msg)
      mapMessage(where.channel, where.ts, (m) => ({ ...m, ...(text !== undefined ? { text } : {}), ...(blocks ? { blocks } : {}), edited: m.edited }))
    },
    deleteMessage: (t) => {
      const where = target(t)
      if (where) mapMessage(where.channel, where.ts, () => null)
    },

    openModal: (view) => openView(toView(app, view, origin)).id,
    pushModal: (view) => pushView(toView(app, view, origin)).id,
    updateModal: (view, viewId) => void updateView(toView(app, view, origin), viewId ?? origin.view?.id),
    closeModal: () => closeViews(false),
    publishHome: (blocks) => useKitStore.setState((st) => ({ homes: { ...st.homes, [app.def.id]: blocks } })),

    toast: (text, icon = 'check') => useApp.getState().showToast(text, icon),
    sleep,
    mention: (userId) => `<@${userId}>`,
    userName,
    userInfo: (userId) => (useApp.getState().fx.users[userId] ? userRef(userId) : undefined),
    channelRef,

    // Agents
    thread,
    text: origin.text,
    setStatus: async (status) => {
      if (!convKey) return
      // Under a top-level @-mention the status is the loader under the message; in threads it's the footer line.
      const banner = origin.trigger === 'app_mention' && thread && !findMessage(thread.channel, thread.ts)?.threadTs && !useApp.getState().threads[convKey]?.length
      setAgentStatus(convKey, app.botUserId, status, banner ? 'banner' : 'typing')
    },
    setSuggestedPrompts: async (prompts) => {
      const p = normalizePrompts(prompts)
      // Agent view DMs show them at the top of Messages (set without a thread); otherwise on the conversation.
      if (!thread || (thread.channel === app.dmId && agentView(app) === 'agent' && origin.trigger === 'thread_started')) setPrompts(app.dmId, p)
      else setPrompts(convKey!, p)
    },
    setTitle: async (title) => {
      if (thread) setAgentTitle(thread.channel, thread.ts, title)
    },
    getThreadContext: async () => (convKey ? (useAgentStore.getState().contexts[convKey] ?? {}) : currentContext()),
    saveThreadContext: async (extra) => {
      if (convKey) setContext(convKey, { ...currentContext(), ...(useAgentStore.getState().contexts[convKey] ?? {}), ...(extra ?? {}) })
    },
    sayStream: (opts) => openStream(app, channelId ?? app.dmId, threadTs, opts?.task_display_mode),
  }
  return ctx
}

/** A modal definition wired to the app's view handlers. */
function toView(app: RegisteredApp, def: ModalDefinition, origin: Origin): Omit<ModalView, 'id'> {
  return {
    ...def,
    appId: app.botUserId,
    onSubmit: async (payload) => {
      const handler = def.callback_id ? app.def.views?.[def.callback_id] : undefined
      if (!handler) return
      await sleep(latency(app))
      try {
        return (await handler(makeContext(app, { ...origin, trigger: 'view_submission', surface: 'modal', view: payload.view, values: payload.values }))) as ViewResponse | void
      } catch (e) {
        reportError(app, e, origin)
        // The modal shows Slack's "Sorry, there was an unexpected error" snackbar (AppViewPresenter.swift:136-142).
        throw e
      }
    },
    onAction: (action, payload) => {
      const handler = findHandler(app, action.actionId)
      if (handler) return invoke(app, handler, { ...origin, trigger: 'block_action', surface: 'modal', action, view: payload.view, values: payload.values })
    },
    onClose: (payload) => {
      if (!def.notify_on_close || !def.callback_id) return
      const handler = app.def.viewClosed?.[def.callback_id]
      if (handler) void invoke(app, handler, { ...origin, trigger: 'view_closed', surface: 'modal', view: payload.view, values: payload.values })
    },
  }
}

const latency = (app: RegisteredApp) => app.def.latency ?? 300

function reportError(app: RegisteredApp, e: unknown, origin: Origin) {
  console.error(`[app kit] ${app.def.name} handler failed`, e)
  const reason = e instanceof Error ? e.message : String(e)
  if (origin.command) post(app, origin.channelId ?? app.dmId, `\`${origin.command.name}\` failed with the error "${reason}"`, { threadTs: origin.threadTs, ephemeral: true })
  if (origin.thread) clearStatus(threadKey(origin.thread.channel, origin.thread.ts))
}

async function invoke(app: RegisteredApp, handler: Handler<Record<string, unknown>>, origin: Origin) {
  await sleep(latency(app))
  try {
    await handler(makeContext(app, origin))
  } catch (e) {
    reportError(app, e, origin)
  }
}

/** block_actions handler by action_id; 'prefix_*' keys match by prefix. */
function findHandler(app: RegisteredApp, actionId: string): Handler<Record<string, unknown>> | undefined {
  const actions = app.def.actions ?? {}
  if (actions[actionId]) return actions[actionId]
  const key = Object.keys(actions).find((k) => k.endsWith('*') && actionId.startsWith(k.slice(0, -1)))
  return key ? actions[key] : undefined
}

// ------------------------------------------------------------------------------------------------
// Entry points (the UI calls these)

/** True when `userId` is a kit app's bot. */
export const isKitApp = (userId: string | undefined) => !!kitAppByUser(userId)

/**
 * A slash command typed in a composer: `runSlashCommand(conversationId, '/launchpad status', threadTs?)`. Returns
 * false when no app owns the command (the composer then sends the text, or says the command doesn't exist). The web
 * kit's form, `runSlashCommand(text, { conversationId, threadTs })`, works too.
 */
export function runSlashCommand(conversationId: string, text: string, threadTs?: string): boolean
export function runSlashCommand(text: string, where: { conversationId: string; threadTs?: string }): boolean
export function runSlashCommand(a: string, b: string | { conversationId: string; threadTs?: string }, c?: string): boolean {
  const [text, where] = typeof b === 'string' ? [b, { conversationId: a, threadTs: c }] : [a, b]
  const m = text.trim().match(/^(\/[\w-]+)\s*([\s\S]*)$/)
  if (!m) return false
  const name = m[1].toLowerCase()
  for (const app of kitApps()) {
    const cmd = app.def.commands?.find((x) => x.command.toLowerCase() === name)
    if (!cmd) continue
    const rest = m[2].trim()
    void invoke(app, cmd.handler, { trigger: 'command', channelId: where.conversationId, threadTs: where.threadTs, command: { name: cmd.command, text: rest, args: rest ? rest.split(/\s+/) : [] } })
    return true
  }
  return false
}

/**
 * A Block Kit interaction in a kit app's message or App Home. Resolves when the app has answered (the element's
 * spinner shows until then, spec blockkit.md §6); undefined when the app isn't a kit app (the data-driven demo apps
 * in demo-slackbot.ts handle theirs: src/blocks/actions.ts).
 */
export function runBlockAction(appUserId: string, target: { surface: 'message' | 'app_home'; conversationId?: string; ts?: string }, action: KitAction): Promise<void> | undefined {
  const app = kitAppByUser(appUserId)
  if (!app) return undefined
  const handler = findHandler(app, action.actionId)
  if (!handler) return sleep(latency(app))
  return invoke(app, handler, {
    trigger: 'block_action',
    surface: target.surface,
    action,
    channelId: target.conversationId ?? (target.surface === 'app_home' ? app.dmId : undefined),
    source: target.conversationId && target.ts ? { conversationId: target.conversationId, ts: target.ts } : undefined,
  })
}

/** The web kit's name for runBlockAction: true when the app is a kit app (its handler runs). */
export function dispatchBlockAction(appUserId: string, target: { surface: 'message' | 'app_home'; conversationId?: string; ts?: string }, action: KitAction): boolean {
  return runBlockAction(appUserId, target, action) !== undefined
}

/** A message shortcut from a message's actions sheet (its app shortcuts). */
export function runMessageShortcut(appUserId: string, callbackId: string, where: { conversationId: string; ts: string }) {
  const app = kitAppByUser(appUserId)
  const sc = app?.def.messageShortcuts?.find((s) => s.callback_id === callbackId)
  if (app && sc) void invoke(app, sc.handler, { trigger: 'message_shortcut', channelId: where.conversationId, source: where })
}

/** A global shortcut (the composer's / menu). */
export function runGlobalShortcut(appUserId: string, callbackId: string, where: { conversationId?: string } = {}) {
  const app = kitAppByUser(appUserId)
  const sc = app?.def.globalShortcuts?.find((s) => s.callback_id === callbackId)
  if (app && sc) void invoke(app, sc.handler, { trigger: 'global_shortcut', channelId: where.conversationId })
}

/**
 * A message the user sent in a kit app's DM (message.im) → the app's `onMessage`. Call it after sending:
 * `dispatchDirectMessage(conversationId, text)`; the web kit's `(appUserId, conversationId, ts)` works too.
 * Returns true when a kit app got it. Agents get their messages on their own (the store is watched, below).
 */
export function dispatchDirectMessage(conversationId: string, text: string): boolean
export function dispatchDirectMessage(appUserId: string, conversationId: string, ts: string): boolean
export function dispatchDirectMessage(a: string, b: string, c?: string): boolean {
  const s = useApp.getState()
  const byUser = c !== undefined && !!kitAppByUser(a)
  const conversationId = byUser ? b : a
  const conv = s.fx.conversations[conversationId]
  const app = byUser ? kitAppByUser(a) : conv?.type === 'app' ? kitAppByUser(conv.userId) : undefined
  if (!app || app.def.agent || !app.def.onMessage) return false
  const list = s.messages[conversationId] ?? []
  const ts = byUser ? c! : [...list].reverse().find((m) => m.userId === s.fx.me && m.text === b)?.ts
  void invoke(app, app.def.onMessage, { trigger: 'message', channelId: conversationId, text: byUser ? undefined : b, source: ts ? { conversationId, ts } : undefined })
  return true
}

/**
 * Runs a script as an app (demo director beats, the self-test): `withApp('launchpad', (ctx) => ctx.post('#launch-atlas', '…'))`.
 * `ctx.channel` is `channel` (or the conversation on screen).
 */
export async function withApp(appId: string, fn: Handler<Record<string, unknown>>, channel?: string): Promise<void> {
  const app = kitAppById(appId)
  if (!app) return
  const channelId = channel ? resolveChannel(app, channel) : currentContext().channel_id
  await fn(makeContext(app, { trigger: 'director', channelId }))
}

/** Runs an app's block action handler as if its button were tapped in `message` (director / self-test). */
export function clickAppButton(appId: string, actionId: string, where: { conversationId: string; ts: string }, value?: string) {
  const app = kitAppById(appId)
  if (!app) return
  dispatchBlockAction(app.botUserId, { surface: 'message', ...where }, { type: 'button', actionId, blockId: '', value })
}

// ------------------------------------------------------------------------------------------------
// Agents: conversations start, messages arrive, the user moves around (assistant_thread_* events, message.im,
// app_mention). Messages are picked up from the store as they're sent.

/** The handler for a new conversation: `threadStarted`, or the greeting and the static prompts. */
function threadStartedHandler(app: RegisteredApp): Handler<Record<string, unknown>> {
  const agent = app.def.agent!
  if (agent.threadStarted) return agent.threadStarted
  return async (ctx) => {
    if (agent.greeting && ctx.thread) await ctx.say(agent.greeting)
    const prompts = staticPrompts(app)
    if (prompts && ctx.thread) await ctx.setSuggestedPrompts(prompts)
  }
}

const agentViewStarted = new Set<string>()

/**
 * Starts a conversation with an agent. Assistant view: a new thread in the agent's DM becomes the active chat and
 * gets `assistant_thread_started`. Agent view: the DM's Messages tab is the conversation; `threadStarted` runs once
 * (it sets the prompts at the top of Messages). Returns the thread ts (assistant view).
 */
export function startAgentConversation(botUserId: string): string | undefined {
  const app = agentApp(botUserId)
  if (!app) return undefined
  if (agentView(app) === 'agent') {
    if (!agentViewStarted.has(app.botUserId)) {
      agentViewStarted.add(app.botUserId)
      void invoke(app, threadStartedHandler(app), { trigger: 'thread_started', channelId: app.dmId })
    }
    return undefined
  }
  const ts = createAssistantThread(app)
  setActive(app.botUserId, ts)
  void invoke(app, threadStartedHandler(app), { trigger: 'thread_started', thread: { channel: app.dmId, ts } })
  return ts
}

/**
 * The conversation an assistant-view chat shows: the active one, else the latest one if it was used in the last 30
 * seconds (Slack reuses recent sessions), else a new one.
 */
export function ensureAgentConversation(botUserId: string, opts: { reuseRecent?: boolean } = {}): string | undefined {
  const app = agentApp(botUserId)
  if (!app || agentView(app) !== 'assistant') return undefined
  const active = useAgentStore.getState().active[botUserId]
  if (active && findMessage(app.dmId, active)) return active
  if (opts.reuseRecent !== false) {
    const s = useApp.getState()
    const latest = [...(s.messages[app.dmId] ?? [])].reverse().find((m) => (s.threads[threadKey(app.dmId, m.ts)] ?? []).some((r) => r.userId === s.fx.me))
    if (latest) {
      const replies = s.threads[threadKey(app.dmId, latest.ts)] ?? []
      const lastTs = replies.length ? replies[replies.length - 1].ts : latest.ts
      if (Date.now() / 1000 - parseFloat(lastTs) <= 30) {
        setActive(botUserId, latest.ts)
        return latest.ts
      }
    }
  }
  return startAgentConversation(botUserId)
}

/** Sends a suggested prompt (or any text) as the user. */
export function sendAgentPrompt(botUserId: string, prompt: SuggestedPrompt | string, threadTs?: string) {
  const app = agentApp(botUserId)
  if (!app) return
  const text = typeof prompt === 'string' ? prompt : prompt.message
  const s = useApp.getState()
  const ts = threadTs ?? (agentView(app) === 'assistant' ? ensureAgentConversation(botUserId) : undefined)
  if (ts) setPrompts(threadKey(app.dmId, ts), undefined)
  s.sendMessage(app.dmId, text, ts)
}

/** Marks a conversation as the active one of an assistant-view agent. */
export function openAgentConversation(botUserId: string, ts: string) {
  setActive(botUserId, ts)
}

/** A message the user sent that the store just received: route agent DMs and @-mentions of agents. */
function onUserMessage(msg: Message, conversationId: string, threadTs: string | undefined) {
  const s = useApp.getState()
  const conv = s.fx.conversations[conversationId]
  if (!conv) return
  if (conv.type === 'app') {
    const app = agentApp(conv.userId)
    if (!app) return
    // A reply continues its conversation; a new message in the agent view's DM starts one (its own thread).
    const ts = threadTs ?? msg.ts
    const key = threadKey(conversationId, ts)
    setPrompts(key, undefined)
    if (!useAgentStore.getState().contexts[key]) setContext(key, currentContext())
    const handler = app.def.agent!.userMessage ?? app.def.onMessage
    if (handler) void invoke(app, handler, { trigger: 'message', thread: { channel: conversationId, ts }, text: msg.text, source: { conversationId, ts: msg.ts } })
    return
  }
  if (conv.type !== 'channel' && conv.type !== 'private' && conv.type !== 'mpim') return
  // @-mentions of agents in channels (app_mention); the answer goes in the message's thread.
  for (const [, id] of msg.text.matchAll(/<@([A-Z0-9]+)>/g)) {
    const app = agentApp(id)
    if (!app) continue
    const ts = threadTs ?? msg.ts
    const key = threadKey(conversationId, ts)
    if (!useAgentStore.getState().contexts[key]) setContext(key, { channel_id: conversationId, team_id: s.fx.workspace.id, enterprise_id: null })
    // Slack shows the agent working right away: the loader under a top-level mention, "is typing" in a thread.
    setAgentStatus(key, app.botUserId, threadTs ? 'is typing' : '', threadTs ? 'typing' : 'banner')
    const text = msg.text.replace(new RegExp(`<@${id}>\\s*`, 'g'), '').trim()
    const handler = app.def.agent!.appMention ?? app.def.agent!.userMessage
    if (handler) void invoke(app, handler, { trigger: 'app_mention', thread: { channel: conversationId, ts }, text, source: { conversationId, ts: msg.ts } })
  }
}

/** assistant_thread_context_changed: the user moved while an agent conversation is open next to it. */
export function notifyContextChanged(botUserId: string) {
  const app = agentApp(botUserId)
  const ts = useAgentStore.getState().active[botUserId]
  if (!app || !ts || !app.def.agent?.threadContextChanged) return
  const key = threadKey(app.dmId, ts)
  const next = currentContext()
  const prev: ThreadContext | undefined = useAgentStore.getState().contexts[key]
  if (prev?.channel_id === next.channel_id) return
  setContext(key, { ...prev, ...next })
  void invoke(app, app.def.agent.threadContextChanged, { trigger: 'thread_context_changed', thread: { channel: app.dmId, ts } })
}

// Watch the store for messages the signed-in user sends (the composers call sendMessage) and route the ones meant
// for agents. Only lists whose identity changed are compared.
useApp.subscribe((s, prev) => {
  if (s.messages === prev.messages && s.threads === prev.threads) return
  // A new workspace (a prototype loading) isn't news.
  if (s.fx !== prev.fx && s.fx.messages === s.messages) return
  const me = s.fx.me
  const fresh = (list: Message[] | undefined, before: Message[] | undefined) => {
    if (!list || list === before) return []
    const seen = new Set((before ?? []).map((m) => m.ts))
    return list.filter((m) => m.userId === me && !seen.has(m.ts))
  }
  if (s.messages !== prev.messages) for (const [id, list] of Object.entries(s.messages)) for (const m of fresh(list, prev.messages[id])) onUserMessage(m, id, undefined)
  if (s.threads !== prev.threads)
    for (const [key, list] of Object.entries(s.threads)) {
      const found = fresh(list, prev.threads[key])
      if (!found.length) continue
      const slash = key.indexOf('/')
      for (const m of found) onUserMessage(m, key.slice(0, slash), key.slice(slash + 1))
    }
})

// ------------------------------------------------------------------------------------------------
// Apps registered after the store copied the demo workspace

/**
 * The store copies the demo fixture when it's created, which can be before the built-in apps (src/apps/index.ts
 * APPS) or a later registerApp() added theirs. This puts an app's bot user, DM, profile and seed messages into the
 * live workspace, once (a prototype that loads a new fixture brings its apps along already).
 */
function ensureInStore(app: RegisteredApp) {
  const s = useApp.getState()
  if (s.fx.users[app.botUserId]?.isApp && s.fx.conversations[app.dmId] && s.fx.apps?.[app.botUserId]) return
  const fx: Fixture = { ...structuredClone(s.fx), messages: structuredClone(s.messages), threads: structuredClone(s.threads) }
  addToFixture(fx, app)
  useApp.setState({ fx, messages: fx.messages, threads: fx.threads ?? {} })
}

for (const app of kitApps()) ensureInStore(app)
onAppRegistered(ensureInStore)
