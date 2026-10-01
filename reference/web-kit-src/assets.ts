import { PERSONAS, personaById, type PersonaId } from '../data/personas'

// The kit's asset library: every image in public/kit/ (plus the demo's own app icons), typed so prototypes get
// autocomplete and a typo is a type error. Browse it at /?kit=assets. Internal-only Slack assets: see the NOTICE in
// public/kit/README.md for where each one came from. `src/kit/assets.test.ts` checks every file exists.

export type AssetKind = 'persona' | 'illustrated' | 'app' | 'logo' | 'file-type' | 'file-preview' | 'thumbnail'

/** Where an asset came from (public/kit/README.md has the full paths). */
export type AssetSource = 'slacky' | 'quick-kit' | 'figma-objects' | 'dicebear' | 'demo'

export const ASSET_SOURCES: Record<AssetSource, string> = {
  slacky: 'Slacky component library (shared/slacky in the Slacky and Local Prototype kits)',
  'quick-kit': 'Slack app quick kit (public/figma, harvested from the "Objects, Avatars & Personas" Figma library)',
  'figma-objects': 'Figma "✅ Objects, Avatars & Personas - Slack", File Objects page (exported 2026-05-01)',
  dicebear: 'Generated for the kit with DiceBear "notionists" (CC0), seeded with the persona names',
  demo: 'This repo (the Northstar demo)',
}

export interface KitAsset {
  kind: AssetKind
  id: string
  label: string
  /** public URL, e.g. /kit/personas/zoe-maxwell.png */
  src: string
  width: number
  height: number
  source: AssetSource
  /** what to write in a prototype to use it */
  snippet: string
  note?: string
}

// ------------------------------------------------------------------------------------------------
// App icons

const APP_ICONS = [
  { id: 'asana', label: 'Asana', file: 'asana.png', size: 144, source: 'slacky' },
  { id: 'centro', label: 'Centro', file: 'centro.png', size: 144, source: 'quick-kit' },
  { id: 'claude', label: 'Claude', file: 'claude.png', size: 144, source: 'quick-kit' },
  { id: 'docuvault', label: 'DocuVault', file: 'docuvault.png', size: 144, source: 'quick-kit' },
  { id: 'field-service', label: 'Field Service', file: 'field-service.svg', size: 48, source: 'quick-kit' },
  { id: 'google-calendar', label: 'Google Calendar', file: 'google-calendar.png', size: 144, source: 'quick-kit' },
  { id: 'google-drive', label: 'Google Drive', file: 'google-drive.png', size: 144, source: 'quick-kit' },
  { id: 'jira', label: 'Jira', file: 'jira.png', size: 144, source: 'quick-kit' },
  { id: 'pipeline-management', label: 'Pipeline Management', file: 'pipeline-management.svg', size: 48, source: 'quick-kit' },
  { id: 'polly', label: 'Polly', file: 'polly.png', size: 144, source: 'quick-kit' },
  { id: 'sales-agent', label: 'Sales agent', file: 'sales-agent.png', size: 256, source: 'quick-kit', note: 'resized from 886×900' },
  { id: 'sales-cloud-chart', label: 'Sales Cloud chart', file: 'sales-cloud-chart.png', size: 256, source: 'quick-kit', note: 'resized from 744×730' },
  { id: 'salesforce', label: 'Salesforce', file: 'salesforce.png', size: 144, source: 'quick-kit' },
  { id: 'seamless', label: 'Seamless.AI', file: 'seamless.png', size: 144, source: 'quick-kit' },
  { id: 'service-cloud', label: 'Service Cloud', file: 'service-cloud.svg', size: 48, source: 'quick-kit' },
  // The Northstar demo's own apps (public/apps)
  { id: 'calendar', label: 'Calendar (demo)', file: '/apps/calendar.svg', size: 72, source: 'demo' },
  { id: 'deploybot', label: 'Deploybot (demo)', file: '/apps/deploybot.svg', size: 72, source: 'demo' },
  { id: 'insights', label: 'Insights (demo)', file: '/apps/insights.svg', size: 72, source: 'demo' },
  { id: 'launchpad', label: 'Launchpad (demo)', file: '/apps/launchpad.svg', size: 72, source: 'demo' },
  { id: 'standup', label: 'Standup (demo)', file: '/apps/standup.svg', size: 72, source: 'demo' },
] as const

