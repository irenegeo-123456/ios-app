import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp, type SheetEntry } from '../store'
import { sheetDef, type SheetDef } from './registry'
import { Guard } from '../ui/Guard'
import { useDevice, useSim } from '../../sim/store'
import type { Device } from '../../sim/devices'
import { useScreenChrome } from '../../sim/screen'
import type { StatusBarTone } from '../../sim/StatusBar'

// Everything presented modally, as Slack iOS presents it on iOS 26 (spec sheets-menus.md §0.1–0.2, measurements.md):
//
//   'page'    UISheetPresentationController at the large detent: full width, 38 pt top corners, below the status bar
//   'medium'  UISheetPresentationController with the medium and large detents, starting at medium
//   'fit'     UISheetPresentationController with one self-sized detent (the content's height, at least `fitMinHeight`)
//   'full'    a fullScreen modal: slides up over everything, no dimming, no grabber
//   'overlay' no chrome: the component draws its own (menus, alerts, action sheets, the header menu)
//
// iOS 26 sheets at a partial detent float: 6 pt from the sides and the bottom, 34 pt top corners and bottom corners
// concentric with the display; at the large detent they meet the screen edges. The app behind the first sheet stays
// full size; a sheet presented over another makes the lower one recede (narrower and a few points lower). These are
// UIKit's values, not Slack's: measured on Apple's iOS 26 HIG renders of a 402 × 874 iPhone
// (sheets-medium-detent@2x.png, sheets-large-detent@2x.png, 536 px = 402 pt) and a real Slack iOS 26 screenshot
// (measurements.md). Dimming is black at 20 % (the renders' white app reads 204).
//
// Slack's own bottom sheet (SKBottomSheet, a PanModal port, spec §0.1) is what Slack's sheets use while the
// `bottomsheetMigration` flag is off, its default (Modules/Data/Toggles/Definitions/ios_bottomsheet_migration.json):
// full width, 12 pt top corners, a 48 × 4 grabber, 70 % black dimming, a 0.5 s spring. A sheet opts in with
// configureSheet(name, { chrome: 'legacy', legacy: {…}, migrated: {…} }); setBottomSheetMigration(true) flips them all.
//
// Inside a sheet, useSheet() gives its key, its detent, dismiss(then) (runs `then` once it's gone, like UIKit's
// dismiss(animated:completion:)), expand() and `closing` (overlays animate out on it).

// ------------------------------------------------------------------------------------------------ configuration

/** 'medium', 'large', 'fit' (self-sized), or a number: a fixed content height above the bottom safe area */
export type Detent = 'medium' | 'large' | 'fit' | number

export interface SheetConfig {
  /** 'native' (UISheetPresentationController, the default) or 'legacy' (SKBottomSheet) */
  chrome?: 'native' | 'legacy'
  /** native detents, smallest first */
  detents?: Detent[]
  initialDetent?: Detent
  /** the system grabber (Slack's StandardBottomSheetParameters default it on, ModallyPresentableFeature.swift:296) */
  grabber?: boolean
  /** a 'fit' (self-sized) detent's least height, `.selfSized(vc, minimumHeight:)` (September 2026,
   *  ModallyPresentableFeature.swift:124; the resolved height is min(max(content, minimum), max), and half the max until
   *  the content is measured, ModalPresentationController.swift:767-792) */
  fitMinHeight?: number
  /** swipe down and tapping outside dismiss (default true) */
  dismissible?: boolean
  /** a drag that starts this many points from the sheet's top always moves the sheet, even over a scroll view */
  headerDrag?: number
  /** legacy SKBottomSheet forms (SKBottomSheetPresentable): content heights, without the grabber zone */
  legacy?: {
    /** short form content height; 'content' hugs the content (the default: shortFormHeight = longFormHeight) */
    shortForm?: number | 'content'
    /** long form: 'content' hugs the content (the default), 'max' reaches the top offset (safe top + 21) */
    longForm?: 'content' | 'max'
    /** after the first expansion the short form is gone, so the next swipe down dismisses (emoji picker, reactors) */
    disableShortFormAfterExpand?: boolean
  }
  /** the native sheet it becomes with the bottomsheetMigration flag on */
  migrated?: { detents: Detent[]; initialDetent?: Detent; grabber?: boolean }
  /** overlays: how long they animate out before they're removed and `dismiss(then)` runs (default 320 ms) */
  exitMs?: number
}

