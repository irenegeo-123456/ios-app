import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp, useMe } from '../../store'
import { GlassButton, RootNavBar } from '../../nav/NavBar'
import { sheetDef } from '../../nav/registry'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { useTheme } from '../../../theme/ThemeStyle'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKEmptyState } from '../../../slackkit/SKEmptyState'
import { SKPillButton } from '../../../slackkit/SKPillButton'
import { SKButton } from '../../../slackkit/SKButton'
import { SKBadge } from '../../../slackkit/SKBadge'
import { SKHeaderEntity } from '../../../slackkit/SKEntities'
import { ClearButton } from '../../../slackkit/SKTextField'
import { openMenu } from '../../sheets/ui/Menu'
import { SectionFooter } from '../more/EntityRow'
import { useSearch } from './state'
import { FilterBar } from './FilterBar'
import { AiAnswerCard, wantsAiAnswer } from './AiAnswerCard'
import { CompactConversationRow, CompactFileRow, CompactUserRow, EchoRow, GenericChannelRow, GenericFileRow, LoadingRow, PlaceRow, RecentSearchRow, ResultRow, unfilledFileIcon } from './rows'
import { autocomplete, conversationTitle, isPromoted, recentlyVisitedPlaces, search, SORT_TITLES, supportsSort, type AutocompleteItem, type SearchFile, type SearchItem, type SearchSort } from './searchIndex'
import { SKGroupAvatar } from '../../../slackkit/SKGroupAvatar'
import './search.css'

// The Search tab on iOS 26 (spec search-slackbot-huddles.md §1.1-1.5; SearchViewController.swift, SearchBarCoordinator.swift,
// FindViewController.swift, SearchContent plugins). Top to bottom:
//
//   the themed header gradient (SKGradientView, primaryNavigationHeaderStyle) from the top of the screen to the
//   safe-area top, which here is below the navigation bar and its search field (SearchViewController.swift:119-128)
//     the bar: "Search" in Lato Black 22 (theme contentInversePrimary), your avatar on the right (→ You)
//     the search field: the system UISearchController, always visible (hidesSearchBarWhenScrolling = false,
//     :130-144): "Search" placeholder, Lato 17 text, a close button while it's active (→ back to the previous tab)
//   the filter bar, results only, hiding with the scroll (§1.4)
//   the content: zero state → autocomplete while typing → results after Return (§1.2-1.5), on basePrimary
//
// The field's placement and glass are UIKit's (not in Slack's source, no snapshot). The Search tab's selected image (a
// circle behind the glyph, CompactRootTabBarController.swift:267-289, :1189-1194) shows the tab bar keeps its Search
// button while the tab is selected, so the field isn't the tab bar's bottom search field: it's the navigation item's,
// stacked under the title while idle. While it's editing, iOS 26 floats it above the keyboard: Slack raises the
// feedback pill by "the height of the search bar, so the feedback button floats above it" only when the keyboard is up
// on Liquid Glass (AutocompleteFeedbackButtonEmbeddable.swift:48-55, :85: 44 pt; June: SearchContentFeedbackButtonDrawerEmbeddable.swift), and the view's safe area
// is then just the status and navigation bars (113 pt, SearchViewController.swift:108-111).

/** filterViewFrameHeight (FindViewController.swift:168) */
const FILTER_H = 58

