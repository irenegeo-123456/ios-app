import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SKOrnamentBox, ORNAMENT_SIZES, type SKOrnament, type SKOrnamentBoxSize } from './SKOrnamentBox'
import { SKSpinner } from './SKSpinner'
import { SKIconButton } from './SKIconButton'
import { cx, useMirroredState, withAlpha } from './util'
import './text-field.css'

// SKTextField (DesignerComponents/TextField/SKTextField.swift): the bordered single-line field behind SKSearchBar and
// SKSearchBarButton. Lato 17 text, placeholder and ghost text inside 10 / 16 insets; a leading SKOrnamentBox with the
// text 12 pt after it; a 20 pt clear ⓧ at the right inset while editing with text (the text inset grows by 24), or an
// 18 pt spinner, or the secure-entry eye. Radius 12, 1 pt border (a clear border means no border and radius 0).
// Measured 42 pt tall with the default insets (SNAP/SKTextFieldSnapshotTests, :799-819). In `mode="button"` it's a
// tappable field whose fill turns selectedBackgroundColor while pressed (:728-729). Spec: slackkit-components.md ›
// SKTextField.
//
//   <SKTextField placeholderText="Channel name" />
//   <SKTextField text={value} onTextChanged={setValue} ornament={{ ornament: { icon: 'search' }, size: 'small' }} />
//   <SKTextField isSecureTextEntry shouldShowSecureTextEntryToggle placeholderText="Password" />

/** GhostText (GhostTextHelpers.swift:14-38): a suggestion completing the typed prefix, or text trailing the input */
export type SKGhostText = { suggestedResult: string; color?: string; font?: string } | { trailing: string; color?: string; font?: string }

export interface SKTextFieldProps {
  /** .textField (default) or .button (not editable; fires buttonTapped) */
  mode?: 'textField' | 'button'
  /** textAction .replace(text): the field's text; it also edits on its own and follows changes to this */
  text?: string
  /** the leading ornament (an SKOrnamentBox) */
  ornament?: { ornament: SKOrnament; size: SKOrnamentBoxSize; onTapped?: () => void }
  /** default "Search…" (R.strings.search_with_ellipsis) */
  placeholderText?: string
  ghostText?: SKGhostText
  /** default primary.outlinePrimary; 'clear' or 'transparent' removes the border and the radius */
  borderColor?: string
  /** default contentPrimary @30 % / @15 % */
  clearButtonNormalColor?: string
  clearButtonHighlightColor?: string
  /** default primary.contentSecondary */
  textFieldPlaceholderTextColor?: string
  /** default primary.contentPrimary */
  textFieldStandardTextColor?: string
  /** default none */
  textFieldBackgroundColor?: string
  /** the fill while pressed in button mode, default primary.baseTertiary */
  selectedBackgroundColor?: string
  shouldShowLoadingIndicator?: boolean
  /** black, opacity 0.08, radius 3, y 1 (:34-41) */
  shouldShowShadow?: boolean
  /** default 10 / 16 / 10 / 16 (Constants.initialEdgeInsets) */
  edgeInsets?: { top: number; left: number; bottom: number; right: number }
  isEnabled?: boolean
  isSecureTextEntry?: boolean
  shouldShowSecureTextEntryToggle?: boolean
  /** returnKeyType → enterkeyhint */
  returnKeyType?: 'default' | 'go' | 'search' | 'send' | 'next' | 'done'
  keyboardType?: 'default' | 'email' | 'numeric' | 'decimal' | 'url' | 'tel'
  autocapitalizationType?: 'none' | 'sentences' | 'words' | 'characters'
  autoFocus?: boolean
  onTextChanged?: (text: string) => void
  onBeganEditing?: () => void
  /** endedEditing: 'submitForm' / 'goToNextField' come from the return key, 'none' from losing focus */
  onEndedEditing?: (action: 'none' | 'goToNextField' | 'submitForm') => void
  /** button mode */
  onButtonTapped?: () => void
  onClearButtonTapped?: () => void
  onSecureEntryToggleTapped?: () => void
  accessibilityLabel?: string
  /** a searchField trait for VoiceOver (.textField(isSearchField: true)) */
  isSearchField?: boolean
  className?: string
  style?: CSSProperties
  /** content after the field's text, inside it (rare; iOS uses the ghost text for this) */
  children?: ReactNode
}

