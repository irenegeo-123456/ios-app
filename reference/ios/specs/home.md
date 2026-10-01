# Home tab (iPhone): the channel list below the root header

> **Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Every citation below points at that checkout
> (`/Users/colson.rice/Desktop/Slack Mobile Code Base/slack-objc-latest`) unless marked June / [June] (cd22922).
>
> **What changed since June**
> - Section headers: June's `iaNextHomeTabV3` toggle is gone; the icon + title + `›` (Sections sort) + caret (up when
>   expanded) header is the only one, with no header long-press (Rename / Delete moved to the section browser's "…" menu) (§5).
> - The iPhone list theme uses the `dt_*` tokens: names `contentPrimary` / `contentSecondary` / `contentTertiary`,
>   dividers `outlineTertiary`, the "APP" tag `contentSecondary` on `baseTertiary` (§2–§4).
> - Sections: "Code channels" and "Temporary channels" (renamed strings); muted code channels are dropped and Code
>   channels no longer sit at the top; agents and Slackbot list under Direct Messages with `ios_agents_in_dms`; muted
>   conversations without mentions hide when the user turned off "show muted channels" (§4.6, §6).
> - Rows: code (agent coding) channels show a status icon instead of `#`; tapping a row replaces the tab's detail
>   stack (`.reset`) (§4.3, §4.10). "Mark Unread" is always in the long-press menu (its flag is gone) (§13).
> - Tiles: a new Code tile (toggle off), tiles for the More page's destinations when the Slackbot tab replaces More,
>   the Slackbot tile hides with the Slackbot tab, unread borders use the new `theme.outlinePrimary`, the Slackbot
>   artwork is 18 pt, Saved counts undated items, tile taps reset the stack; a compact tile layout exists for the
>   unified shell only (§7).
> - FAB: frontline workers get a compose FAB; the unified shell's list drawer holds the creation FAB instead of the
>   Catch Up pill (§10). Section browser: pushed resetting the stack, with a Catch Up pill whenever the section has
>   unreads (§10.2, §11).
> - Home's plugin list moved to `HomeFeatureComponent+Factory.swift` (June's `ConversationListFeatureFactory.swift` is
>   gone) and gained a prototype banner (§1). The design-tokens pin moved to `f76ac0a` (dark `highlight1.baseInverse`
>   `#0A77A7`, `highlight2.baseInverse` `#177E56`), and component snapshot PNGs are now 2 × 2 grids (§3, §14).

Everything the Home tab renders between the root header and the tab bar: the list container, conversation rows,
section headers, the section pipeline (what sections exist and in what order), the synthetic "quick view" tiles row,
the sort & filter menu, banners/cards/empty states, the FABs, the section browser, scrolling/loading behavior, and the
row long-press menu. The header itself (workspace title, avatar, filter/history buttons, search pill) and the tab bar are
covered by another spec.

Conventions used below:

- Source paths are relative to `/Users/colson.rice/Desktop/Slack Mobile Code Base/slack-objc-latest` (github.com/tinyspeck/slack-objc
  `main` @ `14b3cbaf`, 2026-09-30). Snapshot paths are repo-relative in that checkout (its iOS_26 PNGs are pulled from
  Git LFS). `file:N` = line N.
- Icons: every `SKIconManifest.svgFooBar` is `Modules/Data/Icon/ResourceBundle/Icons.xcassets/foo_bar.imageset/foo_bar.svg`
  (mapping in `Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift`, e.g. `svgChannelFilled` → `channel_filled.svg`).
  Names without `svg` (`.channels`, `.signOut`, `.chevronRight`, `.ellipsis`, `.unstarO`) are legacy icon-font glyphs, not SVGs.
