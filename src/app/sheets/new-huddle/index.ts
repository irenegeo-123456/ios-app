import { registerSheet } from '../../nav/registry'
import { NewHuddleSheet } from './NewHuddleSheet'

// New Huddle (spec canvas-lists-creation.md §4): + Create › Huddle. A form sheet (.standard(.formSheet): the large
// detent, no grabber; UserConversationPickerFeature.swift:156-158).
//
//   presentSheet('new-huddle')
registerSheet('new-huddle', NewHuddleSheet, 'page')

export { NewHuddleSheet }
