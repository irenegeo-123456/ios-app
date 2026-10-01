import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/store'
import { useLongPress } from '../app/gestures'
import { Emoji, findEmoji, parseEmojiName } from '../emoji/Emoji'
import { Icon } from '../icons/Icon'
import type { Reaction } from '../data/types'

// The reactions bar under a message (SKReacjiBar + SKReacjiPill, spec messages.md §6): pills with the emoji and the
// count, blue when you reacted; collapsed to two rows with an "N more" pill; the add-reaction pill last. Tap a pill to
// toggle your reaction, press and hold (0.25 s) for who reacted.

/** 8 pt between pills and between rows (SKReacjiBar.swift:25-28) */
const GAP = 8
/** transcript bars collapse to 2 rows (MessageTransformationMapper.swift:163, 265) */
const MAX_ROWS = 2
/** a long press fires after 0.25 s, on begin (SKReacjiPill.swift:44, 92-96) */
const LONG_PRESS = 250
/** skin-tone variants shown before "… N" (SKReacjiPill.swift:42, 409-418) */
const MAX_VARIANTS = 6

interface Pill {
  /** the reaction's base name, what toggleReaction and the reactors sheet get */
  name: string
  /** the emoji drawn in the pill: the base, or each skin-tone variant used */
  variants: string[]
  /** the variants you used */
  own: string[]
  count: number
  selected: boolean
}

type Placed = { kind: 'reaction'; pill: Pill } | { kind: 'more'; hidden: number } | { kind: 'less' } | { kind: 'add' }

/** Skin-tone variants of one emoji merge into one pill, counts summed, selected if you used any (ReactionsMapper.swift:122-139). */
function mergePills(reactions: Reaction[], me: string): Pill[] {
  const out: Pill[] = []
  for (const r of reactions) {
    if (!r.users.length) continue
    const { base } = parseEmojiName(r.name)
    const found = out.find((p) => p.name === base || parseEmojiName(p.name).base === base)
    const mine = r.users.includes(me)
    if (found) {
      found.variants.push(r.name)
      if (mine) found.own.push(r.name)
      found.count += r.users.length
      found.selected ||= mine
    } else out.push({ name: r.name, variants: [r.name], own: mine ? [r.name] : [], count: r.users.length, selected: mine })
  }
  return out
}

// ---------------------------------------------------------------------------------------------- measuring pills

let canvas: CanvasRenderingContext2D | null = null
/** A label's width in Lato Bold 13, rounded up to the @3x pixel grid as UIKit lays labels out. */
function labelWidth(text: string): number {
  canvas ??= document.createElement('canvas').getContext('2d')
  if (!canvas) return text.length * 7.5
  canvas.font = '700 13px Lato'
  return Math.ceil(canvas.measureText(text).width * 3) / 3
}

/** SKReacjiPill.size: 8 + emoji (22 each, 2 apart) + 2 + label (2 + text + 2) + 8 (SKReacjiPill.swift:36-40, 212-239). */
function pillWidth(items: number, label?: string): number {
  const parts: number[] = []
  for (let i = 0; i < items; i++) parts.push(22)
  if (label) parts.push(labelWidth(label) + 4)
  return 16 + parts.reduce((a, b) => a + b, 0) + Math.max(0, parts.length - 1) * 2
}

const countLabel = (p: Pill) => (p.variants.length > MAX_VARIANTS ? `… ${p.count}` : String(p.count)) // `ellipsis_with_count`, yaml:6148
const moreLabel = (n: number) => `${n} more` // `show_number_more` "%@ more", yaml:18978
const LESS_LABEL = 'Show less' // `show_less`, yaml:18960

const widthOf = (p: Placed): number => {
  switch (p.kind) {
    case 'reaction':
      return pillWidth(Math.min(p.pill.variants.length, MAX_VARIANTS), countLabel(p.pill))
    case 'more':
      return pillWidth(0, moreLabel(p.hidden))
    case 'less':
      return pillWidth(0, LESS_LABEL)
    case 'add':
      return pillWidth(1)
  }
}

