// Slack's unescapeEntities (js/modern/utility/unescape-entities.ts, 2026-08-12 snapshot): decodes every HTML
// entity in mrkdwn text, not just the few lodash's _.unescape knows. The named table (the W3C HTML5 list) is in
// html-entities.json, keeping the ';'-terminated names: the regex below can't match any other.
import named from './html-entities.json'

const NAMED = named as Record<string, string>

export function isHtmlEntity(match: string): boolean {
  return !!NAMED[match] || /^&#x[0-9a-f]+;$/i.test(match) || /^&#[0-9]+;$/.test(match)
}

export function unescapeEntities(s: string): string {
  if (!s) return s
  return s.replace(/&#?[a-z0-9]+;/gi, (match) => {
    // Named entity
    if (NAMED[match]) return NAMED[match]
    // Hex
    if (/^&#x[0-9a-f]+;$/i.test(match)) return String.fromCodePoint(parseInt(match.substring(3, match.length - 1), 16))
    // Decimal
    if (/^&#[0-9]+;$/.test(match)) return String.fromCodePoint(parseInt(match.substring(2, match.length - 1), 10))
    return match
  })
}

export default unescapeEntities
