import { DEMO_IDS } from '../../data/demo'
import { bk, defineApp, type AppContext, type ChatStream, type SuggestedPrompt } from '../kit'

// Beacon: a sample agent in Slack's agent messaging experience (`view: 'agent'`, the default for new agents).
// - Home / Messages / About tabs; suggested prompts sit at the top of Messages (set on threadStarted, i.e. when you
//   open Messages); every question you send becomes its own thread, which opens next to the DM
// - "Beacon is looking into it…" under the thread while it works; answers stream in with task cards (timeline mode)
// - @-mention it in any channel (try #customer-success): the loader shows under your message, the answer lands in
//   the thread
// See docs/agents.md.

const { U, C } = DEMO_IDS
const { actions, button } = bk

type Ctx = AppContext<Record<string, never>>

const PROMPTS: SuggestedPrompt[] = [
  { title: 'Summarize open escalations', message: 'Summarize the open customer escalations' },
  { title: 'Prep me for the Acme call', message: 'Prep me for tomorrow’s Acme renewal call' },
  { title: 'Which accounts are at risk?', message: 'Which accounts are at risk this quarter?' },
]

async function write(ctx: Ctx, stream: ChatStream, text: string) {
  for (const p of text.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [text]) {
    await stream.append({ markdown_text: p })
    await ctx.sleep(80)
  }
}

async function escalations(ctx: Ctx) {
  const stream = ctx.sayStream({ task_display_mode: 'timeline' })
  await stream.append({ chunks: [{ type: 'task_update', id: 'search', title: 'Searching #customer-success and support tickets', status: 'in_progress' }] })
  await ctx.sleep(1400)
  await stream.append({ chunks: [{ type: 'task_update', id: 'search', title: 'Found 3 open escalations', status: 'complete', output: 'Acme Corp, Initech and Globex', sources: [{ type: 'url', text: '#customer-success', url: `https://northstar-hq.slack.com/archives/${C.cs}` }] }] })
  await write(
    ctx,
    stream,
    [
      'There are **3 open escalations**, one of them urgent:',
      '',
      `1. **Acme Corp** :red_circle: summary timeouts came back after Tuesday’s deploy. <@${U.emily}> is on it with <@${U.marcus}>.`,
      '2. **Initech** :large_yellow_circle: wants SSO before their 450-seat rollout on Oct 20.',
      '3. **Globex** :large_green_circle: a billing question, waiting on their reply.',
    ].join('\n'),
  )
  await stream.stop({ blocks: [actions('beacon_escalation_actions', button('Ask Emily for an Acme update', 'beacon_ask_emily', { style: 'primary' })), bk.feedback('beacon_feedback')] })
}

async function acmePrep(ctx: Ctx) {
  const stream = ctx.sayStream({ task_display_mode: 'timeline' })
  await stream.append({ chunks: [{ type: 'task_update', id: 'account', title: 'Reading the Acme account history', status: 'in_progress' }] })
  await ctx.sleep(1200)
  await stream.append({ chunks: [{ type: 'task_update', id: 'account', title: 'Read the Acme account history', status: 'complete' }, { type: 'task_update', id: 'usage', title: 'Checking usage and open tickets', status: 'in_progress' }] })
  await ctx.sleep(1100)
  await stream.append({ chunks: [{ type: 'task_update', id: 'usage', title: 'Checked usage and open tickets', status: 'complete', output: 'Weekly active usage up 18% since the beta' }] })
  await write(
    ctx,
    stream,
    [
      '**Acme Corp renewal** · 3 years, 450 seats · call tomorrow at 11:00 AM',
      '',
      '| | |',
      '| --- | --- |',
      '| Health | :large_green_circle: Good (usage up 18%) |',
      '| Open tickets | 1 (summary timeouts) |',
      '| Champion | Their admin, Rosa Martin |',
      '| Ask | SSO and audit logs dates |',
      '',
      'Lead with the timeout fix, then the Q4 dates for SSO and audit logs.',
    ].join('\n'),
  )
  await stream.stop({ blocks: [bk.feedback('beacon_feedback')] })
}

async function atRisk(ctx: Ctx) {
  const stream = ctx.sayStream()
  await write(
    ctx,
    stream,
    [
      'Two accounts need attention this quarter:',
      '',
      '- **Globex**: usage down 32% since August, renewal in November',
      '- **Umbrella**: their champion left; nobody has logged in for 3 weeks',
      '',
      `Want me to draft a check-in for <@${U.noah}>, who owns both?`,
    ].join('\n'),
  )
  await stream.stop({ blocks: [bk.feedback('beacon_feedback')] })
}

async function other(ctx: Ctx) {
  const stream = ctx.sayStream()
  await write(ctx, stream, 'I know about customers, escalations and renewals. Try “Summarize open escalations” or @-mention me in #customer-success.')
  await stream.stop({ blocks: [bk.feedback('beacon_feedback')] })
}

async function answer(ctx: Ctx) {
  const q = (ctx.text ?? '').toLowerCase()
  const kind = /escalat|ticket|support/.test(q) ? 'escalations' : /acme|renewal|prep/.test(q) ? 'acme' : /risk|churn/.test(q) ? 'risk' : 'other'
  const titles = { escalations: 'Open escalations', acme: 'Acme renewal prep', risk: 'At-risk accounts', other: '' }
  if (ctx.thread) await ctx.setTitle(titles[kind] || ctx.text?.slice(0, 48) || 'Question for Beacon')
  await ctx.setStatus({ status: 'is looking into it…', loading_messages: ['Checking tickets…', 'Reading account notes…', 'Pulling it together…'] })
  await ctx.sleep(1800)
  if (kind === 'escalations') await escalations(ctx)
  else if (kind === 'acme') await acmePrep(ctx)
  else if (kind === 'risk') await atRisk(ctx)
  else await other(ctx)
}

export default defineApp({
  id: 'beacon',
  name: 'Beacon',
  icon: '/apps/beacon.svg',
  description: 'Customer answers for account teams',
  channels: [C.cs],
  about: {
    description: 'Beacon knows your customers. Ask it about:',
    features: ['Open escalations and support tickets', 'Renewal prep for any account', 'Accounts that are at risk', 'Anything in #customer-success (just @-mention it)'],
    developer: 'Northstar Customer Success',
    installedBy: U.emily,
  },

  agent: {
    view: 'agent',
    description: 'Beacon answers questions about customers, escalations and renewals.',
    suggestedPrompts: PROMPTS,
    // Agent view: runs when you open Messages; the prompts go at the top of it.
    threadStarted: async (ctx) => {
      await ctx.setSuggestedPrompts({ prompts: PROMPTS })
    },
    userMessage: answer,
    appMention: answer,
    history: [
      {
        title: 'Initech SSO timeline',
        minutesAgo: 60 * 28,
        turns: [{ user: 'When does Initech need SSO?', agent: 'Before their 450-seat rollout on *Oct 20*. SSO is on the Q4 plan for early October, so it should land in time.' }],
      },
    ],
  },

  actions: {
    beacon_feedback: async (ctx) => {
      await ctx.ephemeral(ctx.action?.value === 'positive' ? 'Thanks for the feedback! :blue_heart:' : 'Thanks, we’ll use this to make Beacon better.')
    },
    beacon_ask_emily: async (ctx) => {
      await ctx.post(C.cs, `<@${U.emily}> any update on the Acme timeouts? Asking for <@${ctx.user.id}> — sent by Beacon`)
      await ctx.say(`Asked <@${U.emily}> in #customer-success :white_check_mark:`)
    },
  },
})
