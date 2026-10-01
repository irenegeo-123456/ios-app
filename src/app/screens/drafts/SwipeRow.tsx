import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../../../icons/Icon'
import { haptic } from '../../../slackkit/util'
import './swipe-row.css'

// SKSwipeableContentDecorator (CoreComponents/List/SwipeableContentDecorator; spec dms-activity.md §1.6), as DMs,
// Activity, Drafts and Scheduled rows use it. The `left` action is revealed by swiping right (the row slides over its
// background and uncovers the button at the leading edge), the `right` action by swiping left (trailing edge)
// (SKSwipeableContentDecorator.swift:234-235). Let go past half the button and the row stays open on it; past 40 % of
// the row the action is committed (the button then rides along the row's edge, rubber-banding beyond, with its
// activeIcon); otherwise it springs back. A committed action bounces back, or slides the row away
// (`.slideAwayAndDelete`). While moved the row gets 12 pt corners and a 0.4 black shadow, radius 4 (:79-87, :471-482;
// SKSwipeToActionGestureRecognizer.swift:24-33, :107-221; SKSwipeActions.swift:47-80).

const GOLDEN = 0.4
/** projectionTimeScale: the release velocity's reach (SKSwipeToActionGestureRecognizer.swift:26) */
const PROJECTION = 0.05
const SLOP = 6
const SLIDE_AWAY_MS = 250

type Reveal = 'closed' | 'open' | 'past'

export interface SwipeAction {
  label: string
  icon: string
  /** the icon once past the threshold (SKSwipeAction.activeIcon); the icon when unset */
  activeIcon?: string
  /** the action's fill and the button's text color */
  background: string
  foreground: string
  /** `.slideAwayAndDelete`: the row slides off before the action runs (default: bounce back) */
  slideAway?: boolean
  /** iconPosition .right: the icon after the label */
  iconRight?: boolean
  /** the action ran: the release past the threshold, or a tap on the uncovered button */
  onAction: () => void
}

interface Props {
  children: ReactNode
  /** false turns the gesture off (bulk editing) */
  enabled?: boolean
  /** revealed by swiping right, at the leading edge */
  left?: SwipeAction
  /** revealed by swiping left, at the trailing edge */
  right?: SwipeAction
}

