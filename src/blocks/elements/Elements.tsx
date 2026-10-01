import { useRef } from 'react'
import { useApp } from '../../app/store'
import { Icon } from '../../icons/Icon'
import { SKButton, SKCheckbox, SKRadioButton } from '../../slackkit'
import { elementLabel, MORE, MORE_OPTIONS, textOf } from '../format'
import { confirmFirst, presentForResult } from '../present'
import { stateFromAction } from '../modal-state'
import { useMeId, useSurface } from '../surface'
import { BKInline } from '../text'
import type { ButtonElement, CheckboxesElement, ImageElement, KitAction, OptionObject, OverflowElement, RadioButtonsElement, WorkflowButtonElement } from '../types'
import type { StateValue } from '../views'
import { pickFor, type PickableElement } from './open'
import { asset } from '../../lib/asset'

// Block Kit elements (spec blockkit.md §4): buttons are SKButton medium (§2), overflow is the "More" text button, selects
// and pickers are an outline button with a caret (actions, section accessories) or the input block's select row, and
// checkboxes / radio buttons are option rows with SKCheckbox / SKRadioButton at the right.

/** Where an element sits: an input block only sends block_actions when it has `dispatch_action` (Slack's rule). */
export interface Placement {
  blockId: string
  /** set inside an input block: does it dispatch? */
  input?: { dispatch: boolean }
}

/** Records an element's new value and, when it dispatches, sends the action. */
export function useCommit({ blockId, input }: Placement) {
  const s = useSurface()
  return async (action: Omit<KitAction, 'blockId'>, value: StateValue | null, opts: { spinner?: boolean } = {}) => {
    if (value) s.setValue(blockId, action.actionId, value)
    if (s.errors[blockId]) s.setError(blockId, null)
    if (!input || input.dispatch) await s.dispatch({ ...action, blockId }, opts)
  }
}

/** SKButton styles by Block Kit `style` (BKButtonView.swift:200-214): default outline, primary green, danger outlined red. */
export const buttonStyle = (style?: 'primary' | 'danger') => (style === 'primary' ? 'primary' : style === 'danger' ? 'outlineDanger' : 'outlineDefault')

/** The state of a button in a block that may be waiting on the app: its own spinner, or disabled while another waits. */
function buttonState(pending: string | undefined, actionId: string, interactive: boolean) {
  if (!interactive) return 'inactive' as const
  if (pending === actionId) return 'processing' as const
  return pending ? ('inactive' as const) : ('enabled' as const)
}

// ------------------------------------------------------------------------------------------------
// button, workflow_button (§4.1)

export function BKButton({ el, blockId, fill = true }: { el: ButtonElement | WorkflowButtonElement; blockId: string; fill?: boolean }) {
  const s = useSurface()
  const me = useMeId()
  if (el.type === 'button' && el.visible_to_user_ids && !el.visible_to_user_ids.includes(me)) return null
  const onClick = async () => {
    if (!(await confirmFirst(el.type === 'button' ? el.confirm : undefined))) return
    // A button with a url opens it, and block_actions is still sent (ButtonBlockElement+BlockInteractable.swift:17-34).
    if (el.type === 'button' && el.url) window.open(el.url, '_blank', 'noopener,noreferrer')
    await s.dispatch({ type: el.type, actionId: el.action_id, blockId, value: el.type === 'button' ? el.value : undefined }, { spinner: true })
  }
  return (
    <SKButton
      title={<BKInline text={el.text} />}
      buttonStyle={buttonStyle(el.style)}
      size="medium"
      state={buttonState(s.pending[blockId], el.action_id, s.interactive)}
      accessibilityLabel={el.accessibility_label}
      className={fill ? 'bk-button is-fill' : 'bk-button'}
      onClick={() => void onClick()}
    />
  )
}

// ------------------------------------------------------------------------------------------------
// overflow (§4.2): "More" inline in a section, "More Options" full width elsewhere; the options in a bottom sheet

