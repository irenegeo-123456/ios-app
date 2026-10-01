import { nowTs, useApp } from '../store'
import type { HuddleRecord, Message } from '../../data/types'
import { liveRoomIn, myRoom, useHuddle, type FeedPill, type LiveRoom, type Peer } from './state'
import { liveNotes } from './notes'

// Huddle lifecycle (spec search-slackbot-huddles.md §3), ported from the web clone (slack-remix
// src/components/huddles/actions.ts). Starting a huddle posts Slack's `huddle_thread` card in the conversation; people
// from the conversation join a few seconds later; a speaking indicator hops between whoever's unmuted; when the last
// person leaves the card turns into "A huddle happened", the huddle joins Home › Huddles (fx.huddles) and the AI notes
// land in its thread. The public bundle has no huddle sounds (public/sounds holds notification sounds only), so the
// huddle is silent.

const app = () => useApp.getState()
const me = () => app().fx.me

let roomSeq = 0
const newRoomId = () => `R0${Date.now().toString(36).toUpperCase()}${++roomSeq}`

// ---- timers (joins, leaves, notes) belong to a room, so ending it cancels them ----

const timers = new Map<string, number[]>()
function later(roomId: string, ms: number, fn: () => void) {
  const id = window.setTimeout(fn, ms)
  timers.set(roomId, [...(timers.get(roomId) ?? []), id])
}
function clearTimers(roomId: string) {
  for (const id of timers.get(roomId) ?? []) window.clearTimeout(id)
  timers.delete(roomId)
}

function updateRoom(roomId: string, fn: (r: LiveRoom) => LiveRoom) {
  useHuddle.setState((st) => {
    const r = st.rooms[roomId]
    return r ? { rooms: { ...st.rooms, [roomId]: fn(r) } } : {}
  })
}

function withPeer(r: LiveRoom, peer: Peer): LiveRoom {
  const peers = [...r.peers.filter((p) => p.userId !== peer.userId), peer]
  return {
    ...r,
    peers,
    everIds: r.everIds.includes(peer.userId) ? r.everIds : [...r.everIds, peer.userId],
    // AI notes start once there's someone to talk to, as if the channel auto-starts them (web clone behavior).
    notes: r.notes || (peers.length >= 2 && !r.notesStopped),
  }
}

function patchCard(conversationId: string, ts: string, fn: (m: Message) => Message) {
  useApp.setState((s) => ({ messages: { ...s.messages, [conversationId]: (s.messages[conversationId] ?? []).map((m) => (m.ts === ts && m.subtype === 'huddle_thread' ? fn(m) : m)) } }))
}

/** A live card lists who's there now (MessageFormattingHuddleUtility threadText: room.participants while live). */
function syncCard(roomId: string) {
  const r = useHuddle.getState().rooms[roomId]
  if (!r || r.threadTs) return
  patchCard(r.conversationId, r.msgTs, (m) => ({ ...m, room: { ...(m.room ?? { id: r.id, start: r.msgTs }), id: r.id, participantIds: r.peers.map((p) => p.userId), start: m.room?.start ?? r.msgTs, notes: r.notes } }))
}

/**
 * People who'd plausibly hop on: the DM partner(s), or the channel's members (its recent posters when the workspace
 * doesn't list members), active ones first. Works for any workspace a prototype sets up.
 */
export function joinCandidates(conversationId: string, exclude: string[] = []): string[] {
  const { fx, messages } = app()
  const conv = fx.conversations[conversationId]
  if (!conv) return []
  let pool: (string | undefined)[] = conv.type === 'im' ? [conv.userId] : conv.type === 'mpim' ? (conv.userIds ?? []) : (conv.memberIds ?? [])
  if (!pool.length) pool = [...new Set((messages[conversationId] ?? []).map((m) => m.userId).reverse())]
  const ok = (id: string | undefined): id is string => {
    const u = id ? fx.users[id] : undefined
    return !!u && u.id !== fx.me && !exclude.includes(u.id) && !u.isApp && !u.isBot
  }
  const people = pool.filter(ok)
  const active = people.filter((id) => fx.users[id].presence === 'active')
  return active.length ? active : people
}

