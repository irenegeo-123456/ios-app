import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Device } from './Device'
import { useDevice, useSim } from './store'
import { useScreenChrome } from './screen'
import { SidePanel } from './SidePanel'

// The page: a Simulator.app-style window (title bar with the device's name and OS, Home / Screenshot / Rotate
// buttons) holding the phone, and the prototype panel beside it. The whole stage scales down to fit the browser
// window; the phone keeps its real point size inside (one CSS px = one iOS point), so everything the app lays out
// uses iOS numbers directly.

const TITLE_H = 52
const PANEL_W = 300
const GAP = 40

export function Simulator({ children }: { children: ReactNode }) {
  const device = useDevice()
  const { finish, appearance, chrome, panel, set } = useSim()
  const statusBar = useScreenChrome((s) => s.statusBar)
  const goHome = useScreenChrome((s) => s.goHome)
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const frame = device.bezel + 4
  const devW = chrome === 'screen' ? device.width : device.width + 2 * frame
  const devH = chrome === 'screen' ? device.height : device.height + 2 * frame + (device.homeButton ? 180 : 0)
  const winH = devH + (chrome === 'window' ? TITLE_H : 0)
  const showPanel = chrome === 'window' && panel

  useLayoutEffect(() => {
    const fit = () => {
      const pad = chrome === 'screen' ? 0 : 48
      const availW = window.innerWidth - pad - (showPanel ? PANEL_W + GAP : 0)
      const availH = window.innerHeight - pad
      setScale(Math.min(1, availW / devW, availH / winH))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [devW, winH, chrome, showPanel])

  useLayoutEffect(() => {
    document.documentElement.dataset.simChrome = chrome
    document.documentElement.dataset.simAppearance = appearance
  }, [chrome, appearance])

  const phone = (
    <Device device={device} finish={finish} appearance={appearance} statusBar={statusBar} bare={chrome === 'screen'} onHome={goHome}>
      {children}
    </Device>
  )

  return (
    <div className={`sim-page sim-page--${chrome}`}>
      <div className="sim-stage" ref={stageRef}>
        <div className="sim-scaled" style={{ width: devW * scale, height: winH * scale }}>
          <div className="sim-window" style={{ width: devW, transform: `scale(${scale})` }} data-sim-scale={scale}>
            {chrome === 'window' && (
              <div className="sim-titlebar" style={{ height: TITLE_H }}>
                <div className="sim-titlebar__lights" aria-hidden>
                  <i />
                  <i />
                  <i />
                </div>
                <div className="sim-titlebar__title">
                  <strong>{device.name}</strong>
                  <span>iOS 26.0</span>
                </div>
                <div className="sim-titlebar__tools">
                  <button type="button" title="Home (⇧⌘H)" onClick={goHome}>
                    <HomeGlyph />
                  </button>
                  <button type="button" title={appearance === 'dark' ? 'Light appearance (⇧⌘A)' : 'Dark appearance (⇧⌘A)'} onClick={() => set({ appearance: appearance === 'dark' ? 'light' : 'dark' })}>
                    {appearance === 'dark' ? <SunGlyph /> : <MoonGlyph />}
                  </button>
                  <button type="button" title={panel ? 'Hide the prototype panel' : 'Show the prototype panel'} onClick={() => set({ panel: !panel })}>
                    <PanelGlyph />
                  </button>
                </div>
              </div>
            )}
            {phone}
          </div>
        </div>
        {showPanel && (
          <div className="sim-panel-slot" style={{ width: PANEL_W, height: Math.max(winH * scale, 520) }}>
            <SidePanel />
          </div>
        )}
      </div>
    </div>
  )
}

const HomeGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="12" height="12" rx="3.5" />
  </svg>
)
const SunGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="9" cy="9" r="3.2" />
    <path d="M9 1.8v1.6M9 14.6v1.6M1.8 9h1.6M14.6 9h1.6M3.9 3.9l1.1 1.1M13 13l1.1 1.1M3.9 14.1 5 13M13 5l1.1-1.1" />
  </svg>
)
const MoonGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M14.8 11.2A6.2 6.2 0 0 1 6.8 3.2a6.2 6.2 0 1 0 8 8Z" />
  </svg>
)
const PanelGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="14" height="12" rx="2.5" />
    <path d="M11 3v12" />
  </svg>
)
