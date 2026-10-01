// Example: a conversation with an app. "Insights" answers questions about customer accounts in its DM: type an
// account name (Initech, Globex or Acme) and it replies with a Block Kit card whose buttons open a modal, share
// the card to a channel or update it in place. `/insights <account>` works in any channel too.
// Shows: building on the Northstar demo (same workspace and people), an app DM with history, a message
// handler, a slash command, a message shortcut, modals, and scenes.

import { appIcon, bk, defineApp, definePrototype, fileIcon, type AppContext, type KitBlock } from '../../src/kit'

interface Account {
  name: string
  arr: string
  health: 'Healthy' | 'Watch' | 'At risk'
  renewal: string
  owner: string
  /** Northstar teammate keys */
  ownerKey: string
  news: string
  next: string
}

const ACCOUNTS: Record<string, Account> = {
  initech: {
    name: 'Initech',
    arr: '$540K',
    health: 'Healthy',
    renewal: 'Sep 2029',
    owner: 'Noah Williams',
    ownerKey: 'noah',
    news: 'Signed a 3-year, 450-seat deal this week. Onboarding kicks off next week with Customer Success.',
    next: 'Introduce their admins to the Atlas beta before the kickoff.',
  },
  globex: {
    name: 'Globex',
    arr: '$120K (pilot)',
    health: 'Watch',
    renewal: 'Dec 2026',
    owner: 'Noah Williams',
    ownerKey: 'noah',
    news: 'Wants Atlas in their pilot; the security questionnaire went out two days ago.',
    next: 'Get the questionnaire back before the pilot review on Oct 6.',
  },
  acme: {
    name: 'Acme Corp',
    arr: '$880K',
    health: 'At risk',
    renewal: 'Jan 2027',
    owner: 'Emily Watson',
    ownerKey: 'emily',
    news: 'Summaries timed out in their largest channel (40k messages). Platform shipped a fix today.',
    next: 'Confirm the fix with their team and offer an Atlas roadmap session.',
  },
}

const HEALTH = { Healthy: ':large_green_circle:', Watch: ':large_yellow_circle:', 'At risk': ':red_circle:' }

const findAccount = (text: string) => Object.entries(ACCOUNTS).find(([key, a]) => text.toLowerCase().includes(key) || text.toLowerCase().includes(a.name.toLowerCase()))

/** The account card. `shared` swaps the buttons for a note. */
function card(key: string, a: Account, opts: { shared?: string } = {}): { text: string; blocks: KitBlock[] } {
  return {
    text: `${a.name}: ${a.health}`,
    blocks: [
      bk.section(`*${a.name}* · ${HEALTH[a.health]} ${a.health}\n${a.news}`),
      bk.fields([`*ARR*\n${a.arr}`, `*Renewal*\n${a.renewal}`, `*Owner*\n${a.owner}`, `*Next step*\n${a.next}`]),
      opts.shared
        ? bk.context(`:white_check_mark: Shared to ${opts.shared}`)
        : bk.actions(`ins_card_${key}`, bk.button('Draft a follow-up', 'ins_draft', { value: key, style: 'primary' }), bk.button('Share to #sales', 'ins_share', { value: key })),
      bk.context(bk.imageEl(fileIcon('salesforce-account'), 'Sales Cloud'), 'From Sales Cloud and the last 30 days of Slack · just now'),
    ],
  }
}

const help = () => ({
  text: 'Ask me about an account',
  blocks: [
    bk.section('Ask me about any customer and I’ll pull their account together. Try *Initech*, *Globex* or *Acme*.'),
    bk.context('Or type `/insights <account>` in any channel.'),
  ],
})

type Ctx = AppContext

