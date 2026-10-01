import { createElement, type ComponentType } from 'react'
import type { Tab } from '../store'
import { HomeScreen } from './home/HomeScreen'
import { DMsScreen } from './dms/DMsScreen'
import { ActivityScreen } from './activity/ActivityScreen'
import { SearchScreen } from './search/SearchScreen'
import { MoreScreen } from './more/MoreScreen'
import { SlackbotScreen } from './slackbot/SlackbotScreen'
import './conversation'
import './thread'
import './compose'
import '../sheets'
import './profile'
import './channel-details'
import './search'
import './more'
import './slackbot'
import './huddles'
import './files'
import './canvas'
import './lists'
import '../sheets/new-canvas'
import '../sheets/new-huddle'
import '../sheets/select-text'
import './you'
import './preferences'
import './notifications'
import '../sheets/notification-settings'
import '../sheets/set-status'
import '../sheets/edit-profile'
import './directories'
import './channel-flows'
import '../huddle'
import '../workspaces'
import './threads'
import './later'
import './drafts'
import './catch-up'
import '../../blocks/register'

// Each tab's root screen. Pushed screens register themselves (registerScreen) in their own folders.
export const ROOT_SCREENS: Record<Tab, ComponentType> = {
  home: HomeScreen,
  dms: DMsScreen,
  activity: ActivityScreen,
  search: SearchScreen,
  more: MoreScreen,
  slackbot: SlackbotTab,
}

/** The Slackbot tab's root: the Slackbot DM as a tab (spec search-slackbot-huddles.md §2.1). */
function SlackbotTab() {
  return createElement(SlackbotScreen, { root: true })
}
