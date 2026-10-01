import { create } from 'zustand'
import type { ViewStateValues } from './views'

// What Block Kit elements in messages and App Homes hold between the app's answers (spec blockkit.md §6 › State):
// the values people entered or picked (Modules/DataService/BlockKitState: keyed by message ts or view id plus
// block_id / action_id), the action each block is waiting on (`waitingForResponse(actionId)`: that button shows its
// spinner, the block's other buttons are disabled, BlockInteractionCoordinator.swift:159-170,350-367) and inline
// errors. Modals keep theirs in modal-state.ts.

interface Entry {
  /** the blocks the values belong to (a message that's updated starts over) */
  sig: string
  values: ViewStateValues
}

interface BlockState {
  /** by surface key: `msg:<conversation>/<ts>`, `home:<app user>` */
  values: Record<string, Entry>
  /** surface key → block_id → the action_id waiting on the app */
  pending: Record<string, Record<string, string>>
  /** surface key → block_id → error */
  errors: Record<string, Record<string, string>>
  /** container blocks toggled open or closed, by surface key + block_id (taps are remembered, spec §3.15) */
  expanded: Record<string, boolean>
}

export const useBlockState = create<BlockState>()(() => ({ values: {}, pending: {}, errors: {}, expanded: {} }))

export function setSurfaceValues(key: string, sig: string, values: ViewStateValues) {
  useBlockState.setState((s) => ({ values: { ...s.values, [key]: { sig, values } } }))
}

export function setPending(key: string, blockId: string, actionId: string | null) {
  useBlockState.setState((s) => {
    const cur = { ...s.pending[key] }
    if (actionId) cur[blockId] = actionId
    else delete cur[blockId]
    return { pending: { ...s.pending, [key]: cur } }
  })
}

export function setSurfaceError(key: string, blockId: string, error: string | null) {
  useBlockState.setState((s) => ({ errors: { ...s.errors, [key]: { ...s.errors[key], [blockId]: error ?? '' } } }))
}

export function setExpanded(key: string, value: boolean) {
  useBlockState.setState((s) => ({ expanded: { ...s.expanded, [key]: value } }))
}

const EMPTY: Record<string, string> = {}
export const usePending = (key: string) => useBlockState((s) => s.pending[key] ?? EMPTY)
export const useSurfaceErrors = (key: string) => useBlockState((s) => s.errors[key] ?? EMPTY)
