import { useClient } from '../store/store'
import { asset } from './asset'

// Slack's sounds, ported from js/modern/utility/sound/{files,notifications,playback}.ts and checked against the
// production bundle (2026-09-24). The mp3s are vendored from the live client into public/slack/sounds/ under
// their production (content-hashed) names. A DM or mention that lands in a conversation you're not looking at
// plays the default notification sound, Knock Brush.

/**
 * Production file names, keyed by Slack's sound name. `null` means production has the sound but it isn't
 * vendored: the webapp snapshots only hold Git LFS pointers for it, and it hasn't been captured from the
 * live client yet. Playing one of those is a silent no-op (never a 404).
 */
const FILES = {
  // Notifications (sounds/push/)
  b2: 'b2-5fd58e3',
  animal_stick: 'animal_stick-caaec1f',
  been_tree: 'been_tree-6428cfb',
  complete_quest_requirement: 'complete_quest_requirement-74d22f6',
  confirm_delivery: 'confirm_delivery-7da5529',
  flitterbug: 'flitterbug-a658890',
  here_you_go_lighter: 'here_you_go_lighter-313ec4e',
  hi_flowers_hit: 'hi_flowers_hit-8fa995c',
  knock_brush: 'knock_brush-ac2b6e8',
  save_and_checkout: 'save_and_checkout-3792bb8',
  item_pickup: 'item_pickup-b0e3113',
  hummus: 'hummus-2e2613c',
  boop: 'boop-0ccd0e9',
  // Calls and huddles (sounds/call/)
  you_joined_call: 'you_joined_call_v2-7029418',
  you_left_call: 'you_left_call_v2-1bc1290',
  they_joined_call: 'they_joined_call_v2-570b169',
  they_left_call: 'they_left_call_v2-95d3260',
  outgoing_ring: 'outgoing_ring_v2-6b3697e',
  pop: 'pop_v2-86c5be3',
  /** huddle invite ("Boop Plus"): boop_remix-fbf4aad.mp3 in production */
  boop_remix: null,
  incoming_ring: null,
  confirmation: null,
  alert: null,
  /** reaction received in a huddle */
  bop: null,
  bop_soft: null,
  gong: null,
  ducks: null,
  // Accessibility (sounds/a11y/): mic mute / unmute
  channel_message: 'channel_message-a6a20ac',
  channel_message_2x: null,
} as const satisfies Record<string, string | null>

export type SoundName = keyof typeof FILES

/** Sounds production plays that aren't vendored yet (their mp3s are Git LFS pointers in every webapp snapshot). */
export const MISSING_SOUNDS = (Object.keys(FILES) as SoundName[]).filter((n) => FILES[n] === null)

/**
 * The message notification sounds, in the order Slack lists them (`getNotificationPrefsToSounds`): the pref value
 * (`new_msg_snd`), its label, and the sound it plays.
 */
export const NOTIFICATION_SOUNDS: { pref: string; label: string; sound: SoundName }[] = [
  { pref: 'b2.mp3', label: 'Ding', sound: 'b2' },
  { pref: 'animal_stick.mp3', label: 'Boing', sound: 'animal_stick' },
  { pref: 'been_tree.mp3', label: 'Drop', sound: 'been_tree' },
  { pref: 'complete_quest_requirement.mp3', label: 'Ta-da', sound: 'complete_quest_requirement' },
  { pref: 'confirm_delivery.mp3', label: 'Plink', sound: 'confirm_delivery' },
  { pref: 'flitterbug.mp3', label: 'Wow', sound: 'flitterbug' },
  { pref: 'here_you_go_lighter.mp3', label: 'Here you go', sound: 'here_you_go_lighter' },
  { pref: 'hi_flowers_hit.mp3', label: 'Hi', sound: 'hi_flowers_hit' },
  { pref: 'knock_brush.mp3', label: 'Knock Brush', sound: 'knock_brush' },
  { pref: 'save_and_checkout.mp3', label: 'Whoa!', sound: 'save_and_checkout' },
  { pref: 'item_pickup.mp3', label: 'Yoink', sound: 'item_pickup' },
  { pref: 'hummus.mp3', label: 'Hummus', sound: 'hummus' },
  { pref: 'boop.mp3', label: 'Boop', sound: 'boop' },
]

/** Huddle-only notification sounds (`getHuddleNotificationPrefsToSounds`): never offered for messages. */
export const HUDDLE_NOTIFICATION_SOUNDS: { pref: string; label: string; sound: SoundName }[] = [{ pref: 'boop_remix.mp3', label: 'Boop Plus', sound: 'boop_remix' }]

/** Slack's `DEFAULT_NOTIFICATION_PREF`. */
export const DEFAULT_NOTIFICATION_PREF = 'knock_brush.mp3'

/** Slack's playback volume when the caller doesn't pass one (`element.volume = options.volume ?? 1`). */
export const DEFAULT_VOLUME = 1

/** The sound a notification pref value (`knock_brush.mp3`, `boop_remix.mp3`, `none`) plays, if any. */
export function soundForPref(pref: string | undefined | null): SoundName | undefined {
  if (!pref || pref === 'none') return undefined
  return [...NOTIFICATION_SOUNDS, ...HUDDLE_NOTIFICATION_SOUNDS].find((s) => s.pref === pref)?.sound
}

/** URL of a vendored sound, or undefined when production's file isn't vendored. */
export const soundUrl = (name: SoundName): string | undefined => {
  const file = FILES[name]
  return file ? `/slack/sounds/${file}.mp3` : undefined
}

const cache = new Map<string, HTMLAudioElement>()
let muted = (() => {
  try {
    return localStorage.getItem('slack-clone:muted') === '1'
  } catch {
    return false
  }
})()

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem('slack-clone:muted', m ? '1' : '0')
  } catch {
    /* private mode */
  }
}

/** Plays a sound like Slack's `play()`: from the start, not looped, at `volume` (default 1). */
export function playSound(name: SoundName, volume: number = DEFAULT_VOLUME) {
  if (muted) return
  const url = soundUrl(name)
  if (!url || typeof Audio === 'undefined') return
  let audio = cache.get(url)
  if (!audio) {
    audio = new Audio(asset(url))
    cache.set(url, audio)
  }
  audio.loop = false
  audio.volume = volume
  audio.currentTime = 0
  // Browsers block audio until the page has had a click; that's fine for a demo.
  audio.play().catch(() => undefined)
}

/** Plays the sound for a notification pref value; `none` (or an unknown value) plays nothing. */
export function playNotificationSound(pref: string = DEFAULT_NOTIFICATION_PREF) {
  const sound = soundForPref(pref)
  if (sound) playSound(sound)
}

/** Knock when a conversation you're not viewing gets a new mention or DM. */
export function installNotificationSounds() {
  useClient.subscribe((s, prev) => {
    if (s.fx.unreads === prev.fx.unreads) return
    for (const [id, u] of Object.entries(s.fx.unreads)) {
      const before = prev.fx.unreads[id]?.mentions ?? 0
      if (u.mentions > before && !(s.tab === 'home' && s.conversationId === id)) {
        playNotificationSound(DEFAULT_NOTIFICATION_PREF)
        return
      }
    }
  })
}
