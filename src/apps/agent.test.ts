import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { KitBlock } from '../blocks/types'
import type { Message } from '../data/types'

// The agent runtime end to end, in Node: the streaming engine (Slack's 250 characters a second, task cards, plans,
// final blocks) and a Bolt-style agent answering a suggested prompt (title, status, stream, feedback buttons).
// The store and the runtime expect a browser; they get just enough of one.

const g = globalThis as Record<string, unknown>
g.window ??= globalThis
g.location ??= { search: '' }

type Modules = {
  apps: typeof import('./index')
  agent: typeof import('./agent')
  runtime: typeof import('./runtime')
  kit: typeof import('./kit')
  store: typeof import('../app/store')
}
let m: Modules

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
  // The store first, like the app: it loads the fixture, which registers the apps before the store copies it.
  const store = await import('../app/store')
  m = {
    store,
    apps: await import('./index'),
    agent: await import('./agent'),
    runtime: await import('./runtime'),
    kit: await import('./kit'),
  }
})

afterAll(() => {
  vi.useRealTimers()
})

const beacon = () => m.apps.kitAppById('beacon')!
const messages = (id: string): Message[] => m.store.useApp.getState().messages[id] ?? []
const replies = (id: string, ts: string): Message[] => m.store.useApp.getState().threads[`${id}/${ts}`] ?? []

/** The characters of rich text a message shows (what the reveal has reached). */
function shownText(blocks: KitBlock[] | undefined): string {
  const walk = (x: unknown): string => {
    if (!x || typeof x !== 'object') return ''
    if (Array.isArray(x)) return x.map(walk).join('')
    const o = x as { type?: string; text?: unknown; elements?: unknown }
    if (o.type === 'text' && typeof o.text === 'string') return o.text
    return walk(o.elements)
  }
  return (blocks ?? []).filter((b) => b.type === 'rich_text').map((b) => walk((b as { elements?: unknown }).elements)).join('')
}

describe('streaming (chat.startStream / appendStream / stopStream)', () => {
  it('reveals text at 250 characters a second and adds the final blocks when it stops', async () => {
    const app = beacon()
    const stream = m.agent.openStream(app, app.dmId, undefined)
    await stream.append({ markdown_text: 'a'.repeat(400) })
    await vi.advanceTimersByTimeAsync(1000)
    const partial = messages(app.dmId).find((x) => x.ts === stream.ts)
    expect(partial).toBeTruthy()
    const shown = shownText(partial!.blocks as KitBlock[]).length
    expect(shown).toBeGreaterThan(200)
    expect(shown).toBeLessThan(320)

    const done = stream.stop({ blocks: [m.kit.bk.feedback('test_feedback')] })
    await vi.advanceTimersByTimeAsync(2000)
    await done
    const final = messages(app.dmId).find((x) => x.ts === stream.ts)!
    expect(shownText(final.blocks as KitBlock[])).toHaveLength(400)
    const last = final.blocks![final.blocks!.length - 1] as unknown as { type: string; elements: { type: string; action_id: string }[] }
    expect(last.type).toBe('context_actions')
    expect(last.elements[0]).toMatchObject({ type: 'feedback_buttons', action_id: 'test_feedback' })
    expect(m.agent.isStreaming(app.dmId, stream.ts)).toBe(false)
  })

  it('draws task updates as task cards (timeline) and updates them in place', async () => {
    const app = beacon()
    const stream = m.agent.openStream(app, app.dmId, undefined, 'timeline')
    await stream.append({ chunks: [{ type: 'task_update', id: 't1', title: 'Searching', status: 'in_progress' }] })
    await vi.advanceTimersByTimeAsync(100)
    await stream.append({ chunks: [{ type: 'task_update', id: 't1', title: 'Found 3', status: 'complete', output: 'Acme, Initech, Globex' }] })
    const done = stream.stop({ markdown_text: 'Done.' })
    await vi.advanceTimersByTimeAsync(1000)
    await done
    const blocks = messages(app.dmId).find((x) => x.ts === stream.ts)!.blocks as unknown as { type: string; task_id?: string; status?: string; title?: string; output?: unknown }[]
    const cards = blocks.filter((b) => b.type === 'task_card')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ task_id: 't1', status: 'complete', title: 'Found 3' })
    expect(cards[0].output).toMatchObject({ type: 'rich_text' })
    expect(blocks[blocks.length - 1].type).toBe('rich_text')
  })

  it('groups task updates in one plan block (task_display_mode: plan)', async () => {
    const app = beacon()
    const stream = m.agent.openStream(app, app.dmId, undefined, 'plan')
    await stream.append({ chunks: [{ type: 'plan_update', title: 'Launch week' }, { type: 'task_update', id: 'a', title: 'Monday', status: 'complete' }, { type: 'task_update', id: 'b', title: 'Tuesday', status: 'in_progress' }] })
    await stream.append({ chunks: [{ type: 'task_update', id: 'b', title: 'Tuesday', status: 'complete', output: 'Flag flipped' }] })
    const done = stream.stop()
    await vi.advanceTimersByTimeAsync(500)
    await done
    const blocks = messages(app.dmId).find((x) => x.ts === stream.ts)!.blocks as unknown as { type: string; title?: string; tasks?: { task_id: string; status: string }[] }[]
    const plans = blocks.filter((b) => b.type === 'plan')
    expect(plans).toHaveLength(1)
    expect(blocks.some((b) => b.type === 'task_card')).toBe(false) // Slack: a plan and task cards are mutually exclusive
    expect(plans[0].title).toBe('Launch week')
    expect(plans[0].tasks!.map((t) => [t.task_id, t.status])).toEqual([
      ['a', 'complete'],
      ['b', 'complete'],
    ])
  })

  it('warns about calls Slack would reject, and still draws them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const app = beacon()
    const stream = m.agent.openStream(app, app.dmId, undefined)
    await stream.append({ markdown_text: 'Hi', chunks: [{ type: 'plan_update', title: 'Nope' }] })
    const done = stream.stop()
    await vi.advanceTimersByTimeAsync(500)
    await done
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/not both.*plan_update needs task_display_mode/s)
    const blocks = (messages(app.dmId).find((x) => x.ts === stream.ts)!.blocks ?? []) as { type: string }[]
    expect(blocks.map((b) => b.type)).toEqual(['rich_text'])
    warn.mockRestore()
  })
})

