# Canvas editing, Lists editing, creation flows (new canvas, new huddle) and Select Text: iOS spec

**Updated to slack-objc main @ 14b3cbaf (2026-09-30).** What changed since June (cd22922):

- Canvas nav bar: no share button any more (the trailing state is hidden unless the canvas is a skill); "Share in
  Slack" is now in the "…" menu, which has **no title** for canvases and lists. Undo / Redo always show while editing
  (the `canvasUndoRedoToolbar` flag is gone), left of the title after a fixed space; Done is the prominent glass
  checkmark. A Slackbot button sits first on the right behind the new `slackbotInCanvas` flag (off).
- On iOS 26 the header title is the navigation item's title view (`HeaderTitleView` applies the 6 pt back-button nudge
  itself) instead of a left bar button.
- Underline is always in the format picker and the iPad formatting bar (`mobileCanvasUnderline` is gone).
- Toolbar items: `contentPrimary` icons, a `highlight1.surface` selection circle with `highlight1.content` icon (was
  `sk_frosty_blue_solid` / `sk_sky_blue`); "+" is drawn selected but without the VoiceOver trait (`.emphasized`).
- The "+" sheet's row icons are `contentPrimary` (were `.sk_primary_foreground`); new flagged rows (blockquote follows
  the editor's `blockquoteInsertionAllowed`, "Attach record").
- The compose menu's "Canvas" no longer switches to the Files tab first. The Lists to-do checkbox ring is a 1.5 pt
  `outlinePrimary` (was `contentTertiary`); to-do lists' pill reads "Add To-do". The date picker is a self-sized native
  sheet (was the legacy bottom sheet). New Huddle's search rule is `outlineTertiary` (was `sk_primary_foreground` 25 %).
- New Canvas snapshot tests render the real document web view (`CanvasEmbedSnapshotTests`, §1.9) and the outline
  (`CanvasOutlineSnapshotTests`, flag `canvasOutline`, off).

Scope: what Slack iOS does when you **edit** a canvas (toolbar, format picker, "+" sheet, header), **create** one
(every entry point), **edit** a Slack List on iPhone, start a huddle from **+ Create** (the "New Huddle" picker), and
**Select Text** on a message. Read-only canvas and list screens are in `search-slackbot-huddles.md` §4.4–§4.5; this file
picks up from there. Paths are relative to the root of `slack-objc-latest` (github.com/tinyspeck/slack-objc `main` @
`14b3cbaf`); PNGs are in the same checkout (`Modules/**/Snapshots/iOS_26/`, @3x, ÷ 3 for points). Strings: `key`
(yaml:LINE) in `Modules/Data/Strings/Implementation/localized_strings.yaml`. Colors are iOS token names
(`contentPrimary` → `--dt_color_content_primary`); hex values are design-tokens `f76ac0a` `Colors.swift` unless marked
measured.

Short paths used below:

