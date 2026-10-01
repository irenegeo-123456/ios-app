import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SKButton } from '../../../slackkit/SKButton'
import { SKMemberEntity } from '../../../slackkit/SKEntities'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKTextToolbar } from '../../../slackkit/SKTextToolbar'
import { findEmoji } from '../../../emoji/Emoji'
import { SheetBar } from '../../sheets/ui/SheetBar'
import type { Fixture, Message, User } from '../../../data/types'
import { isoDate } from './listModel'
import '../../sheets/ui/ios.css'
import '../../../blocks/sheets/sheets.css'
import './record.css'

// The editors a list item's fields open (spec canvas-lists-creation.md §3.3): the text editor, "Select User" and the
// date sheet. Each reports the new value through its callback; the item saves it.

/** Runs `fn` once the sheet with this key has gone. */
function afterClose(key: string | undefined, fn: () => void) {
  if (!key || !useApp.getState().sheets.some((s) => s.key === key)) return fn()
  const unsub = useApp.subscribe((s) => {
    if (s.sheets.some((x) => x.key === key)) return
    unsub()
    fn()
  })
}

// ------------------------------------------------------------------------------------------------ text

type TextInputProps = SheetProps & {
  title?: string
  text?: string
  placeholder?: string
  /** the toolbar: the primary field's emoji and mention ('primary'), a rich text field's standard one ('standard') */
  toolbar?: 'primary' | 'standard'
  /** where the caret goes (it comes back from the emoji picker where it was) */
  caret?: number
  onDone?: (text: string | null) => void
}

/**
 * The text editor (RichTextInputFeature; RichTextInputViewController.swift:57-200, 236-238, 282-286, 355-439;
 * ListRecordInteractor.swift:1558-1600), cross-dissolved over the item: black 40 % over everything, and on iOS 26 a Liquid
 * Glass card (radius 24) 16 pt from the sides and 12 pt above the keyboard. In it, 16 pt margins and 8 pt apart: the
 * field's name (bodyBold), the text (the keyboard up), the toolbar (the primary field's emoji and mention; a rich text
 * field's adds the formatting buttons), and 16 pt below it "Cancel" and "Done" (bodyBold highlight1.content) at either
 * end. Done (or a tap outside the card) saves — an empty text clears the field; Cancel drops the edit. Return is a new
 * line.
 *
 *   presentSheet('list-text-input', { title, text, placeholder, toolbar, onDone: (text | null) => … })
 */
