import type { CSSProperties } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { useDevice } from '../../../sim/store'
import { screenRect, type AnchorRect } from './Menu'
import './ios.css'

// UIAlertController as iOS 26 draws it. Slack's SKAlertController only maps a title, a message and actions onto it
// (spec sheets-menus.md §5.2, SKAlertController.swift:81-124); the look is UIKit's, measured on Apple's iOS 26 HIG
// renders of a 402 × 874 iPhone (536 px = 402 pt):
//
//   alert        alert-ios@2x.png: a 300 pt glass card centered on screen, 34 pt corners, title (17 semibold) and
//                message (17, label at 75 %) left-aligned 22 pt in, capsule buttons 48 pt tall, 14 pt from the card's
//                sides and bottom, 8 pt apart, side by side when there are two; the preferred one filled systemBlue.
//   actionSheet  action-sheet-iphone-mail-delete-action@2x.png: a glass card by its source view (a popover on iOS 26),
//                capsules 46 pt tall, 14 pt in, 8 pt apart; the Cancel action isn't drawn (tap outside cancels).
//                Without a source it sits at the bottom of the screen, with Cancel as its last capsule.
//
//   confirm({ title: 'Delete draft?', message: 'Are you sure…', confirm: 'Delete', destructive: true }).then(ok => …)
//   showAlert({ title, message, actions: [{ title: 'OK', style: 'cancel' }] })
//   showActionSheet({ title, actions: [{ title: 'Delete Message', style: 'destructive', onPress }, { title: 'Cancel', style: 'cancel' }], anchor: rowElement })

export interface AlertAction {
  title: string
  /** UIAlertAction.Style */
  style?: 'default' | 'cancel' | 'destructive'
  /** UIAlertController.preferredAction: drawn filled */
  preferred?: boolean
  onPress?: () => void
}

export interface AlertOptions {
  title?: string
  message?: string
  actions: AlertAction[]
  /** 'alert' (default) or 'actionSheet' */
  style?: 'alert' | 'actionSheet'
  /** an action sheet's source view (element or screen rect): it shows next to it */
  anchor?: Element | AnchorRect | null
}

/** Presents an alert or action sheet (the 'alert' overlay). */
export function showAlert(opts: AlertOptions) {
  const { anchor, ...rest } = opts
  useApp.getState().presentSheet('alert', { ...rest, anchor: screenRect(anchor ?? null) })
}

/** An action sheet (UIAlertController.Style.actionSheet). */
export const showActionSheet = (opts: Omit<AlertOptions, 'style'>) => showAlert({ ...opts, style: 'actionSheet' })

/**
 * A two-button confirmation: resolves true when the confirm button is chosen, false on Cancel or a tap outside.
 * `destructive` draws the confirm button red; otherwise it's the preferred (filled) action of an alert.
 */
export function confirm(opts: { title?: string; message?: string; confirm: string; cancel?: string; destructive?: boolean; style?: 'alert' | 'actionSheet'; anchor?: Element | AnchorRect | null }): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert({
      title: opts.title,
      message: opts.message,
      style: opts.style,
      anchor: opts.anchor,
      actions: [
        { title: opts.confirm, style: opts.destructive ? 'destructive' : 'default', preferred: !opts.destructive && opts.style !== 'actionSheet', onPress: () => resolve(true) },
        // "Cancel" (cancel, localized_strings.yaml:3065)
        { title: opts.cancel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      ],
    })
  })
}

// ------------------------------------------------------------------------------------------------ the overlay

