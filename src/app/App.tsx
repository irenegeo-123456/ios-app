import { useEffect, type ReactNode } from 'react'
import { TABS, useApp, type Tab } from './store'
import { StackView } from './nav/StackView'
import { screenDef, sheetDef } from './nav/registry'
import { SheetHost } from './nav/SheetHost'
import { ToastHost } from './ui/Toast'
import { KeyboardHost } from './keyboard/Keyboard'
import { HomeScreenOverlay } from './springboard/Springboard'
import { HuddleOverlay } from './huddle'
import { NotificationBanner } from './notify/Banner'
import { useScreenChrome } from '../sim/screen'
import { useSim } from '../sim/store'
import { useTheme } from '../theme/ThemeStyle'
import { Guard } from './ui/Guard'
import { ROOT_SCREENS } from './screens'
import { TabBar } from './nav/TabBar'
import { useTouchGestures } from './gestures'

// The Slack app: a tab bar controller (one navigation stack per tab), with sheets, toasts and the keyboard above it.
// On iPhone this is CompactRootTabBarController (Modules/Features/CompactRoot).

export function App() {
  const tab = useApp((s) => s.tab)
  useStatusBarSync()
  useTouchGestures()
  useEffect(() => {
    document.body.dataset.appReady = '1'
    document.querySelector('.ios-screen')?.setAttribute('data-app-ready', '1')
  }, [])
  return (
    <div className="ios-app" data-app-ready>
      {TABS.map((t) => (
        <div key={t} className="ios-tab" hidden={t !== tab} data-tab={t}>
          <Guard name={`${t} tab`}>
            <StackView tab={t} root={<RootScreen tab={t} />} />
          </Guard>
          <TabBarFor tab={t} />
        </div>
      ))}
      <SheetHost />
      <ToastHost />
      <KeyboardHost />
      <HomeScreenOverlay />
      <HuddleOverlay />
      <NotificationBanner />
    </div>
  )
}

/**
 * The tab bar stays over pushed screens on iOS 26: nothing in Slack sets hidesBottomBarWhenPushed (spec
 * shell-navigation.md §3.6), so conversations keep it and their composer sits above it. A screen can opt out with
 * registerScreen(name, C, { tabBar: false }) (Catch Up and AI Recap do).
 */
function TabBarFor({ tab }: { tab: Tab }) {
  const top = useApp((s) => s.stacks[tab].at(-1)?.route)
  const hidden = top ? screenDef(top.screen)?.options?.tabBar === false : false
  return (
    <div className={`ios-tabbar-host${hidden ? ' is-hidden' : ''}`}>
      <TabBar />
    </div>
  )
}

function RootScreen({ tab }: { tab: Tab }): ReactNode {
  const C = ROOT_SCREENS[tab]
  return <C />
}

/** Status bar glyphs follow the screen on top: over the themed root headers (Home, DMs, Activity, Search, More) they
 *  contrast with the theme's header (white over the default dark aubergine, black over a light theme); the Slackbot
 *  tab and pushed screens follow the appearance unless the screen says otherwise. */
function useStatusBarSync() {
  const appearance = useSim((s) => s.appearance)
  const setStatusBar = useScreenChrome((s) => s.setStatusBar)
  const tab = useApp((s) => s.tab)
  const headerOnDark = useTheme((t) => t.input.brightness >= 4)
  const top = useApp((s) => s.stacks[s.tab].at(-1)?.route)
  const sheets = useApp((s) => s.sheets.length)
  const topSheet = useApp((s) => s.sheets.at(-1)?.type)
  const foreground = useApp((s) => s.foreground)
  useEffect(() => {
    const auto = appearance === 'dark' ? 'light' : 'dark'
    if (!foreground) return setStatusBar('light')
    // A sheet can set its own; a full-screen modal follows the appearance. On iOS 26 the app stays full size behind
    // page, medium and fit sheets and behind menus and alerts (measurements.md, "Sheets"), so the screen's tone holds.
    const def = topSheet ? sheetDef(topSheet) : undefined
    if (def?.options?.statusBar) return setStatusBar(def.options.statusBar)
    if (sheets && def?.presentation === 'full') return setStatusBar(auto)
    if (!top) return setStatusBar(tab === 'slackbot' ? auto : appearance === 'dark' || headerOnDark ? 'light' : 'dark')
    const pref = screenDef(top.screen)?.options?.statusBar ?? 'auto'
    setStatusBar(pref === 'auto' ? auto : pref)
  }, [appearance, tab, headerOnDark, top, sheets, topSheet, foreground, setStatusBar])
}
