import { useMemo, useState } from 'react'
import { ASSETS, type AssetKind, type KitAsset } from '../assets'
import { COMPANY_PERSONAS } from '../../data/personas'
import { asset } from '../../lib/asset'

// ?kit=assets: the asset library (src/kit/assets.ts, shared with the web kit). Click anything to copy what to write in
// a prototype. Internal-only Slack assets: public/kit/README.md says where each came from.

type Section = 'people' | 'illustrated' | 'companies' | 'apps' | 'files' | 'thumbnails'

const SECTIONS: { id: Section; label: string; intro: string; kinds: AssetKind[] }[] = [
  {
    id: 'people',
    label: 'Photo personas',
    intro: 'Slack’s approved people personas. Photos are for marketing-style screens; for screens shown inside Slack, use the illustrated personas.',
    kinds: ['persona'],
  },
  { id: 'illustrated', label: 'Illustrated personas', intro: 'For in-product screens, so nobody mistakes a persona for a real teammate. People you add without an avatar get one of these.', kinds: ['illustrated'] },
  { id: 'companies', label: 'Companies', intro: 'Slack’s approved company personas. Pick the one that fits your audience.', kinds: ['logo'] },
  { id: 'apps', label: 'App icons', intro: 'For defineApp({ icon }), Block Kit images and link previews.', kinds: ['app'] },
  { id: 'files', label: 'Files', intro: 'Images to attach with imageFile(…), and file-type icons.', kinds: ['file-preview', 'file-type'] },
  { id: 'thumbnails', label: 'Thumbnails', intro: 'Gallery card images for prototypes without a screenshot.', kinds: ['thumbnail'] },
]

export default function AssetsPage() {
  const [section, setSection] = useState<Section>('people')
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const current = SECTIONS.find((s) => s.id === section)!
  const query = q.trim().toLowerCase()
  const items = useMemo(
    () => ASSETS.filter((a) => (query ? true : current.kinds.includes(a.kind)) && (!query || [a.id, a.label, a.note ?? ''].some((s) => s.toLowerCase().includes(query)))),
    [current, query],
  )
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied((c) => (c === text ? null : c)), 1600)
  }
  const company = (name: string) => COMPANY_PERSONAS.find((c) => c.name.toLowerCase().includes(name))

  return (
    <div className="kit-page" data-kit-ready>
      <header className="kit-page__head">
        <h1>Assets</h1>
        <p>
          Click anything to copy what to write in your prototype (<code>import {'{ persona, logo, appIcon, … }'} from '../../src/kit'</code>).
        </p>
        <div className="kit-page__tools">
          <input placeholder="Search every asset" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="kit-segments" role="tablist">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={!query && s.id === section} onClick={() => (setSection(s.id), setQ(''))}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {!query && <p className="kit-page__intro">{current.intro}</p>}
      </header>
      {!query && section === 'companies' && (
        <div className="kit-assets kit-assets--rows">
          {COMPANY_PERSONAS.map((c) => {
            const snippet = c.logo ? `workspace: { name: '${c.name}', icon: logo('${c.domain}') },` : `workspace: { name: '${c.name}', initials: '${c.initial}' },`
            return (
              <button key={c.name} type="button" className="kit-asset kit-asset--row" onClick={() => copy(snippet)}>
                {c.logo ? <img src={asset(c.logo)} alt="" /> : <span className="kit-asset__initial">{c.initial}</span>}
                <span className="kit-asset__text">
                  <b>{c.name}</b>
                  <span>
                    {c.bestFor} · #{c.channel}
                    {c.connect ? ` · Slack Connect partner: ${c.connect}` : ''}
                  </span>
                  <code>{snippet}</code>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="kit-assets">
        {items
          .filter((a) => query || section !== 'companies' || !company(a.label.toLowerCase()))
          .map((a: KitAsset) => (
            <button key={`${a.kind}:${a.id}`} type="button" className={`kit-asset kit-asset--${a.kind}`} title={a.note ?? a.src} onClick={() => copy(a.snippet)}>
              <img src={asset(a.src)} alt="" loading="lazy" />
              <b>{a.label}</b>
              <code>{copied === a.snippet ? 'Copied' : a.snippet}</code>
            </button>
          ))}
      </div>
      {copied && <div className="kit-copied">Copied: {copied}</div>}
    </div>
  )
}