export function SearchScreen() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const s = useSearch()
  const listRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(Date.now())
  const [editing, setEditing] = useState(false)

  // Loading: re-render when the skeleton time is up.
  useEffect(() => {
    if (s.loadingUntil <= Date.now()) return
    const t = setTimeout(() => setNow(Date.now()), s.loadingUntil - Date.now() + 10)
    return () => clearTimeout(t)
  }, [s.loadingUntil])
  const loading = s.content === 'results' && s.loadingUntil > now

  const input = { fx, messages, threads }
  const results = useMemo(
    () => (s.content === 'results' ? search(input, s.query, s.resultType, s.filters, s.sort) : []),
    [s.content, s.query, s.resultType, s.filters, s.sort, fx, messages, threads], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---- the filter bar slides away with the content and snaps at half its height (FindViewController.swift:1160-1294)
  const [filterOffset, setFilterOffset] = useState(0)
  const [settling, setSettling] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const lastY = useRef(0)
  const settle = useRef(0)
  useEffect(() => {
    setFilterOffset(0)
    setScrolled(false)
    listRef.current?.scrollTo({ top: 0 })
    lastY.current = 0
  }, [s.content, s.query, s.resultType])
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = (e.target as HTMLElement).scrollTop
    const dy = y - lastY.current
    lastY.current = y
    if (y > 4 && document.activeElement?.closest('.search-field')) dismissKeyboard() // keyboardDismissMode = .onDrag
    if (s.content !== 'results') return
    if (y > 0 && !scrolled) setScrolled(true)
    setSettling(false)
    setFilterOffset((o) => Math.min(FILTER_H, Math.max(0, y <= 0 ? 0 : o + dy)))
    clearTimeout(settle.current)
    // scrolling ended: snap shown or hidden at half height with the default spring (smooth, 0.4 s)
    settle.current = window.setTimeout(() => {
      setSettling(true)
      setFilterOffset((o) => (lastY.current <= 0 ? 0 : o > FILTER_H / 2 ? FILTER_H : 0))
    }, 140)
  }

  const openResult = (item: SearchItem) => {
    const app = useApp.getState()
    dismissKeyboard()
    switch (item.kind) {
      case 'message':
        app.openMessage(item.conversationId, item.ts, { tab: 'search', threadTs: item.threadTs })
        break
      case 'dm':
      case 'channel':
        app.openConversation(item.kind === 'dm' ? item.conversationId : item.conversation.id, { tab: 'search' })
        break
      case 'person':
        app.push({ screen: 'profile', userId: item.user.id }, 'search')
        break
      case 'file':
        openFile(item.file)
        break
    }
  }

  let content
  if (s.content === 'zero') content = <ZeroState />
  else if (s.content === 'autocomplete') content = <Autocomplete />
  else if (loading)
    content = (
      <>
        {s.resultType === 'messages' && wantsAiAnswer(s.query) && <AiAnswerCard query={s.query} />}
        {Array.from({ length: 20 }, (_, i) => (
          <LoadingRow key={i} />
        ))}
      </>
    )
  else if (!results.length)
    content = (
      <>
        {s.resultType === 'messages' && wantsAiAnswer(s.query) && <AiAnswerCard query={s.query} />}
        <div className="search-empty">
        <SKEmptyState
          // SearchContentSearchResultsPluginPresenter.swift:161-184: 👍, "Nothing turned up", the body, primary "Edit search"
          content={{ emoji: '+1' }}
          title="Nothing turned up"
          body="You may want to try using different keywords or checking for typos."
          buttons={[{ title: 'Edit search', buttonStyle: 'primary', onClick: () => s.requestFocus() }]}
          backgroundColor="transparent"
        />
        </div>
      </>
    )
  else
    content = (
      <>
        {s.resultType === 'messages' && wantsAiAnswer(s.query) && <AiAnswerCard query={s.query} />}
        <ResultsHeader count={results.length} />
        <section className="search-results" data-qa="search_results">
          {results.map((item) => (
            <div key={item.key} className="search-results__row">
              <ResultRow fx={fx} item={item} onOpen={openResult} />
            </div>
          ))}
        </section>
        <SectionFooter />
      </>
    )

  return (
    <div className={`ios-root-screen search${editing ? ' is-editing' : ''}`} data-screen="search">
      <SearchHeader />
      <SearchField onEditingChange={setEditing} />
      <div className="search__body">
        <div
          ref={listRef}
          className={`ios-scroll search__list is-${s.content}`}
          style={{ paddingTop: s.content === 'results' ? FILTER_H : 8 }}
          onScroll={onScroll}
          data-qa="search_list"
        >
          {content}
          <div className="search__bottom-space" />
        </div>
        {s.content === 'results' && <FilterBar offset={filterOffset} settling={settling} />}
        {s.content === 'results' && scrolled && !loading && results.length > 0 && <FeedbackPill />}
      </div>
    </div>
  )
}

