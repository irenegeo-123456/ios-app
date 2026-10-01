import { registerScreen } from '../../nav/registry'
import { NotificationSettingsScreen } from './NotificationSettingsScreen'

// A conversation's notification settings (spec you-settings.md §4): NotificationConversationNoiseSettingsRoute pushes
// it (…RouteExecution.swift:17-22), from the header menu's Notifications row (which opens it once it's registered) and
// Channel details: push({ screen: 'notification-settings', conversationId }).
registerScreen('notification-settings', NotificationSettingsScreen)
