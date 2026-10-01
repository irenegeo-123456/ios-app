import { create } from 'zustand'

// The device settings behind Preferences' simple screens, with their first-launch defaults (ConfigManager.swift and
// each screen's interactor; spec you-settings.md §5.5). Nothing else in the prototype reads them yet; they're kept
// for this session so the switches stay where you put them.

/** DMSwipeActionType / ActivitySwipeActionType, in their allCases order (SwipeActionsManagerInterface.swift:23-33) */
export type DMSwipeAction = 'toggleReadState' | 'toggleMute' | 'none'
export type ActivitySwipeAction = 'toggleReadState' | 'archive' | 'none'

interface PreferenceToggles {
  // Message Display (MessageDisplaySettingsPresenter.swift:32-125)
  displayFullNames: boolean
  typingIndicator: boolean
  collapseImages: boolean
  // Links (LinkSettingsInteractor.swift:37)
  linksSyncWithSystem: boolean
  underlineLinks: boolean
  // Input Options (ConfigManager.swift:538-558)
  formatWithMarkup: boolean
  // Animation & Haptics
  motionSyncWithSystem: boolean
  animatedImages: boolean
  haptics: boolean
  // Images & Video
  optimizeImages: boolean
  saveMedia: boolean
  optimizeVideos: boolean
  // Huddles: only "Play music when alone" since September ("Raise to listen" is gone, HuddlesSettingsPresenter.swift:52-60;
  // an unset music pref reads as never: ConfigManager.swift:529-536)
  musicWhenAlone: boolean
  // Swipe Actions (SwipeActionsManager.swift:18-73): the DMs and Activity rows' left / right swipes
  dmsLeftSwipe: DMSwipeAction
  dmsRightSwipe: DMSwipeAction
  activityLeftSwipe: ActivitySwipeAction
  activityRightSwipe: ActivitySwipeAction
  // Time (ConfigManager.swift:109-114, :376-383)
  automaticTimeZone: boolean
  clock24: boolean
  set: (patch: Partial<Omit<PreferenceToggles, 'set'>>) => void
}

export const usePreferenceToggles = create<PreferenceToggles>()((set) => ({
  displayFullNames: false,
  typingIndicator: true,
  collapseImages: false,
  linksSyncWithSystem: true,
  underlineLinks: false,
  formatWithMarkup: false,
  motionSyncWithSystem: true,
  animatedImages: true,
  haptics: true,
  optimizeImages: true,
  saveMedia: true,
  optimizeVideos: true,
  musicWhenAlone: false,
  // the defaults when the pref is unset: DMs read / mute, Activity read / archive (SwipeActionsManager.swift:26, :33,
  // :45, :52; June: Activity's right swipe was none unless the activityInbox flag was on)
  dmsLeftSwipe: 'toggleReadState',
  dmsRightSwipe: 'toggleMute',
  activityLeftSwipe: 'toggleReadState',
  activityRightSwipe: 'archive',
  automaticTimeZone: true,
  clock24: false,
  set: (patch) => set(patch),
}))
