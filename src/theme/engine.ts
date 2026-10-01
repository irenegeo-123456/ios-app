import { Hct, TonalPalette } from '@material/material-color-utilities'
import { colorTokens } from '../tokens/generated/colors'

// Slack iOS's theme engine, ported: a theme (four palettes and a brightness 1–6) becomes the 31 ThemeColorSet roles,
// each a light/dark pair (plus the high-contrast slots iOS sets on 9 of them), and the few colors the app derives from
// them. Source: Modules/UIInfra/DesignTokens (ColorSet.swift, DefaultThemeColorSet.swift, PaletteColor.swift) at
// slack-objc main 14b3cbaf (2026-09-30). Every rule and value, with citations and the verification against Slack's
// snapshots and unit tests, is in reference/ios/specs/theme-colors.md (sections 2, 3 and 6).
//
// Resolution model (spec 3.2): a role written UIColor(light: P 70, dark: P 90) is the *light* hex of step 70 in light
// mode and the *dark* hex of step 90 in dark mode; withAlphaComponent replaces the alpha. A role's lightHighContrast /
// darkHighContrast slot replaces light / dark under Increase Contrast (UIColor+Dynamic.swift:32-69); roles without one
// keep their normal value (palette steps don't vary by contrast).

export const STANDARD_PALETTES = [
  'gray',
  'horchata',
  'tomato',
  'paprika',
  'tangerine',
  'campfire',
  'honeycomb',
  'sunflower',
  'grass',
  'cilantro',
  'mojito',
  'jade',
  'aquarium',
  'lagoon',
  'ocean',
  'indigo',
  'aubergine',
  'sangria',
  'flamingo',
  'rose',
] as const
export type StandardPalette = (typeof STANDARD_PALETTES)[number]

export const RAMPS = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const
export type Ramp = (typeof RAMPS)[number]

/** A palette: one of Slack's 20, or a custom hex (with the standard palette the app falls back to). */
export type PaletteRef = StandardPalette | { custom: string; fallback?: StandardPalette }

export interface ThemeInput {
  primary: PaletteRef
  highlight1: PaletteRef
  highlight2: PaletteRef
  important: PaletteRef
  /** 1–6 (ColorSet.defaultBrightness = 5). 4–6 is the "inverted" light theme (dark header). */
  brightness: number
  /** the user's window_background_gradients preference: header gradient g1 → g2, else solid g1 */
  gradientEnabled: boolean
}

/** A resolved color: a light and a dark value (hex, #rrggbb or #rrggbbaa). */
export interface Pair {
  light: string
  dark: string
}

// ------------------------------------------------------------------------------------------------ palettes

interface Palette {
  at: (r: Ramp) => Pair
  /** custom palettes only: the hex itself (literalColor) and its content color (literalContentColor) */
  literal?: Pair
  literalContent?: Pair
  /** rampForBackground (custom): light-ramp r, dark-ramp min(r, 10) */
  background?: Pair
}

const stripAlpha = (hex: string) => hex.slice(0, 7)

function standard(name: StandardPalette): Palette {
  return {
    at: (r) => {
      const t = colorTokens[`dt_color_palettes_${name}_${r}` as keyof typeof colorTokens]
      return { light: stripAlpha(t.light), dark: stripAlpha(t.dark) }
    },
  }
}

// PaletteColor.swift:571-619: MCU tonal palette sampled at fixed tones; dark mirrors light.
const LIGHT_TONE: Record<Ramp, number> = { 0: 97, 5: 91, 10: 85, 20: 78, 30: 69, 40: 57, 50: 45, 60: 38, 70: 28, 80: 19, 90: 11, 100: 4 }
const DARK_TONE: Record<Ramp, number> = { 0: 4, 5: 11, 10: 19, 20: 28, 30: 38, 40: 45, 50: 57, 60: 69, 70: 78, 80: 85, 90: 91, 100: 97 }
const argbHex = (argb: number) => '#' + (argb & 0xffffff).toString(16).padStart(6, '0')

export interface CustomPalette extends Palette {
  tone: number
  /** CustomPaletteColor.brightness(): the brightness a custom primary sets in the picker */
  brightness: number
  literal: Pair
  literalContent: Pair
  background: Pair
}

