import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Route } from '../../store'
import { useApp } from '../../store'
import { useLongPress } from '../../gestures'
import { openMenu, showAlert } from '../../sheets'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKButton } from '../../../slackkit/SKButton'
import { haptic } from '../../../slackkit/util'
import { CatchUpCard, type SwipeDir } from './CatchUpCard'
import { catchUpItems, type CatchUpItem } from './model'
import './catch-up.css'

// Catch Up (Modules/Features/AllUnreads; spec dms-activity.md §5), pushed from Home's Catch Up tile
// (AllUnreadsTile.swift:107) with the nav bar and tab bar hidden (AllUnreadsViewController.swift:146-152): the theme's
// gradient, "N Left" with Back and Undo beside it, a stack of up to 3 cards (the one under the top card at 0.95 and 25 pt
// lower), and Keep Unread / Mark as Read under them. Swipe or tap: right marks the card read, left keeps it unread
// (Shuffle/Classes; AllUnreadsViewController.swift:733-760, :868-901). When the stack runs out, a random
// "All caught up" message and Done (AllUnreadsCompletionView.swift). The first-run onboarding cards aren't in the
// prototype.

const MAX_ROTATION = Math.PI / 10 // CardAnimationOptions.maximumRotationAngle
const MIN_SWIPE_SPEED = 1100 // SwipeView.minimumSwipeSpeed, pt/s
const TOTAL_SWIPE = 1.0 // card.animationOptions.totalSwipeDuration (AllUnreadsViewController.swift:756)
const TOTAL_REVERSE = 0.7 // …totalReverseSwipeDuration (:755)
const TOTAL_RESET = 0.6 // CardAnimationOptions.totalResetDuration (damping 0.5)
const OVERLAY_FADE = 0.15 // relativeSwipeOverlayFadeDuration: a tapped button fades the overlay in first
const SLOP = 6

/** AllUnreadsCompletionView.CompletionViewContent (:242-282), one at random. */
const COMPLETIONS = [
  { emoji: 'v', text: "All caught up. What's next?" },
  { emoji: 'seedling', text: "Everything's sorted! Let's start something new." },
  { emoji: 'raised_hands', text: "That's everything!" },
  { emoji: 'sunglasses', text: 'All clear.' },
  { emoji: 'green_apple', text: "You've read all you needed. Take a moment." },
  { emoji: 'seedling', text: 'Lovely! Your work here is done.' },
  { emoji: 'boom', text: "Boom. You're up to date." },
]

/** SwipeCardStack.transform(forCardAtPosition:) (:138-152): the card under the top one at 0.95, 25 pt lower; the third at 0.95. */
function stackTransform(position: number, t = 0): string {
  // t: how far the top card's drag has brought this one forward (backgroundCardDragTransform, :154-175)
  const from = position === 0 ? { s: 1, y: 0 } : position === 1 ? { s: 0.95, y: 25 } : { s: 0.95, y: 0 }
  const to = position <= 1 ? { s: 1, y: 0 } : { s: 0.95, y: 25 }
  const s = from.s + (to.s - from.s) * t
  const y = from.y + (to.y - from.y) * t
  return s === 1 && y === 0 ? 'none' : `scale(${s}) translateY(${y}px)`
}

type Phase =
  /** the first frame: the cards at half size (animateInitialCards) */
  | { kind: 'enter' }
  /** growing into place with a spring: the top card 0.75 s, the next 1 s, damping 0.75 */
  | { kind: 'entering' }
  | { kind: 'idle' }
  | { kind: 'drag'; dx: number; dy: number; top: boolean }
  /** springing back (CardAnimator.animateReset) */
  | { kind: 'reset' }
  /** flying off (CardAnimator.animateSwipe) */
  | { kind: 'out'; dir: SwipeDir; transform: string; duration: number; delay: number; stackDuration: number }
  /** an undone card placed where it left, then springing back (animateReverseSwipe) */
  | { kind: 'undo-from'; transform: string }
  | { kind: 'undo' }

interface Swiped {
  dir: SwipeDir
  transform: string
  restore?: () => void
}

