import { DEMO_IDS, extendDemo } from './demo'
import { makeTs } from '../lib/time'
import type { AppProfile, BlockKitBlock, Fixture, Message, SlackbotFixture } from './types'

// Slackbot area demo data: Block Kit messages in the app DMs, App Homes / About pages / button behaviour
// for Google Drive, Deploybot and Calendar (Standup is an App Kit app: src/apps/standup.ts), and Slackbot's past conversations, artifacts and tasks.

const { U, C } = DEMO_IDS

let seq = 400
const now = new Date()
const minsAgo = (mins: number) => makeTs(new Date(now.getTime() - mins * 60_000), ++seq)
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return makeTs(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, 11), ++seq)
}
const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

// ------------------------------------------------------------------------------------------------
// Block Kit helpers

type B = BlockKitBlock
const md = (text: string) => ({ type: 'mrkdwn', text })
const pt = (text: string) => ({ type: 'plain_text', text, emoji: true })
const section = (text: string, extra: Record<string, unknown> = {}): B => ({ type: 'section', text: md(text), ...extra })
const header = (text: string): B => ({ type: 'header', text: pt(text) })
const divider = (): B => ({ type: 'divider' })
const context = (...elements: unknown[]): B => ({ type: 'context', elements })
const actions = (block_id: string, ...elements: unknown[]): B => ({ type: 'actions', block_id, elements })
const button = (text: string, action_id: string, extra: Record<string, unknown> = {}) => ({ type: 'button', text: pt(text), action_id, ...extra })
const option = (text: string, value: string) => ({ text: pt(text), value })
const overflow = (action_id: string, ...opts: [string, string][]) => ({ type: 'overflow', action_id, options: opts.map(([t, v]) => option(t, v)) })
const select = (action_id: string, placeholder: string, opts: [string, string][], initial?: string) => ({
  type: 'static_select',
  action_id,
  placeholder: pt(placeholder),
  options: opts.map(([t, v]) => option(t, v)),
  ...(initial ? { initial_option: option(opts.find((o) => o[1] === initial)![0], initial) } : {}),
})
const image = (image_url: string, alt_text: string) => ({ type: 'image', image_url, alt_text })
const input = (label: string, action_id: string, extra: Record<string, unknown> = {}, optional = false): B => ({
  type: 'input',
  block_id: `input_${action_id}`,
  label: pt(label),
  optional,
  element: { type: 'plain_text_input', action_id, ...extra },
})

/** Google-style file type icons for context blocks (the live Drive app uses the Docs/Sheets/Slides icons). */
const fileIcon = (color: string, glyph: 'doc' | 'sheet' | 'slide') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 1h10l6 6v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="${color}"/><path d="M15 1v6h6" fill="#fff" fill-opacity=".45"/>${
      glyph === 'doc'
        ? '<path d="M7 12h10M7 15h10M7 18h7" stroke="#fff" stroke-width="1.6"/>'
        : glyph === 'sheet'
          ? '<path d="M7 11h10v8H7zM7 15h10M12 11v8" stroke="#fff" stroke-width="1.4" fill="none"/>'
          : '<rect x="7" y="11" width="10" height="7" rx="1" stroke="#fff" stroke-width="1.5" fill="none"/>'
    }</svg>`,
  )}`
const DOC = fileIcon('#4285F4', 'doc')
const SHEET = fileIcon('#0F9D58', 'sheet')
const SLIDE = fileIcon('#F4B400', 'slide')

const driveShare = (who: string, title: string, url: string, icon = DOC): B[] => [section(`*${who}* shared an item with you`), context(md('> '), image(icon, title), md(`*<${url}|${title}>*`))]

// ------------------------------------------------------------------------------------------------
// App DMs and App Homes

