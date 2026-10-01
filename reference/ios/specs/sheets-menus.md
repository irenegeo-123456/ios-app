# Sheets, menus and secondary screens (iOS)

Overlays and secondary screens of Slack's iOS app, measured from its source: message actions (long press), emoji
picker and reactors, profiles and edit status, channel/DM details, and the generic sheets, alerts, snackbars, option
picker and conversation header menu.

**Updated to slack-objc main @ 14b3cbaf (2026-09-30).** First written against the June snapshot (`cd22922`). What
changed since June:

- **Colors**: most legacy `.sk_*` colors became CoreColorSet tokens (reactors, quick reactions, emoji picker, profile,
  channel details, member list, edit details, list sheet, option picker), which moves several dark-mode values (e.g.
  `sk_highlight` #1d9bd1 → `highlight1.content` #2ba5ce, `sk_foreground_low_solid` → `outlineTertiary`). The design
  tokens moved to `f76ac0a`: `base_inverse_highlight_1` / `_highlight_2` / `_important` are lighter in dark mode, so
  green `.primary` buttons are #177e56 there.
- **Presentation**: `bottomsheetMigration` still defaults off (message actions, emoji picker, reactors stay on
  `SKBottomSheet`); `.selfSized` detents can take a minimum height; `SKDialog` adds its extra 10 pt only as a native
  self-sized sheet. The profile is **pushed** by default (modal only for `displayAsModal` callers such as the reactors
  sheet, and You's own profile); the June spec had it as a full-screen modal.
- **Message actions**: Ask Slackbot no longer needs `slackbotModal` (so Explain never shows next to it); Forward is
  dropped in Enterprise channels that restrict sharing (flag off); failed edits offer Discard Changes in threads too.
  The Forward screen's card is now an `MKMessagePreview` in a 1-px `outlinePrimary` border.
- **Emoji picker**: the add-emoji button is a Liquid Glass circle; the category bar is a `baseTertiary` capsule with a
  1-pt `outlineTertiary` border; custom-emoji upload pushes inside the picker.
- **Reactors**: the sheet dismisses itself when the last reaction is removed; tab emoji are 20-pt `SKEmoji`.
- **Profile and details**: the profile's mapping moved to `UserProfileViewStateMapper.swift` (rows and buttons
  unchanged; `userProfileEnhancements` is off, so the full-width outline buttons ship); a "Frontline" photo banner;
  channel details gained a "Channel Email Address" section (paid plans) and frontline-worker restrictions.
- **Header menu**: no dimming scrim on iOS 26; new "Agents & Apps", "Skills" and find-in-channel Search rows behind
  flags that default off; the "…" menu keeps its items ("Copy Email" became "Copy Channel Email" / "Copy DM Email").
- **Toast**: a new `.icon` content style (a 30-pt white `SKIcon`).
- **Snapshots**: component baselines are now 2 × 2 grids (light / dark × normal / high contrast) and several were
  re-recorded (reactors, `SKDialog`, `SKGenericEntity`, `SKMemberCollectionEntity`, `SnackBarAlertView`);
  `testReactWithEmojiButtonInEditMode` is a disabled test now (stale PNG); the new
  `ArchitectureTests.SelfSizedSheetPresentationSnapshotTests` PNGs are fully transparent. `iOS_27` sets sit next to
  `iOS_26` for the reactors, `SKDialog`, `SnackBarAlertView` and blocker tests: the reactors and snackbar ones are
  pixel-identical to iOS_26 (so the clone matches both equally); `SKDialog`'s `testDialog` differs only in the dark and
  high-contrast green buttons (#177e56 / #106f4d, the f76ac0a tokens; iOS_26 still draws #007a5a).

Conventions used in this file (see `README.md` in this folder for sources):

- Source citations are `path:line`, relative to the repo root of `slack-objc-latest` (github.com/tinyspeck/slack-objc
  `main` @ `14b3cbaf`). Snapshot PNG paths are relative to the same root (its iOS_26 LFS objects are pulled). Notes
  marked "June" describe `cd22922`.
- Sizes are in pt. Pixel measurements from @3x snapshots are divided by 3 and marked "measured".
- Colors: iOS property → design token → light / dark hex from `output/ios/Colors.swift` of `slack/design-tokens`
  (`f76ac0a`, the commit 14b3cbaf pins; `reference/ios/vendor/design-tokens-f76ac0a/`), cited as `Colors.swift:<line>`.
  Hex written `#rrggbb/aa` has alpha `aa` (hex, `b3` = 70%).
- Fonts: `SKFont` case → Lato size and weight (Regular 400, Bold 700, Black 900), from
  `Modules/Data/Font/Implementation/UIFont+LegacySupport.swift`.
- Icons: `SKIconManifest.svgFoo` → `Modules/Data/Icon/ResourceBundle/Icons.xcassets/foo.imageset/foo.svg`.
- Strings: exact English value and its key in `Modules/Data/Strings/Implementation/localized_strings.yaml:<line>`.
- "not found (looked in …)" means the value is not in the source; nothing in this file is guessed.

## 0. Shared building blocks

Most overlays below are assembled from the same few pieces. Sections 1–6 refer back here instead of repeating them.

### 0.1 Legacy bottom sheet `SKBottomSheet` (PanModal port)

Used when a feature's view controller conforms to `SKBottomSheetPresentable` and is presented with
`ModalPresentationBehavior.deprecated_bottomSheet` (`Modules/UIInfra/Architecture/Implementation/Navigation/ModallyPresentableFeature.swift:166-167`).
Files are under `Modules/UIInfra/DeveloperComponents/Implementation/BottomSheet/` (abbreviated `BottomSheet/` below).

| Property | Value | Source |
|---|---|---|
| Top corner radius | 12, continuous curve (`cornerCurve = .continuous`), top corners only | `BottomSheet/Presentable/SKBottomSheetPresentable+Defaults.swift:35-37`, `BottomSheet/PresentationController/SKBottomSheetPresentationController.swift:992-994` |
| Sheet background | the presented view controller's `view.backgroundColor` (falls back to the scroll view's) | `SKBottomSheetPresentationController.swift:444-447` |
| Grabber ("drag indicator") | 48 × 4, corner radius 2, horizontally centered, top 8 from the sheet's top edge | `SKBottomSheetPresentationController.swift:54,57,176,470-473` |
| Grabber color | `CoreColorSet.default.primary.baseTertiary` → `dt_color_base_tertiary` #eaeaea / #212428 (`Colors.swift:56`) | `SKBottomSheetPresentationController.swift:175` |
| Grabber shown when | `allowsDragToDismiss` (default `true`); tapping the grabber dismisses; VoiceOver label `R.strings.close` | `SKBottomSheetPresentable+Defaults.swift:74-80`, `SKBottomSheetPresentationController.swift:178,475` |
| Space above content | the sheet's top edge sits 16 pt (`dragIndicatorMargin`) above the content; the embedded scroll view gets a top content inset of up to 16 so content starts 16 below the sheet edge | `SKBottomSheetPresentationController.swift:56,486-487,522-525` |
| Height | default long form = the scroll view's content height (content-hugging), else full height; `.contentHeight(h)` adds the bottom safe-area inset below the content | `SKBottomSheetPresentable+Defaults.swift:24-33`, `BottomSheet/Presentable/SKBottomSheetPresentable+LayoutHelpers.swift:84-101` |
| Highest position | `topOffset` = top safe-area inset + 21 | `SKBottomSheetPresentable+Defaults.swift:16-18`, `SKBottomSheetPresentationController.swift:486-487` |
| Dimming | full-screen black view, alpha 0.7 at rest (i.e. `rgba(0,0,0,0.7)`); fades in with the present animation and out with dismissal; tapping it dismisses (`allowsTapToDismiss` default `true`) | `BottomSheet/View/SKBottomSheetDimmedView.swift:67-72`, `SKBottomSheetPresentable+Defaults.swift:51-53,82-84`, `SKBottomSheetPresentationController.swift:138-143,239-241,256-259` |
| Dim while dragging | below the short-form position, alpha = 0.7 × (1 − dragDistance / sheetHeight) | `SKBottomSheetPresentationController.swift:771-782` |
| Present / dismiss motion | slides up from below the screen to its resting y; dismissal slides back below the screen | `BottomSheet/Animator/SKBottomSheetPresentationAnimator.swift:87-106,129-136` |
| Animation | `UIView.animate(usingSpringWithDamping:)`: duration 0.5 s, damping ratio 0.8, initial velocity 0, options `.curveEaseInOut, .allowUserInteraction, .beginFromCurrentState` | `BottomSheet/Animator/SKBottomSheetAnimator.swift:25,34-45`, `SKBottomSheetPresentable+Defaults.swift:39-49` |
| Reduce Motion (prefer cross-fade) | sheet fades alpha 0 → 1 in place instead of sliding | `SKBottomSheetPresentationAnimator.swift:83-85,102-104` |
| Haptic | selection haptic when presenting | `SKBottomSheetPresentationAnimator.swift:95-98` |
| Drag release | if release speed > 300 pt/s (`1000 × (1 − 0.7)`) it snaps in the direction of travel, otherwise to the nearest of long form / short form / dismissed | `SKBottomSheetPresentationController.swift:55,624-639,740-742` |
| Shadow | none (no shadow is set anywhere in `SKBottomSheetPresentationController.swift`) | — |

### 0.2 Native sheet (`ModalPresentationBehavior.sheet`, `UISheetPresentationController`)

Configured in `ModalPresentationController.configureSheet` (`Modules/UIInfra/Architecture/Implementation/Navigation/ModalPresentationController.swift:574-584`)
from `StandardBottomSheetParameters` (`ModallyPresentableFeature.swift:226-323`).

| Property | Value | Source |
|---|---|---|
| Grabber | system grabber, `prefersGrabberVisible` default `true` (its size and color are drawn by UIKit, not in Slack source) | `ModallyPresentableFeature.swift:296`, `ModalPresentationController.swift:576` |
| Corner radius | iOS 26: `nil` → the system default; iOS < 26: 16 | `ModalPresentationController.swift:69-75,581`, `ModallyPresentableFeature.swift:243` |
| Detents | `.medium`, `.large`, `.fixedHeight(h)`, `.selfSized(vc, minimumHeight:)` (= content height of `SheetCompatibleViewController.contentView`, at least the optional `minimumHeight` (new since June), capped at the max; half the max height until measured), `.published(...)`. In compact height (landscape) only one custom detent stays active so the sheet attaches flush | `ModallyPresentableFeature.swift:122-146`, `ModalPresentationController.swift:682-792` |
| Dimming | UIKit's own dimming; `largestUndimmedDetentIdentifier` default `nil`, so every detent dims (dim color/alpha are UIKit's, not in Slack source) | `ModallyPresentableFeature.swift:297` |
| Scroll expands sheet | `prefersScrollingExpandsWhenScrolledToEdge` default `true` | `ModallyPresentableFeature.swift:298` |
| Swipe to dismiss | enabled (`disableSwipeToDismiss` default `false`) | `ModallyPresentableFeature.swift:301` |
| Features that don't choose | `.standard(.formSheet)` (a full-height card) | `ModallyPresentableFeature.swift:64-68` |

### 0.3 List row: `SKGenericEntity` inside an `SKList`

Almost every action list, settings row and menu item below is an `SKGenericEntity`
(`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/GenericEntity/SKGenericEntity.swift`); its layout
lives in `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/` (abbreviated `EntityViews/`).

| Property | Value | Source |
|---|---|---|
| Padding | top 10, bottom 10, left 16, right 16 (0 left/right when `shouldInsetHorizontalEdges == false`) | `EntityViews/SKEntityBaseView.swift:61-67` |
| Order | `[ornament] [content] [accessories]` in a horizontal stack, vertically centered | `EntityViews/SKEntityBaseView.swift:110-120`, `SKGenericEntity.swift:284` |
| Ornament → text gap | 12 for sizes S and M, 16 for XL | `SKGenericEntity.swift:456-463`, `EntityViews/SKEntityBaseView.swift:400-403` |
| Text → accessory gap | 8 (`.small` accessory spacing = 0) | `EntityViews/SKEntityBaseView.swift:405-407` |
| Ornament size by row size | S → 24 box, M → 36 box, XL → 56 box | `SKGenericEntity.swift:451-474`, `EntityViews/SKEntityOrnamentView.swift:397-427,468-479` |
| Row height (measured, one line) | S with icon: 44; M with icon: 56 | `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmall@3x.png` (1179×264 px = light row over dark row, 132 px each), `…/testGenericEntityWithIconLarge@3x.png` (168 px each) |
| Text x (measured) | 52 for S (16 + 24 + 12), 64 for M (16 + 36 + 12) | same PNGs |
| Primary text | `.body` = Lato 17 Regular (XL rows: `.bodyBlack` 17 Black); `contentPrimary` → `dt_color_content_primary` #1d1c1d / #f8f8f8 (`Colors.swift:200`); 1 line by default | `EntityViews/SKEntityPrimaryContentView.swift:111-114,383-390`, `SKGenericEntity.swift:266` |
| Secondary text (below) | `.caption` = Lato 13 Regular (XL: `.smallBody` 15); `contentSecondary` → `dt_color_content_secondary` #454447 / #b9babd (`Colors.swift:206`); unlimited lines by default | `EntityViews/SKEntityContentView.swift:58-61,229-234`, `SKGenericEntity.swift:267` |
| Accessory text (right) | `.body` 17 Regular, `contentSecondary` | `EntityViews/SKEntityContentView.swift:62-63` |
| Disabled | text → `contentTertiary` → `dt_color_content_tertiary` #5e5d60 / #9a9b9e (`Colors.swift:212`); ornament alpha 0.6 | `EntityViews/SKEntityPrimaryContentView.swift:110`, `EntityViews/SKEntityOrnamentView.swift:68` |
| Row background | the list background, default `basePrimary` → `dt_color_base_primary` #ffffff / #1a1d21 (`Colors.swift:42`) | `SKGenericEntity.swift:99`, `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:196` |
| Pressed | a highlight view inset 4 pt left and right (full height), corner radius 12 continuous (`.rounded`, the default); color = the list's row highlight `baseTertiary` → `dt_color_base_tertiary` #eaeaea / #212428 (`Colors.swift:56`); outside an `SKList` the fallback is `baseSecondary` #f8f8f8 / #1a1d21 | `EntityViews/SKEntityBackgroundView.swift:43,54-55,70-72`, `SKGenericEntity.swift:100,335`, `SKList.swift:144-145` |
| Pressed, `.concentric` style | inset 8 left/right, radius = rowHeight / 2 − 8 | `EntityViews/SKEntityBackgroundView.swift:44,73-75` |
| Separators | none drawn by the entity (no divider in `SKEntityBaseView.swift`) | — |

### 0.4 Ornament box and icon sizes

| Property | Value | Source |
|---|---|---|
| `SKOrnamentBox` side length | tiny 16, verySmall 20, small 24, medium 32, large 36, extraLarge 56, jumbo 120 | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/OrnamentBox/SKOrnamentBox.swift:609-634` |
| Corner radius | rounded rectangle: min(20, 0.25 × side) → 24 → 6, 36 → 9, 56 → 14; circle: side / 2 | `SKOrnamentBox.swift:532-538,637-638`, `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:94-98` |
| Box background | tiny/verySmall/small: clear; medium and larger: `surfacePrimary` → `dt_color_surface_primary` #1d1c1d/0f (6%) / #f8f8f8/0f (`Colors.swift:134`) unless overridden | `SKOrnamentBox.swift:25,279-289` |
| Icon glyph | `SKIcon` is 20 × 20, centered in the box; default tint `contentPrimary` #1d1c1d / #f8f8f8 | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Icon/SKIcon.swift:27,159` |

So an S action row is: 16 inset, a 24 × 24 transparent box holding a 20 × 20 icon, 12 gap, 17 pt label, 44 tall.

### 0.5 Section header: `SKHeaderEntity`

`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/SKHeaderEntity.swift`

| Property | Value | Source |
|---|---|---|
| Padding | top 12, left 16, bottom 12, right 16 | `SKHeaderEntity.swift:88` |
| Ornament / gaps | ornament 20 × 20 (image radius 4); horizontal gap 12; title → subtitle gap 4; right button padding 4 | `SKHeaderEntity.swift:82-87` |
| Size S | title `.smallBodyBold` (Lato 15 Bold) `contentSecondary`; subtitle `.micro` (12 Regular) `contentSecondary`; right button `.microBold` `highlight1.content` | `SKHeaderEntity.swift:465-495` |
| Size M | title `.smallBodyBold` `contentPrimary`; subtitle `.smallBody` (15 Regular) `contentSecondary`; right button `.smallBodyBold` `highlight1.content` | `SKHeaderEntity.swift:465-495` |

`highlight1.content` → `dt_color_content_highlight_1` #1264a3 / #2ba5ce (`Colors.swift:218`).

### 0.6 Core color tokens used in this file

`CoreColorSet.default.primary.*` (`Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:119-151`) and the variant sets
(`ColorSet.swift:77-111`). Hex from `Colors.swift` of design-tokens `f76ac0a` (light / dark; since June every token also
carries `lightHighContrast` / `darkHighContrast` values, and two inverse tokens got lighter in dark mode).

| iOS property | Token | Light | Dark | Colors.swift |
|---|---|---|---|---|
| `primary.basePrimary` | `dt_color_base_primary` | #ffffff | #1a1d21 (trueDark #000000, elevatedDark #1d1c1d) | 42 |
| `primary.baseSecondary` | `dt_color_base_secondary` | #f8f8f8 | #1a1d21 | 50 |
| `primary.baseTertiary` | `dt_color_base_tertiary` | #eaeaea | #212428 | 56 |
| `primary.baseModal` | `dt_color_base_modal` | #1d1c1d/b3 | #101214/99 | 86 |
| `primary.baseInversePrimary` | `dt_color_base_inverse_primary` | #1d1c1d | #212428 | 92 |
| `primary.surfacePrimary` | `dt_color_surface_primary` | #1d1c1d/0f | #f8f8f8/0f | 134 |
| `primary.surfaceSecondary` | `dt_color_surface_secondary` | #1d1c1d/40 | #f8f8f8/40 | 140 |
| `primary.containerPrimary` | `dt_color_container_primary` | #ffffff | #212428 | 188 |
| `primary.containerSecondary` | `dt_color_container_secondary` | #f8f8f8 | #212428 | 194 |
| `primary.contentPrimary` | `dt_color_content_primary` | #1d1c1d | #f8f8f8 | 200 |
| `primary.contentSecondary` | `dt_color_content_secondary` | #454447 | #b9babd | 206 |
| `primary.contentTertiary` | `dt_color_content_tertiary` | #5e5d60 | #9a9b9e | 212 |
| `primary.contentInversePrimary` | `dt_color_content_inverse_primary` | #ffffff | #f8f8f8 | 248 |
| `primary.contentInverseSecondary` | `dt_color_content_inverse_secondary` | #cbcccf | #b9babd | 254 |
| `primary.outlinePrimary` | `dt_color_outline_primary` | #7c7a7f | #797c81 | 290 |
| `primary.outlineSecondary` | `dt_color_outline_secondary` | #5e5d60/73 | #797c81/80 | 296 |
| `primary.outlineTertiary` | `dt_color_outline_tertiary` | #5e5d60/21 | #797c81/4d | 302 |
| `highlight1.base` | `dt_color_base_highlight_1` | #e3f8ff | #001a2d | 62 |
| `highlight1.baseInverse` | `dt_color_base_inverse_highlight_1` | #1264a3 | #0a77a7 (June #004d76) | 98 |
| `highlight1.surface` | `dt_color_surface_highlight_1` | #36c5f0/21 | #036696/40 | 146 |
| `highlight1.content` | `dt_color_content_highlight_1` | #1264a3 | #2ba5ce | 218 |
| `highlight2.content` | `dt_color_content_highlight_2` | #007a5a | #3daa7c | 224 |
| `important.base` | `dt_color_base_important` | #ffe8ef | #300005 | 80 |
| `important.baseInverse` | `dt_color_base_inverse_important` | #e01e5a | #d3305d (June #b41541) | 116 |
| `important.content` | `dt_color_content_important` | #c01343 | #de678a | 236 |
| `important.outline` | `dt_color_outline_important` | #e01e5a | #d94c75 | 344 |

## 1. Message actions (long press on a message)

`MA/` below = `Modules/Features/MessageActions/Implementation/`. There are no snapshot PNGs of this sheet (none under
`Modules/Features/MessageActions`, none with a matching name anywhere in the September tree either), so everything here is
from source; heights marked "computed" add up constants and assume a one-line label.

### 1.1 Trigger

