import { useEffect, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { useApp } from '../store'
import { isIconName } from '../../icons/Icon'
import icons from '../../icons/generated/icons.json'
import { screenDef } from '../nav/registry'
import { TOAST_CHECKMARK, TOAST_ERROR } from '../sheets/ui/toast-images'
import { SKBanner, SKToast, TOAST_DEFAULT_DELAY } from '../../slackkit'

// Slack's three kinds of transient message (spec sheets-menus.md §5.1, §5.3–5.5; slack-objc main @ 14b3cbaf):
//
//   SKToast      a dark rounded HUD in the middle of the screen, above everything; not tappable. Copy actions, pins,
//                Home's sort and filter. useApp.getState().showToast('Link copied', 'toast_checkmark'), or toast({…})
//                for a duration or a vertical position. `icon`: 'toast_checkmark' / 'toast_error' (the 50 × 44 images
//                AlertService loads by name) or any icon name, drawn in white at `imageSize` — SKToast's `.icon` content
//                style, new since June (SKToast.swift:30,79,118-121; AlertService.swift:75-76): Slack's default is
//                30 × 30, Home's filter toasts pass 40 × 40 (HomeNavigationBarControlsManager.swift:43), the default here.
//   SnackBar     the legacy SnackBarAlertView: a full-width dark bar flush with the bottom, an optional bold action on
//                the right. showSnackbar('Message sent', { action: 'UNDO', onAction })
//   SKBanner     AlertService.presentBanner, the snackbar's replacement: a genericDark SKBanner 8 pt above the bottom of
//                the safe area — above the tab bar on a tab — 12 pt from the sides. showBanner({ text: 'Draft saved' })

// ------------------------------------------------------------------------------------------------------ SKToast

interface ToastExtras {
  /** seconds on screen after it has appeared (SKToast default 0.55) */
  duration?: number
  /** the toast's center, from the top of the screen (default: the middle) */
  verticalOffset?: number
  /** an icon image's side in points (default 40, Home's filter toasts; SKToast's own default and ConversationActionHandler's toasts: 30) */
  imageSize?: number
  /** SKToast maxWidth (default 260) */
  maxWidth?: number
}
const extras = new Map<number, ToastExtras>()

/** SKToast with every option: toast({ text: 'Couldn’t pin', image: 'toast_error', duration: 2 }) (AlertService.presentToast). */
export function toast(opts: { text?: string; image?: string } & ToastExtras) {
  const id = Date.now() + Math.random()
  extras.set(id, { duration: opts.duration, verticalOffset: opts.verticalOffset, imageSize: opts.imageSize, maxWidth: opts.maxWidth })
  useApp.setState({ toast: { id, text: opts.text ?? '', icon: opts.image } })
}

/** The toast image at its point size: an @3x PNG (the toast images) or an icon (40 × 40, white), as an SVG <img>. */
function toastImage(icon: string | undefined, side = 40): string | undefined {
  if (!icon) return undefined
  const png = icon === 'toast_checkmark' ? TOAST_CHECKMARK : icon === 'toast_error' ? TOAST_ERROR : undefined
  // 150 × 132 px at @3x = 50 × 44 pt (App/Resource/SlackAppResources/SlackApp.xcassets/Misc/toast_*.imageset)
  if (png) return svgData(50, 44, `<image href="${png}" width="50" height="44"/>`)
  // HomeNavigationBarControlsManager: the option's icon, 40 × 40, white (Constants.toastImageSize, :43, :236)
  const def = isIconName(icon) ? (icons as Record<string, { viewBox: string; body: string }>)[icon] : undefined
  if (def) return svgData(side, side, `<svg viewBox="${def.viewBox}" width="${side}" height="${side}" fill="none" style="color:#fff">${def.body}</svg>`)
  return undefined
}
const svgData = (w: number, h: number, inner: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`)}`

function ToastView() {
  const t = useApp((s) => s.toast)
  const hide = useApp((s) => s.hideToast)
  if (!t) return null
  const x = extras.get(t.id)
  const image = toastImage(t.icon, x?.imageSize)
  return (
    <SKToast
      key={t.id}
      message={t.text || undefined}
      contentStyle={image ? { image } : 'messageOnly'}
      maxWidth={x?.maxWidth}
      presentation={{ automatic: x?.duration ?? TOAST_DEFAULT_DELAY }}
      verticalOffset={x?.verticalOffset}
      onDismissed={() => {
        extras.delete(t.id)
        // a newer toast replaces this one ("a new toast hides any toast already showing", SKToast.swift:186-192)
        if (useApp.getState().toast?.id === t.id) hide()
      }}
    />
  )
}

// ------------------------------------------------------------------------------------ SnackBar and SKBanner

interface Snack {
  id: number
  text: ReactNode
  action?: string
  onAction?: () => void
  /** false keeps a snackbar with an action until it's tapped */
  autoDismiss: boolean
  /** points above the bottom edge (e.g. above a composer) */
  offset: number
}

interface Banner {
  id: number
  text: ReactNode
  heading?: string
  /** SKBanner tone (default genericDark, BannerConfig.swift:46) */
  tone: 'genericDark' | 'genericLight' | 'info' | 'success' | 'warning' | 'error'
  /** an icon name; none by default (presentBanner's ornament defaults to .hidden, AlertService.swift:125) */
  icon?: string
  action?: { title: string; onPress: () => void }
  /** seconds before it fades (BannerConfig standardDismissalDelay 3.0) */
  dismissAfter: number
  /** 'bottom' (default) or 'top' */
  direction: 'bottom' | 'top'
  /** points from the safe area edge (default 8) and from the sides (default 12, what callers pass: Spacing.large) */
  offset: number
  sideOffset: number
}

const useTransient = create<{ snack: Snack | null; banner: Banner | null }>(() => ({ snack: null, banner: null }))

/** SnackBarAlertView.notify: a full-width bar at the bottom for 3 s. */
export function showSnackbar(text: ReactNode, opts: { action?: string; onAction?: () => void; autoDismiss?: boolean; offset?: number } = {}) {
  useTransient.setState({ snack: { id: Date.now(), text, action: opts.action, onAction: opts.onAction, autoDismiss: opts.autoDismiss ?? true, offset: opts.offset ?? 0 } })
}
export const hideSnackbar = () => useTransient.setState({ snack: null })

/** AlertService.presentBanner: an SKBanner above the bottom of the screen (the tab bar on a tab) for 3 s. */
export function showBanner(opts: { text: ReactNode; heading?: string; tone?: Banner['tone']; icon?: string; action?: Banner['action']; dismissAfter?: number; direction?: Banner['direction']; offset?: number; sideOffset?: number }) {
  useTransient.setState({
    banner: {
      id: Date.now(),
      text: opts.text,
      heading: opts.heading,
      tone: opts.tone ?? 'genericDark',
      icon: opts.icon,
      action: opts.action,
      dismissAfter: opts.dismissAfter ?? 3,
      direction: opts.direction ?? 'bottom',
      offset: opts.offset ?? 8,
      sideOffset: opts.sideOffset ?? 12,
    },
  })
}
export const hideBanner = () => useTransient.setState({ banner: null })

/** SnackBarAlertView.swift: slides up in 0.2 s, stays 3.0 s, slides down (:53-161). */
function SnackBarView() {
  const snack = useTransient((s) => s.snack)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!snack) return
    setShown(false)
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    const timers: number[] = []
    if (snack.autoDismiss || !snack.action) {
      timers.push(window.setTimeout(() => setShown(false), 200 + 3000))
      timers.push(window.setTimeout(() => useTransient.getState().snack?.id === snack.id && hideSnackbar(), 200 + 3000 + 200))
    }
    return () => {
      cancelAnimationFrame(r)
      timers.forEach(clearTimeout)
    }
  }, [snack])
  if (!snack) return null
  return (
    <div className="sk-snackbar-clip" style={{ bottom: snack.offset }}>
      <div className={`sk-snackbar${shown ? ' is-shown' : ''}${snack.offset ? ' has-offset' : ''}`} role="status">
        {/* Lato 16, unlimited lines; a UILabel breaks at "\n" (SnackBarAlertView.swift:214-219,237; testNotifySnackBarViewMultiline) */}
        <div className="sk-snackbar__text" style={typeof snack.text === 'string' ? { whiteSpace: 'pre-line' } : undefined}>
          {snack.text}
        </div>
        {snack.action && (
          <button
            type="button"
            className="sk-snackbar__action"
            onClick={() => {
              snack.onAction?.()
              setShown(false)
              setTimeout(hideSnackbar, 200)
            }}
          >
            {snack.action}
          </button>
        )}
      </div>
    </div>
  )
}

