// Slack's jest tables for tokens-to-message-content, untangle-overlapping-tsf-tokens and parse-command-token
// (js/modern/utility/format/*.jest.ts), ported to vitest.
import { describe, expect, it } from 'vitest'
import { parseCommandToken, TokenTags, TokenTypes, tokensToMessageContent, untangleOverlappingTsfTokens } from './tokens-to-message-content'

describe('tokensToMessageContent', () => {
  it('translates text without formatting', () => {
    expect(tokensToMessageContent(['foo bar'])).toEqual([{ text: 'foo bar' }])
  })

  it('translates text links', () => {
    expect(tokensToMessageContent(['<LINK:START https://slack.com>', 'Slack', TokenTags.LINK_END])).toEqual([{ type: 'link', contents: [{ text: 'Slack' }], url: 'https://slack.com' }])
  })

  it('translates text with inline formatting', () => {
    // Mrkdwn: *one* two _three_ four ~five~ six `seven`
    const results = tokensToMessageContent([
      TokenTags.BOLD_START, 'one', TokenTags.BOLD_END, ' two ',
      TokenTags.ITALIC_START, 'three', TokenTags.ITALIC_END, ' four ',
      TokenTags.STRIKE_START, 'five', TokenTags.STRIKE_END, ' six ',
      TokenTags.CODE_START, 'seven', TokenTags.CODE_END,
    ])
    expect(results).toEqual([
      { type: TokenTypes.BOLD, contents: [{ text: 'one' }] },
      { text: ' two ' },
      { type: TokenTypes.ITALIC, contents: [{ text: 'three' }] },
      { text: ' four ' },
      { type: TokenTypes.STRIKE, contents: [{ text: 'five' }] },
      { text: ' six ' },
      { type: TokenTypes.CODE, contents: [{ text: 'seven' }] },
    ])
  })

  it('translates text with overlapping inline formatting', () => {
    // Mrkdwn: *one _two* three_
    const results = tokensToMessageContent([TokenTags.BOLD_START, 'one ', TokenTags.ITALIC_START, 'two', TokenTags.BOLD_END, ' three', TokenTags.ITALIC_END])
    expect(results).toEqual([
      { type: TokenTypes.BOLD, contents: [{ text: 'one ' }, { type: TokenTypes.ITALIC, contents: [{ text: 'two' }] }] },
      { type: TokenTypes.ITALIC, contents: [{ text: ' three' }] },
    ])
  })

  it('translates text with nested formatting', () => {
    // Mrkdwn: foo *bar _baz ~boo~ goo_ doo* bla
    const results = tokensToMessageContent([
      'foo ', TokenTags.BOLD_START, 'bar ', TokenTags.ITALIC_START, 'baz ', TokenTags.STRIKE_START, 'boo', TokenTags.STRIKE_END,
      ' goo', TokenTags.ITALIC_END, ' doo', TokenTags.BOLD_END, ' bla',
    ])
    expect(results).toEqual([
      { text: 'foo ' },
      {
        type: TokenTypes.BOLD,
        contents: [
          { text: 'bar ' },
          { type: TokenTypes.ITALIC, contents: [{ text: 'baz ' }, { type: TokenTypes.STRIKE, contents: [{ text: 'boo' }] }, { text: ' goo' }] },
          { text: ' doo' },
        ],
      },
      { text: ' bla' },
    ])
  })

  it('translates text with pre formatting', () => {
    expect(tokensToMessageContent(['one ', TokenTags.PRE_START, 'two', TokenTags.PRE_END])).toEqual([{ text: 'one ' }, { type: TokenTypes.PRE, contents: [{ text: 'two' }] }])
  })

  it('translates text with multiline pre formatting', () => {
    expect(tokensToMessageContent([TokenTags.PRE_START, 'one', TokenTags.LINE_BREAK, 'two', TokenTags.PRE_END])).toEqual([
      { type: TokenTypes.PRE, contents: [{ text: 'one' }, { type: TokenTypes.LINE_BREAK }, { text: 'two' }] },
    ])
  })

  it('translates text with line breaks', () => {
    expect(tokensToMessageContent(['foo', TokenTags.LINE_BREAK, 'bar'])).toEqual([{ text: 'foo' }, { type: TokenTypes.LINE_BREAK }, { text: 'bar' }])
  })

  it('translates text with paragraph breaks', () => {
    expect(tokensToMessageContent(['foo', TokenTags.PARA_BREAK, 'bar'])).toEqual([{ text: 'foo' }, { type: TokenTypes.PARA_BREAK }, { text: 'bar' }])
  })

  it('translates text with quotes', () => {
    expect(tokensToMessageContent([TokenTags.QUOTE_START, TokenTags.QUOTE_PREFIX, ' foo bar', TokenTags.QUOTE_END])).toEqual([
      { type: TokenTypes.QUOTE, contents: [{ type: TokenTypes.QUOTE_PREFIX }, { text: ' foo bar' }] },
    ])
  })

  it('translates text with long quotes', () => {
    expect(tokensToMessageContent([TokenTags.QUOTE_START, TokenTags.LONGQUOTE_PREFIX, 'foo bar', TokenTags.QUOTE_END])).toEqual([
      { type: TokenTypes.QUOTE, contents: [{ type: TokenTypes.LONGQUOTE_PREFIX }, { text: 'foo bar' }] },
    ])
  })

  it('translates text with emoji', () => {
    expect(tokensToMessageContent(['foo ', '<EMOJI:COLONS :smile:>'])).toEqual([{ text: 'foo ' }, { type: TokenTypes.EMOJI, name: ':smile:' }])
  })

  it('translates text with jumbomoji', () => {
    expect(tokensToMessageContent(['<JUMBOMOJI:COLONS :smile:>', ' ', '<JUMBOMOJI:COLONS :cry:>'])).toEqual([
      { type: TokenTypes.JUMBOEMOJI, name: ':smile:' },
      { text: ' ' },
      { type: TokenTypes.JUMBOEMOJI, name: ':cry:' },
    ])
  })

  it('translates text with hex colors', () => {
    expect(tokensToMessageContent(['foo #123456', '<HEX:BLOCK #123456>'])).toEqual([{ text: 'foo #123456' }, { type: TokenTypes.HEX, color: '#123456' }])
  })

  it('translates text with channels', () => {
    expect(tokensToMessageContent(['<#123456|general>'])).toEqual([{ type: TokenTypes.CHANNEL, id: '123456', name: 'general' }])
  })

  it('translates text with commands', () => {
    expect(tokensToMessageContent(['<!here>'])).toEqual([{ type: TokenTypes.COMMAND, data: { type: 'here' }, token: '<!here>', fallback: 'here' }])
  })

  it('translates text with members', () => {
    expect(tokensToMessageContent(['<@123456|bob>'])).toEqual([{ type: TokenTypes.MEMBER, id: '123456', fallback: 'bob' }])
  })

  it('translates text with highlights', () => {
    expect(tokensToMessageContent(['hello ', TokenTags.HIGHLIGHT_START, 'there', TokenTags.HIGHLIGHT_END])).toEqual([{ text: 'hello ' }, { type: TokenTypes.HIGHLIGHT, contents: [{ text: 'there' }] }])
  })

  it('translates highlights with channels in them', () => {
    expect(tokensToMessageContent(['hello ', TokenTags.HIGHLIGHT_START, '<#123456|general>', TokenTags.HIGHLIGHT_END])).toEqual([
      { text: 'hello ' },
      { type: TokenTypes.HIGHLIGHT, contents: [{ type: TokenTypes.CHANNEL, id: '123456', name: 'general' }] },
    ])
  })

  it('translates unknown tokens', () => {
    expect(tokensToMessageContent(['<%foo>'])).toEqual([{ type: TokenTypes.UNKNOWN, token: '<%foo>' }])
  })
})

