import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { create } from 'zustand'
import { useDevice } from '../../sim/store'

// The iOS software keyboard. It slides up whenever a text field inside the screen has focus and pushes the focused
// screen's bottom (the composer) up by its height (--kb-height on .ios-app). Clicking its keys types into the field;
// so does the Mac's keyboard, which is how you'll usually type. Sizes follow the iPhone portrait keyboard: 336 pt with
// the QuickType bar on Face ID iPhones (291 without), keys 42 pt tall on a 54 pt row pitch.

export const KB_PREDICTIVE = 45
const ROW_PITCH = 54
const KEY_H = 42

export function keyboardHeight(safeBottom: number) {
  // QuickType bar + four rows + the emoji/dictation strip above the home indicator (or a flat bottom on SE).
  return KB_PREDICTIVE + 8 + ROW_PITCH * 3 + KEY_H + (safeBottom ? 79 : 12)
}

interface KeyboardState {
  visible: boolean
  /** set while an editable in the screen has focus */
  setVisible: (v: boolean) => void
}

export const useKeyboard = create<KeyboardState>((set) => ({ visible: false, setVisible: (visible) => set({ visible }) }))

const isEditable = (el: Element | null): el is HTMLElement =>
  !!el && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'range'].includes(el.type)) || (el as HTMLElement).isContentEditable)

/** Dismisses the keyboard (blurs the focused field), like resignFirstResponder. */
export function dismissKeyboard() {
  const el = document.activeElement
  if (isEditable(el) && el.closest('.ios-screen')) el.blur()
}

type Layout = 'letters' | 'numbers' | 'symbols'
const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const NUMBERS = ['1234567890', '-/:;()$&@"', '.,?!\'']
const SYMBOLS = ['[]{}#%^*+=', '_\\|~<>€£¥•', '.,?!\'']

