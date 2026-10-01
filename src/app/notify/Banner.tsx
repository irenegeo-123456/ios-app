import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { incoming, useApp } from '../store'
import { useSim } from '../../sim/store'
import { deviceById } from '../../sim/devices'
import { playSound } from '../../lib/sounds'
import { notificationSound } from '../screens/notifications/prefs'
import { parseInline, type Inline } from '../../lib/mrkdwn'
import { findEmoji } from '../../emoji/Emoji'
import { asset } from '../../lib/asset'
import type { Fixture, Message } from '../../data/types'
import './notify.css'

// iOS notification banners. In the foreground Slack shows its notifications as system banners with sound
// (AppRootNotificationCenterDelegate.swift:133-162 completes willPresent with [.list, .banner, .sound]), except for
// the conversation you're looking at (MobileInAppNotificationEventHandler.swift:98, mostRecentChannelId). They're
// communication notifications: the sender's name and photo, and the conversation's name as the subtitle for
// channels and group DMs, none for DMs (NotificationBasedIntentsMessageMetadataProvider.swift:199-260). Tap one to
// open the conversation; swipe it up to dismiss. The banner itself is drawn by iOS, so its look is iOS 26's.

interface Banner {
  id: number
  conversationId: string
  threadTs?: string
  title: string
  subtitle?: string
  body: string
  avatar?: string
}

const useBanners = create<{ banner: Banner | null; show: (b: Banner) => void; hide: (id?: number) => void }>()((set) => ({
  banner: null,
  show: (banner) => set({ banner }),
  hide: (id) => set((s) => (id === undefined || s.banner?.id === id ? { banner: null } : {})),
}))

let seq = 0
/** How long a banner stays up (iOS dismisses temporary banners after about five seconds). */
const DWELL = 5000

/** Whether iOS Slack would notify you about this message with the default settings (DMs, mentions, thread replies). */
function shouldNotify(fx: Fixture, conversationId: string, msg: Message, threadTs: string | undefined, threads: Record<string, Message[]>, messages: Record<string, Message[]>) {
  if (msg.userId === fx.me) return false
  const conv = fx.conversations[conversationId]
  if (!conv || conv.muted) return false
  const mention = msg.text.includes(`<@${fx.me}>`) || /<!(here|channel|everyone)>/.test(msg.text)
  const direct = conv.type === 'im' || conv.type === 'mpim' || conv.type === 'app'
  // "All new posts" notifies for every message in the conversation (NotificationSettings); the default is mentions only
  if (conv.notify === 'all') return true
  if (conv.notify === 'mentions' || !threadTs) return mention || direct
  const parent = messages[conversationId]?.find((m) => m.ts === threadTs)
  const following = parent?.userId === fx.me || (threads[`${conversationId}/${threadTs}`] ?? []).some((m) => m.userId === fx.me)
  return mention || direct || following
}

/** A message as a notification shows it: mentions as names, emoji as characters, no formatting marks. */
export function plainText(text: string, fx: Fixture): string {
  const run = (els: Inline[]): string =>
    els
      .map((el) => {
        switch (el.t) {
          case 'text':
            return el.v
          case 'emoji': {
            const e = findEmoji(el.name)
            return e && !e.u.includes('custom') && /^[0-9a-f-]+$/.test(e.u) ? String.fromCodePoint(...e.u.split('-').map((h) => parseInt(h, 16))) : `:${el.name}:`
          }
          case 'user':
            return `@${fx.users[el.id]?.name ?? el.label ?? 'someone'}`
          case 'channel':
            return `#${fx.conversations[el.id]?.name ?? el.name ?? 'channel'}`
          case 'link':
            return el.label ?? el.url
          case 'broadcast':
            return `@${el.range}`
          case 'usergroup':
            return el.label ?? '@group'
          case 'date':
            return el.fallback ?? ''
          case 'color':
            return el.value
          case 'br':
          case 'pbr':
            return ' '
          case 'tab':
            return ' '
        }
      })
      .join('')
  return run(parseInline(text)).replace(/\s+/g, ' ').trim()
}

