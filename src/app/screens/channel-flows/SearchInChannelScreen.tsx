import { useState } from 'react'
import { useApp, type Route } from '../../store'
import { MessageList } from '../conversation/MessageList'
import { BackButton, ConvoBar } from '../conversation/ConversationNavBar'
import { FindInChannel } from '../search/FindInChannel'
import { DoneCheckButton, TitlePill, useScreenConversation } from './shared'
import './search-in-channel.css'

// Search in a conversation (spec channels-people.md §9): the conversation in find mode (FIC/ = Modules/Features/
// FindInChannel/Implementation). The find bar is a top drawer under the nav bar — the Search area's FindInChannel, its
// SKSearchBar inset 16 pt and focused, the keyboard bar with Previous / Next / the count / Show All — and the transcript
// starts below it (FIC/FindInChannelPlugin.swift:339-351; FIC/FindInChannelViewController.swift:44-51). The composer is
// gone (:150-162); the header keeps the back button and the title pill, not tappable, and shows only Done — on iOS 26 the
// system done item, a prominent checkmark circle (NewConversationHeaderHelperService.swift:402-418, 786-787). Each result
// scrolls the transcript to its message and highlights it (:308-313). Done closes find mode where you are: at the
// current result, through openMessage (NewConversationHeaderHelperService.swift:644-645).
//
// (With `ios_find_in_channel` off, its default, iOS's header-menu Search pushes the channel-scoped Search screen
// instead: SearchInChannelRoute, ConversationTabsMenuFeature.swift:185-191.)
//
//   push({ screen: 'search-in-channel', conversationId })

export function SearchInChannelScreen({ route }: { route: Route }) {
  const id = useScreenConversation(route)
  const conv = useApp((s) => (id ? s.fx.conversations[id] : undefined))
  const [jumpTs, setJumpTs] = useState<string | undefined>()
  const [scrolled, setScrolled] = useState(false)

  if (!id || !conv)
    return (
      <div className="ios-pushed-screen convo" data-screen="search-in-channel">
        <ConvoBar leading={<BackButton />} />
      </div>
    )

  // Done: find mode ends in the conversation at the current result (AnyConversationFeature.swift:600-603) — this screen
  // and the conversation under it give way to the conversation opened at that message
  const done = () => {
    const s = useApp.getState()
    const tab = s.tab
    s.pop(tab)
    if (!jumpTs) return
    const below = useApp.getState().stacks[tab].at(-1)?.route
    if (below?.screen === 'conversation' && below.id === id) useApp.getState().pop(tab)
    useApp.getState().openMessage(id, jumpTs, { tab })
  }

  return (
    <div className="ios-pushed-screen convo sic" data-screen="search-in-channel" data-conversation={id}>
      {/* each jump re-anchors the transcript at the result, highlighted (MessageList opens at focusTs) */}
      <MessageList key={jumpTs ?? 'latest'} conversationId={id} composerHeight={0} topInset="calc(var(--navbar-bottom) + 42px)" focusTs={jumpTs} onScrolled={setScrolled} />
      <FindInChannel conversationId={id} onJump={setJumpTs} />
      <ConvoBar
        leading={<BackButton />}
        scrolled={scrolled}
        title={<TitlePill conversationId={id} />}
        // Done (yaml:5777): the system done item with glass styling (HeaderHelperService.swift:229-235, 413-414)
        trailing={<DoneCheckButton onClick={done} />}
      />
    </div>
  )
}
