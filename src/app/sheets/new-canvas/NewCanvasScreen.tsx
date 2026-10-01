import { useLayoutEffect, useState } from 'react'
import { useApp, type Route } from '../../store'
import { CanvasScreen } from '../../screens/canvas'
import { templateContent } from '../../../data/canvas/templates'

// A new canvas (spec canvas-lists-creation.md §2): what "Add canvas" in a conversation's header menu and the Files
// screen's "New Canvas" open. iOS creates the canvas at once — files.createCanvas, tabbed to the conversation when
// there is one (tabbed_channel_id), no title, no template, no naming step (SlackAPI+FilesCreateCanvas.swift:10-23;
// CanvasDataService.swift:210-217, 288-303) — and shows it while it's made with the new-canvas skeleton
// (CanvasLoadingStateView.swift:153-160): an empty canvas with its placeholders, "Untitled" in the bar. Here it opens
// editing, the caret in the title. The conversation's "Add canvas" tab becomes the canvas's tab (tabs.ts).
//
//   push({ screen: 'new-canvas', conversationId? })     openOrToast(['new-canvas'], { conversationId }) does this
//   …, title?, template?                                  prototypes only: a title, or a web-kit template key
//                                                         (src/data/canvas/templates.ts; iOS has no template picker)

/** the canvas each new-canvas route made, so a re-render (or React's double render in dev) doesn't make another */
const made = new WeakMap<Route, string>()

export function NewCanvasScreen({ route }: { route: Route }) {
  const [id, setId] = useState(() => {
    const prev = made.get(route)
    return prev && useApp.getState().fx.canvases?.[prev] ? prev : ''
  })
  // made after the first render (a store update while rendering would update other screens mid-render); until then
  // the screen draws the new-canvas skeleton
  useLayoutEffect(() => {
    if (id) return
    const s = useApp.getState()
    const prev = made.get(route)
    if (prev && s.fx.canvases?.[prev]) return setId(prev)
    const fx = s.fx
    const conversationId = typeof route.conversationId === 'string' && fx.conversations[route.conversationId] ? route.conversationId : undefined
    const tpl = typeof route.template === 'string' ? templateContent(route.template, { users: fx.users, conversations: fx.conversations, me: fx.me, domain: fx.workspace.domain }) : null
    const title = typeof route.title === 'string' ? route.title : tpl?.title
    const created = s.createCanvas({ conversationId, title, blocks: tpl?.blocks })
    made.set(route, created)
    setId(created)
  }, [id, route])
  return <CanvasScreen route={{ ...route, screen: 'canvas', canvasId: id, isNew: true }} />
}
