import { useMemo } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { GlassButton } from '../../nav/NavBar'
import { openMenu } from '../../sheets'
import { Icon } from '../../../icons/Icon'
import { SKListHeader } from '../../../slackkit/SKEntity'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { MKMessagePreview, mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { displayName } from '../../../messagekit/format'
import { EntityRow, SectionFooter } from '../more/EntityRow'
import { XMark } from '../../sheets/ui/SheetBar'
import type { Message } from '../../../data/types'
import { citationsOf, type Step } from './engine'
import { toolIcon } from './SlackbotMessages'
import { useSlackbot, type SbChat } from './state'

// ------------------------------------------------------------------------------------------------ sheet bar

/**
 * The bar September gives these sheets (they're each the only view controller of their navigation controller): the
 * automatic close button, SF xmark in contentPrimary, a11y "Close", on the leading side (UIViewController+CloseButton.swift:
 * 61-97; configureCloseButton / configureCloseButtonIfNecessary), the title in Lato Bold 17, and an optional trailing
 * icon item. June's History, Sources and tool timeline had no bar button on the left.
 */
function SheetNav({ title, trailing }: { title: string; trailing?: { icon: string; label: string; onClick: () => void } }) {
  const sheet = useSheet()
  return (
    <div className="sb-sheet-nav">
      <GlassButton label="Close" className="sb-sheet-nav__button sb-sheet-nav__close" onClick={() => sheet?.dismiss()}>
        <XMark />
      </GlassButton>
      <span className="sb-sheet-nav__title">{title}</span>
      {trailing && (
        <GlassButton label={trailing.label} className="sb-sheet-nav__button" onClick={trailing.onClick}>
          <Icon name={trailing.icon} size={20} />
        </GlassButton>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ history

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
const clock = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
/** "Sep 26th", with ", 2025" in other years (TimeUtility prefixDateFormatter "MMM d" + suffixForDay) */
const ordinal = (d: Date, now: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}${suffix(d.getDate())}${d.getFullYear() === now.getFullYear() ? '' : `, ${d.getFullYear()}`}`

/** The day sections' titles: Today / Yesterday / "Sep 26th" (TimeUtility.ordinalDisplayString, TimeUtility.swift:883-927). */
function dayTitle(day: number, now: Date) {
  const today = startOfDay(now)
  if (day === today) return 'Today' // today (yaml:20276)
  if (day === today - DAY) return 'Yesterday' // yesterday (yaml:22638)
  return ordinal(new Date(day), now)
}

/**
 * A row's time (TimeUtility.relativeFromTodayString, TimeUtility.swift:556-620): .simple today ("now", "1m ago",
 * "22m ago", "1h ago", "3h ago"), .extended before ("Yesterday at 2:48 PM", "Sep 26th at 10:02 AM").
 */
export function historyTime(ts: string, now = new Date()) {
  const d = new Date(parseFloat(ts) * 1000)
  if (startOfDay(d) !== startOfDay(now)) {
    if (startOfDay(d) === startOfDay(now) - DAY) return `Yesterday at ${clock(d)}` // yesterday_at_x (22641)
    return `${ordinal(d, now)} at ${clock(d)}` // date_at_time "%@ at %@" (4808)
  }
  const secs = Math.max(0, (now.getTime() - d.getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor(secs / 60)
  if (h > 1) return `${h}h ago` // hours_ago (7455)
  if (h === 1) return '1h ago' // one_hour_ago_short_form (12953)
  if (m > 1) return `${m}m ago` // minutes_ago_short_form (11644)
  if (m === 1 || secs > 1) return '1m ago' // one_minute_ago_short_form (12992)
  return 'now' // now (12753)
}

/**
 * History (spec §2.6; Sept 2026: AiHistoryFeature.swift:34-50, AiHistoryViewController.swift:19-43, AiHistoryPresenter.
 * swift:35-95, 179-261, AiHistoryThreadFormatter.swift:98-162): a sheet with medium and large detents from a conversation's
 * History button ('slackbot-history'), a standard modal from the tab's "View all conversations" ('slackbot-history-page');
 * a bar with the close button, "History" (history, yaml:7963) and New chat (svgCompose, "New Slackbot Message",
 * new_slackbot_message yaml:12852); one section per day with a hairline footer; rows are SKGenericEntity .medium (June
 * .small) with no ornament: the thread's title (2 lines), its relative time, the chevron in contentSecondary (June
 * sk_foreground_max_solid); June's emphasized background for threads Slackbot started is gone. Long press → "Delete
 * conversation" (slackbot_delete_thread_menu_item, yaml:20049) with svgTrash, destructive — behind ios_slackbotai_delete_thread
 * (default off, as in June), kept here so prototypes can tidy a list.
 */
export function HistorySheet() {
  const sheet = useSheet()
  const chats = useSlackbot((s) => s.chats)
  const openChat = useSlackbot((s) => s.openChat)
  const newChat = useSlackbot((s) => s.newChat)
  const deleteChat = useSlackbot((s) => s.deleteChat)
  const now = new Date()
  const sections = useMemo(() => {
    const byDay = new Map<number, SbChat[]>()
    for (const c of chats) {
      const day = startOfDay(new Date(parseFloat(c.id) * 1000))
      byDay.set(day, [...(byDay.get(day) ?? []), c])
    }
    return [...byDay.entries()].sort((a, b) => b[0] - a[0]).map(([day, list]) => ({ day, chats: list.sort((a, b) => parseFloat(b.id) - parseFloat(a.id)) }))
  }, [chats])
  const done = (fn: () => void) => (sheet ? sheet.dismiss(fn) : fn())
  // from the tab (no Slackbot conversation on screen yet) a chat opens on the tab's stack (SlackbotFeature.swift:262-300)
  const open = (fn: () => void) =>
    done(() => {
      fn()
      const app = useApp.getState()
      const top = app.stacks[app.tab].at(-1)?.route
      if (top?.screen !== 'slackbot') app.push({ screen: 'slackbot', entry: app.tab === 'slackbot' ? 'tab' : undefined })
    })
  return (
    <div className="sb-history">
      <SheetNav title="History" trailing={{ icon: 'compose', label: 'New Slackbot Message', onClick: () => open(newChat) }} />
      {sections.length === 0 ? (
        <SKEmptyState title="Nothing to see here...yet." className="sb-history__empty" />
      ) : (
        <div className="ios-scroll sb-history__list" data-sheet-scroll>
          {sections.map((sec, i) => (
            <section key={sec.day}>
              <SKListHeader title={dayTitle(sec.day, now)} collapsible={false} />
              {sec.chats.map((c) => (
                <EntityRow
                  key={c.id}
                  size="medium"
                  title={c.title}
                  titleLines={2}
                  subtitle={historyTime(c.id, now)}
                  subtitleLines={1}
                  background="var(--dt_color_base_primary)"
                  // the chevronRight glyph (U+E250) in contentSecondary (AiHistoryPresenter.swift:218-220)
                  accessories={<Icon name="caret_right" size={20} color="var(--dt_color_content_secondary)" />}
                  onClick={() => open(() => openChat(c.id))}
                  onLongPress={(el) =>
                    openMenu({ anchor: el, sections: [{ items: [{ title: 'Delete conversation', icon: 'trash', destructive: true, onSelect: () => deleteChat(c.id) }] }] }) // AiHistoryPresenter.swift:228-242
                  }
                  data-qa={`slackbot_history_${c.id}`}
                />
              ))}
              <SectionFooter hairline={i < sections.length - 1} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ sources

/**
 * An answer's sources (spec §2.5c; Sept 2026: AiTimelineSourcesFeature.swift:27-37, AiTimelineSourcesViewController.swift:
 * 26-62, AiTimelineSourcesPresenter.swift:60-248): medium and large detents with a grabber, now in a navigation controller
 * titled "Sources" (yaml:20511) with the close button, on basePrimary, the list 16 pt in from the sides and below the bar;
 * sections "Messages" / "Files" / "Web" / "Memories" with .medium headers. Message rows are previews with the author,
 * "in #channel" above the body (in_channel; caption) and the body in .body folded to 2 lines, both contentSecondary
 * (June sk_foreground_max), no reactions. Tapping one opens the message.
 */
export function SourcesSheet({ text }: { sheetKey: string; text?: string }) {
  const s = useApp()
  const cites = citationsOf(text ?? '')
  const rows = cites.flatMap(({ conversationId, ts }) => {
    const found = findMessage(s.messages, s.threads, conversationId, ts)
    return found ? [{ conversationId, ...found }] : []
  })
  return (
    <div className="sb-sources">
      <SheetNav title="Sources" />
      <div className="ios-scroll sb-sources__list" data-sheet-scroll>
        {rows.length > 0 && (
          <section>
            <SKListHeader title="Messages" collapsible={false} />
            {rows.map(({ conversationId, msg, threadTs }) => {
              const author = s.fx.users[msg.userId]
              const conv = s.fx.conversations[conversationId]
              const where = conv && (conv.type === 'channel' || conv.type === 'private') ? conv : undefined
              return (
                <MKMessagePreview
                  key={`${conversationId}/${msg.ts}`}
                  ornament={<SKMemberAvatar src={author?.avatar} name={author?.realName ?? 'User'} size="large" />}
                  primaryText={displayName(author)}
                  timestamp={mkTimestamp(msg.ts, 'relative')}
                  mustache={
                    where ? (
                      <span className="sb-sources__in">
                        in {where.type === 'private' ? <Icon name="lock_filled" size={13} className="sb-sources__lock" /> : '#'}
                        {where.name}
                      </span>
                    ) : undefined
                  }
                  mustacheColor="var(--dt_color_content_secondary)"
                  body={msg.text}
                  bodyFont="var(--sk-body)"
                  bodyColor="var(--dt_color_content_secondary)"
                  bodyLines={2}
                  onClick={() => useApp.getState().openMessage(conversationId, msg.ts, { threadTs })}
                />
              )
            })}
          </section>
        )}
        {rows.length === 0 && <SKEmptyState title="Nothing to see here...yet." className="sb-history__empty" />}
      </div>
    </div>
  )
}

/** A message in a conversation's history or one of its threads (threadTs = the parent's ts). */
function findMessage(messages: Record<string, Message[]>, threads: Record<string, Message[]>, conversationId: string, ts: string): { msg: Message; threadTs?: string } | undefined {
  const top = messages[conversationId]?.find((m) => m.ts === ts)
  if (top) return { msg: top }
  for (const [key, list] of Object.entries(threads)) {
    if (!key.startsWith(`${conversationId}/`)) continue
    const m = list.find((x) => x.ts === ts)
    if (m) return { msg: m, threadTs: key.slice(conversationId.length + 1) }
  }
  return undefined
}

// ------------------------------------------------------------------------------------------------ tool timeline

/**
 * "View tool timeline" (spec §2.5a; Sept 2026: AiToolTimelineFeature.swift:25-35, AiToolTimelinePresenter.swift:33-152,
 * AiToolTimelinePointRow.swift:27-140, AiToolTimelineViewController.swift:26-39): medium and large detents with the
 * grabber, now in a navigation controller titled "Summary" (summary, yaml:20859) with the close button, the list 16 pt in
 * from the sides and below the bar on basePrimary; each step is a 20 pt tool icon, 8 pt, the text in .body (aubergine_70
 * while it runs, contentSecondary once done) 4 pt below the previous row, with a 1 px outlineTertiary connector (at least
 * 12 pt) under the icon; a final "Done" (done, yaml:5777) with svgCheckCircle once finished.
 */
export function TimelineSheet({ steps = [], running }: { sheetKey: string; steps?: Step[]; running?: boolean }) {
  const rows = [...steps.map((s, i) => ({ icon: toolIcon(s.icon) ?? 'ai_sparkle', text: s.text, live: !!running && i === steps.length - 1, connector: true })), ...(running ? [] : [{ icon: 'check_circle', text: 'Done', live: false, connector: false }])]
  return (
    <div className="sb-tools">
      <SheetNav title="Summary" />
      <div className="ios-scroll sb-tools__list" data-sheet-scroll>
        {rows.map((r, i) => (
          <div key={i} className={`sb-tools__row${r.live ? ' is-live' : ''}${r.connector && i < rows.length - 1 ? ' has-connector' : ''}`}>
            <span className="sb-tools__icon">
              <Icon name={r.icon} size={20} />
              {r.connector && i < rows.length - 1 && <i className="sb-tools__connector" />}
            </span>
            <span className="sb-tools__text">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ skills

/**
 * Skills, from the Slackbot tab's More actions menu (spec §2.7; SlackbotFeature.swift:189-206 presents it as a standard
 * modal; SlackbotSkillsViewController.swift:30-32: "Skills" (skills, yaml:19229) with the close button). The demo
 * workspace has no skills, so it's the empty state: svgAiSkills and "No skills added yet" (no_skills_added_yet,
 * yaml:13086; SlackbotSkillsPresenter.swift:45-55).
 */
export function SkillsSheet() {
  return (
    <div className="sb-skills">
      <SheetNav title="Skills" />
      <SKEmptyState content={{ icon: 'ai_skills' }} title="No skills added yet" className="sb-history__empty" />
    </div>
  )
}
