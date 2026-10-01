# DMs, Activity, message previews and the "You" lists (Threads, Catch up, Later, Drafts & sent, History)

> **Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Every citation below points at that checkout
> (`/Users/colson.rice/Desktop/Slack Mobile Code Base/slack-objc-latest`) unless marked June / [June] (cd22922).
>
> **What changed since June**
> - Tokens: the app pins design tokens `f76ac0a`: dark `highlight1.baseInverse` #0a77a7 (June #004d76),
>   `highlight2.baseInverse` #177e56 (#00553d), `important.baseInverse` #d3305d (#b41541), plus high-contrast values. Preview rows
>   and the iPhone list theme use `dt_*` tokens (`content_primary` names, `content_secondary` previews) instead of `sk_*` (§0, §1.1).
> - Preview rows: the unread dot is an `SKDot`; the timestamp follows the header accessory and centers on one-line
>   headers; thread shares get the quote spacing; group-DM count tiles are 20pt at `.verySmall` (§1.1, §1.2).
> - DMs: `iaNextDmsFilters`, `swipeActions`, `markAsUnreadAction` and `channelEmailAddress` are gone. The pills are the
>   only filters (the header filter menu and banner are deleted), swipe and "Mark Unread" are always on, every muted row
>   shows the muted icon, the long-press preview is always 350×450, and the header is Slackbot + avatar (no filter button).
>   New: no External pill and a "No direct messages yet" state for frontline workers, agent bots listed with
>   `agentsInDms` with an "AGENT" tag, "Copy DM Email" (§2).
> - Activity: `activityRowRedesign`, `activityInbox` and `ios_activity_views` are gone; the views filter bar and the
>   redesigned row are the only layout. Mark as Read / Unread and Clear / Restore are always in the menu, swipe is always
>   on (left = Clear), All also lists DMs, channel posts and saved reminders, a "New activity" pill; new toggles
>   `activityEntryLayoutRefinements`, `activityBetterIndicators`, `activityPriority`, `activityAgentStatus` (§3).
> - Threads: the title goes through the navigation title configurator; the elevator pill is a floating-action-button
>   pill with a caret or an arrow; a reply row anchors at the latest message (§4).
> - Catch Up: no onboarding cards; the card divider is `outline_tertiary` and its composer has the context bar; the
>   unified navigation opens `CatchUpRoute` (§5).
> - Later: Liquid Glass bar items; the To-do filter gains a sort; new `laterTodos` menu strings; Saved-tab rows have no
>   buttons; the emptied-list emoji cycles instead of being random (§6).
> - Drafts & Sent: `content_secondary` bodies, `surface_primary` icon tiles, and the generic "Something Went Wrong"
>   state on load failure (§7). History: no visible change (§8).

This spec covers:
- the DMs tab
- the Activity tab
- the shared message-preview row (`MKMessagePreview`) and the SlackKit pieces these screens share
- Threads, All unreads / Catch up, Later (saved items), Drafts & sent (with Scheduled) and the History menu

The root header (title bar, avatar, Slackbot and filter buttons) and the tab bar are covered by another spec. Here they
appear only where a screen configures them.

