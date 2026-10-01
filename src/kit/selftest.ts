import { useApp, type Route, type Tab } from '../app/store'
import { screenNames, sheetNames } from '../app/nav/registry'
import { useKitPanel } from '../sim/panel'

// `/?selftest`: opens every tab, every conversation and thread, every registered screen and sheet, one after another,
// and reports what crashed or isn't built yet. With `&proto=<slug>` it also checks the prototype loaded cleanly and
// plays its scenes. Run it before sharing a build (`npm run selftest` runs it in headless Chrome). The report is on
// `window.__selftest` and in a panel; `<body data-selftest="done">` when it's finished.

interface Result {
  step: string
  ok: boolean
  detail?: string
}

declare global {
  interface Window {
    __selftest?: { results: Result[]; failures: number; done: boolean }
    __crashes?: string[]
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function problemsOnScreen(): string | undefined {
  const text = document.querySelector('.ios-screen')?.textContent ?? ''
  const missing = /No (screen|sheet) called “([^”]+)”/.exec(text)
  if (missing) return `not built: ${missing[1]} "${missing[2]}"`
  if (document.querySelector('.ios-guard')) return `crashed: ${document.querySelector('.ios-guard')?.textContent?.slice(0, 160)}`
  return undefined
}

export async function runSelftest() {
  const report = { results: [] as Result[], failures: 0, done: false }
  window.__selftest = report
  window.__crashes = []
  const errors: string[] = []
  const origError = console.error
  console.error = (...a: unknown[]) => {
    errors.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(' ').slice(0, 240))
    origError(...a)
  }
  window.addEventListener('error', (e) => errors.push(e.message))

  const step = async (name: string, act: () => void, settle = 450) => {
    const before = errors.length
    const crashes = window.__crashes!.length
    try {
      act()
      await wait(settle)
      const problem = problemsOnScreen() ?? (window.__crashes!.length > crashes ? window.__crashes![window.__crashes!.length - 1] : undefined) ?? (errors.length > before ? `error: ${errors[errors.length - 1]}` : undefined)
      report.results.push({ step: name, ok: !problem, detail: problem })
      if (problem) report.failures++
    } catch (e) {
      report.results.push({ step: name, ok: false, detail: e instanceof Error ? e.message : String(e) })
      report.failures++
    }
  }
  const app = () => useApp.getState()
  const reset = (tab: Tab = 'home', stack: Route[] = []) => app().navigate(tab, stack)

  const proto = window.__kitPrototype
  if (proto) {
    const problems = proto.status === 'failed' || proto.problems.length ? proto.problems.join('; ') || 'it did not load' : undefined
    report.results.push({ step: `prototype ${proto.slug}`, ok: !problems, detail: problems })
    if (problems) report.failures++
  }

  for (const tab of ['home', 'dms', 'activity', 'search', 'more', 'slackbot'] as Tab[]) await step(`tab ${tab}`, () => reset(tab))

  const fx = app().fx
  for (const conv of Object.values(fx.conversations)) {
    await step(`conversation ${conv.type === 'channel' || conv.type === 'private' ? '#' : ''}${conv.name}`, () => reset('home', [{ screen: 'conversation', id: conv.id }]), 350)
  }
  for (const key of Object.keys(app().threads).slice(0, 12)) {
    const [conversationId, ts] = key.split('/')
    await step(`thread ${fx.conversations[conversationId]?.name ?? conversationId}`, () => reset('home', [{ screen: 'conversation', id: conversationId }, { screen: 'thread', conversationId, ts }]), 350)
  }
  for (const user of Object.values(fx.users).slice(0, 6)) await step(`profile ${user.realName}`, () => reset('home', [{ screen: 'profile', userId: user.id }]), 300)

  const sampleConv = Object.values(fx.conversations).find((c) => c.type === 'channel' && (app().messages[c.id]?.length ?? 0) > 0)?.id
  const sampleTs = sampleConv ? app().messages[sampleConv].at(-1)?.ts : undefined
  const props: Record<string, Record<string, unknown>> = {
    'channel-details': { conversationId: sampleConv },
    profile: { userId: fx.me },
  }
  for (const name of screenNames()) {
    if (['conversation', 'thread'].includes(name)) continue
    await step(`screen ${name}`, () => reset('home', [{ screen: name, ...(props[name] ?? {}) }]), 350)
  }
  const sheetProps: Record<string, unknown> = { conversationId: sampleConv, ts: sampleTs, name: 'eyes', userId: fx.me }
  for (const name of sheetNames()) {
    await step(
      `sheet ${name}`,
      () => {
        reset('home', sampleConv ? [{ screen: 'conversation', id: sampleConv }] : [])
        app().presentSheet(name, sheetProps)
      },
      550,
    )
  }
  // The prototype's scenes, in order, as a presenter would click them (live posts type for ~2 s first).
  const scenes = useKitPanel.getState().scenes
  if (proto) for (const scene of scenes) await step(`scene “${scene.label}”`, () => scene.run(), scene.label === 'Start' ? 600 : 3200)
  if (!proto) reset('home')
  report.done = true
  console.error = origError
  document.body.dataset.selftest = 'done'
  showReport(report)
}

function showReport(report: NonNullable<Window['__selftest']>) {
  const panel = document.createElement('div')
  panel.setAttribute('data-selftest-report', '')
  // lint-ignore: a tool overlay, deliberately not Slack-styled
  panel.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:100000;width:420px;max-height:80vh;overflow:auto;background:#1c1c1e;color:#f2f2f7;font:12px/1.45 -apple-system,system-ui,sans-serif;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:14px 16px'
  const failed = report.results.filter((r) => !r.ok)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  panel.innerHTML =
    `<b style="font-size:14px">Self-test: ${report.results.length - failed.length}/${report.results.length} passed</b>` +
    (failed.length ? failed.map((r) => `<div style="padding:4px 0;border-top:1px solid #333"><span style="color:#ff9f0a">✗</span> ${esc(r.step)}<br><span style="color:#aaa">${esc(r.detail ?? '')}</span></div>`).join('') : '<div style="margin-top:6px;color:#30d158">Everything opened without errors.</div>')
  document.body.appendChild(panel)
}
