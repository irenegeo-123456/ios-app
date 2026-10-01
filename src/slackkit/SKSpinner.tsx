import type { CSSProperties } from 'react'
import { cx, roundToAutoLayoutScale } from './util'
import './progress.css'

// SKSpinner (DesignerComponents/Spinner/SKSpinner.swift) and SKCircularProgressIndicator
// (DeveloperComponents/CircularProgressIndicator/SKCircularProgressIndicator.swift): a ring track with an arc on top,
// line width = side / 10 on the pixel grid, round cap, starting at 12 o'clock. The spinner rotates every 1.25 s while
// its arc breathes 30 % → 25 % (:50-80). Spec: slackkit-components.md › SKSpinner, SKCircularProgressIndicator.
//
//   <SKSpinner />                                   medium (18 pt), darkOnLight
//   <SKSpinner size="large" color="lightOnDark" />
//   <SKCircularProgressIndicator progress={0.4} />

/** SKSpinner.PresentationObject.Size (:184-190) */
export const SPINNER_SIZES = { small: 12, medium: 18, large: 24, extraLarge: 46, jumbo: 52 } as const
export type SKSpinnerSize = keyof typeof SPINNER_SIZES

/** SKSpinner.PresentationObject.Color (:192-223) */
export type SKSpinnerColor = 'darkOnLight' | 'lightOnDark' | 'monochrome' | { strokeColor: string; baseCircleColor: string }

export function spinnerColors(color: SKSpinnerColor): { stroke: string; base: string } {
  if (typeof color === 'object') return { stroke: color.strokeColor, base: color.baseCircleColor }
  switch (color) {
    case 'lightOnDark':
      return { stroke: 'var(--sk-gray-0-light)', base: 'rgb(from var(--sk-gray-0-light) r g b / 0.2)' }
    case 'monochrome':
      return { stroke: 'var(--dt_color_content_primary)', base: 'var(--dt_color_surface_primary)' }
    default:
      return { stroke: 'var(--dt_color_palettes_lagoon_40)', base: 'var(--dt_color_surface_primary)' }
  }
}

interface RingProps {
  size?: SKSpinnerSize
  color?: SKSpinnerColor
  /** UIEdgeInsets around the ring (SKSpinner.PresentationObject.padding) */
  padding?: number | string
  className?: string
  style?: CSSProperties
}

function Ring({ size = 'medium', color = 'darkOnLight', padding, className, style, progress }: RingProps & { progress?: number }) {
  const side = SPINNER_SIZES[size]
  const lw = roundToAutoLayoutScale(side / 10)
  const r = side / 2 - lw / 2
  const c = spinnerColors(color)
  const spinning = progress === undefined
  return (
    <span
      className={cx('sk-spinner', className)}
      style={{ width: side, height: side, padding, boxSizing: 'content-box', ...style }}
      role="progressbar"
      aria-label={spinning ? 'Loading…' : undefined}
      aria-valuenow={spinning ? undefined : Math.round(progress * 100)}
    >
      <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`} fill="none" aria-hidden>
        <circle cx={side / 2} cy={side / 2} r={r} stroke={c.base} strokeWidth={lw} />
        <circle
          className={spinning ? 'sk-spinner__arc is-spinning' : 'sk-spinner__arc'}
          cx={side / 2}
          cy={side / 2}
          r={r}
          stroke={c.stroke}
          strokeWidth={lw}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={spinning ? undefined : `${Math.max(0, Math.min(1, progress))} 1`}
        />
      </svg>
    </span>
  )
}

/** The indeterminate spinner. VoiceOver label "Loading…" (R.strings.loading_ellipsis, :36-37). */
export function SKSpinner(props: RingProps) {
  return <Ring {...props} />
}

/** A determinate ring with the spinner's sizes and colors; `progress` 0–1 sets the arc end. No animation (:55-78). */
export function SKCircularProgressIndicator({ progress, ...props }: RingProps & { progress: number }) {
  return <Ring {...props} progress={progress} />
}
