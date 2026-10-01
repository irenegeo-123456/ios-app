import { registerScreen } from '../../nav/registry'
import { NewCanvasScreen } from './NewCanvasScreen'

// A new canvas (spec canvas-lists-creation.md §2): pushed like CanvasRoute(.newStandaloneCanvas / .newTabbedCanvas).
//
//   push({ screen: 'new-canvas', conversationId? })   or openOrToast(['new-canvas'], { conversationId })
registerScreen('new-canvas', NewCanvasScreen)

export { NewCanvasScreen }
