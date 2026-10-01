import { useEffect, useState } from 'react'
import { loadAllPrototypes, type LoadedPrototype } from '../registry'
import { asset } from '../../lib/asset'

// ?kit=prototypes: every prototype in prototypes/, newest first, as cards. A card shows the prototype's thumbnail.png,
// or a live preview of its start screen, and whatever's wrong with it. Click to open it in the simulator.

export default function PrototypesGallery() {
  const [all, setAll] = useState<LoadedPrototype[] | null>(null)
  useEffect(() => {
    void loadAllPrototypes().then(setAll)
  }, [])
  return (
    <div className="kit-page" data-kit-ready={all ? 'ready' : undefined}>
      <header className="kit-page__head">
        <h1>Prototypes</h1>
        <p>
          Slack for iOS, one folder per idea in <code>prototypes/</code>. Make one with <code>npm run new -- my-idea</code>, or ask Claude. Guide:{' '}
          <code>docs/prototyping.md</code>.
        </p>
        <p>
          <a href={asset('/')}>Open the Northstar demo</a> · <a href={asset('/?kit=components')}>SlackKit components</a> · <a href={asset('/?kit=blocks')}>Block Kit</a> ·{' '}
          <a href={asset('/?kit=assets')}>Assets</a> · <a href={asset('/?kit=icons')}>Icons</a>
        </p>
      </header>
      {!all && <p>Loading…</p>}
      {all && all.length === 0 && <p>No prototypes yet.</p>}
      <div className="kit-cards">
        {all?.map((p) => (
          <a key={p.slug} className="kit-card" href={asset(`/?proto=${p.slug}`)} data-proto={p.slug}>
            <div className="kit-card__preview">
              {p.thumbnail ? (
                <img src={p.thumbnail} alt="" />
              ) : p.proto ? (
                <iframe title={p.slug} src={asset(`/?proto=${p.slug}&chrome=screen&panel=0&preview`)} loading="lazy" tabIndex={-1} />
              ) : (
                <div className="kit-card__broken">Didn't load</div>
              )}
            </div>
            <div className="kit-card__body">
              <div className="kit-card__title">{p.proto?.title ?? p.slug}</div>
              {p.proto?.description && <div className="kit-card__desc">{p.proto.description}</div>}
              <div className="kit-card__meta">
                {p.proto ? `${p.proto.author} · ${p.proto.updated}` : p.error}
                {p.proto?.tags?.length ? ` · ${p.proto.tags.join(', ')}` : ''}
              </div>
              {p.problems.length > 0 && (
                <div className="kit-card__problems">
                  {p.problems.length} thing{p.problems.length === 1 ? '' : 's'} to fix
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
