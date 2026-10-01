import type { AppDefinition, KitBlock } from '../apps/kit'
import type { FileAttachment, Fixture, MessageAttachment } from '../data/types'
import { ASSETS } from './assets'

// ================================================================================================
// Prototypes: a folder prototypes/<slug>/ whose index.ts does `export default definePrototype({ … })`.
// The definition is plain data on top of the Northstar demo: rename the workspace, add people, channels and
// messages (Block Kit included), add App Kit apps, pick the screen it opens on and add director scenes.
// Open one at /?proto=<slug>; /?kit=prototypes lists them all. Guide: docs/prototyping.md.
//
// This file is pure (no store, no DOM): definePrototype() only checks the definition's shape and lists the
// mistakes it finds. src/kit/apply.ts turns a prototype into workspace data; src/kit/boot.ts loads it.
// ================================================================================================

/** A person in the prototype's workspace. */
export interface PersonInput {
  /** full name, as it shows on messages: 'Zoe Maxwell' */
  name: string
  title?: string
  /** image URL; defaults to an illustrated avatar. `persona('zoe-maxwell')` fills name, title and avatar. */
  avatar?: string
  presence?: 'active' | 'away'
  /** custom status: { emoji: 'palm_tree', text: 'Out until Monday' } */
  status?: { emoji?: string; text?: string }
  pronouns?: string
  /** IANA time zone, e.g. 'America/New_York' */
  timezone?: string
  email?: string
  /** the "Workspace Owner" / "Workspace Admin" label on their profile */
  role?: 'owner' | 'admin'
}

/** A channel. Its key in `channels` is its name: lowercase, hyphens, no spaces ('project-acme'). */
export interface ChannelInput {
  topic?: string
  description?: string
  /** a private channel (lock icon) */
  private?: boolean
  /** person keys; you're always a member, and so is everyone who posts in it. Default: every person in the prototype */
  members?: string[]
  /** listed under Starred */
  starred?: boolean
  /** YYYY-MM-DD it was created (the channel intro); default two weeks ago */
  created?: string
  /** person key of who created it; default you */
  createdBy?: string
}

/**
 * A message. Where it goes is its key in `messages`: '#channel', '@person' (a DM with them), '@app' (the DM with
 * one of your apps) or a Northstar channel name ('launch-atlas').
 */
export interface MessageInput {
  /** who sends it: a person key, 'me', one of your app ids, or a Northstar teammate ('priya') */
  from: string
  /** Slack mrkdwn. `<@zoe>` mentions a person, `<#project-acme>` links a channel, `:tada:` is an emoji */
  text?: string
  /** Block Kit blocks (use `bk`, e.g. bk.section('Hi'), bk.actions(…)); `text` is then the notification text */
  blocks?: KitBlock[]
  /** when it was sent. Messages without a time are spaced a few minutes apart, ending just now */
  minutesAgo?: number
  /** with `at`: a previous day (1 = yesterday) */
  daysAgo?: number
  /** 'HH:MM' (24h) today, or on `daysAgo`. A time later than now means yesterday */
  at?: string
  /** emoji name → who reacted: { tada: ['zoe', 'me'] } */
  reactions?: Record<string, string[]>
  /** thread replies */
  replies?: MessageInput[]
  /** uploaded files (see `imageFile()`) */
  files?: FileAttachment[]
  /** link previews and classic app attachments */
  attachments?: MessageAttachment[]
  edited?: boolean
  /** pinned to the channel (by you) */
  pinned?: boolean
  /** a name for this message, so `start` and scenes can open its thread: { open: '#x', thread: 'kickoff' } */
  id?: string
}

export type StartView = 'home' | 'dms' | 'activity' | 'slackbot' | 'files' | 'later' | 'threads' | 'huddles' | 'drafts' | 'directories'

/**
 * Where the prototype opens (and where a scene goes): '#channel', '@person' or '@app', or an object for more.
 * Default: the first channel of the prototype, else Northstar's #launch-atlas.
 */
export type StartInput =
  | string
  | {
      /** '#channel', '@person' or '@app' */
      open?: string
      /** for '@app': which tab of the app DM */
      tab?: 'home' | 'messages' | 'about'
      /** open this message's thread (a message `id`) */
      thread?: string
      /** open this person's profile (a person key) */
      profile?: string
      /** a rail tab or Home page instead of a conversation */
      view?: StartView
    }

