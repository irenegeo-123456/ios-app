# iOS 26 system chrome, measured

> Reference device: the owner's iPhone 17 Pro Max on **iOS 26.7** (screenshots in `reference/device/`, local only). The
> clone's default system look is iOS 26 as on that device; Slack's `iOS_27` snapshot sets are secondary evidence only.

Slack's source sets the fonts and colors of the tab bar and navigation bars, but UIKit draws their Liquid Glass shapes,
and no snapshot baseline shows them (shell-navigation.md §7). These numbers were measured with PIL on real iOS 26
screenshots at @3x (pixels ÷ 3), so the clone's system chrome matches a device:

- **A**: a real Slack iOS 26 screenshot, iPhone 17 Pro Max (1320×2868 → 440×956 pt), dark mode, a channel details
  screen (tab bar and nav bar visible). Taken 2026-02-20. Not committed (it's a personal screenshot). Its colors are
  the raw Display P3 values: grays are within 2 per channel of sRGB, saturated colors aren't (read colors from D's sRGB
  copies instead).
- **B**: an iOS 26.5 simulator frame, iPhone 17 Pro (1206×2622 → 402×874 pt), light mode
  (`~/Desktop/ios-protokit-slack/shared/gallery/p/slack-home/frames/slack-home__home__light__iphone__large.webp`).
  Its app content is a SwiftUI mock; only the system parts (status bar, Dynamic Island) are used.

## Tab bar (A)

| Part | Value |
|---|---|
| Capsule | x 21.0–349.0, y 873.0–935.0 → 62 pt tall, 21 pt from the left edge and from the bottom edge, radius 31 |
| Search circle | x 357.0–419.0 → Ø 62, 8 pt after the capsule, 21 pt from the right edge, glyph centered (`search_filled`, ~25 pt box) |
| Fill / rim (dark) | fill (33,36,40) #212428; 1 pt rim (66,74,85) |
| Items | 4 items on a 78 pt pitch; the capsule has 8 pt of padding at each end ((328 − 16) / 4 = 78) |
| Selected pill | x 25.0–110.3, y 877.0–931.0 → 4 pt inside the capsule, 54 pt tall, 85.3 wide (the item + 3.65 on each side), fill (65,69,74) #414549 (dark) |
| Icon | 25 pt box, ink 886.7–906.3 → box top 11.5 pt below the capsule top |
| Label | Lato Bold 11 (Black selected), baseline at 921.3 → text box top ≈ 37.5 below the capsule top |
| Colors (dark) | unselected icon + label (241,244,249) #f1f4f9 (UIKit's label color, not Slack's contentTertiary); selected (232,197,251) #e8c5fb, a vibrancy-lifted theme tint. **Raw Display P3** (A wasn't converted): in sRGB (240,244,250) and (239,195,255); D measures (242,244,250) and (240,195,255) in sRGB, which the clone uses |

## Navigation bar (A)

| Part | Value |
|---|---|
| Back button | 44 pt glass circle, x 20–64 (20 pt margin on Max; 16 on 393 pt screens, measured in C below, and on 402), y 62–106: directly under the 62 pt status bar |
| Right items | one glass capsule x 324–420 (96 × 44) holding two icon buttons (pencil, …), 20 pt from the right edge |
| Glass (dark) | fill (35,37,42), rim (69,76,88) |
| Home (D) | leading workspace circle x 20.0–64; the `[filter][avatar]` capsule x 324.0–420.3 (96 × 44, 20 pt from the right edge) |

**D**: the owner's iPhone 17 Pro Max screenshots, iOS 26, dark (`reference/device/IMG_2246.PNG` Home … `IMG_2250_2.PNG`
Activity; local only, gitignored). Also measured there, text baselines against a local reference (docs/conventions.md,
"Pixels"): Home title (Lato Black 22) 8.67 pt below the workspace circle's center; a message's author name (Lato
Black 17) 16.67 below its avatar's top, its body lines at 41.33, 62.0 and then every 20.4 pt; a Home row's title (Lato
17) 5.33 below its `#` icon's center; tab labels (Lato Bold 11) 48.67 below the tab bar capsule's top; the DMs empty
state's two-line title (Lato Black 22) baselines 501.67 and 528.0 (26.33 apart: the 26.4 line height, pixel-snapped),
its body (Lato 17) 558.0 and 578.33 (20.33), "Browse Teammates" button top 598.0.