describe('untangleOverlappingTsfTokens', () => {
  const { BOLD_START, BOLD_END, ITALIC_START, ITALIC_END, CODE_START, CODE_END, LINK_END } = TokenTags

  it('ignores tokens without overlap', () => {
    const tokens = [BOLD_START, 'one', BOLD_END, ' two ', ITALIC_START, 'toString', ITALIC_END]
    expect(untangleOverlappingTsfTokens(tokens)).toEqual(tokens)
  })

  it('ignores nested tokens without overlap', () => {
    const tokens = [BOLD_START, 'one ', '<LINK:START example.com>', BOLD_START, 'two', BOLD_END, LINK_END, 'three', BOLD_END]
    expect(untangleOverlappingTsfTokens(tokens)).toEqual(tokens)
  })

  it('fixes single overlapping tokens', () => {
    expect(untangleOverlappingTsfTokens([BOLD_START, 'one ', ITALIC_START, 'two', BOLD_END, ' three', ITALIC_END])).toEqual([
      BOLD_START, 'one ', ITALIC_START, 'two', ITALIC_END, BOLD_END, ITALIC_START, ' three', ITALIC_END,
    ])
  })

  it('fixes double overlapping tokens', () => {
    expect(untangleOverlappingTsfTokens([BOLD_START, 'one ', ITALIC_START, 'two ', CODE_START, 'three', BOLD_END, ' four', ITALIC_END, ' five', CODE_END])).toEqual([
      BOLD_START, 'one ', ITALIC_START, 'two ', CODE_START, 'three', CODE_END, ITALIC_END, BOLD_END,
      ITALIC_START, CODE_START, ' four', CODE_END, ITALIC_END, CODE_START, ' five', CODE_END,
    ])
  })

  it('fixes tokens with nested overlapping', () => {
    expect(untangleOverlappingTsfTokens([BOLD_START, 'one ', ITALIC_START, 'two ', CODE_START, 'three', ITALIC_END, ' four', CODE_END, ' five', BOLD_END])).toEqual([
      BOLD_START, 'one ', ITALIC_START, 'two ', CODE_START, 'three', CODE_END, ITALIC_END, CODE_START, ' four', CODE_END, ' five', BOLD_END,
    ])
  })

  it('fixes overlapping tokens with interior nesting', () => {
    expect(untangleOverlappingTsfTokens([BOLD_START, 'one ', ITALIC_START, CODE_START, 'two', CODE_END, BOLD_END, ' three', ITALIC_END])).toEqual([
      BOLD_START, 'one ', ITALIC_START, CODE_START, 'two', CODE_END, ITALIC_END, BOLD_END, ITALIC_START, ' three', ITALIC_END,
    ])
  })
})

