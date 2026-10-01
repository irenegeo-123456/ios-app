import { useMemo, useState } from 'react'
import { useApp } from '../../store'
import { GlassButton, NavBar } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { SKTabBar, type SKTabBarTab } from '../../../slackkit/SKTabBar'
import { SKPillButton } from '../../../slackkit/SKPillButton'
import { SKBanner } from '../../../slackkit/SKBanner'
import { SKEmptyState, type SKEmptyStateButton } from '../../../slackkit/SKEmptyState'
import { EntityRow } from '../more/EntityRow'
import { openMenu, confirm, type MenuAction } from '../../sheets'
import { FileTypeOrnament, StarredAccessory } from './fileTypes'
import { allDocs, docLink, docSubtitle, visibleDocs, type DocItem } from './data'
import { useFiles, fileTypesTitle, type FilterMode } from './state'
import docsEmptyImage from './assets/docs_empty_state_data.svg'
import filterEmptyImage from './assets/filter_empty_files.svg'
import './files.css'

// The Files screen (DocsViewController + DocsPresenter, spec search-slackbot-huddles.md §4.2; the September 2026 legacy
// path, ios_custom_files_section off), reached from More › Files on iOS 26 (or the Home Files tile with the Slackbot tab):
// a "Files" detail title with a "+" Create menu, then one full-bleed list on basePrimary (DocsPresenter.swift:443):
// the low-content banner, the filter chips (SKTabBar pill buttons), the sort row, and the canvases, lists and files as
// medium SKGenericEntity rows. The empty states keep the chips and sort row so another filter is one tap away.

/** The chips, in MoreTabSyntheticFilterMode.defaultCases(showStarredFilter: true, showFileTypesFilter: true) order */
const CHIPS: ('fileTypes' | FilterMode)[] = ['fileTypes', 'all', 'starred', 'createdByYou', 'sharedWithYou']

/** docsLowContentThreshold (DocsPresenter.swift:37) */
const LOW_CONTENT_THRESHOLD = 10