/** SKReacjiBar.pillLayout (SKReacjiBar.swift:363-559), ported: which pills show, with the "N more" / "Show less" / add pills. */
function layoutPills(pills: Pill[], width: number, collapsed: boolean, showAdd: boolean): Placed[] {
  let x = 0
  let row = 0
  const placed: { p: Placed; x: number; w: number; row: number }[] = []
  const add = (p: Placed) => {
    const w = Math.min(widthOf(p), width)
    const spacing = x === 0 ? 0 : GAP
    if (x + spacing + w > width) {
      if (collapsed && row + 1 === MAX_ROWS) return false
      row += 1
      x = 0
    } else x += spacing
    placed.push({ p, x, w, row })
    x += w
    return true
  }
  const removeLast = () => {
    const last = placed.pop()
    if (!last) return false
    x -= last.w + GAP
    if (x <= 0) {
      const prev = placed.at(-1)
      row = prev?.row ?? 0
      x = prev ? prev.x + prev.w : 0
    }
    return true
  }

  let remaining = 0
  for (let i = 0; i < pills.length; i++) {
    if (!add({ kind: 'reaction', pill: pills[i] })) {
      remaining = pills.length - i
      break
    }
  }
  const required = () => {
    let w = 0
    if (remaining > 0) w += GAP + widthOf({ kind: 'more', hidden: remaining })
    if (showAdd && remaining > 0) w += GAP + widthOf({ kind: 'add' })
    return w
  }
  while (required() > width - x) {
    if (!removeLast()) break
    remaining += 1
  }
  let addedLess = false
  if (remaining > 0) add({ kind: 'more', hidden: remaining })
  else if (!collapsed && row >= MAX_ROWS) {
    add({ kind: 'less' })
    addedLess = true
  }
  if (showAdd) {
    if (!add({ kind: 'add' })) {
      // exactly enough room for the reactions: make space for "N more" and the add pill
      if (removeLast() && removeLast()) {
        remaining += 2
        const more = placed.findIndex((e) => e.p.kind === 'more')
        if (more >= 0) placed.splice(more, 1)
        add({ kind: 'more', hidden: remaining })
        add({ kind: 'add' })
      }
    } else if (!addedLess && !collapsed && row >= MAX_ROWS && removeLast()) {
      add({ kind: 'less' })
      add({ kind: 'add' })
    }
  }
  return placed.map((e) => e.p)
}

// ------------------------------------------------------------------------------------------------ expanded bars

/** "N more" / "Show less" is remembered per message while the app runs (MessageListActionHandler.swift:156-164). */
const expandedBars = new Set<string>()

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Re-measures labels once the web fonts are in (canvas measuring needs Lato). */
function useFontsReady() {
  const [, setTick] = useState(0)
  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => live && setTick((t) => t + 1))
    return () => {
      live = false
    }
  }, [])
}

interface Props {
  conversationId: string
  ts: string
  reactions?: Reaction[]
  /** the add-reaction pill: with at least one reaction in channels and replies, always on a thread root (MessageTransformationMapper.swift:162, 259-266) */
  showAdd?: boolean
  /** reactions are off or the content is read-only: pills don't respond (ReactionsMapper.swift:65-68) */
  readOnly?: boolean
}

export function MKReactions({ conversationId, ts, reactions = [], showAdd, readOnly }: Props) {
  const me = useApp((s) => s.fx.me)
  const key = `${conversationId}/${ts}`
  const [expanded, setExpanded] = useState(() => expandedBars.has(key))
  const [ref, width] = useWidth<HTMLDivElement>()
  useFontsReady()
  const pills = useMemo(() => mergePills(reactions, me), [reactions, me])

  // Only your own actions animate (SKReacjiBar.swift:119-164): a pill that appears with your reaction pops in, a count
  // you raise with a tap slides up. What animated is kept per pill so later renders don't cut the animation short.
  const prev = useRef<Map<string, number> | null>(null)
  const pending = useRef<string | null>(null)
  const anim = useRef({ popped: new Set<string>(), bumped: new Map<string, number>() })
  if (prev.current) {
    for (const p of pills) {
      const before = prev.current.get(p.name)
      if (before === undefined && p.selected) anim.current.popped.add(p.name)
      if (before !== undefined && pending.current === p.name && p.selected && p.count > before) anim.current.bumped.set(p.name, p.count)
    }
    for (const name of anim.current.popped) if (!pills.some((p) => p.name === name)) anim.current.popped.delete(name)
  }
  useEffect(() => {
    prev.current = new Map(pills.map((p) => [p.name, p.count]))
    pending.current = null
  })

  if (!pills.length && !showAdd) return null
  const placed = width ? layoutPills(pills, width, !expanded, !!showAdd) : pills.map((pill): Placed => ({ kind: 'reaction', pill }))
  const toggle = () => {
    const next = !expanded
    if (next) expandedBars.add(key)
    else expandedBars.delete(key)
    setExpanded(next)
  }
  return (
    <div className="mk-reactions" ref={ref} role="group" aria-label="Reactions">
      {placed.map((p) => {
        switch (p.kind) {
          case 'reaction':
            return (
              <ReactionPill
                key={p.pill.name}
                pill={p.pill}
                conversationId={conversationId}
                ts={ts}
                readOnly={readOnly}
                isNew={anim.current.popped.has(p.pill.name)}
                bumped={anim.current.bumped.get(p.pill.name) === p.pill.count}
                onToggle={() => {
                  pending.current = p.pill.name
                }}
              />
            )
          case 'more':
            return <TextPill key="more" label={moreLabel(p.hidden)} onClick={toggle} />
          case 'less':
            return <TextPill key="less" label={LESS_LABEL} onClick={toggle} />
          case 'add':
            return <AddPill key="add" conversationId={conversationId} ts={ts} readOnly={readOnly} isNew={pills.length === 1 && anim.current.popped.has(pills[0].name)} />
        }
      })}
    </div>
  )
}

