import { registerScreen, registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { SlackbotScreen } from './SlackbotScreen'
import { HistorySheet, SkillsSheet, SourcesSheet, TimelineSheet } from './SlackbotSheets'
import { ensureSlackbotUser } from './constants'
import { SlackbotSheet } from './SlackbotSheet'

// Slackbot (spec search-slackbot-huddles.md §2): the Slackbot DM screen, the Slackbot tab's landing page and their sheets.
//
//   push({ screen: 'slackbot' })                                  Home's Slackbot tile, the DM list, prototypes' view: 'slackbot'
//   push({ screen: 'slackbot', chatId })                          one of Slackbot's threads
//   push({ screen: 'slackbot', entry: 'tab' })                    a conversation opened from the Slackbot tab
//   presentSheet('slackbot-history')                              past threads, from a conversation's History button (§2.6)
//   presentSheet('slackbot-history-page')                         the same as a standard modal (the tab's "View all conversations")
//   presentSheet('slackbot-skills')                               Skills (the tab's More actions menu, §2.7)
//   presentSheet('slackbot-sources', { text })                    an answer's sources (§2.5c)
//   presentSheet('slackbot-timeline', { steps, running })         "View tool timeline" (§2.5a)
//
// June's 'slackbot-prompts' (the prompt category sheet) is gone with the rail (§2.3).

ensureSlackbotUser()

registerScreen('slackbot', SlackbotScreen)
// The conversation header's Slackbot button opens the Slackbot DM as a bottom sheet (AnyConversationFeature.swift:525-529:
// AnyConversationRoute(…, navigationMethod: .bottomSheet())).
registerSheet('slackbot-dm', SlackbotSheet as never, 'page')

// a sheet, [.medium, .large] (AiHistoryFeature.swift:38-43; AiHistoryFeatureInterface.swift:43)
registerSheet('slackbot-history', HistorySheet as never, 'medium')
// History's navigation bar drags the sheet (it sits over the list)
configureSheet('slackbot-history', { detents: ['medium', 'large'], headerDrag: 76 })
// a standard modal from the tab (presentation .modal → .standard, AiHistoryFeature.swift:36-37; SlackbotFeature.swift:262-285)
registerSheet('slackbot-history-page', HistorySheet as never, 'page')
// a standard modal from the tab's menu (SlackbotSkillsFeature.swift:23-27; SlackbotFeature.swift:200-205)
registerSheet('slackbot-skills', SkillsSheet as never, 'page')
// [.medium, .large] with the grabber, in a navigation controller (AiTimelineSourcesFeature.swift:27-37; AiToolTimelineFeature.swift:25-35)
registerSheet('slackbot-sources', SourcesSheet as never, 'medium')
registerSheet('slackbot-timeline', TimelineSheet as never, 'medium')

export { SlackbotScreen } from './SlackbotScreen'
export { SlackbotTabScreen } from './SlackbotTab'
export { SlackbotAvatar } from './SlackbotAvatar'
export { SLACKBOT_DM, SLACKBOT_USER_ID, SLACKBOT_AVATAR } from './constants'
export { useSlackbot, isWorking } from './state'
export { answer, looksLikeQuestion, citationsOf, provisionalTitle } from './engine'
