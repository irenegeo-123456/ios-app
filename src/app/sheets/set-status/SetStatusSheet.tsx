import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react'
import { useApp, useMe } from '../../store'
import type { SheetProps } from '../../nav/registry'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { SKTextField } from '../../../slackkit/SKTextField'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { ModalPage, ModalStack, useModalNav, type ModalPageComponent } from '../../screens/you/ModalStack'
import { Blank, NavRow, RadioRow, SectionFooter, SectionHeader, iconOrnament } from '../../screens/you/SettingsRows'
import { DateWheels } from '../../screens/you/DateWheels'
import {
  DEFAULT_STATUS_EMOJI,
  expiryDate,
  expiryLabel,
  expiryTitle,
  nextHalfHour,
  sameExpiry,
  setMyStatus,
  useRecentStatuses,
  useStatusPresets,
  type Expiry,
} from './status'
import './set-status.css'

// Set a Status (Modules/Features/EditStatus, spec you-settings.md §1; slack-objc 14b3cbaf): a form sheet in its own
// navigation controller (EditStatusRouteExecution.swift:5-9, CustomStatusFeature.swift:171-178) titled "Set a Status"
// (set_a_status 17691), the close button on the left; on the right the check (svgCheck, "Save") once something changed
// and the text is 100 characters or fewer, or "Clear" in important.content ("Clear Status") when nothing changed and a
// status is set (CustomStatusViewController.swift:20-27, :52-59, CustomStatusInteractor.swift:789-806). The list: the
// editor (emoji button and text field), "Clear after…", Recent, and the workspace's presets
// (CustomStatusPresenter.swift:212-292); the Scheduled section (flag ios_scheduled_status, off) isn't drawn. A preset or a
// recent status only fills the editor; the check saves it ("Set Status" toast) and Clear clears it ("Status Cleared"),
// and both dismiss (CustomStatusFeature.swift:225-236). It edits whoever is signed in.
//
//   presentSheet('set-status')

interface Draft {
  /** the emoji you picked (or the status had); null shows the smiley, or speech_balloon once there's text */
  emoji: string | null
  text: string
  expiry: Expiry
}

interface Editor {
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  initial: Draft
}

const EditorContext = createContext<Editor | null>(null)
const useEditor = () => useContext(EditorContext)!

/** Status must be %i characters or fewer. (CustomStatusInteractor.swift:46, :761-773; yaml 20691) */
const MAX = 100

/** The emoji the status shows: yours, else speech_balloon once there's text (CustomStatusInteractor.swift:47, :597-633). */
const shownEmoji = (d: Draft) => d.emoji ?? (d.text ? DEFAULT_STATUS_EMOJI : null)

const PAGES: Record<string, ModalPageComponent> = { 'set-status': SetStatusPage, 'set-status-clear-after': ClearAfterPage }

export function SetStatusSheet(_props: SheetProps) {
  const me = useMe()
  const [initial] = useState<Draft>(() => ({
    emoji: me?.statusEmoji || null,
    text: me?.statusText ?? '',
    // a status from the server always comes back as a custom date (its expiration) (CustomStatusInteractor.swift:292)
    expiry: me?.statusExpiration ? { custom: me.statusExpiration } : 'dontClear',
  }))
  const [draft, setDraft] = useState<Draft>(initial)
  return (
    <EditorContext.Provider value={{ draft, setDraft, initial }}>
      <ModalStack pages={PAGES} root="set-status" />
    </EditorContext.Provider>
  )
}