/** A file result or suggestion: canvases and lists open their viewers, anything else the file viewer (FileRoute). */
function openFile(file: SearchFile) {
  const app = useApp.getState()
  if (file.kind === 'canvas') app.push({ screen: 'canvas', canvasId: file.id }, 'search')
  else if (file.kind === 'list') app.push({ screen: 'list', listId: file.id }, 'search')
  else if (sheetDef('file-viewer')) app.presentSheet('file-viewer', { fileId: file.id, conversationId: file.conversationId, ts: file.messageTs })
  else app.push({ screen: 'file', fileId: file.id }, 'search')
}

// ------------------------------------------------------------------------------------------------ header

function SearchHeader() {
  const me = useMe()
  const theme = useTheme((t) => t.input)
  const onDark = theme.brightness >= 4
  const openYou = () => {
    // YouRoute presents the You screen modally (shell-navigation.md §4.3)
    const app = useApp.getState()
    if (sheetDef('you')) app.presentSheet('you')
    else app.push({ screen: 'you' }, 'search')
  }
  return (
    <div className={`search-header${onDark ? ' is-on-dark' : ''}`}>
      <div className="search-header__gradient" />
      <RootNavBar
        onDark={onDark}
        title="Search"
        trailing={
          // rightButtons = [user] alone (SearchInteractor.swift:100-104): its own glass circle, 74 pt with a status emoji
          <GlassButton label="Profile menu" dark={onDark} onClick={openYou} className={me.statusEmoji ? 'is-status' : undefined}>
            {me.statusEmoji && <Emoji name={me.statusEmoji} size={22} className="search-header__status" />}
            <SKMemberAvatar src={me.avatar} name={me.realName} size="smallPlus" round presence={me.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActiveInverted)" />
          </GlassButton>
        }
      />
    </div>
  )
}

function SearchField({ onEditingChange }: { onEditingChange: (editing: boolean) => void }) {
  const { text, setText, run, beginEditing, clear, exit, focusRequest, content } = useSearch()
  const theme = useTheme((t) => t.input)
  const tab = useApp((s) => s.tab)
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  // While typing: the promoted top result drives the leading icon and the Return key, and the ghost text follows the
  // caret (SearchContentAutocompletePlugin.swift:93-115, :133-160).
  const typing = focused && content === 'autocomplete'
  const top = typing ? promotedFirstItem(text) : undefined
  const ghost = typing ? ghostSuffix(text, top) : undefined
  // Over the header the field is on the themed gradient; floating above the keyboard it's on the list.
  const onDark = theme.brightness >= 4 && !focused
  useEffect(() => onEditingChange(focused), [focused, onEditingChange])

  // Entering (or reselecting) the tab focuses the field and raises the keyboard; leaving it resigns (SearchViewController.swift:84-98).
  useLayoutEffect(() => {
    if (!focusRequest) return
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 30)
    return () => clearTimeout(t)
  }, [focusRequest])
  useEffect(() => {
    if (tab !== 'search') ref.current?.blur()
  }, [tab])
  // The tab bar's Search button, tapped while Search is showing, focuses the field again.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('[data-qa="tab_search"]') && useApp.getState().tab === 'search' && !useApp.getState().stacks.search.length) useSearch.getState().requestFocus()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return (
    <div className={`search-field-row${focused ? ' is-floating' : ''}${onDark ? ' is-on-dark' : ''}`}>
      <label className={['search-field glass', onDark && 'glass--on-dark'].filter(Boolean).join(' ')}>
        <LeadingIcon item={top} />
        <span className="search-field__input-wrap">
        <input
          ref={ref}
          className="search-field__input"
          type="search"
          // .go when the leading icon isn't the search glyph (SearchBarCoordinator.swift:533-537)
          enterKeyHint={top ? 'go' : 'search'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            setFocused(true)
            beginEditing()
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              // Return goes where the arrow points: an intent-promoted first result opens, otherwise the search runs
              // (didPressGo(forceSearch: false) → handleGoButtonSelected, SearchBarCoordinator.swift:113-120,
              // FindViewController.swift:1336-1343, SearchContentAutocompletePlugin.swift:222-244; June ran the search)
              const top = promotedFirstItem(text)
              ref.current?.blur()
              if (top) openAutocompleteItem(top)
              else run()
            }
          }}
          aria-label="Search"
          data-qa="search_field"
        />
        {ghost && (
          // the ghost text: the untyped rest of "<query> – Search" (or the promoted result's "<title> – Open"), regular
          // weight in the field's font, contentTertiary, right after the typed text and clipped to the field
          // (SearchBarCoordinator.swift:402-461, GhostTextHelpers.swift:15-19, :79-87)
          <span className="search-field__ghost" aria-hidden data-qa="search_ghost_text">
            <span className="search-field__ghost-typed">{text}</span>
            {ghost}
          </span>
        )}
        </span>
        {text && focused && <ClearButton onClick={clear} normalColor={onDark ? 'var(--theme_contentInverseSecondary)' : undefined} className="search-field__clear" />}
      </label>
      {/* UISearchBar's cancel button, an xmark in a glass circle on iOS 26: exits to the previous tab (didPressCancel) */}
      <GlassButton label="Cancel" dark={onDark} className="search-field__cancel" onClick={exit}>
        <Icon name="close" size={20} />
      </GlassButton>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ zero state