All paths are relative to the iOS repo root `slack-objc-latest` (slack-objc `main` @ `14b3cbaf`, 2026-09-30), and so
are the snapshot paths (the checkout's LFS PNGs). `Colors.swift` means the design-tokens file the Sept app pins,
`f76ac0a`, vendored at `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift` (June pinned `df1f228`). Line numbers in
the strings file refer to `Modules/Data/Strings/Implementation/localized_strings.yaml` @ 14b3cbaf (written "yaml:N", "LN"
or a bare number after a string). June (cd22922) line numbers appear only where marked [June].

---

## 0. Conventions used in this spec

### 0.1 Theme and color resolution

- **Theme on iPhone.** List chrome and badges on iPhone come from `ListThemeOptions.ia4Phone(colorSet:)`
  (`Modules/Integration/ThemesIntegration/Interface/ListThemeOptions.swift:65-87`). `ThemeService` chooses it for
  every iPhone, and for a non-compact iPad only when transparency is off and a themed sidebar backdrop is drawn
  (`Modules/Integration/ThemesIntegration/Implementation/ThemeService.swift:223-280`, `:236-239`). Since June every
  value is a dt token (June's legacy `sk_*` color in brackets):
  - `listBackgroundColor`, `vcBackgroundColor`, `alternateVcBackgroundColor` = `core.primary.basePrimary` [`sk_primary_background`]
  - `itemPrimaryForegroundColor` = `contentPrimary` [`sk_primary_foreground`]
  - `itemSecondaryForegroundColor` = `contentSecondary` [`sk_foreground_max_solid`]
  - `itemTertiaryForegroundColor` = `contentTertiary` [`sk_foreground_high_solid`]
  - `badgeStyle` = `.text(textColor: theme.contentInverseImportant, backgroundColor: theme.baseInverseImportant)`
  - `presenceColors` = `(active: theme.baseInverseHighlight2, away: core.primary.contentTertiary)`
  - `dividerColor` = `outlineTertiary` [`sk_foreground_low_solid`]
  - `primaryAdjacentLabelColors` ("APP" tags) = `contentSecondary` on `baseTertiary`; loading placeholders shimmer on
    `basePrimary`
- **Default theme.** With no `iaTheme` user pref, the theme is `ColorSet.defaultAubergine` (`ThemeService.swift:117`):
  primary, highlight1, highlight2 and important are all aubergine, with brightness 5 (`Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:19-25`, `:59`).
  Brightness ≥ 4 means `isSidebarInverted = true` (`ColorSet.swift:38`, `:60`).
- **Aubergine preset.** The theme-picker preset "Aubergine" differs in two ways: highlight2 = **jade** and brightness 6
  (`Presets.swift:40` in the design-tokens repo, next to `Colors.swift`). Only highlight2-derived colors change, which here
  means the "active" presence color.
- **How theme colors resolve.** `DefaultThemeColorSet` builds each theme color as `UIColor(light: X, dark: Y)`, where X and
  Y are palette ramps. Palette colors are themselves dynamic, so light mode uses X's light value and dark mode uses Y's
  dark value.
- **Theme colors used in this spec** (sidebar inverted; `Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift`):

| Theme property | Formula (line) | defaultAubergine light / dark | Aubergine preset, if different |
|---|---|---|---|
| `theme.baseInversePrimary` | light `primary._100`, dark `primary._0` (:80-82) | #39063a / #200221 | |
| `theme.baseInverseSecondary` | light `primary._80`, dark `primary._10` (dark high contrast `primary._5`) (:83-86) | #611f69 / #431349 | |
| `theme.baseInverseHighlight1` | light `h1._80`, dark `h1._30` (:98) | #611f69 / #7d3986 | |
| `theme.baseInverseHighlight2` | light `h2._50`, dark `h2._60` (:113) | #c474d3 / #bc80ce | #20a271 / #3daa7c (jade) |
| `theme.baseInverseImportant` | light `imp._70`, dark `imp._40` (:125) | #83388a / #9652a2 | |
| `theme.contentInverseImportant` | light `imp._0`, dark `imp._100` (:129) | #f9edff / #efe1f5 | |
| `theme.contentInversePrimary` | white / white (:166-168) | #ffffff / #ffffff | |
| `theme.contentSecondary` | `primary._100` @80% / `primary._90` @90% (dark high contrast `primary._100`) (:159-162) | #39063a @80% / #e3ceeb @90% | |

Aubergine ramp: `Colors.swift:1634-1705`, e.g. `aubergine_70` #83388a / #cfa1de at :1682. Jade ramp: `Colors.swift:1274-1345`.
The palette values are unchanged since June's `df1f228`; only their lines moved.

### 0.2 Core tokens used here (`CoreColorSet.default.*` → `Colors.swift`)

`CorePrimaryColorSet` maps `basePrimary` → `dt_color_base_primary` and so on (`Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:119-151`).
The variant sets `highlight1`, `highlight2`, `highlight3` and `important` are defined at `ColorSet.swift:77-110`.

f76ac0a also defines `lightHighContrast` / `darkHighContrast` values for every token (not listed here).

| Token | Light | Dark | Line |
|---|---|---|---|
| `base_primary` | #ffffff | #1a1d21 (trueDark #000000) | Colors.swift:42 |
| `base_secondary` | #f8f8f8 | #1a1d21 | :50 |
| `base_tertiary` | #eaeaea | #212428 | :56 |
| `base_inverse_primary` | #1d1c1d | #212428 | :92 |
| `surface_primary` | #1d1c1d @6% | #f8f8f8 @6% | :134 |
| `surface_secondary` | #1d1c1d @25% | #f8f8f8 @25% | :140 |
| `content_primary` | #1d1c1d | #f8f8f8 | :200 |
| `content_secondary` | #454447 | #b9babd | :206 |
| `content_tertiary` | #5e5d60 | #9a9b9e | :212 |
| `content_inverse_primary` | #ffffff | #f8f8f8 | :248 |
| `outline_secondary` | #5e5d60 @45% | #797c81 @50% | :296 |
| `outline_tertiary` | #5e5d60 @13% | #797c81 @30% | :302 |
| `base_highlight_1` | #e3f8ff | #001a2d | :62 |
| `base_inverse_highlight_1` (`highlight1.baseInverse`) | #1264a3 | **#0a77a7** (June #004d76) | :98 |
| `surface_highlight_1` | #36c5f0 @13% | #036696 @25% | :146 |
| `content_highlight_1` (`highlight1.content`) | #1264a3 | #2ba5ce | :218 |
| `outline_highlight_1` | #1264a3 | #2ba5ce | :308 |
| `content_highlight_2` (default "active" presence) | #007a5a | #3daa7c | :224 |
| `base_inverse_highlight_2` | #007a5a | **#177e56** (June #00553d) | :104 |
| `base_highlight_3` | #fffae0 | #2f1e00 | :74 |
| `base_important` | #ffe8ef | #300005 | :80 |
| `base_inverse_important` (`important.baseInverse`) | #e01e5a | **#d3305d** (June #b41541) | :116 |
| `content_important` | #c01343 | #de678a | :236 |
| `outline_important` | #e01e5a | #d94c75 | :344 |
| `palettes_honeycomb_50` (mute swipe) | #d38d00 | #c48305 | :950 |

### 0.3 Legacy `sk_*` colors (`Modules/Data/Color/Implementation/SKLegacyColors.swift`)

| Name | Light | Dark | Line |
|---|---|---|---|
| `sk_primary_foreground` | #1d1c1d | #d1d2d3 | :27-29 |
| `sk_primary_background` | #ffffff | #1a1d21 (trueDark #000000, elevated #1d1c1d) | :34-39 |
| `sk_foreground_max` | `sk_primary_foreground` @70% | @70% | :65 |
| `sk_foreground_max_solid` | #616061 | #9a9c9e | :70 |
| `sk_foreground_high_solid` | #868686 | #75777a | :80 |
| `sk_foreground_low_solid` | #dddddd | #323538 | :95 |
| `sk_raspberry_red` | #e01e5a (both) | | :202 |
| `sk_lilypad_green` | #007a5a (both) | | :192 |

### 0.4 Type

- **Font sizes.** Lato; `SKFont` sizes come from `Modules/Data/Font/Implementation/UIFont+LegacySupport.swift`:
  - body 17 (:92)
  - smallBody 15 (:126)
  - caption 13 (:160)
  - micro 12 (:194)
  - title 22 black (:40)
  - headline 28 black (:22)
- **Weights.** "Bold" is Lato-Bold and "Black" is Lato-Black.
- **Line height.** No code sets a line height. Labels use the font's natural height, which is **1.2em** (Lato hhea
  ascent 1974, descent −426 at 2000 upm, read from `Modules/Data/Font/ResourceBundle/Font/Lato/Lato-Regular.ttf`).
  So 17→20.4pt, 15→18pt, 13→15.6pt, 12→14.4pt. This matches the snapshots: body-bold rows measure 20.67pt at @3x rounding.
  Use `line-height: 1.2`.
- **Dynamic Type caps.** Each style has a maximum (body 53, smallBody 49, caption 44, micro 43;
  `UIFont+LegacySupport.swift:90`, `:124`, `:158`, `:192`). The clone can ignore these.

### 0.5 Timestamp formats (all come from `Modules/Data/I18n/Implementation/TimeUtility.swift`)

- **Time part.** `h:mm a` with a no-break space before AM/PM ("9:41 AM"), or `HH:mm` in 24-hour locales (:208-211).
  English (US and GB), Korean and Chinese are the locales that are not forced to 24-hour (:1248-1257).
- **Style per call site.** `MessageViewPresentationObjectFactory.TimestampStyling` picks the style for each call site
  (`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/MessageViewPresentationObjectFactory.swift:208-215`),
  mapped in `Mappers/TimestampMapper.swift:23-77`. Every style shows "Sending…" (`sending`, yaml:17613) for pending
  messages and "Saving…" (yaml:16939) while an edit saves (:61-63).

| Style | Used by | Rule and output |
|---|---|---|
| `.relative` (default) | **DM rows**, Later rows | `relativeFromTodayString(verbosity: .simple)` (:552-616). ≤1s "now" (yaml:13532). 2–59s "1m ago" (13771). 1 min "1m ago". 2–59 min "%@m ago" (12389) → "5m ago". 1 h "1h ago" (13732). ≥2 h today "%@h ago" (7991) → "3h ago". Yesterday "1d ago" (13687). Older: `shortOrdinalDisplayString(includeTime: false, shortMonth: true)` → "Jun 4th"; other years "Jun 4th, 2024" (:719-785). English only gets ordinal suffixes "st/nd/rd/th" (yaml:20533/12742/15523/21138; :1155-1169, :1244-1246); other locales use the long date style. |
| `.timeOnly` | Sent rows; drafts edited in the last 2 days | "9:41 AM" (`timeFormatter`, :63, :79) |
| `.longPrefix` | drafts older than 2 days | "MMMM d" → "June 4" (:70) |
| `.absolute` | Threads root message | Today → "Today at 9:41 AM" (21784). Yesterday → "Yesterday at 9:41 AM" (24199). Else "Jun 4th at 9:41 AM" (`date_at_time` "%@ at %@", 5175), with ", 2024" for other years |
| `.threadReply` | Threads replies | (:466-501) <60s "Just now" (10496). <60 min "1 min" / "23 mins" (13762 / 14440). Same day or <8h "5:10 PM". Yesterday "Yesterday at 5:10 PM". <7 days "Wednesday at 5:10 PM". Older "May 21st at 5:10 PM" / "May 21st, 2022 at 5:10 PM" |
| `mpdmTimestamp` | not used by these screens; Search's DM results and recently visited use it (e.g. `Modules/Features/Find/Implementation/Subfeatures/DMs/SearchDMsPresenter.swift:281`) | (:503-544) same buckets as threadReply, but "Yesterday", "Monday", "May 21", "May 21, 2022" |
| `toTimeAgo` | Later due dates | (:1047-1151) "In 2 hours" / "3 days ago": "In" (9652) + value, or value + " ago" (1233). Units: "1 minute" / "%@ minutes" (13765 / 14443), "1 hour" / "%@ hours" (13726 / 14328), "1 day" / "%@ days" (13681 / 14319), months (13780 / 14346), years (13938 / 14434), "<1 minute" (10823). Rounds up past half a unit: >29 s, >29 min, >11 h, >14 days, >5 months (:1081-1142) |
| `displayDateString` | Sent section headers | "Today" (21781), "Yesterday" (24196), else medium date style "Jun 4, 2024" (:684-693) |

---

## 1. Shared list components

### 1.1 MKMessagePreview: the preview row (DMs, Activity, Later, Drafts, Scheduled, Sent, Search)

**Source**
- View: `Modules/UIInfra/MessageKit/Implementation/MKMessagePreview.swift`
- Rows: `HorizontalStacks/MKTopContentStackView.swift` (header row), `HorizontalStacks/MKPrimaryContentStackView.swift` (name row),
  `HorizontalStacks/MKOuterHorizontalStack.swift` (ornament + column), `MKMessageContentView.swift` (body),
  `MKCoreMessageProperties.swift` (fonts, colors, background styles)
- Data → properties: `Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/DefaultTransformationPath.swift:325-617`
  (`generateDefaultMessagePreview`) and the mappers in `.../Mappers/`
- Snapshots: 34 PNGs in `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessagePreviewSnapshotTests/`,
  rendered by `Modules/UIInfra/MessageKit/Tests/Unit/MKMessagePreviewSnapshotTests.swift`. They are light mode only, 393pt
  wide (the file says 375, `:22`, but the PNGs are 1179px), with plain fixture text colors. The 32 June PNGs are
  pixel-identical in Sept; two were added (below). The variant table is below.

**Anatomy (top to bottom)** (`MKMessagePreview.swift:183-274`)

The outer vertical stack spaces its items **8pt** apart (`mediumStackViewSpacing`, :55, :273). Items with no content take
no space, so no gap is added for them (e.g. testMessagePreviewBasic is 10 + 20.67 + 10 = 40.67pt).

1. **Hairline pill**: optional `SKPillButton`, hugging its content (:191-202).
2. **Eyebrow**: optional (:203-205, :335-340).
3. **Top row**: header text, timestamp, dot, badge or spinner (`MKTopContentStackView`). Present only when `headerText` is
   set (:149-181).
4. **Main row**: `MKOuterHorizontalStack` = [ornament] + **12pt** + [inner column], top-aligned
   (`MKOuterHorizontalStack.swift:220`, :160). The inner column stacks 12pt apart by default (`MKMessagePreview.swift:246`):
   1. Primary row (`MKPrimaryContentStackView`): primary text, primary-text decoration, spacer, then timestamp, dot,
      badge or spinner **when there is no header** (`MKMessagePreview.swift:362-404`).
   2. Mustache text (`MKMessagePreview.swift:207-211`, :350-360).
   3. Secondary content (`MKMessageContentView`, `MKMessagePreview.swift:213-221`).
   4. Footer text (`MKMessagePreview.swift:224-226`, :327-333).

   Sept places the timestamp next to the top-most content: the header, else the primary text, else (no header and no
   primary text) beside the secondary content in the outer row; and with an ornament but no primary text, content
   shorter than the 36 pt ornament is centered on it instead of top-aligned (`MKCoreMessageProperties.swift:103-120`,
   `:261-263`; `MKMessagePreview.swift:248-259`). Rows with a name (every row in these screens) are unchanged.

**Layout constants**

| What | Value | Source |
|---|---|---|
| Row padding | top 10, left 16, bottom 10, right 16 | `MKMessagePreview.swift:53`, `:92`, `:440-445` |
| Outer stack spacing | 8 | `:55`, `:273` |
| Ornament size | `.large`: 36×36 | `MKCoreMessageProperties.swift:244`; `SKEntityOrnamentView.swift:397-506` |
| Ornament → text gap | 12 (text column starts at x = 16 + 36 + 12 = **64pt**) | `MKOuterHorizontalStack.swift:220`; `MKMessagePreview.swift:555-557` (`messageIndent` = 36 + 12) |
| No ornament | text starts at x = 16 | snapshot testMessagePreviewBasic (text at x=16pt) |
| Primary row → secondary text | **0** if the body starts with text blocks (or the caller's `customInnerSpacing`; Activity uses 4); **8** if it starts with an attachment, thread share, embeddable or unfurl; **12** if there is no body | `MKMessagePreview.swift:232-244`; `MKMessageContentViewPresentationObject.swift:89-91` |
| Mustache → body | 8 | `MKMessagePreview.swift:210` |
| Primary row item spacing | 8 (text, decoration, timestamp, dot, badge) | `MKMessagePreview.swift:364`; `MKPrimaryContentStackView.swift:113`, `:270-273` |
| Top row item spacing | 8, top-aligned | `MKTopContentStackView.swift:19`, `:119` |
| Body stack spacing (block text, embeddables, attachment bar, unfurls, translation bar, reaction bar, footer bar) | 8 | `MKMessageContentView.swift:17`, `:294` |
| Body text ↔ trailing accessory (chevron, mute icon, checkbox) | 8, top-aligned; accessory hugs its size | `MKMessageContentView.swift:438-451` |
| Dot | 12pt circle, radius 6, centered in a 16×16 box (2pt padding); Sept's `MKDotView` is SlackKit's `SKDot` | `MKMessagePreview.swift:559-564`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Dot/SKDot.swift:21-30`, `:52-62` |
| Primary text lines | 4 (4 at large text sizes too) unless the caller sets `primaryTextNumberOfLines` | `MKMessagePreview.swift:529-530`; `MKCoreMessageProperties.swift:268` |
| Body text lines | 2 (`contentFolding .unsupported(numberOfLines: 2)` default for previews) | `DefaultTransformationPath.swift:370`; `Mappers/TextMapper.swift:219-225` |

**Type and color**

| Element | Font | Color | Lines / truncation | Source |
|---|---|---|---|---|
| Eyebrow | captionBold 13 | `highlight1.content` #1264a3 / #2ba5ce | 1, tail ellipsis | `MKMessagePreview.swift:335-340` |
| Header text | micro 12 (fallback; the caller's own attributes win) | `content_secondary` #454447 / #b9babd | 1, truncates first (low compression resistance) | `:319-325`; `MKTopContentStackView.swift:60-70` |
| Timestamp | micro 12 | `content_tertiary` #5e5d60 / #9a9b9e | 1, never truncates (hugs, high priority) | `MKCoreMessageProperties.swift:249-255`; `MKTopContentStackView.swift:72-82` |
| Primary text | bodyBold 17 fallback (previews; full messages use bodyBlack) | `content_primary` #1d1c1d / #f8f8f8 fallback | 4 | `MKCoreMessageProperties.swift:220-227`, `:265-272` |
| Mustache | caption 13 | from the text (callers pass `content_secondary`) | 1 by default | `MKMessagePreview.swift:358-360` |
| Body text | caller's `baseFont` and `baseTextColor` (defaults body 17, `content_primary`; June `sk_primary_foreground`) | see each screen | 2 | `MessageViewPresentationObjectFactory.swift:51-68` |
| Footer text | smallBody 15 | `highlight1.content` | wraps | `MKMessagePreview.swift:327-333` |
| Hidden-message state | primary "This message is hidden" (yaml:21543), body 17; body "You're hiding messages from this person." (yaml:24722), smallBody `content_secondary` | | | `MKCoreMessageProperties.swift:294-310` |

"Fallback" means `Text.withFallbackTextAttributes`: it fills only attributes the text doesn't already set, and the first
fallback applied wins (`Modules/Data/TextModels/Implementation/Text.swift:122-127`).

**Header accessory (dot, badge or spinner)** (`MKMessagePreview.swift:469-474`; `Mappers/HeaderAccessoryMapper.swift:62-82`)
- Placement: in the top row after the timestamp when there is a header; otherwise at the far right of the primary row
  after the timestamp (:152-180, :371-400). Sept adds a small `.darkOnLight` spinner case (`:172-175`, `:391-394`).
- Dot: default color `important.baseInverse` #e01e5a / #d3305d (June `sk_raspberry_red`, #e01e5a in both modes)
  (`SKDot.swift:21`; `MessageViewPresentationObjectFactory.swift:54`).
- Badge: an `SKBadge` count (section 1.3). Its style is the caller's `headerAccessoryBadgeStyle`, or `.emphasized()` if unset
  (`DefaultTransformationPath.swift:562-569`).
- The badge's accessibility label is "%@ unread" / "%@ unreads" (yaml:22650 / 22647).

**Primary-text decoration** (`PresentationObjects/PrimaryTextDecoration.swift`; `MKPrimaryContentStackView.swift:64-87`)
Either an `SKBadge` (e.g. "APP" with `.text()` style) or a 20pt `SKIcon` placed 8pt right of the primary text.

**Background and press state** (`MKMessagePreview.swift:129-136`; `SKEntityBackgroundView.swift`)
- Background, first match wins: `backgroundStyle` color → the list cell's background → `base_primary`
  (`MKMessagePreview.swift:129-130`).
- `backgroundStyle` is set only when the caller enables `shouldApplyBackgroundStyling` (`MKCoreMessageProperties.swift:137-177`):
  - failed: `base_important`
  - pinned, highlighted or broadcast (new in Sept): `base_highlight_3`
  - saved-for-later or Slackbot response: `base_highlight_1`
  - huddle: `base_highlight_2`
  - ephemeral: `base_secondary`
- Pressed: a rounded highlight inset **4pt** left and right, corner radius **12** (continuous)
  (`SKEntityBackgroundView.swift:43`, `:54`, `:69-73`). Color, first match wins: the style's pressed color → the list's row
  highlight, which defaults to `base_tertiary` #eaeaea / #212428 (`SKList.swift:145`) → `base_secondary`.
- Other highlight states: focused (e.g. deep-link target) `highlight3.surface` (June `sk_pale_yellow`), preparing to
  delete `important.baseInverse` @25% (June `sk_raspberry_red` @25%) (`SKEntityBackgroundView.swift:104-120`).
- No row separators: section `hasRowSeparators` defaults to `false` (`SKListPresentationObject.swift:152`).

**Snapshot variants.** All 32 PNGs, viewed; heights are PNG height / 3.

| PNG | Height | What it shows |
|---|---|---|
| testMessagePreviewBasic | 40.67 | Primary "This is the primary text" (bold 17) on the left, "10:00AM" (12, gray) on the right; no ornament |
| testMessagePreviewWithSecondaryText | 76.67 | + 2-line secondary text (15, #454447) directly under the primary text (0 gap) |
| testMessagePreviewWithHeaderText | 99.33 | Header "Reacted by Thor in #channel" (12, #454447) with the timestamp at the right; primary; 2-line secondary |
| testMessagePreviewEmptyPrimaryText | 70.67 | Placeholder image ornament (36pt #eaeaea square, radius 9); empty primary text; the timestamp stays alone at top right |
| testMessagePreviewWithAccessory | 99.33 | Chevron (`svgCaretRightFull`, `content_secondary`) to the right of the secondary text |
| testMessagePreviewWithOrnament | 99.33 | Icon ornament: 36pt box, `surface_primary` fill (reads #f2f2f2 on white), radius 9, 20pt Apple icon; text column at x=64 |
| testMessagePreviewWithReactions | 175.33 | Reaction pills: 2 rows of 5 (30pt tall, 8pt gaps), last pill "11 more" |
| testMessagePreviewWithReactionAndAddReacjiPill | 175.33 | Same, with "12 more" and the add-reaction pill (emoji-plus icon) |
| testMessagePreviewWithNonInteractableReactions | 175.33 | Same as WithReactions; the visuals are identical |
| testMessagePreviewWithCompactAttachment | 167.33 | Bordered file card (1px #eaeaea, rounded) spanning the text column: blue "W" doc icon, "grading_assignment.doc" (bold), "64Mb" (gray) |
| testMessagePreviewWithExpandedAttachment | 302.67 | Full-width image (x 64→377), rounded, ≈195pt tall |
| testMessagePreviewWithAttachments | 171.33 | 64×64 thumbnails, 8pt apart: 2 images (one with a "▶ 8m" duration chip), a "W" doc tile, and a "+2" overflow tile (1px #eaeaea border) |
| testMessagePreviewWithWrappedText | 119.67 | Header truncates with "…" before "10:00AM"; primary text wraps to 2 lines |
| testHiddenMessagePreviewEntity | 81.33 | Hidden state: user-hide icon in a gray box; "This message is hidden" (regular 17); "You're hiding messages from this person." |
| testMessagePreviewWithEyebrow | 123 | Eyebrow "Saved for Later • Due in 60 mins" (13 bold, #1264a3) above the header |
| testMessagePreviewWithReply | 123 | Mustache "replied to: This is the original…" (13, #454447) under the primary text, then 8pt, then the body |
| testMessagePreviewWithEyebrowAndReply | 146.67 | Eyebrow + header + primary + mustache + body |
| testMessagePreviewWithHeaderDot | 148 | As above plus a red dot (12pt, #e01e5a) right of the timestamp in the header row |
| testMessagePreviewWithHeaderDotAndWrappedText | 148 | Long header truncates before timestamp and dot |
| testMessagePreviewWithHeaderBadge | 76.67 | No header: "User Name", then right-aligned "10:00 AM" and a red pill badge "5" (25×18pt, radius 9) |
| testMessagePreviewWithLongBrow | 100.67 | Header with a leading threads icon, in caption (the caller's font wins over micro); "3m ago" + dot; square image ornament |
| testMessagePreviewWithLongPrimaryText | 97 | Group avatar; primary wraps to 2 lines left of "7:43 am" |
| testMessagePreviewWithAttachmentContentFooter | 113.33 | Group avatar; message; attachment preview with a gray 4pt left bar and bold title |
| testMessagePreviewBadgeAccessoryNextToTimestamp | 119.67 | Primary wraps to 4 lines; timestamp and badge "3" stay top-right |
| testMessagePreviewDotAccessoryNextToTimestamp | 97 | Group avatar; "5:34 pm" + red dot top-right |
| testMessagePreviewBadgeAccessoryNextToTimestampV2 | 56 | Primary in bodyBlack (unread DM look), badge "2"; no body (row = 10 + 36 ornament + 10) |
| testMessagePreviewFilesOnlyInSecondaryContent | 112.67 | Three 64×64 image-file tiles, 8pt under the primary row (non-text first item) |
| testMessagePreviewUnfurlsOnlyInSecondaryContent | 102 | Unfurl with a 4pt #eaeaea left bar, bold "title", "Block text" |
| testMessagePreviewPrimaryTextDecorationBadge | 58.67 | "Akshay Bakshi" + gray "APP" pill badge (`.text` style) |
| testMessagePreviewPrimaryTextDecorationIcon | 58.67 | "Akshay Bakshi" + headphones icon (theme `contentSecondary`) |
| testMessagePreviewBothBadges | 58.67 | "APP" decoration + red count badge "5" at the right |
| testMessagePreviewWithInteractiveActionText | 147 | Orphan baseline (no matching test in the current file): a footer row with a to-do icon, gold "This is an interactive action text with a CTA", a divider, and a blue "Add to-do" link |
| testMessagePreviewWithTimestampNextToSecondaryContent (Sept) | 56 | Icon ornament, no primary text: one line of secondary text centered on the 36pt ornament, "10:00AM" at its right (`MKMessagePreviewSnapshotTests.swift:59-75`) |
| testMessagePreviewNoPrimaryTextWithContentTallerThanOrnament (Sept) | 110 | Icon ornament, no primary text, wrapping secondary text taller than the ornament: ornament stays top-aligned (`:77-94`) |

**Group avatar in these fixtures** (measured): primary 24pt image at (16, 10), secondary 24pt at (28, 22). Section 1.2 has the component.

### 1.2 Ornaments and avatars

**`SKEntityOrnamentView` sizes** (`Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityOrnamentView.swift:397-506`)

| Size | Images, emoji, color swatch (side / radius) | Member avatar | Group avatar | Ornament box |
|---|---|---|---|---|
| verySmall | 16 / 4 | `.verySmall` 20 | `.verySmall` | `.verySmall` 20 |
| small | 24 / 4 | `.small` 24 | `.small` | `.small` 24 |
| large | 36 / 6 | `.large` 36 | `.large` | `.large` 36 |
| extraLarge | 56 / 8 | `.extraLarge` 56 | `.extraLarge` | `.extraLarge` 56 |

**Member avatar (`SKMemberAvatar`)** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift`)
- Side lengths: tiny 16, verySmall 20, small 24, smallPlus 28, medium 32, **large 36**, **extraLarge 56**, jumbo 120 (:928-951).
- Corner radius: `min(20, 0.25 × side)` (`:98-104`; `UIUtilities.proportionalRoundedCorners`,
  `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:94-98`). That gives 36 → **9pt**, 56 → **14pt**,
  24 → 6pt. The `Size.cornerRadius` table at :953-976 is not used for the image mask.
- Presence indicator, applied when the avatar type is `.memberWithPresence` (:259-265):

| Part | Formula | 36pt avatar | 56pt avatar |
|---|---|---|---|
| Cutout side `c` | 10 + 0.1 × side (:120-122) | 13.6 | 15.6 |
| Icon side | 1.4 × `c` × scale (:125-127); scale 0.75 for Slackbot, 1 otherwise (:843-850) | 19.04 | 21.84 |
| Icon offset | 0.48 × `c` past the bottom-right corner (:130-133) | 6.53 | 7.49 |
| Cutout | a circle of diameter 1.1 × `c`, centered `c/3` inside the bottom-right corner, subtracted from the photo (:415-436). Sept: on a concentric (circular, `shouldMakeConcentric`) avatar the cutout and the icon are centered on the avatar's edge instead (:93-95, :136-147, :421-423) | | |

  With a 36pt avatar the icon spans x/y 23.5 → 42.5. It overhangs the photo by 6.5pt, and the photo has a round bite out
  of its corner.
- Presence icons (:812-841) and colors (:852-870). "Active" uses the theme's `presenceColors.active` if provided, else
  `highlight2.content` #007a5a / #3daa7c. "Away" uses `presenceColors.away`, else `content_tertiary`.

| State | Icon (SKIconManifest → svg) |
|---|---|
| Active | `svgStatusMemberFilled` → `Modules/Data/Icon/ResourceBundle/Icons.xcassets/status_member_filled.imageset/status_member_filled.svg` |
| Active + DND | `svgStatusMemberDndFilled` → `status_member_dnd_filled.svg` |
| Away | `svgStatusMember` → `status_member.svg` (ring) |
| Away + DND | `svgStatusMemberDnd` → `status_member_dnd.svg` |
| Slackbot / Slack Security | `svgHeartFilled` → `heart_filled.svg` (scale 0.75) |
| External or guest, active / away | `svgStatusGuestFilled` / `svgStatusGuest` (+ `…Dnd…`) |
| Single-channel guest, active / away | `svgStatusSingleChannelGuestFilled` / `svgStatusSingleChannelGuest` |

- Which type applies (`Modules/UIInfra/SlackKitExtensions/Implementation/MemberAvatar/SKMemberAvatar+Extensions.swift:77-107`):
  single-channel guest → a triangle cutout; multi-channel guest → a square cutout; otherwise member with presence
  (the external variant when `isExternal`). Invited users always show as away (`SKMemberAvatar.swift:744-748`).
- Snapshots:
  - `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberCollectionEntitySnapshotTests/testMultiMemberConfiguration@3x.png`:
    56pt avatars with names under them; green active dot, gray away ring, DND "z".
  - `.../SlackKitTests.SKMemberAvatarSnapshotTests/testSmallIconWithPresenceConfiguration@3x.png`.

**Group avatar (`SKGroupAvatar`)** (`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/GroupAvatar/SKGroupAvatar.swift`)
- `.large`: a 36×36 box holding two 24×24 member images with radius `0.25 × 24 = 6`. The first sits top-left at (0, 0),
  the second bottom-right at (12, 12) (:204-217, :254-263).
- The first image is masked with a gap of `2 + 0.015 × 24 = 2.36pt` around the second (:343-346).
- `.small` and `.verySmall` show the member count instead: captionBold 13, `content_primary`, on a `base_tertiary` tile, 24pt at `.small` and (Sept) 20pt at `.verySmall` (June: 24pt for both) (:271-278, :293-300, :22-27).
- Snapshot: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKGroupAvatarSnapshotTests/testGroupAvatarLarge@3x.png`.

**Ornament box (`SKOrnamentBox`)** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/OrnamentBox/SKOrnamentBox.swift`)
- Sides: 16 / 20 / 24 / 32 / 36 / 56 / 120 (:618-635). Radius `min(20, 0.25 × side)` (:637-639), or a circle.
- Default fill `surface_primary` (:659). Optional 1pt border (:188-203).
- Icons render at `SKIcon` intrinsic size **20pt**, centered (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/Icon/SKIcon.swift:27`).

### 1.3 Badge (`SKBadge`)

Source: `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Badge/SKBadge.swift`

| Property | Value | Source |
|---|---|---|
| Shape | pill (radius = height / 2); `roundedRectangle` uses radius `min(20, 0.25 × h)` | :217-228 |
| Padding | pill: 9pt horizontal, 3pt vertical; rounded rectangle: 4 / 4 | :415-436 |
| Height | max(font point size 12, min icon 12) + 2 × 3 = **18pt** | :190-201 |
| Width | text width + 18, and at least 24pt and at least the height | :194-201, `Constants.minWidth` :27 |
| Count text | "1"–"9"; above 9 shows "9+" (`badgeCountNumberPlus` "%@+", yaml:2385) | :307-316, `maxBadgeCount` :26 |
| Font | microBold 12, capped at 18pt, centered | :382-393 |
| Icon | 12pt, 4pt before the text | :28-29, :49-57 |
| Styles | `.emphasized(bg important.baseInverse #e01e5a / #d3305d, text content_inverse_primary)`; `.text(textColor content_secondary, bg surface_primary)` by default; `.deemphasized` (clear, content_secondary); `.tag` (grass_70 on grass_5) | :345-413 |

DM rows use `.text` with theme colors: `theme.baseInverseImportant` fill and `theme.contentInverseImportant` text,
i.e. #83388a / #9652a2 with #f9edff / #efe1f5 (section 0.1).

Snapshots: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKBadgeSnapshotTests/`
(`testBadgeSingleDigit`, `testBadgeCountGreaterThanMaxBadgeCount`, …).

### 1.4 Tab bars

**`SKTabBar`** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TabBar/SKTabBar.swift`, cells in `TabBarCollectionViewCell.swift`)

| | `.pillButton` (DM filter row) | `.underline` (`SKPageController` default: Later, Drafts & Sent) |
|---|---|---|
| Bar height | **54** (`SKTabBar.swift:305-306`) | **48** (:303-304) |
| Selection shape | pill inset 9pt top and bottom, 4pt left and right in each cell → **36pt tall**, radius **10** (continuous), 1pt border (`TabBarCollectionViewCell.swift:37-38`, :45, :282-290). The selected pill is filled with `selectedBackgroundColor`, shown once the selection progress passes 0.5 (June: `isSelected`) (:51, :285, :508-510) | 4pt underline, radius 2, under the selected tab (`SKTabBar.swift:26-27`, :125). Default color `highlight2.baseInverse` #007a5a / #177e56 (June `sk_lilypad_green`, #007a5a in both modes) (:722) |
| Cell insets | selection inset (9, 4, 9, 4); content ≥16pt from the pill's sides (:41, :484-486) | (6, 4, 6, 4); content ≥10pt from the sides (:39-40, :46, :476-478) |
| Title | smallBody 15, or **smallBodyBold** 15 when selected (progress > 0.5), capped at 20pt, centered (:365-383) | same |
| Title color | blends `textColor` → `selectedTextColor` with selection progress (:371-376) | blends `content_secondary` → `content_primary` |
| Count | "label" count in smallBody after the title (4pt gap), or a badge (max 99), or an 8pt `important.baseInverse` dot (:50, :78-89, :229-255) | same |
| Icon | `SKOrnamentBox` `.small` (24pt box, 20pt icon), leading or trailing, 4pt gap (:411-454) | same |
| Cell width | title (bold) + count + icon + 2 × 16 + 8, clamped to [88, 200] (:320-361) | same with 2 × 10 |
| Width mode | `.fitAllContent`: intrinsic widths. In compact width, if they don't fill the bar, the leftover space is split equally so the tabs fill it (`SKTabBar.swift:456-477`). Otherwise the row scrolls horizontally. `.fitToBar`: equal widths (:451-455) | |
| Press | cell scales to **0.96** with bounce (:49, :512-519); selection haptic on tap (`SKTabBar.swift:549-550`) | pressed background `base_secondary` (:275-278) |

**`SKPageController`** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/PageController/SKPageController.swift`)
- Default tab style `.underline()`, background `base_primary` (:827-839).
- A 1px `outline_tertiary` hairline sits between the tabs and the pages, shown by default (:115-121, :725-726, :839).
- Snapshots (2 × 2 grids: light / dark rows × normal / high-contrast columns):
  - `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKTabBarSnapshotTests/testNumbers@3x.png`:
    green underline under "First tab 4"; bold selected title followed by a regular count. The light row is unchanged
    since June; the dark underline is now `#177e56` (the Sept token, `highlight2.baseInverse`).
  - `…/testUnderline@3x.png`: the same bar with a custom orange underline and icons.
- There is no snapshot of `.pillButton` (`…/testPill@3x.png` is the `.pillBackground` style).

### 1.5 List chrome

- **Backgrounds.** List background on iPhone is `base_primary` #ffffff / #1a1d21 (June `sk_primary_background`, same values) (`ListThemeOptions.swift:67`).
  Rows default to `base_primary`.
- **Section footers.** Built by `SKList.swift:2092-2137`, drawn by `SKListFooterView.swift:17-21` and `:106-111`:
  - `.hairlineDivider`: an **8pt** tall footer with a **1px** `outline_tertiary` line on its bottom edge. With
    `hasPadding: false` it is just the 1px line. `hidesWhenLastRow` removes it after the last section.
  - `.blankDivider`: 8pt of empty space.
  - `.emphasized`: a 12pt `base_secondary` band with 1px hairlines at top and bottom.
- **Section headers (`SKHeaderEntity`).** Source `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/SKHeaderEntity.swift`.
  - Padding 12 top, 16 left, 12 bottom, 16 right (:88), plus an extra 8pt on top when `shouldAddSymmetricalFooterPadding` is true, the default (:312).
  - Title: `.medium` smallBodyBold 15 `content_primary`; `.small` smallBodyBold 15 `content_secondary` (:470-477).
  - Secondary text: `.medium` smallBody 15, `.small` micro 12, both `content_secondary`, 4pt below the title (:86, :479-486).
  - Collapse caret `svgCaretDownFull` in `content_tertiary` (:34).
- **Loading skeleton.** Used for `SKLoadingState` and `SKWrappedLoadingView` with `cellContent (hasImageMask: true, size: .medium)`.
  Measured in `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKWrappedLoadingViewSnapshotTests/testMixedImageMaskList@3x.png`
  (unchanged since June):
  - Row pitch 56pt.
  - A 36×36 square (radius ≈ 9) at x = 16.
  - Two bars starting at x = 64: a 12pt bar 235pt wide, then 6pt below it a 10pt bar 157pt wide, both fully rounded.
  - Fill `base_tertiary` #eaeaea / #212428.
  - On iPhone the style is `.shimmering(backgroundColor: basePrimary)` (`ListThemeOptions.swift:79`).

### 1.6 Swipe actions (`SKSwipeableContentDecorator`)

Sources: `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SwipeableContentDecorator/SKSwipeActions.swift`,
`SKSwipeableContentDecorator.swift`, `SKSwipeToActionGestureRecognizer.swift`.

- **Sides.** The `left` action is revealed by swiping **right** (the content moves right, the action sits on the leading
  edge). The `right` action is revealed by swiping **left** (`SKSwipeableContentDecorator.swift:239-240`).
- **Revealed button.** An `SKButton` `.medium` in `.default(textColor: foregroundColor)` style: icon left of the label,
  smallBodyBold 15 (`:406-416`). The icon swaps to `activeIcon` once past the threshold (`SKSwipeActions.swift:47-68`).
  Behind it the background fills with `backgroundColor`.
- **Threshold.** Releasing past **40%** of the row width commits the action (`goldenRatio = 0.4`,
  `SKSwipeToActionGestureRecognizer.swift:24`, `:33`, `:186-237`). Past that point the drag rubber-bands (:123-127).
  Crossing it plays a selection haptic (`SKSwipeableContentDecorator.swift:291`).
- **Release.** The row springs back with `.smooth`/`.medium` (:256), or slides away if `slideAwayAndDelete`.
- **While open.** The row gets 12pt rounded corners and a black shadow at opacity 0.4, radius 4 (:84-92, :479-490).
- **Accessibility.** The actions are also exposed as accessibility custom actions (:595-604).

### 1.7 Long-press menus

`SKLongPressAction(actionMenuHandler:previewProvider:)` shows the iOS context menu: a preview above an `SKMenu` list.
Items have a title and a leading icon; destructive items are red. This is the standard iOS context-menu look.

### 1.8 Empty states and buttons

**`SKEmptyState`** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/EmptyState/SKEmptyState.swift`)
- Structure: a centered vertical stack with margins 16 top, 32 left, 16 bottom, 32 right. It is vertically centered at
  low priority (:36, :183-206).
- Content sizes: image **120×120**, emoji 48×48 or icon 48×48 (:39-41, :189-195). Sept adds keyboard avoidance: while
  a keyboard overlaps the view, only the image/emoji/icon shrinks, to at most half its size (:49-51, :330-400).
- Spacing: 8 by default; 16 after the emoji or icon and after the body (:37-38, :146-174).
- Title: **title 22 black**, `content_primary`, centered.
- Body: body 17 `content_secondary`, centered (:42-45, :593-607).
- Buttons: `SKButton` `.medium`, 8pt apart (:178, :395-410).

**`SKPaddedEmptyStateDeprecated`** adds 30pt of top padding (`Modules/UIInfra/DeveloperComponents/Implementation/PaddedEmptyState/SKPaddedEmptyState.swift:16-17`, `:37`).

**`SKButton` `.medium`** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:249-334`; `SKButton+PresentationObject.swift:203-239`)
- smallBodyBold 15, 10pt vertical and 12pt horizontal padding, radius **12**, icon 20pt with 6pt spacing. Height ≈ 38pt.
- `.large` is bodyBold 17, 14 / 16 padding, radius 14.
- Styles:
  - `.primary`: `highlight2.baseInverse` #007a5a / #177e56 fill (June `sk_lilypad_green`, #007a5a in both modes), white
    text, 20% darker when pressed (:166-167, :188-189, :210-212).
  - `.outlineDefault`: `base_primary` fill, `outline_secondary` border, `content_primary` text.