const insights = defineApp({
  id: 'insights',
  name: 'Insights',
  icon: appIcon('insights'),
  description: 'Account research for sales and success teams',
  about: {
    description: 'Insights answers questions about your customers, right in Slack:',
    features: ['Account health, renewal dates and owners from Sales Cloud', 'What happened in Slack this month, summarized', 'Draft follow-ups in one click'],
    developer: 'Northstar Revenue Operations',
  },
  commands: [
    {
      command: '/insights',
      usage: '[account]',
      description: 'Look up a customer account',
      handler: async (ctx: Ctx) => {
        const hit = findAccount(ctx.command?.text ?? '')
        await ctx.respond(hit ? card(hit[0], hit[1]) : help())
      },
    },
  ],
  messageShortcuts: [
    {
      callback_id: 'ins_research',
      name: 'Research the account in this message',
      handler: async (ctx: Ctx) => {
        const hit = findAccount(ctx.message?.text ?? '')
        await ctx.ephemeral(hit ? card(hit[0], hit[1]) : help())
      },
    },
  ],
  actions: {
    ins_draft: (ctx: Ctx) => {
      const a = ACCOUNTS[ctx.action?.value ?? '']
      if (!a) return
      ctx.openModal({
        title: 'Draft a follow-up',
        submit: 'Send',
        close: 'Cancel',
        callback_id: 'ins_send',
        private_metadata: a.ownerKey,
        blocks: [
          bk.section(`To *${a.owner}*, about *${a.name}*`),
          bk.input('Message', bk.textInput('ins_body', { multiline: true, initial: `Hi! Quick one on ${a.name}: ${a.next} Can we sync this week?` })),
        ],
      })
    },
    ins_share: async (ctx: Ctx) => {
      const key = ctx.action?.value ?? ''
      const a = ACCOUNTS[key]
      if (!a) return
      await ctx.post('#sales', card(key, a, { shared: 'by Insights' }))
      ctx.update(card(key, a, { shared: '#sales' }))
      ctx.toast('Shared to #sales')
    },
  },
  views: {
    ins_send: async (ctx: Ctx) => {
      ctx.toast('Follow-up sent')
      await ctx.say(`:outbox_tray: Sent your follow-up to ${ctx.view?.private_metadata === 'emily' ? 'Emily Watson' : 'Noah Williams'}.`)
    },
  },
  onMessage: async (ctx: Ctx) => {
    const hit = findAccount(ctx.message?.text ?? '')
    await ctx.say(hit ? card(hit[0], hit[1]) : help())
  },
})

export default definePrototype({
  title: 'Account Insights in a DM',
  description: 'An app you talk to: ask about a customer and it answers with an account card you can share or turn into a follow-up. Built on the Northstar demo.',
  author: 'Prototyping kit',
  updated: '2026-09-24',
  tags: ['app-dm', 'block-kit', 'slash-command', 'northstar'],

  // No workspace or people: it adds an app to the Northstar demo as it is.
  apps: [insights],
  messages: {
    '@insights': [
      { from: 'me', text: 'What should I know before the Initech call?', daysAgo: 1, at: '09:02' },
      { from: 'insights', text: 'Initech: Healthy', daysAgo: 1, at: '09:02', blocks: card('initech', ACCOUNTS.initech).blocks },
      { from: 'me', text: 'And Acme Corp?', minutesAgo: 12 },
      { from: 'insights', text: 'Acme Corp: At risk', minutesAgo: 12, blocks: card('acme', ACCOUNTS.acme).blocks },
    ],
  },

  start: '@insights',
  scenes: [
    { label: 'Open the Insights DM', go: '@insights' },
    {
      label: 'Insights posts the morning briefing',
      post: {
        to: '@insights',
        from: 'insights',
        text: 'Your accounts this morning',
        blocks: [
          bk.header('Good morning! Your accounts today'),
          bk.section(':red_circle: *Acme Corp* · at risk: confirm the summaries fix\n:large_yellow_circle: *Globex* · security questionnaire due\n:large_green_circle: *Initech* · onboarding next week'),
          bk.context('Type an account name for the details.'),
        ],
      },
    },
    { label: 'Emily asks about Acme in #customer-success', post: { to: '#customer-success', from: 'emily', text: 'Does anyone have the latest on the Acme account before my call? Try `/insights acme` :pray:' } },
  ],
})
