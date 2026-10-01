import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Fixture } from '../data/types'
import type { Prototype } from './prototype'
import { prototypeApps } from './salesforce'

// Every prototype in prototypes/ (and the template) must load, pass definePrototype()'s checks, and apply to the
// Northstar demo without problems: every person, channel, app, thread and scene it mentions has to exist. Ported from
// the web kit (slack-remix src/kit/prototypes.test.ts), plus the mobile fields (device, appearance, theme, screens).

const ROOT = path.resolve(__dirname, '../..')
const FOLDERS = fs
  .readdirSync(path.join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && ['index.ts', 'index.tsx'].some((f) => fs.existsSync(path.join(ROOT, 'prototypes', d.name, f))))
  .map((d) => d.name)

/** Fresh copies of the modules a prototype touches (the app registry is global). */
async function fresh() {
  vi.resetModules()
  // the full demo, as the app sees it: fixtures.ts imports the area files (demo-*.ts) that extend it
  await import('../data/fixtures')
  const [registry, apps, data, apply] = await Promise.all([import('./registry'), import('../apps'), import('../data/demo'), import('./apply')])
  return { ...registry, ...apps, demo: data.demo, applyPrototype: apply.applyPrototype }
}

/** Loads a prototype and applies it the way src/kit/boot.ts does. */
async function applied(slug: string) {
  const m = await fresh()
  const loaded = await m.loadPrototype(slug)
  expect(loaded.error, `prototypes/${slug} failed to load`).toBeUndefined()
  const proto = loaded.proto as Prototype
  for (const def of prototypeApps(proto)) m.registerApp(def)
  const ids = Object.fromEntries(m.kitApps().map((r) => [r.def.id, { botUserId: r.botUserId, dmId: r.dmId }]))
  const fx: Fixture = structuredClone(m.demo)
  const result = m.applyPrototype(fx, proto, ids)
  return { loaded, proto, fx, result }
}

describe('prototype discovery', () => {
  it('finds every folder in prototypes/, skipping the template', async () => {
    const { PROTOTYPE_SLUGS } = await fresh()
    expect(PROTOTYPE_SLUGS).toEqual(FOLDERS.filter((f) => !f.startsWith('_')).sort())
    expect(PROTOTYPE_SLUGS.length).toBeGreaterThanOrEqual(1)
  })

  it('leaves the Northstar demo alone until a prototype is opened', async () => {
    const m = await fresh()
    const before = structuredClone(m.demo)
    const apps = m.kitApps().map((r) => r.def.id).sort()
    await m.loadAllPrototypes()
    expect(m.demo).toEqual(before)
    expect(m.kitApps().map((r) => r.def.id).sort()).toEqual(apps)
  })
})

describe.each([...FOLDERS])('prototypes/%s', (slug) => {
  it('loads and passes definePrototype() checks', async () => {
    const m = await fresh()
    const loaded = await m.loadPrototype(slug)
    expect(loaded.error).toBeUndefined()
    expect(loaded.problems).toEqual([])
    expect(loaded.proto?.kind).toBe('prototype')
    expect(loaded.proto?.title).toBeTruthy()
  })

  it('applies to the Northstar demo without problems', async () => {
    const { proto, fx, result } = await applied(slug)
    expect(result.problems).toEqual([])
    if (result.start.conversationId) expect(fx.conversations[result.start.conversationId]).toBeTruthy()
    // Every message is from someone and in a conversation that exists.
    for (const [conv, list] of Object.entries(fx.messages)) {
      expect(fx.conversations[conv], `messages for ${conv}`).toBeTruthy()
      for (const msg of list) expect(fx.users[msg.userId], `${conv}/${msg.ts} from ${msg.userId}`).toBeTruthy()
    }
    // Home only lists conversations that exist.
    for (const s of fx.sections) for (const id of s.conversationIds) expect(fx.conversations[id], `${s.name} lists ${id}`).toBeTruthy()
    // Its people and apps are in the workspace.
    for (const key of Object.keys(proto.people ?? {})) expect(result.user(key)).toBeTruthy()
    for (const app of prototypeApps(proto)) expect(result.conversation(`@${app.id}`)).toBeTruthy()
    // Scenes point at real conversations and people.
    for (const scene of proto.scenes ?? [])
      for (const post of scene.post === undefined ? [] : Array.isArray(scene.post) ? scene.post : [scene.post]) {
        expect(result.conversation(post.to), `${scene.label}: ${post.to}`).toBeTruthy()
        expect(result.user(post.from), `${scene.label}: ${post.from}`).toBeTruthy()
        if (post.replyTo) expect(result.message(post.replyTo), `${scene.label}: ${post.replyTo}`).toBeTruthy()
      }
  })
})