// ---- starting, joining and leaving ----

/** Posts the huddle's channel card; returns its ts. */
function postCard(conversationId: string, roomId: string, starterId: string): string {
  const ts = nowTs()
  const msg: Message = { ts, userId: starterId, text: 'A huddle started', subtype: 'huddle_thread', room: { id: roomId, participantIds: [starterId], start: ts } }
  if (starterId === me()) useApp.setState((s) => ({ messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), msg] } }))
  else app().receiveMessage(conversationId, msg)
  return ts
}

function createRoom(conversationId: string, starterId: string, threadTs?: string): LiveRoom | null {
  if (!app().fx.conversations[conversationId]) return null
  const id = newRoomId()
  // A thread huddle is tied to that thread (§3.1): no new card, the thread is the huddle thread.
  const msgTs = threadTs ?? postCard(conversationId, id, starterId)
  const room: LiveRoom = {
    id,
    conversationId,
    threadTs,
    msgTs,
    startedAt: Date.now(),
    peers: [{ userId: starterId, mic: true, camera: false, joinedAt: Date.now() }],
    everIds: [starterId],
    speakerId: null,
    lastSpeakerId: null,
    notes: false,
    reactions: {},
    stickers: {},
  }
  useHuddle.setState((st) => ({ rooms: { ...st.rooms, [id]: room } }))
  return room
}

/** Start a huddle in a conversation (or a thread), or join the one that's already running there. */
export function startHuddle(conversationId: string, opts: { threadTs?: string; autoJoin?: boolean } = {}) {
  const st = useHuddle.getState()
  const existing = liveRoomIn(conversationId, opts.threadTs)
  if (existing) {
    if (st.mine?.roomId !== existing.id) joinHuddle(existing.id)
    return
  }
  if (st.mine) leaveHuddle()
  const room = createRoom(conversationId, me(), opts.threadTs)
  if (!room) return
  useHuddle.setState({ mine: { roomId: room.id, screen: false, captions: false, selfViewHidden: false }, feed: [] })
  if (opts.autoJoin !== false) {
    const conv = app().fx.conversations[conversationId]
    // DMs ring the other person; in a channel a couple of people drop in (the web clone's pacing).
    const count = conv?.type === 'im' ? 1 : conv?.type === 'mpim' ? 3 : 2
    joinCandidates(conversationId)
      .slice(0, count)
      .forEach((uid, i) => later(room.id, 3000 + i * 2600, () => peerJoin(room.id, uid)))
  }
  ensureTalkLoop()
}

export function joinHuddle(roomId: string) {
  const st = useHuddle.getState()
  if (!st.rooms[roomId] || st.mine?.roomId === roomId) return
  if (st.mine) leaveHuddle()
  updateRoom(roomId, (r) => withPeer(r, { userId: me(), mic: true, camera: false, joinedAt: Date.now() }))
  useHuddle.setState({ mine: { roomId, screen: false, captions: false, selfViewHidden: false }, feed: [] })
  syncCard(roomId)
  ensureTalkLoop()
}

/** You leave. Whoever's left wraps up a few seconds later, so the story ends with the AI notes. */
export function leaveHuddle() {
  const st = useHuddle.getState()
  if (!st.mine) return
  const roomId = st.mine.roomId
  useHuddle.setState({ mine: null, feed: [], effect: null })
  closeCallSheet()
  removePeer(roomId, me())
  const room = useHuddle.getState().rooms[roomId]
  room?.peers.forEach((p, i) => later(roomId, 2200 + i * 1700, () => peerLeave(roomId, p.userId)))
}

export function peerJoin(roomId: string, userId: string) {
  const room = useHuddle.getState().rooms[roomId]
  if (!room || room.peers.some((p) => p.userId === userId)) return
  updateRoom(roomId, (r) => withPeer(r, { userId, mic: Math.random() > 0.2, camera: false, joinedAt: Date.now() }))
  syncCard(roomId)
  if (useHuddle.getState().mine?.roomId === roomId) pushNotice(`${firstName(userId)} joined`)
  ensureTalkLoop()
}

