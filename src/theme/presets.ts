import type { PaletteRef, StandardPalette, ThemeInput } from './engine'

// Slack iOS's theme presets, in the picker's order (the app's own Presets.swift:38-78, which differs from the
// design-tokens copy: the two vision-assistive presets use custom hex colors). Spec: theme-colors.md 7.3.
// `monochromatic` presets turn the header gradient off (gradientEnabled = !monochromatic, ThemePickerInteractor.swift:140-147).

export interface ThemePreset {
  id: string
  name: string
  section: 'Single color' | 'Vision assistive' | 'Fun and new' | 'Updated classics'
  theme: ThemeInput
  monochromatic: boolean
}

const p = (
  id: string,
  name: string,
  section: ThemePreset['section'],
  [primary, highlight1, highlight2, important]: [PaletteRef, PaletteRef, PaletteRef, PaletteRef],
  brightness: number,
  monochromatic: boolean,
): ThemePreset => ({ id, name, section, monochromatic, theme: { primary, highlight1, highlight2, important, brightness, gradientEnabled: !monochromatic } })

const c = (custom: string, fallback: StandardPalette): PaletteRef => ({ custom, fallback })

export const PRESETS: ThemePreset[] = [
  p('aubergine', 'Aubergine', 'Single color', ['aubergine', 'aubergine', 'jade', 'aubergine'], 6, true),
  p('clementine', 'Clementine', 'Single color', ['tangerine', 'tangerine', 'jade', 'tangerine'], 4, true),
  p('banana', 'Banana', 'Single color', ['sunflower', 'sunflower', 'jade', 'sunflower'], 2, true),
  p('jade', 'Jade', 'Single color', ['jade', 'jade', 'jade', 'jade'], 4, true),
  p('lagoon', 'Lagoon', 'Single color', ['lagoon', 'lagoon', 'jade', 'lagoon'], 5, true),
  p('barbra', 'Barbra', 'Single color', ['flamingo', 'flamingo', 'jade', 'flamingo'], 3, true),
  p('gray', 'Gray', 'Single color', ['gray', 'gray', 'jade', 'flamingo'], 2, true),
  p('mood-indigo', 'Mood Indigo', 'Single color', ['indigo', 'indigo', 'jade', 'indigo'], 6, true),
  p('tritanopia', 'Tritanopia', 'Vision assistive', [c('#000000', 'aubergine'), c('#F8F8F8', 'jade'), c('#20A271', 'jade'), c('#EF3E75', 'paprika')], 6, false),
  p('protanopia-deuteranopia', 'Protanopia & Deuteranopia', 'Vision assistive', [c('#2D0033', 'aubergine'), c('#F9EDFF', 'grass'), c('#20A271', 'grass'), c('#EABDFB', 'aubergine')], 6, false),
  p('raspberry-beret', 'Raspberry Beret', 'Fun and new', ['aubergine', 'flamingo', 'aubergine', 'flamingo'], 3, false),
  p('big-business', 'Big Business', 'Fun and new', ['gray', 'indigo', 'indigo', 'indigo'], 4, false),
  p('pog', 'POG', 'Fun and new', ['sangria', 'honeycomb', 'sunflower', 'sunflower'], 3, false),
  p('mint-chip', 'Mint Chip', 'Fun and new', ['cilantro', 'indigo', 'indigo', 'horchata'], 3, false),
  p('pbj', 'PB&J', 'Fun and new', ['horchata', 'sangria', 'sangria', 'flamingo'], 3, false),
  p('chill-vibes', 'Chill Vibes', 'Fun and new', ['jade', 'aquarium', 'jade', 'aquarium'], 4, false),
  p('forest-floor', 'Forest Floor', 'Fun and new', ['grass', 'horchata', 'sunflower', 'sunflower'], 4, false),
  p('slackr', 'Slackr', 'Fun and new', ['flamingo', 'lagoon', 'mojito', 'flamingo'], 3, false),
  p('sea-glass', 'Sea Glass', 'Fun and new', ['aquarium', 'aubergine', 'aquarium', 'aubergine'], 3, false),
  p('lemon-lime', 'Lemon Lime', 'Fun and new', ['sunflower', 'cilantro', 'aubergine', 'cilantro'], 4, false),
  p('falling-leaves', 'Falling Leaves', 'Fun and new', ['horchata', 'sunflower', 'tangerine', 'tomato'], 4, false),
  p('sunrise', 'Sunrise', 'Fun and new', ['tangerine', 'flamingo', 'campfire', 'honeycomb'], 2, false),
  p('choco-mint', 'Choco Mint', 'Updated classics', ['horchata', 'jade', 'gray', 'jade'], 5, false),
  p('cmyk', 'CMYK', 'Updated classics', ['lagoon', 'flamingo', 'sunflower', 'lagoon'], 3, false),
  p('haberdashery', 'Haberdashery', 'Updated classics', ['lagoon', 'sunflower', 'cilantro', 'rose'], 6, false),
  p('hoth', 'Hoth', 'Updated classics', ['gray', 'lagoon', 'cilantro', 'rose'], 1, false),
  p('ochin', 'Ochin', 'Updated classics', ['ocean', 'ocean', 'cilantro', 'mojito'], 5, false),
  p('sweet-treat', 'Sweet Treat', 'Updated classics', ['tomato', 'tomato', 'horchata', 'jade'], 2, false),
]

/**
 * ColorSet.defaultAubergine (ColorSet.swift:19-25): aubergine ×4 at brightness 5, the theme iOS falls back to when the
 * user's ia_theme is missing or invalid (ThemeService.swift:93-117), and the one every Slack snapshot renders with
 * (MockThemeService.swift:14-21, gradient on). Not what production users see (DEFAULT_THEME). `?theme=fallback`.
 */
export const FALLBACK_THEME: ThemeInput = { primary: 'aubergine', highlight1: 'aubergine', highlight2: 'aubergine', important: 'aubergine', brightness: 5, gradientEnabled: true }

/**
 * The clone's default: what a signed-in user sees in production. iOS ships no default ia_theme (it reads the user's
 * server preference and only falls back to defaultAubergine when it's missing: theme-colors.md 6.1, 12), so this comes
 * from real-device screenshots (reference/device, dark, Display P3 converted to sRGB): presence dots are #3daa7c (jade 60,
 * baseInverseHighlight2 with highlight2 = jade, not defaultAubergine's aubergine #bc80ce) and the header runs radially
 * #431349 → #200221 (g1 → g2, so window gradients are on). That is the Aubergine preset's ColorSet (Presets.swift:40:
 * aubergine / aubergine / jade / aubergine, brightness 6, also the web client's default payload) with gradients on.
 * Brightness 6 vs 5 only shows in light mode (no light device screenshot): the preset's 6.
 */
export const DEFAULT_THEME: ThemeInput = { primary: 'aubergine', highlight1: 'aubergine', highlight2: 'jade', important: 'aubergine', brightness: 6, gradientEnabled: true }

export const presetById = (id: string | null | undefined) => PRESETS.find((x) => x.id === id)

/** A theme id: a preset id, 'default' (DEFAULT_THEME) or 'fallback' (ColorSet.defaultAubergine). Unknown → default. */
export function themeById(id: string | null | undefined): { id: string; input: ThemeInput } {
  if (id === 'fallback') return { id, input: FALLBACK_THEME }
  const preset = presetById(id)
  return preset ? { id: preset.id, input: preset.theme } : { id: 'default', input: DEFAULT_THEME }
}
