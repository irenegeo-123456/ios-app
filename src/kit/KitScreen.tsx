import { useState, type ReactNode } from 'react'
import { NavBar } from '../app/nav/NavBar'
import './kit-screen.css'

/**
 * A pushed screen for prototypes (`screens: { name: MyScreen }`): the iOS 26 navigation bar (glass back button,
 * centered title, optional trailing glass buttons) over a scrolling body that starts below the bar and clears the
 * floating tab bar. The bar's edge fades in once the body scrolls under it, as UIKit's scroll edge effect does.
 *
 *   function Approvals() {
 *     return <KitScreen title="Approvals">…SlackKit rows…</KitScreen>
 *   }
 */
export function KitScreen({
  title,
  subtitle,
  trailing,
  children,
  tabBar = true,
  className,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  /** glass buttons on the right: <GlassButton label="Add" onClick={…}><Icon name="plus" size={20} /></GlassButton> */
  trailing?: ReactNode
  children?: ReactNode
  /** leave room for the floating tab bar (default); register the screen with { tabBar: false } to hide it */
  tabBar?: boolean
  className?: string
}) {
  const [scrolled, setScrolled] = useState(false)
  return (
    <div className={['ios-pushed-screen', 'kit-screen', className].filter(Boolean).join(' ')}>
      <NavBar title={title} subtitle={subtitle} trailing={trailing} scrolled={scrolled} />
      <div className={`ios-scroll kit-screen__body${tabBar ? '' : ' kit-screen__body--no-tabbar'}`} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        {children}
      </div>
    </div>
  )
}
