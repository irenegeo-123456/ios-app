import type { Conversation, Fixture, Message, SidebarSection, User } from '../data/types'
import type { KitBlock } from '../apps/kit'
import { DEMO_IDS } from '../data/demo'
import { makeTs } from '../lib/time'
import { defaultAvatar } from './assets'
import { channelId, didYouMean, dmId, parseUntil, personId, type MessageInput, type Prototype, type ScenePost, type StartInput, type StartTab, type StartView } from './prototype'

// Turns a prototype into workspace data: patches a fixture (a copy of the Northstar demo) with the prototype's
// workspace, people, channels, messages, unreads and sidebar, and resolves where it starts. Pure: no store, no
// DOM (src/kit/boot.ts hands the result to the store; the tests call it directly). Anything it can't resolve
// (an unknown person, a channel that doesn't exist) becomes a problem instead of an error.

/** The ids of an App Kit app once it's registered (src/apps/index.ts `registerApp`). */
export interface AppIds {
  botUserId: string
  dmId: string
}

export interface ResolvedStart {
  /** the tab bar tab it happens in */
  tab?: StartTab
  conversationId?: string
  /** app DMs: the app's tab to show */
  appTab?: 'home' | 'messages' | 'about'
  /** a thread to push after the conversation */
  thread?: { conversationId: string; ts: string }
  /** a profile to open (user id) */
  profile?: string
  view?: StartView
  /** a registered screen to push, and its props */
  screen?: string
  props?: Record<string, unknown>
  /** a sheet to present on top */
  sheet?: string
  sheetProps?: Record<string, unknown>
}

export interface AppliedPrototype {
  problems: string[]
  start: ResolvedStart
  /** a user id from a person key, 'me', an app id or a Northstar teammate */
  user: (ref: string) => string | undefined
  /** a conversation id from '#channel', '@person' or '@app' (no new DMs are created after apply) */
  conversation: (ref: string) => string | undefined
  /** where a message with an `id` ended up */
  message: (id: string) => { conversationId: string; ts: string; threadTs?: string } | undefined
  /** resolves a scene's `go` */
  resolveStart: (s: StartInput) => ResolvedStart
  /** a live post's text and blocks with `<@key>` and `<#channel>` resolved */
  text: (s: string) => string
  blocks: (b: KitBlock[]) => KitBlock[]
}

