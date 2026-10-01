import { useMemo, useState } from 'react'
import { useApp, type Route } from '../../store'
import { BackButton, ConvoBar } from '../conversation/ConversationNavBar'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { MKMessagePreview, mkPreviewContent, mkTimestamp } from '../../../messagekit/MKMessagePreview'
import { displayName } from '../../../messagekit/format'
import { openMenu } from '../../sheets/ui/Menu'
import { toast } from '../../ui/Toast'
import type { Message } from '../../../data/types'
import { TitlePill, useScreenConversation } from './shared'
import placeholderPinning from './assets/placeholder_pinning@3x.png'
import './pins.css'

// The conversation's Pins page (spec channels-people.md §6; PI/ = Modules/Features/PinnedItems/Implementation). On iOS 26
// it's a page of the conversation (server tab `bookmarks`, ConversationTabsBuilder.swift:181-183); the header shows the
// page: pin_filled, the name, "Pins" (ConversationHeaderPresentationObject.swift:250-290), no huddle button. One list of
// message pins, newest first, with row separators (PI/PinnedItemsPresenter.swift:60-63): MKMessagePreview rows — the
// author's avatar and bold name, the time in the absolute style, the text summarized to 2 lines, files as the preview
// strip; no reactions (:79-115). A tap opens the message (a reply in its thread) highlighted (PI/PinnedItemsInteractor
// .swift:109-125); a long press offers "Unpin from Conversation" (presenter :116-124). No pins: the placeholder_pinning
// illustration and "Pin important items by tapping the message or file, then tapping "…"" on baseSecondary
// (:47-58).
//
//   push({ screen: 'conversation-pins', conversationId })

interface Pin {
  message: Message
  /** a thread reply's parent */
  threadTs?: string
}

export function PinsScreen({ route }: { route: Route }) {
  const id = useScreenConversation(route)
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => (id ? s.messages[id] : undefined))
  const threads = useApp((s) => s.threads)
  const [scrolled, setScrolled] = useState(false)

  // The clone keeps who pinned a message, not when: newest message first stands in for newest pin first
  // (pins sorted by `created`, PinsDataProvider.swift:73).
  const pins = useMemo(() => {
    if (!id) return [] as Pin[]
    const list: Pin[] = (messages ?? []).filter((m) => m.pinnedBy).map((message) => ({ message }))
    for (const [key, replies] of Object.entries(threads)) {
      const [cid, parent] = key.split('/')
      if (cid !== id) continue
      for (const m of replies) if (m.pinnedBy && m.ts !== parent) list.push({ message: m, threadTs: parent })
    }
    return list.sort((a, b) => parseFloat(b.message.ts) - parseFloat(a.message.ts))
  }, [id, messages, threads])

  if (!id || !fx.conversations[id])
    return (
      <div className="ios-pushed-screen pins" data-screen="conversation-pins">
        <ConvoBar leading={<BackButton />} />
      </div>
    )

  // a reply pushes its thread at the message; anything else pushes the conversation at it, highlighted
  // (PI/PinnedItemsInteractor.swift:109-125; PinnedItemsFeature.swift:94-114)
  const open = (p: Pin) => {
    const s = useApp.getState()
    if (p.threadTs) s.push({ screen: 'thread', conversationId: id, ts: p.threadTs, jumpTs: p.message.ts })
    else s.openMessage(id, p.message.ts, { tab: s.tab })
  }
  // "Unpin from Conversation" (`unpin_item_prompt`, yaml:21092) with pin.svg: unpins at once, then "Pinned item removed"
  // (yaml:13955) with toast_checkmark (PinnedItemsFeature.swift:115-123; NetworkingIntegration/…/PinMessageAction.swift:112-115)
  const menu = (p: Pin, el: HTMLElement) =>
    openMenu({
      anchor: el,
      sections: [
        {
          items: [
            {
              title: 'Unpin from Conversation',
              icon: 'pin',
              onSelect: () => {
                useApp.getState().togglePin(id, p.message.ts)
                toast({ text: 'Pinned item removed', image: 'toast_checkmark' })
              },
            },
          ],
        },
      ],
    })

  return (
    <div className="ios-pushed-screen pins" data-screen="conversation-pins">
      <div className={`ios-scroll pins__list${pins.length ? '' : ' is-empty'}`} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        {pins.length === 0 ? (
          // `pin_how_to_by_tapping_ellipsis` (yaml:14750), no title, on baseSecondary (PI/PinnedItemsPresenter.swift:48-59;
          // June .sk_foreground_min_solid, #212428 in dark)
          <SKEmptyState className="pins__empty" content={{ image: placeholderPinning }} body={'Pin important items by tapping the message or file, then tapping "…"'} backgroundColor="var(--dt_color_base_secondary)" />
        ) : (
          pins.map((p) => {
            const u = fx.users[p.message.userId]
            const content = mkPreviewContent(p.message)
            return (
              <div key={p.message.ts} className="pins__row">
                <MKMessagePreview
                  ornament={<SKMemberAvatar src={u?.avatar} name={u?.realName ?? displayName(u)} size="large" />}
                  primaryText={displayName(u)}
                  timestamp={mkTimestamp(p.message.ts, 'absolute')}
                  body={content.body}
                  bodyLines={2}
                  files={content.files}
                  onClick={() => open(p)}
                  onLongPress={(el) => menu(p, el)}
                  data-qa="pinned_message"
                />
              </div>
            )
          })
        )}
        <div className="pins__end" />
      </div>
      <ConvoBar leading={<BackButton />} scrolled={scrolled} title={<TitlePill conversationId={id} page={{ icon: 'pin_filled', title: 'Pins' }} />} />
    </div>
  )
}