export function SwipeRow({ children, enabled = true, left, right }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const leftButton = useRef<HTMLButtonElement>(null)
  const rightButton = useRef<HTMLButtonElement>(null)
  const [offset, setOffset] = useState(0)
  const [reveal, setReveal] = useState<Reveal>('closed')
  const [dragging, setDragging] = useState(false)
  const [sliding, setSliding] = useState(false)
  const [widths, setWidths] = useState({ left: 0, right: 0 })
  const drag = useRef<{ x: number; y: number; id: number; base: number; swiping: boolean; samples: { t: number; x: number }[] } | null>(null)
  const swallowClick = useRef(false)

  useLayoutEffect(() => {
    setWidths({ left: leftButton.current?.offsetWidth ?? 0, right: rightButton.current?.offsetWidth ?? 0 })
  }, [left?.label, left?.icon, right?.label, right?.icon])

  const width = () => root.current?.offsetWidth ?? 0
  const scale = () => {
    const screen = root.current?.closest('.ios-screen') as HTMLElement | null
    return screen ? screen.getBoundingClientRect().width / screen.offsetWidth || 1 : 1
  }
  // applyRubberBanding (:107-111): past the threshold the row follows the square root of the overshoot
  const rubber = (t: number) => {
    const threshold = width() * GOLDEN
    const over = Math.abs(t) - threshold
    return over > 0 ? Math.sign(t) * (threshold + Math.sqrt(over) * 2) : t
  }
  // the side the row has moved toward: positive offsets uncover the left action
  const sideOf = (t: number) => (t > 0 ? left : t < 0 ? right : undefined)
  const buttonWidth = (t: number) => (t > 0 ? widths.left : widths.right)
  // no action on a side: the row doesn't move that way past its resting place
  const clamp = (t: number) => Math.max(right ? -Infinity : 0, Math.min(left ? Infinity : 0, t))

  const close = () => {
    setReveal('closed')
    setOffset(0)
  }
  const run = (action: SwipeAction, t: number) => {
    if (action.slideAway) {
      setSliding(true)
      setReveal('past')
      setOffset(Math.sign(t || 1) * (width() + 16))
      window.setTimeout(() => {
        setSliding(false)
        close()
        action.onAction()
      }, SLIDE_AWAY_MS)
      return
    }
    close()
    action.onAction()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || sliding || e.button !== 0 || (!left && !right)) return
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, base: offset, swiping: false, samples: [] }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const s = scale()
    const dx = (e.clientX - d.x) / s
    const dy = (e.clientY - d.y) / s
    if (!d.swiping) {
      if (Math.hypot(dx, dy) < SLOP) return
      // a mostly vertical drag is the list's; a swipe toward a side without an action isn't one
      if (Math.abs(dy) >= Math.abs(dx) || !sideOf(d.base + dx)) {
        drag.current = null
        return
      }
      d.swiping = true
      setDragging(true)
      try {
        root.current?.setPointerCapture?.(e.pointerId)
      } catch {
        // a synthetic pointer (tests) can't be captured
      }
    }
    const t = clamp(d.base + dx)
    const next = rubber(t)
    setOffset(next)
    const past = Math.abs(t) > width() * GOLDEN
    if (past !== (reveal === 'past')) {
      // crossing the threshold: a selection haptic, the button snaps to the row's edge (or back) (:271-300)
      haptic()
      setReveal(past ? 'past' : Math.abs(next) > buttonWidth(next) / 2 ? 'open' : 'closed')
    }
    const now = performance.now()
    d.samples.push({ t: now, x: dx })
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift()
    e.preventDefault()
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || e.pointerId !== d.id || !d.swiping) return
    setDragging(false)
    swallowClick.current = true
    setTimeout(() => (swallowClick.current = false), 0)
    const s = scale()
    const t = clamp(d.base + (e.clientX - d.x) / s)
    const first = d.samples[0]
    const last = d.samples.at(-1)
    const v = first && last && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0
    const projected = t + v * PROJECTION
    const action = sideOf(t)
    // calculateFinalState (:131-221)
    if (action && Math.abs(t) > width() * GOLDEN) return run(action, t)
    if (action && Math.sign(projected) === Math.sign(t) && Math.abs(projected) > buttonWidth(t) / 2) {
      setReveal('open')
      setOffset(Math.sign(t) * buttonWidth(t))
    } else close()
  }

  const moved = offset !== 0
  const shown = sideOf(offset)
  const button = (a: SwipeAction | undefined, side: 'left' | 'right') => {
    if (!a) return null
    const visible = moved && shown === a
    const w = side === 'left' ? widths.left : widths.right
    // the button sits at its edge; past the threshold it's pinned to the row's moving edge instead (:136-143, :285-300)
    const inset = reveal === 'past' && visible ? Math.max(0, Math.abs(offset) - w) : 0
    return (
      <button
        ref={side === 'left' ? leftButton : rightButton}
        type="button"
        className={`swipe-row__button swipe-row__button--${side}`}
        style={{ color: a.foreground, [side]: inset, visibility: visible ? 'visible' : 'hidden' }}
        onClick={() => run(a, side === 'left' ? 1 : -1)}
        tabIndex={visible ? 0 : -1}
      >
        {!a.iconRight && <Icon name={reveal === 'past' && a.activeIcon ? a.activeIcon : a.icon} size={20} />}
        <span className="swipe-row__label">{a.label}</span>
        {a.iconRight && <Icon name={reveal === 'past' && a.activeIcon ? a.activeIcon : a.icon} size={20} />}
      </button>
    )
  }
  return (
    <div
      ref={root}
      className={`swipe-row${moved ? ' is-moved' : ''}${dragging ? ' is-dragging' : ''}${sliding ? ' is-sliding' : ''}`}
      // an open row's drag back is its own, not the nav stack's swipe back (StackView)
      data-no-swipe={moved || left ? true : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        // the release that ends a swipe isn't a tap; a tap on an open row closes it
        const onButton = leftButton.current?.contains(e.target as Node) || rightButton.current?.contains(e.target as Node)
        if (swallowClick.current || (reveal === 'open' && !onButton)) {
          e.stopPropagation()
          e.preventDefault()
          swallowClick.current = false
          if (reveal === 'open') close()
        }
      }}
    >
      <div className="swipe-row__background" style={{ background: shown?.background, visibility: moved ? 'visible' : 'hidden' }} />
      {button(left, 'left')}
      {button(right, 'right')}
      <div className="swipe-row__content" style={{ transform: offset ? `translateX(${offset}px)` : undefined }}>
        {children}
      </div>
    </div>
  )
}
