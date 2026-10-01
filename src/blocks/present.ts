import { useApp } from '../app/store'
import { showAlert, showActionSheet } from '../app/sheets'
import type { ConfirmObject } from './types'

// Pickers, editors and alerts that Block Kit elements open, as promises: the element presents a sheet and awaits what
// the person chose (null when they cancelled or dismissed it). Sheets call settle() with the result before they go,
// and settle null when they start closing, so a sheet swiped away never leaves an element waiting. Alerts are the
// app's iOS 26 UIAlertController (src/app/sheets: showAlert / showActionSheet).

type Resolver = (value: unknown) => void
const resolvers = new Map<string, Resolver>()
let seq = 0

/**
 * Kit pages (?kit=…, e.g. the Block Kit gallery) have no simulated screen to present sheets and alerts on: pickers
 * resolve with nothing and confirms pass, after telling `onNoScreen` what would have opened.
 */
const noScreen = () => typeof document !== 'undefined' && !!document.documentElement.dataset.kitPage
let onNoScreen: ((what: string) => void) | null = null
export function whenNoScreen(fn: ((what: string) => void) | null) {
  onNoScreen = fn
}

/** Presents `sheet` with `props` (plus `resultId`) and resolves with what it settles, or null. */
export function presentForResult<T>(sheet: string, props: Record<string, unknown> = {}): Promise<T | null> {
  if (noScreen()) {
    onNoScreen?.(sheet)
    return Promise.resolve(null)
  }
  const resultId = `bkr${++seq}`
  return new Promise<T | null>((resolve) => {
    resolvers.set(resultId, resolve as Resolver)
    useApp.getState().presentSheet(sheet, { ...props, resultId })
  })
}

/** A sheet's answer; the first one wins. */
export function settle(resultId: unknown, value: unknown) {
  if (typeof resultId !== 'string') return
  const r = resolvers.get(resultId)
  resolvers.delete(resultId)
  r?.(value ?? null)
}

/**
 * A `confirm` object's alert (BlockConfirmationPresenter.swift:29-75): title = confirm.title, message = confirm.text,
 * the confirm button (its text or "OK", `ok_all_caps`; default style, preferred) and the deny button (its text or
 * "Cancel", cancel style). `style` isn't used by iOS. Resolves true right away without a confirm object.
 */
export function confirmFirst(confirm: ConfirmObject | undefined): Promise<boolean> {
  if (!confirm) return Promise.resolve(true)
  if (noScreen()) {
    onNoScreen?.(`the confirm alert “${confirm.title?.text ?? ''}”`)
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    showAlert({
      title: confirm.title?.text || undefined,
      message: confirm.text?.text || undefined,
      actions: [
        { title: confirm.confirm?.text || 'OK', style: 'default', preferred: true, onPress: () => resolve(true) },
        { title: confirm.deny?.text || 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      ],
    })
  })
}

/** file_input's info button: "The people who can edit this automation…" with "Okay" (BlockInteractionCoordinator.swift:336-346). */
export function fileUploadInfo() {
  if (noScreen()) return onNoScreen?.('the file upload info alert')
  // file_upload_info_message (yaml:6605), okay (yaml:12834)
  showAlert({ message: 'The people who can edit this automation will also have access to any files shared here.', actions: [{ title: 'Okay', style: 'default' }] })
}

/**
 * Close with unsaved edits (AppViewViewController.swift:264-287; AppViewPresenter.swift:129-134): an action sheet,
 * "Are you sure you want to close?" / "Just FYI: If you close now, your work won’t be saved.", Close (destructive) and
 * Keep Editing (cancel). Resolves true for Close.
 */
export function confirmClose(): Promise<boolean> {
  return new Promise((resolve) => {
    showActionSheet({
      // are_you_sure_you_want_to_close (yaml:1983), fyi_if_you_close_now_your_work_wont_be_saved (yaml:7055)
      title: 'Are you sure you want to close?',
      message: 'Just FYI: If you close now, your work won’t be saved.',
      actions: [
        { title: 'Close', style: 'destructive', onPress: () => resolve(true) },
        // dialog_alert_cancel (yaml:5064)
        { title: 'Keep Editing', style: 'cancel', onPress: () => resolve(false) },
      ],
    })
  })
}