const NORTHSTAR_PEOPLE = DEMO_IDS.U as Record<string, string>
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const byTs = (a: Message, b: Message) => parseFloat(a.ts) - parseFloat(b.ts)
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Plain text from Block Kit, for notifications and previews ("Expense report · $412.50"). */
export function blocksText(blocks: KitBlock[]): string {
  for (const b of blocks) {
    const t = (b as { text?: { text?: string } }).text?.text
    if (t) return t.replace(/[*_~`]/g, '').split('\n')[0].slice(0, 150)
  }
  return 'Message'
}

let seq = 0

/** Applies `proto` to `fx` (mutating it). `apps` are the registered App Kit apps by id, including the prototype's. */
export function applyPrototype(fx: Fixture, proto: Prototype, apps: Record<string, AppIds> = {}, now = new Date()): AppliedPrototype {
  const problems: string[] = []
  const people = proto.people ?? {}
  const T = now.getTime()
  const ts = (d: Date) => makeTs(d, 5000 + ++seq)
  fx.threads ??= {}
  /** conversations the prototype made or uses (they stay in the sidebar with `hideDemo`) */
  const used = new Set<string>()

  // ---- workspace and you
  if (proto.workspace) {
    const w = proto.workspace
    const name = w.name ?? fx.workspace.name
    fx.workspace = {
      ...fx.workspace,
      name,
      domain: w.domain ?? (w.name ? w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fx.workspace.domain : fx.workspace.domain),
      initials: w.initials ?? (w.name ? name.trim()[0].toUpperCase() : fx.workspace.initials),
      ...(w.icon ? { iconUrl: w.icon } : {}),
      ...(w.plan ? { plan: w.plan } : {}),
    }
  }
  const domain = fx.workspace.domain

  const toUser = (base: Partial<User>, p: Partial<(typeof people)[string]>, key: string): User => {
    const name = p.name ?? base.realName ?? key
    return {
      ...base,
      id: base.id ?? personId(key),
      name,
      realName: name,
      title: p.title ?? base.title,
      avatar: p.avatar ?? base.avatar ?? defaultAvatar(key),
      avatar2x: p.avatar ?? base.avatar2x ?? base.avatar ?? defaultAvatar(key),
      presence: p.presence ?? base.presence ?? 'active',
      ...(p.status ? { statusEmoji: p.status.emoji?.replace(/:/g, '') || undefined, statusText: p.status.text || undefined } : {}),
      ...(p.pronouns !== undefined ? { pronouns: p.pronouns } : {}),
      timezone: p.timezone ?? base.timezone ?? 'America/Los_Angeles',
      email: p.email ?? (p.name ? `${name.split(/\s+/)[0].normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase()}@${domain}.com` : base.email),
      ...(p.role ? { role: p.role } : {}),
      // paused notifications from now: `until` resolved against the prototype's clock (types.ts User.dnd)
      ...(p.dnd ? { dnd: typeof p.dnd === 'object' && p.dnd.until !== undefined ? { until: parseUntil(p.dnd.until, now) ?? undefined } : {} } : {}),
    }
  }
  if (proto.me) fx.users[fx.me] = toUser(fx.users[fx.me], proto.me, 'me')
  for (const [key, p] of Object.entries(people)) fx.users[personId(key)] = toUser({ id: personId(key) }, p, key)

  // ---- resolvers
  const knownUsers = () => ['me', ...Object.keys(people), ...Object.keys(apps), ...Object.keys(NORTHSTAR_PEOPLE)]
  const user = (ref: string): string | undefined => {
    const r = ref.replace(/^@/, '')
    if (r === 'me') return fx.me
    if (people[r]) return personId(r)
    if (apps[r]) return apps[r].botUserId
    if (NORTHSTAR_PEOPLE[r]) return NORTHSTAR_PEOPLE[r]
    return fx.users[r] ? r : undefined
  }
  const channelByName = (name: string) => Object.values(fx.conversations).find((c) => (c.type === 'channel' || c.type === 'private') && c.name === name)?.id

  const addToSection = (kind: SidebarSection['kind'], id: string, first: boolean) => {
    const sec = fx.sections.find((s) => s.kind === kind)
    if (!sec || sec.conversationIds.includes(id)) return
    if (first) sec.conversationIds = [id, ...sec.conversationIds]
    else {
      const name = (x: string) => fx.conversations[x]?.name ?? ''
      sec.conversationIds = [...sec.conversationIds, id].sort((a, b) => name(a).localeCompare(name(b)))
    }
  }

  let frozen = false // after apply, lookups don't create DMs
  const dmWith = (ref: string): string | undefined => {
    const r = ref.replace(/^@/, '')
    if (apps[r]) return apps[r].dmId
    const uid = user(r)
    if (!uid) return undefined
    const existing = Object.values(fx.conversations).find((c) => (c.type === 'im' || c.type === 'app') && c.userId === uid)
    if (existing || frozen) return existing?.id
    const u = fx.users[uid]
    const id = people[r] ? dmId(r) : dmId(uid)
    fx.conversations[id] = { id, type: u?.isApp ? 'app' : 'im', name: u?.realName ?? r, userId: uid }
    fx.messages[id] ??= []
    addToSection(u?.isApp ? 'recent_apps' : 'direct_messages', id, true)
    return id
  }
  const conversation = (ref: string): string | undefined => {
    if (ref.startsWith('#')) return channelByName(ref.slice(1))
    if (ref.startsWith('@')) return dmWith(ref)
    if (fx.conversations[ref]) return ref
    return channelByName(ref) ?? dmWith(ref)
  }
  const notFound = (where: string, ref: string) => {
    const names = [
      ...Object.values(fx.conversations)
        .filter((c) => c.type === 'channel' || c.type === 'private')
        .map((c) => `#${c.name}`),
      ...knownUsers().map((k) => `@${k}`),
    ]
    const hint = ref.startsWith('#') || ref.startsWith('@') ? didYouMean(ref, names) : didYouMean(`#${ref}`, names) || didYouMean(`@${ref}`, names)
    problems.push(`${where}: there's no channel, person or app called '${ref}'. Use '#channel', '@person' or '@app'.${hint}`)
  }
  const unknownUser = (where: string, ref: string) => problems.push(`${where}: '${ref}' isn't a person, app or Northstar teammate.${didYouMean(ref.replace(/^@/, ''), knownUsers())}`)

  // `<@zoe>` → `<@U0PZOE>`, `<#project-acme>` → `<#C0PPROJECTACME|project-acme>`
  const text = (s: string, where = 'text') =>
    s
      .replace(/<@([a-z][a-z0-9-]*)>/g, (m, key: string) => {
        const id = user(key)
        if (!id) unknownUser(`${where} mentions <@${key}>`, key)
        return id ? `<@${id}>` : m
      })
      .replace(/<#([a-z0-9][a-z0-9_-]*)>/g, (m, name: string) => {
        const id = channelByName(name)
        if (!id) problems.push(`${where} links <#${name}>, but there's no #${name}`)
        return id ? `<#${id}|${name}>` : m
      })
  const deep = (x: unknown, where: string): unknown => {
    if (typeof x === 'string') return text(x, where)
    if (Array.isArray(x)) return x.map((v) => deep(v, where))
    if (!isObj(x)) return x
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(x)) {
      if ((k === 'initial_user' || k === 'user_id') && typeof v === 'string') o[k] = user(v) ?? v
      else if (k === 'initial_users' && Array.isArray(v)) o[k] = v.map((u) => (typeof u === 'string' ? (user(u) ?? u) : u))
      else if ((k === 'initial_channel' || k === 'channel_id' || k === 'initial_conversation') && typeof v === 'string') o[k] = channelByName(v.replace(/^#/, '')) ?? v
      else o[k] = deep(v, where)
    }
    return o
  }
  const blocks = (b: KitBlock[], where = 'blocks') => deep(b, where) as KitBlock[]

  // ---- channels
  for (const [rawName, c] of Object.entries(proto.channels ?? {})) {
    const name = rawName.replace(/^#/, '')
    const existing = channelByName(name)
    let id = existing ?? channelId(name)
    for (let n = 2; !existing && fx.conversations[id]; n++) id = `${channelId(name)}${n}`
    const members = new Set([fx.me])
    for (const m of c.members ?? Object.keys(people)) {
      const uid = user(m)
      if (uid) members.add(uid)
      else unknownUser(`channels.${name}.members`, m)
    }
    const creator = c.createdBy ? user(c.createdBy) : fx.me
    if (!creator) unknownUser(`channels.${name}.createdBy`, c.createdBy!)
    const base: Conversation = existing
      ? fx.conversations[existing]
      : { id, type: 'channel', name, creatorId: fx.me, created: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)) }
    const memberIds = existing && !c.members ? [...new Set([...(base.memberIds ?? []), ...members])] : [...members]
    fx.conversations[id] = {
      ...base,
      type: c.private ? 'private' : c.private === false ? 'channel' : base.type,
      ...(c.topic !== undefined ? { topic: c.topic } : {}),
      ...(c.description !== undefined ? { description: c.description } : {}),
      ...(c.created ? { created: c.created } : {}),
      ...(creator && c.createdBy ? { creatorId: creator } : {}),
      memberIds,
      memberCount: memberIds.length,
      ...(c.starred !== undefined ? { starred: c.starred } : {}),
    }
    fx.messages[id] ??= []
    used.add(id)
    if (c.starred !== undefined || !existing) {
      for (const s of fx.sections) s.conversationIds = s.conversationIds.filter((x) => x !== id)
      addToSection(c.starred ? 'stars' : 'channels', id, false)
    }
  }

  // ---- messages
  const messageIds = new Map<string, { conversationId: string; ts: string; threadTs?: string }>()
  const atTime = (daysAgo: number, at: string) => {
    const [h, m] = at.split(':').map(Number)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, (seq * 7) % 60)
    // A time later than now (today) means yesterday.
    return daysAgo === 0 && d.getTime() > T ? new Date(d.getTime() - 86_400_000) : d
  }
  const timeOf = (m: MessageInput): Date | undefined =>
    m.minutesAgo !== undefined ? new Date(T - m.minutesAgo * 60_000) : m.at !== undefined ? atTime(m.daysAgo ?? 0, m.at) : undefined
  /** Messages without a time: 3 minutes apart, the last one a minute ago. */
  const schedule = (list: MessageInput[]): Date[] => {
    let k = list.filter((m) => !timeOf(m)).length
    return list.map((m) => timeOf(m) ?? new Date(T - (1 + --k * 3) * 60_000))
  }
  /** A message, or null when its sender doesn't exist (it's left out, and listed as a problem). */
  const build = (m: MessageInput, when: Date, where: string, conversationId: string, threadTs?: string): Message | null => {
    const uid = user(m.from)
    if (!uid) {
      unknownUser(`${where}.from`, m.from)
      return null
    }
    const msg: Message = {
      ts: ts(when),
      userId: uid,
      text: m.text !== undefined ? text(m.text, where) : m.blocks ? blocksText(m.blocks) : '',
    }
    if (m.blocks) msg.blocks = blocks(m.blocks, `${where}.blocks`)
    if (m.files) msg.files = m.files
    if (m.attachments) msg.attachments = m.attachments
    if (m.edited) msg.edited = true
    if (m.pinned) msg.pinnedBy = fx.me
    if (m.reactions)
      msg.reactions = Object.entries(m.reactions).map(([name, who]) => ({
        name: name.replace(/:/g, ''),
        users: who.flatMap((w) => {
          const id = user(w)
          if (!id) unknownUser(`${where}.reactions.${name}`, w)
          return id ? [id] : []
        }),
      }))
    if (m.id) messageIds.set(m.id, { conversationId, ts: msg.ts, threadTs })
    return msg
  }
  const joinChannel = (conversationId: string, userIds: string[]) => {
    const conv = fx.conversations[conversationId]
    if (!conv || (conv.type !== 'channel' && conv.type !== 'private') || !conv.memberIds) return
    const joiners = [...new Set(userIds)].filter((u) => !fx.users[u]?.isApp && !conv.memberIds!.includes(u))
    if (joiners.length) Object.assign(conv, { memberIds: [...conv.memberIds, ...joiners], memberCount: conv.memberIds.length + joiners.length })
  }

  for (const [target, list] of Object.entries(proto.messages ?? {})) {
    const where = `messages['${target}']`
    const conv = conversation(target)
    if (!conv) {
      notFound(where, target)
      continue
    }
    used.add(conv)
    const times = schedule(list)
    const built = list.map((m, i) => build(m, times[i], `${where}[${i}]`, conv))
    const sent = built.filter((m): m is Message => !!m)
    fx.messages[conv] = [...(fx.messages[conv] ?? []), ...sent].sort(byTs)
    joinChannel(conv, sent.map((m) => m.userId))
    list.forEach((m, i) => {
      const parent = built[i]
      if (!m.replies?.length || !parent) return
      const start = parseFloat(parent.ts) * 1000
      const step = Math.max(1000, Math.min(120_000, (T - start) / (m.replies.length + 1)))
      const replies = m.replies.flatMap((r, j) => build(r, timeOf(r) ?? new Date(start + (j + 1) * step), `${where}[${i}].replies[${j}]`, conv, parent.ts) ?? [])
      const key = `${conv}/${parent.ts}`
      fx.threads![key] = [...(fx.threads![key] ?? []), ...replies].sort(byTs)
      joinChannel(conv, replies.map((r) => r.userId))
    })
  }

  // ---- unreads
  for (const [target, u] of Object.entries(proto.unreads ?? {})) {
    const conv = conversation(target)
    if (!conv) {
      notFound(`unreads['${target}']`, target)
      continue
    }
    used.add(conv)
    const type = fx.conversations[conv]?.type
    const direct = type === 'im' || type === 'mpim' || type === 'app'
    const count = typeof u === 'number' ? u : u.count
    const mentions = typeof u === 'number' ? (direct ? u : 0) : (u.mentions ?? (direct ? u.count : 0))
    if (count > 0) fx.unreads[conv] = { count, mentions }
    else delete fx.unreads[conv]
  }

  // ---- scenes: check what they refer to now, and make the DMs they post in (so they're in the sidebar)
  const posts = (proto.scenes ?? []).flatMap((s, i) => (s.post === undefined ? [] : (Array.isArray(s.post) ? s.post : [s.post]).map((p) => [i, p] as [number, ScenePost])))
  for (const [i, p] of posts) {
    const conv = conversation(p.to)
    if (!conv) notFound(`scenes[${i}].post.to`, p.to)
    else used.add(conv)
    if (!user(p.from)) unknownUser(`scenes[${i}].post.from`, p.from)
    if (p.text) text(p.text, `scenes[${i}].post.text`)
  }
  for (const app of proto.apps ?? []) if (apps[app.id]) used.add(apps[app.id].dmId)

  // ---- start (checked before the sidebar is trimmed, so it can use anything)
  const resolveStart = (s: StartInput, where = 'start'): ResolvedStart => {
    const o = typeof s === 'string' ? { open: s } : s
    const r: ResolvedStart = {}
    if (o.open) {
      r.conversationId = conversation(o.open)
      if (!r.conversationId) notFound(`${where}`, o.open)
    }
    const isApp = !!r.conversationId && fx.conversations[r.conversationId]?.type === 'app'
    // The web kit's `tab` is an app DM's tab; here it's the tab bar's, unless it only makes sense for an app.
    const appTab = o.appTab ?? (o.tab === 'messages' || o.tab === 'about' || (o.tab === 'home' && isApp) ? (o.tab as 'home' | 'messages' | 'about') : undefined)
    if (appTab) {
      if (!isApp) problems.push(`${where}.appTab only works when you open an app ('@your-app')`)
      else r.appTab = appTab
    } else if (o.tab) r.tab = o.tab as StartTab
    if (o.thread) {
      const m = messageIds.get(o.thread)
      if (!m) problems.push(`${where}.thread: no message has the id '${o.thread}'.${didYouMean(o.thread, messageIds.keys())}`)
      else {
        r.thread = { conversationId: m.conversationId, ts: m.threadTs ?? m.ts }
        r.conversationId ??= m.conversationId
      }
    }
    if (o.profile) {
      r.profile = user(o.profile)
      if (!r.profile) unknownUser(`${where}.profile`, o.profile)
    }
    if (o.view) r.view = o.view
    if (o.screen) {
      r.screen = o.screen
      r.props = o.props
    }
    if (o.sheet) {
      r.sheet = o.sheet
      r.sheetProps = o.sheetProps
    }
    return r
  }
  const firstChannel = Object.keys(proto.channels ?? {})[0]
  const firstTarget = Object.keys(proto.messages ?? {})[0]
  const firstApp = proto.apps?.[0]?.id
  const fallback = firstChannel ? `#${firstChannel.replace(/^#/, '')}` : firstTarget ?? (firstApp ? `@${firstApp}` : undefined)
  const start = proto.start !== undefined ? resolveStart(proto.start) : fallback ? resolveStart(fallback) : {}
  if (start.conversationId) {
    fx.initial = { tab: 'home', conversationId: start.conversationId }
    used.add(start.conversationId)
  }
  for (const [i, s] of (proto.scenes ?? []).entries()) {
    const id = s.go !== undefined ? resolveStart(s.go, `scenes[${i}].go`).conversationId : undefined
    if (id) used.add(id)
  }

  // ---- sidebar
  const sections = proto.sidebar?.sections ?? []
  const sf = proto.sidebar?.salesforce
  const sfItems = Array.isArray(sf) ? sf : []
  const sfApp = sf ? apps.salesforce?.dmId : undefined
  if (proto.sidebar?.hideDemo) {
    for (const item of [...sections.flatMap((s) => s.items), ...sfItems]) {
      const id = conversation(item)
      if (id) used.add(id)
    }
    if (sfApp) used.add(sfApp)
    for (const s of fx.sections) s.conversationIds = s.conversationIds.filter((id) => used.has(id))
    for (const id of Object.keys(fx.unreads)) if (!used.has(id)) delete fx.unreads[id]
    if (fx.activity) fx.activity = fx.activity.filter((a) => used.has(a.conversationId))
    fx.activityBadge = fx.activity?.filter((a) => a.unread).length ?? 0
  }
  // Slack's Salesforce section: the Salesforce app, then the rest in the order given
  // (channel-sidebar/utility/get-channel-list-section-rows.ts:367). It sits under Starred, above custom sections.
  if (sf) {
    if (!sfApp) problems.push("sidebar.salesforce: the Salesforce app isn't registered (src/kit/salesforce.ts prototypeApps)")
    const items = sfItems.flatMap((item) => {
      const id = conversation(item)
      if (!id) notFound('sidebar.salesforce', item)
      return id ? [id] : []
    })
    const ids = [...new Set([...(sfApp ? [sfApp] : []), ...items])]
    for (const sec of fx.sections) sec.conversationIds = sec.conversationIds.filter((x) => !ids.includes(x))
    // Its heading has the sf-cloud icon and no emoji (getSectionIconName; channel-section-heading.tsx:292) and no
    // screen reader description (section-heading-row-element-aria-description.tsx).
    const section: SidebarSection = { id: 'L0PSALESFR', kind: 'salesforce', name: 'Salesforce', icon: 'sf-cloud', conversationIds: ids, description: '' }
    fx.sections.splice(fx.sections.findIndex((s) => s.kind === 'stars') + 1, 0, section)
  }
  const custom: SidebarSection[] = sections.map((s, i) => {
    const ids = s.items.flatMap((item) => {
      const id = conversation(item)
      if (!id) notFound(`sidebar.sections[${i}] ('${s.name}')`, item)
      return id ? [id] : []
    })
    for (const sec of fx.sections) sec.conversationIds = sec.conversationIds.filter((x) => !ids.includes(x))
    return { id: `L0PSECTN${i}`, kind: 'custom', name: s.name, icon: 'channel-section', conversationIds: ids, description: `${s.name} section` }
  })
  if (custom.length) {
    const at = fx.sections.findIndex((s) => s.kind === (sf ? 'salesforce' : 'stars')) + 1
    fx.sections.splice(at, 0, ...custom)
  }

  // ---- the escape hatch
  if (proto.extend) {
    try {
      proto.extend(fx, { user, conversation, ts: (minutesAgo) => ts(new Date(T - minutesAgo * 60_000)) })
    } catch (e) {
      problems.push(`extend failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  frozen = true
  return {
    problems,
    start,
    user,
    conversation,
    message: (id) => messageIds.get(id),
    resolveStart: (s) => resolveStart(s, 'scene'),
    text: (s) => text(s),
    blocks: (b) => blocks(b),
  }
}
