import type {
  ActionsBlock,
  ButtonElement,
  ChannelsSelectElement,
  CheckboxesElement,
  ContextBlock,
  DatepickerElement,
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  ImageElement,
  InputBlock,
  InteractiveElement,
  KitAction,
  KitBlock,
  MarkdownBlock,
  MultiStaticSelectElement,
  MultiUsersSelectElement,
  OptionObject,
  OverflowElement,
  PlainTextInputElement,
  RadioButtonsElement,
  SectionBlock,
  StaticSelectElement,
  TextObject,
  UsersSelectElement,
} from '../blocks/types'
import type { FlatValue, ViewResponse, ViewStateValues } from '../blocks/views'
import type { ConversationType, Fixture, Message } from '../data/types'

// ================================================================================================
// App Kit: define a Slack app in one file. The clone renders it the way Slack renders a real app:
// a bot user and an app DM under "Agents & apps", Home / Messages / About tabs, slash commands in the
// composer, message shortcuts under "Connect to apps", and Block Kit messages, modals and App Home whose
// interactions call your handlers. Register the app in src/apps/index.ts. Guide: docs/app-kit.md.
//
// This file only holds types and pure helpers (no store access), so app definitions load with the
// demo fixture. The runtime that calls your handlers is src/apps/runtime.ts.
// ================================================================================================

export type { KitBlock, TextObject, OptionObject, ViewResponse, FlatValue, ViewStateValues }

/**
 * Any block an app can send: the classic Block Kit blocks, plus the agent blocks (`plan`, `task_card`,
 * `context_actions` with `feedback_buttons`), which the shared renderer draws once it knows them.
 */
export type AnyBlock = KitBlock | AgentBlock

/** A message an app sends: mrkdwn text, or text (the notification/fallback) plus Block Kit blocks. */
export type MessageInput = string | { text?: string; blocks?: AnyBlock[]; thread_ts?: string }

/** `respond()` also takes Slack's response_url options. */
export type ResponseInput =
  | string
  | { text?: string; blocks?: AnyBlock[]; response_type?: 'ephemeral' | 'in_channel'; replace_original?: boolean; delete_original?: boolean; thread_ts?: string }

// ------------------------------------------------------------------------------------------------
// Agents (Slack's AI apps): the payloads of assistant.threads.* and chat.startStream / appendStream /
// stopStream, shaped like the Web API so Bolt code reads the same here. Guide: docs/agents.md.

/** A suggested prompt: `title` is the button label, `message` what gets sent when it's clicked. */
export interface SuggestedPrompt {
  title: string
  message: string
}

/** assistant.threads.setSuggestedPrompts: up to 4 prompts and an optional heading ("Try these prompts:" by default). */
export interface SuggestedPrompts {
  title?: string
  prompts: SuggestedPrompt[]
}

/** assistant.threads.setStatus: "is thinking…" next to the agent's name, and `loading_messages` that rotate every 2.4s. */
export interface StatusInput {
  status: string
  loading_messages?: string[]
}

/** A source link on a task (`{ type: 'url', url, text }`). */
export interface TaskSource {
  type: 'url'
  url: string
  text: string
}

/** A plan's task status. Plan blocks may list tasks that haven't started (`pending`). */
export type TaskStatus = 'pending' | 'in_progress' | 'complete' | 'error'
/** A task card's (and a streamed task_update's) status: no `pending` (docs.slack.dev task-card-block, chat.appendStream). */
export type TaskCardStatus = Exclude<TaskStatus, 'pending'>

/** An icon on a task (`{ type: 'icon', name: 'sparkle' }`; names from Slack's icon atom: 'bug', 'calendar', 'rocket'…). */
export interface TaskIcon {
  type: 'icon'
  name: string
}

/** Rich text, or a plain string (turned into a one-section rich_text object). */
export type TaskText = string | RichTextObject

export interface RichTextObject {
  type: 'rich_text'
  elements: unknown[]
}

/**
 * One chunk of a streamed message (the `chunks` of chat.startStream / appendStream / stopStream). Titles are up to
 * 256 characters. Slack takes `markdown_text` or `chunks` in one call, not both.
 */
export type StreamChunk =
  | { type: 'markdown_text'; text: string }
  | { type: 'task_update'; id: string; title: string; status: TaskCardStatus; details?: TaskText; output?: TaskText; sources?: TaskSource[]; icon?: TaskIcon; hide_title?: boolean }
  | { type: 'plan_update'; title: string }
  | { type: 'blocks'; blocks: AnyBlock[] }