- `SKIcon` renders at 20×20 pt unless constrained (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/Icon/SKIcon.swift:27`).
- Fonts (`Modules/Data/Font/Implementation/UIFont+LegacySupport.swift:92,126,160,194`): body 17, smallBody 15, caption 13,
  micro 12; `Black` = Lato-Black, `Bold` = Lato-Bold. Line heights come from Lato's hhea metrics (ascender 1974,
  descender −426, lineGap 0, 2000 upm → 1.2 em), measured from `Modules/Data/Font/ResourceBundle/Font/Lato/Lato-Regular.ttf`:
  **17 → 20.4 pt, 15 → 18 pt, 13 → 15.6 pt, 12 → 14.4 pt**. Use `line-height: 1.2`.
- Colors: `Colors.swift` = `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift` (the pin in `internal.MODULE.bazel:209`;
  June's `df1f228` copy is next to it). Legacy `sk_*`
  colors are in `Modules/Data/Color/Implementation/SKLegacyColors.swift`. Theme colors are derived in
  `Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift`. `UIColor(light: X, dark: Y)` resolves to X's light
  value in light mode and Y's dark value in dark mode.
- **Theme assumption.** Theme-derived values are given for the **Aubergine preset** (`Presets.swift:40`: primary aubergine,
  highlight1 aubergine, highlight2 jade, important aubergine, brightness 6 → `isSidebarInverted = true` because
  brightness ≥ 4, `Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:38,60`). If the `ia_theme` pref is missing, the
  app falls back to `ColorSet.defaultAubergine` (all four = aubergine, brightness 5; `ThemeService.swift:117`,
  `ColorSet.swift:19-25`), which only changes the presence-dot color (see §3).
- There is no hover. "Pressed" = highlighted while the finger is down.

---

## 1. Screen composition

**Source:** `Modules/Features/Home/Implementation/HomeViewController.swift`, `HomePresenter.swift`,
`HomeFeatureComponent+Factory.swift:212-232` (plugin order; June's `ConversationListFeatureFactory.swift` is gone),
`HomePresenter.swift:145-157` (section order rule).

The screen is one vertical `SKEntitiesList` (`HomeViewController.swift:96-148`) pinned to all four edges of the view,
ignoring the safe area (`HomeViewController.swift:164`; June's iPad gradient view behind it is gone); the root container
supplies top/bottom content insets. Each "plugin" contributes list sections. Final order (`HomePresenter.swift:145-157`):

1. **Filter plugin** sections (the "External people only" / "<Workspace> only" banner) — `conversationListFilteringBanner`.
2. **Banners**: all *high-priority* banner plugins that have content; *low-priority* banners (only the notification
   health-check banner, `HomePlugin.swift:18-21`, `NotificationHealthCheckPlugin.swift:105`) appear only when no
   high-priority banner is showing.
3. **Everything else, in plugin order** (`HomeFeatureComponent+Factory.swift:212-232`): edu-onboarding cards →
   **synthetic view tiles row** → **conversation list sections** → onboarding cards / empty state.

Banner plugin order (`HomeFeatureComponent+Factory.swift:213-226`): session expiration, updates, dogfood updates, dogfood
info, prototype banner (new in Sept, internal builds), huddles banner, failed messages, notification health check, boot
error, Slack Connect, megaphone, SC hub invite, GovSlack awareness. Which plugin types count as banner/filter:
`Modules/Data/Home/Interface/HomePluginBanner/HomePluginBannerType.swift:38-78` (adds `.prototypeBanner`).

Typical iPhone Home, top to bottom: [banners] → tiles row (Catch Up, Threads, …) → hairline → "Unread DMs" /
"Mentions" / unread sections → "Starred" → "Channels" (+ "Add channel" row) → "Direct Messages" (+ "Start a new message"
row) → "Apps" → custom sections → (FAB floating bottom-right).

---

## 2. List container

**Source:** `HomePresenter.swift:164-188`, `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift`,
`Footer/SKListFooterView.swift`, `ListThemeOptions.swift:65-87`.

| Property | Value | Source |
|---|---|---|
| View + list background | `CoreColorSet.primary.basePrimary` = `dt_color_base_primary`: light `#FFFFFF`, dark `#1A1D21` (June: `sk_primary_background`, the same values) | `ListThemeOptions.swift:67-68`, `Colors.swift:42-49` |
| Row/section content animation | `contentTransitionAnimationStyle: .forceAnimate` (diffed inserts/moves animate) | `HomePresenter.swift:171` |
| Reordering | none | `HomePresenter.swift:172` |
| Scroll to top | requested through a list `scrollInstruction` (`.scrollToTop`, animated, deduped by a request counter) instead of setting the offset directly | `HomePresenter.swift:170`, `:191-199`; `HomeInteractor.swift:354-355` |
| Space above the first section | Sections without a header view (`.default` header) get an 8 pt blank header when they are the first section, 0 otherwise | `SKList.swift:2074-2075`, `SKListFooterView.swift:19` |
| Section footer (conversation sections) | `.hairlineDivider(hidesWhenLastRow: true, hasPadding: true, color: dividerColor)` → an **8 pt tall** footer with a **1 px** (⅓ pt) line at its bottom edge, spanning the full list width; omitted after the last section | `DefaultTransformingPipe.swift:214`, `SKListFooterView.swift:18-19,50,106-112`, `SKList.swift:2093-2100,2128-2131` |
| Divider color (Home sections) | `listThemeOptions.dividerColor` = `CoreColorSet.primary.outlineTertiary` = `dt_color_outline_tertiary`: light `#5E5D60` @ 13 % (≈ `#EAEAEA` on white), dark `#797C81` @ 30 % (≈ `#373A3E` on `#1A1D21`) (June: `sk_foreground_low_solid` `#DDDDDD` / `#323538`) | `ListThemeOptions.swift:81`, `Colors.swift:302-307` |
| Divider color (sections that don't pass a color, e.g. tiles row) | the same `outlineTertiary` (the footer's default) | `SKListFooterPresentationObject.swift:20`, `Colors.swift:302-307` |
| Section header pinning | not used (Home sections keep the default `.none` pinning behavior; the list's `sectionHeaderPinningCustomInset` only matters for pinned headers) | `SKEntitiesAdapter+Extensions.swift:25`, `DefaultTransformingPipe.swift:194-216`, `HomePresenter.swift:177` |
| Row separators between rows | none | `SKEntitiesAdapter+Extensions.swift:21` |
| Scroll indicator | not styled by Home (insets only, `HomeViewController.swift:317-331`) | — |

**Production (device screenshots, Sept 2026):** the Sept `ListThemeOptions.ia4Phone` moved the list to the dt tokens
(`Modules/Integration/ThemesIntegration/Interface/ListThemeOptions.swift:65-87` [Sept]): background `basePrimary`,
unread names `contentPrimary` (June `sk_primary_foreground`), read names and action rows `contentSecondary` (June
`sk_foreground_max_solid`), muted `contentTertiary`, **dividers `outlineTertiary`** (June `sk_foreground_low_solid`), the
"APP" tag `contentSecondary` on `baseTertiary`. Measured on a device (dark): read rows (185,186,189), dividers
(55,57,61) (`reference/device/IMG_2246`, measurements.md › D). The clone applies them on Home (`home.css`); SlackKit's
`.sk-row--*` defaults (src/slackkit) still carry the June grays.

### Row press feedback (all list rows)

- **Highlight fill**: a rounded rectangle inset **4 pt left and right** of the row, full row height, corner radius
  **12 pt** (`cornerCurve = .continuous`), color = list highlight color (`SKEntityBackgroundView.swift:43,54-55,69-72`).
  On iPhone `rowHighlightStyle` is `.init()` (`ListThemeOptions.swift:70`) so the color is the SKList default
  `CoreColorSet.primary.baseTertiary` = `dt_color_base_tertiary` light `#EAEAEA`, dark `#212428`
  (`SKList.swift:144-146`, `Colors.swift:56-61`).
- **Bounce**: while pressed the row content scales to `(maxDimension − 8) / maxDimension` (≈ 0.98 for a 393 pt row) on
  both axes (`SKListCollectionViewCell.swift:222-227`), spring damping 1.0; scale-down 0.12 s perceptual, scale-up
  0.25 s perceptual (`UIView+BounceMode.swift:21-35`, `UIView+SpringAnimation.swift:73-99`). No bounce with Reduce Motion.
- Rows are never shown "selected" on iPhone: `currentConversationHighlight` is `.highlight(...)` only on iPad
  (`ConversationListHomePlugin.swift:197`); `itemSelectedForegroundColor` is `nil` on iPhone (`ListThemeOptions.swift:75`).

---

## 3. Theme-derived colors used by the list

`ListThemeOptions.ia4Phone(colorSet:)` is used on every iPhone (`ThemeService.swift:223-239`, `ListThemeOptions.swift:65-87`).
In Sept it uses the `dt_*` core tokens where June used legacy `sk_*` colors.

| Role (`ListThemeOptions` property) | Resolves to | Light | Dark |
|---|---|---|---|
| `itemPrimaryForegroundColor` (unread names) | `CoreColorSet.primary.contentPrimary` (June `sk_primary_foreground` `#1D1C1D` / `#D1D2D3`) | `#1D1C1D` | `#F8F8F8` |
| `itemSecondaryForegroundColor` (read names, "Add channel" rows) | `contentSecondary` (June `sk_foreground_max_solid` `#616061` / `#9A9C9E`) | `#454447` | `#B9BABD` |
| `itemTertiaryForegroundColor` (muted names, header "+") | `contentTertiary` (June `sk_foreground_high_solid` `#868686` / `#75777A`) | `#5E5D60` | `#9A9B9E` |
| `dividerColor` | `outlineTertiary` (June `sk_foreground_low_solid` `#DDDDDD` / `#323538`) | `#5E5D60` @ 13 % | `#797C81` @ 30 % |
| `badgeStyle` (mention pill) background | `theme.baseInverseImportant` = UIColor(light: important._70, dark: important._40) | `#83388A` (aubergine_70) | `#9652A2` (aubergine_40) |
| `badgeStyle` text | `theme.contentInverseImportant` = UIColor(light: important._0, dark: important._100) | `#F9EDFF` (aubergine_0) | `#EFE1F5` (aubergine_100) |
| `presenceColors.active` (online dot) | `theme.baseInverseHighlight2` = UIColor(light: highlight2._50, dark: highlight2._60) | `#20A271` (jade_50) | `#3DAA7C` (jade_60) |
| `presenceColors.away` (away ring) | `CoreColorSet.primary.contentTertiary` | `#5E5D60` | `#9A9B9E` |
| `primaryAdjacentLabelColors` ("APP" tag) | text `contentSecondary` / bg `baseTertiary` (June `sk_foreground_max_solid` on `sk_foreground_low_solid`) | `#454447` on `#EAEAEA` | `#B9BABD` on `#212428` |
| `loadingPlaceholderStyle` | `.shimmering(backgroundColor: basePrimary)` | | |

Sources: `ListThemeOptions.swift:72-86`, `DefaultThemeColorSet.swift:108-135`, `Colors.swift:200-217,1634-1705`
(aubergine ramp), `:1310-1321` (jade). With the code fallback `ColorSet.defaultAubergine` (`ThemeService.swift:117`)
the online dot is aubergine_50 light `#C474D3` / aubergine_60 dark `#BC80CE`. Badge colors are the same for both.

Core (theme-independent) tokens that recur below: `contentPrimary` `#1D1C1D`/`#F8F8F8`, `contentSecondary`
`#454447`/`#B9BABD`, `contentTertiary` `#5E5D60`/`#9A9B9E`, `basePrimary` `#FFFFFF`/`#1A1D21`, `baseSecondary`
`#F8F8F8`/`#1A1D21`, `baseTertiary` `#EAEAEA`/`#212428`, `highlight1.content` `#1264A3`/`#2BA5CE`,
`highlight1.baseInverse` `#1264A3`/`#0A77A7` (June tokens `#004D76`), `highlight2.baseInverse` `#007A5A`/`#177E56`
(June tokens `#00553D`), `contentInversePrimary` `#FFFFFF`/`#F8F8F8` (`Colors.swift:42-253`). The design-tokens pin
moved from `df1f228` to `f76ac0a` (`internal.MODULE.bazel:209`), which also adds high-contrast variants.

---

## 4. Conversation rows

### 4.1 Common row geometry (every channel / DM / group DM / app / action row)

**Source:** `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBaseView.swift`,
`SKEntityOrnamentView.swift`, `SKEntityContentView.swift`, `SKEntityPrimaryContentView.swift`,
`DesignerComponents/OrnamentBox/SKOrnamentBox.swift`. All Home rows use size `.small`
(`TransformingPipeHelper.swift:45,252,306,368`).

**Snapshots:** `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKChannelEntitySnapshotTests/testChannelEntitySmallLongTextAndBadge@3x.png`
(a 2 × 2 grid since Sept: light / dark rows × normal / high-contrast columns, each cell 393 × 44 pt: `#` icon, black-weight
long name truncated with "…", count pill at right); `…SKMemberEntitySnapshotTests/testMemberEntitySmallWithUserDataActive@3x.png`
(avatar with green presence cutout, name, trailing tertiary text "Steve"). Measured in the light / normal
cell (÷3, unchanged from June): icon glyph x 20–36 pt, text starts x 52.33 pt, badge x 352–377 pt, y 13–31 pt.

```
|<-16->[ ornament 24×24 ]<-12->[ name ……… ][ inline extras ]<-8->[ accessories ]<-16->|   height 44
```

| Part | Value | Source |
|---|---|---|
| Row insets | top 10, left 16, bottom 10, right 16 | `SKEntityBaseView.swift:61-67` |
| Ornament → text gap | 12 (`HorizontalSpacing.standard`) | `SKEntityBaseView.swift:400-403` |
| Text → first accessory gap | 12 (same stack spacing) | `SKEntityBaseView.swift:142,238` |
| Gap between accessories | 8 (`AccessoryHorizontalSpacing.standard`) | `SKEntityBaseView.swift:405-408` |
| Ornament box | 24 × 24, transparent background at this size, corner radius 6 (0.25 × side) | `SKEntityOrnamentView.swift:468-479`, `SKOrnamentBox.swift:618-639,279-289`, `UIUtilities.swift:94-98` |
| Icon inside ornament | 20 × 20, centered | `SKIcon.swift:27`, `SKOrnamentBox.swift:269-276` |
| Vertical alignment | everything centered (`stackView.alignment = .center`) | `SKEntityBaseView.swift:112,313` |
| Row height | `max(ornament 24, text line 20.4, accessory 18) + 20` = **44 pt** (single line) | `SKEntityBaseView.swift:226-268`; snapshot above |
| Name ↔ inline items gap (status emoji, workspace label, "APP" tag) | 8 | `SKEntityPrimaryContentView.swift:103,141` |
| Name lines | 1 (3 when Dynamic Type > Large); tail truncation "…" | `SKChannelEntity.swift:25-26,160-162` |
| Disabled (archived) ornament | alpha 0.6 | `SKEntityOrnamentView.swift:68,107` |
| Row background | `listSupport.cellSupport.backgroundColor` (list background) | `SKChannelEntity.swift:128` |

### 4.2 Name text states

Channel rows (`SKListCellPresentationObject+Channel.swift:112-172`, colors passed at `TransformingPipeHelper.swift:277-280`):

| State | Condition | Font | Color | Channel icon style |
|---|---|---|---|---|
| Unread | `hasUnreads && !isMuted` | body **Black** 17 | `itemPrimaryForegroundColor` = `contentPrimary` `#1D1C1D` / `#F8F8F8` | filled |
| Read | `!hasUnreads` | body Regular 17 | `itemSecondaryForegroundColor` = `contentSecondary` `#454447` / `#B9BABD` | stroked |
| Muted | `isMuted` (read or unread) | body Regular 17 | `itemTertiaryForegroundColor` = `contentTertiary` `#5E5D60` / `#9A9B9E` | stroked |
| Selected | iPad only | — | `itemSelectedForegroundColor` (nil on iPhone) | — |

The channel icon uses the same color as the name (`SKListCellPresentationObject+Channel.swift:39,154-172`).
DM, app-DM and group-DM rows use the identical mapping (unread → primary + Black, read → secondary, muted → tertiary):
`SKListCellPresentationObject+Im.swift:182-220`, `+Mpdm.swift:88-137`, colors at `TransformingPipeHelper.swift:311-314,372-375`.
There is **no mute glyph**: muted rows are only dimmed and (in read sections) sorted to the bottom of their section
(`GroupingPipeSection.swift:221-238`).

### 4.3 Channel rows

**Source:** `SKListCellPresentationObject+Channel.swift`, `DesignerComponents/Entities/ChannelEntity/SKChannelEntity.swift`,
`TransformingPipeHelper.swift:217-282`.

| Channel type | Ornament icon (filled / stroked) | Name text | Source |
|---|---|---|---|
| Public | `svgChannelFilled` / `svgChannel` (`#`) | `nameWithoutIconPrefix` (no `#` in the text) | `SKChannelEntity.swift:201-207`, `+Channel.swift:122` |
| Private | `svgLockFilled` / `svgLock` | same | `SKChannelEntity.swift:194-200` |
| Archived | `svgArchive` (one style); entity `isEnabled = false` → ornament (and any inline icon) at alpha 0.6; the name keeps its normal read/unread color because it already carries a color attribute; the row stays tappable (list-level `isEnabled` is always true for channel rows) | `"<name> (archived)"` — string `archived` = "archived" (`localized_strings.yaml:2074`) | `SKChannelEntity.swift:192-193`, `+Channel.swift:44,119-121`, `SKEntityOrnamentView.swift:107`, `SKListCellPresentationObject.swift:359-387` |
| Shared / external / org-shared | **Same icon as public/private** — Home passes `shouldHideChannelInlineShareTypeIcon: true`, so the inline `svgSharedChannel` / `svgOrgSharedChannel` glyph is never drawn | | `TransformingPipeHelper.swift:255`, `SKChannelEntity.swift:236-256` |
| Name shared by several org workspaces | Workspace name appended after the name: body Regular 17, `contentSecondary` (`#454447` / `#B9BABD`), 8 pt gap, no avatar | | `TransformingPipeHelper.swift:163-174,243-248`, `+Channel.swift:198-201`, `SKEntityPrimaryContentView.swift:118-119,223-231` |
| Code (agent coding) channel with a session or PR status (new in Sept) | the status **replaces** the channel icon, `contentTertiary`: working → small spinner, done `svgCheckCircle`, waiting for input `svgInfo`, stale `svgMinus`, PR open `svgPrOpen`, merged `svgBranch`, closed `svgPrClosed`, idle `svgStatusMember`; archived → the normal icon. The status title joins the a11y label | name as usual | `SKChannelEntity.swift:132-138,211-233,77-80`, `+Channel.swift:46`, `Channel.swift:94-106`, `AgentSessionStatus.swift:11-21` |

Purpose/secondary text is never shown at size `.small` (`SKChannelEntity.swift:178-185`).

### 4.4 DM rows (person)

**Source:** `SKListCellPresentationObject+Im.swift:122-151`, `Entities/MemberEntity/SKMemberEntity.swift`,
`DesignerComponents/MemberAvatar/SKMemberAvatar.swift`, `SlackKitExtensions/.../MemberAvatar/SKMemberAvatar+Extensions.swift:77-107`.

- **Avatar**: 24 × 24 photo (`SKMemberAvatar.Size.small`, `SKMemberAvatar.swift:928-935`), corner radius
  `min(20, 0.25 × 24)` = **6 pt** (`SKMemberAvatar.swift:98-104`, `UIUtilities.swift:94-98`). Missing photo → initials /
  fallback color (not specified further).
- **Presence** (bottom-right, overhangs the avatar). For a 24 pt avatar (`SKMemberAvatar.swift:120-146,259-264,415-435`;
  the corner math moved into `AvatarAnnotationGeometry.swift:47-54` unchanged; only concentric (circular) avatars, not used
  by Home rows, center the cutout and icon on the edge instead, `SKMemberAvatar.swift:93-95,136-139,421-423`):
  - A circular **cut-out** is punched out of the photo: center (21.31, 21.31) pt from the avatar's top-left, radius
    6.82 pt (the row background shows through).
  - The status icon box is 17.36 × 17.36 pt at x = y = 12.59 pt; the SVG draws a circle of radius 4.5 in a 20-unit
    viewBox → **dot diameter ≈ 7.8 pt, centered at (21.27, 21.27)**. Snapshot shows the dot reaching x 41.33 pt,
    y 35.33 pt (row coords).
  - Icons: active `svgStatusMemberFilled` (solid dot); away `svgStatusMember` (ring: outer r 4.5, inner r 3 → ≈ 1.3 pt
    stroke); DND variants `svgStatusMemberDndFilled` / `svgStatusMemberDnd` (dot with a "z" notch); guests use
    `svgStatusGuest(Filled)` (multi-channel/external) and `svgStatusSingleChannelGuest(Filled)`
    (`SKMemberAvatar.swift:812-841`, SVGs `status_member_filled.svg`, `status_member.svg`, `status_member_dnd_filled.svg`).
  - Colors: active → `presenceColors.active` (`#20A271` / `#3DAA7C`), away → `#5E5D60` / `#9A9B9E` (§3;
    `SKMemberAvatar.swift:852-870`, passed at `TransformingPipeHelper.swift:317`).
  - Invited (pending) users always show "away"; channel experts always "active" (`SKMemberAvatar.swift:742-779`).
- **Name**: `user.name`; self-DM → `"%@ (you)"` (`name_placeholder_you`, `localized_strings.yaml:12722`); deactivated →
  `"%@ (deactivated)"` (`:12716`) — but deactivated DMs are filtered out of Home (`DefaultFilteringPipe.swift:63-64`).
  (`+Im.swift:182-200`).
- **Custom status emoji**: inline after the name, 8 pt gap, emoji at text size (`SKMemberEntity.swift:146`,
  `SKEntityPrimaryContentView.swift:191-197,103`).
- **External-org member**: their org's workspace avatar (20 pt, `.verySmall`) + org name (body Regular 17,
  `contentSecondary`) inline after the name (`+Im.swift:124-130`, `SKEntityPrimaryContentView.swift:209-231`); presence uses
  the external variant (`SKMemberAvatar+Extensions.swift:83`).
- **"Show avatars" pref off** (`showSideBarAvatars == false`): the avatar is replaced by the presence icon alone (20 pt icon
  in the 24 pt ornament slot) (`ConversationListHomePlugin.swift:205`, `SKMemberEntity.swift:311-315,106-112`).
- Title/secondary text is hidden at `.small` unless the caller opts in with `secondaryTextVisibility: .always` (Home
  doesn't) (`SKMemberEntity.swift:152-171`).
- Snapshots: `…SKMemberEntitySnapshotTests/testMemberEntitySmallWithStatus@3x.png` (inline status emoji),
  `testMemberEntitySlackbotPresence@3x.png` (heart presence), `testMemberEntityPresenceIndicatorSmallWithWorkspace@3x.png`.

### 4.5 App / bot DM rows

**Source:** `SKListCellPresentationObject+Im.swift:22-28,153-180`, `Entities/AppEntity/SKAppEntity.swift`,
`SKEntityPrimaryContentView.swift:50-58,105-117,172-179`, `GenericEntity/SKGenericEntity.swift:490-517`.
Used when the DM user `isBot || isSystemNotificationUser`.

- Ornament: app icon image 24 × 24, corner radius **4 pt** (`SKEntityOrnamentView.swift:403-427`); no presence.
- Name (same text states as §4.2), then an **adjacent tag** 8 pt after it: text `APP` (`app_badge`,
  `localized_strings.yaml:1931`; `AGENT` `:1085` when the user is shown as an agent and agents badging is on; `AGENTFORCE`
  `:1185` for Agentforce bots), font micro **Bold** 12, padding 2 pt top/bottom, 4 pt left/right, corner radius 4,
  colors `primaryAdjacentLabelColors` = `contentSecondary` on `baseTertiary` (`#454447` on `#EAEAEA` / `#B9BABD` on
  `#212428`; June `#616061` on `#DDDDDD` / `#9A9C9E` on `#323538`); Agentforce uses `prominentAdjacentLabelColors` =
  `highlight1.content` on `highlight1.base` (`#1264A3` on `#E3F8FF` / `#2BA5CE` on `#001A2D`) (`ListThemeOptions.swift:82-83`,
  `Colors.swift:62-67,218-223`). Sept adds a `skillSet` tag ("Skill set", `skill_set` `localized_strings.yaml:19220`; `SKGenericEntity.swift:490-517`), not used by Home.
- Snapshot: `…SKAppEntitySnapshotTests/testAppEntitySmall@3x.png`, `testAppEntitySmallWithAgentforceBadge@3x.png`.

### 4.6 Slackbot

Slackbot is not a bot user in this sense: it renders as a person DM (§4.4) whose presence is a **heart**
(`svgHeartFilled`, drawn at 0.75 scale, active color) (`SKMemberAvatar.swift:750-754,822-823,843-850`). Where it sits
(`SectionsReadsFinalGroupingPipe.swift:254-274`, Sept): with `ios_agents_in_dms` on (production), users shown as agents
(`isShownAsAgent && isInteractable`, Slackbot included) go to **Direct Messages**, unless the user hid agents from the DM
list (`hideAgentsInDmList`, `ConversationListPipelineFactory.swift:272`, `:285`); otherwise Agentforce bots go to Agents
and other bots and Slackbot to **Apps** (`.recentApps`). With `ios_move_app_mpdms` (default off) group DMs that contain a
bot or Agentforce follow them (`isBotOrSlackbotConversation` / `isAgentforceConversation`). Bots are still excluded from
"Unread DMs" and "Mentions" (`excludeBots: true`, `ConversationListPipelineFactory.swift:249,258`). If Slackbot lands in
"Direct Messages" with alphabetical sort, it is pinned right after your self-DM (`ExceptionsConversationSortingPipe.swift:177-208`).
Slackbot can't be muted (§13).

### 4.7 Group DM rows (MPDM)

**Source:** `SKListCellPresentationObject+Mpdm.swift`, `Entities/MPDMEntity/SKMultiPersonDirectMessageEntity.swift`,
`DeveloperComponents/GroupAvatar/SKGroupAvatar.swift`.

- Ornament at `.small` is a **count box, not stacked avatars** (`SKGroupAvatar.swift:293-300`): 24 × 24, corner radius
  6 (`:280-282`), background `baseTertiary` `#EAEAEA` / `#212428` (`:302-306`), centered number = members excluding you
  (`+Mpdm.swift:28`), font caption **Bold** 13, color `contentPrimary` (`SKGroupAvatar.swift:21-27,149`); the box side is
  now size-dependent (24 at `.small`, 20 at `.verySmall`, `:271-278`). While pressed the box background becomes
  `basePrimary` @ 13 % and the digit `sk_inverted_foreground` (`:26,311-318`).
- Name: member names sorted A→Z joined with ", " (`MpdmNamingHelper.swift:22-30`, `item_separating_comma`
  `localized_strings.yaml:10280`), or the custom group name if set (`+Mpdm.swift:94-101`). **Wraps up to 4 lines**
  (`SKMultiPersonDirectMessageEntity.swift:22-24,75`), so group-DM rows can be taller than 44 pt (height = text + 20).
- Snapshot: `…SKMultiPersonDirectMessageEntitySnapshotTests/testMPDMEntitySmallLongPrimaryText@3x.png`,
  `…SKGroupAvatarSnapshotTests/testGroupAvatarSmall@3x.png`.

### 4.8 Right-side accessories (order = left → right as appended)

**Source:** `TransformingPipeHelper.swift:217-242,284-300,348-364,507-633`, `DesignerComponents/Badge/SKBadge.swift`.

1. **Recap sparkle** (channels in the user's AI Recap): `svgAiSparkle` 20 × 20, tinted with the row's name color
   (`TransformingPipeHelper.swift:534-582`, accessory icon size `SKListRowAccessoryStackView.swift:363-366`).
2. **Huddle badge** (active huddle in the conversation): pill, `svgHeadphones` 12 pt + 4 pt + participant count (max
   `99+`), background `highlight2.baseInverse` `#007A5A` / `#177E56` (June tokens `#00553D`), text `contentInversePrimary` `#FFFFFF` / `#F8F8F8`;
   count 0 → icon only (`TransformingPipeHelper.swift:604-627`, `SKBadge.swift:346`). Tappable → huddle preview
   (`ConversationListHomePlugin.swift:501-515`).
3. **Onboarding badge** on the team's first channel (or #general): text pill `👋 Say hi` (`say_hi_wave`
   `localized_strings.yaml:16945`) or `👈  Start here` (`start_here` `:20626`), text `contentInversePrimary`, background
   `highlight1.baseInverse` `#1264A3` / `#0A77A7` (June tokens `#004D76`) (`TransformingPipeHelper.swift:585-593,629-633`).
4. **Mention badge** (`badgeCount > 0`): count pill, background `#83388A` / `#9652A2`, text `#F9EDFF` / `#EFE1F5` (§3).

Badge geometry (`SKBadge.swift:22-29,177-206,217-228,382-393,415-436`): font micro **Bold** 12 (max 18 pt with Dynamic
Type), padding 3 pt top/bottom, 9 pt left/right, height **18 pt**, width `max(24, text + 18 [+ icon 12 + 4])`, fully
rounded (radius = height / 2 = 9). Count text: numbers above 9 show **`9+`** (default `maxBadgeCount = 9`, format
`badgeCountNumberPlus` = `%@+`, `localized_strings.yaml:2385`); the huddle badge uses 99. Snapshots:
`…SKBadgeSnapshotTests/testBadgeSingleDigit@3x.png`, `testBadgeCountGreaterThanMaxBadgeCount@3x.png`.

### 4.9 Action rows inside sections

Built by `TransformingPipeHelper.createGenericCell` (`TransformingPipeHelper.swift:29-56`): generic entity size `.small`
(same 44 pt geometry as §4.1), icon 20 pt in the 24 pt box, both icon and text **`itemSecondaryForegroundColor`** =
`contentSecondary` (`#454447` / `#B9BABD`; June `#616061` / `#9A9C9E`), text body Regular 17, accessibility trait button.

| Row | Icon | English text (key, line) | Appears | Tap | Source |
|---|---|---|---|---|---|
| Add channel | `svgPlus` | "Add channel" (`add_channel_sentenced_cased`, 716) | last row of **Channels** (and of the unread copy of Channels / first dated section in recency mode); not for single-channel guests | action sheet: "Create Channel" (`create_channel_title` 4960), "Browse Channels" (`browse_channels` 2612), "Cancel" (`cancel` 3202); frontline workers get only Browse and Cancel (Sept) | `DefaultTransformingPipe.swift:239-245`, `SectionsReadsFinalGroupingPipe.swift:191-194`, `ConversationListHomePlugin.swift:539-569` |
| Start a new message | `svgPlus` | "Start a new message" (`start_a_new_message`, 20569) | last row of **Direct Messages** | compose-DM screen | `DefaultTransformingPipe.swift:253-259`, `SectionsReadsFinalGroupingPipe.swift:196-199`, `ConversationListHomePlugin.swift:462-464` |
| Browse all channels | `svgChannelSearch` | "Browse all channels" (`browse_all_channels`, 2606) | suggested-channels section | channel browser | `DefaultTransformingPipe.swift:246-252` |
| Show All N / Show All | `svgDirectMessages` | "Show All %@" (`see_all_x`, 17291) for N ≤ 9, else "Show All" (`show_all`, 18938) | row variant exists, but no current pipe adds it as a row — the Unread-DMs peek uses the header text button instead (§5) | expand | `DefaultTransformingPipe.swift:260-270`, `UnreadDMsPeekAndShowAllGroupingPipe.swift:48-57` |
| Show less | `svgDirectMessages` | "Show less" (`show_less`, 18960) | same as above | collapse | `DefaultTransformingPipe.swift:271-277` |
| Add Teammates | `svgPlus` | "Add Teammates" (`add_teammates`, 854) | own header-less section, refreshed-onboarding only | invite by email | `DefaultTransformingPipe.swift:278-284`, `AddTeammatesPipe.swift:14-29`, `ConversationListHomePlugin.swift:482-483` |
| Salesforce list | `svgSfRecordList` | entity name | Salesforce sections (no longer behind a flag in Sept; long-press: Move / Remove) | list view | `TransformingPipeHelper.swift:101-114` |

**Add-channel education banner** (first sessions): a coachmark banner row under "Add channel": text "Browse channels or
create new ones by tapping on **Add channel**." (`browse_channels_or_create_new_ones_by_tapping_add_channel`,
`localized_strings.yaml:2615`; smallBody 15, bold span Lato-Bold), text color `coachmark_banner_text` (`#FFFFFF` /
`#D1D2D3`), background `coachmark_banner_background` (`#1264A3` / `#17344C`), a close "×" accessory; tapping it or the ×
hides it (`DefaultTransformingPipe.swift:285-302`, `TransformingPipeHelper.swift:411-416`, `SKLegacyColors.swift:352-353`,
`ConversationListHomePlugin.swift:474-475,517-526`). Banner geometry: §9.

### 4.10 Other row states

- **Draft indicator (pencil)**: not found. Home rows have no draft accessory (looked in `TransformingPipeHelper.swift`,
  `DefaultTransformingPipe.swift`, `SKListCellPresentationObject+Channel/+Im/+Mpdm.swift`); drafts only surface via the
  "Drafts & Sent" tile (§7).
- **Current conversation pinned in unread sections**: iPad only (`ConversationListHomePlugin.swift:235`).
- Accessibility label = name, accessory labels ("N mentions", "N huddle participants"), "Unread", "Private"/"Archived",
  joined with pauses; code channels add their status (`SKChannelEntity.swift:66-113`, `TransformingPipeHelper.swift:509-526`).
- Tap on a conversation row: opens the conversation with `navigationMethod: .reset` — the tab root's detail stack is
  replaced, not pushed onto (Sept; June pushed under `rootNavigationUpdates`) (`ConversationListHomePlugin.swift:362-369`).

---

## 5. Section headers

**Source:** `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/SKHeaderEntity.swift` (typealias
`SKListHeaderView`), built in `DefaultTransformingPipe.swift:138-217`. Sept has one header style: June's
`iaNextHomeTabV3` toggle (`ios_ia_next_home_tab_v3.json`) is gone and its look is the only path.
**Snapshots:** `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKListHeaderSnapshotTests/`
`testMediumCollapsibleWithTextButton@3x.png` (2 × 2 grid: light / dark rows × normal / high-contrast columns, 393 × 50 pt
cells: bold "2,910 People", blue "See All", gray down-caret at right), `testMediumCollapsibleCollapsed@3x.png`,
`testMediumRightBadge@3x.png`, `testCollapsedIndicatorOrientationDown_collapsed@3x.png` / `…_expanded@3x.png`,
`testTitleWithSmallChevron@3x.png` (title, then the `›` at x 51–56.7), `testMediumTitleWithEmoji@3x.png`,
`testMediumTitleWithIcon@3x.png` (icon ink x 19–37, title from x 52).

```
[8 pt top padding]
|<-16->[ornament 24]<-12->[Title ……][›]  …spacer…  [badge]<-12->[4|+ or text|4]<-12->[⌃/⌄ 20]<-16->|  44 pt
```

| Part | Value | Source |
|---|---|---|
| Size used by Home | `.medium` | `DefaultTransformingPipe.swift:204` |
| Margins | 12 top / 16 left / 12 bottom / 16 right around the content | `SKHeaderEntity.swift:88,214-219` |
| Extra top padding | **8 pt** above the content (`shouldAddSymmetricalFooterPadding` default true) | `SKHeaderEntity.swift:312,372,570`, `SKListFooterView.swift:19` |
| Height | list sizing: `8 + max(18 title, 20 chevron/icon, 18 badge) + 24` = **52 pt** (the 24 pt ornament box doesn't change it). The autolayout-rendered snapshots measure 50 pt (the centered 20 pt chevron doesn't stretch the stack) | `SKHeaderEntity.swift:513-578`; snapshots above |
| Horizontal spacing | 12 between all items | `SKHeaderEntity.swift:85,112` |
| Background | list background | `SKHeaderEntity.swift:243` |
| Ornament | 24 pt box (`.small`) before the title, see "Ornament" below | `SKHeaderEntity.swift:615-626`, `DefaultTransformingPipe.swift:219-230` |
| Title (read section) | smallBody **Bold** 15, `CoreColorSet.primary.contentPrimary` `#1D1C1D` / `#F8F8F8` (fallback style) | `DefaultTransformingPipe.swift:149`, `SKHeaderEntity.swift:337-340,470-476` |
| Title (section has unreads) | smallBody **Black** 15, `itemPrimaryForegroundColor` = `contentPrimary` `#1D1C1D` / `#F8F8F8` | `DefaultTransformingPipe.swift:146-147` |
| Title lines | 1, tail truncation; width shrinks for badge/button | `SKHeaderEntity.swift:515-546` |
| `›` after the title (sort = Sections only) | `.chevronRight` (→ `svgCaretRight`) 20 pt, untinted → `contentPrimary`, 0 pt after the title; part of the title's tap target | `DefaultTransformingPipe.swift:152-155`, `SKHeaderEntity.swift:51-63,262-268` |
| Collapse chevron | `svgCaretDownFull`, 20 × 20, `contentTertiary` `#5E5D60` / `#9A9B9E`, far right | `SKHeaderEntity.swift:34,197-200` |
| Chevron orientation | collapsed: points **down**; expanded: rotated 180° → points **up** (Home always passes `.down`; June's default `.right` — down when expanded, right when collapsed — is only for other lists now) | `DefaultTransformingPipe.swift:207`, `SKHeaderEntity.swift:720-728` |
| Chevron shown | when `isCollapsible` (every section except "Unread DMs", "VIP unreads" and the header-less "Add Teammates" section) | `DefaultTransformingPipe.swift:206`, `UnreadDMsPeekAndShowAllGroupingPipe.swift:64`, `UnreadsPriorityPartialGroupingPipe.swift:58` |
| Right icon button "+" | `svgPlus` 20 × 20, `itemTertiaryForegroundColor` = `contentTertiary` `#5E5D60` / `#9A9B9E`, 4 pt padding each side | `DefaultTransformingPipe.swift:161`, `SKHeaderEntity.swift:76-78,84,653-661` |
| Right text button | smallBody **Bold** 15, `highlight1.content` `#1264A3` / `#2BA5CE`; ≤ half the header width | `SKHeaderEntity.swift:488-494,205,662-669` |
| Right badge | only when the section is **collapsed** and has conversations with mentions: count pill (§4.8 geometry, mention colors); count = number of conversations with mentions | `DefaultTransformingPipe.swift:184`, `SectionsReadsFinalGroupingPipe.swift:76,111` |
| Pressed state | the tapped part (title area, "+", chevron) fades to alpha 0.4 | `SKHeaderEntity.swift:788-807` |
| Long-press | none: Home passes `longPressMenu: nil` for every section (June: custom sections had Rename / Delete here when the v3 toggle was off) | `DefaultTransformingPipe.swift:205` |

**Production (device screenshots, Sept 2026):** `iaNextHomeTabV3` is on, and the Sept checkout has removed it: its
header is the only one (`DefaultTransformingPipe.swift:152-155`, `:194-230` [Sept]): the section's icon (a 24 pt `.small`
box at x 16, the 20 pt icon centered, untinted → `contentPrimary`, `SKHeaderEntity.swift:625`, `SKIcon.swift:159`), 12 pt,
the title (Bold 15 `contentPrimary`; Black when unread), the `›` (`.chevronRight` → `svgCaretRight` 20 pt,
`contentPrimary`, 0 pt after the title, `SKHeaderEntity.swift:51-63`, `:262-267`) in the sections sort, and the caret
(`caret_down_full`, `contentTertiary`) pointing **up** while expanded, down when collapsed (`.down`, `:720-726`); still
52 pt (the icon counts as 20). Title and `›` open the section browser (§11); the rest toggles collapse. No long-press
menu. Measured (`reference/device/IMG_2246`): icon ink x 20–35, title x 52.7, caret x 405.3–422.7. Icons: Starred
`star`, Channels `channel`, Direct Messages / Unread DMs `direct_messages`, Apps `ai_agents` with agents badging (else
`apps`), Salesforce `sf_cloud`, Mentions `mentions`; none for Unreads, Muted, dated and custom sections
(`GroupingPipeSection.swift:242-265` [Sept]). The clone always draws this header (June's flag is gone from
`src/app/flags.ts`; `src/app/screens/home/HomeScreen.tsx`).

**Right-button contents** (`DefaultTransformingPipe.swift:159-182`):

| Section | Button | a11y / text | Tap |
|---|---|---|---|
| Channels (and the Unreads section / first recency section), only when it has **≥ 15** conversations | "+" | "Add channel" (`add_channel_sentenced_cased`) | Create/Browse action sheet (§4.9) |
| Direct Messages, only with ≥ 15 conversations | "+" | "New Direct Message" (`new_direct_message`, 12812) | compose DM |
| Unread DMs with > 3 unread DMs, collapsed | text | "Show All %@" (`see_all_x`, 17291) with the unread-DM count | sets `showAllDMs = true` |
| Unread DMs, expanded | text | "Show Less" (`show_less_DMs`, 18963) | sets `showAllDMs = false` |
| Suggested channels | text | "Clear all" (`clear_all`, 4045) | dismiss suggestions |
| (Add Teammates special) | "+" | "Add Teammates" (`add_teammates`) | invite |

Threshold: `OnboardingConstants.ChannelList.headerButtonVisibilityConversationThreshold = 15`
(`Modules/Integration/Onboarding/Interface/OnboardingConstants.swift:15`, used at `SectionsReadsFinalGroupingPipe.swift:189`).
Button taps route through `ConversationListHomePlugin.swift:397-401,459-485`.

**Ornament before the title** (`DefaultTransformingPipe.swift:219-230`, `SKHeaderEntity.swift:615-626`): 24 pt ornament
box (`.small`) holding the section's custom **emoji**, or `svgUserGroupsFilled` for user-group sections, or the default
section icon: Starred `svgStar`, Channels `svgChannel`, Direct Messages `svgDirectMessages`, Apps `svgApps`
(`svgAiAgents` with agents badging), External Connections `svgBuildings`, Temporary channels `svgHourglass`, Code channels
`svgCode`, Agents `svgAgentforce`, Salesforce `svgSfCloud` (`GroupingPipeSection.swift:242-265`); Mentions `svgMentions`,
Unread DMs `svgDirectMessages`, VIP unreads `svgVip` (`MentionsPartialGroupingPipe.swift:35`,
`UnreadDMsPeekAndShowAllGroupingPipe.swift:61`, `UnreadsPriorityPartialGroupingPipe.swift:55`). Custom sections without an
emoji, the Unreads group, Muted and dated sections have none. Icon tint: not set (`SKIcon.PresentationObject(icon:)`
without color), so `SKIcon`'s default `contentPrimary` (`SKIcon.swift:159`).

**Interactions**

- Tap the header (spacer or chevron; the title too outside the Sections sort) → toggle collapse; state persisted per
  section id in `UserDefaults` (`ConversationListHomePlugin.swift:385-391`, `ChannelSectionListCache.swift:33-39`); light
  impact haptic, intensity 0.5. Collapsed sections render **no rows** (`SKList.swift:1460`).
- With sort = Sections, the **title** is a separate target followed by the `›` glyph; tapping it opens the **Section
  browser** (§11); a11y action "Show all Conversations" (`show_all_conversations`, `localized_strings.yaml:18941`)
  (`DefaultTransformingPipe.swift:152-155`, `SKHeaderEntity.swift:51-63,262-268`, `ConversationListHomePlugin.swift:393-395`).
- Rename / Delete a **custom** section: only from the section browser's "…" menu (§11; `GroupingPipeSection.swift:298-332`):
  "Rename %@" (`rename_x` 16406, `svgEdit`) and "Delete %@" (`delete_x` 5356, `svgTrash`, destructive).
  - Rename → create/rename-section sheet (`ConversationListHomePlugin.swift:412-413`).
  - Delete → alert title "Delete %@?" (`delete_x_question_mark` 5359), message "Conversations in %@ will move back to the
    Channels and Direct messages sections.\n\nAnd don’t worry – you won’t be removed from any channels when you delete
    this section." (`remove_channel_section_alert_message` 16189), buttons "Delete Section" (`delete_section` 5337,
    destructive) and "Cancel". Success toast "Deleted %@" (`deleted_x` 5396) with `svgTrash`; failure toast "Hmm,
    something went wrong" (`conversation_history_service_error_title` 4615) with `svgWarning`; the toast gets the icon
    itself (June passed a 30 × 30 white image), 1.0 s, max width 200 (`ConversationListHomePlugin.swift:571-614`).
