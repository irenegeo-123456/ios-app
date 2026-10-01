import { registerScreen, registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { LaterScreen } from './LaterScreen'
import { LaterReminderSheet } from './LaterReminderSheet'

// Later, pushed by Home's Later tile (LaterTile.swift:131-139 → TasksRoute): push({ screen: 'later' }), or
// push({ screen: 'later', tab: 'archived' | 'completed' }) for another tab.
registerScreen('later', LaterScreen)

// The reminder picker: an SKBottomSheet hugging its list; with bottomsheetMigration a native sheet with one
// self-sized detent (TasksCustomReminderFeature.swift:248-254).
registerSheet('later-reminder', LaterReminderSheet as never, 'fit')
configureSheet('later-reminder', { chrome: 'legacy', migrated: { detents: ['fit'] } })
