import { registerSheet } from '../../nav/registry'
import { ChannelOptionsSheet, ChannelPickerSheet, MoreFiltersSheet, PeoplePickerSheet } from './sheets'
import './state'

// The Search tab's sheets (the root screen is SearchScreen, in src/app/screens/index.ts's ROOT_SCREENS). The filter
// pickers are modal sheets embedded in a navigation controller (SearchFiltersPickerFeature.swift:55): page sheets.
//
//   presentSheet('search-people-picker', { filter: 'from' | 'with' | 'createdBy' })
//   presentSheet('search-channel-picker')
//   presentSheet('search-more-filters', { showDate, showFileType })
//   presentSheet('search-channel-options', { filter: 'type' | 'membership' })

registerSheet('search-people-picker', PeoplePickerSheet as never, 'page')
registerSheet('search-channel-picker', ChannelPickerSheet as never, 'page')
registerSheet('search-more-filters', MoreFiltersSheet as never, 'page')
registerSheet('search-channel-options', ChannelOptionsSheet as never, 'page')