describe('an agent answering a suggested prompt (Bolt Assistant flow)', () => {
  it('titles the conversation, shows its status, streams the answer and clears the status', async () => {
    const app = beacon()
    m.runtime.startAgentConversation(app.botUserId)
    await vi.advanceTimersByTimeAsync(400) // threadStarted sets the prompts at the top of Messages
    expect(m.agent.useAgentStore.getState().prompts[app.dmId]?.prompts.length).toBeGreaterThan(0)

    m.runtime.sendAgentPrompt(app.botUserId, { title: 'Summarize open escalations', message: 'Summarize the open customer escalations' })
    const question = messages(app.dmId).at(-1)!
    expect(question.text).toBe('Summarize the open customer escalations')
    const key = `${app.dmId}/${question.ts}`

    await vi.advanceTimersByTimeAsync(400) // the handler runs after the app's latency
    const s = m.agent.useAgentStore.getState()
    expect(s.titles[key]).toBe('Open escalations')
    expect(s.status[key]).toMatchObject({ status: 'is looking into it…', loadingMessages: ['Checking tickets…', 'Reading account notes…', 'Pulling it together…'] })

    await vi.advanceTimersByTimeAsync(15000)
    const answer = replies(app.dmId, question.ts).find((r) => r.userId === app.botUserId)
    expect(answer).toBeTruthy()
    const types = ((answer!.blocks ?? []) as { type: string }[]).map((b) => b.type)
    expect(types).toContain('task_card')
    expect(types).toContain('rich_text')
    expect(types.at(-1)).toBe('context_actions')
    expect(m.agent.useAgentStore.getState().status[key]).toBeUndefined()
  })
})

describe('the assistant view (Chat / History)', () => {
  it('starts a conversation on a hidden placeholder root and answers in its thread with a plan', async () => {
    const app = m.apps.kitAppById('compass')!
    const ts = m.runtime.startAgentConversation(app.botUserId)!
    const key = `${app.dmId}/${ts}`
    expect(m.agent.useAgentStore.getState().roots[key]).toBe(true)
    expect(m.agent.useAgentStore.getState().active[app.botUserId]).toBe(ts)
    await vi.advanceTimersByTimeAsync(400) // threadStarted: greeting + prompts on the thread
    expect(replies(app.dmId, ts)[0]?.userId).toBe(app.botUserId)
    expect(m.agent.useAgentStore.getState().prompts[key]?.prompts).toHaveLength(4)

    m.runtime.sendAgentPrompt(app.botUserId, 'Plan the Atlas launch week: what happens each day, and who owns it?')
    expect(m.agent.useAgentStore.getState().prompts[key]).toBeUndefined() // asking hides the prompts
    await vi.advanceTimersByTimeAsync(400)
    expect(m.agent.useAgentStore.getState().titles[key]).toBeTruthy()
    expect(m.agent.useAgentStore.getState().status[key]?.status).toBe('is thinking…')

    await vi.advanceTimersByTimeAsync(20000)
    const answer = replies(app.dmId, ts).filter((r) => r.userId === app.botUserId).at(-1)!
    const types = ((answer.blocks ?? []) as { type: string }[]).map((b) => b.type)
    expect(types.filter((t) => t === 'plan')).toHaveLength(1)
    expect(types).not.toContain('task_card')
    expect(types).toContain('actions')
    expect(types.at(-1)).toBe('context_actions')
    expect(m.agent.useAgentStore.getState().prompts[key]?.title).toBe('Try next:')
    // The placeholder root carries the title (History, search).
    expect(messages(app.dmId).find((x) => x.ts === ts)?.text).toBe(m.agent.useAgentStore.getState().titles[key])
  })
})

describe('@-mentions in channels (app_mention)', () => {
  it('shows the loader under the message, then answers in its thread with a title', async () => {
    const app = beacon()
    const cs = 'C04CUSTSUC'
    m.store.useApp.getState().sendMessage(cs, `<@${app.botUserId}> which accounts are at risk?`)
    const msg = messages(cs).at(-1)!
    const key = `${cs}/${msg.ts}`
    expect(m.agent.useAgentStore.getState().status[key]).toMatchObject({ type: 'banner', botUserId: app.botUserId })
    await vi.advanceTimersByTimeAsync(20000)
    expect(replies(cs, msg.ts).some((r) => r.userId === app.botUserId)).toBe(true)
    expect(m.agent.useAgentStore.getState().titles[key]).toBe('At-risk accounts')
    expect(m.agent.useAgentStore.getState().status[key]).toBeUndefined()
  })
})
