import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { Icon } from '../../../icons/Icon'
import { SKButton } from '../../../slackkit/SKButton'
import { SKCheckbox } from '../../../slackkit/SKCheckbox'
import { SKIconButton } from '../../../slackkit/SKIconButton'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { SKTokenView } from '../../../slackkit/SKTokenView'
import { SKBanner } from '../../../slackkit/SKBanner'
import { openMenu } from '../../sheets'
import { confirm } from '../../sheets/ui/Alert'
import { copyText, useDismissIfMissing } from '../../sheets/shared'
import type { SlackList, SlackListColumn, SlackListRow } from '../../../data/types'
import { canWrite, completedColumn, fieldColumns, formatListDate, nextSelectValue, primaryColumn } from './listModel'
import { choice } from './ListScreen'
import '../../sheets/ui/sheet-bar.css'
import './record.css'

// A list item (the record carousel, ListsRecordsCarousel → ListRecordFeature; spec canvas-lists-creation.md §3.3): a form
// sheet in a navigation controller — ✕ (svgClose), "Item" over the list's name in highlight1 with a chevron, the
// overflow — then an SKList: the primary field, the actions row (Complete · Add a comment) over a hairline, one section
// per field (an SKHeaderEntity with the field's name, then its row; checkboxes have no header) and "Add field"; previous
// / next with "N of M" at the bottom (ListsRecordsCarouselViewController.swift:118-221; ListRecordPresenter.swift:81-330,
// 474-503, 985-1040, 1347-1410, 1515-1690, 1969-2058; ListRecordBottomBarNavigationView.swift). Laid out as
// ListRecordFeatureSnapshotTests' iOS 26 renders measure (record.css). Fields edit as iOS edits them: text in the text
// editor, a select from its pull-down menu, a person from "Select User", a date from "Select a date", a checkbox in place.
// Every edit saves at once ("Edits to item saved.", with Undo); a new item (Add Item) is created by its first edit
// (ListRecordInteractor.swift:1940-1977).
//
//   presentSheet('list-record', { listId, rowId? })        no rowId: a new item

