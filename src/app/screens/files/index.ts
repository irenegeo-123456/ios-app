import { registerScreen, registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { FilesScreen } from './FilesScreen'
import { FileTypesSheet } from './FileTypesSheet'
import { FileViewerScreen } from './FileViewerScreen'
import { FileViewerSheet } from './FileViewerSheet'
import { FileActionsSheet } from './FileActionsSheet'

// Files (spec search-slackbot-huddles.md §4.2): More › Files and prototypes' view: 'files' push it.
//   push({ screen: 'files' })
//   push({ screen: 'file', fileId })          a message attachment or More › Files entry (FileRoute)
//   presentSheet('file-types')                the File types filter (the chips' first button)
//   presentSheet('file-viewer', { conversationId?, ts?, fileId })   the file carousel: images, PDFs, file previews
registerScreen('files', FilesScreen)
registerScreen('file', FileViewerScreen)
// .sheet(.init(detents: [.large()])) with the standard grabber (DocsFilterFileTypesFeature.swift:40-42,
// ModallyPresentableFeature.swift:287)
registerSheet('file-types', FileTypesSheet, 'page')
configureSheet('file-types', { detents: ['large'], grabber: true })
// the carousel draws its own chrome and transition (the iOS 26 zoom), and handles its own pull-down dismissal
registerSheet('file-viewer', FileViewerSheet as never, 'overlay', { statusBar: 'light' })
// the viewer's options: FileAction, a self-sized sheet (FileActionFeature.swift:39-51)
registerSheet('file-actions', FileActionsSheet as never, 'fit')
configureSheet('file-viewer', { exitMs: 300 })

export { FileTypeOrnament, fileKindStyle, attachmentStyle, attachmentKind, fileKindLabel, StarredAccessory } from './fileTypes'
export type { FileKind, FileTypeStyle } from './fileTypes'
