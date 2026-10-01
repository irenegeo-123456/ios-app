import { useEffect, useState, type CSSProperties } from 'react'
import { cx } from './util'
import './progress.css'

// SKLoadingBar (DesignerComponents/LoadingBar/SKLoadingBar.swift): an indeterminate thin bar (under a nav bar while
// content loads). A round-capped segment sweeps left to right every 1.1 s, cubic-bezier(0.445, 0.05, 0.55, 0.95): its end
// runs 0 → 1.01 over the whole loop, its start 0 → 1.05 from 0.22 s (:30-76). On completion the track and segment fade
// out over 0.3 s while a highlight2.baseInverse flash fades in over 0.7 s and out over 1.0 s (:78-113, :264-285).
// Spec: slackkit-components.md › SKLoadingBar.
//
//   <SKLoadingBar />                          loading, 2 pt, darkOnLight
//   <SKLoadingBar state="loadingComplete" />  plays the green flash, then hides

export type SKLoadingBarState = 'loading' | 'loadingComplete' | 'loadingCompleteOverride'

interface Props {
  /** medium 2 pt (default) or large 3 pt (:301-341) */
  size?: 'medium' | 'large'
  color?: 'darkOnLight' | 'lightOnDark'
  state?: SKLoadingBarState
  className?: string
  style?: CSSProperties
}

export function SKLoadingBar({ size = 'medium', color = 'darkOnLight', state = 'loading', className, style }: Props) {
  const h = size === 'large' ? 3 : 2
  // The completion flash plays once (0.7 s in + 1.0 s out), then everything hides.
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (state === 'loading') {
      setHidden(false)
      return
    }
    const t = setTimeout(() => setHidden(true), 1700)
    return () => clearTimeout(t)
  }, [state])
  return (
    <div
      className={cx('sk-loading-bar', `sk-loading-bar--${color}`, state !== 'loading' && 'is-complete', hidden && 'is-hidden', className)}
      style={{ height: h, ...style }}
      aria-hidden
    >
      <div className="sk-loading-bar__track" />
      <div className="sk-loading-bar__segment" />
      <div className="sk-loading-bar__flash" />
    </div>
  )
}
