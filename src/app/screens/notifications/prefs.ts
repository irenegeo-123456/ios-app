import { create } from 'zustand'
import { useApp } from '../../store'
import type { Conversation } from '../../../data/types'
import { DEFAULT_MOBILE_SOUND, NOTIFICATION_SOUNDS, type SoundPref } from '../../../lib/sounds'

// Your notification preferences, as Slack iOS models them (Modules/NetworkPersistence/NotificationPreferences, spec
// you-settings.md §3.7): the global prefs (GlobalNotificationPreferences.swift:24-54), the Do Not Disturb schedule
// (Modules/NetworkPersistence/Dnd/Interface/NotificationsDndSchedule+Parsing.swift) and each conversation's overrides
// (ConversationNotificationPreferences.swift:28-36). A conversation's level and mute are the store's own conv.notify /
// conv.muted (setNotify), so Home and the notification banners follow them; the rest lives here, for this session.

/** NoiseLevelPreference (NoiseLevelPreference.swift:8-14): everything / mentions_dms / nothing (legacy, shown as mentions). */
export type NoiseLevel = 'everything' | 'mentions_dms' | 'nothing'
/** push_idle_wait (NotificationDeliveryTiming.swift:41-94): -1 always, else minutes after you go inactive. */
export type PushIdleWait = -1 | 0 | 1 | 2 | 5 | 10 | 15 | 20 | 30
/** dnd_days (NotificationsDndSchedule+Parsing.swift:52-71) */
export type ScheduleDays = 'every_day' | 'weekdays' | 'custom'
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type Weekday = (typeof WEEKDAYS)[number]
/** A schedule window: notifications start (dnd_end_hour) and end (dnd_start_hour), "HH:mm"; `on` = dnd_enabled_<day> partial. */
export interface DayWindow {
  on: boolean
  start: string
  end: string
}
/** mobile_sound: NotificationSound.allCases (NotificationSound.swift:11-28) — none, deviceDefault, then the files */
export type MobileSound = SoundPref | 'deviceDefault'

/** Per-conversation sub-prefs (ConversationNotificationPreferences.swift:28-36); unset = follow the global value. */
export interface ConversationPrefs {
  mobile?: NoiseLevel
  followAllThreads?: boolean
  badgeAllUnreads?: boolean
  suppressAtChannel?: boolean
}

interface PrefsState {
  /** global_desktop, default mentions_dms */
  desktop: NoiseLevel
  /** global_mobile, default mentions_dms; nothing = the "Mobile notifications" switch is off */
  mobile: NoiseLevel
  /** threads_everything, default false */
  threadsEverything: boolean
  /** use_voip_huddle_invite: a missing pref is off */
  huddleInvites: boolean
  /** shouldSendInAppNotification-<workspace>, default true */
  inAppNotifications: boolean
  /** global_keywords: a comma-separated string, "" by default */
  keywords: string
  /** push_idle_wait, default 0 ("As soon as I’m inactive") */
  pushIdleWait: PushIdleWait
  /** mobile_sound; the iOS fixtures' b2.mp3 (Ding), which the notification banner plays */
  sound: MobileSound
  /** priority_mobile_sound (the VIP sound), default none */
  vipSound: MobileSound
  /** push_show_preview, default true */
  showPreview: boolean
  /** reminder_notification_time "HH:mm"; missing until you pick one (the picker opens at 9:00 AM) */
  reminderTime: string | null
  schedule: { days: ScheduleDays; start: string; end: string; perDay: Record<Weekday, DayWindow> }
  conversations: Record<string, ConversationPrefs>
  set: (patch: Partial<Omit<PrefsState, 'set' | 'setConversation' | 'resetConversation' | 'setSchedule' | 'setDay'>>) => void
  setSchedule: (patch: Partial<PrefsState['schedule']>) => void
  setDay: (day: Weekday, patch: Partial<DayWindow>) => void
  setConversation: (id: string, patch: ConversationPrefs) => void
  resetConversation: (id: string) => void
}

// The iOS fixture's team DND hours (InlineTestData.swift:222-223): DND 22:00 → 08:00, so notifications 8:00 AM–10:00 PM.
const START = '08:00'
const END = '22:00'
const day = (on = true): DayWindow => ({ on, start: START, end: END })

export const useNotificationPrefs = create<PrefsState>()((set) => ({
  desktop: 'mentions_dms',
  mobile: 'mentions_dms',
  threadsEverything: false,
  huddleInvites: false,
  inAppNotifications: true,
  keywords: '',
  pushIdleWait: 0,
  sound: DEFAULT_MOBILE_SOUND,
  vipSound: 'none',
  showPreview: true,
  reminderTime: null,
  schedule: { days: 'every_day', start: START, end: END, perDay: Object.fromEntries(WEEKDAYS.map((d) => [d, day()])) as Record<Weekday, DayWindow> },
  conversations: {},
  set: (patch) => set(patch),
  setSchedule: (patch) => set((s) => ({ schedule: { ...s.schedule, ...patch } })),
  setDay: (d, patch) => set((s) => ({ schedule: { ...s.schedule, perDay: { ...s.schedule.perDay, [d]: { ...s.schedule.perDay[d], ...patch } } } })),
  setConversation: (id, patch) => set((s) => ({ conversations: { ...s.conversations, [id]: { ...s.conversations[id], ...patch } } })),
  resetConversation: (id) =>
    set((s) => {
      const next = { ...s.conversations }
      delete next[id]
      return { conversations: next }
    }),
}))