const configs = new Map<string, SheetConfig>()

/** Chrome, detents and gestures for a registered sheet, beyond its presentation. */
export function configureSheet(name: string, config: SheetConfig) {
  configs.set(name, config)
}

let migration = false
/** Slack's `bottomsheetMigration` flag: SKBottomSheets become native sheets (their `migrated` detents). */
export function setBottomSheetMigration(on: boolean) {
  migration = on
}

interface Resolved {
  kind: 'native' | 'legacy' | 'full' | 'overlay'
  detents: Detent[]
  initial: Detent
  grabber: boolean
  fitMinHeight: number
  dismissible: boolean
  headerDrag: number
  legacy: NonNullable<SheetConfig['legacy']>
  exitMs: number
}

function resolve(type: string, def: SheetDef | undefined): Resolved {
  const presentation = def?.presentation ?? 'page'
  const cfg = configs.get(type) ?? {}
  const base = { dismissible: cfg.dismissible ?? true, headerDrag: cfg.headerDrag ?? 0, legacy: cfg.legacy ?? {}, exitMs: cfg.exitMs ?? OVERLAY_OUT, fitMinHeight: cfg.fitMinHeight ?? 0 }
  if (presentation === 'overlay') return { ...base, kind: 'overlay', detents: [], initial: 'large', grabber: false }
  if (presentation === 'full') return { ...base, kind: 'full', detents: ['large'], initial: 'large', grabber: false, dismissible: false }
  if (cfg.chrome === 'legacy' && !(migration && cfg.migrated)) return { ...base, kind: 'legacy', detents: [], initial: 'large', grabber: base.dismissible }
  const fallback: Detent[] = presentation === 'medium' ? ['medium', 'large'] : presentation === 'fit' ? ['fit'] : ['large']
  const m = cfg.chrome === 'legacy' ? cfg.migrated : undefined
  const detents = m?.detents ?? cfg.detents ?? fallback
  // Features that don't choose are form sheets (.standard(.formSheet), ModallyPresentableFeature.swift:64-68): no
  // grabber. Resizable and self-sized sheets show it.
  const grabber = m?.grabber ?? cfg.grabber ?? (detents.length > 1 || presentation !== 'page')
  return { ...base, kind: 'native', detents, initial: m?.initialDetent ?? cfg.initialDetent ?? detents[0], grabber }
}

// ------------------------------------------------------------------------------------------------------ geometry

const NATIVE = {
  /** the large detent's top: y 60.2 on the 402 × 874 render, whose safe area top is 62 */
  largeTop: (d: Device) => (d.safeTop > 40 ? d.safeTop - 2 : d.safeTop + 10),
  /** partial detents float this far from the sides and the bottom */
  inset: 6,
  /** the medium detent's top: y 412.5 of 874 */
  mediumTop: (d: Device) => Math.round(d.height * 0.472),
  /** a sheet over another starts this much lower, so the receded one shows above it */
  stackOffset: 12,
}
/** SKBottomSheet (spec §0.1): topOffset = safe top + 21; the sheet's edge is 16 pt above the content (grabber zone). */
const LEGACY = { topOffset: (d: Device) => d.safeTop + 21, zone: 16 }

const DURATION = 420
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
/** SKBottomSheetAnimator: a UIView spring, 0.5 s, damping 0.8 (spec §0.1) */
const LEGACY_DURATION = 500
const LEGACY_EASE = 'cubic-bezier(0.25, 1.06, 0.45, 1)'
const OVERLAY_OUT = 320

// ------------------------------------------------------------------------------------------------------- context

export interface SheetContextValue {
  sheetKey: string
  type: string
  kind: Resolved['kind']
  detent: Detent
  setDetent: (d: Detent) => void
  /** dismisses this sheet; `then` runs once it has animated away */
  dismiss: (then?: () => void) => void
  closing: boolean
  /** expands to the large detent / the long form (the emoji picker does when its search field is focused) */
  expand: () => void
}

