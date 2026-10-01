// Slack's TSF-token → message-content tree, ported from slack/webapp (2026-08-12 snapshot):
//
//   js/modern/utility/format/tokens-to-message-content.ts   tokensToMessageContent, processTokensUntil
//   js/modern/utility/format/untangle-overlapping-tsf-tokens.ts
//   js/modern/utility/format/parse-command-token.ts
//   js/modern/types/texty.ts                                  TokenTags, TokenTypes
//   js/modern/utility/broadcast-keywords/constants.ts         BROADCAST_KEYWORDS ms_names
//
// The only departures are mechanical: lodash helpers inlined, and no logger warning for unknown tokens.
//
// Given `*hey _you_ there*`, TSF produces [<B:START>, 'hey ', <I:START>, 'you', <I:END>, ' there', <B:END>] and this
// turns it into [{ type: 'bold', contents: [{ text: 'hey ' }, { type: 'italic', contents: [{ text: 'you' }] },
// { text: ' there' }] }]. Text stays HTML-escaped the way TSF leaves it (&lt; &gt; &amp;); renderers unescape it.

export const TokenTypes = {
  BOLD: 'bold',
  ITALIC: 'italic',
  STRIKE: 'strike',
  LINK: 'link',
  COMMAND: 'command',
  MEMBER: 'member',
  CHANNEL: 'channel',
  EMOJI: 'emoji',
  JUMBOEMOJI: 'jumbomoji',
  HEX: 'hex',
  CODE: 'code',
  QUOTE: 'quote',
  PRE: 'pre',
  QUOTE_PREFIX: 'quote_prefix',
  LONGQUOTE_PREFIX: 'long_quote_prefix',
  LINE_BREAK: 'line_break',
  PARA_BREAK: 'paragraph_break',
  SPACE_HARD: 'space_hard',
  HIGHLIGHT: 'highlight',
  UNKNOWN: 'unknown',
} as const
export type TokenType = (typeof TokenTypes)[keyof typeof TokenTypes]

export const TokenTags = {
  BOLD_START: '<B:START>',
  BOLD_END: '<B:END>',
  ITALIC_START: '<I:START>',
  ITALIC_END: '<I:END>',
  CODE_START: '<CODE:START>',
  CODE_END: '<CODE:END>',
  STRIKE_START: '<STRIKE:START>',
  STRIKE_END: '<STRIKE:END>',
  LINK_START: '<LINK:START>',
  LINK_END: '<LINK:END>',
  PRE_START: '<PRE:START>',
  PRE_END: '<PRE:END>',
  HIGHLIGHT_START: '<HIGHLIGHT:START>',
  HIGHLIGHT_END: '<HIGHLIGHT:END>',
  QUOTE_START: '<QUOTE:START>',
  QUOTE_END: '<QUOTE:END>',
  QUOTE_PREFIX: '<QUOTE:PREFIX>',
  LONGQUOTE_PREFIX: '<LONGQUOTE:PREFIX>',
  PARA_BREAK: '<PARA:BREAK>',
  LINE_BREAK: '<LINE:BREAK>',
  SPACE_HARD: '<SPACE:HARD>',
  EMOJI_COLONS: '<EMOJI:COLONS>',
  JUMBOMOJI_COLONS: '<JUMBOMOJI:COLONS>',
  HEX_BLOCK: '<HEX:BLOCK>',
} as const

/** Parsed `<!…>` command (parse-command-token.ts). */
export interface CommandData {
  type: string
  label?: string
  id?: string
  ts?: string
  format?: string
  link?: string
  salesforceRecordId?: string
  salesforceFieldLabel?: string
  salesforceFieldApiName?: string
  salesforceIncludeFieldLabel?: string
}

export interface ProcessedToken {
  text?: string
  type?: TokenType
  id?: string
  fallback?: string
  data?: CommandData
  token?: string
  color?: string
  name?: string
  contents?: ProcessedToken[]
  url?: string
}

// ------------------------------------------------------------------------------------------------
// parse-command-token.ts

/** BROADCAST_KEYWORDS' ms_names (isBroadcastKeywordMsName). */
const BROADCAST_MS_NAMES = new Set(['everyone', 'channel', 'here', 'sf:accountteam', 'sf:dealteam', 'assistant:einstein'])