/** How task updates render: `timeline` (default) interleaves task cards with the text, `plan` groups them in one plan block. */
export type TaskDisplayMode = 'timeline' | 'plan'

/** A message being streamed (chat.startStream). `append` adds text or chunks, `stop` finishes it (chat.stopStream). */
export interface ChatStream {
  channel: string
  /** the streamed message's ts (like chat.startStream's response) */
  ts: string
  append: (args: { markdown_text?: string; chunks?: StreamChunk[] }) => Promise<void>
  /** `blocks` are added under the text when the stream ends (feedback buttons, actions…) */
  stop: (args?: { markdown_text?: string; chunks?: StreamChunk[]; blocks?: AnyBlock[] }) => Promise<PostedMessage>
}

/** Where the user was when the conversation started (assistant_thread_started's `context`). */
export interface ThreadContext {
  /** the conversation on screen */
  channel_id?: string
  team_id?: string
  enterprise_id?: string | null
  /** anything you saved with saveThreadContext() */
  [key: string]: unknown
}

// Agent blocks (shapes from the Block Kit Builder templates, reference/dom/blockkit-agents.html).

export interface PlanTask {
  task_id: string
  title: string
  status: TaskStatus
  details?: RichTextObject
  output?: RichTextObject
  sources?: TaskSource[]
  icon?: TaskIcon
  /** details become the top line */
  hide_title?: boolean
}

export interface PlanBlock {
  type: 'plan'
  block_id?: string
  plan_id?: string
  title: string
  tasks: PlanTask[]
}

export interface TaskCardBlock {
  type: 'task_card'
  block_id?: string
  task_id: string
  title: string
  status: TaskCardStatus
  details?: RichTextObject
  output?: RichTextObject
  sources?: TaskSource[]
  icon?: TaskIcon
  hide_title?: boolean
}

export interface FeedbackButtonsElement {
  type: 'feedback_buttons'
  action_id: string
  positive_button: { text: TextObject; value: string; accessibility_label?: string }
  negative_button: { text: TextObject; value: string; accessibility_label?: string }
}

export interface IconButtonElement {
  type: 'icon_button'
  action_id: string
  icon: string
  text: TextObject
  value?: string
  accessibility_label?: string
}

/** Small actions under a message (feedback buttons, icon buttons). Messages only. */
export interface ContextActionsBlock {
  type: 'context_actions'
  block_id?: string
  elements: (FeedbackButtonsElement | IconButtonElement)[]
}

export type AgentBlock = PlanBlock | TaskCardBlock | ContextActionsBlock

/** A Block Kit modal, like the `view` you pass to views.open. */
export interface ModalDefinition {
  title: string | TextObject
  submit?: string | TextObject
  close?: string | TextObject
  blocks: KitBlock[]
  /** routes the submission to `views[callback_id]` */
  callback_id?: string
  /** any string you want back on submission (e.g. the channel and message ts the modal is about) */
  private_metadata?: string
  external_id?: string
  /** also call `viewClosed[callback_id]` when the user cancels */
  notify_on_close?: boolean
}

export interface UserRef {
  id: string
  /** display name */
  name: string
  realName: string
  avatar: string
  title?: string
  isMe: boolean
  /** a bot or app user */
  isApp: boolean
}

export interface ChannelRef {
  id: string
  /** channel name without #, or the other person's name for DMs */
  name: string
  type: ConversationType
  isChannel: boolean
}

export interface MessageRef {
  channel: string
  ts: string
  threadTs?: string
  text: string
  /** sender user id */
  user: string
  blocks?: AnyBlock[]
  permalink: string
}

/** A message the app posted: pass it to `ctx.update()` / `ctx.reply()` later. */
export interface PostedMessage {
  channel: string
  ts: string
  threadTs?: string
}

/** A Block Kit interaction (button, select, overflow, datepicker…), shaped like a block_actions action. */
export interface ActionPayload {
  type: KitAction['type']
  action_id: string
  block_id: string
  /** button value, or the chosen option's value */
  value?: string
  selected_option?: { value: string; text: string }
  selected_options?: { value: string; text: string }[]
  selected_user?: string
  selected_users?: string[]
  selected_channel?: string
  selected_date?: string
}

