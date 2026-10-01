import { describe, expect, it } from 'vitest'
import type { CanvasBlock } from '../types'
import { normalizeBlocks, renderArticle, units } from './model'
import {
  backspaceAtStart,
  canIndent,
  deleteAtEnd,
  deleteBetween,
  htmlLength,
  htmlText,
  indent,
  insertDivider,
  pasteLines,
  setType,
  split,
  toDivider,
  toggleChecked,
  unitStyle,
  type Model,
} from './ops'

// The canvas editor's model edits (ops.ts), as the iOS toolbar, the format picker and the keyboard drive them.

const T = 'TITLE'
const mention = '<control data-remapped="true"><a href="/team/U1">@Priya</a></control>'

const doc = (blocks: CanvasBlock[], title = 'Plan'): Model => ({ title, blocks })
const ids = (m: Model) => units(m.blocks).map((u) => u.id)

describe('inline text', () => {
  it('counts characters the way the caret does: entities as one, mentions and breaks as one', () => {
    expect(htmlLength('Tom &amp; Jerry')).toBe(11)
    expect(htmlLength(`Hi ${mention}!`)).toBe(5)
    expect(htmlLength('a<br>b')).toBe(3)
    expect(htmlLength('<b>bold</b> <i>it</i>')).toBe(7)
  })

  it('reads plain text, with mentions as their labels and no zero-width spaces', () => {
    expect(htmlText(`Ask ${mention} &lt;today&gt;`)).toBe('Ask @Priya <today>')
    expect(htmlText('\u200Bdraft')).toBe('draft')
  })
})

