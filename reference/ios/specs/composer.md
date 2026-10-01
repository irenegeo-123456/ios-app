# Composer (iPhone): message input, toolbar, formatting, attachments, pickers, New Message

> **Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Every citation was re-pointed to that checkout (792 parsed:
> 490 moved, 151 changed and re-read, 5 in files that are gone, 146 unchanged; yaml and `Colors.swift` lines too).
> What changed since June (cd22922):
> - **One layout:** the standalone context bar (June's `composerContextBar`, off by default, is gone with the in-card
>   banner): a 44 pt capsule, radius 22 in every state, controls 4 pt from its edge collapsed and 8 focused, 8 pt above the
>   tab bar or the keyboard, its sides on the tab bar's own inset (§1, §2, §14, §15).
> - **Modules moved:** most toolbar plugins now live in `Modules/Features/ComposerPlugins` and
>   `Modules/Features/ComposerCorePlugins`; the photo gallery in `Modules/Integration/PhotoGalleryComponent` (appendix).
> - **Colors:** toolbar icons `contentSecondary`; send and save `highlight2.baseInverse` (dark `#177e56`); formatting
>   close, selected mic, stop and recording done `highlight1.baseInverse` (dark `#0a77a7`); remove × `contentPrimary` on
>   `basePrimary`; "Also send to" `contentSecondary` / `content_highlight_1` / `contentPrimary` (§5-§7, §9, §10, §12).
> - **Disabled buttons look disabled:** every toolbar icon button reads its plugin's `enabled`, so "/" (while there's text),
>   Link and disallowed styles dim to 0.35 and take no taps; a disabled send takes no taps but stays at full opacity (§5.3, §6, §7).
> - **Slackbot DM** (Slackbot AI on): the focused row is just "+"; the "+" sheet gains Skills, Apps, Deep Research and Web
>   Search (§5.1, §16).
> - **Context bar:** bold spans are Lato Bold (was Black), labels wrap to 2 lines, it slides in without a fade (§14).
> - **Audio recording:** no banner and no full-screen overlay any more (§12).
> - **New, flagged off:** Header/Divider formatting, placeholder cycling, the tray's image-markup banner, glass buttons beside
>   the collapsed card (Radical Simplification only), the Slackbot tab's glow; new PNGs `ComposerGlassButtonsSnapshotTests`,
>   `ComposerAttachmentsViewSnapshotTests` (§0, §2.5, §2.6, §7, §9).

Measured from Slack's iOS source: `slack-objc-latest` (github.com/tinyspeck/slack-objc `main` @ `14b3cbaf`, 2026-09-30);
first written against the June snapshot (`slack-objc-main` @ `cd22922`). Paths are relative to the repo root; where
only a file name is given (`ComposerView.swift:193`), its full path is in the file index at the end. Colors give the
iOS token, then **light / dark** hex (design tokens `f76ac0a`, `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift`).
`@NN%` means the color at that alpha (`hex8` alpha byte ÷ 255). Snapshot PNGs are in the same checkout (Git LFS). Only
a few PNGs exist for this area (see §0), so most geometry comes from code. Anything measured from a PNG says so.

**Which variant to build.** On iOS 26 the composer is the **Liquid Glass** composer: `isLiquidGlassComposerEnabled`
is set to `true` whenever `#available(iOS 26.0, *)`
(`Modules/Features/Composer/Implementation/ComposerToolbar/ComposerToolbarFeature.swift:139-142`,
`Modules/Features/AnyConversation/Implementation/AnyConversationPresenter.swift:433-436`). Its only layout is now the
**standalone context bar** one: June's `composerContextBar` toggle (`ios_composer_context_bar.json`, default off) is
gone, and with it the banner inside the card (§14); a 44pt capsule with the context bar as its own capsule above it.
This spec describes that layout; where June's in-card layout differed it's kept as *June:* history. Flags that still
change the composer, all `"defaultValue": false` in `Modules/Data/Toggles/Definitions/`:

- `bottomsheetMigration` (`ios_bottomsheet_migration.json:6`): with it off, the "+" sheet and the emoji/GIF sheet use
  Slack's own `SKBottomSheet` (§16, §17).
- `unifiedNavArch` / `unifiedNavArchSingleStack` (`ios_unified_nav_arch.json:9`, `ios_unified_nav_arch_single_stack.json:9`):
  the unified navigation roots change the card's bottom gap and side insets (§2.1); the Radical Simplification
  prototype on top of them adds glass buttons beside the collapsed card (§2.5). That prototype is a Preferences opt-in
  that "is not planned to ship to end users" (`Modules/Data/Toggles/Interface/NavigationArchitectureVariant.swift:150-158`).
- `richTextHeadersAndDividers` (`ios_rich_text_headers_and_dividers.json:6`): Header and Divider buttons in the
  formatting toolbar and the `#` / `##` / `###` line shortcuts (§7, §8).
- `cycleComposerPlaceholderText` (`ios_cycle_composer_placeholder_text.json:6`): placeholder changes cross-fade, and the
  Slackbot DM cycles its placeholder (§3.1).
- `imageMarkupTool` / `imageMarkupNux` (`ios_image_markup_tool.json:6`, `ios_image_markup_nux.json:6`): the tray's
  "Tap any photo to edit" banner (§9).

Production matches these defaults: a real iPhone in September (`reference/device/IMG_2247`) draws the full-width capsule
under the legacy tab bar, no side buttons (§2).

Pre-iOS 26 ("legacy") differences are listed in §2.4 only.

---

## 0. Sources and reference PNGs

Main code:

- Container and states: `Modules/Features/Composer/Implementation/Composer/ComposerViewController.swift`,
  `.../Composer/Views/ComposerView.swift`, `.../Composer/Views/ComposerViewConstants.swift`,
  `.../Composer/Views/ComposerGlassGeometry.swift` (radius and control insets), `.../Composer/ComposerDataTypes.swift`,
  `.../Composer/ComposerInteractor.swift`; the side glass buttons in `.../Composer/ComposerAccessoryLayout.swift`,
  `.../Composer/ComposerGlassButtonView.swift`, `.../Composer/ComposerAccessoryButton+PresentationObjects.swift`
- Toolbar: `.../ComposerToolbar/Views/ComposerToolbarView.swift`, `.../Views/ComposerToolbarContainerView.swift`,
  `.../Views/ComposerToolbarAnimator.swift`, `.../ComposerToolbar/ComposerToolbarLayoutManager.swift`,
  `.../ComposerToolbar/ComposerToolbarInteractor.swift`. The plugins left the Composer module in September:
  `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/*.swift` (send, "+", mic, cancel, stop, info,
  "/", attachments, scheduling, factory) and `Modules/Features/ComposerCorePlugins/Implementation/Plugins/*.swift` (Aa,
  the formatting buttons, emoji, @); button defaults in
  `Modules/Features/Composer/Interface/ComposerToolbar/Plugins/ComposerToolbarPluginType.swift`