export function peerLeave(roomId: string, userId: string) {
  const room = useHuddle.getState().rooms[roomId]
  if (!room || !room.peers.some((p) => p.userId === userId)) return
  removePeer(roomId, userId)
  if (useHuddle.getState().mine?.roomId === roomId) pushNotice(`${firstName(userId)} left`)
}

function removePeer(roomId: string, userId: string) {
  const room = useHuddle.getState().rooms[roomId]
  if (!room) return
  const peers = room.peers.filter((p) => p.userId !== userId)
  if (!peers.length) return endRoom(roomId)
  updateRoom(roomId, (r) => {
    const stickers = { ...r.stickers }
    delete stickers[userId]
    return { ...r, peers, stickers, speakerId: r.speakerId === userId ? null : r.speakerId, lastSpeakerId: r.lastSpeakerId === userId ? null : r.lastSpeakerId }
  })
  syncCard(roomId)
}

/** Everyone's gone: the card becomes "A huddle happened", the huddle joins Home › Huddles, notes follow. */
function endRoom(roomId: string) {
  const room = useHuddle.getState().rooms[roomId]
  if (!room) return
  clearTimers(roomId)
  useHuddle.setState((st) => {
    const rooms = { ...st.rooms }
    delete rooms[roomId]
    return { rooms, mine: st.mine?.roomId === roomId ? null : st.mine }
  })
  const endTs = nowTs()
  const elapsed = Math.round((Date.now() - room.startedAt) / 1000)
  // At least a minute, so the card reads "… for 1 minute" rather than "0 minutes".
  const seconds = room.minutes ? room.minutes * 60 : Math.max(60, elapsed)
  const minutes = Math.max(1, Math.round(seconds / 60))
  const start = `${Math.floor(parseFloat(endTs)) - seconds}.000000`
  const notes = room.notes && room.everIds.length >= 2
  if (!room.threadTs) patchCard(room.conversationId, room.msgTs, (m) => ({ ...m, text: 'A huddle happened', room: { id: room.id, participantIds: room.everIds, start, end: endTs, notes } }))
  const key = `${room.conversationId}/${room.msgTs}`
  const record: HuddleRecord = {
    id: room.id,
    conversationId: room.conversationId,
    start: room.threadTs ? start : room.msgTs,
    minutes,
    participantIds: room.everIds,
    replies: (app().threads[key]?.length ?? 0) + (notes ? 1 : 0) || undefined,
    notes: notes || undefined,
  }
  useApp.setState((s) => ({ fx: { ...s.fx, huddles: [record, ...(s.fx.huddles ?? []).filter((h) => h.id !== room.id)] } }))
  if (notes)
    window.setTimeout(() => {
      const { fx } = app()
      const msg: Message = {
        ts: nowTs(),
        userId: room.everIds[0],
        text: liveNotes(fx, room.conversationId, room.everIds),
        subtype: 'huddle_notes',
        room: { id: room.id, participantIds: room.everIds, start, end: endTs, notes: true },
      }
      app().receiveMessage(room.conversationId, msg, room.msgTs)
    }, 4500)
}

// ---- the call sheet ----

/** Shows the huddle sheet (§3.3) for the huddle you're in, dismissing whatever's presented first (§3.2). */
export function openCallSheet() {
  const s = app()
  if (!useHuddle.getState().mine) return
  if (s.sheets.some((x) => x.type === 'huddle-call')) return
  s.dismissAllSheets()
  s.presentSheet('huddle-call')
}

/** Minimizes the huddle sheet to the in-app PiP (§3.9). */
export function closeCallSheet() {
  const s = app()
  const entry = s.sheets.find((x) => x.type === 'huddle-call')
  if (entry) s.dismissSheet(entry.key)
}

// ---- your controls (visual only: nothing here touches a real microphone or camera) ----

function updateMe(fn: (p: Peer) => Peer) {
  const room = myRoom()
  if (!room) return
  const uid = me()
  updateRoom(room.id, (r) => ({ ...r, peers: r.peers.map((p) => (p.userId === uid ? fn(p) : p)) }))
}

