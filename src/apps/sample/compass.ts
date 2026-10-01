import { DEMO_IDS } from '../../data/demo'
import { bk, clockTime, defineApp, shortDate, type AnyBlock, type AppContext, type ChatStream, type ModalDefinition, type SuggestedPrompt } from '../kit'

// Compass: a sample agent built with the App Kit, showing everything Slack gives agents. Open it from the top bar
// (the compass next to Help), from its DM under Agents & apps, or @-mention it in a channel.
// - Chat / History / About tabs (the assistant view) and the split view next to whatever you're looking at
// - suggested prompts when a conversation starts, and follow-up prompts after each answer
// - "Compass is thinking…" with rotating loading messages while it works
// - answers streamed token by token: a plan (task_display_mode: 'plan'), task cards ('timeline'), markdown with
//   headings, lists and a table, then Block Kit buttons and 👍 / 👎 feedback buttons
// - follow-up modals: "Create launch brief" (inputs, date picker, selects) and "Tell us more" on 👎 feedback
// - conversation titles (History), thread context (the channel you were in), and past conversations
// Everything here is plain data + handlers; see docs/agents.md.

const { U, C } = DEMO_IDS
const { md, section, fields, context, actions, button, header, divider, input, textInput, datepicker, multiSelect, channelsSelect, checkboxes } = bk

interface State {
  feedback: { good: number; bad: number }
  briefs: number
}

type Ctx = AppContext<State>

const PROMPTS: SuggestedPrompt[] = [
  { title: 'Plan the Atlas launch week', message: 'Plan the Atlas launch week: what happens each day, and who owns it?' },
  { title: 'Summarize #launch-atlas', message: 'Summarize #launch-atlas for me' },
  { title: 'What’s blocking the launch?', message: 'What’s blocking the Atlas launch right now?' },
  { title: 'Draft the launch announcement', message: 'Draft the Atlas launch announcement for #announcements' },
]

const LOADING = {
  plan: ['Reading #launch-atlas…', 'Checking the launch checklist…', 'Lining up owners and dates…'],
  summary: ['Reading the latest messages…', 'Picking out decisions…', 'Writing it up…'],
  blockers: ['Checking the launch checklist…', 'Looking for open questions…', 'Ranking what’s at risk…'],
  draft: ['Reading the positioning doc…', 'Drafting in your voice…', 'Tightening the copy…'],
  other: ['Searching Northstar…', 'Thinking it through…'],
}

type Intent = keyof typeof LOADING

