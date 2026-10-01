import { registerScreen } from '../../nav/registry'
import { ChannelDetailsScreen } from './ChannelDetailsScreen'
import { MembersScreen } from './MembersScreen'

// Channel and DM details (spec sheets-menus.md §4): push({ screen: 'channel-details', conversationId }). The header
// menu's "Settings & Details" pushes it; so does "Channel Details" in its … menu. "Show All" members pushes
// 'conversation-members' ({ conversationId }).
registerScreen('channel-details', ChannelDetailsScreen)
registerScreen('conversation-members', MembersScreen)