| | |
|---|---|
| `CV/` | `Modules/Features/Canvas/Implementation/` |
| `FP/` | `Modules/Features/CanvasFormatPicker/` |
| `TB/` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TextToolbar/` |
| `LI/` | `Modules/Features/Lists/Implementation/` |
| `UCP/` | `Modules/Features/UserConversationPicker/Implementation/` |
| `TC/` | `Modules/Features/TextCopying/Implementation/` |

The canvas **document** is drawn by the Quip Collab SDK (a web view; pinned in `internal.MODULE.bazel:38-62`), which is
not in this repo: section typography, list markers, checkboxes, the caret and selection handles are the SDK's. Everything
native around it (toolbar, format picker, sheets, header, banners, skeletons, placeholders) is below with citations;
where the SDK hides a value it says so (§1.9, §7).

---

## 1. Canvas: editing

### 1.1 Edit mode

- There is no edit button: tapping into the document puts the caret there and raises the keyboard (the SDK). The native
  side learns that you're editing only from keyboard show/hide events (`CV/Components/CanvasHeaderComponent.swift:100-127`):
  keyboard will show → editing; will hide → not editing, unless a sheet the toolbar opened is up (`persistEditMode`, the
  emoji picker, format picker and "+" sheet set it: `CV/CanvasInteractor.swift:312-341`).
- While editing (`CanvasHeaderComponent.swift:71-98`): the nav bar shows **Done** and **Undo / Redo** (§1.2); the
  overflow "…" stays (hidden only in landscape or at accessibility text sizes).
- **Done** ends editing: the keyboard goes down and the format picker closes (`CV/CanvasInteractor.swift:439-440, 548-553`).
- The document scroll view dismisses the keyboard interactively (`CV/CanvasPresenter.swift:35-39`).
- Undo / redo show whenever Done shows (`CV/CanvasPresenter.swift:202-215, 690-738`; "Undo" `undo` yaml:22519, "Redo"
  `redo` yaml:15987).

### 1.2 Nav bar

(`CV/CanvasPresenter.swift:80-88, 202-227`; `Modules/Integration/HeaderHelper/Interface/HeaderBarButtonPresentable.swift:194-342`;
`Modules/Integration/HeaderHelper/Implementation/HeaderHelperService.swift:229-235, 253-291, 366-445`)

- Leading: back, then the canvas title (`HeaderTitleView`, the canvas's title, `.bodyBlack` capped at 17, leading,
  6 pt after the back button, not tappable). On iOS 26 it's the navigation item's title view and the view applies the
  6 pt nudge itself (`HeaderHelperService.swift:261-266`;
  `Modules/UIInfra/NavigationController/Implementation/HeaderTitleView.swift:405-409, 430`); before iOS 26 it's a left bar
  item wrapped with the nudge (`HeaderHelperService.swift:424-439`). A **new** canvas shows "Untitled" (`untitled`,
  yaml:22693) in `.bodyBlack`, centered, until the file loads (`CanvasPresenter.swift:80-88`;
  `CV/Data/CanvasTitleProvider.swift:86-87`).
- Not editing: only **"…"** on the right (`svgEllipsisHorizontalFilled`, a11y "Show more options", `show_more_options`
  yaml:18972). There is no share button: the trailing state is `.hidden` unless the canvas is a skill (run / add to
  library) (`CanvasHeaderComponent.swift:52-69`; `CV/CanvasInteractorInputPublishersFactory.swift:117-128`), and "Share in
  Slack" is in the menu (§1.3). A Slackbot button would sit first on the right behind `slackbotInCanvas` (off,
  `ios_slackbot_in_canvas.json`; `CV/CanvasInteractorInputPublishersFactory.swift:177-199`;
  `CV/CanvasFeature+Dependencies.swift:258-265`; never in a channel tab).
- Editing (`CanvasPresenter.swift:690-738`): left — back, a fixed space (it splits the glass,
  `HeaderHelperService.swift:405-406`), then **Undo · Redo** (`svgUndo` / `svgRedo`) in one capsule, each enabled only
  when there's something to undo / redo; the title stays; right, leading to trailing — "…" then **Done** (`rightButtons`
  are ordered leading to trailing, index 0 nearest the title, and reversed for UIKit,
  `HeaderBarButtonPresentable.swift:196-197`; `Modules/UIInfra/NavigationController/Implementation/SKNavigationItem.swift:347-349`).
- **Done** on iOS 26 is UIKit's system done item with glass styling: the SF Symbol `checkmark`, style **`.prominent`** —
  a circle filled with the bar's tint (`highlight1.content`, `Modules/UIInfra/SlackKit/Implementation/Global/SLAppearance.swift:37`),
  the symbol white; a11y "Done" (`done`, yaml:5777) (`HeaderHelperService.swift:229-235, 413-414`;
  `Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKBarButtonItem.swift:375-394, 420-422`).

### 1.3 Overflow "…" menu

`SingleFileMenuService.actionMenuPresentationObject` (`Modules/Features/SingleFileMenu/Implementation/SingleFileMenuService.swift:124-183`),
the canvas header's menu (`CV/CanvasFeature.swift:291-318`; `CV/CanvasInteractorInputPublishersFactory.swift:18-26`), an
SKMenu with **no title** for canvases and lists (their names may hold custom emoji; other files keep their title,
`:185-192`):

| Item | Icon | When |
|---|---|---|
| ["Show outline"] | `svgListView` | flag `canvasOutline` (off; `CV/CanvasFeature.swift:308-318`) |
| ["Add To-do" / "Add to To-dos" …] | `svgCheckCircle(Filled)` | flags `laterTodos` / `todosV2` (off; `:213-259`) |
| "Save for Later" (`save_for_later_menu`, yaml:16886) / "Remove from Later" (`remove_from_later`, yaml:16219) | `.bookmark` (icon font → `bookmark`) / `svgBookmarkFilled` | default (`:261-315`) |
| "Share in Slack" (`shareInSlack`, yaml:18511) | `.forward` (icon font → `svgShareMessage`, `Modules/Data/Icon/Implementation/SKIconManifest+SVGMapping.swift:100`) | you have access (`:147-153`) |
| "Copy Link" (`copy_link`, yaml:4753) | `.link` | you have access and copying is allowed (`:155-157`) |
| "Manage Access" | `svgUserGroups` | flag `fileManagePermissions` (off; `:159-166`) |
| "Delete" (`delete`, yaml:5283), destructive | `svgTrash` | a workspace owner or admin, the canvas's owner, or its creator (`:168-180, 194-211`) |

Results (`Modules/Features/FileCarousel/Implementation/ActionHandler/FileActionHandler.swift:109, 198-211, 239-243, 264-282, 334-358`):
toast "File saved for Later" (yaml:7017) / "File removed from Later" (yaml:7011) with a 40 pt white `svgCheckFilled`;
copy link → "Link copied" (`copied_link`, yaml:4677, `toast_checkmark`;
`Modules/Integration/RichTextEditor/Implementation/CopyPasteHandler.swift:255-262, 403-408`); Share in Slack → the share
screen; Delete → alert "Are you sure you want to delete '%@'?" (`file_deletion_prompt`, yaml:6960; "Are you sure you want
to delete this file?" `file_deletion_prompt_untitled` yaml:6963 without a title) with "Yes, Delete File"
(`yes_delete_file`, yaml:24174, destructive) and "Cancel" (yaml:3202); deleting pops the canvas (or dismisses it when
presented modally) (`CV/CanvasFeature.swift:669-681`).

### 1.4 Permissions and banners

- Floating banner (`CV/CanvasPresenter.swift:312-350, 523-543`; placement `CV/CanvasViewController.swift:35-40, 261-283`):
  SKBanner `.regular`, `.smallBody` text, trailing ✕, no ornament, 16 pt from the sides, 16 pt above the context bar.
  Copy: template "You're editing a template." / "You're viewing a template." (`canvas_template_editing` yaml:3442 /
  `canvas_template_viewing` yaml:3450) on `indigo._50` with `contentInversePrimary` text; can't edit → "View only"
  (`view_only`, yaml:23249) or, with comment rights, "Comment only" (`canvas_comment_only`, yaml:3344), tone
  `.genericLight`; over the concurrent-editor limit "Due to high usage, this canvas is currently in view-only mode…"
  (`canvasExceededEditorsLimitWarningMessage` yaml:3324; viewers yaml:3329). Nothing shows until the server has confirmed
  the access level (`isAccessUnknown`); meanwhile a 2 pt `SKLoadingBar` runs under the bar for up to 15 s
  (`CanvasPresenter.swift:242-256`; `CV/CanvasViewController.swift:107-115, 328-333, 588-600`). Measured in
  `test_view_with_templateBanner@3x.png`: 44 pt tall, radius ≈ 12, 16.2 pt from the sides.
- Comment-only: the toolbar is `[add comment, reaction]` only (`CV/Toolbar/CanvasToolbarLayoutBuilder.swift:79-84`),
  attached to the view without the keyboard and shown only while text is selected (`CV/CanvasViewController.swift:445-458`;
  `CV/CanvasInteractor.swift:706-718`). View-only: no toolbar (the SDK doesn't take the keyboard).

### 1.5 The editing toolbar (keyboard input accessory)

`CV/Toolbar/CanvasToolbarView.swift` (CTV), items `CV/Toolbar/CanvasToolbarLayoutBuilder.swift` (LB), icons/labels
`FP/Interface/CanvasToolbarItem.swift` (TI), item drawing `CV/CanvasPresenter.swift:626-685` and `TB/`.

- It's the keyboard's `inputAccessoryView` (CTV:19-21): it rides on top of the keyboard and exists only while it's up.
  Bounds 36 + 2 × 12 = **60 pt** tall (CTV:24-30).
- iOS 26: a **Liquid Glass capsule** (`UIGlassEffect(.regular)`, interactive, `.capsule()` corners), centered, at least
  16 pt (`Spacing.xLarge`) from the sides, top at the accessory's top, bottom **12 pt** (`Spacing.large`) above the
  keyboard → 48 pt tall (CTV:64-86, 222-232). Inside: a 16 pt spacer, the toolbar, a 16 pt spacer (CTV:239-258).
- Toolbar (SKTextToolbar, `TB/SKTextToolbar.swift`, `TB/Layout/SKTextToolbarLayout.swift`): **36 × 36** items, item
  spacing **12** on iOS 26 (4 before) (CTV:354-364); its width is `n × 36 + n × (spacing − 1)` (TB/SKTextToolbar.swift:111-146),
  so the last item has 6 pt after it inside the capsule.
- Item (`TB/Cells/SKTextToolbarItemCell.swift:14-127`): 20 pt icon centered, **contentPrimary** on iOS 26
  (contentSecondary before, `CanvasPresenter.swift:628-632`); selected (`selectionStyle .selected`, or `.emphasized` for
  the "+" — drawn the same, without the VoiceOver trait, `CanvasPresenter.swift:636-653`): a circle inset 2 (32 pt) of
  **`highlight1.surface`** with the icon **`highlight1.content`** (SKTextToolbarItemCell.swift:19-23, 46-47, 81-88,
  118-125); disabled alpha **0.35**; pressed bounce 0.96 (animations on for canvas items, `CanvasPresenter.swift:652, 664, 676`).
- Layouts (LB:19-109):

| Layout | When | Items |
|---|---|---|
| root | caret in the body | **+** (`svgPlus`, always drawn *selected*: "blue background for the + button", LB:93-95; a11y "Attach photos and videos" `attach_photos_and_videos` yaml:2261) · **Aa** (`svgFormatting`, "Formatting" `formatting_a11y` yaml:7373) · **checklist** (`svgCheckbox`, "Checklist text formatting" `checklist_formatting` yaml:3974; never shown selected in root, LB:186-188) · **emoji** (`svgEmoji`, "Emoji Picker" `emoji_picker` yaml:6232) · **add comment** (`svgAddComment`, "Add Comment" `add_comment` yaml:719) · **reaction** (`svgAddReaction`, "Add Reaction" `add_reaction` yaml:827) |
| rootForTitleSection | caret in the title | the same, all **disabled** except emoji (LB:85-107, 157-160) |
| rangeFormatting | text selected (`textSelectionDidChange(isRangeExpanded:)`, `CV/CanvasInteractor.swift:706-718`) | a leading **back** button (`svgCaretLeftDoubleFull`, contentPrimary, no circle; a11y "Dismiss formatting toolbar" `dismiss_formatting_toolbar` yaml:5517; CTV:409-434) · Aa · add comment · reaction |
| commentOnly | comment-only access | add comment · reaction |
| formatting | **iPad only** (on iPhone Aa opens the format picker, §1.6) | ✕ (`.times` on a `highlight1.baseInverse` circle) · body · H1 · H2 · H3 · B · I · U · S · link · code · quote · bullet · checklist · numbered · indent · outdent (LB:52-71) |

- Taps (`CV/CanvasInteractor.swift:312-353`): **Aa** on iPhone hides the keyboard and accessory and presents the format
  picker (§1.6); **emoji** keeps edit mode and presents the emoji picker (inserts at the caret); **+** presents the "+"
  sheet (§1.7); **link** opens the link editor (`WysiwygLinkEditing`, the composer's add/edit-link alert); everything else
  is an editor action. The back button returns to the root layout (`toolbarXButtonTapped`, :348-353).
- Toolbar transitions between layouts that change the cancel button: the glass slides down 72 pt and back up, 0.175 s each
  way, spring damping 0.75 (CTV:150-202); skipped under Reduce Motion.

### 1.6 The format picker ("Format" sheet, iPhone)

`FP/Implementation/CanvasFormatPickerFeature.swift:15-99`, `…ViewController.swift:15-57`, `…Presenter.swift:18-265`,
rows `CanvasFormatHeadingCustomRow.swift`, `CanvasFormatItemView.swift`, `CanvasFormatCustomRow.swift`,
`CanvasFormatMiscellaneousStyleCustomRow.swift`.

- Presentation: a native sheet with one **fixed 340 pt** detent, **no grabber**, **undimmed** (largestUndimmedDetent = its
  detent, the canvas stays visible and live above it), **no swipe to dismiss**, system corner radius on iOS 26 (12
  before), in a navigation controller (Feature:23-27, 48-74). Background `basePrimary` (`…ViewController.swift:26`); the
  list doesn't scroll.
- Nav bar: title "Format" (`edit_menu_item_format_button`, yaml:6038) as an SKNavigationTitle (Lato Black 17); left a
  close bar button `svgClose`, a11y "Close" (`close`, yaml:4081) (VC:22-48; Presenter:94-102). Close dismisses it and the keyboard
  comes back.
- Rows, top to bottom (Presenter:23-107):
  1. **Headings**, horizontally scrollable: "Big heading" (`format_heading_h1_title`, yaml:7364, `.headline` 28 black), "Medium heading" (yaml:7367,
     `.title` 22 black), "Small heading" (yaml:7370, `.subtitle` 20 black), "body" (`format_heading_body`, yaml:7361, lowercase as shipped,
     `.body` 17) (TI:214-259). Cells = label + 8 pt each side, 5 pt above/below; selected cell `highlight1.base` with radius 8;
     label `contentPrimary`, selected `highlight1.content`, disabled `contentTertiary`; row = H1 label height + 2 × 8 + 2 × 5;
     12 pt content inset at both ends; press bounce 0.96 (HeadingCustomRow:25-30, 64-73, 97-101, 147-151, 164-221).
  2. **B · I · U · S** (Presenter:45-51; "Underline text formatting" yaml:22513; `CV/Toolbar/FormatButtonItemState.swift:27-46`).
  3. **bulleted · numbered · checklist**.
  4. **quote · code · link** and, 16 pt apart, **indent · outdent** (proportional widths).
  Rows 2–4 are segmented controls 16 pt from the sides (CustomRow:39-41; MiscRow:36-53): a container with a 1 pt
  border of `outlineTertiary` at 13 % alpha and radius 8, the buttons 1 pt inside it (inner radius 7), 1 pt
  `outlineTertiary` separators full height (ItemView:21-71, 148-156). Each button is an icon-only SKButton `.medium`,
  icon on top (40 pt tall): fill `basePrimary`, selected `highlight1.base`, disabled `baseTertiary`; icon `contentPrimary`,
  selected `highlight1.content`, disabled `contentTertiary` (Presenter:205-264). Row height = 2 × 8 + button height
  (ItemView:93-103).
- State (`CV/Toolbar/FormatButtonItemState.swift:22-153`): the caret's section style and inline styles are selected; in
  the title (or on a divider) everything is disabled; in a heading **bold is disabled**; indent/outdent are disabled outside
  lists. A tap applies the style and the sheet stays; **link** closes the sheet first and opens the link editor
  (Feature:85-98).

### 1.7 The "+" sheet (canvas omnipicker)

`CV/Toolbar/Plugin/OmniPicker/CanvasOmnipickerPlugin.swift:122-167` — an `SKListBottomSheet` (legacy bottom sheet, §0.1 of
`sheets-menus.md`; a native sheet with `bottomsheetMigration`, off) whose sections are plugins, in order: photo gallery
strip (attaches up to 10), "Record a Video Clip" (`record_a_video_clip`, yaml:15850, `svgVideo`), **"Divider"**
(`divider`, yaml:5546, `svgDivider`; inserts a horizontal rule, `CanvasDividerPlugin.swift:53-75`), [blockquote, flag
`canvasNewBlockquotesLayout` off, and only where the editor allows one], "Profile" (`profile`, yaml:15323, `svgUser`:
pick a person, inserts their profile card; `Modules/Features/UserPickerPlugin/Implementation/UserPickerPlugin.swift:65-80`),
then "Canvases" (`canvases`, yaml:3463, `svgCanvasBrowser`), "Lists" (`lists`, yaml:11249, `svgLists`), "Recent Files" (`recent_files`, yaml:15816,
`svgFileBrowser`), "Upload a File" (`upload_a_file`, yaml:22810, `.upload`) (`Modules/Features/FilePickerPlugin/Implementation/FilePickerPlugin.swift:253-363`),
["Attach record", flag `slackforceReferenceRecord` off]. Rows are SKGenericEntity `.small` with **`contentPrimary`**
icons. Each plugin is its own section: an 8 pt blank divider header (hidden on the first) and the default 8 pt
`.hairlineDivider` footer (hidden on the last), so sections are 16 pt apart with a 1 px `outlineTertiary` line 8 pt
under the previous row (`CanvasDividerPlugin.swift:64-68`; `UserPickerPlugin.swift:77-81`; `FilePickerPlugin.swift:358-363`;
`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKListPresentationObject.swift:153-154`).

### 1.8 Mentions, channels and emoji while typing

The canvas uses the composer's autocomplete card (`AutocompleteFeature`, `composer.md` §18) for `@` people, `#` channels and
`:` emoji, with broadcasts (@here…) off and `autocompleteIsInCanvas` (`CV/CanvasFeatureAutocomplete.swift:45-58, 84-108`);
picking inserts the mention / channel / emoji through the SDK.

