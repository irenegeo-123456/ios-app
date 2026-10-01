import type { ModalPageComponent } from '../you/ModalStack'
import { NotificationsRoot } from './NotificationsRoot'
import { ExceptionsPage, GlobalDefaultsPage, KeywordsPage, PushOverridesPage, ScheduleDayPage, SchedulePage, SoundsPage, TimingPage } from './NotificationPages'
import { ConversationAdvancedPage, ConversationNotificationsPage } from '../../sheets/notification-settings/ConversationNotifications'

// Every screen the Notifications modal can push, by page name (ModalStack / ModalScreen). Preferences pushes the same
// pages (its Notifications row pushes into the Preferences sheet: PreferencesFeature.swift:209-210), and a conversation's
// settings are pushed from the exception lists.
export const NOTIFICATION_PAGES: Record<string, ModalPageComponent> = {
  notifications: NotificationsRoot,
  'notifications-global': GlobalDefaultsPage,
  'notifications-overrides': PushOverridesPage as ModalPageComponent,
  'notifications-timing': TimingPage,
  'notifications-schedule': SchedulePage,
  'notifications-schedule-day': ScheduleDayPage as ModalPageComponent,
  'notifications-sounds': SoundsPage as ModalPageComponent,
  'notifications-keywords': KeywordsPage,
  'notifications-exceptions': ExceptionsPage as ModalPageComponent,
  'conversation-notifications': ConversationNotificationsPage as ModalPageComponent,
  'conversation-notifications-advanced': ConversationAdvancedPage as ModalPageComponent,
}
