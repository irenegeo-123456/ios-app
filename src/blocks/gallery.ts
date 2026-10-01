import { bk } from '../apps/kit'
import { appIcon, fileIcon, filePreview, persona, thumbnail } from '../kit/assets'
import { surfacesFor } from './validate'
import type { SurfaceKind } from './surface'
import type { KitBlock } from './types'

// The specimens of the Block Kit gallery (?kit=blocks, src/kit/pages/BlocksGallery.tsx): every block and element, in
// the states Slack iOS draws, each written the way a prototype writes it (`bk` and the asset helpers from src/kit).
// A specimen's `code` is what goes inside `blocks: [ … ]`; the gallery evaluates that same text, so the snippet you
// copy is exactly what's drawn. gallery.test.ts checks each one against Slack's Block Kit schema.

export interface BlockSpecimen {
  id: string
  group: string
  name: string
  about: string
  /** the snapshot test it mirrors (Modules/UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.…) */
  snapshot?: string
  /** the blocks, as written in a prototype: the inside of `blocks: [ … ]` */
  code: string
  /** where to draw it; default: every surface the blocks are allowed on (validate.ts BLOCK_SURFACES) */
  surfaces?: SurfaceKind[]
  /** a button waiting on its app (its spinner; the block's other buttons disabled) */
  pending?: { blockId: string; actionId: string }
  /** inline errors, by block_id */
  errors?: Record<string, string>
  /** blocks (by index) that start expanded: plans and task cards start collapsed */
  expand?: number[]
  /** false: drawn the way previews and search results draw blocks */
  interactive?: boolean
  /** not public Block Kit (the unknown-block banner, the internal loading row): the schema check is skipped */
  internal?: boolean
  /**
   * A copy of a Slack snapshot test's fixture for the snapshot suite (reference/ios/snapshots.json): drawn 393 pt wide
   * with no message insets, its first block `top` pt down (the test's edge insets: 12 for blocks rendered with
   * `blockEdgeInsets(isFirstRow: false)`, 0 for plain `.zero`); only listed with ?only=<id>.
   */
  fixture?: { top: number }
}

/** What a specimen's code can use: the names a prototype imports from src/kit. */
export const SPECIMEN_SCOPE = { bk, appIcon, fileIcon, filePreview, persona, thumbnail }

/** Evaluates a specimen's code into its blocks. */
export function buildSpecimen(code: string): KitBlock[] {
  const names = Object.keys(SPECIMEN_SCOPE)
  const run = new Function(...names, `"use strict";\nreturn [\n${code}\n]`) as (...args: unknown[]) => KitBlock[]
  return run(...Object.values(SPECIMEN_SCOPE))
}

export const specimenSurfaces = (s: BlockSpecimen, blocks: KitBlock[]): SurfaceKind[] => s.surfaces ?? surfacesFor(blocks)

const PRIYA = 'U04PRIYAPT'
const MARCUS = 'U04MRCSCHN'
const LAUNCH = 'C04LAUNCHQ'