export function ListRecordSheet(props: SheetProps & { listId?: string; rowId?: string }) {
  const sheet = useSheet()
  const list = useApp((s) => (props.listId ? s.fx.lists?.[props.listId] : undefined))
  const [rowId, setRowId] = useState<string | undefined>(props.rowId)
  const [scrolled, setScrolled] = useState(false)
  const [titleShown, setTitleShown] = useState(false)
  const [toast, setToast] = useState<RecordToast | null>(null)
  useEffect(() => {
    if (!toast) return
    // shown for 4 s (Constants.toastDuration, ListRecordViewController.swift:20)
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])
  useDismissIfMissing(!list)
  if (!list) return null

  const isNew = !props.rowId
  const row = rowId ? list.rows.find((r) => r.id === rowId) : undefined
  const writable = canWrite(list)
  const primary = primaryColumn(list)
  const done = completedColumn(list)
  const index = row ? list.rows.indexOf(row) : -1
  const close = (then?: () => void) => {
    if (sheet) sheet.dismiss(then)
    else {
      useApp.getState().dismissSheet(props.sheetKey)
      then?.()
    }
  }
  const notHere = () => useApp.getState().showToast('Not in the prototype')

  /** Saves one field; the first edit of a new item creates it. "Edits to item saved." with Undo for 4 s (edits_saved,
   *  yaml:5700; the record's own update toast, ListRecordViewController.swift:20, 27-50, 176-183, 280-282, 365-380). */
  const set = (column: SlackListColumn, value: string | null) => {
    const s = useApp.getState()
    const current = rowId ? s.fx.lists?.[list.id]?.rows.find((r) => r.id === rowId) : undefined
    const prev = current?.cells[column.id] ?? null
    if ((prev ?? '') === (value ?? '')) return
    let id = rowId
    if (!id) {
      id = s.addListRow(list.id, value ? { [column.id]: value } : {})
      setRowId(id)
    } else s.setListCell(list.id, id, column.id, value)
    const target = id
    setToast({ id: Date.now(), text: 'Edits to item saved.', undo: () => useApp.getState().setListCell(list.id, target, column.id, prev) })
  }
  // view-only: "You can’t edit this field in Slack." in the same toast, .info with svgInfo (yaml:22724;
  // ListRecordViewController.swift:57)
  const guard = (fn: () => void) => () => (writable ? fn() : setToast({ id: Date.now(), text: 'You can’t edit this field in Slack.', info: true }))

  const editText = (column: SlackListColumn) =>
    useApp.getState().presentSheet('list-text-input', {
      title: column.name,
      text: row?.cells[column.id] ?? '',
      // list_record_untitled_item (yaml:10461) / text (yaml:19651) (ListRecordInteractor.swift:1566)
      placeholder: column === primary ? 'Untitled Item' : 'Text',
      // the primary field has the emoji and mention buttons, a rich text field the standard toolbar (:1568-1590)
      toolbar: column === primary ? 'primary' : 'standard',
      onDone: (text: string | null) => set(column, text),
    })

  const overflow = () =>
    // SlackListDataAdapter.swift:241-319: Copy Link, Delete Item (red) — Notify me, Share, Add to To-dos and Report aren't
    // in the prototype
    openMenu({
      anchor: document.querySelector('.ios-screen .lr [aria-label="Show more options"]'),
      sections: [
        {
          items: [
            {
              title: 'Copy Link', // copy_link (yaml:4391)
              icon: 'link',
              onSelect: () => {
                const fx = useApp.getState().fx
                copyText(`https://${fx.workspace.domain}.slack.com/lists/${fx.workspace.id}/${list.id}${rowId ? `?record_id=${rowId}` : ''}`)
                useApp.getState().showToast('Link copied', 'toast_checkmark') // copied_link (yaml:4325)
              },
            },
            ...(writable && rowId
              ? [
                  {
                    title: 'Delete Item', // lists_delete_item (yaml:10585)
                    icon: 'trash',
                    destructive: true,
                    onSelect: async () => {
                      // lists_delete_item, list_record_deletion_prompt (yaml:10451), yes_delete_record (yaml:22622)
                      // (SlackListDataAdapter.swift:115-136)
                      const ok = await confirm({ title: 'Delete Item', message: 'Are you sure you want to delete this item permanently?', confirm: 'Yes, Delete This Item', destructive: true })
                      if (ok) close(() => useApp.getState().deleteListRow(list.id, rowId))
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    })

  const isDone = !!done && row?.cells[done.id] === 'true'
  const title = primary ? row?.cells[primary.id] : undefined

  return (
    <div className={['lr', !writable && 'is-view-only', isNew && 'is-new'].filter(Boolean).join(' ')}>
      <div className={`sheet-bar lr__bar${scrolled ? ' is-scrolled' : ''}`}>
        <div className="sheet-bar__edge" />
        {/* svgClose, a11y_lists_exit_button (yaml:177) (ListRecordViewController.swift:289-291) */}
        <button type="button" className="sheet-bar__glass sheet-bar__close" aria-label="Close" onClick={() => close()} data-tap>
          <Icon name="close" size={20} />
        </button>
        <div className="sheet-bar__title lr__title-view">
          {/* "Item" (list_view_item_title, yaml:10478) / "New Item" (list_view_new_item_title, yaml:10484); the list's
              name below in caption highlight1 with .chevronRight (an icon-font glyph; caret_right is its SVG) — it goes
              back to the list (ListRecordPresenter.swift:2014-2048; ListRecordInteractor.swift:1665-1675) */}
          <SKNavigationTitle title={isNew ? 'New Item' : 'Item'} subtitle={list.title} rightSubtitleOrnament={{ icon: 'caret_right' }} className="lr__navtitle" onSelected={() => close()} />
        </div>
        {/* the overflow: the icon font's ellipsis, contentSecondary (ListsRecordsCarouselViewController.swift:118-147) */}
        <button type="button" className="sheet-bar__glass lr__more" aria-label="Show more options" onClick={overflow} data-tap>
          <Icon name="ellipsis_horizontal_filled" size={20} color="var(--dt_color_content_secondary)" />
        </button>
      </div>
      <div className="lr__body">
      <div
        className="lr__scroll ios-scroll"
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop
          setScrolled(top > 0)
          // the bottom bar shows the item's title once its row has gone under the bar (toggleTitle,
          // ListRecordBottomBarNavigationView.swift:39-48)
          const primaryRow = e.currentTarget.querySelector('.lr__section--primary')
          setTitleShown(!!primaryRow && primaryRow.getBoundingClientRect().bottom <= e.currentTarget.getBoundingClientRect().top + 60)
        }}
        data-sheet-scroll
      >
        {/* the primary field: bodyBold contentPrimary, any number of lines, no ornament; empty, "Untitled Item" in
            contentTertiary (ListRecordPresenter.swift:474-503) */}
        <section className="lr__section lr__section--primary">
          <SKGenericEntity
            primaryText={<span className={`lr__primary${title ? '' : ' is-empty'}`}>{title || 'Untitled Item'}</span>}
            primaryTextNumberOfLines={0}
            onSelected={guard(() => primary && editText(primary))}
            accessibilityLabel={primary?.name}
          />
        </section>
        <div className="lr__actions">
          {done && (
            // "Complete" / "Completed" (complete_title yaml:4033 / completed_title yaml:4055), svgCheckCircle(Filled);
            // completed: highlight2.base, highlight2.content, highlight2.outlineSecondary (ListRecordPresenter.swift:1393-1410)
            <SKButton
              title={isDone ? 'Completed' : 'Complete'}
              icon={isDone ? 'check_circle_filled' : 'check_circle'}
              buttonStyle="custom"
              customColors={
                isDone
                  ? { backgroundColor: 'var(--dt_color_base_highlight_2)', titleColor: 'var(--dt_color_content_highlight_2)', borderColor: 'var(--dt_color_outline_highlight_2_secondary)' }
                  : { backgroundColor: 'var(--dt_color_container_primary)', titleColor: 'var(--dt_color_content_primary)', borderColor: 'var(--dt_color_outline_tertiary)' }
              }
              size="medium"
              className="lr__action"
              onClick={guard(() => set(done, isDone ? null : 'true'))}
            />
          )}
          {/* "Add a comment" (add_a_comment, yaml:612), svgAddComment, on containerPrimary with an outlineTertiary border */}
          <SKButton
            title="Add a comment"
            icon="add_comment"
            buttonStyle="custom"
            customColors={{ backgroundColor: 'var(--dt_color_container_primary)', titleColor: 'var(--dt_color_content_primary)', borderColor: 'var(--dt_color_outline_tertiary)' }}
            size="medium"
            className="lr__action"
            onClick={notHere}
          />
        </div>
        {/* the actions section's footer: .hairlineDivider (8 pt, a 1 px outlineTertiary hairline at its bottom) */}
        <SKListFooter />
        {fieldColumns(list).map((c) => (
          <FieldSection key={c.id} list={list} column={c} row={row} onSet={(v) => set(c, v)} onEditText={() => editText(c)} guard={guard} />
        ))}
        {writable && !isNew && (
          <div className="lr__add-field">
            {/* "Add field" (lists_add_field, yaml:10542): the list's footer button, outlineDefault with svgPlus
                (ListRecordPresenter.swift:2052-2058) */}
            <SKButton title="Add field" icon="plus" buttonStyle="outlineDefault" size="medium" style={{ width: '100%' }} onClick={notHere} />
          </div>
        )}
      </div>
      {toast && (
        // 16 pt from the sides, 8 pt above the bottom; genericDark with "Undo" (highlight1.contentInverse, toastButton), or
        // .info with svgInfo in sk_highlight_accent (ListRecordViewController.swift:27-58, 280-282)
        <div className="lr__toast" key={toast.id}>
          <SKBanner
            type="regular"
            tone={toast.info ? 'info' : 'genericDark'}
            text={toast.text}
            ornament={toast.info ? { icon: 'info', color: 'var(--sk_highlight_accent)' } : 'hidden'}
            accessories={
              toast.undo
                ? [
                    {
                      button: {
                        title: 'Undo', // undo (yaml:21007)
                        buttonStyle: 'custom',
                        customColors: { backgroundColor: 'transparent', titleColor: 'var(--dt_color_content_inverse_highlight_1)', borderColor: 'transparent' },
                        size: 'toastButton',
                        onClick: () => {
                          toast.undo?.()
                          setToast(null)
                        },
                      },
                    },
                  ]
                : undefined
            }
          />
        </div>
      )}
      {!writable && (
        <div className="lr__banner">
          {/* "View only" (view_only, yaml:21727): 12 pt from the sides, 16 pt above the bottom (ListRecordViewController.swift:261, 283) */}
          <SKBanner type="regular" tone="genericLight" ornament="hidden" text="View only" />
        </div>
      )}
      </div>
      {!isNew && row && (
        // previous / next: SKIconButton .small, .chevronMediumLeft / Right (icon-font glyphs; caret_left / caret_right are
        // their SVGs) in contentPrimary on a surfacePrimary circle; "N of M" in captionBold (tutorial_a11y_previous /
        // _next) (ListRecordBottomBarNavigationView.swift:28-33, 125-162)
        <div className="lr__bottom">
          <SKIconButton icon="caret_left" backdrop={NAV_BACKDROP} interactionState={index > 0 ? 'enabled' : 'disabled'} accessibilityLabel="Previous" onClick={() => setRowId(list.rows[index - 1]?.id)} />
          <span className="lr__count">
            <span className="lr__count-position">
              {index + 1} of {list.rows.length}
            </span>
            {titleShown && <span className="lr__count-title">{title || 'Untitled Item'}</span>}
          </span>
          <SKIconButton icon="caret_right" backdrop={NAV_BACKDROP} interactionState={index < list.rows.length - 1 ? 'enabled' : 'disabled'} accessibilityLabel="Next" onClick={() => setRowId(list.rows[index + 1]?.id)} />
        </div>
      )}
    </div>
  )
}

type RecordToast = { id: number; text: string; undo?: () => void; info?: boolean }

/** the bottom bar's circles: surfacePrimary, pressed darkened by 20 % */
const NAV_BACKDROP = { unselected: 'var(--dt_color_surface_primary)', selected: 'rgb(from var(--dt_color_surface_primary) calc(r * 0.8) calc(g * 0.8) calc(b * 0.8) / alpha)' }

/** A placeholder as the empty rows draw it: an icon in the 24 pt ornament box, 12 pt, the word. */
const Placeholder = ({ icon, children, className }: { icon: string; children: ReactNode; className?: string }) => (
  <span className={`lr__placeholder${className ? ` ${className}` : ''}`}>
    <span className="lr__placeholder-icon">
      <Icon name={icon} size={20} />
    </span>
    <span>{children}</span>
  </span>
)

/** One field: its SKHeaderEntity (the field's name; none for checkboxes) and its row. */
function FieldSection({ list, column, row, onSet, onEditText, guard }: { list: SlackList; column: SlackListColumn; row?: SlackListRow; onSet: (v: string | null) => void; onEditText: () => void; guard: (fn: () => void) => () => void }) {
  const users = useApp((s) => s.fx.users)
  const value = row?.cells[column.id]
  if (column.type === 'checkbox') {
    // no header: an SKCheckbox (21 pt) in a 24 pt box at x 16, the field's name in body contentPrimary at x 52
    // (ListRecordCheckboxInputRow.swift:58-70; testWithCheckboxRow@3x.png)
    const on = value === 'true'
    return (
      <section className="lr__section">
        <div className="lr__checkbox" role="button" onClick={guard(() => onSet(on ? null : 'true'))} data-tap>
          <span className="lr__checkbox-box" onClick={(e) => e.stopPropagation()}>
            <SKCheckbox isOn={on} isEnabled={canWrite(list)} onToggled={(v) => onSet(v ? 'true' : null)} accessibilityLabel={column.name} />
          </span>
          <span className="lr__checkbox-label">{column.name}</span>
        </div>
      </section>
    )
  }
  let content: ReactNode
  switch (column.type) {
    case 'select': {
      const opt = column.options?.find((o) => o.id === value)
      // the native pull-down menu: a choice circle (_70 ring, _20 fill) per option, a checkmark on the current one;
      // picking it again clears it (ListRecordPresenter.swift:1642-1690)
      const open = () =>
        openMenu({
          anchor: document.querySelector(`.ios-screen .lr [data-field="${column.id}"]`),
          sections: [
            {
              items: (column.options ?? []).map((o) => ({
                title: o.label,
                checked: o.id === value,
                icon: { node: <span className="lr__choice-circle" style={{ borderColor: choice(o.color, 70), background: choice(o.color, 20) }} /> },
                onSelect: () => onSet(nextSelectValue(value, o.id)),
              })),
            },
          ],
        })
      content = (
        // a token in the choice's colors (_0 fill, _70 text), or "Select" with svgCaretDropdown in contentTertiary
        // (ListRecordFieldUIMapper.swift:107-157)
        <div className="lr__tokens" role="button" data-field={column.id} onClick={guard(open)} data-tap>
          {opt ? <SKTokenView text={opt.label} tone={{ tokenBackgroundColor: choice(opt.color, 0), textColor: choice(opt.color, 70) }} /> : <Placeholder icon="caret_dropdown" className="is-select">Select</Placeholder>}
        </div>
      )
      break
    }
    case 'person': {
      const u = value ? users[value] : undefined
      content = (
        // the person's token: their avatar, the name in bodyBold lagoon _70 on the default fill; empty, "Person" (person,
        // yaml:13879) with the people icon in contentTertiary (ListRecordPresenter.swift:995-1022;
        // ListRecordFieldUIMapper.swift:159-190)
        <div className="lr__tokens" role="button" onClick={guard(() => useApp.getState().presentSheet('list-person-picker', { onPick: (id: string | null) => onSet(id) }))} data-tap>
          {u ? (
            <SKTokenView
              ornament={{ member: { src: u.avatar } }}
              text={u.name || u.realName}
              tone={{ tokenBackgroundColor: 'var(--dt_color_base_highlight_1)', ornamentBackgroundColor: 'var(--dt_color_surface_highlight_1)', textColor: 'var(--dt_color_palettes_lagoon_70)' }}
            />
          ) : (
            <Placeholder icon="user_groups">Person</Placeholder>
          )}
        </div>
      )
      break
    }
    case 'date':
      content = (
        // SKGenericEntity .small: the calendar in a clear ornament box, the date (or "Date", date yaml:4802) and
        // svgCaretDown in contentPrimary, empty in contentTertiary (ListRecordPresenter.swift:1515-1636, 1977-1981)
        <SKGenericEntity
          primaryText={
            <span className={`lr__date${value ? '' : ' is-empty'}`}>
              {value ? formatListDate(value) : 'Date'}
              <Icon name="caret_down" size={16} />
            </span>
          }
          ornament={<span className={`lr__date-icon${value ? '' : ' is-empty'}`}><Icon name="calendar" size={20} /></span>}
          onSelected={guard(() => useApp.getState().presentSheet('list-date-picker', { value, onPick: (iso: string | null) => onSet(iso) }))}
          accessibilityLabel={column.name}
        />
      )
      break
    default:
      content = (
        // SKGenericEntity .small: the text in body contentSecondary, any number of lines; empty, svgTextSnippet and
        // "Text" (text, yaml:19651) in contentSecondary (ListRecordPresenter.swift:474-503)
        <SKGenericEntity
          primaryText={value ? <span className="lr__text">{value}</span> : <span className="lr__text">Text</span>}
          primaryTextNumberOfLines={0}
          ornament={value ? undefined : <span className="lr__text-icon"><Icon name="text_snippet" size={20} /></span>}
          onSelected={guard(onEditText)}
          accessibilityLabel={column.name}
        />
      )
  }
  return (
    <section className="lr__section">
      {/* SKHeaderEntity .medium: the field's name in smallBodyBold (ListRecordPresenter.swift:292-302) */}
      <div className="lr__header" role="heading" aria-level={3}>
        {column.name}
      </div>
      {content}
    </section>
  )
}
