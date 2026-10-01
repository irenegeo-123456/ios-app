import type { Route } from '../../store'
import { ModalScreen } from '../../screens/you/ModalStack'
import { NOTIFICATION_PAGES } from '../../screens/notifications/pages'

/** A conversation's notification settings pushed on its tab's stack: { conversationId }, then Advanced and overrides. */
export const NotificationSettingsScreen = ({ route }: { route: Route }) => <ModalScreen pages={NOTIFICATION_PAGES} root="conversation-notifications" route={route} />
