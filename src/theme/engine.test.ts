import { describe, expect, it } from 'vitest'
import { blend, computeTheme, computeThemeHighContrast, customPalette, derivedColors, derivedVariants } from './engine'
import { themeCss } from './ThemeStyle'
import { PRESETS, DEFAULT_THEME, FALLBACK_THEME, themeById } from './presets'

// Vectors from reference/ios/specs/theme-colors.md: Slack's own unit tests (PaletteColorTests, ColorSetTests), the
// Aubergine preset table (3.7, byte-identical to a runtime probe of the compiled Swift) and the header snapshots (3.5).
// Updated to slack-objc main 14b3cbaf (2026-09-30) and design tokens f76ac0a: the outlinePrimary role, the roles'
// high-contrast slots and the September tile colors are new; no June expectation changed.

describe('custom palettes (PaletteColor.swift, PaletteColorTests.swift)', () => {
  it('samples #0547AB like Slack', () => {
    const p = customPalette('#0547AB')!
    expect(Math.trunc(p.tone)).toBe(32)
    expect(p.at(90)).toEqual({ light: '#001a4b', dark: '#dee5ff' })
  })
  it('picks the background ramp for #74807B', () => {
    // tone 52.5 → closest 40 → background 30
    const p = customPalette('#74807B')!
    expect(p.background.light).toBe(p.at(30).light)
  })
  it('rejects what Swift would', () => {
    expect(customPalette('#xyz')).toBeNull()
  })
})

describe('ColorSetTests', () => {
  it('pins the standard roles (tangerine / campfire / mojito / lagoon, b5)', () => {
    const r = computeTheme({ primary: 'tangerine', highlight1: 'campfire', highlight2: 'mojito', important: 'lagoon', brightness: 5, gradientEnabled: true })
    expect(r.basePrimary).toEqual({ light: '#ffede5', dark: '#f0d0c1' }) // tangerine 0 light, tangerine 90 dark
  })
  it('custom primary #FFC908 b2 → backgroundGradient1', () => {
    const r = computeTheme({ primary: { custom: '#FFC908' }, highlight1: 'aubergine', highlight2: 'jade', important: 'aubergine', brightness: 2, gradientEnabled: true })
    expect(r.backgroundGradient1).toEqual({ light: '#ffce40', dark: '#3b2c00' })
  })
  it('custom primary #2E3440 b2 → backgroundGradient1', () => {
    const r = computeTheme({ primary: { custom: '#2E3440' }, highlight1: 'aubergine', highlight2: 'jade', important: 'aubergine', brightness: 2, gradientEnabled: true })
    expect(r.backgroundGradient1).toEqual({ light: '#282e3a', dark: '#282e3a' })
  })
  it('literal custom highlight and important colors', () => {
    const r = computeTheme({ primary: 'aubergine', highlight1: { custom: '#EB2639' }, highlight2: 'jade', important: { custom: '#00FF37' }, brightness: 5, gradientEnabled: true })
    expect(r.baseHighlight1.light).toBe('#eb2639')
    expect(r.contentHighlight1.light).toBe('#fff4f3')
    expect(r.contentImportant.light).toBe('#001201')
  })
})

describe('the Aubergine preset (spec 3.7)', () => {
  const aubergine = PRESETS.find((p) => p.id === 'aubergine')!
  const r = computeTheme(aubergine.theme)
  const table: Record<string, [string, string]> = {
    basePrimary: ['#f9edff', '#e3ceeb'],
    baseSecondary: ['#eabdfb', '#5f2565'],
    baseInversePrimary: ['#39063a', '#200221'],
    baseInverseSecondary: ['#611f69', '#431349'],
    baseInverseSecondaryNonSidebar: ['#611f69', '#cfa1de'],
    baseHighlight1: ['#f9edff', '#7d3986'],
    baseInverseHighlight1: ['#611f69', '#7d3986'],
    contentHighlight1: ['#39063a', '#efe1f5'],
    baseHighlight2: ['#74dbaf', '#3daa7c'],
    baseInverseHighlight2: ['#20a271', '#3daa7c'],
    baseImportant: ['#eabdfb', '#cfa1de'],
    baseInverseImportant: ['#83388a', '#9652a2'],
    contentImportant: ['#39063a', '#200221'],
    contentInverseImportant: ['#f9edff', '#efe1f5'],
    surfacePrimary: ['#39063a21', '#efe1f540'],
    surfaceSecondary: ['#611f690d', '#7d39864d'],
    surfaceTertiary: ['#fffffff2', '#200221b3'],
    surfaceInversePrimary: ['#f9edff40', '#efe1f540'],
    surfaceInverseSecondary: ['#f9edff1c', '#10121499'],
    surfaceInverseTertiary: ['#f9edff14', '#efe1f514'],
    contentPrimary: ['#39063a', '#efe1f5'],
    contentSecondary: ['#39063acc', '#e3ceebe6'],
    contentTertiary: ['#39063a', '#200221'],
    contentInversePrimary: ['#ffffff', '#ffffff'],
    contentInverseSecondary: ['#f9edffcc', '#e3ceebe6'],
    contentInverseImportantSecondary: ['#611f69', '#cfa1de'],
    contentInverseTertiary: ['#f9edffb3', '#e3ceebb3'],
    outlinePrimary: ['#39063a21', '#efe1f540'], // new role, DefaultThemeColorSet.swift:179-183
    outlineInversePrimary: ['#f9edff38', '#efe1f538'],
    backgroundGradient1: ['#4a154b', '#431349'],
    backgroundGradient2: ['#39063a', '#200221'],
  }
  for (const [role, [light, dark]] of Object.entries(table)) {
    it(role, () => expect(r[role as keyof typeof r]).toEqual({ light, dark }))
  }
  it('searchBarBackground', () => expect(derivedColors(r).searchBarBackground).toEqual({ light: '#f9edff30', dark: '#efe1f530' }))
})

