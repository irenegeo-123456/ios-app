import type { CanvasDoc, Conversation, FileAttachment, Fixture, Message, SlackList, User, WorkspaceFile } from '../../../data/types'
import type { FileKind } from '../files/fileTypes'

// Search over the workspace in the store (the demo, or whatever a prototype loaded): query parsing (from: in: with:),
// the iOS 26 result types and filters (spec search-slackbot-huddles.md §1.4-1.5; FilterSets.Tabless in
// Modules/DataService/FindFilterStore/Interface/SearchFilterType.swift:192-279), ranking and autocomplete. Matching and
// relevance are the web clone's (slack-remix src/components/search/searchIndex.ts).

// ------------------------------------------------------------------------------------------------ types

/** SearchFilters.ResultTypeFilter, in FindViewController.swift:403-427 order (Top Results needs a flag; off). */
export type ResultType = 'messages' | 'dms' | 'files' | 'canvases' | 'channels' | 'people'
export const RESULT_TYPES: { type: ResultType; title: string; icon: string }[] = [
  // titles and menu icons: SearchFiltersPresenter.swift:491-519
  { type: 'messages', title: 'Messages', icon: 'message' },
  { type: 'dms', title: 'Direct Messages', icon: 'direct_messages' },
  { type: 'files', title: 'Files', icon: 'files' },
  { type: 'canvases', title: 'Canvases', icon: 'canvas' },
  { type: 'channels', title: 'Channels', icon: 'channel' },
  { type: 'people', title: 'People', icon: 'user' },
]
export const resultTypeTitle = (t: ResultType) => RESULT_TYPES.find((r) => r.type === t)!.title

/** APISearchModuleSort: relevant / timestampdesc / timestampasc */
export type SearchSort = 'relevant' | 'newest' | 'oldest'
/** SearchMessageResultDataTypes.swift:86-95: "Most relevant" (search_modules_sort_by_most_relevant), "Newest", "Oldest" */
export const SORT_TITLES: Record<SearchSort, string> = { relevant: 'Most relevant', newest: 'Newest', oldest: 'Oldest' }

/** SearchFilterDateRow (SearchFiltersPickerDataTypes.swift:100-107) */
export type DateRange = { kind: 'anytime' | 'last7' | 'last30' | 'last3m' | 'last12m' } | { kind: 'custom'; start: number; end?: number }
export const DATE_TITLES = { anytime: 'Any time', last7: 'Last 7 days', last30: 'Last 30 days', last3m: 'Last 3 months', last12m: 'Last 12 months', custom: 'Custom' } as const

/** SearchFilterFileTypeRow (SearchFiltersPickerDataTypes.swift:114-126) with their titles (SearchFiltersPickerPresenter.swift:410-433) */
export type FileTypeFilter = 'documents' | 'emails' | 'images' | 'pdfs' | 'canvases' | 'lists' | 'presentations' | 'snippets' | 'spreadsheets' | 'audio' | 'videos'
export const FILE_TYPE_TITLES: Record<FileTypeFilter, string> = {
  documents: 'Documents',
  emails: 'Emails',
  images: 'Images',
  pdfs: 'PDFs',
  canvases: 'Canvases & Posts',
  lists: 'Lists',
  presentations: 'Presentations',
  snippets: 'Snippets',
  spreadsheets: 'Spreadsheets',
  audio: 'Audio',
  videos: 'Videos',
}

/** SearchFilterChannelTypeRow / ChannelMembershipTypeRow, titles from SearchFiltersPickerPresenter.swift:435-463 */
export type ChannelTypeFilter = 'all' | 'public' | 'private' | 'archived' | 'external'
export const CHANNEL_TYPE_TITLES: Record<ChannelTypeFilter, string> = { all: 'Any channel type', public: 'Public', private: 'Private', archived: 'Archived', external: 'External' }
export type ChannelMembership = 'all' | 'joined' | 'other'
export const MEMBERSHIP_TITLES: Record<ChannelMembership, string> = { all: 'All channels', joined: "Channels you've joined", other: 'Other channels' }