/** CustomPaletteColor (PaletteColor.swift:462-620). null when the hex doesn't parse (callers fall back). */
export function customPalette(input: string): CustomPalette | null {
  // Swift: Int(hex.dropFirst(), radix: 16), dropping the first character whatever it is.
  const body = input.slice(1)
  if (!/^[0-9a-fA-F]{1,6}$/.test(body)) return null
  const rgb = parseInt(body, 16)
  const hct = Hct.fromInt((0xff000000 | rgb) >>> 0)
  const tp = TonalPalette.fromHct(hct)
  const light = {} as Record<Ramp, string>
  const dark = {} as Record<Ramp, string>
  for (const r of RAMPS) {
    light[r] = argbHex(tp.tone(LIGHT_TONE[r]))
    dark[r] = argbHex(tp.tone(DARK_TONE[r]))
  }
  let closest: Ramp = 0
  for (const r of RAMPS) if (Math.abs(hct.tone - LIGHT_TONE[r]) < Math.abs(hct.tone - LIGHT_TONE[closest])) closest = r
  const bg: Ramp = closest === 40 ? 30 : closest === 50 ? 60 : closest
  const content = light[hct.tone > 65 ? 100 : 0]
  const lit = argbHex(rgb)
  const BRIGHTNESS: Record<Ramp, number> = { 0: 1, 5: 1, 10: 2, 20: 2, 30: 3, 40: 3, 50: 4, 60: 4, 70: 5, 80: 5, 90: 6, 100: 6 }
  return {
    tone: hct.tone,
    at: (r) => ({ light: light[r], dark: dark[r] }),
    background: { light: light[bg], dark: dark[Math.min(bg, 10) as Ramp] },
    literal: { light: lit, dark: lit },
    literalContent: { light: content, dark: content },
    brightness: BRIGHTNESS[closest],
  }
}

export function palette(ref: PaletteRef): Palette {
  if (typeof ref === 'string') return standard(ref)
  return customPalette(ref.custom) ?? standard(ref.fallback ?? 'aubergine')
}

const isCustom = (ref: PaletteRef) => typeof ref !== 'string' && !!customPalette(ref.custom)

// ------------------------------------------------------------------------------------------------ roles

export const THEME_ROLES = [
  'basePrimary',
  'baseSecondary',
  'baseInversePrimary',
  'baseInverseSecondary',
  'baseInverseSecondaryNonSidebar',
  'baseHighlight1',
  'baseInverseHighlight1',
  'contentHighlight1',
  'baseHighlight2',
  'baseInverseHighlight2',
  'baseImportant',
  'baseInverseImportant',
  'contentImportant',
  'contentInverseImportant',
  'surfacePrimary',
  'surfaceSecondary',
  'surfaceTertiary',
  'surfaceInversePrimary',
  'surfaceInverseSecondary',
  'surfaceInverseTertiary',
  'contentPrimary',
  'contentSecondary',
  'contentTertiary',
  'contentInversePrimary',
  'contentInverseSecondary',
  'contentInverseImportantSecondary',
  'contentInverseTertiary',
  'outlinePrimary',
  'outlineInversePrimary',
  'backgroundGradient1',
  'backgroundGradient2',
] as const
export type ThemeRole = (typeof THEME_ROLES)[number]

/** #rrggbb + alpha → #rrggbbaa (alpha replaced, like withAlphaComponent). */
export function withAlpha(hex: string, a: number): string {
  if (a >= 1) return hex.slice(0, 7)
  return hex.slice(0, 7) + Math.round(a * 255).toString(16).padStart(2, '0')
}
const alpha = (p: Pair, light: number, dark: number = light): Pair => ({ light: withAlpha(p.light, light), dark: withAlpha(p.dark, dark) })
/** UIColor(light: a, dark: b): a's light value, b's dark value */
const ld = (a: Pair, b: Pair): Pair => ({ light: a.light, dark: b.dark })

const WHITE = '#ffffff'

