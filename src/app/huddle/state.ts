import { useMemo } from 'react'
import { create } from 'zustand'
import { useApp } from '../store'

// Live huddle state (spec search-slackbot-huddles.md §3), ported from the web clone (slack-remix
// src/components/huddles/state.ts). The channel card (a `huddle_thread` message) and the Huddles page history live in
// the app store; this store holds what only exists while a huddle runs: who's in it, who's talking, your mic and camera,
// the reaction feed. Nothing touches real media: the mic, camera and screen share are visual only.

export interface Peer {
  userId: string
  /** unmuted */
  mic: boolean
  camera: boolean
  joinedAt: number
}

export interface LiveRoom {
  id: string
  conversationId: string
  /** a huddle started from a thread belongs to that thread (§3.1); its thread is the huddle thread */
  threadTs?: string
  /** ts of the room's `huddle_thread` card (or the thread root for a thread huddle) */
  msgTs: string
  /** ms when it started (Date.now) */
  startedAt: number
  /** people in the huddle right now, in join order */
  peers: Peer[]
  /** everyone who has joined, in join order */
  everIds: string[]
  /** who's talking right now */
  speakerId: string | null
  lastSpeakerId: string | null
  /** AI notes are on */
  notes: boolean
  /** someone turned AI notes off (they don't come back on by themselves) */
  notesStopped?: boolean
  /** how long the huddle reads as when it ends (prototype wrap-up), instead of the real time */
  minutes?: number
  /** tile reactions (emoji name) by user id; they clear after a few seconds */
  reactions: Record<string, { emoji: string; key: number }>
  /** stickers that stay until removed ("Raise hand"), by user id */
  stickers: Record<string, string>
}

export interface MyCall {
  roomId: string
  /** sharing your screen (visual only) */
  screen: boolean
  captions: boolean
  selfViewHidden: boolean
}

/**
 * A pill in the reaction feed (§3.8): one per person, their emoji combine while it hangs; or a notice ("Priya joined",
 * HuddleNotificationFeedInteractor.swift:107-109).
 */
export interface FeedPill {
  key: number
  userId?: string
  emojis: string[]
  plus: number
  /** a notice pill's text */
  text?: string
  /** fading out (0.5 s) */
  leaving?: boolean
}

export type PipCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

interface HuddleStore {
  rooms: Record<string, LiveRoom>
  mine: MyCall | null
  feed: FeedPill[]
  /** a full-screen effect playing over the huddle sheet (§3.3 layer 7) */
  effect: { key: number; emoji: string } | null
  /** where the minimized huddle rests (PIPMinimizedLocation; starts top-right, PictureInPictureViewController.swift:38) */
  pipCorner: PipCorner
}

export const useHuddle = create<HuddleStore>()(() => ({ rooms: {}, mine: null, feed: [], effect: null, pipCorner: 'topRight' }))

/** The huddle you're in. */
export const useMyRoom = () => useHuddle((s) => (s.mine ? (s.rooms[s.mine.roomId] ?? null) : null))

/** The live huddle in a conversation (its main huddle, not a thread's), if there is one. */
export function liveRoomIn(conversationId: string, threadTs?: string): LiveRoom | undefined {
  return Object.values(useHuddle.getState().rooms).find((r) => r.conversationId === conversationId && (r.threadTs ?? '') === (threadTs ?? ''))
}

export function myRoom(): LiveRoom | null {
  const s = useHuddle.getState()
  return s.mine ? (s.rooms[s.mine.roomId] ?? null) : null
}

/**
 * For the conversation header's huddle button (§3.1) and anything else that shows a conversation's huddle:
 * `live` (a huddle is running there), `participantIds` (who's in it now), `joined` (you're in it).
 *
 *   const { live, participantIds, joined } = useLiveHuddle(conversationId)
 */
export function useLiveHuddle(conversationId: string | undefined): { live: boolean; participantIds: string[]; joined: boolean } {
  const me = useApp((s) => s.fx.me)
  // The membership as a string, so the result only changes when someone joins or leaves (not on every speaking tick).
  const ids = useHuddle((s) => {
    const room = conversationId ? Object.values(s.rooms).find((r) => r.conversationId === conversationId && !r.threadTs) : undefined
    return room ? room.peers.map((p) => p.userId).join(',') : null
  })
  return useMemo(() => {
    if (ids === null) return { live: false, participantIds: [], joined: false }
    const participantIds = ids ? ids.split(',') : []
    return { live: true, participantIds, joined: participantIds.includes(me) }
  }, [ids, me])
}