const SheetContext = createContext<SheetContextValue | null>(null)

/** The sheet a component is drawn in (null outside sheets). */
export const useSheet = () => useContext(SheetContext)

/** Dismisses a sheet (the top one without a key) and runs `then` after its dismissal animation. */
export function dismissSheetThen(key: string | undefined, then?: () => void) {
  const s = useApp.getState()
  const entry = key ? s.sheets.find((x) => x.key === key) : s.sheets.at(-1)
  s.dismissSheet(entry?.key)
  if (!then) return
  const r = entry ? resolve(entry.type, sheetDef(entry.type)) : undefined
  const kind = r?.kind ?? 'native'
  setTimeout(then, kind === 'overlay' ? (r?.exitMs ?? OVERLAY_OUT) : kind === 'legacy' ? LEGACY_DURATION - 80 : DURATION - 80)
}

// ------------------------------------------------------------------------------------------------------ the host

interface Presented {
  entry: SheetEntry
  closing: boolean
}

export function SheetHost() {
  const sheets = useApp((s) => s.sheets)
  const [shown, setShown] = useState<Presented[]>([])

  useEffect(() => {
    setShown((prev) => {
      const keys = new Set(sheets.map((s) => s.key))
      const next = prev.map((p) => (keys.has(p.entry.key) ? { entry: sheets.find((s) => s.key === p.entry.key)!, closing: false } : { ...p, closing: true }))
      for (const s of sheets) if (!prev.some((p) => p.entry.key === s.key)) next.push({ entry: s, closing: false })
      return next
    })
  }, [sheets])

  const kinds = shown.map((p) => resolve(p.entry.type, sheetDef(p.entry.type)).kind)
  const live = shown.filter((p) => !p.closing)
  useSheetStatusBar(
    live.map((p) => resolve(p.entry.type, sheetDef(p.entry.type)).kind),
    live.some((p) => sheetDef(p.entry.type)?.options?.statusBar),
  )
  return (
    <>
      {shown.map((p, i) => {
        // A native sheet recedes while another sheet (not a menu or an alert) is presented over it.
        const above = shown.some((q, j) => j > i && !q.closing && (kinds[j] === 'native' || kinds[j] === 'full'))
        const below = shown.some((q, j) => j < i && !q.closing && kinds[j] === 'native')
        // a sheet presented from an overlay that draws a whole screen (the file viewer) goes on top of it
        const overOverlay = shown.some((q, j) => j < i && !q.closing && kinds[j] === 'overlay')
        return (
          <SheetView
            key={p.entry.key}
            entry={p.entry}
            closing={p.closing}
            index={i}
            overOverlay={overOverlay}
            receded={above && kinds[i] === 'native'}
            stacked={below && kinds[i] === 'native'}
            onClosed={() => setShown((prev) => prev.filter((x) => x.entry.key !== p.entry.key))}
          />
        )
      })}
    </>
  )
}

/** the status bar the screen had before anything was presented (menus and alerts leave it as it is) */
let screenTone: StatusBarTone | null = null

/**
 * The status bar over a sheet: light glyphs over SKBottomSheet's 70 % dimming; otherwise what the appearance wants
 * (dark in light mode), since iOS 26 sheets dim only 20 % and full-screen modals draw their own background; over menus,
 * alerts and other overlays, the screen's own. App's status-bar sync only knows that a sheet is up, so this re-applies
 * the tone whenever it changes while one is — unless a sheet registered its own (registerSheet options.statusBar).
 */
function useSheetStatusBar(kinds: Resolved['kind'][], registered: boolean) {
  const appearance = useSim((s) => s.appearance)
  const presented = kinds.length > 0
  useEffect(() => {
    if (presented) return
    const record = () => {
      screenTone = useScreenChrome.getState().statusBar
    }
    record()
    return useScreenChrome.subscribe(record)
  }, [presented])
  const top = kinds.filter((k) => k !== 'overlay').at(-1)
  const want: StatusBarTone | null = !presented || registered ? null : !top ? screenTone : top === 'legacy' ? 'light' : appearance === 'dark' ? 'light' : 'dark'
  useEffect(() => {
    if (!want) return
    const apply = () => {
      const c = useScreenChrome.getState()
      if (c.statusBar !== want) c.setStatusBar(want)
    }
    const r = requestAnimationFrame(apply)
    const unsub = useScreenChrome.subscribe((c, prev) => c.statusBar !== prev.statusBar && c.statusBar !== want && requestAnimationFrame(apply))
    return () => {
      cancelAnimationFrame(r)
      unsub()
    }
  }, [want])
}

