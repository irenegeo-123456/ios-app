import { create } from 'zustand'
import { useApp, type Tab } from '../../store'
import { NO_FILTERS, type ResultType, type SearchFilters, type SearchSort } from './searchIndex'

// The Search tab's state (spec search-slackbot-huddles.md §1.1-1.5), kept out of the shared store like the web clone's
// searchStore. The content follows SearchContentState (Find/Interface/SearchContent/SearchContentState.swift:13-28):
// zeroState (empty field) → autocomplete (typing) → searchResults (Return, or a suggestion tapped).

export type ContentState = 'zero' | 'autocomplete' | 'results'

interface SearchState {
  /** what's in the field */
  text: string
  /** the query the results are for (set by run) */
  query: string
  content: ContentState
  resultType: ResultType
  sort: SearchSort
  filters: SearchFilters
  /** searches run, newest first (the zero state shows the latest: SearchContentRecentSearchesPresenter.swift:30-32) */
  recent: string[]
  /** conversations opened this session, most recent first (the history store behind Recent conversations) */
  visited: string[]
  /** the tab Search was entered from: the field's close button returns there (exitSearchToPreviousTab) */
  returnTab: Tab
  /** bumps whenever the field should take focus (entering or reselecting the tab, Edit search) */
  focusRequest: number
  /** the results are "loading" until then (ms): 20 skeleton rows (SearchContentSearchResultsPluginPresenter.swift:191-216) */
  loadingUntil: number

  setText: (text: string) => void
  /** didPressGo / a suggestion tapped: runs the search and switches to the results */
  run: (query?: string) => void
  /** the field gained focus: with text it shows the autocomplete again (didBeginEditing) */
  beginEditing: () => void
  clear: () => void
  setResultType: (type: ResultType) => void
  setSort: (sort: SearchSort) => void
  setFilters: (patch: Partial<SearchFilters>) => void
  clearFilters: () => void
  requestFocus: () => void
  /** the field's close button: clears the search and goes back to the previous tab */
  exit: () => void
}

/** How long a search "loads": long enough to see the skeleton rows, short enough not to feel slow. */
const LOADING_MS = 450

export const useSearch = create<SearchState>()((set, get) => ({
  text: '',
  query: '',
  content: 'zero',
  resultType: 'messages',
  sort: 'relevant',
  filters: NO_FILTERS,
  recent: [],
  visited: [],
  returnTab: 'home',
  focusRequest: 0,
  loadingUntil: 0,

  setText: (text) => set({ text, content: text.trim() ? 'autocomplete' : 'zero' }),
  run: (q) => {
    const query = (q ?? get().text).trim()
    if (!query) return
    set((s) => ({
      text: query,
      query,
      content: 'results',
      loadingUntil: Date.now() + LOADING_MS,
      recent: [query, ...s.recent.filter((r) => r.toLowerCase() !== query.toLowerCase())].slice(0, 10),
    }))
  },
  beginEditing: () => set((s) => ({ content: s.text.trim() ? 'autocomplete' : 'zero' })),
  clear: () => set({ text: '', content: 'zero' }),
  setResultType: (resultType) =>
    set((s) => (s.resultType === resultType ? {} : { resultType, loadingUntil: Date.now() + LOADING_MS, sort: 'relevant' })),
  setSort: (sort) => set({ sort }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch }, loadingUntil: Date.now() + LOADING_MS })),
  clearFilters: () => set({ filters: NO_FILTERS, loadingUntil: Date.now() + LOADING_MS }),
  requestFocus: () => set((s) => ({ focusRequest: s.focusRequest + 1 })),
  exit: () => {
    set({ text: '', query: '', content: 'zero', filters: NO_FILTERS, resultType: 'messages', sort: 'relevant' })
    const back = get().returnTab
    useApp.getState().setTab(back === 'search' ? 'home' : back)
  },
}))

/**
 * Leaving the tab starts a 30 s timer; coming back before it fires keeps the search as it was, after it the Search
 * stack goes back to its root, the field is cleared and the session ends, so the next visit starts at the zero state
 * (SearchFeature.swift:25-27, :144-170). June gated this behind isResetTimerEnabled (the ios_liquid_glass_search_timer
 * rollout); in September it always runs.
 */
const RESET_TIMEOUT_MS = 30_000
let resetTimer: ReturnType<typeof setTimeout> | undefined
function resetSearchSession() {
  resetTimer = undefined
  useSearch.setState({ text: '', query: '', content: 'zero', filters: NO_FILTERS, resultType: 'messages', sort: 'relevant', loadingUntil: 0 })
  useApp.getState().popToRoot('search')
}

// Follow the app: remember the tab Search was entered from, focus the field on the way in, record visited
// conversations, and start over when a prototype replaces the workspace.
useApp.subscribe((s, prev) => {
  const search = useSearch.getState()
  if (s.tab === 'search' && prev.tab !== 'search') {
    clearTimeout(resetTimer)
    resetTimer = undefined
    useSearch.setState({ returnTab: prev.tab })
    // the keyboard comes up only when the Search screen itself is on top (prepareSearchKeyboardForPresentation,
    // SearchViewController.swift:195-200)
    if (!s.stacks.search.length) search.requestFocus()
  }
  if (s.tab !== 'search' && prev.tab === 'search') {
    clearTimeout(resetTimer)
    resetTimer = setTimeout(resetSearchSession, RESET_TIMEOUT_MS)
  }
  // The tab bar's Search button pops the stack to its root (reselecting the tab), and the field takes focus again.
  if (s.tab === 'search' && prev.tab === 'search' && prev.stacks.search.length > 1 && s.stacks.search.length === 0) search.requestFocus()
  if (s.stacks !== prev.stacks) {
    const known = new Set(Object.values(prev.stacks).flat().map((e) => e.key))
    const opened = Object.values(s.stacks)
      .flat()
      .filter((e) => !known.has(e.key) && e.route.screen === 'conversation' && typeof e.route.id === 'string')
      .map((e) => e.route.id as string)
    if (opened.length) useSearch.setState((st) => ({ visited: [...opened.reverse(), ...st.visited.filter((id) => !opened.includes(id))].slice(0, 20) }))
  }
  if (s.fx.workspace !== prev.fx.workspace) useSearch.setState({ text: '', query: '', content: 'zero', filters: NO_FILTERS, recent: [], visited: [], resultType: 'messages' })
})

// For tools and the console, next to window.slack.app (src/main.tsx): slack.search.getState().run('launch').
if (typeof window !== 'undefined') {
  const w = window as unknown as { slack?: Record<string, unknown> }
  queueMicrotask(() => {
    if (w.slack) w.slack.search = useSearch
  })
}
