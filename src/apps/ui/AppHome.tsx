import { useEffect, useState } from 'react'
import { useApp } from '../../app/store'
import { SKSpinner } from '../../slackkit'
import { BlockSurface, useAppHomes } from '../../blocks'
import { kitAppByUser } from '../index'
import { useHomePublishing, useKitHome } from '../runtime'
import type { KitBlock } from '../../blocks/types'

// The App Home tab (spec blockkit.md §8 › Home tab): an embedded AppViewFeature, so its body is a modal's (§7.3-7.4):
// the blocks with 16 pt insets and an 8 pt header on base_primary, `optional` neither enforced nor shown, the loading
// overlay (base_primary @70 % and a 46 pt spinner) while the view loads. Kit apps' Homes come from their `home` (and
// views.publish); the demo's data-driven apps from fx.apps[user].home and their effects. Slack has no empty state
// for a Home with nothing published (none found in Modules/Features/AppView, Modules/DataService/AppHome*): it's blank.

/** Homes already loaded this session (the first open shows the loading overlay for the app's round trip). */
const loaded = new Set<string>()

/** The Home blocks of an app user: kit apps' live Home, else the demo app's (after its interactions). */
export function useAppHomeBlocks(appUserId: string | undefined): KitBlock[] | undefined {
  const kit = useKitHome(appUserId)
  const legacy = useAppHomes((s) => (appUserId ? s.homes[appUserId] : undefined))
  const seeded = useApp((s) => (appUserId ? (s.fx.apps?.[appUserId]?.home as KitBlock[] | undefined) : undefined))
  if (kitAppByUser(appUserId)) return kit
  return legacy ?? seeded
}

export function AppHome({ appUserId, conversationId }: { appUserId: string; conversationId: string }) {
  const blocks = useAppHomeBlocks(appUserId)
  const publishing = useHomePublishing(appUserId)
  const [loading, setLoading] = useState(() => !loaded.has(appUserId))
  useEffect(() => {
    if (!loading) return
    // AppViewFeature fetches the view when the tab opens; the kit app's latency stands in for the request.
    const t = setTimeout(() => {
      loaded.add(appUserId)
      setLoading(false)
    }, kitAppByUser(appUserId)?.def.latency ?? 300)
    return () => clearTimeout(t)
  }, [loading, appUserId])
  return (
    <div className="app-home">
      <div className="app-home__scroll ios-scroll">{!loading && <BlockSurface blocks={blocks ?? []} surface="home" appUserId={appUserId} conversationId={conversationId} />}</div>
      {(loading || publishing) && (
        <div className="app-home__loading" role="progressbar" aria-label="Loading…">
          <SKSpinner size="extraLarge" />
        </div>
      )}
    </div>
  )
}
