import { create } from 'zustand'
import { useApp } from '../app/store'
import { kitBlockId } from './ids'
import { richTextPlain, validateInputs } from './validation'
import type { BlockElement, InputBlock, KitAction, KitBlock, OptionObject } from './types'
import type { FlatValue, ModalView, StateValue, ViewInput, ViewPayload, ViewResponse, ViewStateValues } from './views'

// Block Kit modals, like Slack's views.open / views.push / views.update: one stack of views presented in the
// 'app-modal' sheet (AppModal.tsx), each view with its input state (`view.state.values`), validation errors and
// the submit / close flow of Slack iOS (spec blockkit.md §7; Modules/Features/AppView,
// Modules/Integration/AppView/Implementation/AppViewService.swift). The stack logic is the web kit's
// (slack-remix src/components/blocks/views.ts); presenting it is the mobile store's presentSheet.

export const MODAL_SHEET = 'app-modal'

interface ViewsState {
  stack: ModalView[]
  values: Record<string, ViewStateValues>
  /** what each view's inputs started with (Close asks before losing edits: ModernAppViewInteractor.swift:378-397) */
  initial: Record<string, ViewStateValues>
  errors: Record<string, Record<string, string>>
  /** a server-side error without a block, shown as the banner above the body (AppViewPresenter.swift:73-85) */
  banner: Record<string, string | undefined>
  /** view id being submitted: the loading overlay covers its body (ModernAppViewInteractor.swift:238-249) */
  submitting: string | null
  /** the block to scroll to after a submit found errors (the first invalid input) */
  scrollTo: { viewId: string; blockId: string; n: number } | null
  /** the snackbar at the bottom of the modal (AppViewPresenter.swift:127-150) */
  snackbar: { text: string; n: number } | null
  /** the push direction of the last stack change, for the nav transition */
  motion: 'push' | 'pop' | 'none'
}

export const useViews = create<ViewsState>()(() => ({ stack: [], values: {}, initial: {}, errors: {}, banner: {}, submitting: null, scrollTo: null, snackbar: null, motion: 'none' }))

let seq = 0
const newViewId = () => `V0${(Date.now() + ++seq).toString(36).toUpperCase().slice(-9)}`
let n = 0

export const viewText = (t: ModalView['title'] | undefined): string | undefined => (t === undefined ? undefined : typeof t === 'string' ? t : t.text)

/** `submit_failed`: Sorry, there was an unexpected error. Please try again. (yaml:18974) */
export const SUBMIT_FAILED_TEXT = 'Sorry, there was an unexpected error. Please try again.'

function presentSheet() {
  const app = useApp.getState()
  if (!app.sheets.some((s) => s.type === MODAL_SHEET)) app.presentSheet(MODAL_SHEET, {})
}

function dismissSheet() {
  const app = useApp.getState()
  const entry = app.sheets.find((s) => s.type === MODAL_SHEET)
  if (entry) app.dismissSheet(entry.key)
}

// ------------------------------------------------------------------------------------------------
// Stack operations

/**
 * views.open. Slack iOS presents one stack of related views at a time: opening another view while one is shown
 * does nothing (AppViewService.swift:72-76); push onto it instead.
 */
export function openView(input: ViewInput): ModalView {
  const view = { ...input, id: input.id ?? newViewId() }
  if (useViews.getState().stack.length) {
    console.warn('[app kit] views.open while a modal is open does nothing on Slack iOS (one modal stack at a time): use ctx.pushModal() or ctx.updateModal().')
    return view
  }
  const values = initialValues(view.blocks)
  useViews.setState({ stack: [view], values: { [view.id]: values }, initial: { [view.id]: values }, errors: {}, banner: {}, submitting: null, scrollTo: null, snackbar: null, motion: 'none' })
  presentSheet()
  return view
}

/** views.push: a new view on the same navigation stack (the standard push animation, AppViewService.swift:66-70). */
export function pushView(input: ViewInput): ModalView {
  if (!useViews.getState().stack.length) return openView(input)
  const view = { ...input, id: input.id ?? newViewId() }
  const values = initialValues(view.blocks)
  useViews.setState((s) => ({ stack: [...s.stack, view], values: { ...s.values, [view.id]: values }, initial: { ...s.initial, [view.id]: values }, motion: 'push' }))
  return view
}

/**
 * views.update: replaces a view in place (the top one by default). What the user entered wins over the new
 * blocks' initial values for matching block and action ids (BlockKitStateUpdater.swift:32-42).
 */
