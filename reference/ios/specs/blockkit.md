# Block Kit on iOS: blocks, elements, modals, App Home, attachments

> **Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Line numbers are for that checkout
> (`~/Desktop/Slack Mobile Code Base/slack-objc-latest`); the spec was first written against the June snapshot `cd22922`.
>
> **What changed since June**
> - **plan / task_card** (§3.17): no border, 8 pt padding (was 12); the header title is Lato Regular 17 content_secondary
>   that shimmers while loading (was Lato Bold 17, aubergine while loading); all ornaments and the caret content_secondary
>   (was content_primary / aubergine); a complete plan task shows the 8 pt dot (was a check); the pipe is 2 pt (was 4);
>   a task's details, output and sources are one item; sources are links. A tasks-in-a-bottom-sheet mode is behind
>   `ios_tasks_in_bottom_sheet` (default off).
> - **header** (§3.2): fonts come from the text system's header scale: no level = level 2 = Lato Black 22 (was Black 20);
>   level 3 and up Bold 20. A flatter scale is behind `ios_flat_message_heading_scale` (default off).
> - **Colors moved to tokens**: rich_text and message text use content_primary (was sk_primary_foreground, #D1D2D3 in
>   dark), gray text content_secondary (was sk_foreground_max_solid); card titles content_primary, card subtitles Lato 17
>   content_tertiary (were Lato 13 content_secondary), card slack_icons content_tertiary; SKButton primary / danger /
>   outline / systemDanger use highlight2 / important tokens (dark primary #177E56, danger #D3305D), the default
>   style's pressed title is 75 % (was 80 %); SKTabBar's underline highlight2.baseInverse.
> - **Date / time sheet** (§5.3): always a native self-sized sheet with a grabber (was SKBottomSheet unless
>   `bottomsheetMigration`); the date is clamped to min / max; display strings use the Gregorian calendar.
> - **container** (§3.15): `rich_text_title` and `has_header_divider` (a 1 pt outline_tertiary line under the header).
> - **Pipeline** (§0): `condition` blocks are resolved on the client, unknown blocks with `fallback` blocks draw those
>   (spliced into rows); new block types `ask_user_question` (question), `page`, `layout` (drawn as unknown);
>   `agent_permissions_card` is gone, `share_skill` is the deprecated skill block; `canvas_table` and canvas callouts
>   that can't render get a tappable "Open in canvas" fallback. Membership gating is no longer behind a flag.
> - **Elements** (§4): checkboxes honor `visible_to_user_ids`; actions drop elements that aren't drawn; disabled
>   options ignore taps; text inputs keep a current value apart from `initial_value`; the option picker's search
>   separator is outline_tertiary.
> - **Text editor** (§5.4): specced from the source: the single-line keyboard card and the iOS 26 glass card.
> - **Files** (§3.11): an expanded preview (image / video / large file card) is behind `ios_file_block_expanded_preview`
>   (default off). **App DMs** (§8): agents open on Messages; **legacy dialogs** (§7.8): the submit is a bar button item.
> - Component snapshots are a 2 × 2 grid now (light / dark rows, normal / high-contrast columns). The checkout also has
>   iOS_27 PNGs (`Modules/UIInfra/BlockKitComponents/Snapshots/iOS_27/`). They differ from iOS_26 in 29 tests, all by
>   0.1–2 %: the checkbox tests (`BKCheckboxOption`, `BKCheckboxGroup`, `BKInputBlock testCheckboxes`, the section
>   checkbox accessory), where iOS_26 still shows June's filled unchecked box (white / dark gray) and iOS_27 the
>   September SKCheckbox's clear one, which the clone matches; and the contact-card and event blocks, whose 1 pt outer
>   border only iOS_27 draws. Everything else in this spec was checked against iOS_26.

How Slack's iOS app draws and runs Block Kit, measured from its source. Paths are relative to the iOS repo root
(`slack-objc-latest`, main @ `14b3cbaf`) unless they start with `~` or `output/ios/Colors.swift` (the design-tokens
repo at `f76ac0a`, vendored in `reference/ios/vendor/design-tokens-f76ac0a/`). Snapshot PNGs live under
`~/Desktop/Slack Mobile Code Base/slack-objc-latest/Modules/**/Snapshots/iOS_26/`.

Contents: 0 pipeline and global rules · 1 colors · 2 SKButton · 3 blocks · 4 elements · 5 pickers and editors ·
6 interaction, state, validation, errors · 7 modals · 8 App DM tabs, App Home, App Profile · 9 blocks in messages and
legacy attachments · 10 gaps · 11 reference PNGs.

---

## 0. Pipeline and rules that apply to every block

**Pipeline.**
1. JSON is parsed into `BaseBlock` models (`Modules/Data/BlockKitDataModels`). Block types:
   `Modules/Data/BaseModels/Implementation/Blocks/BlockType.swift:6-45` (Sept: `question` = "ask_user_question",
   `layout` and `page` added, `agent_permissions_card` removed, "share_skill" is `deprecatedSkill`); element types:
   `Modules/Data/BaseModels/Implementation/Blocks/BlockElementType.swift:6-38`. Unknown strings decode to `.unknown`.
2. `BKBlockPresentationService.convert` (`Modules/Unlayered/Services/BlockKitPresentation/Implementation/BKBlockPresentationService.swift:229-255`)
   first resolves `condition` blocks to their `ios` branch (behind the client-condition toggle) and replaces an unknown
   block that carries `fallback` blocks with those (`convertExpandingFallback`), then turns each block into one row
   (`switch` at `:314-663`). Per-block converters:
   `Modules/Unlayered/Services/BlockKitPresentation/Implementation/Blocks/*`; per-element dispatch:
   `.../Implementation/BKBlockElementConverter.swift:41-177`.
3. Each row is one UIView in `Modules/UIInfra/BlockKitComponents/Implementation/` (row list:
   `List/BKBlocksListAdapter.swift:18-54`).
4. Hosts: modals and the App Home tab put the rows in an `SKList` (`Modules/Features/AppView/Implementation/AppViewViewController.swift:30`);
   messages stack them with zero extra spacing in `MKMessageBlockContent`
   (`Modules/UIInfra/MessageKit/Implementation/MKMessageBlockContent.swift:44-366`).

**Per-surface differences.**

| | Message (channel, DM, thread) | Modal (`views.open`) | App Home tab |
|---|---|---|---|
| Left/right inset of every block | 0: blocks fill the message text column (`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Utilities/BlocksConverterUtility.swift:90-110` passes no insets) | 16 / 16 (`Modules/Features/AppView/Implementation/ModernAppViewInteractor.swift:405`, legacy `AppViewInteractor.swift:510`) | 16 / 16 (same interactor) |
| Space above the first block | 4 (first-row inset) | 8 list header (`AppViewPresenter.swift:96` → `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:2076-2080`, `.../List/Footer/SKListFooterView.swift:19`) + 4 = 12 | same as modal |
| Text inputs | Tapping opens a full-screen editor (§5.4) | Edited inline | Edited inline (`BlockSurfaceV2.swift:192-197` in `Modules/Data/BlockKitDataModels/Implementation/Helpers/`) |
| " (optional)" after input labels | no | yes | no (`.../Blocks/InputBlock+BKContainerBlockConvertible.swift:200-207`) |
| `optional: false` enforced on submit | n/a | yes | no (`ModernAppViewInteractor.swift:877-880`) |
| rich_text base style | Lato 17 regular, content_primary (June `sk_primary_foreground`); ephemeral, system and redacted messages use content_secondary (June `sk_foreground_max_solid`) (`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/MessageViewPresentationObjectFactory.swift:58-59`, `DefaultTransformationPath.swift:893-895`) | same (`Modules/Unlayered/Services/BlockKitPresentation/Interface/BlockKitPresentationServiceInterface.swift:108-112`) | same |
| Background | message row | `dt_color_base_primary` (`AppViewViewController.swift:111`) | same |

**Text defaults.** Any text a block doesn't style is Lato Regular 17 (`SKFont.body`) in `dt_color_content_primary`
(`Modules/UIInfra/SlackKit/Implementation/Extensions/TextAttributes+Display.swift:21-53`). Section text, fields,
button labels and, since Sept, rich_text all use content_primary (dark `#F8F8F8`; June's rich_text was
`sk_primary_foreground`, dark `#D1D2D3`). Line boxes are Lato's natural line height, ≈1.2× the size, rounded up to a device pixel; measured
at @3x: 17 pt → 20.67 pt, 15 → 18, 13 → 15.67, 20 → 24, 22 → 26.4, 28 → 33.6
(`BKInputBlockSnapshotTests/testSelectWithHintAndError`, `BKHeaderBlockSnapshotTests/*`). `mrkdwn` text is parsed
(bold, italic, strike, code, pre, quote, links, mentions, dates, emoji) and `plain_text` with `emoji: false` keeps
`:shortcodes:` as text (`.../Elements/TextBlockElement+BKBlockConvertible.swift:59-78`).

**Vertical spacing between blocks.** Each block carries its own top inset; nothing is added between rows
(`Modules/UIInfra/BlockKitComponents/Implementation/Helpers/Utils.swift:24-53`).

| Block | Top | Bottom |
|---|---|---|
| First block in the list (any type) | 4 | 0 |
| `actions` | 10 | 0 |
| `divider` | 10 | 10 (`Blocks/Divider/BKDividerBlockView.swift:81`) |
| `input` | 16 | 0 |
| every other block | 12 | 0 |
| internal `loading` block | 12 (4 if first) | 12 |
| unknown block (fallback banner) | 8 inside the view, see §3.20 | 8 |

**Interaction gating.** `allowActionInteractions: false` (search results, previews) and not being a member of the
conversation (Sept: always; June only behind `isMembershipBasedSurfaceEnablementEnabled`) disable inputs, buttons and
"complex" blocks; text links and media stay tappable
(`BKBlockPresentationService.swift:78-101`). Disabled buttons use the inactive style (§2), select rows drop to 70%
alpha (`Helpers/Utils.swift:56`), checkboxes/radios use their disabled colors (§4.5).

**Snapshot conventions.** BlockKitComponents PNGs are 393 pt wide per cell at @3x, rendered with zero side insets;
since Sept they are a 2 × 2 grid on a transparent background: light over dark, normal contrast on the left and high
contrast on the right (`Modules/UIInfra/SnapshotTestFoundations/Implementation/ComponentSnapshotTestCase.swift:12,196-225`),
so dark text looks invisible in a viewer. A few are single-appearance (e.g. `BKHeaderBlockSnapshotTests/testHeaderBlockLevel1-4`).
`BKCheckboxGroupSnapshotTests/*` and `BKActionsBlockSnapshotTests/testActionsBlock` still show an older 20 pt
rounded-square checkbox; the source and `BKCheckboxOptionSnapshotTests/*` show the current 21 pt circle (§4.5).

---

## 1. Colors used in this spec

Design tokens from `output/ios/Colors.swift` at `f76ac0a` (light / dark; the file now also carries high-contrast
values). Alpha shown as `@n%`. New uses in Sept: `dt_color_base_inverse_highlight_2` `#007A5A` / `#177E56` (line 104;
SKButton primary, SKTabBar underline) and `dt_color_base_inverse_important` `#E01E5A` / `#D3305D` (line 116; SKButton
danger); their dark values changed with this token version (June `#00553D`, `#B41541`).

| Token | Light | Dark | Line |
|---|---|---|---|
| `dt_color_base_primary` | `#FFFFFF` | `#1A1D21` | 42 |
| `dt_color_base_secondary` | `#F8F8F8` | `#1A1D21` | 50 |
| `dt_color_base_tertiary` | `#EAEAEA` | `#212428` | 56 |
| `dt_color_base_highlight_1` | `#E3F8FF` | `#001A2D` | 62 |
| `dt_color_base_highlight_2` | `#E3FFF3` | `#05241B` | 68 |
| `dt_color_base_highlight_3` | `#FFFAE0` | `#2F1E00` | 74 |
| `dt_color_base_important` | `#FFE8EF` | `#300005` | 80 |
| `dt_color_surface_primary` | `#1D1C1D@6%` | `#F8F8F8@6%` | 134 |
| `dt_color_surface_secondary` | `#1D1C1D@25%` | `#F8F8F8@25%` | 140 |
| `dt_color_surface_highlight_1` | `#36C5F0@13%` | `#036696@25%` | 146 |
| `dt_color_surface_highlight_3` | `#FFC600@18%` | `#A07300@18%` | 158 |
| `dt_color_content_primary` | `#1D1C1D` | `#F8F8F8` | 200 |
| `dt_color_content_secondary` | `#454447` | `#B9BABD` | 206 |
| `dt_color_content_tertiary` | `#5E5D60` | `#9A9B9E` | 212 |
| `dt_color_content_highlight_1` | `#1264A3` | `#2BA5CE` | 218 |
| `dt_color_content_highlight_2` | `#007A5A` | `#3DAA7C` | 224 |
| `dt_color_content_highlight_3` | `#6B5000` | `#DEA700` | 230 |
| `dt_color_content_important` | `#C01343` | `#DE678A` | 236 |
| `dt_color_content_inverse_primary` | `#FFFFFF` | `#F8F8F8` | 248 |
| `dt_color_content_inverse_secondary` | `#CBCCCF` | `#B9BABD` | 254 |
| `dt_color_outline_primary` | `#7C7A7F` | `#797C81` | 290 |
| `dt_color_outline_secondary` | `#5E5D60@45%` | `#797C81@50%` | 296 |
| `dt_color_outline_tertiary` | `#5E5D60@13%` | `#797C81@30%` | 302 |
| `dt_color_outline_highlight_1` | `#1264A3` | `#2BA5CE` | 308 |
| `dt_color_outline_important` | `#E01E5A` | `#D94C75` | 344 |
| `dt_color_outline_important_secondary` | `#E01E5A@30%` | `#D94C75@25%` | 350 |
| `dt_color_palettes_lagoon_40` | `#1CB6EB` | `#0A77A7` | 1448 |

`CoreColorSet.default.primary.X` = `dt_color_X`; `.highlight1/2/3/important.base/content/surface/outline(Secondary)` =
`dt_color_base_highlight_1` etc. (`Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:68-175`).

Legacy colors (`Modules/Data/Color/Implementation/SKLegacyColors.swift`):

| Name | Light | Dark | Line |
|---|---|---|---|
| `sk_primary_foreground` | `#1D1C1D` | `#D1D2D3` | 27-29 |
| `sk_foreground_max` | `#1D1C1D@70%` | `#D1D2D3@70%` | 65 |
| `sk_foreground_max_solid` | `#616061` | `#9A9C9E` | 70 |
| `sk_foreground_high_solid` | `#868686` | `#75777A` | 80 |
| `sk_foreground_low` / `_min` | `#1D1C1D@13%` / `@4%` | `#D1D2D3@13%` / `@4%` | 90, 112 |
| `sk_foreground_low_solid` | `#DDDDDD` | `#323538` | 95 |
| `sk_lilypad_green` | `#007A5A` | same | 192 |
| `sk_raspberry_red` | `#E01E5A` | same | 202 |
| `message_rendering_mention_text` | `#0B4C8C` (sk_indigo) | `#1D9BD1` (sk_highlight dark) | 338 |
| `message_rendering_code` | `#E01E5A` | `#E8912D` | 339 |
| `message_rendering_code_block_fill` | sk_foreground_min | sk_foreground_low | 342 |
| `message_rendering_code_block_stroke` | sk_foreground_low | `#D1D2D3@50%` (sk_foreground_high) | 343 |
| `aubergine_button_fill` | `#4A154B` | `#FFFFFF` | 344 |

---

## 2. SKButton: the control behind every Block Kit button, select button and picker button

Source: `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton.swift`, `SKButton+Types.swift`,
`SKButton+PresentationObject.swift`; wrapped by `Modules/UIInfra/BlockKitComponents/Implementation/Elements/Button/BKButtonView.swift`.

**Size.** Block Kit never passes a size, so every button is `.medium` (default at `SKButton+PresentationObject.swift:126-138`,
`BKButtonView.swift:175-183`):

| Property | Value | Source |
|---|---|---|
| Font | Lato Bold 15 (`smallBodyBold`) | `SKButton+Types.swift:271-272` |
| Top / bottom padding | 10 | `SKButton+Types.swift:302-303` |
| Left / right padding | 12 | `SKButton+PresentationObject.swift:222-223` |
| Corner radius | 12, continuous curve | `SKButton+Types.swift:326-327`, `SKButton.swift:272-273` |
| Icon | 20×20, 6 pt from the title | `SKButton+Types.swift:354-355,374-375` |
| Border | 1 pt when the style has a border color | `SKButton.swift:46,274` |
| Height | max(title line 18, icon 20) + 20 → 38 without icon, 40 with icon (measured 40 in `testSectionBlockWithStandardButtonAccessory`) | `SKButton.swift:182-217` |
| Title | centered, wraps (`numberOfLines` 0); only text and emoji spans are kept (no bold/links) | `SKButton+PresentationObject.swift:132,140-153`, `SKButton.swift:254-258` |

Width: full width wherever the parent stretches it (actions, section button accessory, cards); intrinsic
(title + 24 [+ 26 with icon]) when inline in a section.

**Styles** (`SKButton+Types.swift:134-244`; BK mapping `BKButtonView.swift:204-218`,
`.../Elements/ButtonBlockElement+BKBlockConvertible.swift:91-102`):

| Block Kit `style` | SKButton style | Background | Title | Border | Pressed background |
|---|---|---|---|---|---|
| none (default) | `outlineDefault` | base_primary | content_primary | outline_secondary | base_tertiary lightened 80% (`dynamicLighten(0.8)`) |
| `primary` | `primary` | highlight2.baseInverse `#007A5A` / `#177E56` (June sk_lilypad_green in both) | white | none | that darkened 20% |
| `danger` | `outlineDanger` (outlined, not filled) | base_primary | important.content `#C01343` / `#DE678A` | important.outline `#E01E5A` / `#D94C75` | base_tertiary lightened 80% |
| (work object primary) | `outlinePrimary` | base_primary | highlight2.content `#007A5A` / `#3DAA7C` | highlight2.outline `#007A5A` / `#259B69` | same |
| (internal `link`) | `systemDefault` | none | content_highlight_1 | none | title lightened 50% |

Sept colors: `SKButton+Types.swift:145-148,166-169,188-191,208-216`; the `default` style's pressed title is
`Modifiers.pressedOpacity` 75 % (June 80 %, `:225-231`). Measured from the June `BKSectionBlockSnapshotTests/*ButtonAccessory`:
standard dark bg `#1A1D21`, border `#4A4C51`; danger title/border `#E01E5A` on white / `#1A1D21`; primary `#007A5A`
in both modes; link `#1264A3` / `#2BA5CE`.

**States.**
- Pressed: scales to 0.96 with Slack's bounce animation (`SKButton.swift:47,429-447`; duration lives in
  `UIView.animateWithBounceMode`, not read) and swaps to the pressed background. `systemDefault` doesn't bounce
  (`SKButton+Types.swift:236-243`).
