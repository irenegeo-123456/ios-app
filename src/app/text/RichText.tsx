import { Fragment, type ReactNode } from 'react'
import { parseInline, parseMrkdwn, type Block, type Inline } from '../../lib/mrkdwn'
import { formatSlackDate } from '../../lib/slackDate'
import { Emoji, findEmoji } from '../../emoji/Emoji'
import { Icon } from '../../icons/Icon'
import { useApp } from '../store'
import './text.css'

// Slack mrkdwn as the iOS app draws a message body (TSF-parsed, like the app: Modules/Data/TSFKit), styled the way
// Modules/UIInfra/SlackKit/Implementation/Extensions/Text+Display.swift styles rich text: paragraphs, lists, code blocks,
// quotes, and inline bold / italic / strike / code, links, @mentions, #channels, emoji and jumbomoji. Styles live in
// text.css; values and their iOS sources are in reference/ios/specs/messages.md §3. Text takes its container's font and
// color (a message body is Lato 17 content_primary, MessageViewPresentationObjectFactory.swift:58-59 [Sept]; June
// sk_primary_foreground), except code blocks, always content_primary (Text+Display.swift:145-147 [Sept]). Sept's new
// Text+Display blocks don't reach mrkdwn: TSF has no header or divider syntax (TSF2NativeTokenizer.swift:105-123), so
// headings (`.header`, Text.Consts.headerFont(forLevel:), :49-62, :224-237) only come as Block Kit header blocks and
// rich_text_header elements, drawn by src/blocks (blocks.css .bk-header) — spec messages.md §3.1.

interface Props {
  text: string
  /** big emoji when the message is only emoji (MessageKit's jumbomoji, TextBlock.swift:257-268) */
  jumbomoji?: boolean
  /** append "  (edited)" (message_edited_label, yaml:12093; TextMapper.swift:200-217) */
  edited?: boolean
  className?: string
}

export function RichText({ text, jumbomoji = true, edited, className }: Props) {
  const blocks = parseMrkdwn(text)
  // Jumbomoji: exactly one paragraph of emoji and whitespace, any number of emoji; never on an edited message, whose
  // "(edited)" span breaks the rule (spec §3.9).
  const jumbo = jumbomoji && !edited && isOnlyEmoji(blocks)
  const last = blocks[blocks.length - 1]
  // "(edited)" joins the last paragraph; after a list, quote or code block it gets a line of its own (Text+Adding.swift:48-69).
  const editedInline = edited && last?.t === 'section'
  return (
    <div className={['rt', jumbo && 'rt--jumbo', className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} jumbo={jumbo} edited={editedInline && i === blocks.length - 1} />
      ))}
      {edited && !editedInline && (
        <div className="rt-p">
          <EditedLabel />
        </div>
      )}
    </div>
  )
}

/** One line of inline mrkdwn (previews, Block Kit text, names with emoji). */
export function InlineText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderInlines(parseInline(text))}</span>
}

/** "  (edited)": Lato Regular 15 (`.smallBody`), content_tertiary (TextMapper.swift:36-39 [Sept]; June sk_foreground_high_solid). */
const EditedLabel = () => <span className="rt-edited">{'  (edited)'}</span>

function isOnlyEmoji(blocks: Block[]): boolean {
  if (blocks.length !== 1 || blocks[0].t !== 'section') return false
  const els = blocks[0].els
  return els.some((e) => e.t === 'emoji') && els.every((e) => e.t === 'emoji' || (e.t === 'text' && !e.v.trim() && !e.style?.code))
}

function BlockView({ block, jumbo, edited }: { block: Block; jumbo: boolean; edited?: boolean }) {
  switch (block.t) {
    case 'section':
      return (
        <div className="rt-p">
          {renderInlines(block.els, jumbo)}
          {edited && <EditedLabel />}
        </div>
      )
    case 'list':
      // Lists: marker at level × 29, text at level × 29 + 28 (RichTextTheming.swift:72-104); bullets are the
      // presenceOnline glyph (RichTextListPrefixGenerating.swift:26-29), numbers "1." (OrderedListPrefixGenerator.swift:11-26).
      return (
        <div className={`rt-list rt-list--${block.ordered ? 'ordered' : 'bullet'}`}>
          {block.items.map((item, i) => (
            <div key={i} className="rt-li">
              <span className="rt-li__marker" aria-hidden>
                {block.ordered ? `${i + 1}.` : ''}
              </span>
              {renderInlines(item)}
            </div>
          ))}
        </div>
      )
    case 'pre':
      return <CodeBlock text={block.text} />
    case 'quote':
      return <div className="rt-quote">{renderInlines(block.els)}</div>
  }
}

/** A ``` block: one paragraph per line, formatting dropped except links (Text+Display.swift:1976-1987). */
function CodeBlock({ text }: { text: string }) {
  return (
    <div className="rt-pre">
      {text.split('\n').map((line, i) => (
        <div key={i} className="rt-pre__line">
          {line ? linkify(line) : '\u200b'}
        </div>
      ))}
    </div>
  )
}