export type AppIconId = (typeof APP_ICONS)[number]['id']

// ------------------------------------------------------------------------------------------------
// Company logos (workspace icons and Slack Connect partners)

const LOGOS = [
  { id: 'acme', label: 'Acme Inc.', note: 'Approved company persona (guide step 1). Its company avatar is a lowercase a.' },
  { id: 'croissants', label: 'Croissants' },
  { id: 'insight-labs', label: 'Insight Labs' },
  { id: 'luminary', label: 'Luminary' },
  { id: 'pr-firm', label: 'PR firm' },
  { id: 'spaceship', label: 'Spaceship' },
  { id: 'test-kitchen', label: 'Test Kitchen' },
] as const

export type LogoId = (typeof LOGOS)[number]['id']

// ------------------------------------------------------------------------------------------------
// Files: previews (uploaded images) and file-type thumbnails

const FILE_PREVIEWS = [
  { id: 'slides-preview', label: 'Slide deck, title slide', file: 'slides-preview.jpg', width: 1280, height: 720, note: 'JPEG, resized from a 1920×1080 PNG' },
  { id: 'video-clip', label: 'Video clip thumbnail (0:08)', file: 'video-clip.jpg', width: 930, height: 520, note: 'JPEG, re-encoded from a 638 KB PNG ("momentum-clip")' },
] as const

export type FilePreviewId = (typeof FILE_PREVIEWS)[number]['id']

const FILE_TYPES = [
  ['pdf', 'PDF'],
  ['google-drive', 'Google Drive'],
  ['microsoft-word', 'Microsoft Word'],
  ['zip', 'Zipped'],
  ['canvas', 'Canvas'],
  ['image', 'Image'],
  ['video', 'Video'],
  ['text', 'Text'],
  ['presentation', 'Presentation'],
  ['media-archive', 'Media archive'],
  ['disk-image', 'Disk image'],
  ['3d-graphic', '3D graphic'],
  ['database', 'Database'],
  ['markdown', 'Markdown'],
  ['quip', 'Quip'],
  ['google-forms', 'Google Forms'],
  ['lists', 'Lists'],
  ['list-item', 'List item'],
  ['automations', 'Automations'],
  ['channel', 'Channel'],
  ['zoho', 'Zoho'],
  ['dropbox', 'Dropbox'],
  ['dropbox-paper', 'Dropbox Paper'],
  ['lucid-press', 'Lucid Press'],
  ['lucid-spark', 'Lucid Spark'],
  ['lucid-chart', 'Lucid Chart'],
  ['microsoft-powerpoint', 'Microsoft PowerPoint'],
  ['adobe-photoshop', 'Adobe Photoshop'],
  ['adobe-illustrator', 'Adobe Illustrator'],
  ['adobe-indesign', 'Adobe InDesign'],
  ['android', 'Android'],
  ['ios', 'iOS'],
  ['audio', 'Audio'],
  ['audio-player', 'Audio inline player'],
  ['code', 'Code'],
  ['generic', 'Generic'],
  ['microsoft-excel', 'Microsoft Excel'],
  ['google-docs', 'Google Docs'],
  ['html', 'HTML'],
  ['google-slides', 'Google Slides'],
  ['css', 'CSS'],
  ['google-sheets', 'Google Sheets'],
  ['binary', 'Binary'],
  ['php', 'PHP'],
  ['placeholder-text', 'Placeholder text'],
  ['placeholder-image', 'Placeholder image'],
  ['placeholder-zip', 'Placeholder zip'],
  ['email', 'Email'],
  ['salesforce-list', 'Salesforce list'],
  ['salesforce-list-dark', 'Salesforce list (dark)'],
  ['salesforce-generic', 'Salesforce record'],
  ['salesforce-generic-dark', 'Salesforce record (dark)'],
  ['salesforce-account', 'Salesforce account'],
  ['salesforce-account-dark', 'Salesforce account (dark)'],
  ['salesforce-opportunity', 'Salesforce opportunity'],
  ['salesforce-opportunity-dark', 'Salesforce opportunity (dark)'],
  ['salesforce-case', 'Salesforce case'],
  ['salesforce-case-dark', 'Salesforce case (dark)'],
  ['salesforce-contact', 'Salesforce contact'],
  ['salesforce-contact-dark', 'Salesforce contact (dark)'],
  ['salesforce-lead', 'Salesforce lead'],
  ['salesforce-lead-dark', 'Salesforce lead (dark)'],
] as const