describe('parseCommandToken', () => {
  it.each([[null], [''], ['foo'], ['<foo>']])('handles bad params: %s', (input) => {
    expect(parseCommandToken(input)).toBeUndefined()
  })

  it('parses "at commands" tokens', () => {
    for (const type of ['everyone', 'channel', 'group', 'here']) expect(parseCommandToken(`<!${type}>`)).toEqual({ type })
  })

  it('parses "subteam" tokens', () => {
    expect(parseCommandToken('<!subteam^U123|@foo>')).toEqual({ type: 'subteam', id: 'U123', label: '@foo' })
  })

  it('parses "date" tokens', () => {
    expect(parseCommandToken('<!date^1423784906^Posted at {time}^http://example.com|Posted at 18:35>')).toEqual({
      type: 'date',
      ts: '1423784906',
      link: 'http://example.com',
      format: 'Posted at {time}',
      label: 'Posted at 18:35',
    })
  })

  it.each([
    ['<!salesforce_data_field^ssr:001Dn00000ABC123^Account_Name__c^Account Name>', undefined],
    ['<!salesforce_data_field^ssr:001Dn00000ABC123^Account_Name__c^Account Name^1>', '1'],
    ['<!salesforce_data_field^ssr:001Dn00000ABC123^Account_Name__c^Account Name^0>', '0'],
  ])('parses "salesforce_data_field" tokens: %s', (token, include) => {
    expect(parseCommandToken(token)).toEqual({
      type: 'salesforce_data_field',
      salesforceRecordId: 'ssr:001Dn00000ABC123',
      salesforceFieldApiName: 'Account_Name__c',
      salesforceFieldLabel: 'Account Name',
      salesforceIncludeFieldLabel: include,
    })
  })

  it('doesn’t parse "team" tokens', () => {
    expect(parseCommandToken('<!team^T123|Fallback>')).toEqual({ type: 'unknown' })
  })

  it('handles unknown tokens', () => {
    expect(parseCommandToken('<!aqui>')).toEqual({ type: 'unknown' })
  })
})