- Text view: `.../ComposerInput/*` → `WysiwygTextInput` = `SKTextInput`
  (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/TextInput/SKTextInput.swift`), styles in
  `.../TextInput/TextProcessor/WysiwygTextProcessor+Config.swift`
- Attachments tray: `.../ComposerAttachments/Views/*`
- Placeholder copy: `.../MessageComposition/PlaceholderTextPublisher.swift`
- Buttons: `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/IconButton/SKIconButton.swift`,
  `.../DesignerComponents/Button/SKButton+Types.swift`

Reference PNGs (all @3x, ÷3 for pt):

| PNG | What it shows |
|---|---|
| `Modules/Features/Composer/Snapshots/iOS_26/ComposerFeatureTests.ComposerSendToChannelSnapshotTests/testDefaultComposerSendToChannelView@3x.png` | Thread option "Also send to **Test Channel**": 16pt checkbox + caption text, light mode. Test: `Modules/Features/Composer/Tests/Unit/ComposerSendToChannelViewSnapshotTests.swift` (view inset 10pt). Since June the unchecked box is #454447 `contentSecondary` (was #616061; `ComposerSendToChannelView.swift:176`), the only pixels that changed. |
| `Modules/Features/Composer/Snapshots/iOS_26/ComposerFeatureTests.ComposerGlassButtonsSnapshotTests/*@3x.png` (8, new) | The side glass buttons (§2.5) beside the pre-glass composer (glass doesn't render offscreen; test `Modules/Features/Composer/Tests/Unit/ComposerGlassButtonsSnapshotTests.swift`, 390 × 80, stubbed contents). `testCollapsed_bothButtons`: Slackbot mark (19.4pt ink) centred at x 22 and clock (18pt) at x 368 in 44pt slots, bottoms on the composer's bottom; the composer between them x 52–338 (8pt gaps). `…_slackbotOnly` / `…_quickSearchOnly` one side each; `…_noButtons`, `…_recording_hidesBoth`, `testExpanded_bothButtons_noButtons_fullWidth` full width. `testGlassCapsule_oneButton` 44 × 44, `…_twoButtons` 88 × 44 (measured). |
| `Modules/Features/Composer/Snapshots/iOS_26/ComposerFeatureTests.ComposerAttachmentsViewSnapshotTests/*@3x.png` (3, new) | The tray (§9), pre-glass, 390 wide (test `Modules/Features/Composer/Tests/Unit/ComposerAttachments/ComposerAttachmentsViewSnapshotTests.swift`). `testAttachments`: 76pt, one 64pt file thumbnail at (10, 10), its × centred 2pt in from the card's top-right corner (ink x 64.3–79.7, y 4.3–19.7). `…_markupBanner`: 115.7pt, + an info banner (`#e3f8ff`) x 10–380, y 84–115.7, "👆 Tap any photo to edit before sending" and an ×. `…_narrow`: 240 wide, the banner wraps (131.3pt). (measured) |
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKThumbnailAttachmentSnapshotTests/testAttachmentImageSmall@3x.png` | 64×64 image thumbnail as used in the tray. |
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKCompactAttachmentSnapshotTests/testAttachmentFile@3x.png` | Compact file card (PDF icon, bold title, subtitle). 60pt tall. |
| `Modules/UIInfra/ContextBarUI/Snapshots/iOS_26/ContextBarUITests.SKContextBarSnapshotTests/testTypingIndicator_ShortText@3x.png` | "Jason Winn is **typing…**" bar (the standalone context bar), 36pt tall. |
| `Modules/Integration/ContextBar/Snapshots/iOS_26/ContextBarServiceTests.ContextBarViewSnapshotTests/testContextBarView_DND_WithIcon@3x.png` | June's in-composer banner (ContextBarView), DND example (legacy, no longer drawn in the iOS 26 card). |
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmall@3x.png` | 44pt icon + "Title" row, the row style used in the "+" sheet. |
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKTokenViewSnapshotTests/testTokenResolvedMemberOrnament@3x.png` | Recipient token pill on the New Message "To:" field (avatar + bold name on blue). |

(The SlackKit component PNGs are now a 2 × 2 grid, light / dark rows × normal / high-contrast columns, e.g.
`testAttachmentImageSmall` 128 × 128 pt; June's stacked light over dark. The ContextBar PNGs are still single renders.)

No snapshot shows the real composer bar (collapsed row, focused toolbar, formatting toolbar: the glass-button tests stub
the contents), the "+" sheet or the New Message screen. Searched every `Snapshots/iOS_26`, `iOS_18` and `iOS_27` folder.

---

## 1. Anatomy and state machine

The composer is one glass card; the context bar (typing, DND, drafts…) is a separate glass capsule above it (§2, §14).
Inside the card is a vertical stack (`ComposerView.swift:132-145`):

```
[ handlebar 20pt ]            focused states only; invisible on iOS 26 (§2.3)
[ "Also send to #channel" ]   thread composer, focused only (§10)
[ text view ]                 focused states only (§4)
[ attachments tray 76pt ]     focused + has attachments (§9)
[ toolbar 44pt ]              always
```

In compact height (landscape) the tray sits above the text view (`ComposerView.swift:136-139`). Stack spacing is 0
except 12pt after the send-to-channel row (`ComposerViewConstants.sendToChannelViewSpacing = 12`,
`ComposerViewConstants.swift:25`) and 16pt after the attachments tray, 8 in compact height (`attachmentsViewSpacing = 16`,
`:26`; `ComposerView.swift:141-144`). *June:* a banner row at the top of the card (§14); gone.

Composer style (`ComposerDataTypes.swift:86-98`): `collapsed`, `standard`, `animatingToLongform(progress)`,
`longform`. The **toolbar** state drives it (`ComposerInteractor.swift:325-346`):

| Toolbar state | Composer style | What's visible |
|---|---|---|
| `.collapsed` (not focused) | `collapsed` | One row: "+", placeholder/draft preview, mic or send. Text view, attachments, handlebar hidden (`ComposerView.swift:187-191`). |
| `.expanded` (text view focused) | `standard` | Text view above a row of 5 tool buttons + send (`ComposerView.swift:202-208`). |
| `.wysiwyg` (formatting) | `standard` | Text view above the formatting toolbar (§7). |
| `.audioCollapsed` / `.audioExpanded` | unchanged / collapsed | Recording row (§12) (`ComposerInteractor.swift:334-343`). |

Transitions:

- Focusing the text view → `.expanded`; losing focus → `.collapsed`
  (`ComposerToolbarInteractor.swift:277-285`). Collapsing keeps the typed text; the collapsed row then shows the
  draft text instead of the placeholder (`Modules/Features/Composer/Implementation/MessageComposition/MessageCompositionManager.swift:648-658`)
  and a green send button (§6).
- Tapping the placeholder/preview label in the collapsed row sends `.composeMessage` → `.expanded`
  (`ComposerMessagePreviewPlugin.swift:26-28`, `ComposerToolbarInteractor.swift:343-346`), and `.expanded` makes the
  text view first responder (`ComposerInteractor.swift:337-340`). Swipe up on the collapsed composer does the same
  (`ComposerInteractor.swift:412-415`).
- Swipe down on the focused composer (only when the text view is scrolled to the top) resigns focus
  (`ComposerViewController.swift:812-817`, `ComposerInteractor.swift:417-419`).
- Adding the first attachment forces `.expanded` (`ComposerToolbarInteractor.swift:297-304`). Starting an edit forces
  `.expanded` (`:290-295`).
- After sending, the composer stays in whatever style it had (collapsed stays collapsed, otherwise `standard`)
  (`ComposerInteractor.swift:348-353`).
- With side glass buttons (§2.5 only), collapse and expand run as one smooth/fast spring for the card's height, its
  edges and the buttons; a collapse blanks the card's contents and fades them back in over 0.09s after 0.1s
  (`ComposerViewController.swift:569-636`). Without them (production) the style change has no spring of its own.

---

## 2. The glass card (iOS 26)

**Production (device screenshots, Sept 2026).** A real iPhone 17 Pro Max (`reference/device/IMG_2247–2248`, measured,
dark) draws the **standalone context bar** layout, which the Sept checkout (slack-objc-latest @ 14b3cbaf) makes the only
one (`ios_composer_context_bar` is gone):

- collapsed: a **44 pt** capsule (insets 0 / 0, `ComposerView.swift:193-196` [Sept]), radius **22** (36 / 2 + 4,
  `ComposerGlassGeometry.swift:21`, `:35-37`), **x 21–419**: the tab bar's own inset, read from its first and last items
  (`ComposerViewController.swift:282-292`, `:344-348`; 16 is the fallback with no tab bar), y 821–865: its bottom **8 pt**
  above the tab bar (`ComposerViewController.swift:417-425`, `:455`; `liquidGlassBottomPadding = 12` is declared but unused);
- controls **4 pt** from the capsule's edges (`ComposerGlassGeometry.swift:56-64`): the "+" (x 25–61) in
  `surfacePrimary` with a `contentSecondary` icon (`defaultPluginButton`, `ComposerToolbarPluginType.swift:88-104`;
  `ComposerOmnipickerPlugin.swift:224`), the placeholder at 4 + 36 + 8 = 48 (`ComposerToolbarView.swift:184-185`), the
  mic `contentSecondary` (`ComposerAudioPlugin.swift:53-55`) 4 pt from the right; toolbar icons default to
  `contentSecondary` (`ComposerToolbarPluginType.swift:68`);
- focused: insets 0 / 4, radius 22, sides 8, the first button 8 in;
- the **context bar** (typing, DND, time zone, Slack Connect, drafts, coachmarks…) is its own interactive glass capsule in
  the bottom drawer, 6 pt above the card, with the composer's side margins (21 / 8), ≥ 36 tall, 6 / 12 padding, caption 13
  `contentPrimary` (`ContextBarContentPlugin.swift:78-95`, `ContextBarBottomDrawer.swift:77-130`, `SKContextBar.swift:38-41`,
  `:66-77`, `:136-152`); "Also send to #channel" stays in the card;
- dark glass measured: (25,26,29) over the list's (25,28,32), rim (56,61,69) → (47,51,58) → (40,42,48), "+" (36,39,41).

The clone draws this (`src/app/composer`, flag `composerContextBar` in `src/app/flags.ts`); flag off gives June's
in-card layout (60 pt card, 12 pt gap, radius 26, the banner inside the card), noted as *June:* below.

### 2.1 Material and placement

- **Material:** a `UIVisualEffectView` with `UIGlassEffect()` (regular style), `isInteractive = true`
  (`ComposerViewController.swift:138-157`), inside a `UIGlassContainerEffect` container (spacing 8) that the side glass
  buttons (§2.5) share (`:160-176`, `:447-474`). There's no Slack color token for it; every background inside it is
  clear: `ComposerBackgroundView` (`ComposerBackgroundView.swift:16-20`), the text view (`ComposerInputViewController.swift:72`),
  the attachments tray (`ComposerAttachmentsView.swift:142-145`). No border is drawn in glass mode
  (`ComposerContainerView.swift:73-76`, `:90-91`). For the web clone this is a translucent blurred surface; the exact
  glass rendering isn't reproducible from tokens.
- **Corner radius:** **22pt**, uniform, collapsed and focused alike: `ComposerGlassGeometry.containerCornerRadius` =
  control 36 / 2 + the collapsed control inset 4 (`ComposerGlassGeometry.swift:21`, `:35-37`, `:56-64`), set once from the
  collapsed geometry and never updated (`ComposerViewController.swift:130-144`, `:165-166`). *June:* 26 (8 + 18, with the
  banner inside the card); 22 only with the standalone bar.
- **Bottom:** the card's bottom sits **8pt** above the bottom of the composer's host view
  (`liquidGlassStandaloneContextBarBottomSpacing = 8`, `ComposerViewConstants.swift:50`; `ComposerViewController.swift:413-429`,
  `:455`); `liquidGlassBottomPadding = 12` (`:48`) is no longer used. The host view's bottom is the safe-area bottom
  (above the tab bar) when the keyboard is down and the keyboard's top when it's up (§15). Unified single-stack
  navigation (flagged off) instead drops the card into the bottom safe area: max(16, ⅔ × bottom safe area)
  (`ComposerViewController.swift:431-445`). *June:* 12.
- **Sides** (`ComposerViewController.swift:280-355`): collapsed, the tab bar's own leading/trailing inset
  (`LiquidGlassTabBarAlignedInsets.compute`, `Modules/UIInfra/SlackKit/Implementation/Helpers/LayoutConstraints/CustomConstraintHelpers.swift:42-70`,
  observed at `ComposerViewController.swift:302-324`), **16pt** when there's no tab bar (`:296`, `:344-345`); focused,
  min(8, that) = **8pt** (`:346-349`). Some screens (CatchUp) use a fixed 12pt (`:297`, `:341-343`); single-stack
  navigation uses max(16, ⅔ × bottom safe area) (`:350-353`). The insets go on the glass container and are published so
  the context bar's drawer matches them (`:326-335`; `ContextBarBottomDrawer.swift:115-120`). The change applies with the
  next layout pass; there's no dedicated animation for it (`:89-96`).
- **Longform:** the glass content gets an opaque `CoreColorSet.primary.basePrimary` (`dt_color_base_primary`
  **#FFFFFF / #1A1D21**) background, fading in with the drag progress, under an elevated trait so true-dark and
  high-contrast dark get the elevated background instead of black (`ComposerViewController.swift:61-81`).

On a 393pt-wide iPhone without a tab bar: collapsed card x = 16…377 (361 wide); focused card x = 8…385 (377 wide).
Under a tab bar the collapsed card takes its inset (21pt on the 440pt device, above).

### 2.2 Inner insets

| State | Top | Bottom | Source |
|---|---|---|---|
| Collapsed (glass) | 0 | 0 | `ComposerView.swift:193-196`: the card is the 44pt toolbar |
| Focused (standard/longform) | 0 | 4 | `ComposerView.swift:202-207`, `standardStyleBottomInset = 4` (`ComposerViewConstants.swift:28`) |
| Collapsed, pre-iOS 26 | 8 | 8 | `ComposerView.swift:197-200`, `collapsedStyleTopInset/BottomInset = 8` (`ComposerViewConstants.swift:24`, `:27`) |

*June:* the iOS 26 collapsed card was 8 / 8 (8 / 4 with a banner) unless the standalone bar was on.

Horizontal insets live in the toolbar (§5): **4pt** from the card edge to the first/last button while collapsed
(`liquidGlassCollapsedStyleInset`, `ComposerViewConstants.swift:52`), **8pt** while focused or formatting
(`liquidGlassExpandedStyleInset`, `:54`), chosen by `ComposerGlassGeometry.controlInset(for:)` (`ComposerGlassGeometry.swift:56-64`;
the recording states take 4) and read by `ComposerToolbarView.swift:127-132` and `ComposerToolbarContainerView.swift:173-178`.
*June:* 8 in every state.

**Heights (derived):** collapsed = **44pt**. Focused with one line of text = 0 + 20 (handlebar) + 36.4 (text view, §4)
\+ 44 (toolbar) + 4 = **~104pt**. Text view caps at 134pt (§4), so the tallest standard composer without attachments is
~202pt. *June:* collapsed 8 + 44 + 8 = 60pt.

### 2.3 Handlebar (drag handle)

- 20pt-tall tap area, shown only in focused/longform styles (`handlebarDragIndicatorTapAreaHeight = 20`,
  `ComposerViewConstants.swift:30`; `ComposerHandlebarView.swift:34-36`; hidden in collapsed, `ComposerView.swift:191`).
- In glass mode the 48×4 pill is **clear** (invisible) (`ComposerHandlebarView.swift:55-56`). The 20pt of space still
  exists. Tapping it toggles longform (`ComposerView.swift:253-261`, `ComposerViewController.swift:785-787`).
- A11y label "Expand input" / "Collapse input" (`drag_handle_a11y_expand` / `drag_handle_a11y_collapse`,
  `ComposerHandlebarView.swift:101-107`).

### 2.4 Legacy (pre-iOS 26) differences

- Full-width composer, no glass. 1pt top border `outlineTertiary` (#5E5D60@13% / #797C81@30%) with 16pt rounded top
  corners, fill `basePrimary` (#FFFFFF / #1A1D21) (`ComposerContainerView.swift:37-43`, `:90-112`;
  `largerCornerRadius = 16`, `ComposerViewConstants.swift:32`). *June:* `sk_foreground_low` border, `sk_primary_background` fill.
- Visible drag pill 48×4, `outlineSecondary` (#5E5D60@45% / #797C81@50%), radius 2, centred 2pt above the middle
  of the 20pt area (`ComposerHandlebarView.swift:55-60`, `:92-95`; `ComposerViewConstants.swift:35-36`). *June:*
  `sk_foreground_mid` (#1D1C1D@30% / #D1D2D3@30%).
- Toolbar side inset 12pt (2 × 6) instead of 4 / 8 (`ComposerToolbarView.swift:24`, `:157`, `:166`).
- Toolbar state changes slide vertically by 2× the toolbar height; in glass the slide distance is 0
  (`ComposerToolbarAnimator.swift:23-32`).

### 2.5 Side glass buttons (Radical Simplification prototype only)

Not in production: only `NavigationArchitectureVariant().isRadicalSimplification` conversations get them
(`Modules/Features/AnyConversation/Implementation/AnyConversationPresenter.swift:449-452`), "which strips the tab bar's
search and Slackbot entry points and rehosts them beside the collapsed composer"; every other variant passes none
(`Modules/Data/Toggles/Interface/NavigationArchitectureVariant.swift:27-66`, default `.legacy`, `:130-145`).

- Two buttons (`Modules/Features/Composer/Interface/ComposerAccessoryButton.swift:5-24`): **Slackbot** on the leading
  edge (`svgSlackbotColor` → `slackbot_color.svg`, full color, icon scale 1.2 so the mark is 24pt; a11y "Ask Slackbot",
  `ask_slackbot` yaml:2124; tap opens Slackbot, long-press too) and **quick search** on the trailing edge (`svgClock` →
  `clock.svg`, `contentPrimary`; a11y "Search", `search` yaml:17031) (`ComposerAccessoryButton+PresentationObjects.swift:31-60`;
  `ComposerViewConstants.swift:20`).
- Each is its own interactive glass capsule, **44 × 44** per button, the buttons non-glass inside it
  (`ComposerGlassButtonView.swift:21-52`; `composerGlassButtonSize = 44`, `ComposerViewConstants.swift:17`); it rides the
  glass container's edge (so the tab-bar inset), its bottom on the card's bottom, and the card shrinks to leave **8pt**
  (`composerGlassButtonSpacing`, `:15`; `ComposerAccessoryLayout.swift:89-139`). Measured in the snapshots (§0).
- Shown only while collapsed and not recording; the trailing one only at compact width (`ComposerAccessoryLayout.swift:166-180`).
  Expanding retracts them: each scales to 0.01 while sliding onto the card's edge (smooth/fast spring), its icon fading
  over 0.11s; appearing reverses it, the icon fading in over 0.11s after 0.045s (`ComposerGlassButtonView.swift:67-123`;
  `ComposerAccessoryLayout.swift:199-218`).

### 2.6 Slackbot glow (the Slackbot tab only)

The Slackbot tab's composer (`Modules/Features/Slackbot/Implementation/SlackbotInteractor.swift:229-237`) gets a soft halo:
a conic gradient #36C4F0 → #2EB57D → #EDB22E → #E01E59 → #36C4F0 starting at the trailing edge, at 32% opacity, blurred
12px, reaching 12pt past the composer and cleared inside it (`Modules/Features/Composer/Implementation/Composer/Views/ComposerSlackbotGlowView.swift:9-110`;
placed behind the card at `ComposerViewController.swift:476-489`). Conversations don't get it.

---

## 3. Collapsed (resting) state

Row layout inside the 44pt toolbar (`ComposerToolbarLayoutManager.swift:141-198`):

`[ + ]  Message #general…                                  [ mic ]`

- **"+" button** (left): 36×36 circle, **4pt** from the card's left edge, vertically centred
  (`ComposerToolbarView.swift:150-185`). Details in §5.
- **Placeholder / draft preview** (middle): a one-line label (`numberOfLines: 1`, `ComposerToolbarView.swift:639-646`)
  that starts 4 + 36 + 8 = **48pt** from the card's left (`ComposerToolbarView.swift:184-185`) and ends 48pt from the
  right when there's one right button (8 + 36 + 4, `:332-340`). Its hit area is stretched to the full 44pt toolbar height
  (`ComposerPlaceholderView.swift:134-141`). *June:* 52 / 52 (8pt insets).
  - Placeholder text: **Lato Regular 17** (`SKFont.body`), color `CoreColorSet.primary.contentTertiary`
    (`dt_color_content_tertiary` **#5E5D60 / #9A9B9E**) (`PlaceholderTextPublisher.swift:60`, `:175`, `:218-219`).
  - Draft text (when there's text but no focus): the typed text, with fallback color `contentSecondary`
    (**#454447 / #B9BABD**) and body font capped at 24pt for Dynamic Type (`ComposerToolbarView.swift:621-638`).
    Which one shows: `MessageCompositionManager.swift:648-658` (draft if non-empty, else placeholder).
  - VoiceOver treats it as a text field labelled "Message" (`R.strings.message`, `ComposerPlaceholderView.swift:26-32`).
  - With `cycleComposerPlaceholderText` on, a changed placeholder cross-fades out and in, 0.3s ease-in-out each way
    (`ComposerPlaceholderView.swift:95-132`; `Modules/UIInfra/SlackKit/Implementation/Extensions/UIViewPropertyAnimator+PlaceholderCrossfade.swift:13-21`).
- **Right side**, first match wins (`ComposerToolbarLayoutManager.swift:163-197`):
  1. Channel has highlighted workflows → a workflow button row replaces "+" and the label; right = compose
     button (not covered further).
  2. An AI reply is streaming → **stop** button (§5).
  3. Text isn't empty → **send** button, green (§6). The collapsed toolbar then ends 48pt from the right
     (`ComposerToolbarContainerView.swift:405-411`, `expandedToolbarSendButtonOffset = 36 + 12`, `:30-32`), so the label
     ends 48 + 4 = 52 from the edge, and the send button sits **4pt** from the card edge (`:340-351`, `:355`).
  4. Has attachments but no text → **attachment count chip** + send (§9).
  5. Slackbot DM, not in a call → the two-way voice button if offered, else the voice-transcription button (both
     flagged; not covered further).
  6. Otherwise → **microphone** (record audio clip), hidden during a call (`:193-197`).
- **Can't post** (read-only/announcement channel, archived, locked thread): the row shows "+"/label and, on the
  right, an info "?" button (`ComposerToolbarLayoutManager.swift:338-349`, `ComposerInfoPlugin.swift:32-38`); the
  placeholder becomes the destination error message (`PlaceholderTextPublisher.swift:183-185`).

### 3.1 Placeholder copy (`PlaceholderTextPublisher.swift`)

| Where | Text | Key | Line |
|---|---|---|---|
| Public channel | "Message #general" | `message_x` = "Message %@" (yaml:12300) with `#name` | `:210-220` |
| Private channel / group DM | "Message secret-plans" (no # or lock) | `message_x` | `:213-214` |
| DM | "Message Jane Doe" + a space + her status emoji (grayscale, still) + status text | `message_x` | `:222-251` |
| DM with yourself | "Jot something down" | `jot_something_down` (yaml:10467) | `:226-228` |
| Slackbot DM with AI on | "Ask Slackbot anything..." | `ask_slackbot_anything` (yaml:2127) | `:230-232` |
| Thread reply | "Add a reply" | `add_a_reply` (yaml:682) | `:197-198` |
| Thread in a canvas channel | "Add comment" | `add_comment_sentence_case` (yaml:725) | `:197` |
| No conversation yet (New Message, before a recipient) | "Write a message" | `writeAMessage` (yaml:23924) | `:174-176` |

The iOS thread placeholder is "Add a reply", not "Reply…". Editing the thread's root message uses the channel
placeholder (`:187-195`). With `cycleComposerPlaceholderText` and Slackbot voice transcription both on, the Slackbot DM
alternates "Ask Slackbot anything..." and "Tap 🎤 to talk instead of type" (`ask_slackbot_tap_mic_to_talk`, yaml:2134;
the mic is an inline icon) every 4s, and holds the first under VoiceOver (`:116-171`;
`ComposerFeature+Dependencies.swift:203`).

---

## 4. Focused state and the text view

Layout (top to bottom): 20pt handlebar space, [send-to-channel row], text view, [attachments], toolbar
(`ComposerView.swift:136-140`).

**Text view** (`SKTextInput` configured by `ComposerInputPresenter.swift:123-143`):

| Property | Value | Source |
|---|---|---|
| Padding inside the text view | top **4**, left **12**, bottom **12**, right **12** | `ComposerInputDataTypes.swift:16-18`, applied at `SKTextInput.swift:278` |
| Line fragment padding | 0 | `SKTextInput.swift:376-381` |
| Font | **Lato Regular 17** (`.custom(style: .regular, size: 17)`) | `WysiwygTextProcessor+Config.swift:72-74`, typing attrs `:59-63` |
| Line height | 20.4pt (Lato hhea 1974 + 426 over 2000 upem × 17). CSS `line-height: 1.2`. | measured from `Modules/Data/Font/ResourceBundle/Font/Lato/Lato-Regular.ttf` |
| Text color | `CoreColorSet.primary.contentPrimary` = `dt_color_content_primary` **#1D1C1D / #F8F8F8** | `WysiwygTextProcessor+Config.swift:106`; Colors.swift:200 |
| Placeholder | same string as §3.1, Lato Regular 17, `contentTertiary` **#5E5D60 / #9A9B9E**, 1 line (2 at accessibility text sizes), placed at the same 4/12 inset, hidden once text exists; cross-fades on change with `cycleComposerPlaceholderText` | `ComposerInputPresenter.swift:75-79`, `:141`; `SKTextInput.swift:284-300`, `:710-719`, `:721-738` |
| Height | grows with content; scrolls after **134pt** | `maximumStandardHeight = 134`, `ComposerViewConstants.swift:43-44`; `ComposerInputPresenter.swift:134`; `SKTextInput.swift:383-396` |
| Max length | 12,000 characters | `ComposerInputPresenter.swift:18-20`, `:140` |
| Background | clear (glass) | `ComposerInputViewController.swift:72` |
| Caret/tint color | not set in the composer (system default) | not found (looked in `ComposerInputViewController.swift`, `SKTextInput.swift`) |
| Return key | on-screen Return inserts a newline (no `returnKeyType` override found in `SKTextInput.swift` or the Composer module). A hardware-keyboard Return sends, unless the user's "send button new line" pref is set; Shift+Return is a newline | `ComposerInputInteractor.swift:529-545`, `:680-685` |

One line of text: 4 + 20.4 + 12 = **36.4pt** tall. At the 134pt cap the text view shows (134 − 16) / 20.4 ≈ **5¾ lines**
before it scrolls (derived).

---

## 5. Toolbar and its buttons

### 5.1 Geometry

- Toolbar height **44pt** = 36pt button + 8pt (`ComposerToolbarView.swift:25-29`, `:371`).
- Buttons are **36×36** (`buttonSize = 36`), constrained explicitly (`ComposerToolbarView.swift:178-179`, `:237-238`,
  `:335-336`; `ComposerToolbarContainerView.swift:21`, `:378-386`); the composer overrides `SKIconButton`'s 40pt
  `.small` (`ComposerGlassGeometry.swift:17-21`; `SKIconButton.swift:428-445`). The circle fills the button: diameter
  36, radius 18 (`SKIconButton.swift:711-719`). Icons are **20×20**, centred (`SKIconButton.swift:447-449`, `:718-719`).
- Scrollable button row: horizontal `UIStackView`, **5pt** spacing, centred vertically, inside a scroll view with no
  scroll indicators (`ComposerToolbarView.swift:23`, `:34-55`). It scrolls horizontally if the buttons don't fit.
- Row leading inset: the state's control inset, 4pt collapsed / 8pt focused (`ComposerToolbarView.swift:157`, `:166`,
  `:184-200`; §2.2).
- Send button: its own 36×36 view pinned that inset from the card's right edge, 4 collapsed / 8 focused
  (`ComposerToolbarContainerView.swift:340-351`, `:355-358`, `:378-381`). The focused toolbar reserves 36 + 12 = **48pt**
  on the right for it (`ComposerToolbarContainerView.swift:30-32`, `:118-120`).

Focused toolbar order (`ComposerToolbarLayoutManager.swift:200-202`):

`[ + ] [ Aa ] [ ☺ ] [ @ ] [ / ]  ………  [ send ]`

x positions from the card's left edge: + 8–44, Aa 49–85, ☺ 90–126, @ 131–167, / 172–208; send ends 8pt from the
right edge (on a 393pt screen, card width 377 → send 333–369). Derived from the constants above.

Changes to the order:
- Editing a sent message (without the attachment-editing flag): "/" is removed, and "+" too unless it's a scheduled
  draft (`ComposerToolbarLayoutManager.swift:218-223`); a red cancel button sits left of the send button (§11).
- Slackbot DM: with Slackbot AI on, the row is just "+" (plus the voice button on the right when voice transcription is
  on); without it, "/" is removed (`:205-217`). *June:* "/" removed, and "+", skills, MCP, "@" behind the Skills/MCP flags.
- AI agent threads keep only formatting, emoji, @, send (`:389-426`).
- A coding-channel agent toggle (flag `codingChannelComposerAgentToggle`, default off) replaces the row, with "+" on the
  left (`:224-236`).
- If the user's "Format messages with markup" preference is on, the Aa button is removed
  (`ComposerToolbarInteractor.swift:878-889`).

### 5.2 Button reference

Defaults for every toolbar button unless listed (`ButtonPresentationObject.init`,
`Modules/Features/Composer/Interface/ComposerToolbar/Plugins/ComposerToolbarPluginType.swift:68`): icon color
`contentSecondary` **#454447 / #B9BABD** (disabled the same); selected/pressed icon `sk_sky_blue` **#1D9BD1**;
background clear; selected background clear. *June:* icon `sk_foreground_max_solid` #616061 / #9A9C9E. `sk_sky_blue` is
`Modules/Data/Color/Implementation/SKLegacyColors.swift:232`.

| Button | Icon (manifest → svg) | Colors | A11y label (key, yaml line) | Tap / long-press | Source |
|---|---|---|---|---|---|
| **+** (attachments & shortcuts) | `svgPlus` → `plus.svg` | `defaultPluginButton`: icon `contentSecondary`, disabled `outlineSecondary`; bg `surfacePrimary` **#1D1C1D@6% / #F8F8F8@6%**; pressed bg `surfaceSecondary` **#1D1C1D@25% / #F8F8F8@25%**, icon unchanged (`ComposerToolbarPluginType.swift:88-104`). *June:* bg `baseTertiary` #EAEAEA / #212428 | "Attachments and shortcuts" (`composer_omnipicker_button`, 4435) | opens the "+" sheet (§16). A 10×10 `circleFill` dot in `highlight1.content` **#1264A3 / #2BA5CE** at the top-right can appear as an edit-attachments tip (`ComposerToolbarView.swift:428-453`; *June:* `sk_sapphire_blue`) | `ComposerOmnipickerPlugin.swift:220-225`, `:143-180` |
| **Aa** (formatting) | `svgFormatting` → `formatting.svg` | defaults | "Show formatting" (`edit_menu_item_format_button_composer_ia`, 6043) | opens the formatting toolbar (§7) | `ComposerTextFormattingPlugin.swift:64-88` |
| **Emoji** | `svgEmoji` → `emoji.svg` | defaults | "Emoji picker" (`emoji_picker_sentence_case`, 6237) | opens the Emoji/GIF sheet (Emoji tab) if the team allows GIFs, else the emoji picker (§17); since September also while editing | `ComposerEmojiPlugin.swift:43-80`, `:99-104` |
| **@** | `svgMentions` → `mentions.svg` | defaults | "Mention someone" (`at_mention_composer_ia`, 2228) | inserts/opens the @ autocomplete (§18) | `ComposerMentionPlugin.swift:27-41` |
| **/** | `svgSlashBox` → `slash_box.svg` | defaults; disabled (alpha 0.35, §5.3) while there's text | "Run a slash command or workflow." (`run_slash_command_or_workflow`, 16739) | opens the / command autocomplete | `ComposerSlashCommandPlugin.swift:23-46`; `ComposerToolbarInteractor.swift:446-456` |
| **Mic** (collapsed only) | `svgMicrophone` → `microphone.svg`; selected `svgMicrophoneFilled` | no circle while collapsed; selected icon white, selected bg `highlight1.baseInverse` **#1264A3 / #0A77A7** (*June:* `sk_highlight` #1264A3 / #1D9BD1) | "Record audio clip" (`record_audio_clip`, 15858) | tap or long-press starts recording (§12) | `ComposerAudioPlugin.swift:30-57` |
| **Send** | `svgSendFilled` → `send_filled.svg` | see §6 | "Send" (`send`, 17431); VoiceOver action "Schedule message" | tap sends; long-press opens Schedule message (§13) | `ComposerSendPlugin.swift:57-60`, `:64-99`, `:124-138` |
| **Save edit** (send while editing) | `svgCheck` → `check.svg` | same green as send | "Save" (`save`, 16882) | commits the edit | `ComposerSendPlugin.swift:161-177` |
| **Cancel edit** | `svgClose` → `close.svg` | icon white, bg `sk_raspberry_red` **#E01E5A** | "Cancel" (`cancel`, 3204) | ends editing | `ComposerCancelEditingPlugin.swift:33-40` |
| **Stop** (AI streaming) | `svgStopFilled` → `stop_filled.svg` | icon white, bg `highlight1.baseInverse` **#1264A3 / #0A77A7** (*June:* `sk_highlight`) | "Stop Response" (`stop_response`, 20737) | stops the AI reply | `ComposerStopStreamingPlugin.swift:31-45` |
| **Info** (can't post) | `svgHelp` → `help.svg` | defaults | "Learn More" (`learn_more`, 10722) | shows why you can't post | `ComposerInfoPlugin.swift:26-38` |

Svg files are 20×20 viewBox (e.g. `Modules/Data/Icon/ResourceBundle/Icons.xcassets/send_filled.imageset/send_filled.svg`).
Manifest → file mapping: `Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift` (e.g. `svgPlus` →
"plus.svg" at :4096, `svgSendFilled` → "send_filled.svg" at :4154). `highlight1.baseInverse` is
`dt_color_base_inverse_highlight_1`, `highlight2.baseInverse` `dt_color_base_inverse_highlight_2`
(`Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:79-94`; Colors.swift:98, :104).

### 5.3 Button states (all toolbar icon buttons)

- **Pressed:** background and icon swap to the "selected" colors, and the button scales to **0.9** with a spring
  (damping 1.0; 0.2s going down, 0.4s coming back) (`SKIconButton.swift:213-248`, `bounceScale = 0.9` at `:29`;
  `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+BounceMode.swift:14-35`;
  `.../UIView+SpringAnimation.swift:64-83`, `:109-129`). Reduce Motion skips the scale.
- **Selected** (e.g. an active format): same look as pressed, without the scale.
- **Disabled** (`interactionState: .disabled`): whole button at alpha **0.35**, and it takes no taps (the control is
  disabled) (`SKIconButton.swift:236-241`, `:303-319`). Since September every toolbar icon button reads its plugin's
  `enabled` flag (`ComposerToolbarView.swift:501-502`), so "/" dims while there's text
  (`ComposerToolbarInteractor.swift:446-456`), and in the formatting toolbar Link dims without a link opportunity and any
  style the selection disallows dims (`:522-550`, `:575-576`). *June:* only the send/right button and the placeholder
  label read it; the icon buttons never looked disabled.
- **No-circle buttons** (backdrop `.none`) dim to alpha 0.75 when pressed (`SKIconButton.swift:219-220`).

### 5.4 Toolbar transitions

- Collapsed ↔ focused: 0.35s keyframes (`ComposerToolbarAnimator.swift:34-35`). Collapsed → focused: the collapsed row
  fades out in the first 10%, then the 5-button row and send fade in over the remaining 90% (`:84-95`). Focused →
  collapsed is the reverse (`:58-69`). On iOS 26 it's a pure crossfade, with no vertical slide (`:27-28`).
- The card's side insets switch from the tab bar's to 8pt, and its controls from 4 to 8pt, when the style changes
  (§2.1, §2.2); no dedicated animation for that change (`ComposerViewController.swift:89-96`, `:718-734` just set the
  constraints; the spring at `:604-615` runs only when side buttons join or leave, §2.5).
- Focused ↔ formatting toolbar: 0.35s spring (damping 0.75, ease-in-out) alpha crossfade
  (`ComposerToolbarAnimator.swift:97-104`, `:155-176`).

---

## 6. Send button

`ComposerSendPlugin.swift:124-138`, drawn by `ComposerToolbarContainerView.configureRightButton`
(`ComposerToolbarContainerView.swift:460-517`).

| State | Look |
|---|---|
| **Enabled** | 36pt circle `highlight2.baseInverse` = `dt_color_base_inverse_highlight_2` **#007A5A / #177E56** (Colors.swift:104), `svgSendFilled` icon **white** (`ColorSet.Constants.white` = `dt_color_constants_white` #FFFFFF). *June:* `sk_lilypad_green` #007A5A in both modes |
| **Pressed** | the same circle at **80%** alpha, icon white, scale 0.9 (§5.3) |
| **Disabled** | **no circle**; icon `CoreColorSet.primary.outlineSecondary` = `dt_color_outline_secondary` **#5E5D60@45% / #797C81@50%** (Colors.swift:296), not tappable (`interactionState: .disabled`, `ComposerToolbarContainerView.swift:488-499`); SKIconButton dims a disabled button to 0.35 (`SKIconButton.swift:236-241`), but `rightButton.alpha = 1.0` right after `configure` (`ComposerToolbarContainerView.swift:501-502`) puts the send back at full opacity, so it looks as in June. The send is also guarded (`guard sendEnabled`, `ComposerToolbarFeature.swift:510-511`). *June:* the same look, and it still received taps |
| **Editing** | same green, `svgCheck` icon, label "Save" (`ComposerSendPlugin.swift:161-177`) |

When it's enabled (`ComposerToolbarFeature.swift:236-250`, `:454-473`): trimmed text isn't empty **or** there's at
least one attachment, **and** the destination is valid, **and** no bot is typing (Agentforce typing, Slackbot
streaming). While editing a sent message it's always enabled.

Where it shows: focused/formatting states always (disabled until there's content); collapsed state only once there's
text or attachments (§3). In collapsed with no text it's replaced by the mic. In a Slackbot DM a disabled send gives
way to the two-way voice button when that's offered (`ComposerToolbarLayoutManager.swift:243-249`).

Long-press → Schedule message (§13). The composer always builds the send plugin with `schedulingEnabled: true`
(`ComposerToolbarPluginFactory+Dependencies.swift:210-212`); the fallback toast "Scheduling replies in threads isn’t
currently supported" (`scheduling_replies_is_not_supported`, yaml:17028; `ComposerSendPlugin.swift:95-97`) only
appears where a caller passes `false`. Long-press is off in Slackbot DMs and while editing
(`ComposerSendPlugin.swift:151-157`).

---

## 7. Formatting toolbar ("Aa")

Opens when the user taps **Aa**, and automatically when text is selected in the focused composer for more than
0.1s (`ComposerToolbarInteractor.swift:206-236`). It closes back to the normal focused toolbar with its close button,
or when the selection is cleared (`:230-233`). It replaces the 5-button row in place; the text view and send button
stay.

Layout (`ComposerToolbarLayoutManager.swift:261-314`, `ComposerToolbarContainerView.swift:297-327`):

`[ × ]  B  I  U  S  🔗  1.  •  ❝  [→ ←]  </>  ▭          [ send ]`

- **Close** (left, fixed): 36pt circle, bg `highlight1.baseInverse` **#1264A3 / #0A77A7**, icon `svgClose` **white**;
  pressed: the formatting buttons' selected colors (`sk_frosty_blue` circle, `sk_sky_blue` icon); a11y "Dismiss
  formatting toolbar" (`dismiss_formatting_toolbar`, yaml:5519) (`ComposerTextFormattingPlugin.swift:29`;
  `ComposerWysiwygPlugin.swift:68-78`). *June:* bg `sk_highlight` #1264A3 / #1D9BD1, icon `sk_primary_background`. 8pt
  from the card's left edge; the button row starts 8 + 36 + 8 = 52pt in (`ComposerToolbarView.swift:150-185`).
- **Style buttons** (scrollable, 36pt, 5pt apart, horizontally scrollable, no scroll bar), in this order
  (`ComposerToolbarLayoutManager.swift:263-296`, plugins `ComposerTextFormattingPlugin.swift:29-59`):

| # | Button | Icon → svg | A11y label (key, yaml line) |
|---|---|---|---|
| 1 | Bold | `svgBold` → `bold.svg` | "Bold text formatting" (`bold_formatting`, 2487) |
| 2 | Italic | `svgItalic` → `italic.svg` | "Italics text formatting" (`italics_formatting`, 10273) |
| 3 | Underline | `svgUnderline` → `underline.svg` | "Underline text formatting" (`underline_formatting`, 22515) |
| 4 | Strikethrough | `svgStrikethrough` → `strikethrough.svg` | "Strike-through text formatting" (`strike_through_formatting`, 20751) |
| (4a) | Header (flag `richTextHeadersAndDividers`) | `svgParagraph` → `paragraph.svg`; `svgHeading1/2/3` → `heading_1.svg`… for the current level | "Header text formatting, paragraph" / "…, heading %d" (`header_formatting_paragraph` yaml:7850, `header_formatting_heading_x` 7846), hint "Cycles through header sizes" (`header_formatting_cycle_hint`, 7842) |
| 5 | Link | `svgLink` → `link.svg` | "Link text formatting" (`link_formatting`, 10896) |
| 6 | Numbered list | `svgNumberedList` → `numbered_list.svg` | "Numbered list text formatting" (`numbered_list_formatting`, 13593) |
| 7 | Bulleted list | `svgBulletedList` → `bulleted_list.svg` | "Bullet list text formatting" (`bullet_formatting`, 2637) |
| 8 | Quote | `svgQuote` → `quote.svg` | "Quoted text formatting" (`quoted_formatting`, 15486) |
| 9–10 | Indent / Outdent (only while the caret is in a list) | `svgIndentLeft` → `indent_left.svg`, `svgIndentRight` → `indent_right.svg` | "Indent selected list items by a single level" (`indent_list_item`, 9696); "De-dent selected list items by a single level" (`dedent_list_item`, 5241) |
| 11 | Inline code | `svgCode` → `code.svg` | "Code text formatting" (`code_formatting`, 4267) |
| 12 | Code block | `svgCodeBlock` → `code_block.svg` | "Pre-formatted text formatting" (`preformatted_formatting`, 15000) |
| (13) | Divider (flag `richTextHeadersAndDividers`) | `svgDivider` → `divider.svg` | "Divider" (`divider_formatting`, 5554) |

- **Colors** (`ComposerWysiwygPlugin.swift:68-78`): icon `contentSecondary` **#454447 / #B9BABD**, no circle;
  **active** style = icon `sk_sky_blue` **#1D9BD1** on a 36pt circle `sk_frosty_blue` (**#1D9BD1@10%**)
  (`SKLegacyColors.swift:252`). *June:* icon `sk_foreground_max_solid` #616061 / #9A9C9E.
- **Active state:** a button is selected when its style is on for the text being typed, or for the whole selection
  when there's a selection (`ComposerToolbarInteractor.swift:552-598`); disallowed styles are disabled and dim (§5.3).
  Tapping toggles it (`ComposerWysiwygPlugin.swift:33-63`). The Header button never shows selected: each tap cycles
  paragraph → H1 → H2 → H3 → paragraph and swaps its icon (`ComposerToolbarInteractor.swift:570-586`, `:601-639`); the
  Divider button inserts a divider (`ComposerWysiwygPlugin.swift:48-49`).
- **Link:** enabled only when there's a link opportunity (selected text or an existing link), else dimmed; shown
  selected on an existing link (`ComposerToolbarInteractor.swift:522-550`). Tapping opens the link editor
  (`ComposerInputFeature.swift:146-162`). The link editor dialog's layout and strings: not found (looked in
  `ComposerInputFeature.swift`, `ComposerIntputFeature+Dependencies.swift`; the `WysiwygLinkEditing` implementation
  wasn't traced).
- Right: the send button, as in §6. The row's trailing edge is 8 + 36 + 8 = 52pt from the card edge
  (`ComposerToolbarContainerView.swift:297-314`; `ComposerToolbarView.swift:351-357`).
- Transition from/to the normal toolbar: 0.35s spring crossfade (§5.4).

---

## 8. Rich text while typing

All in the text view; values from `WysiwygTextProcessor+Config.swift:22-133` unless noted.

| Style | Look | Source |
|---|---|---|
| Plain | Lato Regular 17, `contentPrimary` **#1D1C1D / #F8F8F8** | `:57-63`, `:72-74`, `:106` |
| **Bold** | Lato Bold 17 | `:75-77` |
| *Italic* | Lato Italic 17 (bold+italic: Lato BoldItalic) | `:78-83` |
| Underline | single underline | `:112`; `WysiwygStyles+Rendering.swift:73-74` |
| ~~Strike~~ | single strikethrough | `WysiwygTextProcessor+Config.swift:111`; `WysiwygStyles+Rendering.swift:75-76` |
| `Inline code` | **Menlo-Regular 16** (base size − 1) (`Modules/Data/Font/Implementation/SKFont.swift:320-343`, `FontStyle.swift:20-23`); text `message_rendering_code` **#E01E5A / #E8912D** (`SKLegacyColors.swift:339`); behind each run a rounded rect, fill `surfacePrimary` **#1D1C1D@6% / #F8F8F8@6%**, **1pt** stroke `outlineTertiary` **#5E5D60@13% / #797C81@30%**, radius **3**; square ends where the run wraps to the next line | `:107`; `Modules/UIInfra/SlackKit/Implementation/Extensions/Text+Display.swift:1743-1749`; `.../CoreComponents/TextInput/TextProcessor/WysiwygTextProcessor+SKMapping.swift:351-353`; `.../CoreComponents/Label/Layout/LayoutManager.swift:19`, `:131-161`; stroke width `.../LayoutManagerRoundedRectanglePlugin.swift:15` |
| Code block | Menlo 16 in `contentPrimary` (no code color) (`WysiwygStyles+Rendering.swift:95-109`); one rounded rect around the whole block, fill `message_rendering_code_block_fill` (light `sk_foreground_min` **#1D1C1D@4%**, dark `sk_foreground_low` **#D1D2D3@13%**), 1pt stroke `message_rendering_code_block_stroke` (light **#1D1C1D@13%**, dark **#D1D2D3@50%**), radius 3; text indented 10pt left and right, 2pt above/below | `Text+Display.swift:1767-1774`; `SKLegacyColors.swift:342-343`; `LayoutManager.swift:163-174`; `Modules/UIInfra/TextDisplay/Implementation/RichTextTheming.swift:48-57` |
| Quote | a **4pt** bar, radius 2, color `outlineTertiary` (**#5E5D60@13% / #797C81@30%**), spanning the quoted lines (starts 2pt below the first line's top); text indented 15pt left (and 15pt right) | `Text+Display.swift:1627-1631`; `LayoutManager.swift:98-129`; `RichTextTheming.swift:21-37` |
| Bulleted list | prefixes "•", "◦", "▪" for indent levels 0/1/2 (then repeat), followed by a tab | `Modules/Data/TextModels/Implementation/BulletedListPrefixGenerator.swift:11-25` |
| Numbered list | "1.", "a.", "i." for levels 0/1/2 (decimal, alphabetic, roman) + tab | `.../OrderedListPrefixGenerator.swift:11-25` |
| List indent | marker at 29pt × level; text at marker + 28pt; tab interval 7 | `RichTextTheming.swift:72-83` |
| Header (flag `richTextHeadersAndDividers`) | H1 Lato Black 28 (`.headline`), H2 Lato Black 22 (`.title`), H3 Lato Bold 20 (`.subtitleBold`); with the flat heading scale H1 20 (`.subtitle`), H2 Lato Black 17, H3 Lato Bold 17 | `:33-35`, `:102-104`; `Text+Display.swift:49-62` |
| @mention / #channel / user group ("slug") | text `message_rendering_mention_text` (light `sk_indigo` **#0B4C8C**, dark `sk_highlight` **#1D9BD1**); fill `highlight1.surface` = `dt_color_surface_highlight_1` **#36C5F0@13% / #036696@25%**, radius 3, no stroke. Mentions that include you, and @here/@channel/@everyone, use fill `highlight3.surface` = `dt_color_surface_highlight_3` **#FFC600@18% / #A07300@18%** | `:108`; `SKLegacyColors.swift:338`; `WysiwygTextProcessor+SKMapping.swift:389-396`, `:564-589`; `Text+Display.swift:1776-1783`; `Text+HighlightColors.swift:13`; Colors.swift:146, :158 |
| Link | text `highlight1.content` = `dt_color_content_highlight_1` **#1264A3 / #2BA5CE**; no underline set (link attributes only set the color); no pill | `WysiwygTextProcessor+Config.swift:65-67`, `:109`; `WysiwygTextProcessor+SKMapping.swift:574-575`; Colors.swift:218 |

**Markdown shortcuts** (typed, converted live):
- Inline: `*bold*`, `_italic_`, `` `code` ``, `~strike~` (also full-width CJK `＊`, `＿`, `｀`)
  (`Modules/UIInfra/Wysiwyg/Implementation/Mrkdwn/WysiwygMrkdwnDelimiter.swift:10-17`).
- At the start of a line, followed by a space: `1.` → numbered list, `*` or `-` → bulleted list, `>` → quote; with
  `richTextHeadersAndDividers`, `#` / `##` / `###` → H1 / H2 / H3. Typing a third backtick after ` `` ` → code block
  (`WysiwygLineStyleIntent.swift:60-88`; `Modules/Integration/ToggleMigrationAppRootPlugin/Implementation/ToggleMigrationPlugin+Dependencies.swift:125-127`).

---

## 9. Attachments tray

Shown under the text view once there's at least one attachment (focused styles only; collapsed hides it,
`ComposerView.swift:189-190`, `:204`). Then 16pt to the toolbar.

**Tray** (`ComposerAttachmentsView.swift:71-91`):
- Height **76pt**: 72pt items + 2pt top and bottom (`:75-76`, `:84`, `:89`, `:284-296`). Measured 76pt in
  `testAttachments@3x.png`.
- Horizontal scroll, no scrollbar; 10pt padding left and right (`:73`, `:121-125`).
- Each item is 72pt tall: the card is 64pt with 8pt of spare room on the top and right for the remove "×"
  (`removeButtonOverflow = 8`, `:72`). Items are 4pt apart (12 − 8, `:81-82`), so cards look 12pt apart.
- Sections (files | link unfurls | other attachments) are separated by a 1×64pt line in `outlineTertiary`
  (**#5E5D60@13% / #797C81@30%**) (`:86-88`, `:206-218`; `ComposerSectionDividerView.swift:15`).
- In glass mode the strip clips its contents to its own bounds (`collectionView.clipsToBounds`, `ComposerAttachmentsView.swift:123`).
- **Image-markup banner** (new; flags `imageMarkupTool` + `imageMarkupNux`, both default off, and only after 7 days
  installed, once): an `SKBanner` `.small`, tone `.info` (fill `base_highlight_1` #E3F8FF, measured), no ornament, with a
  delete × accessory, "👆 Tap any photo to edit before sending" (`image_markup_composer_banner`, yaml:9461), 8pt below the
  strip and 10pt from the sides, adding its height to the tray's (`ComposerAttachmentsView.swift:41-63`, `:155-164`,
  `:271-296`; `ComposerAttachmentsPresenter.swift:523-536`; `ImageMarkupBannerController.swift:42-55`). PNG
  `testAttachments_markupBanner@3x.png`.

**Card types:**

| Type | Size | Look | Source |
|---|---|---|---|
| Image / video / generic file thumbnail | 64×64 | radius = min(20, 0.225 × 64) = **14.4pt**; 1pt border `outlineTertiary`; bg `basePrimary` **#FFFFFF / #1A1D21**; images fill; loading = placeholder; error = `svgWarningFilled` in `important.content` = `dt_color_content_important` **#C01343 / #DE678A** (*June:* `sk_raspberry_red`) | `SKThumbnailAttachment.swift:72-75`, `:88-114`, `:574-578`, `:736-739`, `:752-753`; `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:94-99`; PNG `testAttachmentImageSmall@3x.png` |
| File / canvas / list / unfurl (compact card) | 64pt tall, ≤ **220pt** wide | radius **15**, 1pt border `outlineTertiary`, bg `basePrimary`, 12pt padding, 36×36 file-type tile, 8pt gap, title **Lato Bold 15** `contentPrimary` 1 line, subtitle **Lato 13** `contentTertiary` (file type in caps, e.g. "PDF"; canvases/lists show last-edited time) | `ComposerCompactAttachmentCell.swift:35-39`, `:80-89`; `SKCompactAttachment.swift:71-93`, `:578-579`, `:628-632`; `.../Helpers/AttachmentOrnament/AttachmentOrnament.swift:24-25`; `ComposerAttachmentsPresenter.swift:185-214`; PNG `testAttachmentFile@3x.png` |
| Audio clip | 200×64 | radius 8, 1pt border `outlineTertiary` (*June:* `sk_foreground_low_solid` #DDDDDD / #323538) | `ComposerAudioAttachmentCell.swift:36-47` |

**Remove "×"** (`ComposerAttachmentRemoveButton.swift`): `svgCloseCircleFilled` (`close_circle_filled.svg`), 20×20,
color `contentPrimary` **#1D1C1D / #F8F8F8**, on a circle of `basePrimary` with a 2pt ring of the same color (`:34-38`,
`:59-62`, `:70-73`, `:87-89`). *June:* `sk_primary_foreground` (#D1D2D3 dark) on `sk_primary_background`. Centred on the
card's top-right corner, pulled in 2pt (`ComposerThumbnailAttachmentCell.swift:35-39`, `:80-87`). Tap area +8pt all
round (`ComposerAttachmentRemoveButton.swift:37`, `:64-66`). Pressed: icon at 60% (`:36`, `:143-145`). Uploading: a
small spinner replaces the icon and it can't be tapped (`:122-133`). A11y "Remove attachment" + file name
(`remove_attachment`, yaml:16188).

**Card press:** scale 0.94, content at 60% (`ComposerThumbnailAttachmentCell.swift:152-167`). Tapping opens a
preview (not specced).

**Collapsed with attachments and no text:** the right side shows an attachment chip then the send button
(`ComposerToolbarLayoutManager.swift:177-186`). The chip is an `SKButton` size `.small`: `svgAttachment` 20pt icon on
the left + the count, title **Lato Bold 13** `contentPrimary`, bg `baseTertiary` **#EAEAEA / #212428**, radius 10,
padding 7pt vertical / 9pt horizontal, 4pt icon–text gap → 34pt tall (`ComposerAttachmentsPlugin.swift:33-40`;
`ComposerToolbarInteractor.swift:479-510`; `ComposerToolbarView.swift:526-570`; `SKButton+Types.swift:269-270`,
`:300-301`, `:325-326`, `:352-353`, `:374-375`; `SKButton+PresentationObject.swift:220-221`). Tapping it expands the
composer.

Limits: at most 10 photos per message from the picker (`ComposerToolbarPluginFactory+Dependencies.swift:135`;
`AssetUploadHandlerCountConstant.maxImageUpload = 10`); over the limit → toast "Too many items selected."
(`too_many_items_selected`, yaml:21916).

---

## 10. Thread composer: "Also send to #channel"

`ComposerSendToChannelView.swift`; PNG `testDefaultComposerSendToChannelView@3x.png`.

- Shown only in focused styles, for thread replies (`ComposerPresenter.swift:38-48`); 12pt gap below it
  (`ComposerViewConstants.swift:25`). Collapsed: hidden.
- Row: checkbox + label as one button, 12pt from the leading edge, 2pt top/bottom padding
  (`ComposerSendToChannelView.swift:26-33`, `:152-164`).
  Tap area grows 12pt all round (`:152-154`).
- Checkbox: 16×16 icon-font glyph (`SKIconManifest.checkboxEmpty` / `.checkboxFull`), unchecked
  `contentSecondary` **#454447 / #B9BABD**, checked `highlight1.content` = `content_highlight_1` **#1264A3 / #2BA5CE**
  (`:174-180`; June: `sk_foreground_max_solid` #616061 / #9A9C9E and `sk_highlight` #1264A3 / #1D9BD1). 8pt to the
  label (`:123-125`).
- Label: **Lato Regular 13** `contentPrimary` (**#1D1C1D / #F8F8F8**; June `sk_primary_foreground`, dark #D1D2D3), with
  the channel name in **Lato Bold 13** (`:188-212`):
  - channel: "Also send to #general" (`thread_broadcast_button_title` = "Also send to %@", yaml:21617); private channels
    get a lock glyph before the name, icon font 14pt, also `contentPrimary` (`:198-210`)
  - DM: "Also send as a direct message" (`also_send_as_direct_message`, yaml:1761)
  - group DM: "Also send to the group" (`also_send_to_the_group`, yaml:1764)
- Pressed: label and checkbox tinted `contentPrimary` at 30% alpha (`:137-145`).
- Measured from the PNG (view origin at x=30px): checkbox ink spans x 70–109px, label starts at 138px → label begins
  36pt from the view edge (12 + 16 + 8). The latest PNG differs from June's only inside the checkbox
  (pt box 23–37 × 429–443): its ink is now `contentSecondary`; the text stays #1D1C1D (light).

---

## 11. Editing a sent message

- Starting an edit moves the composer to the focused style with the message text loaded
  (`ComposerToolbarInteractor.swift:290-295`). The transcript highlights the message being edited and un-highlights it
  when editing ends (`MessageTranscriptComposerPlugin.swift:95-98`). No "Editing" banner exists
  (`ContextBarConfiguration` has no editing case, `Modules/UIInfra/ContextBarUI/Implementation/ContextBarConfiguration.swift:358-381`).
- Toolbar: "+", the mic and "/" removed (unless attachment editing is on; "+" stays for a scheduled draft)
  (`ComposerToolbarLayoutManager.swift:218-223`).
  Right side: **red cancel** (`svgClose`, white on `sk_raspberry_red` #E01E5A, still a legacy color,
  `ComposerCancelEditingPlugin.swift:33-41`) 8pt left of the **green save** (`svgCheck` on `highlight2.baseInverse` =
  `base_inverse_highlight_2` **#007A5A / #177E56**, 80% when pressed; June `sk_lilypad_green` #007A5A in both modes)
  (`ComposerToolbarContainerView.swift:264-274`, `:359`, `:383-386`; `ComposerSendPlugin.swift:161-177`).
- Collapsed while editing: `[+] preview … [cancel] [save]` (`ComposerToolbarLayoutManager.swift:144-153`;
  `ComposerToolbarContainerView.swift:206-235`).
- Save is always enabled while editing (`ComposerToolbarFeature.swift:244-245`).

---

## 12. Recording an audio clip

Tap (or long-press) the mic → permission check → the toolbar becomes a recording row
(`ComposerToolbarInteractor.swift:832-861`; layout `ComposerToolbarLayoutManager.swift:127-140`):

`[ × ]  〰〰〰 waveform 〰〰〰  0:07  [ ✓ ]`

- **Cancel** (left): `svgClose` as a `defaultPluginButton`: icon `contentSecondary` **#454447 / #B9BABD** on
  `surfacePrimary` **#1D1C1D@6% / #F8F8F8@6%**, pressed bg `surfaceSecondary` (June: on `baseTertiary` #EAEAEA /
  #212428); a11y "Cancel" (`ComposerAudioCancelPlugin.swift:24-42`; `ComposerToolbarPluginType.swift:88-104`).
- **Waveform + duration** (middle): waveform `highlight1.content` = `content_highlight_1` **#1264A3 / #2BA5CE** (June
  `sk_highlight`, dark #1D9BD1), turning `sk_raspberry_red` #E01E5A near the time limit; duration **Lato Bold 13**
  (capped at 13) `contentPrimary` (warning color near the limit: light #E01E5A, dark `sk_primary_foreground`)
  (`AudioClipRecordingView.swift:121-139`; `SKLegacyColors.swift:351`). Duration is 12pt in from the right, 8pt after
  the waveform (`AudioClipRecordingView.swift:19-21`, `:67-72`, `:85-100`).
- **Done** (right): `svgCheckFilled` white on `highlight1.baseInverse` = `base_inverse_highlight_1` **#1264A3 /
  #0A77A7** (June `sk_highlight`, dark #1D9BD1); a11y "Save" (`ComposerAudioDonePlugin.swift:25-34`).
- No banner while recording any more: the June composer showed "Recording an audio clip…" (`recording_an_audio_clip`,
  yaml:15977; Lato 12 `audio_clips_dynamic_recording_context_text`) as its in-card context bar while a clip recorded
  (June `ComposerPresenter.swift:55-62`). In latest nothing produces `ContextBarConfiguration.audioMessageRecording`
  (the presenter no longer maps a banner, `ComposerPresenter.swift:33-64`; the case survives only in
  `SKContextBarAdapter.swift:63-64`, `:127-139` and `ContextBarView.swift:425-430`), so the recording row shows on its own.
- Animations: on start the done button pops 1.0 → 1.15 → 1.0 and the "+" rotates −45° → 0° into the ×, both 0.35s
  (`ComposerToolbarAnimator.swift:178-202`); cancel rotates the × back into "+" (`:203-225`).
- Haptics: medium impact on start and done, error buzz on cancel (`ComposerToolbarInteractor.swift:354-365`, `:850-852`).
- Done → the clip becomes an audio attachment and the composer goes to the focused style (`:658-668`).
- Errors: mic denied → alert "Slack Needs Access to Your Microphone" / "Grant microphone access so you can record your
  voice in a clip." with "Settings" and "Don’t Allow" (`:747-772`; yaml 6479, 19836, 17726, 5689). On a call → toast
  "Recording audio is not available while on a call." (`:774-778`; yaml:15980).
- Full-screen composer: June covered the text with an 80%-opaque `sk_primary_background` overlay holding a 16pt
  `svgMicrophone` + "Recording an audio clip…", 12pt from the bottom (June `AudioClipLongformComposerOverlay.swift:44-60`).
  That file and its use in `ComposerView` are gone in latest (no replacement; `ComposerView.swift:24-70` has no overlay).

---

## 13. Scheduled send

**Schedule sheet** (long-press send; `Modules/Integration/DeprecatedMessageComponent/Implementation/ScheduleMessage/`):
- Title "Schedule message" (`schedule_message_sentence_case`, yaml:16994), **Lato Black 17**
  (`ScheduleMessageViewController.swift:69`); 15pt top and side insets (`:30-31`).
- Options: "Later today at %@" (`later_today_at_x`, yaml:10693), "Tomorrow at %@" (`tomorrow_at`, yaml:21903),
  "Next Monday at %@" (`next_Monday_at_x`, yaml:12872) (`ScheduleMessageUtilities.swift:33-59`), "Custom Time"
  (`custom_time`, yaml:5088; `ScheduleMessageViewModel.swift:186`).
- Footer "All times in %@" (`all_times_in`, yaml:1677), **Lato 15** `contentTertiary` (**#5E5D60 / #9A9B9E**; June
  `sk_foreground_high` #1D1C1D@50% / #D1D2D3@50%) (`ScheduleMessageViewController.swift:231`).
- Custom time: a 180pt date picker and a 44pt "Schedule Message" button (`scheduleMessage`, yaml:16991), radius 10
  (`:37-42`, `:131`). Latest allowed: 120 days out (`:43`).
- Row, list and separator styling beyond these constants: not traced.

**After scheduling:** a context bar (§14) "Your message will be sent tomorrow at 9:00 AM. **See all scheduled
messages**" (link part bold in `highlight1.content` **#1264A3 / #2BA5CE**; June `sk_highlight`) with the
`scheduledSend` glyph (`your_message_will_be_sent`, yaml:24596;
`ContextBarScheduleMessageConfiguration.swift:43-57`). Several: "%@ messages will be sent. See all scheduled messages"
(`x_messages_will_be_sent`, yaml:24077). Time phrases: "today at %@", "tomorrow at %@", "on %@ at %@"
(yaml 21789, 21906, 13651).

**Editing a scheduled message:** right side = `[save-to-drafts] [reschedule] [send]`, 8pt apart
(`ComposerToolbarLayoutManager.swift:144-161`, `:250-257`; `ComposerToolbarContainerView.swift:358-403`):
- Reschedule: `svgScheduleSend` (`schedule_send.svg`) as a `defaultPluginButton`: icon `contentSecondary` on
  `surfacePrimary`, pressed `surfaceSecondary` (June: on `baseTertiary`); a11y "Reschedule Message"
  (`reschedule_message`, yaml:16535) (`ComposerRescheduleDraftPlugin.swift:98-104`; `ComposerToolbarPluginType.swift:88-104`).
- Cancel schedule & save to drafts: `SKIconManifest.allFiles` (icon-font glyph U+E059), same button style; a11y "Cancel
  Schedule and Save to Drafts" (`cancel_schedule_save_to_drafts`, yaml:3220) (`ComposerCancelScheduleSaveToDraftsPlugin.swift:28-34`).
  Not offered in threads (`ComposerToolbarPluginFactory+Dependencies.swift:259-261`).

---

## 14. Context bar (typing, DND, drafts, scheduled… above the composer)

In latest the context bar is always the **standalone** bar: its own glass capsule in the conversation's bottom drawer,
not part of the composer card (the `composerContextBar` toggle and the composer's in-card `bannerView` are gone;
`ComposerView.swift:24-70` has neither). `ContextBarContentPlugin` streams the resolved `ContextBarConfiguration` for the
conversation or thread and renders it, through `SKContextBarAdapter.transform`, as a bottom-drawer item
(`Modules/Features/AnyConversation/Implementation/Plugins/ContextBarContentPlugin.swift:22-95`) listed right before the
composer (`.contextBar, .composer`, `Modules/Features/AnyConversation/Implementation/Data/MessageTranscriptPluginsBuilder.swift:157-173`),
so it stacks directly above it (the drawer is a vertical stack in item order, `ListDrawerView.swift:17-20`, `:87-88`).

- **Placement:** the drawer cell pins the bar to the composer's own capsule insets, so the bar is exactly as wide as the
  composer and follows it collapsed ↔ focused (`ComposerStateCoordinator` insets); it is vertically centred with ≥ 6pt
  above and below (`Modules/Features/AnyConversation/Implementation/Plugins/ContextBarBottomDrawer.swift:77-79`, `:101-130`).
  The composer's glass starts at the top of its own cell (`ComposerViewController.swift:448-474`), so the bar ends
  **6pt** above the card (the production measurement in §2).
- **Bar** (`Modules/UIInfra/ContextBarUI/Implementation/SKContextBar.swift`): interactive `UIGlassEffect` capsule
  (`:66-77`); min height **36**; content 6pt top/bottom, 12pt left/right, vertically centred (`:34-53`, `:116-153`).
  With action buttons or agent rows: uniform corners radius **26**, padding 12 / 16 (`:452-480`). iOS 18:
  `surfacePrimary` fill, radius 16 (`:79-88`).
- **Row** (`Modules/UIInfra/ContextBarUI/Implementation/Views/ContextBarRowView.swift:18-23`, `:61-68`, `:167-197`):
  `[left] [label] [right]`, 8 apart, centred. Left: a 16pt `SKOrnamentBox` `.tiny` icon (no fill unless the
  configuration gives one, then the icon is `basePrimary` on it) or a 16pt overlapping avatar pile
  (`SKContextBar.swift:313-337`). Label: **Lato 13** (`.caption`) in the style's text color, 2 lines by default; `<bold>`
  spans render Lato **Bold** 13 (`:339-341`, `:618-629`; June's in-card banner used Lato Black 13). Right: a 30pt
  `svgClose` dismiss button in the text color, an expand/collapse chevron, or an agent stop button (`:343-356`;
  `ContextBarRowView.swift:240-253`). Tappable (chevron) rows dim to 0.75 while pressed, 0.15s (`ContextBarRowView.swift:262-269`).
- **Action buttons:** `SKPillButton` medium, `basePrimary`, pressed `baseTertiary`, 16pt below the label, 12 apart
  (`SKContextBar.swift:294-308`, `:394-450`; `SKContextBarAdapter.swift:207-214`).
- **Styles** (`SKContextBar.swift:660-690`): neutral = clear glass, `contentPrimary` text; warning = campfire_0 / campfire_5
  **#FFF2E0 / #4B2200**; highWarning = campfire_10 / campfire_20 **#FBCC91 / #7B3A00**
  (`Modules/UIInfra/DesignTokens/Implementation/StandardPaletteColor+Extensions.swift:10-11`); coachmark =
  `highlight1.baseInverse` **#1264A3 / #0A77A7** with `contentInversePrimary` text; info = `highlight1.base` **#E3F8FF / #001A2D**.
- **Animation:** it's a drawer item: slides in with no fade (a fade would darken the glass), leaves with a fade + slide,
  bouncy medium spring ≈ 0.43s (`ContextBarContentPlugin.swift:85-94`;
  `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/BottomDrawer/Animation/DefaultListDrawerAppearanceAnimation.swift:10-21`,
  `ListDrawerAppearanceAnimation.swift:22-25`; `UIView+SpringAnimation.swift:113-114`). The June standalone bar instead
  morphed out of the composer (smooth 0.4s spring, content fading in over 0.2s after 0.15s; back with a 0.1s fade and a
  0.98 scale, June `ComposerViewController.swift:522-607`) and cross-faded content changes over 0.3s (June
  `SKContextBar.swift:45`); both are gone.
- Snapshots: `Modules/UIInfra/ContextBarUI/Snapshots/iOS_26/ContextBarUITests.SKContextBarSnapshotTests/` (glass not
  rendered): `testTypingIndicator_ShortText@3x.png` (16pt avatar, "Jason Winn is **typing...**", 36 tall),
  `testDND_ShortUsername@3x.png` / `testDND_LongUsername_TwoLines@3x.png` (new: `snoozeFilled` glyph + "**Jason Winn**
  has notifications paused"), `testActiveParticipants_*` (new agent rows with stop buttons).

Kinds (`ContextBarConfiguration.swift:358-381`) and their copy (bar layout per kind: `SKContextBarAdapter.swift:48-100`,
`:127-419`). One bar at a time, in priority order: shared-channel invite, agents + typing, typing, temporary-channel
expiry, AI app processing, continue workflow, huddle participants not in channel, drafts, just scheduled, megaphone,
Slackbot voice / processing / usage, migrating, Slack Connect, coding channel, Salesforce-linked private, Agentforce,
scheduled messages, progressive disclosure, DND, time zone (`Modules/Integration/ContextBar/Implementation/ContextBarData.swift:35-68`).

| Kind | Text | Source |
|---|---|---|
| Typing | "Jane is **typing…**" / "Jane and Sam are **typing…**" / "Several people are **typing…**" (`user_is_typing` yaml:22968, `two_users_are_typing` 22438, `several_people_are_typing` 17733), with the typers' avatars | `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarTypingConfiguration.swift:15-42`; `SKContextBarAdapter.swift:153-161` |
| Agents working (new; replaces typing when agents are active) | "%@ is **working…**" / "%@ and %@ are **working…**" / "Several agents are **working…**" / "Several people and agents are **typing…**" (yaml 1164, 1177, 1172, 1168), avatars, stop button or an expandable list of agent rows | `ContextBarActiveParticipantsConfiguration.swift:80-91`; `SKContextBarAdapter.swift:312-359` |
| Scheduled messages | "Your message will be sent %@. **See all scheduled messages**" (§13), `scheduledSend` glyph | `ContextBarScheduleMessageConfiguration.swift:43-57`; `SKContextBarAdapter.swift:183-193` |
| Drafts | "1 draft is saved. **See drafts**" / "%@ drafts are saved. **See drafts**" (yaml 24016, 24013), `pencil` glyph; "See drafts" bold `highlight1.content` (June `sk_highlight`) | `ContextBarDraftConfiguration.swift:23-31`; `SKContextBarAdapter.swift:195-205` |
| Also: DND, time zone, external/Slack Connect (warning styles), @-mention and first-message coachmarks (coachmark style, pill buttons), huddle participants not in channel, AI processing, Slackbot usage/voice, temporary channel expiry, coding channel, "continue workflow" | per configuration file in `Modules/Integration/ContextBar/Implementation/Configurations/` | not specced individually |

The June default (in-card banner, `Modules/Integration/ContextBar/Interface/ContextBarView.swift`): inside the glass card,
8pt from its sides and top; radius 16; padding 13 / 16 / 13 / 16 (`ComposerViewConstants.updatedBannerViewInsets`, still
declared at `ComposerViewConstants.swift:29`); `sk_foreground_soft_solid` #F3F3F3 / #24272A fill (now `baseTertiary`,
`ContextBarView.swift:30`, `:63-65`, `:734-737`); Lato 13 with Lato Black 13 emphasis (`:54-62`); 22pt icon
`sk_foreground_max_solid` (now `contentSecondary`, `:34-35`); shown/hidden with a 0.15s ease-out. `ContextBarView` is
no longer used by the composer (only the conversation bottom drawer, Canvas and Share Message use it).

---

## 15. Keyboard, message list and full-screen composer

### 15.1 Keyboard interplay

- The composer is the conversation list's **bottom drawer** (`MessageTranscriptComposerPlugin.swift:84-89`,
  `.bottomDrawer(SKListDrawerEmbeddable(...))`). Keyboard down: its bottom is pinned to the safe-area bottom. Keyboard
  up: pinned to the top of the keyboard via `keyboardLayoutGuide` (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:160-162`,
  `:1042-1083`; a new option can pin the drawer through the bottom safe area instead, but the transcript keeps it off,
  `Modules/Features/MessageTranscript/Implementation/MessageTranscriptPresenter.swift:37-41`). The glass card's bottom is
  **8pt** above the drawer's bottom, so it rides 8pt above the keyboard (or the tab bar) (`liquidGlassStandaloneContextBarBottomSpacing = 8`,
  `ComposerViewConstants.swift:50`, applied at `ComposerViewController.swift:417-429`, `:455`; with the single-stack navigation variant it instead
  drops ⅔ of the way into the bottom safe area, min 16, `:433-445`; June 12pt,
  `liquidGlassBottomPadding`, now unused at `ComposerViewConstants.swift:48`). The context bar (§14) and the
  latest-messages pill are the drawer items above it; nothing (no accessory bar) sits between the composer and the keyboard.
- The drawer spans the list's safe-area width (`SKList.swift:1194-1200`).
- **Message list bottom inset** = keyboard height (at least the bottom safe area) + the drawer's height (composer,
  context bar…) (`.../List/Accounting/BottomContentInsetAccounting.swift:274-296`, `:298-328`, which replaced June's
  `KeyboardInsetAccounting.swift`; `.../List/BottomDrawer/ListDrawerView.swift:22-40`), applied to `contentInset.bottom`;
  the scroll indicators now get the same inset minus a new pin-to-top reservation (`SKList.swift:886-917`). Changes
  animate with the keyboard's own duration and curve (`BottomContentInsetAccounting.swift:330-340`, `:421-429`).
- If the list is showing the newest message, it stays pinned to the bottom as the inset changes; otherwise its
  scroll position is kept (`.../List/Accounting/ContentOffsetAccounting.swift:719-724`, `:813-825`).
- **Dismissal:** interactive: dragging the list down pulls the keyboard, and the composer rides it
  (`keyboardDismissMode` default `.interactive`, `SKList.swift:530`, `:733`; `keyboardDismissPadding` = composer
  height, `:1206-1208`).
- The composer drops focus as soon as the keyboard *starts* to hide, so the collapse animation runs with the keyboard
  (`ComposerViewController.swift:673-711`).
- Messages scroll behind the glass. Conversations don't add an iOS 26 bottom scroll-edge effect (only All Unreads
  does) (`SKList.swift:1256-1262`; `Modules/Features/AnyConversation/Interface/AnyConversationFeatureInterface.swift:108`;
  `Modules/Features/AllUnreads/Implementation/UnreadItemFeature/UnreadConversationFeature/UnreadConversationFeature.swift:110`).
- Landscape (compact height): the nav bar hides while the composer is focused (`ComposerViewController.swift:383-402`).
- The "Latest messages" pill is a bottom-drawer item listed before the context bar and the composer, so it stacks
  above both; its height doesn't count toward the list inset (`MessageTranscriptPluginsBuilder.swift:157-173`;
  `Modules/Features/MessageTranscript/Implementation/Plugins/LastReadBanner/LatestMessagesBannerPlugin.swift:105-111`).

### 15.2 Full-screen ("longform") composer

- **Open:** tap the (invisible) 20pt handlebar area, or drag up on the focused composer from above the text view (or
  anywhere once the text view is scrolled to the bottom) (`ComposerViewController.swift:743-817`, `:842-899`).
  Dragging is interactive.
- **Layout:** the composer's top pins to the list's safe-area top and the nav bar is hidden; the top is pushed down by
  the drawer items above the composer (the context bar, §14) and up by the hidden nav bar's height (new,
  `ComposerLongformContainerView.swift:66-87`, `:317-380`); the text view fills the space; toolbar at the bottom above the
  keyboard. Glass content turns opaque `basePrimary` (§2.1). Behind it: clear in glass mode, black at 80% on legacy
  (`ComposerLongformContainerView.swift:25-26`, `:503-506`).
- **Animation:** spring, damping 1.0, 0.4s (`UIView.propertyAnimatorWithSpring` default smooth/medium;
  `ComposerLongformContainerView.swift:382-412`; `UIView+SpringAnimation.swift:37-61`, `:123-128`).
- **Drag release:** completes if the finger was moving faster than 5pt/s in the right direction; otherwise if past
  50% (10% when no velocity was measured) (`ComposerLongformContainerView.swift:18-23`, `:254-285`).
- **Close:** tap the handlebar area, or drag down (from above the text, or when the text view is at its top).
  Handlebar a11y becomes "Collapse input" (`ComposerView.swift:222-230`).
- In full screen the toolbar never collapses (`ComposerToolbarInteractor.swift:641-650`).

---

## 16. "+" sheet (attachments and shortcuts)

Opened by "+" (`ComposerOmnipickerPlugin.swift:143-180`). It's an `SKListBottomSheet`
(`Modules/Features/SKListBottomSheet/Implementation/`).

**Sheet** (flag `bottomsheetMigration` off → Slack's `SKBottomSheet`,
`SKListBottomSheetFeatureDeprecated.swift:120-132`):
- Background `basePrimary` **#FFFFFF / #1A1D21** (June `sk_primary_background`, same hex) (`SKListBottomSheetViewController.swift:165`).
- Top corners radius **12** (`Modules/UIInfra/DeveloperComponents/Implementation/BottomSheet/Presentable/SKBottomSheetPresentable+Defaults.swift:35-37`);
  dimmed backdrop black at **70%** (`:51-53`; `.../BottomSheet/View/SKBottomSheetDimmedView.swift:71`).
- Grabber 48×4, `baseTertiary` **#EAEAEA / #212428**, radius 2, 8pt from the top
  (`.../BottomSheet/PresentationController/SKBottomSheetPresentationController.swift:54-57`, `:173-177`, `:468-473`).
- Present/dismiss: spring damping 0.8, 0.5s (`SKBottomSheetPresentable+Defaults.swift:39-45`;
  `.../BottomSheet/Animator/SKBottomSheetAnimator.swift:25`).
- Height = content, max **594pt**; starts at a 408pt loading height (`SKListBottomSheetViewController.swift:22`,
  `:58-75`; `ComposerOmnipickerPlugin.swift:152`). Tap outside or drag down to close (`SKListBottomSheetViewController.swift:316-324`).
- *(flag on: a native sheet with a self-sized detent and a 16pt top inset, `SKListBottomSheetFeatureDeprecated.swift:123-124`;
  `SKListBottomSheetViewController.swift:173-174`.)*

**Content, top to bottom** (plugin order `ComposerToolbarPluginFactory+Dependencies.swift:128-197`: photo gallery, Slackbot
actions (new), add content, recent content, then "Attach Device Logs" on internal builds):

1. **Photos & Videos** section.
   - Header "Photos & Videos" (`photos_and_videos_header_title`, yaml:14730; "Photos" in Slackbot DMs, yaml:14733),
     medium list header, with a right-side text button "View Library" (`view_library_header_button`, yaml:23217) that
     opens the full photo library (`OmnipickerPhotoGalleryPlugin.swift:286-298`, `:386-392`).
   - A horizontal strip of **96×96** tiles (`PhotoGalleryCell.swift:39-45`; `SKThumbnailAttachment.swift:736-741`),
     radius **20** continuous (`PhotoGalleryCell.swift:11-13`, `:25-26`), **8pt** apart, strip padding 4 top /
     16 left / 4 bottom / 16 right (`Modules/Integration/PhotoGalleryComponent/Implementation/PhotoGalleryHorizontalScrollerCell.swift:25-29`,
     `:177-187`) → 104pt tall.
   - Tile 1 is the camera: `svgCamera` in `contentSecondary` (**#454447 / #B9BABD**; June `sk_foreground_max`
     #1D1C1D@70% / #D1D2D3@70%) on the empty tile, a11y "Open Camera" (`:252-257`). Then up to 30 recent photos/videos
     (`OmnipickerPhotoGalleryPlugin.swift:37`, `:131`). 6 placeholder tiles while loading or before permission; before
     permission they show `svgLock`, also `contentSecondary` (`PhotoGalleryHorizontalScrollerCell.swift:31`, `:126-137`, `:247-250`).
   - Tile border 1pt `outlineTertiary`; favorites show a heart; videos show a duration badge (`SKThumbnailAttachment.swift:92`,
     `:102-103`, `:111`, `:577-580`).
   - Every photo tile has a 20pt round badge 6pt in from the top-right: unselected = 2pt white ring on black at 70%;
     selected = solid white circle with the selection number in **Lato Bold, capped at 14pt** (`smallBodyBold` max 14), black, plus a **3pt**
     `sk_secondary_highlight` **#F2C744** border and a dark overlay on the tile
     (`SKThumbnailAttachment.swift:77-79`, `:93-99`, `:113`, `:528-546`, `:570-587`;
     `.../Helpers/MultiSelectBadge/MultiSelectBadge.swift:19-29`, `:72-96`).
   - Tap toggles selection; long-press shows a preview with a "Select" action (`PhotoGalleryHorizontalScrollerCell.swift:189-245`).
   - With a selection, a green **"Attach 1 item" / "Attach %d items"** button (`attachOneItem` yaml:2254,
     `attachNItems` yaml:2251) fades in (0.3s) at the bottom: `SKButton` primary/large (`highlight2.baseInverse`
     **#007A5A / #177E56**, June `sk_lilypad_green` #007A5A; white **Lato Bold 17**, 14pt vertical padding, radius 14), 16pt
     side insets, 30pt from the bottom, over a 180pt fade of `baseSecondary` **#F8F8F8 / #1A1D21** (June
     `sk_foreground_min_solid` #F8F8F8 / #212428) at 20% → 80% → 100% (`SKListBottomSheetFeatureDeprecated.swift:156-176`;
     `SKListBottomSheetViewController.swift:23-29`, `:187-199`, `:210-224`, `:283-302`; `SKButton+Types.swift:166-167`,
     `:273-274`, `:304-305`, `:329-330`). Selected items attach when that's tapped or when the sheet closes
     (`SKListBottomSheetViewController.swift:206-208`; `SKListBottomSheetFeatureDeprecated.swift:179-186`;
     `ComposerOmnipickerPlugin.swift:158-168`).
   - No photo permission: a warning banner "To add existing photos and videos, allow access to the photo library from
     your iOS settings." (`allow_slack_to_access_your_photos_and_videos`, yaml:1720) with `svgWarningFilled`; tapping it
     asks for access / opens Settings (`OmnipickerPhotoGalleryPlugin.swift:280-284`, `:394-406`).
   - Limits: 10 items; toasts "Remove current selection to add." (yaml:16344) or "Too many items selected."
     (`OmnipickerPhotoGalleryPlugin.swift:338-356`).
2. **Slackbot actions** (new; the Slackbot DM only, when Slackbot is visible): "Skills" (`skills`, yaml:19231,
   `svgAiSkills`, with canvas access), "Apps" (`apps`, yaml:2042, `svgPlug`), "Deep Research" (`deep_research`,
   yaml:5245, `svgAiDeepResearch`) and "Web Search" (`web_search`, yaml:23546, `svgGlobe`) toggles with an ocean_50
   check when on; hairline after (`Modules/Features/ComposerPlugins/Implementation/Omnipicker Plugins/OmnipickerSlackbotActionsPlugin.swift:26-37`, `:114-168`).
3. **Actions** (`OmnipickerAddContentPlugin.swift:118-177`; labels and icons `Modules/Features/ComposerPlugins/Implementation/Legacy/Menu/PlusMenuOption.swift:52-95`),
   in order, each shown only when allowed:

| Row | Icon | Shown when |
|---|---|---|
| "Record an Audio Clip" (`record_an_audio_clip`, yaml:15855) | `svgMicrophone` | audio allowed, not Slackbot DM |
| "Take a Photo" (`take_a_photo`, yaml:21004) | `svgCamera` | photo library access *denied* (otherwise use the camera tile), not Slackbot DM |
| "Record a Video Clip" (`record_a_video_clip`, yaml:15852) | `svgVideo` | video allowed, not Slackbot DM |
| "Upload a File" (`upload_a_file`, yaml:22812) | `svgFileUpload` | always, except in an external huddle channel with `externalHuddlesBlockSharing` (new, `OmnipickerAddContentPlugin.swift:78-83`, `:138-141`) |
| "Add a GIF" (`add_a_gif`, yaml:653) | `svgGifWink` | team allows the GIF picker, not Slackbot DM |
| "Add a Salesforce record" (`add_a_record`, yaml:679) | `svgSfRecord` | flag `slackforceReferenceRecord` (new, `OmnipickerAddContentPlugin.swift:159-174`) |

   Then a hairline divider (`OmnipickerAddContentPlugin.swift:133-134`).
4. **Recent** (`OmnipickerRecentContentPlugin.swift:96-140`): "Recent Canvases" (`recent_canvases_list`, yaml:15809,
   `svgCanvasBrowser`, only with canvas access), "Recent Files" (`recent_files`, yaml:15818, `svgFileBrowser`); both
   hidden in a sharing-blocked external huddle (new, `:60-65`, `:100`).

**Row style** (all action rows; `SKGenericEntity` size `.small`): 44pt tall; margins 10 top / 16 left / 10 bottom /
16 right (`.../Helpers/EntityViews/SKEntityBaseView.swift:62-67`); a 24×24 icon box (radius 6 = 0.25 × 24;
bg `surfacePrimary` **#1D1C1D@6% / #F8F8F8@6%**; `.../DesignerComponents/OrnamentBox/SKOrnamentBox.swift:25`,
`:618-625`, `:637-639`) holding a 20pt icon in `contentPrimary` (June `sk_primary_foreground`, dark #D1D2D3;
`PlusMenuOption.swift:80-95`); 12pt to the label
(`SKEntityBaseView.swift:400-403`); label **Lato Regular 17** `contentPrimary`
(`.../EntityViews/SKEntityPrimaryContentView.swift:111-113`). PNG `testGenericEntityWithIconSmall@3x.png` (44pt,
text starts 52pt in).

**What each row does:** Record → sheet closes and recording starts (`ComposerOmnipickerPlugin.swift:260-263`); Take a
Photo / Record a Video → system camera (`OmnipickerAddContentPlugin.swift:228-233`); Upload a File → system document
picker (`:234-235`, `:301-322`); Add a GIF → Emoji/GIF sheet on the GIF tab (`:236-267`); Add a Salesforce record →
record picker (`:268-290`); Recent Files / Canvases → file or canvas picker (`OmnipickerRecentContentPlugin.swift:158-222`).
Picked items land in the attachments tray (§9).

---

## 17. Emoji / GIF sheet

From the composer's emoji button (Emoji tab) or "Add a GIF" (GIF tab)
(`Modules/Features/EmojiGifSegmentedSwitcher/Implementation/`).

- **Sheet:** `SKBottomSheet` with the flag off (`EmojiGifSegmentedSwitcherFeature.swift:39-51`); short height
  **298pt**, long height = full (`EmojiGifSegmentedSwitcherViewController.swift:18-21`, `:166-172`). Opening on the GIF
  tab, or starting a search, expands to full height (`:94-99`, `:115-127`). Background `basePrimary` (June
  `sk_primary_background`, same hex) (`:49`, `:76`); content 12pt below the top (`:19`, `:80-84`).
- **Tabs** at the top (`SKPageController`, underline style) (`:130-154`): "Emoji" (`emoji`, yaml:6228) with
  `svgEmojiFilled` when selected / `svgEmoji` otherwise; "GIFs" (`gifs`, yaml:7641) with `svgGif` / `svgGifWink`; icons
  before the title. Underline color = theme `contentSecondary` (`EmojiGifSegmentedSwitcherFeature.swift:99`); for
  the default Aubergine theme that's light `aubergine_100` #39063A at 80%, dark `aubergine_90` #E3CEEB at 90%
  (`Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift:159-162`, high contrast dark: `aubergine_100`;
  Colors.swift:1694-1704). Tab font
  and size: not traced (`SKPageController`).
- **Emoji grid** (`Modules/Features/EmojiPicker/Implementation/EmoijPicker/EmojiGrid/EmojiGridViewController.swift`):
  36×36 cells, **7 per row** on iPhone, 16pt between rows, section padding 6 top / 16 left / 6 bottom / 16 right,
  32pt section headers in **Lato 13** `contentSecondary` (`:30-35`, `:76-85`, `:330-346`;
  `.../EmojiGrid/Views/EmojiGridSectionHeader.swift:63`). Category names and the category bar: not traced.
- **Search:** 36pt search bar, placeholder "Search all emoji" (`search_emoji`, yaml:17076), 64pt header, insets
  6/8/6/8 (`.../ModalPicker/EmojiPickerViewController.swift:48-52`, `:91`). Results are 44pt rows: emoji in a 24pt
  `baseTertiary` box + the name (`.../Emoji List/Presentables/EmojiListPresentable.swift:409-441`). No results:
  "No emoji results found for\n"%@"" (yaml:12975), 15pt `contentTertiary`, centred (`.../Emoji List/EmojiListViewController.swift:49-57`, `:176`).
- Picking an emoji inserts it at the caret (`ComposerEmojiPlugin.swift:53-54`; `ComposerToolbarInteractor.swift:321-322`).
  Picking a GIF attaches it (`ComposerEmojiPlugin.swift:111-129`).
- GIF tab layout: not traced (`Modules/Features/GifPicker`).

---

## 18. Autocomplete (@ people, # channels, : emoji, / commands)

Path shorthands for this section:
`ARPC` = `Modules/Features/Autocomplete/Implementation/Legacy/Presentation/AutocompleteResultsPresentationController.swift`,
`ARV` = `Modules/Features/Autocomplete/Implementation/Legacy/View/Results View/AutocompleteResultsView.swift`,
`ARVM` = `Modules/Features/Autocomplete/Implementation/Legacy/View Model/AutocompleteResultsViewModel.swift`,
`ACF` = `Modules/Features/Autocomplete/Implementation/AutocompleteFeature.swift`,
`WAO` = `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygAutocompleteOpportunity.swift`,
`CII` = `Modules/Features/Composer/Implementation/ComposerInput/ComposerInputInteractor.swift`,
`SKX-X` = `Modules/UIInfra/SlackKitExtensions/Implementation/List/SKListCellPresentationObject+X.swift`,
`EV/` = `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/`,
`ENT/` = `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/`.
(The folder is called `Legacy/`, but it's the live code the composer uses: ACF:47, ACF:105,
`Modules/Features/Autocomplete/Implementation/AutocompleteFeature+Dependencies.swift:93-146`.)

### 18.1 Triggers

- Four triggers (WAO:11-16): `@` people (+ user groups + @here/@channel/@everyone, ARVM:552-564), `#` channels,
  `:` emoji, `/` commands + workflows + shortcuts + built-ins (ARVM:171-178, 569-573). New since June: built-ins
  ("fakecuts") are left out in New Message (`:171-177`); coding channels list their agents' commands first, up to 20
  (`.agentCommands`, ARVM:689-815); the Slackbot DM adds Slackbot skills when `slackbotSkillsSlashCommand` is on
  (default off, ARVM:602-614).
- Allowed right before the trigger: start of text, whitespace, U+200B, or one of `{ [ ( * _ / " “ ' ‘ ’ < :`
  (WAO:104-115).
- Query: for `@ # /`, up to 3 words separated by single spaces (WAO:90-97); for `:` any whitespace ends it
  (WAO:98-103). Not offered inside an existing mention, inline code or a code block (WAO:143-145), or right after a
  newline (WAO:126-129).
- `/` only works as the very first character of the message (WAO:146-150).
- No minimum length. Empty `@` / `#` show up to 24 frecent people / channels (ARVM:72-77, 636-687); empty `/` shows all
  commands (recent workflows, channel shortcuts, global shortcuts, commands, built-ins; ARVM:690-815); empty `:` shows
  nothing (inferred: the frecent provider has no emoji; `Modules/DataService/SlackDataProviders/Interface/UsersAndConversations/UnifiedOutputTypes.swift:52-68`).
- Search: input debounced 0.15s, output throttled 0.2s, max 24 results
  (`Modules/DataService/AutocompleteDataProvider/Implementation/LegacyAutocompleteDataProvider.swift:365-366`, the June
  `AutocompleteDataProvider.swift` renamed; ARPC:217; `AutocompleteConstants`, 20 in a canvas, ARVM:72-77).
- Closes when a row is picked (CII:277-279), when the query stops being valid (a 4th word, a double space, a newline,
  the caret leaving the token; `Modules/Features/Autocomplete/Implementation/WysiwygAutocompleteService.swift:79-105`),
  or when the composer loses focus (CII:390-394). Closing isn't animated (ARPC:324-345).
- Toolbar "@" inserts `@` at the caret (adding a space before it if needed) and so opens the list
  (`ComposerMentionPlugin.swift:27-31`; `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygKeyboardEditContext+MentionSlugEventHandling.swift:12-57`;
  new: it may now interrupt an opportunity that accepts interruption, `:15-29`).
  Toolbar "/" inserts `/`, which only opens the list if the message was empty (CII:328-332).

### 18.2 The floating card

- A separate card added to the conversation screen, **floating above the message list** (not inside the composer,
  doesn't push content) (ARPC:313).
- **Vertical:** if there's more room above the caret, the card's bottom sits **16pt above the caret's top**; otherwise
  its top sits 16pt below the caret (ARPC:52, 458-471, 511-519). It follows the caret line and moves with the
  keyboard's animation (ACF:210-223). Usable area excludes the keyboard and starts 3pt below the top safe area
  (ACF:239-255).
- **Horizontal (iPhone):** full width between the host view's layout margins (ARPC:500-507; ACF:265-275). The margin
  value itself isn't set in code (UIKit default; not verified).
- **Height:** sum of row heights, capped at **min(240pt, available − 8)** (ARPC:67-74, ARPC:48, ARV:153-156). 240pt ≈
  5.5 one-line rows. 0 rows → 0pt (hidden) (ARPC:56-64).
- **Look (iOS 26):** `UIGlassEffect()` glass, no tint (ARV:25-34, 114-119); corner radius **8** (ARV:90-92, 136);
  1-pixel border (0.33pt at @3x) `outlineTertiary` **#5E5D60@13% / #797C81@30%** (ARV:94-96, 138-139); shadow black
  10%, radius 4, offset 0 (ARV:91-94, 141-144). Rows are clear (ARVM:472-477). *(Legacy: `basePrimary` fill, 8pt side
  insets, no 16pt caret gap: ARV:121-125, ARPC:460, 488-498.)*
- **Appear** (0 → some rows only): fade in 0.075s, and slide 6pt toward its final spot over 0.15s ease-out
  (ARPC:49-50, 376-408); selection haptic (ARPC:310, 395). Height changes: 0.17s spring, damping 0.85 (ARPC:523-533).
- Scrolls inside, without dismissing the keyboard (ARV:47); back to top on each new query (ARVM:180-185). One section,
  no header, no separators (ARVM:446). Hardware keyboard: ↑/↓/Tab move the highlight, Return picks
  (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:2643-2671`).
- **No** loading, empty or "no results" state (ARVM:442-448, 592-600). **No** highlighting of matched text (rows use
  plain text; ARVM:331-437).
- No snapshot of the card exists.

### 18.3 Row anatomy (all rows: SlackKit entity at size `.small`)

- Padding 10 top / 16 left / 10 bottom / 16 right (`EV/SKEntityBaseView.swift:61-67`); 24×24 leading ornament
  (`EV/SKEntityOrnamentView.swift:416-427`) then 12pt to the text (`EV/SKEntityBaseView.swift:400-403`); items on the
  name line 8pt apart (`EV/SKEntityPrimaryContentView.swift:103`); everything vertically centred.
- Height = max(24, text) + 20 → **44pt** one line, **56.33pt** with a caption line (measured from the PNGs below).
- Name 1 line, tail "…" (`SKX-Member:74`). Rows never show a leading "@" or "#".
- Pressed / keyboard-highlighted: a `baseTertiary` (**#EAEAEA / #212428**) rounded rect, full row height, inset 4pt
  left/right, radius 12 continuous (`EV/SKEntityBackgroundView.swift:43`, `:54-55`, `:71-72`, `:116-118`); the row also
  scales to about 0.978 with the §5.3 spring
  (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Cells/SKListCollectionViewCell.swift:220-239`).
- Disabled: text `contentTertiary`, ornament 60% (`EV/SKEntityContentView.swift:58`; `EV/SKEntityOrnamentView.swift:68`, `:107`).

| Row | Ornament | Primary | Trailing / secondary | Source |
|---|---|---|---|---|
| **Person** | 24pt avatar, radius 6 (0.25 × 24); presence dot ≈7.8pt at bottom-right with a ~2.9pt cut-out ring: online filled `highlight2.content` **#007A5A / #3DAA7C**, away = ring `contentTertiary` | display name (or real name) **Lato Bold 17** `contentPrimary` | the other name **Lato 17** `contentSecondary`; then 20pt status emoji; external org: 20pt org avatar (r4) + org name; right-aligned accessory **Lato 17** `contentSecondary`: "Not in channel" / "Not on Slack" / "Not in canvas" | ARVM:333-373; `SKX-Member:120-145`, `:244-254`; `ENT/MemberEntity/SKMemberEntity.swift:145-187`; `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift:98-146`, `:415-436`, `:814-870`; yaml 13181, 13198, 13174 |
| Deactivated person | grayscale avatar | "%@ (deactivated)" `contentTertiary` | | `SKX-Member:246-248`; yaml:12716 |
| **Bot / app** | 24pt image, radius 4, no presence | **Lato Bold 17** | badge "APP" / "AGENT" / "AGENTFORCE": **Lato Bold 12** `contentSecondary` on `baseTertiary`, radius 4, padding 2/4, 8pt after the name | `SKX-Member:172-207`; `EV/SKEntityPrimaryContentView.swift:103-106`, `:172-179`, `:240-242` |
| **@here / @channel / @everyone** | `svgMegaphone` 20pt `contentPrimary` | "here" / "channel" / "everyone" **Lato 17** | "Notify everyone online in this channel" / "Notify everyone in this channel" / "Notify everyone on your team" **Lato 17** `contentSecondary`; in threads disabled: "Disabled in threads" | ARVM:403-404; `SKX-UserBroadcast:17-19`; `ENT/UserGroupEntity/SKUserGroupEntity.swift:53-94`; yaml 2203, 2173, 2188, 5477 |
| **User group** | `svgUserGroups` 20pt | group name **Lato 17** | description `contentSecondary` | `SKX-UserGroup:16-22` |
| **Channel** | `svgChannelFilled` (public), `svgLockFilled` (private), `svgArchive` (archived); muted: outline icons in `contentTertiary` | name without "#", **Lato Bold 17** `contentPrimary` | none (duplicate names add the workspace name); archived: "{name} (archived)", disabled | ARVM:375; `SKX-Channel:44`, `:118-172`; `ENT/ChannelEntity/SKChannelEntity.swift:171-234` |
| **Emoji** | 20pt emoji in a clear 24pt box | name without colons, e.g. "smile", **Lato 17** | | ARVM:378-379; `SKX-Emoji:16-18`; `ENT/EmojiEntity/SKEmojiEntity.swift:48-59` |
| **Command / workflow / shortcut** (56.33pt, 2 lines) | app icon 24pt r4; core commands `svgSlackLogo`, others `svgCode` | "/name" (commands) or name, **Lato 17** `contentPrimary` | **Lato 13** `contentSecondary`: "Command • {description}", "Workflow • {desc}", "Shortcut • {desc}", "Built-in" (these prefixes are hard-coded English) | ARVM:380-402; `SKX-SlashCommand:23-52`; `SKX-Workflow:18-47`; `SKX-Shortcut:57-142` |

New since June (flagged, default off): with `atMenuHideExternalBots` other orgs' bots are dropped from the @ list outside
Slack Connect channels (ARVM:337-346; `Modules/Data/Toggles/Definitions/ios_at_menu_hide_external_bots.json`); with
`sailExternalAutocompleteFeedback` a link-colored Lato 13 "Give feedback" row (`unexpected_results`, yaml:22527) is
appended (ARVM:452-470).

### 18.4 What picking a row inserts

- Person: a mention "@{display name or real name}" replacing "@query"; a space is added before it if it would touch the
  previous word, and after it at the end of text or before a letter (not before punctuation)
  (CII:277-306; `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygKeyboardEditContext+SlugSpacing.swift:74-138`;
  tests `Modules/UIInfra/Wysiwyg/Tests/Unit/Autocomplete and Slugs/WysiwygKeyboardEditContext+MentionSlugEventHandlingTests.swift:93-109`).
  It renders as a mention pill (§8).
- Group / broadcast / channel: "@group", "@here", or a channel mention pill, same spacing rules.
- Command: plain text "/name " with a trailing space
  (`Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygKeyboardEditContext+CommandHandling.swift:12-30`).
- Emoji: the glyph replaces ":query", no trailing space (`Modules/UIInfra/Wysiwyg/Implementation/Emoji/WysiwygEmojiPayload.swift:30-35`).
  Typing a full `:heart:` converts without the list (CII:400-416).
- Workflow / shortcut / built-in: runs it and clears the composer (CII:292-302).

**Reference PNGs** (`Modules/UIInfra/SlackKit/Snapshots/iOS_26/`, light over dark): 
`SlackKitTests.SKMemberEntitySnapshotTests/testMemberEntitySmallWithUserDataActive@3x.png` (avatar + online dot, bold
name + gray alt name, 44pt), `SlackKitTests.SKChannelEntitySnapshotTests/testChannelEntitySmall@3x.png`,
`SlackKitTests.SKUserGroupEntitySnapshotTests/testUserGroupEntitySmallBroadcast@3x.png` (megaphone),
`SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithEmojiSmall@3x.png` (emoji row),
`SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmallWithSecondaryText@3x.png` (two-line
command-row geometry).

---

## 19. New Message screen

`Modules/Features/ComposeMessage/Implementation/`. It's a conversation screen (message transcript) with a "To:" field
as the list's top drawer and the normal composer as its bottom drawer (`ComposeMessageViewController.swift:33-48`;
`ComposeMessageDestinationPickerPlugin.swift:127`).

- **Nav bar:** title "New Message" (`new_message`, yaml:12839), a close button on the left, and, when you have drafts,
  a "Drafts" / "Drafts (%d)" text button on the right (`drafts_title_case` yaml:5883, `drafts_count` yaml:5873)
  (`ComposeMessageViewController.swift:33-67`). Both now go through the screen's `navigationTitleConfigurator`; the drafts
  button is a title `SKBarButtonItem` built by the presenter ("Drafts (%d)" only above one draft,
  `ComposeMessagePresenter.swift:25-47`). Background `basePrimary` (`ComposeMessageViewController.swift:34`). How it's presented (modal vs push) isn't set here.
- **"To:" field** (`ComposeMessageDestinationPickerWidget.swift:473-485`,
  `DestinationPicker/ComposeMessageDestinationPickerPresentable.swift`):
  - Prefix "To: " (`to_with_colons`, yaml:21777) in **Lato 17** `sk_light_gray` **#868686**; placeholder "Search for a
    channel or conversation" (`search_for_a_channel_or_conversation`, yaml:17096) in **Lato 17** `contentTertiary`
    (**#5E5D60 / #9A9B9E**), vertically centred, 4pt in from the start of the text area (`DestinationPicker/ComposeMessageDestinationPicker.swift:426`).
  - Typed text **Lato 17** `contentPrimary`; background `basePrimary`; 16pt side insets; 8pt between prefix and
    tokens (`ComposeMessageDestinationPickerPresentable.swift:23-46`, `:56-58`; the file moved to
    `Modules/Features/ComposeMessage/Interface/DestinationPicker/`).
  - Height: min = 2 × 4 + 40 = **48pt**, grows with wrapped tokens up to 4 × 48 = **192pt**
    (`:50`, `:73`, `:90-94`; `tokenHeight = 40`, `Modules/Features/TokenizedSearch/Interface/Views/TokenSearchInputStyle.swift:20`).
  - Bottom hairline (1 pixel) `outlineTertiary` (`ComposeMessageDestinationPicker.swift:114-120`, `:414-430`).
  - Focused automatically on a fresh New Message (`ComposeMessageDestinationPickerWidget.swift:492-494`).
- **Recipient tokens** (`SKTokenView`, `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TokenView/SKTokenView.swift`):
  radius **8** (`SKTokenView.swift:65-73`); background `highlight1.base` = `dt_color_base_highlight_1` **#E3F8FF / #001A2D**; selected
  (tapped, ready to delete with backspace) `highlight1.baseInverse` **#1264A3 / #0A77A7** (dark was #004D76 before
  design-tokens f76ac0a) with text
  `contentInversePrimary` **#FFFFFF / #F8F8F8**; ornament area `highlight1.surface` (`:875-881`; Colors.swift:62, :98,
  :248); name **Lato Bold 17** `contentPrimary` (`SKTokenView.swift:502-508`); a square avatar (people), `#`/lock icon (channels) on the
  left, as tall as the text (`SKTokenView.swift:144-145`, `:284`; `ComposeMessageDestinationTokenFactory.swift:90-98`; drawn as
  `TokenCell`s by `DestinationPicker/TokenLayoutManager.swift:13-22`, sized in `TokenTextAttachment.swift:38-46`); 8pt internal
  spacing (`SKTokenView.swift:64`). Tokens are 32pt tall inside a 40pt row (`TokenSearchInputStyle.swift:13-20`;
  `Modules/Features/TokenizedSearch/Interface/Views/Cells/TokenOverlayCell.swift:20-44`). PNG
  `testTokenResolvedMemberOrnament@3x.png`.
  - Thread drafts show plain text "Thread in #general" (`thread_in_x`, yaml:21641) and can't be edited
    (`ComposeMessageDestinationPickerWidget.swift:496-517`, `:545-552`).
- **Suggestions list** under the field: 44pt people/channel rows (`cellSize: .small`,
  `ComposeMessageFeature+Dependencies.swift:105-117`), same row anatomy as §18.3. Up to **8** recipients
  (`maxSelectableItems = 8`, `:115`; `maxUsersPerMPDM = 8`, `ComposeMessageDestinationPickerWidget.swift:40`).
  - Errors: "Only 8 people can be added. Create a channel to add more." (yaml:4416), "You can only message one
    channel at a time." (yaml:4427), "Cannot address a message to both a channel and users" (yaml:4424)
    (`DestinationPicker/destination/ComposeMessageDestinationError.swift:120-132`).
  - No matches: "No matches found. Try an email?" (yaml:13000) / "No matches found in **%@**" (yaml:12996), in
    `contentTertiary` (`FrecentConversations/ComposeMessageListCellProvider.swift:80-128`).
  - Typing a full email offers invite rows ("Message with external people", yaml:12297, etc.)
    (`ComposeMessageFrecentConversationsPlugin.swift:520-548`).
- **Composer:** placeholder "Write a message" until there's a recipient, then "Message …" per §3.1
  (`PlaceholderTextPublisher.swift:174-176`).
- **Close with a draft:** alert "Delete draft?" / "Are you sure you want to delete this draft?" with "Delete" /
  "Cancel"; "Draft saved" toast otherwise (`DiscardDraftAlertHandler.swift:42-84`; yaml 5297, 5876, 5285, 3204, 5867).
- What happens right after sending (navigation): not traced.

---

## 20. Color quick reference

Legacy `sk_*` colors (`SKLegacyColors.swift`, lines unchanged since June). Most composer uses moved to `CoreColorSet`
tokens in latest; the last column says what the composer still uses each for.

| Token (iOS) | Light | Dark | Defined | Latest composer use |
|---|---|---|---|---|
| `sk_foreground_max_solid` | #616061 | #9A9C9E | `SKLegacyColors.swift:70` | none (June: default toolbar icon, send-to-channel box; now `contentSecondary`, `ComposerToolbarPluginType.swift:68`) |
| `sk_sky_blue` | #1D9BD1 | #1D9BD1 | `SKLegacyColors.swift:232` | default pressed/selected icon, active format icon (`ComposerToolbarPluginType.swift:68`; `ComposerWysiwygPlugin.swift:68`) |
| `sk_frosty_blue` | #1D9BD1@10% | #1D9BD1@10% | `SKLegacyColors.swift:252` | active format circle, pressed attachment chip (`ComposerWysiwygPlugin.swift:68`; `ComposerAttachmentsPlugin.swift:38`) |
| `sk_lilypad_green` | #007A5A | #007A5A | `SKLegacyColors.swift:192` | only highlighted-workflow buttons (`ComposerHighlightedWorkflowsPlugin.swift:295`); send/save are `highlight2.baseInverse` |
| `sk_raspberry_red` | #E01E5A | #E01E5A | `SKLegacyColors.swift:202` | cancel edit, waveform near the limit (`ComposerCancelEditingPlugin.swift:38`; `AudioClipRecordingView.swift:123`) |
| `sk_highlight` | #1264A3 | #1D9BD1 | `SKLegacyColors.swift:125` | none (June: formatting close, mic selected, stop, audio done, checked box; now `highlight1.baseInverse` / `.content`) |
| `sk_primary_foreground` | #1D1C1D | #D1D2D3 | `SKLegacyColors.swift:27-29` | none (June: send-to-channel label, banner text, remove ×, sheet icons; now `contentPrimary`) |
| `sk_primary_background` | #FFFFFF | #1A1D21 | `SKLegacyColors.swift:34-39` | none (June: sheets, remove-× ring; now `basePrimary`, same hex) |
| `sk_foreground_soft_solid` | #F3F3F3 | #24272A | `SKLegacyColors.swift:105-107` | none (June in-card banner; `ContextBarView` now `baseTertiary`) |
| `sk_foreground_low_solid` | #DDDDDD | #323538 | `SKLegacyColors.swift:95` | none (June audio-clip card border; now `outlineTertiary`, `ComposerAudioAttachmentCell.swift:39`) |
| `sk_secondary_highlight` (selected photo border) | #F2C744 | #F2C744 | `SKLegacyColors.swift:140`, `:217` | selected photo tile (`SKThumbnailAttachment.swift:113`) |
| `message_rendering_code` | #E01E5A | #E8912D | `SKLegacyColors.swift:339` | inline code text (`WysiwygTextProcessor+Config.swift:107`) |
| `message_rendering_mention_text` | #0B4C8C | #1D9BD1 | `SKLegacyColors.swift:338` | mention text (`WysiwygTextProcessor+Config.swift:108`) |

Design tokens (design-tokens `f76ac0a`, the commit the app pins now; `Colors.swift` lines are that file's):

| Token (iOS) | Light | Dark | Defined |
|---|---|---|---|
| `dt_color_base_primary` (`basePrimary`) | #FFFFFF | #1A1D21 | Colors.swift:42 |
| `dt_color_base_secondary` (`baseSecondary`, "Attach" fade) | #F8F8F8 | #1A1D21 | :50 |
| `dt_color_base_tertiary` (`baseTertiary`, attachment chip, pill pressed) | #EAEAEA | #212428 | :56 |
| `dt_color_surface_primary` (`defaultPluginButton` fill: "+", recording ×, reschedule) | #1D1C1D@6% | #F8F8F8@6% | :134 |
| `dt_color_surface_secondary` (`defaultPluginButton` pressed) | #1D1C1D@25% | #F8F8F8@25% | :140 |
| `dt_color_content_primary` | #1D1C1D | #F8F8F8 | :200 |
| `dt_color_content_secondary` (default toolbar icon, unchecked box, camera tile) | #454447 | #B9BABD | :206 |
| `dt_color_content_tertiary` (placeholder, schedule footer) | #5E5D60 | #9A9B9E | :212 |
| `dt_color_outline_secondary` (disabled send icon) | #5E5D60@45% | #797C81@50% | :296 |
| `dt_color_outline_tertiary` (borders, quote bar) | #5E5D60@13% | #797C81@30% | :302 |
| `dt_color_surface_highlight_1` (mention pill) | #36C5F0@13% | #036696@25% | :146 |
| `dt_color_surface_highlight_3` (self-mention pill) | #FFC600@18% | #A07300@18% | :158 |
| `dt_color_content_highlight_1` (`highlight1.content`: links, checked box, waveform, banner links) | #1264A3 | #2BA5CE | :218 |
| `dt_color_base_highlight_1` (`highlight1.base`: token, info bar) | #E3F8FF | #001A2D | :62 |
| `dt_color_base_inverse_highlight_1` (`highlight1.baseInverse`: mic selected, stop, formatting close, recording done, selected token, coachmark bar) | #1264A3 | **#0A77A7** (df1f228: #004D76) | :98 |
| `dt_color_base_inverse_highlight_2` (`highlight2.baseInverse`: send, save, primary `SKButton`) | #007A5A | **#177E56** (df1f228: #00553D) | :104 |
| `dt_color_content_inverse_primary` | #FFFFFF | #F8F8F8 | :248 |

The tokens now also carry `lightHighContrast` / `darkHighContrast` values (e.g. `content_primary` #000000 / #FFFFFF), used
with iOS Increase Contrast; the clone draws the normal values.

`CoreColorSet.default.*` → `dt_color_*` mapping: `Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift:68-111`
(`highlight1/2/3`, `important`), `:119-158` (`primary`). Colors.swift is the pinned design-tokens `output/ios/Colors.swift`,
vendored at `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift` (`DESIGN_TOKENS_SHA`, `internal.MODULE.bazel:209`).

---

## 21. Gaps

- **Few composer snapshots.** The focused/formatting/recording states of the bar, the "+" sheet and the New Message
  screen still have no PNG baseline. New since June in `Modules/Features/Composer/Snapshots/iOS_26/`:
  `ComposerFeatureTests.ComposerGlassButtonsSnapshotTests/` (the collapsed composer with the Slackbot / quick-search glass
  buttons of the Radical Simplification navigation variant, `AnyConversationPresenter.swift:449-452`; glass not rendered)
  and `ComposerFeatureTests.ComposerAttachmentsViewSnapshotTests/` (the tray, with and without the image-markup banner).
  Geometry above is from constants.
- **Glass material** (`UIGlassEffect`): blur, tint and highlight are system-defined; no values in the repo.
- **Server-controlled flags:** `composerContextBar` is gone in latest (the standalone context bar is the only layout,
  §14); `bottomsheetMigration` still defaults to off (`Modules/Data/Toggles/Definitions/ios_bottomsheet_migration.json:6`)
  but can be turned on remotely; both sheet variants are noted.
- **Disabled look of "/" and formatting buttons:** the code sets `enabled` on these plugins but `ComposerToolbarView`
  doesn't read it for icon buttons (§5.3), so no visual change was found.
- **Link editor dialog** (add/edit link from the formatting toolbar): layout and strings not traced
  (`WysiwygLinkEditing` implementation; looked in `ComposerInputFeature.swift`, `ComposerIntputFeature+Dependencies.swift`).
- **Caret color, placeholder truncation mode:** not set in the composer code (system defaults).
- **Emoji picker:** category names, category bar and skin-tone control not traced; GIF tab not traced.
- **Full photo library picker** ("View Library"), camera/photo permission prompts
  (`Modules/Features/PhotoLibrary`, `Modules/Integration/InputMediaAuthorization`, `Modules/UIInfra/LegacyPhotoPicker`,
  `Modules/Features/FilePickerPlugin`): not traced beyond the banner in §16.
- **Schedule sheet** row styling beyond the constants in §13: not traced.
- **Autocomplete card side margins:** uses the host view's layout margins, whose value isn't set in code.
- **Jump-to-latest pill:** resolved, a bottom-drawer item above the context bar and the composer (§15.1).
- **New Message:** presentation style (modal/push) and post-send navigation not traced.

---

## Appendix: file index

Short file names used above resolve to these repo-root paths in the latest checkout (every name is unique in the repo
except `LayoutManager.swift`, which always means the SlackKit one listed here; June-only files are marked). `Colors.swift` is the design-tokens file
named in the README; `SKListCellPresentationObject+X.swift` stands for the per-type files in
`Modules/UIInfra/SlackKitExtensions/Implementation/List/`.

| File | Path |
|---|---|
| `AnyConversationFeatureInterface.swift` | `Modules/Features/AnyConversation/Interface/AnyConversationFeatureInterface.swift` |
| `AnyConversationPresenter.swift` | `Modules/Features/AnyConversation/Implementation/AnyConversationPresenter.swift` |
| `AttachmentOrnament.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/AttachmentOrnament/AttachmentOrnament.swift` |
| `AudioClipLongformComposerOverlay.swift` | `Modules/Features/Composer/Implementation/Composer/Views/AudioClipLongformComposerOverlay.swift` (June only; removed in latest) |
| `AudioClipRecordingView.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/Views/AudioClipRecordingView.swift` |
| `AutocompleteDataProvider.swift` | `Modules/DataService/AutocompleteDataProvider/Implementation/AutocompleteDataProvider.swift` (June; renamed `LegacyAutocompleteDataProvider.swift`) |
| `AutocompleteFeature+Dependencies.swift` | `Modules/Features/Autocomplete/Implementation/AutocompleteFeature+Dependencies.swift` |
| `AutocompleteFeature.swift` | `Modules/Features/Autocomplete/Implementation/AutocompleteFeature.swift` |
| `AutocompleteResultsPresentationController.swift` | `Modules/Features/Autocomplete/Implementation/Legacy/Presentation/AutocompleteResultsPresentationController.swift` |
| `AutocompleteResultsView.swift` | `Modules/Features/Autocomplete/Implementation/Legacy/View/Results View/AutocompleteResultsView.swift` |
| `AutocompleteResultsViewModel.swift` | `Modules/Features/Autocomplete/Implementation/Legacy/View Model/AutocompleteResultsViewModel.swift` |
| `BottomContentInsetAccounting.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Accounting/BottomContentInsetAccounting.swift` |
| `BulletedListPrefixGenerator.swift` | `Modules/Data/TextModels/Implementation/BulletedListPrefixGenerator.swift` |
| `ColorSet.swift` | `Modules/UIInfra/DesignTokens/Implementation/ColorSet.swift` |
| `ComposeMessageDestinationError.swift` | `Modules/Features/ComposeMessage/Implementation/DestinationPicker/destination/ComposeMessageDestinationError.swift` |
| `ComposeMessageDestinationPicker.swift` | `Modules/Features/ComposeMessage/Implementation/DestinationPicker/ComposeMessageDestinationPicker.swift` |
| `ComposeMessageDestinationPickerPlugin.swift` | `Modules/Features/ComposeMessage/Implementation/ComposeMessageDestinationPickerPlugin.swift` |
| `ComposeMessageDestinationPickerPresentable.swift` | `Modules/Features/ComposeMessage/Interface/DestinationPicker/ComposeMessageDestinationPickerPresentable.swift` |
| `ComposeMessageDestinationPickerWidget.swift` | `Modules/Features/ComposeMessage/Implementation/ComposeMessageDestinationPickerWidget.swift` |
| `ComposeMessageDestinationTokenFactory.swift` | `Modules/Features/ComposeMessage/Interface/DestinationPicker/ComposeMessageDestinationTokenFactory.swift` |
| `ComposeMessageFeature+Dependencies.swift` | `Modules/Features/ComposeMessage/Implementation/ComposeMessageFeature+Dependencies.swift` |
| `ComposeMessageFrecentConversationsPlugin.swift` | `Modules/Features/ComposeMessage/Implementation/ComposeMessageFrecentConversationsPlugin.swift` |
| `ComposeMessageListCellProvider.swift` | `Modules/Features/ComposeMessage/Implementation/FrecentConversations/ComposeMessageListCellProvider.swift` |
| `ComposeMessagePresenter.swift` | `Modules/Features/ComposeMessage/Implementation/ComposeMessagePresenter.swift` |
| `ComposeMessageViewController.swift` | `Modules/Features/ComposeMessage/Implementation/ComposeMessageViewController.swift` |
| `ComposerAccessoryButton+PresentationObjects.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerAccessoryButton+PresentationObjects.swift` |
| `ComposerAccessoryLayout.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerAccessoryLayout.swift` |
| `ComposerAttachmentRemoveButton.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/Views/ComposerAttachmentRemoveButton.swift` |
| `ComposerAttachmentsPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerAttachmentsPlugin.swift` |
| `ComposerAttachmentsPresenter.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/ComposerAttachmentsPresenter.swift` |
| `ComposerAttachmentsView.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/Views/ComposerAttachmentsView.swift` |
| `ComposerAudioAttachmentCell.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/Views/ComposerAudioAttachmentCell.swift` |
| `ComposerAudioCancelPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerAudioCancelPlugin.swift` |
| `ComposerAudioDonePlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerAudioDonePlugin.swift` |
| `ComposerAudioPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerAudioPlugin.swift` |
| `ComposerBackgroundView.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerBackgroundView.swift` |
| `ComposerCancelEditingPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerCancelEditingPlugin.swift` |
| `ComposerCancelScheduleSaveToDraftsPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerCancelScheduleSaveToDraftsPlugin.swift` |
| `ComposerCompactAttachmentCell.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/Views/ComposerCompactAttachmentCell.swift` |
| `ComposerContainerView.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerContainerView.swift` |
| `ComposerDataTypes.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerDataTypes.swift` |
| `ComposerEmojiPlugin.swift` | `Modules/Features/ComposerCorePlugins/Implementation/Plugins/ComposerEmojiPlugin.swift` |
| `ComposerFeature+Dependencies.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerFeature+Dependencies.swift` |
| `ComposerGlassButtonView.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerGlassButtonView.swift` |
| `ComposerGlassGeometry.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerGlassGeometry.swift` |
| `ComposerHandlebarView.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerHandlebarView.swift` |
| `ComposerHighlightedWorkflowsPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerHighlightedWorkflowsPlugin.swift` |
| `ComposerInfoPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerInfoPlugin.swift` |
| `ComposerInputDataTypes.swift` | `Modules/Features/Composer/Implementation/ComposerInput/ComposerInputDataTypes.swift` |
| `ComposerInputFeature.swift` | `Modules/Features/Composer/Implementation/ComposerInput/ComposerInputFeature.swift` |
| `ComposerInputInteractor.swift` | `Modules/Features/Composer/Implementation/ComposerInput/ComposerInputInteractor.swift` |
| `ComposerInputPresenter.swift` | `Modules/Features/Composer/Implementation/ComposerInput/ComposerInputPresenter.swift` |
| `ComposerInputViewController.swift` | `Modules/Features/Composer/Implementation/ComposerInput/ComposerInputViewController.swift` |
| `ComposerInteractor.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerInteractor.swift` |
| `ComposerIntputFeature+Dependencies.swift` | `Modules/Features/Composer/Implementation/ComposerInput/ComposerIntputFeature+Dependencies.swift` |
| `ComposerLongformContainerView.swift` | `Modules/Features/Composer/Implementation/Composer/MessageTranscriptIntegration/ComposerLongformContainerView.swift` |
| `ComposerMentionPlugin.swift` | `Modules/Features/ComposerCorePlugins/Implementation/Plugins/ComposerMentionPlugin.swift` |
| `ComposerMessagePreviewPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerMessagePreviewPlugin.swift` |
| `ComposerOmnipickerPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerOmnipickerPlugin.swift` |
| `ComposerPlaceholderView.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/Views/ComposerPlaceholderView.swift` |
| `ComposerPresenter.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerPresenter.swift` |
| `ComposerRescheduleDraftPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerRescheduleDraftPlugin.swift` |
| `ComposerSectionDividerView.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/Views/ComposerSectionDividerView.swift` |
| `ComposerSendPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerSendPlugin.swift` |
| `ComposerSendToChannelView.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerSendToChannelView.swift` |
| `ComposerSendToChannelViewSnapshotTests.swift` | `Modules/Features/Composer/Tests/Unit/ComposerSendToChannelViewSnapshotTests.swift` |
| `ComposerSlashCommandPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerSlashCommandPlugin.swift` |
| `ComposerStopStreamingPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerStopStreamingPlugin.swift` |
| `ComposerTextFormattingPlugin.swift` | `Modules/Features/ComposerCorePlugins/Implementation/Plugins/ComposerTextFormattingPlugin.swift` |
| `ComposerThumbnailAttachmentCell.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/Views/ComposerThumbnailAttachmentCell.swift` |
| `ComposerToolbarAnimator.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/Views/ComposerToolbarAnimator.swift` |
| `ComposerToolbarContainerView.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/Views/ComposerToolbarContainerView.swift` |
| `ComposerToolbarFeature.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/ComposerToolbarFeature.swift` |
| `ComposerToolbarInteractor.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/ComposerToolbarInteractor.swift` |
| `ComposerToolbarLayoutManager.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/ComposerToolbarLayoutManager.swift` |
| `ComposerToolbarPluginFactory+Dependencies.swift` | `Modules/Features/ComposerPlugins/Implementation/ComposerToolbar/Plugins/ComposerToolbarPluginFactory+Dependencies.swift` |
| `ComposerToolbarPluginType.swift` | `Modules/Features/Composer/Interface/ComposerToolbar/Plugins/ComposerToolbarPluginType.swift` |
| `ComposerToolbarView.swift` | `Modules/Features/Composer/Implementation/ComposerToolbar/Views/ComposerToolbarView.swift` |
| `ComposerView.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerView.swift` |
| `ComposerViewConstants.swift` | `Modules/Features/Composer/Implementation/Composer/Views/ComposerViewConstants.swift` |
| `ComposerViewController.swift` | `Modules/Features/Composer/Implementation/Composer/ComposerViewController.swift` |
| `ComposerWysiwygPlugin.swift` | `Modules/Features/ComposerCorePlugins/Implementation/Plugins/ComposerWysiwygPlugin.swift` |
| `ContentOffsetAccounting.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Accounting/ContentOffsetAccounting.swift` |
| `ContextBarActiveParticipantsConfiguration.swift` | `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarActiveParticipantsConfiguration.swift` |
| `ContextBarBottomDrawer.swift` | `Modules/Features/AnyConversation/Implementation/Plugins/ContextBarBottomDrawer.swift` |
| `ContextBarConfiguration.swift` | `Modules/UIInfra/ContextBarUI/Implementation/ContextBarConfiguration.swift` |
| `ContextBarContentPlugin.swift` | `Modules/Features/AnyConversation/Implementation/Plugins/ContextBarContentPlugin.swift` |
| `ContextBarData.swift` | `Modules/Integration/ContextBar/Implementation/ContextBarData.swift` |
| `ContextBarDraftConfiguration.swift` | `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarDraftConfiguration.swift` |
| `ContextBarRowView.swift` | `Modules/UIInfra/ContextBarUI/Implementation/Views/ContextBarRowView.swift` |
| `ContextBarScheduleMessageConfiguration.swift` | `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarScheduleMessageConfiguration.swift` |
| `ContextBarTypingConfiguration.swift` | `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarTypingConfiguration.swift` |
| `ContextBarView.swift` | `Modules/Integration/ContextBar/Interface/ContextBarView.swift` |
| `CustomConstraintHelpers.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/LayoutConstraints/CustomConstraintHelpers.swift` |
| `DefaultListDrawerAppearanceAnimation.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/BottomDrawer/Animation/DefaultListDrawerAppearanceAnimation.swift` |
| `DefaultThemeColorSet.swift` | `Modules/UIInfra/DesignTokens/Implementation/DefaultThemeColorSet.swift` |
| `DiscardDraftAlertHandler.swift` | `Modules/Features/ComposeMessage/Implementation/DiscardDraftAlertHandler.swift` |
| `EmojiGifSegmentedSwitcherFeature.swift` | `Modules/Features/EmojiGifSegmentedSwitcher/Implementation/EmojiGifSegmentedSwitcherFeature.swift` |
| `EmojiGifSegmentedSwitcherViewController.swift` | `Modules/Features/EmojiGifSegmentedSwitcher/Implementation/EmojiGifSegmentedSwitcherViewController.swift` |
| `EmojiGridSectionHeader.swift` | `Modules/Features/EmojiPicker/Implementation/EmoijPicker/EmojiGrid/Views/EmojiGridSectionHeader.swift` |
| `EmojiGridViewController.swift` | `Modules/Features/EmojiPicker/Implementation/EmoijPicker/EmojiGrid/EmojiGridViewController.swift` |
| `EmojiListPresentable.swift` | `Modules/Features/EmojiPicker/Implementation/EmoijPicker/ModalPicker/Emoji List/Presentables/EmojiListPresentable.swift` |
| `EmojiListViewController.swift` | `Modules/Features/EmojiPicker/Implementation/EmoijPicker/ModalPicker/Emoji List/EmojiListViewController.swift` |
| `EmojiPickerViewController.swift` | `Modules/Features/EmojiPicker/Implementation/EmoijPicker/ModalPicker/EmojiPickerViewController.swift` |
| `FontStyle.swift` | `Modules/Data/Font/Implementation/FontStyle.swift` |
| `ImageMarkupBannerController.swift` | `Modules/Features/Composer/Implementation/ComposerAttachments/ImageMarkupBannerController.swift` |
| `KeyboardInsetAccounting.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Accounting/KeyboardInsetAccounting.swift` (June; replaced by `BottomContentInsetAccounting.swift`) |
| `LatestMessagesBannerPlugin.swift` | `Modules/Features/MessageTranscript/Implementation/Plugins/LastReadBanner/LatestMessagesBannerPlugin.swift` |
| `LayoutManager.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Label/Layout/LayoutManager.swift` |
| `LayoutManagerRoundedRectanglePlugin.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Label/Layout/LayoutManagerRoundedRectanglePlugin.swift` |
| `LegacyAutocompleteDataProvider.swift` | `Modules/DataService/AutocompleteDataProvider/Implementation/LegacyAutocompleteDataProvider.swift` |
| `ListDrawerAppearanceAnimation.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/BottomDrawer/Animation/ListDrawerAppearanceAnimation.swift` |
| `ListDrawerView.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/BottomDrawer/ListDrawerView.swift` |
| `MessageCompositionManager.swift` | `Modules/Features/Composer/Implementation/MessageComposition/MessageCompositionManager.swift` |
| `MessageTranscriptComposerPlugin.swift` | `Modules/Features/Composer/Implementation/Composer/MessageTranscriptIntegration/MessageTranscriptComposerPlugin.swift` |
| `MessageTranscriptPluginsBuilder.swift` | `Modules/Features/AnyConversation/Implementation/Data/MessageTranscriptPluginsBuilder.swift` |
| `MessageTranscriptPresenter.swift` | `Modules/Features/MessageTranscript/Implementation/MessageTranscriptPresenter.swift` |
| `MultiSelectBadge.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/MultiSelectBadge/MultiSelectBadge.swift` |
| `OmnipickerAddContentPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/Omnipicker Plugins/OmnipickerAddContentPlugin.swift` |
| `OmnipickerPhotoGalleryPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/Omnipicker Plugins/Media/OmnipickerPhotoGalleryPlugin.swift` |
| `OmnipickerRecentContentPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/Omnipicker Plugins/OmnipickerRecentContentPlugin.swift` |
| `OmnipickerSlackbotActionsPlugin.swift` | `Modules/Features/ComposerPlugins/Implementation/Omnipicker Plugins/OmnipickerSlackbotActionsPlugin.swift` |
| `OrderedListPrefixGenerator.swift` | `Modules/Data/TextModels/Implementation/OrderedListPrefixGenerator.swift` |
| `PhotoGalleryCell.swift` | `Modules/Integration/PhotoGalleryComponent/Implementation/PhotoGalleryCell.swift` |
| `PhotoGalleryHorizontalScrollerCell.swift` | `Modules/Integration/PhotoGalleryComponent/Implementation/PhotoGalleryHorizontalScrollerCell.swift` |
| `PlaceholderTextPublisher.swift` | `Modules/Features/Composer/Implementation/MessageComposition/PlaceholderTextPublisher.swift` |
| `PlusMenuOption.swift` | `Modules/Features/ComposerPlugins/Implementation/Legacy/Menu/PlusMenuOption.swift` |
| `RichTextTheming.swift` | `Modules/UIInfra/TextDisplay/Implementation/RichTextTheming.swift` |
| `ScheduleMessageUtilities.swift` | `Modules/Integration/DeprecatedMessageComponent/Implementation/ScheduleMessage/ScheduleMessageUtilities.swift` |
| `ScheduleMessageViewController.swift` | `Modules/Integration/DeprecatedMessageComponent/Implementation/ScheduleMessage/ScheduleMessageViewController.swift` |
| `ScheduleMessageViewModel.swift` | `Modules/Integration/DeprecatedMessageComponent/Implementation/ScheduleMessage/ScheduleMessageViewModel.swift` |
| `SKBottomSheetAnimator.swift` | `Modules/UIInfra/DeveloperComponents/Implementation/BottomSheet/Animator/SKBottomSheetAnimator.swift` |
| `SKBottomSheetDimmedView.swift` | `Modules/UIInfra/DeveloperComponents/Implementation/BottomSheet/View/SKBottomSheetDimmedView.swift` |
| `SKBottomSheetPresentable+Defaults.swift` | `Modules/UIInfra/DeveloperComponents/Implementation/BottomSheet/Presentable/SKBottomSheetPresentable+Defaults.swift` |
| `SKBottomSheetPresentationController.swift` | `Modules/UIInfra/DeveloperComponents/Implementation/BottomSheet/PresentationController/SKBottomSheetPresentationController.swift` |
| `SKButton+PresentationObject.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+PresentationObject.swift` |
| `SKButton+Types.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift` |
| `SKChannelEntity.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/ChannelEntity/SKChannelEntity.swift` |
| `SKCompactAttachment.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/CompactAttachment/SKCompactAttachment.swift` |
| `SKContextBar.swift` | `Modules/UIInfra/ContextBarUI/Implementation/SKContextBar.swift` |
| `SKContextBarAdapter.swift` | `Modules/UIInfra/ContextBarUI/Implementation/SKContextBarAdapter.swift` |
| `SKEmojiEntity.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/EmojiEntity/SKEmojiEntity.swift` |
| `SKEntityBackgroundView.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBackgroundView.swift` |
| `SKEntityBaseView.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBaseView.swift` |
| `SKEntityContentView.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityContentView.swift` |
| `SKEntityOrnamentView.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityOrnamentView.swift` |
| `SKEntityPrimaryContentView.swift` | `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityPrimaryContentView.swift` |
| `SKFont.swift` | `Modules/Data/Font/Implementation/SKFont.swift` |
| `SKIconButton.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/IconButton/SKIconButton.swift` |
| `SKIconManifest.swift` | `Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift` |
| `SKLegacyColors.swift` | `Modules/Data/Color/Implementation/SKLegacyColors.swift` |
| `SKList.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift` |
| `SKListBottomSheetFeatureDeprecated.swift` | `Modules/Features/SKListBottomSheet/Implementation/SKListBottomSheetFeatureDeprecated.swift` |
| `SKListBottomSheetViewController.swift` | `Modules/Features/SKListBottomSheet/Implementation/SKListBottomSheetViewController.swift` |
| `SKListCollectionViewCell.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/Cells/SKListCollectionViewCell.swift` |
| `SKMemberAvatar.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift` |
| `SKMemberEntity.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/MemberEntity/SKMemberEntity.swift` |
| `SKOrnamentBox.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/OrnamentBox/SKOrnamentBox.swift` |
| `SKTextInput.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/TextInput/SKTextInput.swift` |
| `SKThumbnailAttachment.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/ThumbnailAttachment/SKThumbnailAttachment.swift` |
| `SKTokenView.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/TokenView/SKTokenView.swift` |
| `SKUserGroupEntity.swift` | `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Entities/UserGroupEntity/SKUserGroupEntity.swift` |
| `StandardPaletteColor+Extensions.swift` | `Modules/UIInfra/DesignTokens/Implementation/StandardPaletteColor+Extensions.swift` |
| `Text+Display.swift` | `Modules/UIInfra/SlackKit/Implementation/Extensions/Text+Display.swift` |
| `Text+HighlightColors.swift` | `Modules/UIInfra/SlackKit/Implementation/Extensions/Text+HighlightColors.swift` |
| `TokenLayoutManager.swift` | `Modules/Features/ComposeMessage/Interface/DestinationPicker/TokenLayoutManager.swift` |
| `TokenOverlayCell.swift` | `Modules/Features/TokenizedSearch/Interface/Views/Cells/TokenOverlayCell.swift` |
| `TokenSearchInputStyle.swift` | `Modules/Features/TokenizedSearch/Interface/Views/TokenSearchInputStyle.swift` |
| `TokenTextAttachment.swift` | `Modules/Features/ComposeMessage/Interface/DestinationPicker/TokenTextAttachment.swift` |
| `UIUtilities.swift` | `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift` |
| `UIView+BounceMode.swift` | `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+BounceMode.swift` |
| `UIView+SpringAnimation.swift` | `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/UIView+SpringAnimation.swift` |
| `UnifiedOutputTypes.swift` | `Modules/DataService/SlackDataProviders/Interface/UsersAndConversations/UnifiedOutputTypes.swift` |
| `UnreadConversationFeature.swift` | `Modules/Features/AllUnreads/Implementation/UnreadItemFeature/UnreadConversationFeature/UnreadConversationFeature.swift` |
| `WysiwygAutocompleteOpportunity.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygAutocompleteOpportunity.swift` |
| `WysiwygAutocompleteService.swift` | `Modules/Features/Autocomplete/Implementation/WysiwygAutocompleteService.swift` |
| `WysiwygEmojiPayload.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Emoji/WysiwygEmojiPayload.swift` |
| `WysiwygKeyboardEditContext+CommandHandling.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygKeyboardEditContext+CommandHandling.swift` |
| `WysiwygKeyboardEditContext+MentionSlugEventHandling.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygKeyboardEditContext+MentionSlugEventHandling.swift` |
| `WysiwygKeyboardEditContext+MentionSlugEventHandlingTests.swift` | `Modules/UIInfra/Wysiwyg/Tests/Unit/Autocomplete and Slugs/WysiwygKeyboardEditContext+MentionSlugEventHandlingTests.swift` |
| `WysiwygKeyboardEditContext+SlugSpacing.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Autocomplete and Slugs/WysiwygKeyboardEditContext+SlugSpacing.swift` |
| `WysiwygLineStyleIntent.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Mrkdwn/WysiwygLineStyleIntent.swift` |
| `WysiwygMrkdwnDelimiter.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Mrkdwn/WysiwygMrkdwnDelimiter.swift` |
| `WysiwygStyles+Rendering.swift` | `Modules/UIInfra/Wysiwyg/Implementation/Styles and Structures/WysiwygStyles+Rendering.swift` |
| `WysiwygTextProcessor+Config.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/TextInput/TextProcessor/WysiwygTextProcessor+Config.swift` |
| `WysiwygTextProcessor+SKMapping.swift` | `Modules/UIInfra/SlackKit/Implementation/CoreComponents/TextInput/TextProcessor/WysiwygTextProcessor+SKMapping.swift` |
