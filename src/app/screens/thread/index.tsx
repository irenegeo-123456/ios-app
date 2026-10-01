import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { registerScreen } from '../../nav/registry'
import { useApp, type Route } from '../../store'
import { Composer } from '../../composer/Composer'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { Icon } from '../../../icons/Icon'
import { MKDivider } from '../../../messagekit/MKDivider'
import { MKMessageView } from '../../../messagekit/MKMessageView'
import { MKRootMessageView, MKThreadToolbar } from '../../../messagekit/MKRootMessageView'
import { conversationTitle } from '../../../messagekit/format'
import type { Message } from '../../../data/types'
import { shouldRollUp } from '../conversation/transcript'
import { BackButton, ConversationBarTrailing, ConvoBar } from '../conversation/ConversationNavBar'
import { NAVBAR_BOTTOM } from '../../nav/NavBar'
import '../conversation/conversation.css'
import './thread.css'

// A thread (AnyConversation with messageSource .thread, spec messages.md §10.7): the root message (MKRootMessageView),
// a hairline, the toolbar ("N replies", Save, Forward, More), a hairline, the replies as ordinary message rows with
// thread-reply times and the same grouping, no date dividers; then the reply composer. It opens at the top (the root)
// and new replies stay in view when you're at the bottom (MessageTranscriptPreferences.swift:67-78).
//
//   push({ screen: 'thread', conversationId, ts })     openThread(conversationId, ts)

const EMPTY: Message[] = []

function ThreadScreen({ route }: { route: Route }) {
  const conversationId = route.conversationId as string
  const ts = route.ts as string
  const fx = useApp((s) => s.fx)
  const root = useApp((s) => s.messages[conversationId]?.find((m) => m.ts === ts))
  const replies = useApp((s) => s.threads[`${conversationId}/${ts}`]) ?? EMPTY
  const channel = useApp((s) => s.messages[conversationId]) ?? EMPTY
  const [composerHeight, setComposerHeight] = useState(60)
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(false)
  const screenRef = useRef<HTMLDivElement>(null)

  // Replies also sent to the channel have a copy there (store.sendMessage alsoSendToChannel): highlight them (§10.7)
  const broadcasts = useMemo(() => {
    const copies = channel.filter((m) => m.threadTs === ts && m.ts !== ts)
    return new Set(replies.filter((r) => copies.some((c) => c.userId === r.userId && c.text === r.text && Math.abs(parseFloat(c.ts) - parseFloat(r.ts)) < 60)).map((r) => r.ts))
  }, [channel, replies, ts])

  // Grouping as in the channel (§9.2); the toolbar above the first reply resets it, and so does a broadcast
  const grouped = useMemo(
    () =>
      replies.map((r, i) => {
        const prev = replies[i - 1]
        if (!prev || broadcasts.has(r.ts) || broadcasts.has(prev.ts)) return false
        return shouldRollUp(r, prev, () => 0)
      }),
    [replies, broadcasts],
  )

  // Stay at the bottom while you are there (new replies, the keyboard); the thread itself opens at the top
  useLayoutEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content) return
    const ro = new ResizeObserver(() => {
      if (atBottom.current && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
    })
    ro.observe(content)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Opened from Search at a reply (openMessage → route.jumpTs): scroll to it and highlight it for 5 s
  const jumpTs = route.jumpTs as string | undefined
  const [focusedTs, setFocusedTs] = useState(jumpTs)
  useLayoutEffect(() => {
    if (!jumpTs) return
    scrollRef.current?.querySelector<HTMLElement>(`[data-ts="${jumpTs}"]`)?.scrollIntoView({ block: 'center' })
    const t = setTimeout(() => setFocusedTs(undefined), 5000)
    return () => clearTimeout(t)
  }, [jumpTs])
  const lastReply = replies.at(-1)
  const prevLast = useRef(lastReply?.ts)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !lastReply || lastReply.ts === prevLast.current) return
    prevLast.current = lastReply.ts
    // your own reply scrolls into view (the list re-anchors when you send)
    if (lastReply.userId === fx.me || atBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [lastReply, fx.me])

  const dragging = useRef(false)
  const onScroll = () => {
    const el = scrollRef.current!
    atBottom.current = el.scrollHeight - el.clientHeight - el.scrollTop < 4
    setScrolled(el.scrollTop > 1)
    if (dragging.current && document.querySelector('.ios-app.has-keyboard')) dismissKeyboard()
  }

  if (!root) return <MissingThread />
  const replyCount = Math.max(root.replyCount ?? 0, replies.length)
  const focusComposer = () => {
    // "Reply in Thread" focuses the composer (ThreadRootMessagePlugin.swift:280-281)
    screenRef.current?.querySelector<HTMLElement>('[contenteditable="true"], textarea')?.focus()
  }
  return (
    <div className="ios-pushed-screen convo thread" data-screen="thread" ref={screenRef}>
      <div
        className="ios-scroll convo-list"
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={() => (dragging.current = true)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div
          className="thread-list__content"
          ref={contentRef}
          style={{ paddingTop: NAVBAR_BOTTOM, paddingBottom: `calc(${composerHeight}px + 12px + max(var(--kb-height), 83px))` }}
        >
          <MKRootMessageView message={root} conversationId={conversationId} />
          <MKDivider />
          <MKThreadToolbar message={root} conversationId={conversationId} replyCount={replyCount} onReply={focusComposer} />
          <MKDivider />
          {replies.map((r, i) => (
            <MKMessageView key={r.ts} message={r} conversationId={conversationId} threadTs={ts} grouped={grouped[i]} broadcast={broadcasts.has(r.ts)} focused={r.ts === focusedTs} />
          ))}
        </div>
      </div>
      <ConvoBar leading={<BackButton />} scrolled={scrolled} title={<ThreadTitle conversationId={conversationId} />} trailing={<ConversationBarTrailing conversationId={conversationId} huddle={fx.conversations[conversationId]?.type !== 'app'} />} />
      <Composer conversationId={conversationId} threadTs={ts} onHeight={setComposerHeight} />
    </div>
  )
}

