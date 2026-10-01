import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cx, useMirroredState } from './util'
import './text-input.css'

// SKTextInput (CoreComponents/TextInput/SKTextInput.swift): the multi-line text view under the composer and the
// text-input entities. basePrimary behind; text Lato Regular 17 in contentPrimary with no font leading (:181, :333-351);
// textContainerInset 8 / 0 / 8 / 0 and no line-fragment padding; the placeholder (SKFont.body, contentSecondary, 1
// line) sits at the same insets and hides once there is text (:250-253, :676-690). scrollBehavior: disabled (grows to
// fit), maximumHeight(h) (grows, then scrolls) or enabled (the default: its own height, scrolls) (:700-745, :805-812).
// Rich text (mentions, links, code) is the composer's; this is plain text. Spec: slackkit-components.md › SKTextInput.
//
//   <SKTextInput placeholderText="Message #general" scrollBehavior={{ maximumHeight: 160 }} onChange={setDraft} />

interface Props {
  placeholderText?: ReactNode
  /** inputText; uncontrolled when omitted */
  value?: string
  defaultValue?: string
  scrollBehavior?: 'disabled' | 'enabled' | { maximumHeight: number }
  textContainerInset?: { top: number; left: number; bottom: number; right: number }
  /** maxLinesForPlaceholder */
  maxLinesForPlaceholder?: number
  /** maxCharacterCount: extra keystrokes are ignored */
  maxCharacterCount?: number
  autoFocus?: boolean
  onChange?: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  /** textLimitReached */
  onTextLimitReached?: () => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKTextInput({
  placeholderText,
  value,
  defaultValue = '',
  scrollBehavior = 'enabled',
  textContainerInset = { top: 8, left: 0, bottom: 8, right: 0 },
  maxLinesForPlaceholder = 1,
  maxCharacterCount,
  autoFocus,
  onChange,
  onFocus,
  onBlur,
  onTextLimitReached,
  accessibilityLabel,
  className,
  style,
}: Props) {
  const [text, setText] = useMirroredState(value ?? defaultValue)
  const ref = useRef<HTMLTextAreaElement>(null)
  const grows = scrollBehavior !== 'enabled'
  const max = typeof scrollBehavior === 'object' ? scrollBehavior.maximumHeight : undefined
  // grow with the content (disabled / maximumHeight): the text view's contentSize drives its height
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !grows) return
    el.style.height = '0px'
    const h = el.scrollHeight
    el.style.height = `${max != null ? Math.min(max, h) : h}px`
  }, [text, grows, max])
  const inset = textContainerInset
  return (
    <div className={cx('sk-text-input', className)} style={style}>
      {!text && placeholderText != null && (
        <div
          className="sk-text-input__placeholder"
          style={{ top: inset.top, left: inset.left, right: inset.right, WebkitLineClamp: maxLinesForPlaceholder }}
          aria-hidden
        >
          {placeholderText}
        </div>
      )}
      <textarea
        ref={ref}
        className="sk-text-input__field"
        style={{
          padding: `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`,
          overflowY: scrollBehavior === 'disabled' ? 'hidden' : 'auto',
          height: grows ? undefined : '100%',
        }}
        rows={1}
        value={text}
        autoFocus={autoFocus}
        aria-label={accessibilityLabel ?? (typeof placeholderText === 'string' ? placeholderText : undefined)}
        onChange={(e) => {
          let next = e.target.value
          if (maxCharacterCount != null && next.length > maxCharacterCount) {
            onTextLimitReached?.()
            if (next.length - text.length > 1) return // a paste beyond the limit is ignored
            next = next.slice(0, maxCharacterCount)
          }
          setText(next)
          onChange?.(next)
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  )
}