/**
 * The zero state. September's tabless search always takes June's flagged order, [aiAnswers, askSlackbot?, recents,
 * recentlyVisitedPlaces, autocomplete, searchResults, feedbackButton] (SearchContentFeature+Dependencies.swift:62-74;
 * the sailExploration2AZeroStateRecents flag is gone, and with it June's default of the latest search, recent
 * conversations and "Go ahead, dig in"):
 *   "Recent searches", up to 3, the clock rows (LegacySearchContentRecentsPlugin.swift:24-27; the presenter's section
 *     header is a .medium entities header, no separators, no footer: LegacySearchContentRecentsPluginPresenter.swift:29-57)
 *   "Recently visited places", up to 30 (LegacySearchContentRecentlyVisitedPlacesPluginPresenter.swift:72-84)
 * ios_search_recents_read (off) picks the Legacy… plugins. The Ask Slackbot row needs ios_search_ask_slackbot_zero_state
 * (off). With nothing to show the list is simply empty: there's no empty state in the tabless search any more.
 */
function ZeroState() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const { recent, visited, run } = useSearch()
  const places = useMemo(() => recentlyVisitedPlaces(fx, messages, visited), [fx, messages, visited])
  const open = (id: string) => {
    dismissKeyboard()
    useApp.getState().openConversation(id, { tab: 'search' })
  }
  return (
    <>
      {recent.length > 0 && (
        <section data-qa="search_recent_searches">
          <SKHeaderEntity primaryText="Recent searches" size="medium" />
          {recent.slice(0, 3).map((q) => (
            <RecentSearchRow key={q} query={q} onClick={() => run(q)} />
          ))}
        </section>
      )}
      {places.length > 0 && (
        <section data-qa="search_recently_visited">
          <SKHeaderEntity primaryText="Recently visited places" size="medium" />
          {places.map((c) => (
            <PlaceRow key={c.id} fx={fx} conv={c} onClick={() => open(c.id)} />
          ))}
        </section>
      )}
    </>
  )
}

// ------------------------------------------------------------------------------------------------ autocomplete

/** Opens an autocomplete entity: a person's DM (started if needed), a conversation, or a file. */
function openAutocompleteItem(item: AutocompleteItem) {
  const app = useApp.getState()
  dismissKeyboard()
  if (item.kind === 'user') {
    if (item.conversationId) app.openConversation(item.conversationId, { tab: 'search' })
    else app.openConversation(app.openDm([item.user.id]), { tab: 'search' })
  } else if (item.kind === 'file') openFile(item.file)
  else app.openConversation(item.conversation.id, { tab: 'search' })
}

/**
 * The ghost text after the caret (SearchContentAutocompletePlugin.swift:100-115): with a promoted top result its title
 * from where the query matches plus " – Open", else "<query> – Search" (" – Ask" when Ask Slackbot leads, which needs
 * ios_search_slackbot_query_suggestion: off). Only the part after what's typed is drawn, and only when the ghost starts
 * with the typed text (GhostTextHelpers.suffix, case- and diacritic-insensitive). June drew it only with the
 * searchDynamicNavIntentModel flag.
 */
