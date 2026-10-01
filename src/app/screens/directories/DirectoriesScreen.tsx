import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../store'
import { NavBar } from '../../nav/NavBar'
import { screenDef } from '../../nav/registry'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKOrnamentBox } from '../../../slackkit/SKOrnamentBox'
import { SKTabBar } from '../../../slackkit/SKTabBar'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import type { Conversation, Fixture, User, UserGroup } from '../../../data/types'
import { EntityRow } from '../more/EntityRow'
import './directories.css'

// Directories: people, channels and user groups. Slack iOS has no Directories screen (nothing by that name in
// Modules/Features; the web client's "Directories" is what prototypes' `view: 'directories'` asks for), so this one is
// built from the SlackKit pieces iOS uses for the same jobs, each cited where it's used:
//
//   filter chips   SKTabBar .pillButton, fitAllContent, 12 pt insets, Docs' colors (§4.2 of
//                  search-slackbot-huddles.md: MoreTabSyntheticFilterRowPresentationObjectFactory.swift:57-71)
//   search         SKSearchBar in 12 / 16 margins, as OptionPicker's (OptionPickerSearchView.swift:29-41)
//   people         SKMemberEntity .medium: avatar + presence, bold name, status emoji, title (SKMemberEntity.swift)
//   channels       SKChannelEntity .medium: # / lock on a baseTertiary SKOrnamentBox, bold name, "N members" + topic
//   user groups    SKUserGroupEntity .medium: svgUserGroups on baseTertiary, the name and @handle
//   no results     the search empty state: "Nothing turned up" (search-slackbot-huddles.md §1.5)

type Kind = 'people' | 'channels' | 'groups'
const KINDS: { kind: Kind; title: string }[] = [
  { kind: 'people', title: 'People' },
  { kind: 'channels', title: 'Channels' },
  { kind: 'groups', title: 'User groups' },
]

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
/** A word of `text` starts with `q` (Slack's switcher rule: "pri" finds "Priya Patel", "pat" too). */
const matches = (q: string, ...texts: (string | undefined)[]) => {
  const n = norm(q.trim())
  if (!n) return true
  return texts.some((t) => t && norm(t).split(/[\s\-_.@#]+/).some((w) => w.startsWith(n)))
}

function people(fx: Fixture, q: string): User[] {
  return Object.values(fx.users)
    .filter((u) => !u.isApp && !u.isBot && u.id !== 'USLACKBOT')
    .filter((u) => matches(q, u.realName, u.name, u.title))
    .sort((a, b) => a.realName.localeCompare(b.realName))
}

function channels(fx: Fixture, q: string): Conversation[] {
  return Object.values(fx.conversations)
    .filter((c) => c.type === 'channel' || c.type === 'private')
    .filter((c) => matches(q, c.name, c.topic))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function groups(fx: Fixture, q: string): UserGroup[] {
  return (fx.userGroups ?? []).filter((g) => matches(q, g.name, g.handle)).sort((a, b) => a.name.localeCompare(b.name))
}

/** "1 member" (yaml:12793) / "%d members" (yaml:12790) */
const members = (n: number) => (n === 1 ? '1 member' : `${n} members`)

export function DirectoriesScreen() {
  const fx = useApp((s) => s.fx)
  const tab = useApp((s) => s.tab)
  const push = useApp((s) => s.push)
  const openConversation = useApp((s) => s.openConversation)
  const showToast = useApp((s) => s.showToast)
  const [kind, setKind] = useState<Kind>('people')
  const [query, setQuery] = useState('')
  const [scrollY, setScrollY] = useState(0)
  // SKTabBar measures its tabs once; measure again once Lato's weights have loaded (else a bold title can truncate)
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    let live = true
    void document.fonts?.ready.then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [])

  const list = useMemo(() => (kind === 'people' ? people(fx, query) : kind === 'channels' ? channels(fx, query) : groups(fx, query)), [fx, kind, query])
  const openProfile = (userId: string) => (screenDef('profile') ? push({ screen: 'profile', userId }) : showToast('Not in the prototype'))

  return (
    <div className="ios-pushed-screen directories" data-screen="directories">
      <div className="ios-scroll directories__list" onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)}>
        <SKTabBar
          key={fontsReady ? 'fonts' : 'fallback'}
          tabs={KINDS.map((k) => ({ title: k.title }))}
          selectionProgress={KINDS.findIndex((k) => k.kind === kind)}
          tabDisplayStyle="pillButton"
          widthMode="fitAllContent"
          selectedBackgroundColor="var(--dt_color_base_inverse_highlight_1)"
          textColor="var(--dt_color_content_secondary)"
          selectedTextColor="var(--dt_color_content_inverse_primary)"
          borderColor="var(--dt_color_outline_tertiary)"
          backgroundColor="var(--sk_primary_background)"
          contentInset={{ left: 12, right: 12 }}
          onTabTapped={(i) => setKind(KINDS[i].kind)}
        />
        <div className="directories__search">
          <SKSearchBar text={query} onTextChanged={setQuery} accessibilityLabel={`Search ${KINDS.find((k) => k.kind === kind)!.title.toLowerCase()}`} />
        </div>
        {list.length === 0 ? (
          <SKEmptyState className="directories__empty" content={{ emoji: '+1' }} title="Nothing turned up" body="You may want to try using different keywords or checking for typos." />
        ) : kind === 'people' ? (
          (list as User[]).map((u) => (
            <EntityRow
              key={u.id}
              size="medium"
              ornament={<SKMemberAvatar src={u.avatar} name={u.realName} size="large" presence={u.presence === 'away' ? 'away' : 'active'} />}
              title={u.realName}
              bold
              inline={u.statusEmoji ? <Emoji name={u.statusEmoji} size={18} /> : undefined}
              subtitle={u.id === fx.me ? [u.title, '(you)'].filter(Boolean).join(' ') : u.title}
              subtitleLines={3}
              onClick={() => openProfile(u.id)}
              data-qa={`directory_person_${u.name}`}
            />
          ))
        ) : kind === 'channels' ? (
          (list as Conversation[]).map((c) => (
            <EntityRow
              key={c.id}
              size="medium"
              ornament={<SKOrnamentBox ornament={{ icon: c.type === 'private' ? 'lock' : 'channel' }} size="large" backgroundColor="var(--dt_color_base_tertiary)" />}
              title={c.name}
              bold
              subtitle={[members(c.memberIds?.length ?? c.memberCount ?? 1), c.topic].filter(Boolean).join(' · ')}
              subtitleLines={3}
              onClick={() => openConversation(c.id, { tab })}
              data-qa={`directory_channel_${c.name}`}
            />
          ))
        ) : (
          (list as UserGroup[]).map((g) => (
            <EntityRow
              key={g.id}
              size="medium"
              ornament={<SKOrnamentBox ornament={{ icon: 'user_groups' }} size="large" backgroundColor="var(--dt_color_base_tertiary)" />}
              title={g.name}
              bold
              inline={<span className="directories__handle">@{g.handle}</span>}
              subtitle={[members(g.memberIds.length), g.description].filter(Boolean).join(' · ')}
              subtitleLines={3}
              onClick={() => showToast('Not in the prototype')}
              data-qa={`directory_group_${g.handle}`}
            />
          ))
        )}
        <div className="directories__bottom" />
      </div>
      <NavBar title="Directories" scrolled={scrollY > 0} />
    </div>
  )
}