- Pressed buttons scale to 0.96.

### 1.9 Reactions, attachments and unfurls inside previews

**Reaction pill** (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Reacji Pill/SKReacjiPill.swift:36-55`)
- Insets 4 top/bottom, 8 left/right; emoji 22×22; 2pt spacing; label captionBold 13 `content_primary`. Total height
  **30pt** (measured 30).
- Background `surface_primary`. Your own reaction: `surface_highlight_1` fill, 2pt `outline_highlight_1` border,
  `highlight1.content` text.
- Pressed: scale 0.94.
- Bar spacing is 8pt horizontal and 8pt between rows (`Reacji Bar/SKReacjiBar.swift:26-27`). Overflow shows "%@ more"
  (yaml:18978).

**Attachments** (preview styling, `MessageViewPresentationObjectFactory.swift:89-155`)
- Single attachments render fully; several render as 64×64 thumbnails, 8pt apart, in one row with a "+N" tile.
  The tiles have a 1px `base_tertiary` border (measured in the snapshots above).

**Unfurls** show a 4pt `base_tertiary` bar on the left (measured).

In previews these appear only when the caller enables them. DMs turn reactions off and don't expand attachments.

### 1.10 Button rows under a preview (`SKButtonEntity`)

Source: `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/ButtonEntity/SKButtonEntity.swift`
- Horizontal, center-aligned, 8pt between buttons (:26).
- Padding 10 top/bottom and 16 left/right, plus **48pt** extra on the left with `.wrapContent(indentedForMessageAlignment: true)`,
  so buttons line up with the text column at x = 64 (:144-159, :213-222; `Helpers/Messaging/MessagingConstants.swift:10-12`).
- Snapshot: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKButtonEntitySnapshotTests/testWrapContentWithMessageIndent@3x.png`
  (the fixture uses `.large` buttons; 2 × 2 grid; the dark row's green and red are the Sept tokens).

---

## 2. DMs tab

### 2.1 Source

- **View controller:** `Modules/Features/DM/Implementation/DMViewController.swift`. A full-screen `MKMessagesAndEntitiesList`
  (an `SKList`) plus the compose FAB (:86-110, :170-178).
- **Sections and rows:** `DMPresentationObjectFactory.swift`.
- **Data, actions, header:** `DMInteractor.swift`.
- **Filter row:** `DMFilterBarCustomRow.swift`.
- **Filter enum:** `Modules/DataService/PerTabPreferences/Interface/PerTabPreferencesServiceInterface+DM.swift`.
- **Data:**
  - Modern, paginated (flag `modernizeDmDataProvider`): `Modules/DataService/DirectMessagesDataProvider/Implementation/PaginatedDirectMessageSubscription.swift`.
  - Legacy: `Modules/DataService/BaseDataProviders/Implementation/DirectMessages/DirectMessageQuery.swift`.
- **Feature flags** (Sept). Still server-side toggles, default **false** in `Modules/Data/Toggles/Definitions/*.json`:
  `dmSummaries`, `modernizeDmDataProvider`, `dmFeatureActionHandlers`, `dmSorting`, `agentsInDms` (new since June) and
  `agentsAndAppsBadging` (`DMInteractor.swift:187-190`, :434, :503-504, :835; `DMPresentationObjectFactory.swift:474-475`).
  June's `iaNextDmsFilters` (filter pills), `swipeActions`, `markAsUnreadAction` and `channelEmailAddress` are gone:
  their code is now the only path (pills, swipe actions, Mark Unread, the 350 × 450 preview). The legacy header filter
  menu (`NavigationBarControls/DMNavigationBarControlsManager.swift`) and the filter banner were deleted.
- **Snapshots:** there is no screen-level snapshot of the DMs tab. Rows use `MKMessagePreview` (section 1.1). The
  closest references are:
  - `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessagePreviewSnapshotTests/testMessagePreviewBadgeAccessoryNextToTimestampV2@3x.png` (unread group DM with a badge)
  - `…/testMessagePreviewDotAccessoryNextToTimestamp@3x.png`
  - `…/testMessagePreviewWithLongPrimaryText@3x.png`

### 2.2 Screen structure

- **Header.** The root header (another spec) is configured with title "DMs" (`dms`, yaml:5586) and right buttons in
  screen order, leading → trailing (`DMInteractor.swift:588-617`):
  - Slackbot, if Slackbot AI is visible and `slackbotMainHeaderEntrypoints` is on (:353)
  - the user avatar (its You menu comes from `youMenu.youMenuPublisher`, which is nil unless the `youMenu` flag is on,
    `Modules/Features/YouMenu/Implementation/YouMenu.swift:59-70`)
  - no filter button: June's `svgRefine` "DMs Filters" button (legacy filters) is gone
  - in the unified (SwiftUI) navigation the tab's header carries only its title (:592-602)

  It also sets `showPullToSmileMessages: true` and a loading indicator driven by sync (:561-565, :610-615).

  **Production (device screenshots, Sept 2026):** `iaNextDmsFilters` is on (the Sept checkout has removed it): the header
  shows only the avatar, in its own glass circle (`DMInteractor.swift:603-615` [Sept]); the sections are faces (whenever
  there are frecent people, even with no DMs) → onboarding → the filter pills (always) → messages → Add Teammates → empty
  (`DMPresentationObjectFactory.swift:176-222` [Sept]). The clone always draws this (no flag; `src/app/screens/dms`).
- **Sections, in order** (`DMPresentationObjectFactory.swift:176-222`):

| # | Section | When | Footer |
|---|---|---|---|
| 1 | `faces`: people carousel | whenever there are frecent users (even with no DMs) | 8pt blank |
| 2 | `onboarding`: "Add teammates" invite row | onboarding asks for it and DMs exist | 8pt blank |
| 3 | `filterTabBar`: filter pills | always | 8pt blank |
| 4a | `unreadPriorityMessages`: header "VIP unreads" (yaml:23320) | VIP access, filter ≠ VIP, and ≥1 unread VIP DM | none |
| 4b | `readPriorityAndNonPriorityMessages`: header "Everything else" (yaml:6534) when 4a is shown | VIP access and filter ≠ VIP | none; with no VIP unreads it has no header and an 8pt + 1px hairline footer, like 4c |
| 4c | `messages`: one DM row per conversation (or 3 skeleton rows while loading) | otherwise | 8pt + 1px hairline (`outline_tertiary`), hidden if last |
| 5 | `addTeammates`: "Add Teammates" row | DMs exist, filter = All, invite permission, and no onboarding invite row | 8pt blank |
| 6 | `empty`: empty state | no DMs and not loading | none |

  June's `banners` section (the legacy filter banner) is gone.
- Section footers and headers are defined at `DMPresentationObjectFactory.swift:112-173`.
- List options: background `base_primary` (the list theme's), row highlight `base_tertiary`, pagination at the bottom,
  and (Sept) a `bottomDrawer` slot (:152-161).
- Behind the list: `view.backgroundColor` = `alternateVcBackgroundColor`, which is `base_primary` on iPhone
  (`DMPresenter.swift:81`; `ListThemeOptions.swift:69`). June's iPad-only gradient view is gone from `DMViewController`
  (`DMViewController.swift:170-174`, :197-198).

### 2.3 People carousel ("faces")

Built at `DMPresentationObjectFactory.swift:526-564`; component `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/MemberCollectionEntity/SKMemberCollectionEntity.swift`.
- **Data.** Up to 30 frecent humans, excluding you and profile-only users (`DMInteractor.swift:1071-1092`).
  - Sort: active first, then DND, then frecency. With flag `dmSorting`, frecency only (`:831-864`).
  - Slackbot is inserted **first** when Slackbot AI is visible (:1121-1123).
- **Layout.** A horizontal scroller.
  - Content insets: 16 left and right (`SKMemberCollectionEntity.swift:25-29`). On iOS 26 Liquid Glass, top 8, left 16, right 16
    (`DMPresentationObjectFactory.swift:562`).
  - 16pt between items (`SKMemberCollectionEntity.swift:29`).
  - Each item (`:387-398`, `:541-572`):
    - 4pt top padding
    - **56pt** avatar (`.extraLarge`, radius 14) with presence (theme `presenceColors`)
    - 8pt gap
    - name: smallBody 15, `content_primary`, centered, at most 2 lines, as wide as the avatar (apps are as wide as their first word)
- **Press** dims the item to alpha 0.4 (`SKMemberCollectionEntity.swift:629-632`). The avatar is `.extraLarge` (:615-620).
- **Production (device screenshots, Sept 2026):** Slackbot comes first, its presence the green **heart** (Slackbot's
  presence style, `svgHeartFilled` in the active color, `SKMemberAvatar.swift:742-779` [Sept]); people in DND carry the
  "z" variants (`svgStatusMemberDndFilled` / `svgStatusMemberDnd`). Tiles at y 136–192 (20 pt under the bar region),
  16 pt apart (`reference/device/IMG_2249`).
- **Tap** opens that DM (`DMInteractor.swift:743-751`).
- **Tab re-tap** scrolls the carousel back to the start (`DMViewController.swift:141-149`, :236-249).
- **Large text sizes.** Above accessibilityMedium the carousel becomes up to 5 small member rows under a collapsible
  header "Online People" (`dms_tab_faces_collapsable_header`, yaml:5607) with a hairline footer
  (`DMPresentationObjectFactory.swift:113-124`, :566-588; `DMInteractor.swift:766-767`).

### 2.4 Filters

**Filter pills** (`DMPresentationObjectFactory.swift:906-945`; `DMFilterBarCustomRow.swift`; June's flag
`iaNextDmsFilters` is gone, so these are the only DM filters)

- **Tabs**, in order (`PerTabPreferencesServiceInterface+DM.swift:46-52`). VIP appears only with VIP access (priority
  "hasAccess"); External is left out for frontline workers (`currentUser.isFrontlineWorker`, Sept;
  `DMPresentationObjectFactory.swift:265`, `DMInteractor.swift:326`), and a stored External filter falls back to All for
  them (`DMInteractor.swift:932-934`).

| Tab | Title (key, yaml line) | Leading icon | Includes |
|---|---|---|---|
| All | "All" (`all`, 1603) | `svgDirectMessages` → `direct_messages.svg` | every DM and group DM |
| VIP | "VIP" (`vip`, 23297) | `svgVip` → `vip.svg` | DMs with VIP people |
| Unreads | "Unreads" (`unreads`, 22638) | `svgMarkAsUnread` → `mark_as_unread.svg` | conversations with unreads |
| External | "External" (`external`, 6601) | `svgBuildings` → `buildings.svg` | Slack Connect (external-shared) conversations |

  Icons are declared at `PerTabPreferencesServiceInterface+DM.swift:20-31`, titles at :33-44. Each svg lives in
  `Modules/Data/Icon/ResourceBundle/Icons.xcassets/<name>.imageset/`.
- **Row.** Edge to edge, **54pt** tall, `.pillButton` style, `.fitAllContent`, tab-bar content inset 12 left and right, row
  background = list background (:917-943).
- **Pill colors:**
  - unselected text and icon: `core.primary.contentSecondary` #454447 / #b9babd
  - selected text and icon: `theme.contentInversePrimary` #ffffff
  - selected fill: `theme.baseInverseSecondary` #611f69 / #431349
  - border on every pill: 1pt `core.primary.outlineTertiary` #5e5d60 @13% / #797c81 @30%
- **Widths.** Computed with Lato-Bold 15 for the titles. Each cell is title + 28 (icon) + 32 + 8, at least 88
  (`TabBarCollectionViewCell.swift:320-361`).
  - Without VIP (3 tabs): All 88, Unreads 123.9, External 123.4, total 335.3. That is less than 393 − 24 = 369, so each
    gets +11.2 and the visible pills (cell − 8) are ≈ **91 / 127 / 127 × 36pt**.
  - With VIP (4 tabs): 88 + 92.1 + 123.9 + 123.4 = 427.4 > 369, so they keep their intrinsic widths and the row scrolls
    horizontally.
- **Tap:**
  - stores the filter per workspace (`dmPreferencesService.update`) and reloads the list (`DMInteractor.swift:375-385`)
  - suppresses the loading state for 0.5s (:122, :567-573, :633-643)
  - plays a selection haptic
  - selection is applied from the preference; `shouldAutomaticallyPerformTabChange: false` (:928)
  - if VIP access is lost, the VIP filter falls back to All (`DMInteractor.swift:919-940`)

- **Production (device screenshots, Sept 2026):** measured on a 440 pt iPhone 17 Pro Max (`reference/device/IMG_2249`): pills
  y 253–289 (36 tall in the 54 pt row), All x 16–123 (selected: fill (67,19,72) = `#431349`, a (84,51,89) border, Bold
  title + icon in white), Unreads 131–273.7, External 281.3–424 (Regular titles, `content_secondary`, (55,57,61) borders),
  8 apart: the widths above with the leftover 80.7 pt shared out (+26.9 each). Sept: the selected title is smallBodyBold,
  the others smallBody; icon box 24 pt, 4 pt to the title; radius 10; an 8 pt blank footer under the row, no hairline
  (`TabBarCollectionViewCell.swift:37-62`, :320-383, :443-473; `DMPresentationObjectFactory.swift:147-148` [Sept]).

June (cd22922): with `iaNextDmsFilters` off, a header filter button opened an "All conversations" / "Only Unreads" /
"External people" menu and a "**Unreads** only" banner row sat over the list. Sept deleted both
(`DMNavigationBarControlsManager.swift` is gone; the banner extension at `DMPresentationObjectFactory.swift:640-642` is empty).

### 2.5 DM row (`MKMessagePreview`)

Built at `DMPresentationObjectFactory.swift:395-521`. The config is at :429-450.

- **Config:**
  - reactions hidden
  - no "show more" attachments
  - body not interactive
  - no background styling
  - blocks summarized
  - message styling: `shouldShowBadge: true`, badge style = list theme `badgeStyle`, `shouldIdentifyYourMessages: true`
    (with `dmSummaries` the row is a `SummarizableDM` whose summary is still nil, so the "You: " prefix is dropped, :415-422),
    `baseFont .smallBody`, `baseTextColor` = the list theme's `itemSecondaryForegroundColor` (`content_secondary`, :441)
  - accessories: the muted icon (below), :424-427
  - header content `.conversation` with status emoji and presence
  - timestamp style is the default `.relative`

| Element | Content | Style | Source |
|---|---|---|---|
| Ornament (36pt) | 1:1 DM: the other person's photo with a **presence** indicator (§1.2) in theme colors: active `theme.baseInverseHighlight2` (#c474d3 / #bc80ce default, #20a271 / #3daa7c Aubergine preset), away `content_tertiary`. External user whose org has a logo: the org logo badge replaces presence (`.externalMember`). Group DM: group avatar of the first two other members. Missing user: blank placeholder | | `Mappers/AvatarMapper.swift:69-104`; `ListThemeOptions.swift:84-86` |
| Name (primary) | conversation name (`nameWithoutIconPrefix`; group DMs list the members' names) + " " + the person's status emoji (1:1 only) | **bodyBlack 17 when the conversation has unreads, bodyBold 17 when read**; `content_primary` #1d1c1d / #f8f8f8; up to 4 lines | `Mappers/AuthorMapper.swift:47-56`, :105-116; `Modules/Data/DataModels/Implementation/ClientModels/Conversations/Conversation.swift:75` |
| Custom-named group DM | extra mustache line under the name with the member names | caption 13 | `DMPresentationObjectFactory.swift:461-471` |
| Agent DM (with `agentsAndAppsBadging`) | an "AGENT" tag after the name (`agent_badge`, L1085; accessibility "agent", L1089) when the other user `isShownAsAgent` | `SKBadge` `.text`, rounded rectangle: `content_secondary` text on `surface_primary` | `DMPresentationObjectFactory.swift:473-488` |
| Timestamp | latest message time, `.relative` ("now", "5m ago", "3h ago", "1d ago", "Jun 4th"; §0.5); "Sending…" while pending | micro 12 `content_tertiary`, right-aligned at the top of the name row | `Mappers/TimestampMapper.swift:29-30`, :61 |
| Unread badge | `SKBadge` count = `conversation.badgeCount` (0 hides it; >9 shows "9+") | `.text` style: `theme.baseInverseImportant` fill #83388a / #9652a2, `theme.contentInverseImportant` text #f9edff / #efe1f5; 18pt tall pill, 8pt right of the timestamp | `MessagePreviewable.swift:158-160`; `HeaderAccessoryMapper.swift:62-70`; `ListThemeOptions.swift:72-74` |
| Last-message preview | summarized blocks of the latest message. If you sent it, prefixed "You: " (`name_with_colon` "%@:" yaml:12734 + `you` "You" yaml:24205 + space), in the same style | smallBody 15, `content_secondary` #454447 / #b9babd; mentions and links keep their own colors; **2 lines** then ellipsis; directly under the name (0pt) | `Mappers/TextMapper.swift:105-112`, :227-244; `DefaultTransformationPath.swift:420-441` |
| No latest message yet | italic "Loading latest message" (yaml:5570), no timestamp, no badge | | `Previewables/DMMissingLatestMessagePreviewable.swift:45-47`, :172-180 |
| Muted | trailing `svgNotificationsOffFilled` (→ `notifications_off_filled.svg`, 20pt, `content_tertiary`) next to the preview, whenever the conversation is muted (June: only with `swipeActions` on) | | `DMPresentationObjectFactory.swift:424-427`; `DMInteractor.swift:1309` |

- **Sept colors:** the name is `content_primary` (`AuthorMapper.swift:53-55` [Sept]; June `sk_primary_foreground`), the
  preview the list theme's secondary item color, now `content_secondary` (`DMPresentationObjectFactory.swift:441`,
  `ListThemeOptions.swift:77` [Sept]; June `sk_foreground_max_solid`).
- **Geometry:**
  - Name-only rows are 10 + 36 + 10 = 56pt, because the ornament is taller than a 20.4pt name.
  - With a 2-line preview: 10 + 20.4 + 36 + 10 ≈ **76.4pt**; with a 1-line preview ≈ 58.4pt.
  - Text column is x = 64 → 377.
- **Unread state.** There is no unread dot or background tint. Unread shows as black-weight name + badge.
- **Selection.** Only iPad highlights the selected conversation (:1294-1295).
- **Drafts.** Nothing in the DM row path mentions drafts, so rows don't show a draft marker (searched `Modules/Features/DM`,
  `Modules/DataService/DirectMessagesDataProvider`, `DefaultTransformationPath.swift`).
- **App / bot DMs.** Both data providers drop 1:1 conversations with bots and Slackbot from the list, except, with
  `agentsInDms` on and the user's `hideAgentsInDmList` pref unset, bots that are shown as agents and interactable
  (`PaginatedDirectMessageSubscription.swift:202-208`; `DirectMessageQuery.swift:275-283`; `DMInteractor.swift:187-190`,
  :987-997). Slackbot is never listed; with Slackbot AI it leads the people carousel (`DMInteractor.swift:1116-1122`).

### 2.6 VIP sections

- Shown with VIP access. Unread VIP DMs are split into their own section, header "VIP unreads" (`SKHeaderEntity` default
  `.medium`: smallBodyBold 15 `content_primary`, 12/16 padding + 8 top). A second header "Everything else" follows.
  Neither section has a footer (`DMPresentationObjectFactory.swift:127-146`).
- Sorting with VIP: unread VIPs first, then unread non-VIPs, then everything else by latest message time
  (`PaginatedDirectMessageSubscription.swift:299-346`).
- Without VIP: newest first, with ties broken by id (:348-364).

### 2.7 "Add teammates" rows

- **Bottom row** (`DMPresentationObjectFactory.swift:354-389`). `SKGenericEntity` `.medium`:
  - Padding 10 / 16; ornament 36pt; 12pt gap.
  - Ornament: an ornament box with `svgUserAdd` (→ `user_add.svg`) in `theme.contentInversePrimary` (white) on
    `theme.baseInversePrimary` (#39063a / #200221).
  - Primary text "Add Teammates" (yaml:854): body 17 `content_primary`. Secondary "By SMS, email, or phone contacts"
    (2728): caption 13 `content_secondary`.
  - Component sources: `SKEntityBaseView.swift:61-67`, `SKEntityContentView.swift:57-63`, :360-366.
  - Tap opens the invite flow.
- **Onboarding row** (:608-638): same layout; primary "Add teammates" (857) in **bodyBlack** `content_primary`,
  unlimited lines; icon `svgUserAdd` in `sk_black`.

### 2.8 Loading, pagination, refresh

- **First load.** A 3-row skeleton section (image mask, medium) stands in for the rows (:299-312): with the legacy
  provider until the first data arrives, with the paginated one (`modernizeDmDataProvider`) while a page loads, except in
  the 0.5s after a filter change (:70-71; `DMInteractor.swift:121-122`, :567-573, :633-643).
- **Paging.** The modern provider pages 20 at a time (`DMInteractor.swift:114`, :1017-1023) and loads the next page near
  the bottom (`DMViewController.swift:163-164`). The legacy provider caps at 50 (:113).
- **Deferred updates.** If a data update arrives while the user is pulling the list down, it waits until the drag ends
  (`DMViewController.swift:180-195`).

### 2.9 Empty states

`SKPaddedEmptyStateDeprecated`: 30pt top padding, then `SKEmptyState` (§1.8); background `base_primary`.

**Production (device screenshots, Sept 2026):** with no DMs the empty state sits right under the pills (not centered in
the rest of the screen): the carousel, the pills, an 8 pt footer, 30 pt, the 120 pt image, "Slack is better when ⏎
everyone’s here" (Lato Black 22), the body (Lato 17 `content_secondary`), the green **Browse Teammates** (`.medium`
`.primary`; Sept fill `highlight2.baseInverse`, `SKButton+Types.swift:166-167` [Sept]) (`reference/device/IMG_2249`).

- **Image** (phone): `Modules/UIInfra/SlackKit/ResourceBundle/SlackKit.xcassets/dms_empty_state.imageset/DM Light.svg`
  (120×120, a purple chat-bubble illustration). Dark mode uses `dms_empty_state_dark.imageset/DM Dark.svg`.
- **iPad** shows the emoji 🌼 instead (🌞 for Unreads).
- **Button** `.primary` (green).
- **Which copy.** Chosen by the user type from `emptyStateService` and the filter
  (`DMPresentationObjectFactory.swift:671-904`):

| Filter / user | Title | Body | Button |
|---|---|---|---|
| All: frontline worker (any user type; Sept) | "No direct messages yet" (12955) | "When someone messages you, it'll show up here." (5580) | "Send a message" (17432) → compose (:673-674, :702-710) |
| All: active user, or joiner in a large team | "Slack is better when ⏎ everyone’s here" (19441) | "Browse everyone in %@ and strike up a conversation." (2619; workspace name) | "Browse Teammates" (2629) |
| All: creator, or joiner in a small team | same title | "Add your team and get the ⏎ conversation started." (981) | "Add Teammates" (854) |
| Unreads, user has had DMs before | one of five, picked at random (`DMInteractor.swift:1428-1436`): 🙌 "You’re all caught up" / "Nice work!"; 🎉 "Ta-da!" / "You’re up to date."; 🌞 "Nothing new" / "Carry on."; 🐴 "You've read all the unreads" / "Here's a pony."; 🦦 "No unread DMs" / "Isn't that nice?" (48pt emoji) | | "Show all DMs" (18944) → switches the filter to All |
| Unreads, never had DMs | "No unread DMs...yet." (13107) | as for All (per user type) | as for All |
| External | "No conversations with people outside %@... yet." (12948) | "Use Slack Connect to collaborate securely with external clients, vendors, and partners." (22860) | "Start a Conversation" (20549); joiners without invite permission get "Show all DMs" |
| VIP, has VIPs | "No VIP DMs" (13139) | — | — |
| VIP, no VIPs | "No VIP DMs" | "Add your boss or besties to the VIP list so you see their messages first." (972) | "Manage VIP" (11616) |

"⏎" marks the literal line break (`\n`) in the string.

Button actions (`DMInteractor.swift:534-556`): Show all DMs → All filter; Start a Conversation → compose; Send a message → compose;
Add Teammates → invite; Browse Teammates → people browser; Manage VIP → VIP settings.

### 2.10 Row actions

- **Tap** opens the conversation (`DMInteractor.swift:658-661`, :709-714).
- **Long press**: iOS context menu. The preview is the conversation transcript (header + messages) on `base_primary`,
  350×450 (:124, :1197-1221; June: that size only with `channelEmailAddress`). The menu is titled with the conversation
  name (:1319-1365):
  - Section 1:
    - "Mark as Read" (11775, `svgMarkAsRead`) if unread; otherwise "Mark Unread" (11784, `svgMarkAsUnread`), always (June: only with `markAsUnreadAction`)
    - "Add to VIP" (947, `svgVip`) / "Remove from VIP" (16260, `svgVipFilled`): 1:1 only, with VIP access
    - "Mute Conversation" (12637, `svgNotificationsOff`) / "Unmute Conversation" (22592, `svgNotifications`); not offered for Slackbot or Slack Security
  - Section 2:
    - "View Profile" (8148, `svgUser`): 1:1 only
    - "Copy DM Email" (`copy_dm_email_context_menu`, 4710, `svgEmail`; June: "Copy Email Address", 4719): only if permitted
  - Builders: `Modules/Features/Handlers/SectionItemAction/Implementation/ConversationActionBuilder.swift:54-68`, :111-152, :191-219.
- **Swipe** (always on; June: flag `swipeActions`; `DMInteractor.swift:1223-1271`). Defaults come from the user's swipe preferences
  (`Modules/Features/Preferences/Implementation/SwipeActionsSettings/SwipeActionsManager.swift:18-35`):
  - **Swipe right**, the `left` action, default "toggle read":
    - label "Mark as Read" or "Mark Unread"
    - icon `svgMarkAsRead`/`svgMarkAsUnread`, switching to the `…Filled` icon past the threshold
    - background `highlight1.baseInverse` #1264a3 / #0a77a7 (Sept token; June dark #004d76), text `content_inverse_primary`
  - **Swipe left**, the `right` action, default "toggle mute":
    - label "Mute" (12622) or "Unmute" (22586)
    - icon `svgNotificationsOff`/`svgNotifications`, switching to `…Filled`
    - background `honeycomb_50` #d38d00 / #c48305, text `content_inverse_primary` (#ffffff / #f8f8f8)
  - Both bounce back after firing (§1.6).

### 2.11 Compose FAB

The DMs tab embeds `CreationEntryPointsFABHelper`, which the root/Home specs also use. In brief:
- icon `svgPlus`, `.medium` icon-button size, theme colors (`ColorSetFABConfigurator`)
- bottom = 16pt + inset above the tab bar (`Modules/Features/CreationEntryPoints/Interface/CreationEntryPointsFABHelper.swift:87-134`);
  in the unified (SwiftUI) navigation the shell's `PrimaryFabEmbeddable` takes its place (`DMPresenter.swift:88-106`)
- accessibility "Create New" (yaml:4963; `DMViewController.swift:216`)
- tap opens the create menu with DM-specific options: VIP, if you have VIP access, and Invite (`DMInteractor.swift:780-801`)

---

## 3. Activity tab

This section covers `Modules/Features/Activity` and `Modules/DataService/ActivitiesDataProvider`. The shared components
are in section 1; only the Activity-specific values and the corner-badge avatar are spelled out here. Sept has **one**
row style and **one** filter bar: June's toggles `ios_activity_row_redesign` ("R" rows), `ios_activity_views` (server
views), `ios_activity_inbox` (+ `_reminders`), `ios_activity_mark_unread` and `ios_activity_primary_text_max_one_line`
are gone and their code is the only path, so June's "D" (default) rows, the icon tabs (All / Mentions / Threads /
Reactions / Apps / Invitations) and the inbox layout's Show and Sort pills no longer exist.

