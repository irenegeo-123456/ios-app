import { registerScreen, registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { CanvasScreen } from './CanvasScreen'
import { FormatPickerSheet } from './FormatPicker'
import { CanvasPlusSheet } from './CanvasPlusSheet'

// Canvases (spec canvas-lists-creation.md §1, search-slackbot-huddles.md §4.4):
//
//   push({ screen: 'canvas', canvasId })        or { fileId } / { id }; `edit: true` opens it editing
//   presentSheet('canvas-format', { onLink })   the toolbar's format picker (the canvas screen opens it)
//   presentSheet('canvas-plus', { onDivider })  the toolbar's "+" sheet
registerScreen('canvas', CanvasScreen)

// An undimmed native sheet the canvas stays live above, drawn by the sheet itself (CanvasFormatPickerFeature.swift:49-70)
registerSheet('canvas-format', FormatPickerSheet, 'overlay')
configureSheet('canvas-format', { exitMs: 420 })

// SKListBottomSheet: Slack's legacy bottom sheet hugging its rows; migrated, a self-sized native sheet
// (CanvasOmnipickerPlugin.swift:146-154)
registerSheet('canvas-plus', CanvasPlusSheet, 'fit')
configureSheet('canvas-plus', { chrome: 'legacy', legacy: { shortForm: 'content', longForm: 'content' }, migrated: { detents: ['fit'] } })

export { CanvasScreen } from './CanvasScreen'
