import { useRef, type ReactNode } from 'react'
import { SKRadioButton } from '../../../slackkit/SKRadioButton'
import { SKButton } from '../../../slackkit/SKButton'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { openMenu } from '../../sheets/ui/Menu'
import { ModalPage } from '../you/ModalStack'
import { Blank, SectionFooter, SectionHeader, SwitchRow } from '../you/SettingsRows'
import { ColorModeImage } from './ColorModeImages'
import { useColorMode, type ColorMode } from './colorMode'
import { usePreferenceToggles, type ActivitySwipeAction, type DMSwipeAction } from './prefs'
import './preferences.css'

// The screens Preferences pushes that the prototype draws (spec you-settings.md §5.2-§5.5). Their switches save at once;
// a list of sections with .default headers and no footers is rows 8 pt down with nothing between them.

/**
 * Color Mode (Appearance, AppearanceViewController.swift:25-60; slack-objc 14b3cbaf): one section of AppearanceOptionRow —
 * 96 pt rows, 20 pt in, the 93 × 72 picture, 16 pt, the title (.body contentPrimary) over an optional .caption subtitle
 * in secondaryLabel, 16 pt, an SKRadioButton that only shows the state (tapping the row picks); basePrimary, baseTertiary
 * while highlighted (AppearanceOptionRow.swift:16-24, :74-76, :116-118; June UIKit's systemBackground / systemGray5).
 * System / Light / Dark ("True Dark 😎" needs the global flag ios_true_dark, off) (AppearancePresenter.swift:57-88).
 * Picking one sets the window's overrideUserInterfaceStyle (LoggedInViewController.swift:69-91): here, the simulator.
 */
export function ColorModePage() {
  const mode = useColorMode((s) => s.mode)
  const setMode = useColorMode((s) => s.setMode)
  const rows: { mode: ColorMode; title: string; subtitle?: string }[] = [
    { mode: 'system', title: 'System', subtitle: 'Uses device settings' },
    { mode: 'light', title: 'Light' },
    { mode: 'dark', title: 'Dark' },
  ]
  return (
    <ModalPage title="Color Mode" data-screen="preferences-color-mode">
      {rows.map((r) => (
        <div key={r.mode} className="pf-mode" role="radio" aria-checked={mode === r.mode} onClick={() => setMode(r.mode)} data-tap>
          <ColorModeImage mode={r.mode} />
          <span className="pf-mode__text">
            <span className="pf-mode__title">{r.title}</span>
            {r.subtitle && <span className="pf-mode__subtitle">{r.subtitle}</span>}
          </span>
          <span className="pf-mode__radio" aria-hidden>
            <SKRadioButton isOn={mode === r.mode} />
          </span>
        </div>
      ))}
    </ModalPage>
  )
}

/** One-row sections with no footers (MessageDisplay, Links, Input Options, Huddles, Time). */
const Rows = ({ children }: { children: ReactNode }) => (
  <>
    <Blank />
    {children}
  </>
)

/** Message Display (MessageDisplaySettingsPresenter.swift:32-125). */
export function MessageDisplayPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Message Display" data-screen="preferences-message-display">
      <Rows>
        {/* enabled while a team has display_real_names on (the demo's does) */}
        <SwitchRow icon="user" title="Display Full Names" subtitle="See first and last names" isOn={t.displayFullNames} onChange={(on) => t.set({ displayFullNames: on })} />
        <SwitchRow icon="keyboard" title="Display Typing Indicator" subtitle="Typing indicators will be displayed" isOn={t.typingIndicator} onChange={(on) => t.set({ typingIndicator: on })} />
        <SwitchRow icon="image" title="Collapse All Images" subtitle="Images in messages will be collapsed" isOn={t.collapseImages} onChange={(on) => t.set({ collapseImages: on })} />
      </Rows>
    </ModalPage>
  )
}