export type FileTypeId = (typeof FILE_TYPES)[number][0]

// ------------------------------------------------------------------------------------------------
// Prototype thumbnails (gallery cards)

const THUMBNAILS = ['campfire', 'grass', 'indigo', 'jade', 'lagoon', 'mojito', 'ocean', 'rose', 'sangria', 'tomato'] as const

export type ThumbnailId = (typeof THUMBNAILS)[number]

// ------------------------------------------------------------------------------------------------
// Helpers for prototypes: each returns a public URL (or, for `persona`, a whole person).

const find = <T extends { id: string }>(list: readonly T[], id: string, what: string): T | undefined => {
  const hit = list.find((x) => x.id === id)
  if (!hit) console.warn(`[kit] unknown ${what} "${id}" (see /?kit=assets)`)
  return hit
}

const appSrc = (file: string) => (file.startsWith('/') ? file : `/kit/apps/${file}`)

/** An app icon for `defineApp({ icon })` or a Block Kit image: `appIcon('jira')`. */
export function appIcon(id: AppIconId): string {
  const hit = find(APP_ICONS, id, 'app icon')
  return hit ? appSrc(hit.file) : '/apps/insights.svg'
}

/** A company logo, e.g. the workspace icon: `workspace: { icon: logo('acme') }`. */
export function logo(id: LogoId): string {
  return find(LOGOS, id, 'logo') ? `/kit/logos/${id}.png` : '/kit/logos/acme.png'
}

/** A 36px file-type thumbnail (Block Kit context images, file cards): `fileIcon('pdf')`. */
export function fileIcon(id: FileTypeId): string {
  return FILE_TYPES.some(([x]) => x === id) ? `/kit/files/types/${id}.svg` : '/kit/files/types/generic.svg'
}

/** A file preview image (for an uploaded image or a Block Kit image): `filePreview('slides-preview')`. */
export function filePreview(id: FilePreviewId): string {
  const hit = find(FILE_PREVIEWS, id, 'file preview')
  return `/kit/files/previews/${hit?.file ?? 'slides-preview.jpg'}`
}

/** A gallery thumbnail color: `thumbnail: thumbnail('jade')`. */
export function thumbnail(id: ThumbnailId): string {
  return `/kit/thumbnails/${THUMBNAILS.includes(id) ? id : 'grass'}.png`
}

/** A persona's illustrated avatar (for in-product screens). */
export function illustrated(id: PersonaId): string {
  return personaById(id)?.illustrated ?? '/kit/illustrated/zoe-maxwell.svg'
}

/**
 * A Slack persona as a prototype person: `people: { zoe: persona('zoe-maxwell') }` gives Zoe Maxwell's name, a
 * title and her photo. `{ illustrated: true }` uses her illustrated avatar instead (Slack's guide asks for
 * illustrated personas on screens shown inside Slack). Spread it to change a field:
 * `{ ...persona('lee-hao'), title: 'Staff Engineer' }`.
 */