export interface SearchFilters {
  /** From (users) */
  from: string[]
  /** With (DMs) */
  with: string[]
  /** In (channels) */
  in: string[]
  /** Created By (canvases) */
  createdBy: string[]
  date: DateRange
  fileTypes: FileTypeFilter[]
  onlyMyChannels: boolean
  excludeAutomations: boolean
  channelType: ChannelTypeFilter
  channelMembership: ChannelMembership
}

export const NO_FILTERS: SearchFilters = {
  from: [],
  with: [],
  in: [],
  createdBy: [],
  date: { kind: 'anytime' },
  fileTypes: [],
  onlyMyChannels: false,
  excludeAutomations: false,
  channelType: 'all',
  channelMembership: 'all',
}

/** SearchFilters.filtersAppliedCount (SearchFilters.swift:207-274): result type and sort don't count. */
export function appliedCount(f: SearchFilters): number {
  return (
    (f.from.length ? 1 : 0) +
    (f.with.length ? 1 : 0) +
    (f.in.length ? 1 : 0) +
    (f.createdBy.length ? 1 : 0) +
    (f.date.kind !== 'anytime' ? 1 : 0) +
    (f.fileTypes.length ? 1 : 0) +
    (f.onlyMyChannels ? 1 : 0) +
    (f.excludeAutomations ? 1 : 0) +
    (f.channelType !== 'all' ? 1 : 0) +
    (f.channelMembership !== 'all' ? 1 : 0)
  )
}

// ------------------------------------------------------------------------------------------------ matching

/** Characters that start a new "word" in a name ("clone-reference", "lee.hao", "Carmen Vega"). */
const WORD_BREAK = /[\s\-_.@#]/

/** Index where `q` matches the start of a word of `name` (Slack's switcher rule), or -1. */
export function prefixIndex(name: string, q: string): number {
  const n = name.toLowerCase()
  const needle = q.trim().toLowerCase()
  if (!needle) return -1
  let i = n.indexOf(needle)
  while (i !== -1) {
    if (i === 0 || WORD_BREAK.test(n[i - 1])) return i
    i = n.indexOf(needle, i + 1)
  }
  return -1
}

/** Lower-cased query words, without the punctuation around them ("copy?" → "copy"). */
export const tokensOf = (q: string) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}@#:]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)

/** Words a question carries that no message needs to contain ("what is the launch status?" → launch, status). */
const STOP_WORDS = new Set(
  'a an and are about any at be by can could did do does for from had has have how i if in is it its me my of on or our should so than that the their them then there these they this those to was we were what when where which who whom whose why will with would you your'.split(' '),
)

/** The words every hit must contain: the query's words, minus stop words when anything else is left. */
export function requiredTokens(q: string): string[] {
  const tokens = tokensOf(q)
  const meaningful = tokens.filter((t) => !STOP_WORDS.has(t))
  return meaningful.length ? meaningful : tokens
}

/** Message text with mentions, channel links and URLs resolved, the way search matches it. */
export function plainText(fx: Fixture, text: string): string {
  return text
    .replace(/<@([A-Z0-9]+)(?:\|[^>]*)?>/g, (_, id: string) => `@${fx.users[id]?.name ?? id}`)
    .replace(/<#([A-Z0-9]+)(?:\|([^>]*))?>/g, (_, id: string, name?: string) => `#${name ?? fx.conversations[id]?.name ?? id}`)
    .replace(/<!(here|channel|everyone)[^>]*>/g, '@$1')
    .replace(/<([^>|]+)\|([^>]+)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1')
}

const isChannel = (c?: Conversation) => !!c && (c.type === 'channel' || c.type === 'private')
const isDm = (c?: Conversation) => !!c && (c.type === 'im' || c.type === 'mpim')
const isMember = (fx: Fixture, c: Conversation) => !c.memberIds || c.memberIds.includes(fx.me)

/** The name a conversation is found by: channel name, the person in a DM, everyone in a group DM. */
export function conversationNames(fx: Fixture, conv: Conversation): string[] {
  if (conv.type === 'im' || conv.type === 'app') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    return u ? [u.name, u.realName] : [conv.name]
  }
  if (conv.type === 'mpim') return [conv.name, ...(conv.userIds ?? []).flatMap((id) => [fx.users[id]?.name ?? '', fx.users[id]?.realName ?? ''])]
  return [conv.name]
}

/** The display name of a conversation: "#general" is drawn with an icon, so channels return their bare name. */
export function conversationTitle(fx: Fixture, conv: Conversation): string {
  if (conv.type === 'im' || conv.type === 'app') return (conv.userId && fx.users[conv.userId]?.name) || conv.name
  if (conv.type === 'mpim') {
    const names = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => fx.users[id]?.name ?? id)
    return names.length ? names.join(', ') : conv.name
  }
  return conv.name
}

