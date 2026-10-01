import { asset } from './asset'

// Slack for iOS's notification sounds (harvested from the app bundle into public/sounds/ by `npm run harvest`). The
// names are the `mobile_sound` pref values (Modules/NetworkPersistence/NotificationPreferences/Interface/Data/
// NotificationSound.swift); the labels are the strings the Sounds setting shows.

export const NOTIFICATION_SOUNDS = [
  { pref: 'b2.mp3', label: 'Ding' },
  { pref: 'animal_stick.mp3', label: 'Boing' },
  { pref: 'been_tree.mp3', label: 'Drop' },
  { pref: 'complete_quest_requirement.mp3', label: 'Ta-da' },
  { pref: 'confirm_delivery.mp3', label: 'Plink' },
  { pref: 'flitterbug.mp3', label: 'Wow' },
  { pref: 'here_you_go_lighter.mp3', label: 'Here you go' },
  { pref: 'hi_flowers_hit.mp3', label: 'Hi' },
  { pref: 'knock_brush.mp3', label: 'Knock Brush' },
  { pref: 'save_and_checkout.mp3', label: 'Whoa!' },
  { pref: 'item_pickup.mp3', label: 'Yoink' },
  { pref: 'hummus.mp3', label: 'Hummus' },
  { pref: 'boop.mp3', label: 'Boop' },
  { pref: 'boop_remix.mp3', label: 'Boop Plus' },
] as const

export type SoundPref = (typeof NOTIFICATION_SOUNDS)[number]['pref'] | 'none'

/** `mobile_sound` in the iOS preference fixtures (Modules/NetworkPersistence/NotificationPreferences/Tests). */
export const DEFAULT_MOBILE_SOUND: SoundPref = 'b2.mp3'

const cache = new Map<string, HTMLAudioElement>()

/** Plays a sound from the start. Browsers block audio until the page has had a click; that's fine for a demo. */
export function playSound(pref: SoundPref = DEFAULT_MOBILE_SOUND) {
  if (pref === 'none' || typeof Audio === 'undefined') return
  let audio = cache.get(pref)
  if (!audio) {
    audio = new Audio(asset(`/sounds/${pref}`))
    cache.set(pref, audio)
  }
  audio.currentTime = 0
  audio.play().catch(() => undefined)
}
