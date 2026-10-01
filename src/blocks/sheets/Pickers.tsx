import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../app/store'
import { useSheet } from '../../app/nav/SheetHost'
import { Icon } from '../../icons/Icon'
import { SKCheckbox, SKMemberAvatar, SKSearchBar } from '../../slackkit'
import type { Conversation } from '../../data/types'
import { BKInline } from '../text'
import { textOf } from '../format'
import { settle } from '../present'
import type { ConversationFilter, OptionGroupObject, OptionObject } from '../types'
import { SheetNav } from './SheetNav'

// What selects open (spec blockkit.md §5.1–5.2; BlockPresentationRouter.swift:177-452; Modules/Features/OptionPicker):
//
//   bk-option-sheet   a static single select with ≤ 5 options, and overflow menus: Slack's bottom sheet (SKBottomSheet)
//                     of small rows, no title, no search; a tap picks and dismisses
//   bk-option-picker  everything else: a form sheet in a navigation controller, "Select Option(s)", Cancel, Done for
//                     multi selects, a search field (SKSearchBar, 12 / 16 margins, a 1 px sk_primary_foreground @25 %
//                     separator), rows with a trailing checkbox for multi, option groups as section headers
//   bk-entity-picker  users / conversations / channels selects: the same, with people and channel rows
//
// Rows are SKGenericEntity .small in an SKList: 10 / 16 padding, Lato 17 content_primary, pressed = a base_tertiary
// highlight inset 4 pt with radius 12 (OptionPickerPresenter.swift:147-186; spec sheets-menus.md §0.3).

type Props = { sheetKey: string; resultId?: string }

/** Settles null when the sheet starts closing without an answer (swiped away, tapped outside, Cancel). */
function useCancelOnClose(resultId: string | undefined) {
  const sheet = useSheet()
  const closing = !!sheet?.closing
  useEffect(() => {
    if (closing) settle(resultId, null)
  }, [closing, resultId])
}

function finish(sheet: ReturnType<typeof useSheet>, sheetKey: string, resultId: string | undefined, value: unknown) {
  settle(resultId, value)
  if (sheet) sheet.dismiss()
  else useApp.getState().dismissSheet(sheetKey)
}