/** A message that arrives live during a scene: the typing indicator shows, then it lands with badges. */
export interface ScenePost {
  /** '#channel', '@person' or '@app' */
  to: string
  from: string
  text?: string
  blocks?: KitBlock[]
  /** how long they "type" first, in ms (default 1800; 0 for apps posting instantly) */
  typingMs?: number
  /** reply in this message's thread (a message `id`) */
  replyTo?: string
}

/** Helpers a scene's `run` gets. */
export interface SceneKit {
  go: (to: StartInput) => void
  post: (msg: ScenePost) => Promise<void>
  /** someone reacts to a message (a message `id`) */
  react: (messageId: string, emoji: string, from: string) => void
  toast: (text: string) => void
  wait: (ms: number) => Promise<void>
  /** a person's, app's or channel's id, for anything below */
  id: (ref: string) => string | undefined
}

/** A director scene (Ctrl+Shift+D): a one-click step of the talk track. */
export interface SceneInput {
  label: string
  /** navigate first */
  go?: StartInput
  /** then messages arrive, one after another */
  post?: ScenePost | ScenePost[]
  /** anything else */
  run?: (kit: SceneKit) => void | Promise<void>
}

export interface WorkspaceInput {
  /** 'Acme Inc.' */
  name?: string
  /** team icon image, e.g. logo('acme'); without one Slack shows `initials` */
  icon?: string
  /** 1–2 letters on the team icon; default the name's first letter */
  initials?: string
  /** used in links (acme.slack.com); default from the name */
  domain?: string
  plan?: 'free' | 'pro' | 'business'
}

export interface SidebarInput {
  /** show only your channels, DMs and apps: Northstar's are hidden from the sidebar (they still exist) */
  hideDemo?: boolean
  /** extra sections, like Slack's custom sections: { name: 'Projects', items: ['#project-acme', '@zoe'] } */
  sections?: { name: string; items: string[] }[]
  /**
   * Slack's Salesforce section, with the Salesforce app on top: `true`, or what goes under the app
   * (['#acme-renewal', '@zoe']). The app is the kit's salesforceApp unless you add your own with the id 'salesforce'.
   */
  salesforce?: boolean | string[]
}

/** Helpers for `extend`. */
export interface ExtendKit {
  /** the user id of a person key, 'me', an app id or a Northstar teammate */
  user: (ref: string) => string | undefined
  /** the conversation id of '#channel', '@person' or '@app' */
  conversation: (ref: string) => string | undefined
  /** a Slack message ts, `minutesAgo` minutes ago */
  ts: (minutesAgo: number) => string
}

export interface PrototypeDefinition {
  // ---- the gallery card
  title: string
  /** one or two sentences: what it shows */
  description: string
  author: string
  /** YYYY-MM-DD of the last change */
  updated: string
  tags?: string[]
  /** image URL for the gallery card; by default a thumbnail.png in the folder, else a live preview */
  thumbnail?: string

  // ---- the workspace
  workspace?: WorkspaceInput
  /** change who's signed in (the Northstar demo's Alex Morgan): name, title, avatar… */
  me?: Partial<PersonInput>
  /** people by key: the key is how messages refer to them ({ from: 'zoe' }) */
  people?: Record<string, PersonInput>
  /** channels by name */
  channels?: Record<string, ChannelInput>
  /** messages by where they go: '#channel', '@person' or '@app' */
  messages?: Record<string, MessageInput[]>
  /** unread badges by conversation: { '#project-acme': 2, '@zoe': { count: 1, mentions: 1 } } */
  unreads?: Record<string, number | { count: number; mentions?: number }>
  sidebar?: SidebarInput
  /** App Kit apps (defineApp, docs/app-kit.md): each gets a bot user, an app DM, a Home tab… */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apps?: AppDefinition<any>[]

  // ---- presenting
  start?: StartInput
  scenes?: SceneInput[]

  /** last step, for anything the fields above don't cover: change the workspace data directly */
  extend?: (fx: Fixture, kit: ExtendKit) => void
}

/** What definePrototype() returns: the definition plus the mistakes found in it. */
export interface Prototype extends PrototypeDefinition {
  readonly kind: 'prototype'
  /** human-readable problems ("people.zoe.name is missing"); empty when the definition is fine */
  readonly problems: string[]
}

