# How the clone is built (for contributors, human and Claude)

The clone draws Slack's iOS app in the browser, inside a simulated iPhone. There is no Slack CSS to reuse (the app is
UIKit), so every screen is written from the specs in `reference/ios/specs/`, which cite the Swift source for each
value. **The iOS source is the truth; the specs are its index; memory is never a source.** When a value isn't in a
spec, look it up in the iOS repo (`reference/ios/specs/README.md` lists where) and add a citation comment.

## The screen

- One CSS px is one iOS point. `.ios-screen` is exactly the device's size (402×874 for iPhone 17 Pro).
- On `.ios-screen`: `--safe-top`, `--safe-bottom`, `--screen-w`, `--screen-h`. On `.ios-app`: `--kb-height` (the
  keyboard's height while it's up, else 0) and the class `has-keyboard`.
- `data-appearance="light" | "dark"` on `.ios-screen` switches every token. Check both.
- The tab bar (Liquid Glass, iOS 26) floats over every screen of its tab, conversations included (shell spec §3.6):
  keep content clear of it with `padding-bottom: calc(21px + 62px + …)`, or opt out with `{ tabBar: false }`.

## Styling

- **Colors**: iOS tokens, by their exact iOS names: `var(--dt_color_content_primary)` (all 346 are in
  `src/tokens/generated/colors.css`). Legacy `sk_*` colors: `var(--sk_foreground_max_solid)` (`src/slackkit/slackkit.css`;
  add missing ones there, with light and dark values from `theme-colors.md` §4). Theme roles:
  `var(--theme_baseInverseImportant)` etc. (`src/theme/engine.ts` `THEME_ROLES`, plus the derived ones in
  `derivedColors`). No hex values in components unless the Swift source uses a literal; then cite it.