describe('definePrototype checks', () => {
  let definePrototype: typeof import('./prototype').definePrototype
  beforeEach(async () => {
    ;({ definePrototype } = await import('./prototype'))
  })
  const base = { title: 'T', description: 'D', author: 'A', updated: '2026-09-25' }

  it('accepts the minimum', () => {
    expect(definePrototype(base).problems).toEqual([])
  })

  it('explains what is missing or mistyped', () => {
    const p = definePrototype({ title: '', description: 'D', author: 'A', updated: '2026-13-01', peple: {} } as never)
    expect(p.problems).toContain('title is missing (the gallery card shows it)')
    expect(p.problems).toContain("updated '2026-13-01' isn't a date like '2026-09-25'")
    expect(p.problems.find((x) => x.includes("unknown field 'peple'"))).toContain("Did you mean 'people'?")
  })

  it('checks people, channels, messages and the start screen', () => {
    const p = definePrototype({
      ...base,
      people: { Zoe: { name: '' } },
      channels: { 'Project Acme': {} },
      messages: { '#x': [{ from: 'zoe' }, { from: 'zoe', text: 'hi', daysAgo: 1 }] },
      start: { view: 'activty' as never },
    })
    expect(p.problems).toEqual(
      expect.arrayContaining([
        "people: 'Zoe' should be a short lowercase key, like 'zoe' or 'lisa-z'",
        'people.Zoe.name is missing',
        "channels: 'Project Acme' isn't a Slack channel name (lowercase letters, numbers and hyphens, no spaces)",
        "messages['#x'][0] is empty: give it text, blocks or files",
        "messages['#x'][1]: daysAgo needs a time too, like at: '09:30'",
      ]),
    )
    expect(p.problems.find((x) => x.startsWith('start.view'))).toContain("Did you mean 'activity'?")
  })

  it("checks a person's dnd: true, or { until: '17:00' | ISO date-time }, and not on me", () => {
    const ok = definePrototype({ ...base, people: { zoe: { name: 'Zoe', dnd: true }, sam: { name: 'Sam', dnd: { until: '17:00' } }, kim: { name: 'Kim', dnd: { until: '2026-10-02T09:00' } }, al: { name: 'Al', dnd: false } } })
    expect(ok.problems).toEqual([])
    const bad = definePrototype({ ...base, me: { dnd: true }, people: { zoe: { name: 'Zoe', dnd: { until: '5pm' } }, sam: { name: 'Sam', dnd: 'yes' as never }, kim: { name: 'Kim', dnd: { untill: '17:00' } as never } } })
    const msg = "should be true, or { until: '17:00' } (a 24-hour time) or { until: '2026-10-02T09:00' }"
    expect(bad.problems).toEqual(
      expect.arrayContaining([`people.zoe.dnd ${msg}`, `people.sam.dnd ${msg}`, `people.kim.dnd ${msg}`, 'me.dnd: paused notifications show in a DM with that person, so set dnd on people, not on me']),
    )
  })

  it("resolves dnd's until: 'HH:MM' is the next such time, ISO is that moment", async () => {
    const { parseUntil } = await import('./prototype')
    const now = new Date(2026, 9, 1, 14, 30)
    expect(parseUntil('17:00', now)).toBe(new Date(2026, 9, 1, 17, 0).getTime())
    expect(parseUntil('09:00', now)).toBe(new Date(2026, 9, 2, 9, 0).getTime())
    expect(parseUntil('2026-10-05T08:15', now)).toBe(new Date(2026, 9, 5, 8, 15).getTime())
    expect(parseUntil('soon', now)).toBeNull()
    expect(parseUntil('25:00', now)).toBeNull()
  })

  it('checks the phone: device, appearance and theme', () => {
    expect(definePrototype({ ...base, device: 'iphone-se', appearance: 'dark', theme: 'jade' }).problems).toEqual([])
    const p = definePrototype({ ...base, device: 'pixel-9', appearance: 'dim' as never, theme: 'jaed' })
    expect(p.problems).toContain("device 'pixel-9' should be 'iphone-17-pro', 'iphone-17-pro-max', 'iphone-16' or 'iphone-se'")
    expect(p.problems).toContain("appearance should be 'light' or 'dark'")
    expect(p.problems.find((x) => x.startsWith("theme 'jaed'"))).toContain("Did you mean 'jade'?")
  })

  it('checks sidebar.salesforce', () => {
    for (const salesforce of [true, false, [], ['#general', '@priya']]) expect(definePrototype({ ...base, sidebar: { salesforce } }).problems).toEqual([])
    for (const salesforce of ['yes', ['#general', 3], [{ name: 'x' }]])
      expect(definePrototype({ ...base, sidebar: { salesforce: salesforce as never } }).problems).toEqual([
        "sidebar.salesforce should be true, or a list of what goes under the Salesforce app: ['#acme-renewal']",
      ])
  })

  it('never throws, even on nonsense', () => {
    expect(definePrototype(null as never).problems.length).toBe(1)
    expect(definePrototype({ ...base, messages: 'hi' as never, scenes: [{}] as never }).problems.length).toBeGreaterThan(0)
  })
})