export function updateView(input: ViewInput, viewId?: string): ModalView | undefined {
  const s = useViews.getState()
  const target = viewId ?? input.id ?? s.stack[s.stack.length - 1]?.id
  const i = s.stack.findIndex((v) => v.id === target || (input.external_id && v.external_id === input.external_id))
  if (i === -1) return undefined
  const prev = s.stack[i]
  const view: ModalView = { ...prev, ...input, id: prev.id }
  const kept = s.values[prev.id] ?? {}
  const fresh = initialValues(view.blocks)
  const initial = initialValues(view.blocks)
  for (const [blockId, actions] of Object.entries(fresh)) for (const actionId of Object.keys(actions)) if (kept[blockId]?.[actionId]) fresh[blockId][actionId] = kept[blockId][actionId]
  const stack = [...s.stack]
  stack[i] = view
  useViews.setState({ stack, values: { ...s.values, [view.id]: fresh }, initial: { ...s.initial, [view.id]: initial }, errors: { ...s.errors, [view.id]: {} }, motion: 'none' })
  return view
}

/** Close on a pushed view pops it; on the root it dismisses the modal (AppViewService.swift:113-121). */
export function popView(notify = true) {
  const s = useViews.getState()
  const top = s.stack[s.stack.length - 1]
  if (top && notify) top.onClose?.(payloadFor(top))
  if (s.stack.length <= 1) return closeViews(false)
  useViews.setState({ stack: s.stack.slice(0, -1), motion: 'pop' })
}

/** Closes every view (`response_action: clear`, `clear_on_close`, views closed by the app). */
export function closeViews(notify = true) {
  const s = useViews.getState()
  if (notify) for (const v of [...s.stack].reverse()) v.onClose?.(payloadFor(v))
  useViews.setState({ stack: [], values: {}, initial: {}, errors: {}, banner: {}, submitting: null, scrollTo: null, motion: 'none' })
  dismissSheet()
}

export function setViewValue(viewId: string, blockId: string, actionId: string, value: StateValue) {
  useViews.setState((s) => {
    const errors = s.errors[viewId]?.[blockId] ? { ...s.errors, [viewId]: { ...s.errors[viewId], [blockId]: '' } } : s.errors
    return { values: { ...s.values, [viewId]: { ...s.values[viewId], [blockId]: { ...s.values[viewId]?.[blockId], [actionId]: value } } }, errors }
  })
}

export function setViewErrors(viewId: string, errors: Record<string, string>) {
  useViews.setState((s) => ({ errors: { ...s.errors, [viewId]: errors } }))
}

/** Sets (or clears) one block's error, e.g. when a text input validates itself on blur / Done. */
export function setViewError(viewId: string, blockId: string, error: string | null) {
  useViews.setState((s) => ({ errors: { ...s.errors, [viewId]: { ...s.errors[viewId], [blockId]: error ?? '' } } }))
}

export function showModalSnackbar(text: string) {
  useViews.setState({ snackbar: { text, n: ++n } })
}

/** The user changed something since the view opened (or was last updated). */
export function hasUserEnteredData(viewId: string): boolean {
  const s = useViews.getState()
  return JSON.stringify(normalizeState(s.values[viewId] ?? {})) !== JSON.stringify(normalizeState(s.initial[viewId] ?? {}))
}

/** Values compared as their flat meaning (an emptied text field equals one never touched). */
function normalizeState(v: ViewStateValues) {
  const out: Record<string, FlatValue> = {}
  for (const [blockId, actions] of Object.entries(v)) for (const [actionId, value] of Object.entries(actions)) out[`${blockId}/${actionId}`] = flatten(value) ?? null
  for (const k of Object.keys(out)) if (out[k] === '' || (Array.isArray(out[k]) && !(out[k] as string[]).length)) out[k] = null
  return Object.keys(out)
    .sort()
    .map((k) => [k, out[k]])
}

// ------------------------------------------------------------------------------------------------
// Submission (ModernAppViewInteractor.swift:456-582)

/**
 * Submit: validates every input (required enforced), shows the errors and scrolls to the first invalid block, or runs
 * the view's submit handler behind the loading overlay and applies its response.
 */