interface ViewProps {
  entry: SheetEntry
  closing: boolean
  index: number
  /** an overlay was presented before this sheet: stack it above (overlays sit above sheets and the keyboard) */
  overOverlay?: boolean
  receded: boolean
  stacked: boolean
  onClosed: () => void
}

function SheetView({ entry, closing, index, overOverlay, receded, stacked, onClosed }: ViewProps) {
  const def = sheetDef(entry.type)
  const cfg = useMemo(() => resolve(entry.type, def), [entry.type, def])
  const device = useDevice()
  const dismissStore = useApp((s) => s.dismissSheet)
  const [entered, setEntered] = useState(false)
  const [detent, setDetent] = useState<Detent>(cfg.initial)
  const [form, setForm] = useState<'short' | 'long'>('short')
  const [shortDisabled, setShortDisabled] = useState(false)
  const [contentH, setContentH] = useState(0)
  const content = useRef<HTMLDivElement>(null)
  const thenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(r)
  }, [])
  const outMs = cfg.kind === 'overlay' ? cfg.exitMs : cfg.kind === 'legacy' ? LEGACY_DURATION : DURATION
  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => {
      onClosed()
      const then = thenRef.current
      thenRef.current = null
      then?.()
    }, outMs)
    return () => clearTimeout(t)
  }, [closing]) // eslint-disable-line react-hooks/exhaustive-deps

  // The content's own height, for self-sized and content-hugging sheets.
  const hugs = cfg.kind === 'legacy' ? cfg.legacy.shortForm === undefined || cfg.legacy.shortForm === 'content' || cfg.legacy.longForm !== 'max' : cfg.kind === 'native' && detent === 'fit'
  useLayoutEffect(() => {
    const el = content.current?.firstElementChild as HTMLElement | null
    if (!el || !hugs) return
    const measure = () => setContentH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hugs])

  const dismiss = useCallback(
    (then?: () => void) => {
      if (then) thenRef.current = then
      dismissStore(entry.key)
    },
    [dismissStore, entry.key],
  )
  const expand = useCallback(() => {
    setForm('long')
    if (cfg.legacy.disableShortFormAfterExpand) setShortDisabled(true)
    if (cfg.kind === 'native' && cfg.detents.includes('large')) setDetent('large')
  }, [cfg])

  const ctx: SheetContextValue = { sheetKey: entry.key, type: entry.type, kind: cfg.kind, detent, setDetent, dismiss, closing, expand }
  const body: ReactNode = def ? (
    <Guard name={`sheet ${entry.type}`}>
      <def.component sheetKey={entry.key} {...(entry.props ?? {})} />
    </Guard>
  ) : (
    <div style={{ padding: 24, font: 'var(--sk-small-body)' }}>No sheet called “{entry.type}”.</div>
  )

  if (cfg.kind === 'overlay') {
    return (
      <SheetContext.Provider value={ctx}>
        <div
          className={['ios-overlay', entered && !closing && 'is-open', closing && 'is-closing'].filter(Boolean).join(' ')}
          style={{ zIndex: 500 + index, ['--display-radius' as string]: `${device.radius}px` }}
          data-sheet={entry.type}
        >
          {body}
        </div>
      </SheetContext.Provider>
    )
  }

  const g = geometry(cfg, device, stacked, contentH)
  let height: number
  if (cfg.kind === 'full') height = device.height
  else if (cfg.kind === 'legacy') height = form === 'long' || shortDisabled ? g.long : g.short
  else height = g.heightOf(detent)
  const floating = cfg.kind === 'native' && height < g.max - 0.5
  const open = entered && !closing
  const legacy = cfg.kind === 'legacy'

  return (
    <SheetContext.Provider value={ctx}>
      <div
        className={['ios-sheet-host', open && 'is-open', receded && 'is-receded'].filter(Boolean).join(' ')}
        style={{ zIndex: (overOverlay ? 500 : 200) + index, ['--sheet-dur' as string]: `${legacy ? LEGACY_DURATION : DURATION}ms`, ['--sheet-ease' as string]: legacy ? LEGACY_EASE : EASE }}
        data-chrome={cfg.kind}
        data-sheet={entry.type}
      >
        {cfg.kind !== 'full' && <div className="ios-sheet-dim" onClick={() => cfg.dismissible && dismiss()} />}
        <SheetPanel
          contentRef={content}
          cfg={cfg}
          device={device}
          g={g}
          height={height}
          floating={floating}
          open={open}
          hugs={hugs}
          autoHeight={hugs && cfg.kind === 'native'}
          detent={detent}
          form={shortDisabled ? 'long' : form}
          onDetent={setDetent}
          onForm={(f) => {
            setForm(f)
            if (f === 'long' && cfg.legacy.disableShortFormAfterExpand) setShortDisabled(true)
          }}
          onDismiss={() => dismiss()}
        >
          {body}
        </SheetPanel>
      </div>
    </SheetContext.Provider>
  )
}

