import { describe, expect, it } from 'vitest'
import { pickFixture } from '../../../data/fixtures'
import type { Fixture } from '../../../data/types'
import { appliedCount, autocomplete, NO_FILTERS, parseQuery, prefixIndex, recentConversations, recentlyVisitedPlaces, requiredTokens, search, tokensOf } from './searchIndex'

const fx = pickFixture()
const input = { fx, messages: fx.messages, threads: fx.threads ?? {} }
const ME = fx.me

describe('matching', () => {
  it('matches word starts only', () => {
    expect(prefixIndex('launch-atlas', 'atl')).toBe(7)
    expect(prefixIndex('Priya Patel', 'pat')).toBe(6)
    expect(prefixIndex('Priya Patel', 'atel')).toBe(-1)
  })
  it('drops punctuation and, when something is left, stop words', () => {
    expect(tokensOf('Who owns the copy?')).toEqual(['who', 'owns', 'the', 'copy'])
    expect(requiredTokens('What is the launch checklist status?')).toEqual(['launch', 'checklist', 'status'])
    expect(requiredTokens('the')).toEqual(['the'])
  })
  it('parses from: in: with: modifiers', () => {
    const q = parseQuery(fx, 'summary from:@priya in:#launch-atlas')
    expect(q.text).toBe('summary')
    expect(q.from).toEqual(['U04PRIYAPT'])
    expect(q.in).toEqual(['C04LAUNCHQ'])
    // unknown references stay in the text
    expect(parseQuery(fx, 'in:#nowhere hello').text).toBe('in:#nowhere hello')
  })
})

describe('result types', () => {
  it('finds messages and thread replies containing every word', () => {
    const hits = search(input, 'launch checklist', 'messages', NO_FILTERS, 'relevant')
    expect(hits.length).toBeGreaterThan(0)
    for (const h of hits) if (h.kind === 'message') expect(h.msg.text.toLowerCase()).toContain('checklist')
  })
  it('applies From, In, Exclude automations and the date range', () => {
    const from = search(input, 'launch', 'messages', { ...NO_FILTERS, from: ['U04PRIYAPT'] }, 'newest')
    expect(from.every((h) => h.kind === 'message' && h.msg.userId === 'U04PRIYAPT')).toBe(true)
    const inLaunch = search(input, 'launch', 'messages', { ...NO_FILTERS, in: ['C04LAUNCHQ'] }, 'newest')
    expect(inLaunch.every((h) => h.kind === 'message' && h.conversationId === 'C04LAUNCHQ')).toBe(true)
    const noBots = search(input, 'deploy', 'messages', { ...NO_FILTERS, excludeAutomations: true }, 'relevant')
    expect(noBots.every((h) => h.kind === 'message' && !fx.users[h.msg.userId]?.isApp)).toBe(true)
    const future = search(input, 'launch', 'messages', { ...NO_FILTERS, date: { kind: 'custom', start: Date.now() / 1000 + 86400 * 30 } }, 'relevant')
    expect(future).toEqual([])
  })
  it('sorts newest and oldest', () => {
    const newest = search(input, 'launch', 'messages', NO_FILTERS, 'newest').map((h) => (h.kind === 'message' ? parseFloat(h.ts) : 0))
    expect(newest).toEqual([...newest].sort((a, b) => b - a))
    const oldest = search(input, 'launch', 'messages', NO_FILTERS, 'oldest').map((h) => (h.kind === 'message' ? parseFloat(h.ts) : 0))
    expect(oldest).toEqual([...oldest].sort((a, b) => a - b))
  })
  it('finds people, channels, canvases, files and DMs', () => {
    expect(search(input, 'pri', 'people', NO_FILTERS, 'relevant').map((h) => h.kind === 'person' && h.user.id)).toContain('U04PRIYAPT')
    expect(search(input, 'launch', 'channels', NO_FILTERS, 'relevant').map((h) => h.kind === 'channel' && h.conversation.id)).toContain('C04LAUNCHQ')
    expect(search(input, 'plan', 'canvases', NO_FILTERS, 'relevant').every((h) => h.kind === 'file' && h.file.kind === 'canvas')).toBe(true)
    expect(search(input, 'one-pager', 'files', NO_FILTERS, 'relevant').some((h) => h.kind === 'file' && h.file.kind === 'pdf')).toBe(true)
    expect(search(input, 'priya', 'dms', NO_FILTERS, 'relevant').some((h) => h.kind === 'dm' && h.conversationId === 'D04PRIYA01')).toBe(true)
  })
  it('filters channels by type and membership', () => {
    const priv = search(input, 'a', 'channels', { ...NO_FILTERS, channelType: 'private' }, 'relevant')
    expect(priv.every((h) => h.kind === 'channel' && h.conversation.type === 'private')).toBe(true)
  })
  it('counts applied filters like SearchFilters.filtersAppliedCount', () => {
    expect(appliedCount(NO_FILTERS)).toBe(0)
    expect(appliedCount({ ...NO_FILTERS, from: ['a', 'b'], onlyMyChannels: true, date: { kind: 'last7' } })).toBe(3)
  })
})

describe('autocomplete and zero state', () => {
  it('suggests people, channels and files by word start', () => {
    const items = autocomplete(input, 'mar', [])
    expect(items.some((i) => i.kind === 'user' && i.user.id === 'U04MRCSCHN')).toBe(true)
    expect(items.some((i) => i.kind === 'channel' && i.conversation.name === 'marketing')).toBe(true)
    expect(autocomplete(input, '#mar', []).every((i) => i.kind === 'channel')).toBe(true)
  })
  it('puts visited conversations first', () => {
    const recents = recentConversations(fx, fx.messages, ['C04DESIGN1'])
    expect(recents[0].id).toBe('C04DESIGN1')
    expect(recents.length).toBeLessThanOrEqual(20)
  })
  it('lists recently visited places: visited first (app DMs too), then channels and DMs by activity, 30 at most', () => {
    const app = Object.values(fx.conversations).find((c) => c.type === 'app')!
    const places = recentlyVisitedPlaces(fx, fx.messages, [app.id, 'C04DESIGN1'])
    expect(places[0].id).toBe(app.id)
    expect(places[1].id).toBe('C04DESIGN1')
    expect(places.slice(2).every((c) => c.type !== 'app')).toBe(true)
    expect(places.length).toBeLessThanOrEqual(30)
  })
  it('works on an empty workspace', () => {
    const empty: Fixture = { ...fx, messages: {}, threads: {}, conversations: {}, users: { [ME]: fx.users[ME] }, files: [], canvases: {}, lists: {} }
    const e = { fx: empty, messages: {}, threads: {} }
    expect(search(e, 'anything', 'messages', NO_FILTERS, 'relevant')).toEqual([])
    expect(autocomplete(e, 'a', [])).toEqual(expect.any(Array))
    expect(recentConversations(empty, {}, [])).toEqual([])
    expect(recentlyVisitedPlaces(empty, {}, [])).toEqual([])
  })
})
