import { useMemo, useRef, useState } from 'react'
import { useApp } from '../../store'
import { NavBar } from '../../nav/NavBar'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKChannelEntity } from '../../../slackkit/SKEntities'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import type { Conversation, Fixture } from '../../../data/types'
import { BarTextButton, isMember, isVisibleChannel } from './shared'
import './browse-channels.css'

// The channel browser (spec channels-people.md §2; ChannelPickerCoordinator → UserConversationPicker, UCP/ below =
// Modules/Integration/SlackKitPickers/Implementation/UserConversationPicker/; ChannelPickerCoordinator is in
// Modules/Features/LegacyNavigation/Implementation since June). Pushed, so the left item is the back button
// (ChannelPickerCoordinator.swift:151-159); "Channels" with "Create" on the right (:161-175). A search bar in 12/16
// margins ("Search"), a one-pixel outlineTertiary rule, then every channel you can see, joined or not, A–Z, as
// SKChannelEntity .small rows: the filled type icon and the bold name, nothing else (no member count, no joined mark:
// SKChannelEntity.swift:178-185). Typing filters ("#" ignored) and scrolls to the top. A row opens the channel in the
// browser's place (.reset, :178-209): the conversation when you're in it, else the preview with Join (§3).
//
//   push({ screen: 'browse-channels' })

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** A leading "#" is stripped (UserConversationPickerQuery.swift:61-73). */
const cleanQuery = (q: string) => norm(q.trim().replace(/^#+/, ''))

/** Every channel you can see, by name (PaginatedChannelPickerAdapter.swift:72); matches by name: prefix, then word prefix. */
function channelsFor(fx: Fixture, query: string): Conversation[] {
  const all = Object.values(fx.conversations)
    .filter((c) => isVisibleChannel(fx, c))
    .sort((a, b) => a.name.localeCompare(b.name))
  const q = cleanQuery(query)
  if (!q) return all
  const starts = all.filter((c) => norm(c.name).startsWith(q))
  const words = all.filter((c) => !starts.includes(c) && norm(c.name).split(/[-_.\s]+/).some((w) => w.startsWith(q)))
  return [...starts, ...words]
}

export function BrowseChannelsScreen() {
  const fx = useApp((s) => s.fx)
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const channels = useMemo(() => channelsFor(fx, query), [fx, query])
  const searching = cleanQuery(query) !== ''

  const change = (q: string) => {
    setQuery(q)
    // the list scrolls to the top whenever the query changes (UCP/Controller/UserConversationPickerViewController.swift:290-291)
    listRef.current?.scrollTo({ top: 0 })
  }

  const open = (c: Conversation) => {
    setQuery('')
    const s = useApp.getState()
    // the browser goes away and the channel takes its place (navigationMethod .reset)
    s.pop()
    if (isMember(s.fx, c)) s.openConversation(c.id, { tab: s.tab })
    else s.push({ screen: 'channel-preview', conversationId: c.id })
  }

  return (
    <div className="ios-pushed-screen chb" data-screen="browse-channels">
      <div ref={listRef} className="ios-scroll chb__list" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        <div className="chb__search">
          {/* placeholder "Search" (`search`, yaml:17029; UCP/Views/UserConversationPickerSearchView.swift:93-95) */}
          <SKSearchBar text={query} onTextChanged={change} placeholderText="Search" accessibilityLabel="Search" />
        </div>
        <div className="chb__rule" />
        {channels.length === 0 ? (
          // UCP/Transformers/UserConversationEmptyResultDisplayableTransformer.swift:31-79: the emoji_no_results image,
          // "No channel matches these keywords." (yaml:12165) + "Clear search" (3893), or "No channel found" (12162)
          <div className="chb__empty">
            {searching ? (
              <SKEmptyState content={{ illustration: 'emoji_no_results' }} title="No channel matches these keywords." buttons={[{ title: 'Clear search', onClick: () => change('') }]} />
            ) : (
              <SKEmptyState content={{ illustration: 'emoji_no_results' }} title="No channel found" />
            )}
          </div>
        ) : (
          <div className="chb__rows" role="list">
            {channels.map((c) => {
              const muted = !!c.muted
              return (
                <SKChannelEntity
                  key={c.id}
                  // SKListCellPresentationObject+Channel.swift:22-56,142-172: filled icons; a muted channel's outline icon
                  // and name in contentTertiary
                  name={c.name}
                  channelType={c.type === 'private' ? 'private' : 'public'}
                  iconStyle={muted ? 'unfilled' : 'filled'}
                  iconColor={muted ? 'var(--dt_color_content_tertiary)' : 'var(--dt_color_content_primary)'}
                  className={muted ? 'chb-row is-muted' : 'chb-row'}
                  size="small"
                  onSelected={() => open(c)}
                  accessibilityLabel={`${c.type === 'private' ? 'Private channel' : 'Channel'} ${c.name}`}
                />
              )
            })}
          </div>
        )}
        <div className="chb__bottom" />
      </div>
      <NavBar
        title={<span className="chf-plain-title">Channels</span>}
        scrolled={scrolled}
        // "Create" (`create`, yaml:4865), a plain bar button item (none for frontline workers, :161-164); it opens Create
        // Channel (ChannelPickerCoordinator.swift:231-244)
        trailing={<BarTextButton title="Create" onClick={() => useApp.getState().presentSheet('create-channel')} />}
      />
    </div>
  )
}
