import { useState } from 'react'
import { useApp, type Route } from '../../store'
import { GlassGroup, GlassGroupItem, NavBar } from '../../nav/NavBar'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKButton } from '../../../slackkit/SKButton'
import { memberIds } from './ChannelDetailsScreen'
import { isChannel } from '../../sheets/shared'
import './channel-details.css'

// A conversation's members (spec sheets-menus.md §4.5; ML/ = Modules/Features/ConversationMemberList/Implementation/,
// September 2026 source): title "Members" ("<count> Members" for group DMs), a search view over a 1 px outlineTertiary rule
// (ML/ConversationMemberListViewController.swift:87; June sk_primary_foreground at 25 %), then M member rows (56 pt: 36 pt
// avatar with presence, the name in bodyBold); tapping one pushes the profile (ML/ConversationMemberListFeature.swift:146-147).

export function MembersScreen({ route }: { route: Route }) {
  const id = route.conversationId as string
  const fx = useApp((s) => s.fx)
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const conv = fx.conversations[id]
  const [q, setQ] = useState('')
  if (!conv) return <div className="ios-pushed-screen cd" />
  const ids = memberIds(fx, conv)
  const people = ids.map((u) => fx.users[u]).filter(Boolean)
  const shown = q.trim() ? people.filter((u) => `${u.realName} ${u.name}`.toLowerCase().includes(q.trim().toLowerCase())) : people
  const title = conv.type === 'mpim' ? `${ids.length} Members` : 'Members'
  return (
    <div className="ios-pushed-screen cd" data-screen="conversation-members">
      <div className="ios-scroll cd__list">
        <div className="cdm-search">
          <SKSearchBar text={q} onTextChanged={setQ} placeholderText="Search" />
        </div>
        <div className="cdm-rule" />
        {shown.length === 0 ? (
          // "No user matches these keywords." (yaml:13133) with "Clear search" (yaml:4063) (ML/ConversationMemberListPresenter.swift:275-302)
          <div className="cdm-empty">
            <div>No user matches these keywords.</div>
            <SKButton title="Clear search" buttonStyle="systemDefault" isPadded={false} onClick={() => setQ('')} />
          </div>
        ) : (
          shown.map((u) => (
            <div key={u.id} className="rx-row cdm-row" role="button" onClick={() => push({ screen: 'profile', userId: u.id })} data-tap>
              <span className="rx-row__bg" />
              <SKMemberAvatar src={u.avatar} name={u.realName} size="large" presence={u.presence === 'away' ? 'away' : 'active'} />
              <span className="rx-row__name">{u.id === fx.me ? `${u.realName} (you)` : u.realName}</span>
            </div>
          ))
        )}
        <div className="cd__end" />
      </div>
      {/* "Add" (add) when you may add people: channels (ConversationMemberListPresenter.swift:195) and group DMs
          (:222-236, which push the member picker, ConversationMemberListFeature.swift:140-144: here New Message with the
          group already in "To:"). A `.title(add, .default)` item (presenter :117-128): an SKButton .systemDefault at
          .barButton, Lato Bold 17 in highlight1 (SKBarButtonItem.swift:188, 206; SKButton+Types.swift:206-207, 255-256),
          alone in its capsule. Cited from the September 2026 source. */}
      <NavBar
        title={<span className="pf-nav-title">{title}</span>}
        trailing={
          isChannel(conv) || conv.type === 'mpim' ? (
            <GlassGroup>
              <GlassGroupItem
                label="Add"
                onClick={() =>
                  isChannel(conv)
                    ? presentSheet('invite-to-channel', { conversationId: id })
                    : useApp.getState().push({ screen: 'compose', to: (conv.userIds ?? []).filter((u) => u !== fx.me) })
                }
              >
                <span className="cdm-add">Add</span>
              </GlassGroupItem>
            </GlassGroup>
          ) : undefined
        }
      />
    </div>
  )
}
