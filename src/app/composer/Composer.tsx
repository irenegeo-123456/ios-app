import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../store'
import { useFlag } from '../flags'
import type { Conversation, FileAttachment, Fixture, Message } from '../../data/types'
import { Emoji } from '../../emoji/Emoji'
import { conversationName } from '../screens/home/sections'
import { dismissKeyboard } from '../keyboard/Keyboard'
import {
  activeFormats,
  applyShortcuts,
  backspaceAtLineStart,
  caretToEnd,
  clearEditor,
  emojiEl,
  insertNewline,
  insertPlainText,
  isBlank,
  keepCaretVisible,
  isEmpty,
  loadMrkdwn,
  mentionEl,
  normalize,
  NO_FORMATS,
  placeCaret,
  placeCaretAfter,
  previewHtml,
  removeLink,
  renumber,
  selectionRange,
  setLink,
  shiftIndent,
  toggleLineKind,
  toggleMark,
  toMrkdwn,
  ZWSP,
  type Formats,
  type LineKind,
  type Mark,
} from './editor'
import { COMMANDS, findOpportunity, search, type AcRow, type Opportunity } from './suggestions'
import { AutocompleteCard } from './Autocomplete'
import { AttachmentChip, AttachmentsTray, ContextBar, SendToChannel, ToolButton, TypingBanner, keepFocus } from './parts'
import { contextBarState, type ContextBarState } from './contextBar'
import { useAgentStore } from '../../apps/agent-state'
import { SLACKBOT_DM, SLACKBOT_USER_ID } from '../screens/slackbot/constants'
import './PlusSheet'
import './LinkAlert'
import './composer.css'
import { dispatchDirectMessage, runSlashCommand } from '../../apps/runtime'

// The message composer (spec reference/ios/specs/composer.md), the iOS 26 Liquid Glass variant: one glass card,
// bottom-anchored in its screen, 8 pt above the floating tab bar (or above the keyboard while it's up), with the context
// bar (typing…) as its own glass capsule 6 pt above it. That's the Sept 2026 layout (slack-objc-latest: ComposerGlassGeometry
// .swift, ComposerViewController.swift:455; June's `ios_composer_context_bar`), measured on a device
// (reference/device/IMG_2247–2248: a 44 pt capsule x 21–419, y 821–865 on 440 × 956). Flag composerContextBar off: June's
// 60 pt card, 12 pt above the tab bar, radius 26, the banner inside the card.
//
//   collapsed   [+]  Message #general…                      [mic | send]      44 pt; the tab bar's 21 pt from the sides
//   focused     text view above [+][Aa][☺][@][/] …… [send]                    ~100 pt; 8 pt from the sides
//   formatting  text view above [×] B I U S 🔗 1. • ❝ </> ▭ … [send]
//   editing     text view above [Aa][☺][@] …… [× cancel][✓ save]
//
// The text view is a contenteditable with live rich text (editor.ts). Sending calls store.sendMessage with mrkdwn.
// Return on the simulated keyboard inserts a newline (iOS: no returnKeyType override, SKTextInput.swift); the Mac's
// Return is a hardware keyboard's: it sends, Shift+Return is a newline (ComposerInputInteractor.swift:497-512, :651-656).

export interface ComposerProps {
  conversationId: string
  /** a thread's reply composer ("Add a reply", with "Also send to #channel") */
  threadTs?: string
  /** the composer's current height in pt (the message list keeps its last message above it) */
  onHeight?: (height: number) => void
  /** overrides the placeholder (the New Message screen before a recipient: "Write a message") */
  placeholder?: string
  /** replaces the store send (the New Message screen opens the conversation first) */
  onSend?: (text: string, files: FileAttachment[]) => void
  /** focus the text view when it appears */
  autoFocus?: boolean
  /** where the draft is kept (default `${conversationId}/${threadTs}`); the New Message screen keeps one while you pick */
  draftKey?: string
  /** an AI reply is streaming: the right-hand button becomes Stop, white on highlight1.baseInverse, "Stop Response", in
   *  every toolbar state (ComposerStopStreamingPlugin.swift:31-45; ComposerToolbarLayoutManager.swift:170-171, :236-237,
   *  :306-307 [Sept]; `stop_response`, yaml:20737) */
  streaming?: boolean
  /** Stop tapped (with `streaming`) */
  onStop?: () => void
}

type Mode = 'normal' | 'format'

/** Drafts survive leaving the conversation (MessageCompositionManager keeps one per destination). */
const drafts = new Map<string, { html: string; files: FileAttachment[] }>()

/** The composer's placeholder (PlaceholderTextPublisher.swift:116-251, spec §3.1). */
function placeholderFor(fx: Fixture, conv: Conversation | undefined, threadTs: string | undefined, editingRoot: boolean): ReactNode {
  if (!conv) return 'Write a message' // writeAMessage (yaml:23924)
  if (threadTs && !editingRoot) return 'Add a reply' // add_a_reply (yaml:682)
  switch (conv.type) {
    case 'channel':
      return `Message #${conv.name}` // message_x "Message %@" (yaml:12300)
    case 'private':
      return `Message ${conv.name}`
    case 'mpim':
      return `Message ${conversationName(fx, conv)}`
    default: {
      const u = conv.userId ? fx.users[conv.userId] : undefined
      if (!u) return 'Add a reply'
      if (u.id === fx.me) return 'Jot something down' // jot_something_down (yaml:10467)
      if (u.id === 'USLACKBOT') return 'Ask Slackbot anything...' // ask_slackbot_anything (yaml:2127)
      return (
        <>
          {`Message ${u.name}`}
          {/* her status emoji, grayscale and still, then the status text (:186-203) */}
          {u.statusEmoji && (
            <>
              {' '}
              <Emoji name={u.statusEmoji} size={17} className="cmp-ph-emoji" />
            </>
          )}
          {u.statusText && ` ${u.statusText}`}
        </>
      )
    }
  }
}

