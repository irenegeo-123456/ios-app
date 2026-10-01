import type { Conversation, Fixture, Message, User } from './types'
import { makeTs } from '../lib/time'

// ---------------------------------------------------------------------------------------------
// Demo workspace. Everything a presenter might want to rename lives at the top of this file.
// Timestamps are relative to "now" so Today/Yesterday dividers are right on any demo day.
// ---------------------------------------------------------------------------------------------

const WORKSPACE = { id: 'T0NRTHSTR', name: 'Northstar', domain: 'northstar-hq', initials: 'N', plan: 'business' as const }

let seq = 0
const now = new Date()
/** A message time `mins` minutes ago (today). */
const minsAgo = (mins: number) => makeTs(new Date(now.getTime() - mins * 60_000), ++seq)
/** A clock time on a previous day: at(1, '09:42') = yesterday 9:42 AM. */
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, (seq * 7) % 60), ++seq)
}

/** YYYY-MM-DD for a day before today (channel creation dates). */
const isoDaysAgo = (days: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const person = (id: string, file: string, name: string, title: string, extra: Partial<User> = {}): User => ({
  id,
  name,
  realName: name,
  title,
  avatar: `/avatars/demo/${file}.svg`,
  avatar2x: `/avatars/demo/${file}.svg`,
  presence: 'active',
  timezone: 'America/Los_Angeles',
  ...extra,
})

const app = (id: string, name: string, icon: string): User => ({
  id,
  name,
  realName: name,
  avatar: icon,
  avatar2x: icon,
  presence: 'active',
  isApp: true,
})

export const ME = 'U04ALEXMRG'
const U = {
  alex: ME,
  priya: 'U04PRIYAPT',
  marcus: 'U04MRCSCHN',
  sofia: 'U04SOFIARZ',
  daniel: 'U04DANKIM1',
  emily: 'U04EMWATSN',
  james: 'U04JOKAFOR',
  hannah: 'U04HSCHMDT',
  luis: 'U04LUISFDZ',
  aisha: 'U04AISHARH',
  tom: 'U04TOMBCKR',
  grace: 'U04GRACELU',
  noah: 'U04NOAHWLM',
  drive: 'U04GDRIVE1',
  deploy: 'U04DEPLOYB',
  standup: 'U04STANDUP',
  calendar: 'U04CALNDAR',
}

const users: Record<string, User> = {
  [U.alex]: person(U.alex, 'alex', 'Alex Morgan', 'Senior Product Manager', { pronouns: 'they/them' }),
  [U.priya]: person(U.priya, 'priya', 'Priya Patel', 'Engineering Manager, Platform'),
  [U.marcus]: person(U.marcus, 'marcus', 'Marcus Chen', 'Staff Software Engineer'),
  [U.sofia]: person(U.sofia, 'sofia', 'Sofia Rodriguez', 'Principal Product Designer', { statusEmoji: 'art', statusText: 'Heads down on launch designs' }),
  [U.daniel]: person(U.daniel, 'daniel', 'Daniel Kim', 'Head of Sales', { presence: 'away' }),
  [U.emily]: person(U.emily, 'emily', 'Emily Watson', 'Customer Success Lead'),
  [U.james]: person(U.james, 'james', 'James Okafor', 'Data Scientist', { presence: 'away' }),
  [U.hannah]: person(U.hannah, 'hannah', 'Hannah Schmidt', 'Product Marketing Manager', { statusEmoji: 'palm_tree', statusText: 'OOO until Monday', presence: 'away' }),
  [U.luis]: person(U.luis, 'luis', 'Luis Fernandez', 'Frontend Engineer'),
  [U.aisha]: person(U.aisha, 'aisha', 'Aisha Rahman', 'QA Engineer'),
  [U.tom]: person(U.tom, 'tom', 'Tom Becker', 'CTO'),
  [U.grace]: person(U.grace, 'grace', 'Grace Liu', 'Talent Partner', { presence: 'away' }),
  [U.noah]: person(U.noah, 'noah', 'Noah Williams', 'Account Executive'),
  [U.drive]: app(U.drive, 'Google Drive', '/apps/google-drive-72.png'),
  [U.deploy]: app(U.deploy, 'Deploybot', '/apps/deploybot.svg'),
  [U.standup]: app(U.standup, 'Standup', '/apps/standup.svg'),
  [U.calendar]: app(U.calendar, 'Calendar', '/apps/calendar.svg'),
}

const C = {
  general: 'C04GENERAL',
  announcements: 'C04ANNOUNC',
  product: 'C04PRODUCT',
  engineering: 'C04ENGINER',
  design: 'C04DESIGN1',
  launch: 'C04LAUNCHQ',
  sales: 'C04SALESTM',
  cs: 'C04CUSTSUC',
  marketing: 'C04MARKETG',
  incidents: 'C04INCIDNT',
  random: 'C04RANDOM1',
  leadership: 'C04LEADERS',
  dmPriya: 'D04PRIYA01',
  dmMarcus: 'D04MARCUS1',
  dmSofia: 'D04SOFIA01',
  dmDaniel: 'D04DANIEL1',
  dmSelf: 'D04SELFDM1',
  mpim: 'G04MPIMPMS',
  drive: 'D04GDRIVE1',
  deploy: 'D04DEPLOY1',
  standup: 'D04STANDUP',
  calendar: 'D04CALNDR1',
}

const ch = (id: string, name: string, topic: string, description: string, extra: Partial<Conversation> = {}): Conversation => ({
  id,
  type: 'channel',
  name,
  topic,
  description,
  creatorId: U.tom,
  created: '2023-03-14',
  memberCount: 42,
  ...extra,
})

const conversations: Record<string, Conversation> = {
  [C.general]: ch(C.general, 'general', 'Company-wide announcements and work-based matters', 'This channel is for workspace-wide communication and announcements. All members are in this channel.', { memberCount: 148 }),
  [C.announcements]: ch(C.announcements, 'announcements', 'Big news, one-way. Discussion happens in threads 🙏', 'Official company announcements.', { memberCount: 148 }),
  [C.product]: ch(C.product, 'product', 'Roadmap, specs and feedback · Q4 plan: go/q4-plan', 'Where product decisions get made.', { starred: true, memberCount: 37 }),
  [C.engineering]: ch(C.engineering, 'engineering', 'Deploys, reviews, and help · On-call: @Marcus Chen', 'Engineering discussion and coordination.', { memberCount: 58 }),
  [C.design]: ch(C.design, 'design', 'Crits every Thursday 2pm · Figma: go/design', 'Design team channel.', { memberCount: 16, creatorId: U.sofia }),
  [C.launch]: ch(C.launch, 'launch-atlas', 'Atlas launch war room · Target: Oct 14', 'Private channel for the Atlas launch.', { type: 'private', starred: true, memberCount: 11, creatorId: U.alex, created: isoDaysAgo(2) }),
  [C.sales]: ch(C.sales, 'sales', 'Deals, wins and questions for product', 'Sales team channel.', { memberCount: 29, creatorId: U.daniel }),
  [C.cs]: ch(C.cs, 'customer-success', 'Escalations and customer feedback', 'Customer success team.', { memberCount: 21, creatorId: U.emily }),
  [C.marketing]: ch(C.marketing, 'marketing', 'Campaigns, content and launch comms', 'Marketing team.', { memberCount: 18, creatorId: U.hannah }),
  [C.incidents]: ch(C.incidents, 'incidents', 'Active incidents only · Runbook: go/incident', 'Incident coordination.', { memberCount: 64 }),
  [C.random]: ch(C.random, 'random', 'Non-work banter and water cooler conversation', 'A place for non-work-related flimflam, faffing, hodge-podge or jibber-jabber.', { memberCount: 148 }),
  [C.leadership]: ch(C.leadership, 'leadership', 'Leadership team', 'Private leadership channel.', { type: 'private', memberCount: 7 }),
  [C.dmPriya]: { id: C.dmPriya, type: 'im', name: 'Priya Patel', userId: U.priya },
  [C.dmMarcus]: { id: C.dmMarcus, type: 'im', name: 'Marcus Chen', userId: U.marcus },
  [C.dmSofia]: { id: C.dmSofia, type: 'im', name: 'Sofia Rodriguez', userId: U.sofia },
  [C.dmDaniel]: { id: C.dmDaniel, type: 'im', name: 'Daniel Kim', userId: U.daniel },
  [C.dmSelf]: { id: C.dmSelf, type: 'im', name: 'Alex Morgan', userId: U.alex },
  [C.mpim]: { id: C.mpim, type: 'mpim', name: 'Priya Patel, Marcus Chen', userIds: [U.priya, U.marcus] },
  [C.drive]: { id: C.drive, type: 'app', name: 'Google Drive', userId: U.drive },
  [C.deploy]: { id: C.deploy, type: 'app', name: 'Deploybot', userId: U.deploy },
  [C.standup]: { id: C.standup, type: 'app', name: 'Standup', userId: U.standup },
  [C.calendar]: { id: C.calendar, type: 'app', name: 'Calendar', userId: U.calendar },
}

const m = (ts: string, userId: string, text: string, extra: Partial<Message> = {}): Message => ({ ts, userId, text, ...extra })
const r = (name: string, ...who: string[]) => ({ name, users: who })

// ---------------------------------------------------------------------------------------------
// Conversation history
// ---------------------------------------------------------------------------------------------

const launchKickoff = at(2, '10:04')
const q4Plan = at(1, '09:12')
const deployPost = minsAgo(96)
const onboardingCrit = at(1, '14:02')
const salesWin = minsAgo(210)
const escalation = minsAgo(65)
const incidentPost = at(1, '16:47')
const priyaQ = minsAgo(18)

const messages: Record<string, Message[]> = {
  [C.general]: [
    m(at(3, '09:00'), U.tom, 'Good morning team :sunny: Reminder that our *Q4 all-hands* is this Thursday at 10am PT. Agenda and dial-in are in the calendar invite.', { reactions: [r('+1', U.priya, U.marcus, U.sofia, U.daniel, U.emily), r('raised_hands', U.hannah, U.luis)] }),
    m(at(3, '09:14'), U.grace, 'Please welcome <@U04LUISFDZ> to the Frontend team! :wave: Luis joins us from Lisbon and is already fixing our flakiest tests.', { reactions: [r('wave', U.alex, U.priya, U.sofia, U.marcus, U.aisha, U.tom), r('tada', U.emily, U.daniel)] }),
    m(at(3, '09:21'), U.luis, 'Thanks everyone! Excited to be here :blush:'),
    m(at(1, '11:30'), U.hannah, 'The new brand guidelines are live :art: Everything you need (logos, colors, voice) is in the Brand hub: https://northstar-hq.com/brand'),
    m(minsAgo(140), U.tom, "Huge thanks to everyone who pitched in on the SOC 2 audit. We passed with zero findings :trophy: That's a first for us."),
  ],
  [C.announcements]: [
    m(at(6, '08:30'), U.tom, ':mega: *Office update:* the SF office will be closed Monday for maintenance. Please work from home.'),
    m(at(2, '17:05'), U.tom, ':rocket: *Atlas beta is live* for 12 design partners. Big milestone. Thank you all.', { reactions: [r('tada', U.alex, U.priya, U.marcus, U.sofia, U.daniel, U.emily, U.james), r('rocket', U.luis, U.aisha)] }),
  ],
  [C.product]: [
    m(at(2, '15:40'), U.alex, "Draft PRD for *Atlas smart summaries* is ready for review. I'm mostly looking for feedback on the success metrics section.\nhttps://northstar-hq.com/docs/atlas-summaries-prd", { reactions: [r('eyes', U.priya, U.sofia)] }),
    m(q4Plan, U.priya, 'Q4 plan for Platform, highest priority first:\n1. Atlas GA (summaries + search)\n2. Admin audit logs\n3. SSO for Business+ tier\n4. Mobile offline mode (stretch)', { reactions: [r('white_check_mark', U.alex, U.tom), r('+1', U.marcus)] }),
    m(at(1, '09:20'), U.tom, 'Looks right to me. Can we pull audit logs ahead of SSO? Two enterprise deals are blocked on it.'),
    m(at(1, '09:26'), U.priya, "Yes, that's doable if we keep the scope to read-only logs for v1."),
    m(at(1, '13:15'), U.james, 'Early data from the beta: people who use summaries at least 3x/week retain *2.4x* better at week 4 :chart_with_upwards_trend:', { reactions: [r('exploding_head', U.alex, U.hannah), r('fire', U.priya, U.tom, U.sofia)] }),
    m(minsAgo(55), U.sofia, 'Pushed the updated summary card designs. Main change: the source links now live in the footer so the card is scannable.', { reactions: [r('heart_eyes', U.alex)] }),
    m(minsAgo(12), U.alex, '<@U04SOFIARZ> these look great. Can we review them with <@U04PRIYAPT> tomorrow before the eng kickoff?'),
  ],
  [C.engineering]: [
    m(at(2, '11:02'), U.marcus, 'Heads up: I\'m migrating the job queue to the new cluster tonight. Expect ~5 min of delayed notifications around 11pm PT.'),
    m(at(1, '10:17'), U.luis, 'Anyone else seeing the `useVirtualList` test flake on CI? It passes locally every time.'),
    m(at(1, '10:19'), U.aisha, "Yep. It's a timing issue with ResizeObserver in jsdom. Try this in the test setup:\n```\nglobalThis.ResizeObserver = class {\n  observe() {}\n  unobserve() {}\n  disconnect() {}\n}\n```", { reactions: [r('pray', U.luis), r('100', U.marcus)] }),
    m(at(1, '10:21'), U.luis, 'That fixed it, thank you!'),
    m(deployPost, U.deploy, ':white_check_mark: *Deploy #4812 succeeded* to production\n`api` · `web` · `workers`: 14 commits by Marcus Chen, Luis Fernandez, Aisha Rahman'),
    m(minsAgo(40), U.marcus, 'PR for the search indexer is up. It cuts reindex time from ~40 min to 6. Would love a second pair of eyes <@U04PRIYAPT> :pray:\nhttps://github.com/northstar/atlas/pull/2291', { reactions: [r('eyes', U.priya), r('zap', U.luis, U.aisha)] }),
  ],
  [C.design]: [
    m(at(4, '14:00'), U.sofia, 'Design crit notes from Thursday are in Figma. Next crit: onboarding flow v3.'),
    m(onboardingCrit, U.sofia, 'Onboarding v3 is ready for crit :sparkles: Three changes:\n• Progress bar replaced with a checklist\n• Workspace setup moved to step 1\n• New empty states with sample data', { reactions: [r('fire', U.alex, U.luis), r('heart', U.hannah)] }),
    m(at(1, '14:30'), U.luis, 'Love the checklist. Should the sample data be dismissible in one click?'),
    m(minsAgo(75), U.sofia, 'Updated. Sample data now has a "Clear sample data" button in the banner.'),
  ],
  [C.launch]: [
    m(launchKickoff, U.alex, "Kicking off the *Atlas launch* channel :rocket: This is our war room for the next 3 weeks.\n*Target date:* Oct 14\n*DRI:* me\n*Docs:* launch plan, messaging and FAQ are bookmarked above.", { reactions: [r('rocket', U.priya, U.marcus, U.sofia, U.hannah, U.daniel, U.emily)] }),
    m(at(2, '10:30'), U.hannah, 'Messaging doc v1 is ready. The positioning line: _"Atlas turns every conversation into answers."_ Feedback welcome!'),
    m(at(1, '15:10'), U.daniel, 'Sales enablement session is booked for Oct 9. We need the demo environment by then.'),
    m(at(1, '15:12'), U.alex, "On it. I'll have a stable demo workspace by Oct 7 :saluting_face:"),
    m(minsAgo(150), U.emily, 'Two beta customers asked for a way to share summaries outside Slack. Worth a v1.1 line item?'),
    m(minsAgo(30), U.priya, 'Launch checklist status:\n• :white_check_mark: Load testing\n• :white_check_mark: Security review\n• :hourglass_flowing_sand: Docs (80%)\n• :x: Pricing page copy'),
  ],
  [C.sales]: [
    m(at(2, '16:20'), U.noah, 'Discovery call with Globex went well. They want Atlas in their pilot. Sending the security questionnaire today.'),
    m(salesWin, U.daniel, ':tada: *Closed won:* Initech, 450 seats, 3-year deal! Huge work by <@U04NOAHWLM> and the SE team.', { reactions: [r('tada', U.alex, U.tom, U.emily, U.noah, U.priya), r('moneybag', U.james), r('fire', U.hannah, U.marcus)] }),
    m(minsAgo(100), U.noah, 'Thank you! Couldn\'t have done it without the custom SSO work from Platform :pray:'),
  ],
  [C.cs]: [
    m(at(1, '09:45'), U.emily, 'Weekly NPS: *62* (up from 57). Top theme in comments: "search finally finds things".'),
    m(escalation, U.emily, ':rotating_light: Escalation from Acme Corp: summaries are timing out in their largest channel (40k messages). <@U04MRCSCHN> can someone from Platform take a look?'),
    m(minsAgo(58), U.marcus, 'Looking now. I suspect the pagination change from Tuesday.'),
  ],
  [C.marketing]: [
    m(at(3, '11:00'), U.hannah, 'Launch blog post draft is up for review. Looking for a customer quote, any volunteers? :pray:'),
    m(at(2, '13:25'), U.emily, 'Acme Corp said yes to a quote! Sending it over.', { reactions: [r('star-struck', U.hannah)] }),
  ],
  [C.incidents]: [
    m(incidentPost, U.marcus, ':red_circle: *SEV-2:* Elevated error rate on search API (5%). Investigating.'),
    m(at(1, '17:32'), U.marcus, ':large_green_circle: *Resolved:* bad cache node removed from the pool. Postmortem to follow.', { reactions: [r('pray', U.priya, U.tom, U.alex)] }),
  ],
  [C.random]: [
    m(at(2, '12:10'), U.luis, 'Lunch spot recommendations near the office? Still learning the neighborhood :sandwich:'),
    m(at(2, '12:12'), U.aisha, 'Tacos at La Palma, no contest :taco:', { reactions: [r('100', U.marcus, U.sofia, U.emily)] }),
    m(at(1, '16:05'), U.hannah, 'Friday playlist is up. Add your songs :headphones:'),
    m(minsAgo(25), U.james, 'Someone left an entire cake in the kitchen and I have questions :cake:', { reactions: [r('joy', U.alex, U.luis, U.aisha), r('eyes', U.marcus)] }),
  ],
  [C.leadership]: [m(at(1, '18:00'), U.tom, 'Board deck draft is in the leadership folder. Please review your sections by Wednesday.')],
  [C.dmPriya]: [
    m(at(1, '17:40'), U.alex, 'Do you have 15 min tomorrow to go over Atlas staffing?'),
    m(at(1, '17:52'), U.priya, 'Sure, 10:30 works. I\'ll bring the capacity sheet.'),
    m(priyaQ, U.priya, 'Quick one: is summary sharing (the v1.1 idea from Emily) in scope for GA or not? Engineering needs to know by Thursday.'),
  ],
  [C.dmMarcus]: [
    m(at(2, '19:02'), U.marcus, 'FYI the indexer rewrite is looking really promising. 6x faster in staging :racing_car:'),
    m(at(2, '19:10'), U.alex, "That's amazing. Let's get it into the launch notes."),
  ],
  [C.dmSofia]: [
    m(at(1, '11:05'), U.sofia, 'Sent you the Figma link for the summary cards.'),
    m(at(1, '11:07'), U.alex, 'Thanks! Looking now :eyes:'),
  ],
  [C.dmDaniel]: [m(at(3, '15:30'), U.daniel, 'Can you join the Initech call on Thursday? They want to hear the roadmap from product.'), m(at(3, '15:41'), U.alex, "Yes, I'll be there.")],
  [C.dmSelf]: [m(at(2, '08:15'), U.alex, 'Launch prep:\n• Finalize pricing page copy\n• Record demo video\n• Book sales enablement')],
  [C.mpim]: [
    m(at(1, '12:30'), U.priya, 'Starting a thread for the audit-log scoping so we don\'t lose it.'),
    m(at(1, '12:34'), U.marcus, 'Read-only logs + CSV export feels like the right v1.'),
    m(at(1, '12:40'), U.alex, 'Agreed. Let\'s write it up and share in #product.'),
  ],
  [C.drive]: [
    m(at(2, '09:30'), U.drive, '*Sofia Rodriguez* shared a file with you: *Atlas summary cards (v4)*'),
    m(at(1, '16:00'), U.drive, '*Priya Patel* commented on *Q4 Platform plan*: "Moved audit logs ahead of SSO per Tom."'),
    m(minsAgo(35), U.drive, '*Hannah Schmidt* shared a file with you: *Atlas launch messaging*'),
  ],
  [C.deploy]: [m(at(1, '18:20'), U.deploy, ':white_check_mark: Deploy #4809 succeeded to staging'), m(deployPost, U.deploy, ':white_check_mark: Deploy #4812 succeeded to production')],
  [C.standup]: [m(minsAgo(95), U.standup, "Good morning! :wave: Time for standup. What did you work on yesterday, and what's up today?")],
  [C.calendar]: [m(minsAgo(15), U.calendar, ':calendar: *Atlas design review* starts in 15 minutes\n10:30 – 11:00 AM · Zoom')],
}

const threads: Record<string, Message[]> = {
  [`${C.launch}/${launchKickoff}`]: [
    m(at(2, '10:12'), U.priya, "Engineering is ready. I'll post daily status here at 5pm."),
    m(at(2, '10:15'), U.sofia, 'Design assets for launch are in the Launch folder :art:'),
    m(at(2, '10:31'), U.daniel, "Sales is in. We'll need a one-pager by Oct 1."),
  ],
  [`${C.product}/${q4Plan}`]: [
    m(at(1, '09:30'), U.alex, 'Mobile offline mode is a stretch goal. Should we cut it and protect Atlas GA?'),
    m(at(1, '09:41'), U.tom, "Let's keep it as a stretch but don't staff it until Atlas ships."),
    m(at(1, '09:44'), U.priya, 'Sounds good :+1:'),
  ],
  [`${C.engineering}/${deployPost}`]: [m(minsAgo(90), U.aisha, 'Smoke tests passed :white_check_mark:')],
  [`${C.design}/${onboardingCrit}`]: [
    m(at(1, '14:10'), U.alex, 'The checklist is so much clearer :heart_eyes:'),
    m(at(1, '14:12'), U.hannah, 'Can we get a GIF of this for the launch blog?'),
    m(at(1, '14:25'), U.sofia, 'Yes! Recording one tomorrow.'),
  ],
  [`${C.sales}/${salesWin}`]: [m(minsAgo(190), U.tom, 'Incredible work. Drinks on me Friday :beers:'), m(minsAgo(180), U.emily, "CS is ready for onboarding. Kickoff's scheduled for next week.")],
  [`${C.cs}/${escalation}`]: [m(minsAgo(50), U.marcus, 'Found it. A missing index on the summaries table. Fix is deploying now.'), m(minsAgo(20), U.emily, 'Customer confirmed it works now. Thank you! :pray:')],
  [`${C.incidents}/${incidentPost}`]: [m(at(1, '16:55'), U.priya, 'Paging the search on-call.'), m(at(1, '17:10'), U.marcus, 'Root cause looks like a bad cache node. Draining it now.')],
}

export const demo: Fixture = {
  workspace: WORKSPACE,
  me: ME,
  users,
  conversations,
  sections: [
    { id: 'L04STARRED', kind: 'stars', name: 'Starred', icon: 'star', conversationIds: [C.launch, C.product], description: 'Drag and drop important stuff here' },
    {
      id: 'L04CHANNEL',
      kind: 'channels',
      name: 'Channels',
      icon: 'channel-section',
      conversationIds: [C.announcements, C.cs, C.design, C.engineering, C.general, C.incidents, C.leadership, C.marketing, C.random, C.sales],
      description: 'Press Shift Cmd L to find or create a channel',
    },
    {
      id: 'L04DIRECTM',
      kind: 'direct_messages',
      name: 'Direct messages',
      icon: 'direct-messages',
      conversationIds: [C.dmPriya, C.mpim, C.dmMarcus, C.dmSofia, C.dmDaniel, C.dmSelf],
      description: 'Press Ctrl 3 to find or create a direct message. Press delete to remove a direct message from the sidebar',
    },
    { id: 'L04APPSSEC', kind: 'recent_apps', name: 'Agents & apps', icon: 'ai-agents', conversationIds: [C.calendar, C.deploy, C.drive, C.standup], description: 'Press delete to remove messages from an app from the sidebar' },
  ],
  messages,
  threads,
  unreads: {
    [C.product]: { count: 2, mentions: 0 },
    [C.engineering]: { count: 3, mentions: 1 },
    [C.random]: { count: 1, mentions: 0 },
    [C.dmPriya]: { count: 1, mentions: 1 },
    [C.cs]: { count: 2, mentions: 0 },
    [C.calendar]: { count: 1, mentions: 1 },
  },
  activityBadge: 3,
  sidebarWidth: 260,
  showDrafts: true,
  initial: { tab: 'home', conversationId: C.launch },
}

export const DEMO_IDS = { U, C }

// Area-specific demo data (activity feed, Slackbot chats, app homes, files, …) lives in
// src/data/demo-<area>.ts files that call `extendDemo` at import time; fixtures.ts imports them.
export function extendDemo(patch: (fx: Fixture) => void) {
  patch(demo)
}
