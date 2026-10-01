import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useApp, type NavEntry, type Tab } from '../store'
import { screenDef } from './registry'
import { Guard } from '../ui/Guard'

// One tab's navigation: the root screen, then pushed screens on top. The first screen over the root is Slack's
// conversation panel (DoublePanelView, spec shell-navigation.md §3.6): it slides in over 0.3 s (spring, no bounce)
// while the root shifts 15 % left, with a soft shadow on its edge, and a swipe right anywhere closes it. Deeper
// pushes (thread, details) are UIKit's: 0.35 s, the screen below moves 30 % under a dimming shade, and the swipe starts
// at the left edge. The mouse stands in for a finger, as in Simulator.app. Every screen stays mounted while it's on
// the stack, so scroll positions survive a round trip.

const DURATION = 350
const PANEL_DURATION = 300
/** UIKit's navigation transition curve, approximated */
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const PARALLAX = 0.3
const PANEL_PARALLAX = 0.15

type Phase = 'idle' | 'enter' | 'leave'
interface Layer {
  key: string
  entry: NavEntry | null
  phase: Phase
}

export function StackView({ tab, root }: { tab: Tab; root: ReactNode }) {
  const entries = useApp((s) => s.stacks[tab])
  const pop = useApp((s) => s.pop)
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: 'root', entry: null, phase: 'idle' }, ...entries.map((e) => ({ key: e.key, entry: e, phase: 'idle' as Phase }))])
  const mounted = useRef(false)

  // Diff the store's stack against what's drawn: new entries enter, removed ones leave (and are dropped after).
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setLayers((prev) => {
      const keys = new Set(entries.map((e) => e.key))
      const next: Layer[] = [prev[0]]
      const stays = prev.slice(1).map((l) => keys.has(l.key))
      for (const [i, l] of prev.slice(1).entries()) {
        if (stays[i]) next.push({ ...l, phase: l.phase === 'leave' ? 'idle' : l.phase })
        // a screen removed from under one that stays goes without an animation, as UINavigationController
        // .setViewControllers drops the controllers it no longer lists (Sept's .resetNavigationStack,
        // RootTabViewController.swift:123-124: setFeatures([root, feature]))
        else if (stays.slice(i + 1).some(Boolean)) continue
        else if (l.phase !== 'leave') next.push({ ...l, phase: 'leave' })
        else next.push(l)
      }
      for (const e of entries) if (!prev.some((l) => l.key === e.key)) next.push({ key: e.key, entry: e, phase: 'enter' })
      // Keep leaving layers above the ones that stay, in stack order.
      return [next[0], ...next.slice(1).filter((l) => l.phase !== 'leave'), ...next.slice(1).filter((l) => l.phase === 'leave')]
    })
  }, [entries])

  const settled = (key: string) =>
    setLayers((prev) => prev.flatMap((l) => (l.key !== key ? [l] : l.phase === 'leave' ? [] : [{ ...l, phase: 'idle' as Phase }])))

  const live = layers.filter((l) => l.phase !== 'leave')
  const topIndex = live.length - 1
  const leaving = layers.some((l) => l.phase === 'leave')

  // ---- interactive pop (edge swipe)
  const containerRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    x0: number
    y0: number
    t0: number
    w: number
    top: HTMLElement
    below: HTMLElement
    shade: HTMLElement | null
    dx: number
    started: boolean
    parallax: number
    pointerId: number
    target: Element
  } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (topIndex < 1 || leaving || e.button !== 0) return
    const box = containerRef.current!.getBoundingClientRect()
    const scale = box.width / containerRef.current!.offsetWidth
    const x = (e.clientX - box.left) / scale
    // The conversation panel closes with a swipe from anywhere; deeper screens from the left edge.
    if (x > 24 && topIndex !== 1) return
    if ((e.target as Element).closest('input, textarea, [contenteditable="true"], [data-scroll-x], [data-no-swipe]')) return
    const els = containerRef.current!.querySelectorAll<HTMLElement>(':scope > .ios-nav-layer:not(.is-leaving)')
    const top = els[els.length - 1]
    const below = els[els.length - 2]
    if (!top || !below) return
    drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), w: containerRef.current!.offsetWidth, top, below, shade: below.querySelector(':scope > .ios-nav-shade'), dx: 0, started: false, parallax: topIndex === 1 ? PANEL_PARALLAX : PARALLAX, pointerId: e.pointerId, target: e.target as Element }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const box = containerRef.current!.getBoundingClientRect()
    const scale = box.width / d.w
    const rawX = (e.clientX - d.x0) / scale
    const rawY = (e.clientY - d.y0) / scale
    if (!d.started) {
      // Only a mostly-horizontal drag to the right is a swipe back (DoublePanelViewController: slope < 0.6).
      if (Math.hypot(rawX, rawY) < 8) return
      if (rawX <= 0 || Math.abs(rawY) / Math.abs(rawX) > 0.6) {
        drag.current = null
        return
      }
      d.started = true
      containerRef.current!.setPointerCapture?.(d.pointerId)
      d.top.style.transition = d.below.style.transition = 'none'
      if (d.shade) d.shade.style.transition = 'none'
      d.below.style.visibility = 'visible'
    }
    d.dx = Math.max(0, rawX)
    const p = Math.min(1, d.dx / d.w)
    d.top.style.transform = `translateX(${d.dx}px)`
    d.below.style.transform = `translateX(${-d.parallax * d.w * (1 - p)}px)`
    if (d.shade) d.shade.style.opacity = String(1 - p)
  }
  const onPointerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (!d.started) return
    const velocity = d.dx / Math.max(1, performance.now() - d.t0)
    const complete = d.dx > d.w / 2 || velocity > 0.5
    const t = `transform ${DURATION}ms ${EASE}`
    d.top.style.transition = d.below.style.transition = t
    if (d.shade) d.shade.style.transition = `opacity ${DURATION}ms ${EASE}`
    if (complete) {
      d.top.style.transform = `translateX(${d.w}px)`
      d.below.style.transform = 'translateX(0)'
      if (d.shade) d.shade.style.opacity = '0'
      setTimeout(() => {
        for (const el of [d.top, d.below, d.shade]) if (el) el.style.cssText = el.style.cssText.replace(/transform[^;]*;|transition[^;]*;|opacity[^;]*;|visibility[^;]*;/g, '')
        // Already offscreen: drop the layer without animating it out again.
        const key = live[topIndex].key
        setLayers((prev) => prev.filter((l) => l.key !== key))
        pop(tab)
      }, DURATION)
    } else {
      d.top.style.transform = 'translateX(0)'
      d.below.style.transform = `translateX(${-d.parallax * d.w}px)`
      if (d.shade) d.shade.style.opacity = '1'
      setTimeout(() => {
        for (const el of [d.top, d.below, d.shade]) if (el) el.style.cssText = el.style.cssText.replace(/transform[^;]*;|transition[^;]*;|opacity[^;]*;|visibility[^;]*;/g, '')
      }, DURATION)
    }
  }

  return (
    <div className="ios-nav" ref={containerRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {layers.map((l) => {
        const i = live.indexOf(l)
        const covered = l.phase !== 'leave' && i < topIndex
        // Only the top screen and the one right below it are ever visible.
        const hidden = l.phase !== 'leave' && i < topIndex - 1 && !leaving
        const coveredByLeaving = leaving && i === topIndex
        // A layer's own transition is the panel's when it's the first over the root; the one it covers moves by
        // the parallax of the layer above it.
        const depth = l.phase === 'leave' ? layers.filter((x) => x.phase !== 'leave').length : i
        const aboveDepth = i + 1
        return (
          <LayerView
            key={l.key}
            panel={depth === 1}
            parallax={aboveDepth === 1 || (leaving && i === 0) ? PANEL_PARALLAX : PARALLAX}
            layer={l}
            covered={covered && !(leaving && i === topIndex)}
            uncovering={coveredByLeaving}
            hidden={hidden}
            onSettled={() => settled(l.key)}
          >
            {l.entry ? <Screen entry={l.entry} /> : root}
          </LayerView>
        )
      })}
    </div>
  )
}

