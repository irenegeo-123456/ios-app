import icons from '../../../icons/generated/icons.json'
import { useApp } from '../../store'
import type { User } from '../../../data/types'

// Who Slackbot is, for every Slackbot surface (spec search-slackbot-huddles.md §2): the Slackbot user and the DM that
// holds its conversations (each conversation is a thread in it, §2.1). The composer already keys its "Ask Slackbot
// anything..." placeholder on the user id (src/app/composer/Composer.tsx, PlaceholderTextPublisher.swift:182-184).

/** Slackbot's user id (IdentifierHelper.isSlackbotUserId); the web clone uses the same one. */
export const SLACKBOT_USER_ID = 'USLACKBOT'
/** The Slackbot DM (web clone: src/components/slackbot/constants.ts). */
export const SLACKBOT_DM = 'D04SLACKBOT'

const slackbotIcon = (icons as Record<string, { viewBox: string; body: string }>).slackbot_color

/**
 * Slackbot's avatar image: the multicolor mark (SKIconManifest.svgSlackbotColor, slackbot_color.svg), cropped to its
 * 16 × 16 tile (the SVG draws it at 2…18 of a 20-unit box) so the tile fills the avatar square, as a profile image does.
 */
export const SLACKBOT_AVATAR = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 16 16" width="96" height="96" fill="none">${slackbotIcon?.body ?? ''}</svg>`,
)}`

/** The Slackbot user, as the workspace would carry it: a special system user (not an app), named "Slackbot" (slackbot_user, yaml:18820). */
export const SLACKBOT_USER: User = {
  id: SLACKBOT_USER_ID,
  name: 'Slackbot',
  realName: 'Slackbot',
  avatar: SLACKBOT_AVATAR,
  avatar2x: SLACKBOT_AVATAR,
  presence: 'active',
  // kept out of people lists (directories, search, pickers) like the live client does
  isBot: true,
}

/**
 * Makes sure the workspace knows Slackbot, so names, avatars and the composer resolve it: added to `fx.users` once, and
 * again whenever a prototype replaces the workspace. A prototype that defines its own USLACKBOT keeps it.
 */
export function ensureSlackbotUser() {
  const add = () => {
    const s = useApp.getState()
    if (s.fx.users[SLACKBOT_USER_ID]) return
    useApp.setState({ fx: { ...s.fx, users: { ...s.fx.users, [SLACKBOT_USER_ID]: SLACKBOT_USER } } })
  }
  add()
  useApp.subscribe((s, prev) => {
    if (s.fx.users !== prev.fx.users && !s.fx.users[SLACKBOT_USER_ID]) add()
  })
}

/**
 * `ios_hangbar_updates_v2` (hangbarUpdatesV2, default false, added 2026-09-08; Modules/Data/Toggles/Definitions/
 * ios_hangbar_updates_v2.json). Off: the AI disclaimer is the DM's context bar on the landing page ("Slackbot uses AI and
 * can make mistakes.", SlackbotAiLandingContentPlugin.swift:277-287) and answers have none. On: no context bar, and the
 * last answer's footer carries "Slackbot is AI and can make mistakes." above its buttons (AiResultFooterMapper.swift:31-32).
 * Not in src/app/flags.ts (outside this folder); flip it here to show the other look.
 */
export const HANGBAR_UPDATES_V2 = false
