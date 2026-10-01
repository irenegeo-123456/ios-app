import bundle from './schema/block-kit-input.json'

// Block Kit payload validation, the way Slack's API does it:
//  1. Slack's input JSON schemas (api_metadata/schemas/block-kit/input/blocks.json for messages,
//     views/input/blocks.json for modals and Home tabs), bundled into schema/block-kit-input.json from the webapp
//     snapshot of 2026-08-12, checked with the semantics and error strings of slack/hack-json-schema
//     ("must be less than 3001 characters", "missing required field: text", "unsupported type: foo",
//     "no more than 50 items allowed", "failed to match all allowed schemas" …);
//  2. the semantic checks in src/block_kit (BlocksParser.hack, blocks/*Block.hack): section text or fields,
//     container / card / plan / data_visualization rules, which blocks a message or view may hold;
//  3. warnings from docs.slack.dev (checked 2026-09-25): which surfaces list each block as available, and
//     block types that aren't public.
// Errors read like Slack's `invalid_blocks` response: `${message} [json-pointer:${path}]`.

export type ValidationSurface = 'message' | 'modal' | 'home'

export interface Issue {
  /** JSON pointer into the payload, e.g. /blocks/0/text/text */
  path: string
  message: string
  /** error: Slack's API rejects the payload; warning: allowed by the API but not what the docs promise */
  level: 'error' | 'warning'
}

/** Slack's API error line for an issue. */
export const apiError = (i: Issue) => `${i.message} [json-pointer:${i.path}]`

// ------------------------------------------------------------------------------------------------
// Docs: availability and the public block list

/** "Available in surfaces" on each block's docs.slack.dev page (checked 2026-09-25). */
export const BLOCK_SURFACES: Record<string, ValidationSurface[]> = {
  actions: ['message', 'modal', 'home'],
  card: ['message', 'modal', 'home'],
  context: ['message', 'modal', 'home'],
  divider: ['message', 'modal', 'home'],
  header: ['message', 'modal', 'home'],
  image: ['message', 'modal', 'home'],
  input: ['message', 'modal', 'home'],
  rich_text: ['message', 'modal', 'home'],
  section: ['message', 'modal', 'home'],
  video: ['message', 'modal', 'home'],
  carousel: ['message', 'home'],
  container: ['message', 'home'],
  data_table: ['message', 'home'],
  data_visualization: ['message', 'home'],
  table: ['message', 'home'],
  context_actions: ['message'],
  file: ['message'],
  markdown: ['message'],
  plan: ['message'],
  task_card: ['message'],
  alert: ['modal'],
}

export const PUBLIC_BLOCK_TYPES = Object.keys(BLOCK_SURFACES)

/** The surfaces every block in the list is available in (unknown types don't restrict). */
export function surfacesFor(blocks: { type?: string }[]): ValidationSurface[] {
  const all: ValidationSurface[] = ['message', 'modal', 'home']
  return all.filter((s) => blocks.every((b) => !b || !BLOCK_SURFACES[b.type ?? ''] || BLOCK_SURFACES[b.type ?? ''].includes(s)))
}

// ------------------------------------------------------------------------------------------------
// JSON schema (hack-json-schema semantics)

type Schema = Record<string, unknown>
const SCHEMAS = (bundle as { schemas: Record<string, Schema> }).schemas
const ROOTS = (bundle as { roots: { message: string; view: string } }).roots

interface Err {
  path: string
  message: string
}

class Invalid {
  constructor(public errors: Err[]) {}
}

function resolve(ref: string): Schema {
  const [file, frag = ''] = ref.split('#')
  let node: unknown = SCHEMAS[file]
  for (const part of frag.split('/').filter(Boolean)) node = (node as Record<string, unknown>)?.[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))]
  return (node as Schema) ?? {}
}

/** Follows `$ref`s until a schema with content. */
function deref(s: Schema): Schema {
  let cur = s
  for (let i = 0; i < 20 && typeof cur.$ref === 'string'; i++) cur = resolve(cur.$ref)
  return cur
}

