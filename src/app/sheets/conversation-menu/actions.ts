import type { Conversation, Fixture, SidebarSection } from '../../../data/types'
import { isIconName } from '../../../icons/Icon'
import type { MenuElement, MenuIcon, MenuSection } from '../ui/Menu'
import { useApp } from '../../store'
import { conversationTitle } from '../../../messagekit/format'
import { showAlert } from '../ui/Alert'
import { toast } from '../../ui/Toast'
import { copyText, isChannel } from '../shared'

// What the conversation menus do (the header menu's "…" and rows, Home's long-press menu), as ConversationActionHandler
// does it (Modules/Features/Handlers/SectionItemAction/Implementation/ConversationActionHandler.swift, CAH below): the
// same confirmations and the same toasts, in white-icon SKToasts (CAH:113-139; slack-objc main @ 14b3cbaf).

/** CAH.showToast: the icon 30 × 30 in white, 1 s on screen; without an icon at most 200 pt wide (CAH:42-47,113-139). */
const handlerToast = (text: string, image?: string) => toast({ text, image, imageSize: 30, duration: 1, maxWidth: image ? undefined : 200 })

/** deprecated_nameWithPublicChannelPrefixOnly: "#name" for public channels, the plain name otherwise. */
export const namePrefixed = (fx: Fixture, conv: Conversation) => (conv.type === 'channel' ? `#${conv.name}` : conversationTitle(fx, conv))

/** ConversationLinkHelper.generateLink: https://<domain>.slack.com/archives/<id> */
export const channelLink = (fx: Fixture, id: string) => `https://${fx.workspace.domain}.slack.com/archives/${id}`

/** "Copy Channel Link" → "Link copied" (copied_link) with toast_checkmark (CAH:621-631; CopyPasteHandler.swift:251-263,397-407). */
export function copyChannelLink(fx: Fixture, id: string) {
  copyText(channelLink(fx, id))
  toast({ text: 'Link copied', image: 'toast_checkmark' })
}

/** "Copy Name": "#name" for public channels, the people's names for DMs → "Copied" (CAH:582-599). */
export function copyName(fx: Fixture, conv: Conversation) {
  copyText(namePrefixed(fx, conv))
  toast({ text: 'Copied', image: 'toast_checkmark' })
}

/** "Copy Huddle Link" → "Link copied" (CAH:563-580). */
export function copyHuddleLink(fx: Fixture, id: string) {
  copyText(`https://${fx.workspace.domain}.slack.com/huddle/${fx.workspace.id}/${id}`)
  toast({ text: 'Link copied', image: 'toast_checkmark' })
}

/**
 * Leave is offered for channels you're in, never #general (ConversationActionBuilder.swift:154-168; since September
 * never a public channel for frontline workers, :159-161, which the clone doesn't model).
 */
export const canLeave = (fx: Fixture, conv: Conversation) => isChannel(conv) && conv.name !== 'general' && (conv.memberIds ?? [fx.me]).includes(fx.me)

/**
 * "Leave Channel": an alert "Leave #name?" — "You can rejoin anytime." or, private, "To rejoin, someone must add you to
 * this channel again." — with Leave Channel (destructive) and Cancel; then "You’ve left #name" with sign_out
 * (CAH:364-440; leave_channel_confirmation_title yaml:10762, leave_public/private_channel_subtitle_message 10793 / 10789,
 * leave_channel_success_toast 10776).
 */
export function leaveChannel(fx: Fixture, conv: Conversation) {
  const name = namePrefixed(fx, conv)
  showAlert({
    title: `Leave ${name}?`,
    message: conv.type === 'private' ? 'To rejoin, someone must add you to this channel again.' : 'You can rejoin anytime.',
    actions: [
      {
        title: 'Leave Channel',
        style: 'destructive',
        onPress: () => {
          useApp.getState().leaveConversation(conv.id)
          handlerToast(`You’ve left ${name}`, 'sign_out')
        },
      },
      { title: 'Cancel', style: 'cancel' },
    ],
  })
}

