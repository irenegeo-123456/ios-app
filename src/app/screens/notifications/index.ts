import { registerScreen, registerSheet } from '../../nav/registry'
import { NotificationsScreen, NotificationsSheet } from './NotificationsModal'
import { ReminderTimeSheet } from './NotificationPages'

// Notifications (spec you-settings.md §3). NotificationSettingsRoute presents a form sheet in its own navigation
// controller (it can't push into You's modal), and pushes inside Preferences: presentSheet('notifications'). Its screens
// can also be pushed on a tab: push({ screen: 'notifications' }). The default reminder time is a DateTimePicker: since
// September always a native sheet with one self-sized detent and the system grabber on iPhone
// (`.sheet(.init(detents: [SKDetent(.selfSized(…))]))`, DateTimePickerFeature.swift:50-64; June the SKBottomSheet unless
// bottomsheetMigration).
registerSheet('notifications', NotificationsSheet, 'page')
registerScreen('notifications', NotificationsScreen)
registerSheet('notification-reminder-time', ReminderTimeSheet, 'fit')

export { useNotificationPrefs, notificationSound, notificationSummary } from './prefs'
