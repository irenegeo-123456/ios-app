import type { Fixture, Message } from '../../../data/types'

// A conversation's pages: "Messages", then ConversationTabsBuilder.buildTabs() (static tabs, the server's tabs, "Add
// canvas"; Modules/Features/AnyConversation/Implementation/Data/ConversationTabsBuilder.swift:60-91). The server's tabs
// aren't in the demo data, so they're derived from it: the channel's canvas and lists, Files, and Pins once something is
// pinned. The title pill's "N tabs" counts these pages (NewConversationHeaderHelperService.swift:59-64), so the header
// menu should list the same ones.

export interface ConversationTab {
  id: string
  /** "Messages" (`messages`, yaml:12301), "Canvas" (3711), "Files" (3714), "Pins" (3708), "List" (3717), "Add canvas" (3705) */
  title: string
  /** SKIconManifest name: outline, and filled when it's the current tab (ConversationTabsBuilder.swift:180-314) */
  icon: string
  selectedIcon: string
}

export function conversationTabs(fx: Fixture, conversationId: string, messages: Message[] = []): ConversationTab[] {
  const conv = fx.conversations[conversationId]
  if (!conv) return []
  const tabs: ConversationTab[] = [{ id: 'messages', title: 'Messages', icon: 'direct_messages', selectedIcon: 'direct_messages_filled' }]
  if (conv.type === 'app') return tabs
  // every canvas tabbed to the conversation (a new one from "Add canvas" or new-canvas included), oldest first
  const canvases = Object.values(fx.canvases ?? {})
    .filter((c) => c.channelId === conversationId)
    .sort((a, b) => parseFloat(a.created) - parseFloat(b.created))
  const canvas = canvases[0]
  for (const c of canvases) tabs.push({ id: `canvas:${c.id}`, title: c.title || 'Canvas', icon: 'canvas_content', selectedIcon: 'canvas_content_filled' })
  for (const list of Object.values(fx.lists ?? {}).filter((l) => l.channelId === conversationId))
    tabs.push({ id: `list:${list.id}`, title: list.title || 'List', icon: 'lists', selectedIcon: 'lists_filled' })
  tabs.push({ id: 'files', title: 'Files', icon: 'files', selectedIcon: 'files' })
  if (messages.some((m) => m.pinnedBy)) tabs.push({ id: 'pins', title: 'Pins', icon: 'pin', selectedIcon: 'pin_filled' })
  // no "Add canvas" in the Slackbot DM (ConversationTabsBuilder.swift:427-430)
  const slackbot = conv.userId === 'USLACKBOT' || fx.users[conv.userId ?? '']?.name === 'Slackbot'
  if (!canvas && !slackbot) tabs.push({ id: 'add-canvas', title: 'Add canvas', icon: 'add_channel_canvas', selectedIcon: 'add_channel_canvas' })
  return tabs
}
