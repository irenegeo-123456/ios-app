import { DEMO_IDS, extendDemo } from './demo'
import { makeTs } from '../lib/time'
import type { CanvasDoc, Fixture, Message, SlackList, WorkspaceFile } from './types'
import { blocksFromLines } from './canvas/templates'
import type { InlineCtx } from './canvas/model'

// Canvas area demo data: the channel canvases (#launch-atlas "Atlas launch plan", #product "Atlas v1.1 PRD",
// #engineering "On-call runbook"), the canvases already listed in More › Files, the "Launch checklist" list,
// and #launch-atlas messages that link the launch plan canvas and the checklist.

const { U, C } = DEMO_IDS

let seq = 900
const now = new Date()
const minsAgo = (mins: number) => makeTs(new Date(now.getTime() - mins * 60_000), ++seq)
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, (seq * 17) % 60), ++seq)
}
const year = now.getFullYear()

export const CANVAS_IDS = {
  launchPlan: 'F04LAUNCHPL',
  prd: 'F04ATLAS11P',
  runbook: 'F04ONCALLRB',
  postmortem: 'F04POSTMRT1',
  q4Plan: 'F04Q4PLAN01',
  summariesPrd: 'F04SUMPRD01',
  checklist: 'F04CHKLST01',
}

const byTs = (a: Message, b: Message) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)