export function FilesScreen() {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const push = useApp((s) => s.push)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const st = useFiles()
  const [scrolled, setScrolled] = useState(false)

  const items = useMemo(() => allDocs({ fx, messages, threads }), [fx, messages, threads])
  const rows = useMemo(
    () => visibleDocs(items, fx.me, st.filter, st.sort, st.types, { starred: st.starred, deleted: st.deleted, viewed: st.viewed }),
    [items, fx.me, st.filter, st.sort, st.types, st.starred, st.deleted, st.viewed],
  )

  const notInPrototype = () => showToast('Not in the prototype')
  const newCanvas = () => useApp.getState().push({ screen: 'new-canvas' })
  // The Create menu, titled "Create" (creation_context_menu_title 4630): New List (svgLists), New Canvas (svgCanvas)
  // (DocsPresenter.swift:984-995). It opens from the "+" bar button (MenuOverlay's default anchor is that button).
  const createMenu = () =>
    openMenu({
      title: 'Create',
      sections: [
        {
          items: [
            { title: 'New List', icon: 'lists', onSelect: notInPrototype },
            { title: 'New Canvas', icon: 'canvas', onSelect: newCanvas },
          ],
        },
      ],
    })

  const open = (d: DocItem) => {
    st.markViewed(d.id)
    if (d.opens === 'canvas') push({ screen: 'canvas', canvasId: d.id })
    else if (d.opens === 'list') push({ screen: 'list', listId: d.id })
    // images, PDFs and other attachments open in the file carousel (FileRoute)
    else presentSheet('file-viewer', { fileId: d.id })
  }

  const longPress = (d: DocItem, el: HTMLElement) => {
    const starred = !!st.starred[d.id]
    const copyLink = () => {
      void navigator.clipboard?.writeText(docLink(fx, d)).catch(() => undefined)
      showToast('Link copied') // copied_link
    }
    const remove = async () => {
      // FileActionHandler.deleteFile: "Are you sure you want to delete '%@'?" (file_deletion_prompt 6518) with a
      // destructive "Yes, Delete File" (yes_delete_file 22618) and Cancel (FileCarousel/…/FileActionHandler.swift:259-276)
      if (await confirm({ message: `Are you sure you want to delete '${d.title}'?`, confirm: 'Yes, Delete File', destructive: true })) st.remove(d.id)
    }
    const share: MenuAction = { title: 'Share in Slack', icon: 'share_message', onSelect: notInPrototype }
    const link: MenuAction = { title: 'Copy Link', icon: 'link', onSelect: copyLink }
    // the deferred items after Copy Link with the to-do flags off: Save for Later (save_for_later_menu) / Remove from
    // Later, both svgBookmark (DocsInteractor.swift:839-865, September 2026)
    const later: MenuAction = { title: 'Save for Later', icon: 'bookmark', onSelect: notInPrototype }
    // The row's own frame: the menu opens just below it (over it near the bottom of the screen).
    const anchor = menuAnchor(el)
    if (d.opens === 'canvas') {
      // canvasLongPressMenuPresentationObject (DocsPresenter.swift:780-835, September 2026): star, Share in Slack, Copy
      // Link, Save for Later; then Delete Canvas / Delete Template for the creator, an owner or an admin
      const mine = d.creatorId === fx.me
      openMenu({
        anchor,
        sections: [
          {
            items: [
              starred ? { title: 'Unstar Canvas', icon: 'star_filled', onSelect: () => st.toggleStar(d.id) } : { title: 'Add to Starred', icon: 'star', onSelect: () => st.toggleStar(d.id) },
              share,
              link,
              later,
            ],
          },
          ...(mine ? [{ items: [{ title: d.isTemplate ? 'Delete Template' : 'Delete Canvas', icon: 'trash', destructive: true, onSelect: () => void remove() }] }] : []),
        ],
      })
      return
    }
    // fileLongPressMenuPresentationObject (DocsPresenter.swift:971-1029, September 2026): a section titled with the
    // file's name (the list's star, Share in Slack, Copy Link, Save for Later), then Delete in a section of its own
    const items: MenuAction[] = []
    if (d.opens === 'list') items.push(starred ? { title: 'Unstar list', icon: 'star_filled', onSelect: () => st.toggleStar(d.id) } : { title: 'Add to Starred', icon: 'star', onSelect: () => st.toggleStar(d.id) })
    items.push(share, link, later)
    const del: MenuAction[] = d.creatorId === fx.me ? [{ title: 'Delete', icon: 'trash', destructive: true, onSelect: () => void remove() }] : []
    openMenu({ anchor, sections: [{ title: d.title, items }, ...(del.length ? [{ items: del }] : [])] })
  }

  // The low-content banner: not dismissed, under 10 files, the All filter, a paid team (DocsPresenter.swift:249, 372-379)
  const showBanner = !st.bannerDismissed && rows.length < LOW_CONTENT_THRESHOLD && st.filter === 'all' && fx.workspace.plan !== 'free'

  const tabs: SKTabBarTab[] = CHIPS.map((c) => {
    switch (c) {
      case 'fileTypes':
        return { title: fileTypesTitle(st.types), ornament: { icon: 'refine' }, ornamentPosition: 'trailing', accessibilityLabel: `Filter by ${fileTypesTitle(st.types)}` }
      case 'all':
        return { title: 'All', accessibilityLabel: 'Filter by All' }
      case 'starred':
        return { title: 'Starred', ornament: { icon: 'star' }, ornamentPosition: 'leading', accessibilityLabel: 'Filter by Starred' }
      case 'createdByYou':
        return { title: 'Created by you', ornament: { icon: 'user' }, ornamentPosition: 'leading', accessibilityLabel: 'Filter by Created by you' }
      default:
        return { title: 'Shared with you', ornament: { icon: 'share_message' }, ornamentPosition: 'leading', accessibilityLabel: 'Filter by Shared with you' }
    }
  })

  const sortTitle = st.sort === 'recentlyViewed' ? 'Recently viewed' : 'Last updated'
  const showSortRow = st.filter !== 'createdByYou' && st.filter !== 'starred'
  const sortMenu = (el: HTMLElement | null) =>
    openMenu({
      anchor: el,
      // "Sort by" (sort_results_by 19022) with the current option checked (MoreTabSyntheticSortRowPresentationObjectFactory.swift:31-106)
      title: 'Sort by',
      sections: [
        {
          items: [
            { title: 'Recently viewed', checked: st.sort === 'recentlyViewed', onSelect: () => st.setSort('recentlyViewed') },
            { title: 'Last updated', checked: st.sort === 'lastUpdated', onSelect: () => st.setSort('lastUpdated') },
          ],
        },
      ],
    })

  return (
    <div className="ios-pushed-screen files" data-screen="files">
      <div className="ios-scroll files__list" onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 0)} data-qa="files_list">
        <div className="files__content">
          {showBanner && (
            <div className="files__banner">
              <SKBanner
                type="regular"
                tone="info"
                // the keys are swapped in code: heading docs_low_content_body, text docs_low_content_heading (DocsPresenter.swift:237, 241)
                heading="Jump right into recent files"
                text="Here you have easy access to your canvases, lists, and attachments."
                // icon-font allFilesAlt (U+E107) in highlight1.content; `files` is its SVG look-alike
                ornament={{ icon: 'files', color: 'var(--dt_color_content_highlight_1)' }}
                accessories={[{ delete: { onClick: st.dismissBanner } }]}
                isSelectable
              />
            </div>
          )}
          <SKTabBar
            className="files__chips"
            tabs={tabs}
            tabDisplayStyle="pillButton"
            widthMode="fitAllContent"
            selectionProgress={CHIPS.indexOf(st.filter)}
            shouldAutomaticallyPerformTabChange={false}
            // MoreTabSyntheticFilterRowPresentationObjectFactory.swift:57-71: highlight1.baseInverse fill, contentSecondary
            // / contentInversePrimary text, outlineTertiary borders, basePrimary row; insets 0 / 12 / 0 / 12 (docs-home)
            selectedBackgroundColor="var(--dt_color_base_inverse_highlight_1)"
            textColor="var(--dt_color_content_secondary)"
            selectedTextColor="var(--dt_color_content_inverse_primary)"
            borderColor="var(--dt_color_outline_tertiary)"
            backgroundColor="var(--dt_color_base_primary)"
            contentInset={{ left: 12, right: 12 }}
            onTabTapped={(i) => {
              const chip = CHIPS[i]
              // The file-types chip presents the File types sheet and doesn't become the selection (DocsInteractor.swift:318-322)
              if (chip === 'fileTypes') presentSheet('file-types')
              else st.setFilter(chip)
            }}
          />
          {showSortRow && (
            <div className="files__sort">
              <SortButton title={sortTitle} onOpen={sortMenu} />
            </div>
          )}
          {rows.length ? (
            <div className="files__rows" role="list">
              {rows.map((d) => (
                <FileRow key={d.id} d={d} starred={!!st.starred[d.id]} subtitle={docSubtitle(d, fx, st.filter, st.sort)} onOpen={() => open(d)} onLongPress={(el) => longPress(d, el)} />
              ))}
            </div>
          ) : (
            <EmptyState filter={st.filter} onCreateCanvas={newCanvas} onCreateList={notInPrototype} />
          )}
        </div>
      </div>
      <NavBar
        title="Files"
        scrolled={scrolled}
        trailing={
          <GlassButton label="Create new file" onClick={createMenu}>
            <Icon name="plus" size={20} />
          </GlassButton>
        }
      />
    </div>
  )
}

