import { useApp } from '../../store'
import type { ReactNode } from 'react'
import { InlineText, RichText } from '../../text/RichText'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { displayName, paneFillingDate } from '../../../messagekit/format'
import type { Conversation, Fixture, User } from '../../../data/types'

// The top of a conversation's history (the conversation header plugin, spec messages.md §9.7): text rows are
// SKGenericEntity .small with unlimited lines, 10/16 padding (MessageTransformationMapper.swift:359-377;
// SKEntityBaseView.swift:61-67). Channels: ChannelHeaderTransformer.swift:168-367; DMs: ImHeaderTransformer.swift:47-178;
// group DMs: MpdmHeaderTransformer.swift:23-127.

export function ChannelIntro({ conversationId }: { conversationId: string }) {
  const fx = useApp((s) => s.fx)
  const conv = fx.conversations[conversationId]
  if (!conv) return null
  if (conv.type === 'channel' || conv.type === 'private') return <ChannelHeader fx={fx} conv={conv} />
  if (conv.type === 'mpim') return <GroupHeader fx={fx} conv={conv} />
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return u ? <DMHeader fx={fx} user={u} /> : null
}

function ChannelHeader({ fx, conv }: { fx: Fixture; conv: Conversation }) {
  const presentSheet = useApp((s) => s.presentSheet)
  const isPrivate = conv.type === 'private'
  const general = !isPrivate && conv.name === 'general'
  const random = conv.name === 'random'
  const creator = conv.creatorId ? fx.users[conv.creatorId] : undefined
  let description: ReactNode
  if (general) description = 'Slack is a messaging app for groups of people who work together. You can send updates, share files, and organize conversations so that everyone is in the loop.' // `slack_value_description`, yaml:19874
  else if (random) description = 'A place for non-work-related flimflam, faffing, hodge-podge or jibber-jabber you’d prefer to keep out of more focused work-related channels.' // `default_random_channel_description`, yaml:5266
  else {
    const when = paneFillingDate(conv.created ? new Date(`${conv.created}T12:00:00`) : new Date())
    // "{creator} created this [private] channel {date}." (yaml:22908 / 22912), yours: "You created this channel {date}."
    // (yaml:24311 / 24315); then " This is the very beginning of the {#channel} channel." (`beginning_of_x_channel`, yaml:2426)
    // with the channel as a plain `.channel` span: "#" or the lock, then the name (Text+Display.swift:496-516)
    const kind = isPrivate ? 'private channel' : 'channel'
    const created = creator ? (creator.id === fx.me ? `You created this ${kind} ${when}.` : `<@${creator.id}> created this ${kind} ${when}.`) : ''
    description = (
      <>
        {created && <InlineText text={created} />}
        {`${created ? ' ' : ''}This is the very beginning of the `}
        {isPrivate ? <Icon name="lock_filled" size={17} className="rt-channel__icon" /> : '#'}
        {`${conv.name} channel.`}
      </>
    )
  }
  const purpose = !general && !random ? conv.description : undefined
  return (
    <div className="convo-intro">
      {/* the name with its "#" or lock, Lato Black 28 (.headline); #general: "Welcome!" in Lato Black 22 (.title) (`welcome_with_exclamation`, yaml:23584) */}
      <div className={`convo-intro__row convo-intro__title${general ? ' is-welcome' : ''}`}>
        {general ? (
          'Welcome!'
        ) : (
          <>
            {isPrivate ? <Icon name="lock_filled" size={28} className="convo-intro__lock" /> : '#'}
            {conv.name}
          </>
        )}
      </div>
      <div className="convo-intro__row convo-intro__text">{typeof description === 'string' ? description : <div className="rt">{description}</div>}</div>
      {purpose && (
        <div className="convo-intro__row convo-intro__text">
          {/* "Channel Description: %@" (`channel_description_is_x_modern_transcript`, yaml:3723) */}
          <RichText text={`Channel Description: ${purpose}`} jumbomoji={false} />
        </div>
      )}
      {/* Two actions: equal widths 8 apart, icon on top, base_primary with an outline_tertiary border
          (ChannelHeaderTransformer.swift:369-435); "Add description" (yaml:726), "Add people" (yaml:811) */}
      <div className="convo-intro__buttons">
        <button type="button" className="convo-intro__button" data-tap onClick={() => presentSheet('edit-channel', { conversationId: conv.id })}>
          <Icon name="edit" size={20} />
          <span>Add description</span>
        </button>
        <button type="button" className="convo-intro__button" data-tap onClick={() => presentSheet('invite-to-channel', { conversationId: conv.id })}>
          <Icon name="user_add" size={20} />
          <span>Add people</span>
        </button>
      </div>
    </div>
  )
}