describe('defaultAubergine (the fallback every snapshot uses)', () => {
  const r = computeTheme(FALLBACK_THEME)
  it('differs from the preset in four rows', () => {
    expect(r.baseHighlight2).toEqual({ light: '#eabdfb', dark: '#bc80ce' })
    expect(r.baseInverseHighlight2).toEqual({ light: '#c474d3', dark: '#bc80ce' })
    expect(r.backgroundGradient1).toEqual({ light: '#611f69', dark: '#431349' })
    expect(r.backgroundGradient2).toEqual({ light: '#4a154b', dark: '#200221' })
  })
})

describe("the clone's default theme (production, from device screenshots)", () => {
  // Real-device screenshots (dark, P3 → sRGB): presence #3daa7c = jade 60 and a radial #431349 → #200221 header.
  const preset = PRESETS.find((p) => p.id === 'aubergine')!.theme
  it('is the Aubergine preset (aubergine / aubergine / jade / aubergine, b6) with gradients on', () => {
    expect(DEFAULT_THEME).toEqual({ ...preset, gradientEnabled: true })
    const r = computeTheme(DEFAULT_THEME)
    expect(r.baseInverseHighlight2.dark).toBe('#3daa7c')
    expect([r.backgroundGradient1.dark, r.backgroundGradient2.dark]).toEqual(['#431349', '#200221'])
  })
  it('keeps ColorSet.defaultAubergine reachable as ?theme=fallback', () => {
    expect(themeById('fallback').input).toBe(FALLBACK_THEME)
    expect(themeById('nope')).toEqual({ id: 'default', input: DEFAULT_THEME })
    expect(computeTheme(FALLBACK_THEME).baseInverseHighlight2.dark).toBe('#bc80ce') // purple presence: not production
  })
})

