import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useApp, type Route } from '../../store'
import { GlassButton, GlassGroup, GlassGroupItem } from '../../nav/NavBar'
import { BackButton, ConvoBar } from '../conversation/ConversationNavBar'
import { Composer } from '../../composer/Composer'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { Icon } from '../../../icons/Icon'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKOrnamentBox } from '../../../slackkit/SKOrnamentBox'
import { SKAvatarPile } from '../../../slackkit/SKAvatarPile'
import { SlackbotAvatar } from './SlackbotAvatar'
import { SlackbotThread } from './SlackbotMessages'
import { SlackbotTabScreen } from './SlackbotTab'
import { HANGBAR_UPDATES_V2, SLACKBOT_AVATAR, SLACKBOT_DM, SLACKBOT_USER_ID } from './constants'
import { greeting, NUX_MESSAGE, NUX_PROMPTS, NUX_QUESTION, randomWelcome } from './prompts'
import { isWorking, useCurrentChat, useSlackbot } from './state'
import './slackbot.css'

// The Slackbot DM (spec search-slackbot-huddles.md §2.1-§2.5): every Slackbot conversation — opened from the Slackbot
// tab, the DM list, Home's Slackbot tile — is this one screen. Its landing page (the welcome mat) turns into a thread when
// you send a prompt; "New chat" goes back to the landing page (AnyConversationInteractor.swift:387-394). The composer is
// the conversation's, floating above the tab bar (or the keyboard). September 2026 dropped June's prompt rail and gave the
// landing page the AI disclaimer as its context bar (SlackbotAiLandingContentPlugin.swift:277-287, 352-354).
//
//   push({ screen: 'slackbot' })                 the landing page (or the thread you were in)
//   push({ screen: 'slackbot', chatId })         opens one of Slackbot's threads (History, deep links)
//   push({ screen: 'slackbot', nux: true })      the first-run welcome mat (NUX state, §2.3)
//   push({ screen: 'slackbot', entry: 'tab' })   opened from the Slackbot tab: New chat on the landing page too
//   <SlackbotScreen root />                      the Slackbot tab's root: since Sept the native landing page (SlackbotTab.tsx)

export function SlackbotScreen({ route, root, onClose }: { route?: Route; root?: boolean; onClose?: () => void }) {
  if (root) return <SlackbotTabScreen />
  return <SlackbotConversation route={route} onClose={onClose} />
}

function SlackbotConversation({ route, onClose }: { route?: Route; onClose?: () => void }) {
  const chat = useCurrentChat()
  const landingKey = useSlackbot((s) => s.landingKey)
  const ask = useSlackbot((s) => s.ask)
  const [composerH, setComposerH] = useState(60)
  const [scrolled, setScrolled] = useState(false)
  const [nux, setNux] = useState(!!route?.nux)
  const listRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  // A route can open a thread (History rows, deep links).
  useEffect(() => {
    const id = route?.chatId as string | undefined
    if (id && useSlackbot.getState().chats.some((c) => c.id === id)) useSlackbot.getState().openChat(id)
  }, [route?.chatId])

  // Moving into a thread dismisses the NUX (SlackbotAiLandingContentPlugin.swift:264-275).
  useEffect(() => {
    if (chat) setNux(false)
  }, [chat])

  // A thread keeps its newest message in view while Slackbot writes, unless you've scrolled up.
  const lastLen = chat ? chat.messages.length + (chat.messages.at(-1)?.shown ?? chat.messages.at(-1)?.text.length ?? 0) : 0
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el || !chat) return
    if (stick.current) el.scrollTop = el.scrollHeight
  }, [chat?.id, lastLen, composerH]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    stick.current = true
  }, [chat?.id])

  const onScroll = () => {
    const el = listRef.current!
    setScrolled(el.scrollTop > 0)
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  const landing = !chat
  // the disclaimer is the conversation-level context bar, so the landing page shows it and threads don't (§2.3)
  const disclaimer = landing && !HANGBAR_UPDATES_V2
  const vars = { '--sb-composer-h': `${composerH}px` } as CSSProperties
  return (
    <div className={`ios-pushed-screen sb${landing ? ' is-landing' : ''}${disclaimer ? ' has-disclaimer' : ''}`} style={vars} data-screen="slackbot">
      <div ref={listRef} className="ios-scroll sb__list" onScroll={onScroll} data-qa="slackbot_list">
        {chat ? <SlackbotThread chat={chat} /> : nux ? <NuxLanding onPrompt={ask} /> : <Landing key={landingKey} />}
      </div>
      {disclaimer && <DisclaimerBar />}
      <ConvoBar
        leading={
          onClose ? (
            // presented as a bottom sheet (the conversation header's Slackbot button): a close button, not Back
            <GlassButton label="Close" onClick={onClose} className="convo-bar-button">
              <Icon name="close" size={20} />
            </GlassButton>
          ) : (
            <BackButton />
          )
        }
        title={<TitlePill />} trailing={<HeaderButtons inThread={!!chat} fromTab={route?.entry === 'tab'} />} scrolled={scrolled} />
      <Composer conversationId={SLACKBOT_DM} placeholder="Ask Slackbot anything..." onSend={(text) => ask(text)} autoFocus={landing && !nux} onHeight={setComposerH} />
    </div>
  )
}

/**
 * The AI disclaimer, the landing page's context bar while ios_hangbar_updates_v2 is off (SlackbotAiLandingContentPlugin.swift:
 * 277-287; ContextBarSlackbotAIProcessingConfiguration.swift:41-42; SKContextBarAdapter.swift:410-418): Slackbot's avatar
 * in the extra-small pile and "Slackbot uses AI and can make mistakes." (ai_content_generated_disclaimer, yaml:1322) in
 * SKContextBar's glass capsule, 6 pt above the composer (the composer's own context-bar style, composer.css .cmp-banner--bar).
 */