export function ListTextInputSheet({ sheetKey, title = '', text: initial = '', placeholder, toolbar, caret, onDone }: TextInputProps) {
  const sheet = useSheet()
  const [text, setText] = useState(String(initial ?? ''))
  const input = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const el = input.current
    if (!el) return
    el.focus()
    const at = Math.min(caret ?? el.value.length, el.value.length)
    el.setSelectionRange(at, at)
  }, [caret])
  // the text view grows with its text; the card stops at the top of the screen and the text scrolls
  useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  const close = (then?: () => void) => {
    if (sheet) sheet.dismiss(then)
    else {
      useApp.getState().dismissSheet(sheetKey)
      then?.()
    }
  }
  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    input.current?.blur()
    const value = text
    // an empty text clears the field (doneButtonSelected(nil), RichTextInputInteractor.swift:394-397)
    close(() => save && onDone?.(value.trim() ? value : null))
  }

  const onToolbar = (id: string) => {
    if (id !== 'emoji' && id !== 'mention') return useApp.getState().showToast('Not in the prototype')
    const el = input.current
    const at = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? at
    if (id === 'mention') {
      // the @ that starts a mention (there's no autocomplete here)
      el?.focus()
      document.execCommand('insertText', false, '@')
      return
    }
    // the emoji picker goes over the editor: the editor steps aside while it's up and comes back with the emoji at the caret
    done.current = true
    const keep = { title, placeholder, toolbar, onDone }
    let picked: string | null = null
    close(() => {
      useApp.getState().presentSheet('emoji-picker', { onPick: (name: string) => (picked = name) })
      const pickerKey = useApp.getState().sheets.at(-1)?.key
      afterClose(pickerKey, () => {
        const insert = picked ? emojiText(picked) : ''
        useApp.getState().presentSheet('list-text-input', { ...keep, text: text.slice(0, at) + insert + text.slice(end), caret: at + insert.length })
      })
    })
  }

  return (
    <div className="lr-input" onClick={(e) => e.target === e.currentTarget && finish(true)}>
      <div className="lr-input__card glass" role="dialog" aria-label={title}>
        {/* the field's name, bodyBold, a header (:416-421) */}
        <div className="lr-input__title" role="heading" aria-level={2}>
          {title}
        </div>
        <textarea
          ref={input}
          className="lr-input__text"
          value={text}
          rows={1}
          // "Untitled Item" for the primary field, else "Text" (list_record_untitled_item yaml:10461 / text yaml:19651)
          placeholder={placeholder ?? 'Text'}
          aria-label={title}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Return is a new line, as in any UITextView (Shift+Return too: the editor's only shortcut,
            // RichTextInputInteractor.swift:581-585); the simulated keyboard's return key only sends the keydown
            if (e.key === 'Enter' && !e.nativeEvent.isTrusted) {
              e.preventDefault()
              document.execCommand('insertText', false, '\n')
            }
          }}
        />
        {toolbar && (
          <div className="lr-input__toolbar" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
            <SKTextToolbar sections={toolbar === 'primary' ? [INPUT_ITEMS] : [INPUT_ITEMS, FORMAT_ITEMS]} backgroundColor="transparent" onSelectedItem={onToolbar} />
          </div>
        )}
        <div className="lr-input__buttons">
          {/* cancel (yaml:3065) / done (yaml:5390): SKTappableLabels, bodyBold highlight1.content (:404-411) */}
          <button type="button" className="lr-input__button" onPointerDown={(e) => e.preventDefault()} onClick={() => finish(false)} data-tap>
            Cancel
          </button>
          <button type="button" className="lr-input__button" onPointerDown={(e) => e.preventDefault()} onClick={() => finish(true)} data-tap>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// The toolbar's items (RichTextInputToolbarConfig.swift:21-26; RichTextInputToolbarItemType+Extensions.swift:49-104):
// emoji and mention (emoji_picker_sentence_case yaml:5831, at_mention_composer_ia yaml:2104), then the formatting
// section a rich text field adds (bold_formatting yaml:2350 … quoted_formatting yaml:14635). The text here is plain:
// formatting isn't in the prototype.
const INPUT_ITEMS = {
  items: [
    { id: 'emoji', icon: 'emoji', voiceoverText: 'Emoji picker' },
    { id: 'mention', icon: 'mentions', voiceoverText: 'Mention someone' },
  ],
}
const FORMAT_ITEMS = {
  items: [
    { id: 'bold', icon: 'bold', voiceoverText: 'Bold text formatting' },
    { id: 'italic', icon: 'italic', voiceoverText: 'Italics text formatting' },
    { id: 'strikethrough', icon: 'strikethrough', voiceoverText: 'Strike-through text formatting' },
    { id: 'code', icon: 'code', voiceoverText: 'Code text formatting' },
    { id: 'codeBlock', icon: 'code_block', voiceoverText: 'Pre-formatted text formatting' },
    { id: 'link', icon: 'link', voiceoverText: 'Link text formatting' },
    { id: 'bulletedList', icon: 'bulleted_list', voiceoverText: 'Bullet list text formatting' },
    { id: 'numberedList', icon: 'numbered_list', voiceoverText: 'Numbered list text formatting' },
    { id: 'indent', icon: 'indent_left', voiceoverText: 'Indent selected list items by a single level' },
    { id: 'outdent', icon: 'indent_right', voiceoverText: 'De-dent selected list items by a single level' },
    { id: 'quote', icon: 'quote', voiceoverText: 'Quoted text formatting' },
  ],
}

/** A picked emoji as text: the character for a standard one, :name: for a custom one. */
function emojiText(name: string): string {
  const clean = name.replace(/^:|:$/g, '')
  const e = findEmoji(clean)
  if (!e || e.c === 9) return `:${clean}:`
  return String.fromCodePoint(...e.u.split('-').map((h) => parseInt(h, 16)))
}