### 1.9 Placeholders and the document (SDK)

- Title placeholder "Your canvas title" (`canvas_placeholder_title`, yaml:3392); body placeholder, chosen per file by a
  hash of its id, one of "Go ahead, start writing!" (3377), "What's on the docket for today?" (3380), "Once upon a time…"
  (3383), "Time to document your genius!" (3386), "Words go here" (3389) (`CV/CanvasDocumentControllerLoader.swift:224-243`;
  `CV/CanvasDocumentControllerFactory.swift:147-148`). Huddle notes canvases use `canvas_meeting_notes_placeholder`
  (yaml:3369).
- The document's look is the SDK's. Native statements of canvas type are the format picker's previews (H1 `.headline` 28
  black, H2 `.title` 22 black, H3 `.subtitle` 20 black, body `.body` 17; TI:246-259) and the loading skeleton's geometry
  (36 pt side margins, 16 pt text lines on a 24 pt pitch, 28 pt section spacing;
  `Modules/Features/Canvas/Interface/Loading/CanvasLoadingItem.swift:10-17`). The clone uses those, plus MessageKit's rich
  text styles (`composer.md` §8) for inline code, code blocks, quotes, list markers and mentions, and SKCheckbox for
  checklist items (the "Slackified checkboxes" flag that would make the SDK draw Slack's checkbox is off,
  `ios_canvas_slackified_checkboxes.json`).