- VoiceOver label for unread sections: "<name>, Collapsed/Expanded, Unread Messages." (`DefaultTransformingPipe.swift:192`;
  `collapsed` 4313, `expanded` 6564, `unread_messages` 22632).

---

## 6. Sections: which appear, what they're called, and their order

**Source:** `Modules/Features/Home/Implementation/Plugins/ConversationList/Pipelines/ConversationListPipelineFactory.swift`
and the pipes in `Pipelines/Pipes/`. Server section data: `Modules/DataService/ChannelSections/`.

### 6.1 Section kinds and names

Sections come from the user's sidebar sections (server; order = the server's linked list `nextSectionIdentifier`,
`ChannelSection.swift:53-57`). A section appears **only if at least one conversation (or entity) falls into it** — sections
are created from conversations (`SectionsReadsFinalGroupingPipe.swift:56-128`). Default-section names are localized on the
client (`ChannelSectionListManager.swift:342-368`, `ChannelsListSectionConfiguration.swift:24-45`,
`SectionItemActionDataTypes.swift:18-37`):

| Type (server) | Name shown | Key / line | Conversations routed here |
|---|---|---|---|
| `stars` | Starred (renamable) | `starred` 20543 | starred conversations |
| `channels` | Channels | `channels` 3917 | channels not in another section |
| `direct_messages` | Direct Messages | `direct_messages` 5458 | DMs and group DMs |
| `recent_apps` | Apps; "Agents & Apps" (`agents_and_apps` 1226) only with agents badging **and** agents-in-DMs off | `recent_apps` 15804 | bot / Slackbot DMs (with agents in DMs, agents and Slackbot go to Direct Messages instead, §4.6) |
| `slack_connect` | External Connections | `external_connections` 6607 | externally shared conversations, when the "show connect section" pref is on |
| `temporary_channels` | Temporary channels (June "Temporary Channels") | `temporary_channels` 21129 | |
| `coding_channels` | Code channels (June "Coding channels") | `coding_channels` 4291 | agent coding channels; **muted ones are dropped** (Sept; June kept only unread ones when unreads were prioritized) (`SectionsReadsFinalGroupingPipe.swift:71-73`) |
| `agents` | Agents (or "Agentforce" `agentforce` 1182) | `agents` 1223 | Agentforce bot DMs |
| `salesforce_records` | Salesforce | `salesforce_title` 16871 | record channels / Salesforce app |
| `standard` (custom) | user's name (+ optional emoji ornament) | — | channels the user moved there |
| `user_group` | group name (+ `svgUserGroupsFilled` ornament) | — | |
| redacted (EKM) | Can’t be shown | `cant_be_shown` 3262 | |