/** Links (LinkSettingsPresenter.swift:32-113): Underline Links is off-limits (and shows the system's) while synced. */
export function LinksPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Links" data-screen="preferences-links">
      <Rows>
        {/* the subtitle is "Matches device setting for Increase Contrast" in the source (:96) */}
        <SwitchRow icon="link" title="Sync with iOS" subtitle="Matches device setting for Increase Contrast" isOn={t.linksSyncWithSystem} onChange={(on) => t.set({ linksSyncWithSystem: on })} />
        <SwitchRow icon="underline" title="Underline Links" isOn={t.linksSyncWithSystem ? false : t.underlineLinks} isEnabled={!t.linksSyncWithSystem} onChange={(on) => t.set({ underlineLinks: on })} />
      </Rows>
    </ModalPage>
  )
}

/** Input Options (InputOptionsPresenter.swift:35-75): one hard-coded, unlocalized row. */
export function InputOptionsPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Input Options" data-screen="preferences-input-options">
      <Rows>
        <SwitchRow icon="code_block" title="Format messages with markup" subtitle="The text formatting toolbar won't show in the composer." isOn={t.formatWithMarkup} onChange={(on) => t.set({ formatWithMarkup: on })} />
      </Rows>
    </ModalPage>
  )
}

/** Animation & Haptics (AnimationHapticsSettingsPresenter.swift:28-201): Allow Animated Images follows Reduce Motion while synced. */
export function AnimationHapticsPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Animation & Haptics" data-screen="preferences-animation">
      <SectionHeader title="Animation" />
      <SwitchRow icon="refresh" title="Sync with iOS" subtitle="Matches device setting for Reduce Motion" isOn={t.motionSyncWithSystem} onChange={(on) => t.set({ motionSyncWithSystem: on })} />
      {/* synced: the system's value (Reduce Motion off → allowed) (AnimationHapticsSettingsInteractor.swift:44-57) */}
      <SwitchRow icon="gif" title="Allow Animated Images" isOn={t.motionSyncWithSystem ? true : t.animatedImages} isEnabled={!t.motionSyncWithSystem} onChange={(on) => t.set({ animatedImages: on })} />
      <SectionFooter />
      <SectionHeader title="Haptics" />
      <SwitchRow icon="remind" title="Allow Haptics" subtitle="Adds a sense of touch when interacting with the app." isOn={t.haptics} onChange={(on) => t.set({ haptics: on })} />
    </ModalPage>
  )
}

/** Images & Video (ImagesAndVideoSettingsPresenter.swift:28-198). */
export function ImagesVideoPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Images & Video" data-screen="preferences-images">
      <SectionHeader title="Images" />
      <SwitchRow icon="image" title="Optimize Images for Upload" subtitle="Images are optimized for upload performance" isOn={t.optimizeImages} onChange={(on) => t.set({ optimizeImages: on })} />
      <SwitchRow icon="save" title="Save Media to Camera Roll" isOn={t.saveMedia} onChange={(on) => t.set({ saveMedia: on })} />
      <SectionFooter />
      <SectionHeader title="Video" />
      <SwitchRow icon="video" title="Optimize Videos for Upload" subtitle="Videos are optimized for upload performance" isOn={t.optimizeVideos} onChange={(on) => t.set({ optimizeVideos: on })} />
    </ModalPage>
  )
}

/** Huddles (HuddlesSettingsPresenter.swift:28-90): one row since September — "Raise to listen" is gone (June had it first). */
export function HuddlesPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Huddles" data-screen="preferences-huddles">
      <Rows>
        <SwitchRow icon="music" title="Play music when alone in a huddle" isOn={t.musicWhenAlone} onChange={(on) => t.set({ musicWhenAlone: on })} />
      </Rows>
    </ModalPage>
  )
}

/** The actions' titles and menu icons (SwipeActionsSettingsDataTypes.swift:51-95; toggle_read_state_swipe_action_title
 *  21892, toggle_mute_swipe_action_title 21889, toggle_archive_state_swipe_action_title 21879, none 13165). */