/** Every ThemeColorSet role for a theme (DefaultThemeColorSet.swift:76-225; the table in spec 3.4 and 3.5). */
export function computeTheme(t: ThemeInput): Record<ThemeRole, Pair> {
  const P = palette(t.primary)
  const H1 = palette(t.highlight1)
  const H2 = palette(t.highlight2)
  const I = palette(t.important)
  const inv = t.brightness >= 4 // ColorSet.isSidebarInverted (minBrightnessForDarkerSidebars = 4)
  const pick = (a: Pair, b: Pair) => (inv ? b : a)
  const lit = (ref: PaletteRef, p: Palette, standardPair: Pair) => (isCustom(ref) ? p.literal! : standardPair)
  const litContent = (ref: PaletteRef, p: Palette, standardPair: Pair) => (isCustom(ref) ? p.literalContent! : standardPair)
  const white: Pair = { light: WHITE, dark: WHITE }
  const gray0 = standard('gray').at(0)

  const r: Record<ThemeRole, Pair> = {
    basePrimary: ld(pick(P.at(70), P.at(0)), P.at(90)),
    baseSecondary: P.at(20),
    baseInversePrimary: ld(pick(P.at(0), P.at(100)), P.at(0)),
    baseInverseSecondary: ld(pick(P.at(0), P.at(80)), P.at(10)),
    baseInverseSecondaryNonSidebar: ld(P.at(80), P.at(70)),
    baseHighlight1: lit(t.highlight1, H1, ld(pick(H1.at(80), H1.at(0)), H1.at(30))),
    baseInverseHighlight1: lit(t.highlight1, H1, ld(H1.at(80), H1.at(30))),
    contentHighlight1: litContent(t.highlight1, H1, ld(pick(H1.at(0), H1.at(100)), H1.at(100))),
    baseHighlight2: lit(t.highlight2, H2, ld(pick(H2.at(50), H2.at(20)), H2.at(60))),
    baseInverseHighlight2: lit(t.highlight2, H2, ld(H2.at(50), H2.at(60))),
    baseImportant: lit(t.important, I, ld(pick(I.at(70), I.at(20)), I.at(70))),
    baseInverseImportant: lit(t.important, I, ld(I.at(70), I.at(40))),
    contentImportant: litContent(t.important, I, ld(pick(I.at(0), I.at(100)), I.at(0))),
    contentInverseImportant: litContent(t.important, I, ld(I.at(0), I.at(100))),
    surfacePrimary: { light: withAlpha(pick(P.at(0), P.at(100)).light, inv ? 0.13 : 0.25), dark: withAlpha(P.at(100).dark, 0.25) },
    surfaceSecondary: { light: withAlpha(P.at(80).light, 0.05), dark: withAlpha(P.at(30).dark, 0.3) },
    surfaceTertiary: { light: withAlpha(WHITE, 0.95), dark: withAlpha(P.at(0).dark, 0.7) },
    surfaceInversePrimary: { light: withAlpha(pick(P.at(100), P.at(0)).light, inv ? 0.25 : 0.13), dark: withAlpha(P.at(100).dark, 0.25) },
    surfaceInverseSecondary: { light: inv ? withAlpha(P.at(0).light, 0.11) : withAlpha(WHITE, 0.9), dark: withAlpha(gray0.dark, 0.6) },
    surfaceInverseTertiary: { light: withAlpha(pick(P.at(80), P.at(0)).light, inv ? 0.08 : 0.13), dark: withAlpha(P.at(100).dark, 0.08) },
    contentPrimary: P.at(100),
    contentSecondary: { light: withAlpha(P.at(100).light, 0.8), dark: withAlpha(P.at(90).dark, 0.9) },
    contentTertiary: ld(pick(P.at(0), P.at(100)), P.at(0)),
    contentInversePrimary: inv ? white : { light: P.at(100).light, dark: WHITE },
    contentInverseSecondary: { light: inv ? withAlpha(P.at(0).light, 0.8) : withAlpha(P.at(100).light, 0.7), dark: withAlpha(P.at(90).dark, 0.9) },
    contentInverseImportantSecondary: ld(I.at(80), I.at(70)),
    contentInverseTertiary: { light: inv ? withAlpha(P.at(0).light, 0.7) : withAlpha(P.at(100).light, 0.5), dark: withAlpha(P.at(90).dark, 0.7) },
    // New in September 2026 (DefaultThemeColorSet.swift:179-183): Home's unread synthetic-tile border.
    outlinePrimary: { light: withAlpha(P.at(100).light, 0.13), dark: withAlpha(P.at(100).dark, 0.25) },
    outlineInversePrimary: { light: inv ? withAlpha(P.at(0).light, 0.22) : withAlpha(P.at(80).light, 0.13), dark: withAlpha(P.at(100).dark, 0.22) },
    backgroundGradient1: gradient(t.primary, P, t.brightness, inv, 1),
    backgroundGradient2: gradient(t.highlight1, H1, t.brightness, inv, 2),
  }
  // contentInverseImportantSecondary always uses the ramps, even for a custom important (DefaultThemeColorSet.swift:173).
  return r
}