function DisclaimerBar() {
  const avatar = useApp((s) => s.fx.users[SLACKBOT_USER_ID]?.avatar) ?? SLACKBOT_AVATAR
  return (
    <div className="sb-ctx cmp-context">
      <div className="cmp-banner cmp-banner--bar glass" role="status">
        <SKAvatarPile avatars={[avatar]} size="extraSmall" shouldOverlap maxAvatarCount={1} className="cmp-banner__pile" />
        <span className="cmp-banner__text">Slackbot uses AI and can make mistakes.</span>
      </div>
    </div>
  )
}

/**
 * The title: the DM's title capsule (ConversationNavigationTitleView, shell-navigation.md §3.4): Slackbot's 36 pt round
 * avatar in a 44 pt slot, 4 pt, "Slackbot" in Lato Black 15 over "Messages" (slackbot_ai_welcome_mat_title, yaml:20027)
 * in Lato 13 (ConversationHeaderPresentationObject.swift:443-456); kept in threads (shouldShowConversationTitleInThread).
 */
function TitlePill() {
  const name = useApp((s) => s.fx.users[SLACKBOT_USER_ID]?.name ?? 'Slackbot')
  return (
    <div className="sb-title glass" role="heading" aria-level={1} aria-label={name}>
      <span className="sb-title__avatar">
        <SlackbotAvatar size="large" round />
      </span>
      <span className="sb-title__text">
        <span className="sb-title__name">{name}</span>
        <span className="sb-title__subtitle">Messages</span>
      </span>
    </div>
  )
}

/**
 * Right bar buttons: Past threads (svgClock, "History") then New chat (svgCompose, "New Message"), in screen order
 * (rightButtons are leading-to-trailing since Sept 2026, HeaderBarButtonPresentable.swift:196-197, 300-306; June's array
 * was trailing-first with the same result), sharing one glass capsule. New chat shows in threads and, since September,
 * on the landing page of a conversation opened from the Slackbot tab (isThread || isBottomTab,
 * NewConversationHeaderHelperService.swift:1071, 1085); otherwise History is alone, in its own circle. Icons and labels
 * HeaderHelperService.swift:178-190; 20 pt icons in contentPrimary.
 */
function HeaderButtons({ inThread, fromTab }: { inThread: boolean; fromTab?: boolean }) {
  const presentSheet = useApp((s) => s.presentSheet)
  const newChat = useSlackbot((s) => s.newChat)
  const history = () => {
    // presenting a sheet resigns the first responder
    dismissKeyboard()
    presentSheet('slackbot-history')
  }
  if (!inThread && !fromTab)
    return (
      <GlassButton label="History" onClick={history} className="sb-bar-buttons">
        <Icon name="clock" size={20} />
      </GlassButton>
    )
  return (
    <GlassGroup className="sb-bar-buttons">
      <GlassGroupItem label="History" onClick={history}>
        <Icon name="clock" size={20} />
      </GlassGroupItem>
      <GlassGroupItem label="New Message" onClick={newChat}>
        <Icon name="compose" size={20} />
      </GlassGroupItem>
    </GlassGroup>
  )
}

/**
 * The default landing page (SlackbotAiLandingContentPlugin.swift:334-346, 423-448): one SKEmptyState row that fills the
 * list: Slackbot's large avatar (120 pt), the greeting (.title) and a welcome line (.body contentSecondary), on a clear
 * background; a new line each time the page comes on screen (:241-262).
 */
function Landing() {
  const first = useApp((s) => (s.fx.users[s.fx.me]?.realName ?? '').split(' ')[0])
  const avatar = useApp((s) => s.fx.users[SLACKBOT_USER_ID]?.avatar) ?? SLACKBOT_AVATAR
  const welcome = useMemo(() => randomWelcome(), [])
  return (
    <div className="sb-landing">
      <SKEmptyState content={{ image: avatar }} title={greeting(first)} body={welcome} backgroundColor="transparent" className="sb-landing__empty" />
    </div>
  )
}

/**
 * The first-run welcome mat (NUX, SlackbotAiLandingContentPlugin.swift:312-332, 452-524; AiComponents/SlackbotAiNuxPromptRow
 * .swift; SlackbotAiNuxPromptsView.swift:47): a Slackbot message ("now"), then four prompt rows, the list anchored to the
 * bottom. Tapping a row sends it.
 */
function NuxLanding({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="sb-nux">
      <div className="sb-msg" role="article">
        <div className="sb-msg__avatar">
          <SlackbotAvatar size="large" />
        </div>
        <div className="sb-msg__column">
          <div className="sb-msg__header">
            <span className="sb-msg__name">Slackbot</span>
            <span className="sb-msg__time">now</span>
          </div>
          <div className="rt sb-msg__text">
            <div className="rt-p">{NUX_MESSAGE}</div>
            <div className="rt-p">
              <br />
              <b className="sb-nux__question">{NUX_QUESTION}</b>
            </div>
          </div>
        </div>
      </div>
      <div className="sb-nux__prompts">
        {NUX_PROMPTS.map((p) => (
          <button key={p.text} type="button" className="sb-nux__prompt" data-tap onClick={() => onPrompt(p.text)}>
            <SKOrnamentBox ornament={{ emoji: p.emoji }} size="large" shape="circle" backgroundColor={p.circle} />
            <span className="sb-nux__label">{p.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Whether Slackbot is still writing in the chat on screen (the composer's Stop button would show, §2.4). */
export function useSlackbotStreaming() {
  const chat = useCurrentChat()
  return isWorking(chat)
}

