---
name: new-prototype
description: Create or edit a Slack for iPhone prototype in this kit — scaffold it, fill in the workspace, people, channels, messages, Block Kit, apps, the device and theme, new screens built from SlackKit, the start screen and presenter scenes, and verify it on the simulated iPhone. Use when someone wants to prototype, mock up or demo a Slack mobile feature, app, message or flow ("prototype a…", "make a demo of…", "show what X would look like on iOS").
---

# Make a Slack for iPhone prototype

A prototype is plain data layered on the real app: `prototypes/<slug>/index.ts` (or `index.tsx` when it adds its
own screens) exports `definePrototype({ … })`. It opens at `http://localhost:5190/?proto=<slug>` inside the
simulated iPhone; the gallery is `/?kit=prototypes`. The designer's guide is `docs/prototyping.md` (its "Quick
reference" lists every field). The fields are the web kit's (slack-remix), plus `device`, `appearance`, `theme`,
`screens` and `sheets`, so a prototype also runs on desktop.

## Steps

1. **Scaffold.** `npm run new -- <slug> --title "…"` copies the commented template. `--from <example>` starts from
   `pipeline-app-home` (an App Home), `account-insights-dm` (a conversation with an app), `project-channel` (a
   channel with Block Kit), `salesforce-section` or `launch-day` (live scenes on the Northstar demo).
2. **Fill it in** with only what `definePrototype` supports: `workspace`, `me`, `people`, `channels`, `messages`
   (with `blocks`, `replies`, `reactions`, `files`), `unreads`, `sidebar` (Home's sections), `apps`, `device`,
   `appearance`, `theme`, `screens`, `sheets`, `start`, `scenes`. `extend` only when nothing else fits.
   - **People:** personas from `/?kit=assets` (`src/data/personas.ts`); illustrated ones for in-product screens.
   - **Block Kit:** only real blocks and fields (check `reference/ios/specs/blockkit.md` for how iOS draws them, and
     what it doesn't support, e.g. section fields are one column and overflow is a "More" button). Preview at
     `/?kit=blocks`.
   - **Apps:** `defineApp({ … })` in `apps` (App Kit, shared with the web kit): buttons, modals, slash commands,
     Home tab, replies in the app DM.
   - **A screen Slack doesn't have yet:** add it to `screens` in `index.tsx`, built from `KitScreen` (the iOS 26
     navigation bar and a scroll body) and SlackKit components (`src/slackkit/`, gallery `/?kit=components`),
     styled only with the iOS tokens (`var(--dt_color_*)`, `var(--sk-*)` fonts: `docs/conventions.md`). Open it with
     `start: { screen: 'name' }` or `useApp.getState().push({ screen: 'name' })`. Don't edit `src/` for one prototype.
3. **Check it.**
   - Problems show in the panel beside the phone and on the gallery card; `npx vitest run src/kit` loads and checks
     every prototype.
   - `npm run selftest -- --proto <slug>` (outside the sandbox) opens every screen inside it.
   - Screenshot and look, light and dark:
     `npm run shot -- "/?proto=<slug>&chrome=screen" out.png --screen`, then with `&appearance=dark`. Drive it first
     with `--eval "slack.app.getState().openConversation(…)"` to check the screens the scenes reach.
   - Gallery card: `npm run shot -- "/?proto=<slug>&chrome=screen" prototypes/<slug>/thumbnail.png --screen --scale 1`.
4. **Present or share it.** `scenes` are buttons in the panel; posts arrive live with typing, badges and an iOS
   notification banner when you're elsewhere. `npm run demo` serves an offline build; `docs/publishing.md` covers
   internal hosting.

## Rules

- Additive only: a prototype never changes the Northstar demo or other prototypes.
- Slack's copy style: sentence case, Slack's own strings where the app has them (the specs quote them).
- Internal only: prototypes can hold unreleased ideas. Share them inside Slack and Salesforce, never publicly.
