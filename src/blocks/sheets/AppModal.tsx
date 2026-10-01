import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { dismissKeyboard } from '../../app/keyboard/Keyboard'
import { SKBanner, SKSpinner } from '../../slackkit'
import { BlockSurface } from '../index'
import { closeViews, hasUserEnteredData, popView, submitTopView, useViews, viewText } from '../modal-state'
import { confirmClose } from '../present'
import type { ModalView } from '../views'
import { SheetNav } from './SheetNav'

// Block Kit modals (views.open / push / update, spec blockkit.md §7; Modules/Features/AppView): a navigation controller
// presented as a form sheet (a page sheet on iPhone), swipe-down dismissal off (AppViewFeature.swift:45,51,71). Each
// view's bar: its `close` text (default "Close") on the left, the title (Lato Bold 15) over the app's name (Lato 13) in
// the middle, `submit` on the right (AppViewTitleView.swift:33-84; AppViewViewController.swift:195-244). The body is the
// blocks on base_primary with 16 pt insets and an 8 pt header; the loading overlay covers it while a submit is pending
// (AppViewLoadingView.swift:33,44); errors without a block show as a banner above it (AppViewPresenter.swift:73-85).
// Pushed views slide in like a navigation push; their close item pops them (AppViewService.swift:42-133).

const PUSH_MS = 350

export function AppModal({ sheetKey }: { sheetKey: string }) {
  const stack = useViews((s) => s.stack)
  const motion = useViews((s) => s.motion)
  const snackbar = useViews((s) => s.snackbar)
  // A popped view stays on screen while it slides out.
  const [leaving, setLeaving] = useState<ModalView | null>(null)
  const prev = useRef<ModalView[]>(stack)
  useLayoutEffect(() => {
    const before = prev.current
    prev.current = stack
    if (motion === 'pop' && before.length > stack.length) {
      const gone = before[before.length - 1]
      setLeaving(gone)
      const t = setTimeout(() => setLeaving(null), PUSH_MS)
      return () => clearTimeout(t)
    }
  }, [stack, motion])

  // The stack is gone when something else dismissed the sheet (a navigation); forget its views.
  useEffect(
    () => () => {
      if (!useApp.getState().sheets.some((s) => s.key === sheetKey) && useViews.getState().stack.length) closeViews(false)
    },
    [sheetKey],
  )
  // No views left (the handler closed them): the sheet goes.
  useEffect(() => {
    if (!stack.length) {
      const app = useApp.getState()
      if (app.sheets.some((s) => s.key === sheetKey)) app.dismissSheet(sheetKey)
    }
  }, [stack.length, sheetKey])

  // While the sheet slides away after the last view closed, it keeps showing that view.
  const last = useRef<ModalView[]>(stack)
  if (stack.length) last.current = stack
  const shown = stack.length ? stack : last.current
  const pages = leaving ? [...shown, leaving] : shown
  return (
    <div className="bk-modal">
      {pages.map((v, i) => {
        const isLeaving = v === leaving
        const top = isLeaving || (!leaving && i === shown.length - 1)
        const covered = !top && (i < shown.length - 1 || !!leaving)
        const entering = top && !isLeaving && motion === 'push' && i > 0
        return (
          <div key={v.id} className={['bk-modal__page', covered && 'is-covered', entering && 'is-entering', isLeaving && 'is-leaving'].filter(Boolean).join(' ')} aria-hidden={!top || isLeaving}>
            <ModalPage view={v} />
          </div>
        )
      })}
      {snackbar && <Snackbar key={snackbar.n} text={snackbar.text} />}
    </div>
  )
}

function ModalPage({ view }: { view: ModalView }) {
  const appName = useApp((s) => (view.appId ? (s.fx.users[view.appId]?.name ?? s.fx.users[view.appId]?.realName) : undefined))
  const submitting = useViews((s) => s.submitting === view.id)
  const banner = useViews((s) => s.banner[view.id])
  const scrollTo = useViews((s) => (s.scrollTo?.viewId === view.id ? s.scrollTo : null))
  const body = useRef<HTMLDivElement>(null)
  const title = viewText(view.title)
  const submit = viewText(view.submit)

  // Submit found errors: scroll to the first invalid input (AppViewPresenter.swift:108-122).
  useEffect(() => {
    if (!scrollTo) return
    const el = body.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(scrollTo.blockId)}"]`)
    if (el && body.current) body.current.scrollTo({ top: Math.max(0, el.offsetTop - 8), behavior: 'smooth' })
  }, [scrollTo])

  const close = async () => {
    dismissKeyboard()
    if (hasUserEnteredData(view.id) && !(await confirmClose())) return
    popView(true)
  }

  return (
    <div className="bk-modal__view">
      <SheetNav
        title={title ? title : undefined}
        subtitle={title && appName ? appName : undefined}
        leading={{ label: viewText(view.close) || 'Close', onClick: () => void close() }}
        trailing={submit ? { label: submit, disabled: submitting, onClick: () => (dismissKeyboard(), void submitTopView()) } : null}
      />
      <div
        ref={body}
        className="bk-modal__body ios-scroll"
        onPointerDown={(e) => {
          // Tapping any non-text element ends editing (AppViewViewController.swift:180-193).
          if (!(e.target as Element).closest('input, textarea, [contenteditable="true"]')) dismissKeyboard()
        }}
      >
        {banner && (
          <div className="bk-modal__banner">
            <SKBanner type="regular" tone="error" text={banner} />
          </div>
        )}
        <BlockSurface blocks={view.blocks} surface="modal" view={view} appUserId={view.appId} />
      </div>
      {submitting && (
        <div className="bk-modal__loading" role="progressbar" aria-label="Loading…">
          <SKSpinner size="extraLarge" />
        </div>
      )}
    </div>
  )
}

/** SnackBarAlertView: a full-width content_primary bar at the bottom, base_primary Lato 16, gone after 3 s (SnackBarAlertView.swift). */
function Snackbar({ text }: { text: string }) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShown(false), 3000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={`bk-snackbar${shown ? ' is-shown' : ''}`} role="status">
      {text}
    </div>
  )
}
