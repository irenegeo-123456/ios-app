import { create } from 'zustand'
import type { Conversation, FileAttachment, Fixture, Message, SidebarSection } from '../data/types'
import { pickFixture } from '../data/fixtures'
import type { CanvasBlock, CanvasDoc, WorkspaceFile } from '../data/types'

// The app's state: the workspace (a fixture: people, conversations, messages, unreads…), what's on screen (a tab bar
// with one navigation stack per tab, sheets presented over it, the keyboard) and what you do to it (send, react,
// save…). Data actions keep the web clone's names (slack-remix src/store/store.ts) so prototypes and habits carry over.

/** Root tabs, as CompactRootTabBarController builds them on iOS 26: Home, DMs, Activity, Search, then More. */
/** 'slackbot' replaces 'more' in the tab bar when the iOS 26 Slackbot tab is on (the sim's slackbotTab setting) */
export type Tab = 'home' | 'dms' | 'activity' | 'search' | 'more' | 'slackbot'
export const TABS: Tab[] = ['home', 'dms', 'activity', 'search', 'more', 'slackbot']

/**
 * A screen pushed on a tab's navigation stack. `screen` keys into the screen registry (src/app/screens/registry.ts);
 * prototypes can register their own.
 */
export interface Route {
  screen: string
  [prop: string]: unknown
}

export interface NavEntry {
  key: string
  route: Route
}

export interface SheetEntry {
  key: string
  type: string
  props?: Record<string, unknown>
}

export interface Toast {
  id: number
  text: string
  icon?: string
}

let keySeq = 0
const nextKey = () => `k${++keySeq}`

interface AppState {
  fx: Fixture
  messages: Record<string, Message[]>
  /** thread replies keyed by `${conversationId}/${parentTs}` */
  threads: Record<string, Message[]>
  /** saved-for-later message keys (`${conversationId}/${ts}`) */
  saved: string[]
  /** first unread message when a conversation was opened (the "New" divider) */
  newMarker: { conversationId: string; ts: string } | null
  /** who's typing where (conversation id → user ids) */
  typing: Record<string, string[]>

  // ---- navigation
  tab: Tab
  /** pushed screens per tab (the tab's root screen isn't in the list) */
  stacks: Record<Tab, NavEntry[]>
  sheets: SheetEntry[]
  toast: Toast | null
  /** the app is on screen (false after the Home button: the home screen shows) */
  foreground: boolean

  setTab: (tab: Tab) => void
  push: (route: Route, tab?: Tab) => void
  pop: (tab?: Tab) => void
  popToRoot: (tab?: Tab) => void
  presentSheet: (type: string, props?: Record<string, unknown>) => void
  /** closes the top sheet, or the one with this key */
  dismissSheet: (key?: string) => void
  dismissAllSheets: () => void
  showToast: (text: string, icon?: string) => void
  hideToast: () => void
  setForeground: (foreground: boolean) => void

  // ---- data
  openConversation: (id: string, opts?: { tab?: Tab }) => void
  openThread: (conversationId: string, ts: string) => void
  /** a person's profile, or the App Profile for apps and bots */
  openProfile: (userId: string) => void
  markRead: (conversationId: string) => void
  sendMessage: (conversationId: string, text: string, threadTs?: string, opts?: { alsoSendToChannel?: boolean; files?: FileAttachment[] }) => void
  toggleReaction: (conversationId: string, ts: string, name: string) => void
  toggleSaved: (conversationId: string, ts: string) => void
  setStatus: (emoji: string, text: string) => void
  editMessage: (conversationId: string, ts: string, text: string) => void
  deleteMessage: (conversationId: string, ts: string) => void
  togglePin: (conversationId: string, ts: string) => void
  markUnread: (conversationId: string, ts: string) => void
  setTyping: (conversationId: string, userIds: string[]) => void
  /** a message from someone else arriving live (scenes, the director): badges, mentions, activity */
  receiveMessage: (conversationId: string, msg: Message, threadTs?: string) => void
  reactAs: (conversationId: string, ts: string, name: string, userId: string) => void
  toggleStar: (conversationId: string) => void
  setNotify: (conversationId: string, level: 'all' | 'mentions' | 'muted') => void
  /** finds or creates the DM / group DM with these people; returns its id */
  openDm: (userIds: string[]) => string
  /** replaces the whole workspace (prototypes): resets navigation too */
  loadFixture: (fx: Fixture, start?: { tab?: Tab; stack?: Route[] }) => void
  /** jumps straight to a tab with these screens on its stack, closing sheets (prototype scenes, the director) */
  navigate: (tab: Tab, stack: Route[]) => void

