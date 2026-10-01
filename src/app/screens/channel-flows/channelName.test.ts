import { describe, expect, it } from 'vitest'
import { channelNameErrorText, channelNameInput, validateChannelName } from './channelName'
import type { Fixture } from '../../../data/types'

const fx = {
  workspace: { id: 'T1', name: 'Northstar', domain: 'northstar', initials: 'N', plan: 'business' },
  me: 'U1',
  users: { U1: { id: 'U1', name: 'alex', realName: 'Alex', avatar: '', presence: 'active' } },
  conversations: { C1: { id: 'C1', type: 'channel', name: 'design' } },
  sections: [],
  messages: {},
  unreads: {},
  activityBadge: 0,
  sidebarWidth: 260,
  initial: { tab: 'home', conversationId: 'C1' },
  userGroups: [{ id: 'S1', handle: 'eng', name: 'Engineering', memberIds: [] }],
} as unknown as Fixture

describe('channel name input (replaceSpaceWithDashIfNeeded)', () => {
  it('turns trailing and leading spaces into one dash', () => {
    expect(channelNameInput('my ')).toBe('my-')
    expect(channelNameInput(' my')).toBe('my-')
    expect(channelNameInput(' ')).toBe('-')
    expect(channelNameInput('my-channel')).toBe('my-channel')
  })
  it('leaves spaces in the middle alone', () => {
    expect(channelNameInput('my channel')).toBe('my channel')
  })
})

describe('validateChannelName', () => {
  it('accepts lowercase names with dashes, underscores and digits', () => {
    expect(validateChannelName(fx, 'project-pigeon')).toBeNull()
    expect(validateChannelName(fx, 'q4_plan-2')).toBeNull()
  })
  it('maps problems to the server error codes', () => {
    expect(validateChannelName(fx, '')).toBe('invalid_name_required')
    expect(validateChannelName(fx, 'a'.repeat(81))).toBe('invalid_name_maxlength')
    expect(validateChannelName(fx, 'my channel')).toBe('invalid_name_punctuation')
    expect(validateChannelName(fx, 'v1.2')).toBe('invalid_name_punctuation')
    expect(validateChannelName(fx, '---')).toBe('invalid_name_punctuation')
    expect(validateChannelName(fx, 'Design-Team')).toBe('invalid_name_specials')
    expect(validateChannelName(fx, 'cool★')).toBe('invalid_name_specials')
  })
  it('knows taken names: channels, people and user groups', () => {
    expect(validateChannelName(fx, 'design')).toBe('name_taken')
    expect(validateChannelName(fx, 'alex')).toBe('name_taken')
    expect(validateChannelName(fx, 'eng')).toBe('name_taken')
  })
  it('names the workspace when a name is taken', () => {
    expect(channelNameErrorText('name_taken', 'Northstar')).toBe('That name is already taken by a channel, username, or user group in <bold>Northstar</bold>.')
  })
})