// ------------------------------------------------------------------------------------------------ person

const isPerson = (u: User | undefined): u is User => !!u && !u.isBot && !u.isApp && u.id !== 'USLACKBOT'
const words = (s: string) => s.toLowerCase().split(/[\s._,-]+/).filter(Boolean)
const matches = (name: string | undefined, q: string) => !!name && (name.toLowerCase().startsWith(q) || words(name).some((w) => w.startsWith(q)))
const lastTs = (messages: Record<string, Message[]>, id: string | undefined) => (id ? parseFloat(messages[id]?.at(-1)?.ts ?? '0') : 0)

/** People, the ones you've DMed lately first (the frecent autocomplete); no bots or Slackbot. */
function people(fx: Fixture, messages: Record<string, Message[]>, query: string): User[] {
  const q = query.trim().replace(/^@/, '').toLowerCase()
  const ims = new Map(Object.values(fx.conversations).filter((c) => c.type === 'im' && c.userId).map((c) => [c.userId!, c.id]))
  return Object.values(fx.users)
    .filter((u) => isPerson(u) && (!q || matches(u.name, q) || matches(u.realName, q)))
    .sort((a, b) => lastTs(messages, ims.get(b.id)) - lastTs(messages, ims.get(a.id)) || a.realName.localeCompare(b.realName))
}

/**
 * "Select User" (select_user, yaml:16432; ListRecordInteractor.swift:1313-1365): the UserConversationPicker in single
 * select, people only (no bots, no Slackbot), .small rows, a search view, "Clear" on the right (an SKBarButtonItem title
 * .default: SKButton .systemDefault .barButton, bodyBold highlight1). Tapping someone saves them; Clear empties the field.
 *
 *   presentSheet('list-person-picker', { onPick: (userId | null) => … })
 */
