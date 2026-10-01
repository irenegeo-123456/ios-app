import type { CSSProperties } from 'react'
import { cx, proportionalRadius } from './util'
import './ornaments.css'

// SKColorSwatch (DesignerComponents/ColorSwatch/SKColorSwatch.swift:16-216): a 20 pt color chip with a 1 pt
// outlinePrimary border, radius min(20, 0.25 × side) = 5 (continuous) or a circle. Translucent colors show over a 3 pt
// checkerboard of white and sk_soft_gray (the tile at the top-left is white). No color: an empty chip. VoiceOver reads
// the hex value. Spec: slackkit-components.md › SKColorSwatch.
//
//   <SKColorSwatch color="#4A154B" />
//   <SKColorSwatch color="rgb(29 155 209 / 0.5)" swatchStyle="circle" />

interface Props {
  /** any CSS color; null or undefined shows an empty swatch */
  color?: string | null
  /** Style: roundedRect (default) or circle */
  swatchStyle?: 'roundedRect' | 'circle'
  /** the side (intrinsicSideLength 20; owners can constrain it) */
  size?: number
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKColorSwatch({ color, swatchStyle = 'roundedRect', size = 20, accessibilityLabel, className, style }: Props) {
  return (
    <span
      className={cx('sk-color-swatch', className)}
      style={{ width: size, height: size, borderRadius: swatchStyle === 'circle' ? size / 2 : proportionalRadius(size), ...style }}
      role="img"
      aria-label={accessibilityLabel ?? (color ? `Color ${color}` : 'Color swatch')}
    >
      {/* the checkerboard only shows through translucent colors, so it can always sit underneath */}
      {color && <span className="sk-color-swatch__checkerboard" />}
      {color && <span className="sk-color-swatch__color" style={{ background: color }} />}
    </span>
  )
}
