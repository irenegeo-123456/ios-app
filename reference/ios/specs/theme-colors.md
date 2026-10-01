# Theme and color system (iOS)

How Slack's iOS app turns design tokens and the user's theme into colors: the token layer (`Colors.swift`), the
light / dark / true-dark / elevated / high-contrast resolution rules, the theme layer (`ColorSet`, `CoreColorSet`,
`ThemeColorSet`, `PaletteColor`), custom-hex themes via Material Color Utilities, legacy `sk_*` colors, how the theme
is stored and applied, the theme picker, and every palette ramp. Written so the web clone can port the theme engine
to TypeScript (`@material/material-color-utilities` 0.4) and expose it as CSS variables.

**Updated to slack-objc main @ 14b3cbaf (2026-09-30), design tokens `f76ac0a`.** First written against `cd22922` (June
2026) and design tokens `df1f228`. What changed since June:

- **Tokens** (`df1f228` → `f76ac0a`): 354 tokens (was 346): six `education` tokens (indigo) and two web-only `theme_*`.
  Every two-mode token now carries `lightHighContrast` / `darkHighContrast` slots (61 values differ from the normal
  ones, all semantic). Changed values: `base_inverse_highlight_1` dark #004d76 → **#0a77a7**, `base_inverse_highlight_2`
  dark #00553d → **#177e56**, `base_inverse_important` dark #b41541 → **#d3305d** (all now step 40), and flamingo 40
  dark #c02b54 → **#d3305d** (so `baseInverseImportant` dark of every flamingo-important theme). Sections 1, 8.
- **Resolution**: true dark is a window trait (`UITraitTrueDark`), not a global closure; at base level it now wins over
  high contrast, and elevated falls back to the base variant (2.1, 2.2). High contrast is real: the tokens and nine
  theme roles have high-contrast values, applied when `ios_high_contrast` (now team-scoped) allows it (2.3).
- **Theme roles**: new `outlinePrimary` (P 100 @ 0.13 / 0.25); `darkHighContrast` slots on `baseInverseSecondary`,
  `baseImportant`, `surfaceSecondary`, `surfaceInverseSecondary`, `contentSecondary`, `contentInverseSecondary`,
  `contentInverseTertiary`, `outlineInversePrimary` (and both slots on `outlinePrimary`) (3.4). No June value changed.
- **Derived colors**: Home's unread synthetic-tile border is now `theme.outlinePrimary` (light P 100 @ 0.13, was
  surfaceSecondary @ 0.13; the re-recorded snapshot shows it); its fill steps up to 0.22 in high contrast and true dark;
  `ListThemeOptions.ia4Phone` uses core tokens instead of `sk_*` (item text, dividers, adjacent labels), and the iPad
  sidebar options depend on the navigation architecture; `workspaceBackgroundStyle` and the tablet FAB color are gone
  (3.5, 3.8).
- **Picker**: still internal-only (now: debug/dogfood builds); text colors moved to core tokens; its two snapshot tests
  are disabled (7). Presets, `PaletteColor` and the custom-hex algorithm are unchanged.
- **In the clone** (not an iOS change): the default theme is now what production users see, the Aubergine preset's
  colors with gradients on (real-device screenshots: jade presence), instead of the code fallback `defaultAubergine`,
  which stays available as `?theme=fallback` for snapshot comparisons (0.5, 6.1).

Conventions (see `README.md` in this folder):

- Source citations are `path:line`, relative to the root of `slack-objc-latest` (github.com/tinyspeck/slack-objc `main`
  @ `14b3cbaf`, 2026-09-30). Snapshot PNGs are opened from the same checkout (Git LFS, `iOS_26`). Where a value or a
  line is June's (`cd22922`, the `slack-objc-main` checkout), the text says so.
