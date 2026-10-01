import type { ModalPageComponent } from '../you/ModalStack'
import { NOTIFICATION_PAGES } from '../notifications/pages'
import { PreferencesRoot } from './PreferencesRoot'
import { AnimationHapticsPage, ColorModePage, HuddlesPage, ImagesVideoPage, InputOptionsPage, LinksPage, MessageDisplayPage, SwipeActionsPage, TimePage } from './PreferencePages'

// Every screen the Preferences modal can push, by page name: its own, and Notifications', which its first row pushes
// into this sheet (PreferencesFeature.swift:222-223, .pushesToCurrentModalIfAvailable).
export const PREFERENCE_PAGES: Record<string, ModalPageComponent> = {
  ...NOTIFICATION_PAGES,
  preferences: PreferencesRoot,
  'preferences-color-mode': ColorModePage,
  'preferences-message-display': MessageDisplayPage,
  'preferences-links': LinksPage,
  'preferences-input-options': InputOptionsPage,
  'preferences-animation': AnimationHapticsPage,
  'preferences-swipe-actions': SwipeActionsPage,
  'preferences-images': ImagesVideoPage,
  'preferences-huddles': HuddlesPage,
  'preferences-time': TimePage,
}
