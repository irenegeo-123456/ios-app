import type { CSSProperties } from 'react'
import { useApp } from '../../store'
import { SKButton } from '../../../slackkit/SKButton'
import { openMenu } from '../../sheets/ui/Menu'
import { useSearch } from './state'
import { appliedCount, CHANNEL_TYPE_TITLES, DATE_TITLES, FILE_TYPE_TITLES, MEMBERSHIP_TITLES, RESULT_TYPES, resultTypeTitle, type ResultType, type SearchFilters } from './searchIndex'
import { mkShortOrdinal } from '../../../messagekit/MKMessagePreview'

// The search filter bar (spec search-slackbot-huddles.md §1.4; SearchFiltersCollectionEntity.swift, SearchFiltersPresenter.swift,
// SearchFilterConstants.swift): the result-type chip first (with a trailing hairline divider when chips follow), the
// clear-filters chip after it when anything is applied, then the result type's preferred filters
// (FilterSets.Tabless, SearchFilterType.swift:262-278). Each chip is an SKButton .small with custom colors, 34 pt tall
// (measured in testFilters@3x.png: y 16–49.67), 8 pt apart, in a horizontal scroller inset 16 / 16 / 8 / 16
// (FindViewController.swift:150-152) — 58 pt in all (filterViewFrameHeight, :168).

type Chip =
  | 'resultType'
  | 'clearFilters'
  | 'users'
  | 'withUsers'
  | 'channels'
  | 'createdBy'
  | 'dateRange'
  | 'fileType'
  | 'onlyMyChannels'
  | 'excludeAppsAndBots'
  | 'moreFilters'
  | 'channelMembership'
  | 'channelType'
  | 'workspaces'
  | 'organizations'

/** The preferred filters per result type (SearchFilterType.swift:262-278 Tabless; DMs :237-240; people none). */
const PREFERRED: Record<ResultType, Chip[]> = {
  messages: ['users', 'channels', 'onlyMyChannels', 'excludeAppsAndBots', 'moreFilters'],
  files: ['users', 'channels', 'onlyMyChannels', 'excludeAppsAndBots', 'moreFilters'],
  canvases: ['createdBy', 'users', 'channels', 'dateRange'],
  channels: ['channelMembership', 'channelType', 'workspaces', 'organizations'],
  dms: ['withUsers'],
  people: [],
}

/** setVisibleFilters (SearchFiltersInteractor.swift:463-532): clear-filters after the result type, applied Date / File type before More filters. */
export function visibleChips(type: ResultType, f: SearchFilters): Chip[] {
  const chips: Chip[] = ['resultType', ...PREFERRED[type]]
  if (appliedCount(f) > 0) chips.splice(1, 0, 'clearFilters')
  const more = chips.indexOf('moreFilters')
  if (f.date.kind !== 'anytime' && !chips.includes('dateRange') && more !== -1) chips.splice(chips.indexOf('moreFilters'), 0, 'dateRange')
  if (f.fileTypes.length && !chips.includes('fileType') && more !== -1) chips.splice(chips.indexOf('moreFilters'), 0, 'fileType')
  return chips
}

// SearchFilterConstants.swift:14-29
const UNSELECTED = { backgroundColor: 'var(--dt_color_base_primary)', titleColor: 'var(--dt_color_content_secondary)', borderColor: 'var(--dt_color_outline_tertiary)' }
const SELECTED = { backgroundColor: 'var(--dt_color_base_inverse_highlight_1)', titleColor: 'var(--dt_color_content_inverse_primary)', borderColor: 'transparent' }
const RESULT_TYPE = { backgroundColor: 'var(--sk_aubergine)', titleColor: 'var(--dt_color_content_inverse_primary)', borderColor: 'transparent' }
const MORE = { backgroundColor: 'transparent', titleColor: 'var(--dt_color_content_highlight_1)', borderColor: 'transparent' }

/** "From" → "From: Ann" → "From: Ann +2" (getUserFilterString, SearchFiltersPresenter.swift:208-226) */
function namesLabel(base: string, names: string[]) {
  if (!names.length) return base
  return `${base}: ${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}`
}

