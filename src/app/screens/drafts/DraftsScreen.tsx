import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Route } from '../../store'
import { useApp } from '../../store'
import { GlassGroup, NavBar } from '../../nav/NavBar'
import { openMenu, showAlert, type MenuAction } from '../../sheets'
import { composerDrafts } from '../../composer/Composer'
import { loadMrkdwn } from '../../composer/editor'
import { SKPageController } from '../../../slackkit/SKPageController'
import { SKButton } from '../../../slackkit/SKButton'
import { SKCheckbox } from '../../../slackkit/SKCheckbox'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKListFooter } from '../../../slackkit/SKEntity'
import { MKMessagePreview } from '../../../messagekit/MKMessagePreview'
import type { DraftItem } from '../../../data/types'
import { SwipeRow } from './SwipeRow'
import { OUTBOUNDS_TABS, draftRow, scheduledRow, sentItems, sentRow, sentSectionTitle, tabCount, type OutboundsTab, type SentItem } from './rows'
import './drafts.css'

// Drafts & Sent ("Outbounds": Modules/Features/Outbounds; spec dms-activity.md §7), pushed from Home's Drafts & Sent
// tile (OutboundsTile.swift:101): the standard bar ("Drafts & Sent", drafts_and_sent) with "Edit" on the Drafts tab, then
// an SKPageController with underline tabs sized to their content, no swiping between pages
// (PageControllerPresentationObjectProvider.swift:91-98): "Drafts" and "Scheduled" with counts, "Sent". Bulk editing
// drops the other pages (so the tabs) and shows the Delete / Select All bar instead (OutboundsPresenter.swift:17-42;
// OutboundsViewController.swift:118-176).

export function DraftsScreen({ route }: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const deleteDrafts = useApp((s) => s.deleteDrafts)
  const initial = OUTBOUNDS_TABS.findIndex((t) => t.id === route.tab)
  const [page, setPage] = useState(initial === -1 ? 0 : initial)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  useMinuteTick()
  const tab = OUTBOUNDS_TABS[page].id
  // the drafts provider lists the latest edits first; scheduled messages go out soonest first
  const drafts = useMemo(() => (fx.drafts ?? []).filter((d) => !d.scheduledFor).sort((a, b) => parseFloat(b.updated) - parseFloat(a.updated)), [fx.drafts])
  const scheduled = useMemo(() => (fx.drafts ?? []).filter((d) => d.scheduledFor).sort((a, b) => parseFloat(a.scheduledFor!) - parseFloat(b.scheduledFor!)), [fx.drafts])
  const sent = useMemo(() => sentItems(fx, messages, threads), [fx, messages, threads])

  // leaving bulk edit (Cancel, or the last draft deleted) clears the selection
  useEffect(() => {
    if (!drafts.length && editing) setEditing(false)
  }, [drafts.length, editing])
  const stopEditing = () => {
    setEditing(false)
    setSelected(new Set())
  }
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allSelected = drafts.length > 0 && drafts.every((d) => selected.has(d.id))

  const confirmBulkDelete = () => {
    const ids = drafts.filter((d) => selected.has(d.id)).map((d) => d.id)
    const n = ids.length
    showAlert({
      // delete_draft / delete_multiple_drafts, drafts_delete_are_you_sure / drafts_multiple_delete_are_you_sure
      title: n > 1 ? `Delete ${n} Drafts` : 'Delete Draft',
      message: n > 1 ? `Are you sure you want to delete ${n} drafts?` : 'Are you sure you want to delete this draft?',
      actions: [
        { title: 'Cancel', style: 'cancel' },
        {
          title: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDrafts(ids)
            stopEditing()
          },
        },
      ],
    })
  }

  // "Edit" (edit) on the Drafts tab while it has drafts, "Cancel" (cancel) while editing: SKBarButtonItem .title
  // .default → SKButton .systemDefault .barButton, in a glass capsule (OutboundsPresenter.swift:91-114)
  const trailing: ReactNode =
    tab === 'drafts' && drafts.length ? (
      <GlassGroup className="drafts__bar-button">
        <SKButton
          title={editing ? 'Cancel' : 'Edit'}
          buttonStyle="systemDefault"
          size="barButton"
          onClick={() => (editing ? stopEditing() : setEditing(true))}
          data-qa="drafts_edit"
        />
      </GlassGroup>
    ) : null

  const pages = [
    {
      id: 'drafts',
      tab: { title: 'Drafts', count: { label: tabCount(drafts.length) } },
      content: <DraftList drafts={drafts} editing={editing} selected={selected} onToggle={toggle} />,
    },
    { id: 'scheduled', tab: { title: 'Scheduled', count: { label: tabCount(scheduled.length) } }, content: <ScheduledList items={scheduled} /> },
    // no failed sends in the prototype, so never the trailing svgWarning in sk_raspberry_red
    { id: 'sent', tab: { title: 'Sent' }, content: <SentList items={sent} /> },
  ]

  return (
    <div className="ios-pushed-screen drafts" data-screen="drafts">
      <div className="drafts__pager">
        <SKPageController
          tabBarPosition="top"
          tabBarWidthMode="fitAllContent"
          isScrollEnabled={false}
          isAnimatedPageIndexTransition
          pageIndex={editing ? 0 : page}
          onTabTapped={setPage}
          pages={editing ? pages.slice(0, 1) : pages}
          accessoryItem={
            editing ? (
              <BulkDeleteBar
                count={selected.size}
                allSelected={allSelected}
                onDelete={confirmBulkDelete}
                onToggleAll={() => setSelected(allSelected ? new Set() : new Set(drafts.map((d) => d.id)))}
              />
            ) : undefined
          }
        />
      </div>
      {/* selected_input_title "%d Selected" while editing (OutboundsPresenter.swift:74-89) */}
      <NavBar title={editing ? `${selected.size} Selected` : 'Drafts & Sent'} trailing={trailing} />
    </div>
  )
}

