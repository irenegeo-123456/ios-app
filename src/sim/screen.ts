import { create } from 'zustand'
import type { StatusBarTone } from './StatusBar'

// What the app tells the phone around it: the status bar's tone (UIViewController.preferredStatusBarStyle) and
// what the Home button does. The app sets these; the simulator draws them.

interface ScreenChrome {
  statusBar: StatusBarTone
  setStatusBar: (tone: StatusBarTone) => void
  /** the Home button / title bar Home: the app registers its "go to the home screen" handler */
  goHome: () => void
  setGoHome: (fn: () => void) => void
}

export const useScreenChrome = create<ScreenChrome>((set) => ({
  statusBar: 'light',
  setStatusBar: (statusBar) => set({ statusBar }),
  goHome: () => {},
  setGoHome: (goHome) => set({ goHome }),
}))
