import type { RtBlockElement, RtElement } from './rich-text'

// Block Kit as the clone renders it: every block and element in Slack's public reference (docs.slack.dev,
// checked 2026-09-25) plus the agent blocks. Shapes follow Slack's JSON (snake_case), so payloads from the
// Block Kit Builder paste straight in. Status of each type: docs/block-kit.md.
//
// `action_id` is typed as required on elements (the App Kit always sets one); the renderer tolerates it
// missing, as Slack does, and generates one.

// ------------------------------------------------------------------------------------------------
// Composition objects

export interface TextObject {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
  /** mrkdwn only: skip auto-linking of URLs, channels and mentions */
  verbatim?: boolean
}

export interface PlainTextObject extends TextObject {
  type: 'plain_text'
}

export interface OptionObject {
  text: TextObject
  value: string
  description?: TextObject
  /** overflow menus only */
  url?: string
}

export interface OptionGroupObject {
  label: TextObject
  options: OptionObject[]
}

/** `confirm` on buttons, selects, pickers, checkboxes, radio buttons, overflow and icon buttons. */
export interface ConfirmObject {
  title?: TextObject
  text?: TextObject
  confirm?: TextObject
  deny?: TextObject
  style?: 'primary' | 'danger'
}

export interface DispatchActionConfig {
  trigger_actions_on?: ('on_enter_pressed' | 'on_character_entered')[]
}

export interface ConversationFilter {
  include?: ('im' | 'mpim' | 'private' | 'public')[]
  exclude_external_shared_channels?: boolean
  exclude_bot_users?: boolean
}

export interface SlackFileObject {
  url?: string
  id?: string
}

/** Slack icon composition object (card `slack_icon`, task card `icon`). */
export interface SlackIconObject {
  type: 'icon'
  name: string
}

export interface WorkflowObject {
  trigger: { url: string; customizable_input_parameters?: { name: string; value: string }[] }
}

// ------------------------------------------------------------------------------------------------
// Elements

interface ElementBase {
  action_id: string
  confirm?: ConfirmObject
  focus_on_load?: boolean
}

export interface ButtonElement {
  type: 'button'
  text: TextObject
  action_id: string
  value?: string
  url?: string
  style?: 'primary' | 'danger'
  confirm?: ConfirmObject
  accessibility_label?: string
  /** hands the click to Slackbot with this prompt (when the viewer has Slackbot AI) */
  agent_prompt?: string
  visible_to_user_ids?: string[]
}

export interface WorkflowButtonElement {
  type: 'workflow_button'
  text: TextObject
  action_id: string
  workflow: WorkflowObject
  style?: 'primary' | 'danger'
  accessibility_label?: string
}

export interface OverflowElement {
  type: 'overflow'
  action_id: string
  options: OptionObject[]
  confirm?: ConfirmObject
}

export interface StaticSelectElement extends ElementBase {
  type: 'static_select'
  placeholder?: TextObject
  options: OptionObject[]
  option_groups?: OptionGroupObject[]
  initial_option?: OptionObject
}

export interface ExternalSelectElement extends ElementBase {
  type: 'external_select'
  placeholder?: TextObject
  initial_option?: OptionObject
  min_query_length?: number
  /** clone-only: what the app's options_load_url would answer (the clone has no backend) */
  options?: OptionObject[]
  option_groups?: OptionGroupObject[]
}

export interface ImageElement {
  type: 'image'
  image_url?: string
  slack_file?: SlackFileObject
  alt_text: string
}

export interface PlainTextInputElement {
  type: 'plain_text_input'
  action_id: string
  placeholder?: TextObject
  multiline?: boolean
  initial_value?: string
  min_length?: number
  max_length?: number
  dispatch_action_config?: DispatchActionConfig
  focus_on_load?: boolean
}

export interface NumberInputElement {
  type: 'number_input'
  action_id: string
  is_decimal_allowed: boolean
  initial_value?: string
  min_value?: string
  max_value?: string
  placeholder?: TextObject
  dispatch_action_config?: DispatchActionConfig
  focus_on_load?: boolean
}

export interface EmailTextInputElement {
  type: 'email_text_input'
  action_id: string
  initial_value?: string
  placeholder?: TextObject
  dispatch_action_config?: DispatchActionConfig
  focus_on_load?: boolean
}

export interface UrlTextInputElement {
  type: 'url_text_input'
  action_id: string
  initial_value?: string
  placeholder?: TextObject
  dispatch_action_config?: DispatchActionConfig
  focus_on_load?: boolean
}

