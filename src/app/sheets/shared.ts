import { parseMrkdwn, type Inline } from '../../lib/mrkdwn'
import type { Conversation, Fixture, Message } from '../../data/types'
import { useApp } from '../store'
import { sheetDef, screenDef } from '../nav/registry'
import { useEffect } from 'react'
import { useSheet } from '../nav/SheetHost'

// Helpers shared by the sheets: finding a message, its permalink and plain text, the user's frequently used emoji,
// the conversation's display name, and opening a screen or sheet that another area may or may not have registered.

type AppLike = { fx: Fixture; messages: Record<string, Message[]>; threads: Record<string, Message[]> }

/** A message in a channel's history or a thread (threadTs = its parent). */
export function findMessage(s: AppLike, conversationId: string, ts: string, threadTs?: string): Message | undefined {
  if (threadTs && threadTs !== ts) {
    const m = s.threads[`${conversationId}/${threadTs}`]?.find((x) => x.ts === ts)
    if (m) return m
  }
  return s.messages[conversationId]?.find((x) => x.ts === ts) ?? Object.entries(s.threads).find(([k]) => k.startsWith(`${conversationId}/`) && s.threads[k].some((x) => x.ts === ts))?.[1].find((x) => x.ts === ts)
}

/** https://<domain>.slack.com/archives/<channel>/p<ts without the dot>, with thread_ts for replies. */
export function permalink(fx: Fixture, conversationId: string, ts: string, threadTs?: string) {
  const base = `https://${fx.workspace.domain}.slack.com/archives/${conversationId}/p${ts.replace('.', '')}`
  return threadTs && threadTs !== ts ? `${base}?thread_ts=${threadTs}&cid=${conversationId}` : base
}

/** A message's text as it reads (mentions and channels by name, link labels, emoji as :codes:). */
export function plainText(fx: Fixture, text: string): string {
  const inline = (els: Inline[]): string =>
    els
      .map((e) => {
        switch (e.t) {
          case 'text':
            return e.v
          case 'emoji':
            return `:${e.name}:`
          case 'user':
            return `@${fx.users[e.id]?.name ?? e.label ?? e.id}`
          case 'channel':
            return `#${fx.conversations[e.id]?.name ?? e.name ?? e.id}`
          case 'link':
            return e.label ?? e.url
          case 'br':
            return '\n'
          case 'pbr':
            return '\n\n'
          case 'tab':
            return '\t'
          case 'broadcast':
            return `@${e.range}`
          case 'usergroup':
            return e.label ?? ''
          case 'date':
            return e.fallback ?? ''
          case 'color':
            return e.value
        }
      })
      .join('')
  return parseMrkdwn(text)
    .map((b) => (b.t === 'pre' ? b.text : b.t === 'list' ? b.items.map((i) => `• ${inline(i)}`).join('\n') : inline(b.els)))
    .join('\n')
}

/**
 * The emoji you react with most, most used first, padded for new users with Slack's defaults
 * (FrequentlyUsedEmojiDataProvider.swift:21-22, CombineFrequentlyUsedEmojiQuery.swift:25-33).
 */
export const DEFAULT_FREQUENT = ['slightly_smiling_face', '+1', 'white_check_mark', 'heart', 'eyes', 'bow', 'raised_hands', 'sparkle']
export function frequentEmoji(s: AppLike, limit: number): string[] {
  const counts = new Map<string, number>()
  const me = s.fx.me
  const count = (list: Message[]) => {
    for (const m of list) for (const r of m.reactions ?? []) if (r.users.includes(me)) counts.set(r.name, (counts.get(r.name) ?? 0) + 1)
  }
  Object.values(s.messages).forEach(count)
  Object.values(s.threads).forEach(count)
  const mine = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
  const out = [...new Set([...mine, ...DEFAULT_FREQUENT])]
  return out.slice(0, limit)
}

/** A conversation's name as Slack shows it: channels without "#", DMs by the person's name. */
export function conversationTitle(fx: Fixture, conv: Conversation): string {
  if (conv.type === 'im' || conv.type === 'app') return (conv.userId && fx.users[conv.userId]?.realName) || conv.name
  if (conv.type === 'mpim') return (conv.userIds ?? []).filter((u) => u !== fx.me).map((u) => fx.users[u]?.name ?? u).join(', ') || conv.name
  return conv.name
}

export const isChannel = (conv: Conversation) => conv.type === 'channel' || conv.type === 'private'

/** Copies to the clipboard (quietly: headless browsers may refuse). */
export function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {})
  } catch {
    // no clipboard
  }
}

/**
 * Opens something another area owns, by the first of `names` that's registered: a sheet (presented) or a screen
 * (pushed). Returns false when none is.
 */
export function openRegistered(names: string[], props: Record<string, unknown> = {}): boolean {
  const s = useApp.getState()
  for (const n of names) {
    if (sheetDef(n)) {
      s.presentSheet(n, props)
      return true
    }
    if (screenDef(n)) {
      s.push({ screen: n, ...props })
      return true
    }
  }
  return false
}

/** A sheet presented without what it needs (a prototype's presentSheet by hand) closes itself rather than crash or
 *  leave an invisible overlay over the screen. Call it before any early return. */
export function useDismissIfMissing(missing: boolean) {
  const sheet = useSheet()
  useEffect(() => {
    if (missing) sheet?.dismiss()
  }, [missing]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** openRegistered, or the app's usual "Not in the prototype" toast when nothing by those names is registered. */
export function openOrToast(names: string[], props: Record<string, unknown> = {}) {
  if (!openRegistered(names, props)) useApp.getState().showToast('Not in the prototype')
}

/** The message row on screen, for anchoring a popover (the conversation's rows carry data-ts, if they do). */
export function messageElement(ts: string): Element | null {
  return document.querySelector(`.ios-screen [data-ts="${ts}"], .ios-screen [data-message-ts="${ts}"]`)
}