export type Trigger =
  | 'command'
  | 'block_action'
  | 'view_submission'
  | 'view_closed'
  | 'message_shortcut'
  | 'global_shortcut'
  | 'message'
  | 'director'
  /** agents: a new conversation (assistant_thread_started, or the DM's Messages tab opening in the agent view) */
  | 'thread_started'
  /** agents: the user switched conversations while the agent is open next to it */
  | 'thread_context_changed'
  /** agents: someone @-mentioned the agent in a channel */
  | 'app_mention'

/** Everything a handler gets. `ctx.say()`, `ctx.respond()`, `ctx.openModal()`… act like the Web API calls they're named after. */
export interface AppContext<S = Record<string, unknown>> {
  app: { id: string; name: string; botUserId: string; dmId: string }
  trigger: Trigger
  /** the signed-in user (who ran the command / clicked the button) */
  user: UserRef
  /** where it happened: the channel or DM (App Home and global shortcuts: the conversation on screen) */
  channel?: ChannelRef
  /** set when the command ran in a thread composer, or the button is in a thread reply */
  threadTs?: string
  /** slash commands: `/launchpad status now` → { name: '/launchpad', text: 'status now', args: ['status', 'now'] } */
  command?: { name: string; text: string; args: string[] }
  /** block_actions: the element that was used */
  action?: ActionPayload
  /** where the element or shortcut was: a message, the App Home or a modal */
  surface?: 'message' | 'app_home' | 'modal'
  /** block actions in messages and message shortcuts: the message */
  message?: MessageRef
  /** view submissions, view_closed and actions inside a modal */
  view?: { id: string; callback_id?: string; private_metadata?: string; state: { values: ViewStateValues }; blocks: KitBlock[] }
  /** view submissions: every input's value by action_id (text, option value, user id(s), YYYY-MM-DD) */
  values: Record<string, FlatValue>
  /** your app's state (see `state` in defineApp); the App Home re-renders when it changes */
  state: S
  setState: (patch: Partial<S> | ((s: S) => Partial<S>)) => void

  /** chat.postMessage into `ctx.channel` (and `ctx.threadTs`) as the app */
  say: (msg: MessageInput) => Promise<PostedMessage | undefined>
  /** chat.postMessage anywhere: a channel id, '#name', a user id (their DM… the app DM for you) or 'app' (your app DM) */
  post: (channel: string, msg: MessageInput) => Promise<PostedMessage | undefined>
  /** a thread reply under `to` (default: the message the action came from) */
  reply: (msg: MessageInput, to?: PostedMessage | MessageRef) => Promise<PostedMessage | undefined>
  /** response_url: ephemeral by default; `response_type: 'in_channel'` posts publicly, `replace_original` edits the source message */
  respond: (msg: ResponseInput) => Promise<PostedMessage | undefined>
  /** chat.postEphemeral: "Only visible to you" in `ctx.channel` (or `channel`) */
  ephemeral: (msg: MessageInput, channel?: string) => Promise<PostedMessage | undefined>
  /** chat.update: the message the action came from, or `target` */
  update: (msg: MessageInput, target?: PostedMessage | MessageRef) => void
  /** chat.delete */
  deleteMessage: (target?: PostedMessage | MessageRef) => void

  /** views.open: returns the view id */
  openModal: (view: ModalDefinition) => string
  /** views.push: on top of the open modal (Cancel goes back) */
  pushModal: (view: ModalDefinition) => string
  /** views.update: the view the action came from, or `viewId` */
  updateModal: (view: ModalDefinition, viewId?: string) => void
  /** closes every open view */
  closeModal: () => void
  /** views.publish: replace the App Home with these blocks (or re-render `home` from state when called without) */
  publishHome: (blocks?: KitBlock[]) => void

  /** the bottom-right toast ("Task created") */
  toast: (text: string, icon?: string) => void
  /** wait, e.g. between posts in a scripted flow */
  sleep: (ms: number) => Promise<void>
  /** `<@U…>` for mrkdwn */
  mention: (userId: string) => string
  /** a user's full name */
  userName: (userId: string) => string
  /** a user's profile (undefined for unknown ids) */
  userInfo: (userId: string) => UserRef | undefined
  /** a channel by id, 'name' or '#name' */
  channelRef: (idOrName: string) => ChannelRef | undefined

  // ---- Agents (apps with an `agent` definition): Bolt's Assistant utilities. They act on `ctx.thread`,
  // the conversation the handler runs in (a thread in the agent's DM, or under an @-mention in a channel).