describe('applying a prototype', () => {
  it('resolves people, mentions, channels, DMs, threads and the start screen', async () => {
    const m = await fresh()
    const { definePrototype, personId } = await import('./prototype')
    const fx = structuredClone(m.demo)
    const proto = definePrototype({
      title: 'T',
      description: 'D',
      author: 'A',
      updated: '2026-09-25',
      workspace: { name: 'Acme Inc.' },
      people: { zoe: { name: 'Zoe Maxwell' } },
      channels: { 'project-acme': { members: ['zoe', 'priya'] } },
      messages: {
        '#project-acme': [{ id: 'hello', from: 'zoe', text: 'Hi <@me> and <@priya>, see <#general>', reactions: { tada: ['me'] }, replies: [{ from: 'me', text: 'Hi!' }] }],
        '@zoe': [{ from: 'zoe', text: 'DM', minutesAgo: 5 }],
      },
      unreads: { '@zoe': 1 },
      sidebar: { hideDemo: true },
      start: { open: '#project-acme', thread: 'hello' },
    })
    const r = m.applyPrototype(fx, proto)
    expect(r.problems).toEqual([])
    expect(fx.workspace).toMatchObject({ name: 'Acme Inc.', domain: 'acme-inc', initials: 'A' })
    const zoe = personId('zoe')
    expect(fx.users[zoe]).toMatchObject({ name: 'Zoe Maxwell', presence: 'active' })
    const channel = r.conversation('#project-acme')!
    expect(fx.conversations[channel]).toMatchObject({ type: 'channel', name: 'project-acme', memberCount: 3 })
    const [msg] = fx.messages[channel]
    expect(msg.text).toBe(`Hi <@${fx.me}> and <@U04PRIYAPT>, see <#C04GENERAL|general>`)
    expect(msg.reactions).toEqual([{ name: 'tada', users: [fx.me] }])
    expect(fx.threads?.[`${channel}/${msg.ts}`]?.[0].userId).toBe(fx.me)
    expect(r.start).toMatchObject({ conversationId: channel, thread: { conversationId: channel, ts: msg.ts } })
    // DMs are made on demand; unreads land; the demo's conversations leave Home.
    const dm = r.conversation('@zoe')!
    expect(fx.conversations[dm]).toMatchObject({ type: 'im', userId: zoe })
    expect(fx.unreads[dm]).toEqual({ count: 1, mentions: 1 })
    expect(fx.sections.flatMap((s) => s.conversationIds).sort()).toEqual([channel, dm].sort())
    // Messages without a time end just before now, in order.
    expect(parseFloat(msg.ts) * 1000).toBeLessThan(Date.now())
  })

  it("applies people's dnd: until resolved against the prototype's clock, none for people without it", async () => {
    const m = await fresh()
    const { definePrototype, personId } = await import('./prototype')
    const fx = structuredClone(m.demo)
    const now = new Date(2026, 9, 1, 14, 30)
    const proto = definePrototype({
      title: 'T',
      description: 'D',
      author: 'A',
      updated: '2026-09-25',
      people: { zoe: { name: 'Zoe', dnd: true }, sam: { name: 'Sam', dnd: { until: '17:00' } }, kim: { name: 'Kim', dnd: false }, al: { name: 'Al' } },
    })
    expect(m.applyPrototype(fx, proto, {}, now).problems).toEqual([])
    expect(fx.users[personId('zoe')].dnd).toEqual({})
    expect(fx.users[personId('sam')].dnd).toEqual({ until: new Date(2026, 9, 1, 17, 0).getTime() })
    expect(fx.users[personId('kim')].dnd).toBeUndefined()
    expect(fx.users[personId('al')].dnd).toBeUndefined()
  })

  it('reports references that go nowhere, with suggestions', async () => {
    const m = await fresh()
    const { definePrototype } = await import('./prototype')
    const proto = definePrototype({
      title: 'T',
      description: 'D',
      author: 'A',
      updated: '2026-09-25',
      people: { zoe: { name: 'Zoe Maxwell' } },
      messages: { '#nowhere': [{ from: 'zoe', text: 'x' }], '#general': [{ from: 'zoee', text: 'typo' }, { from: 'zoe', text: 'hi <@harry>' }] },
      start: { open: '#general', thread: 'missing' },
    })
    const fx = structuredClone(m.demo)
    const r = m.applyPrototype(fx, proto)
    expect(fx.messages.C04GENERAL.some((x) => x.text === 'typo')).toBe(false)
    expect(fx.messages.C04GENERAL.some((x) => x.text === 'hi <@harry>')).toBe(true)
    expect(r.problems.find((p) => p.startsWith("messages['#nowhere']"))).toContain("there's no channel, person or app called '#nowhere'")
    expect(r.problems.find((p) => p.includes("'zoee'"))).toContain("Did you mean 'zoe'?")
    expect(r.problems.some((p) => p.includes('<@harry>'))).toBe(true)
    expect(r.problems).toContain("start.thread: no message has the id 'missing'.")
  })

  it('opens app DMs on the tab you ask for (the web kit’s `tab` works too)', async () => {
    const m = await fresh()
    const { definePrototype, defineApp } = await import('./index')
    const helper = defineApp({ id: 'helper', name: 'Helper', icon: '/kit/apps/polly.png', home: [] })
    const reg = m.registerApp(helper)
    const ids = { helper: { botUserId: reg.botUserId, dmId: reg.dmId } }
    for (const start of [{ open: '@helper', appTab: 'home' as const }, { open: '@helper', tab: 'home' as const }]) {
      const fx = structuredClone(m.demo)
      m.addToFixture(fx, reg)
      const r = m.applyPrototype(fx, definePrototype({ title: 'T', description: 'D', author: 'A', updated: '2026-09-25', apps: [helper], start }), ids)
      expect(r.problems).toEqual([])
      expect(r.start).toMatchObject({ conversationId: reg.dmId, appTab: 'home' })
    }
  })
})

describe("Slack's Salesforce section", () => {
  const base = { title: 'T', description: 'D', author: 'A', updated: '2026-09-25' }

  it("uses the kit's Salesforce app unless the prototype brings one", async () => {
    const { definePrototype, defineApp, salesforceApp } = await import('./index')
    expect(prototypeApps(definePrototype(base))).toEqual([])
    expect(prototypeApps(definePrototype({ ...base, sidebar: { salesforce: true } }))).toEqual([salesforceApp])
    const own = defineApp({ ...salesforceApp, home: [] })
    expect(prototypeApps(definePrototype({ ...base, apps: [own], sidebar: { salesforce: true } }))).toEqual([own])
  })
})
