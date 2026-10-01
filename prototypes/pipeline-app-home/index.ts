// Example: an App Home. A Sales Cloud "Pipeline" app whose Home tab is a seller's dashboard. Everything on it is
// Block Kit; the buttons and menus open modals, and saving one updates the Home tab and posts in the app's DM.
// Shows: a renamed workspace, photo personas (a marketing-style screen), an App Kit app with state, a Home tab,
// modals, an app DM, a channel, and director scenes.

import { appIcon, bk, defineApp, definePrototype, fileIcon, logo, persona, personId, type AppContext, type KitBlock, type ModalDefinition } from '../../src/kit'

type Stage = 'Discovery' | 'Proposal' | 'Negotiation' | 'Closed won'
const STAGES: Stage[] = ['Discovery', 'Proposal', 'Negotiation', 'Closed won']

interface Deal {
  id: string
  account: string
  name: string
  amount: number
  stage: Stage
  /** "Oct 3" */
  closes: string
  risk?: string
}

interface State {
  deals: Deal[]
  calls: number
}

const money = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`)
const open = (s: State) => s.deals.filter((d) => d.stage !== 'Closed won')
const won = (s: State) => s.deals.filter((d) => d.stage === 'Closed won').reduce((sum, d) => sum + d.amount, 0)
const QUOTA = 1_800_000
const BASE_WON = 1_090_000
const sfLink = (d: Deal) => `<https://acme.my.salesforce.com/lightning/r/Opportunity/${d.id}/view|${d.name}>`

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function home(s: State, firstName: string): KitBlock[] {
  const attained = Math.round(((BASE_WON + won(s)) / QUOTA) * 100)
  const bar = '▰'.repeat(Math.min(10, Math.round(attained / 10))) + '▱'.repeat(Math.max(0, 10 - Math.round(attained / 10)))
  const pipeline = open(s).reduce((sum, d) => sum + d.amount, 0)
  const risky = open(s).filter((d) => d.risk)
  return [
    bk.header('Your pipeline'),
    bk.section(`${greeting()}, *${firstName}*! You're at *${attained}%* of your Q4 quota with *${money(pipeline)}* in open pipeline.`, {
      accessory: bk.button('Log a call', 'pm_log_call', { style: 'primary' }),
    }),
    bk.fields([
      `*Quota attainment*\n${bar} ${attained}%`,
      `*Open pipeline*\n${money(pipeline)} across ${open(s).length} deals`,
      `*Calls logged this week*\n${s.calls}`,
      `*At risk*\n${risky.length ? risky.map((d) => d.account).join(', ') : 'Nothing right now'}`,
    ]),
    bk.divider(),
    bk.header('Deals closing soon'),
    ...s.deals.flatMap((d) => [
      bk.section(`*${sfLink(d)}*\n${money(d.amount)} · ${d.stage === 'Closed won' ? ':tada: Closed won' : d.stage} · closes ${d.closes}${d.risk ? `\n:warning: ${d.risk}` : ''}`, {
        block_id: `pm_deal_${d.id}`,
        accessory: bk.overflow('pm_deal_more', [
          ['Update stage', `stage:${d.id}`],
          ['Log a call', `call:${d.id}`],
          ['Open in Salesforce', `open:${d.id}`],
        ]),
      }),
      bk.context(bk.imageEl(fileIcon('salesforce-opportunity'), 'Opportunity'), `Opportunity · ${d.account} · SE <@${personId('jagdeep')}>`),
    ]),
    bk.divider(),
    bk.actions('pm_home_actions', bk.button('View all opportunities', 'pm_view_all', { url: 'https://acme.my.salesforce.com/lightning/o/Opportunity/list' }), bk.button('Refresh', 'pm_refresh')),
    bk.context(bk.imageEl(appIcon('salesforce'), 'Salesforce'), 'Synced with Sales Cloud a minute ago'),
  ]
}