/** The sort row's SKPillButton: the current sort in smallBodyBold and a caret_down, on a clear fill, inset
 *  4 / 15 / 12 / 12 (docs-home; DocsPresenter.swift:348-371, MoreTabSyntheticSortRowPresentationObjectFactory.swift:39-70). */
function SortButton({ title, onOpen }: { title: string; onOpen: (el: HTMLElement | null) => void }) {
  const [el, setEl] = useState<HTMLSpanElement | null>(null)
  return (
    <span ref={setEl} className="files__sort-anchor">
      <SKPillButton
        text={title}
        textFont="var(--sk-small-body-bold)"
        textColor="var(--dt_color_content_primary)"
        icon="caret_down"
        iconColor="var(--dt_color_content_primary)"
        iconPosition="right"
        size={{ top: 4, left: 15, bottom: 12, right: 12 }}
        unselectedColor="transparent"
        selectedColor="transparent"
        accessibilityLabel={`Sort, ${title}`}
        onClick={() => onOpen(el)}
      />
    </span>
  )
}

function FileRow({ d, starred, subtitle, onOpen, onLongPress }: { d: DocItem; starred: boolean; subtitle?: string; onOpen: () => void; onLongPress: (el: HTMLElement) => void }) {
  // Canvases: the secondary text falls back to contentSecondary .caption (September 2026; June sk_foreground_max), with
  // "Template" (canvas_template) in indigo _50 and " | " first for templates (DocsPresenter.swift:664-675, 704). Lists and
  // files: the entity default (also contentSecondary .caption).
  const sub =
    d.opens === 'canvas' && d.isTemplate ? (
      <>
        <span className="files__template">Template</span>
        {' | '}
        {subtitle}
      </>
    ) : (
      subtitle
    )
  return (
    <EntityRow
      size="medium"
      ornament={<FileTypeOrnament style={d.style} thumbnail={d.thumbnail} />}
      title={d.title}
      titleLines={0}
      subtitle={sub}
      subtitleColor={d.opens === 'canvas' ? 'var(--dt_color_content_secondary)' : undefined}
      // the star on any starred row, files included since September 2026 (fileRowAccessory, DocsPresenter.swift:1196-1255)
      accessories={starred ? <StarredAccessory /> : undefined}
      onClick={onOpen}
      onLongPress={onLongPress}
      data-qa={`files_row_${d.id}`}
    />
  )
}