/** AlertService.swift:166-202: fades in over 0.2 s (linear), waits, fades out over 0.2 s. */
function BannerView() {
  const banner = useTransient((s) => s.banner)
  const top = useApp((s) => s.stacks[s.tab].at(-1)?.route)
  const sheets = useApp((s) => s.sheets.length)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!banner) return
    setShown(false)
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    const out = setTimeout(() => setShown(false), 200 + banner.dismissAfter * 1000)
    const done = setTimeout(() => useTransient.getState().banner?.id === banner.id && hideBanner(), 400 + banner.dismissAfter * 1000)
    return () => {
      cancelAnimationFrame(r)
      clearTimeout(out)
      clearTimeout(done)
    }
  }, [banner])
  if (!banner) return null
  // The presenting view's safe area: on a tab it ends at the floating tab bar (21 + 62 pt, measurements.md).
  const tabBar = !sheets && !(top && screenDef(top.screen)?.options?.tabBar === false)
  const base = tabBar ? 'max(var(--kb-height), 83px)' : 'max(var(--kb-height), var(--safe-bottom))'
  const pos = banner.direction === 'bottom' ? { bottom: `calc(${base} + ${banner.offset}px)` } : { top: `calc(var(--safe-top) + ${banner.offset}px)` }
  return (
    <div className={`sk-floating-banner${shown ? ' is-shown' : ''}`} style={{ ...pos, left: banner.sideOffset, right: banner.sideOffset }}>
      <SKBanner
        type="regular"
        tone={banner.tone}
        text={banner.text}
        heading={banner.heading}
        ornament={banner.icon ? { icon: banner.icon } : 'hidden'}
        accessories={
          banner.action
            ? [
                {
                  button: {
                    title: banner.action.title,
                    buttonStyle: 'custom',
                    customColors: { backgroundColor: 'transparent', titleColor: 'var(--bn-text)', borderColor: 'transparent' },
                    size: 'small',
                    onClick: () => {
                      banner.action!.onPress()
                      hideBanner()
                    },
                  },
                },
              ]
            : []
        }
      />
    </div>
  )
}

/** Draws the toast, the snackbar and the floating banner (App renders it once, above the sheets). */
export function ToastHost() {
  return (
    <>
      <SnackBarView />
      <BannerView />
      <ToastView />
    </>
  )
}