- `Colors.swift:<line>` = `output/ios/Colors.swift` of `slack/design-tokens@f76ac0a` (the commit
  `internal.MODULE.bazel:209` pins), vendored as `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift`
  (sha256 `5e7af83c…24bf`) with `ios-colors.ts` and `Presets.swift`. `DT/` = the root of the `df1f228` checkout in the
  bazel cache named in `README.md` (June's pin, sha256 `762997ed…3570`): the only full design-tokens tree here, cited for
  the Style Dictionary build steps that the vendored `f76ac0a` files don't include.
- Short file names used below, and their directories:
  `ColorSet.swift`, `DefaultThemeColorSet.swift`, `PaletteColor.swift`, `StandardPaletteColor+Extensions.swift` →
  `Modules/UIInfra/DesignTokens/Implementation/`; `ColorSetTests.swift`, `PaletteColorTests.swift` →
  `Modules/UIInfra/DesignTokens/Tests/Unit/`; `SKLegacyColors.swift`, `UIColor+Dynamic.swift`, `UIColor+Extensions.swift` →
  `Modules/Data/Color/Implementation/`; `ThemeService.swift` → `Modules/Integration/ThemesIntegration/Implementation/`;
  `ThemeServiceInterface.swift`, `ListThemeOptions.swift`, `ColorSetFABConfigurator.swift`, `ThemeService+ArbitraryConstants.swift` →
  `Modules/Integration/ThemesIntegration/Interface/`; `ColorModeManager.swift` → `Modules/Integration/ThemesIntegration/Implementation/`;
  `UITraitTrueDark.swift` → `Modules/Data/Color/Implementation/`; `UIColorDynamicTests.swift` → `Modules/Data/Color/Tests/Unit/`;
  `Modifiers.swift` → `Modules/UIInfra/DesignTokens/Implementation/`; `Presets.swift`, `ThemePicker*.swift` → `Modules/Features/ThemePicker/Implementation/`
  (`ThemePresetsView.swift`, `ThemePresetCell.swift` in `Subviews/Selection/Preset/`, `ThemeSelectorView.swift` in `Subviews/Selection/`,
  `ThemePreviewCardView.swift`, `ThemePreviewSectionView.swift` in `Subviews/Preview/`); `CompactRootTabSearchHeader.swift`,
  `HeaderBackgroundView.swift` → `Modules/Features/CompactRoot/Implementation/RootTabDecorator/Header/`; `CompactRootTabBarController.swift`
  → `Modules/Features/CompactRoot/Implementation/TabBar/`; `Appearance*.swift` → `Modules/Features/Preferences/Implementation/Appearance/`;
  `Preferences{Presenter,Interactor,Feature}.swift` → `Modules/Features/Preferences/Implementation/`; `ConfigManager.swift`,
  `PreferenceKey.swift` → `Modules/NetworkPersistence/Preferences/Interface/`; `PreferencesManager.swift` →
  `Modules/NetworkPersistence/Preferences/Implementation/`; `LoggedInViewController.swift` → `Modules/Features/Root/Implementation/LoggedIn/`;
  `UIView+Autolayout.swift` → `Modules/UIInfra/SlackKitFoundations/Implementation/Extensions/`; `UIFont+LegacySupport.swift` →
  `Modules/Data/Font/Implementation/`; `HomePresenter.swift` → `Modules/Features/Home/Implementation/`; `SearchPresenter.swift` →
  `Modules/Features/Search/Implementation/`; `localized_strings.yaml` → `Modules/Data/Strings/Implementation/`.
- Hex `#rrggbb/aa` has alpha byte `aa` (`21` = 0.13, `40` = 0.25, `b3` = 0.7). Alpha bytes use Swift's `Int(a*255+0.5)`;
  in CSS use the exact alpha from the formula (0.13, not 33/255).
- `P n`, `H1 n`, `H2 n`, `I n` = step `n` (0, 5, 10, 20 … 100) of the primary / highlight1 / highlight2 / important
  palette. "aubergine 80" = `dt_color_palettes_aubergine_80`.
- "Verified" means checked against a snapshot PNG, Slack's own unit tests, or the protokit runtime probe (section 9).
- "not found (looked in …)" means the value is not in the source. Nothing here is guessed.

---

## 0. Summary for the port

1. **Two layers.** `Colors.swift` (generated) holds 354 fixed tokens (346 in June). The user's theme is **not** in it:
   `DefaultThemeColorSet` derives 31 theme roles (30 in June) at runtime from four palettes plus a brightness number
   (section 3).
2. **Every palette step is a light/dark pair**, and dark mode uses the *dark* hex of whatever step a role names
   (aubergine 90 is `#4a154b` in light, `#e3ceeb` in dark). A role like `UIColor(light: P 70, dark: P 90)` therefore
   means "light hex of step 70 in light mode, dark hex of step 90 in dark mode" (section 3.2).
3. **Brightness 4–6 flips the light-mode theme to its "inverted" variant** (`isSidebarInverted = brightness >= 4`,
   `ColorSet.swift:38,60`). The `sidebarInverted` preference is stored but ignored for colors.
4. **Custom hex colors** go through MCU `TonalPalette.fromHct(Hct.fromInt(argb))` sampled at fixed tones
   (light: 97, 91, 85, 78, 69, 57, 45, 38, 28, 19, 11, 4 for steps 0 … 100; dark is the same list reversed) (section 3.6).
   A JS port with MCU 0.4 reproduces all 50 assertions in Slack's own unit tests.
5. **Two "defaults".** The code's fallback, used when the `ia_theme` preference is missing or unparseable, is
   `ColorSet.defaultAubergine`: aubergine ×4, **brightness 5** (`ColorSet.swift:19-25,59`, `ThemeService.swift:117`).
   All repo snapshots use it (`MockThemeService.swift`). The picker's **"Aubergine" preset** is aubergine / aubergine /
   **jade** / aubergine at **brightness 6**, monochromatic (`Presets.swift:40`). Section 3.7 lists both. **Production
   users see the preset's colors** (jade presence) with gradients on (real-device screenshots, 6.1); the clone's default
   theme is that, and `?theme=fallback` is `defaultAubergine`.
6. **True dark only changes one token.** Only `dt_color_base_primary` (and the legacy `sk_primary_background*`) has
   trueDark/elevatedDark variants. trueDark applies in dark mode when the window carries the `UITraitTrueDark` trait (the
   user picked "True Dark 😎", behind the `ios_true_dark` flag); elevatedDark applies to elevated views in true dark or
   high contrast (section 2). The unread Home tile fill is the only other color with a trueDark slot (3.8).
7. **High contrast is real since September; there is no hover.** Every two-mode token has `lightHighContrast` /
   `darkHighContrast` slots (1.4), and nine theme roles set their own (3.4). They apply when Increase Contrast is on and
   the `ios_high_contrast` flag allows it (2.3). Palette steps don't vary by contrast.

---

## 1. Token layer: `Colors.swift`

### 1.1 How the file is generated

| Step | What happens | Source |
|---|---|---|
| Inputs | `data/global.json` (constants, brand), `data/light.json` (semantic + palettes, light), `data/dark.json` (semantic + palettes, dark). `data/light-inverted-sidebar.json` is web-only and not used for iOS. Since `f76ac0a` the iOS script also reads `output/web/light-high-contrast.json` and `dark-high-contrast.json` ("complete replacements"). | `DT/scripts/build.ts:34-47` (df1f228); `reference/ios/vendor/design-tokens-f76ac0a/ios-colors.ts:6-9,17-20` |
| Style Dictionary | Builds `output/web/global.json` (= global + light) and `output/web/dark.json`. The `color/alpha` transform resolves `{ "$value": "{color.palettes.gray.100}", "alpha": 0.06 }` into an 8-digit hex (`#1d1c1d0f`). | `DT/scripts/build.ts:147-174,308-351` |
| iOS script | For every color token in `global.json` whose path has no `hover`/`pressed`, it looks up the token with the same snake_case name in `dark.json`. If there is one: `UIColor(light:dark:lightHighContrast:darkHighContrast:)`, the high-contrast hex taken from the HC files, or the normal hex if the token is missing there. If not: static `UIColor(hex8:)`. (June's script emitted `UIColor(light:dark:)` only.) | `ios-colors.ts:11-20,51-78,93-126` (f76ac0a) |
| Overrides | One hard-coded exception: `color_base_primary` gets `trueDark = color.constants.black` (#000000) and `elevatedDark = color.brand.core.black` (#1d1c1d). | `ios-colors.ts:34-49` (f76ac0a) |
| Into the app | Bazel copies the file into the `DesignTokens` module as `DesignTokenColors.generated.swift`. Every `dt_*` is `internal`: only `Modules/UIInfra/DesignTokens` can read them. | `Modules/UIInfra/DesignTokens/BUILD.bazel:3-8`, `Colors.swift:12` |

### 1.2 Which tokens have which variants

| Variants | Count | Tokens |
|---|---|---|
| static (one value) | 29 | `constants_white`, `constants_black`, and the 27 `brand_*` tokens (`Colors.swift:13-41`) |
| light + dark + lightHighContrast + darkHighContrast | 324 | every other token, including the 240 palette steps (June: light + dark only, 316 tokens) |
| … + trueDark + elevatedDark | 1 | `dt_color_base_primary`: #ffffff / #1a1d21, high contrast #ffffff / **#000000**, trueDark #000000, elevatedDark #1d1c1d (`Colors.swift:42-49`) |

**Not reachable from app code** (internal and never referenced; checked with a grep over `Modules`/`App` of the
September tree): the 27 `brand_*`, `surface_inverse`, `surface_inverse_highlight_3`, `outline_inverse_primary/secondary/tertiary`,
and all 29 `theme_*` tokens (`Colors.swift:380-553`; `theme_outline_primary` and `theme_outline_highlight_1` are new).
The `theme_*` tokens are the web's static defaults. **Don't use them for iOS:** the iOS theme roles are computed
(section 3). (In `f76ac0a` they are aubergine-based and several now equal iOS `defaultAubergine` roles, high-contrast
slots included, e.g. `theme_outline_primary` = `outlinePrimary`: a useful cross-check, not a source.) The six
`education` tokens are reachable: `CorePrimaryColorSet` exposes them (1.3) and `AgentChannelUnfurlEmbeddable` uses them.

### 1.3 Core tokens (everything `CoreColorSet` exposes)

`CoreColorSet.default` never varies with the user's theme (`ColorSet.swift:68-117`). `CorePrimaryColorSet` is at
`ColorSet.swift:119-158`; `CoreVariantColorSet` (base, baseInverse, surface, content, contentInverse, outline,
outlineSecondary) is at `ColorSet.swift:160-175`. "Swift property" is the path from a `ColorSet`
(`colorSet.core.primary.contentPrimary`).

| Token (`dt_color_…`) | Swift property | Light | light source (`data/light.json`) | Dark | dark source (`data/dark.json`) | Colors.swift line |
|---|---|---|---|---|---|---|
| `constants_white` | `ColorSet.Constants.white` | #ffffff | literal | (static) | — | 13 |
| `constants_black` | `ColorSet.Constants.black` | #000000 | literal | (static) | — | 14 |
| `base_primary` | `core.primary.basePrimary` | #ffffff | literal | #1a1d21 · **trueDark #000000 · elevatedDark #1d1c1d** | gray 5 | 42 |
| `base_secondary` | `core.primary.baseSecondary` | #f8f8f8 | gray 0 | #1a1d21 | gray 5 | 50 |
| `base_tertiary` | `core.primary.baseTertiary` | #eaeaea | gray 5 | #212428 | gray 10 | 56 |
| `base_highlight_1` | `core.highlight1.base` | #e3f8ff | lagoon 0 | #001a2d | lagoon 0 | 62 |
| `base_highlight_2` | `core.highlight2.base` | #e3fff3 | jade 0 | #05241b | jade 0 | 68 |
| `base_highlight_3` | `core.highlight3.base` | #fffae0 | sunflower 0 | #2f1e00 | sunflower 0 | 74 |
| `base_important` | `core.important.base` | #ffe8ef | flamingo 0 | #300005 | flamingo 0 | 80 |
| `base_modal` | `core.primary.baseModal` | #1d1c1d/b3 | gray 100 @ 0.7 | #101214/99 | gray 0 @ 0.6 | 86 |
| `base_inverse_primary` | `core.primary.baseInversePrimary` | #1d1c1d | gray 100 | #212428 | gray 10 | 92 |
| `base_education` (new) | `core.primary.baseEducation` | #f0f3fc | indigo 0 (inferred) | #040b3d | indigo 0 (inferred) | 122 |
| `base_inverse_education` (new) | `core.primary.baseInverseEducation` | #2840a9 | indigo 70 (inferred) | #c7ceeb | indigo 90 (inferred) | 128 |
| `base_inverse_highlight_1` | `core.highlight1.baseInverse` | #1264a3 | ocean 70 | **#0a77a7** (June #004d76) | lagoon 40 (inferred from the hex; June lagoon 20) | 98 |
| `base_inverse_highlight_2` | `core.highlight2.baseInverse` | #007a5a | jade 70 | **#177e56** (June #00553d) | jade 40 (inferred from the hex; June jade 20) | 104 |
| `base_inverse_highlight_3` | `core.highlight3.baseInverse` | #f1b900 | sunflower 40 | #7e5800 | sunflower 20 | 110 |
| `base_inverse_important` | `core.important.baseInverse` | #e01e5a | flamingo 60 | **#d3305d** (June #b41541) | flamingo 40 (inferred from the hex; June flamingo 30) | 116 |
| `surface_primary` | `core.primary.surfacePrimary` | #1d1c1d/0f | gray 100 @ 0.06 | #f8f8f8/0f | gray 100 @ 0.06 | 134 |
| `surface_secondary` | `core.primary.surfaceSecondary` | #1d1c1d/40 | gray 100 @ 0.25 | #f8f8f8/40 | gray 100 @ 0.25 | 140 |
| `surface_education` (new) | `core.primary.surfaceEducation` | #c8d4f8/80 | indigo 10 @ 0.5 (inferred) | #263b9c/80 | indigo 30 @ 0.5 (inferred) | 170 |
| `surface_highlight_1` | `core.highlight1.surface` | #36c5f0/21 | lagoon 30 @ 0.13 | #036696/40 | lagoon 30 @ 0.25 | 146 |
| `surface_highlight_2` | `core.highlight2.surface` | #4cc894/40 | jade 30 @ 0.25 | #106f4d/54 | jade 30 @ 0.33 | 152 |
| `surface_highlight_3` | `core.highlight3.surface` | #ffc600/2e | sunflower 30 @ 0.18 | #a07300/2e | sunflower 30 @ 0.18 | 158 |
| `surface_important` | `core.important.surface` | #ff81aa/21 | flamingo 30 @ 0.13 | #b41541/40 | flamingo 30 @ 0.25 | 164 |
| `container_primary` | `core.primary.containerPrimary` | #ffffff | literal | #212428 | gray 10 | 188 |
| `container_secondary` | `core.primary.containerSecondary` | #f8f8f8 | gray 0 | #212428 | gray 10 | 194 |
| `content_primary` | `core.primary.contentPrimary` | #1d1c1d | gray 100 | #f8f8f8 | literal | 200 |
| `content_secondary` | `core.primary.contentSecondary` | #454447 | gray 70 | #b9babd | gray 70 | 206 |
| `content_tertiary` | `core.primary.contentTertiary` | #5e5d60 | gray 60 | #9a9b9e | gray 60 | 212 |
| `content_highlight_1` | `core.highlight1.content` | #1264a3 | ocean 70 | #2ba5ce | lagoon 60 | 218 |
| `content_highlight_2` | `core.highlight2.content` | #007a5a | jade 70 | #3daa7c | jade 60 | 224 |
| `content_highlight_3` | `core.highlight3.content` | #6b5000 | sunflower 90 | #dea700 | sunflower 60 | 230 |
| `content_important` | `core.important.content` | #c01343 | flamingo 70 | #de678a | flamingo 60 | 236 |
| `content_inverse_primary` | `core.primary.contentInversePrimary` | #ffffff | literal | #f8f8f8 | literal | 248 |
| `content_inverse_secondary` | `core.primary.contentInverseSecondary` | #cbcccf | gray 20 | #b9babd | gray 70 | 254 |
| `content_education` (new) | `core.primary.contentEducation` | #112377 | indigo 90 (inferred) | #e4e8f4 | indigo 100 (inferred) | 242 |
| `content_inverse_education` (new) | `core.primary.contentInverseEducation` | #f0f3fc | indigo 0 (inferred) | #0a165a | indigo 5 (inferred) | 284 |
| `content_inverse_highlight_1` | `core.highlight1.contentInverse` | #9ed6fa | ocean 10 | #2ba5ce | lagoon 60 | 260 |
| `content_inverse_highlight_2` | `core.highlight2.contentInverse` | #4cc894 | jade 30 | #3daa7c | jade 60 | 266 |
| `content_inverse_highlight_3` | `core.highlight3.contentInverse` | #ffd738 | sunflower 20 | #dea700 | sunflower 60 | 272 |
| `content_inverse_important` | `core.important.contentInverse` | #ffa3c2 | flamingo 20 | #de678a | flamingo 60 | 278 |
| `outline_primary` | `core.primary.outlinePrimary` | #7c7a7f | gray 50 | #797c81 | gray 50 | 290 |
| `outline_secondary` | `core.primary.outlineSecondary` | #5e5d60/73 | gray 60 @ 0.45 | #797c81/80 | gray 50 @ 0.5 | 296 |
| `outline_tertiary` | `core.primary.outlineTertiary` | #5e5d60/21 | gray 60 @ 0.13 | #797c81/4d | gray 50 @ 0.3 | 302 |
| `outline_education` (new) | `core.primary.outlineEducation` | #5f7be1 | indigo 40 (inferred) | #e4e8f4 | indigo 100 (inferred) | 356 |
| `outline_highlight_1` | `core.highlight1.outline` | #1264a3 | ocean 70 | #2ba5ce | lagoon 60 | 308 |
| `outline_highlight_1_secondary` | `core.highlight1.outlineSecondary` | #0e9dd3/33 | lagoon 50 @ 0.2 | #307ec0/33 | ocean 50 @ 0.2 | 314 |
| `outline_highlight_2` | `core.highlight2.outline` | #007a5a | jade 70 | #259b69 | jade 50 | 320 |
| `outline_highlight_2_secondary` | `core.highlight2.outlineSecondary` | #007a5a/1a | jade 70 @ 0.1 | #63c29a/33 | jade 70 @ 0.2 | 326 |
| `outline_highlight_3` | `core.highlight3.outline` | #c79600 | sunflower 60 | #d29c00 | sunflower 50 | 332 |
| `outline_highlight_3_secondary` | `core.highlight3.outlineSecondary` | #f1b900/33 | sunflower 40 @ 0.2 | #b38200/33 | sunflower 40 @ 0.2 | 338 |
| `outline_important` | `core.important.outline` | #e01e5a | flamingo 60 | #d94c75 | flamingo 50 | 344 |
| `outline_important_secondary` | `core.important.outlineSecondary` | #e01e5a/4d | flamingo 60 @ 0.3 | #d94c75/40 | flamingo 50 @ 0.25 | 350 |

Unreachable tokens, for completeness: `surface_inverse` #ffffff/2e both (`:176`), `surface_inverse_highlight_3`
#aa8000/b3 / #a07300/2e (`:182`), `outline_inverse_primary` #f8f8f8/d9 / #797c81 (`:362`), `outline_inverse_secondary`
#f8f8f8/8c / #797c81/80 (`:368`), `outline_inverse_tertiary` #f8f8f8/33 / #797c81/4d (`:374`). Brand statics (`:15-41`):
aubergine #4a154b, horchatta #f4ede4, black #1d1c1d, white #ffffff, slack_blue #36c5f0, slack_green #2eb67d,
slack_yellow #ecb22e, slack_red #e01e5a, inactive_gray #eaeaea, legal #5e5d60, small_text #454447, text #1d1c1d,
terracotta #de8969, peach #fed4be, sandbar #ffd57e, moss #608813, evergreen #185f34, pool #78d7dd, teal #167d8e,
cobalt #112377, bright_aubergine #611f69, mauve #c05b8c, berry #5e1237, bubblegum #ffb6bd, salmon #f2606a,
crimson #921d21, background_gray #f8f8f8.

The light / dark source columns are June's `data/*.json` (`df1f228`). The `f76ac0a` data files aren't vendored, so the
sources of the changed and new tokens are inferred from the hex (the palette step with exactly that value).

Palette steps (240 tokens, `Colors.swift:554-1993`) are in section 8.

### 1.4 High-contrast values (new in `f76ac0a`)

Every two-mode token now has `lightHighContrast` and `darkHighContrast` (`ios-colors.ts:102-116`). For palette steps and
most semantic tokens they equal the normal values; these 33 tokens differ (61 values; "—" = same as normal). The
palette step a value matches is in parentheses. Applied per 2.1 when high contrast is on (2.3).

| Token (`dt_color_…`) | lightHighContrast | darkHighContrast | Colors.swift line |
|---|---|---|---|
| `base_primary` | — | #000000 | 42 |
| `base_secondary` | — | #101214 (gray 0) | 50 |
| `base_tertiary` | — | #1a1d21 (gray 5) | 56 |
| `base_inverse_primary` | — | #1a1d21 (gray 5) | 92 |
| `base_inverse_highlight_1` | — | #036696 (lagoon 30) | 98 |
| `base_inverse_highlight_2` | — | #106f4d (jade 30) | 104 |
| `base_inverse_highlight_3` | — | #a07300 (sunflower 30) | 110 |
| `base_inverse_important` | — | #b41541 (flamingo 30) | 116 |
| `surface_primary` | — | #f8f8f8/33 (gray 100 @ 0.20) | 134 |
| `surface_secondary` | — | #f8f8f8/66 (gray 100 @ 0.40) | 140 |
| `surface_inverse` | — | #ffffff/4d | 176 |
| `content_primary` | #000000 | #ffffff | 200 |
| `content_secondary` | #1d1c1d (gray 100) | #f8f8f8 (gray 100) | 206 |
| `content_tertiary` | #262426 (gray 90) | #e0e0e0 (gray 90) | 212 |
| `content_highlight_1` | #093a73 (ocean 90) | #58bdde (lagoon 70) | 218 |
| `content_highlight_2` | #0c5340 (jade 90) | #63c29a (jade 70) | 224 |
| `content_highlight_3` | #4d3900 (sunflower 100) | #e6be30 (sunflower 70) | 230 |
| `content_important` | #7b041c (flamingo 90) | #e68ba7 (flamingo 70) | 236 |
| `content_inverse_primary` | — | #ffffff | 248 |
| `content_inverse_secondary` | #f8f8f8 (gray 0) | #f8f8f8 (gray 100) | 254 |
| `content_inverse_highlight_1` | — | #58bdde (lagoon 70) | 260 |
| `content_inverse_highlight_2` | — | #63c29a (jade 70) | 266 |
| `content_inverse_highlight_3` | — | #e6be30 (sunflower 70) | 272 |
| `content_inverse_important` | — | #e68ba7 (flamingo 70) | 278 |
| `outline_primary` | #5e5d60 (gray 60) | #9a9b9e (gray 60) | 290 |
| `outline_secondary` | #5e5d60/cc (gray 60 @ 0.80) | #797c81 (gray 50) | 296 |
| `outline_tertiary` | #5e5d60/80 (gray 60 @ 0.50) | #5a5e63 (gray 40) | 302 |
| `outline_highlight_1` | #0b4c8c (ocean 80) | — | 308 |
| `outline_highlight_3` | #aa8000 (sunflower 70) | — | 332 |
| `outline_important` | #c01343 (flamingo 70) | — | 344 |
| `outline_inverse_primary` | — | #9a9b9e (gray 60) | 362 |
| `outline_inverse_secondary` | — | #797c81 (gray 50) | 368 |
| `outline_inverse_tertiary` | — | #5a5e63 (gray 40) | 374 |

The web-only `theme_*` tokens also differ in high contrast; they aren't used on iOS (1.2). The clone's
`src/tokens/generated/colors.css` emits these values under `[data-contrast='high']`.

---

## 2. Resolution: light / dark / trueDark / elevatedDark / high contrast

### 2.1 The dynamic initializer

`UIColor(light:dark:lightHighContrast:darkHighContrast:trueDark:elevatedDark:)` wraps a UIKit dynamic provider
(`Modules/Data/Color/Implementation/UIColor+Dynamic.swift:24-71`). The exact logic:

```text
HC       = trait.accessibilityContrast == .high
trueDark = trait.isTrueDark                    // custom UITraitTrueDark trait on the window (UITraitTrueDark.swift:13-31)
style ∈ {light, unspecified}:  return (HC && lightHighContrast) ? lightHighContrast : light
style == dark:
    base     = (trueDark && trueDarkSlot) ? trueDarkSlot : (HC && darkHighContrast) ? darkHighContrast : dark
    elevated = ((HC || trueDark) && elevatedDark) ? elevatedDark : base
    level ∈ {base, unspecified}: return base
    level == elevated:           return elevated
```

Two rules changed since June (`cd22922`), and Slack's new `UIColorDynamicTests.swift` pins every combination: at base
level **true dark now wins over high contrast** (June: high contrast won, and a color without a `darkHighContrast`
fell back to `dark`, turning true black off), and the **elevated level falls back to the base variant** (June: to
`dark`). The true-dark input is now a trait (`traitCollection.isTrueDark`), so UIKit re-resolves colors when it changes
(`affectsColorAppearance = true`); June read a global `UIColor.isTrueBlackEnabled()` closure.

Who passes the high-contrast slots: every generated token (1.4), nine theme roles (3.4), and the Home tile fill (3.8,
which also passes `trueDark`). `SKLegacyColors` passes none. The effective behavior:

| Color mode | High contrast | View level | `base_primary` | `sk_primary_background` | `sk_primary_background_dark` |
|---|---|---|---|---|---|
| Light (or System in light) | any | any | #ffffff | #ffffff | #1a1d21 |
| Dark (soft) | off | any | #1a1d21 | #1a1d21 | #1a1d21 |
| Dark (soft) | on | base | **#000000** (`darkHighContrast`; June #1a1d21) | #1a1d21 | #1a1d21 |
| Dark (soft) | on | elevated | **#1d1c1d** (`elevatedDark`) | **#1d1c1d** | #1a1d21 |
| True Dark | off | base | **#000000** (`trueDark`) | **#000000** | **#000000** |
| True Dark | off | elevated | **#1d1c1d** | **#1d1c1d** | **#000000** (no elevatedDark: the base variant; June #1a1d21) |
| True Dark | on | base | **#000000** (true dark wins; June #1a1d21) | **#000000** (June #1a1d21) | **#000000** (June #1a1d21) |
| True Dark | on | elevated | **#1d1c1d** | **#1d1c1d** | **#000000** (June #1a1d21) |

Nesting passes these rules through: a dynamic color whose dark slot is `sk_primary_background` (e.g.
`trials_pro_badge_text`, `SKLegacyColors.swift:371`) also turns #000000 in true dark. **Theme roles never reference
`base_primary`** and have no trueDark slot, so true dark never changes a theme color; high contrast changes the nine
roles that set a slot (3.4).

### 2.2 Where the inputs come from

| Input | Set by | Source |
|---|---|---|
| `userInterfaceStyle` | The window's `overrideUserInterfaceStyle` = the Color Mode setting: System → `.unspecified` (follows iOS), Light → `.light`, Dark and True Dark → `.dark`. Set by `LoggedInViewController` under the legacy UIKit root, and by the new `ColorModeManager` under the SwiftUI root (unified navigation), which never creates `LoggedInViewController`. | `Modules/NetworkPersistence/Preferences/Interface/ConfigManager.swift:19-34`, `Modules/Features/Root/Implementation/LoggedIn/LoggedInViewController.swift:70-92`, `ColorModeManager.swift:29-57,75-78`, `App/Source/AppRoot/Source/SwiftUI/SlackSceneDelegate+SwiftUI.swift:54-59` |
| `isTrueDark` (trait) | `window.traitOverrides.isTrueDark = (appearanceMode == .trueDark)`, set next to the style (same places). The flag is enforced by migration, not at resolve time: at launch, org switch and team switch a stored True Dark becomes Dark when `ios_true_dark` is off. June's global `UIColor.isTrueBlackEnabled` closure (and its `AppRootLifecyclePluginsFactory` injection) is gone. | `UITraitTrueDark.swift:13-31`, `LoggedInViewController.swift:77,88`, `ColorModeManager.swift:75-78`, `Modules/Integration/ToggleMigrationAppRootPlugin/Implementation/ToggleMigrationPlugin+Dependencies.swift:33-41` |
| `accessibilityContrast` | Window trait override from the Contrast setting: `.system` → override removed (iOS "Increase Contrast" flows through), `.on` → `.high`, `.off` → `.normal`. **Only while the `ios_high_contrast` flag allows it**: otherwise the window is forced to `.normal`, so even iOS Increase Contrast doesn't reach Slack's colors. Legacy root: the team flag at subscribe time; SwiftUI root: `highContrastFeatureAvailable`, set from the team flag on launch and account switches (true while logged out). | `LoggedInViewController.swift:93-116`, `ColorModeManager.swift:20-27,59-73,80-90`, `ToggleMigrationPlugin+Dependencies.swift:51-57` |
| `userInterfaceLevel` | UIKit sets `.elevated` for presented sheets, popovers and similar (UIKit behavior, not in Slack source). Slack forces `.elevated` on the workspace switcher and on the iPad "More" list column. | `Modules/Features/WorkspacesList/Implementation/Workspaces List/Controller/WorkspacesViewController.swift:211`, `Modules/Features/Root/Implementation/LoggedIn/Tablet/TabletRootViewController.swift:387` |

Switching Dark → True Dark changes the `UITraitTrueDark` trait, which `affectsColorAppearance`, so UIKit re-resolves
dynamic colors and views that cache `CGColor`s re-apply them on `.colorAffecting` trait changes (e.g.
`HeaderBackgroundView.swift:56-62`). (June: the style stayed `.dark`, so only screens that refreshed themselves updated.)
The Color Mode screen still refreshes itself explicitly (`Modules/Features/Preferences/Implementation/Appearance/AppearanceViewController.swift:41-57`).
The web port should simply re-render.

### 2.3 User settings (Settings → Appearance → Color Mode)

| Setting | UI | Values / storage | Gate | Source |
|---|---|---|---|---|
| Color mode | Screen title "Color Mode" (`color_mode`, `localized_strings.yaml:4346`). Radio rows, each with an image from `Settings.xcassets` (`System`, `Light`, `Dark`, `True Dark`): "System" + subtitle "Uses device settings" (`follow_system_settings` :7308, `system_subtitle` :20911), "Light" (`light_mode` :10860), "Dark" (`dark_mode` :5136), "True Dark 😎" (`true_dark_mode` :22264) | `AppearanceMode` 0 system (default) / 1 light / 2 dark / 3 trueDark, stored in `UserDefaults` `"AppearanceModeKey"` (per device, not synced) | "True Dark 😎" row only when flag `ios_true_dark` is on (global, default `false`, added 2025-11-06). With the flag off, a stored trueDark is migrated to dark at launch and on org / team switch (September: moved from the Appearance screen to the toggle-migration plugin). | `Modules/Features/Preferences/Implementation/Appearance/AppearanceInteractor.swift:69-81`, `AppearancePresenter.swift:57-86`, `Modules/Foundation/Cache/Implementation/UserDefaults/UserDefaultsKeys.swift:74`, `ToggleMigrationPlugin+Dependencies.swift:35-41`, `Modules/Data/Toggles/Definitions/ios_true_dark.json` |
| High contrast | Section header "Contrast" (`contrast` :4573). Switch "Sync with iOS" (`accessibility_sync_settings` :553) with subtitle "Matches device setting for Increase Contrast" (`accessibility_matches_device_format` :456 + `accessibility_increase_contrast` :450). Switch "Enable high contrast" (`enable_high_contrast` :6250), disabled while syncing, and showing the device value then. | `HighContrastMode` 0 system (default) / 1 on / 2 off, stored in `UserDefaults` **`"HighContrastModeV2Key"`** (September: a fresh key, because June's `"HighContrastModeKey"` had been overwritten with `.off` whenever the flag was off) | Section only when flag `ios_high_contrast` is on, now read from the **team** flag manager (`isGlobal: false` since September; default `false`, `defaultTinySpeckValue: true`, added 2026-04-07). With the flag off the stored mode is left alone and contrast is applied as `.normal` (2.2); June overwrote the stored mode with `.off`. | `AppearanceInteractor.swift:49-67`, `AppearancePresenter.swift:90-113`, `UserDefaultsKeys.swift:76-80`, `ConfigManager.swift:272-299`, `Modules/Data/Toggles/Definitions/ios_high_contrast.json` |

The server preference `preferred_appearance_style` is declared (`Modules/NetworkPersistence/Preferences/Interface/PreferenceKey.swift:45`)
but never read, so color mode is local to the device.

---

## 3. Theme layer: `Modules/UIInfra/DesignTokens`

### 3.1 Types

| Type | What it is | Source |
|---|---|---|
| `ColorSet` | `core: CoreColorSet` (always `.default`), `theme: any ThemeColorSet` (always `DefaultThemeColorSet`), `isSidebarInverted = brightness >= 4`, `sidebarInvertedPref` (stored, unused for color). `==` compares the theme inputs + `isSidebarInverted`. | `ColorSet.swift:11-66` |
| `CoreColorSet` / `CorePrimaryColorSet` / `CoreVariantColorSet` | Fixed tokens (section 1.3) | `ColorSet.swift:68-175` |
| `ThemeColorSet` (protocol) | `primary`, `highlight1`, `highlight2`, `important` (`PaletteColor`), `brightness`, and the 31 roles in 3.4 (`outlinePrimary` added in September) | `ColorSet.swift:177-231` |
| `DefaultThemeColorSet` | The only implementation; computes every role once in `init` | `DefaultThemeColorSet.swift:13-236` |
| `PaletteColor` | `.standard(StandardPaletteColor)` or `.custom(CustomPaletteColor)`; `_0 … _100` return a light/dark pair | `PaletteColor.swift:10-137` |
| `StandardPaletteColor` | 20 cases, in this order (also `allCases` order): gray, horchata, tomato, paprika, tangerine, campfire, honeycomb, sunflower, grass, cilantro, mojito, jade, aquarium, lagoon, ocean, indigo, aubergine, sangria, flamingo, rose. `_n` → `dt_color_palettes_<name>_<n>`. | `PaletteColor.swift:139-460` |
| `CustomPaletteColor` | A user hex plus a `fallback` standard palette. Holds 12 light and 12 dark ramp values computed with MCU. | `PaletteColor.swift:462-620` |
| `ThemeWrapper` | What features receive: `listThemeOptions`, `colorSet`, `sidebarInvertedPref`, `gradientEnabled` | `Modules/Integration/ThemesIntegration/Interface/ThemeServiceInterface.swift:12-24` |
| `Modifiers` (new) | Design-token state constants: `disabledOpacity = 0.35`, `pressedOpacity = 0.75`. Used by SlackKit: SKButton's pressed title alpha (`SKButton+Types.swift:230`), SKSwitch disabled alpha (`SKSwitch.swift:91`), SKTextField disabled text and the SKSearchBar / SKTextField clear-button highlight (`contentTertiary` @ 0.75). Not theme-dependent. | `Modifiers.swift:14-25` |

Extra palette-derived constants: `StandardPaletteColor.slack_connect_context_bar_default` = campfire 0 light #fff2e0 /
campfire 5 dark #4b2200, and `slack_connect_context_bar_high` = campfire 10 light #fbcc91 / campfire 20 dark #7b3a00
(`StandardPaletteColor+Extensions.swift:10-11`).

### 3.2 Resolution model (read this before the formulas)

- A standard step `P n` is the pair (`dt_color_palettes_<p>_<n>`.light, `…`.dark). A custom step is (light-ramp `n`,
  dark-ramp `n`) (section 3.6).
- `UIColor(light: A, dark: B)` with dynamic `A`/`B` resolves to **A's light value in light mode and B's dark value in dark
  mode**. UIKit resolves the inner color with the same traits. The protokit runtime probe confirms it on
  1560 values (section 9).
- `X.withAlphaComponent(a)` **replaces** the alpha. All palette steps are opaque. `searchBarBackground`'s 0.1875
  replaces the role's own 0.25/0.13.
- A role written without `UIColor(light:dark:)` (`contentPrimary = primary._100`) is the step's own pair.
- `.dt_color_constants_white` is static #ffffff. `StandardPaletteColor.gray._0` is used as-is, regardless of theme.

### 3.3 Inputs

| Input | Values | Effect | Source |
|---|---|---|---|
| `primary`, `highlight1`, `highlight2`, `important` | `PaletteColor` | See the role table | `DefaultThemeColorSet.swift:68-191` |
| `brightness` | 1–6, default `ColorSet.defaultBrightness = 5` | `isSidebarInverted = brightness >= 4` (`minBrightnessForDarkerSidebars = 4`), and the gradient table. Values outside 1–6 fall into the `default:` gradient case. | `ColorSet.swift:32-39,59-60`, `DefaultThemeColorSet.swift:199-222` |
| `sidebarInvertedPref` | Bool | **None on color**: "After the sidebar enablement project, we only look at the brightness, not the pref value" | `ColorSet.swift:36-38` |
| `monochromatic` | preset flag | **Not an input to `DefaultThemeColorSet`.** Picking a preset sets `gradientEnabled = !monochromatic`, and the preset cell draws a single-color selection border. | `ThemePickerInteractor.swift:140-147`, `ThemePresetCell.swift:123-130` |
| `gradientEnabled` | user pref `window_background_gradients` | Header uses [gradient1, gradient2] or [gradient1] only | `ThemeServiceInterface.swift:34-40`, `PreferenceKey.swift:127` |

### 3.4 Every theme role

`inv` = brightness ≥ 4. "Custom" is what happens when that role's palette is a `CustomPaletteColor`. Otherwise custom
palettes just replace `P n` with the custom ramp (3.6). All lines are in `DefaultThemeColorSet.swift`.

| Role | Light, brightness 1–3 | Light, brightness 4–6 (`inv`) | Dark (any) | High contrast (new) | Custom palette | Line |
|---|---|---|---|---|---|---|
| `basePrimary` | P 70 | P 0 | P 90 | — | ramps | 76-78 |
| `baseSecondary` ("sidebar enablement only") | P 20 | P 20 | P 20 | — | ramps | 79 |
| `baseInversePrimary` | P 0 | P 100 | P 0 | — | ramps | 80-82 |
| `baseInverseSecondary` | P 0 | P 80 | P 10 | dark **P 5** | ramps | 83-86 |
| `baseInverseSecondaryNonSidebar` ("isn't actually in the theming system") | P 80 | P 80 | P 70 | — | ramps | 88-91 |
| `baseHighlight1` | H1 80 | H1 0 | H1 30 | — | `literalColor()`: the hex itself, both modes | 95-97, 103 |
| `baseInverseHighlight1` | H1 80 | H1 80 | H1 30 | — | literal hex | 98, 104 |
| `contentHighlight1` | H1 0 | H1 100 | H1 100 | — | `literalContentColor()`: light-ramp 100 if tone > 65 else light-ramp 0, both modes | 99-101, 105 |
| `baseHighlight2` | H2 50 | H2 20 | H2 60 | — | literal hex | 110-112, 115 |
| `baseInverseHighlight2` | H2 50 | H2 50 | H2 60 | — | literal hex | 113, 116 |
| `baseImportant` | I 70 | I 20 | I 70 | dark **I 80** (standard important only) | literal hex (no high-contrast slot) | 121-124, 131 |
| `baseInverseImportant` | I 70 | I 70 | I 40 | — | literal hex | 125, 132 |
| `contentImportant` | I 0 | I 100 | I 0 | — | literal content (as above) | 126-128, 133 |
| `contentInverseImportant` | I 0 | I 0 | I 100 | — | literal content | 129, 134 |
| `surfacePrimary` | P 0 @ 0.25 | P 100 @ 0.13 | P 100 @ 0.25 | — | ramps | 137-139 |
| `surfaceSecondary` | P 80 @ 0.05 | P 80 @ 0.05 | P 30 @ 0.3 | dark **P 30 @ 0.05** | ramps | 140-143 |
| `surfaceTertiary` | white @ 0.95 | white @ 0.95 | P 0 @ 0.7 | — | ramps | 144-146 |
| `surfaceInversePrimary` | P 100 @ 0.13 | P 0 @ 0.25 | P 100 @ 0.25 | — | ramps | 147-149 |
| `surfaceInverseSecondary` | white @ 0.9 | P 0 @ 0.11 | gray 0 @ 0.6 (#101214/99) | dark **gray 0 @ 0.8** (#101214/cc) | ramps | 150-153 |
| `surfaceInverseTertiary` | P 80 @ 0.13 | P 0 @ 0.08 | P 100 @ 0.08 | — | ramps | 154-156 |
| `contentPrimary` | P 100 | P 100 | P 100 | — | ramps | 158 |
| `contentSecondary` | P 100 @ 0.8 | P 100 @ 0.8 | P 90 @ 0.9 | dark **P 100** | ramps | 159-162 |
| `contentTertiary` | P 0 | P 100 | P 0 | — | ramps | 163-165 |
| `contentInversePrimary` | P 100 | white | white | — | ramps | 166-168 |
| `contentInverseSecondary` | P 100 @ 0.7 | P 0 @ 0.8 | P 90 @ 0.9 | dark **P 100** | ramps | 169-172 |
| `contentInverseImportantSecondary` | I 80 | I 80 | I 70 | — | always ramps, **even for a custom important** | 173 |
| `contentInverseTertiary` | P 100 @ 0.5 | P 0 @ 0.7 | P 90 @ 0.7 | dark **P 90 @ 0.8** | ramps | 174-177 |
| `outlinePrimary` (**new**) | P 100 @ 0.13 | P 100 @ 0.13 | P 100 @ 0.25 | light **P 100 @ 0.25**, dark **P 100 @ 0.35** | ramps | 179-183 |
| `outlineInversePrimary` | P 80 @ 0.13 | P 0 @ 0.22 | P 100 @ 0.22 | dark **P 100 @ 0.5** | ramps | 184-187 |
| `backgroundGradient1` | 3.5 (palette = primary) | | | — | 3.5 | 189, 193-208 |
| `backgroundGradient2` | 3.5 (palette = highlight1) | | | — | 3.5 | 190, 210-225 |

"High contrast" is the role's own `lightHighContrast` / `darkHighContrast` slot (2.1): it replaces the light / dark
value when Increase Contrast is on; "—" keeps the normal value (palette steps don't vary by contrast, 1.4). All are
September additions; June's roles had none. `outlinePrimary` is used for the unread Home tile border (3.8).

Swift's own tests pin this table. `ColorSetTests.swift:15-22` (tangerine / campfire / mojito / lagoon, b5) checks
basePrimary = (tangerine 0, tangerine 90), baseInverseHighlight1 = (campfire 80, 30), baseInverseHighlight2 =
(mojito 50, 60), baseInverseImportant = (lagoon 70, 40). `testLiteralTokens` (`ColorSetTests.swift:69-89`) checks the
custom-literal branches. The new `testBasePrimaryWithElevatedDark` / `testElevatedDarkOnlyAppliesInDarkMode`
(`:91-132`) pin `base_primary` = #000000 in true dark and #1d1c1d when elevated.

### 3.5 Header gradient colors (`backgroundGradient1` / `backgroundGradient2`)

Standard palettes (`DefaultThemeColorSet.swift:193-225`; unchanged since June). Because `inv` is forced by brightness, brightness 4–6 always
take the inverted branch. The non-inverted light values (P 60 / 70 / 80) can't be reached through `ColorSet`.

| brightness | `backgroundGradient1` light | dark | `backgroundGradient2` light | dark |
|---|---|---|---|---|
| 1 | P 0 | P 10 | H1 10 | H1 0 |
| 2 | P 5 | P 10 | H1 20 | H1 0 |
| 3 | P 10 | P 10 | H1 30 | H1 0 |
| 4 | P 70 | P 10 | H1 80 | H1 0 |
| 5 | P 80 | P 10 | H1 90 | H1 0 |
| 6 (and `default:`) | P 90 (P 80 if `inv` is false, i.e. brightness ≤ 0) | P 10 | H1 100 | H1 0 |

Custom palette (either gradient, `:194-197`, `:211-214`): `r = rampForBackground()` (the closest light ramp to the
color's own tone, with 40 → 30 and 50 → 60, `PaletteColor.swift:546-554`). Light = light-ramp `r`, dark = dark-ramp
`min(r, 10)`. For a custom primary, brightness therefore doesn't affect the gradient. It still decides `inv`.

Verified against `Modules/Features/CompactRoot/Snapshots/iOS_26/CompactRootFeatureTests.CompactRootTabSearchHeaderSnapshotTests/testHeaderBrightness{1…6}@3x.png`,
re-measured on the September baselines (re-recorded since June: the header's contents moved about 8 pt up, the search
field now spans y 248.7–292.7 pt in `testHeaderBrightness5`, but no color changed).
The fixture is aubergine / ocean / jade / flamingo, light mode (`Modules/Features/CompactRoot/Tests/Unit/CompactRootTabSearchHeaderSnapshotTests.swift:175-179`).
In every snapshot, the top pixel equals `backgroundGradient1`, and the pixel at 28 % of the screen height equals `backgroundGradient2`:

| b | expected g1 → g2 | measured top / at y = 716 px |
|---|---|---|
| 1 | #f9edff → #9ed6fa | #f9edff / #9ed6fa |
| 2 | #f6e4ff → #73bdf3 | #f6e4ff / #73bdf3 |
| 3 | #f4daff → #54a9ea | #f4daff / #54a9ea |
| 4 | #83388a → #0b4c8c | #83388a / #0b4c8c |
| 5 | #611f69 → #093a73 | #611f69 / #093a73 |
| 6 | #4a154b → #122a59 | #4a154b / #122a59 |

The same snapshots also check the header's search field: its measured fill is `searchBarBackground` composited over g2
(#8bafd6, #689ad0, #4f8ac9, #386aa2, #365b8d, #3e4e78; identical in the June and September PNGs), within ±1 of the computed value. Title text is
`contentInversePrimary`: #39063a for b1–3 and white for b4–6.

How gradients are drawn:

- **iPhone header** (`HeaderBackgroundView`): a `CAGradientLayer` with default vertical direction and
  `locations = [0, 0.28]`, the height of the full screen, top-anchored. So g1 sits at the top, reaches g2 at 28 % of
  the screen height, and stays solid g2 below. If `gradientEnabled` is false, the layer is hidden and the view's
  `backgroundColor = backgroundGradient1`. In dark mode it adds a 1 pt `core.primary.outlineSecondary` stroke around the
  bottom cutout. The bottom "curtain" cutout has corner radius 16. (`Modules/Features/CompactRoot/Implementation/RootTabDecorator/Header/HeaderBackgroundView.swift:16,38-42,70-89,118-129`)
- **`SKGradientView`** (SwiftUI): `.header` = `RadialGradient`, center bottom-leading, startRadius 100 pt, endRadius
  500 pt. In CSS: `radial-gradient(circle at 0% 100%, g1 100px, g2 500px)`.
  `ThemeWrapper.primaryNavigationHeaderStyle` uses it with [g1, g2] (or [g1] when gradients are off); the unified
  navigation's iPad sidebar header uses the same style (`Modules/Features/WorkspaceRoot/Implementation/Views/WorkspaceRootView.swift:107`).
  New in September: a `.linear(startPoint:endPoint:)` style with `.verticalFade` (top → bottom; Slackbot's greeting
  tint fades into `basePrimary` with it, `Modules/Features/Slackbot/Implementation/SlackbotGreetingRow.swift:139-145`) and
  `.verticalFade(endingAt:)`, and a `.hidden` presentation object (opacity 0) that the empty initializer uses.
  June's `ThemeWrapper.workspaceBackgroundStyle` (radial from top-trailing, 0 → 1200, with a `vcBackgroundColor` overlay)
  is gone, and `HomePresenter` no longer paints a gradient.
  (`Modules/UIInfra/DeveloperComponents/Implementation/GradientView/SKGradientView.swift:22-68,139-175`, `ThemeServiceInterface.swift:34-40`)

### 3.6 Custom hex colors (Material Color Utilities)

Where the hex comes from: `ia_theme` with `useCustomHex: true` (3.3/5.1), the picker's `UIColorPickerViewController`,
or the two vision-assistive presets. The Swift dependency is material-color-utilities `d5ed01e` (Swift sources,
`App/extensions.bzl:58-83`), patched only to make `TonalPalette` public (`third_party/patches/materialcolorutilities-public.patch`).
Its `TonalPalette(hct:)` keeps the input's hue and chroma, and `tone(t)` = `Hct.from(hue, chroma, t).toInt()`.
That is the same as TS 0.4 `TonalPalette.fromHct(hct).tone(t)`. The TS `tone(99)` yellow special case never triggers,
because no ramp uses tone 99.

`CustomPaletteColor` (`PaletteColor.swift:462-620`; the file and the MCU pin are unchanged since June), step by step:

1. Parse: `Int(hex.dropFirst(), radix: 16)` drops the first character **unconditionally** (it expects `#`). If that fails,
   the initializer returns nil and callers use `.standard(fallback)` (`:471-475`, `ThemeService.swift:43-51`,
   `Presets.swift:81-87`). There's no 3-digit shorthand, and the opaque ARGB is `0xFF000000 | rgb` (`:480-481`).
2. `hct = Hct(argb)`. `tone = hct.tone` (CIE L*) (`:482-483`).
3. `TonalPalette(hct:)`, then sample tones (`:485-486,571-598,607-619`):

   | step | 0 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|
   | light tone | 97 | 91 | 85 | 78 | 69 | 57 | 45 | 38 | 28 | 19 | 11 | 4 |
   | dark tone | 4 | 11 | 19 | 28 | 38 | 45 | 57 | 69 | 78 | 85 | 91 | 97 |

   Dark ramp `n` equals light ramp at the mirrored index (0↔100, 5↔90, 10↔80, 20↔70, 30↔60, 40↔50).
   Values are stored as RGBA; alpha is always FF.
4. `customColor(atRamp: n)` = (light-ramp n, dark-ramp n). This is what `P n` means for a custom palette (`:503-516`).
5. `rampForTone()` = the step whose **light** tone is closest to `hct.tone`, with strict `<` (`:533-544`). Swift iterates a
   `Dictionary`, so an exact tie (tone exactly halfway between two steps, e.g. 94.0) is resolved in random order.
6. `rampForBackground()`: 40 → 30, 50 → 60, otherwise `rampForTone()` (`:546-554`).
7. `brightness()`: closest step 0/5 → 1, 10/20 → 2, 30/40 → 3, 50/60 → 4, 70/80 → 5, 90/100 → 6. Used only when the
   user picks a custom **primary** in the picker (`:489-501`, `ThemePickerInteractor.swift:244-247`).
8. `literalColor()` = the input hex, static (`:556-558`). `literalContentColor()` = light-ramp 100 if `tone > 65`, else
   light-ramp 0, static, so it is **the same in dark mode** (`:560-569`).

Reference TypeScript. This code (with types stripped) passes every assertion in `PaletteColorTests.swift:12-41` and
`ColorSetTests.swift:33-49,69-89` using `@material/material-color-utilities` 0.4.0:

```ts
import { Hct, TonalPalette } from '@material/material-color-utilities'
// Node ESM scripts: 0.4.0's index.js has an extensionless import that Node rejects (Vite is fine);
// import '…/hct/hct.js' and '…/palettes/tonal_palette.js' directly there.

export const RAMPS = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const
export type Ramp = (typeof RAMPS)[number]
const LIGHT_TONE: Record<Ramp, number> = { 0: 97, 5: 91, 10: 85, 20: 78, 30: 69, 40: 57, 50: 45, 60: 38, 70: 28, 80: 19, 90: 11, 100: 4 }
const DARK_TONE: Record<Ramp, number> = { 0: 4, 5: 11, 10: 19, 20: 28, 30: 38, 40: 45, 50: 57, 60: 69, 70: 78, 80: 85, 90: 91, 100: 97 }
const hex = (argb: number) => '#' + (argb & 0xffffff).toString(16).padStart(6, '0')

export function customPalette(input: string) {
  const rgb = parseInt(input.slice(1), 16)            // Swift: Int(hex.dropFirst(), radix: 16)
  if (Number.isNaN(rgb)) return null                  // caller falls back to the standard palette
  const hct = Hct.fromInt((0xff000000 | rgb) >>> 0)
  const tp = TonalPalette.fromHct(hct)                // input hue + chroma (NOT fromHueAndChroma)
  const light = {} as Record<Ramp, string>, dark = {} as Record<Ramp, string>
  for (const r of RAMPS) { light[r] = hex(tp.tone(LIGHT_TONE[r])); dark[r] = hex(tp.tone(DARK_TONE[r])) }
  let closest: Ramp = 0
  for (const r of RAMPS) if (Math.abs(hct.tone - LIGHT_TONE[r]) < Math.abs(hct.tone - LIGHT_TONE[closest])) closest = r
  const bg: Ramp = closest === 40 ? 30 : closest === 50 ? 60 : closest
  const content = light[hct.tone > 65 ? 100 : 0]
  return {
    tone: hct.tone,
    at: (r: Ramp) => ({ light: light[r], dark: dark[r] }),                  // customColor(atRamp:)
    background: { light: light[bg], dark: dark[Math.min(bg, 10) as Ramp] }, // backgroundGradient1/2
    literal: { light: hex(rgb), dark: hex(rgb) },                           // literalColor()
    literalContent: { light: content, dark: content },                      // literalContentColor()
    brightness: ({ 0: 1, 5: 1, 10: 2, 20: 2, 30: 3, 40: 3, 50: 4, 60: 4, 70: 5, 80: 5, 90: 6, 100: 6 } as const)[closest],
  }
}
```

Test vectors to keep in the port's unit tests:

| Input | Expected (Slack test) | Source |
|---|---|---|
| `#0547AB` | tone truncates to 32. Step 90 = #001a4b light / #dee5ff dark. Light ramp 0 … 100 = #f6f6ff … #000c2b (RGBA ints at `:22-33`). | `PaletteColorTests.swift:12-34` |
| `#74807B` | `rampForBackground()` = 30 (tone 52.5 → closest 40 → 30) | `PaletteColorTests.swift:36-41` |
| primary `#FFC908`, b2 | `backgroundGradient1` = #ffce40 light / #3b2c00 dark | `ColorSetTests.swift:33-40` |
| primary `#2E3440`, b2 | `backgroundGradient1` = #282e3a light / #282e3a dark | `ColorSetTests.swift:42-49` |
| highlight1 `#EB2639`, important `#00FF37` | baseHighlight1 #eb2639, contentHighlight1 #fff4f3, contentImportant #001201 | `ColorSetTests.swift:69-83` |

### 3.7 Resolved values for the default themes

**Aubergine preset** (`Presets.swift:40`: aubergine / aubergine / jade / aubergine, brightness 6, `inv` = true).
All 60 values of June's 30 roles are byte-identical to protokit's runtime probe of the (June) compiled Swift; none of
them changed in September, and the aubergine and jade ramps didn't either. `outlinePrimary` is new (not in the probe).
With `gradientEnabled` = false (monochromatic preset), the header shows solid `backgroundGradient1`.

| Role | Light | from | Dark | from |
|---|---|---|---|---|
| `basePrimary` | #f9edff | aubergine 0 | #e3ceeb | aubergine 90 |
| `baseSecondary` | #eabdfb | aubergine 20 | #5f2565 | aubergine 20 |
| `baseInversePrimary` | #39063a | aubergine 100 | #200221 | aubergine 0 |
| `baseInverseSecondary` | #611f69 | aubergine 80 | #431349 | aubergine 10 |
| `baseInverseSecondaryNonSidebar` | #611f69 | aubergine 80 | #cfa1de | aubergine 70 |
| `baseHighlight1` | #f9edff | aubergine 0 | #7d3986 | aubergine 30 |
| `baseInverseHighlight1` | #611f69 | aubergine 80 | #7d3986 | aubergine 30 |
| `contentHighlight1` | #39063a | aubergine 100 | #efe1f5 | aubergine 100 |
| `baseHighlight2` | #74dbaf | jade 20 | #3daa7c | jade 60 |
| `baseInverseHighlight2` | #20a271 | jade 50 | #3daa7c | jade 60 |
| `baseImportant` | #eabdfb | aubergine 20 | #cfa1de | aubergine 70 |
| `baseInverseImportant` | #83388a | aubergine 70 | #9652a2 | aubergine 40 |
| `contentImportant` | #39063a | aubergine 100 | #200221 | aubergine 0 |
| `contentInverseImportant` | #f9edff | aubergine 0 | #efe1f5 | aubergine 100 |
| `surfacePrimary` | #39063a/21 (α 0.13) | aubergine 100 | #efe1f5/40 (α 0.25) | aubergine 100 |
| `surfaceSecondary` | #611f69/0d (α 0.05) | aubergine 80 | #7d3986/4d (α 0.3) | aubergine 30 |
| `surfaceTertiary` | #ffffff/f2 (α 0.95) | white | #200221/b3 (α 0.7) | aubergine 0 |
| `surfaceInversePrimary` | #f9edff/40 (α 0.25) | aubergine 0 | #efe1f5/40 (α 0.25) | aubergine 100 |
| `surfaceInverseSecondary` | #f9edff/1c (α 0.11) | aubergine 0 | #101214/99 (α 0.6) | gray 0 |
| `surfaceInverseTertiary` | #f9edff/14 (α 0.08) | aubergine 0 | #efe1f5/14 (α 0.08) | aubergine 100 |
| `contentPrimary` | #39063a | aubergine 100 | #efe1f5 | aubergine 100 |
| `contentSecondary` | #39063a/cc (α 0.8) | aubergine 100 | #e3ceeb/e6 (α 0.9) | aubergine 90 |
| `contentTertiary` | #39063a | aubergine 100 | #200221 | aubergine 0 |
| `contentInversePrimary` | #ffffff | white | #ffffff | white |
| `contentInverseSecondary` | #f9edff/cc (α 0.8) | aubergine 0 | #e3ceeb/e6 (α 0.9) | aubergine 90 |
| `contentInverseImportantSecondary` | #611f69 | aubergine 80 | #cfa1de | aubergine 70 |
| `contentInverseTertiary` | #f9edff/b3 (α 0.7) | aubergine 0 | #e3ceeb/b3 (α 0.7) | aubergine 90 |
| `outlinePrimary` (new) | #39063a/21 (α 0.13) | aubergine 100 | #efe1f5/40 (α 0.25) | aubergine 100 |
| `outlineInversePrimary` | #f9edff/38 (α 0.22) | aubergine 0 | #efe1f5/38 (α 0.22) | aubergine 100 |
| `backgroundGradient1` | #4a154b | aubergine 90 | #431349 | aubergine 10 |
| `backgroundGradient2` | #39063a | aubergine 100 | #200221 | aubergine 0 |

**`ColorSet.defaultAubergine`** (aubergine ×4, brightness 5, `inv` = true; the fallback and every repo snapshot) is identical
except for these four rows:

| Role | Light | Dark |
|---|---|---|
| `baseHighlight2` | #eabdfb (aubergine 20) | #bc80ce (aubergine 60) |
| `baseInverseHighlight2` | #c474d3 (aubergine 50) | #bc80ce (aubergine 60) |
| `backgroundGradient1` | #611f69 (aubergine 80) | #431349 (aubergine 10) |
| `backgroundGradient2` | #4a154b (aubergine 90) | #200221 (aubergine 0) |

**High-contrast slots** (both default themes; every other role keeps its normal value, 3.4). They match the
`f76ac0a` web `theme_*` defaults' high-contrast values, which are aubergine-based (1.2):

| Role | High contrast, light | High contrast, dark |
|---|---|---|
| `baseInverseSecondary` | — | #300c31 (aubergine 5) |
| `baseImportant` | — | #d8bae1 (aubergine 80) |
| `surfaceSecondary` | — | #7d3986/0d (aubergine 30 @ 0.05) |
| `surfaceInverseSecondary` | — | #101214/cc (gray 0 @ 0.8) |
| `contentSecondary` | — | #efe1f5 (aubergine 100) |
| `contentInverseSecondary` | — | #efe1f5 (aubergine 100) |
| `contentInverseTertiary` | — | #e3ceeb/cc (aubergine 90 @ 0.8) |
| `outlinePrimary` | #39063a/40 (aubergine 100 @ 0.25) | #efe1f5/59 (aubergine 100 @ 0.35) |
| `outlineInversePrimary` | — | #efe1f5/80 (aubergine 100 @ 0.5) |

Verified on `Modules/Features/ThemePicker/Snapshots/iOS_26/ThemePickerFeatureTests.ThemePreviewCardViewTests/testGeneralPreviewWithoutGradient@3x.png`
(preview card, defaultAubergine, light): the header is solid #611f69, the badge fill is #83388a (`baseInverseImportant`),
and the presence dot is #c474d3 (`baseInverseHighlight2`). In `…WithGradient@3x.png` the header runs radially from about
#601f68 at the bottom-left to #501854 at the top-right, between #611f69 and #4a154b. The September PNGs differ from June's
only in the antialiasing of the user avatar's ring (0.03 % of pixels); both tests are disabled in September
(`disabled_testGeneralPreviewWith(out)Gradient`, "ThemePicker has never shipped and times out on Xcode 27",
`Modules/Features/ThemePicker/Tests/Unit/ThemePreviewCardViewSnapshotTests.swift:33-34,55-56`).

Values for the two custom-hex presets are in 6.3.

### 3.8 Theme-derived colors outside `ThemeColorSet`

The default-theme values below are for the Aubergine preset (b6). For defaultAubergine only the gradient-dependent
composite differs, as noted.

| Name | Formula | Light | Dark | Source |
|---|---|---|---|---|
| `ThemeColorSet.searchBarBackground` | `surfaceInversePrimary.withAlphaComponent(0.25 × 0.75)` (alpha replaced by 0.1875) | #f9edff/30 | #efe1f5/30 | `Modules/Integration/ThemesIntegration/Interface/ThemeService+ArbitraryConstants.swift:12-16` |
| Header search field, resting | `searchBarBackground` over the header (composite on g2: b6 #5d315f / #472c49; b5 #6b3e6d / #472c49) | — | — | `CompactRootTabSearchHeader.swift:1200,1238,741` |
| Header search field, pulled | `surfaceInversePrimary` | #f9edff/40 | #efe1f5/40 | `CompactRootTabSearchHeader.swift:1204,1242` |
| Header title text | `contentInversePrimary` | #ffffff | #ffffff | `CompactRootTabSearchHeader.swift:1218-1220,1208` |
| Header icons, search text (resting), easter-egg label | `contentInverseSecondary` | #f9edff/cc | #e3ceeb/e6 | `CompactRootTabSearchHeader.swift:1222-1228,1246` |
| Search text (pulled) | `contentInversePrimary` | #ffffff | #ffffff | `CompactRootTabSearchHeader.swift:1230` |
| Search placeholder | `contentInverseTertiary` | #f9edff/b3 | #e3ceeb/b3 | `CompactRootTabSearchHeader.swift:1234` |
| Status container | `searchBarBackground` | #f9edff/30 | #efe1f5/30 | `CompactRootTabSearchHeader.swift:1250` |
| `headerBackground` | `baseInversePrimary` (declared, never used) | #39063a | #200221 | `CompactRootTabSearchHeader.swift:1196,1214` |
| `ThemeWrapper.invertedPresenceColors` | active `baseHighlight2`, away `core.primary.contentTertiary` | #74dbaf / #5e5d60 | #3daa7c / #9a9b9e | `ThemeServiceInterface.swift:28-32` |
| `CoreColorSet.searchTabSelectedBackgroundColor` (circle behind the selected Search tab icon) | light: `surface_secondary` light with α 0.065; dark: its dark with α 0.125. **September: before iOS 27 only**; on iOS 27 the selected image has no circle. | #1d1c1d/11 | #f8f8f8/20 | `Modules/Features/CompactRoot/Implementation/TabBar/CompactRootTabBarController.swift:1185-1194,275-284` |
| Tab bar: background / divider | `core.primary.basePrimary` (June: `sk_primary_background`, the same four values) / `core.primary.outlineTertiary`, 1 px | #ffffff / #5e5d60/21 | #1a1d21 / #797c81/4d | `CompactRootTabBarController.swift:564-580` |
| Tab bar item, normal | `core.primary.contentTertiary` | #5e5d60 | #9a9b9e | `CompactRootTabBarController.swift:583` |
| Tab bar item, selected | Liquid Glass (`shouldUseLiquidGlass`): `baseInverseSecondaryNonSidebar`; otherwise `core.primary.contentPrimary` | #611f69 (glass) / #1d1c1d | #cfa1de / #f8f8f8 | `CompactRootTabBarController.swift:584` |
| Tab badge | text color `baseInverseImportant`, background `.clear` | #83388a | #9652a2 | `CompactRootTabBarController.swift:586,600-601,78` |
| Tab bar, SwiftUI root (unified navigation; the rows above are the legacy UIKit root) | Icons are baked `.alwaysOriginal`: on iOS 26 selected `baseInverseSecondaryNonSidebar`, **unselected `core.contentPrimary`** (pre-26: `core.contentPrimary` / `core.contentTertiary`); unread dot `baseInverseImportant`; selected-tab capsule (pill picker) `surfaceInversePrimary`; opaque (non-glass) bar `core.basePrimary` | #611f69 / #1d1c1d; dot #83388a; capsule #f9edff/40 | #cfa1de / #f8f8f8; dot #9652a2; capsule #efe1f5/40 | `Modules/Features/WorkspaceRoot/Implementation/Views/WorkspaceRootView.swift:146-205` |
| Compose FAB (`ColorSetFABConfigurator`, `.theme`) icon | light UI `contentInversePrimary`; dark UI `contentInverseSecondary` (the dynamic role, so high contrast gives its slot, #efe1f5) | #ffffff | #e3ceeb/e6 | `ColorSetFABConfigurator.swift:24-31` |
| Compose FAB backdrop | light UI: `blend(baseInversePrimary, contentInversePrimary, 0.1)`; dark UI: `blend(baseInverseSecondary, contentInverseSecondary, 0.1)`, through `blendPreservingTraits`, which resolves plain light / dark (no high contrast). `blend` mixes r, g, b **and alpha** linearly. | #4d1f4e | #532659/fc | `ColorSetFABConfigurator.swift:39-57`, `UIColor+Extensions.swift:24-51` |
| Compose FAB backdrop, pressed | light UI: `backdrop.dynamicDarken(0.3)` (blend with `sk_primary_foreground`); dark UI: `dynamicLighten(0.3)` (blend with `sk_primary_background`). Assumes those resolve to the UI's own style. | #3e1e3f | #422348/fd | `ColorSetFABConfigurator.swift:60-65`, `UIColor+Extensions.swift:61-66` |
| Unreads pill (`ColorSetUnreadsPillConfigurator`) | icon: light `core.contentPrimary`, dark gray 10; backdrop: light `core.baseTertiary`, dark gray 90; selected: `contentInverseImportant` on `baseInverseImportant` | #1d1c1d on #eaeaea | #212428 on #e0e0e0 | `ColorSetFABConfigurator.swift:86-117` |
| Synthetic tiles (Home), unread | background: light `theme.surfaceSecondary` light with α 0.065, dark `core.surfaceSecondary` dark with α 0.125, **high contrast and true dark α 0.22** (new). **Border: `theme.outlinePrimary`** (new; June: `surfaceSecondary` light with α 0.13 / `core.surfaceSecondary`). Pressed: light `theme.surfaceSecondary` light with α 0.13, dark `core.surfaceSecondary` (dynamic, so #f8f8f8/66 in high contrast). Content: light `theme.contentPrimary`, dark `core.contentPrimary` (both dynamic now: #ffffff in dark high contrast). Huddle badge: `theme.contentPrimary` light in both modes. The fills are plain translucent colors (June passed them through `blend(…, 1.0)`, which returned them unchanged). | bg #611f69/11, border #39063a/21 (high contrast #39063a/40), text #39063a | bg #f8f8f8/20 (high contrast / true dark #f8f8f8/38), border #efe1f5/40 (high contrast #efe1f5/59), text #f8f8f8 | `Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/SyntheticViewTileColors.swift:13-31,62-84` (copies: `Modules/Features/SlackWidgets/Implementation/Widgets/CatchUp/CatchUpColors.swift:28-62`, moved from `App/Extensions/Widget`; `Modules/Features/ExternalConnections/Implementation/Views/WorkspaceCardRow.swift:174-191`, which keeps the June-style border `surfaceSecondary` @ 0.13 / `core.surfaceSecondary`; and `Modules/Features/HomeRadSimp`) |
| Synthetic tiles, read | background `core.basePrimary`; pressed: light `core.baseSecondary`, dark `core.surfacePrimary` (dynamic now); border `core.outlineTertiary`; title `core.contentSecondary`; subtitle `core.contentTertiary` | — | — | `SyntheticViewTileColors.swift:14-31,86-94` |
| `ColorSet.tabletFABBackgroundColor` | **Gone in September**: `CreationEntryPointsColorSetFABConfigurator.swift` was deleted and nothing replaces it (grep `tabletFAB`: no results). June: `surfacePrimary` dark value, both modes (#efe1f5/40). | — | — | June: `Modules/Features/CreationEntryPoints/Interface/CreationEntryPointsColorSetFABConfigurator.swift:41-48` |
| CreationEntryPoints `blendedBackgroundColor` | `surfaceSecondary` alpha-composited over `core.basePrimary` (opaque result) | #f7f4f8 | #38253f | `Modules/Features/CreationEntryPoints/Implementation/CreationEntryPointsPresenter.swift:234-242,290-305` |

Verified: `Modules/Features/Home/Snapshots/iOS_26/HomeFeatureTests.SyntheticViewTileSnapshotTests/testNewThemeUnreadCell@3x.png`
(lagoon ×3 + flamingo, b5), re-recorded in September: the unread fill measures #eff3f6 (lagoon 80 @ 0.065 over white
computes to #eff4f6), the **border #d2dadf** (`outlinePrimary` = lagoon 100 #0d2e45 @ 0.13 composited over the fill
computes to #d2d9df; June's PNG had #d1dfe6, surfaceSecondary @ 0.13), and the title #0d2e45 (lagoon 100). The new
`testCompactUnreadCell` (316 × 149 px) shows the same three colors.

**List theme options** (`ListThemeOptions`, chosen in `ThemeService.swift:223-280`). The iPad sidebar styles are used
when the device is a non-compact iPad, unless "flat styles" are needed: no transparency (Reduce Transparency, or the
`.partial` layout) **and** a themed sidebar backdrop, which only the legacy navigation draws
(`drawsThemedNonCompactSidebarBackdrop = !NavigationArchitectureVariant.isUnified`, `ThemeService.swift:72-76,226-239`).
Everything else, iPhone included, gets `ia4Phone`. September moved `ia4Phone` from `sk_*` legacy colors to core tokens:

| Property | iPhone (`ia4Phone`, `ListThemeOptions.swift:65-87`) | iPad sidebar, legacy nav (themed backdrop) | iPad sidebar, unified nav (`ThemeService.swift:246-279`) |
|---|---|---|---|
| list / vc / alternate vc background | `core.basePrimary` (June `sk_primary_background`: same values) | `.clear` / `surfaceInverseSecondary` / `surfaceInverseSecondary` | `.clear` / `core.basePrimary` / `core.basePrimary` |
| row highlight / alternate | default / default | `baseHighlight1` / `core.baseTertiary` (June `sk_foreground_low_solid`) | same as legacy |
| badge | text `contentInverseImportant` on `baseInverseImportant` | text `contentImportant` on `baseImportant` | text `contentInverseImportant` on `baseInverseImportant` |
| selected item foreground | nil | `contentHighlight1` | `contentHighlight1` |
| item primary / secondary / tertiary | **`core` contentPrimary / contentSecondary / contentTertiary** (#1d1c1d / #454447 / #5e5d60, dark #f8f8f8 / #b9babd / #9a9b9e; June `sk_primary_foreground` / `sk_foreground_max_solid` / `sk_foreground_high_solid`: #1d1c1d / #616061 / #868686, dark #d1d2d3 / #9a9c9e / #75777a) | `core` contentPrimary / contentSecondary / contentTertiary | same |
| loading placeholder | shimmer on `core.basePrimary` | solid, placeholder `surfaceSecondary` | same as legacy |
| tab underline | `baseInverseHighlight1` | `baseInverseHighlight1` | same |
| divider | **`core.outlineTertiary`** (June `sk_foreground_low_solid` #dddddd / #323538) | `core.outlineTertiary` | same |
| primary adjacent label | **`core.contentSecondary` on `core.baseTertiary`** (June `sk_foreground_max_solid` on `sk_foreground_low_solid`) | `core.contentSecondary` on `core.surfaceSecondary` (June `surfacePrimary`) | same as legacy |
| prominent adjacent label | `core.highlight1.content` on `core.highlight1.base` | `contentHighlight1` on `baseHighlight1` | same |
| presence | active `baseInverseHighlight2`, away `core.contentTertiary` | active `baseHighlight2`, away `core.contentTertiary` | active `baseInverseHighlight2` |

The item colors are what Home's list-style synthetic rows (Later, Threads, All unreads, Tasks, Huddles…) draw with
(`Modules/Features/Home/Implementation/Plugins/SyntheticViews/Tiles/*Tile.swift`, e.g. `LaterTile.swift:184-189`).

---

## 4. Legacy colors (`Modules/Data/Color/Implementation/SKLegacyColors.swift`)

`SKLegacyColors.swift` is unchanged since June, but its colors are on the way out: a SwiftLint rule added in September
warns on any `.sk_` use outside the color module ("Do not use legacy sk_ colors. Use DesignTokens (ColorSet) instead",
`swiftlint.yml:688-696`), and several call sites moved to core tokens (`ListThemeOptions.ia4Phone`, the tab bar, the theme
picker, the Appearance screen; 3.8, 7.2). Where a screen's spec still names an `sk_*` color, check the September call
site: the token that replaced it can differ in dark mode (`sk_primary_foreground` dark #d1d2d3 vs `content_primary`
#f8f8f8).

`UIColor(hex:)` = 8-bit RGB with α 1 (`Modules/Foundation/UIKitExtensions/Implementation/UIColor+Hex.swift:12-47`).
`withAlphaComponent` on these dynamic colors applies per mode. "Token" is the exact `dt_color_*` match. "none" means no
token has that hex; the nearest palette step is listed for reference only.

| Color | Line | Light | Dark (+ variants) | Token equivalent |
|---|---|---|---|---|
| `sk_primary_foreground` | 27 | #1d1c1d | #d1d2d3 | light = `content_primary`; dark = gray 80 dark (no single token) |
| `sk_primary_foreground_dark` | 29 | #d1d2d3 | (static) | gray 80 dark |
| `sk_primary_background` | 34-39 | #ffffff | #1a1d21, trueDark #000000, elevatedDark #1d1c1d | **= `base_primary`** (all four values) |
| `sk_primary_background_dark` | 44-48 | #1a1d21 | #1a1d21, trueDark #000000 | = `base_primary`.dark in both modes (no elevatedDark) |
| `sk_inverted_foreground` | 53 | alias of `sk_primary_background` | | = `base_primary` |
| `sk_inverted_background` | 58 | alias of `sk_primary_foreground` | | as above |
| `sk_foreground_max` | 65 | #1d1c1d/b3 | #d1d2d3/b3 | primary_foreground @ 0.7; light = `base_modal`.light |
| `sk_foreground_max_solid` | 70 | #616061 | #9a9c9e | none (gray 60 is #5e5d60 / #9a9b9e) |
| `sk_foreground_high` | 75 | #1d1c1d/80 | #d1d2d3/80 | @ 0.5; none |
| `sk_foreground_high_solid` | 80 | #868686 | #75777a | none (gray 50 is #7c7a7f / #797c81) |
| `sk_foreground_mid` | 85 | #1d1c1d/4d | #d1d2d3/4d | @ 0.3; none |
| `sk_foreground_low` | 90 | #1d1c1d/21 | #d1d2d3/21 | @ 0.13; none |
| `sk_foreground_low_solid` | 95 | #dddddd | #323538 | dark = gray 20 dark; light none |
| `sk_foreground_soft` | 100 | #1d1c1d/0f | #d1d2d3/0f | @ 0.06; light = `surface_primary`.light |
| `sk_foreground_soft_solid` | 105 | #f3f3f3 | #24272a | none |
| `sk_foreground_soft_solid_dark` | 107 | #24272a | (static) | none |
| `sk_foreground_min` | 112 | #1d1c1d/0a | #d1d2d3/0a | @ 0.04; none |
| `sk_foreground_min_solid` | 117 | #f8f8f8 | #212428 | **= `container_secondary`** |
| `sk_foreground_min_solid_dark` | 118 | #212428 | (static) | = `base_tertiary`.dark |
| `sk_highlight` | 125 | #1264a3 | #1d9bd1 | light = `content_highlight_1`.light; dark none (token is #2ba5ce) |
| `sk_highlight_hover` | 130 | #0b4c8c | #1d9bd1 | light = ocean 80 |
| `sk_highlight_accent` | 135 | #1d9bd1 | (static) | none |
| `sk_secondary_highlight` | 140 | #f2c744 | (static) | none |
| `sk_true_black` / `sk_true_white` | 147 / 152 | #000000 / #ffffff | (static) | = `constants_black` / `constants_white` |
| `sk_black` | 157 | #1d1c1d | (static) | = gray 100 light |
| `sk_black_high_contrast` | 162 | #1d1c1d/80 | (static) | sk_black @ 0.5 |
| `sk_dark_gray` / `sk_light_gray` / `sk_soft_gray` / `sk_subtle_gray` | 167 / 172 / 177 / 182 | #616061 / #868686 / #dddddd / #f3f3f3 | (static) | none |
| `sk_off_white` | 187 | #f8f8f8 | (static) | = gray 0 light |
| `sk_lilypad_green` | 192 | #007a5a | (static) | = jade 70 light |
| `sk_aubergine` | 197 | #4a154b | (static) | = aubergine 90 light (`brand_core_aubergine`) |
| `sk_raspberry_red` | 202 | #e01e5a | (static) | = flamingo 60 light (`brand_core_slack_red`) |
| `sk_reddish_orange` | 207 | #de4e2b | (static) | = tomato 50 light |
| `sk_just_orange` / `sk_sunshine_yellow` | 212 / 217 | #e8912d / #f2c744 | (static) | none |
| `sk_indigo` / `sk_sapphire_blue` | 222 / 227 | #0b4c8c / #1264a3 | (static) | = ocean 80 / ocean 70 light |
| `sk_sky_blue` / `sk_teal_blue` | 232 / 237 | #1d9bd1 / #96daea | (static) | none |
| `sk_pale_yellow` | 242 | #f2c744/33 | (static) | sunshine @ 0.2 |
| `sk_pale_yellow_solid` | 247 | #fcf4da | #61501b | sunshine `lighten(0.8)` / `darken(0.6)` (blend with white / black) |
| `sk_frosty_blue` | 252 | #1d9bd1/1a | (static) | sky @ 0.1 |
| `sk_dark_blue` | 257 | #1c405f | (static) | = lagoon 90 light |
| `sk_dark_blue_or_true_white` | 262 | #1c405f | #ffffff | |
| `sk_frosty_blue_solid` | 267 | #e8f5fa | #092f3f | sky `lighten(0.9)` / `darken(0.7)` |
| `sk_toast_background` | 269-271 | #141414/b3 | #141414/e6 | |
| `sk_shadowColor(traitCollection:)` | 278-288 | #000000 | #dddddd | a `CGColor` function, not dynamic |
| `sk_dropbox_blue` / `sk_google_blue` / `sk_slack_marketing_background` | 295 / 300 / 315 | #007ee5 / #4285f4 / #f3ede5 | (static) | none |
| `sk_apple_sign_in_foreground` / `_background` | 305 / 310 | #ffffff / #000000 | #000000 / #ffffff | |
| `sk_foreground_low/mid/max_always_dark` | 322 / 327 / 332 | #d1d2d3 @ 0.13 / 0.3 / 0.7 | (static) | |

"Developer colors" (`:337-388`), light / dark: mention_fill #1d9bd1/1a both; mention_text #0b4c8c / #1d9bd1;
code #e01e5a / #e8912d; pinned_icon #e8912d / #de4e2b; code_block_fill #1d1c1d/0a / #d1d2d3/21; code_block_stroke
#1d1c1d/21 / #d1d2d3/80; aubergine_button_fill #4a154b / #ffffff; audio_clips_dynamic_background #ffffff / #212428;
…\_composer_ia #1d9bd1/1a / #323538; …\_recording_context_text #1d1c1d/b3 / #d1d2d3; …\_close_button #1d1c1d/b3 / #ffffff;
…\_close_button_background #ffffff / #d1d2d3/21; …\_background_warning_state #f3f3f3 / #323538; …\_text_warning_state
#e01e5a / #d1d2d3; coachmark_banner_background #1264a3 / #17344c; …\_text #ffffff / #d1d2d3; …\_button_background #ffffff /
#4f6375; …\_button_background_selected #ffffff / #4f6375/1f; …\_button_text #1d1c1d / #ffffff; …\_ornament_background
#e8f5fa / #4f6375; huddle_mute_indicator_icon_selcted #ffffff / #1d1c1d; …\_unselected #1d1c1d / #ffffff;
huddle_unmute_indicator_icon #1264a3 / #ffffff; huddle_action_btn_background_unselected #f3f3f3 / #616061; …\_selected
#616061 / #ffffff; huddle_profile_view_button_background #f3f3f3 / #323538; huddles_add_link_or_file_button #0b4c8c /
#40b3e4; context_bar_slack_connect #e7f6f3 / #4cbf9d/1f; context_bar_govslack #f3f3f3 / #24272a; …\_warning #e8912d/1a /
#e8912d/1f; curious_pigeon_background #96daea / #d1d2d3; spicy_sparrow_background #f2c744 / #616061;
speedbump_header_canvas_bg_color #fbf6ef / #616061; trials_pro_badge_text #ffffff / `sk_primary_background` (so
#000000 in true dark); trials_pro_badge_background #4a154b / #d1d2d3; trials_banner_text #4a154b / #d1d2d3/b3;
outbounds_education / live_huddles_empty_state / notifications_disabled_banner backgrounds #f4ede4 / #d1d2d3/21;
emoji_category_bar_foreground_selected #1d1c1d / #ffffff; list_icon_foreground #ffffff / #d1d2d3; list_icon_background
#4a154b / #323538; docs_icon_color_files_search_view #4a154b / #ffffff; unreads_in_other_workspaces #1d1c1d / #ffffff;
placeholder_theme_background_color #4a154b / #24272a; search_filter_pill_background #1d1c1d/21 / #d1d2d3/80;
celebration_banner_text_color #4a154b / #ffffff; file_type_bolt_icon_background_color #d9454d / #d97e85.
Four colors blend with a *dynamic* color inside a `static let`, so their value depends on the trait that is current at
first access. The values here assume a light trait at first access (the dark-trait alternative is in parentheses):
`message_rendering_plain_text_input_text` light = `sk_black.dynamicLighten(0.1)` → #343334 (#1d1c1d), dark
#dddddd; `trials_banner_background` light = aubergine `dynamicLighten(0.95)` → #f6f3f6 (#1c1d23), dark #d1d2d3/21;
`placeholder_theme_inverse_background_color` light = aubergine `dynamicLighten(0.85)` → #e4dce4 (#211c27), dark
#24272a; `placeholder_theme_pulse_color` light = aubergine `dynamicLighten(0.7)` → #c9b9c9 (#281b2e), dark =
#24272a `dynamicDarken(0.7)` → #1f1f21 (#9d9fa0).

---

## 5. Message text colors: `Modules/UIInfra/TSFTheme`

`TSF2ColorTheme.defaultTheme` is used by the text renderer
(`Modules/UIInfra/TSFTheme/Implementation/TSF2Theme+Default.swift:22-44`,
`Modules/Integration/TextRendering/Implementation/TextRendering/TextRenderingManager.swift:68,260-265`).
**It does not depend on the user's theme.** Each render call may override only `textColor`.

| Property | Color | Light / dark |
|---|---|---|
| textColor, disabledLinkColor, normalAccentColor, preTextColor, strikeColor | `core.primary.contentPrimary` | #1d1c1d / #f8f8f8 |
| linkColor | `core.highlight1.content` | #1264a3 / #2ba5ce |
| linkBackgroundColor, userLinkBackgroundColor | `sk_frosty_blue_solid` | #e8f5fa / #092f3f |
| currentUserLinkBackgroundColor, normalHighlightColor (search-hit rounded background, `TextRenderingManager.swift:328-348`) | `sk_pale_yellow` | #f2c744/33 |
| privateChannelLinkColor, hiddenUserColor | `core.primary.contentSecondary` | #454447 / #b9babd |
| privateChannelLinkBackgroundColor, hiddenUserBackgroundColor | `core.primary.baseTertiary` | #eaeaea / #212428 |
| codeTextColor | `message_rendering_code` | #e01e5a / #e8912d |

Fonts (`TSF2Theme+Default.swift:46-61`): Lato regular / bold / italic / bold-italic at `UIFont.bodySize` = 17
(`UIFont+LegacySupport.swift:92`), plus the `monospaceEquivalent` of each. (September only added lint comments; the
colors and fonts are unchanged.)

---

## 6. Storing and applying the theme: `Modules/Integration/ThemesIntegration`

### 6.1 Storage

| Item | Detail | Source |
|---|---|---|
| Theme | User preference **`ia_theme`**: a JSON string `{"primary":{"palette":"aubergine","custom":"#AB93D3"?}, "highlight1":{…}, "highlight2":{…}, "important":{…}, "brightness":6?, "sidebarInverted":true?, "useCustomHex":false?}` | `ThemeService.swift:20-53`, `PreferenceKey.swift:126` |
| Gradient | User preference **`window_background_gradients`** (Bool) | `PreferenceKey.swift:127` |
| Parse | `palette` must be one of the 20 `StandardPaletteColor` raw values, or decoding the **whole** theme fails. A color is custom only if `useCustomHex == true` and `custom` parses (3.6). `brightness ?? 5`, `sidebarInverted ?? false`. | `ThemeService.swift:43-52,93-116` |
| Fallback | An empty or invalid string gives `ColorSet.defaultAubergine` (aubergine ×4, b5) with `sidebarInvertedPref: true`. Production users do have an `ia_theme`: real-device screenshots (dark) show the Aubergine preset's colors (jade presence #3daa7c) with gradients on, so the clone defaults to that (`src/theme/presets.ts` `DEFAULT_THEME`) and keeps defaultAubergine as `?theme=fallback` for snapshot comparisons. | `ThemeService.swift:93-117` |
| Gradient default | The first synchronous value uses fallback `true` (`:292`), but the live publisher maps a missing pref to `false` (`:161-163`). `userPreferencePublisher` immediately emits the cached value, nil if absent (`Modules/NetworkPersistence/Preferences/Implementation/PreferencesManager.swift:620-636`). So a missing pref ends up `false`. | `ThemeService.swift:161-163,292` |
| Write | The picker writes `{palette: fallback, custom: hex}` for custom colors, sets `useCustomHex` = any color custom, and uses `setPrefValue(…, prefType: .user)` | `ThemeService.swift:120-142,205-210,306-314` |
| Stream | `themePublisher` = combineLatest(ia_theme, gradient pref, picker's temporary override (debounced 30 ms), IA attributes, Reduce Transparency) → `ThemeWrapper`. September builds it eagerly in `init` from a static factory (June: a `lazy var`), and passes the navigation architecture into the list theme options (3.8). | `ThemeService.swift:78-91,144-204` |
| Temporary override | The picker previews a candidate app-wide with `setTemporaryOverrideTheme`. It is cleared on save and on picker `deinit`. | `ThemeService.swift:213-221`, `ThemePickerInteractor.swift:78-80,158` |

**"Sync with desktop": not found as a feature or string** (looked in `localized_strings.yaml`, `Modules/Integration/ThemesIntegration`,
`Modules/Features/ThemePicker`, `Modules/UIInfra/DesignTokens`, and a repo-wide grep for `sync.*theme` and `sidebar_theme`).
What the code shows is that iOS reads and writes the same server-side **user** preferences (`ia_theme`,
`window_background_gradients`) and re-themes live whenever they change. So the iOS theme follows whatever the user sets on
another client. Whether desktop writes the same `ia_theme` key isn't visible in iOS source. The only "Sync" toggle is
"Sync with iOS" for high contrast (2.3). There is no default server value for `ia_theme` in iOS source: not found (looked in
`ThemeService.swift`, `PreferenceKey.swift`, `PreferencesManager.swift`).

### 6.2 Who applies it

Features subscribe to `themeService.themePublisher` and read `colorSet.theme.*` / `colorSet.core.*`, e.g.
`CompactRootTabBarController.swift:610-615`, `HeaderBackgroundView.apply(themeWrapper:)`, `HomePresenter.swift:98-182`
(list theme options; June also chose `workspaceBackgroundStyle` there), `SearchPresenter.swift:19,30`,
`TabletRootViewController.swift:554-569`, and under the unified navigation `WorkspaceRootView.swift:100-110`.
`MockThemeService` gives every snapshot test `defaultAubergine` with `gradientEnabled: true` and `ia4Phone` list options
(`Modules/Integration/ThemesIntegration/Tests/Mocks/MockThemeService.swift:14-21`). Window-level color mode and contrast
are applied by `LoggedInViewController` or `ColorModeManager` (2.2).

### 6.3 Custom-hex presets, resolved

These two presets are the custom path end to end. Their values are computed with the 3.6 port, not snapshot-verified.
Inputs are in 7.2.

| Role | Tritanopia light | dark | Protanopia & Deuteranopia light | dark |
|---|---|---|---|---|
| `basePrimary` | #f6f6f6 | #e5e5e5 | #fff3fa | #ffdafb |
| `baseSecondary` | #c1c1c1 | #424242 | #eaade9 | #603063 |
| `baseInversePrimary` | #0e0e0e | #0e0e0e | #200025 | #200025 |
| `baseInverseSecondary` | #2e2e2e | #2e2e2e | #491b4d | #491b4d |
| `baseInverseSecondaryNonSidebar` | #2e2e2e | #c1c1c1 | #491b4d | #eaade9 |
| `baseHighlight1` / `baseInverseHighlight1` | #f8f8f8 | #f8f8f8 | #f9edff | #f9edff |
| `contentHighlight1` | #0c0f0f | #0c0f0f | #110c18 | #110c18 |
| `baseHighlight2` / `baseInverseHighlight2` | #20a271 | #20a271 | #20a271 | #20a271 |
| `baseImportant` / `baseInverseImportant` | #ef3e75 | #ef3e75 | #eabdfb | #eabdfb |
| `contentImportant` / `contentInverseImportant` | #fff4f4 | #fff4f4 | #1d002c | #1d002c |
| `surfacePrimary` | #0e0e0e/21 | #f6f6f6/40 | #200025/21 | #fff3fa/40 |
| `surfaceSecondary` | #2e2e2e/0d | #595959/4d | #491b4d/0d | #7a477c/4d |
| `surfaceTertiary` | #ffffff/f2 | #0e0e0e/b3 | #ffffff/f2 | #200025/b3 |
| `surfaceInversePrimary` | #f6f6f6/40 | #f6f6f6/40 | #fff3fa/40 | #fff3fa/40 |
| `surfaceInverseSecondary` | #f6f6f6/1c | #101214/99 | #fff3fa/1c | #101214/99 |
| `surfaceInverseTertiary` | #f6f6f6/14 | #f6f6f6/14 | #fff3fa/14 | #fff3fa/14 |
| `contentPrimary` | #0e0e0e | #f6f6f6 | #200025 | #fff3fa |
| `contentSecondary` | #0e0e0e/cc | #e5e5e5/e6 | #200025/cc | #ffdafb/e6 |
| `contentTertiary` | #0e0e0e | #0e0e0e | #200025 | #200025 |
| `contentInversePrimary` | #ffffff | #ffffff | #ffffff | #ffffff |
| `contentInverseSecondary` | #f6f6f6/cc | #e5e5e5/e6 | #fff3fa/cc | #ffdafb/e6 |
| `contentInverseImportantSecondary` | #620026 | #ffa9ba | #411f52 | #deb1ee |
| `contentInverseTertiary` | #f6f6f6/b3 | #e5e5e5/b3 | #fff3fa/b3 | #ffdafb/b3 |
| `outlineInversePrimary` | #f6f6f6/38 | #f6f6f6/38 | #fff3fa/38 | #fff3fa/38 |
| `backgroundGradient1` | #0e0e0e | #2e2e2e | #200025 | #491b4d |
| `backgroundGradient2` | #f6f6f6 | #0c0f0f | #fdf3ff | #110c18 |

Intermediate values, from the port: #000000 has tone 0, closest step 100, `brightness()` 6, and a gray ramp
(light #f6f6f6 … #0e0e0e). #F8F8F8: tone 97.58 → step 0. #20A271: tone 59.29 → step 40 → background 30.
#EF3E75: tone 55.16 → 40 → 30. #2D0033: tone 7.20 → 100. #F9EDFF: tone 95.13 → 0. #EABDFB: tone 82.30 → 10.

---

## 7. Theme picker: `Modules/Features/ThemePicker`

### 7.1 Entry and presentation

- Entry: Settings → a "Themes" row (paintbrush icon, "NEW" badge) in the **"Internally Visible"** section. September gates
  that section on `areInternalSettingsEnabled`, which is true only when the app links the real InternalSettings module,
  i.e. builds with `//App:slack_debug_features` (debug and dogfood); the release polyfill returns false (June: any
  non-external build flavor) (`PreferencesInteractor.swift:176`,
  `Modules/Features/InternalSettings/Implementation/InternalSettingsFeature+AppDonations.swift:19-21`,
  `Modules/Features/SlackDebugFeaturesPolyfills/Implementation/SlackDebugFeaturesPolyfills+AppDonations.swift:36-41`,
  `App/BUILD.bazel:1810-1829`). The row also needs flag `ios_ia4_theme_picker` (`isGlobal: false`, default `false`)
  (`PreferencesPresenter.swift:50-55,199-207,303-305`, `PreferencesFeature.swift:254-255`,
  `Modules/Data/Toggles/Definitions/ios_ia4_theme_picker.json`). **Production users can't open the picker on iOS.**
  Their theme comes from `ia_theme`.
- Presented modally: `.fullScreen` on iPhone, `.formSheet` on non-compact iPad, swipe-to-dismiss disabled
  (`Modules/Features/ThemePicker/Implementation/ThemePickerFeature.swift:25-31`). Title "Themes" (`themes` :21369,
  `ThemePickerViewController.swift:53`), close button from `navigationTitleConfigurator.configureCloseButton` (:58-62).
  The right bar button is an `svgCheck` icon (a11y "Done", `done` :5777) on iOS 26, "Save" (`save` :16880) before that.
  September builds it in the presenter as an `SKBarButtonItem` presentation object and installs it with
  `configureRightBarButtonItem` on every view state (`ThemePickerPresenter.swift:60-81`, `ThemePickerViewController.swift:78-85`);
  June made it in the view controller.
- Close with unsaved changes opens an action sheet: title "Save changes?", message "This will change the appearance of your
  Slack", buttons "Save Changes" and "Discard Changes" (destructive) (`ThemePickerInteractor.swift:188-215`,
  `localized_strings.yaml:21254-21265`). Save writes `window_background_gradients` if it changed, then `ia_theme`,
  then dismisses (`ThemePickerInteractor.swift:161-186`).

### 7.2 Layout (iPhone)

| Element | Value | Source |
|---|---|---|
| Screen background | `core.primary.basePrimary`, with a full-screen overlay that animates (0.2 s) to `theme.primary._0` of the selection | `ThemePickerViewController.swift:36-41,52,95-103` |
| Preview section | card inset 16 on all sides from the safe-area top; a11y label "Theme Preview, Current Theme, <name or Custom>" | `ThemePreviewSectionView.swift:31-48`, `theme_preview` :21360, `current_theme` :5021, `custom` :5027 |
| Preview card | corner radius 20 (continuous); shadow `sk_black`, opacity 0.12, offset (0, 8), radius 24; parallax tilt ±10° | `ThemePreviewCardView.swift:20-28,159-194,291-320` |
| Card gradient | radial, bottom-leading, 100 → 500 pt: [g1, gradientEnabled ? g2 : g1] | `ThemePreviewCardView.swift:282-289` |
| Card top line | 12 from the top, 16 side insets, height 40, spacing 12: workspace avatar (iOS 26: in a Liquid Glass capsule, 6 pt inset, size `.smallPlus`; else `.large`), workspace name (`.title` = Lato Black 22, max 34 pt, `contentInversePrimary`, 1 line), user avatar with presence (active and away both `baseInverseHighlight2`) | `ThemePreviewCardView.swift:113-130,186-188,213-242` |
| Card list | 12 below the top line, full width, `core.basePrimary`, corner radius 16. Row 1: public-channel icon + "channel-name" (bodyBold, max 17 pt, `core.contentPrimary`; June `sk_primary_foreground`, which is #d1d2d3 in dark, not #f8f8f8) + badge "2" (`baseInverseImportant`). Row 2: presence dot (`baseInverseHighlight2`) + "Team Member" (body, max 17 pt, `core.contentPrimary`). | `ThemePreviewCardView.swift:132-142,244-265`, `theme_preview_channel_name` :21363, `theme_preview_team_member` :21366 |
| Selector panel | below the preview to the bottom, corner radius 36 (continuous), `core.basePrimary`. `SKPageController` tabs: "Theme Presets" (:21357) and "Customize Theme" (:5123). | `ThemePickerViewController.swift:17-34,73-75`, `ThemeSelectorView.swift:71-91` |
| Presets grid | one section, 28 presets in 7.3 order, no section headers; 2 columns (1 at `accessibilityExtraLarge`+); insets top 24 / sides 24 / bottom 12; gaps 8 | `ThemePresetsView.swift:25-28,144-164`, `ThemePickerInteractor.swift:85-86` |
| Preset cell | height = max(label, 36) + 2 × 8; corner radius 12 (continuous); 1 pt `core.outlineTertiary` border. Stack: 36 pt circular swatch (radial bottom-leading 10 → 50 of [g1, g2]) + title (captionBold = Lato Bold 13, `core.contentPrimary`, June `sk_primary_foreground`; 1 line); spacing 12, side inset 12. | `ThemePresetCell.swift:19-25,27-49,76-93,106-121,132-151` |
| Preset cell, selected | spring (`.bouncy`) to a 2 pt border filled with the theme's gradient image: `primary._60` → `highlight1._60`, left to right (monochromatic: solid `primary._60`), plus a 0.06-alpha copy as background; border color animates 0.3 s | `ThemePresetCell.swift:123-130,159-178,193-216,218-225` |
| Preset cell, pressed | scales to 0.96 (bounce) | `ThemePresetCell.swift:64-74` |
| "Surprise Me" | `SKButton` primary, medium, `svgSparkles` on the left, 16 side insets, at the bottom safe area (16 from the bottom when there's no safe area); a `basePrimary` fade (α 0 → 0.9 at 40 %) behind it, from 24 above the button | `ThemePresetsView.swift:48-81,119-134`, `UIView+Autolayout.swift:104-114`, `surprise_me` :20871 |
| Customize list | 4 rows: "Header" (primary), "Selected Items" (highlight1), "Presence Indication" (highlight2), "Notifications" (important). Primary text bodyBold `core.contentPrimary` (June `sk_primary_foreground`); secondary "#RRGGBB"; a circular swatch. Swatch colors: primary → `baseInverseSecondary` (border `outlineInversePrimary`), highlight1 → step 50 of its palette, highlight2 → `baseInverseHighlight2`, important → `baseInverseImportant`, custom → the hex. Then a "Window Gradient" checkbox with subtitle "Blend **Window background** and **Selected items** colors together in window backgrounds." (caption, `core.contentSecondary`; June `sk_foreground_max_solid`). | `ThemePickerDataTypes.swift:48-66,90-109`, `ThemePickerPresenter.swift:86-170`, strings :23345, :17423, :15147, :13451, :21266-21272 |
| Aubergine preset in Customize | light: Header #611F69, Selected Items #C474D3, Presence #20A271, Notifications #83388A. Dark: #431349, #B26EC3, #3DAA7C, #9652A2. | computed from 3.7 |
| Color editing | tapping a color row opens `UIColorPickerViewController` as a sheet (custom detent = selector height − bottom safe area, undimmed, radius 36, no alpha). Every pick makes `CustomPaletteColor(hex:, fallback: .aubergine)`; a custom primary also sets `brightness = custom.brightness()` | `ThemePickerViewController.swift:132-166`, `ThemePickerInteractor.swift:235-261` |
| Not shown | no brightness control; the "Darker Sidebars" row is commented out | `ThemePickerPresenter.swift:147-162` |
| Surprise Me | random palette per role from `StandardPaletteColor.allCases`, brightness `Int.random(in: 1..<6)` (1–5, never 6), gradient on | `ThemePickerInteractor.swift:217-233` |

Snapshots: only the preview card has baselines, and September disables both tests (3.7); the PNGs remain. `Modules/Features/ThemePicker/Snapshots/iOS_26/ThemePickerFeatureTests.ThemePreviewCardViewTests/`
`testGeneralPreviewWithGradient@3x.png` (radial aubergine header behind "Acme", white list with "channel-name" + badge "2" and
"Team Member") and `testGeneralPreviewWithoutGradient@3x.png` (same card, solid #611f69 header), plus `iOS_18` copies and an older
`testGeneralPreview@3x.png`. Fixture: `ColorSet.defaultAubergine`, light, user "Frank Reynolds", workspace "Acme"
(`Modules/Features/ThemePicker/Tests/Unit/ThemePreviewCardViewSnapshotTests.swift:34-75`). No snapshot shows the presets or
customize tabs, and no picker snapshot is in dark mode.

### 7.3 Presets (`Presets.swift:38-78`)

Unchanged since June (`Presets.swift` and `Presets+Strings.swift` are byte-identical). The app's copy. The design-tokens `output/ios/Presets.swift` differs: it has no `sidebarInvertedPref` and uses standard palettes for
the two vision-assistive presets. The app doesn't compile that file (the vendored `f76ac0a` copy is identical to `df1f228`'s). "inverted" = brightness ≥ 4.
Gradient hex are light / dark; none changed with the `f76ac0a` tokens (the only palette change, flamingo 40 dark, isn't a
gradient step: it moves `baseInverseImportant` dark of Barbra, Gray, Raspberry Beret, PB&J and Slackr to #d3305d).

| # | Preset (i18n key) | Section | primary / highlight1 / highlight2 / important | b | mono | sidebarInvertedPref | inverted | backgroundGradient1 L / D | backgroundGradient2 L / D | line |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Aubergine (`theme_preset_aubergine`) | Single color | aubergine / aubergine / jade / aubergine | 6 | yes | true | true | #4a154b / #431349 | #39063a / #200221 | 40 |
| 2 | Clementine (`theme_preset_clementine`) | Single color | tangerine / tangerine / jade / tangerine | 4 | yes | false | true | #c84600 / #7a2500 | #ac3d00 / #381000 | 41 |
| 3 | Banana (`theme_preset_banana`) | Single color | sunflower / sunflower / jade / sunflower | 2 | yes | false | false | #fff4b8 / #674800 | #ffd738 / #2f1e00 | 42 |
| 4 | Jade (`theme_preset_jade`) | Single color | jade / jade / jade / jade | 4 | yes | false | true | #007a5a / #083f2e | #0e674d / #05241b | 43 |
| 5 | Lagoon (`theme_preset_lagoon`) | Single color | lagoon / lagoon / jade / lagoon | 5 | yes | true | true | #0b527b / #003d61 | #1c405f / #001a2d | 44 |
| 6 | Barbra (`theme_preset_barbra`) | Single color | flamingo / flamingo / jade / flamingo | 3 | yes | false | false | #ffc4d9 / #6b0518 | #ff81aa / #300005 | 45 |
| 7 | Gray (`theme_preset_gray`) | Single color | gray / gray / jade / flamingo | 2 | yes | false | false | #eaeaea / #212428 | #cbcccf / #101214 | 46 |
| 8 | Mood Indigo (`theme_preset_mood_indigo`) | Single color | indigo / indigo / jade / indigo | 6 | yes | true | true | #112377 / #12206c | #091861 / #040b3d | 47 |
| 9 | Tritanopia (`theme_preset_tritanopia`) | Vision assistive | #000000 (fallback aubergine) / #F8F8F8 (jade) / #20A271 (jade) / #EF3E75 (paprika) | 6 | no | true | true | #0e0e0e / #2e2e2e | #f6f6f6 / #0c0f0f | 51 |
| 10 | Protanopia & Deuteranopia (`theme_preset_protanopia_and_deuteranopia`) | Vision assistive | #2D0033 (aubergine) / #F9EDFF (grass) / #20A271 (grass) / #EABDFB (aubergine) | 6 | no | true | true | #200025 / #491b4d | #fdf3ff / #110c18 | 52 |
| 11 | Raspberry Beret (`theme_preset_raspberry_beret`) | Fun and new | aubergine / flamingo / aubergine / flamingo | 3 | no | false | false | #f4daff / #431349 | #ff81aa / #300005 | 56 |
| 12 | Big Business (`theme_preset_big_business`) | Fun and new | gray / indigo / indigo / indigo | 4 | no | true | true | #454447 / #212428 | #1e328f / #040b3d | 57 |
| 13 | POG (`theme_preset_pog`) | Fun and new | sangria / honeycomb / sunflower / sunflower | 3 | no | false | false | #f6d2e2 / #591836 | #ecb22e / #361e00 | 58 |
| 14 | Mint Chip (`theme_preset_mint_chip`) | Fun and new | cilantro / indigo / indigo / horchata | 3 | no | false | false | #c0ecaa / #164012 | #7d95eb / #040b3d | 59 |
| 15 | PB&J (`theme_preset_pbj`) | Fun and new | horchata / sangria / sangria / flamingo | 3 | no | false | false | #e3ceb5 / #482a0f | #e296b9 / #320015 | 60 |
| 16 | Chill Vibes (`theme_preset_chill_vibes`) | Fun and new | jade / aquarium / jade / aquarium | 4 | no | true | true | #007a5a / #083f2e | #085867 / #011c23 | 61 |
| 17 | Forest Floor (`theme_preset_forest_floor`) | Fun and new | grass / horchata / sunflower / sunflower | 4 | no | false | true | #50740e / #2a4206 | #663f18 / #2a1707 | 62 |
| 18 | Slackr (`theme_preset_slackr`) | Fun and new | flamingo / lagoon / mojito / flamingo | 3 | no | false | false | #ffc4d9 / #6b0518 | #36c5f0 / #001a2d | 63 |
| 19 | Sea Glass (`theme_preset_sea_glass`) | Fun and new | aquarium / aubergine / aquarium / aubergine | 3 | no | false | false | #a9edef / #053c48 | #df9ff4 / #200221 | 64 |
| 20 | Lemon Lime (`theme_preset_lemon_lime`) | Fun and new | sunflower / cilantro / aubergine / cilantro | 4 | no | false | true | #aa8000 / #674800 | #0b6400 / #102310 | 65 |
| 21 | Falling Leaves (`theme_preset_falling_leaves`) | Fun and new | horchata / sunflower / tangerine / tomato | 4 | no | true | true | #784c1f / #482a0f | #8b6800 / #2f1e00 | 66 |
| 22 | Sunrise (`theme_preset_sunrise`) | Fun and new | tangerine / flamingo / campfire / honeycomb | 2 | no | false | false | #ffe3d6 / #7a2500 | #ffa3c2 / #300005 | 67 |
| 23 | Choco Mint (`theme_preset_choco_mint`) | Updated classics | horchata / jade / gray / jade | 5 | no | true | true | #663f18 / #482a0f | #0c5340 / #05241b | 71 |
| 24 | CMYK (`theme_preset_cmyk`) | Updated classics | lagoon / flamingo / sunflower / lagoon | 3 | no | false | false | #9fe8fd / #003d61 | #ff81aa / #300005 | 72 |
| 25 | Haberdashery (`theme_preset_haberdashery`) | Updated classics | lagoon / sunflower / cilantro / rose | 6 | no | true | true | #1c405f / #003d61 | #4d3900 / #2f1e00 | 73 |
| 26 | Hoth (`theme_preset_hoth`) | Updated classics | gray / lagoon / cilantro / rose | 1 | no | false | false | #f8f8f8 / #212428 | #9fe8fd / #001a2d | 74 |
| 27 | Ochin (`theme_preset_ochin`) | Updated classics | ocean / ocean / cilantro / mojito | 5 | no | false | true | #0b4c8c / #073368 | #093a73 / #081536 | 75 |
| 28 | Sweet Treat (`theme_preset_sweet_treat`) | Updated classics | tomato / tomato / horchata / jade | 2 | no | false | false | #ffd6d5 / #6e1507 | #fe9c92 / #350803 | 76 |

Display names equal the `name` field. Their i18n values are at `localized_strings.yaml:21273-21354`; the section keys are
`preset_section_*` (:15156-15165). A selection matches a preset by `ColorSet ==`. For custom colors that means the
same hex string (case-sensitive) and the same fallback; anything else shows as "Custom" (`ThemePickerPresenter.swift:43-44`).

---

## 8. Palette ramps (`dt_color_palettes_<name>_<step>`, all opaque)

The line range is the palette's block in `Colors.swift` (six lines per token since `f76ac0a`: light, dark and the two
high-contrast slots, which equal light and dark for every palette step). Rows are in `StandardPaletteColor` order. The only
value that changed since `df1f228` is flamingo 40 dark.
In light mode, step 0 is lightest and 100 darkest. **Dark ramps run the other way**: step 0 is darkest, near the
background, and 100 lightest.

**light**

| palette (lines) | 0 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| gray (554–625) | f8f8f8 | eaeaea | d7d7da | cbcccf | b5b5ba | 9a9a9f | 7c7a7f | 5e5d60 | 454447 | 333133 | 262426 | 1d1c1d |
| horchata (1922–1993) | f4ede4 | ecdecc | e3ceb5 | d1b18b | bf9668 | ae7f4d | 9c6c39 | 8a5b2a | 784c1f | 663f18 | 543312 | 42280d |
| tomato (626–697) | ffebeb | ffd6d5 | ffc2be | fe9c92 | f77c69 | ed6246 | de4e2b | c73c1c | ad2e12 | 92220c | 781a09 | 611307 |
| paprika (698–769) | fff0eb | fbdfd5 | f4c9b9 | e8a991 | de8969 | dc724b | d65d30 | cc4b1b | bb3c0c | a23004 | 842500 | 611b00 |
| tangerine (770–841) | ffede5 | ffe3d6 | fed4be | fbb895 | f89b6c | f28045 | e96825 | dc540c | c84600 | ac3d00 | 8b3200 | 662500 |
| campfire (842–913) | fff2e0 | fde2be | fbcc91 | f6b465 | ed9027 | de7a0d | cf6c02 | bc6000 | a35200 | 864300 | 683400 | 4d2600 |
| honeycomb (914–985) | fcf2d9 | fde3aa | ffd57e | f4c360 | ecb22e | e19b06 | d38d00 | c07f00 | a86e00 | 8e5b00 | 734900 | 593900 |
| sunflower (986–1057) | fffae0 | fff4b8 | ffec81 | ffd738 | ffc600 | f1b900 | dea900 | c79600 | aa8000 | 8b6800 | 6b5000 | 4d3900 |
| grass (1058–1129) | f4ffdb | e5f5b8 | d2eb8c | b4d758 | 9bc339 | 85af26 | 729c1a | 608813 | 50740e | 40600a | 324c08 | 243806 |
| cilantro (1130–1201) | f0ffe9 | d7f5c8 | c0ecaa | 94d874 | 6fc54a | 50b12a | 379e15 | 228b07 | 137700 | 0b6400 | 045100 | 003d00 |
| mojito (1202–1273) | e9ffec | d0f6d7 | b8eec2 | 87dc9b | 60ca7e | 43b868 | 2fa659 | 22954d | 1a8343 | 1a713c | 185f34 | 004522 |
| jade (1274–1345) | e3fff3 | c3f6e0 | a5edce | 74dbaf | 4cc894 | 2eb67d | 20a271 | 178f65 | 007a5a | 0e674d | 0c5340 | 0a4032 |
| aquarium (1346–1417) | e3ffff | c5f6f7 | a9edef | 78d7dd | 53bfc9 | 37a8b6 | 2392a2 | 167d8e | 0d6a7b | 085867 | 054753 | 033640 |
| lagoon (1418–1489) | e3f8ff | c1f0fe | 9fe8fd | 67d7f8 | 36c5f0 | 1cb6eb | 0e9dd3 | 0487be | 0071a4 | 0b527b | 1c405f | 0d2e45 |
| ocean (1490–1561) | e6f5fe | c2e6fd | 9ed6fa | 73bdf3 | 54a9ea | 3b97dd | 2985cd | 1b74b9 | 1264a3 | 0b4c8c | 093a73 | 122a59 |
| indigo (1562–1633) | f0f3fc | dce3fa | c8d4f8 | a0b3f3 | 7d95eb | 5f7be1 | 4864d2 | 3651c0 | 2840a9 | 1e328f | 112377 | 091861 |
| aubergine (1634–1705) | f9edff | f6e4ff | f4daff | eabdfb | df9ff4 | d389e7 | c474d3 | a350af | 83388a | 611f69 | 4a154b | 39063a |
| sangria (1706–1777) | fff0f6 | fae1ec | f6d2e2 | edb4ce | e296b9 | d378a3 | c05b8c | b4497e | 943364 | 7c2852 | 5e1237 | 4d0025 |
| flamingo (1778–1849) | ffe8ef | ffd6e4 | ffc4d9 | ffa3c2 | ff81aa | fa5f90 | ef3e75 | e01e5a | c01343 | 9e0b2e | 7b041c | 59000f |
| rose (1850–1921) | ffe8ea | ffdde0 | ffd1d6 | ffb6bd | fa9da6 | fa7c86 | f2606a | d9454d | bb2c33 | 921d21 | 790a0d | 590001 |

**dark**

| palette (lines) | 0 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| gray (554–625) | 101214 | 1a1d21 | 212428 | 323538 | 414549 | 5a5e63 | 797c81 | 9a9b9e | b9babd | d1d2d3 | e0e0e0 | f8f8f8 |
| horchata (1922–1993) | 2a1707 | 38200a | 482a0f | 543213 | 6b441e | 795129 | 946a3e | a37d54 | ba9b77 | cab49b | dbcbb9 | ebe3d9 |
| tomato (626–697) | 350803 | 5a1005 | 6e1507 | 821d0b | a22b14 | b5381e | d05038 | d86555 | df847c | e7a7a2 | efc2c0 | f7e0e0 |
| paprika (698–769) | 380d00 | 571500 | 731d02 | 8d2707 | a63713 | ae4422 | c15e3c | d07658 | d2927c | ddad9e | ebcac0 | f7e5e0 |
| tangerine (770–841) | 381000 | 5c1d00 | 7a2500 | 982e00 | b43e08 | bf4d1a | d56a37 | da8056 | e4a07f | e7b9a1 | f0d0c1 | f7e3da |
| campfire (842–913) | 321600 | 4b2200 | 612c00 | 7b3a00 | 954700 | a45001 | bf650a | cc771f | dc9d56 | e1b27b | ebcfab | f6e8d5 |
| honeycomb (914–985) | 361e00 | 4d2c00 | 693f00 | 7c4c00 | 9b6100 | aa6c00 | c48305 | cd9625 | dcac52 | e6bc6b | edd199 | f4e9ce |
| sunflower (986–1057) | 2f1e00 | 4c3400 | 674800 | 7e5800 | a07300 | b38200 | d29c00 | dea700 | e6be30 | e6d16e | eee1a6 | f7f0d5 |
| grass (1058–1129) | 152203 | 213405 | 2a4206 | 355009 | 47680d | 557712 | 6e941f | 80a52e | 9dbe4b | b7cf77 | d1e2a6 | eaf5d0 |
| cilantro (1130–1201) | 102310 | 123111 | 164012 | 0f5005 | 1d670b | 2b7616 | 45922a | 5da442 | 81bc69 | a5cf94 | c3e1b7 | e5f4de |
| mojito (1202–1273) | 00240f | 0a3319 | 0d401f | 105d2c | 187439 | 218242 | 369d56 | 4dad68 | 73c487 | 9cd4a9 | bbe4c4 | ddf6e2 |
| jade (1274–1345) | 05241b | 063225 | 083f2e | 00553d | 106f4d | 177e56 | 259b69 | 3daa7c | 63c29a | 8dd2b5 | b0e4ce | d8f5e9 |
| aquarium (1346–1417) | 011c23 | 03313a | 053c48 | 084956 | 0f5f6e | 196f7e | 2c8e9b | 43a1ab | 66bec4 | 90d1d4 | b2e3e4 | d8f5f5 |
| lagoon (1418–1489) | 001a2d | 002f4b | 003d61 | 004d76 | 036696 | 0a77a7 | 1699ca | 2ba5ce | 58bdde | 87cce3 | aeddec | d8eef6 |
| ocean (1490–1561) | 081536 | 062755 | 073368 | 0b4379 | 135795 | 1e64a5 | 307ec0 | 448dcc | 63a5db | 88bbe2 | b0d3ed | dbebf6 |
| indigo (1562–1633) | 040b3d | 0a165a | 12206c | 19297f | 263b9c | 3349ab | 4d65c5 | 657ace | 899bdc | abb7e1 | c7ceeb | e4e8f4 |
| aubergine (1634–1705) | 200221 | 300c31 | 431349 | 5f2565 | 7d3986 | 9652a2 | b26ec3 | bc80ce | cfa1de | d8bae1 | e3ceeb | efe1f5 |
| sangria (1706–1777) | 320015 | 440b24 | 591836 | 6b1f42 | 8e335e | 984068 | b66087 | c27899 | d499b4 | dcb2c5 | e9cad8 | f6e4eb |
| flamingo (1778–1849) | 300005 | 53020f | 6b0518 | 8e0b2a | b41541 | **d3305d** (June c02b54) | d94c75 | de678a | e68ba7 | e6a7ba | eec1cf | f7dce4 |
| rose (1850–1921) | 300000 | 520507 | 6c1114 | 8a1a1f | af3036 | c3434a | d9636b | d97e85 | e69ba1 | e6b2b6 | eec7ca | f7dcde |

---

## 9. Cross-checks

| Check | Result |
|---|---|
| Slack's DesignTokens unit tests, run against my JS port using MCU 0.4 (`PaletteColorTests`, `ColorSetTests`: custom ramps, tone, background ramp, custom gradients, literal tokens, standard mappings) | **50 / 50 assertions pass** (June). September's `ColorSetTests` only rewrote the two elevated-dark tests (3.4); the color vectors are unchanged, and the clone's `src/theme/engine.test.ts` keeps them. |
| `f76ac0a` web `theme_*` defaults vs the port's `defaultAubergine` (September) | Their high-contrast values equal the port's role slots (3.7) and `theme_outline_primary` equals `outlinePrimary` in all four slots. A cross-check only: the web tokens aren't an iOS source. |
| protokit `tokens/themes.json` (runtime probe of the June compiled Swift, `verify/verification-report.json`) vs my port, for all 28 app presets × 30 roles × 2 modes | **1560 / 1560 agree for the 26 standard-palette presets** (June tokens; with `f76ac0a`, `baseInverseImportant` dark of the five flamingo-important presets moves to #d3305d, 7.3, so the probe is stale there). This includes all 60 values of the Aubergine preset in 3.7 and `isSidebarInverted` for all 26. **Tritanopia and Protanopia & Deuteranopia disagree (110 values):** protokit fed its probe the design-tokens `output/ios/Presets.swift` (standard fallback palettes, `verify/preset-spec.json`), but the app ships custom hex for them (`Presets.swift:51-52`). Its values for these two are right for the wrong inputs; use 6.3. |
| protokit `tokens/palette-ramp.json` | 240 / 240 agree with `df1f228` (same `Colors.swift`, same sha256); 239 / 240 with `f76ac0a` (flamingo 40 dark) |
| protokit `tokens/colors.json` | 665 / 665 values agree with `df1f228`; stale for `f76ac0a` (1.3, 1.4) |
| protokit claim "high-contrast branch is DEAD, 0 of 346 tokens change under `.high`" | **Outdated.** True for the June tokens at base level; since `f76ac0a` 33 tokens and nine theme roles change under `.high` (1.4, 3.4). The resolution order (2.1) is now pinned by Slack's `UIColorDynamicTests.swift`, so the June caveat that this came only from reading the source no longer applies. |
| protokit claims "custom hex unresolvable" / "iOS does not support custom HEX values" | **Outdated.** The second is the header of design-tokens' unused `Presets.swift`. The app supports custom hex (`ThemeService.swift:27-52`, the picker's color picker, the two vision presets), and the algorithm is fully specified in 3.6. |
| Snapshot pixels (September baselines) | Header gradients b1–b6, search-field composites, preview-card header / badge / presence, synthetic tile fill / **new `outlinePrimary` border** / title: all match (3.5, 3.7, 3.8) |

---

## 10. How the web clone's engine differs (`~/Desktop/slack-remix/slack-remix/src/theme/engine.ts`)

That engine ports the **desktop/web client's** theme module. It emits CSS variables like
`--dt_color-theme-base-pry: var(--dt_color-plt-aubergine-70)`, with per-mode alphas from `varsets.json`, for three
modes plus high-contrast sets. Its custom-hex palette generator (`customHex.ts`) uses the same MCU call and tone ladder as iOS.
Its differences from iOS:

| Topic | slack-remix (web) | iOS |
|---|---|---|
| Modes | `light`, `dark`, `light-inverted-sidebar`, each also high-contrast | light, dark; inversion is baked into the light values |
| When inverted | light && brightness > 3 && `sidebarInverted` pref, applied per region (chrome / sidebar classes) | brightness ≥ 4, applied to the whole theme; the pref is ignored |
| `base-inv-sec` inverted | step 70 | `baseInverseSecondary` step 80 |
| `base-hgl-2` | from the **highlight1** palette: 70 / inverted 30 / dark 60 | `baseHighlight2` from **highlight2**: 50 / inverted 20 / dark 60 |
| `base-inv-imp` dark | 30 | 40 |
| `content-inv-imp-sec` inverted | 10 | 80 |
| `content-inv-pry` dark | gray 100 (#f8f8f8) | white |
| `content-inv-sec` | alpha 0.8 / inverted step 5 @ 0.9 / dark 0.8 | 0.7 / step 0 @ 0.8 / 0.9 |
| `content-inv-ter` inverted, dark | 0.6, 0.6 | 0.7, 0.7 |
| `surf-sec` light alpha | 0.07 | 0.05 |
| `surf-pry`, `surf-ter` | `breakOut`: fixed var-set values, not palette-driven | palette-driven (`surfaceTertiary` dark = P 0 @ 0.7 vs web gray 0 @ 0.75) |
| iOS-only roles | — | `baseInverseSecondaryNonSidebar`, `backgroundGradient1/2` as colors |
| Web-only | `otl-hgl-1`, hover/pressed states | none (no hover). Since September iOS also has an `outlinePrimary` role and high-contrast slots on nine roles (3.4) |
| Custom content color | tone ≥ 66 → 100 else 0, **flipped in dark** | tone > 65 → light-ramp 100 else 0, **static** |
| Custom background shade | `customBackgroundShade` (compares against the brightness shades) | `rampForBackground()` (40 → 30, 50 → 60), dark `min(r, 10)` |
| Gradient drawing | `.p-theme_background`: radial + conic mix | vertical linear 0 → 28 % (iPhone header) or radial bottom-leading 100 → 500 pt |
| Brightness → gradient shades | `conicShade` / `swatchGradient` pairs | **same numbers** (3.5) |
| Out-of-range brightness | shade '0' | `default:` case (brightness-6 shades) |
| Presets | adds a "Miles Davis" section (6 custom themes); POG and Slackr have `sidebarInverted: true` | 28 presets (7.3); POG and Slackr false (no color effect on iOS) |
| Default payload | Aubergine b6, highlight2 jade, `sidebarInverted: true` | code fallback `defaultAubergine` b5 (6.1); production users see the Aubergine preset's colors (device screenshots, 6.1) |

Reusable as-is: `customHex.ts`'s tone ladder and `TonalPalette.fromHct(Hct.fromInt(argbFromHex(hex)))`, and the preset list
(minus Miles Davis). Rewrite the role mapping from 3.4.

For this repo: `src/tokens/generated/colors.css` defines a separate `[data-dark-variant='elevated']` → `base_primary`
#1d1c1d. On iOS, elevated applies only when true dark or high contrast is on. In plain dark mode, elevated surfaces stay
#1a1d21 (2.1). The token CSS also emits the 1.4 values under `[data-contrast='high']`, and `src/theme/ThemeStyle.tsx`
emits the theme roles' high-contrast slots and the tile fill's true-dark slot under the same attributes; nothing in
the clone sets `data-contrast` yet.

---

## 11. Porting checklist

1. Store each color as `{ light, dark, lightHighContrast?, darkHighContrast?, trueDark?, elevatedDark? }` RGBA. Resolve
   with the 2.1 rules (true dark before high contrast at base level; elevated falls back to the base variant), using
   inputs `{ appearance: system|light|dark|trueDark, highContrast: system|on|off, level: base|elevated }`. Gate trueDark
   and high contrast behind their flags, as iOS does (2.2, 2.3).
2. Theme = `{ primary, highlight1, highlight2, important: {palette, custom?}, brightness, useCustomHex, gradientEnabled }`.
   Parse and default it exactly as 6.1 does, including falling back to `defaultAubergine` b5 on bad JSON.
3. For each role in 3.4, pick the step per mode, set alpha by replacement, and take light-slot values from light ramps and
   dark-slot values from dark ramps. Add the high-contrast slots the 3.4 table lists.
4. Custom palettes use the 3.6 code. `literalColor` / `literalContent` are the same in both modes.
5. Emit CSS variables per mode, e.g. `--theme-basePrimary`. Draw the iPhone header as a linear gradient from
   `backgroundGradient1` to `backgroundGradient2` over 28 % of the screen height, or solid when gradients are off.
6. Unit-test against 3.6's vectors and against 3.7 and 7.3.

---

## 12. Gaps

- The server's default `ia_theme` for a new user: not found (looked in `ThemeService.swift`, `PreferenceKey.swift`,
  `PreferencesManager.swift`). Code falls back to `defaultAubergine` b5. A real signed-in account (device screenshots,
  dark only) shows the Aubergine preset's colors with gradients on; its brightness (5 or 6) only shows in light mode,
  which no device screenshot covers (the clone assumes the preset's 6).
- "Sync with desktop": no such feature or string on iOS (6.1). Whether desktop writes the same `ia_theme` key isn't visible in iOS source.
- Which system-presented views are `.elevated`: UIKit behavior, not in Slack source (2.2).
- The high-contrast + elevated and high-contrast + true-dark outcomes (2.1) are pinned by Slack's unit tests
  (`UIColorDynamicTests.swift`), but no snapshot renders a high-contrast or true-dark screen.
- The four `static let` blends with dynamic colors (end of 4) depend on the trait that is current at first access, which
  the source doesn't pin down.
- FAB pressed colors (3.8) use `dynamicLighten`/`dynamicDarken`, which resolve against `UITraitCollection.current`. The
  values assume it matches the UI style.
- The two vision-assistive presets and all custom-hex outputs are computed with the port. It matches Slack's unit tests,
  but no snapshot renders a custom theme.
- `rampForTone()` ties (a tone exactly halfway between two steps) are resolved in random order in Swift (3.6 step 5).
- No snapshots exist for the presets tab, the customize tab, or the Color Mode screen. 7.2 comes from source only, and
  the preview-card snapshot tests are disabled in September (3.7).
- The `f76ac0a` design-tokens data files (`data/*.json`, `output/web/*-high-contrast.json`) aren't vendored: the
  sources of changed and new tokens in 1.3 are inferred from their hex.
