// Data model for the clone. A fixture is a complete fake workspace; the store is seeded from one.

export type Theme = 'dark' | 'light'
/** `search` is the search results view (no rail button is selected while it's open; search area). */
export type RailTab = 'slackbot' | 'home' | 'dms' | 'activity' | 'browse' | 'admin' | 'search'

export interface Workspace {
  id: string
  name: string
  domain: string
  /** Initials shown in the default team icon, e.g. "PF" */
  initials: string
  iconUrl?: string
  plan: 'free' | 'pro' | 'business'
}

export interface User {
  id: string
  /** Display name, as shown on messages */
  name: string
  realName: string
  title?: string
  /** Avatar image URL; `avatar2x` is used for srcset */
  avatar: string
  avatar2x?: string
  presence: 'active' | 'away'
  statusEmoji?: string
  statusText?: string
  /** when the status clears (ms since 1970; Slack's status_expiration). Missing: it doesn't clear (you-settings area) */
  statusExpiration?: number
  isBot?: boolean
  isApp?: boolean
  timezone?: string
  pronouns?: string
  /** the "Name Pronunciation" profile field (Edit Profile; you-settings area) */
  namePronunciation?: string
  /** profile pane contact info / About me (search area; demo-search.ts) */
  email?: string
  phone?: string
  /** ISO date, "About me › Start Date" */
  startDate?: string
  /** "Workspace Owner" / "Workspace Admin" banner on people cards */
  role?: 'owner' | 'admin'
  /** someone from another organization (Slack Connect): the DMs tab's "External people" filter */
  isExternal?: boolean
  /** an app that's an agent (with isApp): a channel's Agents list, the "AGENT" tag (channels-people.md §8) */
  isAgent?: boolean
}

export type ConversationType = 'channel' | 'private' | 'im' | 'mpim' | 'app'

export interface Conversation {
  id: string
  type: ConversationType
  /** channel name (no #) or, for DMs, derived from the other user */
  name: string
  userId?: string
  userIds?: string[]
  topic?: string
  description?: string
  creatorId?: string
  /** ISO date the channel was created (shown in the channel intro) */
  created?: string
  starred?: boolean
  muted?: boolean
  memberCount?: number
  /** channel members (channel area; demo data in demo-channel.ts). Missing means just you. */
  memberIds?: string[]
  /** channel notification level (header bell); `muted` is the "Mute and hide" option */
  notify?: 'all' | 'mentions'
}

export interface SidebarSection {
  id: string
  /** 'salesforce' is Slack's Salesforce section (type salesforce_records); prototypes opt in with sidebar.salesforce */
  kind: 'stars' | 'channels' | 'direct_messages' | 'recent_apps' | 'custom' | 'salesforce'
  name: string
  /** icon name shown before the section label */
  icon: string
  conversationIds: string[]
  /** Hint shown when the section is empty (Starred only) */
  emptyBanner?: string
  description: string
}

export interface Reaction {
  name: string
  users: string[]
}

export interface FileAttachment {
  id: string
  name: string
  title: string
  mimetype: string
  url: string
  width?: number
  height?: number
  size?: number
  /** Slack filetype: "png", "pdf", "gdoc", "gsheet"… (media area; demo data in demo-media.ts) */
  filetype?: string
  /** "PNG", "PDF", "Google Docs" */
  prettyType?: string
  /** what the media viewer shows for a non-image file (a PDF's first page) */
  preview?: string
  previewWidth?: number
  previewHeight?: number
  /** remote file (Google Drive): the card opens this instead of the media viewer */
  externalUrl?: string
  /** videos: length in seconds (the thumbnail's duration badge) */
  duration?: number
}

/** A link preview or app attachment under a message (media area; demo data in demo-media.ts). */
export interface MessageAttachment {
  id: number
  /** the link that was unfurled */
  fromUrl?: string
  /** attachments posted by an app (GitHub, Figma…) keep Slack's classic layout with a color bar */
  botId?: string
  /** color bar, e.g. "#1a7f37" */
  color?: string
  serviceName?: string
  serviceIcon?: string
  authorName?: string
  authorIcon?: string
  authorLink?: string
  title?: string
  titleLink?: string
  /** mrkdwn */
  text?: string
  fields?: { title: string; value: string; short?: boolean }[]
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  thumbUrl?: string
  thumbWidth?: number
  thumbHeight?: number
  footer?: string
  footerIcon?: string
  /** ts shown in the footer of classic attachments */
  ts?: string
}

export interface Message {
  ts: string
  userId: string
  /** Slack mrkdwn */
  text: string
  blocks?: unknown[]
  files?: FileAttachment[]
  /** link unfurls and app attachments (media area) */
  attachments?: MessageAttachment[]
  reactions?: Reaction[]
  threadTs?: string
  replyCount?: number
  replyUsers?: string[]
  latestReply?: string
  edited?: boolean
  /** `huddle_thread`: a huddle's channel card; `huddle_notes`: its AI huddle notes reply (huddles area) */
  subtype?: 'channel_join' | 'bot_message' | 'huddle_thread' | 'huddle_notes'
  /** user who pinned the message to the channel */
  pinnedBy?: string
  /** the huddle a `huddle_thread` / `huddle_notes` message belongs to (huddles area) */
  room?: HuddleRoom
  /** an app's ephemeral response: "Only visible to you", never unread (app kit; src/apps/runtime.ts) */
  ephemeral?: boolean
}

