# Prototyping Slack for iPhone: a guide for designers

This kit is a working copy of Slack's iPhone app that runs in Chrome, inside a simulated iPhone. It's built from
Slack's iOS source, so it looks like the real app in light and dark mode, and what you'd tap in a demo works:
Home, DMs, Activity, conversations, threads, reactions, the composer and keyboard, sheets and menus, apps and Block
Kit. A **prototype** is one small text file that changes what's in it: the workspace, the people, the channels, the
messages and the apps, and what happens when you present.

You don't need to know how to code. Ask Claude, or copy the template, change the words and save. Prototype files
use the same fields as the web kit (slack-remix), so an idea can move between desktop and mobile.

> **Internal only.** The kit carries Slack's fonts, icons, sounds and approved personas. Use it for prototypes, demos
> and reviews inside Slack and Salesforce, not in anything published.

---

## 1. Set up (once)

You'll type a few commands in **Terminal** (Applications › Utilities › Terminal). Paste each line and press Return.

1. Get the kit: `git clone <the kit's repository>` then `cd slack-mobile-clone`. If your Mac asks to install the
   command line developer tools, click Install, then run the line again.
2. Use the right version of Node (the program that runs the kit): `nvm install` then `nvm use`. If Terminal says
   `nvm: command not found`, install Node 22 from [nodejs.org](https://nodejs.org), then open a new Terminal window.
3. Install the kit's parts (a minute the first time): `npm install`
4. Check everything is ready: `npm run doctor`. It lists anything missing and how to fix it.

## 2. Run it

```sh
npm run dev
```

Leave that window open while you work (Ctrl+C stops it). Then open these in Chrome:

| | |
|---|---|
| http://localhost:5190 | The iPhone, with the Northstar demo workspace |
| http://localhost:5190/?kit=prototypes | **Every prototype**, as cards. Click one to open it |
| http://localhost:5190/?proto=my-idea | One prototype, by its folder name |
| http://localhost:5190/?kit=assets | Personas, company logos, app icons and file images. Click one to copy it |
| http://localhost:5190/?kit=components | SlackKit, the iOS components, light and dark |
| http://localhost:5190/?kit=blocks | Block Kit as the iPhone draws it |
| http://localhost:5190/?kit=icons | Every iOS icon |

**Using the phone.** Click to tap. Drag to scroll (it keeps going when you let go, like a flick). Press and hold, or
right-click, for a long-press (message actions, Home's row menu). Drag from the left edge of a conversation to go
back. Type with your Mac keyboard; the iPhone keyboard slides up while you type. The title bar has the Home button
(⇧⌘H) and light/dark. The panel beside the phone picks the device (iPhone 17 Pro, 17 Pro Max, 16, SE), the theme,
the clock and sounds, and shows the prototype's scenes and anything wrong with it.

## 3. Make a prototype

### With Claude

Open Claude Code in the kit's folder and describe what you want, as you would to a teammate:

> Make a prototype called *expense-approvals*: Acme Inc., Zoe in finance DMs me an expense report from an app
> called Expensify with Approve and Decline buttons. Approving updates the message and Zoe says thanks. Open on
> Home, and add scenes for presenting.

Claude writes `prototypes/expense-approvals/index.ts`, opens it in the simulator and checks it. Ask for changes
the same way ("make it dark mode on an iPhone 16", "add a thread under the report", "put the app's Home tab
first"). For something Slack doesn't have yet, like a new screen or sheet, ask for it: Claude builds it from the
kit's iOS components so it looks native.

### By hand

```sh
npm run new -- expense-approvals --title "Expense approvals"
```

That copies the template to `prototypes/expense-approvals/`. Open http://localhost:5190/?proto=expense-approvals,
then open `prototypes/expense-approvals/index.ts` in a text editor
([Visual Studio Code](https://code.visualstudio.com) is free and underlines mistakes as you type). Change
something, like the channel's topic, and save: the phone reloads with your change.

### When something's wrong

- The panel beside the phone lists mistakes in plain words, like
  `messages['#project-acme'][2].from: 'zoee' isn't a person… Did you mean 'zoe'?`. The rest still works.
- A **red screen** or a **blank page** means the file can't be read at all, usually a missing comma, quote or
  bracket. The red screen names the line. Undo your last change (⌘Z) and save.
- The gallery marks any prototype with a problem.

Most mistakes are one of three: text goes in quotes (`'Hello'`), every item in a list or group ends with a comma,
and every `{`, `[` and `(` has a partner `}`, `]` and `)`.

## 4. Edit the content

Everything is in `definePrototype({ … })`. Leave out anything you don't need.

### The gallery card

```ts
title: 'Expense approvals',
description: 'Approve expense reports from a DM without leaving Slack.',
author: 'Zoe Maxwell',
updated: '2026-09-30', //       the date of your last change: year-month-day
tags: ['app', 'block-kit'], //  optional
```

The card shows `thumbnail.png` from your folder if there is one (see **Share it**), else a live preview.

### The phone

```ts
device: 'iphone-16', //  'iphone-17-pro' (default), 'iphone-17-pro-max', 'iphone-16' or 'iphone-se'
appearance: 'dark', //   or 'light' (default)
theme: 'jade', //        a Slack theme: 'aubergine', 'clementine', 'hoth', 'mood-indigo'… (the panel lists them all)
slackbotTab: true, //    iOS 26's Slackbot tab in place of More (a rollout in the real app)
```

Anyone viewing can still change these in the panel.

### The workspace, you and people

```ts
workspace: { name: 'Acme Inc.', icon: logo('acme') },
me: persona('matt-brewer'), //   who's signed in (default: the Northstar demo's Alex Morgan)
people: {
  zoe: persona('zoe-maxwell', { illustrated: true }),
  harry: { ...persona('harry-boone', { illustrated: true }), title: 'Design Lead' }, //   change one detail
  sam: { name: 'Sam Rivera', title: 'Office Manager', presence: 'away', status: { emoji: 'palm_tree', text: 'Out until Monday' } },
},
```

The word on the left (`zoe`) is how you refer to that person everywhere else. `persona()` fills in one of Slack's
approved personas (browse them at `/?kit=assets`). Slack's persona guide asks for **illustrated personas on screens
shown inside Slack**, so nobody mistakes a persona for a real teammate; photos are for marketing-style screens.
The Northstar demo's people are there too, by first name: `priya`, `marcus`, `sofia`, `daniel`, `emily`, `james`,
`hannah`, `luis`, `aisha`, `tom`, `grace`, `noah`.

### Channels and messages

```ts
channels: {
  'project-acme': { topic: 'Launch plan and daily updates', members: ['zoe', 'harry'], starred: true },
  'help-tech': { private: true },
},
messages: {
  '#project-acme': [
    { from: 'zoe', text: 'Morning team :wave: The plan is *ready* for review.', minutesAgo: 40 },
    { from: 'harry', text: 'Looks great <@zoe>! Details in <#help-tech>.', reactions: { tada: ['zoe', 'me'] } },
    { id: 'kickoff', from: 'zoe', text: 'Kickoff notes', daysAgo: 1, at: '09:30', pinned: true, replies: [{ from: 'harry', text: 'Thanks!' }] },
  ],
  '@zoe': [{ from: 'zoe', text: 'Can you look before 3pm? :pray:' }],
},
unreads: { '@zoe': 1, '#project-acme': { count: 2, mentions: 1 } },
sidebar: { hideDemo: true, sections: [{ name: 'Launch', items: ['#project-acme', '@zoe'] }] },
```

- Messages are grouped by where they go: `'#channel'`, `'@person'` (your DM with them) or `'@app'`.
- `from` is a person, `'me'`, one of your apps, or a Northstar teammate.
- Text is Slack formatting: `*bold*`, `_italic_`, `~strike~`, `` `code` ``, `:emoji_name:`, `\n` for a new line,
  `<@zoe>` mentions someone, `<#project-acme>` links a channel, `<https://example.com|a link>`.
- **When:** `minutesAgo: 30`, or `daysAgo: 1, at: '09:30'`. Messages without a time are a few minutes apart, ending
  just now. `replies` makes a thread; `id` names a message so `start` and scenes can open its thread.
- `unreads` puts badges on Home (a DM's number is also a mention). `sidebar.hideDemo` shows only your
  conversations on Home; `sections` adds custom sections.

### Block Kit and apps

An app gets a bot user with an APP badge, a DM under **Agents & apps** with Home, Messages and About tabs, and it
can react to buttons, open modals, answer slash commands and reply to messages:

```ts
const helper = defineApp({
  id: 'helper',
  name: 'Helper',
  icon: appIcon('polly'),
  home: [bk.header('Welcome to Helper'), bk.actions('home', bk.button('Say hello', 'say_hello', { style: 'primary' }))],
  actions: {
    say_hello: (ctx) => ctx.toast('Hello! 👋'),
    approve: (ctx) => ctx.update({ text: 'Approved', blocks: [bk.section(':white_check_mark: Approved by you')] }),
  },
})
// …then apps: [helper], and messages from: 'helper' or in '@helper'
```

Messages can carry `blocks: [bk.header(…), bk.section(…), bk.actions(…)]` (their `text` is what notifications
show). `/?kit=blocks` shows every block the iPhone app draws, with what to write for each.

### Where it opens

```ts
start: '#project-acme',                              // a channel
start: '@zoe',                                       // a DM
start: { open: '@helper', appTab: 'home' },          // an app's Home tab
start: { open: '#project-acme', thread: 'kickoff' }, // a thread
start: { tab: 'activity' },                          // a tab: 'home', 'dms', 'activity', 'search', 'more'
start: { view: 'later' },                            // or threads, drafts, huddles, files, slackbot, you…
start: { open: '#project-acme', sheet: 'message-actions', sheetProps: { … } }, // with a sheet open
```

### Scenes, for presenting

Every scene is a button in the panel beside the phone. A scene can go somewhere, make messages arrive live (the
typing indicator first, then the message lands with badges; if you're somewhere else, an iPhone notification
banner drops in with Slack's sound), or both:

```ts
scenes: [
  { label: 'Zoe posts an update', post: { to: '#project-acme', from: 'zoe', text: 'We’re on track :rocket:' } },
  { label: 'Helper’s Home tab', go: { open: '@helper', appTab: 'home' } },
  { label: 'Harry replies in the thread', post: { to: '#project-acme', from: 'harry', replyTo: 'kickoff', text: 'Done!' } },
  { label: 'Everyone reacts', run: async (kit) => { kit.react('kickoff', 'tada', 'zoe'); await kit.wait(500); kit.react('kickoff', 'tada', 'harry') } },
],
```

Press the phone's Home button (⇧⌘H) before a scene to show the notification on the Home Screen; tap the banner to
open the conversation.

### New screens and sheets

For something Slack doesn't have yet, a prototype can add its own screens and sheets, built from the kit's iOS
components (`/?kit=components`) so they look native. Name the file `index.tsx` instead of `index.ts`:

```tsx
import { definePrototype, KitScreen, SKEntityRow, SKListHeader, useApp } from '../../src/kit'

function Approvals() {
  const approve = () => useApp.getState().showToast('Approved')
  return (
    <KitScreen title="Approvals">
      <SKListHeader title="Waiting on you" />
      <SKEntityRow title="Travel to Denver · $412.50" onClick={approve} />
    </KitScreen>
  )
}

export default definePrototype({
  // …
  screens: { approvals: Approvals },
  start: { screen: 'approvals' },
})
```

`KitScreen` gives a screen the iOS 26 navigation bar and a scrolling body clear of the tab bar. Claude knows the components and can build these for you from a sketch or a Figma link.

### Anything else

`extend: (fx, kit) => { … }` runs last and can change the workspace data directly (the types are in
`src/data/types.ts`). You'll rarely need it.

## 5. Share it

- **A thumbnail for the gallery card**, with the app running:

  ```sh
  npm run shot -- "/?proto=expense-approvals&chrome=screen&clock=9:41" prototypes/expense-approvals/thumbnail.png --screen --scale 1
  ```

- **Present it**, offline: `npm run demo`, then open http://localhost:4190/?proto=expense-approvals. Before a demo,
  run `npm run selftest -- --proto expense-approvals`: it opens every screen and reports anything broken.
- **Share a link.** Once the kit is published (`docs/publishing.md`), every prototype in it is at
  `<the kit's address>/?proto=<name>`. Add `&chrome=device` for just the phone, or `&chrome=screen` for the screen
  alone (good in a slide or an iframe), `&device=iphone-16` and `&appearance=dark` to pick the phone.
- **Add it to the kit** so everyone sees it in the gallery: run `npm run check` (it type-checks, tests every
  prototype and builds), then commit your `prototypes/<name>/` folder and open a pull request.

## 6. Troubleshooting

| What you see | What to do |
|---|---|
| `npm run dev` says Node is too old | `nvm use` (or install Node 22), then try again. `npm run doctor` checks everything |
| The page is blank or red | A typo in `index.ts` (usually a comma, quote or bracket). The red screen names the line; undo and save |
| The panel lists "things to fix" | Each line says which field and why, often with a "did you mean". Fix and save |
| "there's no prototype called …" | The folder name in `?proto=` doesn't match a folder in `prototypes/` |
| My change doesn't show | Check you saved and that `npm run dev` is still running; reload the page |
| No sound on notifications | Click the page once first (browsers block sound until you do); check Sounds in the panel |
| A person shows as a letter or a stranger | Check the key: `from: 'zoe'` needs `zoe` in `people` (or a Northstar first name) |

## Quick reference

```ts
definePrototype({
  title, description, author, updated, tags?, thumbnail?,
  device?, appearance?, theme?, slackbotTab?,
  workspace?: { name?, icon?, initials?, domain?, plan? },
  me?: { name?, title?, avatar?, presence?, status?, … },
  people?: { key: { name, title?, avatar?, presence?, status?, pronouns?, timezone?, email?, role? } },
  channels?: { name: { topic?, description?, private?, members?, starred?, created?, createdBy? } },
  messages?: { '#channel' | '@person' | '@app': [{ from, text?, blocks?, minutesAgo? | daysAgo + at?, reactions?, replies?, files?, attachments?, edited?, pinned?, id? }] },
  unreads?: { target: number | { count, mentions? } },
  sidebar?: { hideDemo?, sections?: [{ name, items: [targets] }], salesforce?: true | [targets] },
  apps?: [defineApp({ … })],
  screens?: { name: Component }, sheets?: { name: Component | { component, presentation? } },
  start?: target | { open?, tab?, appTab?, thread?, profile?, view?, screen?, props?, sheet?, sheetProps? },
  scenes?: [{ label, go?, post?: { to, from, text?, blocks?, typingMs?, replyTo? }, run?: (kit) => … }],
  extend?: (fx, kit) => { … },
})
```

For developers: the model is `src/kit/prototype.ts` (types and checks), `src/kit/apply.ts` (how a prototype becomes
workspace data), `src/kit/registry.ts` (discovery), `src/kit/boot.ts` (loading at `?proto=`, scenes, the panel)
and `src/kit/pages/` (the galleries). `npm test` runs `src/kit/prototypes.test.ts`, which loads and checks every
prototype.