/** The sound the banners should play: the Sound setting, or nothing for None / Device Default. */
export const notificationSound = (): SoundPref => {
  const s = useNotificationPrefs.getState().sound
  return s === 'deviceDefault' ? 'none' : s
}

// ------------------------------------------------------------------------------------------------- display

/** NotificationSoundsDataTypes.swift:37-56 (notification_sound_* 12525-12570), in NotificationSound.allCases order. */
export const SOUND_OPTIONS: { pref: MobileSound; label: string }[] = [
  { pref: 'none', label: 'None' },
  { pref: 'deviceDefault', label: 'Device Default' },
  ...NOTIFICATION_SOUNDS.map((s) => ({ pref: s.pref as MobileSound, label: s.label })),
]
export const soundLabel = (p: MobileSound) => SOUND_OPTIONS.find((o) => o.pref === p)?.label ?? 'None'

/** NotificationPrefsFormatter.swift:13-52: the "Notify me on mobile" value. */
export function timingLabel(w: PushIdleWait): string {
  if (w === -1) return 'Always'
  if (w === 0) return 'As soon as I’m inactive'
  return `After ${MINUTES[w]}`
}
/** NotificationTimingDataTypes.swift:45-73 (one_minute_start_case 12998 … thirty_minutes_start_case 19916) */
export const MINUTES: Record<Exclude<PushIdleWait, -1 | 0>, string> = { 1: '1 Minute', 2: '2 Minutes', 5: '5 Minutes', 10: '10 Minutes', 15: '15 Minutes', 20: '20 Minutes', 30: '30 Minutes' }

/** "HH:mm" → "8:00 AM" (TimeUtility.timeFormatter: h:mm a with a no-break space, TimeUtility.swift:199-202). */
export function formatHHmm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
export const toHHmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export const fromHHmm = (hhmm: string, base = new Date()) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0)
}

/** Mobile overrides exist: mobile isn't nothing and differs from desktop (NotificationPushOverrideService.swift:18-43). */
export const hasMobileOverrides = (desktop: NoiseLevel, mobile: NoiseLevel) => mobile !== 'nothing' && mobile !== level(desktop)
/** nothing displays as mentions (and is migrated) */
const level = (l: NoiseLevel): NoiseLevel => (l === 'nothing' ? 'mentions_dms' : l)

// ------------------------------------------------------------------------------------------ conversations

export const isChannelLike = (c: Conversation) => c.type === 'channel' || c.type === 'private'

/** The level a conversation follows when it has no override: global_desktop for channels, global_mpdm_desktop
 *  (everything) for group DMs and DMs (AllNotificationPreferences.swift:75-91, GlobalNotificationPreferences.swift:44-45). */
export function defaultLevel(c: Conversation, desktop: NoiseLevel): 'all' | 'mentions' {
  if (!isChannelLike(c)) return 'all'
  return level(desktop) === 'everything' ? 'all' : 'mentions'
}

/** The conversation's desktop level: its override (conv.notify) or the default. */
export const effectiveLevel = (c: Conversation, desktop: NoiseLevel) => c.notify ?? defaultLevel(c, desktop)

/** isCustomized(for:): muted, a level that differs from the default, or any sub-pref set (AllNotificationPreferences.swift:93-142). */
export function isCustomized(c: Conversation, desktop: NoiseLevel, prefs: ConversationPrefs | undefined): boolean {
  if (c.muted) return true
  if (c.notify && c.notify !== defaultLevel(c, desktop)) return true
  return !!prefs && Object.values(prefs).some((v) => v !== undefined)
}

/** The conversation's mobile level: its override, else nothing when global mobile is off, else its desktop level. */
export function effectiveMobile(c: Conversation, globalDesktop: NoiseLevel, globalMobile: NoiseLevel, prefs: ConversationPrefs | undefined): NoiseLevel {
  if (prefs?.mobile) return prefs.mobile
  if (globalMobile === 'nothing') return 'nothing'
  return effectiveLevel(c, globalDesktop) === 'all' ? 'everything' : 'mentions_dms'
}

/**
 * AllNotificationPreferences.notificationsSummary (:42-73): "Muted", or the level with the push state — "All new posts,
 * mobile push notifications on" (1540) / "…customized" (1534) / "…off" (1537), "Just mentions, mobile push
 * notifications on" (9778) / "…customized" (9771) / "…off" (9775).
 */
export function notificationSummary(c: Conversation): string {
  const s = useNotificationPrefs.getState()
  if (c.muted) return 'Muted'
  const all = effectiveLevel(c, s.desktop) === 'all'
  const mobile = effectiveMobile(c, s.desktop, s.mobile, s.conversations[c.id])
  const push = mobile === 'nothing' ? 'off' : mobile !== (all ? 'everything' : 'mentions_dms') ? 'customized' : 'on'
  return `${all ? 'All new posts' : 'Just mentions'}, mobile push notifications ${push}`
}

/** Sets a conversation's level in the app store (conv.notify / conv.muted), which Home and the banners read. */
export function setConversationLevel(id: string, level: 'all' | 'mentions' | 'muted') {
  useApp.getState().setNotify(id, level)
}

/** "Reset" (the conversation screen's bar button, the exception list's long-press): back to the defaults. */
export function resetConversation(c: Conversation) {
  const s = useNotificationPrefs.getState()
  useApp.getState().setNotify(c.id, defaultLevel(c, s.desktop))
  s.resetConversation(c.id)
}
