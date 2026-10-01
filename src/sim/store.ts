import { create } from 'zustand'
import { DEFAULT_DEVICE, deviceById } from './devices'

// The simulator's own settings: which device, its finish, light or dark, how much chrome to draw around it and the
// status bar clock. They're remembered in this browser; URL parameters win for one visit (and don't get saved), so a
// shared link always opens the way it was sent:
//
//   ?device=iphone-16  ?finish=deep-blue  ?appearance=dark  ?chrome=window|device|screen  ?clock=9:41  ?panel=0

export type Appearance = 'light' | 'dark'
/** window: Simulator window + side panel · device: the phone alone · screen: just the screen, edge to edge */
export type Chrome = 'window' | 'device' | 'screen'

export interface SimSettings {
  device: string
  finish: string
  appearance: Appearance
  chrome: Chrome
  /** the side panel next to the device (prototypes, scenes, settings) */
  panel: boolean
  /** status bar time, 'H:MM' (24h) or 'live' */
  clock: string
  /** play notification sounds */
  sounds: boolean
  /** iOS 26's Slackbot tab in place of More (the `.slackbotBottomTab` rollout; CompactRootTabBarController.swift:467-477) */
  slackbotTab: boolean
  /** Settings › Accessibility › Display & Text Size › Increase Contrast: the tokens' high-contrast values */
  contrast: 'normal' | 'high'
}

const KEY = 'slack-mobile:sim'
const DEFAULTS: SimSettings = { device: DEFAULT_DEVICE.id, finish: DEFAULT_DEVICE.finishes[0].id, appearance: 'light', chrome: 'window', panel: true, clock: '9:41', sounds: true, slackbotTab: false, contrast: 'normal' }

function load(): { saved: SimSettings; url: Partial<SimSettings> } {
  let saved = DEFAULTS
  try {
    saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    // corrupt or unavailable storage: defaults
  }
  const q = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search)
  const url: Partial<SimSettings> = {}
  if (q.get('device')) url.device = deviceById(q.get('device')).id
  if (q.get('finish')) url.finish = q.get('finish')!
  const a = q.get('appearance') ?? q.get('theme')
  if (a === 'light' || a === 'dark') url.appearance = a
  const c = q.get('chrome') ?? q.get('frame')
  if (c === 'window' || c === 'device' || c === 'screen') url.chrome = c
  if (c === 'none') url.chrome = 'screen'
  if (q.get('panel') === '0') url.panel = false
  if (q.get('clock')) url.clock = q.get('clock')!
  if (q.has('slackbotTab')) url.slackbotTab = q.get('slackbotTab') !== '0'
  if (q.get('contrast') === 'high' || q.get('contrast') === 'normal') url.contrast = q.get('contrast') as SimSettings['contrast']
  // gallery cards embed prototypes with ?preview: silent
  if (q.has('preview')) url.sounds = false
  return { saved, url }
}

interface SimState extends SimSettings {
  set: (patch: Partial<SimSettings>) => void
}

const { saved, url } = load()

export const useSim = create<SimState>((set) => ({
  ...saved,
  ...url,
  set: (patch) => {
    set(patch)
    // Only what the user changes is saved; one-visit URL overrides stay out of storage unless changed again.
    try {
      const next = { ...saved, ...JSON.parse(localStorage.getItem(KEY) ?? '{}'), ...patch }
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // storage unavailable
    }
  },
}))

export const useDevice = () => deviceById(useSim((s) => s.device))