export function AlertOverlay(raw: { sheetKey: string } & Omit<AlertOptions, 'anchor'> & { anchor?: AnchorRect }) {
  const sheet = useSheet()
  const device = useDevice()
  // presented by hand without actions: an "OK" (ok) closes it; a bad anchor is ignored
  const actions = Array.isArray(raw.actions) ? raw.actions.filter((a) => a && typeof a.title === 'string') : []
  const anchor = typeof raw.anchor?.x === 'number' && typeof raw.anchor.y === 'number' ? raw.anchor : undefined
  const props = { ...raw, actions: actions.length ? actions : [{ title: 'OK', style: 'cancel' as const }], anchor }
  const sheetStyle = props.style === 'actionSheet'
  const cancel = props.actions.find((a) => a.style === 'cancel')
  const run = (a?: AlertAction) => {
    sheet?.dismiss()
    a?.onPress?.()
  }
  // Tapping outside an action sheet cancels it; an alert only closes through its buttons (UIKit).
  const outside = () => sheetStyle && run(cancel)

  if (!sheetStyle) {
    // two buttons share a row only when both titles fit; otherwise UIKit stacks them
    const two = props.actions.length === 2 && props.actions.every((a) => fitsHalf(a.title))
    // Cancel goes on the leading side of a row and at the bottom of a stack (HIG › Alerts).
    const ordered = two ? [...props.actions].sort((a, b) => Number(b.style === 'cancel') - Number(a.style === 'cancel')) : [...props.actions].sort((a, b) => Number(a.style === 'cancel') - Number(b.style === 'cancel'))
    return (
      <div className="ios-alert-overlay" data-kind="alert">
        <div className="ios-alert-dim" />
        <div className="ios-alert glass-platter" role="alertdialog" aria-label={props.title}>
          {(props.title || props.message) && (
            <div className="ios-alert__text">
              {props.title && <div className="ios-alert__title">{props.title}</div>}
              {props.message && <div className="ios-alert__message">{props.message}</div>}
            </div>
          )}
          <div className={`ios-alert__buttons${two ? ' is-row' : ''}`}>
            {ordered.map((a, i) => (
              <AlertButton key={i} action={a} onClick={() => run(a)} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Action sheet: next to its source when it has one on screen, else at the bottom.
  const a = props.anchor && props.anchor.y + props.anchor.height > device.safeTop && props.anchor.y < device.height - device.safeBottom ? props.anchor : undefined
  const shown = a ? props.actions.filter((x) => x.style !== 'cancel') : [...props.actions].sort((x, y) => Number(x.style === 'cancel') - Number(y.style === 'cancel'))
  const style: CSSProperties = {}
  let origin = '50% 100%'
  if (a) {
    const estimate = (props.title || props.message ? 70 : 0) + shown.length * 54 + 20
    const below = device.height - (a.y + a.height) - device.safeBottom
    const above = a.y - device.safeTop
    const width = Math.min(device.width - 16, 320)
    // Centered on the source (centerBestEffortOnSourceView), kept 8 pt inside the screen.
    const cx = a.x + a.width / 2
    style.left = Math.max(8, Math.min(device.width - 8 - width, cx - width / 2))
    style.width = width
    if (below >= estimate + 8 || below >= above) {
      style.top = a.y + a.height + 8
      origin = '50% 0'
    } else {
      style.bottom = device.height - a.y + 8
      origin = '50% 100%'
    }
  }
  return (
    <div className="ios-alert-overlay" data-kind={a ? 'popover' : 'sheet'} onPointerDown={(e) => e.target === e.currentTarget && outside()}>
      <div className="ios-alert-dim" onPointerDown={outside} />
      <div className={`ios-action-sheet glass-platter${a ? ' is-anchored' : ''}`} style={{ ...style, transformOrigin: origin }} role="dialog" aria-label={props.title}>
        {(props.title || props.message) && (
          <div className="ios-alert__text">
            {props.title && <div className="ios-alert__title">{props.title}</div>}
            {props.message && <div className="ios-alert__message">{props.message}</div>}
          </div>
        )}
        <div className="ios-alert__buttons is-stack">
          {shown.map((x, i) => (
            <AlertButton key={i} action={x} onClick={() => run(x)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function AlertButton({ action, onClick }: { action: AlertAction; onClick: () => void }) {
  const cls = ['ios-alert__button', action.style === 'destructive' && 'is-destructive', action.style === 'cancel' && 'is-cancel', action.preferred && 'is-preferred'].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} data-tap>
      {action.title}
    </button>
  )
}

/** Whether a title fits a button in a two-button row: (300 − 2 × 14 − 8) / 2 − 2 × 16 = 100 pt of text (ios.css). */
let measure: CanvasRenderingContext2D | null = null
function fitsHalf(title: string) {
  measure ??= document.createElement('canvas').getContext('2d')
  if (!measure) return title.length <= 10
  measure.font = "600 17px -apple-system, 'SF Pro Text', 'SF Pro', system-ui, sans-serif"
  return measure.measureText(title).width <= 100
}