export function persona(id: PersonaId, opts: { illustrated?: boolean } = {}): { name: string; title: string; avatar: string } {
  const hit = personaById(id)
  if (!hit) {
    console.warn(`[kit] unknown persona "${id}" (see /?kit=assets)`)
    return { name: id, title: '', avatar: '/kit/illustrated/zoe-maxwell.svg' }
  }
  return { name: hit.name, title: hit.title, avatar: opts.illustrated || !hit.photo ? hit.illustrated : hit.photo }
}

// ------------------------------------------------------------------------------------------------
// The catalog (the asset library page and the tests read this)

export const ASSETS: readonly KitAsset[] = [
  ...PERSONAS.flatMap((x): KitAsset[] =>
    x.photo
      ? [
          {
            kind: 'persona',
            id: x.id,
            label: x.name,
            src: x.photo,
            width: x.photoSize ?? 0,
            height: x.photoSize ?? 0,
            // Slots A–I (en-US) come from Slacky at 300px, the localized personas from the quick kit.
            source: x.locale === 'en-US' ? 'slacky' : 'quick-kit',
            snippet: `persona('${x.id}')`,
            note: `${x.title} · persona ${x.slot}, ${x.locale}`,
          },
        ]
      : [],
  ),
  ...PERSONAS.map(
    (x): KitAsset => ({
      kind: 'illustrated',
      id: x.id,
      label: x.name,
      src: x.illustrated,
      width: 1744,
      height: 1744,
      source: 'dicebear',
      snippet: `persona('${x.id}', { illustrated: true })`,
      note: `${x.title} · persona ${x.slot}, ${x.locale}`,
    }),
  ),
  ...APP_ICONS.map(
    (x): KitAsset => ({
      kind: 'app',
      id: x.id,
      label: x.label,
      src: appSrc(x.file),
      width: x.size,
      height: x.size,
      source: x.source,
      snippet: `appIcon('${x.id}')`,
      ...('note' in x ? { note: x.note } : {}),
    }),
  ),
  ...LOGOS.map(
    (x): KitAsset => ({
      kind: 'logo',
      id: x.id,
      label: x.label,
      src: `/kit/logos/${x.id}.png`,
      width: 360,
      height: 360,
      source: 'quick-kit',
      snippet: `logo('${x.id}')`,
      ...('note' in x ? { note: x.note } : {}),
    }),
  ),
  ...FILE_PREVIEWS.map(
    (x): KitAsset => ({ kind: 'file-preview', id: x.id, label: x.label, src: `/kit/files/previews/${x.file}`, width: x.width, height: x.height, source: 'quick-kit', snippet: `filePreview('${x.id}')`, note: x.note }),
  ),
  ...FILE_TYPES.map(
    ([id, label]): KitAsset => ({
      kind: 'file-type',
      id,
      label,
      src: `/kit/files/types/${id}.svg`,
      width: 36,
      height: 36,
      source: 'figma-objects',
      snippet: `fileIcon('${id}')`,
      ...(id.startsWith('salesforce') ? { note: 'Cleaned from a two-variant Figma component set' } : {}),
    }),
  ),
  ...THUMBNAILS.map((id): KitAsset => ({ kind: 'thumbnail', id, label: id[0].toUpperCase() + id.slice(1), src: `/kit/thumbnails/${id}.png`, width: 448, height: 312, source: 'slacky', snippet: `thumbnail('${id}')` })),
]

/** The gallery's fallback thumbnail for a prototype (a stable color per slug). */
export function fallbackThumbnail(slug: string): string {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0
  return thumbnail(THUMBNAILS[Math.abs(h) % THUMBNAILS.length])
}

/** Illustrated avatars for people who don't set one (a stable pick per key, never a photo). */
export function defaultAvatar(key: string): string {
  let h = 0
  for (const c of key) h = (h * 33 + c.charCodeAt(0)) | 0
  return PERSONAS[Math.abs(h) % PERSONAS.length].illustrated
}
