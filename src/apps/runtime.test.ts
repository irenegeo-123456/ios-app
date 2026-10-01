import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Message } from '../data/types'

// The classic App Kit surfaces with the Launchpad sample, in Node: a slash command posting in the channel, a Block
// Kit button, a message shortcut opening a modal and its submission, and a message in the app DM (the web kit's
// runtime.test.ts, on the mobile store). Then the modal stack: required inputs, push, update, close.

const g = globalThis as Record<string, unknown>
g.window ??= globalThis
g.location ??= { search: '' }

type Modules = {
  store: typeof import('../app/store')
  apps: typeof import('./index')
  runtime: typeof import('./runtime')
  views: typeof import('../blocks/modal-state')
}
let m: Modules

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
  // The store first, like the app; the runtime adds the apps it didn't copy from the demo.
  const store = await import('../app/store')
  m = { store, apps: await import('./index'), runtime: await import('./runtime'), views: await import('../blocks/modal-state') }
})

afterAll(() => {
  vi.useRealTimers()
})

const LAUNCH = 'C04LAUNCHQ'
const launchpad = () => m.apps.kitAppById('launchpad')!
const client = () => m.store.useApp.getState()
const messages = (id: string): Message[] => client().messages[id] ?? []
const blockTypes = (msg: Message | undefined) => ((msg?.blocks ?? []) as { type: string }[]).map((b) => b.type)
const modalShown = () => client().sheets.some((s) => s.type === 'app-modal')

describe('App Kit surfaces (Launchpad)', () => {
  it('registers the web kit apps in the live workspace', () => {
    for (const id of ['launchpad', 'standup', 'compass', 'beacon']) {
      const app = m.apps.kitAppById(id)!
      expect(client().fx.users[app.botUserId]?.isApp).toBe(true)
      expect(client().fx.conversations[app.dmId]?.type).toBe('app')
    }
    // Standup's seed turned the demo's prompt into Block Kit.
    const standup = m.apps.kitAppById('standup')!
    expect(messages(standup.dmId).some((x) => blockTypes(x).includes('actions'))).toBe(true)
  })

  it('a slash command answers in the channel, showing the command like Slack does', async () => {
    const before = messages(LAUNCH).length
    expect(m.runtime.runSlashCommand('/launchpad status', { conversationId: LAUNCH })).toBe(true)
    expect(m.runtime.runSlashCommand('/nope', { conversationId: LAUNCH })).toBe(false)
    await vi.advanceTimersByTimeAsync(400)
    const added = messages(LAUNCH).slice(before)
    expect(added.map((x) => x.userId)).toEqual([client().fx.me, launchpad().botUserId])
    expect(added[0].text).toBe('/launchpad status')
    expect(blockTypes(added[1])).toContain('actions')
  })

  it('takes the composer form too: runSlashCommand(conversationId, text)', async () => {
    const before = messages(LAUNCH).length
    expect(m.runtime.runSlashCommand(LAUNCH, '/launchpad help')).toBe(true)
    expect(m.runtime.runSlashCommand(LAUNCH, 'not a command')).toBe(false)
    await vi.advanceTimersByTimeAsync(400)
    const reply = messages(LAUNCH).slice(before)[0]
    expect(reply?.ephemeral).toBe(true)
    expect(reply?.text).toBe('Launchpad commands')
  })

  it('a button runs its action handler (an ephemeral reply) and resolves when it has answered', async () => {
    const card = messages(LAUNCH).filter((x) => x.userId === launchpad().botUserId && !x.ephemeral).at(-1)!
    const before = messages(LAUNCH).length
    const done = m.runtime.runBlockAction(launchpad().botUserId, { surface: 'message', conversationId: LAUNCH, ts: card.ts }, { type: 'button', actionId: 'lp_view_checklist', blockId: 'lp_actions' })
    expect(done).toBeInstanceOf(Promise)
    let settled = false
    void done!.then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(100)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(300)
    expect(settled).toBe(true)
    const reply = messages(LAUNCH).slice(before)[0]
    expect(reply?.ephemeral).toBe(true)
    expect(reply?.userId).toBe(launchpad().botUserId)
    expect(m.runtime.dispatchBlockAction('U0NOTANAPP', { surface: 'message' }, { type: 'button', actionId: 'x', blockId: '' })).toBe(false)
  })

  it('a message shortcut opens a modal; submitting it runs views[callback_id]', async () => {
    const source = messages(LAUNCH).find((x) => x.userId !== launchpad().botUserId && x.text.length > 10)!
    m.runtime.runMessageShortcut(launchpad().botUserId, 'lp_task_from_message', { conversationId: LAUNCH, ts: source.ts })
    await vi.advanceTimersByTimeAsync(400)
    const view = m.views.useViews.getState().stack.at(-1)!
    expect(view.callback_id).toBe('lp_task')
    expect(modalShown()).toBe(true)

    // A date in the past fails validation like Slack's response_action: 'errors'.
    const invalid = view.onSubmit!({ view: { ...view, state: { values: {} } }, values: { lp_task_title: 'Book the webinar room', lp_task_due: '2001-01-01' } })
    await vi.advanceTimersByTimeAsync(400)
    expect(await invalid).toMatchObject({ response_action: 'errors' })

    const threadKey = `${LAUNCH}/${source.ts}`
    const repliesBefore = client().threads[threadKey]?.length ?? 0
    const ok = view.onSubmit!({ view: { ...view, state: { values: {} } }, values: { lp_task_title: 'Book the webinar room', lp_task_owner: client().fx.me, lp_task_priority: 'high' } })
    await vi.advanceTimersByTimeAsync(400)
    expect(await ok).toBeUndefined()
    const replies = client().threads[threadKey] ?? []
    expect(replies.length).toBe(repliesBefore + 1)
    expect(replies.at(-1)!.text).toContain('Book the webinar room')
    m.views.closeViews(false)
    expect(modalShown()).toBe(false)
  })

  it('a message in the app DM goes to onMessage', async () => {
    const dm = launchpad().dmId
    client().sendMessage(dm, 'status please')
    const sent = messages(dm).at(-1)!
    m.runtime.dispatchDirectMessage(launchpad().botUserId, dm, sent.ts)
    await vi.advanceTimersByTimeAsync(400)
    const answer = messages(dm).at(-1)!
    expect(answer.userId).toBe(launchpad().botUserId)
    expect(blockTypes(answer)).toContain('actions')
  })

  it('takes the composer form too: dispatchDirectMessage(conversationId, text)', async () => {
    const dm = launchpad().dmId
    client().sendMessage(dm, 'help')
    expect(m.runtime.dispatchDirectMessage(dm, 'help')).toBe(true)
    expect(m.runtime.dispatchDirectMessage(LAUNCH, 'help')).toBe(false)
    await vi.advanceTimersByTimeAsync(400)
    const answer = messages(dm).at(-1)!
    expect(answer.userId).toBe(launchpad().botUserId)
    expect(answer.text).toBe('Launchpad commands')
  })

  it('publishHome and setState re-render the App Home', async () => {
    const app = launchpad()
    const home = () => m.runtime.useKitStore.getState()
    const card = messages(LAUNCH).filter((x) => x.userId === app.botUserId && !x.ephemeral).at(-1)!
    const done = m.runtime.runBlockAction(app.botUserId, { surface: 'app_home' }, { type: 'button', actionId: 'lp_check_done', blockId: 'lp_check_docs', value: 'docs' })
    await vi.advanceTimersByTimeAsync(400)
    await done
    expect((home().states.launchpad as { checklist: { id: string; done: boolean }[] }).checklist.find((c) => c.id === 'docs')?.done).toBe(true)
    expect(card).toBeTruthy()
    await m.runtime.withApp('launchpad', (ctx) => ctx.publishHome([{ type: 'section', text: { type: 'mrkdwn', text: 'Published' } }]))
    expect(home().homes.launchpad?.[0]).toMatchObject({ type: 'section' })
  })
})

