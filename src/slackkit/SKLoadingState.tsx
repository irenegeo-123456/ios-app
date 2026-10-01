import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { SKLoadingShimmer, type SKShimmerShape } from './SKLoadingShimmer'
import { cx, proportionalRadius } from './util'
import './loading.css'

// Skeleton loading rows and screens (DesignerComponents/Entities/LoadingEntity, LoadingHeader, LoadingState):
// - SKLoadingEntity (SKLoadingEntity.swift): a placeholder row, margins 10 / 16. Generic: an optional square ornament
//   (small 24, medium 36; radius min(20, 0.25 × side)), 12 pt after it a 12 pt bar (radius 6) at 75 % of the rest
//   (50 % with wide secondary text) and, from medium, 10 pt bars (radius 5) at 50 % (100 %) 6 pt apart, as many as
//   fill a dynamic target height. Button: N equal pills 12 pt apart. Rows 44 (small) / 56 (medium).
// - SKLoadingHeader (SKLoadingHeader.swift): the same shapes with 16 pt margins; small 24 / medium 36 (radius 4 / 6).
// - SKLoadingState / SKWrappedLoadingView (LoadingStateSharedModels.swift, SKLoadingState.swift): a header then rows,
//   as a list or as sections split by an SKListFooterView (a 1 px outlineTertiary hairline; 8 pt, hairline at the
//   bottom, after the last; an 8 pt gap before headerless sections). SKLoadingState fills its height; the wrapped view
//   has a fixed count. Fill styles: shimmering (the shapes show the SKLoadingShimmer, one gradient across the whole
//   view) or solid (flat placeholder shapes).
// Geometry: SKLoadingPathHelper.swift:15-262. Spec: slackkit-components.md › SKLoadingEntity … SKWrappedLoadingView.
//
//   <SKLoadingState cellContent={{ hasImageMask: true, size: 'medium' }} />                      fills its parent
//   <SKWrappedLoadingView headerContent={{ hasImageMask: true, size: 'small' }} cellContent={{ hasImageMask: true, size: 'small' }}
//     layout={{ sections: { cellsPerSection: 1, sectionCount: 3 } }} />

type Margins = { top: number; left: number; bottom: number; right: number }
const ENTITY_MARGINS: Margins = { top: 10, left: 16, bottom: 10, right: 16 }
const HEADER_MARGINS: Margins = { top: 16, left: 16, bottom: 16, right: 16 }
const V = 6 // verticalSpacing
const H = 12 // horizontalSpacing
const PRIMARY = 12
const SECONDARY = 10

/** SKLoadingPathHelper.EntityType */
export type SKLoadingShapeType =
  | { button: { count: number; height: number; cornerRadius: number } }
  | {
      generic: {
        hasOrnamentMask: boolean
        hasSecondaryTextMask: boolean
        ornamentMaskSideLength: number
        ornamentMaskCornerRadius: number
        targetContentHeight?: number
        hasWideSecondaryText?: boolean
      }
    }

function secondaryCount(startY: number, target: number | undefined, m: Margins) {
  const min = startY + SECONDARY + V + m.bottom
  let remaining = Math.max(target ?? min, min) - startY - m.bottom
  let n = 0
  while (remaining > 0) {
    remaining -= SECONDARY + V
    n += 1
  }
  return n
}

/** SKLoadingPathHelper.height(entityType:edgeMargins:) */
export function loadingShapesHeight(t: SKLoadingShapeType, m: Margins) {
  if ('button' in t) return t.button.height + m.top + m.bottom
  const g = t.generic
  const n = g.hasSecondaryTextMask ? secondaryCount(PRIMARY + V + m.top, g.targetContentHeight, m) : 0
  return Math.max(g.ornamentMaskSideLength, PRIMARY + n * (V + SECONDARY)) + m.top + m.bottom
}

