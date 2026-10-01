import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, type Route } from '../../store'
import { GlassButton, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { SKBadge } from '../../../slackkit/SKBadge'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKPillButton } from '../../../slackkit/SKPillButton'
import { confirm, openMenu } from '../../sheets'
import { copyText } from '../../sheets/shared'
import { showBanner, toast } from '../../ui/Toast'
import type { SlackList, SlackListColumn, SlackListRow } from '../../../data/types'
import { canWrite, completedColumn, formatListDate, groupsOf, primaryColumn } from './listModel'
import './lists.css'

// A Slack List on a phone (ListViewRoute → ListViewViewController hosting the kanban ListItemsView; spec
// search-slackbot-huddles.md §4.5, canvas-lists-creation.md §3): groups stacked vertically, grouped by the list's first
// select column. Each group: a header (the choice in smallBodyBold, a count badge tinted with the choice color, the
// caret_down_full collapse toggle), then the record cards (radius 12, 1 pt outlineTertiary, the primary column in
// bodyBlack up to 2 lines, then the fields as 26 pt tokens), then a full-width hairline divider. Laid out as
// testTodosGroupedBySelect@3x.png measures. The nav bar is an SKNavigationTitle (the list's title, its channel as the
// subtitle) and the overflow button (ListViewViewController.swift:309, 370-377; ListViewPresenter.swift:113-139).
//
// Editing, as iOS allows on a phone: a to-do list's cards lead with their completed checkbox (ListKanbanCheckbox);
// tapping a card opens the item (the record sheet: its fields edit there); "Add Item" floats bottom-right
// (ListViewPresenter.swift:159-178). View-only lists (`access: 'view'`) show "View only" instead.
//
//   push({ screen: 'list', listId })    or { fileId } / { id }

/** ColumnOptions.ChoiceColor raw values → their StandardPaletteColor (ChoiceOptions+Extensions.swift:12-26) */
const CHOICE_PALETTE: Record<string, string> = {
  gray: 'gray',
  brown: 'horchata',
  orange: 'honeycomb',
  yellow: 'sunflower',
  green: 'grass',
  blue: 'lagoon',
  indigo: 'indigo',
  purple: 'aubergine',
  pink: 'flamingo',
  red: 'tomato',
  cyan: 'jade',
}
/** a choice color's palette step as a token (_0 token fill, _5 badge fill, _20 circles, _70 text and icons:
 *  ChoiceOptions+Extensions.swift:28-51) */
export const choice = (color: string | undefined, step: 0 | 5 | 20 | 70) => `var(--dt_color_palettes_${CHOICE_PALETTE[color ?? 'gray'] ?? color ?? 'gray'}_${step})`

/** the checkbox's change is saved after a second, so it can draw first (ListKanbanRecordView.swift:93, 506-517) */
const SAVE_DELAY = 1000