// ------------------------------------------------------------------------------------------------ the query

/** A query split into its words and its modifiers (from:@alex in:#design with:@priya). */
export interface ParsedQuery {
  text: string
  from: string[]
  in: string[]
  with: string[]
}

/** Resolves a person by @name / name / id. */
export function findUser(fx: Fixture, ref: string): User | undefined {
  const r = ref.replace(/^@/, '').toLowerCase()
  if (!r) return undefined
  return (
    fx.users[ref] ??
    Object.values(fx.users).find((u) => u.name.toLowerCase() === r || u.realName.toLowerCase() === r) ??
    Object.values(fx.users).find((u) => u.name.toLowerCase().replace(/\s+/g, '') === r.replace(/\s+/g, '') || u.realName.toLowerCase().split(' ')[0] === r)
  )
}

/** Resolves a conversation by #name / name / id (channels, then DMs by the person's name). */
export function findConversation(fx: Fixture, ref: string): Conversation | undefined {
  const r = ref.replace(/^#/, '').toLowerCase()
  if (!r) return undefined
  return fx.conversations[ref] ?? Object.values(fx.conversations).find((c) => isChannel(c) && c.name.toLowerCase() === r) ?? Object.values(fx.conversations).find((c) => conversationNames(fx, c).some((n) => n.toLowerCase() === r))
}

/** from:@name, in:#channel, with:@name are filters; everything else is the text to match. */
export function parseQuery(fx: Fixture, raw: string): ParsedQuery {
  const out: ParsedQuery = { text: '', from: [], in: [], with: [] }
  const rest: string[] = []
  for (const part of raw.trim().split(/\s+/)) {
    const m = /^(from|in|with):(.+)$/i.exec(part)
    if (!m) {
      rest.push(part)
      continue
    }
    const key = m[1].toLowerCase() as 'from' | 'in' | 'with'
    if (key === 'in') {
      const c = findConversation(fx, m[2])
      if (c) out.in.push(c.id)
      else rest.push(part)
    } else {
      const u = findUser(fx, m[2])
      if (u) out[key].push(u.id)
      else rest.push(part)
    }
  }
  out.text = rest.join(' ')
  return out
}

// ------------------------------------------------------------------------------------------------ files

/** A file as search and Files see it: a More › Files entry, a canvas, a list, or a message attachment. */
export interface SearchFile {
  id: string
  title: string
  kind: FileKind
  creatorId?: string
  /** when it was shared, created or last edited (canvases), in seconds */
  time?: number
  conversationId?: string
  /** the message it was shared in (attachments): the file viewer's { conversationId, ts } */
  messageTs?: string
  /** image / video thumbnail */
  thumbnail?: string
  attachment?: FileAttachment
}

const kindOfAttachment = (f: FileAttachment): FileKind => {
  const t = (f.filetype ?? f.name.split('.').pop() ?? '').toLowerCase()
  if (f.mimetype.startsWith('image/')) return 'image'
  if (f.mimetype.startsWith('video/')) return 'video'
  if (f.mimetype.startsWith('audio/')) return 'audio'
  if (t === 'pdf') return 'pdf'
  if (t === 'gdoc') return 'gdoc'
  if (t === 'gsheet') return 'gsheet'
  if (t === 'gpres') return 'gpres'
  if (t === 'doc' || t === 'docx') return 'doc'
  if (t === 'xls' || t === 'xlsx' || t === 'csv') return 'spreadsheet'
  if (t === 'ppt' || t === 'pptx') return 'ppt'
  if (t === 'email' || t === 'eml') return 'email'
  if (t === 'text' || t === 'txt' || t === 'markdown') return 'text'
  return 'unknown'
}

/** Every file in the workspace, newest first, deduped by id (a message attachment beats its Files entry). */
export function allFiles(fx: Fixture, messages: Record<string, Message[]>, threads: Record<string, Message[]>): SearchFile[] {
  const byId = new Map<string, SearchFile>()
  const put = (f: SearchFile) => {
    const prev = byId.get(f.id)
    byId.set(f.id, prev ? { ...prev, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) } : f)
  }
  for (const w of fx.files ?? []) put(fromWorkspaceFile(w))
  for (const c of Object.values(fx.canvases ?? {})) put(fromCanvas(c))
  for (const l of Object.values(fx.lists ?? {})) put(fromList(l))
  const scan = (conversationId: string, list: Message[]) => {
    for (const m of list)
      for (const a of m.files ?? [])
        put({
          id: a.id,
          title: a.title || a.name,
          kind: kindOfAttachment(a),
          creatorId: m.userId,
          time: parseFloat(m.ts),
          conversationId,
          messageTs: m.ts,
          thumbnail: a.mimetype.startsWith('image/') ? a.url : undefined,
          attachment: a,
        })
  }
  for (const [id, list] of Object.entries(messages)) scan(id, list)
  for (const [key, list] of Object.entries(threads)) scan(key.split('/')[0], list)
  return [...byId.values()].sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
}