const DEFAULT_INSETS = { top: 10, left: 16, bottom: 10, right: 16 }
/** the text line inside the insets: 42 − 20, measured (SNAP/SKTextFieldSnapshotTests/testTextFieldDefault@3x.png) */
const LINE = 22

const normalized = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function SKTextField({
  mode = 'textField',
  text = '',
  ornament,
  placeholderText = 'Search…',
  ghostText,
  borderColor = 'var(--dt_color_outline_primary)',
  // September 2026: contentTertiary, pressed at Modifiers.pressedOpacity 0.75 (SKTextField.swift:917-918; June
  // contentPrimary @30 % / @15 %)
  clearButtonNormalColor = 'var(--dt_color_content_tertiary)',
  clearButtonHighlightColor = withAlpha('var(--dt_color_content_tertiary)', 0.75),
  textFieldPlaceholderTextColor = 'var(--dt_color_content_secondary)',
  textFieldStandardTextColor = 'var(--dt_color_content_primary)',
  textFieldBackgroundColor = 'transparent',
  selectedBackgroundColor = 'var(--dt_color_base_tertiary)',
  shouldShowLoadingIndicator = false,
  shouldShowShadow = false,
  edgeInsets = DEFAULT_INSETS,
  isEnabled = true,
  isSecureTextEntry = false,
  shouldShowSecureTextEntryToggle = false,
  returnKeyType = 'default',
  keyboardType = 'default',
  autocapitalizationType = 'sentences',
  autoFocus,
  onTextChanged,
  onBeganEditing,
  onEndedEditing,
  onButtonTapped,
  onClearButtonTapped,
  onSecureEntryToggleTapped,
  accessibilityLabel,
  isSearchField,
  className,
  style,
  children,
}: SKTextFieldProps) {
  const [value, setValue] = useMirroredState(text)
  const [editing, setEditing] = useState(false)
  const [secure, setSecure] = useMirroredState(isSecureTextEntry)
  const input = useRef<HTMLInputElement>(null)
  const button = mode === 'button'
  const noBorder = /^(clear|transparent)$/i.test(borderColor)
  const ornamentInset = ornament ? ORNAMENT_SIZES[ornament.size] + 12 : 0
  // The clear button shows while editing with text, unless the spinner or the secure toggle is showing (:362-385).
  const showClear = !button && editing && value !== '' && !shouldShowLoadingIndicator && !shouldShowSecureTextEntryToggle
  const trailing = showClear || shouldShowLoadingIndicator || shouldShowSecureTextEntryToggle
  const padLeft = edgeInsets.left + ornamentInset
  const padRight = edgeInsets.right + (trailing ? 24 : 0)
  // disabled: the standard text color at Modifiers.disabledOpacity 0.35 since September 2026 (SKTextField.swift:362,
  // :485; June used contentTertiary)
  const textColor = isEnabled ? textFieldStandardTextColor : `rgb(from ${textFieldStandardTextColor} r g b / calc(alpha * 0.35))`

  const change = (t: string) => {
    setValue(t)
    onTextChanged?.(t)
  }
  let ghost: ReactNode = null
  if (ghostText && value) {
    const g = ghostText.color ?? 'var(--dt_color_content_tertiary)'
    if ('suggestedResult' in ghostText) {
      if (normalized(ghostText.suggestedResult).startsWith(normalized(value)))
        ghost = (
          <>
            <span className="sk-text-field__ghost-typed">{value}</span>
            <span style={{ color: g, font: ghostText.font }}>{ghostText.suggestedResult.slice(value.length)}</span>
          </>
        )
    } else
      ghost = (
        <>
          <span className="sk-text-field__ghost-typed">{value}</span>
          <span style={{ color: g, font: ghostText.font }}>{ghostText.trailing}</span>
        </>
      )
  }
  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    onEndedEditing?.(returnKeyType === 'next' || returnKeyType === 'default' ? 'goToNextField' : 'submitForm')
  }
  const lineStyle: CSSProperties = { paddingTop: edgeInsets.top, paddingBottom: edgeInsets.bottom, paddingLeft: padLeft, paddingRight: padRight }
  return (
    <div
      className={cx('sk-text-field', button && 'is-button', noBorder && 'no-border', shouldShowShadow && 'has-shadow', !isEnabled && 'is-disabled', className)}
      style={
        {
          '--tf-border': noBorder ? 'transparent' : borderColor,
          '--tf-bg': textFieldBackgroundColor,
          '--tf-bg-selected': selectedBackgroundColor,
          '--tf-text': textColor,
          '--tf-placeholder': textFieldPlaceholderTextColor,
          ...style,
        } as CSSProperties
      }
      onClick={button && isEnabled ? onButtonTapped : undefined}
      data-tap={button && isEnabled ? '' : undefined}
      role={button ? 'button' : undefined}
      aria-label={button ? (accessibilityLabel ?? 'Jump to…') : undefined}
    >
      {button ? (
        <div className="sk-text-field__line" style={{ ...lineStyle, height: LINE + edgeInsets.top + edgeInsets.bottom }}>
          {value ? <span className="sk-text-field__text">{value}</span> : <span className="sk-text-field__placeholder-text">{placeholderText}</span>}
        </div>
      ) : (
        <input
          ref={input}
          className="sk-text-field__input"
          style={{ ...lineStyle, height: LINE + edgeInsets.top + edgeInsets.bottom }}
          value={value}
          type={secure ? 'password' : 'text'}
          disabled={!isEnabled}
          autoFocus={autoFocus}
          enterKeyHint={returnKeyType === 'default' ? undefined : returnKeyType}
          inputMode={keyboardType === 'default' ? undefined : keyboardType}
          autoCapitalize={autocapitalizationType === 'none' ? 'off' : autocapitalizationType}
          autoCorrect="off"
          spellCheck={false}
          role={isSearchField ? 'searchbox' : undefined}
          aria-label={accessibilityLabel ?? placeholderText}
          onChange={(e) => change(e.target.value)}
          onFocus={() => {
            setEditing(true)
            onBeganEditing?.()
          }}
          onBlur={() => {
            setEditing(false)
            onEndedEditing?.('none')
          }}
          onKeyDown={keyDown}
        />
      )}
      {!button && value === '' && (
        // The placeholder, with trailing ghost text appended in the ghost color (:292-299)
        <div className="sk-text-field__overlay sk-text-field__placeholder" style={lineStyle} aria-hidden>
          {placeholderText}
          {ghostText && 'trailing' in ghostText && <span style={{ color: ghostText.color ?? 'var(--dt_color_content_tertiary)', font: ghostText.font }}>{ghostText.trailing}</span>}
        </div>
      )}
      {ghost && (
        <div className="sk-text-field__overlay sk-text-field__ghost" style={lineStyle} aria-hidden>
          {ghost}
        </div>
      )}
      {ornament && (
        <span className="sk-text-field__ornament" style={{ left: edgeInsets.left }}>
          <SKOrnamentBox ornament={ornament.ornament} size={ornament.size} onTapped={ornament.onTapped} />
        </span>
      )}
      {children}
      {(showClear || shouldShowLoadingIndicator || shouldShowSecureTextEntryToggle) && (
        <span className="sk-text-field__trailing" style={{ right: edgeInsets.right }}>
          {shouldShowLoadingIndicator ? (
            <SKSpinner size="medium" color="darkOnLight" />
          ) : shouldShowSecureTextEntryToggle ? (
            <SKIconButton
              icon={secure ? 'eye_open_filled' : 'eye_closed'}
              iconColor="var(--dt_color_content_secondary)"
              accessibilityLabel={secure ? 'Show password' : 'Hide password'}
              onClick={() => {
                setSecure(!secure)
                onSecureEntryToggleTapped?.()
              }}
            />
          ) : (
            <ClearButton
              normalColor={clearButtonNormalColor}
              highlightedColor={clearButtonHighlightColor}
              onClick={() => {
                onClearButtonTapped?.()
                change('')
                input.current?.focus()
              }}
            />
          )}
        </span>
      )}
    </div>
  )
}

/**
 * ClearButton (Helpers/ClearButton/ClearButton.swift:15-103): the 20 pt ⓧ (close_circle_filled) in text fields.
 * contentSecondary normally, contentInverseSecondary while pressed; owners override both. VoiceOver "Clear text".
 */
export function ClearButton({
  normalColor = 'var(--dt_color_content_secondary)',
  highlightedColor = 'var(--dt_color_content_inverse_secondary)',
  onClick,
  className,
}: {
  normalColor?: string
  highlightedColor?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={cx('sk-clear-button', className)}
      style={{ '--clear-normal': normalColor, '--clear-highlighted': highlightedColor } as CSSProperties}
      aria-label="Clear text"
      // keep the field focused (and the keyboard up) while tapping it
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      data-tap=""
    >
      <Icon name="close_circle_filled" size={20} />
    </button>
  )
}