const FIELDS: (keyof PrototypeDefinition)[] = [
  'title',
  'description',
  'author',
  'updated',
  'tags',
  'thumbnail',
  'workspace',
  'me',
  'people',
  'channels',
  'messages',
  'unreads',
  'sidebar',
  'apps',
  'start',
  'scenes',
  'extend',
]
const PERSON_FIELDS: (keyof PersonInput)[] = ['name', 'title', 'avatar', 'presence', 'status', 'pronouns', 'timezone', 'email', 'role']
const CHANNEL_FIELDS: (keyof ChannelInput)[] = ['topic', 'description', 'private', 'members', 'starred', 'created', 'createdBy']
const MESSAGE_FIELDS: (keyof MessageInput)[] = ['from', 'text', 'blocks', 'minutesAgo', 'daysAgo', 'at', 'reactions', 'replies', 'files', 'attachments', 'edited', 'pinned', 'id']
const START_FIELDS = ['open', 'tab', 'thread', 'profile', 'view']
const VIEWS: StartView[] = ['home', 'dms', 'activity', 'slackbot', 'files', 'later', 'threads', 'huddles', 'drafts', 'directories']

/** Person keys and app ids: lowercase, starting with a letter ('zoe', 'lisa-z', 'expenses'). */
export const KEY_RE = /^[a-z][a-z0-9-]*$/
/** Slack channel names: lowercase letters, numbers, hyphens and underscores, up to 80 characters. */
export const CHANNEL_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/

// ------------------------------------------------------------------------------------------------

/** Declares a prototype. Export it as the default of prototypes/<slug>/index.ts. */
export function definePrototype(def: PrototypeDefinition): Prototype {
  let problems: string[]
  try {
    problems = checkDefinition(def)
  } catch (e) {
    problems = [`the definition couldn't be checked: ${e instanceof Error ? e.message : String(e)}`]
  }
  return { ...def, kind: 'prototype', problems }
}

export const isPrototype = (x: unknown): x is Prototype => !!x && typeof x === 'object' && (x as Prototype).kind === 'prototype'

/** A person's user id: stable, so app code can mention them (`<@${personId('zoe')}>`). */
export const personId = (key: string) => `U0P${idPart(key)}`
/** A prototype channel's id. */
export const channelId = (name: string) => `C0P${idPart(name)}`
/** The DM with a person. */
export const dmId = (key: string) => `D0P${idPart(key)}`
const idPart = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'X'

let fileSeq = 0
/**
 * An uploaded image for a message's `files`: `imageFile(filePreview('slides-preview'), { name: 'Kickoff.png' })`.
 * Width and height are needed for your own images; the kit's own images know their size.
 */
