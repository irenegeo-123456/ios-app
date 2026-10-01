import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SKEmoji } from './SKEmoji'
import { asset } from '../lib/asset'
import { SKBadge } from './SKBadge'
import { SKMemberAvatar } from './SKMemberAvatar'
import { cx, haptic } from './util'
import './tabs.css'

// SKTabBar (DesignerComponents/TabBar/SKTabBar.swift, TabBarCollectionViewCell.swift): the tab strip, 48 pt tall
// (54 for pill buttons). Styles: `underline` (a 4 pt, radius-2 bar as wide as the selected tab, flush with the bottom,
// highlight2.baseInverse since September 2026, :87, :722; June sk_lilypad_green), `pillBackground` (a pill behind the
// selected tab, inset 9 / 6, radius 10) and `pillButton` (outlined 1 pt pills, radius 10, 88–200 pt; the selected
// fill shows above 0.5 selection progress). Tabs: title (Lato 15, Bold when selected), a count label, badge or 8 pt
// dot, and an icon / image / emoji / avatar ornament, 4 pt apart with 10 pt padding (16 for pill buttons). Colors blend
// contentSecondary → contentPrimary with the selection progress (textColor → selectedTextColor for pills). Widths:
// `fitToBar` (equal) or `fitAllContent` (intrinsic, 88–200 pt; leftover space shared out; centered when narrower).
// Pressing shows the cell's selection view and bounces to 0.96 (:22-28, :119-143, :301-307, :447-477, :552-580;
// Cell :35-52, :270-288, :354-429, :504-524). Spec: slackkit-components.md › SKTabBar.
//
//   <SKTabBar tabs={[{ title: 'Messages' }, { title: 'Files' }]} selectionProgress={tab} onTabTapped={setTab} />
//   <SKTabBar tabs={…} widthMode="fitAllContent" tabDisplayStyle="pillBackground" />

export interface SKTabBarTab {
  title: string
  /** CountType: a label ("4", "99+"), a badge (max 99) or a dot */
  count?: { label: string } | { badge: number; maxCount?: number } | 'dot'
  /** Ornament: an icon (tinted with the title unless iconColor), image, emoji or member avatar, 24 pt box */
  ornament?:
    | { icon: string; selectedIcon?: string; iconColor?: string }
    | { image: string }
    | { emoji: string }
    | { memberAvatar: { name: string; src?: string } }
  ornamentPosition?: 'leading' | 'trailing'
  /** the cell's background (underline style), default primary.basePrimary */
  backgroundColor?: string
  accessibilityLabel?: string
}

export type SKTabBarDisplayStyle = 'underline' | 'pillBackground' | 'pillButton'

export interface SKTabBarProps {
  tabs: SKTabBarTab[]
  /** single selection: 0 is the first tab, 0.5 halfway to the second (for swiping); null shows no selection */
  selectionProgress?: number | null
  /** multiple selection (.multiple(indices:)); overrides selectionProgress */
  selectedIndices?: number[]
  tabDisplayStyle?: SKTabBarDisplayStyle
  /** underline(underlineColor:), default highlight2.baseInverse (September 2026; June sk_lilypad_green) */
  underlineColor?: string
  /** pillBackground / pillButton colors */
  selectedBackgroundColor?: string
  textColor?: string
  selectedTextColor?: string
  /** pillButton */
  borderColor?: string
  /** pillBackground (defaults 9, 6, 10, false) */
  verticalSpacing?: number
  horizontalSpacing?: number
  cornerRadius?: number
  animateSelection?: boolean
  widthMode?: 'fitToBar' | 'fitAllContent'
  /** tapping a tab moves the selection itself (default true) */
  shouldAutomaticallyPerformTabChange?: boolean
  backgroundColor?: string
  contentInset?: { left?: number; right?: number }
  shouldCenterSelectedItem?: boolean
  onTabTapped?: (index: number) => void
  onMultipleSelectionChanged?: (selected: number[], tapped: number) => void
  className?: string
  style?: CSSProperties
}

