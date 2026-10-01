import { useApp, type HomePrefs } from '../../store'
import { MenuOverlay, type MenuSection } from '../ui/Menu'
import { toast } from '../../ui/Toast'

// Home's sort and filter menu (spec home.md §8; HomeNavigationBarControlsManager.swift:302-373): a pull-down UIMenu from
// the header's filter button. Each submenu sits in its own section, so they're set apart (:308): "Sort by" (Sections /
// Newest to Oldest, and in sections mode "Unreads and Mentions": Move to the Top / Show in order), "Filter" (All
// conversations / External people), and "Reset" (destructive) once anything differs from the defaults. Choosing an
// option saves it and shows a toast with the option's icon at 40 × 40 in white (:43, :223-300); the sort toasts wait
// 250 ms for the preference to save (:228-230). The Workspaces submenu needs more than one workspace, so it's left out.

const DEFAULTS: HomePrefs = { sortMode: 'sections', prioritization: 'unreadsOnTop', filterMode: 'all' }

/** `.channels` (the Sections option) is an icon-font glyph with no SVG (SKIconManifest+SVGMapping.swift:42); the
 *  channel-section SVG stands in for it. */
const SECTIONS_ICON = 'channel_section'

export function HomeFilterMenu({ sheetKey }: { sheetKey: string }) {
  const prefs = useApp((s) => s.homePrefs)
  const set = (p: Partial<HomePrefs>, text: string, icon: string, delayed = false) => {
    useApp.getState().setHomePrefs(p)
    const show = () => toast({ text, image: icon })
    if (delayed) setTimeout(show, 250)
    else show()
  }
  const sortSubtitle =
    prefs.sortMode === 'recency' ? 'Newest to Oldest' : prefs.prioritization === 'none' ? 'Sections. Show in order.' : 'Sections. Unreads on top.'
  const sections: MenuSection[] = [
    {
      items: [
        {
          title: 'Sort by',
          subtitle: sortSubtitle,
          submenu: [
            {
              items: [
                { title: 'Sections', icon: SECTIONS_ICON, checked: prefs.sortMode === 'sections', onSelect: () => set({ sortMode: 'sections' }, 'Sorted by your Desktop Preferences', SECTIONS_ICON, true) },
                { title: 'Newest to Oldest', icon: 'clock', checked: prefs.sortMode === 'recency', onSelect: () => set({ sortMode: 'recency' }, 'Sorted by newest to oldest', 'clock', true) },
              ],
            },
            ...(prefs.sortMode === 'sections'
              ? [
                  {
                    title: 'Unreads and Mentions',
                    items: [
                      { title: 'Move to the Top', icon: 'arrow_up', checked: prefs.prioritization === 'unreadsOnTop', onSelect: () => set({ prioritization: 'unreadsOnTop' }, 'Showing unreads on top', 'arrow_up') },
                      { title: 'Show in order', icon: 'shuffle', checked: prefs.prioritization === 'none', onSelect: () => set({ prioritization: 'none' }, 'Not showing unreads on top', 'shuffle') },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    },
    {
      items: [
        {
          title: 'Filter',
          subtitle: prefs.filterMode === 'external' ? 'External people' : 'All conversations',
          submenu: [
            {
              items: [
                { title: 'All conversations', icon: 'channel', checked: prefs.filterMode === 'all', onSelect: () => set({ filterMode: 'all' }, 'Showing all', 'channel') },
                { title: 'External people', icon: 'buildings', checked: prefs.filterMode === 'external', onSelect: () => set({ filterMode: 'external' }, 'Showing conversations with other companies', 'buildings') },
              ],
            },
          ],
        },
      ],
    },
  ]
  const isDefault = prefs.sortMode === DEFAULTS.sortMode && prefs.prioritization === DEFAULTS.prioritization && prefs.filterMode === DEFAULTS.filterMode
  if (!isDefault) sections.push({ items: [{ title: 'Reset', destructive: true, onSelect: () => set(DEFAULTS, 'Reset', 'check', true) }] })

  const anchor = document.querySelector('.ios-screen [aria-label="Sort and Filter Home"]')
  const rect = anchor ? anchorRect(anchor) : undefined
  return <MenuOverlay sheetKey={sheetKey} sections={sections} anchor={rect} align="trailing" />
}

function anchorRect(el: Element) {
  const screen = el.closest('.ios-screen') as HTMLElement
  const s = screen.getBoundingClientRect()
  const k = s.width / screen.offsetWidth || 1
  // the menu grows out of the whole glass capsule the button sits in
  const box = (el.closest('.glass-group') ?? el).getBoundingClientRect()
  return { x: (box.left - s.left) / k, y: (box.top - s.top) / k, width: box.width / k, height: box.height / k }
}
