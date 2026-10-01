import { DEMO_IDS, extendDemo } from './demo'
import { makeTs } from '../lib/time'
import type { DraftItem, HuddleRecord, User, UserGroup } from './types'

// Search area demo data: profile details (contact info, start dates, time zones), huddle history,
// drafts & scheduled messages, and user groups. Consistent with demo.ts's people and conversations.

const { U, C } = DEMO_IDS

let seq = 7000
const now = new Date()
const minsAgo = (mins: number) => makeTs(new Date(now.getTime() - mins * 60_000), ++seq)
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, 0), ++seq)
}
const inDays = (days: number, time: string) => at(-days, time)

const PROFILES: Record<string, Partial<User>> = {
  [U.alex]: { email: 'alex.morgan@northstar-hq.com', phone: '+1 (415) 555-0134', startDate: '2021-04-12' },
  [U.priya]: { email: 'priya.patel@northstar-hq.com', phone: '+1 (646) 555-0187', startDate: '2020-09-08', timezone: 'America/New_York', pronouns: 'she/her', role: 'admin' },
  [U.marcus]: { email: 'marcus.chen@northstar-hq.com', startDate: '2019-06-17', pronouns: 'he/him' },
  [U.sofia]: { email: 'sofia.rodriguez@northstar-hq.com', phone: '+1 (415) 555-0162', startDate: '2022-01-10', pronouns: 'she/her' },
  [U.daniel]: { email: 'daniel.kim@northstar-hq.com', phone: '+1 (312) 555-0119', startDate: '2021-11-01', timezone: 'America/Chicago' },
  [U.emily]: { email: 'emily.watson@northstar-hq.com', startDate: '2022-05-23', timezone: 'America/Denver', pronouns: 'she/her' },
  [U.james]: { email: 'james.okafor@northstar-hq.com', startDate: '2023-02-06', timezone: 'America/New_York' },
  [U.hannah]: { email: 'hannah.schmidt@northstar-hq.com', startDate: '2021-08-30', timezone: 'Europe/Berlin', pronouns: 'she/her' },
  [U.luis]: { email: 'luis.fernandez@northstar-hq.com', startDate: '2025-09-15', timezone: 'Europe/Lisbon', pronouns: 'he/him' },
  [U.aisha]: { email: 'aisha.rahman@northstar-hq.com', startDate: '2023-07-17' },
  [U.tom]: { email: 'tom.becker@northstar-hq.com', phone: '+1 (415) 555-0100', startDate: '2018-03-01', role: 'owner' },
  [U.grace]: { email: 'grace.liu@northstar-hq.com', startDate: '2022-10-03', pronouns: 'she/her' },
  [U.noah]: { email: 'noah.williams@northstar-hq.com', phone: '+1 (206) 555-0148', startDate: '2024-01-08' },
}

extendDemo((fx) => {
  for (const [id, extra] of Object.entries(PROFILES)) if (fx.users[id]) Object.assign(fx.users[id], extra)

  const launchKickoff = fx.messages[C.launch]?.[0]?.ts

  const huddles: HuddleRecord[] = [
    { id: 'R04HDL00001', conversationId: C.design, start: minsAgo(130), minutes: 18, participantIds: [U.sofia, U.alex, U.luis, U.hannah], replies: 3, notes: true },
    { id: 'R04HDL00002', conversationId: C.dmPriya, start: minsAgo(245), minutes: 14, participantIds: [U.priya, U.alex] },
    { id: 'R04HDL00003', conversationId: C.launch, start: at(1, '16:02'), minutes: 32, participantIds: [U.alex, U.priya, U.marcus, U.daniel, U.emily], replies: 5, files: 2, notes: true },
    { id: 'R04HDL00004', conversationId: C.incidents, start: at(1, '16:50'), minutes: 41, participantIds: [U.marcus, U.priya, U.tom, U.alex], replies: 2 },
    { id: 'R04HDL00005', conversationId: C.engineering, start: at(1, '11:15'), minutes: 9, participantIds: [U.marcus, U.luis, U.aisha, U.alex] },
    { id: 'R04HDL00006', conversationId: C.dmMarcus, start: at(3, '17:30'), minutes: 22, participantIds: [U.marcus, U.alex] },
    { id: 'R04HDL00007', conversationId: C.product, start: at(8, '10:00'), minutes: 46, participantIds: [U.alex, U.priya, U.tom, U.sofia, U.james], replies: 7, files: 1, notes: true },
  ]
  fx.huddles = huddles

  const drafts: DraftItem[] = [
    {
      id: 'Dr04PRODUCT1',
      conversationId: C.product,
      text: 'Following up on the success metrics: I think we anchor on *weekly active summaries* instead of raw summary views, and track retention at week 4 as the guardrail.',
      updated: minsAgo(22),
    },
    { id: 'Dr04SOFIA001', conversationId: C.dmSofia, text: 'Can you add the empty-state variant to the Figma file before crit? Happy to pair on it tomorrow morning.', updated: minsAgo(70) },
    ...(launchKickoff
      ? [{ id: 'Dr04LAUNCH01', conversationId: C.launch, threadTs: launchKickoff, text: 'Demo workspace is ready for enablement :tada: Link and logins are in the launch plan.', updated: at(1, '18:40') }]
      : []),
    {
      id: 'Dr04GENERAL1',
      conversationId: C.general,
      text: ':rocket: *Atlas GA launch party* is this Friday at 4pm in the big room. Snacks, demos, and a very short speech. See you there!',
      updated: minsAgo(40),
      scheduledFor: inDays(1, '09:00'),
    },
  ]
  fx.drafts = drafts

  const userGroups: UserGroup[] = [
    { id: 'S04ATLASLCH', handle: 'atlas-launch', name: 'Atlas Launch Crew', description: 'Everyone shipping Atlas GA on Oct 14', memberIds: [U.alex, U.priya, U.marcus, U.sofia, U.hannah, U.daniel, U.emily] },
    { id: 'S04DESIGNTM', handle: 'design-team', name: 'Design Team', description: 'Product designers and design engineers', memberIds: [U.sofia, U.luis, U.hannah, U.alex] },
    { id: 'S04ENGPLTFM', handle: 'eng-platform', name: 'Platform Engineering', description: 'Search, summaries and the job queue', memberIds: [U.priya, U.marcus, U.luis, U.aisha, U.james] },
    { id: 'S04LEADERS1', handle: 'leads', name: 'Leadership', description: 'Department leads', memberIds: [U.tom, U.priya, U.daniel, U.hannah, U.emily, U.grace, U.alex] },
    { id: 'S04ONCALL01', handle: 'oncall', name: 'Platform On-call', description: 'Page for production incidents', memberIds: [U.marcus, U.aisha] },
  ]
  fx.userGroups = userGroups
})
