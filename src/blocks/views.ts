import type { KitAction, KitBlock, OptionObject, RichTextBlockKit, TextObject } from './types'

// Block Kit modal views (views.open / push / update), as types: the view stack, its input state and what a submission
// answers. The mobile runtime that presents them is src/blocks/modal-state.ts.

export type ViewText = string | TextObject

/** One input's value in `view.state.values[block_id][action_id]`, shaped like Slack's payloads. */
export type StateValue =
  | { type: 'plain_text_input' | 'number_input' | 'email_text_input' | 'url_text_input'; value: string | null }
  | { type: 'static_select' | 'external_select' | 'radio_buttons'; selected_option: OptionObject | null }
  | { type: 'multi_static_select' | 'multi_external_select' | 'checkboxes'; selected_options: OptionObject[] }
  | { type: 'users_select'; selected_user: string | null }
  | { type: 'multi_users_select'; selected_users: string[] }
  | { type: 'channels_select'; selected_channel: string | null }
  | { type: 'multi_channels_select'; selected_channels: string[] }
  | { type: 'conversations_select'; selected_conversation: string | null }
  | { type: 'multi_conversations_select'; selected_conversations: string[] }
  | { type: 'datepicker'; selected_date: string | null }
  /** HH:mm; `timezone` is the element's, echoed back like Slack does */
  | { type: 'timepicker'; selected_time: string | null; timezone?: string }
  /** UNIX seconds */
  | { type: 'datetimepicker'; selected_date_time: number | null }
  | { type: 'rich_text_input'; rich_text_value: RichTextBlockKit | null }
  | { type: 'file_input'; files: StateFile[] }

/** A file picked in a file_input (Slack sends the uploaded file objects). */
export interface StateFile {
  id: string
  name: string
  mimetype: string
  size: number
}

export type ViewStateValues = Record<string, Record<string, StateValue>>

/** The simple value of an input: text, option value, user id(s), date. */
export type FlatValue = string | string[] | null

export interface ModalView {
  id: string
  /** the app's user id (title icon) */
  appId?: string
  /** title icon when there's no app user */
  icon?: string
  title: ViewText
  submit?: ViewText
  close?: ViewText
  blocks: KitBlock[]
  callback_id?: string
  private_metadata?: string
  external_id?: string
  notify_on_close?: boolean
  /** called with the state when the primary button is pressed; the result decides what happens next */
  onSubmit?: (payload: ViewPayload) => ViewResponse | void | Promise<ViewResponse | void>
  /** interactions inside the view (buttons, selects outside input blocks, inputs with dispatch_action) */
  onAction?: (action: KitAction, payload: ViewPayload) => void
  /** the view was closed without submitting (Cancel, ×, Escape, overlay click) */
  onClose?: (payload: ViewPayload) => void
}

export interface ViewPayload {
  view: ModalView & { state: { values: ViewStateValues } }
  /** `values[action_id]`: the flat value of every input in the view */
  values: Record<string, FlatValue>
}

/** What a view submission can answer, like Slack's `response_action`. */
export interface ViewResponse {
  response_action?: 'errors' | 'update' | 'push' | 'clear'
  /** block_id → message, shown under that input */
  errors?: Record<string, string>
  view?: ViewInput
}

export type ViewInput = Omit<ModalView, 'id'> & { id?: string }
