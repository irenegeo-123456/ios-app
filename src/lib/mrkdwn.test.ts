import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TSF } from './vendor/TSF.slim.source.js'
import { isJumbomoji, mrkdwnContent, mrkdwnTokens, parseInline, parseMrkdwn, toApiText, type Inline } from './mrkdwn'

/** Runs without empty style objects, so tables stay readable. */
const clean = (els: Inline[]) => els.map((el) => ('style' in el && el.style && !Object.keys(el.style).length ? (({ style, ...rest }) => rest)(el) : el))
const inline = (s: string) => clean(parseInline(s))
const text = (v: string, style?: Inline extends infer T ? (T extends { t: 'text'; style?: infer S } ? S : never) : never): Inline => (style ? { t: 'text', v, style } : { t: 'text', v })

describe('parseInline', () => {
  it('parses bold, italic, strike and code runs', () => {
    expect(parseInline('Formatting check: *bold text*, _italic text_, ~struck text~ and `inline_code()` done.')).toEqual([
      { t: 'text', v: 'Formatting check: ', style: {} },
      { t: 'text', v: 'bold text', style: { bold: true } },
      { t: 'text', v: ', ', style: {} },
      { t: 'text', v: 'italic text', style: { italic: true } },
      { t: 'text', v: ', ', style: {} },
      { t: 'text', v: 'struck text', style: { strike: true } },
      { t: 'text', v: ' and ', style: {} },
      { t: 'text', v: 'inline_code()', style: { code: true } },
      { t: 'text', v: ' done.', style: {} },
    ])
  })

  it('parses mentions, channels, emoji and links', () => {
    expect(parseInline('thanks <@U1> in <#C2|general> :tada: see https://slack.com/help')).toEqual([
      { t: 'text', v: 'thanks ', style: {} },
      { t: 'user', id: 'U1' },
      { t: 'text', v: ' in ', style: {} },
      { t: 'channel', id: 'C2', name: 'general' },
      { t: 'text', v: ' ', style: {} },
      { t: 'emoji', name: 'tada' },
      { t: 'text', v: ' see ', style: {} },
      { t: 'link', url: 'https://slack.com/help' },
    ])
  })

  it('leaves snake_case words and lone marks alone', () => {
    expect(parseInline('use snake_case_names and 2 * 3')).toEqual([{ t: 'text', v: 'use snake_case_names and 2 * 3', style: {} }])
  })

  // TSF's rules for where a format may start and end (TSF.slim.source.js bold_rx, i_rx, strike_rx, code_rx…).
  it.each<[string, Inline[]]>([
    ['a*b*c', [text('a*b*c')]],
    ['2 * 3 * 4', [text('2 * 3 * 4')]],
    ['(*paren*)', [text('('), text('paren', { bold: true }), text(')')]],
    ['*bold*,', [text('bold', { bold: true }), text(',')]],
    ['*multi\nline*', [text('*multi'), { t: 'br' }, text('line*')]],
    ['_a_b_', [text('a_b', { italic: true })]],
    ['~~double~~', [text('~~double~~')]],
    ['**double**', [text('**double**')]],
    ['日本語*太字*テスト', [text('日本語*太字*テスト')]],
    ['＊太字＊テスト', [text('太字', { bold: true }), text('テスト')]],
    ['`code *not bold*`', [text('code *not bold*', { code: true })]],
    ['*bold `code` bold*', [text('bold ', { bold: true }), text('code', { bold: true, code: true }), text(' bold', { bold: true })]],
  ])('%j', (src, expected) => {
    expect(inline(src)).toEqual(expected)
  })

  it('keeps a link’s formatting: *<url|label>* and <url|*label*> are bold links', () => {
    expect(inline('*<https://x.co|Plan>*')).toEqual([{ t: 'link', url: 'https://x.co', label: 'Plan', style: { bold: true } }])
    expect(inline('<https://x.co|*bold label*>')).toEqual([{ t: 'link', url: 'https://x.co', label: 'bold label', style: { bold: true } }])
  })

  it('links bare URLs like Slack’s server, except in code', () => {
    expect(inline('https://x.com/a_b_c')).toEqual([{ t: 'link', url: 'https://x.com/a_b_c' }])
    expect(inline('see https://x.co/p?a=1&b=2.')).toEqual([text('see '), { t: 'link', url: 'https://x.co/p?a=1&b=2' }, text('.')])
    expect(inline('`https://x.co`')).toEqual([text('https://x.co', { code: true })])
  })

  it('reads text the way the API carries it: raw & < > are text, entities decode', () => {
    expect(inline('foo &amp; bar')).toEqual([text('foo & bar')])
    expect(inline('AT&T')).toEqual([text('AT&T')])
    expect(inline('&lt;tag&gt;')).toEqual([text('<tag>')])
    expect(inline('a < b > c')).toEqual([text('a < b > c')])
    expect(inline('&copy; 2026')).toEqual([text('© 2026')])
  })

  it('reads emoji, skin tones and times', () => {
    expect(inline('12:30:45')).toEqual([text('12:30:45')])
    expect(inline(':+1::skin-tone-3:')).toEqual([{ t: 'emoji', name: '+1::skin-tone-3' }])
    expect(inline(':handshake::skin-tone-2-4:')).toEqual([{ t: 'emoji', name: 'handshake::skin-tone-2-4' }])
    expect(inline('go :tada: go')).toEqual([text('go '), { t: 'emoji', name: 'tada' }, text(' go')])
  })

  it('draws hex colors with a swatch', () => {
    expect(inline('foo #1d9bd1 bar')).toEqual([text('foo '), { t: 'color', value: '#1d9bd1' }, text(' bar')])
    expect(inline('#1d9bd1g')).toEqual([text('#1d9bd1g')])
  })

  it('makes double spaces and tabs hard spaces, as legacy mrkdwn does', () => {
    expect(inline('a  b')).toEqual([text('a \u00A0b')])
    expect(inline('tab\there')).toEqual([text('tab\u00A0\u00A0\u00A0\u00A0here')])
  })

  it('reads commands', () => {
    expect(inline('<!here> <!channel|@channel> <!group>')).toEqual([{ t: 'broadcast', range: 'here' }, text(' '), { t: 'broadcast', range: 'channel' }, text(' '), { t: 'broadcast', range: 'group' }])
    expect(inline('<!subteam^S1|@eng>')).toEqual([{ t: 'usergroup', id: 'S1', label: '@eng' }])
    expect(inline('<!date^1790000000^{date_short}^https://x.co|Sep 21>')).toEqual([{ t: 'date', ts: 1790000000, format: '{date_short}', url: 'https://x.co', fallback: 'Sep 21' }])
    expect(inline('<!date^1790000000|no format>')).toEqual([text('no format')])
    expect(inline('<!foo>')).toEqual([text('<!foo>')])
    expect(inline('<@U1|alex>')).toEqual([{ t: 'user', id: 'U1', label: 'alex' }])
  })

  it('makes a blank line a paragraph break and each newline a line break', () => {
    expect(inline('a\nb')).toEqual([text('a'), { t: 'br' }, text('b')])
    expect(inline('a\n\nb')).toEqual([text('a'), { t: 'pbr' }, text('b')])
    expect(inline('a\n\n\nb')).toEqual([text('a'), { t: 'pbr' }, { t: 'pbr' }, text('b')])
  })

  it('flattens quotes and code blocks onto their own lines', () => {
    expect(inline('*Priya* on *Plan*\n> Moved audit logs')).toEqual([text('Priya', { bold: true }), text(' on '), text('Plan', { bold: true }), { t: 'br' }, text('Moved audit logs')])
    expect(inline('Try:\n```\na\nb\n```')).toEqual([text('Try:'), { t: 'br' }, text('a', { code: true }), { t: 'br' }, text('b', { code: true })])
  })

  it('keeps spaces at either end, so callers can join pieces', () => {
    expect(inline('*Priya Patel* commented on ')).toEqual([text('Priya Patel', { bold: true }), text(' commented on ')])
    expect(inline('  ')).toEqual([text('  ')])
  })

  it('supports the kit’s backslash escapes', () => {
    expect(inline('\\*not bold\\*')).toEqual([text('*not bold*')])
    expect(inline('\\:tada\\:')).toEqual([text(':tada:')])
    expect(inline('\\<b>')).toEqual([text('<b>')])
  })

  it('adds a base style to every run', () => {
    expect(parseInline('a *b*', { italic: true })).toEqual([
      { t: 'text', v: 'a ', style: { italic: true } },
      { t: 'text', v: 'b', style: { italic: true, bold: true } },
    ])
  })
})