function SetStatusPage() {
  const nav = useModalNav()
  const { draft, setDraft, initial } = useEditor()
  const me = useMe()
  const fx = useApp((s) => s.fx)
  const showToast = useApp((s) => s.showToast)
  const presets = useStatusPresets((s) => s.presets)
  const recents = useRecentStatuses((s) => (me ? s.byUser[me.id] : undefined)) ?? []
  const removeRecent = useRecentStatuses((s) => s.remove)

  const emoji = shownEmoji(draft)
  const changed = emoji !== shownEmoji(initial) || draft.text !== initial.text || !sameExpiry(draft.expiry, initial.expiry)
  const hasStatus = !!(me?.statusEmoji || me?.statusText)
  const tooLong = draft.text.length > MAX

  const close = (then?: () => void) => nav.close(then)
  const clearStatus = () => {
    // Clear: empty text and emoji, no expiration (CustomStatusInteractor.swift:656-674)
    setMyStatus('', '', null)
    showToast('Status Cleared', 'toast_checkmark')
    close()
  }
  const save = () => {
    if (!changed || tooLong) return
    const e = emoji ?? ''
    // both empty is a clear; "now" is the moment you save (CustomStatusInteractor.swift:683-685)
    if (!e && !draft.text) return clearStatus()
    const end = expiryDate(draft.expiry)
    setMyStatus(e, draft.text, end ? end.getTime() : null)
    if (me) useRecentStatuses.getState().add(me.id, { emoji: e, text: draft.text, expiry: draft.expiry })
    showToast('Set Status', 'toast_checkmark')
    close()
  }
  const pickEmoji = () => {
    // the picker opens with the keyboard hidden; the pick replaces the icon (CustomStatusInteractor.swift:482-493,
    // CustomStatusFeature.swift:200-213)
    dismissKeyboard()
    useApp.getState().presentSheet('emoji-picker', { onPick: (name: string) => setDraft((d) => ({ ...d, emoji: name })) })
  }
  const fill = (s: { emoji: string; text: string; expiry: Expiry }) => setDraft({ emoji: s.emoji || null, text: s.text, expiry: s.expiry })

  return (
    <ModalPage
      title="Set a Status"
      trailing={
        !changed && hasStatus
          ? // clearBarButton.tintColor = important.content (CustomStatusViewController.swift:59; June sk_raspberry_red)
            { title: 'Clear', label: 'Clear Status', color: 'var(--dt_color_content_important)', onClick: clearStatus }
          : { icon: 'check', label: 'Save', color: 'var(--dt_color_content_highlight_1)', disabled: !changed || tooLong, onClick: save }
      }
      data-screen="set-status"
    >
      {/* the editor section: header .blankDivider(), which hidesWhenFirstRow, so nothing above it here
          (CustomStatusPresenter.swift:213; SKListHeaderPresentationObject.swift:17, SKList.swift:2076-2081) */}
      <div className="st-editor">
        <button type="button" className={`st-emoji${emoji ? ' has-emoji' : ''}`} aria-label="Select Emoji" onClick={pickEmoji} data-tap>
          {emoji ? (
            <Emoji name={emoji} size={20} />
          ) : (
            <>
              <span className="st-emoji__normal">
                <Icon name="emoji" size={20} />
              </span>
              <span className="st-emoji__pressed">
                <Icon name="emoji_filled" size={20} />
              </span>
            </>
          )}
        </button>
        <SKTextField
          className="st-field"
          text={draft.text}
          placeholderText="What’s your status?"
          borderColor="clear"
          edgeInsets={{ top: 0, left: 0, bottom: 0, right: 0 }}
          textFieldPlaceholderTextColor="var(--dt_color_content_tertiary)"
          returnKeyType="default"
          accessibilityLabel="What’s your status?"
          onTextChanged={(text) => setDraft((d) => ({ ...d, text }))}
          // the clear button resets the emoji and the expiry too (CustomStatusInteractor.swift:494-506, :635-654)
          onClearButtonTapped={() => setDraft({ emoji: null, text: '', expiry: 'dontClear' })}
        />
      </div>
      {tooLong && (
        <div className="st-banner">
          <SKBanner type="small" tone="error" text={`Status must be ${MAX} characters or fewer.`} />
        </div>
      )}
      <SectionFooter />

      {/* the expiry section: header .blankDivider() (8 pt, not the first section) (CustomStatusPresenter.swift:214);
          svgClock in contentPrimary, "Clear after…" with the choice under it, a chevron (:195-209) */}
      <Blank />
      <NavRow ornament={iconOrnament('clock', 'var(--dt_color_content_primary)')} title="Clear after…" subtitle={expiryLabel(draft.expiry)} onSelect={() => nav.push('set-status-clear-after')} />
      <SectionFooter />

      {recents.length > 0 && (
        <>
          <SectionHeader title="Recent" />
          {recents.map((r) => (
            <SKGenericEntity
              key={`${r.emoji}|${r.text}`}
              primaryText={r.text}
              primaryTextNumberOfLines={0}
              secondaryText={expiryTitle(r.expiry)}
              ornament={{ icon: { emoji: r.emoji } }}
              accessories={[{ delete: { onClick: () => me && removeRecent(me.id, r) } }]}
              onSelected={() => fill(r)}
            />
          ))}
          <SectionFooter />
        </>
      )}

      {/* "For %@" with the workspace's name (for_presets 7324), else "Status" (CustomStatusPresenter.swift:105-111) */}
      <SectionHeader title={fx.workspace.name ? `For ${fx.workspace.name}` : 'Status'} />
      {presets.map((p) => (
        <SKGenericEntity key={p.text} primaryText={p.text} primaryTextNumberOfLines={0} secondaryText={expiryTitle(p.expiry)} ornament={{ icon: { emoji: p.emoji } }} onSelected={() => fill(p)} />
      ))}
    </ModalPage>
  )
}

/** The choices, in CustomStatusExpirationInteractor's order (New/StatusExpiration/CustomStatusExpirationInteractor.swift:16);
 *  2 hours is preset-only. */
const CHOICES: Expiry[] = ['dontClear', 'thirtyMinutes', 'oneHour', 'fourHours', 'today', 'thisWeek']

/**
 * "Clear after…" (New/StatusExpiration): pushed; one section 8 pt down, radio rows. Anything but Custom goes back to
 * the editor at once; Custom adds a date picker under it (5-minute steps, from the next :00 or :30) and stays
 * (CustomStatusExpirationPresenter.swift:32-71, …Interactor.swift:49-153). The picker is UIDatePicker .compact on iOS;
 * the prototype shows the wheels.
 */
function ClearAfterPage() {
  const nav = useModalNav()
  const { draft, setDraft } = useEditor()
  const custom = typeof draft.expiry === 'object' ? draft.expiry : null
  const min = nextHalfHour()
  const pick = (e: Expiry) => {
    setDraft((d) => ({ ...d, expiry: e }))
    nav.pop()
  }
  const pickCustom = () => {
    if (custom) return
    // it starts from the current choice's end time, or now for Don't Clear (:123-137), no earlier than the minimum
    const start = expiryDate(draft.expiry) ?? new Date()
    setDraft((d) => ({ ...d, expiry: { custom: Math.max(start.getTime(), min.getTime()) } }))
  }
  return (
    <ModalPage title="Clear after…" data-screen="set-status-clear-after">
      <Blank />
      {CHOICES.map((e) => (
        <RadioRow key={String(e)} title={expiryTitle(e)} isOn={!custom && sameExpiry(draft.expiry, e)} onSelect={() => pick(e)} />
      ))}
      <RadioRow title="Custom" isOn={!!custom} onSelect={pickCustom} />
      {custom && (
        <div className="st-picker">
          <DateWheels value={new Date(custom.custom)} min={min} minuteInterval={5} onChange={(d) => setDraft((x) => ({ ...x, expiry: { custom: d.getTime() } }))} />
        </div>
      )}
    </ModalPage>
  )
}
