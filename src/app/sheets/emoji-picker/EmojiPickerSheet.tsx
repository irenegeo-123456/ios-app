import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { CUSTOM_EMOJI, EMOJI, SKIN_TONES, emojiSrc, findEmoji, type EmojiEntry } from '../../../emoji/Emoji'
import keywords from '../../../emoji/emoji-keywords.json'
import { useLongPress } from '../../gestures'
import { openMenu } from '../ui/Menu'
import { frequentEmoji } from '../shared'
import { SKIconButton } from '../../../slackkit/SKIconButton'
import './emoji-picker.css'

// The emoji picker (spec sheets-menus.md §2; EP/ = Modules/Features/EmojiPicker/Implementation/EmoijPicker/). A search
// bar with an add-emoji button over a 1 px rule, then the grid in sections with sticky headers — Frequently Used (21),
// the standard categories, Custom — and the category bar pinned to the bottom. Searching turns the grid into a list.
// September 2026 (iOS 26): the add-emoji button is a Liquid Glass circle and the category bar a bordered capsule.
// Picking an emoji reacts to the message it was opened for (toggleReaction), or hands it to `onPick`, and dismisses.
// Long-pressing an emoji that has skin tones offers them in a popover.

interface Props {
  sheetKey: string
  conversationId?: string
  ts?: string
  onPick?: (name: string) => void
}

/** EmojiCategory order (EmojiCategory.swift:33-45) and titles (EmojiCategory+LocalizedTitle.swift:10-35) with the
 *  category bar's glyphs as their SVG equivalents (SKIconManifest+SVGMapping.swift; Objects, Symbols and Custom have no
 *  mapping, so the nearest SVGs: emoji_objects, emoji_symbols, and Slack's hash when Custom is selected). The emoji
 *  data's categories: 0 people, 2 nature, 3 food, 4 travel, 5 activities, 6 objects, 7 symbols, 8 flags, 9 custom. */
const CATEGORIES = [
  { id: 'frequent', title: 'Frequently Used', icon: 'clock', data: -2 },
  { id: 'people', title: 'Smileys & People', icon: 'emoji_filled', data: 0 },
  { id: 'nature', title: 'Animals & Nature', icon: 'emoji_nature', data: 2 },
  { id: 'food', title: 'Food & Drink', icon: 'emoji_food', data: 3 },
  { id: 'activities', title: 'Activities', icon: 'emoji_activities', data: 5 },
  { id: 'travel', title: 'Travel & Places', icon: 'emoji_travel', data: 4 },
  { id: 'objects', title: 'Objects', icon: 'emoji_objects', data: 6 },
  { id: 'symbols', title: 'Symbols', icon: 'emoji_symbols', data: 7 },
  { id: 'flags', title: 'Flags', icon: 'emoji_flag', data: 8 },
  { id: 'custom', title: 'Custom', icon: 'slack_logo', data: 9 },
] as const

/** EmojiGridViewModel.swift:157-169: 21 frequently used on iPhone */
const FREQUENT_COUNT = 21
const KEYWORDS = keywords as Record<string, string[]>