- Long press on a message row: the `SKList` long-press recognizer, `minimumPressDuration = 0.5` s
  (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:1657-1661`); a pointer's secondary click does
  the same. Both go to `presentActionsModalIfAllowed`
  (`Modules/Features/Handlers/MessageActionHandler/Implementation/Handlers/MessageListActionHandler.swift:79-88,364-408`).
  Not offered for a hidden-thread tombstone (`MessageListActionHandler.swift:385-386`), nor (new, flag
  `systemMessagesRedesign`, default off) for the redesigned system messages (`:388-392`). Context is `.chat` in a
  channel/DM and `.messageThread(root)` inside a thread (`MessageListActionHandler.swift:394-401`).
- There is no lifted message preview or context menu: the sheet opens straight over the conversation. The sheet's view
  holds only the action list (`MA/MessageActionsViewController.swift:25-31,56-67`).
- The same sheet opens from a thread root's "more actions" button (`MessageListActionHandler.swift:560-570`).
- Messages that failed to send, are ephemeral, are still uploading files or failed an edit get a native action sheet
  instead (§1.9) (`MA/LegacyActions/MessageActionableAdapter.swift:32-43`, `MA/LegacyActions/LegacyMessageActionsPresenter.swift:27-45`).

### 1.2 Presentation

| Case | Presentation | Source |
|---|---|---|
| Default (flag `bottomsheetMigration` off) | legacy `SKBottomSheet` (§0.1): hugs content height, anchored to that height, 12-pt top corners, 48 × 4 grabber, 70% black dim, 0.5 s spring | `MA/MessageActionsFeature.swift:80-99`, `MA/MessageActionsViewController.swift:149-175` |
| Flag `bottomsheetMigration` on | native sheet (§0.2) with one `.selfSized` detent (= content height), system grabber; the list gets an 8-pt top inset (`Spacing.medium`) | `MA/MessageActionsFeature.swift:82-92`, `MA/MessageActionsViewController.swift:138-145`, `Modules/Data/DataModels/Implementation/Layout/Spacing.swift:34` |
| Fallback | native sheet, detents `.medium` + `.large`, grabber visible | `MA/MessageActionsFeature.swift:101` |
| iPad (non-compact) | popover, preferred width 375, 8-pt top and bottom insets | `MA/MessageActionsViewController.swift:49-50,138-145,172-174` |

- Sheet background: `CoreColorSet.default.primary.basePrimary` #ffffff / #1a1d21 (`MA/MessageActionsViewController.swift:56`; §0.6).
- If the content is taller than the screen, the list scrolls inside the sheet (`MA/MessageActionsViewController.swift:151-153,168-170`).
- Dismiss by dragging down, tapping the dim or the grabber (§0.1), or the VoiceOver escape gesture
  (`MA/MessageActionsViewController.swift:120-123`). Each action dismisses the sheet (for example `.dismissModal` after
  every copy action, `MA/MessageActionsInteractor.swift:500-517`).

### 1.3 Structure, top to bottom

Section order (`MA/MessageActionsPresenter.swift:41-68`): quick reactions (§1.4) → primary buttons (§1.5) → feedback
actions (agent/Slackbot replies only) → main actions → copy actions → More Actions (collapsed) → *Internal Options (debug
builds only)* → delete. Replies from Slackbot get quick reactions, buttons, main, copy, feedback and no More Actions
(`MA/MessageActionsPresenter.swift:57-58`). A pending (sending) message gets only main, copy and delete
(`MA/MessageActionsPresenter.swift:47-50`). Empty sections are dropped (`MA/MessageActionsPresenter.swift:70-72`).

Spacing between sections (`MA/MessageActionsPresenter.swift:90-149`):

| Section | Header above | Footer below |
|---|---|---|
| Quick reactions | 8-pt blank (kept even when it is the first section) | none |
| Primary buttons | 8-pt blank | none (hairline when the buttons are stacked vertically) |
| Feedback, Main | none | hairline |
| Copy | 8-pt blank | hairline |
| More Actions | "More Actions" header row (§1.6) | hairline |
| Delete | 8-pt blank | none |

- 8-pt blank = empty space (`SKList.swift:2076-2081`, `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Footer/SKListFooterView.swift:19`).
- Hairline footer = an 8-pt-tall footer with a 1-pixel, full-width line along its bottom edge
  (`SKListFooterView.swift:18-19,47-51,106-111`), color `outlineTertiary` → `dt_color_outline_tertiary`
  #5e5d60/21 / #797c81/4d (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Footer/SKListFooterPresentationObject.swift:20`, `Colors.swift:302`).
  It is not drawn under the last section (`SKList.swift:2128-2131`).

Computed stack for a typical message on a 393-pt-wide phone with the legacy sheet: sheet edge → 16 (grabber zone, §0.1)
→ 8 blank → 48 emoji row → 8 blank → button row (10 + ~96 + 10) → 44-pt rows → 8 hairline footer → 8 blank → 44-pt
rows → 8 hairline → 44 More Actions header → 8 hairline → 8 blank → 44 Delete row → bottom safe area (§0.1).

### 1.4 Quick-reaction row

Files: `MA/QuickReactions/` (abbreviated `QR/`).

| Property | Value | Source |
|---|---|---|
| Shown unless | message is pending, locked, read-only, a file/list comment root, a tombstone, ephemeral or moderated; if it already has reactions, only when its add-reaction button would be visible | `QR/QuickReactionsPresentable.swift:176-210` |
| Which emoji | the user's most frequently used emoji (up to 15 fetched), in frequency order | `QR/QuickReactionsPresentable.swift:72,119-129` |
| New user fallback | the list is padded with, in order, `slightly_smiling_face` 🙂, `+1` 👍, `white_check_mark` ✅, `heart` ❤️, `eyes` 👀, `bow` 🙇, `raised_hands` 🙌, `sparkle` ❇️ | `Modules/DataService/EmojiDataProvider/Implementation/FrequentlyUsedEmojiDataProvider.swift:21-22`, `Modules/DataService/EmojiDataProvider/Implementation/CombineFrequentlyUsedEmojiQuery.swift:25-33` |
| Slot count | n = min(floor(contentWidth / 56), 15), contentWidth = row width − 24; the last slot is always the add-reaction button (it follows the last emoji if there are fewer emoji) | `QR/QuickReactionsView.swift:43,118-129`, `QR/QuickReactionsPresentable.swift:72-80,132-139` |
| At 393 pt wide | contentWidth 369 → n = 6 → 5 emoji + add button | computed from the above |
| Row height | 48 | `QR/QuickReactionsView.swift:24`, `QR/QuickReactionsBannerView.swift:42-44` |
| Cell | 48 × 48 circle (radius 24) | `QR/QuickReactionsView.swift:49`, `QR/Views/QuickReactionsBaseCell.swift:22-29` |
| Insets / spacing | 12 left and right; cells justified edge to edge: gap = (contentWidth − n × 48) / (n − 1) (16.2 at 393 wide) | `QR/QuickReactionsView.swift:50-56`, `Modules/Features/EmojiPicker/Interface/Layout/EmojiGridViewVerticalFlowLayout.swift:127-142` |
| Cell color | `ReactionAppearance.Default().backgroundColor` = `.message_rendering_code_block_fill`: light #1d1c1d at 4%, dark #d1d2d3 at 13% | `QR/Views/QuickReactionsBaseCell.swift:25`, `MA/LegacyPresentables/ReactionAppearance.swift:27`, `Modules/Data/Color/Implementation/SKLegacyColors.swift:27-29,90,112,157,342` |
| Emoji | 24 × 24, centered | `QR/Views/QuickReactionsCell.swift:45-50` |
| Add-reaction glyph | `SKIconManifest.addReaction` (SVG equivalent `svgAddReaction` → `add_reaction.svg`), drawn as a 24-pt icon-font glyph, color `contentPrimary` #1d1c1d / #f8f8f8 (`Colors.swift:200`; June `.sk_primary_foreground`, dark #d1d2d3) | `QR/Views/QuickReactionsShowMoreCell.swift:21-29`, `Modules/Data/Icon/Implementation/SKIconManifest+SVGMapping.swift:215`, `Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift:3620` |
| Pressed | circle color → `outlineSecondary` #5e5d60/73 / #797c81/80 (`Colors.swift:296`; June `.sk_foreground_mid`, #1d1c1d / #d1d2d3 at 30%) and the circle scales to 0.8; spring damping 1.0, 0.2 s down / 0.4 s back; no scaling with Reduce Motion | `QR/Views/QuickReactionsBaseCell.swift:12-16,58-66`, `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+BounceMode.swift:14-35`, `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+SpringAnimation.swift:64-100,109-129` |
| Tap an emoji | adds the reaction, selection haptic, sheet dismisses | `QR/QuickReactionsView.swift:184-195` |
| Tap add-reaction | sheet dismisses, then the emoji picker opens (§2) | `QR/QuickReactionsView.swift:189-192`, `QR/QuickReactionsPresentable.swift:172-174` |
| VoiceOver | "Add %@ emoji as reaction" (`add_alias_emoji_as_reaction`, yaml:698); "Add Reaction" (`add_reaction`, yaml:827) | `QR/Views/QuickReactionsCell.swift:56`, `QR/Views/QuickReactionsShowMoreCell.swift:36` |

Coachmark: while the reactions progressive-disclosure megaphone is active (`MA/MessageActionsInteractor.swift:808-810`)
an `SKBanner` row sits above the emoji row with "**React with an emoji,** such as 👍 for something you agree with, or ✅
to mark a request complete." (`react_with_an_emoji`, yaml:15542; the `<bold>` span is bold), `.body` 17; tone `.info`,
or with a theme a background of the theme's `highlight1.baseInverse` and `contentInversePrimary` text
(`MA/MessageActionsPresenter.swift:447-469`).

### 1.5 Primary buttons row

Which buttons (`MA/MessageActionsInteractor.swift:200-219`): in a channel, DM or All Threads: **Reply · Forward · Save**; inside
a thread: **Forward · Save** (Reply is left out on purpose). With the `laterTodos` flag (default off) the last button is
**To-dos** instead of Save. New since June: when the conversation restricts sharing and file downloads (Enterprise
channel-based settings, flag `channelBasedSettingEnterprise`, default off) Forward is left out — **Reply · Save** in a channel,
**Save** alone in a thread (`MA/Message+ActionConditionals.swift:225-235`).

| Button | Icon | Title (key, yaml line) | Selected variant | Disabled ("inactive") when | Tap |
|---|---|---|---|---|---|
| Reply | `svgThreads` → `threads.svg` | "Reply" (`reply`, 16440); "Comment" (`comment`, 4364) in canvas comment threads | — | can't reply (not a member of the resolved conversation, locked, no thread permission) | opens the thread with the composer's text input focused (at the latest reply with flag `replyActionOpensThreadAtLatest`, default off) |
| Forward | `svgShareMessage` → `share_message.svg` | "Forward" (`forward`, 7377) | — | moderated, pending or ephemeral (left out entirely when forwarding is restricted, above) | opens the share/forward screen |
| Save | `svgBookmark` → `bookmark.svg` | "Save" (`save`, 16880) | `svgBookmarkFilled` → `bookmark_filled.svg`, "Saved" (`saved`, 16912) | moderated, pending (ephemeral in channel view) | toggles saved; medium impact haptic when saving |
| To-dos (flag) | `svgCheckCircle` → `check_circle.svg` | "To-dos" (`todos_title`, 21871) | `svgCheckCircleFilled` → `check_circle_filled.svg`, "Added" (`added`, 985) | to-dos unavailable | toggles to-do |

Sources: `MA/MessageActionsPresenter.swift:482-547`, `MA/Message+ActionConditionals.swift:225-235,305-314,412-434`,
`MA/MessageActionsFeature.swift:395-400,414-424`, `MA/MessageActionsInteractor.swift:538-556,577-595`. The forward screen
is shown in `App/Snapshots/iOS_26/SnapshotTests.ShareMessageViewControllerViewTest/test_shareMessage@3x.png` ("Share with…"
field, "Add a message, if you'd like", bordered preview card of the message; only the June copy has the LFS object). New
since June: the card is MessageKit's `MKMessagePreview` (author header without status emoji, a relative timestamp,
every line of the text, no reactions) 15 pt inside a 1-px `outlinePrimary` border with 8-pt corners; the legacy
`ShareMessageView` and its `useMessageKitForShareMessage` flag (default off in June) are gone, and the message field's
placeholder is `contentTertiary` (`Modules/Features/ShareMessage/Implementation/ShareMessageViewController.swift:215-219,491-492,1330-1348`,
`ShareMessageDataTypes.swift:229-251`, `ShareMessagePresenter.swift:184-187`).

Button look: `SKButton` style `.quickAction`, size `.messageActionsPrimaryButton`, icon above the title
(`MA/MessageActionsPresenter.swift:492-498`). Files under `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/`.

| Property | Value | Source |
|---|---|---|
| Corner radius | 12, continuous | `SKButton+Types.swift:321-322`, `SKButton.swift:272-273` |
| Padding | top/bottom 24, left/right 8 | `SKButton+Types.swift:294-295`, `SKButton+PresentationObject.swift:216-217` |
| Icon | 24 × 24, above the title, 8 gap | `SKButton+Types.swift:363-364,378-379`, `SKButton.swift:310-318` |
| Title | `.captionBold` = Lato 13 Bold, centered | `SKButton+Types.swift:263-264`, `SKButton.swift:254-257` |
| Border | 1 pt | `SKButton.swift:46,274` |
| Height (computed) | 24 + 24 + 8 + one 13-pt line + 24 ≈ 96 | the rows above |
| Normal colors | background light `baseSecondary` #f8f8f8, dark `surfacePrimary` #f8f8f8/0f; border `baseSecondary` #f8f8f8 / #1a1d21; title and icon `contentPrimary` #1d1c1d / #f8f8f8 | `SKButton+Types.swift:151-153,172-174,219-220`, `SKButton.swift:452-462` |
| Selected (Saved, Added) | background and border `highlight1.base` #e3f8ff / #001a2d; title and icon `highlight1.content` #1264a3 / #2ba5ce | same lines |
| Pressed | background darkened by 20% (`darken(0.20)`); the button scales to 0.96 with the spring above | `SKButton+Types.swift:194-197`, `SKButton.swift:47,429-440` |
| Inactive | same background; title and icon `contentSecondary` #454447 / #b9babd | `SKButton.swift:242-251,418-420` |

Row: `SKButtonEntity` with layout `.fillWidthEqually`: equal widths, 8 between buttons, row padding 10 top/bottom and
16 left/right (`MA/MessageActionsPresenter.swift:191-203`;
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/ButtonEntity/SKButtonEntity.swift:25-26,120-123,145-161,221-222,262-271`).
Three buttons at 393 wide are (393 − 32 − 16) / 3 = 115 wide each.

At accessibility text sizes (≥ `accessibilityLarge`) the buttons become ordinary S rows (§0.3) with the same icons:
"Reply"/"Comment", "Forward", "Save"/"Saved", "Add to To-dos" (`add_to_todos`, 943) / "Remove from your to-dos"
(`remove_from_your_todos`, 16263); disabled ones are left out and the section gets a hairline footer
(`MA/MessageActionsViewController.swift:52-54`, `MA/MessageActionsPresenter.swift:138-143,178-186,549-590`).

### 1.6 Action rows

Every row is an §0.3 size-S row (44 pt): a 20-pt icon in a transparent 24-pt box tinted `contentPrimary`, then the label
in `.body` (Lato 17 Regular) `contentPrimary`, wrapping allowed (`primaryTextNumberOfLines: 0`)
(`MA/MessageActionsPresenter.swift:593-797`). Tapping a row runs it and dismisses the sheet unless it opens something else
(`MA/MessageActionsInteractor.swift:303-535`).

**Main actions**, in this order (`MA/MessageActionsPresenter.swift:232-265`, rows `:608-663`):

| Row | Icon → svg | Text (key, yaml line) | Shown when (`MA/Message+ActionConditionals.swift`) |
|---|---|---|---|
| Speak | `svgSound` → `sound.svg` | "Speak Message" (`speak_message`, 20517) | iOS Speak Selection is on, message has text, not a call, not moderated or pending (`:287-303`) |
| Mark unread | `svgMarkAsUnread` → `mark_as_unread.svg` | "Mark Unread" (`mark_unread`, 11784) | not pending, not a Slackbot reply; channel view: last-read marking supported and message can be unread, not ephemeral; thread: not ephemeral; never in archives (`:316-333`) |
| Remind me | `svgClock` → `clock.svg` | "Remind Me" (`remind_me`, 16101) | not moderated, pending or ephemeral (threads: not a tombstone) (`:237-247`); opens the reminder sheet (§1.8) |
| Reply notifications | `svgNotifications` → `notifications.svg` / `svgNotificationsOff` → `notifications_off.svg` | "Get Reply Notifications" (`get_reply_notifications`, 7595) / "Don't Get Reply Notifications" (`dont_get_reply_notifications`, 5780) | member, not read-only, pending, a Slackbot reply, an archived doc thread, an AI huddle note or a topic/purpose message, not ephemeral, not in archives, not a canvas comment (`:392-410`, presenter `:247-251`); wording/icon follow whether you already follow the message or its thread root (`MA/MessageActionsPresenter.swift:653-660`, `MA/Message+ActionConditionals.swift:875-878`) |
| Ask Slackbot | `svgSlackbotColor` → `slackbot_color.svg` | "Ask Slackbot" (`ask_slackbot`, 2122) | Slackbot is available to you (AI permission `.slackbot`), the message isn't pending and this isn't the Slackbot DM. June also needed the `slackbotModal` flag, which is gone (`MA/Message+ActionConditionals.swift:807-812`, `MA/MessageActionValidator.swift:231-233`) |
| Edit | `svgEdit` → `edit.svg` | "Edit Message" (`edit_message`, 6044) / "Edit Comment" (`edit_comment`, 6015) | you may edit it (`canEdit`) and post here, blocks not too complex (one rich-text block; any editable blocks with flag `markdownInComposer`, anything with `opaqueBlocksInComposer`, both off; `:699-718`), not pending/DLP-failed, not locked, not an announce-only channel, not a call, not in the Slackbot DM, not in archives (`:335-390`); optional "Updated" badge (§1.6 badges), now driven only by the edit-attachments education megaphone (June also needed the `editMessageFiles` flag; `MA/MessageActionsInteractor.swift:955-968`, presenter `:615-630`) |

**Copy actions** (`MA/MessageActionsPresenter.swift:266-289`, rows `:665-682`):

| Row | Icon → svg | Text (key, yaml line) | Shown when | Result |
|---|---|---|---|---|
| Copy link | `svgLink` → `link.svg` | "Copy Link to Message" (`copy_link_to_message`, 4765) / "Copy Link to Comment" (`copy_link_to_comment`, 4759) | not ephemeral, pending, moderated or a tombstone; copying allowed by policy (`MA/Message+ActionConditionals.swift:167-174`) | toast "Link copied" (`copied_link`, 4677) |
| Copy prompt link | `svgAiSummary` → `ai_summary.svg` | "Copy Link to Prompt" (`copy_link_to_prompt`, 4768) | your own top-level message in the Slackbot DM, flag on (`:90-111`) | — |
| Copy text | `svgText` → `text.svg` | "Copy Message" (`copy_message`, 4774) | has text blocks, not a call, not moderated, copying allowed (`:121-141`) | toast "Copied" (`copied`, 4671) |
| Copy images | `svgImageInput` → `image_input.svg` | "Copy Image" (`copy_image`, 4744) / "Copy Images" (`copy_images`, 4747) | flag `copyImageMessageAction`, has non-GIF images (`:143-165`) | toast "Media copied" (`copied_media`, 4680) |

Toast text comes from `Modules/Integration/RichTextEditor/Implementation/CopyPasteHandler.swift:251-273,401-427` with the
category mapping in `Modules/Integration/RichTextEditor/Interface/CopyPasteHandling.swift:205-228`; failures show
"Link failed to copy" (`copy_failed_link`, 4731) / "Copy failed" (`copy_failed`, 4725) with the `toast_error` image.
Toast look: §5.

**More Actions** (collapsed by default, `MA/MessageActionsInteractor.swift:106`). Header row: `SKHeaderEntity` size M
(§0.5) with a 20-pt `svgEllipsisHorizontalFilled` → `ellipsis_horizontal_filled.svg` ornament (`contentPrimary`), title
"More Actions" (`message_actions_more_actions_section_header`, 12063) in `.body` 17 Regular `contentPrimary`, an optional
"NEW" badge, and a collapse caret `svgCaretDownFull` tinted `contentTertiary` #5e5d60 / #9a9b9e, rotated −90° (pointing
right) while collapsed (`MA/MessageActionsPresenter.swift:98-114`;
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/SKHeaderEntity.swift:34,82-88,707-728`). Computed
height 12 + 20 + 12 = 44. Tapping the header toggles the section (`MA/MessageActionsViewController.swift:94-100`,
`MA/MessageActionsInteractor.swift:242-249`). Rows, in order (`MA/MessageActionsPresenter.swift:311-433`, rows `:695-797`):

