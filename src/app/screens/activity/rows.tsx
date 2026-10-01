import type { ActivityItem, Conversation, Fixture, Message, User } from '../../../data/types'
import { Icon } from '../../../icons/Icon'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKBadge } from '../../../slackkit/SKBadge'
import { Emoji } from '../../../emoji/Emoji'
import {
  MKAvatarWithIcon,
  mkPreviewContent,
  mkReactions,
  mkTimestamp,
  type MKMessagePreviewProps,
} from '../../../messagekit/MKMessagePreview'
import { conversationName } from '../home/sections'

// What each Activity row passes to MKMessagePreview (spec dms-activity.md §3.5–3.7): the redesigned rows, the only style
// since June's ios_activity_row_redesign went away (14b3cbaf): the actor's avatar with the type's icon in its corner, the
// name, the context line under it, then the body; the badge centered on the name row in theme.baseInverseImportant,
// reactions collapsed to 2 rows, relative timestamps.

export type ActivityFilter = 'all' | 'dms' | 'mentions' | 'threads' | 'reactions' | 'apps' | 'invitations'

/**
 * The views layout (the only one since June's ios_activity_views went away; TabBarPresentationObjectFactory.swift:36-116): the server's
 * views as text-only pills, "All" (`all`) and "DMs" (`dms`) built in, the rest the views' own names. Production
 * (reference/device/IMG_2250, measured) shows All, DMs, Mentions and Threads; the demo's server says the same.
 */
export const ACTIVITY_VIEWS: { id: ActivityFilter; title: string }[] = [
  { id: 'all', title: 'All' },
  { id: 'dms', title: 'DMs' },
  { id: 'mentions', title: 'Mentions' },
  { id: 'threads', title: 'Threads' },
]

/**
 * The server types per filter (ActivityFeedAction.swift:174-249) and the client's own filtering (ActivityInteractor
 * .swift:812-829): Threads keeps rows whose thread_ts ≠ ts; Reactions shows nothing while Unreads is on. The demo feed
 * carries DM rows too; they show under All.
 */
export function filterActivity(items: ActivityItem[], filter: ActivityFilter, unreadsOnly: boolean): ActivityItem[] {
  return items.filter((a) => {
    if (unreadsOnly && (!a.unread || a.type === 'reaction')) return false
    switch (filter) {
      case 'all':
        return true
      case 'dms':
        // the DMs view's `dm` entry type (ActivityViewsDataProviderPublisherFactory.swift:121-157 [Sept])
        return a.type === 'dm'
      case 'mentions':
        return a.type === 'mention'
      case 'threads':
        return a.type === 'thread' && a.threadTs !== undefined && a.threadTs !== a.ts
      case 'reactions':
        return a.type === 'reaction'
      case 'apps':
        return a.type === 'app'
      case 'invitations':
        return false
    }
  })
}

/** The time a row shows: the reaction's, else the message's. */
export const activityTime = (a: ActivityItem) => a.activityTs ?? a.ts

// ---------------------------------------------------------------------------------------------------- the helpers

const isDirect = (c?: Conversation) => !!c && (c.type === 'im' || c.type === 'mpim' || c.type === 'app')

/** The thread's root message (the conversation's history, or a thread reply's parent). */
function rootOf(messages: Record<string, Message[]>, conversationId: string, threadTs?: string) {
  if (!threadTs) return undefined
  return messages[conversationId]?.find((m) => m.ts === threadTs)
}

/** The row's message: in the conversation, or among a thread's replies. */
function messageOf(messages: Record<string, Message[]>, threads: Record<string, Message[]>, a: ActivityItem): Message | undefined {
  if (a.threadTs && a.threadTs !== a.ts) return threads[`${a.conversationId}/${a.threadTs}`]?.find((m) => m.ts === a.ts) ?? messages[a.conversationId]?.find((m) => m.ts === a.ts)
  return messages[a.conversationId]?.find((m) => m.ts === a.ts)
}

