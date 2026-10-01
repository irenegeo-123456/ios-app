import { create } from 'zustand'
import { nowTs } from '../../store'

// The Files screen's own state (DocsInteractor): the selected filter chip, sort and file types, plus what the demo
// can't write back to a server — stars, deletions and "last viewed" updates from opening a file. Kept out of the
// app store, like the web clone keeps its More › Files view state (slack-remix src/components/views/more/state.ts).

/** MoreTabSyntheticFilterMode.defaultCases(showStarredFilter: true, showFileTypesFilter: true), minus the file-types
 *  chip, which only presents the File types sheet (DocsInteractor.swift:313-322). */
export type FilterMode = 'all' | 'starred' | 'createdByYou' | 'sharedWithYou'
/** The sort row's two options (DocsPresenter.swift:348-371) */
export type SortMode = 'recentlyViewed' | 'lastUpdated'
/** DocsPaginationFilter.DocsFileTypeFilter.DocsFileType, the ones available as filters (Interface/DocsPaginationFilter.swift:66-138) */
export type DocsFileType = 'lists' | 'canvasAndDocs' | 'spreadsheets' | 'presentations' | 'pdfs' | 'audio' | 'videos' | 'images' | 'snippets' | 'emails'

/** The File types sheet's rows, in DocsFilterFileTypesPresenter.orderedFilterOptions order, with their titles
 *  (lists 10528, canvases_and_documents 3303, spreadsheets 19056, presentations 14312, pdfs 13828, audio 2179,
 *  videos 21634, images 8905, snippets 18841, emails 5811). */
export const FILE_TYPES: { type: DocsFileType; title: string }[] = [
  { type: 'lists', title: 'Lists' },
  { type: 'canvasAndDocs', title: 'Canvases and Documents' },
  { type: 'spreadsheets', title: 'Spreadsheets' },
  { type: 'presentations', title: 'Presentations' },
  { type: 'pdfs', title: 'PDFs' },
  { type: 'audio', title: 'Audio' },
  { type: 'videos', title: 'Videos' },
  { type: 'images', title: 'Images' },
  { type: 'snippets', title: 'Snippets' },
  { type: 'emails', title: 'Emails' },
]

/** DocsFileTypeFilter.defaults (DocsPaginationFilter.swift:55-57) */
export const DEFAULT_TYPES: DocsFileType[] = ['lists', 'canvasAndDocs', 'spreadsheets', 'presentations', 'pdfs']
/** "Created by you" only allows canvases and lists (DocsInteractor.swift:324-331) */
const CREATED_BY_YOU_TYPES: DocsFileType[] = ['canvasAndDocs', 'lists']

interface FilesState {
  filter: FilterMode
  sort: SortMode
  types: DocsFileType[]
  /** the selection "Created by you" replaced, restored when another chip is chosen */
  previousTypes: DocsFileType[] | null
  /** the user changed a filter or the sort (the empty states tell a first load from a filtered one) */
  hasInteracted: boolean
  /** isFavorited, as starred in the demo */
  starred: Record<string, boolean>
  deleted: Record<string, true>
  /** files opened during the demo: id → ts (the server would update lastRead) */
  viewed: Record<string, string>
  /** the low-content banner's ✕ (UserDefaults docsWelcomeScreenHasShown) */
  bannerDismissed: boolean

  setFilter: (filter: FilterMode) => void
  setSort: (sort: SortMode) => void
  saveTypes: (types: DocsFileType[]) => void
  toggleStar: (id: string) => void
  remove: (id: string) => void
  markViewed: (id: string) => void
  dismissBanner: () => void
}

export const useFiles = create<FilesState>()((set) => ({
  filter: 'all',
  sort: 'recentlyViewed',
  types: DEFAULT_TYPES,
  previousTypes: null,
  hasInteracted: false,
  starred: {},
  deleted: {},
  viewed: {},
  bannerDismissed: false,

  setFilter: (filter) =>
    set((s) => {
      if (filter === s.filter) return { hasInteracted: true }
      if (filter === 'createdByYou') return { filter, hasInteracted: true, previousTypes: s.types, types: CREATED_BY_YOU_TYPES }
      if (s.filter === 'createdByYou') return { filter, hasInteracted: true, types: s.previousTypes ?? DEFAULT_TYPES, previousTypes: null }
      return { filter, hasInteracted: true }
    }),
  setSort: (sort) => set({ sort, hasInteracted: true }),
  saveTypes: (types) => set({ types, hasInteracted: true }),
  toggleStar: (id) => set((s) => ({ starred: { ...s.starred, [id]: !s.starred[id] } })),
  remove: (id) => set((s) => ({ deleted: { ...s.deleted, [id]: true } })),
  markViewed: (id) => set((s) => ({ viewed: { ...s.viewed, [id]: nowTs() } })),
  dismissBanner: () => set({ bannerDismissed: true }),
}))

/** The file-types chip's title: "All" with every type on, "1 Type", else "%d Types" (DocsPresenter.swift:302-316;
 *  docs_one_type_tab_title 5343, docs_x_types_tab_title 5352). */
export function fileTypesTitle(types: DocsFileType[]): string {
  if (types.length === FILE_TYPES.length) return 'All'
  if (types.length === 1) return '1 Type'
  return `${types.length} Types`
}
