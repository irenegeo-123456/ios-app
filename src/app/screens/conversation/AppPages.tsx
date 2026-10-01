import { useApp } from '../../store'
import { AppHome as AppHomeSurface } from '../../../apps/ui/AppHome'
import { AppProfile } from '../../../apps/ui/AppProfile'
import '../../../apps/ui/app-dm.css'

// App DMs (spec blockkit.md §8; messages.md §10.3): no header menu, so their pages sit in a visible SKTabBar under the nav
// bar — Home (if the app has one), Messages, About (AnyConversationPresenter.swift:160-255, 398-423). The Home and About
// pages are the Block Kit area's (src/apps/ui): the runtime-driven App Home and the App Profile.

export type AppTab = 'home' | 'messages' | 'about'

/**
 * The tab an app DM opens on (AnyConversationPresenter.swift:136-150,244-255, Sept): a deep-linked tab, else Messages
 * when there are unreads or a linked message, else Messages for an agent's DM (new in Sept: "Agent app conversations
 * default to the messages tab over the home tab", :244-246), else Home, else the first tab.
 */
export function initialAppTab(o: { linked?: AppTab; hasHome: boolean; unreadOrLinked: boolean; isAgent: boolean }): AppTab {
  if (o.linked && (o.linked !== 'home' || o.hasHome)) return o.linked
  if (o.unreadOrLinked || o.isAgent || !o.hasHome) return 'messages'
  return 'home'
}

export function appTabs(hasHome: boolean): { id: AppTab; title: string }[] {
  return [...(hasHome ? [{ id: 'home' as const, title: 'Home' }] : []), { id: 'messages', title: 'Messages' }, { id: 'about', title: 'About' }] // yaml:1941, 12301, 1938
}

/**
 * SKTabBar, underline style (SKTabBar.swift:22-27, 87-89, 301-307, 447-478; TabBarCollectionViewCell.swift:369-380): 48 pt,
 * tabs sized to content then stretched to fill on iPhone, Lato 15 (Bold when selected, past selectionProgressThreshold)
 * blending content_secondary → content_primary, a 4 pt highlight2.baseInverse underline (radius 2; June
 * sk_lilypad_green) under the selected tab; a 1 px outline_tertiary hairline
 * under the bar (SKPageController.swift:115-121). No unread badge: the tabs carry only a title and icons
 * (AnyConversationViewController.swift:278); `showBadge` goes to the header-menu variant (AnyConversationPresenter.swift:540).
 */
export function AppTabBar({ tabs, current, onSelect }: { tabs: { id: AppTab; title: string }[]; current: AppTab; onSelect: (t: AppTab) => void }) {
  return (
    <div className="convo-apptabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === current} className={`convo-apptabs__tab${t.id === current ? ' is-selected' : ''}`} onClick={() => onSelect(t.id)} data-tap>
          <span className="convo-apptabs__press" />
          <span className="convo-apptabs__title">{t.title}</span>
          {t.id === current && <span className="convo-apptabs__underline" />}
        </button>
      ))}
    </div>
  )
}

/**
 * The Home tab: the app's App Home (an embedded AppViewFeature): its `home` blocks or state, updated by publishHome, on
 * the renderer's 'home' surface (16 pt insets, 8 pt top, `optional` neither shown nor enforced), with the loading
 * overlay while it loads or publishes (src/apps/ui/AppHome.tsx).
 */
export function AppHome({ conversationId }: { conversationId: string }) {
  const appUserId = useApp((s) => s.fx.conversations[conversationId]?.userId)
  return appUserId ? <AppHomeSurface appUserId={appUserId} conversationId={conversationId} /> : null
}

/**
 * The About tab is the App Profile (Modules/Features/AppProfile): the card, "About %@" folded at 6 lines with Show more,
 * Commands, the About tab's actions and the installation line (src/apps/ui/AppProfile.tsx; the 'app-profile' screen
 * shows the same profile with its own actions).
 */
export function AppAbout({ conversationId }: { conversationId: string }) {
  const appUserId = useApp((s) => s.fx.conversations[conversationId]?.userId)
  return <div className="app-dm__about ios-scroll">{appUserId && <AppProfile appUserId={appUserId} insideAppHomeTab />}</div>
}
