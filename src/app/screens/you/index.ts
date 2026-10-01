import { registerScreen, registerSheet } from '../../nav/registry'
import { YouScreen, YouSheet } from './YouScreen'
import { PauseNotificationsSheet } from './PauseNotificationsSheet'

// You (shell-navigation.md §4.3-§4.5). YouRoute presents You modally (.formSheet): presentSheet('you'). The same list
// can be pushed on a tab (prototypes' `view: 'you'`): push({ screen: 'you' }). Pause Notifications is its own form sheet.
registerScreen('you', YouScreen)
registerSheet('you', YouSheet, 'page')
registerSheet('pause-notifications', PauseNotificationsSheet, 'page')

export { usePause, isPaused } from './pause'