export interface RichTextInputElement {
  type: 'rich_text_input'
  action_id: string
  initial_value?: RichTextBlockKit
  placeholder?: TextObject
  dispatch_action_config?: DispatchActionConfig
  focus_on_load?: boolean
  min_lines?: number
  max_lines?: number
}

export interface FileInputElement {
  type: 'file_input'
  action_id: string
  filetypes?: string[]
  max_files?: number
}

// Selects and pickers (rendered by InputBlock.tsx; usable in input blocks, actions blocks and section accessories).

export interface UsersSelectElement extends ElementBase {
  type: 'users_select'
  placeholder?: TextObject
  initial_user?: string
}

export interface MultiUsersSelectElement extends ElementBase {
  type: 'multi_users_select'
  placeholder?: TextObject
  initial_users?: string[]
  max_selected_items?: number
}

/** channels_select and conversations_select (one interface, like the App Kit has always used). */
export interface ChannelsSelectElement extends ElementBase {
  type: 'channels_select' | 'conversations_select'
  placeholder?: TextObject
  initial_channel?: string
  initial_conversation?: string
  default_to_current_conversation?: boolean
  response_url_enabled?: boolean
  filter?: ConversationFilter
}

export type ConversationsSelectElement = ChannelsSelectElement & { type: 'conversations_select' }

export interface MultiConversationsSelectElement extends ElementBase {
  type: 'multi_conversations_select'
  placeholder?: TextObject
  initial_conversations?: string[]
  default_to_current_conversation?: boolean
  max_selected_items?: number
  filter?: ConversationFilter
}

export interface MultiChannelsSelectElement extends ElementBase {
  type: 'multi_channels_select'
  placeholder?: TextObject
  initial_channels?: string[]
  max_selected_items?: number
}

export interface MultiStaticSelectElement extends ElementBase {
  type: 'multi_static_select'
  placeholder?: TextObject
  options: OptionObject[]
  option_groups?: OptionGroupObject[]
  initial_options?: OptionObject[]
  max_selected_items?: number
}

export interface MultiExternalSelectElement extends ElementBase {
  type: 'multi_external_select'
  placeholder?: TextObject
  initial_options?: OptionObject[]
  min_query_length?: number
  max_selected_items?: number
  /** clone-only: what the app's options_load_url would answer */
  options?: OptionObject[]
  option_groups?: OptionGroupObject[]
}

export interface DatepickerElement extends ElementBase {
  type: 'datepicker'
  placeholder?: TextObject
  /** YYYY-MM-DD */
  initial_date?: string
}

export interface TimepickerElement extends ElementBase {
  type: 'timepicker'
  placeholder?: TextObject
  /** HH:mm (24-hour) */
  initial_time?: string
  /** IANA name, shown as hint text under the picker */
  timezone?: string
}

export interface DatetimepickerElement extends ElementBase {
  type: 'datetimepicker'
  /** UNIX seconds */
  initial_date_time?: number
}

export interface CheckboxesElement extends ElementBase {
  type: 'checkboxes'
  options: OptionObject[]
  initial_options?: OptionObject[]
}

export interface RadioButtonsElement extends ElementBase {
  type: 'radio_buttons'
  options: OptionObject[]
  initial_option?: OptionObject
}

/** context_actions: the thumbs up / down pair under an agent reply. */
export interface FeedbackButtonsElement {
  type: 'feedback_buttons'
  action_id: string
  positive_button: { text: TextObject; value: string; accessibility_label?: string }
  negative_button: { text: TextObject; value: string; accessibility_label?: string }
}

/** context_actions: a small icon button (Slack only offers `trash` today). */
export interface IconButtonElement {
  type: 'icon_button'
  action_id: string
  icon: string
  text: TextObject
  value?: string
  confirm?: ConfirmObject
  accessibility_label?: string
  visible_to_user_ids?: string[]
}

export type SelectLikeElement =
  | UsersSelectElement
  | MultiUsersSelectElement
  | ChannelsSelectElement
  | MultiConversationsSelectElement
  | MultiChannelsSelectElement
  | MultiStaticSelectElement
  | MultiExternalSelectElement
  | ExternalSelectElement
  | DatepickerElement
  | TimepickerElement
  | DatetimepickerElement
  | CheckboxesElement
  | RadioButtonsElement

export type TextInputElement = PlainTextInputElement | NumberInputElement | EmailTextInputElement | UrlTextInputElement | RichTextInputElement | FileInputElement

export type InteractiveElement = ButtonElement | WorkflowButtonElement | OverflowElement | StaticSelectElement | SelectLikeElement
export type ContextActionsElement = FeedbackButtonsElement | IconButtonElement
export type BlockElement = InteractiveElement | ImageElement | TextInputElement | ContextActionsElement

