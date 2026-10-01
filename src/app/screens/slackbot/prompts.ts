// The copy of Slackbot's landing page (spec search-slackbot-huddles.md §2.3), exactly as the iOS app has it
// (Modules/Data/Strings/Implementation/localized_strings.yaml, keys in the comments).

// June's prompt category rail (Discover / Create / Find / Brainstorm) and its prompt sheet are gone in September 2026
// (14b3cbaf deleted SlackbotAiMessagePlugins/Implementation/Prompts/; spec §2.3).

/** The NUX prompt rows: emoji on a 36 pt circle in the palette's _5 (SlackbotAiLandingContentProvider.swift:91-126). */
export const NUX_PROMPTS: { text: string; emoji: string; circle: string }[] = [
  { text: 'Find action items from my recent conversations', emoji: 'sports_medal', circle: 'var(--dt_color_palettes_campfire_5)' }, // slackbot_ai_welcome_mat_nux_prompt1 (20015), 🏅
  { text: 'Tell me about what you can do', emoji: 'speech_balloon', circle: 'var(--dt_color_palettes_cilantro_5)' }, // …prompt2 (20018), 💬
  { text: 'Based on my activity in Slack, what animal would I be?', emoji: 'dog', circle: 'var(--dt_color_palettes_ocean_5)' }, // …prompt3 (20021), 🐶
  { text: 'Surprise me', emoji: 'tada', circle: 'var(--dt_color_palettes_aubergine_5)' }, // …prompt4 (20024), 🎉
]

/** The 26 welcome lines, one picked at random each time the landing page comes on screen (SlackbotAiLandingContentProvider.swift:39-70). */
export const WELCOME_MESSAGES = [
  "I've been here the whole time, but it's nicer when you are too.", // ive_been_here_the_whole_time_but_its_nicer_when_you_are_too (10297)
  "Somewhere it's morning, somewhere it's night - here, it's just us.", // somewhere_its_morning_somewhere_its_night_here_its_just_us (20413)
  'The light changes, but the workspace stays interesting.', // the_light_changes_but_the_workspace_stays_interesting (21230)
  'Slackbot AI here, practicing my entrance lines for when you show up.', // slackbot_ai_here_practicing_my_entrance_lines_for_when_you_show_up (19918)
  'Fancy meeting you here.', // fancy_meeting_you_here (6733)
  "This little box feels bigger when you're here.", // this_little_box_feels_bigger_when_youre_here (21512)
  'Hey there — I was just mentally rehearsing my hello.', // hey_there_i_was_just_mentally_rehearsing_my_hello (7888)
  'Look who wandered in. Excellent choice.', // look_who_wandered_in_excellent_choice (11558)
  "You open Slack, I appear. It's a whole thing we have.", // you_open_slack_i_appear_its_a_whole_thing_we_have (24432)
  "You bring the words, I'll bring the… other words.", // you_bring_the_words_ill_bring_the_other_words (24248)
  'Look at us, meeting like this.', // look_at_us_meeting_like_this (11555)
  "This space feels more like itself when you're in it.", // this_space_feels_more_like_itself_when_youre_in_it (21590)
  "Glad you dropped in — it's nicer with company.", // glad_you_dropped_in_its_nicer_with_company (7663)
  "This corner of Slack lights up when you're here.", // this_corner_of_slack_lights_up_when_youre_here (21469)
  'Could be the start of something, could be the middle of something great.', // could_be_the_start_of_something_could_be_the_middle_of_something_great (4795)
  'Always good to see the human half of this arrangement.', // always_good_to_see_the_human_half_of_this_arrangement (1799)
  'You + me + this workspace = a good time for ideas.', // you_me_this_workspace_a_good_time_for_ideas (24426)
  'Here we are again, like a well-timed reply.', // here_we_are_again_like_a_well_timed_reply (7879)
  'Glad to see you! I was just about to start talking to myself.', // glad_to_see_you_i_was_just_about_to_start_talking_to_myself (7660)
  'Ah, my favorite co-star.', // ah_my_favorite_co_star (1236)
  'Good timing, I was just about to start narrating my own thoughts.', // good_timing_i_was_just_about_to_start_narrating_my_own_thoughts (7709)
  "Hey, it's you — and by extension, it's us.", // hey_its_you_and_by_extension_its_us (7885)
  'This little patch of Slack just got 100% more interesting.', // this_little_patch_of_slack_just_got_100_more_interesting (21515)
  "Slack's a big place — glad you landed here.", // slacks_a_big_place_glad_you_landed_here (20278)
  'Our streak of excellent timing continues.', // our_streak_of_excellent_timing_continues (14450)
  'You arrive, and suddenly I have purpose again.', // you_arrive_and_suddenly_i_have_purpose_again (24245)
]

