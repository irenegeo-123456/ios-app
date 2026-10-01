import { createContext, useCallback, useContext, useMemo, type MouseEvent, type ReactNode } from 'react'
import { useApp } from '../app/store'
import { kitBlockId } from './ids'
import { expandMarkdown } from './markdown'
import { initialValues, payloadFor, setViewError, setViewValue, useViews } from './modal-state'
import { runAppAction } from './actions'
import { setPending, setSurfaceError, setSurfaceValues, useBlockState, usePending, useSurfaceErrors } from './state'
import type { KitAction, KitBlock } from './types'
import type { ModalView, StateValue, ViewStateValues } from './views'

// The surface blocks are drawn on, and what their elements need from it: the per-surface rules of spec blockkit.md §0
// (insets, "(optional)", inline vs full-screen text editing, whether `optional: false` is enforced), the state of the
// inputs (§6 › State), which block waits on the app (the spinner), and where interactions go: a message's app
// (src/blocks/actions.ts), an App Home's app, or the modal view's onAction.

export type SurfaceKind = 'message' | 'modal' | 'home'

export interface SurfaceContextValue {
  kind: SurfaceKind
  /** identity of the surface's local state (`msg:<conversation>/<ts>`, `home:<app user>`, `view:<id>`) */
  key: string
  /** false in previews and search results: inputs, buttons and complex blocks are disabled (§0 › Interaction gating) */
  interactive: boolean
  values: ViewStateValues
  setValue: (blockId: string, actionId: string, value: StateValue) => void
  errors: Record<string, string>
  setError: (blockId: string, error: string | null) => void
  /** block_id → the action_id waiting on the app */
  pending: Record<string, string>
  /**
   * Runs an interaction. `spinner`: the element shows the spinner and its block's other buttons are disabled until the
   * app answers (BlockInteractionCoordinator.swift:159-170).
   */
  dispatch: (action: KitAction, opts?: { spinner?: boolean }) => Promise<void>
  /** the app behind the surface (message author, App Home owner, the modal's app) */
  appUserId?: string
  conversationId?: string
  ts?: string
  view?: ModalView
}

const SurfaceCtx = createContext<SurfaceContextValue | null>(null)

export function useSurface(): SurfaceContextValue {
  const s = useContext(SurfaceCtx)
  if (!s) throw new Error('Block Kit elements are drawn inside <BlockSurface>')
  return s
}

/** Messages and modals put " (optional)" after optional input labels in modals only (InputBlock+BKContainerBlockConvertible.swift:200-207). */
export const showsOptional = (kind: SurfaceKind) => kind === 'modal'
/** Messages open text inputs in a full-screen editor; modals and App Homes edit them inline (BlockSurfaceV2.swift:181-186). */
export const editsInline = (kind: SurfaceKind) => kind !== 'message'

/** Any JSON an app sent → blocks the renderer can walk (junk entries are dropped; markdown blocks are expanded as Slack's server does). */
export function normalizeBlocks(blocks: unknown): KitBlock[] {
  const list = (Array.isArray(blocks) ? blocks : []).filter((b): b is KitBlock => !!b && typeof b === 'object' && typeof (b as { type?: unknown }).type === 'string')
  return expandMarkdown(list)
}

/** The values of a message's or App Home's inputs: what the user changed on top of the blocks' own initial values. */
function useLocalState(key: string, blocks: KitBlock[], mode: 'reset' | 'merge') {
  const sig = useMemo(() => JSON.stringify(blocks), [blocks])
  const entry = useBlockState((s) => s.values[key])
  const values = useMemo(() => {
    const fresh = initialValues(blocks)
    if (!entry) return fresh
    if (entry.sig === sig) return entry.values
    // A message that was updated starts over (the new blocks say what's chosen, BlockActionsHandler.swift:1795-1816);
    // an App Home that was re-published keeps what the user entered for matching ids (BlockKitStateUpdater.swift:32-42).
    if (mode === 'reset') return fresh
    for (const [blockId, actions] of Object.entries(fresh)) for (const actionId of Object.keys(actions)) if (entry.values[blockId]?.[actionId]) fresh[blockId][actionId] = entry.values[blockId][actionId]
    return fresh
  }, [blocks, entry, sig, mode])
  const setValue = useCallback(
    (blockId: string, actionId: string, value: StateValue) => {
      const cur = useBlockState.getState().values[key]
      const base = cur?.sig === sig ? cur.values : values
      setSurfaceValues(key, sig, { ...base, [blockId]: { ...base[blockId], [actionId]: value } })
    },
    [key, sig, values],
  )
  return { values, setValue }
}

export interface BlockSurfaceProps {
  /** the blocks, as apps send them (anything that isn't a block is skipped) */
  blocks: readonly unknown[] | undefined
  surface: SurfaceKind
  /** the app that gets the interactions (a message's author, the App Home's app) */
  appUserId?: string
  /** message surface: where the message is */
  conversationId?: string
  ts?: string
  /** modal surface: the view */
  view?: ModalView
  /** false draws the blocks without letting anyone use them (previews, search results) */
  interactive?: boolean
  /** handles interactions instead of the app (the gallery) */
  onAction?: (action: KitAction) => void | Promise<void>
  /** the state key, when the default (message ts, app, view id) doesn't fit */
  stateKey?: string
  className?: string
}