## Bar button items (C: Slack's iOS 26 snapshots, 393 pt)

**C**: the June 2026 baselines `~/slack-objc-main/Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKBarButtonItemTests/*@3x.png`
(commit 39bddec), a real UIKit navigation bar 393 pt wide (1179 px) with Slack's SKBarButtonItems in Liquid Glass (light;
fill (220,220,220) over white, a ~1 pt lighter rim). The September baselines (slack-objc-latest, 14b3cbaf) draw the same
bars without glass (bare glyphs nearer the edges), so they no longer show this geometry; D (below) confirms it on a device.
The only iOS 26 evidence for bar margins below the Max.

| Part | Value |
|---|---|
| Side margins | leading items from x 16.0 (`testIconButtons`, `testBackButtons`, `testTitleButtons`, `testSystemCloseButtonGlassStyling` 16.0–60.0); trailing items end at 377.0 = 16.0 from the right edge (`testAllTogether`, `testSystemCancelButtonGlassStyling` 333.0–377.0) |
| Height | 44 pt capsules from the bar's top (rim rows 0–1 and 43–44 pt) |
| Icon items | 44 pt slots 8 pt apart, no padding at the capsule's ends: three icons in 16.0–163.0 (147 = 3 × 44 + 2 × 8), glyph centers 38, 90, 142 |
| Title items | the title 12 pt in from the capsule's ends (testTitleButtons 12.3; system Edit / Save / Cancel 11–12.3), 8 pt between items (texts 32 apart) |
| Order | `testAllTogether` passes `rightItems: [user, title, spinner]` and draws `[spinner][Hello][user]`: right items are laid out from the trailing edge |