/** A small generic row: the text (and, for multi selects, a checkbox) with the list's pressed highlight. */
function OptionRow({ children, onClick, accessory, ornament, disabled }: { children: ReactNode; onClick: () => void; accessory?: ReactNode; ornament?: ReactNode; disabled?: boolean }) {
  return (
    <div className={['bk-option-row', disabled && 'is-disabled'].filter(Boolean).join(' ')} role="button" data-tap={disabled ? undefined : ''} onClick={disabled ? undefined : onClick}>
      <div className="bk-option-row__bg" />
      <div className="bk-option-row__content">
        {ornament && <span className="bk-option-row__ornament">{ornament}</span>}
        <span className="bk-option-row__text">{children}</span>
        {accessory && <span className="bk-option-row__accessory">{accessory}</span>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ bottom sheet

export function OptionSheet({ sheetKey, resultId, options = [], groups }: Props & { options?: OptionObject[]; groups?: OptionGroupObject[] }) {
  const sheet = useSheet()
  useCancelOnClose(resultId)
  const all = groups?.length ? groups.flatMap((g) => g.options ?? []) : options
  return (
    <div className="bk-option-sheet" role="listbox">
      {all.map((o, i) => (
        <OptionRow key={`${o.value}-${i}`} onClick={() => finish(sheet, sheetKey, resultId, [o])}>
          <BKInline text={o.text} />
        </OptionRow>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ full-screen picker

const matches = (label: string, q: string) => label.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())

/** Empty states (OptionPickerPresenter.swift:85-117; strings no_option_found, no_option_matches_keywords, clear_search). */
function EmptyState({ title, body, onClear }: { title?: string; body?: string; onClear?: () => void }) {
  return (
    <div className="bk-picker-empty">
      {title && <div className="bk-picker-empty__title">{title}</div>}
      {body && <div className="bk-picker-empty__body">{body}</div>}
      {onClear && (
        <button type="button" className="bk-picker-empty__button" onClick={onClear} data-tap>
          Clear search
        </button>
      )}
    </div>
  )
}

export function OptionPicker({
  sheetKey,
  resultId,
  options = [],
  groups,
  multi,
  selected = [],
  title,
  search = true,
  minQueryLength = 0,
  maxSelected,
}: Props & { options?: OptionObject[]; groups?: OptionGroupObject[]; multi?: boolean; selected?: string[]; title?: string; search?: boolean; minQueryLength?: number; maxSelected?: number }) {
  const sheet = useSheet()
  useCancelOnClose(resultId)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string[]>(selected)
  const sections = useMemo(() => (groups?.length ? groups.map((g) => ({ label: textOf(g.label), options: g.options ?? [] })) : [{ label: '', options }]), [groups, options])
  const all = sections.flatMap((s) => s.options)
  const waiting = minQueryLength > 0 && query.trim().length < minQueryLength
  const shown = sections.map((s) => ({ ...s, options: s.options.filter((o) => !query.trim() || matches(textOf(o.text), query)) })).filter((s) => s.options.length)
  const atMax = maxSelected !== undefined && chosen.length >= maxSelected
  const toggle = (o: OptionObject) => setChosen((c) => (c.includes(o.value) ? c.filter((v) => v !== o.value) : atMax ? c : [...c, o.value]))

  return (
    <div className="bk-picker">
      {/* left .text(cancel, .standard), right .text(done, .done) for multi-selects only (BlockPresentationRouter.swift:269,
          283, 317, 333): plain UIBarButtonItem(title:style:) with no title attributes, UIKit's 17 pt system font in the
          bar tint (OptionPickerViewController.swift:101-111, 262-263; SLAppearance.swift:36); title Lato Bold 17
          (September 2026 lines) */}
      <SheetNav
        title={title}
        titleFont="nav"
        leading={{ label: 'Cancel', font: 'system', onClick: () => finish(sheet, sheetKey, resultId, null) }}
        trailing={multi ? { label: 'Done', done: true, font: 'system', onClick: () => finish(sheet, sheetKey, resultId, all.filter((o) => chosen.includes(o.value))) } : null}
      />
      {search && (
        <div className="bk-picker__search">
          {/* "Search" (search, yaml:16105) */}
          <SKSearchBar text={query} placeholderText="Search" onTextChanged={setQuery} />
        </div>
      )}
      {search && <div className="bk-picker__separator" />}
      <div className="bk-picker__list ios-scroll" data-sheet-scroll>
        {multi && atMax && <div className="bk-picker__max">You have reached the maximum number of selections</div>}
        {waiting ? (
          // start_typing_to_see_results (yaml:19182)
          <EmptyState body="Start typing to see results." />
        ) : !all.length ? (
          <EmptyState title="No option found" />
        ) : !shown.length ? (
          <EmptyState title="No option found" body="No option matches these keywords." onClear={() => setQuery('')} />
        ) : (
          shown.map((s, i) => (
            <div key={i} className="bk-picker__section">
              {s.label && <div className="bk-picker__header">{s.label}</div>}
              {s.options.map((o, j) => {
                const on = chosen.includes(o.value)
                return (
                  <OptionRow key={`${o.value}-${j}`} onClick={() => (multi ? toggle(o) : finish(sheet, sheetKey, resultId, [o]))} accessory={multi ? <SKCheckbox isOn={on} className="bk-option-row__checkbox" /> : undefined}>
                    <BKInline text={o.text} />
                  </OptionRow>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ people and channels

type EntityKind = 'users' | 'channels' | 'conversations'

/** A conversation passes the select's `filter` (include, exclude_bot_users, exclude_external_shared_channels). */
function passes(c: Conversation, filter: ConversationFilter | undefined, isBot: (id?: string) => boolean): boolean {
  const kind = c.type === 'channel' ? 'public' : c.type === 'private' ? 'private' : c.type === 'mpim' ? 'mpim' : 'im'
  if (filter?.include?.length && !filter.include.includes(kind as 'im')) return false
  if (filter?.exclude_bot_users && (c.type === 'im' || c.type === 'app') && isBot(c.userId)) return false
  return true
}

export function EntityPicker({ sheetKey, resultId, kind = 'users', multi, selected = [], filter, maxSelected }: Props & { kind?: EntityKind; multi?: boolean; selected?: string[]; filter?: ConversationFilter; maxSelected?: number }) {
  const sheet = useSheet()
  useCancelOnClose(resultId)
  const fx = useApp((s) => s.fx)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string[]>(selected)
  const input = useRef<HTMLDivElement>(null)
  const noun = kind === 'users' ? 'User' : kind === 'channels' ? 'Channel' : 'Conversation'
  // select_user(s) / select_channel(s) / select_conversation(s) (yaml:16404-16437)
  const title = `Select ${noun}${multi ? 's' : ''}`
  const isBot = (id?: string) => !!(id && (fx.users[id]?.isApp || fx.users[id]?.isBot))

  const rows = useMemo(() => {
    if (kind === 'users')
      return Object.values(fx.users)
        .filter((u) => !u.isBot)
        .sort((a, b) => (a.id === fx.me ? -1 : b.id === fx.me ? 1 : a.realName.localeCompare(b.realName)))
        .map((u) => ({ id: u.id, label: u.realName, secondary: u.name !== u.realName ? u.name : undefined, avatar: u.avatar, presence: u.presence, me: u.id === fx.me }))
    const convs = Object.values(fx.conversations).filter((c) => (kind === 'channels' ? c.type === 'channel' || c.type === 'private' : true)).filter((c) => passes(c, filter, isBot))
    return convs
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, label: c.type === 'im' || c.type === 'app' ? (fx.users[c.userId ?? '']?.realName ?? c.name) : c.name, conv: c, avatar: c.type === 'im' || c.type === 'app' ? fx.users[c.userId ?? '']?.avatar : undefined }))
  }, [fx, kind, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = rows.filter((r) => !query.trim() || matches(r.label, query) || ('secondary' in r && r.secondary && matches(r.secondary, query)))
  const atMax = maxSelected !== undefined && chosen.length >= maxSelected
  const pick = (id: string) => {
    if (!multi) return finish(sheet, sheetKey, resultId, [id])
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : atMax ? c : [...c, id]))
  }

  return (
    <div className="bk-picker" ref={input}>
      {/* both items .title(_, .default), SKBarButtonItem titles: Lato Bold 17 in highlight1, plain on iOS 26
          (BlockPresentationRouter.swift:408, 419; UserConversationPickerDataTypes.swift:131-134; SKBarButtonItem.swift:
          58-61); the title Lato Bold 17 (UserConversationPickerViewController.swift:145-146; September 2026 lines) */}
      <SheetNav
        title={title}
        titleFont="nav"
        leading={{ label: 'Cancel', font: 'bold', onClick: () => finish(sheet, sheetKey, resultId, null) }}
        trailing={multi ? { label: 'Done', font: 'bold', onClick: () => finish(sheet, sheetKey, resultId, chosen) } : null}
      />
      <div className="bk-picker__search">
        <SKSearchBar text={query} placeholderText="Search" onTextChanged={setQuery} />
      </div>
      <div className="bk-picker__separator" />
      <div className="bk-picker__list ios-scroll" data-sheet-scroll>
        {!shown.length ? (
          // no_user_found / no_channel_found / no_conversation_found; "No user matches these keywords."
          <EmptyState title={`No ${noun.toLowerCase()} found`} body={query ? `No ${noun.toLowerCase()} matches these keywords.` : undefined} onClear={query ? () => setQuery('') : undefined} />
        ) : (
          shown.map((r) => {
            const conv = 'conv' in r ? r.conv : undefined
            const ornament =
              kind === 'users' || r.avatar ? (
                <SKMemberAvatar src={r.avatar} name={r.label} size={24} presence={'presence' in r ? r.presence : 'none'} />
              ) : (
                <Icon name={conv?.type === 'private' ? 'lock' : conv?.type === 'mpim' ? 'direct_messages' : 'channel'} size={20} />
              )
            return (
              <OptionRow key={r.id} ornament={ornament} onClick={() => pick(r.id)} accessory={multi ? <SKCheckbox isOn={chosen.includes(r.id)} className="bk-option-row__checkbox" /> : undefined}>
                <span className="bk-option-row__name">{r.label}</span>
                {'me' in r && r.me && <span className="bk-option-row__secondary"> (you)</span>}
              </OptionRow>
            )
          })
        )}
      </div>
    </div>
  )
}
