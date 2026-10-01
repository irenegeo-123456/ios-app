import type { SlackList, SlackListColumn, SlackListRow } from '../../../data/types'

// What the list screens need to know about a Slack List (spec canvas-lists-creation.md §3): its primary column, its
// to-do "completed" column, whether you can write to it, how its cards group. Pure, so it's tested without a DOM.

/** The primary column: the first text column (the record's title), else the first column. */
export const primaryColumn = (list: SlackList): SlackListColumn | undefined => list.columns.find((c) => c.type === 'text') ?? list.columns[0]

/**
 * The to-do completed column (todo_completed): `completedColumnId`, else a checkbox column called Completed / Complete /
 * Done. Only it puts the checkbox on the cards; other checkbox columns are ordinary fields
 * (ListHydratedRecord.swift:164-173; ListItemPresentationObjectMapper.swift:391-400).
 */
export function completedColumn(list: SlackList): SlackListColumn | undefined {
  if (list.completedColumnId) {
    const c = list.columns.find((x) => x.id === list.completedColumnId)
    if (c) return c
  }
  return list.columns.find((c) => c.type === 'checkbox' && /^(completed?|done)$/i.test(c.name.trim()))
}

export const isCompleted = (list: SlackList, row: SlackListRow) => {
  const c = completedColumn(list)
  return !!c && row.cells[c.id] === 'true'
}

/** Writable unless the list is view-only (ListViewInteractor.swift:221-222). */
export const canWrite = (list: SlackList) => list.access !== 'view'

export interface Group {
  id: string
  title: string
  color?: string
  rows: SlackListRow[]
}

/** Cards grouped by the list's first select column, in its options' order; items without a value go to "Empty". */
export function groupsOf(list: SlackList): { groups: Group[]; grouping?: SlackListColumn } {
  const grouping = list.columns.find((c) => c.type === 'select')
  if (!grouping) return { groups: [{ id: 'all', title: '', rows: list.rows }] }
  const options = grouping.options ?? []
  const groups: Group[] = options.map((o) => ({ id: o.id, title: o.label, color: o.color, rows: list.rows.filter((r) => r.cells[grouping.id] === o.id) }))
  const rest = list.rows.filter((r) => !options.some((o) => o.id === r.cells[grouping.id]))
  // records without a value: "Empty" (R.strings.empty) in contentTertiary (ListItemPresentationObjectMapper.swift:1206-1212)
  if (rest.length) groups.push({ id: 'empty', title: 'Empty', rows: rest })
  return { groups: groups.filter((g) => g.rows.length), grouping }
}

/** The fields a record shows below its title: every column but the primary one and the completed one. */
export const fieldColumns = (list: SlackList) => {
  const primary = primaryColumn(list)
  const done = completedColumn(list)
  return list.columns.filter((c) => c !== primary && c !== done)
}

/** A select option's next value: picking the current option of a single select clears it (ListRecordInteractor.swift:2044-2075). */
export const nextSelectValue = (current: string | undefined, picked: string) => (current === picked ? null : picked)

/** "June 5, 2025" for a list date (ISO yyyy-mm-dd), or the raw value when it isn't one. */
export function formatListDate(value: string, opts: { short?: boolean; now?: Date } = {}): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return value
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(date.getTime())) return value
  const now = opts.now ?? new Date()
  if (opts.short) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** The ISO date (yyyy-mm-dd) of a local date. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