- `CanvasFeatureTests.CanvasEmbedSnapshotTests` (new; `Modules/Features/Canvas/Tests/Unit/CanvasEmbedSnapshotTests.swift`)
  render the real SDK web view of an empty captured canvas with embeds, in a 393 pt window with no nav bar. Measured: the
  title placeholder's ink at x 50.7, y 82–103 (a bold ≈ 29 pt face in #77757A); embed cards 50–342.7 pt (50 pt from both
  sides), the first at y 154, stacked 10 pt apart, 1 pt #E2E2E2 border, radius ≈ 12, a 1 px #EAEAEA divider inside. Those
  side margins are wider than the native skeleton's 36; the clone keeps 36 (one test fixture, no device screenshot).

---

## 2. Creating a canvas

### 2.1 Entry points

All creation goes through `files.createCanvas` (params `tabbed_channel_id`, `is_notes_canvas`; returns `file_id`,
`quip_thread_id`; **no title, no template**) (`Modules/NetworkPersistence/SlackAPIFilesSchema/Implementation/SlackAPI+FilesCreateCanvas.swift:10-23`),
called from `CanvasDataService.start()` when the feature is built (`CV/Data/CanvasDataService.swift:218-237, 311-327`;
`CV/CanvasFeature.swift:447`). Sources `.newTabbedCanvas(tabbedChannelId:isNotesCanvas:)` / `.newStandaloneCanvas`
(`Modules/Features/Canvas/Interface/CanvasFeatureInterface.swift:28-31`).

| Entry point | Code | Opens |
|---|---|---|
| A channel's or DM's **"Add canvas"** tab (header menu row / pager page) | `Modules/Features/AnyConversation/Implementation/Data/ConversationTabsBuilder.swift:427-443` | the canvas in place as that conversation's tab (`.newTabbedCanvas`) |
| Canvases list "+", its empty state "New Canvas", search "Create a canvas" | `Modules/Features/CanvasSynthetic/Implementation/CanvasSyntheticFeature.swift:255-268` | `CanvasRoute(.newStandaloneCanvas)` (pushed) |
| Compose FAB "Canvas" ("Create rich, flexible docs", `canvas_creation_subtitle` yaml:3347; only when you can create standalone canvases) | `Modules/Features/CreationEntryPoints/Implementation/CreationEntryPointsHandler.swift:66-72`; `…/EntryPoints/CanvasEntryPoint.swift:10-30` | `CanvasRoute(.newStandaloneCanvas)` in the current tab (June switched to the Files tab first) |
| Files "+" menu "New Canvas" (`new_canvas`, yaml:12797) / its empty-state button | `Modules/Features/Docs/Implementation/DocsPresenter.swift:1416, 1639, 1808`; `DocsInteractor.swift:495-496`; `DocsFeature.swift:315-318, 337-372` | `CanvasRoute(.newStandaloneCanvas)` |
| Huddle "Take Notes" with no notes canvas yet | `Modules/Features/Huddles/Implementation/HuddleActionButton/HuddleActionButtonFeature.swift:239-256` | a modal notes canvas |

### 2.2 What a new canvas looks like

- **No naming step, no template picker, no "Get started" screen** anywhere on iOS (no template-creation code in `Modules/`).
  Templates exist only as a property of existing files (`File.isCanvasTemplate`, the banner in §1.4).
- While it's created: the new-canvas skeleton — 28 pt gap, a 75 % line, 28 pt gap, a 100 % line, a 50 % line (16 pt lines,
  8 pt below each, 36 pt side margins, no repeat) (`Modules/Features/Canvas/Interface/Loading/CanvasLoadingStateView.swift:153-160`;
  `CV/CanvasViewController.swift:462`).
- Then the empty canvas with its placeholders (§1.9); the nav title "Untitled". The native code doesn't focus the editor
  (`Modules/Integration/Canvas/Implementation/CanvasEditorView.swift:847-851` focuses only deep-linked sections); whether
  the SDK does isn't in this repo (gap).