| Row | Icon → svg | Text (key, yaml line) | Shown when |
|---|---|---|---|
| Save for later (flag `laterTodos`) | `svgBookmark` / `svgBookmarkFilled` | "Save for Later" (`save_for_later_menu`, 16886) / "Remove from Saved" (`remove_from_saved_menu`, 16237) / "Move to Saved" (`move_to_saved_menu`, 12492) — Title Case since June (`save_for_later` / `remove_from_saved_lowercase` / `move_to_saved`; the second key is gone) | same as Save (`:698-717`) |
| Explain | `svgAiThreadSummary` → `ai_thread_summary.svg` | "Explain Message" (`explain_message`, 6591) | AI "explain" enabled, not pending, and Ask Slackbot not shown — so with Slackbot available it never shows (`MA/Message+ActionConditionals.swift:814-821`, `MA/MessageActionValidator.swift:227-229`) |
| Log a call | `svgUserDirectoryAdd` → `user_directory_add.svg` | "Log a call" (`log_a_call`, 11527) | Salesforce record channel (`MA/MessageActionsInteractor.swift:220-226`) |
| Add to list | `svgSendToList` → `send_to_list.svg` | "Add to List" (`add_to_list`, 870), optional "NEW" badge | Lists enabled |
| Send reply to channel | `svgChannelArrowLeft` → `channel_arrow_left.svg` | "Send Reply to This Channel" (`send_reply_to_this_channel`, 17576) / "…This Conversation" (`send_reply_to_this_conversation`, 17579) in DMs | a thread reply (not the root), you wrote it or are an admin, you can post and thread (`MA/Message+ActionConditionals.swift:194-223`) |
| Remove broadcast | `svgUndo` → `undo.svg` | "Remove Reply From Channel" (`remove_reply_from_channel`, 16299) / "…From Conversation" (`remove_reply_from_conversation`, 16302) | an "also sent to channel" reply you may delete (`:484-506`) |
| Pin | `svgPin` → `pin.svg` | "Pin to Channel" (`pin_to_channel`, 14756) / "Unpin from Channel" (`unpin_from_channel`, 22601) | you can post, not moderated, pending, a canvas, locked, archived or ephemeral (`:256-273`) |
| Translate | `svgAiTranslate` → `ai_translate.svg` | "Translate Message" (`translate_message`, 21985), optional "NEW" badge | AI translation on and message not yet translated (`:737-745`) |
| See original / translation | `svgUndo` | "See Original Message" (`see_original_message`, 17311) / "See Translation" (`see_translation`, 17320) | a translated message |
| Change language | `svgAiTranslate` | "Change Translation Language" (`change_translation_language`, 3677) | a translated message (`:747-755`) |
| Translation feedback | `svgShareFeedback` → `share_feedback.svg` | "Give Feedback on Translation" (`give_feedback_on_translation`, 7645), secondary text "Translations are AI-generated, so may have mistakes." (`translations_are_ai_generated_so_may_have_mistakes`, 22022) | translated + feedback allowed |
| AI action item | `svgClose` → `close.svg`; `svgShareFeedback` | "Dismiss Action Item" (`dismiss_ai_action_item`, 5514); "Give Feedback on Action Item" (`give_ai_action_item_feedback`, 7642) | an open AI action-item nudge (`MA/MessageActionValidator.swift:235-237`) |
| Report | `svgWarning` → `warning.svg` | "Report to Slack" (`report_to_slack`, 16465) | EU (DSA) content reporting: you're in Europe, in a non-EKM org, not the author, the message isn't pending, and Flag isn't offered for it (`MA/Message+ActionConditionals.swift:646-697`) |
| Pause / reactivate thread | `svgPause` → `pause.svg` / `svgPlay` → `play.svg` | "Pause replies and reactions" (`pause_replies_and_reactions`, 14621) / "Reactivate thread" (`reactivate_thread`, 15568) | you can lock threads |
| Hide thread | `.eyeClosed` → `eye_closed.svg` | "Hide thread" (`hide_thread`, 7930) — **red**: text and icon `important.content` | you can hide threads (`MA/MessageActionsPresenter.swift:379-381,789-790`) |
| Select text | `svgSelectText` → `select_text.svg` | "Select Text" (`select_text`, 17392) | same as Copy Message (`MA/Message+ActionConditionals.swift:113-119`) |
| Flag | `svgFlag` → `flag.svg` | "Flag This Message" (`flag_this_message`, 7237) | team content review on and the message can be flagged (`:543-553`) |
| Flag channel details | `svgFlag` | "Flag channel name" (`flag_channel_name`, 7213), "Flag channel topic" (`flag_channel_topic`, 7217; "Flag conversation topic" `flag_conversation_topic`, 7220 in DMs), "Flag channel description" (`flag_channel_description`, 7207) | on the corresponding system message, flag on |
| App shortcuts | app icon | the shortcut's name; at most 2, sorted by name | message shortcuts installed (`MA/MessageActionsPresenter.swift:409-423`) |
| More shortcuts | `svgSearch` → `search.svg` | "View More Shortcuts" (`view_more_shortcuts`, 23242) | more than 2 shortcuts; opens §1.10 (`:425-427`) |

**Delete** (`MA/MessageActionsPresenter.swift:290-310`, row `:684-693`): "Delete Message" (`delete_message`, 5325) /
"Delete Comment" (`delete_comment`, 5289), `svgTrash` → `trash.svg`. Destructive styling = label and icon in
`CoreColorSet.default.important.content` → `dt_color_content_important` #c01343 / #de678a (`Colors.swift:236`); no other
change (same row, background and pressed state). Shown when you may delete it (`canDelete`; admins also in locked
threads), never in archives or for Slackbot DM replies, and replaced by "Remove Reply…" for broadcasts
(`MA/Message+ActionConditionals.swift:451-482`). Opens the confirmation in §1.8.

**Feedback actions** (agent or Slackbot replies, `MA/MessageActionsPresenter.swift:205-231,593-606`): "Good response"
(`good_response`, 7706) `svgThumbsUp` → `thumbs_up.svg`; "Bad response" (`bad_response`, 2382) `svgThumbsDown` →
`thumbs_down.svg`; agent auto-reply toggles "Turn off agent auto-reply in thread" / "Turn on agent auto-reply in thread"
(hard-coded English, not in the strings file) with `svgAgentforce` → `agentforce.svg`.

**Internal Options** (debug builds only): header "Internal Options" (`internal_options`, 9762) with `.cogs` →
`cogs.svg`, row "Inspect Message" (`internal_options_inspect_message_action_title`, 9771) (`MA/MessageActionsPresenter.swift:115-132,801-823`).
Leave it out of the clone.

**Badges** "NEW" (`new_all_caps`, 12791) and "Updated" (`updated`, 22763): `SKBadge` style `.text`, rounded rectangle:
`.microBold` (Lato 12 Bold, capped at 18 pt), text `contentInversePrimary` #ffffff / #f8f8f8 on `highlight1.baseInverse`
#1264a3 / #0a77a7 (June's tokens: dark #004d76), padding 4 on all sides, height 20, min width 24, corner radius 5 (= min(20, 0.25 × 20))
(`MA/MessageActionsPresenter.swift:101-112,617-630,724-738`;
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Badge/SKBadge.swift:23-29,138-147,191-201,217-227,382-393,415-435`).
In rows the badge is a trailing accessory (8 gap, §0.3); in the More Actions header it sits right of the title.

### 1.7 Typical sheets (for prototypes)

Derived from the conditions above with all feature flags off, AI off and Speak Selection off:

| Message | Rows |
|---|---|
| Someone else's message in a channel | emoji row · [Reply · Forward · Save] · Mark Unread · Remind Me · Get Reply Notifications · — · Copy Link to Message · Copy Message · — · More Actions ▸ (expanded: Pin to Channel, Select Text, Flag This Message when content review is on) |
| Your own message in a channel | the same, plus Edit Message at the end of the first group and a red Delete Message at the very bottom |
| A reply inside a thread | emoji row · [Forward · Save] · … ; More Actions also has Send Reply to This Channel for your own replies |
| A message you already saved and follow | Save button shows "Saved" (selected); "Don't Get Reply Notifications" with `notifications_off.svg` |
| Any of these with Slackbot available to you (no flag since June) | "Ask Slackbot" between Get Reply Notifications and Edit Message; no "Explain Message" |

### 1.8 Follow-up dialogs and toasts

- **Delete confirmation**: native `UIAlertController` action sheet. Title "Are you sure you want to delete this message?
  This cannot be undone." (`message_deletion_prompt`, 12090), then a blank line and the message text in quotes, cut with
  "…" (`truncated_text_with_ellipsis`, 22267) past the preview limit. Buttons "Delete Message" (destructive, red) and
  "Cancel" (`cancel`, 3202). Comments: "Are you sure you want to delete this comment? This cannot be undone."
  (`message_delete_comment_prompt`, 12087) + "Delete Comment". Broadcasts: "Are you sure you want to remove this message?
  The original reply will still be visible in its thread." (`broadcast_remove_prompt`, 2599) + "Remove Message"
  (`remove_message`, 16278) (`MA/MessageActionHandlingHelper.swift:484-519`). Failure toast "The message could not be
  deleted." (`message_could_not_be_deleted`, 12081) (`MA/MessageActionHandlingHelper.swift:722-723`).
- **Remind Me**: native action sheet with message "When would you like to be reminded?"
  (`when_would_you_like_to_be_reminded_prompt`, 23645) and buttons "In 20 Minutes" (`remind_me_20_minutes`, 16107),
  "In 1 Hour" (`remind_me_1_hour`, 16104), "In 3 Hours" (`remind_me_3_hours`, 16110), "Tomorrow" (`remind_me_tomorrow`,
  16132), "Next Week" (`remind_me_next_week`, 16126), "When At Your Computer" (`remind_me_at_my_computer`, 16116; flag
  `remindMeOnDesktop` only), "Custom" (`custom`, 5027), "Cancel" (`MA/MessageActionHandlingHelper.swift:185-239`).
- **Pin**: toast "Pinned item added" (`pinned_item_added`, 14774) / "Pinned item removed" (`pinned_item_removed`, 14777)
  with image `toast_checkmark`; errors "Couldn’t pin" (`could_not_pin`, 4826) or "Couldn’t pin. There are too many pins
  pinned to this channel." (`could_not_pin_too_many_pins_already`, 4829), image `icn_error_pin`, 2 s
  (`MA/MessageActionHandlingHelper.swift:347-362`).
- **Generic error** toast "Error" (`error`, 6420) with `toast_error` (`MA/MessageActionsInteractor.swift:558-567`).

### 1.9 Native action sheet for failed, ephemeral and uploading messages

`UIAlertController(.actionSheet)` with an optional title, the actions in order (delete-type ones destructive), then
"Cancel" (`MA/LegacyActions/LegacyMessageActionsPresenter.swift:66-94`). Title for DLP-blocked messages: "This message
may include sensitive info that your admins don’t want shared. Make sure everything looks okay before sending."
(`dlp_warning_action_list_title`, 5559); other failure reasons get their own title
(`MA/LegacyActions/MessageActionModalPresenter.swift:138-143,189-206`).

| Message state | Actions (`MA/LegacyActions/MessageActionableAdapter.swift`) |
|---|---|
| Failed to send | "Try Again" (`try_again`, 22273), "Copy Message", "Delete Message" (`:225-226`) |
| Failed edit | "Try Again", "Discard Changes" (`discard_changes`, 5480) (`:231-232`); inside a thread too since June (June offered only "Try Again" there, `:276-277`) |
| Blocked by DLP | "Send" (`send`, 17429), "Copy Message", "Delete Message" (`:228-229`) |
| Still uploading files | "Delete Message" (cancels the upload) (`:240-241`) |

### 1.10 "More Message Shortcuts" screen (MessageShortcuts)

`Modules/Features/MessageShortcuts/Implementation/` (abbreviated `MS/`). Opened from "View More Shortcuts".

- Presented as a `.formSheet` inside a navigation controller with a close button (`MS/MessageShortcutsFeature.swift:32-57`);
  title "More Message Shortcuts" (`more_message_shortcuts`, 12448); background `basePrimary` #ffffff / #1a1d21 (`Colors.swift:42`;
  June `.sk_primary_background`, the same values) (`MS/MessageShortcutsViewController.swift:26-29`); the close button now
  comes from the navigation title configurator (`:46`).
- A search view on top, 4 pt above the list (`MS/MessageShortcutsViewController.swift:22-51`), then one section per app:
  an M header with the app icon and app name, rows = S generic rows with the shortcut name and no ornament
  (`MS/MessageShortcutsPresenter.swift:65-111`).
- Empty: "No shortcuts found" (`no_shortcuts_found`, 13083); no search results: "No search results found for “%@”"
  (`no_search_results_generic`, 13077) with a "Clear search" button (`clear_search`, 4063) (`MS/MessageShortcutsPresenter.swift:50-61`).
- Selecting a row dismisses the screen and runs the shortcut (`MS/MessageShortcutsFeature.swift:78-92`).

### 1.11 Tap-and-hold education (MessageActionsEducation)

`Modules/Features/MessageActionsEducation/Implementation/` (abbreviated `MAE/`).

- Current path: an `SKDialog` presented as a native sheet (`MAE/MessageActionsEducationRouteExecution.swift:13-21`), triggered
  by a megaphone inside a conversation (`Modules/Features/AnyConversation/Implementation/Plugins/MegaphoneConversationPlugin.swift`).
  Content is the EDU "simple" dialog (layout in §5): the looping animation `message_actions_education` (corner radius 24,
  aspect-fit), title "Behold: The tap and hold" (`behold_the_tap_and_hold`, 2429), subtitle "Tap and briefly hold your
  finger on a message to add reactions, set reminders and more." (`tap_and_briefly_hold_your_finger`, 21021), primary
  button "Try It" (`try_it`, 22291) that dismisses (`MAE/MessageActionsEducationDialogContentProvider.swift:24-50`).
- Older bottom-sheet version still in the module (`MAE/MessageActionsEducationFeature.swift:32-34`): padding 16 left/right
  and 22 top/bottom on `basePrimary`, animation 172 tall, 24 gap, title `.subtitle` (Lato 20 Black) centered, 4 gap,
  subtitle in `contentSecondary` #454447 / #b9babd (`Colors.swift:206`; June `.sk_foreground_max_solid`) centered (font not
  set: SKLabel default), 28 gap, "Try It" button 48 tall, style `.primary` (background `highlight2.baseInverse` #007a5a /
  #177e56, `Colors.swift:104`, white title; June `.sk_lilypad_green` #007a5a in both modes), size `.large` (`.bodyBold` 17,
  radius 14) (`MAE/MessageActionsEducationViewController.swift:19-26,86-105`, `MAE/MessageActionsEducationPresenter.swift:35-68`,
  `SKButton+Types.swift:166-167,210-212,273-274,329-330`).

### 1.12 Gaps

- No snapshot of the sheet exists; the exact label line heights (so exact button and row heights) are not in the source.
- "Summarize": there is no summarize row in this sheet (looked for "summar" in `MA/`; only a translation summary id and
  an unused toast duration, `MA/MessageActionsInteractor.swift:52-53`). "Share message" is the Forward button;
  "Turn off notifications for replies" is "Don't Get Reply Notifications".
- iOS 26 native-sheet corner radius and grabber are system-drawn (§0.2) and not in Slack source.
- Whether the collapse caret rotation animates: not found (the transform is set directly in `SKHeaderEntity.swift:720-727`;
  any animation would come from the list update).

## 2. Emoji picker and reactors

`EP/` below = `Modules/Features/EmojiPicker/Implementation/EmoijPicker/` (the folder name really is misspelled
"EmoijPicker"). There are no snapshot PNGs of the emoji picker in either checkout; the reactors sheet has four iOS 26
snapshots (§2.8).

### 2.1 Presentation

| Case | Presentation | Source |
|---|---|---|
| iPhone, default | legacy `SKBottomSheet` (§0.1). Short form = 298 pt of content (+ bottom safe area); long form = full height (up to top safe area + 21). After the first expansion the short form is disabled, so the next swipe down dismisses | `EP/EmojiPickerFeature.swift:43-52`, `EP/ModalPicker/EmojiPickerViewController.swift:525-535,573-576`, `EP/ModalPicker/Presentable/EmojiPickerPresentable.swift:38-44` |
| iPhone, flag `bottomsheetMigration` | native sheet (§0.2), detents: fixed 298 and `.large` | `EP/EmojiPickerFeature.swift:36,48-49` |
| iPad (non-compact) | form sheet 560 × 360 | `EP/EmojiPickerFeature.swift:34,44-46` |

- Opened from the message-actions "add reaction" button (§1.4), the reactors sheet's "Add a reaction" bar (§2.8), and
  other callers of `EmojiPickerFeatureConfig` such as the rich-text composer
  (`Modules/Features/RichTextInput/Implementation/RichTextInputInteractor.swift`) and the emoji/GIF switcher
  (`Modules/Features/EmojiGifSegmentedSwitcher/Implementation/EmojiGifSegmentedSwitcherFeature.swift`).
- Background `basePrimary` #ffffff / #1a1d21 (`EP/ModalPicker/EmojiPickerViewController.swift:243`).
- Dragging from the top 64 pt (the search header) always moves the sheet (`EmojiPickerViewController.swift:49,559-563`);
  any sheet drag ends search editing (keyboard down) (`:565-571`). The grid dismisses the keyboard on drag
  (`EP/EmojiGrid/EmojiGridViewController.swift:98`).
- Selecting an emoji: selection haptic, the picker dismisses and returns the emoji (`EmojiPickerViewController.swift:350-353`,
  `EmojiGridViewController.swift:223-229`); since June a pick from search results is also recorded for frecency ranking
  (`EP/EmojiPickerFeature.swift:204-206`).
- New since June: the picker is the root of its own navigation controller with the bar hidden; adding a custom emoji
  pushes the upload screen inside the sheet (bar shown, popped after a successful upload, which then searches for the new
  emoji) instead of presenting another modal (`EP/EmojiPickerFeature.swift:89-104,262-281`).

### 2.2 Header: search field and add button

| Element | Value | Source |
|---|---|---|
| Search bar | native `UISearchBar`, style `.prominent`, no background image; insets top 6, left 8, bottom 6, right 8 (`Spacing.small + 2`, `Spacing.medium`) | `EmojiPickerViewController.swift:50,86-97,305-313` |
| Placeholder | "Search all emoji" (`search_emoji`, yaml:17074) | `EmojiPickerViewController.swift:91` |
| Field background | `baseSecondary` #f8f8f8 / #1a1d21 (other field chrome — height, radius, magnifier icon, clear button — is the system `UISearchTextField`) | `EmojiPickerViewController.swift:94` |
| Cursor / Cancel tint | `highlight1.content` #1264a3 / #2ba5ce (`Colors.swift:218`; June `.sk_highlight`, dark #1d9bd1) | `EmojiPickerViewController.swift:90` |
| Add-emoji button | `SKIconButton(useGlassEffect: true)` with `svgPlus` → `plus.svg` (20 × 20) tinted `contentSecondary` #454447 / #b9babd; constrained to 36 × 36; 16 from the right edge, 8 right of the search bar, vertically centered on it; VoiceOver "Add custom emoji" (`add_custom_emoji`, 732). **iOS 26 (new since June)**: a Liquid Glass circle, `UIGlassEffect(.regular)`, interactive, tinted `surfacePrimary` #1d1c1d/0f / #f8f8f8/0f (pressed: `surfaceSecondary` #1d1c1d/40 / #f8f8f8/40; `Colors.swift:134,140`) as a capsule; below iOS 26 a plain circle in those colors. June: a solid `baseSecondary` circle | `EmojiPickerViewController.swift:113-152,313,317-318`, `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/IconButton/SKIconButton.swift:32-44,250-262,447-449` |
| Add-emoji menu | tap opens the photo library; a menu titled "Add Emoji" (`add_emoji`, 745) offers "Photo Library" (`photo_library`, 14722, `svgImage` → `image.svg`), "Take Photo" (`take_photo`, 21015, `svgCamera` → `camera.svg`, not on iPad), "Image Playground" (`apple_image_playground`, 2006, `svgBrandAppleIntelligence`) | `EmojiPickerViewController.swift:128-146`, `EP/ModalPicker/Emoji List/Presentables/EmojiListPresentable.swift:235-270` |
| Add-button visibility | hidden while searching and for users who can't add custom emoji; hide/show = constraint change animated 0.25 s plus alpha 0 ↔ 1 and scale 0.6 ↔ 1 with the default spring (smooth, 0.4 s) | `EmojiPickerViewController.swift:367-388,436-463`, `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+SpringAnimation.swift:16-35,125-126` |
| Separator | 1 pixel, full width, `outlineTertiary` #5e5d60/21 / #797c81/4d, 6 pt below the search bar | `EmojiPickerViewController.swift:102-108,310,321-323` |

Search mode: focusing the field expands the sheet to long form, shows the system "Cancel" button, hides the add button
and cross-fades the grid out and the results list in (0.1 s, ease-out); the category bar hides. Cancel clears the text
and returns to the grid (`EmojiPickerViewController.swift:361-380,406-433`).

### 2.3 Emoji grid

| Property | Value | Source |
|---|---|---|
| Cell | 36 × 36; native and custom emoji both drawn 36 × 36, centered | `EP/EmojiGrid/EmojiGridViewController.swift:29-35,184-194`, `EP/EmojiGrid/Views/EmojiGridCell.swift:72-78,103-110` |
| Columns | 7 on a phone (5 at 320 pt wide; 8 compact iPad; 10 iPad ≥ 560; 12 when width > 648) | `EmojiGridViewController.swift:323-346` |
| Insets | section inset top 6, left 16, bottom 6, right 16; 16 between rows | `EmojiGridViewController.swift:30,35,80-84` |
| Column gap | justified: (width − 32 − 7 × 36) / 6 → 18.2 at 393 pt wide | `Modules/Features/EmojiPicker/Interface/Layout/EmojiGridViewVerticalFlowLayout.swift:127-142` |
| Extra bottom space | 40 pt after the last section on iPhone (room for the category bar) | `EmojiGridViewController.swift:37,84`, `EmojiGridViewVerticalFlowLayout.swift:84-85` |
| Pressed | a 48 × 48 circle (cell + 6 on each side, radius 25) in `baseTertiary` #eaeaea / #212428 behind the emoji; unpressed backdrop is `basePrimary` (invisible) | `EmojiGridCell.swift:52-60,80-98`, `EP/EmojiGrid/Presentables/EmojiGridViewModel.swift:354-374` |
| Background | `basePrimary` | `EmojiGridViewController.swift:95` |
| Paging | more custom emoji load when scrolled within half a screen of the end | `EmojiGridViewController.swift:233-254` |

Sections, in order (`EP/EmojiGrid/Presentables/EmojiGridViewModel.swift:261-299`,
`Modules/Data/EmojiData/Implementation/Models/EmojiCategory.swift:33-45`):

| Section header text (key, yaml line) | Contents |
|---|---|
| "Frequently Used" (`frequently_used_emoji_category`, 7482) | the user's top 21 emoji on iPhone (20 on iPad, 24 compact iPad) (`EmojiGridViewModel.swift:156-168`); padded with the fallback list in §1.4 |
| "Emoji that start workflows" (`reacji_emoji_section_header`, 15536) | only when the channel has workflow reacji |
| "Smileys & People" (`smileys_and_people_emoji_category`, 20287) | standard |
| "Animals & Nature" (`animals_and_nature_emoji_category`, 1864) | standard |
| "Food & Drink" (`food_and_drink_emoji_category`, 7315) | standard |
| "Activities" (`activities_emoji_category`, 583) | standard |
| "Travel & Places" (`travel_and_places_emoji_category`, 22026) | standard |
| "Objects" (`objects`, 13594) | standard |
| "Symbols" (`symbols`, 20902) | standard |
| "Flags" (`flags_emoji_category`, 7240) | standard |
| "Custom" (`custom_emoji_category`, 5050) | workspace custom emoji, paged |

Titles come from `Modules/Data/DataModels/Implementation/ClientModels/Emoji/EmojiCategory+LocalizedTitle.swift:10-35`.

Section header: 32 tall (`EmojiGridViewController.swift:31`), background `basePrimary`, title `.caption` (Lato 13
Regular) `contentSecondary` #454447 / #b9babd (`EP/EmojiGrid/Views/EmojiGridSectionHeader.swift:34,62-64`). The header
view starts at x = 16 (the section inset) and the label is inset another 16, so the text starts 32 from the left edge
(computed from `EmojiGridViewVerticalFlowLayout.swift:106` + `EmojiGridSectionHeader.swift:55`; no snapshot to confirm).
Headers are sticky: each stays pinned to the top of the grid while its section scrolls under it and is pushed up by the
next one (`EmojiGridViewVerticalFlowLayout.swift:88-116`).

### 2.4 Category bar (bottom)

`EP/EmojiGrid/Views/EmojiPickerAccessoryBar.swift`

| Property | Value | Source |
|---|---|---|
| Position | pinned to the bottom safe-area edge, full width, above the grid | `EmojiPickerViewController.swift:269-276` |
| Control | a `UISegmentedControl`, one segment per category (no reacji segment), insets top 4, left 24, right 22, bottom 4 on iPhone (12 on iPad) from the safe area, at least 14 from the view bottom | `EmojiPickerAccessoryBar.swift:37-53,124-134,174-188` |
| Background | a **capsule** (corner radius = its height / 2, continuous curve) since June — "so it matches the category pills" — filled `baseTertiary` #eaeaea / #212428 (`Colors.swift:56`) over a `.systemUltraThinMaterial` blur (the opaque fill hides the blur), with a 1-pt `outlineTertiary` border #5e5d60/21 / #797c81/4d (`Colors.swift:302`); framed on the control 1 pt lower and 2 pt short of its right edge (so 24 pt in from both sides). June: the blur alone, radius 8. The segmented control itself is clear; selected segment fill `basePrimary` | `EmojiPickerAccessoryBar.swift:52,98-109,114-120,150-155,168-172,191,206`, `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+Autolayout.swift:34-53` |
| Icons | icon-font glyphs 20 pt; unselected `contentPrimary`, selected `.emoji_category_bar_foreground_selected` (#1d1c1d / #ffffff) | `EmojiPickerAccessoryBar.swift:74-90`, `SKLegacyColors.swift:377` |
| Custom segment selected | shows the Slack hash image at 20 × 20 instead of the glyph; since June every segment image is redrawn when the appearance changes (the colors are baked into the images) | `EmojiPickerAccessoryBar.swift:68-72,150-155,209-231,249-257` |
| Tap a segment | scrolls the grid to that section (in the bottom sheet: jumps without animation and expands to long form); scrolling the grid updates the selected segment | `EmojiPickerViewController.swift:342-345,468-514` |

Segment glyphs (`EmojiCategory.swift:47-72`) with the SVG equivalents from `SKIconManifest+SVGMapping.swift`:

| Category | Glyph (manifest case) | SVG equivalent |
|---|---|---|
| Frequently Used | `\u{E079}` `.clockO` | `svgClock` → `clock.svg` (`SKIconManifest+SVGMapping.swift:63`) |
| Smileys & People | `\u{E119}` `.happySmile` | `svgEmojiFilled` → `emoji_filled.svg` (`:104`) |
| Animals & Nature | `\u{E126}` `.emojiNature` | `svgEmojiNature` → `emoji_nature.svg` (`:79`) |
| Food & Drink | `\u{E127}` `.emojiFood` | `svgEmojiFood` → `emoji_food.svg` (`:78`) |
| Activities | `\u{E129}` `.emojiActivities` | `svgEmojiActivities` → `emoji_activities.svg` (`:77`) |
| Travel & Places | `\u{E130}` `.emojiTravel` | `svgEmojiTravel` → `emoji_travel.svg` (`:80`) |
| Objects | `\u{E025}` `.lightbulbO` | no mapping; closest SVG in the set is `emoji_objects.svg` (`svgEmojiObjects`, manifest:3880) |
| Symbols | `\u{E199}` `.emojiSymbols` | no mapping; `emoji_symbols.svg` (`svgEmojiSymbols`, manifest:3881) exists |
| Flags | `\u{E141}` `.flag` | `svgEmojiFlag` → `emoji_flag.svg` (`:98`) |
| Custom | `\u{E800}` `.slack` | no mapping (Slack logo glyph) |

(Manifest case names from `Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift:2920-3604`.)

### 2.5 Search results

`EP/ModalPicker/Emoji List/`

- A list of §0.3 size-S rows: the emoji in the 24-pt ornament box (the box is given a `baseTertiary` background, but S
  boxes draw clear, §0.4), then the emoji's name as the label, wrapping allowed (`Presentables/EmojiListPresentable.swift:409-440`).
- Workflow reacji rows add the secondary line "Starts %@ workflow" (`start_workflow_description`, 20654) and a trailing
  `svgPlay` → `play.svg` accessory (`EmojiListPresentable.swift:410-425`).
- Tap selects and dismisses; long-press a native emoji with skin tones opens §2.6 (`EmojiListViewController.swift:111-136`).
- No results: centered label 100 pt below the top, Lato 15 Regular, `contentTertiary` #5e5d60 / #9a9b9e, up to 3 lines:
  "No emoji results found for\n"%@"" (`no_emoji_results_found_for_search_query`, 12973); below it (10 pt) an "Add custom
  emoji" button (style `.systemDefault` = `highlight1.content` text, icon `svgAddReaction` → `add_reaction.svg`) if the
  user may add emoji, whose menu is titled "Hint: Drag and drop a photo" (`drag_and_drop_emoji_hint`, 5884)
  (`EmojiListViewController.swift:49-58,167-209`, `EmojiListPresentable.swift:265-267`,
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:206-207`).
- Dragging an image onto the picker while searching shows a drop zone and starts custom-emoji upload
  (`EmojiPickerViewController.swift:604-629`).

