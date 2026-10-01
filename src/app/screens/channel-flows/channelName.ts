import type { Fixture } from '../../../data/types'

// Channel names (spec channels-people.md §1.3). The client only trims (String+Extensions.swift:85-92); the server's
// conversations.validateName decides, and the client turns its error codes into text (ChannelNameInputPresenter.swift:
// 152-180). Its rules aren't in the client, so `validateChannelName` stands in for them: empty, longer than 80
// (ChannelNameUtility.swift:13), spaces or punctuation, upper case or other symbols, a name that's taken.

/** The server's error codes (APIErrorCode.swift:146-150,206) */
export type ChannelNameError = 'invalid_name_required' | 'invalid_name_maxlength' | 'invalid_name_punctuation' | 'invalid_name_specials' | 'name_taken'

/** ChannelPropertiesClientSideValidationRules.maxCharactersInChannelName (ChannelNameUtility.swift:13) */
export const MAX_CHANNEL_NAME = 80

/**
 * replaceSpaceWithDashIfNeeded, applied on every keystroke (ChannelNameInputInteractor.swift:58-64): the text trimmed of
 * leading and trailing spaces and tabs, with one "-" appended if anything was trimmed ("my " → "my-", " my" → "my-").
 */
export function channelNameInput(text: string): string {
  const trimmed = text.replace(/^[ \t]+|[ \t]+$/g, '')
  return trimmed === text ? text : `${trimmed}-`
}

/** The error the server would answer for this name, or null when it's fine. */
export function validateChannelName(fx: Fixture, name: string): ChannelNameError | null {
  if (!name) return 'invalid_name_required'
  if ([...name].length > MAX_CHANNEL_NAME) return 'invalid_name_maxlength'
  if (/\s/.test(name) || /^[-_]+$/.test(name)) return 'invalid_name_punctuation'
  // ASCII punctuation other than "-" and "_"
  if (/[!-,./:-@[-^`{-~]/.test(name)) return 'invalid_name_punctuation'
  // upper case and anything that isn't a letter, a digit, "-" or "_"
  if (name !== name.toLowerCase() || !/^[\p{Ll}\p{Lo}\p{Lm}\p{N}_-]+$/u.test(name)) return 'invalid_name_specials'
  const taken =
    Object.values(fx.conversations).some((c) => (c.type === 'channel' || c.type === 'private') && c.name.toLowerCase() === name) ||
    Object.values(fx.users).some((u) => u.name.toLowerCase() === name) ||
    (fx.userGroups ?? []).some((g) => g.handle.toLowerCase() === name)
  return taken ? 'name_taken' : null
}

/** The banner's text for an error, with Slack's `<bold>` spans (ChannelNameInputPresenter.swift:152-180). */
export function channelNameErrorText(error: ChannelNameError, workspaceName: string): string {
  switch (error) {
    case 'invalid_name_required':
      return 'Give your channel a name to continue. You can always change the name later.' // give_your_channel_a_name_to_continue, yaml:7151
    case 'invalid_name_punctuation':
      return 'Channel names can’t contain spaces or punctuation. Use dashes to separate words.' // yaml:3668
    case 'invalid_name_maxlength':
      return 'Channel names can’t be longer than 80 characters.' // yaml:3665
    case 'invalid_name_specials':
      return 'Channel names can’t contain special characters or Upper case letters. Use dashes to separate words.' // yaml:3672
    case 'name_taken':
      return `That name is already taken by a channel, username, or user group in <bold>${workspaceName}</bold>.` // yaml:19689
  }
}
