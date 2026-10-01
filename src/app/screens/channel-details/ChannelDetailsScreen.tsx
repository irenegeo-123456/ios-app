import { useState, type ReactNode } from 'react'
import { useApp, type Route } from '../../store'
import { GlassButton, GlassGroup, GlassGroupItem, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { InlineText } from '../../text/RichText'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKButton } from '../../../slackkit/SKButton'
import { SKSwitch } from '../../../slackkit/SKSwitch'
import { SKSpinner } from '../../../slackkit/SKSpinner'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { SKEntityRow, SKListFooter, SKListHeader } from '../../../slackkit/SKEntity'
import { openMenu } from '../../sheets/ui/Menu'
import { showAlert } from '../../sheets/ui/Alert'
import { conversationTitle, copyText, isChannel, openOrToast } from '../../sheets/shared'
import { toast } from '../../ui/Toast'
import { toCalendarDate } from '../../../lib/slackDate'
import type { Conversation, Fixture } from '../../../data/types'
import './channel-details.css'

// Channel and DM details (spec sheets-menus.md §4; CD/ = Modules/Features/ConversationDetails/Implementation/,
// CDP = CD/ConversationDetailsPresenter.swift, September 2026 source). Pushed from the header menu's "Settings & Details".
// One list on basePrimary: the header (name, topic, description; for a DM the person), then per conversation type
// (CDP:300-353): Channel — Members, In this conversation, Channel Email Address, Settings; group DM — Members, Channel
// Email Address, Settings; DM — Channel Email Address, Settings. People open as pushes (ConversationDetailsFeature.swift:336-339).
// The nav title (name with its type icon) appears once the list scrolls past 50 pt; the right bar buttons are the
// overflow menu (rightmost) and Edit, sharing one glass capsule (measurements.md: 96 × 44, pencil and …), each only when
// the conversation has it (see below).

export function ChannelDetailsScreen({ route }: { route: Route }) {
  const id = (route.conversationId ?? route.id) as string
  const fx = useApp((s) => s.fx)
  const conv = fx.conversations[id]
  const [scrollY, setScrollY] = useState(0)
  if (!conv) return <div className="ios-pushed-screen cd"><NavBar title="" /></div>
  const channel = isChannel(conv)
  const typeIcon = conv.type === 'private' ? 'lock' : 'channel_filled'

  const overflow = (el: Element | null) =>
    openMenu({
      anchor: el,
      sections: [
        {
          // Star / unstar, members only (CDP:219-266; CD/Helpers/ConversationInfoAdapter.swift:334-371, 635-651)
          items: [conv.starred ? { title: 'Remove from Starred', icon: 'star_filled', onSelect: () => useApp.getState().toggleStar(id) } : { title: 'Move To Starred', icon: 'star', onSelect: () => useApp.getState().toggleStar(id) }],
        },
      ],
    })

  return (
    <div className="ios-pushed-screen cd" data-screen="channel-details">
      <div className="ios-scroll cd__list" onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)}>
        <Header conv={conv} fx={fx} />
        {(channel || conv.type === 'mpim') && <Members conv={conv} fx={fx} />}
        {channel && <InThisConversation conversationId={conv.id} />}
        {hasChannelEmail(fx, conv) && <ChannelEmailAddress conv={conv} fx={fx} />}
        <Settings conv={conv} fx={fx} />
        <div className="cd__end" />
      </div>
      <NavBar
        scrolled={scrollY > 50}
        title={
          // hidden until the list has scrolled past 50 pt (CD/ConversationDetailsViewController.swift:25-28, 250-263)
          <span className={`cd-nav-title${scrollY > 50 ? ' is-shown' : ''}`}>
            <SKNavigationTitle title={conversationTitle(fx, conv)} leftTitleOrnament={channel ? { icon: typeIcon } : undefined} />
          </span>
        }
        trailing={<BarButtons fx={fx} conv={conv} onEdit={() => openOrToast(['edit-channel', 'edit-channel-details', 'edit-details'], { conversationId: id })} onMore={() => overflow(document.querySelector('.cd [aria-label="More Options"]'))} />}
      />
    </div>
  )
}

