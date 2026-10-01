import { useRef, type KeyboardEvent } from 'react'
import { SKTokenView, type SKTokenOrnament } from '../../../slackkit/SKTokenView'
import './token-field.css'

// A tokenized search field (Modules/Features/TokenizedSearch, TS/ below): the chosen people or conversations as tokens,
// then the text you're typing, wrapping in a collection 16 pt from the sides with 4 pt above and below and 8 pt between
// items; each line at least 48 pt (a 40 pt input + 4 pt tap insets), at most 108 pt before it scrolls (TS/Views/
// TokenSearchInputStyle.swift:12-25; TokenCollectionViewFlowLayout.swift:12-22). Text in body 17 contentPrimary, the
// placeholder in contentSecondary (SearchInputTextView.swift:34-79). Backspace in an empty field selects the last token,
// then removes it. Tokens are drawn with SKTokenView (Slack's current token; TS's own cell is the older 4 pt-radius one).

export interface FieldToken {
  id: string
  text: string
  ornament?: SKTokenOrnament
}

interface Props {
  tokens: FieldToken[]
  query: string
  onQuery: (q: string) => void
  onRemove: (id: string) => void
  placeholder: string
  /** the last token, selected by a backspace in the empty field */
  selected?: string | null
  onSelect?: (id: string | null) => void
  autoFocus?: boolean
  onFocus?: () => void
  label?: string
}

export function TokenField({ tokens, query, onQuery, onRemove, placeholder, selected, onSelect, autoFocus, onFocus, label }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace' || query || !tokens.length) return
    const last = tokens[tokens.length - 1].id
    e.preventDefault()
    if (selected === last) {
      onRemove(last)
      onSelect?.(null)
    } else onSelect?.(last)
  }
  return (
    <div className="token-field" onClick={() => input.current?.focus()}>
      {tokens.map((t) => (
        <span key={t.id} className="token-field__token">
          <SKTokenView
            ornament={t.ornament}
            text={t.text}
            isSelected={selected === t.id}
            isDismissible={selected === t.id}
            onViewTapped={() => onSelect?.(selected === t.id ? null : t.id)}
            onDismissTapped={() => {
              onRemove(t.id)
              onSelect?.(null)
            }}
          />
        </span>
      ))}
      <input
        ref={input}
        className="token-field__input"
        value={query}
        placeholder={tokens.length ? undefined : placeholder}
        aria-label={label ?? placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        onFocus={onFocus}
        onKeyDown={onKey}
        onChange={(e) => {
          onSelect?.(null)
          onQuery(e.target.value)
        }}
      />
    </div>
  )
}
