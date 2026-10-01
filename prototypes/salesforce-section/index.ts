// Example: Slack's Salesforce sidebar section. `sidebar: { salesforce: [...] }` puts it under Starred: the
// Salesforce app first, then the record channels you list. The kit brings a stock Salesforce app; to give it a Home
// tab, build on it: `apps: [defineApp({ ...salesforceApp, home: [...] })]`.
// Shows: the Salesforce section in the Northstar sidebar, the Salesforce app's DM, record channels.

import { bk, definePrototype, fileIcon } from '../../src/kit'

const sfLink = (type: string, id: string, name: string) => `<https://northstar.my.salesforce.com/lightning/r/${type}/${id}/view|${name}>`

export default definePrototype({
  title: 'Salesforce section',
  description: 'Slack’s Salesforce section in the sidebar: the Salesforce app and two record channels, with a record alert in the app’s DM.',
  author: 'Prototyping kit',
  updated: '2026-09-29',
  tags: ['sidebar', 'salesforce', 'block-kit'],

  channels: {
    'acme-renewal': { topic: 'Opportunity · Acme Corp renewal · closes Oct 31', members: ['daniel', 'emily', 'priya'] },
    'globex-expansion': { topic: 'Opportunity · Globex expansion · closes Nov 14', members: ['daniel', 'emily'] },
  },
  messages: {
    '#acme-renewal': [
      { from: 'daniel', daysAgo: 1, at: '16:12', text: 'Acme wants the renewal signed before their budget freeze. Let’s aim for Oct 24.' },
      {
        from: 'salesforce',
        minutesAgo: 42,
        text: 'Acme Corp renewal moved to Negotiation',
        blocks: [
          bk.section(`*${sfLink('Opportunity', '006NS00000Acme', 'Acme Corp renewal')}* moved to *Negotiation*\nAmount: $240,000 · Close date: Oct 31`),
          bk.context(bk.imageEl(fileIcon('salesforce-opportunity'), 'Opportunity'), 'Opportunity · Owner: Daniel Kim'),
        ],
      },
      { from: 'emily', minutesAgo: 20, text: 'Their admin asked for the security review again. I’ll send it today :lock:' },
    ],
    '#globex-expansion': [{ from: 'daniel', minutesAgo: 90, text: 'Globex is adding 400 seats if the pilot numbers hold :crossed_fingers:' }],
    '@salesforce': [
      {
        from: 'salesforce',
        minutesAgo: 12,
        text: 'A case was escalated on Acme Corp',
        blocks: [
          bk.section(`:rotating_light: *${sfLink('Case', '500NS00000Acme', 'Case 00012873: SSO login failures')}* was escalated\nAccount: Acme Corp · Priority: High`),
          bk.context(bk.imageEl(fileIcon('salesforce-case'), 'Case'), 'Case · Owner: Emily Watson'),
          bk.actions('sf_case_actions', bk.button('View case', 'sf_view_case', { url: 'https://northstar.my.salesforce.com/lightning/r/Case/500NS00000Acme/view' })),
        ],
      },
    ],
  },
  unreads: { '@salesforce': 1, '#globex-expansion': 1 },
  sidebar: { salesforce: ['#acme-renewal', '#globex-expansion'] },

  start: '#acme-renewal',
})
