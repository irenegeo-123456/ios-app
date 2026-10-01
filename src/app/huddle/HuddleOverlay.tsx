import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { useDevice } from '../../sim/store'
import { Emoji } from '../../emoji/Emoji'
import { SKMemberAvatar } from '../../slackkit/SKMemberAvatar'
import { displayName } from '../../messagekit/format'
import { useHuddle, useMyRoom, type PipCorner } from './state'
import { openCallSheet } from './actions'
import './huddle.css'

// The minimized huddle, the in-app picture in picture (spec search-slackbot-huddles.md §3.9): shown while you're in a
// huddle and its sheet isn't up. A 200 pt square tile, radius 12 (HuddlesPIPViewController.swift:24-28, 144-192;
// HuddlesPIPParticipantView.swift:93), showing the active speaker's avatar on sk_foreground_min_solid_dark, or "You’re the
// only one here" when you're alone; "+N" for everyone not shown in a 32 pt box 12 pt from the bottom-right; the latest
// reaction as a chip 6 pt from the top-left. Tap reopens the sheet. Drag it and it snaps to the nearest corner inside
// 116 top / 12 left / 168 bottom / 12 right (the safe area where larger), projected with the release velocity
// (PictureInPictureViewController.swift:22-29, 269-273, 480-560); it starts top-right. Pressed it scales to 0.9 (0.4 s,
// damping 0.7, :198-211); it zooms in on appear (0.9 → 1 and alpha 0 → 1, 0.4 s, damping 0.6, after 0.1 s, :595-605).

const SIZE = 200
const INSETS = { top: 116, left: 12, bottom: 168, right: 12 }

export function HuddleOverlay() {
  const room = useMyRoom()
  const callOpen = useApp((s) => s.sheets.some((x) => x.type === 'huddle-call'))
  const foreground = useApp((s) => s.foreground)
  const shown = !!room && !callOpen && foreground
  // Keep it mounted through its zoom-out.
  const [mounted, setMounted] = useState(shown)
  useEffect(() => {
    if (shown) setMounted(true)
    else {
      const t = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(t)
    }
  }, [shown])
  if (!mounted || !room) return null
  return <Pip visible={shown} />
}

function Pip({ visible }: { visible: boolean }) {
  const room = useMyRoom()!
  const fx = useApp((s) => s.fx)
  const feed = useHuddle((s) => s.feed)
  const corner = useHuddle((s) => s.pipCorner)
  const device = useDevice()
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x0: number; y0: number; left: number; top: number; moved: boolean; samples: { t: number; x: number; y: number }[] } | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [pressed, setPressed] = useState(false)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const inset = { top: Math.max(INSETS.top, device.safeTop), left: INSETS.left, bottom: Math.max(INSETS.bottom, device.safeBottom), right: INSETS.right }
  const cornerPos = (c: PipCorner) => ({
    left: c.endsWith('Left') ? inset.left : device.width - inset.right - SIZE,
    top: c.startsWith('top') ? inset.top : device.height - inset.bottom - SIZE,
  })
  const rest = cornerPos(corner)
  const at = pos ?? rest

  // Who shows: the active speaker, else the last one, else the first person who isn't you (HuddlesPIPPresenter).
  const others = room.peers.filter((p) => p.userId !== fx.me)
  const shownId = room.speakerId ?? room.lastSpeakerId ?? others[0]?.userId
  const shownUser = shownId ? fx.users[shownId] : undefined
  const alone = room.peers.length <= 1
  const plus = shownUser ? room.peers.length - 1 : 0
  const latest = feed.filter((p) => !p.text && !p.leaving).at(-1)

  const scale = () => {
    const screen = ref.current?.closest('.ios-screen') as HTMLElement | null
    return screen ? screen.getBoundingClientRect().width / screen.offsetWidth || 1 : 1
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current = { x0: e.clientX, y0: e.clientY, left: at.left, top: at.top, moved: false, samples: [{ t: performance.now(), x: at.left, y: at.top }] }
    setPressed(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const s = scale()
    const dx = (e.clientX - d.x0) / s
    const dy = (e.clientY - d.y0) / s
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    d.moved = true
    const next = { left: d.left + dx, top: d.top + dy }
    d.samples.push({ t: performance.now(), x: next.left, y: next.top })
    while (d.samples.length > 3) d.samples.shift()
    setPos(next)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    setPressed(false)
    if (!d) return
    if (!d.moved) return openCallSheet()
    // Project where it would decelerate to (UIScrollView .normal) and settle on the closest corner.
    const a = d.samples[0]
    const b = d.samples.at(-1)!
    const dt = Math.max(1, b.t - a.t)
    const vx = (b.x - a.x) / dt
    const vy = (b.y - a.y) / dt
    const project = (v: number) => (v * 0.998) / (1 - 0.998)
    const cx = b.x + project(vx) + SIZE / 2
    const cy = b.y + project(vy) + SIZE / 2
    const corners: PipCorner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']
    const best = corners.reduce((m, c) => {
      const p = cornerPos(c)
      const dist = Math.hypot(p.left + SIZE / 2 - cx, p.top + SIZE / 2 - cy)
      return dist < m.dist ? { c, dist } : m
    }, { c: corner, dist: Infinity })
    useHuddle.setState({ pipCorner: best.c })
    setPos(null)
  }

  return (
    <div
      ref={ref}
      className={['huddle-pip', entered && visible && 'is-visible', pos && 'is-dragging', pressed && 'is-pressed'].filter(Boolean).join(' ')}
      style={{ left: at.left, top: at.top, width: SIZE, height: SIZE }}
      role="button"
      aria-label="Picture in Picture"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-no-swipe
      data-qa="huddle_pip"
    >
      <div className="huddle-pip__content">
        {shownUser && !alone ? (
          <SKMemberAvatar src={shownUser.avatar} name={shownUser.realName} size={SIZE} style={{ borderRadius: 0 }} />
        ) : (
          <div className="huddle-pip__alone">You’re the only one here</div>
        )}
        {latest && (
          <span key={latest.key} className="huddle-chip huddle-pip__notice">
            {latest.emojis.slice(-1).map((e) => (
              <Emoji key={e} name={e} size={20} />
            ))}
            <span>{latest.userId === fx.me ? 'You' : displayName(latest.userId ? fx.users[latest.userId] : undefined)}</span>
          </span>
        )}
        {plus > 0 && <span className="huddle-pip__count">+{plus}</span>}
      </div>
    </div>
  )
}
