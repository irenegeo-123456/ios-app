import type { ReactNode } from 'react'
import { useApp, useMe } from '../../store'
import { SKHeaderEntity } from '../../../slackkit/SKEntities'
import { copyText } from '../../sheets/shared'
import { toast } from '../../ui/Toast'
import { ModalPage, useModalNav } from '../you/ModalStack'
import { NavRow, SectionFooter } from '../you/SettingsRows'
import { useColorMode } from './colorMode'
import './preferences.css'

// Preferences (Modules/Features/Preferences, spec you-settings.md §5.1; slack-objc 14b3cbaf): SettingsRoute presents it
// as a form sheet over You, in a navigation controller later routes push into (Preferences/Implementation/
// SettingsRouteExecution.swift:13-18). Titled "Preferences" (preferences 14979), the automatic close button, no right
// item (PreferencesViewController.swift:32-40). Sections under pinned SKHeaderEntity .medium headers, every row an
// SKGenericEntity .small with a secondary line and a chevron or a new_window icon — no switches in this list
// (PreferencesPresenter.swift:50-75, :164-292). This is what an internal (dogfood) build shows a paid team on iPhone,
// flags at their defaults: the Internally Visible section (internal settings builds only) carries Themes (flag
// ios_ia4_theme_picker, on here); Swipe Actions is always there since September (its flag is gone, :235-238); Calendar
// Display (mobile_calendar_page), Passkeys (ios_passkeys_registration_promotion + ios_passkeys_sign_in) and the internal
// "Prototypes" section (Radical Simplification opt-ins, :77-161) are off; Intune / Google rows and the Commit / Pull
// Request rows of PR builds don't apply. Rows with nothing behind them in the prototype say so.

const VERSION = '26.10.10 (370000)' // CFBundleShortVersionString (CFBundleVersion) (App/Info.plist:23-24, :50-51, slack-objc 14b3cbaf; June 26.07.10)

/** A pinned section (sectionHeaderPinningBehavior .pinToTop, PreferencesPresenter.swift:67): the header sticks under the bar. */
function Section({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <section className="pf-section">
      <div className="pf-section__header">
        <SKHeaderEntity primaryText={title} />
      </div>
      {children}
      {!last && <SectionFooter />}
    </section>
  )
}

