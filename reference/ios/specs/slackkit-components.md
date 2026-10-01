# SlackKit components (iOS): spec for the web component library

> **Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Line numbers are for that checkout
> (`~/Desktop/Slack Mobile Code Base/slack-objc-latest`); the spec was first written against the June snapshot `cd22922`.
>
> **What changed since June**
> - **Snapshots** are a 2 × 2 grid (light / dark rows, normal / high-contrast columns). The checkout also has iOS_27
>   PNGs: for SlackKit only SKBarButtonItem renders differently there (Liquid Glass); this spec and the suite match
>   iOS_26 (see SKBarButtonItem).
> - **Colors moved to design tokens** (design-tokens `f76ac0a`, which also changes three dark values and adds
>   high-contrast variants): SKButton primary / danger / outline / systemDanger use highlight2 / important (the default
>   style's pressed title 75 %); SKTabBar's underline `highlight2.baseInverse`; error icons `important.content`; the
>   multi-line input's error border `important.outline`; entity focus `highlight3.surface` and swipe-delete
>   `important.baseInverse` @25 %; list theme rows, dividers and "APP" tags (`ListThemeOptions.swift:65-87`).
> - **SKSwitch** is a native UISwitch (61 × 28 on iOS 26, no check mark, disabled at 0.35). **SKCheckbox** is clear
>   when off. **New components:** SKDot (unread dot, also a row accessory), SKTruncator, SKCardDecorator.
> - **Avatars:** concentric (circular) member and workspace avatars put presence, unread and mention annotations on
>   the circle's edge at 45° (`AvatarAnnotationGeometry`); deactivated photos use Core Image's linear-light grayscale;
>   SKWorkspaceAvatar gains `toolbarItem` (32); SKGroupAvatar's verySmall count square is 20; SKOrnamentBox gains
>   `groupAvatar`.
> - **Bars and fields:** SKBarButtonItem gains `.huddle`, `prominence` and edge-to-edge avatars; SKSearchBar a leading
>   ornament, a springy Cancel / glass ✕ and the Liquid Glass capsule (20 pt magnifier); SKTextField a rich backing and
>   `securitySupport`; SKTextToolbar a new selection style; SKTokenView workspace avatars and a trailing accessory
>   icon; SKEmptyState keyboard avoidance; SKToast icon content; SKContextBar agent rows.
> - **Attachments:** `altTextBadgeVisibility` (thumbnails hidden by default, expanded `visibleIfPresent`), the edit
>   badge, expanded border / background / corner radius / `anchor` overrides (SKImageView content anchors), folder and
>   thread-share file types. **Entities:** SKMemberEntity `secondaryTextVisibility`, SKChannelEntity
>   `codeChannelStatus`, skill-set presets, a character limit for multi-line inputs, toggle rows as toggle buttons, a
>   25 pt edge band for swipes.

SlackKit is Slack's iOS UIKit component library (`Modules/UIInfra/SlackKit`). This file covers one web component per
SlackKit component, using the same names: API, geometry, type, color per state, icons, copy and behavior, each measured
from the source. It follows the rules in `README.md` in this folder: source beats this spec, and anything not found is
marked "not found" with the places searched.

## Index

| Component | Source | Purpose | Snapshots (light over dark) |
|---|---|---|---|
| SKButton | `DC/Button/` | Text button: styles (default, outline, primary, danger, system, custom, quickAction), 13 sizes, icon, loading, menu | SNAP/SKButtonSnapshotTests/ (46) |
| SKIconButton | `DC/IconButton/` | Round icon button with optional circular backdrop (FAB), caption, selected, processing, pulse | SNAP/SKFloatingActionButtonSnapshotTests/ (15) |
| SKPillButton | `DC/PillButton/` | Capsule chip button: emoji, label, icon, count badge | SNAP/SKPillButtonSnapshotTests/ (24) |
| SKSearchBarButton | `DC/SearchBarButton/` | Tappable "Search…" field that opens search | SNAP/SKSearchBarButtonSnapshotTests/ (2) |
| ClearButton | `SKH/ClearButton/` | The ⓧ clear control in text fields | SNAP/ClearButtonSnapshotTests/ (4) |
| SKBarButtonItem | `DevC/BarButtonItem/` | Nav-bar items: title, icon, back, avatar, spinner, system Done/Close/Cancel/… | SNAP/SKBarButtonItemTests/ (20) |
| SKCheckbox | `DC/Checkbox/` | Circular multi-select check (21 pt) | SNAP/SKCheckboxSnapshotTests/ (4) |
| SKRadioButton | `DC/RadioButton/` | Single-choice radio (20 pt) | SNAP/SKRadioButtonSnapshotTests/ (4) |
| SKSwitch | `DC/Switch/` | On/off switch: a native UISwitch with Slack's green (61 × 28 on iOS 26) | SNAP/SKSwitchSnapshotTests/ (4) |
| SKDot | `DC/Dot/` | 12 pt status (unread) dot in a 16 pt view, new in September 2026 | SNAP/SKDotSnapshotTests/ (2) |
| SKBadge | `DC/Badge/` | Count / text / tag badge (18 pt pill), with icon and pulse | SNAP/SKBadgeSnapshotTests/ (23) |
| SKColorSwatch | `DC/ColorSwatch/` | 20 pt color chip with checkerboard for alpha | SNAP/SKColorSwatchSnapshotTests/ (3) |
| SKSpinner | `DC/Spinner/` | Indeterminate ring spinner (12–52 pt) | SNAP/SKSpinnerSnapshotTests/ (8) |
| SKCircularProgressIndicator | `DevC/CircularProgressIndicator/` | Determinate ring | none |
| SKProgressBar | `DC/ProgressBar/` | Determinate linear bar (2 / 4 / 12 pt) | SNAP/SKProgressBarSnapshotTests/ (5) |
| SKLoadingBar | `DC/LoadingBar/` | Indeterminate thin bar with a completion flash | SNAP/SKLoadingBarSnapshotTests/ (2) |
| SKPageController | `DC/PageController/` | Swipeable pages with an SKTabBar | SNAP/SKPageControllerSnapshotTests/ (4) |
| MultiSelectBadge | `SKH/MultiSelectBadge/` | Numbered selection bubble on media | none |
| SKMemberAvatar | `DC/MemberAvatar/` | Person avatar: 10 sizes, presence, guest / external ornaments, initials | SNAP/SKMemberAvatarSnapshotTests/ (24) |
| SKWorkspaceAvatar | `DC/WorkspaceAvatar/` | Workspace icon: mention badge, unread dot, lock, active ring, GovSlack | SNAP/SKWorkspaceAvatarSnapshotTests/ (16) |
| SKAvatarPile | `DC/AvatarPile/` | Overlapping avatar row with "+N" | SNAP/SKAvatarPileSnapshotTests/ (9) |
| SKOrnamentBox | `DC/OrnamentBox/` | Square or circle tile holding an icon, emoji, image, badge, avatar or spinner | SNAP/SKOrnamentBoxSnapshotTests/ (33) |
| SKGroupAvatar | `DevC/GroupAvatar/` | Two-face group-DM avatar or count | SNAP/SKGroupAvatarSnapshotTests/ (4) |
| SKHuddleFacePile | `DevC/HuddleFacePile/` | Huddle participant faces plus headphones badge | SNAP/SKHuddleFacePileSnapshotTests/ (11) |
| SKDecoratedIcon | `DevC/DecoratedIcon/` | Icon with a dot or mini-icon badge | SNAP/SKDecoratedIconTests/ (3) |
| AttachmentOrnament | `SKH/AttachmentOrnament/` | 36 pt leading tile for attachment rows | none |
| SKBanner | `DC/Banner/` | Inline alert card: tones, heading, ornament, accessories, action | SNAP/SKBannerSnapshotTests/ (36) |
| SKToast | `DC/Toast/` | Centered transient HUD message | none |
| SKEmptyState | `DC/EmptyState/` | Illustration, title, body and buttons empty or error screen | SNAP/SKEmptyStateSnapshotTests/ (20) |
| SKLoadingEntity | `DC/Entities/LoadingEntity/` | Skeleton list row | SNAP/SKLoadingEntitySnapshotTests/ (8) |
| SKLoadingHeader | `DC/LoadingHeader/` | Skeleton section header / button strip | SNAP/SKLoadingHeaderSnapshotTests/ (6) |
| SKLoadingState / SKWrappedLoadingView | `DC/LoadingState/` | Shimmering skeleton list (full-screen or embedded) | SNAP/SKLoadingStateSnapshotTests/ (4), SNAP/SKWrappedLoadingViewSnapshotTests/ (7) |
| SKAlertController | `DC/AlertController/` | System alert / action-sheet wrapper | none |
| SKNavigationTitle | `DC/NavigationTitle/` | Nav-bar title + subtitle with ornaments | SNAP/SKNavigationTitleSnapshotTests/ (25) |
| Tooltips / coachmarks | `(not in SlackKit)` | SKBanner `coachmark` tone; EDUTooltip in Modules/UIInfra/Education | none |
| SKTextField | `DC/TextField/` | Bordered single-line field: ornament, clear, spinner, ghost text, secure entry | SNAP/SKTextFieldSnapshotTests/ (16), SNAP/SKTextFieldRichBackingSnapshotTests/ (8, new) |
| SKSearchBar | `DC/SearchBar/` | Gray search field with magnifier | SNAP/SKSearchBarSnapshotTests/ (9), SNAP/SKSearchBarRichBackingSnapshotTests/ (3, new) |
| SKTokenView | `DC/TokenView/` | Chip / token for people, channels, tags | SNAP/SKTokenViewSnapshotTests/ (32) |
| SKTokenBar | `DC/TokenBar/` | Wrapping token field with "+N" overflow | SNAP/SKTokenBarSnapshotTests/ (7) |
| SKTextToolbar | `DC/TextToolbar/` | Formatting toolbar of 36 pt icon buttons | SNAP/SKTextToolbarSnapshotTests/ (5, new in September 2026) |
| SKTextInput | `CC/TextInput/` | Multi-line rich text input (composer core) | none |
| SKInputAccessoryView / SKDateTimePickerEntity | `DevC/InputAccessoryView/, DevC/DateTimePickerView/` | Keyboard accessory bar; date picker row | none |
| SKThumbnailAttachment | `DC/ThumbnailAttachment/` | 64 / 96 pt square attachment thumbnail with selection | SNAP/SKThumbnailAttachmentSnapshotTests/ (32) |
| SKCompactAttachment | `DC/CompactAttachment/` | File / attachment card row (36 pt file tile) | SNAP/SKCompactAttachmentSnapshotTests/ (9) |
| SKExpandedAttachment | `DC/ExpandedAttachment/` | Large inline image / video preview | SNAP/SKExpandedAttachmentSnapshotTests/ (14) |
| SKAttachmentBar | `DC/AttachmentBar/` | Layout of a message's attachments with overflow | SNAP/SKAttachmentBarSnapshotTests/ (14) |
| SKCompactOverflow | `DC/CompactOverflow/` | "+N more" compact card | SNAP/SKCompactOverflowSnapshotTests/ (3) |
| VideoDurationBadge / AltText badge | `SKH/VideoDurationBadge/, SKH/AltText/` | Dark pill badges on media | none |
| Entity row anatomy (SKEntityBaseView) | `SKH/EntityViews/` | Shared list-row layout, highlight, ornaments, text lines | SNAP/SKEntityContentViewSnapshotTests/ (46), SNAP/SKEntityOrnamentViewSnapshotTests/ (26) |
| SKMemberEntity | `DC/Entities/MemberEntity/` | Person row | SNAP/SKMemberEntitySnapshotTests/ (35) |
| SKChannelEntity | `DC/Entities/ChannelEntity/` | Channel row | SNAP/SKChannelEntitySnapshotTests/ (27) |
| SKMultiPersonDirectMessageEntity | `DC/Entities/MPDMEntity/` | Group DM row | SNAP/SKMultiPersonDirectMessageEntitySnapshotTests/ (13) |
| SKUserGroupEntity | `DC/Entities/UserGroupEntity/` | User group row | SNAP/SKUserGroupEntitySnapshotTests/ (12) |
| SKWorkspaceEntity | `DC/Entities/WorkspaceEntity/` | Workspace row | SNAP/SKWorkspaceEntitySnapshotTests/ (11) |
| SKAppEntity | `DC/Entities/AppEntity/` | App / bot row | SNAP/SKAppEntitySnapshotTests/ (10) |
| SKMemberCollectionEntity | `DC/Entities/MemberCollectionEntity/` | Horizontal strip of big avatars with names | SNAP/SKMemberCollectionEntitySnapshotTests/ (5) |
| SKGenericEntity | `DC/Entities/GenericEntity/` | General-purpose list row (settings, menus) | SNAP/SKGenericEntitySnapshotTests/ (37) |
| SKHeaderEntity | `DC/Entities/SKHeaderEntity.swift` | List section header with collapse, badge, button | SNAP/SKListHeaderSnapshotTests/ (39) |
| SKButtonEntity | `DC/Entities/ButtonEntity/` | Button(s) as a list row | SNAP/SKButtonEntitySnapshotTests/ (11) |
| SKBannerEntity | `DC/Entities/BannerEntity/` | Banner as a list row | SNAP/SKBannerEntitySnapshotTests/ (19) |
| SKCommandEntity | `DC/Entities/CommandEntity/` | Slash-command row | SNAP/SKCommandEntitySnapshotTests/ (10) |
| SKEmojiEntity | `DC/Entities/EmojiEntity/` | Emoji autocomplete row | SNAP/SKEmojiEntitySnapshotTests/ (1) |
| SKTokenBarEntity | `DC/Entities/TokenBarEntity/` | Token bar as a list row | SNAP/SKTokenBarEntitySnapshotTests/ (4) |
| SKSingleLineTextInputEntity / SKMultiLineTextInputEntity | `DC/Entities/TextInput/` | Form text-field rows | SNAP/SKSingleLineTextInputEntitySnapshotTests/ (12) |
| SKList (SKEntitiesList) | `CC/List/` | Sectioned list: headers, footers, separators, accessories, swipe, drawers | SNAP/SKListSnapshotTests/ (10) |
| SKRecyclerView | `CC/RecyclerView/` | Lightweight stack of recycled components | SNAP/SKRecyclerViewSnapshotTests/ (16) |
| SKTruncator / SKCardDecorator | `DevC/Truncator/, DevC/CardDecorator/` | Show more / less truncation of labels and recyclers; a bordered card wrapper (new in September 2026) | SNAP/SKTruncatorSnapshotTests/ (1), SNAP/SKTruncatingRecyclerSnapshotTests/ (2) |
| SKEmbeddableView / SKScrollEffect | `CC/ListEmbeddable/, CC/ScrollEffect/` | VC-in-row host; scroll-driven effects | none |
| SKTabBar | `DC/TabBar/` | Tabs / segmented control: underline, pill background, pill buttons | SNAP/SKTabBarSnapshotTests/ (10) |
| UITabBarItem icons | `CC/Icon/UITabBarItem+Icons.swift` | 25 pt bottom tab-bar icons | SNAP/UITabBarItemIconsSnapshotTests/ (1) |
| SKReacjiPill | `DC/Reacji Pill/` | Emoji reaction pill | SNAP/SKReacjiPillSnapshotTests/ (8) |
| SKReacjiBar | `DC/Reacji Bar/` | Wrapping reactions row with add / show more | SNAP/SKReacjiBarSnapshotTests/ (7) |
| SKMediaReactionsView | `DevC/MediaReactionsView/` | Floating emoji over media | none |
| SKMenu | `DevC/Menu/` | Native context / pull-down menu model | none |
| SKPipeDecorator / PipedTextPreview | `DevC/PipeDecorator/, DevC/PipedTextPreview/` | Left quote-pipe wrapper and preview | SNAP/PipedTextPreviewSnapshotTests/ (2) |
| SKLabel | `CC/Label/` | Rich text label (links, mentions, code, show more) | SNAP/SKLabelSnapshotTests/ (56) |
| SKIcon | `CC/Icon/` | SVG / icon-font glyph, 20 pt default | SNAP/SKIconSnapshotTests/ (6) |
| SKEmoji | `CC/Emoji/` | Native or custom emoji | SNAP/SKEmojiSnapshotTests/ (5) |
| SKImageView / SKRetryableImageView | `CC/ImageView/` | Async image with placeholder, radius, retry | SNAP/SKImageViewSnapshotTests/ (11), SNAP/SKRetryableImageViewSnapshotTests/ (4) |
| DeveloperComponents module (SKCodeInput, SKDialog, SKInformationCard, SKSearchView, SKTabButton, bottom sheet, nav controller, blocker…) | `UDC/` | Brief entries only | `Modules/UIInfra/DeveloperComponents/Snapshots/iOS_26/` |
| SKContextBar | `Modules/UIInfra/ContextBarUI/` | Composer context strip (warnings, typing, coachmark, agent rows) | `ContextBarUITests.SKContextBarSnapshotTests/` (30) |

Source paths use the prefixes defined in "Conventions" below. Snapshot counts are the September iOS_26 PNGs. Each component PNG is a 2 × 2 grid (light / dark rows, normal / high-contrast columns) unless its section says otherwise. SlackKit also has 1,036 iOS_18 and 980 iOS_27 PNGs (985 iOS_26; 3,001 in total).

## Conventions used in this file

**Path abbreviations.** Each one expands to a path relative to the repo root in
`/Users/colson.rice/Desktop/Slack Mobile Code Base/slack-objc-latest` (main @ `14b3cbaf`, 2026-09-30). Line numbers are
for that checkout. (The June checkout, `slack-objc-main` at `cd22922`, is kept for comparison.)

| Prefix | Expands to |
|---|---|
| `DC/` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/` |
| `CC/` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/` |
| `DevC/` | `Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/` |
| `SKH/` | `Modules/UIInfra/SlackKit/Implementation/Helpers/` |
| `SKX/` | `Modules/UIInfra/SlackKit/Implementation/Extensions/` |
| `SKF/` | `Modules/UIInfra/SlackKitFoundations/Implementation/` |
| `UDC/` | `Modules/UIInfra/DeveloperComponents/Implementation/` (a separate module, not SlackKit) |
| `PG/` | `Modules/Features/SlackKitPlayground/Implementation/Conformances/` |
| `TST/` | `Modules/UIInfra/SlackKit/Tests/Unit/` |
| `SNAP/` | `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.` (for example, `SNAP/SKButtonSnapshotTests/testButtonPrimaryEnabled@3x.png`). The LFS objects are pulled in `slack-objc-latest`; the iOS_27 twins are under `Snapshots/iOS_27/`. |
| `Colors.swift:N` | design-tokens `output/ios/Colors.swift` line N (the cache path is in `README.md`) |
| `Legacy:N` | `Modules/Data/Color/Implementation/SKLegacyColors.swift` line N |
| `ColorSet:N` | `Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift` line N |
| `Fonts:N` | `Modules/Data/Font/Implementation/UIFont+LegacySupport.swift` line N |
| `Icons` | `Modules/Data/Icon/ResourceBundle/Icons.xcassets/<name>.imageset/<name>.svg`. The `SKIconManifest` case → filename map is in `Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift`, around line 3700. |

**Notation.**
- **Colors** are written `primary.contentPrimary` #1D1C1D / #F8F8F8, meaning light / dark. Names are properties of
  `CoreColorSet.default` unless a name starts with `sk_`, which marks a legacy color from `SKLegacyColors.swift`. Alpha
  is written `#1D1C1D @6%`. Derived colors (`darken`, `lighten`, `dynamicLighten`) show the formula and the computed hex.
- **Fonts** are written `SKFont.smallBodyBold` → Lato Bold 15. All SKFonts scale with Dynamic Type (see "Shared behavior").
- **Sizes** are in pt. For @3x PNG measurements, the pixel count is divided by 3, and the spec says it was measured.
- **States**: normal, highlighted (finger down, which is `UIControl.isHighlighted` and maps to `:active` on the web),
  selected, and disabled. There is no hover.

## Shared behavior (SlackKitFoundations and friends)

**Component model.** Each component is a UIKit view: a `UIView`, `UIControl` or `UIButton` subclass, and a few are view
controllers. Each one is configured by a single value type, its `PresentationObject`, through
`configure(presentationObject:reuseSupport:)`. It reports user actions through an `ObservableActions` enum published on
`actionPublisher` (`SKF/Models/SKComponent.swift:22-46`). For the web: one React component per SlackKit component, with
props = the PresentationObject's fields and callbacks = the ObservableActions cases.

**How the snapshots are rendered.** Since September 2026 `ComponentSnapshotTestCase` renders the component four times
at the same size, in a **2 × 2 grid: rows light (top) / dark (bottom), columns normal (left) / high contrast (right)**
(`accessibilityContrast` trait). It uses a transparent background and a 393×852 pt window with zero safe-area insets
(`Modules/UIInfra/SnapshotTestFoundations/Implementation/ComponentSnapshotTestCase.swift:11-14`, `:196-225`). So every
SlackKit PNG holds both appearances at both contrasts; one cell in pt = PNG width ÷ 6 × PNG height ÷ 6. (June's
baselines stacked light over dark, one column.) `.wrap` layout hugs the content, and `.fill` makes the component 393 pt
wide (`:228-245`). Captures use `layer.render` unless a test sets `usesDrawViewHierarchyInRect` (`:68`; SKSwitch does).
Tests built on plain `SnapshotTestCase` (PageController, ClearButton, BarButtonItem, UITabBarItemIcons) don't use this
composite. Their sections say what they show instead. Throughout this file "light over dark" for a SlackKit snapshot
means the left column of that grid.

**Pressed "bounce".** Buttons, pills, icon buttons, tab items, reacji pills, list cells and toolbar items shrink while
pressed and spring back on release. `UIView.animateWithBounceMode(scaleDown:)` uses a spring with damping 1.0 (no
overshoot). Scaling down lasts 0.2 s (smooth/fast) and scaling back up lasts 0.4 s (smooth/medium). With Reduce Motion on,
the change is instant (`SKF/Extensions/UIView+BounceMode.swift:14-35`). Each component sets its own scale factor (see the
component sections).

**Spring presets** (`SKF/Extensions/UIView+SpringAnimation.swift:64-130`). Damping is 1.0 for smooth, 0.85 for snappy
and 0.70 for bouncy. The perceptual lengths are fast 0.12 s, medium 0.25 s and long 0.375 s. Total durations in seconds:

| style \ speed | fast | medium | long |
|---|---|---|---|
| smooth | 0.2 | 0.4 | 0.6 |
| snappy | 0.177 | 0.368 | 0.552 |
| bouncy | 0.207 | 0.431 | 0.647 |

On the web, a CSS approximation is `transform: scale(k)` with `transition: transform 200ms ease-out` going down and
`400ms` coming back up. There is no overshoot for smooth.

**Dynamic Type.** Every `SKFont` is `UIFontMetrics.default.scaledFont(for:maximumPointSize:)`, capped at these sizes:
headline 58, title 56, subtitle 55, body 53, smallBody 49, caption 44, micro 43 (`Fonts:20-244`). The base sizes are
headline 28 Black, title 22 Black, subtitle 20 (Black / Bold / Regular), body 17 (Regular / Bold / Black), smallBody 15
(Regular / Bold / Black), caption 13 (Regular / Bold / Black), micro 12 (Regular / Bold), and logging 12 Menlo
(`Modules/Data/Font/Implementation/SKFont.swift:17-55`). The font faces are in
`Modules/Data/Font/Implementation/FontStyle.swift:11-23`: Lato Light / Regular / Italic / Semibold / Bold / BoldItalic /
Black, and Menlo for monospace. The snapshots all use the default size category (Large), which is what to prototype at.
Components that change layout at accessibility sizes say so in their sections (for example, SKEmptyState stacks its
buttons vertically at `>= .accessibilityMedium`).

**Haptics** (`SKH/Haptics/SKHaptics.swift:11-32`) respect the user's haptics setting. A light impact fires on checkbox
and radio toggles (`DC/Checkbox/SKCheckbox.swift:278`, `DC/RadioButton/SKRadioButton.swift:276`); the switch is a native
`UISwitch` since September 2026 and no longer calls SKHaptics. `selectionChanged` fires on tab-bar selection (`DC/TabBar/SKTabBar.swift:550`), on
reacji-pill toggle (`DC/Reacji Pill/SKReacjiPill.swift:264`), and when a swipe action crosses its threshold
(`CC/List/SwipeableContentDecorator/SKSwipeableContentDecorator.swift:291`). A web prototype can ignore these, or use
`navigator.vibrate`.

**Color math** (`Modules/Data/Color/Implementation/UIColor+Extensions.swift:24-66`). `blend(c1, c2, p)` is a linear mix
of the RGBA components: `c1·(1−p) + c2·p`. From it:
- `lighten(p)` = blend with #FFFFFF
- `darken(p)` = blend with #000000
- `dynamicLighten(p)` = blend with `sk_primary_background` (#FFFFFF / #1A1D21)
- `dynamicDarken(p)` = blend with `sk_primary_foreground` (#1D1C1D / #D1D2D3)

These calls read RGB values with `getRed`, so the result is a static color resolved in the appearance that is current at
the moment of the call. Dynamic colors come from `UIColor(light:dark:…)` (`Modules/Data/Color/Implementation/UIColor+Dynamic.swift:24-71`),
which also has optional high-contrast, true-black and elevated-dark variants. September 2026: true dark is a trait
(`traitCollection.isTrueDark`, `UITraitTrueDark.swift:21-28`) and wins over high contrast for base views; elevated views
take `elevatedDark` in true dark or high contrast (`UIColor+Dynamic.swift:41-63`). Only `basePrimary` /
`sk_primary_background` define trueDark #000000 and elevatedDark #1D1C1D.

**Other shared helpers.**
- Hairline = `1 / screen scale`, which is 0.333 pt at @3x (`SKF/Utilities/UIUtilities.swift:16-22`).
- Proportional corner radius = `min(20, 0.25 × side)` (`SKF/Utilities/UIUtilities.swift:94-99`).
- Shadows use black in light mode and #DDDDDD (`sk_soft_gray`) in dark mode (`Legacy:278-288`).
- Global appearance (`Modules/UIInfra/SlackKit/Implementation/Global/SLAppearance.swift`):
  - The nav bar has no shadow line (`:34`). Its tint is `highlight1.content` #1264A3 / #2BA5CE (`:37`), and its title is
    Lato Bold 17 (`:40-41`).
  - Tab-bar item titles are Lato Bold 11 (`:45`).
  - Search-bar text and its Cancel button are Lato Regular 17 in `primary.contentPrimary` (`:51-59`).
- VoiceOver primary actions (`SKF/Utilities/Accessibility/SKAccessibilityPrimaryAction.swift`) and the Large Content
  Viewer long-press (`SKH/Gestures/`) are accessibility-only and have no visual design.

**Spacing scale.** Some components use `Spacing` from `Modules/Data/DataModels/Implementation/Layout/Spacing.swift:24-49`:
none 0, small 4, medium 8, large 12, xLarge 16, xxLarge 24. Most components define their own private `Constants` instead.

**Text heights.** SlackKit labels use Lato's natural line height, about 1.2 × the point size: 12 → 14.4, 13 → 15.6,
15 → 18, 17 → 20.4, 22 → 26.4, rounded up to the @3x pixel grid. Measured: a medium SKButton is 38 pt tall, which is 18
(smallBody 15) + 2 × 10 padding (`SNAP/SKButtonSnapshotTests/testButtonMedium@3x.png`). Use `line-height: 1.2` on the web.

## Color tokens used by SlackKit

Components reference `CoreColorSet.default.<group>.<prop>` (the mapping is in `ColorSet:68-175`; September added the
education colors to `primary`: `baseEducation`, `baseInverseEducation`, `surfaceEducation`, `contentEducation`,
`contentInverseEducation`, `outlineEducation`). Hex values come from `Colors.swift` at design tokens **f76ac0a** (the iOS
app's pin in September; June's was df1f228). f76ac0a adds `lightHighContrast` / `darkHighContrast` values to every token
(used with Increase Contrast and in the right column of the snapshots; `src/tokens/generated/colors.css` has them) and
changed three dark values, marked below. The rows below cover every CoreColorSet property, including the ones SlackKit uses:

| CoreColorSet.default. | dt token | light | dark | Colors.swift |
|---|---|---|---|---|
| `primary.basePrimary` | `dt_color_base_primary` | #FFFFFF | #1A1D21 (trueDark #000000, elevatedDark #1D1C1D) | :42 |
| `primary.baseSecondary` | `dt_color_base_secondary` | #F8F8F8 | #1A1D21 | :50 |
| `primary.baseTertiary` | `dt_color_base_tertiary` | #EAEAEA | #212428 | :56 |
| `primary.baseModal` | `dt_color_base_modal` | #1D1C1D @70% | #101214 @60% | :86 |
| `primary.baseInversePrimary` | `dt_color_base_inverse_primary` | #1D1C1D | #212428 | :92 |
| `primary.surfacePrimary` | `dt_color_surface_primary` | #1D1C1D @6% | #F8F8F8 @6% | :134 |
| `primary.surfaceSecondary` | `dt_color_surface_secondary` | #1D1C1D @25% | #F8F8F8 @25% | :140 |
| `primary.containerPrimary` | `dt_color_container_primary` | #FFFFFF | #212428 | :188 |
| `primary.containerSecondary` | `dt_color_container_secondary` | #F8F8F8 | #212428 | :194 |
| `primary.contentPrimary` | `dt_color_content_primary` | #1D1C1D | #F8F8F8 | :200 |
| `primary.contentSecondary` | `dt_color_content_secondary` | #454447 | #B9BABD | :206 |
| `primary.contentTertiary` | `dt_color_content_tertiary` | #5E5D60 | #9A9B9E | :212 |
| `primary.contentInversePrimary` | `dt_color_content_inverse_primary` | #FFFFFF | #F8F8F8 | :248 |
| `primary.contentInverseSecondary` | `dt_color_content_inverse_secondary` | #CBCCCF | #B9BABD | :254 |
| `primary.outlinePrimary` | `dt_color_outline_primary` | #7C7A7F | #797C81 | :290 |
| `primary.outlineSecondary` | `dt_color_outline_secondary` | #5E5D60 @45% | #797C81 @50% | :296 |
| `primary.outlineTertiary` | `dt_color_outline_tertiary` | #5E5D60 @13% | #797C81 @30% | :302 |
| `highlight1.base` | `dt_color_base_highlight_1` | #E3F8FF | #001A2D | :62 |
| `highlight1.baseInverse` | `dt_color_base_inverse_highlight_1` | #1264A3 | #0A77A7 (June #004D76) | :98 |
| `highlight1.surface` | `dt_color_surface_highlight_1` | #36C5F0 @13% | #036696 @25% | :146 |
| `highlight1.content` | `dt_color_content_highlight_1` | #1264A3 | #2BA5CE | :218 |
| `highlight1.contentInverse` | `dt_color_content_inverse_highlight_1` | #9ED6FA | #2BA5CE | :260 |
| `highlight1.outline` | `dt_color_outline_highlight_1` | #1264A3 | #2BA5CE | :308 |
| `highlight1.outlineSecondary` | `dt_color_outline_highlight_1_secondary` | #0E9DD3 @20% | #307EC0 @20% | :314 |
| `highlight2.base` | `dt_color_base_highlight_2` | #E3FFF3 | #05241B | :68 |
| `highlight2.baseInverse` | `dt_color_base_inverse_highlight_2` | #007A5A | #177E56 (June #00553D) | :104 |
| `highlight2.surface` | `dt_color_surface_highlight_2` | #4CC894 @25% | #106F4D @33% | :152 |
| `highlight2.content` | `dt_color_content_highlight_2` | #007A5A | #3DAA7C | :224 |
| `highlight2.contentInverse` | `dt_color_content_inverse_highlight_2` | #4CC894 | #3DAA7C | :266 |
| `highlight2.outline` | `dt_color_outline_highlight_2` | #007A5A | #259B69 | :320 |
| `highlight2.outlineSecondary` | `dt_color_outline_highlight_2_secondary` | #007A5A @10% | #63C29A @20% | :326 |
| `highlight3.base` | `dt_color_base_highlight_3` | #FFFAE0 | #2F1E00 | :74 |
| `highlight3.baseInverse` | `dt_color_base_inverse_highlight_3` | #F1B900 | #7E5800 | :110 |
| `highlight3.surface` | `dt_color_surface_highlight_3` | #FFC600 @18% | #A07300 @18% | :158 |
| `highlight3.content` | `dt_color_content_highlight_3` | #6B5000 | #DEA700 | :230 |
| `highlight3.contentInverse` | `dt_color_content_inverse_highlight_3` | #FFD738 | #DEA700 | :272 |
| `highlight3.outline` | `dt_color_outline_highlight_3` | #C79600 | #D29C00 | :332 |
| `highlight3.outlineSecondary` | `dt_color_outline_highlight_3_secondary` | #F1B900 @20% | #B38200 @20% | :338 |
| `important.base` | `dt_color_base_important` | #FFE8EF | #300005 | :80 |
| `important.baseInverse` | `dt_color_base_inverse_important` | #E01E5A | #D3305D (June #B41541) | :116 |
| `important.surface` | `dt_color_surface_important` | #FF81AA @13% | #B41541 @25% | :164 |
| `important.content` | `dt_color_content_important` | #C01343 | #DE678A | :236 |
| `important.contentInverse` | `dt_color_content_inverse_important` | #FFA3C2 | #DE678A | :278 |
| `important.outline` | `dt_color_outline_important` | #E01E5A | #D94C75 | :344 |
| `important.outlineSecondary` | `dt_color_outline_important_secondary` | #E01E5A @30% | #D94C75 @25% | :350 |

`ColorSet.Constants.white` / `.black` are `dt_color_constants_white` #FFFFFF and `dt_color_constants_black` #000000 in
both appearances (`ColorSet:62-65`, `Colors.swift:13-14`).

**Legacy `sk_*` colors** used by SlackKit (`Legacy:` line). "Both" means the color is the same in both appearances.

| name | light | dark | Legacy |
|---|---|---|---|
| `sk_primary_foreground` | #1D1C1D | #D1D2D3 | :27-29 |
| `sk_primary_background` (= `sk_inverted_foreground`) | #FFFFFF | #1A1D21 (trueDark #000000, elevatedDark #1D1C1D) | :34-39, :53 |
| `sk_foreground_max` / `_high` / `_mid` / `_low` / `_soft` / `_min` | `sk_primary_foreground` @70% / 50% / 30% / 13% / 6% / 4% | same alphas of #D1D2D3 | :65, :75, :85, :90, :100, :112 |
| `sk_foreground_max_solid` | #616061 | #9A9C9E | :70 |
| `sk_foreground_high_solid` | #868686 | #75777A | :80 |
| `sk_foreground_low_solid` | #DDDDDD | #323538 | :95 |
| `sk_foreground_soft_solid` | #F3F3F3 | #24272A | :105-107 |
| `sk_foreground_min_solid` | #F8F8F8 | #212428 | :117-118 |
| `sk_highlight` | #1264A3 | #1D9BD1 | :125 |
| `sk_highlight_hover` | #0B4C8C | #1D9BD1 | :130 |
| `sk_highlight_accent` = `sk_sky_blue` | #1D9BD1 (both) | | :135, :232 |
| `sk_secondary_highlight` = `sk_sunshine_yellow` | #F2C744 (both) | | :140, :217 |
| `sk_true_black` / `sk_true_white` | #000000 / #FFFFFF (both) | | :147, :152 |
| `sk_black` | #1D1C1D (both) | | :157 |
| `sk_black_high_contrast` | #1D1C1D @50% (both) | | :162 |
| `sk_dark_gray` / `sk_light_gray` / `sk_soft_gray` / `sk_subtle_gray` / `sk_off_white` | #616061 / #868686 / #DDDDDD / #F3F3F3 / #F8F8F8 (both) | | :167-187 |
| `sk_lilypad_green` | #007A5A (both) | | :192 |
| `sk_aubergine` | #4A154B (both) | | :197 |
| `sk_raspberry_red` | #E01E5A (both) | | :202 |
| `sk_reddish_orange` / `sk_just_orange` | #DE4E2B / #E8912D (both) | | :207, :212 |
| `sk_indigo` / `sk_sapphire_blue` | #0B4C8C / #1264A3 (both) | | :222, :227 |
| `sk_pale_yellow` | #F2C744 @20% (both) | | :242 |
| `sk_pale_yellow_solid` | #FCF4DA (`sunshine.lighten(0.8)`) | #61501B (`sunshine.darken(0.6)`) | :247 |
| `sk_frosty_blue` | #1D9BD1 @10% (both) | | :252 |
| `sk_frosty_blue_solid` | #E8F5FA (`sky.lighten(0.9)`) | #092F3F (`sky.darken(0.7)`) | :267 |
| `sk_toast_background` | #141414 @70% | #141414 @90% | :269-271 |

## Playground registry (PlaygroundManifest)

The SlackKit Playground app (`Apps/SlackKitPlayground/Implementation/AppDelegate.swift`) wraps
`SlackKitPlaygroundFeature`. The feature lists its components in
`Modules/Features/SlackKitPlayground/Implementation/PlaygroundManifest.swift`, and the playground sorts each list
alphabetically:

- **coreComponents** (`:21-27`): SKEmoji, SKIcon, SKImageView, SKLabel, SKTextInput (now generic over its text
  processor only, `SKTextInput<PassthroughTextProcessor>`).
- **designerComponents** (`:30-87`): SKAlertController, SKAppEntity, SKAttachmentBar, SKAvatarPile, SKBadge, SKBanner,
  SKBannerEntity, SKButton, SKButtonEntity, SKChannelEntity, SKCheckbox, SKColorSwatch, SKCommandEntity,
  SKCompactAttachment, SKContextBar (from `ContextBarUI`), SKDot (new in September), SKEmojiEntity, SKEmptyState,
  SKExpandedAttachment, SKIconButton, SKGenericEntity, SKHeaderEntity (new in September), SKEntitiesList, SKLoadingEntity, SKLoadingHeader, SKLoadingBar, SKLoadingState,
  SKMemberAvatar, SKMemberCollectionEntity, SKMemberEntity, SKMultiLineTextInputEntity,
  SKMultiPersonDirectMessageEntity, SKNavigationTitle, SKOrnamentBox, SKPageController, SKPillButton, SKProgressBar,
  SKRadioButton, SKReacjiBar, SKReacjiPill, SKSearchBar, SKSearchBarButton, SKSingleLineTextInputEntity, SKSpinner,
  SKSwitch, SKTabBar, SKTextField, SKTextToolbar, SKThumbnailAttachment, SKToast, SKTokenBar, SKTokenBarEntity,
  SKTokenView, SKUserGroupEntity, SKWorkspaceAvatar, SKWorkspaceEntity.
- **developerComponents** (`:90-107`): BlockerModalViewController, SKCircularProgressIndicator, SKCodeInput,
  SKDateTimePickerEntity, SKDecoratedIcon, SKDialog, SKDialogViewController, SKGroupAvatar, SKHuddleFacePile,
  SKInformationCard, SKJumpBarDecoratorViewController, SKNavigationController, SKSearchView, SKTabButton,
  SKTappableLabel, PipedTextPreview. Several of these live in the separate `Modules/UIInfra/DeveloperComponents` module
  (`UDC/`).

The per-component playground configurations are in
`Modules/Features/SlackKitPlayground/Implementation/Conformances/{DesignerComponents,DeveloperComponents}/<Name>/<Name>+PlaygroundExtensions.swift`
(`PG/`). Each one lists the variants a designer can toggle, which makes it a good model for the web prototype's prop
controls. The playground also has foundation pages for icons, typography, token colors, legacy colors and motion
(`Modules/Features/SlackKitPlayground/Implementation/Foundations/`).

---

# Buttons

## SKButton

**Purpose.** Slack's standard text button, with an optional icon, a loading spinner, a disabled state and an optional
menu. It comes in text-only (`default`, `system*`), filled (`primary`, `danger`) and outlined (`outline*`) styles, plus
fixed-purpose sizes for bar buttons, toasts and huddles.

**Source.**
- `DC/Button/SKButton.swift`: view, `Constants` at :45-48, layout at :52-100, sizing at :182-217, colors per state at
  :242-251 and :393-464.
- `DC/Button/SKButton+Types.swift`: `Style` :24-35, `ButtonState` :41-45, `AnimationStyle` :51-56, `IconPosition`
  :62-76, `Size` :81-111, colors per style :134-242, metrics per size :248-383.
- `DC/Button/SKButton+PresentationObject.swift`: props :13-32, horizontal padding :203-240.
- `DC/Button/SKButton+ObservableActions.swift`.
- Playground: `PG/DesignerComponents/Button/SKButton+PlaygroundExtensions.swift`. Tests:
  `TST/DesignerComponents/Button/SKButtonSnapshotTests.swift`.

**Snapshots** (`SNAP/SKButtonSnapshotTests/`, 2 × 2 grids, see "How the snapshots are rendered"). All use the title
"Button Title".
- `testButtonOutlineDefaultEnabled@3x.png`: the default style. White fill with a gray 1 pt border in light mode, and a
  #1A1D21 fill in dark mode. 103.3 × 38 pt.
- `testButtonPrimaryEnabled@3x.png` and `testButtonPrimaryLoading@3x.png`: green fill; the loading state shows a gray
  disabled fill with an 18 pt spinner.
- `testButtonCustomWithIconOnTop@3x.png`: icon stacked above the title, 103.3 × 64 pt.

Other variant families: DangerEnabled/Disabled/Loading, OutlinePrimary* and OutlineDanger*, SystemDefault/SystemDanger
(text only), Default* (`.default()` text-only), ExtraSmall, Small, Medium, Large, ExtraLarge, IconOnly, LargeIconOnly,
DefaultLongText (wraps at 392.7 pt), Custom* (indigo `.custom`, icon left/right/top, loading, disabled), BarButton,
ToastButton, HuddleBarButton, ChannelDetailBarButton (emoji title), and AtLeastAsBigAsProcessingIndicator (18 × 18 pt).
New in September 2026: `testButtonIconColorOverride` (outlineDefault, `.svgCheckCircleFilled` in `highlight2.content`)
and `testButtonIconColorOverrideTakesPriorityOverTitleColor` (the same icon on an indigo `.custom` button), both
129.3 × 40 pt.

**API** (`SKButton+PresentationObject.swift:13-68`)

| prop | type / values | default | cite |
|---|---|---|---|
| `title` | `String`, `[Content]` (`.text(String)` / `.emoji(SKEmoji.PresentationObject)`) or `Text` | required; `""` gives an icon-only button | :14, `Types:15-18` |
| `style` | `default(textColor = primary.contentPrimary)`, `outlineDefault`, `systemDefault(isPadded = true)`, `systemDanger(isPadded = true)`, `primary`, `danger`, `outlinePrimary`, `outlineDanger`, `custom(backgroundColor, titleColor, borderColor)`, `quickAction(isSelected = false)` | `.outlineDefault` | :36, `Types:24-35` |
| `state` | `enabled`, `inactive` (disabled), `processing` (spinner) | `.enabled` | :37, `Types:41-45` |
| `size` | `extraSmall`, `small`, `medium`, `large`, `xLarge`, plus the internal sizes `singleRecordViewQuickAction(inCompactHeight)`, `huddleBarButton(isLiquidGlass)`, `barButton`, `channelDetailBarButton`, `toastButton`, `workflowComposerButton(isLiquidGlass)`, `messageActionsPrimaryButton`, `recapFooterButton` | `.medium` | :38, `Types:81-111` |
| `iconPresentationObject` | `SKIcon.PresentationObject?`; its `colorOverride` keeps the icon that color in every state instead of the title's. The older `icon: SKIconManifest?` initializers wrap it (`icon` is now a computed property); a new initializer takes the presentation object (`:171-202`). September 2026. | nil | :18-19 |
| `iconPosition` | `left`, `right`, `top` | `.left` | :40, `Types:62-76` |
| `numberOfLines` | Int (0 = unlimited) | 0 | :41 |
| `menuConfiguration` | `.menu(SKMenu.PresentationObject, isPrimaryAction)` or `.none`. Passing `menuPresentationObject` sets `isPrimaryAction: true`, so a tap opens the menu. | `.none` | :42, :55-59 |
| `disableAnimations` | Bool, turns off the pressed bounce | false | :43 |
| `animationStyle` | `default` (scale the whole button) or `scaleContentOnly` (scale only the title and icon) | `.default` | :44, `Types:51-56` |
| actions | `buttonTapped`, `menuShown`, `menuActionSelected(uniqueId)` | | `SKButton+ObservableActions.swift` |

**Layout per size** (all from `SKButton+Types.swift` unless noted; the horizontal padding is in
`SKButton+PresentationObject.swift:203-229`)

| size | font | vertical padding | horizontal padding | corner radius | icon | icon–title gap (horizontal) | height (1-line title, measured) |
|---|---|---|---|---|---|---|---|
| extraSmall | microBold (Lato Bold 12) | 2 | 4 | 8 | 20 | 4 | 18.7 |
| small | captionBold (Lato Bold 13) | 7 | 9 | 10 | 20 | 4 | 29.7 |
| medium | smallBodyBold (Lato Bold 15) | 10 | 12 | 12 | 20 | 6 | 38.0 |
| large | bodyBold (Lato Bold 17) | 14 | 16 | 14 | 20 | 8 | 48.7 |
| xLarge | title (Lato Black 22) | 20 | 20 | 28 | 36 | 8 | 66.7 |
| barButton | bodyBold | 7 | 0 | 0 | 20 | 0 | 34.8 |
| toastButton | body (Lato Regular 17) | 0 | 0 | 0 | 20 | 0 | 20.7 |
| huddleBarButton | microBold (smallBodyBold with liquid glass) | 6 | 8 | 14 | 16 | 5 | 26.7 |
| channelDetailBarButton | bodyBold | 6 | 6 | 0 | 24 | 5 | 32.7 (emoji title; that PNG shows one appearance, 34 × 32.7) |
| singleRecordViewQuickAction | captionBold | 20 (7 if compact) | 8 | 12 | 24 (20 if compact) | 8 (6 if compact) | none |
| workflowComposerButton | smallBodyBold, max 20 pt | 10 (8 with glass) | 12 | 12 (18 with glass) | 20 | 10 | none |
| messageActionsPrimaryButton | captionBold | 24 | 8 | 12 | 24 | 8 | none |
| recapFooterButton | microBold | 6 | 8 | 0 | 16 | 5 | none |

Citations for the table: font :249-278, vertical padding :280-309, corner radius :311-334, spacing :336-359, icon
:370-383. Heights were measured from `SNAP/SKButtonSnapshotTests/testButton{ExtraSmall,Small,Medium,Large,ExtraLarge,BarButton,ToastButton,HuddleBarButton,ChannelDetailBarButton}@3x.png`;
"none" means no snapshot exists.

- With `iconPosition: .top`, the icon and title stack vertically with a 6 pt gap (8 for messageActionsPrimaryButton)
  (`Types:361-368`).
- `systemDefault(isPadded: false)` and `systemDanger(isPadded: false)` drop the horizontal padding to 0
  (`PresentationObject:231-238`).
- Size = content + padding: width = title width + icon + gap + 2 × horizontal padding, and height = the taller of the
  title and icon + 2 × vertical padding. Both are at least 18 pt, the spinner's size (`SKButton.swift:182-217`). The
  content is centered (`:87-99`). The title wraps when the button is constrained (`numberOfLines` 0), and the long-text
  snapshot wraps inside a 393 pt width.
- Border: 1 pt when the style has a border color (`SKButton.swift:46`, `:274`). Corners use `cornerCurve = .continuous`
  (`:272-273`).
- An icon-only button is square-ish: medium measures 44 × 40 and large 52 × 48 (`testButtonIconOnly`,
  `testButtonLargeIconOnly`).

**Type.** The title is an SKLabel with the size's font, centered, in the state's title color (`SKButton.swift:254-258`).
The icon uses the same color as the title unless its presentation object sets `colorOverride` (`:452-463`).

**Color by state** (`SKButton+Types.swift:134-234`, `SKButton.swift:242-251`, `:393-421`). The pressed column also
applies when `isSelected` is true. September 2026: primary, danger, the outline styles and systemDanger take the
`highlight2` / `important` tokens instead of `sk_lilypad_green` / `sk_raspberry_red` (`Types:146-148`, `:167-169`,
`:189-191`, `:209-216`), so with design tokens f76ac0a their dark fills and the danger titles changed; the default
style's pressed alpha is `Modifiers.pressedOpacity` 0.75 (`Types:230`; June 0.8).

| style | element | normal | highlighted (pressed) | disabled (`inactive`) and `processing` |
|---|---|---|---|---|
| outlineDefault | fill | `primary.basePrimary` #FFFFFF / #1A1D21 | `baseTertiary.dynamicLighten(0.8)` → #FBFBFB / #1B1E22 | `primary.baseTertiary` #EAEAEA / #212428 |
| | border | `primary.outlineSecondary` #5E5D60 @45% / #797C81 @50% | same | clear |
| | title | `primary.contentPrimary` #1D1C1D / #F8F8F8 | same | `primary.contentSecondary` #454447 / #B9BABD |
| primary | fill | `highlight2.baseInverse` #007A5A / #177E56 | `darken(0.2)` → #006248 / #126545 | #EAEAEA / #212428 |
| | title | white #FFFFFF | same | #454447 / #B9BABD |
| danger | fill | `important.baseInverse` #E01E5A / #D3305D | `darken(0.2)` → #B31848 / #A9264A | #EAEAEA / #212428 |
| | title | #FFFFFF | same | #454447 / #B9BABD |
| outlinePrimary | fill / border / title | #FFFFFF / #1A1D21, border `highlight2.outline` #007A5A / #259B69, title `highlight2.content` #007A5A / #3DAA7C | fill #FBFBFB / #1B1E22 | fill #EAEAEA / #212428, no border, title #454447 / #B9BABD |
| outlineDanger | fill / border / title | #FFFFFF / #1A1D21, border `important.outline` #E01E5A / #D94C75, title `important.content` #C01343 / #DE678A | fill #FBFBFB / #1B1E22 | same as outlinePrimary |
| default(textColor) | title only, no fill | `textColor` (default #1D1C1D / #F8F8F8) | `textColor` @75% (`Modifiers.pressedOpacity`) | #454447 / #B9BABD |
| systemDefault | title only | `highlight1.content` #1264A3 / #2BA5CE | `dynamicLighten(0.5)` → #88B2D1 / #236178 | #454447 / #B9BABD |
| systemDanger | title only | `important.content` #C01343 / #DE678A | `dynamicLighten(0.5)` | #454447 / #B9BABD |
| custom(bg, title, border) | all three | as given | fill `bg.darken(0.2)` (clear stays clear) | the given bg and border; title #454447 / #B9BABD |
| quickAction(isSelected) | fill / border | unselected: #F8F8F8 / `surfacePrimary` #F8F8F8 @6%, border #F8F8F8 / #1A1D21 (`baseSecondary`). Selected: `highlight1.base` #E3F8FF / #001A2D for fill and border | `darken(0.2)`: unselected #C6C6C6 / #C6C6C6 @25%; selected #B6C6CC / #001524 | unchanged |
| | title | unselected #1D1C1D / #F8F8F8; selected `highlight1.content` #1264A3 / #2BA5CE | same | #454447 / #B9BABD |

- The disabled fill for outline, primary and danger is `baseTertiary` (`SKButton.swift:408-414`).
- Processing = disabled colors plus a spinner. The title and icon are hidden (`SKButton.swift:30-35`, `:298-300`). The
  spinner is `SKSpinner` size medium (18 pt), color `.darkOnLight`: a lagoon-40 arc #1CB6EB / #0A77A7 over a
  `surfacePrimary` track (`SKButton.swift:234-236`, `DC/Spinner/SKSpinner.swift:185-222`, `Colors.swift:1448`).
- Snapshot fill check: outline enabled measured #FFFFFF in light and #1A1D21 in dark. Disabled measured #EAEAEA in
  light.

**Icons.** Any `SKIconManifest` icon, tinted with the title color (or its `colorOverride`). Sizes are in the table
above. The tests use `.svgReminder` (`reminder.svg`), `.svgSlackLogo` and `.svgCheckCircleFilled`.

**Copy.** None built in.

**States & behavior.**
- Tap fires `buttonTapped` on touch-up-inside (`SKButton.swift:55`, `:238-240`).
- Pressed bounce: scale 0.96 (`Constants.bounceScale`, `:47`) using the shared bounce timing (down 0.2 s, up 0.4 s,
  no overshoot), on the whole button or only its content (`animationStyle`) (`:429-448`). There is **no** bounce for
  `default`, `systemDefault` or `systemDanger` (`Types:236-243`). In those styles only the title color changes.
- With a menu: tapping opens a native context menu if `isPrimaryAction`; otherwise it opens on long-press (`:320-327`,
  `:173-180`).
- VoiceOver: the label is the title, and a disabled button gets the `.notEnabled` trait. The Large Content Viewer
  shows it on long-press (`:57`).

**Gaps.** Liquid-glass variants (`isLiquidGlass: true`) change only fonts, paddings and radii as listed. Their glass
material is iOS-26-only and not specified further. No snapshots exist for the quickAction, workflow, recap or
messageActions sizes.

## SKIconButton

**Purpose.** A round icon button with an optional circular backdrop (the floating-action or "FAB" style) and an
optional caption below. It supports selected, disabled and processing states, a long-press menu or preview, and a
pulsing halo.

**Source.**
- `DC/IconButton/SKIconButton.swift`: `Constants` :25-30, state refresh :213-262, configure :297-383, sizing :404-420,
  PresentationObject :426-590, the inner `Circle` view :623-749.
- `DC/IconButton/SKIconButton+ObservableActions.swift`.
- Playground: `PG/DesignerComponents/IconButton/`. Tests: `TST/DesignerComponents/IconButton/SKIconButtonSnapshotTests.swift`
  (class `SKFloatingActionButtonSnapshotTests`).

**Snapshots** (`SNAP/SKFloatingActionButtonSnapshotTests/`). The tests use an `.svgAddReaction` icon in
`sk_lilypad_green` on a `sk_foreground_low_solid` circle.
- `testMediumButtonWithBackdropAndShadow@3x.png`: 56 pt gray circle, green icon, soft shadow.
- `testSmallButtonWithTitle@3x.png`: icon, no backdrop, "Add Reaction" caption below (Lato 17, contentSecondary).
- The processing tests (`testSmallButtonProcessing`, `testMediumButtonProcessing`) have no iOS_26 PNG.

Other variants: Accessory (20 pt) with backdrop / stroke / shadow / title / disabled, SmallButtonDisabled, and
ChangeIconWhenDisabled.

**API** (`SKIconButton.swift:426-590`)

| prop | type / values | default | cite |
|---|---|---|---|
| `icon`, `selectedIcon` | `SKIconManifest` (the selected icon defaults to `icon`) | required | :497-498, :575 |
| `iconColor`, `selectedIconColor` | UIColor | `primary.contentPrimary` #1D1C1D / #F8F8F8 | :499-500, :523-524 |
| `backdrop` | `.none` or `.circle(unselected: UIColor, selected: UIColor, withShadow: Bool, withStroke: Bool, withPulse: Pulse?)`, where `Pulse(color, repeatCount)` | `.none` | :452-465 |
| `size` | `small` 40×40, `medium` 56×56, `accessory` 20×20, `nativeMinimum` 44×44. The icon is always 20×20. | `.small` | :428-450 |
| `iconScaleFactor` | CGFloat: the icon is drawn at this scale about the center of its 20 pt box (`SKIcon.swift:93-99`). September 2026. | 1.0 | :504, :527 |
| `glassStyle` | `GlassStyle?`: `.clear` or `.regular`, the iOS 26 `UIGlassEffect` style of the glass circle (`SKF/Models/GlassStyle.swift:9-21`); the effect is now interactive. September 2026. | `.clear` | :513, :535, :252-258 |
| `accessibilityIdentifier` | String?, applied on configure | nil | :517, :299 |
| `title` | `Text?`, a caption under the circle | nil | :505 |
| `interactionState` | `enabled`, `disabled`, `processing` | `.enabled` | :491-495 |
| `isSelected` | Bool | false | :507 |
| `animateStateChanges` | Bool | true | :508 |
| `menuPresentationObject` | `SKMenu.PresentationObject?` | nil | :509 |
| `longPressInteractionMode` | `largerContent` (a menu opens on tap if one is set), `menu` (the menu opens on long-press), `preview(previewProvider)` | `.largerContent` | :479-489, :361-376 |
| actions | `buttonTapped`, `buttonTouchedDown(CGPoint)`, `buttonDragged(CGPoint)`, `buttonLongPressed(state, gesture)`, `menuShown`, `menuActionSelected` | | `SKIconButton+ObservableActions.swift:25-38` |

**Layout.**
- Frame = circle size. With a title, height = circle + 8 (`Constants.spacing`) + title height. The width stays the
  circle width, and the title is centered and can overflow it (`:408-416`, `:97-101`).
- The circle's corner radius is half its side (`:711-720`), and the icon is 20×20, centered (`:447-449`, `:718-719`).
- Shadow (`withShadow`): black at 10% opacity, offset (0, 6), radius 7 (`:649-660`).
- Stroke (`withStroke`): 1 pt `primary.outlineTertiary` #5E5D60 @13% / #797C81 @30% (`:663-672`).
- Pulse: a filled oval behind the circle that scales to 1.5× over 1 s, ease-in, autoreversing, `repeatCount` times
  (`:728-737`).

**Type.** Caption: `SKFont.body` → Lato Regular 17, `primary.contentSecondary` #454447 / #B9BABD by default
(`:26-27`, `:399-402`).

**Color by state** (`:213-262`)

| element | normal | highlighted, selected or long-pressed | disabled | processing |
|---|---|---|---|---|
| circle fill | `unselected` color (the Circle's own default is `baseTertiary` #EAEAEA / #212428, `:690`) | `selected` color | unselected color, whole view at alpha 0.35 | alpha 0.35; icon hidden; spinner shown |
| icon | `iconColor`, `icon` | `selectedIconColor`, `selectedIcon` | `iconColor` at alpha 0.35 | hidden |
| no backdrop | view alpha 1 | alpha **0.75** (no bounce) | alpha 0.35 | alpha 0.35 |

- Test colors: `sk_foreground_low_solid` #DDDDDD / #323538 unselected and `sk_foreground_min_solid` #F8F8F8 / #212428
  selected. The measured light fill was #DDDDDD. The icon was `sk_lilypad_green` #007A5A.
- The processing spinner is size medium (18 pt), `.lightOnDark`: stroke `gray_0` resolved light #F8F8F8, track at 20%
  (`:55-61`, `DC/Spinner/SKSpinner.swift:199-222`).

**States & behavior.**
- With a circle backdrop, highlighted, selected or long-pressed scales the button to **0.9** with bounce timing
  (`:29`, `:221-233`).
- Long-press fires `buttonLongPressed` (began or ended). The Large Content Viewer shows the icon (`:288-294`).
- The context-menu preview is clipped to the circle (`:189-209`).

**Icons.** Any `SKIconManifest`, 20 pt.

**Copy.** None.

**Gaps.** The iOS 26 glass capsule (`useGlassEffect`: `UIGlassEffect(style: glassStyle)`, `isInteractive = true`, tinted
with the backdrop color, `:252-258`) is system material and is not specified further; the clone draws `.clear` and
`.regular` the same.

## SKPillButton

**Purpose.** A capsule-shaped control with an optional emoji, a label, an optional leading or trailing icon and an
optional count badge. Used for filter pills, "Add reaction"-style chips and similar.

**Source.**
- `DC/PillButton/SKPillButton.swift`: `Constants` :18-23, layout :162-196, configure :206-225, sizing :310-348, state
  :350-387, PresentationObject :444-509.
- `DC/PillButton/PillButtonAnimationHelpers.swift`: badge in/out animation.
- Playground: `PG/DesignerComponents/PillButton/`. Tests: `TST/DesignerComponents/PillButton/SKPillButtonSnapshotTests.swift`
  (default fixture: "Add Reaction", `SKFont.body`, in `SKPillButton+HasDefaultSnapshotPresentationObject.swift:15-21`).

**Snapshots** (`SNAP/SKPillButtonSnapshotTests/`)
- `testMediumButtonWithOnlyText@3x.png`: 124 × 44.7 pt capsule.
- `testMediumButtonWithEverythingAndBadge@3x.png`: 🤷 emoji, label, trailing "#" icon, and a red "5" badge overlapping
  the top-right corner.
- `testSmallButtonWithTextAndOutline@3x.png`: 1 pt `sk_foreground_max_solid` outline.
- New in September: `testSmallButtonWithShortCaptionText@3x.png` and `testMediumButtonWithShortCaptionText@3x.png`:
  "Confirm" in `SKFont.caption`, 70 × 31.7 and 70 × 39.8 pt: no 20 pt minimum without an icon.

Other variants: small, medium and custom sizes with text, emoji, left or right icon, and combinations.

**API** (`SKPillButton.swift:444-509`)

| prop | type / values | default | cite |
|---|---|---|---|
| `text` | `SKLabel.PresentationObject?` (font and color come from it) | required param | :446 |
| `icon` | `SKIcon.PresentationObject?` | nil | :447 |
| `badge` | `SKBadge.PresentationObject?` | nil | :448 |
| `iconPosition` | `left`, `right` | `.left` | :25-27, :449 |
| `emoji` | `SKEmoji.PresentationObject?` (always first) | nil | :450 |
| `size` | `small` insets 8/12/8/12, `medium` 12/12/12/12, `custom(top, left, bottom, right)` | `.medium` | :500-507 |
| `unselectedColor` | fill | `primary.surfacePrimary` #1D1C1D @6% / #F8F8F8 @6% | :471 |
| `selectedColor` | fill when pressed or selected | `primary.surfaceSecondary` #1D1C1D @25% / #F8F8F8 @25% | :472 |
| `outlineColor` | 1 pt border | nil | :474, :416-424 |
| `menuPresentationObject` | a tap opens the menu | nil | :478, :219-221 |
| `isInteractive` | false disables touches | true | :479, :351 |
| `shouldAnimateTransition` | animate the bounce and icon show/hide | false | :480 |
| `glassStyle` | `GlassStyle` `.clear` / `.regular`: the iOS 26 glass effect's style (interactive since September) | `.clear` | :454, :473, :379-384 |
| `accessibilityIdentifier` | String? | nil | :462, :216 |
| actions | `buttonTapped`, `menuActionSelected`, `menuShown` | | `SKPillButton+ObservableActions.swift:16-20` |

**Layout.**
- Content is a horizontal stack in the order emoji, label, icon (or icon first for `.left`), 8 pt apart (`:19`,
  `:86-95`, `:134-136`), inside the size insets.
- Corner radius = height / 2 (`:162-167`). Minimum width = height, so a lone icon makes a circle (`:182`).
- Height = max(icon height, label height, emoji height) + top and bottom insets, where the icon height is 20 pt only
  when there is an icon (September 2026, `:341-345`; June always took at least 20). Width = content + insets
  (`:314-348`). The icon and emoji slots are 20 pt (`SKIcon.intrinsicSideLength`, `CC/Icon/SKIcon.swift:27`).
- Measured with a Lato 17 label: small 36.8 pt tall, medium 44.7 pt tall, and "Add Reaction" alone is 124 pt wide at
  both sizes.
- Badge: its top sits 5 pt below the pill's top, and its center sits 5 pt inside the trailing edge (`:22`, `:192-195`).

**Color by state** (`:350-387`)

| state | fill | other |
|---|---|---|
| normal | `unselectedColor` | alpha 1 |
| highlighted or selected | `selectedColor` | scale 0.9 with bounce timing, only when `shouldAnimateTransition` |
| disabled | `unselectedColor` | view alpha 0.35 |

**Icons.** Any `SKIcon`, 20 pt. The test uses `.hashLarge` in white.

**Copy.** None.

**States & behavior.**
- Badge appears with a bouncy spring (damping 0.7, 0.431 s) from scale 0.5 and alpha 0. It disappears the reverse way,
  then hides (`PillButtonAnimationHelpers.swift:15-52`, `SKPillButton.swift:253-275`).
- Icon show/hide: a bouncy/medium spring with alpha, and a −90° rotation when hiding (`:389-414`).

**Gaps.** The label's default color comes from SKLabel (see SKLabel). None of the pill tests set a selected state.

## SKSearchBarButton

**Purpose.** A tappable, search-field-looking button (for example "Search…" / "Jump to…") that opens search. It is an
`SKTextField` in `.button` mode with a magnifier ornament.

**Source.** `DC/SearchBarButton/SKSearchBarButton.swift`: view :22-75, PresentationObject :78-121, height :123-126.
Visuals come from SKTextField (see Text inputs).

**Snapshots.** `SNAP/SKSearchBarButtonSnapshotTests/testSearchBarButton@3x.png` and `testSearchBarButtonHighlight@3x.png`.
Their test class is `ComponentSnapshotTestCase<SKSearchBar>` (`TST/DesignerComponents/SearchBarButton/SKSearchBarButtonSnapshotTests.swift:14`),
so they render an **SKSearchBar** in button mode. See SKSearchBar.

**API** (`:105`)

| prop | default |
|---|---|
| `textAction` | nil |
| `shouldShowSearchOrnament` | true: `.svgSearch` in an `SKOrnamentBox` size small, tinted with the placeholder color (`:62-67`) |
| `placeholderText` | `R.strings.search_with_ellipsis` = "Search…" |
| `borderColor` | `primary.outlineTertiary` #5E5D60 @13% / #797C81 @30% |
| `clearButtonNormalColor` | `contentPrimary` @30% |
| `clearButtonHighlightColor` | `contentPrimary` @15% |
| `textFieldPlaceholderTextColor` | `primary.contentTertiary` #5E5D60 / #9A9B9E |
| `textFieldStandardTextColor` | `primary.contentPrimary` #1D1C1D / #F8F8F8 |
| `textFieldBackgroundColor` | `primary.basePrimary` #FFFFFF / #1A1D21 |
| `selectedBackgroundColor` | `primary.baseTertiary` #EAEAEA / #212428 |
| `shouldShowLoadingIndicator`, `shouldShowShadow` | false |
| action | `buttonTapped` |

**Copy.** VoiceOver label `R.strings.quick_switcher_jump_to_title` = "Jump to…", trait `.searchField` (`:33-36`).
Placeholder "Search…" (key `search_with_ellipsis`).

## ClearButton (helper)

**Purpose.** The ⓧ clear control inside text fields and search bars.

**Source.** `SKH/ClearButton/ClearButton.swift:15-103`. **Snapshots:** `SNAP/ClearButtonSnapshotTests/` (4 files,
including `testClearButtonHighlighted@3x.png`).

**Layout.** 20 × 20 pt: an `.svgCloseCircleFilled` icon (`close_circle_filled.svg`) pinned to the bounds (`:57`, `:95`,
`:100-102`).

**Color by state** (`:18-37`, `:88-96`)

| normal | highlighted or selected | disabled |
|---|---|---|
| `primary.contentSecondary` #454447 / #B9BABD | `primary.contentInverseSecondary` #CBCCCF / #B9BABD | `contentInverseSecondary` #CBCCCF / #B9BABD |

The owner can override all three.

**Copy.** VoiceOver label `R.strings.clear_button_accessibility_label` = "Clear text".

## SKBarButtonItem (developer component)

**Purpose.** A navigation-bar item: a title, icon, back chevron, spinner, Slackbot, avatar, separator, a system
action (Done / Close / Cancel / Save / Add / Edit), or (new in September 2026) the huddle button.

**Source.**
- `DevC/BarButtonItem/SKBarButtonItem.swift`: `Kind` :615-625, `SystemAction` :627-634, `Style` :636-647, `Padding`
  :649-672, `Position` :674-677, `Badge` :684-703, title build :90-213, icon padding :251-295, system actions :396-458.
- `SKBarButtonItemView.swift` (SwiftUI-ish variant): `Constants` :21-32 (September adds `avatarSlotSideLength` 44, the
  slot a workspace avatar sits in, and `circularCapsuleContentWidth` 24, which makes a lone avatar's glass capsule a
  44 pt circle).
- `SKBarButtonAvatarItem.swift`: `Constants` :24-28, padding :131-136.
- New in September: `SKHuddleBarButtonView.swift`, `SKHuddleBarButtonItemView.swift` (the `.huddle` kind),
  `SKToolbarItemAxisBehavior.swift` (`axisBehavior`, iOS 27.1+ only).

**Snapshots.** `SNAP/SKBarButtonItemTests/testAllTogether@3x.png` (393 × 54 pt, light only): a back chevron on the
left, and a spinner, a blue bold "Hello" and a person icon on the right. Others: `testBackButtons`, `testIconButtons`,
`testDisabledIconButtons`, `testBadgedIconButtons`, `testTitleButtons`, `testSpinnerButton*`,
`testSystem{Done,Close,Cancel,Save,Add,Edit}Button[GlassStyling]`. They are plain `SnapshotTestCase` renders in a
navigation bar (`TST/DeveloperComponents/BarButtonItem/SKBarButtonItemTests.swift`).
- **iOS 26 vs iOS 27.** The September iOS_26 PNGs draw the items **without glass** (bare glyphs and titles). The
  iOS_27 PNGs (`Modules/UIInfra/SlackKit/Snapshots/iOS_27/SlackKitTests.SKBarButtonItemTests/`, all 20 differ by
  7–48%) draw UIKit's Liquid Glass: the chevron in a 44 pt circle at x 0, the right-hand items grouped in one 44 pt
  capsule (x 226⅓–393 in `testAllTogether`, 0⅔–147⅓ for three icons in `testIconButtons`), the glass a flat
  #858585 with a light rim in the test host. `testSystemDoneButtonGlassStyling` and `…AddButtonGlassStyling` show an
  untinted and a tinted (prominent, #006ACE) 44 pt circle side by side; the spinner is drawn larger inside the capsule. These are
  the only SlackKit tests that render differently on iOS 27 (every other SlackKit iOS_27 PNG is within 0.9% of its
  iOS_26 twin). Production users on iOS 26 and 27 both get the glass; the clone's bars (`src/app/nav`) follow the
  iOS_27 look.

**Behavior and layout.**
- `.title(text, style)` renders an **SKButton size `.barButton`** (Lato Bold 17, 7 pt vertical padding, no horizontal
  padding) (`:185-210`). The styles map as follows (`:185-195`):
  - `default` → `systemDefault` (`highlight1.content` #1264A3 / #2BA5CE)
  - `destructive` → `systemDanger` (#E01E5A)
  - `dark` → `default()` (#1D1C1D / #F8F8F8)
  - `custom(textColor)` → `default(textColor:)`
  A disabled title uses `contentSecondary`.
- `.icon(icon, position, …, isEnabled, prominence)`: 20×20 icon (`:277`). Padding is 10 pt top and bottom; on iOS 26
  no side padding, so the icon stays centered in its glass pill (before iOS 26, 2 pt on the outer side) (`:258-269`),
  plus the custom insets. The icon is `primary.contentPrimary` when enabled and `primary.outlineSecondary` when
  disabled, unless a badge with `applyColorToIcon` supplies the color, or a `.prominent` item's icon color on iOS 26
  (`:279-288`). The badge is an 8 pt `SKDecoratedIcon` circle at the icon's top right, moved by `offset` (`:278`,
  `:680-705`).
- `prominence` (September 2026, `:643-647`): `.standard`, or `.prominent(backgroundColor, iconColor)`: on iOS 26 the
  item takes UIKit's `.prominent` bar-button style (the tinted liquid-glass capsule) tinted `backgroundColor`, e.g. the
  send button turning green once a message can be sent (`:322-334`).
- `.back`: `.svgCaretLeftFull` (`caret_left_full.svg`) (`:133-143`). `.slackbot`: `.svgSlackbotColor` at 25×25 (`:110-118`).
- `.avatar`: an SKMemberAvatar or SKWorkspaceAvatar in a 44 pt tall item with 36 pt of usable height. Padding =
  (36 − avatar side) / 2, and 12 pt on the left when a 22 pt status emoji follows (`SKBarButtonAvatarItem.swift:24-28`,
  `:139-167`). With `isEdgeToEdge` (September) the padding is (44 − side) / 2 and, on iOS 27, UIKit removes the item's
  content margins (`SKBarButtonAvatarItem.swift:131-136`; `SKBarButtonItem.swift:119-132`, `:464-484`).
- `.huddle(HuddlePresentationObject)` (September, `:148-150`, `:216-239`, `:488-558`): `active(title, backgroundColor,
  titleColor, …)` or `inactive(iconColor, backgroundColor, pulseColor, isCoachmarkShown, …)`, drawn by
  `SKHuddleBarButtonView`. While active, or inactive with the coachmark shown, it uses the `.prominent` glass capsule
  tinted `backgroundColor` on iOS 26.
- The item tint is `primary.contentPrimary` (`:48`).
- System actions without glass (`:403-418`): Done / Cancel / Save / Add / Edit render as `.title(style: .default)` with
  `R.strings.done` "Done", `cancel` "Cancel", `save` "Save", `add` "Add" and `edit` "Edit". Close renders the icon
  `.svgClose` with the label `R.strings.close` "Close".
- With iOS 26 glass styling they become SF Symbols: checkmark (prominent), xmark, plus (prominent), pencil. Save stays
  text (`:421-457`).

**Gaps.** The glass pill material and the grouping are UIKit's own. For the web, approximate them with a translucent
light-gray capsule (measured about #DDDDDD in the light snapshot).

---

# Selection controls and small indicators

## SKCheckbox

**Purpose.** A **circular** check control that toggles on tap. Used in multi-select lists and settings.

**Source.** `DC/Checkbox/SKCheckbox.swift`: `Constants` :23-36, `Style` colors :44-52, layout :128-149, PresentationObject
:189-207, animation :210-230, colors :254-269, touches :271-296, accessibility :342-399. Tests:
`TST/DesignerComponents/Checkbox/SKCheckboxSnapshotTests.swift`. (June's `SKCheckboxClearBackgroundSnapshotTests` and the
`skcheckboxClearBackground` flag are gone: the clear background is the only one.)

**Snapshots.**
- `SNAP/SKCheckboxSnapshotTests/testIsOnandEnabledCheckbox@3x.png`: a blue filled circle with a white check.
- `testIsOffandEnabledCheckbox`: a gray ring on a transparent background.
- `testIsOnandDisabledCheckbox`, `testIsOffandDisabledCheckbox`.

**API.** `isOn: Bool` (required), `isEnabled: Bool = true`, `accessibilityPresentationObject` (label). Action:
`toggled(Bool)` (`:189-207`, `:282`).

**Layout.**

| measure | value | cite |
|---|---|---|
| size | 21 × 21, fixed | :24, :151-169 |
| corner radius | half the side (a full circle, 10.5) | :38-40 |
| ring width | 1.5; 2.5 while the finger is down | :25-26, :147 |
| checkmark | `.svgCheckFilled` (`check_filled.svg`), 14 × 14, offset (−0.16, +0.24) from center, rotated −4° | :27-35, :131-134 |
| fill | a circle that grows from the center (zero size when off) to the full bounds when on; its radius scales with it | :137-144 |

**Color by state** (`:44-52`, `:254-269`)

| element | off, enabled | on, enabled | finger down (on or off) | off, disabled | on, disabled |
|---|---|---|---|---|---|
| inner background | clear (September 2026, `:100`; June `primary.basePrimary`) | same (covered by the fill) | same | same | same |
| ring | `primary.outlinePrimary` #7C7A7F / #797C81 | same | same, 2.5 pt | `outlineTertiary` with alpha replaced by 13%: #5E5D60 @13% / #797C81 @13% | same |
| fill | none | `highlight1.content` #1264A3 / #2BA5CE | `highlight1.baseInverse` @50%: #1264A3 @50% / #0A77A7 @50% | none | `primary.baseTertiary` #EAEAEA / #212428 |
| check | none | `primary.contentInversePrimary` #FFFFFF / #F8F8F8 | same | none | `primary.contentInverseSecondary` #CBCCCF / #B9BABD |

Measured: the on/enabled fill is #1264A3 in light and about #2BA5CE in dark. The disabled ring renders as #EAEAEA over
white.

**States & behavior.**
- Touch-down: light-impact haptic prep and the thicker ring. Touch-up-inside: haptic, then the checkbox flips itself
  and fires `toggled(isOn)` (`:277-283`).
- Animation: `UIView.animate` spring, 0.25 s, damping 1.0, velocity 0.5, curve ease-out (`:29-31`, `:210-230`).
  With Reduce Motion there is no animation.
- VoiceOver: traits `.toggleButton` (plus `.notEnabled` when disabled). Value `R.strings.accessibility_checkbox_value_checked`
  "checked" or `…_unchecked` "unchecked". Hint `R.strings.accessibility_hint_double_tap_to_toggle_setting` "Double tap
  to toggle setting" (`:348-384`).

## SKRadioButton

**Purpose.** A single-choice radio control. Tapping one that is already selected does nothing.

**Source.** `DC/RadioButton/SKRadioButton.swift`: `Constants` :20-29, `Style` :31-45, layout :119-140, colors :258-273,
touches :275-305. **Snapshots.** `SNAP/SKRadioButtonSnapshotTests/testIsOnAndEnabledRadioButton@3x.png`, plus
`testIsOffAndEnabled…`, `testIsOnAndDisabled…`, `testIsOffAndDisabled…`.

**API.** `isOn`, `isEnabled = true`. Action: `toggled(Bool)`.

**Layout.**

| measure | value | cite |
|---|---|---|
| size | 20 × 20, circle | :21, :122-124 |
| ring width | 2; 2.5 while the finger is down | :24-25, :125 |
| inner dot | inset 5 on each side (a 10 pt dot); inset 5.25 while the finger is down (9.5 pt). Collapses to the center when off. | :22-23, :127-139 |

**Color by state** (`:31-45`, `:258-273`)

| element | off, enabled | on, enabled | on, finger down | disabled (on or off) |
|---|---|---|---|---|
| background | `primary.basePrimary` #FFFFFF / #1A1D21 | same | same | `primary.baseTertiary` #EAEAEA / #212428 |
| ring | `primary.outlinePrimary` #7C7A7F / #797C81 | `highlight1.outline` #1264A3 / #2BA5CE | `sk_highlight_hover` #0B4C8C / #1D9BD1 | `primary.outlineTertiary` #5E5D60 @13% / #797C81 @30% |
| dot | none | `highlight1.content` #1264A3 / #2BA5CE | `sk_highlight_hover` #0B4C8C / #1D9BD1 | `outlineTertiary` (on only) |

**Behavior.** Light-impact haptic on touch-up. It only turns on (`guard !isOn`) and fires `toggled(true)` (`:275-284`).
Animation: spring, 0.25 s, damping 1, velocity 0.5, ease-out (`:26-28`, `:210-230`). VoiceOver value is
`R.strings.on` "On" or `R.strings.off` "Off" (`:358`).

## SKSwitch

**Purpose.** The on/off switch. **Since September 2026 it wraps a native `UISwitch`** (June's custom 51 × 31 switch with
a check mark is gone), so on iOS 26 it is the system switch tinted with Slack's green.

**Source.** `DC/Switch/SKSwitch.swift`: `Style` :21-24, the inner `UISwitch` :26-41, sizing :53-78, configure :82-96,
value changed :123-132, accessibility :138-260. `Modules/UIInfra/DesignTokens/Implementation/Modifiers.swift:19`
(`disabledOpacity`). **Snapshots** (`SNAP/SKSwitchSnapshotTests/`, a 2 × 2 grid: light / dark rows, normal / high
contrast columns; captured with `drawViewHierarchy` because `layer.render` misses the iOS 26 thumb,
`TST/DesignerComponents/Switch/SKSwitchSnapshotTests.swift`):
- `testIsOnandEnabledSwitch@3x.png`: green track, white thumb on the right.
- `testIsOffandEnabledSwitch@3x.png`: translucent gray track, white thumb on the left.
- `testIsOnandDisabledSwitch`, `testIsOffandDisabledSwitch`: the same at 35 % opacity.

**API.** `isOn = false`, `isEnabled = true`. Action: `toggled(Bool)`, fired from the `UISwitch`'s `.valueChanged` with
its new value: the switch flips itself, then reports (`:123-132`). Reconfiguring with a different `isOn` sets it
without animation (`:92-95`).

**Layout** (measured from the snapshots; the code takes `UISwitch().intrinsicContentSize`, `:53-74`)

| measure | value |
|---|---|
| view | 61 × 28 (the snapshot cell) |
| track | 63 × 28 capsule, from the view's left edge; it runs 2 pt past the view on the right (clipped in the snapshot grid) |
| thumb | 37 × 24 capsule, 2 pt from the track's top and ends: x = 2 off, x = 24 on; no shadow |
| corners | continuous (squircle-like) capsule ends on both |

**Color** (`:21-24`, `:36-38`; measured)

| element | on | off |
|---|---|---|
| track | `onTintColor` = `highlight2.content` #007A5A / #3DAA7C (high contrast #0C5340 / #63C29A) | UIKit's off track: #3C3C43 @30% / #EBEBF5 @30% (high contrast @70% / @55%) |
| thumb | `thumbTintColor` = `primary.contentInversePrimary`, but iOS 26 draws it #FFFFFF in both appearances | same |

Disabled keeps these colors and sets the whole view's alpha to `Modifiers.disabledOpacity` **0.35**; the inner switch
stays enabled (only its interaction is off) so UIKit doesn't gray it (`:85-91`).

**Behavior.**
- Tapping or dragging is UIKit's (the thumb slides; on iOS 26 it swells into a glass lens while held). The animation
  timing isn't in Slack's source.
- VoiceOver: the wrapper is the element, with the `UISwitch` traits ("switch button", "double tap to toggle") and the
  value "1" / "0", which VoiceOver speaks as On / Off; disabled adds `.notEnabled` (`:189-225`). The accessibility
  identifier is forwarded to the inner `UISwitch` for UI tests (`:144-147`).

## SKBadge

**Purpose.** A count badge (unread counts, "9+"), a text badge ("Last used", "PRO"), or a tag chip. It can include an
icon and a pulse.

**Source.** `DC/Badge/SKBadge.swift`: `Constants` :22-30, configure :133-166, sizing :177-206, corner radius :217-228,
pulse :261-271, PresentationObject :277-344, `Style` :345-413, `Shape` :415-437. **Snapshots**
(`SNAP/SKBadgeSnapshotTests/`):
- `testBadgeTripleDigitWithIcon@3x.png`: a red pill with a headphones icon and "9+". Count 222 exceeds the default max
  of 9.
- `testBadgeTextDefault@3x.png`: "Last used", a gray text badge.
- `testBadgeRoundedRectangleShape@3x.png`: "PRO" in white on aubergine, 5 pt radius.

Other families: single, double and triple digit (also with icon and deemphasized), less than / equal to / greater than
max, custom text attributes, pill shape, non-default background.

**API**

| prop | values | default | cite |
|---|---|---|---|
| `init(count:maxBadgeCount:icon:style:shape:typeIdentifier:isInteractionEnabled:)` | a count above `maxBadgeCount` displays `R.strings.badgeCountNumberPlus` ("%@+", so "9+" or "99+") | max 9; style `.emphasized()`; shape `.pill`; interaction false | :297-325, :26 |
| `init(title:icon:style:shape:)` | a free-text badge | style `.text()` | :327-341 |
| `style` | `emphasized(backgroundColor = important.baseInverse, textColor = primary.contentInversePrimary, withPulse: Pulse? = nil)`, `deemphasized` (clear background, `contentSecondary` text), `text(textColor = primary.contentSecondary, backgroundColor = primary.surfacePrimary)`, `tag(textColor = grass._70, backgroundColor = grass._5)` | | :345-413 |
| `shape` | `pill` (margins h 9, v 3; radius half the height), `roundedRectangle` (margins h 4, v 4; radius `min(20, 0.25 × height)`) | `.pill` | :415-437, :217-228 |
| `icon` | `SKIconManifest?`, tinted with the text color | nil | :286, :156-161 |
| action | `badgeTapped(typeIdentifier)`, only when `isInteractionEnabled` | | :257-259 |

**Layout** (`:177-206`)
- Height = max(font size, 12) + 2 × vertical margin. That gives **18 pt** for a pill (12 + 3 + 3), and 20 pt for a rounded
  rectangle. The tag style uses a 3 pt vertical margin and the label's height (`:25`, `:139`, `:191-200`).
- Width = text width + 2 × horizontal margin + (icon side + 4 if there is an icon). The width is at least 24 and at
  least the height (`:27`, `:194-201`).
- The icon is at least 12 × 12, 4 pt from the text (`:28-29`, `:49-57`). The text is one line, centered (`:168-171`).
- Measured widths: "2" is 25, "22" or "9+" is 32, "99+" is 39, and headphones + "9+" is 48.

**Type.** `SKFont.microBold` (Lato Bold 12, Dynamic Type capped at 18) for emphasized, text and tag. `SKFont.micro`
(Lato Regular 12, cap 18) for deemphasized (`:382-393`).

**Colors**

| style | background | text / icon |
|---|---|---|
| emphasized | `important.baseInverse` #E01E5A / #D3305D (June #B41541) | `primary.contentInversePrimary` #FFFFFF / #F8F8F8 |
| deemphasized | clear | `primary.contentSecondary` #454447 / #B9BABD |
| text | `primary.surfacePrimary` #1D1C1D @6% / #F8F8F8 @6% | `primary.contentSecondary` #454447 / #B9BABD |
| tag | `grass_5` #E5F5B8 / #213405 (`Colors.swift:1064`) | `grass_70` #50740E / #9DBE4B (`Colors.swift:1106`) |

Measured (September snapshots): emphasized is #E01E5A in light and #D3305D in dark.

**Behavior.** Pulse: a same-shape layer behind the badge scales from 1.0 to 1.5 over 1 s, ease-in, autoreversing,
`repeatCount` times (`:261-271`). Size is cached per Dynamic Type size (`:32-35`, `:179`).

## SKDot

**Purpose.** New in September 2026: a small filled circle used as a status indicator, most often an unread marker
(Home's simplified rows, AI history, `MKMessagePreview`'s `MKDotView`).

**Source.** `DC/Dot/SKDot.swift:11-145`. **Snapshots.** `SNAP/SKDotSnapshotTests/testDefaultColor@3x.png`,
`testCustomColor@3x.png` (16 × 16 cells).

- A **12 pt** circle (radius 6) centered in a **16 pt** view: 2 pt of padding all round, so the dot keeps its breathing
  room against neighbouring content (`:23-30`, `:48-65`). Statically sized at 16 × 16 (`:76-90`).
- Color: `SKDot.defaultColor` = `important.baseInverse` #E01E5A / #D3305D (`:21`), or any `color`.
- Decorative by default (hidden from VoiceOver); `init(color:accessibilityLabel:)` makes it its own element
  (`:100-145`).
- Also a list-row accessory, `SKListCellAccessory.dot` (see "SKList row accessories").

Web: `SKDot` (`src/slackkit/SKDot.tsx`), and `{ dot: {} }` in a row's accessories. Both snapshots match exactly (0.00%).

## SKColorSwatch

**Purpose.** A 20 pt color chip, for example in theme pickers. Translucent colors show over a checkerboard.

**Source.** `DC/ColorSwatch/SKColorSwatch.swift:16-221`. **Snapshots.** `SNAP/SKColorSwatchSnapshotTests/testOpaqueColorSwatch@3x.png`,
`testCircleColorSwatch@3x.png` and `testTransparentColorSwatch@3x.png` (checkerboard visible).

**API.** `color: UIColor?` (nil shows an empty swatch) and `style`: `roundedRect` (default) or `circle` (`:117-136`).

**Layout.**
- 20 × 20 (`:20`, `:47-50`).
- 1 pt border `primary.outlinePrimary` #7C7A7F / #797C81 (`:30-31`).
- roundedRect radius = `min(20, 0.25 × 20)` = 5, continuous curve. circle radius = 10 (`:68-78`).
- Checkerboard: 3 × 3 pt tiles, white #FFFFFF alternating with `sk_soft_gray` #DDDDDD (`:172-217`). It shows only when
  the color's alpha is below 1 (`:97-103`).

**Copy.** The VoiceOver label is the hex value (`:140-160`).

## SKSpinner

**Purpose.** The indeterminate loading spinner used across SlackKit: a ring track with a rotating arc.

**Source.** `DC/Spinner/SKSpinner.swift`: animation :51-81, layout :97-120, PresentationObject :172-225. **Snapshots**
(`SNAP/SKSpinnerSnapshotTests/`):
- `testDarkOnLightColor@3x.png`: 24 pt.
- `testSmallSize` 12, `testMediumSize` 18, `testExtraLargeSize` 46, `testJumboSize` 52.
- `testLightOnDarkColor`, `testMonochromeColor`, `testCustomColor`.

**API.** `size`: `small` 12, `medium` 18 (default), `large` 24, `extraLarge` 46, `jumbo` 52 (`:185-191`). `color`:
`lightOnDark`, `darkOnLight` (default), `monochrome`, `custom(strokeColor, baseCircleColor)`. `padding: UIEdgeInsets`.

**Layout.** A square of the size. Line width = side / 10, rounded to the pixel grid, for both the track and the arc.
The arc has a round cap and starts at 12 o'clock (`:97-120`).

**Colors** (`:193-224`)

| color | track | arc |
|---|---|---|
| darkOnLight | `primary.surfacePrimary` #1D1C1D @6% / #F8F8F8 @6% | `lagoon_40` #1CB6EB / #0A77A7 (`Colors.swift:1448`) |
| lightOnDark | `gray_0` resolved light (#F8F8F8) @20% | #F8F8F8 |
| monochrome | `surfacePrimary` | `primary.contentPrimary` #1D1C1D / #F8F8F8 |

**Animation** (`:51-81`). Rotation 2π every **1.25 s**, repeating forever, with timing `cubic-bezier(0.5, 0.35, 0.5, 0.35)`.
At the same time the arc length (`strokeEnd`) goes 0.30 → 0.25 over 0.625 s, ease-in-out, autoreversing.

**Copy.** VoiceOver label `R.strings.loading_ellipsis` = "Loading…" (`:37-38`).

## SKCircularProgressIndicator (developer component)

**Purpose.** A determinate ring that uses the spinner's sizes and colors. **Source.**
`DevC/CircularProgressIndicator/SKCircularProgressIndicator.swift:13-145`.

**API.** `size` and `color` are SKSpinner's enums (default medium, darkOnLight). `progress: Float` 0–1 sets the arc end
(`:98-103`, `:127-140`).

**Layout.** Line width = side / 10. The arc starts at 12 o'clock and runs clockwise with a round cap. There is no
animation (`:55-78`). No snapshots.

## SKProgressBar

**Purpose.** A linear, determinate progress bar (a `UIProgressView`).

**Source.** `DC/ProgressBar/SKProgressBar.swift:17-150`. **Snapshots** (`SNAP/SKProgressBarSnapshotTests/`):
`testHalfwayProgress@3x.png`, `testNoProgress`, `testFullProgress`, `testHalfwayProgressMediumSizeCustomColors` (red),
`testHalfwayProgressXLargeSizeRoundCorners`. All are full width.

**API** (`:80-139`): `progress: Float`, `animated = true`, `size`, `roundCorners = false`,
`progressTintColor = lagoon._40` #1CB6EB / #0A77A7, `trackTintColor = primary.baseTertiary` #EAEAEA / #212428.

**Sizes.** small is 2 pt tall (the default), medium 4, xLarge 12 with a 6 pt radius. The radius applies only when
`roundCorners` is on and only for xLarge (`:114-137`, `:47-60`). Note that every snapshot half measures 393 × 4 pt,
whatever the size, so UIKit's own bar height seems to win in the test harness. Build from the source values.

## SKLoadingBar

**Purpose.** An indeterminate thin bar (for example under a nav bar while content loads), with a green flash when it
finishes.

**Source.** `DC/LoadingBar/SKLoadingBar.swift`: animations :30-113, layout :160-184, configure :204-240,
PresentationObject :301-341. **Snapshots.** `SNAP/SKLoadingBarSnapshotTests/testLoadingAnimation@3x.png` and
`testLoadingCompleteAnimation@3x.png`.

**API.** `size`: `medium` 2 pt (default) or `large` 3 pt. `color`: `darkOnLight` (default) or `lightOnDark`. `state`:
`loading`, `loadingComplete`, `loadingCompleteOverride` (`:301-341`). It fills the available width.

**Colors.**
- darkOnLight: track `primary.baseTertiary` #EAEAEA / #212428, moving segment `lagoon_40` #1CB6EB / #0A77A7.
- lightOnDark: track #F8F8F8 @20%, segment #F8F8F8.
- Completion flash: `highlight2.baseInverse` #007A5A / #177E56 (`:138-139`, `:211-219`).

**Animation.**
- Loading loops every 1.1 s with `cubic-bezier(0.445, 0.05, 0.55, 0.95)`. The segment's end sweeps 0 → 1.01 over 1.1 s,
  and its start sweeps 0 → 1.05 starting at 0.22 s over 0.99 s, so a segment runs left to right. The segment has a
  round cap (`:30-76`, `:132`).
- Complete: the track and segment fade out over 0.3 s. The green layer fades in over 0.7 s, then out over 1.0 s, and
  everything hides (`:78-113`, `:264-285`).

## SKPageController

**Purpose.** A horizontally paged container of view controllers with an SKTabBar (top, bottom or hidden). Used for tabbed
screens such as search results and the Activity tabs.

**Source.** `DC/PageController/SKPageController.swift`: hairline :115-120, rounded corners :99 and :313-332, tab-bar
placement :334-348, PresentationObject :691-857. Also `PageCollectionViewCell.swift` and `SKPageControllerTabInstruction.swift`.
Playground: `PG/DesignerComponents/PageController/`.

**Snapshots.** `SNAP/SKPageControllerSnapshotTests/testFirstPage@3x.png` is full screen (393 × 852, light only, a plain
`SnapshotTestCase`). It shows four text tabs at the top ("FF0000_1" bold and selected, the others regular gray), a green
underline under the selected tab, and a red page. Others: `testSecondPage`, `testUpdatePresentationObject` (brown
underline), `testUpdatePresentationObjectTransparent`.

**API** (`:827-857`)

| prop | default |
|---|---|
| `pageIndex`, `pages: [Page(id, tab: SKTabBar.PresentationObject.Tab, content: .viewController / .lazyViewController)]` | required |
| `backgroundColor` | `primary.basePrimary` |
| `tabDisplayStyle` | `.underline()` (see SKTabBar) |
| `tabBarPosition` | `bottom`; also `top`, `hidden` |
| `tabBarWidthMode` | `.fitToBar` |
| `tabBarBackgroundColor` | `primary.basePrimary` |
| `tabBarContentInset` | `.zero` |
| `isScrollEnabled` | true |
| `addRoundedCornersToPageControllers` | false; when true the top corners get a 16 pt continuous radius (`:99`, `:318-325`) |
| `isAnimatedPageIndexTransition` | false |
| `accessoryItem` | a view between the tabs and the pages, or overlapping the pages |
| `shouldHideHairlineView` | false |
| `shouldAnimateTabBarTransition` | true |

**Layout.**
- A hairline (1 px) in `primary.outlineTertiary` #5E5D60 @13% / #797C81 @30% sits between the tab bar and the pages
  (`:115-120`, `:334-343`).
- The tabs appear only when there is more than one page (`:334`).
- Swiping pages moves the tab indicator continuously with the scroll (`:547-593`).

**Actions.** `tabTapped(Int)` and `settledOnPage(index:)` (`:686-689`).

## MultiSelectBadge (helper)

**Purpose.** The selection bubble on media thumbnails in multi-select (for example the photo picker).

**Source.** `SKH/MultiSelectBadge/MultiSelectBadge.swift:14-110`.

**States.**
- `unselected`: a 20 × 20 circle filled with `sk_black` @70% and a 2 pt white border, no label.
- `selected(position)`: a white circle with no border and the 1-based position number in `SKFont.smallBodyBold`
  (Lato Bold 15, capped at 14 pt) in `sk_black` #1D1C1D (`:19-29`, `:73-99`).

---

# Avatars and ornaments

## SKMemberAvatar

**Purpose.** A person's avatar: a rounded-square photo, initials, or an icon. It can carry a presence dot, a guest mark
(single- or multi-channel), an external-org (Slack Connect) workspace badge, or a small icon. Deactivated members render
in grayscale.

**Source.** `DC/MemberAvatar/SKMemberAvatar.swift`:
- geometry helpers :87-162
- layout per avatar type :244-361
- cut-out paths :363-483
- configure :487-596
- PresentationObject :622-668
- `AvatarType` :670-697, `Presence` :699-914, `Size` :916-1021
- action `tapped` :1025-1030

Initials: `SKH/Workspaces/WorkspaceAvatarTitleHelpers.swift:16-28`. Annotation placement on circles (new in September):
`DC/AvatarAnnotationGeometry.swift` (shared with SKWorkspaceAvatar). Playground: `PG/DesignerComponents/MemberAvatar/`.
Tests: `TST/DesignerComponents/MemberAvatar/SKMemberAvatarSnapshotTests.swift` (photo fixture "tim_cook"; default name
"Steve Jobs").

**Snapshots** (`SNAP/SKMemberAvatarSnapshotTests/`)
- `testExtraLargeMemberAvatarOnlinePresenceConfiguration@3x.png`: 56 pt photo with a green presence dot in a round
  cut-out at the bottom-right.
- `testExtraLargeMemberAvatarExternalWorkspaceConfiguration@3x.png`: the bottom-right corner holds a small rounded
  workspace image.
- `testMemberInitialsConfiguration@3x.png`: "SJ" on #EAEAEA / #212428.

Others: Small/Medium/Jumbo/Presentation member, LargeSingleChannelGuest (triangle), ExtraLargeMultiChannelGuest (square),
OfflineDnd, External Online/Offline/Dnd presence, Icon, SmallIconWithPresence, IconWithProfile, Slackbot icon and
avatar, Deactivated. New in September: `testSmallPlusMemberAvatar{Online,OfflineDnd,Slackbot}PresenceConcentricConfiguration`
(the unified navigation header's profile avatar) and `testExtraLargeMemberAvatarOnlinePresenceConcentricConfiguration`:
a circle with the presence on its edge.

**API** (`:656-668`)

| prop | values | default |
|---|---|---|
| `avatarSource` | `.image(ImageSource)`, `.icon(SKIconManifest)`, `.none` (shows initials) | required |
| `avatarType` | `member`, `memberWithPresence(Presence)`, `memberWithIcon(SKIcon.PresentationObject)`, `singleChannelGuest`, `multiChannelGuest`, `externalMember(workspace ImageSource)`, `externalMemberWithPresence(Presence)` | required |
| `size` | see the table below | required |
| `memberName` | String, used for initials and the VoiceOver label | required |
| `isInteractionEnabled` | Bool; when true it's a button that fires `tapped` | false |
| `shouldRoundCorners` | false gives square corners | true |
| `shouldMakeConcentric` | true gives a circle (radius = side / 2) | false |
| `fallbackBackgroundColor` | the initials' background | nil (the image placeholder shows through) |
| `isDeactivated` | grayscale image transformation (`:317`): `CIColorControls` saturation 0 (`Modules/UIInfra/ImageProcessing/Implementation/GrayscaleImageProcessor.swift:20-35`), which Core Image computes in linear light: Rec. 709 luminance of the linear values, lighter than a gamma-space grayscale (#BB1A20 → #5F5F5F, measured in `testDeactivatedMemberAvatarConfiguration`) | false |
| `previewAvatarImage`, `overrideAccessibilityLabel` | | nil |

**Sizes** (`:916-1021`). Corner radius = `min(20, 0.25 × side)` with a continuous curve (`:98-104`,
`CC/ImageView/SKImageView.swift:683`). `Size.cornerRadius` (`:953-976`) is declared but never used by this view.
Measured corners match the proportional values.

| size | side | radius | icon (for `.icon` source) | ornaments shown |
|---|---|---|---|---|
| tiny | 16 | 4 | 14 | no |
| verySmall | 20 | 5 | 18 | no |
| small | 24 | 6 | 20 | yes |
| smallPlus | 28 | 7 | 20 | yes |
| medium | 32 | 8 | 20 | yes |
| large | 36 | 9 | 20 | yes |
| extraLarge | 56 | 14 | 20 | yes |
| jumbo | 120 | 20 | 20 | yes |
| presentation | 150 | 20 | 20 | no |
| profile | 256 | 20 | 50 | no |

**Ornament geometry.** Every ornament is anchored at the bottom-right. When any ornament is shown, the bottom-right
corner is square and the other three are rounded (`:363-377`). The avatar is cut away around the ornament, so the page
shows through the gap.

**Concentric avatars with presence** (September 2026; `isCircular` `:92-96`, `cornersToMask` `:368-372`). Squaring a
circle's corner made a teardrop, so a `shouldMakeConcentric` avatar with `memberWithPresence` keeps all four corners
round. The status icon's box (1.4 × (10 + 0.1W), × 0.75 for Slackbot) and a cut-out circle of diameter 1.1 × (10 + 0.1W)
are both centered where the edge crosses the bottom-right 45° diagonal, (W/2 + W·√2/4, W/2 + W·√2/4), so half of each
hangs outside the avatar (`presenceIconFrame` `:135-147`, `presenceCutoutPath` `:415-422`;
`AvatarAnnotationGeometry.concentricAnnotationFrame` / `edgeCenter`). The cut-out is subtracted from the circle with a
boolean path operation, not appended reversed, so the part outside draws nothing (`carve(_:cutout:context:)`
`.extendsPastAvatar`, `:312`). Other annotation types still square the corner.

- **Presence** (`:119-147`, `:415-436`, `:259-265`):
  - Cut-out diameter = 1.1 × (10 + 0.1W), centered (10 + 0.1W)/3 outside the corner.
  - The status icon's box is 1.4 × (10 + 0.1W) (× 0.75 for Slackbot), positioned so the dot is concentric with the
    cut-out.
  - The SVG dot is 9/20 of the box (`status_member_filled.svg`: a circle of radius 4.5 in a 20-unit viewBox).
- **Single-channel guest:** a triangle cut-out with legs `6 + 0.05W`. The mark inside is a triangle with legs
  `cutout − gap`, where gap = `2 + 0.015W`, filled with `primary.contentTertiary` (`:115-117`, `:159-162`, `:381-389`,
  `:461-468`).
- **Multi-channel guest:** a square cut-out with side `6 + 0.05W` and a top-left radius of 0.33 × side. The mark inside
  is a square with side `cutout − gap`, same fill (`:391-395`, `:470-483`).
- **External member / member with icon:** a square with side `10 + 0.15W` at (W − side + gap), radius side / 4, and a
  1 px `primary.surfacePrimary` border. The cut-out has a rounded top-left (`:149-151`, `:293-305`, `:397-413`).
- **External with presence:** a square cut-out 0.75 × (10 + 0.1W) with a top-left radius of side / 3, plus the presence
  icon (`:438-457`).

Computed values:

| size | presence cut-out Ø | status icon box (x = y, side) → dot Ø | guest cut-out / gap | MCG mark side | external badge (x = y, side, radius) |
|---|---|---|---|---|---|
| small 24 | 13.64 | 12.59, 17.36 → 7.81 | 7.20 / 2.36 | 4.84 | 12.76, 13.60, 3.40 |
| smallPlus 28 | 14.08 | 16.22, 17.92 → 8.06 | 7.40 / 2.42 | 4.98 | 16.22, 14.20, 3.55 |
| medium 32 | 14.52 | 19.86, 18.48 → 8.32 | 7.60 / 2.48 | 5.12 | 19.68, 14.80, 3.70 |
| large 36 | 14.96 | 23.49, 19.04 → 8.57 | 7.80 / 2.54 | 5.26 | 23.14, 15.40, 3.85 |
| extraLarge 56 | 17.16 | 41.65, 21.84 → 9.83 | 8.80 / 2.84 | 5.96 | 40.44, 18.40, 4.60 |
| jumbo 120 | 24.20 | 99.76, 30.80 → 13.86 | 12.00 / 3.80 | 8.20 | 95.80, 28.00, 7.00 |

**Presence** (`:728-870`). `Presence(isActive:isDnd:isRestricted:isUltraRestricted:isExternal:isInvited:isSlackbot:isSlackSecurity:isChannelExpert:)`
maps a member to a case (`:742-779`). Invited → offline; Slackbot or Security → slackbot; channel expert → online.

| case | icon (svg) | color |
|---|---|---|
| online | `.svgStatusMemberFilled` (`status_member_filled.svg`, a solid dot) | active: `highlight2.content` #007A5A / #3DAA7C |
| offline | `.svgStatusMember` (`status_member.svg`, a ring) | away: `primary.contentTertiary` #5E5D60 / #9A9B9E |
| onlineDnd / offlineDnd | `status_member_dnd_filled.svg` / `status_member_dnd.svg` (dot plus "z") | active / away |
| onlineUra / offlineUra (+Dnd) | `status_single_channel_guest[_dnd][_filled].svg` (rounded triangle) | active / away |
| onlineExternal / offlineExternal (+Dnd) | `status_guest[_dnd][_filled].svg` (rounded square) | active / away |
| slackbot | `.svgHeartFilled` (`heart_filled.svg`) at scale 0.75 | active |

`Presence.Colors(active:away:)` overrides the colors. Other colors:
- The guest mark fill is a CGColor set at init (`:186`) and, since September, re-resolved on appearance changes
  (`:190-193`), so the dark row now shows #9A9B9E (June's dark half showed #5E5D60).
- The external badge border is `primary.surfacePrimary` @1 px.
- Icon-source avatars tint the icon `primary.contentPrimary` (`:576`).

**Initials** (`:580-594`). The first letter of each of the first two words, uppercased: "Steve Jobs" → "SJ". Set in
`SKFont.body` (Lato Regular 17) in `primary.contentPrimary`, centered. Behind it is the image view's placeholder,
`primary.baseTertiary` #EAEAEA / #212428 (`CC/ImageView/SKImageView.swift:82`), unless `fallbackBackgroundColor` is set.
The measured background was #EAEAEA / #212428.

**Copy.** The VoiceOver label is "<type label>: <R.strings.avatar>". Type labels: `R.strings.member`,
`single_channel_guest`, `multi_channel_guest`, `external_member`, plus the presence label from `R.strings.active` /
`away` / `do_not_disturb` (`:493`, `:679-696`, `:885-912`). Traits are `.button` only when interactive.

## SKWorkspaceAvatar

**Purpose.** A workspace icon: an image or its initials, with optional mention-count badge, unread dot, pending-auth
lock, "active" outline ring, and GovSlack variant mark. Used in the workspace switcher and in headers.

**Source.** `DC/WorkspaceAvatar/SKWorkspaceAvatar.swift`:
- views :40-93
- geometry :95-157 (September adds `circleAnnotationDiameter` :100-103 and `unreadsCutoutGap` :116-126)
- layout :239-318
- configure :321-441
- cut-outs :454-496
- PresentationObject :514-589
- `Size` :589-750

Snapshots: `SNAP/SKWorkspaceAvatarSnapshotTests/` (16). The test image (`acme` in `SlackKitTests.xcassets`) is a
sloth on yellow.

**Snapshots.**
- `testWorkspaceAvatarMentionCountExtraLarge@3x.png`: a red "9+" SKBadge overlapping the top-right, with the image cut
  away around it.
- `testWorkspaceAvatarActiveLarge@3x.png`: a 3 pt dark ring 6 pt outside the image.
- `testWorkspaceAvatarNoneImageSourceExtraLarge@3x.png`: "TW" initials.

Others: MentionCountMedium (dot) and Large, HasUnreads Jumbo/Small, PendingAuthentication Jumbo/XL/Medium, ActiveSmall,
GovVariantExtraLarge, NilUrl, Standard. New in September: `testWorkspaceAvatarHasUnreadsConcentricToolbarItem` and
`testWorkspaceAvatarHasUnreadsConcentricExtraLarge` (a circle with the unreads dot on its edge).

**API.**
- `workspaceName`, `workspaceImageSource`
- `workspaceType`: `standard`, `mentionCount(Int)`, `pendingAuthentication`, `hasUnreads(badgeColor: UIColor? = nil)`,
  `active`
- `size`: tiny 16, verySmall 20, small 24, smallPlus 28, medium 32, large 36, extraLarge 56, jumbo 120, and (September)
  `toolbarItem` 32: the unified navigation header's workspace switcher when its bar button is edge-to-edge
  (`Modules/Features/Handlers/PrimaryNavigationHeader/Implementation/PrimaryNavigationHeaderService.swift:653`; 12 pt
  smaller than the 44 pt slot, leaving a 6 pt ring of the glass container, `:614-620`). It takes `large`'s stroke and
  variant values and isn't `.medium` (a mention count draws the badge, not the dot)
- `workspaceVariant`: `default` or `govSlack`
- `shouldMakeConcentric` (`:514-589`)

**Layout.**
- Radius = `min(20, 0.25 × side)`, or a circle if concentric (`:145-151`). As in the member avatar, the declared
  `Size.cornerRadius` is unused.
- A 1 px `primary.outlineTertiary` hairline border improves contrast (`:40-46`). Since September the annotation's cut-out
  is subtracted with a boolean path operation and the border strokes that carved outline (`AvatarAnnotationGeometry.carve`
  `.avatarHasBorder`, `:312-316`): the hairline follows the gap's edge instead of crossing it.
- Annotations show only at `smallPlus` and larger (`:649-660`).
- **mentionCount:** an `SKBadge(count:)` (emphasized, max 9 → "9+") at x = maxX − 4/5 × badge width,
  y = minY − 1/5 × badge height. The image is cut away around it, outset by 2 × gap, where gap = W / 40 (`:112-128`,
  `:246-251`, `:454-459`). At `medium` it shows a dot instead, in `important.baseInverse` #E01E5A / #D3305D (`:399-404`).
- **hasUnreads:** a dot of 0.75 × (4 + W/5), top-right, shifted up and right by W/20. The cut-out has diameter
  (4 + W/5) + gap. Color `badgeColor ?? primary.contentPrimary` (`:97-134`, `:253-262`, `:424-425`, `:475-494`). At
  `toolbarItem` the gap is 2 × 2.5 − 0.25 × (4 + W/5), a 2.5 pt collar like the member avatar's presence beside it
  (`unreadsCutoutGap`, `:116-126`).
- **Concentric** (`shouldMakeConcentric`, September): the hasUnreads / mentionCount / pending corner is no longer squared
  (`:373-379`); the unreads dot and its cut-out circle are centered where the edge crosses the top-right 45° diagonal,
  half outside the circle (`:253-262`, `:475-482`; `AvatarAnnotationGeometry.concentricAnnotationFrame`).
- **pendingAuthentication:** `.svgLockFilled` (`lock_filled.svg`) in `primary.contentPrimary`. Width = 0.25W + 6,
  placed so its trailing edge sits 0.25 × its width outside the image and its top sits 0.3 × its height above it. The
  top-right corner is cut away with a notch 4 + W/5 across (`:75`, `:210-213`, `:461-473`).
- **active:** a ring in `primary.contentPrimary` #1D1C1D / #F8F8F8. Width 2 (medium), 3 (large, XL) or 4 (jumbo). It is
  offset outward by 2 × width, with radius = image radius + offset. Shown from medium up (`:307-311`, `:662-697`).
- **govSlack:** a `lagoon_90` tile (#1C405F / #AEDDEC, `Colors.swift:1478`) with a 2 pt `primary.basePrimary` border at
  the bottom-right. Tile side = W × ratio + 2, where ratio is 0.75 / 0.7 / 0.62 / 0.59 / 0.56 / 0.55 / 0.42 / 0.42 by
  size. Radius is 4 / 5 / 5 / 5 / 5 / 6 / 7 / 10. It contains the template asset `gov_slack_variant` tinted
  `basePrimary`, inset 4 / 5 / 6 (`:36-37`, `:56-71`, `:274-283`, `:699-750`).
- **Initials** (no image): `SKFont.title` (Lato Black 22) in `primary.contentPrimary`, on `primary.surfacePrimary`
  (`:346-347`). The rendered background measured #EAEAEA / #212428.

## SKAvatarPile

**Purpose.** A row of small avatars, overlapping or spaced, with an optional "+N" overflow tile. Used for member
previews, reactions and huddles. The public type is `SKAvatarPile`, an Auto Layout wrapper around `SKAvatarPileFrames`.

**Source.** `DC/AvatarPile/SKAvatarPile.swift`: layout :106-157, truncation :159-181, PresentationObject :200-252, overflow
tile :261-311. **Snapshots** (`SNAP/SKAvatarPileSnapshotTests/`):
- `testAvatarOverflow@3x.png`: two 28 pt photos overlapping, then a gray "+1" tile, 70 × 28 pt.
- `testMediumOverlappingAvatars@3x.png`: 80 × 32 pt.
- `testAvatarOverflowWithoutOverlap@3x.png`: 98 × 28 pt.

Others: MaxAvatars, OverflowWithHighCount, Medium/Large (spaced), LargeOverlapping, Single.

**API.**
- `avatars: [AvatarSource]` (`.image` or `.icon`)
- `maxAvatarCount = 5`
- `shouldOverlap`
- `size`: extraSmall 16, small 28 (default), medium 32, large 64
- `shouldShowOverflowCount = false`
- Alternative init `display: .avatars(sources)` or `.empty` (placeholder tiles) (`:200-252`)

**Layout.**
- Item i sits at x = i × (side ± side/4): overlapping uses −side/4, spaced uses +side/4. All items are squares of `side`
  (`:106-120`, `:207-209`).
- Radius = `0.25 × side` with no cap (`SKImageView` `.proportional` = 10/40 × side, `CC/ImageView/SKImageView.swift:85-93`,
  `:213-228`), giving 4 / 7 / 8 / 16.
- When overlapping, each avatar cuts a rounded-rect hole into the previous one, grown by side/8 horizontally and side/16
  vertically. This leaves a visible gap (`:130-155`).
- Overflow tile: "+N" (N = count − max), or `R.strings.ninety_nine_plus` "99+" when N > 99. Background
  `primary.baseTertiary` #EAEAEA / #212428, text `primary.contentTertiary` #5E5D60 / #9A9B9E. `SKFont.smallBodyBold`
  (Lato Bold 15), or `microBold` (Lato Bold 12) when N > 9, centered (`:261-301`).

## SKOrnamentBox

**Purpose.** A square or circular "tile" that holds one leading ornament for rows and chips: an icon, emoji, image,
slash-command glyph, badge, member avatar, spinner or placeholder. Other components use it everywhere (search icon,
entity leading icons, file-type tiles).

**Source.**
- `DC/OrnamentBox/SKOrnamentBox.swift`: sizing :110-131, style :279-292, configure :300-444, highlight :446-473,
  PresentationObject :507-671.
- `SKOrnamentBox+FileTypeExtension.swift`: file-type tiles.

**Snapshots** (`SNAP/SKOrnamentBoxSnapshotTests/`, 33)
- `testOrnamentBoxLargeWithRoundedRectangleShapeAndBackgroundStyle@3x.png`: 36 pt green rounded square with a 20 pt "#".
- `testOrnamentBoxWithRainbowBorder@3x.png`.
- `testOrnamentBoxWithBadge@3x.png`.

Others: Tiny through Jumbo with circle or rounded-rect and background, emoji S/M/L, slash command S/L/XL, spinner S/M,
LowAlpha, ColoredBorder, MemberAvatar; new in September `testOrnamentBoxGroupAvatarVerySmall` / `…Small` (the count "5"
in a gray square).

**API** (`:575-671`)

| prop | values | default |
|---|---|---|
| `ornament` | `icon(SKIcon.PresentationObject, highlighted:)`, `emoji`, `image(SKImageView.PresentationObject)`, `slashCommand(color = primary.contentPrimary, highlighted:)`, `badge(SKBadge.PresentationObject)`, `memberAvatar(name, avatarSource, avatarType)`, `groupAvatar(memberCount:)` (September 2026: an mpdm's count in SKGroupAvatar's count square, for the small sizes only, clipped to the box, `:395-413`, `:601-604`; VoiceOver `R.strings.member_count`), `spinner`, `placeholder` | required |
| `accessibilityIdentifier` | String? (September) | nil |
| `size` | tiny 16, verySmall 20, small 24, medium 32, large 36, extraLarge 56, jumbo 120 | required |
| `shape` | `roundedRectangle` (radius `min(20, 0.25 × side)`) or `circle` (side / 2) | `.roundedRectangle` |
| `style` | `Style(backgroundColor = primary.surfacePrimary, iconAlpha = 1, forceBackgroundStyle = false)` | |
| `border` | `none`, `rainbow` (the `rainbow_stories_border` image over the box), `color(UIColor)` (1 pt) | `.none` |
| `isInteractionEnabled` | tap fires `tapped` | false |

**Layout.**
- Frame = side × side. A badge ornament takes the badge's own size instead (`:110-131`).
- Content is centered (`:266-277`). Icons use SKIcon's intrinsic 20 pt.
- The slash command is a "/" in the slack-icons font at the box height (`:159-166`, `:353-356`).
- The corner curve is continuous (`:208`).

**Color.**
- Background: none at tiny, verySmall and small unless `forceBackgroundStyle`. From medium up it is
  `style.backgroundColor`, default `primary.surfacePrimary` #1D1C1D @6% / #F8F8F8 @6% (`:24-26`, `:279-292`).
- Highlighted: icon and slash-command ornaments switch to their `highlighted` variants (`:446-473`).
- File-type tiles use `.primaryColor(for: fileType)` as the background (`SKOrnamentBox+FileTypeExtension.swift:10-19`;
  see Attachments).

**Copy.** VoiceOver: the emoji name, `R.strings.image`, `R.strings.slash_command`, `R.strings.loading_ellipsis`
("Loading…"), and so on (`:543-562`).

## SKGroupAvatar (developer component)

**Purpose.** A group-DM avatar: two overlapping member photos, or a member count on small sizes.

**Source.** `DevC/GroupAvatar/SKGroupAvatar.swift:22-432`. **Snapshots.** `SNAP/SKGroupAvatarSnapshotTests/`
(Small, Large, ExtraLarge, ExtraLargeWithIcon).

**Layout.**
- Sizes: verySmall uses 16 pt images, small and large 24, extraLarge 36. The frame is the count square for verySmall
  (20 × 20 since September 2026, `countLabelSideLength` `:265-277`, matching 20 pt sibling ornaments such as the search
  bar's; June's verySmall frame was 12 × 12 around a 24 pt label) and small (24 × 24), and 1.5 × the image side for large
  and extraLarge (two images) (`:195-217`, `:254-278`). Since September the view reports that size as its intrinsic
  content size, so hosts lay it out square (`:67-100`).
- Radius = `min(20, 0.25 × image side)` (`:280-282`).
- Two images, top-left and bottom-right. The bottom-right one is cut away with a gap of `2 + 0.015 × side` (`:343-424`).
- Count label: `SKFont.captionBold` (Lato Bold 13, max 18) in `primary.contentPrimary`, in the count square
  (`:22-26`, `:139`, `:149`).
- The small-size background is `primary.baseTertiary`. When highlighted it is `basePrimary` @13% and the text is
  `sk_inverted_foreground` (`:131`, `:302-319`).

## SKHuddleFacePile (developer component)

**Purpose.** The huddle participant strip: overlapping circular faces plus a headphones count badge or a custom icon.

**Source.** `DevC/HuddleFacePile/SKHuddleFacePile.swift:21-447`. **Snapshots.**
`SNAP/SKHuddleFacePileSnapshotTests/testFacePileWithHuddleBadge@3x.png` shows a blue "🎧 12" badge followed by 3
overlapping circles. Others: Single, Multiple, SmallSize, WithIcon, DarkStyle, and `…WithClearBorder`.

**Layout.**
- Face size: small 18, medium 24 (default). Overlap 5 / 8. Up to 5 faces. Faces are circles (radius = height / 2)
  (`:84-90`, `:222-225`, `:249`, `:391-412`).
- Border 1 pt: `default` = `primary.basePrimary` #FFFFFF / #1A1D21, `dark` = `sk_dark_gray` #616061, `clear` = none
  (`:414-439`).
- Badge: an `SKBadge(count, maxBadgeCount: 99, icon: .svgHeadphones, style: .emphasized(backgroundColor: color))`, first
  in the row (`:253-259`).
- Custom badge: an `SKOrnamentBox` size medium (32) on `primary.baseTertiary` (`:261-269`).
- Width = badge + faces − (items − 1) × overlap (`:151-177`); since September 2026 the overlap count is clamped at 0,
  so an empty pile is not one overlap too narrow (`:169-172`).
- Behind the `huddleFacePilePerf` flag (September 2026) the face views are created on demand for the sources given
  rather than five up front; nothing changes visually (`:25-60`, `:206-208`).

## SKDecoratedIcon (developer component)

**Purpose.** An icon drawn with a small badge: a colored dot or a 14 pt secondary icon. Used for bar-button badges.

**Source.** `DevC/DecoratedIcon/SKDecoratedIcon.swift:20-257`. **Snapshots.** `SNAP/SKDecoratedIconTests/testCircleBadge@3x.png`,
`testIconBadge@3x.png`, `testIconBadgeWithBackground@3x.png`.

**Layout.**
- `circle(color, offset)`: diameter = min(w, h) / 2.5, centered on the top-right corner plus `offset`. The icon is
  cleared in a ring 1/4 of the badge's size around it (`:124-133`, `:190-193`).
- `icon(icon, iconColorOverride, backgroundColor, padding)`: a 14 × 14 icon at the top-right. Optional background with
  a 2 pt radius and a 2 pt cut-out padding (`:134-140`, `:217-229`, `:253-257`).
- The icon color defaults to `primary.contentPrimary` (`:75`).

## AttachmentOrnament (helper)

**Purpose.** The 36 × 36 leading tile on attachment rows and cells: loading, image, video, file type, audio, icon or
error. **Source.** `SKH/AttachmentOrnament/AttachmentOrnament.swift:24-179`.

**States.**
- `file(type, invertOrnamentColors)`: the file-type icon (filled, or unfilled when inverted) on `.primaryColor(for: type)`,
  or on `primary.baseSecondary` when inverted.
- `audio`: on `sk_sky_blue` #1D9BD1.
- `video`: the image plus a `VideoDurationBadge` size small and a `.svgPlayFilled` in `primary.basePrimary`.
- `error(icon)`: a clear background.
- Rendered through an `SKOrnamentBox` size large (36) (`:94-137`, `:149-164`).

---

# Feedback, empty and loading states

## SKBanner

**Purpose.** An inline alert or notice card with a tone, a leading ornament, an optional heading, body text, trailing
accessories and an optional action button. Used for info, success, warning and error notices, trials and pro promos, and
coachmarks.

**Source.**
- `DC/Banner/SKBanner.swift`: control wrapper, `DisplayType` :108-165, `Tone` :167-370, `Ornament` :372-388,
  `BackgroundStyle` :390-395, PresentationObject :397-440.
- `DC/Banner/Banner.swift`: view, `Constants` :41-47, configure :153-265, text :298-372, outline :374-390, height
  :394-433, highlight :436-440.
- `DC/Banner/SKBanner+ObservableActions.swift`.

Playground: `PG/DesignerComponents/Banner/`.

**Snapshots** (`SNAP/SKBannerSnapshotTests/`, 36)
- `testBannerRegularGenericWithHeading@3x.png`: gray card with a Slack-logo ornament, bold heading "Your alert heading"
  and body "All of the alert text goes here.", 1 pt gray outline.
- `testBannerSmallWarning@3x.png`: yellow small banner with a warning icon.
- `testBannerActionButton@3x.png`.

Others: Regular/Small × Generic/Info/Success/Warning/Error/Trials/Trials_New, Coachmark, Custom, Pro tone with heading,
emoji ornament with or without a background circle, badge ornaments (pill and rounded rect), hidden icon, text wrap,
outline, accessory, HighlightedStyle and HighlightedStyleNotSelectable.

**API** (`SKBanner.swift:397-440`)

| prop | values | default |
|---|---|---|
| `type` | `regular`, `small` | required |
| `tone` | `genericLight`, `genericDark`, `info`, `success`, `warning`, `error`, `trials`, `trials_new`, `business_trial`, `pro`, `coachmark`, `custom(CustomToneProperties(backgroundColor, textColor, ornamentColor, outlineColor))` | required |
| `text` | `Text` (body) | required |
| `heading` | `String?` or `Text` (**regular only**; hidden for small, `Banner.swift:173-182`) | nil |
| `ornament` | `default` (the tone's icon), `hidden`, `icon(icon, color?, backgroundCircle?)`, `emoji(unicode, backgroundCircle?)`, `image(ImageSource)`, `badge(text, textColor?, backgroundColor?, shape = .pill)` | `.default` |
| `accessories` | `[SKListCellAccessory]` (trailing; see List accessories) | [] |
| `actionButton` | `SKButton.PresentationObject?`, shown below the text | nil |
| `backgroundStyle` | `opaque` (the tone's *base*) or `transparent` (the tone's *surface*) | `.opaque` |
| `isSelectable` | the whole banner is tappable (`selected` action) | false |
| actions | `selected`, `actionButtonTapped`, `textLabelActions` (links) | |

**Layout** (`SKBanner.swift:112-165`, `Banner.swift:41-47`)

| measure | regular | small |
|---|---|---|
| horizontal / vertical padding | 16 / 12 | 12 / 8 |
| ornament → text gap | 12 | 8 |
| ornament | `SKOrnamentBox` verySmall 20 pt | tiny 16 pt |
| corner radius | 12 | 10 |
| body font | `SKFont.body` Lato Regular 17 | `SKFont.caption` Lato Regular 13 |
| heading | `SKFont.bodyBold` Lato Bold 17, 4 pt above the body | not shown |
| action button | 12 pt below the text | same |

- `Constants.cornerRadius` = 8 (`Banner.swift:42`) is overridden by `type.cornerRadius` (`:166`).
- Width fills the container. Height = text + padding (`Banner.swift:394-433`).
- Outline: 1 pt `tone.outlineColor`, or none if the tone has no light outline in light mode (`Banner.swift:374-390`).

**Colors per tone** (`SKBanner.swift:208-315`)

| tone | background (opaque) | background (transparent) | text | ornament | outline |
|---|---|---|---|---|---|
| genericLight | `primary.baseTertiary` #EAEAEA / #212428 | same | `primary.contentPrimary` #1D1C1D / #F8F8F8 | `primary.contentSecondary` #454447 / #B9BABD | `outlineSecondary` #5E5D60 @45% / #797C81 @50% |
| genericDark | `baseInversePrimary` #1D1C1D / #212428 | same | `contentInversePrimary` #FFFFFF / #F8F8F8 | `contentInverseSecondary` #CBCCCF / #B9BABD | `outlineSecondary` |
| info | `highlight1.base` #E3F8FF / #001A2D | `highlight1.surface` #36C5F0 @13% / #036696 @25% | `contentPrimary` | `highlight1.content` #1264A3 / #2BA5CE | `highlight1.outlineSecondary` #0E9DD3 @20% / #307EC0 @20% |
| success | `highlight2.base` #E3FFF3 / #05241B | `highlight2.surface` | `contentPrimary` | `highlight2.content` #007A5A / #3DAA7C | `highlight2.outlineSecondary` |
| warning | `highlight3.base` #FFFAE0 / #2F1E00 | `highlight3.surface` | `contentPrimary` | `highlight3.content` #6B5000 / #DEA700 | `highlight3.outlineSecondary` |
| error | `important.base` #FFE8EF / #300005 | `important.surface` | `contentPrimary` | `important.content` #C01343 / #DE678A | `important.outlineSecondary` |
| trials | `primary.containerSecondary` #F8F8F8 / #212428 | same | `trials_banner_text` (`sk_aubergine` #4A154B / `sk_foreground_max`) | `trials_banner_text` | dark mode only: `outlineSecondary` |
| trials_new | `horchata_0` #F4EDE4 / #2A1707 | same | `contentPrimary` | `contentSecondary` | `outlineTertiary` |
| business_trial | `aubergine_0` #F9EDFF / #200221 | same | `contentPrimary` | aubergine theme `contentSecondary` = `aubergine_100` @80% #39063A @80% / `aubergine_90` @90% #E3CEEB @90% | `outlineTertiary` |
| pro | rgba(175, 75, 245, 0.10) | same | `contentPrimary` | aubergine theme `contentSecondary` | `outlineTertiary` |
| coachmark | `coachmark_banner_background` #1264A3 / #17344C (`Legacy:352`) | same | `contentInversePrimary` | `contentInversePrimary` | dark mode only: `outlineSecondary` |

Palette sources: `Colors.swift:1922` (horchata_0), `:1634` (aubergine_0), `:1694-1705` (aubergine_90/100); the theme
formula is in `Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift:159-162`.

**Icons** (the tone's default ornament, `SKBanner.swift:317-342`):
- genericLight, genericDark, coachmark → `.svgSlackLogo`
- info → `.svgInfoFilled` (`info_filled.svg`)
- success → `.svgCheckCircleFilled`
- warning and error → `.svgWarningFilled`
- trials and custom → `.svgSparklesFilled`
- business_trial and pro → `.svgRocket`

All are tinted with the tone's ornament color. An icon with `backgroundCircle` becomes an SKOrnamentBox circle filled
with `backgroundCircle.color ?? ornamentColor` (`Banner.swift:315-346`).

**States & behavior.** Highlighted (pressed) sets the whole banner to alpha **0.6** (`Banner.swift:45`, `:436-440`),
only when selectable. The body text supports link taps.

**Copy.** VoiceOver prefixes come from `R.strings.banner`, `information_banner`, `success_banner`, `warning_banner`,
`error_banner`, `trials_banner`, `a11y_business_trials_banner`, `a11y_pro_banner` and `coachmark_banner`. Actions use
`R.strings.tap_button` / `tap_banner` (`SKBanner.swift:345-368`, `Banner.swift:271-286`).

## SKToast

**Purpose.** A transient, centered HUD ("Copied", "Saved") with an optional image or activity indicator above the
message. It shows in its own window and auto-dismisses.

**Source.** `DC/Toast/SKToast.swift`: PresentationObject :51-94, show and hide :212-244, layout :252-343, `Consts`
:382-408. No snapshots.

**API.**
- `message: String?`
- `contentStyle`: `messageOnly`, `image(UIImage)`, `icon(SKIconManifest, size = 30 × 30, color = white)` (September 2026:
  an SKIcon, `defaultIconSize` `:30`, `:79`, `:118-121`), `activityIndicator(UIView)`. The presentation types are
  `Equatable` since September.
- `maxWidth` (default 260)
- `presentation`: `.presented(.automatic(after: 0.55))` (default delay), `.presented(.manual)` or `.dismissed`
- `verticalOffset` (default: vertically centered)
- `orientationMask`

**Layout** (`:382-408`, `:323-343`)
- Padding 20 on all sides. An image sits 10 above the message. The corner radius is 16.
- The message wraps (no line limit) inside max width − 40, and max height 320.
- Width = max(content) + 40. The toast becomes a square if it is taller than wide. Everything is centered.
- The activity view is 100 × 100.

**Type and color.**
- Message: `UIFont.body` (Lato Regular 17), white #FFFFFF, centered, truncating the tail. Text shadow
  `primary.contentPrimary` @33%, offset (0, 1) (`:281-290`).
- Background: `sk_toast_background` = #141414 @70% (light) / @90% (dark) (`Legacy:269-271`).
- Shadow: `primary.contentPrimary`, opacity 0.1, radius 7, offset (4, 4) (`:258-265`, `:400-403`).

**Behavior.** Appears from scale 0.9 and alpha 0 to scale 1 and alpha 1 with the snappy/medium spring (≈0.368 s). After
the delay (0.55 s default) it animates back to 0.9 / alpha 0 and is removed. The message is announced to VoiceOver 0.5 s
after it appears (`:212-244`). It doesn't take touches.

## SKEmptyState

**Purpose.** A centered empty or error screen: illustration, emoji or icon, then title, optional tag ("adjacent text"),
body, and up to a few buttons.

**Source.** `DC/EmptyState/SKEmptyState.swift`: `Constants` :35-52, stack :140-184, keyboard :329-341, buttons
:343-407, auto-hide decoration :412-452, PresentationObject :472-617, height :619-678. Also
`SKEmptyState+GenericErrorEmptyState.swift`. Playground: `PG/DesignerComponents/EmptyState/`.

**Snapshots** (`SNAP/SKEmptyStateSnapshotTests/`, 16, full width 393)
- `testEmptyStateFull@3x.png`: a 120 pt illustration, "Great title", a two-line body and an outlined "Primary action"
  button, centered on white / #1A1D21.
- `testEmptyStateAdjacentText@3x.png`.
- `testEmptyStateBodyAndTwoButtons@3x.png`.

Others: Icon, ImageAndBody, ImageAndButton, ImageAndTitle, TitleAndBody, TitleAndButton, TransparentBackground,
TruncatedBody, and Only{Body, Button, Image, Title}.

**API.** `Properties(content: .image(SKImageView.PO) | .emoji | .icon | nil, title: String/Text?, adjacentText: SKGenericEntity.AdjacentText?, body: String/Text?, bodyMaximumFontSize: CGFloat?, buttons: [ButtonContent(title, style = .outlineDefault, state = .enabled, icon)], backgroundColor = primary.basePrimary)`
(`:472-617`). Actions: each button's `action`, plus `labelActions` for links.

**Layout** (`:35-52`, `:140-184`)
- Edge margins: 16 top and bottom, 32 left and right. The content is a vertical stack, centered vertically and
  horizontally.
- Content sizes: image 120 × 120, emoji 48 × 48, icon 48 × 48. There are **16** pt after the image, emoji or icon, 8 pt
  between title, tag and body, and 16 pt after the body before the buttons.
- Buttons are `SKButton` size **medium** in a horizontal row with 8 pt spacing (`:343-407`). They switch to a vertical,
  full-width stack at Dynamic Type sizes ≥ `.accessibilityMedium` (`:454-466`).
- The image, emoji or icon is hidden automatically when the view is too short to fit everything (`:412-452`).
- When the keyboard appears (September 2026, `:329-393`): the stack moves up by half of the height the keyboard actually
  covers (zero when the view sits above the keyboard), through its transform. If the content then doesn't fit, only the
  decoration (image, emoji or icon) shrinks, by the overflow, to `Constants.minimumDecorationScale` 0.5 at most; text
  and buttons keep their size (`:51`, `keyboardAvoidance()` `:346-375`, `applyKeyboardAvoidance` `:380-393`). It
  animates over half the keyboard's duration, ease-out. (June shifted by half the keyboard height and scaled the whole
  stack to 0.75.) New snapshots show it: `testEmptyStateImageTitleBodyWithKeyboardUp`,
  `…ScalesDownWhenKeyboardObscuresContent`, `…RecentersAfterContainerResizeWithKeyboardUp`,
  `testEmptyStateTallContentScalesAndCentersAfterContainerResizeWithKeyboardUp`.

**Type.**
- Title: `SKFont.title` (Lato Black 22), `primary.contentPrimary`, centered (`:42-43`, `:596`).
- Body: `SKFont.body` (Lato Regular 17, optional max size), `primary.contentSecondary` #454447 / #B9BABD, centered
  (`:44-45`, `:602-606`).
- Adjacent tag: `SKFont.microBold`, insets 2/4/2/4, radius 4, with the colors given by `AdjacentText` (`:46-48`,
  `:72`, `:225`, `:276`).

**Preset:** generic error (`SKEmptyState+GenericErrorEmptyState.swift:13-20`)
- image `generic_error_empty_state`
- title `R.strings.something_went_wrong_title` "Something Went Wrong"
- body `R.strings.generic_error_empty_state_body` "Try again in a few minutes."
- button `R.strings.retry` "Retry" (outlineDefault)

**Illustrations** in `Modules/UIInfra/SlackKit/ResourceBundle/SlackKit.xcassets/` (light, plus `_dark` where one exists):
activity, dms, home, later_archived, later_completed, later_in_progress (all with `_dark`), drafts, scheduled, sent, scw,
generic_error, emoji_no_results, magnifying_glass (with `_dark`), search_canvas / search_files / search_workflows icons
(with `_dark`), bell_image_for_notifications_banner, slackbot.

## SKLoadingEntity (skeleton row)

**Purpose.** A shimmering placeholder list row: an optional square ornament and pill-shaped text bars, or button
placeholders.

**Source.** `DC/Entities/LoadingEntity/SKLoadingEntity.swift` (`Constants` :22-23, sizes :215-265), with the shapes in
`SKH/LoadingViews/SKLoadingPathHelper.swift:15-262`. **Snapshots** (`SNAP/SKLoadingEntitySnapshotTests/`):
- `testImageMaskTransparencyMedium@3x.png`: 393 × 56. The dark half shows a 36 pt rounded square, a long bar and a
  shorter bar.
- Others: `testButtonMaskSmall` (44), `testNoImageMaskSmall`, `testInverted`, `testBackgroundColorOverride`,
  `testCustomMaskSmall`.

**Geometry** (`SKLoadingPathHelper.swift:15-22`, `SKLoadingEntity.swift:22-23`, `:215-265`)

| part | value |
|---|---|
| row margins | 10 top and bottom, 16 left and right |
| ornament | small 24 or medium 36 pt square, radius `min(20, 0.25 × side)` = 6 / 9 |
| ornament → text gap | 12 |
| primary bar | 12 tall, fully rounded (radius 6), width 75% of the space after the ornament (50% if `hasWideSecondaryText`) |
| secondary bar(s) | 10 tall, radius 5, 50% width (100% if wide), 6 pt below. Medium only. More bars are added to fill `targetContentHeight`. |
| row height | small 44, medium 56 |
| button mask | N equal pills with 12 pt gaps and the size's height and radius |

## SKLoadingHeader

**Purpose.** A skeleton section header or button strip above loading rows. **Source.** `DC/LoadingHeader/SKLoadingHeader.swift`:
margins 16 on all sides (`:21`), sizes (`:157-197`): small (ornament 24, height 24, radius 4, no secondary bar) and
medium (36, 36, 6, secondary bar). **Snapshots.** `SNAP/SKLoadingHeaderSnapshotTests/` (small 56 pt, medium 68 pt).
Entity types: `button(count)` or `generic(hasOrnament, targetContentHeight, hasWideSecondaryText)`.

## SKLoadingState and SKWrappedLoadingView (shimmer screens)

**Purpose.** Full-screen and embedded skeleton lists: an optional SKLoadingHeader plus repeated SKLoadingEntity rows,
laid out as a list or as sections separated by dividers. A shimmer sweeps across the whole thing.

**Source.** `DC/LoadingState/SKLoadingState.swift` (fills the remaining height, `:24-27`; list or `sections(cellsPerSection)`,
`:166-171`), `SKWrappedLoadingView.swift` (fixed `.list(cellCount:)` or `.sections(cellsPerSection:, sectionCount:)`,
`:94-99`), `LoadingStateSharedModels.swift`, `Views/LoadingStateView.swift`, `Views/SKLoadingShimmerView.swift`.
**Snapshots.** `SNAP/SKLoadingStateSnapshotTests/testNoImageMaskListMedium@3x.png` (full screen),
`SNAP/SKWrappedLoadingViewSnapshotTests/testImageMaskSectionsSmall@3x.png` (sections with dividers), and 9 more.

**Fill styles** (`LoadingStateSharedModels.swift:33-36`, `:70-80`)
- `shimmering(backgroundColor = primary.basePrimary)` (default): the rows are opaque background with the placeholder
  shapes cut out as holes, and the shimmer layer shows through the holes.
- `solid(backgroundColor, placeholderColor)`: the shapes are filled flat, with no shimmer.
- Section dividers use `primary.baseTertiary` (`:28-30`). Between sections there is an SKListFooterView with a hairline.

**Shimmer** (`Views/SKLoadingShimmerView.swift:16-112`). A `CAGradientLayer` with colors [`surfacePrimary`,
`surfaceSecondary`, `surfacePrimary`] = [#1D1C1D @6%, #1D1C1D @25%, #1D1C1D @6%] light and [#F8F8F8 @6%, @25%, @6%]
dark. The band is as wide as the view and tilted: start point (−1, 0.2) → end point (0, 0.5), animated to start (1, 0.5)
→ end (2, 0.8). One sweep takes **1.8 s**, ease-in-out, repeating forever (`:19-27`, `:77-107`).

Web equivalent: `linear-gradient(~105deg, a 0%, b 50%, a 100%)` with `background-size: 200%`, animating
`background-position` over 1.8 s ease-in-out infinite.

## SKAlertController

**Purpose.** A thin wrapper over the system `UIAlertController`: title, message, actions, optional text fields, alert or
action-sheet presentation. **Source.** `DC/AlertController/SKAlertController.swift:24-188`.

**API.** `title`, `message`, `actions: [Action(title, style: .default | .cancel | .destructive, isPreferred, handler)]`,
`sourceViewForPresentation`, `textFieldConfigurationHandler` (`:139-170`).

**Visuals** are iOS system alerts, not Slack-styled, so a web prototype should imitate the iOS alert. No snapshots.

## SKNavigationTitle

**Purpose.** The custom nav-bar title view: a title with optional left and right ornaments (icon, image, member count or
badge) and an optional subtitle line with its own ornaments. The whole thing is tappable (for example to open channel
details).

**Source.** `DC/NavigationTitle/SKNavigationTitle.swift` (`Constants` and styles :70-88, content :204-271,
PresentationObject :273-394), `SKNavigationTitleOrnament.swift` (20 × 20 ornament box, :29-133). **Snapshots**
(`SNAP/SKNavigationTitleSnapshotTests/`, 25):
- `testSubtitleWithBothIcons@3x.png`: "Title" (Lato Black 17) over "Subtitle ⌄".
- `testInNavigationBar_shortTitle@3x.png` and `_longTitle`: inside a real nav bar, 393 × 426.
- `testTitleWithLeftBadge@3x.png`.

**API.**
- `titleContent: Content(text: Text, leftOrnament, rightOrnament)`, `subtitleContent: Content?`
- `alignment`: `center` (default) or `leading`
- `shouldAnimateContentTransition`
- Ornaments: `icon(SKIconManifest)`, `image(ImageSource)`, `count(Int)` (renders an SKGroupAvatar small showing the
  count), `badge(SKBadge.PresentationObject)`, `none` (`:332-350`)
- Action: `selected`

**Layout.**
- Rows stack vertically inside insets of 0 top, 5 left, 0 bottom, 5 right (`:82`).
- Ornament → text gap: icon 2, badge 4, image or count 8 (`:339-349`; `Constants.horizontalSpacing` = 2 at `:81`).
- Ornaments are 20 × 20. Images use proportional corners (0.25 × side) (`SKNavigationTitleOrnamentDefaults`,
  `SKNavigationTitleOrnament.swift:14-19`, `:105-110`). September adds `SwiftUI/SKNavigationTitleView.swift`, a SwiftUI
  twin that renders the same presentation object with the same fonts, colors, ornaments and 5 pt inset.
- Each line is limited to 1 line (`:213`).
- Measured: title only is 20.7 pt tall; title with subtitle is 38.8–40.8 pt.

**Type.** Title: `SKFont.bodyBlack` (Lato Black 17), `primary.contentPrimary`. Subtitle: `SKFont.smallBody` (Lato
Regular 15), `primary.contentSecondary`. Icon ornaments take the line's text color (`:79-88`, `:221-223`).

**Behavior.** When the subtitle is added or removed with animation, it fades with the smooth/medium spring (0.4 s)
(`:159-189`).

## Tooltips and coachmarks

SlackKit has **no** tooltip or coachmark component. What exists:
- The `coachmark` tone of SKBanner (above), with the legacy colors `coachmark_banner_*` (`Legacy:352-357`):
  - background #1264A3 / #17344C
  - text #FFFFFF / #D1D2D3
  - button background #FFFFFF / #4F6375
  - button text #1D1C1D / #FFFFFF
  - ornament background `sk_frosty_blue_solid` / #4F6375
- Tooltips and coachmark views live outside SlackKit and are not specified here:
  - `Modules/UIInfra/Education/Implementation/EDUTooltip/` (608 lines)
  - the legacy SlackUI widgets `Modules/UIInfra/SlackUI/Implementation/LegacyWidgets/CoachmarkView.swift` and
    `TooltipView.swift`
  - also in that folder: the legacy "snackbar", `SnackBarAlertView.swift`, which is the predecessor of SKToast
- Coachmark data models live in `Modules/Data/DataModels/Implementation/ClientModels/Coachmark`.

Inside SlackKit, "coachmark" appears only as the SKBanner tone (`DC/Banner/SKBanner.swift:178`, `:230-334`) and in one
doc comment ("where to show pop-overs or coachmarks", `CC/TextInput/SKTextInput.swift:993`).

---

# Text inputs, search and tokens (chips)

## SKTextField

**Purpose.** A single-line text field in a bordered rounded box. It supports a leading ornament (for example a
magnifier), a clear button, a loading spinner, ghost or suggested text, and secure entry with an eye toggle. In
`.button` mode it is a non-editable tappable field, which is what SKSearchBarButton uses.

**Source.** `DC/TextField/SKTextField.swift`:
- `Constants` :27-54, init and modes :154-207
- configure :340-424 (colors), :595-649 (clear button and secure toggle)
- PresentationObject :800-978, height :1151-1170

Also `GhostTextHelpers.swift`, `SingleLineTextInputSizer.swift`, `SKTextField+ObservableActions.swift`, and (new in
September) `SKTextField+RichInputView.swift`, `SKTextInput+Geometry.swift`. Tests:
`TST/DesignerComponents/TextField/SKTextFieldSnapshotTests.swift`.

**September 2026.** `SKTextField` is now `SKTextFieldGeneric<PassthroughTextProcessor>` (`:22-25`, `:56-61`): with the
`sktextfieldRichBacking` flag and a presentation object whose `securitySupport` is `.disabled`, the entry view is an
`SKTextInput` (`RichInputView`) instead of the `UITextField`, swapped in place (`applyBacking`, `:248-277`); secure
entry stays on the `UITextField`. `SKTextFieldGeneric<AutocompleteTextProcessor>` adds autocomplete. The rich backing
renders the same (`SNAP/SKTextFieldRichBackingSnapshotTests/`, 8 PNGs that mirror the default tests).

**Snapshots** (`SNAP/SKTextFieldSnapshotTests/`, full width, 42 pt tall)
- `testTextFieldWithOrnamentAndPlaceholder@3x.png`.
- `testTextFieldWithSpinner@3x.png`.
- `testTextFieldWithCustomColorAndShadow@3x.png` (green).

Others: Default, Disabled, WithText, LongText, WithCloseButton (300 wide), Matching / NonMatching suggestion,
PlaceholderAndTrailingText, TextAndTrailingText, SpinnerAndLongText, and (September) OrnamentAndMatchingSuggestion.

**API** (`:845-978`)

| prop | default |
|---|---|
| `mode` (init) | `.textField(isSearchField: false)`; also `.button` |
| `textAction` | `.replace(text, …)` sets the text |
| `ornament` | `SKOrnamentBox.PresentationObject?` (leading) |
| `placeholderText` | `R.strings.search_with_ellipsis` "Search…" |
| `ghostText` | `.suggestedResult(text, color = primary.contentTertiary, font = .body)` (completes the typed prefix) or `.trailing(text, …)` (after the placeholder or text) |
| `borderColor` | `primary.outlinePrimary` #7C7A7F / #797C81 |
| `clearButtonNormalColor` / `clearButtonHighlightColor` | `primary.contentTertiary` #5E5D60 / #9A9B9E, and that @75% (`Modifiers.pressedOpacity`) since September (`:917-918`; June `contentPrimary` @30% / @15%) |
| `textFieldPlaceholderTextColor` | `primary.contentSecondary` #454447 / #B9BABD |
| `textFieldStandardTextColor` | `primary.contentPrimary` #1D1C1D / #F8F8F8 |
| `textFieldBackgroundColor` | nil (transparent) |
| `selectedBackgroundColor` (pressed, in button mode) | `primary.baseTertiary` #EAEAEA / #212428 |
| `shouldShowLoadingIndicator`, `shouldShowShadow` | false |
| `edgeInsets` | 10 top and bottom, 16 left and right (`Constants.initialEdgeInsets`, `:45`) |
| `isEnabled` | true; when false the text is `textFieldStandardTextColor` at `Modifiers.disabledOpacity` 0.35 (September, `:362`, `:485`; June `primary.contentTertiary`) |
| `securitySupport` | `.disabled` or a secure-entry mode (replaces `isSecureTextEntry`; `obscuresInput`), September | |
| `isSecureTextEntry`, `shouldShowSecureTextEntryToggle`, `returnKeyType`, `keyboardType`, `autocapitalizationType = .sentences`, `textContentType`, `restrictToNumericalInput`, `isDecimalAllowed`, `inputItemButtons` | system keyboard options |

Actions: `textChanged(text, sourceView)`, `beganEditing`, `endedEditing(.none / .goToNextField / .submitForm)`,
`buttonTapped`, `clearButtonTapped`, `ornamentTapped`, `inputAccessoryViewTapped`, `secureEntryToggleTapped`.

**Layout.**
- Corner radius **12** (`Constants.largerCornerRadius`, `:33`, `:148-150`; the 8 at `:30` is unused). Border 1 pt. A
  `.clear` border color means no border *and* radius 0 (`:375-382`).
- Font `SKFont.body` (Lato Regular 17) for text, placeholder and ghost text (`:53`, `:143`, `:417`).
- Height = max(text line + insets, ornament side + insets). Measured: 42 pt with default insets (`:1151-1170`).
- Ornament: at the left inset. The text starts after it at ornament side + **12** (`:50`, `:387-408`).
- Clear button: a 20 pt ⓧ at the right inset. The text inset grows by 24 when it shows (`:47`, `:635-648`).
- Spinner: SKSpinner medium (18 pt), darkOnLight, at the trailing edge (`:157`).
- Secure toggle: `.svgEyeOpenFilled` / `.svgEyeClosed` in `primary.contentSecondary` (`:610-619`).
- Shadow (optional): black, opacity 0.08, radius 3, y offset 1 (`:36-43`, `:162-163`, `:384-385`).

**States.** Pressed, in button mode only: the container background changes to `selectedBackgroundColor` (`:1087-1088`).
Disabled: the text takes its standard color at 35 % opacity. A return-key change now reloads an open keyboard
(`:428-435`).

## SKSearchBar

**Purpose.** Slack's in-page search field: an SKTextField in search mode with a magnifier ornament and a light gray fill.

**Source.** `DC/SearchBar/SKSearchBar.swift:108-380` (now `SKSearchBarGeneric<PassthroughTextProcessor>`, `:21-32`).
**Snapshots** (`SNAP/SKSearchBarSnapshotTests/`, 393 × 42)
- `testEmptySearchBarWithOrnament@3x.png`: a magnifier and "Search…" on #F8F8F8 / #1A1D21 with a faint border.
- `testPopulatedSearchBar@3x.png`: long text truncated with "…".
- `testPopulatedSearchBarWithSuggestedResult@3x.png`: gray ghost completion.

Others: NoOrnament, WithLoadingIndicator, WithShadow, and (September) `testSearchBarWithCustomLeadingOrnament` (a
`.svgChannel` in UIKit's `secondaryLabel`, small) and `testSearchBarWithGroupAvatarLeadingOrnament` (the mpdm count "3"
in a verySmall square), plus `SNAP/SKSearchBarRichBackingSnapshotTests/` (3). The two
`SNAP/SKSearchBarButtonSnapshotTests/` files also render this component (`testSearchBarButtonHighlight` is light-only,
showing the pressed #EAEAEA fill).

**Defaults** (`:311-351`). These differ from SKTextField:
- `borderColor = primary.outlineTertiary` #5E5D60 @13% / #797C81 @30%
- `textFieldBackgroundColor = primary.baseSecondary` #F8F8F8 / #1A1D21
- `textFieldPlaceholderTextColor = primary.contentTertiary` #5E5D60 / #9A9B9E
- `ghostTextColor = primary.contentTertiary`
- `placeholderText = "Search…"` (`search_with_ellipsis`)
- `shouldShowSearchOrnament = true`
- (September) `leadingOrnament: SKOrnamentBox.PresentationObject? = nil`, which replaces the magnifier (`:131-135`);
  `returnKeyType = .go` (now configurable, e.g. `.search`); `shouldShowCancelButton = false`; clear button colors
  `contentTertiary` / @75%.

The ornament is `.svgSearch` (`search.svg`) in an SKOrnamentBox size **verySmall** (20, no background) since September
(`:134`; June's was small, 24), tinted with the placeholder color. Measured: the text starts at x = 48 (16 + 20 + 12).

**Cancel control** (September, `:42-54`, `:196-268`, `:354-369`): the field and an optional trailing control sit in a
horizontal stack, 12 pt apart (`Constants.stackViewSpacing`). It is a "Cancel" `SKButton` (`.default()`, `.toastButton`,
`R.strings.cancel`), or on the Liquid Glass path a 44 pt `SKIconButton` with `.svgClose` in `primary.contentSecondary` on
a clear circle, `glassStyle: .regular`. Showing or hiding it springs (damping 0.78, response 0.45 s) from scale 0.5 and
alpha 0 while the field takes or gives up the width; it fires `cancelTapped`.

**Liquid Glass** (`useLiquidGlass`, `:34-39`, `:146-151`, `:174-189`): on iOS 26 with the `sksearchbarLiquidGlass` flag or
the unified navigation, the field sits in an interactive `.regular` glass capsule and its own fill and border are cleared.

**Behavior.** Typing fires `textChanged`, and the clear ⓧ appears once there is text. `suggestedResult` draws the
remainder of a suggestion after the typed prefix in ghost color (`GhostTextHelpers.swift:15-88`).

## SKTokenView (chip)

**Purpose.** A chip or token for a selected person, channel or workspace (in "To:" fields and filters), or a small tag.
It has a leading ornament tile, a bold label, an optional share-type accessory, and an optional dismiss ✕.

**Source.** `DC/TokenView/SKTokenView.swift`: `Constants` :63-69, configure :177-245, sizing :272-317, ornaments
:349-494, margins :510-554, PresentationObject :644-832, colors :835-904. Tests:
`TST/DesignerComponents/TokenView/SKTokenViewSnapshotTests.swift`.

**Snapshots** (`SNAP/SKTokenViewSnapshotTests/`, 32)
- `testTokenResolvedWithDismiss@3x.png`: a light-blue chip with a darker "#" tile, "This is a token" and ✕.
- `testTokenResolvedSelected@3x.png`: a solid blue chip with white text and a Slack Connect accessory.
- `testTagDefault@3x.png`: a 24.7 pt inline tag.

Others: Unresolved (spinner), Error (info icon), Warning, Disabled, Selected combinations, and member, workspace, icon,
number or no-ornament variants.

**API** (`:658-832`)

| prop | values | default |
|---|---|---|
| `state` | `resolved(ornament:, tone: .default / .warning / .custom(tokenBackgroundColor, ornamentBackgroundColor?, textColor, iconColor))`, `unresolved` (spinner ornament), `error` (`.svgInfo` ornament) | required |
| `text` | `Text` (the label, Lato Bold 17) | required |
| `isSelected`, `isDisabled` | Bool | required |
| `isTapEnabled` | tap fires an action | false |
| `isDismissible` | shows ✕ with a 44 × 44 tap target | false |
| `menuPresentationObject` | long-press menu | nil |
| `ornament` | `member(avatarSource, appliesInnerCornerRadius)`, `channel(type: public/private/archived, shareType: none/enterprise/external)`, `workspace(image, name, variant = .default)` (September: drawn as an `SKWorkspaceAvatar` size small, 24 pt, centered in the tile, so a missing image shows the initials and GovSlack its badge, `:375-385`; June filled the tile with the bare image), `image(source, contentMode, …)`, `icon(type)`, `number(count)` (multi-person DM icon for 2–15), `spinner(color)`, `none` | |
| `trailingAccessoryIcon` | `SKIconManifest?` (September): a trailing icon such as a dropdown chevron; it wins over the channel's share-type accessory and is independent of the dismiss ✕ (`:425-430`, `:652-655`) | nil |
| `spacing` | `avatar` (default, 32.8 pt tall) or `inline` (24.7 pt tall) | `.avatar` |
| `colors` | from state and selection, or `Colors.uniform(backgroundColor:foregroundColor:)` | |

**Layout** (`:63-69`, `:272-317`, `:510-584`)

| measure | avatar spacing | inline spacing |
|---|---|---|
| height | text line + 6 + 6 (measured **32.8**) | text line + 2 + 2 (measured 24.7) |
| ornament tile | a square as tall as the chip, flush left, own background | same |
| icon / channel / number inset in the tile | 6 (spinner 7) → a 20 pt icon | 2 (spinner 3) |
| gap between items | 8 (`Spacing.medium`) | 4 (`Spacing.small`) |
| left padding | 0 with an ornament, else 8 | 0, else 4 |
| right padding | 8 if there is text | 4 |
| corner radius | **8** (`largerCornerRadius`; the 6 is only for inner image radii) | 8 |
| dismiss | `.svgClose` 20 pt in the icon color, 44 × 44 hit area | same |

**Colors** (`:874-904`)

| state | chip | ornament tile | text | icon |
|---|---|---|---|---|
| resolved default | `highlight1.base` #E3F8FF / #001A2D | `highlight1.surface` #36C5F0 @13% / #036696 @25% | `contentPrimary` | `contentPrimary` |
| resolved default, selected | `highlight1.baseInverse` #1264A3 / #0A77A7 | `highlight1.surface` | `contentInversePrimary` #FFFFFF / #F8F8F8 | same |
| resolved warning | `highlight3.base` #FFFAE0 / #2F1E00 | `highlight3.surface` | `contentPrimary` | `contentPrimary` |
| warning, selected | `highlight3.baseInverse` #F1B900 / #7E5800 | `primary.surfacePrimary` | `contentPrimary` | `contentPrimary` |
| unresolved | `primary.baseTertiary` #EAEAEA / #212428 | `surfacePrimary` | `contentPrimary` | `contentPrimary` |
| unresolved, selected | `baseInversePrimary` #1D1C1D / #212428 | `surfacePrimary` | `contentInversePrimary` | same |
| error | `important.base` #FFE8EF / #300005 | `important.surface` | `contentPrimary` | `important.content` #C01343 / #DE678A |
| error, selected | `important.baseInverse` #E01E5A / #D3305D | `important.surface` | `contentInversePrimary` | `contentInversePrimary` |
| disabled (resolved) | `baseTertiary` #EAEAEA / #212428 | `surfacePrimary` | `contentTertiary` #5E5D60 / #9A9B9E | same |
| custom tone, selected | the given colors at 20% alpha | | | |

Measured light chips: #E3F8FF, selected #1264A3, error #FFE8EF, warning selected #F1B900, unresolved #EAEAEA.

**Icons.**
- channel: `.svgChannel` (public), `.svgLockFilled` (private), `.svgArchiveFilled` (archived).
- share accessory: `.svgOrgSharedChannel` (enterprise), `.svgSharedChannelFilled` (external).
- number: `.svgMultipartyDm{2…15}Filled`, else `.svgSquare` (`:425-490`).

**Behavior.** While the long-press menu is showing, the chip scales to 0.9 and alpha 0.9, then back (`:247-258`).

## SKTokenBar

**Purpose.** A wrapping row of SKTokenViews with row limits and a "+N" overflow chip. It is the token area of a "To:"
field (the entity wrapper adds the prefix and text input; see SKTokenBarEntity).

**Source.** `DC/TokenBar/SKTokenBar.swift` (`Constants` :46-49, placeholder :178, overflow :243-252, PresentationObject
:305-347), `SKTokenBarLayoutEngine.swift`, `SKTokenBarLayoutCursor.swift`. **Snapshots.**
`SNAP/SKTokenBarSnapshotTests/testTokenBarLarge@3x.png` (393 × 78), plus `testTokenBarMedium`, `Small`, `Truncated`,
`TextsLayout`, `EdgeCaseFakerNames`.

**API.**
- `tokens: [SKTokenView.PresentationObject]`
- `maximumRowCount = 2` (0 = unlimited; overflow collapses into "+N")
- `styling`: `emphasized` (Lato Bold 17) or `light` (Lato Regular 17)
- `placeholder: String?`
- Actions: `tokenTapped(index)`, `tokenDismissed(index)`, `overflowTapped`, `menuShown`, `menuActionSelected`

**Layout.** 8 pt between tokens and 8 pt between rows (`:45-46`). A token wider than the row is clamped to the row width
(`SKTokenBarLayoutCursor.swift:95-113`). The overflow chip is a resolved token with no ornament showing "+N"; its
VoiceOver label is `R.strings.show_number_more`. The empty-state placeholder is `SKFont.body` in `primary.contentTertiary`
#5E5D60 / #9A9B9E since September (`:178`, `:214`; June `sk_foreground_high_solid` #868686 / #75777A). Dismissible tokens get a VoiceOver action "`R.strings.remove`, <label>" (`:273`).

## SKTextToolbar

**Purpose.** A horizontal formatting toolbar (bold, italic, lists, and so on) made of 36 pt round icon buttons in
sections separated by dividers. It sits above the keyboard or composer.

**Source.** `DC/TextToolbar/SKTextToolbar.swift` (PresentationObject :215-279, sizing :111-144),
`Layout/SKTextToolbarLayout.swift` (`Constants` :31-36), `Cells/SKTextToolbarItemCell.swift` (`Constants` :19-23,
configure :63-88, presentation object :106-126), `Cells/SKTextToolbarDividerCell.swift`. **Snapshots** (new in
September, `SNAP/SKTextToolbarSnapshotTests/`, 117 × 36 pt: bold, heading 1 and checkbox items):
`testAllItemsUnselected`, `testSelectedItem`, `testEmphasizedItemMatchesSelectedChrome` (a "+" emphasized),
`testDisabledItem`, `testSelectedAndDisabledItem`.

**API.**
- `sections: [ToolbarSection(items: [ToolbarItem(id, icon, iconColor = primary.contentSecondary, voiceoverText, selectionStyle, isEnabled = true, disableAnimations = true)])]`
  (`:250-279`). September replaced June's `isSelected` and `highlightStyle: .blue / .grey` with `selectionStyle`:
  `.none`, `.selected` (selected chrome and the `.selected` trait) or `.emphasized` (the same chrome, decorative, no
  trait) (`SKTextToolbarItemCell.swift:116-125`).
- `backgroundColor = primary.basePrimary`
- `itemSpacing = Spacing.small` (4)
- Action: `selectedItem(id, isSelected, sourceView)`, where `isSelected` is `selectionStyle == .selected` (`:206`)

**Layout.**
- Item 36 × 36. The selection chrome is a circle inset 2 pt (32 pt) (`SKTextToolbarLayout.swift:33`,
  `SKTextToolbarItemCell.swift:21`, `:138`).
- 4 pt between items. A section divider is 1 × 20, vertically centered, with 6 pt on each side
  (`SKTextToolbarLayout.swift:32`, `:34`, `:97-114`).
- Width = items × 36 + items × (spacing − 1) (+ 12 per section gap), so three items are 117 pt (`SKTextToolbar.swift:120-136`).
- Divider color `primary.outlineTertiary` (`SKTextToolbarDividerCell.swift:28`).

**Colors** (`SKTextToolbarItemCell.swift:46-47`, `:81-87`)
- Normal icon: `iconColor`, default `primary.contentSecondary` #454447 / #B9BABD.
- Selected or emphasized: icon `highlight1.content` #1264A3 / #2BA5CE on a `highlight1.surface` #36C5F0 @13% /
  #036696 @25% circle (September; June: `sk_sky_blue` on `sk_frosty_blue_solid`, or a grey style).
- Disabled: the content at alpha 0.35, chrome included (`:20`, `:67`).
- Pressed: bounce to 0.96 (`:22`, `:94-102`).

## SKTextInput (core)

**Purpose.** The multi-line rich text view used by the composer and the text-input entities: a placeholder, growth up to
a maximum height, rich-text processing and mentions.

**Source.** `CC/TextInput/SKTextInput.swift` (1.7K lines; the visual surface is at :217-290, :378-396, :724, :754-798,
:861-868) and `TextProcessor/WysiwygTextProcessor+Config.swift:57-109`. Playground: `PG/DesignerComponents/TextInput/`.

**Visuals.**
- Background `primary.basePrimary` (`:217`).
- `textContainerInset` defaults to 8 top and bottom, 0 left and right, and `lineFragmentPadding` is 0 (`:378-379`,
  `:783`).
- Placeholder: `SKFont.body` in `primary.contentSecondary`, `maxLinesForPlaceholder = 1`, placed at the same insets
  (`:287-290`, `:724`).
- Text in rich (Wysiwyg) mode: Lato Regular 17 (`.custom(.regular, 17)`) in `primary.contentPrimary`. Link and mention
  slugs use `highlight1.content`. Non-link slugs use `message_rendering_mention_text` (#0B4C8C / #1D9BD1). Inline code
  uses `message_rendering_code` (#E01E5A / #E8912D) (`WysiwygTextProcessor+Config.swift:70-109`,
  `Legacy:338-339`).
- `scrollBehavior`: `disabled` (grows to fit), `maximumHeight(h)` (grows, then scrolls), or `enabled` (`:861-868`).
- September 2026: Apple Writing Tools are always off (`writingToolsBehavior = .none`; June's `isWritingToolsEnabled` is
  gone, `:280-282`); `shouldAnimatePlaceholderText` (default false) cross-fades placeholder changes (`:776-778`); the
  Wysiwyg config gains `defaultHeaderOneFont` / `Two` / `Three` = `Text.Consts.headerFont(forLevel:)` for headings
  (`WysiwygTextProcessor+Config.swift:77-79`; see SKLabel › headings).

## SKInputAccessoryView and SKDateTimePickerEntity (developer components)

- **SKInputAccessoryView** (`DevC/InputAccessoryView/SKInputAccessoryView.swift`): the bar above the keyboard with
  buttons laid out `.equal([…])` or `.leadingTrailing(…)`. Each button is `systemButton(title)` (an SKButton in
  `.systemBlue`), `icon(SKIconManifest)` or `label(text)` (contentPrimary) (`:53-79`, `:154-173`). Height is 36 (the
  toolbar item height), or 48 plus a 12 pt bottom inset with 16 pt side insets in liquid-glass mode (`:84`, `:204-206`).
- **SKDateTimePickerEntity** (`DevC/DateTimePickerView/SKDateTimePickerEntity.swift`): a list row with an optional
  primary label (`SKFont.body`, contentPrimary) and a system `UIDatePicker`. Padding 8 top and bottom, 16 sides.
  Height = picker + 3 × 8 (`:17-32`, `:93`, `:212-220`).

---

# Attachments

## SKThumbnailAttachment

**Purpose.** A square attachment thumbnail (in the composer's attachment strip, pickers and grids). It can show an
image, video (with a duration badge), file-type tile, loading or error state, a "+N" overflow tile or a placeholder
icon, and it supports multi-select.

**Source.** `DC/ThumbnailAttachment/SKThumbnailAttachment.swift`: `Constants` :88-106, `Style` :108-114, corner radius
:72-75, selection :571-588, overflow label :607-617, `Size` :731-746, `State` :748-756, `Selection` :758-770. Tests:
`TST/DesignerComponents/ThumbnailAttachment/SKThumbnailAttachmentSnapshotTests.swift`.

**Snapshots** (`SNAP/SKThumbnailAttachmentSnapshotTests/`, 32)
- `testAttachmentImageMedium@3x.png`: 96 pt image.
- `testAttachmentImageSelected@3x.png`: yellow 3 pt ring, dim overlay, numbered white badge.
- `testAttachmentVideoDurationInMinutes@3x.png`.
- New in September 2026: `testAttachmentImageMediumAltTextBadgeHidden`, `…WithEditIcon`, `…WithAltTextAndEditIcon`,
  `…WithAltTextReminderAndEditIcon` (all three show only the edit badge).

Others: Small/Medium × Image/File/Loading/Error/Overflow/Placeholder, Plain, CustomSize, AltText and AltTextReminder,
SingleUnselected, and Video with hours/seconds/no duration/selected.

**API.**
- `size`: `small` 64, `medium` 96, `custom(size:)`
- `state`: `loading(shimmer:)`, `image(source, previewSource, altText, imageContext)`,
  `video(source, previewSource, durationInSeconds, mediaReactions, …)`, `file(type:)`,
  `error(icon = .svgWarningFilled in important.content)` (`:753`; June: `sk_raspberry_red`), `overflow(count:)`,
  `placeholder(icon:)`
- `selection`: `none(.decorated / .plain)`, `unselected`, `selected(position:)`
- `altTextBadgeVisibility` (September 2026, `:642`, `:655`): `.hidden` (the default), `.visibleIfPresent` or
  `.visibleAlways` (`SKH/AltText/AltTextBadgeVisibility.swift:6-27`; June's `allowAltTextReminder` is `.visibleAlways`).
  The badge is centered at the bottom (`shouldCenter`).
- `displayEditIcon` (September 2026, `:643`, `:656`): an **EditIconBadge** 6 pt in from the bottom-left (`:253-255`).
  It replaces the ALT badge, which would collide with it (`:362-370`).
- Actions: tap and remove

**Layout** (`:88-106`)
- Corner radius = `min(20, 0.225 × side)`, which is 14.4 at 64 and 20 at 96 (`:72-75`, `:90`).
- Border: 1 pt `primary.outlineTertiary` #5E5D60 @13% / #797C81 @30%. `.plain` has no border.
- Background `primary.basePrimary`. List and canvas files use their file-type colors (`:548-566`).
- Icon sizes: loading 32, error 20, file 36, placeholder 24, list or canvas icon 32, heart 36 (white, 7 pt black
  @50% shadow).
- Badges (video duration, selection, heart) sit 6 pt from the edges, up to 8 as the corner radius grows (`:99-103`,
  `:470`).
- Overflow: "+N" in `SKFont.bodyBold` (Lato Bold 17) in `primary.contentSecondary`, centered (`:607-617`).

**Selection** (`:571-588`)
- `unselected`: 1 pt border plus the MultiSelectBadge "unselected" circle.
- `selected(n)`: a **3 pt** border in `sk_secondary_highlight` #F2C744 (`:93-94`, `:113`, `:583`), a
  `sk_black_high_contrast` (#1D1C1D @50%) dim overlay (`:188`), and the badge showing n.

**States.** Pressed: alpha 0.6 (`:91`, `:525`). Copy: VoiceOver says `R.strings.more_attachments` "There are %@ more
attachments." for overflow tiles.

## SKCompactAttachment

**Purpose.** A single-row attachment card: a 36 pt file-type tile (or image preview), then a title and subtitle, with an
optional accessory icon. Used for files, audio, unfurls, tables and errors in messages and the composer.

**Source.** `DC/CompactAttachment/SKCompactAttachment.swift`: `Constants` :71-84, radius :86-88, `Style` :90-93, labels
:574-633, `State` :701-710. **Snapshots** (`SNAP/SKCompactAttachmentSnapshotTests/`)
- `testAttachmentFile@3x.png`.
- `testFileWithAccessoryIcon_longFileName@3x.png`.
- `testFileWithPreviewImage@3x.png` (also skinny and wide).

Others: Image, VideoNoDuration, Error, FileWithAccessoryIcon_shortFileName.

**Layout** (`:71-84`)
- Padding 12 on all sides. The tile is 8 pt from the text. The title and subtitle are 2 pt apart. Title parts are
  6 pt apart.
- Corner radius **15** (`moreRoundedCornerRadius`, `:73`, `:86-88`).
- Border 1 pt `primary.outlineTertiary`. Background `primary.basePrimary`. The internal divider is 1 px `outlineTertiary`.
- Max height 300. Accessory icon 12 × 12. Progress icon 32 × 32.
- Measured: a file row is 60 pt tall (36 + 24). The tile is at (12, 12, 36, 36)
  (`SNAP/SKAttachmentBarSnapshotTests/testMixedTypeMultipleAttachments@3x.png`).

**Type** (`:578-633`)
- Title: `SKFont.smallBodyBold` (Lato Bold 15), `primary.contentPrimary`, `titleLineLimit` lines.
- Subtitle: `SKFont.caption` (Lato 13), `primary.contentSecondary`, 1 line.
- Tertiary: `SKFont.caption`, `primary.contentTertiary`.

**File-type tile colors** (`SKX/UIColor+FileTypeExtensions.swift:15-128`). The background is
`primaryColor(for:)` = palette `_50` (`_60` for bolt and SFDC). The glyph is `secondaryColor(for:)`, the aubergine-style
theme `contentInversePrimary` of that palette (`:31-52`).

| palette | file types | `_50` light / dark (Colors.swift) |
|---|---|---|
| ocean | images, audio, email, gdoc, key/pages/rtf, doc/docx, php, text, psd, paper, surface | #2985CD / #307EC0 (:1526) |
| mojito | video (mov/mp4), apk, gsheet, xls/xlsx/csv | #2FA659 / #369D56 (:1238) |
| flamingo | pdf, css, inDesign | #EF3E75 / #D94C75 (:1814) |
| tomato | html, ppt/pptx, flash, swf, js, sql | #DE4E2B / #D05038 (:662) |
| tangerine | gpres, ai | #E96825 / #D56A37 (:806) |
| lagoon | canvas | #0E9DD3 / #1699CA (:1454) |
| honeycomb | list | #D38D00 / #C48305 (:950) |
| aubergine | gform | #C474D3 / #B26EC3 (:1670) |
| gray | binary, ipa, numbers, markdown | #7C7A7F / #797C81 (:590) |
| none (`primary.surfacePrimary`) | undefined, gdraw, sketch, huddle | |

Measured: the doc tile is #2985CD and the canvas tile #0E9DD3. File-type icons come from
`Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift`.

**States.** Pressed: alpha 0.6 (`:75`, `:520`). Error state: `.svgWarningFilled` in `important.content` (`:846`;
June: `sk_raspberry_red`; the SKAttachmentBar error state's default is the same, `SKAttachmentBar.swift:773`). The AI
summary action is labeled `R.strings.view_summary` "View summary". Since September 2026 a file's preview image takes
its height from the full available width (`:479-480`).

## SKExpandedAttachment

**Purpose.** A large inline image or video preview (in messages): aspect-fit to the known size, with a video badge, alt
text badge, and refresh or error recovery.

**Source.** `DC/ExpandedAttachment/SKExpandedAttachment.swift`: `Constants` :69-86, `Style` :120-131, sizing :536-590,
`PresentationObject` :569-656, `CornerRadius` :621-628, `State` :630-655, `RecoveryState` :659-666.
**Snapshots** (`SNAP/SKExpandedAttachmentSnapshotTests/`, 14)
- `testNormalAttachmentImageWithKnownSize@3x.png`.
- `testAttachmentImageWithAltText@3x.png`.
- `testAttachmentVideoLoaded@3x.png`.
- New in September 2026: `testAttachmentImageAltTextBadgeHidden`, `testAttachmentImageWithClearBorderAndBackground`,
  `testAttachmentImageWithSquareCorners` (the kiwi fixture, 393 × 245⅔; the clone matches all five image tests within
  0.4% in light and dark).

Others: skinny, tall and wide aspect ratios, unknown size, video, alt-text reminder.

**API (September 2026).**
- `altTextBadgeVisibility` (default `.visibleIfPresent`; `:582`, `:600`) replaces June's `allowAltTextReminder`
  (= `.visibleAlways`). The badge shows when `showsBadge(altTextMissing:)` (`:368-373`), never on videos (`:395`).
- `borderColor` and `backgroundColor` overrides; `nil` falls back to `outlineTertiary` and `baseSecondary`
  (`:120-131`, `:583-586`).
- `cornerRadius`: `.standard` 12, `.moreRounded` 15 (the default) or `.custom(CGFloat)` (`:88-97`, `:621-628`); it
  replaces `useMoreRoundedCornerRadius`.
- `anchor: ImageContentAnchor` (default `.center`; `:577-578`, `:609`): which edge or corner an aspect-filled crop keeps
  (`center`, `top`, `bottom`, `leading`, `trailing` and the four corners; `SKF/Image/ImageContentAnchor.swift:13-71`,
  a `contentsRect` crop). It has no effect on aspect fit.

**Layout.**
- Corner radius 15 (`.standard` 12). Border 1 pt `primary.outlineTertiary`. Background `primary.baseSecondary`
  #F8F8F8 / #1A1D21 (`:69-73`, `:88-131`, `:235-239`).
- Content mode: aspect fill without a known size, aspect fit with one (`:608`).
- Without a known size, height = 5/8 × width. The max dimension is 400 (`:78-85`).
- Media reactions sit 10 pt from the edges (`:76`). The video badge (medium, radius 8) sits radius − 8 = 7 pt in and
  the alt-text badge roundToScreenScale(radius / 2) = 7⅔ pt (`:103-106`, `:256-258`, `:282`). Both are set up in
  `init`, before any presentation object, so they use the default 15 even with `.standard` corners.
- Loading icon 32 × 32. Error: a 30 pt `.svgWarningFilled` in `primary.surfaceSecondary`. Refresh button:
  an SKPillButton with `.svgRefresh` (`:34`, `:74-75`, `:498-502`).

**States.** Pressed: alpha 0.6 (`:73`, `:509`). A long-press context menu is available (`:305-312`).

## SKAttachmentBar

**Purpose.** Lays out a message's (or draft's) attachments as a mix of expanded previews, rows of thumbnails and compact
cards, with overflow handling ("See N more" or "+N").

**Source.** `DC/AttachmentBar/SKAttachmentBar.swift`: `Constants` :38-41, layout :325-643, overflow button :668-675,
`AttachmentPreferences` :717-727, `State` :768-778. **Snapshots** (`SNAP/SKAttachmentBarSnapshotTests/`, 14)
- `testMixedTypeMultipleAttachments@3x.png`: two compact file cards (doc, canvas) above two 15 pt-radius image previews
  with "ALT" badges.
- `testAttachmentBarMultipleImages@3x.png`.
- `testMultipleCompactAttachmentsTruncated@3x.png`.

**API.**
- `preferences`: `thumbnail(maximumRowCount: 1)`, `expanded(maximumCount:, shouldOverflowVertically:)`, or
  `mixed(maximumExpandedCount: 1, maximumThumbnailRowCount: 1, maximumCompactCount: 1)`
- attachment states: `image(thumbnail, altText, knownImageSize)`, `video(…)`, `file(type, titleText, subtitle, previewImage, accessoryIcon)`,
  `error`, `overflow(count)`, `placeholder(icon)`
- `SKLoadingIndicatorState`: `progress(Float)` or `none`

**Alt text (September 2026).** Expanded previews show "ALT" when the alt text is present and also the "+ALT" reminder
when `allowAltTextReminder` (`.visibleAlways` : `.visibleIfPresent`, `:874-879`). Thumbnails in the bar never show
the badge (their presentation object leaves `altTextBadgeVisibility` at `.hidden`, `:864-872`).

**Layout.** Items are 8 pt apart horizontally and rows are 8 pt apart (`:39-40`). Vertical overflow shows an SKButton
"`R.strings.see_prefix`N `R.strings.more`" styled `.custom(backgroundColor: basePrimary, titleColor: contentPrimary, …)`
(`:668-675`).

## SKCompactOverflow

**Purpose.** A "+N more" compact card at the end of a truncated attachment list. **Source.**
`DC/CompactOverflow/SKCompactOverflow.swift:31-143`: radius 12, no border, 8 pt stack spacing, pressed alpha 0.6.
**Snapshots.** `SNAP/SKCompactOverflowSnapshotTests/testDefaultCompactOverflow@3x.png`, `testLongPrimaryDetail`,
`testLongSubtitle`.

## VideoDurationBadge and AltText badge (helpers)

- **VideoDurationBadge** (`SKH/VideoDurationBadge/VideoDurationBadge.swift`)
  - A pill with `sk_black` @70% background, radius 8 (the 6 is unused), insets 2/4/2/4, and 2 pt spacing (`:42-55`).
  - Content: a white `.svgPlayFilled` icon (small 12 pt, medium 20 pt) and a white duration (`DateComponentsFormatter`,
    `.abbreviated` with `maximumUnitCount = 1`, so the largest unit rounded: 95 s → "2m", 10000 s → "3h"; `:18-25`).
    The label reads `R.strings.video` "Video" when there is no duration.
  - Label font: small `captionBold` (Lato Bold 13), medium `smallBodyBold` (Lato Bold 15) (`:125-143`, `:179-202`).
- **AltText badge** (`SKH/AltText/AltTextHelper.swift`): `R.strings.alt_text` "ALT" in `SKFont.captionBold`, white on
  `sk_black` @70%, radius 6, insets 2/4/2/4. The "reminder" variant adds a white `.svgPlus` (`:16-135`). Whether a
  component shows it is now `AltTextBadgeVisibility` (`SKH/AltText/AltTextBadgeVisibility.swift:6-27`, September
  2026): `.hidden`, `.visibleIfPresent`, `.visibleAlways`.
- **EditIconBadge** (`SKH/EditIconBadge/EditIconBadge.swift:13-54`, new in September 2026): a 12 pt white
  `.svgEditFilled` with `Spacing.small` (4) padding on `sk_black` @70%, radius 8 (continuous). It marks an image the
  user can mark up (SKThumbnailAttachment `displayEditIcon`).

---

# List rows ("entities") and section headers

Entities are SlackKit's list rows. Each is a UIView used as SKList cell content (through its `*+ListRowContent.swift`).
Most share one anatomy, `SKEntityBaseView`: leading ornament, then content, then trailing accessories, then optional
buttons below.

## Entity row anatomy (SKEntityBaseView)

**Source.**
- `SKH/EntityViews/SKEntityBaseView.swift`: margins :57-67, spacing enums :400-408.
- `SKEntityBackgroundView.swift`: highlight :18-122.
- `SKEntityContentView.swift`: primary and secondary lines :51-63, :225-246, `Size` :355-389.
- `SKEntityPrimaryContentView.swift`: primary line :102-119, :383-391.
- `SKEntityOrnamentView.swift`: `Size` :397-506.
- `Models/SKEntityOrnament.swift`: ornament kinds :11-21.

Snapshots: `SNAP/SKEntityContentViewSnapshotTests/` (46) and `SNAP/SKEntityOrnamentViewSnapshotTests/` (26).

**Layout**

| part | value | cite |
|---|---|---|
| row margins | 10 top and bottom, 16 left and right. The left is +48 (a 36 pt message avatar + 12) when `isIndentedWithMessage`. With `shouldInsetHorizontalEdges = false`: 10 / 0 / 10 / 0. | `SKEntityBaseView.swift:61-67`, `SKH/Messaging/MessagingConstants.swift:10-12` |
| ornament → content gap | 12 (`standard`); 16 (`large`, extraLarge rows) | `:400-403` |
| content → accessories gap | 8 (`standard`) or 0 (`small`) | `:405-408` |
| buttons below the row | 15 pt below | `:58`, `:103` |
| ornament sizes | verySmall 16, small 24, large 36, extraLarge 56 (image corner radius 4 / 4 / 6 / 8). Member avatars keep their own proportional radius. | `SKEntityOrnamentView.swift:397-506` |
| row height (measured) | small rows (24 pt ornament) **44**; medium rows (36 pt ornament) **56**; +15.6 per extra secondary line | entity snapshots (393 wide) |
| background | `primary.basePrimary` (or the list's `cellSupport.backgroundColor`, or an override) | `SKEntityBaseView.swift:69-71` |

**Primary line** (`SKEntityPrimaryContentView.swift:102-119`)
- Primary text: `SKFont.body` (Lato Regular 17). Member, channel, MPDM and workspace entities make it bold
  (`shouldBoldPrimaryText: true`), giving `bodyBold` (Lato Bold 17). extraLarge uses `bodyBlack` (Lato Black 17).
  Color `primary.contentPrimary`, 1 line, tail truncation.
- Then, 8 pt apart:
  - inline secondary text (`SKFont.body`, `primary.contentSecondary`), for example a member's display name
  - an adjacent tag ("APP", "TEMPLATE", "AI APP", "AGENTFORCE", "AGENT", "Skill", and since September 2026 "Skill set"):
    `SKFont.microBold`, insets 2/4/2/4, radius 4, custom text and background colors (`SKGenericEntity.swift:488-541`).
    In lists the "APP" tag uses the list theme's `primaryAdjacentLabelColors`: `primary.contentSecondary` on
    `primary.baseTertiary` since September (June: `sk_foreground_max_solid` on `sk_foreground_low_solid`;
    `Modules/Integration/ThemesIntegration/Interface/ListThemeOptions.swift:82`)
  - an inline icon, emoji or badge
  - a workspace annotation: a small workspace avatar plus the name in `SKFont.body` / `contentSecondary`

**Second line** (`SKEntityContentView.swift:57-63`, `:225-246`)
- Secondary text: `SKFont.caption` (Lato 13), or `smallBody` (15) for extraLarge, in `primary.contentSecondary`.
  Lines: unlimited by default (member and channel entities: 3).
- Accessory text: `SKFont.body` in `contentSecondary`, 1 line.
- The content stack has 8 pt horizontal spacing (16 for extraLarge) (`:53-54`).

**Disabled.** Texts become `primary.contentTertiary` #5E5D60 / #9A9B9E, and ornaments and inline items go to alpha 0.6
(`SKEntityContentView.swift:58`, `SKEntityPrimaryContentView.swift:104-110`, `SKEntityOrnamentView.swift:68`).

**List theme colors (September 2026).** Home and other themed lists take their row colors from
`ListThemeOptions.ia4Phone` (`Modules/Integration/ThemesIntegration/Interface/ListThemeOptions.swift:65-87`), which now
uses design tokens instead of legacy colors: list and view backgrounds `primary.basePrimary` (June
`sk_primary_background`), item text `primary.contentPrimary` / `contentSecondary` / `contentTertiary` (June
`sk_primary_foreground` / `sk_foreground_max_solid` / `sk_foreground_high_solid`), divider `primary.outlineTertiary`
(June `sk_foreground_low_solid`), "APP" tag `contentSecondary` on `baseTertiary`. Unchanged: the badge (theme
`contentInverseImportant` on `baseInverseImportant`), the tab underline (theme `baseInverseHighlight1`), presence
(theme `baseInverseHighlight2` / `primary.contentTertiary`) and the prominent tag (`highlight1.content` on
`highlight1.base`).

**Pressed / focused / deleting** (`SKEntityBackgroundView.swift:18-122`). A highlight layer sits behind the content:
- `highlightCornerStyle`:
  - `rounded`: inset 4 pt left and right, radius 12, continuous
  - `concentric`: inset 8 pt, radius = height/2 − 8
  - `none`: full bleed, square
- Pressed color: `highlightBackgroundColorOverride ?? cellSupport.highlightBackgroundColor ?? primary.baseSecondary`
  (#F8F8F8 / #1A1D21) (for example `DC/Entities/GenericEntity/SKGenericEntity.swift:99-100`).
- Keyboard focus: `highlight3.surface` (#FFC600 @18% / #A07300 @18%) since September 2026 (`:111-114`; June
  `sk_pale_yellow`, #F2C744 @20%). SKButtonEntity's focused background changed the same way
  (`DC/Entities/ButtonEntity/SKButtonEntity.swift:177`).
- Prepared for deletion (swipe): `important.baseInverse` @25% since September (`:106-109`; June `sk_raspberry_red` @25%).
- The SKList cell also bounces the row while it is pressed (see "SKList row cell").

**Ornament kinds** (`SKEntityOrnament`): `memberAvatar`, `workspaceAvatar`, `groupAvatar`, `icon` (SKOrnamentBox with
an icon, emoji or slash command), `image`, `emoji`, `colorSwatch`, `placeholder`, `none`. Icon boxes default to the
`primary.baseTertiary` background (`SKEntityOrnamentView.swift:192`).

## SKMemberEntity

**Purpose.** A person row: avatar with presence, bold full name, display name, status emoji, workspace, and optional
secondary text ("You", title, timezone and so on). Used in member lists, pickers and search.

**Source.** `DC/Entities/MemberEntity/SKMemberEntity.swift`: `Constants` :27-30, content :95-187, Properties
:267-340, `Size` :439-481. **Snapshots** (`SNAP/SKMemberEntitySnapshotTests/`, 35)
- `testMemberEntityMediumWithUserDataActive@3x.png`: a 36 pt avatar with a green dot, "Steve Jobs" (bold) then
  "Steve" (gray). 393 × 56.
- `testMemberEntitySmallWithWorkspace@3x.png`: 44 pt row.
- `testMemberEntityMediumDeactivated@3x.png`: grayscale avatar, tertiary text.

Others: NoAvatar, WithStatus, External, WithSecondaryText, SlackbotPresence, presence-indicator-only
(`shouldHideMemberAvatars`), icon avatar source, custom presence color, and truncation cases.

**API** (`:287-340`)
- `memberAvatarSource`, `primaryText: Text` (bold, `primaryTextNumberOfLines = 1`)
- `secondaryText` (3 lines max), `tertiaryText`, `accessoryText` (2 lines), `statusEmoji`, `presence`, `workspace(image, title)`
- `secondaryTextVisibility` (September 2026, `:463-468`): `.automatic` (the default: shown at medium, hidden at small)
  or `.always` (shown at any size; at small it is one truncating line, ignoring `secondaryTextNumberOfLines`)
  (`:152-188`). New snapshots: `testMemberEntitySmallAlwaysVisibleSecondaryText` (393 × 56⅓), `…Truncated`, `…Empty`
  (collapses to the plain 44 pt row), `…Deactivated` and `testMemberEntityMediumAlwaysVisibleSecondaryText` (a no-op).
  VoiceOver now also reads the accessory text (`:78`, `:199-207`).
- `isDeactivated` (a grayscale avatar at full opacity: the ornament follows `isEnabled` only, the texts
  `!isDeactivated && isEnabled`, `:96-101`, `:148`), `shouldHideMemberAvatars` (replaces the avatar with a bare
  presence icon)
- `accessories: [SKListCellAccessory]`, `size: .small / .medium` (ornament small 24 / large 36), `isEnabled`, `avatarType`
- background overrides

**Behavior.** Tapping a row goes through SKList. VoiceOver joins name, presence and `R.strings.member` (`:49-59`).

## SKChannelEntity

**Purpose.** A channel row: # or lock or archive icon tile, bold name, optional shared-channel icon, workspace, and
secondary text (purpose, member count).

**Source.** `DC/Entities/ChannelEntity/SKChannelEntity.swift`: `Constants` :24-28, icons :187-254, Properties :316-417,
`Size` :448-467. **Snapshots** (`SNAP/SKChannelEntitySnapshotTests/`, 27)
- `testChannelEntityMediumWithSecondaryText@3x.png`: a "#" in a 36 pt gray tile, "announcements" (bold) and two lines of
  13 pt gray text. 72 pt tall.
- `testChannelEntitySmallArchived@3x.png`.
- `testChannelEntityMediumWithInlineIconAndWorkspace@3x.png`.

**API.** `channelType`: `public` (`.svgChannel`, or `.svgChannelFilled` when `iconStyle: .filled`), `private`
(`.svgLock` / `.svgLockFilled`), `archived` (`.svgArchive`). `shareType`: `enterprise` (inline `.svgOrgSharedChannel`),
`external` (inline `.svgSharedChannel`), or none. Also `iconColor = primary.contentPrimary`, `workspace`,
`secondaryText` (3 lines), `accessories`, `size: .small / .medium`, `isEnabled` (`:187-254`, `:322-367`).
- `codeChannelStatus` (September 2026, `:331`): a code channel's status replaces the channel icon
  (`statusOrnament`, `:133-138`, `:211-235`): `working` a small `darkOnLight` SKSpinner; `done` `.svgCheckCircle`,
  `waitingForInput` `.svgInfo`, `stale` `.svgMinus`, `prOpen` `.svgPrOpen`, `prMerged` `.svgBranch`, `prClosed`
  `.svgPrClosed`, `idle` `.svgStatusMember`, all in `primary.contentTertiary`; `archived` keeps the normal icon.
  VoiceOver adds the status title (`:77-81`).
- New snapshots: `testChannelEntityMultiLinePrimaryHeightAcrossWidths{SecondaryAndWorkspace,WorkspaceOnly}`, for the
  September sizing fix in `SKEntityPrimaryContentView` (the secondary and workspace labels only reserve their stack
  spacing before the primary text is measured, so a wrapping primary reports its real height,
  `SKH/EntityViews/SKEntityPrimaryContentView.swift:302-340`).

**Layout.** The primary text is 1 line, or 3 lines at Dynamic Type sizes above Large (`:25-26`, `:162`). The icon sits in
an SKOrnamentBox (baseTertiary background). The measured tile renders as #F0F0F0-ish in light mode.

**Copy.** VoiceOver adds `R.strings.archived_channel_bottom_drawer_title`, `private_title_cased`, `enterprise_shared` and
`external_shared` (`:84-97`).

## SKMultiPersonDirectMessageEntity, SKUserGroupEntity, SKWorkspaceEntity, SKAppEntity

These follow the same anatomy, with sizes `small` (24 pt ornament, 44 pt row) and `medium` (36 pt ornament, 56 pt row):

| entity | ornament | primary text | extras | source / snapshots |
|---|---|---|---|---|
| SKMultiPersonDirectMessageEntity | SKGroupAvatar (two faces, or a count) | bold member names, up to **4 lines** | VoiceOver `R.strings.number_of_members`, `R.strings.group` | `DC/Entities/MPDMEntity/SKMultiPersonDirectMessageEntity.swift:23`, `:40-77`; `SNAP/SKMultiPersonDirectMessageEntitySnapshotTests/` (13) |
| SKUserGroupEntity | icon tile: `.svgUserGroups`, or `.svgMegaphone` for broadcast groups, in `primary.contentPrimary` | handle / name | | `DC/Entities/UserGroupEntity/SKUserGroupEntity.swift:53-56`; `SNAP/SKUserGroupEntitySnapshotTests/` (12) |
| SKWorkspaceEntity | SKWorkspaceAvatar (with badges) | bold name; 2 lines at accessibility sizes | extraLarge (76 pt) and footer-button variants (129 pt) | `DC/Entities/WorkspaceEntity/SKWorkspaceEntity.swift:150`, `:159`; `SNAP/SKWorkspaceEntitySnapshotTests/` (11) |
| SKAppEntity | app icon image | name + adjacent tag (APP / AI APP / AGENTFORCE…) | optional button (58 pt row) | `DC/Entities/AppEntity/SKAppEntity.swift`; `SNAP/SKAppEntitySnapshotTests/` (10) |

## SKMemberCollectionEntity

**Purpose.** A horizontally scrolling row of large member avatars (or icon tiles) with names underneath, for example
"people in this huddle / channel" strips. **Source.** `DC/Entities/MemberCollectionEntity/SKMemberCollectionEntity.swift`:
16 pt insets and inter-item spacing (`:25-29`); item constants (`:388-397`): 4 pt top padding, 8 pt avatar-to-name gap,
names in `SKFont.smallBody` (Lato 15), 2 lines max; icon items are an SKOrnamentBox extraLarge (56) (`:508-625`).
**Snapshots.** `SNAP/SKMemberCollectionEntitySnapshotTests/` (393 × 104), for example
`testMultiMemberConfiguration@3x.png`.

## SKGenericEntity

**Purpose.** The general-purpose row: any ornament, primary text, optional secondary text, adjacent tag, accessory text,
trailing accessories (chevron, switch, checkmark, and so on), long-press and swipe actions, and selection and focus
states. Most settings and menu-like lists use it.

**Source.** `DC/Entities/GenericEntity/SKGenericEntity.swift`: layout :99-132, PresentationObject :225-415, `Ornament`
:423-435, `AccessoryHorizontalSpacing` :436-447, `Size` :452-483, `AdjacentText` :485-542. Tests:
`TST/DesignerComponents/Entities/GenericEntity/SKGenericEntitySnapshotTests.swift`.

**Snapshots** (`SNAP/SKGenericEntitySnapshotTests/`, 37)
- `testGenericEntityWithIconLargeWithSecondaryText@3x.png`.
- `testGenericEntityHighlighted@3x.png`: the pressed highlight.
- `testGenericEntityExtraLargeWithApplicationLabel@3x.png`.

Others: Small, Large, ExtraLarge × text, icon, image, emoji, slash command, member avatar ornament, disabled, wrapped
and truncated text, accessory.

**API** (`:225-261`)
- `primaryLabel` (SKLabel PO; `primaryTextNumberOfLines`), `secondaryText` + `secondaryTextContentFolding` (0 = unlimited)
- `adjacentText`, `accessoryText` + `accessorySpacing` (`standard` 8 / `small` 0)
- `ornament`: `avatarSource`, `groupAvatar`, `image`, `colorSwatch`, `ornamentBox(enabled:disabled:style:border:)`, `none`
- `accessories: [SKListCellAccessory]`
- `size`: `small` (24 pt ornament), `medium` (36), `extraLarge` (56; bodyBlack title, 16 pt gaps)
- `isEnabled`, `isIndentedWithMessage`, `shouldInsetHorizontalEdges`, `shouldCenterContent`, `alignment`
- `highlightCornerStyle`, background overrides
- `longPressAction`, `swipeActions: SKSwipeActions?`, `selectionState`, `focusState`

**Measured heights.** Text-only small 40.8; with icon 44 / 56; with secondary text 56.3; wrapped 61–77.

**Copy.** Adjacent tags use `R.strings.app_badge` "APP", `template_badge` "TEMPLATE", `ai_app_badge` "AI APP",
`agentforce_badge` "AGENTFORCE", `agent_badge` "AGENT", `skill` "Skill" (`:499-508`).

## SKHeaderEntity (list section header)

**Purpose.** The section header in SKList: a bold title, optional secondary line, leading ornament, right badge, a right
text or icon button ("See All", "Edit"), and an optional collapse chevron. Tapping it collapses or expands the section.

**Source.** `DC/Entities/SKHeaderEntity.swift`: `Constants` :82-89, collapse indicator :34 and :706-728, Properties
:365-392, `Button` :412-436, `Ornament` :438-462, `Size` :467-496, height :538-602. Tests:
`TST/CoreComponents/List/Header/SKListHeaderSnapshotTests.swift`.

**Snapshots** (`SNAP/SKListHeaderSnapshotTests/`, 39, full width)
- `testMediumCollapsibleWithTextButton@3x.png`: "2,910 People" (bold), a blue "See All" and a chevron. 50 pt.
- `testSmallShortTitle@3x.png`: a gray small header.
- `testMediumShortTitleWithShortSecondaryText@3x.png` (72 pt).

Others: collapsed and expanded, down-oriented indicator, right badge, ornaments (avatar, emoji, icon, image, member),
long titles, attributed titles, without footer padding (42 pt), and menu-on-tap title.

**API** (`:372-392`)
- `primaryText`, `secondaryText`
- `ornament`: `image` (radius 4), `ornamentBox(type, backgroundColor)` (size medium), `workspaceAvatar(name, image)`,
  `memberAvatar(name, …)`
- `rightBadge: SKBadge.PO`
- `rightButton`: `.text(text, numberOfLines, typeIdentifier, menu, isSeparateAccessibilityElement)` or `.icon(…)`
- `size`: `small` or `medium` (default)
- `longPressMenu`, `shouldShowCollapseIndicator`, `collapseIndicatorCollapsedOrientation` (`right` default, or `down`),
  `isCollapsed`
- `shouldAddSymmetricalFooterPadding = true`, `isHeaderAlwaysTappable`, `primaryTextBehavior` (`customAction` gives a
  title tap)
- Actions include `headerTitleTapped`, the right-button tap and `contextMenuActionSelected`

**Layout** (`:82-89`)
- Margins 12 top and bottom, 16 left and right. Plus an extra **8** on top when `shouldAddSymmetricalFooterPadding`
  (`SKListFooterView.Constants.topMargin`, `CC/List/Footer/SKListFooterView.swift:19`; `:312`, `:570`).
- The ornament is 20 pt, 12 pt from the text. The title and secondary line are 4 pt apart. The right button has 4 pt
  of horizontal padding.
- Measured heights: a 1-line title is **50** (42 without the footer padding). With a secondary line: 68.7 (small) /
  72 (medium).

**Type** (`:467-496`)

| size | title | secondary | right text button |
|---|---|---|---|
| small | `smallBodyBold` (Lato Bold 15), `primary.contentSecondary` | `micro` (Lato 12), `contentSecondary` | `microBold` (Lato Bold 12), `highlight1.content` #1264A3 / #2BA5CE |
| medium | `smallBodyBold` (Lato Bold 15), `primary.contentPrimary` | `smallBody` (Lato 15), `contentSecondary` | `smallBodyBold`, `highlight1.content` |

Measured: title digits are 11 pt tall, consistent with Lato 15.

**Collapse indicator.** `.svgCaretDownFull` in `primary.contentTertiary` (`:34`).
- Orientation `right`: rotated −90° (pointing right) when collapsed, 0° (down) when expanded.
- Orientation `down`: down when collapsed, rotated 180° (up) when expanded (`:720-727`).

VoiceOver says `R.strings.collapsed` / `expanded` (`:297-299`). The background is `primary.basePrimary` or the list's
cell background (`:243`).

## SKButtonEntity, SKBannerEntity, SKCommandEntity, SKEmojiEntity, SKTokenBarEntity, text-input entities

| entity | what it is | key layout | source / snapshots |
|---|---|---|---|
| SKButtonEntity | one or more SKButtons as a list row. A single button is full width; several wrap, or fill equally (`layout.distribution`) | 10 vertical and 16 horizontal padding (+ message indent), 8 pt between buttons | `DC/Entities/ButtonEntity/SKButtonEntity.swift:26`, `:151-161`, `:210-246`; `SNAP/SKButtonEntitySnapshotTests/` (11) |
| SKBannerEntity | an SKBanner inside a row | margins 12/16/12/16 | `DC/Entities/BannerEntity/SKBannerEntity.swift:23`; `SNAP/SKBannerEntitySnapshotTests/` (19) |
| SKCommandEntity | a slash-command row: "/" ornament box, command name, description | shared anatomy; VoiceOver `R.strings.slash_command` | `DC/Entities/CommandEntity/SKCommandEntity.swift:34`; `SNAP/SKCommandEntitySnapshotTests/` (10) |
| SKEmojiEntity | an emoji autocomplete row: emoji ornament plus `:name:` | shared anatomy, small or medium | `DC/Entities/EmojiEntity/SKEmojiEntity.swift`; `SNAP/SKEmojiEntitySnapshotTests/` (1) |
| SKTokenBarEntity | an SKTokenBar as a row (for example the recipients in "New message"). There is no "To:" label in SlackKit. | margins 12/16/12/16, 12 pt spacing | `DC/Entities/TokenBarEntity/SKTokenBarEntity.swift:38-39`; `SNAP/SKTokenBarEntitySnapshotTests/` (4) |
| SKSingleLineTextInputEntity | an SKTextField row (forms) | margins 12/16/12/16; style `border` (1 pt `primary.outlinePrimary`) or `borderless`; placeholder `primary.contentTertiary`; September replaces `isSecureTextEntry` with `securitySupport` (`SKTextField.SecuritySupport`, `:48`, `:120`) | `DC/Entities/TextInput/SingleLine/SKSingleLineTextInputEntity.swift:79-106`; `SNAP/SKSingleLineTextInputEntitySnapshotTests/` (12) |
| SKMultiLineTextInputEntity | an SKTextInput row | style `border`, `errorBorder` (`important.outline` since September 2026, `:78`; June `sk_raspberry_red`) or `borderless`; inner insets 12/16/12/16; font `SKFont.body`; placeholder `contentTertiary`. September adds `characterLimit` (Unicode scalars; typing and pastes are clamped to whole graphemes, and once half the limit is used a `"count / limit"` counter shows at the bottom right in `SKFont.caption` `contentTertiary`, `important.content` at the limit, 4 pt below the text) and `scrollBehavior` (`.disabled` grows to fit, `.maximumHeight(h)` then scrolls) (`:51-54`, `:83-91`; `MultiLineTextInputEmbeddableViewController.swift:40-46`, `:136-158`, `:216-254`, `:297-302`) | `DC/Entities/TextInput/MultiLine/SKMultiLineTextInputEntity.swift:57-128`; no snapshots |
| SKLoadingEntity | skeleton row | see "Feedback, empty and loading states" | |

**SKEntitiesListAdapter** (`DC/Entities/SKEntitiesListAdapter*.swift`) maps these entity presentation objects and their
actions into SKList rows. It has no visuals of its own.

---

# Lists (CoreComponents/List)

## SKList (SKEntitiesList)

**Purpose.** SlackKit's list: a UICollectionView-backed, diffed list of sections. Each section has a header, rows
(entities or custom views) and a footer, plus built-in loading and empty states, pagination, pinned headers, collapse,
swipe actions, keyboard handling and top/bottom drawers. `SKEntitiesList` is the playground name for SKList fed by
entities.

**Source.** `CC/List/SKList.swift` (3.2K lines), `SKListPresentationObject.swift` (sections :107-161, options ~:417),
`SKListCellPresentationObject.swift`, `Layout/SKListCollectionViewLayout.swift`. Tests:
`TST/CoreComponents/List/SKListSnapshotTests.swift`. Playground: `PG/DesignerComponents/List/`.

**Snapshots** (`SNAP/SKListSnapshotTests/`): `testContentOneSectionWithBackground@3x.png`, `testEmptyState@3x.png`,
`testLoadingState@3x.png`, plus the transparent and no-background variants and `testEmptyContentFillsRemaining`.

**API** (`SKListPresentationObject.swift:33-161`)
- `sections: [Section(uniqueId, rows, hasRowSeparators = false, header = .default, footer = .hairlineDivider(hidesWhenLastRow: true, hasPadding: true), collapseBehavior = .unsupported, sectionHeaderPinningBehavior = .none)]`
- `Section.loading(SKLoadingState.PO)` and `Section.empty(SKEmptyState.PO)` are one-row sections that fill the list.
- `options` (pagination, scroll anchoring, content fit), `topDrawer` / `bottomDrawer`,
  `headerEmbeddable` / `footerEmbeddable`.
- Section header: `none`, `default`, `blankDivider(hidesWhenFirstRow:)` or `content(SKHeaderEntity…)`
  (`Header/SKListHeaderPresentationObject.swift`).
- Section footer: `none`, `blankDivider(hidesWhenLastRow:)`, `hairlineDivider(hidesWhenLastRow:, hasPadding:, color: primary.outlineTertiary)`,
  `emphasized(hidesWhenLastRow:)` (`Footer/SKListFooterPresentationObject.swift`).
- Collapse: `unsupported` or `supported(isCollapsed:)`. Header pinning: `none` or `pinToTop`.
- Rows: any entity through `ListRowContent`, with per-row `accessories`, `longPressAction`, `swipeActions`,
  `isEnabled`, `selectionState` (`selected` / `unselectable` / default) and `focusState` (`focused`)
  (`SKListPresentationObject.swift:194-261`, `Cells/SKListCollectionViewCell.swift:541-561`).

**Background.** Rows, headers and footers use the list's `cellSupport.backgroundColor`, defaulting to
`primary.basePrimary` #FFFFFF / #1A1D21 (`Cells/SKListCollectionViewCell.swift:276-280`, `Header/SKListCollectionViewHeader.swift:104`).

## SKList separators, headers and footers

| element | look | cite |
|---|---|---|
| row separator (only when `hasRowSeparators`) | a 1 px hairline in `primary.outlineTertiary` #5E5D60 @13% / #797C81 @30% at each row's bottom edge, full row width | `Decoration/SKListRowSeparatorDecorationView.swift:13`, `:33`; `Layout/SKListCollectionViewLayout.swift:206-212` |
| section footer `hairlineDivider` (default) | **8 pt** of list background, with a 1 px `outlineTertiary` hairline on its bottom edge. The hairline is hidden on the last section. Without padding it is just the 1 px hairline. | `Footer/SKListFooterView.swift:18-20`, `:50`, `:61-78`, `:106-112`; `SKList.swift:2092-2099` |
| section footer `emphasized` | a **12 pt** `primary.baseSecondary` #F8F8F8 / #1A1D21 band with hairlines at top and bottom | `SKListFooterView.swift:20`, `:63-67`; `SKList.swift:2101-2106` |
| `blankDivider` header or footer | empty space, no line | `Header/SKListBlankDividerView.swift` |
| pinned section header | while pinned it gets a shadow: black, opacity 0.12, radius 5, offset (0, 2) | `Header/SKListCollectionViewHeader.swift:64-83` |
| section header content | SKHeaderEntity (see its section) | |
| other dividers (outside SlackKit) | the message-transcript and date divider `MKDivider` (`Modules/UIInfra/MessageKit/Implementation/MKDivider.swift`) and the Block Kit divider `BKDividerBlockView` (`Modules/UIInfra/BlockKitComponents/Implementation/Blocks/Divider/BKDividerBlockView.swift`). Not specified here. | |

## SKList row cell (pressed / selected)

**Source.** `CC/List/Cells/SKListCollectionViewCell.swift:215-241`, `SKListCustomCollectionViewCell.swift:110-130`,
`PresentationObject/SKListRowHighlightStyle.swift` (`highlightColorOverride`).

- **Pressed:** the entity's highlight layer takes the highlight color (see "Entity row anatomy": default
  `primary.baseSecondary`, rounded 12 pt or full bleed). The row content also **shrinks by 8 pt** in its longest
  dimension, scale = (L − 8) / L (0.98 for a 393 pt row), with the shared bounce timing (down 0.2 s, up 0.4 s,
  no overshoot). There is no bounce when the row is swipeable, or for "fully selected" rows (`:219-236`).
- **Selected / focused:** `selectionState` and `focusState` pass through to the entity (focused = `sk_pale_yellow`
  highlight).

## SKList row accessories (trailing controls)

**Source.** `CC/List/Accessories/SKListCellAccessory.swift:14-477` (types), `SKListRowAccessoryStackView.swift:20-966`
(rendering), `AccessoriesBuilder.swift`. Accessories sit at the trailing edge of an entity row, **8 pt** apart by default
(`SKListRowAccessoryStackView.swift:775`). Each has a tap target extended by 12 pt on all sides (`:26`, `:856`).

| accessory | renders as | size | color / copy |
|---|---|---|---|
| `chevron` | `.svgCaretRightFull` (`caret_right_full.svg`) | 20 | `primary.contentSecondary` #454447 / #B9BABD (`:78`) |
| `grabber` (reorder) | `.svgReorder` | 20 | `contentSecondary` (`:85`) |
| `more` | SKIconButton `.svgEllipsisHorizontalFilled` | 20 | `contentSecondary` (`:96-97`); VoiceOver `R.strings.more` |
| `delete(color)` | SKIconButton `.svgClose`, size `.accessory` (20) | 20 | default `contentSecondary` (`:117-128`); VoiceOver `R.strings.delete` |
| `toggleSwitch(isOn)` | SKSwitch | 61 × 28 (the iOS 26 UISwitch since September 2026; June's custom switch was 51 × 31) | value `R.strings.on` / `off`; action `R.strings.toggle_switch` |
| `checkbox(isOn)` | SKCheckbox | 21 × 21 | `R.strings.checked` / `unchecked`; action `R.strings.toggle_checkbox` |
| `radioButton(isOn)` | SKRadioButton | 20 × 20 | action `R.strings.select_radio_button` |
| `button(SKButton.PO)` | an SKButton (any style or size); more than one allowed | intrinsic | fires `buttonTapped(sourceView, buttonIndex)` (`:245-262`) |
| `icon(SKIcon.PO)` | an SKIcon | 20 | as given |
| `badge(SKBadge.PO)` | an SKBadge (count, text, tag); several allowed | intrinsic | |
| `spinner(SKSpinner.PO)` | an SKSpinner | size | VoiceOver `R.strings.loading` |
| `emoji(SKEmoji.PO)` | an emoji | intrinsic | |
| `iconButton(SKIconButton.PO)` | an SKIconButton | size | |
| `huddleFacePile(PO)` | SKHuddleFacePile | intrinsic | `R.strings.participants_in_huddle[_singular]` ("%@ huddle participant"…) (`:797-802`) |
| `dot(SKDot.PO)` (September 2026) | an SKDot, the small status / unread dot | 16 (a 12 pt circle) | decorative unless labeled (`SKListCellAccessory.swift:43-44`, `:480-490`; `SKListRowAccessoryStackView.swift:149-154`, `:321-323`) |

Since September 2026 a row with any toggle-style accessory (switch, checkbox, radio) acts as a toggle button: VoiceOver
gets the `.toggleButton` trait, the accessory state as the row's value, and no separate accessory action; and such a
row may not also hold another interactive accessory (`delete`, `more`, `badge`, a second toggle, the face pile;
`button` and `iconButton` are legacy exceptions, `SKListCellAccessory.swift:46-66`, `:117`;
`SKH/EntityViews/SKEntityBaseView.swift:174-206`, `:376-395`).

## SKList swipe actions

**Source.** `CC/List/SwipeableContentDecorator/SKSwipeActions.swift:11-69`, `SKSwipeableContentDecorator.swift:21-488`,
`SKSwipeToActionGestureRecognizer.swift:14-128`.

**API.** `SKSwipeActions`: `.left(action)`, `.right(action)` or `.both(left:right:)`. `SKSwipeAction(uniqueId, icon,
activeIcon, iconPosition = .left, label, backgroundColor, foregroundColor, dismissalStyle = .bounceBack)`.

**Look and behavior.**
- The revealed area behind the row is filled with the action's `backgroundColor`. It contains an SKButton size medium
  in `.default(textColor: foregroundColor)` style, with the icon and label. The icon switches to `activeIcon` once past
  the threshold (`:374-418`).
- The trigger threshold is **40 % of the row width**. Past it, the drag rubber-bands:
  `threshold + 2·√(overshoot)`. Release uses a velocity projection of 0.05 s (`SKSwipeToActionGestureRecognizer.swift:24-33`,
  `:107`, `:123-128`).
- Crossing the threshold fires a `selectionChanged` haptic (`SKSwipeableContentDecorator.swift:291`).
- While swiping, the row content gets a 12 pt corner radius and a shadow (black, radius 4, offset 0; the shadow path
  uses the 12 pt radius) (`:81-95`, `:126`, `:481-488`).
- The row background turns `important.baseInverse` @25% when prepared for deletion (September 2026; June
  `sk_raspberry_red` @25%; see "Entity row anatomy").
- New in September 2026: swipes that begin within **25 pt** of either edge are ignored, leaving them to navigational
  edge swipes, judged by where the finger first landed rather than where the pan was recognized
  (`SKSwipeableContentDecorator.swift:18`, `:521-527`; `SKSwipeToActionGestureRecognizer.swift:47`, `:93-101`).

## SKList bottom and top drawers (brief)

`CC/List/BottomDrawer/*` pins embeddable views (for example a composer) above or below the list. Dragging dismisses the
drawer past **200 pt/s** of velocity in the drawer's direction. The drawer continues at that velocity and fades out over
**0.25 s**, linear. Movement is damped within 15 pt (`PanDismissalHandler.swift:12-19`, `:119-160`). `Drawer.margin` and
`hasScrollEdgeEffect` come from `SKListPresentationObject.swift:94-96`. Corner masking and radii: not found (looked in
`ListDrawerMaskedContainerView.swift`, `ListDrawerView.swift`).

September 2026: the list's bottom inset is owned by a new `Accounting/BottomContentInsetAccounting.swift` (keyboard
height + drawer height + the pin-to-top reservation; a drawer can opt out of the bottom safe area while the keyboard
is hidden, `ignoresBottomSafeAreaWhenKeyboardHidden` `:36-40`, `:278`, used by the unified-navigation composer), and
`BottomDrawer/ComposerStateCoordinator.swift` shares the composer's compressed / expanded state and its recommended
capsule insets with sibling drawer items so their capsules match the composer's width.

## SKRecyclerView, SKEmbeddableView, SKScrollEffect (building blocks)

- **SKRecyclerView** (`CC/RecyclerView/SKRecyclerView.swift`, `Helpers/SKLayoutCalculator.swift:18-20`): a lightweight
  horizontal or vertical stack of recycled SlackKit components. It takes `spacing`, `customSpacingAfter` and an axis
  alignment, and sizes items statically. It powers button rows, reaction bars and loading lists.
  **Snapshots:** `SNAP/SKRecyclerViewSnapshotTests/` (16 layout cases).
- **SKTruncator** (`DevC/Truncator/SKTruncator.swift`, `SKTruncatable.swift`, new in September 2026): wraps an
  `SKTruncatable` view (SKLabel, SKRecyclerView) and collapses it to `preferredHeight` with a Show more / Show less
  control (`Truncation.unsupported` or `.supported(state: .expanded / .collapsed, preferredHeight)`). A truncatable
  recycler keeps the leading items that fit, truncating the first overflowing one if it can shrink, and always keeps
  the first item (`CC/RecyclerView/SKRecyclerView+SKTruncatable.swift:9-17`). Snapshots:
  `SNAP/SKTruncatorSnapshotTests/testTruncatesLabelToFitAllowance`, `SNAP/SKTruncatingRecyclerSnapshotTests/`
  (collapsed with Show more, expanded with Show less).
- **SKCardDecorator** (`DevC/CardDecorator/SKCardDecorator.swift`, new in September 2026): puts any statically sized
  component in a card: radius 12 (continuous), a 1 pt `primary.outlineTertiary` border, 12 pt insets on all sides.
- **SKEmbeddableView** (`CC/ListEmbeddable/SKEmbeddableView.swift`): hosts a view controller ("embeddable") as a list
  row, for example text-input entities. No visuals of its own.
- **SKScrollEffect** (`CC/ScrollEffect/*`): a protocol for changing a component's presentation object as the list
  scrolls. `SKScrollEffectValue.percentTopInsetVisible(scaleFactor:)` = 1 − clamp((inset.top + offsetY) /
  (scale × inset.top)) (`SKScrollEffectValue.swift`). It is used for collapsing headers. SlackKit ships no concrete effect.

---

# Tabs, reactions and menus

## SKTabBar (tabs / segmented control)

**Purpose.** A horizontally scrolling or evenly split tab strip with three looks: an underline indicator (the default,
used by SKPageController), a pill background behind the selected tab, and outlined pill buttons. Tabs can have an
icon, image or emoji, a count, a badge, a dot or a label ornament.

**Source.** `DC/TabBar/SKTabBar.swift`: `Constants` :22-28, indicator layout :119-143, style config :186-207, heights
:301-307, width modes :447-477, PresentationObject :629-799. `DC/TabBar/TabBarCollectionViewCell.swift`: `Constants`
:35-52, style per display :270-288, title/count/icon colors :354-429, press :504-524. Tests:
`TST/DesignerComponents/TabBar/SKTabBarSnapshotTests.swift`.

**Snapshots.** `SNAP/SKTabBarSnapshotTests/` (10 files). The underline style in context is
`SNAP/SKPageControllerSnapshotTests/testFirstPage@3x.png`: four equal tabs, the first bold and dark, the others regular
gray, with a green 4 pt underline under the first.

**API** (`SKTabBar.swift:629-799`)
- `tabs: [Tab(title, ornament: none / label(String) / badge(Int, maxCount: 99) / dot, leading or trailing icon, image or emoji, backgroundColor = primary.basePrimary)]`
- `selection`: `single(progress: CGFloat?)` or `multiple(indices:)`
- `displayStyle` (`:722-725`):
  - `underline(underlineColor = highlight2.baseInverse)` (#007A5A / #177E56 since September 2026, `:722`; June
    `sk_lilypad_green`). The bar's own underline view starts in the same color (`:87`). Themed lists pass the theme's
    `baseInverseHighlight1` (`ListThemeOptions.swift:80`).
  - `pillBackground(selectedBackgroundColor, textColor, selectedTextColor, verticalSpacing = 9, horizontalSpacing = 6, cornerRadius = 10, animateSelection)`
  - `pillButton(selectedBackgroundColor, textColor, selectedTextColor, borderColor)`
- `widthMode`: `fitToBar` (equal widths) or `fitAllContent` (intrinsic widths; on compact width the leftover space is
  shared out equally) (`:447-477`, `:745-749`)
- `backgroundColor = primary.basePrimary`, `contentInset`
- Actions: `tabTapped(index)`, `menuShown`, `menuActionSelected`, `multipleSelectionChanged`

**Layout.**
- Bar height **48** for underline and pillBackground, **54** for pillButton (`:301-307`).
- Underline: **4 pt tall, radius 2**, `highlight2.baseInverse` by default, as wide as the selected tab, flush with the
  bottom. While swiping pages it moves
  and resizes, interpolated between tabs (`:23-27`, `:87-89`, `:119-126`, `:356-361`).
- pillBackground: a pill inset 9 top and bottom and 6 left and right inside the selected tab, radius 10. It animates
  0.25 s ease-in-out when `animateSelection` (`:127-143`).
- Tab content: title, count and icon 4 pt apart (`Spacing.small`) with 10 pt horizontal padding. The pressed
  "selection view" is inset 6/4/6/4 for underline, 9/6/9/6 for pill background, and 9/4/9/4 for pill buttons, radius 10
  (`TabBarCollectionViewCell.swift:36-46`).
- Pill buttons: 88–200 pt wide, 16 pt horizontal padding, 1 pt border, radius 10 (`:38-43`, `:282-288`).
- Dot ornament: 8 pt `important.baseInverse` #E01E5A / #D3305D (`:50`, `:81-82`).

**Type and color** (`TabBarCollectionViewCell.swift:354-429`)
- Title: selected `SKFont.smallBodyBold`, unselected `SKFont.smallBody` (Lato Bold / Regular 15, both capped at 20 pt
  for Dynamic Type) (`:48`, `:379`).
- Count: `smallBody`.
- Underline style colors: title, count and icon go from `primary.contentSecondary` #454447 / #B9BABD (unselected) to
  `primary.contentPrimary` #1D1C1D / #F8F8F8 (selected), blended continuously by selection progress
  (`UIColor.blend`, `:373`, `:395`, `:418`).
- Pill styles blend `textColor` → `selectedTextColor`.
- Pressed background (selection view): underline `primary.baseSecondary`, pillBackground white @13%, pillButton its
  `selectedBackgroundColor` (`:276-286`). Since September 2026 a pill button's selected background follows the
  selection progress (shown above 0.5, `selectionProgressThreshold`) rather than the cell's `isSelected`, so it flips
  halfway through a swipe like the title weight does (`TabBarCollectionViewCell.swift:51`, `:285`, `:509`).
- September 2026 also respects the safe area: the scroll-to-selected offset centers within the insets
  (`SKTabBar.swift:381-386`), and on regular-width (iPad) bars the left-aligned tabs are inset by it (`:558-563`).

**Behavior.** Pressing shows the selection view and bounces to **0.96** (`:49`, `:509-524`). Selecting fires the
`selectionChanged` haptic (`SKTabBar.swift:550`).

## UITabBarItem icons (bottom tab bar)

`CC/Icon/UITabBarItem+Icons.swift`: `UITabBarItem(title:icon:selectedIcon:)` renders SKIconManifest icons at **25 × 25**
for the system tab bar. Titles are Lato Bold 11 (`SLAppearance.swift:45`). **Snapshot.** `SNAP/UITabBarItemIconsSnapshotTests/`
(1 file, plain `SnapshotTestCase`).

## SKReacjiPill (reaction pill)

**Purpose.** The emoji reaction chip under a message: emoji(s) plus a count. It is highlighted blue when you have
reacted, and there is an "add reaction" variant.

**Source.** `DC/Reacji Pill/SKReacjiPill.swift`: `Constants` :36-45, `Style` :47-56, content :170-210, sizing :212-240,
border and press :286-340, label :370-375, variants :405-420. `ReacjiAnimationHelpers.swift`. **Snapshots**
(`SNAP/SKReacjiPillSnapshotTests/`)
- `testReacjiPill@3x.png`: 59.3 × 30.
- `testReacjiPillSelected@3x.png`.
- `testReacjiPillMultiEmojiSelected@3x.png`.

Others: NoEmoji (count only, 35.3 wide), MultiSkinToneEmoji and Truncated.

**API.**
- `reactions: [.emoji(metadata) | .icon(SKIconManifest)]` (up to **6** variants visible, then "… %d" from
  `R.strings.ellipsis_with_count`)
- count text, `selected: Bool`, state `enabled` / `disabled`
- Actions: tap (`add(index)` / `increment(index)`), long-press

**Layout** (`:36-45`)
- Height **30** = 22 pt emoji + 4 + 4. Insets 4 top and bottom, 8 left and right. 2 pt between items. The count label
  has 2 pt side insets.
- Fully rounded (radius = height / 2) (`:107`). Emoji and icons are drawn at 22 × 22 (`:179`, `:191`).

**Type.** Count: `SKFont.captionBold` (Lato Bold 13). `primary.contentPrimary` normally, `highlight1.content`
#1264A3 / #2BA5CE when selected (`:48-50`, `:373`).

**Color by state** (`:47-56`, `:312-317`)

| | normal | pressed | selected | selected + pressed |
|---|---|---|---|---|
| background | `primary.surfacePrimary` #1D1C1D @6% / #F8F8F8 @6% | `primary.surfaceSecondary` @25% | `highlight1.surface` #36C5F0 @13% / #036696 @25% | `highlight1.surface.darken(0.2)` → #2B9EC0 @30% / #025278 @40% |
| border | none | none | **2 pt** `highlight1.outline` #1264A3 / #2BA5CE | same |

**Behavior.**
- Pressing bounces to **0.94** (`:43`, `:330-334`). A long-press fires after **0.25 s** (`:44`).
- Toggling selection animates the border width and color with a snappy spring (perceptual 0.25 s, bounce 0.15)
  (`:286-308`). Toggling also fires the `selectionChanged` haptic (`:264`).

## SKReacjiBar

**Purpose.** A wrapping row of reaction pills under a message, with an optional trailing "add reaction" pill and collapse
("Show N more" / "Show less").

**Source.** `DC/Reacji Bar/SKReacjiBar.swift`: `Constants` :25-28, layout :372-452, extra pills :557-582, collapse
:622-632. **Snapshots** (`SNAP/SKReacjiBarSnapshotTests/`)
- `testReacjiBarWithAddReacjiPill@3x.png`: 20 pills in 4 rows. The first is selected (blue ring). The trailing pill is
  the add-reaction face-plus icon.
- `testReacjiBarTruncated@3x.png`.
- `testReacjiBarExpanded@3x.png`.

**Layout and behavior.**
- 8 pt between pills and 8 pt between rows (`:26-27`).
- The add pill uses `.svgAddReaction` (`add_reaction.svg`) (`:563`).
- Collapse: `supported(isCollapsed:, maximumCollapsedRowCount: 2)` (`:627-629`). When collapsed, a "`R.strings.show_number_more`"
  pill ("%@ more") appears; when expanded, `R.strings.show_less` "Show less" (`:569-578`).
- VoiceOver: "View Reactions" (`view_reactions`), "Add Reaction" (`add_reaction`), and add or remove custom actions
  (`:300-336`).

## SKMediaReactionsView (developer component)

`DevC/MediaReactionsView/SKMediaReactionsOverlayView.swift:24-30`: emoji float over media. Each one starts at alpha 0 and
scale 0, overshoots to 1.3×, and the whole run lasts 2.25 s. Start delays are random, up to 2 s. A 1 s rotation starts
after 2 s.

## SKMenu (developer component)

**Purpose.** A value-type description of a native `UIMenu` (context or pull-down menu) used by SKButton, SKIconButton,
SKPillButton, SKTokenView and SKHeaderEntity. It renders as the system iOS menu.

**Source.** `DevC/Menu/SKMenu.swift`: attributes :46-55, ornaments :63-102, items :176-182.

**Items.** `action(uniqueId, title, subtitle?, icon?, attributes, state)`, `section(title, subtitle, icon, menuItems)`,
`submenu(uniqueId, title, subtitle, icon, menuItems)` (the `uniqueId` is new in September 2026, so a collapsible submenu
keeps its identity when items move, `:180`), `deferred(uniqueId, provider)` (`:176-182`). Attributes: `destructive`,
`disabled`, `hidden`, `keepsMenuPresented`. Member-avatar ornaments are now created at their final size
(`:93-95`).

**Ornaments.** Icon 20 × 20, workspace avatar 24 × 24, emoji 24 × 24, or `listChoiceCircle(borderColor, fillColor)`:
a 20 pt circle with a 1 pt border (`:63-66`, `:149-156`).

**Visuals** are the system menu (SF font, system blur). A web prototype should imitate the iOS context menu.

## SKPipeDecorator and PipedTextPreview (developer components)

- **SKPipeDecorator** (`DevC/PipeDecorator/SKPipeDecorator.swift:12-96`): wraps any component with a left "quote pipe".
  The bar is 4 pt wide and fully rounded, in `primary.outlineTertiary` by default. Content is inset 4 top and bottom,
  12 left.
- **PipedTextPreview** (`DevC/PipedTextPreview/PipedTextPreview.swift:16-90`): a primary text and a prompt text stacked
  2 pt apart inside a pipe decorator (for example, previews of quoted or shared messages). **Snapshots:**
  `SNAP/PipedTextPreviewSnapshotTests/` (2).

---

# Core primitives (CoreComponents)

## SKLabel

**Purpose.** SlackKit's text view for all rich text: fonts and colors per span, links, mentions, emoji, code, and an
optional "Show more / Show less" fold. Every other component renders text through it.

**Source.** `CC/Label/SKLabel.swift` (1.1K lines; show-more button :1041-1059), `CC/Label/SKLabel+PresentationObject.swift`
(line breaking :14-29), `SKF/Label/SKLabelPresentationObject.swift` (props :12-70, folding :285-325),
`SKX/TextAttributes+Display.swift` (defaults :14-40), `SKX/Text+HighlightColors.swift`, `SKX/Text+DisplayCodeBlock.swift`.
**Snapshots.** `SNAP/SKLabelSnapshotTests/` (53), for example `testHighlightText@3x.png` and `testHighlightedText@3x.png`;
new in September `testOpaqueBlockChip@3x.png` (an opaque rich-text block drawn as an inline chip).

**API** (`SKLabelPresentationObject.swift:55-70`)
- `text: Text` (spans with attributes)
- `numberOfLines = 0`, or `contentFolding: .unsupported(numberOfLines:)` / `.supported(state: collapsed / expanded, collapsedNumberOfLines, expandedNumberOfLines)`
- `isInteractionEnabled = true` (it only takes effect when the text has links or a fold)
- `isHeader`, `supportsJumboEmoji`, `enableLongPressForEmoji`, `textInteractionMode`, `accessibilityIdentifier`
  (September)

**Defaults and rules.**
- A span without a font is `SKFont.body` (Lato Regular 17). Bold, black and italic come from the matching equivalents.
  A span without a color is `primary.contentPrimary` (`TextAttributes+Display.swift:20-40`).
- Plain labels truncate the tail with "…". Labels that need text-view rendering (links, selection) wrap by word
  (`SKLabel+PresentationObject.swift:15-20`).
- Inline code: Menlo 13 (capped at 20) in `primary.contentPrimary` #1D1C1D / #F8F8F8 since September (June
  `sk_primary_foreground`, #D1D2D3 in dark) (`TextAttributes+Display.swift:14-17`). Message rendering tints code
  #E01E5A / #E8912D (`message_rendering_code`). Preformatted text is `primary.contentPrimary` too
  (`Text+Display.swift:147`), and a code block keeps its language as an attribute (`:157-162`).
- Code blocks: 12 pt indent for rich preformatted text, 15 pt for quotes, a 4 pt language header gap, an 8 pt gutter,
  line height × 1.15 (`Text+DisplayCodeBlock.swift:22-29`).
- Mentions: `message_rendering_mention_text` #0B4C8C / #1D9BD1; an unavailable mention is `primary.contentSecondary`
  since September (`Text+Display.swift:602`; June `sk_foreground_max_solid`). Self-mentions and search highlights use
  `highlight3.surface` #FFC600 @18% / #A07300 @18% behind the text, and `highlight3.content` #DEA700 as the dark-mode
  foreground (`Text+HighlightColors.swift:12-23`).
- New rich-text blocks in September (`Text+Display.swift:224-292`): **headings** (`.header(level, spans)`) in
  `Text.Consts.headerFont(forLevel:)`: level 1 `SKFont.headline` (Lato Black 28), 2 `title` (Black 22), 3+ `subtitleBold`
  (Bold 20); with the `flatMessageHeadingScale` toggle `subtitle` / `bodyBlack` / `bodyBold` (`:49-62`). **Opaque blocks**
  render as an inline `SKCompactAttachment` chip (title, subtitle, icon). **Dividers** are a full-width line attachment
  tinted with the block's text color. File citations gained " · " separators and a "File" label
  (`R.strings.file_citation`, `:1287-1324`).
- Fold button: an SKButton `.systemDefault(isPadded: false)`, size small, labeled `R.strings.show_more` "Show more"
  (or the fold options' `expandTitle`, September) or `show_less` "Show less" (`SKLabel.swift:1041-1059`).

## SKIcon

**Purpose.** Renders one SKIconManifest glyph: an SVG from `Icons.xcassets`, tinted, or a legacy icon-font character.

**Source.** `CC/Icon/SKIcon.swift` (intrinsic size :27, tint :141-161, font icons :168-178), `SKIcon+PresentationObject.swift`
(:14-60), `SKIcon+Extensions.swift`, `SKIconManifest+Extensions.swift`. `Modules/Data/Icon/Implementation/SKIconStyle.swift`
has `filled` / `unfilled` for file-type icons. **Snapshots.** `SNAP/SKIconSnapshotTests/` (6).

**API.** `icon`, `scaleFactor = 1.0` (scales the glyph inside its frame), `color` (nil: multicolor SVGs keep their own
colors, others get the default tint), `isSelectable`.

**Layout and color.**
- Intrinsic size **20 × 20** (`SKIcon.intrinsicSideLength`). Owners set other sizes with constraints (12, 16, 24, 36…).
- The default tint is `primary.contentPrimary` (`:159`, `:178`).
- On the web: inline the SVG from `Icons.xcassets/<name>.imageset/<name>.svg` (20 × 20 viewBox, black fill) and apply
  the color with `fill: currentColor` or a CSS mask.

## SKEmoji

**Purpose.** Draws a native (unicode) or custom (image) emoji. **Source.** `CC/Emoji/SKEmoji.swift`: intrinsic 20 × 20
(`:22`, `:75-92`); a unicode glyph is drawn at 14/20 of the frame side and grown to fill (`:25`, `:183-192`).
`SKEmoji+PresentationObject.swift`: `native(unicode)` or `custom(imageSource, hasPlaceholder)`, color mode
`default` / `grayscale`, display mode, skin tones through `TextEmoji` (`:23-80`). **Snapshots.**
`SNAP/SKEmojiSnapshotTests/` (5).

## SKImageView and SKRetryableImageView

**Purpose.** Async image loading with a placeholder, corner radius, masks, transforms (for example grayscale) and GIF
support. The retryable variant adds loading, refresh and error states.

**Source.** `CC/ImageView/SKImageView.swift`: `Constants` :80-88, radius :211-229, PresentationObject :641-725.
`CC/ImageView/SKRetryableImageView.swift`: :27-28, :196-218. **Snapshots.** `SNAP/SKImageViewSnapshotTests/` (3),
`SNAP/SKRetryableImageViewSnapshotTests/` (4).

**Values.**
- Placeholder background `primary.baseTertiary` #EAEAEA / #212428 (`:82`).
- Corner radius: `.proportional` = **0.25 × side** (10/40), `.custom(r)` or `.none`. Corner curve `.continuous` by
  default (`:85-93`, `:213-228`, `:683`, `:704`).
- Image fade-in 0.2 s (0.4 s for GIFs) (`:83-84`). The error icon is 30 pt.
- Retryable: a loading icon 32 × 32, a refresh SKPillButton `.svgRefresh` in `primary.basePrimary`, and an error
  `.svgWarningFilled` 30 pt in `primary.surfaceSecondary` (`SKRetryableImageView.swift:27-28`, `:206-218`).
- `anchor: ImageContentAnchor` (September 2026, default `.center`; `:644`, `:663`, `:698`, `:715`): for aspect-fill
  images, which edge or corner the crop keeps. The view sets its layers' `contentsRect` to
  `anchor.contentsRect(imageSize:containerSize:)` (`:139-151`; `SKF/Image/ImageContentAnchor.swift:13-71`): the anchored
  edge stays and the other axis centers; `.center` leaves the default center crop. SKExpandedAttachment passes it
  through. On the web: `object-position` (`src/slackkit/SKExpandedAttachment.tsx` `anchorObjectPosition`). New
  snapshots: `SNAP/SKImageViewSnapshotTests/` grew from 3 to 11 (the anchors and full aspect fit of tall and wide
  images).

## SlackKit globals and helpers

- `SLAppearance` (nav bar, tab bar and search-bar appearance), bounce and spring timing, haptics: see "Shared behavior".
- `PaddedLabel` (`SKH/PaddedLabel/`): an SKLabel with insets and a background, used for adjacent tags (2/4/2/4 insets,
  radius 4).
- Gestures (`SKH/Gestures/`): the long-press state mapping (began or ended) and the Large Content Viewer long-press used
  by bar items, buttons and tabs.

---

# Outside SlackKit (brief)

The playground also registers components from other modules. They are listed here so the web library can include
them; the depth is lower.

## Modules/UIInfra/DeveloperComponents (`UDC/`)

Snapshots are under `Modules/UIInfra/DeveloperComponents/Snapshots/iOS_26/DeveloperComponentsTests.*/`. In September
2026 two of these moved into their own modules: the navigation title views to `Modules/UIInfra/NavigationController/`
(`Implementation/ConversationNavigationTitleView.swift`; snapshots `NavigationControllerTests.HeaderTitleViewSnapshotTests`,
`SKNavigationItemTitleView[UIKit]SnapshotTests`, `SKNavigationToolbarSnapshotTests`) and the blocker modal to
`Modules/UIInfra/BlockerViews/` (`Implementation/Views/BlockerModalViewContentHeaderCell.swift`; snapshots
`BlockerViewsTests.BlockerModalViewControllerSnapshotTests`, 10).

| component | key facts | source | snapshots |
|---|---|---|---|
| SKBottomSheet (presentation controller) | drag indicator 48 × 4, radius 2, `primary.baseTertiary`; the sheet background follows the presented view | `UDC/BottomSheet/PresentationController/SKBottomSheetPresentationController.swift:57`, `:175-176`, `:444-447` | none |
| SKCodeInput | digit boxes with radius 4 and a 1 pt border; 8 pt between groups; a 12 × 2 separator between groups | `UDC/CodeInput/SKCodeInput.swift:34-37`, `SKCodeInputElement.swift:33-37`, `SKCodeInputContainer.swift:21-22` | `…SKCodeInputSnapshotTests/testGroupedLayout@3x.png`, `testSplitLayout@3x.png` |
| SKDialog / SKDialogViewController | image 162 pt tall with radius 8; label spacing 4, step spacing 12, button spacing 16, step→button 28, components 20; 1 pt separators | `UDC/Dialog/SKDialog.swift:272-279` | `…SKDialogSnapshotTests/testDialog@3x.png`, `testDialogFullscreenWithFlexibleSpace@3x.png` |
| SKInformationCard | card radius 12, padding 14; image 48 × 48; title `bodyBold`, subtitle `smallBody`, 2 pt apart; shadow 0.1, radius 3, offset (0, 2); background `basePrimary` | `UDC/InformationCard/SKInformationCard.swift:21-31`, `:70-107` | none |
| SKNavigationController / conversation title | title-info background `primary.containerSecondary`; member avatar 36 pt; 4 pt bottom padding | `Modules/UIInfra/NavigationController/Implementation/ConversationNavigationTitleView.swift:61-70`, `:453-464` (moved in September 2026) | `NavigationControllerTests.HeaderTitleViewSnapshotTests/` (title, subtitle, avatar, workspace avatar, private channel, liquid-glass capsule) |
| SKSearchView | insets 16 horizontal and 12 vertical, 12 pt spacing, optional Cancel and separator | `UDC/SearchView/SKSearchView.swift:24-26` | `…SKSearchViewSnapshotTests/testSearchViewWithCancelAndSeparator@3x.png` (and 2 more) |
| SKTabButton | a 48 × 48 icon box with radius 14 and a 28 × 28 icon; 6 pt badge dot with 6 pt padding; 2 pt above the label; bounce 0.85 | `UDC/TabButton/SKTabButton.swift:24-30`, `:134-146` | `…SKTabButtonSnapshotTests/testHighlighted@3x.png`, `testHighlightedWithTitle@3x.png` |
| BlockerModalViewController | header 256 pt; image 200 pt with radius 16; background `primary.baseSecondary`; empty image `sk_soft_gray` | `Modules/UIInfra/BlockerViews/Implementation/Views/BlockerModalViewContentHeaderCell.swift:17-27` (moved in September 2026) | `BlockerViewsTests.BlockerModalViewControllerSnapshotTests/` (10, light and dark as separate files) |
| SKTappableLabel, SKJumpBarDecoratorViewController, StepView, GradientView, PaddedEmptyState, CenteredLabelRow, OnboardingDisclaimerOptInRow | not specified here (StepView: 12 pt number→text gap, `UDC/StepView/`) | `UDC/<Name>/` | |

## SKContextBar (Modules/UIInfra/ContextBarUI)

**Purpose.** The rounded context strip above the composer: Slack Connect "external people" warnings, typing indicator
with avatars, coachmarks, Slackbot limits. It has an icon or avatars, text, optional action buttons and a dismiss ✕.

**Source.** `Modules/UIInfra/ContextBarUI/Implementation/SKContextBar.swift`: `Constants` :34-53, `Style` :660-690,
`Content` :692-712; since September 2026 also `Views/ContextBarRowView.swift` and `Views/AgentStopButton.swift`. The
tokens are in `Modules/UIInfra/DesignTokens/Implementation/StandardPaletteColor+Extensions.swift:10-11`.
**Snapshots.** `Modules/UIInfra/ContextBarUI/Snapshots/iOS_26/ContextBarUITests.SKContextBarSnapshotTests/`
(30; 24 in June), for example `testContextBar_WithActionButtons_WarningStyle@3x.png`: a peach card, a warning icon, "Warning style
with action button", and an "Upgrade now" pill button.

**September 2026.** The bar was rebuilt on an `SKRecyclerView` (`:90`, `:228-310`): a header row
(`ContextBarRowView`: the icon or avatars, the wrapping label, and a trailing dismiss ✕ (30 pt) or, in the new
collapsible mode, a chevron-down / chevron-up that makes the whole header tappable, pressed alpha 0.75,
`ContextBarRowView.swift:19-22`, `:33`, `:146-158`), then optional **agent rows** (`Content.agentRows`, `:599-617`, `:696`:
an avatar, a label and an `AgentStopButton`, a 20 pt `primary.contentPrimary` circle with a 12 pt `.svgStopFilled` in
`basePrimary`, a spinner while the stop is pending, `R.strings.stop`; `AgentStopButton.swift:21-46`, `:100-112`), 12 pt
apart and 12 pt below the header (`:51-52`), then the action buttons. The old cross-fade on content changes and the
glass appearance animation are gone. New snapshots: `testActiveParticipants_*` (collapsed with agents and humans
folded, expanded with mixed stop states, a single agent, a long agent name) and `testDND_ShortUsername`,
`testDND_LongUsername_TwoLines`.

**Layout** (`:34-53`)
- Minimum height 36.
- Capsule layout: padding 6 top and bottom, 12 left and right, radius 16. Uniform (multi-line) layout: padding 12 / 16,
  radius 26.
- 8 pt horizontal spacing (now in `ContextBarRowView`) and 16 pt vertical spacing. Action buttons are 12 pt apart.
- Icon 12 pt in a 16 pt container with radius 3.2 (June's constants; September draws the icon in the header row).
  Avatars are an SKAvatarPile extraSmall (16). Dismiss button 30 pt.
- Font `SKFont.caption` (Lato 13). (June cross-faded content changes over 0.3 s; September doesn't.)

**Styles** (`:660-690`; text `primary.contentPrimary`, `contentInversePrimary` on coachmark)
- `neutral`: clear background.
- `warning`: `slack_connect_context_bar_default` = light `campfire_0` #FFF2E0, dark `campfire_5` #4B2200 (measured
  #FFF2E0).
- `highWarning`: light `campfire_10` #FBCC91, dark `campfire_20` #7B3A00 (`Colors.swift:842-864`).
- `coachmark`: `highlight1.baseInverse` #1264A3 / #0A77A7.
- `info`: `highlight1.base` #E3F8FF / #001A2D.

Legacy context-bar colors also exist: `context_bar_slack_connect` #E7F6F3 / #4CBF9D @12%, `context_bar_govslack`, and
`context_bar_govslack_warning` (`Legacy:365-367`).

## Tooltips (Modules/UIInfra/Education)

EDUTooltip lives in `Modules/UIInfra/Education/Implementation/EDUTooltip/` (608 lines). It is not part of SlackKit and is
not specified here (see "Tooltips and coachmarks" above).
