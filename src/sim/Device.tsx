import type { ReactNode } from 'react'
import type { Device as DeviceSpec } from './devices'
import { StatusBar, type StatusBarTone } from './StatusBar'
import type { Appearance } from './store'
import { useSim } from './store'

// The phone: a metal frame and black bezel around the screen, side buttons, the Dynamic Island, the status bar and
// the home indicator. The screen (`.ios-screen`) is the app's viewport, exactly device.width × device.height CSS px,
// with its corners clipped like the display. Everything the app draws goes inside it; the status bar, island and home
// indicator sit on top, the way iOS composites them over the app.

interface Props {
  device: DeviceSpec
  finish: string
  appearance: Appearance
  statusBar: StatusBarTone
  /** screen only, no frame (chrome=screen) */
  bare?: boolean
  onHome?: () => void
  children: ReactNode
}

export function Device({ device, finish, appearance, statusBar, bare, onHome, children }: Props) {
  const f = device.finishes.find((x) => x.id === finish) ?? device.finishes[0]
  const contrast = useSim((s) => s.contrast)
  const screen = (
    <div
      className="ios-screen"
      data-appearance={appearance}
      data-contrast={contrast === 'high' ? 'high' : undefined}
      data-device={device.id}
      style={{
        width: device.width,
        height: device.height,
        borderRadius: bare ? 0 : device.radius,
        ['--safe-top' as string]: `${device.safeTop}px`,
        ['--safe-bottom' as string]: `${device.safeBottom}px`,
        ['--screen-w' as string]: `${device.width}px`,
        ['--screen-h' as string]: `${device.height}px`,
      }}
    >
      <div className="ios-screen__app">{children}</div>
      <StatusBar device={device} tone={statusBar} />
      {device.island === 'dynamic-island' && (
        <div
          className="ios-island"
          aria-hidden
          style={
            device.islandFrame && {
              top: device.islandFrame.top,
              width: device.islandFrame.width,
              height: device.islandFrame.height,
              marginLeft: -device.islandFrame.width / 2,
              borderRadius: device.islandFrame.height / 2,
            }
          }
        />
      )}
      {!device.homeButton && <div className={`ios-home-indicator ios-home-indicator--${appearance === 'dark' ? 'light' : 'dark'}`} aria-hidden />}
    </div>
  )
  if (bare) return screen

  const b = device.bezel
  const frame = 4
  const outer = device.radius ? device.radius + b + frame : 44
  const w = device.width + 2 * (b + frame)
  const h = device.height + 2 * (b + frame) + (device.homeButton ? 180 : 0)
  return (
    <div className="ios-device" style={{ width: w, height: h, ['--frame' as string]: f.frame, ['--edge' as string]: f.edge }}>
      <SideButtons device={device} h={h} />
      <div className="ios-device__frame" style={{ borderRadius: outer }}>
        <div className="ios-device__bezel" style={{ inset: frame, borderRadius: outer - frame, padding: b, paddingTop: device.homeButton ? 90 : b }}>
          {screen}
          {device.homeButton && (
            <button type="button" className="ios-device__home-button" onClick={onHome} aria-label="Home">
              <span />
            </button>
          )}
          {device.homeButton && <div className="ios-device__earpiece" aria-hidden />}
        </div>
      </div>
    </div>
  )
}

function SideButtons({ device, h }: { device: DeviceSpec; h: number }) {
  // Positions as fractions of the frame height, measured from Apple's product images.
  const s = h / 898
  if (device.homeButton) {
    return (
      <>
        <i className="ios-device__btn ios-device__btn--left" style={{ top: 108 * s, height: 28 * s }} />
        <i className="ios-device__btn ios-device__btn--left" style={{ top: 168 * s, height: 56 * s }} />
        <i className="ios-device__btn ios-device__btn--left" style={{ top: 238 * s, height: 56 * s }} />
        <i className="ios-device__btn ios-device__btn--right" style={{ top: 168 * s, height: 70 * s }} />
      </>
    )
  }
  return (
    <>
      <i className="ios-device__btn ios-device__btn--left" style={{ top: 170 * s, height: 34 * s }} />
      <i className="ios-device__btn ios-device__btn--left" style={{ top: 236 * s, height: 62 * s }} />
      <i className="ios-device__btn ios-device__btn--left" style={{ top: 312 * s, height: 62 * s }} />
      <i className="ios-device__btn ios-device__btn--right" style={{ top: 260 * s, height: 98 * s }} />
      {device.id.startsWith('iphone-17') || device.id.startsWith('iphone-16') ? (
        <i className="ios-device__btn ios-device__btn--right ios-device__btn--camera" style={{ top: 560 * s, height: 60 * s }} />
      ) : null}
    </>
  )
}
