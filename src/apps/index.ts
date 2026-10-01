import { extendDemo } from '../data/demo'
import { makeTs } from '../lib/time'
import type { AppProfile, BlockKitBlock, Fixture, User } from '../data/types'
import type { AppDefinition } from './kit'
import { seedHistory } from './agent-state'

// App Kit registry, shared with the web kit (slack-remix src/apps/index.ts): every registered app gets a bot user, an
// app DM listed under "Agents & apps", a Home tab and About from its definition, and its seed messages. The runtime
// that runs its handlers (buttons, modals, slash commands) is src/apps/runtime.ts. The web kit's sample apps
// (APPS below) register when this module loads; prototypes register theirs at boot (src/kit/boot.ts).
//
// To add your app: create src/apps/<your-app>.ts with defineApp() and add it to APPS below.

import standup from './standup'
import launchpad from './sample/launchpad'
import compass from './sample/compass'
import beacon from './sample/beacon'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyApp = AppDefinition<any>

/** The apps every workspace has (the web kit's list). */
export const APPS: AnyApp[] = [launchpad, standup, compass, beacon]

export interface RegisteredApp {
  def: AnyApp
  /** the bot user's id */
  botUserId: string
  /** the app DM's conversation id */
  dmId: string
}

const registry: RegisteredApp[] = []
const listeners = new Set<(app: RegisteredApp) => void>()

const slug = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, 'X').slice(0, 8)

/** Adds an app (re-registering replaces it) to the registry and to the demo fixture. */
export function registerApp(def: AnyApp): RegisteredApp {
  const entry: RegisteredApp = { def, botUserId: def.bot?.id ?? `U0${slug(def.id)}`, dmId: def.bot?.dmId ?? `D0${slug(def.id)}` }
  const i = registry.findIndex((r) => r.def.id === def.id)
  if (i === -1) registry.push(entry)
  else registry[i] = entry
  extendDemo((fx) => addToFixture(fx, entry))
  for (const fn of listeners) fn(entry)
  return entry
}

/**
 * Called for every app registered from now on. The runtime uses it to add apps registered after the store copied the
 * demo to the live workspace.
 */
export function onAppRegistered(fn: (app: RegisteredApp) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** A kit app's Home with its initial state, for the fixture (the runtime's useKitHome renders the live one). */
function firstHome(fx: Fixture, def: AnyApp, botUserId: string, dmId: string): BlockKitBlock[] {
  if (typeof def.home !== 'function') return (def.home ?? []) as unknown as BlockKitBlock[]
  const me = fx.users[fx.me]
  try {
    const blocks = def.home({
      state: structuredClone(def.state ?? {}),
      user: { id: fx.me, name: me?.name ?? fx.me, realName: me?.realName ?? fx.me, avatar: me?.avatar ?? '', title: me?.title, isMe: true, isApp: false },
      app: { id: def.id, name: def.name, botUserId, dmId },
      userName: (id: string) => fx.users[id]?.realName ?? id,
    })
    return (Array.isArray(blocks) ? blocks : []) as unknown as BlockKitBlock[]
  } catch (e) {
    console.error(`[app kit] ${def.name} home failed`, e)
    return []
  }
}

let seq = 900
/** Puts an app's bot user, DM, profile and seed messages into a fixture. */
export function addToFixture(fx: Fixture, { def, botUserId, dmId }: RegisteredApp) {
  const name = def.bot?.name ?? def.name
  const user: User = { ...fx.users[botUserId], id: botUserId, name, realName: name, avatar: def.icon, avatar2x: def.icon, presence: 'active', isApp: true }
  fx.users[botUserId] = user
  if (!fx.conversations[dmId]) fx.conversations[dmId] = { id: dmId, type: 'app', name, userId: botUserId }
  fx.messages[dmId] = fx.messages[dmId] ?? []
  const section = fx.sections.find((s) => s.kind === 'recent_apps')
  if (section && !section.conversationIds.includes(dmId)) {
    section.conversationIds = [...section.conversationIds, dmId].sort((a, b) => (fx.conversations[a]?.name ?? '').localeCompare(fx.conversations[b]?.name ?? ''))
  }
  const about = def.about ?? {}
  const description = [about.description ?? def.description ?? `${def.name} is installed in ${fx.workspace.name}.`, ...(about.features ?? []).map((f) => `• ${f}`)].join('\n')
  const profile: AppProfile = {
    ...fx.apps?.[botUserId],
    description,
    avatarLarge: def.iconLarge ?? def.icon,
    homepage: about.homepage,
    managedBy: about.managedBy,
    // The Home as it first opens (the conversation screen shows the Home tab when there is one); kit apps' Homes then
    // render live from the runtime (useKitHome: state changes, views.publish).
    home: def.home ? firstHome(fx, def, botUserId, dmId) : undefined,
  }
  fx.apps = { ...fx.apps, [botUserId]: profile }
  const now = Date.now()
  const ts = (minutesAgo: number) => makeTs(new Date(now - minutesAgo * 60_000), ++seq)
  def.seed?.(fx, { botUserId, dmId, ts })
  // Agents: their past conversations (threads in the DM).
  const entry = registry.find((r) => r.def.id === def.id)
  if (entry && def.agent?.history?.length && !(fx.messages[dmId] ?? []).some((m) => fx.threads?.[`${dmId}/${m.ts}`]?.length)) seedHistory(entry, fx, ts)
}

APPS.forEach(registerApp)

// ------------------------------------------------------------------------------------------------
// Lookups (the runtime and the UI use these)

export const kitApps = (): RegisteredApp[] => registry
export const kitAppById = (id: string) => registry.find((r) => r.def.id === id)
export const kitAppByUser = (userId: string | undefined) => (userId ? registry.find((r) => r.botUserId === userId) : undefined)

/** Slash commands of every app, for the composer's autocomplete. */
export function appCommandList(): { name: string; usage: string; description: string; appId: string }[] {
  return registry.flatMap((r) => (r.def.commands ?? []).map((c) => ({ name: c.command, usage: c.usage ?? '', description: c.description, appId: r.botUserId })))
}

/** Global shortcuts of every app (the composer's "/" menu). */
export function appGlobalShortcuts(): { appId: string; appName: string; callbackId: string; name: string; description?: string }[] {
  return registry.flatMap((r) => (r.def.globalShortcuts ?? []).map((s) => ({ appId: r.botUserId, appName: r.def.name, callbackId: s.callback_id, name: s.name, description: s.description })))
}

/** Message shortcuts of every app (a message's actions sheet). */
export function appMessageShortcuts(): { appId: string; appName: string; icon: string; callbackId: string; name: string; description?: string }[] {
  return registry.flatMap((r) => (r.def.messageShortcuts ?? []).map((s) => ({ appId: r.botUserId, appName: r.def.name, icon: r.def.icon, callbackId: s.callback_id, name: s.name, description: s.description })))
}