function findMessage(s: { messages: Record<string, Message[]>; threads: Record<string, Message[]> }, conversationId: string, ts: string): Message | undefined {
  const inChannel = s.messages[conversationId]?.find((m) => m.ts === ts)
  if (inChannel) return inChannel
  for (const [k, list] of Object.entries(s.threads)) if (k.startsWith(`${conversationId}/`)) {
    const m = list.find((x) => x.ts === ts)
    if (m) return m
  }
  return undefined
}

/** The composer on the screen that's showing: the top layer of the visible tab (editing goes to it). */
function isOnScreen(el: HTMLElement | null) {
  if (!el || el.closest('.ios-tab[hidden]')) return false
  const layer = el.closest('.ios-nav-layer')
  if (!layer) return true
  const layers = [...(layer.parentElement?.querySelectorAll(':scope > .ios-nav-layer:not(.is-leaving)') ?? [])]
  return layers.at(-1) === layer
}

export function Composer({ conversationId, threadTs, onHeight, placeholder, onSend, autoFocus, draftKey: draftKeyProp, streaming, onStop }: ComposerProps) {
  const fx = useApp((s) => s.fx)
  const conv = fx.conversations[conversationId]
  const sendMessage = useApp((s) => s.sendMessage)
  const editMessage = useApp((s) => s.editMessage)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const editing = useApp((s) => s.editing)
  const setEditing = useApp((s) => s.setEditing)
  const typingIds = useApp((s) => s.typing[conversationId])

  const draftKey = draftKeyProp ?? `${conversationId}/${threadTs ?? ''}`
  const rootRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)

  const [focused, setFocused] = useState(false)
  const [mode, setMode] = useState<Mode>('normal')
  const [longform, setLongform] = useState(false)
  const [longH, setLongH] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(true)
  const [blank, setBlank] = useState(true)
  const [preview, setPreview] = useState('')
  const [formats, setFormats] = useState<Formats>(NO_FORMATS)
  const [files, setFiles] = useState<FileAttachment[]>(() => drafts.get(draftKey)?.files ?? [])
  const [alsoSend, setAlsoSend] = useState(false)
  const [editTarget, setEditTarget] = useState<{ conversationId: string; ts: string } | null>(null)
  const [stackH, setStackH] = useState(60)
  const [rightW, setRightW] = useState(36)
  const rightRef = useRef<HTMLDivElement>(null)
  const [ac, setAc] = useState<{ opp: Opportunity; rows: AcRow[]; hi: number; place: { bottom: number; maxHeight: number } } | null>(null)
  const acRef = useRef(ac)
  acRef.current = ac
  const stashed = useRef<{ html: string; files: FileAttachment[] } | null>(null)
  const savedRange = useRef<Range | null>(null)
  const highlightTimer = useRef(0)
  const wasHighlighted = useRef(false)

  const editingRoot = !!editTarget && !!threadTs && editTarget.ts === threadTs
  const ph = placeholder ?? placeholderFor(fx, conv, threadTs, editingRoot)
  // Slackbot's DM (Slackbot AI on, as in the demo): no microphone when collapsed, and the focused row is just "+"
  // (ComposerToolbarLayoutManager.swift:188-197, :205-217 [Sept])
  // the DM with Slackbot's user, or the Slackbot screens' own DM, which isn't in the workspace's conversations
  const isSlackbot = conv?.userId === SLACKBOT_USER_ID || conversationId === SLACKBOT_DM
  // what the context bar shows: people typing, an AI app's status in a thread of its DM, or Slackbot answering
  // (contextBar.ts; spec §14)
  const agentStatuses = useAgentStore((s) => s.status)
  const bar = contextBarState({ me: fx.me, users: fx.users, conversationId, conv, threadTs, typingIds, statuses: agentStatuses, slackbot: isSlackbot, slackbotUserId: SLACKBOT_USER_ID })
  const hasBanner = !!bar
  // Sept: the context bar stands apart above the card (ContextBarContentPlugin.swift:78-95; MessageTranscriptPluginsBuilder
  // .swift:157-163), the card's insets never change for it (ComposerView.swift:193-207). June flag off: inside the card,
  // typing only.
  const contextBarLayout = useFlag('composerContextBar')
  const legacyTypers = !contextBarLayout && bar?.kind === 'typing' ? bar.users : null
  const canSend = !!editTarget || !blank || files.length > 0

  // ---------------------------------------------------------------------------------------- editor sync

  const refresh = useCallback(() => {
    const root = editorRef.current
    if (!root) return
    renumber(root)
    setEmpty(isEmpty(root))
    setBlank(isBlank(root))
    setPreview(previewHtml(root))
    const focusedNow = document.activeElement === root
    setFormats(focusedNow ? activeFormats(root) : NO_FORMATS)
    // autocomplete: the opportunity at the caret, and where the card goes
    const opp = focusedNow ? findOpportunity(root) : null
    if (!opp) {
      setAc(null)
      return
    }
    const rows = search(opp.type, opp.query, { fx: useApp.getState().fx, conversationId, threadTs })
    setAc((prev) => ({ opp, rows, hi: prev && prev.opp.type === opp.type && prev.opp.query === opp.query ? prev.hi : -1, place: placeCard(opp.range) }))
  }, [conversationId, threadTs])

  /** 16 pt above the caret's top, at most min(240, room − 8) tall (ARPC:48-74, :458-471). */
  const placeCard = (range: Range) => {
    const root = rootRef.current!
    const screen = root.closest('.ios-screen') as HTMLElement | null
    const box = root.getBoundingClientRect()
    const scale = box.width / root.offsetWidth || 1
    const rects = range.getClientRects()
    const caret = rects.length ? rects[rects.length - 1] : (range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement)!.getBoundingClientRect()
    const top = (caret.top - box.top) / scale
    const screenTop = screen ? (caret.top - screen.getBoundingClientRect().top) / scale : top
    const safeTop = screen ? parseFloat(getComputedStyle(screen).getPropertyValue('--safe-top')) || 0 : 0
    const room = screenTop - 16 - (safeTop + 3)
    return { bottom: root.offsetHeight - top + 16, maxHeight: Math.max(0, Math.min(240, room - 8)) }
  }

  const saveDraft = useCallback(() => {
    const root = editorRef.current
    if (!root || editTarget) return
    if (isEmpty(root) && !files.length) drafts.delete(draftKey)
    else drafts.set(draftKey, { html: root.innerHTML, files })
  }, [draftKey, editTarget, files])

  const afterEdit = () => {
    refresh()
    saveDraft()
    const root = editorRef.current
    if (root) requestAnimationFrame(() => keepCaretVisible(root))
  }

  // mount: restore the draft
  useLayoutEffect(() => {
    const root = editorRef.current!
    const d = drafts.get(draftKey)
    if (d?.html) root.innerHTML = d.html
    else clearEditor(root)
    normalize(root)
    refresh()
    if (autoFocus) {
      root.focus()
      caretToEnd(root)
    }
  }, [draftKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => saveDraft(), [files, saveDraft])

  // the caret moving updates formats and autocomplete; a highlight held 0.1 s opens the formatting toolbar and
  // clearing it closes it again (ComposerToolbarInteractor.swift:206-236)
  useEffect(() => {
    if (!focused) return
    const onSel = () => {
      const root = editorRef.current
      if (!root || document.activeElement !== root) return
      const r = selectionRange(root)
      const highlighted = !!r && !r.collapsed
      if (highlighted !== wasHighlighted.current) {
        wasHighlighted.current = highlighted
        clearTimeout(highlightTimer.current)
        if (highlighted) highlightTimer.current = window.setTimeout(() => setMode('format'), 100)
        else setMode((m) => (m === 'format' ? 'normal' : m))
      }
      refresh()
    }
    document.addEventListener('selectionchange', onSel)
    return () => {
      document.removeEventListener('selectionchange', onSel)
      clearTimeout(highlightTimer.current)
    }
  }, [focused, refresh])

  // ---------------------------------------------------------------------------------------- height

  useLayoutEffect(() => {
    const el = stackRef.current
    if (!el) return
    // the unscaled border-box height, fractions kept (a 20.4 pt line makes 104.4 pt, not 104)
    const measure = (entry?: ResizeObserverEntry) => setStackH(Math.round((entry?.borderBoxSize?.[0]?.blockSize ?? el.getBoundingClientRect().height / (el.getBoundingClientRect().width / el.offsetWidth || 1)) * 100) / 100)
    const ro = new ResizeObserver((entries) => measure(entries[0]))
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = rightRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setRightW(entries[0]?.borderBoxSize?.[0]?.inlineSize ?? el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cardH = stackH
  // the context bar's cell sits on the composer in the conversation's bottom drawer: the list keeps its last message
  // above both (6 + the bar + 6, ContextBarBottomDrawer.swift:77-79, :107-112; SKContextBar.swift:44, :90)
  const [ctxH, setCtxH] = useState(0)
  const ctxRef = useRef<HTMLDivElement>(null)
  const showContextBar = contextBarLayout && hasBanner
  useLayoutEffect(() => {
    const el = ctxRef.current
    if (!showContextBar || !el) return setCtxH(0)
    const ro = new ResizeObserver((entries) => setCtxH(Math.round((entries[0]?.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight) * 100) / 100))
    ro.observe(el)
    return () => ro.disconnect()
  }, [showContextBar])
  // the bar stays while it leaves with a fade and a slide (ListDrawerAppearanceAnimation.swift:22-25 [Sept]), showing what
  // it showed last
  const barPhase = useLeavingPhase(showContextBar, 430)
  const lastBar = useRef<ContextBarState | null>(bar)
  if (showContextBar) lastBar.current = bar
  const drawerH = cardH + (showContextBar ? ctxH + 12 : 0)
  useEffect(() => {
    onHeight?.(drawerH)
    rootRef.current?.parentElement?.style.setProperty('--composer-height', `${drawerH}px`)
  }, [drawerH, onHeight])

  // ---------------------------------------------------------------------------------------- focus

  const focusEditor = () => {
    const root = editorRef.current!
    if (document.activeElement === root) return
    root.focus()
    caretToEnd(root)
  }

  const onFocus = () => {
    setFocused(true)
    refresh()
  }
  const onBlur = () => {
    // swiping down or tapping away collapses; the longform composer never collapses (ComposerToolbarInteractor.swift:641-650)
    setFocused(false)
    setMode('normal')
    setLongform(false)
    setAc(null)
    wasHighlighted.current = false
  }

  /** Runs `fn` with the editor focused and the saved (or current) selection. */
  const withEditor = (fn: (root: HTMLDivElement) => void) => {
    const root = editorRef.current!
    if (document.activeElement !== root) {
      root.focus()
      const r = savedRange.current
      if (r && root.contains(r.startContainer)) {
        const sel = document.getSelection()!
        sel.removeAllRanges()
        sel.addRange(r)
      } else caretToEnd(root)
    }
    fn(root)
    normalize(root)
    afterEdit()
  }

  const rememberSelection = () => {
    const root = editorRef.current
    const r = root && selectionRange(root)
    savedRange.current = r ? r.cloneRange() : null
  }

  // ---------------------------------------------------------------------------------------- editing a sent message

  useEffect(() => {
    const root = editorRef.current
    if (!root) return
    if (editing && editing.conversationId === conversationId && (!('threadTs' in editing) || editing.threadTs === undefined || editing.threadTs === threadTs) && isOnScreen(rootRef.current)) {
      if (editTarget?.ts === editing.ts) return
      const msg = findMessage(useApp.getState(), conversationId, editing.ts)
      if (!msg) return
      if (!editTarget) stashed.current = { html: root.innerHTML, files }
      setEditTarget({ conversationId, ts: editing.ts })
      setFiles([])
      loadMrkdwn(root, msg.text, useApp.getState().fx)
      normalize(root)
      // starting an edit focuses the text view (ComposerToolbarInteractor.swift:290-295), once the message actions
      // sheet that started it has gone
      const focusNow = () => {
        root.focus()
        caretToEnd(root)
        refresh()
      }
      if (!useApp.getState().sheets.length) focusNow()
      else {
        const unsub = useApp.subscribe((st) => {
          if (st.sheets.length) return
          unsub()
          setTimeout(focusNow, 0)
        })
      }
      refresh()
    } else if (editTarget && (!editing || editing.ts !== editTarget.ts)) {
      // editing ended (saved, cancelled, or the store cleared it): the draft comes back
      setEditTarget(null)
      const s = stashed.current
      stashed.current = null
      if (s?.html) root.innerHTML = s.html
      else clearEditor(root)
      setFiles(s?.files ?? [])
      normalize(root)
      refresh()
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  // leaving the screen mid-edit ends the edit
  const editRef = useRef(editTarget)
  editRef.current = editTarget
  useEffect(
    () => () => {
      const t = editRef.current
      const cur = useApp.getState().editing
      if (t && cur && cur.ts === t.ts) useApp.getState().setEditing(null)
    },
    [],
  )

  // ---------------------------------------------------------------------------------------- actions

  const send = () => {
    const root = editorRef.current!
    if (editTarget) {
      // Save (ComposerSendPlugin.swift:161-177): commits the edit
      if (!isBlank(root)) editMessage(editTarget.conversationId, editTarget.ts, toMrkdwn(root))
      setEditing(null)
      return
    }
    // guard sendEnabled (ComposerToolbarFeature.swift:510-511)
    if (isBlank(root) && !files.length) return
    const text = toMrkdwn(root)
    if (onSend) onSend(text, files)
    else if (!files.length && /^\/[\w-]+/.test(text.trim())) runCommand(conversationId, text.trim(), threadTs)
    else {
      sendMessage(conversationId, text, threadTs, { alsoSendToChannel: threadTs ? alsoSend : undefined, files: files.length ? files : undefined })
      // an app DM: the app's message handler answers (App Kit, src/apps/runtime.ts)
      if (!threadTs) dispatchDirectMessage(conversationId, text)
    }
    clearEditor(root)
    setFiles([])
    setAlsoSend(false)
    drafts.delete(draftKey)
    refresh()
  }

  const cancelEdit = () => setEditing(null)

  const onKeyDown = (e: React.KeyboardEvent) => {
    const root = editorRef.current!
    const hardware = e.nativeEvent.isTrusted
    const cur = acRef.current
    if (cur && cur.rows.length) {
      const n = cur.rows.length
      // hardware keyboard: ↑/↓/Tab move the highlight, Return picks (SKList.swift:2643-2671)
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault()
        setAc({ ...cur, hi: (cur.hi + 1) % n })
        return
      }
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault()
        setAc({ ...cur, hi: cur.hi <= 0 ? n - 1 : cur.hi - 1 })
        return
      }
      if (e.key === 'Enter' && hardware && !e.shiftKey) {
        e.preventDefault()
        pick(cur.rows[Math.max(0, cur.hi)])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setAc(null)
        return
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (hardware && !e.shiftKey) send()
      else {
        insertNewline(root)
        afterEdit()
      }
      return
    }
    if (e.key === 'Backspace' && backspaceAtLineStart(root)) {
      e.preventDefault()
      afterEdit()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      root.blur()
    }
  }

  const onInput = (e: React.FormEvent) => {
    const root = editorRef.current!
    const ne = e.nativeEvent as InputEvent
    normalize(root)
    if (ne.inputType === 'insertText' && ne.data) applyShortcuts(root, ne.data.slice(-1))
    afterEdit()
  }

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      insertPlainText(editorRef.current!, text)
      afterEdit()
    }
  }

  /** Picking a row inserts its token (spec §18.4). */
  const pick = (row: AcRow) => {
    const cur = acRef.current
    const root = editorRef.current!
    if (!cur) return
    if (row.kind === 'broadcast' && row.disabled) return
    const me = useApp.getState().fx.me
    let node: Node | null
    let mention = true
    switch (row.kind) {
      case 'user':
        node = mentionEl('user', row.user.id, `@${row.user.name || row.user.realName}`, row.user.id === me)
        break
      case 'broadcast':
        node = mentionEl('broadcast', row.name, `@${row.name}`)
        break
      case 'group':
        node = mentionEl('group', row.group.id, `@${row.group.handle}`)
        break
      case 'channel':
        node = mentionEl('channel', row.conv.id, `#${row.conv.name}`)
        break
      case 'emoji':
        node = emojiEl(row.name)
        mention = false
        break
      case 'command':
        // plain "/name " with a trailing space (WysiwygKeyboardEditContext+CommandHandling.swift:12-30)
        node = document.createTextNode(`${row.cmd.name} `)
        mention = false
        break
    }
    if (!node) return
    if (document.activeElement !== root) root.focus()
    const r = cur.opp.range
    r.deleteContents()
    r.insertNode(node)
    // a space after a mention at the end of the text or before a letter, not before punctuation
    // (WysiwygKeyboardEditContext+SlugSpacing.swift:74-138); an emoji takes none (WysiwygEmojiPayload.swift:30-35)
    const next = node.nextSibling
    const nextChar = next?.nodeType === Node.TEXT_NODE ? (next as Text).data.replace(/\u200B/g, '')[0] : next ? 'x' : undefined
    if (mention && (nextChar === undefined || /[\p{L}\p{N}]/u.test(nextChar))) {
      const space = document.createTextNode(' ')
      node.parentNode!.insertBefore(space, node.nextSibling)
      placeCaret(space, 1)
    } else if (node.nodeType === Node.TEXT_NODE) placeCaret(node, (node as Text).length)
    else {
      const spacer = document.createTextNode(ZWSP)
      node.parentNode!.insertBefore(spacer, node.nextSibling)
      placeCaret(spacer, 1)
    }
    setAc(null)
    normalize(root)
    afterEdit()
  }

  /** "@" inserts @ at the caret, with a space before it if needed, which opens the list (ComposerMentionPlugin.swift:27-31). */
  const insertTrigger = (ch: '@' | '/') =>
    withEditor((root) => {
      const r = selectionRange(root)
      const before = r && r.startContainer.nodeType === Node.TEXT_NODE ? (r.startContainer as Text).data.slice(0, r.startOffset).replace(/\u200B/g, '') : ''
      document.execCommand('insertText', false, ch === '@' && before && !/\s$/.test(before) ? ` ${ch}` : ch)
    })

  /** Runs `then` once the sheet just presented has gone (dismissed by itself or by the user). */
  const sheetWatch = useRef<(() => void) | null>(null)
  useEffect(() => () => sheetWatch.current?.(), [])
  const whenSheetCloses = (then: () => void) => {
    const key = useApp.getState().sheets.at(-1)?.key
    if (!key) return
    sheetWatch.current?.()
    const unsub = useApp.subscribe((st) => {
      if (st.sheets.some((x) => x.key === key)) return
      unsub()
      sheetWatch.current = null
      then()
    })
    sheetWatch.current = unsub
  }

  /** Puts the caret back where it was and the keyboard up (after a sheet). */
  const restoreFocus = () => {
    const root = editorRef.current
    if (!root) return
    root.focus()
    const r = savedRange.current
    const sel = document.getSelection()
    if (r && sel && root.contains(r.startContainer)) {
      sel.removeAllRanges()
      sel.addRange(r)
    } else caretToEnd(root)
    refresh()
  }

  const openEmoji = () => {
    rememberSelection()
    dismissKeyboard()
    // the sheets area's picker; picking inserts the emoji at the caret (ComposerEmojiPlugin.swift:53-54;
    // ComposerToolbarInteractor.swift:321-322), and the text view gets the keyboard back when the picker closes
    presentSheet('emoji-picker', {
      onPick: (name: string) => {
        const root = editorRef.current
        const img = emojiEl(name.replace(/^:|:$/g, ''))
        if (!root || !img) return
        let r = savedRange.current
        if (!r || !root.contains(r.startContainer)) {
          r = document.createRange()
          const last = root.lastElementChild ?? root
          r.selectNodeContents(last)
          r.collapse(false)
          if (last.lastChild instanceof HTMLBRElement) r.setStartBefore(last.lastChild)
        }
        r.deleteContents()
        r.insertNode(img)
        const after = document.createRange()
        after.setStartAfter(img)
        after.collapse(true)
        savedRange.current = after
        refresh()
        saveDraft()
      },
    })
    whenSheetCloses(() => setTimeout(restoreFocus, 0))
  }

  const openPlus = () => {
    rememberSelection()
    dismissKeyboard()
    presentSheet('composer-plus', {
      conversationId,
      slackbot: isSlackbot,
      onAttach: (picked: FileAttachment[]) => {
        setFiles((prev) => [...prev, ...picked.filter((f) => !prev.some((p) => p.id === f.id))])
        // adding the first attachment forces the expanded composer (ComposerToolbarInteractor.swift:297-304)
        setTimeout(focusEditor, 0)
      },
    })
  }

  const format = (what: Mark | LineKind | 'indent' | 'outdent' | 'link') =>
    withEditor((root) => {
      if (what === 'indent' || what === 'outdent') shiftIndent(root, what === 'indent' ? 1 : -1)
      else if (what === 'link') {
        const r = selectionRange(root)
        if (!r) return
        const a = (r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement)?.closest('a.cmp-link')
        const saved = r.cloneRange()
        presentSheet('composer-link', {
          label: a ? a.textContent : r.toString(),
          url: a ? a.getAttribute('href') : '',
          isEdit: !!a,
          onDone: (result: { label: string; url: string } | 'remove' | null) =>
            withEditor((ed) => {
              const sel = document.getSelection()!
              sel.removeAllRanges()
              sel.addRange(saved)
              if (result === 'remove') removeLink(ed, saved)
              else if (result) setLink(ed, saved, result.label, result.url)
            }),
        })
      } else if (what === 'b' || what === 'i' || what === 'u' || what === 's' || what === 'code') toggleMark(root, what, formats[what])
      else toggleLineKind(root, what)
    })

  // ---------------------------------------------------------------------------------------- full screen

  /** The full-screen height: from the safe-area top to the composer's bottom (ComposerLongformContainerView.swift:317-380). */
  const fullHeight = () => {
    const root = rootRef.current!
    const screen = root.closest('.ios-screen') as HTMLElement | null
    if (!screen) return cardH
    const sbox = screen.getBoundingClientRect()
    const scale = sbox.width / screen.offsetWidth || 1
    const safeTop = parseFloat(getComputedStyle(screen).getPropertyValue('--safe-top')) || 0
    return (root.getBoundingClientRect().bottom - sbox.top) / scale - safeTop
  }
  const toggleLongform = () => {
    if (longform) return setLongform(false)
    setLongH(fullHeight())
    setLongform(true)
  }

  // dragging the handlebar area moves between the two; a release faster than 5 pt/s goes its way, else past half
  // (10 % when no speed was measured) (ComposerLongformContainerView.swift:18-23, :254-285)
  const handle = useRef<{ y0: number; h0: number; min: number; max: number; t: number; v: number; y: number; id: number; moved: boolean } | null>(null)
  const onHandleDown = (e: React.PointerEvent) => {
    keepFocus(e)
    const card = cardRef.current!
    const scale = card.getBoundingClientRect().height / card.offsetHeight || 1
    const max = longform ? longH : fullHeight()
    handle.current = { y0: e.clientY / scale, h0: card.offsetHeight, min: stackH, max, t: performance.now(), v: 0, y: e.clientY / scale, id: e.pointerId, moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onHandleMove = (e: React.PointerEvent) => {
    const d = handle.current
    const card = cardRef.current
    if (!d || !card || d.id !== e.pointerId) return
    const scale = card.getBoundingClientRect().height / card.offsetHeight || 1
    const y = e.clientY / scale
    const now = performance.now()
    if (now > d.t) d.v = (y - d.y) / (now - d.t)
    d.t = now
    d.y = y
    if (!d.moved && Math.abs(y - d.y0) < 4) return
    d.moved = true
    card.style.transition = 'none'
    card.style.height = `${Math.max(d.min, Math.min(d.max, d.h0 - (y - d.y0)))}px`
  }
  const onHandleUp = () => {
    const d = handle.current
    const card = cardRef.current
    handle.current = null
    if (!d || !card) return
    if (!d.moved) return toggleLongform()
    const h = card.offsetHeight
    card.style.transition = ''
    card.style.height = ''
    const progress = (h - d.min) / Math.max(1, d.max - d.min)
    const speed = -d.v * 1000 // pt/s, upward positive
    const up = Math.abs(speed) > 5 ? speed > 0 : progress > (d.v === 0 ? 0.1 : 0.5)
    if (up) {
      setLongH(d.max)
      setLongform(true)
    } else setLongform(false)
  }

  // ---------------------------------------------------------------------------------------- gestures

  // swipe up on the collapsed composer focuses it; swipe down on the focused one (text at its top) resigns
  // (ComposerInteractor.swift:412-419, ComposerViewController.swift:812-817)
  const swipe = useRef<{ y: number; id: number } | null>(null)
  const onCardPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button, [data-scroll-x], .cmp-editor')) return
    swipe.current = { y: e.clientY, id: e.pointerId }
  }
  const onCardPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current
    if (!s || s.id !== e.pointerId) return
    const box = rootRef.current!.getBoundingClientRect()
    const dy = (e.clientY - s.y) / (box.width / rootRef.current!.offsetWidth || 1)
    if (dy < -24 && !focused) {
      swipe.current = null
      focusEditor()
    } else if (dy > 24 && focused && (editorRef.current?.scrollTop ?? 0) <= 0) {
      swipe.current = null
      if (longform) setLongform(false)
      else editorRef.current?.blur()
    }
  }
  const onCardPointerUp = () => {
    swipe.current = null
  }

  // ---------------------------------------------------------------------------------------- render

  const collapsed = !focused
  const style = collapsed ? 'collapsed' : 'standard'
  // right side (ComposerToolbarLayoutManager.swift:163-202): send once there's content (or while focused / editing),
  // else the microphone; in collapsed with attachments and no text, the count chip then send
  const showSend = !collapsed || canSend
  const showChip = collapsed && !editTarget && blank && files.length > 0
  // the label ends 8 pt before the right-hand items; a lone send reserves 36 + 12 (ComposerToolbarView.swift:319-327;
  // ComposerToolbarContainerView.swift:29-31, :393-399); the items sit 4 pt in from the collapsed capsule's edge
  // (Sept: ComposerGlassGeometry.swift:56-64), 8 in June's card
  const inset = contextBarLayout ? 4 : 8
  const labelRight = rightW ? inset + rightW + (showSend && !showChip && !editTarget ? 12 : 8) : 8

  const acStyle = ac ? { bottom: ac.place.bottom } : {}

  return (
    <div
      ref={rootRef}
      className={['cmp', `cmp--${style}`, !contextBarLayout && 'cmp--legacy', focused && 'is-focused', focused && mode === 'format' && 'is-formatting', longform && 'is-longform', !!legacyTypers && 'has-banner', editTarget && 'is-editing']
        .filter(Boolean)
        .join(' ')}
      data-qa="composer"
    >
      {ac && ac.rows.length > 0 && ac.place.maxHeight > 40 && (
        <AutocompleteCard rows={ac.rows} highlighted={ac.hi} onPick={pick} style={acStyle} maxHeight={ac.place.maxHeight} query={`${ac.opp.type}${ac.opp.query}`} />
      )}
      {barPhase !== 'out' && (showContextBar ? bar : lastBar.current) && (
        <div className={`cmp-context${barPhase === 'leaving' ? ' is-leaving' : ''}`} ref={ctxRef}>
          <ContextBar state={(showContextBar ? bar : lastBar.current)!} />
        </div>
      )}
      <div ref={cardRef} className="cmp-card glass" style={{ height: longform ? longH : cardH }} onPointerDown={onCardPointerDown} onPointerMove={onCardPointerMove} onPointerUp={onCardPointerUp} onPointerCancel={onCardPointerUp}>
        <div className="cmp-stack" ref={stackRef}>
          {legacyTypers && <TypingBanner users={legacyTypers} />}
          <div className="cmp-contents">
            {/* 20 pt handlebar area, its pill invisible on iOS 26; tapping it toggles the full-screen composer (§2.3) */}
            <button
              type="button"
              className="cmp-handle"
              aria-label={longform ? 'Collapse input' : 'Expand input'}
              tabIndex={collapsed ? -1 : 0}
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              // keyboard activation (a pointer tap is handled on pointer up)
              onClick={(e) => e.detail === 0 && toggleLongform()}
            />
            {threadTs && !collapsed && <SendToChannel conv={conv} checked={alsoSend} onToggle={() => setAlsoSend((v) => !v)} />}
            <div className="cmp-input">
              {empty && (
                <div className="cmp-input__placeholder" aria-hidden>
                  {ph}
                </div>
              )}
              <div
                ref={editorRef}
                className="cmp-editor"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline
                aria-label="Message"
                spellCheck={false}
                autoCapitalize="sentences"
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onInput={onInput}
                onPaste={onPaste}
                onDrop={(e) => e.preventDefault()}
                data-qa="message_input"
              />
            </div>
            {!collapsed && files.length > 0 && <AttachmentsTray files={files} onRemove={(id) => setFiles((f) => f.filter((x) => x.id !== id))} />}
            <div className="cmp-toolbar">
              {/* collapsed: [+] placeholder or draft … (ComposerToolbarView.swift:161-200, :621-646) */}
              <div className="cmp-row cmp-row--collapsed" aria-hidden={!collapsed}>
                <ToolButton icon="plus" look="plus" label="Attachments and shortcuts" onPress={openPlus} className="cmp-row__first" />
                <div
                  className={`cmp-label${preview ? ' is-draft' : ''}`}
                  style={{ right: labelRight }}
                  role="textbox"
                  aria-label="Message"
                  onPointerDown={keepFocus}
                  onClick={focusEditor}
                >
                  {preview ? <span className="cmp-label__text" dangerouslySetInnerHTML={{ __html: preview }} /> : <span className="cmp-label__text">{ph}</span>}
                </div>
              </div>
              {/* focused: [+][Aa][☺][@][/] (ComposerToolbarLayoutManager.swift:200-223 [Sept]); Slackbot's DM with Slackbot AI on
                  (the demo's): just "+", its voice button behind slackbotVoiceTranscription (off) (:205-217) */}
              <div className="cmp-row cmp-row--expanded" aria-hidden={collapsed || mode !== 'normal'}>
                <div className="cmp-scroll" data-scroll-x>
                  {!editTarget && <ToolButton icon="plus" look="plus" label="Attachments and shortcuts" onPress={openPlus} />}
                  {!isSlackbot && (
                    <>
                      <ToolButton icon="formatting" label="Show formatting" onPress={() => setMode('format')} />
                      <ToolButton icon="emoji" label="Emoji picker" onPress={openEmoji} />
                      <ToolButton icon="mentions" label="Mention someone" onPress={() => insertTrigger('@')} />
                      {/* "/" is the send button's opposite: disabled while there's text or a file (ComposerToolbarInteractor.swift:446-456 [Sept]) */}
                      {!editTarget && <ToolButton icon="slash_box" label="Run a slash command or workflow." disabled={canSend} onPress={() => insertTrigger('/')} />}
                    </>
                  )}
                </div>
              </div>
              {/* formatting: [×] B I U S link 1. • ❝ (→ ←) </> ▭ (ComposerToolbarLayoutManager.swift:261-299 [Sept]): Quote
                  before the list-only Indent / Outdent, then code and code block */}
              <div className="cmp-row cmp-row--format" aria-hidden={collapsed || mode !== 'format'}>
                <ToolButton icon="close" look="close-format" label="Dismiss formatting toolbar" onPress={() => setMode('normal')} className="cmp-row__first" />
                <div className="cmp-scroll cmp-scroll--format" data-scroll-x>
                  <ToolButton icon="bold" look="format" label="Bold text formatting" selected={formats.b} onPress={() => format('b')} />
                  <ToolButton icon="italic" look="format" label="Italics text formatting" selected={formats.i} onPress={() => format('i')} />
                  <ToolButton icon="underline" look="format" label="Underline text formatting" selected={formats.u} onPress={() => format('u')} />
                  <ToolButton icon="strikethrough" look="format" label="Strike-through text formatting" selected={formats.s} onPress={() => format('s')} />
                  {/* disabled without a link opportunity (ComposerToolbarInteractor.swift:522-550 [Sept]) */}
                  <ToolButton icon="link" look="format" label="Link text formatting" selected={formats.link} disabled={!formats.linkable} onPress={() => format('link')} />
                  <ToolButton icon="numbered_list" look="format" label="Numbered list text formatting" selected={formats.kind === 'ol'} onPress={() => format('ol')} />
                  <ToolButton icon="bulleted_list" look="format" label="Bullet list text formatting" selected={formats.kind === 'ul'} onPress={() => format('ul')} />
                  <ToolButton icon="quote" look="format" label="Quoted text formatting" selected={formats.kind === 'q'} onPress={() => format('q')} />
                  {(formats.kind === 'ul' || formats.kind === 'ol') && (
                    <>
                      <ToolButton icon="indent_left" look="format" label="Indent selected list items by a single level" onPress={() => format('indent')} />
                      <ToolButton icon="indent_right" look="format" label="De-dent selected list items by a single level" onPress={() => format('outdent')} />
                    </>
                  )}
                  <ToolButton icon="code" look="format" label="Code text formatting" selected={formats.code} onPress={() => format('code')} />
                  <ToolButton icon="code_block" look="format" label="Pre-formatted text formatting" selected={formats.kind === 'pre'} onPress={() => format('pre')} />
                </div>
              </div>
              {/* the right side (ComposerToolbarContainerView.swift:340-411) */}
              <div className="cmp-right" ref={rightRef}>
                {showChip && !streaming && <AttachmentChip count={files.length} onPress={focusEditor} />}
                {editTarget && <ToolButton icon="close" look="cancel" label="Cancel" onPress={cancelEdit} />}
                {streaming ? (
                  <ToolButton icon="stop_filled" look="stop" label="Stop Response" onPress={onStop} />
                ) : showSend ? (
                  editTarget ? (
                    <ToolButton icon="check" look="send" label="Save" onPress={send} />
                  ) : (
                    <ToolButton
                      icon="send_filled"
                      look={canSend ? 'send' : 'send-disabled'}
                      label="Send"
                      onPress={send}
                      onLongPress={canSend ? () => showToast('Not in the prototype') : undefined}
                    />
                  )
                ) : isSlackbot ? null : (
                  <ToolButton icon="microphone" selectedIcon="microphone_filled" look="mic" label="Record audio clip" onPress={() => showToast('Not in the prototype')} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** For prototypes and tests: the composer's drafts, by `${conversationId}/${threadTs ?? ''}`. */
export const composerDrafts = drafts

/**
 * A slash command: an app's (App Kit handles it and replies), else one of Slack's own. The prototype runs /shrug; the
 * others say they aren't in the prototype. Commands are never posted as messages.
 */
function runCommand(conversationId: string, text: string, threadTs?: string) {
  if (runSlashCommand(conversationId, text, threadTs)) return
  const [name, ...rest] = text.split(/\s+/)
  const app = useApp.getState()
  if (name === '/shrug') return app.sendMessage(conversationId, `${rest.join(' ')} ¯\\\\_(ツ)_/¯`.trim(), threadTs)
  app.showToast(COMMANDS.some((c) => c.name === name) ? `${name} isn’t in the prototype` : `${name} is not a valid command`)
}

/** 'in' while shown, 'leaving' for `ms` after it hides (so it can animate out), then 'out'. */
function useLeavingPhase(visible: boolean, ms: number): 'in' | 'leaving' | 'out' {
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
