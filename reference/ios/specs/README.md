# iOS specs: what Slack's iOS app looks like, measured from its source

These files are the mobile clone's ground truth for layout, type, color, icons, copy and behavior. Each one covers
one area of the app and cites the iOS source it came from. Build and review UI against them; when a spec and the
source disagree, the source wins and the spec gets fixed.

## Sources, in order of trust

1. **iOS source**: `/Users/colson.rice/Desktop/Slack Mobile Code Base/slack-objc-latest` (github.com/tinyspeck/slack-objc
   `main` @ `14b3cbaf`, 2026-09-30, with the iOS_26 snapshot PNGs pulled from Git LFS). The specs were first written
   against a June snapshot (`cd22922`, the older `slack-objc-main` folders); `node tools/ios/spec-drift.mjs <old checkout>`
   lists the citations that changed since. Cite paths relative to the repo root
   (`Modules/Features/Home/Implementation/HomeViewController.swift:120`).
2. **Snapshot baselines**: `Modules/**/Snapshots/iOS_26/*.png` in the same checkout (and `iOS_18`). They are Slack's own
   CI reference images, mostly 393×852 pt at @3x (1179×2556 px). Prefer `iOS_26`. The test that renders one is the
   `*SnapshotTests.swift` file named in the folder (`HomeFeatureTests.SyntheticViewTileSnapshotTests` →
   `Modules/Features/Home/Tests/Unit/SyntheticViewTileSnapshotTests.swift`); read it for the fixture and the
   appearance/size it renders at.
3. **Design tokens (colors)**: `slack/design-tokens` at `f76ac0a` (the commit the iOS app pins in
   `internal.MODULE.bazel`), cached at
   `~/.cache/bazel/repository_contents_cache/e77b380d7a061c22176d84b074f4e5df47b315e6f1ee9c55d7dc0a9d45bd98c0/1/`.
   `output/ios/Colors.swift` has every `dt_color_*` token with light/dark (and some trueDark/elevatedDark) values.
   Theme-derived colors (`ThemeColorSet`, `CoreColorSet`) are computed in `Modules/UIInfra/DesignTokens`.
4. **Strings**: `Modules/Data/Strings/Implementation/localized_strings.yaml` and
   `App/Resource/Supporting Files/en.lproj/Localizable.strings`.
5. **Cross-checks only** (never cite as the source): `~/Desktop/ios-protokit-slack/platforms/ios/tokens/`
   (harvested colors, typography, themes, spacing/radius census) and the web clone at
   `~/Desktop/slack-remix/slack-remix` (its demo data and strings).

## Facts that apply everywhere

- Fonts are Lato (`Modules/Data/Font/Implementation/FontStyle.swift`). `SKFont` sizes
  (`UIFont+LegacySupport.swift`): headline 28 black, title 22 black, subtitle 20 (black / bold / regular), body 17
  (regular / bold / black), smallBody 15, caption 13, micro 12, logging 12 monospace. Some system UI uses SF Pro.
- iOS has no spacing, radius, type or shadow tokens: those are per-component `private enum Constants`. Cite them.
- Icons are SVGs in `Modules/Data/Icon/ResourceBundle/Icons.xcassets/<name>.imageset/<name>.svg`, referenced as
  `SKIconManifest.svg<CamelName>` (`Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift`).
- There is no hover. States are normal, highlighted (pressed), selected, disabled.

## How to write a spec

One markdown file per area. For every screen and element:

- **Source**: file:line of the view/constants, and the snapshot PNGs that show it (path + one line on what's in it).
- **Layout**: sizes, insets, spacing, alignment, corner radius, borders, in pt, each with its citation.
- **Type**: SKFont case (→ size/weight), color token, line limit, truncation.
- **Color**: iOS token name → hex light / dark (from `Colors.swift`), or the theme/core color property and how
  it's derived.
- **Icons**: SKIconManifest name, svg file, size, tint.
- **Copy**: the exact English strings and their keys.
- **States and behavior**: what tapping, long-pressing, swiping and scrolling do; animations (duration, curve).
- **Gaps**: what you couldn't determine, stated plainly. Don't guess; say "not found" and where you looked.

Measure from a snapshot PNG only when the source is ambiguous, and say so (divide @3x pixels by 3).