function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
}

/**
 * BulkDeleteAccessoryView (:43-124): sk_primary_background, margins 4 / 16, [🗑 Delete] (.systemDanger(isPadded: false)
 * .medium, inactive with nothing selected) on the left, "Select All" / "Deselect" (.default .medium) and an SKCheckbox on
 * the right, a 1 px outlineTertiary hairline along the bottom.
 */
function BulkDeleteBar({ count, allSelected, onDelete, onToggleAll }: { count: number; allSelected: boolean; onDelete: () => void; onToggleAll: () => void }) {
  return (
    <div className="drafts-bulk">
      <SKButton title="Delete" icon="trash" buttonStyle="systemDanger" isPadded={false} state={count ? 'enabled' : 'inactive'} onClick={onDelete} data-qa="drafts_bulk_delete" />
      <span className="drafts-bulk__spacer" />
      <SKButton title={allSelected ? 'Deselect' : 'Select All'} buttonStyle="default" onClick={onToggleAll} />
      <SKCheckbox isOn={allSelected} onToggled={onToggleAll} accessibilityLabel="Select All" />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------------------ lists

/** Opens a draft where it was written, the text back in that composer (CommonDraftScheduledFeature.handleShow :58-100). */
function useOpenDraft() {
  const fx = useApp((s) => s.fx)
  const openConversation = useApp((s) => s.openConversation)
  const push = useApp((s) => s.push)
  return (d: DraftItem) => {
    if (!fx.conversations[d.conversationId]) return push({ screen: 'compose' })
    const el = document.createElement('div')
    loadMrkdwn(el, d.text, fx)
    composerDrafts.set(`${d.conversationId}/${d.threadTs ?? ''}`, { html: el.innerHTML, files: [] })
    if (d.threadTs) push({ screen: 'thread', conversationId: d.conversationId, ts: d.threadTs })
    else openConversation(d.conversationId)
  }
}

/** "Delete Draft" / "Are you sure you want to delete this draft?" (DraftsViewController.swift:96-116) */
function confirmDelete(onDelete: () => void) {
  showAlert({
    title: 'Delete Draft',
    message: 'Are you sure you want to delete this draft?',
    actions: [{ title: 'Cancel', style: 'cancel' }, { title: 'Delete', style: 'destructive', onPress: onDelete }],
  })
}

/** "Send Now" (send_now): the draft goes to its destination and leaves the list. */
function useSendNow() {
  const sendMessage = useApp((s) => s.sendMessage)
  const deleteDrafts = useApp((s) => s.deleteDrafts)
  return (d: DraftItem) => {
    sendMessage(d.conversationId, d.text, d.threadTs)
    deleteDrafts([d.id])
  }
}

function DraftList({ drafts, editing, selected, onToggle }: { drafts: DraftItem[]; editing: boolean; selected: Set<string>; onToggle: (id: string) => void }) {
  const fx = useApp((s) => s.fx)
  const push = useApp((s) => s.push)
  const deleteDrafts = useApp((s) => s.deleteDrafts)
  const showToast = useApp((s) => s.showToast)
  const openDraft = useOpenDraft()
  const sendNow = useSendNow()
  if (!drafts.length)
    return (
      <OutboundsEmpty
        illustration="drafts"
        title="Draft messages to send when you’re ready"
        body="Start typing a message anywhere, then find it here. Re-read, revise, and send whenever you’d like."
        onNew={() => push({ screen: 'compose' })}
      />
    )
  // DraftsPresenter.longPressMenuPresentationObject (:274-310): Edit Message, [Send Now, Schedule Message], Delete Message
  const menu = (d: DraftItem): MenuAction[] => [
    { title: 'Edit Message', icon: 'edit', onSelect: () => openDraft(d) },
    ...(fx.conversations[d.conversationId]
      ? [
          { title: 'Send Now', icon: 'paper_plane', onSelect: () => sendNow(d) },
          { title: 'Schedule Message', icon: 'schedule_send', onSelect: () => showToast('Not in the prototype') },
        ]
      : []),
    { title: 'Delete Message', icon: 'trash', destructive: true, onSelect: () => confirmDelete(() => deleteDrafts([d.id])) },
  ]
  return (
    <div className="ios-scroll drafts__list" data-qa="drafts_list_drafts">
      {/* one section, no separators between rows (DraftsPresenter.swift:136-160) */}
      {drafts.map((d) => (
        <SwipeRow key={d.id} enabled={!editing} right={{ label: 'Delete', icon: 'trash', background: 'var(--sk_raspberry_red)', foreground: 'var(--dt_color_constants_white)', onAction: () => confirmDelete(() => deleteDrafts([d.id])) }}>
          <MKMessagePreview
            {...draftRow(fx, d)}
            // in bulk edit every row carries a checkbox and a tap toggles it (DraftsInteractor.swift:73-81)
            bodyAccessory={editing ? <SKCheckbox isOn={selected.has(d.id)} onToggled={() => onToggle(d.id)} accessibilityLabel="Select" /> : undefined}
            onClick={() => (editing ? onToggle(d.id) : openDraft(d))}
            onLongPress={editing ? undefined : (el) => openMenu({ anchor: el, sections: [{ items: menu(d) }] })}
            data-qa={`draft_row_${d.id}`}
          />
        </SwipeRow>
      ))}
      <div className="drafts__bottom-space" />
    </div>
  )
}

function ScheduledList({ items }: { items: DraftItem[] }) {
  const fx = useApp((s) => s.fx)
  const push = useApp((s) => s.push)
  const deleteDrafts = useApp((s) => s.deleteDrafts)
  const unscheduleDraft = useApp((s) => s.unscheduleDraft)
  const showToast = useApp((s) => s.showToast)
  const openDraft = useOpenDraft()
  const sendNow = useSendNow()
  if (!items.length)
    return (
      <OutboundsEmpty
        illustration="scheduled"
        title="Write now, send later"
        body="Schedule messages to be sent at a later time, or another day altogether. They’ll wait here until they’re delivered."
        onNew={() => push({ screen: 'compose' })}
      />
    )
  // ScheduledPresenter.longPressMenuPresentationObject (:166-198); allFiles is a glyph, drawn with `files`
  const menu = (d: DraftItem): MenuAction[] => [
    { title: 'Edit Message', icon: 'edit', onSelect: () => openDraft(d) },
    { title: 'Send Now', icon: 'paper_plane', onSelect: () => sendNow(d) },
    { title: 'Reschedule Message', icon: 'schedule_send', onSelect: () => showToast('Not in the prototype') },
    ...(d.threadTs ? [] : [{ title: 'Cancel Schedule and Save to Drafts', icon: 'files', onSelect: () => unscheduleDraft(d.id) }]),
    { title: 'Delete Message', icon: 'trash', destructive: true, onSelect: () => confirmDelete(() => deleteDrafts([d.id])) },
  ]
  return (
    <div className="ios-scroll drafts__list" data-qa="drafts_list_scheduled">
      {items.map((d) => (
        <SwipeRow key={d.id} right={{ label: 'Delete', icon: 'trash', background: 'var(--sk_raspberry_red)', foreground: 'var(--dt_color_constants_white)', onAction: () => confirmDelete(() => deleteDrafts([d.id])) }}>
          <MKMessagePreview {...scheduledRow(fx, d)} onClick={() => openDraft(d)} onLongPress={(el) => openMenu({ anchor: el, sections: [{ items: menu(d) }] })} data-qa={`scheduled_row_${d.id}`} />
        </SwipeRow>
      ))}
      <div className="drafts__bottom-space" />
    </div>
  )
}

/** Sent: sections by day, an SKHeaderEntity .medium each and a hairline footer but after the last (SentPresenter.swift:90-128). */
function SentList({ items }: { items: SentItem[] }) {
  const fx = useApp((s) => s.fx)
  const push = useApp((s) => s.push)
  const openMessage = useApp((s) => s.openMessage)
  if (!items.length)
    return (
      <OutboundsEmpty
        illustration="sent"
        title="You haven’t sent any messages yet."
        body="They’ll appear here once you do - a record for the future you."
        onNew={() => push({ screen: 'compose' })}
      />
    )
  const sections = groupByDay(items)
  return (
    <div className="ios-scroll drafts__list" data-qa="drafts_list_sent">
      {sections.map(([title, rows], i) => (
        <Fragment key={title}>
          <div className="drafts__section-header mk-label" role="heading" aria-level={2}>
            {title}
          </div>
          {rows.map((item) => (
            <MKMessagePreview
              key={`${item.conversationId}/${item.message.ts}`}
              {...sentRow(fx, item)}
              // rowSelected → navigateToMessage (SentInteractor.swift:52-55)
              onClick={() => openMessage(item.conversationId, item.message.ts, { threadTs: item.threadTs })}
              data-qa={`sent_row_${item.message.ts}`}
            />
          ))}
          {i < sections.length - 1 && <SKListFooter />}
        </Fragment>
      ))}
      <div className="drafts__bottom-space" />
    </div>
  )
}

function groupByDay(items: SentItem[]): [string, SentItem[]][] {
  const out = new Map<string, SentItem[]>()
  for (const item of items) {
    const title = sentSectionTitle(item.message.ts)
    const list = out.get(title)
    if (list) list.push(item)
    else out.set(title, [item])
  }
  return [...out]
}

/** The tabs' empty states (DraftsPresenter.swift:104-126; ScheduledPresenter.swift:97-116; SentPresenter.swift:80-88). */
function OutboundsEmpty({ illustration, title, body, onNew }: { illustration: 'drafts' | 'scheduled' | 'sent'; title: string; body: string; onNew: () => void }) {
  return (
    <div className="ios-scroll drafts__list">
      <div className="drafts__empty">
        <SKEmptyState
          content={{ illustration }}
          title={title}
          body={body}
          backgroundColor="var(--sk_primary_background)"
          // new_message, SKEmptyState's default .outlineDefault (SKEmptyState.swift:451-464)
          buttons={[{ title: 'New Message', buttonStyle: 'outlineDefault', onClick: onNew }]}
        />
      </div>
    </div>
  )
}