export function ListScreen({ route }: { route: Route }) {
  const id = String(route.listId ?? route.fileId ?? route.id ?? '')
  const list = useApp((s) => s.fx.lists?.[id])
  const conversations = useApp((s) => s.fx.conversations)
  const showToast = useApp((s) => s.showToast)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [scrolled, setScrolled] = useState(false)
  /** "Request Edit Access" was tapped: the menu shows "Edit Access Requested", disabled (ListViewInteractor.swift:188, 1643-1653) */
  const [requested, setRequested] = useState(false)
  /** checkboxes ticked in the last second, drawn before they're saved */
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const timers = useRef<Record<string, number>>({})
  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), [])
  const { groups, grouping } = useMemo(() => (list ? groupsOf(list) : { groups: [], grouping: undefined }), [list])
  const channel = list?.channelId ? conversations[list.channelId] : undefined
  const writable = !!list && canWrite(list)
  const done = list ? completedColumn(list) : undefined

  const toggleDone = (row: SlackListRow, on: boolean) => {
    if (!list || !done) return
    setPending((p) => ({ ...p, [row.id]: on }))
    window.clearTimeout(timers.current[row.id])
    timers.current[row.id] = window.setTimeout(() => {
      const prev = row.cells[done.id] === 'true'
      useApp.getState().setListCell(list.id, row.id, done.id, on ? 'true' : null)
      setPending((p) => {
        const next = { ...p }
        delete next[row.id]
        return next
      })
      // "Changes saved" with "Undo" (changes_saved, yaml:3517; undo, yaml:21007): a genericDark SKBanner 16 pt from the
      // sides for 4 s (ListViewInteractor.swift:1918-1924; ListViewViewController.swift:21-28, 762-786, 825-871)
      showBanner({
        text: 'Changes saved',
        tone: 'genericDark',
        action: { title: 'Undo', onPress: () => useApp.getState().setListCell(list.id, row.id, done.id, prev ? 'true' : null) },
        dismissAfter: 4,
        sideOffset: 16,
      })
    }, SAVE_DELAY)
  }

  const openItem = (rowId?: string) => useApp.getState().presentSheet('list-record', { listId: id, rowId })

  const overflow = () => {
    if (!list) return
    const fx = useApp.getState().fx
    const meUser = fx.users[fx.me]
    // the list's creator, or a workspace admin / owner, and only while you can write to it (SlackListMenuProvider.swift:128-130)
    const canDelete = (list.creatorId === fx.me || !!meUser?.role) && writable
    // SlackListMenuProvider.buildMenuItems (SlackListMenuProvider.swift:33-173 at 14b3cbaf), titled with the list's name
    // (ListViewPresenter.swift:186-197): List details · Share in Slack · Copy Link · [to-do / Saved, laterTodos; Manage
    // Access, fileManagePermissions: flags off] · Request Edit Access when you can't write · [Report to Slack: EU
    // reporting rules only, ReportContentService.swift:71-77] · Delete
    openMenu({
      anchor: document.querySelector('.ios-screen .lists [aria-label="Show more options"]'),
      title: list.title,
      sections: [
        {
          items: [
            { title: 'List details', icon: 'lists', onSelect: () => showToast('Not in the prototype') }, // list_details (yaml:11128)
            { title: 'Share in Slack', icon: 'share_message', onSelect: () => showToast('Not in the prototype') }, // shareInSlack (yaml:18511)
            {
              title: 'Copy Link', // copy_link (yaml:4753)
              icon: 'link',
              onSelect: () => {
                copyText(`https://${fx.workspace.domain}.slack.com/lists/${fx.workspace.id}/${id}`)
                showToast('Link copied', 'toast_checkmark') // copied_link (yaml:4677)
              },
            },
            ...(!writable
              ? [
                  requested
                    ? // edit_access_requested (yaml:5997), disabled once asked (SlackListMenuProvider.swift:152-161)
                      { title: 'Edit Access Requested', icon: 'unlock', disabled: true, onSelect: () => {} }
                    : {
                        title: 'Request Edit Access', // request_edit_access (yaml:16492)
                        icon: 'unlock',
                        onSelect: () => {
                          // "Request sent" (hard-coded) with a 30 pt white svgCheckFilled (ListViewInteractor.swift:1643-1653)
                          setRequested(true)
                          toast({ text: 'Request sent', image: 'check_filled', imageSize: 30 })
                        },
                      },
                ]
              : []),
            ...(canDelete
              ? [
                  {
                    title: 'Delete', // delete (yaml:5283)
                    icon: 'trash',
                    destructive: true,
                    onSelect: async () => {
                      // list_deletion_prompt (yaml:11125), yes_delete_list (yaml:24177) (ListViewInteractor.swift:1701-1733)
                      const ok = await confirm({ message: 'Are you sure you want to delete this list?', confirm: 'Yes, Delete List', destructive: true })
                      if (!ok) return
                      useApp.getState().pop()
                      useApp.setState((s) => {
                        const lists = { ...s.fx.lists }
                        delete lists[id]
                        return { fx: { ...s.fx, lists, files: s.fx.files?.filter((f) => f.id !== id) } }
                      })
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    })
  }

  return (
    <div className="ios-pushed-screen lists" data-screen="list">
      <div className="ios-scroll lists__scroll" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 0)} data-qa="list_view">
        <div className="lists__content">
          {!list ? (
            <div className="lists__missing">
              <Icon name="lock_filled" size={20} color="var(--dt_color_content_primary)" />
              <div className="lists__missing-title">This file isn’t visible to you</div>
              <div className="lists__missing-body">This file is only visible to members of the conversation where it was originally shared.</div>
            </div>
          ) : (
            groups.map((g, i) => (
              <section key={g.id} className="lists__group">
                {grouping && (
                  <button type="button" className="lists__header" aria-expanded={!collapsed[g.id]} onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))} data-tap>
                    <span className={`lists__header-title${g.id === 'empty' ? ' is-empty' : ''}`}>{g.title}</span>
                    {/* SKBadge .text(textColor: choice _70, backgroundColor: choice _5), max 99 (ListKanbanSectionHeaderView.swift:124-141) */}
                    <SKBadge count={g.rows.length} maxBadgeCount={99} badgeStyle="text" textColor={choice(g.color, 70)} backgroundColor={choice(g.color, 5)} />
                    <span className="lists__header-spacer" />
                    <Icon name="caret_down_full" size={20} className={`lists__caret${collapsed[g.id] ? ' is-collapsed' : ''}`} />
                  </button>
                )}
                {!collapsed[g.id] &&
                  g.rows.map((r) => (
                    <Card
                      key={r.id}
                      list={list}
                      row={r}
                      titleColumn={primaryColumn(list)}
                      doneColumn={done}
                      checked={pending[r.id] ?? (done ? r.cells[done.id] === 'true' : false)}
                      writable={writable}
                      onCheck={(on) => toggleDone(r, on)}
                      onOpen={() => openItem(r.id)}
                    />
                  ))}
                {i < groups.length - 1 && <div className="lists__divider" />}
              </section>
            ))
          )}
        </div>
      </div>
      {list && writable && (
        // SKPillButton with svgPlus and "Add Item" (add_list_item_title, yaml:741) in smallBodyBold contentInversePrimary
        // on highlight2.baseInverse, insets 12 / 16, 16 pt from the trailing and bottom safe edges (ListViewPresenter.swift:29-33,
        // 159-178; ListViewViewController.swift:290-291)
        <div className="lists__add">
          <SKPillButton
            text="Add Item"
            textFont="var(--sk-small-body-bold)"
            textColor="var(--dt_color_content_inverse_primary)"
            icon="plus"
            iconColor="var(--dt_color_content_inverse_primary)"
            iconPosition="left"
            size={{ top: 12, left: 16, bottom: 12, right: 16 }}
            unselectedColor="var(--dt_color_base_inverse_highlight_2)"
            selectedColor="var(--dt_color_base_inverse_highlight_2)"
            shouldAnimateTransition
            accessibilityLabel="Add Item"
            onClick={() => openItem()}
          />
        </div>
      )}
      {list && !writable && (
        // the "View only" banner: SKBanner .regular .genericLight, no ornament, 12 pt from the sides (ListViewViewController.swift:133-144, 399-406)
        <div className="lists__banner">
          <SKBanner type="regular" tone="genericLight" ornament="hidden" text="View only" />
        </div>
      )}
      <NavBar
        title={list?.title ?? ''}
        // view-only lists: "View only" (view_only, yaml:21727; ListViewInteractor.swift:1136-1137)
        subtitle={list && !writable ? 'View only' : channel ? `#${channel.name}` : undefined}
        scrolled={scrolled}
        trailing={
          list && (
            <GlassButton label="Show more options" onClick={overflow}>
              <Icon name="ellipsis_horizontal_filled" size={20} />
            </GlassButton>
          )
        }
      />
    </div>
  )
}

/** A record card (ListKanbanRecordCellView): 16 pt padding, [the completed checkbox ·8·] the primary column, then the fields. */
function Card({
  list,
  row,
  titleColumn,
  doneColumn,
  checked,
  writable,
  onCheck,
  onOpen,
}: {
  list: SlackList
  row: SlackListRow
  titleColumn?: SlackListColumn
  doneColumn?: SlackListColumn
  checked: boolean
  writable: boolean
  onCheck: (on: boolean) => void
  onOpen: () => void
}) {
  const title = titleColumn ? row.cells[titleColumn.id] : ''
  const fields = list.columns.filter((c) => c !== titleColumn && c !== doneColumn && row.cells[c.id])
  return (
    <div className={['lists__card', doneColumn && 'has-checkbox', checked && 'is-completed'].filter(Boolean).join(' ')} role="button" onClick={onOpen} data-tap>
      <div className="lists__card-head">
        {doneColumn && <KanbanCheckbox checked={checked} enabled={writable} onChange={onCheck} />}
        <div className="lists__card-title">{title || 'Untitled Item'}</div>
      </div>
      {fields.length > 0 && (
        <div className="lists__fields" data-scroll-x>
          {fields.map((c) => (
            <Field key={c.id} column={c} value={row.cells[c.id]} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * ListKanbanCheckbox (ListKanbanCheckbox.swift:15-108): a 20 pt circle with a 1.5 pt outlinePrimary border; checked, no
 * border, a contentTertiary fill and a checkmark stroked basePrimary, 2 pt, round, (7.5, 11.5) → (10, 15) → (16.5, 7.5) in a
 * 24-unit box, drawn in on a spring (0.25 s, bounce 0.15); unchecking resets at once. Its tap area reaches 12 pt out; it
 * doesn't open the card (ListKanbanRecordView.swift:199-202). Read-only lists ignore taps (:389).
 */
function KanbanCheckbox({ checked, enabled, onChange }: { checked: boolean; enabled: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      // lists_a11y_mark_as_complete / _incomplete (yaml:10531 / 10535)
      aria-label={checked ? 'Mark as incomplete' : 'Mark as complete'}
      className={`lists__check${checked ? ' is-on' : ''}`}
      disabled={!enabled}
      onClick={(e) => {
        e.stopPropagation()
        if (enabled) onChange(!checked)
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path className="lists__check-mark" d="M7.5 11.5 10 15l6.5-7.5" pathLength={1} />
      </svg>
    </button>
  )
}

/** One field token, 26 pt tall (ListKanbanRecordCellView.Constants.tokenHeight): an icon or avatar, then the value in
 *  .caption contentTertiary (measured #5E5D60, 13 pt, in testTodosGroupedBySelect@3x.png). */
function Field({ column, value }: { column: SlackListColumn; value: string }) {
  const users = useApp((s) => s.fx.users)
  if (column.type === 'select') {
    const o = column.options?.find((x) => x.id === value)
    // tagForChoice: svgTag tinted the choice's foreground (_70), clear token (ListRecordFieldUIMapper.swift:411-440)
    return (
      <span className="lists__field">
        <Icon name="tag" size={16} color={choice(o?.color, 70)} />
        <span>{o?.label ?? value}</span>
      </span>
    )
  }
  if (column.type === 'person') {
    const u = users[value]
    return (
      <span className="lists__field">
        <SKMemberAvatar src={u?.avatar} name={u?.realName ?? value} size={16} />
        <span>{u?.name ?? value}</span>
      </span>
    )
  }
  if (column.type === 'date') {
    return (
      <span className="lists__field">
        <Icon name="calendar" size={16} color="var(--dt_color_content_tertiary)" />
        <span>{formatListDate(value, { short: true })}</span>
      </span>
    )
  }
  if (column.type === 'checkbox') {
    const on = value === 'true'
    return (
      <span className="lists__field">
        <Icon name={on ? 'check_circle_filled' : 'check_circle'} size={16} color={on ? 'var(--dt_color_content_highlight_2)' : 'var(--dt_color_content_tertiary)'} />
        <span>{column.name}</span>
      </span>
    )
  }
  return (
    <span className="lists__field">
      <span>{value}</span>
    </span>
  )
}
