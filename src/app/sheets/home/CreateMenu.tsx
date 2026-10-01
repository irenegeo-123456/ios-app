import { useEffect } from 'react'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { openOrToast } from '../shared'
import './home-sheets.css'

// The compose button's creation menu (Modules/Features/CreationEntryPoints/Implementation/; CE below =
// CreationEntryPointsView.swift). Not a sheet: a transparent full-screen overlay (.custom, presented without animation,
// HomeFeature.swift:198) in which a Liquid Glass card grows out of the compose button — from its 56 pt circle to a
// card with 32 pt corners, its bottom-right corner on the button's, spanning the screen 24 pt in from each side (the
// button's own inset), on the snappy spring (0.368 s) (CE:30,50-60,227-234,440-454,556-605,646-657). Home passes no
// tab-specific entry points, so it lists the tab-agnostic ones: Huddle and Channel (Add to-do needs the laterTodos flag,
// off by default) (CreationEntryPointsFeature+Dependencies.swift:77-80; HomeInteractor.swift:354-361), then the priority
// "Message" pill. No dimming on iOS 26 (CE:62-64,96-107); tapping outside or a swipe on the backdrop closes it
// (translation > 75 or velocity > 500, CE:38-42,664-708). Every choice collapses the card first, then routes (CE:377-379).

export function CreateMenu() {
  const sheet = useSheet()
  const closing = !!sheet?.closing

  // The real button goes transparent while its card is out, and comes back as the card collapses into it (CE:409-411, Feature:148-156).
  useEffect(() => {
    const fab = document.querySelector<HTMLElement>('.ios-screen .compose-fab')
    if (!fab) return
    fab.style.opacity = '0'
    return () => {
      fab.style.opacity = ''
    }
  }, [])
  useEffect(() => {
    if (!closing) return
    const fab = document.querySelector<HTMLElement>('.ios-screen .compose-fab')
    const t = setTimeout(() => fab && (fab.style.opacity = ''), 280)
    return () => clearTimeout(t)
  }, [closing])

  const go = (fn: () => void) => sheet?.dismiss(fn)
  const openDm = () => go(() => openOrToast(['compose', 'compose-message', 'new-message']))

  return (
    <div className="cr-overlay" onPointerDown={(e) => e.target === e.currentTarget && sheet?.dismiss()}>
      <div className="cr-card" role="menu" aria-label="Create New">
        <div className="cr-list">
          {/* SKGenericEntity .medium rows: a 36 pt box (radius 9) in theme.surfaceSecondary holding the icon in
              theme.contentPrimary, the title in bodyBold, the subtitle in caption contentSecondary (Presenter:193-223,314-352) */}
          <button type="button" className="cr-row" onClick={() => go(() => openOrToast(['new-huddle', 'huddle-picker', 'start-huddle']))} data-tap aria-label="New Huddle">
            <span className="cr-row__bg" />
            <span className="cr-row__box">
              <Icon name="headphones" size={20} />
            </span>
            <span className="cr-row__text">
              <span className="cr-row__title">Huddle</span>
              <span className="cr-row__subtitle">Start an audio or video chat</span>
            </span>
          </button>
          <button type="button" className="cr-row" onClick={() => go(() => openOrToast(['create-channel']))} data-tap aria-label="New Channel">
            <span className="cr-row__bg" />
            <span className="cr-row__box">
              <Icon name="channel" size={20} />
            </span>
            <span className="cr-row__text">
              <span className="cr-row__title">Channel</span>
              <span className="cr-row__subtitle">Organize teams and work</span>
            </span>
          </button>
        </div>
        {/* the priority button: 48 pt, a pill on iOS 26, 12 pt in, 1 pt outlineTertiary border, theme.baseInverseSecondary
            with the compose icon and "Message" (bodyBold) in the FAB's content color, 10 apart (CE:157-219,325-348,512-533) */}
        {/* VoiceOver: a11y_new_creation_entry_point with the title, "New Message" (CreationEntryPointsView.swift:530) */}
        <button type="button" className="cr-message" onClick={openDm} aria-label="New Message" data-tap>
          <Icon name="compose" size={20} />
          <span>Message</span>
        </button>
      </div>
    </div>
  )
}

