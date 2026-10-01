import { registerScreen } from '../../nav/registry'
import { ThreadsScreen } from './ThreadsScreen'

// All threads, pushed by Home's Threads tile (ThreadsTile.swift:108 → AllThreadsRoute): push({ screen: 'threads' })
registerScreen('threads', ThreadsScreen)