function ReactionPill({
  pill,
  conversationId,
  ts,
  readOnly,
  isNew,
  bumped,
  onToggle,
}: {
  pill: Pill
  conversationId: string
  ts: string
  readOnly?: boolean
  isNew: boolean
  bumped: boolean
  onToggle: () => void
}) {
  const toggleReaction = useApp((s) => s.toggleReaction)
  const presentSheet = useApp((s) => s.presentSheet)
  // Long press → the reactors sheet on this reaction's tab, view-only (PrimaryMessageActionHandler.swift:200-204)
  const lp = useLongPress(() => presentSheet('reactors', { conversationId, ts, name: pill.name }), LONG_PRESS)
  const variants = pill.variants.slice(0, MAX_VARIANTS)
  const label = countLabel(pill)
  const names = pill.variants.map((v) => `:${v}:`).join(' ')
  return (
    <button
      type="button"
      className={['mk-reaction', pill.selected && 'is-selected', isNew && 'is-new'].filter(Boolean).join(' ')}
      aria-pressed={pill.selected}
      aria-label={`${pill.count}, ${names}`}
      data-tap={readOnly ? undefined : true}
      {...(readOnly ? {} : lp)}
      onClick={(e) => {
        e.stopPropagation()
        if (readOnly) return
        // Tap toggles your reaction: removes every variant you used, else adds the base (ReactionAction.swift:79-101)
        onToggle()
        if (pill.selected) pill.own.forEach((v) => toggleReaction(conversationId, ts, v))
        else toggleReaction(conversationId, ts, pill.name)
      }}
    >
      {variants.map((v) => (
        <span key={v} className={`mk-reaction__emoji${findEmoji(v)?.c === 9 ? ' is-custom' : ''}`}>
          <Emoji name={v} size={19} />
        </span>
      ))}
      {/* the label is as wide as UIKit lays it out (rounded up to the pixel grid, + its 2 pt insets), so the pill matches layoutPills */}
      <span key={`c${pill.count}`} className={`mk-reaction__count${bumped ? ' is-bumped' : ''}`} style={{ width: labelWidth(label) + 4 }}>
        {label}
      </span>
    </button>
  )
}

/** "N more" / "Show less": text-only pills styled like unselected ones (SKReacjiBar.swift:568-581). */
function TextPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="mk-reaction mk-reaction--text"
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span className="mk-reaction__count" style={{ width: labelWidth(label) + 4 }}>
        {label}
      </span>
    </button>
  )
}

/** The add-reaction pill: `add_reaction.svg` in a 22 pt frame, content_primary, 38 × 30 (SKReacjiPill.swift:181-192). */
function AddPill({ conversationId, ts, readOnly, isNew }: { conversationId: string; ts: string; readOnly?: boolean; isNew: boolean }) {
  const presentSheet = useApp((s) => s.presentSheet)
  return (
    <button
      type="button"
      className={`mk-reaction mk-reaction--add${isNew ? ' is-new' : ''}`}
      aria-label="Add Reaction" // `add_reaction`, yaml:827
      data-tap={readOnly ? undefined : true}
      onClick={(e) => {
        e.stopPropagation()
        // Tap → the emoji picker (PrimaryMessageActionHandler.swift:229-231)
        if (!readOnly) presentSheet('emoji-picker', { conversationId, ts })
      }}
    >
      <span className="mk-reaction__emoji">
        <Icon name="add_reaction" size={22} />
      </span>
    </button>
  )
}