export function BKOverflow({ el, blockId, inline }: { el: OverflowElement; blockId: string; inline?: boolean }) {
  const s = useSurface()
  const onClick = async () => {
    const picked = await presentForResult<OptionObject[]>('bk-option-sheet', { options: el.options ?? [], title: 'Choose an option…', overflow: true })
    const o = picked?.[0]
    if (!o) return
    if (!(await confirmFirst(el.confirm))) return
    await s.dispatch({ type: 'overflow', actionId: el.action_id, blockId, value: o.value, label: textOf(o.text) }, { spinner: true })
  }
  return (
    <SKButton
      title={inline ? MORE : MORE_OPTIONS}
      buttonStyle="outlineDefault"
      size="medium"
      state={buttonState(s.pending[blockId], el.action_id, s.interactive)}
      className={inline ? 'bk-button' : 'bk-button is-fill'}
      onClick={() => void onClick()}
    />
  )
}

// ------------------------------------------------------------------------------------------------
// selects and pickers (§4.3, §4.4)

const SELECTS = new Set(['static_select', 'external_select', 'users_select', 'conversations_select', 'channels_select', 'multi_static_select', 'multi_external_select', 'multi_users_select', 'multi_conversations_select', 'multi_channels_select'])

/** Picks, confirms, then records and dispatches (the order of BlockInteractionCoordinator.swift:64-100, 200-236). */
function usePick(el: PickableElement, placement: Placement) {
  const s = useSurface()
  const fx = useApp((st) => st.fx)
  const commit = useCommit(placement)
  const busy = useRef(false)
  const value = 'action_id' in el ? s.values[placement.blockId]?.[el.action_id] : undefined
  const label = elementLabel(el, value, fx)
  const open = async (title: string) => {
    if (!s.interactive || busy.current) return
    busy.current = true
    try {
      const picked = await pickFor(el, value, title)
      if (!picked) return
      if (!(await confirmFirst((el as { confirm?: ButtonElement['confirm'] }).confirm))) return
      const state = stateFromAction({ ...picked.action, blockId: placement.blockId } as KitAction, picked.options, el)
      await commit(picked.action, state, { spinner: !placement.input })
    } finally {
      busy.current = false
    }
  }
  return { label, open, value }
}

/**
 * A select or picker as a button (actions blocks, section accessories): a full-width outline SKButton, `caret_down` at
 * the right for selects (BKButtonView.swift:124-139,177); the placeholder isn't dimmed in this form. A datepicker in a
 * section is an inline button right of the text.
 */
export function BKSelectButton({ el, blockId, inline }: { el: PickableElement; blockId: string; inline?: boolean }) {
  const s = useSurface()
  const { label, open } = usePick(el, { blockId })
  const actionId = 'action_id' in el ? el.action_id : ''
  return (
    <SKButton
      title={<BKInline text={label.text} />}
      buttonStyle="outlineDefault"
      size="medium"
      icon={SELECTS.has(el.type) ? 'caret_down' : undefined}
      iconPosition="right"
      state={buttonState(s.pending[blockId], actionId, s.interactive)}
      className={inline ? 'bk-button' : 'bk-button is-fill'}
      onClick={() => void open(label.text)}
    />
  )
}

/**
 * The input block's select row (BKInputSelectView.swift:26-157): the label (value content_primary, placeholder
 * content_secondary), a 20 pt caret_right_full at the right, 16 pt apart, no vertical padding. Datetime pickers lead
 * with the calendar; rich_text_input has no chevron (§4.7).
 */
