import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { SKTokenView, type SKTokenViewProps } from './SKTokenView'
import { cx } from './util'
import './tokens.css'

// SKTokenBar (DesignerComponents/TokenBar/SKTokenBar.swift, SKTokenBarLayoutEngine.swift, SKTokenBarLayoutCursor.swift):
// a wrapping row of SKTokenViews, 8 pt apart and 8 pt between rows, limited to maximumRowCount rows (2; 0 = no limit)
// with the rest collapsed into a "+N" token (a resolved token with no ornament). A token wider than the row is clamped
// to it. Empty with a placeholder: Lato 17 in contentTertiary (September 2026; June sk_foreground_high_solid). The layout is the iOS engine's own backtracking
// (it tries the next token, then the next row, then "+N" after the current token, then backs up one token).
// Spec: slackkit-components.md › SKTokenBar.
//
//   <SKTokenBar tokens={people.map((p) => ({ ornament: { member: { src: p.avatar } }, text: p.name, isDismissible: true }))}
//               onTokenDismissed={(i) => remove(i)} />

interface Props {
  tokens: SKTokenViewProps[]
  maximumRowCount?: number
  /** emphasized (Lato Bold 17, default) or light (Lato 17) token text */
  styling?: 'emphasized' | 'light'
  placeholder?: string
  onTokenTapped?: (index: number) => void
  onTokenDismissed?: (index: number) => void
  onOverflowTapped?: () => void
  className?: string
  style?: CSSProperties
}

type Size = { w: number; h: number }
type Placed = { item: number | 'more'; n?: number }

/** SKTokenBarLayoutEngine.layout, ported: which tokens show, and where "+N" goes. */
export function tokenBarLayout(width: number, sizes: Size[], moreSize: (n: number) => Size, maximumRowCount: number): Placed[] {
  interface Cursor {
    x: number
    y: number
    maxY: number
    next: number
    rows: number | null
    layout: Placed[]
    layingOutMore: boolean
  }
  const clone = (c: Cursor): Cursor => ({ ...c, layout: [...c.layout] })
  const restore = (c: Cursor, from: Cursor) => Object.assign(c, clone(from))
  const fail = () => {
    throw new Error('layout')
  }
  const lead = (c: Cursor) => (c.x !== 0 ? 8 : 0)
  const verifySpace = (c: Cursor, s: Size) => {
    if (lead(c) + Math.min(s.w, width) > width - c.x) fail()
  }
  const position = (c: Cursor, s: Size, p: Placed) => {
    c.x += lead(c)
    c.maxY = Math.max(c.maxY, c.y + s.h)
    c.layout.push(p)
    c.x += Math.min(s.w, width)
  }
  const moveToNextRow = (c: Cursor) => {
    if (!((c.rows ?? 2) > 1)) fail()
    c.x = 0
    c.y = c.maxY + 8
    if (c.rows !== null) c.rows -= 1
  }
  const layoutNext = (c: Cursor): void => {
    if (c.next >= sizes.length) return
    const before = clone(c)
    verifySpace(c, sizes[c.next])
    try {
      if (c.layingOutMore) fail()
      position(c, sizes[c.next], { item: c.next })
      c.next += 1
      return layoutNext(c)
    } catch {
      // continue with the cursor as the failed attempt left it, like the Swift inout cursor
    }
    const beforeNextRow = clone(c)
    try {
      if (c.layingOutMore) fail()
      moveToNextRow(c)
      return layoutNext(c)
    } catch {
      restore(c, beforeNextRow)
    }
    try {
      const remaining = sizes.length - c.next
      const more = moreSize(remaining)
      verifySpace(c, more)
      position(c, more, { item: 'more', n: remaining })
    } catch {
      restore(c, before)
      c.layingOutMore = true
      fail()
    }
  }
  const cursor: Cursor = { x: 0, y: 0, maxY: 0, next: 0, rows: maximumRowCount === 0 ? null : maximumRowCount, layout: [], layingOutMore: false }
  try {
    layoutNext(cursor)
  } catch {
    if (!sizes.length) return []
    return sizes.length > 1 ? [{ item: 'more', n: sizes.length }] : [{ item: 0 }]
  }
  return cursor.layout
}

export function SKTokenBar({ tokens, maximumRowCount = 2, styling = 'emphasized', placeholder, onTokenTapped, onTokenDismissed, onOverflowTapped, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const measure = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Placed[] | null>(null)
  const font = styling === 'light' ? 'var(--sk-body)' : undefined
  const moreFont = styling === 'light' ? 'var(--sk-body)' : 'var(--sk-body-bold)'

  useLayoutEffect(() => {
    const el = ref.current
    const m = measure.current
    if (!el || !m) return
    const run = () => {
      const chips = [...m.children] as HTMLElement[]
      const sizes = chips.slice(0, tokens.length).map((c) => ({ w: c.offsetWidth, h: c.offsetHeight }))
      const mores = chips.slice(tokens.length).map((c) => ({ w: c.offsetWidth, h: c.offsetHeight }))
      setLayout(tokenBarLayout(el.clientWidth, sizes, (n) => mores[n - 1] ?? mores[mores.length - 1] ?? { w: 0, h: 0 }, maximumRowCount))
    }
    run()
    // re-measure when the bar resizes, and when the tokens' own sizes change (web fonts arriving)
    const ro = new ResizeObserver(run)
    ro.observe(el)
    ro.observe(m)
    return () => ro.disconnect()
  }, [tokens, maximumRowCount, styling])

  if (!tokens.length)
    return (
      <div className={cx('sk-token-bar', className)} style={style}>
        {placeholder && <div className="sk-token-bar__placeholder">{placeholder}</div>}
      </div>
    )
  const shown = layout ?? tokens.map((_, i) => ({ item: i }) as Placed)
  return (
    <div ref={ref} className={cx('sk-token-bar', className)} style={style}>
      <div className="sk-token-bar__rows">
        {shown.map((p) =>
          p.item === 'more' ? (
            <SKTokenView key="more" text={`+${p.n}`} font={moreFont} onViewTapped={onOverflowTapped} accessibilityLabel={`Show ${p.n} more`} />
          ) : (
            <SKTokenView
              key={p.item}
              font={font}
              {...tokens[p.item]}
              onViewTapped={tokens[p.item].onViewTapped ?? (onTokenTapped ? () => onTokenTapped(p.item as number) : undefined)}
              onDismissTapped={() => {
                tokens[p.item as number].onDismissTapped?.()
                onTokenDismissed?.(p.item as number)
              }}
            />
          ),
        )}
      </div>
      {/* measures every token and each "+N" candidate at its natural width */}
      <div ref={measure} className="sk-token-bar__measure" aria-hidden>
        {tokens.map((t, i) => (
          <SKTokenView key={i} font={font} {...t} />
        ))}
        {tokens.map((_, i) => (
          <SKTokenView key={`m${i}`} text={`+${i + 1}`} font={moreFont} />
        ))}
      </div>
    </div>
  )
}
