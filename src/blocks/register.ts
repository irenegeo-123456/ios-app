import { registerSheet } from '../app/nav/registry'
import { configureSheet } from '../app/nav/SheetHost'
import { AppModal } from './sheets/AppModal'
import { EntityPicker, OptionPicker, OptionSheet } from './sheets/Pickers'
import { DateTimeSheet } from './sheets/DateTime'
import { TextEditor } from './sheets/TextEditor'
import { MODAL_SHEET } from './modal-state'
import './sheets/sheets.css'
import '../apps/ui/register'

// Block Kit's sheets and screens, by the names the renderer and the App Kit runtime present them with (imported once
// from src/app/screens/index.ts):
//
//   'app-modal'         the modal stack (views.open / push / update): a form sheet, no swipe-down dismissal
//                       (AppViewFeature.swift:71), no grabber (form sheets have none)
//   'bk-option-sheet'   ≤ 5 static options and overflow menus: Slack's bottom sheet (SKBottomSheet; with the
//                       bottomsheetMigration flag a self-sized native sheet) (OptionPickerFeature.swift:55-86)
//   'bk-option-picker'  the full-screen option picker: a form sheet in a navigation controller
//   'bk-entity-picker'  the people / channel / conversation picker (BlockPresentationRouter.swift:384-452)
//   'bk-datetime'       the date / time sheet: a native sheet with one self-sized detent and the grabber, whatever
//                       the bottomsheetMigration flag (DateTimePickerFeature.swift:52-63; June: SKBottomSheet unless
//                       the flag was on)
//   'bk-text-editor'    the editor card message inputs and rich_text_input open: over the current context, cross-dissolved,
//                       on the keyboard (BlockTextInputPresenter.swift:50-287; SinglelineTextInputFeature.swift:63-68,
//                       RichTextInputFeature.swift:80-85)
//   'app-profile'       screen: the App Profile of a bot user ({ userId })

registerSheet(MODAL_SHEET, AppModal as never, 'page')
configureSheet(MODAL_SHEET, { dismissible: false, grabber: false })

registerSheet('bk-option-sheet', OptionSheet as never, 'fit')
configureSheet('bk-option-sheet', { chrome: 'legacy', migrated: { detents: ['fit'] } })
registerSheet('bk-option-picker', OptionPicker as never, 'page')
registerSheet('bk-entity-picker', EntityPicker as never, 'page')

registerSheet('bk-datetime', DateTimeSheet as never, 'fit')

registerSheet('bk-text-editor', TextEditor as never, 'overlay')
configureSheet('bk-text-editor', { exitMs: 300 })
