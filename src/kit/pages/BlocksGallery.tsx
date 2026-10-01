import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { installTouchGestures } from '../../app/gestures'
import { BlockSurface, type SurfaceKind } from '../../blocks'
import { buildSpecimen, specimenSurfaces, SPECIMENS, type BlockSpecimen } from '../../blocks/gallery'
import { whenNoScreen } from '../../blocks/present'
import { kitBlockId } from '../../blocks/ids'
import { setExpanded, setPending, setSurfaceError } from '../../blocks/state'
import type { KitAction, KitBlock } from '../../blocks/types'
import { validateBlocks } from '../../blocks/validate'
import './BlocksGallery.css'

// ?kit=blocks: every Block Kit block and element (src/blocks, spec reference/ios/specs/blockkit.md) in the states Slack
// iOS draws, on each surface it's allowed on (a message, a modal, an App Home), light and dark side by side. Each shows
// the snippet to copy into a prototype's `blocks: [ … ]` (written with `bk` from src/kit); the preview is that same
// snippet, evaluated. Tapping works: actions show here as they'd reach the app; pickers, editors and confirm alerts
// open in the simulator only. ?only=card,table shows just those; ?surface=modal one surface; ?dark=1 darkens the page.

const SURFACES: { kind: SurfaceKind; title: string }[] = [
  { kind: 'message', title: 'Message' },
  { kind: 'modal', title: 'Modal' },
  { kind: 'home', title: 'App Home' },
]

/** How long the gallery's pretend app takes to answer, so a tapped button shows its spinner. */
const ANSWER_MS = 700

