import type { ComponentType } from 'react'
import type { Route } from '../store'

// Screens that can be pushed on a navigation stack, and sheets that can be presented, by name. Each area registers
// its own (src/app/screens/index.ts, src/app/sheets/index.ts); prototypes can add more with registerScreen /
// registerSheet. A screen gets its route's props; a sheet gets its props plus `sheetKey`.

export interface ScreenOptions {
  /** false hides the tab bar while this screen is on top (hidesBottomBarWhenPushed). Default: shown, as in Slack iOS 26 */
  tabBar?: boolean
  /** status bar glyph color over this screen; default follows the appearance (dark glyphs in light mode) */
  statusBar?: 'light' | 'dark' | 'auto'
}

export interface ScreenDef {
  component: ComponentType<{ route: Route }>
  options?: ScreenOptions
}

export interface SheetProps {
  sheetKey: string
  [prop: string]: unknown
}

export interface SheetDef {
  component: ComponentType<SheetProps>
  /**
   * How it's presented: 'page' is a UISheetPresentationController at the large detent, 'medium' starts at the medium
   * detent, 'fit' sizes to its content, 'full' covers the screen (fullScreen modal), 'overlay' draws its own chrome
   * (menus, alerts).
   */
  presentation?: 'page' | 'medium' | 'fit' | 'full' | 'overlay'
  options?: SheetOptions
}

export interface SheetOptions {
  /** status bar over this sheet: 'hidden' for full-screen media, 'light' over dark chrome; default follows the presentation */
  statusBar?: 'light' | 'dark' | 'hidden'
}

const screens = new Map<string, ScreenDef>()
const sheets = new Map<string, SheetDef>()

export function registerScreen(name: string, component: ScreenDef['component'], options?: ScreenOptions) {
  screens.set(name, { component, options })
}

export function registerSheet(name: string, component: SheetDef['component'], presentation: SheetDef['presentation'] = 'page', options?: SheetOptions) {
  sheets.set(name, { component, presentation, options })
}

export const screenDef = (name: string) => screens.get(name)
export const sheetDef = (name: string) => sheets.get(name)
export const screenNames = () => [...screens.keys()]
export const sheetNames = () => [...sheets.keys()]