- Errors: "Can't create this canvas" (`error_creating_canvas`, yaml:6436) with "Something went wrong…" and Retry when
  allowed / "Only members with posting permissions can create this canvas" (`only_members_can_create_this_canvas`, yaml:13964)
  (`CV/CanvasDataServiceErrorMapper.swift:20-50`).

### 2.3 After a channel canvas exists

- "Add canvas" (`channel_tab_add_canvas`, yaml:3878, `svgAddChannelCanvas` via
  `Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift:34-35`) shows only while the conversation has no canvas
  tab, for members who can post, never in archived / frozen channels, file channels, app homes, DMs with a deactivated
  person or the Slackbot AI DM (`Modules/DataService/CanvasSupport/Implementation/CanvasSupportService.swift:134-178, 215-220`;
  `ConversationTabsBuilder.swift:427-431`). After creation it's replaced by the canvas's tab: its title (or "Canvas",
  yaml:3884, while loading), `svgCanvasContent` / `svgCanvasContentFilled`, a trash icon once the file is deleted
  (`ConversationTabsBuilder.swift:222-228, 317-347`). A conversation can carry several canvas tabs (server tabs); "Add
  canvas" disappears once there is one.
- The header pill's "N tabs" counts every page including Messages and "Add canvas" ("1 tab" `one_tab` yaml:13899, "%@
  tabs" `few_tabs` yaml:6868), unless it shows "N updates" (`Modules/Features/ConversationHeaderMenu/Implementation/ConversationHeaderPresentationObject.swift:376-385`;
  `Modules/Data/I18n/Implementation/SLKPluralString+Helpers.swift:1026-1033`), so creating the first canvas keeps the
  count (Add canvas → the canvas); each further canvas tab adds one.
- The client posts no message (no "canvas created" renderer).

---

## 3. Lists: editing on iPhone

Short version: on a card you can only tick the to-do checkbox; everything else is edited on the item screen (a modal
sheet). Every change saves at once; there's no Save button.

### 3.1 The to-do checkbox on a card

- Shown only when the list has a **completed** column (`todo_completed`) and the record has no approval data
  (`LI/ListView/ListItems/KanbanFeature/ListHydratedRecord.swift:164-173, 306`). A plain checkbox column is just a field
  value on the card (`LI/ListView/ListItems/ListItemPresentationObjectMapper.swift:391-400`).
- First in the title row (8 pt to the title), 16 pt from the card's leading edge; fields below indent 16 + 20 + 8 = 44 pt
  (`…/KanbanFeature/Subviews/ListKanbanRecordView.swift:44-55, 95-105, 370-373`).
- `ListKanbanCheckbox` (`…/Subviews/ListKanbanCheckbox.swift:15-101`): **20 × 20** circle (KRV:70), tap area +12 all round;
  unchecked: clear with a **1.5 pt `outlinePrimary`** border; checked: no border, **`contentTertiary` fill**, a checkmark
  stroked in `basePrimary`, 2 pt, round caps/joins, path (7.5, 11.5) → (10, 15) → (16.5, 7.5) in a 24-unit box, drawn in
  with a spring on strokeEnd (0.25 s, bounce 0.15); unchecking resets at once; success haptic.
- A checked card turns `baseSecondary` (KRV:387-389, 503), its title and fields `contentTertiary`, plain titles drop to
  `.body`; **no strikethrough** (Mapper:339, 757, 790, 988, 1085-1099).
- The title is the primary column in `.bodyBlack` up to 2 lines; a wrapping UILabel advances 1.2 em a line and only its
  box is rounded to the pixel grid (docs/conventions.md, "Text baselines").
- Saved after 1 s (KRV:93, 508-519); toast "Changes saved" (`changes_saved`, yaml:3684, `contentInverseSecondary`) with
  "Undo" (`LI/ListView/ListViewInteractor.swift:2016-2024, 2086-2092`). If the view hides completed items the card
  disappears; in To-do lists it moves to a collapsed "Completed" section (`completed_title`, yaml:4401).

### 3.2 Adding an item

- A floating pill bottom-right, 16 pt from the trailing safe edge and 16 pt above the bottom safe area
  (`LI/ListView/ListViewViewController.swift:21-30, 101-113, 280-281`): SKPillButton with `svgPlus` on the left and
  "Add Item" (`add_list_item_title`, yaml:777; To-do lists "Add To-do", `add_todo_menu` yaml:956) in `.smallBodyBold`
  `contentInversePrimary` on `highlight2.baseInverse`, insets 12 / 16 (`LI/ListView/ListViewPresenter.swift:30-34, 48-56, 164-183`).
  Hidden when you can't write; greyed (contentTertiary on baseTertiary) at the item limit.
- Tap → the item screen (§3.3) titled "New Item" (`list_view_new_item_title`, yaml:11205); the record is created when the
  first field is edited (`LI/ListRecord/ListRecordInteractor.swift:1758-1763`). Its title reads "Untitled Item"
  (`list_record_untitled_item`, yaml:11182). Nothing is focused automatically.
- There is no inline "add card" cell (`testCellCreate` draws an ordinary card).

### 3.3 The item screen

- Tapping a card opens the record **carousel** as a modal form sheet in a navigation controller
  (`LI/ListsRecordsCarousel/ListsRecordsCarouselRouteExecution.swift:31-36`): left ✕ (`svgClose`, a11y yaml:194), an
  SKNavigationTitle "Item" (`list_view_item_title`, yaml:11199; a new one "New Item", yaml:11205; to-do lists "To-do",
  `todo_title` yaml:21821) over the list's name in `.caption` `highlight1.content` with `.chevronRight` (an icon-font
  glyph), tapping it goes to the list; right an ellipsis (`show_more_options`)
  (`…/ListsRecordsCarouselViewController.swift:118-221`; `LI/ListRecord/ListRecordPresenter.swift:2006-2040`).
- The bottom bar (`…/Subviews/ListRecordBottomBarNavigationView.swift:28-33, 125-162, 178-182`): `basePrimary`, a 1 pt
  `outlineTertiary` divider on top, 10 pt above a row with 16 pt margins and 16 pt spacing: SKIconButton `.small` (40 pt)
  `.chevronMediumLeft` / `.chevronMediumRight` in `contentPrimary` on a `surfacePrimary` circle (pressed: darkened 20 %),
  disabled at the ends; between them "N of M" in `.captionBold` `contentPrimary`, and the item's title in `.micro`
  `contentSecondary` once it has scrolled away; then the safe area.
