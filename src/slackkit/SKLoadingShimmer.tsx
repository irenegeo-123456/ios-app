import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cx } from './util'
import './loading.css'

// SKLoadingShimmerView (DesignerComponents/LoadingState/Views/SKLoadingShimmerView.swift:16-112): the loading
// shimmer, a CAGradientLayer [surfacePrimary, surfaceSecondary, surfacePrimary] from start (−1, 0.2) to end (0, 0.5)
// in unit coordinates, both points animated by (2, 0.3) over 1.8 s ease-in-out, forever (none with Reduce Motion). The
// band is as wide as the view and its tilt follows the view's aspect ratio.
//
// Drawn as an SVG userSpaceOnUse linear gradient with the same end points, so it matches at any size. With `shapes`
// only those rounded rects are painted (the placeholder holes SKLoadingState cuts in its rows); without, the whole box.
// `solid` fills the shapes flat instead (FillStyle.solid). Positioned absolutely over its parent.
//
//   <SKLoadingShimmer />                                             fills the parent
//   <SKLoadingShimmer shapes={[{ x: 16, y: 10, w: 36, h: 36, r: 9 }]} />

export interface SKShimmerShape {
  x: number
  y: number
  w: number
  h: number
  r: number
}

interface Props {
  shapes?: SKShimmerShape[]
  /** FillStyle.solid(placeholderColor): flat shapes, no shimmer */
  solid?: string
  /** the gradient's colors (default surfacePrimary / surfaceSecondary) */
  backgroundColor?: string
  shimmerColor?: string
  className?: string
  style?: CSSProperties
}

export function SKLoadingShimmer({ shapes, solid, backgroundColor = 'var(--dt_color_surface_primary)', shimmerColor = 'var(--dt_color_surface_secondary)', className, style }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const id = `sk-shimmer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const b = e!.contentRect
      setSize((s) => (s.w === b.width && s.h === b.height ? s : { w: b.width, h: b.height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const { w, h } = size
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const fill = solid ?? `url(#${id})`
  // start (−1, 0.2) → end (0, 0.5), animated to start (1, 0.5) → end (2, 0.8) (setupGradient / setupAnimation)
  const spline = { calcMode: 'spline', keyTimes: '0;1', keySplines: '0.42 0 0.58 1', dur: '1.8s', repeatCount: 'indefinite' } as const
  return (
    <svg ref={ref} className={cx('sk-shimmer', className)} style={style} width="100%" height="100%" aria-hidden>
      {!solid && w > 0 && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={-w} y1={0.2 * h} x2={0} y2={0.5 * h}>
            <stop offset="0" style={{ stopColor: backgroundColor }} />
            <stop offset="0.5" style={{ stopColor: shimmerColor }} />
            <stop offset="1" style={{ stopColor: backgroundColor }} />
            {!reduce && (
              <>
                <animate attributeName="x1" values={`${-w};${w}`} {...spline} />
                <animate attributeName="y1" values={`${0.2 * h};${0.5 * h}`} {...spline} />
                <animate attributeName="x2" values={`0;${2 * w}`} {...spline} />
                <animate attributeName="y2" values={`${0.5 * h};${0.8 * h}`} {...spline} />
              </>
            )}
          </linearGradient>
        </defs>
      )}
      {w > 0 && (shapes ? shapes.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={fill} />) : <rect width={w} height={h} fill={fill} />)}
    </svg>
  )
}