**Citation key**

| Key | Path |
|---|---|
| AVC | `Modules/Features/Activity/Implementation/ActivityViewController.swift` |
| APres | `Modules/Features/Activity/Implementation/ActivityPresenter.swift` |
| AInt | `Modules/Features/Activity/Implementation/ActivityInteractor.swift` |
| AFeat | `Modules/Features/Activity/Implementation/ActivityFeature.swift` |
| ADT | `Modules/Features/Activity/Implementation/ActivityDataTypes.swift` |
| TBF | `Modules/Features/Activity/Implementation/ActivityPresentationObjectFactories/TabBarPresentationObjectFactory.swift` |
| ESF | `Modules/Features/Activity/Implementation/ActivityPresentationObjectFactories/EmptyStateFactory.swift` |
| FIF | `Modules/Features/Activity/Implementation/ActivityPresentationObjectFactories/FeedItemPresentationObjectFactory.swift` |
| APO | `Modules/Features/Activity/Implementation/ActivityPresentationObjects/FeedItemPresentationObjects/ActivityPresentationObject.swift` |
| per-type | `Modules/Features/Activity/Implementation/ActivityPresentationObjects/FeedItemPresentationObjects/<Name>PresentationObject.swift` (UserMentions, GroupMentions, Keywords, ThreadsV2, Reactions, DM, Channel, AppsBots, InvitationsInChannel, InvitationsInSlackConnect, ListMentions, ListsTodoNotification, ListsApproval, SavedReminder, GenericSystemAlert, PrejoinDmWelcomePartyAlert) |
| ATS | `Modules/Features/Activity/Implementation/ActivityStyling/ActivityTextStyling.swift` |
| MVPOF | `Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/MessageViewPresentationObjectFactory.swift` |
| DTP | `Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/DefaultTransformationPath.swift` |
| HAM / TSM | `Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Mappers/HeaderAccessoryMapper.swift` / `…/Mappers/TimestampMapper.swift` |
| TU | `Modules/Data/I18n/Implementation/TimeUtility.swift` |
| SKMA | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift` |
| SKPB | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/PillButton/SKPillButton.swift` |
| FABX | `Modules/UIInfra/SlackKitExtensions/Implementation/FloatingActionButton/SKFloatingActionButton+Extensions.swift` |
| CSFAB | `Modules/Integration/ThemesIntegration/Interface/ColorSetFABConfigurator.swift` |
| DTCS | `Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift` |
| yaml | `Modules/Data/Strings/Implementation/localized_strings.yaml` (written L<n>) |

### 3.1 Source

- **Screen.** `ActivityViewController` holds an `SKList<MKMessagesListAdapter>` pinned to all edges (AVC:46-51, 163), a
  floating "Unreads" `SKPillButton` (AVC:53-75) and (Sept, flag `activityBetterIndicators`) a "New activity" pill
  (AVC:77-129, :183-187). June's iPad-only gradient view is gone.
- **Rows.** Every row is an `MKMessagePreview` from `MessageViewPresentationObjectFactory.generateMessagePreview`
  (APres:221-227). The row type is chosen from `activity.metadata` (FIF:94-142).
- **Filter bar.** A custom list row that wraps `SKTabBar` (`Modules/Features/Activity/Implementation/ActivityTabBarCustomRow.swift:16-64`).
- **Data.** `PaginatedActivitiesDataProvider` (offline-capable with `activityOfflineAccess`, AInt:941-1044). Filter
  preferences are kept in UserDefaults (`Modules/DataService/ActivitiesDataProvider/Implementation/ActivityViews/ActivityPreferencesService.swift:131-144`).
- **Snapshots.** None. There is no `Snapshots/` folder for Activity, and no snapshot folder anywhere matches "activ".
- **Toggles that change the UI** (Sept; all server-side, `"defaultValue": false` in `Modules/Data/Toggles/Definitions/`):

| Toggle | Effect |
|---|---|
| `ios_activity_entry_layout_refinements` (`activityEntryLayoutRefinements`) | the refined row: no corner badge, the context moves to a footer with an icon, read names in Regular `content_tertiary`, a dot / pencil (draft) / check (you engaged) instead of counts (APres:131, :206; APO:333-359, :727-753; ATS:39-75). **Off in production** (the device shows the corner badges and counts) |
| `ios_activity_better_indicators` (`activityBetterIndicators`) | the "New activity" pill (§3.4; AInt:1149-1174) |
| `ios_activity_priority` (`activityPriority`) | the top section is "Important unreads" (L9599) instead of "VIP unreads" (APres:450) |
| `ios_activity_agent_status` (`activityAgentStatus`) | a spinner or a "Suspended" warning badge on agent rows (APres:228-243) |
| `ios_slackbot_dms_in_activity`, `ios_prejoin_dm_welcome_party_alert` | enable those row types (FIF:135-140) |

