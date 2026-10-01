import { registerScreen, registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { ListScreen } from './ListScreen'
import { ListRecordSheet } from './ListRecordSheet'
import { ListDatePickerSheet, ListPersonPickerSheet, ListTextInputSheet } from './ListFieldEditors'

// Slack Lists (spec search-slackbot-huddles.md §4.5, canvas-lists-creation.md §3):
//
//   push({ screen: 'list', listId })                       or { fileId } / { id }
//   presentSheet('list-record', { listId, rowId? })        an item (no rowId: a new one, created by its first edit)
//   presentSheet('list-text-input', { title, text, placeholder, toolbar, onDone })   the text editor
//   presentSheet('list-person-picker', { onPick })         "Select User"
//   presentSheet('list-date-picker', { value, onPick })    "Select a date"
registerScreen('list', ListScreen)

// the record carousel: a form sheet in a navigation controller (ListViewRouteExecution / ListsRecordsCarouselFeature)
registerSheet('list-record', ListRecordSheet as never, 'page')

// RichTextInputFeature: .overCurrentContext, .crossDissolve (RichTextInputFeature.swift:80-84); it draws its own dim
registerSheet('list-text-input', ListTextInputSheet as never, 'overlay')
configureSheet('list-text-input', { exitMs: 300 })

// the UserConversationPicker, presented modally in a navigation controller (ListRecordInteractor.swift:1313-1363)
registerSheet('list-person-picker', ListPersonPickerSheet as never, 'page')

// DateTimePickerFeature: a native sheet sized to its content on iPhone (14b3cbaf dropped the legacy bottom
// sheet: DateTimePickerFeature.swift:50-63)
registerSheet('list-date-picker', ListDatePickerSheet as never, 'fit')