describe('high contrast (DefaultThemeColorSet.swift:83-187, September 2026)', () => {
  // Cross-check: design tokens f76ac0a ship web theme_* defaults whose high-contrast values equal these
  // (theme_base_inverse_secondary #300c31, theme_surface_secondary #7d39860d, theme_outline_primary #39063a40 / #efe1f559…).
  const hc = computeThemeHighContrast(FALLBACK_THEME)
  it('sets the slots iOS sets, and only those (the same for the Aubergine preset)', () => {
    expect(computeThemeHighContrast(DEFAULT_THEME)).toEqual(hc)
    expect(hc).toEqual({
      baseInverseSecondary: { dark: '#300c31' }, // P 5
      baseImportant: { dark: '#d8bae1' }, // I 80 (standard important only)
      surfaceSecondary: { dark: '#7d39860d' }, // P 30 @ 0.05
      surfaceInverseSecondary: { dark: '#101214cc' }, // gray 0 @ 0.8
      contentSecondary: { dark: '#efe1f5' }, // P 100
      contentInverseSecondary: { dark: '#efe1f5' }, // P 100
      contentInverseTertiary: { dark: '#e3ceebcc' }, // P 90 @ 0.8
      outlinePrimary: { light: '#39063a40', dark: '#efe1f559' }, // P 100 @ 0.25 / 0.35
      outlineInversePrimary: { dark: '#efe1f580' }, // P 100 @ 0.5
    })
  })
  it('keeps a custom important literal (no high-contrast slot)', () => {
    const t = PRESETS.find((p) => p.id === 'tritanopia')!.theme
    expect(computeThemeHighContrast(t).baseImportant).toBeUndefined()
  })
  it('derived colors follow: tile fill 0.22 in high contrast and true dark (SyntheticViewTileColors.swift:65-73)', () => {
    const r = computeTheme(FALLBACK_THEME)
    expect(derivedVariants(r, hc)).toEqual({
      highContrast: {
        tileUnreadBackground: { dark: '#f8f8f838' },
        tileUnreadBackgroundPressed: { dark: '#f8f8f866' }, // core surface_secondary darkHighContrast
        tileUnreadBorder: { light: '#39063a40', dark: '#efe1f559' }, // = outlinePrimary
        tileUnreadContent: { dark: '#ffffff' }, // core content_primary darkHighContrast
        fabIcon: { dark: '#efe1f5' }, // contentInverseSecondary
      },
      trueDark: { tileUnreadBackground: '#f8f8f838' },
    })
  })
  it('emits the slots under [data-contrast=high] and [data-dark-variant=true-dark]', () => {
    const css = themeCss(FALLBACK_THEME)
    expect(css).toContain(".ios-screen[data-appearance='dark'][data-contrast='high'] {\n  --theme_baseInverseSecondary: #300c31;")
    expect(css).toMatch(/\[data-appearance='light'\]\[data-contrast='high'\] \{\n  --theme_outlinePrimary: #39063a40;\n  --theme_tileUnreadBorder: #39063a40;\n\}/)
    expect(css).toContain(".ios-screen[data-appearance='dark'][data-dark-variant='true-dark'] {\n  --theme_tileUnreadBackground: #f8f8f838;\n}")
  })
})

describe('synthetic tiles (SyntheticViewTileColors.swift, September 2026)', () => {
  // testNewThemeUnreadCell (lagoon ×3 + flamingo, b5), re-recorded in September: fill #eff3f6, border #d2dadf
  // (June #d1dfe6), title #0d2e45. A CALayer border is drawn over the layer's own translucent fill.
  const r = computeTheme({ primary: 'lagoon', highlight1: 'lagoon', highlight2: 'lagoon', important: 'flamingo', brightness: 5, gradientEnabled: true })
  const d = derivedColors(r)
  const over = (fg: string, bg: string) => blend(bg, fg.slice(0, 7), parseInt(fg.slice(7, 9), 16) / 255)
  const near = (a: string, b: string) => [1, 3, 5].every((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 1)
  it('unread border is theme.outlinePrimary (P 100 @ 0.13), not surfaceSecondary @ 0.13', () => {
    expect(d.tileUnreadBorder).toEqual(r.outlinePrimary)
    expect(d.tileUnreadBorder.light).toBe('#0d2e4521')
  })
  it('matches the snapshot pixels', () => {
    const fill = over(d.tileUnreadBackground.light, '#ffffff')
    expect(near(fill, '#eff3f6')).toBe(true)
    expect(near(over(d.tileUnreadBorder.light, fill), '#d2dadf')).toBe(true)
    expect(d.tileUnreadContent.light).toBe('#0d2e45')
  })
})

describe('design tokens f76ac0a', () => {
  it('flamingo 40 dark is #d3305d (was #c02b54 in df1f228): baseInverseImportant dark of flamingo themes', () => {
    expect(computeTheme(PRESETS.find((p) => p.id === 'barbra')!.theme).baseInverseImportant).toEqual({ light: '#c01343', dark: '#d3305d' })
  })
})

describe('header gradients (CompactRootTabSearchHeader snapshots, spec 3.5)', () => {
  const measured: [number, string, string][] = [
    [1, '#f9edff', '#9ed6fa'],
    [2, '#f6e4ff', '#73bdf3'],
    [3, '#f4daff', '#54a9ea'],
    [4, '#83388a', '#0b4c8c'],
    [5, '#611f69', '#093a73'],
    [6, '#4a154b', '#122a59'],
  ]
  for (const [b, g1, g2] of measured) {
    it(`brightness ${b}`, () => {
      const r = computeTheme({ primary: 'aubergine', highlight1: 'ocean', highlight2: 'jade', important: 'flamingo', brightness: b, gradientEnabled: true })
      expect([r.backgroundGradient1.light, r.backgroundGradient2.light]).toEqual([g1, g2])
    })
  }
})

describe('presets (spec 7.3)', () => {
  it('has all 28, with the gradients the spec lists', () => {
    expect(PRESETS).toHaveLength(28)
    const g = (id: string) => {
      const r = computeTheme(PRESETS.find((p) => p.id === id)!.theme)
      return [r.backgroundGradient1.light, r.backgroundGradient1.dark, r.backgroundGradient2.light, r.backgroundGradient2.dark]
    }
    expect(g('clementine')).toEqual(['#c84600', '#7a2500', '#ac3d00', '#381000'])
    expect(g('hoth')).toEqual(['#f8f8f8', '#212428', '#9fe8fd', '#001a2d'])
    expect(g('tritanopia')).toEqual(['#0e0e0e', '#2e2e2e', '#f6f6f6', '#0c0f0f'])
    expect(g('protanopia-deuteranopia')).toEqual(['#200025', '#491b4d', '#fdf3ff', '#110c18'])
  })
})
