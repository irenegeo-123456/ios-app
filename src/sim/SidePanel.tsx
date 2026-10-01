import { DEVICES } from './devices'
import { useDevice, useSim } from './store'
import { useKitPanel } from './panel'
import { useTheme } from '../theme/ThemeStyle'
import { PRESETS } from '../theme/presets'
import { asset } from '../lib/asset'

// The prototype panel beside the phone: what's running (and what's wrong with it), its scenes, and the simulator's
// settings. Prototypes fill in their title, scenes and problems through useKitPanel (src/kit/boot.ts).

export function SidePanel() {
  const device = useDevice()
  const { appearance, finish, clock, sounds, slackbotTab, contrast, set } = useSim()
  const { title, subtitle, scenes, links, problems, prototypes, current } = useKitPanel()
  const themeId = useTheme((s) => s.id)
  const setPreset = useTheme((s) => s.setPreset)
  return (
    <aside className="sim-panel" aria-label="Prototype panel">
      <header className="sim-panel__head">
        <div className="sim-panel__eyebrow">Slack for iOS · prototype kit</div>
        <div className="sim-panel__title">{title}</div>
        {subtitle && <div className="sim-panel__subtitle">{subtitle}</div>}
        {prototypes.length > 0 && (
          <select
            className="sim-select sim-panel__switcher"
            value={current ?? ''}
            onChange={(e) => (location.href = asset(e.target.value ? `/?proto=${e.target.value}` : '/'))}
            aria-label="Open a prototype"
          >
            <option value="">Northstar demo</option>
            {prototypes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </header>

      {problems.length > 0 && (
        <section className="sim-panel__section sim-panel__problems">
          <h3>
            {problems.length} thing{problems.length === 1 ? '' : 's'} to fix
          </h3>
          <ul>
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {scenes.length > 0 && (
        <section className="sim-panel__section">
          <h3>Scenes</h3>
          <div className="sim-panel__scenes">
            {scenes.map((s, i) => (
              <button key={i} type="button" className="sim-btn sim-btn--scene" onClick={s.run}>
                <span className="sim-btn__num">{i === 0 ? '↺' : i}</span>
                {s.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="sim-panel__section">
        <h3>Device</h3>
        <select className="sim-select" value={device.id} onChange={(e) => set({ device: e.target.value, finish: DEVICES.find((d) => d.id === e.target.value)!.finishes[0].id })}>
          {DEVICES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.width}×{d.height})
            </option>
          ))}
        </select>
        <div className="sim-swatches">
          {device.finishes.map((f) => (
            <button key={f.id} type="button" title={f.name} className={`sim-swatch${f.id === finish ? ' is-selected' : ''}`} style={{ background: f.frame }} onClick={() => set({ finish: f.id })} />
          ))}
        </div>
      </section>

      <section className="sim-panel__section">
        <h3>Appearance</h3>
        <div className="sim-seg">
          {(['light', 'dark'] as const).map((a) => (
            <button key={a} type="button" className={a === appearance ? 'is-selected' : ''} onClick={() => set({ appearance: a })}>
              {a === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
        <select className="sim-select sim-panel__theme" value={themeId} onChange={(e) => setPreset(e.target.value)} aria-label="Theme">
          <option value="default">Theme: Slack default (aubergine)</option>
          {['Single color', 'Vision assistive', 'Fun and new', 'Updated classics'].map((section) => (
            <optgroup key={section} label={section}>
              {PRESETS.filter((p) => p.section === section).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </section>

      <section className="sim-panel__section">
        <h3>Status bar clock</h3>
        <div className="sim-seg">
          {['9:41', 'live'].map((c) => (
            <button key={c} type="button" className={c === clock ? 'is-selected' : ''} onClick={() => set({ clock: c })}>
              {c === 'live' ? 'Live' : c}
            </button>
          ))}
        </div>
        <label className="sim-check">
          <input type="checkbox" checked={sounds} onChange={(e) => set({ sounds: e.target.checked })} /> Notification sounds
        </label>
        <label className="sim-check">
          <input type="checkbox" checked={slackbotTab} onChange={(e) => set({ slackbotTab: e.target.checked })} /> Slackbot tab (iOS 26 rollout)
        </label>
        <label className="sim-check">
          <input type="checkbox" checked={contrast === 'high'} onChange={(e) => set({ contrast: e.target.checked ? 'high' : 'normal' })} /> Increase Contrast
        </label>
      </section>

      {links.length > 0 && (
        <section className="sim-panel__section">
          <h3>Kit</h3>
          <nav className="sim-panel__links">
            {links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
        </section>
      )}
    </aside>
  )
}