- Disabled (`inactive`): background base_tertiary, border clear, title content_secondary (`SKButton.swift:249-251,402-421`).
- Loading (`processing`): title and icon hidden, an 18 pt spinner centered; the button is disabled
  (`SKButton.swift:25,30-35,234-236,298-300`). Spinner: track surface_primary, arc `dt_color_palettes_lagoon_40`,
  line width = size/10, arc 30%↔25% of the circle, one turn per 1.25 s with a slight ease
  (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Spinner/SKSpinner.swift:46-81,113-117,186-218`).
- Icons are tinted with the title color unless the icon brings its own (`iconPresentationObject.colorOverride`,
  `SKButton.swift:452-463`).

---

## 3. Blocks

### 3.1 section: `BKSectionBlockView`

Source: `Modules/UIInfra/BlockKitComponents/Implementation/Blocks/Section/BKSectionBlockView.swift`,
`Section/Views/BKFields.swift`, `Section/Views/BKInlineAccessory.swift`; converter
`.../Blocks/SectionBlock+BKContainerBlockConvertible.swift:12-44`.

Layout (`BKSectionBlockView.swift:72-117`):
- Outer vertical stack, spacing 6: row 1 = text column + inline accessory (spacing 8, top-aligned, text takes the
  rest); row 2 = full-width accessory.
- Text column: `text`, then `fields`, 6 pt apart (`:106-116,262-265`).
- `fields` are one column, not a 2-column grid: each field is a full-width label, 8 pt apart
  (`BKFields.swift:19-21,43-49,83-105`; `BKSectionBlockSnapshotTests/testSectionBlockWithTextAndFields`).
- Text and fields: Lato 17 regular, content_primary, unlimited lines. No `expand` / "See more": the presentation
  object has no such field (`BKSectionBlockView.swift:364-391`).

Accessory placement (`BKSectionBlockView.swift:312-358`, `BKInlineAccessory.swift:60-108`):

| Accessory | Placement | Rendering |
|---|---|---|
| `image` | right of text, 68×68, top-aligned | `SKThumbnailAttachment`: radius min(20, 0.225×68) = 15.3, 1 pt border outline_tertiary, bg base_primary, not tappable (`BKInlineAccessory.swift:22,122-124`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/ThumbnailAttachment/SKThumbnailAttachment.swift:72-75,89-92,109-111`; `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:94-99`) |
| `overflow`, `datepicker` | right of text, intrinsic width | SKButton (§4.2, §4.4) |
| `button`, `workflow_button`, every select, `timepicker`, `datetimepicker` | full width below the text, 6 pt gap | SKButton (§4.1, §4.3) |
| `checkboxes`, `radio_buttons` | full width below the text, 6 pt gap | option groups (§4.5) |