/**
 * The thread's title (HeaderTitleView as the nav bar's title view): on iOS 26 a 44 pt glass capsule that fills the bar
 * between the back button and the right items, leading-aligned, 6 pt nudged right for the back button
 * (HeaderTitleView.swift:405-409 [Sept]; measured on a device, reference/device/IMG_2248: capsule x 82–309 = back circle
 * + 12 + 6 … right capsule − 12; the June source left UIKit to center a hugging capsule); text inset 16 leading /
 * 10 trailing; "Thread" (`thread`, yaml:21605) in Lato Black capped at 16, content_primary, then the conversation in
 * Lato 13 content_secondary: "#channel", the lock + name, or the person icon + name (HeaderTitleView.swift:30-32,
 * :358-364, :430, :535-539; HeaderTitlePresentable.swift:49-69). Tap → the conversation; pressed alpha 0.5.
 */
function ThreadTitle({ conversationId }: { conversationId: string }) {
  const fx = useApp((s) => s.fx)
  const stack = useApp((s) => s.stacks[s.tab])
  const pop = useApp((s) => s.pop)
  const push = useApp((s) => s.push)
  const conv = fx.conversations[conversationId]
  const isDM = conv?.type === 'im' || conv?.type === 'mpim' || conv?.type === 'app'
  const name = conv ? conversationTitle(fx, conv) : ''
  const open = () => {
    // opens the parent conversation (AnyConversationInteractor.swift:310-318): back to it when it's right below
    const below = stack.at(-2)?.route
    if (below?.screen === 'conversation' && below.id === conversationId) pop()
    else push({ screen: 'conversation', id: conversationId })
  }
  return (
    <div className="thread-title-slot">
      <button type="button" className="thread-title glass" onClick={open} data-tap aria-label={`Thread, ${name}`} aria-description="Opens details">
        <span className="thread-title__title">Thread</span>
        {conv && (
          <span className="thread-title__subtitle">
            {isDM ? <Icon name="user_filled" size={13} className="thread-title__icon" /> : conv.type === 'private' ? <Icon name="lock_filled" size={13} className="thread-title__icon" /> : null}
            <span className="thread-title__name">{isDM ? ` ${name}` : conv.type === 'private' ? name : `#${name}`}</span>
          </span>
        )}
      </button>
    </div>
  )
}

function MissingThread() {
  return (
    <div className="ios-pushed-screen convo">
      <ConvoBar leading={<BackButton />} />
      <div className="convo-empty">
        <div className="convo-empty__title">We’re unable to open this link.</div>
        <div className="convo-empty__body">This link opens a message or conversation that you don’t have access to, or that’s been deleted.</div>
      </div>
    </div>
  )
}

registerScreen('thread', ThreadScreen)