export async function submitTopView() {
  const s = useViews.getState()
  const view = s.stack[s.stack.length - 1]
  if (!view || s.submitting) return
  const values = s.values[view.id] ?? {}
  const invalid = validateInputs(view.blocks, values, true)
  if (Object.keys(invalid).length) {
    const first = view.blocks.map((b, i) => kitBlockId(b, i)).find((id) => invalid[id])
    useViews.setState((st) => ({ errors: { ...st.errors, [view.id]: invalid }, scrollTo: first ? { viewId: view.id, blockId: first, n: ++n } : st.scrollTo }))
    return
  }
  if (!view.onSubmit) return popView(false)
  useViews.setState((st) => ({ submitting: view.id, banner: { ...st.banner, [view.id]: undefined } }))
  let res: ViewResponse | void
  try {
    res = await view.onSubmit(payloadFor(view))
  } catch (e) {
    console.error('[app kit] view submission failed', e)
    useViews.setState({ submitting: null })
    showModalSnackbar(SUBMIT_FAILED_TEXT)
    return
  }
  useViews.setState({ submitting: null })
  // The handler may already have closed or replaced the view.
  if (!useViews.getState().stack.some((v) => v.id === view.id)) return
  switch (res?.response_action) {
    case 'errors': {
      const errors = res.errors ?? {}
      const ids = view.blocks.map((b, i) => kitBlockId(b, i))
      // Errors for blocks that aren't inputs in this view go in the banner (AppViewPresenter.swift:73-85).
      const stray = Object.entries(errors).filter(([id]) => !ids.includes(id))
      const first = ids.find((id) => errors[id])
      useViews.setState((st) => ({
        errors: { ...st.errors, [view.id]: Object.fromEntries(Object.entries(errors).filter(([id]) => ids.includes(id))) },
        banner: { ...st.banner, [view.id]: stray.length ? stray.map(([, m]) => m).join('\n') : undefined },
        scrollTo: first ? { viewId: view.id, blockId: first, n: ++n } : st.scrollTo,
      }))
      return
    }
    case 'update':
      if (res.view) updateView(res.view, view.id)
      return
    case 'push':
      if (res.view) pushView(res.view)
      return
    case 'clear':
      return closeViews(false)
    default:
      // No response_action and no errors: this view closes (a pushed one returns to the view below).
      return popView(false)
  }
}

/** The payload handlers get: the view with `state.values`, plus a flat `values[action_id]` map. */
export function payloadFor(view: ModalView): ViewPayload {
  const state = useViews.getState().values[view.id] ?? {}
  const values: Record<string, FlatValue> = {}
  for (const actions of Object.values(state)) for (const [actionId, v] of Object.entries(actions)) values[actionId] = flatten(v)
  return { view: { ...view, state: { values: state } }, values }
}

export function flatten(v: StateValue | undefined): FlatValue {
  if (!v) return null
  switch (v.type) {
    case 'plain_text_input':
    case 'number_input':
    case 'email_text_input':
    case 'url_text_input':
      return v.value
    case 'static_select':
    case 'external_select':
    case 'radio_buttons':
      return v.selected_option?.value ?? null
    case 'multi_static_select':
    case 'multi_external_select':
    case 'checkboxes':
      return v.selected_options.map((o) => o.value)
    case 'users_select':
      return v.selected_user
    case 'multi_users_select':
      return v.selected_users
    case 'channels_select':
      return v.selected_channel
    case 'multi_channels_select':
      return v.selected_channels
    case 'conversations_select':
      return v.selected_conversation
    case 'multi_conversations_select':
      return v.selected_conversations
    case 'datepicker':
      return v.selected_date
    case 'timepicker':
      return v.selected_time
    case 'datetimepicker':
      return v.selected_date_time === null ? null : String(v.selected_date_time)
    case 'rich_text_input':
      return v.rich_text_value ? richTextPlain(v.rich_text_value) || null : null
    case 'file_input':
      return v.files.map((f) => f.id)
  }
}

// ------------------------------------------------------------------------------------------------
// State from blocks and actions

/** `state.values` of fresh blocks: every input and interactive element with its initial value. */
export function initialValues(blocks: KitBlock[]): ViewStateValues {
  const out: ViewStateValues = {}
  const add = (blockId: string, el: BlockElement | InputBlock['element']) => {
    const v = initialState(el)
    if (!v || !('action_id' in el)) return
    out[blockId] = { ...out[blockId], [el.action_id]: v }
  }
  blocks.forEach((b, i) => {
    const id = kitBlockId(b, i)
    if (b.type === 'input' && b.element) add(id, b.element)
    else if (b.type === 'actions') (b.elements ?? []).forEach((el) => add(id, el))
    else if (b.type === 'section' && b.accessory) add(id, b.accessory)
  })
  return out
}