function tokenParts(token: string): { type: string; label: string; args: string[] } {
  const inner = token.slice(2, -1)
  const [commandText, label] = inner.split('|')
  const [type, ...args] = commandText.split('^')
  return { type, label, args }
}

/** `<!here>` → { type: 'here' }; `<!subteam^S1|@eng>` → { type, id, label }; `<!date^ts^format^link|fallback>` → … */
export function parseCommandToken(token: string | null | undefined): CommandData | undefined {
  if (typeof token !== 'string' || !token.startsWith('<!')) return undefined
  const { type, label, args } = tokenParts(token)
  if (type === 'group' || BROADCAST_MS_NAMES.has(type)) return { type }
  if (type === 'subteam') {
    const [id] = args
    return { type, label, id }
  }
  if (type === 'date') {
    const [ts, format, link] = args
    return { type, label, ts, format, link }
  }
  if (type === 'salesforce_data_field') {
    const [salesforceRecordId, salesforceFieldApiName, salesforceFieldLabel, salesforceIncludeFieldLabel] = args
    return { type, salesforceRecordId, salesforceFieldApiName, salesforceFieldLabel, salesforceIncludeFieldLabel }
  }
  return { type: 'unknown' }
}

// ------------------------------------------------------------------------------------------------
// untangle-overlapping-tsf-tokens.ts

const START_TOKENS: Record<string, string> = {
  [TokenTags.BOLD_START]: TokenTags.BOLD_END,
  [TokenTags.ITALIC_START]: TokenTags.ITALIC_END,
  [TokenTags.CODE_START]: TokenTags.CODE_END,
  [TokenTags.STRIKE_START]: TokenTags.STRIKE_END,
  [TokenTags.PRE_START]: TokenTags.PRE_END,
  [TokenTags.QUOTE_START]: TokenTags.QUOTE_END,
}