describe('parseMrkdwn', () => {
  it('splits paragraphs, lists, code blocks and quotes', () => {
    const blocks = parseMrkdwn('Agenda:\n• One\n• Two\n```\nconst a = 1;\nlog(a);\n```\n> Quoted\nAfter')
    expect(blocks.map((b) => b.t)).toEqual(['section', 'list', 'pre', 'quote', 'section'])
    expect(blocks[2]).toEqual({ t: 'pre', text: 'const a = 1;\nlog(a);' })
  })

  it('detects emoji-only messages', () => {
    expect(isJumbomoji(parseMrkdwn(':tada:'))).toBe(true)
    expect(isJumbomoji(parseMrkdwn(':tada: :tada:'))).toBe(true)
    expect(isJumbomoji(parseMrkdwn(':tada: nice'))).toBe(false)
  })

  const blocks = (s: string) => parseMrkdwn(s).map((b) => (b.t === 'section' || b.t === 'quote' ? { ...b, els: clean(b.els) } : b.t === 'list' ? { ...b, items: b.items.map(clean) } : b))

  it('reads quotes like TSF: >text, blank quote lines and >>> long quotes', () => {
    expect(blocks('>text')).toEqual([{ t: 'quote', els: [text('text')] }])
    expect(blocks('> a\n>\n> b')).toEqual([{ t: 'quote', els: [text('a'), { t: 'pbr' }, text('b')] }])
    expect(blocks('>>> long quote\nwith lines\n\nand more')).toEqual([{ t: 'quote', els: [text('long quote'), { t: 'br' }, text('with lines'), { t: 'pbr' }, text('and more')] }])
    expect(blocks('> ')).toEqual([{ t: 'section', els: [text('>')] }])
    expect(blocks('a\n> q\nb')).toEqual([
      { t: 'section', els: [text('a')] },
      { t: 'quote', els: [text('q')] },
      { t: 'section', els: [text('b')] },
    ])
  })

  it('keeps code blocks as typed', () => {
    expect(blocks('```\n  x\n\n\ty\n```')).toEqual([{ t: 'pre', text: '  x\n\n\ty' }])
    expect(blocks('```\n<@U1> *not bold* :tada:\n```')).toEqual([{ t: 'pre', text: '<@U1> *not bold* :tada:' }])
    expect(blocks('x\n```\ncode\n```\ny')).toEqual([{ t: 'section', els: [text('x')] }, { t: 'pre', text: 'code' }, { t: 'section', els: [text('y')] }])
    expect(blocks('Try ```code``` now')).toEqual([{ t: 'section', els: [text('Try ')] }, { t: 'pre', text: 'code' }, { t: 'section', els: [text(' now')] }])
  })

  it('applies the rich-text newline rule and keeps typed spacing', () => {
    expect(blocks('a\n\n\nb')).toEqual([{ t: 'section', els: [text('a'), { t: 'pbr' }, { t: 'pbr' }, text('b')] }])
    expect(blocks('a  b\tc')).toEqual([{ t: 'section', els: [text('a  b\tc')] }])
    expect(blocks('Intro\n\n• a\n• b')).toEqual([
      { t: 'section', els: [text('Intro'), { t: 'br' }] },
      { t: 'list', ordered: false, items: [[text('a')], [text('b')]] },
    ])
    expect(blocks('> q\n\nafter')).toEqual([{ t: 'quote', els: [text('q')] }, { t: 'section', els: [{ t: 'br' }, text('after')] }])
  })

  it('reads the composer’s list shortcuts', () => {
    expect(blocks('- one\n- two\n1. first\n2. *second*\n* star')).toEqual([
      { t: 'list', ordered: false, items: [[text('one')], [text('two')]] },
      { t: 'list', ordered: true, items: [[text('first')], [text('second', { bold: true })]] },
      { t: 'list', ordered: false, items: [[text('star')]] },
    ])
  })

  it('upper-cases hex colors, like the composer’s color elements', () => {
    expect(blocks('brand #1d9bd1')).toEqual([{ t: 'section', els: [text('brand '), { t: 'color', value: '#1D9BD1' }] }])
  })
})