/** backgroundGradient1 (primary) / backgroundGradient2 (highlight1), DefaultThemeColorSet.swift:193-225 (spec 3.5). */
function gradient(ref: PaletteRef, p: Palette, b: number, inv: boolean, which: 1 | 2): Pair {
  if (isCustom(ref)) return p.background!
  if (which === 1) {
    const light: Ramp = b === 1 ? 0 : b === 2 ? 5 : b === 3 ? 10 : b === 4 ? 70 : b === 5 ? 80 : inv ? 90 : 80
    return ld(p.at(light), p.at(10))
  }
  const light: Ramp = b === 1 ? 10 : b === 2 ? 20 : b === 3 ? 30 : b === 4 ? 80 : b === 5 ? 90 : 100
  return ld(p.at(light), p.at(0))
}

// ------------------------------------------------------------------------------------------------ derived

/** Colors the app derives from the theme outside ThemeColorSet (spec 3.8), keyed by the CSS name they get. */
export function derivedColors(roles: Record<ThemeRole, Pair>): Record<string, Pair> {
  const surfaceSecondaryCore = colorTokens.dt_color_surface_secondary
  return {
    // ThemeService+ArbitraryConstants.swift:12-16: surfaceInversePrimary with alpha 0.25 × 0.75
    searchBarBackground: alpha(roles.surfaceInversePrimary, 0.1875),
    // CompactRootTabBarController.swift:1189-1194 (drawn behind the selected Search tab icon before iOS 27, :275-284)
    searchTabSelectedBackground: { light: withAlpha(surfaceSecondaryCore.light, 0.065), dark: withAlpha(surfaceSecondaryCore.dark, 0.125) },
    // ThemeServiceInterface.swift:28-32 (active; away is core contentTertiary)
    presenceActiveInverted: roles.baseHighlight2,
    // ListThemeOptions.ia4Phone presence (ListThemeOptions.swift:84-86): active baseInverseHighlight2
    presenceActive: roles.baseInverseHighlight2,
    // SyntheticViewTileColors.swift:13-31, 62-99 (unread Home tiles; September 2026: the border is the new
    // theme.outlinePrimary role, and the fills are plain translucent colors, no longer passed through blend(…, 1.0))
    tileUnreadBackground: { light: withAlpha(roles.surfaceSecondary.light, 0.065), dark: withAlpha(surfaceSecondaryCore.dark, 0.125) },
    tileUnreadBackgroundPressed: { light: withAlpha(roles.surfaceSecondary.light, 0.13), dark: surfaceSecondaryCore.dark },
    tileUnreadBorder: roles.outlinePrimary,
    tileUnreadContent: { light: roles.contentPrimary.light, dark: colorTokens.dt_color_content_primary.dark },
    // ColorSetFABConfigurator.swift:24-65: icon, backdrop (blend 10 %), pressed backdrop
    fabIcon: { light: roles.contentInversePrimary.light, dark: roles.contentInverseSecondary.dark },
    fabBackground: { light: blend(roles.baseInversePrimary.light, roles.contentInversePrimary.light, 0.1), dark: blend(roles.baseInverseSecondary.dark, roles.contentInverseSecondary.dark, 0.1) },
  }
}

// ------------------------------------------------------------------------------------------------ high contrast

