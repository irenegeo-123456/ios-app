import type { CSSProperties } from 'react'
import { cx } from './util'
import './progress.css'

// SKProgressBar (DesignerComponents/ProgressBar/SKProgressBar.swift:17-150): a determinate linear bar, a UIProgressView
// 2 / 4 / 12 pt tall, lagoon_40 on baseTertiary. iOS 26 draws UIProgressView as a capsule with a capsule fill
// (SNAP/SKProgressBarSnapshotTests/testHalfwayProgress@3x.png); `roundCorners` on xLarge sets the source's 6 pt radius.
// Spec: slackkit-components.md › SKProgressBar.
//
//   <SKProgressBar progress={0.5} />
//   <SKProgressBar progress={0.5} size="xLarge" roundCorners progressTintColor="var(--sk_raspberry_red)" />

/** SKProgressBar.PresentationObject.Size heights (:114-137) */
export const PROGRESS_BAR_HEIGHTS = { small: 2, medium: 4, xLarge: 12 } as const

interface Props {
  /** 0–1, pinned to those limits */
  progress: number
  animated?: boolean
  size?: keyof typeof PROGRESS_BAR_HEIGHTS
  roundCorners?: boolean
  progressTintColor?: string
  trackTintColor?: string
  accessibilityValue?: string
  className?: string
  style?: CSSProperties
}

export function SKProgressBar({
  progress,
  animated = true,
  size = 'small',
  roundCorners = false,
  progressTintColor = 'var(--dt_color_palettes_lagoon_40)',
  trackTintColor = 'var(--dt_color_base_tertiary)',
  accessibilityValue,
  className,
  style,
}: Props) {
  const h = PROGRESS_BAR_HEIGHTS[size]
  const p = Math.max(0, Math.min(1, progress))
  const radius = roundCorners && size === 'xLarge' ? 6 : h / 2
  return (
    <div
      className={cx('sk-progress-bar', className)}
      style={{ height: h, borderRadius: radius, background: trackTintColor, ...style }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      aria-valuetext={accessibilityValue}
    >
      <div className={cx('sk-progress-bar__fill', animated && 'is-animated')} style={{ width: `${p * 100}%`, borderRadius: radius, background: progressTintColor }} />
    </div>
  )
}
