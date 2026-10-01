// Example: a busy project channel. LunaLab's #project-lunar, with a Jira app that posts ticket cards (their
// buttons update the card in place), a calendar reminder, a thread, an uploaded slide, a pin and a clean
// sidebar with a custom section. People use illustrated personas, as Slack's guide asks for screens shown
// inside Slack. Scenes make new messages arrive while you present.

import { appIcon, bk, defineApp, definePrototype, filePreview, imageFile, persona, type AppContext, type KitBlock } from '../../src/kit'

interface Ticket {
  key: string
  title: string
  priority: 'High' | 'Medium'
  assignee?: string
}

/** A Jira ticket card; `done` replaces the buttons with who handled it. */
function ticket(t: Ticket, done?: string): KitBlock[] {
  return [
    bk.section(`*<https://lunalab.atlassian.net/browse/${t.key}|${t.key}: ${t.title}>*\n${t.priority === 'High' ? ':red_circle:' : ':large_orange_circle:'} ${t.priority} priority · ${t.assignee ? `Assigned to <@${t.assignee}>` : 'Unassigned'}`, {
      block_id: `jira_${t.key}`,
      accessory: bk.imageEl(appIcon('jira'), 'Jira'),
    }),
    done
      ? bk.context(done)
      : bk.actions(`jira_actions_${t.key}`, bk.button('Assign to me', 'jira_assign', { value: t.key, style: 'primary' }), bk.button('Comment', 'jira_comment', { value: t.key }), bk.overflow('jira_more', [['Watch', `watch:${t.key}`], ['Copy link', `link:${t.key}`]])),
  ]
}

const TICKETS: Record<string, Ticket> = {
  'LUNA-212': { key: 'LUNA-212', title: 'Sample tracker loses filters on refresh', priority: 'High' },
  'LUNA-218': { key: 'LUNA-218', title: 'Export the stability report as CSV', priority: 'Medium' },
}

const jira = defineApp({
  id: 'jira',
  name: 'Jira Cloud',
  icon: appIcon('jira'),
  description: 'Jira issues in Slack',
  actions: {
    jira_assign: (ctx: AppContext) => {
      const t = TICKETS[ctx.action?.value ?? '']
      if (!t) return
      ctx.update({ text: `${t.key} assigned`, blocks: ticket({ ...t, assignee: ctx.user.id }, `:white_check_mark: Assigned to <@${ctx.user.id}> just now`) })
      ctx.toast(`${t.key} is yours`)
    },
    jira_comment: (ctx: AppContext) => {
      const key = ctx.action?.value ?? ''
      ctx.openModal({
        title: `Comment on ${key}`,
        submit: 'Comment',
        callback_id: 'jira_comment',
        private_metadata: key,
        blocks: [bk.input('Comment', bk.textInput('jira_comment_text', { multiline: true, placeholder: 'Add a comment…' }))],
      })
    },
    jira_more: (ctx: AppContext) => ctx.toast(ctx.action?.value?.startsWith('watch') ? 'You’re watching this issue' : 'Link copied'),
  },
  views: {
    jira_comment: async (ctx: AppContext) => {
      await ctx.reply(`:speech_balloon: <@${ctx.user.id}> commented on ${ctx.view?.private_metadata}: “${String(ctx.values.jira_comment_text ?? '')}”`)
      ctx.toast('Comment added')
    },
  },
})

const calendar = defineApp({ id: 'calendar', name: 'Google Calendar', icon: appIcon('google-calendar'), description: 'Meeting reminders' })

