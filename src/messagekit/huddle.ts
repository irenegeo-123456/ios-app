import type { Conversation, Fixture, Message } from '../data/types'
import { displayName, plural, tsDate } from './format'

// A huddle's card in the conversation (`huddle_thread` messages; spec messages.md §9.8, search-slackbot-huddles.md §3.10),
// ported from CustomPaths/HuddleMessageTransformationPath.swift:108-244 and Utilities/MessageFormattingHuddleUtility.swift.

export interface HuddleCard {
  live: boolean
  /** "A huddle happened" / "A huddle is happening" / "You joined the huddle" / "You missed a huddle" */
  title: string
  badge?: 'LIVE' | 'MISSED'
  body: string
  /** the headphones ornament's colors: live white on base_inverse_highlight_2; ended content_secondary on
   *  surface_primary; missed content_important on base_important (MessageFormattingHuddleUtility.swift:179-200 [Sept]) */
  icon: string
  background: string
  /** "Join huddle" while it's live and you're not in it (HuddleMessageTransformationPath.swift generateEmbeddables) */
  canJoin: boolean
}

/** "18 minutes", "1 hour", "1 hour and 5 minutes" (durationString; `huddle_thread_hours_and_minutes` "%@ and %@", yaml:8639). */
function duration(startTs: string, endTs?: string): string {
  const start = tsDate(startTs).getTime()
  const end = endTs ? tsDate(endTs).getTime() : Date.now()
  const total = Math.max(0, Math.floor((end - start) / 60000))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  const h = plural(hours, '1 hour', '%@ hours') // `one_hour` / `other_hours`, yaml:13726 / 14328
  const m = plural(minutes, '1 minute', '%@ minutes') // `one_minute` / `others_minutes_lowercased`, yaml:13765 / 14445
  if (hours > 0 && minutes > 0) return `${h} and ${m}`
  return hours > 0 ? h : m
}

export function huddleCard(fx: Fixture, conv: Conversation | undefined, m: Message): HuddleCard | null {
  const room = m.room
  if (m.subtype !== 'huddle_thread' || !room) return null
  const me = fx.me
  const live = !room.end
  const joined = room.participantIds.includes(me)
  const isDM = conv?.type === 'im'
  const missed = !live && !joined && isDM
  const names = room.participantIds.filter((id) => id !== me).map((id) => displayName(fx.users[id]))
  const n = names.length

  let title: string
  if (!live) title = missed ? 'You missed a huddle' : 'A huddle happened' // yaml:8726 / 8625
  else title = joined ? 'You joined the huddle' : 'A huddle is happening' // yaml:8643 / 8632

  let body = ''
  if (!live) {
    const d = duration(room.start, room.end)
    if (joined) {
      if (n === 0) body = `You were in the huddle by yourself for ${d}. A nice, meditative session.` // yaml:8721
      else if (n === 1) body = `You and ${names[0]} were in the huddle for ${d}.` // yaml:8711
      else if (n === 2) body = `You, ${names[0]} and ${names[1]} were in the huddle for ${d}.` // yaml:8716
      else body = `You, ${names[0]} and ${n - 1} others were in the huddle for ${d}.` // yaml:8706
    } else if (missed && names[0]) body = `${names[0]} tried to huddle you.` // `someone_tried_to_huddle_you`
    else if (n === 1) body = `${names[0]} was in the huddle for ${d}.` // yaml:8664
    else if (n === 2) body = `${names[0]} and ${names[1]} were in the huddle for ${d}.` // yaml:8701
    else if (n > 2) body = `${names[0]} and ${n - 1} others were in the huddle for ${d}.` // yaml:8659
  } else if (joined) {
    if (n === 0) body = isDM && conv?.userId ? `${displayName(fx.users[conv.userId])} received a notification to join.` : 'You’re the only one here.'
    else if (n === 1) body = `${names[0]} is here too.`
    else if (n === 2) body = `${names[0]} and ${names[1]} are here too.`
    else body = `${names[0]} and ${n - 1} others are here too.`
  } else if (n === 1) body = `${names[0]} is already there.`
  else if (n === 2) body = `${names[0]} and ${names[1]} are already there.`
  else if (n > 2) body = `${names[0]} and ${n - 1} others are already there.`

  return {
    live,
    title,
    badge: live ? 'LIVE' : missed ? 'MISSED' : undefined,
    body,
    // the headphones ornament: live white on highlight2.baseInverse, missed important content on important base, ended
    // content_secondary on surface_primary (MessageFormattingHuddleUtility.swift:179-200 [Sept]; June sk_foreground_max on
    // sk_foreground_low)
    icon: live ? 'var(--dt_color_constants_white)' : missed ? 'var(--dt_color_content_important)' : 'var(--dt_color_content_secondary)',
    background: live ? 'var(--dt_color_base_inverse_highlight_2)' : missed ? 'var(--dt_color_base_important)' : 'var(--dt_color_surface_primary)',
    canJoin: live && !joined && !!body,
  }
}