export function initialState(el: BlockElement | InputBlock['element']): StateValue | null {
  switch (el.type) {
    case 'plain_text_input':
    case 'number_input':
    case 'email_text_input':
    case 'url_text_input':
      return { type: el.type, value: el.initial_value ?? null }
    case 'static_select':
    case 'external_select':
    case 'radio_buttons':
      return { type: el.type, selected_option: el.initial_option ?? null }
    case 'multi_static_select':
    case 'multi_external_select':
    case 'checkboxes':
      return { type: el.type, selected_options: el.initial_options ?? [] }
    case 'users_select':
      return { type: 'users_select', selected_user: el.initial_user ?? null }
    case 'multi_users_select':
      return { type: 'multi_users_select', selected_users: el.initial_users ?? [] }
    case 'channels_select':
      return { type: 'channels_select', selected_channel: el.initial_channel ?? null }
    case 'conversations_select':
      return { type: 'conversations_select', selected_conversation: el.initial_conversation ?? null }
    case 'multi_channels_select':
      return { type: 'multi_channels_select', selected_channels: el.initial_channels ?? [] }
    case 'multi_conversations_select':
      return { type: 'multi_conversations_select', selected_conversations: el.initial_conversations ?? [] }
    case 'datepicker':
      return { type: 'datepicker', selected_date: el.initial_date ?? null }
    case 'timepicker':
      return { type: 'timepicker', selected_time: el.initial_time ?? null, ...(el.timezone ? { timezone: el.timezone } : {}) }
    case 'datetimepicker':
      return { type: 'datetimepicker', selected_date_time: el.initial_date_time ?? null }
    case 'rich_text_input':
      return { type: 'rich_text_input', rich_text_value: el.initial_value ?? null }
    case 'file_input':
      return { type: 'file_input', files: [] }
    default:
      return null
  }
}

/** A stable id for a picked file (the clone doesn't upload anything). */
const fileId = (f: { name: string; size: number }) => {
  let h = 0
  for (const c of `${f.name}:${f.size}`) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `F0${h.toString(36).toUpperCase().padStart(9, '0').slice(-9)}`
}

/**
 * The state an interaction leaves behind (inputs, selects, pickers, checkboxes); buttons and overflows have none.
 * `options` resolves chosen values to the element's option objects.
 */
export function stateFromAction(action: KitAction, options?: OptionObject[], element?: BlockElement | InputBlock['element']): StateValue | null {
  const opt = (value: string, label?: string): OptionObject => options?.find((o) => o.value === value) ?? { text: { type: 'plain_text', text: label ?? value }, value }
  switch (action.type) {
    case 'plain_text_input':
    case 'number_input':
    case 'email_text_input':
    case 'url_text_input':
      return { type: action.type, value: action.value ?? null }
    case 'static_select':
    case 'external_select':
    case 'radio_buttons':
      return { type: action.type, selected_option: action.value !== undefined ? opt(action.value, action.label) : null }
    case 'multi_static_select':
    case 'multi_external_select':
    case 'checkboxes':
      return { type: action.type, selected_options: (action.selectedOptions ?? []).map((o) => opt(o.value, o.label)) }
    case 'users_select':
      return { type: 'users_select', selected_user: action.selectedUser ?? null }
    case 'multi_users_select':
      return { type: 'multi_users_select', selected_users: action.selectedUsers ?? [] }
    case 'channels_select':
      return { type: 'channels_select', selected_channel: action.selectedChannel ?? null }
    case 'conversations_select':
      return { type: 'conversations_select', selected_conversation: action.selectedChannel ?? null }
    case 'multi_channels_select':
      return { type: 'multi_channels_select', selected_channels: action.selectedChannels ?? [] }
    case 'multi_conversations_select':
      return { type: 'multi_conversations_select', selected_conversations: action.selectedChannels ?? [] }
    case 'datepicker':
      return { type: 'datepicker', selected_date: action.selectedDate ?? null }
    case 'timepicker': {
      const timezone = element?.type === 'timepicker' ? element.timezone : undefined
      return { type: 'timepicker', selected_time: action.selectedTime ?? null, ...(timezone ? { timezone } : {}) }
    }
    case 'datetimepicker':
      return { type: 'datetimepicker', selected_date_time: action.selectedDateTime ?? null }
    case 'rich_text_input':
      return { type: 'rich_text_input', rich_text_value: action.richTextValue ?? null }
    case 'file_input':
      return { type: 'file_input', files: (action.files ?? []).map((f) => ({ id: fileId(f), name: f.name, mimetype: f.type, size: f.size })) }
    default:
      return null
  }
}

/** The element an action came from, looked up in a list of blocks. */
export function findElement(blocks: KitBlock[], blockId: string, actionId: string): { block: KitBlock; element: BlockElement | InputBlock['element'] } | undefined {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (kitBlockId(b, i) !== blockId) continue
    const els: (BlockElement | InputBlock['element'])[] = b.type === 'input' ? [b.element] : b.type === 'actions' ? b.elements : b.type === 'section' && b.accessory ? [b.accessory] : []
    const element = els.find((e) => e && 'action_id' in e && e.action_id === actionId)
    if (element) return { block: b, element }
  }
  return undefined
}