  // ---- composer (src/app/composer, spec composer.md §11)
  /** the sent message being edited (message actions › Edit Message); the composer on screen picks it up */
  editing: EditingTarget | null
  /** starts editing a message in the composer that's on screen, or ends it (null) */
  setEditing: (target: EditingTarget | null) => void

  // ---- search (src/app/screens/search) and Slackbot citations
  /**
   * Opens a conversation at a message: openConversation, with `jumpTs` on the conversation route (scroll to it and
   * highlight it). A thread reply (`threadTs` = its parent) also pushes the thread, with `jumpTs` on the thread route.
   */
  openMessage: (conversationId: string, ts: string, opts?: { tab?: Tab; threadTs?: string }) => void

  // ---- sheets and menus (src/app/sheets; spec sheets-menus.md, home.md §7.6 and §8)
  /** Home's sort and filter menu (HomeNavigationBarControlsManager); the Home list follows it */
  homePrefs: HomePrefs
  setHomePrefs: (prefs: Partial<HomePrefs>) => void
  /** Home's quick-view tiles in order, and which are shown (Customize Home); empty = the default order, all shown */
  homeTiles: HomeTilePref[]
  setHomeTiles: (tiles: HomeTilePref[]) => void
  /** reply notifications you turned on or off from message actions, by `${conversationId}/${ts}` */
  following: Record<string, boolean>
  setFollowing: (conversationId: string, ts: string, on: boolean) => void
  /** leaves a channel: it drops off Home and its open screens close (context menu, header menu, channel details) */
  leaveConversation: (conversationId: string) => void
  /** Home's long-press "Move To…": into a custom section, or (null) back to its own section (Channels, Direct messages…) */
  moveToSection: (conversationId: string, sectionId: string | null) => void
  /** Add Members (InviteToChannel): they join the channel, each with a join message */
  addMembers: (conversationId: string, userIds: string[]) => void
  /** Edit Channel: a new name, topic or description */
  editConversation: (conversationId: string, patch: { name?: string; topic?: string; description?: string }) => void
  /** Forward Message (ShareMessage): posts `text` to `to` with the message attached as a shared-message unfurl */
  forwardMessage: (from: { conversationId: string; ts: string; threadTs?: string }, to: string, text: string) => void

  // ---- Activity, Later, Drafts (src/app/screens/activity, later, drafts; spec dms-activity.md §3, §6, §7)
  /** marks an Activity row read (tapping it does; ActivityMarkReadAction) or unread again; the tab's dot follows */
  markActivityRead: (id: string, read?: boolean) => void
  /** a Later item's state: In Progress, Archived, Completed; `null` removes it from Later */
  setLaterStatus: (conversationId: string, ts: string, status: 'in_progress' | 'archived' | 'completed' | null) => void
  /** deletes drafts or scheduled messages (Drafts & Sent) */
  deleteDrafts: (ids: string[]) => void
  /** a Later item's reminder (a ts in seconds), or none (null); a message saved this session becomes a seeded one */
  setLaterDue: (conversationId: string, ts: string, due: string | null) => void
  /** "Cancel Schedule and Save to Drafts": a scheduled message goes back to Drafts, edited now */
  unscheduleDraft: (id: string) => void

  // ---- canvases and lists (src/app/screens/canvas, src/app/screens/lists; spec canvas-lists-creation.md)
  /** a new canvas, yours, in More › Files; `conversationId` tabs it to that channel or DM (files.createCanvas's
   *  tabbed_channel_id). No title and one empty paragraph unless given. Returns its id. */
  createCanvas: (opts?: { conversationId?: string; title?: string; blocks?: CanvasBlock[] }) => string
  /** edits a canvas (the editor saves its title and blocks here); its More › Files entry follows the title */
  updateCanvas: (id: string, patch: Partial<CanvasDoc>) => void
  /** the canvas menu's Delete: it leaves the workspace and More › Files */
  deleteCanvas: (id: string) => void
  /** one cell of a list item: text, a user id, an option id, an ISO date or "true"; '' or null clears it */
  setListCell: (listId: string, rowId: string, columnId: string, value: string | null) => void
  /** a new list item (Add Item); returns its row id */
  addListRow: (listId: string, cells?: Record<string, string>) => string
  /** removes a list item */
  deleteListRow: (listId: string, rowId: string) => void

  // ---- channels (src/app/screens/channel-flows; spec channels-people.md)
  /**
   * Create Channel: a new public or private channel with you in it, on Home under Channels (A–Z), its history starting
   * with your join message (spec §1.6). Returns its id.
   */
  createChannel: (input: { name: string; isPrivate?: boolean; description?: string }) => string
  /** Join Channel (the preview's drawer, spec §3.4): you're a member, it's on Home, your join message posts */
  joinChannel: (conversationId: string) => void
}

