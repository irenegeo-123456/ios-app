import { useState } from 'react'
import { useApp, type Route } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { GlassButton, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { InlineText } from '../../text/RichText'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKButton } from '../../../slackkit/SKButton'
import { SKEntityRow, SKListHeader } from '../../../slackkit/SKEntity'
import { useDevice } from '../../../sim/store'
import { openMenu } from '../../sheets/ui/Menu'
import { XMark } from '../../sheets/ui/SheetBar'
import { toast } from '../../ui/Toast'
import { copyText, openOrToast, openRegistered } from '../../sheets/shared'
import type { User } from '../../../data/types'
import './profile.css'

// A person's full profile (spec sheets-menus.md §3; UP/ = Modules/Features/UserProfile/Implementation/,
// PC/ = Modules/UIInfra/ProfileComponents/Implementation/). Usually pushed (UserProfileRoute, UP/UserProfileRouteExecution.swift:
// 35-42: from a message, a mention, channel details, the member list), with a back button; presented as a modal
// ('profile' sheet: the reactors sheet, You) it's full screen on iPhone in a navigation controller with a close button
// (UP/Root/UserProfileFeature.swift:67-77). Titled "Profile", an ellipsis menu on the right
// (UP/Root/UserProfileViewController.swift:31-32, 55-63). One list on basePrimary: the header section — photo, name,
// title and pronouns, presence, status, local time, then the action buttons — and below it Contact Information and
// Additional Info. September 2026 source (14b3cbaf): the presenter's mapping lives in UP/Root/UserProfileViewStateMapper.swift.
//
// The action buttons follow the shipping default (flag userProfileEnhancements off, ios_user_profile_enhancements.json:6):
// one full-width outlineDefault large button per row, icon left of the title (UP/Root/UserProfileViewStateMapper.swift:232-303).

export function ProfileScreen({ route }: { route: Route }) {
  return <Profile userId={route.userId as string} />
}

/** The 'profile' sheet (fullScreen modal). */
export function ProfileSheet({ userId }: { sheetKey: string; userId: string }) {
  return <Profile userId={userId} />
}