Height = top inset + max(text + fields, inline accessory) + (6 + full-width accessory) (`:223-302`).
Links, mentions and channels in the text are tappable (§3.8) when interactions are allowed (`:22-30,149-155`).

PNGs: `BKSectionBlockSnapshotTests/testSectionBlockWithText`, `...WithTextAndFields`,
`...WithTextAndInlineButtonAccessory` (inline "02/02/2022" button), `...WithTextAndInlineImageAccessory`,
`...WithStandardButtonAccessory` (full-width outline button with caret), `...WithPrimaryButtonAccessory`,
`...WithDangerButtonAccessory`, `...WithCheckboxGroupAccessory`, `...WithRadios`.

### 3.2 header: `BKHeaderBlockView`

`Blocks/Header/BKHeaderBlockView.swift:58-95`; converter `.../Blocks/HeaderBlock+BKBlockConvertible.swift`.
One label (`isHeader`), full width, unlimited lines, content_primary, no extra padding. Since Sept the text is one
header text block of the block's `level`, 2 when it has none (`:79-91`), and the text system picks the font
(`Modules/UIInfra/SlackKit/Implementation/Extensions/Text+Display.swift:49-61,224-237`; rich_text headers use the same
scale, their level defaults to 1, `Modules/Data/BaseModels/Implementation/RichText/RichTextHeader.swift:21,34`):

| `level` | SKFont | Lato | June |
|---|---|---|---|
| none (standard header) | `title` (as level 2) | Black 22 | `subtitle`, Black 20 |
| 1 | `headline` | Black 28 | same |
| 2 | `title` | Black 22 | same |
| 3 and up | `subtitleBold` | Bold 20 | 3 `subtitle` Black 20, 4 `bodyBold` |

With `ios_flat_message_heading_scale` (default off): ≤ 1 `subtitle`, 2 `bodyBlack`, 3+ `bodyBold`.

PNGs: `BKHeaderBlockSnapshotTests/testHeaderBlock` (Sept 2 × 2; Black 22, 3 lines, 12 pt top inset);
`testHeaderBlockLevel1`…`4` (light only, long wrapping text; levels 3 and 4 are both 20 pt).

### 3.3 divider: `BKDividerBlockView`

`Blocks/Divider/BKDividerBlockView.swift:18-21,75-82`: a line 2 device pixels tall (0.67 pt at @3x, 1 pt at @2x),
`dt_color_outline_tertiary`, full content width; 10 pt above and 10 pt below. PNG:
`BKDividerBlockSnapshotTests/testDividerBlock`.

### 3.4 context: `BKContextBlockView`

`Blocks/Context/BKContextBlockView.swift:33-41`, `BKContextBlockView+PresentationObject.swift:54-70`,
`Context/CollectionView/ContextBlockFlowLayout.swift`.
- Text: Lato 15 regular (`smallBody`), content_secondary, wraps. Images: 20×20, radius 2, stretched to fill (`scaleToFill`).
- Left-aligned flow: items keep their own width (a long text takes a row and wraps inside it), next item 12 pt
  after a text and 4 pt after an image, rows 4 pt apart, items vertically centered in their row
  (`ContextBlockFlowLayout.swift:22-27,88-145`). The computed height includes 4 pt after the last row (`:166-177`).
