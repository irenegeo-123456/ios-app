import { useEffect, useState } from 'react'
import type { Device } from './devices'
import { useSim } from './store'

// iOS's status bar: time on the leading side of the Dynamic Island, cellular, Wi-Fi and battery on the trailing
// side. `tone` follows the screen underneath it (UIStatusBarStyle): 'light' draws white glyphs over dark content
// (Slack's themed Home header), 'dark' draws black glyphs (a white navigation bar). Glyph geometry follows the
// SF Symbols iOS draws there (cellularbars, wifi, battery.100) at the sizes iOS uses in the status bar.

/** 'hidden' is prefersStatusBarHidden (the media viewer) */
export type StatusBarTone = 'light' | 'dark' | 'hidden'

function useClock(clock: string) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (clock !== 'live') return
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [clock])
  if (clock !== 'live') {
    const [h, m] = clock.split(':').map(Number)
    if (Number.isFinite(h) && Number.isFinite(m)) return `${h % 12 || 12}:${String(m).padStart(2, '0')}`
  }
  return `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function StatusBar({ device, tone }: { device: Device; tone: StatusBarTone }) {
  const clock = useSim((s) => s.clock)
  const time = useClock(clock)
  const color = tone === 'light' ? '#fff' : '#000'
  const island = device.island === 'dynamic-island'
  // With a Dynamic Island the clock and the glyphs sit level with the island's middle, at the x positions measured on
  // iOS 26 screenshots (devices.ts); without one they're centered in a 20 pt bar.
  const f = device.islandFrame ?? { top: 11, width: 126, height: 37 }
  const centerY = island ? f.top + f.height / 2 : device.statusBar / 2
  const clockX = device.clockX ?? device.width * 0.18
  const glyphsX = device.width - (device.glyphsFromRight ?? device.width * 0.19)
  return (
    <div className="ios-statusbar" style={{ height: device.statusBar, color, opacity: tone === 'hidden' ? 0 : 1, transition: 'opacity 0.25s' }} aria-hidden>
      <div className="ios-statusbar__time" style={island ? { left: clockX - 40, width: 80, top: centerY - 11 } : { left: 0, right: 0, top: centerY - 10, fontSize: 15 }}>
        {time}
      </div>
      <div className="ios-statusbar__glyphs" style={island ? { left: glyphsX - 45, width: 90, top: centerY - 6.5 } : { right: 6, top: centerY - 6.5 }}>
        <Cellular />
        <Wifi />
        <Battery tone={tone} />
      </div>
    </div>
  )
}

function Cellular() {
  return (
    <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor">
      <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.9" />
      <rect x="5.1" y="5.2" width="3.2" height="6.8" rx="0.9" />
      <rect x="10.2" y="2.7" width="3.2" height="9.3" rx="0.9" />
      <rect x="15.3" y="0" width="3.2" height="12" rx="0.9" />
    </svg>
  )
}

function Wifi() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
      <path d="M8.5 2.36c2.46 0 4.7.95 6.38 2.5.13.12.33.12.45-.01l1.2-1.22a.33.33 0 0 0 0-.47A11.43 11.43 0 0 0 8.5 0C5.45 0 2.67 1.18.47 3.16a.33.33 0 0 0 0 .47l1.2 1.22c.12.13.32.13.45.01A9.37 9.37 0 0 1 8.5 2.36Z" />
      <path d="M8.5 6.2c1.39 0 2.66.52 3.63 1.37.13.12.33.12.45-.01l1.2-1.22a.33.33 0 0 0-.01-.48 7.53 7.53 0 0 0-10.54 0 .33.33 0 0 0-.01.48l1.2 1.22c.12.13.32.13.45.01A5.47 5.47 0 0 1 8.5 6.2Z" />
      <path d="M11.02 8.53a.33.33 0 0 0-.01-.48 3.7 3.7 0 0 0-5.02 0 .33.33 0 0 0-.01.48l2.28 2.32c.13.13.35.13.48 0l2.28-2.32Z" />
    </svg>
  )
}

function Battery({ tone }: { tone: StatusBarTone }) {
  return (
    <svg width="28" height="13" viewBox="0 0 28 13">
      <rect x="0.5" y="0.5" width="24" height="12" rx="3.8" fill="none" stroke="currentColor" strokeOpacity={tone === 'light' ? 0.4 : 0.35} />
      <rect x="2" y="2" width="21" height="9" rx="2.5" fill="currentColor" />
      <path d="M26 4.5v4c.8-.34 1.4-1.1 1.4-2s-.6-1.66-1.4-2Z" fill="currentColor" fillOpacity={tone === 'light' ? 0.5 : 0.4} />
    </svg>
  )
}
