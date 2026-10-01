# Search, Slackbot / AI, Huddles, Files: iOS spec

**Updated to slack-objc main @ 14b3cbaf (2026-09-30)**, design tokens `f76ac0a`. First written against `cd22922`
(June 2026) and tokens `df1f228`; every citation now points at the September checkout. What changed since June:

- **Tab bar (§0)**: Search is appended last, after More or Slackbot (the same bar on screen). The Slackbot tab needs the
  `ios_slackbot_bottom_tab` toggle **and** Slackbot AI to be visible, and it gets the unread "●" badge. The floating player
  sits 20 pt from the edges on Liquid Glass. Production still shows Home, DMs, Activity, More + Search.
- **Search (§1)**: June's flagged zero state is the only one: "Recent searches" (3) and "Recently visited places" (30)
  with " · info" trailing text and `surfacePrimary` ornament boxes. There's no "Go ahead, dig in" any more.
  Autocomplete echo rows are always one label. One row always carries the → arrow, and Return opens it. Ghost text
  ("… – Search" / "… – Open") is always on. Leaving the tab for 30 s resets the search. The filter bar fades as it
  slides. Message results fold to 3 lines. The feedback pill sits on the trailing edge. Slackbot hand-offs and a
  SwiftUI QuickSearch exist behind toggles.
- **Slackbot (§2)**: the tab is its own page now: greeting, "Recommended for you" cards, a glowing composer, a More-actions
  menu and your avatar. The DM's Discover/Create/Find/Brainstorm prompt rail is gone. An AI disclaimer context bar was
  added, Share replaces Copy in the answer footer, and New chat also shows on the landing page. The channel header's
  Slackbot button always opens a sheet. The composer's expanded toolbar is just "+" (Skills and MCP are gone, two-way voice
  is new). Plan and task cards changed their margins and title style. The Sources, tool timeline, History and Skills
  sheets get a close button.
- **Huddles (§3)**: the header button is SlackKit's `SKHuddleBarButtonView`, a 32 pt badge with no circle on Liquid
  Glass. The preview is always a native self-sized sheet, and frontline workers get "Copy huddle link". The call sheet
  is `.formSheet`, and a thread panel, recording and reactji explosions are flagged. The close button is in a dark
  glass capsule. The pin is 8 pt from the corner, and there's a new "Declined" chip. The floating player is a glass
  capsule. Huddle message text uses `contentSecondary`.
- **Files (§4)**: More → Files always opens Docs, and FilesBrowser is a set of flagged plugins inside it. With the
  Slackbot tab, a Home tile reaches Files, and Search reaches "Recent Files". Docs has an inline detail title. Frontline
  workers get no create buttons. Canvas subtitles use `contentSecondary`, starred files show the star, and Delete has its
  own menu section.
- **Colors**: tokens `f76ac0a` add high-contrast values. Dark `base_inverse_highlight_1` is #0A77A7, `_2` is #177E56
  and `base_inverse_important` is #D3305D. SKButton `.primary` and `.danger` now fill with those tokens. Production's
  theme is the Aubergine preset (jade presence); the code's fallback is still `defaultAubergine`.
- **Snapshots**: most of the PNGs cited here were re-recorded. Component ones are now a 2 × 2 grid (light / dark ×
  normal / high contrast). Pixels changed only where noted: the header snapshots sit higher, CanvasSynthetic and
  ListRecord moved 54 pt, and the pinned participant tile changed.

Scope: the iOS 26 tab-bar destinations other than Home / DMs / Activity (Search, Slackbot, More → Files), plus
huddles. Code paths are relative to the iOS repo root, `slack-objc-latest` (github.com/tinyspeck/slack-objc `main` @
`14b3cbaf`, 2026-09-30); a few passages still quote the June snapshot (`cd22922`, the `slack-objc-main` folders) and
say so. Snapshot PNGs are the iOS_26 baselines in the same checkout (Git LFS; paths below are relative to its root).
Colors come from `output/ios/Colors.swift` of the design tokens the app pins, now `f76ac0a`
(`internal.MODULE.bazel:209`, vendored as `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift`, cited as
`Colors.swift:LINE`; June pinned `df1f228`). Values are light / dark. Since `f76ac0a` every token also has
light/dark high-contrast values (`theme-colors.md`).

Shared building blocks used by many rows below (cite these once, reuse everywhere):

| Thing | Value | Source |
|---|---|---|
| `Spacing` | none 0, small 4, medium 8, large 12, xLarge 16, xxLarge 24 | `Modules/Data/DataModels/Implementation/Layout/Spacing.swift:19-50` |
| Entity row (SKGenericEntity / SKMemberEntity / SKChannelEntity …) | row margins top 10, left 16, right 16, bottom 10; height = max(ornament, text, accessory) + 20 | `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBaseView.swift:61-67, 267` |
| Entity ornament → text gap | 12 (`HorizontalSpacing.standard`); accessory gap 8 | `SKEntityBaseView.swift:400-408` |
| Entity size `.small` | ornament 24×24 (image radius 4); primary text `.body` (Lato 17 regular) | `.../GenericEntity/SKGenericEntity.swift:451-485`, `SKEntityOrnamentView.swift:397-427`, `SKEntityContentView.swift:360-367` |
| Entity size `.medium` | ornament 36×36 (image radius 6); primary text `.body` | same |
| Entity secondary text | `.caption` (13 regular), `contentSecondary` | `SKEntityContentView.swift:57-63` |
| SKOrnamentBox | side 16/20/24/32/36/56/120 for tiny…jumbo; radius = 25% of side (max 20); sizes ≤ small have a clear background unless `forceBackgroundStyle`; medium+ default bg `surfacePrimary` | `.../OrnamentBox/SKOrnamentBox.swift:279-289, 609-667`; `SlackKitFoundations/.../UIUtilities.swift:94-99` |
| SKIcon | intrinsic 20×20, default tint `contentPrimary`; `scaleFactor` scales the glyph inside the 20pt box | `.../CoreComponents/Icon/SKIcon.swift:27, 93-99, 159` |
| SKButton `.small` | font `.captionBold` (13 bold), padding 7 top/bottom × 9 left/right, radius 10, icon 20, icon gap 4, 1pt border when a border color is set, press = scale 0.96 + bg darkened 20% | `.../Button/SKButton+Types.swift:269-270, 300-301, 325-326, 352-353, 374-375`; `SKButton+PresentationObject.swift:220-221`; `SKButton.swift:45-47, 274` |
| SKButton `.medium` | `.smallBodyBold` (15 bold), padding 10 × 12, radius 12, icon gap 6 | same files, lines 271-272, 302-303, 327-328, 354-355; `SKButton+PresentationObject.swift:222-223` |
| SKButton fills | `.primary` = `highlight2.baseInverse` (#007A5A / #177E56), `.danger` = `important.baseInverse` (#E01E5A / #D3305D), white text (June: the static `sk_lilypad_green` #007A5A and `sk_raspberry_red` #E01E5A in both modes) | `SKButton+Types.swift:160-169, 205-212` |
| Spring animation default | `.smooth` (damping 1.0) × `.medium` = 0.4 s; `.fast` = 0.2 s; `.bouncy` damping 0.7 (0.43 s medium) | `SlackKitFoundations/.../UIView+SpringAnimation.swift:16-35, 64-129` |
| Press "bounce mode" | scale down: smooth/fast 0.2 s; scale up: smooth/medium 0.4 s; skipped under Reduce Motion | `SlackKitFoundations/.../UIView+BounceMode.swift:14-35` |

Core colors used throughout (from `CorePrimaryColorSet`, `Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:119-158`):

| Core property | Token | Light | Dark |
|---|---|---|---|
| basePrimary | `dt_color_base_primary` (Colors.swift:42) | #FFFFFF | #1A1D21 (trueDark #000000) |
| baseSecondary | `dt_color_base_secondary` (:50) | #F8F8F8 | #1A1D21 |
| baseTertiary | `dt_color_base_tertiary` (:56) | #EAEAEA | #212428 |
| baseModal | `dt_color_base_modal` (:86) | #1D1C1D @ 70% | #101214 @ 60% |
| contentPrimary | `dt_color_content_primary` (:200) | #1D1C1D | #F8F8F8 |
| contentSecondary | `dt_color_content_secondary` (:206) | #454447 | #B9BABD |
| contentTertiary | `dt_color_content_tertiary` (:212) | #5E5D60 | #9A9B9E |
| contentInversePrimary | `dt_color_content_inverse_primary` (:248) | #FFFFFF | #F8F8F8 |
| surfacePrimary | `dt_color_surface_primary` (:134) | #1D1C1D @ 6% (0x0f) | #F8F8F8 @ 6% |
| surfaceSecondary | `dt_color_surface_secondary` (:140) | #1D1C1D @ 25% | #F8F8F8 @ 25% |
| outlinePrimary | `dt_color_outline_primary` (:290) | #7C7A7F | #797C81 |
| outlineSecondary | `dt_color_outline_secondary` (:296) | #5E5D60 @ 45% | #797C81 @ 50% |
| outlineTertiary | `dt_color_outline_tertiary` (:302) | #5E5D60 @ 13% (≈ #EAEAEA on white; measured #EAEAEA in the SearchFilters PNG) | #797C81 @ 30% |
| containerPrimary | `dt_color_container_primary` (:188) | #FFFFFF | #212428 |
| highlight1.baseInverse | `dt_color_base_inverse_highlight_1` (:98) | #1264A3 | #0A77A7 (June #004D76) |
| highlight1.content | `dt_color_content_highlight_1` (:218) | #1264A3 | #2BA5CE |
| highlight1.base | `dt_color_base_highlight_1` (:62) | #E3F8FF | #001A2D |
| highlight1.surface | `dt_color_surface_highlight_1` (:146) | #36C5F0 @ 13% | #036696 @ 25% |

Theme colors (`DefaultThemeColorSet`, `Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift`) are built
from palette ramps (full rules, high-contrast values and the new `outlinePrimary` role: `theme-colors.md`). Two
aubergine themes matter here. The code's fallback `ColorSet.defaultAubergine` (primary = highlight1 = highlight2 =
important = aubergine, brightness 5, `ColorSet.swift:19-25, 59-60`) is what every repo snapshot uses. Production
(the Sept 2026 device screenshots: jade presence, header gradient) is the **Aubergine preset**, aubergine / aubergine /
**jade** / aubergine at **brightness 6** (`Modules/Features/ThemePicker/Implementation/Presets.swift:40`), and it's the
clone's default theme (`theme-colors.md`). Both have `isSidebarInverted` **true** (brightness ≥ 4, `ColorSet.swift:38`).
Aubergine ramp (`Colors.swift:1634-1705`, each step has its own light/dark value): _0 #F9EDFF/#200221, _5 #F6E4FF/#300C31,
_10 #F4DAFF/#431349, _20 #EABDFB/#5F2565, _30 #DF9FF4/#7D3986, _40 #D389E7/#9652A2, _50 #C474D3/#B26EC3,
_60 #A350AF/#BC80CE, _70 #83388A/#CFA1DE, _80 #611F69/#D8BAE1, _90 #4A154B/#E3CEEB, _100 #39063A/#EFE1F5.
Resolved (defaultAubergine; the preset where it differs):

| Theme property | Derivation (line) | Light | Dark |
|---|---|---|---|
| backgroundGradient1 (header gradient top) | b5 + inverted → light `_80`, dark `_10` (:204); b6 → light `_90` (:205) | #611F69 (preset #4A154B) | #431349 |
| backgroundGradient2 (header gradient bottom) | b5 → light highlight1 `_90`, dark `_0` (:221); b6 → `_100` (:222) | #4A154B (preset #39063A) | #200221 |
| contentInversePrimary (text on header) | inverted → white (:166-168) | #FFFFFF | #FFFFFF |
| contentInverseSecondary | light `_0`@80%, dark `_90`@90% (:169-172) | #F9EDFF @ 80% | #E3CEEB @ 90% |
| contentInverseTertiary | light `_0`@70%, dark `_90`@70% (:174-177) | #F9EDFF @ 70% | #E3CEEB @ 70% |
| surfaceInversePrimary | light `_0`@25%, dark `_100`@25% (:147-149) | #F9EDFF @ 25% | #EFE1F5 @ 25% |
| searchBarBackground | surfaceInversePrimary with alpha **replaced** by 0.1875 (`Modules/Integration/ThemesIntegration/Interface/ThemeService+ArbitraryConstants.swift:13-15`) | #F9EDFF @ 18.75% | #EFE1F5 @ 18.75% |
| baseInverseSecondaryNonSidebar (selected tab tint, iOS 26) | light `_80`, dark `_70` (:91) | #611F69 | #CFA1DE |
| baseInverseImportant (tab badge dot) | light important `_70`, dark `_40` (:125) | #83388A | #9652A2 |
| baseInverseHighlight2 (presence on lists) | highlight2 `_50` / `_60` (:113) | #C474D3 (preset jade #20A271) | #B26EC3 (preset #3DAA7C) |
| baseHighlight2 (presence on the themed bar) | inverted → highlight2 `_20`, dark `_60` (:110-112) | #EABDFB (preset #74DBAF) | #B26EC3 (preset #3DAA7C) |
| outlinePrimary (new in September) | `_100`@13% / `_100`@25% (:179-183) | #39063A @ 13% | #EFE1F5 @ 25% |

The primary navigation header gradient is `[backgroundGradient1, backgroundGradient2]` (or just gradient1 if the user
turned gradients off), style `.header` (`Modules/Integration/ThemesIntegration/Interface/ThemeServiceInterface.swift:35-40`).

---

## 0. Where these screens live in the iOS 26 tab bar

- **Tabs on iOS 26 (liquid glass)**: `[Home, DMs, Activity]`, then `More` while `.slackbotBottomTab` is off, or
  `Slackbot` when it's on **and** Slackbot AI is visible to the user (neither when it's on and Slackbot isn't), then
  `Search` last (`Modules/Features/CompactRoot/Implementation/TabBar/CompactRootTabBarController.swift:483-502`). The
  flag is now a plain toggle (`ios_slackbot_bottom_tab`, default false, `Modules/Data/Toggles/Definitions/ios_slackbot_bottom_tab.json`)
  combined with `aiUserPermissionsService.featureVisibilityPublisher(forFeature: .slackbot)`, and the tabs are rebuilt
  whenever either changes; a selected tab that disappears falls back to Home (:699-706, :499-502). June read the flag
  from the iOS 26 rollout manager and listed `[Home, DMs, Activity, Search] + Slackbot|More`; UIKit drew the same bar
  (Search is the separate trailing circle either way). Production (device screenshots, Sept 2026): Home, DMs,
  Activity, More + Search. There is **no Files tab on iOS 26**; Files/Docs is a tab only on the pre-26 layout
  (`[Home, DMs, Activity, Docs|Sales|Agentforce]` + More (if overflow tabs exist) or Slackbot, :503-526). Where Files
  lives on iOS 26: see §4.1.
- **Search tab item**: `UITabBarItem(tabBarSystemItem: .search)` (system title "Search", placed by UIKit as the separate
  trailing button of the glass bar; :1142-1166 assumes the last tab-bar child is the search button). Image =
  `svgSearchFilled` (`search_filled.svg`, SKIconManifest.swift:4147) at 25×25 for both states; selected image draws it
  on a circle with 12pt padding on each side, background `searchTabSelectedBackgroundColor` = surfaceSecondary with
  alpha replaced → **#1D1C1D @ 6.5% light / #F8F8F8 @ 12.5% dark** (:267-289, :1189-1194); on iOS 27 the selected image
  is the plain glyph, no circle (:274-275, new in September). Large-content icon `svgSearch`.
- **Slackbot tab item**: title `CompactRootTab.slackbot.abbreviatedTitle` = `R.strings.slackbot_user` = "Slackbot"
  (`Modules/Integration/SlackLegacyModularization/Interface/Navigation/HomeTab+Info.swift:23-35`, `localized_strings.yaml:20262`), image
  `svgSlackbotColor` (`slackbot_color.svg`, SKIconManifest.swift:4203) 25×25, rendered `.alwaysOriginal` (full-color,
  not tinted) for both states (`CompactRootTabBarController.swift:224-231`). New in September: an unread dot, the
  same "●" badge as the other tabs, a11y value "Unread messages", driven by `homeViewPresentable.slackbotBadgingShouldUpdate`
  and re-applied when the tab is added (:629-631, :788-807, :529).
- **More tab item**: `svgEllipsisHorizontalFilled` (`ellipsis_horizontal_filled.svg`, :3863) both states, title "More"
  (`yaml:12436`) (:205-215).
- **Files tab item (pre-26 only)**: `svgCanvasBrowser` / `svgCanvasBrowserFilled` (`canvas_browser.svg` /
  `canvas_browser_filled.svg`, SKIconManifest.swift:3773 / :3772), title "Files" (`yaml:7101`) (:233-243).
- **Tab label type/colors**: stacked: Lato bold 11 normal / Lato black 11 selected; inline: 11.5 (:69-72). Normal text
  and icon = core `contentTertiary` (#5E5D60 / #9A9B9E); selected on iOS 26 = theme `baseInverseSecondaryNonSidebar`
  (#611F69 / #CFA1DE default aubergine), pre-26 = `contentPrimary` (:582-605). Unread badge is the text "●" in
  system font 9pt, colored theme `baseInverseImportant`, on a clear badge background (:74-78, :586-601).
- **Long-press anywhere on the tab bar** (0.5 s, light haptic) opens the Slackbot voice assistant if the user has
  `.slackbotVoice`, else the legacy AI assistant if `.conversationalAiAssistant` (:464-481). See §2.
- **Reselecting the Search tab** pops the Search navigation stack back to its root (:890-896); reselecting any tab
  scrolls to top when `.rootNavigationUpdates` is on (:879-883).
- **Minimized huddle / floating player** is added by the tab bar controller, pinned to the tab bar's top edge,
  **20 pt** from each safe-area edge on Liquid Glass, 12 pt (`Spacing.large`) before iOS 26 (:532-554; June: 12 pt
  always). See §3.9.

---

## 1. Search

### 1.1 iOS 26 Search tab (screen structure)

**Source**: tab factory `Modules/Features/CompactRoot/Implementation/CompactRootFeature+Dependencies.swift:205-212`
(`RootTabViewController` wrapping `SearchFeature`); `Modules/Features/Search/Implementation/SearchViewController.swift`,
`SearchBarCoordinator.swift`, `SearchInteractor.swift`; content is `FindFeature` in mode `.newSearch`
(`Modules/Features/Search/Implementation/SearchFeature+Dependencies.swift:91-104`: `.quickSearch` instead when the
surface is a sheet; `Modules/Features/Find/Implementation/Container/FindFeatureComponent+Dependencies.swift:136-142, 178-197`:
`.standard`, `.newSearch` and `.quickSearch` get the new FindFeature), view controller
`Modules/Features/Find/Implementation/Container/FindViewController.swift`.

**New since June, not the production Search tab**: a SwiftUI search for the "unified" navigation architecture
(`QuickSearchFeature`, `QuickSearchView`, `SearchView`, `SearchResultsPageView`, `SearchFeatureSwiftUI` in
`Modules/Features/Search/Implementation/`; the unified root's Search tab is `QuickSearchFeatureConfig(surface: .tab)`,
`Modules/Features/WorkspaceRoot/Implementation/WorkspaceRootPresenter.swift:176-189`). It only runs with the
`ios_unified_nav_arch` / `ios_unified_nav_arch_single_stack` toggles (default false) or the internal Radical
Simplification opt-in (`Modules/Data/Toggles/Interface/NavigationArchitectureVariant.swift:27-48`); the legacy root
and this tab are what ships. Under unified nav the zero state shows collapsed recent searches and recent files instead
of §1.2's Recents (`SearchContentFeature+Dependencies.swift:64-67`). Not specced further.

**Snapshots**: none exist for the iOS 26 Search tab, Find or SearchContent (no `Snapshots/` folders in `Search`, `Find`,
`SimpleSearch`, `TokenizedSearch`, `FindInChannel`, `AiSearch`). Component snapshots are listed per element below.

Top-to-bottom layout:

1. **Header gradient** (`SKGradientView`) from the view's top to the safe-area top (status-bar area), configured with
   `themeWrapper.primaryNavigationHeaderStyle` (gradient1 → gradient2 above) (`SearchViewController.swift:19-23, 120-128, 186-188`;
   `SearchPresenter.swift:17-31`).
2. **Navigation bar** (primary navigation header): title "Search" (`R.strings.search`, `yaml:17029`) in `.title`
   (Lato black 22), its Dynamic Type capped at that size (`PrimaryNavigationHeaderService.swift:77`, new), color theme
   `contentInversePrimary` (#FFFFFF default), leading-aligned with 8pt inset; right bar buttons `[user avatar]`, or
   `[Slackbot, user avatar]` in screen order when Slackbot is visible and `.slackbotMainHeaderEntrypoints` is on
   (`ios_slackbot_main_header_entrypoints`, default false; off in production); no left buttons; no pull-to-smile, no
   loading bar (`SearchInteractor.swift:96-108`; renderer
   `Modules/Features/Handlers/PrimaryNavigationHeader/Implementation/PrimaryNavigationHeaderService.swift:452-466, 520-537`).
   September's arrays read leading-to-trailing (June's `[user, .slackbot]` was right-to-left: the same bar), and the
   separator now follows the Slackbot button so it gets its own glass container (:520-523; June put it before).
   User avatar: `SKMemberAvatar` size `.smallPlus`, rounded, concentric on iOS 26, with status emoji; tap opens the
   You menu, now unconditionally (June needed `.youMenu`) (`PrimaryNavigationHeaderService.swift:672-727`). Its
   presence uses the inverted (themed-bar) colors unless the Radical Simplification header is on (:682-689). Alone in
   its container and without a status, it's drawn edge to edge (no bar-button padding, a 44 pt square glass
   container) only with the iOS 27 SDK on iOS 27; otherwise it sits in UIKit's default 52 × 44 container
   (:548-561, :586-598, :712-724).
3. **Search field**: the system `UISearchController` installed as `navigationItem.searchController`,
   `hidesSearchBarWhenScrolling = false` (always visible), `definesPresentationContext = true`
   (`SearchViewController.swift:130-144`). Slack does not set `searchBarPlacement`; placement/metrics/glass are UIKit's
   iOS 26 defaults (not determinable from source; no snapshot). Config (`SearchBarCoordinator.swift:89-111`):
   placeholder "Search" (`R.strings.search`), autocapitalization off, `obscuresBackgroundDuringPresentation = false`,
   `hidesNavigationBarDuringPresentation = false`; typed text font `UIFont.body` (Lato 17) in `contentPrimary`, tail
   truncation, and a clear background so typed text never inherits a mention's fill (:360-376). System Cancel button →
   `exitSearchToPreviousTab` (returns the user to the tab they came from)
   (`SearchViewController.swift:154-155`, `SearchInteractor.swift:89-90`, `SearchFeature.swift:104-110`).
4. **Filter bar** (hidden until a query is run; §1.4) overlapping the top of the content.
5. **Content list** (`MKMessagesAndEntitiesList`, keyboard dismiss on drag, clear background) pinned to all edges
   (`Find/Implementation/SearchContent/SearchContentViewController.swift:12-27`); in `.newSearch` (and `.quickSearch`)
   the search bar is the native one and the list starts at the top of the Find view (`FindViewController.swift:727-733`).
   Screen background = core `basePrimary` (#FFFFFF / #1A1D21) (`SearchViewController.swift:61`; Find `newSearchTheme`
   uses a solid `basePrimary` header background, `Find/Implementation/Themes/DefaultFindThemeProvider.swift:79-80, 116-140`).
   With the filter bar hidden the list reserves an 8pt top (`Spacing.medium`), with it 58 pt, as a top safe-area
   reservation now rather than a content inset (`FindViewController.swift:1191-1219`).

No FAB, no pull-to-refresh/pull-to-search, no Home-style header on this tab (`SearchFeature.swift:112-124`).

**Behavior**
- Switching to the tab (or reselecting it) focuses the field and raises the keyboard, when the Search screen itself is
  on top of the tab's stack (`SearchViewController.swift:84-91, 195-200`; `SearchBarCoordinator.swift:139-144`;
  `SearchFeature.swift:144-155, 172-174`).