const ptr = (path: string, key: string | number) => `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`
const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

const TYPE_MESSAGE: Record<string, string> = {
  string: 'must provide a string',
  number: 'must provide a number',
  integer: 'must provide an integer',
  object: 'must provide an object',
  array: 'must provide an array',
  boolean: 'must be a boolean',
  null: 'must provide a null pointer',
}

function matchesType(v: unknown, t: string) {
  if (t === 'integer') return typeof v === 'number' && Number.isInteger(v)
  if (t === 'number') return typeof v === 'number'
  return typeOf(v) === t
}

/** The discriminator of an `anyOf` whose branches are objects sharing a required single-value string enum. */
function discriminator(branches: Schema[]): { key: string; types: Map<string, Schema> } | null {
  const maps = new Map<string, Map<string, Schema>>()
  for (const b of branches) {
    const r = deref(b)
    if (r.type !== 'object') continue
    const props = (r.properties ?? {}) as Record<string, Schema>
    const req = (r.required ?? []) as string[]
    for (const [name, p] of Object.entries(props)) {
      const pd = deref(p)
      if (pd.type === 'string' && req.includes(name) && Array.isArray(pd.enum) && pd.enum.length === 1) {
        if (!maps.has(name)) maps.set(name, new Map())
        maps.get(name)!.set(String(pd.enum[0]), b)
      }
    }
  }
  for (const [key, types] of maps) if (types.size === branches.length) return { key, types }
  return null
}

function check(v: unknown, s0: Schema, path: string): void {
  const s = deref(s0)
  if (s.anyOf) return checkAnyOf(v, s.anyOf as Schema[], path)
  if (s.oneOf) {
    const passed = (s.oneOf as Schema[]).filter((b) => passes(v, b, path)).length
    if (passed !== 1) throw new Invalid([{ path, message: 'failed to match exactly one allowed schema' }])
    return
  }
  if (s.allOf) {
    const errors: Err[] = []
    for (const b of s.allOf as Schema[]) {
      try {
        check(v, b, path)
      } catch (e) {
        if (e instanceof Invalid) errors.push(...e.errors)
        else throw e
      }
    }
    if (errors.length) throw new Invalid([{ path, message: 'failed to match all allowed schemas' }, ...errors])
    if (!s.type) return
  }
  if (s.const !== undefined && v !== s.const) throw new Invalid([{ path, message: 'must be a valid enum value' }])
  const types = s.type === undefined ? [] : Array.isArray(s.type) ? (s.type as string[]) : [s.type as string]
  if (types.length && !types.some((t) => matchesType(v, t))) {
    // a nullable field accepts null
    if (!(v === null && types.includes('null'))) throw new Invalid([{ path, message: TYPE_MESSAGE[types[0]] ?? 'must be a valid type' }])
  }
  if (Array.isArray(s.enum) && !s.enum.includes(v as never)) throw new Invalid([{ path, message: 'must be a valid enum value' }])
  if (typeof v === 'string') checkString(v, s, path)
  else if (typeof v === 'number') checkNumber(v, s, path)
  else if (Array.isArray(v)) checkArray(v, s, path)
  else if (v && typeof v === 'object') checkObject(v as Record<string, unknown>, s, path)
}

function passes(v: unknown, s: Schema, path: string) {
  try {
    check(v, s, path)
    return true
  } catch (e) {
    if (e instanceof Invalid) return false
    throw e
  }
}