export const SPECIMENS: BlockSpecimen[] = [
  // ------------------------------------------------------------------------------------------------ section (§3.1)
  {
    id: 'section-text',
    group: 'Section',
    name: 'section · text',
    about: 'Lato 17 in content_primary, unlimited lines; mentions, channels, links and emoji as in messages. No “See more”.',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithText',
    code: `bk.section('Hi <@${PRIYA}>, the *Q3 roadmap review* moved to _Thursday_. Notes are in <#${LAUNCH}> :spiral_note_pad:')`,
  },
  {
    id: 'section-fields',
    group: 'Section',
    name: 'section · text and fields',
    about: 'Fields are one full-width column, 8 pt apart, 6 pt below the text (not the 2-column grid of desktop).',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithTextAndFields',
    code: `bk.section('*Time off request* from <@${MARCUS}>', { fields: ['*Type*\\nVacation', '*When*\\nOct 12 – Oct 16', '*Hours*\\n40', '*Balance after*\\n24 hours'] })`,
  },
  {
    id: 'section-select',
    group: 'Section',
    name: 'section · select accessory',
    about: 'Selects, time and datetime pickers sit full width under the text, 6 pt below: an outline SKButton with caret_down.',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithStandardButtonAccessory',
    code: `bk.section('Pick a reviewer for this pull request.', {
  block_id: 'reviewer',
  accessory: bk.select('pick_reviewer', 'Choose a teammate', [['Marcus Chen', 'marcus'], ['Luis Fernandez', 'luis'], ['Aisha Rahman', 'aisha']]),
})`,
  },
  {
    id: 'section-buttons',
    group: 'Section',
    name: 'section · button accessories',
    about: 'Buttons are full width under the text: default is outline, primary is green, danger is outlined red (medium SKButton, 36 pt).',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithPrimaryButtonAccessory, …WithDangerButtonAccessory',
    code: `bk.section('Deploy *web-2026.10.3* to production?', { block_id: 'deploy', accessory: bk.button('Deploy', 'deploy', { style: 'primary', value: 'web-2026.10.3' }) }),
bk.section('Roll back the last release.', { block_id: 'rollback', accessory: bk.button('Roll back', 'rollback', { style: 'danger' }) }),
bk.section('See what changed since yesterday.', { block_id: 'changes', accessory: bk.button('View changes', 'changes') })`,
  },
  {
    id: 'section-image',
    group: 'Section',
    name: 'section · image accessory',
    about: 'A 68 × 68 thumbnail right of the text, 8 pt apart, top-aligned: radius 15.3, 1 pt outline_tertiary border.',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithTextAndInlineImageAccessory',
    code: `bk.section('*PLAT-2291* · Jira\\nCheckout fails when a cart has more than 50 items.', { accessory: bk.imageEl(appIcon('jira'), 'Jira') })`,
  },
  {
    id: 'section-inline',
    group: 'Section',
    name: 'section · overflow and datepicker accessories',
    about: 'Overflow (“More”) and datepickers sit right of the text at their own width. Overflow options open a bottom sheet.',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithTextAndInlineButtonAccessory',
    code: `bk.section('*Weekly metrics* are ready.', {
  block_id: 'metrics',
  accessory: bk.overflow('metrics_menu', [['View report', 'view'], ['Share to channel', 'share'], ['Mute for a week', 'mute']]),
}),
bk.section('When should we send the reminder?', { block_id: 'remind', accessory: bk.datepicker('remind_on', '2026-10-14') })`,
  },
  {
    id: 'section-choices',
    group: 'Section',
    name: 'section · checkbox and radio accessories',
    about: 'Option groups full width under the text: Lato 17 labels, Lato 13 descriptions, the 21 pt control at the right.',
    snapshot: 'BKSectionBlockSnapshotTests/testSectionBlockWithCheckboxGroupAccessory, …WithRadios',
    code: `bk.section('*Which days work for the offsite?*', {
  block_id: 'days',
  accessory: bk.checkboxes('offsite_days', [['Monday', 'mon'], ['Tuesday', 'tue'], ['Wednesday', 'wed']], ['tue']),
}),
bk.section('*Lunch*', {
  block_id: 'lunch',
  accessory: bk.radio('lunch', [bk.option('Vegetarian', 'veg', 'Seasonal vegetables and grains'), bk.option('Chicken', 'chicken'), bk.option('Fish', 'fish')], 'veg'),
})`,
  },

  // ------------------------------------------------------------------------------------------------ header, divider, context (§3.2–3.4)
  {
    id: 'header',
    group: 'Header, divider, context',
    name: 'header',
    about: 'Lato Black 20 in content_primary, unlimited lines.',
    snapshot: 'BKHeaderBlockSnapshotTests/testHeaderBlock',
    code: `bk.header('Quarterly business review'),
bk.section('Agenda, numbers and the decisions we need from leadership.')`,
  },
  {
    id: 'header-levels',
    group: 'Header, divider, context',
    name: 'header levels (markdown headings)',
    about: 'Headings in a markdown block become header blocks with a level: 1 Black 28, 2 Black 22, 3 and up Bold 20 (no level is 2).',
    snapshot: 'BKHeaderBlockSnapshotTests/testHeaderBlockLevel1 … Level4',
    code: `bk.markdown('# Launch plan\\n## Timeline\\n### Week one\\n#### Owners')`,
  },
  {
    id: 'divider',
    group: 'Header, divider, context',
    name: 'divider',
    about: 'A 2-device-pixel outline_tertiary line, 10 pt above; the block after it keeps its own top inset.',
    snapshot: 'BKDividerBlockSnapshotTests/testDividerBlock',
    code: `bk.section('Above the line.'),
bk.divider(),
bk.section('Below the line.')`,
  },
  {
    id: 'context',
    group: 'Header, divider, context',
    name: 'context',
    about: 'Lato 13 content_secondary text and 20 pt images (radius 2) in one wrapping row.',
    snapshot: 'BKContextBlockSnapshotTests/testComplex',
    code: `bk.context(bk.imageEl(persona('zoe-maxwell', { illustrated: true }).avatar, 'Zoe Maxwell'), '*Zoe Maxwell* opened this request · 3 comments'),
bk.context('Last updated Oct 3 at 9:41 AM · <https://northstar.example/reports/q3|Open the report>')`,
  },

  // ------------------------------------------------------------------------------------------------ image, video, file (§3.5, 3.10, 3.11)
  {
    id: 'image',
    group: 'Image, video, file',
    name: 'image',
    about: 'The title in Lato 13 above; the image full width at its aspect ratio (5:8 until it loads), 30–400 pt tall, radius 8.',
    snapshot: 'BKImageBlockSnapshotTests/testImageBlock',
    code: `bk.image(filePreview('slides-preview'), 'The title slide of the launch deck', 'Launch deck, title slide')`,
  },
  {
    id: 'video',
    group: 'Image, video, file',
    name: 'video',
    about: 'Provider and author, the title (a link when title_url is set), the thumbnail with the “Video” badge, the description.',
    snapshot: 'BKVideoBlockSnapshotTests/testVideoBlock',
    code: `{
  type: 'video',
  title: bk.pt('Momentum: the launch in eight seconds'),
  title_url: 'https://northstar.example/videos/momentum',
  description: bk.pt('Highlights from the keynote and the demo floor.'),
  video_url: 'https://northstar.example/videos/momentum/embed',
  thumbnail_url: filePreview('video-clip'),
  alt_text: 'Launch highlights',
  author_name: 'Northstar Marketing',
  provider_name: 'Vimeo',
}`,
  },
  {
    id: 'file',
    group: 'Image, video, file',
    name: 'file (remote)',
    about: 'Slack adds these to messages that share a remote file: the file-type icon, the title, size and type. Without access: the warning row.',
    snapshot: 'BKFileBlockSnapshotTests/test_fileState_pdf_allInfo, test_errorState',
    code: `{ type: 'file', source: 'remote', external_id: 'q3-plan', file: { title: 'Q3 plan.pdf', filetype: 'pdf', pretty_type: 'PDF', size: 2400000, icon: fileIcon('pdf') } },
{ type: 'file', source: 'remote', external_id: 'board-deck' }`,
  },

  // ------------------------------------------------------------------------------------------------ actions (§3.6, §4.1–4.4, §4.10)
  {
    id: 'actions-buttons',
    group: 'Actions',
    name: 'actions · buttons',
    about: 'Every element full width, stacked 8 pt apart. A button with a url opens it and still sends the action.',
    snapshot: 'BKActionsBlockSnapshotTests/testActionsBlock',
    code: `bk.actions('approval',
  bk.button('Approve', 'approve', { style: 'primary', value: 'req-114' }),
  bk.button('Deny', 'deny', { style: 'danger', value: 'req-114' }),
  bk.button('Open request', 'open', { url: 'https://northstar.example/requests/114' }),
)`,
  },
  {
    id: 'actions-pickers',
    group: 'Actions',
    name: 'actions · selects, pickers, overflow',
    about: 'Selects show the chosen option (or the placeholder, not dimmed) with caret_down; pickers show the date or time; overflow is “More Options”.',
    code: `bk.actions('filters',
  bk.select('priority', 'Priority', [['High', 'high'], ['Medium', 'medium'], ['Low', 'low']], 'high'),
  bk.usersSelect('assignee', 'Assign to', '${MARCUS}'),
  bk.channelsSelect('post_to', 'Post to a channel'),
  bk.datepicker('due', '2026-10-14'),
  { type: 'timepicker', action_id: 'at', initial_time: '09:30' },
  bk.overflow('more', [['Snooze', 'snooze'], ['Archive', 'archive']]),
)`,
  },
  {
    id: 'actions-waiting',
    group: 'Actions',
    name: 'actions · waiting on the app',
    about: 'After a tap the button shows its spinner and the block’s other buttons are disabled until the app answers.',
    code: `bk.actions('review',
  bk.button('Approve', 'approve', { style: 'primary' }),
  bk.button('Request changes', 'changes'),
)`,
    pending: { blockId: 'review', actionId: 'approve' },
  },
  {
    id: 'actions-static',
    group: 'Actions',
    name: 'actions · not interactive',
    about: 'Where interactions aren’t allowed (previews, search results) every button and picker is disabled.',
    code: `bk.actions('static',
  bk.button('Approve', 'approve', { style: 'primary' }),
  bk.button('Deny', 'deny', { style: 'danger' }),
  bk.select('priority', 'Priority', [['High', 'high'], ['Low', 'low']]),
)`,
    interactive: false,
  },
  {
    id: 'actions-confirm',
    group: 'Actions',
    name: 'actions · confirm dialog',
    about: 'A confirm object asks first: an alert with its title and text, the confirm button (preferred) and the deny button. In the simulator.',
    code: `bk.actions('channel_admin', {
  ...bk.button('Archive channel', 'archive', { style: 'danger' }),
  confirm: { title: bk.pt('Archive #launch?'), text: bk.pt('Members can still read it, but no one can post.'), confirm: bk.pt('Archive'), deny: bk.pt('Keep it') },
})`,
  },

  {
    id: 'actions-workflow',
    group: 'Actions',
    name: 'actions · workflow_button',
    about: 'A button that starts a workflow: the same SKButton as a button (default outline, primary green).',
    code: `bk.actions('onboarding', {
  type: 'workflow_button',
  text: bk.pt('Start onboarding'),
  style: 'primary',
  action_id: 'start_onboarding',
  workflow: { trigger: { url: 'https://slack.com/shortcuts/Ft0123/abc' } },
})`,
  },

  // ------------------------------------------------------------------------------------------------ input (§3.7, §4.3–4.8)
  {
    id: 'input-text',
    group: 'Input',
    name: 'input · plain_text_input',
    about: 'Label Lato Bold 17, the field, a divider, the hint in Lato 13. Modals and App Homes edit in place; a message opens the full-screen editor.',
    snapshot: 'BKInputBlockSnapshotTests/testTextInput_defaultTintedStyle',
    code: `bk.input('Project name', bk.textInput('name', { placeholder: 'e.g. Northstar launch' }), { hint: 'Shown in the channel topic.' })`,
  },
  {
    id: 'input-multiline',
    group: 'Input',
    name: 'input · multiline, with a value',
    about: 'Multiline text grows with its content.',
    snapshot: 'BKInputBlockSnapshotTests/testTextInput_multilineTintedStyle',
    code: `bk.input('What went well?', bk.textInput('went_well', { multiline: true, initial: 'The launch checklist kept everyone on the same page.\\nQA caught the payment bug before release.' }))`,
  },
  {
    id: 'input-error',
    group: 'Input',
    name: 'input · error',
    about: 'Errors replace the hint in Lato 13 sk_raspberry_red, and the divider turns red.',
    snapshot: 'BKInputBlockSnapshotTests/testTextInput_errorTintedStyle',
    code: `bk.input('Summary', bk.textInput('summary', { placeholder: 'One line about the incident' }), { block_id: 'summary', hint: 'Posted to #incidents.' })`,
    errors: { summary: 'This field is required.' },
  },
  {
    id: 'input-optional',
    group: 'Input',
    name: 'input · optional',
    about: 'Modals add “(optional)” after the label in bold content_tertiary; messages and App Homes don’t, and only modals enforce required inputs.',
    snapshot: 'BKInputBlockSnapshotTests/testSelectWithOptionalLabel',
    code: `bk.input('Notes for the reviewer', bk.textInput('notes', { multiline: true }), { optional: true })`,
  },
  {
    id: 'input-typed',
    group: 'Input',
    name: 'input · number, email, url',
    about: 'Typed fields get their keyboards and placeholders, and validate on blur: numbers against min and max, emails and URLs by format.',
    code: `bk.input('Headcount', { type: 'number_input', action_id: 'headcount', is_decimal_allowed: false, min_value: '1', max_value: '200' }),
bk.input('Work email', { type: 'email_text_input', action_id: 'email' }),
bk.input('Link to the brief', { type: 'url_text_input', action_id: 'brief' }, { optional: true })`,
  },
  {
    id: 'input-select',
    group: 'Input',
    name: 'input · static_select',
    about: 'The select row: the value in content_primary (placeholder content_secondary) and caret_right_full; the choice shows at once.',
    snapshot: 'BKInputBlockSnapshotTests/testSelectWithPlaceholder, testSelectWithHint',
    code: `bk.input('Team', bk.select('team', 'Choose a team', [['Platform', 'platform'], ['Growth', 'growth'], ['Design', 'design']])),
bk.input('Priority', bk.select('priority', 'Choose a priority', [['High', 'high'], ['Medium', 'medium'], ['Low', 'low']], 'high'), { hint: 'High pages the on-call engineer.' })`,
  },
  {
    id: 'input-select-error',
    group: 'Input',
    name: 'input · select with hint and error',
    about: 'On Submit, a required input without a value shows “This field is required.” and the modal scrolls to it.',
    snapshot: 'BKInputBlockSnapshotTests/testSelectWithHintAndError',
    code: `bk.input('Severity', bk.select('severity', 'Select a severity', [['SEV 1', 'sev1'], ['SEV 2', 'sev2'], ['SEV 3', 'sev3']]), { block_id: 'severity', hint: 'How many customers are affected?' })`,
    errors: { severity: 'This field is required.' },
  },
  {
    id: 'input-multi',
    group: 'Input',
    name: 'input · multi-selects',
    about: 'Multi-selects list the chosen options in the row; the picker has checkmarks and a Done button.',
    code: `bk.input('Labels', bk.multiSelect('labels', 'Add labels', [['Bug', 'bug'], ['Regression', 'regression'], ['Customer', 'customer']], ['bug', 'customer'])),
bk.input('Reviewers', bk.multiUsersSelect('reviewers', 'Add people', ['${PRIYA}', '${MARCUS}']))`,
  },
  {
    id: 'input-people',
    group: 'Input',
    name: 'input · users and conversations',
    about: 'People and channel pickers open the full-screen picker with search.',
    code: `bk.input('Owner', bk.usersSelect('owner', 'Select a person')),
bk.input('Share in', { type: 'conversations_select', action_id: 'share_in', placeholder: bk.pt('Select a conversation'), default_to_current_conversation: true })`,
  },
  {
    id: 'input-datetime',
    group: 'Input',
    name: 'input · date, time, datetime',
    about: 'Date and time pickers open the date / time sheet; the datetime row leads with the calendar icon.',
    snapshot: 'BKInputSelectViewSnapshotTests/testDate_icon_disclosure_enabled, testPlaceholder',
    code: `bk.input('Due date', bk.datepicker('due', '2026-10-14')),
bk.input('Start time', { type: 'timepicker', action_id: 'start', placeholder: bk.pt('Select a time') }),
bk.input('Kickoff', { type: 'datetimepicker', action_id: 'kickoff', initial_date_time: 1792490400 })`,
  },
  {
    id: 'input-choices',
    group: 'Input',
    name: 'input · checkboxes and radio buttons',
    about: 'Checkboxes toggle at once; a radio selects on tap and ignores taps on the selected one. 8 pt above and below each option.',
    snapshot: 'BKInputBlockSnapshotTests/testCheckboxes, testRadioButtons',
    code: `bk.input('Notify me by', bk.checkboxes('notify', [bk.option('Email', 'email', 'A summary once a day'), bk.option('Slack', 'slack', 'Every update, as it happens')], ['slack'])),
bk.input('Visibility', bk.radio('visibility', [['Public', 'public'], ['Private', 'private']], 'public'))`,
  },
  {
    id: 'input-file',
    group: 'Input',
    name: 'input · file_input',
    about: 'The label gets an info button; “Add files” opens the file chooser; chosen files list below with remove buttons.',
    snapshot: 'BKInputBlockSnapshotTests/testFileUpload_showsDisclosureButton',
    code: `bk.input('Attachments', { type: 'file_input', action_id: 'files', filetypes: ['pdf', 'png', 'jpg'], max_files: 3 }, { optional: true })`,
  },
  {
    id: 'input-rich',
    group: 'Input',
    name: 'input · rich_text_input',
    about: 'A row without the chevron; tapping it opens the full-screen editor everywhere.',
    snapshot: 'BKRichTextBlockSnapshotTests/testRichTextBlock_defaultTintedStyle',
    code: `bk.input('Description', { type: 'rich_text_input', action_id: 'description', placeholder: bk.pt('What changed, and why?') })`,
  },
  {
    id: 'input-static',
    group: 'Input',
    name: 'input · not interactive',
    about: 'Where interactions aren’t allowed, inputs are drawn disabled: the select row and option groups dim, text can’t be edited.',
    code: `bk.input('Team', bk.select('team', 'Choose a team', [['Platform', 'platform'], ['Growth', 'growth']], 'growth')),
bk.input('Notify me by', bk.checkboxes('notify', [['Email', 'email'], ['Slack', 'slack']], ['email']))`,
    interactive: false,
  },
  {
    id: 'input-dispatch',
    group: 'Input',
    name: 'input · dispatch_action',
    about: 'An input that sends actions on Enter adds “Press ‘done’ when you’re finished.” to its hint.',
    code: `bk.input('Search tickets', bk.textInput('query', { placeholder: 'Try “checkout”' }), { dispatch_action: true, hint: 'Results update as you search' })`,
  },

  // ------------------------------------------------------------------------------------------------ rich text (§3.8, 3.9)
  {
    id: 'rich-text',
    group: 'Rich text',
    name: 'rich_text',
    about: 'Styled like message text: mention and channel pills, lists with •, ◦, ▪ and 1. a. i., quotes behind a 4 pt bar, code blocks.',
    snapshot: 'SlackKitTests.SKLabelSnapshotTests/testMentionText (pills)',
    code: `{
  type: 'rich_text',
  elements: [
    { type: 'rich_text_section', elements: [
      { type: 'text', text: 'Launch update', style: { bold: true } },
      { type: 'text', text: ' for ' },
      { type: 'user', user_id: '${PRIYA}' },
      { type: 'text', text: ' in ' },
      { type: 'channel', channel_id: '${LAUNCH}' },
      { type: 'text', text: ' ' },
      { type: 'emoji', name: 'rocket' },
    ] },
    { type: 'rich_text_list', style: 'bullet', elements: [
      { type: 'rich_text_section', elements: [{ type: 'text', text: 'Payments are ' }, { type: 'text', text: 'green', style: { italic: true } }] },
      { type: 'rich_text_section', elements: [{ type: 'text', text: 'Run ' }, { type: 'text', text: 'deploy --prod', style: { code: true } }, { type: 'text', text: ' at noon' }] },
    ] },
    { type: 'rich_text_list', style: 'bullet', indent: 1, elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text: 'Page ' }, { type: 'user', user_id: '${MARCUS}' }, { type: 'text', text: ' if it fails' }] }] },
    { type: 'rich_text_list', style: 'ordered', elements: [
      { type: 'rich_text_section', elements: [{ type: 'text', text: 'Freeze the branch' }] },
      { type: 'rich_text_section', elements: [{ type: 'text', text: 'Tag the release', style: { strike: true } }] },
    ] },
    { type: 'rich_text_quote', elements: [{ type: 'text', text: 'Ship it when the dashboard is green.' }] },
    { type: 'rich_text_preformatted', elements: [{ type: 'text', text: 'deploy web-2026.10.3 --region us-east' }] },
    { type: 'rich_text_section', elements: [{ type: 'link', url: 'https://northstar.example/runbook', text: 'Runbook' }, { type: 'text', text: ' · ' }, { type: 'broadcast', range: 'here' }] },
  ],
}`,
  },
  {
    id: 'markdown',
    group: 'Rich text',
    name: 'markdown',
    about: 'Standard markdown (what agents send) becomes rich text, headers, dividers and tables, as Slack’s server does. Messages only.',
    code: `bk.markdown('**Release notes**\\n\\n- Faster search across channels\\n- Fixed a crash when *uploading* large files\\n\\n---\\n\\n| Metric | Before | After |\\n|---|---|---|\\n| p95 search | 820 ms | 310 ms |\\n| Crash-free | 99.2% | 99.8% |')`,
  },

  // ------------------------------------------------------------------------------------------------ card, carousel, container (§3.13–3.15)
  {
    id: 'card',
    group: 'Cards and containers',
    name: 'card',
    about: 'Radius 12 and an outline_tertiary border; the 36 pt icon with title (Lato Black 17) and subtitle (Lato 17, tertiary), the body, then full-width buttons.',
    snapshot: 'BKCardBlockSnapshotTests/test_fullCard_withoutHeroImage',
    code: `{
  type: 'card',
  icon: bk.imageEl(appIcon('asana'), 'Asana'),
  title: bk.pt('Launch checklist'),
  subtitle: bk.pt('Asana · Due Friday'),
  body: bk.md('12 of 16 tasks are done. *Design QA* is blocking the release.'),
  actions: [bk.button('Open in Asana', 'open_task'), bk.button('Mark done', 'mark_done', { style: 'primary' })],
}`,
  },
  {
    id: 'card-hero',
    group: 'Cards and containers',
    name: 'card · hero image',
    about: 'The hero image is 4:3 with radius 8, inset 12 pt.',
    snapshot: 'BKCardBlockSnapshotTests/test_fullCard_withHeroImage',
    code: `{
  type: 'card',
  hero_image: bk.imageEl(filePreview('slides-preview'), 'The title slide'),
  title: bk.pt('Launch deck'),
  subtitle: bk.pt('Google Slides · Edited today'),
  body: bk.md('Final review with <@${PRIYA}> on Thursday.'),
  actions: [bk.button('Open deck', 'open_deck')],
}`,
  },
  {
    id: 'carousel',
    group: 'Cards and containers',
    name: 'carousel',
    about: 'Cards up to 320 pt wide, 12 pt apart, scrolling sideways a card at a time; each as tall as the tallest.',
    snapshot: 'BKCarouselBlockSnapshotTests/test_threeCards_mixedContent',
    code: `{
  type: 'carousel',
  elements: [
    { type: 'card', icon: bk.imageEl(appIcon('jira'), 'Jira'), title: bk.pt('PLAT-2291'), subtitle: bk.pt('Checkout fails over 50 items'), actions: [bk.button('View', 'view_2291')] },
    { type: 'card', icon: bk.imageEl(appIcon('jira'), 'Jira'), title: bk.pt('PLAT-2304'), subtitle: bk.pt('Search times out on large workspaces'), body: bk.md('Assigned to <@${MARCUS}>'), actions: [bk.button('View', 'view_2304')] },
    { type: 'card', icon: bk.imageEl(appIcon('jira'), 'Jira'), title: bk.pt('PLAT-2310'), subtitle: bk.pt('Dark mode contrast in settings') },
  ],
}`,
  },
  {
    id: 'container',
    group: 'Cards and containers',
    name: 'container · collapsible',
    about: 'A bordered box with a header (icon, Lato Bold 17 title, subtitle) and child blocks; collapsible ones toggle with the caret.',
    snapshot: 'BKContainerBlockViewSnapshotTests/testCollapsibleExpanded',
    code: `{
  type: 'container',
  icon: bk.imageEl(appIcon('google-calendar'), 'Calendar'),
  title: bk.pt('Today'),
  subtitle: bk.pt('3 meetings · 2 hours free'),
  is_collapsible: true,
  child_blocks: [
    bk.section('*9:30 AM* Stand-up'),
    bk.section('*1:00 PM* Launch review with <@${PRIYA}>'),
    bk.actions('calendar', bk.button('Open calendar', 'open_calendar')),
  ],
}`,
  },

  // ------------------------------------------------------------------------------------------------ table (§3.12)
  {
    id: 'table',
    group: 'Tables',
    name: 'table',
    about: 'Lato 17 cells padded 8 / 12 with 1 pt grid lines, the first row bold; columns as wide as their widest cell, scrolling sideways.',
    snapshot: 'BKTableBlockSnapshotTests/testTableBlockNotTruncated',
    code: `{
  type: 'table',
  column_settings: [{ align: 'left' }, { align: 'right' }, { align: 'right' }],
  rows: [
    [{ type: 'raw_text', text: 'Region' }, { type: 'raw_text', text: 'Q2' }, { type: 'raw_text', text: 'Q3' }],
    [{ type: 'raw_text', text: 'North America' }, { type: 'raw_number', value: 4.2, text: '$4.2M' }, { type: 'raw_number', value: 5.1, text: '$5.1M' }],
    [{ type: 'raw_text', text: 'Europe' }, { type: 'raw_number', value: 2.8, text: '$2.8M' }, { type: 'raw_number', value: 3.0, text: '$3.0M' }],
    [{ type: 'raw_text', text: 'Asia Pacific' }, { type: 'raw_number', value: 1.9, text: '$1.9M' }, { type: 'raw_number', value: 2.6, text: '$2.6M' }],
  ],
}`,
  },

  {
    id: 'data-table',
    group: 'Tables',
    name: 'data_table (Slack-internal)',
    about: 'iOS has its own view for data tables that the spec doesn’t cover; the clone draws it as a table, action cells as their buttons.',
    code: `{
  type: 'data_table',
  caption: 'Open opportunities',
  rows: [
    [{ type: 'raw_text', text: 'Account' }, { type: 'raw_text', text: 'Stage' }, { type: 'raw_text', text: 'Amount' }],
    [{ type: 'raw_text', text: 'Acme Corp' }, { type: 'raw_text', text: 'Negotiation' }, { type: 'raw_number', value: 120000, text: '$120,000' }],
    [{ type: 'raw_text', text: 'Globex' }, { type: 'raw_text', text: 'Discovery' }, { type: 'raw_number', value: 45000, text: '$45,000' }],
  ],
}`,
  },

  // ------------------------------------------------------------------------------------------------ agent blocks (§3.17, 3.18)
  {
    id: 'plan',
    group: 'Agents',
    name: 'plan · expanded',
    about: 'Plans start collapsed; tapped open, each task shows its status (hourglass, sparkle, a dot when done, warning), title, details and output.',
    snapshot: 'BKPlanBlockSnapshotTests/testAllStates_expanded',
    code: `bk.plan('Preparing the Q3 summary', [
  { id: 't1', title: 'Pull revenue by region', status: 'complete', output: 'Four regions, Q2 and Q3.' },
  { id: 't2', title: 'Compare with the forecast', status: 'in_progress', details: 'Reading the planning sheet' },
  { id: 't3', title: 'Draft the summary', status: 'pending' },
  { id: 't4', title: 'Check the churn numbers', status: 'error', details: 'The dashboard didn’t respond.' },
])`,
    expand: [0],
  },
  {
    id: 'plan-collapsed',
    group: 'Agents',
    name: 'plan · collapsed',
    about: 'The header alone: the spinner and a shimmering gray title while any task is pending or in progress, then a check (or a warning if one failed). Tap to expand.',
    snapshot: 'BKPlanBlockSnapshotTests/testCollapsedState_mixedStates, testCollapsedState_allComplete',
    code: `bk.plan('Researching competitors', [
  { id: 'a', title: 'Search the web', status: 'complete' },
  { id: 'b', title: 'Summarize findings', status: 'in_progress' },
])`,
  },
  {
    id: 'task-card',
    group: 'Agents',
    name: 'task_card · expanded',
    about: 'One task: the details, the output and the sources (links) behind a 2 pt pipe.',
    snapshot: 'BKTaskBlockSnapshotTests/testExpandedState_withOutputAndSources',
    code: `bk.taskCard({
  id: 'search',
  title: 'Searched the launch channel',
  status: 'complete',
  details: 'Read 214 messages from the last two weeks',
  output: 'Found 3 decisions and 2 open questions.',
  sources: [{ type: 'url', url: 'https://northstar.example/launch', text: 'Launch plan' }, { type: 'url', url: 'https://northstar.example/faq', text: 'Launch FAQ' }],
})`,
    expand: [0],
  },
  {
    id: 'task-card-states',
    group: 'Agents',
    name: 'task_card · states',
    about: 'Task cards start collapsed: in progress shows the spinner and a shimmering title, complete a check, error a warning (pending looks like in progress).',
    snapshot: 'BKTaskBlockSnapshotTests/testCollapsedState_loading, …_complete, …_error',
    code: `bk.taskCard({ id: 'w', title: 'Searching Salesforce', status: 'in_progress', details: 'Opportunities closing this quarter' }),
bk.taskCard({ id: 'c', title: 'Checked the calendar', status: 'complete', output: 'You’re free Thursday afternoon.' }),
bk.taskCard({ id: 'e', title: 'Read the pricing doc', status: 'error', details: 'You don’t have access to this file.' })`,
  },
  {
    id: 'context-actions',
    group: 'Agents',
    name: 'context_actions',
    about: 'Feedback thumbs and small icon buttons (Block Kit allows `trash`) under an agent’s answer.',
    code: `bk.markdown('The launch is on track: 12 of 16 tasks are done.'),
bk.feedback('answer_feedback', { extra: [bk.iconButton('trash', 'Remove', 'remove_answer')] })`,
  },

  // ------------------------------------------------------------------------------------------------ modals only (§3.16, 3.20)
  {
    id: 'alert',
    group: 'Modals only',
    name: 'alert',
    about: 'A tinted row with an icon by level: default, info, success, warning, error.',
    snapshot: 'BKAlertBlockSnapshotTests/testDefaultLevel … testErrorLevel',
    code: `{ type: 'alert', text: bk.md('Requests are reviewed within *two business days*.') },
{ type: 'alert', level: 'info', text: bk.md('Your manager is copied on this request.') },
{ type: 'alert', level: 'success', text: bk.md('Your laptop request was approved.') },
{ type: 'alert', level: 'warning', text: bk.md('Only 2 days of vacation left this year.') },
{ type: 'alert', level: 'error', text: bk.md('The budget system is offline. Try again later.') }`,
  },
  {
    id: 'loading',
    group: 'Modals only',
    name: 'loading (internal)',
    about: 'Slack’s internal loading row: a 24 pt spinner, 12 pt above and below.',
    snapshot: 'BKLoadingBlockSnapshotTests/testLoadingBlock',
    code: `bk.section('Looking up your open requests…'),
{ type: 'loading' }`,
    surfaces: ['modal'],
    internal: true,
  },

  // ------------------------------------------------------------------------------------------------ unknown (§3.20)
  {
    id: 'unknown',
    group: 'Unknown blocks',
    name: 'unknown block',
    about: 'A block iOS can’t draw shows the banner “Not available on mobile yet · Open Slack desktop to view”.',
    snapshot: 'BKFallbackBlockSnapshotTests/test_unknown',
    code: `bk.section('Here’s the dashboard:'),
{ type: 'data_visualization', title: 'Signups', chart: { type: 'pie', segments: [{ label: 'Web', value: 62 }, { label: 'iOS', value: 38 }] } }`,
    surfaces: ['message', 'home'],
  },
  {
    id: 'unknown-fallback',
    group: 'Unknown blocks',
    name: 'unknown block with fallback',
    about: 'A block that carries `fallback` blocks draws those instead (the forward-compatibility convention).',
    code: `{ type: 'future_block', fallback: [bk.section('A client that doesn’t know *future_block* draws these blocks instead.')] }`,
    surfaces: ['message', 'modal', 'home'],
    internal: true,
  },

  // ------------------------------------------------------------------------------------------------ snapshot fixtures
  // Slack's own fixtures (Modules/UIInfra/BlockKitComponents/Tests/Unit/Blocks/*SnapshotTests.swift), for the snapshot
  // suite: ?kit=blocks&only=<id>. Static states only (the loading spinner and shimmer animate).
  {
    id: 'fx-task-expanded',
    group: 'Snapshot fixtures',
    name: 'task_card · expanded (fixture)',
    about: 'BKTaskBlockSnapshotTests.testExpandedState_withDetailsAndOutput.',
    snapshot: 'BKTaskBlockSnapshotTests/testExpandedState_withDetailsAndOutput',
    code: `bk.taskCard({ id: 'task_1', title: 'Generate quarterly report', status: 'complete', details: 'Compiling data from all departments for Q4 2025', output: 'Report generated successfully with 42 data points analyzed' })`,
    expand: [0],
    surfaces: ['message'],
    fixture: { top: 0 },
  },
  {
    id: 'fx-task-collapsed',
    group: 'Snapshot fixtures',
    name: 'task_card · collapsed (fixture)',
    about: 'BKTaskBlockSnapshotTests.testCollapsedState_complete (an output makes it expandable, as the test says).',
    snapshot: 'BKTaskBlockSnapshotTests/testCollapsedState_complete',
    code: `bk.taskCard({ id: 'task_1', title: 'Data analysis complete', status: 'complete', output: 'Done.' })`,
    surfaces: ['message'],
    fixture: { top: 0 },
  },
  {
    id: 'fx-plan-expanded',
    group: 'Snapshot fixtures',
    name: 'plan · expanded (fixture)',
    about: 'BKPlanBlockSnapshotTests.testExpandedState_tasksWithOutput.',
    snapshot: 'BKPlanBlockSnapshotTests/testExpandedState_tasksWithOutput',
    code: `bk.plan('Research Project', [
  { id: '1', title: 'Data collection', status: 'complete', details: 'Gathering data from multiple sources', output: 'Collected 1,000 data points' },
  { id: '2', title: 'Data analysis', status: 'complete', details: 'Analyzing collected data', output: 'Found 5 key insights' },
])`,
    expand: [0],
    surfaces: ['message'],
    fixture: { top: 0 },
  },
  {
    id: 'fx-plan-collapsed',
    group: 'Snapshot fixtures',
    name: 'plan · collapsed (fixture)',
    about: 'BKPlanBlockSnapshotTests.testCollapsedState_allComplete.',
    snapshot: 'BKPlanBlockSnapshotTests/testCollapsedState_allComplete',
    code: `bk.plan('Q1 Project Plan', [
  { id: '1', title: 'Research phase', status: 'complete' },
  { id: '2', title: 'Development phase', status: 'complete' },
  { id: '3', title: 'Testing phase', status: 'complete' },
])`,
    surfaces: ['message'],
    fixture: { top: 0 },
  },
  {
    id: 'fx-header',
    group: 'Snapshot fixtures',
    name: 'header (fixture)',
    about: 'BKHeaderBlockSnapshotTests.testHeaderBlock: no level, so level 2 (Lato Black 22), 12 pt above.',
    snapshot: 'BKHeaderBlockSnapshotTests/testHeaderBlock',
    code: `bk.header('This is a test header block with long text that would wrap to test height calculations')`,
    surfaces: ['message'],
    fixture: { top: 12 },
  },
]