/** The high-contrast slots of a color: only the ones iOS sets; a missing slot keeps the normal light / dark value. */
export interface ContrastPair {
  light?: string
  dark?: string
}

/**
 * The lightHighContrast / darkHighContrast slots DefaultThemeColorSet gives 9 roles (September 2026,
 * DefaultThemeColorSet.swift:83-187; spec 3.4). They apply when Increase Contrast is on (ColorModeManager /
 * LoggedInViewController set accessibilityContrast .high on the window). A custom important keeps its literal hex.
 */
export function computeThemeHighContrast(t: ThemeInput): Partial<Record<ThemeRole, ContrastPair>> {
  const P = palette(t.primary)
  const I = palette(t.important)
  const gray0 = standard('gray').at(0)
  const hc: Partial<Record<ThemeRole, ContrastPair>> = {
    baseInverseSecondary: { dark: P.at(5).dark }, // :83-86
    surfaceSecondary: { dark: withAlpha(P.at(30).dark, 0.05) }, // :140-143
    surfaceInverseSecondary: { dark: withAlpha(gray0.dark, 0.8) }, // :150-153
    contentSecondary: { dark: P.at(100).dark }, // :159-162
    contentInverseSecondary: { dark: P.at(100).dark }, // :169-172
    contentInverseTertiary: { dark: withAlpha(P.at(90).dark, 0.8) }, // :174-177
    outlinePrimary: { light: withAlpha(P.at(100).light, 0.25), dark: withAlpha(P.at(100).dark, 0.35) }, // :179-183
    outlineInversePrimary: { dark: withAlpha(P.at(100).dark, 0.5) }, // :184-187
  }
  if (!isCustom(t.important)) hc.baseImportant = { dark: I.at(80).dark } // :121-124 (the .standard case only)
  return hc
}

/**
 * High-contrast and true-dark slots of the derived colors (spec 3.8): the unread tile fill steps up to 0.22 in high
 * contrast and true dark (SyntheticViewTileColors.swift:65-73); the colors that pass a dynamic role or core token
 * through (tile border and content, pressed fill, FAB icon) follow it. The FAB backdrop and the search colors resolve
 * plain light / dark (blendPreservingTraits, resolved(.light/.dark)) and don't change.
 */
export function derivedVariants(roles: Record<ThemeRole, Pair>, hc: Partial<Record<ThemeRole, ContrastPair>>): { highContrast: Record<string, ContrastPair>; trueDark: Record<string, string> } {
  const surfaceSecondaryCore = colorTokens.dt_color_surface_secondary
  const tileFillHC = withAlpha(surfaceSecondaryCore.dark, 0.22)
  const highContrast: Record<string, ContrastPair> = {
    tileUnreadBackground: { dark: tileFillHC },
    tileUnreadBackgroundPressed: { dark: surfaceSecondaryCore.darkHighContrast ?? surfaceSecondaryCore.dark },
    tileUnreadBorder: { ...hc.outlinePrimary },
    tileUnreadContent: { dark: colorTokens.dt_color_content_primary.darkHighContrast ?? colorTokens.dt_color_content_primary.dark },
  }
  if (hc.contentInverseSecondary?.dark) highContrast.fabIcon = { dark: hc.contentInverseSecondary.dark }
  // keep only the slots that differ from the normal value
  const base = derivedColors(roles)
  for (const [k, v] of Object.entries(highContrast)) {
    if (v.light === base[k]?.light) delete v.light
    if (v.dark === base[k]?.dark) delete v.dark
    if (!v.light && !v.dark) delete highContrast[k]
  }
  return { highContrast, trueDark: { tileUnreadBackground: tileFillHC } }
}

/** UIColor.blend (UIColor+Extensions.swift:24-51, Data/Color): r, g, b and alpha mixed linearly, `amount` of `b`. */
export function blend(a: string, b: string, amount: number): string {
  const ch = (h: string) => {
    const s = h.replace('#', '')
    const v = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
    return [...v, s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255]
  }
  const x = ch(a)
  const y = ch(b)
  const m = x.map((v, i) => Math.round(v + (y[i] - v) * amount))
  return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('') + (m[3] < 255 ? m[3].toString(16).padStart(2, '0') : '')
}
