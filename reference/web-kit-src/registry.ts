import { definePrototype, isPrototype, type Prototype, type PrototypeDefinition } from './prototype'

// Finds the prototypes: every prototypes/<slug>/index.ts is one, so adding a folder is all it takes. Folders
// starting with "_" (the template) are skipped. Modules load lazily, one at a time, so a prototype with a mistake
// can't break the Northstar demo, the gallery or the other prototypes.

const modules = import.meta.glob<{ default?: unknown }>(['/prototypes/*/index.ts', '!/prototypes/_*/index.ts'])
const template = import.meta.glob<{ default?: unknown }>('/prototypes/_template/index.ts')
/** thumbnail.png (or .jpg/.webp) next to a prototype's index.ts is its gallery image */
const thumbnails = import.meta.glob<string>('/prototypes/*/thumbnail.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' })

const slugOf = (path: string) => path.split('/')[2]

/** Every prototype folder, A–Z. */
export const PROTOTYPE_SLUGS: string[] = Object.keys(modules).map(slugOf).sort()

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export interface LoadedPrototype {
  slug: string
  /** the definition (missing when the module failed to load) */
  proto?: Prototype
  /** why it failed to load */
  error?: string
  /** prototypes/<slug>/thumbnail.png, when there is one */
  thumbnail?: string
  /** definePrototype() problems plus folder problems */
  problems: string[]
}

export const thumbnailOf = (slug: string): string | undefined => Object.entries(thumbnails).find(([p]) => slugOf(p) === slug)?.[1]

async function load(loader: (() => Promise<{ default?: unknown }>) | undefined, slug: string, file: string): Promise<LoadedPrototype> {
  const base = { slug, thumbnail: thumbnailOf(slug) }
  if (!loader) return { ...base, error: `there's no prototype called '${slug}' (no ${file})`, problems: [] }
  try {
    const mod = await loader()
    const value = mod.default
    if (value === undefined) return { ...base, error: `${file} needs \`export default definePrototype({ … })\``, problems: [] }
    // A plain object works too (someone forgot definePrototype); it gets the same checks.
    const proto = isPrototype(value) ? value : definePrototype(value as PrototypeDefinition)
    const problems = [...proto.problems]
    if (!SLUG_RE.test(slug) && slug !== '_template') problems.push(`the folder name '${slug}' should be lowercase letters, numbers and hyphens (it's the ?proto= in the URL)`)
    return { ...base, proto, problems }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // The dev server couldn't read the file at all (its red overlay shows the line).
    const typo = /dynamically imported module|Importing a module script failed/i.test(message)
    return { ...base, error: typo ? `${file} has a typo that stops it from loading, often a missing comma, quote or bracket. The red box says which line.` : `${file} didn't load: ${message}`, problems: [] }
  }
}

/** Loads one prototype by slug (never throws). `_template` works too, to try the template itself. */
export function loadPrototype(slug: string): Promise<LoadedPrototype> {
  const file = `prototypes/${slug}/index.ts`
  return load(modules[`/${file}`] ?? template[`/${file}`], slug, file)
}

/** Loads every prototype, newest first (by `updated`); ones that failed go last. */
export async function loadAllPrototypes(): Promise<LoadedPrototype[]> {
  const all = await Promise.all(PROTOTYPE_SLUGS.map(loadPrototype))
  return all.sort((a, b) => (b.proto?.updated ?? '').localeCompare(a.proto?.updated ?? '') || a.slug.localeCompare(b.slug))
}

/** The template (prototypes/_template), for the tests. */
export const loadTemplate = () => load(template['/prototypes/_template/index.ts'], '_template', 'prototypes/_template/index.ts')