Fallback section list if the API fails: Starred, Temporary channels, Code channels, Channels, Direct Messages,
External Connections (`ChannelSectionListManager.swift:574-583`).

**Production (device screenshots, Sept 2026):** the apps section is titled **"Apps"** with the **`ai_agents`** icon (three
rings and a sparkle): Sept names it "Apps" when agents show in DMs (`ios_agents_in_dms`), else "Agents & Apps" with
badging (`ios_agents_and_apps_badging`), else "Apps" (`Modules/Features/Handlers/SectionItemAction/Interface/
SectionItemActionDataTypes.swift:25-32`), and gives it `svgAiAgents` with badging (`GroupingPipeSection.swift:252-253`):
both flags are on. With agents in DMs, agents' and Slackbot's DMs list under Direct Messages
(`SectionsReadsFinalGroupingPipe.swift:261-262`; the device shows Slackbot there with the heart presence). Unread copies of
a section keep its localized name. The list ends with a header-less **"+ Add Teammates"** row (`AddTeammatesPipe.swift:
13-31`; sections sort only, with invite permission and `ios_refreshed_onboarding_v2`, not for frontline workers,
`ConversationListPipelineFactory.swift:216`, `:306`): an 8 pt blank header under the previous section's hairline, the
generic `.small` row (`svgPlus` + "Add Teammates", body 17, `contentSecondary`), tap → InviteEmailRoute
(`ConversationListHomePlugin.swift:482-483`). Clone flags `agentsAndAppsBadging`, `agentsInDms`, `refreshedOnboardingV2`;
with `agentsInDms` the clone adds Slackbot's DM to Direct Messages right after your self-DM (the exceptions order,
`ExceptionsConversationSortingPipe.swift:177-213`; the demo's sidebar doesn't list it), read, opening Slackbot.

Conversations hidden from Home (`DefaultFilteringPipe.swift:49-89`): DMs with deactivated users, the Slackbot search
conversation, channel-expert DMs, frozen group DMs; with the "External people" filter, everything not externally
shared; with a workspace filter, channels outside that workspace; new in Sept, when the user turned off "show muted
channels" (pref `sidebar_show_muted_channels` = false), muted conversations without a mention badge
(`DefaultFilteringPipe.swift:57-59`, `ConversationListHomePlugin.swift:203`, `PreferencesDataSource.swift:62`). A section's "show unreads only" setting
(`ChannelSectionVisibility.unreads`) is carried but no Home pipe applies it (no consumer found in
`Modules/Features/Home/Implementation`).

### 6.2 Default mode: Sort = Sections, Unreads = "Move to the Top"

Defaults: sort mode `.sections`, prioritization `.unreadsOnTop`, filter `.all`, `showAllDMs` false
(`PerTabPreferencesService.swift:176-209`). Pipeline: `ConversationListPipelineFactory.swift:140-168,199-318`.
Group sections are carved out of the conversation list first, then the remaining (read) conversations fill the
user's sections:

| Group section | Id | Name (key, line) | Content | Collapsible | Source |
|---|---|---|---|---|---|
| VIP unreads (only if the VIP/priority feature is on) | `GroupingPipeSection.priority` | "VIP unreads" (`vip_unreads` 23320) | unread conversations with VIPs / in the priority list | no | `UnreadsPriorityPartialGroupingPipe.swift:42-71` |
| Unread DMs | `GroupingPipeSection.unreadDMsPeekAndShowAll` | "Unread DMs" (`unread_dms` 22629) | unread 1:1 and group DMs (no bots), newest first; **max 3** unless expanded via "Show All N" | no | `UnreadDMsPeekAndShowAllGroupingPipe.swift:17-77` |
| Mentions | `GroupingPipeSection.mentions` | "Mentions" (`mentions_title` 12054) | remaining conversations with a mention badge (no bots), ordered by section order then recency | yes | `MentionsPartialGroupingPipe.swift:29-50`, `ConversationListPipelineFactory.swift:253-260` |
| Unreads | `GroupingPipeSection.unreads` | "Unreads" (`unreads` 22638) | remaining unread, unmuted conversations — used only when the user has **no custom sections and nothing starred** | yes | `UnreadsPartialGroupingPipe.swift:118-151` |
| Unread copy of each section | `GroupingPipeSection.unreads-<sectionId>` | the section's own name | when the user has custom sections or stars: each section's unread conversations appear in a second, unread instance of that section, placed with the unread sections | yes | `UnreadsPartialGroupingPipe.swift:55-116`, `ConversationListPipelineFactory.swift:267` |

Then every section gets its **read** conversations (`SectionsReadsFinalGroupingPipe.swift`).

**Section order** (`DefaultSectionSortingPipe.swift:43-115`): huddles section → VIP unreads → Unread DMs → Mentions →
Unreads → the user's sections in server order, **with sections that contain unreads moved above sections that don't**
(only when unreads are prioritized) → Code channels (when it isn't in the server order; June pinned it right after the
huddles section) → anything else alphabetically → Muted last. A "Suggested Channels" section is re-inserted directly
under "Channels".

### 6.3 Unreads = "Show in order"

No VIP/peek/mentions/unreads groups are created (`ConversationListPipelineFactory.swift:243-274`): unread conversations stay
in their own sections (bold rows), and sections keep strict server order (`DefaultSectionSortingPipe.swift:76-82`).

### 6.4 Sort = "Newest to Oldest" (recency)

Pipeline `ConversationListPipelineFactory.swift:65-133`: conversations are grouped into dated sections by last activity —
"Today" (`today` 21781), "Yesterday" (`yesterday` 24196), "Last 7 days" (`last_seven_days` 10583), "Last 30 days"
(`last_thirty_days` 10590), then one section per year (`timeUtility.yearDateFormatter`), "Earlier" (`earlier` 5929) when
no date — plus "Muted" (`muted_channels` 12649) holding all muted conversations, and VIP unreads first if enabled
(`RecentActivityFinalGroupingPipe.swift:33-116`, `MutedPartialGroupingPipe.swift:54-61`). Sections are ordered huddles →
VIP → newest activity first → Muted last (`RecentSectionSortingPipe.swift:29-55`). The newest dated section gets the
"Add channel" row (`RecentActivityFinalGroupingPipe.swift:72-83`). Rows inside are newest first.

### 6.5 Order of conversations inside a section

(`ExceptionsConversationSortingPipe.swift:55-243`, `GroupingPipeSection.swift:221-238,268-285`)

- Uses each section's own sort (alphabetical / recent / priority, from the user's desktop section settings); recency
  mode forces recent.
- **Direct Messages, alphabetical**: your self-DM first, then Slackbot, then Slack Security, then A→Z.
- Read sections are grouped by type: channels, then DMs, then **muted conversations last**.
- Mentions keep section order with mentioned conversations first (`shouldMaintainSectionOrder`).

---

## 7. Synthetic view tiles row ("quick views")

**Source:** plugin `Modules/Features/Home/Implementation/Plugins/SyntheticViews/SyntheticViewsModularHomePlugin.swift`
(class `SyntheticViewsHomePlugin`), row `Tiles/SyntheticViewsTilesCustomRow.swift`, tile cell `Tiles/SyntheticViewTile.swift`,
circular cell `Tiles/SyntheticViewCircularTile.swift`, colors `Tiles/SyntheticViewTileColors.swift`, model
`Modules/Features/Home/Interface/SyntheticViewTilePresentationObject.swift`, one file per tile in `Tiles/` (`AllUnreadsTile`,
`CodeChannelsTile`, `SlackbotAiTile`, `ThreadsTile`, `RecapTile`, `HuddlesPageTile`, `CalendarTile`, `AgendaTile`,
`TasksTile`, `LaterTile`, `OutboundsTile`, `MoreTile`, `OverflowTabTile`, `CustomizeTile`), tile list
`HomeFeature+AppDonations.swift:49-71`, order/visibility prefs
`Modules/DataService/PerTabPreferences/Interface/PerTabPreferencesServiceInterface+Home.swift:29-58`.
(`Modules/UIInfra/SyntheticTile/` holds `SyntheticTile.swift` / `SyntheticTilesDrawerRow.swift`, not used by this iPhone row.)
Sept also has a **compact** tile layout (icon beside the text, caption subtitle, 42 pt Customize circle) used only by the
unified (SwiftUI) navigation shell, `NavigationArchitectureVariant().isUnified` (`SyntheticViewsModularHomePlugin.swift:276-282`,
`SyntheticViewTile.swift:35-39,189-211`); production iPhones run the legacy root, so the regular tiles below apply.

### 7.1 Snapshots (all `Modules/Features/Home/Snapshots/iOS_26/`)

Tile fixtures are 128 × 88 pt, light mode, rendered with a **Lagoon** theme (primary/highlight lagoon, important flamingo;
`Modules/Features/Home/Tests/Unit/SyntheticViewTileSnapshotTests.swift:18-20,97-101`), so their tints are blue-gray, not
aubergine.

| PNG | What it shows |
|---|---|
| `HomeFeatureTests.SyntheticViewTileSnapshotTests/testNewThemeReadCell@3x.png` | Read tile: white fill, light-gray 1 pt border, stroked sun icon, "Le title" regular gray, "Le subtitle" gray |
| `…/testNewThemeUnreadCell@3x.png` | Unread tile: tinted fill `#EFF3F6`, tinted border `#D2DADF` (Sept; June `#D1DFE6`), navy icon, "Le title" **Black**, navy subtitle |
| `…/testNewThemeUnreadBadgedCell@3x.png` | Unread + badge: 6 pt red dot at the icon's top-right, icon masked around it (dot `#C01343` = flamingo_70) |
| `…/testWithIconAndBetaLabel@3x.png` | Unread with corner accessory "TS" (micro bold) right-aligned on the icon row |
| `…/testWithIconAndFacePile@3x.png` | Unread with a small (18 pt) avatar face pile right-aligned on the icon row |
| `…/testWithFacePile@3x.png` | Ornament replaced by a face pile: navy pill "🎧 1" + overlapping avatar |
| `HomeFeatureTests.SyntheticViewsTilesCustomRowTests/testSomeTiles@3x.png` | Row of 4 read tiles (Shrek / Fiona / Donkey / …) with folder, hourglass, megaphone icons; first tile has "TS"; tiles are content-width, 8 pt apart, scrolling horizontally off the right edge; row 104 pt tall |
| `…/testNoTiles@3x.png` | Empty row (blank) |
| `HomeFeatureTests.SyntheticViewTileSnapshotTests/testCompactReadCell@3x.png`, `…/testCompactUnreadCell@3x.png`, `…/testCompactUnreadBadgedCell@3x.png` | New in Sept: the compact (unified-shell) tile |

### 7.2 Row layout

