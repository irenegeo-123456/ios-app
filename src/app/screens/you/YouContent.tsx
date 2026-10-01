import { useState, type ReactNode } from 'react'
import { useApp, useMe } from '../../store'
import { screenDef, sheetDef } from '../../nav/registry'
import { showActionSheet } from '../../sheets/ui/Alert'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { InlineText } from '../../text/RichText'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKIconButton } from '../../../slackkit/SKIconButton'
import { EntityRow, SectionFooter, BlankDivider } from '../more/EntityRow'
import { isPaused, usePause } from './pause'
import './you.css'

// The You screen's list (Modules/Features/You/Implementation/YouPresenter.swift:101-182, spec shell-navigation.md §4.4):
//
//   section A  header .default (8 pt), footer .hairlineDivider (8 pt + line)
//              profile (YouInfoView) · add-photo banner (default avatar) · status pill (YouStatusView)
//              · Pause notifications · Set yourself as away / active
//   section B  header .blankDivider (8 pt); no footer (it's the last section)
//              Invitations to connect · View profile · [VIP] · [Salesforce] · Notifications · Preferences
//
// ("Saved items" is built and then always filtered out, :164.) Rows are SKGenericEntity .small with a clear 24 pt box
// and a 20 pt icon in contentSecondary (YouPresenter.swift:30-35, slack-objc 14b3cbaf; June: sk_foreground_max_solid).
// `onNavigate` runs a navigation after leaving the modal.

interface Props {
  /** leaves the modal first (the sheet), then runs `then`; the pushed screen runs it right away */
  onNavigate: (then: () => void) => void
  onScroll?: (scrollTop: number) => void
  /** the list's top content inset: the bar above it (a number of points or a CSS length) */
  topInset: number | string
}

export function YouContent({ onNavigate, onScroll, topInset }: Props) {
  const fx = useApp((s) => s.fx)
  const me = useMe()
  const push = useApp((s) => s.push)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const setStatus = useApp((s) => s.setStatus)
  const until = usePause((s) => s.until)
  const [photoBannerDismissed, setPhotoBannerDismissed] = useState(false)
  const paused = isPaused(until)
  const active = me.presence !== 'away'

  const notInPrototype = () => showToast('Not in the prototype')
  const openModal = (name: string) => (sheetDef(name) ? presentSheet(name) : notInPrototype())
  // View profile → CurrentUserProfileRoute, a modal over You (YouFeature.swift:150-151, 191-193): the 'profile' sheet
  const openProfile = () => {
    if (sheetDef('profile')) presentSheet('profile', { userId: me.id })
    else onNavigate(() => (screenDef('profile') ? push({ screen: 'profile', userId: me.id }) : notInPrototype()))
  }
  // the profile row → EditProfileRoute (YouFeature.swift:136-137, 187-189); without an edit-profile sheet, your profile
  const editProfile = () => (sheetDef('edit-profile') ? presentSheet('edit-profile', { userId: me.id }) : openProfile())
  const openSetStatus = () => {
    const name = ['edit-status', 'set-status', 'status'].find((n) => sheetDef(n))
    if (name) presentSheet(name, { userId: me.id })
    else notInPrototype()
  }
  // YouFeatureHandler.swift:30-40: toggles presence immediately (no store action for presence: the user record is patched)
  const togglePresence = () =>
    useApp.setState((s) => {
      const u = s.fx.users[s.fx.me]
      if (!u) return {}
      return { fx: { ...s.fx, users: { ...s.fx.users, [u.id]: { ...u, presence: u.presence === 'away' ? 'active' : 'away' } } } }
    })
  const clearStatus = () => {
    setStatus('', '')
    // YouFeature.swift:124-126: "Status Cleared" (status_cleared, 20670) with toast_checkmark
    showToast('Status Cleared', 'toast_checkmark')
  }

  const hasSalesforce = fx.sections.some((s) => s.kind === 'salesforce')

  return (
    <div className="ios-scroll you-list" style={{ paddingTop: topInset }} onScroll={(e) => onScroll?.((e.target as HTMLElement).scrollTop)} data-sheet-scroll>
      {/* section A: header .default = SKListFooterView.Constants.topMargin (8) at index 0 (SKList.swift:2014-2015) */}
      <BlankDivider />
      <ProfileRow name={me.realName} avatar={me.avatar} active={active} dnd={paused} onClick={editProfile} />
      {!me.avatar && !photoBannerDismissed && (
        // SKBannerEntity (margins 12/16/12/16): a custom-tone banner, highlight1.baseInverse with contentInversePrimary
        // text and icons, svgCameraFilled, a delete (X) accessory, selectable (YouPresenter.swift:229-249)
        <div className="you-banner-row">
          <SKBanner
            type="regular"
            tone="custom"
            customTone={{ backgroundColor: 'var(--dt_color_base_inverse_highlight_1)', textColor: 'var(--dt_color_content_inverse_primary)', ornamentColor: 'var(--dt_color_content_inverse_primary)' }}
            heading="Add a profile photo"
            text="Help your teammates know they’re talking to the right person."
            ornament={{ icon: 'camera_filled' }}
            accessories={[{ delete: { color: 'var(--dt_color_content_inverse_primary)', onClick: () => setPhotoBannerDismissed(true) } }]}
            isSelectable
            onSelected={() =>
              showActionSheet({
                actions: [
                  { title: 'Photo Library', onPress: notInPrototype },
                  { title: 'Take Photo', onPress: notInPrototype },
                  { title: 'Cancel', style: 'cancel' },
                ],
              })
            }
          />
        </div>
      )}
      <StatusRow emoji={me.statusEmoji} text={me.statusText} onClick={openSetStatus} onClear={clearStatus} />
      <IconRow
        icon="notifications_off"
        title="Pause notifications"
        accessoryText={paused ? 'On' : undefined}
        onClick={() => presentSheet('pause-notifications')}
        qa="you_pause_notifications"
      />
      <IconRow
        icon="user_status"
        // set_yourself_away / set_yourself_active: "Set yourself as <bold>away</bold>", .body contentPrimary (:298-313)
        title={
          <>
            Set yourself as <b>{active ? 'away' : 'active'}</b>
          </>
        }
        titleColor="var(--dt_color_content_primary)"
        onClick={togglePresence}
        qa="you_presence"
      />
      <SectionFooter />

      {/* section B: header .blankDivider() (8 pt, not the first section) */}
      <BlankDivider />
      {/* Slack Connect hub (:427-457): contentPrimary, bodyBlack + a count when there are invitations; none in the prototype */}
      <IconRow icon="buildings" title="Invitations to connect" titleColor="var(--dt_color_content_primary)" onClick={notInPrototype} />
      <IconRow icon="user" title="View profile" onClick={openProfile} />
      {hasSalesforce && <IconRow icon="sf_cloud" title="Salesforce" onClick={notInPrototype} />}
      {/* NotificationSettingsRoute(entryPoint: .youTab) and SettingsRoute() (YouFeature.swift:142-145): each presents its
          own form sheet over You (You's modal doesn't take pushes: NotificationSettingsRouteExecution.swift:11-26,
          Preferences/Implementation/SettingsRouteExecution.swift:13-18, ModalPresentationController.swift:349-371) */}
      <IconRow icon="mobile_notification" title="Notifications" onClick={() => openModal('notifications')} qa="you_notifications" />
      <IconRow icon="settings" title="Preferences" onClick={() => openModal('preferences')} qa="you_preferences" />
      <div className="you-list__bottom" />
    </div>
  )
}