### 3.2 Screen structure

- **Header.** Activity only configures the root header (another spec) (AInt:1425-1448, :400-401):
  - title "Activity" (`activity`, L586)
  - no left buttons
  - right buttons, in screen order: Slackbot (when Slackbot AI is visible and `slackbotMainHeaderEntrypoints` is on),
    then the user avatar; none in the unified (SwiftUI) navigation (AInt:1429-1438)
  - loading indicator on; "pull to smile" off
  - on iOS 26 the title fades as the list scrolls (APres:561-570)
- **Background.** Both the list and the view use the list theme's `base_primary` (APres:65, :85, :98; `ListThemeOptions.swift:67-69`).
- **Sections, top to bottom** (APres:39-122, :385-486; ADT:171-177):
  1. **`tabBar`**: one edge-to-edge filter row (APres:404-418).
     - As the first section it gets the default 8pt of header padding (`SKList.swift:2074-2075`; `SKListFooterView.swift:19`).
     - Footer: an 8pt footer with a 1px `outline_tertiary` hairline, always (June: R rows only) (APres:417).
     - Not pinned; it scrolls with the list (`SKListPresentationObject.swift:149-165`).
  2. **Activity rows.** These sections **do** have row separators (APres:449, :461, :478):
     - a 1-physical-pixel `outline_tertiary` line, full row width from x = 0, under **every** row including the last
       (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Decoration/SKListRowSeparatorDecorationView.swift:13`, :33;
       `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Layout/SKListCollectionViewLayout.swift:206-212`, :450-455)
     - the selected view's sort option splits the feed: "priority unreads first" adds a "VIP unreads" section (or
       "Important unreads" with `activityPriority`), "unreads first" an "Unreads" section; the rest follows under an
       "Everything else" header (L6534) only when that top section has rows; "newest" is one header-less section
       (APres:423-486)
     - no date headers
  3. **`empty`**: the empty state, after the tab bar, when there are no rows and loading is done (APres:41-49, :57-66, :347-380).
- **Loading.** An `SKLoadingState` with an image mask, `.medium`, in the list theme's placeholder style (shimmering on
  `base_primary`) (APres:520-558).
- **Pagination.** From the provider (APres:81-82). `nextPageRequested` loads older items (AInt:429-430, :857-862).
- **Refresh:**
  - on `viewWillAppear` (at most once per 15s), on filter change, pull to refresh, foregrounding and reconnect
    (AInt:677-699, :864-883, :1186-1201, :1217-1229, :2253-2257)
  - any preference change (switching views, the Unreads pill) scrolls to the top, not animated (AInt:724-737)
  - re-tapping the tab bar item scrolls to the top, animated (AVC:381-386)
  - on iOS 26 or iPad a native `UIRefreshControl` is used, tinted `theme.contentInversePrimary` (AFeat:192; AVC:198-201;
    APres:336-345). Elsewhere CompactRoot's `pullToBehavior = .refresh` handles it (AFeat:909)
- **New users** who have never had activity see no filter bar and no Unreads pill (APres:391-393, :285).

### 3.3 Filter bar (server views)

- **Component.** `SKTabBar` configured exactly like the DM pills (§1.4, §2.4) (TBF:45-73):
  - `.pillButton(selectedBackgroundColor: theme.baseInverseSecondary, textColor: core.contentSecondary, selectedTextColor: theme.contentInversePrimary, borderColor: core.outlineTertiary)`
  - `.fitAllContent`, content inset 12 left and right, list-color background
  - `shouldAutomaticallyPerformTabChange: false`; no counts on tabs
- **Tabs** = the user's Activity views from the server, in order (TBF:36-43): "All" (`all`, L1603) and "DMs" (`dms`,
  L5586) are built in, other views show their own name; a view may carry a leading emoji ornament (Sept), and a view
  with neither a title nor an emoji is hidden (TBF:83-114). No icons otherwise. The selected tab is the stored view id,
  else the first (TBF:48-49, :76-81).
- **Selecting a view** stores that view's own filter options, sort option, channel / section scope and automations
  filter (`Modules/DataService/ActivitiesDataProvider/Implementation/ActivityViews/ActivityViewsDataProviderPublisherFactory.swift:120-150`).
  So switching views also resets the Unreads pill to the view's `unreadOnly` setting, normally off (AInt:1751-1764).
  Defaults: All, Unreads off, Newest (`Modules/DataService/ActivitiesDataProvider/Interface/ActivityViews/ActivityPreferences.swift:21-29`).
- **Production (device screenshots, Sept 2026):** the views layout (the Sept checkout's only one, TBF:36-116 [Sept]):
  text-only **All / DMs / Mentions / Threads** ("All" `all`, "DMs" `dms` built in; "Mentions" and "Threads" are server
  views), filling 440 pt: All x 16–106.3, DMs 114.7–205, Mentions 213.7–319.3, Threads 327.7–423.7, y 133–169, a hairline
  under the row at 185.67 (`reference/device/IMG_2250`). The DMs view shows `dm` entries. The clone always draws this
  layout (no flag).
- **Server types per filter option** (`Modules/DataService/ActivitiesDataProvider/Implementation/HttpActions/ActivityFeedAction.swift:164-213`):

| Filter | Types |
|---|---|
| All | every type except `calendar_upcoming_event` (Sept now includes `dm`, `channel` and `saved_reminder`, which June's All left out) |
| Mentions | `at_everyone`, `at_user_group`, `at_user`, `at_channel`, `keyword`, `list_user_mentioned`, `unjoined_channel_mention` (or the view's subset) |
| Threads | `thread_v2` |
| Reactions | `message_reaction` |
| Apps | `bot_dm_bundle` |
| Invitations | `internal_channel_invite`, `quietly_added_to_channel` (new), `external_channel_invite`, `external_dm_invite` |
| DMs | `dm` (+ the welcome-party alert when its toggle is on) |
| Channels | `channel` |
| Reminders | `saved_reminder` |

  `dm` is removed from every request when the user opted DMs out of Activity (pref `activity_dms_opt_out`;
  `ActivityFeedAction.swift:155-161`; AInt:919, :744-755). The client also filters (AInt:823-849): Threads keeps only rows
  whose `thread_ts` ≠ `ts`, and Reactions shows nothing while Unreads is on.

### 3.4 Floating pills: "Unreads" and "New activity"

- **Unreads pill.** `SKPillButton(useGlassEffect: true)` (AVC:53-75), built with
  `SKPillButton.PresentationObject.applying(title:configurator:isSelected:)` and `ColorSetUnreadsPillConfigurator`
  (APres:269-286; FABX:60-91; CSFAB:86-117).
  - label "Unreads" (L22638); accessibility "Only Unreads" (L13999); smallBodyBold 15 (FABX:82); padding 14 top/bottom,
    20 left/right (FABX:54-57, 69-85); when selected, a trailing 20pt `svgClose` icon (`close.svg`) 8pt after the text (SKPB:19)
  - colors: unselected `content_primary` text on `base_tertiary` in light; `gray_10` text on `gray_90` in dark. The
    palette values flip in dark mode, so the dark pill is **light gray #e0e0e0 with dark text #212428** (`Colors.swift`,
    see §3.10). Selected: `theme.contentInverseImportant` text and icon on `theme.baseInverseImportant`
  - always a capsule: the radius is height / 2 (SKPB:166), which overrides the 16pt set in AVC:55. On iOS 26 it is an
    interactive `UIGlassEffect(style: .clear)` tinted with the pill color (SKPB:41-49, 376-387)
  - border: AVC:194 and :224 set a 1pt `outline_tertiary` border, but `configure` then resets the width to 0 because
    `outlineColor` is nil (SKPB:417-424). Result: **no border**
  - size (derived from Lato metrics): unselected 14 + 18 + 14 = **46pt** tall; selected 48pt. While selected it is drawn
    at 0.9 scale (SKPB:18-20, 350-360)
  - position: trailing 16pt inside the safe area, or aligned with the iOS 26 glass tab bar's trailing edge; bottom 16pt
    above the bottom layout margin (AVC:191-193; `CustomConstraintHelpers.swift:112-143`)
  - tap toggles the Unreads filter (the other options stay) and plays a selection haptic (AVC:60-68; AInt:1123-1134).
    Hidden for new users (APres:285)
- **"New activity" pill** (Sept, flag `activityBetterIndicators`; APres:288-334; AVC:77-129, :166-187, :231-240): a 36pt
  capsule centered at the top, 8pt below the safe area; an `svgArrowUp` icon, "New activity" (`new_activity`, L12786)
  in captionBold white (max 20pt), and an `svgClose` dismiss button (32pt-wide icon buttons drawn at 0.8 scale); on iOS 26
  an interactive clear glass tinted `highlight1.baseInverse`, else a solid `highlight1.baseInverse` fill; black shadow
  0.2 opacity, radius 0.5. Shown while the filter bar is scrolled out of view and a newer activity has reached the top
  (AInt:1149-1178); tapping it scrolls to the top (animated) and hides it, the ✕ dismisses it (AInt:1136-1147).

### 3.5 Rows: what Activity passes to `MKMessagePreview` (APres:125-262)

**Config** (APres:184-216)
- Reactions: shown, no add pill, collapsed to 2 rows with "N more", long-press only (APres:191-196).
- Attachments and body: `shouldShowMoreAttachments: false`, `isSecondaryContentInteractionEnabled: false`;
  attachments `.custom(.mixed(maximumExpandedCount: 0), static thumbnails)` (APres:184-188).
- Spacing: `customSpacing: 4`, so the name → body gap is **4pt** instead of 0 (APres:199).
- Other: `linkPrivateChannels: false`, `shouldSummarizeBlocks: true`, `useSurfaceColor` on iPad only.
- Timestamp: `.relative` (the default, MVPOF:352).

**Message styling** (APres:203-215)
- `shouldShowBadge: true`; badge style `.emphasized(backgroundColor: theme.baseInverseImportant)`; dot color
  `theme.baseInverseImportant`; accessory alignment `.center` (APres:182-183).
- `baseFont` **body 17** (bodyBold / body by read state only with `activityEntryLayoutRefinements`, APres:206).
- `baseTextColor`: `content_primary` when unread, `content_secondary` when read (ATS:59-69).
- Text folds to **1 line for reactions** and 2 lines otherwise (APres:212).
- The name is always **1 line** (`primaryTextNumberOfLines: 1`, APres:213; June: 4 unless a toggle). Mustache is 1 line (DTP:605).
- Activity never sets an eyebrow: every type returns `eyebrowText = nil` (APO:276-278).

**Production (device screenshots, Sept 2026):** the **R** rows (`activityRowRedesign` on; Sept's only style, refinements
off: `ActivityPresentationObject.entryLayout`, APO:727-753 [Sept]). A DM row: the sender's 36 pt avatar with
`svgDirectMessages` in its corner notch, the name (bodyBold read / bodyBlack unread, `content_primary`, **1 line**,
APres:213), the timestamp at the name row's end, "Direct Message" under it (caption 13; captionBold `content_primary`
when unread, `content_secondary` read), 4 pt and 8 pt apart, then the body (2 lines, no "You:"). Mentions: "Mention in
#channel" + `svgMentions`; threads: the participants, "Thread in #channel" / "Thread in Direct Message" + `svgThreads`;
reactions: the reactors, "Reacted in #channel" / "Reacted to your message", the emoji in the corner, 1 body line; apps:
"App" + `svgApps`. Unread badges: a count with `svgComment` for DMs, threads and apps, "1" for mentions and reactions; read
rows on `base_secondary` (`DefaultTransformationPath.swift:353-354` [Sept]). Measured (`reference/device/IMG_2250`): row
top 186, avatar 196–232, name ink 200–213.3 at x 65.3, context 223.7–235.7, body from 248.7. The clone always draws
these rows (`src/app/screens/activity/rows.tsx` › `activityRow`; no flag).

**Row anatomy** (MKMessagePreview, §1.1; APO:727-753 with refinements off)
1. Optional AI "Action item" pill.
2. 36pt ornament (the avatar with the type's icon in its corner notch, §3.6) next to the name line, which carries the
   timestamp and the badge or dot.
3. The context line (mustache, e.g. "Mention in #general"), the body, attachments and reactions. No header line and no
   footer (June's D rows had both).

**Type**

| Element | Font | Color | Lines | Source |
|---|---|---|---|---|
| Name | unread **bodyBlack 17**, read **bodyBold 17**. System alert: unread bodyBlack, read body | `content_primary` | 1 | ATS:39-57; APO:579-612; GenericSystemAlert:102-106 |
| Timestamp | micro 12 | `content_tertiary` | 1 | `MKCoreMessageProperties.swift:249-255` |
| Context line | read caption 13; unread captionBold 13 | read `content_secondary`; unread `content_primary`; inline icons `content_secondary` | 1 | ATS:14-37, :88-115 |
| `<bold>` / icon tags in the context (system alerts, list items) | read: no weight change; unread: black weight | unread `content_primary`, read `content_secondary` | | APO:484-531 |
| Body | body 17 | unread `content_primary`, read `content_secondary` | 2 (reactions 1) | APres:206-212; ATS:59-69 |
| "You: " / "Name: " prefix | never: every Activity type sets `shouldIdentifyYourMessages` / `…OthersMessages` false except channel posts and saved reminders (`Channel:83`, `SavedReminder:85`) | | | APO:200-206; `Mappers/TextMapper.swift:105-112` |

**Unread and read**
- Unread: black-weight name, primary-color text, and a badge or dot (table below).
- Read: bold name and secondary-color text, on the ephemeral background `base_secondary` (#f8f8f8 / #1a1d21), pressed =
  10% darker (DTP:333-334; APO:264-266; `BackgroundStyleMapper.swift:18-20`; `MKCoreMessageProperties.swift:171-177`, :201).
  Unread rows stay on the list background.
- Tapping an unread row marks it read through the activity item actions (AInt:1872-1885; June's
  `Network/ActivityMarkReadAction.swift` is gone). The row restyles when the local write lands, with the default list
  content transition (APres:84).

**Badge and dot by type** (HAM:62-82; each type's `entryLayout`, refinements off)

| Type | Unread | Read |
|---|---|---|
| Mentions, group mentions, keywords, channel invites, list mentions, saved reminders, reactions | badge "1" while the "include threads in badge count" pref is off (the default), else a dot (UserMentions:65-78; AInt:191-193) | none |
| Thread | count (`unreadRepliesCount ?? unreadCount`) with a leading `svgComment` icon (ThreadsV2:78-97) | "Replied" tag when your reply is the latest (ThreadsV2:83; APO:698-713) |
| DM | count = `conversation.badgeCount ?? unreadCount`, plus `svgComment` (DM:62-76) | "Replied" tag when your reply is the latest (DM:67) |
| Channel post | count + `svgComment` when `badgeCount > 0`, else a dot (Channel:64-72) | none |
| App | count = `unreadCount`, plus `svgComment` (AppsBots:70-83) | none |

- Count badge: `SKBadge` `.emphasized` with `theme.baseInverseImportant` fill, `content_inverse_primary` text, microBold 12
  (`SKBadge.swift:346`, :382-385).
- "Replied" tag (L16423): `.tag()`, `grass_70` text on `grass_5`, microBold, rounded rectangle (HAM:50-55, :73-74; `SKBadge.swift:349`).
- Dot: 12pt in a 16pt box, `theme.baseInverseImportant` (#83388a / #9652a2 in the default theme; `SKDot.swift:21-30`; APres:182-183).
- With `activityAgentStatus`, agent rows show a small spinner while the agent works, or a warning badge (`highlight3`
  colors, a11y "Suspended" L1178) (APres:228-243).

**Timestamp.** `.relative` (§0.5): "now", "1m ago", "25m ago", "1h ago", "3h ago", "1d ago" (yesterday), "Sep 5th",
"Sep 5th, 2025" (TSM:30, 71; TU:546-616). Activity never shows a clock time or a weekday.

**AI "Action item" pill** (only when the activity has an open AI nudge; APO:287-330)
- Text "Action item" (L571), or the AI topic, in captionBold `content_primary`.
- Icon `svgPriorityFilled` in `sunflower_40` at 0.75 scale.
- Padding 2 top, 6 left, 2 bottom, 8 right; `surface_primary` fill; 1pt `outline_tertiary` border; capsule; not tappable.
- At the top of the row, hugging its content (`MKMessagePreview.swift:191-202`).

### 3.6 Ornament: 36pt avatar with a corner badge

- **Type.** `SKEntityOrnament.memberAvatar` with `.memberWithIcon(icon, color: content_primary)` (APO:655-697, :755-772).
  Reaction rows use `.externalMember(emoji image)` instead (Reactions:125-150). Keyword rows have a plain author avatar
  (Keywords:64-72).
- **Geometry at 36pt** (from the `SKMemberAvatar` formulas, unchanged since June):
  - Avatar 36×36. Radius min(20, 9) = **9pt** on three corners; the bottom-right corner is square with a notch cut out
    (SKMA:98-104, :363-377).
  - Notch: square, side 10 + 0.15 × 36 − 4 = **11.4pt**, gap 2 + 0.015 × 36 = **2.54pt**. It spans 22.06 → 36pt on both
    axes, and its inner corner has radius 15.4 / 3 = 5.13pt (SKMA:109, 149-162, 397-413).
  - Badge icon: a **15.4×15.4pt** box at x = y = 23.14pt, so it overhangs the avatar by 2.54pt. The SVG is tinted
    `content_primary` with no fill behind it (SKMA:266-271, 541-544).
  - Emoji badge (reactions): the same 15.4pt box, aspect-fill, radius 3.85pt, with a 1px `surface_primary` border (SKMA:287-304).
  - Checked against the 56pt snapshot
    `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberAvatarSnapshotTests/testExtraLargeMemberAvatarExternalWorkspaceConfiguration@3x.png`
    (2 × 2 grid; the normal-contrast column is pixel-identical to June's): predicted 38.76 / 40.44pt, measured 38.7 / 40.3pt.
- **Icon-box ornaments** are 36pt `SKOrnamentBox`es, radius 9, with a centered 20pt icon.

### 3.7 Row types

Unless noted, the body is the message text and the name is the sender (APO:596-612). The context line is the type's
"metadata text" in caption 13 (captionBold when unread, ATS:14-37), the corner badge its icon (each type's `entryLayout`).

- **User mention** (`at_user`, `unjoined_channel_mention`; UserMentions). Context "Mention in %@" (L12027) with the
  channel ("#general"), "Direct Message", a canvas name, or "Mention in %@ thread" (L12033) for a list thread
  (UserMentions:87-101; APO:981-1000); corner `svgMentions` (UserMentions:65-78).
- **Group mention** (`at_channel`, `at_user_group`, `at_everyone`; GroupMentions). Context "%@ in %@" (L23071) or "%@ in
  Direct Message" (L23068), where the first %@ is "channel" (L3693), "everyone" (L6511), the group handle (only when
  you're a member), or "Mention" (L12036) (GroupMentions:88-112, :120-155); corner `svgMentions`.
- **Keyword** (Keywords). Context "[search icon] Keyword used in #chan" (L602), or "[search icon]word keyword used in
  #chan" (L627) with the first matched keyword (Keywords:88-108). Plain author avatar; no menu.
- **Thread reply** (`thread_v2`; ThreadsV2).
  - Name = the participants, the latest replier first (ThreadsV2:132-140):
    - "A and B" (L12688)
    - "A, B, and C" (L12710)
    - "A, B, and N others" (L1846)
    - you appear as "you"; "Just you" when you're alone (`MessageUtility.swift:13-97`, :152-197)
  - Context "Thread in #chan" (L21638), "Thread in Direct Message" (L21631), "Thread with an AI Agent" (L21660), or
    "Thread in" + a list / canvas name (ThreadsV2:112-129).
  - Ornament: the activity user's avatar (else the latest other replier) + `svgThreads` badge (ThreadsV2:164-224).
- **Reaction** (`message_reaction`; Reactions).
  - Name "Ann", "Ann and Bo", "Ann and 2 others" or "Ann and several others" (L1849) (Reactions:84-93, :166-198).
  - Context "Reacted in #general" (L615) or "Reacted to your message" (L618) (Reactions:108-121).
  - Ornament: the reactor's avatar + the emoji in the corner (Reactions:125-150). Body: 1 line, plus the reaction bar.
- **DM** (`dm`; in All and DMs; DM). Name = the sender (Slackbot as "Slack" with Slackbot AI). Context "Direct Message"
  (L5452) or the group DM's name (DM:90-117). Avatar + `svgDirectMessages` badge. No "You: " prefix.
- **Channel post** (`channel`; DM-style; Channel). Name = the sender. Context "Post in %@" (L14970) (Channel:85-93);
  avatar + `svgChannel` or `svgLock` badge (Channel:110-116).
- **App** (`bot_dm_bundle`; AppsBots). Context "App" (`app_title`, L1991; June: " APP " capitalized) (AppsBots:92-95);
  avatar + `svgApps` badge.
- **Channel invite** (`internal_channel_invite`, `quietly_added_to_channel`; InvitationsInChannel). Context "Invitation"
  (L9844) (InvitationsInChannel:83-86); avatar + `svgPaperPlane` badge. Body: "Added you to #chan" (L1015) or "invited
  you to %@" (L10168) (:87-98).
- **Slack Connect invite** (InvitationsInSlackConnect). Name "%@ from %@" (L22926) (:84-93). No context line. Body:
  "Added you to #chan", "invited you to direct message" (L10164), or "invited you to <workspace>" (:95-111). The
  inviter's image + `svgPaperPlane` badge (:113-129).
- **List record edited / mentioned / assigned** (ListMentions). Context "Update in [list-item icon] %@" (L22746),
  "Mention in [list-item icon] %@" (L12030) or "Assignment in [list-item icon] <b>%@</b>" (L2152) (ListMentions:114-134).
  Body: the field value; for edits, "old → new" with an `svgArrowRight` in `content_tertiary`; missing values "Empty" in
  `content_tertiary`; no preview: "Unable to show preview." (L605). Avatar + `svgMentions` badge. No menu.
- **List to-do reminder** (ListsTodoNotification). Ornament `svgLists` in white on a `honeycomb_50` box (:185-200). Name:
  the record title, or "Untitled item" (L22696) (:141-149). Context "[reminder icon] Reminder in [list icon] %@" (L21809)
  (:151-165). Body: "This item is overdue by %@." (L11153), "This item is due today." (L11144), or "This item is due in
  %@." (L11141) (:80-110).
- **Salesforce approval** (`assignmentApprovalsV2`; ListsApproval). Ornament `svgSfRecordFilled` in
  `content_inverse_primary` on a `lagoon_50` box (:39-53). Name "Salesforce" (L16871). Context "[cloud icon] Approval in
  %@" (L11272) (:69-93). Body: "%1$@ has %2$@ your request." (L2022), "%@ has reviewed your request." (L2019), or "%@ is
  requesting your approval." (L2025).
- **Saved reminder** (SavedReminder). Ornament: a `reminder.svg` icon box (:91-96). Name "Reminder" (L16141) (:98-100).
  Context: the conversation name, "Direct Message", "[list icon] %@" (L11166), or the file title; with
  `activityEntryLayoutRefinements`, "Reminder from %@" (L16150, new) (:102-156).
- **System alert** (`generic_system_alert`; GenericSystemAlert; this includes workflow alerts). Avatar `.bell` (renders
  `notifications.svg`, :95), no corner badge. Name "Slack" (L19271), bodyBlack unread / body read (:102-106). Context:
  the category — "Channel" (L3717), "User Group" (L22932), "External Channel" (L6604), "Workflow" (L23763), "Invitation"
  (L9844), "Alert" (L1592) — or "System" (L20905) (:20-40, :108-124).
- **Welcome party** (PrejoinDmWelcomePartyAlert). Name: the invitee (:73-92). Body: "Was invited to join %@ – take a
  second to say hello." (L15136), or "…your workspace…" (L15139) (:131-156). Avatar + `svgPaperPlane` badge.
- **Huddles.** There is no huddle activity type (`ActivityMentionType.swift:8-34`); huddles appear only as thread roots.
- **Slackbot.** When Slackbot AI is on and the message isn't AI-generated, the name becomes "Slack" (or the workspace
  name for custom Slackbot responses) and the avatar Slackbot's custom icon (APO:614-653, :926-946).
- **"Mark all as read"** does not exist in Activity. There is no code for it in `Modules/Features/Activity` or
  `ActivitiesDataProvider`, and the yaml strings at L3525 / L11751 are unused here.

### 3.8 Row actions

- **Tap** marks the row read, then navigates (AInt:1482-1668):
  - threads: the thread, at the first unread reply
  - list items: the record
  - canvas mentions and reactions: the canvas section
  - approvals: the approval
  - Agentforce and Slackbot DMs: the thread
  - other messages: the conversation at that message
  - Slack Connect invites: the Slack Connect hub
  - system alerts: the target, or a "Slack" sheet (`GenericAlertDialog.swift:38-49`, :141-145)
  - saved reminders: the conversation or file
- **Long press**: a context menu, with a message-transcript preview when there's a conversation (AInt:1337-1374).
  - Standard items (APO:870-924), always (June: Mark Unread and Clear were behind toggles):
    - "Mark as Read" (`svgMarkAsRead`, L11775) when unread, else "Mark Unread" (`svgMarkAsUnread`, L11784)
    - "Clear" (`svgEraser`, L4072), or "Restore" (`svgEraserFilled`, L16618) for a cleared item
  - Common items (APO:786-868):
    - "Dismiss Action Item" (`svgPriorityDismiss`, L5514) and "Give Feedback on Action Item" (`svgShareFeedback`, L7642)
      while an AI action item is open
    - with `laterTodos`: "Add to-do" / "Remove to-do" (`svgCheckCircle`, L953 / L16358)
    - "Set a reminder" / "Edit reminder" (`clock.svg`, L17688 / L6066)
    - without `laterTodos`: "Save for later" / "Remove from Later" (`bookmark.svg` / `svgBookmarkFilled`, L16883 / L16219)
      and, with to-dos, "Add to To-dos" / "Remove from your to-dos" (L943 / L16263)
  - By type:

| Type | Menu |
|---|---|
| Mentions | standard + common + "Mute Conversation" / "Unmute Conversation" (L12637 / L22592) |
| Threads | standard + common + "Get Notified about New Replies" / "Turn Off Notifications for Replies" (L7305 / L22531) |
| Apps | standard + common + "Mute Notifications from this App" / "Unmute…" (L12640 / L22595); never for Slackbot, Slack Security or system users (AppsBots:111-113) |
| DMs, Channels | standard + common |
| Reactions | Clear + common |
| Group mentions, invites, approvals, saved reminders | standard only |
| System alerts, welcome party | Mark as Read / Mark Unread + Clear |
| Keywords, list mentions, list to-dos | no menu |

- **Swipe** (always on in Sept; `Modules/Features/Preferences/Implementation/SwipeActionsSettings/SwipeActionsManager.swift:37-54`; AInt:1376-1423):
  - swipe right, the `left` action, default toggle read state — "Mark as Read" / "Mark Unread" with
    `svgMarkAsRead(Filled)` / `svgMarkAsUnread(Filled)`; none on reaction rows
  - swipe left, the `right` action, default **Clear** / "Restore" (`svgEraser`, icon on the right, the row slides away)
    (June: only in the inbox layout)
  - colors: `highlight1.baseInverse` #1264a3 / #0a77a7 background (Sept token; June dark #004d76), `content_inverse_primary` text
  - behavior as §1.6
- **Reaction bar**: long-press opens the reactors sheet; "N more" expands and "show less" collapses (AInt:1713-1749).
  Adding a reaction is off.
- **Feedback** (AFeat:508-571, :704-899):
  - dark banners (1s, 3s under VoiceOver) with 12pt side offset: "Marked as read" (L11794), "Marked as unread" (L4630),
    "Activity item restored" (L599), "Saved for later" (L16921), "Removed from Later" (L16374) (AFeat:863-890)
  - "Activity item cleared" (L592) with "Undo" (L22519); the button uses `content_inverse_highlight_1` #9ed6fa / #2ba5ce;
    15s under VoiceOver, with an announcement (L595) (AFeat:819-861)
  - toasts: "Muted %@" / "Unmuted %@" (L3811 / L3913), "Added to your To-dos" (L1009) / "Removed from your To-dos"
    (L16393; Sept capitalizes "To-dos"); adding a list to-do shows a banner with "See details" (L17294) (AFeat:704-730)
  - errors, e.g. "Failed to mark as read" (L6702), "Failed to clear activity item" (L6687)

### 3.9 Empty states (ESF:20-226)

- **Image.** `activity_empty_state` / `activity_empty_state_dark`, 120×120 SVGs in
  `Modules/UIInfra/SlackKit/ResourceBundle/SlackKit.xcassets/`. iPad shows 🌞 instead.
- Button `.primary`; background `base_primary` (ESF:44-51).
- **Unreads on, user has had activity** (ESF:165-197). An emoji, a title and a subtitle, no button.
  - Titles when the view filters one type:
    - Mentions "No unread mentions" (L13113)
    - Threads "No unread replies" (L13119)
    - Apps "No unread apps" (L13101)
    - Invitations "No unread invitations" (L13110)
    - Reactions "No unread reactions" (L13116)
    - VIP "No unread VIP activity" (L13095)
  - Otherwise one at random (ADT:208-226), re-picked on row tap or Unreads toggle:
    - 🙌 "You’re all caught up" (L24715) / "Nice work!" (L12888)
    - 🌞 "Nothing new" (L13252) / "Carry on." (L3495)
    - 🎉 "Ta-da!" (L20918) / "You’re up to date" (L24765)
    - 🐴 "You've read all the unreads" (L24786) / "Here's a pony." (L7882)
    - 🦦 "No unread activity" (L13092) / "Isn't that nice?" (L10254)
- **Unreads on, otherwise.** Title "No unread activity...yet." (L13098). Body and button by user type (ESF:199-213):
  - active users and large-team joiners: "You’ll start to see activity if you join some conversations." (L24500) + "Browse Channels" (L2612)
  - creators and small-team joiners: "Add more people to Slack to get things moving." (L791) + "Add Teammates" (L854)
- **Unreads off** (ESF:24-160):
  - **active users** (most people): ✅ "Nothing to see here" (L5972) / "Looks like you’re all caught up. Enjoy this moment
    of peace." (L11580), no button, on every view (June: the inbox layout only)
  - creators and small-team joiners: a title by the view's single filter + "Add more people to Slack to get things
    moving." + "Add Teammates"; large-team joiners: the same titles + "You’ll start to see activity if you join some
    conversations." + "Browse Channels". Titles:
    - "Nothing to see here...yet." (L13255): All, Invitations, Channels, Reminders, system alerts, several filters
    - "No Messages" (L13010): DMs
    - "No mentions yet" (L13007)
    - "No threads yet" (L13089)
    - "No reactions yet" (L13051)
    - "No app notifications yet" (L12914)
    - "No VIP activity yet" (L13136)
- **Buttons.** "Add Teammates" opens invites; "Browse Channels" opens the channel browser (AInt:567-577).

### 3.10 Color (default theme `ColorSet.defaultAubergine`)

The default theme's "important" palette is aubergine too, so unread accents are **purple, not red**, in the default theme.
`Colors.swift` lines here are in the design tokens the Sept app pins, `f76ac0a`
(`reference/ios/vendor/design-tokens-f76ac0a/Colors.swift`).

| Use | Token | Light | Dark | Source |
|---|---|---|---|---|
| Unread dot, count badge, selected Unreads pill | `theme.baseInverseImportant` | #83388a | #9652a2 | DTCS:125; Colors.swift (aubergine_70 / _40) |
| Selected Unreads pill text | `theme.contentInverseImportant` | #f9edff | #efe1f5 | DTCS:129 |
| Selected filter pill fill | `theme.baseInverseSecondary` | #611f69 | #431349 | DTCS:83-86 |
| Selected filter text, refresh tint | `theme.contentInversePrimary` | #ffffff | #ffffff | DTCS:166-168 |
| List background | `base_primary` | #ffffff | #1a1d21 | `ListThemeOptions.swift:67` |
| Read row background | `base_secondary` | #f8f8f8 | #1a1d21 | Colors.swift:50 |
| Read row pressed | `base_secondary` darkened 10% | #dfdfdf (computed) | #171a1e (computed) | `UIColor+Extensions.swift:80-83` |
| Names, badge icons | `content_primary` | #1d1c1d | #f8f8f8 | :200 |
| Read text, unselected filter text | `content_secondary` | #454447 | #b9babd | :206 |
| Timestamps | `content_tertiary` | #5e5d60 | #9a9b9e | :212 |
| Separators, pill borders | `outline_tertiary` | #5e5d60 @13% | #797c81 @30% | :302 |
| AI pill fill | `surface_primary` | #1d1c1d @6% | #f8f8f8 @6% | :134 |
| Unreads pill, unselected fill / text | light `base_tertiary` / `content_primary`; dark `gray_90` / `gray_10` | #eaeaea / #1d1c1d | #e0e0e0 / #212428 | :56, :200; palettes gray |
| Swipe background, "New activity" pill | `base_inverse_highlight_1` | #1264a3 | #0a77a7 (June #004d76) | :98 |
| Toast buttons | `content_inverse_highlight_1` | #9ed6fa | #2ba5ce | :260 |
| "Replied" tag text / fill | `grass_70` / `grass_5` | #50740e / #e5f5b8 | #9dbe4b / #213405 | palettes grass |
| AI pill icon | `sunflower_40` | #f1b900 | #b38200 | palettes sunflower |
| To-do box / approval box | `honeycomb_50` / `lagoon_50` | #d38d00 / #0e9dd3 | #c48305 / #1699ca | palettes honeycomb / lagoon |

### 3.11 Icons

All of these exist at `Modules/Data/Icon/ResourceBundle/Icons.xcassets/<file>.imageset/<file>.svg`:

| SKIconManifest name | svg file |
|---|---|
| `svgMentions` | mentions |
| `svgThreads` | threads |
| `svgAddReaction` | add_reaction |
| `svgApps` | apps |
| `svgPaperPlane` | paper_plane |
| `svgVip` | vip |
| `svgDirectMessages` | direct_messages |
| `svgChannel` | channel |
| `svgLock` | lock |
| `svgReminder` | reminder |
| `svgArrowUp` | arrow_up |
| `svgClose` | close |
| `svgComment` | comment |
| `svgMarkAsRead` / `svgMarkAsReadFilled` | mark_as_read / mark_as_read_filled |
| `svgMarkAsUnread` / `svgMarkAsUnreadFilled` | mark_as_unread / mark_as_unread_filled |
| `svgEraser` / `svgEraserFilled` | eraser / eraser_filled |
| `svgPriorityFilled` | priority_filled |
| `svgPriorityDismiss` | priority_dismiss |
| `svgShareFeedback` | share_feedback |
| `svgCheckCircle` | check_circle |
| `svgBookmarkFilled` | bookmark_filled |
| `svgNotifications` / `svgNotificationsOff` | notifications / notifications_off |
| `svgLists` | lists |
| `svgListItem` | list_item |
| `svgFile` | file |
| `svgSearch` | search |
| `svgRefresh` | refresh |
| `svgUser` | user |
| `svgSfCloud` | sf_cloud |
| `svgSfRecordFilled` | sf_record_filled |
| `svgArrowRight` | arrow_right |

- Font-glyph names that map to SVGs at render time (`SKIcon.swift:131`; `SKIconManifest+SVGMapping.swift`):
  `.bell` → notifications, `.bookmark` → bookmark, `.clockO` → clock, `.reminder` → reminder, and the refinements badges
  `.pencil` → edit, `.checkSmall` → check (`Modules/Data/Icon/Implementation/SKIconManifest+SVGMapping.swift:29-33`, :63,
  :177, :245, :260).
- `realCheckboxChecked` / `realCheckboxEmpty` have no SVG.
- Context-line tags map to icons (APO:499-531; `ActivityTags.swift:6-26`):
  - `mention-icon` → mentions
  - `thread-icon` → threads
  - `channel-icon` → channel, or lock when private
  - `direct-message-icon` → direct_messages
  - `bot-icon` → apps
  - `invite-icon` → paper_plane
  - `keyword-icon` → search
  - `list-icon` → lists
  - `list-record-icon` → list_item
  - `update-icon` → refresh
  - `reminder-icon` → reminder
  - `user-icon` → user
  - `salesforce-cloud-icon` → sf_cloud
  - `file-icon` → file
  - `reaction-icon` → add_reaction
  - `bookmark-icon` → bookmark_filled in `highlight1.content`
  - `canvas-icon`: `SKIconManifest.canvasIcon(for: .channelIconContext)` (not traced further)

### 3.12 Gaps (Activity)

- **Rollout.** `activityEntryLayoutRefinements`, `activityBetterIndicators`, `activityPriority` and `activityAgentStatus`
  are server-side; the device screenshots show refinements off. The others are unknown.
- **Views.** Which views a user has (beyond All and DMs) comes from the server; the device showed All / DMs / Mentions /
  Threads.
- **Snapshots.** None for Activity, and none of `.pillButton`.
- **Mark all as read.** Not found in Activity; there's no entry point.
- **Unverified pill values.** The Unreads pill's missing border, its 0.9 selected scale, the 46/48pt heights, the "New
  activity" pill and the darkened pressed colors are derived from code, not seen on a device.
- **Channel spans.** How `.channel` text spans draw inside labels: not traced (raw form "#name", or lock + name).
- **System-alert bell.** The background behind the bell avatar on system alerts: not traced.

### 3.13 Reference PNGs (Activity)

- `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessagePreviewSnapshotTests/testMessagePreviewWithHeaderBadge@3x.png`:
  the row's top line (name, timestamp, count).
- `…/testMessagePreviewWithReply@3x.png`: primary text, a 1-line mustache (the context line), then the body.
- `…/testMessagePreviewWithNonInteractableReactions@3x.png`: reaction bar collapsed to 2 rows with "N more".
- `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberAvatarSnapshotTests/testExtraLargeMemberAvatarExternalWorkspaceConfiguration@3x.png`: corner-badge notch geometry.

---

## 4. Threads

**Source**
- Screen: `Modules/Features/AllThreads/Implementation/AllThreadsViewController.swift`, `AllThreadsPresenter.swift`,
  `AllThreadsInteractor.swift`, `AllThreadsFeature.swift`, `AllThreadsFilterRow.swift`, `Utility/ConversationNameUtils.swift`.
- Data: `Modules/DataService/ThreadsDataProvider/Implementation/PaginatedThreadSubscription.swift` and
  `ThreadsLazyLoader.swift:39` (page size **10**, most relevant first per `Interface/ThreadsState.swift:20`).
- Entry: the Home "Threads" tile (`Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/ThreadsTile.swift:126`),
  which pushes `AllThreadsRoute`.
- Rows are **full messages (`MKMessageView`)**, not previews (`AllThreadsViewController.swift:251-253`).
- Snapshots: there is no screen snapshot. References:
  - `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageViewSnapshotTests/testMessageViewWithReactions@3x.png`
  - `…/MessageKitTests.MKDividerSnapShotTests/test_newUnreadAndReturnError_@3x.png` ("NEW" divider)
  - `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKNavigationTitleSnapshotTests/testSubtitle@3x.png`

**Screen structure (top to bottom)**

1. **Nav bar.** `SKNavigationTitle` as the title view, installed by a navigation-title configurator (`AllThreadsViewController.swift:102`, :163), with the standard back
   button on phone (`AllThreadsFeature.swift:268`).
   - Title: "Threads", or "VIPs" when the VIP filter is on in the refreshed UI (`AllThreadsPresenter.swift:209-212`).
     bodyBlack 17 `content_primary` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/NavigationTitle/SKNavigationTitle.swift:78-88`).
   - Subtitle, only when some threads are unread: smallBody 15 `content_secondary` (`AllThreadsViewController.swift:172-205`).
     Copy by case:
     - "%@ unread" (22650) / "%@ unreads" (22647)
     - "%@ unread from VIPs" (22621)
     - "%@ unread, %@ from VIPs" (22613)
     - "%@ unreads from VIPs" (22617)
     - "%@ unreads, %@ from VIPs" (22644)

     Counts are threads with ≥1 unread reply (`AllThreadsInteractor.swift:944-945`).
