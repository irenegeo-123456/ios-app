import { registerScreen } from '../../nav/registry'
import { DraftsScreen } from './DraftsScreen'

// Drafts & Sent, pushed by Home's Drafts & Sent tile (OutboundsTile.swift:101 → OutboundsRoute): push({ screen: 'drafts' }),
// or push({ screen: 'drafts', tab: 'scheduled' | 'sent' }) for another tab (the failed-message banner opens Sent).
registerScreen('drafts', DraftsScreen)