- No reference image: `BKContextBlockSnapshotTests/*` render blank (collection view doesn't draw in the snapshot).

### 3.5 image: `BKImageBlockView`

`Blocks/Image/BKImageBlockView.swift`; converter `.../Blocks/ImageBlock+BKBlockConvertible.swift:16-64`; the image
is `SKExpandedAttachment` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/ExpandedAttachment/SKExpandedAttachment.swift`).
- `title` is above the image: Lato 13 regular, content_secondary, 8 pt gap (`BKImageBlockView.swift:27,173-177`).
- Image frame: display width = min(`image_width`, available width), height = width × h/w clamped to [30, 400];
  width capped at 400; aspect-fit when the size is known, aspect-fill otherwise; radius 15 (`.moreRounded`); 1 pt
  border outline_tertiary; background base_secondary (`SKExpandedAttachment.swift:69-97,120-131,156,422-441,542-560,608`).
  Sept lets callers override the border, background, radius, content mode and crop anchor (`BKImageBlockView.swift:144-149,197-210`);
  image blocks keep the defaults.
  The block's stack uses UIStackView's default fill alignment (`BKImageBlockView.swift:49-55`), so the frame may be
  stretched to the full width with the image letterboxed; not confirmed by a full-width snapshot.
- Loading: 32 pt spinner centered; failed: `warning_filled.svg` 30 pt tinted surface_secondary; retryable failure: a pill
  button with `refresh.svg` (`SKExpandedAttachment.swift:74-75,496-503`). Pressed: 60% alpha (`:73,509`). GIFs
  animate unless the accessibility setting blocks it (`ImageBlock+BKBlockConvertible.swift:26`).
- Tap: opens the full-screen file carousel, zooming from the thumbnail (`Modules/Unlayered/Services/BlockKit/Implementation/BlockMediaHandler.swift:151-209,366-390`).
- PNG: `BKImageBlockSnapshotTests/testImageBlock` (72 pt image, "A happy title" above; measured title color `#454447`).

### 3.6 actions: `BKActionsBlockView`

`Blocks/Actions/BKActionsBlockView.swift:19-21,64-98`; converter `.../Blocks/ActionsBlock+BKContainerBlockConvertible.swift:11-48`.
- Every element is full width and they stack vertically, 8 pt apart (recycler default axis is vertical and items
  don't hug horizontally: `Modules/UIInfra/SlackKitFoundations/Implementation/RecyclerView/SKRecyclerViewPresentationObject.swift:20,54`).
- Buttons/workflow buttons → SKButton; `overflow` → a normal button labelled "More Options" (§4.2); selects → outline
  button with caret; date/time pickers → outline button, no icon; checkboxes/radios → full-width option groups.
- No "+ N more" collapsing: all elements render (the model asserts < 26, `:119`). Elements that convert to nothing
  (e.g. a button hidden by `visible_to_user_ids`) are dropped from the row (converter `:18-26`, Sept).
- PNG: `BKActionsBlockSnapshotTests/testActionsBlock` (3 buttons, checkbox group, radio group; old checkbox shape).

### 3.7 input: `BKInputBlockView`

`Blocks/Input/BKInputBlockView.swift`, `BKInputBlockView+PresentationObject.swift`; converter
`.../Blocks/InputBlock+BKContainerBlockConvertible.swift:13-208`.

Layout: vertical stack, 10 pt spacing: label row → element → divider → hint → error (`BKInputBlockView.swift:96-106,139-181`).

| Part | Style | Source |
|---|---|---|
| Label | Lato Bold 17, content_primary; " (optional)" appended in content_tertiary when `optional: true` in modals | `+PresentationObject.swift:135-142`, converter `:57-63,198-207`; string `optional_in_brackets` = " (optional)" |
| Info button (file_input only) | `info.svg`, 20×20 accessory icon button, 4 pt after the label | `+PresentationObject.swift:74-85`, `BKInputBlockView.swift:98,144-148` |
| Divider | 2 device px, outline_tertiary; `#E01E5A` while an error shows. Only under text inputs and select-type rows (not checkboxes, radios, file input) | `BKInputBlockView.swift:99-100,356-367`, `+PresentationObject.swift:155-166`; converter always uses `.underlined` (`:91`) |
| Hint | Lato 13 regular, content_tertiary | `+PresentationObject.swift:148-151`, `BKInputBlockView.swift:101` |
| Error | Lato 13 regular, `#E01E5A`; replaces the hint | `+PresentationObject.swift:144-152`, `BKInputBlockView.swift:103-105` |

Element by type: text inputs → §4.6; selects and pickers → select row (§4.3); checkboxes/radios → option group
(§4.5); `rich_text_input` → row without chevron (§4.7); `file_input` → §4.8.

`dispatch_action` with `on_enter_pressed` appends the hint "Press ‘done’ when you’re finished." to the developer's
hint (adding ". " if it doesn't end in . ? !) (converter `:129-186`; `plain_text_input_done_button_hint`).

In messages, text inputs use the "modal" style: the whole block is one tap target and opens an editor (§5.4)
(`BKInputBlockView.swift:183-198,241-251`; converter `:69-74`).

Measured (`BKInputBlockSnapshotTests/testSelectWithHintAndError`): label cap height 12.3 pt (17 pt), select row
20.67 pt, divider at 77.33 pt from the block top, error text 13 pt.

### 3.8 rich_text: `BKRichTextBlockView`

`Blocks/RichText/BKRichTextBlockView.swift:76-125` (plain style: no border or fill); converter
`.../Blocks/RichTextBlock+BKContainerBlockConvertible.swift:13-52`. One label; base Lato 17 regular,
content_primary (the text options' `baseTextColor`, `:27-32`; June `sk_primary_foreground`). Sept adds an optional
whole-block tap (`tapEventId`, with an accessibility action, `BKRichTextBlockView.swift:110-123`); Block Kit JSON
doesn't set it. Rendering is in `Modules/UIInfra/SlackKit/Implementation/Extensions/Text+Display.swift`,
paragraph metrics in `Modules/UIInfra/TextDisplay/Implementation/RichTextTheming.swift`.

| Element | iOS rendering | Source |
|---|---|---|
| Paragraphs / sections | separated by a line break, no extra spacing | `Text+Display.swift:90-129` |
| bold / italic / strike / underline | Lato Bold / Italic / strikethrough / underline in text color | `Modules/Data/TextModels/Implementation/TextAttributes.swift:31-69`, `Text+Display.swift:1592-1594` |
| inline `code` | Menlo 16 (body size − 1), `message_rendering_code` (`#E01E5A` / `#E8912D`), rounded box per line: 1 pt stroke outline_tertiary, fill surface_primary, radius 3 | `Text+Display.swift:775-786,1743-1749`; `SKFont.swift:322,344-347`; `.../Label/Layout/LayoutManager.swift:19,159`; `LayoutManagerRoundedRectanglePlugin.swift:15` |
| bullet list | glyphs by indent: `•`, `◦`, `▪` (cycling); bullet at x = indent×29, text at bullet + 28 (tab stop) | `RichTextTheming.swift:72-81`; `Modules/Data/TextModels/Implementation/BulletedListPrefixGenerator.swift:11-24` |
| ordered list | `1.` / `a.` / `i.` by indent (cycling, lowercase), then tab | `.../TextModels/Implementation/OrderedListPrefixGenerator.swift:12-25`, `TextListPrefixAlphabeticGenerator.swift`, `TextListPrefixRomanNumeralGenerator.swift` |
| quote | text indented 15; bar 4 pt wide, radius 2, outline_tertiary, from 2 pt below the first line top to the last line (height − 2); a second level draws its bar at x = 15 | `RichTextTheming.swift:22,28-37,106-118`; `LayoutManager.swift:17,98-129`; `Text+Display.swift:315,325` |
| preformatted | Menlo 16, content_primary (June sk_primary_foreground); full-width box, 1 pt stroke `message_rendering_code_block_stroke`, fill `message_rendering_code_block_fill`, radius 3; text inset 10 left/right; 2 pt paragraph spacing before/after | `Text+Display.swift:131-163,1766-1773`; `RichTextTheming.swift:23,47-56` |
| preformatted, rich variant (flag `richCodeBlockRendering`) | 12 pt indent, line numbers in content_secondary, optional language label in content_tertiary (June sk_foreground_max_solid / sk_foreground_high_solid; the language is kept as an attribute), copy button → toast "Copied", 1.15 line height | `Text+DisplayCodeBlock.swift:22-29,86-223` |
| link | content_highlight_1; underline only if the user's underline-links setting is on | `Text+Display.swift:740-771` |
| user mention | text `message_rendering_mention_text`; pill fill surface_highlight_1, radius 3. Mention of you: fill surface_highlight_3, text `#0B4C8C` / content_highlight_3. Hidden user: content_secondary with `user_hide.svg` | `Text+Display.swift:431-466,1775-1782`; `Text+HighlightColors.swift:12-24` |
| channel mention | same pill as a user mention; unresolvable/disabled: content_secondary, gray pill | `Text+Display.swift:526-559` |
| usergroup | pill; "you" style when it includes you; unavailable: content_secondary (June sk_foreground_max_solid) | `Text+Display.swift:591-620` |
| broadcast (`@here` etc.) | "you" style (surface_highlight_3 fill) | `Text+Display.swift:621-639` |
| date | text formatted from the token (below), body style; Sept keeps the date as a model attribute | `Text+Display.swift:788-795` |
| emoji | inline at text size; ×2 when the message is emoji-only (messages enable jumbomoji) | `Text+Display.swift:46,87-119`; `Modules/Features/MessageTranscript/Implementation/Pipeline/State/MessageTransformationMapper.swift:177` |
| color | "#RRGGBB " followed by a color swatch | `Text+Display.swift:797-816` |

Date tokens (`Modules/Data/I18n/Implementation/DateFormattingUtilities.swift:36,56-66`): `date_num` 2015-01-26,
`date` / `date_long_full` "February 26th, 2015", `date_long` "Thursday, February 26th, 2015", `date_short`
"Feb 26, 2015", `*_pretty` variants say Today / Yesterday, `time` "2:34 PM" (no-break space before AM/PM),
`time_secs` "2:34:56 PM", `zone` "PST", `ago` "4 hours ago".

No truncation in messages, modals or App Home (`contentFolding .unsupported(numberOfLines: 0)`:
`BlocksConverterUtility.swift:79,135`; message styling passes nil, `MessageViewPresentationObjectFactory.swift:60`).
Where folding is on (attachments, §9), SKLabel appends a "Show more" / "Show less" text button: Lato Bold 13,
content_highlight_1, unpadded (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/Label/SKLabel.swift:1041-1058`).

PNGs (`~/slack-objc-main/Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKLabelSnapshotTests/`):
`testMentionText` (user, self and channel pills, light+dark), `testCodeText` (inline code), `testPreRenderedText`
(code block), `testQuoteText`, `testListText`, `testQuotedListText`, `testBroadcastText`, `testChannelText`,
`testJumboEmoji_onlyEmojis`. Measured from them: quote bar 4 pt, text starts 16.7 pt (15 + glyph bearing), code-block
text starts 11 pt, code-block stroke `#1D1C1D@13%`, fill `#1D1C1D@4%`.
Note `BKRichTextBlockSnapshotTests/*` show the bordered/tinted rich-text styles other features use, not the Block
Kit block.

### 3.9 markdown

Not a block type on iOS (`BlockType.swift:6-45`): a raw `markdown` block decodes to `.unknown` and draws the
fallback banner (§3.20, `BKBlockPresentationService.swift:660-662`; Sept: `layout` blocks too). Slack expands markdown blocks into rich_text /
header / divider / table blocks (web clone `docs/block-kit.md`, cross-check only); render those.

### 3.10 video: `BKVideoBlockView`

`Blocks/Video/BKVideoBlockView.swift:21-212`, `BKVideoBlockView+PresentationObject.swift:31-120`; converter
`.../Blocks/VideoBlock+BKBlockConvertible.swift:14-65`. Vertical stack, 4 pt spacing:
1. Provider row (4 pt spacing): provider icon 20×20 radius 2; "Provider | Author" (or whichever exists) Lato Bold 17.
2. `title`: Lato 17 regular; a link (content_highlight_1) when `title_url` is set (converter `:28`).
3. Thumbnail: fixed 295×166 (not responsive), radius 8, bg base_primary; badge at 4/4 from bottom-left: pill with
   `play_filled.svg` + "Video" (Lato Bold 13, white) on `#1D1C1D@70%`, insets 4/4/4/8 (`BKVideoBlockView.swift:22,123,133-167`).
4. `description`: Lato 13 regular, content_secondary.
Tap on the thumbnail opens the file carousel player (`BlockMediaHandler.swift:170-199`). PNG:
`BKVideoBlockSnapshotTests/testVideoBlock`.

### 3.11 file: `BKFileBlockView`

`Blocks/File/BKFileBlockView.swift`; converter `.../Blocks/FileBlock+BKBlockConvertible.swift:30-335`; card is
`SKCompactAttachment` (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/CompactAttachment/SKCompactAttachment.swift`).
- Card: 12 pt padding, radius 15, 1 pt border outline_tertiary, bg base_primary, pressed 60% alpha (`SKCompactAttachment.swift:71-92,119-120`).
- 36×36 ornament (file-type icon or image thumbnail) + 8 pt + title (Lato Bold 15, content_primary, 1 line) over
  subtitle (Lato 13, content_tertiary, 1 line), 2 pt apart (`:76-82,578-632`; `Modules/UIInfra/SlackKit/Implementation/Helpers/AttachmentOrnament/AttachmentOrnament.swift:25`).
- Subtitle: "1MB PDF" (size + type), canvases "Last edited %@ ago", surfaces their type (converter `:271-299`).
- No access: `warning.svg` in content_secondary, title "This file isn’t visible to you", subtitle "This file is only
  visible to members of the conversation where it was originally shared." (converter `:56-60`; `BKFileBlockView.swift:190-208`).
- Behind `ios_file_block_expanded_preview` (default off, `Modules/Data/Toggles/Definitions/ios_file_block_expanded_preview.json`)
  a file block with a preview draws as an image block, a video block or an expanded file card instead
  (`BKBlockPresentationService.swift:452-468`; converter `:84-335`). An embedded `file` without a title falls back to
  the client-resolved file (`:39-50`).
- Tap opens the file (carousel) (`BlockMediaHandler.swift:210-249`). PNGs: `BKFileBlockSnapshotTests/test_fileState_pdf_allInfo`,
  `test_imageState_png_allInfo`, `test_errorState` (measured title 15 pt, subtitle `#5E5D60`).

### 3.12 table: `BKTableBlockView`

`Blocks/Table/BKTableBlockView.swift`, `Table/Views/BKTableBlockCell.swift`, `Table/Views/BKTableBlockGrid.swift`,
`Table/Layout/BKTableBlockCollectionViewLayout.swift`; converter `.../Blocks/TableBlock+BKBlockConvertible.swift:15-58`.
- Cells: Lato 17 (first row forced bold), padding 8/12/8/12, column `align` respected (`BKTableBlockCell.swift:24`; converter `:24-27,47-55`).
- Column width = widest cell (cells measured at max 260), min 40; row height = tallest cell; 1 pt grid lines and a
  1 pt outer border in outline_tertiary with radius 8 (`BKTableBlockCollectionViewLayout.swift:28-30,40-111`; `BKTableBlockGrid.swift:19-23,42-45`).
- Wider than the block: scrolls horizontally with an indicator (`BKTableBlockView.swift:101`).
- Shows at most 8 rows (header + 7); if longer, a 50 pt fade from transparent to base_primary covers the bottom
  (`BKTableBlockView+PresentationObject.swift:17`; `BKTableBlockView.swift:48,124,148-151,209-214`).
- 2 pt margin above and below (`:43-44`). Tapping a cell in a message opens the full-screen table preview
  (`Modules/Features/Handlers/MessageActionHandler/Implementation/Handlers/MessagesBlockActionHandler.swift:129-133,312-342`).
- PNGs: `BKTableBlockSnapshotTests/testTableBlockTruncated`, `testTableBlockNotTruncated`.

### 3.13 card: `BKCardBlockView`

`Blocks/Card/BKCardBlockView.swift:33-42,95-239,399-444`; converter `.../Blocks/CardBlock+BKBlockConvertible.swift:17-122`.
- Container: radius 12, border 2 device px outline_tertiary, bg base_primary, clips.
- `hero_image`: inset 12 on top/left/right, 4:3 (height = width × 0.75), radius 8, aspect-fill (`:40-41,150-157,214`).
- Header (SKGenericEntity medium): 36×36 icon (image radius 6, or a `slack_icon` in an ornament box tinted
  content_tertiary; June sk_foreground_high_solid), 12 pt gap, `title` Lato Black 17 (≤ 2 lines, content_primary; June
  sk_primary_foreground), `subtitle` Lato 17 regular content_tertiary (≤ 2 lines): Sept passes it as a styled label whose
  attributes win over the entity's Lato 13 (June: a plain string in the entity's Lato 13 content_secondary) (`:436-446`;
  converter `:40-66`;
  `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityOrnamentView.swift:396-426`, `SKEntityContentView.swift:59-61`).
- `body` Lato 17 (≤ 30 lines); `subtext` Lato 13 content_tertiary (≤ 5 lines); content padding 12, 12 pt between parts.
- `actions`: full-width buttons stacked 8 pt apart, 12 pt below the content, 12 pt from the bottom (`:36-39,132-134,165-180`).
- PNGs: `BKCardBlockSnapshotTests/test_fullCard_withoutHeroImage`, `test_fullCard_withHeroImage`, `test_disabled`.
  The snapshot fixtures don't style the title or subtitle, so they show the entity's defaults (regular title,
  Lato 13 subtitle).

### 3.14 carousel: `BKCarouselBlockView`

`Blocks/Carousel/BKCarouselBlockView.swift:15-25,83-148,181-192`; converter `.../Blocks/CarouselBlock+BKBlockConvertible.swift:11-24`.
Horizontal pager of cards (§3.13): card width = min(container − 16 − 40 − 12, 320) (320 on a 393 pt phone), all
cards as tall as the tallest, 16 pt leading/trailing inset, 12 pt between cards, snaps one card at a time
(`.groupPaging`), no scroll indicator. Measured (`test_cardsWithActions`): card x 16–336 pt, next card at 348 pt.

### 3.15 container: `BKContainerBlockView`

`Blocks/Container/BKContainerBlockView.swift:42-49,84-128,417-439`; converter `BKBlockPresentationService.swift:494-570`.
Box radius 12, 1 pt border outline_tertiary, bg base_primary, 12 pt padding, children 8 pt apart. Header: optional
36 pt icon, 12 pt gap, `title` Lato Bold 17 content_primary (1 line; June sk_primary_foreground), or `rich_text_title`
with those as fallback attributes (Sept), `subtitle` Lato 13 content_secondary (1 line), 8 pt above the body. Sept:
`has_header_divider` draws a 1 pt outline_tertiary line across the whole box (through the padding) 8 pt below the
header, the body 8 pt below it, while expanded (`BKContainerBlockView.swift:47-50,115-119,141-145,207-216`); collapsible containers show a 20 pt caret (`caret_down_full.svg` collapsed / `caret_up_full.svg` expanded) and
toggle on header tap; `default_collapsed` sets the start state, later taps are remembered. PNGs:
`BKContainerBlockViewSnapshotTests/testCollapsibleCollapsed`, `testCollapsibleExpanded`.

### 3.16 alert: `BKAlertBlockView`

`Blocks/Alert/BKAlertBlockView.swift:17-21,63-83`; converter `.../Blocks/AlertBlock+BKBlockConvertible.swift:14-57`.
Box radius 12, padding 12 top/bottom and 16 left/right, 20 pt icon, 12 pt to the text (Lato 17, content_primary).

| `level` | Background | Icon, tint |
|---|---|---|
| default | base_tertiary | `slack_logo.svg`, content_secondary |
| info | base_highlight_1 | `info.svg`, content_highlight_1 |
| success | base_highlight_2 | `check_circle.svg`, content_highlight_2 |
| warning | base_highlight_3 | `warning.svg`, content_highlight_3 |
| error | base_important | `warning.svg`, content_important |

PNGs: `BKAlertBlockSnapshotTests/testInfoLevel`, `testErrorLevel`, `testLongText`.

### 3.17 plan and task_card: `BKPlanBlockView`, `BKTaskBlockView`

`Blocks/Plan/BKPlanBlockView.swift:27-30,144-195`, `Plan/Views/BKPlanTaskView.swift:24-26,103-136`,
`Blocks/Task/BKTaskBlockView.swift:27-30,144-187`, `Task/Views/BKTaskHeaderView.swift:30-35,187-215`,
`BKTaskItemView.swift:27-32`, `BKTaskOrnamentView.swift:20-22,96-153`, `BKTaskPipeView.swift:14-17`,
`BKTaskContainerView.swift:20-34`; converters `.../Blocks/PlanBlock+BKContainerBlockConvertible.swift:24-48,90-92`,
`TaskBlock+BKBlockConvertible.swift:15-60,99-101`.
- Card (Sept): no border (June: 2 device px outline_tertiary); radius 12 continuous, clipped, bg base_primary, pressed
  base_secondary (0.15 s) only when it can expand; **8 pt** padding (June 12); rows 12 pt apart. The whole card takes
  the tap (`BKTaskContainerView.swift:20-34,49-81`; `BKPlanBlockView.swift:27-30,134-142`).
- Header (`BKTaskHeaderView.swift:30-35,51-75,187-215,243-269,290-324`): 20 pt status ornament, 8 pt, the title in
  **Lato Regular 17 content_secondary** in every state (`titleFont` default `.body()`; June Lato Bold 17, aubergine
  while loading, else content_primary); while loading it shimmers (`BKShimmeringLabel.swift:17-25,44-78`: a mask sweeps
  a band down to 15 % across in 1.4 s, ease-in-out, forever; none with Reduce Motion); a 20 pt `caret_down.svg` /
  `caret_up.svg` in content_secondary when it can toggle (expanded blocks are `.expanded(isCollapsible: true)`).
  Header ornament: loading → 18 pt spinner (content_secondary arc on surface_primary), complete →
  `check_circle_filled.svg`, error → `warning_filled.svg`.
- Ornaments (`BKTaskOrnamentView.swift:20-22,96-153,160-181`), 20 pt boxes, all **content_secondary** (June
  content_primary / aubergine) except errors in `#E01E5A`: pending `hourglass.svg`, in progress `ai_sparkle_filled.svg`,
  complete the 8 pt `icon_placeholder_filled.svg` dot (June `check_small_bold`), error `warning.svg`.
- A plan task is one item (`BKPlanTaskView.swift:103-136,196-209`): its ornament, then the title (Lato Bold 17
  content_primary), details, output and sources, 8 pt apart; a task_card's body is one item without an ornament
  (`BKTaskView.swift:93-117`) (June: details and output were separate items, the output after a dot). Items
  (`BKTaskItemView.swift:27-32,53-80,142-192`): a 20 pt ornament column with the **2 pt** pipe (June 4 pt;
  `BKTaskPipeView.swift:14-17,49-59`, outline_tertiary, round ends) 8 pt below the ornament, shown when there's no
  ornament or the item is taller than 32 pt.
- Details/output: Lato 17 content_primary; sources: links in Lato 17 with the source's text
  (`.../Blocks/TaskBlock+BKBlockConvertible.swift:124-140`; the 🔗 in the PNGs is the fixtures' text). `hide_title` is parsed but
  only the bottom sheet reads it. Every label is pixel-rounded: the plan in `testExpandedState_tasksWithOutput` is
  216.67 pt tall.
- Behind `ios_tasks_in_bottom_sheet` (default off) a tap opens the tasks in a bottom sheet (`BlockTaskList`,
  `BKCollapsibleTaskView.swift`, 12 pt padding) instead of expanding (`TaskBlock+BKBlockConvertible.swift:50-57`).
- PNGs (Sept): `BKPlanBlockSnapshotTests/testAllStates_expanded`, `testExpandedState_tasksWithOutput`,
  `testCollapsedState_allComplete`, `BKTaskBlockSnapshotTests/testExpandedState_withOutputAndSources`,
  `testExpandedState_withDetailsAndOutput`, `testCollapsedState_complete`.

### 3.18 context_actions: feedback_buttons, icon_button

`Blocks/ContextActions/BKContextActionsBlockView.swift:62-128` (horizontal row, items hug), `Elements/IconButton/BKIconButtonView.swift`,
`Elements/FeedbackButtons/BKFeedbackButtonsView.swift:119-130`. Icon buttons are 40×40 targets with 20 pt icons
(`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/IconButton/SKIconButton.swift:428-448`); feedback buttons
are two of them: `thumbs_up.svg`/`thumbs_up_filled.svg` and `thumbs_down.svg`/`thumbs_down_filled.svg`
(`.../Elements/FeedbackButtonsBlockElement+BKBlockConvertible.swift:60-75`). Elements with `visible_to_user_ids` that
exclude you are dropped; a block with nothing left isn't drawn (`BKBlockPresentationService.swift:339-351`).

### 3.19 Slack-internal blocks (summary)

Rendered by their own views; spec them separately if a prototype needs them: `call` (`Blocks/Call/BKCallBlockView.swift`),
`event` (`Blocks/Event/BKEventBlockView.swift`), `contact_card`, `share_shortcut`, `share_skill` (Sept: the deprecated
skill block, `Blocks/DeprecatedSkill/*`), `share_prompt`, `timeline`, `salesforce_record_card`, `callout` (canvas),
`mcp_app`, `data_table` (`Blocks/DataTable/*`; Sept: tapping one in an App Home or modal opens a data-table list,
`ModernAppViewInteractor.swift:204-207,241-295`), `data_visualization`, work-object cards (`Blocks/WorkObject/*`), and
new in Sept `ask_user_question` (`Blocks/Question/*`: an agent's question with options, a custom response through the
single-line editor, §5.4, and a summary) and `page` (`Blocks/Page/BKPageBlockView.swift`). `agent_permissions_card` is
gone. `channel_section` shows text (`BKBlockPresentationService.swift:428-443`); `canvas_table`, and canvas callouts
that can't draw, show a tappable "Open in canvas" card (`BKCanvasFallbackView`, `:622-624,742-765`).

### 3.20 unknown block and the internal loading block

- Unknown or disabled types: `BKFallbackBlockView` (`Blocks/Fallback/BKFallbackBlockView.swift:30,90-158`): an
  SKBanner, regular size: bg base_tertiary, 1 pt border outline_secondary, radius 12, padding 16 left/right and 12
  top/bottom, 20 pt `laptop.svg` in content_secondary, 12 pt gap; heading "Not available on mobile yet" (Lato Bold 17)
  over "Open Slack desktop to view" (Lato 17), content_primary (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Banner/SKBanner.swift:112-162,210-211,290-291`;
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Banner/Banner.swift:46`; strings `mcp_app_block_fallback_title`, `mcp_app_block_fallback_subtitle_generic`). The view
  pads 8 above and below and ignores the row's side insets. PNG: `BKFallbackBlockSnapshotTests/test_unknown`.
  An unknown block that carries `fallback` blocks draws those instead (Sept, §0).
- `loading` (modals only): 24 pt spinner (`Blocks/Internal/BKLoadingBlockView.swift:71-75`; `BKBlockPresentationService.swift:117-124,472-474`).

---

## 4. Elements

### 4.1 button and workflow_button

Converters `.../Elements/ButtonBlockElement+BKBlockConvertible.swift:16-86`, `WorkflowButtonBlockElement+BKBlockConvertible.swift:14-61`;
view `BKButtonView` (§2).
- Style mapping in §2; no icon.
- `visible_to_user_ids` not containing you: not drawn (`BKBlockElementConverter.swift:51-54,182-196`; Sept: icon
  buttons and checkboxes too, `:70-72,81-90`).
- Tap: `confirm` dialog first if present (§4.10); then, if `url` is set, the URL is opened through the app's URL
  handler and block_actions is still sent (`Modules/Data/BlockKitDataModels/Implementation/Interaction/Interactables/ButtonBlockElement+BlockInteractable.swift:16-32`;
  `Modules/Integration/BlockKitInteraction/Implementation/BlockInteractionCoordinator.swift:128-129,151-162`).
- While the request is in flight the tapped button shows the spinner and every other button in the same block is
  disabled (inactive style) (§6).
- workflow_button: same look; tap triggers the workflow; supports `accessibility_label`.

### 4.2 overflow

`.../Elements/OverflowBlockElement+BKBlockConvertible.swift:17-73`. Not a "⋯" icon: an outline text button
labelled "More" in a section (inline, right of the text) and "More Options" elsewhere (full width) (`:67-71`; strings
`more`, `more_options`). Tap opens a bottom sheet listing the options (title "Choose an option…", §5.1). Option
descriptions and URLs aren't shown.

### 4.3 selects: static, external, users, conversations, channels (and multi_*)

Converters `.../Elements/StaticSelectBlockElement+BKBlockConvertible.swift:18-157`, `DynamicSelectBlockElement+BKBlockConvertible.swift:17-194`.

Label shown (`Static…:111-156`, `Dynamic…:108-180`):
- single: the selected option's text; users → the user's name; channels/conversations → "#name" (or the DM name);
- multi: "%d selected" (`n_selected`), never tokens (the token view is only used by Salesforce forms);
- nothing selected: `placeholder`, else "Pick an option" (single) / "Pick your options" (multi).

Appearance:
- Section accessory and actions: full-width outline SKButton, `caret_down.svg` on the right (`BKButtonView.swift:125-140,180`).
  The placeholder isn't dimmed in button form.
- Input block: `BKInputSelectView` (`Elements/InputBlockSelect/BKInputSelectView.swift:27-128,142-162`): label Lato 17
  (value content_primary, placeholder content_secondary), 20 pt `caret_right_full.svg` in content_primary at the
  right, 16 pt gap, no vertical padding (height = label line), underline divider from the input block. Pressed: 40%
  alpha, 0.15 s (`Modules/UIInfra/SlackUI/Implementation/LegacyWidgets/ContainerControl.swift:28-31,112-114`);
  disabled: 70% alpha.
- After a pick in a message, the button immediately shows the chosen option (stored title) until the message
  updates (`Modules/Unlayered/Services/BlockKit/Implementation/BlockActionsHandler.swift:1829-1850`; `BKBlockElementConverter.swift:222-238`).
- Tap opens a picker (§5.1, §5.2).

### 4.4 datepicker, timepicker, datetimepicker

Converters `.../Elements/DatePickerBlockElement+BKBlockConvertible.swift:20-143`, `TimePickerBlockElement+BKBlockConvertible.swift:60-145`,
`DateTimePickerBlockElement+BKBlockConvertible.swift:55-139`.

| Element | Label when set | Placeholder default | Section placement | Input row icon |
|---|---|---|---|---|
| datepicker | short date, locale format, Gregorian calendar (Sept) (en-US "2/2/22") | "Select" (`picker_select`) | inline, right of text | none |
| timepicker | short time "11:37 PM"; with `timezone` "11:37 PM (PDT)" (`time_and_timezone` "%@ (%@)") | "Select" | full-width button below | none |
| datetimepicker | medium date + short time, then "(PDT)" with no space | "Select date & time (PDT)" (`date_time_picker_placeholder`) | full-width button below | legacy font glyph `.calendar` (use `calendar.svg`) |

Sources: `DatePicker…:87,115-142`, `TimePicker…:120-145`, `DateTimePicker…:84,104-138`,
`Modules/Data/BlockKitDataModels/Implementation/BlockElements/TimePickerBlockElement.swift:37-45`. Tap opens the
date/time sheet (§5.3).

### 4.5 checkboxes and radio_buttons

Views `Elements/CheckboxOption/BKCheckboxOptionView.swift`, `Elements/CheckboxGroup/BKCheckboxGroupView.swift`,
`Elements/RadioButtonOption/BKRadioButtonOptionView.swift`, `Elements/RadioButtonGroup/BKRadioButtonGroupView.swift`;
controls `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Checkbox/SKCheckbox.swift`,
`.../RadioButton/SKRadioButton.swift`.

Option row (`BKCheckboxOptionView.swift:60-87,155-208`; `Helpers/Utils.swift:61-72`): text column (option text Lato 17
content_primary; `description` Lato 13 content_secondary, 2 pt below) + control on the right, 12 pt gap, control
vertically centered; 8 pt padding above and below each option; options stack with no extra gap; the row dims to 60%
while pressed; the whole row is the tap target; a disabled option ignores taps (Sept, `:192-193`). Radio options
can put the control first (`checkboxAlignment`, default trailing, `Models/BKOptionPresentation.swift:8-34`).

| Control | Look | Source |
|---|---|---|
| Checkbox | 21 pt circle, clear inside (Sept: no opaque base_primary background), 1.5 pt border outline_primary (2.5 while pressed). Checked: filled content_highlight_1 with a 14 pt `check_filled.svg` in content_inverse_primary, rotated −4°. Disabled: border outline_tertiary@13%, fill base_tertiary, check content_inverse_secondary. Toggle: 0.25 s spring (damping 1), fill grows from the center; light haptic | `SKCheckbox.swift:23-51,126-149,209-279` |
| Radio | 20 pt circle, 2 pt border: outline_highlight_1 when on, outline_primary when off; 10 pt dot (inset 5) content_highlight_1; bg base_primary. Disabled: border outline_tertiary, bg base_tertiary, dot outline_tertiary. 0.25 s spring | `SKRadioButton.swift:20-44` |

Behavior: checkboxes toggle locally at once and send block_actions (debounced) when dispatchable; radios select
optimistically and ignore taps on the selected option (`BKRadioButtonGroupView.swift:106-121`;
`.../Interactables/CheckboxGroupBlockElement+BlockInteractable.swift:25-47`). PNGs:
`BKCheckboxOptionSnapshotTests/testSelectedOptionWithSecondaryText` (current circle checkbox),
`BKRadioButtonGroupSnapshotTests/testGroupWithOptionsSelected`, `MKBlockContentSnapshotTests/testBlockContentTextDividerAndSection`.

### 4.6 plain_text_input, number_input, email_text_input, url_text_input (and password)

View `Elements/TextInput/BKSimpleTextInputView.swift`, `BKSimpleTextInputView+PresentationObject.swift:116-216`;
text field `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TextField/SKTextField.swift`; entities
`.../Entities/TextInput/SingleLine/SKSingleLineTextInputEntity.swift`, `.../MultiLine/SKMultiLineTextInputEntity.swift`.
- Inline (modals, App Home): borderless, no padding, Lato 17; text content_primary (disabled content_tertiary);
  placeholder content_tertiary (`SKTextField.swift:45,53,917-920`; `SKSingleLineTextInputEntity.swift:82-99,106`).
  Single-line height measured 22 pt (`BKInputBlockSnapshotTests/testTextInput_plainStyle`).
- Clear button while editing non-empty text: `close_circle_filled.svg` in content_tertiary (pressed @75 %; June
  content_primary@30 %, pressed @15 %), 24 pt reserved on the right (`SKTextField.swift:47,628-640,917-918`; `Modules/UIInfra/SlackKit/Implementation/Helpers/ClearButton/ClearButton.swift:95`).
- Keyboard: return key "Done"; plain text sentence case; number `numbersAndPunctuation` (input filtered to digits,
  one leading "-", one "." if decimals allowed); email and URL keyboards (`+PresentationObject.swift:125-176`;
  `Modules/Data/BlockKitInputValidator/Implementation/BlockKitInputValidator.swift:42-70`).
- Multiline: grows with its content (no inner scrolling), keyboard accessory bar with a "Done" button
  (`+PresentationObject.swift:186-216`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/TextInput/MultiLine/MultiLineTextInputSizer.swift:11-30`).
- Default placeholders: "Write something", "Enter a number", "Enter an email", "Enter a URL", "Password"
  (`write_something`, `enter_a_number`, `enter_an_email`, `enter_a_url`, `password`).
- Messages: shows the value/placeholder and opens the editor on tap (§5.4).
- Sept keeps the entered value (`currentValue`) apart from `initial_value`; applying a state with no value clears it
  (`Modules/Data/BlockKitDataModels/Implementation/BlockElements/PlainTextInputBlockElement.swift:18-32,145-150`).
- `dispatch_action`: `on_character_entered` sends debounced actions per keystroke; `on_enter_pressed` sends on "Done"
  (`.../Interactables/PlainTextInputBlockElement+BlockInteractable.swift`).
- Validation runs on blur and on "Done", so errors (including "This field is required.") appear right under the
  field (§6). No character counter and no `focus_on_load` (not found in `Modules/UIInfra/BlockKitComponents`,
  `Modules/Unlayered/Services/BlockKitPresentation`, `Modules/Features/AppView`, `Modules/Integration/BlockKitInteraction`).

### 4.7 rich_text_input

`.../Elements/RichTextInputBlockElement+BKBlockConvertible.swift:20-78`: a select-style row (§4.3) without the chevron
showing the current text or the placeholder ("Write something"); tap opens the rich-text editor (§5.4).

### 4.8 file_input

`Elements/FileUpload/BKFileUploadView.swift:18,227-242`: outline SKButton "Upload File" with `file.svg` on the left,
then an attachment carousel of picked files (8 pt spacing). The label row's info button shows an alert "The people who
can edit this automation will also have access to any files shared here." with "Okay"
(`BlockInteractionCoordinator.swift:330-340`). Admin-disabled: "Your admins have turned off file uploads, so you can’t
use this feature." (`error_bk_file_uploads_disabled`). PNGs: `BKFileUploadSnapshotTests/testEmpty`, `testKitchenSink`.

### 4.9 image element

Context: 20×20, radius 2 (§3.4). Section accessory: 68×68 thumbnail (§3.1). Converted at `BKBlockElementConverter.swift:59-64`.

### 4.10 confirm objects

`Modules/Integration/BlockKitInteraction/Implementation/BlockConfirmationPresenter.swift:29-75` (legacy path:
`BlockActionsHandler.swift:1862-1904`). A system alert (`SKAlertController` subclasses `UIAlertController`,
`.../DesignerComponents/AlertController/SKAlertController.swift:24`), style `.alert`: title = `confirm.title`,
message = `confirm.text`, buttons: `confirm` text or "OK" (default style, preferred so bold), `deny` text or "Cancel"
(cancel style). `style: danger|primary` isn't used (not found in either presenter). Deny aborts the action.

---

## 5. Pickers and editors that taps open

### 5.1 Option picker (static and external selects, overflow)

`Modules/Integration/BlockKitInteraction/Implementation/BlockPresentationRouter.swift:187-391`; UI
`Modules/Features/OptionPicker/Implementation/`.
- Static single select with ≤ 5 options: bottom sheet sized to its content (SKBottomSheet; with `bottomsheetMigration`
  a native sheet whose detent follows the list's published height, Sept), no search, not wrapped in a navigation
  controller (the title is set on `navigationItem`, `OptionPickerViewController.swift:101`; whether it shows in the
  sheet wasn't verified); tap selects and dismisses (`:245-293,360-371`; `OptionPickerFeature.swift:61-70`). More
  options, or multi: full-screen modal in a navigation controller.
- Nav: title "Select Option" / "Select Options"; left "Cancel"; right "Done" only for multi (`:269,283,317,333,722-735`).
- Search: below it a 1 px outline_tertiary separator (Sept; June sk_primary_foreground @25 %,
  `OptionPickerViewController.swift:142-148`); search field for single select, tokenized search for multi; external selects always search and respect
  `min_query_length` (`:259,325,332`).
- Rows: SKGenericEntity small, option text Lato 17; no description line; multi-select rows have a trailing checkbox;
  `option_groups` become section headers (`OptionPickerPresenter.swift:147-186`;
  `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityContentView.swift:360-365`).
- Empty/error states (`OptionPickerPresenter.swift:91-116`): "Start typing to see results.", "No option found",
  "No option matches these keywords." + "Clear search", "You have reached the maximum number of selections",
  "There was a problem loading options".
- Overflow: bottom sheet "Choose an option…", no search (`:187-215`).

### 5.2 People and channel picker (users / conversations / channels selects)

`BlockPresentationRouter.swift:394-462`: full-screen modal, small cells, search (tokenized for multi), title
"Select User(s)" / "Select Channel(s)" / "Select Conversation(s)", left "Cancel", right "Done" for multi; single
select dismisses on pick. `filter` and default-to-current-conversation are applied (`:613-720`).

### 5.3 Date / time sheet

`Modules/Features/DateTimePicker/Implementation/DateTimePickerViewController.swift:42-44,187-302`,
`DateTimePickerPresenter.swift:26-33`, `DateTimePickerInteractor.swift:160-172`, router `:150-182`.
Sept: a native sheet with one self-sized detent and the grabber on iPhone, a popover on iPad, whatever the
`bottomsheetMigration` flag (`DateTimePickerFeature.swift:52-63`; June: SKBottomSheet unless the flag was on); the content
sizes the sheet bottom-up (`:113-122,235-259`) and the date is clamped to the min/max (`:268-277`). Header row = "Select
a date" / "Select a time" / "Select a date and time" (Lato Bold 15) on the left, "Done" (Lato Bold 17, content_highlight_1) on the right; margins 20/16/12/16, 12 pt
spacing; system `UIDatePicker`, inline calendar for date and date+time, wheels for time, tinted content_highlight_1;
an outline "Clear" button (clears the value); secondary text Lato 13 content_secondary (June sk_foreground_max_solid).
Selection is applied on Done. PNG: `Modules/Features/DateTimePicker/Snapshots/iOS_26/DateTimePickerFeatureTests.DateTimePickerSnapshotTests/testScreenshotDate@3x.png`
(fr-FR locale): stale, its tests are commented out, so it still shows the legacy sheet (48 × 4 grabber, full width);
use it for the calendar only.

### 5.4 Text editor (text inputs in messages; rich_text_input everywhere)

`Modules/Unlayered/Services/BlockKit/Implementation/BlockTextInputPresenter.swift:50-287`: single-line inputs open
`SinglelineTextInputFeature` (title = the input label, current text, placeholder, min/max length or the number range);
multiline and rich_text_input open `RichTextInputFeature`. Changes and "Done" send the block actions; Sept adds a
`.cancelled` event and the question block's custom response uses the same single-line editor. Both editors are
presented over the current context with a cross-dissolve on a black 40 % dim, and the field becomes first responder
in `viewWillAppear`, so the keyboard comes up with them:
- Single-line (`Modules/Features/SinglelineTextInput/Implementation/`): a card on top of the keyboard, full width, top
  corners 8, base_primary, 16 pt margins (`KeyboardAttachedTextInputModal.swift:25-32,68-104`); the label (Lato Bold 17),
  the field (Lato 17, 21 pt tall, no border, return key Done, disabled while there's an error), the error (Lato 15
  `sk_raspberry_red`, its line kept when there's none), 8 pt apart and 20 pt after the error, then "Cancel" and "Done"
  at the two ends (SKTappableLabel Lato Bold 17 content_highlight_1, 60 % pressed; June `sk_highlight`)
  (`SinglelineTextInputViewController.swift:20-36,61-143,171-196`). The text is checked as you type (length, number
  range, email, URL: `SinglelineTextInputInteractor.swift:27-47`); Done with an error cancels (`:65-71`).
- Multiline and rich text (`Modules/Features/RichTextInput/Implementation/RichTextInputViewController.swift:49-72,106-238,
  366-370`): on iOS 26 a Liquid Glass card (`UIGlassEffect(.regular)`, radius 24) 16 pt from the sides and 12 above
  the keyboard (base_primary, top corners 8, full width before iOS 26), 16 pt margins: the label, the growing text, the
  error (12 after it, hidden when none), the formatting toolbar for rich_text_input (a clear SKTextToolbar: emoji,
  mention | bold, italic, strikethrough, code, code block, link, bulleted / numbered list, indent, outdent, quote;
  `RichTextInputToolbarConfig.swift:21-26`; none for plain multiline), 16 pt, Cancel / Done. A tap outside the card is
  Done (`:272-275,320-331,360-362`).

### 5.5 Media viewer

Image, video and file taps open the file carousel with a zoom transition (`BlockMediaHandler.swift:43-390`); table
taps in messages open the table preview (§3.12).

---

## 6. Interaction feedback, state, validation, errors

- **Loading.** After a button (or select/picker) action is dispatched, the block gets `waitingForResponse(actionId)`:
  the matching button shows the spinner, the block's other buttons are disabled; cleared when the request finishes
  (`BlockInteractionCoordinator.swift:151-162,344-361`; converter `ButtonBlockElement+BKBlockConvertible.swift:33-49`;
  legacy `BlockActionsHandler.swift:1829-1860`; legacy attachment buttons `.../Mappers/UnfurlActionsMapper.swift:201-214`).
  Text inputs never set it (`.../Interaction/BlockInteractionResponse.swift:30`, per-input overrides).
- **Errors on block_actions.** Failures are only logged; no toast, alert or inline icon
  (`Modules/Integration/BlockKitInteraction/Implementation/BlockActionNetworkDispatcher.swift:128-146`;
  `BlockActionsHandler.swift:1792-1815`).
- **Validation strings** (`.../Validation/BlockElementValidationStatus.swift:33-40`; `BlockKitInputValidator.swift:22-35,125,135`):
  "This field is required.", "Too many items selected.", "Please enter at least %u characters.", "You can’t enter
  more than %u characters.", "Number cannot be lower than %@.", "Number cannot be greater than %@.", "You must enter a
  valid email address.", "You must enter a valid URL." (URLs are accepted without a scheme if "https://" makes them valid).
- **When errors show.** On blur/Done for text inputs; for every input on Submit (modal scrolls to the first invalid
  block); server `response_action: errors` per block (§7.5). Shown by the input block (§3.7)
  (`Modules/Integration/BlockKitValidation/Implementation/BlockValidationCoordinator.swift:19-45,78-95`).
- **State.** Entered values live in a store keyed by view id or message ts plus block_id/action_id; when the view is
  updated, client values win over server values for matching ids (`Modules/DataService/BlockKitState/Implementation/BlockKitStateUpdater.swift:32-42`).

---

## 7. Modals (`views.open` / `push` / `update`)

Source: `Modules/Features/AppView/Implementation/` (`AppViewFeature.swift`, `AppViewViewController.swift`,
`AppViewPresenter.swift`, `ModernAppViewInteractor.swift`, `Views/AppViewTitleView.swift`, `Views/AppViewLoadingView.swift`),
`Modules/Integration/AppView/Implementation/AppViewService.swift`. No snapshots exist for modals.

### 7.1 Presentation
- A navigation controller presented with `.formSheet` / `.coverVertical` (`AppViewFeature.swift:45,51,71`;
  `Modules/UIInfra/Architecture/Implementation/Navigation/ModallyPresentableFeature.swift:346-347`). On iPhone UIKit
  shows form sheets as a page sheet (card over the dimmed, scaled-back screen); this is UIKit behavior, not Slack code.
- Swipe-down dismissal is disabled (`AppViewFeature.swift:71`). iPad size 400×600 (`AppViewViewController.swift:35,164`).

### 7.2 Navigation bar
- Title view: `title` in Lato Bold 15, content_primary, centered; below it the app name in Lato 13, content_primary;
  4 pt top/bottom margins (`AppViewTitleView.swift:33-94`; `ModernAppViewInteractor.swift:412-420`). No title → no title view.
- Left: `close` text, default "Close"; right: `submit` text, hidden when the view has none. Plain bar button items in
  Lato Regular 17, content_highlight_1; disabled content_tertiary (`AppViewViewController.swift:196-245`;
  `ModernAppViewInteractor.swift:380-391`).
- Submit is enabled when the view is ready (or after a failed submit) and no file upload is pending (`:384-391,843-850`).
- The bar itself is the system navigation bar; no Slack appearance customization found in these files.

### 7.3 Body
`SKList` of block rows, 16 pt side insets, 8 pt top, keyboard avoidance on (`AppViewViewController.swift:30,109-145`),
background base_primary. Tapping any non-text element ends text editing (`:181-194`).

### 7.4 Loading and errors
- Loading overlay over the body: base_primary@70% with a 46 pt spinner centered; shown while the view loads and while a
  submit is pending (`AppViewLoadingView.swift:33,44`; `ModernAppViewInteractor.swift:302-313,370-377,392`).
- Error banner (server `errors` without a block, or the view's error message): SKBanner regular, error tone at the
  top of the body with 12/16 margins: bg base_important, 1 pt border outline_important_secondary, `warning_filled.svg`
  in content_important, Lato 17 content_primary, radius 12 (`AppViewPresenter.swift:73-85`; `AppViewViewController.swift:36,86-92,129-132`;
  `SKBanner.swift:208-221,275-276,300-301,329-330,416`).
- Snackbars (`AppViewPresenter.swift:127-150`; `AppViewViewController.swift:290-299`): submit failed → "Sorry, there
  was an unexpected error. Please try again." (auto-dismiss); view failed to load → "We had some trouble connecting."
  with "RETRY" (retries).

### 7.5 Submit (`ModernAppViewInteractor.swift:520-649`)
1. Client validation of every input (required enforced in modals). Invalid → errors inline, list scrolls to the first
   invalid block, nothing sent. Pending uploads → wait.
2. Valid → loading overlay, submit.
3. Response: per-block `errors` shown inline; `successToastMessage` → toast with a checkmark for 2 s (`:813-822`);
   `response_action`: `clear` → dismiss the whole stack, `update` → refresh this view, `push` → push the new view;
   none and no errors → close this view.
4. HTTP failure → snackbar (7.4).

### 7.6 Stacking (`AppViewService.swift:42-133`)
Pushed views go onto the same navigation controller with the standard push animation. Each view sets its own left
bar button (its `close` text, default "Close"), which replaces the back chevron. Closing a pushed view pops it;
closing the root dismisses the modal; `clear_on_close` / `clear` dismiss everything. Only one modal stack at a time:
opening an unrelated view while one is shown does nothing (`:72-76`).

### 7.7 Closing with edits
If any input differs from its initial value, Close shows an action sheet: "Are you sure you want to close?" / "Just
FYI: If you close now, your work won’t be saved." with "Close" (destructive) and "Keep Editing" (cancel)
(`AppViewPresenter.swift:129-134`; `AppViewViewController.swift:265-288`; `ModernAppViewInteractor.swift:442-461`;
strings `are_you_sure_you_want_to_close`, `fyi_if_you_close_now_your_work_wont_be_saved`, `close`, `dialog_alert_cancel`).
Closing tells the server (with `hasFormData`) (`:473-487`).

### 7.8 Legacy dialogs (`dialog.open`)
`Modules/Features/Dialogs/Implementation/DialogsViewController.swift:51-164`: title Lato Bold 17 over subtitle Lato 15,
centered; submit is an SKBarButtonItem title (default style; disabled while empty or loading) that becomes a spinner
while submitting (Sept; June an outline-primary SKButton); a close button; fields in an
entities list; closing with edits shows the same action sheet but with "Close" / "Keep Editing" (`dialog_alert_discard`).

---

## 8. App DM: Home / Messages / About tabs; App Home; App Profile

**Tabs** (`Modules/Features/AnyConversation/Implementation/AnyConversationPresenter.swift:160-255,398-423,627-656`;
`AnyConversationViewController.swift:145-147,274-316`):
- Order: Home (if `home_tab_enabled`), Messages (if `messages_tab_enabled`), About (app profile). Strings "Home"
  (`app_home_app_tab_title`), "Messages" (`messages`), "About" (`app_home_about_tab_title`).
- Start tab: a deep-linked tab (Sept: also a channel tab by id), else Messages if the DM has unreads or a linked
  message, else Messages for an agent's DM (Sept, `:244-246`), else Home, else the first.
  The Messages tab shows an unread badge (`:540`).
- Tab bar: `SKTabBar` 48 pt tall at the top, tabs sized to content then stretched to fill the width on iPhone, title
  Lato 15 (selected Lato Bold 15, past `selectionProgressThreshold`) blending content_secondary → content_primary,
  selected underline 4 pt tall, radius 2, highlight2.baseInverse `#007A5A` / `#177E56` (June sk_lilypad_green); swiping between pages is off (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TabBar/SKTabBar.swift:26-27,87-89,304,447-478`;
  `TabBarCollectionViewCell.swift:373-379`). With the app-header flag on, the bar is hidden and tabs move into the
  conversation header menu with icons `home.svg`, `direct_messages.svg`/`direct_messages_filled.svg`, `info.svg`.
- Read-only Messages tab (`messages_tab_read_only_enabled`): composer placeholder "Sending messages to this app has
  been turned off." (`Modules/Features/Composer/Interface/ComposerDestinationError.swift:100,153`; `announce_only_bot_dm_informative`).

**Home tab.** The page embeds an `AppViewFeature` (`Data/ConversationPageDiffableDataSource.swift:225-228` in the same
module), so the body is the modal body (§7.3-7.4): 16 pt insets, 8 pt top, loading overlay, "We had some trouble
connecting." snackbar with RETRY on failure. The DM's own navigation bar stays on top; whether the embedded view's
close/submit items ever appear wasn't verified; `optional` inputs aren't
enforced and don't show "(optional)" (`AnyConversationPresenter.swift:400-423`; `AppViewFeature.swift:153-158`).
No dedicated empty state found (looked in `Modules/Features/AppView`, `Modules/DataService/AppHome*`).

**App Profile** (`Modules/Features/AppProfile/Implementation/`): an entities list.
- Card (`Views/AppProfileCardView.swift:26-113`; its own background base_primary, June sk_primary_background, same
  values): background = the app's card color (`#616061` when unset,
  `AppProfilePresenter.swift:57-64`), 24/16 padding, 56 pt app icon (radius 14), 16 pt gap, name Lato Bold 17 and
  short description Lato 17, both white (+ `vip_filled.svg` when VIP).
- Sections (`Extensions/AppProfilePresenter+AppProfile.swift:20-118`): "About %@" description (6 lines, "Show more"),
  "Permissions" (Managed by you / "%@ is able to:" / Allow or "Revoke access"), "Commands", actions, installation
  line ("%@ added %@ to this workspace." / "You added %@ to this workspace.").
- Actions: inside the About tab "Configuration" and "App Homepage"; elsewhere "Go To App" (or "Go To Agent") and
  "Add to VIP"/"Remove from VIP" with `user_add.svg`/`user_hide.svg`; outline medium SKButtons (`:140-223`). Nav title
  in Lato Black 17, through the navigation title configurator (`AppProfileViewController.swift:33-34`). Sept moves the
  profile's remaining legacy colors to tokens: "Managed by you" content_secondary, the permissions text and agent rows
  content_primary, the avatar banner base_tertiary with content_secondary text (`Extensions/AppProfilePresenter+AppProfile.swift:248-276`,
  `+Agents.swift:150-237`, `Views/AppProfileAvatarBannerView.swift:28-29`).

---

## 9. Blocks in messages; legacy attachments (MessageKit, not BlockKitComponents)

**Blocks in a message** (`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/DefaultTransformationPath.swift:84-142`,
`Mappers/TextMapper.swift:155-249`):
- If `blocks` exist, the message `text` isn't shown; the blocks replace it. Without blocks, `text` renders as one
  rich-text row (`TextMapper.swift:172-195`).
- Blocks sit in the message text column (measured 64 pt from the cell edge: 16 margin + 36 avatar + 12 gap, in
  `MKMessageViewSnapshotTests/testMessageViewWithBlockContentAttachments`); the first block starts 4 pt below the
  sender line.
- "(edited)" (two leading spaces, Lato 15, content_tertiary; June sk_foreground_high_solid) is appended to the last
  rich_text block only when every block is rich_text (`TextMapper.swift:37-72,197-220`; `message_edited_label`). Sept
  adds "(resolved)" the same way and "(stopped by %@)" for stopped agent messages.
- Sept: a message can carry resolved blocks (with their own dependent models) that replace its blocks
  (`DefaultTransformationPath.swift:96-103`).
- `/me` messages use italic (`DefaultTransformationPath.swift:898-904`).
- Blocks, files and attachments stack 8 pt apart; attachments 8 pt from each other (`Modules/UIInfra/MessageKit/Implementation/MKMessageContentView.swift:17-18`).

**Legacy `attachments`** (`Modules/UIInfra/MessageKit/Implementation/MKMessageUnfurlContent.swift`, `MKUnfurlView.swift`,
`MKFieldsView.swift`, `MKActionsView.swift`; mapping `.../Mappers/UnfurlMapper.swift`, `UnfurlActionsMapper.swift`, `UnfurlImageMapper.swift`):
- `pretext` above the bar: Lato 17 content_primary, 4 pt above the bar (`MKMessageUnfurlContent.swift:22,109-112`).
- Color bar: 4 pt wide, full height, fully rounded ends; content inset 12 left, 4 top/bottom
  (`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/PipeDecorator/SKPipeDecorator.swift:12-13,61-72,96`).
  Color = `color` parsed as hex; default outline_tertiary (Sept; June sk_foreground_low_solid `#DDDDDD` / `#323538`); hidden when
  `hideColorBar`, for GIF/table-only and shortcut/prompt-only attachments (`UnfurlMapper.swift:617-633`). No mapping
  of `good` / `warning` / `danger` names found in iOS (searched the repo for those strings).
- Inside, 4 pt apart (`MKUnfurlView.swift:21,82-188`; Sept: block content can be truncated with "Show more" and
  nested unfurls follow the footer): author row (16 pt icon radius 4 + name Lato Bold 17, 1 line) →
  `title` Lato Bold 17 (link when `title_link`) → text/blocks (as blocks; text folds at 14 lines with "Show more",
  more than 5 blocks fold) → `fields` → images/files (image_url as an expanded image, radius 15) → footer (16 pt
  icon + Lato 13 content_secondary) → actions (`:230-250`; `UnfurlMapper.swift:29-32,636-730,860-891`;
  `UnfurlImageMapper.swift:14-48`).
- Fields: short fields pair into two columns, others take the full width; title Lato Bold 17, value Lato 17, both
  content_primary, 4 pt spacing (`MKFieldsView.swift:15-112,279-283`).
- Actions: full-width SKButton medium stacked 4 pt apart; styles default → outline, `primary` → primary,
  `danger` → outline danger; select-type actions get `caret_down` on the right (`MKActionsView.swift:15`;
  `UnfurlActionsMapper.swift:75-82,219-244`).
- `thumb_url` is only used for video attachments (`UnfurlImageMapper.swift:20-21`).
- PNGs: `MKMessageUnfurlContentSnapshotTests/testUnfurlWithFields` (light only, custom bar color),
  `MKMessageViewSnapshotTests/testMessageViewWithBlockContentAttachments`.

---

## 10. Gaps

- Bounce animation timing of pressed buttons (`UIView.animateWithBounceMode` not read).
- Whether image blocks stretch their rounded frame to the full width (stack alignment reading, no full-width PNG).
- Where button `url`s open (in-app browser vs Safari): `urlHandler.handle` not traced (`BlockInteractionCoordinator.swift:129`).
- Visual spec of the full-screen option picker and people picker (row heights, search bar): only their configuration
  is documented here. The editor cards (§5.4) are specced; the rich text input's own metrics (scrolling, autocomplete)
  aren't.
- The question (`ask_user_question`) and page blocks are new in Sept and not specced.
- Modal navigation-bar appearance (background, hairline, iOS 26 glass) isn't set in the AppView files.
- Context block rendering has no usable PNG (blank snapshots).
- App Home empty state (no view published): none found.
- Slack-internal blocks (§3.19) are listed, not specced.
- Legacy attachment named colors (`good`/`warning`/`danger`): no client mapping found.

## 11. Reference PNGs (all under `~/Desktop/Slack Mobile Code Base/slack-objc-latest/Modules/`, Sept 2 × 2 unless noted)

- `UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKSectionBlockSnapshotTests/testSectionBlockWithStandardButtonAccessory@3x.png`: section text + full-width outline button with caret, light and dark.
- `UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKInputBlockSnapshotTests/testSelectWithHintAndError@3x.png`: input label, select row, red divider, error text.
- `UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKBlockContentSnapshotTests/testBlockContentTextDividerAndSection@3x.png`: blocks in a message with the current circular checkboxes.
- `UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKLabelSnapshotTests/testMentionText@3x.png`: rich-text mention and channel pills, light and dark.
- `UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKCardBlockSnapshotTests/test_fullCard_withoutHeroImage@3x.png`: card with icon, body and two buttons.
- `UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageUnfurlContentSnapshotTests/testUnfurlWithFields@3x.png`: legacy attachment with bar, pretext, fields, image, footer.
- `Features/DateTimePicker/Snapshots/iOS_26/DateTimePickerFeatureTests.DateTimePickerSnapshotTests/testScreenshotDate@3x.png`: date picker sheet (stale: the legacy sheet, §5.3).
- `UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKTaskBlockSnapshotTests/testExpandedState_withDetailsAndOutput@3x.png`,
  `BKPlanBlockSnapshotTests/testExpandedState_tasksWithOutput@3x.png`, `…/testCollapsedState_allComplete@3x.png`: the Sept task and plan cards
  (the clone's `?kit=blocks&only=fx-…` fixtures match them, reference/ios/snapshots.json).
- `UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKHeaderBlockSnapshotTests/testHeaderBlock@3x.png`: header with no level (Black 22).
- New in Sept: `BKCanvasFallbackSnapshotTests`, `BKFileBlockExpandedPreview{File,Image,Video}SnapshotTests`, `BKPageBlockSnapshotTests`.