/** SKLoadingPathHelper.loadingMaskPath: the placeholder shapes in a width × height box, offset by y0 */
export function loadingShapes(width: number, height: number, t: SKLoadingShapeType, m: Margins, y0 = 0): SKShimmerShape[] {
  const midY = y0 + height / 2
  if ('button' in t) {
    const { count, height: bh, cornerRadius } = t.button
    const w = (width - m.left - m.right - (count - 1) * H) / count
    return Array.from({ length: count }, (_, i) => ({ x: m.left + i * (w + H), y: midY - bh / 2, w, h: bh, r: cornerRadius }))
  }
  const g = t.generic
  const wide = !!g.hasWideSecondaryText
  const minX = g.hasOrnamentMask ? m.left + g.ornamentMaskSideLength + H : m.left
  const shapes: SKShimmerShape[] = []
  const secondaries: SKShimmerShape[] = []
  if (g.hasSecondaryTextMask) {
    let y = y0 + PRIMARY + V + m.top
    const n = secondaryCount(y - y0, g.targetContentHeight, m)
    const w = (width - minX - m.right) * (wide ? 1 : 0.5)
    if (n === 1) secondaries.push({ x: minX, y: midY + (PRIMARY + V + SECONDARY) / 2 - SECONDARY, w, h: SECONDARY, r: 5 })
    else
      for (let i = 0; i < n; i++) {
        secondaries.push({ x: minX, y, w, h: SECONDARY, r: 5 })
        y += SECONDARY + V
      }
  }
  if (g.hasOrnamentMask) {
    const side = g.ornamentMaskSideLength
    shapes.push({ x: m.left, y: secondaries.length <= 1 ? midY - side / 2 : y0 + m.top, w: side, h: side, r: g.ornamentMaskCornerRadius })
  }
  const py = secondaries.length === 0 ? midY - PRIMARY / 2 : secondaries.length === 1 ? midY - (PRIMARY + V + SECONDARY) / 2 : y0 + m.top
  shapes.push({ x: minX, y: py, w: (width - minX - m.right) * (wide ? 0.5 : 0.75), h: PRIMARY, r: PRIMARY / 2 })
  return [...shapes, ...secondaries]
}

/** SKLoadingEntity.PresentationObject.Properties.Size */
export type SKLoadingEntitySize = 'small' | 'medium' | { custom: { sideLength: number; cornerRadius?: number } } | { dynamicSecondaryText: { targetTotalHeight: number } }
export type SKLoadingEntityType = { generic: { hasOrnament: boolean; hasWideSecondaryText?: boolean } } | { button: { count: number } } | 'custom'
/** FillStyle: aroundPlaceholder (shimmer through the shapes) or placeholder(placeholderColor:) (flat shapes) */
export type SKLoadingFillStyle = 'aroundPlaceholder' | { placeholder: { placeholderColor: string } }

export function loadingEntityShapeType(entityType: SKLoadingEntityType, size: SKLoadingEntitySize): SKLoadingShapeType {
  const side = size === 'small' ? 24 : size === 'medium' || 'dynamicSecondaryText' in size ? 36 : size.custom.sideLength
  const height = size === 'small' ? 24 : size === 'medium' ? 36 : 'dynamicSecondaryText' in size ? size.dynamicSecondaryText.targetTotalHeight : size.custom.sideLength
  const radius = typeof size === 'object' && 'custom' in size && size.custom.cornerRadius != null ? size.custom.cornerRadius : proportionalRadius(typeof size === 'object' && 'dynamicSecondaryText' in size ? 36 : height)
  if (entityType === 'custom') return { button: { count: 1, height, cornerRadius: radius } }
  if ('button' in entityType) return { button: { count: entityType.button.count, height, cornerRadius: radius } }
  return {
    generic: {
      hasOrnamentMask: entityType.generic.hasOrnament,
      hasSecondaryTextMask: size === 'medium' || (typeof size === 'object' && 'dynamicSecondaryText' in size),
      ornamentMaskSideLength: side,
      ornamentMaskCornerRadius: radius,
      targetContentHeight: typeof size === 'object' && 'dynamicSecondaryText' in size ? size.dynamicSecondaryText.targetTotalHeight : undefined,
      hasWideSecondaryText: entityType.generic.hasWideSecondaryText,
    },
  }
}

export function loadingHeaderShapeType(entityType: { generic: { hasOrnament: boolean; targetContentHeight?: number; hasWideSecondaryText?: boolean } } | { button: { count: number } }, size: 'small' | 'medium'): SKLoadingShapeType {
  const side = size === 'small' ? 24 : 36
  const radius = size === 'small' ? 4 : 6
  if ('button' in entityType) return { button: { count: entityType.button.count, height: side, cornerRadius: radius } }
  return {
    generic: {
      hasOrnamentMask: entityType.generic.hasOrnament,
      hasSecondaryTextMask: size === 'medium',
      ornamentMaskSideLength: side,
      ornamentMaskCornerRadius: radius,
      targetContentHeight: entityType.generic.targetContentHeight,
      hasWideSecondaryText: entityType.generic.hasWideSecondaryText,
    },
  }
}

