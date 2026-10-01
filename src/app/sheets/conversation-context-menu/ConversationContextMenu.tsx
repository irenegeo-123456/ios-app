import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { useDevice } from '../../../sim/store'
import { MKDivider } from '../../../messagekit/MKDivider'
import { MKMessageView } from '../../../messagekit/MKMessageView'
import { threadInfo } from '../../../messagekit/format'
import { buildTranscript } from '../../screens/conversation/transcript'
import { ChannelIntro } from '../../screens/conversation/ChannelIntro'
import type { Conversation, Fixture, Message, SidebarSection } from '../../../data/types'
import { isIconName } from '../../../icons/Icon'
import { MenuPlatter, screenRect, type AnchorRect, type MenuElement, type MenuIcon, type MenuSection } from '../ui/Menu'
import { isChannel, useDismissIfMissing } from '../shared'
import { canLeave, copyChannelLink, copyHuddleLink, copyName, leaveChannel, markAsRead, namePrefixed, toggleMute, toggleStar } from '../conversation-menu/actions'
import { toast } from '../../ui/Toast'
import './conversation-context-menu.css'

// Home's long-press menu (spec home.md §13; slack-objc main @ 14b3cbaf; TPH = Modules/Features/Home/Implementation/
// Plugins/ConversationList/Pipelines/Pipes/Transforming/TransformingPipeHelper.swift). Not the header menu: UIKit's
// context menu, with a preview of the conversation above it — its transcript (the channel header, the thread root, the
// messages), 350 × 450 pt on basePrimary (350 × 420 for channels when Recap is on, which the clone doesn't model;
// TPH:19-23,487-505) — and a menu titled with the conversation's name ("#" for public channels), in three groups: Mark
// as Read / Mute; Move To Starred (or the "Move To…" submenu when there are custom sections) and Move to New Section;
// "Copy…" and Leave Channel (TPH:424-461; SectionItemActionBuilder.swift:32-135). Tapping the preview opens the
// conversation (SKList.swift:2206-2213); tapping outside closes. The blur, the preview's corners and the spacing are
// UIKit's; nothing in Slack's source gives numbers for them.
//
//   presentSheet('conversation-context-menu', { conversationId, anchor: rowElementOrRect })

interface Props {
  sheetKey: string
  conversationId: string
  /** the pressed row (element or screen rect); default: the row last touched */
  anchor?: Element | AnchorRect
}

const PREVIEW = { width: 350, height: 450 }
/** from the edges of the safe area, and between the preview and the menu */
const MARGIN = 8
const GAP = 16

export function ConversationContextMenu({ conversationId, anchor }: Props) {
  const sheet = useSheet()
  const device = useDevice()
  const fx = useApp((s) => s.fx)
  const conv = fx.conversations[conversationId] as Conversation | undefined
  const [source] = useState(() => screenRect(anchor ?? lastRow()))
  const menuRef = useRef<HTMLDivElement>(null)
  // The menu's own height, once: the layout is set when it opens (a submenu then opens in place, within the space left)
  const [menuSize, setMenuSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = menuRef.current?.firstElementChild as HTMLElement | null
    const inner = el?.firstElementChild as HTMLElement | null
    if (el && inner) setMenuSize({ w: el.offsetWidth, h: inner.offsetHeight })
  }, [])

  useDismissIfMissing(!conv)
  if (!conv) return null
  const close = (then?: () => void) => sheet?.dismiss(then)
  const sections = menuSections(fx, conv)

  // Layout: the preview centered across, as near the row as fits; the menu under it, on its leading edge. When both
  // don't fit, the preview gives up height.
  const top0 = device.safeTop + MARGIN
  const bottom0 = device.height - device.safeBottom - MARGIN
  const mh = menuSize?.h ?? 0
  const pw = Math.min(PREVIEW.width, device.width - 2 * MARGIN)
  const ph = Math.max(120, Math.min(PREVIEW.height, bottom0 - top0 - GAP - mh))
  const center = source ? source.y + source.height / 2 : device.height / 2
  const top = Math.min(Math.max(top0, center - ph / 2), bottom0 - ph - GAP - mh)
  const left = (device.width - pw) / 2
  const previewStyle: CSSProperties = { left, top, width: pw, height: ph }
  const menuStyle: CSSProperties = { left, top: top + ph + GAP, transformOrigin: 'left top', visibility: menuSize ? undefined : 'hidden' }

  return (
    <div className="ccm" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="ccm-backdrop" aria-hidden />
      <div
        className="ccm-preview"
        style={previewStyle}
        role="button"
        aria-label={`Open ${namePrefixed(fx, conv)}`}
        onClick={() => close(() => useApp.getState().openConversation(conversationId))}
      >
        <Transcript conversationId={conversationId} />
      </div>
      <div ref={menuRef}>
        <MenuPlatter spec={{ title: namePrefixed(fx, conv), sections }} className="ios-menu--pulldown ccm-menu" style={menuStyle} onDone={(then) => close(then)} maxHeight={bottom0 - (top + ph + GAP)} />
      </div>
    </div>
  )
}

