import type { ReactNode } from 'react'
import { useApp } from '../../store'
import type { Conversation, Fixture, User } from '../../../data/types'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { asset } from '../../../lib/asset'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKGroupAvatar } from '../../../slackkit/SKGroupAvatar'
import { SKBadge } from '../../../slackkit/SKBadge'
import { SKAdjacentLabel } from '../../../slackkit/SKEntity'
import { SKOrnamentBox } from '../../../slackkit/SKOrnamentBox'
import { MKMessagePreview, mkPreviewContent, mkReactions, mkShortOrdinal, mkTime, mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { EntityRow } from '../more/EntityRow'
import { FileTypeOrnament, fileKindLabel, fileKindStyle } from '../files/fileTypes'
import { SLACKBOT_USER_ID } from '../slackbot/constants'
import { conversationTitle, type SearchFile, type SearchItem } from './searchIndex'

// Search's rows (spec search-slackbot-huddles.md §1.2-1.5). Zero state and autocomplete rows are the compact .small
// entities of SearchContentPluginPresenterHelper.swift:41-153; results are .medium entities and MessageKit previews
// (SearchContentSearchResultsPluginPresenter+*.swift).

const presenceOf = (u?: User) => (u?.presence === 'away' ? 'away' : 'active') as 'away' | 'active'

/** The list badge (ListThemeOptions.badgeStyle): theme baseInverseImportant / contentInverseImportant, like Home's. */
const ListBadge = ({ count }: { count: number }) => <SKBadge count={count} className="search-badge" />

/** A timestamp as a text badge in contentTertiary on clear (compactMpdmRow, SearchContentPluginPresenterHelper.swift:89-103). */
const TimeBadge = ({ text }: { text: string }) => <SKBadge title={text} badgeStyle="text" textColor="var(--dt_color_content_tertiary)" backgroundColor="transparent" className="search-time-badge" />

/** timeUtility.mpdmTimestamp (Modules/Data/I18n/Implementation/TimeUtility.swift:520-544). */
export function mpdmTimestamp(ts: string, now = new Date()): string {
  const d = new Date(parseFloat(ts) * 1000)
  const secs = (now.getTime() - d.getTime()) / 1000
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (secs < 60) return 'Just now' // just_now
  if (secs < 3600) {
    const m = Math.floor(secs / 60)
    return m === 1 ? '1 min' : `${m} mins` // SLKPluralization .mins
  }
  if (sameDay(d, now) || secs < 8 * 3600) return mkTime(d)
  if (sameDay(d, yesterday)) return 'Yesterday'
  if (secs < 7 * 86400) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return `${mkShortOrdinal(d, now)}${d.getFullYear() === now.getFullYear() ? `, ${d.getFullYear()}` : ''}`
}

// ------------------------------------------------------------------------------------------------ trailing info

/**
 * Text.appendingTrailingInfo: " · <info>" after the name in .smallBody contentTertiary, nothing when the info is empty
 * (Find/Interface/Text+TrailingInfo.swift:11-22). September's zero state and autocomplete rows put what June showed as
 * a secondary line ("Search in Slack") or an accessory (a group DM's time) here.
 */
export const Trailing = ({ info }: { info?: string }) => (info ? <span className="search-trailing">{` · ${info}`}</span> : null)

/** EntityTrailingInfo.user: Agentforce, Slackbot, "App" for bots, else "@mentionName" when it isn't the name shown
 *  (mentionName = displayName ?? realName; User.swift:110-125, :332-335), which the demo's display names always are
 *  (EntityTrailingInfo.swift:31-45). */
export function userTrailing(user?: User): string {
  if (!user) return ''
  if (user.id === SLACKBOT_USER_ID) return 'Slackbot' // slackbot_user
  if (user.isBot || user.isApp) return 'App' // app_title
  return ''
}

/** EntityTrailingInfo.channel: "Archived Channel" / "Not in channel" / nothing for a channel you're in (:47-53). The
 *  demo has no archived channels. June said "Joined" and "Private Channel" too. */
export function channelTrailing(fx: Fixture, conv: Conversation): string {
  return !conv.memberIds || conv.memberIds.includes(fx.me) ? '' : 'Not in channel' // not_in_channel_plain
}

/** EntityTrailingInfo.file: a canvas or list's owner (@mentionName), an image / video / audio's size, else its type (:15-29). */
export function fileTrailing(fx: Fixture, file: SearchFile): string {
  if (file.kind === 'canvas' || file.kind === 'list') return (file.creatorId && fx.users[file.creatorId]?.name) || fileKindLabel(file.kind)
  return fileKindLabel(file.kind)
}

// ------------------------------------------------------------------------------------------------ ornaments

/**
 * The 24 pt ornament box September's zero state and autocomplete rows use: a forced surfacePrimary fill (radius 6, a
 * quarter of the side), the icon at scaleFactor 0.8 (16 pt) in `color` (SearchContentPluginPresenterHelper.swift:156-191,
 * LegacySearchContentRecentlyVisitedPlacesPluginPresenter.swift:136-147; June: baseTertiary and contentSecondary).
 */
export const FilledBox = ({ icon, color = 'var(--dt_color_content_secondary)', opacity }: { icon: string; color?: string; opacity?: number }) => (
  <span className="search-filled-box">
    <Icon name={icon} size={16} color={color} style={opacity !== undefined ? { opacity } : undefined} />
  </span>
)

/** A file's unfilled type icon in the type's palette _50 (SKIconManifest.icon(for:style: .unfilled), UIColor.primaryColor(for:):
 *  SKIconManifest+FileType.swift:48-125, UIColor+FileTypeExtensions.swift:15-26) on the filled box; images and videos with a
 *  thumbnail show it instead (SearchContentAutocompletePluginPresenter.swift:539-560). */
export function FileBox({ file }: { file: SearchFile }) {
  if (file.thumbnail && (file.kind === 'image' || file.kind === 'video')) return <FileTypeOrnament style={fileKindStyle(file.kind)} size={24} thumbnail={file.thumbnail} />
  const filled = fileKindStyle(file.kind)
  // an unknown type has no palette: primaryColor is surfacePrimary, the same as the box (UIColor+FileTypeExtensions.swift:16)
  return <FilledBox icon={UNFILLED_ICON[file.kind] ?? filled.icon} color={filled.color} />
}
const UNFILLED_ICON: Partial<Record<SearchFile['kind'], string>> = {
  canvas: 'canvas_content',
  list: 'lists',
  pdf: 'pdf_file',
  image: 'image',
  audio: 'sound',
  video: 'video',
  email: 'email',
  gdoc: 'document',
  gsheet: 'spreadsheet',
  gpres: 'presentation',
  text: 'text',
  binary: 'number',
  unknown: 'file',
}

/** The unfilled type icon of a file (SKIconManifest.icon(for:style: .unfilled)). */
export const unfilledFileIcon = (file: SearchFile) => UNFILLED_ICON[file.kind] ?? fileKindStyle(file.kind).icon

const ArrowAccessory = () => (
  // the "Return goes here" arrow: SKListCellAccessory.icon(svgArrowRight, contentPrimary) (SearchContentAutocompletePluginPresenter.swift:203-205, :273-277)
  <Icon name="arrow_right" size={20} color="var(--dt_color_content_primary)" />
)

// ------------------------------------------------------------------------------------------------ echo rows

/**
 * The echo query while typing: SKGenericEntity .small, the svgSearch ornament (a clear 24 pt box, 20 pt contentPrimary
 * icon), one label of up to 3 lines: the query in .body contentPrimary then " · Search in Slack" in .smallBody
 * contentTertiary; the first query row gets the arrow when the first result isn't promoted
 * (SearchContentAutocompletePluginPresenter.swift:193-259). June's default put "Search in Slack" on a second line.
 */
export function EchoRow({ query, onClick, arrow, trailing = 'Search in Slack', icon = 'search' }: { query: string; onClick: () => void; arrow?: boolean; trailing?: string; icon?: string }) {
  return (
    <EntityRow
      ornament={<SKOrnamentBox size="small" ornament={{ icon }} />}
      title={
        <>
          {query}
          <Trailing info={trailing} />
        </>
      }
      titleLines={3}
      accessories={arrow ? <ArrowAccessory /> : undefined}
      onClick={onClick}
      data-qa="search_echo_row"
    />
  )
}

/** A recent search: the same label with the svgClock ornament, up to 3 lines (LegacySearchContentRecentsPluginPresenter.swift:59-107). */
export const RecentSearchRow = ({ query, onClick }: { query: string; onClick: () => void }) => <EchoRow query={query} onClick={onClick} icon="clock" />

// ------------------------------------------------------------------------------------------------ recently visited places

/**
 * One row of "Recently visited places" (LegacySearchContentRecentlyVisitedPlacesPluginPresenter.swift:86-312): every row
 * .small, the name (3 lines at most) with its trailing info.
 *   channel  the filled box with channel / lock (archive), contentSecondary; the name in contentPrimary (:261-272,
 *            SearchContentPluginPresenterHelper.swift:156-225)
 *   person   SKMemberEntity: avatar, presence, status emoji (:196-259); an app: SKAppEntity with its icon (:199-231)
 *   group DM SKMultiPersonDirectMessageEntity with the latest message time as the trailing info (:274-296)
 */
export function PlaceRow({ fx, conv, onClick }: { fx: Fixture; conv: Conversation; onClick: () => void }) {
  const last = useLatestTs(conv.id)
  if (conv.type === 'im' || conv.type === 'app') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    const app = conv.type === 'app' || !!u?.isApp || !!u?.isBot
    const name = u?.name ?? conv.name
    return (
      <EntityRow
        ornament={
          app ? (
            <img className="search-app-icon" src={asset(u?.avatar ?? '')} alt="" draggable={false} />
          ) : (
            <SKMemberAvatar src={u?.avatar} name={u?.realName ?? name} size="small" presence={presenceOf(u)} activeColor="var(--theme_presenceActive)" />
          )
        }
        title={
          <>
            {name}
            <Trailing info={userTrailing(u) || (app ? 'App' : '')} />
          </>
        }
        titleLines={3}
        inline={!app && u?.statusEmoji ? <Emoji name={u.statusEmoji} size={18} /> : undefined}
        onClick={onClick}
        data-qa="search_place_row"
      />
    )
  }
  if (conv.type === 'mpim') {
    const others = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => fx.users[id])
    return (
      <EntityRow
        ornament={<SKGroupAvatar count={others.length} primarySrc={others[0]?.avatar} primaryName={others[0]?.name} secondarySrc={others[1]?.avatar} secondaryName={others[1]?.name} />}
        title={
          <>
            {conversationTitle(fx, conv)}
            <Trailing info={last ? mpdmTimestamp(last) : ''} />
          </>
        }
        titleLines={3}
        onClick={onClick}
        data-qa="search_place_row"
      />
    )
  }
  return <GenericChannelRow fx={fx} conv={conv} lines={3} onClick={onClick} />
}

