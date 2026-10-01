import { DEMO_IDS, extendDemo } from './demo'
import { makeTs } from '../lib/time'
import type { FileAttachment, Message, MessageAttachment } from './types'

// Media area demo data: link previews (Northstar pages, a GitHub PR, Figma and Google Docs), uploaded
// images and PDFs, a Google Drive file and custom-emoji reactions. Images are original mocks in
// public/demo. Messages from other areas are found by their text and only gain optional fields.

const { U, C } = DEMO_IDS

let seq = 900
const now = new Date()
const minsAgo = (mins: number) => makeTs(new Date(now.getTime() - mins * 60_000), ++seq)
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, (seq * 17) % 60), ++seq)
}

const ICON = {
  northstar: '/demo/icons/northstar.svg',
  atlas: '/demo/icons/atlas.svg',
  github: '/demo/icons/github.svg',
  figma: '/demo/icons/figma.svg',
  docs: '/demo/icons/google-docs.svg',
}

const LINK = {
  brand: 'https://northstar-hq.com/brand',
  prd: 'https://northstar-hq.com/docs/atlas-summaries-prd',
  huddles: 'https://northstar-hq.com/figma/huddle-summaries',
  webinar: 'https://northstar-hq.com/webinars/atlas',
  pr: 'https://github.com/northstar/atlas/pull/2291',
  pr2: 'https://github.com/northstar/atlas/pull/2304',
  figma: 'https://www.figma.com/design/k3AtlasCards/Atlas-Summary-Cards-v4',
  doc: 'https://docs.google.com/document/d/1xAtlasLaunchMessaging/edit',
}

/** Link previews by URL. Seeded messages use them, and links sent during the demo unfurl from here. */
const UNFURLS: Record<string, MessageAttachment> = {
  [LINK.brand]: {
    id: 1,
    fromUrl: LINK.brand,
    serviceName: 'northstar-hq.com',
    serviceIcon: ICON.northstar,
    title: 'Northstar Brand Hub',
    titleLink: LINK.brand,
    text: 'Logos, color, typography and voice guidelines for everything we ship. Download the new asset kit and templates.',
    thumbUrl: '/demo/thumb-brand-hub.svg',
    thumbWidth: 400,
    thumbHeight: 400,
  },
  [LINK.prd]: {
    id: 1,
    fromUrl: LINK.prd,
    serviceName: 'Northstar Docs',
    serviceIcon: ICON.atlas,
    title: 'Atlas smart summaries: product requirements',
    titleLink: LINK.prd,
    text: 'Goals, user stories and success metrics for smart summaries in Atlas GA. Draft for review by Platform and Design.',
    thumbUrl: '/demo/thumb-summaries-prd.svg',
    thumbWidth: 400,
    thumbHeight: 400,
  },
  [LINK.huddles]: {
    id: 1,
    fromUrl: LINK.huddles,
    serviceName: 'northstar-hq.com',
    serviceIcon: ICON.northstar,
    title: 'Huddle summaries: explorations, round 1',
    titleLink: LINK.huddles,
    text: 'Three directions for summarizing huddles: a card after the huddle, notes in the thread and a daily digest.',
    thumbUrl: '/demo/thumb-huddle-summaries.svg',
    thumbWidth: 400,
    thumbHeight: 400,
  },
  [LINK.webinar]: {
    id: 1,
    fromUrl: LINK.webinar,
    serviceName: 'northstar-hq.com',
    serviceIcon: ICON.northstar,
    title: 'Meet Atlas: every conversation, answered',
    titleLink: LINK.webinar,
    text: 'Live webinar on Thursday, October 16 at 10:00 AM PT with Tom Becker and Hannah Schmidt. Save your seat.',
    thumbUrl: '/demo/thumb-webinar.svg',
    thumbWidth: 400,
    thumbHeight: 400,
  },
  [LINK.pr]: {
    id: 1,
    fromUrl: LINK.pr,
    botId: 'B04GITHUB1',
    color: '#1f883d',
    authorName: 'marcus-chen',
    authorIcon: '/avatars/demo/marcus.svg',
    authorLink: 'https://github.com/marcus-chen',
    title: '#2291 Search indexer: batch writes and shard reindexing',
    titleLink: LINK.pr,
    text: 'Rewrites the reindex job to batch writes and shard the work across 8 workers. Reindexing drops from ~40 min to 6 min in staging. The search API now returns `highlights` instead of `snippet`.',
    fields: [
      { title: 'Status', value: 'Open · review requested', short: true },
      { title: 'Changes', value: '+412 −128 in 14 files', short: true },
      { title: 'Reviewers', value: 'priya-patel, aisha-rahman', short: true },
      { title: 'Labels', value: 'search, performance', short: true },
    ],
    footer: 'northstar/atlas',
    footerIcon: ICON.github,
  },
  [LINK.pr2]: {
    id: 1,
    fromUrl: LINK.pr2,
    botId: 'B04GITHUB1',
    color: '#1f883d',
    authorName: 'luis-fernandez',
    authorIcon: '/avatars/demo/luis.svg',
    authorLink: 'https://github.com/luis-fernandez',
    title: '#2304 Summary cards: v4 layout and dark theme',
    titleLink: LINK.pr2,
    text: 'Implements the v4 summary card from Figma: sources move to the footer, status pills, and dark theme tokens. Screenshots in the description.',
    fields: [
      { title: 'Status', value: 'Open · review requested', short: true },
      { title: 'Changes', value: '+268 −91 in 9 files', short: true },
    ],
    footer: 'northstar/atlas',
    footerIcon: ICON.github,
  },
  [LINK.figma]: {
    id: 1,
    fromUrl: LINK.figma,
    botId: 'B04FIGMA01',
    serviceName: 'Figma',
    serviceIcon: ICON.figma,
    title: 'Atlas: Summary cards v4',
    titleLink: LINK.figma,
    text: 'Edited just now by Sofia Rodriguez',
    imageUrl: '/demo/figma-summary-cards.svg',
    imageWidth: 1600,
    imageHeight: 1000,
  },
  [LINK.doc]: {
    id: 1,
    fromUrl: LINK.doc,
    serviceName: 'Google Docs',
    serviceIcon: ICON.docs,
    title: 'Atlas launch messaging',
    titleLink: LINK.doc,
    text: 'Positioning: _Atlas turns every conversation into answers._ Audience, proof points, launch FAQ and the approved customer quotes.',
    thumbUrl: '/demo/thumb-doc-messaging.svg',
    thumbWidth: 400,
    thumbHeight: 400,
  },
}

