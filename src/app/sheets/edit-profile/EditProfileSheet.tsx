import { useState, type ReactNode } from 'react'
import { useApp, useMe } from '../../store'
import type { SheetProps } from '../../nav/registry'
import type { User } from '../../../data/types'
import { Icon } from '../../../icons/Icon'
import { asset } from '../../../lib/asset'
import { SKButton } from '../../../slackkit/SKButton'
import { SKHeaderEntity } from '../../../slackkit/SKEntities'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { ModalPage, ModalStack, useModalNav, type ModalPageComponent } from '../../screens/you/ModalStack'
import { SectionFooter } from '../../screens/you/SettingsRows'
import { MultiLineInput } from '../../screens/you/MultiLineInput'
import './edit-profile.css'

// Edit Profile (Modules/Features/EditProfile, spec you-settings.md §2; slack-objc 14b3cbaf): EditProfileRoute presents a
// form sheet in a navigation controller (Modules/Features/EditProfile/Implementation/EditProfileRouteExecution.swift:7-11)
// for the signed-in user. Its title is an SKLabel in .bodyBlack ("Edit Profile", edit_profile 6053); the close button
// dismisses at once; "Save" (Lato Bold 17, highlight1.content; contentSecondary while disabled) turns on once a value
// differs from where it started (EditProfileViewController.swift:62-91, EditProfilePresenter.swift:129-145,
// EditProfileInteractor.swift:88-92, :208-230). The list: the photo row, then the team's profile sections that hold text
// fields — "Personal information" and the contact section — each a collapsible SKHeaderEntity; only the section you came
// from starts open (EditProfileInteractor.swift:71). Fields are a bold label row, a bordered multi-line field and, after
// a failed save, an error row (EditProfilePresenter.swift:146-195).
// The field list is the team's (team.profile.get); this is Slack's own test fixture's, with ios_edit_profile_map_user_fields
// off (its default): Name, Title, Display name, Pronouns, Name Pronunciation · Email (locked), Phone
// (EditProfileContentProviderTests.swift:495-715). Saving writes the user and dismisses, with no toast (:187-188).
//
//   presentSheet('edit-profile', { userId?, section?: 'header' | 'contact' })

type FieldId = 'realName' | 'title' | 'displayName' | 'pronouns' | 'namePronunciation' | 'email' | 'phone'
interface Field {
  id: FieldId
  label: string
  /** a locked field: the lock glyph before the label, the value greyed and not editable (EditProfilePresenter.swift:153-175) */
  locked?: boolean
}
const SECTIONS: { id: 'header' | 'contact'; title: string; fields: Field[] }[] = [
  {
    id: 'header',
    // the header section is always "Personal information" (personal_information 14704, EditProfileContentProvider.swift:114, 279)
    title: 'Personal information',
    fields: [
      { id: 'realName', label: 'Name' },
      { id: 'title', label: 'Title' },
      { id: 'displayName', label: 'Display name' },
      { id: 'pronouns', label: 'Pronouns' },
      { id: 'namePronunciation', label: 'Name Pronunciation' },
    ],
  },
  {
    id: 'contact',
    // the contact section keeps the team's label (the fixture's "Contact information")
    title: 'Contact information',
    fields: [
      // email is never editable (EditProfileDataTypes+UserProfile.swift:132-135)
      { id: 'email', label: 'Email', locked: true },
      { id: 'phone', label: 'Phone' },
    ],
  },
]

type Values = Record<FieldId, string>
const valuesOf = (u: User | undefined): Values => ({
  realName: u?.realName ?? '',
  title: u?.title ?? '',
  displayName: u?.name ?? '',
  pronouns: u?.pronouns ?? '',
  namePronunciation: u?.namePronunciation ?? '',
  email: u?.email ?? '',
  phone: u?.phone ?? '',
})

/**
 * users.validateName's answers for the name fields (EditProfileErrorParser.swift:10-48; invalid_name_required →
 * empty_display_name_error 5837, invalid_name_maxlength → name_too_long_error 11976, invalid_emoji_not_allowed →
 * emoji_in_name_error 5825). The rules are the server's; the prototype checks the ones its messages state.
 */
function validateName(v: string, required: boolean): string | null {
  if (required && !v.trim()) return 'Unfortunately, you can’t leave this blank.'
  if (v.length > 80) return 'Names can’t be longer than 80 characters.'
  if (/\p{Extended_Pictographic}/u.test(v)) return 'Nice idea! But sadly, names can’t contain emoji.'
  return null
}

const PAGES: Record<string, ModalPageComponent> = { 'edit-profile': EditProfilePage as ModalPageComponent }

export function EditProfileSheet({ userId, section }: SheetProps & { userId?: string; section?: 'header' | 'contact' }) {
  return <ModalStack pages={PAGES} root="edit-profile" rootProps={{ userId, section }} />
}