2. **Loading bar** (`SKLoadingBar` `.large`).
   - Pre-iOS 26: 2pt tall, 6pt side insets, at the top (`AllThreadsViewController.swift:75-81`, :134-141).
   - iOS 26: a 3pt bar in a glass capsule, 20pt side insets, at safe-area top − 5 (:56-73, :127-133).
   - Colors: track `base_tertiary`, progress `lagoon_40` #1cb6eb / #0a77a7 (`Colors.swift:1448`), completion flash
     `highlight2.baseInverse` #007a5a / #177e56 (June dark #00553d). 1.1s cycle, curve (0.445, 0.05, 0.55, 0.95)
     (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/LoadingBar/SKLoadingBar.swift:30-34`, :138-139, :211-214).
3. **Legacy All / VIP tabs.** Only when flag `allThreadsRefresh` is off and the user has VIP access and ≥1 VIP
   (`AllThreadsInteractor.swift:308-316`). An `SKTabBar` `.underline()` `.fitToBar` row (§1.4) with "All" and "VIP",
   followed by a 1px `outline_tertiary` footer (`AllThreadsPresenter.swift:124-129`; `AllThreadsInteractor.swift:514-539`).
4. **One section per thread** (below). List and view background `base_primary`; headers are not sticky.
5. **Floating "VIPs" pill.** Refreshed UI (`allThreadsRefresh` on) with VIPs. A glass `SKPillButton`, 16pt from the
   safe-area trailing and bottom edges (`AllThreadsViewController.swift:19-33`, :113-117):
   - 14/20 padding, smallBodyBold 15, capsule shape.
   - Unselected: `base_tertiary` fill, `content_primary` text.
   - Selected: `theme.baseInverseImportant` (#83388a / #9652a2) with `theme.contentInverseImportant` text and a trailing
     `svgClose` icon.
   - Press scales to 0.9 (`Modules/Integration/ThemesIntegration/Interface/ColorSetFABConfigurator.swift:86-117`;
     `SKPillButton.swift:19-20`, :162-167, :322-325).
6. **"Back to Top" elevator pill.** A circular pill with `svgCaretUpFull` (`svgArrowUp` with the
   `messageTranscriptElevatorPill` flag, `AllThreadsInteractor.swift:178`): the `.floatingActionButton` style with core
   colors, `base_tertiary` fill, `content_primary` icon, 1pt `outline_tertiary` border, 12pt insets. Its leading edge is
   65pt from the trailing edge, 16pt from the bottom. Sept renders one pill per direction (no stack)
   (`Modules/Features/ElevatorPill/Implementation/ElevatorPillViewController.swift:21-23`, :73-78, :97-132;
   `Modules/Integration/ThemesIntegration/Interface/ColorSetFABConfigurator.swift:24-79`).
   Accessibility "Back to Top" (2376).

**Thread section** (`AllThreadsInteractor.swift:318-475`)

| Row | Shown when |
|---|---|
| Header: conversation name (+ VIP icon) and the list of people who replied | always |
| Root message (`MKMessageView`, `.absolute` timestamp) | always |
| "N more replies" link row | remaining read replies > 0 |
| Read replies (`.threadReply` timestamps) | flag `threadDiscrepanciesFix` on: the last 2, only when there are no unreads. Off: all latest replies |
| "NEW" divider | ≥1 unread reply |
| Unread replies | all of them; with the flag on and >2 unread, only the first, followed by "M unread replies" |
| Buttons | no unreads: [Reply]. Unreads: [Mark as Read] [Reply]. Archived canvas or list comment threads show an "Archived comment" banner (3333) instead |
| Footer: `.emphasized` 12pt `base_secondary` band with 1px hairlines at top and bottom | every section except the last |

- **Header** (`SKHeaderEntity` `.medium`, always tappable; `AllThreadsPresenter.swift:196-203`).
  - Height: 8 + 12 + title + 4 + subtitle + 12.
  - Title: bodyBold 17 `content_primary`, built by `ConversationNameUtils.swift:18-71`:
    - "#name" for public channels
    - `svgLockFilled` + name for private
    - `svgArchiveFilled` + name + " (archived)" (2074)
    - group DMs: `svgMultipartyDm{N}Filled` + names
    - DMs: presence icon + name
    - VIP: + " " + `svgVipFilled`
  - Subtitle: smallBody 15 `content_secondary`. Up to 4 reply authors joined by ", " (10280), then ", and 1 other" or
    ", and %@ others" (1843 / 1846) (`PaginatedThreadSubscription.swift:270-289`).
  - Tap opens the channel.
- **Message rows** (`MKMessageView`, `Modules/UIInfra/MessageKit/Implementation/MKMessageView.swift`):
  - Padding: top 8, left 16, bottom 8, right 16 (:54-60).
  - Avatar 36pt, then 12pt, then content at x = 64 (content stays at 64 even without an avatar, :221-224).
  - Author row: bodyBlack 17 `content_primary` name, 4pt, then the micro 12 `content_tertiary` timestamp, center-aligned
    (:372-389, :550).
  - Body: body 17 `content_primary` (the Sept default; June `sk_primary_foreground`), 8pt below the author (4pt when
    it starts with an attachment; :259-274).
  - Reactions shown, collapsed to 2 rows with "show more"; the add pill appears only if there are reactions.
  - Preheader line (caption 13 `content_tertiary`): "Pinned", "Saved for later", "Also sent to the channel",
    "Failed to send. **Tap to retry.**" (`Mappers/PreHeaderMapper.swift:58-146`). Their icons are dt tokens in Sept
    (warning `important.content`, jump and bookmark `highlight1.content`, pin `highlight3.content`).
  - Background tints: failed `base_important`, pinned `base_highlight_3`, saved `base_highlight_1`.
  - Press highlight `base_tertiary`, inset 4pt, radius 12.
  - Config: `AllThreadsInteractor.swift:561-580`.
- **"N more replies" / "M unread replies"** (`SKGenericEntity` `.medium` indented with the message: left 64, right 16,
  10 top and bottom; `AllThreadsPresenter.swift:164-171`).
  - body 17, 1 line, as a link in `highlight1.content` #1264a3 / #2ba5ce.
  - Copy: "1 more reply" (13786) / "%@ more replies" (14349); "1 unread reply" (13926) / "%@ unread replies" (14421).
  - Tap opens the thread at the root, or at the first unread.
- **"NEW" divider** (`Modules/UIInfra/MessageKit/Implementation/MKDivider.swift:21-25`, :101-148, :220-249).
  - Right-aligned "NEW" (`new_all_caps`, 12791), captionBold 13 `content_important` #c01343 / #de678a.
  - A 1px `outline_important` #e01e5a / #d94c75 line starts 12pt from the left.
  - Row height ≈ 31pt: 5pt padding, label row with 12pt side padding, 5pt, line, 5pt.
- **Buttons** (`SKButtonEntity` `.wrapContent(indented)`, §1.10; `AllThreadsPresenter.swift:139-145`).
  - "Mark as Read" (`mark_as_read`, 11757): `.primary` green.
  - "Reply" (16440): `.outlineDefault`.
  - Both `.medium` (§1.8).
  - Reply opens the thread at its latest message with the keyboard up (Sept: anchored to the latest message, not
    highlighted). Mark as Read marks it read, and the row rebuilds with only [Reply] (`AllThreadsInteractor.swift:648-657`).
- **Interactions.**
  - Tap a message: opens the thread at that message (failed messages open the actions sheet instead).
  - Long press: opens the message actions sheet.
  - Avatar or name: opens the profile.
  - Reactions: toggle, long-press for reactors, add (`AllThreadsInteractor.swift:625-756`).

**Loading, refresh and empty states**
- Loading is suppressed for the first 0.5s. After that, with no sections, a skeleton shows (`AllThreadsInteractor.swift:42-45`,
  :868-886; `AllThreadsPresenter.swift:214-222`).
- Pull to refresh (`UIRefreshControl`, `AllThreadsFeature.swift:84`). Pages load at the bottom.
- Empty state (`SKEmptyState`, emoji 🧵; `AllThreadsPresenter.swift:223-231`):
  - All: "Have thoughts on a specific message?" / "Reply directly in a thread to keep the conversation organized and on topic." (1669 / 1663)
  - VIP: "You don’t have any threads with a VIP" / "When you reply to a conversation with a VIP, you’ll see the thread here." (1672 / 1666)

---

## 5. All unreads / Catch up

**Source**
- Screen: `Modules/Features/AllUnreads/Implementation/AllUnreadsViewController.swift`, `AllUnreadsPresenter.swift`,
  `AllUnreadsInteractor.swift`, `AllUnreadsDataTypes.swift`, `AllUnreadsThemePublisher.swift`.
- Cards: `UnreadItemFeature/UnreadConversationFeature/*` and `CheckpointFeature/*`.
- Card swipe library: `Shuffle/Classes/*`.
- Ranking: `Data/Pipeline/AllUnreadsRankingModel.swift`.
- Entry points:
  - Home "Catch Up" tile (`catch_up_title` "Catch Up", 3543; `Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/AllUnreadsTile.swift:107-113`; the unified navigation opens `CatchUpRoute` instead)
  - "Catch Up" FAB pill (`svgStackedCardsFilled`; `Modules/Features/CreationEntryPoints/Interface/PrimaryFabEmbeddable.swift:124-155`)
  - deep link / widget
- Snapshots: none exist for any Catch Up view.

**Presentation**
- Pushed full screen with the nav bar and tab bar hidden (`AllUnreadsViewController.swift:144-154`).
- On exit the tab bar slides back with spring smooth/fast (:976-1002). The back swipe works on phone.
- With `rootNavigationUpdates` (iOS 26) or from the FAB: a `.large` sheet with a grabber and a zoom transition
  (`AllUnreadsFeature.swift:51-74`). In the unified (SwiftUI) navigation the system nav bar stays and the custom title,
  close and Undo buttons aren't added (`AllUnreadsViewController.swift:144-154`, :219-232).

**Layout (iPhone)** (`AllUnreadsViewController.swift:21-34`, :219-274; iPhone widths use the `.narrow` layout, :376-398)
- **Background.** `theme.baseInverseSecondary` (#611f69 / #431349). With the theme gradient pref on (the default), it is
  a top-to-bottom gradient from `theme.backgroundGradient1` (#611f69 / #431349) to `theme.backgroundGradient2`
  (#4a154b / #200221) (:130-134, :688-696; `DefaultThemeColorSet.swift:189-225`).
- **Title** at safe-area top + **8**: "%@ Left" (`all_unreads_left_title`, 1681, e.g. "12 Left"). bodyBlack 17 white,
  centered. The number animates with a numeric text transition on iOS 17+.
- **Close button**, leading 6: `svgCaretLeftFull` when pushed, ✕ when modal. 56pt tap target with a 20pt white icon.
  Accessibility "Back".
- **"Undo" button**, trailing 6: bodyBold 17 white text button. Appears (scale 0.5 → 1, spring) after a conversation
  card is swiped (`AllUnreadsInteractor.swift:717-729`).
- **Card stack.**
  - 3 visible cards, top = title bottom + **12**, left and right **16**.
  - Card 2 sits behind at scale **0.95**, 25pt lower; card 3 at 0.95 (`Shuffle/Classes/SwipeCardStack/SwipeCardStack.swift:138-152`).
  - Card shadow black, opacity 0.3, offset (0, 3), radius 16.
- **Bottom buttons.** "Keep Unread" (1678) on the left and "Mark as Read" (11775) on the right: equal widths, 16pt from
  the edges and 16pt apart, 20pt below the cards, at the safe-area bottom, max 60pt tall.
  - `.large` custom style (§1.8).
  - Keep Unread: `base_primary` fill, `content_primary` text, `outline_secondary` border.
  - Mark as Read: `highlight2.baseInverse` #007a5a / #177e56 fill (Sept token; June dark #00553d), white text (`AllUnreadsThemePublisher.swift:46-55`).
  - Disabled at alpha 0.3.
  - Long-press "Mark as Read" → "Mark all as Read" (11751) → alert "Mark all as Read?" / "This can't be undone." with "OK" / "Cancel"
    (`AllUnreadsPresenter.swift:368-382`; `AllUnreadsInteractor.swift:382-453`).

**Conversation card**
- Outer card: radius **16** (38 on iOS 26), `base_tertiary` fill, and in dark a 1pt `outline_tertiary` border
  (`CardContentView.swift:12-29`, :48-56; `UnreadConversationView.swift:18`, :31-36).
- Inner container: radius 14, `base_primary` fill, 1pt `gray_10` border (#d7d7da / #212428) (`UnreadConversationView.swift:47-57`).
- **Title bar**, min 48pt: an `SKNavigationTitle` with 12pt padding on `base_primary`, then a 1pt `outline_tertiary`
  divider (June: `sk_foreground_low`) (`UnreadConversationTitleView.swift:33-51`; `UnreadConversationView.swift:71-76`, :258-286).
  - Channel: "#name" bodyBold 17 `content_primary`. When you're mentioned, subtitle "You are @mentioned" (24221) in
    captionBold, theme `contentSecondary` (`UnreadConversationPresenter.swift:20-24`, :78-103).
  - DM: name with a 20pt avatar, no subtitle (June: bot DMs with a badge also got "You are @mentioned").
  - Thread: "Thread" + "#channel".
  - A trailing `svgCaretDown` opens a menu: details, recap, mute/unmute, move, leave (`UnreadConversationPresenter.swift:189-250`).
- **Body.** An embedded message transcript (the channel view) with an inline composer and the composer's context bar,
  anchored at the last-read point; swipe actions on messages are off (`UnreadConversationFeature.swift:76-130`).

**Swiping**
- Right = **Mark as Read**, left = **Keep Unread** (`AllUnreadsViewController.swift:904-937`).
- Commits at ≥ min(window side) / 4 (98.25pt on a 393pt phone) or ≥ **1100pt/s** (`Shuffle/Classes/SwipeCard/SwipeView.swift:117-129`).
- Otherwise springs back: 0.6s, damping 0.5.
- Drag rotation up to π/10 (18°), sign flipped by touch position. The throw off-screen rotates 36° over **1.0s**.
- Undo springs back: 0.7s, damping 0.8 (`CardAnimator.swift:50-119`; `AllUnreadsViewController.swift:794-795`).
- **Overlay** on the card:
  - Right: radial gradient `jade_50` #20a271 → `jade_80` #0e674d, both at 95% alpha.
  - Left: `ocean_50` #2985cd → `ocean_80` #0b4c8c.
  - Opacity follows the swipe progress.
  - Content: a 48pt white progress ring with a 3pt stroke, and the title in headline 28 white (`AllUnreadsOverlayView.swift`).
  - At 100%: the ring fills and plays a light haptic.

**Onboarding cards: none.** Sept builds every Catch Up session with no checkpoints (`checkpoints: []`,
`AllUnreadsCheckpointsMixin.swift:34-45`), so the stack starts with the first conversation. The checkpoint card view
(`CheckpointView.swift`; `CheckpointPresenter.swift:37-89`) is still in the source but nothing creates one.
June (cd22922): first use showed three cards, "Breeze through your unreads" / "Swipe your way through unread channels,
DMs, and mentions." with "Get Started", "Swipe right to **mark as read**", "Swipe left to **keep as unread**" (strings
still at L3531 / L3528 / L7604, L3540, L3537).

**Order**: VIP DMs → VIP mentions → VIP threads → DMs → mentions → threads → other channels
(`AllUnreadsRankingModel.swift:56-86`). Muted DMs are excluded.

**Completion** (`AllUnreadsCompletionView.swift:242-282`)
- A centered 48pt emoji over headline 28 white text, 240pt wide, picked at random:
  - ✌️ "All caught up. What's next?"
  - 🌱 "Everything's sorted! Let's start something new."
  - 🙌 "That's everything!"
  - 😎 "All clear."
  - 🍏 "You've read all you needed. Take a moment."
  - 🌱 "Lovely! Your work here is done."
  - 💥 "Boom. You're up to date."

  Strings are at yaml:3498-3516.
- Below: a "Done" button (`.primary` `.large`, 5777), an optional "Rate Slack" button, and an optional "Add the Catch Up widget" info banner.

---

## 6. Later (saved items)

**Source**
- Container: `Modules/Features/Tasks/Implementation/TasksFeature/TasksViewController.swift` (page controller and nav buttons),
  `TasksPresenter.swift` (title), `TasksDataTypes.swift`.
- Each tab's list: `Modules/Features/Tasks/Implementation/TasksList/TasksListPresenter.swift` (rows, buttons, empty
  states), `SavedItemMessagePreview.swift` (the row's header, author and ornament), `TasksListInteractor.swift`,
  `TasksMenuPresenter.swift` + `TasksListDataTypes.swift` (long-press menu).
- Reminders: `TasksCustomReminder/*` (picker), `TasksReminderDialog/*` (create reminder), `TasksTimeUtilities.swift`.
- Data: `Modules/DataService/ModernSavedItemDataProvider`, a paginated saved-items subscription.
- Entry: the Home "Later" tile pushes `TasksRoute`
  (`Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/LaterTile.swift:131-139`). Deep links highlight
  one item (`Modules/Features/Handlers/DeepLinking/Implementation/DeepLinkPresenter.swift:565`).
- Snapshots: none for Tasks. The underline tab bar reference is
  `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKTabBarSnapshotTests/testNumbers@3x.png`.

**Screen**
- **Title.** "Later" (`saved_for_later_title`, yaml:16927). The To-dos tile variant is "To-dos" (21871), the Saved
  variant "Saved" (16912) (`TasksPresenter.swift:39-48`). It is set through the navigation title configurator as a detail
  title (`TasksViewController.swift:161-165`).
- **Background** `base_primary` (`TasksViewController.swift:156`).
- **Tabs.** `SKPageController` at the top, `.fitToBar` (equal widths), underline style (§1.4), swipe between pages off,
  animated index change (:170-196). Default order (`Modules/Features/Tasks/Interface/TasksListFeatureInterface.swift:55-77`):
  - **"In Progress"** (9639) followed by its count label, e.g. "In Progress 3", in smallBody
  - **"Archived"** (2083)
  - **"Completed"** (4401)

  With flag `laterTodos` the tile opens [To-do (with count), Saved, Completed] instead (`LaterTile.swift:134-138`).
- **Nav bar right buttons**: `SKNavigationItem` bar items (Liquid Glass on iOS 26), listed leading → trailing
  (`TasksViewController.swift:47-123`, :205-232; June: `SKIconButton` `.small` custom views):
  - on Completed, when not empty: a "Clear all" title item (4045), `.default` style
  - with flag `laterCreateReminder`, on In Progress / To-do: "+" (`svgPlus`, accessibility "Create New Reminder", 4970)
  - on In Progress: a filter button (`svgRefine`, accessibility "Filter", 7140) whose menu is titled "Show" and has a
    checkable "Upcoming reminders" (22718)
  - on To-do: a filter button whose menu has a "Filter" section with checkable "Overdue" (21803), "Upcoming reminders"
    (21806) and "No reminder scheduled" (21800), and a "Sort by" section (20493): "Due date" (21812, the default),
    "Earliest date created" (21815), "Latest date created" (21818) (:104-123; the sort is new in Sept)

**Row = `MKMessagePreview` + button row** (`TasksListPresenter.swift:281-308`, :394-445)
- **Config:**
  - reactions off
  - body **interactive** (links work)
  - blocks summarized
  - `headerStyling .author` (the author's avatar and name)
  - default `.relative` timestamp of the saved message
  - default body style: body 17 `content_primary`, 2 lines
- **Header line** (`SavedItemMessagePreview.swift:318-401`). micro 12, bold spans in `content_tertiary` #5e5d60 / #9a9b9e:
  - Where it came from:
    - "#channel" (a channel span; lock prefix when private)
    - canvas-channel icon + name
    - "Direct Message" (5452)
    - the group DM's names
    - for files, the file type (e.g. "PDF"), or "File" (6908)
    - "List Item" (11135)
    - "Canvas section" (3416)
    - for reminders, your name
  - If a due date is set (and differs from the created date), add two spaces, "●  ", then the due date from `toTimeAgo`
    ("In 2 hours", "3 days ago"; §0.5). An **overdue** date is red `sk_raspberry_red` #e01e5a (`SavedItemsTimeFormatter`,
    `Modules/Data/DataModels/Implementation/ClientModels/SavedItems/SavedItemsTimeFormatter.swift:9-11`).
- **Primary text.** The author's name in bodyBlack 17 `content_primary`. Reminders say "Reminder" (16141). List records
  show the list title, canvas sections the canvas title (:403-437).
- **Ornament.**
  - Messages: the author's avatar.
  - Files: the file-type icon on its type color.
  - List records: `svgListItem` on the list color.
  - Inaccessible messages: `svgHelp` on `base_tertiary` (:293-316).
- **Buttons row** on In Progress / To-do (§1.10, indented to x = 64):
  - primary **"Complete"** (4379), custom style: `sk_lilypad_green` fill, white text
  - then an outline icon-only button `svgReminder` (accessibility "Edit reminder", 6066)
  - with `todosV2`: the primary becomes "Move to your to-dos" (12505, `.primary`, `svgCheckCircle`) and an outline
    `svgClear` ("Clear", 4039) comes first
- **Sections.** Each item is its own section with a hairline footer, hidden under the last row (§1.5). Archived and
  Completed items have no button row, nor (with `laterTodos`) do Saved-tab items (:78-96).
- **To-dos banner** (with `laterTodos`, a server megaphone, To-do tab only): an info `SKBanner` "All of your to-dos in one
  place." (10704) / "Add messages or write your own, the one spot for all your action-oriented tasks." (10700), a
  `lightbulbO` ornament on `highlight1.surface`, a ✕, and an outline "View Saved Items" button (10697) (:50-59, :245-279).
- **Deleted or missing items.** An `SKGenericEntity` `.medium` with `svgTrash` in `content_secondary`, text in
  `content_secondary` (:335-392). Copy (yaml:10641-10681), e.g.:
  - "A message you saved was deleted."
  - "A file you saved was not found."
  - "A canvas section you saved was deleted."
  - "A list item you saved was not found."

**Actions**
- **Tap:**
  - messages open the thread (thread replies) or the conversation at that message
  - files, canvases and list items open those objects
  - deleted items show a confirmation alert (`TasksListInteractor.swift:179`, :290-325)
- **Long press** (`TasksMenuPresenter.swift:12-105`; titles and icons at `TasksListDataTypes.swift:143-173`):
  - In Progress:
    - "Complete" (`checkSmall`)
    - "Archive" (2056, `archive`)
    - "Set reminder" (17706, `clockO`), or "Edit reminder" / "Snooze" (20299) when overdue
    - "Remove from Later" (16219, `svgTrash`, destructive)
  - Archived: "Move to In Progress" (12483, `svgBookmark`), "Remove from Later"
  - Completed: "Mark as incomplete" (11754, `realCheckboxEmpty`), "Remove from Later"
  - With `laterTodos`: "Move to To-dos" (12502), "Move to Saved" (12492), and by the item's to-do state "Remove To-do"
    (16361), "Remove from Saved" (16237) or "Remove" (16166), all destructive (`TasksMenuPresenter.swift:93-105`). On the
    Saved tab there is no "Complete" and no reminder item (:20, :28-51). June (cd22922): "Move to to-dos", "Move to
    saved", "Remove to-do", "Remove from saved".
- **Reminder picker** (`TasksCustomReminderPresenter.swift:35-45`, :140-261). A list of small generic rows; the date on
  the right is accessory text:
  - title "Set a reminder" (17688), "Edit reminder" or "Snooze"
  - presets, each with "Today", "Tomorrow" or "MMM d" on the right:
    - "In 30 minutes" / "In 1 hour" / "In 3 hours" (9642 / 9619 / 9649)
    - "For …" versions when overdue (7335 / 7321 / 7338)
  - suggested times: tomorrow 9 AM and next Monday 9 AM; Friday afternoon and weekends suggest only next Monday
    (`TasksTimeUtilities.swift:53-109`). They are labeled "Later today at %@" (10691), "Tomorrow at %@" (21901),
    "Next Monday at %@" (12870) or "%@ at %@" (23550) (:13-50)
  - "Later" (10609) with "No due date" (12961) on the right
  - "Custom date and time" (5040)
  - red "Clear Due Date" (4054) when a reminder is set
  - toasts: "Reminder Added" / "Reminder Updated" / "Reminder Removed" (16144 / 16157 / 16154)

**Empty states** (`TasksListPresenter.swift:170-208`; `TasksListDataTypes.swift:206-230`). Image 120×120:

| Tab | Image (under `Modules/UIInfra/SlackKit/ResourceBundle/SlackKit.xcassets/`) | Title | Body |
|---|---|---|---|
| In Progress / To-do | `later_in_progress_empty_state.imageset/Later Light.svg` (dark: `…_dark`) | "Your place to organize messages" (10655) | "Get started by saving a message from a conversation or setting a reminder for a task. Learn more" (10651) |
| Archived | `later_archived_empty_state.imageset/Archived Light.svg` | "Out of sight, but not out of mind" (10622) | "No more wasting time searching for  messages. Archive messages you come back to often." (10618; the double space is in the source) |
| Completed | `later_completed_empty_state.imageset/Check Light.svg` | "Feels good to check things off your to-do list" (10635) | "See all the things you’ve completed in one place. Sometimes you need a reminder of how awesome you are." (10631) |

If the tab had items this session and was cleared, an emoji state shows instead (`TasksListInteractor.swift:150-159`;
`TasksListPresenter.swift:62-67`, :141-168):
- In Progress / To-do, cycling with each time the list empties (count % 3, so 🍃 first, then 🐳, then 🏅; June: random):
  - 🏅 "You made a lot of progress" / "You checked everything off your list."
  - 🍃 "Nothing here" / "Enjoy a little moment to yourself."
  - 🐳 "All done" / "Look at you go."
- Archived: 📦 "Nothing rattling around in here" / "Archive messages from in progress if you want to come back to them often."
- Completed: ✨ "All clear" / "The future is yours."

---

## 7. Drafts & sent (and Scheduled)

**Source**
- Container ("Outbounds"): `Modules/Features/Outbounds/Implementation/OutboundsViewController.swift`, `OutboundsPresenter.swift`,
  `PageControllerPresentationObjectProvider.swift`, `BulkDeleteAccessoryView.swift`.
- Tabs:
  - `Modules/Features/Drafts/Implementation/DraftsPresenter.swift`
  - `Modules/Features/Scheduled/Implementation/ScheduledPresenter.swift`
  - `Modules/Features/Sent/Implementation/SentPresenter.swift` + `SentMessagePreview.swift`
- Shared draft preview: `Modules/Unlayered/Libraries/CommonDraftsScheduled/Implementation/DraftMessagePreview.swift`,
  `ScheduledHelper.swift`, `CommonDraftsScheduledPresenter.swift`.
- Entry points:
  - Home "Drafts & sent" tile (`Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/OutboundsTile.swift:101`)
  - the failed-message banner opens the Sent tab (`Modules/Features/Home/Implementation/Plugins/FailedMessage/FailedMessagePlugin.swift:198`)
  - compose and deep links
- Snapshots: none.

**Screen**
- **Title.** "Drafts & Sent" (`drafts_and_sent`, 5868). In bulk-edit mode it becomes "%d Selected" (17420)
  (`OutboundsPresenter.swift:83-98`). A drafts deep link with a filter hides the Sent tab and titles the screen "Drafts"
  (5881) (:40, :84; `LocalHandler.swift:653`).
- **Tabs.** `SKPageController` top tabs, `.fitAllContent`, underline style, no swiping between pages
  (`PageControllerPresentationObjectProvider.swift:92-99`), in fixed order (`Modules/Features/Outbounds/Interface/OutboundsFeatureInterface.swift:64-72`):
  - **"Drafts"** (5881) + count label
  - **"Scheduled"** (17023) + count label
  - **"Sent"** (17625); when any message failed, a trailing `svgWarning` icon in `sk_raspberry_red`

  Counts: blank when 0, "99+" above 99 (12891) (:25-42, :44-91).
- **Right nav button**, Drafts tab only: an `SKNavigationItem` title item, "Edit" (5994; disabled when there are no
  drafts) ↔ "Cancel" (3202) (`OutboundsPresenter.swift:100-136`).
- **Bulk edit.** Each draft row gets a trailing checkbox accessory. A bar under the tabs holds a "Delete" button and a
  "Select All" (17356) / "Deselect" (5414) checkbox. Delete asks for confirmation (:138-196):
  - title "Delete Draft" (5292) or "Delete %d Drafts" (5328)
  - message "Are you sure you want to delete this draft?" (5874) or "Are you sure you want to delete %d drafts?" (5877)
  - buttons "Cancel" and "Delete"

**Draft rows** (`DraftsPresenter.swift:159-270`; `DraftMessagePreview.swift`)
- **Config:**
  - reactions off
  - body not interactive
  - body text `content_secondary` (June: `sk_foreground_max`), default body 17, 2 lines (:248)
  - `headerStyling .conversation`: the ornament is the destination's avatar, a group avatar, or a `#` / lock icon in
    `content_primary` on `surface_primary` (June: on `sk_foreground_low_solid`) (`AvatarMapper.swift:106-118`)
- **Primary text.** The destination name in bold `content_primary`, with "Thread in " (21634) in front for thread
  drafts. With no destination: "No destination" (12952) in bodyBold `content_secondary`, and the ornament is a `pencil`
  icon in `content_primary` on `surface_primary` (`DraftMessagePreview.swift:140-190`; `DraftsPresenter.swift:272-293`).
- **Timestamp.** `.timeOnly` ("9:41 AM") if edited within the last 2 days, else `.longPrefix` ("June 4") (`DraftsPresenter.swift:228-241`).
- **Swipe left** (the `right` action): "Delete" (5283), `svgTrash`, `sk_raspberry_red` background, white text (:178-184).
- **Long press** (:295-332):
  - "Edit Message" (6044, `pencil`)
  - [if there is a destination: "Send Now" (17564, `svgPaperPlane`), "Schedule Message" (16989, `scheduledSend`)]
  - "Delete Message" (5325, destructive)
- **Empty state:** `drafts_empty_state.svg`, "Draft messages to send when you’re ready" (5856), "Start typing a message
  anywhere, then find it here. Re-read, revise, and send whenever you’d like." (5852), button "New Message" (12837).
  On failure: the generic error state, "Something Went Wrong" (20396) / "Try again in a few minutes." (7564) with an
  outline "Retry" (16649) (`DraftsPresenter.swift:122`; `SKEmptyState+GenericErrorEmptyState.swift:12-22`; June:
  "Network Connection Failed").

**Scheduled rows** (`ScheduledPresenter.swift:81-196`; `ScheduledHelper.swift`)
- Same config as drafts (`CommonDraftsScheduledPresenter.swift:109-148`), body `content_secondary`.
- Primary: the destination in bold, with "Thread in " for threads.
- No timestamp. Instead a **header line** in caption 13 `content_secondary`, the time in bold, built by `ScheduledHelper.swift:14-33`:
  - "Send today at 3:55 PM" (17596)
  - "Send tomorrow at 3:55 PM" (17599)
  - "Send January 3rd, 2026 at 3:55 PM" (`send_at_date_time` "Send %@ at %@", 17449, with `{date}` = "MMMM d'{ordinal}', yyyy";
    `Modules/Data/I18n/Implementation/DateFormattingUtilities.swift:56-66`)
- **Swipe left:** "Delete", as for drafts.
- **Long press:**
  - "Edit Message" (`svgEdit`)
  - "Send Now"
  - "Reschedule Message" (16533, `svgScheduleSend`)
  - [not for thread drafts: "Cancel Schedule and Save to Drafts" (3218, `allFiles`)]
  - "Delete Message" (destructive)
- **Empty state:** `scheduled_empty_state.svg`, "Write now, send later" (17008), "Schedule messages to be sent at a
  later time, or another day altogether. They’ll wait here until they’re delivered." (17004; the body font stops growing at 31pt under Dynamic Type, `ScheduledPresenter.swift:27`), "New Message". On failure, the generic error state (:111).

**Sent rows** (`SentPresenter.swift:69-211`; `SentMessagePreview.swift:117-132`)
- **Grouped by day** with `SKHeaderEntity` headers: "Today", "Yesterday" or "Jun 4, 2024" (§0.5 `displayDateString`).
  Failed messages go under "Failed messages" (6669); pending ones under "Sending" (17634). Each section has a hairline
  footer (§1.5).
- Primary: the destination name ("Thread in " + name for replies).
- Timestamp `.timeOnly`.
- Body `content_secondary` (:143); attachments not interactive.
- **Long press:** only for failed or pending messages:
  - failed: "Try Again" (22273, `svgSend`), "Cancel" (destructive)
  - pending: "Delete Message" (destructive)
- **Empty state:** `sent_empty_state.svg`, "You haven’t sent any messages yet." (17631), "They’ll appear here once you do - a record for the future you." (17628), "New Message".

The empty-state images are in `Modules/UIInfra/SlackKit/ResourceBundle/SlackKit.xcassets/`: `drafts_empty_state.imageset/`,
`scheduled_empty_state.imageset/`, `sent_empty_state.imageset/`.

---

## 8. History

- **Where it lives.** `Modules/Features/HistoryList` has only a README ("A list of all the channels, threads and DMs you
  have visited"; `Modules/Features/HistoryList/README.md`), so there is no screen. What users see is the **History menu**
  (`Modules/Features/HistoryMenu/Implementation/HistoryMenuService.swift`): a button in the **Home** tab header
  in place of the filter button, with the server toggle `historyMenu` (`ios_history_menu.json`, iPhone only)
  (`Modules/Features/Home/Implementation/HomeInteractor.swift:222-243`, :549-555), with icon `svgClock` (`clock.svg`) and
  accessibility "History" (7963) (`HistoryMenuService.swift:48-49`, :220-231).
- **Tap** shows a standard iOS menu titled "History" with up to **15** recent visits, newest first (:92, :109-124).
  Each item (:127-189; the thread item starts at :172):
  - Conversation: the conversation name, with a leading icon:
    - DMs: the person's small avatar
    - group DMs: `svgUserGroups`
    - private channels: `svgLock`
    - channels: `svgChannel`
  - Thread: the conversation name, subtitle "Thread" (21605), icon `svgThreads`.
- **Selecting** pushes that conversation or thread (:237-263). With no history, the menu (and so the button) is hidden (:113).

---

## 9. Gaps

- **No screen-level snapshots.** There are none for the DMs tab, Activity, Threads, Catch up, Later or Drafts & Sent.
  Screen geometry comes from constants and component snapshots, not whole-screen baselines.
- **Feature flags (Sept).** All default **false** in `Modules/Data/Toggles/Definitions` and are rolled out server-side:
  - DMs: `modernizeDmDataProvider`, `dmSummaries`, `dmFeatureActionHandlers`, `dmSorting`, `agentsInDms`,
    `agentsAndAppsBadging`
  - Activity: `activityEntryLayoutRefinements`, `activityBetterIndicators`, `activityPriority`, `activityAgentStatus`
  - Later: `laterTodos`, `todosV2`, `laterCreateReminder`
  - Threads: `allThreadsRefresh`
  - Catch Up: `rootNavigationUpdates` (`root_navigation_updates.json`, through the iOS 26 rollout manager)
  - History: `historyMenu`

  June's `iaNextDmsFilters`, `swipeActions`, `markAsUnreadAction`, `channelEmailAddress`, `activityRowRedesign`,
  `activityInbox` and `ios_activity_views` are gone in Sept; their "on" path is the only one, and the clone always draws
  it. Production state of the rest is unknown except where the device screenshots show it; the spec documents both
  variants where they differ.
- **Theme.** Which theme a new user actually gets from the server is not in code. Presence and badges above assume
  `defaultAubergine`, with the Aubergine-preset presence color noted.
- **Pill filter row visuals** are computed from `SKTabBar` constants with Lato metrics. There is no `.pillButton` snapshot.
- **Group DM names.** The exact name joining (comma list, first names or full names) is built in the conversation model
  (`Conversation.swift:75`) and was not traced further. The snapshots show full names separated by ", ".
- **Legacy glyph icons** (Later menu `archive`, `clockO`, `checkSmall`, `realCheckboxEmpty`; Drafts `pencil`,
  `scheduledSend`; Scheduled `allFiles`) are icon-font glyphs with no SVG. The clone should use the nearest SVG by name in
  `Modules/Data/Icon/ResourceBundle/Icons.xcassets/`.
- **Catch up.** The message transcript inside a card is not specified here; it belongs to the channel spec.

## 10. Reference PNGs

Paths are in the slack-objc-latest checkout (14b3cbaf), all present there. MessageKit PNGs are one light image, 393pt
wide; SlackKit PNGs are 2 × 2 grids (light / dark rows × normal / high-contrast columns,
`Modules/UIInfra/SnapshotTestFoundations/Implementation/ComponentSnapshotTestCase.swift:197-209`).

1. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessagePreviewSnapshotTests/testMessagePreviewBadgeAccessoryNextToTimestamp@3x.png`: DM-style row with group avatar, wrapped name, timestamp and badge
2. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessagePreviewSnapshotTests/testMessagePreviewWithHeaderDot@3x.png`: eyebrow + header + dot + mustache + body (the Activity / Later anatomy)
3. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberCollectionEntitySnapshotTests/testMultiMemberConfiguration@3x.png`: people carousel items with presence
4. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKTabBarSnapshotTests/testNumbers@3x.png`: underline tabs with count (Later, Drafts & Sent)
5. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageViewSnapshotTests/testMessageViewWithReactions@3x.png`: full message row (Threads)