describe('Return', () => {
  it('splits a paragraph at the caret', () => {
    const m = doc([{ id: 'p1', type: 'p', html: 'Hello world' }])
    const r = split(m, 'p1', T, 'Hello', ' world')
    expect(r.model.blocks).toMatchObject([
      { id: 'p1', type: 'p', html: 'Hello' },
      { type: 'p', html: ' world' },
    ])
    expect(r.caret).toEqual({ id: r.model.blocks[1].id, offset: 0 })
  })

  it('continues a heading as body text when split at its end', () => {
    const r = split(doc([{ id: 'h', type: 'h1', html: 'Goals' }]), 'h', T, 'Goals', '')
    expect(r.model.blocks[1]).toMatchObject({ type: 'p', html: '' })
    // …but keeps the heading when split in the middle
    const mid = split(doc([{ id: 'h', type: 'h2', html: 'Goals' }]), 'h', T, 'Go', 'als')
    expect(mid.model.blocks[1]).toMatchObject({ type: 'h2', html: 'als' })
  })

  it('adds a list item, keeping its indent', () => {
    const m = doc([{ id: 'l', type: 'bullet', items: [{ id: 'a', html: 'One', indent: 1 }] }])
    const r = split(m, 'a', T, 'One', '')
    const list = r.model.blocks[0] as Extract<CanvasBlock, { items: unknown }>
    expect(list.items).toHaveLength(2)
    expect(list.items[1]).toMatchObject({ html: '', indent: 1 })
  })

  it('leaves the list from an empty item, outdenting a nested one first', () => {
    const nested = doc([{ id: 'l', type: 'bullet', items: [{ id: 'a', html: 'One' }, { id: 'b', html: '', indent: 1 }] }])
    const out = split(nested, 'b', T, '', '')
    expect((out.model.blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[1].indent).toBeUndefined()

    const flat = doc([{ id: 'l', type: 'checklist', items: [{ id: 'a', html: 'One' }, { id: 'b', html: '' }, { id: 'c', html: 'Three' }] }])
    const r = split(flat, 'b', T, '', '')
    expect(r.model.blocks.map((b) => b.type)).toEqual(['checklist', 'p', 'checklist'])
    expect(r.caret).toEqual({ id: 'b', offset: 0 })
  })

  it('in a new canvas’s title, goes down into its empty first paragraph', () => {
    const r = split(doc([{ id: 'p1', type: 'p', html: '' }], 'Launch plan'), T, T, 'Launch plan', '')
    expect(r.model.blocks).toEqual([{ id: 'p1', type: 'p', html: '' }])
    expect(r.caret).toEqual({ id: 'p1', offset: 0 })
  })

  it('in the title, starts the body', () => {
    const r = split(doc([{ id: 'p1', type: 'p', html: 'Body' }], 'Weekly'), T, T, 'Weekly', '')
    expect(r.model.title).toBe('Weekly')
    expect(r.model.blocks).toHaveLength(2)
    expect(r.caret?.id).toBe(r.model.blocks[0].id)
  })
})

describe('Backspace at the start', () => {
  it('turns a heading or quote back into body text', () => {
    const r = backspaceAtStart(doc([{ id: 'q', type: 'quote', html: 'Said' }]), 'q', T)
    expect(r?.model.blocks[0]).toMatchObject({ id: 'q', type: 'p', html: 'Said' })
  })

  it('takes a list item out of its list', () => {
    const m = doc([{ id: 'l', type: 'ordered', items: [{ id: 'a', html: 'One' }, { id: 'b', html: 'Two' }] }])
    const r = backspaceAtStart(m, 'b', T)
    expect(r?.model.blocks.map((b) => b.type)).toEqual(['ordered', 'p'])
    expect(r?.model.blocks[1]).toMatchObject({ id: 'b', html: 'Two' })
  })

  it('removes a divider right above before merging', () => {
    const m = doc([
      { id: 'p1', type: 'p', html: 'Above' },
      { id: 'hr', type: 'hr' },
      { id: 'p2', type: 'p', html: 'Below' },
    ])
    const r = backspaceAtStart(m, 'p2', T)
    expect(r?.model.blocks.map((b) => b.id)).toEqual(['p1', 'p2'])
  })

  it('merges into the unit before, the caret where they meet', () => {
    const m = doc([
      { id: 'p1', type: 'p', html: `Hi ${mention}` },
      { id: 'p2', type: 'p', html: ' there' },
    ])
    const r = backspaceAtStart(m, 'p2', T)
    expect(r?.model.blocks).toEqual([{ id: 'p1', type: 'p', html: `Hi ${mention} there` }])
    expect(r?.caret).toEqual({ id: 'p1', offset: 4 })
  })

  it('joins the first paragraph to the title', () => {
    const r = backspaceAtStart(doc([{ id: 'p1', type: 'p', html: ' notes' }], 'Team'), 'p1', T)
    expect(r?.model.title).toBe('Team notes')
    expect(r?.caret).toEqual({ id: T, offset: 4 })
  })

  it('does nothing in the title', () => {
    expect(backspaceAtStart(doc([]), T, T)).toBeNull()
  })
})

describe('Delete and selections', () => {
  it('pulls the next unit up at the end of a unit', () => {
    const m = doc([
      { id: 'p1', type: 'p', html: 'One' },
      { id: 'l', type: 'bullet', items: [{ id: 'a', html: 'two' }] },
    ])
    const r = deleteAtEnd(m, 'p1', T, 3)
    expect(r?.model.blocks).toEqual([{ id: 'p1', type: 'p', html: 'Onetwo' }])
    expect(r?.caret).toEqual({ id: 'p1', offset: 3 })
  })

  it('deletes across units and joins what is left', () => {
    const m = doc([
      { id: 'p1', type: 'p', html: 'Keep this' },
      { id: 'p2', type: 'p', html: 'gone' },
      { id: 'l', type: 'checklist', items: [{ id: 'a', html: 'and the end' }] },
    ])
    const r = deleteBetween(m, T, 'p1', 'Keep ', 'a', 'end')
    expect(r.model.blocks).toEqual([{ id: 'p1', type: 'p', html: 'Keep end' }])
    expect(r.caret).toEqual({ id: 'p1', offset: 5 })
  })
})

describe('section styles (the format picker and markdown shortcuts)', () => {
  it('makes a paragraph a heading, keeping the caret', () => {
    const r = setType(doc([{ id: 'p1', type: 'p', html: 'Goals' }]), 'p1', 'h2', 3)
    expect(r.model.blocks[0]).toMatchObject({ id: 'p1', type: 'h2' })
    expect(r.caret).toEqual({ id: 'p1', offset: 3 })
  })

  it('makes a paragraph a one-item list whose item keeps the id', () => {
    const r = setType(doc([{ id: 'p1', type: 'p', html: 'Ship it' }]), 'p1', 'checklist')
    expect(r.model.blocks[0]).toMatchObject({ type: 'checklist', items: [{ id: 'p1', html: 'Ship it' }] })
  })

  it('moves one list item to another kind of list, dropping its check', () => {
    const m = doc([{ id: 'l', type: 'checklist', items: [{ id: 'a', html: 'A', checked: true }, { id: 'b', html: 'B', checked: true }, { id: 'c', html: 'C' }] }])
    const r = setType(m, 'b', 'bullet')
    expect(r.model.blocks.map((b) => b.type)).toEqual(['checklist', 'bullet', 'checklist'])
    expect((r.model.blocks[1] as Extract<CanvasBlock, { items: unknown }>).items[0]).toEqual({ id: 'b', html: 'B' })
  })

  it('turns a list item back into a paragraph or heading', () => {
    const m = doc([{ id: 'l', type: 'bullet', items: [{ id: 'a', html: 'A' }] }])
    expect(setType(m, 'a', 'h1').model.blocks).toEqual([{ id: 'a', type: 'h1', html: 'A' }])
  })

  it('reports the style at the caret', () => {
    const m = doc([
      { id: 'h', type: 'h3', html: 'Small' },
      { id: 'l', type: 'ordered', items: [{ id: 'a', html: '1' }] },
    ])
    expect(unitStyle(m, T, T)).toBe('title')
    expect(unitStyle(m, 'h', T)).toBe('h3')
    expect(unitStyle(m, 'a', T)).toBe('ordered')
    expect(unitStyle(m, 'nope', T)).toBeNull()
  })
})

describe('dividers', () => {
  it('turns an empty paragraph into a divider with a paragraph after it', () => {
    const r = insertDivider(doc([{ id: 'p1', type: 'p', html: '' }]), 'p1', T)
    expect(r.model.blocks.map((b) => b.type)).toEqual(['hr', 'p'])
    expect(r.caret).toEqual({ id: r.model.blocks[1].id, offset: 0 })
  })

  it('puts the divider after a block with text, and at the top from the title', () => {
    const m = doc([
      { id: 'p1', type: 'p', html: 'Text' },
      { id: 'p2', type: 'p', html: 'More' },
    ])
    expect(insertDivider(m, 'p1', T).model.blocks.map((b) => b.type)).toEqual(['p', 'hr', 'p', 'p'])
    expect(insertDivider(m, T, T).model.blocks.map((b) => b.type)).toEqual(['hr', 'p', 'p', 'p'])
  })

  it('--- replaces the paragraph', () => {
    expect(toDivider(doc([{ id: 'p1', type: 'p', html: '' }]), 'p1').model.blocks.map((b) => b.type)).toEqual(['hr', 'p'])
  })
})

describe('indent and outdent', () => {
  const m = doc([
    {
      id: 'l',
      type: 'bullet',
      items: [
        { id: 'a', html: 'A' },
        { id: 'b', html: 'B' },
      ],
    },
    { id: 'p', type: 'p', html: 'P' },
  ])

  it('nests an item at most one level deeper than the one before it', () => {
    expect(canIndent(m, 'a', 1)).toBe(false)
    const once = indent(m, 'b', 1)!
    expect((once.model.blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[1].indent).toBe(1)
    expect(indent(once.model, 'b', 1)).toBeNull()
  })

  it('outdents back to the margin, and does nothing outside lists', () => {
    const once = indent(m, 'b', 1)!.model
    const back = indent(once, 'b', -1)!
    expect((back.model.blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[1]).toEqual({ id: 'b', html: 'B' })
    expect(canIndent(m, 'p', 1)).toBe(false)
    expect(canIndent(m, 'b', -1)).toBe(false)
  })
})

describe('checklists', () => {
  const m = doc([{ id: 'l', type: 'checklist', items: [{ id: 'a', html: 'Book venue' }] }])

  it('checks and unchecks an item', () => {
    const on = toggleChecked(m, 'a')
    expect((on.blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[0].checked).toBe(true)
    const off = toggleChecked(on, 'a')
    expect((off.blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[0].checked).toBeUndefined()
    expect((toggleChecked(m, 'a', false).blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[0].checked).toBeUndefined()
    // the original is untouched
    expect((m.blocks[0] as Extract<CanvasBlock, { items: unknown }>).items[0].checked).toBeUndefined()
  })

  it('renders checked items as Quip does', () => {
    const html = renderArticle({ id: 'F1', title: 'T', blocks: toggleChecked(m, 'a').blocks })
    expect(html).toMatch(/<li[^>]*class="with-list-item-marker-container slackified-checkbox checked"/)
    expect(html).toMatch(/<input class="checkbox" type="checkbox"[^>]* checked>/)
    expect(html).toContain('data-section-style="7"')
  })
})

describe('paste', () => {
  it('joins the first line to the caret and gives each other line its own unit', () => {
    const m = doc([{ id: 'l', type: 'bullet', items: [{ id: 'a', html: 'Milk' }] }])
    const r = pasteLines(m, 'a', T, 'Milk', '', [', eggs', 'Bread', 'Tea & cake'])
    const list = r.model.blocks[0] as Extract<CanvasBlock, { items: unknown }>
    expect(list.items.map((i) => i.html)).toEqual(['Milk, eggs', 'Bread', 'Tea &amp; cake'])
    expect(r.caret?.offset).toBe(10)
  })

  it('keeps the document ending in a text block', () => {
    expect(normalizeBlocks([{ id: 'hr', type: 'hr' }]).map((b) => b.type)).toEqual(['hr', 'p'])
    expect(ids(doc(normalizeBlocks([{ id: 'l', type: 'bullet', items: [{ id: 'a', html: '' }] }, { id: 'm', type: 'bullet', items: [{ id: 'b', html: '' }] }])))).toEqual(['a', 'b'])
  })
})