const SWIPE_TITLES: Record<DMSwipeAction | ActivitySwipeAction, string> = { toggleReadState: 'Mark as Read/Unread', toggleMute: 'Mute/Unmute', archive: 'Clear/Restore', none: 'None' }
const SWIPE_ICONS: Partial<Record<DMSwipeAction | ActivitySwipeAction, string>> = { toggleReadState: 'mark_as_read', toggleMute: 'notifications_off', archive: 'eraser' }
const DM_ACTIONS: DMSwipeAction[] = ['toggleReadState', 'toggleMute', 'none']
const ACTIVITY_ACTIONS: ActivitySwipeAction[] = ['toggleReadState', 'archive', 'none']

/**
 * A Left Swipe / Right Swipe row: an SKGenericEntity .small with the direction (.body, wraps) and, as its accessory, a
 * .quickAction (medium) button showing the current action with svgCaretDown on the right; the button is a pull-down
 * menu (isPrimaryAction) of every action, the current one checked (SwipeActionsSettingsPresenter.swift:26-32, :65-92).
 */
function SwipeRow<A extends DMSwipeAction | ActivitySwipeAction>({ title, value, actions, onChange }: { title: string; value: A; actions: A[]; onChange: (a: A) => void }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const open = () =>
    openMenu({
      anchor: anchor.current,
      sections: [{ items: actions.map((a) => ({ title: SWIPE_TITLES[a], icon: SWIPE_ICONS[a], checked: a === value, onSelect: () => onChange(a) })) }],
    })
  return (
    <SKGenericEntity
      primaryText={title}
      primaryTextNumberOfLines={0}
      accessories={[
        <span key="button" ref={anchor} className="pf-swipe__button" onClick={(e) => e.stopPropagation()}>
          <SKButton title={SWIPE_TITLES[value]} buttonStyle="quickAction" size="medium" icon="caret_down" iconPosition="right" onClick={open} />
        </span>,
      ]}
    />
  )
}

/**
 * Swipe Actions (SwipeActionsSettings, title swipe_actions 20874; SwipeActionsSettingsViewController.swift:40): DMs and
 * Activity sections (Chat too with ios_swipe_to_reply, off), each an SKHeaderEntity, Left Swipe (left_swipe 10814) and
 * Right Swipe (right_swipe 16716), no row separators, a hairline footer (SwipeActionsSettingsPresenter.swift:22-63;
 * section titles dms 5586, activity 586: SwipeActionsSettingsDataTypes.swift:38-47). A pick saves at once
 * (SwipeActionsManager.swift:75-100). Since September the row is always in Preferences (the
 * ios_swipe_actions flag is gone, PreferencesPresenter.swift:235-238) and Activity offers Clear/Restore without the
 * activityInbox flag (:78-92).
 */
export function SwipeActionsPage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Swipe Actions" data-screen="preferences-swipe-actions">
      <SectionHeader title="DMs" />
      <SwipeRow title="Left Swipe" value={t.dmsLeftSwipe} actions={DM_ACTIONS} onChange={(a) => t.set({ dmsLeftSwipe: a })} />
      <SwipeRow title="Right Swipe" value={t.dmsRightSwipe} actions={DM_ACTIONS} onChange={(a) => t.set({ dmsRightSwipe: a })} />
      <SectionFooter />
      <SectionHeader title="Activity" />
      <SwipeRow title="Left Swipe" value={t.activityLeftSwipe} actions={ACTIVITY_ACTIONS} onChange={(a) => t.set({ activityLeftSwipe: a })} />
      <SwipeRow title="Right Swipe" value={t.activityRightSwipe} actions={ACTIVITY_ACTIONS} onChange={(a) => t.set({ activityRightSwipe: a })} />
    </ModalPage>
  )
}

/** Time (TimeSettingsPresenter.swift:31-115). */
export function TimePage() {
  const t = usePreferenceToggles()
  return (
    <ModalPage title="Time" data-screen="preferences-time">
      <Rows>
        <SwitchRow icon="hourglass" title="Set Time Zone Automatically" isOn={t.automaticTimeZone} onChange={(on) => t.set({ automaticTimeZone: on })} />
        <SwitchRow icon="clock" title="Use 24-hour Clock" subtitle="Display time in 24-hour format" isOn={t.clock24} onChange={(on) => t.set({ clock24: on })} />
      </Rows>
    </ModalPage>
  )
}