function EditProfilePage({ userId, section }: { userId?: string; section?: 'header' | 'contact' }) {
  const me = useMe()
  const user = useApp((s) => (typeof userId === 'string' && s.fx.users[userId]) || me)
  const [initial] = useState(() => valuesOf(user))
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({})
  const [open, setOpen] = useState<Set<string>>(() => new Set([section === 'contact' ? 'contact' : 'header']))
  const changed = (Object.keys(values) as FieldId[]).some((k) => values[k] !== initial[k])
  const nav = useModalNav()

  const save = () => {
    if (!changed || !user) return
    // users.validateName runs for the changed name fields (EditProfileInteractor.swift:157-178)
    const next: Partial<Record<FieldId, string>> = {}
    if (values.realName !== initial.realName) {
      const e = validateName(values.realName, true)
      if (e) next.realName = e
    }
    if (values.displayName !== initial.displayName) {
      const e = validateName(values.displayName, false)
      if (e) next.displayName = e
    }
    if (Object.keys(next).length) {
      setErrors(next)
      // open the section with the error
      setOpen((o) => new Set([...o, 'header']))
      return
    }
    // users.profile.set with the changed keys (:180-186); an empty display name shows the full name
    useApp.setState((s) => {
      const u = s.fx.users[user.id]
      if (!u) return {}
      const realName = values.realName.trim() || u.realName
      const patch: Partial<User> = {
        realName,
        name: values.displayName.trim() || realName,
        title: values.title || undefined,
        pronouns: values.pronouns || undefined,
        namePronunciation: values.namePronunciation || undefined,
        phone: values.phone || undefined,
      }
      return { fx: { ...s.fx, users: { ...s.fx.users, [u.id]: { ...u, ...patch } } } }
    })
    nav.close()
  }
  const edit = (id: FieldId, v: string) => {
    setValues((x) => ({ ...x, [id]: v }))
    // errors clear on the next keystroke in any field (:89, :231-235)
    if (Object.keys(errors).length) setErrors({})
  }
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <ModalPage
      title={<span className="ep-title">Edit Profile</span>}
      trailing={{ title: 'Save', weight: 'bold', color: 'var(--dt_color_content_highlight_1)', disabled: !changed, onClick: save }}
      data-screen="edit-profile"
    >
      <PhotoRow user={user} />
      <SectionFooter />
      {SECTIONS.map((s, i) => {
        const isOpen = open.has(s.id)
        return (
          <section key={s.id}>
            <SKHeaderEntity primaryText={s.title} shouldShowCollapseIndicator isCollapsed={!isOpen} onHeaderTapped={() => toggle(s.id)} />
            {isOpen && s.fields.map((f) => <FieldRows key={f.id} field={f} value={values[f.id]} error={errors[f.id]} onChange={(v) => edit(f.id, v)} />)}
            {i < SECTIONS.length - 1 && <SectionFooter />}
          </section>
        )
      })}
    </ModalPage>
  )
}

/**
 * EditProfilePhotoRow (Views/EditProfilePhotoRow.swift): centered, 16 pt above, the 160 × 160 photo (radius 6, aspect
 * fill), 16 pt, "Edit Photo" (SKButton .outlineDefault .medium, 160 wide), 16 pt below: 248 pt (:24-41, :82-217). The
 * button opens the photo options (EditProfileFeature.swift:115-131).
 */
function PhotoRow({ user }: { user: User | undefined }) {
  const presentSheet = useApp((s) => s.presentSheet)
  return (
    <div className="ep-photo">
      <div className="ep-photo__image">
        {user?.avatar ? <img src={asset(user.avatar)} alt="" draggable={false} /> : <SKMemberAvatar name={user?.realName ?? ''} size={160} shouldRoundCorners={false} />}
      </div>
      <div className="ep-photo__button">
        <SKButton title="Edit Photo" buttonStyle="outlineDefault" size="medium" onClick={() => presentSheet('edit-profile-photo', { userId: user?.id })} />
      </div>
    </div>
  )
}

/** A field: its label row, the bordered input and, after a failed save, the error row (EditProfilePresenter.swift:116-163). */
function FieldRows({ field, value, error, onChange }: { field: Field; value: string; error?: string; onChange: (v: string) => void }) {
  let label: ReactNode = field.label
  if (field.locked)
    label = (
      <>
        {/* .lockMedium is an icon-font glyph without an SVG; svgLock is the closest asset */}
        <Icon name="lock" size={15} className="ep-label__lock" /> {field.label}
      </>
    )
  return (
    <>
      <div className="ep-label" aria-hidden>
        {label}
      </div>
      <MultiLineInput value={value} onChange={onChange} error={!!error} disabled={field.locked} accessibilityLabel={field.locked ? `Locked field, ${field.label}` : field.label} placeholder="" />
      {error && (
        <div className="ep-error" role="alert">
          <Icon name="info" size={13} className="ep-error__icon" /> {error}
        </div>
      )}
    </>
  )
}
