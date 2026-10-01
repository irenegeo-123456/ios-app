import { useClient } from '../store/store'
import { useNav } from '../store/navHistory'
import { demo } from '../data/demo'
import type { Message } from '../data/types'
import { kitApps, registerApp } from '../apps'
import { BEAT_LABELS, SCENES } from '../demo/director'
import { openMoreView } from '../components/views/more/state'
import { applyPrototype, blocksText, type AppliedPrototype, type ResolvedStart } from './apply'
import { loadPrototype, type LoadedPrototype } from './registry'
import { protoSlug } from './route'
import { prototypeApps } from './salesforce'
import type { SceneInput, SceneKit, ScenePost } from './prototype'
import { asset } from '../lib/asset'

// `/?proto=<slug>` (src/main.tsx): `preparePrototype()` runs before the client's first render. It loads
// prototypes/<slug>/index.ts, registers its apps and swaps the store's workspace for the demo + the prototype, so
// the first frame is already the prototype. `startPrototype()` runs after the render: it opens the start screen,
// puts the prototype's scenes in the director panel (Ctrl+Shift+D) and lists any problems in a panel.
// A prototype that fails to load leaves the Northstar demo running and says why.

export interface KitPrototypeStatus {
  slug: string
  title?: string
  /** 'ready' once the start screen is open (the self-test waits for it) */
  status: 'loading' | 'ready' | 'failed'
  problems: string[]
  /** console errors and uncaught exceptions since the prototype loaded */
  errors: string[]
}

declare global {
  interface Window {
    __kitPrototype?: KitPrototypeStatus
  }
}

let current: { loaded: LoadedPrototype; applied?: AppliedPrototype } | null = null

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

function captureErrors(status: KitPrototypeStatus) {
  const original = console.error
  console.error = (...args: unknown[]) => {
    status.errors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ').slice(0, 300))
    original(...args)
  }
  window.addEventListener('error', (e) => status.errors.push(e.message))
}

/** Loads the prototype and seeds the store with it. Never rejects. */
export async function preparePrototype(): Promise<void> {
  const slug = protoSlug() ?? ''
  const status: KitPrototypeStatus = { slug, status: 'loading', problems: [], errors: [] }
  window.__kitPrototype = status
  captureErrors(status)
  const loaded = await loadPrototype(slug)
  current = { loaded }
  if (!loaded.proto) {
    status.status = 'failed'
    status.problems = [loaded.error ?? 'it did not load']
    return
  }
  status.title = loaded.proto.title
  try {
    for (const def of prototypeApps(loaded.proto)) registerApp(def)
    const apps = Object.fromEntries(kitApps().map((r) => [r.def.id, { botUserId: r.botUserId, dmId: r.dmId }]))
    // The store was created from a copy of the demo; start again from a fresh copy (now with the apps).
    const fx = structuredClone(demo)
    const applied = applyPrototype(fx, loaded.proto, apps)
    current.applied = applied
    status.problems = [...loaded.problems, ...applied.problems]
    useClient.setState({ fx, tab: fx.initial.tab, conversationId: fx.initial.conversationId, messages: fx.messages, threads: fx.threads ?? {}, canvases: fx.canvases ?? {} })
  } catch (e) {
    status.status = 'failed'
    status.problems = [...loaded.problems, `the prototype couldn't be applied: ${message(e)}`]
    console.warn(`[kit] ${slug}`, e)
  }
}

/** After the first render: the start screen, the director's scenes and the problems panel. */
export async function startPrototype(): Promise<void> {
  const status = window.__kitPrototype
  if (!status) return
  const proto = current?.loaded.proto
  const applied = current?.applied
  if (proto && applied) {
    SCENES.splice(
      0,
      SCENES.length,
      { label: `Start: ${proto.title}`, run: () => void go(applied.start) },
      ...(proto.scenes ?? []).map((s) => ({ label: s.label, run: () => void runScene(s, applied) })),
    )
    // Northstar's beats post into the conversations a clean sidebar hides, so the panel keeps only Reset.
    if (proto.sidebar?.hideDemo) for (const key of Object.keys(BEAT_LABELS)) if (key !== '0') delete BEAT_LABELS[key]
    try {
      await go(applied.start)
    } catch (e) {
      status.problems.push(`the start screen didn't open: ${message(e)}`)
    }
    // History starts here: Back shouldn't lead to the Northstar screen the store was created with.
    const { tab, conversationId, homePage } = useClient.getState()
    useNav.setState({ past: [], future: [], recent: [{ tab, conversationId, homePage }] })
    if (status.status === 'loading') status.status = 'ready'
  } else status.status = 'failed'
  if (status.problems.length) showProblems(status)
  // For screenshots: npm run shot -- "/?proto=<slug>" … --wait "[data-kit-ready]"
  document.body.setAttribute('data-kit-ready', status.status)
}

// ------------------------------------------------------------------------------------------------
// Navigation, scenes and live messages

/** Waits for an element (up to 3s), e.g. an app DM's tab after the conversation renders. */
async function whenReady(selector: string): Promise<HTMLElement | null> {
  for (let i = 0; i < 60; i++) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) return el
    await wait(50)
  }
  return null
}

const APP_TAB: Record<'home' | 'messages' | 'about', string> = { home: 'app_home', messages: 'channel', about: 'app_about' }

