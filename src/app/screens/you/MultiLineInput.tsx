import { useLayoutEffect, useRef } from 'react'
import './multi-line-input.css'

// SKMultiLineTextInputEntity, style .border / .errorBorder (DesignerComponents/Entities/TextInput/MultiLine/
// SKMultiLineTextInputEntity.swift:56-92, MultiLineTextInputEmbeddableViewController.swift:36-46, :255-303; slack-objc
// 14b3cbaf): row margins 12 / 16; a UITextView with a 1 pt border (outlinePrimary, important.outline with an error) of radius 12,
// continuous; text inset 12 / 16, line fragment padding 0; .body in contentPrimary over a clear background, the
// placeholder in contentTertiary with the same insets; it grows with its text (the row is text + 24 + 24). Return
// inserts a newline. Disabled (a locked field): text contentTertiary on baseSecondary, not editable.

interface Props {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  autoFocus?: boolean
  accessibilityLabel?: string
  onFocus?: () => void
}

export function MultiLineInput({ value, onChange, placeholder, error, disabled, autoFocus, accessibilityLabel, onFocus }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // grow with the content (re-measured from the current text)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  useLayoutEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => ref.current?.focus(), 450)
    return () => clearTimeout(t)
  }, [autoFocus])
  return (
    <div className={['sk-mlti', error && 'is-error', disabled && 'is-disabled'].filter(Boolean).join(' ')}>
      <div className="sk-mlti__box">
        <textarea
          ref={ref}
          className="sk-mlti__input"
          rows={1}
          value={value}
          disabled={disabled}
          aria-label={accessibilityLabel ?? placeholder}
          spellCheck={false}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={onFocus}
        />
        {!value && placeholder && (
          <div className="sk-mlti__placeholder" aria-hidden>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}
