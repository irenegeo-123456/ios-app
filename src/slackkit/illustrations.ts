// SlackKit's empty-state illustrations and images (Modules/UIInfra/SlackKit/ResourceBundle/SlackKit.xcassets), copied
// into ./assets with their imageset names. Where the asset catalog has a `_dark` imageset, `dark` is it.

import activity from './assets/activity_empty_state.svg'
import activityDark from './assets/activity_empty_state_dark.svg'
import dms from './assets/dms_empty_state.svg'
import dmsDark from './assets/dms_empty_state_dark.svg'
import home from './assets/home_empty_state.svg'
import homeDark from './assets/home_empty_state_dark.svg'
import laterArchived from './assets/later_archived_empty_state.svg'
import laterArchivedDark from './assets/later_archived_empty_state_dark.svg'
import laterCompleted from './assets/later_completed_empty_state.svg'
import laterCompletedDark from './assets/later_completed_empty_state_dark.svg'
import laterInProgress from './assets/later_in_progress_empty_state.svg'
import laterInProgressDark from './assets/later_in_progress_empty_state_dark.svg'
import drafts from './assets/drafts_empty_state.svg'
import scheduled from './assets/scheduled_empty_state.svg'
import sent from './assets/sent_empty_state.svg'
import scw from './assets/scw_empty_state.svg'
import genericError from './assets/generic_error_empty_state.svg'
import magnifyingGlass from './assets/magnifying_glass.svg'
import magnifyingGlassDark from './assets/magnifying_glass_dark.svg'
import searchCanvas from './assets/search_canvas_icon.svg'
import searchCanvasDark from './assets/search_canvas_icon_dark.svg'
import searchFiles from './assets/search_files_icon.svg'
import searchFilesDark from './assets/search_files_icon_dark.svg'
import searchWorkflows from './assets/search_workflows_icon.svg'
import searchWorkflowsDark from './assets/search_workflows_icon_dark.svg'
import emojiNoResults from './assets/emoji_no_results.png'
import bell from './assets/bell_image_for_notifications_banner.png'
import slackbot from './assets/slackbot.png'

const ILLUSTRATIONS = {
  activity: { light: activity, dark: activityDark },
  dms: { light: dms, dark: dmsDark },
  home: { light: home, dark: homeDark },
  later_archived: { light: laterArchived, dark: laterArchivedDark },
  later_completed: { light: laterCompleted, dark: laterCompletedDark },
  later_in_progress: { light: laterInProgress, dark: laterInProgressDark },
  drafts: { light: drafts },
  scheduled: { light: scheduled },
  sent: { light: sent },
  scw: { light: scw },
  generic_error: { light: genericError },
  magnifying_glass: { light: magnifyingGlass, dark: magnifyingGlassDark },
  search_canvas: { light: searchCanvas, dark: searchCanvasDark },
  search_files: { light: searchFiles, dark: searchFilesDark },
  search_workflows: { light: searchWorkflows, dark: searchWorkflowsDark },
  /** the test bundle's snapshot fixture (SKEmptyStateSnapshotTests.swift:17) */
  emoji_no_results: { light: emojiNoResults },
  bell_image_for_notifications_banner: { light: bell },
  slackbot: { light: slackbot },
} as const

export type SKEmptyStateIllustration = keyof typeof ILLUSTRATIONS
export const EMPTY_STATE_ILLUSTRATIONS: Record<SKEmptyStateIllustration, { light: string; dark?: string }> = ILLUSTRATIONS