describe('the modal stack (views.open / push / update, spec blockkit.md §7)', () => {
  const text = (action_id: string, optional = false) => ({ type: 'input' as const, block_id: `b_${action_id}`, label: { type: 'plain_text' as const, text: action_id }, optional, element: { type: 'plain_text_input' as const, action_id } })

  it('shows "This field is required." under empty required inputs instead of submitting', async () => {
    const submitted = vi.fn()
    m.views.openView({ title: 'Form', submit: 'Save', blocks: [text('name'), text('note', true)], onSubmit: submitted })
    await m.views.submitTopView()
    const top = m.views.useViews.getState().stack.at(-1)!
    expect(submitted).not.toHaveBeenCalled()
    expect(m.views.useViews.getState().errors[top.id]).toEqual({ b_name: 'This field is required.' })
    expect(m.views.useViews.getState().scrollTo?.blockId).toBe('b_name')
    m.views.setViewValue(top.id, 'b_name', 'name', { type: 'plain_text_input', value: 'Zoe' })
    expect(m.views.hasUserEnteredData(top.id)).toBe(true)
    await m.views.submitTopView()
    expect(submitted).toHaveBeenCalledTimes(1)
    expect(submitted.mock.calls[0][0].values).toMatchObject({ name: 'Zoe', note: null })
    // No response_action: the view closes (it was the root, so the modal goes).
    expect(m.views.useViews.getState().stack).toHaveLength(0)
    expect(modalShown()).toBe(false)
  })

  it('pushes, keeps entered values across views.update, and pops back', async () => {
    const root = m.views.openView({ title: 'One', blocks: [text('a')] })
    const second = m.views.pushView({ title: 'Two', close: 'Back', blocks: [text('b')] })
    expect(m.views.useViews.getState().stack.map((v) => v.id)).toEqual([root.id, second.id])
    m.views.setViewValue(second.id, 'b_b', 'b', { type: 'plain_text_input', value: 'kept' })
    m.views.updateView({ title: 'Two (updated)', blocks: [text('b'), text('c')] }, second.id)
    expect(m.views.useViews.getState().values[second.id].b_b.b).toEqual({ type: 'plain_text_input', value: 'kept' })
    m.views.popView()
    expect(m.views.useViews.getState().stack.map((v) => v.id)).toEqual([root.id])
    expect(modalShown()).toBe(true)
    // Only one modal stack at a time (AppViewService.swift:72-76).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    m.views.openView({ title: 'Other', blocks: [] })
    expect(m.views.useViews.getState().stack.map((v) => v.id)).toEqual([root.id])
    warn.mockRestore()
    m.views.popView()
    expect(modalShown()).toBe(false)
  })

  it('response_action errors go under their inputs; unknown blocks go in the banner', async () => {
    m.views.openView({ title: 'Errors', submit: 'Go', blocks: [text('x', true)], onSubmit: () => ({ response_action: 'errors', errors: { b_x: 'Nope', elsewhere: 'Something else' } }) })
    await m.views.submitTopView()
    const top = m.views.useViews.getState().stack.at(-1)!
    expect(m.views.useViews.getState().errors[top.id]).toEqual({ b_x: 'Nope' })
    expect(m.views.useViews.getState().banner[top.id]).toBe('Something else')
    m.views.closeViews(false)
  })
})