async function go(r: ResolvedStart) {
  const s = useClient.getState()
  s.closeModal()
  s.closePopover()
  if (r.conversationId) s.openConversation(r.conversationId)
  if (r.view) {
    if (r.view === 'dms' || r.view === 'activity' || r.view === 'slackbot' || r.view === 'home') s.setTab(r.view)
    else if (r.view === 'files' || r.view === 'later') openMoreView(r.view)
    else s.openHomePage(r.view)
  }
  if (r.tab) (await whenReady(`.p-view_contents--primary [role="tab"]#${APP_TAB[r.tab]}`))?.click()
  if (r.thread) s.openFlexpane('thread', { conversationId: r.thread.conversationId, ts: r.thread.ts })
  else if (r.profile) s.openFlexpane('profile', { userId: r.profile })
  else s.closeFlexpane()
}

let seq = 0
/** A unique Slack ts for "now" (live messages). */
function nowTs() {
  seq = (seq + 1) % 1000
  return `${Math.floor(Date.now() / 1000)}.${String(400000 + seq * 113).padStart(6, '0')}`
}

async function post(p: ScenePost, applied: AppliedPrototype) {
  const conversationId = applied.conversation(p.to)
  const userId = applied.user(p.from)
  if (!conversationId || !userId) return void console.warn(`[kit] scene post: can't find ${!conversationId ? p.to : p.from}`)
  const parent = p.replyTo ? applied.message(p.replyTo) : undefined
  const threadTs = parent ? (parent.threadTs ?? parent.ts) : undefined
  const s = useClient.getState()
  const typingMs = p.typingMs ?? (s.fx.users[userId]?.isApp ? 0 : 1800)
  if (typingMs > 0) {
    s.setTyping(conversationId, [...(s.typing[conversationId] ?? []).filter((id) => id !== userId), userId])
    await wait(typingMs)
  }
  const blocks = p.blocks ? applied.blocks(p.blocks) : undefined
  const msg: Message = { ts: nowTs(), userId, text: p.text ? applied.text(p.text) : blocks ? blocksText(blocks) : '', ...(blocks ? { blocks } : {}) }
  useClient.getState().receiveMessage(conversationId, msg, threadTs)
}

function sceneKit(applied: AppliedPrototype): SceneKit {
  return {
    go: (to) => void go(applied.resolveStart(to)),
    post: (p) => post(p, applied),
    react: (messageId, emoji, from) => {
      const m = applied.message(messageId)
      const userId = applied.user(from)
      if (m && userId) useClient.getState().reactAs(m.conversationId, m.ts, emoji.replace(/:/g, ''), userId)
      else console.warn(`[kit] react: can't find ${!m ? `message '${messageId}'` : from}`)
    },
    toast: (text) => useClient.getState().showToast(text),
    wait,
    id: (ref) => applied.user(ref) ?? applied.conversation(ref),
  }
}

async function runScene(scene: SceneInput, applied: AppliedPrototype) {
  try {
    if (scene.go !== undefined) await go(applied.resolveStart(scene.go))
    for (const p of scene.post === undefined ? [] : Array.isArray(scene.post) ? scene.post : [scene.post]) await post(p, applied)
    if (scene.run) await scene.run(sceneKit(applied))
  } catch (e) {
    console.warn(`[kit] scene "${scene.label}" failed`, e)
    useClient.getState().showToast(`Scene failed: ${message(e)}`)
  }
}

// ------------------------------------------------------------------------------------------------
// The problems panel (a presenter overlay like the self-test report, deliberately not Slack-styled)

function showProblems(status: KitPrototypeStatus) {
  // Gallery previews (`&preview`) show problems on the card instead.
  if (new URLSearchParams(location.search).has('preview')) return
  document.querySelector('[data-kit-problems]')?.remove()
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const panel = document.createElement('div')
  panel.setAttribute('data-kit-problems', '')
  // lint-tokens-ignore-start (presenter overlay, same look as the self-test report in every theme)
  panel.style.cssText =
    'position:fixed;top:48px;right:12px;z-index:100000;width:440px;max-height:60vh;overflow:auto;background:#1a1d21;color:#e8e8e8;font:13px/1.45 -apple-system,system-ui,sans-serif;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:14px 16px'
  const name = status.title ? `“${esc(status.title)}”` : `'${esc(status.slug)}'`
  const head = status.status === 'failed' ? `Prototype ${name} didn't load` : `Prototype ${name}: ${status.problems.length} thing${status.problems.length === 1 ? '' : 's'} to fix`
  panel.innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:15px">${head}</b><button style="background:none;border:0;color:#aaa;font-size:18px;cursor:pointer" aria-label="Close">×</button></div>` +
    status.problems.map((p) => `<div style="padding:4px 0;border-top:1px solid #2c2f33"><span style="color:#e8a33d">•</span> ${esc(p)}</div>`).join('') +
    `<div style="margin-top:8px;color:#9a9a9a">Edit prototypes/${esc(status.slug)}/index.ts and save; the page reloads. <a href="${asset('/?kit=prototypes')}" style="color:#1d9bd1">All prototypes</a></div>`
  // lint-tokens-ignore-end
  panel.querySelector('button')!.addEventListener('click', () => panel.remove())
  document.body.appendChild(panel)
}
