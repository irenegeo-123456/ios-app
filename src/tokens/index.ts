import { colorTokens, type ColorToken } from './generated/colors'

// iOS design tokens for kit code. Colors are the only tokens iOS has (slack/design-tokens output/ios has Colors.swift and
// Presets.swift, nothing for spacing, radius or type): sizes come from each component's Constants in the iOS source,
// and type from SKFont (src/tokens/type.ts).
//
//   color('dt_color_content_primary')  → 'var(--dt_color_content_primary)', follows light/dark
//   colorValue('dt_color_content_primary', 'dark') → '#e8e8e8' (canvas, tests)

export type { ColorToken }
export { colorTokens }

export const color = (name: ColorToken) => `var(--${name})`

export function colorValue(name: ColorToken, appearance: 'light' | 'dark' = 'light'): string {
  return colorTokens[name][appearance]
}

export const isColorToken = (s: string): s is ColorToken => s in colorTokens
