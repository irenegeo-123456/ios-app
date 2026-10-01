import type { CSSProperties } from 'react'
import { Emoji, findEmoji } from '../emoji/Emoji'
import { cx } from './util'
import './ornaments.css'

// SKEmoji (CoreComponents/Emoji/SKEmoji.swift): an emoji in a square box (intrinsic 20 × 20). A standard emoji is a
// native text glyph in the largest system-font size that fits the box (fontFittingBounds, :181-209), which leaves the
// artwork about 7/8 of the box, centered: SKEmojiSnapshotTests/testColorEmoji draws ⭐️ 17.67 pt wide in 20, and
// SKOrnamentBoxSnapshotTests/testOrnamentBoxEmoji* the squid 16.33 × 16. A custom (workspace) emoji is an image that
// fills the box. Grayscale mode uses CIPhotoEffectMono (:215-265).
//
//   <SKEmoji name="tada" />
//   <SKEmoji name="squirrel" size={32} colorMode="grayscale" />

interface Props {
  /** an emoji short name ("tada", "+1::skin-tone-3") */
  name: string
  /** the box side (default 20) */
  size?: number
  colorMode?: 'color' | 'grayscale'
  className?: string
  style?: CSSProperties
}

/** the native glyph's artwork relative to the box (measured, see above) */
export const NATIVE_EMOJI_SCALE = 0.875

export function SKEmoji({ name, size = 20, colorMode = 'color', className, style }: Props) {
  const custom = findEmoji(name)?.c === 9
  const glyph = custom ? size : Math.round(size * NATIVE_EMOJI_SCALE * 3) / 3
  return (
    <span
      className={cx('sk-emoji', className)}
      style={{ width: size, height: size, filter: colorMode === 'grayscale' ? 'grayscale(1)' : undefined, ...style }}
    >
      <Emoji name={name} size={glyph} />
    </span>
  )
}