  /** the conversation thread: set in agent handlers, and in actions on messages inside one */
  thread?: { channel: string; ts: string }
  /** userMessage / appMention: what the user asked (the @-mention of your agent removed) */
  text?: string
  /** assistant.threads.setStatus: "<Agent> is thinking…" under the conversation; `loading_messages` rotate. '' clears it. */
  setStatus: (status: string | StatusInput) => Promise<void>
  /** assistant.threads.setSuggestedPrompts (up to 4) */
  setSuggestedPrompts: (prompts: SuggestedPrompts | SuggestedPrompt[]) => Promise<void>
  /** assistant.threads.setTitle: the conversation's title in History and on its reply bar */
  setTitle: (title: string) => Promise<void>
  /** where the user was when the conversation started (and anything saved with saveThreadContext) */
  getThreadContext: () => Promise<ThreadContext>
  /** stores the current context (plus `extra`) on the conversation */
  saveThreadContext: (extra?: ThreadContext) => Promise<void>
  /** chat.startStream in the conversation: `append()` text and task updates, then `stop()` */
  sayStream: (opts?: { task_display_mode?: TaskDisplayMode }) => ChatStream
}

export type Handler<S = Record<string, unknown>> = (ctx: AppContext<S>) => void | Promise<void>
/** View submissions may answer like Slack: `{ response_action: 'errors', errors: { block_id: 'message' } }`, 'update', 'push' or 'clear'. */
export type ViewHandler<S = Record<string, unknown>> = (ctx: AppContext<S>) => void | ViewResponse | Promise<void | ViewResponse>

export interface SlashCommand<S = Record<string, unknown>> {
  /** '/launchpad' */
  command: string
  /** usage hint shown after the name in autocomplete, e.g. '[status | task | help]' */
  usage?: string
  description: string
  handler: Handler<S>
}

export interface Shortcut<S = Record<string, unknown>> {
  callback_id: string
  name: string
  description?: string
  handler: Handler<S>
}

export interface HomeContext<S> {
  state: S
  /** who's looking at the Home tab */
  user: UserRef
  app: { id: string; name: string; botUserId: string; dmId: string }
  userName: (userId: string) => string
}

export interface AppDefinition<S = Record<string, unknown>> {
  /** short slug, e.g. 'launchpad' (used for ids) */
  id: string
  /** app name (sidebar, headers, About) */
  name: string
  /** square icon (public path, e.g. '/apps/launchpad.svg'); SVG or PNG ≥ 72px */
  icon: string
  /** larger icon for the About tab (defaults to `icon`) */
  iconLarge?: string
  /** one line about the app */
  description?: string
  /** the bot user; `id`/`dmId` pin existing fixture ids (the migrated demo apps use them) */
  bot?: { name?: string; id?: string; dmId?: string }
  /** channels the app is in (ids or names): channel details › Agents & apps lists it there */
  channels?: string[]
  about?: {
    /** About tab text: first line, then a blank line, then "• feature" lines (or use `features`) */
    description?: string
    features?: string[]
    /** who built it ("Northstar Platform team"); shown with the installer line */
    developer?: string
    /** user id of the person who added it to the workspace (default: you) */
    installedBy?: string
    homepage?: string
    /** "Managed by …" on the About tab (default: the workspace name) */
    managedBy?: string
  }
  /** initial app state; handlers read `ctx.state` and call `ctx.setState()` */
  state?: S
  /** App Home tab: blocks, or a function of the state (re-rendered on setState) */
  home?: KitBlock[] | ((ctx: HomeContext<S>) => KitBlock[])
  commands?: SlashCommand<S>[]
  /** in a message's ⋮ menu › Connect to apps */
  messageShortcuts?: Shortcut<S>[]
  /** in the composer's / menu (next to slash commands) */
  globalShortcuts?: Shortcut<S>[]
  /** block_actions by action_id; 'prefix_*' matches any action_id starting with prefix_ */
  actions?: Record<string, Handler<S>>
  /** view_submission by callback_id */
  views?: Record<string, ViewHandler<S>>
  /** view_closed by callback_id (views opened with notify_on_close) */
  viewClosed?: Record<string, Handler<S>>
  /** messages people send in the app DM (message.im) */
  onMessage?: Handler<S>
  /** makes the app an agent (Slack's AI apps): top bar entry point, split view, suggested prompts, status, streaming */
  agent?: AgentDefinition<S>
  /** adds demo data when the workspace loads: DM history, messages the app already posted… */
  seed?: (fx: Fixture, app: { botUserId: string; dmId: string; ts: (minutesAgo: number) => string }) => void
  /** simulated round trip before a handler runs, in ms (default 300) */
  latency?: number
}