/** Home's sort and filter (HomePreferences): the defaults are Sections, unreads on top, all conversations. */
export interface HomePrefs {
  sortMode: 'sections' | 'recency'
  prioritization: 'unreadsOnTop' | 'none'
  filterMode: 'all' | 'external'
}

/** One quick-view tile on Home (PerTabPreferencesService syntheticViewsTileState). */
export interface HomeTilePref {
  /** catch_up, slackbot, threads, huddles, later, drafts… (the ids Home's Tiles.tsx uses) */
  id: string
  visible: boolean
}

/** A message to edit; `threadTs` narrows it to that thread's composer. */
export interface EditingTarget {
  conversationId: string
  ts: string
  threadTs?: string
}

const emptyStacks = (): Record<Tab, NavEntry[]> => ({ home: [], dms: [], activity: [], search: [], more: [], slackbot: [] })

const initial: Fixture = pickFixture()

export const useApp = create<AppState>()((set, get) => ({
  fx: initial,
  messages: initial.messages,
  threads: initial.threads ?? {},
  saved: [],
  newMarker: null,
  typing: {},

  tab: 'home',
  stacks: emptyStacks(),
  sheets: [],
  toast: null,
  foreground: true,

  setTab: (tab) =>
    set((s) => {
      // Tapping the selected tab again pops it to its root, like UITabBarController.
      if (tab === s.tab) return { stacks: { ...s.stacks, [tab]: [] } }
      return { tab }
    }),
  push: (route, tab) =>
    set((s) => {
      const t = tab ?? s.tab
      return { tab: t, stacks: { ...s.stacks, [t]: [...s.stacks[t], { key: nextKey(), route }] } }
    }),
  pop: (tab) =>
    set((s) => {
      const t = tab ?? s.tab
      return { stacks: { ...s.stacks, [t]: s.stacks[t].slice(0, -1) } }
    }),
  popToRoot: (tab) =>
    set((s) => {
      const t = tab ?? s.tab
      return { stacks: { ...s.stacks, [t]: [] } }
    }),
  presentSheet: (type, props) => set((s) => ({ sheets: [...s.sheets, { key: nextKey(), type, props }] })),
  dismissSheet: (key) => set((s) => ({ sheets: key ? s.sheets.filter((x) => x.key !== key) : s.sheets.slice(0, -1) })),
  dismissAllSheets: () => set({ sheets: [] }),
  showToast: (text, icon) => set({ toast: { id: Date.now(), text, icon } }),
  hideToast: () => set({ toast: null }),
  setForeground: (foreground) => set({ foreground }),

  openConversation: (id, opts) => {
    const s = get()
    const t = opts?.tab ?? (s.tab === 'search' || s.tab === 'more' ? 'home' : s.tab)
    const count = s.fx.unreads[id]?.count ?? 0
    const list = s.messages[id] ?? []
    const first = count > 0 ? list[Math.max(0, list.length - count)]?.ts : undefined
    const unreads = { ...s.fx.unreads }
    delete unreads[id]
    set({
      tab: t,
      stacks: { ...s.stacks, [t]: [...s.stacks[t], { key: nextKey(), route: { screen: 'conversation', id } }] },
      fx: { ...s.fx, unreads },
      newMarker: first ? { conversationId: id, ts: first } : s.newMarker?.conversationId === id ? s.newMarker : null,
      sheets: [],
    })
  },
  openThread: (conversationId, ts) => get().push({ screen: 'thread', conversationId, ts }),
  openProfile: (userId) => {
    const u = get().fx.users[userId]
    get().push({ screen: u?.isApp || u?.isBot ? 'app-profile' : 'profile', userId })
  },
  markRead: (conversationId) =>
    set((s) => {
      if (!s.fx.unreads[conversationId]) return {}
      const unreads = { ...s.fx.unreads }
      delete unreads[conversationId]
      return { fx: { ...s.fx, unreads } }
    }),
  sendMessage: (conversationId, text, threadTs, opts) =>
    set((s) => {
      const msg: Message = { ts: nowTs(), userId: s.fx.me, text, ...(opts?.files?.length ? { files: opts.files } : {}) }
      if (threadTs) {
        const key = `${conversationId}/${threadTs}`
        const threads = { ...s.threads, [key]: [...(s.threads[key] ?? []), msg] }
        const messages = {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
            m.ts === threadTs ? { ...m, replyCount: (m.replyCount ?? s.threads[key]?.length ?? 0) + 1, replyUsers: [...new Set([...(m.replyUsers ?? []), s.fx.me])], latestReply: msg.ts } : m,
          ),
        }
        if (opts?.alsoSendToChannel) messages[conversationId] = [...messages[conversationId], { ...msg, ts: nowTs(), threadTs }]
        return { threads, messages }
      }
      return { messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), msg] } }
    }),
  toggleReaction: (conversationId, ts, name) =>
    set((s) =>
      mapMessage(s, conversationId, ts, (m) => {
        const me = s.fx.me
        const reactions = [...(m.reactions ?? [])]
        const i = reactions.findIndex((r) => r.name === name)
        if (i === -1) reactions.push({ name, users: [me] })
        else {
          const r = reactions[i]
          const users = r.users.includes(me) ? r.users.filter((u) => u !== me) : [...r.users, me]
          if (users.length) reactions[i] = { ...r, users }
          else reactions.splice(i, 1)
        }
        return { ...m, reactions }
      }),
    ),
  toggleSaved: (conversationId, ts) =>
    set((s) => {
      const key = `${conversationId}/${ts}`
      return { saved: s.saved.includes(key) ? s.saved.filter((k) => k !== key) : [...s.saved, key] }
    }),
  setStatus: (emoji, text) =>
    set((s) => {
      const me = { ...s.fx.users[s.fx.me], statusEmoji: emoji || undefined, statusText: text || undefined }
      return { fx: { ...s.fx, users: { ...s.fx.users, [me.id]: me } } }
    }),
  editMessage: (conversationId, ts, text) => set((s) => mapMessage(s, conversationId, ts, (m) => ({ ...m, text, edited: true }))),
  deleteMessage: (conversationId, ts) =>
    set((s) => {
      const threads: Record<string, Message[]> = {}
      for (const [k, list] of Object.entries(s.threads)) if (k !== `${conversationId}/${ts}`) threads[k] = list.filter((m) => !(k.startsWith(`${conversationId}/`) && m.ts === ts))
      return { messages: { ...s.messages, [conversationId]: (s.messages[conversationId] ?? []).filter((m) => m.ts !== ts) }, threads }
    }),
  togglePin: (conversationId, ts) => set((s) => mapMessage(s, conversationId, ts, (m) => ({ ...m, pinnedBy: m.pinnedBy ? undefined : s.fx.me }))),
  markUnread: (conversationId, ts) =>
    set((s) => {
      const list = s.messages[conversationId] ?? []
      const count = Math.max(1, list.filter((m) => m.ts >= ts).length)
      return { fx: { ...s.fx, unreads: { ...s.fx.unreads, [conversationId]: { count, mentions: 0 } } } }
    }),
  setTyping: (conversationId, userIds) => set((s) => ({ typing: { ...s.typing, [conversationId]: userIds } })),
  receiveMessage: (conversationId, msg, threadTs) => {
    const seen = isViewing(get(), conversationId)
    set((s) => {
      const viewing = isViewing(s, conversationId)
      const conv = s.fx.conversations[conversationId]
      const direct = !!conv && (conv.type === 'im' || conv.type === 'mpim' || conv.type === 'app')
      const mention = msg.text.includes(`<@${s.fx.me}>`)
      let fx = s.fx
      if (!viewing && !threadTs) {
        const u = fx.unreads[conversationId] ?? { count: 0, mentions: 0 }
        fx = { ...fx, unreads: { ...fx.unreads, [conversationId]: { count: u.count + 1, mentions: u.mentions + (mention || direct ? 1 : 0) } } }
      }
      if (mention) fx = { ...fx, activityBadge: fx.activityBadge + 1 }
      const typing = { ...s.typing, [conversationId]: (s.typing[conversationId] ?? []).filter((id) => id !== msg.userId) }
      if (threadTs) {
        const key = `${conversationId}/${threadTs}`
        const messages = {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
            m.ts === threadTs ? { ...m, replyCount: (m.replyCount ?? s.threads[key]?.length ?? 0) + 1, replyUsers: [...new Set([...(m.replyUsers ?? []), msg.userId])], latestReply: msg.ts } : m,
          ),
        }
        return { threads: { ...s.threads, [key]: [...(s.threads[key] ?? []), msg] }, messages, fx, typing }
      }
      return { messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), msg] }, fx, typing }
    })
    for (const listener of incoming) listener({ conversationId, msg, threadTs, seen })
  },
  reactAs: (conversationId, ts, name, userId) =>
    set((s) =>
      mapMessage(s, conversationId, ts, (m) => {
        const reactions = [...(m.reactions ?? [])]
        const i = reactions.findIndex((r) => r.name === name)
        if (i === -1) reactions.push({ name, users: [userId] })
        else if (!reactions[i].users.includes(userId)) reactions[i] = { ...reactions[i], users: [...reactions[i].users, userId] }
        return { ...m, reactions }
      }),
    ),
  toggleStar: (conversationId) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      if (!conv) return {}
      const starred = !conv.starred
      const conversations = { ...s.fx.conversations, [conversationId]: { ...conv, starred } }
      const home = homeSectionKind(conv)
      const sections = s.fx.sections.map((sec) => {
        const ids = sec.conversationIds.filter((id) => id !== conversationId)
        if (sec.kind === (starred ? 'stars' : home)) return { ...sec, conversationIds: sectionOrder(sec.kind, ids, conversationId, conversations) }
        return ids.length === sec.conversationIds.length ? sec : { ...sec, conversationIds: ids }
      })
      return { fx: { ...s.fx, conversations, sections } }
    }),
  setNotify: (conversationId, level) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      if (!conv) return {}
      const next = level === 'muted' ? { ...conv, muted: true } : { ...conv, muted: false, notify: level }
      return { fx: { ...s.fx, conversations: { ...s.fx.conversations, [conversationId]: next } } }
    }),
  openDm: (userIds) => {
    const s = get()
    const others = userIds.filter((u) => u !== s.fx.me)
    const want = others.length ? others : [s.fx.me]
    const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
    const existing = Object.values(s.fx.conversations).find((c) =>
      want.length === 1 ? (c.type === 'im' || c.type === 'app') && c.userId === want[0] : c.type === 'mpim' && same(c.userIds ?? [], want),
    )
    if (existing) return existing.id
    const id = `D0${Date.now().toString(36).toUpperCase()}`
    const names = want.map((u) => s.fx.users[u]?.realName ?? u)
    const conv: Conversation =
      want.length === 1 ? { id, type: s.fx.users[want[0]]?.isApp ? 'app' : 'im', name: names[0], userId: want[0] } : { id, type: 'mpim', name: names.join(', '), userIds: want }
    const kind = homeSectionKind(conv)
    const sections = s.fx.sections.map((sec) => (sec.kind === kind ? { ...sec, conversationIds: [id, ...sec.conversationIds] } : sec))
    set({ fx: { ...s.fx, conversations: { ...s.fx.conversations, [id]: conv }, sections }, messages: { ...s.messages, [id]: [] } })
    return id
  },
  navigate: (tab, stack) =>
    set((s) => ({ tab, stacks: { ...s.stacks, [tab]: stack.map((route) => ({ key: nextKey(), route })) }, sheets: [], foreground: true })),
  loadFixture: (fx, start) =>
    set(() => {
      const stacks = emptyStacks()
      const tab = start?.tab ?? 'home'
      stacks[tab] = (start?.stack ?? []).map((route) => ({ key: nextKey(), route }))
      return { fx, messages: fx.messages, threads: fx.threads ?? {}, saved: [], newMarker: null, typing: {}, tab, stacks, sheets: [], toast: null }
    }),

  editing: null,
  setEditing: (target) => set({ editing: target }),

  openMessage: (conversationId, ts, opts) => {
    get().openConversation(conversationId, { tab: opts?.tab })
    set((s) => {
      const list = s.stacks[s.tab]
      const top = list.at(-1)
      if (!top || top.route.screen !== 'conversation') return {}
      const stack = [...list.slice(0, -1), { ...top, route: { ...top.route, jumpTs: opts?.threadTs ? opts.threadTs : ts } }]
      if (opts?.threadTs) stack.push({ key: nextKey(), route: { screen: 'thread', conversationId, ts: opts.threadTs, jumpTs: ts } })
      return { stacks: { ...s.stacks, [s.tab]: stack } }
    })
  },

  homePrefs: { sortMode: 'sections', prioritization: 'unreadsOnTop', filterMode: 'all' },
  setHomePrefs: (prefs) => set((s) => ({ homePrefs: { ...s.homePrefs, ...prefs } })),
  homeTiles: [],
  setHomeTiles: (homeTiles) => set({ homeTiles }),
  following: {},
  setFollowing: (conversationId, ts, on) => set((s) => ({ following: { ...s.following, [`${conversationId}/${ts}`]: on } })),
  leaveConversation: (conversationId) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      if (!conv) return {}
      const sections = s.fx.sections.map((sec) => (sec.conversationIds.includes(conversationId) ? { ...sec, conversationIds: sec.conversationIds.filter((x) => x !== conversationId) } : sec))
      const memberIds = conv.memberIds?.filter((u) => u !== s.fx.me)
      const left: Conversation = { ...conv, starred: false, memberIds, memberCount: memberIds ? memberIds.length : conv.memberCount && Math.max(0, conv.memberCount - 1) }
      const unreads = { ...s.fx.unreads }
      delete unreads[conversationId]
      // Its screens close, and everything pushed above them.
      const stacks = { ...s.stacks }
      for (const t of TABS) {
        const i = stacks[t].findIndex((e) => e.route.id === conversationId || e.route.conversationId === conversationId)
        if (i !== -1) stacks[t] = stacks[t].slice(0, i)
      }
      return { fx: { ...s.fx, sections, unreads, conversations: { ...s.fx.conversations, [conversationId]: left } }, stacks }
    }),
  moveToSection: (conversationId, sectionId) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      if (!conv) return {}
      // a conversation lives in one section: moving it unstars it too (ConversationActionHandler.swift:170-236)
      const target = sectionId ?? s.fx.sections.find((sec) => sec.kind === homeSectionKind(conv))?.id
      const conversations = conv.starred ? { ...s.fx.conversations, [conversationId]: { ...conv, starred: false } } : s.fx.conversations
      const sections = s.fx.sections.map((sec) => {
        const ids = sec.conversationIds.filter((id) => id !== conversationId)
        if (sec.id === target) return { ...sec, conversationIds: sectionOrder(sec.kind, ids, conversationId, conversations) }
        return ids.length === sec.conversationIds.length ? sec : { ...sec, conversationIds: ids }
      })
      return { fx: { ...s.fx, conversations, sections } }
    }),
  addMembers: (conversationId, userIds) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      const current = conv?.memberIds ?? [s.fx.me]
      const added = userIds.filter((u) => !current.includes(u) && s.fx.users[u])
      if (!conv || !added.length) return {}
      const next: Conversation = { ...conv, memberIds: [...current, ...added], memberCount: conv.memberCount === undefined ? undefined : conv.memberCount + added.length }
      const joins: Message[] = added.map((u) => ({ ts: nowTs(), userId: u, text: `<@${u}> has joined the channel`, subtype: 'channel_join' }))
      return {
        fx: { ...s.fx, conversations: { ...s.fx.conversations, [conversationId]: next } },
        messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), ...joins] },
      }
    }),
  editConversation: (conversationId, patch) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      if (!conv) return {}
      return { fx: { ...s.fx, conversations: { ...s.fx.conversations, [conversationId]: { ...conv, ...patch } } } }
    }),
  forwardMessage: (from, to, text) =>
    set((s) => {
      const list = from.threadTs && from.threadTs !== from.ts ? s.threads[`${from.conversationId}/${from.threadTs}`] : s.messages[from.conversationId]
      const src = list?.find((m) => m.ts === from.ts) ?? s.messages[from.conversationId]?.find((m) => m.ts === from.ts)
      const origin = s.fx.conversations[from.conversationId]
      if (!src || !origin || !s.fx.conversations[to]) return {}
      const author = s.fx.users[src.userId]
      // the unfurl: the author, the text, "Posted in #channel" (or "Direct Message") and the date (ShareMessagePresenter.swift:350-380)
      const attachment = {
        id: Date.now(),
        authorName: author ? author.name || author.realName : 'User',
        authorIcon: author?.avatar,
        text: src.text,
        footer: origin.type === 'channel' ? `Posted in #${origin.name}` : 'Direct Message',
        ts: src.ts,
      }
      const msg: Message = { ts: nowTs(), userId: s.fx.me, text, attachments: [attachment] }
      return { messages: { ...s.messages, [to]: [...(s.messages[to] ?? []), msg] } }
    }),
  markActivityRead: (id, read = true) =>
    set((s) => {
      const list = s.fx.activity ?? []
      const item = list.find((a) => a.id === id)
      if (!item || !!item.unread === !read) return {}
      const activity = list.map((a) => (a.id === id ? { ...a, unread: !read } : a))
      return { fx: { ...s.fx, activity, activityBadge: activity.filter((a) => a.unread).length } }
    }),
  setLaterStatus: (conversationId, ts, status) =>
    set((s) => {
      const key = `${conversationId}/${ts}`
      const later = s.fx.later ?? []
      const seeded = later.some((l) => l.conversationId === conversationId && l.ts === ts)
      if (status === null) {
        return { fx: { ...s.fx, later: later.filter((l) => !(l.conversationId === conversationId && l.ts === ts)) }, saved: s.saved.filter((k) => k !== key) }
      }
      const next = seeded ? later.map((l) => (l.conversationId === conversationId && l.ts === ts ? { ...l, status } : l)) : [{ conversationId, ts, status }, ...later]
      return { fx: { ...s.fx, later: next }, saved: s.saved.filter((k) => k !== key) }
    }),
  deleteDrafts: (ids) => set((s) => ({ fx: { ...s.fx, drafts: (s.fx.drafts ?? []).filter((d) => !ids.includes(d.id)) } })),
  unscheduleDraft: (id) =>
    set((s) => ({
      fx: {
        ...s.fx,
        drafts: (s.fx.drafts ?? []).map((d) => {
          if (d.id !== id) return d
          const { scheduledFor: _when, ...rest } = d
          void _when
          return { ...rest, updated: (Date.now() / 1000).toFixed(6) }
        }),
      },
    })),
  setLaterDue: (conversationId, ts, due) =>
    set((s) => {
      const key = `${conversationId}/${ts}`
      const later = s.fx.later ?? []
      const at = later.findIndex((l) => l.conversationId === conversationId && l.ts === ts)
      const next = [...later]
      if (at === -1) next.unshift({ conversationId, ts, status: 'in_progress', ...(due ? { due } : {}) })
      else {
        const { due: _old, ...rest } = later[at]
        void _old
        // re-saved this session: it's back In Progress
        const status = s.saved.includes(key) ? 'in_progress' : rest.status
        next[at] = due ? { ...rest, status, due } : { ...rest, status }
      }
      return { fx: { ...s.fx, later: next }, saved: s.saved.filter((k) => k !== key) }
    }),

  createCanvas: (opts = {}) => {
    const s = get()
    const id = `F0${Date.now().toString(36).toUpperCase()}${(++createdSeq).toString(36).toUpperCase()}`
    const ts = nowTs()
    const conv = opts.conversationId ? s.fx.conversations[opts.conversationId] : undefined
    const blocks: CanvasBlock[] = opts.blocks?.length ? opts.blocks : [{ id: `${id}B1`, type: 'p', html: '' }]
    const doc: CanvasDoc = { id, title: opts.title ?? '', creatorId: s.fx.me, ...(conv ? { channelId: conv.id } : {}), created: ts, updated: ts, lastEditorId: s.fx.me, blocks }
    // listed in More › Files as yours, just viewed; "Untitled" until it has a title (CanvasTitleProvider.swift:70-71)
    const file: WorkspaceFile = { id, title: opts.title || 'Untitled', kind: 'canvas', creatorId: s.fx.me, lastViewed: ts, readMinutes: 1 }
    set({ fx: { ...s.fx, canvases: { ...(s.fx.canvases ?? {}), [id]: doc }, files: [file, ...(s.fx.files ?? [])] } })
    return id
  },
  updateCanvas: (id, patch) =>
    set((s) => {
      const doc = s.fx.canvases?.[id]
      if (!doc) return {}
      const files = patch.title !== undefined && s.fx.files ? s.fx.files.map((f) => (f.id === id ? { ...f, title: patch.title || 'Untitled' } : f)) : s.fx.files
      return { fx: { ...s.fx, canvases: { ...s.fx.canvases, [id]: { ...doc, ...patch } }, files } }
    }),
  deleteCanvas: (id) =>
    set((s) => {
      if (!s.fx.canvases?.[id]) return {}
      const canvases = { ...s.fx.canvases }
      delete canvases[id]
      return { fx: { ...s.fx, canvases, files: s.fx.files?.filter((f) => f.id !== id) } }
    }),
  setListCell: (listId, rowId, columnId, value) =>
    set((s) => {
      const list = s.fx.lists?.[listId]
      if (!list) return {}
      const rows = list.rows.map((r) => {
        if (r.id !== rowId) return r
        const cells = { ...r.cells }
        if (value === null || value === '') delete cells[columnId]
        else cells[columnId] = value
        return { ...r, cells }
      })
      return { fx: { ...s.fx, lists: { ...s.fx.lists, [listId]: { ...list, rows } } } }
    }),
  addListRow: (listId, cells = {}) => {
    const s = get()
    const list = s.fx.lists?.[listId]
    if (!list) return ''
    const id = `Rec${Date.now().toString(36).toUpperCase()}${(++createdSeq).toString(36).toUpperCase()}`
    set({ fx: { ...s.fx, lists: { ...s.fx.lists, [listId]: { ...list, rows: [...list.rows, { id, cells }] } } } })
    return id
  },
  deleteListRow: (listId, rowId) =>
    set((s) => {
      const list = s.fx.lists?.[listId]
      if (!list) return {}
      return { fx: { ...s.fx, lists: { ...s.fx.lists, [listId]: { ...list, rows: list.rows.filter((r) => r.id !== rowId) } } } }
    }),

  createChannel: ({ name, isPrivate, description }) => {
    const s = get()
    const id = `C0${Date.now().toString(36).toUpperCase()}${(++channelSeq).toString(36).toUpperCase()}`
    const d = new Date()
    const created = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const conv: Conversation = { id, type: isPrivate ? 'private' : 'channel', name, ...(description ? { description } : {}), creatorId: s.fx.me, created, memberIds: [s.fx.me], memberCount: 1 }
    const conversations = { ...s.fx.conversations, [id]: conv }
    const join: Message = { ts: nowTs(), userId: s.fx.me, text: `<@${s.fx.me}> has joined the channel`, subtype: 'channel_join' }
    set({ fx: { ...s.fx, conversations, sections: withChannelListed(s.fx.sections, id, conversations) }, messages: { ...s.messages, [id]: [join] } })
    return id
  },
  joinChannel: (conversationId) =>
    set((s) => {
      const conv = s.fx.conversations[conversationId]
      // no memberIds means it's just you (searchIndex.ts isMember): already in it
      if (!conv || (conv.type !== 'channel' && conv.type !== 'private') || !conv.memberIds || conv.memberIds.includes(s.fx.me)) return {}
      const next: Conversation = { ...conv, memberIds: [...conv.memberIds, s.fx.me], memberCount: conv.memberCount === undefined ? undefined : conv.memberCount + 1 }
      const conversations = { ...s.fx.conversations, [conversationId]: next }
      const listed = s.fx.sections.some((sec) => sec.conversationIds.includes(conversationId))
      const join: Message = { ts: nowTs(), userId: s.fx.me, text: `<@${s.fx.me}> has joined the channel`, subtype: 'channel_join' }
      return {
        fx: { ...s.fx, conversations, sections: listed ? s.fx.sections : withChannelListed(s.fx.sections, conversationId, conversations) },
        messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), join] },
      }
    }),
}))

