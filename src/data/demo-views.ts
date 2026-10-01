import { DEMO_IDS, extendDemo } from './demo'
import { makeTs } from '../lib/time'
import type { ActivityItem, LaterItem, Message, WorkspaceFile } from './types'

// Views area demo data: the Activity feed, More › Files and More › Later. Every item points at a real
// message in demo.ts (a few messages and reactions are added here so Alex actually gets mentioned).

const { U, C } = DEMO_IDS

// Own sequence so our ts values never collide with the ones demo.ts generated.
let seq = 700
const now = new Date()
const minsAgo = (mins: number) => makeTs(new Date(now.getTime() - mins * 60_000), ++seq)
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, (seq * 13) % 60), ++seq)
}

const byTs = (a: Message, b: Message) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)

extendDemo((fx) => {
  const threads = (fx.threads ??= {})
  const msg = (conv: string, prefix: string) => {
    const m = fx.messages[conv]?.find((x) => x.text.startsWith(prefix))
    if (!m) throw new Error(`demo-views: no message "${prefix}" in ${conv}`)
    return m
  }
  const reply = (key: string, prefix: string) => {
    const m = threads[key]?.find((x) => x.text.startsWith(prefix))
    if (!m) throw new Error(`demo-views: no reply "${prefix}" in ${key}`)
    return m
  }
  const add = (list: Message[], m: Message) => {
    list.push(m)
    list.sort(byTs)
    return m
  }
  const react = (m: Message, name: string, ...users: string[]) => {
    m.reactions = [...(m.reactions ?? []), { name, users }]
  }

  // --- Messages the feed needs -------------------------------------------------------------------
  const engMention = add(fx.messages[C.engineering], {
    ts: minsAgo(22),
    userId: U.marcus,
    text: "<@U04ALEXMRG> heads up before I merge: the new indexer returns `highlights` instead of `snippet` in the search API. Does anything in Atlas GA still read the old field?",
  })

  const kickoff = msg(C.launch, 'Kicking off the *Atlas launch*')
  const kickoffKey = `${C.launch}/${kickoff.ts}`
  const faqMention = add(threads[kickoffKey], {
    ts: at(1, '16:20'),
    userId: U.hannah,
    text: '<@U04ALEXMRG> the launch FAQ is in the Launch folder. Can you sanity-check the pricing answers before Thursday? :pray:',
  })

  const alexProduct = msg(C.product, '<@U04SOFIARZ> these look great')
  react(alexProduct, 'raised_hands', U.sofia)
  react(alexProduct, '+1', U.priya)

  const q4Plan = msg(C.product, 'Q4 plan for Platform')
  const q4Key = `${C.product}/${q4Plan.ts}`
  const onboarding = msg(C.design, 'Onboarding v3 is ready for crit')
  const onboardingKey = `${C.design}/${onboarding.ts}`
  const alexDesignReply = reply(onboardingKey, 'The checklist is so much clearer')
  react(alexDesignReply, 'heart', U.sofia)

  // --- Activity (newest first) -------------------------------------------------------------------
  const activity: ActivityItem[] = [
    { id: 'Av0001', type: 'app', conversationId: C.calendar, ts: msg(C.calendar, ':calendar:').ts, userId: U.calendar, unread: true, unreadCount: 1 },
    { id: 'Av0002', type: 'dm', conversationId: C.dmPriya, ts: msg(C.dmPriya, 'Quick one').ts, userId: U.priya, unread: true, unreadCount: 1 },
    { id: 'Av0003', type: 'mention', conversationId: C.engineering, ts: engMention.ts, userId: U.marcus, unread: true },
    { id: 'Av0004', type: 'reaction', conversationId: C.product, ts: alexProduct.ts, userId: U.sofia, reaction: 'raised_hands', activityTs: minsAgo(9) },
    { id: 'Av0005', type: 'app', conversationId: C.drive, ts: msg(C.drive, '*Hannah Schmidt* shared').ts, userId: U.drive },
    { id: 'Av0006', type: 'app', conversationId: C.standup, ts: msg(C.standup, 'Good morning!').ts, userId: U.standup },
    { id: 'Av0007', type: 'mention', conversationId: C.launch, ts: faqMention.ts, threadTs: kickoff.ts, userId: U.hannah },
    { id: 'Av0008', type: 'reaction', conversationId: C.design, ts: alexDesignReply.ts, threadTs: onboarding.ts, userId: U.sofia, reaction: 'heart', activityTs: at(1, '14:26') },
    {
      id: 'Av0009',
      type: 'thread',
      conversationId: C.design,
      ts: reply(onboardingKey, 'Yes! Recording one tomorrow.').ts,
      threadTs: onboarding.ts,
      userId: U.sofia,
      otherUserIds: [U.hannah],
    },
    { id: 'Av0010', type: 'thread', conversationId: C.product, ts: reply(q4Key, 'Sounds good').ts, threadTs: q4Plan.ts, userId: U.priya, otherUserIds: [U.tom] },
    {
      id: 'Av0011',
      type: 'reaction',
      conversationId: C.launch,
      ts: kickoff.ts,
      userId: U.priya,
      otherUserIds: [U.marcus, U.sofia, U.hannah, U.daniel, U.emily],
      reaction: 'rocket',
      activityTs: at(2, '10:20'),
    },
  ]
  const when = (a: ActivityItem) => a.activityTs ?? a.ts
  fx.activity = activity.sort((a, b) => (when(a) < when(b) ? 1 : -1))
  // The rail badge counts unread rows, like Slack.
  fx.activityBadge = fx.activity.filter((a) => a.unread).length

  // --- More › Files (recently viewed first) ------------------------------------------------------
  const files: WorkspaceFile[] = [
    { id: 'F04CHKLST01', title: 'Launch checklist', kind: 'list', creatorId: U.priya, lastViewed: minsAgo(28), sharedWithYou: true },
    { id: 'F04MSGDOC01', title: 'Atlas launch messaging', kind: 'doc', creatorId: U.hannah, lastViewed: minsAgo(34), sharedWithYou: true },
    { id: 'F04LAUNCHPL', title: 'Atlas launch plan', kind: 'canvas', creatorId: U.alex, lastViewed: minsAgo(50), readMinutes: 6 },
    { id: 'F04CARDSV41', title: 'Summary cards v4.png', kind: 'image', creatorId: U.sofia, lastViewed: minsAgo(54), sharedWithYou: true },
    { id: 'F04INITECH1', title: 'Initech order form.pdf', kind: 'pdf', creatorId: U.daniel, lastViewed: minsAgo(200), sharedWithYou: true },
    { id: 'F04POSTMRT1', title: 'Postmortem: search API errors', kind: 'canvas', creatorId: U.marcus, lastViewed: at(1, '18:02'), readMinutes: 3, sharedWithYou: true },
    { id: 'F04RETENT01', title: 'Summaries beta retention.xlsx', kind: 'spreadsheet', creatorId: U.james, lastViewed: at(1, '13:20'), sharedWithYou: true },
    { id: 'F04Q4PLAN01', title: 'Q4 Platform plan', kind: 'canvas', creatorId: U.priya, lastViewed: at(1, '09:15'), readMinutes: 4, sharedWithYou: true },
    { id: 'F04SUMPRD01', title: 'Atlas smart summaries PRD', kind: 'canvas', creatorId: U.alex, lastViewed: at(2, '15:38'), readMinutes: 9 },
    { id: 'F04ONBRD3V', title: 'Onboarding v3 walkthrough.mp4', kind: 'video', creatorId: U.sofia, lastViewed: at(3, '11:10'), sharedWithYou: true },
  ]
  fx.files = files

  // --- More › Later ------------------------------------------------------------------------------
  const tomorrow9 = makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0), ++seq)
  const today5pm = makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0), ++seq)
  const later: LaterItem[] = [
    { conversationId: C.launch, ts: msg(C.launch, 'Launch checklist status').ts, status: 'in_progress', due: today5pm },
    { conversationId: C.engineering, ts: msg(C.engineering, 'PR for the search indexer').ts, status: 'in_progress' },
    { conversationId: C.product, ts: q4Plan.ts, status: 'in_progress', due: tomorrow9 },
    { conversationId: C.general, ts: msg(C.general, 'The new brand guidelines').ts, status: 'archived' },
    { conversationId: C.cs, ts: msg(C.cs, ':rotating_light: Escalation').ts, status: 'completed' },
  ]
  fx.later = later
})