function Profile({ userId }: { userId: string }) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const pop = useApp((s) => s.pop)
  const device = useDevice()
  const [scrolled, setScrolled] = useState(false)
  const user = fx.users[userId]
  const me = userId === fx.me
  const close = () => (sheet ? sheet.dismiss() : pop())

  if (!user) {
    return (
      <div className="ios-pushed-screen pf">
        <NavBar title={<span className="pf-nav-title">Profile</span>} onBack={close} />
      </div>
    )
  }

  const isBot = !!(user.isBot || user.isApp)
  const photo = device.width - 32
  const menu = (el: HTMLElement) =>
    openMenu({
      anchor: el,
      sections: [
        {
          items: [
            // UP/Menu/UserProfileInfoMenuBuilder.swift:27-44 (Hide %@, :66-75, isn't modelled: no hidden users here)
            { title: 'Copy Huddle Link', icon: 'headphones', onSelect: () => (copyText(`https://${fx.workspace.domain}.slack.com/huddle/${fx.workspace.id}/${userId}`), toast({ text: 'Link copied', image: 'toast_checkmark' })) },
            { title: 'Copy Display Name', icon: 'new_window', onSelect: () => (copyText(user.name), toast({ text: 'Copied', image: 'toast_checkmark' })) },
          ],
        },
      ],
    })

  const message = () => {
    // Message opens the DM (UP/Root/UserProfileViewController.swift:171-190); the profile modal goes first.
    const go = () => {
      const s = useApp.getState()
      s.openConversation(s.openDm([userId]))
    }
    if (sheet) sheet.dismiss(go)
    else go()
  }
  const huddle = () => {
    const go = () => {
      const s = useApp.getState()
      const id = s.openDm([userId])
      if (!openRegistered(['huddle', 'huddle-preview', 'start-huddle'], { conversationId: id })) s.openConversation(id)
    }
    if (sheet) sheet.dismiss(go)
    else go()
  }

  return (
    <div className="ios-pushed-screen pf" data-screen="profile">
      <div className="ios-scroll pf__list" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 2)}>
        {/* ---- header section (UP/Root/ContentProvider/UserProfileContentProvider.swift:612-854) */}
        <div className="pf-photo" style={{ width: photo, height: photo }}>
          {/* SKMemberAvatar .profile: square, full width minus 16 each side, corners min(20, 0.25 × side) (PC/Views/ImageRow.swift:33-40,90-99) */}
          <SKMemberAvatar src={user.avatar} name={user.realName} size={photo} />
        </div>
        <div className="pf-name">
          {/* .title = Lato 22 Black, wraps (PC/Views/NameRow.swift:25-43) */}
          <InlineText text={user.realName} />
        </div>
        {(user.title || pronounsAndPronunciation(user)) && (
          <div className="pf-title">
            {user.title && <div className="pf-title__title">{user.title}</div>}
            {pronounsAndPronunciation(user) && <div className="pf-title__pronouns">{pronounsAndPronunciation(user)}</div>}
          </div>
        )}
        {!isBot && (
          <OrnamentRow icon={user.presence === 'away' ? 'status_member' : 'status_member_filled'} color={user.presence === 'away' ? 'var(--dt_color_content_tertiary)' : 'var(--dt_color_content_highlight_2)'}>
            {user.presence === 'away' ? 'Away' : 'Active'}
          </OrnamentRow>
        )}
        {user.statusEmoji && (
          <OrnamentRow emoji={user.statusEmoji}>
            <InlineText text={user.statusText ?? ''} />
          </OrnamentRow>
        )}
        {!isBot && user.timezone && (
          <OrnamentRow icon="clock" color="var(--dt_color_content_primary)">
            {localTime(user)}
          </OrnamentRow>
        )}
        <div className="pf-buttons">
          {me ? (
            <>
              <SKButton title="Set a Status" buttonStyle="outlineDefault" size="large" onClick={() => openOrToast(['set-status', 'edit-status', 'custom-status'])} />
              <SKButton title="Edit Profile" buttonStyle="outlineDefault" size="large" onClick={() => openOrToast(['edit-profile'])} />
            </>
          ) : (
            <>
              {!user.isApp && <SKButton title="Message" icon="message" buttonStyle="outlineDefault" size="large" onClick={message} data-qa="profile_message" />}
              {!isBot && <SKButton title="Huddle" icon="headphones" buttonStyle="outlineDefault" size="large" onClick={huddle} />}
            </>
          )}
        </div>

        {/* ---- Contact Information (PC/UserProfileDataTypes.swift:34-62; UserProfileContentProvider.swift:1062-1121): the icons
            in contentPrimary (:1073, 1100, 1113; June sk_primary_foreground) */}
        {(user.email || user.phone) && (
          <section className="pf-section">
            <SKListHeader title="Contact Information" collapsible={false} button={me ? { text: 'Edit', label: 'Edit', onClick: () => openOrToast(['edit-profile'], { section: 'contact' }) } : undefined} />
            {user.email && (
              <SKEntityRow
                ornament={<Icon name="email" size={20} color="var(--dt_color_content_primary)" />}
                title={
                  <span className="pf-contact">
                    <span className="pf-contact__primary">{user.email}</span>
                    <span className="pf-contact__secondary">Work</span>
                  </span>
                }
                onClick={() => (copyText(user.email!), toast({ text: 'Copied', image: 'toast_checkmark' }))}
                className="pf-row"
              />
            )}
            {user.phone && <SKEntityRow ornament={<Icon name="call_down" size={20} color="var(--dt_color_content_primary)" />} title={user.phone} className="pf-row" onClick={() => undefined} />}
          </section>
        )}

        {/* ---- Additional Info: M rows, the label in captionBold contentSecondary, the value in body contentPrimary
            (PC/ProfilePresentationObjectMapper.swift:416-466). The demo's "Start Date" field. */}
        {user.startDate && (
          <section className="pf-section">
            <SKListHeader title="Additional Info" collapsible={false} />
            <div className="pf-info">
              <div className="pf-info__label">Start Date</div>
              <div className="pf-info__value">{longDate(user.startDate)}</div>
            </div>
          </section>
        )}
        <div className="pf__end" />
      </div>
      <NavBar
        title={<span className="pf-nav-title">Profile</span>}
        scrolled={scrolled}
        leading={
          // presented, the modal adds its close button: SF "xmark" in contentPrimary, "Close"
          // (ModalPresentationController.swift:400-419 → UIViewController+CloseButton.swift:61-77)
          sheet ? (
            <GlassButton label="Close" onClick={close}>
              <XMark />
            </GlassButton>
          ) : undefined
        }
        onBack={close}
        trailing={
          !isBot ? (
            <GlassButton label="Show more options" onClick={() => menu(document.querySelector('.pf [aria-label="Show more options"]') as HTMLElement)}>
              <Icon name="ellipsis_horizontal_filled" size={20} />
            </GlassButton>
          ) : undefined
        }
      />
    </div>
  )
}

/** The title row's second line: pronouns and the Name Pronunciation field joined by " · ", either alone if the other is empty
 *  (UserProfileContentProvider.swift:671-688). */
function pronounsAndPronunciation(user: User) {
  const pronouns = user.pronouns ?? ''
  const pronunciation = user.namePronunciation ?? ''
  return pronouns && pronunciation ? `${pronouns} · ${pronunciation}` : pronouns || pronunciation
}

/** Ornament text rows (PC/Views/OrnamentTextRow.swift:18-25,72-99): a 20 pt box, 8 pt, smallBody 15 contentPrimary. */
function OrnamentRow({ icon, color, emoji, children }: { icon?: string; color?: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div className="pf-orow">
      <span className="pf-orow__ornament">{emoji ? <Emoji name={emoji} size={20} /> : <Icon name={icon!} size={20} color={color} />}</span>
      <span className="pf-orow__text">{children}</span>
    </div>
  )
}

/** "%@ local time" (time_in_user_timezone, yaml:21695), with " (Tomorrow)" / " (Yesterday)" when their date differs
 *  (Modules/Data/I18n/Implementation/TimeUtility.swift:1171-1213). */
function localTime(user: User) {
  const now = new Date()
  const tz = user.timezone!
  let time: string
  let rel = ''
  try {
    time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(now)
    const day = (zone?: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone }).format(now)
    const theirs = day(tz)
    const mine = day(undefined)
    if (theirs > mine) rel = ' (Tomorrow)'
    else if (theirs < mine) rel = ' (Yesterday)'
  } catch {
    time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(now)
  }
  return `${time}${rel} local time`
}

function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

