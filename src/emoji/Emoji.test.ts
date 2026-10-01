import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import builtin from './emoji-builtin.json'
import keywords from './emoji-keywords.json'
import { BUILTIN_EMOJI, CUSTOM_EMOJI, EMOJI, emojiPhrase, emojiSrc, findEmoji, parseEmojiName, skinTonePhrase } from './Emoji'

const standard = EMOJI.filter((e) => e.c !== 9)

describe('standard emoji data (Slack’s standard-emoji-data-16_0)', () => {
  it('has every standard emoji once, with Slack’s picker categories', () => {
    expect(standard).toHaveLength(1908)
    expect(new Set(standard.map((e) => e.n[0])).size).toBe(1908)
    expect(standard.filter((e) => e.c >= 0)).toHaveLength(1851)
    // picker order: categories in Slack's order, never interleaved
    const cats = standard.filter((e) => e.c >= 0).map((e) => e.c)
    expect([...new Set(cats)]).toEqual([0, 2, 3, 4, 5, 6, 7, 8])
    expect(cats).toEqual([...cats].sort((a, b) => a - b))
  })

  it('hides the gender-neutral variants Slack doesn’t list and the skin tone swatches', () => {
    for (const n of ['runner', 'shrug', 'face_palm', 'family', 'skin-tone-2']) expect(findEmoji(n)?.c).toBe(-1)
    for (const n of ['man-running', 'woman-shrugging', 'man-woman-boy']) expect(findEmoji(n)!.c).toBeGreaterThanOrEqual(0)
  })

  it('leaves out the symbols Apple has no image for', () => {
    for (const n of ['female_sign', 'male_sign', 'medical_symbol']) expect(findEmoji(n)).toBeUndefined()
  })

  it('resolves aliases to the canonical emoji', () => {
    expect(findEmoji('thumbsup')!.n[0]).toBe('+1')
    expect(findEmoji('satisfied')!.n[0]).toBe('laughing')
    expect(findEmoji('flag-us')!.n[0]).toBe('us')
    expect(findEmoji('+1')!.n).toEqual(['+1', 'thumbsup'])
  })

  it('applies skin tones, including two-tone multi-person emoji', () => {
    expect(findEmoji('wave::skin-tone-3')!.u).toBe('1f44b-1f3fc')
    expect(findEmoji('thumbsup::skin-tone-6')!.u).toBe('1f44d-1f3ff')
    expect(findEmoji('handshake::skin-tone-2')!.u).toBe('1f91d-1f3fb')
    expect(findEmoji('handshake::skin-tone-2-4')!.u).toBe('1faf1-1f3fb-200d-1faf2-1f3fd')
    expect(findEmoji('handshake::skin-tone-3-3')!.u).toBe('1f91d-1f3fc')
    expect(findEmoji('woman-heart-man::skin-tone-5')!.u).toBe('1f469-1f3fe-200d-2764-fe0f-200d-1f468-1f3fe')
    expect(findEmoji('handshake')!.m).toBe(1)
    expect(parseEmojiName(':handshake::skin-tone-2-4:')).toEqual({ base: 'handshake', tone: '2-4' })
  })

  it('has an image for every emoji and skin tone at every size the kit serves', () => {
    const missing: string[] = []
    for (const e of standard)
      for (const u of [e.u, ...Object.values(e.s ?? {}), ...Object.values(e.t ?? {})])
        for (const dir of ['node_modules/emoji-datasource-apple/img/apple/64']) if (!fs.existsSync(path.join(dir, `${u}.png`))) missing.push(`${dir}/${u}`)
    expect(missing).toEqual([])
  })

  it('uses Slack’s keyword map, keyed by canonical name', () => {
    const kw = keywords as Record<string, string[]>
    expect(kw['100']).toEqual(['100', 'a+', 'agree', 'clearly', 'definitely', 'faithful', 'fleek', 'full', 'hundred', 'keep', 'perfect', 'point', 'score', 'true', 'truth', 'yup'])
    expect(kw.splatter).toContain('paint')
    expect(Object.keys(kw).every((name) => findEmoji(name))).toBe(true)
  })
})

describe('built-in Slack emoji (lib_emoji_builtin.hack)', () => {
  it('ships the built-ins and their aliases', () => {
    expect(builtin.map((b) => b.name)).toEqual(['bowtie', 'squirrel', 'glitch_crab', 'piggy', 'cubimal_chick', 'dusty_stick', 'slack', 'pride', 'thumbsup_all', 'slack_call', 'shipit', 'white_square', 'black_square'])
    expect(BUILTIN_EMOJI).toHaveLength(13)
    for (const b of builtin) if ('file' in b && b.file) expect(fs.statSync(path.join('public/emoji-builtin', b.file)).size).toBeGreaterThan(1000)
  })

  it('maps :shipit: to the squirrel and white/black_square to standard emoji', () => {
    expect(emojiSrc(findEmoji('shipit')!.u)).toBe('/emoji-builtin/squirrel.png')
    expect(emojiSrc(findEmoji('bowtie')!.u)).toBe('/emoji-builtin/bowtie.png')
    expect(emojiSrc(findEmoji('thumbsup_all')!.u)).toBe('/emoji-builtin/thumbsup_all.gif')
    expect(findEmoji('white_square')!.u).toBe(findEmoji('white_large_square')!.u)
  })

  it('lists them in the Custom section with the workspace’s emoji, sorted by name', () => {
    const names = CUSTOM_EMOJI.map((e) => e.n[0])
    expect(names).toEqual([...names].sort(new Intl.Collator('en-US', { numeric: true }).compare))
    expect(names).toContain('shipit')
    expect(names).toContain('partystar')
    expect(CUSTOM_EMOJI.every((e) => e.c === 9)).toBe(true)
  })
})

describe('emoji phrases (makePhraseForEmoji, getPhraseForSkinTone)', () => {
  it.each([
    ['tada', 'tada emoji'],
    ['star-struck', 'star struck emoji'],
    ['wave::skin-tone-4', 'wave emoji with medium skin tone'],
    ['handshake::skin-tone-2-6', 'handshake emoji with left light skin tone and right dark skin tone'],
    ['handshake::skin-tone-3-3', 'handshake emoji with medium-light skin tone'],
  ])('%s → %s', (name, phrase) => {
    expect(emojiPhrase(name)).toBe(phrase)
  })
  it('knows every tone', () => {
    expect(['2', '3', '4', '5', '6'].map(skinTonePhrase)).toEqual(['light skin tone', 'medium-light skin tone', 'medium skin tone', 'medium-dark skin tone', 'dark skin tone'])
  })
})

// When Slack's production bundle is on this machine, the committed data must match what the generator builds from it.
const BUNDLE = ['reference/vendor-raw/shared.min.js', '../../../reference/vendor-raw/shared.min.js'].find((f) => fs.existsSync(f))
describe.skipIf(!BUNDLE)('emoji data matches the production bundle', () => {
  it('lists the picker categories in production’s order', () => {
    const src = fs.readFileSync(BUNDLE!, 'utf8')
    const start = src.indexOf(`JSON.parse('[{"name":"Smileys & People"`) + "JSON.parse('".length
    const cats = JSON.parse(src.slice(start, src.indexOf("')", start)).replace(/\\'/g, "'")) as { name: string; emoji_names: string[] }[]
    const shown = cats.filter((c) => c.name !== 'Skin Tones').flatMap((c) => c.emoji_names).filter((n) => findEmoji(n))
    expect(standard.filter((e) => e.c >= 0).map((e) => e.n[0])).toEqual(shown)
  })
})