const blend = (a: string, b: string, p: number) => (p <= 0 ? a : p >= 1 ? b : `color-mix(in srgb, ${a} ${Math.round((1 - p) * 1000) / 10}%, ${b})`)

export function SKTabBar({
  tabs,
  selectionProgress = 0,
  selectedIndices,
  tabDisplayStyle = 'underline',
  underlineColor = 'var(--dt_color_base_inverse_highlight_2)',
  selectedBackgroundColor = 'var(--sk_foreground_soft)',
  textColor = 'var(--sk_foreground_max)',
  selectedTextColor = 'var(--sk_primary_foreground)',
  borderColor = 'var(--dt_color_outline_tertiary)',
  verticalSpacing = 9,
  horizontalSpacing = 6,
  cornerRadius = 10,
  animateSelection = false,
  widthMode = 'fitToBar',
  shouldAutomaticallyPerformTabChange = true,
  backgroundColor = 'var(--dt_color_base_primary)',
  contentInset,
  shouldCenterSelectedItem = true,
  onTabTapped,
  onMultipleSelectionChanged,
  className,
  style,
}: SKTabBarProps) {
  const multiple = selectedIndices !== undefined
  const [progress, setProgress] = useState<number | null>(selectionProgress)
  const [multi, setMulti] = useState<number[]>(selectedIndices ?? [])
  const [animated, setAnimated] = useState(false)
  // follow the owner's selection
  const [prevProp, setPrevProp] = useState<{ p: number | null; m?: number[] }>({ p: selectionProgress, m: selectedIndices })
  if (prevProp.p !== selectionProgress || prevProp.m !== selectedIndices) {
    setPrevProp({ p: selectionProgress, m: selectedIndices })
    setProgress(selectionProgress)
    if (selectedIndices) setMulti(selectedIndices)
    setAnimated(false)
  }

  const scroller = useRef<HTMLDivElement>(null)
  const measure = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [intrinsic, setIntrinsic] = useState<number[]>([])
  const pillButton = tabDisplayStyle === 'pillButton'
  const insets = tabDisplayStyle === 'underline' ? { t: 6, l: 4, b: 6, r: 4 } : tabDisplayStyle === 'pillBackground' ? { t: 9, l: 6, b: 9, r: 6 } : { t: 9, l: 4, b: 9, r: 4 }
  const pad = pillButton ? 16 : 10
  const insetL = contentInset?.left ?? 0
  const insetR = contentInset?.right ?? 0

  useLayoutEffect(() => {
    const el = scroller.current
    const m = measure.current
    if (!el || !m) return
    const run = () => {
      setWidth(el.clientWidth)
      // TabBarCollectionViewCell.width: the bold title + count + icon + 2 × padding + the selection-view insets,
      // at least 88 (underline, pill buttons), at most 200 (:301-348)
      const min = tabDisplayStyle === 'pillBackground' ? 0 : 88
      setIntrinsic(([...m.children] as HTMLElement[]).map((c) => Math.min(Math.max(c.offsetWidth + 2 * pad + insets.l + insets.r, min), 200)))
    }
    run()
    // re-measure when the bar resizes, and when the tabs' own sizes change (web fonts arriving)
    const ro = new ResizeObserver(run)
    ro.observe(el)
    ro.observe(m)
    return () => ro.disconnect()
  }, [tabs, tabDisplayStyle, widthMode])

  const widths = useMemo(() => {
    if (!width || !tabs.length) return tabs.map(() => 0)
    if (widthMode === 'fitToBar') return tabs.map(() => width / tabs.length)
    const total = intrinsic.reduce((a, b) => a + b, 0)
    const available = width - insetL - insetR
    // compact width: share the leftover space out equally (:447-477)
    if (total < available) return intrinsic.map((w) => w + (available - total) / tabs.length)
    return intrinsic
  }, [width, tabs, widthMode, intrinsic, insetL, insetR])
  const lefts = widths.reduce<number[]>((acc, w, i) => (acc.push(i ? acc[i - 1] + widths[i - 1] : insetL), acc), [])

  // weightedCenterXAndWidth (:358-392): the indicator between two tabs, interpolated by the fractional progress
  let indicator: { x: number; w: number } | null = null
  if (!multiple && progress !== null && tabs.length && widths[0]) {
    const p = Math.max(0, Math.min(tabs.length - 1, progress))
    const a = Math.floor(p)
    const b = Math.ceil(p)
    const t = p - a
    indicator = { x: lefts[a] * (1 - t) + lefts[b] * t, w: widths[a] * (1 - t) + widths[b] * t }
  }

  // center the selected tab if it can be (calculatedCenteredContentOffset, :374-392), animated 0.25 s. iOS subtracts
  // half of both content insets: centerX − W / 2 − (left + right) / 2, in offsets where the insets sit outside the
  // content; here they are part of it (padding), which adds `left` to both sides of that.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !indicator || !shouldCenterSelectedItem || widthMode === 'fitToBar') return
    const target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, indicator.x + indicator.w / 2 - el.clientWidth / 2 - (insetL + insetR) / 2))
    el.scrollTo({ left: target, behavior: animated ? 'smooth' : 'auto' })
  }, [progress, width, intrinsic])

  const tap = (i: number) => {
    haptic()
    if (multiple) {
      const next = multi.includes(i) ? multi.filter((x) => x !== i) : [...multi, i]
      if (shouldAutomaticallyPerformTabChange) setMulti(next)
      onMultipleSelectionChanged?.(next, i)
      return
    }
    if (shouldAutomaticallyPerformTabChange) {
      setAnimated(!pillButton)
      setProgress(i)
    }
    onTabTapped?.(i)
  }

  const cellProgress = (i: number) => (multiple ? (multi.includes(i) ? 1 : 0) : progress === null ? 0 : Math.max(0, 1 - Math.min(1, Math.abs(progress - i))))
  const colors =
    tabDisplayStyle === 'underline'
      ? { a: 'var(--dt_color_content_secondary)', b: 'var(--dt_color_content_primary)' }
      : { a: textColor, b: selectedTextColor }
  const contentWidth = lefts.length ? lefts[lefts.length - 1] + widths[widths.length - 1] + insetR : 0
  // centering insets when the tabs are narrower than the bar (insetForSectionAt, :552-580)
  const centering = widthMode === 'fitAllContent' && width && contentWidth < width ? (width - contentWidth) / 2 : 0

  return (
    <div
      className={cx('sk-tab-bar', `sk-tab-bar--${tabDisplayStyle}`, className)}
      style={
        {
          height: pillButton ? 54 : 48,
          background: backgroundColor,
          // pillBackground: the stack gets 48 − 2 × 9 (selection view) − 2 × verticalSpacing, so icons and badges are
          // squeezed (12 pt at the default spacing), as TabBarCollectionViewCell lays them out (:270-288, :444-476)
          '--tab-stack-h': tabDisplayStyle === 'pillBackground' ? `${Math.max(0, 48 - 18 - 2 * verticalSpacing)}px` : undefined,
          ...style,
        } as CSSProperties
      }
      role="tablist"
    >
      <div ref={scroller} className="sk-tab-bar__scroller" data-scroll-x={widthMode === 'fitAllContent' ? '' : undefined}>
        <div className="sk-tab-bar__content" style={{ width: contentWidth || '100%', marginLeft: centering }}>
          {tabDisplayStyle === 'pillBackground' && indicator && (
            <span
              className={cx('sk-tab-bar__pill', animateSelection && animated && 'is-animated')}
              style={{
                left: indicator.x + horizontalSpacing,
                width: Math.max(0, indicator.w - 2 * horizontalSpacing),
                top: verticalSpacing,
                bottom: verticalSpacing,
                borderRadius: cornerRadius,
                background: selectedBackgroundColor,
              }}
            />
          )}
          {tabs.map((tab, i) => {
            const p = cellProgress(i)
            const selected = p > 0.5
            const color = blend(colors.a, colors.b, p)
            return (
              <TabCell
                key={i}
                tab={tab}
                left={lefts[i]}
                width={widths[i]}
                color={color}
                selected={selected}
                styleName={tabDisplayStyle}
                insets={insets}
                pad={pad}
                pillSelected={pillButton && selected}
                selectedBackgroundColor={selectedBackgroundColor}
                borderColor={borderColor}
                onTap={() => tap(i)}
              />
            )
          })}
          {tabDisplayStyle === 'underline' && indicator && (
            <span className={cx('sk-tab-bar__underline', animated && 'is-animated')} style={{ left: indicator.x, width: indicator.w, background: underlineColor }} />
          )}
        </div>
      </div>
      <div ref={measure} className="sk-tab-bar__measure" aria-hidden>
        {tabs.map((tab, i) => (
          <span key={i} className="sk-tab__stack">
            <TabContent tab={tab} color="currentColor" selected />
          </span>
        ))}
      </div>
    </div>
  )
}

