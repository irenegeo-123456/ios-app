import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { SKButton } from '../../../slackkit/SKButton'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { SheetBar } from '../ui/SheetBar'
import { TokenField } from '../ui/TokenField'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { emailPlaceholder, isValidEmailAddress } from './email'
import './invite-workspace.css'

// Add by Email (spec channels-people.md §5.3–5.4; IE/ = Modules/Features/InviteEmail/Implementation, IP/ =
// Modules/Features/InvitePicker/Implementation, IC/ = Modules/Features/InviteConfirmation/Implementation). A form sheet
// in a navigation controller: "Cancel" · "Add by Email" · "Send" (IE/InviteEmailFeature.swift:44-75). The tokenized field
// ("name@<your domain>", focused), a one-pixel rule, then one 56 pt row: "Keep typing a full email" until the text is an
// email, then "Invite <email>" with a checkbox; tapping it or Return makes a token (IP/InvitePickerDisplayProvider.swift:
// 250-289, 383-405). Send pushes the confirmation — "Invitations sent", the addresses, "Done" — with no toast: the invite
// sheet opens this with shouldShowSuccessConfirmation (IE/InviteEmailFeature.swift:128-166; ITW/InviteToWorkspaceFeature
// .swift:154-170; IC/InviteConfirmationViewController.swift, InviteConfirmationPresenter.swift).
//
//   presentSheet('invite-by-email')

export function InviteByEmailSheet() {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const me = fx.users[fx.me]
  const [emails, setEmails] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [sent, setSent] = useState<string[] | null>(null)
  const field = useRef<HTMLDivElement>(null)
  // shouldAutofocusTextField (IE/InviteEmailFeature.swift:65), once the sheet is up
  useEffect(() => {
    const t = setTimeout(() => field.current?.querySelector('input')?.focus(), 450)
    return () => clearTimeout(t)
  }, [])

  const text = query.trim()
  const valid = isValidEmailAddress(text)
  const toggle = (email: string) => {
    setEmails((list) => (list.includes(email) ? list.filter((x) => x !== email) : [...list, email]))
    setQuery('')
  }

  if (sent) return <Confirmation emails={sent} workspace={fx.workspace.name} onDone={() => sheet?.dismiss()} />

  return (
    <div className="ive">
      {/* "Cancel" (yaml:3202) and "Send" (yaml:17429), plain, in the bar tint highlight1.content (SLAppearance.swift:37);
          the picker relabels its left item "Close" for VoiceOver (IP/InvitePickerViewController.swift:96-102); Send needs
          a token (:291-303) */}
      <SheetBar
        title={<span className="ive__title">Add by Email</span>}
        leading={{ title: 'Cancel', onClick: () => sheet?.dismiss(), color: 'var(--dt_color_content_highlight_1)', accessibilityLabel: 'Close' }}
        trailing={{
          title: 'Send',
          onClick: () => {
            dismissKeyboard()
            setSent(emails)
          },
          disabled: !emails.length,
          color: 'var(--dt_color_content_highlight_1)',
        }}
      />
      <div className="ive__body" ref={field}>
        <div
          onKeyDown={(e) => {
            // Return adds a valid email (IP/InvitePickerViewController.swift:120-124)
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (valid && !emails.includes(text)) toggle(text)
          }}
        >
          <TokenField
            tokens={emails.map((e) => ({ id: e, text: e, ornament: { icon: 'paper_plane' } }))}
            query={query}
            onQuery={setQuery}
            onRemove={(id) => setEmails((list) => list.filter((x) => x !== id))}
            selected={selected}
            onSelect={setSelected}
            placeholder={emailPlaceholder(me?.email)}
            label="Add by Email"
          />
        </div>
        <div className="ive__rule" />
        {text &&
          (valid ? (
            // "<bold>Invite</bold> %@" (`invite_x`, yaml:10110): paper_plane on .sk_frosty_blue, a checkbox
            // (IP/InvitePickerDisplayProvider.swift:383-405)
            <SKGenericEntity
              primaryText={
                <>
                  <b>Invite</b> {text}
                </>
              }
              ornament={{ icon: { icon: 'paper_plane', color: 'var(--dt_color_content_primary)' }, backgroundColor: 'var(--sk_frosty_blue)' }}
              size="medium"
              accessories={[{ checkbox: { isOn: emails.includes(text), onToggled: () => toggle(text) } }]}
              onSelected={() => toggle(text)}
            />
          ) : (
            // "Keep typing a full email" (`keep_typing_full_email`, yaml:10524) with paper_plane in the default box (:250-268)
            <SKGenericEntity primaryText="Keep typing a full email" ornament={{ icon: { icon: 'paper_plane', color: 'var(--dt_color_content_primary)' } }} size="medium" />
          ))}
      </div>
    </div>
  )
}

/**
 * The confirmation, pushed (IC/InviteConfirmationViewController.swift:18-127): a close.svg ✕ and no title; 16 pt down,
 * a 60 pt circle of .sk_lilypad_green at 15 % with check_filled (19 pt in: 22 pt) in green, 16 pt, "Invitations sent"
 * (yaml:9188) in title (Lato Black 22), 36 pt, then the sent row: the addresses joined by ", " in bodyBold over "Invited
 * as a member of %@. They’ll be able to receive and reply to messages by email until they join." (yaml:9426), user_add
 * in a small box (IC/InviteConfirmationPresenter.swift:30-45,161-181). "Done" (yaml:5390), .primary .large, 16 pt in and
 * above the bottom safe area, dismisses (:47-62).
 */
function Confirmation({ emails, workspace, onDone }: { emails: string[]; workspace: string; onDone: () => void }) {
  return (
    <div className="ive ive--sent">
      <div className="sheet-bar">
        <button type="button" className="sheet-bar__glass sheet-bar__close" aria-label="Close" onClick={onDone} data-tap>
          <Icon name="close" size={20} color="var(--dt_color_content_primary)" />
        </button>
      </div>
      <div className="ive-sent ios-scroll">
        <div className="ive-sent__status">
          <span className="ive-sent__circle" />
          <Icon name="check_filled" size={22} color="var(--sk_lilypad_green)" className="ive-sent__icon" />
        </div>
        <div className="ive-sent__title">Invitations sent</div>
        <SKGenericEntity
          className="ive-sent__row"
          primaryText={<b>{emails.join(', ')}</b>}
          primaryTextNumberOfLines={0}
          secondaryText={`Invited as a member of ${workspace}. They’ll be able to receive and reply to messages by email until they join.`}
          ornament={{ icon: { icon: 'user_add', color: 'var(--dt_color_content_primary)' } }}
          size="small"
        />
      </div>
      <div className="ive-sent__done">
        <SKButton title="Done" buttonStyle="primary" size="large" onClick={onDone} />
      </div>
    </div>
  )
}