/** The rows of Home's long-press menu (TPH:428-465). */
function menuSections(fx: Fixture, conv: Conversation): MenuSection[] {
  const s = useApp.getState()
  const channel = isChannel(conv)
  const slackbot = conv.userId === 'USLACKBOT'
  const paid = fx.workspace.plan !== 'free'

  // 1. Mark as Read (with unreads), Mute / Unmute (not Slackbot) (ConversationActionBuilder.swift:54-68,111-125; TPH:425-435)
  const top: MenuElement[] = []
  // Mark as Read with unreads, else Mark Unread (mark_unread, svgMarkAsUnread): since September 2026 the read case is no
  // longer behind ios_mark_as_unread_action (ConversationActionBuilder.swift:111-125)
  if (fx.unreads[conv.id]) top.push({ title: 'Mark as Read', icon: 'mark_as_read', onSelect: () => markAsRead(fx, conv) })
  else {
    const last = s.messages[conv.id]?.at(-1)
    if (last) top.push({ title: 'Mark Unread', icon: 'mark_as_unread', onSelect: () => s.markUnread(conv.id, last.ts) })
  }
  if (!slackbot)
    top.push(
      conv.muted
        ? { title: channel ? 'Unmute Channel' : 'Unmute Conversation', icon: 'notifications', onSelect: () => toggleMute(fx, conv) }
        : { title: channel ? 'Mute Channel' : 'Mute Conversation', icon: 'notifications_off', onSelect: () => toggleMute(fx, conv) },
    )

  // 2. Moving: Starred and "Move to New Section" (paid plans); with custom sections, the "Move To…" submenu
  //    (SectionItemActionBuilder.swift:32-135)
  const custom = fx.sections.filter((x) => x.kind === 'custom')
  const newSection = { title: 'Move to New Section', icon: 'plus', onSelect: () => s.showToast('Not in the prototype') }
  let move: MenuElement[]
  if (!custom.length) {
    move = [conv.starred ? { title: 'Remove from Starred', icon: 'unstar', onSelect: () => toggleStar(conv) } : { title: 'Move To Starred', icon: 'star', onSelect: () => toggleStar(conv) }]
    if (paid) move.push(newSection)
  } else {
    const inSection = custom.find((x) => x.conversationIds.includes(conv.id))
    const moveTo = (id: string, name: string) => () => {
      s.moveToSection(conv.id, id)
      toast({ text: `Moved to ${name}`, image: 'star_filled', imageSize: 30, duration: 1 })
    }
    const bottom: MenuElement[] = paid ? [newSection] : []
    if (inSection)
      bottom.push({
        title: `Remove from ${inSection.name}`,
        icon: 'clear',
        destructive: true,
        onSelect: () => {
          s.moveToSection(conv.id, null)
          toast({ text: `Removed from ${inSection.name}`, image: 'clear', imageSize: 30, duration: 1 })
        },
      })
    else if (conv.starred) bottom.push({ title: 'Remove from Starred', icon: 'clear', destructive: true, onSelect: () => toggleStar(conv) })
    move = [
      {
        title: 'Move To…',
        // the current section's emoji (else a filled star), a filled star when starred, else a star (:94-110)
        icon: inSection ? (sectionIcon(inSection) ?? 'star_filled') : conv.starred ? 'star_filled' : 'star',
        submenu: [
          {
            items: [
              { title: 'Starred', icon: 'star', checked: !!conv.starred, onSelect: () => !conv.starred && toggleStar(conv) },
              ...custom.map((x) => ({ title: x.name, icon: sectionIcon(x), checked: x.id === inSection?.id, onSelect: x.id === inSection?.id ? undefined : moveTo(x.id, x.name) })),
            ],
          },
          ...(bottom.length ? [{ items: bottom }] : []),
        ],
      },
    ]
  }

  // 3. "Copy…" (files): Copy Name, Copy Channel Link, Copy Huddle Link (members); Leave Channel (TPH:437-451). The
  //    submenu's "Copy Channel Email" / "Copy DM Email" (ConversationActionBuilder.swift:200-219) needs the
  //    conversation's email address from the server: not drawn.
  const member = (conv.memberIds ?? [fx.me]).includes(fx.me)
  const copy: MenuElement = {
    title: 'Copy…',
    icon: 'files',
    submenu: [
      {
        items: [
          { title: 'Copy Name', icon: channel ? 'channel' : conv.type === 'mpim' ? 'user_groups' : 'user', onSelect: () => copyName(fx, conv) },
          { title: 'Copy Channel Link', icon: 'link', onSelect: () => copyChannelLink(fx, conv.id) },
          ...(member ? [{ title: 'Copy Huddle Link', icon: 'headphones', onSelect: () => copyHuddleLink(fx, conv.id) }] : []),
        ],
      },
    ],
  }
  const last: MenuElement[] = [copy]
  if (canLeave(fx, conv)) last.push({ title: 'Leave Channel', icon: 'sign_out', destructive: true, onSelect: () => leaveChannel(fx, conv) })

  return [top.length ? { items: top } : null, { items: move }, { items: last }].filter((x): x is MenuSection => !!x)
}