function insert(text: string) {
  const el = document.activeElement
  if (!isEditable(el)) return
  // execCommand keeps the caret, undo and React's onChange in step for textareas and contenteditables alike.
  if (!document.execCommand('insertText', false, text)) {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!
      const s = el.selectionStart ?? el.value.length
      setter.call(el, el.value.slice(0, s) + text + el.value.slice(el.selectionEnd ?? s))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

/** enterkeyhint → the return key's label (UIReturnKeyType .default, .done, .go, .next, .search, .send) */
const RETURN_LABELS: Record<string, string> = { enter: 'return', done: 'done', go: 'go', next: 'next', previous: 'return', search: 'search', send: 'send' }

export function KeyboardHost() {
  const device = useDevice()
  const { visible, setVisible } = useKeyboard()
  const [layout, setLayout] = useState<Layout>('letters')
  const [shift, setShift] = useState<'off' | 'on' | 'caps'>('on')
  const [pressed, setPressed] = useState<string | null>(null)
  // UIReturnKeyType from the field's enterkeyhint: special types are blue with white text
  const [returnKey, setReturnKey] = useState<string>('enter')
  const height = keyboardHeight(device.safeBottom)

  useEffect(() => {
    const screen = document.querySelector('.ios-screen')
    if (!screen) return
    const onIn = (e: Event) => {
      if (isEditable(e.target as Element)) {
        setReturnKey((e.target as HTMLElement).enterKeyHint || 'enter')
        setVisible(true)
        setShift('on')
        setLayout('letters')
      }
    }
    const onOut = () =>
      setTimeout(() => {
        if (!isEditable(document.activeElement) || !document.activeElement!.closest('.ios-screen')) setVisible(false)
      }, 0)
    screen.addEventListener('focusin', onIn)
    screen.addEventListener('focusout', onOut)
    return () => {
      screen.removeEventListener('focusin', onIn)
      screen.removeEventListener('focusout', onOut)
    }
  }, [setVisible])

  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.ios-app')
    app?.style.setProperty('--kb-height', visible ? `${height}px` : '0px')
    app?.classList.toggle('has-keyboard', visible)
  }, [visible, height])

  // Keys never take focus from the field.
  const keep = (e: ReactPointerEvent) => e.preventDefault()
  const tap = (k: string) => {
    if (k === 'shift') return setShift((s) => (s === 'off' ? 'on' : 'off'))
    if (k === 'delete') return void document.execCommand('delete')
    if (k === '123') return setLayout('numbers')
    if (k === 'ABC') return setLayout('letters')
    if (k === '#+=') return setLayout('symbols')
    if (k === 'return') {
      const el = document.activeElement as HTMLElement | null
      el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      return
    }
    if (k === 'space') return insert(' ')
    insert(layout === 'letters' && shift !== 'off' ? k.toUpperCase() : k)
    if (shift === 'on') setShift('off')
  }

  const rows = layout === 'letters' ? LETTERS : layout === 'numbers' ? NUMBERS : SYMBOLS
  const w = device.width
  const keyW = (w - 6 - 9 * 6) / 10
  const K = (k: string, label = k, cls = '', width = keyW) => (
    <button
      key={k + label}
      type="button"
      className={`ios-kb__key ${cls}${pressed === k ? ' is-pressed' : ''}`}
      style={{ width }}
      onPointerDown={(e) => {
        keep(e)
        setPressed(k)
      }}
      onPointerUp={() => {
        setPressed(null)
        tap(k)
      }}
      onPointerLeave={() => setPressed((p) => (p === k ? null : p))}
    >
      {label}
      {pressed === k && cls === '' && <span className="ios-kb__callout">{label}</span>}
    </button>
  )
  const letter = (c: string) => K(c, layout === 'letters' && shift !== 'off' ? c.toUpperCase() : c)

  return (
    <div className={`ios-kb${visible ? ' is-visible' : ''}`} style={{ height }} onPointerDown={keep} aria-hidden={!visible}>
      <div className="ios-kb__predictive">
        {['I', 'The', 'I’m'].map((s, i) => (
          <button key={s} type="button" className="ios-kb__suggestion" onPointerDown={keep} onClick={() => insert(`${s} `)}>
            {i > 0 && <i />}
            {s}
          </button>
        ))}
      </div>
      <div className="ios-kb__rows">
        <div className="ios-kb__row">{[...rows[0]].map(layout === 'letters' ? letter : (c) => K(c))}</div>
        <div className="ios-kb__row">{[...rows[1]].map(layout === 'letters' ? letter : (c) => K(c))}</div>
        <div className="ios-kb__row">
          {layout === 'letters'
            ? K('shift', '', `ios-kb__key--fn ios-kb__key--shift is-${shift}`, keyW * 1.3)
            : K(layout === 'numbers' ? '#+=' : '123', layout === 'numbers' ? '#+=' : '123', 'ios-kb__key--fn ios-kb__key--small', keyW * 1.3)}
          <div className="ios-kb__mid" style={{ width: layout === 'letters' ? keyW * 7 + 36 + 12 : keyW * 5 * 1.38 + 24 + 12 }}>
            {[...rows[2]].map((c) => (layout === 'letters' ? letter(c) : K(c, c, '', keyW * 1.38)))}
          </div>
          {K('delete', '', 'ios-kb__key--fn ios-kb__key--delete', keyW * 1.3)}
        </div>
        <div className="ios-kb__row">
          {K(layout === 'letters' ? '123' : 'ABC', layout === 'letters' ? '123' : 'ABC', 'ios-kb__key--fn ios-kb__key--small', keyW * 1.3 + 3)}
          {K('space', 'space', 'ios-kb__key--space ios-kb__key--small', w - 6 - (keyW * 1.3 + 3) - keyW * 2.6 - 12)}
          {K('return', RETURN_LABELS[returnKey] ?? 'return', `ios-kb__key--fn ios-kb__key--small${RETURN_LABELS[returnKey] && returnKey !== 'enter' ? ' ios-kb__key--return-special' : ''}`, keyW * 2.6)}
        </div>
      </div>
      {device.safeBottom > 0 && (
        <div className="ios-kb__accessory">
          <button type="button" className="ios-kb__glyph" onPointerDown={keep} aria-label="Emoji">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="13" cy="13" r="10.5" />
              <circle cx="9.3" cy="10.5" r="0.6" fill="currentColor" />
              <circle cx="16.7" cy="10.5" r="0.6" fill="currentColor" />
              <path d="M8.3 15.2c1 1.9 2.7 2.9 4.7 2.9s3.7-1 4.7-2.9" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="ios-kb__glyph" onPointerDown={keep} aria-label="Dictate">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <rect x="9.5" y="3.5" width="7" height="12.5" rx="3.5" />
              <path d="M6.2 12.3a6.8 6.8 0 0 0 13.6 0M13 19.2v3.3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