export function EmojiPickerSheet({ conversationId, ts, onPick }: Props) {
  const sheet = useSheet()
  const s = useApp()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(0)
  const [tones, setTones] = useState<{ entry: EmojiEntry; rect: DOMRect } | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const addButton = useRef<HTMLSpanElement>(null)

  const sections = useMemo(() => {
    const freq = frequentEmoji(s, FREQUENT_COUNT)
      .map((n) => findEmoji(n))
      .filter((e): e is EmojiEntry => !!e)
    return CATEGORIES.map((c) => ({ ...c, emoji: c.data === -2 ? freq : c.data === 9 ? CUSTOM_EMOJI : EMOJI.filter((e) => e.c === c.data) }))
  }, [s])

  const results = useMemo(() => (query.trim() ? search(query.trim().toLowerCase()) : []), [query])

  const pick = (name: string) => {
    // selection haptic, then the picker dismisses and returns the emoji (EmojiPickerViewController.swift:349-352)
    if (conversationId && ts) useApp.getState().toggleReaction(conversationId, ts, name)
    else onPick?.(name)
    setTones(null)
    sheet?.dismiss()
  }

  // Scrolling the grid moves the category bar's selection (EmojiPickerViewController.swift:467-513).
  const onScroll = () => {
    const el = grid.current
    if (!el) return
    const heads = [...el.querySelectorAll<HTMLElement>('[data-section]')]
    let i = 0
    for (let k = 0; k < heads.length; k++) if (heads[k].offsetTop - el.scrollTop <= 8) i = k
    if (i !== selected) setSelected(i)
  }
  const jump = (i: number) => {
    // jumps without animation and expands the sheet to its long form (§2.4)
    sheet?.expand()
    const el = grid.current
    const head = el?.querySelectorAll<HTMLElement>('[data-section]')[i]
    if (el && head) el.scrollTop = head.offsetTop
    setSelected(i)
  }

  const startSearch = () => {
    setSearching(true)
    sheet?.expand()
  }
  const cancelSearch = () => {
    setQuery('')
    setSearching(false)
    input.current?.blur()
  }

  return (
    <div className={`ep${searching ? ' is-searching' : ''}`} data-qa="emoji_picker">
      <div className="ep-header">
        <div className="ep-searchbar">
          <label className="ep-field">
            <MagnifyingGlass />
            <input
              ref={input}
              className="ep-field__input"
              placeholder="Search all emoji"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={startSearch}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-label="Search all emoji"
            />
            {query && (
              <button type="button" className="ep-field__clear" aria-label="Clear text" onClick={() => setQuery('')}>
                <ClearGlyph />
              </button>
            )}
          </label>
          {searching && (
            <button type="button" className="ep-cancel" onClick={cancelSearch}>
              Cancel
            </button>
          )}
        </div>
        {/* SKIconButton(useGlassEffect: true), .small constrained to 36 × 36: svgPlus in contentSecondary on a glass circle
            tinted surfacePrimary, surfaceSecondary while pressed (EmojiPickerViewController.swift:113-152, September
            2026; June: a solid baseSecondary circle). On iOS a tap opens the photo library and a long press the "Add
            Emoji" menu (add_emoji): Photo Library, Take Photo, Image Playground (EmojiListPresentable.swift:235-270);
            the prototype has no photo library, so a tap shows the menu. */}
        <span className="ep-add" ref={addButton}>
          <SKIconButton
            icon="plus"
            iconColor="var(--dt_color_content_secondary)"
            backdrop={{ unselected: 'var(--dt_color_surface_primary)', selected: 'var(--dt_color_surface_secondary)' }}
            useGlassEffect
            accessibilityLabel="Add custom emoji"
            style={{ ['--ib-size' as string]: '36px' } as CSSProperties}
            onClick={() =>
              openMenu({
                anchor: addButton.current,
                title: 'Add Emoji',
                sections: [
                  {
                    items: [
                      { title: 'Photo Library', icon: 'image' },
                      { title: 'Take Photo', icon: 'camera' },
                      { title: 'Image Playground', icon: 'brand_apple_intelligence' },
                    ],
                  },
                ],
              })
            }
          />
        </span>
      </div>
      <div className="ep-rule" />
      <div className="ep-body">
        <div className="ep-grid ios-scroll" ref={grid} onScroll={onScroll} onPointerDown={() => input.current?.blur()}>
          {sections.map((sec) =>
            sec.emoji.length ? (
              <section key={sec.id} className="ep-section" aria-label={sec.title}>
                <div className="ep-section__header" data-section={sec.id}>
                  {sec.title}
                </div>
                <div className="ep-section__grid">
                  {sec.emoji.map((e) => (
                    <GridCell key={e.n[0]} entry={e} onPick={pick} onTones={(rect) => setTones({ entry: e, rect })} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
        {searching && (
          <div className="ep-results ios-scroll">
            {query.trim() && results.length === 0 ? (
              <div className="ep-empty">{`No emoji results found for\n"${query.trim()}"`}</div>
            ) : (
              results.map((e) => (
                <button key={e.n[0]} type="button" className="ep-result" onClick={() => pick(e.n[0])} data-tap>
                  <span className="ep-result__bg" />
                  <img className="ep-result__emoji" src={emojiSrc(e.u)} alt="" draggable={false} />
                  <span className="ep-result__name">{e.n[0]}</span>
                </button>
              ))
            )}
          </div>
        )}
        {!searching && (
          <div className="ep-bar" role="tablist" aria-label="Emoji categories">
            <div className="ep-bar__control" style={{ ['--count' as string]: sections.length, ['--sel' as string]: selected } as CSSProperties}>
              <span className="ep-bar__thumb" />
              {sections.map((sec, i) => (
                <button key={sec.id} type="button" role="tab" aria-selected={i === selected} aria-label={sec.title} className={`ep-bar__segment${i === selected ? ' is-selected' : ''}`} onClick={() => jump(i)}>
                  {sec.id === 'custom' && i === selected ? <Icon name="slack_logo_color" size={20} /> : <Icon name={sec.icon} size={20} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {tones && <SkinTones entry={tones.entry} rect={tones.rect} onPick={pick} onClose={() => setTones(null)} />}
    </div>
  )
}

function GridCell({ entry, onPick, onTones }: { entry: EmojiEntry; onPick: (name: string) => void; onTones: (rect: DOMRect) => void }) {
  // Long press on an emoji with skin tones: medium impact haptic, then the tone popover (EmojiGridViewController.swift:267-299).
  const lp = useLongPress((el) => entry.s && onTones(el.getBoundingClientRect()))
  return (
    <button type="button" className="ep-cell" aria-label={entry.n[0].replace(/_/g, ' ')} onClick={() => onPick(entry.n[0])} data-tap {...(entry.s ? lp : {})}>
      <span className="ep-cell__press" />
      <img className="ep-cell__emoji" src={emojiSrc(entry.u)} alt="" loading="lazy" draggable={false} />
    </button>
  )
}

/** Single-person skin tones: a 270 × 50 popover — the default tone, a 1 × 32 rule, the five tones, 36 pt each, 10 apart
 *  around the rule (ST/SkinToneSelection/SingleSkinTonePickerViewController.swift:17-43,58-99). */
function SkinTones({ entry, rect, onPick, onClose }: { entry: EmojiEntry; rect: DOMRect; onPick: (name: string) => void; onClose: () => void }) {
  const layer = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useEffect(() => {
    const host = layer.current?.parentElement
    if (!host) return
    const b = host.getBoundingClientRect()
    const scale = b.width / host.offsetWidth || 1
    const cx = (rect.left + rect.width / 2 - b.left) / scale
    const top = (rect.top - b.top) / scale - 50 - 8
    setPos({ left: Math.max(8, Math.min(host.offsetWidth - 278, cx - 135)), top: Math.max(8, top) })
  }, [rect])
  const toned = Object.entries(SKIN_TONES)
  return (
    <div className="ep-tones-layer" ref={layer} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      {pos && (
        <div className="ep-tones" style={pos} role="dialog" aria-label="Skin tones">
          <button type="button" className="ep-tone" onClick={() => onPick(entry.n[0])} data-tap>
            <img src={emojiSrc(entry.u)} alt="" draggable={false} />
          </button>
          <span className="ep-tones__rule" />
          {toned.map(([n, t]) => (
            <button key={n} type="button" className="ep-tone" aria-label={`${t.label} skin tone`} onClick={() => onPick(`${entry.n[0]}::skin-tone-${n}`)} data-tap>
              <img src={emojiSrc(entry.s?.[t.code] ?? entry.u)} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Names that start with the query, then names containing it, then keyword matches. */
function search(q: string): EmojiEntry[] {
  const all = EMOJI.filter((e) => e.c !== -1)
  const starts: EmojiEntry[] = []
  const contains: EmojiEntry[] = []
  const keyword: EmojiEntry[] = []
  for (const e of all) {
    if (e.n.some((n) => n.startsWith(q))) starts.push(e)
    else if (e.n.some((n) => n.includes(q))) contains.push(e)
    else if ((KEYWORDS[e.n[0]] ?? []).some((k) => k.startsWith(q))) keyword.push(e)
  }
  return [...starts, ...contains, ...keyword].slice(0, 200)
}

/** SF Symbols magnifyingglass, as UISearchTextField draws it. */
const MagnifyingGlass = () => (
  <svg className="ep-field__glass" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="6.8" cy="6.8" r="5.3" stroke="currentColor" strokeWidth="1.7" />
    <path d="m10.8 10.8 3.9 3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

/** SF Symbols xmark.circle.fill: the text field's clear button. */
const ClearGlyph = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden>
    <circle cx="8.5" cy="8.5" r="8.5" fill="currentColor" />
    <path d="m5.6 5.6 5.8 5.8m0-5.8-5.8 5.8" stroke="var(--dt_color_base_primary)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