describe('mrkdwnContent (Slack’s tree)', () => {
  it('is tokensToMessageContent over TSF, as in Slack’s Mrkdwn component', () => {
    expect(mrkdwnContent('*hey _you_ there*')).toEqual([{ type: 'bold', contents: [{ text: 'hey ' }, { type: 'italic', contents: [{ text: 'you' }] }, { text: ' there' }] }])
    expect(mrkdwnTokens(':smile: :cry:')).toEqual(['<JUMBOMOJI:COLONS :smile:>', ' ', '<JUMBOMOJI:COLONS :cry:>'])
    expect(mrkdwnTokens(':smile: :cry:', { jumbomoji: false })).toEqual(['<EMOJI:COLONS :smile:>', ' ', '<EMOJI:COLONS :cry:>'])
    expect(mrkdwnContent('x &lt; y')).toEqual([{ text: 'x &lt; y' }])
  })

  it('splits out search highlight markers', () => {
    expect(mrkdwnContent('hello \uE000there\uE001')).toEqual([{ text: 'hello ' }, { type: 'highlight', contents: [{ text: 'there' }] }])
  })
})

describe('toApiText', () => {
  it('escapes raw text and keeps control sequences and entities', () => {
    expect(toApiText('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d')
    expect(toApiText('<@U1> <#C1|x> <!here> <https://x.co?a=1&b=2|A & B> <mailto:a@b.co>')).toBe('<@U1> <#C1|x> <!here> <https://x.co?a=1&amp;b=2|A &amp; B> <mailto:a@b.co>')
    expect(toApiText('&amp; &lt; &#39; &nosuch;')).toBe('&amp; &lt; &#39; &amp;nosuch;')
    expect(toApiText('> quote')).toBe('&gt; quote')
    expect(toApiText('go to https://x.co, or `https://y.co`')).toBe('go to <https://x.co>, or `https://y.co`')
  })
})

// The vendored tokenizer is production's: when the production bundle is on this machine, prove it token for token.
const VENDORS = ['reference/vendor-raw', '../../../reference/vendor-raw']
  .flatMap((dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^gantry-v2-vendors\.[0-9a-f]+\.min\.js$/.test(f)).map((f) => `${dir}/${f}`) : []))
  .find(Boolean)
