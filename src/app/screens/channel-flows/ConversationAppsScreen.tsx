import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { useApp, type Route } from '../../store'
import { NavBar } from '../../nav/NavBar'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { showAlert } from '../../sheets/ui/Alert'
import { conversationTitle } from '../../../messagekit/format'
import type { Fixture, Message, User } from '../../../data/types'
import { BarTextButton, useScreenConversation } from './shared'
import './conversation-apps.css'

// Apps and agents in a channel (spec channels-people.md §8; AP/ = Modules/Features/AppPicker/Implementation): Channel
// details' "Apps" and "Agents" rows push the AppPicker in list mode, filtered .excludingAgents / .onlyAgents
// (ConversationDetailsFeature.swift:329-357). Title "Apps" / "Agents" (AP/AppPickerViewController.swift:152-162), "Edit"
// ↔ "Done" on the right (:86-107), an SKSearchView ("Search", 66 pt with its rule) and 4 pt, then "Add an app" /
// "Add an agent" first (hidden while editing or searching) and the apps as SKAppEntity .medium rows: the icon, the bold
// name, the "APP" / "AGENT" tag (AP/AppPickerPresenter.swift:105-116,327-340; SKListCellPresentationObject+Member.swift:
// 172-200). A row opens the app's profile; in edit mode its ✕ asks "Remove %@ from %@?". "Add an app" pushes the apps
// that aren't in the channel; picking one adds it and comes back (AP/AppPickerFeature.swift:141-219).
//
// Which apps are in a conversation isn't in the demo's data: the apps and bots that posted in it, plus the ones added
// here, minus the ones removed here. Agents are apps with `isAgent`.
//
//   push({ screen: 'conversation-apps', conversationId })
//   push({ screen: 'conversation-agents', conversationId })

interface ChannelApps {
  added: Record<string, string[]>
  removed: Record<string, string[]>
}

/** What you've added and removed this session, by conversation. */
export const useChannelApps = create<ChannelApps>(() => ({ added: {}, removed: {} }))

const isAppUser = (u?: User) => !!u && (!!u.isApp || !!u.isBot) && u.id !== 'USLACKBOT'

