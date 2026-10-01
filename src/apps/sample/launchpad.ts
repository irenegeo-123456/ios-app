import { DEMO_IDS } from '../../data/demo'
import { bk, clockTime, defineApp, shortDate, type AppContext, type KitBlock, type ModalDefinition, type PostedMessage } from '../kit'

// Launchpad: a sample app for the Atlas launch story, built with the App Kit. It exercises every part of it:
// - /launchpad status  → posts a Block Kit status card in the channel (in_channel, so the command shows too)
// - "Update status"    → a modal (select, text, date picker, multi-user select, checkboxes); submitting updates
//                        every posted card in place and replies in the card's thread
// - "Add task" / the "Create launch task from message" shortcut / the "New launch task" global shortcut
//                      → a task modal (text, user select, date picker, radio buttons) with an ephemeral receipt
// - "View checklist", /launchpad help, /launchpad checklist → ephemeral "Only visible to you" responses
// - the Home tab       → a live dashboard (sections, fields, buttons, overflow) driven by the app state
// Everything here is plain data + handlers; see docs/app-kit.md.

const { U, C } = DEMO_IDS
const { md, header, section, fields, divider, context, actions, button, overflow, imageEl, select, input, textInput, usersSelect, multiUsersSelect, datepicker, checkboxes, radio } = bk

type Status = 'on_track' | 'at_risk' | 'blocked'

interface Check {
  id: string
  label: string
  owner: string
  done: boolean
  /** extra detail while not done ("80%", "due Oct 7") */
  detail?: string
  risk?: boolean
}

interface Task {
  id: string
  title: string
  owner: string
  due?: string
  priority: 'high' | 'normal'
  done: boolean
  /** the message it was created from */
  source?: { channel: string; ts: string }
}

interface State {
  status: Status
  /** YYYY-MM-DD */
  target: string
  note: string
  updatedBy: string
  updatedAt: string
  checklist: Check[]
  tasks: Task[]
  /** status cards posted so far (kept in sync with chat.update) */
  cards: PostedMessage[]
  subscribed: boolean
}

const STATUS: Record<Status, { label: string; emoji: string }> = {
  on_track: { label: 'On track', emoji: ':large_green_circle:' },
  at_risk: { label: 'At risk', emoji: ':large_yellow_circle:' },
  blocked: { label: 'Blocked', emoji: ':red_circle:' },
}

