// Huddles in the demo's history (huddles area). The Home › Huddles list comes from demo-search.ts's
// `fx.huddles`; this file gives those huddles their "A huddle happened" cards in the conversations
// they happened in, with the thread replies the list counts and the AI huddle notes. It imports
// demo-search.ts first so the records exist when it runs.
import './demo-search'
import { DEMO_IDS, extendDemo } from './demo'
import type { HuddleRecord, Message } from './types'

const { U, C } = DEMO_IDS
const at = (id: string) => `<@${id}>`

/** AI huddle notes for the huddles that had them, keyed by room id. */
const NOTES: Record<string, string> = {
  R04HDL00001: [
    '*Summary*',
    'Crit of the Atlas summary card designs. Source links move into the card footer so cards stay scannable, and the "Clear sample data" button stays in the onboarding banner. Hannah asked for a dark mode version of the hero illustration for the launch blog.',
    '',
    '*Action items*',
    `• ${at(U.sofia)} Update the summary card specs in Figma and share them with engineering`,
    `• ${at(U.luis)} Prototype the footer source links in the web app`,
    `• ${at(U.hannah)} Draft the launch blog copy around the new cards`,
  ].join('\n'),
  R04HDL00003: [
    '*Summary*',
    'Launch sync with Sales and CS. Daniel confirmed the sales enablement session on *Oct 9*, and Alex will have a stable demo workspace ready by *Oct 7*. Emily walked through the CS FAQ: summaries follow each workspace’s retention policy, so there’s no separate copy to explain. Marcus shared the load test plan (3x current peak).',
    '',
    '*Action items*',
    `• ${at(U.alex)} Stand up the demo workspace for enablement by Oct 7`,
    `• ${at(U.daniel)} Send the enablement agenda to the sales team`,
    `• ${at(U.emily)} Publish the CS FAQ with the retention answer`,
    `• ${at(U.marcus)} Run the 3x load test and post the results in <#${C.launch}>`,
  ].join('\n'),
  R04HDL00007: [
    '*Summary*',
    'Planning session for Atlas after the beta. James shared early usage data: teams that use summaries at least 3x a week retain much better. The group agreed to prioritize summary sharing and admin controls for v1.1 and to explore summaries for huddles next.',
    '',
    '*Action items*',
    `• ${at(U.alex)} Kick off v1.1 discovery and share the top asks in <#${C.product}>`,
    `• ${at(U.james)} Pull usage data for the top three beta requests`,
    `• ${at(U.sofia)} Start explorations for huddle summaries`,
    `• ${at(U.priya)} Estimate engineering capacity for v1.1`,
  ].join('\n'),
}

/** Thread replies posted during each huddle: [minutes after it started, who, text]. `notes` marks where the AI notes land. */
const REPLIES: Record<string, ([number, string, string] | 'notes')[]> = {
  R04HDL00001: [[6, U.sofia, 'Updated cards are in Figma: https://northstar-hq.com/figma/summary-cards-v5 :art:'], 'notes', [21, U.hannah, 'Thanks! Starting the blog copy tomorrow :writing_hand:']],
  R04HDL00003: [
    [4, U.marcus, 'Load test plan for reference: https://northstar-hq.com/docs/atlas-load-test-plan'],
    [11, U.emily, 'CS FAQ draft: https://northstar-hq.com/docs/atlas-cs-faq'],
    [19, U.daniel, 'Enablement agenda is on the Oct 9 invite :calendar:'],
    'notes',
    [36, U.alex, 'Thanks all! Demo workspace ETA is Oct 7 :saluting_face:'],
  ],
  R04HDL00004: [
    [9, U.marcus, 'Draining the bad cache node now; error rate is already dropping :chart_with_downwards_trend:'],
    [38, U.priya, 'Postmortem doc is up: https://northstar-hq.com/docs/pm-search-cache'],
  ],
  R04HDL00007: [
    [8, U.james, 'Retention chart from the beta: https://northstar-hq.com/docs/atlas-beta-retention :chart_with_upwards_trend:'],
    [30, U.tom, 'Great session. Let’s lock v1.1 scope by next Friday.'],
    'notes',
    [49, U.sofia, 'I’ll start the huddle summary explorations this week :art:'],
    [52, U.priya, 'Capacity estimate coming Monday :+1:'],
    [55, U.james, 'Pulling usage data for the top three asks now'],
    [58, U.alex, 'Thanks everyone, I’ll post the discovery kickoff here tomorrow.'],
  ],
}

/** Cards are skipped where they'd move a seeded "New" divider (#engineering starts with unread messages). */
const SKIP = new Set<string>([C.engineering])

const shift = (ts: string, minutes: number, n = 0) => `${Math.floor(parseFloat(ts)) + Math.round(minutes * 60)}.${String(810000 + n * 1013).slice(0, 6)}`

extendDemo((fx) => {
  const records: HuddleRecord[] = fx.huddles ?? []
  records.forEach((h, i) => {
    if (SKIP.has(h.conversationId) || !fx.conversations[h.conversationId]) return
    const end = shift(h.start, h.minutes, i)
    const notes = !!h.notes && !!NOTES[h.id]
    const room = { id: h.id, participantIds: h.participantIds, start: h.start, end, notes }
    const card: Message = { ts: h.start, userId: h.participantIds[0], text: 'A huddle happened', subtype: 'huddle_thread', room }
    const list = fx.messages[h.conversationId] ?? []
    if (list.some((m) => m.ts === card.ts)) return
    fx.messages[h.conversationId] = [...list, card].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
    const replies = (REPLIES[h.id] ?? []).flatMap((r, k): Message[] => {
      if (r === 'notes') return notes ? [{ ts: shift(end, 1, 50 + k), userId: h.participantIds[0], text: NOTES[h.id], subtype: 'huddle_notes', room }] : []
      const [mins, userId, text] = r
      return [{ ts: shift(h.start, mins, 20 + k), userId, text }]
    })
    if (replies.length) fx.threads = { ...fx.threads, [`${h.conversationId}/${h.start}`]: replies }
  })
})
