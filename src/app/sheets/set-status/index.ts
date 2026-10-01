import { registerSheet } from '../../nav/registry'
import { SetStatusSheet } from './SetStatusSheet'
import { installStatusExpiry } from './status'

// Set a Status (spec you-settings.md §1): EditStatusRoute presents a form sheet (EditStatusRouteExecution.swift:5-9),
// from You's status pill and the profile's "Set a Status": presentSheet('set-status'). A status with "Clear after"
// clears itself when its time comes.
registerSheet('set-status', SetStatusSheet, 'page')
installStatusExpiry()

export { setMyStatus, useStatusPresets, useRecentStatuses, DEFAULT_PRESETS } from './status'
export type { Expiry, StatusPreset } from './status'
