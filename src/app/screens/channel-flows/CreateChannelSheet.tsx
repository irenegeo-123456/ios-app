import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { SKTextField } from '../../../slackkit/SKTextField'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import { SKGenericEntity, SKHeaderEntity } from '../../../slackkit/SKEntities'
import { TokenField } from '../../sheets/ui/TokenField'
import { InviteMemberRow, InviteNoMatchesRow } from '../../sheets/invite/InviteMemberRow'
import { toast } from '../../ui/Toast'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import type { Fixture, Message, User } from '../../../data/types'
import { channelNameErrorText, channelNameInput, validateChannelName, type ChannelNameError } from './channelName'
import '../../sheets/ui/sheet-bar.css'
import './create-channel.css'

// Create a Channel (spec channels-people.md §1; CC/ = Modules/Features/CreateChannel/Implementation, CNI/ =
// Modules/Features/ChannelNameInput/Implementation, CVP/ = Modules/Features/ChannelVisibilityPicker/Implementation,
// IP/ = Modules/Features/InvitePicker/Implementation). One form sheet holding its own navigation stack
// (CC/CreateChannelFeature.swift:119-126): Name → (push) Visibility → Create → Add Members, which replaces the stack
// (:373-384), with "Channel\ncreated" toasted 0.2 s later (:386-389). Its ✕ or "Add" closes the sheet and opens the
// channel (:392-414). Whoever presents it (Home's "Add channel", the creation menu, the channel browser) gets the channel
// opened in its place.
//
//   presentSheet('create-channel')

type Step = 'name' | 'visibility' | 'members'
interface Layer {
  key: string
  step: Step
}

/** UIKit's push inside the sheet's navigation controller (the app's StackView uses the same 0.35 s) */
const PUSH_MS = 350