/** The apps (or agents) in a conversation: who posted there, plus added, minus removed. */
export function appsInConversation(fx: Fixture, messages: Record<string, Message[]>, threads: Record<string, Message[]>, state: ChannelApps, conversationId: string, agents: boolean): User[] {
  const ids = new Set<string>()
  for (const m of messages[conversationId] ?? []) ids.add(m.userId)
  for (const [key, list] of Object.entries(threads)) if (key.startsWith(`${conversationId}/`)) for (const m of list) ids.add(m.userId)
  for (const id of state.added[conversationId] ?? []) ids.add(id)
  for (const id of state.removed[conversationId] ?? []) ids.delete(id)
  return [...ids]
    .map((id) => fx.users[id])
    .filter((u): u is User => isAppUser(u) && !!u.isAgent === agents)
    .sort((a, b) => a.realName.localeCompare(b.realName))
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const matches = (u: User, q: string) => !q || norm(u.realName).split(/\s+/).some((w) => w.startsWith(q)) || norm(u.realName).startsWith(q)

/** The adjacent tag: "APP" (`app_badge`, yaml:1822) or "AGENT" (`agent_badge`, yaml:1035), microBold contentSecondary on
 *  baseTertiary (SKAppEntity.swift:162-163). */
const tag = (u: User) => ({ text: u.isAgent ? 'AGENT' : 'APP', textColor: 'var(--dt_color_content_secondary)', backgroundColor: 'var(--dt_color_base_tertiary)' })

export function ConversationAppsScreen({ route, agents = false }: { route: Route; agents?: boolean }) {
  const id = useScreenConversation(route)
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const state = useChannelApps()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const conv = id ? fx.conversations[id] : undefined
  const apps = useMemo(() => (id ? appsInConversation(fx, messages, threads, state, id, agents) : []), [fx, messages, threads, state, id, agents])
  const q = norm(query.trim())
  const shown = apps.filter((u) => matches(u, q))
  const title = agents ? 'Agents' : 'Apps' // `agents` yaml:1124 / `apps_title` yaml:1940

  const remove = (u: User) => {
    if (!id || !conv) return
    // "Remove %@ from %@?" (`remove_app_from_channel_prompt`, yaml:15307), "%@ will no longer be able to access or post to
    // %@, unless you add it again." (`alert_app_lost_access`, yaml:1489), Remove / Cancel (AppPickerHandlerService.swift:149-206)
    const where = conv.type === 'channel' ? `#${conv.name}` : conversationTitle(fx, conv)
    showAlert({
      title: `Remove ${u.realName} from ${where}?`,
      message: `${u.realName} will no longer be able to access or post to ${where}, unless you add it again.`,
      actions: [
        { title: 'Cancel', style: 'cancel' },
        {
          title: 'Remove',
          style: 'destructive',
          onPress: () =>
            useChannelApps.setState((s) => ({
              removed: { ...s.removed, [id]: [...new Set([...(s.removed[id] ?? []), u.id])] },
              added: { ...s.added, [id]: (s.added[id] ?? []).filter((x) => x !== u.id) },
            })),
        },
      ],
    })
  }

  return (
    <div className="ios-pushed-screen capps" data-screen={agents ? 'conversation-agents' : 'conversation-apps'}>
      <div className="ios-scroll capps__list" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        <SearchView query={query} onQuery={setQuery} />
        {!editing && !q && id && (
          // "Add an app" (yaml:704) / "Add an agent" (yaml:701): .small, plus_filled in contentPrimary (AP/AppPickerPresenter.swift:290-303;
          // June .sk_primary_foreground)
          <SKGenericEntity
            primaryText={agents ? 'Add an agent' : 'Add an app'}
            ornament={{ icon: { icon: 'plus_filled', color: 'var(--dt_color_content_primary)' } }}
            size="small"
            onSelected={() => useApp.getState().push({ screen: 'conversation-add-apps', conversationId: id, agents })}
          />
        )}
        {shown.map((u) => (
          // SKAppEntity .medium: the app's icon, its name in bodyBold, the tag (an SKGenericEntity with an image ornament)
          <SKGenericEntity
            key={u.id}
            primaryText={u.name || u.realName}
            shouldBoldPrimaryText
            ornament={{ image: u.avatar }}
            adjacentText={tag(u)}
            size="medium"
            accessories={editing ? [{ delete: { onClick: () => remove(u) } }] : []}
            onSelected={editing ? undefined : () => useApp.getState().openProfile(u.id)}
          />
        ))}
        <div className="capps__end" />
      </div>
      <NavBar
        title={<span className="chf-plain-title">{title}</span>}
        scrolled={scrolled}
        trailing={<BarTextButton title={editing ? 'Done' : 'Edit'} onClick={() => setEditing((e) => !e)} />}
      />
    </div>
  )
}

/** "Add an app" / "Add an agent": the same search, the ones not in the conversation with their one-line description. */
export function AddAppsScreen({ route }: { route: Route }) {
  const id = useScreenConversation(route)
  const agents = !!route.agents
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const state = useChannelApps()
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const inIt = useMemo(() => new Set(id ? appsInConversation(fx, messages, threads, state, id, agents).map((u) => u.id) : []), [fx, messages, threads, state, id, agents])
  const q = norm(query.trim())
  const candidates = Object.values(fx.users)
    .filter((u) => isAppUser(u) && !!u.isAgent === agents && !inIt.has(u.id) && matches(u, q))
    .sort((a, b) => a.realName.localeCompare(b.realName))

  const add = (u: User) => {
    if (!id) return
    useChannelApps.setState((s) => ({
      added: { ...s.added, [id]: [...new Set([...(s.added[id] ?? []), u.id])] },
      removed: { ...s.removed, [id]: (s.removed[id] ?? []).filter((x) => x !== u.id) },
    }))
    useApp.getState().pop()
  }

  return (
    <div className="ios-pushed-screen capps" data-screen="conversation-add-apps">
      <div className="ios-scroll capps__list" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        <SearchView query={query} onQuery={setQuery} />
        {candidates.map((u) => (
          <SKGenericEntity
            key={u.id}
            primaryText={u.name || u.realName}
            shouldBoldPrimaryText
            ornament={{ image: u.avatar }}
            adjacentText={tag(u)}
            secondaryText={fx.apps?.[u.id]?.description.split('\n')[0].replace(/^•\s*/, '')}
            secondaryTextNumberOfLines={1}
            size="medium"
            onSelected={() => add(u)}
          />
        ))}
        <div className="capps__end" />
      </div>
      <NavBar title={<span className="chf-plain-title">{agents ? 'Add an agent' : 'Add an app'}</span>} scrolled={scrolled} />
    </div>
  )
}

/** SKSearchView: the SKSearchBar ("Search", yaml:16105) in 12 / 16 insets on basePrimary, a hairline in outlineTertiary
 *  (SKSearchView.swift:23-37,163-171), then 4 pt (AP/AppPickerViewController.swift:26,57). */
function SearchView({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <div className="capps__search">
      <div className="capps__search-bar">
        <SKSearchBar text={query} onTextChanged={onQuery} placeholderText="Search" accessibilityLabel="Search" />
      </div>
      <div className="capps__rule" />
    </div>
  )
}

/** The Agents list: the same AppPicker, filtered .onlyAgents (ConversationDetailsFeature.swift:344-357). */
export function ConversationAgentsScreen({ route }: { route: Route }) {
  return <ConversationAppsScreen route={route} agents />
}
