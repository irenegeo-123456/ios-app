# Shell and navigation (iPhone)

**Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Every citation now points at that checkout (`slack-objc-latest`);
a citation marked [June] refers to the June snapshot (cd22922) the spec was first written from. What changed since June:

- **Tab bar**: the iOS 26 array is `[Home, DMs, Activity, More | Slackbot, Search]` (Search moved last; UIKit splits it
  off either way, so nothing moves on screen); `slackbotBottomTab` also needs Slackbot AI to be visible; the Slackbot tab
  can now badge; the bar background is `basePrimary` (same values as June's `sk_primary_background`); on iOS 27 the
  selected Search item drops its circle; the floating player is inset 20 pt on iOS 26; frontline workers get a compose
  FAB (§1).
- **Root headers**: Swift `rightButtons` arrays are leading-to-trailing (same screen order); DMs has no filter button
  on either shell (`iaNextDmsFilters` and `DMNavigationBarControlsManager` are gone; the pills are the only DMs
  filter); the Lato Black 22 title no longer grows with Dynamic Type and can carry a `micro` subtitle (Activity shows
  "Loading…" while loading); title menus always open on tap; the workspace avatar appears (blank) after 2 s when the
  workspace hasn't loaded; on the round header avatars the unread dot and the presence dot now sit **on the
  circle's edge at 45°** (§2.1–§2.2).
- **Navigation**: Home row taps always `.reset` the detail stack (June pushed in mode C); every More row resets the More
  stack (June: iPad only); conversation-header updates are throttled instead of debounced (§3, §4.2).
- **More / You**: External Connections is disabled for frontline workers; Files always opens `DocsRoute`; the You screen,
  status pill and pause sheet use dt tokens instead of the legacy `sk_*` grays; the You menu's pause presets drop
  "4 hours"; "Resume notifications" now reads "Resume"; `SKSwitch` is the system `UISwitch` tinted `highlight2.content`
  (§4).
- **Conversation header**: the huddle button is drawn by the new `SKHuddleBarButtonView` (32 pt badge or count pill in
  one stack; on glass the prominent capsule is the pill); the find-in-channel Search button (`ios_find_in_channel`,
  off) uses `svgQuickSwitch` and sits inboard of the other buttons (§3.5).
- **Elsewhere**: the tab coachmark fills with `highlight1.content` (dark `#2ba5ce`; June `#1264a3` in both modes);
  `SKNavigationController`, `SKNavigationItem` and the title views moved to `Modules/UIInfra/NavigationController/`,
  `RootViewControllerTabs` to `Modules/Features/Root/Implementation/LoggedIn/Compact/`; a SwiftUI "unified navigation"
  shell exists behind `ios_unified_nav_arch` (off; §0.1).
- **Snapshots**: component PNGs are 2×2 grids (light / dark × normal / high contrast); the iOS 26 bar-button baselines no
  longer draw glass; the pre-26 header baselines sit 26 pt higher; `Snapshots/iOS_27` folders exist (pulled since:
  §2.2 checks the Sept bar buttons against them and the device, which runs iOS 26.7).
- **Design tokens** `f76ac0a` (pinned by 14b3cbaf): `flamingo_40` and `dt_color_base_inverse_important` dark became
  `#d3305d`.

Root tab bar, root tab headers, pushed-screen navigation bars, More tab, You menu, workspace switcher, status bar
and safe areas. Paths are relative to the iOS repo root (`slack-objc-latest`, github.com/tinyspeck/slack-objc main @
`14b3cbaf`) unless they start with `Colors.swift` (= `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift`, the
design tokens 14b3cbaf pins in `internal.MODULE.bazel:209`). Snapshot PNG paths are repo-relative in the same checkout
(`iOS_26` LFS objects pulled; `iOS_18` PNGs are pointers there, so their measurements are June's). "pt" everywhere;
snapshot pixels were divided by 3.

---

## 0. Read this first

### 0.1 Two shells, chosen by OS version (not by a flag)

| | iOS 26 "Liquid Glass" | iOS 18 and earlier |
|---|---|---|
| Switch | `SystemInformation.isLiquidGlass` = `#available(iOS 26)` (`Modules/Foundation/SystemInformation/Implementation/SystemInformation.swift:625-628`) | same, false |
| Tab list | `[Home, DMs, Activity]` + `More` (flag `slackbotBottomTab` off) or `Slackbot` (flag on **and** Slackbot AI visible; neither when the flag is on but Slackbot isn't), then `Search` last (`Modules/Features/CompactRoot/Implementation/TabBar/CompactRootTabBarController.swift:483-501`). June had `[Home, DMs, Activity, Search]` + Slackbot/More; UIKit splits the search item off to the right either way, so the screen order is unchanged | `[Home, DMs, Activity]` + one of `Sales` / `Agentforce` / `Files` + `More` only if any overflow tab is enabled (flag off), or `Slackbot` (flag on and visible) (`…/CompactRootTabBarController.swift:503-526`) |
| Root header on Home/DMs/Activity/More | system `UINavigationBar` (`SKNavigationBarLiquidGlass`) + themed gradient drawn by the list ("PrimaryNavigationHeader"), §2.2. Every root tab feature returns `headerMode = isLiquidGlass ? .none : .search` (`Modules/Features/Home/Implementation/HomeFeature.swift:242-244`, `Modules/Features/DM/Implementation/DMFeature.swift:355-357`, `Modules/Features/Activity/Implementation/ActivityFeature.swift:911-913`, `Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPageFeature.swift:173-175`) | custom `CompactRootTabSearchHeader` (workspace icon, title, avatar, "Jump to or search…" field), §2.3 |
| Snapshot folder | `Snapshots/iOS_26` | `Snapshots/iOS_18` |

The `CompactRootTabSearchHeader` PNGs in `Snapshots/iOS_26/` render that header component directly, so they show the
pre-iOS 26 header, not what iOS 26 users see (in June each was pixel-identical to its `iOS_18` twin; the Sept `iOS_26`
baselines were re-recorded with a smaller top safe area, §2.3). No snapshot in the repo shows the iOS 26 root header or
the in-app tab bar.

A third shell exists behind flags: the SwiftUI **unified navigation architecture** (`NavigationArchitectureVariant`,
`Modules/Data/Toggles/Interface/NavigationArchitectureVariant.swift:27-45`; toggles `ios_unified_nav_arch` and
`ios_unified_nav_arch_single_stack`, both `"defaultValue": false`, `:207-256`; resolved once per launch from UserDefaults,
`legacy` by default, `:130-145`). In it the user avatar and the Slackbot button are contributed once, above the
`TabView`, and each tab's header carries only its title (Home keeps its workspace avatar and filter/history button)
(e.g. `Modules/Features/Home/Implementation/HomeInteractor.swift:245-256`, `Modules/Features/DM/Implementation/DMInteractor.swift:594-602`).
Production default is the legacy UIKit root described in this spec (the device screenshots match it).

### 0.2 Feature flags that change the shell (all default `false` in their JSON definitions)

| Flag (identifier) | Definition | Effect |
|---|---|---|
| `rootNavigationUpdates` (`ios_root_navigation_updates`) | `Modules/Data/Toggles/Definitions/root_navigation_updates.json` (iPhoneOnly); only true on iOS 26 via `iOS26RolloutManager()` (`Modules/Data/Toggles/Interface/FeatureFlagManager+iOS26.swift:118-133`) | Tabs use one standard `UINavigationController` stack (`RootTabViewController`) instead of the double-panel container; the FAB is not shown; reselecting a tab scrolls to top (`Modules/Features/CompactRoot/Implementation/CompactRootFeature+Dependencies.swift:87-162`, `…/CompactRootTabDecoratorViewController.swift:273-281`, `…/CompactRootTabBarController.swift:879-883`) |
| `slackbotBottomTab` (`ios_slackbot_bottom_tab`) | `…/Definitions/ios_slackbot_bottom_tab.json` | iOS 26 4th slot = Slackbot instead of More, but only while Slackbot AI is visible (no 4th tab otherwise); pre-26 likewise replaces More (`…/CompactRootTabBarController.swift:487-491`, `514-521`, `699-706`) |
| `slackbotMainHeaderEntrypoints` | `…/Definitions/ios_slackbot_main_header_entrypoints.json` | Root headers get a Slackbot button in its own capsule, leading the avatar; on Home it replaces the Filter/History button and gives the workspace title a menu (also needs `aiUserPermissionsService … .slackbot` visible) (`Modules/Features/Home/Implementation/HomeInteractor.swift:198-219`, `232-235`, `258-270`) |
| `historyMenu` | `…/Definitions/ios_history_menu.json` | Home: History button instead of Filter, title gets a menu (`…/HomeInteractor.swift:232-243`; pre-26 `549-574`) |
| `youMenu` | `…/Definitions/ios_you_menu.json` | Avatar button opens a menu instead of presenting the You screen: every header now hands the avatar `youMenu.youMenuPublisher`, which emits `nil` unless the flag is on (`Modules/Features/YouMenu/Implementation/YouMenu.swift:59-85`; tap without a menu → You, `Modules/Features/Handlers/PrimaryNavigationHeader/Implementation/PrimaryNavigationHeaderService.swift:225-231`) |
| `unifiedNavArch` / `unifiedNavArchSingleStack` (`ios_unified_nav_arch*`) | `…/Definitions/ios_unified_nav_arch.json`, `ios_unified_nav_arch_single_stack.json` (`cacheAfterFirstAccess`) | The SwiftUI root (§0.1): avatar and Slackbot above the `TabView`, title-only tab headers (`Modules/Data/Toggles/Interface/NavigationArchitectureVariant.swift:207-256`) |

Default build for the clone = all of these off. Removed since June: `iaNextDmsFilters` (`ios_ia_next_dms_filters.json`
[June], which hid the DMs filter button): the filter pills are the DMs tab's only filter and its header has no filter
button on either shell (`Modules/Features/DM/Implementation/DMInteractor.swift:588-616`; pre-26 header buttons: none,
`:1492-1494`); `DMNavigationBarControlsManager.swift` (the June filter menu) is gone.

**Production (device screenshots, Sept 2026).** Real iOS 26 screenshots (`reference/device/IMG_2246–2250`, measured in
measurements.md › D) show a build with server rollouts on that the June source has behind flags; the Sept checkout
(slack-objc-latest @ 14b3cbaf) has deleted most of those flags and made their code the only path, and the clone now draws
that code unconditionally (Home's section icons and section browser, the DMs pills, Activity's views and redesigned rows).
`src/app/flags.ts` keeps a flag only where something still decides at runtime, with production's value as the default
(one comment per flag citing its definition), overridable per visit with `?flags=-name,+name` and per prototype with
`definePrototype({ flags: { … } })`: `refreshedOnboardingV2`, `agentsAndAppsBadging`, `agentsInDms` (Home; Sept
toggles), `slackbotConversationHeaderEntry` (conversation and thread bars; an entitlement, not a toggle), and for now
`composerContextBar` (the 44 pt composer; its toggle is gone in Sept, kept only because `src/app/composer` still reads it). The flags in the table
above stay off in production (no Slackbot button in the root headers, a filter button on Home, More as the 4th tab).

### 0.3 How theme colors resolve (needed for header and tab bar)

- `UIColor(light:dark:)` returns the `light` or `dark` argument per trait (`Modules/Data/Color/Implementation/UIColor+Dynamic.swift:24-71`; Sept adds high-contrast and true-dark variants
  that only some tokens carry).
  Palette steps (`primary._80` etc.) are themselves light/dark colors, so `UIColor(light: primary._80, dark: primary._70)`
  = light value of step 80 in light mode, **dark** value of step 70 in dark mode.
- A theme = 4 palettes (`primary`, `highlight1`, `highlight2`, `important`) + `brightness` 1–6. `isSidebarInverted =
  brightness >= 4` (`Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:38`, `60`). Below, "inv" = brightness ≥ 4.
- Fallback theme when the user has none: `ColorSet.defaultAubergine` = all four palettes aubergine, brightness 5 (inv)
  (`…/ColorSet.swift:19-25`, `Modules/Integration/ThemesIntegration/Implementation/ThemeService.swift:117`).
- The header snapshots use primary aubergine, highlight1 ocean, highlight2 jade, important flamingo, brightness 5
  (`Modules/Features/CompactRoot/Tests/Unit/CompactRootTabSearchHeaderSnapshotTests.swift:175-179`).
- `withAlphaComponent` replaces the alpha of the resolved color (verified: search field pixels match α 0.1875 exactly).

Palette ramps used here (`Colors.swift`, light / dark; unchanged in design-tokens `f76ac0a` except flamingo 40, dark `#c02b54` → `#d3305d`):

| step | aubergine (`:1634-1705`) | ocean (`:1490-1561`) | jade (`:1274-1345`) | flamingo (`:1778-1849`) |
|---|---|---|---|---|
| 0 | `#f9edff` / `#200221` | `#e6f5fe` / `#081536` | `#e3fff3` / `#05241b` | `#ffe8ef` / `#300005` |
| 5 | `#f6e4ff` / `#300c31` | `#c2e6fd` / `#062755` | | |
| 10 | `#f4daff` / `#431349` | `#9ed6fa` / `#073368` | | |
| 20 | `#eabdfb` / `#5f2565` | `#73bdf3` / `#0b4379` | `#74dbaf` / `#00553d` | `#ffa3c2` / `#8e0b2a` |
| 30 | `#df9ff4` / `#7d3986` | `#54a9ea` / `#135795` | | |
| 40 | `#d389e7` / `#9652a2` | | | `#fa5f90` / `#d3305d` |
| 50 | `#c474d3` / `#b26ec3` | | `#20a271` / `#259b69` | |
| 60 | `#a350af` / `#bc80ce` | `#1b74b9` / `#448dcc` | `#178f65` / `#3daa7c` | |
| 70 | `#83388a` / `#cfa1de` | | `#007a5a` / `#63c29a` | `#c01343` / `#e68ba7` |
| 80 | `#611f69` / `#d8bae1` | `#0b4c8c` / `#88bbe2` | | |
| 90 | `#4a154b` / `#e3ceeb` | `#093a73` / `#b0d3ed` | | |
| 100 | `#39063a` / `#efe1f5` | `#122a59` / `#dbebf6` | | |

Theme properties used in this spec (`Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift`):

| Property | Formula (light / dark) | line |
|---|---|---|
| `baseInverseSecondaryNonSidebar` | `primary._80` / `primary._70` | 91 |
| `baseInverseImportant` | `important._70` / `important._40` | 125 |
| `baseImportant` | inv ? `important._20` : `important._70` / `important._70` (high contrast `_80`) | 121-124 |
| `baseHighlight2` | inv ? `highlight2._20` : `highlight2._50` / `highlight2._60` | 110-112 |
| `contentInversePrimary` | inv ? white : `primary._100` / white | 166-168 |
| `contentInverseSecondary` | inv ? `primary._0`@0.8 : `primary._100`@0.7 / `primary._90`@0.9 | 169-172 |
| `contentInverseTertiary` | inv ? `primary._0`@0.7 : `primary._100`@0.5 / `primary._90`@0.7 | 174-177 |
| `surfaceInversePrimary` | inv ? `primary._0`@0.25 : `primary._100`@0.13 / `primary._100`@0.25 | 147-149 |
| `searchBarBackground` (extension) | `surfaceInversePrimary` with α 0.1875 (`0.25 * 0.75`) | `Modules/Integration/ThemesIntegration/Interface/ThemeService+ArbitraryConstants.swift:13-15` |
| `backgroundGradient1` | b1 `_0`/`_10`; b2 `_5`/`_10`; b3 `_10`/`_10`; b4 inv `_70` (else `_60`)/`_10`; b5 inv `_80` (else `_70`)/`_10`; b6 inv `_90` (else `_80`)/`_10` — of **primary** | 193-207 |
| `backgroundGradient2` | b1 `_10`/`_0`; b2 `_20`/`_0`; b3 `_30`/`_0`; b4 `_80`/`_0`; b5 `_90`/`_0`; b6 `_100`/`_0` — of **highlight1** | 210-224 |

---

## 1. Root tab bar

**Source**: `Modules/Features/CompactRoot/Implementation/TabBar/CompactRootTabBarController.swift` (a `UITabBarController`,
line 52). Tab enum: `Modules/Integration/Navigation/Interface/CompactRootTab.swift:4-14`
(`agentforce, conversations, directMessages, mentions, search, salesHome, more, slackbot, docs`). Titles:
`Modules/Integration/SlackLegacyModularization/Interface/Navigation/HomeTab+Info.swift:5-35`.
Snapshots: none of the real tab bar. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.UITabBarItemIconsSnapshotTests/testTabBarItemFromIcon@3x.png`
(unchanged since June) shows only a bare system `UITabBar` with one default-styled item (see §1.5).

### 1.1 Tabs and order

- iOS 26: Home, DMs, Activity, then More (default) or Slackbot (`slackbotBottomTab` on **and** Slackbot AI visible; with
  the flag on and Slackbot hidden there is no 4th tab), then Search, which UIKit splits off to the right
  (`…/CompactRootTabBarController.swift:483-501`). If the selected tab disappears, selection falls back to Home (`:495-502`).
- Pre-iOS 26: Home, DMs, Activity, then Sales if Sales Home is visible, else Agentforce if enabled, else Files; then
  More only if `tabBarOverflowService.enabledOverflowTabIdentifierPublisher.value` is non-empty, or Slackbot with the flag
  (`:503-526`).
- The list is rebuilt when the overflow tabs, Sales visibility, Agentforce, or the flag/Slackbot visibility change
  (`:640-645`, `679-706`). Initial tab `.conversations` (Home) (`:323`, `407-411`).
- Clone (`src/app/nav/TabBar.tsx`): the simulator's "Slackbot tab" setting stands in for `slackbotBottomTab`, the
  workspace's Slackbot user for "Slackbot AI visible"; the Slackbot item takes its dot from unreads in the Slackbot DM
  (§1.4).

### 1.2 Tab items

All icons are SVG, 20×20 viewBox, rasterized at **25×25 pt** (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/Icon/UITabBarItem+Icons.swift:14-28`,
drawn by `SKIconManifest.deprecatedImage` `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Icon/SKIconManifest+Extensions.swift:25-54`).
They are template images, tinted by the tab bar item colors (§1.3), except Slackbot.
SVG path pattern: `Modules/Data/Icon/ResourceBundle/Icons.xcassets/<file>.imageset/<file>.svg`.

| Tab | Label (key → value) | Normal icon | Selected icon | Code |
|---|---|---|---|---|
| Home | `CompactRootTab.conversations.abbreviatedTitle` = `home` → "Home" (`localized_strings.yaml:7966`) | `svgHome` `home.svg` | `svgHomeFilled` `home_filled.svg` | `:173-182` |
| DMs | `abbreviatedTitle` = `dms` → "DMs" (`:5586`) | `svgDirectMessages` `direct_messages.svg` | `svgDirectMessagesFilled` `direct_messages_filled.svg` | `:184-193` |
| Activity | `activity` → "Activity" (`:586`) (not the `abbreviatedTitle` "Mentions") | `svgNotifications` `notifications.svg` | `svgNotificationsFilled` `notifications_filled.svg` | `:195-203` |
| More | `more` → "More" (`:12436`) | `svgEllipsisHorizontalFilled` `ellipsis_horizontal_filled.svg` | same | `:205-215` |
| Slackbot (flag) | `abbreviatedTitle` = `slackbot_user` → "Slackbot" (`:20262`) | `svgSlackbotColor` `slackbot_color.svg`, full color (`.alwaysOriginal`, not tinted) | same image | `:224-231` |
| Search (iOS 26 only, last) | system item `UITabBarItem(tabBarSystemItem: .search, tag: 0)` → system-provided title | `svgSearchFilled` `search_filled.svg` (the filled glyph is used for **both** states) | iOS 26: `search_filled.svg` 25 pt glyph centered on a 49×49 pt circle (12 pt padding each side), circle fill = `searchTabSelectedBackgroundColor`; iOS 27: the plain glyph (new in Sept) | `:267-289`, `1184-1194` |
| Files (pre-26) | `files` → "Files" (`:7101`) | `svgCanvasBrowser` `canvas_browser.svg` | `svgCanvasBrowserFilled` `canvas_browser_filled.svg` | `:233-243` |
| Sales (pre-26) | `sales` → "Sales" (`:16746`) | `svgSales` `sales.svg` | `svgSalesFilled` `sales_filled.svg` | `:245-254` |
| Agentforce (pre-26) | `agentforce` → "Agentforce" (`:1182`) | `svgAgentforce` `agentforce.svg` | `svgAgentforceFilled` `agentforce_filled.svg` | `:256-265` |

Search selected circle color: `core.primary.surfaceSecondary` RGB (`dt_color_surface_secondary` `#1d1c1d` light /
`#f8f8f8` dark, `Colors.swift:140`) with α **0.065** light / **0.125** dark (`:1184-1194`). The comment at `:1187-1188`
says the image is templated, so on screen the circle is the selected tint (§1.3) at that alpha, and the glyph is the
tint at full alpha. The alpha is baked in when the image is created (one value, not re-resolved on mode change).

The iOS 26 search tab is split off from the other tabs and right-aligned (code comment
`Modules/UIInfra/SlackKit/Implementation/Helpers/LayoutConstraints/CustomConstraintHelpers.swift:23-24`); the tab bar
code treats the last subview as that button (`…/CompactRootTabBarController.swift:1145-1166`). Its shape and glass
are drawn by UIKit (not in source). The glyph is still `svgSearchFilled` at 14b3cbaf (`svgQuickSwitch` is the
conversation header's find-in-channel button, §3.5), and the device agrees: on a 440 pt screen the glyph's ink spans
x 377.67–398.33, y 893.67–914.33 and the circle's rim the same pixels as the clone's (reference/device/IMG_2246, sRGB).

### 1.3 Appearance (fonts, colors, background, divider)

`apply(themeWrapper:)` (`:565-580`) and `setTabBarItemColors` (`:582-605`), re-run on every theme change (`:610-615`).
The same `UITabBarAppearance` is assigned to `standardAppearance` and `scrollEdgeAppearance` (`:577-579`).

- **Background**: `appearance.backgroundColor = CoreColorSet.default.primary.basePrimary` (`:568`; June
  `.sk_primary_background`, same values) = `dt_color_base_primary` `#ffffff` light / `#1a1d21` dark / `#000000` true-dark
  (`Colors.swift:42`). On iOS 26 the tab bar is UIKit's floating Liquid Glass bar; whether UIKit paints this color inside
  it is system behavior, not visible in any snapshot (gap).
- **Divider (top hairline)**: `shadowImage` = solid image, height `UIUtilities.onePixel()` = 1/scale = **0.333 pt** at @3x
  (`:570-571`, `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:16-22`), color
  `core.primary.outlineTertiary` = `dt_color_outline_tertiary` `#5e5d60` @ 0x21 (13%) light / `#797c81` @ 0x4d (30%) dark
  (`Colors.swift:302`).
- **Label fonts** (`:69-72`): stacked layout (iPhone portrait; iPhone is portrait-only,
  `Modules/UIInfra/LegacyUI/Implementation/DoublePanel/DoublePanelViewController.swift:233-236`):
  normal **Lato-Bold 11**, selected **Lato-Black 11**. Inline / compact-inline (landscape, iPad): Lato-Bold 11.5 /
  Lato-Black 11.5 (`:573-575`, `588-589`). `slackBoldFont`/`slackBlackFont` = Lato Bold/Black, fixed size, no Dynamic
  Type (`Modules/Data/Font/Implementation/UIFont+LegacySupport.swift:288-306`).
- **Colors** (same value for title and icon, `:583-584`, `590-591`, `603-604`):

| State | Token | Default fallback theme (aubergine b5) light / dark |
|---|---|---|
| normal | `core.primary.contentTertiary` = `dt_color_content_tertiary` (`Colors.swift:212`) | `#5e5d60` / `#9a9b9e` |
| selected, iOS 26 | `theme.baseInverseSecondaryNonSidebar` = `primary._80` / `primary._70` | `#611f69` / `#cfa1de` |
| selected, pre-26 | `core.primary.contentPrimary` = `dt_color_content_primary` (`Colors.swift:200`) | `#1d1c1d` / `#f8f8f8` |

For other themes substitute the primary palette (e.g. ocean primary → `#0b4c8c` / `#63a5db`). `baseInverseSecondaryNonSidebar`
is marked "isn't actually in the theming system" (`DefaultThemeColorSet.swift:88-91`).

**Production (device screenshots, Sept 2026):** the selected icon and label read (240,195,255) on the dark glass for
aubergine's #cfa1de: UIKit draws the tint with vibrancy, ≈ the tint + (33,34,33); unselected (242,244,250); capsule
(33,37,42), selected pill (67,71,78) (measurements.md › D). The clone lifts the tint in dark mode by that amount.

### 1.4 Badges (dots only, never counts)

- Shown by setting `badgeValue = "●"` (U+25CF), hidden by `""` (`:74`, `77`; one updater per tab, `:713-827`).
- Badge **background is clear** (`:78`, `600-601`, per-item `badgeColor = .clear` at `:178`, `189`, `211`, `228`, `239`,
  `250`, `261`, `285`; Activity's item sets none); the dot is the glyph itself: system font (SF) **9 pt** (`:75`), color
  `theme.baseInverseImportant` = `important._70` / `important._40` (`:586`, `593-594`). Default theme: `#83388a` / `#9652a2`;
  flamingo-important themes: `#c01343` / `#d3305d` (design-tokens `f76ac0a`; `#c02b54` in June's `df1f228`).
  Rendered size (measured by drawing U+25CF with macOS `SFNS.ttf` at 27 px): circle ≈ **7.1 pt** diameter.
- Position: pre-iOS 26 `badgePositionAdjustment` = (horizontal **+2**, vertical **−4**) from UIKit's default badge spot,
  normal state only (`:595-598`); iOS 26 = UIKit default (not set).
- Which tabs: Home = `badges.tabs.homeConversationsListBadge > 0`, DMs = `dmsBadge > 0`, Activity = `activityBadge > 0`,
  and (new in Sept) Slackbot = `slackbotTabBadge > 0`, Slackbot's thread unreads, counted only with `slackbotBottomTab` and
  `slackbotThreadUnreadV2` on (`Modules/Integration/LocalCountsSummarizer/Implementation/BadgeCountRules.swift:85`, `110-118`)
  (`Modules/Integration/RootComponents/Implementation/Presentables/HomeTabItemPresentable.swift:18-32`, driven from
  `…/Presentables/HomeViewPresentable.swift:125-137`; Slackbot `…/CompactRootTabBarController.swift:788-807`, re-applied
  when the tab appears, `:528-529`); More = `tabBarOverflowService.overflowTabBadgedPublisher` (`:633-638`); Sales =
  alerts count > 0 (`:686-690`). Search, Files and Agentforce never badge.
- VoiceOver value: `unread_messages` "Unread Messages." (`localized_strings.yaml:22632`); Sales uses
  `unread_notifications` "Unread Notifications." (`:22635`).

### 1.5 Geometry

Slack sets no tab bar size, item spacing, capsule inset or selection-pill style: all system (UIKit). Only system
evidence in the repo is a bare `UITabBar` with one default item (SF font, system tint), not Slack's configured bar:

| PNG | Bar height | icon rows | label rows |
|---|---|---|---|
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.UITabBarItemIconsSnapshotTests/testTabBarItemFromIcon@3x.png` (1179×249) | 83 pt | 12.7–35.7 pt | 41.3–49.0 pt |
| `…/iOS_18/SlackKitTests.UITabBarItemIconsSnapshotTests/testTabBarItemFromIcon@3x.png` (1179×147; June baseline, an LFS pointer in the latest checkout) | 49 pt | 7.3–30.3 pt | 37.7–45.3 pt |

(Test: `Modules/UIInfra/SlackKit/Tests/Unit/Extensions/UITabBarItemIconsSnapshotTests.swift:16-22`; neither includes
the home-indicator inset.)

### 1.6 Behavior

- **Switching tabs is instant**: the delegate returns the controller itself as the transition animator with duration 0;
  it just swaps views (`…/CompactRootTabBarController.swift:870-872`,
  `…/TabBar/Extensions/CompactRootTabBarController+UIViewControllerAnimatedTransitioning.swift:10-22`, comment: workaround
  for an iOS 18 nav-bar flicker). No cross-fade. UIKit's own tab bar selection animation is untouched.
- **Reselecting the current tab** (`:877-897`): if flag `rootNavigationUpdates` and the tab is `ScrollableToTop` → scroll
  to top; double-panel tabs: if no conversation is open scroll to top, else dismiss the conversation panel
  (`Modules/Features/CompactRoot/Interface/NavigationProtocols/TabBarRootNavigator.swift:16-25`); dismiss inline search
  (pre-26); notify the feature (`willReselectTab`); Search tab resets to its root (`:893-896`,
  `Modules/Features/CompactRoot/Implementation/RootTabViewController.swift:153-155`). On the `rootNavigationUpdates`
  stack, scroll-to-top only happens when already at the tab root (`RootTabViewController.swift:250-256`).
- **Long-press anywhere on the tab bar** (only if Slackbot Voice is visible or `conversationalAiAssistant` is on):
  `minimumPressDuration = 0.5` s, light haptic, opens Slackbot Voice Assistant (else AI Assistant) (`:419-421`,
  `464-481`).
- **Coachmark over a tab** (`:1125-1135`, `…/TabBar/CompactRootTabBarCoachmarkPresenter.swift:14-43`,
  `Modules/UIInfra/SlackUI/Implementation/LegacyWidgets/CoachmarkView.swift`): 150×80 pt frame whose right edge is at the
  tab's center X and bottom at the tab's top; fill `highlight1.content` `#1264a3` / `#2ba5ce` (`CoachmarkView.swift:70-71`;
  June: `sk_sapphire_blue` `#1264a3` in both modes); corner radius 6, arrow 12 pt tall at the bottom-right corner pointing
  down (`CoachmarkView.swift:27-35`, `73-126`); text `UIFont.caption` (Lato 13 regular) white, 12 pt horizontal inset,
  vertically centered in the body (`CompactRootTabBarCoachmarkPresenter.swift:20-24`, `CoachmarkView.swift:132-145`).
  Fades in 0.3 s; any touch fades it out 0.3 s and removes it (`CoachmarkView.swift:178-201`). Only current caller:
  More tab, text `slack_connect_coachmark` "You can always find your invitations to connect here"
  (`Modules/Features/Home/Implementation/Plugins/SCHubInvite/SCHubInvitePlugin.swift:156-160`,
  `localized_strings.yaml:19318`).
- **Snackbar** alerts are presented with bottom offset = tab bar height (`:647-663`).
- **Floating (huddle/media) player** sits above the tab bar: leading/trailing inset **20** on iOS 26 (12, `Spacing.large`,
  before; June 12 everywhere), bottom = tab bar top − offset, offset = player height + 12 when visible; shows/hides with
  spring smooth/medium (0.4 s, damping 1.0) (`:532-554`, `829-866`).
- **FAB** (only when `rootNavigationUpdates` is off, `…/RootTabDecorator/CompactRootTabDecoratorViewController.swift:273-281`):
  vertical stack (spacing 8) of `SKIconButton` size `.medium` 56×56 pt (`.nativeMinimum` 44 in compact height)
  (`CompactRootTabDecoratorViewController.swift:103-105`, `119-125`, `407-451`,
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/IconButton/SKIconButton.swift:438-443`,
  `CustomConstraintHelpers.swift:157-159`), glass effect on iOS 26 (`:432`). Bottom = content layout-margins bottom −
  16 − floating-player offset (`:344-346`). Trailing: 16 pt from safe area (24 pt on iOS 26), or on iOS 26 centered on
  the split-off Search button when its position is known (`CustomConstraintHelpers.swift:107-149`). Icon `svgPlus`
  `plus.svg` ("Create New", `create_new` `localized_strings.yaml:4963`), `svgUserDirectoryAdd` ("Log an activity",
  `log_activity` `:11533`), or (new in Sept) `svgCompose` ("New Message", opens compose) for frontline workers on Home
  and More (`CompactRootTabDecoratorViewController.swift:816-831`, `489-500`; `Modules/Features/Home/Implementation/HomeInteractor.swift:516-532`).
  Colors (`Modules/Integration/ThemesIntegration/Interface/ColorSetFABConfigurator.swift:24-57`): icon
  `contentInversePrimary` (light) / `contentInverseSecondary` (dark); fill = 10% blend of `baseInversePrimary` toward
  `contentInversePrimary` (light) or of `baseInverseSecondary` toward `contentInverseSecondary` (dark); pressed =
  darken 0.3 (light) / lighten 0.3 (dark); no outline.

---

## 2. Root tab header

**Container**: `Modules/Features/CompactRoot/Implementation/RootTabDecorator/CompactRootTabDecoratorViewController.swift`.
`headerMode == .search` → custom `CompactRootTabSearchHeader`; `.none` → a `FeatureNavigationController` with
`SKNavigationControllerLiquidGlass` (`:168-180`, `Modules/UIInfra/Architecture/Implementation/Navigation/FeatureNavigationController.swift:23-39`).
Header actions (`CompactRootTabDecoratorViewController.swift:228-245`): workspace icon → `WorkspacesListRoute(openLeftPanel: true)`
(workspace switcher, §5); avatar → `YouRoute()` (§4); search → search (§2.3.8); title → feature.

### 2.1 Which tabs have which header

| Tab | iOS 26 title (key) | iOS 26 left / right bar buttons (flags off; Sept's `rightButtons` arrays are leading-to-trailing, in screen order; June's were trailing-first, docs/conventions.md) | Pre-26 title | Pre-26 extras |
|---|---|---|---|---|
| Home | workspace name, no menu | L: `[workspace]` · R: `[filter, user]` → `[Filter][avatar]`, one capsule | workspace name | workspace avatar, "unreads elsewhere" dot, Filter button |
| DMs | `dms` "DMs" | R: `[user]` → the avatar alone in its own circle (June: `[Filter][avatar]` unless `iaNextDmsFilters`) | `direct_messages` "Direct Messages" (`localized_strings.yaml:5458`) | none (June: Filter button) |
| Activity | `activity` "Activity" (+ a "Loading…" subtitle while loading, §2.2) | R: `[user]` | "Activity" | pull = refresh, no filter |
| More | `more` "More" | R: `[user]` | "More" | — |
| Search (iOS 26) | `search` "Search" (`:17029`) | R: `[user]` | n/a | n/a |

Sources: iOS 26 configs `Modules/Features/Home/Implementation/HomeInteractor.swift:222-270`,
`Modules/Features/DM/Implementation/DMInteractor.swift:588-616`,
`Modules/Features/Activity/Implementation/ActivityInteractor.swift:1425-1448`,
`Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPageInteractor.swift:218-241`,
`Modules/Features/Search/Implementation/SearchInteractor.swift:96-108`. With `slackbotMainHeaderEntrypoints` every tab's
right buttons become `[slackbot, user]`, and the Slackbot button gets its own capsule (§2.2); on Home it takes the
Filter/History slot. Home with `historyMenu` shows History instead of Filter. In the unified shell (§0.1) the tabs
contribute only their titles (Home: workspace avatar, title, Filter/History).
Pre-26: `Modules/Integration/RootComponents/Implementation/Presentables/HomeViewPresentable.swift:174-227`
(title = workspace name on Home, else `CompactRootTab.title`, `:222-227`, `HomeTab+Info.swift:5-17`; workspace avatar only
on Home, `:186`; user avatar on every tab, `:204`; unreads dot only on Home, `:206`); header buttons
`HomeInteractor.swift:549-584`, DMs none (`DMInteractor.swift:1492-1494`); pull behavior `HomeFeature.swift:240` (.search),
`DMFeature.swift:353` (.search), `ActivityFeature.swift:909` (.refresh), `TabBarOverflowPageFeature.swift:171` (.search).

### 2.2 iOS 26 root header ("PrimaryNavigationHeader")

**Source**: `Modules/Features/Handlers/PrimaryNavigationHeader/Implementation/PrimaryNavigationHeaderService.swift`
(nav item), `…/HeaderEmbeddable/PrimaryNavigationHeaderEmbeddablePresenter.swift` + `…/PrimaryNavigationHeaderViewController.swift`
(gradient + pull-to-smile), `Modules/UIInfra/NavigationController/Implementation/SKNavigationBarLiquidGlass.swift`
(bar). No snapshot exists.

**Structure**: a normal UIKit navigation bar (system height, system Liquid Glass buttons) over the list. Behind it, the
list draws a header decoration (`SKListHeaderEmbeddable`, `shouldSizeToFitTopSafeArea: true`)
(`PrimaryNavigationHeaderService.swift:271-316`,
`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/HeaderFooterEmbeddables/SKListHeaderSystemState.swift:17-20`).
With that option the decoration is **0.5 × the list's height** tall (426 pt on an 852 pt screen) and its bottom edge sits
at content y = 0, just above the first row (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Layout/SKListCollectionViewLayout.swift:236-244`).
At rest it therefore fills the list's top inset (status bar + nav bar), scrolls with the content, and shows more of
itself when the list is pulled down. It is not shown on non-compact iPad (the unified shell always shows it,
`PrimaryNavigationHeaderService.swift:304-315`).

**Nav bar background**: `.empty` → `UINavigationBarAppearance` with `backgroundColor = .clear`, `shadowColor = .clear`
(`SKNavigationBarLiquidGlass.swift:95-120`; decorator sets `.empty` on iOS 26, `CompactRootTabDecoratorViewController.swift:393-405`).
Exception: when Reduce Transparency is on (`shouldUseGradientBackground`, `SKNavigationBarLiquidGlass.swift:36-42`, needed
since iOS 26.4 to avoid a gap at the top) the bar gets a gradient image of the header colors, horizontal (start (0,1) →
end (1,1)), sized bar + status bar (`:122-136`). The non-empty background is only used while the tab root is showing
(`:83-93`).

**Gradient decoration** (`PrimaryNavigationHeaderEmbeddablePresenter.swift:91-94`, `ThemeServiceInterface.swift:35-40`,
`Modules/UIInfra/DeveloperComponents/Implementation/GradientView/SKGradientView.swift:22-66`, `139-175`):
- Colors `[backgroundGradient1, backgroundGradient2]` when the user pref `window_background_gradients` is on, else
  `[backgroundGradient1]` (solid) (`ThemeServiceInterface.swift:35-40`, pref key
  `Modules/NetworkPersistence/Preferences/Interface/PreferenceKey.swift:127`).
- Style `.header` = SwiftUI `RadialGradient(center: .bottomLeading, startRadius: 100, endRadius: 500)`
  (`SKGradientView.swift:28-29`), i.e. centered on the decoration's bottom-left corner = left screen edge at the top of
  the first row. CSS on the 426 pt decoration: `radial-gradient(circle at 0% 100%, g1 100px, g2 500px)`. (Sept adds a
  `.linear` / `.verticalFade` style, `:24-34`, not used by this header.)
- Fades out (opacity 1 → 0, `easeOut` 0.25 s) once the list has scrolled more than **32 pt** (`thresholdToFadeGradient`,
  `PrimaryNavigationHeaderEmbeddablePresenter.swift:23`, `91-94`; `SKGradientView.swift:131`, `154-155`); the
  loading bar is hidden with it (`:96`). Hidden outright on legacy non-compact iPad and under the Radical Simplification
  prototype header (`PrimaryNavigationHeaderService.swift:281-293`).
- Default theme (aubergine b5): g1 `#611f69` / `#431349`, g2 `#4a154b` / `#200221`.
  Snapshot theme: g1 same, g2 ocean `#093a73` / `#081536`.

**Title** (`SKNavigationItem.TitleView`, `Modules/UIInfra/NavigationController/Implementation/SKNavigationItem.swift:396-648`):
- Home: workspace name, alignment `.leading(inset: 0)`; other tabs: `.leading(inset: 8)` (`Spacing.medium`)
  (`PrimaryNavigationHeaderService.swift:452-493`).
- Font `SKFont.title(sizeAdjustment: .maximumPointSize(22))` = **Lato-Black 22**, now clamped (no Dynamic Type growth;
  June's `.title()` grew) (`PrimaryNavigationHeaderService.swift:77`; `Modules/Data/Font/Implementation/SKFont.swift:28`,
  `UIFont+LegacySupport.swift:40-52`), 1 line, tail truncation. Color `theme.contentInversePrimary`: white for brightness
  ≥ 4, `primary._100` (`#39063a` for aubergine) for brightness ≤ 3 in light mode; white in dark mode.
- **Subtitle (new in Sept)**: an optional second line under the title, `micro` 12 clamped to its base size, color
  `theme.contentInverseSecondary`, 2 pt below the title; the title + subtitle stack is centered on the bar's midline
  either way (`SKNavigationItem.swift:401-415`, `560-568`, `610-633`; `PrimaryNavigationHeaderService.swift:450`,
  `395-421`). Only Activity sets one: "Loading…" (`loading_ellipsis`, `localized_strings.yaml:11490`) while the socket
  is disconnected or the feed is loading, shown after a stabilization delay and hidden at once
  (`Modules/Features/Activity/Implementation/ActivityInteractor.swift:1242-1257`). The service also formats "Updated now"
  / "Updated %@" (`updated_now` `:22766`, `nav_header_updated_relative` `:12737`) for a `.lastUpdated` status; no tab
  sets that.
- Optional menu (Home with `historyMenu` or the Slackbot header): caret `svgCaretDown` `caret_down.svg` 20×20 pt, 4 pt after
  the text, same color; tap always opens the menu (Sept dropped the long-press-to-open variant)
  (`PrimaryNavigationHeaderService.swift:468-493`, `SKNavigationItem.swift:402`, `422-445`, `588-599`).
- Scroll fade: opacity = `1 − clamp((insetTop + offsetY) / (0.1 × insetTop), 0, 1)` → gone after scrolling ~10% of the
  top inset; not tappable unless opacity is 1 (`Modules/UIInfra/NavigationController/Implementation/SKNavigationItem+ScrollEffect.swift:80-95`,
  `Modules/UIInfra/SlackKit/Implementation/CoreComponents/ScrollEffect/SKScrollEffectValue.swift:19-25`,
  `SKNavigationItem.swift:576`; applied on Home, DMs, Activity and More: `Modules/Features/Home/Implementation/HomePresenter.swift:107-110`,
  `Modules/Features/DM/Implementation/DMPresenter.swift:108-116`, `Modules/Features/Activity/Implementation/ActivityPresenter.swift:561-570`,
  `Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPagePresenter.swift:146-154`). Stays opaque when
  Reduce Transparency is on.

**Production (device screenshots, Sept 2026):** the bar region is **54 pt** under the status bar (content and the
decoration's bottom at 62 + 54 = **116** on the Pro Max; the June clone used 44), its 44 pt glass buttons at the top
(y 62–106). Home's title starts 12 pt after the workspace circle (x 76), the other tabs' at 20 + 8 = 28. Over the dark
header the glass takes the header's color, lifted: fill (82,22,89) on (67,19,72), a saturated rim (182,34,201) →
(126,27,139) (measurements.md › D). The clone: `--navbar-bottom` and `.glass--on-dark` in `src/app/nav/nav.css`.

**Bar buttons** (`PrimaryNavigationHeaderService.swift:615-780`; rendered by
`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKBarButtonItem.swift` and `SKBarButtonAvatarItem.swift`).
All items: `hidesSharedBackground = false`, `style = .plain` on iOS 26 (`SKBarButtonItem.swift:59-61`), so UIKit groups
adjacent items in one glass capsule. Sept appends the `separator` item **after** the Slackbot button in the
leading-to-trailing array (`PrimaryNavigationHeaderService.swift:521-524`; June put it before Slackbot in its
trailing-first array, so the screen is the same); it becomes `UIBarButtonItem.fixedSpace(0)`
(`SKNavigationItem.swift:364-366`) and splits the Slackbot button into its own capsule. Each item gets `identifier` =
raw value to avoid capsule flicker (`SKNavigationItem.swift:384-389`). Buttons that render nothing (no user, no history
menu) are dropped before the capsules are worked out (`PrimaryNavigationHeaderService.swift:561-584`). Sept also knows
whether an avatar is alone in its capsule and, with the iOS 27 SDK only, removes its padding so the capsule is a 44 pt
circle (`:548-559`, `586-611`; `SKBarButtonItem.swift:126-131`); iOS 26 builds keep the 4 pt margins below.

| Button | Visual | Tap | Source |
|---|---|---|---|
| workspace (left, Home) | `SKWorkspaceAvatar` size `.smallPlus` **28 pt**, circular (`shouldMakeConcentric` → radius = side/2) in a 44 pt tall button with 4 pt margins (36 pt content box) → 36×44 pt. Image = workspace `icon132Url`; if none, initials in `.title` (Lato Black 22) `contentPrimary` on the `baseTertiary` placeholder; if the workspace model hasn't loaded, the button stays absent for up to 2 s and then appears with a blank avatar (new, `PrimaryNavigationHeaderService.swift:69-70`, `328-338`). Unreads in other workspaces → `.hasUnreads`: a 7.2 pt dot (0.75 × (4 + 28/5)) in `theme.baseInverseImportant`, **centered on the circle's edge at 45° top-right** (center (23.9, 4.1) in the 28 pt box, half of it outside), with a round cutout around it; the circle stays round (Sept; June squared the corner and set the dot in it, origin ≈ (20.5, 0.3)). GovSlack → badge §2.3.4. | `WorkspacesListRoute(openLeftPanel: true)` | `PrimaryNavigationHeaderService.swift:629-670`, `233-235`, `328-338`; `SKBarButtonAvatarItem.swift:24-28`, `47-57`, `131-152`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/WorkspaceAvatar/SKWorkspaceAvatar.swift:96-125`, `249-261`, `369-381`, `475-494`, `600-625`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/AvatarAnnotationGeometry.swift:37-60`, `88-107` |
| user (right) | `SKMemberAvatar` `.smallPlus` **28 pt**, circular, image = user avatar (`.medium` source), presence (active `theme.baseHighlight2`, away `core contentTertiary`, `invertedPresenceColors`, `ThemeServiceInterface.swift:28-32`). Sept puts the presence icon (1.4 × (10 + 0.1 × 28) = 17.9 pt, a Ø ≈ 8.1 pt dot) **centered on the circle's edge at 45° bottom-right**, center (23.9, 23.9) from the avatar's top-left, inside a round cutout Ø 14.1 (June: offset past the corner, center ≈ (25.2, 25.2)). If the user has a status emoji: 22 pt emoji to the left, 8 pt gap, left margin 12 → 74×44 pt; else 36×44 pt. a11y "Profile menu" (`profile_menu` `localized_strings.yaml:15359`) | `YouRoute()` (or the You menu with `youMenu`) | `PrimaryNavigationHeaderService.swift:672-727`, `225-231`; `SKBarButtonAvatarItem.swift:154-180`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift:93-95`, `119-146`, `415-424` |
| filter (Home) | icon `svgRefine` `refine.svg` 20×20 pt, 10 pt top/bottom padding, 0 side padding on iOS 26, tint `core contentPrimary` (`#1d1c1d` / `#f8f8f8`) | opens the filter `UIMenu` (§2.4) | `PrimaryNavigationHeaderService.swift:728-737`, `SKBarButtonItem.swift:241-332` |
| history (Home, `historyMenu`) | `svgHistory` `history.svg`, same metrics; a11y `history` "History" (`localized_strings.yaml:7963`) | history menu | `:738-748` |
| slackbot (flag) | `svgSlackbotColor` `slackbot_color.svg` **25×25** full color, 10 pt top/bottom padding; a11y "Slackbot" | opens the Slackbot DM | `:749-755`, `237-241`; `SKBarButtonItem.swift:110-118` |

Sept also defines `slackbotMenu` (`svgListView`, "Open Menu") and `newChat` (`svgCompose`, "New Message") header buttons
(`:756-773`); no tab's header uses them. Workspace button a11y label `a11y_show_workspace_switcher_button` "Open Workspace
Panel" (`localized_strings.yaml:270`).

**Sept bar buttons: what's gated, and what production draws.** The Sept SlackKit refresh adds a glass "edge-to-edge"
avatar, a 32 pt toolbar avatar, a `.prominent` style, an axis behavior and a new huddle view to `SKBarButtonItem`. Each
was checked against its guard, the `Snapshots/iOS_27` PNGs (now pulled) and the device screenshots (D: iOS **26.7**,
iPhone 17 Pro Max, Sept 2026, confirmed by the owner; production = the iOS 26 chrome they show). The clone draws the
iOS 26 / device column; iOS-27-only looks are not adopted.

| Sept code | Gate | iOS_27 PNGs | Device (iOS 26.7) | Clone |
|---|---|---|---|---|
| Glass config: `hidesSharedBackground = false`, `style = .plain`, adjacent items share a capsule (`SKBarButtonItem.swift:59-65`) | iOS 26, unchanged since June | `SKNavigationToolbarSnapshotTests` (390 wide): 44 pt circle x 16–60, `[clock][person]` capsule 96 × 44 at x 278–374, title from x 72 (12 after the circle) | circles and capsules as measured (§2.2, measurements.md D) | same geometry (`GlassButton`, `GlassGroup`) |
| Edge-to-edge avatar: `isPaddingRemoved` (`SKBarButtonItem.swift:126-132`); the avatar fills the 44 pt container (`SKBarButtonAvatarItem.swift:123-136`) | `#if compiler(>=6.4)` **and** `#available(iOS 27.0, *)`: Xcode 27 SDK on iOS 27 (`PrimaryNavigationHeaderService.swift:548-559`), and only for an avatar alone in its capsule, not GovSlack, no status emoji (`:592-598`, `:643-647`, `:711-718`) | none of the tests render a header avatar (the toolbar tests' leading item is an icon) | **production differs**: Home's workspace avatar is 28 pt (x 28–56) in the 44 pt circle x 20–64; the profile avatar 28 pt (x 384–412) in the `[filter][avatar]` capsule x 324–420 | 28 pt `.smallPlus` with padding |
| 32 pt `.toolbarItem` workspace avatar (`PrimaryNavigationHeaderService.swift:653`; `SKWorkspaceAvatar` sizes) | only when edge-to-edge (above) | — | **production differs**: 28 pt | 28 pt |
| Concentric avatars: round, the unread / presence dot on the edge at 45° (`shouldMakeConcentric`, `:635-638`, `:675-680`) | iOS 26 | — | **agrees**: the round 28 pt workspace avatar carries the other-workspaces unread dot, Ø 7.33 centered at (51.67, 74.0) = (23.67, 4.0) in the avatar's box, in a round cutout (IMG_2246) | round (`SKWorkspaceAvatar round`, the concentric dot in `skws-concentric-*`); the demo has one workspace, so Home shows no dot |
| `axisBehavior` (`SKBarButtonItem.swift:66-70`) | `#if canImport(UIKit, _version: 9127.0.85)` + iOS 27.1 | — | — | n/a (no visual on iOS 26) |
| `.prominent` icon style, tinted glass (`SKBarButtonItem.swift:281-283`, `:321-333`) | iOS 26; the only caller is the Share extension's send button (`ShareExtension/Implementation/SharePresenter.swift:883`) | — | not in any bar on the device | n/a |
| Huddle button `SKHuddleBarButtonView`, `.prominent` capsule while a huddle is active or its coachmark shows (§3.5) | iOS 26 | — | inactive: the bare headphones in the Slackbot capsule (IMG_2247–2248) | inactive as on the device (`ConversationNavBar.tsx`); no active-huddle state in the bar yet |
| Back button: SKNavigationController's `SKBarButtonItem .back` on every push, `svgCaretLeftFull` 20 pt contentPrimary (§3.3) | unchanged since June | `testBackButtons` / `testAllTogether` draw the caret | the caret, ink x 37.5–46.3, y 75.5–92.2 in the circle x 20–64 (IMG_2248), (248,248,248) | the caret on every pushed bar (`NavBar.tsx` `BackChevron`; the clone's generic bar drew UIKit's chevron before) |

The iOS_27 `SKBarButtonItemTests` PNGs render the glass as a flat mid-gray fill ((130–134) gray) with the items flush
to the test bar's edges (`testAllTogether`: back circle x 0–44, capsule 226.7–393): the test harness, not production
(the iOS_27 toolbar PNGs and the device both keep the layout margin). Their glass and the iOS_27 toolbar's near-white
fill (249–252 over white, a 2-device-pixel (215 → 176) rim) are offscreen renders, so the clone's light glass stays as it
was; only dark glass is measured (D).

**Pull-to-smile** (Home, DMs, More; not Activity/Search) (`PrimaryNavigationHeaderEmbeddablePresenter.swift:19-24`,
`99-127`; `…/PrimaryNavigationHeaderViewController.swift:28-32`, `53-75`, `102-114`): when the list is over-scrolled past
**84 pt** a random message appears (soft haptic, intensity 0.5), centered, bottom 88 pt above the decoration's bottom;
font `smallBodyBold` (Lato Bold 15, max 22 pt with Dynamic Type), color `contentInverseSecondary`; alpha ramps 0 → 1 between
84 and 196 pt of over-scroll. Messages (`localized_strings.yaml`): "You've got this" (`easter_egg_message_one`, 5956),
"Drink some water🚰" (two, 5984), "Kindness always comes around" (three, 5976), "🦆" (four, 5944), "Don’t forget to
breathe" (five, 5940), "Here, take this: 🍎" (six, 5964), "(ɔ◔‿◔)ɔ ♥" (seven, 5960), "Hoot hoot 🦉" (eight, 5932),
"If anyone can, it’s you" (nine, 5952), "Well, well, well. Look who it is." (ten, 5968), "Read any good books lately?"
(eleven, 5936), "You’re doing great work" (twelve, 5980), "Nothing to see here" (thirteen, 5972), "This is you right now:
🤳" (fourteen, 5948), "You look nice today" (`you_look_nice_today`, 24407).

**Loading bar**: `SKLoadingBar` pinned to the decoration's bottom edge, full width, **2 pt** tall (explicit constraint),
`darkOnLight`: track `core baseTertiary` (`#eaeaea` / `#212428`), moving segment `lagoon._40` (`#1cb6eb` / `#0a77a7`),
completion flash `highlight2.baseInverse`; loop 1.1 s (`…/PrimaryNavigationHeaderViewController.swift:38-45`, `62-64`;
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/LoadingBar/SKLoadingBar.swift:32-34`, `138-139`, `211-219`,
`316-331`). Home, DMs, Activity only (`showLoadingIndicator`); hidden once the list scrolls past 32 pt (above).

**Search tab root (iOS 26)**: `Modules/Features/Search/Implementation/SearchViewController.swift`: background
`core basePrimary` (`:61`); an `SKGradientView` with the same header style from screen top to the safe-area top
(`:120-128`); a `UISearchController` always visible in the nav item (`hidesSearchBarWhenScrolling = false`, `:139-140`),
placeholder `search` "Search" (`Modules/Features/Search/Implementation/SearchBarCoordinator.swift:98`), text Lato 17
(`:383`); keyboard opens on appear (`:84-91`); Cancel returns to the previous tab (`:154-155`).

**Other entry**: on iOS 26, "show search" from any tab switches to the Search tab (`CompactRootTabDecoratorViewController.swift:623-628`,
`…/TabBar/CompactRootTabBarNavigator.swift:131-140`).

### 2.3 Pre-iOS 26 root header (`CompactRootTabSearchHeader`)

**Source**: `Modules/Features/CompactRoot/Implementation/RootTabDecorator/Header/CompactRootTabSearchHeader.swift`,
`…/Header/HeaderBackgroundView.swift`, `…/Header/HeaderScrollAnimationHandler.swift`,
`Modules/Integration/RootComponents/Implementation/NavigationBar/UserStatusContainer.swift`.
**Snapshots** (all 1179×2556, light mode, snapshot theme §0.3, header added to a full-screen VC; test
`Modules/Features/CompactRoot/Tests/Unit/CompactRootTabSearchHeaderSnapshotTests.swift`), folder
`Modules/Features/CompactRoot/Snapshots/iOS_26/CompactRootFeatureTests.CompactRootTabSearchHeaderSnapshotTests/`. The Sept
baselines were re-recorded with a top safe area of at most 28 pt, so the top line sits at its 32 pt minimum and
everything is **26 pt higher** than in June's (top line at 58 = 54 + 4); x positions, sizes and colors are unchanged. The
measurements below are from June's baselines (cd22922):

| PNG | What it shows |
|---|---|
| `testDefaultHeader@3x.png` | brightness 5: pink half-dot at left edge, "W" workspace tile, "Workspace" title (white), status pill with 😭 + gray avatar tile with jade presence dot, "Search" field, aubergine→ocean gradient, rounded bottom corners |
| `testDefaultHeaderWithGovslack@3x.png` | same + GovSlack badge (dark-teal square with white capitol icon, white 2 pt border) at the tile's bottom-right |
| `testMinimalHeader@3x.png` | no workspace tile, no avatar/status, no dot; title flush at 16 pt; "Search" |
| `testHeaderWithoutGradient@3x.png` | solid `#611f69` background (gradient pref off) |
| `testHeaderCollapsed@3x.png` | collapse progress 1: top line hidden, header 48 pt shorter, search field at the top |
| `testHeaderStretched@3x.png` | progress −1: header 48 pt taller (80% of it above the top line) |
| `testHeaderSuperStretched@3x.png` | progress −4: header 192 pt taller; gradient reaches solid ocean below ~239 pt |
| `testHeaderBrightness1…6@3x.png` | progress −4 at brightness 1–6: 1–3 light gradients (`#f9edff`→`#9ed6fa`, `#f6e4ff`→`#c2e6fd`, `#f4daff`→`#54a9ea`) with dark text `#39063a`; 4–6 dark gradients (`#83388a`→`#0b4c8c`, `#611f69`→`#093a73`, `#4a154b`→`#122a59`) with white text |

`iOS_18/…/testDefaultHeaderDarkMode@3x.png` (June) is an orphan (no matching test, different theme/safe area): ignore.

#### 2.3.1 Geometry

Constants: top line height 36, bottom line 44, gap between lines 8, bottom spacing 10, extra 8 in
`fullContentHeight` (`CompactRootTabSearchHeader.swift:52-57`, `351-353`; `bottomSpacing` =
`CompactRootTabHeaderConstants.bottomSpacing` 10, `Modules/Features/CompactRoot/Interface/CompactRootTabFeature.swift:16-28`).
Bottom "curtain" zone = `HeaderBackgroundView.heightForContinuousCorners` = ceil(16 × continuous expansion factor) =
**25 pt** (`HeaderBackgroundView.swift:16-21`).

- Top line (stack: workspace tile, title, avatar; spacing 12, centered): top = max(safe-area top + **4**, **32** from
  screen top) (`:32-33`, `441-450`); leading 16, trailing 16 (`:479-481`, `48-50`); height 36.
- Search row: 8 below the top line (`:452`), leading 12, trailing 12 (`:458`, `483`), height 44 (`:484`); spacing 8 to any
  button on its right (`:138`).
- Header bottom = search bottom + 10 + 25 (`:455`). Header height (not collapsed) = top line top + 36 + 8 + 44 + 10 + 25.
- The list starts under the header: content view top = max(safe top + 4, 32) (`CompactRootTabDecoratorViewController.swift:55-58`,
  `367-374`) and gets `additionalSafeAreaInsets.top = fullContentHeight` = 36+8+44+10+8 = **106** (`:329`), so the
  first row is at safe top + 110, i.e. 8 pt below the top of the curtain zone.
- Touches in the bottom 25 pt pass through to the list (`CompactRootTabSearchHeader.swift:532-535`).

Measured in June's `testDefaultHeader@3x.png` (safe-area top in the snapshot = 54, derived from top line at 58 = 54 + 4;
subtract 26 for the Sept baseline):

| Element | x (pt) | y (pt) | size |
|---|---|---|---|
| unreads dot | 0 | 72–80 | 4 × 8 (half disc, flat side on the screen edge) |
| workspace tile | 16–52 | 58–94 | 36 × 36 |
| title "Workspace" ink | 64.3–174.3 | 68.0–87.7 | text starts at 64 = 52 + 12 |
| status pill | 303 → behind avatar | 58–94 | visible part 38 pt |
| avatar tile | 341–377 | 58–94 | 36 × 36 |
| presence dot | 369.7–378 | 86.7–95 | ≈ 8.3 |
| search field | 12–381 | 102–146 | 369 × 44 |
| search icon ink | 29.7–46 | 115.7–132 | icon box 28–48 × 20 |
| "Search" ink | 60.7–108.3 | 118–130 | starts at 60 = 48 + 12 |
| curtain top (mid-width) | | 156 | |
| header bottom | | 181 | (corner ink at x = 0 ends at 172) |

The bottom edge profile (header color ends at) x 0 → 172, 1 → 166.3, 2 → 164, 4 → 161.3, 8 → 158, 12 → 156.7, ≥ 16 → 156
(measured) = a circular 16 pt radius. CSS: give the list container `border-top-left/right-radius: 16px` and pull it up
25 pt over the header; paint the gradient behind.

#### 2.3.2 Background and curtains (`HeaderBackgroundView.swift`)

- `backgroundColor = backgroundGradient1` (`:74`); if the gradient pref is on, a `CAGradientLayer` from
  `backgroundGradient1` (top) to `backgroundGradient2` at location **0.28**, layer height = **screen height** (not the
  header's), so the gradient is fixed and more of it shows when the header stretches (`:38-42`, `75-82`, `118`).
  On 852 pt: g2 reached at 238.6 pt (measured: solid from ~239 pt). CSS: `linear-gradient(to bottom, g1 0, g2 238.56px)`
  on a screen-tall layer, clipped by the header.
- Mask: full rect minus a rounded rect (radius 16, continuous) starting 25 pt above the header bottom (`:24-28`,
  `124-126`).
- Dark mode only: 1 pt stroke along that rounded top edge in `core.primary.outlineSecondary` (`#797c81` @ 50%,
  `Colors.swift:296`) (`:29-34`, `83`, `127-128`).
- Everything below is the list background `basePrimary` (June `sk_primary_background`, same values) (`CompactRootTabDecoratorViewController.swift:390`,
  `Modules/Integration/ThemesIntegration/Interface/ListThemeOptions.swift:65-68`).

#### 2.3.3 Colors (all theme-derived; `CompactRootTabSearchHeader.swift:729-754`, `1195-1253`)

| Element | Property | Default theme b5 light / dark | Snapshot theme b5 light (measured) |
|---|---|---|---|
| gradient top | `backgroundGradient1` | `#611f69` / `#431349` | `(97,31,105)` = `#611f69` ✓ |
| gradient bottom | `backgroundGradient2` | `#4a154b` / `#200221` | ocean90 `#093a73` ✓ |
| title | `contentInversePrimary` | `#ffffff` / `#ffffff` | white ✓ (b1: `#39063a` ✓) |
| search field, status pill, 44×44 button tiles, refresh circle | `searchBarBackground` | `#f9edff` α0.1875 / `#efe1f5` α0.1875 | ✓ blend matches |
| search text + icon (resting) | `contentInverseSecondary` | `#f9edff` α0.8 / `#e3ceeb` α0.9 | ✓ |
| search text (while transitioning to search) | `contentInverseTertiary` | `#f9edff` α0.7 / `#e3ceeb` α0.7 | |
| search text (pull threshold crossed) | `contentInversePrimary` | white | |
| search field (pull threshold crossed) | `surfaceInversePrimary` | `#f9edff` α0.25 / `#efe1f5` α0.25 | |
| header button icons, refresh icon | `contentInverseSecondary` (`CompactRootTabDecoratorViewController.swift:594`) | as search text | |
| unreads dot | `baseImportant` | `#eabdfb` / `#cfa1de` | flamingo20 `#ffa3c2` ✓ (b1: flamingo70 `#c01343` ✓) |
| presence active | `baseHighlight2` (`invertedPresenceColors`) | `#eabdfb` / `#bc80ce` | jade20 `#74dbaf` ✓ (b1: jade50 `#20a271` ✓) |
| presence away | `core contentTertiary` | `#5e5d60` / `#9a9b9e` | |
| easter-egg text | `contentInverseSecondary` | as search text | |
| workspace/avatar placeholder | `core baseTertiary` (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/ImageView/SKImageView.swift:82`) | `#eaeaea` / `#212428` | `#eaeaea` ✓ |

#### 2.3.4 Elements

- **Unreads-in-other-workspaces dot** (Home only, when another workspace has badge count > 0 or unreads,
  `HomeViewPresentable.swift:163-171`, `206`): `UnreadIndicatorView` 4×8 pt, a half disc (radius 4) against the screen's
  left edge, vertically centered on the top line (`CompactRootTabSearchHeader.swift:224-229`, `501-504`,
  `Modules/Integration/RootComponents/Implementation/Views/UnreadIndicatorView.swift:41-54`).
- **Workspace tile** (Home only): `SKWorkspaceAvatar` `.large` 36 pt, corner radius 9 (0.25 × side,
  `SKWorkspaceAvatar.swift:145-151`, `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:94-99`),
  continuous; 1 px border `outlineTertiary` (`SKWorkspaceAvatar.swift:41-46`); image = `icon132Url` unless it is the default
  avatar, else initials `.title` (Lato Black 22) `contentPrimary` centered; the code sets `surfacePrimary` behind them
  but the image view's placeholder `baseTertiary` is what renders (`#eaeaea` measured; `:338-348`, `SKImageView.swift:82`, `172`)
  (`CompactRootTabSearchHeader.swift:655-674`). Tappable (`GlobalHeaderControl`): press = scale 0.95 + alpha 0.85, spring
  smooth fast 0.2 s in / smooth medium 0.4 s out (`UserStatusContainer.swift:24-42`,
  `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+BounceMode.swift:14-35`). a11y "Open Workspace Panel";
  large-content title `header_workspace_icon_large_content_viewer_title` "Workspace: %@" (`localized_strings.yaml:7851`).
- **GovSlack badge** (Home, Gov workspace): square, side 36 × 0.55 + 2 = 21.8 pt, origin (22.2, 22.2) in the tile's
  coordinates (36 − 21.8 + 2 + stroke offset 6), so it overhangs the tile's bottom-right by 8 pt (screen 38.2–60 ×
  80.2–102 in the snapshot; measured inner fill 40.3–58 × 82.3–100); fill `lagoon._90` (`#1c405f` light, measured
  `(28,64,95)`; dark `#aeddec`); 2 pt border `core basePrimary` (white / `#1a1d21`); radius 6 continuous; govslack glyph
  tinted `basePrimary`, inset 5 (`SKWorkspaceAvatar.swift:57-72`, `273-285`, `682-750`). On the iOS 26 28 pt avatar:
  side 28 × 0.59 + 2 = 18.5, stroke offset 0, radius 5, inset 4.
- **Title**: `SKNavigationItem.TitleView`, `.title(maximumPointSize: 34)` = Lato-Black 22 (max 34 with Dynamic Type), 1
  line, tail truncation, leading, header trait (`CompactRootTabSearchHeader.swift:58`, `575-599`); caret-down menu icon
  when the feature supplies a title menu, opening on tap (`:577-582`).
- **Status pill + avatar**: avatar `SKMemberAvatar` `.large` 36 pt, radius 9, trailing 16 (`:185-189`, `519-523`,
  `608-620`). Pill: height 36, radius 9 continuous, `searchBarBackground`; its trailing = avatar leading + 13.76 and
  width 51.76 when an emoji is set (so 38 pt shows left of the avatar: 8 + 22 emoji + 8), width 24 and hidden behind the
  avatar otherwise (`UserStatusContainer.swift:10-21`, `CompactRootTabSearchHeader.swift:199-207`, `432-437`, `525-528`,
  `622-654`). Emoji 22×22, leading 8, centered (`:191-197`, `527-528`). Appear/disappear: bouncy medium spring
  (0.43 s, damping 0.7), emoji alpha 0↔1 and scale 0.2↔1, 0.1 s stagger (`:632-652`,
  `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+SpringAnimation.swift:64-130`).
  Presence (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift:119-146`,
  `259-268`, `415-430`, `812-870`): 36 pt avatar (square-cornered, so the corner formula applies) → cutout circle Ø 14.96 and `status_member_filled.svg` (a Ø9 dot in a
  20 viewBox) drawn at 19.04 pt → dot Ø ≈ 8.6, both centered at (33.0, 33.0) from the avatar's top-left; the ring shows
  the header gradient. Away = `status_member.svg`; DND = `status_member_dnd(_filled).svg`.
  a11y "Profile menu. Member. Active/Away"; tap → You.
- **Search field** (`ContainerControl`): radius 16 continuous, clips (`:231-248`); press dims to alpha 0.4, restores over
  0.15 s (`Modules/UIInfra/SlackUI/Implementation/LegacyWidgets/ContainerControl.swift:27-33`, `112-114`). Icon
  `svgSearch` `search.svg` 20×20 at leading 16, centered (`:259-263`, `491-494`). Label box runs from icon + 12 to
  48 pt before the right edge (symmetric, so centered), text left-aligned in it; `.body(maximumPointSize: 26)` =
  Lato Regular 17, 1 line (`:486-489`, `602`). Text: presentable
  `searchFieldText` = `search_default_placeholder_text` **"Jump to or search…"** (`localized_strings.yaml:17071`,
  `HomeViewPresentable.swift:194`); fallback `search` "Search" (snapshots use "Search"). Right-side clock icon
  (`svgClock`) exists but is always hidden (`:266-271`). Tap: soft haptic 0.5 → open search (`:762-770`).
- **Buttons right of the search field** (Home: Filter, or History with `historyMenu`; DMs: none in Sept, June had Filter): each wrapped in a 44×44
  tile, radius 16 continuous, `searchBarBackground`, containing an `SKIconButton` `.small` (40×40, 20 pt icon)
  tinted `contentInverseSecondary` (`CompactRootTabSearchHeader.swift:688-725`, `CompactRootTabDecoratorViewController.swift:590-613`,
  `SKIconButton.swift:429-449`). Filter icon `svgRefine` `refine.svg`, a11y "Sort and Filter Home" (`home_sort_and_filter`
  `localized_strings.yaml:7969`) / (June) "DMs Filters" (`dms_filters` `:5595`, now unused). "Top row" buttons are configured but their
  stack view is never added to the view (`:273-281`, `701-710`): nothing renders there.
- **Loading bar**: `SKLoadingBar` `.large` (3 pt), inset 6 from each side, top = header bottom − 25, ends faded by a
  gradient mask (0, 0.09, 0.91, 1) (`CompactRootTabDecoratorViewController.swift:370-376`, `770-806`).

#### 2.3.5 Collapse / stretch on scroll

`HeaderScrollAnimationHandler.swift`: progress = min((contentOffset.y + contentInset.top) / **48**, 1) (`:162-169`;
48 = `collapsedHeaderOffsetY`, `CompactRootTabFeature.swift:19`).
- 0…1 collapses: all 48 pt come out of the space above the top line; top line alpha = clamp(1 − 1.5 × progress)
  (`CompactRootTabSearchHeader.swift:853-887`, `927-929`). At 1 the search field sits at safe top + 0.
- < 0 stretches (pull-down): extra height split 80% above the top line, 10% between lines, 10% below
  (`:78-86`, `859-886`). The gradient does not move (§2.3.2).
- Drag end / deceleration end: 0.5 < p < 1 → animate to collapsed; 0 < p < 0.5 → animate to expanded; 0.3 s
  `curveEaseInOut` (`HeaderScrollAnimationHandler.swift:123-136`, `CompactRootTabSearchHeader.swift:829-851`).
- VoiceOver on: never collapses, expands immediately (`:410-417`).

#### 2.3.6 Pull-down actions

- Threshold p < **−2** (pulled 96 pt) while dragging (`HeaderScrollAnimationHandler.swift:49-53`, `138-151`).
- Search tabs (Home, DMs, More): crossing → light haptic, ripple (40 pt radial circle at header bottom-center in
  `searchBarBackground`, opacity 0.2, scales ×25 in 0.5 s ease-in-out, fades out from 0.3 s over 0.2 s), field turns
  `surfaceInversePrimary`, text/icon `contentInversePrimary`, icon scale 1.2, top line alpha 0.3 + scale 0.9, dot hidden
  (spring smooth medium 0.4 s) (`CompactRootTabSearchHeader.swift:889-899`, `1038-1089`). Back above → light haptic 0.5,
  restore (`:901-911`, `1091-1104`). Release past threshold → opens search (`:913-925`).
- Activity (refresh): `svgRotate` `rotate.svg` 24 pt in a 48 pt circle (`searchBarBackground`), centered, dropping at half
  the pull speed from safe top − 24 (min 0); appears with bouncy medium spring (rotation from −90·π/2, scale 0.25 → 1,
  alpha 0 → 1, other content alpha 0.3); on release refreshes and hides in 0.45 s (rotate to 90·π/2, scale 0.6, fade)
  (`:89-104`, `299-303`, `750-751`, `868`, `1106-1137`).
- Easter egg (search tabs): at p < **−3** (144 pt) a random message from the list in §2.2 slides from safe top − 32 to
  safe top + 12 (bouncy medium), scaling from width 100 pt to 1, `smallBodyBold` max 22, `contentInverseSecondary`,
  centered with ≥ 12 pt side insets; soft haptic (`:106-112`, `464-465`, `515-517`, `870-874`, `1139-1182`).

#### 2.3.7 Other states

- Minimal (no workspace/user): tile, pill and avatar hidden, title moves to x = 16 (`testMinimalHeader`).
- Gradient pref off: solid `backgroundGradient1` (`HeaderBackgroundView.swift:79-81`).

#### 2.3.8 Tap search → inline search (pre-26 only)

`CompactRootTabDecoratorViewController.swift:623-737`, `…/RootTabDecorator/CompactRootTabSearchContainerViewController.swift`:
a search screen is added over the tab. Top line fades (spring snappy fast, 0.18 s); the header collapses and its
search field slides up to y = max(safe top, 28) and narrows to the search screen's field width (the real search bar sits
at max(safe top − 4, 28)); results fade in and slide up from +48 pt (spring snappy medium, 0.37 s, damping 0.85); then
the real search bar shows its Cancel button (`CompactRootTabSearchHeader.swift:941-975`). Search bar row: 12 pt
side insets, 44 pt tall, results start 10 pt below it (`CompactRootTabSearchContainerViewController.swift:22-25`,
`102-139`, `211-213`). Cancel reverses the sequence (`CompactRootTabDecoratorViewController.swift:689-737`).

### 2.4 Filter menus opened from the header

System `UIMenu` built from `SKMenu` (pull-down from the button).
- **Home** (`Modules/Features/Home/Implementation/NavigationBarControls/HomeNavigationBarControlsManager.swift:305-379`):
  section "Sort by" (`sort_results_by` `localized_strings.yaml:20493`) submenu, subtitle "Sections. Unreads on top." /
  "Sections. Show in order." / "Newest to Oldest" → items "Sections" (icon `channels`) and "Newest to Oldest" (`svgClock`),
  plus (sections mode) section "Unreads and Mentions" → "Move to the Top" (`svgArrowUp`) / "Show in order" (`svgShuffle`);
  section "Filter" submenu (hidden with `historyMenu`) → "All conversations" (`svgChannel`) / "External people"
  (`svgBuildings`), subtitle "Showing all" / "Showing conversations with other companies"; "Workspaces" submenu when > 1
  workspace ("All Workspaces" / "%@ only"); destructive "Reset" when not default (toast "Reset" with a check icon).
  Keys: `home_sort_menu_subtitle_sections_and_move_to_top` (7972), `…_show_in_order` (7975),
  `channel_list_customization_sort_mode_default` (3763), `…_recency` (3766), `unreads_and_mentions` (22641),
  `prioritization_to_the_top` (15196), `prioritization_none` (15193), `filter` (7140), `all_conversations` (1622),
  `external_people` (6638), `showing_all` (18997), `showing_external` (19000), `workspaces` (23908), `all_workspaces`
  (1690), `workspace_filter_currently_selected` (23877), `reset` (16550).
- **DMs**: none in Sept. June's header filter menu ("All conversations", "Only Unreads" (`only_unreads` 13999), "External
  people"; `Modules/Features/DM/Implementation/NavigationBarControls/DMNavigationBarControlsManager.swift:37-38`,
  `114-133` [June]) is gone with its file; the DMs tab filters with its pills (dms-activity.md §2.4).

---

## 3. Navigation bars on pushed screens

### 3.1 Which stack shows a conversation (three modes)

| Mode | When | Container | Back button | Open animation |
|---|---|---|---|---|
| A | iOS 18 | right panel of `CompactRootTabDoubleViewController`, hosting a legacy `SKNavigationController`; the conversation is that stack's root | Slack caret (`SKBarButtonItem .back`) | custom panel slide (§3.6) |
| B | iOS 26, `rootNavigationUpdates` off (default) | same as A, bar restyled for Liquid Glass | Slack caret in a glass circle | same as A |
| C | iOS 26, `rootNavigationUpdates` on | pushed onto the tab's own `SKNavigationControllerLiquidGlass` | **system** back button | standard UIKit push |

Sources: `Modules/Features/CompactRoot/Implementation/CompactRootFeature+Dependencies.swift:87-111`;
`Modules/Features/CompactRoot/Implementation/CompactRootTabDoubleViewController.swift:42-44`, `139-166`;
`Modules/Features/CompactRoot/Implementation/RootTabViewController.swift:105-126`. Home row tap
(`Modules/Features/Home/Implementation/Plugins/ConversationList/ConversationListHomePlugin.swift:367-369`): Sept always
navigates with `.reset` ("the conversation list is a tab's root level, so the detail stack is replaced rather than
grown"); June used `.push(dismissModals: true)` in mode C. In mode C `.reset` sets the stack to `[tab root,
conversation]` (`RootTabViewController.swift:123-124`), which from the tab root is still a standard push; in modes A/B
it fills the right panel (`CompactRootTabDoubleViewController.swift:139-166`).

### 3.2 The bar

**Source**: `Modules/UIInfra/NavigationController/Implementation/UINavigationBar+SlackStyles.swift:29-98`
(applied by `SKNavigationController.viewDidLoad`, `Modules/UIInfra/NavigationController/Implementation/SKNavigationController.swift:45-50`),
`Modules/UIInfra/SlackKit/Implementation/Global/SLAppearance.swift:33-42`.

- iOS 18: opaque (`isTranslucent = false`), background `core basePrimary` `#ffffff` / `#1a1d21`, system shadow removed,
  1 px hairline at the bottom in `outlineTertiary` (`#5e5d60` 13% / `#797c81` 30%) added unless the feature hides it
  (`UINavigationBar+SlackStyles.swift:29-41`, `75-92`; default `isHairlineHidden: false`,
  `Modules/UIInfra/Architecture/Implementation/Feature.swift:67`; `SKNavigationController.swift:151-156`). Height 44 pt
  (every iOS_18 bar baseline is 132 px); in the full-screen `testInNavigationBar_*` snapshots the bar spans y ≈ 54–98.
- iOS 26: translucent, `backgroundColor = .clear`, hairline is a no-op (`UINavigationBar+SlackStyles.swift:29-33`,
  `87-90`); content scrolls under the bar (`extendedLayoutIncludesOpaqueBars = true`,
  `Modules/UIInfra/Architecture/Implementation/ViewController.swift:105-107`); iOS draws its default scroll-edge effect.
  Bar baselines are 162 px (54 pt) with 44 pt glass controls at the top of that; full-screen snapshot controls span
  y ≈ 59–103. In mode C, pushed screens always get the empty background (`SKNavigationBarLiquidGlass.swift:83-93`).
- Plain text titles (screens without a custom title view): Lato-Bold 17 (`SKFont.bodyBold`), `contentPrimary`
  (`UINavigationBar+SlackStyles.swift:83-84`). No large titles anywhere.
- Global `UINavigationBar.appearance().tintColor = highlight1.content` `#1264a3` / `#2ba5ce` (`SLAppearance.swift:37`):
  system items (e.g. "Edit", mode C back button) are blue; Slack's own buttons bake their own colors.
- Bar button changes animate; on iOS 26 each item keeps a stable `identifier` so glass capsules morph instead of
  flickering (`SKNavigationItem.swift:310`, `347-349`, `384-389`). Header updates are rate-limited to 100 ms
  (Sept: throttled, latest value, 100 ms, so the first header isn't held back while pages load;
`Modules/Features/ConversationHeaderMenu/Implementation/NewConversationHeaderHelperService.swift:296-299`).

**Production (device screenshots, Sept 2026):** confirmed on a device: the bar region is 54 pt (content inset 116 on the
Pro Max; a thread's root avatar at 128 = 116 + 12), controls at y 62–106; Slack doesn't set it (no bar height in
`SKNavigationBarLiquidGlass.swift` or `SKNavigationControllerLiquidGlass.swift` [Sept]): UIKit's iOS 26 bar. Separate
glass groups sit 12 pt apart. Dark glass over content: fill (33,37,42), a 1 pt rim fading (66,75,87) → (48,54,63),
content behind visible through it (measurements.md › D).

### 3.3 Back button

**Source**: `SKNavigationController.swift:68-117`, `175-182`, `227-231`, `249`; `SKBarButtonItem.swift:133-143`, `241-332`.
**Snapshots**: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKBarButtonItemTests/testBackButtons@3x.png`
(three carets, top padding 0 / −8 / +8), `…/testAllTogether@3x.png`. June's baselines (cd22922) drew the glass: one
shared capsule for the three carets; `testAllTogether` a back circle at x 16–59.7 and the right items' capsule at
210.7–376.7. Sept's baselines draw **no glass** (transparent around the glyphs): the carets' ink at x 17.3–26.3, then 52 pt
apart (69.3, 121.3); `testAllTogether` caret 17.3–26.3, spinner 247.7–257.7, "Hello" 291–329, person icon 363–378.7.
The glass measurements in this spec are June's, confirmed on a device (§3.2).

- Icon `svgCaretLeftFull` `caret_left_full.svg` 20×20 (glyph x 5.5–14.8, y 1.7–18.3 of the viewBox), color
  `contentPrimary` `#1d1c1d` / `#f8f8f8` (baked light/dark images, tint ignored) (`SKBarButtonItem.swift:48`, `277-288`, `342-373`).
- Image padding 10 top/bottom; left 2 on iOS 18, 0 on iOS 26 (`:258-275`); the header helper adds `.headerNudge`
  (top −5, iOS 18 only) (`:665-671`, `Modules/Integration/HeaderHelper/Implementation/HeaderHelperService.swift:290`, `305`).
- iOS 18: icon box x 18–38 (glyph measured x 23.7–32.7). iOS 26: 44×44 glass circle at x ≈ 16–60 (measured 16.3–59.7).
- No title text, no unread count/badge, no `backButtonDisplayMode`/`backIndicatorImage` customization (searched
  `Modules/`, `App/`). a11y "Back" (`back`, `localized_strings.yaml:2370`).
- Added on every non-root push and also when the conversation is the panel root (`shouldAddSupplementaryBackButton`,
  `Modules/Features/AnyConversation/Implementation/AnyConversationInteractor.swift:840`). Tap = pop; at the panel root
  this dismisses the panel (`CompactRootTabDoubleViewController.swift:208-211`). Mode C uses the system back button
  (title/color unverified).
- Production (D, iOS 26.7): the caret, not UIKit's chevron, on pushed screens: a thread's back glyph ink x 37.5–46.3,
  y 75.5–92.2 in the circle x 20–64 (caret_left_full's 5.5–14.8 × 1.7–18.3 of a centered 20 pt box), (248,248,248) =
  `contentPrimary` (IMG_2248; the channel's, IMG_2247, the same). The clone draws it on every pushed bar (`NavBar.tsx`
  `BackChevron`, measured x 37.67–46.67, y 75.67–92.33 on the Pro Max); its generic bar drew SF `chevron.left` before.

### 3.4 Conversation title pill (channel, DM, group DM; Messages tab)

**Source**: `Modules/UIInfra/NavigationController/Implementation/ConversationNavigationTitleView.swift`;
content `Modules/Features/ConversationHeaderMenu/Implementation/ConversationHeaderPresentationObject.swift:186-488`.
No snapshot exists.

- Width: fills the space between the back button and the right buttons (`ConversationNavigationTitleView.swift:74-82`).
- iOS 26: `UIGlassEffect` (interactive) capsule, height 44 (= 36 + 8) (`:120-140`, `257`). Sept can hide and re-show
  the pill in place (alpha + dissolving the glass, spring) while a channel tab or the tabs-menu morph borrows the bar
  (`:27-35`, `192-226`).
  iOS 18: rounded rect, radius 9 + 2 = **11** continuous, fill `containerSecondary` `#f8f8f8` / `#212428`, height 40
  (44 minus a 4 pt bottom gap) (`:59-70`, `108-116`, `259-261`).
- Row: horizontal, centered, spacing 8 (`:471`). Icon ornament: 20 pt icon in a 36 pt slot, no gap to the text.
  DM avatar ornament: 36 pt `SKMemberAvatar` (circle on iOS 26, radius 9 on iOS 18) in a 40 (iOS 18) / 44 (iOS 26) slot,
  then a 6 / 4 pt gap (`:453-466`, `959-966`). Unread dot at the right: 8 pt `highlight1.content` dot with a 2 pt
  `basePrimary` ring (12 pt total), 4 pt from the edge (`:480-492`). VIP icon 16 pt after the name; status emoji 12 pt.
- Name: `.smallBodyBlack(sizeAdjustment: .none)` = Lato-Black 15, fixed size, `contentPrimary`, 1 line, tail truncation
  (`ConversationHeaderPresentationObject.swift:301-306`). Subtitle: `.caption(sizeAdjustment: .none)` = Lato Regular 13,
  `contentSecondary` `#454447` / `#b9babd` (`:418`).

| Type | Ornament | Subtitle |
|---|---|---|
| public channel | `svgChannelFilled` `channel_filled.svg` | "{N} members • {M} tabs" ("{K} updates" when other tabs have unreads) |
| private channel | `svgLockFilled` `lock_filled.svg` | same |
| archived | `svgArchiveFilled` `archive_filled.svg` | same |
| group DM | `svgMessageFilled` `message_filled.svg` | same |
| DM | 36 pt avatar + presence (online `highlight2.content` `#007a5a` / `#3daa7c`, away `contentTertiary`) | "{M} tabs"; the person's status emoji + text if set |

(`ConversationHeaderPresentationObject.swift:309-325`, `344-362`, `376-442`; separator `" • "` at `:410`.) Strings
(`localized_strings.yaml`): `one_member` "1 member" (13753), `few_members`/`other_members` "%@ members" (6366/13534),
`one_tab` "1 tab" (13899), `few_tabs`/`many_tabs` "%@ tabs" (6451/10994), `one_update` "1 update" (13932),
`few_updates`/`many_updates` "%@ updates" (6470/11028); a11y hint `open_menu` "Open Menu" (14085). No "#" prefix on the
Messages tab (`showChannelPrefixInCollapsedState: false`, `:253`).
- Tap: opens the channel tabs menu, which morphs out of the pill (spring damping 1.0, 0.4 s; card radius 20)
  (`NewConversationHeaderHelperService.swift:582-585`;
  `Modules/Features/ConversationHeaderMenu/Implementation/MenuFeature/ConversationTabsMenuView.swift:46`, `478`). Channel
  details live in that menu ("Settings & Details",
  `Modules/Features/ConversationHeaderMenu/Implementation/MenuFeature/ConversationTabsMenuPresenter.swift:329`).
- Loading on iOS 26: 3 pt `SKLoadingBar` along the bottom inside the capsule (`ConversationNavigationTitleView.swift:231-235`).

**Production (device screenshots, Sept 2026):** the channel pill spans x 76–309 on a 440 pt screen (12 pt after the back
circle, 12 pt before the right capsule), `#` in its 36 pt slot, "general" over "NN,NNN members • 5 tabs" (the count with
grouping, `SLKPluralString+Helpers.swift:226-236` [Sept]). The **thread** title is a capsule of the same height that
also fills the bar, leading-aligned: x 82–309 (the 6 pt nudge for the back button, `HeaderTitleView.swift:405-409`
[Sept]), "Thread" (Lato Black 16, `content_primary` in Sept, `:430`) over "#general" (Lato 13 `content_secondary`),
16 pt in. The June code left UIKit to center a hugging title view; Sept's `HeaderTitleView` is greedy
(`systemLayoutSizeFitting` takes the proposed width, `:212-221`) and fills on the SwiftUI path
(`SKNavigationToolbar.swift:62-74`, `.fillsBarWidth`, unified navigation); production fills on the UIKit path too.

Threads use `HeaderTitleView` instead (`Modules/UIInfra/NavigationController/Implementation/HeaderTitleView.swift`):
title "Thread" (`thread`, `localized_strings.yaml:21605`) Lato-Black 17 (16 in the iOS 26 capsule), subtitle "#channel" or
person icon + name in Lato 13 (`sk_highlight` `#1264a3` / `#1d9bd1` on iOS 18; `contentSecondary` in the iOS 26 capsule);
title color `contentPrimary` (June `sk_primary_foreground`) (`:430`); iOS 26 capsule 44 pt with 16 / 10 pt text insets;
iOS 18 sits as a left item after the back button (`:22`, `30-32`, `314-322`, `358-363`, `430`, `502-515`;
`HeaderHelperService.swift:424-439`). Snapshots:
`Modules/UIInfra/NavigationController/Snapshots/iOS_26/NavigationControllerTests.HeaderTitleViewSnapshotTests/` (the
module moved from `DeveloperComponents` in Sept; e.g. `testLiquidGlassCapsuleHeaderWithTitleAndSubtitle@3x.png`) and
`iOS_18/…` (June: `testTitleAndSubtitle`, `testHighlightedSubtitle`, `testSubtitleWithPrivateChannel`). Other pushed screens (Canvas, Lists, …) use
`SKNavigationTitle` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/NavigationTitle/SKNavigationTitle.swift:70-89`):
centered title Lato-Black 17 `contentPrimary`, subtitle Lato 15 `contentSecondary`; snapshots
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKNavigationTitleSnapshotTests/testInNavigationBar_shortTitle@3x.png`
(back caret, "# team-clicap-mo…", "Edit"; re-recorded in Sept, 0.4% of pixels differ) and its `iOS_18` twin (June;
title centered at x 113.7–281).

### 3.5 Right bar buttons on a channel/DM

Sept orders them leading → trailing ("index 0 sits closest to the title",
`Modules/Integration/HeaderHelper/Interface/HeaderBarButtonPresentable.swift:195-197`, built `:204-343`, reversed for
UIKit by `SKNavigationItem.swift:348-349`; June was right → left, `:177` [June]): … AI summary, Slackbot entry, resolve
(canvas comments), Huddle (or Call `svgCall` if huddles are off but calls are on), then the Slackbot/agent/AI-app chat
buttons (`:244-339`; `ConversationHeaderPresentationObject.swift:724-767`). With `ios_find_in_channel` on (default off,
`Modules/Data/Toggles/Definitions/ios_find_in_channel.json`; not on the production devices, which show the Slackbot entry
instead) a **Search** button, `svgQuickSwitch` (June `svgSearch`), a11y "Search…" (`search_with_ellipsis`), goes in at
index 0, i.e. **inboard** of the conversation's own buttons (June's right → left order put it at the trailing end), and
the Slackbot entry is dropped; while the inline find is active the right side is only Done
(`Modules/Features/ConversationHeaderMenu/Implementation/NewConversationHeaderHelperService.swift:786-804`; June
`:528-546` [June]); the title's find action then starts the inline find instead of opening Search (`:574-580`).
With default flags a channel shows **only the headphones button**; there is no info/"…" button on the Messages tab
(other tabs show "…" when they have actions, `ConversationHeaderPresentationObject.swift:851-885`).

**Production (device screenshots, Sept 2026):** channels, DMs and threads show the **Slackbot entry** left of the
headphones, in **one** glass capsule (x 321–420 on 440 pt: Slackbot 47 wide, headphones 44, 8 apart). June: behind
`ios_slackbot_modal` (`NewConversationHeaderHelperService.swift:846` [June]); Sept: shown whenever Slackbot AI is visible and
the conversation isn't the Slackbot DM (`NewConversationHeaderHelperService.swift:1093-1108`), `rightButtons` ordered
leading → trailing ("index 0 sits closest to the title", `HeaderBarButtonPresentable.swift:196`) = `[slackbotEntry,
huddle]` (`:281-298`), reversed for UIKit by `SKNavigationItem.swift:348-349`; it replaces the AI-summary button
(`ConversationHeaderPresentationObject.swift:754`). The button: `svgSlackbotColor` 25 × 25, full color, 10 pt top /
bottom padding, none at the sides on glass (`SKBarButtonItem.swift:110-118`, `:258-275`); a11y "Slackbot"; tap opens the
Slackbot DM with the conversation as context, as a bottom sheet in Sept (`AnyConversationFeature.swift:525-529`; the
clone pushes it). Clone flag `slackbotConversationHeaderEntry`.

**Huddle button** (Sept: `HeaderHelperService.swift:520-557` builds an `SKBarButtonItem.HuddlePresentationObject` and
`SKBarButtonItem.swift:216-240` owns the glass-vs-legacy rendering, prominent capsule and pulse; June's `UIBarButtonItem`
builder was `HeaderHelperService.swift:507-587` [June]; `HeaderBarButtonPresentable.swift:149-177`). Its custom view is
new in Sept, **`SKHuddleBarButtonView`**
(`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKHuddleBarButtonView.swift:15-24`): one
horizontal stack holding a fixed 32 × 32 badge (inactive: the 20 pt headphones `SKIconButton`, size `.accessory`,
filling the badge for the tap area; its background circle is drawn only before iOS 26, `:122-139`, `:190-216`) and an
`SKButton` pill (active: the member count with `svgHeadphones`, size `.huddleBarButton(isLiquidGlass:)`, transparent on
glass because the prominent capsule is the pill, `:151-188`); only one of the two shows. Pulse: before iOS 26 a ring
scaling to 1.5×, 1 s ease-in, autoreversing 20× (`:218-227`); on glass the icon scaling to 1.2×, 1.5 s ease-in-out
(`:229-238`). The capsule is `.prominent`, tinted the active fill, or while inactive only when the coachmark shows
(`SKBarButtonItem.swift:546-553`, `:232-238`). June drew it with
`Modules/UIInfra/Education/Implementation/EDUFlagBarButtonItem/EDUFlagBarButtonItemContainerView.swift:13-80` [June]
(still in the tree, no longer used by the header).
Snapshots (iOS 18, 1179×132 each, June baselines; iOS 26 baselines are blank because glass isn't drawn):
`Modules/Integration/HeaderHelper/Snapshots/iOS_18/HeaderHelperServiceTests.HeaderHelperBarButtonItemTests/`

| State | Look | PNG |
|---|---|---|
| inactive | `svgHeadphones` `headphones.svg` 20 pt, `contentPrimary`, on a 32 pt circle filled `basePrimary` (invisible on the bar); icon inset left 4 / bottom 4 on iOS 18, 0 on iOS 26; center ≈ (363, 19.8) | `testInactiveHuddleWithoutCoachmark@3x.png` |
| first-use coachmark | 32 pt circle `highlight1.baseInverse` `#1264a3` / `#004d76`, icon `contentInversePrimary` white; iOS 18 pulse: 32 pt halo at 30% scaling to 1.5×, 1 s ease-in, reversing, 20×; iOS 26: icon scales 1.2×, 1.5 s, prominent glass tinted blue | `testInactiveHuddleWithCoachmark@3x.png` |
| active with people | pill: 16 pt headphones + count ("15"), text/icon `sk_off_white` `#f8f8f8`, Lato Bold 12 (iOS 18) / 15 (iOS 26), padding 8 h / 6 v, radius 14, spacing 5; iOS 18 fill `highlight2.baseInverse` `#007a5a` / `#00553d`, lifted 8 pt; iOS 26 clear + prominent glass tinted `#007a5a`; measured 51×28 at x 326–377 | `testActiveWithMembers@3x.png` |
| active, 0 count | 32×28 green pill, icon only | `testActiveWithoutMembers@3x.png` |

Copy: a11y "Start Huddle" (`start_huddle` 20629), "Join huddle, %@" (`join_huddle` 10336, e.g. "15 members"). Tap →
huddle preview (`Modules/Features/AnyConversation/Implementation/AnyConversationFeature.swift:495-497`). Button styles:
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:253-254`, `284-285`, `315-316`,
`338-339`, `372-373`.

Other icon buttons: 20 pt icon `contentPrimary`, disabled `outlineSecondary` (`SKBarButtonItem.swift:277-288`); Search
(find in channel) `svgQuickSwitch`; AI summary `svgAiSummary` (`svgAiSummaryFilled` tinted `sk_highlight` with an 8 pt dot while ready).

**Glass geometry on iOS 26** (measured in `SKBarButtonItemTests` iOS_26 PNGs): capsules 44 pt tall, 16 pt from the screen
edge; one button = 44×44 circle; buttons in one capsule are 52 pt apart center-to-center; separate capsules 12 pt apart.
`testAllTogether` (June baseline): back circle x 16–60; the three right items share one capsule x 211–376.7. Glass
rendered in June's snapshots as a flat `#dcdcdc` fill with a lighter 1 pt rim (not the real material); Sept's baselines
don't draw it (§3.3). iOS 18: items ≈ 52–54 pt apart.
`testSystem*GlassStyling`: on iOS 26 Done/Add become prominent circles with system checkmark/plus, Cancel/Close plain
circles with an X, Edit a pencil, Save stays text (`SKBarButtonItem.swift:396-434`); iOS 18 text buttons "Done", "Add",
"Cancel", "Edit", "Save" Lato Bold 17 `#1264a3` (`#454447` disabled).

### 3.6 Transitions and gestures

- **Modes A/B, Home → conversation** (`Modules/UIInfra/LegacyUI/Implementation/DoublePanel/DoublePanelView.swift:180-188`,
  `326-331`; config `CompactRootTabDoubleViewController.swift:114-123`: right panel, `.nativeOverlay`, no dimming, full
  width): the conversation slides in from x = 393 → 0 while Home shifts left by 15% of the width (≈ −58 pt);
  `UIView.animate(withDuration: 0.3, usingSpringWithDamping: 1.0, initialSpringVelocity: <swipe>)`; black shadow on the
  panel's left edge, radius 5, opacity 0.12 while shown (`DoublePanelView.swift:85-89`, `349-359`). Swipe right anywhere
  closes it when the stack has one screen (slope < 0.6, completes past 50% or > 300 pt/s)
  (`DoublePanelViewController.swift:121`, `266-320`, `437-442`, `793-811`); swipe left on Home re-opens the last
  conversation (`:300-337`). Home is hidden once the panel is fully open (`:774-787`).
- **Pushes inside a conversation** (thread, details): standard UIKit push and edge-swipe back; no custom animators in the
  repo (`FeatureNavigationController.swift:269-288`, `SKNavigationController.swift:227-231`).
- **Mode C**: standard push/pop; a one-shot left swipe at the tab root re-pushes the last popped screen
  (`FeatureNavigationController.swift:86-102`, `193-195`).
- **Tab bar stays visible** over conversations: nothing sets `hidesBottomBarWhenPushed` (none in `Modules/`, `App/`);
  only AllUnreads and AiRecap hide it (`Modules/Features/AllUnreads/Implementation/AllUnreadsViewController.swift:976-1001`,
  `Modules/Features/AiRecap/Implementation/AiRecapViewController.swift:599`). Reselecting the tab closes the
  conversation (§1.6). Worth confirming on a device.
- **Status bar** in a conversation: `.default` (`SKNavigationController.swift:60-62` → `AnyConversationViewController`
  → `SKPageController`, no override). Pre-26 Home with brightness > 3 is `.lightContent`, so it flips to dark glyphs
  when the panel finishes opening (`DoublePanelViewController.swift:238-248`).

---

## 4. More tab and You

No full-screen snapshot exists for the More page, the You screen or the You menu; rows are specced from code and checked
against SlackKit component PNGs.

### 4.1 More page: what's listed

`OverflowTabIdentifier` has 7 cases (`Modules/DataService/TabBarOverflow/Interface/TabBarOverflowServiceInterface.swift:64-72`),
but only 5 items are registered, in this display order
(`Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPageFeature+Dependencies.swift:127-129`); items live in
`Modules/Features/TabBarOverflowPage/Implementation/OverflowTabItems/`:

| # | Row | Shown when | Title (key, yaml line) | Subtitle (key, line) | Icon | Accessory |
|---|---|---|---|---|---|---|
| 1 | Sales | Sales Home visible and iOS 26 (`SalesOverflowTabItem.swift:54`) | "Sales" (`sales` 16746) | "View and update your Salesforce info" (`sales_tab_overflow_description` 16780) | `svgSales` `sales.svg` | count badge (alerts) |
| 2 | Agentforce | Agentforce on and (iOS 26 or Sales Home) (`AgentsOverflowTabitem.swift:59`) | "Agentforce" (1182) | "Browse and team up with AI agents" (`browse_and_team_up_with_ai_agents` 2609) | `svgAgentforce` `agentforce.svg` | — |
| 3 | Files | always on iOS 26; pre-26 only if Sales/Agentforce took the 4th tab (`DocsOverflowTabItem.swift:26-37`) | "Files" (7101) | "Browse your canvases, lists and attachments" (`files_tab_subtitle` 7131) | `svgCanvasBrowser` `canvas_browser.svg` | — |
| 4 | Assigned to you | Lists on and not `todosV2` (`ListsOverflowTabItem.swift:41-49`) | "Assigned to you" (`ios_assigned_to_you_tab_title` 10196) | "Check off your tasks" (`slack_lists_assigned_to_you_subtitle` 19544) | `svgUserGroups` `user_groups.svg` | PRO if upsell; NEW until the Lists megaphone is dismissed (`:52-65`, `85-105`) |
| 5 | External Connections | always; disabled for frontline workers (new, `ExternalConnectionsOverflowTabItem.swift:35-47`) | "External Connections" (`external_connections` 6607) | "Work with people from other organizations" (23760) | `svgBuildings` `buildings.svg` | PRO if not on a paid plan (`:46`) |

A typical iOS 26 user sees Files, Assigned to you, External Connections. The More **tab badge** = any enabled item with
badge count > 0; only Sales can produce one (`Modules/DataService/TabBarOverflow/Implementation/TabBarOverflowService.swift:50-63`,
`TabBarOverflowServiceInterface.swift:53-57`).

### 4.2 More page: chrome and rows

- iOS 26 header: §2.2 with title "More", right button user avatar (+ Slackbot with the flag), gradient, pull-to-smile,
  no loading bar (`Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPageInteractor.swift:218-241`);
  title fade effect (`…/TabBarOverflowPagePresenter.swift:146-154`). Pre-26: §2.3 header (title "More", avatar, search).
  Sept can also push the More page (`isPushed`): then it has a plain "More" title and a back button, no gradient header
  (`…/TabBarOverflowPageViewController.swift:77-79`, `96-119`; `…/TabBarOverflowPagePresenter.swift:48-57`).
- Background `basePrimary` (June `sk_primary_background`, same values); full-bleed `SKEntitiesList`
  (`…/TabBarOverflowPageViewController.swift:53-58`, `75`, `81`).
- Sections: one per item. Header = 8 pt blank; footer = 8 pt with a full-width 1 px `outlineTertiary` line at its
  bottom (also after the last row); no titles, no in-section separators (`TabBarOverflowPagePresenter.swift:85-115`;
  `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Footer/SKListFooterView.swift:18-19`, `50`, `106-112`).
  Rhythm: 8 · row · 8 + line · 8 · row · 8 + line …
- Row = `SKGenericEntity` `.medium` (`TabBarOverflowPagePresenter.swift:110`;
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/GenericEntity/SKGenericEntity.swift:451-486`):
  padding 10 top/bottom, 16 left/right; 36×36 clear icon box at x 16–52 with a 20 pt icon `contentPrimary`; text at x 64
  (gap 12); height max(36, 20.67 + 15.67) + 20 = **56.33** (snapshot 169 px). Title `.body` Lato 17 (`.bodyBold` when
  Sales has alerts) `contentPrimary`, 1 line; subtitle `.caption` Lato 13 `contentSecondary`, no gap. No chevron.
- Badges at the right edge, priority PRO > count > NEW (`TabBarOverflowPagePresenter.swift:117-144`;
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Badge/SKBadge.swift:177-227`, `382-434`): PRO = literal
  "PRO", white on `aubergine._70` (`#83388a` / `#cfa1de`), Lato Bold 12, rounded rect height 20, radius 5, padding 4,
  min width 24 (snapshot 33×20); count = pill 18 pt, `contentInverseImportant` on `baseInverseImportant`, "9+" above 9;
  NEW = `new_all_caps` "NEW" (12791), `highlight1.content` on `highlight1.base` (`#1264a3` on `#e3f8ff`), pill 18.
- Press: highlight rect inset 4 left/right, radius 12 continuous, `baseTertiary`; content scales to (W−8)/W with spring
  smooth fast 0.2 s / medium 0.4 s (same as §5.4).
- Taps open the destination on the More stack, and Sept **replaces** the stack with `[More, destination]`
  (`.resetNavigationStack` on every device; June did that only on non-compact iPad and pushed on iPhone): Files →
  `DocsRoute(.moreTab)` (the `customFilesSection` → `FilesBrowserRoute` branch is gone); Assigned → `AssignedFeatureRoute`;
  External Connections → `ExternalConnectionsRoute`; Agentforce → `AgentsListRoute`; Sales → `SalesHomeRoute`
  (`TabBarOverflowPageInteractor.swift:134-152`, `…/TabBarOverflowPageFeature.swift:112-135`). From the More root that
  still looks like a push. No long-press, swipe, reorder or empty state. Frontline workers get a compose FAB instead of
  Create (`…/TabBarOverflowPageFeature.swift:162-169`).
- Pushed More pages use `SearchNavigationHeaderView` (`Modules/UIInfra/MoreTabUI/Implementation/SearchNavigationHeaderView.swift`,
  `SearchNavigationTitleView.swift`): title Lato-Black 17 fixed `contentPrimary` centered on the view's safe-area center,
  optional subtitle Lato 15 `contentTertiary`, optional caret `svgCaretDown` (`contentSecondary`, rotates π while the menu is
  open, title stack scales 0.95 / alpha 0.9), trailing buttons (e.g. `svgSearch`, a11y "Search") flush to the safe-area
  trailing edge, title trailing ≤ buttons − 12; search mode = `[SKSearchBar, "Cancel"]` spacing 8, swapped with spring
  smooth medium 0.4 s (alpha 0, scale 0.96) (`SearchNavigationTitleView.swift:42-58`, `67-83`, `113-155`;
  `SearchNavigationHeaderView.swift:84-94`, `144-194`, `215-286`). Snapshots
  `Modules/UIInfra/MoreTabUI/Snapshots/iOS_26/MoreTabUITests.SearchNavigationHeaderViewSnapshotTests/` (re-recorded in
  Sept, < 1% of pixels changed):
  `testSimpleTitle_noSearch_noTrailingButton` (title only, glyphs x 136.3–300, y 74.3–90, `#1d1c1d`),
  `…_noSearch_trailingButton` (add-reaction x 348–365.7), `…_withSearch_noTrailingButton` (magnifier x 348.3–365.3),
  `…_withSearch_trailingButton` (both, 40 pt apart), `testSubtitle` ("Subtitle goes here" `#5e5d60`); the red vertical
  line is a test guide. `iOS_18` twins (June) add a blue system back chevron and center the title on the view.

### 4.3 How You opens

- Avatar button in every root header (§2.2 user button / §2.3.4 avatar). Flag `youMenu` off (default): present the You
  screen via `YouRoute()`; on: the avatar shows the You menu (§4.6) as its primary action
  (`PrimaryNavigationHeaderService.swift:225-231`; `Modules/Features/YouMenu/Implementation/YouMenu.swift:59-85`;
  `SKBarButtonAvatarItem.swift:77-110`). There is no You tab.
- Presentation: modal in the current workspace (`Modules/Features/You/Implementation/YouRouteExecution.swift:10-14`), default
  `.formSheet` (`Modules/UIInfra/Architecture/Implementation/Navigation/ModallyPresentableFeature.swift:63-68`) = system
  page sheet, swipe-to-dismiss, no custom detents; embedded in a nav controller with an automatic left close button
  (`UIImage(systemName: "xmark")`, tint `contentPrimary`, a11y "Close") (`ModalPresentationController.swift:400-410`,
  `Modules/UIInfra/NavigationController/Implementation/UIViewController+CloseButton.swift:61-77`); title
  "You" (`you` 24205, `Modules/Features/You/Implementation/YouViewController.swift:22`) Lato Bold 17; background
  `basePrimary` (`:21`); shimmer placeholder while loading.

### 4.4 You screen rows (`Modules/Features/You/Implementation/YouPresenter.swift:107-182`)

Section A (header 8 pt, footer 8 pt + hairline):

| Row | Layout | Type / color | Copy | Tap |
|---|---|---|---|---|
| Profile (`Views/YouInfoView.swift`) | insets 4/16/12/16; avatar `.extraLarge` 56 pt radius 14 + presence; text 16 pt after, x 88; height max(56, 24 + 20.67) + 16 = **72** (`:33-42`, `98-108`) | name `.subtitle` Lato Black 20 `contentPrimary` (`#1d1c1d` / `#f8f8f8`; June `sk_primary_foreground`); second line `.body` 17 `contentSecondary` (`#454447` / `#b9babd`; June `sk_foreground_max`); bg `basePrimary`, pressed `baseSecondary` (`#f8f8f8` / `#1a1d21`; June `sk_foreground_min_solid`) (`:90-96`, `117-119`) | name; "Active" (`active` 577) / "Away" (`away` 2364) | Edit profile |
| Add-photo banner (default avatar, not dismissed) | `SKBanner .regular`: padding 12, radius 12, 20 pt icon, margins 12/16/12/16 | bg `highlight1.baseInverse` (`#1264a3` / `#004d76`), text/icons `contentInversePrimary`; heading `.bodyBold`, body `.body` | "Add a profile photo" (`add_profile_pic_heading` 824), "Help your teammates know they’re talking to the right person." (821); `svgCameraFilled`; X | action sheet "Cancel" / "Photo Library" (14722) / "Take Photo" (21015); toasts "Saving…" (16939); X dismisses forever |
| Status pill (`Views/YouStatusView.swift`, `Views/UserStatusView.swift`) | row insets 4/16/8/16; pill x 16–377, height **56**, row **68**; radius 14 continuous, 1 pt border; inner padding 8/16/8/16, spacing 12; 20 pt emoji/icon (`UserStatusView.swift:23-52`, `93-101`, `171`) | border `outlineTertiary` (`#5e5d60` 13% / `#797c81` 30%; June `sk_foreground_low_solid`), bg `basePrimary`; pressed `baseTertiary` (`#eaeaea` / `#212428`), scale 0.99; placeholder, its emoji icon and the clear X `contentSecondary` (`#454447` / `#b9babd`; June `sk_foreground_max_solid`) | none: "What’s your status?" (`whats_your_status` 23636) with `svgEmoji` `emoji.svg`; set: emoji + text + clear X (`svgClose`, 40 pt, a11y "Clear Status" 3896) | Set a Status modal; X → toast "Status Cleared" (20670) |
| Pause notifications | 44 pt `SKGenericEntity .small`: 24 pt clear icon box x 16–40, text x 52 | `.body` `contentPrimary`; icon `contentSecondary` (June `sk_foreground_max_solid`); trailing "On" (`on` 12849) `contentSecondary` when paused | "Pause notifications" (`pause_notifications_sentence_case` 14618); `svgNotificationsOff` `notifications_off.svg` | Pause Notifications sheet (§4.5) |
| Away / Active | 44 pt (56.33 with subtitle) | regular text, last word bold; offline: disabled + caption subtitle | "Set yourself as **away**" (`set_yourself_away` 17721) / "…**active**" (16736); offline "Reconnect to change" (15847); `svgUserStatus` `user_status.svg` | toggles presence immediately (`Modules/Features/You/Implementation/YouFeatureHandler.swift:30-40`) |

Section B (header 8 pt blank; all rows 44 pt, `.body` `contentPrimary`, icon `contentSecondary` (`YouPresenter.swift:32-34`;
bold rows `contentPrimary`, disabled `contentTertiary`), x as above), non-guests:
"Invitations to connect" (`slack_connect_invitations_title` 19357, `svgBuildings`; bold + count pill when there are
invites) → Slack Connect hub; "View profile" (`view_profile_sentence_case` 23261, `svgUser` `user.svg`); "VIP" (23297,
`svgVip`, only with priority access); "Salesforce" (16871, `svgSfCloud`, only with orgs); "Notifications" (13451,
`svgMobileNotification` `mobile_notification.svg`); "Preferences" (14979, `svgSettings` `settings.svg`) → Settings.
Guests skip Invitations. "Saved items" exists but is always filtered out (`YouPresenter.swift:164`). Optional section C:
megaphone/trial banner. Content height for a non-guest without banners ≈ 428 pt.

### 4.5 Pause Notifications sheet (`Modules/Features/NotificationsPause/Implementation/`)

Modal sheet; title "Pause Notifications" (`pause_notifications` 14615); close left, "Save" right (16880, disabled until a
change, `NotificationsPausePresenter.swift:228`); background `basePrimary` (`:48`). Sections: "Resume"
(`resume_notifications` 16646; June's value "Resume notifications"; `sk_raspberry_red` `#e01e5a`, `:130-133`) with the
end time (only when paused); presets with radio buttons "30 minutes" (21424), "1 hour" (13726), "2 hours" (22419),
"4 hours" (7426), "Until tomorrow" (22690), "Until next week" (22687); "Custom" (`custom_snooze_time` 5083) → inline wheel
date picker; VIP switch "Always allow notifications from VIPs" (`allow_notifications_from_priority` 1708) or banner "Still
want notifications from certain people? Try adding people as your VIPs." (15206). The switch is now the system `UISwitch`
(system size and Liquid Glass look) tinted `highlight2.content` (`#007a5a` / `#3daa7c`) with a `contentInversePrimary`
thumb (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Switch/SKSwitch.swift:21-41`, `53-74`); June drew its
own 51×31 switch on `highlight2.baseInverse` (`#007a5a` / `#00553d`).
Picking a preset, Save or Resume dismisses (`NotificationsPausePresenter.swift:53-218`, `NotificationsPauseDataTypes.swift:69-179`).

### 4.6 You menu (flag `youMenu`, default off)

`Modules/Features/YouMenu/Implementation/YouMenu.swift:161-383`; native `UIMenu` from `SKMenu` (system styling, SF Pro).
Section 1: user name, subtitle "Active"/"Away", 32 pt avatar with the header's inverted presence colors → profile. Section 2: status ("What’s your status?" with
`emoji_filled.svg`, or the status text with "Status does not clear" (20676) / "Until %@" (22684)) → Set a Status; "Set
yourself as away/active" (`svgUserStatus`) toggles; notifications (`svgNotificationsOff`): submenu "Pause notifications"
→ "30 minutes", "1 hour", "Today" (21781), "This Week" (`expiry_this_week` 6585) (Sept dropped "4 hours")
(`Modules/Features/YouMenu/Implementation/YouMenuDataTypes.swift:57-80`), or when paused "Notifications paused"
(`notifications_paused_lowercase_p` 13498, "Until %@") → "Resume" (`resume_notifications` 16646, `YouMenu.swift:343-345`;
June's value "Resume notifications"). Section 3: "Preferences".

---

## 5. Workspace switcher

On iPhone the switcher is a **left drawer** over the whole tab UI, the same on iOS 18 and 26: the app root
`RootViewControllerTabs` is a `DoublePanelViewController` whose primary is the tab bar controller and whose left panel
is `WorkspacesViewController` (`Modules/Features/Root/Implementation/LoggedIn/Compact/RootViewControllerTabs.swift:53`, `305-309`;
`Modules/Features/Root/Implementation/LoggedIn/Compact/LegacyLoggedInCompactFeature.swift:79`, `107`; both files moved from
`App/Source/` in Sept). `WorkspacesList` has no iOS 26 branch.
Not the switcher: `Modules/Features/WorkspacePicker` (channel/share picker), `AppWorkspacePicker` (slash-command sheet),
`OrganizationPicker`; `App/Source/Sidebar/TeamSwitcher` only holds a test JSON. No snapshot of the drawer exists.

### 5.1 Opening

- Tap the workspace avatar in the Home header (iOS 26 left bar button, §2.2; pre-26 tile, §2.3.4) →
  `WorkspacesListRoute(config: .init(openLeftPanel: true))` (`PrimaryNavigationHeaderService.swift:233-235`,
  `CompactRootTabDecoratorViewController.swift:234-236`). The route first dismisses all modals
  (`Modules/Integration/Navigation/Implementation/NavigationService.swift:377-389`), then
  `Modules/Features/Root/Implementation/LoggedIn/LoggedInFeature.swift:296-303` → `RootViewControllerTabs.swift:711-718`,
  `418-434` → `DoublePanelViewController.swift:389-391`.
- Swipe right anywhere on Home content (not only the edge), Home tab only, only at the tab root and not while search
  is showing (`RootViewControllerTabs.swift:469-513`, `leftPanelConfig.allowGesture = tab == .conversations` at
  `511-513`; pan on `primaryContainerView`, `DoublePanelViewController.swift:266-271`). Needs |vy/vx| < 0.6 and vx > 0
  (`navigationPanGestureSlopeThreshold` 0.6, `:121`). Progress = translation.x / screen width; completes if progress > 0.5
  or velocity > 300 pt/s (`swipeThreshold`, `:437-442`, `793-811`).
- Also: auto-open after onboarding landing `.showTeamSwitcher` (`Modules/Features/Root/Implementation/LoggedIn/Compact/RootViewControllerTabs+Onboarding.swift:32-34`);
  VoiceOver scroll-right (`RootViewControllerTabs.swift:525-529`). A three-finger horizontal swipe switches workspace
  without opening the panel (`:313-342`).

### 5.2 Presentation and dismissal

| Aspect | Value | Source |
|---|---|---|
| Mode | `.overlay`: the drawer slides over the tab UI, which does not move | `RootViewControllerTabs.swift:186-187`; `Modules/UIInfra/LegacyUI/Implementation/DoublePanel/DoublePanelView.swift:323-325` |
| Width | screen width − 60 = **333 pt** on 393; full height | `RootViewControllerTabs.swift:56`, `217` |
| Slide | leading edge −333 → 0 | `DoublePanelView.swift:168`, `323-325` |
| Motion | `UIView.animate(withDuration: 0.3, usingSpringWithDamping: 1.0, initialSpringVelocity: v)` (v from the pan, 0 on tap); no overshoot (≈ CSS 300 ms ease-out) | `DoublePanelView.swift:180-188` |
| Dim | `.grey` = black α 0.4 over the tab UI, alpha follows progress | `DoublePanelView.swift:61-70`, `188`, `207`; `RootViewControllerTabs.swift:187` |
| Status bar | hidden while open, `.fade` | `RootViewControllerTabs.swift:95-106` |
| Dismiss | tap the dimmed 60 pt strip on the right (a11y `close_workspace_panel` "Close workspace panel", `localized_strings.yaml:4096`); pan left (same 50% / 300 pt/s rule); tap any workspace, including the current one | `DoublePanelViewController.swift:273-282`, `350-362`; `WorkspacesViewController.swift:455-460` |
| Flag `workspaceSwitcherTransition` (default off) | tab UI scales to 0.97, translateY −10, translateZ −20 with perspective −1/500, corner radius 60 continuous, black backdrop | `DoublePanelView.swift:79`, `153-157`, `190-192`, `218-228`; `Modules/Data/Toggles/Definitions/ios_workspace_switcher_transition.json` |

(`WorkspacesViewController.swift` = `Modules/Features/WorkspacesList/Implementation/Workspaces List/Controller/WorkspacesViewController.swift`.)
Unified-nav flags present it as a SwiftUI sheet instead (`Modules/Features/WorkspaceRoot/Implementation/Views/WorkspaceRootView+Shared.swift:89-124`);
`openLeftPanel: false` presents it full screen (`Modules/Features/WorkspacesList/Implementation/LegacyWorkspacesListFeature.swift:36-43`). Not default.

### 5.3 Drawer layout

S = safe-area top.

| Element | Value | Source |
|---|---|---|
| Background | `core basePrimary` (`#ffffff` / `#1a1d21`; true-dark `#000000`) with `userInterfaceLevel = .elevated` (elevated `#1d1c1d` only in true-dark / high contrast) | `WorkspacesViewController.swift:211-213` |
| Corners | radius **30**, continuous, right corners only (`layerMaxXMinYCorner`, `layerMaxXMaxYCorner`), content clipped | `:219-233` |
| Shadow | black, offset (1, 2), opacity 0.12, radius 4 (≈ CSS `1px 2px 8px rgba(0,0,0,.12)`) | `:235-238` |
| Header | `HomeNavigationBar`: container top = S + 4 (min 32 from the top), leading/trailing 16, height **32**, bottom inset 8 → header height S + 44; background `basePrimary`; hairline has no color | `WorkspacesViewController.swift:86-102`; `Modules/Integration/RootComponents/Implementation/NavigationBar/HomeNavigationBar.swift:27-38`, `139-173` |
| Title | `workspaces` "Workspaces" (`localized_strings.yaml:23908`), Lato-Black 22 (max 34), `core contentPrimary`, x = 16, centered in the 32 pt container; no avatar/search/buttons | `WorkspacesViewController.swift:89-99` |
| Workspace list | from the header to the separator, full width, scrolls, reorderable, scroll indicators flash on appear | `:255-258`, `200`, `323-327` |
| Separator | 1 px (0.333 pt), `outlineTertiary` (`#5e5d60` 13% / `#797c81` 30%), full width | `:110-115`, `260-263` |
| Options list | not scrollable, 3 × 44 = 132 pt, bottom at the safe-area bottom | `:117-122`, `265-269`, `391-393` |

### 5.4 Workspace row (`SKWorkspaceEntity`, size `.extraLarge`)

Source: `Modules/Features/WorkspacesList/Implementation/Workspaces List/View Model/WorkspacesViewModel.swift:183-232`,
`Modules/UIInfra/SlackKitExtensions/Implementation/List/SKListCellPresentationObject+Workspace.swift:19-67`, `117-142`,
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/WorkspaceEntity/SKWorkspaceEntity.swift`,
`Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBaseView.swift`.
Snapshot: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKWorkspaceEntitySnapshotTests/testWorkspaceEntityExtraLarge@3x.png`
(Sept: 2358×456, a 2×2 grid, light over dark × normal / high contrast; June's was 1179×456, light over dark; yellow "Acme"
icon, "Acme" / "acme.slack.com").

- Height **76** = 10 + 56 + 10; insets top 10, left 16, bottom 10, right 16 (`SKEntityBaseView.swift:61-67`, `267`).
- Avatar 56×56 (`SKWorkspaceAvatar` `.extraLarge`, radius 14) at x 16; gap 16 to text (`SKEntityBaseView.swift:400-403`,
  `SKWorkspaceEntity.swift:290-297`); text x = **88** (measured); lines stacked with 0 spacing and centered
  (`Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityContentView.swift:52`). Measured: name cap top
  23.0 / baseline 35.7; subtitle top 43.0 / baseline 54.3.
- Name: `.bodyBlack` = Lato-Black 17 (max 53), `core contentPrimary`, 1 line (2 at accessibility sizes), tail truncation
  (`Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityPrimaryContentView.swift:111-114`, `383-390`).
- Subtitle: `.smallBody` = Lato Regular 15 (max 49), `core contentSecondary` (`#454447` / `#b9babd`, `Colors.swift:206`),
  1 line (`SKEntityContentView.swift:58-61`, `229-236`). Text = `enterpriseHost ?? host` → "acme.slack.com" or
  "<org>.enterprise.slack.com" (`SKListCellPresentationObject+Workspace.swift:117-122`). Pending sign-in rows show helper
  text instead (`Modules/Features/WorkspacesList/Implementation/Workspaces List/LegacyEphemeralWorkspaceHelper.swift:18-56`):
  "Continue to sign in" (`continue_to_sign_in_sentence_case` 4541), "Enterprise Organization" (6397), "Sign In with %@"
  (19125), "Enter your authentication code" (6332), "Invited by %@" (9433/9436), "1 member" (13753), "%d members" (13585).
- Pressed: highlight rect inset 4 left/right, radius 12 continuous, full row height, `core baseTertiary` (`#eaeaea` /
  `#212428`) (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:144-146`, `218-225`;
  `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBackgroundView.swift:42-81`); row scales to
  (h − 8)/h ≈ 0.976 with spring smooth fast 0.2 s down / smooth medium 0.4 s up
  (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Cells/SKListCollectionViewCell.swift:216-242`).
- **Current workspace**: permanently highlighted (same rect), no bounce, avatar gets the `.active` ring (3 pt
  `contentPrimary` ring, 3 pt gap: ring box = avatar outset 6, radius 14 + 6 = 20), no badge
  (`SKListCollectionViewCell.swift:185-202`, `225-226`; `SKWorkspaceAvatar.swift:307-311`, `682-697`), plus a trailing
  "…" button: `SKIconButton` `.small` 40×40, `svgEllipsisHorizontalFilled` 20 pt, `contentPrimary` (pressed
  `contentSecondary`), no backdrop, a11y "<name>, More Options" (`more_options` `localized_strings.yaml:12451`); tap opens a
  UIMenu "Invite Members" (`svgUserAdd` `user_add.svg`, only if allowed; `invite_members` 10022) and destructive "Sign Out"
  (`svgSignOut` `sign_out.svg`; `sign_out` 19128), followed by any plugin-contributed items (new) (`WorkspacesViewModel.swift:203-264`,
  `437-440`). No long-press menu on iPhone (`:128`, `204`).
- Other rows' avatar badges, precedence active > pending auth (lock) > mention count > unreads dot
  (`SKListCellPresentationObject+Workspace.swift:124-142`):
  - `.mentionCount(n)`: `SKBadge` pill in a notch at the top-right, height 18 (12 + 2×3), width max(24, text + 18), Lato
    Bold 12, "9+" above 9 (`badgeCountNumberPlus` "%@+", `localized_strings.yaml:2385`), background
    `dt_color_base_inverse_important` `#e01e5a` / `#d3305d` (`Colors.swift:116`, design-tokens `f76ac0a`; June `#b41541`), text `content_inverse_primary`
    (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Badge/SKBadge.swift:22-30`, `194-201`, `346`, `385`, `415-434`;
    `SKWorkspaceAvatar.swift:251`, `400-412`, `456-460`).
  - `.hasUnreads`: dot Ø 11.4 at (45.0, −0.4) in a notch (radius 8.3) at the top-right, `contentPrimary`
    (`SKWorkspaceAvatar.swift:253-262`, `424-429`, `475-494`). (Circular "concentric" avatars, i.e. the iOS 26 header's,
    instead center the dot on the circle's edge, §2.2.)
  - `.pendingAuthentication`: `svgLockFilled` `lock_filled.svg` (0.25w + 6 = 20 pt) at (41, −6) in a square notch
    (`:75`, `209-214`, `462-473`).
  - The top-right corner of an annotated avatar is square, except on concentric avatars (`:369-381`). Annotations are
    hidden below 28 pt (`:649-664`).

### 5.5 Option rows (`SKGenericEntity` `.small`)

`WorkspacesViewController.swift:337-379`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/GenericEntity/SKGenericEntity.swift:340`, `456-463`;
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/OrnamentBox/SKOrnamentBox.swift:279-290`, `618-634`.
Height 44 (padding 16 left/right, 10 top/bottom); 24×24 ornament box with no fill holding a 20 pt icon tinted
`contentSecondary`; text at x = 52 (gap 12); `.body` Lato Regular 17, not bold, `contentPrimary`, 1 line. Pressed:
same highlight and bounce as §5.4. Snapshot analog:
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmall@3x.png`.

| Row | Icon | Tap |
|---|---|---|
| `add_a_workspace` "Add a Workspace" (`localized_strings.yaml:692`) | `svgPlus` `plus.svg`; with pending invites a trailing `svgStatusMemberFilled` dot in `highlight1.content` (`#1264a3` / `#2ba5ce`), a11y "Add a Workspace. Invites available" (`invites_available` 10186) | Add Workspaces flow (`Modules/Features/WorkspacesList/Implementation/Workspaces List/Navigator/WorkspaceViewNavigator.swift:78-95`) |
| `preferences` "Preferences" (14979) | `svgSettings` `settings.svg` | `SettingsRoute()` (`WorkspacesViewController.swift:497-501`) |
| `help` "Help" (7873) | `svgHelp` `help.svg` | help center in `SFSafariViewController` (`:503-513`) |

### 5.6 Behavior

- Tap another workspace: selection haptic, drawer closes (animated), then the account switches
  (`WorkspacesViewController.swift:409`, `475-482`; GovSlack speedbump may appear first, `462-469`). The new workspace UI
  is inserted behind the old one and faded 0 → 1 over 0.2 s ease-in-out, then the old one is removed
  (`Modules/UIInfra/Architecture/Implementation/Helpers/ContainerViewController.swift:44-75`,
  `Modules/Features/Root/Implementation/RootFeature.swift:252-264`).
- Pending/expired rows: tap → sign-in (`:401-405`); long-press → action sheet with the workspace name, destructive
  "Remove %@" (`remove_pending_auth_workspace` 16281) and "Cancel" (3202) (`:413-441`).
- Reorder: long-press and drag (system lift); saves order (`WorkspacesViewModel.swift:320-324`). No swipe actions.
- Unread indicator for other workspaces on the Home header avatar: iOS 26 dot on the avatar (§2.2), pre-26 edge half-dot
  (§2.3.4). Condition: any other workspace with badge count > 0 or unreads
  (`PrimaryNavigationHeaderService.swift:318-326`, `HomeViewPresentable.swift:163-171`).

### 5.7 Workspace avatar sizes (`SKWorkspaceAvatar.swift:600-625`)

Corner radius = min(20, 0.25 × side) (`:145-151`), or side/2 when concentric (iOS 26 header). The `Size.cornerRadius`
table (`:627-646`) is not used by the mask. Sept adds `.toolbarItem` (32 pt), used only for the iOS 27-SDK edge-to-edge
header avatar (`:596`, `614-619`).

| Size | T | VS | S | SP | M | L | XL | J |
|---|---|---|---|---|---|---|---|---|
| side (pt) | 16 | 20 | 24 | 28 | 32 | 36 | 56 | 120 |
| radius (pt) | 4 | 5 | 6 | 7 (14 concentric) | 8 | 9 | 14 | 20 |

Initials fallback: first letters of the first two words, uppercased ("Test Workspace" → "TW")
(`Modules/UIInfra/SlackKit/Implementation/Helpers/Workspaces/WorkspaceAvatarTitleHelpers.swift:16-28`), Lato-Black 22 at
every size, `contentPrimary`, on the placeholder `baseTertiary` (`#eaeaea` / `#212428`). Snapshots:
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKWorkspaceAvatarSnapshotTests/` (2×2 grids in Sept):
`testWorkspaceAvatarStandardExtraLarge`, `…NoneImageSourceExtraLarge` ("TW"), `…MentionCountExtraLarge` ("9+" pill),
`…HasUnreadsJumbo`, `…PendingAuthenticationExtraLarge`, `…ActiveLarge` (ring), `…GovVariantExtraLarge`; new in Sept
`…HasUnreadsConcentricExtraLarge` and `…HasUnreadsConcentricToolbarItem` (the round avatar with the dot centered on its
edge at 45°, §2.2).

---

## 6. Status bar, safe areas, snapshot device

### 6.1 Status bar style

- Chain: app root `RootViewControllerTabs` → left panel (workspace switcher) if open, else the tab bar controller
  (`Modules/Features/Root/Implementation/LoggedIn/Compact/RootViewControllerTabs.swift:108-114`) → selected tab (`CompactRootTabBarController.swift:395-397`)
  → double-panel tab: open conversation panel, else the header container (`DoublePanelViewController.swift:238-248`).
- Header container (`CompactRootTabDecoratorViewController.swift:203-215`): custom (pre-26) header →
  **`.lightContent` if theme brightness > 3, else `.default`**; iOS 26 standard header → `.default`. (It also has a
  brightness rule for the Search tab, but see the next point.)
- `RootTabViewController` (used with `rootNavigationUpdates` and always for Search/Slackbot) does not forward status bar
  style, so those tabs get `.default` (no override in `Modules/Features/CompactRoot/Implementation/RootTabViewController.swift`).
  Net result on iOS 26: `.default` on every root tab.
- `.default` = dark glyphs in light mode, light glyphs in dark mode (UIKit).
- Status bar is **hidden** while the workspace switcher (left panel) is open on iPhone; changes animate with `.fade`
  (`RootViewControllerTabs.swift:95-106`).

### 6.2 Safe areas

Slack does not set the device safe area. It positions against it: pre-26 header top line at safe top + 4 (min 32 from the
screen top), inline search bar at safe top − 4 (min 28) (`CompactRootTabSearchHeader.swift:32-37`); tab content view
top at safe top + 4 (min 32) (`CompactRootTabDecoratorViewController.swift:55-58`, `353-361`). In the header snapshots the
resolved safe-area top is 54 pt. On iOS 26 the gradient decoration covers everything above the list's top inset.

### 6.3 Snapshot test device and defaults

- Device: must be `iPhone15,2` = "iPhone 14 Pro" or the test fails (`Modules/UIInfra/SnapshotTestFoundations/Implementation/SnapshotTestCase.swift:69-71`;
  `.bazelrc:51` `test --ios_simulator_device="iPhone 14 Pro"`). 393×852 pt, @3x → 1179×2556 px.
- iOS version: the major version picks the folder `Snapshots/iOS_<major>` (`SnapshotTestCase.swift:39-60`, `85-87`).
  Sept has `iOS_18`, `iOS_26` and (new) `iOS_27` baselines (1,889 `iOS_27` PNGs in 40 modules, pulled in this checkout
  since); the SDK guard now requires the iOS 27 SDK for iOS 27 runs (`:72-76`; June: iOS 26). iOS 27 renders glass
  offscreen, so some `iOS_27` PNGs draw it; production is iOS 26 (the device, §2.2), so they're secondary evidence only.
- Appearance: light unless a test overrides it. `ComponentSnapshotTestCase` now renders every case four times, a 2×2
  grid: rows light / dark, columns normal / high contrast (June: light over dark, two cells), each in a 393×852 window
  with **zero** safe-area insets (`Modules/UIInfra/SnapshotTestFoundations/Implementation/ComponentSnapshotTestCase.swift:11-24`,
  `196-226`). Animations are disabled (`:71`).
- Default component width 393, tolerance 0.34 pt for height checks, per-pixel 0.02 / overall 0.05
  (`Modules/UIInfra/SnapshotTestFoundations/Implementation/SnapshotTestCase+Helpers.swift:14-32`).

---

## 7. Gaps

- No snapshot of the in-app tab bar or the iOS 26 root header; iOS 26 tab bar geometry (capsule size, insets, selection
  pill, separate Search circle size, label visibility on the Search circle) is UIKit-drawn and not in Slack's source
  (looked in `Modules/Features/CompactRoot`, `Modules/UIInfra/SlackKit`, `Modules/UIInfra/NavigationController`,
  the `Snapshots/iOS_26` folders). iOS 26 nav bar metrics above come from June's component snapshots (54 pt bar, 44 pt
  glass controls) and the device screenshots, not from code; Sept's iOS 26 bar-button baselines no longer draw glass.
- Whether UIKit shows the `basePrimary` tab bar color and the hairline inside the iOS 26 glass bar: not
  verifiable from source.
- Real-device safe-area top (snapshots resolve 54 pt; Slack does not set it).
- No snapshots of: the conversation title pill, the workspace drawer, the More page, the You screen/menu. iOS 26
  huddle-button baselines are blank (glass is not rendered in snapshots).
- Tab bar over conversations: code never hides it (§3.6); confirm on a device.
- Mode C (iOS 26 + `rootNavigationUpdates`) system back button title/color: unverified. Production value of that flag
  and of `slackbotBottomTab`, `youMenu`, `historyMenu`, `slackbotMainHeaderEntrypoints`, `unifiedNavArch`:
  server-controlled; the Sept device screenshots match all of them off.
- The SwiftUI unified shell (§0.1) is only summarized here (its header and tab layouts are not specced).
- `window_background_gradients` default is ambiguous: the live publisher falls back to `false`, the initial value to
  `true` (`ThemeService.swift:161-163`, `292`).
- 28 pt workspace avatar with a 44 pt-tall stack and 4 pt margins may be stretched by Auto Layout; initials (Lato Black
  22) inside 28 pt not verified.
- You status pill text font/color are not set explicitly (`UserStatusView.swift:40` declares `.body` but never applies it).
- Slackbot tab root screen (iOS 26 flag) and pushed destinations (Settings, Edit Profile, Files, etc.) are not covered.

## 8. Most useful reference PNGs

Repo-relative in the latest checkout (`slack-objc-latest`); each exists there with its LFS object pulled (`iOS_26`),
except the `iOS_18` ones, which are June baselines (LFS pointers in the latest checkout).

1. `Modules/Features/CompactRoot/Snapshots/iOS_26/CompactRootFeatureTests.CompactRootTabSearchHeaderSnapshotTests/testDefaultHeader@3x.png`: pre-iOS 26 root header, all elements (§2.3; Sept's is drawn 26 pt higher).
2. `Modules/Features/CompactRoot/Snapshots/iOS_26/CompactRootFeatureTests.CompactRootTabSearchHeaderSnapshotTests/testHeaderBrightness1@3x.png` … `6`: theme gradient and text color per brightness.
3. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKBarButtonItemTests/testAllTogether@3x.png`: in June's baseline the iOS 26 glass back circle + shared capsule geometry (§3.5); Sept's draws no glass (§3.3).
4. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKNavigationTitleSnapshotTests/testInNavigationBar_shortTitle@3x.png` (and the June `iOS_18` twin): a pushed screen's bar with back caret, title, right items.
5. `Modules/Integration/HeaderHelper/Snapshots/iOS_18/HeaderHelperServiceTests.HeaderHelperBarButtonItemTests/testActiveWithMembers@3x.png` (+ the other three; June baselines): huddle button states.
6. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKWorkspaceEntitySnapshotTests/testWorkspaceEntityExtraLarge@3x.png`: workspace switcher row (2×2 grid in Sept).
7. `Modules/UIInfra/MoreTabUI/Snapshots/iOS_26/MoreTabUITests.SearchNavigationHeaderViewSnapshotTests/testSubtitle@3x.png`: header of pages pushed from More.
8. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmall@3x.png`: 44 pt icon row used by You and the switcher options (2×2 grid in Sept).
