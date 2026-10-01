import { DEMO_IDS } from '../../data/demo'
import type { Fixture } from '../../data/types'

// AI huddle notes: what Slack AI posts in a huddle's thread once it ends (spec §3.10 "AI notes"). Ported from the web
// clone (slack-remix src/components/huddles/notes.ts): the demo channels get notes that follow the Atlas launch story;
// anywhere else (a prototype's channels and people) gets a short recap built from who was there. Notes for the huddles
// already in the demo's history live with that data (src/data/demo-huddles.ts).

const { U, C } = DEMO_IDS
const at = (id: string) => `<@${id}>`

/** Notes for a huddle that happens live, keyed by conversation (only used when the demo's people are there). */
const LIVE: Record<string, string> = {
  [C.launch]: [
    '*Summary*',
    'The team ran through the Atlas launch checklist ahead of GA on *Oct 14*. Load testing (3x peak) and the security review are done. Docs are at 80% and waiting on final UI screenshots, and the pricing page copy is the last open item. Summary sharing, the v1.1 request from beta customers, stays out of GA scope.',
    '',
    '*Decisions*',
    '• Summary sharing ships in v1.1, not at GA',
    '• Code freeze stays on Oct 10',
    '',
    '*Action items*',
    `• ${at(U.alex)} Finalize the pricing page copy with ${at(U.hannah)} by Thursday`,
    `• ${at(U.priya)} Let engineering know summary sharing is v1.1, not GA`,
    `• ${at(U.marcus)} Share the beta-cohort rollout plan in <#${C.engineering}>`,
    `• ${at(U.sofia)} Send the final UI screenshots for the docs`,
  ].join('\n'),
  [C.product]: [
    '*Summary*',
    'Review of the updated summary card designs before the eng kickoff. Source links now live in the card footer, which keeps cards scannable. Audit logs stay ahead of SSO in the Q4 plan, scoped to read-only logs for v1.',
    '',
    '*Action items*',
    `• ${at(U.sofia)} Share the final card specs with engineering`,
    `• ${at(U.priya)} Confirm the audit log scope with ${at(U.tom)}`,
    `• ${at(U.alex)} Update the Atlas roadmap in the product hub`,
  ].join('\n'),
  [C.engineering]: [
    '*Summary*',
    'The team reviewed the search indexer PR, which cuts reindex time from ~40 minutes to 6. It merges before the Oct 10 code freeze, and the admin settings tests close the last coverage gap for Atlas.',
    '',
    '*Action items*',
    `• ${at(U.priya)} Review the indexer PR today`,
    `• ${at(U.marcus)} Finish the admin settings tests`,
    `• ${at(U.aisha)} Rerun the regression suite once the PR lands`,
  ].join('\n'),
  [C.design]: [
    '*Summary*',
    'Quick crit of onboarding v3. The checklist replaces the progress bar, workspace setup moves to step 1, and sample data can be cleared from the banner in one click.',
    '',
    '*Action items*',
    `• ${at(U.sofia)} Record a GIF of the checklist for the launch blog`,
    `• ${at(U.luis)} Build the "Clear sample data" banner`,
    `• ${at(U.hannah)} Pick the hero illustration for the blog post`,
  ].join('\n'),
  [C.dmPriya]: [
    '*Summary*',
    'Alex and Priya talked through Atlas staffing and the summary sharing question from engineering. Sharing is out of scope for GA and moves to v1.1.',
    '',
    '*Action items*',
    `• ${at(U.priya)} Tell engineering summary sharing is v1.1 by Thursday`,
    `• ${at(U.alex)} Add summary sharing to the v1.1 plan`,
  ].join('\n'),
}

/** The AI notes for a huddle that just ended. */
export function liveNotes(fx: Fixture, conversationId: string, participantIds: string[]): string {
  // The story notes mention the demo's people, so they're only used when those people are in the workspace.
  const storyPeople = [U.alex, U.priya, U.marcus, U.sofia, U.hannah]
  if (LIVE[conversationId] && fx.me === U.alex && storyPeople.every((id) => fx.users[id])) return LIVE[conversationId]
  const conv = fx.conversations[conversationId]
  const others = participantIds.filter((id) => id !== fx.me)
  const names = participantIds.map((id) => fx.users[id]?.realName ?? 'Someone')
  const list = names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join(' and ')
  const where = conv && (conv.type === 'channel' || conv.type === 'private') ? ` in <#${conv.id}>` : ''
  const items = [
    `• ${at(fx.me)} Post a short recap${where}`,
    ...others.slice(0, 2).map((id, i) => `• ${at(id)} ${i === 0 ? 'Follow up on the open questions' : 'Share the next steps with the team'}`),
  ]
  return ['*Summary*', `${list} caught up${where}, went through the open questions and agreed on next steps.`, '', '*Action items*', ...items].join('\n')
}
