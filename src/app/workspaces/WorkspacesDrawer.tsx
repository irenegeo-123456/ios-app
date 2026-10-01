import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useApp } from '../store'
import { useSheet } from '../nav/SheetHost'
import type { SheetProps } from '../nav/registry'
import { openMenu } from '../sheets/ui/Menu'
import { useDevice } from '../../sim/store'
import { Icon } from '../../icons/Icon'
import { SKWorkspaceAvatar } from '../../slackkit/SKWorkspaceAvatar'
import { SKIconButton } from '../../slackkit/SKIconButton'
import { EntityRow } from '../screens/more/EntityRow'
import './workspaces.css'

// The workspace switcher (spec shell-navigation.md §5): on iPhone a left drawer over the whole tab UI (the app root is a
// DoublePanelViewController whose left panel is WorkspacesViewController), the same on iOS 18 and 26.
//
//   width        screen width − 60 (RootViewControllerTabs.swift:55, 204); full height
//   motion       leading edge −width → 0, a 0.3 s spring with damping 1 (DoublePanelView.swift:180-188)
//   dim          black 0.4 over the tab UI, following the progress (:61-70); tap the uncovered strip to close
//   dismiss      pan left: completes past 50 % or faster than 300 pt/s (DoublePanelViewController.swift:437-442, 796-814)
//   panel        basePrimary, radius 30 continuous on the right corners, shadow black 12 % at (1, 2), radius 4
//                (WorkspacesViewController.swift:210-237)
//   header       "Workspaces", Lato Black 22 contentPrimary at x 16, centered in a 32 pt row at safe top + 4, 8 below
//                (HomeNavigationBar.swift:27-38, 139-173)
//   workspaces   SKWorkspaceEntity .extraLarge rows; the current one permanently highlighted, ringed and with "…"
//   options      Add a Workspace, Preferences, Help: .small rows, 3 × 44 pt, above the safe-area bottom, under a 1 px
//                outlineTertiary separator (:109-121, :334-376)
//
// The status bar hides while the drawer is open on iOS (RootViewControllerTabs.swift:90-101); the simulator's status
// bar can't be hidden from the app (src/sim), so it stays.

/** DoublePanelView: spring duration 0.3 s (the CSS side matches, workspaces.css) */
const DURATION = 300
/** `swipeThreshold` 300 pt/s */
const SWIPE_VELOCITY = 0.3

