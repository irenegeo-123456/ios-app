import { DEMO_IDS } from '../data/demo'
import { makeTs } from '../lib/time'
import { bk, clockTime, defineApp, replaceBlock, type AppContext, type ModalDefinition } from './kit'

// Standup, migrated from the data-driven effects in demo-slackbot.ts onto the App Kit. It looks exactly as
// before (same DM messages, App Home, About and modal); the behaviour now lives in handlers.

const { U, C } = DEMO_IDS
const { md, header, section, divider, context, actions, button, select, input, textInput } = bk

interface State {
  paused: boolean
  reminder: string
}

const ENGINEERING = `<#${C.engineering}|engineering>`
const REMINDERS: [string, string][] = [
  ['9:00 AM', '0900'],
  ['9:30 AM', '0930'],
  ['10:00 AM', '1000'],
]

/** The daily standup modal. `promptTs` is the "Time for standup" message to mark as done. */
function standupModal(opts: { promptTs?: string; today?: string } = {}): ModalDefinition {
  return {
    title: 'Daily standup',
    submit: 'Share',
    close: 'Cancel',
    callback_id: 'standup_update',
    private_metadata: opts.promptTs ?? '',
    blocks: [
      input('What did you do yesterday?', textInput('yesterday', { multiline: true, initial: 'Reviewed the summary card designs with Sofia' })),
      input('What will you do today?', textInput('today', { multiline: true, initial: opts.today ?? 'Pricing page copy and the Atlas demo workspace' })),
      input('Anything blocking you?', textInput('blockers', { placeholder: 'Nothing, hopefully!' }), { optional: true }),
    ],
  }
}

const pauseSection = (paused: boolean) =>
  paused
    ? section('*Pause reminders*\n:double_vertical_bar: Paused until you resume.', { block_id: 'standup_pause', accessory: button('Resume', 'resume_standup', { style: 'primary' }) })
    : section('*Pause reminders*\nGoing on vacation? Pause standups until you’re back.', { block_id: 'standup_pause', accessory: button('Pause', 'pause_standup') })

/** Marks the DM's "Time for standup" prompt: its buttons become a context line. */
function settlePrompt(ctx: AppContext<State>, ts: string, line: string) {
  const prompt = ctx.message?.ts === ts ? ctx.message : undefined
  const blocks = prompt?.blocks ?? promptBlocks()
  ctx.update({ blocks: replaceBlock(blocks, 'standup_today', context(line)) }, { channel: ctx.app.dmId, ts })
}

const promptBlocks = () => [
  section('Good morning, *Alex*! :wave: It’s time for the *Platform* standup.'),
  context(`Updates are shared in ${ENGINEERING} at 10:00 AM · 6 of 9 teammates have posted`),
  actions('standup_today', button('Share update', 'share_update', { style: 'primary' }), button('Skip today', 'skip_standup')),
]

export default defineApp<State>({
  id: 'standup',
  name: 'Standup',
  icon: '/apps/standup.svg',
  bot: { id: U.standup, dmId: C.standup },
  about: {
    description: 'Run async standups without the meeting:',
    features: ['Daily reminders at the time your team chooses', 'Updates posted to your team channel', 'Blockers flagged for managers', 'Weekly participation summaries'],
  },
  state: { paused: false, reminder: '0930' },

  home: ({ state }) => [
    header('Standup'),
    section(`You’re in *Platform standup* · weekdays at 9:30 AM · updates go to ${ENGINEERING}`, { accessory: button('Share today’s update', 'share_update_home', { style: 'primary' }) }),
    divider(),
    header('This week'),
    bk.fields(['*Your streak*\n:fire: 12 days', '*Team participation*\n86%', '*Open blockers*\n1 (Marcus)', '*Next reminder*\nTomorrow, 9:30 AM']),
    divider(),
    header('Settings'),
    section('*Reminder time*', { accessory: select('reminder_time', 'Choose a time', REMINDERS, state.reminder) }),
    pauseSection(state.paused),
    context(`Questions? Ask in ${ENGINEERING}.`),
  ],

  actions: {
    share_update: (ctx) => void ctx.openModal(standupModal({ promptTs: ctx.message?.ts })),
    share_update_home: (ctx) => void ctx.openModal(standupModal()),
    skip_standup: (ctx) => {
      if (ctx.message) settlePrompt(ctx, ctx.message.ts, `:zzz: You skipped today’s standup · ${clockTime()}`)
    },
    pause_standup: (ctx) => ctx.setState({ paused: true }),
    resume_standup: (ctx) => ctx.setState({ paused: false }),
    reminder_time: async (ctx) => {
      const option = ctx.action?.selected_option
      if (!option) return
      ctx.setState({ reminder: option.value })
      await ctx.post('app', { text: 'Reminder time updated', blocks: [section(`:alarm_clock: Got it. I’ll remind you at *${option.text}* on weekdays.`)] })
    },
  },

  views: {
    standup_update: async (ctx) => {
      const v = (k: string) => (typeof ctx.values[k] === 'string' && (ctx.values[k] as string).trim()) || 'None'
      const time = clockTime()
      const promptTs = ctx.view?.private_metadata
      if (promptTs) settlePrompt(ctx, promptTs, `:white_check_mark: Shared in ${ENGINEERING} at ${time}. Nice work!`)
      await ctx.post('app', {
        text: 'Your standup update',
        blocks: [section(`*Your update* :memo:\n• *Yesterday:* ${v('yesterday')}\n• *Today:* ${v('today')}\n• *Blockers:* ${v('blockers')}`), context(`Posted to ${ENGINEERING} · ${time}`)],
      })
    },
  },

  messageShortcuts: [
    {
      callback_id: 'standup_add',
      name: 'Add to standup',
      description: 'Use this message as today’s update',
      handler: (ctx) => void ctx.openModal(standupModal({ today: ctx.message?.text })),
    },
  ],

  // The DM history the demo starts with (was demo-slackbot.ts).
  seed: (fx) => {
    const list = fx.messages[C.standup] ?? []
    const now = new Date()
    const yesterday = makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 5, 11), 777)
    if (!list.some((m) => m.text === 'Platform standup · Yesterday'))
      list.unshift({
        ts: yesterday,
        userId: U.standup,
        text: 'Platform standup · Yesterday',
        blocks: [
          header('Platform standup · Yesterday'),
          section('*Priya Patel*\n• *Yesterday:* Q4 plan review with Tom\n• *Today:* Atlas GA staffing\n• *Blockers:* none'),
          section('*Marcus Chen*\n• *Yesterday:* search indexer rewrite\n• *Today:* PR review, then the Acme escalation\n• *Blockers:* waiting on an index migration window'),
          section('*Luis Fernandez*\n• *Yesterday:* fixed the `useVirtualList` test flake\n• *Today:* summary card polish\n• *Blockers:* none'),
          context(md(`3 of 9 updates · posted to ${ENGINEERING}`)),
        ],
      })
    const prompt = list.find((m) => m.text.includes('Time for standup'))
    if (prompt) prompt.blocks = promptBlocks()
    fx.messages[C.standup] = list
  },
})
