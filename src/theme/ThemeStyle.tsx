import { useMemo } from 'react'
import { create } from 'zustand'
import { computeTheme, computeThemeHighContrast, derivedColors, derivedVariants, type ContrastPair, type Pair, type ThemeInput } from './engine'
import { themeById } from './presets'

// The user's theme, as CSS variables on the simulated screen: every ThemeColorSet role is `--theme_<role>`
// (`var(--theme_baseInverseHighlight2)`), the colors the app derives from them are `--theme_<name>`
// (`--theme_searchBarBackground`), and `--theme_header` is the Home header's background (gradient or solid).
// Light and dark values are both emitted; `[data-appearance]` on .ios-screen picks one. The high-contrast slots iOS
// gives some roles (DefaultThemeColorSet.swift:83-187) override them under `[data-contrast='high']`, and the one
// true-dark slot (the unread tile fill) under `[data-dark-variant='true-dark']`, the same attributes the token CSS
// (src/tokens/generated/colors.css) keys its own variants on.
//
// The theme is a preset id (?theme=jade, the side panel, a prototype's `theme`) or a full ThemeInput. The default
// ('default') is what production users see: the Aubergine preset's colors with gradients on (presets.ts DEFAULT_THEME,
// from real-device screenshots). ?theme=fallback is ColorSet.defaultAubergine, what iOS falls back to without an
// ia_theme and what Slack's snapshot tests render with: use it when comparing a themed screen with a snapshot PNG.

interface ThemeState {
  /** a preset id, 'default' (production's theme), 'fallback' (ColorSet.defaultAubergine) or 'custom' */
  id: string
  input: ThemeInput
  setPreset: (id: string) => void
  setTheme: (input: ThemeInput, id?: string) => void
}

const KEY = 'slack-mobile:theme'

function initial(): { id: string; input: ThemeInput } {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('theme')
  const saved = (() => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    } catch {
      return null
    }
  })()
  return themeById(q ?? saved ?? 'default')
}

export const useTheme = create<ThemeState>((set) => ({
  ...initial(),
  setPreset: (id) => {
    const theme = themeById(id)
    set(theme)
    try {
      localStorage.setItem(KEY, theme.id)
    } catch {
      // storage unavailable
    }
  },
  setTheme: (input, id = 'custom') => set({ input, id }),
}))

export function themeCss(input: ThemeInput): string {
  const roles = computeTheme(input)
  const all: Record<string, Pair> = { ...roles, ...derivedColors(roles) }
  const decl = (mode: 'light' | 'dark') =>
    Object.entries(all)
      .map(([k, v]) => `  --theme_${k}: ${v[mode]};`)
      .join('\n')
  // HeaderBackgroundView: a vertical gradient g1 → g2 over the top 28 % of the screen, solid g2 below; solid g1 when
  // gradients are off (HeaderBackgroundView.swift:38-42, 70-89, spec theme-colors.md 3.5).
  const header = (mode: 'light' | 'dark') =>
    input.gradientEnabled
      ? `linear-gradient(180deg, ${roles.backgroundGradient1[mode]} 0, ${roles.backgroundGradient2[mode]} calc(var(--screen-h) * 0.28), ${roles.backgroundGradient2[mode]} 100%)`
      : roles.backgroundGradient1[mode]
  const hcRoles = computeThemeHighContrast(input)
  const variants = derivedVariants(roles, hcRoles)
  const hcAll: Record<string, ContrastPair> = { ...hcRoles, ...variants.highContrast }
  const hcDecl = (mode: 'light' | 'dark') =>
    Object.entries(hcAll)
      .filter(([, v]) => v[mode])
      .map(([k, v]) => `  --theme_${k}: ${v[mode]};`)
      .join('\n')
  const trueDark = Object.entries(variants.trueDark)
    .map(([k, v]) => `  --theme_${k}: ${v};`)
    .join('\n')
  return (
    `.ios-screen[data-appearance='light'] {\n${decl('light')}\n  --theme_header: ${header('light')};\n}\n` +
    `.ios-screen[data-appearance='dark'] {\n${decl('dark')}\n  --theme_header: ${header('dark')};\n}\n` +
    `.ios-screen[data-appearance='light'][data-contrast='high'] {\n${hcDecl('light')}\n}\n` +
    `.ios-screen[data-appearance='dark'][data-contrast='high'] {\n${hcDecl('dark')}\n}\n` +
    `.ios-screen[data-appearance='dark'][data-dark-variant='true-dark'] {\n${trueDark}\n}\n`
  )
}

export function ThemeStyle() {
  const input = useTheme((s) => s.input)
  const css = useMemo(() => themeCss(input), [input])
  return <style data-slack-theme>{css}</style>
}
