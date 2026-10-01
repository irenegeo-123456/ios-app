import { useEffect } from 'react'
import { useApp, type Tab } from '../store'
import { useSim } from '../../sim/store'
import { Icon } from '../../icons/Icon'
import { SLACKBOT_DM, SLACKBOT_USER_ID } from '../screens/slackbot/constants'

// The root tab bar (CompactRootTabBarController, spec shell-navigation.md §1). On iOS 26 UIKit draws it as a floating
// Liquid Glass capsule of Home, DMs, Activity and More, with Search split off as its own circle at the trailing end.
// Slack only sets the items and their colors; the geometry below is UIKit's, measured on a real iOS 26 Slack
// screenshot (1320×2868 @3x, reference/ios/specs/measurements.md): capsule 62 pt tall, 21 pt from the screen's sides
// and bottom; Search circle 62 pt, 8 pt away; selected pill inset 4 pt (54 pt tall); 25 pt icons 11.5 pt from the top,
// Lato Bold 11 labels (Black when selected) below them.
//
// It's drawn inside each tab's root screen so it moves with it when a conversation is pushed, the way
// hidesBottomBarWhenPushed carries it in UIKit.

const ITEMS: { tab: Tab; label: string; icon: string; selectedIcon: string }[] = [
  { tab: 'home', label: 'Home', icon: 'home', selectedIcon: 'home_filled' },
  { tab: 'dms', label: 'DMs', icon: 'direct_messages', selectedIcon: 'direct_messages_filled' },
  { tab: 'activity', label: 'Activity', icon: 'notifications', selectedIcon: 'notifications_filled' },
  { tab: 'more', label: 'More', icon: 'ellipsis_horizontal_filled', selectedIcon: 'ellipsis_horizontal_filled' },
]
/** With the Slackbot tab rollout on, Slackbot takes More's place: "Slackbot", slackbot_color drawn in its own colors
 *  (.alwaysOriginal) in both states (CompactRootTabBarController.swift:224-231). */
const SLACKBOT_ITEM = { tab: 'slackbot' as Tab, label: 'Slackbot', icon: 'slackbot_color', selectedIcon: 'slackbot_color' }

export function TabBar() {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  const slackbotTab = useSim((s) => s.slackbotTab)
  // iOS 26 tabs (CompactRootTabBarController.swift:483-501): Home, DMs, Activity, then More, or with the Slackbot tab
  // rollout (ios_slackbot_bottom_tab) Slackbot when Slackbot AI is visible to the user (aiUserPermissionsService
  // .slackbot, :699-706) and nothing otherwise; Search split off at the end. Here Slackbot is visible when the
  // workspace has the Slackbot user (as the conversation bars decide it, ConversationNavBar).
  const slackbotVisible = useApp((s) => !!s.fx.users[SLACKBOT_USER_ID])
  const items = slackbotTab ? (slackbotVisible ? [...ITEMS.slice(0, 3), SLACKBOT_ITEM] : ITEMS.slice(0, 3)) : ITEMS
  // Turning the setting on or off while its tab is open lands on the one that replaced it (Home when no tab did:
  // a removed selected tab falls back to the first, :494-498)
  useEffect(() => {
    if (slackbotTab && tab === 'more') setTab(slackbotVisible ? 'slackbot' : 'home')
    if ((!slackbotTab || !slackbotVisible) && tab === 'slackbot') setTab(slackbotTab ? 'home' : 'more')
  }, [slackbotTab, slackbotVisible, tab, setTab])
  // Badges are dots (U+25CF), never counts (spec §1.4): Home when Home has badged conversations, DMs when a DM is
  // unread, Activity when Activity has unread items, Slackbot when its conversations (threads in the Slackbot DM) have
  // unread replies (slackbotTabBadge = slackbotThreadUnreadsCount, BadgeCountRules.swift:110-118;
  // CompactRootTabBarController.swift:629-631, :788-806).
  const homeBadge = useApp((s) => Object.values(s.fx.unreads).some((u) => u.mentions > 0))
  const dmBadge = useApp((s) => Object.entries(s.fx.unreads).some(([id, u]) => u.count > 0 && ['im', 'mpim'].includes(s.fx.conversations[id]?.type ?? '')))
  const activityBadge = useApp((s) => s.fx.activityBadge > 0)
  const slackbotBadge = useApp((s) => (s.fx.unreads[SLACKBOT_DM]?.count ?? 0) > 0)
  const badges: Partial<Record<Tab, boolean>> = { home: homeBadge, dms: dmBadge, activity: activityBadge, slackbot: slackbotBadge }
  return (
    <div className="ios-tabbar" role="tablist" data-qa="tab_bar">
      <div className="ios-tabbar__capsule glass">
        {items.map((it) => {
          const selected = it.tab === tab
          return (
            <button key={it.tab} type="button" role="tab" aria-selected={selected} className={`ios-tabbar__item${selected ? ' is-selected' : ''}`} onClick={() => setTab(it.tab)} data-qa={`tab_${it.tab}`}>
              {selected && <span className="ios-tabbar__pill" />}
              <span className="ios-tabbar__icon">
                <Icon name={selected ? it.selectedIcon : it.icon} size={25} />
                {badges[it.tab] && <span className="ios-tabbar__badge">●</span>}
              </span>
              <span className="ios-tabbar__label">{it.label}</span>
            </button>
          )
        })}
      </div>
      <button type="button" role="tab" aria-selected={tab === 'search'} aria-label="Search" className={`ios-tabbar__search glass${tab === 'search' ? ' is-selected' : ''}`} onClick={() => setTab('search')} data-qa="tab_search">
        <Icon name="search_filled" size={25} />
      </button>
    </div>
  )
}
