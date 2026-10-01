import { describe, expect, it } from 'vitest'
import type { Conversation, User } from '../../data/types'
import { contextBarState, isDnd, type ContextBarInput } from './contextBar'

const user = (id: string, name: string, extra: Partial<User> = {}): User => ({ id, name, realName: name, avatar: `/${id}.png`, presence: 'active', ...extra })
const users: Record<string, User> = {
  ME: user('ME', 'Me'),
  JANE: user('JANE', 'Jane'),
  SAM: user('SAM', 'Sam'),
  KIM: user('KIM', ''),
  BOT: user('BOT', 'Beacon', { isApp: true }),
  USLACKBOT: user('USLACKBOT', 'Slackbot', { isBot: true }),
}
const channel: Conversation = { id: 'C1', type: 'channel', name: 'general' }
const appDm: Conversation = { id: 'D1', type: 'app', name: 'Beacon', userId: 'BOT' }
const base: ContextBarInput = { me: 'ME', users, conversationId: 'C1', conv: channel, statuses: {}, slackbot: false, slackbotUserId: 'USLACKBOT' }

describe('contextBarState (Sept SKContextBar states, composer.md §14)', () => {
  it('shows people typing, not you, not unresolved ids', () => {
    expect(contextBarState({ ...base, typingIds: ['ME', 'JANE', 'NOBODY', 'SAM'] })).toEqual({ kind: 'typing', users: [users.JANE, users.SAM] })
    expect(contextBarState({ ...base, typingIds: ['ME'] })).toBeNull()
  })

  it('has no typers in a thread (they are per conversation in the clone)', () => {
    expect(contextBarState({ ...base, threadTs: '1.0', typingIds: ['JANE'] })).toBeNull()
  })

  it("never shows an app's status as typing: nothing in a channel or at its DM's top level", () => {
    const statuses = { 'C1/2.0': { status: 'is typing', botUserId: 'BOT', type: 'typing' as const } }
    expect(contextBarState({ ...base, typingIds: ['BOT'], statuses })).toBeNull()
    const dm = { ...base, conversationId: 'D1', conv: appDm, statuses: { 'D1/3.0': { status: 'is thinking…', botUserId: 'BOT', type: 'typing' as const } } }
    expect(contextBarState({ ...dm, typingIds: ['BOT'] })).toBeNull()
    // an app typing without a status (a prototype's scene) is still typing
    expect(contextBarState({ ...base, typingIds: ['BOT'] })).toEqual({ kind: 'typing', users: [users.BOT] })
  })

  it("draws an AI app's status in its DM's thread as the plain processing bar", () => {
    const dm = { ...base, conversationId: 'D1', conv: appDm, statuses: { 'D1/3.0': { status: 'is thinking…', botUserId: 'BOT', type: 'typing' as const } } }
    expect(contextBarState({ ...dm, threadTs: '3.0', typingIds: ['BOT'] })).toEqual({ kind: 'aiAppProcessing', text: 'Beacon is thinking…' })
    expect(contextBarState({ ...dm, threadTs: '4.0', typingIds: ['BOT'] })).toBeNull()
  })

  it('draws Slackbot answering in its DM with its avatar', () => {
    expect(contextBarState({ ...base, conversationId: 'D0', conv: undefined, slackbot: true, typingIds: ['USLACKBOT'] })).toEqual({ kind: 'slackbotTyping', avatar: '/USLACKBOT.png' })
  })

  it('puts people typing first (ContextBarPriorities: typing before AI app processing and Slackbot)', () => {
    expect(contextBarState({ ...base, conversationId: 'D0', conv: undefined, slackbot: true, typingIds: ['USLACKBOT', 'JANE'] })).toEqual({ kind: 'typing', users: [users.JANE] })
  })

  describe('do not disturb (ContextBarDNDConfiguration.swift:14-25)', () => {
    const NOW = Date.UTC(2026, 9, 1, 15)
    const withDnd = (dnd: User['dnd'], extra: Partial<User> = {}) => ({ ...users, JANE: { ...users.JANE, dnd, ...extra } })
    const dm: Conversation = { id: 'D2', type: 'im', name: 'jane', userId: 'JANE' }
    const inDm = { ...base, conversationId: 'D2', conv: dm, now: NOW }

    it('shows in a DM with a person who paused notifications, by their name, in the DM and its threads', () => {
      expect(contextBarState({ ...inDm, users: withDnd({}) })).toEqual({ kind: 'dnd', name: 'Jane' })
      expect(contextBarState({ ...inDm, users: withDnd({ until: NOW + 60_000 }) })).toEqual({ kind: 'dnd', name: 'Jane' })
      expect(contextBarState({ ...inDm, threadTs: '1.0', users: withDnd({}) })).toEqual({ kind: 'dnd', name: 'Jane' })
      // the display name, else the real name
      expect(contextBarState({ ...inDm, users: withDnd({}, { name: '', realName: 'Jane Cho' }) })).toEqual({ kind: 'dnd', name: 'Jane Cho' })
    })

    it('ends with its window, and nobody else has it', () => {
      expect(contextBarState({ ...inDm, users: withDnd({ until: NOW }) })).toBeNull()
      expect(contextBarState({ ...inDm, users: withDnd(undefined) })).toBeNull()
    })

    it('is only for 1:1 DMs with a human who isn\'t you', () => {
      const dndUsers = withDnd({})
      expect(contextBarState({ ...base, users: dndUsers, now: NOW })).toBeNull() // a channel
      expect(contextBarState({ ...inDm, conv: { id: 'G1', type: 'mpim', name: 'jane-sam', userIds: ['JANE', 'SAM'] }, users: dndUsers })).toBeNull()
      expect(contextBarState({ ...inDm, users: { ...dndUsers, BOT: { ...users.BOT, dnd: {} } }, conv: { ...dm, userId: 'BOT' } })).toBeNull()
      expect(contextBarState({ ...inDm, users: { ...dndUsers, ME: { ...users.ME, dnd: {} } }, conv: { ...dm, userId: 'ME' } })).toBeNull()
    })

    it('comes after people typing (ContextBarPriorities: dnd is near the end)', () => {
      expect(contextBarState({ ...inDm, users: withDnd({}), typingIds: ['JANE'] })).toEqual({ kind: 'typing', users: [withDnd({}).JANE] })
    })

    it('isDnd: inside the window', () => {
      expect(isDnd(withDnd({}).JANE, NOW)).toBe(true)
      expect(isDnd(withDnd({ until: NOW - 1 }).JANE, NOW)).toBe(false)
      expect(isDnd(users.JANE, NOW)).toBe(false)
    })
  })
})