function checkAnyOf(v: unknown, branches: Schema[], path: string) {
  const d = discriminator(branches)
  if (d) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Invalid([{ path, message: 'must provide an object' }])
    const o = v as Record<string, unknown>
    if (!(d.key in o)) throw new Invalid([{ path, message: `missing required field: ${d.key}` }])
    const t = o[d.key]
    if (typeof t !== 'string') throw new Invalid([{ path: ptr(path, d.key), message: 'must provide a string' }])
    const branch = d.types.get(t)
    if (!branch) throw new Invalid([{ path: ptr(path, d.key), message: `unsupported type: ${t}` }])
    return check(v, branch, path)
  }
  // a null value passes an anyOf that allows null
  const errors: Err[] = []
  for (const b of branches) {
    try {
      check(v, b, path)
      return
    } catch (e) {
      if (e instanceof Invalid) errors.push(...e.errors)
      else throw e
    }
  }
  throw new Invalid([{ path, message: 'failed to match any allowed schemas' }, ...errors])
}

function checkString(v: string, s: Schema, path: string) {
  // Slack counts characters (code points), not UTF-16 units
  const len = [...v].length
  if (typeof s.minLength === 'number' && len < s.minLength) throw new Invalid([{ path, message: `must be more than ${s.minLength - 1} characters` }])
  if (typeof s.maxLength === 'number' && len > s.maxLength) throw new Invalid([{ path, message: `must be less than ${s.maxLength + 1} characters` }])
  if (typeof s.pattern === 'string') {
    let re: RegExp | null = null
    try {
      re = new RegExp(s.pattern, 'u')
    } catch {
      re = null
    }
    if (re && !re.test(v)) throw new Invalid([{ path, message: `input must match regex pattern: ${s.pattern}` }])
  }
}

function checkNumber(v: number, s: Schema, path: string) {
  if (typeof s.minimum === 'number' && v < s.minimum) throw new Invalid([{ path, message: `must be greater than ${s.minimum}` }])
  if (typeof s.exclusiveMinimum === 'number' && v <= s.exclusiveMinimum) throw new Invalid([{ path, message: `must be greater than ${s.exclusiveMinimum}` }])
  if (typeof s.maximum === 'number' && v > s.maximum) throw new Invalid([{ path, message: `must be less than ${s.maximum}` }])
}

function checkArray(v: unknown[], s: Schema, path: string) {
  if (typeof s.minItems === 'number' && v.length < s.minItems) throw new Invalid([{ path, message: `must provide at least ${s.minItems} items` }])
  if (typeof s.maxItems === 'number' && v.length > s.maxItems) throw new Invalid([{ path, message: `no more than ${s.maxItems} items allowed` }])
  if (!s.items) return
  const errors: Err[] = []
  v.forEach((item, i) => {
    try {
      check(item, s.items as Schema, ptr(path, i))
    } catch (e) {
      if (e instanceof Invalid) errors.push(...e.errors)
      else throw e
    }
  })
  if (errors.length) throw new Invalid(errors)
}

function checkObject(o: Record<string, unknown>, s: Schema, path: string) {
  const errors: Err[] = []
  const props = (s.properties ?? {}) as Record<string, Schema>
  // hack-json-schema fills a missing field that has a `default` before checking `required`
  for (const name of (s.required ?? []) as string[])
    if ((!(name in o) || o[name] === undefined) && (!props[name] || deref(props[name]).default === undefined)) errors.push({ path, message: `missing required field: ${name}` })
  const patterns = Object.entries((s.patternProperties ?? {}) as Record<string, Schema>).map(([p, sch]) => [new RegExp(p), sch] as const)
  for (const [k, val] of Object.entries(o)) {
    if (val === undefined) continue
    const p = props[k] ?? patterns.find(([re]) => re.test(k))?.[1]
    if (p) {
      try {
        check(val, p, ptr(path, k))
      } catch (e) {
        if (e instanceof Invalid) errors.push(...e.errors)
        else throw e
      }
    } else if (s.additionalProperties === false) errors.push({ path, message: `invalid additional property: ${k}` })
    else if (s.additionalProperties && typeof s.additionalProperties === 'object') {
      try {
        check(val, s.additionalProperties as Schema, ptr(path, k))
      } catch (e) {
        if (e instanceof Invalid) errors.push(...e.errors)
        else throw e
      }
    }
  }
  if (errors.length) throw new Invalid(errors)
}