function TabContent({ tab, color, selected }: { tab: SKTabBarTab; color: string; selected: boolean }) {
  let ornament: ReactNode = null
  const o = tab.ornament
  if (o) {
    let inner: ReactNode
    if ('icon' in o) inner = <Icon name={selected && o.selectedIcon ? o.selectedIcon : o.icon} size={20} color={o.iconColor ?? color} />
    else if ('image' in o) inner = <img src={asset(o.image)} alt="" draggable={false} className="sk-tab__image" />
    else if ('emoji' in o) inner = <SKEmoji name={o.emoji} size={20} />
    else inner = <SKMemberAvatar name={o.memberAvatar.name} src={o.memberAvatar.src} size="small" />
    ornament = <span className="sk-tab__ornament">{inner}</span>
  }
  const count = tab.count
  return (
    <>
      {tab.ornamentPosition === 'leading' && ornament}
      <span className={cx('sk-tab__title', selected && 'is-selected')} style={{ color }}>
        {tab.title}
      </span>
      {count && typeof count === 'object' && 'label' in count && count.label !== '' && (
        <span className="sk-tab__count" style={{ color }}>
          {count.label}
        </span>
      )}
      {count && typeof count === 'object' && 'badge' in count && <SKBadge count={count.badge} maxBadgeCount={count.maxCount ?? 99} />}
      {count === 'dot' && <span className="sk-tab__dot" />}
      {tab.ornamentPosition !== 'leading' && ornament}
    </>
  )
}

