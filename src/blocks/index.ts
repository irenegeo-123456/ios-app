// The mobile Block Kit renderer (spec reference/ios/specs/blockkit.md): import from here.
//
//   <BlockSurface blocks={…} surface="message" | "modal" | "home" appUserId=… conversationId=… ts=… />
//   <MessageBlocks blocks={…} conversationId=… ts=… />       a message's blocks (the conversation screen)
//
// The surface module comes first: the block files register their renderers with it.
export { BlockSurface, normalizeBlocks, blockTop, useSurface, type BlockSurfaceProps, type SurfaceKind } from './surface'
import './blocks/Layout'
import './blocks/Input'
import './blocks/RichText'
import './blocks/Cards'
import './blocks/Data'
import './blocks/Agent'
import './blocks.css'

export { EditedContext } from './blocks/RichText'
export { runAppAction, useAppHomes, appConversationId } from './actions'
export { openView, pushView, updateView, closeViews, popView, submitTopView, useViews, MODAL_SHEET } from './modal-state'
export { validateBlocks, apiErrors, apiError, surfacesFor } from './validate'
