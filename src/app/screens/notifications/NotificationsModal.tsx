import type { Route } from '../../store'
import type { SheetProps } from '../../nav/registry'
import { ModalScreen, ModalStack } from '../you/ModalStack'
import { NOTIFICATION_PAGES } from './pages'

/** The Notifications form sheet: its own navigation controller, the settings list first. */
export const NotificationsSheet = (_props: SheetProps) => <ModalStack pages={NOTIFICATION_PAGES} root="notifications" />

/** The same screens pushed on a tab's stack (push({ screen: 'notifications' })). */
export const NotificationsScreen = ({ route }: { route: Route }) => <ModalScreen pages={NOTIFICATION_PAGES} root="notifications" route={route} />
