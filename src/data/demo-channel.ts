import { DEMO_IDS, extendDemo } from './demo'

// Channel area demo data: who's in each channel (header facepile, channel details › Members).
// Consistent with the demo's messages: everyone who posts in a channel is a member of it.

const { U, C } = DEMO_IDS
const everyone = [U.alex, U.priya, U.marcus, U.sofia, U.daniel, U.emily, U.james, U.hannah, U.luis, U.aisha, U.tom, U.grace, U.noah]

const MEMBERS: Record<string, string[]> = {
  [C.general]: everyone,
  [C.announcements]: everyone,
  [C.random]: everyone,
  [C.product]: [U.alex, U.priya, U.tom, U.sofia, U.james, U.marcus, U.hannah, U.luis, U.emily],
  [C.engineering]: [U.marcus, U.priya, U.luis, U.aisha, U.tom, U.alex, U.james],
  [C.design]: [U.sofia, U.alex, U.luis, U.hannah, U.priya],
  [C.launch]: [U.alex, U.priya, U.marcus, U.sofia, U.hannah, U.daniel, U.emily, U.tom],
  [C.sales]: [U.daniel, U.noah, U.emily, U.tom, U.alex],
  [C.cs]: [U.emily, U.marcus, U.alex, U.noah, U.daniel, U.aisha],
  [C.marketing]: [U.hannah, U.emily, U.alex, U.sofia, U.grace],
  [C.incidents]: [U.marcus, U.priya, U.tom, U.aisha, U.luis, U.alex],
  [C.leadership]: [U.tom, U.alex, U.priya, U.daniel, U.hannah, U.emily, U.grace],
}

extendDemo((fx) => {
  for (const [id, memberIds] of Object.entries(MEMBERS)) {
    const conv = fx.conversations[id]
    if (conv) Object.assign(conv, { memberIds, memberCount: memberIds.length })
  }
  // Unstarring everything should show Slack's empty-section hint, like the live client.
  const stars = fx.sections.find((s) => s.kind === 'stars')
  if (stars && !stars.emptyBanner) stars.emptyBanner = 'Drag and drop important stuff here'
})
