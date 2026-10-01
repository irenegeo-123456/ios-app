import { useState } from 'react'

// Shared helpers for the SlackKit web components (spec slackkit-components.md › "Shared behavior").

/** Joins class names, skipping falsy ones. */
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ')

// Color math, as UIColor+Extensions.swift:28-70 does it: blend(c1, c2, p) mixes the RGBA components linearly. These
// return CSS color expressions over any CSS color (a token var, a hex), resolved per appearance like the dynamic
// UIColor they mirror.

/** `c.darken(p)`: blend with black. */
export const darken = (c: string, p: number) =>
  `rgb(from ${c} calc(r * ${1 - p}) calc(g * ${1 - p}) calc(b * ${1 - p}) / calc(alpha * ${1 - p} + ${p}))`

/** `c.dynamicLighten(p)`: blend with sk_primary_background (#FFFFFF / #1A1D21). */
export const dynamicLighten = (c: string, p: number) => `color-mix(in srgb, ${c} ${Math.round((1 - p) * 1000) / 10}%, var(--dt_color_base_primary))`

/** `c.withAlphaComponent(a)`: the same color with its alpha replaced. */
export const withAlpha = (c: string, a: number) => `rgb(from ${c} r g b / ${a})`

/** min(20, 0.25 × side): SlackKit's proportional corner radius (SKF/Utilities/UIUtilities.swift:94-99). */
export const proportionalRadius = (side: number) => Math.min(20, 0.25 * side)

/**
 * An alpha mask from an SVG path (even-odd), for the cut-outs SlackKit draws with CAShapeLayer masks:
 * `mask-image: svgMask(24, 24, 'M0 0H24V24H0Z M…')` keeps the path's filled area.
 */
export const svgMask = (w: number, h: number, d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><path fill-rule='evenodd' d='${d}'/></svg>`)}")`

/**
 * An alpha mask of `d` with `cut` taken out of it (CGPath.subtracting, AvatarAnnotationGeometry.carve's
 * `.extendsPastAvatar` case): unlike an even-odd path, the part of `cut` outside `d` stays empty.
 */
export const svgMaskSubtract = (w: number, h: number, d: string, cut: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><defs><mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='${w}' height='${h}'><rect width='${w}' height='${h}' fill='white'/><path d='${cut}' fill='black'/></mask></defs><path d='${d}' mask='url(#m)'/></svg>`,
  )}")`

/** An SVG path for a rounded rectangle (UIBezierPath(roundedRect:cornerRadius:), circular corners). */
export const roundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
  const k = Math.min(r, w / 2, h / 2)
  return `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
}

/** An SVG path for an ellipse inscribed in a rect. */
export const ellipsePath = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y + h / 2}A${w / 2} ${h / 2} 0 1 0 ${x + w} ${y + h / 2}A${w / 2} ${h / 2} 0 1 0 ${x} ${y + h / 2}Z`

/** UIUtilities.floorToScreenScale / ceilToScreenScale at @3x (a tiny epsilon absorbs float noise). */
export const floor3 = (v: number) => Math.floor(v * 3 + 1e-6) / 3
export const ceil3 = (v: number) => Math.ceil(v * 3 - 1e-6) / 3

/** UIUtilities.roundRectToScreenScale (UIUtilities.swift:47-53): origin floored, size ceiled to the pixel grid. */
export const roundRectToScreenScale = (x: number, y: number, w: number, h: number) => ({ x: floor3(x), y: floor3(y), w: ceil3(w), h: ceil3(h) })

/**
 * UIUtilities.roundToAutoLayoutScreenScale at @3x (SKF/Utilities/UIUtilities.swift:56-83): values between 1/3 and 2/3
 * round up to the pixel grid, everything else rounds down.
 */
export const roundToAutoLayoutScale = (v: number) => {
  if (Math.abs(v * 3 - Math.round(v * 3)) < 1e-6) return v
  return v >= 1 / 3 && v <= 2 / 3 ? Math.ceil(v * 3) / 3 : Math.floor(v * 3) / 3
}

/**
 * A value mirrored in state: starts at `value`, follows it when the owner changes it, and can be changed locally (a
 * checkbox flips itself on iOS, then reports it). Lets prototypes drop a control in without wiring state.
 */
export function useMirroredState<T>(value: T): [T, (v: T) => void] {
  const [prev, setPrev] = useState(value)
  const [state, setState] = useState(value)
  if (prev !== value) {
    setPrev(value)
    setState(value)
  }
  return [state, setState]
}

/** The light-impact haptic of toggles (SKHaptics.swift:11-32), where the browser can vibrate. */
export const haptic = () => {
  try {
    navigator.vibrate?.(8)
  } catch {
    // not available
  }
}
