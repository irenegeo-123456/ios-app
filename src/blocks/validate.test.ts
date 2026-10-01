import { describe, expect, it } from 'vitest'
import { apiError, apiErrors, surfacesFor, validateBlocks } from './validate'

// Block Kit payload validation (the web kit's validate.test.ts): Slack's input schemas and src/block_kit's rules, with
// the API's error strings. The gallery's examples are checked in BlocksGallery's own test.

const md = (t: string) => ({ type: 'mrkdwn', text: t })
const pt = (t: string) => ({ type: 'plain_text', text: t })
const errors = (blocks: unknown[], surface: 'message' | 'modal' | 'home' = 'message') => apiErrors(blocks, surface).map(apiError)

describe('Block Kit limits (Slack API schemas + src/block_kit, error strings from hack-json-schema)', () => {
  it('accepts a valid message', () => {
    expect(
      errors([
        { type: 'header', text: pt('Deploy #4812') },
        { type: 'section', text: md('*Atlas* shipped'), accessory: { type: 'button', text: pt('View'), action_id: 'view', url: 'https://example.com' } },
        { type: 'context', elements: [md('2 minutes ago')] },
        { type: 'actions', elements: [{ type: 'button', text: pt('Approve'), style: 'primary', action_id: 'approve' }] },
      ]),
    ).toEqual([])
  })

  it('caps messages at 50 blocks and views at 100', () => {
    const many = (n: number) => Array.from({ length: n }, () => ({ type: 'divider' }))
    expect(errors(many(50))).toEqual([])
    expect(errors(many(51))).toContain('no more than 50 items allowed [json-pointer:/blocks]')
    expect(errors(many(100), 'modal')).toEqual([])
    expect(errors(many(101), 'home')).toContain('no more than 100 items allowed [json-pointer:/blocks]')
  })

  it('checks text lengths the way the API reports them', () => {
    expect(errors([{ type: 'section', text: md('x'.repeat(3000)) }])).toEqual([])
    expect(errors([{ type: 'section', text: md('x'.repeat(3001)) }])).toEqual(['failed to match all allowed schemas [json-pointer:/blocks/0/text]', 'must be less than 3001 characters [json-pointer:/blocks/0/text/text]'])
    expect(errors([{ type: 'header', text: pt('h'.repeat(151)) }]).join('\n')).toContain('must be less than 151 characters [json-pointer:/blocks/0/text/text]')
    expect(errors([{ type: 'actions', elements: [{ type: 'button', action_id: 'a', text: pt('b'.repeat(76)) }] }]).join('\n')).toContain('must be less than 76 characters [json-pointer:/blocks/0/elements/0/text/text]')
    // characters, not UTF-16 code units
    expect(errors([{ type: 'header', text: pt('🎉'.repeat(150)) }])).toEqual([])
  })

  it('checks element counts', () => {
    expect(errors([{ type: 'section', fields: Array.from({ length: 11 }, () => md('f')) }])).toContain('no more than 10 items allowed [json-pointer:/blocks/0/fields]')
    expect(errors([{ type: 'context', elements: Array.from({ length: 11 }, () => md('c')) }])).toContain('no more than 10 items allowed [json-pointer:/blocks/0/elements]')
    expect(errors([{ type: 'actions', elements: Array.from({ length: 26 }, (_, i) => ({ type: 'button', action_id: `b${i}`, text: pt('b') })) }])).toContain('no more than 25 items allowed [json-pointer:/blocks/0/elements]')
  })

  it('reports missing required fields and unknown types', () => {
    expect(errors([{ type: 'image', image_url: 'https://example.com/a.png' }])).toContain('missing required field: alt_text [json-pointer:/blocks/0]')
    expect(errors([{ type: 'fancy_block' }])).toEqual(['unsupported type: fancy_block [json-pointer:/blocks/0/type]'])
    expect(errors([{ type: 'section' }])).toContain('must define either `text` or `fields` [json-pointer:/blocks/0]')
    expect(errors([{ type: 'section', text: md('x'), bogus: 1 }])).toContain('invalid additional property: bogus [json-pointer:/blocks/0]')
  })

  it('applies the per-surface block gates of src/block_kit', () => {
    const alert = { type: 'alert', text: pt('Heads up'), level: 'warning' }
    expect(errors([alert], 'modal')).toEqual([])
    expect(errors([alert])).toContain('Block type is not supported in this container [json-pointer:/blocks/0]')
    expect(errors([alert], 'home')).toContain('Unsupported block type: alert [json-pointer:/blocks/0]')
    const carousel = { type: 'carousel', elements: [{ type: 'card', title: pt('One') }] }
    expect(errors([carousel])).toEqual([])
    expect(errors([carousel], 'modal')).toContain('Unsupported block type: carousel [json-pointer:/blocks/0]')
    expect(errors([{ type: 'plan', title: 'Plan', tasks: [] }], 'home')).toContain('Block type is not supported in this container [json-pointer:/blocks/0]')
  })

  it('checks plan and data_visualization rules', () => {
    const task = (id: string) => ({ task_id: id, title: id, status: 'pending' })
    expect(errors([{ type: 'plan', title: 'Plan', tasks: [task('a'), task('a')] }])).toContain('task_ids must be unique [json-pointer:/blocks/0]')
    expect(errors([{ type: 'plan', title: 'P', tasks: [task('a')] }, { type: 'plan', title: 'Q', tasks: [task('b')] }])).toContain('Cannot have more than 1 plan block [json-pointer:]')
    const chart = (series: unknown) => ({ type: 'data_visualization', title: 'Weekly', chart: { type: 'bar', series, axis_config: { categories: ['Mon', 'Tue'] } } })
    expect(errors([chart([{ name: 'A', data: [{ label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }] }])])).toEqual([])
    expect(errors([chart([{ name: 'A', data: [{ label: 'Mon', value: 1 }] }])])).toContain('Series "A" must have exactly one data point for every category [json-pointer:/blocks/0/chart]')
    const three = [1, 2, 3].map(() => chart([{ name: 'A', data: [{ label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }] }]))
    expect(errors(three)).toContain('A message can contain a maximum of 2 data_visualization blocks [json-pointer:/blocks]')
  })

  it('checks table limits (TableBlockUtils.hack)', () => {
    const cell = (t: string) => ({ type: 'raw_text', text: t })
    expect(errors([{ type: 'table', rows: [[cell('a'), cell('b')], [cell('c')]] }])).toContain('uneven_table_rows_not_allowed [json-pointer:/blocks/0]')
    expect(errors([{ type: 'table', rows: [[cell('x'.repeat(5001)), cell('y'.repeat(5000))]] }])).toContain('table_character_count_must_not_exceed_10000 [json-pointer:/blocks/0]')
  })

  it('knows where each block is documented', () => {
    expect(surfacesFor([{ type: 'section' }])).toEqual(['message', 'modal', 'home'])
    expect(surfacesFor([{ type: 'section' }, { type: 'alert' }])).toEqual(['modal'])
    expect(surfacesFor([{ type: 'plan' }])).toEqual(['message'])
    expect(validateBlocks([{ type: 'data_table', caption: 'c', rows: [] }], 'modal').some((i) => i.level === 'warning' && /data_table/.test(i.message))).toBe(true)
  })
})
