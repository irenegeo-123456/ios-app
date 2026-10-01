---
name: verify-ui
description: Prove a screen, component or prototype in this Slack for iPhone kit renders correctly and matches the real iOS app — self-test, screenshots of the simulated iPhone in light and dark, and side-by-side diffs against Slack's own iOS snapshot-test PNGs. Use after any UI change, before saying something "matches Slack", or when asked to check, QA, screenshot or compare a screen.
---

# Verify UI in the Slack for iPhone kit

Evidence beats "looks right". A change is done when the self-test passes, you've looked at screenshots in light and
dark, and (where Slack has a snapshot PNG) the side-by-side matches. Headless Chrome can't start inside Claude Code's
sandbox: run these with the sandbox disabled. The dev server is http://localhost:5190.

## 1. Self-test

`npm run selftest` opens every tab, conversation, thread, profile, registered screen and sheet, and lists what
crashed or isn't built. Also `-- --dark`, and `-- --proto <slug>` inside a prototype. `/?selftest` shows the same
report in the browser.

## 2. Screenshot the phone

```sh
npm run shot -- "/?chrome=screen" out.png --screen                       # the screen alone at 3x
npm run shot -- "/?chrome=screen&appearance=dark" out.png --screen       # dark
npm run shot -- "/?chrome=screen" out.png --screen --device iphone-16 \
  --eval "slack.app.getState().openConversation('C04ENGINER')" --eval "new Promise(r => setTimeout(r, 800))"
npm run shot -- "/" out.png                                               # the whole simulator page
```

Drive the app with `--eval` (`slack.app.getState()` is the store: `openConversation`, `openThread`, `push({ screen })`,
`presentSheet(name, props)`, `setTab`, `receiveMessage`…). `--clip "<css selector>"` crops to one element. Then **look
at the image** (Read it). Check both appearances every time.

## 3. Compare with Slack's snapshot

Slack's iOS snapshot tests are the reference: `Modules/**/Snapshots/iOS_26/*.png` in the iOS checkout
(`~/Desktop/Slack Mobile Code Base/slack-objc-latest`, tools/ios/paths.mjs; Git LFS objects pulled). Real-device
screenshots in `reference/device/` (local only) are the reference for production chrome and whole screens. Most are 393×852 pt at @3x (iPhone 16); component snapshots are cropped
to the component, in a 2 × 2 grid: light over dark, normal contrast on the left, high contrast on the right (June 2026
and older baselines stack light over dark). Each spec in `reference/ios/specs/` lists the PNGs for its area.

```sh
npm run compare -- "/?chrome=screen" Modules/Features/Home/Snapshots/iOS_26/<Test>/<case>@3x.png out.png
```

It writes ours | Slack's | diff and prints the share of pixels that differ. Measure with python3 + PIL when you need
a number (divide @3x pixels by 3 for points). Differences in the demo's content are fine; differences in sizes,
spacing, colors, fonts or icons are not.

Two things are Chrome's, not yours to fix per component (docs/conventions.md, "Pixels"): text baselines land on whole
CSS px, so text can sit up to 0.67 pt (usually one device pixel) below Slack's; and hairlines must be drawn with
`var(--hairline)` box-shadows, because `0.333px` heights and borders come out 1 pt thick.

## 4. Run the snapshot suite

```sh
npm run snapshots                              # every entry of reference/ios/snapshots.json: diff %, max %, pass/fail
npm run snapshots -- --only skbutton-xs,sknavtitle-title
npm run snapshots -- --css try.css             # what a stylesheet change would do, without editing src/
```

Each entry renders a kit specimen or an app route at @3x, diffs it with Slack's PNG and writes
`reference/shots/snapshots/<id>.png` (ours | Slack's | diff): look at the failures. Thresholds sit just above today's
numbers, so a failure means something moved; fix it, or if the change is deliberate and closer to Slack, say so and
lower or raise that entry's `maxDiff`. When you match a new component to a snapshot, add an entry (the format is in
docs/conventions.md, "Snapshot suite", and at the top of tools/snapshots.mjs).

## 5. Before you say it's done

- `npx tsc --noEmit -p .` and `npx vitest run` pass; `npm run snapshots` passes.
- Screenshots in light and dark, at least two devices for layout work (`iphone-17-pro`, `iphone-se`).
- Bars and menus match their Swift arrays: `rightBarButtonItems` are drawn from the trailing edge (item 0 is the
  rightmost), lone items are circles, adjacent ones share a capsule unless a fixed space splits them.
- Every value you added cites its source (spec section or Swift file:line).
