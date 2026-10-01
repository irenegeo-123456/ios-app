import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../store'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { Icon } from '../../../icons/Icon'
import { MKDivider } from '../../../messagekit/MKDivider'
import { MKMessageView } from '../../../messagekit/MKMessageView'
import { threadInfo } from '../../../messagekit/format'
import type { Message } from '../../../data/types'
import { buildTranscript } from './transcript'
import { ChannelIntro } from './ChannelIntro'

// The message list (MessageTranscript, spec messages.md §9): not inverted, anchored to the bottom — it opens at the
// newest message, short histories sit right above the composer, and new messages stay in view while you're at the
// bottom (MessageTranscriptInteractor.swift:133-135, 647-660; SKListScrollAnchoring.swift:11-14). It runs under the glass nav
// bar and composer; its bottom inset is the composer plus the keyboard or the tab bar (BottomContentInsetAccounting.swift:274-296, June's KeyboardInsetAccounting).

const EMPTY: Message[] = []
/** insert/update animation: smooth spring, medium = 0.4 s (SKList.swift:2528-2533; UIView+SpringAnimation.swift:24-30) */
const INSERT_MS = 400
/** the jumped-to highlight goes 5 s after the row is first seen (MessageTranscriptPipelineController.swift:54-55) */
const FOCUS_MS = 5000

interface Props {
  conversationId: string
  /** the composer's height (onHeight): the list keeps its last message above it */
  composerHeight: number
  /** the list's top inset: under the nav bar, or below the app tabs */
  topInset: string
  /** a permalinked message to open at and highlight (route.ts) */
  focusTs?: string
  onScrolled?: (scrolled: boolean) => void
}

