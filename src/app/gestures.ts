import { useCallback, useEffect, useRef } from 'react'

// Touch, played with a mouse (Simulator.app does the same): drag any scroll view to scroll it, with iOS-style momentum
// when you let go; press and hold for a long press; tappable rows highlight while pressed. A trackpad or wheel
// scrolls natively, and real touch screens keep their own scrolling (only mouse and pen pointers are handled here).
//
//   installTouchGestures(screenEl)            once, on .ios-screen (Simulator does it)
//   <div className="ios-scroll">              any vertical scroller; data-scroll-x for horizontal ones
//   <div data-tap>                            highlight while pressed (.is-pressed)
//   const lp = useLongPress(onLongPress)      spread {...lp} on the element; fires after 500 ms without moving

const DRAG_SLOP = 6
/** UIScrollView.DecelerationRate.normal is 0.998 per millisecond */
const DECELERATION = 0.998
const HIGHLIGHT_DELAY = 70
export const LONG_PRESS_MS = 500

let dragging = false
/** true while a mouse drag is scrolling something (long presses and taps are cancelled) */
export const isScrollDragging = () => dragging

let suppressClick = false

function scrollParent(el: Element | null, axis: 'y' | 'x'): HTMLElement | null {
  for (let n = el as HTMLElement | null; n && !n.classList.contains('ios-screen'); n = n.parentElement) {
    if (axis === 'y' && (n.classList.contains('ios-scroll') || n.hasAttribute('data-scroll')) && n.scrollHeight > n.clientHeight + 1) return n
    if (axis === 'x' && n.hasAttribute('data-scroll-x') && n.scrollWidth > n.clientWidth + 1) return n
  }
  return null
}

const isField = (el: Element | null) => !!el?.closest('input, textarea, select, [contenteditable="true"], [data-no-drag]')

export function installTouchGestures(screen: HTMLElement) {
  let start: { x: number; y: number; id: number; target: Element } | null = null
  let scroller: HTMLElement | null = null
  let axis: 'x' | 'y' = 'y'
  let origin = 0
  let samples: { t: number; p: number }[] = []
  let momentum = 0
  let pressed: HTMLElement | null = null
  let pressTimer = 0

  const scale = () => screen.getBoundingClientRect().width / screen.offsetWidth || 1
  const clearPress = () => {
    clearTimeout(pressTimer)
    pressed?.classList.remove('is-pressed')
    pressed = null
  }

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || e.button !== 0) return
    cancelAnimationFrame(momentum)
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, target: e.target as Element }
    scroller = null
    const tap = (e.target as Element).closest<HTMLElement>('[data-tap]')
    if (tap) {
      pressTimer = window.setTimeout(() => {
        pressed = tap
        tap.classList.add('is-pressed')
      }, HIGHLIGHT_DELAY)
    }
  }

  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return
    const s = scale()
    const dx = (e.clientX - start.x) / s
    const dy = (e.clientY - start.y) / s
    if (!dragging) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return
      clearPress()
      if (isField(start.target)) return
      // Drag the way the finger moved: mostly sideways scrolls a horizontal scroller, else the vertical one.
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      scroller = scrollParent(start.target, axis)
      if (!scroller) {
        start = null
        return
      }
      // A sheet at the top of its content is dragged by the sheet itself (to dismiss it).
      if (axis === 'y' && dy > 0 && scroller.scrollTop <= 0 && scroller.closest('.ios-sheet')) {
        scroller = null
        start = null
        return
      }
      dragging = true
      suppressClick = true
      origin = axis === 'y' ? scroller.scrollTop : scroller.scrollLeft
      samples = []
      screen.setPointerCapture?.(e.pointerId)
      screen.classList.add('is-scroll-dragging')
    }
    if (!scroller) return
    const d = axis === 'y' ? dy : dx
    const pos = origin - d
    if (axis === 'y') scroller.scrollTop = pos
    else scroller.scrollLeft = pos
    const now = performance.now()
    samples.push({ t: now, p: pos })
    while (samples.length > 2 && now - samples[0].t > 100) samples.shift()
    e.preventDefault()
  }

  const onUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return
    start = null
    if (pressed) {
      const p = pressed
      setTimeout(() => p.classList.remove('is-pressed'), 60)
      pressed = null
    }
    clearTimeout(pressTimer)
    if (!dragging || !scroller) return
    dragging = false
    screen.classList.remove('is-scroll-dragging')
    const el = scroller
    const ax = axis
    const first = samples[0]
    const last = samples.at(-1)
    let v = first && last && last.t > first.t ? (last.p - first.p) / (last.t - first.t) : 0
    let t0 = performance.now()
    const step = (t: number) => {
      const dt = t - t0
      t0 = t
      v *= Math.pow(DECELERATION, dt)
      if (Math.abs(v) < 0.02) return
      if (ax === 'y') el.scrollTop += v * dt
      else el.scrollLeft += v * dt
      momentum = requestAnimationFrame(step)
    }
    if (Math.abs(v) > 0.1) momentum = requestAnimationFrame(step)
  }

  // A drag that scrolled isn't a tap.
  const onClick = (e: MouseEvent) => {
    if (!suppressClick) return
    suppressClick = false
    e.stopPropagation()
    e.preventDefault()
  }
  const onWheel = () => cancelAnimationFrame(momentum)

  screen.addEventListener('pointerdown', onDown, true)
  screen.addEventListener('pointermove', onMove, true)
  screen.addEventListener('pointerup', onUp, true)
  screen.addEventListener('pointercancel', onUp, true)
  screen.addEventListener('click', onClick, true)
  screen.addEventListener('wheel', onWheel, { passive: true })
  return () => {
    screen.removeEventListener('pointerdown', onDown, true)
    screen.removeEventListener('pointermove', onMove, true)
    screen.removeEventListener('pointerup', onUp, true)
    screen.removeEventListener('pointercancel', onUp, true)
    screen.removeEventListener('click', onClick, true)
    screen.removeEventListener('wheel', onWheel)
  }
}

/** Installs the gestures on the simulated screen. */
export function useTouchGestures() {
  useEffect(() => {
    const screen = document.querySelector<HTMLElement>('.ios-screen')
    if (!screen) return
    return installTouchGestures(screen)
  }, [])
}

/**
 * Press and hold. Returns handlers to spread on the element. A right click also counts (a shortcut for the mouse).
 * The click that ends a long press is swallowed, so the element's onClick only fires for short taps.
 */
export function useLongPress(onLongPress: (el: HTMLElement) => void, ms = LONG_PRESS_MS) {
  const timer = useRef(0)
  const fired = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    origin.current = null
  }, [])
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      const el = e.currentTarget
      timer.current = window.setTimeout(() => {
        if (isScrollDragging()) return
        fired.current = true
        el.classList.remove('is-pressed')
        onLongPress(el)
      }, ms)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (origin.current && Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > DRAG_SLOP) cancel()
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      cancel()
      fired.current = true
      onLongPress(e.currentTarget)
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        fired.current = false
        e.stopPropagation()
        e.preventDefault()
      }
    },
  }
}
