// ─────────────────────────────────────────────────────────────────────────────────────────────────
//  Your prototype
//
//  Open it:        http://localhost:5190/?proto=my-prototype      (run `npm run dev` first)
//  All of them:    http://localhost:5190/?kit=prototypes
//  Guide:          docs/prototyping.md (no coding background needed)
//
//  Save this file and the simulator reloads with your change. If something's wrong, the panel next to the
//  phone says what and where. Lines starting with // are notes; they don't do anything.
//  This file uses the same fields as the web kit (slack-remix), so a prototype can move between the two.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { appIcon, bk, defineApp, definePrototype, logo, persona } from '../../src/kit'

// ── An app ─────────────────────────────────────────────────────────────────────────────────────
// Apps get a DM under "Apps" with Home, Messages and About. Delete this (and `apps` below) if you don't need one.
const helper = defineApp({
  id: 'helper', //                            how messages refer to it: { from: 'helper' }, '@helper'
  name: 'Helper',
  icon: appIcon('polly'), //                  any app icon from the asset library
  description: 'Keeps the project on track',
  // The Home tab, in Block Kit (a list of blocks, top to bottom).
  home: [
    bk.header('Project Acme'),
    bk.section('Launch is *on track* for Friday. 3 of 5 tasks are done.'),
    bk.actions('home_buttons', bk.button('Say hello', 'say_hello', { style: 'primary' })),
  ],
  // What happens when someone taps a button, by its action id (the second argument of bk.button).
  actions: {
    say_hello: (ctx) => ctx.toast('Hello from Helper! 👋'),
    open_plan: (ctx) => ctx.toast('The plan would open here'),
  },
})

export default definePrototype({
  // ── 1. The gallery card ──────────────────────────────────────────────────────────────────────
  title: 'My prototype',
  description: 'What this prototype shows, in a sentence or two.',
  author: 'Your name',
  updated: '2026-09-30', //                     the date of your last change (year-month-day)

  // ── 2. The phone ─────────────────────────────────────────────────────────────────────────────
  // Optional: the device, light or dark, and a theme preset (anyone viewing can change these in the panel).
  device: 'iphone-17-pro', //                   'iphone-17-pro', 'iphone-17-pro-max', 'iphone-16' or 'iphone-se'
  // appearance: 'dark',
  // theme: 'jade',                            // 'aubergine', 'clementine', 'hoth', 'mood-indigo'… (src/theme/presets.ts)

  // ── 3. The workspace ─────────────────────────────────────────────────────────────────────────
  workspace: { name: 'Acme Inc.', icon: logo('acme') },

  // ── 4. People ────────────────────────────────────────────────────────────────────────────────
  // The key on the left ('zoe') is how you refer to someone below. persona() fills in one of Slack's approved
  // personas; `illustrated: true` is the drawn avatar Slack asks for on in-product screens.
  people: {
    zoe: persona('zoe-maxwell', { illustrated: true }),
    harry: { ...persona('harry-boone', { illustrated: true }), title: 'Design Lead' }, //   change any field
  },

  // ── 5. Channels ──────────────────────────────────────────────────────────────────────────────
  channels: {
    'project-acme': { topic: 'Launch plan and daily updates', members: ['zoe', 'harry'] },
  },

  // ── 6. Messages ──────────────────────────────────────────────────────────────────────────────
  // Grouped by where they go: '#channel', '@person' (your DM with them) or '@app'.
  // Text is Slack formatting: *bold*, _italic_, :emoji:, <@zoe> mentions someone, <#project-acme> links a channel.
  messages: {
    '#project-acme': [
      { from: 'zoe', text: 'Morning team :wave: The launch plan is ready for review.', minutesAgo: 40, reactions: { tada: ['harry', 'me'] } },
      {
        id: 'mocks',
        from: 'harry',
        text: 'Looks great <@zoe>! Final mocks are coming this afternoon.',
        replies: [{ from: 'zoe', text: 'Perfect, thank you!' }], //   a thread
      },
      {
        from: 'helper',
        text: 'Launch checklist: 3 of 5 done', //  what notifications show
        blocks: [
          bk.header('Launch checklist'),
          bk.section('*3 of 5* tasks done · due Friday', { accessory: bk.button('Open plan', 'open_plan') }),
          bk.context('Updated by Helper · just now'),
        ],
      },
    ],
    '@zoe': [{ from: 'zoe', text: 'Could you look over the plan before 3pm? :pray:' }],
  },

  // Unread badges on Home.
  unreads: { '@zoe': 1 },

  // Only your channels, DMs and apps on Home (the Northstar demo's are hidden, not deleted).
  sidebar: { hideDemo: true },

  // ── 7. Apps ──────────────────────────────────────────────────────────────────────────────────
  apps: [helper],

  // ── 8. Where it opens ────────────────────────────────────────────────────────────────────────
  // '#channel', '@person', '@app', or an object: { open: '#project-acme', thread: 'mocks' },
  // { tab: 'activity' }, { view: 'later' }, { open: '@helper', appTab: 'home' }. Leave it out to open on Home.
  start: '#project-acme',

  // ── 9. Scenes, for presenting ────────────────────────────────────────────────────────────────
  // Each scene is a button in the panel next to the phone. `post` makes a message arrive live (typing first),
  // `go` opens a screen, `run` does anything else.
  scenes: [
    { label: 'Zoe posts an update', post: { to: '#project-acme', from: 'zoe', text: 'Update: we’re on track for Friday :rocket:' } },
    { label: 'Harry replies in the thread', post: { to: '#project-acme', from: 'harry', replyTo: 'mocks', text: 'Mocks are up!' } },
    { label: 'Back to Home', go: { tab: 'home' } },
  ],
})