export function BKSelectRow({ el, blockId, dispatch, title }: { el: PickableElement; blockId: string; dispatch: boolean; title: string }) {
  const s = useSurface()
  const { label, open } = usePick(el, { blockId, input: { dispatch } })
  return (
    <div
      className={['bk-select-row', !s.interactive && 'is-disabled'].filter(Boolean).join(' ')}
      role="button"
      aria-label={title}
      data-tap={s.interactive ? '' : undefined}
      onClick={() => void open(title)}
    >
      {el.type === 'datetimepicker' && <Icon name="calendar" size={20} className="bk-select-row__icon" />}
      <span className={`bk-select-row__label${label.placeholder ? ' is-placeholder' : ''}`}>
        <BKInline text={label.text} />
      </span>
      {el.type !== 'rich_text_input' && <Icon name="caret_right_full" size={20} className="bk-select-row__chevron" />}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------
// checkboxes and radio buttons (§4.5)

/**
 * An option group. Rows: text column (Lato 17; description Lato 13 content_secondary, 2 pt below) + the control at the
 * right, 12 pt apart; 8 pt above and below each option; the row dims to 60 % while pressed and is the tap target
 * (BKCheckboxOptionView.swift:59-86,145-197; Helpers/Utils.swift:61-72). Checkboxes toggle at once; radios select
 * optimistically and ignore taps on the selected one (BKRadioButtonGroupView.swift:106-121).
 */
export function BKChoices({ el, placement }: { el: CheckboxesElement | RadioButtonsElement; placement: Placement }) {
  const s = useSurface()
  const me = useMeId()
  const commit = useCommit(placement)
  const value = s.values[placement.blockId]?.[el.action_id]
  const selected = new Set(value && 'selected_options' in value ? value.selected_options.map((o) => o.value) : value && 'selected_option' in value && value.selected_option ? [value.selected_option.value] : [])
  const checkbox = el.type === 'checkboxes'
  const tap = async (o: OptionObject) => {
    if (!s.interactive) return
    if (!(await confirmFirst(el.confirm))) return
    if (checkbox) {
      const next = selected.has(o.value) ? el.options.filter((x) => selected.has(x.value) && x.value !== o.value) : el.options.filter((x) => selected.has(x.value) || x.value === o.value)
      const action: Omit<KitAction, 'blockId'> = { type: 'checkboxes', actionId: el.action_id, selectedOptions: next.map((x) => ({ value: x.value, label: textOf(x.text) })) }
      await commit(action, { type: 'checkboxes', selected_options: next })
    } else {
      if (selected.has(o.value)) return
      await commit({ type: 'radio_buttons', actionId: el.action_id, value: o.value, label: textOf(o.text) }, { type: 'radio_buttons', selected_option: o })
    }
  }
  // Sept: checkboxes honor `visible_to_user_ids` like buttons (BKBlockElementConverter.swift:81-90,182-196)
  const hiddenFrom = (el as { visible_to_user_ids?: string[] }).visible_to_user_ids
  if (checkbox && hiddenFrom?.length && !hiddenFrom.includes(me)) return null
  return (
    <div className={`bk-choices bk-choices--${checkbox ? 'checkbox' : 'radio'}`} role={checkbox ? 'group' : 'radiogroup'}>
      {(el.options ?? []).map((o) => {
        const on = selected.has(o.value)
        return (
          <div key={o.value} className={['bk-choice', !s.interactive && 'is-disabled'].filter(Boolean).join(' ')} data-tap={s.interactive ? '' : undefined} onClick={() => void tap(o)} role={checkbox ? 'checkbox' : 'radio'} aria-checked={on}>
            <div className="bk-choice__text">
              <div className="bk-choice__label">
                <BKInline text={o.text} />
              </div>
              {o.description && (
                <div className="bk-choice__description">
                  <BKInline text={o.description} />
                </div>
              )}
            </div>
            {checkbox ? <SKCheckbox isOn={on} isEnabled={s.interactive} className="bk-choice__control" /> : <SKRadioButton isOn={on} isEnabled={s.interactive} className="bk-choice__control" />}
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------
// image element (§4.9)

/** An image element: 20 × 20, radius 2 in context blocks (ContextBlockImageCell), 68 × 68 thumbnails in sections. */
export function BKImageElement({ el, className }: { el: ImageElement; className?: string }) {
  const src = asset(el.image_url ?? el.slack_file?.url)
  if (!src) return <span className={className} />
  return <img className={className} src={src} alt={el.alt_text} draggable={false} />
}