export const toggleMic = () => updateMe((p) => ({ ...p, mic: !p.mic }))
export const toggleCamera = () => updateMe((p) => ({ ...p, camera: !p.camera }))

export function toggleScreen() {
  useHuddle.setState((st) => (st.mine ? { mine: { ...st.mine, screen: !st.mine.screen } } : {}))
}
export function toggleCaptions() {
  useHuddle.setState((st) => (st.mine ? { mine: { ...st.mine, captions: !st.mine.captions } } : {}))
}
export function toggleSelfView() {
  useHuddle.setState((st) => (st.mine ? { mine: { ...st.mine, selfViewHidden: !st.mine.selfViewHidden } } : {}))
}

export function toggleNotes() {
  const room = myRoom()
  if (!room) return
  updateRoom(room.id, (r) => ({ ...r, notes: !r.notes, notesStopped: r.notes }))
  syncCard(room.id)
}

// ---- reactions, effects, stickers ----

let reactionKey = 0
/** HuddleNotificationFeedStack: a pill hangs 3 s, then fades over 0.5 s (HuddleNotificationFeedStack.swift:209-213). */
const HANG = 3000
const FADE = 500
const feedTimers = new Map<string, number>()

/** Hangs a pill for 3 s, then fades it out and drops it. */
function hang(id: string, key: number) {
  window.clearTimeout(feedTimers.get(id))
  feedTimers.set(
    id,
    window.setTimeout(() => {
      useHuddle.setState((st) => ({ feed: st.feed.map((p) => (p.key === key ? { ...p, leaving: true } : p)) }))
      window.setTimeout(() => useHuddle.setState((st) => ({ feed: st.feed.filter((p) => p.key !== key) })), FADE)
    }, HANG),
  )
}

function pushFeed(userId: string, emoji: string) {
  const key = ++reactionKey
  useHuddle.setState((st) => {
    const existing = st.feed.find((p) => p.userId === userId && !p.text && !p.leaving)
    // The same person reacting again while their pill hangs combines into it ("👍❤️ Jane +1"), and it moves to the
    // bottom (HuddleNotificationFeedStack.swift:55-97; HuddleNotificationFeedView.swift combinedWith).
    const pill: FeedPill = existing
      ? { ...existing, key, emojis: existing.emojis.includes(emoji) ? existing.emojis : [...existing.emojis, emoji], plus: existing.plus + 1 }
      : { key, userId, emojis: [emoji], plus: 0 }
    return { feed: [...st.feed.filter((p) => p !== existing), pill].slice(-6) }
  })
  hang(`u:${userId}`, key)
}

/** "Priya joined" / "Priya left" (`user_joined` / `user_left`, yaml:21449 / 21455; HuddleNotificationFeedInteractor.swift:107-109). */
function pushNotice(text: string) {
  const key = ++reactionKey
  useHuddle.setState((st) => ({ feed: [...st.feed, { key, emojis: [], plus: 0, text }].slice(-6) }))
  hang(`n:${key}`, key)
}

const firstName = (userId: string) => app().fx.users[userId]?.name ?? 'Someone'

/** A reaction pops on the person's tile and rises into the feed. */
export function react(emoji: string, userId = me(), roomId = myRoom()?.id) {
  if (!roomId) return
  const key = ++reactionKey
  updateRoom(roomId, (r) => ({ ...r, reactions: { ...r.reactions, [userId]: { emoji, key } } }))
  if (useHuddle.getState().mine?.roomId === roomId) pushFeed(userId, emoji)
  window.setTimeout(() => {
    updateRoom(roomId, (r) => {
      if (r.reactions[userId]?.key !== key) return r
      const reactions = { ...r.reactions }
      delete reactions[userId]
      return { ...r, reactions }
    })
  }, 4000)
}

/** Effects play a short, larger animation over the sheet, and count as a reaction (§3.3 layer 7, §3.8). */
export function sendEffect(emoji: string) {
  const key = ++reactionKey
  useHuddle.setState({ effect: { key, emoji } })
  react(emoji)
  window.setTimeout(() => useHuddle.setState((st) => (st.effect?.key === key ? { effect: null } : {})), 2600)
}

