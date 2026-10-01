import { Icon } from '../../icons/Icon'
import { editsInline, registerBlock, showsOptional, useSurface } from '../surface'
import { BKInline } from '../text'
import { DONE_HINT, OPTIONAL, TEXT_PLACEHOLDERS, textOf } from '../format'
import { elementError, sanitizeNumber } from '../validation'
import { fileUploadInfo, presentForResult } from '../present'
import { BKChoices, BKSelectRow } from '../elements/Elements'
import { BKTextInput, isTextElement, type TextElement } from '../elements/TextInput'
import { BKFileInput } from '../elements/FileInput'
import type { PickableElement } from '../elements/open'
import type { InputBlock, TextObject } from '../types'

// The input block (spec blockkit.md §3.7; Blocks/Input/BKInputBlockView.swift, +PresentationObject.swift; converter
// InputBlock+BKContainerBlockConvertible.swift:13-208): a vertical stack 10 pt apart of the label row, the element, the
// divider (text inputs and select rows only), then the hint or, in its place, the error.

/** `dispatch_action` on Enter adds "Press ‘done’ when you’re finished." to the hint (converter :129-186). */
function hintText(block: InputBlock): string {
  const hint = block.hint ? textOf(block.hint) : ''
  const el = block.element as { dispatch_action_config?: { trigger_actions_on?: string[] } }
  const onEnter = block.dispatch_action && isTextElement(block.element) && (el.dispatch_action_config?.trigger_actions_on ?? ['on_enter_pressed']).includes('on_enter_pressed')
  if (!onEnter) return hint
  if (!hint) return DONE_HINT
  return /[.?!]$/.test(hint.trim()) ? `${hint.trim()} ${DONE_HINT}` : `${hint.trim()}. ${DONE_HINT}`
}

function InputView({ block, blockId }: { block: InputBlock; blockId: string }) {
  const s = useSurface()
  const el = block.element
  if (!el) return null
  const label = textOf(block.label)
  const error = s.errors[blockId] || ''
  const hint = hintText(block)
  const text = isTextElement(el)
  const divider = text || el.type === 'rich_text_input' || isSelectRow(el.type)
  // In messages, text inputs use the "modal" style: the whole block opens the editor (BKInputBlockView.swift:177-192).
  const modalText = text && !editsInline(s.kind)

  const openEditor = async () => {
    if (!s.interactive || !modalText) return
    const t = el as TextElement
    const stored = s.values[blockId]?.[t.action_id]
    const value = stored && 'value' in stored ? (stored.value ?? '') : ''
    const r = await presentForResult<string>('bk-text-editor', {
      title: label,
      value,
      placeholder: textOf((t as { placeholder?: TextObject }).placeholder) || TEXT_PLACEHOLDERS[t.type],
      multiline: t.type === 'plain_text_input' && !!t.multiline,
      type: t.type,
      minLength: t.type === 'plain_text_input' ? t.min_length : undefined,
      maxLength: t.type === 'plain_text_input' ? t.max_length : undefined,
      // number_input's range and decimals, checked as you type (SinglelineTextInputInteractor.swift:33-37)
      ...(t.type === 'number_input' ? { minValue: t.min_value, maxValue: t.max_value, decimal: !!t.is_decimal_allowed } : {}),
    })
    if (r === null) return
    const next = t.type === 'number_input' ? sanitizeNumber(r, !!t.is_decimal_allowed) : r
    s.setValue(blockId, t.action_id, { type: t.type, value: next || null })
    s.setError(blockId, elementError(t, { type: t.type, value: next || null }, false))
    if (block.dispatch_action) void s.dispatch({ type: t.type, actionId: t.action_id, blockId, value: next })
  }

  return (
    <div className={['bk-input', modalText && 'is-modal-text', error && 'has-error'].filter(Boolean).join(' ')} onClick={modalText ? () => void openEditor() : undefined} role={modalText ? 'button' : undefined}>
      <div className="bk-input__label-row">
        <span className="bk-input__label">
          <BKInline text={block.label} />
          {block.optional && showsOptional(s.kind) && <span className="bk-input__optional">{OPTIONAL}</span>}
        </span>
        {el.type === 'file_input' && (
          // info.svg, a 20 × 20 accessory icon button 4 pt after the label (+PresentationObject.swift:74-85)
          <button type="button" className="bk-input__info" aria-label="Learn more" data-tap onClick={(e) => (e.stopPropagation(), fileUploadInfo())}>
            <Icon name="info" size={20} />
          </button>
        )}
      </div>
      <div className="bk-input__element">
        <Element block={block} blockId={blockId} label={label} />
      </div>
      {divider && <div className="bk-input__divider" />}
      {error ? <div className="bk-input__error">{error}</div> : hint ? <div className="bk-input__hint">{hint}</div> : null}
    </div>
  )
}

const SELECT_ROWS = new Set([
  'static_select',
  'external_select',
  'multi_static_select',
  'multi_external_select',
  'users_select',
  'multi_users_select',
  'channels_select',
  'conversations_select',
  'multi_channels_select',
  'multi_conversations_select',
  'datepicker',
  'timepicker',
  'datetimepicker',
])
const isSelectRow = (type: string) => SELECT_ROWS.has(type)

function Element({ block, blockId, label }: { block: InputBlock; blockId: string; label: string }) {
  const s = useSurface()
  const el = block.element
  const dispatch = !!block.dispatch_action
  if (isTextElement(el)) {
    if (!editsInline(s.kind)) {
      const stored = s.values[blockId]?.[el.action_id]
      const value = stored && 'value' in stored ? (stored.value ?? '') : ''
      const placeholder = textOf((el as { placeholder?: TextObject }).placeholder) || TEXT_PLACEHOLDERS[el.type]
      return <div className={`bk-text-display${value ? '' : ' is-placeholder'}`}>{value || placeholder}</div>
    }
    return <BKTextInput el={el} block={block} blockId={blockId} label={label} />
  }
  if (el.type === 'checkboxes' || el.type === 'radio_buttons') return <BKChoices el={el} placement={{ blockId, input: { dispatch } }} />
  if (el.type === 'file_input') return <BKFileInput el={el} block={block} blockId={blockId} />
  if (isSelectRow(el.type) || el.type === 'rich_text_input') return <BKSelectRow el={el as PickableElement} blockId={blockId} dispatch={dispatch} title={label} />
  return null
}

registerBlock('input', InputView as never)