/** A custom section's emoji, if it has one (iconForSection, SectionItemActionBuilder.swift:137-152); icon names pass through. */
const sectionIcon = (x: SidebarSection): MenuIcon | undefined => (!x.icon ? undefined : isIconName(x.icon) ? x.icon : { emoji: x.icon })

/** The preview: the conversation's transcript on basePrimary, anchored to its newest message like the conversation. */
function Transcript({ conversationId }: { conversationId: string }) {
  const fx = useApp((s) => s.fx)
  const list = useApp((s) => s.messages[conversationId]) ?? EMPTY
  const threads = useApp((s) => s.threads)
  const rows = useMemo(() => buildTranscript(fx, list, { conversationId, replyCount: (m) => threadInfo(fx, threads, conversationId, m).count }), [fx, list, threads, conversationId])
  return (
    <div className="ccm-transcript" aria-hidden>
      <ChannelIntro conversationId={conversationId} />
      {rows.map((row) => {
        if (row.kind === 'divider') return <MKDivider key={row.key} date={row.date} isNew={row.isNew} />
        if (row.kind === 'join') return <MKMessageView key={row.key} message={{ ...row.message, text: row.text }} conversationId={conversationId} system />
        return <MKMessageView key={row.key} message={row.message} conversationId={conversationId} grouped={row.grouped} />
      })}
    </div>
  )
}
const EMPTY: Message[] = []

// The row a long-press came from: Home presents the menu without it, so the last row touched stands in.
let lastTouched: Element | null = null
if (typeof document !== 'undefined')
  document.addEventListener(
    'pointerdown',
    (e) => {
      const row = (e.target as Element | null)?.closest?.('.sk-row')
      if (row) lastTouched = row
    },
    true,
  )
const lastRow = () => (lastTouched?.isConnected ? lastTouched : null)
