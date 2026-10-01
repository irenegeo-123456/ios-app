import type { ReactNode } from 'react'
import type { Conversation, DraftItem, Fixture, Message } from '../../../data/types'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { MKGroupAvatar, MKIconOrnament, mkPreviewContent, mkTime, mkTimestamp, type MKMessagePreviewProps } from '../../../messagekit/MKMessagePreview'
import { ordinal } from '../../../lib/slackDate'
import { conversationTitle, displayName } from '../../../messagekit/format'

// What Drafts, Scheduled and Sent rows pass to MKMessagePreview (spec dms-activity.md §7): headerStyling .conversation
// (the destination's avatar and name), reactions off, the body in contentSecondary (June sk_foreground_max), 2 lines,
// not interactive (DraftsPresenter.swift:248; CommonDraftsScheduledPresenter.swift:145; SentPresenter.swift:143).

export type OutboundsTab = 'drafts' | 'scheduled' | 'sent'

/** OutboundsTab, in order (OutboundsFeatureInterface.swift:58-66): drafts_title_case, scheduled, sent. */
export const OUTBOUNDS_TABS: { id: OutboundsTab; title: string }[] = [
  { id: 'drafts', title: 'Drafts' },
  { id: 'scheduled', title: 'Scheduled' },
  { id: 'sent', title: 'Sent' },
]

/** formattedCount (PageControllerPresentationObjectProvider.swift:36-43): blank at 0, "99+" above 99. */
export const tabCount = (n: number) => (n > 99 ? '99+' : n > 0 ? String(n) : '')

/**
 * Conversation.deprecated_nameWithPublicChannelPrefixOnly: "#name" for public channels, the bare name for private ones,
 * the person for DMs, the other members for group DMs.
 */
export function destinationName(fx: Fixture, conv: Conversation): string {
  if (conv.type === 'channel') return `#${conv.name}`
  if (conv.type === 'private') return conv.name
  if (conv.type === 'mpim') return conversationTitle(fx, conv)
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return u ? displayName(u) : conv.name
}

/**
 * AvatarMapper.decisionForChannel (AvatarMapper.swift:106-118): channels get hashLarge (or lock) in contentPrimary on
 * surfacePrimary (June sk_primary_foreground on sk_foreground_low_solid; the glyph font's icons, drawn with the nearest
 * SVGs), group DMs a group avatar of the first two others, DMs the person's avatar without presence; no destination:
 * DraftMessagePreview's pencil, the same colors (:144-152).
 */
export function destinationOrnament(fx: Fixture, conv: Conversation | undefined): ReactNode {
  const box = (icon: string) => <MKIconOrnament icon={icon} color="var(--dt_color_content_primary)" background="var(--dt_color_surface_primary)" />
  if (!conv) return box('edit')
  if (conv.type === 'channel') return box('channel')
  if (conv.type === 'private') return box('lock')
  if (conv.type === 'mpim') {
    const others = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => fx.users[id])
    return <MKGroupAvatar faces={others.slice(0, 2).map((u) => ({ src: u?.avatar, name: u?.realName ?? '' }))} />
  }
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return <SKMemberAvatar src={u?.avatar} name={u?.realName ?? conv.name} size="large" />
}

/** The body: the text summarized, contentSecondary (messageStyling baseTextColor; June sk_foreground_max). */
const BODY = { bodyColor: 'var(--dt_color_content_secondary)' } as const

/**
 * DraftMessagePreview.authorName (:182-208): "Thread in " + the destination, in the preview's default bodyBold; with no
 * destination "No destination" (no_destination) in bodyBold contentSecondary (:188; June sk_foreground_max).
 */
function draftPrimary(fx: Fixture, d: DraftItem, conv: Conversation | undefined): Pick<MKMessagePreviewProps, 'primaryText' | 'primaryColor'> {
  if (!conv) return { primaryText: 'No destination', primaryColor: 'var(--dt_color_content_secondary)' }
  return { primaryText: `${d.threadTs ? 'Thread in ' : ''}${destinationName(fx, conv)}` }
}

/**
 * A draft (DraftsPresenter.swift:214-243): `.timeOnly` ("9:41 AM") when edited within the last 2 days, else
 * `.longPrefix` ("June 4").
 */