export function imageFile(src: string, opts: { name?: string; width?: number; height?: number; size?: number } = {}): FileAttachment {
  const known = ASSETS.find((a) => a.src === src)
  const name = opts.name ?? src.split('/').pop() ?? 'image.png'
  const ext = (name.split('.').pop() ?? 'png').toLowerCase()
  return {
    id: `F0PIMG${++fileSeq}`,
    name,
    title: name,
    mimetype: ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`,
    filetype: ext,
    prettyType: ext.toUpperCase(),
    url: src,
    width: opts.width ?? known?.width ?? 1600,
    height: opts.height ?? known?.height ?? 900,
    size: opts.size ?? 245_000,
  }
}

// ------------------------------------------------------------------------------------------------
// Shape checks (references to people and channels are checked when the prototype is applied)

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const str = (x: unknown): x is string => typeof x === 'string' && x.trim() !== ''

/** Edit distance, for "did you mean" hints. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

/** " Did you mean 'people'?" when something close exists. */
export function didYouMean(word: string, options: Iterable<string>): string {
  let best = ''
  let bestD = Infinity
  for (const o of options) {
    const d = distance(word.toLowerCase(), o.toLowerCase())
    if (d < bestD) [best, bestD] = [o, d]
  }
  return best && bestD <= Math.max(2, Math.floor(word.length / 3)) ? ` Did you mean '${best}'?` : ''
}

const unknownKeys = (obj: Record<string, unknown>, allowed: readonly string[], where: string, out: string[]) => {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) out.push(`${where}: unknown field '${k}'.${didYouMean(k, allowed)}`)
}

const validDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function checkDefinition(def: PrototypeDefinition): string[] {
  const out: string[] = []
  if (!isObj(def)) return ['definePrototype() needs an object: definePrototype({ title: …, description: …, author: …, updated: … })']
  unknownKeys(def as unknown as Record<string, unknown>, FIELDS, 'definePrototype', out)

  for (const f of ['title', 'description', 'author'] as const) if (!str(def[f])) out.push(`${f} is missing (the gallery card shows it)`)
  if (!str(def.updated)) out.push("updated is missing: the date of your last change, like '2026-09-25'")
  else if (!validDate(def.updated)) out.push(`updated '${def.updated}' isn't a date like '2026-09-25'`)
  if (def.tags !== undefined && (!Array.isArray(def.tags) || def.tags.some((t) => !str(t)))) out.push("tags should be a list of words, like ['app-home', 'block-kit']")
  if (def.thumbnail !== undefined && !(str(def.thumbnail) && /^(\/|https?:|data:|blob:)/.test(def.thumbnail)))
    out.push("thumbnail should be an image URL starting with '/' (like thumbnail('jade')), or leave it out")

  const ws = def.workspace
  if (ws !== undefined) {
    if (!isObj(ws)) out.push("workspace should be an object: { name: 'Acme Inc.' }")
    else {
      unknownKeys(ws, ['name', 'icon', 'initials', 'domain', 'plan'], 'workspace', out)
      if (ws.name !== undefined && !str(ws.name)) out.push('workspace.name is empty')
      if (ws.icon !== undefined && !str(ws.icon)) out.push('workspace.icon should be an image URL, like logo(\'acme\')')
      if (ws.initials !== undefined && !(str(ws.initials) && ws.initials.length <= 2)) out.push('workspace.initials should be one or two letters')
      if (ws.domain !== undefined && !/^[a-z0-9][a-z0-9-]*$/.test(String(ws.domain))) out.push(`workspace.domain '${ws.domain}' should be lowercase letters, numbers and hyphens`)
      if (ws.plan !== undefined && !['free', 'pro', 'business'].includes(String(ws.plan))) out.push("workspace.plan should be 'free', 'pro' or 'business'")
    }
  }

  if (def.me !== undefined) {
    if (!isObj(def.me)) out.push("me should be an object: { name: 'Zoe Maxwell' }")
    else checkPerson(def.me, 'me', out, false)
  }

  const people = def.people ?? {}
  if (!isObj(people)) out.push("people should be an object keyed by a short name: { zoe: { name: 'Zoe Maxwell' } }")
  else
    for (const [key, p] of Object.entries(people)) {
      if (!KEY_RE.test(key)) out.push(`people: '${key}' should be a short lowercase key, like 'zoe' or 'lisa-z'`)
      if (key === 'me') out.push("people: 'me' is taken (it's you); use `me: { … }` to change who's signed in")
      if (!isObj(p)) out.push(`people.${key} should be an object: { name: '…' }`)
      else checkPerson(p, `people.${key}`, out, true)
    }
  const idOwners = new Map<string, string>()
  for (const key of Object.keys(isObj(people) ? people : {})) {
    const id = personId(key)
    if (idOwners.has(id)) out.push(`people: '${key}' and '${idOwners.get(id)}' are too similar to tell apart; rename one`)
    idOwners.set(id, key)
  }

  const channels = def.channels ?? {}
  if (!isObj(channels)) out.push("channels should be an object keyed by channel name: { 'project-acme': { topic: '…' } }")
  else
    for (const [rawName, c] of Object.entries(channels)) {
      const name = rawName.replace(/^#/, '')
      if (!CHANNEL_RE.test(name)) out.push(`channels: '${rawName}' isn't a Slack channel name (lowercase letters, numbers and hyphens, no spaces)`)
      if (!isObj(c)) {
        out.push(`channels.${name} should be an object (it can be empty: {})`)
        continue
      }
      unknownKeys(c, CHANNEL_FIELDS, `channels.${name}`, out)
      if (c.members !== undefined && (!Array.isArray(c.members) || c.members.some((m) => !str(m)))) out.push(`channels.${name}.members should be a list of person keys, like ['zoe', 'harry']`)
      if (c.created !== undefined && !validDate(String(c.created))) out.push(`channels.${name}.created '${c.created}' isn't a date like '2026-09-01'`)
    }

  const messages = def.messages ?? {}
  const ids = new Set<string>()
  if (!isObj(messages)) out.push("messages should be an object keyed by where they go: { '#project-acme': [ … ] }")
  else
    for (const [target, list] of Object.entries(messages)) {
      if (!Array.isArray(list)) {
        out.push(`messages['${target}'] should be a list: [{ from: 'zoe', text: 'Hi!' }]`)
        continue
      }
      list.forEach((m, i) => checkMessage(m, `messages['${target}'][${i}]`, out, ids))
    }

  if (def.unreads !== undefined) {
    if (!isObj(def.unreads)) out.push("unreads should be an object: { '#project-acme': 2 }")
    else
      for (const [target, u] of Object.entries(def.unreads)) {
        const ok = (typeof u === 'number' && u >= 0) || (isObj(u) && typeof u.count === 'number' && u.count >= 0 && (u.mentions === undefined || typeof u.mentions === 'number'))
        if (!ok) out.push(`unreads['${target}'] should be a number, or { count: 2, mentions: 1 }`)
      }
  }

  if (def.sidebar !== undefined) {
    if (!isObj(def.sidebar)) out.push('sidebar should be an object: { hideDemo: true }')
    else {
      unknownKeys(def.sidebar, ['hideDemo', 'sections', 'salesforce'], 'sidebar', out)
      const sections = def.sidebar.sections ?? []
      if (!Array.isArray(sections)) out.push("sidebar.sections should be a list: [{ name: 'Projects', items: ['#project-acme'] }]")
      else
        sections.forEach((s, i) => {
          if (!isObj(s) || !str(s.name) || !Array.isArray(s.items)) out.push(`sidebar.sections[${i}] should look like { name: 'Projects', items: ['#project-acme'] }`)
        })
      const sf = def.sidebar.salesforce
      if (sf !== undefined && typeof sf !== 'boolean' && !(Array.isArray(sf) && sf.every(str)))
        out.push("sidebar.salesforce should be true, or a list of what goes under the Salesforce app: ['#acme-renewal']")
    }
  }

  if (def.apps !== undefined) {
    if (!Array.isArray(def.apps)) out.push('apps should be a list of defineApp({ … }) apps')
    else {
      const seen = new Set<string>()
      def.apps.forEach((a, i) => {
        if (!isObj(a) || !str(a.id) || !str(a.name) || !str(a.icon)) {
          out.push(`apps[${i}] needs an id, a name and an icon (see docs/app-kit.md)`)
          return
        }
        if (!KEY_RE.test(a.id)) out.push(`apps[${i}]: id '${a.id}' should be a short lowercase key, like 'expenses'`)
        if (seen.has(a.id)) out.push(`apps: two apps have the id '${a.id}'`)
        if (isObj(people) && a.id in people) out.push(`apps: '${a.id}' is both a person and an app; rename one`)
        seen.add(a.id)
      })
    }
  }

  if (def.start !== undefined) checkStart(def.start, 'start', out)

  if (def.scenes !== undefined) {
    if (!Array.isArray(def.scenes)) out.push("scenes should be a list: [{ label: '…', go: '#project-acme' }]")
    else
      def.scenes.forEach((s, i) => {
        const where = `scenes[${i}]`
        if (!isObj(s)) return void out.push(`${where} should be an object: { label: '…', go: '#project-acme' }`)
        unknownKeys(s, ['label', 'go', 'post', 'run'], where, out)
        if (!str(s.label)) out.push(`${where}.label is missing (the director panel shows it)`)
        if (s.go === undefined && s.post === undefined && typeof s.run !== 'function') out.push(`${where} doesn't do anything: give it go, post or run`)
        if (s.go !== undefined) checkStart(s.go, `${where}.go`, out)
        const posts = s.post === undefined ? [] : Array.isArray(s.post) ? s.post : [s.post]
        posts.forEach((p, j) => {
          const pw = Array.isArray(s.post) ? `${where}.post[${j}]` : `${where}.post`
          if (!isObj(p)) return void out.push(`${pw} should look like { to: '#project-acme', from: 'zoe', text: '…' }`)
          unknownKeys(p, ['to', 'from', 'text', 'blocks', 'typingMs', 'replyTo'], pw, out)
          if (!str(p.to)) out.push(`${pw}.to is missing: '#channel', '@person' or '@app'`)
          if (!str(p.from)) out.push(`${pw}.from is missing`)
          if (!str(p.text) && !Array.isArray(p.blocks)) out.push(`${pw} needs text or blocks`)
        })
      })
  }

  if (def.extend !== undefined && typeof def.extend !== 'function') out.push('extend should be a function: extend: (fx, kit) => { … }')
  return out
}

function checkPerson(p: Record<string, unknown>, where: string, out: string[], needsName: boolean) {
  unknownKeys(p, PERSON_FIELDS, where, out)
  if (needsName && !str(p.name)) out.push(`${where}.name is missing`)
  if (!needsName && p.name !== undefined && !str(p.name)) out.push(`${where}.name is empty`)
  if (p.avatar !== undefined && !str(p.avatar)) out.push(`${where}.avatar should be an image URL, like persona('zoe-maxwell').avatar`)
  if (p.presence !== undefined && p.presence !== 'active' && p.presence !== 'away') out.push(`${where}.presence should be 'active' or 'away'`)
  if (p.role !== undefined && p.role !== 'owner' && p.role !== 'admin') out.push(`${where}.role should be 'owner' or 'admin'`)
  if (p.status !== undefined && !isObj(p.status)) out.push(`${where}.status should look like { emoji: 'palm_tree', text: 'Out until Monday' }`)
}

function checkMessage(m: unknown, where: string, out: string[], ids: Set<string>) {
  if (!isObj(m)) return void out.push(`${where} should be an object: { from: 'zoe', text: 'Hi!' }`)
  unknownKeys(m, MESSAGE_FIELDS, where, out)
  if (!str(m.from)) out.push(`${where}.from is missing: who sends it ('zoe', 'me', an app id)`)
  const hasBody = str(m.text) || (Array.isArray(m.blocks) && m.blocks.length > 0) || (Array.isArray(m.files) && m.files.length > 0) || (Array.isArray(m.attachments) && m.attachments.length > 0)
  if (!hasBody) out.push(`${where} is empty: give it text, blocks or files`)
  if (m.blocks !== undefined && (!Array.isArray(m.blocks) || m.blocks.some((b) => !isObj(b) || typeof b.type !== 'string'))) out.push(`${where}.blocks should be a list of Block Kit blocks, like [bk.section('Hi')]`)
  if (m.minutesAgo !== undefined && !(typeof m.minutesAgo === 'number' && m.minutesAgo >= 0)) out.push(`${where}.minutesAgo should be a number of minutes, like 30`)
  if (m.daysAgo !== undefined && !(Number.isInteger(m.daysAgo) && (m.daysAgo as number) >= 0)) out.push(`${where}.daysAgo should be a whole number of days, like 1 (yesterday)`)
  if (m.at !== undefined && !(typeof m.at === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(m.at))) out.push(`${where}.at should be a 24-hour time like '09:30' or '16:05'`)
  if (m.daysAgo !== undefined && m.at === undefined) out.push(`${where}: daysAgo needs a time too, like at: '09:30'`)
  if (m.minutesAgo !== undefined && (m.at !== undefined || m.daysAgo !== undefined)) out.push(`${where}: use minutesAgo or daysAgo/at, not both`)
  if (m.reactions !== undefined && (!isObj(m.reactions) || Object.values(m.reactions).some((u) => !Array.isArray(u) || u.length === 0)))
    out.push(`${where}.reactions should look like { tada: ['zoe', 'me'] }`)
  if (m.files !== undefined && !Array.isArray(m.files)) out.push(`${where}.files should be a list, like [imageFile(filePreview('slides-preview'))]`)
  if (m.attachments !== undefined && !Array.isArray(m.attachments)) out.push(`${where}.attachments should be a list`)
  if (m.id !== undefined) {
    if (!str(m.id)) out.push(`${where}.id should be a short name`)
    else if (ids.has(m.id as string)) out.push(`${where}: two messages have the id '${m.id}'`)
    else ids.add(m.id as string)
  }
  if (m.replies !== undefined) {
    if (!Array.isArray(m.replies)) out.push(`${where}.replies should be a list of messages`)
    else m.replies.forEach((r, i) => checkMessage(r, `${where}.replies[${i}]`, out, ids))
  }
}

function checkStart(s: unknown, where: string, out: string[]) {
  if (typeof s === 'string') {
    if (!/^[#@]?.+/.test(s)) out.push(`${where} should be '#channel', '@person' or '@app'`)
    return
  }
  if (!isObj(s)) return void out.push(`${where} should be '#channel', '@person', '@app' or { open: …, tab: … }`)
  unknownKeys(s, START_FIELDS, where, out)
  if (s.open === undefined && s.view === undefined && s.profile === undefined) out.push(`${where} needs open ('#channel', '@person', '@app'), view or profile`)
  if (s.open !== undefined && !str(s.open)) out.push(`${where}.open should be '#channel', '@person' or '@app'`)
  if (s.tab !== undefined && !['home', 'messages', 'about'].includes(s.tab as string)) out.push(`${where}.tab should be 'home', 'messages' or 'about'`)
  if (s.view !== undefined && !VIEWS.includes(s.view as StartView)) out.push(`${where}.view '${String(s.view)}' should be one of ${VIEWS.join(', ')}.${didYouMean(String(s.view), VIEWS)}`)
}