/** genericEntityChannelRow (SearchContentPluginPresenterHelper.swift:156-225): the filled box with channel / lock, the
 *  name in .body contentPrimary with its trailing info, any accessories after it. */
export function GenericChannelRow({ fx, conv, lines, accessories, onClick }: { fx: Fixture; conv: Conversation; lines: number; accessories?: ReactNode; onClick: () => void }) {
  return (
    <EntityRow
      ornament={<FilledBox icon={conv.type === 'private' ? 'lock' : 'channel'} />}
      title={
        <>
          {conv.name}
          <Trailing info={channelTrailing(fx, conv)} />
        </>
      }
      titleLines={lines}
      accessories={accessories}
      onClick={onClick}
      data-qa="search_channel_row"
    />
  )
}

/** A file in Recently visited places or the autocomplete: the file box, the title with its trailing info (1 line in the
 *  autocomplete, 3 in the zero state; SearchContentAutocompletePluginPresenter.swift:501-537). */
export function GenericFileRow({ fx, file, lines, accessories, onClick }: { fx: Fixture; file: SearchFile; lines: number; accessories?: ReactNode; onClick: () => void }) {
  return (
    <EntityRow
      ornament={<FileBox file={file} />}
      title={
        <>
          {file.title}
          <Trailing info={fileTrailing(fx, file)} />
        </>
      }
      titleLines={lines}
      accessories={accessories}
      onClick={onClick}
      data-qa="search_file_row"
    />
  )
}

