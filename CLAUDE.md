# Slack for iOS prototyping kit: rules for agents

A clone of Slack's iPhone app that runs in the browser inside a simulated iPhone, used by Slack designers to
prototype with Claude. It's the mobile sibling of the web kit (slack-remix): same Northstar demo data, same
prototype files, same App Kit. It's **internal only**: it ships Slack's fonts, icons, sounds and design tokens.
Never publish it publicly (no public GitHub repos, no claude.ai Artifacts, no public hosting); `docs/publishing.md`
lists the internal hosts.

## The one rule: Slack's iOS source is the truth

- There's no Slack CSS to reuse (the app is UIKit), so every screen is written from the specs in
  `reference/ios/specs/`, which cite the Swift source (`file:line`) for every size, color, font, icon and string.
  **Read your area's spec before you change a screen**, and cite the source of any value you add in a comment.
- When sources disagree, trust them in this order: the iOS source (`$SLACK_IOS_DIR`, default
  `~/Desktop/Slack Mobile Code Base/slack-objc-latest`, a clone of github.com/tinyspeck/slack-objc `main`) and its
  snapshot tests (Git LFS PNGs in the same checkout: `Modules/**/Snapshots/iOS_26/`, @3x, so divide by 3); real-device
  screenshots in `reference/device/` (local only) for what the source doesn't pin down; the design tokens it pins
  (`reference/ios/vendor/design-tokens-df1f228/`); measurements of real iOS 26 screenshots for the system chrome
  UIKit draws (`reference/ios/specs/measurements.md`); then the web kit (slack-remix) for what iOS doesn't carry
  (demo data, personas, emoji, App Kit behavior). **Never trust memory.**
- Colors are the iOS tokens by their iOS names (`var(--dt_color_content_primary)`), legacy `var(--sk_*)` colors and
  theme roles (`var(--theme_baseInverseImportant)`); type is SKFont (`font: var(--sk-body)`); icons are
  `<Icon name="…">` (Icons.xcassets names). No hex values or invented sizes in components. `docs/conventions.md` has
  the details: read it before you build anything.
- One CSS px is one iOS point. Check light and dark (`&appearance=dark`) every time.

## Working rules

- **Evidence, not "looks right".** Before you say something matches Slack, screenshot it and look
  (`npm run shot`), next to the snapshot PNG when there is one (`npm run compare`), and run the self-test
  (`npm run selftest`).
- **Circuit breaker.** If the same fix fails twice, stop and re-read the spec and the Swift source. Don't try a
  third variation.
- **Skills** (`.claude/skills/`): `new-prototype` (making prototypes), `verify-ui` (self-test, screenshots, snapshot
  diffs), `ios-source` (finding a value in the Swift source), `slack-platform-facts` (what Block Kit and the platform
  support: never answer that from memory).
- **Keep the app loadable.** Export a component before you register or import it, so every save leaves the dev
  server working. Screens, sheets and overlays are wrapped in `Guard`.
- **Never hot-link.** Assets live in `public/` (harvested from the iOS app by `npm run harvest`, or from the web kit).
- **Keep the demo stable.** Prototypes are additive: they live in `prototypes/<slug>/` and never change the
  Northstar demo (`src/data/demo*.ts`) when they aren't open.
- **Build prototypes from data first.** A designer's idea is usually a `definePrototype({ … })` file: people,
  channels, messages, Block Kit, apps, scenes (`docs/prototyping.md`). For a screen Slack doesn't have yet, add it to
  the prototype's `screens` using SlackKit components (`src/slackkit/`, gallery at `/?kit=components`) and the
  tokens, so it looks native. Don't edit `src/` for one prototype; improve the kit only when the change is right for
  every prototype.

## Commands

| | |
|---|---|
| `npm run dev` | dev server on http://localhost:5190 (runs a quick doctor first) |
| `npm run doctor` | checks Node, dependencies, macOS quarantine, emoji, Chrome |
| `npm run check` | typecheck + unit tests (every prototype is loaded and checked) + production build |
| `npm run selftest [-- --dark] [-- --proto <slug>]` | opens every tab, conversation, thread, screen and sheet in headless Chrome and reports crashes |
| `npm run shot -- "<route>" out.png --screen [--eval "<js>"]` | screenshot the phone (see the header of `tools/shot.mjs`) |
| `npm run compare -- …` | ours next to Slack's snapshot PNG, with a diff |
| `npm run snapshots [-- --only <ids>]` | the snapshot regression suite (`reference/ios/snapshots.json`): every entry diffed against Slack's PNG, pass/fail |
| `npm run new -- <slug>` | new prototype from the template |
| `npm run demo` | production build served on http://localhost:4190 |
| `npm run harvest` | re-harvest tokens, icons, fonts and sounds from the iOS source |
| `node tools/publish.mjs <folder> <base>` | static build for an internal Pages repo (`docs/publishing.md`) |

- Node 22.12+ (`.nvmrc`). Each command's shell starts on nvm's default Node, so `nvm use` doesn't carry over: start
  commands with `nvm use >/dev/null &&`, or make 22 the default (`nvm alias default 22`, as the setup prompt in
  `docs/getting-started.md` does). On an older Node npm leaves out Vite's native binding, so `.npmrc`
  (engine-strict) refuses the install. A folder that arrived by AirDrop or zip is quarantined by macOS: `xattr -dr com.apple.quarantine node_modules`.
- Headless Chrome can't start inside Claude Code's sandbox, so run `selftest`, `shot`, `compare` and `snapshots` outside it. A dev
  server started inside the sandbox never sees file changes, so start `npm run dev` outside it too.
- Background tasks end with the session. When someone asks to see the kit and http://localhost:5190 doesn't answer,
  start `npm run dev` (in the background, outside the sandbox) first, then open the page for them or give them the
  link. Setup trouble (Git sign-in, Node, a broken install): `docs/getting-started.md`.
- In the browser console: `slack.app.getState()` (the app store: `openConversation`, `push`, `presentSheet`,
  `receiveMessage`…), `slack.sim` (device, appearance), `slack.theme`.

## Where things are

| Area | Path | Spec / guide |
|---|---|---|
| The simulator (device frames, status bar, side panel) | `src/sim/` | `reference/ios/specs/measurements.md` |
| App shell: tabs, navigation stacks, sheets, keyboard, banners | `src/app/`, `src/app/nav/` | `shell-navigation.md`, `sheets-menus.md` |
| Screens (Home, DMs, Activity, Search, More, conversation, thread…) | `src/app/screens/<area>/` | `home.md`, `dms-activity.md`, `messages.md`, `search-slackbot-huddles.md` |
| Messages (MessageKit) and text | `src/messagekit/`, `src/app/text/` | `messages.md` |
| Composer | `src/app/composer/` | `composer.md` |
| SlackKit components (`/?kit=components`) | `src/slackkit/` | `slackkit-components.md` |
| Block Kit and App Kit (`/?kit=blocks`) | `src/blocks/`, `src/apps/` | `blockkit.md` |
| Tokens, type, theme engine | `src/tokens/`, `src/theme/` | `theme-colors.md` |
| Icons (`/?kit=icons`), emoji, sounds | `src/icons/`, `src/emoji/`, `src/lib/sounds.ts` | |
| Prototypes and gallery (`/?kit=prototypes`), assets (`/?kit=assets`) | `prototypes/`, `src/kit/` | `docs/prototyping.md` |
| Demo data (Northstar, shared with the web kit) | `src/data/` | |
| Harvesters and headless tooling | `tools/` | |

## Commits

Small, descriptive commits, only when asked. End every message with:

    Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>
