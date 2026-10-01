import { allOptions } from '../format'
import { presentForResult } from '../present'
import type { InputBlock, InteractiveElement, KitAction, OptionObject, RichTextBlockKit } from '../types'
import type { StateValue } from '../views'

// What tapping a select, picker or rich text input opens (spec blockkit.md §5, BlockPresentationRouter.swift:130-452),
// and the action it becomes once the person has chosen: the option picker (a bottom sheet for ≤ 5 static options
// with single select, else a full-screen picker with search), the people / channel picker, the date / time sheet and
// the rich text editor. Resolves null when they cancel.

type Picked = { action: Omit<KitAction, 'blockId'>; options?: OptionObject[] }

export type PickableElement = InteractiveElement | InputBlock['element']

/** The date / time sheet's answer: the new value, or null for Clear. */
export interface DateTimeResult {
  value: string | number | null
}

const isMulti = (type: string) => type.startsWith('multi_')

/** Opens the element's picker; resolves with the action to dispatch (and the options it chose from). */
export async function pickFor(el: PickableElement, value: StateValue | null | undefined, label: string): Promise<Picked | null> {
  switch (el.type) {
    case 'static_select':
    case 'multi_static_select':
    case 'external_select':
    case 'multi_external_select': {
      const options = allOptions(el as { options?: OptionObject[] })
      const groups = (el as { option_groups?: { label: { text: string }; options: OptionObject[] }[] }).option_groups
      const multi = isMulti(el.type)
      const selected = value && 'selected_options' in value ? value.selected_options.map((o) => o.value) : value && 'selected_option' in value && value.selected_option ? [value.selected_option.value] : []
      // A single static select with 5 options or fewer is a bottom sheet without search (BlockPresentationRouter.swift:235-283).
      const bottom = el.type === 'static_select' && options.length <= 5 && !groups?.length
      const external = el.type.includes('external')
      const picked = await presentForResult<OptionObject[]>(bottom ? 'bk-option-sheet' : 'bk-option-picker', {
        options: groups?.length ? undefined : options,
        groups,
        multi,
        selected,
        // "Select Option" / "Select Options" (select_option / select_options, yaml:16422, 16425)
        title: multi ? 'Select Options' : 'Select Option',
        search: !bottom,
        minQueryLength: external ? ((el as { min_query_length?: number }).min_query_length ?? 0) : 0,
        maxSelected: (el as { max_selected_items?: number }).max_selected_items,
      })
      if (!picked) return null
      if (multi) return { action: { type: el.type, actionId: el.action_id, selectedOptions: picked.map((o) => ({ value: o.value, label: o.text.text })) }, options }
      const o = picked[0]
      return o ? { action: { type: el.type, actionId: el.action_id, value: o.value, label: o.text.text }, options } : null
    }
    case 'users_select':
    case 'multi_users_select':
    case 'channels_select':
    case 'conversations_select':
    case 'multi_channels_select':
    case 'multi_conversations_select': {
      const multi = isMulti(el.type)
      const kind = el.type.includes('users') ? 'users' : el.type.includes('channels') ? 'channels' : 'conversations'
      const selected = selectedIds(value)
      const ids = await presentForResult<string[]>('bk-entity-picker', { kind, multi, selected, filter: (el as { filter?: unknown }).filter, maxSelected: (el as { max_selected_items?: number }).max_selected_items })
      if (!ids) return null
      const a: Omit<KitAction, 'blockId'> = { type: el.type, actionId: el.action_id }
      if (el.type === 'users_select') a.selectedUser = ids[0]
      else if (el.type === 'multi_users_select') a.selectedUsers = ids
      else if (multi) a.selectedChannels = ids
      else a.selectedChannel = ids[0]
      return { action: a }
    }
    case 'datepicker':
    case 'timepicker':
    case 'datetimepicker': {
      const current = value?.type === 'datepicker' ? value.selected_date : value?.type === 'timepicker' ? value.selected_time : value?.type === 'datetimepicker' ? value.selected_date_time : null
      const r = await presentForResult<DateTimeResult>('bk-datetime', { mode: el.type === 'datepicker' ? 'date' : el.type === 'timepicker' ? 'time' : 'datetime', value: current, timezone: el.type === 'timepicker' ? el.timezone : undefined })
      if (!r) return null
      const a: Omit<KitAction, 'blockId'> = { type: el.type, actionId: el.action_id }
      if (el.type === 'datepicker') a.selectedDate = (r.value as string | null) ?? undefined
      else if (el.type === 'timepicker') a.selectedTime = (r.value as string | null) ?? undefined
      else a.selectedDateTime = (r.value as number | null) ?? undefined
      return { action: a }
    }
    case 'rich_text_input': {
      const current = value?.type === 'rich_text_input' ? value.rich_text_value : null
      const r = await presentForResult<RichTextBlockKit>('bk-text-editor', { title: label, rich: true, value: current, placeholder: (el as { placeholder?: { text: string } }).placeholder?.text })
      if (!r) return null
      return { action: { type: 'rich_text_input', actionId: el.action_id, richTextValue: r } }
    }
    default:
      return null
  }
}

function selectedIds(v: StateValue | null | undefined): string[] {
  if (!v) return []
  switch (v.type) {
    case 'users_select':
      return v.selected_user ? [v.selected_user] : []
    case 'multi_users_select':
      return v.selected_users
    case 'channels_select':
      return v.selected_channel ? [v.selected_channel] : []
    case 'conversations_select':
      return v.selected_conversation ? [v.selected_conversation] : []
    case 'multi_channels_select':
      return v.selected_channels
    case 'multi_conversations_select':
      return v.selected_conversations
    default:
      return []
  }
}