// ------------------------------------------------------------------------------------------------ compact rows

/**
 * The compact (.small) rows of compactIm / Mpdm / ChannelRow (SearchContentPluginPresenterHelper.swift:41-153). In
 * September's autocomplete they're the intent-promoted first result only (with the arrow); the other results use the
 * generic rows above, people and group DMs here with their trailing info instead of the alternative name and the time
 * badge (SearchContentAutocompletePluginPresenter.swift:263-351).
 */
export function CompactConversationRow({ fx, conv, onClick, arrow, promoted = true }: { fx: Fixture; conv: Conversation; onClick: () => void; arrow?: boolean; promoted?: boolean }) {
  const unread = useApp((s) => s.fx.unreads[conv.id])
  const last = useLatestTs(conv.id)
  const hasUnreads = (unread?.count ?? 0) > 0
  if (conv.type === 'im' || conv.type === 'app') {
    const u = conv.userId ? fx.users[conv.userId] : undefined
    return <CompactUserRow fx={fx} user={u} name={u?.name ?? conv.name} unread={hasUnreads} badge={conv.type === 'app' ? 0 : (unread?.count ?? 0)} onClick={onClick} arrow={arrow} promoted={promoted} />
  }
  if (conv.type === 'mpim') {
    const others = (conv.userIds ?? []).filter((id) => id !== fx.me)
    const time = last ? mpdmTimestamp(last) : ''
    return (
      <EntityRow
        // SKMultiPersonDirectMessageEntity .small: the count box, names up to 4 lines, never bold (shouldBoldPrimaryText false);
        // the time as a text badge only on a promoted row, else as trailing info (:300-321)
        ornament={<SKGroupAvatar count={others.length} />}
        title={
          <>
            {conversationTitle(fx, conv)}
            {!promoted && <Trailing info={time} />}
          </>
        }
        titleLines={4}
        accessories={
          (promoted && time) || arrow ? (
            <>
              {promoted && time && <TimeBadge text={time} />}
              {arrow && <ArrowAccessory />}
            </>
          ) : undefined
        }
        onClick={onClick}
      />
    )
  }
  // SKChannelEntity .small with showUnreadStatus: filled icon and bodyBlack when unread and not muted, else stroked and
  // .body; always contentPrimary (shouldBoldPrimaryText false) (SKListCellPresentationObject+Channel.swift:112-151)
  const bold = hasUnreads && !conv.muted
  const icon = conv.type === 'private' ? 'lock' : 'channel'
  return (
    <EntityRow
      ornament={<Icon name={bold ? `${icon}_filled` : icon} size={20} />}
      title={conv.name}
      titleFont={bold ? 'var(--sk-body-black)' : undefined}
      accessories={
        unread?.mentions || arrow ? (
          <>
            {unread?.mentions ? <ListBadge count={unread.mentions} /> : null}
            {arrow && <ArrowAccessory />}
          </>
        ) : undefined
      }
      onClick={onClick}
    />
  )
}