export default definePrototype({
  title: 'Project channel with Block Kit',
  description: 'LunaLab’s project channel: people talking, a Jira app posting ticket cards with working buttons, a calendar reminder, a thread and live scenes.',
  author: 'Prototyping kit',
  updated: '2026-09-23',
  tags: ['channel', 'block-kit', 'illustrated-personas', 'scenes'],

  // LunaLab is one of Slack's approved company personas; its company avatar is a lowercase l.
  workspace: { name: 'LunaLab', initials: 'l' },
  me: persona('sara-parras', { illustrated: true }),
  people: {
    lisa: persona('lisa-zhang', { illustrated: true }),
    lee: persona('lee-hao', { illustrated: true }),
    arcadio: persona('arcadio-buendia', { illustrated: true }),
    zoe: { ...persona('zoe-maxwell', { illustrated: true }), status: { emoji: 'calendar', text: 'In meetings until 2' } },
  },
  channels: {
    'project-lunar': { topic: 'Lunar launch · beta on Oct 20 · tracker: go/lunar', description: 'Everything about the Lunar sample tracker launch.', members: ['lisa', 'lee', 'arcadio', 'zoe'], starred: true },
    'product-launch': { topic: 'Launch comms and timelines', members: ['lisa', 'zoe'] },
    'help-tech': { topic: 'IT help: laptops, access, VPN', members: ['lee', 'arcadio'] },
  },
  messages: {
    '#project-lunar': [
      {
        id: 'kickoff',
        from: 'lisa',
        daysAgo: 1,
        at: '10:04',
        text: 'Kicking off *Lunar* beta week :rocket:\n• Beta opens *Oct 20*\n• Stability report every morning\n• Bugs go to Jira, questions here',
        reactions: { rocket: ['lee', 'arcadio', 'zoe', 'me'], raised_hands: ['lee'] },
        pinned: true,
        replies: [
          { from: 'lee', text: 'Engineering is ready. I’ll post the stability report at 9 every day.' },
          { from: 'zoe', text: 'Comms plan is in <#product-launch> :mega:' },
        ],
      },
      { from: 'arcadio', daysAgo: 1, at: '15:30', text: 'Here’s the deck for Friday’s review. Feedback welcome!', files: [imageFile(filePreview('slides-preview'), { name: 'Lunar beta review.png' })] },
      { from: 'jira', minutesAgo: 34, text: 'LUNA-212: Sample tracker loses filters on refresh', blocks: ticket(TICKETS['LUNA-212']) },
      { from: 'lee', minutesAgo: 30, text: 'That one’s on me, looking now. It’s the saved-view cache again :eyes:' },
      { from: 'calendar', minutesAgo: 8, text: 'Lunar standup in 10 minutes', blocks: [bk.section(':calendar: *Lunar standup* starts in 10 minutes\n10:30 – 10:45 AM · Room Apollo & Zoom'), bk.actions('cal_join', bk.button('Join Zoom', 'cal_zoom', { url: 'https://zoom.us' }))] },
      { from: 'arcadio', minutesAgo: 3, text: '<@me> can you review the beta invite list before standup? :pray:' },
    ],
    '#product-launch': [{ from: 'zoe', minutesAgo: 60, text: 'Draft launch post is ready for review :memo:' }],
    '@lee': [{ from: 'lee', minutesAgo: 25, text: 'Fix for LUNA-212 is in review. Can you check it on staging after lunch?' }],
  },
  unreads: { '#project-lunar': { count: 1, mentions: 1 }, '#product-launch': 1, '@lee': 1 },
  sidebar: { hideDemo: true, sections: [{ name: 'Launch', items: ['#product-launch', '@lee'] }] },
  apps: [jira, calendar],

  start: '#project-lunar',
  scenes: [
    { label: 'Open #project-lunar', go: '#project-lunar' },
    { label: 'Lee posts the stability report', post: { to: '#project-lunar', from: 'lee', text: 'Stability report: *99.2%* crash-free sessions yesterday, up from 97.8% :chart_with_upwards_trend:' } },
    { label: 'Jira posts a new ticket', post: { to: '#project-lunar', from: 'jira', text: 'LUNA-218: Export the stability report as CSV', blocks: ticket(TICKETS['LUNA-218']) } },
    { label: 'Lisa replies in the kickoff thread', post: { to: '#project-lunar', from: 'lisa', replyTo: 'kickoff', text: 'Beta invites go out tomorrow at 9. Great work, everyone :tada:' } },
    { label: 'Open the kickoff thread', go: { open: '#project-lunar', thread: 'kickoff' } },
    {
      label: 'Everyone reacts to the kickoff',
      run: async (kit) => {
        for (const who of ['lisa', 'lee', 'arcadio']) {
          kit.react('kickoff', 'tada', who)
          await kit.wait(500)
        }
      },
    },
  ],
})