export function ListPersonPickerSheet({ sheetKey, onPick }: SheetProps & { onPick?: (id: string | null) => void }) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const rows = useMemo(() => people(fx, messages, query), [fx, messages, query])
  const close = (then?: () => void) => {
    if (sheet) sheet.dismiss(then)
    else {
      useApp.getState().dismissSheet(sheetKey)
      then?.()
    }
  }
  const pick = (id: string | null) => close(() => onPick?.(id))
  return (
    <div className="lr-pick">
      {/* the automatic close button; clear (yaml:3871) */}
      <SheetBar title="Select User" leading="close" onClose={() => close()} trailing={{ title: 'Clear', onClick: () => pick(null), weight: 'bold', color: 'var(--dt_color_content_highlight_1)' }} scrolled={scrolled} />
      {/* SKSearchView: 16 / 12 pt insets, "Search" (search, yaml:16105) (SKSearchView.swift:24-33, :167) */}
      <div className="lr-pick__search">
        <SKSearchBar text={query} onTextChanged={setQuery} placeholderText="Search" accessibilityLabel="Search" />
      </div>
      <div className="lr-pick__rule" />
      <div className="lr-pick__list ios-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)} data-sheet-scroll>
        {rows.length === 0 ? (
          // no_user_matches_keywords (yaml:12358), clear_search (yaml:3893) (UserConversationPickerPresenter.swift:359-424)
          <SKEmptyState content={{ illustration: 'emoji_no_results' }} title="No user matches these keywords." buttons={[{ title: 'Clear search', onClick: () => setQuery('') }]} />
        ) : (
          rows.map((u) => (
            // SKMemberEntity .small: the display name in bodyBold, the real name after it, presence, status emoji
            <SKMemberEntity
              key={u.id}
              name={u.name || u.realName}
              displayName={u.realName && u.realName !== u.name ? u.realName : undefined}
              avatar={u.avatar}
              presence={u.presence === 'away' ? 'away' : 'active'}
              statusEmoji={u.statusEmoji}
              onSelected={() => pick(u.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ date

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const parseIso = (v: string | undefined) => {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})/.exec(v) : null
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}

/**
 * "Select a date": the DateTimePickerFeature a date field opens (ListRecordFeature.swift:490-538), the same sheet Block
 * Kit's date picker uses (src/blocks/sheets/DateTime.tsx draws it from testScreenshotDate@3x.png; this reuses its
 * classes): a native sheet sized to its content, "Select a date" (smallBodyBold) and "Done" (bodyBold highlight1),
 * UIKit's inline calendar tinted highlight1, then "Clear" (outlineDefault, medium) only when the field has a date
 * (showClearButton: initialDate != nil). Done saves the calendar's date (today, if none was set); swiping the sheet
 * away saves a day you tapped (.dismissed(date)); Clear empties the field (DateTimePickerInteractor.swift:60-140).
 *
 *   presentSheet('list-date-picker', { value, onPick: (iso | null) => … })
 */
export function ListDatePickerSheet({ sheetKey, value, onPick }: SheetProps & { value?: string; onPick?: (iso: string | null) => void }) {
  const sheet = useSheet()
  const initial = typeof value === 'string' ? parseIso(value) : undefined
  const [date, setDate] = useState<Date>(() => initial ?? new Date())
  const [month, setMonth] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1))
  /** the date the calendar last changed to, if it did (DateTimePickerInteractor.selectedDate) */
  const chosen = useRef<string | undefined>(initial ? isoDate(initial) : undefined)
  const finished = useRef(false)
  const closing = !!sheet?.closing
  useEffect(() => {
    if (!closing || finished.current) return
    finished.current = true
    if (chosen.current && chosen.current !== (initial && isoDate(initial))) onPick?.(chosen.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  const finish = (result: string | null) => {
    finished.current = true
    if (sheet) sheet.dismiss(() => onPick?.(result))
    else {
      useApp.getState().dismissSheet(sheetKey)
      onPick?.(result)
    }
  }
  const choose = (d: Date) => {
    setDate(d)
    chosen.current = isoDate(d)
  }

  const today = new Date()
  const cells: (number | null)[] = Array.from({ length: month.getDay() }, () => null)
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= count; d++) cells.push(d)
  // the month's weeks (testScreenshotDate@3x.png draws a five-week June with nothing under it)
  while (cells.length % 7) cells.push(null)
  const same = (d: number, ref: Date) => ref.getFullYear() === month.getFullYear() && ref.getMonth() === month.getMonth() && ref.getDate() === d
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))

  return (
    <div className="bk-datetime lr-date">
      <div className="bk-datetime__header">
        {/* select_a_date (yaml:16378) / done (yaml:5390) */}
        <span className="bk-datetime__title">Select a date</span>
        <button type="button" className="bk-datetime__done" onClick={() => finish(isoDate(date))} data-tap>
          Done
        </button>
      </div>
      <div className="bk-calendar">
        <div className="bk-calendar__head">
          <span className="bk-calendar__month">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
            <svg className="bk-calendar__chevron" width="9" height="15" viewBox="0 0 9 15" aria-hidden>
              <path d="M1.5 1.5 7.5 7.5l-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="bk-calendar__nav">
            <button type="button" aria-label="Previous Month" onClick={() => shift(-1)} data-tap>
              <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
                <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" aria-label="Next Month" onClick={() => shift(1)} data-tap>
              <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
                <path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        </div>
        <div className="bk-calendar__weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="bk-calendar__grid">
          {cells.map((d, i) =>
            d === null ? (
              <span key={i} className="bk-calendar__day is-empty" />
            ) : (
              <button
                key={i}
                type="button"
                className={['bk-calendar__day', same(d, date) && 'is-selected', same(d, today) && 'is-today'].filter(Boolean).join(' ')}
                aria-label={new Date(month.getFullYear(), month.getMonth(), d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                aria-pressed={same(d, date)}
                onClick={() => choose(new Date(month.getFullYear(), month.getMonth(), d))}
              >
                {d}
              </button>
            ),
          )}
        </div>
      </div>
      {/* clear (yaml:3871): an outline .medium SKButton as wide as the picker */}
      {initial && <SKButton title="Clear" buttonStyle="outlineDefault" size="medium" className="bk-button is-fill bk-datetime__clear" onClick={() => finish(null)} />}
    </div>
  )
}