- The list is an SKList whose sections are (LRP:272-322): the primary field (blank header and footer), the actions row
  (blank header, `.hairlineDivider` footer), then one section per field (an SKHeaderEntity `.medium` with the field's name,
  none for checkbox / completed fields), then the "Add field" footer button. Measured on the iOS 26 renders
  (`ListRecordFeatureSnapshotTests`, 393 pt wide; y from the content's top, which is the safe area's, 59 pt there):
  1. the primary field: SKGenericEntity `.small`, `.bodyBold` (capped at subtitle size) `contentPrimary`, any number of
     lines, its caps at y 17.0; empty "Untitled Item" (`list_record_untitled_item`, yaml:11182) in `contentTertiary`
     (LRP:466-495; `testPrimaryTextField_empty`);
  2. the actions row at y 59.7–99.7: medium SKButtons (`.smallBodyBold` 15, a 20 pt icon 6 pt before the title), 40 pt
     tall, 16 pt from the sides, 8 pt apart, sharing the width — "Add a comment" (`add_a_comment` yaml:645,
     `svgAddComment`) and, with a to-do completed column, "Complete" (`svgCheckCircle`), both `containerPrimary` with an
     `outlineTertiary` border (#EAEAEA measured) and `contentPrimary` text; "Completed" (`svgCheckCircleFilled`)
     `highlight2.base` (#E3FFF3) / `highlight2.outlineSecondary` / `highlight2.content` (#007A5A)
     (`…/Custom Rows/ListRecordActionsRow.swift:31-37, 261-270`; LRP:1385-1402); 4 pt below it the section's 8 pt
     `.hairlineDivider` footer, whose 1 px `outlineTertiary` line is at y 111.3
     (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Footer/SKListFooterView.swift:18-19, 106-111`);
  3. a field section: the SKHeaderEntity, the name in `.smallBodyBold` `contentPrimary`, 20 pt above and 12 pt below it
     (50 pt; "Select" caps at y 135), then its row:
     - **text**: SKGenericEntity `.small` (10 / 16 insets), the value in `.body` `contentSecondary` (#454447), any number
       of lines; empty: `svgTextSnippet` in the ornament box and "Text" (`text` yaml:21135) in `contentSecondary`
       (LRP:466-495; `testTextField_*`);
     - **select**: a token bar row (10 / 16 insets): SKTokenView in the choice's colors, `_0` fill and `_70` text
       (`ChoiceOptions+Extensions.swift:28-51`); empty: `svgCaretDropdown` and "Select" (`select` yaml:17332) in
       `contentTertiary` (#5E5D60, drawn bold) (`Modules/Integration/ListsPresentation/Implementation/ListRecordFieldUIMapper.swift:106-156`;
       LRP:1634-1682);
     - **person**: SKTokenView with the avatar tile, the name in `.bodyBold` lagoon `_70` (#0071A4) on the default fill
       (`baseHighlight1`, #E3F8FF); empty: the user-groups icon and "Person" (`person` yaml:14701) in `contentTertiary`,
       regular weight (LRP:987-1014; `ListRecordFieldUIMapper.swift:158-189`);
     - **date**: SKGenericEntity `.small`, the icon font's calendar (18 pt glyph) in a clear box, "June 5, 2025" and
       `svgCaretDown` in `contentPrimary`; empty "Date" (`date` yaml:5169) ⌄ measured #8D8D8D (`contentTertiary` at
       70 %) (LRP:1507-1628, 1961-1973);
     - **checkbox**: no header; an SKCheckbox (21 pt) in a 24 pt box at x 16 and the name in `.body` `contentPrimary`
       at x 52, a 44 pt row (`…/ListRecordCheckboxInputRow.swift:58-70`; `testWithCheckboxRow*`); a checkbox column
       that isn't the to-do one (`testCompletedField_*`) is just this row;
  4. "Add field" (`lists_add_field` yaml:11263): `.outlineDefault` medium with `svgPlus` (`outlineSecondary` border,
     #B6B6B7 measured), full width, 10 pt below the last row (LRP:2044-2050).
- Editing by field type:
  - **Text** — RichTextInputFeature, presented `.overCurrentContext` with `.crossDissolve` (`RichTextInputFeature.swift:80-84`):
    black 40 % over everything and, on iOS 26, a `UIGlassEffect(.regular)` card, radius 24, 16 pt from the sides and 12 pt
    above the keyboard; in it 16 pt margins and 8 pt spacing: the field's name (`.bodyBold`), the text (first responder as
    it appears), the toolbar — the primary field's [emoji, mention], a plain text field's empty one, a rich text field's
    standard [emoji, mention | bold, italic, strikethrough, code, code block, link, bulleted, numbered, indent, outdent,
    quote] (`RichTextInputToolbarConfig.swift:21-26`; LRI:1385-1427) — and 16 pt below it "Cancel" / "Done"
    (`.bodyBold` `highlight1.content`) at either end. A tap outside is Done; Return is a new line (Shift+Return, the only
    keyboard shortcut, too: `RichTextInputInteractor.swift:579-583`); Done with no text clears the field
    (`RichTextInputInteractor.swift:394-404`); Cancel drops the edit (`RichTextInputViewController.swift:57-200, 236-238,
    282-286, 355-438`). Placeholder "Untitled Item" for the primary field, else "Text" (LRI:1393).
  - **Select** — the native pull-down menu: each option with a 20 pt choice circle (1 pt `_70` ring, `_20` fill,
    `SKMenu.swift:66, 149-166`), a checkmark on the current one; picking the current option of a single select clears
    it (`…/ListRecordTokenInputRow.swift:193`; LRP:1634-1661; LRI:1810-1841).
  - **Person** — UserConversationPickerFeature, single select, people only (no bots, no Slackbot), `.small` cells, search,
    title "Select User" (`select_user` yaml:17395), right bar button "Clear" (`clear`; `.title(…, style: .default)` =
    SKButton `.systemDefault` `.barButton`); picking someone saves and dismisses, Clear empties the field (LRI:1132-1199).
  - **Date** — DateTimePickerFeature (`ListRecordFeature.swift:483-531`): "Select a date" (`select_a_date`, the date
    mode's title) in `.smallBodyBold`, "Done" (`.bodyBold` `highlight1.content`), the inline UIDatePicker tinted
    `highlight1.content`, "Clear" (`.outlineDefault` `.medium`, as wide as the picker) only when the field has a date;
    margins 20 / 16 / 12 / 16, 12 pt after the title row (`Modules/Features/DateTimePicker/Implementation/DateTimePickerViewController.swift:43-45, 187, 260-303`).
    Done saves the picker's date (today if none was set); swiping it away saves a day you picked; Clear empties it
    (`DateTimePickerInteractor.swift:60-140`). On iPhone it's a native sheet sized to its content, a popover on iPad
    when there's a source view (`DateTimePickerFeature.swift:50-63`). The calendar (UIKit) measured on
    `DateTimePickerSnapshotTests/testScreenshotDate@3x.png`: from the sheet's top, the title row's caps 24.4, the month
    row centered 87.6 (label `.headline` 17 semibold, 12.35 pt left of the first column's center; arrows 45.65 apart),
    weekday symbols (13 pt semibold caps, `tertiaryLabel`) centered 130, weeks from 161.7, 45.67 apart, in 45 pt columns
    centered; the picked day on a 43.5 pt circle of the tint at 12 %, its number in the tint.
  - **Checkbox** — the row toggles in place.
- Each edit saves immediately. The record has its own toast (an SKBanner 16 pt from the sides, 8 pt above the bottom, 4 s):
  "Edits to item saved." (`edits_saved`, yaml:6100) `.genericDark` with "Undo" (`highlight1.contentInverse`, size
  `.toastButton`); in a view-only list "You can’t edit this field in Slack." (yaml:24281) `.info` with `svgInfo` in
  `sk_highlight_accent` (`LI/ListRecord/ListRecordViewController.swift:19-60, 178-185, 282-284`).

### 3.4 Read-only lists

Writable = edit permission and not locked (`LI/ListView/ListViewInteractor.swift:259-260`). Read-only: no Add Item pill
(LVP:165); the nav subtitle "View only" (yaml:23249); a "View only" banner (`.genericLight`, no ornament) at the bottom,
12 pt from the sides (LVC:123-134, 398-405); checkboxes and long-press move/delete are off; on the item screen a "View
only" banner and, tapping a field, "You can’t edit this field in Slack." (yaml:24281).

### 3.5 List nav bar and menu

Pushed (back button); title = the list's name over its channel; right `svgEllipsisHorizontalFilled` "Show more options",
and before it a Slackbot button behind `slackbotInLists` (off) (`LI/ListView/ListViewPresenter.swift:122-139`). The menu
is **titled with the list's name** (`ListViewPresenter.swift:186-197`; `LI/ListView/ListViewInteractor.swift:993-999`) and
lists, in order (`LI/ListView/ListMenu/SlackListMenuProvider.swift:33-173`):

| Item | Icon | When |
|---|---|---|
| "List details" (`list_details`, yaml:11128) | `svgLists` | always |
| "Share in Slack" (`shareInSlack`, yaml:18511) | `svgShareMessage` | always |
| "Copy Link" (`copy_link`, yaml:4753) | `.link` | always |
| [to-do / Saved items] | | flag `laterTodos` (off) |
| ["Manage Access"] | `svgUserGroups` | flag `fileManagePermissions` (off) |
| "Request Edit Access" (`request_edit_access`, yaml:16492) / "Edit Access Requested" (`edit_access_requested`, yaml:5997, disabled) | `svgUnlock` | you can't write to it; after a request the toast "Request sent" (hard-coded) with a 30 pt white `svgCheckFilled` (`ListViewInteractor.swift:1643-1653`) |
| ["Report to Slack"] (`report_to_slack`, yaml:16465) | `svgInfo` | EU illegal-content reporting, not your own list (`Modules/Integration/ReportContent/Implementation/ReportContentService.swift:71-77`) |
| "Delete" (`delete`, yaml:5283), destructive | `svgTrash` | you created it or are an admin / owner, **and** you can write to it (`:128-130`) |

Delete asks "Are you sure you want to delete this list?" (`list_deletion_prompt`, yaml:11125) with "Yes, Delete List"
(`yes_delete_list`, yaml:24177, destructive) and "Cancel"; deleting goes back to the lists (`ListViewInteractor.swift:1701-1733`).

---

## 4. New Huddle (from + Create, and the Huddles page "+")

- Both open the same `UserConversationPickerFeature` (`Modules/Features/CreationEntryPoints/Implementation/CreationEntryPointsHandler.swift:110-186`;
  `Modules/Features/HuddlesPage/Implementation/HuddlesPageFeature.swift:190-250`): single select, frecent people, group DMs
  and channels you're in (no bots, Slackbot, archived or frozen channels; the Huddles page also includes cross-workspace
  channels), yourself excluded, `.small` rows, search mode. + Create presents it with `.dismissesAllModals`.
- Presentation: a form sheet (full height on iPhone) in a navigation controller (`UCP/UserConversationPickerFeature.swift:155-157`):
  title "New Huddle" (`new_huddle_menu_option`, yaml:12828; Lato Bold 17, set with `configureDetailTitle`,
  `UCP/UserConversationPickerViewController.swift:143-146`; `Modules/UIInfra/Architecture/Implementation/Helpers/UnifiedNavigationTitleConfigurator.swift:120-129`),
  an automatic SF `xmark` close button on the left (`Modules/UIInfra/Architecture/Implementation/Navigation/ModalPresentationController.swift:314, 400-420`),
  nothing on the right.
- An SKSearchView under the bar: 16 / 12 pt insets, the field radius 12, 1 pt `outlineTertiary` border, `baseSecondary`
  fill, "Search" (`search`, yaml:17029) and the magnifier in `contentTertiary`; a 1 px (`UIUtilities.onePixel()`) rule
  below in `outlineTertiary` (`UCP/UserConversationPickerViewController.swift:29-36, 150-215`). Measured
  `DeveloperComponentsTests.SKSearchViewSnapshotTests/testSearchViewWithoutCancelAndSeparator@3x.png`: 66 pt view, 42 pt field.
- One section, no header: up to 100 frecent conversations, then search results; `#` limits to channels, `@` to people
  (`UCP/UserConversationPickerDataTypes.swift:89-95`). Rows: SKMemberEntity `.small` (24 pt avatar + presence, bold name),
  SKChannelEntity `.small` (filled #/lock), SKMultiPersonDirectMessageEntity `.small`; no accessories.
- Empty: `emoji_no_results` + "No conversation found" (yaml:12942); no matches: "No conversation matches these keywords."
  (yaml:12945) + "Clear search" (yaml:4063) (`UCP/UserConversationPickerPresenter.swift:354-424`).
- **No confirm button**: tapping a row (a person resolves to the DM) opens the start preview (`HuddlesPreviewRoute`
  `.huddlesPageStart`, `'huddle'` in `search-slackbot-huddles.md` §3.2; `CreationEntryPointsHandler.swift:163-183`) on top
  of the picker; "Huddle" there starts the call, and the huddle sheet is presented with `.dismissesAllModals`, closing the
  picker (`Modules/Features/Handlers/Huddles/Implementation/HuddlesSessionManager.swift:586-589, 726-728`). Already in a
  huddle elsewhere: "Oops!" / "You’re already in a huddle. Leave the huddle you’re in to start a new one."
  (yaml:14025 / 22916).

---

## 5. Select Text

`TC/TextCopyingFeature.swift:23-167`, `TC/TextCopyingViewController.swift:13-94`, `TC/TextCopyingPresenter.swift:15-137`;
opened from message actions › "Select Text".

- A native sheet, detents **500 pt** (custom) and large, **grabber visible**, in a navigation controller (TC/Feature:23-50);
  no close button (`.sheet` presentations don't get the automatic one, `ModalPresentationController.swift:215-245`). It
  moves to the large detent when the content is taller than 500 pt; scrolling is on only at the large detent
  (TC/Feature:125-147, 159-166; `TextCopyingViewController.swift:34-41`).
- Nav title "Select Text" (`select_text`, yaml:17392), set with `configureDetailTitle` — Lato Bold 17
  (`TC/TextCopyingViewController.swift:16`).
- Content, an MKMessagesAndEntitiesList: an 8 pt blank divider, the message row (author header, **no** status emoji,
  reactions, attachments, unfurls or "(edited)"; the text in a selectable text view, **all of it pre-selected when the
  message has a single block**), an 8 pt footer with a hairline, an 8 pt blank divider, "Copy all text" (`copy_all_text`,
  yaml:4686, `svgText` in `contentPrimary`, SKGenericEntity `.small`), an 8 pt blank divider (TC/Presenter:32-136; a
  "Copy Image(s)" row exists but is switched off, :81-82; blank divider 8 pt = `SKListFooterView.Constants.topMargin`,
  `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:2067-2083`).
- The selection's edit menu offers only **Copy** and **Share** (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/Label/SKLabel.swift:1105-1113`);
  Copy copies the selection and dismisses the sheet; "Copy all text" copies the whole message and dismisses (TC/Feature:112-124).
  The copy shows "Copied" (`copied`, yaml:4671) with `toast_checkmark` (`CopyPasteHandler.swift:255-262, 405`).

---

## 6. Reference PNGs

The Canvas and Lists tests below also have `iOS_27` copies, pixel-identical to iOS_26 (no glass in these views), so
either baseline serves (the canvas outline ones differ by a few pixels); DateTimePicker has no iOS_27 set.

| PNG (under `Modules/`) | Shows |
|---|---|
| `Features/Canvas/Snapshots/iOS_26/CanvasFeatureTests.CanvasViewControllerViewTests/test_view_with_templateBanner@3x.png` | the floating template banner (indigo, ✕) |
| `Features/Canvas/Snapshots/iOS_26/CanvasFeatureTests.CanvasLoadingStateViewTests/testView@3x.png` | the open-canvas skeleton |
| `Features/Canvas/Snapshots/iOS_26/CanvasFeatureTests.FileNoAccessOverlayViewTests/testAccessDeniedView@3x.png` | no access |
| `Features/Canvas/Snapshots/iOS_26/CanvasFeatureTests.CanvasEmbedSnapshotTests/*@3x.png` (new) | the SDK document with embeds: title placeholder, message / file / list / user / huddle / Tableau cards (§1.9) |
| `Features/Canvas/Snapshots/iOS_26/CanvasFeatureTests.CanvasOutlineSnapshotTests/*@3x.png` (new) | the outline overlay (flag `canvasOutline`, off; not built) |
| `Features/CanvasSynthetic/Snapshots/iOS_26/CanvasSyntheticFeatureTests.CanvasSyntheticViewControllerSnapshotTests/testView@3x.png` | the Canvases list (chips, sort, 56 pt rows) |
| `Features/Lists/Snapshots/iOS_26/ListsFeatureTests.ListKanbanFeatureSnapshotTests/testCellCreateShowCompleted@3x.png` | a card with the 20 pt to-do checkbox (16 / 16 inside the card, title from x 60.3) |
| `Features/Lists/Snapshots/iOS_26/ListsFeatureTests.ListKanbanFeatureSnapshotTests/testTodosGroupedBySelect@3x.png` | grouped cards, headers, dividers |
| `Features/Lists/Snapshots/iOS_26/ListsFeatureTests.ListRecordFeatureSnapshotTests/testSelectField_singleSelect@3x.png` | the item screen: title, Add a comment, select tag, Add field |
| `Features/Lists/Snapshots/iOS_26/ListsFeatureTests.ListRecordFeatureSnapshotTests/testWithCheckboxRowCompleted@3x.png` | the Completed button, checkbox row |
| `Features/Lists/Snapshots/iOS_26/ListsFeatureTests.ListRecordFeatureSnapshotTests/testPrimaryTextField_empty@3x.png` | "Untitled Item" |
| `Features/Lists/Snapshots/iOS_26/ListsFeatureTests.ListRecordFeatureSnapshotTests/test{Select,User,Date,Text}Field_*@3x.png`, `testCompletedField_*@3x.png` | the field rows, empty and filled (§3.3) |
| `Features/DateTimePicker/Snapshots/iOS_26/DateTimePickerFeatureTests.DateTimePickerSnapshotTests/testScreenshotDate@3x.png` | "Select a date": title row, inline calendar (§3.3) |
| `UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKMemberEntitySnapshotTests/testMemberEntitySmallWithUserDataActive@3x.png` | a picker person row (44 pt) |
| `UIInfra/DeveloperComponents/Snapshots/iOS_26/DeveloperComponentsTests.SKSearchViewSnapshotTests/testSearchViewWithoutCancelAndSeparator@3x.png` | the picker's search view |

---

## 7. Gaps

- **No snapshots** of: the canvas editing toolbar, the format picker, the "+" sheet, a canvas in edit mode, the new-canvas
  skeleton, the New Huddle picker, Select Text, the list Add Item pill, the item screen's nav bar and bottom bar, the text
  editor card, the person picker, the select pull-down. Their geometry is from code (above); UIKit chrome (Liquid Glass,
  the prominent Done circle, the edit menu, pull-down menus, sheet corners) has no values in Slack's source.
- **The canvas document** (fonts, line heights, margins, markers, checkboxes, caret, selection handles, placeholder styling)
  is the Quip SDK's; `CanvasEmbedSnapshotTests` show it once (§1.9) but no device screenshot pins it down. The clone's
  choices are listed in §1.9; the title uses `.headline` like H1 (no larger SKFont exists).
- Whether the SDK focuses a new canvas's title is unknown; the clone puts the caret in the title.
- The iOS 26 edit menu (Copy / Share) is drawn by UIKit; the clone draws it with its own glass platter styling.
- The date picker's calendar is UIKit's (measured from `testScreenshotDate@3x.png`, a June-era baseline the current tree
  still ships). Its month / year wheel isn't drawn.
- The list text editor's toolbar shows the formatting buttons but the prototype stores plain text (no rich text).
- Flag-gated and not drawn: the canvas and list Slackbot buttons (`slackbotInCanvas`, `slackbotInLists`), "Show outline"
  (`canvasOutline`), to-do / Saved menu items (`laterTodos`, `todosV2`), "Manage Access" (`fileManagePermissions`),
  "Attach record" (`slackforceReferenceRecord`), schema protection for "Add field" (`listsSchemaProtection`). The canvas's
  2 pt "access unknown" loading bar isn't drawn either: the demo knows every canvas's access at once.
- Report to Slack (canvas files, lists) needs the EU reporting rules, which the demo user doesn't meet.
- The demo data has no list with a completed column; the clone treats `SlackList.completedColumnId`, else a checkbox
  column named "Completed"/"Complete"/"Done", as the to-do completed column.
