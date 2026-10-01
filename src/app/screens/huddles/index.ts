import { registerScreen } from '../../nav/registry'
import { HuddlesScreen } from './HuddlesScreen'

// The Huddles page (spec search-slackbot-huddles.md §3.11): push({ screen: 'huddles' }) (Home's Huddles tile, a prototype's
// `view: 'huddles'`).
registerScreen('huddles', HuddlesScreen)