function callModal(s: State, dealId?: string): ModalDefinition {
  return {
    title: 'Log a call',
    submit: 'Log call',
    close: 'Cancel',
    callback_id: 'pm_call',
    blocks: [
      bk.input('Deal', bk.select('pm_call_deal', 'Choose a deal', open(s).map((d) => [d.name, d.id] as [string, string]), dealId), { block_id: 'pm_call_deal_block' }),
      bk.input('Notes', bk.textInput('pm_call_notes', { multiline: true, placeholder: 'What did you learn? What’s next?' }), { block_id: 'pm_call_notes_block' }),
      bk.input('Next step', bk.radio('pm_call_next', [['Send a proposal', 'proposal'], ['Book a demo', 'demo'], ['Follow up next week', 'follow_up']], 'follow_up'), { block_id: 'pm_call_next_block' }),
    ],
  }
}

function stageModal(d: Deal): ModalDefinition {
  return {
    title: 'Update stage',
    submit: 'Save',
    close: 'Cancel',
    callback_id: 'pm_stage',
    private_metadata: d.id,
    blocks: [
      bk.section(`*${d.name}* · ${money(d.amount)} · now in *${d.stage}*`),
      bk.input('Stage', bk.radio('pm_stage_value', STAGES.map((st) => [st, st] as [string, string]), d.stage), { block_id: 'pm_stage_block' }),
    ],
  }
}

const findDeal = (ctx: AppContext<State>, id?: string) => ctx.state.deals.find((d) => d.id === id)

const pipeline = defineApp<State>({
  id: 'pipeline',
  name: 'Pipeline',
  icon: appIcon('pipeline-management'),
  description: 'Your Sales Cloud pipeline, in Slack',
  about: {
    description: 'Pipeline brings your Sales Cloud opportunities into Slack:',
    features: ['See quota attainment and open pipeline on the Home tab', 'Log calls and update stages without leaving Slack', 'Get a DM when a deal needs attention'],
    developer: 'Acme Revenue Operations',
    homepage: 'https://acme.my.salesforce.com',
  },
  state: {
    calls: 4,
    deals: [
      { id: '006GLOBEX', account: 'Globex', name: 'Globex renewal', amount: 320_000, stage: 'Negotiation', closes: 'Oct 3', risk: 'No reply to the proposal in 9 days' },
      { id: '006INITCH', account: 'Initech', name: 'Initech expansion', amount: 180_000, stage: 'Proposal', closes: 'Oct 10' },
      { id: '006UMBRLA', account: 'Umbrella', name: 'Umbrella platform deal', amount: 450_000, stage: 'Discovery', closes: 'Nov 14' },
      { id: '006HOOLI0', account: 'Hooli', name: 'Hooli pilot', amount: 95_000, stage: 'Proposal', closes: 'Oct 21' },
    ],
  },
  home: ({ state, user }) => home(state, user.realName.split(' ')[0]),
  actions: {
    pm_log_call: (ctx) => void ctx.openModal(callModal(ctx.state)),
    pm_refresh: (ctx) => ctx.toast('Pipeline refreshed'),
    pm_deal_more: (ctx) => {
      const [what, id] = (ctx.action?.value ?? '').split(':')
      const deal = findDeal(ctx, id)
      if (!deal) return
      if (what === 'stage') ctx.openModal(stageModal(deal))
      else if (what === 'call') ctx.openModal(callModal(ctx.state, deal.id))
      else window.open(`https://acme.my.salesforce.com/lightning/r/Opportunity/${deal.id}/view`, '_blank')
    },
    pm_open_stage: (ctx) => {
      const deal = findDeal(ctx, ctx.action?.value)
      if (deal) ctx.openModal(stageModal(deal))
    },
  },
  views: {
    pm_call: async (ctx) => {
      const deal = findDeal(ctx, ctx.values.pm_call_deal as string)
      ctx.setState((s) => ({ calls: s.calls + 1 }))
      ctx.toast('Call logged')
      await ctx.post('app', {
        text: `Call logged for ${deal?.name ?? 'a deal'}`,
        blocks: [bk.section(`:telephone_receiver: Call logged for *${deal?.name ?? 'a deal'}*`), bk.context(String(ctx.values.pm_call_notes ?? '').slice(0, 140) || 'No notes')],
      })
    },
    pm_stage: async (ctx) => {
      const id = ctx.view?.private_metadata
      const stage = (ctx.values.pm_stage_value as Stage | null) ?? 'Discovery'
      const deal = findDeal(ctx, id)
      ctx.setState((s) => ({ deals: s.deals.map((d) => (d.id === id ? { ...d, stage, risk: stage === 'Closed won' ? undefined : d.risk } : d)) }))
      ctx.toast(`${deal?.name ?? 'Deal'} moved to ${stage}`)
      if (stage === 'Closed won' && deal)
        await ctx.post('#deal-desk', { text: `${deal.name} closed won`, blocks: [bk.section(`:tada: *${deal.name}* closed won · ${money(deal.amount)}`), bk.context(`Updated by <@${ctx.user.id}> from Pipeline`)] })
    },
  },
})