describe.skipIf(!VENDORS)('TSF matches the production bundle', () => {
  it('has the same rules and produces the same tokens', () => {
    const bundle = fs.readFileSync(VENDORS!, 'utf8')
    const start = bundle.indexOf('{"j+eK"(_,A){') + '{"j+eK"(_,A){'.length
    const exportsObj: { TSF?: typeof TSF } = {}
    new Function('_', 'A', bundle.slice(start, bundle.indexOf('},LvCQ(_){')))({}, exportsObj)
    const prod = exportsObj.TSF!
    const rules = (T: Record<string, unknown>) =>
      // (placeholder_cnt, flags and mode are TSF's per-call state, not rules; placeholder_base is shuffled with
      // Math.random() every time TSF loads, so only its characters are comparable)
      Object.fromEntries(
        Object.entries(T)
          .filter(([k, v]) => typeof v !== 'function' && !['placeholder_cnt', 'flags', 'mode'].includes(k))
          .map(([k, v]) => [k, k === 'placeholder_base' ? [...String(v)].sort().join('') : (v as { r?: RegExp })?.r ? String((v as { r: RegExp }).r) : v]),
      )
    expect(rules(prod as unknown as Record<string, unknown>)).toEqual(rules(TSF as unknown as Record<string, unknown>))
    for (const s of ['*one _two* three_', '> q\n>>> long', '```a\nb``` `c`', '<https://x|y> :smile: #abcdef', 'a\n\n\nb  c\td', '＊全角＊ ｀コード｀'])
      for (const mode of ['NORMAL', 'NOMRKDWN', 'EDIT', 'GROWL', 'CLEAN'] as const)
        expect(prod.getTokensArray(s, mode, { jumbomoji: true, allow_intra_word_formatting: true })).toEqual(TSF.getTokensArray(s, mode, { jumbomoji: true, allow_intra_word_formatting: true }))
  })
})