// ------------------------------------------------------------------------------------------------
// Blocks

interface BlockBase {
  block_id?: string
  /**
   * Slack's forward-compatibility convention: a client that doesn't know this block's `type` renders
   * these blocks in its place.
   */
  fallback?: KitBlock[]
}

export interface SectionBlock extends BlockBase {
  type: 'section'
  text?: TextObject
  fields?: TextObject[]
  accessory?: BlockElement
  /** always show the full text (no "See more") */
  expand?: boolean
}

export interface HeaderBlock extends BlockBase {
  type: 'header'
  text: TextObject
  /** 1–4 (markdown headings); omitted is the classic header */
  level?: number
}

export interface DividerBlock extends BlockBase {
  type: 'divider'
}

export interface ContextBlock extends BlockBase {
  type: 'context'
  elements: (TextObject | ImageElement)[]
}

export interface ActionsBlock extends BlockBase {
  type: 'actions'
  elements: InteractiveElement[]
}

export interface ContextActionsBlock extends BlockBase {
  type: 'context_actions'
  elements: ContextActionsElement[]
  /** read out as the group's label */
  accessibility_label?: string
}

export interface ImageBlock extends BlockBase {
  type: 'image'
  image_url: string
  slack_file?: SlackFileObject
  alt_text: string
  title?: TextObject
  /** what Slack's API adds to posted image blocks; measured from the image when absent */
  image_width?: number
  image_height?: number
  image_bytes?: number
}

export interface VideoBlock extends BlockBase {
  type: 'video'
  alt_text: string
  title: TextObject
  title_url?: string
  description?: TextObject
  thumbnail_url: string
  video_url: string
  author_name?: string
  provider_name?: string
  provider_icon_url?: string
}

/** A remote file (Slack adds these to messages that share one; apps can't post them directly). */
export interface FileBlock extends BlockBase {
  type: 'file'
  /** a remote file: `external_id`; a file already in Slack: `file_id` */
  external_id?: string
  file_id?: string
  source: 'remote'
  /** clone-only: what Slack's files store would know about the remote file */
  file?: { title: string; name?: string; filetype?: string; pretty_type?: string; url?: string; size?: number; icon?: string }
}

/**
 * rich_text: Slack's JSON `elements` (sections, lists, quotes, code). The demo may instead give `text` as
 * mrkdwn, drawn with the message rich-text renderer.
 */
export interface RichTextBlockKit extends BlockBase {
  type: 'rich_text'
  elements?: RtElement[]
  text?: string
}

/** Standard markdown (what AI agents send); rendered as the rich_text / header / divider / table blocks Slack makes of it. */
export interface MarkdownBlock extends BlockBase {
  type: 'markdown'
  text: string
}

/** A table cell (block-kit/input/blocks/table_cell.json): plain text, a number (its `text` is what's shown), or rich text. */
export type TableCell =
  | { type: 'raw_text'; text: string }
  | { type: 'raw_number'; value: number; text: string }
  | { type: 'cell_text'; text: string }
  | { type: 'rich_text'; elements: RtBlockElement[] }

export interface TableBlock extends BlockBase {
  type: 'table'
  /** first row is the header */
  rows: (TableCell | null)[][]
  column_settings?: ({ align?: 'left' | 'center' | 'right'; is_wrapped?: boolean } | null)[]
  caption?: string
  is_caption_visible?: boolean
}

/** A data_table cell: the table cells plus a row action (a button that opens a Work Object or runs an action). */
export type DataTableCell = TableCell | { type: 'action_cell'; element: ButtonElement; fallback?: TableCell }

export interface DataTableBlock extends BlockBase {
  type: 'data_table'
  /** first row is the header (raw_text/raw_number only) */
  rows: (DataTableCell | null)[][]
  caption: string
  page_size?: number
  row_header_column_index?: number
}

export interface ChartDataSeries {
  name: string
  data: { label: string; value: number }[]
}

export type ChartObject =
  | { type: 'pie'; segments: { label: string; value: number }[] }
  | { type: 'bar' | 'area' | 'line'; series: ChartDataSeries[]; axis_config: { categories: string[]; x_label?: string; y_label?: string } }

export interface DataVisualizationBlock extends BlockBase {
  type: 'data_visualization'
  title: string
  chart: ChartObject
}

export interface CardBlock extends BlockBase {
  type: 'card'
  hero_image?: ImageElement
  icon?: ImageElement
  slack_icon?: SlackIconObject
  title?: TextObject
  subtitle?: TextObject
  body?: TextObject
  subtext?: TextObject
  /** up to 3 buttons: danger ones sit left, the rest right (primary furthest right) */
  actions?: ButtonElement[]
}

