import { registerScreen, registerSheet } from '../../nav/registry'
import { ProfileScreen, ProfileSheet } from './ProfileScreen'

// A person's profile (spec sheets-menus.md §3), { userId }. Pushed from a mention: push({ screen: 'profile', userId });
// presented the way iOS presents it (a fullScreen modal): presentSheet('profile', { userId }).
registerScreen('profile', ProfileScreen)
registerSheet('profile', ProfileSheet as never, 'full')
