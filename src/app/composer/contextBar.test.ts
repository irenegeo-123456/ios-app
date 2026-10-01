import { describe, expect, it } from 'vitest'
import type { Conversation, User } from '../../data/types'
import { contextBarState, type ContextBarInput } from './contextBar'

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
})