export function PreferencesRoot() {
  const nav = useModalNav()
  const fx = useApp((s) => s.fx)
  const me = useMe()
  const showToast = useApp((s) => s.showToast)
  const mode = useColorMode((s) => s.mode)
  const n = () => showToast('Not in the prototype')
  const plan = fx.workspace.plan
  // the Administration section: free and standard (Pro) plans (PreferencesInteractor.swift:308-316)
  const admin = plan === 'free' || plan === 'pro'
  const planName = plan === 'free' ? 'Free Plan' : plan === 'pro' ? 'Pro Plan' : 'Business Plan'
  // TimeZone.localizedName(.standard) + " (REGION)" (PreferencesInteractor.swift:494-507)
  const zone = timeZoneName(me?.timezone)

  return (
    <ModalPage title="Preferences" data-screen="preferences">
      <Section title="Internally Visible">
        <NavRow icon="cogs" title="Internal Settings" onSelect={n} />
        <NavRow icon="magic_wand" title="Playgrounds" onSelect={n} />
        <NavRow
          icon="paintbrush"
          // svgPaintbrush in contentPrimary; a .text badge, highlight1.content on sk_frosty_blue (PreferencesPresenter.swift:
          // 303-305; June sk_primary_foreground and sk_highlight)
          title="Themes"
          accessories={[{ badge: { title: 'NEW', badgeStyle: 'text', textColor: 'var(--dt_color_content_highlight_1)', backgroundColor: 'var(--sk_frosty_blue)' } }, 'chevron']}
          // ThemePickerRoute: fullScreen over this sheet (PreferencesFeature.swift:254-255)
          onSelect={() => useApp.getState().presentSheet('theme-picker')}
        />
      </Section>
      <Section title="Notifications">
        <NavRow icon="mobile_notification" title="Notifications" subtitle="Customize your notifications" onSelect={() => nav.push('notifications')} />
        {plan !== 'free' && <NavRow icon="vip" title="VIP List" subtitle="Manage your VIP list and notifications" onSelect={n} />}
      </Section>
      <Section title="Appearance">
        <NavRow icon="slack_logo" title="App Icon" subtitle="White" onSelect={n} />
        <NavRow icon="paintbrush" title="Color Mode" subtitle={{ system: 'System', light: 'Light', dark: 'Dark' }[mode]} onSelect={() => nav.push('preferences-color-mode')} />
        <NavRow icon="emoji" title="Default Emoji Skin Tone" accessories={[{ emoji: 'hand' }, 'chevron']} onSelect={n} />
        <NavRow icon="message" title="Message Display" subtitle="Modify name, image, typing display" onSelect={() => nav.push('preferences-message-display')} />
        <NavRow icon="link" title="Links" subtitle="Customize the style of links" onSelect={() => nav.push('preferences-links')} />
        <NavRow icon="formatting" title="Input Options" subtitle="Configure message formatting and input settings" onSelect={() => nav.push('preferences-input-options')} />
      </Section>
      <Section title="Accessibility">
        <NavRow icon="gif" title="Animation & Haptics" subtitle="GIFs and touch" onSelect={() => nav.push('preferences-animation')} />
        <NavRow icon="direct_messages" title="Screen Reader" subtitle="Customize how messages are read out by your screen reader" onSelect={n} />
        {/* svgArrowRight in contentPrimary, no subtitle (PreferencesPresenter.swift:558-559); SwipeActionsSettingsRoute
            pushes inside this sheet (PreferencesFeature.swift:250-251) */}
        <NavRow icon="arrow_right" title="Swipe Actions" onSelect={() => nav.push('preferences-swipe-actions')} />
      </Section>
      <Section title="Audio, Video & Images">
        <NavRow icon="image" title="Images & Video" subtitle="Optimize files & save media" onSelect={() => nav.push('preferences-images')} />
        {/* prefs_huddles_subtitle_music_only (15049): raise to listen is gone (PreferencesPresenter.swift:579-590) */}
        <NavRow icon="headphones" title="Huddles" subtitle="Change music settings" onSelect={() => nav.push('preferences-huddles')} />
      </Section>
      <Section title="Language & Region">
        {/* the server's enabledLocales name for your locale (PreferencesInteractor.swift:509-513) */}
        <NavRow icon="globe" title="Language" subtitle="English (US)" onSelect={n} />
        <NavRow icon="clock" title="Time" subtitle={zone} onSelect={() => nav.push('preferences-time')} />
      </Section>
      <Section title="Privacy & Security">
        <NavRow icon="eye_open" title="Slack Connect Discoverability" subtitle="Visibility to people outside your organization" onSelect={n} />
        <NavRow icon="lock" title="Privacy Policy" subtitle="How Slack collects and uses information" accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]} onSelect={n} />
        <NavRow icon="user" title="Account Settings" accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]} onSelect={n} />
      </Section>
      <Section title="Device & Troubleshooting">
        <NavRow icon="new_window" title="Browser Application" subtitle="Select the browser to open links" onSelect={n} />
        <NavRow icon="plug" title="Network Settings" subtitle="Diagnostics and bug reports" onSelect={n} />
        <NavRow icon="bug" title="Debug & Reset Cache" subtitle="Send logs and clear cache" onSelect={n} />
        <NavRow icon="help" title="Help Center" accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]} onSelect={n} />
        <NavRow icon="share_feedback" title="Send Feedback" onSelect={n} />
      </Section>
      {admin && (
        <Section title="Administration">
          <NavRow
            icon="credit_card"
            title="Billing"
            subtitle={
              <>
                View or manage your <b className="pf-plan">{planName}</b>
              </>
            }
            accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]}
            onSelect={n}
          />
          <NavRow icon="gauge" title="Analytics" subtitle="View your Slack analytics dashboard" accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]} onSelect={n} />
        </Section>
      )}
      <Section title="About Slack" last>
        {/* copies the string and toasts "Copied" (copied 4671) with toast_checkmark (PreferencesInteractor.swift:468-473) */}
        <NavRow icon="info" title="Version" subtitle={VERSION} accessories={[]} onSelect={() => (copyText(VERSION), toast({ text: 'Copied', image: 'toast_checkmark' }))} />
        <NavRow icon="book" title="Libraries We Use" subtitle="Open source licenses" accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]} onSelect={n} />
        {!admin && <NavRow icon="gauge" title="Analytics" subtitle="View your Slack analytics dashboard" accessories={[{ icon: 'new_window', color: 'var(--dt_color_content_secondary)' }]} onSelect={n} />}
      </Section>
    </ModalPage>
  )
}

/** "Pacific Standard Time (US)": the zone's standard name and the device region. */
function timeZoneName(tz?: string): string {
  try {
    const jan = new Date(new Date().getFullYear(), 0, 1)
    const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'long' }).formatToParts(jan).find((p) => p.type === 'timeZoneName')?.value
    return `${name ?? 'Pacific Standard Time'} (US)`
  } catch {
    return 'Pacific Standard Time (US)'
  }
}