const unfurl = (url: string, extra: Partial<MessageAttachment> = {}): MessageAttachment => ({ ...UNFURLS[url], ...extra })

// ---- files ---------------------------------------------------------------------------------------

const image = (id: string, name: string, url: string, width: number, height: number, size: number): FileAttachment => ({
  id,
  name,
  title: name,
  mimetype: 'image/png',
  filetype: 'png',
  prettyType: 'PNG',
  url,
  width,
  height,
  size,
})

const FILES = {
  cardsLight: image('F04CARDSV41', 'summary-cards-v4-light.png', '/demo/summary-cards-v4-light.svg', 1600, 1000, 482_113),
  cardsDark: image('F04CARDSV42', 'summary-cards-v4-dark.png', '/demo/summary-cards-v4-dark.svg', 1600, 1000, 455_870),
  cardSpec: image('F04CARDSPEC', 'summary-card-spec.png', '/demo/summary-card-spec.svg', 1200, 1200, 318_442),
  onboarding: image('F04ONBRDSMP', 'onboarding-v3-sample-data.png', '/demo/onboarding-v3-sample-data.svg', 1440, 900, 402_975),
  heroLight: image('F04HEROLGT1', 'launch-hero-light.png', '/demo/launch-hero-light.svg', 1600, 900, 512_004),
  heroDark: image('F04HERODRK1', 'launch-hero-dark.png', '/demo/launch-hero-dark.svg', 1600, 900, 498_330),
  incident: image('F04SEV2SRCH', 'search-api-errors.png', '/demo/search-api-errors.svg', 1600, 900, 276_301),
  onePager: {
    id: 'F04ONEPAGER',
    name: 'Atlas launch one-pager.pdf',
    title: 'Atlas launch one-pager.pdf',
    mimetype: 'application/pdf',
    filetype: 'pdf',
    prettyType: 'PDF',
    url: '/demo/atlas-launch-one-pager.svg',
    size: 1_248_512,
    preview: '/demo/atlas-launch-one-pager.svg',
    previewWidth: 1275,
    previewHeight: 1650,
  } satisfies FileAttachment,
  pipeline: {
    id: 'F04PIPELINE',
    name: 'Q4 pipeline tracker',
    title: 'Q4 pipeline tracker',
    mimetype: 'application/vnd.google-apps.spreadsheet',
    filetype: 'gsheet',
    prettyType: 'Google Sheets',
    url: 'https://docs.google.com/spreadsheets/d/1xNorthstarQ4Pipeline/edit',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1xNorthstarQ4Pipeline/edit',
  } satisfies FileAttachment,
}

/** Files and links other parts of the demo can reuse (director beats). */
export const DEMO_FILES = FILES
export const DEMO_LINKS = LINK