/** makes ids of channels created in the same millisecond unique */
let channelSeq = 0

/** Lists a channel in Home's Channels section (A–Z), adding the section if the workspace has none. */
function withChannelListed(sections: SidebarSection[], id: string, conversations: Record<string, Conversation>): SidebarSection[] {
  if (!sections.some((sec) => sec.kind === 'channels')) return [...sections, { id: 'L0CHANNELS', kind: 'channels', name: 'Channels', icon: 'channel-section', conversationIds: [id], description: '' }]
  let done = false
  return sections.map((sec) => {
    if (done || sec.kind !== 'channels') return sec
    done = true
    return { ...sec, conversationIds: sectionOrder(sec.kind, sec.conversationIds, id, conversations) }
  })
}

/** makes ids of canvases and list items created in the same millisecond unique */
let createdSeq = 0

/** Everything receiveMessage delivers, after the state has updated; `seen` = it arrived where you're looking.
 *  The notification banners listen (src/app/notify). */
export const incoming = new Set<(e: { conversationId: string; msg: Message; threadTs?: string; seen: boolean }) => void>()

/** The conversation (or its thread) on top of the current tab's stack. */
function isViewing(s: AppState, conversationId: string) {
  const top = s.stacks[s.tab].at(-1)?.route
  return !!top && s.foreground && (top.id === conversationId || top.conversationId === conversationId)
}