const AVATAR: Record<string, string> = {
  [U.alex]: '/avatars/demo/alex.svg',
  [U.priya]: '/avatars/demo/priya.svg',
  [U.marcus]: '/avatars/demo/marcus.svg',
  [U.sofia]: '/avatars/demo/sofia.svg',
  [U.hannah]: '/avatars/demo/hannah.svg',
  [U.daniel]: '/avatars/demo/daniel.svg',
  [U.luis]: '/avatars/demo/luis.svg',
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
/** The Atlas target date in #launch-atlas's topic: the next Oct 14. */
function launchDate(): string {
  const now = new Date()
  const thisYear = new Date(now.getFullYear(), 9, 14)
  return iso(now <= thisYear ? thisYear : new Date(now.getFullYear() + 1, 9, 14))
}
const daysUntil = (date: string) => {
  const now = new Date()
  return Math.round((parse(date).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
}
const countdown = (date: string) => {
  const d = daysUntil(date)
  return d > 1 ? `${d} days to go` : d === 1 ? 'launching tomorrow' : d === 0 ? 'launch day' : `launched ${-d} days ago`
}
const longDate = (date: string) => parse(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const inDays = (n: number) => {
  const d = new Date()
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}

// ------------------------------------------------------------------------------------------------
// Blocks

type Ctx = AppContext<State>

function progress(s: State) {
  const done = s.checklist.filter((c) => c.done).length
  return { done, total: s.checklist.length, bar: '▰'.repeat(done) + '▱'.repeat(s.checklist.length - done) }
}

const nextMilestone = (s: State) => s.checklist.find((c) => !c.done && c.detail?.startsWith('Oct')) ?? s.checklist.find((c) => !c.done)
const atRisk = (s: State) => s.checklist.filter((c) => !c.done && c.risk)

/** The status card Launchpad posts in channels (and keeps up to date). */
function statusCard(s: State, name: (id: string) => string): { text: string; blocks: KitBlock[] } {
  const st = STATUS[s.status]
  const p = progress(s)
  const next = nextMilestone(s)
  const risks = atRisk(s)
  const open = s.tasks.filter((t) => !t.done).length
  return {
    text: `Atlas launch: ${st.label} · ${countdown(s.target)}`,
    blocks: [
      header(`:rocket: Atlas launch · ${countdown(s.target)}`),
      section(`${st.emoji} *${st.label}* · target *${longDate(s.target)}*\nDRI <@${U.alex}> · <#${C.launch}|launch-atlas>`, {
        block_id: 'lp_card_summary',
        accessory: overflow('lp_card_more', [
          [s.subscribed ? 'Turn off status DMs' : 'Get status updates by DM', 'subscribe'],
          ['View checklist', 'checklist'],
          ['Share to #announcements', 'share'],
        ]),
      }),
      fields(
        [
          `*Readiness*\n${p.bar} ${p.done} of ${p.total}`,
          `*Next milestone*\n${next ? `${next.label}${next.detail ? ` · ${next.detail}` : ''}` : 'All set :tada:'}`,
          `*At risk*\n${risks.length ? risks.map((r) => r.label).join(', ') : 'Nothing right now'}`,
          `*Open tasks*\n${open}`,
        ],
        'lp_card_fields',
      ),
      context(imageEl(AVATAR[s.updatedBy] ?? AVATAR[U.alex], name(s.updatedBy)), `Updated by *${name(s.updatedBy)}* at ${s.updatedAt} · ${s.note}`),
      actions('lp_card_actions', button('Update status', 'lp_update_status', { style: 'primary' }), button('Add task', 'lp_add_task'), button('View checklist', 'lp_view_checklist')),
    ],
  }
}

const checkLine = (c: Check, name: (id: string) => string) =>
  `${c.done ? ':white_check_mark:' : c.risk ? ':x:' : c.detail?.startsWith('Oct') ? ':spiral_calendar_pad:' : ':hourglass_flowing_sand:'} *${c.label}* · ${name(c.owner)}${!c.done && c.detail ? ` · ${c.detail}` : ''}`

/** The checklist, as an ephemeral message. */
function checklistMessage(s: State, name: (id: string) => string) {
  const p = progress(s)
  return {
    text: `Atlas readiness: ${p.done} of ${p.total} done`,
    blocks: [
      section(`*Atlas readiness* · ${p.done} of ${p.total} checks done`),
      section(s.checklist.map((c) => checkLine(c, name)).join('\n')),
      context('Check items off on Launchpad’s *Home* tab.'),
    ],
  }
}

function statusModal(s: State, meta: object): ModalDefinition {
  return {
    title: 'Update launch status',
    submit: 'Update',
    close: 'Cancel',
    callback_id: 'lp_status',
    private_metadata: JSON.stringify(meta),
    blocks: [
      section(`:rocket: *Atlas* · ${countdown(s.target)} · currently ${STATUS[s.status].emoji} *${STATUS[s.status].label}*`),
      input(
        'Launch status',
        select(
          'lp_status_value',
          'Choose a status',
          (Object.keys(STATUS) as Status[]).map((k) => [`${STATUS[k].emoji} ${STATUS[k].label}`, k] as [string, string]),
          s.status,
        ),
        { block_id: 'lp_status_block' },
      ),
      input('What changed?', textInput('lp_note', { multiline: true, placeholder: 'e.g. Pricing copy review is booked with Hannah for Thursday' }), { block_id: 'lp_note_block' }),
      input('Target date', datepicker('lp_target', s.target), { block_id: 'lp_target_block' }),
      input('Notify', multiUsersSelect('lp_notify', 'Select people', [U.priya, U.marcus]), { block_id: 'lp_notify_block', optional: true, hint: 'They’re mentioned in the card’s thread.' }),
      input('Also share', checkboxes('lp_share', [['Post a summary in #announcements', 'announcements']]), { block_id: 'lp_share_block', optional: true }),
    ],
  }
}

function taskModal(opts: { title?: string; owner?: string; meta: object }): ModalDefinition {
  return {
    title: 'New launch task',
    submit: 'Create',
    close: 'Cancel',
    callback_id: 'lp_task',
    private_metadata: JSON.stringify(opts.meta),
    blocks: [
      input('Task', textInput('lp_task_title', { initial: opts.title, placeholder: 'What needs to happen before launch?', max_length: 150 }), { block_id: 'lp_task_title_block' }),
      input('Owner', usersSelect('lp_task_owner', 'Select a person', opts.owner), { block_id: 'lp_task_owner_block' }),
      input('Due date', datepicker('lp_task_due', inDays(3)), { block_id: 'lp_task_due_block', optional: true }),
      input(
        'Priority',
        radio(
          'lp_task_priority',
          [
            ['High · blocks the launch', 'high'],
            ['Normal', 'normal'],
          ],
          'normal',
        ),
        { block_id: 'lp_task_priority_block' },
      ),
    ],
  }
}

function dashboard(s: State, name: (id: string) => string): KitBlock[] {
  const st = STATUS[s.status]
  const p = progress(s)
  const next = nextMilestone(s)
  const open = s.tasks.filter((t) => !t.done)
  return [
    header('Atlas launch'),
    section(`${st.emoji} *${st.label}* · target *${longDate(s.target)}* · ${countdown(s.target)}\n${s.note}`, {
      block_id: 'lp_home_status',
      accessory: button('Update status', 'lp_update_status', { style: 'primary', value: 'home' }),
    }),
    fields([`*Readiness*\n${p.bar} ${p.done} of ${p.total}`, `*DRI*\n<@${U.alex}>`, `*Next milestone*\n${next ? `${next.label}${next.detail ? ` · ${next.detail}` : ''}` : 'All set :tada:'}`, `*Channel*\n<#${C.launch}|launch-atlas>`]),
    context(imageEl(AVATAR[s.updatedBy] ?? AVATAR[U.alex], name(s.updatedBy)), `Last update by *${name(s.updatedBy)}* at ${s.updatedAt}`),
    divider(),
    header('Readiness checklist'),
    ...s.checklist.map((c) =>
      section(checkLine(c, name), {
        block_id: `lp_check_${c.id}`,
        accessory: c.done ? overflow('lp_check_more', [['Reopen', c.id]]) : button('Mark done', 'lp_check_done', { value: c.id }),
      }),
    ),
    divider(),
    header('Your tasks'),
    ...(open.length
      ? open.map((t) =>
          section(`${t.priority === 'high' ? ':red_circle:' : ':small_blue_diamond:'} *${t.title}*\n${name(t.owner)}${t.due ? ` · due ${shortDate(t.due)}` : ''}${t.source ? ` · <https://northstar-hq.slack.com/archives/${t.source.channel}/p${t.source.ts.replace('.', '')}|from a message>` : ''}`, {
            block_id: `lp_task_${t.id}`,
            accessory: button('Complete', 'lp_task_done', { value: t.id }),
          }),
        )
      : [context('No open tasks. Turn any message into one with *Create launch task from message* in its ⋮ menu, or run `/launchpad task`.')]),
    actions('lp_home_actions', button('New task', 'lp_add_task', { value: 'home' }), button('Post status to #launch-atlas', 'lp_post_card')),
    divider(),
    context(`Launchpad · keeping <#${C.launch}|launch-atlas> posted · <https://launchpad.northstar-hq.com|launchpad.northstar-hq.com>`),
  ]
}

// ------------------------------------------------------------------------------------------------
// Behaviour

/** Re-renders every status card Launchpad has posted (chat.update). */
function refreshCards(ctx: Ctx) {
  const card = statusCard(ctx.state, ctx.userName)
  for (const c of ctx.state.cards) ctx.update(card, c)
}

async function postCard(ctx: Ctx, where?: string) {
  const card = statusCard(ctx.state, ctx.userName)
  const posted = where ? await ctx.post(where, card) : await ctx.respond({ ...card, response_type: 'in_channel' })
  if (posted) ctx.setState((s) => ({ cards: [...s.cards, posted] }))
  return posted
}

const help = () => ({
  text: 'Launchpad commands',
  blocks: [
    section('*Launchpad* keeps the Atlas launch on track. Try:'),
    section('• `/launchpad status` posts the launch status card here\n• `/launchpad task [title]` adds a launch task\n• `/launchpad checklist` shows the readiness checklist (just to you)'),
    context('Or open *Launchpad* under Agents & apps for the full dashboard.'),
  ],
})

function openTaskModal(ctx: Ctx, title?: string, owner?: string, source?: { channel: string; ts: string }) {
  ctx.openModal(taskModal({ title, owner: owner ?? ctx.user.id, meta: { channel: ctx.channel?.id, source } }))
}

export default defineApp<State>({
  id: 'launchpad',
  name: 'Launchpad',
  icon: '/apps/launchpad.svg',
  description: 'Launch readiness for every release',
  about: {
    description: 'Launchpad keeps every launch on track, right in Slack:',
    features: [
      'Post a live launch status card to any channel with /launchpad status',
      'Update status, target date and owners from a quick form',
      'Turn any message into a launch task with a message shortcut',
      'Track the readiness checklist and your tasks from the Home tab',
    ],
    developer: 'Northstar Platform team',
    installedBy: U.alex,
    homepage: 'https://launchpad.northstar-hq.com',
  },

  state: {
    status: 'at_risk',
    target: launchDate(),
    note: 'Pricing page copy hasn’t started; everything else is on schedule.',
    updatedBy: U.priya,
    updatedAt: '9:12 AM',
    checklist: [
      { id: 'load', label: 'Load testing', owner: U.priya, done: true },
      { id: 'security', label: 'Security review', owner: U.marcus, done: true },
      { id: 'messaging', label: 'Launch messaging', owner: U.hannah, done: true },
      { id: 'docs', label: 'Docs', owner: U.luis, done: false, detail: '80%' },
      { id: 'demo', label: 'Demo environment', owner: U.alex, done: false, detail: 'Oct 7' },
      { id: 'enablement', label: 'Sales enablement', owner: U.daniel, done: false, detail: 'Oct 9' },
      { id: 'pricing', label: 'Pricing page copy', owner: U.alex, done: false, detail: 'not started', risk: true },
      { id: 'blog', label: 'Launch blog post', owner: U.hannah, done: false, detail: 'in review' },
    ],
    tasks: [{ id: 't1', title: 'Book the pricing copy review with Hannah', owner: U.alex, due: inDays(2), priority: 'high', done: false }],
    cards: [],
    subscribed: false,
  },

  home: ({ state, userName }) => dashboard(state, userName),

  commands: [
    {
      command: '/launchpad',
      usage: '[status | task | checklist | help]',
      description: 'Launch readiness at a glance',
      handler: async (ctx) => {
        const [sub = 'help', ...rest] = ctx.command?.args ?? []
        switch (sub.toLowerCase()) {
          case 'status':
            await postCard(ctx)
            return
          case 'task':
            openTaskModal(ctx, rest.join(' ') || undefined)
            return
          case 'checklist':
            await ctx.respond(checklistMessage(ctx.state, ctx.userName))
            return
          case 'help':
            await ctx.respond(help())
            return
          default:
            await ctx.respond(`I didn’t get \`${sub}\`. Try \`/launchpad help\`.`)
        }
      },
    },
  ],

  messageShortcuts: [
    {
      callback_id: 'lp_task_from_message',
      name: 'Create launch task from message',
      description: 'Track this message as a launch task',
      handler: (ctx) => {
        const m = ctx.message
        const title = m?.text.split('\n')[0].replace(/<[^>]+>/g, '').replace(/[*_~`]/g, '').replace(/:[a-z0-9_+-]+:/g, '').trim().slice(0, 140)
        // The person who asked owns it (you, when an app posted the message).
        const author = m ? ctx.userInfo(m.user) : undefined
        openTaskModal(ctx, title, author && !author.isApp ? author.id : undefined, m ? { channel: m.channel, ts: m.ts } : undefined)
      },
    },
  ],

  globalShortcuts: [{ callback_id: 'lp_new_task', name: 'New launch task', description: 'Add a task to the Atlas launch', handler: (ctx) => openTaskModal(ctx) }],

  actions: {
    lp_update_status: (ctx) => {
      const fromCard = ctx.surface === 'message' && ctx.message
      ctx.openModal(statusModal(ctx.state, fromCard ? { channel: ctx.message!.channel, ts: ctx.message!.ts } : {}))
    },
    lp_add_task: (ctx) => openTaskModal(ctx),
    lp_view_checklist: (ctx) => void ctx.ephemeral(checklistMessage(ctx.state, ctx.userName)),
    lp_card_more: async (ctx) => {
      switch (ctx.action?.value) {
        case 'subscribe': {
          const on = !ctx.state.subscribed
          ctx.setState({ subscribed: on })
          refreshCards(ctx)
          await ctx.ephemeral(on ? ':bell: You’ll get a DM from Launchpad whenever the launch status changes.' : ':no_bell: Status DMs are off.')
          return
        }
        case 'checklist':
          await ctx.ephemeral(checklistMessage(ctx.state, ctx.userName))
          return
        case 'share':
          await ctx.post(C.announcements, statusCard(ctx.state, ctx.userName))
          ctx.toast('Shared to #announcements')
      }
    },
    lp_check_done: (ctx) => toggleCheck(ctx, ctx.action?.value, true),
    lp_check_more: (ctx) => toggleCheck(ctx, ctx.action?.value, false),
    lp_task_done: (ctx) => {
      const id = ctx.action?.value
      ctx.setState((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)) }))
      refreshCards(ctx)
      ctx.toast('Task completed')
    },
    lp_post_card: async (ctx) => {
      await postCard(ctx, C.launch)
      ctx.toast('Posted to #launch-atlas')
    },
  },

  views: {
    lp_status: async (ctx) => {
      const status = (ctx.values.lp_status_value as Status | null) ?? ctx.state.status
      const note = String(ctx.values.lp_note ?? '').trim()
      const target = (ctx.values.lp_target as string | null) ?? ctx.state.target
      const notify = (ctx.values.lp_notify as string[] | null) ?? []
      const share = ((ctx.values.lp_share as string[] | null) ?? []).includes('announcements')
      if (daysUntil(target) < 0) return { response_action: 'errors', errors: { lp_target_block: 'Pick a date that hasn’t passed yet.' } }

      const before = ctx.state
      ctx.setState({ status, note, target, updatedBy: ctx.user.id, updatedAt: clockTime() })
      refreshCards(ctx)
      ctx.toast('Launch status updated')

      const st = STATUS[status]
      const changed = before.status !== status ? `${STATUS[before.status].emoji} ${STATUS[before.status].label} → ${st.emoji} *${st.label}*` : `${st.emoji} *${st.label}*`
      const moved = before.target !== target ? `\n:calendar: Target moved from ${shortDate(before.target)} to *${shortDate(target)}*` : ''
      const update = {
        text: `Launch status: ${st.label}`,
        blocks: [
          section(`*Status update* from <@${ctx.user.id}>\n${changed}${moved}`),
          section(`> ${note.replace(/\n/g, '\n> ')}`),
          ...(notify.length ? [context(`cc ${notify.map((u) => `<@${u}>`).join(' ')}`)] : []),
        ],
      }
      // The thread of the card the modal came from (or the latest card).
      const meta = JSON.parse(ctx.view?.private_metadata || '{}') as { channel?: string; ts?: string }
      const card = meta.ts ? { channel: meta.channel!, ts: meta.ts } : ctx.state.cards[ctx.state.cards.length - 1]
      if (card) await ctx.reply(update, card)
      if (share) await ctx.post(C.announcements, { text: `Atlas launch: ${st.label}`, blocks: [section(`:mega: *Atlas launch update* · ${st.emoji} ${st.label} · target ${longDate(target)}\n${note}`), context(`Posted by Launchpad for <@${ctx.user.id}>`)] })
      if (ctx.state.subscribed) await ctx.post('app', { text: `Atlas is now ${st.label}`, blocks: [section(`${st.emoji} Atlas is now *${st.label}* · target ${longDate(target)}`), context(`Updated by <@${ctx.user.id}> · ${clockTime()}`)] })
    },

    lp_task: async (ctx) => {
      const title = String(ctx.values.lp_task_title ?? '').trim()
      const owner = (ctx.values.lp_task_owner as string | null) ?? ctx.user.id
      const due = (ctx.values.lp_task_due as string | null) ?? undefined
      const priority = ctx.values.lp_task_priority === 'high' ? 'high' : 'normal'
      if (due && daysUntil(due) < 0) return { response_action: 'errors', errors: { lp_task_due_block: 'Pick a date that hasn’t passed yet.' } }
      const meta = JSON.parse(ctx.view?.private_metadata || '{}') as { channel?: string; source?: { channel: string; ts: string } }
      const task: Task = { id: `t${Date.now().toString(36)}`, title, owner, due, priority, done: false, source: meta.source }
      ctx.setState((s) => ({ tasks: [...s.tasks, task] }))
      refreshCards(ctx)

      const when = due ? ` · due ${shortDate(due)}` : ''
      if (meta.source)
        await ctx.reply(
          {
            text: `Launch task: ${title}`,
            blocks: [section(`:pushpin: <@${ctx.user.id}> turned this into a launch task: *${title}*`), context(`Owner <@${owner}>${when}${priority === 'high' ? ' · :red_circle: High priority' : ''}`)],
          },
          meta.source,
        )
      const receipt = {
        text: `Task created: ${title}`,
        blocks: [section(`:white_check_mark: Task created: *${title}*`), context(`Owner <@${owner}>${when} · It’s on your Launchpad dashboard.`)],
      }
      if (meta.channel) await ctx.ephemeral(receipt, meta.channel)
      else ctx.toast('Task created')
    },
  },

  onMessage: async (ctx) => {
    const text = ctx.message?.text.toLowerCase() ?? ''
    if (text.includes('status')) await ctx.say(statusCard(ctx.state, ctx.userName))
    else await ctx.say(help())
  },

  seed: (fx, { dmId, botUserId, ts }) => {
    if (fx.messages[dmId]?.length) return
    fx.messages[dmId] = [
      {
        ts: ts(60 * 26),
        userId: botUserId,
        text: 'Launchpad is connected to #launch-atlas',
        blocks: [
          section(`:wave: *Launchpad is connected to <#${C.launch}|launch-atlas>*\nI track readiness for the *Atlas* launch and keep the channel posted.`),
          section(
            '• `/launchpad status` posts the live status card in any channel\n• *Create launch task from message* (in a message’s ⋮ menu) turns requests into tasks\n• The *Home* tab is your launch dashboard',
          ),
          context(md(`Added by <@${U.alex}>`)),
        ],
      },
    ]
  },
})

function toggleCheck(ctx: Ctx, id: string | undefined, done: boolean) {
  const item = ctx.state.checklist.find((c) => c.id === id)
  if (!item) return
  ctx.setState((s) => ({ checklist: s.checklist.map((c) => (c.id === id ? { ...c, done } : c)) }))
  refreshCards(ctx)
  const card = ctx.state.cards[ctx.state.cards.length - 1]
  if (done && card) void ctx.reply({ text: `${item.label} is done`, blocks: [context(`:white_check_mark: *${item.label}* marked done by <@${ctx.user.id}> · ${progress(ctx.state).done} of ${ctx.state.checklist.length} checks done`)] }, card)
  ctx.toast(done ? `${item.label} marked done` : `${item.label} reopened`)
}
