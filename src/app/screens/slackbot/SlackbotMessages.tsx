import { useMemo, type ReactNode } from 'react'
import { useApp } from '../../store'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { Icon } from '../../../icons/Icon'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKButton } from '../../../slackkit/SKButton'
import { SKIconButton } from '../../../slackkit/SKIconButton'
import { BlockSurface } from '../../../blocks'
import { displayName, threadReplyTime } from '../../../messagekit/format'
import { mkTimestamp } from '../../../messagekit/MKMessagePreview'
import type { BlockKitBlock } from '../../../data/types'
import { SlackbotAvatar } from './SlackbotAvatar'
import { SlackbotText } from './SlackbotText'
import { citationsOf, type Step } from './engine'
import { findMessage } from '../../sheets/shared'
import { HANGBAR_UPDATES_V2, SLACKBOT_DM } from './constants'
import { useSlackbot, type PlanState, type SbChat, type SbMessage } from './state'

// A Slackbot thread (spec search-slackbot-huddles.md §2.1, §2.5): the prompts and Slackbot's replies as MessageKit message
// rows (messages.md §1.1-§1.3: 8 / 16 insets, a 36 pt avatar 12 pt from the column, the Lato Black 17 name and Lato 12
// time 4 pt apart, the body 4 pt below). A reply is its Block Kit blocks: the "thinking / tools" timeline line (the first
// block, 4 pt below the name), a plan card for agentic answers, the text (12 pt below the block above it), then the AI
// footer bar once it's finished (8 pt below, MKMessageContentView.swift:17, 282-294).

export function SlackbotThread({ chat }: { chat: SbChat }) {
  const lastBot = [...chat.messages].reverse().find((m) => m.role === 'bot')
  return (
    <div className="sb-thread" data-chat={chat.id}>
      {chat.messages.map((m, i) =>
        m.role === 'user' ? <UserRow key={m.ts} message={m} root={i === 0} /> : <BotRow key={m.ts} chatId={chat.id} message={m} root={i === 0} last={m === lastBot} />,
      )}
    </div>
  )
}

/** The thread root takes the absolute format ("Today at 10:42 AM"), replies the thread-reply one (messages.md §1.2). */
const timeFor = (ts: string, root: boolean) => (root ? mkTimestamp(ts, 'absolute') : threadReplyTime(ts))

function Row({ avatar, name, time, children }: { avatar: ReactNode; name: string; time: string; children: ReactNode }) {
  return (
    <div className="sb-msg" role="article">
      <div className="sb-msg__avatar">{avatar}</div>
      <div className="sb-msg__column">
        <div className="sb-msg__header">
          <span className="sb-msg__name">{name}</span>
          <span className="sb-msg__time">{time}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function UserRow({ message, root }: { message: SbMessage; root: boolean }) {
  const me = useApp((s) => s.fx.users[s.fx.me])
  return (
    <Row avatar={<SKMemberAvatar src={me?.avatar} name={me?.realName ?? 'You'} size="large" />} name={displayName(me)} time={timeFor(message.ts, root)}>
      <SlackbotText text={message.text} className="sb-msg__text" />
    </Row>
  )
}

function BotRow({ chatId, message: m, root, last }: { chatId: string; message: SbMessage; root: boolean; last: boolean }) {
  const shown = m.shown === undefined ? m.text : m.text.slice(0, m.shown)
  const working = m.phase === 'thinking' || m.phase === 'streaming'
  const cites = useMemo(() => citationsOf(m.text), [m.text])
  // The plan card stands in for the tool timeline on agentic answers.
  const timeline = !m.plan && m.timeline ? <TimelineLine message={m} /> : null
  return (
    <Row avatar={<SlackbotAvatar size="large" />} name="Slackbot" time={timeFor(m.ts, root)}>
      <div className="sb-blocks">
        {timeline}
        {m.plan && <PlanCard plan={m.plan} ts={m.ts} />}
        {shown && <SlackbotText text={shown} full={m.text} className={`sb-msg__text${timeline || m.plan ? ' is-after-block' : ''}`} />}
      </div>
      {!working && <FooterBar chatId={chatId} message={m} sources={cites.length > 0} disclaimer={last} />}
    </Row>
  )
}

// ------------------------------------------------------------------------------------------------ timeline line

/** BKTimelineBlockView.swift:160-303 → BKTimelineHeaderView.swift:25-77 → AiLabel.swift:24-212. */
function TimelineLine({ message: m }: { message: SbMessage }) {
  const tl = m.timeline!
  const running = !tl.done && (m.phase === 'thinking' || m.phase === 'streaming')
  // done: the server summary; else, with several tools, "Used %d tools" (used_x_tools, yaml:22871); else the latest step
  const head: Step | undefined = tl.done ? (tl.summary ?? (tl.steps.length > 1 ? { icon: tl.steps[0].icon, text: `Used ${tl.steps.length} tools` } : tl.steps.at(-1))) : tl.steps.at(-1)
  const presentSheet = useApp((s) => s.presentSheet)
  if (!head) return null
  const icon = toolIcon(tl.done ? (tl.steps[0]?.icon ?? head.icon) : head.icon)
  return (
    <div
      className={`sb-timeline${running ? ' is-running' : ''}`}
      role="button"
      aria-label="View tool timeline"
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        // presenting a sheet resigns the first responder
        dismissKeyboard()
        presentSheet('slackbot-timeline', { steps: tl.steps, running })
      }}
    >
      <span className="sb-timeline__label">
        {icon && <Icon name={icon} size={20} className="sb-timeline__icon" />}
        <span className="sb-timeline__text">{head.text}</span>
      </span>
      <Icon name="caret_right" size={20} className="sb-timeline__caret" />
    </div>
  )
}

