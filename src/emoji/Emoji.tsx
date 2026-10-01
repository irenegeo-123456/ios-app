import data from './emoji-data.json'
import builtinData from './emoji-builtin.json'
import { asset } from '../lib/asset'

// Slack's standard emoji (Emoji 16.0) and built-in Slack emoji. The data files are generated from Slack's own data by
// tools/make-emoji-data.mjs: names and aliases (`aliasOf`), skin tones and two-tone variants, and the emoji
// picker's categories and order (standard-emoji-{data,categories}-16_0.json, as embedded in the production bundle).

export interface EmojiEntry {
  /** short names: the canonical name, then its aliases */
  n: string[]
  /** unified codepoints, lowercase, dash-separated (image file name) */
  u: string
  /**
   * picker category: 0 Smileys & People, 2 Animals & Nature, 3 Food & Drink, 4 Travel & Places, 5 Activities,
   * 6 Objects, 7 Symbols, 8 Flags, 9 Custom (workspace + built-in); -1 = not shown in the picker
   */
  c: number
  /** skin tone variations: tone modifier codepoint (1f3fb…1f3ff) → unified */
  s?: Record<string, string>
  /** two-tone variations (multi-person emoji): "2-3" (left tone 2, right tone 3) → unified */
  t?: Record<string, string>
  /** 1 when the emoji takes a different skin tone per person (Slack's multiSkinTone) */
  m?: number
}

export const EMOJI = data as EmojiEntry[]
const byName = new Map<string, EmojiEntry>()
for (const e of EMOJI) for (const n of e.n) byName.set(n, e)

const CUSTOM_SRC: Record<string, string> = {}
const register = (e: EmojiEntry) => {
  // HMR re-runs this module against the cached JSON array, which may already hold the entry.
  if (!byName.has(e.n[0])) EMOJI.push(e)
  byName.set(e.n[0], e)
}

/**
 * Built-in Slack emoji, installed in every workspace (include/emoji/lib_emoji_builtin.hack): :bowtie:, :squirrel:
 * (and its alias :shipit:), :slack:, :thumbsup_all:… plus :white_square: and :black_square:, aliases of standard emoji.
 * Production serves them as workspace emoji, so they sit in the picker's Custom section.
 */
const BUILTIN = builtinData as ({ name: string; file: string; aliasOf?: undefined } | { name: string; aliasOf: string; file?: undefined })[]
export const BUILTIN_EMOJI: EmojiEntry[] = []
BUILTIN.forEach((b, i) => {
  if (b.file) {
    const u = (0xf0200 + i).toString(16)
    CUSTOM_SRC[u] = `/emoji-builtin/${b.file}`
    BUILTIN_EMOJI.push({ n: [b.name], u, c: 9 })
  }
})
for (const b of BUILTIN) {
  if (!b.aliasOf) continue
  const target = BUILTIN_EMOJI.find((e) => e.n[0] === b.aliasOf) ?? byName.get(b.aliasOf)
  if (target) BUILTIN_EMOJI.push({ n: [b.name], u: target.u, c: 9 })
}
for (const e of BUILTIN_EMOJI) register(e)

/**
 * Workspace custom emoji (demo fixture only; images in public/demo/emoji). They join EMOJI with category 9
 * (the picker's Custom section) and a private-use `u` that `emojiSrc` maps to the image.
 */
const CUSTOM: [name: string, file: string][] = [
  ['northstar', 'northstar.svg'],
  ['atlas', 'atlas.svg'],
  ['atlas-launch', 'atlas-launch.svg'],
  ['partystar', 'partystar.svg'],
  ['lgtm', 'lgtm.svg'],
  ['ack', 'ack.svg'],
  ['this', 'this.svg'],
]
const WORKSPACE_EMOJI: EmojiEntry[] = CUSTOM.map(([name, file], i) => {
        const u = (0xf0100 + i).toString(16)
        CUSTOM_SRC[u] = `/demo/emoji/${file}`
        return { n: [name], u, c: 9 }
      })
for (const e of WORKSPACE_EMOJI) register(e)

