import type { Conversation, User } from '../../data/types'
import type { AgentStatus } from '../../apps/agent-state'

// What the conversation's context bar shows (spec composer.md §14), for the states the clone has data for. Sept draws one
// SKContextBar at a time, the first configuration that applies in ContextBarPriorities order (Modules/Integration/
// ContextBar/Implementation/ContextBarData.swift:39-58): … activeParticipants, typing, …, aiAppProcessing, …,
// slackbotAIProcessing, …, dnd, timezone. Not here: activeParticipants (agent rows, stop buttons, the expandable header)
// is behind ios_agent_sessions_context_bar / ios_channel_sessions_context_bar, both "defaultValue": false
// (ContextBarActiveParticipantsConfiguration.swift:21-26), so production never draws it.

export type ContextBarState =
  /** people typing: their avatars + "Jane is **typing…**" (ContextBarTypingConfiguration.swift:31-42; SKContextBarAdapter.swift:153-161) */
  | { kind: 'typing'; users: User[] }
  /** an AI app's status in a thread of its DM: "Beacon is thinking…", plain text, no avatar (ContextBarAiAppProcessingConfiguration.swift:22; SKContextBarAdapter.swift:282-289) */
  | { kind: 'aiAppProcessing'; text: string }
  /** Slackbot answering in its DM: its avatar + "Slackbot is **typing...**" (ContextBarSlackbotAIProcessingConfiguration.swift:39-40; SKContextBarAdapter.swift:410-418) */
  | { kind: 'slackbotTyping'; avatar?: string }
  /** the other person in a DM paused notifications: `snoozeFilled` + "Jane has **paused their notifications**" (ContextBarDNDConfiguration.swift:14-25; ContextBarConfiguration.swift:76-90; SKContextBarAdapter.swift:291-299) */
  | { kind: 'dnd'; name: string }

/** In DND now: inside the person's window (DNDInfoManager.swift:166-179); the clone's windows have started (types.ts User.dnd). */
export const isDnd = (u: User | undefined, now = Date.now()) => !!u?.dnd && (u.dnd.until === undefined || now < u.dnd.until)

export interface ContextBarInput {
  me: string
  users: Record<string, User>
  conversationId: string
  conv?: Conversation
  threadTs?: string
  /** the store's typing state for the conversation */
  typingIds?: string[]
  /** the app kit's agent statuses (src/apps/agent-state.ts), by `channel` or `channel/threadTs` */
  statuses: Record<string, AgentStatus>
  /** the Slackbot DM: Slackbot's own conversation (the Slackbot screens) or a DM with Slackbot's user */
  slackbot: boolean
  slackbotUserId: string
  /** ms since 1970 (DND windows end); default Date.now() */
  now?: number
}

export function contextBarState({ me, users, conversationId, conv, threadTs, typingIds = [], statuses, slackbot, slackbotUserId, now = Date.now() }: ContextBarInput): ContextBarState | null {
  // An app that's working reports a status (assistant.threads.setStatus), which the app kit also mirrors into the typing
  // state (src/apps/agent.ts mirrorTyping). iOS never shows it as typing: it's the AI-app bar in a thread of the app's
  // own DM, and nothing in a channel or at a DM's top level (AiAppProcessingIndicatorPlugin.swift:181-229 needs a thread
  // source and the conversation's DM user, :189-193).
  const working = new Set(
    Object.entries(statuses)
      .filter(([key]) => key === conversationId || key.startsWith(`${conversationId}/`))
      .map(([, s]) => s.botUserId),
  )
  // Typers are kept per conversation and thread (TypingUsersService.swift:26-34, :50-53); the clone's are per conversation,
  // so a thread shows none. Your own typing is ignored (:102-106), unresolved ids are dropped (:66-68).
  const typers = threadTs
    ? []
    : typingIds
        .filter((id) => id !== me && !working.has(id) && !(slackbot && id === slackbotUserId))
        .map((id) => users[id])
        .filter((u): u is User => !!u)
  if (typers.length) return { kind: 'typing', users: typers }
  if (conv?.type === 'app' && conv.userId && threadTs) {
    const status = statuses[`${conversationId}/${threadTs}`]
    // the DM's app name (`conversation.user?.name`; the status's own username only with ios_agent_status_ui_update,
    // default off, AiAppProcessingIndicatorPlugin.swift:197-205), a space, the status (:218-221)
    if (status?.status && status.botUserId === conv.userId) return { kind: 'aiAppProcessing', text: `${users[conv.userId]?.name ?? ''} ${status.status}`.trim() }
  }
  if (slackbot && typingIds.includes(slackbotUserId)) return { kind: 'slackbotTyping', avatar: users[slackbotUserId]?.avatar }
  // DND, near the end of ContextBarPriorities (ContextBarData.swift:66-67): only a 1:1 DM with a human who isn't you
  // (validImUser: `.im`, isHuman, !isMe, ContextBarConfiguration.swift:81-90; bots never have DND, DNDInfoManager.swift:
  // 181-185), in DND now; the configuration ignores threadTs, so the DM's threads show it too (ContextBarDNDConfiguration
  // .swift:15-25). The name is the user's name, display or real (ContextBarDNDDisplayModel.dndDisplayModel(for: imUser.name)).
  const other = conv?.type === 'im' && conv.userId ? users[conv.userId] : undefined
  if (other && other.id !== me && !other.isBot && !other.isApp && other.id !== slackbotUserId && isDnd(other, now)) return { kind: 'dnd', name: other.name || other.realName }
  return null
}
