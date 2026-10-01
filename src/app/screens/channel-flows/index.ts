import { registerScreen, registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { DirectoriesScreen } from '../directories/DirectoriesScreen'
import { InviteSheet } from '../../sheets/invite/InviteSheet'
import { InviteByEmailSheet } from '../../sheets/invite/InviteByEmailSheet'
import { CreateChannelSheet } from './CreateChannelSheet'
import { BrowseChannelsScreen } from './BrowseChannelsScreen'
import { ChannelPreviewScreen } from './ChannelPreviewScreen'
import { PinsScreen } from './PinsScreen'
import { ConversationFilesScreen } from './ConversationFilesScreen'
import { AddAppsScreen, ConversationAgentsScreen, ConversationAppsScreen } from './ConversationAppsScreen'
import { SearchInChannelScreen } from './SearchInChannelScreen'

// Channels and people (spec reference/ios/specs/channels-people.md), under the names other screens open them by:
//
//   presentSheet('create-channel')                                     Create a Channel: name, visibility, Add Members
//   push({ screen: 'browse-channels' })                                the channel browser
//   push({ screen: 'channel-preview', conversationId })                a channel you aren't in, with Join
//   push({ screen: 'people' })                                         people (the Directories screen, §4)
//   presentSheet('invite') · presentSheet('invite-by-email')           invite people to the workspace
//   push({ screen: 'conversation-pins', conversationId })              the conversation's Pins
//   push({ screen: 'conversation-files', conversationId })             its Files ({ documents: true }: all documents)
//   push({ screen: 'conversation-apps' | 'conversation-agents', conversationId })    its apps / agents
//   push({ screen: 'conversation-add-apps', conversationId, agents? })              Add an app / Add an agent
//   push({ screen: 'search-in-channel', conversationId })              the conversation with the find bar
//
// Screens without a conversationId use the nearest conversation on the stack, then the workspace's first.

// One form sheet with its own navigation stack (CreateChannelFeature.swift:119-126; ModallyPresentableFeature.swift:64-68)
registerSheet('create-channel', CreateChannelSheet as never, 'page')
registerScreen('browse-channels', BrowseChannelsScreen)
registerScreen('channel-preview', ChannelPreviewScreen)
// iOS has no people directory (§4): the Directories screen opens on People
registerScreen('people', DirectoriesScreen)

// The invite sheet is a legacy SKBottomSheet hugging its content; with bottomsheetMigration a self-sized native sheet
// (InviteToWorkspaceFeature.swift:30-47). Add by Email is a form sheet in a navigation controller (InviteEmailFeature.swift:44-75).
registerSheet('invite', InviteSheet as never, 'fit')
configureSheet('invite', { chrome: 'legacy', migrated: { detents: ['fit'] } })
registerSheet('invite-by-email', InviteByEmailSheet as never, 'page')

registerScreen('conversation-pins', PinsScreen)
registerScreen('conversation-files', ConversationFilesScreen)
registerScreen('conversation-apps', ConversationAppsScreen)
registerScreen('conversation-agents', ConversationAgentsScreen)
registerScreen('conversation-add-apps', AddAppsScreen)
registerScreen('search-in-channel', SearchInChannelScreen)