extendDemo((fx) => {
  const ctx: InlineCtx = { users: fx.users, conversations: fx.conversations, me: fx.me, domain: fx.workspace.domain }
  const base = `https://${fx.workspace.domain}.slack.com`
  const docUrl = (id: string) => `${base}/docs/${fx.workspace.id}/${id}`
  const listUrl = (id: string) => `${base}/lists/${fx.workspace.id}/${id}`
  const find = (conv: string, prefix: string) => fx.messages[conv]?.find((m) => m.text.startsWith(prefix))
  const embed = (conv: string, prefix: string) => {
    const m = find(conv, prefix)
    return m ? `@message:${conv}/${m.ts}` : ''
  }
  const doc = (id: string, title: string, creatorId: string, lines: string[], extra: Partial<CanvasDoc> = {}): CanvasDoc => ({
    id,
    title,
    creatorId,
    created: at(9, '10:00'),
    updated: minsAgo(40),
    lastEditorId: creatorId,
    blocks: blocksFromLines(lines.filter(Boolean), ctx),
    ...extra,
  })

  const canvases: CanvasDoc[] = [
    doc(
      CANVAS_IDS.launchPlan,
      'Atlas launch plan',
      U.alex,
      [
        `Everything for the *Atlas GA* launch in one place. Launch day is *Oct 14*. Questions go in <#${C.launch}|launch-atlas>.`,
        '# 🎯 Goals',
        '- Ship Atlas GA (smart summaries + search) to every Business+ workspace',
        '- 2,000 weekly active teams in the first 30 days',
        '- NPS of 60 or higher from the launch cohort',
        '# 📅 Timeline',
        `1. *Oct 1:* Sales one-pager ready (<@${U.daniel}>)`,
        `1. *Oct 7:* Stable demo workspace (<@${U.alex}>)`,
        `1. *Oct 9:* Sales enablement session (<@${U.daniel}>)`,
        `1. *Oct 10:* Code freeze (<@${U.priya}>)`,
        '1. *Oct 14:* Launch day :rocket:',
        '## ✅ Launch checklist',
        `[x] Load testing at 3x peak traffic (<@${U.marcus}>)`,
        `[x] Security review (<@${U.aisha}>)`,
        `[] Docs and screenshots (<@${U.priya}>)`,
        `[] Pricing page copy (<@${U.hannah}>)`,
        `[] Launch blog post and webinar (<@${U.hannah}>)`,
        `[] Beta partner announcement email (<@${U.emily}>)`,
        '---',
        '## 👥 Owners',
        `- *Product:* <@${U.alex}>`,
        `- *Engineering:* <@${U.priya}>`,
        `- *Design:* <@${U.sofia}>`,
        `- *Marketing:* <@${U.hannah}>`,
        `- *Sales:* <@${U.daniel}>`,
        `- *Customer success:* <@${U.emily}>`,
        '## 💬 Positioning',
        '> Atlas turns every conversation into answers.',
        embed(C.launch, 'Messaging doc v1 is ready'),
        '## 🔗 Resources',
        `- <${listUrl(CANVAS_IDS.checklist)}|Launch checklist> for owners and due dates`,
        `- <${docUrl(CANVAS_IDS.summariesPrd)}|Atlas smart summaries PRD>`,
        '- <https://northstar-hq.com/brand|Brand hub> for logos and screenshots',
        `@file:${CANVAS_IDS.checklist}`,
      ],
      { channelId: C.launch, created: at(2, '10:02'), updated: minsAgo(45), lastEditorId: U.priya, viewerIds: [U.priya, U.hannah, U.sofia] },
    ),
    doc(
      CANVAS_IDS.prd,
      'Atlas v1.1 PRD',
      U.alex,
      [
        `*Status:* In review · *Owner:* <@${U.alex}> · *Eng lead:* <@${U.priya}> · *Design:* <@${U.sofia}>`,
        '# Problem',
        'Beta customers want to share Atlas summaries with people outside Slack, and admins need a way to keep summaries out of sensitive channels. Both come up in every enterprise deal.',
        '# Goals',
        '1. Share any summary as a read-only link',
        '1. Admins can turn summaries off per channel',
        '1. Every shared summary shows up in the audit log',
        '# Non-goals',
        '- Huddle summaries (planned for v1.2)',
        '- Mobile offline mode',
        '# Success metrics',
        '- 30% of summary viewers share at least one summary a week',
        '- Zero escalations about summaries in sensitive channels',
        embed(C.product, 'Early data from the beta'),
        '## Open questions',
        `[] Shared links expire after 7 or 30 days? (<@${U.tom}>)`,
        `[x] Do shared links follow the workspace retention policy? Yes (<@${U.priya}>)`,
      ],
      { channelId: C.product, created: at(6, '10:05'), updated: at(1, '16:40'), viewerIds: [U.sofia] },
    ),
    doc(
      CANVAS_IDS.runbook,
      'On-call runbook',
      U.marcus,
      [
        `Primary on-call this week: <@${U.marcus}> · Secondary: <@${U.aisha}> · Incidents go to <#${C.incidents}|incidents>`,
        '# 🚨 When you get paged',
        '1. Acknowledge the page within 5 minutes',
        `1. Post in <#${C.incidents}|incidents> with the severity and customer impact`,
        '1. Start a huddle for SEV-1 and SEV-2',
        '1. Update the status page every 30 minutes',
        '# Severity levels',
        '- *SEV-1:* Atlas or search is down for everyone',
        '- *SEV-2:* Degraded performance, or a major feature is unavailable',
        '- *SEV-3:* Minor impact, fix within the next business day',
        '# Common fixes',
        '### Search API error rate spikes',
        'Check the cache node dashboard, then drain the bad node:',
        '```kubectl drain cache-node-7 --ignore-daemonsets\nkubectl rollout restart deploy/search-api',
        '### Delayed notifications',
        'Usually the job queue falling behind. Add workers:',
        '```kubectl scale deploy/workers --replicas=12',
        '---',
        '## Handoff checklist',
        '[] Review open incidents and postmortems',
        `[] Hand off the pager in <#${C.engineering}|engineering>`,
        '[] Update this runbook if anything changed',
      ],
      { channelId: C.engineering, created: at(20, '11:00'), updated: at(1, '18:05'), lastEditorId: U.aisha },
    ),
    doc(CANVAS_IDS.postmortem, 'Postmortem: search API errors', U.marcus, [
      `*Severity:* SEV-2 · *Duration:* 45 minutes · *Author:* <@${U.marcus}>`,
      '# Summary',
      'A bad cache node returned stale shards, so 5% of search API requests failed until the node was removed from the pool.',
      '# Timeline',
      '1. *4:47 PM:* Error rate alert fires',
      `1. *4:55 PM:* <@${U.priya}> pages the search on-call`,
      '1. *5:32 PM:* Bad node drained, errors back to normal',
      '# Action items',
      `[x] Alert on per-node error rates (<@${U.marcus}>)`,
      `[] Automate draining unhealthy cache nodes (<@${U.luis}>)`,
    ]),
    doc(CANVAS_IDS.q4Plan, 'Q4 Platform plan', U.priya, [
      'Priorities for Platform this quarter, highest first.',
      '1. Atlas GA (summaries + search)',
      '1. Admin audit logs (read-only for v1)',
      '1. SSO for Business+',
      '1. Mobile offline mode (stretch)',
      '## Staffing',
      `- *Atlas:* <@${U.marcus}>, <@${U.luis}>, <@${U.aisha}>`,
      `- *Audit logs:* <@${U.priya}>`,
    ]),
    doc(CANVAS_IDS.summariesPrd, 'Atlas smart summaries PRD', U.alex, [
      `*Owner:* <@${U.alex}> · *Status:* Approved`,
      '# Why',
      'People spend hours catching up on channels. Summaries turn a busy channel into a two-minute read.',
      '# Success metrics',
      '- Weekly active summary users',
      '- Week-4 retention of summary users vs. non-users',
      '- Thumbs-up rate on summaries above 80%',
    ]),
  ]
  fx.canvases = Object.fromEntries(canvases.map((c) => [c.id, c]))

  // --- the Launch checklist list -------------------------------------------------------------------
  const due = (month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const list: SlackList = {
    id: CANVAS_IDS.checklist,
    title: 'Launch checklist',
    creatorId: U.priya,
    channelId: C.launch,
    columns: [
      { id: 'Col01ITEM', name: 'Item', type: 'text', width: 320 },
      { id: 'Col02OWNR', name: 'Owner', type: 'person', width: 200 },
      {
        id: 'Col03STAT',
        name: 'Status',
        type: 'select',
        width: 160,
        options: [
          { id: 'todo', label: 'Not started', color: 'gray' },
          { id: 'doing', label: 'In progress', color: 'blue' },
          { id: 'blocked', label: 'Blocked', color: 'red' },
          { id: 'done', label: 'Done', color: 'green' },
        ],
      },
      { id: 'Col04DUE', name: 'Due', type: 'date', width: 140 },
    ],
    rows: [
      ['Load testing at 3x peak traffic', U.marcus, 'done', due(10, 2)],
      ['Security review', U.aisha, 'done', due(10, 3)],
      ['Sales one-pager', U.daniel, 'doing', due(10, 1)],
      ['Stable demo workspace', U.alex, 'doing', due(10, 7)],
      ['Docs and screenshots', U.priya, 'doing', due(10, 8)],
      ['Pricing page copy', U.hannah, 'blocked', due(10, 8)],
      ['Launch blog post and webinar', U.hannah, 'doing', due(10, 10)],
      ['Status page and incident plan', U.marcus, 'todo', due(10, 12)],
      ['Beta partner announcement email', U.emily, 'todo', due(10, 13)],
    ].map(([item, owner, status, date], i) => ({
      id: `Rec0${i + 1}LNCH`,
      cells: { Col01ITEM: item, Col02OWNR: owner, Col03STAT: status, Col04DUE: date },
    })),
  }
  fx.lists = { [list.id]: list }

  // --- messages that link them ----------------------------------------------------------------------
  const launch = fx.messages[C.launch]
  if (launch) {
    launch.push(
      {
        ts: at(1, '16:02'),
        userId: U.priya,
        text: `Moved the launch checklist into a list so every item has an owner and a due date :clipboard: <${listUrl(CANVAS_IDS.checklist)}|Launch checklist>`,
        reactions: [{ name: 'raised_hands', users: [U.alex, U.hannah] }],
      },
      {
        ts: minsAgo(45),
        userId: U.priya,
        text: `Updated the launch plan with owners for everything on the checklist. Please check yours before Thursday :pray:\n<${docUrl(CANVAS_IDS.launchPlan)}|Atlas launch plan>`,
        reactions: [{ name: 'eyes', users: [U.hannah, U.sofia] }],
      },
    )
    launch.sort(byTs)
  }

  // --- More › Files entries for the canvases that aren't listed yet ---------------------------------
  const mine: WorkspaceFile[] = [
    { id: CANVAS_IDS.prd, title: 'Atlas v1.1 PRD', kind: 'canvas', creatorId: U.alex, lastViewed: at(1, '16:45'), readMinutes: 3 },
    { id: CANVAS_IDS.runbook, title: 'On-call runbook', kind: 'canvas', creatorId: U.marcus, lastViewed: at(2, '09:20'), readMinutes: 2, sharedWithYou: true },
  ]
  addFiles(fx, mine)
})

/** Adds files to More › Files, also if the views area assigns its list after us (area files load in any order). */
function addFiles(fx: Fixture, mine: WorkspaceFile[]) {
  const merge = (list: WorkspaceFile[] | undefined) => {
    const ids = new Set((list ?? []).map((f) => f.id))
    return [...(list ?? []), ...mine.filter((f) => !ids.has(f.id))].sort((a, b) => (a.lastViewed < b.lastViewed ? 1 : a.lastViewed > b.lastViewed ? -1 : 0))
  }
  let value = merge(fx.files)
  Object.defineProperty(fx, 'files', {
    configurable: true,
    enumerable: true,
    get: () => value,
    set: (v: WorkspaceFile[] | undefined) => {
      value = merge(v)
    },
  })
}
