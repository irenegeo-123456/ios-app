import type { Route } from '../../store'
import type { SheetProps } from '../../nav/registry'
import { ModalScreen, ModalStack } from '../you/ModalStack'
import { PREFERENCE_PAGES } from './pages'

/** The Preferences form sheet: its own navigation controller (SettingsRouteExecution.swift:15-19). */
export const PreferencesSheet = (_props: SheetProps) => <ModalStack pages={PREFERENCE_PAGES} root="preferences" />

/** The same screens pushed on a tab's stack (push({ screen: 'preferences' })). */
export const PreferencesScreen = ({ route }: { route: Route }) => <ModalScreen pages={PREFERENCE_PAGES} root="preferences" route={route} />