export function MessageList({ conversationId, composerHeight, topInset, focusTs, onScrolled }: Props) {
  const fx = useApp((s) => s.fx)
  const list = useApp((s) => s.messages[conversationId]) ?? EMPTY
  const threads = useApp((s) => s.threads)
  const newMarker = useApp((s) => s.newMarker)
  // The NEW line stays where it was when you opened the conversation (ReadMarkerMessageTranscriptPipeline.swift:148-172)
  const [markerTs] = useState(() => (newMarker?.conversationId === conversationId ? newMarker.ts : undefined))
  const rows = useMemo(
    () => buildTranscript(fx, list, { conversationId, newTs: markerTs, replyCount: (m) => threadInfo(fx, threads, conversationId, m).count }),
    [fx, list, threads, conversationId, markerTs],
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const [focused, setFocused] = useState(focusTs)
  const lastTs = list.at(-1)?.ts
  const [seenTs, setSeenTs] = useState(lastTs)
  const [showLatest, setShowLatest] = useState(false)
  const [unreadPill, setUnreadPill] = useState<'hidden' | 'up' | 'unset'>('unset')
  const scrolled = useRef(false)

  const unreadCount = useMemo(() => {
    if (!markerTs) return 0
    const i = list.findIndex((m) => m.ts === markerTs)
    return i < 0 ? 0 : list.slice(i).filter((m) => m.userId !== fx.me && m.subtype !== 'channel_join').length
  }, [list, markerTs, fx.me])

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.clientHeight - el.scrollTop < 4
    const s = el.scrollTop > 1
    if (s !== scrolled.current) {
      scrolled.current = s
      onScrolled?.(s)
    }
    if (atBottom.current) {
      setSeenTs(useApp.getState().messages[conversationId]?.at(-1)?.ts)
      setShowLatest(false)
    }
    // The unread pill leaves once the NEW divider is on screen (LastReadBannerPlugin.swift:224-226, 277-281 [Sept])
    const divider = el.querySelector<HTMLElement>('[data-new-divider]')
    if (divider) {
      const top = el.getBoundingClientRect().top
      const scale = el.getBoundingClientRect().height / el.offsetHeight || 1
      const inset = parseFloat(getComputedStyle(contentRef.current!).paddingTop) || 0
      const visible = (divider.getBoundingClientRect().bottom - top) / scale > inset
      setUnreadPill((p) => (p === 'hidden' ? p : visible ? 'hidden' : 'up'))
    } else setUnreadPill('hidden')
  }, [conversationId, onScrolled])

  // Open at the newest message, or at a permalinked one (scrolled to the top, MessageAnchoringScrollCoordinator.swift:242-278)
  useLayoutEffect(() => {
    const el = scrollRef.current!
    const target = focusTs ? el.querySelector<HTMLElement>(`[data-ts="${focusTs}"]`) : null
    if (target) {
      const inset = parseFloat(getComputedStyle(contentRef.current!).paddingTop) || 0
      el.scrollTop = target.offsetTop - inset
    } else el.scrollTop = el.scrollHeight
    measure()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stay pinned to the bottom while content or insets change, if that's where you are (ContentOffsetAccounting.swift:719-724)
  useLayoutEffect(() => {
    const el = scrollRef.current!
    const content = contentRef.current!
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight
    })
    ro.observe(content)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A new message at the bottom slides in (at most 2 inserts animate, only at the bottom; SKList.swift:2805-2810, 2887-2888)
  const prevLast = useRef(lastTs)
  useLayoutEffect(() => {
    const before = prevLast.current
    prevLast.current = lastTs
    if (!lastTs || lastTs === before || !before) return
    const el = scrollRef.current!
    const content = contentRef.current!
    const last = list.at(-1)!
    const mine = last.userId === fx.me
    if (!atBottom.current && !mine) {
      // scrolled up: the latest-messages pill (LatestMessagesBannerPlugin.swift:89-104)
      setShowLatest(true)
      return
    }
    const row = content.querySelector<HTMLElement>(`[data-ts="${lastTs}"]`)
    const h = row?.offsetHeight ?? 0
    const wasAtBottom = atBottom.current
    atBottom.current = true
    el.scrollTop = el.scrollHeight
    if (!wasAtBottom) return // you sent a message while scrolled up: jump to it
    if (h && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      content.style.transition = 'none'
      content.style.transform = `translateY(${h}px)`
      void content.offsetHeight
      content.style.transition = `transform ${INSERT_MS}ms var(--sk-spring-smooth)`
      content.style.transform = ''
      row?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: INSERT_MS, easing: 'ease-out' })
      const t = setTimeout(() => (content.style.transition = ''), INSERT_MS)
      return () => clearTimeout(t)
    }
  }, [lastTs]) // eslint-disable-line react-hooks/exhaustive-deps

  // The jumped-to row's highlight fades after 5 s
  useEffect(() => {
    if (!focused) return
    const t = setTimeout(() => setFocused(undefined), FOCUS_MS)
    return () => clearTimeout(t)
  }, [focused])

  // Dragging the list pulls the keyboard down (keyboardDismissMode .interactive, SKList.swift:530, 733)
  const dragging = useRef(false)
  const onScroll = () => {
    if (dragging.current && document.querySelector('.ios-app.has-keyboard')) dismissKeyboard()
    measure()
  }

  const jumpTo = (target: 'latest' | 'unread') => {
    const el = scrollRef.current!
    if (target === 'latest') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    else {
      const divider = el.querySelector<HTMLElement>('[data-new-divider]')
      const inset = parseFloat(getComputedStyle(contentRef.current!).paddingTop) || 0
      if (divider) el.scrollTo({ top: divider.offsetTop - inset, behavior: 'smooth' })
      setUnreadPill('hidden')
    }
  }

  // the unread pill stays mounted while it leaves (0.431 s, the drawer's bouncy medium spring), showing its last count
  const unreadShown = unreadPill === 'up' && unreadCount > 0
  const unreadPhase = useLeaving(unreadShown, 431)
  const lastUnread = useRef(unreadCount)
  if (unreadShown) lastUnread.current = unreadCount
  const shownUnread = unreadShown ? unreadCount : lastUnread.current

  const bottomInset = `calc(${composerHeight}px + 12px + max(var(--kb-height), 83px))`
  const latestVisible = showLatest && !!lastTs && lastTs !== seenTs
  return (
    <>
      <div
        className="ios-scroll convo-list"
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={() => (dragging.current = true)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        data-qa="message_list"
      >
        <div className="convo-list__content" ref={contentRef} style={{ paddingTop: topInset, paddingBottom: bottomInset }}>
          <ChannelIntro conversationId={conversationId} />
          {rows.map((row) => {
            if (row.kind === 'divider')
              return (
                <div key={row.key} data-new-divider={row.isNew || undefined}>
                  <MKDivider date={row.date} isNew={row.isNew} />
                </div>
              )
            if (row.kind === 'join') return <MKMessageView key={row.key} message={{ ...row.message, text: row.text, reactions: row.message.reactions }} conversationId={conversationId} system />
            return <MKMessageView key={row.key} message={row.message} conversationId={conversationId} grouped={row.grouped} focused={focused === row.message.ts} />
          })}
        </div>
      </div>
      {unreadPhase !== 'out' && (
        <PillBanner
          className={`convo-pill--unread${unreadPhase === 'leaving' ? ' is-leaving' : ''}`}
          icon="arrow_up"
          label={`${shownUnread} unread`} // `one_unread` / `other_unread`, yaml:13917 / 14415
          action="Jump to first unread message" // `jump_to_first_unread`, yaml:10474
          onTap={() => jumpTo('unread')}
          onClose={() => setUnreadPill('hidden')}
          style={{ top: `calc(${topInset} + 12px)` }}
        />
      )}
      {latestVisible && (
        <PillBanner
          className="convo-pill--latest"
          icon="arrow_down"
          label="Latest messages" // `latest_messages`, yaml:10707
          action="Latest messages"
          onTap={() => jumpTo('latest')}
          onClose={() => {
            setSeenTs(lastTs)
            setShowLatest(false)
          }}
          style={{ bottom: `calc(${composerHeight}px + 12px + max(var(--kb-height), 83px) + 12px)` }}
        />
      )}
    </>
  )
}