/** Block Kit blocks on a message, a modal or an App Home, as Slack iOS draws them. */
export function BlockSurface({ blocks: raw, surface, appUserId, conversationId, ts, view, interactive = true, onAction, stateKey, className }: BlockSurfaceProps) {
  const blocks = useMemo(() => normalizeBlocks(raw), [raw])
  const key = stateKey ?? (surface === 'modal' ? `view:${view?.id ?? 'none'}` : surface === 'home' ? `home:${appUserId ?? 'none'}` : `msg:${conversationId ?? ''}/${ts ?? ''}`)
  const local = useLocalState(key, blocks, surface === 'home' ? 'merge' : 'reset')
  const localErrors = useSurfaceErrors(key)
  const viewValues = useViews((s) => (view ? s.values[view.id] : undefined))
  const viewErrors = useViews((s) => (view ? s.errors[view.id] : undefined))
  const pending = usePending(key)

  const isModal = surface === 'modal' && !!view
  const values = isModal ? (viewValues ?? local.values) : local.values
  const errors = isModal ? (viewErrors ?? {}) : localErrors
  const setValue = useCallback(
    (blockId: string, actionId: string, value: StateValue) => (isModal ? setViewValue(view!.id, blockId, actionId, value) : local.setValue(blockId, actionId, value)),
    [isModal, view, local],
  )
  const setError = useCallback((blockId: string, error: string | null) => (isModal ? setViewError(view!.id, blockId, error) : setSurfaceError(key, blockId, error)), [isModal, view, key])

  const dispatch = useCallback(
    async (action: KitAction, opts: { spinner?: boolean } = {}) => {
      if (!interactive) return
      if (opts.spinner) setPending(key, action.blockId, action.actionId)
      try {
        if (onAction) await onAction(action)
        else if (surface === 'modal' && view) {
          const current = useViews.getState().stack.find((v) => v.id === view.id) ?? view
          await current.onAction?.(action, payloadFor(current))
        } else if (appUserId) await runAppAction({ appId: appUserId, surface: surface === 'home' ? 'app_home' : 'message', conversationId, ts }, action)
      } catch (e) {
        // Failures are only logged, like Slack iOS (BlockActionNetworkDispatcher.swift:128-146).
        console.error('[blocks] action failed', e)
      } finally {
        if (opts.spinner) setPending(key, action.blockId, null)
      }
    },
    [interactive, key, onAction, surface, view, appUserId, conversationId, ts],
  )

  const ctx = useMemo<SurfaceContextValue>(
    () => ({ kind: surface, key, interactive, values, setValue, errors, setError, pending, dispatch, appUserId, conversationId, ts, view }),
    [surface, key, interactive, values, setValue, errors, setError, pending, dispatch, appUserId, conversationId, ts, view],
  )

  return (
    <SurfaceCtx.Provider value={ctx}>
      <div
        className={['bk-surface', `bk-surface--${surface}`, !interactive && 'is-static', className].filter(Boolean).join(' ')}
        data-bk-surface={surface}
        onClick={interactive ? keepControlTaps : undefined}
      >
        {blocks.map((b, i) => (
          <BlockRow key={kitBlockId(b, i) + i} block={b} index={i} />
        ))}
      </div>
    </SurfaceCtx.Provider>
  )
}

/** What takes a tap itself: buttons, pickers, option rows, text fields, links and mentions. */
const CONTROL = 'button, a, input, textarea, select, [role="button"], [role="checkbox"], [role="radio"], [role="link"], [data-tap]'

/**
 * A tap on a block's control is the control's (a UIControl takes the touch): it doesn't reach the message row, whose
 * own tap opens the thread. Taps on plain block content still do (MessageListActionHandler.swift:356-385).
 */
function keepControlTaps(e: MouseEvent<HTMLDivElement>) {
  const hit = (e.target as Element).closest?.(CONTROL)
  if (hit && e.currentTarget.contains(hit)) e.stopPropagation()
}

// ------------------------------------------------------------------------------------------------
// Rows

type BlockRenderer = (props: { block: KitBlock; blockId: string; index: number }) => ReactNode
const renderers = new Map<string, BlockRenderer>()

/** Each block file registers its renderer (blocks/*.tsx); unknown types draw the fallback banner. */
export function registerBlock(type: string, render: BlockRenderer) {
  renderers.set(type, render)
}

/**
 * The top inset each block carries; nothing is added between rows (Helpers/Utils.swift:24-53): 4 for the first
 * block, actions and divider 10, input 16, everything else 12. The fallback banner pads itself (8 / 8) instead.
 */
export function blockTop(type: string, first: boolean): number {
  if (first) return 4
  if (type === 'actions' || type === 'divider') return 10
  if (type === 'input') return 16
  return 12
}

function BlockRow({ block, index }: { block: KitBlock; index: number }) {
  const blockId = kitBlockId(block, index)
  const render = renderers.get(block.type) ?? renderers.get('__fallback')
  const known = renderers.has(block.type)
  // Blocks Slack doesn't know draw their `fallback` blocks (the forward-compatibility convention), else the banner.
  const fallback = !known && Array.isArray(block.fallback) && block.fallback.length ? block.fallback : undefined
  return (
    <div className={`bk-row bk-row--${known ? block.type : 'unknown'}${index === 0 ? ' is-first' : ''}`} style={{ ['--bk-top' as string]: `${blockTop(known ? block.type : 'unknown', index === 0)}px` }} data-block-id={blockId}>
      {fallback ? <FallbackBlocks blocks={fallback} /> : render?.({ block, blockId, index })}
    </div>
  )
}

function FallbackBlocks({ blocks }: { blocks: KitBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockRow key={i} block={b} index={i + 1} />
      ))}
    </>
  )
}

/** Blocks nested in a container block, drawn with the surface's context (container child_blocks). */
export function NestedBlocks({ blocks }: { blocks: KitBlock[] }) {
  return (
    <>
      {normalizeBlocks(blocks).map((b, i) => (
        <BlockRow key={kitBlockId(b, i) + i} block={b} index={i} />
      ))}
    </>
  )
}

/** The signed-in user (visible_to_user_ids, mention styling). */
export const useMeId = () => useApp((s) => s.fx.me)