function intentOf(text: string): Intent {
  const q = text.toLowerCase().replace(/’/g, "'")
  if (/\b(draft|write|announc|shorter|rewrite)/.test(q)) return 'draft'
  if (/\b(block|risk|stuck|behind|open item|nudge)/.test(q)) return 'blockers'
  if (/\b(summar|catch me up|recap|tl;?dr|what's happening|what happened|waiting on my reply)/.test(q)) return 'summary'
  if (/\b(plan|schedule|week|timeline|who owns)/.test(q)) return 'plan'
  return 'other'
}

const TITLES: Record<Intent, string> = {
  plan: 'Atlas launch week plan',
  summary: '#launch-atlas summary',
  blockers: 'What’s blocking Atlas',
  draft: 'Atlas launch announcement',
  other: '',
}

const FOLLOW_UPS: Record<Intent, SuggestedPrompt[]> = {
  plan: [
    { title: 'What’s blocking the launch?', message: 'What’s blocking the Atlas launch right now?' },
    { title: 'Draft the announcement', message: 'Draft the Atlas launch announcement for #announcements' },
  ],
  summary: [
    { title: 'Plan the launch week', message: 'Plan the Atlas launch week: what happens each day, and who owns it?' },
    { title: 'What needs my reply?', message: 'What in #launch-atlas is waiting on my reply?' },
  ],
  blockers: [
    { title: 'Nudge the owners', message: 'Draft a nudge to the owners of the open launch items' },
    { title: 'Plan the launch week', message: 'Plan the Atlas launch week: what happens each day, and who owns it?' },
  ],
  draft: [
    { title: 'Make it shorter', message: 'Make the announcement shorter' },
    { title: 'Summarize #launch-atlas', message: 'Summarize #launch-atlas for me' },
  ],
  other: PROMPTS.slice(0, 2),
}

/** The feedback row every answer ends with (context_actions › feedback_buttons). */
const feedback = () => bk.feedback('compass_feedback')

const firstName = (ctx: Ctx) => ctx.user.realName.split(' ')[0]

/** Appends text a sentence at a time, like a model producing tokens (the reveal runs at Slack's streaming speed). */
async function write(ctx: Ctx, stream: ChatStream, text: string) {
  const parts = text.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [text]
  for (const p of parts) {
    await stream.append({ markdown_text: p })
    await ctx.sleep(90)
  }
}

// ------------------------------------------------------------------------------------------------
// Answers

async function answerPlan(ctx: Ctx) {
  const stream = ctx.sayStream({ task_display_mode: 'plan' })
  await stream.append({ chunks: [{ type: 'plan_update', title: 'Planning the Atlas launch week' }, { type: 'task_update', id: 'read', title: 'Read #launch-atlas and the launch checklist', status: 'in_progress' }] })
  await ctx.sleep(1400)
  await stream.append({
    chunks: [
      { type: 'task_update', id: 'read', title: 'Read #launch-atlas and the launch checklist', status: 'complete', output: '38 messages and 8 checklist items since the kickoff' },
      { type: 'task_update', id: 'owners', title: 'Check owners and due dates', status: 'in_progress' },
    ],
  })
  await ctx.sleep(1300)
  await stream.append({
    chunks: [
      { type: 'task_update', id: 'owners', title: 'Check owners and due dates', status: 'complete', output: 'Every item has an owner; pricing page copy has no date yet', sources: [{ type: 'url', text: 'Launch checklist', url: 'https://northstar-hq.slack.com/archives/C04LAUNCHQ' }] },
      { type: 'task_update', id: 'plan', title: 'Draft the day-by-day plan', status: 'in_progress' },
    ],
  })
  await ctx.sleep(1100)
  await stream.append({ chunks: [{ type: 'task_update', id: 'plan', title: 'Draft the day-by-day plan', status: 'complete' }] })
  await write(
    ctx,
    stream,
    [
      `Here’s a plan for launch week, ${firstName(ctx)}. Atlas ships on **Tuesday, Oct 14**.`,
      '',
      '### Launch week',
      '- **Mon, Oct 13**: code freeze at noon (<@' + U.marcus + '>), final demo run-through at 3 PM (<@' + U.daniel + '>)',
      '- **Tue, Oct 14**: flip the feature flag at 9 AM (<@' + U.priya + '>), announcement and blog go live at 10 AM (<@' + U.hannah + '>)',
      '- **Wed, Oct 15**: customer webinar and office hours (<@' + U.emily + '>)',
      '- **Thu, Oct 16**: first metrics review, adoption and summary quality (<@' + U.alex + '>)',
      '- **Fri, Oct 17**: retro and the v1.1 backlog (everyone)',
      '',
      '### Watch out for',
      '1. **Pricing page copy** hasn’t started and blocks the announcement. <@' + U.hannah + '> is out until Monday, so it needs a new owner this week.',
      '2. **Demo environment** is due Oct 7 so sales can rehearse on Oct 9.',
    ].join('\n'),
  )
  await stream.stop({
    blocks: [actions('compass_plan_actions', button('Create launch brief', 'compass_brief', { style: 'primary', value: 'plan' }), button('Share plan to #launch-atlas', 'compass_share_plan')), feedback()],
  })
}

async function answerSummary(ctx: Ctx, channelName = 'launch-atlas') {
  const stream = ctx.sayStream({ task_display_mode: 'timeline' })
  await stream.append({ chunks: [{ type: 'task_update', id: 'read', title: `Reading #${channelName}`, status: 'in_progress' }] })
  await ctx.sleep(1300)
  await stream.append({ chunks: [{ type: 'task_update', id: 'read', title: `Read #${channelName}`, status: 'complete', details: 'Messages from the last 7 days', output: '38 messages from 9 people' }] })
  await write(ctx, stream, `**#${channelName} this week**: the launch is on track for **Oct 14**, with two open items.\n\n`)
  await stream.append({ chunks: [{ type: 'task_update', id: 'decisions', title: 'Picking out decisions and open questions', status: 'in_progress' }] })
  await ctx.sleep(1200)
  await stream.append({ chunks: [{ type: 'task_update', id: 'decisions', title: 'Found 3 decisions and 2 open questions', status: 'complete', sources: [{ type: 'url', text: `#${channelName}`, url: `https://northstar-hq.slack.com/archives/${C.launch}` }] }] })
  await write(
    ctx,
    stream,
    [
      '**Decided**',
      `- Load testing and the security review are done :white_check_mark: (<@${U.priya}>, <@${U.marcus}>)`,
      `- Positioning is locked: _“Atlas turns every conversation into answers.”_ (<@${U.hannah}>)`,
      '- Sharing summaries outside Slack moves to v1.1',
      '',
      '**Still open**',
      '- Pricing page copy has no owner while Hannah is out',
      `- <@${U.daniel}> needs the demo environment by Oct 7 for sales enablement`,
    ].join('\n'),
  )
  await stream.stop({ blocks: [feedback()] })
}

async function answerBlockers(ctx: Ctx) {
  const stream = ctx.sayStream()
  await write(
    ctx,
    stream,
    [
      'Two things could slip the launch. Everything else on the checklist is done or on schedule.',
      '',
      '| Item | Owner | Due | Status |',
      '| --- | --- | --- | --- |',
      '| Pricing page copy | Unassigned | Oct 10 | :red_circle: Not started |',
      '| Demo environment | Alex Morgan | Oct 7 | :large_yellow_circle: In progress |',
      '| Docs | Luis Fernandez | Oct 9 | :large_green_circle: 80% |',
      '| Launch blog post | Hannah Schmidt | Oct 13 | :large_green_circle: In review |',
      '',
      `Want me to find an owner for the pricing copy? <@${U.sofia}> wrote the last pricing page and has time next week.`,
    ].join('\n'),
  )
  await stream.stop({ blocks: [actions('compass_blocker_actions', button('Ask Sofia to own it', 'compass_ask_sofia', { style: 'primary' }), button('Create launch brief', 'compass_brief', { value: 'blockers' })), feedback()] })
}

const ANNOUNCEMENT = 'Atlas is here :rocket: Starting today, every Northstar workspace can turn long threads, meetings and docs into answers in seconds. Ask Atlas what you missed, what was decided, or what to do next — right where you work. Huge thanks to everyone in #launch-atlas who made this happen.'

async function answerDraft(ctx: Ctx, shorter = false) {
  const stream = ctx.sayStream()
  const body = shorter ? 'Atlas is here :rocket: Turn any thread, meeting or doc into answers in seconds, right in Slack. Thank you, #launch-atlas!' : ANNOUNCEMENT
  await write(ctx, stream, `${shorter ? 'Here’s a tighter version' : 'Here’s a draft for #announcements'}:\n\n> ${body}\n\nI kept it to what customers get on day one; the pricing details can go in the thread.`)
  await stream.stop({
    blocks: [actions('compass_draft_actions', button('Post to #announcements', 'compass_post_draft', { style: 'primary', value: shorter ? 'short' : 'long' }), button('Edit draft', 'compass_edit_draft', { value: shorter ? 'short' : 'long' })), feedback()],
  })
}

async function answerNudge(ctx: Ctx) {
  const stream = ctx.sayStream()
  const body = `Quick check on the last Atlas launch items :pray: <@${U.sofia}>, could you pick up the pricing page copy by Oct 10? I’ll have the demo environment ready by Oct 7. Shout if anything’s in the way!`
  await write(ctx, stream, `Here’s a nudge for #launch-atlas:\n\n> ${body}`)
  await stream.stop({ blocks: [actions('compass_nudge_actions', button('Send to #launch-atlas', 'compass_send_nudge', { style: 'primary' })), feedback()] })
}

async function answerOther(ctx: Ctx) {
  const stream = ctx.sayStream()
  await write(
    ctx,
    stream,
    [
      `I can help with that, ${firstName(ctx)}. Here’s what I’m best at in Northstar:`,
      '',
      '- **Plans**: “Plan the Atlas launch week”',
      '- **Summaries**: “Summarize #launch-atlas” (or @-mention me in any channel)',
      '- **Risks**: “What’s blocking the launch?”',
      '- **Drafts**: “Draft the launch announcement”',
    ].join('\n'),
  )
  await stream.stop({ blocks: [feedback()] })
}

/** A conversation turn: title, status with loading messages, then the streamed answer and follow-up prompts. */
async function answer(ctx: Ctx) {
  const text = ctx.text ?? ctx.message?.text ?? ''
  const intent = intentOf(text)
  // Title the conversation after its question (History and the reply bar show it).
  if (ctx.thread) await ctx.setTitle(TITLES[intent] || (text.length > 48 ? `${text.slice(0, 47)}…` : text))
  await ctx.setStatus({ status: 'is thinking…', loading_messages: LOADING[intent] })
  await ctx.sleep(intent === 'other' ? 1200 : 2000)
  if (intent === 'plan') await answerPlan(ctx)
  else if (intent === 'summary') {
    const context = await ctx.getThreadContext()
    const inChannel = ctx.trigger === 'app_mention' ? ctx.channel : context.channel_id ? ctx.channelRef(context.channel_id) : undefined
    await answerSummary(ctx, inChannel?.isChannel && !/launch-atlas/.test(text) && !/#/.test(text) ? inChannel.name : 'launch-atlas')
  } else if (intent === 'blockers') await answerBlockers(ctx)
  else if (intent === 'draft' && /nudge/i.test(text)) await answerNudge(ctx)
  else if (intent === 'draft') await answerDraft(ctx, /shorter|short|tighter/.test(text.toLowerCase()))
  else await answerOther(ctx)
  if (ctx.trigger !== 'app_mention') await ctx.setSuggestedPrompts({ title: 'Try next:', prompts: FOLLOW_UPS[intent] })
}

// ------------------------------------------------------------------------------------------------
// Modals

function briefModal(ctx: Ctx, from: string): ModalDefinition {
  return {
    title: 'Launch brief',
    submit: 'Create brief',
    close: 'Cancel',
    callback_id: 'compass_brief',
    private_metadata: JSON.stringify({ from, thread: ctx.thread }),
    blocks: [
      section(':compass: Compass filled this in from #launch-atlas. Check it over, then I’ll post the brief in this conversation.'),
      input('Launch', textInput('brief_name', { initial: 'Atlas' }), { block_id: 'brief_name_block' }),
      input('Launch date', datepicker('brief_date', launchDate()), { block_id: 'brief_date_block' }),
      input(
        'Audience',
        multiSelect(
          'brief_audience',
          'Choose audiences',
          [
            ['Customers', 'customers'],
            ['Sales', 'sales'],
            ['Support', 'support'],
            ['Everyone at Northstar', 'company'],
          ],
          ['customers', 'sales'],
        ),
        { block_id: 'brief_audience_block' },
      ),
      input('Key message', textInput('brief_message', { multiline: true, initial: 'Atlas turns every conversation into answers.' }), { block_id: 'brief_message_block' }),
      input('Share in', channelsSelect('brief_channel', 'Pick a channel', C.launch), { block_id: 'brief_channel_block', optional: true }),
    ],
  }
}

function feedbackModal(ctx: Ctx): ModalDefinition {
  return {
    title: 'Help Compass improve',
    submit: 'Send',
    close: 'Cancel',
    callback_id: 'compass_feedback_details',
    private_metadata: JSON.stringify({ thread: ctx.thread }),
    blocks: [
      section('Thanks for letting us know. What was wrong with this answer?'),
      input(
        'What happened',
        checkboxes('feedback_reasons', [
          ['It wasn’t accurate', 'inaccurate'],
          ['It missed something important', 'incomplete'],
          ['It was too long', 'long'],
          ['Something else', 'other'],
        ]),
        { block_id: 'feedback_reasons_block' },
      ),
      input('Anything else? (optional)', textInput('feedback_comment', { multiline: true, placeholder: 'Tell us what a good answer looks like' }), { block_id: 'feedback_comment_block', optional: true }),
      context('Your feedback goes to the Northstar Platform team, with this conversation.'),
    ],
  }
}

function draftModal(text: string): ModalDefinition {
  return {
    title: 'Edit announcement',
    submit: 'Post',
    close: 'Cancel',
    callback_id: 'compass_post_draft',
    blocks: [input('Announcement', textInput('draft_text', { multiline: true, initial: text }), { block_id: 'draft_text_block' }), context('Posts to #announcements as you.')],
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
function launchDate() {
  const now = new Date()
  const d = new Date(now.getFullYear(), 9, 14)
  const t = now <= d ? d : new Date(now.getFullYear() + 1, 9, 14)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

// ------------------------------------------------------------------------------------------------

export default defineApp<State>({
  id: 'compass',
  name: 'Compass',
  icon: '/apps/compass.svg',
  description: 'Plans, summaries and drafts for your launches',
  // It posts in these (the "Ask Sofia" and nudge buttons, "Post to #announcements").
  channels: [C.launch, C.announcements],
  about: {
    description: 'Compass is Northstar’s launch agent. It reads the channels you’re in and helps you:',
    features: ['Plan launch weeks with owners and dates', 'Summarize any channel (just @-mention it)', 'Find what’s blocking a launch', 'Draft announcements in your voice'],
    developer: 'Northstar Platform team',
    installedBy: U.priya,
    homepage: 'https://compass.northstar-hq.com',
  },
  state: { feedback: { good: 0, bad: 0 }, briefs: 0 },

  agent: {
    view: 'assistant',
    description: 'Compass plans launches, summarizes channels and drafts updates, using what’s in the channels you’re in.',
    suggestedPrompts: PROMPTS,

    // assistant_thread_started: greet, offer prompts, remember where the user was.
    threadStarted: async (ctx) => {
      await ctx.say(`Hi ${firstName(ctx)} :wave: I’m Compass. I can plan launches, summarize channels and draft updates. What are you working on?`)
      await ctx.setSuggestedPrompts({ prompts: PROMPTS })
      await ctx.saveThreadContext()
    },
    threadContextChanged: async (ctx) => {
      await ctx.saveThreadContext()
    },
    userMessage: answer,
    appMention: answer,

    history: [
      {
        title: 'Pricing page copy options',
        minutesAgo: 60 * 20,
        turns: [
          {
            user: 'Give me three headline options for the Atlas pricing page',
            agent: {
              text: 'Three headline options for the pricing page',
              blocks: [
                bk.markdown('Here are three directions for the pricing page headline:\n\n1. **Answers for every team, at every size.**\n2. **Turn conversations into answers — start free.**\n3. **One price. Every thread, meeting and doc.**\n\nOption 2 tested best with the beta group (it names the outcome and the free tier).'),
                feedback(),
              ],
            },
          },
        ],
      },
      {
        title: 'Prep for the Acme renewal call',
        minutesAgo: 60 * 26,
        turns: [
          {
            user: 'Help me prep for the Acme renewal call tomorrow',
            agent: {
              text: 'Acme renewal prep',
              blocks: [
                bk.markdown(`**Acme Corp renewal** · 3-year, 450 seats\n\n- They escalated summary timeouts last week; <@${U.emily}> fixed it within the hour\n- Their admin asked about SSO and audit logs, both on the Q4 plan\n- Weekly active usage is up **18%** since the beta\n\nLead with the timeout fix and the audit log date.`),
                feedback(),
              ],
            },
          },
        ],
      },
      {
        title: 'Q3 launch retro themes',
        minutesAgo: 60 * 50,
        turns: [
          {
            user: 'What came up most in the Q3 launch retro?',
            agent: 'The retro kept coming back to three themes: *late copy reviews*, *demo environments that broke the week of launch*, and *not enough time for sales enablement*. All three have an owner on the Atlas checklist.',
          },
        ],
      },
    ],
  },

  actions: {
    // feedback_buttons: value 'positive' or 'negative'
    compass_feedback: async (ctx) => {
      const good = ctx.action?.value === 'positive'
      ctx.setState((s) => ({ feedback: { good: s.feedback.good + (good ? 1 : 0), bad: s.feedback.bad + (good ? 0 : 1) } }))
      if (good) await ctx.ephemeral('Thanks! Glad that helped :sparkles:')
      else ctx.openModal(feedbackModal(ctx))
    },
    compass_brief: (ctx) => void ctx.openModal(briefModal(ctx, ctx.action?.value ?? 'plan')),
    compass_share_plan: async (ctx) => {
      await ctx.post(C.launch, {
        text: 'Atlas launch week plan',
        blocks: [
          header('Atlas launch week'),
          section(`Shared by <@${ctx.user.id}> with Compass`),
          fields(['*Mon, Oct 13*\nCode freeze · demo run-through', '*Tue, Oct 14*\nFeature flag · announcement', '*Wed, Oct 15*\nCustomer webinar', '*Thu, Oct 16*\nFirst metrics review']),
          context('Compass · from the Atlas launch checklist'),
        ],
      })
      ctx.toast('Shared to #launch-atlas')
    },
    compass_ask_sofia: async (ctx) => {
      await ctx.say(`Done: I asked <@${U.sofia}> in #launch-atlas whether she can own the pricing page copy. I’ll let you know when she replies.`)
      await ctx.post(C.launch, `<@${U.sofia}> could you own the pricing page copy for Atlas? Hannah is out until Monday and it’s the last open item. — sent by Compass for <@${ctx.user.id}>`)
    },
    compass_send_nudge: async (ctx) => {
      await ctx.post(C.launch, `Quick check on the last Atlas launch items :pray: <@${U.sofia}>, could you pick up the pricing page copy by Oct 10? I’ll have the demo environment ready by Oct 7. — sent by Compass for <@${ctx.user.id}>`)
      await ctx.say('Sent to #launch-atlas :white_check_mark:')
    },
    compass_post_draft: async (ctx) => {
      const text = ctx.action?.value === 'short' ? 'Atlas is here :rocket: Turn any thread, meeting or doc into answers in seconds, right in Slack. Thank you, #launch-atlas!' : ANNOUNCEMENT
      await ctx.post(C.announcements, { text, blocks: [section(text)] })
      await ctx.say('Posted to #announcements :tada:')
    },
    compass_edit_draft: (ctx) => void ctx.openModal(draftModal(ctx.action?.value === 'short' ? 'Atlas is here :rocket: Turn any thread, meeting or doc into answers in seconds, right in Slack. Thank you, #launch-atlas!' : ANNOUNCEMENT)),
  },

  views: {
    compass_brief: async (ctx) => {
      const name = String(ctx.values.brief_name ?? 'Atlas').trim() || 'Atlas'
      const date = (ctx.values.brief_date as string | null) ?? launchDate()
      const audience = (ctx.values.brief_audience as string[] | null) ?? []
      const message = String(ctx.values.brief_message ?? '').trim()
      const channel = (ctx.values.brief_channel as string | null) ?? undefined
      const meta = JSON.parse(ctx.view?.private_metadata || '{}') as { thread?: { channel: string; ts: string } }
      ctx.setState((s) => ({ briefs: s.briefs + 1 }))
      const LABEL: Record<string, string> = { customers: 'Customers', sales: 'Sales', support: 'Support', company: 'Everyone at Northstar' }
      const blocks: AnyBlock[] = [
        header(`${name} launch brief`),
        section(`> ${message || 'Atlas turns every conversation into answers.'}`),
        fields([`*Launch date*\n${shortDate(date)}`, `*Audience*\n${audience.map((a) => LABEL[a] ?? a).join(', ') || 'Everyone'}`, `*DRI*\n<@${U.alex}>`, `*Channel*\n${channel ? `<#${channel}>` : 'Not shared'}`]),
        divider(),
        context(`Created by Compass for <@${ctx.user.id}> · ${clockTime()}`),
      ]
      if (meta.thread) await ctx.post(meta.thread.channel, { text: `${name} launch brief`, blocks, thread_ts: meta.thread.ts })
      if (channel) await ctx.post(channel, { text: `${name} launch brief`, blocks })
      ctx.toast('Launch brief created')
    },
    compass_feedback_details: async (ctx) => {
      await ctx.ephemeral({ text: 'Thanks for the feedback', blocks: [context(':pray: Thanks for the feedback. The Platform team reads every one.')] })
    },
    compass_post_draft: async (ctx) => {
      const text = String(ctx.values.draft_text ?? '').trim()
      if (!text) return { response_action: 'errors', errors: { draft_text_block: 'Write something to post.' } }
      await ctx.post(C.announcements, { text, blocks: [section(md(text).text)] })
      ctx.toast('Posted to #announcements')
    },
  },
})