function TabCell({
  tab,
  left,
  width,
  color,
  selected,
  styleName,
  insets,
  pad,
  pillSelected,
  selectedBackgroundColor,
  borderColor,
  onTap,
}: {
  tab: SKTabBarTab
  left: number
  width: number
  color: string
  selected: boolean
  styleName: SKTabBarDisplayStyle
  insets: { t: number; l: number; b: number; r: number }
  pad: number
  pillSelected: boolean
  selectedBackgroundColor: string
  borderColor: string
  onTap: () => void
}) {
  // the selection view: baseSecondary (underline), white @13 % (pill background), selectedBackgroundColor (pill button)
  const selectionColor = styleName === 'underline' ? 'var(--dt_color_base_secondary)' : styleName === 'pillBackground' ? 'rgb(255 255 255 / 0.13)' : selectedBackgroundColor
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={tab.accessibilityLabel ?? tab.title}
      className={cx('sk-tab', pillSelected && 'is-pill-selected')}
      style={{ left, width, background: styleName === 'underline' ? (tab.backgroundColor ?? 'var(--dt_color_base_primary)') : undefined }}
      onClick={onTap}
      data-tap=""
    >
      <span
        className="sk-tab__selection"
        style={{ top: insets.t, left: insets.l, bottom: insets.b, right: insets.r, background: selectionColor, boxShadow: styleName === 'pillButton' ? `inset 0 0 0 1px ${borderColor}` : undefined }}
      />
      <span className="sk-tab__frame" style={{ top: insets.t, left: insets.l, bottom: insets.b, right: insets.r, paddingLeft: pad, paddingRight: pad, boxShadow: styleName === 'pillButton' ? `inset 0 0 0 1px ${borderColor}` : undefined }}>
        <span className="sk-tab__stack">
          <TabContent tab={tab} color={color} selected={selected} />
        </span>
      </span>
    </button>
  )
}
