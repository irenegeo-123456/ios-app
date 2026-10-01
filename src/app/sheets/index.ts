import { registerSheet } from '../nav/registry'
import { configureSheet } from '../nav/SheetHost'
import { MenuOverlay } from './ui/Menu'
import { AlertOverlay } from './ui/Alert'
import { MessageActionsSheet } from './message-actions/MessageActionsSheet'
import { EmojiPickerSheet } from './emoji-picker/EmojiPickerSheet'
import { ReactorsSheet } from './reactors/ReactorsSheet'
import { HomeFilterMenu } from './home/HomeFilterMenu'
import { AddChannelSheet } from './home/AddChannelSheet'
import { CreateMenu } from './home/CreateMenu'
import { CustomizeHome } from './home/CustomizeHome'
import { ConversationMenu } from './conversation-menu/ConversationMenu'
import { ConversationContextMenu } from './conversation-context-menu/ConversationContextMenu'
import { InviteToChannelSheet } from './invite/InviteToChannelSheet'
import { EditChannelSheet } from './edit-channel/EditChannelSheet'
import { ForwardSheet } from './forward/ForwardSheet'

// Sheets, menus and overlays (spec reference/ios/specs/sheets-menus.md), by the names other areas present them with:
// useApp.getState().presentSheet('message-actions', { conversationId, ts }). System chrome helpers other areas can
// call directly: openMenu() (src/app/sheets/ui/Menu.tsx), showAlert() / showActionSheet() / confirm()
// (src/app/sheets/ui/Alert.tsx); toasts: src/app/ui/Toast.tsx.

// UIKit system UI
registerSheet('menu', MenuOverlay as never, 'overlay')
registerSheet('alert', AlertOverlay as never, 'overlay')

// Message actions (§1.2): SKBottomSheet hugging its content; with bottomsheetMigration a native sheet with one
// self-sized detent (MA/MessageActionsFeature.swift:80-102).
registerSheet('message-actions', MessageActionsSheet as never, 'fit')
configureSheet('message-actions', { chrome: 'legacy', migrated: { detents: ['fit'] } })

// Emoji picker (§2.1): SKBottomSheet, short form 298 pt of content, long form full height; after the first expansion
// the short form is gone. The search header (top 64 pt) always drags the sheet. Migrated: fixed 298 + large
// (EP/EmojiPickerFeature.swift:33-54).
registerSheet('emoji-picker', EmojiPickerSheet as never, 'medium')
configureSheet('emoji-picker', {
  chrome: 'legacy',
  legacy: { shortForm: 298, longForm: 'max', disableShortFormAfterExpand: true },
  headerDrag: 64,
  migrated: { detents: [298, 'large'] },
})

// Reactors (§2.8): SKBottomSheet, short form 300 pt of content, long form full height, short form gone after the first
// expansion (RX/ReactorsViewController.swift:23-25,325-340). Migrated: medium + large (RX/ReactorsFeature.swift:21-32).
registerSheet('reactors', ReactorsSheet as never, 'medium')
configureSheet('reactors', { chrome: 'legacy', legacy: { shortForm: 300, longForm: 'max', disableShortFormAfterExpand: true }, migrated: { detents: ['medium', 'large'] } })

// Home (home.md): the sort and filter menu (§8), the "Add channel" action sheet (§4.9), the compose button's creation
// menu (§10.1) and Customize Home (§7.6: a native sheet, medium detent only, grabber).
registerSheet('home-filter', HomeFilterMenu as never, 'overlay')
registerSheet('add-channel', AddChannelSheet as never, 'overlay')
registerSheet('create', CreateMenu as never, 'overlay')
registerSheet('customize-home', CustomizeHome as never, 'medium')
configureSheet('customize-home', { detents: ['medium'], grabber: true })

// Conversations: the header menu the title pill opens (sheets-menus.md §6.2; it closes on its own spring, 0.4 s), and
// Home's long-press context menu with the transcript preview (home.md §13): a different menu, so a different name.
registerSheet('conversation-menu', ConversationMenu as never, 'overlay')
configureSheet('conversation-menu', { exitMs: 400 })
registerSheet('conversation-context-menu', ConversationContextMenu as never, 'overlay')

// Form sheets (large detent, no grabber): Add Members ({ conversationId }), Edit Channel ({ conversationId, focus? })
// and Forward Message ({ conversationId, ts, threadTs? }).
registerSheet('invite-to-channel', InviteToChannelSheet as never, 'page')
registerSheet('edit-channel', EditChannelSheet as never, 'page')
registerSheet('forward', ForwardSheet as never, 'page')

export { openMenu, screenRect } from './ui/Menu'
export type { MenuAction, MenuElement, MenuSection, MenuSpec, MenuSubmenu, OpenMenuOptions } from './ui/Menu'
export { showAlert, showActionSheet, confirm } from './ui/Alert'
export type { AlertAction, AlertOptions } from './ui/Alert'