interface Geometry {
  /** the tallest a sheet gets (to the large detent / the top offset) */
  max: number
  heightOf: (d: Detent) => number
  /** native detent heights, smallest first */
  detents: { d: Detent; h: number }[]
  short: number
  long: number
}

/** Heights are the panel's own, px. A floating sheet's panel ends 6 pt above the screen's bottom. */
function geometry(cfg: Resolved, device: Device, stacked: boolean, contentH: number): Geometry {
  const H = device.height
  if (cfg.kind === 'legacy') {
    const top = LEGACY.topOffset(device)
    const max = H - top
    const hug = Math.min(LEGACY.zone + contentH + device.safeBottom, max)
    const long = cfg.legacy.longForm === 'max' ? max : hug
    const sf = cfg.legacy.shortForm ?? 'content'
    const short = Math.min(sf === 'content' ? long : LEGACY.zone + sf + device.safeBottom, long)
    return { max, heightOf: () => long, detents: [], short, long }
  }
  const max = H - NATIVE.largeTop(device) - (stacked ? NATIVE.stackOffset : 0)
  const floatBottom = NATIVE.inset
  const heightOf = (d: Detent) => {
    if (d === 'large') return max
    const h = d === 'medium' ? H - NATIVE.mediumTop(device) - floatBottom : d === 'fit' ? Math.max(contentH, cfg.fitMinHeight) : d + Math.max(0, device.safeBottom - floatBottom)
    // A partial detent that would reach the large one's height is the large one.
    return h >= max - floatBottom ? max : h
  }
  return { max, heightOf, detents: cfg.detents.map((d) => ({ d, h: heightOf(d) })), short: 0, long: 0 }
}

// --------------------------------------------------------------------------------------------------- the panel

interface PanelProps {
  contentRef: React.RefObject<HTMLDivElement | null>
  cfg: Resolved
  device: Device
  g: Geometry
  height: number
  floating: boolean
  open: boolean
  /** the content keeps its own height (and scrolls when the sheet can't fit it) */
  hugs: boolean
  /** a self-sized native sheet: the panel takes the content's height */
  autoHeight: boolean
  detent: Detent
  form: 'short' | 'long'
  onDetent: (d: Detent) => void
  onForm: (f: 'short' | 'long') => void
  onDismiss: () => void
  children: ReactNode
}

/** Movement before a press becomes a sheet drag. */
const SLOP = 6
/** SKBottomSheetPresentationController: releases faster than 1000 × (1 − 0.7) pt/s snap their way (spec §0.1). */
const LEGACY_SNAP_VELOCITY = 0.3

