import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { asset } from '../lib/asset'
import { Icon } from '../icons/Icon'
import { cx } from './util'
import './toast.css'

// SKToast (DesignerComponents/Toast/SKToast.swift): a transient HUD ("Copied", "Saved") centered in its window,
// optionally with an image or an activity view (100 × 100) 10 pt above the message. Padding 20; radius 16; the
// message (Lato 17, white, centered, shadow contentPrimary @33 % at (0, 1)) wraps inside maxWidth − 40 (max 260),
// max height 320; the toast is square when taller than wide. Background sk_toast_background (#141414 @70 % / @90 %),
// shadow contentPrimary 10 %, radius 7, offset (4, 4) (:240-330, Consts :367-393). It appears from scale 0.9 / alpha 0
// with the snappy/medium spring (0.368 s), holds for `after` (0.55 s default), and leaves the same way (:200-232).
// It takes no touches. Spec: slackkit-components.md › SKToast.
//
//   {toast && <SKToast message="Link copied" onDismissed={() => setToast(false)} />}
//   <SKToast message="Uploading…" contentStyle={{ activityIndicator: <SKSpinner size="extraLarge" color="lightOnDark" /> }} presentation="manual" />
//   <SKToast message="Saved" contentStyle={{ icon: 'check_circle_filled' }} />          an SKIcon, 30 × 30, white
//
// It fills its nearest positioned ancestor (put it in the screen) and centers itself, or sits at `verticalOffset`.

/** ContentStyle (:76-81). `icon` (September 2026): an SKIcon at `size` (default 30 × 30, `defaultIconSize` :30) tinted
 *  `color` (default white, ColorSet.Constants.white) (:118-121) */
export type SKToastContentStyle = 'messageOnly' | { image: string } | { icon: string; size?: number; color?: string } | { activityIndicator: ReactNode }

interface Props {
  message?: string
  contentStyle?: SKToastContentStyle
  /** default 260 */
  maxWidth?: number
  /** presented and dismissed after `after` seconds (default 0.55), presented until you set 'dismissed', or dismissed */
  presentation?: { automatic: number } | 'automatic' | 'manual' | 'dismissed'
  /** the toast's center from the top of its container; default: vertically centered */
  verticalOffset?: number
  /** after it has animated out */
  onDismissed?: () => void
  className?: string
  style?: CSSProperties
}

/** DismissStyle.defaultDelay (:79) */
export const TOAST_DEFAULT_DELAY = 0.55
/** the snappy/medium spring's duration (UIView+SpringAnimation.swift:64-130) */
const SPRING_MS = 368

export function SKToast({ message, contentStyle = 'messageOnly', maxWidth = 260, presentation = 'automatic', verticalOffset, onDismissed, className, style }: Props) {
  const [phase, setPhase] = useState<'in' | 'shown' | 'out' | 'gone'>(presentation === 'dismissed' ? 'gone' : 'in')
  const box = useRef<HTMLDivElement>(null)
  const [minWidth, setMinWidth] = useState<number>()
  const dismissed = presentation === 'dismissed'
  const delay = presentation === 'manual' || dismissed ? null : typeof presentation === 'object' ? presentation.automatic : TOAST_DEFAULT_DELAY

  useEffect(() => {
    if (dismissed) {
      setPhase((p) => (p === 'gone' ? p : 'out'))
      return
    }
    setPhase('in')
    const shown = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('shown')))
    return () => cancelAnimationFrame(shown)
  }, [dismissed, message])

  useEffect(() => {
    if (phase !== 'shown' || delay === null) return
    const t = setTimeout(() => setPhase('out'), SPRING_MS + delay * 1000)
    return () => clearTimeout(t)
  }, [phase, delay])

  useEffect(() => {
    if (phase !== 'out') return
    const t = setTimeout(() => {
      setPhase('gone')
      onDismissed?.()
    }, SPRING_MS)
    return () => clearTimeout(t)
  }, [phase, onDismissed])

  // "make it a square if height greater than width" (:283-286)
  useLayoutEffect(() => {
    const el = box.current
    if (el) setMinWidth(el.offsetHeight > el.offsetWidth ? el.offsetHeight : undefined)
  }, [message, contentStyle])

  if (phase === 'gone') return null
  const subview =
    contentStyle === 'messageOnly' ? null : 'image' in contentStyle ? (
      <img className="sk-toast__image" src={asset(contentStyle.image)} alt="" draggable={false} />
    ) : 'icon' in contentStyle ? (
      <Icon name={contentStyle.icon} size={contentStyle.size ?? 30} color={contentStyle.color ?? 'var(--dt_color_constants_white)'} className="sk-toast__icon" />
    ) : (
      <div className="sk-toast__activity">{contentStyle.activityIndicator}</div>
    )
  return (
    <div className="sk-toast-layer" role="status" aria-live="polite">
      <div
        ref={box}
        className={cx('sk-toast', phase === 'shown' && 'is-shown', verticalOffset !== undefined && 'is-offset', className)}
        style={{ maxWidth, minWidth, top: verticalOffset, ...style }}
      >
        {subview}
        {message && (
          <div className="sk-toast__message" style={{ maxWidth: maxWidth - 40, marginTop: subview ? 10 : 0 }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