/** A past conversation with an agent (History), seeded when the workspace loads. */
export interface AgentConversationSeed {
  /** the title setTitle() gave it */
  title: string
  /** when it started */
  minutesAgo: number
  /** question → answer; the answer is mrkdwn or a message with blocks */
  turns: { user: string; agent: MessageInput }[]
}

/**
 * An agent, with the handlers of Bolt's `Assistant` class. Every conversation is a thread: in the agent's DM, in the
 * split view next to whatever you're looking at, or under an @-mention in a channel. Handlers get the Assistant
 * utilities on `ctx` (say, setStatus, setSuggestedPrompts, setTitle, getThreadContext, saveThreadContext, sayStream).
 */
export interface AgentDefinition<S = Record<string, unknown>> {
  /**
   * 'agent' (default): Slack's agent messaging experience (`agent_view`): Home / Messages / About tabs, suggested
   * prompts at the top of Messages, each conversation a thread in the DM.
   * 'assistant': the legacy `assistant_view` with Chat and History tabs (still what most installed agents use).
   */
  view?: 'agent' | 'assistant'
  /** assistant_description: under the agent's name at the top of a chat, and in the top bar's agent menu */
  description?: string
  /** static suggested prompts from the app settings (assistant_suggested_prompts), shown until the user asks something */
  suggestedPrompts?: SuggestedPrompt[] | SuggestedPrompts
  /** said when a conversation starts and there's no threadStarted handler */
  greeting?: string
  /** listed in the top bar's agent entry point (default true) */
  topBar?: boolean
  /** assistant_thread_started: a new conversation (New chat, the top bar, the split view; in the agent view, opening Messages) */
  threadStarted?: Handler<S>
  /** assistant_thread_context_changed: the user moved to another conversation while the agent is open next to it */
  threadContextChanged?: Handler<S>
  /** a message in a conversation with the agent (message.im); defaults to the app's `onMessage` */
  userMessage?: Handler<S>
  /** an @-mention in a channel (app_mention); defaults to userMessage */
  appMention?: Handler<S>
  /** past conversations for History and the DM */
  history?: AgentConversationSeed[]
}

/** Declares an app. Registering it (src/apps/index.ts) makes it show up everywhere. */
export function defineApp<S = Record<string, unknown>>(def: AppDefinition<S>): AppDefinition<S> {
  return def
}

/** Seed messages: a message from someone at `ts`. */
export const seedMessage = (ts: string, userId: string, text: string, extra: Partial<Message> = {}): Message => ({ ts, userId, text, ...extra })

/** `blocks` with the block whose block_id is `blockId` swapped for `next` (e.g. buttons → "✅ Approved by …"). */
export function replaceBlock(blocks: AnyBlock[] | undefined, blockId: string, ...next: AnyBlock[]): AnyBlock[] {
  const list = blocks ?? []
  const i = list.findIndex((b) => b.block_id === blockId)
  return i === -1 ? list : [...list.slice(0, i), ...next, ...list.slice(i + 1)]
}

