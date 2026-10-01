import { useState } from 'react'
import { useApp } from '../../store'
import { NavBar } from '../../nav/NavBar'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SheetNavBar } from './SheetNavBar'
import { YouContent } from './YouContent'

// You (Modules/Features/You, spec shell-navigation.md §4.3): YouRoute presents it modally in a navigation controller
// (.formSheet: a page sheet, swipe to dismiss, no detents, an automatic close button) titled "You" (you, 24205) on
// basePrimary (YouViewController.swift:21-22). That's the 'you' sheet. The 'you' screen is the same list pushed on a
// tab's stack (prototypes' `view: 'you'`, and Home's avatar button today), with a back button instead.

/** SKNavigationBar's title: Lato Bold 17, contentPrimary (UINavigationBar+SlackStyles.swift:84). */
const Title = () => <span className="you-title">You</span>

export function YouScreen() {
  const [scrollY, setScrollY] = useState(0)
  return (
    <div className="ios-pushed-screen you" data-screen="you">
      <YouContent topInset="calc(var(--navbar-bottom))" onNavigate={(then) => then()} onScroll={setScrollY} />
      <NavBar title={<Title />} scrolled={scrollY > 0} />
    </div>
  )
}

export function YouSheet(_props: SheetProps) {
  const sheet = useSheet()
  const dismissSheet = useApp((s) => s.dismissSheet)
  const [scrollY, setScrollY] = useState(0)
  const close = (then?: () => void) => (sheet ? sheet.dismiss(then) : (dismissSheet(), then?.()))
  return (
    <div className="you you--sheet" data-screen="you-sheet">
      {/* the bar: 16 pt above a 44 pt row (SheetNavBar) */}
      <YouContent topInset={60} onNavigate={(then) => close(then)} onScroll={setScrollY} />
      <SheetNavBar title={<Title />} onClose={() => close()} scrolled={scrollY > 0} />
    </div>
  )
}