/** Checks a value against one of the bundled schemas (by path, e.g. "block-kit/input/elements/button.json#"). */
export function validateAgainst(value: unknown, ref: string, path = ''): Err[] {
  try {
    check(value, { $ref: ref }, path)
    return []
  } catch (e) {
    if (e instanceof Invalid) return e.errors
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// Slack's semantic checks (src/block_kit)

type Json = Record<string, unknown>

const MAX_DATA_VISUALIZATION_BLOCKS_PER_MESSAGE = 2
const MAX_PLAN_TASKS = 50
/** markdown-block.md: the cumulative limit for all markdown blocks in a payload */
const MARKDOWN_CUMULATIVE_LIMIT = 12000
/** TableBlockUtils.hack: characters across all cells of one table / data_table / every table in the message */
const TABLE_CHAR_LIMIT = 10000
const DATA_TABLE_CHAR_LIMIT = 20000
const ALL_TABLES_CHAR_LIMIT = 20000

/** Per-block container support (getSupportedContainers + validateContainerViewType in blocks/*Block.hack). */
const CONTAINER_GATES: Record<string, { message?: boolean; views?: ValidationSurface[] }> = {
  alert: { message: false, views: ['modal'] },
  carousel: { views: ['home'] },
  container: { views: ['home'] },
  data_visualization: { views: ['home'] },
  context_actions: { views: [] },
  plan: { views: [] },
  task_card: { views: [] },
}

function semantic(blocks: Json[], surface: ValidationSurface, root: string): Err[] {
  const errs: Err[] = []
  const view = surface !== 'message'
  let markdownChars = 0
  let tableChars = 0
  let focus = 0
  blocks.forEach((b, i) => {
    if (!b || typeof b !== 'object') return
    const at = `${root}/${i}`
    const t = String(b.type)
    const gate = CONTAINER_GATES[t]
    if (gate) {
      if (!view && gate.message === false) errs.push({ path: at, message: 'Block type is not supported in this container' })
      if (view && gate.views && !gate.views.includes(surface)) errs.push({ path: at, message: gate.views.length ? `Unsupported block type: ${t}` : 'Block type is not supported in this container' })
    }
    switch (t) {
      case 'section':
        if (b.text === undefined && b.fields === undefined) errs.push({ path: at, message: 'must define either `text` or `fields`' })
        break
      case 'card':
        if (!b.title && !b.body && !b.hero_image && !b.actions) errs.push({ path: at, message: 'must define either `title`, `body`, `hero_image`, or `actions`' })
        if (b.icon && b.slack_icon) errs.push({ path: at, message: 'Cannot specify both icon and slack_icon' })
        break
      case 'carousel':
        ;(b.elements as Json[] | undefined)?.forEach((c, k) => {
          if (c && !c.title && !c.body && !c.hero_image && !c.actions) errs.push({ path: `${at}/elements/${k}`, message: 'must define either `title`, `body`, `hero_image`, or `actions`' })
        })
        break
      case 'container':
        if (b.title == null && b.rich_text_title == null) errs.push({ path: at, message: 'must define either `title`, or `rich_text_title`' })
        if (b.default_collapsed && !b.is_collapsible) errs.push({ path: `${at}/default_collapsed`, message: '`default_collapsed` can only be set when `is_collapsible` is true' })
        if (b.has_header_divider && b.is_collapsible) errs.push({ path: `${at}/has_header_divider`, message: '`has_header_divider` can only be set when `is_collapsible` is false' })
        if (Array.isArray(b.child_blocks)) errs.push(...semantic(b.child_blocks as Json[], surface, `${at}/child_blocks`).filter((e) => !/data_visualization|plan/.test(e.message)))
        break
      case 'plan': {
        const tasks = (b.tasks ?? []) as Json[]
        const ids = tasks.map((x) => x?.task_id)
        if (new Set(ids).size !== ids.length) errs.push({ path: at, message: 'task_ids must be unique' })
        if (tasks.length > MAX_PLAN_TASKS) errs.push({ path: at, message: `Cannot have more than ${MAX_PLAN_TASKS} tasks` })
        break
      }
      case 'data_visualization':
        errs.push(...chartErrors(b.chart as Json | undefined, at))
        break
      case 'markdown':
        markdownChars += typeof b.text === 'string' ? [...b.text].length : 0
        break
      case 'table':
      case 'data_table': {
        // TableBlockUtils.hack
        const rows = (b.rows ?? []) as unknown[][]
        const chars = cellChars(rows)
        tableChars += chars
        const limit = t === 'data_table' ? DATA_TABLE_CHAR_LIMIT : TABLE_CHAR_LIMIT
        if (!rows.length) errs.push({ path: at, message: 'empty_tables_not_allowed' })
        else if (rows.some((r) => Array.isArray(r) && r.length !== rows[0].length)) errs.push({ path: at, message: 'uneven_table_rows_not_allowed' })
        if (Array.isArray(b.column_settings) && rows[0] && b.column_settings.length > rows[0].length) errs.push({ path: at, message: 'column_settings_field_has_more_entries_than_columns_in_rows' })
        if (chars > limit) errs.push({ path: at, message: `table_character_count_must_not_exceed_${limit}` })
        if (t === 'data_table' && (rows[0] ?? []).some((c) => (c as Json)?.type === 'rich_text')) errs.push({ path: at, message: 'data_table_header_cells_must_not_be_rich_text' })
        break
      }
    }
    focus += countFocus(b)
  })
  if (root === '/blocks') {
    const dv = blocks.filter((b) => b?.type === 'data_visualization').length
    if (!view && dv > MAX_DATA_VISUALIZATION_BLOCKS_PER_MESSAGE) errs.push({ path: root, message: `A message can contain a maximum of ${MAX_DATA_VISUALIZATION_BLOCKS_PER_MESSAGE} data_visualization blocks` })
    const plans = blocks.filter((b) => b?.type === 'plan').length
    if (plans > 1) errs.push({ path: '', message: 'Cannot have more than 1 plan block' })
    if (plans > 0 && blocks.some((b) => b?.type === 'task_card')) errs.push({ path: '', message: 'Plan block and task blocks are mutually exclusive' })
    if (focus > 1) errs.push({ path: root, message: 'Duplicate focus_on_load' })
    if (markdownChars > MARKDOWN_CUMULATIVE_LIMIT) errs.push({ path: root, message: `The cumulative limit for all markdown blocks is ${MARKDOWN_CUMULATIVE_LIMIT.toLocaleString('en-US')} characters` })
    if (tableChars > ALL_TABLES_CHAR_LIMIT) errs.push({ path: root, message: `aggregate_table_character_count_must_not_exceed_${ALL_TABLES_CHAR_LIMIT}` })
  }
  return errs
}

function chartErrors(chart: Json | undefined, at: string): Err[] {
  if (!chart) return []
  const errs: Err[] = []
  const p = `${at}/chart`
  if (chart.type === 'pie') {
    const labels = ((chart.segments ?? []) as Json[]).map((s) => s?.label)
    const dup = labels.find((l, i) => labels.indexOf(l) !== i)
    if (dup !== undefined) errs.push({ path: p, message: `Duplicate segment label: ${dup}` })
    return errs
  }
  const categories = (((chart.axis_config as Json | undefined)?.categories ?? []) as string[]).map(String)
  if (new Set(categories).size !== categories.length) errs.push({ path: p, message: 'axis_config.categories must not contain duplicate values' })
  const series = (chart.series ?? []) as Json[]
  const names = series.map((s) => s?.name)
  const dupName = names.find((n, i) => names.indexOf(n) !== i)
  if (dupName !== undefined) errs.push({ path: p, message: `Duplicate series name: ${dupName}` })
  for (const s of series) {
    const data = (s?.data ?? []) as Json[]
    const labels = data.map((d) => String(d?.label))
    if (data.length !== categories.length) errs.push({ path: p, message: `Series "${s.name}" must have exactly one data point for every category` })
    if (new Set(labels).size !== labels.length) errs.push({ path: p, message: `Series "${s.name}" contains duplicate data point labels` })
    const bad = labels.find((l) => !categories.includes(l))
    if (bad !== undefined) errs.push({ path: p, message: `Data point label "${bad}" does not match any category in axis_config.categories` })
  }
  return errs
}

function cellChars(rows: unknown): number {
  let n = 0
  const walk = (v: unknown) => {
    if (typeof v === 'string') n += [...v].length
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k === 'text' || typeof x === 'object') walk(x)
  }
  walk(rows)
  return n
}

function countFocus(v: unknown): number {
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + countFocus(x), 0)
  if (!v || typeof v !== 'object') return 0
  let n = (v as Json).focus_on_load === true ? 1 : 0
  for (const x of Object.values(v)) if (x && typeof x === 'object') n += countFocus(x)
  return n
}