/** The Home section a conversation lives in when it isn't starred. */
function homeSectionKind(conv: Conversation): SidebarSection['kind'] {
  return conv.type === 'channel' || conv.type === 'private' ? 'channels' : conv.type === 'app' ? 'recent_apps' : 'direct_messages'
}

/** Adds `id` to a section: channel lists are A–Z, conversation lists put the newest first. */
function sectionOrder(kind: SidebarSection['kind'], ids: string[], id: string, conversations: Record<string, Conversation>): string[] {
  if (kind === 'direct_messages' || kind === 'recent_apps') return [id, ...ids.filter((x) => x !== id)]
  const name = (x: string) => conversations[x]?.name ?? ''
  return [...ids.filter((x) => x !== id), id].sort((a, b) => name(a).localeCompare(name(b)))
}

/** Applies `fn` to a message wherever it lives (channel history or a thread). */
function mapMessage(s: AppState, conversationId: string, ts: string, fn: (m: Message) => Message): Partial<AppState> {
  const update = (m: Message) => (m.ts === ts ? fn(m) : m)
  const threads: Record<string, Message[]> = {}
  for (const [k, list] of Object.entries(s.threads)) threads[k] = k.startsWith(`${conversationId}/`) ? list.map(update) : list
  return { messages: { ...s.messages, [conversationId]: (s.messages[conversationId] ?? []).map(update) }, threads }
}

let seq = 0
/** A unique, increasing Slack-style ts for messages sent during the demo. */
export function nowTs() {
  seq = (seq + 1) % 1000
  return `${Math.floor(Date.now() / 1000)}.${String(100000 + seq * 997).slice(0, 6)}`
}

export const useMe = () => useApp((s) => s.fx.users[s.fx.me])
