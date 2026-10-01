import { registerSheet } from '../nav/registry'
import { configureSheet } from '../nav/SheetHost'
import { HuddlePreviewSheet } from './HuddlePreviewSheet'
import { HuddleCallSheet } from './HuddleCallSheet'
import { HuddleMoreSheet } from './HuddleMoreSheet'
import { HuddleReactionsSheet } from './HuddleReactionsSheet'

// Huddles (spec search-slackbot-huddles.md §3).
//
//   presentSheet('huddle', { conversationId, threadTs? })   the start / join preview (§3.2); the conversation header's
//                                                          headphones and the card's "Join huddle" open it
//   presentSheet('huddle-call')                             the huddle sheet for the huddle you're in (§3.3-§3.8)
//   <HuddleOverlay />                                       the minimized huddle (§3.9), mounted once in App.tsx
//   <HuddleMessageCard conversationId message footer? />    a `huddle_thread` message's row (§3.10)
//   useLiveHuddle(conversationId)                           { live, participantIds, joined } for the header pill (§3.1)

// On iPhone the preview is a UIKit sheet with one self-sized detent and the grabber, whatever bottomsheetMigration says
// (September 2026: HuddlesPreviewFeature.swift:72-78; ModallyPresentableFeature.swift:259; June used SKBottomSheet).
registerSheet('huddle', HuddlePreviewSheet, 'fit')
configureSheet('huddle', { detents: ['fit'], grabber: true })
// iPhone: modal .formSheet (June .automatic), which UIKit shows as a full-height page sheet in compact width; swiping it
// down minimizes the huddle (HuddlesSheetFeature.swift:71-77; .overFullScreen only with ios_huddle_better_thread_visibility)
registerSheet('huddle-call', HuddleCallSheet, 'page')
// Self-sized, with the grabber (HuddlesMenuFeature.swift:40-49)
registerSheet('huddle-more', HuddleMoreSheet, 'fit')
configureSheet('huddle-more', { detents: ['fit'], grabber: true })
// A fixed 330 pt detent and a taller one (HuddlesReactionsFeature.swift:27-54)
registerSheet('huddle-reactions', HuddleReactionsSheet, 'medium')
configureSheet('huddle-reactions', { detents: [330, 'large'], initialDetent: 330, grabber: true })

export { HuddleOverlay } from './HuddleOverlay'
export { HuddleMessageCard, joinFromCard } from './HuddleMessageCard'
export type { HuddleMessageCardProps } from './HuddleMessageCard'
export { useLiveHuddle, useHuddle, useMyRoom } from './state'
export { startHuddle, joinHuddle, leaveHuddle, openCallSheet, closeCallSheet, startHuddleElsewhere, wrapUpHuddle } from './actions'
export { FacePile, ParticipantTile, huddleTitle } from './parts'
