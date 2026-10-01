// Types for the vendored TSF.slim.source.js (Slack's own .d.ts is just `export const TSF: any`).

export type TsfMode = 'NORMAL' | 'NOMRKDWN' | 'EDIT' | 'GROWL' | 'CLEAN'

export interface TsfFlags {
  /** mark emoji-only messages (1–23 emoji) with <JUMBOMOJI:COLONS> instead of <EMOJI:COLONS> */
  jumbomoji?: boolean
  /** also honor the full-width delimiters (＊ ＿ ｀ ｀｀｀ ＞) inside words, as Slack's Mrkdwn component asks */
  allow_intra_word_formatting?: boolean
}

export interface TsfApi {
  /** The message split into TSF tokens: text runs and `<B:START>`, `<LINK:START url>`, `<EMOJI:COLONS :x:>`… */
  getTokensArray(str: string, mode: TsfMode, flags?: TsfFlags): string[]
  getTokensString(str: string, mode: TsfMode, flags?: TsfFlags): string
  replaceFormatContents(map: { str: string; placeholder: string }[], str: string, options: { replace_pre?: boolean; replace_code?: boolean; replace_url?: boolean }): string
  swapOutPlaceholders(map: { str: string; placeholder: string }[], str: string): string
  getEmojiPermittedChars(): string
  [key: string]: unknown
}

export declare const TSF: TsfApi
export default TSF