function ghostSuffix(text: string, top: AutocompleteItem | undefined): string | undefined {
  const q = text.trim()
  if (!q) return undefined
  let ghost = `${q} – Search` // search (yaml:17029)
  if (top) {
    const fx = useApp.getState().fx
    const title = top.kind === 'user' ? top.user.name : top.kind === 'file' ? top.file.title : conversationTitle(fx, top.conversation)
    const i = title.toLowerCase().indexOf(q.toLowerCase())
    ghost = `${i >= 0 ? title.slice(i) : q} – Open` // open_title (yaml:14112)
  }
  const fold = (x: string) => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  if (!fold(ghost).startsWith(fold(text))) return undefined
  return ghost.slice(text.length) || undefined
}

/** The field's leading view: the search glyph, or the promoted top result's avatar / icon, tinted .secondaryLabel
 *  (updateLeadingIcon, SearchBarCoordinator.swift:487-548; SearchContentAutocompletePlugin.swift:133-160). */
function LeadingIcon({ item }: { item?: AutocompleteItem }) {
  if (item?.kind === 'user')
    return <SKMemberAvatar src={item.user.avatar} name={item.user.realName} size="verySmall" presence={item.user.presence === 'away' ? 'away' : 'active'} className="search-field__icon" />
  if (item?.kind === 'mpdm') {
    const fx = useApp.getState().fx
    return <SKGroupAvatar count={(item.conversation.userIds ?? []).filter((id) => id !== fx.me).length} size={20} className="search-field__icon" />
  }
  const icon = !item ? 'search' : item.kind === 'channel' ? (item.conversation.type === 'private' ? 'lock' : 'channel') : unfilledFileIcon(item.file)
  return <Icon name={icon} size={20} className="search-field__icon" />
}

/** The first autocomplete entity when it's promoted (no modifier being typed), for Return. */
function promotedFirstItem(text: string): AutocompleteItem | undefined {
  const q = text.trim()
  if (!q || /(?:^|\s)(from|in|with):\S*$/i.test(text)) return undefined
  const { fx, messages, threads } = useApp.getState()
  const first = autocomplete({ fx, messages, threads }, q, useSearch.getState().visited)[0]
  return isPromoted(fx, first, q) ? first : undefined
}

/**
 * Autocomplete (SearchContentAutocompletePluginPresenter.swift:153-184): one section, no separators, a footer hairline
 * hidden when last. The echo row ("query · Search in Slack") comes first, or second when the first entity is promoted
 * (isIntentModelPromoted; here: its name is exactly the query). One row always carries the arrow, "Return goes here":
 * the promoted entity, else the first echo row (June needed the intent-model flag for it). Promoted entities keep the
 * compact rows; the rest are the generic rows with trailing info (:263-384).
 */
