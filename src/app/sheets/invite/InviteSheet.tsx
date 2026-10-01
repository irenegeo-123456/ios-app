import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { SKButton } from '../../../slackkit/SKButton'
import { toast } from '../../ui/Toast'
import { copyText } from '../shared'
import './invite-workspace.css'

// "Invite people to join your team" (spec channels-people.md §5.2; ITW/ = Modules/Features/InviteToWorkspace/
// Implementation): DMs' "Add Teammates" and the creation menu's "Invite" present it. A legacy SKBottomSheet hugging its
// content, no bar and no close button (ITW/InviteToWorkspaceFeature.swift:30-45), holding an SKDialog (margins 24; 20
// between kinds of item, 16 between buttons, SKDialog.swift:233-273): the title in subtitleBold, centered; "Share a Link"
// (.primary .large, share); "Add from Contacts" (user_add) and "Add by Email" (email), .outlineDefault .large
// (ITW/InviteToWorkspacePresenter.swift:82-146). "Add by Email" closes it and presents Add by Email (§5.3).
//
//   presentSheet('invite')

/** The link the server hands out (JoinURLParams: the team's domain, `shared_invite`, a code; Modules/Integration/Join). */
const inviteLink = (domain: string) => `https://join.slack.com/t/${domain}/shared_invite/zt-3prototype-invite`

export function InviteSheet() {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)

  // "Share a Link" gets the link, then the system share sheet; the clone does what its Copy action does: the message, a
  // space and the link, then "Copied" (`copied`, yaml:4319) (CopyUIActivity.swift:24-76; `join_me_on_slack_sign_up_here`, yaml:9685)
  const share = () =>
    sheet?.dismiss(() => {
      copyText(`Join me on Slack -- it’s a faster, simpler way to work. Sign up here, from any device: ${inviteLink(fx.workspace.domain)}`)
      toast({ text: 'Copied', image: 'toast_checkmark' })
    })
  const contacts = () => sheet?.dismiss(() => useApp.getState().showToast('Not in the prototype'))
  const byEmail = () => sheet?.dismiss(() => useApp.getState().presentSheet('invite-by-email'))

  return (
    <div className="ivw" data-qa="invite_to_workspace">
      {/* "Invite people to join your team" (`invite_people_to_join_your_team`, yaml:9332) */}
      <div className="ivw__title">Invite people to join your team</div>
      {/* "Share a Link" (yaml:17310), .primary .large with share.svg (ITW/InviteLinkDetailDialogContentItem.swift:260-262) */}
      <SKButton title="Share a Link" buttonStyle="primary" size="large" icon="share" onClick={share} className="ivw__button ivw__button--first" />
      {/* "Add from Contacts" (yaml:725) with user_add.svg; "Add by Email" (yaml:674) with email.svg */}
      <SKButton title="Add from Contacts" buttonStyle="outlineDefault" size="large" icon="user_add" onClick={contacts} className="ivw__button ivw__button--first" />
      <SKButton title="Add by Email" buttonStyle="outlineDefault" size="large" icon="email" onClick={byEmail} className="ivw__button" />
    </div>
  )
}
