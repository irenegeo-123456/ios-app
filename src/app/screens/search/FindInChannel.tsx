import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../store'
import { Icon } from '../../../icons/Icon'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { plainText, tokensOf } from './searchIndex'
import { useSearch } from './state'

// Find in channel (spec search-slackbot-huddles.md §1.6; Modules/Features/FindInChannel): a top drawer over the message
// list (margin 0, FindInChannelPlugin.swift:321-345) holding an SKSearchBar pinned to its edges, "Search…", focused on
// appear (FindInChannelViewController.swift:29-70). The search bar's input accessory — on iOS 26 a 48 pt Liquid Glass
// toolbar 16 pt from the sides and 12 pt above the keyboard (SKInputAccessoryView.swift:84, :93, :204-207) — has
// Previous (chevronDown), Next (chevronUp) and the count ("Search…" while loading, "No results", "1 result found",
// "%1$d of %2$d") on the leading side and "Show All" (systemBlue) trailing (:97-174). Typing searches the conversation
// after 300 ms (searchDebounceInterval), newest first; the first result is jumped to and highlighted; Show All opens
// the full search in this channel (:176-300).
//
//   <FindInChannel conversationId={id} onJump={(ts) => scrollToAndHighlight(ts)} onClose={() => setFinding(false)} />
//
// `onJump(ts)` gets the transcript ts: a thread reply's parent (transcriptTimestamp, :219-227).

interface Props {
  conversationId: string
  /** scroll the transcript to this message and highlight it (autoDismiss) */
  onJump?: (ts: string) => void
  /** the drawer closed (Show All, or the owner's own close) */
  onClose?: () => void
}

/** searchDebounceInterval (FindInChannelPlugin.swift:10) */
const DEBOUNCE = 300

export function FindInChannel({ conversationId, onJump, onClose }: Props) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages[conversationId])
  const threads = useApp((s) => s.threads)
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [focused, setFocused] = useState(true)
  const timer = useRef(0)

  useEffect(() => {
    clearTimeout(timer.current)
    const t = text.trim()
    timer.current = window.setTimeout(() => setQuery(t), t ? DEBOUNCE : 0)
    return () => clearTimeout(timer.current)
  }, [text])
  const loading = text.trim() !== query

  // Results, newest first (sort: .timestampdesc), as transcript timestamps.
  const results = useMemo(() => {
    const tokens = tokensOf(query)
    if (!tokens.length) return [] as string[]
    const hits: { ts: string; transcriptTs: string }[] = []
    const match = (text: string) => {
      const p = plainText(fx, text).toLowerCase()
      return tokens.every((t) => p.includes(t))
    }
    for (const m of messages ?? []) if (match(m.text)) hits.push({ ts: m.ts, transcriptTs: m.ts })
    for (const [key, list] of Object.entries(threads)) {
      const [cid, parent] = key.split('/')
      if (cid !== conversationId) continue
      for (const m of list) if (m.ts !== parent && match(m.text)) hits.push({ ts: m.ts, transcriptTs: parent })
    }
    return hits.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts)).map((h) => h.transcriptTs)
  }, [query, messages, threads, fx, conversationId])

  // The first result is jumped to as soon as results land.
  useEffect(() => {
    setIndex(0)
    if (results.length) onJump?.(results[0])
  }, [results]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i: number) => {
    if (i < 0 || i >= results.length) return
    setIndex(i)
    onJump?.(results[i])
  }
  const count = loading ? 'Search…' : !query ? '' : results.length === 0 ? 'No results' : results.length === 1 ? '1 result found' : `${index + 1} of ${results.length}`
  const showAll = () => {
    // SearchInChannelRoute: the channel's search with the query run (navigateToFullSearch, :281-290)
    const q = text.trim()
    const search = useSearch.getState()
    search.setFilters({ in: [conversationId] })
    onClose?.()
    useApp.getState().setTab('search')
    if (q) search.run(q)
  }

  return (
    <>
      <div className="find-in-channel" data-qa="find_in_channel">
        <SKSearchBar
          text={text}
          onTextChanged={setText}
          placeholderText="Search…"
          autoFocus
          onBeganEditing={() => setFocused(true)}
          onEndedEditing={() => setFocused(false)}
          onClearButtonTapped={() => setText('')}
        />
      </div>
      {focused && (
        <div className="find-in-channel__accessory glass" onMouseDown={(e) => e.preventDefault()} data-qa="find_in_channel_accessory">
          <button type="button" className="find-in-channel__button" aria-label="Previous result" onClick={() => go(index - 1)} data-tap>
            <Icon name="caret_down" size={20} />
          </button>
          <button type="button" className="find-in-channel__button" aria-label="Next result" onClick={() => go(index + 1)} data-tap>
            <Icon name="caret_up" size={20} />
          </button>
          <span className="find-in-channel__count">{count}</span>
          <span className="find-in-channel__spacer" />
          <button type="button" className="find-in-channel__show-all" onClick={showAll} data-tap>
            Show All
          </button>
        </div>
      )}
    </>
  )
}