/**
 * [Edit][More Options] in one capsule, or a lone circle: ConversationDetailsPresenter.swift:65-131 builds [edit, overflow]
 * leading-to-trailing (June :52-113 built [overflow, edit] for UIKit's trailing-first rightBarButtonItems,
 * ConversationDetailsViewController.swift:78-80). More Options ("more_options") when the conversation has menu actions:
 * never for a channel you're not in (ConversationInfoAdapter.swift:341-343), never for Slackbot (no bar items, :128-130).
 * Edit ("edit"): channels you can edit; a group DM with a topic (a custom name too, behind mpdm naming, off); a DM with
 * a topic; never yourself.
 */
function BarButtons({ fx, conv, onEdit, onMore }: { fx: Fixture; conv: Conversation; onEdit: () => void; onMore: () => void }) {
  if (conv.userId === 'USLACKBOT') return null
  const channel = isChannel(conv)
  const member = !channel || (conv.memberIds ?? [fx.me]).includes(fx.me)
  const self = conv.type === 'im' && conv.userId === fx.me
  const more = member
  const edit = channel ? member : conv.type === 'mpim' || (conv.type === 'im' && !self) ? !!conv.topic : false
  const editIcon = <Icon name="edit" size={20} />
  const moreIcon = <Icon name="ellipsis_horizontal_filled" size={20} />
  if (edit && more)
    return (
      <GlassGroup>
        <GlassGroupItem label="Edit" onClick={onEdit}>
          {editIcon}
        </GlassGroupItem>
        <GlassGroupItem label="More Options" onClick={onMore}>
          {moreIcon}
        </GlassGroupItem>
      </GlassGroup>
    )
  if (edit)
    return (
      <GlassButton label="Edit" onClick={onEdit}>
        {editIcon}
      </GlassButton>
    )
  if (more)
    return (
      <GlassButton label="More Options" onClick={onMore}>
        {moreIcon}
      </GlassButton>
    )
  return null
}

// ------------------------------------------------------------------------------------------------ header

function Header({ conv, fx }: { conv: Conversation; fx: Fixture }) {
  const presentSheet = useApp((s) => s.presentSheet)
  const push = useApp((s) => s.push)
  const channel = isChannel(conv)
  const user = conv.userId ? fx.users[conv.userId] : undefined
  const self = conv.userId === fx.me
  const rows: ReactNode[] = []
  if (conv.topic) rows.push(<TextRow key="topic" label="Topic:" text={conv.topic} />)
  if (channel && conv.description) rows.push(<TextRow key="desc" label="Description:" text={conv.description} />)
  // both open Edit Channel (presentEditTopicAndDescription, ConversationDetailsFeature.swift:411-421)
  if (channel && !conv.topic && !conv.description) rows.push(<LinkRow key="add" text="Add Topic or Description" onClick={() => presentSheet('edit-channel', { conversationId: conv.id })} />)
  if (!channel && !conv.topic && !self) rows.push(<LinkRow key="add" text="Add Topic" onClick={() => presentSheet('edit-channel', { conversationId: conv.id, focus: 'topic' })} />)
  // View Full Profile pushes the profile (CDP:790-809; ConversationDetailsFeature.swift:336-339)
  if ((conv.type === 'im' || conv.type === 'app') && user && !self) rows.push(<LinkRow key="profile" text="View Full Profile" onClick={() => push({ screen: 'profile', userId: user.id })} />)
  if (self)
    rows.push(
      <div key="self" className="cd-text">
        {/* this_is_your_space (19991) + only_you_can_see_these_notes (13205) */}
        <b>This is your space.</b> Only you can see these notes. Draft messages, list your to-dos, or keep links and files handy. You can also talk to yourself here, but please bear in mind you’ll have to supply both sides of
        the conversation.
      </div>,
    )
  return (
    <section className="cd-section">
      {channel || conv.type === 'mpim' || !user ? (
        // CD/Views/ConversationDetailsHeaderView.swift:242-276: the type icon inline, a space, the name; .title, 3 lines
        <div className="cd-header">
          <div className="cd-header__name">
            {channel && <Icon name={conv.type === 'private' ? 'lock' : 'channel_filled'} size={22} className="cd-header__icon" />}
            {channel ? ' ' : ''}
            {conversationTitle(fx, conv)}
          </div>
        </div>
      ) : (
        // A DM: 56 pt avatar, 8 pt, the name in .title, then the title and @name in body contentSecondary;
        // tapping pushes the profile (ConversationDetailsHeaderView.swift:199-237, 278-326)
        <div className="cd-header cd-header--person" role="button" onClick={() => push({ screen: 'profile', userId: user.id })} data-tap>
          <span className="cd-header__bg" />
          <SKMemberAvatar src={user.avatar} name={user.realName} size="extraLarge" presence={self ? 'none' : user.presence === 'away' ? 'away' : 'active'} />
          <div className="cd-header__name">{self ? `${user.realName} (you)` : user.realName}</div>
          <div className="cd-header__meta">
            {user.title && <div>{user.title}</div>}
            <div>@{user.name}</div>
          </div>
        </div>
      )}
      {rows}
      <SKListFooter />
    </section>
  )
}