export default definePrototype({
  title: 'Pipeline App Home',
  description: 'A Sales Cloud app whose Home tab is a seller’s pipeline dashboard: quota, deals closing soon, and modals to log calls and move stages.',
  author: 'Prototyping kit',
  updated: '2026-09-25',
  tags: ['app-home', 'block-kit', 'modals', 'salesforce'],

  workspace: { name: 'Acme Inc.', icon: logo('acme') },
  // A marketing-style screen, so photo personas (Slack's guide asks for illustrated ones in-product).
  me: persona('matt-brewer'),
  people: {
    lisa: persona('lisa-zhang'),
    jagdeep: persona('jagdeep-das'),
    zoe: persona('zoe-maxwell'),
  },
  channels: {
    'deal-desk': { topic: 'Pricing, approvals and deal reviews', members: ['lisa', 'jagdeep', 'zoe'] },
  },
  messages: {
    '@pipeline': [
      {
        from: 'pipeline',
        text: 'Globex renewal needs attention',
        daysAgo: 1,
        at: '16:20',
        blocks: [
          bk.section(':warning: *Globex renewal* hasn’t heard back in 9 days\n$320K · Negotiation · closes Oct 3'),
          bk.actions('pm_alert', bk.button('Update stage', 'pm_open_stage', { value: '006GLOBEX', style: 'primary' }), bk.button('Log a call', 'pm_log_call')),
        ],
      },
    ],
    '#deal-desk': [
      { from: 'lisa', text: 'Where are we on Globex? I’d love to call it before quarter end.', minutesAgo: 50 },
      { from: 'jagdeep', text: 'Security review is done on our side. They’re waiting on legal.', minutesAgo: 44, reactions: { eyes: ['lisa'] } },
      { from: 'me', text: 'I’ll chase their GC today and update Pipeline.', minutesAgo: 41 },
    ],
    '@lisa': [{ from: 'lisa', text: 'Nice work on Initech this week :clap:', minutesAgo: 90 }],
  },
  unreads: { '@pipeline': 1 },
  sidebar: { hideDemo: true },
  apps: [pipeline],

  start: { open: '@pipeline', tab: 'home' },
  scenes: [
    { label: 'Pipeline Home tab', go: { open: '@pipeline', tab: 'home' } },
    {
      label: 'Pipeline flags Hooli',
      post: {
        to: '@pipeline',
        from: 'pipeline',
        text: 'Hooli pilot changed',
        blocks: [bk.section(':chart_with_upwards_trend: *Hooli pilot* grew to $140K\nThe customer added two teams to the pilot.'), bk.context('Synced from Sales Cloud')],
      },
    },
    { label: 'Lisa asks about Globex', post: { to: '@lisa', from: 'lisa', text: 'Did Globex sign? :crossed_fingers:' } },
    { label: 'Open #deal-desk', go: '#deal-desk' },
  ],
})
