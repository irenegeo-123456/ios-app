import { create } from 'zustand'
import { useApp } from '../app/store'
import type { AppActionEffect, BlockKitBlock, Message } from '../data/types'
import { runBlockAction } from '../apps/runtime'
import { insertMessage, mapMessage, nextTs } from '../apps/messages'
import { kitBlockId } from './ids'
import { openView } from './modal-state'
import type { KitAction, KitBlock } from './types'

// Block Kit interactions in messages and App Homes (the web kit's actions.ts, on the mobile store). Apps built with the
// App Kit (src/apps) get them as handler calls (src/apps/runtime.ts); the data-driven demo apps use effects
// (fx.apps[appId].actions, see src/data/demo-slackbot.ts), keyed by `action_id:value` or `action_id`, where
// `{{option}}`, `{{me}}` and `{{time}}` are filled in. Either way the returned promise settles when the app has
// answered, so the element can show its spinner until then (spec blockkit.md §6).

/** App Home blocks after interactions with the demo apps, keyed by app user id (falls back to the fixture's `home`). */
export const useAppHomes = create<{ homes: Record<string, KitBlock[]>; set: (appId: string, blocks: KitBlock[]) => void }>()((set) => ({
  homes: {},
  set: (appId, blocks) => set((s) => ({ homes: { ...s.homes, [appId]: blocks } })),
}))

export interface ActionTarget {
  /** the app's user id */
  appId: string
  surface: 'message' | 'app_home'
  /** message surface: where the message lives */
  conversationId?: string
  ts?: string
}

/** How long a demo app "takes" to answer (the web kit posted its replies after 450 ms). */
const DEMO_LATENCY = 450

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function clock(d = new Date()) {
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

/** Deep-copies an effect's JSON, filling in the template variables it knows (modal fields are filled on submit). */
function fill<T>(value: T, vars: Record<string, string>): T {
  return JSON.parse(JSON.stringify(value).replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k].replace(/["\\]/g, '\\$&').replace(/\n/g, '\\n') : m))) as T
}

export function findEffect(appId: string, action: KitAction): AppActionEffect | undefined {
  const actions = useApp.getState().fx.apps?.[appId]?.actions
  if (!actions) return undefined
  return (action.value !== undefined ? actions[`${action.actionId}:${action.value}`] : undefined) ?? actions[action.actionId]
}

/** Runs an interaction (button tap, overflow pick, select choice): the kit app's handler, else the demo effect. */
export async function runAppAction(target: ActionTarget, action: KitAction): Promise<void> {
  const kit = runBlockAction(target.appId, { surface: target.surface, conversationId: target.conversationId, ts: target.ts }, action)
  if (kit) return kit
  const effect = findEffect(target.appId, action)
  await sleep(DEMO_LATENCY)
  if (!effect) return
  const s = useApp.getState()
  const me = s.fx.users[s.fx.me]
  const vars = { option: action.label ?? '', value: action.value ?? '', me: me?.name ?? 'You', time: clock() }
  applyEffect(target, action.blockId, fill(effect, vars))
}

function applyEffect(target: ActionTarget, blockId: string, effect: AppActionEffect) {
  if (effect.url) window.open(effect.url, '_blank', 'noopener,noreferrer')
  if (effect.replaceBlock || effect.replaceMessage) {
    if (target.surface === 'message' && target.conversationId && target.ts) {
      mapMessage(target.conversationId, target.ts, (m) => {
        let blocks = (m.blocks ?? []) as BlockKitBlock[]
        if (effect.replaceBlock) blocks = replaceBlock(blocks, blockId, effect.replaceBlock)
        if (effect.replaceMessage?.blocks) blocks = effect.replaceMessage.blocks
        return { ...m, blocks, text: effect.replaceMessage?.text ?? m.text }
      })
    } else if (target.surface === 'app_home' && effect.replaceBlock) {
      const current = useAppHomes.getState().homes[target.appId] ?? ((useApp.getState().fx.apps?.[target.appId]?.home ?? []) as KitBlock[])
      useAppHomes.getState().set(target.appId, replaceBlock(current as BlockKitBlock[], blockId, effect.replaceBlock) as KitBlock[])
    }
  }
  if (effect.reply) postAppMessage(target.appId, effect.reply.text, effect.reply.blocks)
  if (effect.modal) {
    const modal = effect.modal
    openView({
      appId: target.appId,
      title: modal.title,
      blocks: modal.blocks as KitBlock[],
      submit: modal.submitLabel ?? 'Submit',
      close: modal.closeLabel ?? 'Cancel',
      onSubmit: async ({ values }) => {
        if (!modal.submit) return
        await sleep(DEMO_LATENCY)
        const vars: Record<string, string> = { me: useApp.getState().fx.users[useApp.getState().fx.me]?.name ?? 'You', time: clock() }
        for (const [k, v] of Object.entries(values)) vars[k] = (Array.isArray(v) ? v.join(', ') : (v ?? '')).trim() || 'None'
        applyEffect(target, blockId, fill(modal.submit, vars))
      },
    })
  }
}

/** Replaces the block with `blockId` (Slack ids or the renderer's generated ones) by `next`. */
function replaceBlock(blocks: BlockKitBlock[], blockId: string, next: BlockKitBlock[]): BlockKitBlock[] {
  const i = blocks.findIndex((b, idx) => kitBlockId(b, idx) === blockId)
  if (i === -1) return blocks
  return [...blocks.slice(0, i), ...next, ...blocks.slice(i + 1)]
}

/** The app's DM (conversation of type "app" with that app). */
export function appConversationId(appId: string): string | undefined {
  return Object.values(useApp.getState().fx.conversations).find((c) => c.type === 'app' && c.userId === appId)?.id
}

/** Posts a message from an app into its DM, like a `chat.postMessage` response to an interaction. */
export function postAppMessage(appId: string, text: string, blocks?: BlockKitBlock[]) {
  const conversationId = appConversationId(appId)
  if (!conversationId) return
  const msg: Message = { ts: nextTs(), userId: appId, text, ...(blocks ? { blocks } : {}) }
  insertMessage(conversationId, msg)
}
