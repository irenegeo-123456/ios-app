import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useApp, type Route } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { GlassButton, GlassGroup, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { SheetNavBar, type SheetBarItem } from './SheetNavBar'
import './modal-stack.css'

// A modal's navigation controller, for the flows Slack presents modally and then pushes inside: ModalPresentationController
// embeds a ModallyPresentableFeature in a navigation controller (shouldEmbedInNavigationController), routes presented
// with .allowsFuturePushesToThisModal keep it, and later routes push onto it (ModalPresentationController.swift:27-35,
// 111-124, 271-313, 349-371): Preferences (Preferences/Implementation/SettingsRouteExecution.swift:13-18), Notifications
// (NotificationSettingsRouteExecution.swift:11-26), Set a Status's "Clear after…". The pages slide in like any UIKit
// push (0.35 s, the page below moves 30 %), and the bar's leading item is the automatic close button on the first page
// (UIViewController+CloseButton.swift:61-77) and UIKit's back button on the others. (slack-objc 14b3cbaf.)
//
// The same pages can be pushed on a tab's stack instead (a prototype's push({ screen: 'preferences' })): each page is
// then its own stack entry ({ screen, page, depth, …props }) and the bar is the tab's NavBar with its back button.
//
//   <ModalStack pages={{ root: Root, appearance: Appearance }} root="root" />        inside a registered sheet
//   <ModalScreen pages={…} root="root" route={route} />                               inside a registered screen
//   function Appearance() { const nav = useModalNav(); return <ModalPage title="Dark Mode">…</ModalPage> }

export type ModalPageComponent = ComponentType<Record<string, unknown>>

export interface ModalNav {
  /** 'sheet': inside a presented modal; 'screen': pushed on a tab's navigation stack */
  kind: 'sheet' | 'screen'
  /** the page's index in its modal (0 = the modal's first page) */
  depth: number
  push: (page: string, props?: Record<string, unknown>) => void
  pop: () => void
  /** dismisses the modal (runs `then` once it's gone); on a tab, pops back to before its first page */
  close: (then?: () => void) => void
}

const NavContext = createContext<ModalNav | null>(null)

/** The modal navigation the page is shown in (a no-op one outside of ModalStack / ModalScreen). */
export function useModalNav(): ModalNav {
  return useContext(NavContext) ?? FALLBACK
}
const FALLBACK: ModalNav = { kind: 'screen', depth: 0, push: () => undefined, pop: () => useApp.getState().pop(), close: (then) => (useApp.getState().pop(), then?.()) }

/** UIKit's push / pop (as StackView's deeper pushes): 0.35 s */
const PUSH_MS = 350

interface Entry {
  key: string
  page: string
  props: Record<string, unknown>
}
let seq = 0

/** The navigation controller inside a sheet: `root` first; push / pop slide pages in and out. */
export function ModalStack({ pages, root, rootProps }: { pages: Record<string, ModalPageComponent>; root: string; rootProps?: Record<string, unknown> }) {
  const sheet = useSheet()
  const dismissSheet = useApp((s) => s.dismissSheet)
  const [stack, setStack] = useState<Entry[]>(() => [{ key: `p${++seq}`, page: root, props: rootProps ?? {} }])
  const current = useRef(stack)
  current.current = stack
  const [leaving, setLeaving] = useState<Entry | null>(null)
  const [entering, setEntering] = useState<string | null>(null)

  const close = (then?: () => void) => {
    dismissKeyboard()
    if (sheet) sheet.dismiss(then)
    else {
      dismissSheet()
      then?.()
    }
  }
  const navFor = (depth: number): ModalNav => ({
    kind: 'sheet',
    depth,
    push: (page, props) => {
      dismissKeyboard()
      const e = { key: `p${++seq}`, page, props: props ?? {} }
      setEntering(e.key)
      setStack((s) => [...s.slice(0, depth + 1), e])
    },
    pop: () => {
      dismissKeyboard()
      const s = current.current
      if (s.length < 2) return
      setLeaving(s[s.length - 1])
      setStack(s.slice(0, -1))
    },
    close,
  })

  // a popped page stays on screen while it slides out
  useLayoutEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setLeaving(null), PUSH_MS)
    return () => clearTimeout(t)
  }, [leaving])
  useLayoutEffect(() => {
    if (!entering) return
    const t = setTimeout(() => setEntering(null), PUSH_MS)
    return () => clearTimeout(t)
  }, [entering])

  const shown = leaving ? [...stack, leaving] : stack
  return (
    <div className="modal-stack">
      {shown.map((e, i) => {
        const isLeaving = e === leaving
        // the page under a popped one slides back while the popped one slides out
        const covered = !isLeaving && i < stack.length - 1
        const Page = pages[e.page]
        return (
          <div
            key={e.key}
            className={['modal-stack__page', covered && 'is-covered', e.key === entering && 'is-entering', isLeaving && 'is-leaving'].filter(Boolean).join(' ')}
            aria-hidden={covered || isLeaving}
            inert={covered || isLeaving ? true : undefined}
          >
            <NavContext.Provider value={navFor(Math.min(i, stack.length - 1))}>{Page ? <Page {...e.props} /> : null}</NavContext.Provider>
          </div>
        )
      })}
    </div>
  )
}