- **Type**: SKFont via `font: var(--sk-body)`, `var(--sk-small-body-bold)`, … (`src/tokens/type.css`). Lato's line
  box is 1.2 em, as on iOS; a one-line UILabel's height is that rounded up to the pixel grid
  (`line-height: round(up, calc(1.2em - 0.01px), calc(1px / 3))`). A label that wraps advances 1.2 em a line and
  rounds only its whole box: keep the 1.2 line height and add
  `padding-bottom: calc(round(up, 1lh - 0.001px, 1px / 3) - 1lh)` (SKEmptyState's title). Don't nudge text with
  padding or `top` to match a snapshot: baselines are calibrated globally ("Text baselines" below).
- **Hairlines** (iOS's 1 px lines) are one device pixel: `box-shadow: inset 0 calc(-1 * var(--hairline)) 0 <color>`
  or the `.hairline-bottom` / `.hairline-top` / `.hairline-ring` classes, never `height: 0.333px` or
  `border: 0.333px` ("Hairlines" below). A 1 **pt** line (`CALayer.borderWidth = 1`) is plain `1px`.
- **Icons**: `<Icon name="channel_filled" size={20} />` (`src/icons/Icon.tsx`). Names are the Icons.xcassets
  imageset names: `SKIconManifest.svgChannelFilled` → `channel_filled`. Monochrome icons take `currentColor`.
- **Emoji**: `<Emoji name="tada" size={20} />` (`src/emoji/Emoji.tsx`).
- **Text**: Slack mrkdwn with `<RichText text={…} />`, one line with `<InlineText text={…} />` (`src/app/text/`).
- **CSS files** live next to their components and are imported by them. Class names: `sk-…` for SlackKit components,
  `mk-…` for MessageKit, `<area>-…` for screens. Comment each non-obvious value with its source (spec section or
  Swift file:line).
- There's no hover. Pressed states come from `data-tap` (the element gets `.is-pressed` while held, after 70 ms, like
  UIKit's delayed highlight). Bounce with `transform: scale(…)` as the spec says.

## Building blocks

| | |
|---|---|
| `src/slackkit/` | SlackKit, one component per iOS component, same names (`SKMemberAvatar`, `SKBadge`, `SKEntityRow`, `SKListHeader`, `SKButton`…). Use them; add to them rather than restyling a copy. Index: `src/slackkit/index.ts`. |
| `src/app/nav/` | `StackView` (per-tab navigation), `NavBar`, `RootNavBar`, `GlassButton`, `GlassGroup`, `TabBar`, `SheetHost`, the screen/sheet registry |
| `src/app/store.ts` | `useApp`: the workspace (`fx`), messages, threads, navigation (`push`, `pop`, `openConversation`, `openThread`, `presentSheet`, `dismissSheet`), toasts, and data actions (`sendMessage`, `toggleReaction`, …) |
| `src/app/gestures.ts` | `.ios-scroll` (vertical) and `data-scroll-x` (horizontal) scroll by mouse drag with momentum; `useLongPress` |
| `src/app/keyboard/` | the iOS keyboard; any text field in the screen raises it. `dismissKeyboard()` |
| `src/theme/` | the theme engine (ported from `Modules/UIInfra/DesignTokens`) and `useTheme` |
| `src/data/` | the Northstar demo workspace, shared with the web kit (slack-remix) |

## UIKit semantics to carry over

- **Bar button order: know which array you're reading.**
  - UIKit's own `navigationItem.rightBarButtonItems` / `setRightBarButtonItems` are laid out from the trailing edge
    inward: item 0 is the **rightmost** (Slack's snapshot `SKBarButtonItemTests/testAllTogether`: `rightItems: [user,
    title, spinner]` draws `[spinner][Hello][user]`).
  - Slack's wrappers flipped in September 2026. In the June source (cd22922) `SKNavigationItem` and
    `HeaderBarButtonPresentationObject.rightButtons` passed their arrays straight to UIKit ("ordered right -> left",
    `HeaderBarButtonPresentable.swift:177`), so June's Home `rightButtons = [user, filter]` is `[filter][avatar]` on
    screen. In the current source (14b3cbaf) both are **leading-to-trailing**, in screen order, and reversed for UIKit
    (`SKNavigationItem.swift:151-153, 348-349`; `HeaderBarButtonPresentable.swift:196-197`), and the call sites
    flipped their arrays to match: nothing moved on screen.
  - `leftBarButtonItems`, toolbar items and stack views read left to right; UIMenu children top to bottom, each
    `.displayInline` child menu (SKMenu `.section`) a separate group, `.destructive` in red. Check every bar and menu
    against its Swift array, and cite the file you read and whether it's June or September.
- **Layout margins.** Bars and lists use UIKit's system margins: 16 pt on 393 pt (Slack's iOS 26 bar snapshots,
  measurements.md) and 402 pt phones, 20 pt on the Max (a device screenshot).
- **Glass grouping.** Adjacent bar items share one Liquid Glass capsule unless the source inserts a fixed space
  (`SKNavigationItem.swift:364-366`, June :167-169: a `.separator` item becomes `fixedSpace(0)`;
  `HeaderBarButtonPresentationObject` `.fixedSpace`) or the item opts out (`sharesBackground = false` / `hidesSharedBackground`). A lone item is its own
  circle: `GlassButton`, not a one-item `GlassGroup`. In a capsule (`GlassGroup` + `GlassGroupItem`) items sit 8 pt
  apart with no padding at the ends; an icon or avatar item is a 44 pt slot, a title its text plus 12 pt a side, the
  profile avatar with a status emoji 74 pt (`.is-status`). So two icons make a 96 × 44 capsule (nav.css cites the
  snapshots).
- **Modal close buttons.** A view controller Slack presents as a form sheet gets UIKit's automatic close button, SF
  `xmark` (`XMark` in `src/app/sheets/ui/SheetBar.tsx`), unless the screen sets its own item (then it's that item's
  icon, often `close` / `close_filled`). A conversation presented modally (the Slackbot tab) shows Close, not Back.

## Pixels: text baselines and hairlines

Chrome on macOS lays pages out in CSS px (it doesn't use zoom-for-DSF there), and that decides two things UIKit does
at device-pixel precision. Both were measured in headless Chrome at DPR 1, 2 and 3 (`tools/shot.mjs` renders like the
snapshots, at 3x); normal Chrome on a Mac does the same layout and paint, at 2x.

**Text baselines.** UIKit draws a UILabel's first baseline `round(3 × 0.987 × size)` device pixels below its top (the
hhea ascender, 1974 of 2000 units; measured on SKButton, SKNavigationTitle and SKGenericEntity snapshots: 12 pt → 12,
13 → 12.67, 15 → 14.67, 17 → 16.67, 22 → 21.67). Blink rounds the font's ascent and descent to whole CSS px, floors the
half-leading, and paints every baseline on a whole CSS px. With Lato's hhea descent (21.3 %) the content box (17 + 4 =
21 px at 17 pt) is taller than the 1.2 em line, the half-leading floors to −1 and text at 9, 12, 13, 14, 17, 18, 22, 24
and 28 pt sat 1 px high: 0.67 pt above iOS, 1 pt at 12 pt. `src/styles/fonts.css` now sets `descent-override: 16.5%`
(the ascent stays the hhea 98.7 %, line boxes don't change), so the content box fits the line at every size from 9 to
34 pt and the baseline is exactly `size` px below the line top: the whole pixel nearest iOS. What's left is Chrome's
whole-px grid: text sits 0 to 0.67 pt below iOS, 0.33 typical. Measured on 16 lines in 13 snapshot PNGs (9 styles,
12–22 pt): mean |offset| 0.56 → 0.37 pt, max 1.0 → 0.67; over the snapshot suite's 50 text lines 0.39 → 0.25 pt;
on a real iPhone 17 Pro Max (measurements.md, D: titles, names, body lines, rows) 0.60 → 0.40 pt. A line whose top
lands 2/3 of a pt past a whole pt (17 pt text centered in a 44 pt row, a message's first body line) is the worst case:
+0.67 now, −0.33 before.
Multi-line labels advance by the font's line height, each baseline snapped to the device pixel: a device's DMs empty
state steps 26.33 between its title's lines (22 pt, 26.4) and 20.33 in its body (17 pt, 20.4). A per-line
`round(up, …)` line height (26.67) stepped 27 there; the title at 1.2 em with its box padded to the pixel grid steps 26
and lands its second line and the body's first on the device's pixel (Chrome can only step whole px).
So: use the SKFont variables with their 1.2 em (or, for one-line labels, pixel-rounded) line height, don't shift text
per component to chase a snapshot, and expect a 1-device-pixel difference in diffs. `line-height: 1` boxes center
their text 1 px lower than UIKit would; give a label its real line height instead.

**Hairlines.** `height: 0.333px`, `0.5px` and `border: 0.333px` all come out 1 CSS px thick (3 device px at @3x), at
every position: Blink snaps box sizes and border widths to whole CSS px. An inset box-shadow isn't snapped. `--hairline`
(`src/styles/hairline.css`: 1px, 0.5px or 1/3 px by resolution) draws exactly one device pixel at full strength at
DPR 1, 2 and 3:

```css
box-shadow: inset 0 calc(-1 * var(--hairline)) 0 var(--dt_color_outline_tertiary);   /* bottom edge: .hairline-bottom */
box-shadow: inset 0 var(--hairline) 0 …;                                             /* top edge: .hairline-top */
box-shadow: inset 0 0 0 var(--hairline) …;                                           /* all round, radius too: .hairline-ring */
/* a divider element in the flow: one device pixel of layout, its line on top */
height: 1px; margin-bottom: calc(var(--hairline) - 1px); box-shadow: inset 0 var(--hairline) 0 …;
```

`.hairline-*` take `--hairline-color` (default `outline_tertiary`). A CALayer border is drawn over the layer's content
and takes no room: draw it as a ring on `::after`, not as a CSS border. `transform: scaleY(var(--hairline-scale))` on a
1 px line also works.

## Screens and sheets

```ts
// src/app/screens/<area>/index.ts
registerScreen('thread', ThreadScreen)                       // push({ screen: 'thread', conversationId, ts })
registerScreen('catch-up', CatchUpScreen, { tabBar: false })
registerSheet('message-actions', MessageActionsSheet, 'medium') // presentSheet('message-actions', { … })
```

A screen gets `{ route }` (its props are the route's fields); a sheet gets `{ sheetKey, ...props }`. Both are wrapped
in an error boundary. Import your area's `index.ts` from `src/app/screens/index.ts` (one line).

## Checking your work

- The dev server runs at http://localhost:5190 (don't start another). Headless Chrome and the dev server need the
  sandbox off.
- Screenshot: `node tools/shot.mjs "/?chrome=screen" out.png --screen` (the screen alone at 3x) or `"/"` (the whole
  simulator). Drive the app first with `--eval`, e.g.
  `--eval "slack.app.getState().openConversation('C04ENGINER')" --eval "new Promise(r => setTimeout(r, 600))"`.
  `window.slack` has `app` (the store), `sim`, `theme`.
- Compare with Slack's own snapshot: `npm run compare -- ours.png <baseline path under the iOS checkout>` (SLACK_IOS_LFS_DIR, tools/ios/paths.mjs).
- **Snapshot suite**: `npm run snapshots` (outside the sandbox) renders every entry of `reference/ios/snapshots.json`
  at @3x, diffs it against Slack's PNG and prints entry, diff % and pass/fail; ours | Slack's | diff images go to
  `reference/shots/snapshots/<id>.png`. Run it after any change to shared CSS (fonts, tokens, SlackKit, nav) and before
  you say a component matches. `-- --only id,id` runs some; `-- --css file.css` tries a stylesheet without editing
  `src/`. An entry is a route or kit-gallery specimen, optional `steps` (JS), a `clip` selector, `device`,
  `appearance`, the `png` (relative to `SLACK_IOS_LFS_DIR`, default the iOS checkout in tools/ios/paths.mjs), the `crop`
  (component PNGs are a 2 × 2 grid, light / dark rows × normal / high-contrast columns, ComponentSnapshotTestCase.swift:
  197-209: `light` and `dark` are the normal column; also `light-high`, `dark-high`, `top` / `bottom` for two-row
  stacks, `full`, or `[x, y, w, h]` px) and `maxDiff` (%). Kit specimens are
  copied to a fresh screen at a whole-point position (`isolate`, the default for `?kit=` routes), so other specimens
  moving the gallery don't change the numbers. Add an entry when you match a component to a snapshot; thresholds sit
  just above the current numbers, so a failure means something moved. If the change is deliberate and better, say so
  and update that entry's `maxDiff` (`-- --update` rewrites them all).
- `npx tsc --noEmit -p .` must pass; `npx vitest run` for logic.
- `npm run selftest` (outside the sandbox) opens every tab, conversation, thread, screen and sheet and lists what
  crashed or isn't built; run it, and `-- --dark`, before you say an area is done. `/?selftest` shows the same report
  in the browser.