### 2.6 Skin-tone picker

Long-press (standard recognizer) on a native emoji that has skin tones: medium impact haptic, then a popover anchored to
the cell (`EmojiGridViewController.swift:267-299`). `Modules/Features/EmojiPicker/Implementation/EmojiSkinTonePicker/` (`ST/`):

| Variant | Size | Layout | Source |
|---|---|---|---|
| Single-person emoji | 270 × 50 popover | centered row: default-tone emoji 36 × 36, 10 gap, a 1 × 32 divider (`outlineTertiary`), 10 gap, the five tones 36 × 36 each; background `basePrimary` | `ST/EmojiSkinTonePickerDataTypes.swift:78-80`, `ST/SkinToneSelection/SingleSkinTonePickerViewController.swift:17-24,33-43,58-99` |
| Multi-person emoji | 270 × 200 popover | two tone selectors plus a result button (partial emoji cells 48 with 3 inset, result 82 × 54, section spacing 10 vertical / 15 horizontal, 1-pt divider) | `ST/SkinToneSelection/MultiSkinTonePickerViewController.swift:23-32,106` |

- Each tone is an `EmojiButton`: corner radius 4; pressed background `.sk_sky_blue` (#1d9bd1) at 20%
  (`ST/SkinToneSelection/EmojiButton.swift:16-19,57-60,106-109`, `SKLegacyColors.swift:232`).
- Always a popover, also on iPhone (`adaptivePresentationStyle` returns `.none`) (`SingleSkinTonePickerViewController.swift:111-117`).
- Choosing a tone selects `name::skin-tone-N` and dismisses the picker (`ST/EmojiSkinTonePickerFeature.swift:50-56`,
  `EmojiGridViewController.swift:363-371`).
- There is no persistent skin-tone preference control in the picker (not found in `EP/`); the grid shows each emoji in
  the user's current skin tone (`EmojiGridViewModel.swift:244`).

### 2.7 Other picker entry points

- Custom emoji upload (`Modules/Features/EmojiPicker/Implementation/CustomEmojiUpload/`) and Image Playground
  (`…/ImagePlaygroundAI/`) are secondary flows not specified here.

### 2.8 Reactors sheet ("who reacted")

`RX/` = `Modules/Integration/Reactors/Implementation/`. Snapshots (iOS 26, 393 × 852, light):

- `Modules/Integration/Reactors/Snapshots/iOS_26/ReactorsServiceTests.ReactorsViewControllerViewTests/testViewInViewOnlyMode@3x.png`:
  two emoji tabs (🙂 2 selected in blue with a blue underline, a custom-emoji placeholder with 1), header ":slightly_smiling_face:",
  rows Jane Doe and John Doe.
- `…/testViewInEditMode@3x.png`: same plus a red "Remove" on your own row and the "Add a reaction" bar at the bottom.
- `…/testReactWithEmojiButtonInEditMode@3x.png`: header shows "React with :slightly_smiling…" in blue on the right. Its test
  is disabled in the September tree (`disabled_testReactWithEmojiButtonInEditMode`,
  `Modules/Integration/Reactors/Tests/Unit/ReactorsViewControllerViewTests.swift:39-42`), so this PNG still shows June's colors
  (a #dddddd tab border, a #e01e5a "Remove", a #868686 "Add a reaction"); the other three were re-recorded with the
  September colors below.
- `…/testReactWithEmojiButtonInViewOnlyMode@3x.png`: view-only variant.

Presentation: legacy bottom sheet (§0.1) with short form 300 pt of content and long form = full height minus a 12-pt top
inset (`Spacing.large`); after the first expansion the short form is disabled (`RX/ReactorsViewController.swift:23-25,325-340`).
With the `bottomsheetMigration` flag: native sheet `.medium` + `.large`, grabber visible, popover on iPad
(`RX/ReactorsFeature.swift:21-32`). Opened by long-pressing a reaction pill (0.25 s,
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Reacji Pill/SKReacjiPill.swift:44,92-96`) or from Activity /
saved items (`Modules/Features/Activity/Implementation/ActivityFeature.swift:413-415`). Background `basePrimary`
#ffffff / #1a1d21 (`RX/ReactorsViewController.swift:111`; June `.sk_primary_background`, the same values); a 32-pt
`baseSecondary` strip sits behind the top of the pages' scroll view, as wide as all pages (`:53-58,142`; June
`.sk_foreground_min_solid`).
New since June: when the last reaction is removed (e.g. your own via Remove) the sheet dismisses itself (`:196-210`).

**Emoji tabs** (a Parchment `PagingViewController`, one page per reaction):

| Property | Value | Source |
|---|---|---|
| Tab bar | 60 tall, background `basePrimary`; left/right menu inset 10; tabs size to fit (min width 60) and, when they don't fill the width, stretch to share it equally | `RX/ReactorsViewController.swift:30-41,213-227,264-268` |
| Tab content | the emoji, 6 gap, count in Lato 17 Regular (its height pinned to the emoji's); padding 18 top/bottom, 12 left/right. The `SKEmoji` is created with a 24 × 24 frame but the stack view lays it out at its 20 × 20 intrinsic size (measured: the native 🙂 glyph 15.7 pt wide at scale 1, the custom emoji's placeholder 16 × 16 at the unselected 0.8 scale, `testViewInViewOnlyMode@3x.png`) | `RX/Views/ReactorsPagingCell.swift:18-38,54-61`, `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Emoji/SKEmoji.swift:22,75-77` |
| Tab colors | count `contentPrimary` #1d1c1d / #f8f8f8 → selected `highlight1.content` #1264a3 / #2ba5ce (`Colors.swift:200,218`; June `.sk_primary_foreground` / `.sk_highlight`, dark #d1d2d3 / #1d9bd1), interpolated during swipes; unselected content scaled to 0.8, selected 1.0 | `ReactorsPagingCell.swift:20-32,102-110` |
| Indicator | 3 pt tall under the selected tab, `highlight1.content` (June `.sk_highlight`), inset 10 from the tab edges | `RX/ReactorsViewController.swift:37,264-268`; measured 20 → 186.3 pt wide for the first of two tabs in `testViewInEditMode@3x.png` |
| Bottom border | 1 pt, `outlineTertiary` #5e5d60/21 / #797c81/4d (`Colors.swift:302`; June `.sk_foreground_low_solid` #dddddd / #323538), full width | `RX/ReactorsViewController.swift:36,271-276`; measured at y = 59–60 pt, (234, 234, 234) on white in `testViewInEditMode@3x.png` |
| Paging | swipe horizontally between reactions; opens on the tapped reaction (exact name, else same emoji without skin tone) | `RX/ReactorsViewController.swift:213-261` |

**Page (one reaction)** (`RX/Presentables/ReactorsPageListModel.swift:55-124`):

| Element | Value | Source |
|---|---|---|
| Header | `SKHeaderEntity` size M (§0.5): ":name:" (the emoji's localized name in colons) in `.smallBodyBold` 15 Bold `contentPrimary`; measured 50 pt from the tab border to the first row | `ReactorsPageListModel.swift:63-81`; `testViewInViewOnlyMode@3x.png` |
| "React with" button | right side of the header, text "React with :%@:" (`react_with_emoji`, yaml:15546) in `.smallBodyBold` `highlight1.content` #1264a3 / #2ba5ce, truncated; only in edit mode when you haven't reacted; tapping adds that reaction | `ReactorsPageListModel.swift:67-74`, `RX/Presentables/ReactorsPageViewController.swift:94-95,104-112`; `testReactWithEmojiButtonInEditMode@3x.png` |
| Rows | member rows size M: 36-pt avatar (radius 9) with presence badge, 12 gap, name in `.bodyBold` 17 Bold; 56 pt per row (measured: avatars at y 120 and 176) | `ReactorsPageListModel.swift:100-109`, `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/MemberEntity/SKMemberEntity.swift:145`, `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift:98-103` |
| Your own row (edit mode) | trailing "Remove" (`remove`, yaml:16166) button, style `.systemDanger` → `important.content` #c01343 / #de678a (`Colors.swift:236`; June `.sk_raspberry_red` #e01e5a in both modes) | `ReactorsPageListModel.swift:92-98`, `SKButton+Types.swift:208-209` |
| Tap a row | dismisses the sheet, then opens that person's profile (§3) | `ReactorsPageViewController.swift:80-89` |
| Loading | shimmer rows (header without image mask, small cells with image mask) | `ReactorsPageListModel.swift:22-28` |

**"Add a reaction" bar** (edit mode only, `RX/ReactorsViewController.swift:104-109,151-163`):

| Property | Value | Source |
|---|---|---|
| Size / position | 60 tall, full width, bottom pinned to the safe area | `RX/ReactorsViewController.swift:157-161`, `RX/Views/ReactorsAddReactionContainerView.swift:12-15` |
| Shape | on phones: a 1-pt `outlineTertiary` #5e5d60/21 / #797c81/4d outline across the top with 16-pt rounded top corners, filled `basePrimary` (June `.sk_foreground_low`, #1d1c1d / #d1d2d3 at 13%, on `.sk_primary_background`); on regular width a straight top line | `ReactorsAddReactionContainerView.swift:24-30,59-91` |
| Content | an M generic row: `svgAddReaction` → `add_reaction.svg` (20 pt, `contentPrimary`) in a clear 36-pt box, then "Add a reaction" (`add_a_reaction`, yaml:674) in `.body` 17 `contentTertiary` #5e5d60 / #9a9b9e (`Colors.swift:212`; June `.sk_foreground_high_solid` #868686 / #75777a) | `RX/Views/AddReactionControl.swift:23-42` |
| Pressed | whole bar alpha 0.6 | `AddReactionControl.swift:16-18,46-50` |
| Tap | opens the emoji picker (§2.1) for this message | `RX/ReactorsViewController.swift:168-188` |

### 2.9 Gaps

- No emoji-picker snapshot: header text position (x = 32) and the category-bar look are computed from code only.
- System-drawn parts (search field height/radius/icons, segmented-control chrome and height, the shape of iOS 26's
  selected segment, Liquid Glass, popover arrow) are UIKit defaults, not in Slack source.
- Search results get a floating "Give feedback" button once you scroll them, behind `autocompleteFeedback` (default off;
  `EP/ModalPicker/Emoji List/Presentables/EmojiListPresentable.swift:128-130,394-408`); not drawn.
- Glyph-to-SVG mapping is missing for Objects, Symbols and Custom (`SKIconManifest+SVGMapping.swift` has no entry); the
  SVGs named above are the nearest files in the icon set, not a mapping the app uses.

## 3. Profiles and edit status

`UP/` = `Modules/Features/UserProfile/Implementation/`, `PC/` = `Modules/UIInfra/ProfileComponents/Implementation/`,
`ES/` = `Modules/Features/EditStatus/Implementation/`. No snapshot PNGs exist for the profile or the status editor
(none under these modules, none by name in the September tree either). Sept 2026: the profile presenter's mapping moved
to `UP/Root/UserProfileViewStateMapper.swift`, shared by the legacy `UserProfilePresenter` and a new
`PresentableUserProfilePresenter` (flag `presentableUserProfile`, off; both "render identically",
`UP/Root/UserProfilePresenter.swift:12-17`); the rows, buttons and menu are unchanged except for colors.

### 3.1 Presentation

- **Pushed** by default: `UserProfileRoute` (displayAsModal `false`) pushes the profile onto the current stack
  (`.pushesToCurrentModalIfAvailable`; with `dismissAllModals`, e.g. a message's avatar or name, the header menu, Search,
  it first dismisses every modal) (`UP/UserProfileRouteExecution.swift:35-42`, Sept 2026 path; June
  `App/Source/Navigation/RouteExecutions/UserProfileRouteExecution.swift`). Channel details and its member list push it
  too (`Modules/Features/ConversationDetails/Implementation/ConversationDetailsFeature.swift:336-339`,
  `Modules/Features/ConversationMemberList/Implementation/ConversationMemberListFeature.swift:146-147`). A push from a
  message avatar or name zooms out of it on iOS 26 (`preferredTransition = .zoom`, skipped under the unified navigation
  variant; June needed the `zoomNavigation` flag) (`UP/UserProfileRouteExecution.swift:25-33`,
  `Modules/Features/Handlers/MessageActionHandler/Implementation/Handlers/PrimaryMessageActionHandler.swift:195-196,485-488`).
- **Modal** with `displayAsModal: true` — the legacy `.present` navigation context (the reactors sheet), the org chart,
  canvas mentions, Salesforce records — and for You's View profile (`CurrentUserProfileRoute`: a modal, or a push into a
  modal that takes pushes, `UP/CurrentUserProfileRouteExecution.swift:33-44`): `.fullScreen` on iPhone, form sheet on iPad
  (`UP/Root/UserProfileFeature.swift:67-88`; `Modules/Features/LegacyNavigation/Implementation/NavigationManager.swift:598-600`),
  in a navigation controller with the automatic close button (a navigable feature is embedded, which adds it whatever
  `closeButtonBehavior` says: `Modules/UIInfra/Architecture/Implementation/Navigation/ModalPresentationController.swift:400-419`,
  `Modules/UIInfra/Architecture/Implementation/Navigation/ModallyPresentableFeature.swift:38-42,70-71`).
- Bar: title "Profile" (`profile`, yaml:15323) via `configureDetailTitle` (Lato Bold 17, as before), and on the right
  an ellipsis bar button (`.ellipsis`, VoiceOver "Show more options", `show_more_options`, 18972) that opens a native menu
  (§3.5) (`UP/Root/UserProfileViewController.swift:31-32,55-63`, `UP/Root/UserProfileViewStateMapper.swift:489-495`).
  Tapping a person in the reactors sheet presents it (§2.8,
  `Modules/Integration/Reactors/Implementation/Presentables/ReactorsPageViewController.swift:80-89`).
- The whole screen is one `SKEntitiesList` (sections below), background = list default `basePrimary`
  (`UP/Root/UserProfileViewController.swift:21-29,38-39`, §0.3).

### 3.2 Header section, top to bottom

Order from `UP/Root/ContentProvider/UserProfileContentProvider.swift:612-842` (`mapToHeaderRowData`); the header section
has no section header (`PC/ProfilePresentationObjectMapper.swift:49-55`).

| # | Row | Layout and type | Source |
|---|---|---|---|
| 0 | Org-chart NUX banner (sometimes) | `SKBanner` info: heading "See this person's org chart" (`org_chart_nux_header`, 14200), text "Find out how this person is connected to others in your organization. Tap or scroll to view their team and org chart." (`org_chart_nux_text`, 14203) in `.smallBody`, "NEW" badge ornament (white on `highlight1.baseInverse` #1264a3 / #0a77a7, `Colors.swift:98`; June `.sk_sapphire_blue`), dismiss ✕ | `UP/Root/UserProfileViewStateMapper.swift:138-151` |
| 1 | **Photo** | `SKMemberAvatar` size `.profile`, square, full width minus 16 on each side (361 × 361 at 393 wide), 16 above, 0 below; corners min(20, 0.25 × side) = 20. Landscape phone: insets 192 left/right, 8 top; iPad: 120 left/right | `PC/Views/ImageRow.swift:33-40,46,90-99,130-137,142-172`, `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift:98-103,948-949` |
| 1a | Photo banner (guests, deactivated, Slack Connect) | overlays the bottom 42 pt of the photo, same width, radius 8, padding 12 top/bottom 16 left/right, 12 gap, 20-pt icon box. Guests: "Single-Channel Guest" (`single_channel_guest`, 19185) / "Multi-Channel Guest" (`multi_channel_guest`, 12597), and (Sept 2026) multi-channel guests who are frontline workers "Frontline" (`frontline`, 7506; "Invited Frontline" `invited_frontline` 10138 before they join), in `.body` on a `contentPrimary` (#1d1c1d / #f8f8f8) strip with `basePrimary` text; Slack Connect: org name in `.smallBodyBold` on the same dark strip with the org icon; deactivated: "Deactivated account" (`deactivated_account`, 5217) `.smallBodyBold` `contentSecondary` on `baseTertiary`, 16-pt icon | `PC/Views/ImageRow.swift:25,101-118,162-165`, `PC/Views/ProfileBannerView.swift:16-21,125-132,144-191`, `UserProfileContentProvider.swift:908-925` |
| 2 | **Name** | `.title` = Lato 22 Black, wraps; padding top 12, left/right 16, bottom 0; a trailing `svgVipFilled` → `vip_filled.svg` icon when the person is one of your VIPs. If a name recording exists, an audio button follows 8 pt after the name: 30 × 30, 1-pt border `contentPrimary` at 70%, radius 6, `svgSound` icon 20 × 20; while playing it animates `sound` → `sound_up` → `sound_down` in `highlight1.content` over 0.9 s (VoiceOver "Play Name Pronunciation", `play_name_pronunciation_a11y_label`, 14836) | `PC/Views/NameRow.swift:25-43,49-60,109-117,120-123,141-157`, `UP/Root/UserProfileViewStateMapper.swift:152-174` |
| 3 | **Title + pronouns** | title in `.body` 17 Regular `contentPrimary`; below it pronouns and name pronunciation joined by " · " in `.smallBody` 15 `contentPrimary`; padding top 4, left/right 16, bottom 12 | `PC/Views/TitleRow.swift:18-25,61-81`, `UserProfileContentProvider.swift:672-688` |
| 4 | Celebration tag (birthday, work anniversary) | an `SKTokenView` tag with `.bodyBold` text; celebration banner/animation above the photo pushes the photo down by half the banner height | `PC/ProfilePresentationObjectMapper.swift:308-320`, `PC/Views/ImageRow.swift:27-29,120-137,175-197` |
| 5 | Out-of-office banner (enterprise OOO status) | `SKBanner` info, heading "%1$@ until %2$@" (`out_of_office_status_banner_header`, 14456) = status text + end date, body = OOO message, status emoji (⛔️ fallback) | `UserProfileContentProvider.swift:697-712`, `UP/Root/UserProfileViewStateMapper.swift:175-191` |
| 6 | **Presence** | ornament row (below): `svgStatusMemberFilled` → `status_member_filled.svg` in `highlight2.content` #007a5a / #3daa7c + "Active" (`active`, 577); away: `svgStatusMember` → `status_member.svg` in `contentTertiary` + "Away" (`away`, 2364); snoozed adds ", notifications snoozed" (`notifications_snoozed`, 13504, lowercased) and the `_dnd` icons | `UP/Root/UserProfileViewStateMapper.swift:192-205`, `SKMemberAvatar.swift:812-881` |
| 7 | "Built by Slack" (agents) | `svgSlackLogo` + "Built by Slack" (`built_by_slack`, 2632) | `PC/ProfilePresentationObjectMapper.swift:353-362` |
| 8 | **Status** | ornament row with the status emoji (20-pt box, long-press enabled) + status text; hidden when there is no status emoji or it is the OOO status | `UP/Root/UserProfileViewStateMapper.swift:206-223,498-505`, `UserProfileContentProvider.swift:724-732` |
| 9 | **Local time** | `svgClock` → `clock.svg` + "%@ local time" (`time_in_user_timezone`, 21695), where %@ is the time in their timezone plus " (Tomorrow)" / " (Yesterday)" (`tomorrow` 21898 / `yesterday` 24196) when their date differs; not for Slackbot/agents | `UserProfileContentProvider.swift:735-742`, `Modules/Data/I18n/Implementation/TimeUtility.swift:1171-1213`, `PC/ProfilePresentationObjectMapper.swift:132-141` |
| 10 | Location / user type (full members) | `svgBuilding` → `building.svg` + location; `svgUser` → `user.svg` + user type ("-" placeholders while loading) | `UserProfileContentProvider.swift:744-772`, `UP/Root/UserProfileViewStateMapper.swift:224-231` |
| 11 | Not-on-Slack banner (profile-only users) | heading "Not on Slack" (`not_on_slack`, 13198), text "This person doesn’t have a Slack account, but you can find some of their info below." (`not_on_slack_description`, 13201) | `UserProfileContentProvider.swift:777-780` |
| 12 | **Action buttons** | §3.3 | `UserProfileContentProvider.swift:774-851` |

Ornament text rows (6–10): a 20-pt box (verySmall, §0.4) holding a 20-pt icon or the emoji, 8 gap, text `.smallBody`
(Lato 15 Regular) `contentPrimary` (wraps), padding top 0, left/right 16, bottom 8 (`PC/Views/OrnamentTextRow.swift:18-25,72-99`).
Icons are tinted `contentPrimary` #1d1c1d / #f8f8f8 (`Colors.swift:200`): the clock, and since September the location and
user-type icons too (June `.sk_primary_foreground` #1d1c1d / #d1d2d3)
(`UP/Root/UserProfileViewStateMapper.swift:225,229`, `PC/ProfilePresentationObjectMapper.swift:133`).

### 3.3 Action buttons

Which buttons (`UserProfileContentProvider.swift:774-851`):

| Profile | Buttons, in order |
|---|---|
| Someone else | Message (not for agents) · Huddle (if huddles are enabled; otherwise Call if a calling app is set up) · VIP (if you have VIP access and they can be added) |
| You | Set a Status · Edit Profile |
| System notification user | Go To App · VIP (new design only; the old design draws none, `:781-790`) |
| Deactivated person | the Message button reads "View Message History" |

Two looks, chosen by the flag `userProfileEnhancements` (`UserProfileContentProvider.swift:775`; default **off**,
`Modules/Data/Toggles/Definitions/ios_user_profile_enhancements.json:6`, so the old design ships):

**New design (flag on)**: one row of `.quickAction` buttons (same colors, radius and border as §1.5) in size `.large`
with the icon on top, one line each, equal widths with 8 between, row padding 10/16; at accessibility text sizes they
stack full width (`UP/Root/UserProfileViewStateMapper.swift:304-412`, `UP/Root/UserProfileViewController.swift:34-36`,
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/ButtonEntity/SKButtonEntity.swift:25-26,221-222`).

| Button | Icon → svg | Title (key, yaml line) |
|---|---|---|
| Message | `svgMessage` → `message.svg` (`svgCompose` → `compose.svg` for Slackbot) | "Message" (`message`, 12060); Slackbot: "New Message" (`new_message`, 12837); deactivated: "View Message History" (`view_message_history`, 23230) |
| Huddle | `svgHeadphones` → `headphones.svg` | "Huddle" (`user_profile_huddle`, 23011) |
| Call | `svgCall` → `call.svg` | "Call" (`user_profile_call`, 23005) |
| VIP | `svgUserAdd` → `user_add.svg`; selected style with `svgUserHide` → `user_hide.svg` when already a VIP | "VIP" (`vip`, 23297) |
| Set a Status | none | "Set a Status" (`set_a_status`, 17691) |
| Edit Profile | none | "Edit Profile" (`edit_profile`, 6053) |
| Go To App | `svgApps` → `apps.svg` | "Go To App" (`app_profile_go_to_app`, 1978) |

**Old design (flag off)**: each button is its own full-width row, style `.outlineDefault`, size `.large`, icon left of
the title, same titles, except VIP reads "Add to VIP" (`add_to_vip`, 947) / "Remove from VIP" (`remove_from_vip`, 16260)
(`UP/Root/UserProfileViewStateMapper.swift:232-303`, `UserProfileContentProvider.swift:822-850`).

Size `.large` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/`): title `.bodyBold` 17 Bold; padding
14 top/bottom, 16 left/right; radius 14; icon 20; icon–title gap 8 (6 when the icon is on top) (`SKButton+Types.swift:273-274,304-305,329-330,356-357,361-367,374-375`,
`SKButton+PresentationObject.swift:224-225`). `.outlineDefault`: background `basePrimary`, 1-pt border `outlineSecondary`
#5e5d60/73 / #797c81/80, title `contentPrimary`, pressed background `baseTertiary` lightened 80% (`SKButton+Types.swift:137-138,158-161,180-183,202-203`,
`SKButton.swift:46,274`).

Taps: Message opens the DM; Huddle starts a huddle; Call opens a bottom-sheet list (`SKListBottomSheet`, §5) with "Start a
huddle", "Start a Slack call", phone and video-meeting sections (`UP/CallsSheetPlugins/HuddleRow.swift:17-18`,
`UP/CallsSheetPlugins/VideoRow.swift:36,66`, `UP/CallsSheetPlugins/PhoneRow.swift:44`); Set a Status opens §3.6; Edit
Profile opens the profile editor (not specified) (`UP/Root/UserProfileViewController.swift:171-190`).

### 3.4 Sections below the header

Order (`UserProfileContentProvider.swift:403-426`, in `buildSectionData` :356-433): Contact Information → Recent DMs
(others; not Slackbot or system users, :1512-1516; June fetched them only with `sharedMpdmsInProfile`, a check removed by
Sept 2026, :1885-1902) → People (manager, reports) → Slack Connect channels (external people) → Affiliations →
Additional Info (custom fields) → [flag `teamProfileProviderRefactor`, off: the workspace's other SCIM sections, with
their own titles] → About (channel experts). June's other path, where a workspace-defined profile layout replaced this
order, is gone: with the refactor flag the layout's fields are pooled, each section above claims its own, and what's
left becomes those extra sections (`:367-378,421-424`, :1298-1326).

| Section | Header text (key, yaml line) | Rows | Source |
|---|---|---|---|
| Contact information | "Contact Information" (`contact_information`, 4518); on your own profile a right "Edit" (`edit`, 5994) text button | S rows: `svgEmail` → `email.svg` + address with secondary "Work" (`work`, 23712) or the field label; `svgCallDown` → `call_down.svg` + phone number; icons `contentPrimary` (June `.sk_primary_foreground`, :1073,1100,1113); tap emails/calls, long-press copies | `PC/UserProfileDataTypes.swift:34-62`, `UserProfileContentProvider.swift:1062-1121`, `PC/ProfilePresentationObjectMapper.swift:220-232`, `UP/Root/UserProfileViewController.swift:105-112,137-147` |
| Recent DMs | "Recent DMs" (`recent_conversations`, 15810) | small group-DM rows, and a blue "escape hatch" row (`highlight1.content` text) | `PC/ProfilePresentationObjectMapper.swift:185-213` |
| People | "People" (`people`, 14666) plus relationship sub-headers (M generic rows) | M member rows with name, title and a chevron; "View Org Chart" (`view_org_chart`, 23252) `.quickAction` large button with `svgHierarchy` → `hierarchy.svg` | `PC/ProfilePresentationObjectMapper.swift:164-184,241-252`, `UP/Root/UserProfileViewStateMapper.swift:413-421`, `UserProfileContentProvider.swift:1161-1213` |
| Slack Connect | — | workspace row (name + verified badge `svgVerifiedFilled` in `.sk_aubergine`), a verified banner "This organization’s identity has been verified by Slack. **Learn more**" (`verified_workspace_learn_more`, 23121), channel rows in `highlight1.content`, "Show more" (`show_more`, 18969) | `PC/ProfilePresentationObjectMapper.swift:253-352` |
| Affiliations / Additional Info | "Affiliations" (`user_profile_affiliations`, 23002) / "Additional Info" (`user_profile_additional_info`, 22999), or the workspace's section title | M rows: label in `.captionBold` 13 Bold `contentSecondary`, value in `.body` 17 `contentPrimary`; link fields show the link text in `highlight1.content` and are tappable; long-text fields collapse to 4 lines with "show more" | `PC/ProfilePresentationObjectMapper.swift:23-30,416-466`, `UP/Root/UserProfileViewStateMapper.swift:422-453` |
| About (agents) | "About" (`about`, 312) | description and an italic legal notice | `PC/ProfilePresentationObjectMapper.swift:363-396` |

Section headers are `SKHeaderEntity` size M (§0.5): `.smallBodyBold` 15 Bold `contentPrimary`; the right button is
`.smallBodyBold` `highlight1.content` (`PC/ProfilePresentationObjectMapper.swift:56-77`). Sections are separated by the
list's default spacing (no explicit dividers set here).

### 3.5 Overflow (ellipsis) menu

Native menu from the nav-bar ellipsis (`UP/Menu/UserProfileInfoMenuBuilder.swift:14-78`); not shown for Slackbot or
channel experts (`UP/Root/UserProfileViewStateMapper.swift:470-472`); system notification users get no huddle, report, flag
or hide items (`:474-484`):

| Item | Icon | Text (key, yaml line) | When |
|---|---|---|---|
| Copy huddle link | `.headphones` → `headphones.svg` | "Copy Huddle Link" (`copy_huddle_link_context_menu`, 4741) | huddles and copying allowed |
| Copy display name | `.newWindow` → `new_window.svg` | "Copy Display Name" (`copy_display_name`, 4707) | always when a display name exists |
| Report | `svgWarning` → `warning.svg` | "Report to Slack" (`report_to_slack`, 16465) | EU reporting rules |
| Flag | `svgInfo` → `info.svg` | "Flag Profile Content" (`flag_profile_content`, 7234) | profile flagging allowed |
| Hide / unhide | `svgUserHide` → `user_hide.svg` | "Hide %@" (`hide_user`, 7943), destructive (red) / "Unhide %@" (`unhide_user`, 22546) | the user can be hidden: a full member other than you (not a guest, invited, deactivated, bot or profile-only user) and the team hasn't opted out (`Modules/Data/DataModels/Implementation/ClientModels/Users/User.swift:328-330`, `UserProfileContentProvider.swift:543-549`); Hide opens the hide-person speedbump, an SKDialog sheet (`Modules/Integration/HiddenUsers/Implementation/HiddenUsersService.swift:134-166`) |

The menu has no title (`UP/Menu/UserProfileInfoMenuBuilder.swift:77`). (`.newWindow` maps to `svgNewWindow`,
`Modules/Data/Icon/Implementation/SKIconManifest+SVGMapping.swift:141`.)

### 3.6 Set a status (EditStatus)

- Presented modally in its own navigation controller (`ES/CustomStatusFeature.swift:171-176`), title "Set a Status"
  (`set_a_status`, 17691), close button, background `basePrimary` #ffffff / #1a1d21 (`Colors.swift:42`; June
  `.sk_primary_background`, the same hex) (`ES/CustomStatusViewController.swift:48-55`).
- Right bar button: a check-mark `svgCheck` → `check.svg` "Save" (VoiceOver `save`), enabled when something changed and
  the text is within 100 characters; when the current status is unchanged and not empty it is "Clear" (`clear`, 4039) in
  `important.content` #c01343 / #de678a (`Colors.swift:236`; June `.sk_raspberry_red` #e01e5a) (VoiceOver "Clear Status",
  `clear_status`, 4066) (`ES/CustomStatusInteractor.swift:46,789-806`, `ES/CustomStatusViewController.swift:58-59`); with the
  pause-notifications flag a changed toggle also counts as a change (`ES/CustomStatusInteractor.swift:790-793`). While saving a
  medium spinner ("Saving…", `saving`, 16939) and an overlay of `basePrimary` at 75% block the screen; swipe-to-dismiss is blocked while there are unsaved changes (`ES/CustomStatusViewController.swift:20-27,58-59,68-103`).

List, top to bottom (`ES/CustomStatusPresenter.swift:49-293`):

| Section | Rows |
|---|---|
| (optional) widget NUX | banner "Add the Status widget" (`status_widget_nux_banner_title`, 20700) / "Set and clear your status right from your mobile home screen." (`status_widget_nux_subtitle`, 20706), `svgEmoji` ornament, dismiss ✕ (`:274-288`) |
| Editor (8-pt blank above) | single-line text input: tappable 24-pt emoji box on the left (opens the emoji picker; with no emoji chosen it shows `svgEmoji` → `emoji.svg` in `contentSecondary` (June `.sk_foreground_max_solid`), pressed `svgEmojiFilled` in `contentPrimary`; `ES/CustomStatusInteractor.swift:48-49,808-816`), placeholder "What’s your status?" (`whats_your_status`, 23636), clear button; new statuses default to "Don’t Clear" (`:50`); an error banner below if saving failed; optional note "Your status is subject to the **Slack Engagement Policy**" (`profile_moderation_status_inline_education`, 15365) in `.caption` `contentSecondary`, centered (`:121-162`) |
| Expiry (8-pt blank above) | S row: `svgClock` icon, "Clear after…" (`clear_after`, 4042) with the current choice as secondary text, chevron. With flag `isCustomStatusPauseNotifEnabled`: "Duration" (`duration`, 5923) in `.bodyBlack` with the choice as right accessory text (`:164-210`) |
| Scheduled (flag `scheduledStatus`, off; new in Sept 2026) | header "Scheduled" (`scheduled`, 16995); S rows: emoji, status text, secondary "From …" / "To …" lines (`scheduled_status_from` / `scheduled_status_to`, short ordinal dates with times) or the duration, a trailing `svgClose` icon button in `contentSecondary` that deletes the scheduled status after an alert (`:217-223,298-361`; `ES/CustomStatusViewController.swift:127-131`, `ES/CustomStatusFeature.swift:240-262`) |
| Pause notifications (flag, not for "Don’t Clear") | "Pause notifications" (`pause_notifications_sentence_case`, 14618) `.bodyBlack`, secondary "VIPs always allowed" (`vips_always_allowed`, 23329) if applicable, `svgNotifications` icon, toggle switch (`:225-242`) |
| Recent | header "Recent" (`recent`, 15798); S rows: emoji, status text, secondary = duration (", notifications paused" appended for DND) (`:51-63,247-249`) |
| Seasonal (flag) | header "Seasonal" (`seasonal`, 17229) (`:114-119,251-253`) |
| Out of office (enterprise) | header "Out of office" (`out_of_office`, 14453); row "Out of office" / "Set end date" (`set_end_date`, 17700) with the OOO emoji; when OOO is on, a "**Message** (optional)" section (the "(optional)" in `contentSecondary`) whose placeholder is "Ex. I’m currently out of office and offline." (`placeholder_out_of_office`, 14822) in `contentSecondary` (`:65-95,254-262`) |
| Presets | header "For %@" (`for_presets`, 7324) with the workspace name, else "Status" (`status`, 20667); S rows: emoji, preset text, secondary = its default duration (`:97-112,255`) |

The preset list itself comes from the workspace preference `custom_status_presets` (server data, not in the client:
`ES/CustomStatusInteractor.swift:305-319`), so the clone should use its own demo presets. Rows are §0.3 size S with the
emoji in the 24-pt box.

"Clear after" screen (`ES/New/StatusExpiration/`): pushed, title "Clear after…", one section (8-pt blank above) of S rows
with a trailing radio button, in this fixed order: "Don’t Clear" (`expiry_dont_clear`, 6582), "30 minutes"
(`thirty_minutes`, 21424), "1 hour" (`one_hour`, 13726), "4 hours" (`four_hours`, 7426), "Today" (`expiry_today`, 6588),
"This Week" (`expiry_this_week`, 6585), "Custom" (`custom`, 5027). Choosing anything but Custom pops back immediately;
Custom shows an inline compact date picker (5-minute steps, no past dates)
(`CustomStatusExpirationInteractor.swift:15-18,82-93`, `CustomStatusExpirationPresenter.swift:32-71`,
`CustomStatusExpirationViewController.swift:19-29`, `Modules/Data/DataModels/Implementation/Constants/ExpiryDuration.swift:54-73`).

### 3.7 Gaps

- No snapshots for either screen; row heights for the ornament rows and title rows depend on label line heights that
  are not in source.
- Which button design ships (flag `userProfileEnhancements`) is a server flag; both are specified.
- Status presets, custom profile fields and section order can be workspace-defined (server data).
- Mini/half-sheet profile: none found (looked in `UP/`; the profile is always the full feature, pushed or presented full
  screen, §3.1). The new `presentableUserProfile` path (off) maps through the same `UserProfileViewStateMapper`.

## 4. Channel and DM details

`CD/` = `Modules/Features/ConversationDetails/Implementation/`; `CDP` = `CD/ConversationDetailsPresenter.swift`. No
snapshot PNGs of this screen exist; the members strip is shown by
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberCollectionEntitySnapshotTests/testMultiMemberConfiguration@3x.png`
(393 × 208, light over dark: three 56-pt avatars with names under them).

### 4.1 Opening and chrome

- The screen is **pushed** (`displayAsModal: false`). With the current header, tapping the conversation title opens the
  header menu (§6.2) and its "Settings & Details" row pushes this screen
  (`Modules/Features/ConversationHeaderMenu/Implementation/NewConversationHeaderHelperService.swift:582-585`,
  `Modules/Features/ConversationHeaderMenu/Implementation/MenuFeature/ConversationTabsMenuFeature.swift:193-194`); on the
  older path the title tap pushes it directly (`Modules/Features/AnyConversation/Implementation/AnyConversationInteractor.swift:310-313`,
  `Modules/Features/AnyConversation/Implementation/AnyConversationFeature.swift:490-491`). In a thread the title goes back
  to the conversation instead (`AnyConversationInteractor.swift:314-316`).
- Background `basePrimary` #ffffff / #1a1d21 (`Colors.swift:42`; June `.sk_primary_background`, the same hex)
  (`CD/ConversationDetailsViewController.swift:57-59`); one `SKEntitiesList` pinned to the edges (`:47-54`).
- Nav title: an `SKNavigationTitle` with the conversation name (channels get their type icon, §4.2) that stays hidden
  until the list scrolls past 50 pt; the nav-bar hairline appears at the same moment (`CD/ConversationDetailsViewController.swift:16-27,43-44,250-263`,
  `CDP:51-53,270-296`). Under the unified navigation variant the same title and buttons go through `SKNavigationItem`
  (`CDP:197-217`, `CD/ConversationDetailsViewController.swift:74-98`).
- Right bar buttons (`CDP:65-181`): an overflow `svgEllipsisHorizontalFilled` → `ellipsis_horizontal_filled.svg` button
  (VoiceOver "More Options", `more_options`, 12451) when there are menu actions, and an `svgEdit` → `edit.svg` button
  (VoiceOver "Edit", `edit`, 5994) when you can rename or set the topic/description. For a named group DM with a topic,
  the edit button opens a menu: "Edit Conversation Name" (`edit_conversation_name`, 6018), "Edit Topic" (`edit_topic`, 6082).
  Sept 2026 builds the array leading to trailing, [Edit, …], and reverses it for UIKit (June built […, Edit] for
  UIKit's trailing-first array): on screen the overflow is still the rightmost item, with Edit to its left (`CDP:70-88`,
  `CD/ConversationDetailsViewController.swift:78-80`). A DM gets Edit only with a topic, and frontline workers never get it
  in DMs or group DMs (`CDP:92-117`).

Overflow menu items, in this order, members only (native menu, `CDP:219-266`; conditions in
`CD/Helpers/ConversationInfoAdapter.swift:334-371,635-651`):

| Item | Icon | Text (key, yaml line) |
|---|---|---|
| Move to section, else star / unstar | `.moveChannel` (glyph, no SVG mapping); `svgStar` → `star.svg` / `svgStarFilled` → `star_filled.svg` | "Move To Section" (`move_to_section`, 12496) when the team has custom sections and the channel isn't temporary (`CD/Service/ConversationDetailsService.swift:954-957`); else "Move To Starred" (`move_to_starred`, 12499) / "Remove from Starred" (`remove_from_starred`, 16256) |
| Flag | `svgFlag` → `flag.svg` | "Flag channel name" / "Flag channel details" (`flag_channel_details`, 7210) / "Flag conversation topic" (flag + content review) |
| Invite external | `.buildings` → `buildings.svg` | "Invite External Connections" (`invite_external`, 9997) |
| Open in Salesforce | `svgNewWindow` → `new_window.svg` | "Open in Salesforce" (`open_in_salesforce`, 14075), record channels |

### 4.2 Header section

`CD/Views/ConversationDetailsHeaderView.swift` (header row), rows below it from `CDP:357-549`. The section ends with a
hairline footer (8 pt with a 1-px `outlineTertiary` line, §1.3).

Header row: padding top 12, left/right 16, bottom 8; stacked, left-aligned, 2 pt between lines
(`ConversationDetailsHeaderView.swift:23-27,51-65`).

| Conversation | Header row content | Source |
|---|---|---|
| Channel | one label, up to 3 lines: the channel-type icon (`svgChannelFilled` → `channel_filled.svg` public, `svgLock` → `lock.svg` private, `svgArchive` → `archive.svg` archived) inline, a space, then the name, all in `.title` (Lato 22 Black) `contentPrimary` #1d1c1d / #f8f8f8 (June `.sk_primary_foreground` #1d1c1d / #d1d2d3), the icon too | `ConversationDetailsHeaderView.swift:242-260`, `CDP:1778-1790` |
| Group DM | the group name (or custom name) in `.title`, up to 3 lines | `ConversationDetailsHeaderView.swift:262-276` |
| DM / yourself | 56-pt avatar (`.extraLarge`, radius 14) with presence (none for yourself), 8 gap; name in `.title` ("%@ (you)", `name_placeholder_you` 12722; "%@ (deactivated)", `name_placeholder_deactivated` 12716); title/role then "@name" (`user_label_format` = "@%@", `Modules/Data/Strings/Implementation/Unlocalized.swift:109-111`) in `.body` 17 `contentSecondary` #454447 / #b9babd (June `.sk_foreground_max_solid` #616061 / #9a9c9e). Tapping pushes the profile (§3.1); pressed background `surfacePrimary` #1d1c1d/0f / #f8f8f8/0f (June `.sk_foreground_soft`, #1d1c1d / #d1d2d3 at 6%) | `ConversationDetailsHeaderView.swift:25,29-32,98-100,199-237,278-326`, `Colors.swift:134,206` |

Rows after the header row (all §0.3 size S, unselectable text rows unless noted):

| Row | When | Text | Source |
|---|---|---|---|
| Topic | topic set | "**Topic:** " (`conversation_topic`, 4645) in `contentPrimary` bold, then the topic, in `.body` `contentSecondary` (June `.sk_primary_foreground` / `.sk_foreground_max_solid`), wraps | `CDP:567-598` |
| Description | channel with description | "**Description:** " (`conversation_description`, 4588) + text, same styling | `CDP:600-631` |
| Add topic / description | you can edit and both are empty (channel) | "Add Topic or Description" (`conversation_add_topic_or_description`, 4585) in `.body` `highlight1.content` #1264a3 / #2ba5ce (`Colors.swift:218`; June `.sk_highlight` #1264a3 / #1d9bd1), tappable | `CDP:373-382,653-671` |
| Add topic | DM / group DM without topic, not for frontline workers | "Add Topic" (`conversation_add_topic`, 4582), `highlight1.content` | `CDP:414-418,448-452,673-692` |
| Add conversation name | group DM naming on, no name, not for frontline workers | "Add Conversation Name" (`add_conversation_name`, 729), `highlight1.content` | `CDP:410-412,633-651` |
| Salesforce record | record channel | "**Salesforce Record:**" (`salesforce_record_header`, 16833) + record summary | `CDP:696-715` |
| Workspaces with access / team connections | shared or multi-workspace channels | lists of workspaces/orgs | `CDP:388-394,717-788,952-1003` |
| View full profile | DM | "View Full Profile" (`view_full_profile`, 23195), `highlight1.content`, pushes the profile | `CDP:454,790-809` |
| Your own DM | self-DM | "**This is your space.** Only you can see these notes. Draft messages, list your to-dos, or keep links and files handy. You can also talk to yourself here, but please bear in mind you’ll have to supply both sides of the conversation." (`this_is_your_space` 21505 + `only_you_can_see_these_notes` 14005), `.body` `contentSecondary` with the bold lead | `CDP:811-844` |

There is **no row of quick-action buttons** (Mute / Huddle / Search) on this screen in this version: the list is built
only from the sections below (`CDP:300-353`); the huddle-status titles "Join (%@)" / "Joined" / "Huddle" at `CDP:1836-1848`
are not referenced anywhere in the presenter. The conversation's quick buttons (Add · Star/Move · Search) live in the
header menu instead (§6.2).

### 4.3 Sections and order

| Conversation | Sections, in order (`CDP:300-353`) |
|---|---|
| Channel | Header → Members → In this conversation → Notification preferences (enterprise only) → Channel Email Address (Sept 2026) → Settings |
| Group DM | Header → Members → In this conversation (orgs only) → Channel Email Address → Settings |
| DM | Header → In this conversation (orgs only) → Channel Email Address → Settings |
| Yourself / Slackbot / Slack security | Header → Settings |

**Members** (`CDP:1005-1133`): header `SKHeaderEntity` M: "Members (%@)" (`members_with_count`, 12015; "Members",
`members` 12004, when the count is 0) with a right button "Show All" (`show_all`, 18938) in `.smallBodyBold`
`highlight1.content` that opens the member list (§4.5) (`CD/ConversationDetailsViewController.swift:169-175`). Rows:

- A horizontal, scrolling strip of members (`SKMemberCollectionEntity`): each item is a 56-pt avatar with presence,
  8 below it the name in `.smallBody` (Lato 15) `contentPrimary`, up to 2 lines, as wide as the avatar; 16 between
  items, 16 leading/trailing, 4 top padding; tap opens the profile
  (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/MemberCollectionEntity/SKMemberCollectionEntity.swift:25-29,384-398,487-498,517,546-565`;
  measured items at x = 16, 88, 160 in `testMultiMemberConfiguration@3x.png`). The tap pushes the profile (§3.1).
- Empty channel: "Add members to this channel to get started." (`add_members_to_channel_to_start`, 788) in `.caption`
  `contentSecondary` (June `.sk_foreground_max_solid`) (`CDP:1047-1066`).
- Channel managers: "This channel is managed by **%@**." (`channel_managed_by_user`, 3773) or "…by **%@ members**."
  (`channel_managed_by_count`, 3769), `.caption` `contentSecondary` with the link part bold `highlight1.content`
  (`CDP:1100-1133`).
- Section ends with a hairline footer.

**In this conversation** (`CDP:1137-1222`): header "In this conversation" (`in_this_conversation`, 9645); S rows with a
chevron: "Organizations" (`organizations`, 14281, `svgBuildings` → `buildings.svg`) for shared conversations; "Apps"
(`apps`, 2039) + "Connect apps to power up your channel" (`apps_subtitle`, 2046), `svgApps` → `apps.svg` (channels);
"Agents" (`agents`, 1223) + "Connect agents to power up your channel" (`agentforce_channel_connections_subtitle`, 1192),
`svgAgentforce` → `agentforce.svg`, with Agentforce access. Sept 2026: Apps is no longer unconditional; both rows go
away with the flag `channelAgentsAppsScreen` (off) (`CD/Service/ConversationDetailsService.swift:959-965`). Icons
`contentPrimary` (June `.sk_primary_foreground`). Hairline footer.

**Channel Email Address** (Sept 2026, `CDP:1274-1287,1480-1499`): header "Channel Email Address"
(`channel_email_address_header`, 3735); one S row, `svgEmail` in `contentPrimary`, "Copy Email Address"
(`copy_email_address_context_menu`, 4719) over "Get an email address that posts incoming emails in this channel."
(`channel_email_address_description`, 3732); an 8-pt blank footer. Shown on paid plans for conversations that aren't
Slack Connect, when `conversations.emailaddresses.info` succeeds
(`Modules/DataService/ChannelEmailAddress/Implementation/ChannelEmailAddressService.swift:25-65`). Tapping it fetches
(creates) the address with `conversations.emailaddresses.create`, showing a spinner accessory and disabling the row
meanwhile, then copies it with the standard "Copied" toast (`Modules/Features/ConversationDetails/Implementation/ConversationDetailsInteractor.swift:445-470`).

**Settings** (`CDP:1226-1258`): header "Settings" (`settings`, 17724) when there are setting rows (else an 8-pt blank);
8-pt blank footer. Rows are S generic rows; icons `contentPrimary` (June `.sk_primary_foreground`; `CDP:1331-1633`):

| Setting | Icon → svg | Text (key, yaml line) | Accessory | Shown for |
|---|---|---|---|---|
| Notifications | `.mobileNotification` (glyph; `svgMobileNotification` → `mobile_notification.svg` exists) | "Notifications" (`notifications`, 13451), secondary = current summary | chevron → per-conversation notification settings | channels, group DMs |
| VIP | `svgVip` → `vip.svg` | "Add to VIP" (`add_to_vip`, 947), "VIP messages and mentions will appear at the top of your Home, DMs, and Activity." (`add_to_vip_description`, 950) | switch | DMs when VIP is available |
| Mute | `svgNotifications` → `notifications.svg` | "Mute Channel" (`mute_channel`, 12625) + "Muted channels will always appear read and you won’t receive any notifications from them." (12652); DMs/group DMs: "Mute" (`mute`, 12622) + "Muted conversations will always appear read…" (12656) | switch | members of the conversation |
| Recap | `svgAiSummary` → `ai_summary.svg` | "Add to Recap" (`add_to_recap`, 913) + "Get an AI recap of this channel’s messages once a day." (`add_to_recap_settings_description`, 919) | switch | recap enabled |
| AI use | `svgSlackAi` / `svgSlackAiOff` → `slack_ai.svg` / `slack_ai_off.svg` | "AI use" (`ai_use`, 1589) + "Channel content can / cannot be used by AI features outside of this channel." (1325 / 1328) | chevron | AI context scanning shown |
| Member suggestions | `svgMentions` → `mentions.svg` | "Channel member suggestions" (13153) + "Remind me to add people who aren't in the channel when I @mention them." (13156) | switch | flag |
| Guest access (enterprise) | `svgUserStatus` → `user_status.svg` | "Guest access" (7764) + "Guests are allowed / not allowed in this channel." (7758 / 7761) | switch (disabled unless you can edit) | enterprise channels |
| Sharing (enterprise, private) | `svgShareMessage` | "Sharing & file downloads" (18894) + "Sharing and downloading are (not) allowed in this channel." (18888 / 18891) | switch | enterprise private channels |
| Hide person | `svgDisable` → `disable.svg` | "Hide" (`hide`, 7897) + "Hide this person and their messages. You will still be notified if they mention you." (7926) | switch | DMs |
| Convert | `svgLock` → `lock.svg` / `svgChannel` → `channel.svg` | "Convert to private channel" (4658) + "This can be undone" (3174) / "This cannot be undone" (3235, group DMs); "Convert to public channel" (4661); "Change channel access to limited" (3626) | — | admins |

Row order in channels: AI use → Notifications → Recap → Mute → Member suggestions → Convert
(`CD/Helpers/ConversationInfoAdapter.swift:176-207,260-311`); group DMs: Notifications → Mute → Convert
(`:410-438`); DMs: VIP → Mute (`:592-612`). Enterprise channels move Notifications/Recap/Mute into a separate
"Notification preferences" (`notification_preferences`, 13295) section above Settings (`:132-157`, `CDP:1260-1272`).

Destructive buttons (last in Settings, `CDP:1645-1669,1796-1832`): a vertical stack of full-width `.large` buttons (§3.3
sizes), 8 apart, row padding 10/16:

| Button | Icon | Text (key, yaml line) | Style |
|---|---|---|---|
| Leave | `.signOut` → `sign_out.svg` | "Leave Channel" (`leave_channel`, 10759) | `.outlineDanger`: title `important.content` #c01343 / #de678a, 1-pt border `important.outline` #e01e5a / #d94c75 (`Colors.swift:236,344`; June `.sk_raspberry_red` #e01e5a for both), on `basePrimary` |
| Archive / unarchive | `svgArchive` → `archive.svg` | "Archive Channel" (2059) / "Unarchive Channel" (22501) | `.outlineDefault` |
| Close group DM / DM | `.signOut` | "Close Conversation" (`close_conversation`, 4084) | `.outlineDanger` |
| End external DM | `.signOut` | "Remove Connection" (`remove_connection`, 16193) | `.outlineDanger` |
| Salesforce | `svgSfCloud` → `sf_cloud.svg` | "Disconnect from Salesforce record" (5489) | `.outlineDefault` |

(`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:147-148,158-161,180-183,215-216`.)
Leave appears when you can leave; Archive when you can archive (`CD/Helpers/ConversationInfoAdapter.swift:313-332`).

Creator line (channels, last): "**%@** created this channel on %@." (`conversation_details_created_by_on_date`, 4597) /
"**%@** created this channel." (4594), `.caption` `contentSecondary`, name bold `highlight1.content`, tap pushes the
creator's profile (`CDP:1671-1705`).

### 4.4 Confirmations

Native alerts (`SKAlertController`, style `.alert`, confirm button + "Cancel") (`CD/ConversationDetailsFeature.swift:851-884`):

| Action | Title | Message | Confirm |
|---|---|---|---|
| Leave a public channel | — (no confirmation) | — | — |
| Leave a private channel | "Leave %@" (`leave_x_channel`, 10800) | "If you leave the private channel, you will no longer be able to see any of its messages. To rejoin the private channel, you will have to be re-invited.\n\nAre you sure you wish to leave?" (10806) | "Yes, leave the private channel" (24189) |
| Last member leaves | "Leave and Archive %@" (10753) | "Since you’re the last person here, you’ll need to archive the channel." (2068) | "Leave and Archive" (10750) |
| Archive | "Archive %@ for everyone?" (2065) | "You’ll still be able to view and search the channel’s contents." (2062) | "Archive" (2056) |
| Remove connection (external DM) | "Remove this connection?" (`remove_this_connection`, 16355) | "You won’t be able to send each other messages, but you’ll still be able to view existing messages and files." (16196) | "Remove Connection" |

(`CD/ConversationDetailsFeature.swift:639-645,795-849`.)

### 4.5 Member list (ConversationMemberList)

`Modules/Features/ConversationMemberList/Implementation/` (`ML/`):

- Title "Members" (`members`, 12004; group DMs "<count> Members") (`ML/ConversationMemberListPresenter.swift:130-143`),
  set with `configureDetailTitle`; right bar button "Add" (`add`, 639), a `.title(…, .default)` item, when you may add
  people (`:117-129,194-195,225-233`; `ML/ConversationMemberListViewController.swift:63-64`).
- A search view on top (`SKSearchView`, no built-in separator) then a 1-pixel separator in `outlineTertiary`
  #5e5d60/21 / #797c81/4d (`Colors.swift:302`; June `.sk_primary_foreground` at 25%), then the list, on `basePrimary`
  (`ML/ConversationMemberListViewController.swift:25-53,79-98`).
- Rows: member rows size M (56 pt: 36-pt avatar with presence, bold name, §2.8) (`ML/ConversationMemberListPresenter.swift:240-258`;
  apps and agents get their badge when the feature passes `includeAgents`, :245-250); tap pushes the profile
  (`ML/ConversationMemberListFeature.swift:146-147`); the list pages as you scroll.
- Empty search: "No user matches these keywords." (13133) with "Clear search" (4063); no members: "No user found" (13130)
  (`ML/ConversationMemberListPresenter.swift:275-302`). Group DM at the cap: "Group DMs can have up to %i people
  (including you)." (11806) in `.caption` `contentPrimary` (`:260-272`).

### 4.6 Edit details (group-DM name)

`Modules/Features/EditChannelDetails/Implementation/EditChannelDetailsViewController.swift`: title "Edit Details"
(`edit_details`, 6024, via `configureDetailTitle`), right bar button "Save" (`save`, a `.title(…, .default)` item) enabled
on change; background `baseSecondary` #f8f8f8 / #1a1d21 (June `.sk_foreground_min_solid` #f8f8f8 / #212428); 16 below
the safe area a label "Conversation name" (`conversation_name`, 4639) in `.smallBody` `contentSecondary`, inset 16; 4
below it a full-width `basePrimary` input band between two 1-pixel `outlineTertiary` dividers (June
`.sk_foreground_low_solid`), the text input inset 16 with placeholder "Add a name" (`add_a_name`, 654) (`:20-114,142-166`;
`Colors.swift:42,50,206,302`). Channel rename/topic editing goes through `EditChannel`
(`Modules/Features/EditChannel/Implementation/`, not specified here).

### 4.7 Per-channel notification exceptions (NotificationChannelList)

`Modules/Features/NotificationChannelList/Implementation/` (`NL/`), reached from notification settings:

- Title "Channel exceptions" (`channel_exceptions`, 3738) or "Direct messages exceptions" (`direct_message_exceptions`,
  5455) (`NL/NotificationChannelListPresenter.swift:29-36`).
- One section of M generic rows on `basePrimary`: the conversation's icon/avatar, its name in `.body` (`contentSecondary`
  when muted, else `contentPrimary`; June `.sk_foreground_max_solid` / `.sk_primary_foreground`), secondary text = the
  notification summary, chevron for channels
  (`NL/NotificationChannelListPresenter.swift:38-71,119-131`). Tap opens that conversation's notification settings
  (`NL/NotificationChannelListFeature.swift:59-63`).
- Long-press menu titled "#channel": "Reset to default" (3855, `svgRefresh` → `refresh.svg`), "Go to conversation" (13291,
  `svgArrowRightChannel` → `arrow_right_channel.svg`), "Leave channel" (3852, `svgSignOut` → `sign_out.svg`,
  destructive; channels only) (`NL/NotificationChannelListPresenter.swift:74-117`).
- The per-conversation settings screen itself (`NotificationConversationNoiseSettingsRoute`) lives in another module and
  is not specified here.

### 4.8 Gaps

- No snapshot of the details screen; heights of the text rows depend on label metrics not in source.
- The per-conversation notification settings screen (options like "All new messages" / "Mentions" / "Nothing") is outside
  these modules (route `NotificationConversationNoiseSettingsRoute`); not covered.
- `.moveChannel` and `.mobileNotification` glyphs have no SVG mapping (`Modules/Data/Icon/Implementation/SKIconManifest+SVGMapping.swift:132`
  maps `mobileNotification` to `nil`).

## 5. Generic sheets, alerts, toasts and snackbars

### 5.1 Which component to use

| Need | iOS component | Look |
|---|---|---|
| Confirm / choose (Delete, Leave, Remind me) | `SKAlertController` = a plain `UIAlertController` subclass (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/AlertController/SKAlertController.swift:24,81-124`) | native iOS alert or action sheet (§5.2) |
| Short confirmation ("Link copied") | `SKToast` via `AlertService.presentToast` (`Modules/UIInfra/Alert/Implementation/AlertService.swift:70-104`) | centered dark HUD (§5.3) |
| Message with optional action at the bottom | `SKBanner` via `AlertService.presentBanner` ("replaces SnackBarAlertView", `AlertService.swift:113-147`) or the legacy `SnackBarAlertView` | §5.4, §5.5 |
| Education / one-off explainer sheet | `SKDialog` (EDU config) (`Modules/Integration/SKDialog/Implementation/SKDialogService.swift:32-66`) | §5.6 |
| List of options in a sheet | `SKListBottomSheet` (`Modules/Features/SKListBottomSheet/Implementation/`) | §5.7 |
| Full-screen blocker | `BlockerModalViewController` (`Modules/UIInfra/BlockerViews/Implementation/`) | §5.8 |

### 5.2 Native alerts and action sheets

- `SKAlertController` only maps title, message, actions (default / cancel / destructive, one optional preferred action)
  and an optional text field onto `UIAlertController`; everything visual is the system's (SF Pro, system blue buttons,
  red destructive, bold cancel) (`SKAlertController.swift:81-124,139-176`). No app-wide tint override for alerts was
  found (looked for `window.tintColor` / `UIAlertController` appearance in `App/` and `Modules/`).
- Presented from the top-most view controller; action sheets on iPad become popovers
  (`Modules/UIInfra/Alert/Implementation/AlertService.swift:39-67`).
- Common button strings: "Cancel" (`cancel`, 3202), "Ok" (`ok`, 13603), "Done" (`done`, 5777), "Got it" (`got_it`,
  7721), "Close" (`close`, 4081). Concrete dialogs: §1.8 (delete message, remind me) and §4.4 (leave/archive).
- For the web clone: reproduce the iOS system alert and action-sheet look; their metrics are UIKit's and not in Slack
  source.

### 5.3 Toast (`SKToast`)

`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Toast/SKToast.swift`; no snapshot PNGs.

| Property | Value | Source |
|---|---|---|
| Position | its own window above alerts; centered horizontally and **vertically centered on screen** unless a vertical offset is passed | `SKToast.swift:163-173,215-218` |
| Box | radius 16 (continuous); background `.sk_toast_background` = rgb(20, 20, 20) at 70% (light) / 90% (dark) (still a legacy color in the latest source); shadow `contentPrimary` at 10% opacity, radius 7, offset (4, 4) | `SKToast.swift:38-39,257-268,384-403`, `Modules/Data/Color/Implementation/SKLegacyColors.swift:269-271` |
| Size | padding 20 on all sides; max width 260, max height 320; never narrower than it is tall | `SKToast.swift:270-337,384-387` |
| Image | optional image centered above the message, 10 pt gap; the standard images are `toast_checkmark` (success, `ToastConfig.success`) and `toast_error` (`.failure`), 50 × 44 pt white glyphs (`App/Resource/SlackAppResources/SlackApp.xcassets/Misc/toast_checkmark.imageset/`, measured from the @3x PNG: 150 × 132 px) | `SKToast.swift:113-124,339-358,367-377`, `Modules/UIInfra/Alert/Implementation/AlertService.swift:72-83`, `Modules/UIInfra/Alert/Interface/ToastConfig.swift:53-59` |
| Icon (new since June) | `ContentStyle.icon(icon, size, color)`: an `SKIcon` laid out like the image, white (`ColorSet.Constants.white`) unless a color is passed, 30 × 30 by default (`SKToast.defaultIconSize`). Home's sort/filter toasts pass 40 × 40, its "Deleted %@" section toast the default 30 × 30 with a 1 s duration and a 200 pt max width; `ConversationActionHandler` still hands over a 30 × 30 white image of the icon (1 s, 200 pt wide without one) | `SKToast.swift:30,76-81,118-121`, `AlertService.swift:75-76`, `ToastConfig.swift:19-21,33`, `Modules/Features/Home/Implementation/NavigationBarControls/HomeNavigationBarControlsManager.swift:43,229-236`, `Modules/Features/Home/Implementation/Plugins/ConversationList/ConversationListHomePlugin.swift:605-613`, `Modules/Features/Handlers/SectionItemAction/Implementation/ConversationActionHandler.swift:42-47,113-139` |
| Message | `UIFont.body` = Lato 17 Regular, white, centered, unlimited lines, text shadow `contentPrimary` at 33% offset (0, 1) | `SKToast.swift:278-293` |
| Appear | from alpha 0 and scale 0.9 to 1 with the "snappy" spring (damping 0.85, 0.368 s) | `SKToast.swift:215-232`, `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+SpringAnimation.swift:64-83,119-120` |
| Stay | 0.55 s by default after appearing (callers may pass a duration, e.g. 2 s for pin errors) | `SKToast.swift:89-91,136-143`, `Modules/Features/MessageActions/Implementation/MessageActionHandlingHelper.swift:353-354` |
| Disappear | same spring back to alpha 0 / scale 0.9, then the window is removed | `SKToast.swift:234-247` |
| Queueing | a new toast hides any toast already showing | `SKToast.swift:186-192` |
| Interaction | not tappable (`isUserInteractionEnabled = false`) | `SKToast.swift:220` |

### 5.4 Snackbar (legacy `SnackBarAlertView`)

`Modules/UIInfra/SlackUI/Implementation/LegacyWidgets/SnackBarAlertView.swift`. Snapshots (iOS 26, light):
`Modules/UIInfra/SlackUI/Snapshots/iOS_26/SlackUITests.SnackBarAlertViewTests/testNotifySnackBarView@3x.png` (one line),
`…/testNotifySnackBarViewWithAction@3x.png` (with "DO SOMETHING"), `…/testNotifySnackBarViewMultiline@3x.png`,
`…/testNotifySnackbarWithOffset@3x.png` (raised by an offset).

| Property | Value | Source |
|---|---|---|
| Shape | **full-width bar** flush with the bottom edge, square corners | `SnackBarAlertView.swift:252-271` |
| Colors | background `contentPrimary` #1d1c1d / #f8f8f8; text `basePrimary` #ffffff / #1a1d21 | `SnackBarAlertView.swift:208-220` |
| Text | Lato 16 Regular, unlimited lines ("\n" breaks the line) | `SnackBarAlertView.swift:214-219,237` |
| Padding | 18 top, 15 left, 15 right; bottom 18 + the bottom safe-area inset when the offset is 0 | `SnackBarAlertView.swift:176-186,238,269,292-296` |
| Measured | one line: 89.33 pt tall including a 34-pt safe area (bar top at y = 762.67 of 852); five lines 166 pt (18 + 5 × 19.2 + 18 + 34); 100 pt up, one line 55.33 pt with no safe area (bottom at y = 752) | `testNotifySnackBarView@3x.png`, `testNotifySnackBarViewMultiline@3x.png`, `testNotifySnackbarWithOffset@3x.png` (`Modules/UIInfra/SlackUI/Tests/Unit/SnackBarAlertViewTests.swift:36-98`) |
| Action button | right-aligned, 15 from the edge, vertically centered on the text, Lato Bold 13 in `baseTertiary` #eaeaea / #212428, truncates | `SnackBarAlertView.swift:222-229,274-291` |
| Offset | can sit `offset` pt above the bottom (e.g. above a composer); `updateOffset` animates 0.2 s | `SnackBarAlertView.swift:100-107,252-260` |
| Motion | slides up from below the bottom edge (clipped) in 0.2 s (UIKit default ease-in-out); slides back down the same way | `SnackBarAlertView.swift:117-161,236` |
| Duration | auto-dismisses after 3.0 s (unless shown with an action and `autoDismiss: false`) | `SnackBarAlertView.swift:53-78,94-98,235` |
| Touches | only the bar itself receives touches; no swipe-to-dismiss | `SnackBarAlertView.swift:137-144` |

### 5.5 Floating banner (`SKBanner`, the snackbar replacement)

`AlertService.presentBanner` adds an `SKBanner` to a view, 8 pt above the bottom safe area by default (or below the top),
full width minus an optional side offset, fades it in over 0.2 s (linear), keeps it 3.0 s, fades it out over 0.2 s
(`Modules/UIInfra/Alert/Implementation/AlertService.swift:115-202`, `Modules/UIInfra/Alert/Interface/BannerConfig.swift:14-58`).
Default tone `.genericDark`.

`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Banner/` (`SKBanner.swift`, `Banner.swift`):

| Property | `.regular` | `.small` | Source |
|---|---|---|---|
| Padding (h / v) | 16 / 12 | 12 / 8 | `SKBanner.swift:112-128` |
| Ornament → text gap | 12 | 8 | `SKBanner.swift:130-137` |
| Text font | `.body` 17 | `.caption` 13 | `SKBanner.swift:139-146` |
| Ornament box | 20 (verySmall) | 16 (tiny) | `SKBanner.swift:148-155` |
| Corner radius | 12 | 10 | `SKBanner.swift:157-163`, `Banner.swift:166` |

Heading (optional) `.bodyBold`, 4 above the text; pressed alpha 0.6; 1-pt border in the tone's outline color
(`Banner.swift:42-46,302,375-385`). Tones (`SKBanner.swift:208-330`; background opaque style):

| Tone | Background | Text | Icon (default) |
|---|---|---|---|
| `.genericDark` | `baseInversePrimary` #1d1c1d / #212428 | `contentInversePrimary` #ffffff / #f8f8f8 | `svgSlackLogo`, `contentInverseSecondary` |
| `.genericLight` | `baseTertiary` #eaeaea / #212428 | `contentPrimary` | `svgSlackLogo`, `contentSecondary` |
| `.info` | `highlight1.base` #e3f8ff / #001a2d | `contentPrimary` | `svgInfoFilled`, `highlight1.content` |
| `.success` | `highlight2.base` #e3fff3 / #05241b (`Colors.swift:68`) | `contentPrimary` | `svgCheckCircleFilled`, `highlight2.content` |
| `.warning` | `highlight3.base` #fffae0 / #2f1e00 (`Colors.swift:74`) | `contentPrimary` | `svgWarningFilled`, `highlight3.content` #6b5000 / #dea700 (`Colors.swift:230`) |
| `.error` | `important.base` #ffe8ef / #300005 | `contentPrimary` | `important.content` |

### 5.6 Dialog sheet (`SKDialog`) and education sheets

- Presentation (`Modules/Integration/SKDialog/Implementation/SKDialogService.swift:32-66`): on iPhone the legacy bottom
  sheet (§0.1) sized to its content, or with flag `bottomsheetMigration` a native sheet with a self-sized detent; on iPad
  a form sheet. Margins 12 top/bottom and 24 left/right in a bottom sheet, 24 all round in a form sheet or when explicit
  dismissal is required (`SKDialogService.swift:54-66`). The extra 10 pt on top (room for the native grabber) is now
  added only when the dialog really is that self-sized native sheet (`addsBottomSheetTopPadding`, set in the
  `bottomsheetMigration` branch); in June any `SKDialog` got it while the flag was on (`SKDialogService.swift:30-46,63-64`,
  `Modules/UIInfra/DeveloperComponents/Implementation/Dialog/SKDialog.swift:249-262,280,329,365-370`). Background `basePrimary`
  (`Modules/UIInfra/DeveloperComponents/Implementation/DialogViewController/SKDialogViewController.swift:48-53,92`).
  Swipe/tap dismiss unless `requireExplicitDismiss` (`SKDialogViewController.swift:124-130`).
- Content is a vertical, centered stack of items with fixed gaps (`SKDialog.swift:231-244,271-280`): label→label 4,
  step→step 12, button→button 16, step→button 28, anything else 20; image default height 162 with 8-pt corners.
- EDU "simple" layout (`Modules/UIInfra/Education/Implementation/EDUDialogConfig.swift:143-158,200-260`): image (172 tall
  by default) or animation → title `.subtitle` (Lato 20 Black) `contentPrimary` centered → subtitle `.body` 17
  `contentSecondary` centered → optional disclaimer `.smallBody` `contentSecondary` → primary button `.primary` size
  `.large` (green: `.primary` is now `highlight2.baseInverse` → `dt_color_base_inverse_highlight_2` #007a5a / #177e56
  (`Colors.swift:104`), June's `.sk_lilypad_green` was #007a5a in both; white `.bodyBold` title, radius 14, full width)
  → optional secondary button `.outlineDefault` `.large` (`EDUDialogConfig.swift:213-262`;
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:167`).
- Snapshot: `Modules/UIInfra/DeveloperComponents/Snapshots/iOS_26/DeveloperComponentsTests.SKDialogSnapshotTests/testDialog@3x.png`
  (2358 × 5112, a 2 × 2 grid of 393 × 852 renders: light over dark, normal contrast left, high contrast right; transparent
  background): measured image at x 24–368.7, y 24–185.7 (aubergine #4a154b block, radius ≈ 8), centered bold title and
  subtitle, icon rows, numbered steps with green circles, a full-width green "OK" button (38 pt tall in this fixture;
  #007a5a in both the light and dark renders, so this baseline predates the `highlight2.baseInverse` dark value).
  New since June: `testDialogWithBottomSheetTopPadding@3x.png` / `testDialogWithoutBottomSheetTopPadding@3x.png` (the
  same dialog with and without the 10 pt) and `testDialogFullscreenWithFlexibleSpace@3x.png`
  (`Modules/UIInfra/DeveloperComponents/Tests/Unit/Dialog/SKDialogSnapshotTests.swift:18-60`).
- Education sheets in `Modules/Features/EduBottomSheet/Implementation/` (all `.sheet` SKDialogs, dismiss on the button):

| Sheet | Image asset | Title | Subtitle | Button |
|---|---|---|---|---|
| Get desktop | `get_desktop_app` | "We emailed you a link" (`edu_sheet_get_desktop_title`, 6115) | "Check your email from your computer for a link to download the Slack app." (6111) | "Done" |
| Invite teammates | `add_teammates` | "The more, the merrier" (6123) | "When it’s time to add more people, tap “Add teammates” on your Home tab." (6119) | "Got it" |
| Edit profile | `edit_profile` | "A picture is worth a thousand words" (6108) | "Tap your profile photo to set a status, set notification preferences and more." (6103) | "Got it" |
| Tap-and-hold | animation | §1.11 | | "Try It" |

(`EduBottomSheetGetDesktopDialogContentProvider.swift:23-58`, `EduBottomSheetInviteTeammatesDialogContentProvider.swift:24-59`,
`EduBottomSheetEditProfileDialogContentProvider.swift:23-58`.)

### 5.7 List bottom sheet (`SKListBottomSheet`)

`Modules/Features/SKListBottomSheet/Implementation/` (`LB/`). A sheet whose rows come from plugins (e.g. the profile's
"Call" options, §3.3, or the Block Kit file-upload / photo-gallery pickers in
`Modules/Features/SKListBottomSheet/Interface/BKFileUploadPlugin.swift` and `…/BKPhotoGalleryPlugin.swift`).

| Property | Value | Source |
|---|---|---|
| Presentation | iPhone: legacy bottom sheet (§0.1) with top corners rounded, drag/tap to dismiss; flag `bottomsheetMigration`: native self-sized sheet with a 16-pt top inset; iPad: popover (373 wide) or form sheet | `LB/SKListBottomSheetFeatureDeprecated.swift:35-51,120-131`, `LB/SKListBottomSheetViewController.swift:17-23,141-148,173-174,308-337` |
| Height | the list's content height, capped at 594 (then it scrolls) | `LB/SKListBottomSheetViewController.swift:22,58-72` |
| Background | `basePrimary` #ffffff / #1a1d21 (June: `.sk_primary_background`, the same values), or a caller-provided color | `LB/SKListBottomSheetViewController.swift:165`, `LB/SKListBottomSheetPresenter.swift:51-60` |
| Rows | ordinary `SKList` sections/rows (§0.3, §0.5); loading state shows shimmer sections | `LB/SKListBottomSheetPresenter.swift:22-60` |
| Action button (optional) | `SKButton` pinned 30 above the bottom and 16 from the sides (default height 48), fading in/out over 0.3 s over a gradient (100 or 180 tall) of `baseSecondary` (#f8f8f8 / #1a1d21, `Colors.swift:50`) at 20% → 80% → 100%; June used `.sk_foreground_min_solid` (#f8f8f8 / #212428) | `LB/SKListBottomSheetViewController.swift:23-29,37,119-135,187-199,210-233,283-302` |

### 5.8 Blocker modal

Full-screen (`.fullScreen`), background `basePrimary`, a 44-pt close "×" top-left (`.times` glyph, 25 pt), optional
header image band, title, body text, then bottom buttons 44 tall and 335 wide with 8-pt spacing, a link in
`highlight1.content` and footnote text in Lato 14 `contentTertiary`
(`Modules/UIInfra/BlockerViews/Implementation/BlockerModalViewController.swift:83-84,97,107,122,134,233-315`).
Snapshot: `Modules/UIInfra/BlockerViews/Snapshots/iOS_26/BlockerViewsTests.BlockerModalViewControllerSnapshotTests/testSimpleBlockerMessageWithHeader@3x.png`
(✕, grey header band, "Testing" title, body, green "Done" button, blue link, grey footnote).

### 5.9 Gaps

- Toast and banner have no snapshots; toast images other than `toast_checkmark` / `toast_error` / `icn_error_pin` are not
  enumerated.
- Native alert/action-sheet metrics are UIKit's.
- The per-screen use of snackbar vs. floating banner vs. toast is caller-specific; copy actions use the toast (§1.6).

## 6. Option picker and conversation header menu

No snapshot PNGs exist for either (none under these modules, none by name in the latest checkout either).

### 6.1 Option picker (`OptionPicker`)

`OP/` = `Modules/Features/OptionPicker/Implementation/`. A generic list of choices used by Block Kit select menus
(`Modules/Integration/BlockKitInteraction/Implementation/BlockPresentationRouter.swift`), app dialogs
(`Modules/Features/Dialogs/Implementation/DialogsFeature.swift`) and attachment actions
(`Modules/Features/Handlers/AttachmentActionHandler/Implementation/AttachmentActionHandler.swift`).

| Property | Value | Source |
|---|---|---|
| Presentation | `displayInBottomSheet`: legacy bottom sheet (§0.1) sized to the list, not anchored to its long form; with flag `bottomsheetMigration` a native sheet whose one detent is now `.published`: the picker publishes the list's content height + 8 + 8 pt (`Spacing.medium` insets) as a fixed height whenever it changes, starting at the max height (June: a `.selfSized` detent), and a popover on iPad. Otherwise a standard modal (form sheet), optionally in a nav controller | `OP/OptionPickerFeature.swift:59-86`, `OP/OptionPickerViewController.swift:24,41,65-69,269-296,314-329`, `Modules/Features/OptionPicker/Interface/Models/OptionPickerFeatureConfig.swift:12-56` |
| Nav bar | optional title and left/right bar buttons (text, plain or bold "done" style, or an icon) | `OP/OptionPickerViewController.swift:99-111,254-267`, `OptionPickerFeatureConfig.swift:65-81` |
| Background | `basePrimary` #ffffff / #1a1d21 (June: `.sk_primary_background`, the same values) | `OP/OptionPickerViewController.swift:141-143` |
| Search (optional) | an `SKSearchBar` with placeholder "Search" (`search`, 17029) inside 12 top/bottom, 16 left/right margins, or a tokenized search field (multi-select); below it a 1-px separator, now `outlineTertiary` (#5e5d60/21 / #797c81/4d, `Colors.swift:302`; June: `.sk_primary_foreground` at 25%) | `OP/Views/OptionPickerSearchView.swift:32-42,60-75,106-114`, `OP/OptionPickerViewController.swift:124-174` |
| Rows | §0.3 generic rows, size S or M (caller's `cellSize`), wrapping text, no ornament | `OP/OptionPickerPresenter.swift:147-163,203-212` |
| Section headers | `SKHeaderEntity` M with the section title, none when untitled | `OP/OptionPickerPresenter.swift:166-175` |
| Single select | no accessory; tapping a row selects it (no checkmark is drawn) | `OP/OptionPickerPresenter.swift:177-186`, `OP/OptionPickerViewController.swift:203-212` |
| Multi select | trailing checkbox accessory, toggled by tap; selections also show as tokens in the tokenized search | `OP/OptionPickerPresenter.swift:184-185`, `OP/OptionPickerViewController.swift:213-222` |
| Empty states | "Start typing to see results." (20651), "No option found" (13028), "No option matches these keywords." (13031) with "Clear search" (4063), "You have reached the maximum number of selections" (11820), "There was a problem loading options" (15311) | `OP/OptionPickerPresenter.swift:85-117` |
| Loading | shimmer rows of the chosen size | `OP/OptionPickerViewController.swift:34-38,80-82` |

### 6.2 Conversation header menu (`ConversationHeaderMenu`)

`HM/` = `Modules/Features/ConversationHeaderMenu/Implementation/`. In the current header, **tapping the conversation title
opens this menu** (`HM/NewConversationHeaderHelperService.swift:582-585`); the conversation can also auto-open it
(`Modules/Features/AnyConversation/Implementation/AnyConversationFeature.swift:618-629`). (The older path, where a title tap
pushes Channel details directly, is in §4.1.) Selecting "Settings & Details" in this menu pushes the details screen (§4)
(`HM/MenuFeature/ConversationTabsMenuFeature.swift:193-194`).

**Presentation and motion**

| Property | Value | Source |
|---|---|---|
| Container | presented with no transition (custom style, zero-duration animator); the menu then animates itself | `HM/MenuFeature/ConversationTabsMenuFeature.swift:403-451` |
| Scrim | full screen, **clear on iOS 26** (black at 50% only before iOS 26); it takes the tap and the swipe that close the menu and fades with it | `HM/MenuFeature/ConversationTabsMenuView.swift:32-37,181-188,440,610-615,632-634` |
| Card | anchored to the top safe area, 8 pt (`Spacing.medium`) from the left and right edges (max width 440 on iPad); corner radius 20 (continuous). iOS 26: a non-interactive Liquid Glass card (`UIGlassEffect`, `isInteractive = false`; its corner configuration a capsule while closed, fixed 20 pt open), the content view clear; earlier: a `basePrimary` card with a shadow of black at 66%, radius 24, offset (0, 24). A 1-pt border while open: `outlineTertiary` in dark mode, clear in light | `HM/MenuFeature/ConversationTabsMenuView.swift:39-57,191-245,404-445,563-608,618-624` |
| Open animation | the card **morphs out of the header's title view**: from its window-space frame (handed over as a frame since June, `morphFrameProvider`, so it also works under SwiftUI navigation) and capsule corners to the full card, while the list and scrim fade in and the top-right button scales up from 0.1; "smooth" spring (damping 1.0), medium speed = 0.4 s; light impact haptic (intensity 0.4). Before iOS 26 the morph also animates the pill's `containerSecondary` (#f8f8f8 / #212428) background to `basePrimary`. The header's own title pill is hidden while the menu is out (`hideNavigationTitle` / `showNavigationTitle`) | `HM/MenuFeature/ConversationTabsMenuView.swift:386-489`, `HM/MenuFeature/ConversationTabsMenuViewController.swift:44-45`, `HM/MenuFeature/ConversationTabsMenuFeature.swift:298-321,354-366`, `HM/MenuFeature/ConversationTabsMenuFeatureInterface.swift:50-53`, `Modules/UIInfra/NavigationController/Implementation/ConversationNavigationTitleView.swift:59-66`, `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+SpringAnimation.swift:123-126` |
| Close | reverse morph with the same spring (the fast speed, 0.2 s, when a row opens something); or swipe up on the scrim: rubber-banded scale-down (up to 7%, up to 2% larger going down), dismisses past 75 pt or 500 pt/s, otherwise springs back | `HM/MenuFeature/ConversationTabsMenuView.swift:59-63,491-523`, `HM/MenuFeature/ConversationTabsMenuFeature.swift:181-233,354-366` |
| Height | title area + list, the list capped at 70% of the screen height (85% on iPad) and scrolling beyond | `HM/MenuFeature/ConversationTabsMenuView.swift:54-57,107-115,329-331` |
| Top-right button | a 40-pt `SKIconButton` with `svgEllipsisHorizontalFilled` → `ellipsis_horizontal_filled.svg` (VoiceOver "More actions", `more_actions`, 12439), 6 from the right, 8 from the top | `HM/MenuFeature/ConversationTabsMenuView.swift:39-51,606-607,626-628`, `HM/MenuFeature/ConversationTabsMenuPresenter.swift:369-395` |

**Contents, top to bottom** (`HM/MenuFeature/ConversationTabsMenuPresenter.swift:46-71`; list background clear):

1. **Title area**: the conversation title in its expanded form (`ConversationTitleInfoView`, specified with the conversation
   header, not here), 16 pt vertical padding (`HM/MenuFeature/ConversationTabsMenuView.swift:48,329-343`).
2. **Buttons row** (`:195-212,424-466,559-560`): `SKButtonEntity`, equal widths, 4 pt vertical padding (16 horizontal),
   stacked full width at accessibility sizes. Buttons use `topLevelButtonStyle` = clear background, `contentPrimary` title
   and icon, 1-pt `outlineTertiary` border (`ConversationTabsMenuView.swift:66`), default size `.medium` (`.smallBodyBold`
   15, padding 10/12, radius 12, 20-pt icon left of the title, 6 gap; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+PresentationObject.swift:38-40,222-223`,
   `SKButton+Types.swift:271-272,302-303,327-328,354-355`):

   | Button | Icon | Title (key, yaml line) | Notes |
   |---|---|---|---|
   | Add | `svgUserAdd` → `user_add.svg` | "Add" (`add`, 639); VoiceOver "Add Members" (`add_members`, 785) | inactive when you can't invite; left out for app homes, Slackbot and (new) frontline workers who can't invite (`:437-440,559-561`) |
   | Star / Move | `svgStar` → `star.svg` / `svgStarFilled` → `star_filled.svg` | "Star" (`star`, 20536) / "Starred" (`starred`, 20543) on free plans; "Move" (`move`, 12457) with a section menu on paid plans (a custom section's emoji replaces the icon) | inactive when not a member and (new) in temporary channels (`:469-546`) |
   | Search | `svgSearch` → `search.svg`; with `ios_find_in_channel` (default off) `svgQuickSwitch` | "Search" (`search`, 17029); VoiceOver "Search in Channel" (`search_in_channel`, 17118) | pushes Search scoped to this conversation; with `ios_find_in_channel` it opens the in-conversation find bar instead (`:452-458`; `HM/MenuFeature/ConversationTabsMenuFeature.swift:186-192`) |

   The first button present is the row's primary button (`:459-466`).

3. **Tabs** (8-pt blank above, hairline below): one S row per conversation page, e.g. "Messages" (`messages`, 12301,
   `svgDirectMessages` / filled when current), "Canvas" (`channel_tab_canvas`, 3884), "Files" (`channel_tab_files`,
   3887), "Pins" (`channel_tab_bookmarks`, 3881, `svgPin`), "Workflows" (`channel_tab_workflows`, 3893, `svgBolt`), "List",
   "Add canvas" (tabs built in `Modules/Features/AnyConversation/Implementation/Data/ConversationTabsBuilder.swift:134-230,433-440`
   and the Messages page from `makeMessagePage`, `…/AnyConversationPresenter.swift:426-544`). Current tab: filled icon,
   `.bodyBold` label, row in the selected state; tabs with unread content also use `.bodyBold` and get a blue
   `.presenceOnline` dot in `highlight1.content`; counts (pins, bookmarks, workflows) show as right accessory text; new
   tabs get a "NEW" badge (`highlight1.content` on `highlight1.base`); paid-only tabs a "PRO" badge (white on aubergine
   70); (new) frontline workers don't get the "Add canvas" row (`ConversationTabsMenuPresenter.swift:76-176`).
4. **Navigation rows** (8-pt blanks around; S rows with chevrons, icons `contentPrimary`) (`:214-337`), in this order:

   | Conversation | Rows |
   |---|---|
   | Channel / group DM | "Members" (`members`, 12004) with the member count as accessory text, `svgUserDirectory`; (new, flag `ios_channel_agents_apps_screen`, default off; not for guests or Slack Connect conversations) "Agents & Apps" (`agents_and_apps`, 1226, `svgAiAgents`), pushing the channel's Agents & Apps screen (`ChannelAgentsAppsRoute`); "Notifications" (`notifications`, 13451) with the current level as accessory text: "All" (`all`, 1603, `svgNotificationsAllNewPosts`), "Mentions" (`mentions_title_case`, 12057, `svgNotifications`) or "Muted" (`muted`, 12646, `svgNotificationsOff`) (`HM/MenuFeature/ConversationTabsMenuDataTypes.swift:94-132`; `HM/MenuFeature/ConversationTabsMenuInteractor.swift:356-362`) |
   | DM | "View Profile" (`huddle_go_to_profile`, 8148, `svgUser`); "Org Chart" (`org_chart`, 14188, `svgHierarchy`) when you can see org charts and the DM isn't external |
   | Salesforce app DM | "Salesforce orgs" (`salesforce_orgs_lowercase`, 16820, `svgSfCloud`) |
   | Slackbot DM (new, flag `ios_slackbot_skills_header_entry`, default off; Slackbot AI and full canvas access) | "Skills" (`skills`, 19229, `svgAiSkills`), pushing Slackbot's skills (`SlackbotSkillsRoute`, `.push`) (`ConversationTabsMenuInteractor.swift:348-354`) |
   | All | "Settings & Details" (`settings_and_details`, 17727, `.cogO` glyph) — pushes §4 |

   (`HM/MenuFeature/ConversationTabsMenuFeature.swift:181-233` routes every row, closing the menu at the fast speed first.)
5. App homes show a workspace picker section "Use app with settings from..." (`app_home_workspace_selection_prompt`,
   1944) with radio rows instead of the tabs, or under them when app-home tabs are enabled (`:51-63,178-193`).

**Top-right "…" menu** (native menu, `HM/MenuFeature/ConversationTabsMenuPresenter.swift:397-422`, items from
`Modules/Features/Handlers/SectionItemAction/Implementation/ConversationActionBuilder.swift`; no "…" button for app homes
or, with Slackbot AI, the Slackbot DM, `:369-394`), in this order:

| Item | Icon | Text (key, yaml line) |
|---|---|---|
| Details | `svgInfo` → `info.svg` | "Channel Details" (`channel_details_context_menu`, 3726) / "Conversation Details" (`conversation_details_context_menu`, 4591) |
| Copy link | `svgLink` → `link.svg` | "Copy Channel Link" (`copy_channel_link_context_menu`, 4698) |
| Copy ID (internal) | `svgCopy` → `copy.svg` | "Copy Channel ID" (`copy_channel_id_context_menu`, 4695) |
| Archive / unarchive | `svgArchive` / `svgUnarchive` | "Archive Channel" (2059) / "Unarchive Channel" (22501), when you may (server permissions) |
| Leave | `.signOut` → `sign_out.svg` | "Leave Channel" (`leave_channel_context_menu`, 10766), destructive (red); channels you're in except #general, and (new) never a public channel for frontline workers |

(`ConversationActionBuilder.swift:95-100,154-168,170-189,221-235`.) Elsewhere in the builder since June: "Mark Unread" is
no longer behind `ios_mark_as_unread_action` (`:111-125`), and "Copy Email Address" reads "Copy Channel Email" / "Copy DM
Email" (`copy_channel_email_context_menu`, 4692 / `copy_dm_email_context_menu`, 4710; `:200-219`); both are in Home's long-press
menu, not this one.

### 6.3 Gaps

- The expanded title area (`ConversationTitleInfoView`) and the header pill it morphs from belong to the conversation
  header spec; only their constants used by the morph are cited here.
- Liquid Glass (iOS 26) material is a system effect; no numeric blur/tint values exist in Slack source.
- Option picker selection feedback for single-select (whether the sheet dismisses immediately) is decided by callers
  (`OP/OptionPickerInteractor.swift`), not specified here.
- The September additions to the header menu are all behind toggles that default off (the "Agents & Apps" and "Skills"
  rows, the find-in-channel Search; `Modules/Data/Toggles/Definitions/ios_channel_agents_apps_screen.json`,
  `ios_slackbot_skills_header_entry.json`, `ios_find_in_channel.json`) or hinge on account data the clone doesn't model
  (frontline workers, temporary channels); the screens those rows open aren't specified here.

## 7. Most useful reference PNGs

All under the latest checkout (`slack-objc-latest`, LFS pulled; iOS 26, 393 × 852 pt at @3x unless noted):

| PNG | Shows |
|---|---|
| `Modules/Integration/Reactors/Snapshots/iOS_26/ReactorsServiceTests.ReactorsViewControllerViewTests/testReactWithEmojiButtonInEditMode@3x.png` | reactors sheet: emoji tabs with counts and blue indicator, ":name:" header with "React with…", 56-pt member rows, "Add a reaction" bar |
| `Modules/UIInfra/SlackUI/Snapshots/iOS_26/SlackUITests.SnackBarAlertViewTests/testNotifySnackBarViewWithAction@3x.png` | legacy snackbar: full-width dark bar at the bottom with a bold action |
| `Modules/UIInfra/DeveloperComponents/Snapshots/iOS_26/DeveloperComponentsTests.SKDialogSnapshotTests/testDialog@3x.png` | dialog sheet content (2358 × 5112: light over dark, normal and high contrast side by side, transparent background): image, centered title/subtitle, steps, green button |
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmall@3x.png` | the 44-pt S row used by every action list (light over dark) |
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberCollectionEntitySnapshotTests/testMultiMemberConfiguration@3x.png` | the channel-details members strip |

Also: `App/Snapshots/iOS_26/SnapshotTests.ShareMessageViewControllerViewTest/test_shareMessage@3x.png` (Forward screen) and
`Modules/UIInfra/BlockerViews/Snapshots/iOS_26/BlockerViewsTests.BlockerModalViewControllerSnapshotTests/testSimpleBlockerMessageWithHeader@3x.png`.

## 8. Gaps summary

- No snapshots exist for the message-actions sheet, emoji picker, profile, status editor, channel details, option picker,
  toast or header menu; their layouts here come from constants, and heights that depend on text metrics are marked
  "computed".
- System-drawn pieces (native sheet grabber/corners on iOS 26, `UIAlertController`, `UISearchBar`, `UISegmentedControl`,
  popovers, Liquid Glass) have no values in Slack source.
- Several looks are behind server flags (`bottomsheetMigration`, `userProfileEnhancements`, `laterTodos`,
  `isCustomStatusPauseNotifEnabled`); both variants are described where they differ.
- Server-driven content (status presets, profile fields, message shortcuts, workflow reacji) is not in the client.
- The September tree's `Modules/UIInfra/Architecture/Snapshots/iOS_26/ArchitectureTests.SelfSizedSheetPresentationSnapshotTests/*`
  (six self-sized native-sheet renders, `Modules/UIInfra/Architecture/Tests/Unit/SelfSizedSheetPresentationSnapshotTests.swift`)
  are fully transparent 1179 × 2556 PNGs: nothing to measure the native sheet's chrome against.