const END_TOKENS: Record<string, string> = {
  [TokenTags.BOLD_END]: TokenTags.BOLD_START,
  [TokenTags.ITALIC_END]: TokenTags.ITALIC_START,
  [TokenTags.CODE_END]: TokenTags.CODE_START,
  [TokenTags.STRIKE_END]: TokenTags.STRIKE_START,
  [TokenTags.PRE_END]: TokenTags.PRE_START,
  [TokenTags.QUOTE_END]: TokenTags.QUOTE_START,
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** Closes and reopens formats that overlap (`*one _two* three_`) so they nest. */
export function untangleOverlappingTsfTokens(tokens: string[]): string[] {
  const flattenedTokens = tokens.slice()
  const activeStartTokens: string[] = []

  for (let i = 0; i < flattenedTokens.length; i++) {
    const token = flattenedTokens[i]

    if (has(START_TOKENS, token)) {
      // Track that the new start token is active
      activeStartTokens.push(token)
    } else if (has(END_TOKENS, token)) {
      const correspondingStartToken = END_TOKENS[token]
      const correspondingStartTokenIndex = activeStartTokens.lastIndexOf(correspondingStartToken)
      const remainingStartTokens = activeStartTokens.slice(correspondingStartTokenIndex + 1)

      // Remove the now ended start token
      activeStartTokens.splice(correspondingStartTokenIndex, 1)

      // Close the open start tokens in reverse to mirror the opening tokens
      remainingStartTokens
        .slice()
        .reverse()
        .forEach((remainingStartToken) => {
          flattenedTokens.splice(i, 0, START_TOKENS[remainingStartToken])
          i += 1
        })

      // Add the remaining active start tokens back after we closed them off
      remainingStartTokens.forEach((remainingStartToken) => {
        flattenedTokens.splice(i + 1, 0, remainingStartToken)
        i += 1
      })
    }
  }

  return flattenedTokens
}

// ------------------------------------------------------------------------------------------------
// tokens-to-message-content.ts

interface Format {
  type: TokenType
  endToken?: string
}

const FORMATS: Record<string, Format> = {
  [TokenTags.BOLD_START]: { type: TokenTypes.BOLD, endToken: TokenTags.BOLD_END },
  [TokenTags.ITALIC_START]: { type: TokenTypes.ITALIC, endToken: TokenTags.ITALIC_END },
  [TokenTags.STRIKE_START]: { type: TokenTypes.STRIKE, endToken: TokenTags.STRIKE_END },
  [TokenTags.CODE_START]: { type: TokenTypes.CODE, endToken: TokenTags.CODE_END },
  [TokenTags.QUOTE_START]: { type: TokenTypes.QUOTE, endToken: TokenTags.QUOTE_END },
  [TokenTags.PRE_START]: { type: TokenTypes.PRE, endToken: TokenTags.PRE_END },
  [TokenTags.QUOTE_PREFIX]: { type: TokenTypes.QUOTE_PREFIX },
  [TokenTags.LONGQUOTE_PREFIX]: { type: TokenTypes.LONGQUOTE_PREFIX },
  [TokenTags.LINE_BREAK]: { type: TokenTypes.LINE_BREAK },
  [TokenTags.PARA_BREAK]: { type: TokenTypes.PARA_BREAK },
  [TokenTags.SPACE_HARD]: { type: TokenTypes.SPACE_HARD },
  [TokenTags.HIGHLIGHT_START]: { type: TokenTypes.HIGHLIGHT, endToken: TokenTags.HIGHLIGHT_END },
}

function tokenStartsWith(token: string, type: string): boolean {
  return token.indexOf(type.substr(0, type.length - 1)) === 0
}

/** Number of items and child items in the list (each nested list also skipped an end token). */
function sumContentsLength(items: ProcessedToken[]): number {
  return items.reduce((sum, item) => {
    if (item.contents) sum += sumContentsLength(item.contents) + 1
    return sum + 1
  }, 0)
}

function processTokensUntil(tokens: string[], stopToken?: string): ProcessedToken[] {
  const output: ProcessedToken[] = []

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]

    if (token === stopToken) break

    // Look for formats with fixed tokens (e.g., '<B:START>')
    if (has(FORMATS, token)) {
      const { type, endToken } = FORMATS[token]
      const insert: ProcessedToken = { type }

      // Look for the start of a nested format
      if (endToken) {
        insert.contents = processTokensUntil(tokens.slice(i + 1), endToken)
        i += sumContentsLength(insert.contents) + 1
      }

      output.push(insert)

      // Look for formats with variable tokens (e.g., '<LINK:START ...>')
    } else if (token.indexOf('<') === 0) {
      if (tokenStartsWith(token, TokenTags.LINK_START)) {
        const link: ProcessedToken = {
          type: TokenTypes.LINK,
          contents: processTokensUntil(tokens.slice(i + 1), TokenTags.LINK_END),
          url: token.slice(12, -1),
        }
        output.push(link)
        i += sumContentsLength(link.contents!) + 1
      } else if (token.indexOf('<!') === 0) {
        output.push({
          type: TokenTypes.COMMAND,
          data: parseCommandToken(token),
          // Keep the token, because the command may be meaningless, e.g. <!foobar>
          token,
          fallback: token.slice(2, -1),
        })
      } else if (token.indexOf('<@') === 0) {
        const [memberId, memberName] = token.slice(2, -1).split('|')
        output.push({ type: TokenTypes.MEMBER, id: memberId, fallback: memberName })
      } else if (token.indexOf('<#') === 0) {
        const [channelId, channelName] = token.slice(2, -1).split('|')
        output.push({ type: TokenTypes.CHANNEL, id: channelId, name: channelName })
      } else if (tokenStartsWith(token, TokenTags.EMOJI_COLONS)) {
        output.push({ type: TokenTypes.EMOJI, name: token.slice(14, -1) })
      } else if (tokenStartsWith(token, TokenTags.JUMBOMOJI_COLONS)) {
        output.push({ type: TokenTypes.JUMBOEMOJI, name: token.slice(18, -1) })
      } else if (tokenStartsWith(token, TokenTags.HEX_BLOCK)) {
        output.push({ type: TokenTypes.HEX, color: token.slice(11, -1) })
      } else {
        output.push({ type: TokenTypes.UNKNOWN, token })
      }
    } else {
      // Plain text
      output.push({ text: token })
    }
  }

  return output
}

/** Slack's tokensToMessageContent: TSF tokens → a tree of formats. */
export function tokensToMessageContent(tokens: string[]): ProcessedToken[] {
  if (!tokens || !tokens.length) return []
  // Normalize overlapping tokens so we can nest them
  return processTokensUntil(untangleOverlappingTsfTokens(tokens))
}

export default tokensToMessageContent