/** The timeline's tool icon map (BKTimelineBlockView.swift:255-295); anything else has no icon. */
export function toolIcon(name?: string): string | undefined {
  switch (name) {
    case 'ai-sparkle':
      return 'ai_sparkle'
    case 'calendar':
    case 'book':
    case 'mentions':
    case 'user':
    case 'search':
    case 'settings':
    case 'clock':
    case 'lists':
    case 'email':
      return name
    case 'ai-file-summary':
      return 'ai_file_summary'
    case 'canvas-content':
      return 'canvas_content'
    case 'error':
    case 'warning':
      return 'warning'
    case 'sf-cloud':
      return 'sf_cloud_filled'
    case 'agentforce-filled':
      return 'agentforce_filled'
    case 'search-files':
      return 'search_files'
    // new in September 2026 (BKTimelineBlockView.swift:290-291; AiToolTimelinePresenter.swift:134-135)
    case 'ai-workflow':
      return 'ai_workflow'
    default:
      return undefined
  }
}

// ------------------------------------------------------------------------------------------------ plan card

/** Agentic answers: a Block Kit `plan` block (BKPlanBlockView), drawn by the Block Kit renderer (src/blocks). */
function PlanCard({ plan, ts }: { plan: PlanState; ts: string }) {
  const blocks = useMemo(
    (): BlockKitBlock[] => [
      {
        type: 'plan',
        block_id: 'sb_plan',
        title: plan.title,
        tasks: plan.tasks.map((t, i) => ({
          task_id: `task_${i}`,
          title: t.title,
          status: t.status,
          ...(t.details ? { details: { type: 'rich_text', text: t.details } } : {}),
        })),
      },
    ],
    [plan],
  )
  return (
    <div className="sb-plan">
      <BlockSurface blocks={blocks} surface="message" conversationId={SLACKBOT_DM} ts={ts} />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ footer bar

/**
 * MessageFooterActionBar (Sept 2026: MessageFooterActionBar.swift:26-40, 114-127, 160-304; AiResultFooterMapper.swift:
 * 16-51): a 40 pt row of 40 pt SKIconButtons — Share (svgShareMessage, "Share Message"; June's Copy is gone), 👍, 👎 —
 * in contentSecondary on a clear circle, and a "Sources" SKButton .small on baseTertiary at the right. With
 * ios_hangbar_updates_v2 on, the last answer gets a 1 px outlineTertiary line, 12 pt, "Slackbot is AI and can make
 * mistakes." in .caption contentTertiary and 4 pt *above* the row; off (the default) there's no footer disclaimer: it's
 * the landing page's context bar (SlackbotScreen). Measured (June) in MKMessageContentViewSnapshotTests/
 * testMessageWithContentAndMessageFooterActionBar@3x.png: icons at x 11–28 / 52–67 / 93–108 of the column.
 */
function FooterBar({ chatId, message, sources, disclaimer }: { chatId: string; message: SbMessage; sources: boolean; disclaimer: boolean }) {
  const setFeedback = useSlackbot((s) => s.setFeedback)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  // Share opens Forward Message (MessageActionHandlerService.swift:364-367); the demo's Slackbot answers aren't messages
  // in the workspace's store, so there's nothing for that sheet to forward unless a prototype put the thread there.
  const share = () => {
    if (findMessage(useApp.getState(), SLACKBOT_DM, message.ts, chatId)) presentSheet('forward', { conversationId: SLACKBOT_DM, ts: message.ts, threadTs: chatId })
    else showToast('Not in the prototype')
  }
  const color = 'var(--dt_color_content_secondary)'
  return (
    <div className="sb-footer">
      {HANGBAR_UPDATES_V2 && disclaimer && (
        <>
          <div className="sb-footer__divider" />
          {/* slackbot_is_ai_and_can_make_mistakes (yaml:20145) */}
          <div className="sb-footer__disclaimer">Slackbot is AI and can make mistakes.</div>
        </>
      )}
      <div className="sb-footer__row">
        <div className="sb-footer__buttons">
          <SKIconButton icon="share_message" iconColor={color} backdrop={{ unselected: 'transparent', selected: 'transparent' }} size="small" accessibilityLabel="Share Message" onClick={share} />
          <SKIconButton
            icon="thumbs_up"
            iconColor={color}
            backdrop={{ unselected: 'transparent', selected: 'transparent' }}
            size="small"
            accessibilityLabel="Good response"
            onClick={() => setFeedback(chatId, message.ts, 'good')}
          />
          <SKIconButton
            icon="thumbs_down"
            iconColor={color}
            backdrop={{ unselected: 'transparent', selected: 'transparent' }}
            size="small"
            accessibilityLabel="Bad response"
            onClick={() => setFeedback(chatId, message.ts, 'bad')}
          />
        </div>
        {sources && (
          <SKButton
            title="Sources"
            buttonStyle="custom"
            customColors={{ backgroundColor: 'var(--dt_color_base_tertiary)', titleColor: color, borderColor: 'transparent' }}
            size="small"
            onClick={() => {
              dismissKeyboard()
              presentSheet('slackbot-sources', { text: message.text })
            }}
          />
        )}
      </div>
    </div>
  )
}