function bannerFor(fx: Fixture, conversationId: string, msg: Message, threadTs?: string): Banner {
  const conv = fx.conversations[conversationId]
  const sender = fx.users[msg.userId]
  const group = conv.type === 'channel' || conv.type === 'private' ? `#${conv.name}` : conv.type === 'mpim' ? conv.name : undefined
  const body = plainText(msg.text, fx) || (msg.files?.length ? `Uploaded ${msg.files.length === 1 ? 'a file' : `${msg.files.length} files`}` : msg.blocks?.length ? 'Sent a message' : '')
  return {
    id: ++seq,
    conversationId,
    threadTs,
    title: sender?.realName || sender?.name || conv.name,
    subtitle: threadTs && group ? `Thread in ${group}` : group,
    body,
    avatar: sender?.avatar,
  }
}

/** Starts listening for incoming messages (once). */
let installed = false
function install() {
  if (installed) return
  installed = true
  incoming.add(({ conversationId, msg, threadTs, seen }) => {
    const s = useApp.getState()
    if (seen || !shouldNotify(s.fx, conversationId, msg, threadTs, s.threads, s.messages)) return
    useBanners.getState().show(bannerFor(s.fx, conversationId, msg, threadTs))
    if (useSim.getState().sounds) playSound(notificationSound())
  })
}

export function NotificationBanner() {
  install()
  const banner = useBanners((s) => s.banner)
  const hide = useBanners((s) => s.hide)
  const device = deviceById(useSim((s) => s.device))
  const [shown, setShown] = useState<Banner | null>(null)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ y: number; moved: boolean } | null>(null)

  useEffect(() => {
    if (!banner) return
    setShown(banner)
    setDrag(0)
    const t = setTimeout(() => hide(banner.id), DWELL)
    return () => clearTimeout(t)
  }, [banner, hide])

  if (!shown) return null
  const visible = banner?.id === shown.id
  // below the Dynamic Island on island iPhones; over the status bar on the others
  const top = device.islandFrame ? device.islandFrame.top + device.islandFrame.height + 6 : 8

  const open = () => {
    hide(shown.id)
    const app = useApp.getState()
    app.setForeground(true)
    app.openConversation(shown.conversationId)
    if (shown.threadTs) app.openThread(shown.conversationId, shown.threadTs)
  }

  return (
    <div
      className={`ios-banner glass${visible ? ' is-visible' : ''}`}
      style={{ top, transform: visible ? `translateY(${Math.min(0, drag)}px)` : undefined }}
      role="alert"
      data-banner
      onPointerDown={(e) => {
        start.current = { y: e.clientY, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!start.current) return
        const dy = e.clientY - start.current.y
        if (Math.abs(dy) > 4) start.current.moved = true
        setDrag(dy)
      }}
      onPointerUp={() => {
        const s = start.current
        start.current = null
        if (s?.moved) {
          if (drag < -24) hide(shown.id)
          setDrag(0)
        } else open()
      }}
      onTransitionEnd={() => {
        if (!visible) setShown(null)
      }}
    >
      <div className="ios-banner__icon">
        {shown.avatar ? <img className="ios-banner__avatar" src={shown.avatar} alt="" /> : <img className="ios-banner__app" src={asset('/ios/app-icon-180.png')} alt="" />}
        {shown.avatar && <img className="ios-banner__badge" src={asset('/ios/app-icon-180.png')} alt="" />}
      </div>
      <div className="ios-banner__text">
        <div className="ios-banner__head">
          <span className="ios-banner__title">{shown.title}</span>
          <span className="ios-banner__time">now</span>
        </div>
        {shown.subtitle && <div className="ios-banner__subtitle">{shown.subtitle}</div>}
        <div className="ios-banner__body">{shown.body}</div>
      </div>
    </div>
  )
}