/**
 * YouInfoView (Views/YouInfoView.swift): insets 4/16/12/16, the 56 pt avatar (SKMemberAvatar .extraLarge, radius 14,
 * with presence), 16 pt to the text; the name in .subtitle (Lato Black 20) contentPrimary over "Active" / "Away" in
 * .body contentSecondary, 0 spacing. The row is basePrimary, baseSecondary while pressed (:51, :90-96, :117-119).
 */
function ProfileRow({ name, avatar, active, dnd, onClick }: { name: string; avatar?: string; active: boolean; dnd: boolean; onClick: () => void }) {
  // .memberWithPresence(Presence(user:)): paused notifications draw the DND variant of the presence icon
  const presence = dnd ? (active ? 'dnd-active' : 'dnd-away') : active ? 'active' : 'away'
  return (
    <div className="you-profile" role="button" onClick={onClick} data-tap data-qa="you_profile">
      <SKMemberAvatar src={avatar} name={name} size="extraLarge" presence={presence} />
      <div className="you-profile__text">
        <div className="you-profile__name">{name}</div>
        <div className="you-profile__presence">{active ? 'Active' : 'Away'}</div>
      </div>
    </div>
  )
}

/**
 * YouStatusView (insets 4/16/8/16) around UserStatusView: a pill with 8/16/8/16 insets, radius 14 continuous, a 1 pt
 * outlineTertiary border on basePrimary, 12 pt spacing: the 20 pt status emoji (or svgEmoji in contentSecondary), the
 * text (.body), and the clear button (SKIconButton svgClose, contentSecondary, "Clear Status") when a status is set.
 * Height max(20, text, 40) + 16 = 56. Pressed: baseTertiary, scale 0.99, the placeholder turns emoji_filled
 * (UserStatusView.swift:25-59, :93-101, :161-165).
 */
function StatusRow({ emoji, text, onClick, onClear }: { emoji?: string; text?: string; onClick: () => void; onClear: () => void }) {
  const set = !!emoji || !!text
  return (
    <div className="you-status-row">
      <div className="you-status" role="button" onClick={onClick} data-tap data-qa="you_status">
        {emoji ? (
          <Emoji name={emoji} size={20} className="you-status__emoji" />
        ) : (
          <span className="you-status__placeholder">
            <span className="is-normal">
              <Icon name="emoji" size={20} />
            </span>
            <span className="is-pressed">
              <Icon name="emoji_filled" size={20} />
            </span>
          </span>
        )}
        <span className={`you-status__text${set ? '' : ' is-placeholder'}`}>{set ? <InlineText text={text ?? ''} /> : 'What’s your status?'}</span>
        {set && (
          <span className="you-status__clear" onClick={(e) => e.stopPropagation()}>
            <SKIconButton icon="close" size="small" iconColor="var(--dt_color_content_secondary)" selectedIconColor="var(--dt_color_content_secondary)" accessibilityLabel="Clear Status" onClick={onClear} />
          </span>
        )}
      </div>
    </div>
  )
}

/** An SKGenericEntity .small row: a clear 24 pt box with the 20 pt icon, the title in .body, optional accessory text. */
function IconRow({ icon, title, titleColor, accessoryText, onClick, qa }: { icon: string; title: ReactNode; titleColor?: string; accessoryText?: string; onClick: () => void; qa?: string }) {
  return (
    <EntityRow
      size="small"
      // YouPresenter's iconColor: contentSecondary (:32)
      ornament={<Icon name={icon} size={20} color="var(--dt_color_content_secondary)" />}
      title={title}
      titleColor={titleColor}
      titleLines={0}
      // accessoryText: .body contentSecondary, 1 line (SKEntityContentView.swift:61-62)
      accessories={accessoryText ? <span className="you-accessory-text">{accessoryText}</span> : undefined}
      onClick={onClick}
      data-qa={qa}
    />
  )
}