function SheetPanel({ contentRef, cfg, device, g, height, floating, open, hugs, autoHeight, detent, form, onDetent, onForm, onDismiss, children }: PanelProps) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x0: number; y0: number; id: number; owned: boolean | null; scroller: HTMLElement | null; samples: { t: number; y: number }[]; dy: number; fromHeader: boolean } | null>(null)
  const dragged = useRef(false)
  const legacy = cfg.kind === 'legacy'
  const native = cfg.kind === 'native'
  const draggable = (legacy || native) && (cfg.dismissible || (native && cfg.detents.length > 1) || legacy)

  const scale = () => {
    const el = panel.current
    return el ? el.getBoundingClientRect().width / el.offsetWidth || 1 : 1
  }
  const dim = () => panel.current?.parentElement?.querySelector<HTMLElement>(':scope > .ios-sheet-dim') ?? null
  /** the heights the sheet can rest at, smallest first */
  const rests = (): number[] => {
    if (legacy) return form === 'short' && g.short < g.long ? [g.short, g.long] : [g.long]
    const fitH = autoHeight ? Math.max(panel.current?.querySelector<HTMLElement>(':scope > .ios-sheet__content > *')?.offsetHeight ?? height, cfg.fitMinHeight) : 0
    return g.detents.map((x) => (x.d === 'fit' ? Math.min(fitH, g.max) : x.h))
  }

  /** Draws the sheet at height h, pushed down by `down` below its smallest rest. */
  const place = (h: number, down: number) => {
    const el = panel.current!
    el.style.height = `${h}px`
    el.style.transform = `translateY(${down}px)`
    // Between detents a native sheet morphs from floating to edge-to-edge as it nears the large detent.
    if (native) el.style.setProperty('--sheet-float', String(Math.max(0, Math.min(1, (g.max - h) / 40))))
  }
  const release = (el: HTMLElement) => {
    el.style.transition = ''
    el.style.height = ''
    el.style.transform = ''
    el.style.removeProperty('--sheet-float')
    const d = dim()
    if (d) {
      d.style.transition = ''
      d.style.opacity = ''
    }
  }

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.button !== 0 || !draggable) return
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, [contenteditable="true"], [data-sheet-nodrag]')) return
    let scroller: HTMLElement | null = null
    for (let n: HTMLElement | null = t; n && n !== panel.current; n = n.parentElement) {
      if ((n.classList.contains('ios-scroll') || n.hasAttribute('data-sheet-scroll')) && n.scrollHeight > n.clientHeight + 1) {
        scroller = n
        break
      }
    }
    const top = panel.current!.getBoundingClientRect().top
    drag.current = { x0: e.clientX, y0: e.clientY, id: e.pointerId, owned: null, scroller, samples: [], dy: 0, fromHeader: (e.clientY - top) / scale() < cfg.headerDrag }
    dragged.current = false
  }

  const onPointerMoveCapture = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id || d.owned === false) return
    const s = scale()
    const dx = (e.clientX - d.x0) / s
    const dy = (e.clientY - d.y0) / s
    if (d.owned === null) {
      if (Math.hypot(dx, dy) < SLOP) return
      // content that's handling the drag itself (a row being reordered) sets data-drag-locked on the sheet
      if (panel.current?.hasAttribute('data-drag-locked')) {
        d.owned = false
        return
      }
      const r = rests()
      const expandable = height < r[r.length - 1] - 0.5
      // The sheet takes a vertical drag unless its content can scroll that way: a list at its top gives a downward drag
      // to the sheet, and an upward one expands a sheet that isn't fully up (prefersScrollingExpandsWhenScrolledToEdge).
      d.owned = Math.abs(dy) > Math.abs(dx) && (!d.scroller || d.fromHeader || (dy > 0 ? d.scroller.scrollTop <= 0 : expandable))
      if (d.owned && dy > 0 && !cfg.dismissible && height <= r[0] + 0.5) d.owned = false
      if (!d.owned) return
      panel.current!.setPointerCapture?.(e.pointerId)
      panel.current!.style.transition = 'none'
      const dm = dim()
      if (dm) dm.style.transition = 'none'
      dragged.current = true
    }
    // Keep the gesture from the scroll views below (src/app/gestures.ts listens on the screen, after us).
    e.stopPropagation()
    e.preventDefault()
    d.dy = dy
    const now = performance.now()
    d.samples.push({ t: now, y: dy })
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift()

    const r = rests()
    const min = r[0]
    const max = r[r.length - 1]
    let h = height - dy
    let down = 0
    if (h > max) h = max + rubber(h - max)
    if (h < min) {
      down = cfg.dismissible ? min - h : rubber(min - h)
      h = min
    }
    place(h, down)
    const dm = dim()
    // SKBottomSheet: below the short form the dim fades by the distance dragged over the sheet's height (§0.1).
    if (dm) dm.style.opacity = String(down > 0 ? Math.max(0, 1 - down / Math.max(1, min)) : 1)
  }

  const onPointerUpCapture = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.owned || e.pointerId !== d.id) return
    const el = panel.current!
    const first = d.samples[0]
    const last = d.samples.at(-1)
    const v = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0 // px/ms, + = down
    const current = height - d.dy
    const r = rests()

    let dismissNow = false
    let target = height
    if (legacy) {
      // Fast releases snap in the direction of travel; slower ones settle on the nearest of long form, short form and
      // dismissed (SKBottomSheetPresentationController.swift:624-639).
      const stops = [...r, ...(cfg.dismissible ? [0] : [])].sort((a, b) => a - b)
      let stop: number
      if (Math.abs(v) > LEGACY_SNAP_VELOCITY) stop = v > 0 ? ([...stops].reverse().find((h) => h < current - 1) ?? stops[0]) : (stops.find((h) => h > current + 1) ?? stops[stops.length - 1])
      else stop = stops.reduce((a, b) => (Math.abs(b - current) < Math.abs(a - current) ? b : a))
      if (stop === 0) dismissNow = true
      else {
        target = stop
        onForm(stop === g.long ? 'long' : 'short')
      }
    } else {
      // UIKit projects the release (≈ 0.2 s of momentum) and rests on the nearest detent, or dismisses when the
      // projection falls well below the smallest.
      const projected = current - v * 200
      if (cfg.dismissible && (projected < r[0] * 0.55 || (v > 1.1 && current < r[0] + 1))) dismissNow = true
      else {
        const i = r.reduce((best, h, k) => (Math.abs(h - projected) < Math.abs(r[best] - projected) ? k : best), 0)
        target = r[i]
        onDetent(cfg.detents[i])
      }
    }

    if (dismissNow) {
      // Slide away from where the finger left it.
      el.style.transition = ''
      el.style.transform = `translateY(${device.height}px)`
      const dm = dim()
      if (dm) {
        dm.style.transition = ''
        dm.style.opacity = '0'
      }
      onDismiss()
      return
    }
    if (target === height) release(el)
    else requestAnimationFrame(() => release(el))
  }

  // A drag isn't a tap on whatever it started on.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!dragged.current) return
    dragged.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  // Tapping the grabber cycles the detents (UIKit, HIG › Sheets), or dismisses an SKBottomSheet (§0.1).
  const onGrabber = () => {
    if (legacy) return cfg.dismissible && onDismiss()
    if (cfg.detents.length > 1) onDetent(cfg.detents[(cfg.detents.indexOf(detent) + 1) % cfg.detents.length])
  }

  return (
    <div
      ref={panel}
      className={['ios-sheet', `ios-sheet--${cfg.kind}`, open && 'is-open', floating && 'is-floating', hugs && 'is-hugging'].filter(Boolean).join(' ')}
      style={{
        height: autoHeight ? undefined : height,
        minHeight: autoHeight && cfg.fitMinHeight ? Math.min(cfg.fitMinHeight, g.max) : undefined,
        maxHeight: autoHeight ? g.max : undefined,
        ['--sheet-float' as string]: floating ? 1 : 0,
        ['--display-radius' as string]: `${device.radius}px`,
      }}
      role="dialog"
      aria-modal
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
      onPointerCancelCapture={onPointerUpCapture}
      onClickCapture={onClickCapture}
    >
      {cfg.grabber && <div className="ios-sheet__grabber" data-sheet-grabber onClick={onGrabber} role="button" aria-label="Close" />}
      <div className="ios-sheet__content" ref={contentRef}>
        {children}
      </div>
    </div>
  )
}

/** UIScrollView's rubber band: the further you pull, the less it follows. */
function rubber(x: number, dim = 120) {
  return (1 - 1 / ((x * 0.55) / dim + 1)) * dim
}
