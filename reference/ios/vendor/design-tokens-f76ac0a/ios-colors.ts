import { writeFileSync } from 'fs'

import { snakeCase } from 'lodash'
import { createSpinner } from 'nanospinner'

import darkHighContrast from '../output/web/dark-high-contrast.json'
import dark from '../output/web/dark.json'
import global from '../output/web/global.json'
import lightHighContrast from '../output/web/light-high-contrast.json'

type ColorToken = (typeof global)[number]

const isColorToken = (token: ColorToken) =>
  token.$type === 'color' &&
  !token.path.some((p) => p.includes('hover') || p.includes('pressed'))

const globalColors = global.filter(isColorToken)
const darkColors = dark.filter(isColorToken)
const lightHighContrastColors = lightHighContrast.filter(isColorToken)
const darkHighContrastColors = darkHighContrast.filter(isColorToken)

// 8-digit hex values already include an alpha channel; only append ff (100% opacity) for 6-digit hex
function toHex8(value: string): string {
  const hex = value.replace('#', '').toLowerCase()
  return hex.length === 6 ? hex + 'ff' : hex
}

function findTokenValue(tokens: ColorToken[], path: string[]): string | null {
  const key = snakeCase(path.join('_'))
  const token = tokens.find((t) => snakeCase(t.path.join('_')) === key)
  return token ? toHex8(token.$value.toString()) : null
}

interface DarkModeOverrides {
  trueDark: string | null
  elevatedDark: string | null
}

const darkModeOverrides: Record<string, DarkModeOverrides> = {
  color_base_primary: {
    trueDark: findTokenValue(globalColors, ['color', 'constants', 'black']),
    elevatedDark: findTokenValue(globalColors, [
      'color',
      'brand',
      'core',
      'black',
    ]),
  },
}

function buildColorExpression(
  name: string,
  lightHexa: string,
  darkHexa: string | null,
  lightHighContrastHexa: string,
  darkHighContrastHexa: string
): string {
  if (!darkHexa) {
    // Single-mode colors (palettes, brand constants) don't vary by contrast.
    return `    static let dt_${name} = UIColor(hex8: 0x${lightHexa})\n`
  }

  const overrides = darkModeOverrides[name]
  const params = [
    `        light: UIColor(hex8: 0x${lightHexa})`,
    `        dark: UIColor(hex8: 0x${darkHexa})`,
    `        lightHighContrast: UIColor(hex8: 0x${lightHighContrastHexa})`,
    `        darkHighContrast: UIColor(hex8: 0x${darkHighContrastHexa})`,
    ...(overrides?.trueDark
      ? [`        trueDark: UIColor(hex8: 0x${overrides.trueDark})`]
      : []),
    ...(overrides?.elevatedDark
      ? [`        elevatedDark: UIColor(hex8: 0x${overrides.elevatedDark})`]
      : []),
  ]

  return `    static let dt_${name} = UIColor(\n${params.join(',\n')}\n    )\n`
}

async function extractAndWriteData() {
  const contents = `/*
  Auto-generated file — do not edit directly
  For more info: https://slack-github.com/slack/design-tokens

  Do not use these values directly! Use the structs in the DesignTokensLibrary instead, such as ColorSet, CoreColorSet, ThemeColorSet, and PaletteColor.
  If you need the user-defined theme streamed to you, use ThemeIntegrationService.
*/

import Color
import UIKit

internal extension UIColor {
${globalColors
  .map((color) => {
    const name = snakeCase(color.path.join('_'))
    const lightHexa = toHex8(color.$value.toString())
    const darkToken = darkColors.find(
      (c) => snakeCase(c.path.join('_')) === name
    )
    const darkHexa = darkToken ? toHex8(darkToken.$value.toString()) : null

    // High-contrast counterparts. HC files are complete replacements, so a
    // match should always exist; fall back to the base hex defensively, which
    // also satisfies "reuse base where HC doesn't override".
    const lightHighContrastToken = lightHighContrastColors.find(
      (c) => snakeCase(c.path.join('_')) === name
    )
    const lightHighContrastHexa = lightHighContrastToken
      ? toHex8(lightHighContrastToken.$value.toString())
      : lightHexa
    const darkHighContrastToken = darkHighContrastColors.find(
      (c) => snakeCase(c.path.join('_')) === name
    )
    const darkHighContrastHexa = darkHighContrastToken
      ? toHex8(darkHighContrastToken.$value.toString())
      : (darkHexa ?? lightHexa)

    return buildColorExpression(
      name,
      lightHexa,
      darkHexa,
      lightHighContrastHexa,
      darkHighContrastHexa
    )
  })
  .join('')}}`

  writeFileSync('./output/ios/Colors.swift', contents, 'utf8')
}

// eslint-disable-next-line
;(async () => {
  // Let's kick things off!
  const spinner = createSpinner('Generating iOS color sets...').start()

  await extractAndWriteData()

  // All done!
  spinner.success({
    text: `Generated iOS color sets successfully!`,
    mark: '✅',
  })
})()
