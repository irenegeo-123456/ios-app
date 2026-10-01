// The simulated devices. Screen sizes, safe areas and corner radii are Apple's published point values (Human
// Interface Guidelines › Layout › Specifications, and UIScreen/UIWindow values on each device's simulator).
// Slack's own snapshot tests render at 393×852 (the iPhone 15 Pro / 16 size), so `iphone-16` is the one to use
// when comparing against a baseline (tools/compare.mjs).

export type Island = 'dynamic-island' | 'notch' | 'none'

export interface Device {
  id: string
  name: string
  /** screen size in points (portrait) */
  width: number
  height: number
  /** safe-area insets in points (portrait) */
  safeTop: number
  safeBottom: number
  /** status bar height (usually = safeTop) */
  statusBar: number
  /** display corner radius in points */
  radius: number
  island: Island
  /** home button (no home indicator) */
  homeButton?: boolean
  /** bezel thickness around the display, in points */
  bezel: number
  /** Dynamic Island frame (top, width, height), measured on iOS 26 screenshots at @3x */
  islandFrame?: { top: number; width: number; height: number }
  /** status bar: center x of the clock, and of the trailing glyph cluster measured from the right edge */
  clockX?: number
  glyphsFromRight?: number
  /** frame finishes, first is the default */
  finishes: { id: string; name: string; frame: string; edge: string }[]
}

const PRO_FINISHES = [
  { id: 'silver', name: 'Silver', frame: '#d7d8da', edge: '#b5b7ba' },
  { id: 'cosmic-orange', name: 'Cosmic Orange', frame: '#e0763a', edge: '#b8582a' },
  { id: 'deep-blue', name: 'Deep Blue', frame: '#3b4658', edge: '#262e3b' },
]

export const DEVICES: Device[] = [
  {
    id: 'iphone-17-pro',
    name: 'iPhone 17 Pro',
    width: 402,
    height: 874,
    safeTop: 62,
    safeBottom: 34,
    statusBar: 62,
    radius: 62,
    island: 'dynamic-island',
    bezel: 12,
    // Measured on an iOS 26.5 simulator frame (1206×2622): island 138.3–263.3 × 14.0–50.3, clock centered at 72.5,
    // cellular + Wi-Fi + battery centered 76 pt from the right edge.
    islandFrame: { top: 14, width: 125, height: 36.5 },
    clockX: 72.5,
    glyphsFromRight: 76,
    finishes: PRO_FINISHES,
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    width: 440,
    height: 956,
    safeTop: 62,
    safeBottom: 34,
    statusBar: 62,
    radius: 62,
    island: 'dynamic-island',
    bezel: 12,
    // Measured on a real iOS 26 Slack screenshot (1320×2868): clock centered at 73.2, glyphs 86 pt from the right.
    islandFrame: { top: 14, width: 125, height: 36.5 },
    clockX: 73.2,
    glyphsFromRight: 86,
    finishes: PRO_FINISHES,
  },
  {
    id: 'iphone-16',
    name: 'iPhone 16',
    width: 393,
    height: 852,
    safeTop: 59,
    safeBottom: 34,
    statusBar: 59,
    radius: 55,
    island: 'dynamic-island',
    bezel: 14,
    islandFrame: { top: 11, width: 126, height: 37.33 },
    clockX: 70,
    glyphsFromRight: 74,
    finishes: [
      { id: 'black', name: 'Black', frame: '#3a3a3c', edge: '#232325' },
      { id: 'ultramarine', name: 'Ultramarine', frame: '#8e9be8', edge: '#6a76c4' },
      { id: 'white', name: 'White', frame: '#e8e8ea', edge: '#c9c9cc' },
    ],
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE (3rd generation)',
    width: 375,
    height: 667,
    safeTop: 20,
    safeBottom: 0,
    statusBar: 20,
    radius: 0,
    island: 'none',
    homeButton: true,
    bezel: 16,
    finishes: [
      { id: 'midnight', name: 'Midnight', frame: '#1f2023', edge: '#0f1012' },
      { id: 'starlight', name: 'Starlight', frame: '#f1ede6', edge: '#d9d3c9' },
    ],
  },
]

export const DEFAULT_DEVICE = DEVICES[0]
export const deviceById = (id: string | null | undefined) => DEVICES.find((d) => d.id === id) ?? DEFAULT_DEVICE
