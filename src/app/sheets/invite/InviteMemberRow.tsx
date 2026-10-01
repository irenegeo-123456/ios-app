import { SKGenericEntity } from '../../../slackkit/SKEntities'
import type { User } from '../../../data/types'

// An Add Members row (spec channels-people.md §1.5; IP/InvitePickerDisplayProvider.swift:520-569, Sept 2026): an
// SKMemberEntity .small with `secondaryTextVisibility: .always` (June: .medium) — the 24 pt avatar with presence, the
// name bold, one truncating caption line under it (SKMemberEntity.swift:151-187, 463-469; 56.33 pt in
// SKMemberEntitySnapshotTests/testMemberEntitySmallAlwaysVisibleSecondaryText@3x.png). Someone already in the channel
// reads "Already in channel" (`already_in_channel`, yaml:1739; June "Already in this channel") with the deactivated
// look — grayscale avatar, tertiary text — and no checkbox; anyone else has a checkbox and toggles on tap.
//
// SlackKit's SKMemberEntity shows secondary text at medium only (the June behavior), so this is the SKGenericEntity it
// wraps, with the same bold name and member-avatar ornament.

export function InviteMemberRow({ user, inChannel = false, isOn, onToggle }: { user: User; inChannel?: boolean; isOn: boolean; onToggle: () => void }) {
  return (
    <SKGenericEntity
      primaryText={user.name || user.realName}
      shouldBoldPrimaryText
      secondaryText={inChannel ? 'Already in channel' : user.title}
      secondaryTextNumberOfLines={1}
      ornament={{ memberAvatar: { src: user.avatar, name: user.realName, presence: user.presence === 'away' ? 'away' : 'active', isDeactivated: inChannel } }}
      size="small"
      isEnabled={!inChannel}
      accessories={inChannel ? [] : [{ checkbox: { isOn, onToggled: onToggle } }]}
      onSelected={inChannel ? undefined : onToggle}
    />
  )
}

/** No one matches: "No matches found" / "Try using their email instead" (yaml:12991 / 22317), an M row with svgSearch in
 *  contentPrimary (IP/InvitePickerDisplayProvider.swift:604-620). */
export function InviteNoMatchesRow() {
  return (
    <SKGenericEntity
      primaryText="No matches found"
      secondaryText="Try using their email instead"
      ornament={{ icon: { icon: 'search', color: 'var(--dt_color_content_primary)' } }}
      size="medium"
    />
  )
}