export function draftRow(fx: Fixture, d: DraftItem, now = Date.now()): MKMessagePreviewProps {
  const conv = fx.conversations[d.conversationId]
  const updated = parseFloat(d.updated) * 1000
  const style = updated > now - 2 * 86_400_000 ? 'timeOnly' : 'longPrefix'
  return {
    ornament: destinationOrnament(fx, conv),
    ...draftPrimary(fx, d, conv),
    timestamp: d.updated && parseFloat(d.updated) ? mkTimestamp(d.updated, style) : undefined,
    body: d.text,
    ...BODY,
  }
}

/**
 * ScheduledHelper.sendAtDateTimeString (:13-26): "Send today at 3:55 PM" (send_today_at_x), "Send tomorrow at 3:55 PM"
 * (send_tomorrow_at_x), else "Send %@ at %@" (send_at_date_time) with {date} = "MMMM d'{ordinal}', yyyy"
 * (DateFormattingUtilities.swift:56-66): "Send January 3rd, 2026 at 3:55 PM".
 */
export function sendAtText(ts: string, nowMs = Date.now()): string {
  const d = new Date(parseFloat(ts) * 1000)
  const now = new Date(nowMs)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((day(d) - day(now)) / 86_400_000)
  if (days === 0) return `Send today at ${mkTime(d)}`
  if (days === 1) return `Send tomorrow at ${mkTime(d)}`
  return `Send ${d.toLocaleString('en-US', { month: 'long' })} ${ordinal(d.getDate())}, ${d.getFullYear()} at ${mkTime(d)}`
}

/**
 * A scheduled message (DraftMessagePreview.swift:162-176; ScheduledHelper.swift:28-58): no timestamp; the header line
 * is when it goes, caption 13 contentSecondary (ScheduledHelper.swift:32; June sk_foreground_max); the destination in bold.
 */
export function scheduledRow(fx: Fixture, d: DraftItem): MKMessagePreviewProps {
  const conv = fx.conversations[d.conversationId]
  return {
    ornament: destinationOrnament(fx, conv),
    ...draftPrimary(fx, d, conv),
    header: sendAtText(d.scheduledFor!),
    headerFont: 'var(--sk-caption)',
    headerColor: 'var(--dt_color_content_secondary)',
    body: d.text,
    ...BODY,
  }
}

export interface SentItem {
  conversationId: string
  message: Message
  /** the thread's parent, for replies */
  threadTs?: string
}

/** Your messages, newest first: the history and the thread replies (SentMessagesDataProvider). */
export function sentItems(fx: Fixture, messages: Record<string, Message[]>, threads: Record<string, Message[]>): SentItem[] {
  const out: SentItem[] = []
  for (const [conversationId, list] of Object.entries(messages)) {
    if (!fx.conversations[conversationId]) continue
    for (const m of list) if (m.userId === fx.me && !m.subtype && !m.ephemeral) out.push({ conversationId, message: m })
  }
  for (const [key, replies] of Object.entries(threads)) {
    const slash = key.indexOf('/')
    const conversationId = key.slice(0, slash)
    if (!fx.conversations[conversationId]) continue
    for (const m of replies) if (m.userId === fx.me && m.ts !== key.slice(slash + 1) && !m.subtype && !m.ephemeral) out.push({ conversationId, message: m, threadTs: key.slice(slash + 1) })
  }
  return out.sort((a, b) => parseFloat(b.message.ts) - parseFloat(a.message.ts))
}

/** TimeUtility.displayDateString (:688-697): "Today", "Yesterday", else the medium date style "Jun 4, 2024". */
export function sentSectionTitle(ts: string, nowMs = Date.now()): string {
  const d = new Date(parseFloat(ts) * 1000)
  const now = new Date(nowMs)
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, now)) return 'Today'
  if (same(d, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** A sent message (SentMessagePreview.swift:117-132; SentPresenter.swift:130-168): `.timeOnly`. */
export function sentRow(fx: Fixture, item: SentItem): MKMessagePreviewProps {
  const conv = fx.conversations[item.conversationId]
  const content = mkPreviewContent(item.message)
  return {
    ornament: destinationOrnament(fx, conv),
    primaryText: conv ? `${item.threadTs ? 'Thread in ' : ''}${destinationName(fx, conv)}` : '',
    timestamp: mkTimestamp(item.message.ts, 'timeOnly'),
    body: content.body,
    files: content.files,
    unfurls: content.unfurls,
    ...BODY,
  }
}