function apps(fx: Fixture) {
  const msgs = fx.messages
  const me = fx.users[fx.me]
  const email = `${me.realName.split(' ')[0].toLowerCase()}@${fx.workspace.domain.replace(/-hq$/, '')}.com`
  const withBlocks = (list: Message[], snippet: string, blocks: B[]) => {
    const m = list.find((x) => x.text.includes(snippet))
    if (m) m.blocks = blocks
  }

  // Google Drive ------------------------------------------------------------------------------
  const drive = msgs[C.drive] ?? []
  withBlocks(drive, 'Atlas summary cards', driveShare('Sofia Rodriguez', 'Atlas summary cards (v4)', 'https://docs.google.com/presentation/d/atlas-summary-cards', SLIDE))
  withBlocks(drive, 'commented on', [
    section('*Priya Patel* commented on *<https://docs.google.com/document/d/q4-platform-plan|Q4 Platform plan>*'),
    section('> Moved audit logs ahead of SSO per Tom. Read-only logs + CSV export for v1.'),
    actions('drive_comment', button('Reply', 'drive_reply'), button('Open in Google Docs', 'drive_open', { url: 'https://docs.google.com/document/d/q4-platform-plan' })),
  ])
  withBlocks(drive, 'Atlas launch messaging', driveShare('Hannah Schmidt', 'Atlas launch messaging', 'https://docs.google.com/document/d/atlas-launch-messaging'))
  drive.push({
    ts: minsAgo(6),
    userId: U.drive,
    text: 'Noah Williams is requesting access to Initech rollout plan',
    blocks: [
      section('*Noah Williams* is requesting access to a file you own'),
      context(md('> '), image(SHEET, 'Initech rollout plan'), md('*<https://docs.google.com/spreadsheets/d/initech-rollout|Initech rollout plan>*')),
      section('> Need this for Thursday’s kickoff with the Initech team. Thanks!'),
      actions(
        'drive_access',
        button('Share', 'drive_grant', { style: 'primary' }),
        button('Decline', 'drive_decline'),
        overflow('drive_access_more', ['Can comment', 'comment'], ['Can view', 'view']),
      ),
    ],
  })
  msgs[C.drive] = drive

  const driveProfile: AppProfile = {
    avatarLarge: '/apps/google-drive-72.png',
    homepage: 'https://slack.com/help/articles/205875058-Google-Drive-for-Slack',
    description:
      'Use Google Drive within Slack to:\n• Create new Google Docs, Slides, and Sheets files\n• Import an existing file from Google Drive into a channel or direct message\n• Search directly within Google Drive files shared within Slack\n• Automatically grant access to the files you share with the right audience\n• Get updates in Slack on changes in Drive, like comments, access requests, and new files shared with you\n• Reply directly to comment notifications from within Slack and have them posted to the file',
    home: [
      { type: 'section', text: pt('') },
      section('Google Drive helps you and your team share Google Docs, Slides, and more in Slack. Manage your notifications and link preview settings from this tab.'),
      { type: 'section', text: pt('') },
      divider(),
      header('Notifications'),
      section('Get notified about new comments, access requests, and files shared with you. Reply to comments and give teammates access to Google Drive files from Slack.', {
        block_id: 'gdrive_settings_notification',
        accessory: button('Turn Off', 'gdrive_settings_notification'),
      }),
      divider(),
      header('File Previews'),
      section('See rich previews of the Google Drive links you share in Slack.', { block_id: 'gdrive_settings_unfurl', accessory: button('Turn Off', 'gdrive_settings_unfurl') }),
      divider(),
      header('Admin options'),
      divider(),
      header('Domain-wide Authentication'),
      section('Connect your domain to authorize Google Drive for workspace members with an email address in that domain.', {
        block_id: 'gdrive_settings_add_domain',
        accessory: button('Add Domain', 'gdrive_settings_add_domain_auth', { style: 'primary' }),
      }),
      divider(),
      section(`:email: *${email}*`),
      actions('CEwLA', button('Disconnect Google Drive', 'gdrive_settings_disconnect_google_drive')),
      context(md('Visit our <https://slack.com/help/articles/360047862573|Help Center> for a step-by-step guide.')),
    ],
    actions: {
      drive_reply: {
        modal: {
          title: 'Reply to comment',
          submitLabel: 'Reply',
          blocks: [
            section('*Priya Patel* on *Q4 Platform plan*\n> Moved audit logs ahead of SSO per Tom. Read-only logs + CSV export for v1.'),
            input('Your reply', 'reply', { multiline: true, placeholder: pt('Write a reply…') }),
          ],
          submit: {
            replaceBlock: [context(md(':speech_balloon: You replied: “{{reply}}” · {{time}}'))],
          },
        },
      },
      drive_grant: {
        replaceBlock: [context(md(':white_check_mark: You gave *Noah Williams* edit access to *Initech rollout plan* · {{time}}'))],
        reply: { text: 'Noah Williams now has edit access to Initech rollout plan.', blocks: [section(':white_check_mark: *Noah Williams* now has edit access to *Initech rollout plan*.')] },
      },
      'drive_access_more:comment': { replaceBlock: [context(md(':white_check_mark: You gave *Noah Williams* comment access · {{time}}'))] },
      'drive_access_more:view': { replaceBlock: [context(md(':white_check_mark: You gave *Noah Williams* view access · {{time}}'))] },
      drive_decline: { replaceBlock: [context(md(':no_entry_sign: You declined the request · {{time}}'))] },
      gdrive_settings_notification: {
        replaceBlock: [
          section('Get notified about new comments, access requests, and files shared with you. Reply to comments and give teammates access to Google Drive files from Slack.', {
            block_id: 'gdrive_settings_notification',
            accessory: button('Turn On', 'gdrive_settings_notification_on', { style: 'primary' }),
          }),
        ],
      },
      gdrive_settings_notification_on: {
        replaceBlock: [
          section('Get notified about new comments, access requests, and files shared with you. Reply to comments and give teammates access to Google Drive files from Slack.', {
            block_id: 'gdrive_settings_notification',
            accessory: button('Turn Off', 'gdrive_settings_notification'),
          }),
        ],
      },
      gdrive_settings_unfurl: {
        replaceBlock: [
          section('See rich previews of the Google Drive links you share in Slack.', {
            block_id: 'gdrive_settings_unfurl',
            accessory: button('Turn On', 'gdrive_settings_unfurl_on', { style: 'primary' }),
          }),
        ],
      },
      gdrive_settings_unfurl_on: {
        replaceBlock: [section('See rich previews of the Google Drive links you share in Slack.', { block_id: 'gdrive_settings_unfurl', accessory: button('Turn Off', 'gdrive_settings_unfurl') })],
      },
      gdrive_settings_add_domain_auth: {
        modal: {
          title: 'Add a domain',
          submitLabel: 'Add Domain',
          blocks: [
            section('Members with an email address in this domain can use Google Drive without connecting their own account.'),
            input('Domain', 'domain', { placeholder: pt('northstar-hq.com') }),
          ],
          submit: { reply: { text: 'Domain added', blocks: [section(':white_check_mark: *{{domain}}* is now authorized for Google Drive.')] } },
        },
      },
      gdrive_settings_disconnect_google_drive: {
        modal: {
          title: 'Disconnect Google Drive?',
          submitLabel: 'Disconnect',
          blocks: [section("You'll stop getting notifications from Google Drive, and links you share won't show previews until you reconnect.")],
          submit: { reply: { text: 'Google Drive is disconnected. You can reconnect from the Home tab anytime.' } },
        },
      },
    },
  }

  // Deploybot ----------------------------------------------------------------------------------
  const deploy = msgs[C.deploy] ?? []
  const deployCtx = (text: string) => context(image('/apps/deploybot.svg', 'Deploybot'), md(text))
  withBlocks(deploy, '#4809', [
    section(':white_check_mark: *Deploy #4809 succeeded* to *staging*', { accessory: overflow('deploy_menu', ['View logs', 'logs'], ['View diff', 'diff']) }),
    { type: 'section', fields: [md('*Services*\n`api` · `web`'), md('*Duration*\n4m 51s'), md('*Commits*\n6'), md('*Triggered by*\nLuis Fernandez')] },
    deployCtx('atlas@9c21e7b · staging.northstar-hq.com'),
  ])
  withBlocks(deploy, '#4812', [
    section(':white_check_mark: *Deploy #4812 succeeded* to *production*', { accessory: overflow('deploy_menu', ['View logs', 'logs'], ['View diff', 'diff'], ['Roll back', 'rollback']) }),
    { type: 'section', fields: [md('*Services*\n`api` · `web` · `workers`'), md('*Duration*\n6m 12s'), md('*Commits*\n14'), md('*Triggered by*\nMarcus Chen')] },
    deployCtx('atlas@a4f93c1 · 14 commits by Marcus Chen, Luis Fernandez, Aisha Rahman'),
  ])
  deploy.push({
    ts: minsAgo(8),
    userId: U.deploy,
    text: 'Deploy #4813 to production needs approval',
    blocks: [
      header('Deploy #4813 needs approval'),
      section('*Atlas search indexer v2* is ready to go to *production*.\nRequested by <@U04MRCSCHN> · <https://github.com/northstar/atlas/pull/2291|PR #2291>'),
      {
        type: 'section',
        fields: [md('*Environment*\nproduction'), md('*Service*\n`search-indexer`'), md('*Checks*\n:white_check_mark: 128 passed'), md('*Risk*\nLow · reindex runs in the background')],
      },
      actions(
        'deploy_4813',
        button('Approve', 'approve_deploy', { style: 'primary' }),
        button('Reject', 'reject_deploy', { style: 'danger' }),
        button('View changes', 'view_changes', { url: 'https://github.com/northstar/atlas/pull/2291' }),
      ),
    ],
  })
  msgs[C.deploy] = deploy
  // The deploy notice Deploybot posted in #engineering carries the same blocks.
  const engDeploy = (msgs[C.engineering] ?? []).find((m) => m.userId === U.deploy && m.text.includes('#4812'))
  if (engDeploy) engDeploy.blocks = deploy.find((m) => m.text.includes('#4812'))?.blocks

  const deployProfile: AppProfile = {
    avatarLarge: '/apps/deploybot.svg',
    description:
      'Deploybot keeps your team in the loop on every release:\n• Deploy notifications for every environment\n• One-click approvals for production deploys\n• Logs, diffs and rollbacks right from Slack\n• A weekly release summary in #engineering',
    home: [
      header('Deploybot'),
      section('Deploy, approve and roll back Atlas services without leaving Slack.'),
      actions('deploy_home_actions', button('New deploy', 'new_deploy', { style: 'primary' }), button('View all deploys', 'all_deploys', { url: 'https://deploy.northstar-hq.com' })),
      divider(),
      header('Waiting on you'),
      section('*#4813 · search-indexer → production*\nRequested by Marcus Chen · PR #2291', {
        block_id: 'home_pending_4813',
        accessory: button('Approve', 'approve_deploy_home', { style: 'primary' }),
      }),
      divider(),
      header('Recent deploys'),
      section(':white_check_mark: *#4812* · `api` `web` `workers` → production\n14 commits · 6m 12s · Marcus Chen', {
        accessory: overflow('deploy_menu', ['View logs', 'logs'], ['Roll back', 'rollback']),
      }),
      section(':white_check_mark: *#4809* · `api` `web` → staging\n6 commits · 4m 51s · Luis Fernandez', { accessory: overflow('deploy_menu', ['View logs', 'logs']) }),
      section(':x: *#4807* · `workers` → staging\nFailed at integration tests · Aisha Rahman', { accessory: overflow('deploy_menu', ['View logs', 'logs'], ['Retry', 'retry']) }),
      context(md('Showing the last 3 deploys · <https://deploy.northstar-hq.com|Open the dashboard>')),
    ],
    actions: {
      approve_deploy: {
        replaceBlock: [context(md(':white_check_mark: Approved by *{{me}}* at {{time}}'))],
        reply: {
          text: 'Deploy #4813 is rolling out to production',
          blocks: [section(':rocket: *Deploy #4813* is rolling out to *production*. I’ll post here when it’s done.'), context(md('search-indexer · started {{time}}'))],
        },
      },
      approve_deploy_home: {
        replaceBlock: [section('*#4813 · search-indexer → production*\n:white_check_mark: Approved by {{me}} at {{time}}', { block_id: 'home_pending_4813' })],
        reply: { text: 'Deploy #4813 is rolling out to production', blocks: [section(':rocket: *Deploy #4813* is rolling out to *production*. I’ll post here when it’s done.')] },
      },
      reject_deploy: {
        modal: {
          title: 'Reject deploy #4813',
          submitLabel: 'Reject',
          blocks: [section('Marcus will be notified. Let him know what needs to change.'), input('Reason', 'reason', { multiline: true, placeholder: pt('What should happen before this ships?') })],
          submit: { replaceBlock: [context(md(':no_entry: Rejected by *{{me}}* at {{time}}: “{{reason}}”'))] },
        },
      },
      'deploy_menu:rollback': {
        modal: {
          title: 'Roll back production?',
          submitLabel: 'Roll back',
          blocks: [section('This redeploys *#4811* to production. It takes about 5 minutes and doesn’t affect data.')],
          submit: {
            reply: { text: 'Rolling back production to #4811', blocks: [section(':leftwards_arrow_with_hook: Rolling back *production* to *#4811*…'), context(md('Requested by {{me}} · {{time}}'))] },
          },
        },
      },
      'deploy_menu:retry': { reply: { text: 'Retrying deploy #4807', blocks: [section(':repeat: Retrying *#4807* to *staging*…')] } },
      'deploy_menu:logs': { url: 'https://deploy.northstar-hq.com/logs' },
      'deploy_menu:diff': { url: 'https://github.com/northstar/atlas/compare' },
      new_deploy: {
        modal: {
          title: 'New deploy',
          submitLabel: 'Deploy',
          blocks: [
            {
              type: 'input',
              block_id: 'svc',
              label: pt('Service'),
              element: select('service', 'Choose a service', [
                ['api', 'api'],
                ['web', 'web'],
                ['workers', 'workers'],
                ['search-indexer', 'search-indexer'],
              ]),
            },
            {
              type: 'input',
              block_id: 'env',
              label: pt('Environment'),
              element: select(
                'env',
                'Choose an environment',
                [
                  ['staging', 'staging'],
                  ['production', 'production'],
                ],
                'staging',
              ),
            },
          ],
          submit: { reply: { text: 'Deploy #4814 started', blocks: [section(':rocket: *Deploy #4814* started: `{{service}}` → *{{env}}*'), context(md('Requested by {{me}} · {{time}}'))] } },
        },
      },
    },
  }

  // Standup lives in src/apps/standup.ts (App Kit): its DM history, App Home, About and handlers.

  // Calendar -----------------------------------------------------------------------------------
  const calendar = msgs[C.calendar] ?? []
  calendar.unshift({
    ts: at(0, '08:00'),
    userId: U.calendar,
    text: `Your agenda for ${today}`,
    blocks: [
      header(`Your agenda for ${today}`),
      section('*10:30 – 11:00 AM* · Atlas design review\nZoom · Sofia Rodriguez', { accessory: overflow('event_menu', ['Open in Calendar', 'open'], ['Decline', 'decline']) }),
      section('*1:00 – 1:30 PM* · Initech kickoff prep\nRoom 4B · Daniel Kim', { accessory: overflow('event_menu', ['Open in Calendar', 'open'], ['Decline', 'decline']) }),
      section('*3:00 – 3:45 PM* · Q4 roadmap sync\nZoom · Priya Patel', { accessory: overflow('event_menu', ['Open in Calendar', 'open'], ['Decline', 'decline']) }),
      divider(),
      context(md(':calendar: 3 meetings · 2h 15m of focus time')),
    ],
  })
  withBlocks(calendar, 'Atlas design review', [
    section(':calendar: *Atlas design review* starts in 15 minutes', { accessory: button('Join Zoom', 'join_zoom', { style: 'primary', url: 'https://zoom.us/j/5550142' }) }),
    { type: 'section', fields: [md('*When*\n10:30 – 11:00 AM'), md('*Where*\nZoom'), md('*Organizer*\nSofia Rodriguez'), md('*Guests*\n5 going')] },
    actions(
      'rsvp_design_review',
      select(
        'rsvp',
        'Going?',
        [
          ['Going', 'yes'],
          ['Maybe', 'maybe'],
          ['Not going', 'no'],
        ],
        'yes',
      ),
      button('Snooze 5 min', 'snooze'),
      overflow('event_menu', ['Open in Calendar', 'open'], ['Decline', 'decline']),
    ),
  ])
  msgs[C.calendar] = calendar

  const calendarProfile: AppProfile = {
    avatarLarge: '/apps/calendar.svg',
    description:
      'Your calendar, right in Slack:\n• Meeting reminders with one-click join\n• RSVP from any reminder\n• A daily agenda every morning\n• Your status updates automatically while you’re in a meeting',
    home: [
      header(`Today · ${today}`),
      section('*10:30 – 11:00 AM* · Atlas design review\nZoom · Sofia Rodriguez', { accessory: button('Join', 'join_zoom', { url: 'https://zoom.us/j/5550142' }) }),
      section('*1:00 – 1:30 PM* · Initech kickoff prep\nRoom 4B · Daniel Kim', { accessory: overflow('event_menu', ['Open in Calendar', 'open'], ['Decline', 'decline']) }),
      section('*3:00 – 3:45 PM* · Q4 roadmap sync\nZoom · Priya Patel', { accessory: overflow('event_menu', ['Open in Calendar', 'open'], ['Decline', 'decline']) }),
      divider(),
      header('Settings'),
      section('*Daily agenda*\nA summary of your day, every weekday morning.', {
        accessory: select(
          'agenda_time',
          'Choose a time',
          [
            ['7:30 AM', '0730'],
            ['8:00 AM', '0800'],
            ['8:30 AM', '0830'],
          ],
          '0800',
        ),
      }),
      section('*Meeting status*\nSet my status to :spiral_calendar_pad: In a meeting while I’m in one.', { block_id: 'cal_status', accessory: button('Turn Off', 'status_off') }),
      context(md('Connected to *Google Calendar* as ' + email)),
    ],
    actions: {
      snooze: { reply: { text: 'Snoozed', blocks: [section(':alarm_clock: Okay, I’ll remind you again in 5 minutes.')] } },
      rsvp: { reply: { text: 'RSVP updated', blocks: [section(':white_check_mark: RSVP for *Atlas design review* updated to *{{option}}*.')] } },
      'event_menu:decline': { reply: { text: 'Declined', blocks: [section(':no_entry_sign: Declined. I let the organizer know.')] } },
      'event_menu:open': { url: 'https://calendar.google.com' },
      agenda_time: { reply: { text: 'Agenda time updated', blocks: [section(':sunrise: Your daily agenda will arrive at *{{option}}*.')] } },
      status_off: {
        replaceBlock: [
          section('*Meeting status*\nSet my status to :spiral_calendar_pad: In a meeting while I’m in one.', {
            block_id: 'cal_status',
            accessory: button('Turn On', 'status_on', { style: 'primary' }),
          }),
        ],
      },
      status_on: {
        replaceBlock: [section('*Meeting status*\nSet my status to :spiral_calendar_pad: In a meeting while I’m in one.', { block_id: 'cal_status', accessory: button('Turn Off', 'status_off') })],
      },
    },
  }

  fx.apps = { ...(fx.apps ?? {}), [U.drive]: driveProfile, [U.deploy]: deployProfile, [U.calendar]: calendarProfile }
}