/** The same pages pushed on a tab's stack: route = { screen, page?, depth?, …props }. */
export function ModalScreen({ pages, root, route }: { pages: Record<string, ModalPageComponent>; root: string; route: Route }) {
  const { screen, page, depth, ...props } = route
  const d = typeof depth === 'number' ? depth : 0
  const nav = useMemo<ModalNav>(
    () => ({
      kind: 'screen',
      depth: d,
      push: (next, p) => useApp.getState().push({ ...(p ?? {}), screen, page: next, depth: d + 1 }),
      pop: () => useApp.getState().pop(),
      close: (then) => {
        const s = useApp.getState()
        for (let i = 0; i <= d; i++) s.pop()
        then?.()
      },
    }),
    [screen, d],
  )
  const Page = pages[typeof page === 'string' && pages[page] ? page : root]
  return <NavContext.Provider value={nav}>{Page ? <Page {...props} /> : null}</NavContext.Provider>
}

/** A bar button item: a title ("Save") or an icon (svgCheck), optionally disabled. */
export type BarItem = SheetBarItem

interface PageProps {
  title: ReactNode
  /** the right bar button item */
  trailing?: BarItem
  /** replaces the leading item (a "Cancel" title button on an edit screen) */
  leading?: BarItem
  /** runs instead of popping / closing (unsaved changes) */
  onBack?: () => void
  /** the list's background (default basePrimary) */
  background?: string
  children: ReactNode
  className?: string
  /** the scroll container (for scrolling to a field) */
  scrollRef?: React.Ref<HTMLDivElement>
  'data-screen'?: string
}

/**
 * One page of a modal: its navigation bar and a scrolling list under it. In a sheet the bar is the form sheet's (glass
 * close or back circle 16 pt in, title, a glass bar button; SheetNavBar); on a tab it's the tab's NavBar. The list starts
 * under the bar and ends clear of the home indicator (sheet) or the floating tab bar (tab).
 */
export function ModalPage({ title, trailing, leading, onBack, background, children, className, scrollRef, ...rest }: PageProps) {
  const nav = useModalNav()
  const [scrolled, setScrolled] = useState(false)
  const back = onBack ?? (nav.depth > 0 ? nav.pop : () => nav.close())
  const list = (
    <div
      ref={scrollRef}
      className={`ios-scroll modal-page__list${nav.kind === 'screen' ? ' is-screen' : ''}`}
      onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 0)}
      data-sheet-scroll
    >
      {children}
      <div className="modal-page__end" />
    </div>
  )
  const titleNode = <span className="you-title">{title}</span>
  if (nav.kind === 'screen') {
    return (
      <div className={['ios-pushed-screen modal-page', className].filter(Boolean).join(' ')} style={background ? { background } : undefined} data-screen={rest['data-screen']}>
        {list}
        <NavBar
          title={titleNode}
          scrolled={scrolled}
          onBack={back}
          leading={leading ? <TabBarItem item={leading} /> : undefined}
          trailing={trailing ? <TabBarItem item={trailing} /> : undefined}
        />
      </div>
    )
  }
  return (
    <div className={['modal-page is-sheet', className].filter(Boolean).join(' ')} style={background ? { background } : undefined} data-screen={rest['data-screen']}>
      {list}
      <SheetNavBar
        title={titleNode}
        onClose={!leading && nav.depth === 0 ? back : undefined}
        onBack={!leading && nav.depth > 0 ? back : undefined}
        leading={leading}
        trailing={trailing}
        scrolled={scrolled}
      />
    </div>
  )
}

/** A bar button item on a tab's NavBar: a glass circle for an icon, a glass capsule for a title. */
function TabBarItem({ item }: { item: BarItem }) {
  if (item.icon)
    return (
      <GlassButton label={item.label ?? item.title ?? ''} onClick={item.disabled ? undefined : item.onClick} className={item.disabled ? 'modal-page__item is-disabled' : 'modal-page__item'}>
        <Icon name={item.icon} size={20} color={item.color} />
      </GlassButton>
    )
  return (
    <GlassGroup className="modal-page__text-item">
      <button
        type="button"
        className={['glass-group__item modal-page__text-button', item.weight && `is-${item.weight}`].filter(Boolean).join(' ')}
        disabled={item.disabled}
        onClick={item.onClick}
        data-tap={item.disabled ? undefined : ''}
        style={item.color && !item.disabled ? { color: item.color } : undefined}
      >
        {item.title}
      </button>
    </GlassGroup>
  )
}