export function WorkspacesDrawer(_props: SheetProps) {
  const sheet = useSheet()
  const dismissSheet = useApp((s) => s.dismissSheet)
  const showToast = useApp((s) => s.showToast)
  const workspace = useApp((s) => s.fx.workspace)
  const device = useDevice()
  const width = device.width - 60
  const panel = useRef<HTMLDivElement>(null)
  const dim = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x0: number; y0: number; t0: number; dx: number; owned: boolean | null; id: number } | null>(null)
  const dragged = useRef(false)
  const more = useRef<HTMLSpanElement>(null)

  const close = () => (sheet ? sheet.dismiss() : dismissSheet())
  const notInPrototype = () => showToast('Not in the prototype')

  // ---- pan left to close (the drawer follows the finger; the dim follows the progress)
  const scale = () => {
    const el = panel.current
    return el ? el.getBoundingClientRect().width / el.offsetWidth || 1 : 1
  }
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, owned: null, id: e.pointerId }
    dragged.current = false
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id || d.owned === false) return
    const s = scale()
    const dx = (e.clientX - d.x0) / s
    const dy = (e.clientY - d.y0) / s
    if (d.owned === null) {
      if (Math.hypot(dx, dy) < 8) return
      // navigationPanGestureSlopeThreshold 0.6: a mostly horizontal pan to the left
      d.owned = dx < 0 && Math.abs(dy) / Math.abs(dx) < 0.6
      if (!d.owned) return
      panel.current?.setPointerCapture?.(e.pointerId)
      dragged.current = true
      if (panel.current) panel.current.style.transition = 'none'
      if (dim.current) dim.current.style.transition = 'none'
    }
    e.stopPropagation()
    d.dx = Math.min(0, dx)
    if (panel.current) panel.current.style.transform = `translateX(${d.dx}px)`
    if (dim.current) dim.current.style.opacity = String(1 + d.dx / width)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.owned) return
    const v = -d.dx / Math.max(1, performance.now() - d.t0)
    if (panel.current) panel.current.style.transition = ''
    if (dim.current) dim.current.style.transition = ''
    if (-d.dx > width / 2 || v > SWIPE_VELOCITY) {
      // finish from where the finger let go (the closing class can't take over an inline transform)
      if (panel.current) panel.current.style.transform = 'translateX(calc(-100% - 12px))'
      if (dim.current) dim.current.style.opacity = '0'
      close()
    } else {
      if (panel.current) panel.current.style.transform = ''
      if (dim.current) dim.current.style.opacity = ''
    }
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (!dragged.current) return
    dragged.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  const host = `${workspace.domain}.slack.com`
  return (
    <div className="ws-switcher" style={{ ['--ws-width' as string]: `${width}px`, ['--ws-dur' as string]: `${DURATION}ms` }}>
      <div ref={dim} className="ws-dim" onClick={close} role="button" aria-label="Close workspace panel" />
      <div
        ref={panel}
        className="ws-drawer"
        role="dialog"
        aria-label="Workspaces"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div className="ws-header">
          <div className="ws-header__title">Workspaces</div>
        </div>
        <div className="ios-scroll ws-list">
          <EntityRow
            size="extraLarge"
            selected
            ornament={
              <span className="ws-avatar">
                <SKWorkspaceAvatar name={workspace.name} initials={workspace.initials} src={workspace.iconUrl} size="extraLarge" />
                {/* .active: a 3 pt contentPrimary ring 3 pt outside the avatar, radius 14 + 6 (SKWorkspaceAvatar.swift:276-280, 614-644) */}
                <span className="ws-avatar__ring" />
              </span>
            }
            title={workspace.name}
            subtitle={host}
            subtitleColor="var(--dt_color_content_secondary)"
            subtitleLines={1}
            accessories={
              // the "…" accessory takes its own taps (the row doesn't also get selected)
              <span ref={more} className="ws-more" onClick={(e) => e.stopPropagation()}>
                <SKIconButton
                  icon="ellipsis_horizontal_filled"
                  size="small"
                  iconColor="var(--dt_color_content_primary)"
                  selectedIconColor="var(--dt_color_content_secondary)"
                  accessibilityLabel={`${workspace.name}, More Options`}
                  onClick={() =>
                    // WorkspacesViewModel.swift:222-227: Invite Members (when you can invite), then a destructive Sign Out
                    openMenu({
                      anchor: more.current,
                      sections: [
                        {
                          items: [
                            { title: 'Invite Members', icon: 'user_add', onSelect: notInPrototype },
                            { title: 'Sign Out', icon: 'sign_out', destructive: true, onSelect: notInPrototype },
                          ],
                        },
                      ],
                    })
                  }
                />
              </span>
            }
            // tapping the current workspace just closes the panel (WorkspacesViewController.swift:452-457)
            onClick={close}
            data-qa="ws_current"
          />
        </div>
        <div className="ws-separator" />
        <div className="ws-options">
          <OptionRow icon="plus" title="Add a Workspace" onClick={notInPrototype} />
          <OptionRow icon="settings" title="Preferences" onClick={notInPrototype} />
          <OptionRow icon="help" title="Help" onClick={notInPrototype} />
        </div>
      </div>
    </div>
  )
}

/** SKGenericEntity .small: a clear 24 pt box with a 20 pt contentSecondary icon, .body contentPrimary (:334-376). */
function OptionRow({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return <EntityRow size="small" ornament={<Icon name={icon} size={20} color="var(--dt_color_content_secondary)" />} title={title} onClick={onClick} />
}