/**
 * PillBannerView (Plugins/LastReadBanner/PillBannerView.swift:56-148 [Sept]): a 36 pt capsule of glass tinted
 * highlight1.baseInverse (#1264a3 / #0a77a7; June sk_sapphire_blue), `[arrow 32] label [✕ 32]`, white 16 pt icons, Lato
 * Bold 13 white; it slides down from above with a bouncy spring and, Sept, leaves sliding back up and fading
 * (DefaultListDrawerAppearanceAnimation.swift:10-21; ListDrawerAppearanceAnimation.swift:20-25).
 */
function PillBanner({ className, icon, label, action, onTap, onClose, style }: { className: string; icon: string; label: string; action: string; onTap: () => void; onClose: () => void; style: React.CSSProperties }) {
  return (
    <div className={`convo-pill ${className}`} style={style}>
      <button type="button" className="convo-pill__main" aria-label={action} onClick={onTap} data-tap>
        <span className="convo-pill__icon">
          <Icon name={icon} size={16} />
        </span>
        <span className="convo-pill__label">{label}</span>
      </button>
      <button type="button" className="convo-pill__close" aria-label="Close" onClick={onClose} data-tap>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

/** 'in' while shown, 'leaving' for `ms` after it hides (so it can animate out), then 'out'. */
function useLeaving(visible: boolean, ms: number): 'in' | 'leaving' | 'out' {
  const [phase, setPhase] = useState<'in' | 'leaving' | 'out'>(visible ? 'in' : 'out')
  useEffect(() => {
    if (visible) {
      setPhase('in')
      return
    }
    setPhase((p) => (p === 'in' ? 'leaving' : p))
    const t = setTimeout(() => setPhase((p) => (p === 'leaving' ? 'out' : p)), ms)
    return () => clearTimeout(t)
  }, [visible, ms])
  return phase
}
