import { create } from 'zustand'

// Feature flags that change how the shell and the tab roots look, with production's values as the defaults: what a
// real iPhone showed in September 2026 (reference/device/IMG_2246…2250, iOS 26, measured; specs: "Production (device
// screenshots, Sept 2026)"). A flag is kept only where Slack's current source (slack-objc main @ 14b3cbaf, 2026-09-30)
// still decides it at runtime: a server toggle in `Modules/Data/Toggles/Definitions/*.json` (all `"defaultValue": false`,
// rolled out server-side) or an entitlement. June's `ios_ia_next_home_tab_v3`, `ios_ia_next_dms_filters`,
// `ios_activity_views` and `ios_activity_row_redesign` are gone in 14b3cbaf, their code the only path, so the clone
// draws those unconditionally (home.md §5, dms-activity.md §2.4, §3.3, §3.5).
//
//   ?flags=-agentsInDms,+refreshedOnboardingV2      turn flags off (or `+name` / `name` on) for one visit
//   definePrototype({ flags: { agentsAndAppsBadging: false } })      a prototype's own values (the URL still wins)
//   useFlag('agentsInDms')                                          read one in a component (re-renders on change)
//   useFlags.getState().set({ slackbotConversationHeaderEntry: false })   change them at runtime (console, scenes)

export interface FlagDef {
  /** production's value (what the device screenshots show) */
  value: boolean
  /** where the source defines or decides it */
  source: string
  /** what it changes in the clone */
  effect: string
}

export const FLAGS = {
  refreshedOnboardingV2: {
    value: true,
    source:
      'Sept: Modules/Data/Toggles/Definitions/ios_refreshed_onboarding_v2.json (refreshedOnboardingV2, iPhoneOnly, default false); ConversationListPipelineFactory.swift:216, :306 (+ invite permission, not a frontline worker)',
    effect: 'Home: the header-less "+ Add Teammates" row after the last section (AddTeammatesPipe.swift:13-31) (off: no row)',
  },
  agentsAndAppsBadging: {
    value: true,
    source: 'Sept: Modules/Data/Toggles/Definitions/ios_agents_and_apps_badging.json (agentsAndAppsBadging, default false); GroupingPipeSection.swift:252-253, SectionItemActionDataTypes.swift:25-32',
    effect:
      'Home: the apps section\'s icon is ai_agents (three rings and a sparkle, as on the device, IMG_2246) and its title "Agents & Apps" unless agentsInDms (off: the apps grid icon, "Apps")',
  },
  agentsInDms: {
    value: true,
    source: 'Sept: Modules/Data/Toggles/Definitions/ios_agents_in_dms.json (agentsInDms, default false); SectionItemActionDataTypes.swift:25-32, SectionsReadsFinalGroupingPipe.swift:261-262',
    effect:
      'Home: the apps section keeps the title "Apps" with badging on (production: "Apps" + the ai_agents icon), and agents\' DMs move to Direct Messages: Slackbot\'s right after your self-DM, as on the device (IMG_2246; SectionsReadsFinalGroupingPipe.swift:254-274) (off: "Agents & Apps", no Slackbot row)',
  },
  composerContextBar: {
    value: true,
    source:
      'June: Modules/Data/Toggles/Definitions/ios_composer_context_bar.json (composerContextBar, default false; ComposerView.swift:84-86, ComposerViewController.swift:110, :282); removed in 14b3cbaf (ComposerGlassGeometry.swift, ComposerViewController.swift:455), its layout the only one. Kept while src/app/composer still reads it (composer.md owns the switch)',
    effect:
      'The iOS 26 composer: a 44 pt capsule (radius 22, controls 4 pt from its edge, 8 pt above the tab bar), the context bar (typing, also-send) standing apart above it (off: the 60 pt card, 8 pt insets, radius 26, 12 pt above the tab bar, banners inside the card)',
  },
  slackbotConversationHeaderEntry: {
    value: true,
    source:
      'Sept: shown when Slackbot AI is enabled and the conversation isn\'t the Slackbot DM (NewConversationHeaderHelperService.swift:1093-1108 → ConversationHeaderPresentationObject.swift:763, HeaderBarButtonPresentable.swift:281-283); not a toggle: an entitlement',
    effect: 'Conversation and thread bars: the full-color Slackbot button left of the headphones, one glass capsule (off: the headphones alone)',
  },
} satisfies Record<string, FlagDef>

export type FlagName = keyof typeof FLAGS
export type Flags = Record<FlagName, boolean>
export const FLAG_NAMES = Object.keys(FLAGS) as FlagName[]

export const isFlagName = (name: string): name is FlagName => name in FLAGS

const DEFAULTS = Object.fromEntries(FLAG_NAMES.map((n) => [n, FLAGS[n].value])) as Flags

/** `?flags=-a,+b,c`: `-name` off, `+name` or `name` on; unknown names are reported in the console and ignored. */
export function parseFlags(param: string | null | undefined): Partial<Flags> {
  const out: Partial<Flags> = {}
  for (const raw of (param ?? '').split(',')) {
    const t = raw.trim()
    if (!t) continue
    const on = !t.startsWith('-')
    const name = t.replace(/^[+-]/, '')
    if (isFlagName(name)) out[name] = on
    else console.warn(`[flags] unknown flag '${name}' (known: ${FLAG_NAMES.join(', ')})`)
  }
  return out
}

const fromUrl = () => (typeof location === 'undefined' ? {} : parseFlags(new URLSearchParams(location.search).get('flags')))

interface FlagState extends Flags {
  set: (patch: Partial<Flags>) => void
  /** back to production's values (and the URL's) */
  reset: () => void
}

export const useFlags = create<FlagState>((set) => ({
  ...DEFAULTS,
  ...fromUrl(),
  set: (patch) => set(patch),
  reset: () => set({ ...DEFAULTS, ...fromUrl() }),
}))

/** A prototype's flags: applied under the URL's, which always win for one visit (src/kit/boot.ts). */
export function applyPrototypeFlags(flags: Partial<Record<string, boolean>> | undefined) {
  if (!flags) return
  const url = fromUrl()
  const patch: Partial<Flags> = {}
  for (const [name, on] of Object.entries(flags)) if (isFlagName(name) && !(name in url) && typeof on === 'boolean') patch[name] = on
  useFlags.getState().set(patch)
}

export const useFlag = (name: FlagName) => useFlags((s) => s[name])
export const flag = (name: FlagName) => useFlags.getState()[name]