/**
 * SKMemberEntity .small (compactImRow): avatar with presence, the name bold when unread, apps with their APP tag. The
 * alternative (real) name follows only on a promoted row (shouldShowAlternativeName); otherwise the name carries its
 * trailing info (SearchContentAutocompletePluginPresenter.swift:279-299; June always showed the alternative name).
 */
export function CompactUserRow({ fx, user, name, unread, badge = 0, onClick, arrow, promoted = true }: { fx: Fixture; user?: User; name: string; unread?: boolean; badge?: number; onClick: () => void; arrow?: boolean; promoted?: boolean }) {
  const app = !!user?.isApp || !!user?.isBot
  const ornament = app ? (
    <img className="search-app-icon" src={asset(user?.avatar ?? '')} alt="" draggable={false} />
  ) : (
    <SKMemberAvatar src={user?.avatar} name={name} size="small" presence={presenceOf(user)} activeColor="var(--theme_presenceActive)" />
  )
  // shouldAdditionallyShowAlternativeName: the real name after the display name when they differ (+Member.swift:135-140)
  const alt = promoted && user && user.realName !== user.name ? user.realName : undefined
  return (
    <EntityRow
      ornament={ornament}
      title={
        <>
          {name}
          {!promoted && <Trailing info={userTrailing(user)} />}
        </>
      }
      bold={!!unread}
      inline={
        <>
          {alt && <span className="search-alt-name">{alt}</span>}
          {user?.statusEmoji && <Emoji name={user.statusEmoji} size={18} />}
          {app && <SKAdjacentLabel>APP</SKAdjacentLabel>}
          {user?.id === fx.me && <span className="search-alt-name">(you)</span>}
        </>
      }
      accessories={
        badge > 0 || arrow ? (
          <>
            {badge > 0 && <ListBadge count={badge} />}
            {arrow && <ArrowAccessory />}
          </>
        ) : undefined
      }
      onClick={onClick}
    />
  )
}

