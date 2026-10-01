import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { SKTabBar, type SKTabBarProps, type SKTabBarTab } from './SKTabBar'
import { cx } from './util'
import './tabs.css'

// SKPageController (DesignerComponents/PageController/SKPageController.swift): horizontally paged content with an
// SKTabBar. The tabs show only with more than one page; a 1 px outlineTertiary hairline sits by them; swiping pages
// moves the tab indicator continuously with the scroll (:113-118, :331-345, :544-590). Tapping a tab jumps to its page
// (animated with isAnimatedPageIndexTransition). Spec: slackkit-components.md › SKPageController.
//
// Tab bar position, as iOS lays it out (UIStackView reordering at :331-345, SNAP/SKPageControllerSnapshotTests):
// `top` = tabs, hairline, pages; `bottom` (the default) = tabs, pages, hairline — the tabs end up on top either way;
// `hidden` = pages only.
//
//   <SKPageController tabBarPosition="top" pages={[
//     { id: 'all', tab: { title: 'All' }, content: <AllList /> },
//     { id: 'mentions', tab: { title: 'Mentions' }, content: <Mentions /> },
//   ]} />

export interface SKPageControllerPage {
  id: string
  tab: SKTabBarTab
  content: ReactNode
}

interface Props {
  pages: SKPageControllerPage[]
  /** the page shown; it also moves on its own when swiped or tapped, and follows changes to this */
  pageIndex?: number
  /** default primary.basePrimary */
  backgroundColor?: string
  tabDisplayStyle?: SKTabBarProps['tabDisplayStyle']
  /** extra SKTabBar props (underlineColor, pill colors…) */
  tabBar?: Partial<SKTabBarProps>
  tabBarPosition?: 'top' | 'bottom' | 'hidden'
  tabBarWidthMode?: 'fitToBar' | 'fitAllContent'
  tabBarBackgroundColor?: string
  tabBarContentInset?: { left?: number; right?: number }
  isScrollEnabled?: boolean
  addRoundedCornersToPageControllers?: boolean
  isAnimatedPageIndexTransition?: boolean
  /** a view between the tabs and the pages */
  accessoryItem?: ReactNode
  shouldHideHairlineView?: boolean
  onTabTapped?: (index: number) => void
  onSettledOnPage?: (index: number) => void
  className?: string
  style?: CSSProperties
}

export function SKPageController({
  pages,
  pageIndex = 0,
  backgroundColor = 'var(--dt_color_base_primary)',
  tabDisplayStyle = 'underline',
  tabBar,
  tabBarPosition = 'bottom',
  tabBarWidthMode = 'fitToBar',
  tabBarBackgroundColor = 'var(--dt_color_base_primary)',
  tabBarContentInset,
  isScrollEnabled = true,
  addRoundedCornersToPageControllers = false,
  isAnimatedPageIndexTransition = false,
  accessoryItem,
  shouldHideHairlineView = false,
  onTabTapped,
  onSettledOnPage,
  className,
  style,
}: Props) {
  const pagesRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(pageIndex)
  const settled = useRef(pageIndex)
  // a drag that paged isn't a tap on the content under the pointer
  const justPaged = useRef(false)
  const drag = useRef<{ x: number; y: number; left: number; id: number; t: number; paging: boolean } | null>(null)

  const goTo = (i: number, animated: boolean) => {
    const el = pagesRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: animated ? 'smooth' : 'auto' })
  }
  // follow the owner's page index
  useEffect(() => {
    goTo(pageIndex, false)
    setProgress(pageIndex)
    settled.current = pageIndex
  }, [pageIndex])

  const onScroll = () => {
    const el = pagesRef.current
    if (!el || !el.clientWidth) return
    const p = el.scrollLeft / el.clientWidth
    setProgress(p)
    const r = Math.round(p)
    if (Math.abs(p - r) < 0.01 && r !== settled.current) {
      settled.current = r
      onSettledOnPage?.(r)
    }
  }

  // Mouse drags page like a finger would (touch and trackpads scroll natively).
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pagesRef.current
    if (!el || !isScrollEnabled || e.pointerType === 'touch' || e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, id: e.pointerId, t: performance.now(), paging: false }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pagesRef.current
    const d = drag.current
    if (!el || !d || e.pointerId !== d.id) return
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1
    const dx = (e.clientX - d.x) / scale
    const dy = (e.clientY - d.y) / scale
    if (!d.paging) {
      if (Math.hypot(dx, dy) < 6) return
      // a mostly vertical drag scrolls the page's own content instead (src/app/gestures.ts)
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null
        return
      }
      d.paging = true
      el.style.scrollSnapType = 'none'
    }
    el.scrollLeft = d.left - dx
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pagesRef.current
    const d = drag.current
    drag.current = null
    if (!el || !d || e.pointerId !== d.id || !d.paging) return
    justPaged.current = true
    setTimeout(() => (justPaged.current = false), 0)
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1
    const dx = (e.clientX - d.x) / scale
    const v = dx / Math.max(1, performance.now() - d.t)
    const from = Math.round(d.left / el.clientWidth)
    let to = Math.round(el.scrollLeft / el.clientWidth)
    if (Math.abs(v) > 0.3) to = from + (dx < 0 ? 1 : -1)
    to = Math.max(0, Math.min(pages.length - 1, to))
    el.style.scrollSnapType = ''
    el.scrollTo({ left: to * el.clientWidth, behavior: 'smooth' })
  }

  const showTabs = pages.length > 1 && tabBarPosition !== 'hidden'
  const tabs = showTabs ? (
    <SKTabBar
      tabs={pages.map((p) => p.tab)}
      selectionProgress={progress}
      tabDisplayStyle={tabDisplayStyle}
      widthMode={tabBarWidthMode}
      backgroundColor={tabBarBackgroundColor}
      contentInset={tabBarContentInset}
      shouldAutomaticallyPerformTabChange={false}
      {...tabBar}
      onTabTapped={(i) => {
        goTo(i, isAnimatedPageIndexTransition)
        onTabTapped?.(i)
        tabBar?.onTabTapped?.(i)
      }}
    />
  ) : null
  const hairline = showTabs && !shouldHideHairlineView ? <div className="sk-page-controller__hairline" /> : null
  const pagesEl = (
    <div
      ref={pagesRef}
      className={cx('sk-page-controller__pages', !isScrollEnabled && 'is-locked')}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (!justPaged.current) return
        justPaged.current = false
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      {pages.map((p) => (
        <div key={p.id} className="sk-page-controller__page">
          {p.content}
        </div>
      ))}
    </div>
  )
  return (
    <div className={cx('sk-page-controller', addRoundedCornersToPageControllers && 'is-rounded', className)} style={{ background: backgroundColor, ...style }}>
      {tabs}
      {tabBarPosition === 'top' && hairline}
      {accessoryItem}
      {pagesEl}
      {tabBarPosition === 'bottom' && hairline}
    </div>
  )
}
