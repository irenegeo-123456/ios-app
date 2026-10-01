import { createElement } from 'react'
import { registerScreen } from '../../app/nav/registry'
import { NavBar } from '../../app/nav/NavBar'
import type { Route } from '../../app/store'
import { AppProfile } from './AppProfile'
import './app-dm.css'

// The App Profile pushed from a bot's name or avatar: push({ screen: 'app-profile', userId }). Its title is
// "App Profile" (app_profile, yaml:1844) in Lato Black 17 (AppProfileViewController.swift:33-35); the actions are
// "Go To App" and the VIP toggle (not the About tab's).

function AppProfileScreen({ route }: { route: Route }) {
  const userId = String(route.userId ?? '')
  return createElement(
    'div',
    { className: 'ios-pushed-screen app-profile-screen', 'data-screen': 'app-profile' },
    createElement('div', { className: 'app-profile-screen__scroll ios-scroll' }, createElement(AppProfile, { appUserId: userId })),
    createElement(NavBar, { title: 'App Profile' }),
  )
}

registerScreen('app-profile', AppProfileScreen)