export interface CarouselBlock extends BlockBase {
  type: 'carousel'
  /** 1–10 cards */
  elements: CardBlock[]
  /** the carousel's accessible label, shown above it when `is_label_visible` */
  label?: string
  is_label_visible?: boolean
}

export interface ContainerBlock extends BlockBase {
  type: 'container'
  title?: TextObject
  rich_text_title?: RichTextBlockKit
  subtitle?: TextObject
  icon?: ImageElement
  child_blocks: KitBlock[]
  width?: 'narrow' | 'standard' | 'wide' | 'full'
  is_collapsible?: boolean
  default_collapsed?: boolean
  has_header_divider?: boolean
}

/** Modals only. */
export interface AlertBlock extends BlockBase {
  type: 'alert'
  text: TextObject
  level?: 'default' | 'info' | 'warning' | 'error' | 'success'
}

export interface UrlSourceElement {
  type: 'url'
  url: string
  text: string
}

export type TaskStatus = 'pending' | 'in_progress' | 'complete' | 'error'

/** One step of an agent's work (also a plan's task, without `type`). */
export interface TaskCardBlock extends BlockBase {
  type: 'task_card'
  task_id: string
  title: string
  status: TaskStatus
  details?: RichTextBlockKit
  output?: RichTextBlockKit
  sources?: UrlSourceElement[]
  icon?: SlackIconObject
  hide_title?: boolean
}

export type PlanTask = Omit<TaskCardBlock, 'type' | 'block_id' | 'fallback'>

/** An agent's plan: a titled, collapsible list of tasks. */
export interface PlanBlock extends BlockBase {
  type: 'plan'
  plan_id?: string
  title: string
  tasks: PlanTask[]
}

export type KitBlock =
  | SectionBlock
  | HeaderBlock
  | DividerBlock
  | ContextBlock
  | ActionsBlock
  | ContextActionsBlock
  | ImageBlock
  | VideoBlock
  | FileBlock
  | RichTextBlockKit
  | InputBlock
  | MarkdownBlock
  | TableBlock
  | DataTableBlock
  | DataVisualizationBlock
  | CardBlock
  | CarouselBlock
  | ContainerBlock
  | AlertBlock
  | TaskCardBlock
  | PlanBlock

export type KitBlockType = KitBlock['type']

export interface InputBlock extends BlockBase {
  type: 'input'
  label: TextObject
  element: PlainTextInputElement | StaticSelectElement | SelectLikeElement | TextInputElement
  hint?: TextObject
  optional?: boolean
  /** send block_actions for this input's element (Slack only does for inputs when this is set) */
  dispatch_action?: boolean
}

/** Where blocks are drawn; decides wrappers and element sizes. `container` in BlockKit.tsx refines this. */
export type Surface = 'message' | 'app_home' | 'modal'

/**
 * Slack's BLOCK_KIT_CONTAINER_CONTEXT, for the surfaces the clone draws. The container decides element sizes and
 * widths, which blocks stretch, whether inputs can be required and more (see context.tsx).
 *  - message: a channel or DM message       - thread: a message in the thread flexpane (or another side pane)
 *  - app_home: an App Home tab              - modal: a Block Kit modal
 *  - ai_app: an agent / assistant thread    - slackbot_message: a Slackbot DM message
 */
export type KitContainer = 'message' | 'thread' | 'app_home' | 'modal' | 'ai_app' | 'slackbot_message'

/** A user interaction, handed to the surface's action handler. */
export interface KitAction {
  actionId: string
  blockId: string
  /** button value or the chosen option's value */
  value?: string
  /** label of the chosen option (selects/overflow) */
  label?: string
  type: InteractiveElement['type'] | TextInputElement['type'] | ContextActionsElement['type']
  /** multi selects and checkboxes: the chosen options */
  selectedOptions?: { value: string; label: string }[]
  /** users_select / multi_users_select */
  selectedUser?: string
  selectedUsers?: string[]
  /** channels_select / conversations_select */
  selectedChannel?: string
  /** multi_channels_select / multi_conversations_select */
  selectedChannels?: string[]
  /** datepicker (YYYY-MM-DD) */
  selectedDate?: string
  /** timepicker (HH:mm) */
  selectedTime?: string
  /** datetimepicker (UNIX seconds) */
  selectedDateTime?: number
  /** rich_text_input: the editor contents */
  richTextValue?: RichTextBlockKit
  /** file_input: the picked files */
  files?: { name: string; size: number; type: string }[]
}