export function CatchUpScreen({ route }: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  // from a section browser's Catch Up pill: that section's conversations only (streamConfig .tsids,
  // ConversationSectionBrowserFeature.swift:147-148)
  const only = Array.isArray(route.conversationIds) ? new Set(route.conversationIds as string[]) : undefined
  const pop = useApp((s) => s.pop)
  const markRead = useApp((s) => s.markRead)
  const markActivityRead = useApp((s) => s.markActivityRead)
  // the unread items as Catch Up loaded them (AllUnreadsSession): the stack doesn't reshuffle while you swipe
  const [items] = useState<CatchUpItem[]>(() => catchUpItems(fx, messages, threads).filter((it) => !only || only.has(it.conversationId)))
  const [index, setIndex] = useState(0)
  const [swiped, setSwiped] = useState<Swiped[]>([])
  const [phase, setPhase] = useState<Phase>({ kind: 'enter' })
  const [overlay, setOverlay] = useState({ left: 0, right: 0, fade: false })
  const [completion] = useState(() => COMPLETIONS[Math.floor(Math.random() * COMPLETIONS.length)])
  const stackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; id: number; top: boolean; active: boolean; samples: { t: number; x: number; y: number }[] } | null>(null)
  const swallowClick = useRef(false)
  const timer = useRef(0)
  const completed = index >= items.length
  const busy = phase.kind === 'out' || phase.kind === 'undo-from'
  const entering = phase.kind === 'enter'

  // the cards grow in from 0.5 with a spring, the title drops in, the buttons rise (CardStackAnimator
  // .animateInitialCards :203-229; AllUnreadsPresenter.animationParameters :82-131)
  useEffect(() => {
    let r = requestAnimationFrame(() => {
      r = requestAnimationFrame(() => {
        setPhase({ kind: 'entering' })
        timer.current = window.setTimeout(() => setPhase((p) => (p.kind === 'entering' ? { kind: 'idle' } : p)), 1000)
      })
    })
    return () => cancelAnimationFrame(r)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const screen = () => (stackRef.current?.closest('.ios-screen') as HTMLElement | null) ?? null
  const screenSize = () => {
    const s = screen()
    return { w: s?.offsetWidth ?? 402, h: s?.offsetHeight ?? 874 }
  }
  const scale = () => {
    const s = screen()
    return s ? s.getBoundingClientRect().width / s.offsetWidth || 1 : 1
  }
  // minimumSwipeDistance: a quarter of the screen's shorter side (SwipeView.swift:117-128)
  const minSwipe = () => Math.min(screenSize().w, screenSize().h) / 4
  const cardSize = () => ({ w: stackRef.current?.offsetWidth ?? 370, h: stackRef.current?.offsetHeight ?? 640 })

  /** The mark: right marks the card's conversation (or thread) read, left leaves it (AllUnreadsInteractor swipe actions). */
  const apply = (item: CatchUpItem, dir: SwipeDir): (() => void) | undefined => {
    if (dir !== 'right') return undefined
    if (item.kind === 'thread' && item.activityId) {
      const id = item.activityId
      markActivityRead(id)
      return () => markActivityRead(id, false)
    }
    const before = useApp.getState().fx.unreads[item.conversationId]
    markRead(item.conversationId)
    return before ? () => useApp.setState((s) => ({ fx: { ...s.fx, unreads: { ...s.fx.unreads, [item.conversationId]: before } } })) : undefined
  }

  /** Throws the top card (forced: a button, no drag), then moves the stack up (CardAnimator / CardStackAnimator). */
  const swipe = (dir: SwipeDir, opts: { forced: boolean; dx?: number; dy?: number; top?: boolean; speed?: number }) => {
    const item = items[index]
    if (!item || busy) return
    const { w, h } = screenSize()
    const card = cardSize()
    const reach = Math.max(w, h) + Math.hypot(card.w, card.h)
    let vx = dir === 'right' ? 1 : -1
    let vy = 0
    if (!opts.forced && opts.dx !== undefined) {
      const len = Math.hypot(opts.dx, opts.dy ?? 0) || 1
      vx = opts.dx / len
      vy = (opts.dy ?? 0) / len
    }
    // swipeRotationAngle (CardAnimator.swift:133-151): ±2 × the maximum, its sign from where the card was held
    let angle = 2 * (dir === 'left' ? -1 : 1) * MAX_ROTATION
    if (!opts.forced && opts.top !== undefined) angle = (dir === 'left' && opts.top) || (dir === 'right' && !opts.top) ? -2 * MAX_ROTATION : 2 * MAX_ROTATION
    const transform = `translate(${vx * reach}px, ${vy * reach}px) rotate(${angle}rad)`
    // swipeDuration: 1 s, or faster with a fast fling (CardAnimator.swift:115-127; CardStackAnimator.swift:252-270)
    const factor = (opts.speed ?? 0) / MIN_SWIPE_SPEED
    const duration = opts.forced || factor < 1 ? TOTAL_SWIPE : 1 / factor
    const stackDuration = opts.forced || factor < 1 ? TOTAL_SWIPE / 2 : 1 / (2 * factor)
    const delay = opts.forced ? TOTAL_SWIPE * OVERLAY_FADE : 0
    if (opts.forced) setOverlay({ left: dir === 'left' ? 1 : 0, right: dir === 'right' ? 1 : 0, fade: true })
    setPhase({ kind: 'out', dir, transform, duration: opts.forced ? duration * (1 - OVERLAY_FADE) : duration, delay, stackDuration })
    timer.current = window.setTimeout(() => {
      const restore = apply(item, dir)
      // the last card: a success haptic (didSwipeAllCards, AllUnreadsViewController.swift:903-907)
      if (index === items.length - 1) haptic()
      setSwiped((s) => [...s, { dir, transform, restore }])
      setIndex((i) => i + 1)
      setOverlay({ left: 0, right: 0, fade: false })
      setPhase({ kind: 'idle' })
    }, (delay + duration) * 1000)
  }

  /** Undo brings the last card back from where it flew (undoLastSwipe; CardAnimator.animateReverseSwipe). */
  const undo = () => {
    const last = swiped.at(-1)
    if (!last || busy || phase.kind === 'drag') return
    last.restore?.()
    setSwiped((s) => s.slice(0, -1))
    setIndex((i) => i - 1)
    setPhase({ kind: 'undo-from', transform: last.transform })
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase({ kind: 'undo' })))
    timer.current = window.setTimeout(() => setPhase({ kind: 'idle' }), TOTAL_REVERSE * 1000)
  }

  const markAll = () =>
    // "Mark all as Read?" / "This can't be undone." (AllUnreadsInteractor.swift:375-446)
    showAlert({
      title: 'Mark all as Read?',
      message: "This can't be undone.",
      actions: [
        {
          title: 'OK',
          style: 'destructive',
          onPress: () => {
            for (const item of items.slice(index)) {
              if (item.kind === 'thread' && item.activityId) markActivityRead(item.activityId)
              else markRead(item.conversationId)
            }
            setSwiped([])
            setIndex(items.length)
          },
        },
        { title: 'Cancel', style: 'cancel' },
      ],
    })

  // ------------------------------------------------------------------------------------------- the pan gesture
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || busy || completed || phase.kind === 'enter') return
    // the composer and the title's menu keep their own touches
    if ((e.target as Element).closest('.cmp, input, textarea, [contenteditable="true"]')) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, top: e.clientY - rect.top < rect.height / 2, active: false, samples: [] }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const s = scale()
    const dx = (e.clientX - d.x) / s
    const dy = (e.clientY - d.y) / s
    if (!d.active) {
      if (Math.hypot(dx, dy) < SLOP) return
      // shouldRecognizeVerticalDrag = false: a vertical drag scrolls the transcript
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null
        return
      }
      d.active = true
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // synthetic pointers can't be captured
      }
    }
    const now = performance.now()
    d.samples.push({ t: now, x: dx, y: dy })
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift()
    setPhase({ kind: 'drag', dx, dy, top: d.top })
    // swipeOverlayPercentage (SwipeCard.swift:117-124): the drag toward a side over minimumSwipeDistance
    const p = Math.max(0, Math.min(1, Math.abs(dx) / minSwipe()))
    setOverlay({ left: dx < 0 ? p : 0, right: dx > 0 ? p : 0, fade: false })
    e.preventDefault()
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || e.pointerId !== d.id || !d.active) return
    swallowClick.current = true
    setTimeout(() => (swallowClick.current = false), 0)
    const s = scale()
    const dx = (e.clientX - d.x) / s
    const dy = (e.clientY - d.y) / s
    const first = d.samples[0]
    const last = d.samples.at(-1)
    const vx = first && last && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0
    const dir: SwipeDir = dx >= 0 ? 'right' : 'left'
    const speed = Math.abs(vx)
    // endSwiping (SwipeView.swift:58-68): fast enough, or a quarter of the screen
    if (speed >= MIN_SWIPE_SPEED || Math.abs(dx) >= minSwipe()) {
      swipe(dir, { forced: false, dx, dy, top: d.top, speed })
      return
    }
    setOverlay({ left: 0, right: 0, fade: false })
    setPhase({ kind: 'reset' })
    timer.current = window.setTimeout(() => setPhase({ kind: 'idle' }), TOTAL_RESET * 1000)
  }

  // ------------------------------------------------------------------------------------------- rendering
  const { w: screenW, h: screenH } = screenSize()
  const minSide = Math.min(screenW, screenH)
  const visible = items.slice(index, index + 3)
  const topStyle = (): CSSProperties => {
    switch (phase.kind) {
      case 'enter':
        return { transform: 'scale(0.5)', transition: 'none' }
      case 'entering':
        return { transform: 'none', transition: 'transform 0.75s var(--sk-spring-bouncy)' }
      case 'drag': {
        // swipeTransform (SwipeCard.swift:96-111): follow the finger, turned up to π/10 by the drag across the screen,
        // the way depending on which half was held
        const angle = (phase.top ? 1 : -1) * Math.min(phase.dx / screenW, 1) * MAX_ROTATION
        return { transform: `rotate(${angle}rad) translate(${phase.dx}px, ${phase.dy}px)`, transition: 'none' }
      }
      case 'reset':
        return { transform: 'none', transition: `transform ${TOTAL_RESET}s var(--sk-spring-bouncy)` }
      case 'out':
        return { transform: phase.transform, transition: `transform ${phase.duration}s linear ${phase.delay}s` }
      case 'undo-from':
        return { transform: phase.transform, transition: 'none' }
      case 'undo':
        return { transform: 'none', transition: `transform ${TOTAL_REVERSE}s var(--sk-spring-smooth)` }
      default:
        return {}
    }
  }
  const backgroundStyle = (position: number): CSSProperties => {
    switch (phase.kind) {
      case 'enter':
        return { transform: 'scale(0.5)', transition: 'none' }
      case 'entering':
        return { transform: stackTransform(position), transition: `transform ${position === 1 ? 1 : 0.75}s var(--sk-spring-bouncy)` }
      case 'drag': {
        const t = Math.min(1, (2 * Math.max(Math.abs(phase.dx), Math.abs(phase.dy))) / minSide)
        return { transform: stackTransform(position, t), transition: 'none' }
      }
      case 'reset':
        return { transform: stackTransform(position), transition: `transform ${TOTAL_RESET / 2}s linear` }
      case 'out':
        return { transform: stackTransform(position - 1), transition: `transform ${phase.stackDuration}s linear ${phase.delay}s` }
      case 'undo-from':
        return { transform: stackTransform(position - 1), transition: 'none' }
      case 'undo':
        return { transform: stackTransform(position), transition: `transform ${TOTAL_REVERSE / 2}s linear` }
      default:
        return { transform: stackTransform(position) }
    }
  }

  return (
    <div className={`catch-up${entering ? ' is-entering' : ''}${completed ? ' is-completed' : ''}`} data-screen="catch-up">
      <div className="catch-up__header">
        {/* SKIconButton .medium (56 pt, a 20 pt icon), svgCaretLeftFull, or ✕ once completed, "Back" (AllUnreadsPresenter.swift:66) */}
        <button type="button" className="catch-up__close" aria-label="Back" onClick={() => pop()} data-tap>
          <Icon name={completed ? 'close' : 'caret_left_full'} size={20} />
        </button>
        {/* all_unreads_left_title "%@ Left", bodyBlack 17 in the theme's text color, centered */}
        <div className="catch-up__title mk-label" aria-live="polite">
          {items.length - index} Left
        </div>
        {/* Undo: SKButton .large .default(textColor: theme.textColor), after a card is swiped (:606-627) */}
        <span className={`catch-up__undo${swiped.length && !completed ? ' is-visible' : ''}`}>
          <SKButton title="Undo" buttonStyle="default" size="large" textColor="var(--theme_contentInversePrimary)" onClick={undo} data-qa="catch_up_undo" />
        </span>
      </div>

      {/* data-no-swipe: a drag on the cards is theirs, not the nav stack's swipe back (StackView); the screen's edges keep it */}
      <div className="catch-up__stack" ref={stackRef} data-no-swipe>
        {visible
          .map((item, position) => (
            <div
              key={item.key}
              className={`catch-up__slot${position === 0 ? ' is-top' : ''}`}
              style={{ zIndex: 3 - position, ...(position === 0 ? topStyle() : backgroundStyle(position)) }}
              onPointerDown={position === 0 ? onPointerDown : undefined}
              onPointerMove={position === 0 ? onPointerMove : undefined}
              onPointerUp={position === 0 ? onPointerUp : undefined}
              onPointerCancel={position === 0 ? onPointerUp : undefined}
              onClickCapture={(e) => {
                if (!swallowClick.current) return
                swallowClick.current = false
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <CatchUpCard
                item={item}
                isTop={position === 0}
                overlay={position === 0 ? overlay : { left: 0, right: 0 }}
                onSent={() => swipe('right', { forced: true })}
              />
            </div>
          ))
          .reverse()}
      </div>

      <div className="catch-up__buttons">
        {/* Keep Unread: .large custom base_primary / content_primary; Mark as Read: highlight2.baseInverse / white; both with
            the .conversation glow: no border, a black 0.3 shadow (AllUnreadsPresenter.swift:251-290; AllUnreadsThemePublisher.swift:36-55) */}
        <span className="catch-up__button-wrap">
          <SKButton
            className="catch-up__button"
            title="Keep Unread"
            buttonStyle="custom"
            size="large"
            customColors={{ backgroundColor: 'var(--dt_color_base_primary)', titleColor: 'var(--dt_color_content_primary)', borderColor: 'transparent' }}
            onClick={() => {
              haptic()
              swipe('left', { forced: true })
            }}
            data-qa="catch_up_keep_unread"
          />
        </span>
        <MarkAsReadButton onTap={() => swipe('right', { forced: true })} onMarkAll={markAll} />
      </div>

      <div className="catch-up__completion" aria-hidden={!completed}>
        {/* a 48 pt emoji over headline 28 in the theme's text color, 240 pt wide, 8 pt apart; Done (.primary .large) */}
        <div className="catch-up__completion-stack">
          <Emoji name={completion.emoji} size={48} />
          <div className="catch-up__completion-title">{completion.text}</div>
        </div>
        <div className="catch-up__completion-buttons">
          <SKButton title="Done" buttonStyle="primary" size="large" onClick={() => pop()} data-qa="catch_up_done" />
        </div>
      </div>
    </div>
  )
}

/** Mark as Read, whose long press offers "Mark all as Read" (markAllAsReadMenu, AllUnreadsPresenter.swift:292-306). */
function MarkAsReadButton({ onTap, onMarkAll }: { onTap: () => void; onMarkAll: () => void }) {
  const lp = useLongPress((el) =>
    openMenu({ anchor: el, sections: [{ items: [{ title: 'Mark all as Read', icon: 'trash', destructive: true, onSelect: onMarkAll }] }] }),
  )
  return (
    <span className="catch-up__button-wrap" {...lp}>
      <SKButton
        className="catch-up__button"
        title="Mark as Read"
        buttonStyle="custom"
        size="large"
        customColors={{ backgroundColor: 'var(--dt_color_base_inverse_highlight_2)', titleColor: 'var(--dt_color_constants_white)', borderColor: 'transparent' }}
        onClick={() => {
          haptic()
          onTap()
        }}
        data-qa="catch_up_mark_read"
      />
    </span>
  )
}