function Autocomplete() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const { text, visited, run, setFilters, setText } = useSearch()
  const q = text.trim()
  // A trailing modifier (from:, in:, with:) or @ / # narrows the suggestions and picking one applies it.
  const modifier = /(?:^|\s)((from|in|with):)?([@#]?)(\S*)$/i.exec(text)
  const mod = modifier?.[2]?.toLowerCase() as 'from' | 'in' | 'with' | undefined
  const needle = mod ? `${mod === 'in' ? '#' : '@'}${modifier?.[4] ?? ''}` : q
  const items = useMemo(() => autocomplete({ fx, messages, threads }, mod ? needle : q, visited), [fx, messages, threads, q, visited, mod, needle])
  const promoted = !mod && isPromoted(fx, items[0], q)

  const pick = (item: AutocompleteItem) => {
    if (mod && modifier) {
      // from:@name / with:@name / in:#channel become the filter chips; the token leaves the query
      const rest = text.slice(0, modifier.index).trim()
      if (mod === 'in' && (item.kind === 'channel' || item.kind === 'mpdm')) setFilters({ in: [...useSearch.getState().filters.in, item.conversation.id] })
      else if (item.kind === 'user') setFilters({ [mod === 'with' ? 'with' : 'from']: [...useSearch.getState().filters[mod === 'with' ? 'with' : 'from'], item.user.id] })
      setText(rest ? `${rest} ` : '')
      return
    }
    openAutocompleteItem(item)
  }

  const rows = items.map((item, i) => {
    const top = promoted && i === 0
    if (item.kind === 'user') {
      const conv = item.conversationId
      return (
        <CompactUserRow
          key={`u-${item.user.id}`}
          fx={fx}
          user={item.user}
          name={item.user.name}
          unread={!!(conv && fx.unreads[conv]?.count)}
          badge={conv && !item.user.isApp ? (fx.unreads[conv]?.count ?? 0) : 0}
          promoted={top}
          arrow={top}
          onClick={() => pick(item)}
        />
      )
    }
    if (item.kind === 'file')
      return top ? <CompactFileRow key={`f-${item.file.id}`} file={item.file} arrow onClick={() => pick(item)} /> : <GenericFileRow key={`f-${item.file.id}`} fx={fx} file={item.file} lines={1} onClick={() => pick(item)} />
    if (item.kind === 'mpdm' || top) return <CompactConversationRow key={`c-${item.conversation.id}`} fx={fx} conv={item.conversation} promoted={top} arrow={top} onClick={() => pick(item)} />
    const mentions = fx.unreads[item.conversation.id]?.mentions ?? 0
    return (
      <GenericChannelRow
        key={`c-${item.conversation.id}`}
        fx={fx}
        conv={item.conversation}
        lines={1}
        accessories={mentions ? <SKBadge count={mentions} className="search-badge" /> : undefined}
        onClick={() => pick(item)}
      />
    )
  })
  const echo = !mod && q ? <EchoRow key="echo" query={q} arrow={!promoted} onClick={() => run(q)} /> : null
  if (echo) rows.splice(promoted ? 1 : 0, 0, echo)
  return (
    <section className="search-autocomplete" data-qa="search_autocomplete">
      {rows}
      {/* footer: a hairline, hidden when it's the last section (SearchContentAutocompletePluginPresenter.swift:177-183) */}
    </section>
  )
}

// ------------------------------------------------------------------------------------------------ results header

/**
 * "N results found" (count in captionBold, the rest caption, contentSecondary) or "1 result found", with the sort
 * button (SKButton .systemDefault .small, chevron on the right, highlight1.content) for sortable types; a flush
 * hairline under it (+ResultsHeader.swift:16-100).
 */
function ResultsHeader({ count }: { count: number }) {
  const { resultType, sort, setSort } = useSearch()
  const sorts: SearchSort[] = ['relevant', 'newest', 'oldest']
  return (
    <>
      <div className="search-results-header" data-qa="search_results_header">
        <span className="search-results-header__count">
          {count === 1 ? (
            '1 result found'
          ) : (
            <>
              <b>{count.toLocaleString('en-US')}</b> results found
            </>
          )}
        </span>
        {supportsSort(resultType) && (
          <span
            className="search-results-header__sort"
            onClick={(e) =>
              openMenu({
                anchor: e.currentTarget.firstElementChild,
                align: 'trailing',
                sections: [{ items: sorts.map((x) => ({ title: SORT_TITLES[x], icon: x === sort ? 'check_filled' : undefined, onSelect: () => setSort(x) })) }],
              })
            }
          >
            <SKButton title={SORT_TITLES[sort]} buttonStyle="systemDefault" size="small" icon="caret_down" iconPosition="right" data-qa="search_sort" />
          </span>
        )}
      </div>
      <SectionFooter padding={false} />
    </>
  )
}

/** "Give feedback": an SKPillButton in the list's bottom drawer, once you've scrolled (SearchContentFeedbackButtonPluginPresenter.swift:16-55). */
function FeedbackPill() {
  const showToast = useApp((s) => s.showToast)
  return (
    <div className="search-feedback">
      <SKPillButton text="Give feedback" textFont="var(--sk-caption)" textColor="var(--dt_color_content_highlight_1)" size="small" onClick={() => showToast('Not in the prototype')} />
    </div>
  )
}
