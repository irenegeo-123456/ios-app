import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useApp, useMe } from '../../store'
import { GlassButton, NAVBAR_BOTTOM, RootNavBar, rootTitleOpacity, useNavbarBottom } from '../../nav/NavBar'
import { openMenu } from '../../sheets'
import { useTheme } from '../../../theme/ThemeStyle'
import { Composer } from '../../composer/Composer'
import { dismissKeyboard } from '../../keyboard/Keyboard'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SLACKBOT_DM } from './constants'
import { TAB_SUGGESTIONS, tabGreeting, timeOfDay, type TabSuggestion } from './prompts'
import { historyTime } from './SlackbotSheets'
import { useSlackbot } from './state'

// The Slackbot tab (spec search-slackbot-huddles.md §2.1; September 2026, 14b3cbaf: Modules/Features/Slackbot/
// Implementation/), shown when the sim's Slackbot tab is on (iOS: ios_slackbot_bottom_tab, default off; production shows
// More instead). A native landing page, not the Slackbot DM: the root header ("Slackbot", More actions, your avatar), a
// greeting over a time-of-day wash that fills the list, and the list's bottom drawer — "Recommended for you" cards, then
// the composer with the Slackbot glow, 16 pt above the tab bar. Sending, or tapping a card, opens the Slackbot DM on the
// tab's stack, in the new thread (SlackbotFeature.swift:141-177, 287-300). June's tab embedded the DM itself.