/** Everything in the picker's Custom section: the workspace's emoji and the built-ins, in Slack's order (by name). */
const collator = new Intl.Collator('en-US', { numeric: true })
export const CUSTOM_EMOJI: EmojiEntry[] = [...WORKSPACE_EMOJI, ...BUILTIN_EMOJI].sort((a, b) => collator.compare(a.n[0], b.n[0]))

/** Slack's skin tone suffixes (`:wave::skin-tone-3:`) → modifier codepoints. */
export const SKIN_TONES: Record<string, { code: string; label: string }> = {
  '2': { code: '1f3fb', label: 'light' },
  '3': { code: '1f3fc', label: 'medium-light' },
  '4': { code: '1f3fd', label: 'medium' },
  '5': { code: '1f3fe', label: 'medium-dark' },
  '6': { code: '1f3ff', label: 'dark' },
}

/** Splits `wave::skin-tone-3` into its base name and tone; two-tone names give tones like "2-4". */
export function parseEmojiName(name: string): { base: string; tone?: string } {
  const clean = name.replace(/^:|:$/g, '')
  const m = clean.match(/^(.*?)::skin-tone-([2-6](?:-[2-6])?)$/)
  return m ? { base: m[1], tone: m[2] } : { base: clean }
}

/** Looks up an emoji by any short name; a skin tone suffix (one tone, or "2-4" for two people) swaps in that image. */
export function findEmoji(name: string): EmojiEntry | undefined {
  const { base, tone } = parseEmojiName(name)
  const e = byName.get(base)
  if (!e || !tone) return e
  const [left, right] = tone.split('-')
  const u = !right || left === right ? e.s?.[SKIN_TONES[left].code] : e.t?.[tone]
  return u ? { ...e, u } : e
}

/** A skin tone's words, as Slack's getPhraseForSkinTone: "medium skin tone", "left light skin tone and right dark skin tone". */
export function skinTonePhrase(tone: string): string {
  const [left, right] = tone.split('-')
  if (!SKIN_TONES[left] || (right && !SKIN_TONES[right])) return ''
  if (!right || right === left) return `${SKIN_TONES[left].label} skin tone`
  return `left ${SKIN_TONES[left].label} skin tone and right ${SKIN_TONES[right].label} skin tone`
}

/** Slack's makePhraseForEmoji (an emoji's aria-label): "star struck emoji", "wave emoji with medium skin tone". */
export function emojiPhrase(name: string): string {
  const { base, tone } = parseEmojiName(name)
  const phrase = `${base.replace(/_|-/g, ' ')} emoji`
  const toneWords = tone ? skinTonePhrase(tone) : ''
  return toneWords ? `${phrase} with ${toneWords}` : phrase
}

/**
 * Image for an emoji. Standard emoji are Apple's 64px images (emoji-datasource-apple, served from /emoji/), sharp up to
 * 32 pt at 2x; custom and built-in Slack emoji are their own files.
 */
export const emojiSrc = (unified: string) => asset(CUSTOM_SRC[unified] ?? `/emoji/${unified}.png`)

interface EmojiProps {
  name: string
  /** points: inline emoji follow the text (about 1.2 em); jumbomoji are 32 */
  size?: number
  className?: string
}

/** An emoji, as iOS draws it in text: square, baseline-aligned, the colon code when there's no such emoji. */
export function Emoji({ name, size = 20, className }: EmojiProps) {
  const e = findEmoji(name)
  const { tone } = parseEmojiName(name)
  const toned = tone && (e?.s || e?.t) ? tone : undefined
  const canonical = (e?.n[0] ?? name) + (toned ? `::skin-tone-${toned}` : '')
  if (!e) return <span className={className}>{`:${name}:`}</span>
  return (
    <img
      aria-label={emojiPhrase(canonical)}
      alt={`:${canonical}:`}
      className={['ios-emoji', className].filter(Boolean).join(' ')}
      draggable={false}
      src={emojiSrc(e.u)}
      style={{ width: size, height: size }}
    />
  )
}
