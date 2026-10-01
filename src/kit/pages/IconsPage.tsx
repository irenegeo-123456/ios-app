import { useMemo, useState } from 'react'
import { Icon, iconNames } from '../../icons/Icon'
import manifest from '../../icons/generated/manifest.json'

// ?kit=icons: every iOS icon (Icons.xcassets), searchable, with the SKIconManifest case that names it in Swift.

const caseOf: Record<string, string> = Object.fromEntries(Object.entries(manifest as Record<string, string>).map(([c, f]) => [f, c]))

export default function IconsPage() {
  const [q, setQ] = useState('')
  const [dark, setDark] = useState(false)
  const shown = useMemo(() => iconNames.filter((n) => !q || n.includes(q.toLowerCase().replace(/\s+/g, '_'))), [q])
  return (
    <div className={`kit-page ${dark ? 'is-dark' : ''}`} data-kit-ready>
      <header className="kit-page__head">
        <h1>Icons</h1>
        <p>
          {iconNames.length} icons from Slack iOS (Modules/Data/Icon/ResourceBundle/Icons.xcassets). Use <code>{'<Icon name="…" size={20} />'}</code>.
        </p>
        <div className="kit-page__tools">
          <input autoFocus placeholder="Search icons" value={q} onChange={(e) => setQ(e.target.value)} />
          <label>
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark
          </label>
        </div>
      </header>
      <div className="kit-icons">
        {shown.map((n) => (
          <button key={n} type="button" className="kit-icons__cell" title={`${n}\nSKIconManifest.${caseOf[n] ?? '?'}`} onClick={() => navigator.clipboard?.writeText(n)}>
            <Icon name={n} size={24} />
            <span>{n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