const nameOf = (fx: Fixture, id?: string) => (id ? (fx.users[id]?.name ?? fx.users[id]?.realName ?? '') : '')

/**
 * MessageUtility.participantsList (MessageKitTransformation/Utilities/MessageUtility.swift:13-97): the thread's root
 * author first (unless it's you), you last as "you" ("Just you" alone), then "A and B", "A, B, and C", "A, B, and N
 * others" (`name_and_name`, `name_name_and_name`, `and_others`).
 */
export function participantsList(fx: Fixture, root: Message | undefined, replies: Message[], extra: string[] = []): string {
  const ids: string[] = []
  const add = (id?: string) => id && !ids.includes(id) && ids.push(id)
  for (const r of replies) add(r.userId)
  for (const id of root?.replyUsers ?? []) add(id)
  for (const id of extra) add(id)
  if (root && !ids.includes(root.userId)) {
    if (root.userId === fx.me) ids.push(root.userId)
    else ids.unshift(root.userId)
  } else if (root && root.userId !== fx.me) {
    ids.splice(ids.indexOf(root.userId), 1)
    ids.unshift(root.userId)
  }
  const meAt = ids.indexOf(fx.me)
  if (meAt !== -1 && meAt !== ids.length - 1) {
    ids.splice(meAt, 1)
    ids.push(fx.me)
  }
  if (ids.length === 1 && ids[0] === fx.me) return 'Just you'
  const names = ids.map((id) => (id === fx.me ? 'you' : nameOf(fx, id)))
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others`
}

/**
 * A reaction row's name: the reactors, "Ann", "Ann and Bo", "Ann and 2 others", "Ann and several others"
 * (ReactionsPresentationObject.swift, `and_others` / `and_several_others`).
 */
function reactorsSubject(fx: Fixture, a: ActivityItem): string {
  const who = [a.userId, ...(a.otherUserIds ?? [])].filter((id) => id !== fx.me)
  const unique = [...new Set(who)]
  if (unique.length === 0) return 'Someone'
  const first = nameOf(fx, unique[0])
  if (unique.length === 1) return first
  if (unique.length === 2) return `${first} and ${nameOf(fx, unique[1])}`
  if (unique.length === 3) return `${first} and 2 others`
  return `${first} and several others`
}

/** The count badge: SKBadge .emphasized with theme.baseInverseImportant (ActivityPresenter.swift:205-206). */
const badge = (count: number) => ({ badge: <SKBadge count={count} backgroundColor="var(--theme_baseInverseImportant)" /> })

// ------------------------------------------------------------------------------------------------------- the rows

export interface ActivityRowModel {
  item: ActivityItem
  props: MKMessagePreviewProps
  /** where a tap goes: the conversation at the message, or the thread */
  target: { conversationId: string; ts: string; threadTs?: string }
}


/**
 * The avatar with a 15.4 pt emoji in its corner notch, for reaction rows (SKMemberAvatar .externalMember(emoji):
 * the badge box aspect-filled, radius 3.85 (SKMemberAvatar.swift:267-284); ReactionsPresentationObject.reactionsOrnament
 * [Sept]): MKAvatarWithIcon's notch, holding an emoji instead of an icon.
 */
function AvatarWithEmoji({ user, emoji }: { user?: User; emoji: string }) {
  const s = 36
  const c = 10 + 0.15 * s
  const g = 2 + 0.015 * s
  // the photo with three rounded corners and the bottom-right notch (memberSquareCutoutPath, SKMemberAvatar.swift:373-389)
  const adj = c - 4
  const x0 = s - adj - g
  const cr = c / 3
  const r = Math.min(20, 0.25 * s)
  const photo = `M${r} 0H${s}V${s}H${r}A${r} ${r} 0 0 1 0 ${s - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
  const notch = `M${x0} ${s}V${s - adj + cr}Q${x0} ${x0} ${x0 + cr} ${x0}H${s}V${s}Z`
  const mask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'><path fill-rule='evenodd' d='${photo}${notch}'/></svg>`)}")`
  return (
    <span className="activity-avatar-emoji" style={{ width: s, height: s }} role="img" aria-label={user?.realName ?? ''}>
      <span className="activity-avatar-emoji__photo" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <SKMemberAvatar src={user?.avatar} name={user?.realName ?? ''} size="large" />
      </span>
      <span className="activity-avatar-emoji__emoji" style={{ left: s - c + g, top: s - c + g, width: c, height: c }}>
        <Emoji name={emoji} size={c} />
      </span>
    </span>
  )
}

/** The count badge with svgComment (`.badge(count:, icon: .svgComment)`, HeaderAccessoryMapper.swift:37-43 [Sept]). */
const commentBadge = (count: number) => ({ badge: <SKBadge count={count} icon="comment" backgroundColor="var(--theme_baseInverseImportant)" /> })

/**
 * One activity row, Sept 2026 (June's redesigned style, now the only one; refinements off:
 * ActivityPresentationObject.entryLayout, :727-753): the actor's 36 pt avatar with the type's icon in its corner, the
 * name (bodyBlack unread, bodyBold read, content_primary, 1 line, APres:213), the timestamp at the name row's end, the
 * context line under it ("Direct Message", "Mention in #general"…: caption 13, captionBold content_primary when unread,
 * content_secondary when read; ActivityTextStyling.swift:14-37), 4 pt and 8 pt apart (MKMessagePreview.swift:207-240),
 * then the body (body 17, 2 lines, 1 for reactions). Unread rows get a badge (a count with svgComment for DMs, threads
 * and apps; "1" for mentions and reactions); read rows the base_secondary background (DefaultTransformationPath.swift:
 * 333-334). Measured on a device (IMG_2250): avatar y 196–232 under a row top of 186, a DM's name over "Direct Message".
 */
export function activityRow(fx: Fixture, messages: Record<string, Message[]>, threads: Record<string, Message[]>, a: ActivityItem): ActivityRowModel {
  const conv = fx.conversations[a.conversationId]
  const user = fx.users[a.userId]
  const msg = messageOf(messages, threads, a)
  const unread = !!a.unread
  const inThread = !!a.threadTs && a.threadTs !== a.ts
  const content = msg ? mkPreviewContent(msg) : {}
  const reactions = msg ? mkReactions(msg.reactions, fx.me) : []
  // Channel.nameWithIconPrefix ("#general", the lock for private ones) or "Direct Message"
  // (messageConversationDescriptionText, ActivityPresentationObject.swift:981-999 [Sept])
  const where = !conv || isDirect(conv) ? 'Direct Message' : conv.type === 'private' ? conv.name : `#${conv.name}`
  const lockPrefix = conv?.type === 'private' ? <Icon name="lock" className="activity-header__icon" /> : null
  const base: MKMessagePreviewProps = {
    timestamp: mkTimestamp(activityTime(a), 'relative'),
    accessoryAlignment: 'center',
    innerSpacing: 4,
    primaryLines: 1,
    primaryFont: unread ? 'var(--sk-body-black)' : 'var(--sk-body-bold)',
    primaryColor: 'var(--dt_color_content_primary)',
    mustacheFont: unread ? 'var(--sk-caption-bold)' : 'var(--sk-caption)',
    mustacheColor: unread ? 'var(--dt_color_content_primary)' : 'var(--dt_color_content_secondary)',
    bodyColor: unread ? 'var(--dt_color_content_primary)' : 'var(--dt_color_content_secondary)',
    bodyLines: 2,
    files: content.files,
    unfurls: content.unfurls,
    reactions,
    background: unread ? undefined : 'ephemeral',
    className: 'activity-row activity-row--redesign',
  }
  const target = { conversationId: a.conversationId, ts: a.ts, threadTs: inThread ? a.threadTs : undefined }
  const avatar = (u: User | undefined, icon: string) => <MKAvatarWithIcon src={u?.avatar} name={u?.realName ?? ''} icon={icon} />
  const mine = msg?.userId === fx.me

  switch (a.type) {
    case 'mention':
      // UserMentionsPresentationObject.swift:58-102 [Sept]: `mention_in_x` (yaml:12027), svgMentions, badge "1"
      return {
        item: a,
        target,
        props: {
          ...base,
          ornament: avatar(user, 'mentions'),
          primaryText: nameOf(fx, a.userId),
          mustache: (
            <>
              Mention in {lockPrefix}
              {where}
            </>
          ),
          body: content.body,
          accessory: unread ? badge(1) : undefined,
        },
      }
    case 'thread': {
      // ThreadsV2PresentationObject.swift:72-140 [Sept]: the participants, `thread_in_x` (yaml:21638) or "Thread in
      // Direct Message", the actor's avatar with svgThreads, a count with svgComment; your own reply as "You: "
      const root = rootOf(messages, a.conversationId, a.threadTs)
      const replies = threads[`${a.conversationId}/${a.threadTs}`] ?? []
      const name = participantsList(fx, root, replies, [a.userId, ...(a.otherUserIds ?? [])])
      const ctx = !conv || isDirect(conv) ? 'Thread in Direct Message' : undefined
      return {
        item: a,
        target,
        props: {
          ...base,
          ornament: avatar(user, 'threads'),
          primaryText: name,
          mustache: ctx ?? (
            <>
              Thread in {lockPrefix}
              {where}
            </>
          ),
          body: content.body !== undefined ? (mine ? `You: ${content.body}` : content.body) : undefined,
          accessory: unread ? commentBadge(a.unreadCount ?? 1) : undefined,
        },
      }
    }
    case 'reaction': {
      // ReactionsPresentationObject.swift:60-150 [Sept]: the reactors, "Reacted in %@" (`activity_reacted_in_x`, yaml:615)
      // or "Reacted to your message" (:618), the reactor with the emoji in the corner, 1 line of body
      const subject = reactorsSubject(fx, a)
      return {
        item: a,
        target,
        props: {
          ...base,
          ornament: <AvatarWithEmoji user={user} emoji={a.reaction ?? 'grinning'} />,
          primaryText: subject,
          mustache: conv && !isDirect(conv) ? (
            <>
              Reacted in {lockPrefix}
              {where}
            </>
          ) : (
            'Reacted to your message'
          ),
          body: content.body,
          bodyLines: 1,
          accessory: unread ? badge(1) : undefined,
        },
      }
    }
    case 'dm': {
      // DMPresentationObject.swift:55-118 [Sept]: the sender, "Direct Message" (`direct_message`, yaml:5452) or the
      // group DM's name, svgDirectMessages in the corner, no "You:" (shouldIdentifyYourMessages false), a count with
      // svgComment
      const count = fx.unreads[a.conversationId]?.count ?? a.unreadCount ?? 1
      return {
        item: a,
        target,
        props: {
          ...base,
          ornament: avatar(user, 'direct_messages'),
          primaryText: nameOf(fx, a.userId),
          mustache: conv?.type === 'mpim' ? conversationName(fx, conv) : 'Direct Message',
          body: content.body,
          accessory: unread ? commentBadge(count) : undefined,
        },
      }
    }
    case 'app':
    default:
      // AppsBotsPresentationObject.swift:57-94 [Sept]: the app, "App" (`app_title`, yaml:1991), svgApps in the corner,
      // a count with svgComment
      return {
        item: a,
        target,
        props: {
          ...base,
          ornament: avatar(user, 'apps'),
          primaryText: nameOf(fx, a.userId),
          mustache: 'App',
          body: content.body,
          accessory: unread ? commentBadge(a.unreadCount ?? 1) : undefined,
        },
      }
  }
}