/** Put a sticker on your tile (it stays until you remove it); `null` removes it. */
export function setSticker(emoji: string | null) {
  const room = myRoom()
  if (!room) return
  const uid = me()
  updateRoom(room.id, (r) => {
    const stickers = { ...r.stickers }
    if (emoji) stickers[uid] = emoji
    else delete stickers[uid]
    return { ...r, stickers }
  })
}

// ---- liveliness: the speaking indicator hops between unmuted people ----

const REACTIONS = ['+1', 'joy', 'tada', 'raised_hands', 'heart', 'fire', 'clap']
let talkTimer: number | undefined

function ensureTalkLoop() {
  if (talkTimer !== undefined) return
  const tick = () => {
    talkTimer = undefined
    const rooms = Object.values(useHuddle.getState().rooms)
    if (!rooms.length) return
    for (const room of rooms) liven(room)
    talkTimer = window.setTimeout(tick, 1500 + Math.random() * 2300)
  }
  talkTimer = window.setTimeout(tick, 900)
}

function liven(room: LiveRoom) {
  const uid = me()
  const others = room.peers.filter((p) => p.userId !== uid)
  // Now and then someone mutes or unmutes.
  if (others.length && Math.random() < 0.06) {
    const p = others[Math.floor(Math.random() * others.length)]
    updateRoom(room.id, (r) => ({ ...r, peers: r.peers.map((x) => (x.userId === p.userId ? { ...x, mic: !x.mic } : x)) }))
  }
  // And now and then someone reacts, or raises (and later lowers) a hand.
  const mine = useHuddle.getState().mine?.roomId === room.id
  if (mine && others.length && Math.random() < 0.07) react(REACTIONS[Math.floor(Math.random() * REACTIONS.length)], others[Math.floor(Math.random() * others.length)].userId, room.id)
  if (mine && others.length && Math.random() < 0.025) {
    const p = others[Math.floor(Math.random() * others.length)]
    updateRoom(room.id, (r) => {
      const stickers = { ...r.stickers }
      if (stickers[p.userId]) delete stickers[p.userId]
      else stickers[p.userId] = 'raised_hand'
      return { ...r, stickers }
    })
  }
  const current = useHuddle.getState().rooms[room.id]
  if (!current) return
  const talkers = current.peers.filter((p) => p.userId !== uid && p.mic)
  const pause = current.peers.length < 2 || !talkers.length || Math.random() < 0.2
  const candidates = talkers.length > 1 ? talkers.filter((p) => p.userId !== current.speakerId) : talkers
  const next = pause ? null : candidates[Math.floor(Math.random() * candidates.length)].userId
  if (next === current.speakerId) return
  updateRoom(room.id, (r) => ({ ...r, speakerId: next, lastSpeakerId: next ?? r.lastSpeakerId }))
}

// ---- prototype hooks (scenes can drive a huddle) ----

/** Someone else starts a huddle in a conversation (you join from the card, the header or the Huddles page). */
export function startHuddleElsewhere(conversationId: string, userIds: string[]) {
  const [first, ...rest] = userIds.filter((id) => app().fx.users[id] && id !== me())
  if (!first || liveRoomIn(conversationId)) return
  const room = createRoom(conversationId, first)
  if (!room) return
  rest.forEach((uid, i) => later(room.id, 1200 + i * 1400, () => peerJoin(room.id, uid)))
  ensureTalkLoop()
}

/** Wrap up: everyone else leaves one by one, then you; the huddle reads as `minutes` long. */
export function wrapUpHuddle(minutes = 12) {
  const room = myRoom() ?? Object.values(useHuddle.getState().rooms)[0]
  if (!room) return
  clearTimers(room.id)
  updateRoom(room.id, (r) => ({ ...r, minutes }))
  const others = room.peers.filter((p) => p.userId !== me())
  others.forEach((p, i) => later(room.id, 600 + i * 1300, () => peerLeave(room.id, p.userId)))
  if (useHuddle.getState().mine?.roomId === room.id) later(room.id, 900 + others.length * 1300, () => leaveHuddle())
}
