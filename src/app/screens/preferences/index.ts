import { registerScreen, registerSheet } from '../../nav/registry'
import { PreferencesScreen, PreferencesSheet } from './PreferencesModal'
import { ThemePickerSheet } from './ThemePicker'

// Preferences (spec you-settings.md §5). SettingsRoute presents a form sheet over You with its own navigation controller
// (SettingsRouteExecution.swift:15-19): presentSheet('preferences'); its screens can also be pushed on a tab:
// push({ screen: 'preferences' }). Themes is fullScreen on iPhone (ThemePickerFeature.swift:25-31).
registerSheet('preferences', PreferencesSheet, 'page')
registerScreen('preferences', PreferencesScreen)
registerSheet('theme-picker', ThemePickerSheet, 'full')

export { useColorMode } from './colorMode'
export type { ColorMode } from './colorMode'