/** "**Topic:** …" in body: the label bold contentPrimary, the text contentSecondary (CDP:567-631). */
function TextRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="cd-text">
      <b>{label} </b>
      <InlineText text={text} />
    </div>
  )
}

function LinkRow({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <div className="cd-text cd-text--link" role="button" onClick={onClick} data-tap-fade>
      {text}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ members

function Members({ conv, fx }: { conv: Conversation; fx: Fixture }) {
  const push = useApp((s) => s.push)
  const ids = memberIds(fx, conv)
  const count = conv.memberCount ?? ids.length
  return (
    <section className="cd-section">
      {/* "Members (%@)" (members_with_count, yaml:12015), "Show All" (show_all, yaml:18938) (CDP:1005-1133) */}
      <SKListHeader title={count ? `Members (${count})` : 'Members'} collapsible={false} button={{ text: 'Show All', label: 'Show All', onClick: () => push({ screen: 'conversation-members', conversationId: conv.id }) }} />
      {ids.length === 0 ? (
        <div className="cd-caption">Add members to this channel to get started.</div>
      ) : (
        // SKMemberCollectionEntity: 56 pt avatars with presence, the name 8 pt below in smallBody, 2 lines, 16 apart,
        // 16 pt at the ends, 4 pt above (SKMemberCollectionEntity.swift:25-29, 384-398, 487-565); a tap pushes the profile
        <div className="cd-strip" data-scroll-x>
          {ids.map((u) => {
            const user = fx.users[u]
            return (
              <button key={u} type="button" className="cd-strip__item" onClick={() => push({ screen: 'profile', userId: u })} data-tap>
                <SKMemberAvatar src={user?.avatar} name={user?.realName ?? u} size="extraLarge" presence={user?.presence === 'away' ? 'away' : 'active'} />
                <span className="cd-strip__name">{user?.realName ?? u}</span>
              </button>
            )
          })}
        </div>
      )}
      <SKListFooter />
    </section>
  )
}

export function memberIds(fx: Fixture, conv: Conversation): string[] {
  if (conv.type === 'mpim') return [...new Set([fx.me, ...(conv.userIds ?? [])])]
  if (conv.type === 'im' || conv.type === 'app') return [fx.me, conv.userId!].filter(Boolean)
  return conv.memberIds ?? [fx.me]
}

function InThisConversation({ conversationId }: { conversationId: string }) {
  return (
    <section className="cd-section">
      <SKListHeader title="In this conversation" collapsible={false} />
      {/* CDP:1137-1222: S rows with a chevron, icons contentPrimary. Apps and Agents both go away behind the
          channelAgentsAppsScreen flag (off; CD/Service/ConversationDetailsService.swift:959-965). */}
      <DetailRow icon="apps" title="Apps" subtitle="Connect apps to power up your channel" chevron onClick={() => openOrToast(['conversation-apps'], { conversationId })} />
      <DetailRow icon="agentforce" title="Agents" subtitle="Connect agents to power up your channel" chevron onClick={() => openOrToast(['conversation-agents'], { conversationId })} />
      <SKListFooter />
    </section>
  )
}

function DetailRow({ id, icon, title, subtitle, chevron, accessory, disabled, onClick }: { id?: string; icon: string; title: string; subtitle?: string; chevron?: boolean; accessory?: ReactNode; disabled?: boolean; onClick?: (el: Element | null) => void }) {
  return (
    <div data-row={id}>
    <SKEntityRow
      className="cd-row"
      // the settings and "In this conversation" icons: contentPrimary (CDP:1172-1210, 1331-1633; June sk_primary_foreground)
      ornament={<Icon name={icon} size={20} color="var(--dt_color_content_primary)" />}
      disabled={disabled}
      title={
        <span className="cd-row__text">
          <span className="cd-row__title">{title}</span>
          {subtitle && <span className="cd-row__subtitle">{subtitle}</span>}
        </span>
      }
      lines={12}
      accessories={chevron ? <Icon name="caret_right_full" size={20} color="var(--dt_color_content_secondary)" /> : accessory}
      onClick={onClick ? () => onClick(id ? document.querySelector(`.cd [data-row="${id}"]`) : null) : undefined}
    />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ channel email address

/**
 * The "Channel Email Address" section (new in the September 2026 source, CDP:1274-1287, 1480-1499): channels, group DMs
 * and DMs on a paid plan that aren't Slack Connect, when the server has an address for them
 * (ChannelEmailAddressService.swift:25-65). The demo has no Slack Connect conversations; yourself and Slackbot don't get it
 * (their details have only Header and Settings, CDP:329-349).
 */
function hasChannelEmail(fx: Fixture, conv: Conversation) {
  if (fx.workspace.plan === 'free') return false
  if (conv.type === 'im') return conv.userId !== fx.me && conv.userId !== 'USLACKBOT'
  return isChannel(conv) || conv.type === 'mpim'
}

/** An address in the form Slack gives channels (name, a token, the workspace's slack.com domain), stable per conversation. */
function channelEmailAddress(fx: Fixture, conv: Conversation) {
  let h = 0
  for (const c of conv.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const local = (isChannel(conv) ? conv.name : conv.type === 'mpim' ? 'mpdm' : 'dm').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  return `${local}-aaaa${h.toString(36).padStart(7, '0')}@${fx.workspace.domain}.slack.com`
}

/**
 * Header "Channel Email Address" (channel_email_address_header), one S row: `email` in contentPrimary, "Copy Email Address"
 * (copy_email_address_context_menu) over "Get an email address that posts incoming emails in this channel."
 * (channel_email_address_description); an 8 pt blank footer. A tap fetches the address (a spinner accessory, the row
 * disabled meanwhile) and copies it with the standard "Copied" toast (ConversationDetailsInteractor.swift:445-470).
 */
function ChannelEmailAddress({ conv, fx }: { conv: Conversation; fx: Fixture }) {
  const [loading, setLoading] = useState(false)
  const copy = () => {
    if (loading) return
    setLoading(true)
    window.setTimeout(() => {
      copyText(channelEmailAddress(fx, conv))
      setLoading(false)
      toast({ text: 'Copied', image: 'toast_checkmark' })
    }, 600)
  }
  return (
    <section className="cd-section" data-section="channel-email">
      <SKListHeader title="Channel Email Address" collapsible={false} />
      <DetailRow id="channel-email" icon="email" title="Copy Email Address" subtitle="Get an email address that posts incoming emails in this channel." accessory={loading ? <SKSpinner /> : undefined} disabled={loading} onClick={copy} />
      <div className="cd-blank" />
    </section>
  )
}

// ------------------------------------------------------------------------------------------------ settings

/** Notifications summary (AllNotificationPreferences.swift:42-73) for the demo's levels. */
function notificationSummary(conv: Conversation) {
  if (conv.muted) return 'Muted'
  const level = conv.notify ?? (isChannel(conv) ? 'mentions' : 'all')
  return level === 'all' ? 'All new posts, mobile push notifications on' : 'Just mentions, mobile push notifications on'
}

function Settings({ conv, fx }: { conv: Conversation; fx: Fixture }) {
  const s = useApp()
  const channel = isChannel(conv)
  const dm = conv.type === 'im' || conv.type === 'app'
  const self = conv.userId === fx.me
  const [hidden, setHidden] = useState(false)

  // The conversation's notification preferences (NotificationSettings: All new posts / Just mentions / Mute), pushed
  const notifications = () => s.push({ screen: 'notification-settings', conversationId: conv.id })

  const leave = () => {
    const go = () => {
      useApp.getState().leaveConversation(conv.id)
    }
    // Leaving a public channel doesn't ask; a private one does (CD/ConversationDetailsFeature.swift:795-849, 851-884).
    if (conv.type !== 'private') return go()
    showAlert({
      title: `Leave ${conv.name}`,
      message: 'If you leave the private channel, you will no longer be able to see any of its messages. To rejoin the private channel, you will have to be re-invited.\n\nAre you sure you wish to leave?',
      actions: [
        { title: 'Cancel', style: 'cancel' },
        { title: 'Yes, leave the private channel', style: 'destructive', onPress: go },
      ],
    })
  }

  const rows: ReactNode[] = []
  // Row order: channels Notifications → Mute (→ Convert for admins); group DMs the same; DMs Mute → Hide
  // (CD/Helpers/ConversationInfoAdapter.swift:176-207, 410-438, 592-612)
  if (!dm)
    rows.push(<DetailRow key="notifications" id="notifications" icon="mobile_notification" title="Notifications" subtitle={notificationSummary(conv)} chevron onClick={notifications} />)
  if (!self)
    rows.push(
      <DetailRow
        key="mute"
        icon="notifications"
        title={channel ? 'Mute Channel' : 'Mute'}
        subtitle={channel ? 'Muted channels will always appear read and you won’t receive any notifications from them.' : 'Muted conversations will always appear read and you won’t receive any notifications from them.'}
        accessory={<SKSwitch isOn={!!conv.muted} onToggled={(on) => s.setNotify(conv.id, on ? 'muted' : (conv.notify ?? 'all'))} accessibilityLabel={channel ? 'Mute Channel' : 'Mute'} />}
      />,
    )
  if (dm && !self && conv.type === 'im')
    rows.push(<DetailRow key="hide" icon="disable" title="Hide" subtitle="Hide this person and their messages. You will still be notified if they mention you." accessory={<SKSwitch isOn={hidden} onToggled={setHidden} accessibilityLabel="Hide" />} />)

  const general = conv.name === 'general'
  const member = channel ? (conv.memberIds ?? [fx.me]).includes(fx.me) : true
  const creator = channel && conv.creatorId ? fx.users[conv.creatorId] : undefined
  return (
    <section className="cd-section" data-rows>
      {rows.length ? <SKListHeader title="Settings" collapsible={false} /> : <div className="cd-blank" />}
      <div className="cd-settings">{rows}</div>
      {/* Destructive buttons, last: a vertical stack of large buttons 8 apart, padding 10 / 16 (CDP:1645-1669, 1796-1832) */}
      <div className="cd-buttons">
        {channel && member && !general && <SKButton title="Leave Channel" icon="sign_out" buttonStyle="outlineDanger" size="large" onClick={leave} />}
        {!channel && !self && <SKButton title="Close Conversation" icon="sign_out" buttonStyle="outlineDanger" size="large" onClick={() => useApp.getState().popToRoot()} />}
      </div>
      {creator && (
        // "<link>%@</link> created this channel on %@." (conversation_details_created_by_on_date, yaml:4597) (CDP:1671-1705);
        // the name pushes the creator's profile
        <div className="cd-caption cd-caption--creator">
          <span className="cd-link" role="button" onClick={() => s.push({ screen: 'profile', userId: creator.id })}>
            {creator.realName}
          </span>
          {conv.created ? ` created this channel on ${createdDate(conv.created)}.` : ' created this channel.'}
        </div>
      )}
      <div className="cd-blank" />
    </section>
  )
}

function createdDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return toCalendarDate(new Date(y, m - 1, d))
}