export const randomWelcome = () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]

/**
 * "Good morning, Ann!" (greetingMessage, SlackbotAiLandingContentProvider.swift:21-37): Good morning (good_morning 7703) before 12:00, Good afternoon
 * (good_afternoon 7697) before 17:00, Good evening (good_evening 7700) before 24:00, else Hello (hello 7864).
 */
export function greeting(firstName: string, now = new Date()) {
  const h = now.getHours()
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 24 ? 'Good evening' : 'Hello'
  return `${prefix}, ${firstName}!`
}

/** The NUX state's fake Slackbot message: slackbot_ai_nux_welcome_mat_message (yaml:19924), a blank line, then
 *  slackbot_ai_nux_welcome_mat_message_bold (19928) in bold (SlackbotAiLandingContentPlugin.swift:452-497). */
export const NUX_MESSAGE = 'Hi! Let me reintroduce myself. I’m here to help you work better in Slack. Whatever you have access to, I can find it and help you work with it — just ask!'
export const NUX_QUESTION = 'Ready to give this a try?'

// ------------------------------------------------------------------------------------------------ the Slackbot tab

export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

/** The time of day, bucketed like the DM's greeting: before 12:00, before 17:00, else evening (SlackbotGreeting.swift:78-83). */
export const timeOfDay = (now = new Date()): TimeOfDay => (now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening')

/** A greeting variant: a format and whether it interpolates the first name (SlackbotGreeting.swift:28-36). */
type Variant = [format: string, usesFirstName: boolean]

// The pools (SlackbotGreeting.swift:107-169; keys slackbot_greeting_*, yaml:20062-20142)
const WEEKDAY: Partial<Record<number, Variant>> = {
  0: ['Weekend mode? I’m still here', false], // slackbot_greeting_weekend (20142)
  1: ['Monday energy, %@. Let’s go!', true], // slackbot_greeting_monday (20116)
  3: ['Midweek. What’s blocking you?', false], // slackbot_greeting_wednesday (20139)
  5: ['Happy Friday, %@. Finish line’s in sight!', true], // slackbot_greeting_friday (20104)
  6: ['Weekend mode? I’m still here', false], // slackbot_greeting_weekend
}
const CASUAL: Variant[] = [
  ['The floor is yours, %@.', true], // slackbot_greeting_casual_floor_is_yours (20085)
  ['Your favorite coworker is ready!', false], // slackbot_greeting_casual_favorite_coworker (20082)
  ['Status: ready when you are!', false], // slackbot_greeting_casual_ready (20089)
]
const BY_TIME: Record<TimeOfDay, Variant[]> = {
  morning: [
    ['Good morning, %@!', true], // slackbot_greeting_morning (20120)
    ['New day, clean slate, %@!', true], // slackbot_greeting_morning_clean_slate (20124)
    ['%@ is online. Let’s make things happen!', true], // slackbot_greeting_morning_online (20131)
    ['Morning! No standup required, just ask', false], // slackbot_greeting_morning_no_standup (20128)
  ],
  afternoon: [
    ['Good afternoon, %@!', true], // slackbot_greeting_afternoon (20062)
    ['Afternoon, %@. Still in the flow?', true], // slackbot_greeting_afternoon_in_flow (20070)
    ['Back at it, %@!', true], // slackbot_greeting_afternoon_back_at_it (20066)
    ['Hey %@, what’s next on the list?', true], // slackbot_greeting_afternoon_whats_next (20078)
  ],
  evening: [
    ['Good evening, %@!', true], // slackbot_greeting_evening (20092)
    ['The async life, %@. What do you need?', true], // slackbot_greeting_evening_async_life (20096)
  ],
}
// from 18:30, "after hours" and "late night" join the evening pool (:39-40, :124-128)
const LATE_EVENING: Variant[] = [
  ['After hours, %@? I’m here for it', true], // slackbot_greeting_late_evening_after_hours (20108)
  ['Late night session. No judgment', false], // slackbot_greeting_late_evening_late_night (20112)
]
// a user with no name gets the plain line (:55-59, :171-177)
const PLAIN: Record<TimeOfDay, string> = {
  morning: 'Good morning!', // slackbot_greeting_morning_plain (20135)
  afternoon: 'Good afternoon!', // slackbot_greeting_afternoon_plain (20074)
  evening: 'Good evening!', // slackbot_greeting_evening_plain (20100)
}

/**
 * The Slackbot tab's greeting (SlackbotGreeting.swift:68-101): one seed per visit picks one of five buckets — 0 the
 * weekday's line when there is one, 1 a casual line, the rest the time of day's pool — and a line in it.
 */
export function tabGreeting(firstName: string | undefined, seed: number, now = new Date()): string {
  const tod = timeOfDay(now)
  if (!firstName) return PLAIN[tod]
  const pick = (pool: Variant[]) => pool[Math.abs(seed % pool.length)]
  const bucket = Math.abs(seed % 5)
  let v: Variant | undefined = bucket === 0 ? WEEKDAY[now.getDay()] : undefined
  if (!v && bucket === 1) v = pick(CASUAL)
  if (!v) {
    const minutes = now.getHours() * 60 + now.getMinutes()
    v = pick(tod === 'evening' && minutes >= 18 * 60 + 30 ? [...BY_TIME.evening, ...LATE_EVENING] : BY_TIME[tod])
  }
  return v[1] ? v[0].replace('%@', firstName) : v[0]
}

/**
 * A "Recommended for you" card (SlackbotBigModeSuggestion: id, icon, title, subtitle, prompt; SlackbotBigModeSuggestions
 * ServiceInterface.swift:13-45). The server ranks and words them; these are the demo's, after the web kit's two
 * (slack-remix src/components/slackbot/SlackbotView.tsx RECOMMENDED), with the icons the server's types map to
 * (SlackbotBigModeSuggestionsService.swift:75-88).
 */
export interface TabSuggestion {
  id: string
  /** Icons.xcassets name: check_list, direct_messages, edit, subtask_complete, mentions, notifications, calendar, channel, headphones, ai_sparkle */
  icon: string
  title: string
  subtitle: string
  /** what tapping the card sends */
  prompt: string
}

export const TAB_SUGGESTIONS: TabSuggestion[] = [
  { id: 'sb_week', icon: 'direct_messages', title: 'What happened in Slack this week?', subtitle: 'A recap of the conversations you were part of', prompt: 'What happened in Slack this week?' },
  { id: 'sb_attention', icon: 'notifications', title: 'What needs my attention today?', subtitle: 'Mentions, DMs and threads waiting on you', prompt: 'What needs my attention today?' },
  { id: 'sb_plan', icon: 'check_list', title: 'Plan my day', subtitle: 'Turn today’s meetings and asks into a to-do list', prompt: 'Plan my day based on my calendar and what people asked me for' },
]