| Property | Value | Source |
|---|---|---|
| Container | one custom row in its own section (no header, default 8 pt top blank if first; default hairline footer, 8 pt, `outlineTertiary`); the row is **edge-to-edge** (spans the full list width even when the list has horizontal insets, Sept) | `SyntheticViewsModularHomePlugin.swift:271-306`, `SKEntitiesAdapter+Extensions.swift:18-25`, `SKListCollectionViewLayout.swift:174-186` |
| Scroll | horizontal `UICollectionView` flow layout, no scroll indicators, `delaysContentTouches = false`, clips nothing | `SyntheticViewsTilesCustomRow.swift:47-54` |
| Insets | content inset **top/bottom 8** (`topBottomPadding: 8`), **left/right 16** | `SyntheticViewsModularHomePlugin.swift:287`, `SyntheticViewsTilesCustomRow.swift:18-19,135-139` |
| Gap between tiles | **8** | `SyntheticViewsTilesCustomRow.swift:20,241-247` |
| Row height | tallest tile + 16 (= 90 + 16 = **106 pt** with default fonts; the test fixture pins 88 + 16 = 104) | `SyntheticViewsTilesCustomRow.swift:32-40` |
| Tile height | all tiles are stretched to the tallest tile | `SyntheticViewsTilesCustomRow.swift:230-239` |
| Elevated z-order | `isElevated: !SystemInformation.isLiquidGlass` | `SyntheticViewsModularHomePlugin.swift:292` |
| Measured | first tile at x = 24 pt in `testSomeTiles` (source says 16 — treat 16 as correct, the extra 8 is the test host); tiles 125.3 pt and 100 pt wide, gap 8 pt | snapshot |
| Visibility | the whole row is hidden when **no tile has activity** (unless the edu-onboarding empty state is showing) | `SyntheticViewsModularHomePlugin.swift:227-232` |
| Reorder | drag & drop enabled (long-press-drag a tile; Customize can't move; drop past the last droppable slot is forbidden); preview path = rounded rect r 12 | `SyntheticViewsTilesCustomRow.swift:95-99,288-343`, `SyntheticViewsModularHomePlugin.swift:290,333-346` |
| Scroll to start | when Home scrolls to top the row scrolls back to index 0 | `SyntheticViewsModularHomePlugin.swift:312-314`, `SyntheticViewsTilesCustomRow.swift:122-131` |

### 7.3 Rectangular tile

`SyntheticViewTile.swift:16-53,140-175,218-370,447-504`

```
┌───────────────────────────── r 12, 1 pt border ─┐
│ 13                                               │
│ 16 [icon 20]                  [corner accessory] 16
│ 4                                                │
│    Title (15, Black if unread / Regular)         │  18
│    Subtitle (15 Regular)                         │  18
│ 13                                               │
└──────────────────────────────────────────────────┘
```

| Part | Value | Source |
|---|---|---|
| Width | `16 + max(icon, title, subtitle) + 16`, minimum **100**, optional max | `SyntheticViewTile.swift:17-18,484-503` |
| Height | `13 + 24 (reserved ornament row) + 4 + title 18 + subtitle 18 + 13` = **90 pt** | `SyntheticViewTile.swift:19-20,464-494`, `SKHuddleFacePile.swift:375-382,397-404` |
| Measured (88 pt fixture) | icon row y 13–33, title line y 37–55 (cap top 41.3), subtitle y 55–73, left edge x 17 | `testNewThemeUnreadBadgedCell@3x.png` |
| Corner radius | 12, continuous; border 1 pt | `SyntheticViewTile.swift:32-33,155-160` |
| Content | vertical stack, leading-aligned; title and subtitle 1 line each (tail truncation) | `SyntheticViewTile.swift:72-76,224-225` |
| Title font | unread: smallBody **Black** 15; read: smallBody Regular 15 | `SyntheticViewTile.swift:417-422` |
| Subtitle font | smallBody Regular 15 (caption 13 in the compact layout) | `SyntheticViewTile.swift:424-429` |
| Icon | 20 × 20, tinted like the title | `SyntheticViewTile.swift:23,232-235`, `SyntheticViewTileColors.swift:53-55` |
| Badge dot | 6 × 6 circle at (icon width − 4, −1) relative to the icon; the icon is masked by a circle r 5 centered (19, 2) so the dot has a gap | `SyntheticViewTile.swift:24-25,378-395` |
| Corner accessory | right-aligned on the icon row (`trailingAccessory` in Sept): "TS" beta label (micro Bold 12), a small face pile, or a badge (the Code tile's "NEW") | `SyntheticViewTile.swift:242-296` |
| Slackbot ornament | Slackbot image **18 × 18** inset 1 pt in the 20 pt slot (Sept: the full-bleed bitmap matches the glyphs' optical size), corner radius 4 | `SyntheticViewTile.swift:26-29,308-343` |
| Pressed | scale **0.94** + press background, spring (same bounce mode as rows) | `SyntheticViewTile.swift:21,431-445` |
| State change | background/border animate 0.5 s when a tile flips read↔unread | `SyntheticViewTile.swift:348-358` |
| NUX shimmer (Slackbot tile) | conic gradient border (`#EDB22E`, `#E01E59`, `#36C4F0`, `#2EB57D`, `#EDB22E`), 1 pt, rotating 0.75 s/turn, opacity 0→1→0 over 3 s, once | `SyntheticViewTile.swift:42-52,99-119,506-538` |

**Tile colors** (`SyntheticViewTileColors.swift:13-99`). Unread light colors are the theme's `primary._80` at low alpha
(Sept dropped June's no-op `blend(…, percentage: 1.0)` calls); the tile sits on an opaque `basePrimary` layer
(`SyntheticViewTile.swift:57-62`), and the border is drawn over the fill. Effective values for Aubergine (`primary._80`
light = `#611F69`, `primary._100` light `#39063A` / dark `#EFE1F5`):

| Role | Definition | Light | Dark |
|---|---|---|---|
| Read fill | `core.basePrimary` | `#FFFFFF` | `#1A1D21` |
| Read border | `core.outlineTertiary` | `#5E5D60` @ 13 % → `#EAEAEA` | `#797C81` @ 30 % → `#373A3E` |
| Read pressed fill | light `core.baseSecondary`, dark `core.surfacePrimary` | `#F8F8F8` | `#F8F8F8` @ 6 % → `#272A2E` |
| Read title / icon | `core.contentSecondary` | `#454447` | `#B9BABD` |
| Read subtitle, read "TS" | `core.contentTertiary` | `#5E5D60` | `#9A9B9E` |
| Unread fill | light `theme.primary._80` @ 6.5 %; dark `#F8F8F8` @ 12.5 % | `#F5F0F5` | `#36383C` |
| Unread border | `theme.outlinePrimary` (new in Sept): `primary._100` @ 13 % light, @ 25 % dark (June: `primary._80` @ 13 % / `core.surfaceSecondary`) | `#DCD2DD` (June `#E2D5E3`) | `#64636A` (June `#67686B`) |
| Unread pressed fill | light `primary._80` @ 13 %; dark `core.surfaceSecondary` | `#EAE2EC` | `#525457` |
| Unread title / subtitle / icon | light `theme.contentPrimary` (= `primary._100`); dark `core.contentPrimary` | `#39063A` | `#F8F8F8` |
| Unread "TS" | `theme.contentSecondary` (light `primary._100` @ 80 %, dark `primary._90` @ 90 %) | `#39063A` @ 80 % | `#E3CEEB` @ 90 % |
| Badge dot | `theme.baseInverseImportant` | `#83388A` | `#9652A2` |
| Huddle pill in face pile | `theme.contentPrimary.resolved(.light)` (both modes) | `#39063A` | `#39063A` |

Verified against the Lagoon fixture: unread fill (239, 243, 246) = lagoon_80 `#0B527B` @ 6.5 % on white; border
(210, 218, 223) = lagoon_100 `#0D2E45` @ 13 % over the fill (`DefaultThemeColorSet.swift:179-183`; June's PNG had
(209, 223, 230), lagoon_80).

### 7.4 Circular "Customize" tile

`SyntheticViewCircularTile.swift:14-27,56-84,166-171`, `CustomizeTile.swift:76-86`: always appended last; a **48 pt
circle** (radius 24, 1 pt border, read colors), 8 pt extra leading padding, vertically centered in the row; icon
`svgSettings` 20 pt; no text is drawn ("Customize" `customize` 5109 is only its accessibility title). Cell 56 × 64 pt.
Tap → Customize Home screen (§7.6).

### 7.5 The tiles

Default order (all visible): Catch Up, Slackbot, Code (new in Sept), (today — no tile), Threads, Recap, Huddles,
Calendar, Agenda, To-dos, Saved, Later, Drafts & Sent, then the More page's destinations (More, Files, Sales,
Agentforce, Assigned to you, External Connections; new in Sept), then Customize
(`PerTabPreferencesServiceInterface+Home.swift:29-58`, `PerTabPreferencesService.swift:30-34`). A tile shows only if its
pref is visible **and** its availability publisher says `.configurable` (feature flags / services)
(`SyntheticViewsModularHomePlugin.swift:157-186`). Tile taps now navigate with `.resetsNavigationStack` / `.reset`
(the tab root's detail stack is replaced) on the legacy root.

| Tile | Title (key, line) | Subtitle | Icon read / unread | Unread when | Badge dot when | Tap → | Source |
|---|---|---|---|---|---|---|---|
| Catch Up | "Catch Up" (`catch_up_title` 3543) | "%d new" (`new_count` 12806); > 99 → "99+ new" (`new_count_plus` 12809); count = unread conversations + unread thread count | `svgStackedCards` / `svgStackedCardsFilled` | mentions > 0 or threads unread | channel mentions or thread mentions | All Unreads (Catch Up), resetting the stack (unified shell: `CatchUpRoute`) | `AllUnreadsTile.swift:119-145,105-115` |
| Code (toggle `ios_code_channels_tile`, default off) | "Code" (`code_channels_title` 4178; "Sessions" with session channel names) | "%d working..." (`code_channels_tile_working_subtitle` 4175) while sessions run, else "%d new" (`code_channels_tile_subtitle` 4172) | `svgCode` | a coding channel has unreads or waits for input / has a PR open | a mention or attention needed; a "NEW" tag (`new_all_caps`, `highlight1.baseInverse`) replaces the dot until dismissed | Code channels list | `CodeChannelsTile.swift:86-90,123-129,207-288` |
| Slackbot | "Slackbot" (literal) | "Ask anything" (`slackbot_ask_anything` 20033) | Slackbot image | never | never | Slackbot DM (`navigationMethod: .reset`; June pushed) | `SlackbotAiTile.swift:47-74,149`; hidden when the Slackbot bottom tab is on (`:49-50`, `:106-115`) |
| Threads | "Threads" (`threads` 21663) | "1 mention"/"%@ mentions" (`mentions_count_singular` 12048 / `mentions_count` 12045) › "%@ VIP"/"%@ VIPs" (`threads_vip_count_singular` 21676 / `threads_vip_count` 21672) › "%d new" | `svgThreads` / `svgThreadsFilled` | unread threads | thread mentions | All Threads | `ThreadsTile.swift:130-160,126` |
| Recap | "Recap" (`recap` 15673) | unread: "Ready" (`recap_unread_state` 15766) or "%@ days" (`other_days` 14319); read: "Available" (`recap_read_state` 15760), "Next: %@" (`recap_read_state_with_timestamp` 15763), or "Paused" (`paused` 14634) | `svgAiSummary` / `svgAiSummaryFilled` | recap ready | never | AI Recap | `RecapTile.swift:211-279,201` (the preview state is no longer behind a flag) |
| Huddles | "Huddles" (`live_huddles_synthetic_section_title` 11481) | "0 live" / "1 live" / "%d live" (`huddles_zero_ongoing` 9176 / `huddles_one_ongoing` 9035 / `huddles_many_ongoing` 8936) | `svgHeadphones` / `svgHeadphonesFilled`, + face pile of up to 3 participants (18 pt, no border) at the right, omitted when nobody is in one | ≥ 1 live huddle | never | Huddles page, resetting the stack | `HuddlesPageTile.swift:153-182,147,75` (hidden when Calendar is enabled) |
| Calendar | "Calendar" (`calendar_tile` 3062) | "1 ongoing" / "%i ongoing" / "No meetings" / "1 upcoming" / "%i upcoming" / "Not connected" (`calendar_tile_*` 3066-3086) | `svgCalendar` / `svgCalendarFilled` | an event is active | never | calendar carousel | `CalendarTile.swift:155-199,126` |
| Agenda | "Agenda" (`agenda_title` 1071) | same calendar strings | same | same | never | Agenda | `AgendaTile.swift:160-204,131` |
| To-dos | "To-dos" (`todos_title` 21871) | "%d overdue" (`items_overdue` 10290) › "1 item" (`items_one` 10287) › "%d items" (`items_many` 10283) | `svgCheckCircle` / `svgCheckCircleFilled` | overdue | overdue | Tasks | `TasksTile.swift:150-197,147` |
| Saved | "Saved" (`saved` 16912) | same item strings; the count is saved items **without a due date** (Sept; June: uncompleted minus to-dos) | `svgBookmark` | overdue | never | Tasks (saved) | `TasksTile.swift:109-112,150-197` |
| Later | "Later" (`saved_for_later_title` 16927) or "To-dos & Later" (`todos_and_later_title` 21827) with the laterTodos flag | "%d overdue" › "1 item" › "%d items" | `svgBookmark` / `svgBookmarkFilled` | overdue highlighted | overdue highlighted | Later | `LaterTile.swift:110,145-176,141` |
| Drafts & Sent | "Drafts & Sent" (`drafts_and_sent` 5868) | "%d failed" (`outbounds_failed_many` 14468) › "1 item" › "%d items" (drafts + scheduled + failed) | `svgSend` / `svgInfoFilled` when failures | failures | failures | Drafts & Sent, resetting the stack | `OutboundsTile.swift:106-124,101` |
| Files, Sales, Agentforce, Assigned to you, External Connections (new) | the More page row's title | none | the More page row's icon | the row has unreads | the row badges | that page (resets the stack) | `OverflowTabTile.swift:52-55,121-138,163-176`: only when the **Slackbot bottom tab** replaces More (`ios_slackbot_bottom_tab`, off in production) |
| More (new) | — | — | — | — | — | More page | `MoreTile.swift:34-48`: legacy-nav iPad list rows only |
| Customize | — (circle, §7.4) | — | `svgSettings` | never | never | Customize Home | `CustomizeTile.swift:70-86` |

Tile "activity" (what keeps the row visible): Catch Up = any mention/unread; Code = any coding channel; Threads =
mentions or unreads; Later = uncompleted items; To-dos = items or overdue; Saved = count > 0; Drafts & Sent = any
draft/scheduled/failed; Huddles = live huddle or you're in one; Recap = recap available; Slackbot = never
(`AllUnreadsTile.swift:81`, `CodeChannelsTile.swift:65-84`, `ThreadsTile.swift:91`, `LaterTile.swift:97`,
`TasksTile.swift:108-112`, `OutboundsTile.swift:88`, `HuddlesPageTile.swift:134`, `RecapTile.swift:128-182`,
`SlackbotAiTile.swift:119`). The Slackbot tile's NUX shimmer no longer waits for the Slackbot bottom sheet to have been
seen (`SlackbotAiTile.swift:58`). A tile with a nil state isn't drawn: Catch Up has one only while there are unread
conversations or unread threads (`AllUnreadsTile.swift:84-95`); Huddles, Later and Drafts & Sent show at zero ("0 live",
"0 items" on the device, `reference/device/IMG_2246`).

**Clone** (`src/app/screens/home/Tiles.tsx`): Catch Up, Slackbot, Threads, Huddles, Later, Drafts & Sent in Customize
Home's order, then the Customize circle; Catch Up only with unread conversations or threads; no row when no tile has
activity; with the Slackbot tab (the simulator's setting) no Slackbot tile and, after Drafts & Sent, the More page's
destinations as title-only tiles (Files, Sales with a Salesforce section, Assigned to you, External Connections); the
Slackbot artwork 18 pt, 1 pt inside its 20 pt slot. Customize Home (`src/app/sheets/home/CustomizeHome.tsx`) doesn't
list the destination tiles yet.

**Long-press menu** (UIKit context menu on the tile, preview = the tile): only Catch Up has one — "Mark all as Read"
(`mark_all_as_read` 11751, `svgTrash`, destructive) (`AllUnreadsTile.swift:133-135`, `SyntheticViewsTilesCustomRow.swift:265-285`).
Choosing it shows an alert "Mark all as Read?" (`catch_up_mark_all_as_read_title` 3525) / "This can't be undone."
(`catch_up_mark_all_as_read_message` 3522) with "OK" (`ok_all_caps` 13606, destructive) and "Cancel"; on failure "Error" /
"Sorry, an error occurred. Please try again." (`SyntheticViewsModularHomePlugin.swift:350-417`).

### 7.6 Customize Home screen

`Implementation/SyntheticTileCustomization/SyntheticTileCustomizationPresenter.swift`,
`SyntheticTileCustomizationViewController.swift:55-60`: nav title "Customize Home" (`customize_home` 5116), close button
`svgClose` ("Close"). One reorderable list with header "Customize Home" / secondary "Drag to reorder quick views in Home"
(`drag_to_reorder_quick_views_in_home` 5896). Each row: tile icon + tile name, a visibility toggle switch (Drafts & Sent
has no switch) and a "More Options" `…` button (`svgEllipsisHorizontalFilled`) with "Move Before" / "Move After"
(`move_before`/`move_after`, `svgArrowLeft`/`svgArrowRight`) (`SyntheticTileCustomizationPresenter.swift:24-107,121-217`,
`SyntheticTileCustomizationDataTypes.swift:28-36`). Sept adds rows for the new tiles: Code (`code_channels_title`), More,
Sales, Agentforce, Files, Assigned to you, External Connections (`SyntheticTileCustomizationPresenter.swift:150-163`).

---

## 8. Sort & filter menu (and the active-filter banner)

**Source:** `Modules/Features/Home/Implementation/NavigationBarControls/HomeNavigationBarControlsManager.swift`. The menu
is attached to the header's filter button (icon `svgRefine`, a11y "Sort and Filter Home" `home_sort_and_filter` 7969,
`HomeInteractor.swift:237-243`; pre-26 header `:577-583`). In Sept's legacy root the header's right items are
`[slackbot or history/filter, user]` in screen order (leading → trailing), so on screen `[Filter][avatar]`: the filter
button shows unless the history menu is on (then History) or the Slackbot header entry point is on (then Slackbot
displaces it) (`HomeInteractor.swift:222-271`). With the history menu or the Slackbot entry point the same menu items
are also attached to the workspace title (`HomeInteractor.swift:230-235`; pre-26 `:539-547`). It is a native `UIMenu`
(SKMenu); each submenu sits in its own section (with a stable `uniqueId` in Sept) so groups are separated by dividers
(`HomeNavigationBarControlsManager.swift:310-382`).

| Group | Item | Icon | Checked when | Source |
|---|---|---|---|---|
| **Sort by** (`sort_results_by` 20493) submenu; subtitle = current mode: "Sections. Unreads on top." (`home_sort_menu_subtitle_sections_and_move_to_top` 7972) / "Sections. Show in order." (`…_show_in_order` 7975) / "Newest to Oldest" | "Sections" (`channel_list_customization_sort_mode_default` 3763) | `.channels` (font glyph) | sort = sections | `:312-323,384-434` |
| | "Newest to Oldest" (`channel_list_customization_sort_mode_recency` 3766) | `svgClock` | sort = recency | |
| ↳ sub-group "Unreads and Mentions" (`unreads_and_mentions` 22641), only in Sections mode | "Move to the Top" (`prioritization_to_the_top` 15196) | `svgArrowUp` | unreadsOnTop | `:321,471-496` |
| | "Show in order" (`prioritization_none` 15193) | `svgShuffle` | none | |
| **Filter** (`filter` 7140) submenu (hidden when the history-menu flag is on); subtitle = current filter | "All conversations" (`all_conversations` 1622) | `svgChannel` | all | `:326-340,435-460,536-544` |
| | "External people" (`external_people` 6638) | `svgBuildings` | external | |
| **Workspaces** (`workspaces` 23908) submenu, only with > 1 workspace in the org; subtitle "All Workspaces" (`all_workspaces` 1690) or "%@ only" (`workspace_filter_currently_selected` 23877) | "All Workspaces" | `svgWorkspace` | none selected | `:342-364,507-533` |
| | each workspace name (A→Z) | workspace avatar 24 pt (`.small`) | selected | |
| (only when not default) | "Reset" (`reset` 16550), destructive | — | — | `:366-380` |

Selecting an option saves it and shows a toast (40 × 40 icon, `HomeNavigationBarControlsManager.swift:43,222-303`):
Sections → "Sorted by your Desktop Preferences" (`sorted_by_your_defaults` 20499, shown 250 ms after saving); Newest →
"Sorted by newest to oldest" (`sorted_by_recency` 20496); All → "Showing all" (`showing_all` 18997); External → "Showing
conversations with other companies" (`showing_external` 19000); Move to the Top → "Showing unreads on top"
(`prioritization_toast_to_the_top` 15202); Show in order → "Not showing unreads on top" (`prioritization_toast_none`
15199); Reset → "Reset" with `svgCheck`, restoring sections / all / unreads on top / all workspaces (`:283-303`).
There is **no separate "Unreads only" toggle** on iPhone Home — "unreads" is the prioritization choice above
(looked in `HomeNavigationBarControlsManager.swift`, `PerTabPreferencesServiceInterface+Home.swift`).

**Active-filter banner** (`Plugins/Filtering/ConversationListFilteringBannerHomePlugin.swift:77-174`), first section of the
list, header `.blankDivider`, no footer; one banner per active filter:

- External: **External people** only (`showing_external_banner` 19003, "External people" in Lato-Bold, rest body 17
  `contentPrimary`), ornament `svgBuildings`, tone `.genericLight`, a "×" accessory; a11y "Remove filter: external people
  only" (`remove_filter_external_connections` 16203).
- Workspace: **<Workspace>** only (`showing_selected_workspace` 19006), ornament = workspace icon image; a11y "Remove
  filter: %@ workspace" (`remove_filter_workspace` 16209).
- Tapping the banner or its × clears that filter (`:118-136`). Banner geometry/colors: §9.

---

## 9. Banners, cards and empty state

### 9.1 Banner component (used by every Home banner)

**Source:** `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Banner/SKBanner.swift`, `Banner/Banner.swift`,
`Entities/BannerEntity/SKBannerEntity.swift`. Snapshots:
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKBannerSnapshotTests/`, `…SKBannerEntitySnapshotTests/`.

| Property | `.regular` (Home) | Source |
|---|---|---|
| Card inset inside its list row | 12 top / 16 left / 12 bottom / 16 right | `SKBannerEntity.swift:23` |
| Card padding | 12 vertical, 16 horizontal; item spacing 12 | `SKBanner.swift:106-128`, `Banner.swift:258-263` |
| Corner radius | 12 | `SKBanner.swift:157-162`, `Banner.swift:166` |
| Border | 1 pt, tone outline (light outline may be absent) | `Banner.swift:373-389` |
| Ornament | icon in a 20 pt ornament box (`.verySmall`), tone ornament color | `SKBanner.swift:146-151` |
| Text | body 17 unless the caller sets a font; heading (if any) body **Bold** 17; heading–text spacing 4 | `SKBanner.swift:139-145`, `Banner.swift:43-46,53` |
| Pressed | alpha 0.6 | `Banner.swift:45` |
| Dismiss accessory | `.delete()` → "×" `svgClose` 20 pt at the right | `SKListRowAccessoryStackView.swift:117-130` |
| Background style | `.opaque` by default | `SKBanner.swift:416` |

Tone colors (`SKBanner.swift:198-315`; hex from `Colors.swift:42-349`):

| Tone | Background | Text | Ornament | Outline |
|---|---|---|---|---|
| `genericLight` | `baseTertiary` `#EAEAEA` / `#212428` | `contentPrimary` | `contentSecondary` `#454447` / `#B9BABD` | `outlineSecondary` `#5E5D60`@45 % / `#797C81`@50 % |
| `warning` | `highlight3.base` `#FFFAE0` / `#2F1E00` | `contentPrimary` | `highlight3.content` `#6B5000` / `#DEA700` | `#F1B900`@20 % / `#B38200`@20 % |
| `info` | `highlight1.base` `#E3F8FF` / `#001A2D` | `contentPrimary` | `highlight1.content` `#1264A3` / `#2BA5CE` | `#0E9DD3`@20 % / `#307EC0`@20 % |
| `error` | `important.base` `#FFE8EF` / `#300005` | `contentPrimary` | `important.content` `#C01343` / `#DE678A` | `#E01E5A`@30 % / `#D94C75`@25 % |
| `coachmark` | `coachmark_banner_background` `#1264A3` / `#17344C` | `contentInversePrimary` | `contentInversePrimary` | dark only: `outlineSecondary` |

### 9.2 Home banners

| Banner | When | Content (English, key/line) | Tone / icon | Action | Source |
|---|---|---|---|---|---|
| Active filter | a filter is on | §8 | genericLight | clears filter | `ConversationListFilteringBannerHomePlugin.swift` |
| Notification health check (**low priority**) | > 1 day since first launch, not dismissed, and push notifications are off | heading "Turn on push notifications?" (`turn_on_push_notifications` 22340); text "You’re not getting notifications about incoming messages on your device." (`youre_not_getting_notifications` 24744, smallBody 15) | warning, `svgNotifications`, × | tap → notification settings; × dismisses | `NotificationHealthCheckPlugin.swift:64-106,193-247`; section header blankDivider, footer hairline (`dividerColor`) |
| Session expiration | enterprise session near expiry | "It’s time to reauthenticate" (`time_to_reauthenticate` 21698), "Your session expires in %@ minutes" (17673), "Your session expires at %@" (17665), "Reauthenticate now to avoid interruption." (`reauthenticate_now` 15605) | warning / info, `svgInfoFilled` | tap → reauthenticate flow (`SessionExpirationReauthRoute`) | `SessionExpirationHomePlugin.swift:73-79` |
| Failed messages | queued sends failed | "1 failed message. **Tap to view.**" (`one_failed_message` 13717) / "%@ failed messages. **Tap to view.**" (`x_failed_messages` 24026) | error, `.exclamationCircle`, × | opens the failed message's conversation or thread, else Drafts & Sent › Sent | `FailedMessagePlugin.swift:159-200` |
| Boot error | initial load failed | "Slack is having trouble loading content" (`boot_trouble_loading` 2571) | error | none (no row handler in the plugin) | `BootErrorHomePlugin.swift` |
| Slack Connect pending | shared channel awaiting approval | "Your channel will be ready soon" (24658) / "The other organization’s admin needs to approve the channel before you can work together using Slack Connect" (24661) | info, `svgHourglass` | — | `SlackConnectHomePlugin.swift` |
| SC hub invite coachmark | pending connect invites | "You can always find your invitations to connect here" (`slack_connect_coachmark` 19318) | `svgBuildings` | — | `SCHubInvitePlugin.swift` |
| Huddle invite / request | invited to / requested into a huddle | "You've been invited to a huddle" (`you_have_been_invited` 24392), "%@ invited you" (`username_invited_you` 23081), "Join huddle" (`joinHuddle` 10303), "Switch to this device" (`huddle_join_switch_to_this_device` 8252), plus the other keys listed in the file | custom tones, `svgCalendar` | join | `HuddlesBannerPlugin.swift` |
| Updates / megaphone / dogfood / GovSlack | app update, marketing, internal builds | — (not traced string-by-string) | | | `Updates/`, `Megaphone/`, `DogfoodUpdates/`, `govSlackAwarenessPlugin` |

### 9.3 Onboarding cards and empty state

- **Onboarding cards** (`Plugins/Onboarding/OnboardingCardsHomePlugin.swift`, `ConversationListInformationCard.swift`): a
  "Next, you could…" (`next_you_could` 12885) section with cards (SVG illustrations in
  `Modules/Features/Home/ResourceBundle/SlackOnboardingAssets.xcassets/Cards/`: "Send a message", "See a few tips", "Get
  Slack for desktop", "Add teammates"), a "Suggested Channels" (`suggested_channels` 20772) section with "Clear all"; card
  content insets 7/14/7/14 (`ConversationListInformationCard.swift:34`). Replaced by `EmptyStateHomePlugin` when the
  refreshed-onboarding flag is on (`HomeFeatureComponent+Factory.swift:198-200`). Card visuals beyond this: not traced.
- **Empty state** (`Plugins/EmptyState/EmptyStateHomePlugin.swift:162-205`): shown when the conversation list produces
  zero sections (e.g. "External people" filter with no external conversations, `ConversationListHomePlugin.swift:756-762`).
  `SKEmptyState` with the `homeEmptyState` illustration (dark variant `homeEmptyStateDarkMode`), title "No conversations
  with people outside %@... yet." (`no_conversations_with_people_outside` 12948, workspace name), body "Use Slack Connect to
  collaborate securely with external clients, vendors, and partners." (`use_slack_connect_to_collaborate` 22860), button
  "Start a Conversation" (`start_a_conversation` 20549) if the user may invite, else "Show all Conversations"
  (`show_all_conversations` 18941). Snapshot: `…SlackKitTests.SKEmptyStateSnapshotTests/`.

---

## 10. Floating action buttons

### 10.1 Compose ("+") FAB

**Source:** `Modules/Features/CreationEntryPoints/Interface/CreationEntryPointsFABHelper.swift`,
`Modules/UIInfra/SlackKit/Implementation/Helpers/LayoutConstraints/CustomConstraintHelpers.swift:77-169`,
`Modules/Integration/ThemesIntegration/Interface/ColorSetFABConfigurator.swift`,
`Modules/UIInfra/SlackKitExtensions/Implementation/FloatingActionButton/SKFloatingActionButton+Extensions.swift:14-35`,
`Modules/Data/DataModels/Implementation/Layout/Spacing.swift:25-49`. Snapshots:
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKFloatingActionButtonSnapshotTests/`.

Home installs its own FAB only when the iOS 26 `rootNavigationUpdates` rollout is on and the device is not an iPad
(`HomeFeature.swift:111`, `HomeViewController.swift:24-37,173-175`, `CreationEntryPointsFABHelper.swift:75-76`); otherwise
the root tab container draws it from `fabButtonConfigurationPublisher` (`.creationEntryPoints(priority: .compose)`,
`HomeInteractor.swift:506-514`) — see the root/tab spec.

| Property | Value | Source |
|---|---|---|
| Size | **56 × 56** circle (`SKIconButton.Size.medium`); 44 × 44 when the vertical size class is compact | `SKIconButton.swift:430-443`, `CustomConstraintHelpers.swift:157-159` |
| Icon | `svgPlus`, 20 × 20; **frontline workers** get `svgCompose` with a11y "New message" (`new_message`) and tap goes straight to compose (new in Sept) | `CreationEntryPointsFABHelper.swift:104-127`, `HomeViewController.swift:274-279`, `HomeInteractor.swift:516-530`, `SKIconButton.swift:444-446` |
| Glass | `SKIconButton(useGlassEffect: true)` on iOS 26 | `CreationEntryPointsFABHelper.swift:39-44,150` |
| Shadow / stroke | no shadow, stroke on | `SKFloatingActionButton+Extensions.swift:26-30` |
| Background (theme) | light: 90 % `theme.baseInversePrimary` + 10 % `theme.contentInversePrimary` → Aubergine `#39063A`·0.9 + white·0.1 = **`#4D1F4E`**; dark: 90 % `baseInverseSecondary` + 10 % `contentInverseSecondary` → `#431349`·0.9 + `#E3CEEB`@0.9·0.1 ≈ **`#532659`** | `ColorSetFABConfigurator.swift:39-57`, `DefaultThemeColorSet.swift:80-86,166-172` |
| Pressed background | light: darken 0.3; dark: lighten 0.3 | `ColorSetFABConfigurator.swift:60-65` |
| Icon color | light `theme.contentInversePrimary` = `#FFFFFF` (inverted sidebar); dark `theme.contentInverseSecondary` = `#E3CEEB` @ 90 % | `ColorSetFABConfigurator.swift:24-31` |
| Horizontal position | iOS 26 with a Liquid Glass tab bar: **centered on the tab bar's search button** (x from the tab bar); fallback: trailing **24 pt** from the safe area (16 pt pre-iOS 26) | `CreationEntryPointsFABHelper.swift:49,80-89`, `CustomConstraintHelpers.swift:108-149` |
| Bottom | view bottom − **16** − (feature bottom inset + tab bar height) | `CreationEntryPointsFABHelper.swift:91,130-134`, `HomeInteractor.swift:129-134` |
| a11y | "Create New" (`create_new`, `localized_strings.yaml:4963`) | `HomeViewController.swift:277` |
| Tap | selection haptic → CreationEntryPoints sheet (tab `.conversations`, priority `.compose`), presented without animation; frontline workers → compose | `HomeInteractor.swift:369-397`, `HomeFeature.swift:201-202` |
| Long-press | medium impact haptic → same sheet in "VIP" mode with the gesture forwarded | `HomeInteractor.swift:399-425` |

Entry point identifiers available in that sheet: canvas, channel, compose, huddle, invite, list, reminder, vip
(`CreationEntryPointsFeatureInterface.swift:68-75`); their labels/layout are not traced here.

### 10.2 "Catch Up" FAB (pill)

**Source:** `Modules/Features/CreationEntryPoints/Interface/PrimaryFabEmbeddable.swift:108-372`, `HomePresenter.swift:201-216`,
`HomeInteractor.swift:47-53`. Sept: Home's bottom drawer in the unified-navigation (SwiftUI shell) variant now holds the
**creation-entry-points "+" FAB** (`.creationEntryPoints`, mirroring the legacy FAB), not this pill; the `.catchUp` pill
kind is kept for the browser-style unified nav (`PrimaryFabEmbeddable.swift:40-51`). Not drawn on the production
(legacy) root.

| Property | Value |
|---|---|
| Shape | glass pill, height **56**, corner radius **16** (continuous) |
| Position | trailing 24, bottom 24 inside the drawer |
| Content | `svgStackedCardsFilled` (left) + "Catch Up" (`catch_up_title`), smallBody **Bold** 15, padding 14 all sides |
| Colors | text/icon `theme.contentInversePrimary` (`#FFFFFF`); background `theme.baseInverseSecondary` = light `#611F69` (aubergine_80, inverted sidebar) / dark `#431349` (aubergine_10) |
| Tap | selection haptic → All Unreads (Catch Up) presented modally |

The section browser draws its own Catch Up pill whenever the selected section has unreads (Sept; June also needed a
Catch Up toggle): glass `SKPillButton`, height 56 (the 16 pt layer radius it's given is overridden: SKPillButton makes
itself a capsule, radius = height / 2, `SKPillButton.swift:162-167`, glass shape `:520`), 16 from the trailing and bottom edges, 14 pt padding,
`svgStackedCardsFilled` + "Catch Up" smallBody **Bold** 15 in `theme.contentInversePrimary` on `theme.baseInverseSecondary`;
tap → Catch Up limited to that section's conversations (`ConversationSectionBrowserViewController.swift:129-147,171-200`,
`CatchUpFabDrawerEmbeddable.swift:47-84`, `ConversationSectionBrowserInteractor.swift:134-139`).

---

## 11. Conversation section browser

**Source:** `Modules/Features/Home/Implementation/ConversationSectionBrowser/`, opened from a section title (sort =
Sections, §5) via `ConversationListHomePlugin.swift:674-682`.

- **Clone:** `src/app/screens/home/SectionBrowser.tsx` (`push({ screen: 'section-browser', sectionId })`), from the Sept
  source (`ConversationSectionBrowserViewController.swift:66-166`, `ConversationSectionBrowserPresenter.swift:63-105`): the
  title is the section's own name when there's only one section; the pills are SKTabBar `.pillButton` (the DM pills'
  colors), `.fitAllContent`, 8 pt insets, centered on the tapped section once; the "…" menu holds "Mark all as Read" when
  the section has unreads and "Rename / Delete %@" for custom sections only (`GroupingPipeSection.swift:298-332`); while
  the selected section has unreads, the Catch Up pill (§10.2) floats 16 pt from the trailing edge and above the tab bar
  and opens Catch Up on that section's conversations (`push({ screen: 'catch-up', conversationIds })`,
  `ConversationSectionBrowserFeature.swift:147-148`).
- Presentation: pushed on iPhone with `.resetsNavigationStack` (Sept: it replaces the tab's detail stack, so Back returns
  to Home) (`presentModally` is only true on non-compact iPad); on iPad a popover from the header, or a large sheet with
  grabber (`ConversationSectionBrowserRouteExecution.swift:11-22`, `ConversationSectionBrowserFeature.swift:31-44`,
  `ConversationListHomePlugin.swift:679`). With one section the list starts at the safe-area top (no tab bar)
  (`ConversationSectionBrowserViewController.swift:78,96-101`).
- Nav title "Browse Sections" (`section_browser_title` 17264); right bar button `…` ("Show more options"
  `show_more_options` 18972) with the section's menu: "Mark all as Read" (only if it has unreads), "Rename %@",
  "Delete %@" (`GroupingPipeSection.swift:298-332`, `ConversationSectionBrowserViewController.swift:151-167`).
- Top: horizontally scrolling `SKTabBar` with one tab per section (name + leading ornament), the tapped section centered
  on first load (`ConversationSectionBrowserViewController.swift:23-34,98-106`).
- Body: `SKEntitiesList` of that section's conversations (rows identical to §4, built by `SectionBrowserTransformingPipe`),
  background `basePrimary`; tapping opens the conversation; long-press menu as §13.
- "Mark section as read?" (`section_browser_mark_as_read_title` 17261) / "This can't be undone." (17258), buttons
  "Mark as Read" (`mark_as_read` 11757) / "Cancel" (`ConversationSectionBrowserFeature.swift:161-206`).

---

## 12. Scrolling, loading and pull behaviors

- **Pull down**: Home has no pull-to-refresh (`HomeFeature.refresh()` is empty, `HomeFeature.swift:266`). Its
  `pullToBehavior` is `.search` (`HomeFeature.swift:240`): pulling past a threshold opens search, with an "easter egg"
  message while pulling — both owned by the root header (`CompactRootTabSearchHeader.swift:800-814`,
  `showPullToSmileMessages: true` at `HomeInteractor.swift:267`). While the finger is down and pulling, list updates are
  deferred until release (`HomeViewController.swift:244-252,282-284`).
- **Scroll to top**: status-bar tap or tab re-tap asks the presenter, which hands the list an animated `.scrollToTop`
  instruction (Sept; June set the offset to `-contentInset.top` directly); the tiles row also scrolls back to its first
  tile (`HomeViewController.swift:302-306`, `HomePresenter.swift:170,191-199`, `HomeInteractor.swift:354-356`, §7.2).
- **Header on scroll** (iOS 26 / Liquid Glass): the nav title fades as the list scrolls
  (`SKNavigationItem.TitleFadeScrollEffect`, `HomePresenter.swift:107-110`) — header spec.
- **Loading** (before the first plugin data): list shows `SKLoadingState` placeholders, layout `.sections(cellsPerSection:
  3)`, header and cell placeholders `.small` with image masks, shimmering on the list background
  (`HomePresenter.swift:115-127`, `ListThemeOptions.swift:79`); shimmer gradient `surfacePrimary` → `surfaceSecondary`,
  1.8 s (`SKLoadingShimmerView.swift:19-27`). Exact placeholder bar sizes: not traced
  (`…SKListSnapshotTests/testLoadingState@3x.png` shows a different, list-style layout).
- **Header loading bar** follows `hasUpToDateContent` of the conversation list, debounced 1 s (`HomeInteractor.swift:485-504`).
- **Team-creation celebration**: once after creating a team, a full-width "tada_wide" Lottie animation plays over the top
  half of the screen (fade in/out 0.2 s), skipped when animated images are disabled (`HomeViewController.swift:70-76,
  150-157,166-168,207-235`).

---

## 13. Row long-press menu, preview and swipe

**Source:** `TransformingPipeHelper.swift:420-505`, `Modules/Features/Handlers/SectionItemAction/Implementation/ConversationActionBuilder.swift`,
`SectionItemActionBuilder.swift:32-135`, handler `ConversationListHomePlugin.swift:487-495,616-672`.

Long-press on a conversation row shows the system context menu with a **message preview** above it (the conversation's
transcript: header, thread root, messages; 350 × 450 pt, or 350 × 420 for channels when Recap is on; background
`basePrimary`) (`TransformingPipeHelper.swift:19-23,487-505`). Menu title: the conversation name, public channels with
"#" (`TransformingPipeHelper.swift:460`). Groups, top to bottom:

| Group | Item (English, key/line) | Icon | Shown when |
|---|---|---|---|
| 1 | "Mark as Read" (`mark_channel_as_read_context_menu` 11775) | `svgMarkAsRead` | has unreads |
| | "Mark Unread" (`mark_unread` 11784) | `svgMarkAsUnread` | no unreads (always in Sept; June needed the `markAsUnreadAction` flag) (`ConversationActionBuilder.swift:111-125`) |
| | "Add to Recap" / "Remove from Recap" (`add_to_recap` 913 / `remove_from_recap` 16222) | `svgAiSummary` | channels, Recap enabled |
| | "Add to VIP" / "Remove from VIP" (`add_to_vip` 947 / `remove_from_vip` 16260) | `svgVip` / `svgVipFilled` | 1:1 DMs with priority access |
| | "Mute Channel" / "Unmute Channel" (`mute_channel_context_menu` 12628 / `unmute_channel_context_menu` 22589); DMs: "Mute Conversation" / "Unmute Conversation" (12637 / 22592) | `svgNotificationsOff` / `svgNotifications` | not Slackbot / Slack Security |
| 2 | "Move To…" (`move_to_context_menu_title` 12480) submenu: "Starred" (checkmark when starred, `svgStar`), each custom section (emoji or `svgUserGroups` ornament, checkmark if current); then "Move to New Section" (`move_to_new_section` 12486, `svgPlus`, paid plans) and "Remove from %@" (`remove_from_section` 16240, `svgClear`, destructive) if it's in a section/starred. Submenu icon: `svgStar`, `svgStarFilled`, or the current section's emoji | | the user has custom sections (not for temporary-section items) |
| | Without custom sections: "Move To Starred" (`move_to_starred` 12499) / "Remove from Starred" (`remove_from_starred` 16256, `.unstarO`), "Move to New Section" | `svgStar` | |
| 3 | "Copy…" (`copy_context_menu_title` 4704) submenu (`svgFiles`): "Copy Name" (`copy_channel_name_context_menu` 4701; icon `svgChannel` / `svgUserGroups` / `svgUser`), "Copy Channel Link" (`copy_channel_link_context_menu` 4698, `svgLink`), "Copy Huddle Link" (4741, `svgHeadphones`, member + huddles), "Copy Email Address" (4719, `svgEmail`, loaded async if allowed) | | always |
| | "Leave Channel" (`leave_channel_context_menu` 10766), destructive | `.signOut` | channels you're a member of, not #general |

Actions dispatch to `conversationActionHandler` (mute/unmute, mark read/unread, star, move, new section, remove, leave,
copy…, recap, VIP) (`ConversationListHomePlugin.swift:616-660`). Salesforce entity rows get only Move / "Remove from %@"
(`TransformingPipeHelper.swift:463-485`).

**Swipe actions: none.** No Home row sets `swipeActions` (looked in `Modules/Features/Home`,
`Modules/UIInfra/SlackKitExtensions/Implementation/List`; the property defaults to nil, e.g. `SKChannelEntity.swift:304`).

---

## 14. Reference snapshots (most useful first)

All under `Modules/…/Snapshots/iOS_26/` in the latest checkout. Component PNGs are 2 × 2 grids since Sept (light / dark
rows × normal / high-contrast columns; crop `light` / `dark` in `reference/ios/snapshots.json`).

1. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKChannelEntitySnapshotTests/testChannelEntitySmallLongTextAndBadge@3x.png` — channel row geometry, unread weight, count pill.
2. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberEntitySnapshotTests/testMemberEntitySmallWithUserDataActive@3x.png` — DM row avatar with presence cut-out.
3. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKListHeaderSnapshotTests/testMediumCollapsibleWithTextButton@3x.png` — section header: bold title, blue text button, caret (and `testTitleWithSmallChevron`, `testMediumTitleWithIcon` for Home's icon + `›` header).
4. `Modules/Features/Home/Snapshots/iOS_26/HomeFeatureTests.SyntheticViewsTilesCustomRowTests/testSomeTiles@3x.png` — tiles row spacing and widths (393 × 852 pt screen, unchanged since June).
5. `Modules/Features/Home/Snapshots/iOS_26/HomeFeatureTests.SyntheticViewTileSnapshotTests/testNewThemeUnreadBadgedCell@3x.png` — unread tile with badge dot (plus the sibling tile PNGs in §7.1).

Also: `…SKMultiPersonDirectMessageEntitySnapshotTests/testMPDMEntitySmall@3x.png`, `…SKAppEntitySnapshotTests/testAppEntitySmall@3x.png`,
`…SKGroupAvatarSnapshotTests/testGroupAvatarSmall@3x.png`, `…SKBadgeSnapshotTests/testBadgeSingleDigit@3x.png`,
`…SKBannerSnapshotTests/`, `…SKFloatingActionButtonSnapshotTests/`, `…SKEmptyStateSnapshotTests/`.
There is no full-screen Home snapshot in the repo (looked in every `Snapshots/iOS_26` folder).

---

## 15. Gaps

- **No full Home screenshot** exists; vertical rhythm is derived from code (row 44, header 52, footer 8, tiles row 106);
  the device screenshot `reference/device/IMG_2246` (local only) is the production check.
- **Mention badge color** is theme-derived (`baseInverseImportant`); the SlackKit badge snapshots use the core red
  (`#E01E5A`) instead, so there is no snapshot of the themed Home pill.
- **Section header ornament tint**: the icon is created without a color (`DefaultTransformingPipe.swift:222-226`), so it
  takes `SKIcon`'s default `contentPrimary` (`SKIcon.swift:159`); emoji ornaments are untinted.
- **Draft (pencil) indicator** on rows: not found (§4.10).
- **Loading placeholder geometry** for Home's `.sections(cellsPerSection: 3)` layout: not traced (§12).
- **Create sheet** (compose FAB target) contents and labels: not traced (§10.1).
- **Onboarding cards, updates/megaphone/dogfood/GovSlack/prototype banners**: only summarized (§9.2–9.3).
- **Tiles row leading inset**: source 16 pt vs. 24 pt in the snapshot host (§7.2).
- **Avatar fallback** (no photo: initials/colors) not specified (`SKMemberAvatar.swift`, not traced).
- **Unified (SwiftUI) navigation and Radical Simplification**: Sept carries a unified shell (compact tiles, a creation FAB
  in the list's drawer, `NavigationArchitectureVariant`) and a prototype `Modules/Features/HomeRadSimp` Home (toggle
  `ios_rad_simp`, default off, unified only); both are off in production and not covered here.
- `Modules/Integration/ConversationListDataSource` and `Modules/Features/Home/Implementation/Plugins/ConversationList/DataSources`
  only feed data (conversations, prefs, huddles, onboarding flags) and contain no UI; not described further.
