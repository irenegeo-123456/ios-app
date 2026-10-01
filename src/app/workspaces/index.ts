import { registerSheet } from '../nav/registry'
import { WorkspacesDrawer } from './WorkspacesDrawer'

// The workspace switcher (shell-navigation.md §5): Home's workspace button presents it with presentSheet('workspaces').
// It's an overlay: a left drawer over the tab UI (WorkspacesListRoute(openLeftPanel: true)), not a bottom sheet.
registerSheet('workspaces', WorkspacesDrawer, 'overlay')