- Leaving the tab resigns the keyboard (`SearchViewController.swift:93-98`) and starts a **30 s timer**: come back
  before it fires and everything is as you left it; after it, the Search stack is reset to its root, the field is
  cleared and the search session ends, so the next visit starts at the zero state (`SearchFeature.swift:25-27, 156-170`).
  June gated the timer behind `isResetTimerEnabled` (the `ios_liquid_glass_search_timer` rollout, now deleted).
- Compact vertical size class (landscape): nav bar and header gradient hidden (`SearchViewController.swift:202-209`).
- Content state machine (`Find/Interface/SearchContent/SearchContentState.swift:13-28`): **zeroState** (empty query) →
  **autocomplete(query)** (typing) → **searchResults(query)** (Return pressed / suggestion tapped).
- Return key → `didPressGo(forceSearch: false)` (`SearchBarCoordinator.swift:113-120`): Find hands it to the content
  (`FindViewController.swift:1336-1343`), which opens the first autocomplete result when the intent model promoted it,
  asks Slackbot when the Ask Slackbot row leads, and otherwise runs the search (`SearchContentAutocompletePlugin.swift:222-244`).
  That's the row with the arrow (§1.3). June ran the search directly under VoiceOver.
- Typing `@` / `#` (or `from:`, `in:`, `with:`) opens the user/channel autocomplete popover; picking one inserts a
  mention styled with `highlight1.content` text (#1264A3 / #2BA5CE) on `sk_frosty_blue` background
  (`sk_sky_blue` #1D9BD1 @ 10%, `Modules/Data/Color/Implementation/SKLegacyColors.swift:232, 252`) in `.body`; text
  outside mentions is reset to `contentPrimary` on clear (`SearchBarCoordinator.swift:215-237, 241-265`). Backspace
  into a mention shortens/removes it as a unit (:182-196).
- **Ghost text** while typing: the content sends "<query> – Search" (`search`, `yaml:17029`), "<query> – Ask" when Ask
  Slackbot leads, or, for an intent-promoted top result, its title from where the query matches + " – Open"
  (`open_title`, `yaml:14112`) (`Find/.../Plugins/Autocomplete/SearchContentAutocompletePlugin.swift:93, 100-115`). The
  field draws only the part after what's typed, when the ghost starts with the typed text (case- and
  diacritic-insensitive), right after the typed text in the field's font at regular weight, `contentTertiary`, clipped
  to the field (`SearchBarCoordinator.swift:402-461`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TextField/GhostTextHelpers.swift:15-19, 79-87`).
  Hidden under VoiceOver. Now always set up (:89-111); June needed the `.searchDynamicNavIntentModel` flag, which is
  gone.
- **Leading icon** of the field changes with the top suggestion: user → 20pt-ish member avatar `.verySmall` with
  presence; channel → `svgChannel`/`svgLock`; MPDM → group avatar `.verySmall`; file → file-type icon; command →
  `svgSlashBox`; workflow → `svgBolt`; user group → `svgUserGroups`; emoji → `svgEmoji`; default `svgSearch`; icons
  tinted system `.secondaryLabel` (`SearchBarCoordinator.swift:487-548`). Only an intent-promoted top result changes it
  (else `svgSearch`, or `svgSlackbotColor` when Ask Slackbot leads) (`SearchContentAutocompletePlugin.swift:133-160`);
  the Return key reads "go" whenever the icon isn't the search glyph (`SearchBarCoordinator.swift:533-537`).

### 1.2 Zero state (empty query)

Plugin order (`Find/Implementation/SearchContent/SearchContentFeature+Dependencies.swift:39-74`):

- **Tabless search (the iOS 26 Search tab)**: `aiAnswers, [askSlackbot], recents, recentlyVisitedPlaces, autocomplete,
  searchResults, feedbackButton` (`:62-74`). This was June's flagged variant; the `.sailExploration2AZeroStateRecents`
  flag (`ios_sail_exploration_2a_zero_state_recents`) is gone and this is the only path. `askSlackbot` needs Slackbot
  visible and `isAskSlackbotEnabled` (`ios_search_ask_slackbot_zero_state`, default false) (:56-60). Under the unified
  navigation (§1.1) `recents` is replaced by `recentSearchesCollapsed, recentFilesCollapsed` (:64-67).
- **Top Results** (the tabbed search's first tab, not the iOS 26 tab): June's default, `aiAnswers, recentSearches,
  recentConversations, emptyZeroState, autocomplete, searchResults, feedbackButton` (:41-50), §1.2.2.

Each plugin contributes one list section; only the ones whose state matches render. The tabless zero state has **no
empty state**: with no recent searches and no recently visited places the list is blank.

`ios_search_recents_read` (default false) chooses between the new datastore-backed plugins and the `Legacy…` copies of
June's (`Plugins/Recents/SearchContentRecentsPlugin+Dependencies.swift:39`,
`Plugins/RecentlyVisitedPlaces/SearchContentRecentlyVisitedPlacesPlugin+Dependencies.swift:37`); the flag is off, so
the Legacy ones run. Both draw the same rows; the datastore ones add delete (long-press menu and swipe, behind
`ios_search_recents_delete`) to recent searches (`SearchContentRecentsPluginPresenter.swift:61-133`). (Factories:
`SearchContentRecentsPlugin+Dependencies.swift:30-65`, `SearchContentRecentlyVisitedPlacesPlugin+Dependencies.swift:28-69`.)

#### 1.2.1 Tabless zero state (the Search tab)

1. **Ask Slackbot** row (zero state only, when enabled, see above) (`.../AskSlackbot/SearchContentAskSlackbotPluginPresenter.swift:42-60`):
   SKGenericEntity `.small`, primary "Ask Slackbot" (`R.strings.ask_slackbot`, `yaml:2122`), ornament
   `svgSlackbotColor` at `scaleFactor 1.5` (full color). Tap → opens Slackbot (`askSlackbotNavigationalSelection(query:
   nil, suggestionType: .zeroState)`, `SearchContentAskSlackbotPlugin.swift:53-63`).
2. **Recent searches** section, header "Recent searches" (`yaml:15819`) as an entities header `.medium`, no row
   separators, no footer; up to **3** rows (`Plugins/Recents/LegacySearchContentRecentsPlugin.swift:24-27`;
   `LegacySearchContentRecentsPluginPresenter.swift:29-57`). Row (`:59-107`): SKGenericEntity `.small`, ornament
   `svgClock` (`clock.svg`) in a clear 24pt box, or `svgSlackbotColor` ×1.5 for queries that were asked to Slackbot (when
   Ask Slackbot is enabled); one label of up to 3 lines: the query's rich text (mentions keep their icons; `.body`
   `contentPrimary`) + trailing info " · Search in Slack" (`yaml:17121`) / " · Search in Salesforce" (`yaml:18455`) /
   " · Ask Slackbot". UIKit truncates the label; June cut the query to a 2.5-line budget first
   (`echoQueryTruncatedForDisplay`, which only the autocomplete's echo rows still use, §1.3). Tap → runs that search
   again (Slackbot ones reopen their thread).
   **Trailing info** is `Text.appendingTrailingInfo`: " · " + the info in `.smallBody` (15) `contentTertiary`, nothing
   when the info is empty (`Modules/Features/Find/Interface/Text+TrailingInfo.swift:11-22`).
3. **Recently visited places** section, header "Recently visited places" (`yaml:15838`) (hidden under unified nav),
   no separators, no footer; up to **30** frecent items, pending ones skipped
   (`Plugins/RecentlyVisitedPlaces/LegacySearchContentRecentlyVisitedPlacesPlugin.swift:45, 70`;
   `LegacySearchContentRecentlyVisitedPlacesPluginPresenter.swift:51-115`). All rows `.small`, the name up to 3 lines
   with its trailing info (`EntityTrailingInfo`, `Plugins/Shared/EntityTrailingInfo.swift:11-60`, new in September):
   - **Channel** (`:261-272` → `SearchContentPluginPresenterHelper.genericEntityChannelRow`,
     `Plugins/Shared/SearchContentPluginPresenterHelper.swift:155-225`): a 24pt ornament box with a **forced
     `surfacePrimary`** fill (#1D1C1D @ 6% / #F8F8F8 @ 6%), icon `svgChannel` / `svgLock` / `svgArchive` at scale 0.8
     (16pt) in `contentSecondary` (60% alpha when archived); the name in `.body` `contentPrimary` (`contentTertiary`
     when archived); trailing "Not in channel" (`not_in_channel_plain`, `yaml:13181`), "Archived Channel" (`yaml:2077`)
     or **nothing** for a channel you're in; the workspace name as a secondary line when two channels share a name.
     Archived rows are no longer disabled. June: a `baseTertiary` box and the trailing info "Joined" / "Not in channel" /
     "Private Channel" / "Archived Channel".
   - **Person** (`:196-259`): SKMemberEntity `.small` (avatar, presence, status emoji, external-org workspace); trailing
     "@mentionName" only when it differs from the name shown (`mentionName` = display name ?? real name, `name` = the
     one the workspace's name preference picks: `Modules/Data/DataModels/Implementation/ClientModels/Users/User.swift:108-125, 332-335`),
     so usually nothing; June always showed "@name". Bots, channel experts and system users are SKAppEntity rows with
     the app's icon and trailing "App" (`app_title`, `yaml:1991`), "Slackbot", or the Agentforce badge (`yaml:1185`); their
     app label is drawn in clear (:199-231).
   - **MPDM** (`:274-296`): SKMultiPersonDirectMessageEntity `.small` (two avatars), trailing the relative time of the
     latest message (`mpdmTimestamp`).
   - **File** (`:136-165`): ornament = the **unfilled** file-type icon at scale 0.8, tinted the type's palette `_50`
     (`UIColor.primaryColor(for:)`, `Modules/UIInfra/SlackKit/Implementation/Extensions/UIColor+FileTypeExtensions.swift:15-26`;
     icons `Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift:48-125`), on a forced `surfacePrimary` box;
     skills / skill sets get their own ornaments; trailing = a canvas or list's owner (@mentionName), an image / video /
     audio's size, else the pretty type. June: the filled icon on `baseTertiary`.
   - **Workflow** (`:167-192`): the app's icon, or `svgBolt` in `contentPrimary` on the default forced box (`surfacePrimary`,
     June `baseTertiary`); trailing "Workflow" (`yaml:23763`).

#### 1.2.2 Top Results zero state (tabbed search only; June's default)

1. **Most recent search** (1 row max, `Constants.numberOfRecentSearches = 1`)
   (`Find/Implementation/SearchContent/Plugins/RecentSearches/SearchContentRecentSearchesPresenter.swift:30-32, 49-95`):
   SKGenericEntity `.small`; ornament box icon `svgSearch` (24pt box, clear bg, icon 20pt `contentPrimary`); primary
   text = the query; secondary text "Search in Slack" (`R.strings.search_in_slack`, `yaml:17121`); no separators,
   no header/footer. If a Salesforce org is connected, a second row "Search in Salesforce" (`yaml:18455`) follows.
   A11y label "Search for: %@" (`yaml:262`). Tap → re-runs that search (:103-133 of the plugin).
2. **Recent conversations** (up to 20, `SearchContentRecentConversationsPlugin.swift:35`) — compact rows from
   `SearchContentPluginPresenterHelper` (`Find/Implementation/SearchContent/Plugins/Shared/SearchContentPluginPresenterHelper.swift:41-153`):
   DM rows = SKMemberEntity `.small` with avatar, bold name when unread, unread count badge (theme list badge style),
   "Not on Slack" accessory text for profile-only users (`yaml:13198`); MPDM rows = SKMPDM entity `.small` with relative
   timestamp as a text badge in `contentTertiary`; channel rows = SKChannelEntity `.small` (inline share icon hidden,
   unread status shown, workspace name when names collide) with badge count. Section footer: hairline divider
   (hidden when last) (`SearchContentRecentConversationsPresenter.swift:45-55`).
3. **Empty zero state** (only if both recents are loaded and empty) (`.../EmptyZeroState/SearchContentEmptyZeroStatePluginPresenter.swift:41-65`):
   `SKEmptyState` with image `SlackKitResourceBundle.magnifyingGlass()` (dark variant `magnifyingGlassDarkMode()`),
   title "Go ahead, dig in" (`R.strings.dig_in`, `yaml:5449`), body "Start a New Search" (`R.strings.start_a_new_search`,
   `yaml:20573`), clear background. SKEmptyState metrics: edge margins 16/32/16/32, image 120×120, title `.title`
   (22 black) `contentPrimary` centered, body `.body` `contentSecondary` centered, 8pt default stack spacing and 16pt
   after emoji/icon/body, buttons `.medium` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/EmptyState/SKEmptyState.swift:36-48, 142-181, 398-410`).
   Snapshot: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKEmptyStateSnapshotTests/testEmptyStateImageAndTitle@3x.png`
   and `testEmptyStateFull@3x.png` (emoji 48pt, title, 2-line body, outline "Primary action" button), re-recorded in
   September as the 2 × 2 grid (light / dark rows × normal / high-contrast columns); the normal column matches June's
   within one color level.

### 1.3 Autocomplete state (typing)

(`Find/Implementation/SearchContent/Plugins/Autocomplete/SearchContentAutocompletePluginPresenter.swift`)
- One section, no separators, footer hairline (hidden when last); list scrolls to top on every query change (:126-184).
- **Echo-query rows** first ("query · Search in Slack", "query · Ask Slackbot", "query · Search in Salesforce"),
  inserted at index 0, or at index 1 if the first autocomplete result is promoted (`isIntentModelPromoted`, :160-189).
  "Ask Slackbot" goes above the Slack echo row when the query looks like natural language, below it otherwise, and
  only if Slackbot is visible and `.slackbotAutocompleteSuggestionEnabled` (:193-220; the order is now computed by the
  plugin, `SearchContentAutocompletePlugin.swift:57-70`). Every echo row is **one label of up to 3 lines**: the query
  (truncated to a 2.5-line budget so the phrase survives, `Find/Implementation/Subfeatures/Shared/SearchResultsUtilities.swift:278-300`;
  bold, or black in dark mode, when highlighting is on) in `.body` `contentPrimary`, then " · " + the phrase in
  `.smallBody` `contentTertiary`; ornament `svgSearch`, or `svgSlackbotColor` ×1.5 for Ask Slackbot (:60-67, :222-259).
  June drew the query and the phrase as primary + secondary lines unless the zero-state flag was on; that variant is
  gone.
- **The arrow**: one row always ends in `svgArrowRight` (`contentPrimary`), the row Return goes to (§1.1): the
  promoted first result, or else the first echo row (:160-175, :203-205, :272-277). June showed it only with the
  intent-model flag (`isNavIntentPredictionEnabled`), now removed.
- **Entity rows** (:263-384), all `.small`, matched characters bold (black in dark mode) when
  `.searchAutocompleteHighlightMatching` is on (:386-408):
  - the **promoted first result** keeps June's compact rows (`SearchContentPluginPresenterHelper`): users with the
    alternative name, group DMs with their time as a text badge, `SKChannelEntity` channels, files on their type's own
    box with the unfilled glyph (:539-562; `SKGenericEntity+Extensions.swift:14-19`);
  - **every other result** takes trailing info instead (§1.2.1's `EntityTrailingInfo`): users "name · @mentionName"
    (usually just the name) with no alternative name, unread bold and badge as before (:279-299); group DMs "name ·
    <time>" with no time badge (:300-321); channels as the zero state's generic channel row (forced `surfacePrimary`
    box, 0.8 icon, 1 line, "· Not in channel" / "· Archived Channel") plus the unread badge (:322-351); workflows "name ·
    Workflow" on the forced `surfacePrimary` box (:418-464); files "title · <owner / size / type>" on the unfilled colored
    icon box, 1 line, with `svgAiSparkleFilled` when an AI summary exists (:501-570). Shortcuts and Salesforce list
    records are unchanged (:410-416, :466-495).
- Copy: "Search in Slack" (`yaml:17121`), "Ask Slackbot" (`yaml:2122`), "Search in Salesforce" (`yaml:18455`);
  a11y "Search for: %@" (`yaml:262`), "Ask Slackbot: %@" (`yaml:2128`).

### 1.4 Filter bar (result-type chip + filter chips)

**Source**: `Modules/Features/SearchFilters/Implementation/Toolbar/SearchFiltersCollectionEntity.swift`,
`SearchFiltersPresenter.swift`, `SearchFilterConstants.swift`, `SearchFilterToggle.swift`, `SearchFilterButton.swift`;
container logic `FindViewController.swift:147-160, 396-427, 1155-1295` (unchanged except the fade below); filter sets
`Modules/DataService/FindFilterStore/Interface/SearchFilterType.swift:192-279`.

**Snapshot**: `Modules/Features/SearchFilters/Snapshots/iOS_26/SearchFiltersFeatureTests.SearchFiltersViewSnapshotTests/testFilters@3x.png`
(1179×174, light only): a selected chip "Shrek" (solid #1264A3, white bold text), unselected "Fiona" / "Donkey" (white,
#EAEAEA 1pt border, #454447 bold text) and an external-source chip with a 20pt aubergine square image + label.
Measured: first chip starts at x 12, y 16 (= standard insets), chip height 34pt, corner radius ≈10. Fixture:
`Modules/Features/SearchFilters/Tests/Unit/SearchFiltersViewSnapshotTests.swift:17-68`. Re-recorded in September and
identical to June's apart from anti-aliasing; the toolbar's look didn't change (`SearchFiltersPresenter.swift` is
byte-identical, the other toolbar files only refactored).

**There are no result tabs in the iOS 26 search.** "Messages / DMs / Files / Channels / People…" is a **result-type
chip** (first chip) that opens a menu. Result types and order (`FindViewController.swift:403-427`): Top Results (only if
`.sailTopResultsExploration`), Messages, Direct Messages, Files, Canvases, Channels, People, Salesforce (if enabled),
External results (if the user has enterprise search: `currentUser.isEnterpriseSearchEnabled`,
`FindFeatureComponent+Dependencies.swift:228`; June also read the `ios_enterprise_search` toggle, now deleted). Menu: SKMenu, one section for Slack types, separate sections for Salesforce and
External; each item has an icon and on/off state (`SearchFiltersPresenter.swift:433-470`). Titles / menu icons
(:491-519): Top Results (`yaml:21923`) `svgSlackLogo`; Messages (`yaml:12301`) `svgMessage`; Direct Messages (`yaml:5458`)
`svgDirectMessages`; Files (`yaml:7101`) `svgFiles`; Canvases (`yaml:3463`) `svgCanvas`; Channels (`yaml:3917`)
`svgChannel`; People (`yaml:14666`) `svgUser`; Salesforce (`yaml:16871`) `svgSfCloud`; External results (`yaml:6645`) `svgApps`.

**Chips after the result-type chip** (preferred filters per type, `SearchFilterType.swift:262-278`, `:237-240`):
- Messages, Files, Top Results: From ▾, In ▾, Only my channels, Exclude automations, More filters.
- Canvases: Created By ▾, From ▾, In ▾, Date ▾.  Channels: channel membership ▾, channel type ▾, Workspaces ▾,
  Organizations ▾, record-channel ▾.  DMs: With ▾.  People: none.
- When ≥1 filter is applied a **clear-filters chip** is inserted right after the result-type chip: `filterAlt` glyph on
  the left + the applied count, selected colors, menu header "N filters applied" / "1 filter applied" with a destructive
  "Clear all filters" item (`SearchFiltersInteractor.swift:474-486`; `SearchFiltersPresenter.swift:85-88, 149-155, 394-408, 472-475`).
- Applied Date / File type chips are inserted before "More filters" (`SearchFiltersInteractor.swift:488-502`).

**Chip labels** (`SearchFiltersPresenter.swift:81-130, 194-316`): "From" (`yaml:7503`) → "From: Ann" → "From: Ann +2";
"With" (`yaml:23701`); "In" (`yaml:9652`) → "In: general +1"; "Only my channels" (`yaml:13973`); "Exclude automations"
(`yaml:6549`); "More filters" (`yaml:12445`); "Created By" (`yaml:4980`); "Date" (`yaml:5169`) / "Last 7 days"…;
"File type" (`yaml:7031`); "Sort" (`yaml:20484`) → "Sort: Newest".

**Chip geometry**: each chip is an SKButton `.small` with custom colors: text `.captionBold` (13 bold), padding 7×9,
radius 10 (`SearchFilterConstants.borderRadius = 10`), 1pt border, 20pt icon, 4pt icon gap
(`SearchFiltersCollectionEntity.swift:626-642`; `SearchFilterConstants.swift:25-36`). Dropdown chips put `svgCaretDown`
(`caret_down.svg`, SKIconManifest.swift:3780) on the right, tinted like the text (`SearchFiltersPresenter.swift:347-369`).
Chip gap 8 (`SearchFiltersCollectionEntity.swift:39, 240-246`). Horizontal scroll, no indicators, iOS 26 edge
effects hidden (:65-81). Insets: iOS 26 Search uses top 16, left 16, bottom 8, right 16 (`FindViewController.swift:150-152`);
the standard (pre-26) inset is 16/12/8/16 (`SearchFiltersCollectionEntity.swift:36`). The result-type chip gets a
trailing 1px-wide divider (8pt gap, inset 4pt top/bottom, color `outlineTertiary`) when other chips follow
(`SearchFiltersCollectionEntity.swift:455-463, 646-682`; `SearchFiltersPresenter.swift:172`). Bar background = theme list
background (`SearchFiltersPresenter.swift:54-57`).

**Chip colors** (`SearchFilterConstants.swift:14-29`; `SearchFiltersPresenter.swift:318-389`):

| State | Background | Text / icon | Border |
|---|---|---|---|
| Unselected | `basePrimary` #FFFFFF / #1A1D21 | `contentSecondary` #454447 / #B9BABD | `outlineTertiary` |
| Selected filter / clear-filters chip | `highlight1.baseInverse` #1264A3 / #0A77A7 (June #004D76) | `contentInversePrimary` #FFFFFF / #F8F8F8 | none (clear) |
| Result-type chip selected | `sk_aubergine` #4A154B (constant, `SKLegacyColors.swift:197`) | `contentInversePrimary` | none |
| "More filters" | clear | `highlight1.content` #1264A3 / #2BA5CE | none |
| Pressed | background darkened 20% (`SKButton+Types.swift:192-193`), scale 0.96 | | |

Other chip kinds: **Lists / List items** segmented toggle (two `.small` segments, selected segment uses selected
colors) (`SearchFilterToggle.swift:14-156`, titles `R.strings.search_lists_toggle` / `search_list_items_toggle`,
`SearchFiltersPresenter.swift:35-42`); **external source** chip = 20×20 image + `.captionBold` label, padding 7×9,
gap 2 (`SearchFilterButton.swift:21-27, 115-153`).

**Behavior**: tapping a dropdown chip (From/In/Date/…) presents the SearchFilters picker modal
(`SearchFiltersPickerViewController.swift`); result type / sort / clear-filters open context menus; toggles apply
immediately (`SearchFiltersCollectionEntity.swift:257-279`). The bar is shown only in the results state and hides on
scroll: it slides with the content up to its 58pt frame height (`filterViewFrameHeight = 58`,
`FindViewController.swift:168`), **fading as it goes** (alpha = 1 − offset / 58, :1282; new in September), then snaps
shown/hidden at half height when scrolling ends, alpha to 1 or 0, using the default spring (smooth, 0.4 s)
(`FindViewController.swift:1160-1189, 1248-1294`). No slide under VoiceOver/Reduce Motion (:377-385). While it's
visible the list reserves 58pt at the top, as a top safe-area reservation (`setTopSafeAreaReservation`, :1191-1219;
June set a 58pt content inset).

### 1.5 Results state

(`Find/Implementation/SearchContent/Plugins/SearchResults/SearchContentSearchResultsPluginPresenter.swift` + extensions)
- **Loading**: 20 skeleton rows (`SKEntitiesListAdapter.RowType.loading`, `.medium`, image mask, fill `surfacePrimary`)
  below the results header (:36-39, :191-216).
- **Results header** row (`+ResultsHeader.swift:16-75`): "N results found" (`R.strings.search_results_count_found`
  "%@ results found", `yaml:17160`, count in `.captionBold`, rest `.caption`, both `contentSecondary`) or "1 result
  found" (`yaml:17166`); trailing sort button (when the type supports sort) = SKButton `.systemDefault` `.small`,
  title "Most relevant" (`yaml:17147`) / "Newest" (`yaml:12858`) / "Oldest" (`yaml:13619`), `chevronDown` glyph on the
  right, text color `highlight1.content`; menu with `svgCheckFilled` on the selected option (:85-100). Footer hairline
  divider without padding (:56).
- **Result list**: one section **with row separators**, footer hairline (:218-228). Row types:
  - **Message** → MessageKit message preview (`+Messages.swift:14-123`): header line = channel icon (`hashSmallBold` /
    `lockSmall` glyph, or `svgCanvasContent` + space for canvas channels) + channel name in `.smallBodyBold`, then
    " - <relative date>" in `.smallBody`, all `contentSecondary`; author header with status emoji; timestamp style
    time-only; body `.body` `contentPrimary` folded to **3 lines**, or unfolded when the server sent search extracts
    (`messageStyling(hasSearchExtracts:)`, :46-57; June: always 2); reactions shown but not interactive; no
    add-reaction pill; unfurl pipe shown.
  - **File / canvas / list** → SKGenericEntity `.medium` (36pt ornament) (`+Files.swift:15-83`): title max 2 lines;
    secondary "Name · date" (`R.strings.search_file_metadata` "%@ · %@", `yaml:17086`) max 1 line (canvas date =
    last edited); ornament = 80px image thumbnail for images/videos, skill or skill-set ornament (with the "Skill" /
    skill-set tag), canvas-type ornament, or filled file-type icon; trailing `svgAiSparkleFilled` (`contentPrimary`)
    when an AI file summary exists.
  - **Person** → SKMemberEntity `.medium` (large avatar, name (strikethrough styling for deactivated), title as secondary,
    status emoji, presence, external workspace) (`+Users.swift:15-62`).
  - **Channel** → SKChannelEntity `.medium`, secondary "1 member" (`yaml:13572`) / "%d members" (`yaml:13569`),
    public/private/archived glyph, disabled when archived (`+Conversations.swift:13-59`).
  - **DM**, **Salesforce record**, **external result** → `.medium` entities (`+DMs.swift:18-98`, `+SfdcRecords.swift`, `+ExternalResults.swift`).
- **No results** (`SearchContentSearchResultsPluginPresenter.swift:165-181`; sections in
  `SearchResults/EmptyState/SearchContentSearchResultsPluginPresenter+EmptyState.swift`, new file): list background
  becomes `basePrimary` (clear under unified nav). With the Slackbot hand-off off (`ios_search_slackbot_srp_handoff`,
  default false; it also needs Slackbot visible, `SearchContentSearchResultsPlugin+Dependencies.swift:48-51`) it's June's
  SKEmptyState: the 👍 emoji (48pt), title "Nothing turned up" (`yaml:13080`), body "You may want to try using
  different keywords or checking for typos." (`yaml:13074`), primary button "Edit search" (`yaml:6069`, `.medium`,
  style `.primary` = `highlight2.baseInverse` #007A5A / #177E56 bg, white text, `SKButton+Types.swift:166-167,
  210-212`; June the static `sk_lilypad_green`) (+EmptyState.swift:45-64). Button → focuses the search field
  (`editSearch`, `FindViewController.swift:453-454`). With the hand-off on: a one-word query shows "Nothing turned up" +
  "Try different keywords, checking for typos, or adjusting filters." (`search_slackbot_empty_state_message`,
  `yaml:17183`) and an outline "Broaden your search" button (`yaml:17179`) with `svgSlackbotColor` (:69-85); a
  longer one shows the same text over a row of Slackbot prompt cards (`SlackbotSrpPromptsView`) ending in "Ask a
  different question" (`yaml:17169`), vertically centered by spacer sections, a skeleton while the prompts load
  (:89-153; presenter :171-177).
- **"Give feedback" pill** (`R.strings.unexpected_results` = "Give feedback", `yaml:22525`): an SKPillButton with the
  glass effect, corner radius 16 (continuous), label `.caption` `highlight1.content`, fill `surfacePrimary`, in a bottom
  drawer: pinned to the **trailing** edge 16 pt in and 16 pt above the list's bottom, or 16 + 44 pt while the keyboard
  is up and the legacy-nav Liquid Glass search bar floats above it; appears only after the user has scrolled
  (`Plugins/FeedbackButton/SearchContentFeedbackButtonPluginPresenter.swift:16-55`; the drawer moved to
  `Modules/Features/Autocomplete/Interface/AutocompleteFeedbackButtonEmbeddable.swift:22-124`, June's copy was
  `SearchContentFeedbackButtonDrawerEmbeddable.swift` in this plugin's folder).
- **AI answer card** (plugin `aiAnswers`, shown above results for question-like queries when Slack AI search is on)
  (`Plugins/AiAnswers/SearchContentAiAnswersPluginPresenter.swift`; view `Find/Implementation/Messages/Shared/Views/AiSearchView.swift`):
  card with 16pt corner radius, 1pt border `outlineTertiary` (or a two-color gradient border), background aubergine `_0`
  (#F9EDFF / #200221) in the legacy style or `basePrimary` in the modern style (the modern style when answer
  streaming is on or the answer is Slackbot's, `SearchContentAiAnswersPluginPresenter.swift:63`), pressed = aubergine `_5` /
  `baseTertiary`; horizontal padding 16, 10pt top/bottom container padding, up to 3 topic chips, "Share Feedback"
  (`yaml:18567`) `.small` button (`AiSearchView.swift:29-36, 109-112, 290, 318-350`). Header "AI answer" (`yaml:1251`) with
  `svgAiSparkleFilled`; loading text "Searching Slack conversations..." (`yaml:17222`); errors "Slack doesn't have a good
  answer right now" (`yaml:19283`) + "It may be that the information isn't available, or AI misunderstood."
  (`yaml:19280`), or "Something went wrong generating an answer" (`yaml:20389`) + "Please try again in a bit, and AI will
  give it another go." (`yaml:14920`) (`SearchContentAiAnswersPluginPresenter.swift:151-215, 361-406`). Section header
  is a blank divider (:100). New: with `ios_search_answers_slackbot_handoff` (default false) and Slackbot visible the
  answer is Slackbot's (`SearchContentAiAnswersPlugin+Dependencies.swift:44-47`): the card gets the AI glow
  (`AiGlowView` around the container, `AiSearchView.swift:47, 161, 271-274`), the header reads "Slackbot answer"
  (`yaml:20030`) with `svgSlackbotColor`, and the second error body "Please try again in a bit, and Slackbot will give
  it another go." (`yaml:14923`) (:155-215, :361-376).

### 1.6 Older inline search (pre-iOS 26 / Home header)

- **Header search field** in the global Home/DMs/Activity header (`Modules/Features/CompactRoot/Implementation/RootTabDecorator/Header/CompactRootTabSearchHeader.swift`):
  44pt tall row, container radius 16 (continuous), background `basePrimary` @ 13% (:231-248; June wrote
  `sk_primary_background`, the same color), later themed
  `searchBarBackground` (:1200-1202, :1238-1240); leading `svgSearch` 20×20 at 16pt inset, label 12pt after it (:486-497);
  text "Search" / "Search…" (`R.strings.search_with_ellipsis`, `yaml:17204`) in `.body` (max 26pt Dynamic Type) colored
  theme `contentInverseSecondary` resting, `contentInverseTertiary` placeholder (:601-605, :946, :1226-1236). Row sits
  12pt from each safe-area edge (:458, :483-484). Tap → presents Find in `.standard` mode.
  Snapshots: `Modules/Features/CompactRoot/Snapshots/iOS_26/CompactRootFeatureTests.CompactRootTabSearchHeaderSnapshotTests/testDefaultHeader@3x.png`
  (workspace tile "W" + "Workspace" title, status-emoji/avatar pill, "Search" field on the purple→navy gradient, white
  content card with rounded top corners), plus `testHeaderCollapsed`, `testHeaderStretched`, `testHeaderBrightness1…6`,
  `testMinimalHeader`, `testHeaderWithoutGradient`. Re-recorded in September with the header's content 26 pt higher
  (testDefaultHeader: field y 76-120 pt, card top 130; June 102-146 and 156), colors and sizes unchanged; neither the
  header's layout code nor the test changed, so it's the test host's safe area.
- **Find `.standard` on iPhone** (`FindViewController.swift:717-726`): the Find view gets 16pt top corners (continuous)
  and clips; the `SearchBarView` sits in the navigation title (44pt tall) with a Cancel label (`R.strings.cancel`
  "Cancel", `.body`, theme `contentInversePrimary`) (`Find/Implementation/SearchBar/SearchBarView.swift:63-72, 285-316`).
  Field: height 44, radius 16, icon 20×20 at 16pt, text 12pt after icon (`SearchBarView.swift:65-71, 342-352`),
  placeholder "Jump to or search…" (`R.strings.search_default_placeholder_text`, `yaml:17071`) (:133-140). Colors
  from the "search header presentation" theme: field bg theme `searchBarBackground`, text theme `contentInversePrimary`,
  icon/clear theme `contentInverseSecondary`, placeholder theme `contentInverseTertiary`
  (`DefaultFindThemeProvider.swift:94-113`). Plugins and filter bar are the same as §1.2-1.5.
- **Search in channel** (from a conversation): Find `.searchInChannel` puts the search bar in the navigation title
  without Cancel, placeholder = the channel modifier's display string, and prepends `in:#channel` to queries
  (`FindViewController.swift:706-709, 793-805`; `SearchBarView.swift:133-140`); theme = solid `basePrimary`
  (`DefaultFindThemeProvider.swift:77-88, 116-140`: field `containerPrimary` bg with `outlineTertiary` border, text
  `contentPrimary`, icon `contentSecondary`, placeholder `contentTertiary`, Cancel `contentSecondary`).
- **Find in channel bar** (`Modules/Features/FindInChannel`, still behind `ios_find_in_channel`, default false): a top
  drawer over the message list, margin 0 (`FindInChannelPlugin.swift:339-349`) containing an `SKSearchBar`
  (placeholder "Search…"), which focuses on appear. September insets the search bar **16 pt** from the drawer's
  leading and trailing edges (`FindInChannelViewController.swift:44-49`; June pinned it to all four edges).
  Its keyboard accessory row has, leading, `chevronDown` (Previous result), `chevronUp` (Next result) and a count label
  ("Search…" while loading, "No results" `yaml:13064`, "1 result found", "%1$d of %2$d" `yaml:24085`, fallback "%@
  results found"); trailing a system button "Show All" (`yaml:18938`)
  (`FindInChannel/Implementation/FindInChannelViewController.swift:29-174`). Stepping highlights the matching message
  in the transcript with auto-dismiss (`FindInChannelPlugin.swift:312`).
- **SKSearchBar / SKTextField** (used by the find-in-channel bar and other pickers): 42pt tall in the snapshot; field
  radius 12 (`SKTextField.swift:32-33, 148-150`), insets 10/16/10/16 (:44-45), ornament padding 12 (:49-50), font `.body`
  (:52-54), 1pt border `outlineTertiary`, background `baseSecondary` (#F8F8F8 / #1A1D21), placeholder and ghost text
  `contentTertiary`, clear button `contentPrimary` @ 30% (pressed 15%), search ornament `.small` box with `svgSearch`
  tinted like the placeholder, or a caller-supplied `leadingOrnament` (new) (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/SearchBar/SKSearchBar.swift:131-134, 332-345`).
  Snapshots: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKSearchBarSnapshotTests/testEmptySearchBarWithOrnament@3x.png`
  (light and dark field, "Search…"), `testPopulatedSearchBarWithSuggestedResult@3x.png` ("Ja" typed + "son" ghost text),
  `testEmptySearchBarWithLoadingIndicator`, `testEmptySearchBarWithShadow`, `testPopulatedSearchBar` (September: the 2 × 2
  light / dark × normal / high-contrast grid).
- **TokenizedSearch** (`Modules/Features/TokenizedSearch`): a token-input search field (tokens rendered as `SKTokenView`s
  in a collection view). The iOS 26 Search tab passes `useTokens: false` (`SearchViewController.swift:131-136`), so tokens
  are not used there. Token look: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKTokenViewSnapshotTests/testTokenResolved@3x.png`
  and siblings (resolved / unresolved / error / selected / with dismiss).
- **SimpleSearch** is only the Salesforce organization / object-type pickers (`Modules/Features/SimpleSearch/Interface/SfdcOrganization`,
  `SfdcObjectTypes`); not part of the main search.
- **SearchNavigationHeaderView** (`Modules/UIInfra/MoreTabUI`): centered title with optional trailing buttons and a
  search icon, used by More-tab pages. Snapshot:
  `Modules/UIInfra/MoreTabUI/Snapshots/iOS_26/MoreTabUITests.SearchNavigationHeaderViewSnapshotTests/testSimpleTitle_withSearch_trailingButton@3x.png`
  ("Simple title goes here" in Lato black, emoji-add and search icons on the right).

### 1.7 Search gaps

- No snapshot of the iOS 26 Search tab, zero state, autocomplete or results; the system search field's exact iOS 26
  placement, height and glass styling are UIKit defaults and are not in Slack source.
- The primary header's title-to-bar-button spacing and bar-button sizes come from `SKNavigationItem`/`SKBarButtonItem`
  (not traced here; shared with the Home header spec).
- Search filter picker modal (From/In/Date pickers) layout not specified here (`SearchFilters/Implementation/PickerModal/*`).
- `AiSearch` feature module (`Modules/Features/AiSearch`) not traced beyond the AI answer card above.
- The unified-navigation SwiftUI search (`QuickSearchView`, `SearchView`, `SearchResultsPageView`) and the datastore
  recents (`ios_search_recents_read`) aren't specced: both are off by default and not what production shows.
- Production's Search tab height of the stacked search field row isn't measured (no device screenshot of the tab);
  the clone keeps its 56 pt row under the 54 pt navigation bar.

---

## 2. Slackbot and AI

### 2.1 Where Slackbot lives: the Slackbot tab and the Slackbot DM

Two screens since September 2026 (14b3cbaf): the **Slackbot tab** is a native landing page of its own
(`SlackbotViewController`), and every Slackbot conversation (from that tab, the DM list, Home's tile, a channel's header)
is the **Slackbot DM**: a full `AnyConversation` for the Slackbot user with Slackbot-specific plugins (§2.2–2.5). In June
(cd22922) the tab embedded that conversation edge to edge, as a modal (Close on the left, `SlackbotFeature.swift:46-57` of
the June checkout); that path is gone.

**When there is a Slackbot tab.** Only with `ios_slackbot_bottom_tab` on (`slackbotBottomTab`, default `false`,
`Modules/Data/Toggles/Definitions/ios_slackbot_bottom_tab.json`) and Slackbot AI visible to the user; then it takes the
More tab's slot (§0, `CompactRootTabBarController.swift:483-496`). Tab item: title "Slackbot" (`slackbot_user`,
`yaml:20262`; `Modules/Integration/SlackLegacyModularization/Interface/Navigation/HomeTab+Info.swift:32`), image
`svgSlackbotColor` 25×25 rendered `.alwaysOriginal` in both states (`CompactRootTabBarController.swift:224-231`). The tab
factory is `CompactRootFeature+Dependencies.swift:196-203` → `SlackbotFeatureComponent.feature`
(`Modules/Features/Slackbot/Implementation/SlackbotFeature+Dependencies.swift:54-82`). Production (the device
screenshots, Sept 2026) has no Slackbot tab: More is the fourth tab, and Slackbot is Home's "Slackbot · Ask anything"
tile and a DM.

**Slackbot tab: chrome** (`Modules/Features/Slackbot/Implementation/SlackbotInteractor.swift:386-399`;
`SlackbotPresenter.swift:97-168`)
- The tab root's primary header (§1.1): leading title "Slackbot" (`slackbot_user`), nothing on the left, no loading bar,
  pull-to-smile messages on; the title fades as content scrolls under the bar (`SlackbotDataTypes.swift:40-49`). The list's
  header embeddable paints the theme's header strip like the other root tabs (`SlackbotPresenter.swift:43, 78`).
- Right bar items, in screen order: **More actions** (`svgMenu` `menu.svg`, a11y "More actions", `more_actions`,
  `yaml:12439`), a fixed-space separator (so two glass circles), then your avatar (the You button; contributed once above
  the TabView instead under unified navigation, `SlackbotInteractor.swift:387-391`) (`SlackbotPresenter.swift:97-124`;
  `SKNavigationItem` arrays are leading-to-trailing since September).
- The More actions menu (`SlackbotPresenter.swift:126-168`), three `.displayInline` sections:
  1. "Skills" (`skills`, `yaml:19229`) with `svgAiSkills` → the Skills screen as a modal (§2.7; `SlackbotFeature.swift:189-206`).
  2. "Recent conversations" (`slackbot_recent_conversations`, `yaml:20198`): up to 3 of your 5 most recent Slackbot threads
     (`SlackbotInteractor.swift:52-54, 451-467`), each its title, subtitle (the relative time, §2.6) and `svgDirectMessages`
     (`svgAiWorkflow` for automations, `Modules/Integration/AiHistory/Interface/AiHistoryThread.swift:26-28`); omitted when
     there are none. Tap → that thread.
  3. "View all conversations" (`slackbot_view_all_conversations`, `yaml:20265`), no icon → History (§2.6) presented as a
     standard modal, not a sheet (`SlackbotFeature.swift:262-285`; `AiHistoryFeature.swift:34-48`).
- With `ios_slackbot_segmented_control` on (default `false`, `SlackbotFeature+Dependencies.swift:76`) there is no menu
  button: a `UISegmentedControl` [Chat | History] (`chat` `yaml:3939`, `history` `yaml:7963`) sits just above the top safe
  area, 16 pt from the sides, 8 pt above and below, and History embeds the AiHistory list in the tab
  (`SlackbotViewController.swift:18-23, 72-78, 127-157`; `SlackbotDataTypes.swift:13-30`; `SlackbotFeature.swift:221-260`).
- No FAB, no pull-to behavior, no Home-style header; reselecting the tab scrolls to the top
  (`SlackbotFeature.swift:303-336`; `SlackbotViewController.swift:297-302`).

**Slackbot tab: content, top to bottom** (`SlackbotViewController.swift:113-125, 204-215`; `SlackbotPresenter.swift:50-95`).
View background `basePrimary`; one list from the top of the view to its bottom, its background the theme list background
(`sk_primary_background` on iPhone, theme-colors.md §3.8):
1. **Greeting row** (`SlackbotGreetingRow.swift:22-159`): fills the list's remaining height, at least 24 + the label + 12
   (`Spacing.xxLarge` / `.large`, :26-37, :123-137). The greeting is centered in the row, `.subtitle` (Lato Black 20)
   `contentPrimary`, center-aligned, at least 64 pt from each side, any number of lines (:70-80, :147-159). Behind it, from
   the row's top, a 200 pt wash (never taller than the row) fading top to bottom from the time of day's tint to
   `basePrimary` (`SKGradientView` `.verticalFade`, `Modules/UIInfra/DeveloperComponents/Implementation/GradientView/SKGradientView.swift:32-35`;
   :88-99, :139-145). It scrolls away with the row.
   Tints (`SlackbotGreeting.swift:179-199`): morning #FFFAE0 / #2B2825, afternoon #E6F5FE / #1F2A30, evening aubergine 0
   (#F9EDFF light) / #2A2130.
   Greeting text (`SlackbotGreeting.swift:19-177`; a seed picked once per tab, re-evaluated when the app returns to the
   foreground, `SlackbotInteractor.swift:114-121, 188-194, 282-291`): time of day as on the DM's landing page (before 12:00
   morning, before 17:00 afternoon, else evening, :78-83). The seed picks one of 5 buckets (:38-45, :85-101): bucket 0 the
   weekday's line if there is one (Saturday/Sunday "Weekend mode? I’m still here", Monday "Monday energy, %@. Let’s go!",
   Wednesday "Midweek. What’s blocking you?", Friday "Happy Friday, %@. Finish line’s in sight!"; :107-116), bucket 1 a
   casual line ("The floor is yours, %@.", "Your favorite coworker is ready!", "Status: ready when you are!"), the others
   a time-of-day line:
   - morning: "Good morning, %@!", "New day, clean slate, %@!", "%@ is online. Let’s make things happen!", "Morning! No
     standup required, just ask";
   - afternoon: "Good afternoon, %@!", "Afternoon, %@. Still in the flow?", "Back at it, %@!", "Hey %@, what’s next on the
     list?";
   - evening: "Good evening, %@!", "The async life, %@. What do you need?", plus from 18:30 "After hours, %@? I’m here for
     it" and "Late night session. No judgment" (:118-169).
   `%@` is your first name (else your username); with neither, "Good morning!" / "Good afternoon!" / "Good evening!"
   (:55-66, :171-177). Keys `slackbot_greeting_*`, `yaml:20062-20142`.
2. **Bottom drawer** (above the tab bar, 16 pt margin, `Spacing.xLarge`; `SlackbotPresenter.swift:18-23, 70-77`): the
   recommendations (hidden while the composer is focused, and absent until there are cards), then the composer.
   - **"Recommended for you"** (`slackbot_suggestions_header`, `yaml:20251`): an `SKHeaderEntity` `.medium` (Lato Bold 15
     on a clear background, 12 / 16 / 12 / 16 margins) in `contentSecondary`
     (`SlackbotRecommendationsEmbeddable.swift:67-83, 93-101`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/SKHeaderEntity.swift:88, 466-476`),
     over a horizontally scrolling band of cards, 8 pt apart, inset 8 top / 16 sides / 16 bottom, no scroll indicators,
     every card as tall as the tallest (`SlackbotCardCarousel.swift:15-21, 44-61, 97-120, 146-162`).
   - **Card** (`SlackbotSuggestionCardView.swift:57-160, 202-235`; `SlackbotRecommendationsEmbeddable.swift:57-59`): 280 pt
     wide, radius 12 (continuous), a 2 px `outlineTertiary` border (`onePixel() × 2`), `baseSecondary` fill; 16 / 12 / 16 / 12
     insets; a 36 pt circular `SKOrnamentBox` `.large` in aubergine 10 (#F4DAFF / #431349) holding the suggestion's icon at
     scale 0.9 (18 pt) in aubergine 70 (#83388A / #CFA1DE); 8 pt; the title in `.smallBodyBold` (15 bold) `contentPrimary`,
     then 4 pt and the subtitle in `.smallBody` (15) `contentTertiary`, both wrapping. Pressed: alpha 0.6
     (`SlackbotCardCarousel.swift:183-187`). VoiceOver reads title and subtitle as one button.
   - Cards come from the server ranked and localized (`AiAlphaSlackbotBigModeListSuggestionsRequest`,
     `Modules/DataService/SlackbotSuggestions/Implementation/SlackbotBigModeSuggestionsListAction.swift:22-31`), minus ones
     without an id or title and ones already used (`Modules/DataService/SlackbotSuggestions/Implementation/SlackbotBigModeSuggestionsService.swift:54-73`).
     Icon map (:75-88): planning `svgCheckList`, direct messages `svgDirectMessages`, drafts `svgEdit`, todos
     `svgSubtaskComplete`, mentions `svgMentions`, notifications `svgNotifications`, calendar `svgCalendar`, channels
     `svgChannel`, huddle `svgHeadphones`, anything else `svgAiSparkle`.
   - Tapping a card resigns the keyboard and opens a new Slackbot conversation with the card's prompt already sent; a card
     that carries a server-side prompt variant instead asks the server to start the thread and opens it, every card inert
     until that returns; failure toasts "Something went wrong. Please try again!" (`something_went_wrong_please_try_again`,
     `yaml:20392`). A used card disappears (`SlackbotInteractor.swift:337-382`; `SlackbotFeature.swift:160-166`).
   - **Composer**: the standalone composer attached to the Slackbot DM ("Ask Slackbot anything...", §2.4), longform off, with
     the Slackbot glow (`SlackbotInteractor.swift:229-272`): a conic rainbow #36C4F0 → #2EB57D → #EDB22E → #E01E59 →
     #36C4F0 (evenly spaced, starting at the trailing edge) at opacity 0.32, blurred 12 pt and reaching 12 pt past the
     composer pill, the pill's own area knocked out so the glass isn't tinted
     (`Modules/Features/Composer/Implementation/Composer/Views/ComposerSlackbotGlowView.swift:14-109`;
     `ComposerViewController.swift:119, 477-489`). Sending opens the Slackbot DM, which moves into the thread the backend
     creates (`SlackbotFeature.swift:168-177`).
- iPad with the sidebar (`isNonCompactPad`) gets an "Ask anything" button instead of the composer: `SKButton` `.large`,
  `basePrimary` fill, `contentPrimary` title (`slackbot_ask_anything`, `yaml:20033`), `svgArrowRight` on the right, a 1 pt
  rainbow ring and a soft rainbow halo, 16 pt from the sides and above the safe area
  (`SlackbotViewController.swift:44-67, 217-246`; `SlackbotGradientRingView.swift:10-56`;
  `Modules/UIInfra/AiComponents/Implementation/AiGlowView.swift:12-106`, `AiBrandGradient.swift:10-31`).

**Opening a Slackbot conversation** (`SlackbotFeature.swift:141-158, 287-300`): from the tab, a conversation replaces any
Slackbot conversation already on the tab's stack and gets a normal Back button; "New chat" (and a sent message) open the
DM's landing page with the composer focused (`composerFocusOnStart: .textInput`). Home's Slackbot tile does the same on
the Home tab (context `.tile`; the tile is hidden while the Slackbot tab is on,
`Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/SlackbotAiTile.swift:49-50, 142-149`). A channel's
header button presents it as a sheet (§2.2).

Conversation model: the Slackbot DM's main view is a **landing page** (§2.3). Sending a prompt creates a new **thread**,
and the screen transitions into that thread view (`SlackbotAiMessagePlugins/Implementation/Content/SlackbotThreadPlugin.swift`,
header comment at the top of the file). "New chat" goes back to the landing page by clearing the thread timestamp
(`Modules/Features/AnyConversation/Implementation/AnyConversationInteractor.swift:387-394`).

**Snapshots**: none of the Slackbot tab, the DM's landing page, NUX, a thread or History. The recommendation card follows
`SkillCardView`'s layout (`Modules/UIInfra/SkillRowUI/Snapshots/iOS_26/SkillRowUITests.SkillCardViewSnapshotTests/testIntrinsicHeight@3x.png`:
a 280 pt card, rounded square ornament, "Daily Brief" / "Created by …" / description).

### 2.2 Header buttons (Slackbot conversation)

(`Modules/Integration/HeaderHelper/Interface/HeaderBarButtonPresentable.swift:300-306`,
`Modules/Integration/HeaderHelper/Implementation/HeaderHelperService.swift:178-190`, enablement
`Modules/Features/ConversationHeaderMenu/Implementation/NewConversationHeaderHelperService.swift:1066-1088`)
- Title: the DM's title view, Slackbot's avatar and name over "Messages" (`slackbot_ai_welcome_mat_title`, `yaml:20027`);
  opened from a channel with context the subtitle is the channel's name, or "Thread in %@" from a thread
  (`ConversationHeaderPresentationObject.swift:443-456`).
- **History** (past threads): `svgClock` (`clock.svg`, SKIconManifest.swift:3816), a11y "History"
  (`R.strings.slackbot_ai_history_title`, `yaml:19921`). Always shown in a Slackbot conversation. Opens §2.6 as a sheet.
- **New chat**: `svgCompose` (`compose.svg`, :3836), a11y "New Message" (`yaml:12837`). Shown while viewing a thread, and
  since September also on the landing page when the conversation was opened from the Slackbot tab
  (`isThread || isBottomTab`, `NewConversationHeaderHelperService.swift:1071, 1085`).
- Right items in screen order (leading-to-trailing since September): History, then New chat; adjacent, so one glass
  capsule; History alone is a circle. Both are generic 20×20 icon bar buttons with the `.headerNudge` padding
  (`HeaderHelperService.swift:564-580`; `Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKBarButtonItemView.swift:21-24`).
- **Slackbot entry in other conversations' headers** (`.slackbotConversationHeaderEntry`, whenever Slackbot AI is enabled
  and the conversation isn't the Slackbot DM, `NewConversationHeaderHelperService.swift:1093-1108`;
  `HeaderBarButtonPresentable.swift:281-283`) and in the Search/Home primary header (`.slackbot`): `svgSlackbotColor` at
  **25×25**, full color (render original), a11y "Ask anything" (`R.strings.slackbot_ask_anything`, `yaml:20033`)
  (`SKBarButtonItemView.swift:79-89`; `SKBarButtonItem.swift:591-593`). It always opens the Slackbot conversation as a
  **bottom sheet** with `[.medium, .large]` detents (June: only with `.slackbotModal`, else a push)
  (`AnyConversationFeature.swift:525-529, 129-134`); dismissing the sheet ends the Slackbot session (:136-143). In the
  primary header the Slackbot button gets its own glass container: a separator follows it (June: preceded it)
  (`PrimaryNavigationHeaderService.swift:521-525`).
- In channel composers a Slackbot accessory button opens Slackbot too; long-pressing it shows the
  `ComposerSlackbotMenu` popover (`Modules/Features/Composer/Implementation/Composer/ComposerFeature.swift:947-958`;
  composer.md).

### 2.3 The DM's landing page / welcome mat (empty state)

**Source**: `Modules/Features/SlackbotAiMessagePlugins/Implementation/Content/SlackbotAiLandingContentPlugin.swift`,
`SlackbotAiLandingContentProvider.swift`, `SlackbotAiNuxPromptsView.swift`; the prompt row moved to
`Modules/UIInfra/AiComponents/Implementation/SlackbotAiNuxPromptRow.swift`.

Three landing states (:531-535): `.default` (tab, DM, tile), `.nux` (first-run megaphone `slackbotAiMobileWelcomeMat`
active and not dismissed, :152-167), `.modal` (a sheet opened from a conversation **with** a context; :134-143). Root-level
sheet entry points (bottom bar, main header) carry no context and get `.default`, and so does every sheet with
`ios_slackbot_modal_focus_composer` on (default `false`), which trades the suggestions for a focused composer (:122, :137-143).

**Default state** (:334-346, :423-434): one `SKEmptyState` row, scroll-anchored to the **top**, clear background:
- Image: Slackbot's large avatar (`avatarSource(forSize: .large)`) as image with proportional corner radius
  (:436-448) — SKEmptyState image box 120×120 (`SKEmptyState.swift:39`).
- Title: time-of-day greeting + first name: "Good morning, Ann!" / "Good afternoon, …" / "Good evening, …" / "Hello, …"
  (before 12:00 / before 17:00 / before 24:00) (`SlackbotAiLandingContentProvider.swift:21-37`; `yaml:7703, 7697, 7700, 7864`),
  font `.title` (Lato black 22) `contentPrimary`, centered.
- Body: one random line from 26 welcome messages (:39-70), `.body` `contentSecondary`, centered. Examples (keys/lines):
  "I've been here the whole time, but it's nicer when you are too." (`yaml:10297`), "Fancy meeting you here." (`yaml:6733`),
  "Look who wandered in. Excellent choice." (`yaml:11558`), "You bring the words, I'll bring the… other words." (`yaml:24248`),
  "Ah, my favorite co-star." (`yaml:1236`), "Our streak of excellent timing continues." (`yaml:14450`). A new random line is
  picked each time the screen comes on screen (:241-262).
- When it comes on screen in the default state the composer is focused (keyboard up), unless the conversation is a sheet
  (without the focus flag) or the caller suppressed it (:252-257).
- **No prompt rail.** June's horizontally scrolling Discover / Create / Find / Brainstorm category cards above the composer,
  and the prompt sheet they opened (`Prompts/` folder), are gone; the plugin's output filter is now a pass-through
  (:352-354).
- **AI disclaimer** in the context bar above the composer while `ios_hangbar_updates_v2` is off (default `false`, added
  2026-09-08): Slackbot's avatar and "Slackbot uses AI and can make mistakes." (`ai_content_generated_disclaimer`,
  `yaml:1322`), set once for the DM's conversation-level bar, so it shows on the landing page and not in threads (:277-287;
  `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarSlackbotAIProcessingConfiguration.swift:24-29, 41-42`;
  bar style §2.5d). It gives way to a resting workflow "continue" bar (:24-29 there). With the flag on, the disclaimer
  moves under the last answer instead (§2.5c).

**NUX state** (:312-332, :452-511): scroll-anchored to the bottom.
1. A fake Slackbot message (unselectable) with Slackbot's medium avatar, name, "now"-style timestamp and text
   "Hi! Let me reintroduce myself. I’m here to help you work better in Slack. Whatever you have access to, I can find it and
   help you work with it — just ask!" (`yaml:19924`) + blank line + **"Ready to give this a try?"** (bold, `contentPrimary`,
   `yaml:19928`).
2. Four prompt rows (`SlackbotAiLandingContentProvider.swift:91-126`), each: 36pt **circle** emoji ornament
   (`SKOrnamentBox` `.large`, `.circle`) + label `.smallBodyBold` (Lato bold 15) `contentPrimary`, unlimited lines;
   8pt padding, 8pt gap, radius 12, press bounce 0.96 (`SlackbotAiNuxPromptRow.swift:69-75, 214-224, 261-288`). Rows are 12pt
   apart; the list is inset 12 top, **64 left** (aligned with message text), 12 bottom, 32 right
   (`SlackbotAiNuxPromptsView.swift:47`).
   | Prompt | Emoji | Circle color (light / dark) |
   |---|---|---|
   | "Find action items from my recent conversations" (`yaml:20015`) | 🏅 | campfire_5 #FDE2BE / #4B2200 (`Colors.swift:848`) |
   | "Tell me about what you can do" (`yaml:20018`) | 💬 | cilantro_5 #D7F5C8 / #123111 (`Colors.swift:1136`) |
   | "Based on my activity in Slack, what animal would I be?" (`yaml:20021`) | 🐶 | ocean_5 #C2E6FD / #062755 (`Colors.swift:1496`) |
   | "Surprise me" (`yaml:20024`) | 🎉 | aubergine_5 #F6E4FF / #300C31 (`Colors.swift:1640`) |
   Tapping sends the prompt and marks the NUX seen; moving into a thread also dismisses it (:169-185, :264-275, :513-524).
   The row can now also carry a long-press menu and a border (both unused here; :32-67, :157-174).

**Modal state** (sheet from a channel/thread/message with context; :204-239, :358-410): while suggestions load, a shimmer
placeholder (4 sections × 1 cell, small, no image mask); then up to 4 suggested prompts (API `limit: 4`) in the same
prompt-row view with inset 12 on all sides, each with a 36pt clear circle holding `svgArrowDownRight`
(`arrow_down_right.svg`, SKIconManifest.swift:3659) tinted `contentTertiary` (`SlackbotAiLandingContentProvider.swift:75-86`,
`SlackbotAiNuxPromptRow.swift:269-274`); with no suggestions it falls back to the greeting empty state without the avatar.

### 2.4 Composer differences in Slackbot

(`Modules/Features/Composer/Implementation/ComposerToolbar/ComposerToolbarLayoutManager.swift:141-259`; the Slackbot
plugins moved to `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/`)
- Placeholder: **"Ask Slackbot anything..."** (`R.strings.ask_slackbot_anything`, `yaml:2125`), `.body`, placeholder color
  (`Modules/Features/Composer/Implementation/MessageComposition/PlaceholderTextPublisher.swift:230-232`).
- Collapsed composer, empty text: the right-side button is **two-way voice** (`svgBidirectionalVoice`, "Two-way voice"
  `yaml:22439`; flag `ios_two_way_voice_feature`, default `false`) if available, else Slackbot **voice transcription**
  (`svgMicrophone` in `contentSecondary` on clear; recording `svgMicrophoneFilled` white on `highlight1.baseInverse`, a
  pulsing backdrop of the same; "Record voice transcription" `yaml:15971`; flag `ios_slackbot_voice_transcription`,
  default `false`), never the audio-clip recorder; with neither flag, no right button (:187-192;
  `ComposerSlackbotVoicePlugin.swift:57-89`; `ComposerSlackbotTwoWayVoicePlugin.swift:26-42`;
  `ComposerToolbarPluginFactory+Dependencies.swift:302-317`). Recording shows a cancel button (`svgClose`, the default
  Liquid Glass plugin button) and a `svgCheckFilled` "End voice transcription" (`yaml:6267`) button, white on
  `highlight1.baseInverse` (#1264A3 / #0A77A7) (`ComposerSlackbotVoiceDonePlugin.swift:22-31`,
  `ComposerSlackbotVoiceCancelPlugin.swift:22-40`). June used `sk_highlight` for both.
- Expanded toolbar: just **[+]** (omnipicker) when Slackbot AI is on; otherwise the standard tools minus slash commands
  (:205-217). June's `[+, formatting, emoji, @]` and the Skills (`svgAiSkills`) / MCP (`svgPlug`) buttons are gone from the
  toolbar (`ComposerSlackbotMcpPlugin` deleted). Right side: voice transcription when its flag is on, then Send, or two-way
  voice while Send is disabled (:238-249).
- **While Slackbot is streaming** in a thread, Send is replaced by **Stop**: `svgStopFilled` (`stop_filled.svg`,
  SKIconManifest.swift:4242), white icon on `highlight1.baseInverse` (#1264A3 / #0A77A7, `Colors.swift:98`; June
  `sk_highlight` #1264A3 / #1D9BD1), a11y "Stop Response" (`yaml:20735`); one tap sends the stop request and hides the
  button (`Plugins/ComposerStopStreamingPlugin.swift:34-68`; layout :171-172, :241-243; shown/hidden by
  `Modules/Features/SlackbotBehaviorPlugins/Implementation/SlackbotAIStopStreamingPlugin.swift:36-78`).

### 2.5 AI answer rendering (Slackbot replies in a thread)

Replies are normal MessageKit messages (avatar, "Slackbot", timestamp, Block Kit body). AI-specific parts:

**a) "Thinking / tools" line** — `TimelineBlock` rendered by
`Modules/UIInfra/BlockKitComponents/Implementation/Blocks/Timeline/BKTimelineBlockView.swift` + `BKTimelineHeaderView.swift`:
one line = optional tool icon + text in `.smallBody` (Lato 15) + trailing `svgCaretRight` (20×20, `caret_right.svg`,
SKIconManifest.swift:3790), 4pt gaps, 8pt between items (`BKTimelineHeaderView.swift:25-26, 70-77`;
`BKTimelineBlockView.swift:33`). Text: while running = the latest step's text; done with >1 tool = "Used %d tools"
(`yaml:22871`); or a server summary (:180-211). Color: running = aubergine `_70` (#83388A / #CFA1DE) **with shimmer**;
finished = `contentTertiary` (:224-233). Salesforce/Agentforce tool icons use lagoon_50 (#0E9DD3 / #1699CA,
`Colors.swift:1454`) (:297-303). Tool icon map (:255-295): ai-sparkle, calendar, book, mentions, ai-file-summary, user,
search, settings, canvas-content, warning, clock, lists, sf-cloud, agentforce-filled, search-files, email, and since
September ai-workflow (`svgAiWorkflow`, :290-291). VoiceOver reads it as a button labelled with the summary (:106-108).
Tap → "View tool timeline" (`yaml:23276`) sheet: `[.medium, .large]` detents with the grabber, now in a navigation
controller titled "Summary" (`summary`, `yaml:20859`) with a leading close button (SF `xmark`), `basePrimary`, the list 16 pt
in from the sides and below the bar (`Modules/Features/AiToolTimeline/Implementation/AiToolTimelineFeature.swift:25-35`;
`AiToolTimelineViewController.swift:26-39`; `AiToolTimelinePresenter.swift:134-135` for the new icon).
**Shimmer** (`Modules/UIInfra/AiComponents/Implementation/AiLabel.swift:163-190`): a horizontal gradient mask with alphas
1.0 / 0.15 / 1.0 whose locations animate from [-0.9, -0.5, -0.1] to [0.7, 1.0, 1.3], 1.3 s, linear, repeating; off under
Reduce Motion. (CSS: animate a `mask-image: linear-gradient(90deg, #000, rgba(0,0,0,.15), #000)` position.)

**b) Plan / task cards** (agentic answers; Block Kit `plan` / `task` blocks):
`Blocks/Plan/BKPlanBlockView.swift:27-30, 147-153`, `Blocks/Task/BKTaskBlockView.swift:28-29`,
`Blocks/Task/Views/BKTaskHeaderView.swift:30-35, 187-215, 292-294, 307-325`, `BKTaskItemView.swift:28-31`,
`BKTaskView.swift:158-171`, `BKTaskOrnamentView.swift:100-184`. Card: **8 pt** margins (June 12), 12 pt item spacing;
header = 20 pt status ornament (spinner while any task runs, check-circle when all are done, warning on error) + title
in `.body` (Lato 17 regular; June `.bodyBold`) **`contentSecondary` in every state** (June `aubergine_button_fill` while in
progress, else `contentPrimary`), shimmering while loading; trailing 20 pt `svgCaretDown` / `svgCaretUp` in
`contentSecondary`. Task rows: 20 pt ornament — `svgHourglass` pending, `svgAiSparkleFilled` running, an **8 pt dot**
(`svgIconPlaceholderFilled`) when done (June a checkmark), `svgWarning` in `sk_raspberry_red` on error; ornaments and the
spinner (on `surfacePrimary`) in `contentSecondary`; 8 pt gaps, a vertical "pipe" rail under the ornament when the row is
≥32 pt tall, details text and source rows (file icon + title). A block can open its tasks in a bottom sheet instead of
expanding in place (`opensTasksInBottomSheet`, `BKPlanBlockView.swift:136-140`). Snapshots (re-recorded since June as the
2 × 2 light/dark × contrast grid):
`Modules/UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKPlanBlockSnapshotTests/testExpandedState_tasksWithSources@3x.png`
("Integration Project" in regular gray with the spinner, • "Review documentation" with details and two file sources,
✦ "Implementation"; light and dark), `…BKTaskBlockSnapshotTests/testCollapsedState_loading@3x.png` (collapsed "Generating
report" with spinner and chevron; light/dark), plus 26 more task and 27 more plan states in the same folders.

**c) Footer action bar** on every finished Slackbot reply in the Slackbot DM (not while `aiContext.resultStatus` is
`.pending`/`.streaming`) (`Modules/UIInfra/MessageKit/Implementation/MessageFooterActionBar.swift:26-40, 114-127, 160-304`;
mapping `Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Mappers/AiResultFooterMapper.swift:16-51`;
placed after the reactions bar, `MKMessageContentView.swift:282-294`):
- Row height 40 (`SKIconButton` `.small` = 40×40, icon 20×20; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/IconButton/SKIconButton.swift:428-449`).
- Left: **Share** (`svgShareMessage` `share_message.svg`; a11y "Share Message" `yaml:18639`; opens Forward Message,
  `Modules/Features/Handlers/MessageActionHandler/Implementation/MessageActionHandlerService.swift:364-367`) — June's Copy
  (`svgCopy`, "Copy Message") is gone —, **👍** (`thumbsUp` icon-font glyph U+E188, SKIconManifest.swift:3131; a11y "Good
  response" `yaml:7706`), **👎** (`thumbsDown` U+E189, :3132; "Bad response" `yaml:2382`); all tinted `contentSecondary`
  on a clear circle backdrop (`MessageFooterActionBar.swift:26-40, 251-290`). Thumbs appear only if general AI feedback is
  allowed. (SVG look-alikes exist as `thumbs_up.svg` / `thumbs_down.svg` in Icons.xcassets.)
- Right: **Sources** chip when the answer has timeline sources or memory sources (`AiResultFooterMapper.swift:39-46`):
  SKButton `.small` "Sources" (`yaml:20511`), bg `baseTertiary` (#EAEAEA / #212428), text `contentSecondary`, no border
  (`MessageFooterActionBar.swift:236-247`).
- Disclaimer, on the **last loaded message only and only with `ios_hangbar_updates_v2` on** (default `false`;
  `AiResultFooterMapper.swift:31-32`): now **above** the buttons — a 1 px `outlineTertiary` divider, 12 pt, "Slackbot is AI and
  can make mistakes." (`slackbot_is_ai_and_can_make_mistakes`, `yaml:20145`) in `.caption` **`contentTertiary`**, 4 pt, then
  the button row (`MessageFooterActionBar.swift:26-31, 114-127, 222-232, 293-304`). With the flag off (the default) there is no
  footer disclaimer: it is the context bar's (§2.3). June: below the buttons, on every last message, "This tool uses
  generative AI, which can produce inaccurate or harmful responses." in `contentSecondary`.
- **Sources sheet** (`Modules/Features/AiTimelineSources/Implementation/AiTimelineSourcesFeature.swift:27-37`,
  `AiTimelineSourcesViewController.swift:26-62`, `AiTimelineSourcesPresenter.swift:60-248`): `[.medium, .large]` detents
  with grabber, now in a navigation controller titled "Sources" (`yaml:20511`) with a leading close button (SF `xmark`),
  background `basePrimary`, the list 16 pt in from the sides and below the bar; sections "Messages" / "Files" / "Web"
  (`yaml:23537`) and, new, "Memories" (`memories`, `yaml:12018`) with `.medium` entity headers; message rows = previews
  (author header, "in #channel" and body in `contentSecondary`, body `.body` folded to 2 lines, no reactions); file rows =
  filled file-type icon on its type color + title + "Type | Shared by Name on Date" (`yaml:1585`) in `.smallBody`
  `contentSecondary`; web rows = `.small` entity with `svgLink` ornament, title and 2-line snippet; memory rows = `.small`
  entity, the memory's title (else its content) and a chevron, opening the Memories sheet scrolled to it
  (`AiTimelineSourcesFeature.swift:111-115`; `AiTimelineSourcesPresenter.swift:134-151`).

**d) Typing / thinking indicator** — the context bar above the composer (Slackbot threads only)
(`Modules/Features/SlackbotBehaviorPlugins/Implementation/SlackbotThreadContextBarPlugin.swift:60-62, 110-215`;
text `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarSlackbotAIProcessingConfiguration.swift:15-49`;
view `Modules/UIInfra/ContextBarUI/Implementation/SKContextBarAdapter.swift:410-418`):
- While streaming with status "typing": Slackbot's avatar (extra-small avatar pile) + "Slackbot is **typing...**"
  (`R.strings.slackbot_is_typing` "Slackbot is <bold>typing...</bold>", `yaml:20148`).
- After 30 s with no reply while pending/streaming: "Slackbot isn’t responding" (`yaml:20151`; :36-38, :184-205); "Sending…"
  (`yaml:17613`) and, new, the landing page's disclaimer (§2.3) are the other states. The whole plugin is off with
  `ios_slackbot_elevator_pill` on (default `false`), which replaces it with an "elevator pill" (:60-62).
- Bar style: since September the conversation's context bar is always `SKContextBar` in the transcript's bottom drawer
  (`Modules/Features/AnyConversation/Implementation/Plugins/ContextBarBottomDrawer.swift:90`): an interactive Liquid Glass
  capsule at least 36 pt tall, 6 / 12 padding, `.caption` text, the extra-small avatar pile
  (`Modules/UIInfra/ContextBarUI/Implementation/SKContextBar.swift:34-52, 66-77`; composer.md). The June `ContextBarView`
  (radius 16, `sk_foreground_soft_solid`) is no longer used in conversations; its colors moved to core tokens
  (`Modules/Integration/ContextBar/Interface/ContextBarView.swift:30-65`). Snapshot of the component:
  `Modules/UIInfra/ContextBarUI/Snapshots/iOS_26/ContextBarUITests.SKContextBarSnapshotTests/testTypingIndicator_ShortText@3x.png`
  (avatar + "Jason Winn is **typing...**") and `testContextBar_SlackbotLimitWarning@3x.png` (clock icon + "You're nearing
  your Slackbot limit for the week. **Upgrade team**"); pixel-identical to June.
- Streaming text itself: the reply message updates in place as blocks arrive; no separate caret/typing animation for
  Slackbot was found in MessageKit (looked in `Modules/UIInfra/MessageKit`, `MessageKitTransformation`,
  `Modules/Features/MessageTranscript/Implementation/Plugins`).

### 2.6 History ("past threads")

(`Modules/Features/AiHistory/Implementation/AiHistoryFeature.swift:34-50, 141-165`, `AiHistoryViewController.swift:19-43`,
`AiHistoryPresenter.swift:35-95, 179-261`, sections `AiHistoryInteractor.swift:281-310`, rows
`Modules/Integration/AiHistory/Implementation/AiHistoryThreadFormatter.swift:26-46, 98-162`)
- Presentation (`AiHistoryFeature.swift:34-48`; `AiHistoryFeatureInterface.swift:43`): from a Slackbot conversation's History
  button a sheet with `[.medium, .large]` detents; from the Slackbot tab's "View all conversations" a standard modal; or
  embedded in the tab's History segment. Always in a navigation controller.
- Bar: title "History" (`history`, `yaml:7963`); a leading close button (SF `xmark`, a11y "Close") when it is the only view
  controller in its stack (`configureCloseButtonIfNecessary`, `Modules/UIInfra/NavigationController/Implementation/UIViewController+CloseButton.swift:61-97`;
  June: no close button); right bar button `svgCompose`, a11y "New Slackbot Message" (`new_slackbot_message`, `yaml:12852`;
  June "Compose") → dismisses and opens a new chat. Background `basePrimary`.
- Sections per calendar day of the thread's date, newest first; header = an entities header with
  `timeUtility.ordinalDisplayString` (Today / Yesterday / a date), footer hairline divider (`AiHistoryPresenter.swift:179-200`;
  `AiHistoryInteractor.swift:281-310`).
- Row (`AiHistoryPresenter.swift:202-261`): SKGenericEntity **`.medium`** (June `.small`), no ornament; primary = thread
  title (AI title blocks, else the message's text, else "Untitled message") max 2 lines; secondary = relative time (simple
  today, extended otherwise; bold `.captionBold` when unread); accessories: a spinner while Slackbot is still answering, else
  an unread dot in the theme's `baseInverseImportant` when unread (unread tracking behind `ios_slackbot_thread_unread*`, default
  off), then the `chevronRight` glyph (U+E250, SKIconManifest.swift:3191) in **`contentSecondary`** (June
  `sk_foreground_max_solid`). June's emphasized background for threads Slackbot started is gone.
- Long-press → context menu "Delete conversation" (`R.strings.slackbot_delete_thread_menu_item`, `yaml:20049`) with
  `svgTrash`, destructive, when `ios_slackbotai_delete_thread` is on (default `false`, as in June)
  (`AiHistoryPresenter.swift:228-242`; `AiHistoryInteractor.swift:270-279`).
- Loading: skeleton list (medium cells with image mask). Empty: SKEmptyState title "Nothing to see here...yet."
  (`yaml:13255`).
- `ios_slackbot_history_redesign` (default `false`): a search field ("Search", `SKSearchBar`, 8 / 16 insets) as the list's top
  drawer with search results as message previews, an icon ornament (`svgDirectMessages` / `svgAiWorkflow`), no chevron, and
  rows dated by their latest reply (`AiHistorySearchBarViewController.swift:25-76`; `AiHistoryPresenter.swift:99-177, 218-226`).
- Tap a row → opens that thread (dismissing the sheet first; embedded, the tab pushes it) (`AiHistoryFeature.swift:141-158`).

### 2.7 Other AI surfaces (brief)

- **Voice assistant** (long-press the tab bar; `Modules/Features/SlackbotVoiceAssistant`): presented `.overCurrentContext`
  (`SlackbotVoiceAssistantFeature.swift:28-29`). Curved themed panel (`theme.baseInverseSecondary`) with an animated
  rainbow edge (#EDB22E, #E01E59, #36C4F0, #2EB57D; 6 s sweep; circle grows 50 → ×1.5 in 0.25 s) (`BackgroundView.swift:12-23, 151, 177`);
  centered Slackbot image 100pt, radius 20, rotating conic rainbow glow (4 s) with 30pt glow padding and a 2 s pulse
  (`SlackbotView.swift:14-37, 140, 153`), centered 16pt below center; 30pt audio wave (white bars,
  `SlackbotVoiceAssistantViewController.swift:46, 91`) 32pt below it; live transcript
  `.subtitleBold` (20 bold) theme `contentInversePrimary`; loading text italic 15 in theme `contentInverseSecondary` at 75%
  alpha; bottom bar 56pt tall, 16pt side insets, 24pt above safe area: mic (`svgMicrophoneFilled`) left and threads
  (`svgThreads` `threads.svg`) right as 56pt circles (`SlackbotVoiceAssistantViewController.swift:18-20, 185-229, 300-360`).
  Tap top 40% = dismiss, bottom 60% = send. Accessibility labels "Microphone"/"Thread" are hard-coded English.
- **Legacy AI assistant** (`Modules/Features/AiAssistant`): older full-screen voice assistant (blob gradient + audio
  visualizer), `.overCurrentContext` (`AiAssistantFeature.swift:25-26`); only when `.slackbotVoice` is unavailable.
- **Skills** (`Modules/Features/SlackbotSkills`): title "Skills" (`yaml:19229`) with a close button when presented
  (`SlackbotSkillsViewController.swift:30-32`); from the Slackbot tab's menu a standard modal, elsewhere a sheet with
  `[.medium, .large]` detents and the grabber (`SlackbotSkillsFeature.swift:23-33`). Rows are `.medium` skill entities
  (skill icon ornament, "Created by %@" `yaml:4986`, "%@ (you)" `yaml:12722`) with a "More Options" (`yaml:12451`) menu: View
  Skill (`svgArrowDownRight`, `yaml:23267`), Copy Link (`svgLink`, `yaml:4753`, when allowed), Remove from Slackbot
  (`svgTrash`, destructive, `yaml:16253`) (`Modules/UIInfra/SkillRowUI/Implementation/SkillRowPresentationObjectFactory.swift:28-50, 120-146`;
  `SlackbotSkillsPresenter.swift:36-75`). Empty: `svgAiSkills` + "No skills added yet" (`yaml:13086`); error: `svgWarning` +
  "Something went wrong" (`yaml:20379`). Picking a skill on the tab sends it into a new Slackbot conversation
  (`SlackbotFeature.swift:179-219`). The composer's Skills button is gone (§2.4).
- **Memories** (`Modules/Features/SlackbotMemories`): title "Memories" (`yaml:12018`), `.large` detent with the grabber
  (`SlackbotMemoriesFeature.swift:21-27`; `SlackbotMemoriesViewController.swift:33-35`); sections "Style and Format
  Preferences" (`style_and_format_preferences`, `yaml:20755`; June "Preferences") and "Saved Topics" (`saved_topics`,
  `yaml:16936`; June "Topics") with the subtitle "Slackbot saved these from your conversations to make future responses more
  relevant." (`yaml:21942`); empty "No memories added yet" (`no_memories`, `yaml:13004`) (`SlackbotMemoriesPresenter.swift:55-135`).
  Also opened from a Sources sheet's memory row, scrolled to that memory.
- **AI app threads** (`Modules/Features/AiAppThreads`): thread list for third-party AI apps grouped "This week"
  (`yaml:21602`) / "Last 30 days" (`yaml:10549`), empty "Nothing to see here...yet." (`AiAppThreadsPresenter.swift:32-78`).
- **Skill embeddable** (a skill attached to a message) now draws the shared `SkillCardView` and supports a long-press menu
  (`Modules/Features/SkillEmbeddable/Implementation/SkillEmbeddableViewController.swift:18-40`;
  `SkillEmbeddablePresenter.swift:22-26`). Snapshots: `Modules/Features/SkillEmbeddable/Snapshots/iOS_26/*/testWithDescription@3x.png`,
  `testWithoutDescription`, `testLongTitle` (re-recorded shorter: 389 px tall, was 443). **MCP app block**:
  `…BKMCPAppBlockSnapshotTests/test_default@3x.png`. **Loading block**: `…BKLoadingBlockSnapshotTests/testLoadingBlock@3x.png`
  (not described in detail).

### 2.8 Slackbot gaps

- No snapshot of the Slackbot tab, the DM's landing page, NUX, a thread or History; the tab's layout comes from code.
- The recommendation cards' content is server-provided (title, subtitle, icon, prompt); the clone's are demo data.
- The bottom drawer's composer placement on the tab (16 pt above the tab bar) is the drawer margin; the standalone
  composer's own insets inside the drawer were not traced.
- How partial streamed text is revealed (chunking, cursor) is server-driven; no client-side typing animation found.
- The `ComposerSlackbotMenu` popover and the "elevator pill" (`ios_slackbot_elevator_pill`) are not specced here.
- The Slackbot sheet's conversation header (title view and its close affordance) belongs to the conversation-header spec.

---

## 3. Huddles

Flow: conversation header 🎧 → **preview sheet** (start / join) → **huddle sheet** (full-height sheet) →
swipe down / minimize → **in-app PiP tile** (draggable). In the channel, the huddle appears as a **huddle message**
("A huddle is happening" + LIVE + Join huddle). There is no "minimized huddle bar" above the tab bar: the bar above the
tab bar is the **floating audio-clip player** (§3.9).

Since June, most new huddle behavior is behind flags that default **off** (`Modules/Data/Toggles/Definitions/*.json`):
`ios_huddle_better_thread_visibility` (the huddle thread in a bottom sheet inside the huddle, §3.3),
`mobile_huddles_share_link_button` (copy / share link buttons on the preview, §3.2), `ios_huddles_reactji_explosion`
(§3.3, §3.8), `ios_huddles_sheet_size_switching` (the wide / narrow sheet layouts), `ios_huddle_face_pile_perf`
(§3.11). `ios_frontline` (also off) turns the start button into a copy-link button for frontline workers.

### 3.1 Header button (start / join entry point)

The item is an `SKBarButtonItem` of kind `.huddle` (September 2026: rendered by SlackKit's `SKHuddleBarButtonView`
instead of HeaderHelper's own `EDUFlagBarButtonItem` / `HeaderHelperBarButtonItem`). Its presentation object is built in
`Modules/Integration/HeaderHelper/Implementation/HeaderHelperService.swift:416, 521-556`; placement in the right
bar-button list `Modules/Integration/HeaderHelper/Interface/HeaderBarButtonPresentable.swift:293-298` (leading-to-trailing
since September: after a Solutions button, before Slackbot's History / New chat); colors :150-164; view
`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKHuddleBarButtonView.swift:27-31, 151-238`;
glass style `Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKBarButtonItem.swift:216-239, 546-553`.
- **Idle**: a fixed **32×32** badge holding a centered `svgHeadphones` (`headphones.svg`, SKIconManifest.swift:3937)
  `SKIconButton` `.accessory` (20×20 glyph, the tap area is the whole badge), icon `contentPrimary`; pre-iOS 26 a
  `basePrimary` circle is drawn behind it, on Liquid Glass no circle (the bar's glass is the background,
  `SKHuddleBarButtonView.swift:122-136`); a11y "Start Huddle" (`R.strings.start_huddle`, `yaml:20629`).
- **Coachmark** (first-run): icon `contentInversePrimary` (white), background `highlight1.baseInverse` (#1264A3 /
  #0A77A7), pulse `highlight1.baseInverse` @30%, 20 repeats. On iOS 26 the item takes the `.prominent` glass style tinted
  `highlight1.baseInverse` and the **icon** pulses (scale 1 → 1.2, 1.5 s ease-in-out, autoreverse); pre-26 a ring behind
  the circle scales 1 → 1.5 (1 s ease-in, autoreverse) (`SKHuddleBarButtonView.swift:73-90, 218-238`). iOS 18 snapshot:
  `Modules/Integration/HeaderHelper/Snapshots/iOS_18/HeaderHelperServiceTests.HeaderHelperBarButtonItemTests/testInactiveHuddleWithCoachmark@3x.png`
  (blue circle, white headphones). The iOS_26 PNGs of this test are still blank except `testInactiveHuddleWithoutCoachmark`
  (a lone ≈17 pt headphones glyph at x 346–364 pt, no circle: the iOS 26 idle state).
- **Huddle active in this conversation**: an SKButton pill, size `.huddleBarButton(isLiquidGlass:)` (font `.microBold` 12,
  or `.smallBodyBold` 15 on Liquid Glass; padding 6 × 8; radius 14; icon 16; gap 5 — `SKButton+Types.swift:253-254,
  284-285, 315-316, 338-339, 372-373`, `SKButton+PresentationObject.swift:208-209`), headphones icon + the member count
  (blank when 0), text `sk_off_white` (#F8F8F8, `HeaderHelperService.swift:27`), background `highlight2.baseInverse`
  (#007A5A / #177E56, `Colors.swift:104`). On Liquid Glass the button's own fill is clear and the item is the
  `.prominent` glass capsule tinted `highlight2.baseInverse` (`SKHuddleBarButtonView.swift:163-179`;
  `SKBarButtonItem.swift:232-238`). The pre-26 8 pt upward nudge is gone (the huddle item no longer uses
  `HeaderHelperBarButtonItem`). a11y "Join huddle, %@" (`R.strings.join_huddle`, `yaml:10336`, %@ = "N members").
  Snapshot (iOS 18): `…/iOS_18/…/testActiveWithMembers@3x.png` (green pill, headphones + "15", measured ≈51×27pt).
- Tap → `HuddlesPreviewRoute(.channelHeaderBadge)` → §3.2 (`Modules/Features/AnyConversation/Implementation/AnyConversationInteractor.swift:347-356`,
  `AnyConversationFeature.swift:494-495`). In a thread, the huddle is tied to that thread.

### 3.2 Start / join preview sheet

(`Modules/Features/Huddles/Implementation/Preview/HuddlesPreviewViewController.swift:151-219, 522-535`;
start copy `ViewStateMappers/HuddlesStartPreviewViewStateMapper.swift:43-223`; presentation `HuddlesPreviewFeature.swift:64-78`)
- iPhone (compact width): always a UIKit sheet with one **self-sized** detent
  (`.sheet(.init(detents: [SKDetent(.selfSized(…))]))`, `HuddlesPreviewFeature.swift:72-78`; June used Slack's legacy
  SKBottomSheet unless `bottomSheetMigration` was on). The detent is the scroll view's content height plus its top inset
  (`Modules/UIInfra/Architecture/Implementation/Navigation/SelfSizedDetentHeightObserver.swift:15-31`); UIKit adds the
  bottom safe area. Grabber on (the `StandardBottomSheetParameters` default,
  `Modules/UIInfra/Architecture/Implementation/Navigation/ModallyPresentableFeature.swift:259`). Never a close button
  (`shouldAlwaysHideCloseButton`, :65). iPad: a custom popover-style presentation (:76).
- The view is `basePrimary` with a full-size scroll view (no card radius of its own any more; the sheet rounds it):
  participants row 66 pt tall, full width, **32 pt** below the top (0 when the preview is in a navigation bar); title +
  subtitle stack 16 pt below it, 16 pt side margins, 6 pt apart (a banner 12 pt below them); the action buttons
  **24 pt** below that, stacked 8 pt apart, 16 pt side margins, ending at the content's bottom (`:151-219`, constants
  `:522-535`; the June 12 pt banner case and 16 pt extra bottom margin are gone).
- Snapshots (new): `Modules/Features/Huddles/Snapshots/iOS_26/HuddlesFeatureTests.HuddlesPreviewViewControllerSnapshotTest/`
  `testDMPreview@3x.png` (one 56 pt rounded-square avatar with a paper-plane invite badge, "Start a huddle with
  other-name", "They’ll receive a notification to join.", green "🎧 Huddle"), `testGroupDMPreview` (three avatars, 2-line
  title), `testDifferentDevicePreview` ("You’re already in this huddle", "Switch to this device" + outline "Use both
  devices"), `testDMPreviewWithShareLinkButtons` (navigation bar with a glass capsule of link and share icons). Measured
  in `testDMPreview` (393 pt frame): avatars y 37–93, title glyphs from y 118.7 (label top 114), subtitle 147.7–164,
  button y 188.7–237.3 × x 16–377, fill #007A5A.
- **Share link** (flag `mobile_huddles_share_link_button`, off): the preview is embedded in a navigation controller
  (hairline hidden, translucent) whose right items are, leading to trailing, **Copy Link** (`svgLink`, `copy_link`
  "Copy Link") and **Share Link** (`svgShareMessage`, `share_link` "Share Link", `yaml:18633`) in one capsule
  (`HuddlesPreviewBarButtonItems.swift:25-64`; `HuddlesPreviewPresenter.swift:102-104`; `HuddlesPreviewFeature.swift:64-70`).
- Title `.subtitle` (Lato 20) centered; subtitle `.body` centered; `<channel>` spans render as channel mentions in
  `highlight1.content` bold (`HuddlesPreviewViewStateMapperInterface.swift:64-90`).
- Start copy: channel → "Talk it out in a huddle" (`yaml:8477`) / "Anyone in **#channel** can drop in to join the
  conversation." (`yaml:8473`); DM/MPDM → "Start a huddle with %@" (`yaml:8508`), "…with %@ and %@" (`yaml:8512`), "…with %@
  and %d others" (`yaml:8504`) / "They’ll receive a notification to join." (`yaml:8483`); thread → "Continue this
  conversation in a huddle" (`yaml:8501`); free plan → "On the free version of Slack, your huddles are limited to %d
  minutes." (`yaml:20632`).
- Join copy: "Join %@ in the huddle" (`yaml:8248`), "Join %@ and %@ in the huddle" (`yaml:8264`), "Join %@ and %d others in
  the huddle" (`yaml:8240`); "%@ is already in the huddle. Drop in if you’d like." (`yaml:8244`); button "Join huddle"
  (`yaml:10303`), joining state "Joining" (`yaml:8279`).
- Buttons, all SKButton `.large` (Lato bold 17, padding 14 × 16, radius 14), in this order: trial upgrade, the primary,
  Join soon, Decline, join from another device, "More options…" (`yaml:8367`, `.default` style)
  (`HuddlesPreviewViewController.swift:28-45`). Primary **"Huddle"** (`yaml:8015`) with the `headphones` glyph, white
  text on `highlight2.baseInverse` (#007A5A / #177E56); while joining it becomes a spinner on `baseTertiary` with
  `contentSecondary` text. Frontline workers (`ios_frontline`) get **"Copy huddle link"** (`copy_huddle_link`,
  `yaml:4737`) with `svgLink` instead (`HuddlesStartPreviewViewStateMapper.swift:85-91`). A **Cancel** button
  (`yaml:3202`, `baseTertiary` / `contentSecondary`) is configured but never added to the view, in June too
  (`HuddlesStartPreviewViewStateMapper.swift:58-82`; `HuddlesPreviewViewController.swift:66-71, 387-412`): you dismiss by swiping the sheet down, and VoiceOver's
  escape gesture cancels (`:334-337`).
- Tap the primary → the huddle sheet (§3.3) is presented and all modals behind it are dismissed; any floating audio player
  is reset (`Modules/Features/Handlers/Huddles/Implementation/HuddlesSessionManager.swift:701-744`).

### 3.3 Huddle sheet (in-call screen)

**Source**: `Modules/Features/Huddles/Implementation/Sheet/HuddlesSheetFeature.swift:71-77` (iPhone: modal `.formSheet`,
which UIKit presents as a full-height page sheet in compact width; June: `.automatic` on iPhone, `.formSheet` on iPad, the
same look. With `ios_huddle_better_thread_visibility` (off) it is `.overFullScreen`, see below. Swipe down dismisses →
PiP, `HuddlesSessionManager.swift:756-757`), `HuddlesSheetViewController.swift:147-157, 499-503`,
`Sheet/Views/HuddlesSheetViewV2.swift:41-60, 554-640`.

Layers, back to front (`HuddlesSheetViewV2.swift:554-607`):
1. **Background**: the huddle theme image (aspect-fill, server-provided list; user picks it via "Edit Theme") or a
   looping MP4, extended 30pt beyond every edge with a ±30pt device-tilt parallax (:86-91, :329-379, :605, :671-684).
   Base behind it: `basePrimary` (`HuddlesSheetViewController.swift:147`).
2. **Participant grid** — full-bleed collection view (§3.4).
3. **Bottom fade**: a 120pt copy of the background image masked by a gradient 0 → 1 alpha (stops 0, 0.75) so tiles
   disappear under the controls; **top fade**: a 90pt copy masked 1 → 0 (stops 0.5, 1.0)
   (`HuddlesSheetViewV2.swift:43-45, 117-153, 611-623`).
4. **Header** (§3.5) with a black gradient behind it: rgba(0,0,0,0.5) → 0, height = header + 4pt (:155-162, :264, :603).
5. **Footer** (banners, reaction feed, captions) from header bottom to 8pt above the controls (:592-595).
6. **Controls bar** pinned to the bottom safe area (§3.6).
7. *(flag)* **Thread panel**: with `ios_huddle_better_thread_visibility` the Thread button opens the huddle's thread in a
   panel pinned to the bottom edge, above the chrome: a medium detent at 50 % of the sheet (the grid and controls shift
   up and stay usable, 12 pt between the controls and the panel's grabber; the grid switches to its horizontal layout,
   §3.4) and a large one at the height below the safe-area top (92 % for both in landscape); the header then shows the
   recording button (§3.5) (`HuddlesSheetViewV2.swift:52-60, 223-224, 493, 642-669`).
8. **Effect overlay** (full-screen reaction effects), fades in/out over 0.2 s and is hidden when idle
   (:164-171, :386-392, :692-708).
9. *(flag)* **Reactji explosion** (`ios_huddles_reactji_explosion`): 15 copies of a reaction (48 pt, scale 0.75–1.75)
   burst from the screen's center over 3 s, fanning sideways (`Sheet/Views/HuddlesReactjiExplosionView.swift:11-60`;
   `HuddlesSheetViewV2.swift:175, 382-398, 570-573`).

Push-to-talk (when on): a 124pt panel under the sheet content, 16pt side margins, 32pt above
(`HuddlesSheetViewController.swift:94-109, 499-503`; view `Implementation/PushToTalk/PushToTalkView.swift`).

### 3.4 Participant grid and tiles

**Grid** (`Sheet/Layout/HuddlesCanvasGridLayout.swift:55-77, 179-275`):
- Square tiles, **2 per row** portrait (4 in landscape), **24pt** gaps, margins **80 top / 16 sides / 100 bottom**
  (constants unchanged since June). On a 393pt screen a tile is (393 − 32 − 24) / 2 = 168.5pt.
- Content shorter than the screen is centered vertically (against the visible viewport when the sheet is full screen,
  i.e. with the thread-panel flag, :30-39, 239-243); a short last row is centered horizontally.
- *(flag)* **Horizontal layout** while the thread panel sits at its medium detent (portrait only, participants and at most
  one remote screen share): one row up to 3 participants (2 next to a screen share), else two rows of square tiles that
  scroll sideways, 3 columns visible with a 24 pt peek of the next, 12 pt gaps, margins 60 / 16 / 40 / 16 (:66-77, 278-460).
- An "expanded" participant (e.g. pinned video) takes a full row in portrait.
- Above the participants, in order: AI-notes/recording banner (full width, 90pt top margin), your own screen-share
  banner (full width, 58pt tall), then a remote screen share (full width − 32, height = width × 198/358), each followed by
  12pt (or 24/2 between items).

**Participant tile** (`Sheet/Views/HuddlesSheetParticipantCell.swift:84-115, 178-263, 448-511, 632-856`):
- Avatar fills the tile (`SKMemberAvatar` size `.presentation`, square), corner radius **16** (continuous); video
  replaces it when the camera is on. Placeholder = `UIImage.avatarPlaceholder(.callsAvatar)` (measured #EAEAEA).
- **Outline**: 1pt `outlineTertiary` normally; **active speaker = 3pt white** outline (radius 16 + border) with 10% black
  shadow, animated 0.6 s spring (damping 1.0) (:632-662).
- **Name pill** bottom-left, 8pt from the tile's left and bottom edges: background `sk_black` @70%, fully rounded
  (radius = height/2), content = [16×16 `microphoneSlash` icon when muted | 16×16 "soundwave" Lottie while speaking]
  + name `.captionBold` (13 bold) white, 1 line, 4pt gaps; your own tile reads "You" (`yaml:24205`). Measured in the
  120pt test tile: pill 24pt tall at 8-9pt insets. The mute icon pops in/out with a 0.5 s spring (damping 0.8, scale 0.2)
  (:214-257, :448-450, :746-809).
- **Reaction / sticker badge** top-left (8pt inset): emoji 22×22 on an `sk_black` @70% rounded rect (radius 8); stickers
  add a label (e.g. "Raise hand") in `.captionBold` white; appear with a spring (reactions 0.8 s, damping 0.5, velocity
  0.7; stickers 0.4 s, damping 1.0) (:97-105, :351-363, :811-856).
- **Pinned**: 📌 on a 32×32 `sk_black` @70% box (radius 8), **8pt** from the top-right (June: 12; `pinnedIconInset`,
  :110-112, :376-385, :497-500). While pinned, a reaction / sticker badge keeps 8 pt clear of the pin and truncates
  (`pinReactionSpacing`, :100, :501-504, :944-947).
- **Poor connection**: 32×24 pill (`slowNetwork` glyph, white) bottom-right, 8pt inset (:95-96, :305-316, :467-470).
- **External-org** badge: 32×32, radius 8, 12pt from bottom-right (:92-94, :461-464).
- **Flip camera** (own video): pill with `cameraSwap`, 8pt from bottom-right, bg `sk_black` @70%, pressed `sk_dark_gray`
  (:91, :271-281, :457-458).
- **Invited / joining / declined**: tile dimmed with black @50%; top-left chip 8pt from the edges (radius 8,
  `sk_black` @70%, label insets 5 → 25 pt tall, measured in `testInvitedParticipant`) with `svgPaperPlane` + " Invited"
  (`yaml:10117`), `svgClock` + " Joining soon" (`yaml:10306`) or, new, `svgCloseCircle` + " Declined"
  (`huddle_participant_declined`, `yaml:8361`), `.captionBold` white, 1 line; the old badge fades out (smooth, fast)
  and the new one springs in (bouncy) (:180-190, :706-744, :954-1000). No mute icon on these tiles (:746-756).
- **Temporarily disconnected**: centered spinner, avatar at 50% alpha (:691-704).
- Snapshots (`Modules/Features/Huddles/Snapshots/iOS_26/HuddlesFeatureTests.HuddlesSheetParticipantCellTest/`, a 120pt
  cell centered in a clear 130pt container so the outline shows; fixture
  `Modules/Features/Huddles/Tests/Unit/SnapshotTests/HuddlesSheetParticipantCellTest.swift:20-40`):
  `testBasicMutedParticipant` (grey tile, pill "🎙̸ John Doe"), `testCurrentUser` ("You"), `testPinnedParticipant` (📌 box
  8 pt from the top-right, re-recorded since June), `testInvitedParticipant` (dimmed, "✈ Invited" chip + name),
  `testJoiningSoonParticipant`, and new `testDeclinedParticipant` ("⊗ Declined" chip), `testPinnedParticipantWithSticker`
  ("☕ Be…" truncated beside the pin), `testActiveSpeaker`, `testReconfiguringSameStateIsStable`;
  `testParticipantWithReaction` (👍 box top-left), `testParticipantWithSticker` ("✋ Raise hand" chip),
  `testPoorConnectionParticipant` (truncated "Po…" pill + signal-bars pill), `testDisconnectedParticipant` (spinner,
  "Disconnec…"), `testLongDisplayName`.

**Screen-share tile** (`Sheet/Views/HuddlesSheetScreenShareCell.swift:40-50, 59-206, 267-332`): radius 12, 1pt border
`sk_foreground_low_always_dark` (#D1D2D3 @13%), background `baseTertiary`; top-left chip (screen icon + sharer name,
`.captionBold` white, insets 8, radius 8, `sk_black` @70%) 12pt inset; top-right viewer face pile (max 3, "+N") in the same
chip style; bottom-right, 12pt inset, an icon-only `SKPillButton` (`expand` glyph, white) on `sk_black` @70%, ≈44pt round
(measured), a11y "Expand" (`yaml:8130`) (:104-128, :227-228); paused state shows "%@ is sharing
their screen.\nTap to view." (`yaml:22961`) centered in `.captionBold` white on a dimmed tile; a11y "%@ is screen sharing, tap
to enlarge" (`yaml:24138`). Expanded = radius 0. The zoom view is used only in the wide layout (June: on iPad)
(`HuddlesSheetScreenShareCell.swift:291-295`). Snapshots: `…HuddlesSheetScreenShareCellTest/testScreenShareWithViewers@3x.png`
(chip "Screen Sharer", 3-face pile, spinner, expand button), `testPausedScreenShare@3x.png` (dark tile with the "Tap to
view" text), `testBasicScreenShare`, `testExpandedScreenShare`, `testLongDisplayNameScreenShare`, `testScreenShareWithManyViewers`.

### 3.5 Sheet header

(`Modules/Features/Huddles/Implementation/HuddleHeader/HuddlesSheetHeaderView.swift:26-498`, content
`HuddleHeaderPresenter.swift:60-133`)
- Row: a **leading capsule** 16pt from the leading safe edge, centered on the title stack; the **title/subtitle stack**
  16pt after it; **Leave** pill 16pt from the trailing safe edge in the narrow (phone) layout, a 40pt thread button in the
  wide one (:40-111, :113-159, :423-455, :471-484).
- The capsule (September 2026) is one `UIVisualEffectView` holding the close button and a recording button side by side
  (spacing 0): on iOS 26 a `.clear` glass effect tinted `sk_black` @70% with capsule corners, before that a plain
  `sk_black` @70% capsule (`:40-63, :457-463, :486-498`). The buttons are backdrop-less `SKIconButton` `.small` (40×40):
  - **minimize** `svgCaretDownFull` (`caret_down_full.svg`, SKIconManifest.swift:3779) white, a11y "Close"; while screen
    sharing `svgClose` (`svgReduceDiagonal` in the wide layout) and the capsule tint turns
    `sk_foreground_soft_solid_dark` #24272A (:349-372). Alone, the capsule is a 40pt circle, as in June.
  - **recording** (only while the thread panel is open, i.e. the `ios_huddle_better_thread_visibility` flag, and AI notes
    are being taken; `Sheet/HuddlesSheetInteractor.swift:158-174`): `svgRadioButton` in `sk_raspberry_red` while
    recording, `svgAiSummaryOff` white while paused (:383-421); the capsule is then 80 × 40.
- Stack top = safe-area top + **12** (wide 16); stack bottom = header bottom − 16 (:26-28, :427-430, :471-498).
- Title: `.bodyBold` (17 bold) white, 1 line; subtitle: `.smallBody` (15) white, 1 line (:306-333).
- Title = huddle topic, else the conversation name with its `#`/🔒 prefix, else "Huddle" (`yaml:8015`); while someone
  shares, the sharer's name. Subtitle: "Just you" (`yaml:8282`), "%d people" (`yaml:12613`), "Just you, 1 Request"
  (`yaml:8286`), "%d people, 1 Request" (`yaml:12610`), "%d people, %d Requests" (`yaml:12607`), "Loading…" (`yaml:11490`),
  "live screen sharing" (`yaml:8329`); transient notifications replace the subtitle with a vertical slide (new text from
  +20pt, old to −20pt, 0.4 s spring damping 0.8, velocity 0.6) (:256-304).
- **Leave**: `SKPillButton` `.small`, glass, fill `sk_raspberry_red` (#E01E5A; pressed 80%), text "Leave" (`yaml:10747`)
  `.captionBold` white (max 16pt), height ≥ 38; a11y "Leave huddle" (`yaml:10786`) (`HuddlesSheetHeaderView.swift:113-159`).
- Tap the title stack → huddle info / options ("Tap for more options", `yaml:8162`).
- Snapshots (`…HuddlesSheetHeaderViewTest/`, 375pt wide on white, so the white title text is invisible):
  `testViewWithBasicConfigurationCompact@3x.png` (black minimize circle left, dark-red "Leave" pill right — the glass
  effect renders the red darker, ≈#8C0A34), plus `testViewWithLongTitleCompact`, `testViewWithNotificationCompact`,
  `testViewWithScreenshareCompact`, and three iPad (NonCompact) variants. Re-recorded since June with sub-pixel changes in
  the title area only (the capsule draws the same 40pt circle).
- "Wide" / "narrow" (`HuddlesSheetLayout`, September 2026) replaces June's iPad / phone switch in the header, controls
  and footer; an iPhone is always narrow (iPad sheets can switch with `ios_huddles_sheet_size_switching`).

### 3.6 Controls bar

(`Modules/Features/Huddles/Implementation/HuddleActionButton/Subviews/HuddleActionButtonContentView.swift:96-501`,
`HuddleAVButton.swift:28-230`, `HuddleBadgedButton.swift:25-181`; container pinned to safe area
`HuddleActionButtonViewController.swift:59-63`)
- Five **40×40** round buttons (`SKIconButton` `.small`, glass), `.equalSpacing` across the width with 16pt side insets,
  24pt above them; order: **Mic, Video, Reactions, Thread, More** (Leave lives in the header in the narrow / phone
  layout; the wide layout swaps the Thread button for Leave and fills proportionally) (:96-109, :356-361, :473-485, :488-491). Snapshot `…HuddleActionButtonContentViewTest/testViewUpdatedHuddleCanvas@3x.png` (full 393×852 frame):
  buttons centered at x ≈ 36, 116, 197, 277, 357pt, row at y ≈ 429-470pt of that test frame.
- Default button: white icon on `sk_black` @70% (`configureButton`, :294-317). **On iOS 26 the glass makes it read near
  black**: measured fill #121112 with a ≈#7E7D7E 1px rim.
- **Mic** (`HuddleAVButton .audio`): unmuted = black `microphone` glyph (U+E087) on **white**; muted = white
  `microphoneSlashless` (U+E08A) on `sk_black` @70% + a `microphoneSlashonly` (U+E08B) slash in `sk_raspberry_red` that
  scales from 0.01 → 1 in a 0.3 s spring (`HuddleAVButton.swift:32-57, 72-84, 162-230`). A green level bar
  (`sk_lilypad_green` #007A5A, 3.6pt wide, up to 7pt tall, grows from the bottom in thirds with volume, 0.2 s) sits in the
  mic (:250-258, :401-422). Long-press = "Audio Preferences" (`yaml:2297`) menu (speaker/Bluetooth/handset). a11y
  "Mute"/"Unmute" (`yaml:12622`, `22586`). SVG look-alikes: `microphone.svg`, `microphone_off.svg`.
- **Video** (hidden unless video is allowed): on = black `videoCamera` glyph (U+E090) on white with a 5pt green dot
  (`sk_lilypad_green`, offset −2.5pt x) pulsing scale 1 → 0.8 and alpha 1 → 0.7 every 0.8 s ease-in-out autoreverse
  (:260-269, :453-470); off = white `stopVideoSlashless` + red slash. Long-press (camera authorized) = live self-preview
  with a "You look great today 😎" (`yaml:24208`) menu to toggle video. a11y "Turn Video On/Off" (`yaml:22349`, `22346`).
  SVG look-alikes: `video.svg`, `video_off.svg`. Measured "on" fill #F3F3F3, dot #489E88.
- **Reactions**: `svgEmoji` (`emoji.svg`), pressed `happySmile`; when you wear a sticker, the icon is replaced by the
  30pt sticker emoji popping in (0.8 s spring, damping 0.6, from scale 0.4) (:177-183, :243-248, :430-451). a11y "Add
  Reaction" (`yaml:827`). Opens §3.8.
- **Thread**: `svgThreads` (`threads.svg`); unread count badge top-right: 20pt `sk_raspberry_red`
  circle inside a 24pt ring of raspberry darkened 40%, count `.microBold` white, "9+" above 9; or the latest replier's 30pt
  avatar instead of the badge. While the thread is open beside the huddle (June: the iPad side panel; September also the
  flagged thread panel, §3.3) the button is **selected**: `svgThreadsFilled`, no badge, no avatar
  (`HuddleBadgedButton.swift:25-57, 61-101, 136-181`). Tapping it otherwise minimizes the huddle and opens the thread. a11y "Thread" (`yaml:21605`), "%@ new replies"
  (`yaml:14355`). Measured badge #E01E5A 20pt.
- **More**: `svgEllipsisHorizontalFilled`, with a 7pt red dot when the huddle canvas has edits or new themes exist
  (:49-57, :98, :169-181). a11y "More Options" (`yaml:12451`). Opens §3.7.
- Loading (before connected): five 55pt `surfaceSecondary` circles instead of buttons (:68-94, :497-500).
- Other snapshots in the same folder: `testViewInLoadingState`, `testViewWhenHuddlesAudioButtonHidden`,
  `testViewWhenHuddlesVideoDisabled`, `testViewWithRecentReplyAvatar`, `testViewWithThreadBadge`, `testViewWithUserSticker`.

### 3.7 "More" menu

(`Modules/Features/Huddles/Implementation/HuddleActionButton/HuddleActionButtonMenuBuilder.swift:61-140`,
`Menu/HuddlesMenuOption+Presentation.swift:19-279`, sheet `Menu/HuddlesMenuFeature.swift:32-64`, list
`Menu/HuddlesMenuViewController.swift:15-45`)
- Self-sized sheet with an entity list on `basePrimary`; every row is SKGenericEntity `.small` with a 24pt icon ornament
  (`contentPrimary`).
- Section **"More Options"**: Invite People (`svgUserAdd`, `yaml:10028`), Edit Topic (`svgEdit`, `yaml:8847`), Edit Theme
  (`svgImage`, `yaml:8843`, "NEW" badge in `highlight1.content` on `sk_frosty_blue` when new themes exist), Take Notes
  (`svgCanvasContent`, `yaml:21012`), Copy Huddle Link (`svgLink`, `yaml:4741`), AI notes toggle (`svgAiSummary`), Huddle
  Language (`svgGlobe`, `yaml:8308`).
- Section **"Audio & Video"** (`yaml:2300`): Audio Preferences (`svgSettings`; submenu of devices with `svgCheckFilled` in
  `highlight1.content` on the selected one, plus push-to-talk toggle), Turn Off Audio-only (`svgSound`, `yaml:22352`), Share
  Screen / Stop Screen Share (`svgScreen` / `svgScreenShare`, `yaml:8466` / `8537`), Turn On/Off Captions
  (`svgClosedCaption[Filled]`, `yaml:9153` / `9150`), Hide/Show Self View (`svgEyeClosed` / `svgEyeOpenFilled`, `yaml:8166` / `8470`).
- Last section: Share Feedback (`svgShareFeedback`, `yaml:18567`).

### 3.8 Reactions picker and feed

- **Picker** (`Modules/Features/Huddles/Implementation/Reactions/HuddlesReactionsFeature.swift:27-54`,
  `HuddlesReactionsViewController.swift:60, 87-95, 165-192, 305-308`): sheet with a **330pt** fixed detent plus a taller
  long-form detent; page controller with top tabs **Reactions** (`yaml:15556`), **Effects** (`yaml:8852`, dot when new),
  **Stickers** (`yaml:9080`), **GIFs** (`yaml:7639`, when enabled). Tips: "Stickers stay until you remove them."
  (`yaml:8534`), "Effects play a short sound and larger reaction." (`yaml:8123`), "Send Effect" (`yaml:8459`)
  (`Subviews/Stickers/TipLabelHeaderView.swift:40-49`: `.smallBody` `contentSecondary`, 16 top / 8 bottom / 4 side).
- **Reaction feed** (bottom-left of the sheet, above the controls) (`HuddleNotificationFeed/Subviews/HuddleNotificationFeedStack.swift:104-214`,
  `HuddleNotificationFeedView.swift:22-24, 50-121`): pills 16pt from the left, stacked upward 12pt apart, newest at the
  bottom; each pill = emoji(s) + name in `.bodyBold`, 1 line, insets 8/12/8/12, 8pt gap, fully rounded, 1pt
  `outlineTertiary` border on `basePrimary` (your own reaction: `highlight1.baseInverse` fill, white text, no border).
  New pills rise from just below the feed; the stack re-lays out with a 0.5 s spring (damping 1, velocity 0.8); opacity by
  position 1, 1, 0.8, 0.2, then hidden; each stays 3 s then fades out over 0.5 s; pill content springs 0.4 s (damping 0.7).
  Tapping someone else's pill sends the same reaction ("boop"); with `ios_huddles_reactji_explosion` your own pills are
  tappable too (`HuddleNotificationFeedStack.swift:37, 79-87`).
  Snapshots: `…HuddleNotificationFeedStackTest/testMultipleReactions@3x.png` (three pills "👍 John", "❤️ Jane", "🎉 Bob"),
  `testCombinedReaction`, `testCurrentUserReaction`, `testManyReactionsWithOpacity`, `testSingleReaction`;
  `…HuddleNotificationFeedViewTest/testReactionNotification@3x.png` ("👍 John Doe" pill), `testNotificationMessage@3x.png`
  ("Someone joined"), `testNotificationWithLongText`, `testReactionWithImageAvatar`, `testReactionWithLongMemberName`,
  `testReactionWithMultipleEmojis`.
- **Banners** in the footer (countdown, connection, knock-to-enter requests, NUX, jukebox) and transient notices:
  `SKBanner` tone `.genericDark`, white `.smallBody` text + optional white icon, 16pt side insets in the narrow (phone)
  layout, centered and 360pt wide in the wide one, show/hide with the default spring, transient ones auto-hide after 5 s
  (`Footer/HuddlesFooterViewController.swift:78-86, 114-161, 269-297, 353`).

### 3.9 Minimized huddle (in-app PiP) and the floating audio player

**In-app PiP** — shown when the huddle sheet is dismissed (`HuddlesSessionManager.swift:756-757`):
- 200pt wide tile, radius 12 (continuous), clipped (`Modules/Features/Huddles/Implementation/PIP/HuddlesPIPViewController.swift:24-28, 146-194`);
  the participant view is square (`HuddlesPIPParticipantView.swift:94`) → 200×200. Shows the active speaker (large
  avatar or video on `sk_foreground_min_solid_dark` #212428) or a screen share; "You’re the only one here" (`yaml:24762`)
  in `.captionBold` `contentInverseSecondary` when alone.
- Overlays: participant count "+%i" (`yaml:14962`) in a 32×32 box (`.captionBold` white on `sk_black` @70%, radius 8) 12pt
  from bottom-right; notification chip 32pt tall 6pt from top-left; 📌 32×32 12pt from top-right.
- Tap → reopens the sheet. Drag → snaps to one of 4 corners inside insets **116 top / 12 left / 168 bottom / 12 right**
  (landscape 74/12/64/12), or tucks half off-screen into 4 "hidden" corner positions with a blur
  (`Modules/Features/PictureInPicture/Implementation/PictureInPictureViewController.swift:22-29, 480-560`,
  `Modules/Features/PictureInPicture/Interface/PIPMinimizedLocation.swift:11-24`). a11y "Picture in Picture" (`yaml:14743`).

**Floating player** (audio clips, not huddles — "keep listening to an audio clip while navigating",
`Modules/Features/FloatingPlayer/Interface/FloatingPlayerFeatureInterface.swift:9-13`):
- Placement: pinned to the tab bar's top edge, raised by (its height + 12pt) when visible, **20pt** from each safe-area
  edge on Liquid Glass (12 before iOS 26; June: 12 everywhere); also lifted above a visible composer; fade + move with the
  default spring (0.4 s) (`CompactRootTabBarController.swift:532-554, 829-866`). The tab content's bottom inset grows by
  the same amount.
- Box: 62pt tall; row with 12pt side padding, 8pt gaps: [play/pause `SKIconButton` with a circular progress ring]
  [center: 4pt-gap row of tiny avatar + author name `.smallBodyBold`, and below (2pt) the channel in `.micro`]
  [close `svgClose`] (`FloatingPlayerViewController.swift:16-131, 182-215`, `FloatingPlayerPresenter.swift:44-130`).
- **iOS 26 (September 2026)**: the box is an interactive **regular Liquid Glass capsule** (no theme fill, no shadow);
  icons and the name `contentPrimary`, channel `contentSecondary`, button circles `baseTertiary` (pressed darkened 30%),
  progress ring 2pt `outlinePrimary` (`FloatingPlayerViewController.swift:16-31, 182-188`; `FloatingPlayerPresenter.swift:44-117`).
- Before iOS 26 (and everywhere in June): radius 16 (continuous), shadow black 30% at (0, 2), 3pt ring; theme colors:
  background `theme.baseInversePrimary` (default aubergine, inverted: light `_100` #39063A, dark `_0` #200221), button
  fill `theme.surfaceInversePrimary`, name and ring `theme.contentInversePrimary` (white), icons/channel
  `theme.contentInverseSecondary`; without a theme: `sk_aubergine` + white (`FloatingPlayerPresenter.swift:120-131`). Icons `svgPlayFilled` / `svgPause` /
  `svgRotate` (replay). a11y "Play" / "Pause" / "Play again" (`yaml:247`, `244`, `250`), "Now Playing: %@, %@" (`yaml:13541`).

### 3.10 Huddles in the message list

(`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/CustomPaths/HuddleMessageTransformationPath.swift:108-244`,
`Utilities/MessageFormattingHuddleUtility.swift:16-206`, background `Mappers/BackgroundStyleMapper.swift:22-26` +
`Modules/UIInfra/MessageKit/Implementation/MKCoreMessageProperties.swift:148-199`, Join button
`Modules/Features/HuddlesEmbeddable/Implementation/HuddleMessageEmbeddablePresenter.swift:30`, `HuddleMessageEmbeddableViewController.swift:17`)
- Message ornament (instead of an avatar): headphones glyph in a rounded ornament box —
  live: white (`ColorSet.Constants.white`) on `highlight2.baseInverse` (#007A5A / #177E56); ended (September 2026):
  `contentSecondary` on `surfacePrimary` (June: `sk_foreground_max` on `sk_foreground_low`); missed: `important.content`
  (#C01343 / #DE678A) on `important.base` (#FFE8EF / #300005) (`MessageFormattingHuddleUtility.swift:179-196`).
- Text colors: the body lines ("… is here too.", "… were in the huddle for …", the AI-notes status) and the message's base
  text are `contentSecondary` (#454447 / #B9BABD; June `sk_foreground_max_solid` #616061 / #9A9C9E)
  (`MessageFormattingHuddleUtility.swift:108-141`; `HuddleMessageTransformationPath.swift:306`).
- Title (author line): "A huddle is happening" (`yaml:8632`) / "You joined the huddle" (`yaml:8643`) / "A huddle happened"
  (`yaml:8625`) / "You missed a huddle" (`yaml:8726`) / "%@ missed a huddle" (`yaml:8685`); topic variants exist. Badge next
  to it: **LIVE** (`yaml:8924`) white on `highlight2.baseInverse` while live; **MISSED** (`yaml:12398`) `important.content`
  on `important.base` when you missed it (`HuddleMessageTransformationPath.swift:214-232`).
- Body: "%@ is here too." (`yaml:8673`), "%@ and %@ are here too." (`yaml:8697`), "%@ and %d others are here too."
  (`yaml:8655`), "You’re the only one here." (`yaml:8681`); after it ends: "You and %@ were in the huddle for %@."
  (`yaml:8711`), "%@ was in the huddle for %@." (`yaml:8664`), "You were in the huddle by yourself for %@. A nice, meditative
  session." (`yaml:8721`) …; AI notes: "AI notes and transcription are on." (`yaml:9115`), "AI notes will be ready here soon.
  ⏳" (`yaml:19286`). Only Block Kit blocks whose id starts with `HUD-` are rendered under it (:285-316).
- While live the whole message row gets the `highlight2.base` background (#E3FFF3 / #05241B), pressed = darkened 10%.
- If the huddle is live and you're not in it: a **"Join huddle"** (`yaml:10303`) SKButton `.primary` under the text, max
  width 398pt. `.primary` is now `highlight2.baseInverse` (#007A5A / #177E56) instead of the constant `sk_lilypad_green`
  (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:166-167`).
- Third-party call apps (Zoom etc.) use the Block Kit call block instead:
  `Modules/UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKCallBlockSnapshotTests/testStartedAndJoinable_withParticipantsAndReturnError_@3x.png`
  (card: phone icon tile, "Quarterly Planning Call with Ron Swanson", "Started 5m ago", "Meeting ID…", participant icons,
  green "Join"; light and dark) + 11 other states.

### 3.11 Huddles page (list) and face pile

- **Huddles page** (`Modules/Features/HuddlesPage/Implementation/HuddlesPagePresenter.swift:43-525`, `Views/*.swift`):
  title "Huddles" (`yaml:11481`) (or "All Past Events", `yaml:2740`); right bar `svgPlus` "Start a new huddle" (`yaml:20636`),
  hidden for frontline workers (`HuddlesPagePresenter.swift:56-67`; `HuddlesPageInteractor.swift:174-184`); the iPad
  side-panel button is gone.
  Sections: "Live huddles" (`yaml:11478`) / "Suggested huddles" (`yaml:20775`) — a horizontal row of 165×88 cards, radius 12,
  16pt side insets (`Views/LiveHuddlesRow.swift:15-16`, `LiveHuddlesCell.swift:14-20`): background image with a 50% overlay,
  face pile + "+1 other" / "+%i others" (`yaml:14956` / `14947`), conversation name `.smallBodyBlack` white, duration "%im %is"
  (`yaml:11471`) in `.micro` white @70%, live cards outlined 2pt in `highlight2.outline` (#007A5A / #259B69); suggested cards
  say "Start a huddle in\n#channel?" / "Start a huddle with\n**name**?" (`yaml:20561` / `20565`). "Past huddles" (`yaml:14592`)
  header, a 44pt filter row of 34pt `.small` buttons ("All huddles" / "Missed huddles", "With", "In"; `yaml:1631`, `12407`,
  `9164`, `8875`), date dividers (`.smallBodyBold`, 16 top / 8 bottom, hairline), and past-huddle rows styled like §3.10
  (title bold, `important.content` when missed; "View AI Notes" `yaml:9161` button with `svgAiSummary`). Empty: "Easily find and
  reference past huddle conversations here." (`yaml:14588`).
- **SKHuddleFacePile** (`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/HuddleFacePile/SKHuddleFacePile.swift:84, 222-266, 391-446`):
  round avatars **24pt** overlapping 8pt (small: 18pt / 5pt), max 5, 1pt border `basePrimary` (dark style `sk_dark_gray`,
  or none); optional leading huddle badge = SKBadge with `svgHeadphones` + count on a colored pill. Unchanged in look; with
  `ios_huddle_face_pile_perf` the avatar views are created on demand and the masks render off the main thread. Snapshots
  (now the 2 × 2 component grid: light / dark rows × normal / high-contrast columns):
  `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKHuddleFacePileSnapshotTests/testFacePileWithHuddleBadge@3x.png`
  (blue "🎧 12" pill + 3 faces), `testFacePileMultiple@3x.png` (3 overlapping faces), plus Single, SmallSize,
  WithIcon, DarkStyle and ClearBorder variants.

### 3.12 Other huddle modules (brief)

- **HuddlesOnboarding**: first-run sheet ("Start a huddle", reactions/threads/video sections) (`Modules/Features/HuddlesOnboarding/Implementation/HuddlesOnboardingViewController.swift`).
- **HuddlesUpsell**: paywall dialog for plan limits (`HuddlesUpsellDialogContentProvider.swift`).
- **HuddlesTranscript**: full-screen transcript/captions view with an empty state (`Modules/Features/HuddlesTranscript`).
- **HuddlesLiveActivity**: iOS Live Activity / Dynamic Island for an ongoing huddle (system UI; not relevant to the web clone).
- **Captions** (`Implementation/Caption`, `InlineCaption`): inline captions overlay the footer area when turned on.
- **ThreadSheet** (new, `Modules/Features/Huddles/Implementation/ThreadSheet`): the huddle's thread inside the huddle
  sheet's bottom panel (§3.3 layer 7, flag `ios_huddle_better_thread_visibility`).

### 3.13 Huddle gaps

- No full-sheet snapshot; the default background image is server-provided (not in source).
- iOS 26 glass rendering of the round buttons and the Leave pill differs from the coded colors (measured values given).
- Exact bottom padding of the controls under the home indicator comes from the safe area (not a constant).
- Huddle info screen (`Implementation/HuddlesInfo`), knock-to-enter, recording dialog and background picker not detailed.
- No snapshots of the flagged thread panel, the horizontal grid, the header recording button or the reactji explosion.

---

## 4. Files (Docs), Canvas, Lists

### 4.1 How Files is reached

- **iOS 26**: there is no Files tab. More → the **"Files"** row, which is always enabled on liquid glass
  (`Modules/Features/TabBarOverflowPage/Implementation/OverflowTabItems/DocsOverflowTabItem.swift:21-38`). The More page
  (row order, chrome, badges, press state) is already specced in `shell-navigation.md` §4.1–4.2. The Files row is
  SKGenericEntity `.medium` with a clear 36pt box holding `svgCanvasBrowser` (`canvas_browser.svg`, SKIconManifest.swift:3773) in
  `contentPrimary`, title "Files" (`files`, `yaml:7101`) `.body`, subtitle "Browse your canvases, lists and attachments"
  (`files_tab_subtitle`, `yaml:7131`) `.caption` `contentSecondary` (`Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPagePresenter.swift:85-115`).
- **Tap** always pushes `DocsRoute(entrypoint: .moreTab)`, dismissing any modals, not pushing again when Files is
  already on top, and resetting the stack (`Modules/Features/TabBarOverflowPage/Implementation/TabBarOverflowPageFeature.swift:125-126`).
  September 2026 removed the `FilesBrowserRoute` branch: the `.customFilesSection` flag (off) now switches the Docs
  screen itself to the FilesBrowser plugins (§4.3).
- **With the Slackbot tab** (flag `slackbotBottomTab`) there is no More tab, so each More-page destination (Files, Sales,
  Agentforce, Assigned to you, External connections) becomes a **Home synthetic tile** (`OverflowTabTile`, compact only):
  the More row's icon, title and badge on a themed tile; Files opens `DocsRoute(entrypoint: .homeTab)` the same way
  (`Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/OverflowTabTile.swift:21-72, 122-138, 163-172`).
  This closes June's gap (no route to Files with the Slackbot tab). The Home tiles themselves are `home.md`'s.
- **From Search**: the zero state's recent-files "see all" pushes Docs with entry point `.searchRecentFiles`, titled
  "Recent Files" (`recent_files`, `yaml:15816`) (`Modules/Features/Find/Implementation/SearchContent/SearchContentFeature.swift:489-494`;
  `Modules/Features/Docs/Interface/DocsFeatureInterface.swift:29-36`).
- **Before iOS 26**, Files is the 4th tab unless Sales or Agentforce takes that slot (§0).

### 4.2 Files screen (`DocsViewController`, the default)

Source: `Modules/Features/Docs/Implementation/` (`DocsViewController.swift`, `DocsPresenter.swift`, `DocsInteractor.swift`,
`DocsFeature.swift`, `DocsFilterFileTypes/`); filter and sort rows from `Modules/UIInfra/MoreTabUI/Implementation/`
(`MoreTabSyntheticFilterRowPresentationObjectFactory.swift`, `MoreTabSyntheticSortRowPresentationObjectFactory.swift`); chips are
`SKTabBar` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TabBar/SKTabBar.swift`, `TabBarCollectionViewCell.swift`).

**Chrome**
- Nav bar: an inline detail title, "Files" (`R.strings.files`, `yaml:7101`) from More or Home, "Recent Files" from Search
  (`skNavigationItem` `.detailTitle(navBarTitle)`, `DocsViewController.swift:114`; `DocsFeatureInterface.swift:29-36`).
  Right bar button `svgPlus` (`plus.svg`, SKIconManifest.swift:4096), `renderOriginal`, a11y "Create new file"
  (`yaml:4966`). It opens a menu titled "Create" (`yaml:4995`) with "New List" (`svgLists`, `yaml:12834`), then "New Canvas"
  (`svgCanvas`, `yaml:12797`). The button exists only if the user can create one of the two and isn't a frontline worker
  (`DocsPresenter.swift:1768-1816`). In the data state it is hidden when the FAB is shown (`:447-465`). On the unified
  navigation root (`NavigationArchitectureVariant().isUnified`) the title and "+" travel in one `SKNavigationItem`
  (`:1753-1766`; `DocsViewController.swift:125-130, 186-195`).
- View background `basePrimary`. The list is full-bleed (not pinned to the safe area; on the plugin path it sits under a
  pinned tab bar, §4.3) with background `basePrimary` (#FFFFFF / #1A1D21, trueDark #000000, elevatedDark #1D1C1D: the
  same values as June's `sk_primary_background`) (`DocsViewController.swift:112-116, 146-162`; `DocsPresenter.swift:443`).
- **FAB** appears only with the docs-home flag on, the user able to create (and not frontline), and creation-entry-points
  off (`DocsPresenter.swift:1729-1749`). It is the themed FAB (`ColorSetFABConfigurator`, see `home.md` §10.1) with the icon-font
  `plus` glyph (`\u{e279}`, SKIconManifest.swift:3220), a11y "Create New" (`yaml:8833`) and the same Create menu. It sits 16pt
  from the trailing edge and 16pt above the bottom layout margin (`DocsViewController.swift:125-133`).
- Conforms to `ScrollableToTop`: a scroll-to-top request scrolls back to the top, animated (`DocsViewController.swift:252-258`).

**List, top to bottom**
1. **Low-content banner**. Shown only if it hasn't been dismissed before, there are fewer than 10 files, the filter is "All",
   and the team is paid or on trial (`DocsPresenter.swift:32-44, 372-379, 482-517`).
   - SKBanner `.regular`, tone `.info`: background `highlight1.base` #E3F8FF / #001A2D; 1pt border
     `highlight1.outlineSecondary` #0E9DD3 @20% / #307EC0 @20% (Colors.swift:314); text `contentPrimary`.
   - Padding 16 horizontal × 12 vertical, spacing 12, radius 12. Body `.body`, heading `.bodyBold`
     (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Banner/SKBanner.swift:112-164, 208-249, 288-295`; same folder
     `Banner.swift:46, 258-263, 375-384`).
   - Ornament: icon-font `allFilesAlt` (`\u{e107}`, SKIconManifest.swift:3037) in `highlight1.content` #1264A3 / #2BA5CE.
     A trailing ✕ dismisses it permanently (`DocsViewController.swift:233-234`).
   - Copy: heading "Jump right into recent files" (`docs_low_content_body`, `yaml:5701`); text "Here you have easy access to
     your canvases, lists, and attachments." (`docs_low_content_heading`, `yaml:5704`). The keys are swapped in code
     (`DocsPresenter.swift:494, 498`).
2. **Filter chip row**. Custom edge-to-edge row, 54pt tall (`SKTabBar.swift:301-307`), horizontally scrollable
   (`.fitAllContent`). Content inset: top 0 with the docs-home flag (8 without), left/right 12. Dynamic Type is capped at
   18pt (`DocsPresenter.swift:574-624`). Frontline workers don't get the "Created by you" chip (:597-602).
   - **Geometry** (`TabBarCollectionViewCell.swift:35-52, 282-290, 320-361, 467-487`):
     - Each pill is inset 9 top/bottom and 4 left/right inside its cell, so pills are 36pt tall with 8pt between them.
     - Radius 10 (continuous), 1pt border `outlineTertiary`.
     - Contents: 24pt icon box (20pt glyph), 4pt gap, title. 16pt padding on each side of the pill; contents centered.
     - Cell width is clamped to 88–200 (pill 80–192).
     - Measured in `testPaidEmptyState`: first pill x 16–126.7, "All" x 134.7–214.7 (80pt, the minimum), y 9–45,
       border #EAEAEA.
   - **Colors** (`MoreTabSyntheticFilterRowPresentationObjectFactory.swift:57-71`; `TabBarCollectionViewCell.swift:365-383`):
     - Unselected: clear fill; text and icon `contentSecondary` #454447 / #B9BABD (measured #454447) in `.smallBody` (15 regular).
     - Selected: fill `highlight1.baseInverse` #1264A3 / #0A77A7; text and icon `contentInversePrimary` #FFFFFF / #F8F8F8 in
       `.smallBodyBold`.
     - Colors blend as the selection moves; the selection pill shows once the selection is more than halfway onto a chip
       (`selectionProgressThreshold` 0.5, `TabBarCollectionViewCell.swift:35-52, 282-290`).
   - **Chips, in order** (`DocsPresenter.swift:583-601`; factory `MoreTabSyntheticFilterRowPresentationObjectFactory.swift:80-153, 185-213`):

     | Chip | Label | Icon |
     |---|---|---|
     | File types | "All" if all 10 types are on, "1 Type" (`yaml:5730`), else "%d Types" (`yaml:5739`); the default is "5 Types" | trailing `svgRefine` (`refine.svg` :4125) |
     | All | "All" (`yaml:1603`) | none |
     | Starred | "Starred" (`yaml:20543`) | leading `svgStar` (`star.svg` :4226) |
     | Created by you | "Created by you" (`yaml:11325`) | leading `svgUser` (`user.svg` :4299) |
     | Shared with you | "Shared with you" (`yaml:11328`) | leading `svgShareMessage` (`share_message.svg` :4185) |

     Chip a11y is "Filter by %@" (`yaml:7154`). The selected chip is scrolled into view (see `testNoResultsUnderStarred`).
3. **Sort row**. Omitted when the filter is Starred or Created by you (`DocsPresenter.swift:251, 542-564`).
   - SKPillButton on a clear background: current sort in `.smallBodyBold` `contentPrimary`, then a trailing `svgCaretDown`
     (`caret_down.svg` :3780) in `contentPrimary`.
   - Insets: top 4 (12 without docs-home), left 15, bottom 12, right 12 (`DocsPresenter.swift:626-649`;
     `MoreTabSyntheticSortRowPresentationObjectFactory.swift:39-70`). Measured glyphs x 16–146.3, y 62.3–76.
   - Tap opens a menu titled "Sort by" (`yaml:20493`): "Recently viewed" (`yaml:11452`) / "Last updated" (`yaml:11449`), with
     a checkmark on the current one (`:72-106`). a11y "Sort" (`yaml:20484`) + the current title.
4. **File rows**. All are SKGenericEntity `.medium`: margins 10/16/10/16, 36pt ornament, 12pt gap, title `.body` `contentPrimary`
   with no line limit, subtitle `.caption`. A one-line row is 56pt (measured below) (`DocsPresenter.swift:651-969`).
   - **Canvas**
     - Ornament: 36×36 box, radius 9, background lagoon `_50` #0E9DD3 / #1699CA (Colors.swift:1454; measured #0E9DD3).
       Icon `svgCanvasContentFilled` (`canvas_content_filled.svg` :3774), 20pt box, white
       (`Modules/UIInfra/SlackKit/Implementation/Extensions/UIColor+FileTypeExtensions.swift:15-52, 69-70`;
       `Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift:62-63`;
       `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/GenericEntity/SKGenericEntity+Extensions.swift:14-19`).
     - Subtitle, in `contentSecondary` (#454447 / #B9BABD; June: `sk_foreground_max`, #1D1C1D @70% / #D1D2D3 @70%)
       `.caption`: for templates, "Template" (`yaml:3438`) in indigo `_50` (#4864D2 / #4D65C5, Colors.swift:1598) followed
       by " | ". Then the relative time: last read when the filter is All and the sort is Recently viewed, otherwise last
       updated (`DocsPresenter.swift:250, 664-675, 704`).
     - **Skill** canvases: ornament `svgAiSkills` (`ai_skills.svg` :3632) in aubergine `_70` (#83388A / #CFA1DE) on aubergine
       `_10` (#F4DAFF / #431349), plus an adjacent "Skill" tag (`yaml:19202`) in the same colors
       (`SKGenericEntity+Extensions.swift:31-65`).
   - **List**: box background honeycomb `_50` #D38D00 / #C48305 (Colors.swift:950) with a white `svgListsFilled`
     (`lists_filled.svg` :3996) (`DocsPresenter.swift:846`; `SKIconManifest+FileType.swift:100-101`;
     `UIColor+FileTypeExtensions.swift:113-114`). Subtitle is the time string in the entity default `.caption`
     `contentSecondary`.
   - **Other files**: an image or video with a thumbnail uses the 80px thumbnail as the ornament. Everything else gets a box
     with a white type icon on the type's palette `_50` (`DocsPresenter.swift:897-969`; `UIColor+FileTypeExtensions.swift:55-126`;
     `SKIconManifest+FileType.swift:48-110`). Unknown types get a `surfacePrimary` box with a `contentSecondary` icon (`UIColor+FileTypeExtensions.swift:16, 39`).
     Since September they show the star too when starred (see below).

     | Type | Palette `_50` (light / dark, Colors.swift) | Icon (svg, SKIconManifest.swift line) |
     |---|---|---|
     | PDF | flamingo #EF3E75 / #D94C75 (:1814) | `svgPdfFileFilled` (`pdf_file_filled.svg` :4085) |
     | image | ocean #2985CD / #307EC0 (:1526) | `svgImageFilled` (`image_filled.svg` :3957) |
     | audio | ocean | `svgSoundFilled` (`sound_filled.svg` :4209) |
     | video | mojito #2FA659 / #369D56 (:1238) | `svgVideoFilled` (`video_filled.svg` :4302) |
     | email | ocean | `svgEmailFilled` (`email_filled.svg` :3866) |
     | doc / docx | ocean | `svgBrandMicrosoftWordFilled` (`brand_microsoft_word_filled.svg` :3727) |
     | xls / xlsx / csv | mojito | `svgBrandMicrosoftExcelFilled` (`brand_microsoft_excel_filled.svg` :3724) |
     | ppt / pptx | tomato #DE4E2B / #D05038 (:662) | `svgBrandMicrosoftPptFilled` (`brand_microsoft_ppt_filled.svg` :3726) |
     | Google Doc | ocean | `svgDocument` (`document.svg` :3851) |
     | Google Sheet | mojito | `svgSpreadsheet` (`spreadsheet.svg` :4221) |
     | Google Slides | tangerine #E96825 / #D56A37 (:806) | `svgPresentation` (`presentation.svg` :4105) |
     | text | ocean | `svgText` (`text.svg` :4264) |
     | binary / numbers | gray #7C7A7F / #797C81 (:590) | `svgNumber` (`number.svg` :4071) |

     New since June: folders (`svgFolder` / `svgFolderFilled`) and shared threads (`svgThreads` / `svgThreadsFilled`) get
     icons, on the unknown-type `surfacePrimary` box (`SKIconManifest+FileType.swift:122-125`;
     `UIColor+FileTypeExtensions.swift:122`).
   - **Starred** rows (canvases, lists and, new, other files) get a trailing `svgStarFilled` (`star_filled.svg` :4225) in
     `sk_sunshine_yellow` #F2C744 (`SKLegacyColors.swift:217`), a11y "starred" (`yaml:550`) (`fileRowAccessory`,
     `DocsPresenter.swift:1196-1255`). On the plugin path a row in a custom collection shows that collection's emoji (or
     `svgSection` in `contentSecondary`) instead, and none on a collection's own tab.
   - **Tap**: canvas → `CanvasRoute` (§4.4), list → `ListViewRoute` (§4.5), anything else → `FileRoute` (file viewer)
     (`DocsInteractor.swift:447-470`; `DocsFeature.swift:247-287`).
   - **Long-press, canvas** (`DocsPresenter.swift:780-836`):
     - Section 1: "Unstar Canvas" (`yaml:22671`, `svgStarFilled`) or "Add to Starred" (`yaml:937`, `svgStar`); "Share in Slack"
       (`yaml:18511`, `svgShareMessage`) and "Copy Link" (`yaml:4753`, icon-font `link`) unless the canvas is shared in Slack
       Connect; then extra items loaded later (the Later / Saved / to-do toggles, `DocsInteractor.swift:839-865`). On the
       plugin path the star item is replaced by a collections submenu
       (Add to… / Remove, `Collections/CollectionMenuBuilder.swift`).
     - Section 2: "Delete Canvas" (`yaml:5286`) or "Delete Template" (`yaml:5350`), `svgTrash`, destructive, only for the
       creator, an owner or an admin.
   - **Long-press, list or file**: a section titled with the file name: "Unstar list" (`yaml:22674`) or "Add to Starred"
     (lists only), "Share in Slack", "Copy Link", then extra items loaded later; and, September 2026, **"Delete"**
     (`yaml:5283`, destructive) in its own untitled section when allowed (June: the last item of the first section)
     (`DocsPresenter.swift:971-1030`).
   - **Pagination**: the list asks for the next page as you scroll (`DocsViewController.swift:237-238`); the bottom pagination
     state comes from the paginator (`DocsPresenter.swift:442`).

**States**
- **Loading** (`DocsPresenter.swift:1281-1352`): the filter and sort rows, then 12 skeleton rows (SKLoadingEntity `.medium`, image
  mask, placeholder `surfacePrimary` #1D1C1D @6% / #F8F8F8 @6%; June: `sk_foreground_low` #1D1C1D @13% / #D1D2D3 @13%).
- **Error** (`:1693-1727`): SKEmptyState with image `generic_error_empty_state`, "Something Went Wrong" (`yaml:20396`), "Try again
  in a few minutes." (`yaml:7564`) and an outline "Retry" button (`yaml:16649`)
  (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/EmptyState/SKEmptyState+GenericErrorEmptyState.swift:12-22`). No filter row.
- **Empty** (`:1360-1513`): an SKEmptyState (metrics in §1.2) below the filter and sort rows, which stay visible so the user can
  change filters. Background `basePrimary` (June `sk_primary_background`, same values). Frontline workers get neither the
  create buttons nor the trial upsell (:1411-1433).
  - Images: `docs_empty_state_data` (purple canvas + yellow folder) and `filter_empty_files` (teal magnifier) (`:1819-1828`).
  - Button styles: outlineDefault is `.medium` with `svgPlus`, a 1pt `outlineSecondary` border (#5E5D60 @45% / #797C81 @50%;
    measured #B6B6B7), `basePrimary` fill, `contentPrimary` text, pressed fill `baseTertiary` lightened 80%. Primary is a
    `highlight2.baseInverse` fill (#007A5A / #177E56; June the constant `sk_lilypad_green` #007A5A) with white text
    (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:135-213`; in the same
    change `.danger` became `important.baseInverse`, `.outlinePrimary` / `.outlineDanger` borders `highlight2.outline` /
    `important.outline`, `.systemDanger` text `important.content`).
  - Measured in `testPaidEmptyState`: image x 140–243.3, y 343–461; title glyphs y 474.3–494.3 (`.title` 22 black, #1D1C1D);
    body y 508.3–544 (2 lines, #454447); buttons y 561–600.7 (≈39pt), "New Canvas" x 72.3–204.3, "New List" x 213–321.

  | Case | Image | Title | Body | Buttons |
  |---|---|---|---|---|
  | Default (user can create; a button only for each type they can create) | docs_empty_state_data | "Get your work done in Slack" (`yaml:19430`) | "Collect and share information with a canvas, or track your next project in a list." (`yaml:19426`) | outline "New Canvas", "New List" |
  | Can't create, trial eligible | same | same | same text (`yaml:5697`) | primary "Try Pro Free" (`yaml:5733`) |
  | Can't create, trial ineligible | same | same | same | primary "Learn More" (`yaml:1981`) |
  | Can't create, downgraded | same | same | "Upgrade to a paid plan to continue working in canvases and lists." (`yaml:5736`) | primary "Compare Plans" (`yaml:3395`) |
  | Starred, nothing | filter_empty_files | "No starred files" (`yaml:5722`) | "No starred files found, try refining your search." (`yaml:5726`) | none |
  | Shared with you, nothing | filter_empty_files | "No files found" (`yaml:5707`) | "No files found with these filters. Try adjusting your search to see more results." (`yaml:5711`) | none |
  | File-types chip selected, non-default types, after interaction | filter_empty_files | "No files found" | same as above | none |
  | File-types chip selected, default types, Recently viewed, after interaction | filter_empty_files | "No recently viewed files" (`yaml:5716`) | "No recently viewed files found, try opening a file to see it here." (`yaml:5719`) | none |

**File types sheet** (tap the first chip): presented modally (`Modules/Features/Docs/Implementation/DocsFilterFileTypes/DocsFilterFileTypesRouteExecution.swift:10-12`).
- Header: SKNavigationTitle "File types" (`yaml:7040`), a close button, and "Done" (`yaml:5777`) on the right, disabled until the
  selection changes. Since September it goes through the navigation-title configurator (the same look on the legacy root)
  (`DocsFilterFileTypesViewController.swift:34-50`; `DocsFilterFileTypesPresenter.swift:35-50`). Background
  `containerPrimary` #FFFFFF / #212428.
- Rows: SKGenericEntity `.small` with a checkbox accessory, in this order: Lists, Canvases and Documents, Spreadsheets,
  Presentations, PDFs, Audio, Videos, Images, Snippets, Emails (`yaml:11249, 3466, 20527, 15153, 14650, 2294, 23156, 9589,
  20296, 6215`). The first five are checked by default (`Modules/Features/Docs/Interface/DocsPaginationFilter.swift:55-57`).
- Row a11y: "<type>, Checkbox, Is checked / Is unchecked" (`DocsFilterFileTypesPresenter.swift:81-99, 109-113`).

**Snapshots**: `Modules/Features/Docs/Snapshots/iOS_26/DocsFeatureTests.DocsViewControllerSnapshotTests/`. All are light, with no
nav bar in frame, docs-home on and creation-entry-points on (so no FAB) (`Modules/Features/Docs/Tests/Unit/DocsViewControllerSnapshotTests.swift:187-230`):
- `testPaidEmptyState@3x.png`: chips "5 Types" / **All** / Starred / C…, "Recently viewed ⌄", the illustration, title, body and
  two outline buttons.
- `testOnTrialState` and `testNoRecentlyViewedFiles`: pixel-identical to `testPaidEmptyState` (checked by image diff).
- `testNoResultsWhileFiltering`: identical except the chip reads "0 Types". The test doesn't select the file-types chip, so the
  "No files found" copy never renders.
- `testNoResultsUnderStarred`: **Starred** selected (row scrolled), no sort row, magnifier, "No starred files". Re-recorded
  since June (0.8 % of pixels, the scrolled chip row); the others are pixel-identical to June's.
- `testTrialEligibleState`: green "Try Pro Free".
- `testTrialInEligibleState` and `testTrialDowngradedState`: differ from paid only within y 342.7–601 ("Learn More" /
  "Compare Plans"; the downgraded one also has the upgrade body).
- No snapshot shows a data row. The closest is the CanvasSynthetic row below.

**Row reference PNG**:
`Modules/Features/CanvasSynthetic/Snapshots/iOS_26/CanvasSyntheticFeatureTests.CanvasSyntheticViewControllerSnapshotTests/testView@3x.png`.
This is the legacy "Canvases" browser. Its only route is the `.canvases` overflow case, which is not registered
(`TabBarOverflowPageFeature.swift:119-120`). It shows the same chip style: **All**, "Created by you", "Shared with…",
"Recently viewed ⌄", then canvas rows. Re-recorded since June: the test frame no longer leaves a blank 54pt navigation
area on top, and a 3-row pagination skeleton now follows the last row; the layout is unchanged. Measured (September PNG):
chips y 17–53 ("All" x 16–96, #1264A3), "Recently viewed" glyphs y 62.7–76.3, ornament x 16–52, 36pt, radius ≈9, #0E9DD3;
white glyph ≈16.3pt drawn (x 25.7–42, centered in a 20pt box); title glyphs start at x 65, color #1D1C1D; rows on a
**56pt pitch** (ornaments at y 100, 156, 212…; June 154, 210, 266). The last row shows an emoji inline in the title.
`testEmptyView@3x.png` and `testEmptyViewWithCanvasOrgPrefDisabled@3x.png` are its empty states.

### 4.3 FilesBrowser plugins (flag `customFilesSection`) and FilesList

**FilesBrowser** (September 2026: no screen of its own any more; `Modules/Features/FilesBrowser/Implementation/` is a
plugin manager with a filter plugin and a collections plugin, `FilesBrowserFeature+Dependencies.swift:28-75`, that the
**Docs** screen hosts when `ios_custom_files_section` is on; default off, `Modules/Data/Toggles/Definitions/ios_custom_files_section.json`).
On that path (`DocsPresenter.swift:104-132, 222-239, 519-541, 1057-1185, 1580-1692`; `DocsViewController.swift:28-50, 146-162, 201-224`):
- An SKTabBar is pinned under the safe-area top, above the list, content inset 0 / 8 / 0 / 8
  (`DocsViewController.swift:19, 220`). Pill tabs with leading ornaments: unselected text `contentPrimary` (not
  `contentSecondary`), selected `highlight1.baseInverse` with `contentInversePrimary`, borders `outlineTertiary`
  (:201-224). Tabs: "All", "Created by you" (`svgUser`), "Shared with you" (`svgShareMessage`)
  (`Plugins/FilesBrowserPaginationFilter.swift:16-52`), then one tab per file collection, titled with its name, with its
  emoji (Starred: `svgStar`) (`Plugins/FilesBrowserCollectionsPlugin.swift:44-69`). No Starred or File types chips.
- Instead of the chip row and sort row, one **controls row**: a file-type pill "Filter: All / 1 Type / %d Types"
  (`todos_filter_with_single_value` 'Filter: %@', `yaml:21847`) whose menu "Filters" (`yaml:7157`) has two sections of
  on/off types (Lists, Canvases and Documents, Spreadsheets, Presentations, PDFs | Audio, Videos, Images, Snippets,
  Emails), and, trailing, a sort pill "Sort: Recently viewed / Last updated" (`todos_sort_with_value`, `yaml:21862`) with
  a "Sort by" menu. Both are clear SKPillButtons: prefix `.smallBodyBold` `contentPrimary`, value `.smallBody`
  `contentSecondary` (capped at 18pt), trailing `svgCaretDown` (`DocsFilterControlsRow.swift`; `DocsPresenter.swift:1072-1185`;
  `Modules/Features/FilesBrowser/Interface/FilesBrowserFileType.swift:84-87`).
- No low-content banner. Rows are §4.2's, with the collection accessory (emoji / star / `svgSection`) on filter tabs and
  none on a collection tab, and a collections submenu (Add to… / Remove) in the long-press menus.
- Empty states are per tab: the filter tabs' own copy, or for a collection "Nothing in %1$@" (`nothing_in_collection`,
  `yaml:13244`) / "Get started by adding a new canvas or list." (`yaml:7607`) with the `section-empty-file` image and the
  create buttons; the trial upsell still overrides (`DocsPresenter.swift:1580-1692`;
  `Plugins/FilesBrowserCollectionsPlugin.swift:71-81`).
- No snapshots of this path.

**FilesList** is a channel's file list, opened from MediaGallery (`Modules/Features/MediaGallery/Implementation/MediaGalleryFeature.swift`):
- Title view "Documents" (`yaml:5745`), with the conversation's `nameWithIconPrefix` as the subtitle
  (`Modules/Features/FilesList/Implementation/FilesListPresenter.swift:130-132`).
- Rows: SKGenericEntity `.medium` with the file-type ornament, title up to 3 lines, subtitle "<author> · <relative date>"
  (`search_file_metadata`, `yaml:17086`) up to 2 lines, plus the "Skill" tag, and (new) a "Skill set" tag for skill sets
  (indigo `svgBook` on indigo `_10`, `SKGenericEntity+Extensions.swift:31-65`) (`:134-169`).
- Loading: skeleton `.medium` with image mask (`:23-26, 105-113`). Empty: magnifying-glass image and "No files found" (`:115-128`).
  Failure: "Oops! Something went wrong." (`yaml:14022`, `:57-58`).
- No snapshots.

### 4.4 Canvas: what opening one looks like (brief)

- **Document body**: rendered by the Quip SDK's `docViewController` (`internal.MODULE.bazel:38-64`, now pinned with a
  Webapp commit too), which is not UIKit code in this repo. Its typography and blocks are not specced here (gap).
- **Nav bar** (`Modules/Features/Canvas/Implementation/CanvasPresenter.swift:202-240`; `Modules/Integration/HeaderHelper/Interface/HeaderBarButtonPresentable.swift:233-342`):
  - Left: a close button when presented modally, then the `.titleAndSubtitle` title button (`HeaderBarButtonPresentable.swift:232-242`).
  - Right, leading to trailing (the September array order is screen order): *(flag)* the Slackbot entry
    (`svgSlackbotColor`, "Ask anything"; `ios_slackbot_in_canvas`, off, and only for a loaded canvas you can access and
    aren't editing: `CanvasInteractorInputPublishersFactory.swift:178-198`; `CanvasPresenter.swift:224-240`); share
    `svgShareMessage`, a11y "Share in Slack" (`Modules/Integration/HeaderHelper/Implementation/HeaderHelperService.swift:157-162`);
    skill Add to library / Run (skills only); the overflow `svgEllipsisHorizontalFilled` menu, a11y "Show more options"
    (`yaml:18972`) (`HeaderBarButtonPresentable.swift:244-276`; `CanvasPresenter.swift:202-226`). On screen that is the
    June order with the new Slackbot button in front.
  - While editing (the SDK header component's `shouldShowDoneButton`, `CanvasInteractorInputPublishersFactory.swift:113-116`;
    September 2026: whether or not undo/redo is on) the bar becomes undo / redo on the left and overflow + **Done** on the
    right, Done trailing (`CanvasPresenter.swift:206-214, 722-737`).
- **Loading skeleton** (`Modules/Features/Canvas/Interface/Loading/CanvasLoadingStateView.swift:162-188`, `CanvasLoadingItem.swift:10-17, 127-162`).
  - Colors: `basePrimary` with cut-outs showing a shimmer that runs from `surfacePrimary` (#1D1C1D @6% ≈ #F1F1F1 on white) to
    `surfaceSecondary` and back, over 1.8 s (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/LoadingState/Views/SKLoadingShimmerView.swift:19-27, 77-102`).
  - Shape metrics: 36pt side margins, 16pt-tall bars with radius 4 and 8pt line spacing; a 36×36 emoji block + title bar at the
    top; the pattern repeats to fill the screen.
  - Measured: emoji block x 36–72, y 28–64; title bar from x 88, y 38–54; full-width bars (x 36–357) at y 100, 124, 148, 172;
    a half-width bar at 196; a ¾-width bar at 248; bars at 292, 316, 340; a 164pt card at 380.
  - Snapshot: `Modules/Features/Canvas/Snapshots/iOS_26/CanvasFeatureTests.CanvasLoadingStateViewTests/testView@3x.png`.
- **Floating banner** (template, view-only, comment-only, editor limit) (`CanvasPresenter.swift:312-350, 523-543`;
  `Modules/Features/Canvas/Implementation/CanvasViewController.swift:35-40, 261-283`). Not shown while the server hasn't
  confirmed your access level yet (:527-530); the free-plan megaphone no longer suppresses it.
  - SKBanner `.regular`, text `.smallBody`, trailing ✕. Default tone `.genericLight` (`baseTertiary` background,
    `contentPrimary` text). Templates use an indigo `_50` background (#4864D2 / #4D65C5) with `contentInversePrimary` text.
  - Placement: pinned 16pt from the sides and 16pt above the context bar.
  - Copy: "You're editing a template." / "You're viewing a template." (`yaml:3442` / `3450`); "View only" (`yaml:23249`);
    "Comment only" (`yaml:3344`); "Due to high usage, this canvas is currently in view-only mode. Recent changes may not be
    visible." (`yaml:3324`).
  - Measured in `test_view_with_templateBanner@3x.png`: x 16–376.7, y 779.3–823.7 (44pt), radius ≈12, #4864D2, text from x 32.3,
    ✕ glyph x 344.3–357.3.
- **Other snapshots** in `…/CanvasFeatureTests.CanvasViewControllerViewTests/`:
  - `test_view_with_megaphoneHeaderBanner@3x.png`: top banner x 16–376.7, y 62–106.3, fill #F8F8F8, aubergine clock icon,
    "Megaphone Header Banner", gray ✕.
  - `test_view_withSlackConnectBanner@3x.png`: bottom context bar, a pill x 16–376.7, y 798.3–839.7, fill #FFF2E0, text
    "Ext Team is in this canvas" from x 33. Context-bar insets are 13/16/13/16 (`CanvasViewController.swift:37`).
- **No-access overlay** (`Modules/Features/Canvas/Implementation/UI/FileNoAccessOverlayView.swift:17-23, 44-121, 131-154, 178`).
  - Layout: `basePrimary` background; a centered vertical stack (spacing 10, 44pt side insets, centerY +10) with an icon-font
    `lockLarge` 20×20 lock, the title (`.bodyBold` `contentPrimary`, 5pt top offset) and the description (`.caption`
    `contentPrimary`). When access can be requested, an outline `.medium` "Request Access" button (`yaml:16489`) follows,
    18pt below the description.
  - After requesting: "Request sent" (`yaml:16503`) and "You’ll be notified once it’s been shared with you" (`yaml:24472`, in
    `sk_dark_gray` #616061); the lock and button are removed.
  - Other copy (`CanvasPresenter.swift:545-592`): "You don’t have access" / "You can request access from the owner"
    (`yaml:24322` / `24264`); "Can’t view this canvas" (`yaml:3287`) + "Another team owns this canvas. Canvases from external
    organizations can’t be viewed by members of %@." (`yaml:3300`); the default is "This file isn’t visible to you"
    (`yaml:6915`).
  - Measured in `…/CanvasFeatureTests.FileNoAccessOverlayViewTests/testRequestAccessView@3x.png`: lock x 189–204, y 368.3–386;
    title y 406–419; description y 436–447.7; button x 133–260, y 466.7–504.3.
  - Siblings: `testRequestSentView`, `testAccessDeniedView`, `testTemplateAccessDeniedView`,
    `testSlackConnectCanvasSharingBlockedView`.
- **Embed placeholders** (shown while embedded content loads): `…/CanvasFeatureTests.CanvasPlaceholderViewTests/` covers audio,
  canvas, file, image, link, list, profile, Salesforce record, video and workflow.

### 4.5 Lists: what opening one looks like (brief)

- **Open**: `ListViewRoute` → `Modules/Features/Lists/Implementation/ListView/ListViewViewController.swift`, which hosts the
  kanban-style `ListItemsView`.
- **Layout on phone**: groups are stacked vertically.
  - Group header: title (e.g. "Choice 1"), then a count pill tinted with the choice color (measured #F6E4FF fill with #83388A
    text for an aubergine choice), then a collapse chevron at the far right (x 350.7–367). Header text starts at x ≈24.5;
    8pt spacing inside the header
    (`Modules/Features/Lists/Implementation/ListView/ListItems/KanbanFeature/Subviews/ListKanbanSectionHeaderView.swift:43, 77-102`).
  - Cards (same `Subviews/` folder: `ListKanbanRecordCell.swift:66-71`, `ListKanbanRecordView.swift:59-71`): radius 12, 1pt border, x 16–377.
    16pt top/bottom padding, 12pt stack spacing. Title bold, up to 2 lines (3 when expanded). Field tokens are 26pt tall, e.g.
    a tag icon + "Choice 1" in gray.
  - Between groups: a full-width 1pt #EAEAEA divider 17pt below the last card, and 51pt from the divider to the next card.
  - Measured in `…/ListsFeatureTests.ListKanbanFeatureSnapshotTests/testTodosGroupedBySelect@3x.png`: first card y 59–143.7,
    divider at y 160.7.
- **Loading**: 40pt refine-pill shimmers, 200pt card shimmers with 16pt spacing, radius 12 (same `Subviews/` folder, `ListKanbanLoadingView.swift:13-18`).
- **Record detail**: `…/ListsFeatureTests.ListRecordFeatureSnapshotTests/` (40+ PNGs, one per field type, e.g.
  `testDueDateField_filledDate@3x.png`, re-recorded since June with the content 54pt higher: no blank navigation area in
  the test frame). It shows:
  - the primary column text in bold;
  - an outlined full-width "Add a comment" button (`add_a_comment`, `yaml:645`, comment+plus icon);
  - a hairline;
  - a field label "Due Date" (`yaml:5917`) with a calendar icon and "June 5, 2025 ⌄";
  - an outlined "Add field" button with a plus (`lists_add_field`, `yaml:11263`).
- **Unfurl card**: `…/ListsFeatureTests.ListRecordUnfurlViewControllerSnapshotTests/testLoadedState@3x.png`. A 36pt honeycomb
  list ornament (#D38D00, at x 16, y 10), bold title "Test Title" and gray subtitle, with a 1pt #7C7A7F border and rounded
  corners. Also Loading, Deleted, Archived, Completed and NotFound variants.
- **Other kanban PNGs** (same folder): `testCellCreate` (add card), `testRecordWithEmptyValues*`, `testMultipleValueFlow*`
  (compact/expanded), `testTodosRecordsGroupedByReminder`.

### 4.6 Files / Canvas / Lists gaps

- There are no iOS 26 snapshots of: the Files screen with data rows, the nav bar with its title and +, the low-content banner,
  the File types sheet, the FilesBrowser plugin path, FilesList, or a full canvas or list screen with a nav bar.
- The Files title is an inline detail title (`.detailTitle`, §4.2); September settled June's large-vs-inline question.
- The canvas document rendering (Quip SDK) is outside this repo.
- The "No files found" / "No recently viewed files" empty states have no snapshot, despite the test names.
- June's "no Files route when the Slackbot tab replaces More" is resolved: the Home overflow tiles (§4.1).

---

## 5. Overall gaps (all areas)

- There are no iOS 26 snapshots of the Search tab screen, the Slackbot tab page, Slackbot's landing page or History
  sheet, or the full huddle sheet (still none in 14b3cbaf). Those layouts come from code and component-level PNGs.
- Several September features are behind toggles that are off by default and not in production (the unified-navigation
  SwiftUI search, the Search↔Slackbot hand-offs, the huddle thread panel, FilesBrowser): they're described briefly,
  not built.
- Liquid-glass chrome (the system search field in the Search tab, glass buttons and the tab bar) is drawn by UIKit. It isn't
  in source, and it renders darker than the coded colors; §0 and §3 give measured values where available.
- Server-provided assets aren't in the repo: huddle backgrounds, and the canvas document body (Quip SDK).