extendDemo((fx) => {
  fx.unfurls = { ...fx.unfurls, ...UNFURLS }
  const threads = (fx.threads ??= {})
  const find = (conv: string, prefix: string) => fx.messages[conv]?.find((x) => x.text.startsWith(prefix))
  const patch = (conv: string, prefix: string, extra: Partial<Message>) => {
    const m = find(conv, prefix)
    if (m) Object.assign(m, extra)
    return m
  }
  const react = (m: Message | undefined, name: string, ...users: string[]) => {
    if (m) m.reactions = [...(m.reactions ?? []), { name, users }]
  }
  const add = (conv: string, m: Message) => {
    const list = (fx.messages[conv] ??= [])
    list.push(m)
    list.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
    return m
  }
  const reply = (conv: string, parent: Message | undefined, m: Message) => {
    if (!parent) return
    const key = `${conv}/${parent.ts}`
    threads[key] = [...(threads[key] ?? []), m].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  }

  // #general: the brand hub link unfurls; the SOC 2 news gets a :northstar:
  patch(C.general, 'The new brand guidelines are live', { attachments: [unfurl(LINK.brand)] })
  react(find(C.general, 'Huge thanks to everyone who pitched in on the SOC 2'), 'northstar', U.alex, U.priya, U.emily, U.grace)

  // #announcements
  react(find(C.announcements, ':rocket: *Atlas beta is live*'), 'atlas', U.sofia, U.hannah, U.noah)

  // #product: Alex's PRD link (removable, it's yours), Sofia's huddle explorations and her updated designs
  patch(C.product, 'Draft PRD for *Atlas smart summaries*', { attachments: [unfurl(LINK.prd)] })
  patch(C.product, 'Early explorations for huddle summaries', { attachments: [unfurl(LINK.huddles)] })
  patch(C.product, 'Pushed the updated summary card designs', { files: [FILES.cardsLight] })

  // #engineering: the GitHub PR unfurls, with a review thread; the deploy gets :shipit:
  const pr = find(C.engineering, 'PR for the search indexer is up')
  if (pr) pr.attachments = [unfurl(LINK.pr, { ts: pr.ts })]
  react(pr, 'shipit', U.luis)
  reply(C.engineering, pr, { ts: minsAgo(34), userId: U.priya, text: 'Reviewed. The batching is really clean :lgtm: Left one nit on the retry backoff.' })
  reply(C.engineering, pr, { ts: minsAgo(31), userId: U.marcus, text: 'Fixed the nit, merging once CI is green :shipit:', reactions: [{ name: 'partystar', users: [U.luis, U.aisha] }] })
  react(find(C.engineering, ':white_check_mark: *Deploy #4812 succeeded*'), 'shipit', U.marcus, U.aisha)

  // #design: the v4 mocks (a gallery), the Figma file and the sample-data banner screenshot
  add(C.design, {
    ts: at(1, '10:40'),
    userId: U.sofia,
    text: 'Summary cards v4 for Thursday’s crit :art: Light and dark, plus the spec for handoff.',
    files: [FILES.cardsLight, FILES.cardsDark, FILES.cardSpec],
    reactions: [
      { name: 'heart_eyes', users: [U.alex, U.hannah] },
      { name: 'partystar', users: [U.luis] },
    ],
  })
  add(C.design, {
    ts: at(1, '10:43'),
    userId: U.sofia,
    text: `Figma file is here if you’d rather leave comments there :point_down: ${LINK.figma}`,
    attachments: [unfurl(LINK.figma)],
  })
  patch(C.design, 'Updated. Sample data now has a', { files: [FILES.onboarding] })

  // #launch-atlas: the messaging doc (Google Docs) and your launch one-pager (PDF)
  add(C.launch, { ts: at(2, '10:32'), userId: U.hannah, text: `Doc is here, comment away: ${LINK.doc}`, attachments: [unfurl(LINK.doc)] })
  add(C.launch, {
    ts: at(1, '10:05'),
    userId: U.alex,
    text: 'Here’s the launch one-pager for sales enablement :page_facing_up: <@U04DANKIM1> it covers everything for the Oct 9 session. Edits welcome until Thursday.',
    files: [FILES.onePager],
    reactions: [{ name: 'raised_hands', users: [U.daniel, U.noah] }],
  })
  react(find(C.launch, 'Kicking off the *Atlas launch*'), 'atlas-launch', U.tom, U.luis, U.aisha)

  // #incidents: the dashboard screenshot on the SEV-2
  patch(C.incidents, ':red_circle: *SEV-2:* Elevated error rate on search API', { files: [FILES.incident] })

  // #marketing: webinar page
  patch(C.marketing, 'Webinar registration page is live', { attachments: [unfurl(LINK.webinar)] })

  // #sales: the pipeline tracker lives in Google Drive; the Initech win gets :partystar:
  patch(C.sales, 'Pipeline review at 11', { files: [FILES.pipeline] })
  react(find(C.sales, ':tada: *Closed won:* Initech'), 'partystar', U.alex, U.emily, U.noah, U.tom)
})