function LayerView({
  layer,
  covered,
  uncovering,
  hidden,
  panel,
  parallax,
  onSettled,
  children,
}: {
  layer: Layer
  covered: boolean
  uncovering: boolean
  hidden: boolean
  panel: boolean
  parallax: number
  onSettled: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (layer.phase === 'idle') return
    const t = setTimeout(onSettled, (panel ? PANEL_DURATION : DURATION) + 30)
    return () => clearTimeout(t)
  }, [layer.phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const cls = ['ios-nav-layer', panel && 'is-panel', layer.phase === 'enter' && 'is-entering', layer.phase === 'leave' && 'is-leaving', covered && 'is-covered', uncovering && 'is-uncovering', hidden && 'is-hidden']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      ref={ref}
      className={cls}
      style={{ ['--nav-dur' as string]: `${panel ? PANEL_DURATION : DURATION}ms`, ['--nav-ease' as string]: EASE, ['--nav-parallax' as string]: `${-parallax * 100}%` }}
      data-layer={layer.key}
      aria-hidden={covered || hidden || undefined}
    >
      {children}
      <div className="ios-nav-shade" />
    </div>
  )
}

function Screen({ entry }: { entry: NavEntry }) {
  const def = screenDef(entry.route.screen)
  if (!def) return <MissingScreen name={entry.route.screen} />
  const C = def.component
  return (
    <Guard name={`screen ${entry.route.screen}`}>
      <C route={entry.route} />
    </Guard>
  )
}

function MissingScreen({ name }: { name: string }) {
  const pop = useApp((s) => s.pop)
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--dt_color_base_primary)', padding: 24, textAlign: 'center' }}>
      <div>
        <p style={{ font: '700 17px Lato' }}>No screen called “{name}”</p>
        <p style={{ font: '15px Lato', color: 'var(--dt_color_content_secondary)' }}>Register it with registerScreen() in src/app/screens.</p>
        <button type="button" onClick={() => pop()} style={{ font: '700 15px Lato', marginTop: 12 }}>
          Back
        </button>
      </div>
    </div>
  )
}

export const NAV_DURATION = DURATION
export const NAV_EASE = EASE
