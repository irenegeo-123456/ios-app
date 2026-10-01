import { registerScreen } from '../../nav/registry'
import { DirectoriesScreen } from './DirectoriesScreen'

// Directories: people, channels and user groups (prototypes' `view: 'directories'` pushes it).
registerScreen('directories', DirectoriesScreen)
