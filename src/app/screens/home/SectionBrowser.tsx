import { useMemo, useRef, useState } from 'react'
import { registerScreen } from '../../nav/registry'
import { useApp, type Route } from '../../store'
import { GlassButton, NavBar, NAVBAR_BOTTOM } from '../../nav/NavBar'
import { NAV_DURATION } from '../../nav/StackView'
import { openMenu } from '../../sheets'
import { useFlag } from '../../flags'
import { Icon } from '../../../icons/Icon'
import { SKTabBar } from '../../../slackkit/SKTabBar'
import { SKPillButton } from '../../../slackkit/SKPillButton'
import { buildHomeSections, type HomeSection } from './sections'
import { ConversationRow } from './ConversationRow'
import './home.css'

// The conversation section browser (home.md §11; Sept: Modules/Features/Home/Implementation/ConversationSectionBrowser/),
// opened from a Home section's "Title ›" (sections sort): pushed on iPhone, titled "Browse Sections"
// (`section_browser_title`) or the section's own name when there's only one; under the bar an SKTabBar of pill buttons,
// one per section (its name and icon), the tapped one selected and centered on first load; then that section's
// conversations, as Home draws them, on basePrimary; a "…" with the section's menu ("Mark all as Read" when it has
// unreads; "Rename %@" / "Delete %@" for custom sections) (ConversationSectionBrowserViewController.swift:66-166,
// ConversationSectionBrowserPresenter.swift:63-105, GroupingPipeSection.swift:298-332). While the selected section has
// unreads, a glass "Catch Up" pill floats at the bottom right; it opens Catch Up on that section's conversations
// (ConversationSectionBrowserViewController.swift:129-147, :171-180; …Feature.swift:147-148).
//
//   push({ screen: 'section-browser', sectionId })

function SectionBrowserScreen({ route }: { route: Route }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const open = useApp((s) => s.openConversation)
  const push = useApp((s) => s.push)
  const markRead = useApp((s) => s.markRead)
  const showToast = useApp((s) => s.showToast)
  const agentsBadging = useFlag('agentsAndAppsBadging')
  const agentsInDms = useFlag('agentsInDms')
  // every section with all of its conversations, read and unread, in the server's order
  const sections = useMemo(
    () =>
      buildHomeSections(fx, messages, { prefs: { sortMode: 'sections', prioritization: 'none', filterMode: 'all' }, agentsBadging, agentsInDms }).filter(
        (s): s is HomeSection & { sectionId: string } => !!s.sectionId,
      ),
    [fx, messages, agentsBadging, agentsInDms],
  )
  const [selected, setSelected] = useState(() => (route.sectionId as string | undefined) ?? sections[0]?.sectionId)
  const current = sections.find((s) => s.sectionId === selected) ?? sections[0]
  const more = useRef<HTMLDivElement>(null)
  const custom = fx.sections.find((s) => s.id === current?.sectionId)?.kind === 'custom'
  const hasUnreads = !!current?.rows.some((r) => r.unread)

  // "…": "Mark all as Read" (`mark_all_as_read`) when the section has unreads, "Rename %@" / "Delete %@" for custom
  // sections; nothing to show otherwise (GroupingPipeSection.swift:298-332)
  const menu =
    current && (hasUnreads || custom)
      ? () =>
          openMenu({
            anchor: more.current?.querySelector('button'),
            sections: [
              ...(hasUnreads ? [{ items: [{ title: 'Mark all as Read', onSelect: () => current.rows.forEach((r) => markRead(r.id)) }] }] : []),
              ...(custom
                ? [
                    {
                      items: [
                        { title: `Rename ${current.name}`, icon: 'edit', onSelect: () => showToast('Not in the prototype') },
                        { title: `Delete ${current.name}`, icon: 'trash', destructive: true, onSelect: () => showToast('Not in the prototype') },
                      ],
                    },
                  ]
                : []),
            ],
          })
      : undefined

  // A row opens its conversation with .reset (ConversationListHomePlugin.swift:367-369): the tab's detail stack becomes
  // [Home, conversation] (RootTabViewController.swift:123-124, setFeatures([root, feature], animated:)): a normal push,
  // then the browser is dropped from under it, so Back returns to Home.
  const openReset = (id: string) => {
    const tab = useApp.getState().tab
    open(id)
    window.setTimeout(() => useApp.setState((s) => ({ stacks: { ...s.stacks, [tab]: s.stacks[tab].filter((e) => e.route !== route) } })), NAV_DURATION + 60)
  }

  const single = sections.length === 1
  return (
    <div className="ios-pushed-screen section-browser" data-screen="section-browser">
      <div className="ios-scroll section-browser__list" style={{ paddingTop: NAVBAR_BOTTOM }}>
        {!single && (
          // pinned under the bar: pill buttons, fitAllContent, 8 pt insets (ConversationSectionBrowserViewController.swift:106-125)
          <div className="section-browser__tabs">
            <SKTabBar
              tabs={sections.map((s) => ({ title: s.name, ornament: s.icon ? { icon: s.icon } : undefined, ornamentPosition: 'leading' as const }))}
              selectionProgress={Math.max(0, sections.indexOf(current!))}
              tabDisplayStyle="pillButton"
              selectedBackgroundColor="var(--theme_baseInverseSecondary)"
              textColor="var(--dt_color_content_secondary)"
              selectedTextColor="var(--theme_contentInversePrimary)"
              borderColor="var(--dt_color_outline_tertiary)"
              widthMode="fitAllContent"
              shouldAutomaticallyPerformTabChange={false}
              backgroundColor="var(--dt_color_base_primary)"
              contentInset={{ left: 8, right: 8 }}
              shouldCenterSelectedItem
              onTabTapped={(i) => setSelected(sections[i].sectionId)}
            />
          </div>
        )}
        <div className="home section-browser__rows">{current?.rows.map((r) => <ConversationRow key={r.id} row={r} onOpen={openReset} />)}</div>
      </div>
      {current && hasUnreads && (
        // CatchUpFabViewController: SKPillButton(useGlassEffect: true), 56 tall (the capsule SKPillButton.swift:162-167
        // makes of it), 16 pt from the trailing edge and above the bottom (Spacing.xLarge, CatchUpFabDrawerEmbeddable.swift
        // :61-75); svgStackedCardsFilled + "Catch Up" (`catch_up_title`) in smallBodyBold, theme.contentInversePrimary on
        // theme.baseInverseSecondary, 14 pt padding
        <SKPillButton
          className="section-browser__catch-up"
          text="Catch Up"
          textFont="var(--sk-small-body-bold)"
          textColor="var(--theme_contentInversePrimary)"
          icon="stacked_cards_filled"
          iconColor="var(--theme_contentInversePrimary)"
          iconPosition="left"
          size={{ top: 14, left: 14, bottom: 14, right: 14 }}
          unselectedColor="var(--theme_baseInverseSecondary)"
          selectedColor="var(--theme_baseInverseSecondary)"
          accessibilityLabel="Catch Up"
          onClick={() => push({ screen: 'catch-up', conversationIds: current.rows.map((r) => r.id) })}
        />
      )}
      <NavBar
        title={<span className="section-browser__title">{single ? current?.name : 'Browse Sections'}</span>}
        trailing={
          menu && (
            <div ref={more}>
              <GlassButton label="Show more options" onClick={menu}>
                <Icon name="ellipsis_horizontal_filled" size={20} />
              </GlassButton>
            </div>
          )
        }
      />
    </div>
  )
}

registerScreen('section-browser', SectionBrowserScreen)