// ------------------------------------------------------------------------------------------------
// Slackbot history, artifacts and tasks

function slackbot(fx: Fixture): SlackbotFixture {
  const cite = (cid: string, snippet: string, threadParent?: string) => {
    const list = threadParent ? (fx.threads?.[`${cid}/${fx.messages[cid]?.find((m) => m.text.includes(threadParent))?.ts}`] ?? []) : (fx.messages[cid] ?? [])
    const m = list.find((x) => x.text.includes(snippet))
    return m ? ` <cite://${cid}/${m.ts}>` : ''
  }
  // Cites the launch checklist Priya posted 30 minutes ago, so this conversation is from just after it.
  const launch = minsAgo(22)
  const crit = at(1, '14:48')
  const q4 = at(1, '10:02')
  return {
    chats: [
      {
        id: launch,
        title: 'Atlas launch readiness',
        starred: true,
        turns: [
          {
            question: 'Is the Atlas launch on track for Oct 14?',
            status: 'Searched channels and found latest messages.',
            steps: ['Searched information', 'Read #launch-atlas', 'Found latest messages'],
            answer: [
              'Mostly, yes. The launch is on track for *Oct 14*, with two items to watch:',
              '',
              `• *Done:* load testing and security review${cite(C.launch, 'Launch checklist')}`,
              `• *In progress:* docs are at 80%${cite(C.launch, 'Launch checklist')}`,
              `• *At risk:* pricing page copy hasn’t started, and <@${U.daniel}> needs the demo environment before sales enablement on Oct 9${cite(C.launch, 'enablement session')}`,
              '',
              `Engineering is ready, and <@${U.priya}> is posting daily status at 5pm${cite(C.launch, 'Engineering is ready', 'Kicking off')}.`,
            ].join('\n'),
          },
          {
            question: 'Who owns the pricing page copy?',
            status: 'Searched messages and found 2 results.',
            steps: ['Searched messages', 'Found 2 results'],
            answer: `You do. It’s on your launch prep list${cite(C.dmSelf, 'pricing page copy')}, and it’s the only item marked :x: on the launch checklist${cite(C.launch, 'Launch checklist')}. <@${U.hannah}>’s messaging doc has the positioning line you can start from${cite(C.launch, 'Messaging doc')}.`,
            followUp: 'Draft the pricing page intro',
          },
        ],
      },
      {
        id: crit,
        title: 'Onboarding v3 crit feedback',
        turns: [
          {
            question: 'Summarize the feedback on onboarding v3',
            status: 'Searched channels and found latest messages.',
            steps: ['Searched information', 'Read #design', 'Found latest messages'],
            answer: [
              `<@${U.sofia}> shared *Onboarding v3* in <#${C.design}|design> with three changes: a checklist instead of a progress bar, workspace setup moved to step 1, and new empty states with sample data${cite(C.design, 'Onboarding v3')}.`,
              '',
              '*What people said*',
              `• You and <@${U.luis}> liked the checklist${cite(C.design, 'checklist is so much clearer', 'Onboarding v3')}${cite(C.design, 'Love the checklist')}`,
              `• <@${U.hannah}> asked for a GIF for the launch blog, and Sofia is recording one${cite(C.design, 'GIF', 'Onboarding v3')}`,
              `• Luis asked for one-click dismissal of sample data, which is now in the banner${cite(C.design, 'Clear sample data')}`,
            ].join('\n'),
            followUp: 'What’s next for onboarding?',
          },
        ],
      },
      {
        id: q4,
        title: 'Q4 plan priorities recap',
        turns: [
          {
            question: 'Recap the Q4 planning discussion in #product',
            status: 'Searched channels and found latest messages.',
            steps: ['Searched information', 'Read #product', 'Found latest messages'],
            answer: [
              `<@${U.priya}> posted the Platform Q4 plan${cite(C.product, 'Q4 plan for Platform')}:`,
              '1. Atlas GA (summaries + search)',
              '2. Admin audit logs',
              '3. SSO for Business+',
              '4. Mobile offline mode (stretch)',
              '',
              `<@${U.tom}> asked to pull audit logs ahead of SSO because two enterprise deals depend on it${cite(C.product, 'pull audit logs ahead')}, and Priya agreed if v1 is read-only${cite(C.product, 'read-only logs')}. Mobile offline stays a stretch goal and won’t be staffed until Atlas ships${cite(C.product, 'keep it as a stretch', 'Q4 plan for Platform')}.`,
            ].join('\n'),
            followUp: 'Draft a Q4 update for #announcements',
          },
        ],
      },
    ],
    artifacts: [
      { id: 'F04SBART01', title: 'Atlas launch readiness brief', kind: 'canvas', created: minsAgo(18), chatId: launch },
      { id: 'F04SBART02', title: 'Onboarding v3 crit notes', kind: 'list', created: at(1, '14:52'), chatId: crit },
      { id: 'F04SBART03', title: 'Q4 Platform priorities', kind: 'canvas', created: at(1, '10:06'), chatId: q4 },
      { id: 'F04SBART04', title: 'Atlas pricing page copy (draft)', kind: 'doc', created: at(2, '16:20'), url: 'https://docs.google.com/document/d/atlas-pricing-copy' },
      { id: 'F04SBART05', title: 'Northstar brand hub', kind: 'link', created: at(3, '11:31'), url: 'https://northstar-hq.com/brand' },
    ],
    tasks: [
      {
        id: 'SBTASK01',
        title: 'Morning briefing',
        schedule: 'Every weekday at 8:30 AM',
        prompt: 'Summarize what needs my attention and send me a briefing every workday.',
        skill: 'Daily priorities',
        enabled: true,
        lastRun: at(0, '08:30'),
      },
      {
        id: 'SBTASK02',
        title: 'Weekly #launch-atlas recap',
        schedule: 'Every Friday at 4:00 PM',
        prompt: 'Draft a weekly recap of #launch-atlas every Friday.',
        skill: 'Weekly review',
        enabled: true,
        lastRun: at(6, '16:00'),
      },
      {
        id: 'SBTASK03',
        title: 'Unanswered messages digest',
        schedule: 'Every weekday at 3:00 PM',
        prompt: 'Find messages I haven’t answered and draft replies each afternoon.',
        skill: 'Writing Coach',
        enabled: false,
      },
    ],
  }
}

extendDemo((fx) => {
  apps(fx)
  fx.slackbot = slackbot(fx)
})