const fromWorkspaceFile = (w: WorkspaceFile): SearchFile => ({ id: w.id, title: w.title, kind: w.kind, creatorId: w.creatorId, time: parseFloat(w.lastViewed) })
const fromCanvas = (c: CanvasDoc): SearchFile => ({ id: c.id, title: c.title, kind: 'canvas', creatorId: c.creatorId, time: parseFloat(c.updated), conversationId: c.channelId })
const fromList = (l: SlackList): SearchFile => ({ id: l.id, title: l.title, kind: 'list', creatorId: l.creatorId, conversationId: l.channelId })

/** The More filters › File type rows a file falls under. */
function fileTypeOf(kind: FileKind): FileTypeFilter | undefined {
  switch (kind) {
    case 'doc':
    case 'gdoc':
    case 'text':
      return 'documents'
    case 'email':
      return 'emails'
    case 'image':
      return 'images'
    case 'pdf':
      return 'pdfs'
    case 'canvas':
      return 'canvases'
    case 'list':
      return 'lists'
    case 'ppt':
    case 'gpres':
      return 'presentations'
    case 'spreadsheet':
    case 'gsheet':
      return 'spreadsheets'
    case 'audio':
      return 'audio'
    case 'video':
      return 'videos'
    default:
      return undefined
  }
}

// ------------------------------------------------------------------------------------------------ searching

export interface SearchInput {
  fx: Fixture
  messages: Record<string, Message[]>
  threads: Record<string, Message[]>
}

export type SearchItem =
  | { kind: 'message'; key: string; conversationId: string; ts: string; msg: Message; threadTs?: string; score: number }
  | { kind: 'dm'; key: string; conversationId: string; latestTs?: string; score: number }
  | { kind: 'file'; key: string; file: SearchFile; ts: string; score: number }
  | { kind: 'channel'; key: string; conversation: Conversation; score: number }
  | { kind: 'person'; key: string; user: User; score: number }

const DAY = 86_400
function inRange(time: number | undefined, range: DateRange, now = Date.now() / 1000): boolean {
  if (range.kind === 'anytime') return true
  if (time === undefined) return false
  if (range.kind === 'custom') return time >= range.start && time <= (range.end ?? range.start) + DAY
  const days = { last7: 7, last30: 30, last3m: 91, last12m: 365 }[range.kind]
  return time >= now - days * DAY
}

function occurrences(text: string, tokens: string[]) {
  return tokens.reduce((n, t) => n + text.split(t).length - 1, 0)
}

