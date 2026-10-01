import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { useSheet } from '../../app/nav/SheetHost'
import { dismissKeyboard } from '../../app/keyboard/Keyboard'
import { SKTextToolbar } from '../../slackkit'
import { settle } from '../present'
import { INVALID_EMAIL_TEXT, INVALID_URL_TEXT, isValidEmail, isValidUrl, maxCharsText, maxNumberText, minCharsText, minNumberText, richTextPlain, sanitizeNumber } from '../validation'
import type { RichTextBlockKit } from '../types'

// The editor card message inputs and rich_text_input open (spec blockkit.md §5.4;
// Modules/Unlayered/Services/BlockKit/Implementation/BlockTextInputPresenter.swift:50-287). Both are presented over the
// current context with a cross-dissolve, on a black 40 % dim, and ride on top of the keyboard, which comes up with
// them (the field becomes first responder in viewWillAppear):
//
// - single-line inputs (plain_text_input, number_input, email_text_input, url_text_input) open SinglelineTextInputFeature
//   (Modules/Features/SinglelineTextInput/Implementation/): a full-width card on the keyboard, top corners 8,
//   base_primary, 16 pt margins (KeyboardAttachedTextInputModal.swift:25-32,68-104); the input's label in Lato Bold 17,
//   the field (Lato 17, 21 pt tall, no border), the error in Lato 15 sk_raspberry_red (its line kept when there's
//   none), 8 apart and 20 after the error, then "Cancel" and "Done" at the two ends in Lato Bold 17 content_highlight_1
//   (SinglelineTextInputViewController.swift:20-36,61-143,171-196). The text is checked as you type (length, number
//   range, email, URL: SinglelineTextInputInteractor.swift:27-47, BlockKitInputValidator.swift:76-147); Done with an
//   error cancels (:65-71).
// - multiline plain text and rich_text_input open RichTextInputFeature (Modules/Features/RichTextInput/Implementation/
//   RichTextInputViewController.swift:49-72,106-238,366-370): on iOS 26 a Liquid Glass card, radius 24, 16 pt from the
//   sides and 12 above the keyboard, 16 pt margins: the label (Lato Bold 17), the growing text, the error (12 after it),
//   the formatting toolbar for rich_text_input (RichTextInputToolbarConfig.swift:21-26, a clear SKTextToolbar), 16 pt,
//   Cancel / Done. A tap outside the card is Done (:272-275,320-331,360-362).

type Props = {
  sheetKey: string
  resultId?: string
  title?: string
  value?: string | RichTextBlockKit | null
  placeholder?: string
  multiline?: boolean
  rich?: boolean
  minLength?: number
  maxLength?: number
  type?: string
  /** number_input */
  minValue?: string
  maxValue?: string
  decimal?: boolean
}

/** The live check of SinglelineTextInputInteractor / RichTextInputInteractor (no error until the text changes). */
function validationError(text: string, p: Pick<Props, 'type' | 'minLength' | 'maxLength' | 'minValue' | 'maxValue'>): string | null {
  if (p.type === 'email_text_input') return isValidEmail(text) ? null : INVALID_EMAIL_TEXT
  if (p.type === 'url_text_input') return isValidUrl(text) ? null : INVALID_URL_TEXT
  if (p.type === 'number_input') {
    const n = Number(text)
    if (!text || Number.isNaN(n)) return null
    if (p.minValue !== undefined && n < Number(p.minValue)) return minNumberText(p.minValue)
    if (p.maxValue !== undefined && n > Number(p.maxValue)) return maxNumberText(p.maxValue)
    return null
  }
  if (p.minLength && text.length < p.minLength) return minCharsText(p.minLength)
  if (p.maxLength && text.length > p.maxLength) return maxCharsText(p.maxLength)
  return null
}

/** rich_text_input's toolbar: emoji and mention, then the formatting items (RichTextInputToolbarItemType+Extensions.swift:49-79). */
const RICH_SECTIONS: { id: string; icon: string; label: string }[][] = [
  [
    { id: 'emoji', icon: 'emoji', label: 'Emoji' },
    { id: 'mention', icon: 'mentions', label: 'Mention someone' },
  ],
  [
    { id: 'bold', icon: 'bold', label: 'Bold' },
    { id: 'italic', icon: 'italic', label: 'Italic' },
    { id: 'strikethrough', icon: 'strikethrough', label: 'Strikethrough' },
    { id: 'code', icon: 'code', label: 'Code' },
    { id: 'codeBlock', icon: 'code_block', label: 'Code block' },
    { id: 'link', icon: 'link', label: 'Link' },
    { id: 'bulletedList', icon: 'bulleted_list', label: 'Bulleted list' },
    { id: 'numberedList', icon: 'numbered_list', label: 'Numbered list' },
    { id: 'indent', icon: 'indent_left', label: 'Indent' },
    { id: 'outdent', icon: 'indent_right', label: 'Outdent' },
    { id: 'quote', icon: 'quote', label: 'Quote' },
  ],
]
const TOGGLES = new Set(['bold', 'italic', 'strikethrough', 'code', 'codeBlock', 'bulletedList', 'numberedList', 'quote'])

