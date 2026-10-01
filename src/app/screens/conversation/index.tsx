import { useEffect, useState } from 'react'
import { registerScreen } from '../../nav/registry'
import { useApp, type Route } from '../../store'
import { Composer } from '../../composer/Composer'
import { ConversationNavBar } from './ConversationNavBar'
import { NAVBAR_BOTTOM } from '../../nav/NavBar'
import { MessageList } from './MessageList'
import { AppAbout, AppHome, AppTabBar, appTabs, initialAppTab, type AppTab } from './AppPages'
import './conversation.css'

// A conversation: channel, DM, group DM or app DM (AnyConversationViewController, spec messages.md §10.1). The page is
// pinned to the top of the view so the list runs under the glass nav bar, and to its bottom on iOS 26 so it runs under the
// composer, which floats 12 pt above the tab bar (or the keyboard) (AnyConversationViewController.swift:161-187).
// App DMs keep a visible Home / Messages / About tab bar and their page starts below it (:145-147, 292).
//
//   push({ screen: 'conversation', id })            openConversation(id) marks it read and sets the NEW line
//   push({ screen: 'conversation', id, ts })        opens at that message (a permalink) and highlights it
//   openMessage(id, ts)                              the same from Search (route.jumpTs)

function ConversationScreen({ route }: { route: Route }) {
  const id = route.id as string
  const conv = useApp((s) => s.fx.conversations[id])
  const hasHome = useApp((s) => !!(conv?.userId && s.fx.apps?.[conv.userId]?.home?.length))
  const markRead = useApp((s) => s.markRead)
  const [composerHeight, setComposerHeight] = useState(60)
  const [scrolled, setScrolled] = useState(false)
  // App DMs start on a deep-linked tab (a prototype's `appTab`), else on Messages when there were unreads (the NEW line)
  // or a linked message, else on Home (blockkit.md §8)
  const [appTab, setAppTab] = useState<AppTab>(() => {
    const s = useApp.getState()
    const user = conv?.userId ? s.fx.users[conv.userId] : undefined
    return initialAppTab({
      linked: route.appTab as AppTab | undefined,
      hasHome,
      unreadOrLinked: s.newMarker?.conversationId === id || !!route.ts || !!route.jumpTs,
      isAgent: !!user?.isAgent,
    })
  })
  const isApp = conv?.type === 'app'

  useEffect(() => {
    // Opening a conversation reads it (the read-state plugin); openConversation already did when it pushed this screen
    markRead(id)
  }, [id, markRead])

  if (!conv) return <MissingConversation />
  const showMessages = !isApp || appTab === 'messages'
  return (
    <div className={`ios-pushed-screen convo${isApp ? ' convo--app' : ''}`} data-screen="conversation" data-conversation={id}>
      {isApp ? (
        <>
          <AppTabBar tabs={appTabs(hasHome)} current={appTab} onSelect={setAppTab} />
          <div className="convo-page">
            {appTab === 'messages' && <MessageList conversationId={id} composerHeight={composerHeight} topInset="0px" focusTs={(route.jumpTs ?? route.ts) as string | undefined} />}
            {appTab === 'home' && <AppHome conversationId={id} />}
            {appTab === 'about' && <AppAbout conversationId={id} />}
          </div>
        </>
      ) : (
        <MessageList conversationId={id} composerHeight={composerHeight} topInset={NAVBAR_BOTTOM} focusTs={(route.jumpTs ?? route.ts) as string | undefined} onScrolled={setScrolled} />
      )}
      <ConversationNavBar conversationId={id} scrolled={scrolled} />
      {showMessages && <Composer conversationId={id} onHeight={setComposerHeight} />}
    </div>
  )
}

/** The conversation isn't in the workspace: "We’re unable to open this link." (AnyConversationPresenter.swift:393-398) */
function MissingConversation() {
  return (
    <div className="ios-pushed-screen convo convo--missing">
      <ConversationNavBar conversationId="" />
      <div className="convo-empty">
        <div className="convo-empty__title">We’re unable to open this link.</div>
        <div className="convo-empty__body">This link opens a message or conversation that you don’t have access to.</div>
      </div>
    </div>
  )
}

registerScreen('conversation', ConversationScreen)
