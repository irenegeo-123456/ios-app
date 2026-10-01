import { useApp, type Route, type Tab } from '../app/store'
import { registerScreen, registerSheet } from '../app/nav/registry'
import { demo } from '../data/demo'
import type { Message } from '../data/types'
import { kitApps, registerApp } from '../apps'
import { applyPrototype, blocksText, type AppliedPrototype, type ResolvedStart } from './apply'
import { loadPrototype, PROTOTYPE_SLUGS, type LoadedPrototype } from './registry'
import { prototypeApps } from './salesforce'
import type { SceneInput, SceneKit, ScenePost, StartView } from './prototype'
import { useKitPanel } from '../sim/panel'
import { useSim } from '../sim/store'
import { useTheme } from '../theme/ThemeStyle'
import { asset } from '../lib/asset'
import { applyPrototypeFlags } from '../app/flags'

// `/?proto=<slug>` (src/main.tsx): `preparePrototype()` runs before the first render. It loads prototypes/<slug>/,
// registers its apps, screens and sheets, and swaps the workspace for the demo + the prototype, so the first frame is
// already the prototype. `startPrototype()` runs after the render: it fills the side panel with the prototype's
// scenes and any problems. A prototype that fails to load leaves the Northstar demo running and says why.
// The flow and the definition are the web kit's (slack-remix src/kit/boot.ts), with mobile navigation.

