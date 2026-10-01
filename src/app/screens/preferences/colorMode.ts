import { create } from 'zustand'
import { useSim, type Appearance } from '../../../sim/store'

// Preferences › Color Mode (Modules/Features/Preferences/Implementation/Appearance, spec theme-colors.md §2.3 and
// you-settings.md §5.2): AppearanceMode system (default) / light / dark, stored per device. Slack applies it as the
// window's overrideUserInterfaceStyle: System = .unspecified (follow iOS), Light = .light, Dark = .dark
// (ConfigManager.swift:19-34, LoggedInViewController.swift:70-90). In the simulator the device's own appearance is
// useSim's `appearance` (the side panel's Light / Dark): Light and Dark set it, System puts back the device's.

export type ColorMode = 'system' | 'light' | 'dark'

interface ColorModeState {
  mode: ColorMode
  /** the device's appearance while Slack overrides it (restored by System) */
  device: Appearance
  setMode: (mode: ColorMode) => void
}

let applying = false

export const useColorMode = create<ColorModeState>()((set, get) => ({
  mode: 'system',
  device: useSim.getState().appearance,
  setMode: (mode) => {
    const s = get()
    if (mode === s.mode) return
    const device = s.mode === 'system' ? useSim.getState().appearance : s.device
    set({ mode, device })
    const want: Appearance = mode === 'system' ? device : mode
    if (useSim.getState().appearance !== want) {
      applying = true
      useSim.getState().set({ appearance: want })
      applying = false
    }
  },
}))

// The device's appearance changed from outside Slack (the side panel, ?appearance=): with System, Slack follows it;
// with an override, the override is what the designer just undid, so Slack goes back to System.
useSim.subscribe((s, prev) => {
  if (applying || s.appearance === prev.appearance) return
  const c = useColorMode.getState()
  if (c.mode === 'system' || c.mode !== s.appearance) useColorMode.setState({ mode: 'system', device: s.appearance })
})