/** A huddle as carried by its channel card (Slack's `room` on `huddle_thread` messages; huddles area). */
export interface HuddleRoom {
  id: string
  /** everyone who joined, in join order (the first one started it) */
  participantIds: string[]
  /** ts it started; `end` once everyone has left */
  start: string
  end?: string
  /** AI huddle notes were on (they're posted to the card's thread when it ends) */
  notes?: boolean
}

export interface UnreadState {
  count: number
  mentions: number
}

export interface Fixture {
  workspace: Workspace
  /** id of the signed-in user */
  me: string
  users: Record<string, User>
  conversations: Record<string, Conversation>
  sections: SidebarSection[]
  messages: Record<string, Message[]>
  /** thread replies keyed by `${conversationId}/${parentTs}` */
  threads?: Record<string, Message[]>
  unreads: Record<string, UnreadState>
  activityBadge: number
  sidebarWidth: number
  /** "Drafts & sent" appears in the sidebar once you've sent a message */
  showDrafts?: boolean
  initial: { tab: RailTab; conversationId: string }
  /** Activity tab feed, newest first (views area; demo data in demo-views.ts) */
  activity?: ActivityItem[]
  /** More › Files (views area) */
  files?: WorkspaceFile[]
  /** More › Later: seeded saved messages, merged with the store's `saved` (views area) */
  later?: LaterItem[]
  /** App DMs: Home tab (Block Kit), About tab and button behaviour, keyed by the app's user id (slackbot area; demo-slackbot.ts) */
  apps?: Record<string, AppProfile>
  /** Slackbot (AI) tab: past conversations, artifacts, tasks (slackbot area; demo-slackbot.ts) */
  slackbot?: SlackbotFixture
  /** Home › Huddles history, newest first (search area; demo-search.ts) */
  huddles?: HuddleRecord[]
  /** Home › Drafts & sent: drafts and scheduled messages (search area) */
  drafts?: DraftItem[]
  /** Home › Directories › User groups (search area) */
  userGroups?: UserGroup[]
  /** link previews by URL, applied to links you send during the demo (media area; demo-media.ts) */
  unfurls?: Record<string, MessageAttachment>
  /** canvases by file id (canvas area; demo-canvas.ts) */
  canvases?: Record<string, CanvasDoc>
  /** Slack Lists by file id (canvas area; demo-canvas.ts) */
  lists?: Record<string, SlackList>
}

/** A canvas (canvas area). Its text lives in `blocks`; inline content is canvas HTML (b, i, del, code, a, mentions). */
export interface CanvasDoc {
  /** file id, e.g. "F04LAUNCHPL" (also its More › Files entry) */
  id: string
  title: string
  creatorId: string
  /** set for a channel canvas (the channel's canvas tab) */
  channelId?: string
  /** ts it was created / last edited */
  created: string
  updated: string
  lastEditorId?: string
  /** people currently in the canvas (presence facepile) */
  viewerIds?: string[]
  blocks: CanvasBlock[]
  /** what you can do with it: 'edit' (default), 'comment' (Comment only) or 'view' (View only) (canvas area) */
  access?: 'edit' | 'comment' | 'view'
  /** a canvas template: the "You're editing a template." banner (canvas area) */
  isTemplate?: boolean
}

export type CanvasBlock =
  | { id: string; type: 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'code'; html: string }
  | { id: string; type: 'bullet' | 'ordered' | 'checklist'; items: CanvasListItem[] }
  | { id: string; type: 'hr' }
  /** an embedded message card */
  | { id: string; type: 'message'; conversationId: string; ts: string }
  /** an embedded canvas / list / file card (More › Files id) */
  | { id: string; type: 'file'; fileId: string }

export interface CanvasListItem {
  id: string
  html: string
  checked?: boolean
  indent?: number
}

/** A Slack List (canvas area). */
export interface SlackList {
  id: string
  title: string
  creatorId: string
  channelId?: string
  columns: SlackListColumn[]
  rows: SlackListRow[]
  /** 'view' makes it read-only (no Add Item, a "View only" banner); default 'edit' (lists area) */
  access?: 'edit' | 'view'
  /** the to-do "completed" checkbox column: its checkbox leads each card (default: a checkbox column named Completed/Done) */
  completedColumnId?: string
}

export interface SlackListColumn {
  id: string
  name: string
  type: 'text' | 'person' | 'select' | 'date' | 'checkbox'
  /** select columns: options with Slack's tag colors */
  options?: { id: string; label: string; color: string }[]
  width?: number
}

export interface SlackListRow {
  id: string
  /** column id → value (text, user id, option id, ISO date, "true") */
  cells: Record<string, string>
}

