import { registerScreen } from '../../nav/registry'
import { CatchUpScreen } from './CatchUpScreen'

// Catch Up, pushed by Home's Catch Up tile (AllUnreadsTile.swift → AllUnreadsRoute): push({ screen: 'catch-up' }); a
// section browser's Catch Up pill passes that section's conversations: push({ screen: 'catch-up', conversationIds }).
// It hides the nav bar and the tab bar (AllUnreadsViewController.swift:146-152); the status bar is light over the
// theme's dark gradient (preferredStatusBarStyle, :433-439).
registerScreen('catch-up', CatchUpScreen, { tabBar: false, statusBar: 'light' })