export default function BlocksGallery() {
  const params = new URLSearchParams(location.search)
  const only = params.get('only')?.split(',').filter(Boolean)
  const [dark, setDark] = useState(params.get('dark') === '1')
  const [q, setQ] = useState('')
  const [shownSurfaces, setShownSurfaces] = useState<SurfaceKind[]>(() => {
    const s = params.get('surface')?.split(',').filter((x): x is SurfaceKind => SURFACES.some((y) => y.kind === x))
    return s?.length ? s : SURFACES.map((x) => x.kind)
  })
  const [event, setEvent] = useState<{ text: string; n: number } | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  // Pickers, editors and alerts need the simulated screen: say what would open instead.
  useEffect(() => {
    whenNoScreen((what) => setEvent((e) => ({ text: `Opens ${SHEET_NAMES[what] ?? what} (in the simulator)`, n: (e?.n ?? 0) + 1 })))
    return () => whenNoScreen(null)
  }, [])
  useEffect(() => {
    if (!event) return
    const t = setTimeout(() => setEvent(null), 2600)
    return () => clearTimeout(t)
  }, [event])

  const report = (a: KitAction, s: BlockSpecimen, surface: SurfaceKind) => setEvent((e) => ({ text: `${s.id} · ${surface}: ${describe(a)}`, n: (e?.n ?? 0) + 1 }))

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    // snapshot fixtures (gallery.ts `fixture`) only show when ?only= names them
    return SPECIMENS.filter((s) => (only ? only.includes(s.id) : !s.fixture) && (!needle || `${s.name} ${s.group} ${s.id}`.toLowerCase().includes(needle)))
  }, [only, q])
  const groups = [...new Set(SPECIMENS.filter((s) => !s.fixture).map((s) => s.group))]

  return (
    <div className={`kit-page bkg-page ${dark ? 'is-dark' : ''}`} data-kit-ready={ready ? '' : undefined}>
      <header className="kit-page__head">
        <h1>Block Kit</h1>
        <p>
          Every block and element as Slack iOS draws it (<code>src/blocks</code>, spec reference/ios/specs/blockkit.md), on each surface it’s allowed on.
          Copy a snippet into a prototype’s <code>blocks: [ … ]</code> or an app’s <code>say</code>, <code>openModal</code> or <code>publishHome</code>:{' '}
          <code>{"import { bk } from '../../src/kit'"}</code>. Tapping works; pickers, editors and confirm alerts open in the simulator.
        </p>
        <div className="kit-page__tools">
          {SURFACES.map((s) => (
            <label key={s.kind}>
              <input
                type="checkbox"
                checked={shownSurfaces.includes(s.kind)}
                onChange={(e) => setShownSurfaces((cur) => (e.target.checked ? SURFACES.map((x) => x.kind).filter((k) => k === s.kind || cur.includes(k)) : cur.filter((k) => k !== s.kind)))}
              />{' '}
              {s.title}
            </label>
          ))}
          <label>
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark page
          </label>
        </div>
      </header>
      <div className="bkg">
        <nav className="bkg__toc">
          <input className="bkg__filter" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} />
          {groups.map((g) => (
            <div key={g}>
              <h2>{g}</h2>
              {SPECIMENS.filter((s) => s.group === g && !s.fixture).map((s) => (
                <a key={s.id} href={`#${s.id}`}>
                  {s.name}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <main>
          {shown.length === 0 && <p className="bkg__empty">No block matches.</p>}
          {shown.map((s) => (
            <Specimen key={s.id} s={s} surfaces={shownSurfaces} onAction={report} />
          ))}
        </main>
      </div>
      {event && (
        <div key={event.n} className="kit-copied bkg-event" role="status">
          {event.text}
        </div>
      )}
    </div>
  )
}

function Specimen({ s, surfaces, onAction }: { s: BlockSpecimen; surfaces: SurfaceKind[]; onAction: (a: KitAction, s: BlockSpecimen, surface: SurfaceKind) => void }) {
  const built = useMemo(() => {
    try {
      return { blocks: buildSpecimen(s.code) }
    } catch (e) {
      return { error: String(e) }
    }
  }, [s.code])
  const blocks = built.blocks
  const allowed = blocks ? specimenSurfaces(s, blocks) : []
  const drawn = allowed.filter((k) => surfaces.includes(k))
  const issues = useMemo(() => (blocks && !s.internal ? allowed.flatMap((k) => validateBlocks(blocks, k).map((i) => `${k}: ${i.path} ${i.message}`)) : []), [blocks, allowed, s.internal])

  return (
    <section className="bkg-spec" id={s.id}>
      <div className="bkg-spec__head">
        <h2 className="bkg-spec__name">{s.name}</h2>
        {s.snapshot && <span className="bkg-spec__snapshot">{s.snapshot}</span>}
      </div>
      <p className="bkg-spec__about">
        {s.about} <span className="bkg-spec__where">{allowed.map((k) => SURFACES.find((x) => x.kind === k)!.title).join(', ')}</span>
      </p>
      <Code text={s.code} />
      {built.error && <p className="bkg-spec__issue">The snippet doesn’t run: {built.error}</p>}
      {issues.map((i) => (
        <p key={i} className="bkg-spec__issue">
          {i}
        </p>
      ))}
      {blocks && (
        <div className="bkg-rows">
          {drawn.map((kind) => (
            <div className="bkg-row" key={kind}>
              <div className="bkg-row__label">{SURFACES.find((x) => x.kind === kind)!.title}</div>
              <Preview s={s} blocks={blocks} kind={kind} appearance="light" onAction={onAction} />
              <Preview s={s} blocks={blocks} kind={kind} appearance="dark" onAction={onAction} />
            </div>
          ))}
          {drawn.length === 0 && <p className="bkg__empty">Not shown on the surfaces you picked.</p>}
        </div>
      )}
    </section>
  )
}

/** One 393 pt preview: an .ios-screen in light or dark with the blocks where the surface puts them. */
function Preview({ s, blocks, kind, appearance, onAction }: { s: BlockSpecimen; blocks: KitBlock[]; kind: SurfaceKind; appearance: 'light' | 'dark'; onAction: (a: KitAction, s: BlockSpecimen, surface: SurfaceKind) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? installTouchGestures(ref.current) : undefined), [])
  // Light and dark share the state, so what you pick in one shows in both.
  const stateKey = `gallery:${s.id}:${kind}`
  useEffect(() => {
    if (appearance !== 'light') return
    if (s.pending) setPending(stateKey, s.pending.blockId, s.pending.actionId)
    for (const [blockId, error] of Object.entries(s.errors ?? {})) setSurfaceError(stateKey, blockId, error)
    for (const i of s.expand ?? []) if (blocks[i]) setExpanded(`${stateKey}|${kitBlockId(blocks[i], i)}`, true)
  }, [appearance, s, stateKey, blocks])
  return (
    <div ref={ref} className="ios-screen bkg-screen" data-appearance={appearance}>
      <div
        className={`bkg-frame bkg-frame--${s.fixture ? 'fixture' : kind}`}
        data-specimen={`${s.id}/${kind}`}
        style={s.fixture ? { ['--fixture-top' as string]: `${s.fixture.top}px` } : undefined}
      >
        <BlockSurface
          blocks={blocks}
          surface={kind}
          stateKey={stateKey}
          interactive={s.interactive ?? true}
          onAction={async (a) => {
            onAction(a, s, kind)
            await new Promise((r) => setTimeout(r, ANSWER_MS))
          }}
        />
      </div>
    </div>
  )
}

function Code({ text }: { text: string }): ReactNode {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bkg-code">
      <pre>
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

/** The sheets block elements open (src/blocks/register.ts), by what they're for. */
const SHEET_NAMES: Record<string, string> = {
  'bk-option-sheet': 'the options sheet',
  'bk-option-picker': 'the option picker',
  'bk-entity-picker': 'the people and channel picker',
  'bk-datetime': 'the date / time sheet',
  'bk-text-editor': 'the text editor',
}

/** An action as the app would get it. */
function describe(a: KitAction): string {
  const what = [
    a.value !== undefined && `value “${a.value}”`,
    a.selectedOptions && `options ${a.selectedOptions.map((o) => `“${o.value}”`).join(', ') || 'none'}`,
    a.selectedUser && `user ${a.selectedUser}`,
    a.selectedUsers && `users ${a.selectedUsers.join(', ')}`,
    a.selectedChannel && `channel ${a.selectedChannel}`,
    a.selectedChannels && `channels ${a.selectedChannels.join(', ')}`,
    a.selectedDate && `date ${a.selectedDate}`,
    a.selectedTime && `time ${a.selectedTime}`,
    a.selectedDateTime && `date_time ${a.selectedDateTime}`,
    a.files && `${a.files.length} file(s)`,
  ].filter(Boolean)
  return `block_actions ${a.type} “${a.actionId}” in block “${a.blockId}”${what.length ? `, ${what.join(', ')}` : ''}`
}