export function TextEditor(props: Props) {
  const { sheetKey, resultId, title, value, placeholder, multiline, rich, type, decimal } = props
  const sheet = useSheet()
  const initial = typeof value === 'string' ? value : value ? richTextPlain(value) : ''
  const [text, setText] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const closing = !!sheet?.closing
  const card = multiline || rich ? 'glass' : 'single'

  useEffect(() => {
    if (!closing) return
    // the keyboard goes down with the fade (the text input resigns first responder)
    dismissKeyboard()
    settle(resultId, null)
  }, [closing, resultId])
  useEffect(() => {
    // becomeFirstResponder in viewWillAppear: the keyboard comes up with the card
    const t = setTimeout(() => ref.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])
  // the multiline text grows with its content, up to the room above the keyboard (RichTextInputViewController.swift:455-462)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || card !== 'glass') return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [text, card])

  const finish = (v: unknown) => {
    settle(resultId, v)
    if (sheet) sheet.dismiss()
    else useApp.getState().dismissSheet(sheetKey)
  }
  const cancel = () => finish(null)
  const done = () => {
    // Done with an error is a cancel (SinglelineTextInputInteractor.swift:65-71)
    if (error) return cancel()
    finish(rich ? ({ type: 'rich_text', elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text }] }] } satisfies RichTextBlockKit) : text)
  }
  const change = (raw: string) => {
    const next = type === 'number_input' ? sanitizeNumber(raw, !!decimal) : raw
    setText(next)
    setError(validationError(next, props))
  }

  const inputMode = type === 'number_input' ? 'decimal' : type === 'email_text_input' ? 'email' : type === 'url_text_input' ? 'url' : undefined
  const buttons = (
    <div className="bk-editor__buttons">
      <button type="button" className="bk-editor__button" onClick={cancel} data-tap>
        Cancel
      </button>
      <button type="button" className="bk-editor__button" onClick={done} data-tap>
        Done
      </button>
    </div>
  )

  return (
    <div
      className={`bk-editor${closing ? ' is-closing' : ''}`}
      // the rich card: a tap outside it is Done (RichTextInputViewController.swift:320-331,360-362)
      onClick={card === 'glass' ? (e) => e.target === e.currentTarget && done() : undefined}
    >
      {card === 'single' ? (
        <div className="bk-editor__card is-single" role="dialog" aria-label={title}>
          {title && <div className="bk-editor__title">{title}</div>}
          <input
            ref={ref}
            className="bk-editor__field"
            value={text}
            placeholder={placeholder}
            inputMode={inputMode}
            enterKeyHint="done"
            onChange={(e) => change(e.target.value)}
            // the return key is off while there's an error (returnKeyEnabled .override, SinglelineTextInputViewController.swift:166-168)
            onKeyDown={(e) => e.key === 'Enter' && !error && done()}
            aria-label={title}
            aria-invalid={!!error || undefined}
          />
          {/* the error keeps its line when there's none (" " at alpha 0, :175-186) */}
          <div className={`bk-editor__error${error ? '' : ' is-empty'}`} role={error ? 'alert' : undefined}>
            {error || ' '}
          </div>
          {buttons}
        </div>
      ) : (
        <div className="bk-editor__card is-glass glass" role="dialog" aria-label={title}>
          {title && <div className="bk-editor__title">{title}</div>}
          <textarea ref={ref} className="bk-editor__field is-multiline" rows={1} value={text} placeholder={placeholder} onChange={(e) => change(e.target.value)} aria-label={title} aria-invalid={!!error || undefined} />
          {error && (
            <div className="bk-editor__error" role="alert">
              {error}
            </div>
          )}
          {rich && (
            // the toolbar's taps don't take the focus from the text (the keyboard stays up)
            <div className="bk-editor__toolbar" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
            <SKTextToolbar
              backgroundColor="transparent"
              sections={RICH_SECTIONS.map((items) => ({ items: items.map((i) => ({ id: i.id, icon: i.icon, voiceoverText: i.label, isSelected: selected.has(i.id) })) }))}
              onSelectedItem={(id, was) => {
                if (!TOGGLES.has(id)) return
                setSelected((cur) => {
                  const next = new Set(cur)
                  if (was) next.delete(id)
                  else next.add(id)
                  return next
                })
              }}
            />
            </div>
          )}
          {buttons}
        </div>
      )}
    </div>
  )
}