/** Runs a query for one result type. `filters` are the chips; `parsed` adds the query's own modifiers. */
export function search(input: SearchInput, raw: string, type: ResultType, filters: SearchFilters, sort: SearchSort): SearchItem[] {
  const { fx } = input
  const parsed = parseQuery(fx, raw)
  const from = [...filters.from, ...parsed.from]
  const inIds = [...filters.in, ...parsed.in]
  const withIds = [...filters.with, ...parsed.with]
  const tokens = requiredTokens(parsed.text)
  const hasModifiers = from.length + inIds.length + withIds.length > 0
  if (!tokens.length && !hasModifiers) return []
  let items: SearchItem[] = []

  if (type === 'messages') {
    const consider = (conversationId: string, msg: Message, threadTs?: string) => {
      if (msg.subtype === 'channel_join' || msg.subtype === 'huddle_thread') return
      const conv = fx.conversations[conversationId]
      if (!conv) return
      const user = fx.users[msg.userId]
      if (filters.excludeAutomations && (user?.isApp || user?.isBot)) return
      if (from.length && !from.includes(msg.userId)) return
      if (inIds.length && !inIds.includes(conversationId)) return
      if (filters.onlyMyChannels && isChannel(conv) && !isMember(fx, conv)) return
      if (!inRange(parseFloat(msg.ts), filters.date)) return
      const text = plainText(fx, msg.text).toLowerCase()
      if (!tokens.every((t) => text.includes(t))) return
      items.push({ kind: 'message', key: `${conversationId}/${msg.ts}`, conversationId, ts: msg.ts, msg, threadTs, score: occurrences(text, tokens) })
    }
    for (const [conversationId, list] of Object.entries(input.messages)) for (const msg of list) consider(conversationId, msg)
    for (const [key, list] of Object.entries(input.threads)) {
      const [conversationId, parentTs] = key.split('/')
      for (const msg of list) if (msg.ts !== parentTs) consider(conversationId, msg, parentTs)
    }
  } else if (type === 'dms') {
    for (const conv of Object.values(fx.conversations)) {
      if (!isDm(conv)) continue
      const members = conv.type === 'im' ? [conv.userId ?? ''] : (conv.userIds ?? [])
      if (withIds.length && !withIds.every((id) => members.includes(id))) continue
      const nameHit = tokens.length > 0 && tokens.every((t) => conversationNames(fx, conv).some((n) => n.toLowerCase().includes(t)))
      const list = [...(input.messages[conv.id] ?? [])].filter((m) => inRange(parseFloat(m.ts), filters.date))
      const hits = tokens.length ? list.filter((m) => tokens.every((t) => plainText(fx, m.text).toLowerCase().includes(t))) : list
      if (!nameHit && !hits.length && tokens.length) continue
      const latest = (hits.length ? hits : list).at(-1)?.ts
      items.push({ kind: 'dm', key: conv.id, conversationId: conv.id, latestTs: latest, score: (nameHit ? 10 : 0) + hits.length })
    }
  } else if (type === 'files' || type === 'canvases') {
    for (const f of allFiles(fx, input.messages, input.threads)) {
      if (type === 'canvases' ? f.kind !== 'canvas' : f.kind === 'canvas') continue
      const who = type === 'canvases' ? [...filters.createdBy] : []
      if (who.length && !who.includes(f.creatorId ?? '')) continue
      if (from.length && !from.includes(f.creatorId ?? '')) continue
      if (inIds.length && !inIds.includes(f.conversationId ?? '')) continue
      if (filters.fileTypes.length && !filters.fileTypes.includes(fileTypeOf(f.kind) as FileTypeFilter)) continue
      if (filters.excludeAutomations && (fx.users[f.creatorId ?? '']?.isApp || fx.users[f.creatorId ?? '']?.isBot)) continue
      if (filters.onlyMyChannels && f.conversationId && isChannel(fx.conversations[f.conversationId]) && !isMember(fx, fx.conversations[f.conversationId])) continue
      if (!inRange(f.time, filters.date)) continue
      const title = f.title.toLowerCase()
      if (!tokens.every((t) => title.includes(t))) continue
      items.push({ kind: 'file', key: f.id, file: f, ts: String(f.time ?? 0), score: occurrences(title, tokens) + (tokens.length && prefixIndex(f.title, parsed.text) === 0 ? 2 : 0) })
    }
  } else if (type === 'channels') {
    const q = parsed.text.trim().toLowerCase()
    for (const c of Object.values(fx.conversations)) {
      if (!isChannel(c)) continue
      if (filters.channelType === 'public' && c.type !== 'channel') continue
      if (filters.channelType === 'private' && c.type !== 'private') continue
      if (filters.channelType === 'archived' || filters.channelType === 'external') continue
      if (filters.channelMembership === 'joined' && !isMember(fx, c)) continue
      if (filters.channelMembership === 'other' && isMember(fx, c)) continue
      const about = `${c.topic ?? ''} ${c.description ?? ''}`.toLowerCase()
      const nameHit = !!q && c.name.toLowerCase().includes(q)
      if (!nameHit && !(tokens.length && tokens.every((t) => about.includes(t)))) continue
      const rank = prefixIndex(c.name, q) === 0 ? 3 : nameHit ? 2 : 1
      items.push({ kind: 'channel', key: c.id, conversation: c, score: rank })
    }
    items.sort((a, b) => b.score - a.score || (a as { conversation: Conversation }).conversation.name.localeCompare((b as { conversation: Conversation }).conversation.name))
    return items
  } else {
    for (const u of Object.values(fx.users)) {
      if (u.isApp || u.isBot) continue
      const title = (u.title ?? '').toLowerCase()
      const nameHit = prefixIndex(u.realName, parsed.text) !== -1 || prefixIndex(u.name, parsed.text) !== -1
      if (!nameHit && !(tokens.length && tokens.every((t) => title.includes(t)))) continue
      items.push({ kind: 'person', key: u.id, user: u, score: prefixIndex(u.realName, parsed.text) === 0 ? 2 : 1 })
    }
    items.sort((a, b) => b.score - a.score || (a as { user: User }).user.realName.localeCompare((b as { user: User }).user.realName))
    return items
  }

  const tsOf = (i: SearchItem) => parseFloat(i.kind === 'message' ? i.ts : i.kind === 'dm' ? (i.latestTs ?? '0') : i.kind === 'file' ? i.ts : '0')
  if (sort === 'newest') items = items.sort((a, b) => tsOf(b) - tsOf(a))
  else if (sort === 'oldest') items = items.sort((a, b) => tsOf(a) - tsOf(b))
  else items = items.sort((a, b) => b.score - a.score || tsOf(b) - tsOf(a))
  return items
}