export function FilterBar({ offset, settling, style }: { offset: number; settling?: boolean; style?: CSSProperties }) {
  const fx = useApp((s) => s.fx)
  const presentSheet = useApp((s) => s.presentSheet)
  const showToast = useApp((s) => s.showToast)
  const { resultType, filters, setResultType, setFilters, clearFilters } = useSearch()
  const chips = visibleChips(resultType, filters)
  const count = appliedCount(filters)
  const userNames = (ids: string[]) => ids.map((id) => fx.users[id]?.name ?? id)

  const chip = (c: Chip, i: number) => {
    let label = ''
    let selected = false
    let colors = UNSELECTED
    let icon: string | undefined = 'caret_down'
    let iconPosition: 'left' | 'right' = 'right'
    let onClick: (el: HTMLElement) => void = () => {}
    switch (c) {
      case 'resultType':
        // Always "selected": filtersApplied always contains .resultType (SearchFilters.swift:210-211)
        label = resultTypeTitle(resultType)
        colors = RESULT_TYPE
        selected = true
        onClick = (el) =>
          openMenu({
            anchor: el,
            align: 'leading',
            sections: [{ items: RESULT_TYPES.map((r) => ({ title: r.title, icon: r.icon, checked: r.type === resultType, onSelect: () => setResultType(r.type) })) }],
          })
        break
      case 'clearFilters':
        // filterAlt glyph on the left + the count, selected colors; its menu: "N filters applied" / "Clear all filters"
        label = String(count)
        colors = SELECTED
        selected = true
        icon = 'filters'
        iconPosition = 'left'
        onClick = (el) =>
          openMenu({
            anchor: el,
            align: 'leading',
            title: count > 1 ? `${count} filters applied` : '1 filter applied',
            sections: [{ items: [{ title: 'Clear all filters', destructive: true, onSelect: clearFilters }] }],
          })
        break
      case 'users':
        label = namesLabel('From', userNames(filters.from))
        selected = filters.from.length > 0
        onClick = () => presentSheet('search-people-picker', { filter: 'from' })
        break
      case 'withUsers':
        label = namesLabel('With', userNames(filters.with))
        selected = filters.with.length > 0
        onClick = () => presentSheet('search-people-picker', { filter: 'with' })
        break
      case 'createdBy':
        label = namesLabel('Created By', userNames(filters.createdBy))
        selected = filters.createdBy.length > 0
        onClick = () => presentSheet('search-people-picker', { filter: 'createdBy' })
        break
      case 'channels':
        label = namesLabel(
          'In',
          filters.in.map((id) => fx.conversations[id]?.name ?? id),
        )
        selected = filters.in.length > 0
        onClick = () => presentSheet('search-channel-picker')
        break
      case 'dateRange':
        label = dateLabel(filters)
        selected = filters.date.kind !== 'anytime'
        onClick = () => presentSheet('search-more-filters', { showDate: true, showFileType: false })
        break
      case 'fileType':
        // getFileTypeString: the first type, "+N" for the rest (:268-287)
        label = filters.fileTypes.length ? `${FILE_TYPE_TITLES[filters.fileTypes[0]]}${filters.fileTypes.length > 1 ? ` +${filters.fileTypes.length - 1}` : ''}` : 'File type'
        selected = filters.fileTypes.length > 0
        onClick = () => presentSheet('search-more-filters', { showDate: false, showFileType: true })
        break
      case 'onlyMyChannels':
        label = 'Only my channels'
        selected = filters.onlyMyChannels
        icon = undefined
        onClick = () => setFilters({ onlyMyChannels: !filters.onlyMyChannels })
        break
      case 'excludeAppsAndBots':
        label = 'Exclude automations'
        selected = filters.excludeAutomations
        icon = undefined
        onClick = () => setFilters({ excludeAutomations: !filters.excludeAutomations })
        break
      case 'moreFilters':
        label = 'More filters'
        colors = MORE
        icon = undefined
        onClick = () => presentSheet('search-more-filters', { showDate: true, showFileType: true })
        break
      case 'channelMembership':
        label = MEMBERSHIP_TITLES[filters.channelMembership]
        selected = filters.channelMembership !== 'all'
        onClick = () => presentSheet('search-channel-options', { filter: 'membership' })
        break
      case 'channelType':
        label = CHANNEL_TYPE_TITLES[filters.channelType]
        selected = filters.channelType !== 'all'
        onClick = () => presentSheet('search-channel-options', { filter: 'type' })
        break
      case 'workspaces':
        label = 'Workspaces'
        onClick = () => showToast('Not in the prototype')
        break
      case 'organizations':
        label = 'Organizations'
        onClick = () => showToast('Not in the prototype')
        break
    }
    if (selected && c !== 'resultType' && c !== 'clearFilters') colors = SELECTED
    const divider = c === 'resultType' && chips.length > 1
    return (
      <span key={c} className={`search-chip-cell${divider ? ' has-divider' : ''}`} style={{ marginLeft: i === 0 ? 0 : 8 }}>
        <span className="search-chip-host" onClick={(e) => onClick(e.currentTarget.firstElementChild as HTMLElement)}>
          <SKButton
            title={label}
            buttonStyle="custom"
            customColors={colors}
            size="small"
            icon={icon}
            iconPosition={iconPosition}
            className="search-chip"
            accessibilityLabel={c === 'resultType' ? `Result type: ${label}` : c === 'clearFilters' ? (count > 1 ? `${count} filters applied` : '1 filter applied') : label}
            data-qa={`search_chip_${c}`}
          />
        </span>
        {divider && <i className="search-chip-divider" />}
      </span>
    )
  }

  // September: the bar fades as it slides, alpha = 1 − offset / height, and snaps to 1 or 0 with the spring
  // (FindViewController.swift:1160-1189, :1282; June only moved it).
  const opacity = Math.max(0, Math.min(1, 1 - offset / 58))
  const spring = '0.4s var(--sk-spring-smooth)'
  return (
    <div
      className="search-filters"
      style={{ transform: `translateY(${-offset}px)`, opacity, transition: settling ? `transform ${spring}, opacity ${spring}` : 'none', ...style }}
      data-qa="search_filter_bar"
    >
      <div className="search-filters__scroller" data-scroll-x>
        {chips.map(chip)}
      </div>
    </div>
  )
}

/** Date chip label: "Date" / "Last 7 days" / the custom range "Sep 1st - Sep 3rd" (getDateRangeString, :228-255). */
function dateLabel(f: SearchFilters) {
  const d = f.date
  if (d.kind === 'anytime') return 'Date'
  if (d.kind !== 'custom') return DATE_TITLES[d.kind]
  const start = mkShortOrdinal(new Date(d.start * 1000))
  const end = mkShortOrdinal(new Date((d.end ?? d.start) * 1000))
  return start === end ? start : `${start} - ${end}`
}