/** The §4.2 empty states: an SKEmptyState below the chips and sort row, on basePrimary (DocsPresenter.swift:1360-1513). */
function EmptyState({ filter, onCreateCanvas, onCreateList }: { filter: FilterMode; onCreateCanvas: () => void; onCreateList: () => void }) {
  if (filter === 'starred')
    return (
      <SKEmptyState
        className="files__empty"
        content={{ image: filterEmptyImage }}
        title="No starred files"
        body="No starred files found, try refining your search."
        backgroundColor="var(--dt_color_base_primary)"
      />
    )
  if (filter === 'sharedWithYou')
    return (
      <SKEmptyState
        className="files__empty"
        content={{ image: filterEmptyImage }}
        title="No files found"
        body="No files found with these filters. Try adjusting your search to see more results."
        backgroundColor="var(--dt_color_base_primary)"
      />
    )
  // slack_docs_title 18153, slack_docs_body 18149; outline "New Canvas" / "New List" with svgPlus (new_canvas, new_list)
  const buttons: SKEmptyStateButton[] = [
    { title: 'New Canvas', buttonStyle: 'outlineDefault', icon: 'plus', onClick: onCreateCanvas },
    { title: 'New List', buttonStyle: 'outlineDefault', icon: 'plus', onClick: onCreateList },
  ]
  return (
    <SKEmptyState
      className="files__empty"
      content={{ image: docsEmptyImage }}
      title="Get your work done in Slack"
      body="Collect and share information with a canvas, or track your next project in a list."
      buttons={buttons}
      backgroundColor="var(--dt_color_base_primary)"
    />
  )
}

/** A long-pressed row's menu anchor: just below the row, lined up with its leading content; over it near the bottom. */
function menuAnchor(el: HTMLElement) {
  const screen = el.closest('.ios-screen') as HTMLElement | null
  if (!screen) return el
  const s = screen.getBoundingClientRect()
  const scale = s.width / screen.offsetWidth || 1
  const r = el.getBoundingClientRect()
  const y = (r.bottom - s.top) / scale
  const top = (r.top - s.top) / scale
  const below = y + 240 < screen.offsetHeight
  return { x: 16, y: below ? y + 6 : Math.max(0, top - 240), width: 1, height: 1 }
}