/** The 56 pt avatars (radius 14), 16 pt from the left and top (MKConversationMemberCollectionView.swift:32-37; measured 10 pt apart). */
function Avatars({ users }: { users: User[] }) {
  return (
    <div className="convo-intro__avatars">
      {users.map((u) => (
        <SKMemberAvatar key={u.id} src={u.avatar} name={u.realName} size="extraLarge" />
      ))}
    </div>
  )
}

function DMHeader({ fx, user }: { fx: Fixture; user: User }) {
  const self = user.id === fx.me
  const subtitle = [user.title, user.pronouns].filter(Boolean)
  return (
    <div className="convo-intro">
      <Avatars users={[user]} />
      <div className="convo-intro__row">
        {/* the name and status emoji, Lato Black 22 (User+NameAndStatusSpans.swift) */}
        <div className="convo-intro__name">
          {displayName(user)}
          {user.statusEmoji && (
            <>
              {' '}
              <Emoji name={user.statusEmoji} size={22} className="rt-emoji" />
            </>
          )}
        </div>
        {/* title in content_secondary, a line break, pronouns in content_tertiary; Lato 13 (ImHeaderTransformer.swift:95-140) */}
        {subtitle.length > 0 && (
          <div className="convo-intro__subtitle">
            {user.title && <span>{user.title}</span>}
            {user.title && user.pronouns && <br />}
            {user.pronouns && <span className="convo-intro__pronouns">{user.pronouns}</span>}
          </div>
        )}
      </div>
      <div className="convo-intro__row convo-intro__text">
        {self ? (
          // `beginning_of_dm_yourself_with_bold_tags`, yaml:2413
          <RichText text="*This is your space.* Draft messages, list your to-dos, or keep links and files handy. You can also talk to yourself here, but please bear in mind you’ll have to supply both sides of the conversation." jumbomoji={false} />
        ) : (
          // `beginning_of_dm_description_modern_text`, yaml:2408
          <RichText text={`This is the very beginning of your direct message history with <@${user.id}>. Only the two of you are in this conversation.`} jumbomoji={false} />
        )}
      </div>
    </div>
  )
}

function GroupHeader({ fx, conv }: { fx: Fixture; conv: Conversation }) {
  // the other members, by id (MpdmHeaderTransformer.swift:24-27)
  const others = (conv.userIds ?? []).filter((id) => id !== fx.me).sort().map((id) => fx.users[id]).filter((u): u is User => !!u)
  const count = (conv.userIds ?? []).length + ((conv.userIds ?? []).includes(fx.me) ? 0 : 1)
  return (
    <div className="convo-intro">
      <Avatars users={others} />
      <div className="convo-intro__row">
        {/* "A, B and C." in Lato Black 22 (namesAndStatusesText; `and` " and ", yaml:1834) */}
        <div className="convo-intro__name">
          {others.map((u, i) => (
            <span key={u.id}>
              {i > 0 && (i === others.length - 1 ? ' and ' : ', ')}
              {displayName(u)}
              {u.statusEmoji && (
                <>
                  {' '}
                  <Emoji name={u.statusEmoji} size={22} className="rt-emoji" />
                </>
              )}
            </span>
          ))}
          {others.length > 1 && '.'}
        </div>
      </div>
      <div className="convo-intro__row convo-intro__text">
        {/* `beginning_of_mpdm_description_modern_transcript`, yaml:2421 */}
        {`This is the very beginning of your direct message history. Only the ${count} of you are in this conversation.`}
      </div>
    </div>
  )
}