/** A promoted file in the autocomplete: .small, the type's own box with its unfilled glyph (Ornament(for: type, style:
 *  .unfilled), SKGenericEntity+Extensions.swift:14-19; SearchContentAutocompletePluginPresenter.swift:539-562) or the
 *  thumbnail, the title on 1 line, the arrow. */
export function CompactFileRow({ file, onClick, arrow }: { file: SearchFile; onClick: () => void; arrow?: boolean }) {
  const style = fileKindStyle(file.kind)
  return (
    <EntityRow
      ornament={<FileTypeOrnament style={{ ...style, icon: UNFILLED_ICON[file.kind] ?? style.icon }} size={24} thumbnail={file.thumbnail} />}
      title={file.title}
      accessories={arrow ? <ArrowAccessory /> : undefined}
      onClick={onClick}
    />
  )
}

function useLatestTs(conversationId: string) {
  return useApp((s) => s.messages[conversationId]?.at(-1)?.ts)
}

// ------------------------------------------------------------------------------------------------ result rows

/** A search result row. */
export function ResultRow({ fx, item, onOpen }: { fx: Fixture; item: SearchItem; onOpen: (item: SearchItem) => void }) {
  switch (item.kind) {
    case 'message':
      return <MessageResult fx={fx} item={item} onClick={() => onOpen(item)} />
    case 'file':
      return <FileResult fx={fx} file={item.file} onClick={() => onOpen(item)} />
    case 'person':
      return <PersonResult user={item.user} onClick={() => onOpen(item)} />
    case 'channel':
      return <ChannelResult conv={item.conversation} onClick={() => onOpen(item)} />
    case 'dm':
      return <DmResult fx={fx} item={item} onClick={() => onOpen(item)} />
  }
}

/**
 * A message: MessageKit's preview (+Messages.swift:14-123): the header line is the channel icon (hashSmallBold /
 * lockSmall) and name in smallBodyBold, then " - <relative date>" in smallBody, all contentSecondary; the author (with
 * status emoji) and a time-only timestamp; the body in .body contentPrimary folded to 3 lines (June: 2), unlimited when
 * the server sent search extracts, which the demo doesn't (messageStyling(hasSearchExtracts:), :46-57); reactions shown
 * but not interactive; unfurls with their pipe.
 */
function MessageResult({ fx, item, onClick }: { fx: Fixture; item: Extract<SearchItem, { kind: 'message' }>; onClick: () => void }) {
  const conv = fx.conversations[item.conversationId]
  const author = fx.users[item.msg.userId]
  const content = mkPreviewContent(item.msg)
  const channel = conv && (conv.type === 'channel' || conv.type === 'private')
  const header = (
    <span className="search-msg-header">
      {channel && <Icon name={conv.type === 'private' ? 'lock_filled' : 'channel'} size={15} className="search-msg-header__icon" />}
      <b>{conv ? conversationTitle(fx, conv) : ''}</b>
      {` - ${mkTimestamp(item.ts, 'relative')}`}
    </span>
  )
  const ornament =
    author?.isApp || author?.isBot ? (
      <img className="search-msg-app" src={asset(author.avatar)} alt="" draggable={false} />
    ) : (
      <SKMemberAvatar src={author?.avatar} name={author?.realName ?? author?.name ?? ''} size="large" />
    )
  return (
    <MKMessagePreview
      ornament={ornament}
      header={header}
      headerFont="var(--sk-small-body)"
      headerColor="var(--dt_color_content_secondary)"
      primaryText={author?.name ?? 'Unknown'}
      primaryDecoration={author?.statusEmoji ? <Emoji name={author.statusEmoji} size={18} /> : author?.isApp ? <SKAdjacentLabel>APP</SKAdjacentLabel> : undefined}
      timestamp={mkTimestamp(item.ts, 'timeOnly')}
      body={content.body}
      bodyFont="var(--sk-body)"
      bodyColor="var(--dt_color_content_primary)"
      bodyLines={3}
      files={content.files}
      unfurls={content.unfurls}
      reactions={mkReactions(item.msg.reactions, fx.me)}
      onClick={onClick}
      className="search-result"
      data-qa="search_message_result"
    />
  )
}