/** The time as Slack writes it in messages: "10:31 AM". */
export function clockTime(d = new Date()): string {
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

/** "Oct 14" from YYYY-MM-DD. */
export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ================================================================================================
// Block Kit builders: plain functions returning Slack's JSON, so blocks read like the Block Kit docs.
// ================================================================================================

const md = (text: string): TextObject => ({ type: 'mrkdwn', text })
const pt = (text: string): TextObject => ({ type: 'plain_text', text, emoji: true })
const text = (t: string | TextObject, as: 'mrkdwn' | 'plain_text' = 'mrkdwn'): TextObject => (typeof t === 'string' ? (as === 'mrkdwn' ? md(t) : pt(t)) : t)

type Opt = [label: string, value: string] | OptionObject

const option = (label: string, value: string, description?: string): OptionObject => ({ text: pt(label), value, ...(description ? { description: pt(description) } : {}) })
const toOption = (o: Opt): OptionObject => (Array.isArray(o) ? option(o[0], o[1]) : o)

export const bk = {
  md,
  pt,
  option,

  header: (t: string, block_id?: string): HeaderBlock => ({ type: 'header', text: pt(t), ...(block_id ? { block_id } : {}) }),
  /** mrkdwn section; `accessory` is a button, overflow, select, datepicker or image */
  section: (t: string | TextObject, opts: { block_id?: string; accessory?: SectionBlock['accessory']; fields?: (string | TextObject)[] } = {}): SectionBlock => ({
    type: 'section',
    text: text(t),
    ...(opts.block_id ? { block_id: opts.block_id } : {}),
    ...(opts.fields ? { fields: opts.fields.map((f) => text(f)) } : {}),
    ...(opts.accessory ? { accessory: opts.accessory } : {}),
  }),
  /** a section of two-column fields */
  fields: (fields: (string | TextObject)[], block_id?: string): SectionBlock => ({ type: 'section', fields: fields.map((f) => text(f)), ...(block_id ? { block_id } : {}) }),
  divider: (): DividerBlock => ({ type: 'divider' }),
  /** context line: mrkdwn strings and images */
  context: (...elements: (string | TextObject | ImageElement)[]): ContextBlock => ({
    type: 'context',
    elements: elements.map((e) => (typeof e === 'string' ? md(e) : e)),
  }),
  actions: (block_id: string, ...elements: InteractiveElement[]): ActionsBlock => ({ type: 'actions', block_id, elements }),
  image: (image_url: string, alt_text: string, title?: string): ImageBlock => ({ type: 'image', image_url, alt_text, ...(title ? { title: pt(title) } : {}) }),
  imageEl: (image_url: string, alt_text: string): ImageElement => ({ type: 'image', image_url, alt_text }),

  button: (label: string, action_id: string, opts: { value?: string; style?: 'primary' | 'danger'; url?: string; accessibility_label?: string } = {}): ButtonElement => ({
    type: 'button',
    text: pt(label),
    action_id,
    ...opts,
  }),
  overflow: (action_id: string, options: Opt[]): OverflowElement => ({ type: 'overflow', action_id, options: options.map(toOption) }),
  select: (action_id: string, placeholder: string, options: Opt[], initial?: string): StaticSelectElement => {
    const opts = options.map(toOption)
    const init = initial !== undefined ? opts.find((o) => o.value === initial) : undefined
    return { type: 'static_select', action_id, placeholder: pt(placeholder), options: opts, ...(init ? { initial_option: init } : {}) }
  },
  multiSelect: (action_id: string, placeholder: string, options: Opt[], initial: string[] = []): MultiStaticSelectElement => {
    const opts = options.map(toOption)
    return { type: 'multi_static_select', action_id, placeholder: pt(placeholder), options: opts, ...(initial.length ? { initial_options: opts.filter((o) => initial.includes(o.value)) } : {}) }
  },
  usersSelect: (action_id: string, placeholder?: string, initial_user?: string): UsersSelectElement => ({
    type: 'users_select',
    action_id,
    ...(placeholder ? { placeholder: pt(placeholder) } : {}),
    ...(initial_user ? { initial_user } : {}),
  }),
  multiUsersSelect: (action_id: string, placeholder?: string, initial_users?: string[]): MultiUsersSelectElement => ({
    type: 'multi_users_select',
    action_id,
    ...(placeholder ? { placeholder: pt(placeholder) } : {}),
    ...(initial_users?.length ? { initial_users } : {}),
  }),
  channelsSelect: (action_id: string, placeholder?: string, initial_channel?: string): ChannelsSelectElement => ({
    type: 'channels_select',
    action_id,
    ...(placeholder ? { placeholder: pt(placeholder) } : {}),
    ...(initial_channel ? { initial_channel } : {}),
  }),
  /** `initial_date` is YYYY-MM-DD */
  datepicker: (action_id: string, initial_date?: string, placeholder?: string): DatepickerElement => ({
    type: 'datepicker',
    action_id,
    ...(initial_date ? { initial_date } : {}),
    ...(placeholder ? { placeholder: pt(placeholder) } : {}),
  }),
  checkboxes: (action_id: string, options: Opt[], initial: string[] = []): CheckboxesElement => {
    const opts = options.map(toOption)
    return { type: 'checkboxes', action_id, options: opts, ...(initial.length ? { initial_options: opts.filter((o) => initial.includes(o.value)) } : {}) }
  },
  radio: (action_id: string, options: Opt[], initial?: string): RadioButtonsElement => {
    const opts = options.map(toOption)
    const init = initial !== undefined ? opts.find((o) => o.value === initial) : undefined
    return { type: 'radio_buttons', action_id, options: opts, ...(init ? { initial_option: init } : {}) }
  },
  textInput: (action_id: string, opts: { placeholder?: string; multiline?: boolean; initial?: string; max_length?: number } = {}): PlainTextInputElement => ({
    type: 'plain_text_input',
    action_id,
    ...(opts.placeholder ? { placeholder: pt(opts.placeholder) } : {}),
    ...(opts.multiline ? { multiline: true } : {}),
    ...(opts.initial !== undefined ? { initial_value: opts.initial } : {}),
    ...(opts.max_length ? { max_length: opts.max_length } : {}),
  }),
  /** an input block; `block_id` defaults to `input_<action_id>` */
  input: (label: string, element: InputBlock['element'], opts: { block_id?: string; optional?: boolean; hint?: string; dispatch_action?: boolean } = {}): InputBlock => ({
    type: 'input',
    block_id: opts.block_id ?? `input_${element.action_id}`,
    label: pt(label),
    element,
    ...(opts.optional ? { optional: true } : {}),
    ...(opts.hint ? { hint: pt(opts.hint) } : {}),
    ...(opts.dispatch_action ? { dispatch_action: true } : {}),
  }),
  modal: (view: ModalDefinition): ModalDefinition => view,

  // ---- Agent blocks

  /** standard markdown, what agents send: Slack renders it as rich text, headings, dividers and tables */
  markdown: (text: string, block_id?: string): MarkdownBlock => ({ type: 'markdown', text, ...(block_id ? { block_id } : {}) }),
  /** a plain string as a rich_text object (task details and outputs) */
  richText: (t: string): RichTextObject => ({ type: 'rich_text', elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text: t }] }] }),
  /** 👍 / 👎 under an answer: a context_actions block with feedback_buttons (clicks go to `actions[action_id]`, value 'positive' / 'negative') */
  feedback: (action_id = 'feedback', opts: { positive?: string; negative?: string; block_id?: string; extra?: IconButtonElement[] } = {}): ContextActionsBlock => ({
    type: 'context_actions',
    ...(opts.block_id ? { block_id: opts.block_id } : {}),
    elements: [
      {
        type: 'feedback_buttons',
        action_id,
        positive_button: { text: pt(opts.positive ?? 'Good Response'), value: 'positive' },
        negative_button: { text: pt(opts.negative ?? 'Bad Response'), value: 'negative' },
      },
      ...(opts.extra ?? []),
    ],
  }),
  /** a small icon button for context_actions (e.g. 'trash' → Remove) */
  iconButton: (icon: string, label: string, action_id: string, value?: string): IconButtonElement => ({ type: 'icon_button', action_id, icon, text: pt(label), ...(value ? { value } : {}) }),
  /** a plan: tasks under one collapsible title (what `task_display_mode: 'plan'` streams into) */
  plan: (title: string, tasks: TaskInput[], plan_id?: string): PlanBlock => ({ type: 'plan', ...(plan_id ? { plan_id } : {}), title, tasks: tasks.map(taskFields) }),
  /** a single task with its status (no `pending`), details, output and sources (what `timeline` mode streams) */
  taskCard: (task: TaskInput & { status: TaskCardStatus }): TaskCardBlock => ({ type: 'task_card', ...taskFields(task), status: task.status }),
}

/** A task for bk.plan / bk.taskCard: details and output may be plain strings. */
export interface TaskInput {
  id: string
  title: string
  status: TaskStatus
  details?: TaskText
  output?: TaskText
  sources?: TaskSource[]
  icon?: TaskIcon
  hide_title?: boolean
}

/** A task's block fields (task_id…), with plain-string details and output as rich text. */
export function taskFields(t: TaskInput): PlanTask {
  const rich = (x?: TaskText) => (x === undefined ? undefined : typeof x === 'string' ? bk.richText(x) : x)
  const details = rich(t.details)
  const output = rich(t.output)
  return {
    task_id: t.id,
    title: t.title,
    status: t.status,
    ...(details ? { details } : {}),
    ...(output ? { output } : {}),
    ...(t.sources?.length ? { sources: t.sources } : {}),
    ...(t.icon ? { icon: t.icon } : {}),
    ...(t.hide_title ? { hide_title: true } : {}),
  }
}