Nothing in the repo shows a Slack bar 402 pt wide (B's app content is a mock), so 16 pt there is UIKit's rule (the same
compact layout margin as 393), not a measurement.

## Status bar and Dynamic Island (A, B)

| Part | 402 pt (B) | 440 pt (A) |
|---|---|---|
| Island | x 138.3–263.3, y 14.0–50.3 (125 × 36.3) | — |
| Clock ink | "9:41" x 56.7–88.3, y 26.3–38.7 → centered at x 72.5 | "12:51" x 52.7–93.7 → centered at 73.2 |
| Glyph cluster | cellular + Wi-Fi from x 288.3; center ≈ 76 pt from the right edge | cellular 312.3 … battery 395.3 → center 86 pt from the right edge |
| Vertical center | 32.5 (= the island's middle) | 32.5 |

## Sheets (a real Slack iOS 26 screenshot, iPhone 16, 1179×2556, light)

A settings sheet presented from another sheet: the lower sheet recedes (narrower, a few points lower), the app behind
stays full width and unscaled, the top sheet has a ~38 pt corner radius and a 44 pt glass back circle at its top-left.

## Device screenshots, Sept 2026 (D)

**D**: five real Slack screenshots from an iPhone 17 Pro Max (1320×2868 @3x → 440×956 pt), iOS 26, dark mode, Sept 2026
(a production build newer than the June checkout, close to slack-objc-latest @ 14b3cbaf): `reference/device/IMG_2246.PNG`
Home, `IMG_2247` a channel (#general), `IMG_2248` a thread, `IMG_2249` DMs (no DMs: the empty state), `IMG_2250_2` Activity.
Not committed (a real workspace). They're Display P3: colors below were converted to sRGB first (PIL ImageCms), which
turns the list background into (25,28,32) for #1a1d21.

| Part | Value |
|---|---|
| Bar region | status bar 62 + navigation bar **54** → content starts at **116** (Home's header decoration ends at 116.0; the DMs carousel and Activity pills start 20 / 17 pt under it; the thread's root avatar at 128 = 116 + 12). The clone: `--navbar-bottom` (src/app/nav/nav.css) |
| Glass controls | y 62–106, at the top of the bar region; back / workspace circle x 20–64; separate glass groups and title capsules **12 pt** apart (circle ends 64, title capsule starts 76; title ends 309, right capsule starts 321) |
| Root titles | Home's workspace name ink from x 76.7 (the title 12 after the workspace circle, `.leading(inset: 0)`); DMs / Activity from x 28–29.7 (20 + 8) |
| Conversation title | capsule x 76–309 (fills to the right items), `#` (channel_filled 20 pt) in a 36 pt slot (x 76–112), name from 112.3 |
| Thread title | capsule x 82–309 (76 + the 6 pt back-button nudge), "Thread" ink from x 98.3 (16 pt inset), "Thread" y 70.3–82.7, "#general" y 89.3–101.3 |
| Right items (channel, thread) | one capsule x 321–420 (99 × 44): Slackbot 47 wide (25 pt image + 11 a side, glyph center 344.5), 8 pt, headphones 44 (center 397.5) |
| Composer, collapsed | capsule **x 21–419, y 821–865** (44 tall, radius 22), its bottom **8 pt** above the tab bar (873); "+" Ø 36 at x 25–61, y 825–861 (4 pt in); placeholder ink from x 70.3; mic glyph center x 397 (4 pt from the right) |
| Tab bar | capsule y 873–935, x 21–349; Search Ø 62 (unchanged from A) |
| Compose FAB | Ø 56, x 360–416, y 801–857 |
| Activity "Unreads" pill | x 323.3–419, y 811–857 (46 tall) |
| Home list | tiles y 132–222 (90 tall, 16 under the header), hairline 237.67; sections: header 52, rows 44, footer 8 (Channels: 237.67 → 473.67 = 52 + 4 × 44 + 8); "Add Teammates" row after the last section's hairline (769.67) |
| Home section header | icon ink x 20–35 (20 pt icon in a 24 pt box at 16); title ink from x 52.7; "›" right after it; caret 17.3 × 9.3 pt at x 405.3–422.7, pointing **up** while expanded |
| DMs | carousel tiles 56 pt at y 136–192, 16 apart, names under them; filter pills y 253–289 (36 tall): All x 16–123, Unreads 131–273.7, External 281.3–424 (8 apart) |
| Activity | pills y 133–169: All x 16–106.3, DMs 114.7–205, Mentions 213.7–319.3, Threads 327.7–423.7; hairline under the row at 185.67; first row: avatar y 196–232 (x 16–52, badge to 53.7), name ink y 200–213.3 from x 65.3, "Direct Message" y 223.7–235.7, body lines from 248.7; row separator 295.33 |

| Color (dark, sRGB) | Value |
|---|---|
| Glass over the list | fill (33,37,42); rim (66,75,87) → (58,65,76) → (48,54,63) from the edge in, over 1 pt; content behind shows through (white text reads ≈ (85,91,105)) |
| Glass over the aubergine header (67,19,72) | fill (82,22,89); rim (182,34,201) → (155,30,171) → (126,27,139); the trailing capsule over the darker right side (71,14,72) |
| Composer glass | (25,26,29) (darker than the list); rim (56,61,69) → (47,51,58) → (40,42,48); "+" circle (36,39,41) |
| Tab bar | capsule (33,37,42), selected pill (67,71,78), selected icon and label (240,195,255) (aubergine's #cfa1de + ≈ (33,34,33)), unselected (242,244,250) |
| Lines | section dividers, pill borders, Activity separators (55,57,61) = outlineTertiary |
| Home text | section titles, their icons and "›" (248,248,248) contentPrimary; read rows, "Add channel", "Add Teammates", the "APP" tag text (185,186,189) contentSecondary; caret (154,155,157) contentTertiary |
| Messages | author names and body (248,248,248) contentPrimary; timestamps (154,155,157) |
| DM / Activity pills | selected fill (67,19,72) = theme.baseInverseSecondary #431349 with a (84,51,89) border; unselected border (55,57,61) |
| Activity "Unreads" pill | (212,216,219) |