/** A file / canvas / list: .medium, title 2 lines, "Name · date" 1 line (+Files.swift:15-83, search_file_metadata "%@ · %@"). */
function FileResult({ fx, file, onClick }: { fx: Fixture; file: SearchFile; onClick: () => void }) {
  const who = file.creatorId ? fx.users[file.creatorId]?.name : undefined
  const date = file.time ? mkTimestamp(String(file.time), 'relative') : ''
  const subtitle = who && date ? `${who} · ${date}` : (who ?? date)
  return (
    <EntityRow
      size="medium"
      ornament={<FileTypeOrnament style={fileKindStyle(file.kind)} thumbnail={file.thumbnail} />}
      title={file.title}
      titleLines={2}
      subtitle={subtitle}
      subtitleLines={1}
      onClick={onClick}
      className="search-result"
      data-qa="search_file_result"
    />
  )
}

/** SKMemberEntity .medium: large avatar with presence, bold name + status emoji, title as the secondary line (+Users.swift:15-62). */
function PersonResult({ user, onClick }: { user: User; onClick: () => void }) {
  return (
    <EntityRow
      size="medium"
      ornament={<SKMemberAvatar src={user.avatar} name={user.realName} size="large" presence={presenceOf(user)} activeColor="var(--theme_presenceActive)" />}
      title={user.name}
      bold
      inline={user.statusEmoji ? <Emoji name={user.statusEmoji} size={18} /> : undefined}
      subtitle={user.title}
      subtitleLines={3}
      onClick={onClick}
      className="search-result"
      data-qa="search_person_result"
    />
  )
}

/** SKChannelEntity .medium: # / lock in a 36 pt ornament box, bold name, "1 member" / "%d members" (+Conversations.swift:13-59). */
function ChannelResult({ conv, onClick }: { conv: Conversation; onClick: () => void }) {
  const count = conv.memberIds?.length ?? conv.memberCount ?? 1
  return (
    <EntityRow
      size="medium"
      ornament={<SKOrnamentBox size="large" ornament={{ icon: conv.type === 'private' ? 'lock' : 'channel' }} />}
      title={conv.name}
      bold
      subtitle={count === 1 ? '1 member' : `${count} members`}
      subtitleLines={3}
      onClick={onClick}
      className="search-result"
      data-qa="search_channel_result"
    />
  )
}

/** A DM or group DM: .medium entity, the latest message time as a text badge (+DMs.swift:18-98). */
function DmResult({ fx, item, onClick }: { fx: Fixture; item: Extract<SearchItem, { kind: 'dm' }>; onClick: () => void }) {
  const conv = fx.conversations[item.conversationId]
  if (!conv) return null
  const accessory = item.latestTs ? <TimeBadge text={mpdmTimestamp(item.latestTs)} /> : undefined
  if (conv.type === 'mpim') {
    const others = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => fx.users[id])
    return (
      <EntityRow
        size="medium"
        ornament={<SKGroupAvatar size="large" count={others.length} primarySrc={others[0]?.avatar} primaryName={others[0]?.name} secondarySrc={others[1]?.avatar} secondaryName={others[1]?.name} />}
        title={conversationTitle(fx, conv)}
        titleLines={4}
        accessories={accessory}
        onClick={onClick}
        className="search-result"
      />
    )
  }
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return (
    <EntityRow
      size="medium"
      ornament={<SKMemberAvatar src={u?.avatar} name={u?.realName ?? conv.name} size="large" presence={presenceOf(u)} activeColor="var(--theme_presenceActive)" />}
      title={u?.name ?? conv.name}
      bold
      inline={u?.statusEmoji ? <Emoji name={u.statusEmoji} size={18} /> : undefined}
      accessories={accessory}
      onClick={onClick}
      className="search-result"
    />
  )
}

// ------------------------------------------------------------------------------------------------ skeletons

/**
 * SKLoadingEntity .medium with an image mask (SKLoadingPathHelper.swift:15-22, SKLoadingEntity.swift:215-265): a 36 pt
 * radius-9 square, a 12 pt bar at 75 % and a 10 pt bar at 50 % of the space after it, 6 pt apart, in surfacePrimary.
 */
export const LoadingRow = () => (
  <div className="search-skeleton" aria-hidden>
    <i className="search-skeleton__ornament" />
    <span className="search-skeleton__bars">
      <i className="search-skeleton__primary" />
      <i className="search-skeleton__secondary" />
    </span>
  </div>
)
