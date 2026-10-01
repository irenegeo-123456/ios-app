import { useApp } from '../../store'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar, memberPresence } from '../../../slackkit/SKMemberAvatar'
import { SKBadge } from '../../../slackkit/SKBadge'
import { RowIcon, SKAdjacentLabel, SKEntityRow, SKGroupAvatar } from '../../../slackkit/SKEntity'
import { asset } from '../../../lib/asset'
import { conversationName, isBotConversation, type HomeRow } from './sections'
import { SLACKBOT_USER_ID } from '../slackbot/constants'

// A conversation row on Home and in the section browser (SKEntity .small, spec home.md §4): the channel icon, avatar,
// group count or app icon, the name in the list theme's state color, extras ("APP", a status emoji), the mention badge.

export function ConversationRow({ row, onOpen }: { row: HomeRow; onOpen: (id: string) => void }) {
  const fx = useApp((s) => s.fx)
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const { conv } = row
  const state = row.muted ? 'muted' : row.unread ? 'unread' : 'read'
  const name = conversationName(fx, conv)
  let ornament
  let inline
  if (conv.type === 'channel' || conv.type === 'private') {
    const icon = conv.type === 'private' ? 'lock' : 'channel'
    ornament = <RowIcon name={row.unread ? `${icon}_filled` : icon} />
  } else if (conv.type === 'mpim') {
    ornament = <SKGroupAvatar count={(conv.userIds ?? []).filter((u) => u !== fx.me).length} />
  } else if (isBotConversation(fx, conv) && conv.userId !== 'USLACKBOT') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    ornament = <img className="home-app-icon" src={asset(u?.avatar ?? '')} alt="" draggable={false} />
    // primaryAdjacentLabelColors: contentSecondary on baseTertiary (Sept ListThemeOptions.swift:82; June sk_* grays)
    inline = (
      <SKAdjacentLabel textColor="var(--dt_color_content_secondary)" backgroundColor="var(--dt_color_base_tertiary)">
        APP
      </SKAdjacentLabel>
    )
  } else {
    // a person, or Slackbot (a member row with the heart: SKMemberAvatar.swift:742-779 [Sept])
    const u = conv.userId ? fx.users[conv.userId] : undefined
    const presence = memberPresence({ isActive: u?.presence !== 'away', isSlackbot: conv.userId === 'USLACKBOT', isExternal: u?.isExternal })
    ornament = <SKMemberAvatar src={u?.avatar} name={u?.realName ?? name} size="small" presence={presence} activeColor="var(--theme_presenceActive)" />
    if (u?.statusEmoji) inline = <Emoji name={u.statusEmoji} size={18} />
  }
  return (
    <SKEntityRow
      state={state}
      ornament={ornament}
      title={name}
      inline={inline}
      lines={conv.type === 'mpim' ? 4 : 1}
      accessories={row.mentions > 0 ? <SKBadge count={row.mentions} className="home-badge" /> : undefined}
      // Slackbot's DM opens Slackbot (as its tile and the DMs carousel do); its row has no conversation menu here
      onClick={() => (conv.userId === SLACKBOT_USER_ID ? push({ screen: 'slackbot' }) : onOpen(row.id))}
      onLongPress={conv.userId === SLACKBOT_USER_ID ? undefined : (el) => presentSheet('conversation-context-menu', { conversationId: row.id, anchor: el })}
      data-qa={`home_row_${conv.name}`}
    />
  )
}