/** Measures an element's width (the rows' shapes depend on it). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function ShapeBox({ type, margins, fillStyle, backgroundColor, className, style }: { type: SKLoadingShapeType; margins: Margins; fillStyle: SKLoadingFillStyle; backgroundColor?: string; className: string; style?: CSSProperties }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const height = loadingShapesHeight(type, margins)
  const solid = typeof fillStyle === 'object' ? fillStyle.placeholder.placeholderColor : undefined
  return (
    <div ref={ref} className={cx('sk-loading-row', className)} style={{ height, background: solid ? undefined : backgroundColor, ...style }} aria-hidden>
      {width > 0 && <SKLoadingShimmer shapes={loadingShapes(width, height, type, margins)} solid={solid} />}
    </div>
  )
}

/** SKLoadingEntity: one skeleton row. */
export function SKLoadingEntity({
  entityType = { generic: { hasOrnament: true } },
  size = 'medium',
  fillStyle = 'aroundPlaceholder',
  backgroundColor = 'var(--dt_color_base_primary)',
  className,
  style,
}: {
  entityType?: SKLoadingEntityType
  size?: SKLoadingEntitySize
  fillStyle?: SKLoadingFillStyle
  /** backgroundColorOverride (default the list cell's, basePrimary) */
  backgroundColor?: string
  className?: string
  style?: CSSProperties
}) {
  return <ShapeBox type={loadingEntityShapeType(entityType, size)} margins={ENTITY_MARGINS} fillStyle={fillStyle} backgroundColor={backgroundColor} className={cx('sk-loading-entity', className)} style={style} />
}

/** SKLoadingHeader: a skeleton section header or button strip. */
export function SKLoadingHeader({
  entityType = { generic: { hasOrnament: true } },
  size = 'medium',
  fillStyle = 'aroundPlaceholder',
  backgroundColor = 'var(--dt_color_base_primary)',
  className,
  style,
}: {
  entityType?: { generic: { hasOrnament: boolean; targetContentHeight?: number; hasWideSecondaryText?: boolean } } | { button: { count: number } }
  size?: 'small' | 'medium'
  fillStyle?: SKLoadingFillStyle
  backgroundColor?: string
  className?: string
  style?: CSSProperties
}) {
  return <ShapeBox type={loadingHeaderShapeType(entityType, size)} margins={HEADER_MARGINS} fillStyle={fillStyle} backgroundColor={backgroundColor} className={cx('sk-loading-header', className)} style={style} />
}

export interface SKLoadingHeaderContent {
  hasImageMask: boolean
  size: 'small' | 'medium'
}
export interface SKLoadingCellContent {
  hasImageMask: boolean
  size: SKLoadingEntitySize
  hasWideSecondaryText?: boolean
}
/** PlaceholderStyle: shimmering(backgroundColor:) or solid(backgroundColor:placeholderColor:) */
export type SKLoadingPlaceholderStyle = { shimmering: { backgroundColor?: string } } | { solid: { backgroundColor: string; placeholderColor: string } }

type Item = { kind: 'header' | 'cell'; h: number } | { kind: 'footer'; h: number; hairline: boolean }

interface StateProps {
  headerContent?: SKLoadingHeaderContent
  cellContent: SKLoadingCellContent
  placeholderStyle?: SKLoadingPlaceholderStyle
  className?: string
  style?: CSSProperties
}

function useContent({ headerContent, cellContent, placeholderStyle }: StateProps) {
  const header = headerContent ? loadingHeaderShapeType({ generic: { hasOrnament: headerContent.hasImageMask } }, headerContent.size) : null
  const cell = loadingEntityShapeType({ generic: { hasOrnament: cellContent.hasImageMask, hasWideSecondaryText: cellContent.hasWideSecondaryText } }, cellContent.size)
  const style = placeholderStyle ?? { shimmering: {} }
  const backgroundColor = 'solid' in style ? style.solid.backgroundColor : (style.shimmering.backgroundColor ?? 'var(--dt_color_base_primary)')
  const solid = 'solid' in style ? style.solid.placeholderColor : undefined
  return { header, cell, backgroundColor, solid, headerH: header ? loadingShapesHeight(header, HEADER_MARGINS) : 0, cellH: loadingShapesHeight(cell, ENTITY_MARGINS) }
}