/** A past huddle (Home › Huddles). */
export interface HuddleRecord {
  id: string
  /** channel or DM the huddle was in */
  conversationId: string
  /** ts it started */
  start: string
  minutes: number
  participantIds: string[]
  /** thread replies posted during the huddle */
  replies?: number
  /** files & links shared in the huddle */
  files?: number
  /** has AI huddle notes */
  notes?: boolean
}

/** A draft or scheduled message (Home › Drafts & sent). */
export interface DraftItem {
  id: string
  conversationId: string
  /** parent ts when the draft is a thread reply */
  threadTs?: string
  /** mrkdwn */
  text: string
  /** ts of the last edit */
  updated: string
  /** ts it will be sent at (Scheduled tab) */
  scheduledFor?: string
}

/** A user group (@handle) in Directories. */
export interface UserGroup {
  id: string
  handle: string
  name: string
  description?: string
  memberIds: string[]
}

/** One row of the Activity tab. */
export interface ActivityItem {
  id: string
  /** mention: @you · thread: replies in a thread you're in · reaction: to your message · dm · app: an app DM */
  type: 'mention' | 'thread' | 'reaction' | 'dm' | 'app'
  conversationId: string
  /** the message the row points at (the mention, the latest reply, the reacted message, the DM) */
  ts: string
  /** parent ts when the message is in a thread */
  threadTs?: string
  /** who did it (sender, latest replier, reactor) */
  userId: string
  /** other thread participants / reactors */
  otherUserIds?: string[]
  /** emoji name, for reactions */
  reaction?: string
  /** when it happened, if not `ts` (reactions) */
  activityTs?: string
  unread?: boolean
  /** unread messages behind the row (DMs, app DMs, threads) */
  unreadCount?: number
}

/** A canvas, list or attachment in More › Files. */
export interface WorkspaceFile {
  id: string
  title: string
  kind: 'canvas' | 'list' | 'pdf' | 'doc' | 'spreadsheet' | 'image' | 'video'
  creatorId: string
  /** ts of the last time you viewed it */
  lastViewed: string
  /** canvases: "N min read" */
  readMinutes?: number
  sharedWithYou?: boolean
}

/** A saved message in More › Later. */
export interface LaterItem {
  conversationId: string
  ts: string
  threadTs?: string
  status?: 'in_progress' | 'archived' | 'completed'
  /** reminder time (ts) */
  due?: string
}

/** Block Kit JSON, as apps send it (the supported subset is typed in src/components/blocks/types.ts). */
export type BlockKitBlock = { type: string; block_id?: string } & Record<string, unknown>

/** What a Block Kit interaction does in the demo (buttons, overflow options, select choices). */
export interface AppActionEffect {
  /** replace the block that holds the element */
  replaceBlock?: BlockKitBlock[]
  /** replace the whole message (text and/or blocks) */
  replaceMessage?: { text?: string; blocks?: BlockKitBlock[] }
  /** the app posts a follow-up in its DM */
  reply?: { text: string; blocks?: BlockKitBlock[] }
  /** open a Block Kit modal; `submit` runs when its primary button is pressed */
  modal?: { title: string; submitLabel?: string; closeLabel?: string; blocks: BlockKitBlock[]; submit?: AppActionEffect }
  /** open a link in a new browser tab */
  url?: string
}

/** An app's Home and About tabs (app DMs in "Agents & apps"). */
export interface AppProfile {
  /** Block Kit blocks of the Home tab */
  home?: BlockKitBlock[]
  /** About tab description; mrkdwn, one "• item" per line */
  description: string
  /** large icon on the About tab */
  avatarLarge?: string
  homepage?: string
  /** "Managed by …" line on the About tab */
  managedBy?: string
  /** interaction effects keyed by `action_id`, or `action_id:value` for option-specific ones */
  actions?: Record<string, AppActionEffect>
  /** the App Profile card's color, a hex like "#4A154B" (default sk_dark_gray #616061; AppProfilePresenter.swift:57-63) */
  cardColor?: string
}

/** One question/answer turn of a seeded Slackbot conversation. */
export interface SlackbotTurnSeed {
  question: string
  /** mrkdwn; `<cite://CHANNEL/TS>` renders a numbered citation to a message */
  answer: string
  /** timeline header shown above the answer ("Searched channels and found latest messages.") */
  status?: string
  /** timeline steps behind the header */
  steps?: string[]
  /** suggested follow-up shown in the composer */
  followUp?: string
}

export interface SlackbotChatSeed {
  /** thread ts of the conversation */
  id: string
  title: string
  turns: SlackbotTurnSeed[]
  starred?: boolean
}

export interface SlackbotArtifact {
  id: string
  title: string
  kind: 'canvas' | 'list' | 'doc' | 'link'
  /** ts it was created */
  created: string
  /** conversation it came from */
  chatId?: string
  url?: string
}

export interface SlackbotTask {
  id: string
  title: string
  /** "Every weekday at 8:30 AM" */
  schedule: string
  prompt: string
  skill?: string
  enabled: boolean
  /** ts of the last run */
  lastRun?: string
}

export interface SlackbotFixture {
  /** past conversations for Recents / All conversations, newest first */
  chats: SlackbotChatSeed[]
  artifacts?: SlackbotArtifact[]
  tasks?: SlackbotTask[]
}