/** Result types whose header has the sort button (messages, DMs and files are time-ordered results). */
export const supportsSort = (type: ResultType) => type === 'messages' || type === 'files' || type === 'canvases'

// ------------------------------------------------------------------------------------------------ autocomplete

export type AutocompleteItem =
  | { kind: 'user'; user: User; conversationId?: string }
  | { kind: 'mpdm'; conversation: Conversation }
  | { kind: 'channel'; conversation: Conversation }
  | { kind: 'file'; file: SearchFile }

/**
 * The entity rows while typing (users, group DMs, channels, files), the way the autocomplete ranks them: names whose
 * start matches first, then word starts, recently visited conversations ahead of the rest.
 */
export function autocomplete(input: SearchInput, q: string, visited: string[], limit = 8): AutocompleteItem[] {
  const { fx } = input
  const needle = q.trim().replace(/^[@#]/, '')
  if (!needle) return []
  const visitRank = (id?: string) => {
    const i = id ? visited.indexOf(id) : -1
    return i === -1 ? 0 : 1 - i / Math.max(visited.length, 1)
  }
  const scored: { item: AutocompleteItem; score: number; name: string }[] = []
  const channelsOnly = q.trim().startsWith('#')
  const peopleOnly = q.trim().startsWith('@')
  if (!channelsOnly)
    for (const u of Object.values(fx.users)) {
      if (u.isBot) continue
      const i = Math.min(...[prefixIndex(u.realName, needle), prefixIndex(u.name, needle)].map((x) => (x === -1 ? 99 : x)))
      if (i === 99) continue
      const dm = Object.values(fx.conversations).find((c) => (c.type === 'im' || c.type === 'app') && c.userId === u.id)
      scored.push({ item: { kind: 'user', user: u, conversationId: dm?.id }, score: (i === 0 ? 2 : 1) + visitRank(dm?.id), name: u.name })
    }
  if (!channelsOnly && !peopleOnly)
    for (const c of Object.values(fx.conversations)) {
      if (c.type !== 'mpim') continue
      if (!conversationNames(fx, c).some((n) => n && prefixIndex(n, needle) !== -1)) continue
      scored.push({ item: { kind: 'mpdm', conversation: c }, score: 0.9 + visitRank(c.id), name: conversationTitle(fx, c) })
    }
  if (!peopleOnly)
    for (const c of Object.values(fx.conversations)) {
      if (!isChannel(c)) continue
      const i = prefixIndex(c.name, needle)
      if (i === -1 && !c.name.toLowerCase().includes(needle.toLowerCase())) continue
      scored.push({ item: { kind: 'channel', conversation: c }, score: (i === 0 ? 2 : i > 0 ? 1.5 : 1) + visitRank(c.id), name: c.name })
    }
  if (!channelsOnly && !peopleOnly)
    for (const f of allFiles(fx, input.messages, input.threads)) {
      const i = prefixIndex(f.title, needle)
      if (i === -1) continue
      scored.push({ item: { kind: 'file', file: f }, score: i === 0 ? 1.2 : 0.8, name: f.title })
    }
  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((s) => s.item)
}

/** isJumpToEligibleEntity: the first entity is promoted above the echo row when its name is exactly the query. */
export function isPromoted(fx: Fixture, item: AutocompleteItem | undefined, q: string): boolean {
  if (!item) return false
  const needle = q.trim().replace(/^[@#]/, '').toLowerCase()
  const names = item.kind === 'user' ? [item.user.name, item.user.realName] : item.kind === 'file' ? [item.file.title] : conversationNames(fx, item.conversation)
  return names.some((n) => n.toLowerCase() === needle)
}

// ------------------------------------------------------------------------------------------------ zero state

/** Time of the newest message in a conversation, for "recent conversations". */
export function lastActivity(messages: Record<string, Message[]>, conversationId: string): number {
  const list = messages[conversationId] ?? []
  return list.length ? parseFloat(list[list.length - 1].ts) : 0
}

/**
 * Recent conversations (up to 20, SearchContentRecentConversationsPlugin.swift:35): the ones you visited this session
 * first, then the rest by their latest activity. App DMs aren't included (only DMs, group DMs and channels are drawn).
 */
export function recentConversations(fx: Fixture, messages: Record<string, Message[]>, visited: string[], max = 20): Conversation[] {
  return frecent(fx, messages, visited, (c) => c.type !== 'app', max)
}

/**
 * Recently visited places, the September zero state's second section (frecentItemsDataProvider.streamRecentItems(limit:
 * 30), LegacySearchContentRecentlyVisitedPlacesPlugin.swift:45, :70). Frecency is the places you opened: here the ones
 * you visited this session first (app DMs too: they're SKAppEntity rows), then, standing in for history the demo doesn't
 * have, the channels and DMs with the latest activity.
 */
export function recentlyVisitedPlaces(fx: Fixture, messages: Record<string, Message[]>, visited: string[], max = 30): Conversation[] {
  return frecent(fx, messages, visited, () => true, max, (c) => c.type !== 'app')
}

function frecent(fx: Fixture, messages: Record<string, Message[]>, visited: string[], keep: (c: Conversation) => boolean, max: number, keepRest = keep): Conversation[] {
  const all = Object.values(fx.conversations).filter(keepRest)
  const seen = visited.map((id) => fx.conversations[id]).filter((c): c is Conversation => !!c && keep(c))
  const rest = all.filter((c) => !visited.includes(c.id) && (messages[c.id]?.length ?? 0) > 0).sort((a, b) => lastActivity(messages, b.id) - lastActivity(messages, a.id))
  return [...seen, ...rest].slice(0, max)
}