/** sectionedContentItems (LoadingStateSharedModels.swift:98-131) */
function sectionItems(hasHeader: boolean, headerH: number, cellH: number, perSection: number, sections: number, inLast: number, footerInLast: boolean): Item[] {
  const items: Item[] = []
  for (let s = 0; s < sections; s++) {
    const last = s === sections - 1
    if (hasHeader) items.push({ kind: 'header', h: headerH })
    else if (items.length) items.push({ kind: 'footer', h: 8, hairline: false }) // the empty header: 8 pt, no hairline
    for (let c = 0; c < (last ? inLast : perSection); c++) items.push({ kind: 'cell', h: cellH })
    // SKListFooterView.height: 8 with padding (the last one), else just the 1 px hairline
    if (!last || footerInLast) items.push({ kind: 'footer', h: last ? 8 : 1 / 3, hairline: true })
  }
  return items
}

function LoadingStateView({ items, content, width, className, style, refEl }: { items: Item[]; content: ReturnType<typeof useContent>; width: number; className?: string; style?: CSSProperties; refEl: React.Ref<HTMLDivElement> }) {
  let y = 0
  const shapes: SKShimmerShape[] = []
  const rows: ReactNode[] = []
  items.forEach((it, i) => {
    if (it.kind === 'footer')
      rows.push(<div key={i} className={cx('sk-loading-footer', it.hairline && 'has-hairline')} style={{ height: it.h }} />)
    else {
      if (width > 0) shapes.push(...loadingShapes(width, it.h, it.kind === 'header' ? content.header! : content.cell, it.kind === 'header' ? HEADER_MARGINS : ENTITY_MARGINS, y))
      rows.push(<div key={i} style={{ height: it.h }} />)
    }
    y += it.h
  })
  return (
    <div ref={refEl} className={cx('sk-loading-state', className)} style={{ background: content.backgroundColor, ...style }} aria-busy="true" aria-label="Loading">
      <div className="sk-loading-state__rows" style={{ height: y }}>
        {width > 0 && <SKLoadingShimmer shapes={shapes} solid={content.solid} />}
        {rows.map((r, i) => (
          <Fragment key={i}>{r}</Fragment>
        ))}
      </div>
    </div>
  )
}

/** SKLoadingState: fills its container's height with skeleton rows (height .fillsRemaining). */
export function SKLoadingState(props: StateProps & { layout?: 'list' | { sections: { cellsPerSection: number } } }) {
  const content = useContent(props)
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setBox({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(([e]) => setBox({ w: e!.contentRect.width, h: e!.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = props.layout ?? 'list'
  let items: Item[] = []
  let avail = box.h
  if (layout === 'list') {
    if (content.header) {
      items.push({ kind: 'header', h: content.headerH })
      if (avail > 0) avail -= content.headerH
    }
    // numberOfListCellsForBounds (:94-113)
    while (avail > 0) {
      avail -= content.cellH
      items.push({ kind: 'cell', h: content.cellH })
    }
  } else {
    // sectionConfigurationForBounds (:115-150)
    const per = layout.sections.cellsPerSection
    let sections = 0
    let inLast = per
    let footerInLast = false
    while (avail > 0) {
      footerInLast = false
      if (content.header && avail > 0) avail -= content.headerH
      else if (sections > 0) avail -= 8
      let cells = 0
      for (let c = 0; c < per && avail > 0; c++) {
        avail -= content.cellH
        cells += 1
      }
      if (avail <= 0) inLast = cells
      if (avail > 0) {
        avail -= 8
        footerInLast = true
      }
      sections += 1
    }
    items = sectionItems(!!content.header, content.headerH, content.cellH, per, sections, inLast, footerInLast)
  }
  return <LoadingStateView refEl={ref} items={items} content={content} width={box.w} className={cx('is-filling', props.className)} style={props.style} />
}

/** SKWrappedLoadingView: a fixed number of skeleton rows or sections, as tall as its content. */
export function SKWrappedLoadingView(props: StateProps & { layout: { list: { cellCount: number } } | { sections: { cellsPerSection: number; sectionCount: number } } }) {
  const content = useContent(props)
  const [ref, width] = useWidth<HTMLDivElement>()
  const items: Item[] =
    'list' in props.layout
      ? [...(content.header ? [{ kind: 'header' as const, h: content.headerH }] : []), ...Array.from({ length: props.layout.list.cellCount }, () => ({ kind: 'cell' as const, h: content.cellH }))]
      : sectionItems(!!content.header, content.headerH, content.cellH, props.layout.sections.cellsPerSection, props.layout.sections.sectionCount, props.layout.sections.cellsPerSection, true)
  return <LoadingStateView refEl={ref} items={items} content={content} width={width} className={props.className} style={props.style} />
}