/** Star / unstar: "Moved to Starred" (star) or "Removed from Starred" (unstar) (CAH:146-203; moved_to_section, removed_from_section). */
export function toggleStar(conv: Conversation) {
  useApp.getState().toggleStar(conv.id)
  if (conv.starred) handlerToast('Removed from Starred', 'unstar')
  else handlerToast('Moved to Starred', 'star')
}

/** Mute / unmute: "Muted #name" (notifications_off) or "Unmuted #name" (notifications) (CAH:500-526). */
export function toggleMute(fx: Fixture, conv: Conversation) {
  const s = useApp.getState()
  const name = namePrefixed(fx, conv)
  if (conv.muted) {
    s.setNotify(conv.id, conv.notify ?? (isChannel(conv) ? 'mentions' : 'all'))
    handlerToast(`Unmuted ${name}`, 'notifications')
  } else {
    s.setNotify(conv.id, 'muted')
    handlerToast(`Muted ${name}`, 'notifications_off')
  }
}

/** "Mark as Read" → "Marked #name as read" (check_filled) (CAH:528-545). */
export function markAsRead(fx: Fixture, conv: Conversation) {
  useApp.getState().markRead(conv.id)
  handlerToast(`Marked ${namePrefixed(fx, conv)} as read`, 'check_filled')
}

/** The notification level the header menu and details show: "All", "Mentions" or "Muted" (ConversationTabsMenuDataTypes.swift:94-132). */
export function notifyLevel(conv: Conversation): { label: 'All' | 'Mentions' | 'Muted'; icon: string } {
  if (conv.muted) return { label: 'Muted', icon: 'notifications_off' }
  const level = conv.notify ?? (isChannel(conv) ? 'mentions' : 'all')
  return level === 'all' ? { label: 'All', icon: 'notifications_all_new_posts' } : { label: 'Mentions', icon: 'notifications' }
}

/**
 * The header menu's "Move" pull-down on paid plans (ConversationTabsMenuPresenter.swift:469-546 →
 * moveChannelSection(isCollapsible: false), SectionItemActionBuilder.swift:32-139), drawn inline: with custom sections a
 * "Move To…" section (move_to_context_menu_title) of Starred and your sections, the one it's in checked, then Move to New
 * Section and Remove from <section> (destructive); without, Move To Starred / Remove from Starred and Move to New Section.
 */
export function moveMenuSections(fx: Fixture, conv: Conversation): MenuSection[] {
  const s = useApp.getState()
  const custom = fx.sections.filter((x) => x.kind === 'custom')
  const newSection: MenuElement = { title: 'Move to New Section', icon: 'plus', onSelect: () => s.showToast('Not in the prototype') }
  if (!custom.length) return [{ items: [conv.starred ? { title: 'Remove from Starred', icon: 'unstar', onSelect: () => toggleStar(conv) } : { title: 'Move To Starred', icon: 'star', onSelect: () => toggleStar(conv) }, newSection] }]
  const inSection = custom.find((x) => x.conversationIds.includes(conv.id))
  const sectionIcon = (x: SidebarSection): MenuIcon | undefined => (!x.icon ? undefined : isIconName(x.icon) ? x.icon : { emoji: x.icon })
  const bottom: MenuElement[] = [newSection]
  if (inSection)
    bottom.push({
      title: `Remove from ${inSection.name}`,
      icon: 'clear',
      destructive: true,
      onSelect: () => {
        s.moveToSection(conv.id, null)
        handlerToast(`Removed from ${inSection.name}`, 'clear')
      },
    })
  else if (conv.starred) bottom.push({ title: 'Remove from Starred', icon: 'clear', destructive: true, onSelect: () => toggleStar(conv) })
  return [
    {
      title: 'Move To…',
      items: [
        { title: 'Starred', icon: 'star', checked: !!conv.starred, onSelect: () => !conv.starred && toggleStar(conv) },
        ...custom.map(
          (x): MenuElement => ({
            title: x.name,
            icon: sectionIcon(x),
            checked: x.id === inSection?.id,
            onSelect:
              x.id === inSection?.id
                ? undefined
                : () => {
                    s.moveToSection(conv.id, x.id)
                    handlerToast(`Moved to ${x.name}`, 'star_filled')
                  },
          }),
        ),
      ],
    },
    { items: bottom },
  ]
}
