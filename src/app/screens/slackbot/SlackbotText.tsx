import { Fragment, type ReactNode } from 'react'
import { parseMrkdwn, type Block, type Inline } from '../../../lib/mrkdwn'
import { renderInlines } from '../../text/RichText'
import { Icon } from '../../../icons/Icon'
import { useApp } from '../../store'
import { citationsOf } from './engine'

// A Slackbot answer's text: Slack mrkdwn drawn by the app's rich text (src/app/text, the same classes and styles as a
// message body), plus Slackbot's citations. `<cite://CHANNEL/TS>` becomes a numbered citation pill: the number in the
// body font, colored message_rendering_mention_text on an sk_frosty_blue_solid rounded background (the mention
// background), with a lock after it when the cited channel is private; tapping it opens the message
// (Modules/Integration/TextRendering/Interface/RichText/RichTextCitation+Presentation.swift:17-95). Links to canvases
// and lists open them in the app.

const CITE = /<cite:\/\/([A-Z0-9]+)\/([0-9.]+)>/g
/** private-use stand-ins for a citation while the mrkdwn is parsed (the parser leaves them alone) */
const OPEN = '\uE0E0'
const CLOSE = '\uE0E1'
const MARK = new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g')

interface Ctx {
  cites: { conversationId: string; ts: string }[]
}

/**
 * `text` is what's shown so far (a streaming prefix); `full` the whole answer, so citation numbers don't change while
 * it streams.
 */
export function SlackbotText({ text, full, className }: { text: string; full?: string; className?: string }) {
  const cites = citationsOf(full ?? text)
  const index = new Map(cites.map((c, i) => [`${c.conversationId}/${c.ts}`, i]))
  const marked = text.replace(CITE, (_, c: string, ts: string) => `${OPEN}${index.get(`${c}/${ts}`) ?? 0}${CLOSE}`)
  const ctx: Ctx = { cites }
  const blocks = parseMrkdwn(marked)
  return <div className={['rt', className].filter(Boolean).join(' ')}>{blocks.map((b, i) => <BlockView key={i} block={b} ctx={ctx} />)}</div>
}

function BlockView({ block, ctx }: { block: Block; ctx: Ctx }) {
  switch (block.t) {
    case 'section':
      return <div className="rt-p">{inlines(block.els, ctx)}</div>
    case 'list':
      return (
        <div className={`rt-list rt-list--${block.ordered ? 'ordered' : 'bullet'}`}>
          {block.items.map((item, i) => (
            <div key={i} className="rt-li">
              <span className="rt-li__marker" aria-hidden>
                {block.ordered ? `${i + 1}.` : ''}
              </span>
              {inlines(item, ctx)}
            </div>
          ))}
        </div>
      )
    case 'pre':
      return (
        <div className="rt-pre">
          {block.text.split('\n').map((line, i) => (
            <div key={i} className="rt-pre__line">
              {line || '\u200b'}
            </div>
          ))}
        </div>
      )
    case 'quote':
      return <div className="rt-quote">{inlines(block.els, ctx)}</div>
  }
}

/** Inline runs, as RichText's renderInlines draws them, with citations and in-app links in between. */
function inlines(els: Inline[], ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = []
  let prevPbr = false
  els.forEach((el, i) => {
    // A blank line: the first paragraph break of a run ends the line and adds one empty line (Text+Display.swift:77-86).
    if (el.t === 'pbr') {
      out.push(prevPbr ? <br key={i} /> : <Fragment key={i}><br /><br /></Fragment>)
      prevPbr = true
      return
    }
    prevPbr = false
    if (el.t === 'text' && el.v.includes(OPEN)) {
      let at = 0
      for (const m of el.v.matchAll(MARK)) {
        if (m.index! > at) out.push(<Fragment key={`${i}-${at}`}>{renderInlines([{ ...el, v: el.v.slice(at, m.index) }])}</Fragment>)
        const n = Number(m[1])
        const cite = ctx.cites[n]
        if (cite) out.push(<Citation key={`${i}-c${m.index}`} number={n + 1} conversationId={cite.conversationId} ts={cite.ts} />)
        at = m.index! + m[0].length
      }
      if (at < el.v.length) out.push(<Fragment key={`${i}-${at}`}>{renderInlines([{ ...el, v: el.v.slice(at) }])}</Fragment>)
      return
    }
    if (el.t === 'link') {
      const target = inAppTarget(el.url)
      if (target) {
        out.push(<InAppLink key={i} label={el.label ?? el.url} route={target} bold={!!el.style?.bold} />)
        return
      }
    }
    out.push(<Fragment key={i}>{renderInlines([el])}</Fragment>)
  })
  return out
}

/** A citation pill (RichTextCitation+Presentation.swift:17-95). */
function Citation({ number, conversationId, ts }: { number: number; conversationId: string; ts: string }) {
  const priv = useApp((s) => s.fx.conversations[conversationId]?.type === 'private')
  return (
    <span
      className="sb-cite"
      role="link"
      aria-label={`Source ${number}`}
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        useApp.getState().openMessage(conversationId, ts)
      }}
    >
      {number}
      {/* svgLockFilled at 1.6 × the font's cap height, tinted like the number (:77-85, :104-113) */}
      {priv && <Icon name="lock_filled" size={20} className="sb-cite__lock" />}
    </span>
  )
}

/** Canvas and list links (https://<domain>.slack.com/docs|lists/<team>/<file>) open in the app. */
function inAppTarget(url: string): { screen: string; [k: string]: string } | null {
  const doc = /\.slack\.com\/docs\/[A-Z0-9]+\/(F[A-Z0-9]+)/.exec(url)
  if (doc) return { screen: 'canvas', canvasId: doc[1] }
  const list = /\.slack\.com\/lists\/[A-Z0-9]+\/(F[A-Z0-9]+)/.exec(url)
  if (list) return { screen: 'list', listId: list[1] }
  return null
}

function InAppLink({ label, route, bold }: { label: string; route: { screen: string; [k: string]: string }; bold: boolean }) {
  return (
    <span
      className="rt-link"
      role="link"
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        useApp.getState().push(route)
      }}
    >
      {bold ? <b className="rt-bold">{label}</b> : label}
    </span>
  )
}
