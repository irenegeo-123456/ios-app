import { Fragment, type ReactNode } from 'react'
import { RichText } from '../app/text/RichText'
import { Emoji, findEmoji } from '../emoji/Emoji'
import { parseInline } from '../lib/mrkdwn'
import type { TextObject } from './types'

// Block Kit text objects as iOS draws them (.../Elements/TextBlockElement+BKBlockConvertible.swift:59-78): `mrkdwn` is
// parsed like message text (TSF: bold, italic, strike, code, pre, quote, links, mentions, dates, emoji) and styled by
// the same Text+Display rules (src/app/text); `plain_text` stays plain, with `:shortcodes:` as emoji unless
// `emoji: false`. The font and color come from the container (spec §0 › Text defaults: Lato 17, content_primary).

/**
 * TSF has no list syntax: in Block Kit mrkdwn "• item" lines are text. The kit's parser treats them as its composer
 * list shortcut, so the space after a leading marker becomes a no-break space (it looks the same and keeps them text).
 */
const keepMarkersText = (s: string) => s.replace(/^([ \t]*)([•\-*]|\d+\.) /gm, '$1$2 ')

const EMOJI_RX = /:([a-z0-9_+'-]+(?:::skin-tone-[2-6])?):/g

/** Plain text: line breaks kept, `:shortcodes:` drawn as emoji (unless `emoji` is false). */
export function PlainText({ text, emoji = true }: { text: string; emoji?: boolean }) {
  if (!emoji || !text.includes(':')) return <>{text}</>
  const out: ReactNode[] = []
  let at = 0
  for (const m of text.matchAll(EMOJI_RX)) {
    if (!findEmoji(m[1])) continue
    if (m.index > at) out.push(text.slice(at, m.index))
    const custom = findEmoji(m[1])?.c === 9
    out.push(<Emoji key={m.index} name={m[1]} size={17} className={custom ? 'rt-emoji rt-emoji--custom' : 'rt-emoji'} />)
    at = m.index + m[0].length
  }
  if (at < text.length) out.push(text.slice(at))
  return <>{out.map((n, i) => (typeof n === 'string' ? <Fragment key={`t${i}`}>{n}</Fragment> : n))}</>
}

/** A text object: a block of rich text for mrkdwn, a run of plain text for plain_text. */
export function BKText({ text, className }: { text: TextObject | string | undefined; className?: string }) {
  if (!text) return null
  const t: TextObject = typeof text === 'string' ? { type: 'mrkdwn', text } : text
  if (t.type === 'plain_text')
    return (
      <div className={['bk-plain', className].filter(Boolean).join(' ')}>
        <PlainText text={t.text ?? ''} emoji={t.emoji !== false} />
      </div>
    )
  return <RichText text={keepMarkersText(t.text ?? '')} jumbomoji={false} className={className} />
}

/**
 * One run of a text object, inline (button titles, options, labels): only its text and emoji, like SKButton keeps
 * them (SKButton+PresentationObject.swift:131,139-152); mrkdwn formatting is dropped, not drawn.
 */
export function BKInline({ text }: { text: TextObject | string | undefined }) {
  if (!text) return null
  const t: TextObject = typeof text === 'string' ? { type: 'plain_text', text } : text
  if (t.type !== 'mrkdwn') return <PlainText text={t.text ?? ''} emoji={t.emoji !== false} />
  const flat = parseInline(t.text ?? '')
    .map((el) => (el.t === 'text' ? el.v : el.t === 'emoji' ? `:${el.name}:` : el.t === 'link' ? (el.label ?? el.url) : el.t === 'br' || el.t === 'pbr' ? ' ' : ''))
    .join('')
  return <PlainText text={flat} />
}
