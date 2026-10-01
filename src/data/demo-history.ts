import type { Message } from './types'
import { makeTs } from '../lib/time'
import { DEMO_IDS, extendDemo } from './demo'

// Older history for the demo workspace, so channels feel lived-in when you scroll up: the week
// leading up to the Atlas launch push, plus a few more threads. Only adds messages; everything in
// demo.ts (which other areas reference by ts) is untouched.

const { U, C } = DEMO_IDS
const now = new Date()
let seq = 400
const at = (daysAgo: number, time: string) => {
  const [h, mm] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, mm, (seq * 11) % 60), ++seq)
}
const m = (ts: string, userId: string, text: string, extra: Partial<Message> = {}): Message => ({ ts, userId, text, ...extra })
const r = (name: string, ...who: string[]) => ({ name, users: who })

extendDemo((fx) => {
  const add = (conversationId: string, list: Message[]) => {
    fx.messages[conversationId] = [...list, ...(fx.messages[conversationId] ?? [])].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  }
  const thread = (conversationId: string, parentTs: string, replies: Message[]) => {
    const key = `${conversationId}/${parentTs}`
    fx.threads = { ...fx.threads, [key]: [...(fx.threads?.[key] ?? []), ...replies] }
  }

  // #general
  const referrals = at(4, '10:15')
  add(C.general, [
    m(at(7, '09:05'), U.grace, 'Happy Monday! :wave: Three new teammates start this week. Keep an eye on #general for intros.', { reactions: [r('wave', U.tom, U.priya, U.emily)] }),
    m(at(6, '12:30'), U.tom, '*Lunch & learn on Wednesday:* <@U04JOKAFOR> on what our retention data says about Atlas :bar_chart: Pizza provided.', {
      reactions: [r('pizza', U.luis, U.aisha, U.marcus), r('eyes', U.alex)],
    }),
    m(at(5, '16:02'), U.hannah, 'Offsite photos are up :camera_with_flash: Thanks to everyone who made the trip.', { reactions: [r('heart', U.sofia, U.emily, U.grace, U.daniel)] }),
    m(referrals, U.grace, '*We’re hiring:* Senior Backend Engineer, Product Designer and an EMEA Account Executive. The referral bonus is doubled through October :moneybag:'),
    m(at(2, '09:32'), U.emily, 'Customer shout-out :tada: Acme’s support team says Atlas cut their triage time in half.', {
      reactions: [r('tada', U.alex, U.priya, U.marcus, U.tom), r('heart_eyes', U.sofia)],
    }),
  ])
  thread(C.general, referrals, [
    m(at(4, '10:40'), U.marcus, 'Already referred two backend folks :raised_hands:'),
    m(at(4, '11:02'), U.grace, 'Thank you <@U04MRCSCHN>! I’ll reach out to both today.'),
  ])

  // #product
  const discovery = at(6, '10:00')
  add(C.product, [
    m(discovery, U.alex, 'Kicking off discovery for *Atlas v1.1*. Top asks from the beta so far:\n1. Share summaries outside Slack\n2. Summaries for huddles\n3. Admin controls for sensitive channels', {
      reactions: [r('eyes', U.priya, U.sofia, U.james)],
    }),
    m(at(6, '10:22'), U.james, 'I can pull usage data for each of those. Should have it by Thursday.'),
    m(at(5, '14:10'), U.sofia, 'Early explorations for huddle summaries :art: https://northstar-hq.com/figma/huddle-summaries'),
    m(at(5, '14:35'), U.priya, 'Huddle summaries need transcription infra we don’t have yet. Realistically that’s v1.2.'),
    m(at(4, '11:00'), U.tom, 'Agreed. Let’s keep v1.1 small: sharing + admin controls. Huddles in v1.2.', { reactions: [r('+1', U.alex, U.priya)] }),
    m(at(3, '15:30'), U.alex, 'Roadmap is updated in the product hub :world_map:\n• *v1.1:* sharing + admin controls\n• *v1.2:* huddle summaries'),
  ])
  thread(C.product, discovery, [
    m(at(6, '10:31'), U.emily, 'Sharing is the #1 ask on CS calls too.'),
    m(at(6, '10:48'), U.daniel, 'Admin controls come up in every enterprise deal we’re in.'),
    m(at(6, '11:05'), U.alex, 'Super helpful, thank you both. I’ll weight those in the scoring.'),
  ])

  // #engineering
  const freeze = at(5, '09:30')
  add(C.engineering, [
    m(freeze, U.priya, 'Reminder: code freeze for Atlas GA starts *Oct 10*. Anything not merged by then ships in v1.1.', { reactions: [r('white_check_mark', U.marcus, U.luis, U.aisha)] }),
    m(at(4, '15:20'), U.aisha, 'Regression suite for Atlas is at *94%* coverage. The remaining gaps are the admin settings pages.'),
    m(at(4, '15:41'), U.marcus, 'I’ll take the admin settings tests.'),
    m(at(3, '11:10'), U.deploy, ':white_check_mark: *Deploy #4801 succeeded* to production\n`api` · `web`: 9 commits by Priya Patel, Luis Fernandez'),
    m(at(3, '17:02'), U.tom, 'Great progress this week, team. Atlas GA feels real :rocket:', { reactions: [r('rocket', U.priya, U.marcus, U.luis, U.aisha)] }),
  ])
  thread(C.engineering, freeze, [
    m(at(5, '09:45'), U.luis, 'Noted! My summary card PR should land Monday.'),
    m(at(5, '09:52'), U.marcus, 'Indexer rewrite will be in well before then.'),
  ])

  // #design
  add(C.design, [
    m(at(6, '11:00'), U.sofia, 'Sharing the new icon set for Atlas. Feedback welcome before Friday :art:', { reactions: [r('fire', U.luis, U.alex, U.hannah)] }),
    m(at(6, '11:20'), U.luis, 'These look great. Will they ship as an SVG sprite?'),
    m(at(6, '11:24'), U.sofia, 'Yes, a sprite plus React components. Handing off tomorrow.'),
    m(at(5, '16:45'), U.hannah, 'Could we get a dark mode version of the hero illustration for the blog?'),
    m(at(5, '17:03'), U.sofia, 'On it :crescent_moon:'),
  ])

  // #launch-atlas (all after the kickoff two days ago)
  const dailyStatus = at(1, '09:00')
  add(C.launch, [
    m(at(2, '11:00'), U.marcus, 'Load test plan is in the launch folder. We’re targeting *3x* current peak traffic.'),
    m(at(2, '14:20'), U.emily, 'CS FAQ draft is started. What’s our answer on data retention for summaries?'),
    m(at(2, '14:28'), U.priya, 'Summaries follow the workspace’s retention policy. We don’t store a separate copy.', { reactions: [r('pray', U.emily)] }),
    m(dailyStatus, U.priya, '*Daily status* :memo:\n• Load tests: passing at 3x peak\n• Security review: complete\n• Docs: 60%', { reactions: [r('white_check_mark', U.alex, U.tom)] }),
    m(at(1, '11:40'), U.sofia, 'Launch hero and social assets are ready for review :sparkles:', { reactions: [r('heart_eyes', U.hannah, U.alex)] }),
  ])
  thread(C.launch, dailyStatus, [
    m(at(1, '09:14'), U.alex, 'Nice. What’s blocking the docs?'),
    m(at(1, '09:20'), U.priya, 'Screenshots. Waiting on the final UI, which lands tomorrow.'),
  ])

  // #random
  add(C.random, [
    m(at(6, '15:30'), U.marcus, 'Office dog of the week :dog: Biscuit approves of the new standing desks.', { reactions: [r('heart', U.aisha, U.luis, U.sofia, U.emily, U.james)] }),
    m(at(5, '10:05'), U.emily, 'Who’s in for the 5k on Saturday? :running:'),
    m(at(5, '10:09'), U.james, 'Me! Slowly.', { reactions: [r('joy', U.emily, U.marcus)] }),
    m(at(4, '18:12'), U.aisha, 'Board game night Thursday. Bring snacks :game_die:'),
  ])

  // #sales
  add(C.sales, [
    m(at(5, '09:10'), U.daniel, 'Pipeline review at 11. Please update your opportunities before then :pray:'),
    m(at(4, '14:40'), U.noah, 'Globex security review is done. They asked great questions about data retention.'),
    m(at(3, '16:15'), U.daniel, 'Q4 target is *$2.4M* new ARR. We’re at 38% with a strong pipeline :chart_with_upwards_trend:'),
  ])

  // #customer-success
  add(C.cs, [
    m(at(5, '11:30'), U.emily, 'New onboarding checklist for enterprise customers is live in the CS hub.'),
    m(at(3, '10:20'), U.emily, 'Heads up: Initech onboarding kicks off next Tuesday. 450 seats!', { reactions: [r('tada', U.daniel, U.noah)] }),
  ])

  // #marketing
  add(C.marketing, [
    m(at(6, '09:40'), U.hannah, 'Launch timeline for Atlas is in the marketing calendar. Blog, webinar and a customer story in launch week.'),
    m(at(5, '15:15'), U.hannah, 'Webinar registration page is live :tada: https://northstar-hq.com/webinars/atlas'),
  ])

  // #incidents
  add(C.incidents, [
    m(at(6, '22:10'), U.marcus, ':large_yellow_circle: *SEV-3:* Delayed notifications for ~5 minutes during the job queue migration.'),
    m(at(6, '22:31'), U.marcus, ':large_green_circle: *Resolved:* migration complete, queue caught up.'),
  ])

  // #leadership
  add(C.leadership, [
    m(at(4, '08:45'), U.tom, 'Hiring plan for Q4 is approved: +4 engineering, +2 sales, +1 design.'),
    m(at(3, '13:10'), U.daniel, 'Sales comp plan draft is in the folder for review.'),
  ])

  // DMs
  add(C.dmPriya, [
    m(at(4, '16:20'), U.priya, 'Thanks for covering the roadmap review today :pray:'),
    m(at(4, '16:24'), U.alex, 'Of course! Your team’s estimates made it easy.'),
  ])
  add(C.dmMarcus, [m(at(4, '12:02'), U.alex, 'Lunch? I want to hear more about the indexer.'), m(at(4, '12:04'), U.marcus, 'Tacos? :taco:')])
  add(C.dmSofia, [m(at(3, '17:30'), U.sofia, 'Do you have a sec to look at the onboarding copy tomorrow?'), m(at(3, '17:41'), U.alex, 'Yes, first thing :sunrise:')])
})
