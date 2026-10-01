---
name: ios-source
description: Look up how Slack's iOS app really draws or does something — a size, color, font, icon, string, animation or behavior — in the specs and the Swift source, instead of guessing. Use when building or fixing any screen or component in this kit, when a value isn't in the spec, or when someone asks what the iPhone app does ("how tall is…", "what color is…", "what does long-press do…").
---

# Find it in Slack's iOS source

The kit is built from Slack's iOS source; memory is never a source. Look in this order:

1. **The spec** for the area: `reference/ios/specs/` (`README.md` indexes them; `measurements.md` has iOS 26 system
   chrome measured on real devices). Specs cite `file:line` for every value.
2. **The Swift source** the spec cites: `$SLACK_IOS_DIR`, default
   `~/Desktop/Slack Mobile Code Base/slack-objc-latest` (a shallow clone of github.com/tinyspeck/slack-objc `main`;
   update it with `git -C <dir> pull --depth 1` and `git -C <dir> lfs pull --include "Modules/**/Snapshots/iOS_26/**"`).
   The specs were first written against a June snapshot; `node tools/ios/spec-drift.mjs <old checkout>` lists the
   citations that changed since. Useful places:
   - `Modules/UIInfra/SlackKit/Implementation/` (SKButton, SKList, SKEntity…), `Modules/UIInfra/MessageKit/`,
     `Modules/UIInfra/BlockKitComponents/`
   - `Modules/Features/<Feature>/Implementation/` (Home, Conversation, Composer, Search, Huddles…)
   - `Modules/UIInfra/DesignTokens/` (theme engine), fonts in `SKFont`, icons in `SKIconManifest.swift`
     (`svgChannelFilled` → `channel_filled`)
   - strings: `localized_strings.yaml` (search the key the Swift uses, e.g. `R.strings.slackbot_user`)
   Search with `grep -rn --include='*.swift' <term> Modules | grep -v /Tests/`.
3. **Colors** come from the pinned design tokens: `reference/ios/vendor/design-tokens-<sha>/Colors.swift` (the sha is
   `DESIGN_TOKENS_SHA` in the iOS repo's `internal.MODULE.bazel` and in tools/ios/paths.mjs; light/dark/high-contrast
   hex per token), already in `src/tokens/generated/colors.css` under the same names
   (`dt_color_content_primary` → `var(--dt_color_content_primary)`). Legacy `sk_*` colors: `theme-colors.md` §4.
4. **Snapshot PNGs** show the result: `Modules/**/Snapshots/iOS_26/` in the same checkout (@3x; divide by 3). Measure
   with python3 + PIL when the code computes a size at runtime.
5. **Production** can differ from the code's defaults (server-side feature flags): real-device screenshots in
   `reference/device/` (local only) are the tiebreaker; `src/app/flags.ts` holds the production defaults.
5. **What iOS doesn't carry** (demo content, personas, emoji data, App Kit behavior) comes from the web kit
   (`~/Desktop/slack-remix/slack-remix`).

When you add a value, cite where it came from in a comment (`/* SKButton.swift:88 */`). If you can't find it, say
so, pick the closest measured value, and mark it as a gap in the spec rather than inventing one.