// ------------------------------------------------------------------------------------------------

/**
 * Everything Slack would say about `blocks` on a surface: API errors (schema + semantic checks) and docs
 * warnings. An empty list means Slack accepts the payload and documents every block for that surface.
 */
/**
 * Fields the clone's payloads may carry that an app never sends (types.ts marks them clone-only): what Slack's
 * stores would know (a remote file's metadata, an external select's options) and what Slack adds to stored
 * image blocks. They're dropped before validating, so the issues are the API's verdict on the rest.
 */
const CLONE_ONLY: Record<string, string[]> = {
  file: ['file'],
  image: ['image_width', 'image_height', 'image_bytes'],
  external_select: ['options', 'option_groups'],
  multi_external_select: ['options', 'option_groups'],
}

export function stripCloneOnly<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripCloneOnly) as T
  if (!value || typeof value !== 'object') return value
  const drop = CLONE_ONLY[String((value as Json).type ?? '')] ?? []
  return Object.fromEntries(Object.entries(value).filter(([k]) => !drop.includes(k)).map(([k, v]) => [k, stripCloneOnly(v)])) as T
}

export function validateBlocks(blocks: unknown[], surface: ValidationSurface): Issue[] {
  const list = Array.isArray(blocks) ? stripCloneOnly(blocks) : []
  const issues: Issue[] = []
  const root = surface === 'message' ? ROOTS.message : ROOTS.view
  for (const e of validateAgainst(list, root, '/blocks')) issues.push({ ...e, level: 'error' })
  for (const e of semantic(list as Json[], surface, '/blocks')) issues.push({ ...e, level: 'error' })
  list.forEach((b, i) => {
    const type = String((b as Json)?.type ?? '')
    const where = BLOCK_SURFACES[type]
    if (!where) {
      if (type) issues.push({ path: `/blocks/${i}/type`, level: 'warning', message: `${type} isn’t a public Block Kit block (docs.slack.dev lists ${PUBLIC_BLOCK_TYPES.length} block types)` })
    } else if (!where.includes(surface))
      issues.push({ path: `/blocks/${i}`, level: 'warning', message: `docs.slack.dev lists ${type} blocks for ${where.map(surfaceName).join(', ')}, not ${surfaceName(surface)}` })
  })
  // one line per problem: the API repeats "failed to match all allowed schemas" before the detail
  return dedupe(issues)
}

const surfaceName = (s: ValidationSurface) => (s === 'home' ? 'Home tabs' : s === 'modal' ? 'modals' : 'messages')

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Set<string>()
  return issues.filter((i) => {
    const k = `${i.level}|${i.path}|${i.message}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Only the API errors (what `chat.postMessage` / `views.open` would return as `invalid_blocks`). */
export const apiErrors = (blocks: unknown[], surface: ValidationSurface) => validateBlocks(blocks, surface).filter((i) => i.level === 'error')
