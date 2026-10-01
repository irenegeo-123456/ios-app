import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SKTextField } from '../../slackkit'
import { dismissKeyboard } from '../../app/keyboard/Keyboard'
import { editsInline, useSurface } from '../surface'
import { TEXT_PLACEHOLDERS, textOf } from '../format'
import { elementError, sanitizeNumber } from '../validation'
import { presentForResult } from '../present'
import type { EmailTextInputElement, InputBlock, NumberInputElement, PlainTextInputElement, TextObject, UrlTextInputElement } from '../types'

// plain_text_input, number_input, email_text_input, url_text_input (spec blockkit.md §4.6). Inline in modals and App
// Homes: a borderless SKTextField with no padding, Lato 17, content_primary text and a content_tertiary placeholder,
// the clear button while editing (BKSimpleTextInputView+PresentationObject.swift:113-208; SKTextField.swift:43-51,
// 241, 369-385, 582-585). Multiline grows with its content. Validation runs on blur and on Done (§6). In messages the
// block shows the value and opens the full-screen editor on tap (§5.4).

export type TextElement = PlainTextInputElement | NumberInputElement | EmailTextInputElement | UrlTextInputElement

/** A debounce for `on_character_entered` (PlainTextInputBlockElement+BlockInteractable.swift). */
const CHARACTER_DEBOUNCE = 500

export function BKTextInput({ el, block, blockId, label }: { el: TextElement; block: InputBlock; blockId: string; label: string }) {
  const s = useSurface()
  const stored = s.values[blockId]?.[el.action_id]
  const value = stored && 'value' in stored ? (stored.value ?? '') : ''
  const placeholder = textOf((el as { placeholder?: TextObject }).placeholder) || TEXT_PLACEHOLDERS[el.type] || ''
  const triggers = block.dispatch_action ? (el.dispatch_action_config?.trigger_actions_on ?? ['on_enter_pressed']) : []
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const required = s.kind === 'modal' && !block.optional
  const validate = (text: string) => s.setError(blockId, elementError(el, { type: el.type, value: text || null }, required))
  const send = (text: string) => void s.dispatch({ type: el.type, actionId: el.action_id, blockId, value: text })

  const change = (raw: string) => {
    const text = el.type === 'number_input' ? sanitizeNumber(raw, !!el.is_decimal_allowed) : raw
    s.setValue(blockId, el.action_id, { type: el.type, value: text || null })
    if (s.errors[blockId]) s.setError(blockId, null)
    if (triggers.includes('on_character_entered')) {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => send(text), CHARACTER_DEBOUNCE)
    }
    return text
  }
  /** Done on the keyboard: validate, send `on_enter_pressed`, and the keyboard goes down. */
  const done = (text: string) => {
    validate(text)
    if (triggers.includes('on_enter_pressed')) send(text)
  }

  if (!editsInline(s.kind)) {
    // Messages: the whole block opens the editor (BKInputBlockView.swift:177-192,235-245).
    const open = async () => {
      if (!s.interactive) return
      const r = await presentForResult<string>('bk-text-editor', {
        title: label,
        value,
        placeholder,
        multiline: el.type === 'plain_text_input' && !!el.multiline,
        maxLength: el.type === 'plain_text_input' ? el.max_length : undefined,
        minLength: el.type === 'plain_text_input' ? el.min_length : undefined,
        type: el.type,
        ...(el.type === 'number_input' ? { minValue: el.min_value, maxValue: el.max_value, decimal: !!el.is_decimal_allowed } : {}),
      })
      if (r === null) return
      const text = change(r)
      done(text)
    }
    return (
      <div className={`bk-text-display${value ? '' : ' is-placeholder'}`} role="button" aria-label={label} onClick={() => void open()}>
        {value || placeholder}
      </div>
    )
  }

  if (el.type === 'plain_text_input' && el.multiline)
    return <MultilineInput value={value} placeholder={placeholder} enabled={s.interactive} label={label} maxLength={el.max_length} onChange={change} onDone={done} />

  const keyboard = el.type === 'number_input' ? (el.is_decimal_allowed ? 'decimal' : 'numeric') : el.type === 'email_text_input' ? 'email' : el.type === 'url_text_input' ? 'url' : 'default'
  return (
    <SKTextField
      className="bk-text-field"
      text={value}
      placeholderText={placeholder}
      borderColor="clear"
      edgeInsets={{ top: 0, left: 0, bottom: 0, right: 0 }}
      textFieldPlaceholderTextColor="var(--dt_color_content_tertiary)"
      isEnabled={s.interactive}
      returnKeyType="done"
      keyboardType={keyboard}
      autocapitalizationType={el.type === 'plain_text_input' ? 'sentences' : 'none'}
      accessibilityLabel={label}
      onTextChanged={(t) => void change(t)}
      onEndedEditing={(how) => {
        if (how === 'none') return validate(value)
        done(value)
        dismissKeyboard()
      }}
    />
  )
}

/** A multiline plain_text_input: grows with its content, no inner scrolling (MultiLineTextInputSizer.swift:11-30). */
function MultilineInput({ value, placeholder, enabled, label, maxLength, onChange, onDone }: { value: string; placeholder: string; enabled: boolean; label: string; maxLength?: number; onChange: (t: string) => string; onDone: (t: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [text])
  void maxLength
  return (
    <textarea
      ref={ref}
      className="bk-textarea"
      rows={1}
      value={text}
      placeholder={placeholder}
      aria-label={label}
      disabled={!enabled}
      enterKeyHint="done"
      onChange={(e) => setText(onChange(e.target.value))}
      onBlur={() => onDone(text)}
      onKeyDown={(e) => {
        // The keyboard's accessory bar has the multiline "Done" (+PresentationObject.swift:179-208); ⌘↵ stands in for it.
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) dismissKeyboard()
      }}
    />
  )
}

/** The element types this file draws. */
export const isTextElement = (el: InputBlock['element']): el is TextElement => el.type === 'plain_text_input' || el.type === 'number_input' || el.type === 'email_text_input' || el.type === 'url_text_input'
