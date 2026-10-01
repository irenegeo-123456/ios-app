import { registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { SelectTextSheet } from './SelectTextSheet'

// Select Text (spec canvas-lists-creation.md §5): a native sheet, a custom 500 pt detent and the large one, with the
// grabber (TextCopyingFeature.swift:24-46).
//
//   presentSheet('select-text', { conversationId, ts, threadTs? })   message actions › "Select Text"
registerSheet('select-text', SelectTextSheet as never, 'medium')
configureSheet('select-text', { detents: [500, 'large'], initialDetent: 500, grabber: true })

export { SelectTextSheet }