const PRE_LINK_RX = /<((?:https?|mailto):[^|>\s]+)(?:\|([^>]*))?>|(https?:\/\/[^\s<>]+[^\s<>.,:;!?)"'])/g

function linkify(line: string): ReactNode[] {
  const out: ReactNode[] = []
  let at = 0
  for (const m of line.matchAll(PRE_LINK_RX)) {
    if (m.index > at) out.push(line.slice(at, m.index))
    const url = m[1] ?? m[3]
    out.push(<LinkRun key={m.index} url={url} label={m[2] || url} />)
    at = m.index + m[0].length
  }
  if (at < line.length) out.push(line.slice(at))
  return out
}

export function renderInlines(els: Inline[], jumbo = false): ReactNode[] {
  let prevPbr = false
  return els.map((el, i) => {
    // A blank line: the first paragraph break of a run ends the line and adds one empty line; each one after it adds
    // another (TSF turns n ≥ 2 newlines into n − 1 breaks; Text+Display.swift:93-102).
    if (el.t === 'pbr') {
      const node = prevPbr ? <br key={i} /> : <Fragment key={i}><br /><br /></Fragment>
      prevPbr = true
      return node
    }
    prevPbr = false
    return <InlineView key={i} el={el} jumbo={jumbo} />
  })
}

function styled(node: ReactNode, style?: { bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean }): ReactNode {
  if (!style) return node
  let n = node
  if (style.code) n = <code className="rt-code">{n}</code>
  if (style.strike) n = <s className="rt-strike">{n}</s>
  if (style.italic) n = <i className="rt-italic">{n}</i>
  if (style.bold) n = <b className="rt-bold">{n}</b>
  return n
}

function InlineView({ el, jumbo }: { el: Inline; jumbo: boolean }) {
  switch (el.t) {
    case 'text':
      return <>{styled(el.v, el.style)}</>
    case 'br':
      return <br />
    case 'tab':
      return <span className="rt-tab">{'\t'}</span>
    case 'emoji': {
      const custom = findEmoji(el.name)?.c === 9
      const cls = ['rt-emoji', custom && 'rt-emoji--custom', jumbo && 'rt-emoji--jumbo'].filter(Boolean).join(' ')
      return <Emoji name={el.name} size={jumbo ? 34 : 17} className={cls} />
    }
    case 'user':
      return <UserMention id={el.id} label={el.label} />
    case 'channel':
      return <ChannelMention id={el.id} name={el.name} />
    case 'usergroup':
      return <GroupMention id={el.id} label={el.label} />
    case 'broadcast':
      // @here, @channel, @everyone: highlighted like a mention of you (Text+Display.swift:621-644)
      return <span className="rt-mention rt-mention--me">@{el.range}</span>
    case 'link':
      return <LinkRun url={el.url} label={styled(el.label ?? el.url.replace(/^mailto:/, ''), el.style)} />
    case 'date':
      return <span className="rt-date">{el.fallback && !el.format ? el.fallback : formatSlackDate(el.ts, el.format)}</span>
    case 'color':
      return (
        <span className="rt-color">
          {`${el.value} `}
          <i style={{ background: el.value }} />
        </span>
      )
    default:
      return <Fragment />
  }
}

/** A link: content_highlight_1, no underline; a radius-3 surface_primary rect while pressed (TextDrawingView.swift:21-31). */
function LinkRun({ url, label }: { url: string; label: ReactNode }) {
  return (
    <span
      className="rt-link"
      role="link"
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        window.open(url, '_blank', 'noopener')
      }}
    >
      {label}
    </span>
  )
}

function UserMention({ id, label }: { id: string; label?: string }) {
  const user = useApp((s) => s.fx.users[id])
  const me = useApp((s) => s.fx.me)
  const push = useApp((s) => s.push)
  if (!user && !label) {
    // An unresolved mention: a loading pill 20 no-break spaces wide (Text+Display.swift:1228-1252)
    return <span className="rt-mention-loading">{' '.repeat(20)}</span>
  }
  const name = user ? user.name || user.realName : label!.replace(/^@/, '')
  return (
    <span
      className={`rt-mention${id === me ? ' rt-mention--me' : ''}`}
      onClick={(e) => {
        // Tap → the person's profile (SKLabel.swift:309-324)
        e.stopPropagation()
        if (user) push({ screen: 'profile', userId: id })
      }}
    >
      @{name}
    </span>
  )
}

function GroupMention({ id, label }: { id: string; label?: string }) {
  const group = useApp((s) => s.fx.userGroups?.find((g) => g.id === id))
  const me = useApp((s) => s.fx.me)
  // A user group is yellow when you're in it, blue otherwise (Text+Display.swift:591-619)
  const mine = !!group?.memberIds.includes(me)
  const text = group ? `@${group.handle}` : label ? (label.startsWith('@') ? label : `@${label}`) : '[group unavailable]'
  return <span className={`rt-mention${mine ? ' rt-mention--me' : ''}${!group && !label ? ' rt-mention--unavailable' : ''}`}>{text}</span>
}

function ChannelMention({ id, name }: { id: string; name?: string }) {
  const conv = useApp((s) => s.fx.conversations[id])
  const open = useApp((s) => s.openConversation)
  const isPrivate = conv?.type === 'private'
  return (
    <span
      className="rt-mention rt-channel"
      onClick={(e) => {
        e.stopPropagation()
        if (conv) open(id)
      }}
    >
      {/* private channels: svgLockFilled at the font's ascender, no "#" (Text+Display.swift:1912-1968) */}
      {isPrivate ? <Icon name="lock_filled" size={17} className="rt-channel__icon" /> : '#'}
      {conv?.name ?? name ?? id}
    </span>
  )
}