export function SlackbotTabScreen() {
  const me = useMe()
  const chats = useSlackbot((s) => s.chats)
  const theme = useTheme((s) => s.input)
  const foreground = useApp((s) => s.foreground)
  // One seed per visit; the greeting is re-evaluated when the app comes back to the foreground (SlackbotInteractor.swift:
  // 114-121, 188-194, 282-291).
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000))
  const [scrollY, setScrollY] = useState(0)
  const [composerH, setComposerH] = useState(44)
  const [recsH, setRecsH] = useState(0)
  const [used, setUsed] = useState<string[]>([])
  const recsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLSpanElement>(null)
  const first = (me?.realName || me?.name || '').split(' ')[0] || undefined
  const greeting = useMemo(() => tabGreeting(first, seed), [first, seed, foreground]) // eslint-disable-line react-hooks/exhaustive-deps
  const tint = timeOfDay()
  // a used card is gone (SlackbotBigModeSuggestionsService.swift:48-51)
  const cards = TAB_SUGGESTIONS.filter((c) => !used.includes(c.id))

  const navbarBottom = useNavbarBottom()
  const titleOpacity = rootTitleOpacity(scrollY, navbarBottom)
  const gradientVisible = scrollY <= 32
  const onDark = theme.brightness >= 4

  // the drawer's height above the composer, for the list's bottom inset
  useLayoutEffect(() => {
    const el = recsRef.current
    if (!el) return setRecsH(0)
    const ro = new ResizeObserver((entries) => setRecsH(Math.round((entries[0]?.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight) * 100) / 100))
    ro.observe(el)
    return () => ro.disconnect()
  }, [cards.length])

  /** Opens the Slackbot DM in a new thread for `text` (SlackbotFeature.swift:160-177; the composer resigns first, :245-248). */
  const start = (text: string) => {
    dismissKeyboard()
    const sb = useSlackbot.getState()
    sb.newChat()
    sb.ask(text)
    useApp.getState().push({ screen: 'slackbot', entry: 'tab' })
  }
  const pick = (c: TabSuggestion) => {
    setUsed((u) => [...u, c.id])
    start(c.prompt)
  }
  const openThread = (id: string) => {
    useSlackbot.getState().openChat(id)
    useApp.getState().push({ screen: 'slackbot', entry: 'tab' })
  }

  /** More actions (SlackbotPresenter.swift:126-168): Skills / up to 3 recent conversations / View all conversations. */
  const showMenu = () => {
    const recent = [...chats].sort((a, b) => parseFloat(b.updated) - parseFloat(a.updated)).slice(0, 3)
    openMenu({
      anchor: menuRef.current?.closest('button') ?? menuRef.current,
      sections: [
        { items: [{ title: 'Skills', icon: 'ai_skills', onSelect: () => useApp.getState().presentSheet('slackbot-skills') }] }, // skills (yaml:19229)
        ...(recent.length
          ? [
              {
                title: 'Recent conversations', // slackbot_recent_conversations (yaml:20198)
                items: recent.map((c) => ({ title: c.title, subtitle: historyTime(c.updated), icon: 'direct_messages', onSelect: () => openThread(c.id) })),
              },
            ]
          : []),
        { items: [{ title: 'View all conversations', onSelect: () => useApp.getState().presentSheet('slackbot-history-page') }] }, // slackbot_view_all_conversations (yaml:20265)
      ],
    })
  }

  const vars = { '--sb-composer-h': `${composerH}px`, '--sb-recs-h': `${recsH}px` } as CSSProperties
  return (
    <div className="ios-root-screen sb-tab" style={vars} data-screen="slackbot-tab">
      <div className="ios-scroll sb-tab__list" style={{ paddingTop: NAVBAR_BOTTOM }} onScroll={(e) => setScrollY((e.target as HTMLElement).scrollTop)} data-qa="slackbot_tab_list">
        <div className={`root-header-gradient${gradientVisible ? '' : ' is-faded'}`} />
        {/* SlackbotGreetingRow.swift:22-159: fills the list, the greeting centered in .subtitle over the 200 pt wash */}
        <div className={`sb-greeting is-${tint}`} role="heading" aria-level={1} data-qa="slackbot_greeting_label">
          <span className="sb-greeting__text">{greeting}</span>
        </div>
      </div>
      {cards.length > 0 && (
        <div ref={recsRef} className="sb-tab__recs" data-qa="slackbot_recommendations">
          {/* slackbot_suggestions_header (yaml:20251): SKHeaderEntity .medium in contentSecondary on clear (SlackbotRecommendationsEmbeddable.swift:93-101) */}
          <div className="sb-tab__recs-header" role="heading" aria-level={2}>
            Recommended for you
          </div>
          <div className="sb-tab__cards" data-scroll-x role="list">
            {cards.map((c) => (
              <button key={c.id} type="button" className="sb-card" role="listitem" aria-label={`${c.title}, ${c.subtitle}`} data-tap onClick={() => pick(c)}>
                <span className="sb-card__ornament">
                  <Icon name={c.icon} size={18} />
                </span>
                <span className="sb-card__text">
                  <span className="sb-card__title">{c.title}</span>
                  {c.subtitle && <span className="sb-card__subtitle">{c.subtitle}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Composer conversationId={SLACKBOT_DM} draftKey={`${SLACKBOT_DM}/tab`} placeholder="Ask Slackbot anything..." onSend={(text) => start(text)} onHeight={setComposerH} />
      <RootNavBar
        onDark={onDark}
        scrolled={!gradientVisible}
        titleOpacity={titleOpacity}
        title="Slackbot"
        trailing={
          <>
            {/* svgMenu, "More actions" (more_actions, yaml:12439), then a fixed space: its own glass circle (SlackbotPresenter.swift:97-124) */}
            <GlassButton label="More actions" dark={onDark && gradientVisible} onClick={showMenu} className="sb-tab__menu">
              <span ref={menuRef} className="sb-tab__menu-anchor">
                <Icon name="menu" size={20} />
              </span>
            </GlassButton>
            <GlassButton label="Profile menu" dark={onDark && gradientVisible} onClick={() => useApp.getState().presentSheet('you')} className={me?.statusEmoji ? 'sb-tab__avatar has-status' : 'sb-tab__avatar'}>
              {me?.statusEmoji && <Emoji name={me.statusEmoji} size={22} />}
              <SKMemberAvatar src={me?.avatar} name={me?.realName ?? 'You'} size="smallPlus" round presence={me?.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActiveInverted)" />
            </GlassButton>
          </>
        }
      />
    </div>
  )
}
