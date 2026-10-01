import { describe, expect, it } from 'vitest'
import type { SlackList } from '../../../data/types'
import { canWrite, completedColumn, fieldColumns, formatListDate, groupsOf, isCompleted, isoDate, nextSelectValue, primaryColumn } from './listModel'

// What the list screens derive from a Slack List: its title and to-do columns, its groups, its fields.

const list = (over: Partial<SlackList> = {}): SlackList => ({
  id: 'F1',
  title: 'Launch',
  creatorId: 'U1',
  columns: [
    { id: 'title', name: 'Item', type: 'text' },
    { id: 'done', name: 'Completed', type: 'checkbox' },
    {
      id: 'status',
      name: 'Status',
      type: 'select',
      options: [
        { id: 'todo', label: 'To do', color: 'gray' },
        { id: 'doing', label: 'Doing', color: 'blue' },
      ],
    },
    { id: 'who', name: 'Owner', type: 'person' },
    { id: 'review', name: 'Needs review', type: 'checkbox' },
  ],
  rows: [
    { id: 'r1', cells: { title: 'Pricing', status: 'doing', done: 'true' } },
    { id: 'r2', cells: { title: 'Emails', status: 'todo' } },
    { id: 'r3', cells: { title: 'Press' } },
    { id: 'r4', cells: { title: 'Venue', status: 'doing' } },
  ],
  ...over,
})

describe('columns', () => {
  it('the primary column is the first text column', () => {
    expect(primaryColumn(list())?.id).toBe('title')
    expect(primaryColumn(list({ columns: [{ id: 'd', name: 'Due', type: 'date' }] }))?.id).toBe('d')
  })

  it('finds the to-do column by id, else a checkbox named Completed / Complete / Done', () => {
    expect(completedColumn(list())?.id).toBe('done')
    expect(completedColumn(list({ completedColumnId: 'review' }))?.id).toBe('review')
    const renamed = list()
    renamed.columns[1] = { id: 'done', name: 'Done ', type: 'checkbox' }
    expect(completedColumn(renamed)?.id).toBe('done')
    // other checkbox columns are just fields
    expect(completedColumn(list({ columns: [{ id: 'x', name: 'Needs review', type: 'checkbox' }] }))).toBeUndefined()
  })

  it('a record lists every column but its title and its to-do checkbox', () => {
    expect(fieldColumns(list()).map((c) => c.id)).toEqual(['status', 'who', 'review'])
  })

  it('knows completed rows', () => {
    const l = list()
    expect(l.rows.map((r) => isCompleted(l, r))).toEqual([true, false, false, false])
  })
})

describe('groups', () => {
  it('groups cards by the first select column in its options’ order, then Empty', () => {
    const { groups, grouping } = groupsOf(list())
    expect(grouping?.id).toBe('status')
    expect(groups.map((g) => [g.title, g.rows.map((r) => r.id)])).toEqual([
      ['To do', ['r2']],
      ['Doing', ['r1', 'r4']],
      ['Empty', ['r3']],
    ])
    expect(groups[1].color).toBe('blue')
  })

  it('drops empty groups, and has one untitled group without a select column', () => {
    const l = list({ rows: [{ id: 'r1', cells: { status: 'doing' } }] })
    expect(groupsOf(l).groups.map((g) => g.id)).toEqual(['doing'])
    const plain = list({ columns: [{ id: 'title', name: 'Item', type: 'text' }] })
    const { groups, grouping } = groupsOf(plain)
    expect(grouping).toBeUndefined()
    expect(groups).toMatchObject([{ id: 'all', title: '' }])
  })
})

describe('editing', () => {
  it('view-only lists can’t be edited', () => {
    expect(canWrite(list())).toBe(true)
    expect(canWrite(list({ access: 'edit' }))).toBe(true)
    expect(canWrite(list({ access: 'view' }))).toBe(false)
  })

  it('picking the current option of a single select clears it', () => {
    expect(nextSelectValue(undefined, 'todo')).toBe('todo')
    expect(nextSelectValue('todo', 'doing')).toBe('doing')
    expect(nextSelectValue('doing', 'doing')).toBeNull()
  })
})

describe('dates', () => {
  const now = new Date(2026, 8, 30)

  it('formats a list date long on the item, short on cards (with the year when it isn’t this one)', () => {
    expect(formatListDate('2026-10-03')).toBe('October 3, 2026')
    expect(formatListDate('2026-10-03', { short: true, now })).toBe('Oct 3')
    expect(formatListDate('2025-06-05', { short: true, now })).toBe('Jun 5, 2025')
  })

  it('keeps values that aren’t ISO dates', () => {
    expect(formatListDate('next week')).toBe('next week')
  })

  it('writes local dates as yyyy-mm-dd', () => {
    expect(isoDate(new Date(2026, 0, 9))).toBe('2026-01-09')
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})