export function CreateChannelSheet() {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const [name, setName] = useState('')
  const [error, setError] = useState<ChannelNameError | null>(null)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [channelId, setChannelId] = useState<string | null>(null)
  const [layers, setLayers] = useState<Layer[]>([{ key: 'name', step: 'name' }])
  const [leaving, setLeaving] = useState<Layer | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const push = (step: Step) => setLayers((l) => [...l, { key: `${step}-${Date.now()}`, step }])
  const pop = () => {
    const top = layers.at(-1)
    if (!top || layers.length < 2) return
    setLeaving(top)
    setLayers(layers.slice(0, -1))
    later(PUSH_MS, () => setLeaving(null))
  }
  /** setFeatures([feature], animated: true): the new screen slides in like a push, then it's the only one */
  const replace = (step: Step) => {
    const layer = { key: `${step}-${Date.now()}`, step }
    setLayers((l) => [...l, layer])
    later(PUSH_MS, () => setLayers([layer]))
  }

  // "Next": conversations.validateName (CNI/ChannelNameInputInteractor.swift:65-88) — here the local stand-in
  const next = () => {
    const e = validateChannelName(useApp.getState().fx, name)
    setError(e)
    if (e) return
    // the field's screen goes away, and its keyboard with it (resignFirstResponder)
    dismissKeyboard()
    push('visibility')
  }
  // "Create": conversations.create, stored as joined (ConversationsCreateAction.swift:35-50)
  const create = () => {
    const s = useApp.getState()
    const e = validateChannelName(s.fx, name)
    if (e) {
      setError(e)
      pop()
      return
    }
    const id = s.createChannel({ name, isPrivate: visibility === 'private' })
    setChannelId(id)
    replace('members')
    // "Channel\ncreated" (`channel_created`, yaml:3553) with toast_checkmark, 1.3 s, 0.2 s after the push (CC:386-389)
    later(200, () => toast({ text: 'Channel\ncreated', image: 'toast_checkmark', duration: 1.3 }))
  }
  // The ✕ and "Add" both close the sheet, then the channel opens (CC/CreateChannelFeature.swift:392-414)
  const finish = (add: string[]) => {
    const id = channelId
    if (!id) return sheet?.dismiss()
    sheet?.dismiss(() => {
      const s = useApp.getState()
      if (add.length) s.addMembers(id, add)
      // opened from the channel browser: the channel takes its place (ChannelPickerCoordinator.swift:226-235)
      if (s.stacks[s.tab].at(-1)?.route.screen === 'browse-channels') s.pop()
      s.openConversation(id)
    })
  }

  const top = layers.at(-1)!
  const shown = leaving ? [...layers, leaving] : layers
  return (
    <div className="chc">
      {shown.map((layer) => {
        const isLeaving = layer === leaving
        const covered = !isLeaving && layer !== top
        const entering = layer === top && layers.length > 1 && !leaving
        const cls = ['chc-layer', entering && 'is-entering', isLeaving && 'is-leaving', covered && 'is-covered'].filter(Boolean).join(' ')
        return (
          <div key={layer.key} className={cls} aria-hidden={covered || isLeaving || undefined}>
            {layer.step === 'name' && (
              <NameStep
                name={name}
                error={error}
                workspace={fx.workspace.name}
                onName={(t) => {
                  setName(t)
                  setError(null)
                }}
                onClose={() => sheet?.dismiss()}
                onNext={next}
              />
            )}
            {layer.step === 'visibility' && <VisibilityStep name={name} workspace={fx.workspace.name} value={visibility} onChange={setVisibility} onBack={pop} onCreate={create} />}
            {layer.step === 'members' && channelId && <MembersStep fx={fx} channelId={channelId} onClose={() => finish([])} onAdd={finish} />}
            <div className="chc-layer__shade" />
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ the bar

/** The sheet's navigation bar on iOS 26 (src/app/sheets/ui/SheetBar.tsx's geometry): glass controls 44 pt, 16 pt from
 *  the sheet's sides and top, the title centered on them. */
function Bar({ leading, title, trailing }: { leading: ReactNode; title: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="sheet-bar chc-bar">
      {leading}
      <div className="sheet-bar__title">{title}</div>
      {trailing}
    </div>
  )
}

/** The automatic close button: SF Symbols "xmark" in a glass circle (UIViewController+CloseButton.swift:61-77). */
const CloseX = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="sheet-bar__glass sheet-bar__close" aria-label="Close" onClick={onClick} data-tap>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M1.9 1.9 14.1 14.1M14.1 1.9 1.9 14.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </button>
)

/** A Slack icon bar button in a glass circle: the back caret (SKBarButtonItem .back, `caret_left_full`) or `close`. */
const IconBarButton = ({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) => (
  <button type="button" className="sheet-bar__glass sheet-bar__close" aria-label={label} onClick={onClick} data-tap>
    <Icon name={icon} size={20} />
  </button>
)

/** A plain or `.prominent` title bar button: UIKit's system font in the bar tint highlight1.content (SLAppearance.swift:37). */
const TextBarButton = ({ title, disabled, prominent, onClick }: { title: string; disabled?: boolean; prominent?: boolean; onClick: () => void }) => (
  <button type="button" className={`sheet-bar__glass sheet-bar__text is-trailing chc-bar__text${prominent ? ' is-prominent' : ''}`} disabled={disabled} onClick={onClick} data-tap={disabled ? undefined : ''}>
    {title}
  </button>
)

/** Slack's `<bold>` spans (Text(textWithFormattingTag:tag:"bold")) */
function boldTagged(text: string): ReactNode {
  return text.split(/(<bold>.*?<\/bold>)/).map((part, i) => (part.startsWith('<bold>') ? <b key={i}>{part.slice(6, -7)}</b> : part))
}

// ------------------------------------------------------------------------------------------------ step 1: name

function NameStep({ name, error, workspace, onName, onClose, onNext }: { name: string; error: ChannelNameError | null; workspace: string; onName: (t: string) => void; onClose: () => void; onNext: () => void }) {
  const field = useRef<HTMLDivElement>(null)
  // the field becomes first responder once the screen has appeared (CNI/ChannelNameInputViewController.swift:36-39)
  useEffect(() => {
    const t = setTimeout(() => field.current?.querySelector('input')?.focus(), 450)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      {/* "Create a Channel" (yaml:4874), no subtitle; ✕ as the first screen; "Next" (yaml:12867), .plain on iOS 26,
          enabled with a name (CNI/ChannelNameInputPresenter.swift:65-74; ChannelNameInputViewController.swift:65-82) */}
      <Bar leading={<CloseX onClick={onClose} />} title={<SKNavigationTitle title="Create a Channel" />} trailing={<TextBarButton title="Next" disabled={!name} onClick={onNext} />} />
      <div className="chc-page ios-scroll">
        <SKHeaderEntity primaryText="Name" />
        <div className="chc-row chc-row--input" ref={field}>
          {/* SKSingleLineTextInputEntity, borderless, margins 12 / 16; svgChannel in contentTertiary (Sept 2026; June
              .sk_foreground_high); placeholder "project-pigeon" (yaml:4936) in .sk_black_high_contrast
              (CNI/ChannelNameInputPresenter.swift:80-102) */}
          <SKTextField
            text={name}
            onTextChanged={(t) => onName(channelNameInput(t))}
            ornament={{ ornament: { icon: 'channel', color: 'var(--dt_color_content_tertiary)' }, size: 'small' }}
            placeholderText="project-pigeon"
            textFieldPlaceholderTextColor="var(--sk_black_high_contrast)"
            borderColor="clear"
            edgeInsets={{ top: 0, left: 0, bottom: 0, right: 0 }}
            autocapitalizationType="none"
            returnKeyType="default"
            accessibilityLabel="Name"
          />
        </div>
        <div className="chc-row chc-row--banner">
          {/* SKBannerEntity, .regular (CNI/ChannelNameInputPresenter.swift:104-144): the hint's text in caption 13; the
              error's in the banner's own .body 17, `<bold>` spans bold — Sept 2026 builds it with Text(format:
              spanOperationGroups:) and no font, so the .regular banner font applies (Banner.swift:371; June caption) */}
          {error ? (
            <SKBanner type="regular" tone="error" text={boldTagged(channelNameErrorText(error, workspace))} />
          ) : (
            <SKBanner type="regular" tone="genericLight" text={<span className="chc-caption">Channels are where conversations happen around a topic. Use a name that’s easy to find and understand.</span>} />
          )}
        </div>
        <div className="chc-blank" />
      </div>
    </>
  )
}

// ------------------------------------------------------------------------------------------------ step 2: visibility

function VisibilityStep({ name, workspace, value, onChange, onBack, onCreate }: { name: string; workspace: string; value: 'public' | 'private'; onChange: (v: 'public' | 'private') => void; onBack: () => void; onCreate: () => void }) {
  return (
    <>
      {/* "Create a Channel" over "#name"; the back caret; "Create" (yaml:4500), .prominent on iOS 26
          (CVP/ChannelVisibilityPickerPresenter.swift:53-61; ChannelVisibilityPickerViewController.swift:54-71) */}
      <Bar leading={<IconBarButton icon="caret_left_full" label="Back" onClick={onBack} />} title={<SKNavigationTitle title="Create a Channel" subtitle={`#${name}`} />} trailing={<TextBarButton title="Create" prominent onClick={onCreate} />} />
      <div className="chc-page ios-scroll">
        <SKHeaderEntity primaryText="Visibility" />
        {/* SKGenericEntity .medium, no ornament, the title wrapping, a radio button; the row selects (presenter :67-88, :163-180) */}
        <SKGenericEntity
          primaryText={
            <>
              Public - Anyone in <b>{workspace}</b>
            </>
          }
          primaryTextNumberOfLines={0}
          size="medium"
          accessories={[{ radioButton: { isOn: value === 'public', onToggled: () => onChange('public') } }]}
          onSelected={() => onChange('public')}
        />
        <SKGenericEntity
          primaryText="Private - Only specific people"
          secondaryText="Can only be viewed or joined by invitation."
          primaryTextNumberOfLines={0}
          size="medium"
          accessories={[{ radioButton: { isOn: value === 'private', onToggled: () => onChange('private') } }]}
          onSelected={() => onChange('private')}
        />
      </div>
    </>
  )
}

// ------------------------------------------------------------------------------------------------ step 3: add members

/** addEveryoneVisibilityMembersThreshold (Modules/Integration/Onboarding/Interface/OnboardingConstants.swift:18-20) */
const ADD_EVERYONE_MAX = 10

/** Everyone but you, apps and bots: people you DM most recently first, then A–Z (the adapter's frecent + paged users). */
function invitable(fx: Fixture, messages: Record<string, Message[]>, channelMembers: string[]): User[] {
  const all = Object.values(fx.users).filter((u) => u.id !== fx.me && !u.isBot && !u.isApp && u.id !== 'USLACKBOT' && !channelMembers.includes(u.id))
  const last = new Map<string, number>()
  for (const c of Object.values(fx.conversations)) if (c.type === 'im' && c.userId) last.set(c.userId, parseFloat(messages[c.id]?.at(-1)?.ts ?? '0'))
  const recent = all.filter((u) => last.has(u.id)).sort((a, b) => (last.get(b.id) ?? 0) - (last.get(a.id) ?? 0))
  const rest = all.filter((u) => !last.has(u.id)).sort((a, b) => a.realName.localeCompare(b.realName))
  return [...recent, ...rest]
}

const matches = (u: User, q: string) => {
  const hit = (s?: string) => !!s && (s.toLowerCase().startsWith(q) || s.toLowerCase().split(/[\s._-]+/).some((w) => w.startsWith(q)))
  return hit(u.name) || hit(u.realName) || hit(u.email)
}

function MembersStep({ fx, channelId, onClose, onAdd }: { fx: Fixture; channelId: string; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const messages = useApp((s) => s.messages)
  const members = fx.conversations[channelId]?.memberIds ?? [fx.me]
  // the initial list, kept for "Add Everyone"
  const [initial] = useState(() => invitable(fx, messages, members))
  const everyoneVisible = initial.length > 0 && initial.length <= ADD_EVERYONE_MAX
  // with Add Everyone showing, everyone starts selected (IP/InvitePickerInteractor.swift:220-235)
  const [picked, setPicked] = useState<string[]>(() => (everyoneVisible ? initial.map((u) => u.id) : []))
  const [query, setQuery] = useState('')
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [banner, setBanner] = useState(true)
  const q = query.trim().toLowerCase().replace(/^@/, '')
  const people = useMemo(() => (q ? initial.filter((u) => matches(u, q)).sort((a, b) => a.realName.localeCompare(b.realName)) : initial), [initial, q])
  const everyone = everyoneVisible && initial.every((u) => picked.includes(u.id))

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    setQuery('')
  }
  const toggleEveryone = () => setPicked((p) => (everyone ? p.filter((id) => !initial.some((u) => u.id === id)) : [...new Set([...p, ...initial.map((u) => u.id)])]))

  return (
    <>
      {/* "Add Members" (yaml:785); close.svg on the left, VoiceOver "Close"; "Add" (yaml:639), plain, enabled with a
          selection (I2C/Helpers/I2CInvitePickerConfigFactory.swift:81-130; IP/InvitePickerViewController.swift:291-303) */}
      <Bar leading={<IconBarButton icon="close" label="Close" onClick={onClose} />} title={<span className="chf-plain-title">Add Members</span>} trailing={<TextBarButton title="Add" disabled={!picked.length} onClick={() => onAdd(picked)} />} />
      <div className="chc-page chc-page--members ios-scroll">
        {everyoneVisible && !q && (
          // "Add Everyone" (yaml:748) / "Everyone in your workspace will be added to this channel." (yaml:6528), a checkbox
          // (IP/InvitePickerDisplayProvider.swift:310-333)
          <SKGenericEntity
            primaryText="Add Everyone"
            secondaryText="Everyone in your workspace will be added to this channel."
            primaryTextNumberOfLines={0}
            size="medium"
            accessories={[{ checkbox: { isOn: everyone, onToggled: toggleEveryone } }]}
            onSelected={toggleEveryone}
          />
        )}
        <TokenField
          tokens={picked.map((id) => ({ id, text: fx.users[id]?.name || fx.users[id]?.realName || id, ornament: { member: { src: fx.users[id]?.avatar } } }))}
          query={query}
          onQuery={setQuery}
          onRemove={(id) => setPicked((p) => p.filter((x) => x !== id))}
          selected={selectedToken}
          onSelect={setSelectedToken}
          onFocus={() => setBanner(false)}
          placeholder="Laura, @mahesh, name@example.com"
          label="Enter username or email address"
        />
        <div className="chc-rule" />
        {banner && !q && (
          // InviteToChannelInvitePickerAdapter.swift:513-520: genericLight, body, svgEmojiObjects, a delete ✕
          // (`invite_slack_connect_prompt_formatted`, yaml:10048); 16 pt around it (IP/InvitePickerViewController.swift:268-276)
          <div className="chc-info">
            <SKBanner
              type="regular"
              tone="genericLight"
              ornament={{ icon: 'emoji_objects', color: 'var(--dt_color_content_primary)' }}
              text={
                <>
                  <b>Working with external people from other organizations?</b> Simply type their email above.
                </>
              }
              accessories={[{ delete: { color: 'var(--dt_color_content_primary)', onClick: () => setBanner(false) } }]}
            />
          </div>
        )}
        {people.length === 0 ? (
          <InviteNoMatchesRow />
        ) : (
          // SKMemberEntity .small with the title always shown, a checkbox (IP/InvitePickerDisplayProvider.swift:520-569)
          people.map((u) => <InviteMemberRow key={u.id} user={u} isOn={picked.includes(u.id)} onToggle={() => toggle(u.id)} />)
        )}
        <div className="chc-end" />
      </div>
    </>
  )
}
