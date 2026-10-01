// Slack's approved personas for product screens and prototypes (internal only; see public/kit/README.md).
//
// People: the names are Slack's legal-approved persona roster. Slots A–J are the marketing roster (en-US names);
// the other names are the localized personas of the same slots, from the Acme Inc. roster Slack's own tools use.
// Don't rename a persona or give a photo a different name (Slack's persona guide, step 3). Titles are the kit's
// suggestions; change them freely in a prototype.
//
// Photos are for marketing-style screens. For screens shown *inside* Slack, the guide asks for illustrated
// personas, so viewers don't mistake a persona for a real teammate: every persona has an illustrated avatar too.
// The Northstar demo keeps its own illustrated avatars (public/avatars/demo).

export interface Persona {
  /** kebab-case name, also the image file name: 'zoe-maxwell' */
  id: string
  name: string
  /** a suggested job title */
  title: string
  /** photo (marketing-style screens); missing when Slack's photo isn't in the kit */
  photo?: string
  /** the photo's width and height in px */
  photoSize?: number
  /** illustrated avatar (in-product screens) */
  illustrated: string
  /** slot in Slack's persona table: the same person is localized per market (A is Zoe Maxwell in en-US) */
  slot: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
  /** market this name belongs to */
  locale: 'en-US' | 'de-DE' | 'es-LA' | 'en-IN' | 'ja-JP'
}

const photo = (id: string) => `/kit/personas/${id}.png`
const drawn = (id: string) => `/kit/illustrated/${id}.svg`
// Generic in the id so `PersonaId` is the union of every id (editor autocomplete in prototypes).
const p = <I extends string>(id: I, name: string, title: string, slot: Persona['slot'], locale: Persona['locale'], photoSize = 0): Persona & { id: I } => ({
  id,
  name,
  title,
  ...(photoSize ? { photo: photo(id), photoSize } : {}),
  illustrated: drawn(id),
  slot,
  locale,
})

export const PERSONAS = [
  // Slack's marketing roster, en-US (slots A–J)
  p('zoe-maxwell', 'Zoe Maxwell', 'Senior Director, Marketing', 'A', 'en-US', 300),
  p('arcadio-buendia', 'Arcadio Buendía', 'Engineering Manager', 'B', 'en-US', 300),
  p('harry-boone', 'Harry Boone', 'Product Designer', 'C', 'en-US', 300),
  p('lisa-zhang', 'Lisa Zhang', 'VP, Sales', 'D', 'en-US', 300),
  p('jagdeep-das', 'Jagdeep Das', 'Solutions Engineer', 'E', 'en-US', 200),
  p('lisa-dawson', 'Lisa Dawson', 'Chief Operating Officer', 'F', 'en-US', 300),
  p('matt-brewer', 'Matt Brewer', 'Account Executive', 'G', 'en-US', 300),
  p('lee-hao', 'Lee Hao', 'Software Engineer', 'H', 'en-US', 300),
  p('sara-parras', 'Sara Parras', 'Head of People', 'I', 'en-US', 300),
  p('shruti-vasa', 'Shruti Vasa', 'Product Manager', 'J', 'en-US'),
  // Localized personas with photos in the kit
  p('nikki-kroll', 'Nikki Kroll', 'Customer Success Manager', 'A', 'de-DE', 144),
  p('arturo-garcia', 'Arturo García', 'Data Analyst', 'B', 'es-LA', 144),
  p('sandeep-mishra', 'Sandeep Mishra', 'Staff Engineer', 'C', 'en-IN', 144),
  p('gagan-anand', 'Gagan Anand', 'IT Administrator', 'E', 'en-IN', 144),
  p('geeta-joshi', 'Geeta Joshi', 'Marketing Manager', 'F', 'en-IN', 144),
  p('marcos-lopez', 'Marcos López', 'Finance Director', 'G', 'es-LA', 144),
  p('rahul-khanna', 'Rahul Khanna', 'Frontend Engineer', 'H', 'en-IN', 144),
  p('mauricio-rodriguez', 'Mauricio Rodríguez', 'Support Lead', 'H', 'es-LA', 144),
  // More of the roster (illustrated only)
  p('akira-asada', 'Akira Asada', 'UX Researcher', 'A', 'ja-JP'),
  p('fathima-parveen', 'Fathima Parveen', 'QA Engineer', 'A', 'en-IN'),
  p('mamadou-achebe', 'Mamadou Achebe', 'Security Engineer', 'B', 'de-DE'),
  p('carmen-vega', 'Carmen Vega', 'Operations Lead', 'D', 'es-LA'),
  p('madhu-sharma', 'Madhu Sharma', 'HR Business Partner', 'D', 'en-IN'),
  p('alfonso-huertas', 'Alfonso Huertas', 'Program Manager', 'E', 'es-LA'),
  p('suguru-endo', 'Suguru Endo', 'Data Scientist', 'E', 'ja-JP'),
  p('faisal-hasan', 'Faisal Hasan', 'Sales Engineer', 'G', 'en-IN'),
  p('emily-nishino', 'Emily Nishino', 'Content Designer', 'I', 'ja-JP'),
] as const satisfies readonly Persona[]

export type PersonaId = (typeof PERSONAS)[number]['id']

export const personaById = (id: string): Persona | undefined => PERSONAS.find((x) => x.id === id)

/** Slack's legal-approved company personas (persona guide, step 1). Pick the one that fits your audience. */
export interface CompanyPersona {
  name: string
  /** suggested workspace domain */
  domain: string
  /** the project channel the guide pairs with it */
  channel: string
  bestFor: string
  /** the company avatar the guide describes (a lowercase initial); `logo` when the kit has the image */
  initial: string
  logo?: string
  /** its Slack Connect partner company */
  connect?: string
}

export const COMPANY_PERSONAS: readonly CompanyPersona[] = [
  { name: 'Acme Inc.', domain: 'acme', channel: 'project-acme', bestFor: 'Enterprise', initial: 'a', logo: '/kit/logos/acme.png', connect: 'Beta Corp.' },
  { name: 'AstroCraft', domain: 'astrocraft', channel: 'project-astro', bestFor: 'Small business', initial: 'a' },
  { name: 'Welo Inc.', domain: 'welo', channel: 'project-welo', bestFor: 'Enterprise, small business and Salesforce partnerships (a Salesforce-approved brand)', initial: 'w' },
  { name: 'LunaLab', domain: 'lunalab', channel: 'project-lunar', bestFor: 'Enterprise or small business (health and life sciences)', initial: 'l' },
  { name: 'Ollie Inc.', domain: 'ollie', channel: 'project-ollie', bestFor: 'Small business', initial: 'o' },
]

/** Channel names in the style the guide recommends (step 4): lowercase, hyphenated, a prefix per kind. */
export const CHANNEL_IDEAS: Readonly<Record<string, readonly string[]>> = {
  project: ['project-capricorn', 'project-olympia', 'project-beta', 'project-nexus', 'project-parachute', 'project-blueprint', 'project-delta'],
  team: ['team-chameleon', 'sales-team', 'marketing-team', 'finance-team'],
  account: ['account-omega'],
  'Slack Connect': ['ext-beta-corp'],
  product: ['product-feedback', 'product-launch', 'product-strategy'],
  announcements: ['announcements', 'announce-company', 'announce-sales'],
  service: ['incident-42', 'swarm-17', 'site-03'],
  help: ['help-tech', 'help-benefits', 'help-staffing', 'help-payroll'],
}