export interface KitPrototypeStatus {
  slug: string
  title?: string
  status: 'loading' | 'ready' | 'failed'
  problems: string[]
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
export const protoSlug = (): string | null => new URLSearchParams(location.search).get('proto')?.trim() || null

/** Loads the prototype and seeds the store with it. Never rejects. */
export async function preparePrototype(): Promise<void> {
  const slug = protoSlug() ?? ''
  const status: KitPrototypeStatus = { slug, status: 'loading', problems: [], errors: [] }
  window.__kitPrototype = status
  window.addEventListener('error', (e) => status.errors.push(e.message))
  const loaded = await loadPrototype(slug)
  current = { loaded }
  if (!loaded.proto) {
    status.status = 'failed'
    status.problems = [loaded.error ?? 'it did not load']
    return
  }
  const proto = loaded.proto
  status.title = proto.title
  try {
    for (const def of prototypeApps(proto)) registerApp(def)
    const apps = Object.fromEntries(kitApps().map((r) => [r.def.id, { botUserId: r.botUserId, dmId: r.dmId }]))
    for (const [name, c] of Object.entries(proto.screens ?? {})) registerScreen(name, c)
    for (const [name, c] of Object.entries(proto.sheets ?? {})) {
      if (typeof c === 'function') registerSheet(name, c)
      else registerSheet(name, c.component, c.presentation)
    }
    // The store was created from a copy of the demo; start again from a fresh copy (now with the apps).
    const fx = structuredClone(demo)
    const applied = applyPrototype(fx, proto, apps)
    current.applied = applied
    status.problems = [...loaded.problems, ...applied.problems]
    // The prototype's device and look, unless the URL (or the viewer, later) says otherwise.
    const q = new URLSearchParams(location.search)
    if (proto.device && !q.has('device')) useSim.setState({ device: proto.device })
    if (proto.appearance && !q.has('appearance')) useSim.setState({ appearance: proto.appearance })
    if (proto.slackbotTab !== undefined && !q.has('slackbotTab')) useSim.setState({ slackbotTab: proto.slackbotTab })
    applyPrototypeFlags(proto.flags)
    if (proto.theme && !q.has('theme')) useTheme.getState().setPreset(proto.theme)
    const start = routesFor(applied.start)
    useApp.getState().loadFixture(fx, { tab: start.tab, stack: start.stack })
    if (start.sheet) useApp.getState().presentSheet(start.sheet.type, start.sheet.props)
  } catch (e) {
    status.status = 'failed'
    status.problems = [...loaded.problems, `the prototype couldn't be applied: ${message(e)}`]
    console.warn(`[kit] ${slug}`, e)
  }
}

/** After the first render: scenes and problems in the side panel, and the ready flag for tools. */
export async function startPrototype(): Promise<void> {
  const status = window.__kitPrototype
  if (!status) return
  const proto = current?.loaded.proto
  const applied = current?.applied
  if (proto && applied) {
    useKitPanel.getState().setPanel({
      title: proto.title,
      subtitle: proto.description,
      scenes: [{ label: 'Start', run: () => go(applied.start) }, ...(proto.scenes ?? []).map((s) => ({ label: s.label, run: () => void runScene(s, applied) }))],
      problems: status.problems,
    })
    if (status.status === 'loading') status.status = 'ready'
  } else {
    status.status = 'failed'
    useKitPanel.getState().setPanel({ title: status.slug || 'Prototype', subtitle: "This prototype didn't load.", problems: status.problems })
  }
  if (status.problems.length) console.warn(`[kit] ${status.slug}: ${status.problems.length} thing(s) to fix\n- ${status.problems.join('\n- ')}`)
  // For screenshots: npm run shot -- "/?proto=<slug>" out.png --wait "[data-kit-ready]"
  document.body.setAttribute('data-kit-ready', status.status)
}

/** The side panel's kit links and the prototype switcher, for every page (demo or prototype). */
export function initKitPanel() {
  const slug = protoSlug()
  useKitPanel.getState().setPanel({
    links: [
      { label: 'All prototypes', href: asset('/?kit=prototypes') },
      { label: 'SlackKit components', href: asset('/?kit=components') },
      { label: 'Icons', href: asset('/?kit=icons') },
      ...(slug ? [{ label: 'Northstar demo', href: asset('/') }] : []),
    ],
    prototypes: PROTOTYPE_SLUGS,
    current: slug ?? undefined,
  })
}

// ------------------------------------------------------------------------------------------------
// Navigation, scenes and live messages

/** Home's screens, as a start `view` (web names work too). */
const VIEW_SCREEN: Partial<Record<StartView, string>> = {
  threads: 'threads',
  later: 'later',
  drafts: 'drafts',
  huddles: 'huddles',
  files: 'files',
  unreads: 'catch-up',
  slackbot: 'slackbot',
  directories: 'directories',
  you: 'you',
}
const TAB_VIEWS: Tab[] = ['home', 'dms', 'activity', 'search', 'more', 'slackbot']

export function routesFor(r: ResolvedStart): { tab: Tab; stack: Route[]; sheet?: { type: string; props?: Record<string, unknown> } } {
  let tab: Tab = r.tab ?? 'home'
  const stack: Route[] = []
  // 'slackbot' is a tab only with the Slackbot tab on; otherwise it's the screen Home's tile opens
  const slackbotIsTab = r.view === 'slackbot' && useSim.getState().slackbotTab
  if (r.view && (TAB_VIEWS as string[]).includes(r.view) && (r.view !== 'slackbot' || slackbotIsTab)) tab = r.view as Tab
  else if (r.view && VIEW_SCREEN[r.view] && !slackbotIsTab) stack.push({ screen: VIEW_SCREEN[r.view]! })
  if (r.conversationId) {
    // A DM opened without a tab goes on the DMs tab only if asked; Home is where the demo usually starts.
    stack.push({ screen: 'conversation', id: r.conversationId, ...(r.appTab ? { appTab: r.appTab } : {}) })
  }
  if (r.thread) stack.push({ screen: 'thread', conversationId: r.thread.conversationId, ts: r.thread.ts })
  if (r.profile) stack.push({ screen: 'profile', userId: r.profile })
  if (r.screen) stack.push({ screen: r.screen, ...(r.props ?? {}) })
  return { tab, stack, sheet: r.sheet ? { type: r.sheet, props: r.sheetProps } : undefined }
}

function go(r: ResolvedStart) {
  const { tab, stack, sheet } = routesFor(r)
  const s = useApp.getState()
  s.navigate(tab, stack)
  if (r.conversationId) s.markRead(r.conversationId)
  if (sheet) s.presentSheet(sheet.type, sheet.props)
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
  const s = useApp.getState()
  const typingMs = p.typingMs ?? (s.fx.users[userId]?.isApp ? 0 : 1800)
  if (typingMs > 0) {
    s.setTyping(conversationId, [...(s.typing[conversationId] ?? []).filter((id) => id !== userId), userId])
    await wait(typingMs)
  }
  const blocks = p.blocks ? applied.blocks(p.blocks) : undefined
  const msg: Message = { ts: nowTs(), userId, text: p.text ? applied.text(p.text) : blocks ? blocksText(blocks) : '', ...(blocks ? { blocks } : {}) }
  useApp.getState().receiveMessage(conversationId, msg, threadTs)
}

function sceneKit(applied: AppliedPrototype): SceneKit {
  return {
    go: (to) => go(applied.resolveStart(to)),
    post: (p) => post(p, applied),
    react: (messageId, emoji, from) => {
      const m = applied.message(messageId)
      const userId = applied.user(from)
      if (m && userId) useApp.getState().reactAs(m.conversationId, m.ts, emoji.replace(/:/g, ''), userId)
      else console.warn(`[kit] react: can't find ${!m ? `message '${messageId}'` : from}`)
    },
    toast: (text) => useApp.getState().showToast(text),
    wait,
    id: (ref) => applied.user(ref) ?? applied.conversation(ref),
  }
}

async function runScene(scene: SceneInput, applied: AppliedPrototype) {
  try {
    if (scene.go !== undefined) go(applied.resolveStart(scene.go))
    for (const p of scene.post === undefined ? [] : Array.isArray(scene.post) ? scene.post : [scene.post]) await post(p, applied)
    if (scene.run) await scene.run(sceneKit(applied))
  } catch (e) {
    console.warn(`[kit] scene "${scene.label}" failed`, e)
    useApp.getState().showToast(`Scene failed: ${message(e)}`)
  }
}
