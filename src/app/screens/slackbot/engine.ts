import type { Conversation, Fixture, Message, User } from '../../../data/types'

// The demo's Slackbot: answers questions from the workspace in the store. Ported from the web clone
// (slack-remix src/components/slackbot/engine.ts) so a prototype reads the same on web and mobile, and hardened so it
// never assumes the Northstar people and channels exist: every demo-specific answer has a generic one built from
// whatever the workspace holds. Answers are Slack mrkdwn; `<cite://CHANNEL/TS>` marks a numbered citation to a message
// (the reply renders it as a superscript and lists it in the Sources sheet).

export interface Step {
  /** a timeline tool icon, web-style ("ai-sparkle", "search", "calendar", "edit"); Icons.xcassets name = dashes → _ */
  icon: string
  text: string
}

export interface Answer {
  /** conversation title (History, header) */
  title: string
  /** timeline steps shown while Slackbot works */
  steps: Step[]
  /** timeline header once it's done */
  summary: Step
  /** the answer, mrkdwn */
  text: string
  /** suggested next question */
  followUp?: string
  /** agentic answers: the plan card Slackbot works through before it answers (a Block Kit `plan` block, §2.5b) */
  plan?: PlanSpec
  /** something Slackbot made for you (the Create prompts): added to the workspace when the answer finishes */
  artifact?: Artifact
}

export interface PlanSpec {
  title: string
  tasks: { title: string; details?: string }[]
}

/** A canvas or a list Slackbot creates; `lines` use the canvas line markup (src/data/canvas/templates.ts blocksFromLines). */
export type Artifact =
  | { kind: 'canvas'; id: string; title: string; lines: string[] }
  | { kind: 'list'; id: string; title: string; items: { title: string; ownerId?: string; due?: string }[] }

export interface Turn {
  question: string
  answer?: string
  title?: string
}

export interface EngineContext {
  fx: Fixture
  messages: Record<string, Message[]>
  threads: Record<string, Message[]>
  /** the conversation Slackbot was opened from (reads along in it) */
  channelContext?: string
  /** earlier turns of this conversation */
  history: Turn[]
}

const STOP = new Set(
  'a an and are about any anything at be by can could did do does find for from get give has have how i in is it its latest link me message messages my of on or please post posted related said say search show slack tell that the their them there this to up was were what when where which who why will with you your'.split(
    ' ',
  ),
)

// ------------------------------------------------------------------------------------------------
// Workspace helpers

const firstName = (u?: User) => (u ? u.realName.split(' ')[0] : 'them')

function people(fx: Fixture) {
  return Object.values(fx.users).filter((u) => !u.isApp && !u.isBot && u.id !== fx.me)
}

function channels(fx: Fixture): Conversation[] {
  return Object.values(fx.conversations).filter((c) => c.type === 'channel' || c.type === 'private')
}

const ALIASES: Record<string, string> = {
  atlas: 'launch-atlas',
  'atlas launch': 'launch-atlas',
  'launch atlas': 'launch-atlas',
  launch: 'launch-atlas',
  eng: 'engineering',
  cs: 'customer-success',
  'customer success': 'customer-success',
  support: 'customer-success',
  incident: 'incidents',
}

/** A channel the question refers to: `#name`, the channel's name, or a common alias. */
function findChannel(fx: Fixture, q: string): Conversation | undefined {
  const list = channels(fx)
  const hash = /#([a-z0-9_-]+)/.exec(q)
  if (hash) {
    const c = list.find((ch) => ch.name === hash[1])
    if (c) return c
  }
  // Longest names first so "customer-success" wins over "success".
  for (const c of [...list].sort((a, b) => b.name.length - a.name.length)) {
    const spaced = c.name.replace(/-/g, ' ')
    if (new RegExp(`\\b(${escape(c.name)}|${escape(spaced)})\\b`).test(q)) return c
  }
  for (const [alias, name] of Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length)) {
    if (new RegExp(`\\b${escape(alias)}\\b`).test(q)) {
      const c = list.find((x) => x.name === name)
      if (c) return c
    }
  }
  return undefined
}

function findPerson(fx: Fixture, q: string): User | undefined {
  for (const u of people(fx)) {
    const [first, last] = u.realName.toLowerCase().split(' ')
    if ((first && new RegExp(`\\b${escape(first)}\\b`).test(q)) || (last && new RegExp(`\\b${escape(last)}\\b`).test(q))) return u
  }
  return undefined
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Plain text of a message: mrkdwn markers, links and emoji removed. */
function plain(fx: Fixture, text: string) {
  return text
    .replace(/<@([A-Z0-9]+)>/g, (_, id: string) => `@${fx.users[id]?.name ?? 'someone'}`)
    .replace(/<#[A-Z0-9]+\|?([^>]*)>/g, (_, name: string) => `#${name}`)
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/:[a-z0-9_+-]+:/g, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function gist(fx: Fixture, text: string, max = 110) {
  const p = plain(fx, text)
  const sentence = /^(.{20,}?[.!?])(\s|$)/.exec(p)?.[1] ?? p
  return sentence.length > max ? `${sentence.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : sentence
}

class Workspace {
  constructor(private ctx: EngineContext) {}
  get fx() {
    return this.ctx.fx
  }
  msgs(convId: string) {
    return this.ctx.messages[convId] ?? []
  }
  /** Message in a conversation whose text starts with `snippet`, else contains it (case-insensitive). */
  find(convId: string, snippet: string): Message | undefined {
    const s = snippet.toLowerCase()
    const list = this.msgs(convId)
    const bare = (m: Message) => m.text.toLowerCase().replace(/^(:[a-z0-9_+-]+:\s*|\*)+/, '')
    return list.find((m) => m.text.toLowerCase().startsWith(s) || bare(m).startsWith(s)) ?? list.find((m) => m.text.toLowerCase().includes(s))
  }
  cite(convId: string | undefined, snippet: string) {
    if (!convId) return ''
    const m = this.find(convId, snippet)
    return m ? ` <cite://${convId}/${m.ts}>` : ''
  }
  citeMsg(convId: string, m: Message) {
    return ` <cite://${convId}/${m.ts}>`
  }
  user(nameOrId: string): User | undefined {
    const fx = this.fx
    return fx.users[nameOrId] ?? Object.values(fx.users).find((u) => u.realName.toLowerCase().startsWith(nameOrId.toLowerCase()))
  }
  mention(nameOrId: string) {
    const u = this.user(nameOrId)
    return u ? `<@${u.id}>` : nameOrId
  }
  channel(name: string): Conversation | undefined {
    return channels(this.fx).find((c) => c.name === name)
  }
  /** a channel by id or name, if the workspace has it */
  has(idOrName: string) {
    return !!this.fx.conversations[idOrName] || !!this.channel(idOrName)
  }
  ch(name: string) {
    const c = this.channel(name)
    return c ? `<#${c.id}|${c.name}>` : `#${name}`
  }
  /** DM with a person, if there is one. */
  dmWith(userId: string) {
    return Object.values(this.fx.conversations).find((c) => c.type === 'im' && c.userId === userId)
  }
  replies(convId: string, ts: string) {
    return this.ctx.threads[`${convId}/${ts}`] ?? []
  }
  /** Every message in channels and DMs, newest first, with where it lives. */
  all() {
    const out: { conv: Conversation; msg: Message }[] = []
    for (const conv of Object.values(this.fx.conversations)) {
      for (const msg of this.msgs(conv.id)) out.push({ conv, msg })
      for (const [key, list] of Object.entries(this.ctx.threads)) if (key.startsWith(`${conv.id}/`)) for (const msg of list) out.push({ conv, msg })
    }
    return out.sort((a, b) => parseFloat(b.msg.ts) - parseFloat(a.msg.ts))
  }
  /** Channels by recent activity (messages + reactions), busiest first. */
  busiest(): Conversation[] {
    const score = (c: Conversation) => this.msgs(c.id).reduce((n, m) => n + 1 + (m.reactions ?? []).reduce((k, r) => k + r.users.length, 0) / 3, 0)
    return channels(this.fx)
      .filter((c) => this.msgs(c.id).length)
      .sort((a, b) => score(b) - score(a))
  }
}

/** The demo's own storyline is only told when its channels and people are all there. */
const isNorthstar = (w: Workspace) => !!w.channel('launch-atlas') && !!w.user('Priya') && !!w.user('Sofia') && !!w.user('Marcus')

// ------------------------------------------------------------------------------------------------
// Intents

export function answer(question: string, ctx: EngineContext): Answer {
  const q = question.toLowerCase().replace(/[’']/g, "'")
  const w = new Workspace(ctx)
  const fx = ctx.fx
  const last = ctx.history[ctx.history.length - 1]
  const context = ctx.channelContext ? fx.conversations[ctx.channelContext] : undefined

  // Follow-ups on a draft: shorter / more formal / friendlier.
  if (last?.title?.startsWith('Draft') && /\b(shorter|concise|brief|trim|formal|friendl|casual|tone|warmer)\b/.test(q)) return reviseDraft(q, last)
  if (/\b(what can you (help|do)|help me with|tell me about what you can do|what are you)\b/.test(q)) return capabilities(w)
  // The landing page's prompts (prompts.ts): each gets an answer built from the workspace.
  if (/^can you (create|make|write) (documents|docs|canvases)\b/.test(q)) return canDocuments(w)
  if (/^can you (set|create) reminders?\b/.test(q)) return canRemind(w)
  if (/^can you summari[sz]e\b/.test(q)) return canSummarize(w)
  if (/^brainstorm\b/.test(q)) return brainstorm(q, w)
  if (/^(create|make|start|set up|draft) (a|an|my|me a)\b/.test(q) && /\b(canvas|list|document|doc|agenda|template|reflection|tracker|plan)\b/.test(q)) return create(q, w)
  if (/\b(calendar|focus time|my schedule|meetings? today)\b/.test(q)) return calendar(w, /\b(gaps?|focus|free)\b/.test(q))
  if (/\b(open tasks|tasks for the week|my tasks|to-?dos? (for|this) (the )?week)\b/.test(q)) return tasks(w)
  if (/\b(important|starred|favorite) channels\b/.test(q)) return importantChannels(w)
  if (/\b(conversations|discussions) about (a|the|my) project\b/.test(q)) return projectConversations(w)

  if (/\b(draft|write|compose|reply to|respond to|message to|dm to|follow up with|announce)\b/.test(q)) return draft(q, w)
  if (/\b(vibe|mood|sentiment|feeling)\b/.test(q)) {
    const target = findChannel(fx, q) ?? context ?? w.channel('launch-atlas') ?? w.busiest()[0]
    if (target) return vibe(target, w)
  }
  if (/\b(who is|who's|whos|tell me about|what is \w+ working on|what's \w+ working on|who owns|who can help|who should)\b/.test(q)) {
    const person = findPerson(fx, q)
    if (person) return about(person, w)
  }
  // "Find action items from recent discussions…" is a to-do round-up, not a keyword search
  if (/\baction items?\b/.test(q)) return attention(w)
  if (/\b(find|search|where is|where's|look for|locate|link to|dig up|pull up)\b/.test(q)) return search(q, w)
  if (/\b(attention|needs? me|for me|priorit|to-?do|todo|mentions?|what did i miss|missed|my day|follow[- ]ups?|waiting on me|respond|action items?)\b/.test(q))
    return attention(w, /\bfor me\b/.test(q) && context ? context : undefined)
  const channel = findChannel(fx, q)
  if (/\b(summar|catch me up|catch up|recap|tl;?dr|what's happening|what is happening|what's going on|update on|status|on track|happening in|going on in)\b/.test(q)) {
    if (channel) return channelSummary(channel, w)
    if (context && /catch me up|what's happening|going on|summar/.test(q) && context.type !== 'im' && context.type !== 'app') return channelSummary(context, w)
    const launch = w.channel('launch-atlas')
    if (/\b(atlas|launch)\b/.test(q) && launch) return channelSummary(launch, w)
    return week(w)
  }
  if (/\b(this week|what happened|highlights|overview|week)\b/.test(q)) return week(w)
  if (/\b(animal|surprise me)\b/.test(q)) return playful(q, w)
  if (channel) return channelSummary(channel, w)
  const person = findPerson(fx, q)
  if (person && q.split(' ').length <= 4) return about(person, w)
  const found = searchResults(q, w)
  if (found.length) return search(q, w)
  return fallback(question, w)
}

/** Title Slackbot gives a conversation before the answer is in (the question, trimmed). */
export function provisionalTitle(question: string) {
  const t = question.trim().replace(/\s+/g, ' ')
  return t.length > 48 ? `${t.slice(0, 47)}…` : t
}

/** Whether a search query reads like a question (the AI answer card and "Ask Slackbot" ordering). */
export function looksLikeQuestion(q: string) {
  const t = q.trim().toLowerCase()
  return t.endsWith('?') || /^(who|what|when|where|why|how|which|is|are|can|could|should|does|do|did|will|summari[sz]e|tell me|explain)\b/.test(t)
}

function capabilities(w: Workspace): Answer {
  const ch = w.busiest()[0]
  const p = people(w.fx)[0]
  const text = [
    `I'm Slackbot, your AI assistant in ${w.fx.workspace.name}. Here's what I can do:`,
    '',
    `• *Catch you up* on channels and threads${ch ? `: "Summarize ${w.ch(ch.name)}"` : ''}`,
    `• *Find* messages, files and people${p ? `: "What is ${firstName(p)} working on?"` : ''}`,
    '• *Draft* messages and replies in your voice',
    '• *Prioritize* your day: "What needs my attention today?"',
    '• *Brainstorm* ideas and next steps with you',
  ].join('\n')
  return {
    title: 'What Slackbot can help with',
    steps: [{ icon: 'ai-sparkle', text: 'Thinking' }],
    summary: { icon: 'ai-sparkle', text: 'Thought about your request.' },
    text,
    followUp: 'What needs my attention today?',
  }
}

function week(w: Workspace): Answer {
  const steps = [
    { icon: 'ai-sparkle', text: 'Scoring your recent activity' },
    { icon: 'search', text: 'Searched information' },
    { icon: 'search', text: 'Found latest messages' },
  ]
  const summary = { icon: 'search', text: 'Searched channels and found latest messages.' }
  if (!isNorthstar(w)) {
    const top = w.busiest().slice(0, 4)
    const lines = top.flatMap((c) => {
      const m = [...w.msgs(c.id)].sort((a, b) => (b.reactions?.length ?? 0) - (a.reactions?.length ?? 0))[0]
      return m ? [`• *${w.ch(c.name)}*: ${gist(w.fx, m.text)}${w.citeMsg(c.id, m)}`] : []
    })
    return {
      title: 'Slack activity summary this week',
      steps,
      summary,
      text: lines.length
        ? [`Here's what happened across ${w.fx.workspace.name} this week :sparkles:`, '', ...lines].join('\n')
        : `It's been a quiet week in ${w.fx.workspace.name}: there's nothing new in the channels you're in.`,
      followUp: 'What needs my attention today?',
    }
  }
  const eng = w.channel('engineering')?.id
  const id = (name: string) => w.channel(name)?.id
  const text = [
    `Here's what happened across ${w.fx.workspace.name} this week :sparkles:`,
    '',
    `*Atlas launch* (${w.ch('launch-atlas')})`,
    `• The launch is set for *Oct 14*. Load testing and security review are done; docs are at 80% and pricing page copy is still open${w.cite(id('launch-atlas'), 'Launch checklist')}`,
    `• Atlas beta went live for 12 design partners${w.cite(id('announcements'), 'Atlas beta is live')}`,
    '',
    '*Product & engineering*',
    `• ${w.mention('Priya')} shared the Q4 Platform plan and ${w.mention('Tom')} asked to pull audit logs ahead of SSO${w.cite(id('product'), 'Q4 plan for Platform')}${w.cite(id('product'), 'pull audit logs ahead')}`,
    `• Beta users who use summaries 3x a week retain *2.4x* better at week 4${w.cite(id('product'), '2.4x')}`,
    `• ${w.mention('Marcus')}'s search indexer PR cuts reindex time from ~40 min to 6${w.cite(eng, 'search indexer')}`,
    `• Deploy #4812 shipped to production and smoke tests passed${w.cite(eng, 'Deploy #4812')}`,
    '',
    '*Customers & sales*',
    `• :tada: Initech closed: 450 seats on a 3-year deal${w.cite(id('sales'), 'Initech')}`,
    `• Acme Corp's summary timeouts were fixed within the hour${w.cite(id('customer-success'), 'Escalation from Acme')}`,
    `• Weekly NPS rose to *62*, up from 57${w.cite(id('customer-success'), 'Weekly NPS')}`,
    '',
    '*Company*',
    `• The SOC 2 audit passed with zero findings${w.cite(id('general'), 'SOC 2')}`,
    `• A SEV-2 on the search API was resolved; a postmortem is coming${w.cite(id('incidents'), 'Resolved')}`,
  ].join('\n')
  return { title: 'Slack activity summary this week', steps, summary, text, followUp: 'What needs my attention today?' }
}

function attention(w: Workspace, only?: Conversation): Answer {
  const fx = w.fx
  if (only) {
    const mine = w.msgs(only.id).filter((m) => m.text.includes(`<@${fx.me}>`) || m.userId === fx.me)
    const lines = mine.slice(-3).map((m) => `• ${m.userId === fx.me ? 'Your message' : w.mention(m.userId)}: "${gist(fx, m.text, 90)}"${w.citeMsg(only.id, m)}`)
    return {
      title: `Anything for me in #${only.name}`,
      steps: [
        { icon: 'search', text: `Read #${only.name}` },
        { icon: 'search', text: 'Checked mentions and requests for you' },
      ],
      summary: { icon: 'search', text: `Checked #${only.name} for mentions and requests.` },
      text: lines.length
        ? [`Here's what involves you in ${w.ch(only.name)}:`, '', ...lines, '', `Nothing else is waiting on you there right now.`].join('\n')
        : `Nothing in ${w.ch(only.name)} is waiting on you right now :relieved: No mentions, questions or requests for you in the last week.`,
      followUp: `Summarize #${only.name}`,
    }
  }
  const steps = [
    { icon: 'ai-sparkle', text: 'Scoring your recent activity' },
    { icon: 'search', text: 'Checked your mentions and DMs' },
    { icon: 'calendar', text: 'Checked your calendar' },
  ]
  const summary = { icon: 'ai-sparkle', text: 'Reviewed your mentions, DMs and calendar.' }
  const priya = w.user('Priya')
  if (!isNorthstar(w) || !priya) {
    // Generic: mentions of you and unread DMs, newest first.
    const hits = w
      .all()
      .filter((x) => x.msg.userId !== fx.me && (x.msg.text.includes(`<@${fx.me}>`) || x.conv.type === 'im' || x.conv.type === 'mpim'))
      .slice(0, 5)
    const lines = hits.map((x, i) => `${i + 1}. ${w.mention(x.msg.userId)}${x.conv.type === 'channel' || x.conv.type === 'private' ? ` in ${w.ch(x.conv.name)}` : ''}: "${gist(fx, x.msg.text, 90)}"${w.citeMsg(x.conv.id, x.msg)}`)
    return {
      title: "Today's priorities and follow-ups",
      steps,
      summary,
      text: lines.length ? ["Here's what needs your attention, most recent first:", '', ...lines].join('\n') : "You're all caught up :relieved: No mentions or DMs are waiting on you.",
      followUp: 'What happened in Slack this week?',
    }
  }
  const dm = w.dmWith(priya.id)
  const cal = Object.values(fx.conversations).find((c) => c.type === 'app' && c.name === 'Calendar')
  const launch = w.channel('launch-atlas')?.id
  const text = [
    `Here's what needs your attention today, most urgent first:`,
    '',
    `1. *Reply to ${w.mention(priya.id)}*: she needs a call on whether summary sharing is in scope for Atlas GA. Engineering needs it by Thursday${dm ? w.cite(dm.id, 'summary sharing') : ''}`,
    `2. *Atlas design review* starts at 10:30 AM on Zoom${cal ? w.cite(cal.id, 'Atlas design review') : ''}`,
    `3. *Pricing page copy* is the only :x: left on the launch checklist, and it's on your list${w.cite(launch, 'Launch checklist')}`,
    `4. *Summary card designs*: ${w.mention('Sofia')} pushed updates and you offered to review them with Priya tomorrow${w.cite(w.channel('product')?.id, 'summary card designs')}`,
    `5. *Demo workspace*: you committed to a stable one by *Oct 7* for sales enablement${w.cite(launch, 'stable demo workspace')}`,
    '',
    `You also have unread activity in ${w.ch('engineering')} and ${w.ch('product')}.`,
  ].join('\n')
  return { title: "Today's priorities and follow-ups", steps, summary, text, followUp: 'Draft a reply to Priya about summary sharing' }
}

function channelSummary(conv: Conversation, w: Workspace): Answer {
  const name = conv.name
  const steps = [
    { icon: 'search', text: 'Searched information' },
    { icon: 'search', text: `Read #${name}` },
    { icon: 'search', text: 'Found latest messages' },
  ]
  const summary = { icon: 'search', text: 'Searched channels and found latest messages.' }
  if (name === 'launch-atlas' && isNorthstar(w)) {
    const priya = w.user('Priya')!
    const dm = w.dmWith(priya.id)
    const text = [
      `*${w.ch(name)} at a glance*: the Atlas launch is on track for *Oct 14*, with two open items.`,
      '',
      '*Where things stand*',
      `• You kicked off the war room: target Oct 14, with you as DRI${w.cite(conv.id, 'Kicking off')}`,
      `• ${w.mention('Priya')}'s checklist: load testing and security review are done :white_check_mark:, docs are at 80%, and *pricing page copy* hasn't started :x:${w.cite(conv.id, 'Launch checklist')}`,
      `• ${w.mention('Hannah')} locked the positioning line: _"Atlas turns every conversation into answers."_${w.cite(conv.id, 'Messaging doc')}`,
      '',
      '*Coming up*',
      `• Sales enablement is booked for *Oct 9* and ${w.mention('Daniel')} needs the demo environment by then${w.cite(conv.id, 'enablement session')}`,
      `• You committed to a stable demo workspace by *Oct 7*${w.cite(conv.id, 'stable demo workspace')}`,
      '',
      '*Open question*',
      `• ${w.mention('Emily')} asked whether sharing summaries outside Slack should be a v1.1 item${w.cite(conv.id, 'share summaries')}, and Priya needs a GA scope call on it by Thursday${dm ? w.cite(dm.id, 'summary sharing') : ''}`,
      '',
      'Want me to draft a reply to Priya about summary sharing?',
    ].join('\n')
    return { title: `#${name} channel summary`, steps, summary, text, followUp: 'Yes, draft a reply to Priya' }
  }
  const msgs = w.msgs(conv.id)
  if (!msgs.length)
    return { title: `#${name} channel summary`, steps, summary, text: `${w.ch(name)} has been quiet: there are no messages in the last week.`, followUp: 'What happened in Slack this week?' }
  const score = (m: Message) => (m.reactions ?? []).reduce((n, r) => n + r.users.length, 0) + w.replies(conv.id, m.ts).length * 2 + Math.min(m.text.length / 80, 2)
  const top = [...msgs]
    .filter((m) => m.subtype !== 'huddle_thread' && m.subtype !== 'channel_join')
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4)
    .sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  const authors = new Set(msgs.map((m) => m.userId))
  const lines = top.map((m) => {
    const replies = w.replies(conv.id, m.ts).length
    return `• ${m.userId === w.fx.me ? 'You' : w.mention(m.userId)}: ${gist(w.fx, m.text)}${replies ? ` (${replies} ${replies === 1 ? 'reply' : 'replies'})` : ''}${w.citeMsg(conv.id, m)}`
  })
  const text = [
    `*${w.ch(name)}* had ${msgs.length} ${msgs.length === 1 ? 'message' : 'messages'} from ${authors.size} ${authors.size === 1 ? 'person' : 'people'} recently. Here are the highlights:`,
    '',
    ...lines,
    '',
    conv.topic ? `Channel topic: _${plain(w.fx, conv.topic)}_` : '',
  ]
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
    .join('\n')
    .trim()
  return { title: `#${name} channel summary`, steps, summary, text, followUp: `Anything in #${name} for me?` }
}

function vibe(conv: Conversation, w: Workspace): Answer {
  const msgs = w.msgs(conv.id)
  const reactions = msgs.reduce((n, m) => n + (m.reactions ?? []).reduce((k, r) => k + r.users.length, 0), 0)
  const top = [...msgs].sort((a, b) => (b.reactions?.length ?? 0) - (a.reactions?.length ?? 0))[0]
  const text =
    conv.name === 'launch-atlas' && isNorthstar(w)
      ? [
          `The vibe in ${w.ch(conv.name)} is *focused and upbeat* :rocket:`,
          '',
          `• Energy is high since the kickoff, which got a :rocket: from six people${w.cite(conv.id, 'Kicking off')}`,
          `• There's some healthy pressure around the pricing page copy and the demo environment deadlines${w.cite(conv.id, 'Launch checklist')}`,
          `• Customers are already asking for more, like sharing summaries outside Slack. That's a good sign${w.cite(conv.id, 'share summaries')}`,
        ].join('\n')
      : [
          `The vibe in ${w.ch(conv.name)} is *${reactions > 8 ? 'upbeat and busy' : reactions > 2 ? 'friendly and steady' : 'quiet'}*.`,
          '',
          `• ${msgs.length} messages and ${reactions} reactions recently`,
          top ? `• The most-loved message: "${gist(w.fx, top.text, 90)}"${w.citeMsg(conv.id, top)}` : '',
        ]
          .filter(Boolean)
          .join('\n')
  return {
    title: `#${conv.name} vibe check`,
    steps: [
      { icon: 'search', text: `Read #${conv.name}` },
      { icon: 'ai-sparkle', text: 'Gauged the tone of recent messages' },
    ],
    summary: { icon: 'ai-sparkle', text: `Read #${conv.name} and gauged the tone.` },
    text,
    followUp: `Summarize #${conv.name}`,
  }
}

function about(u: User, w: Workspace): Answer {
  const fx = w.fx
  const recent = w
    .all()
    .filter((x) => x.msg.userId === u.id && x.conv.type !== 'app')
    .slice(0, 3)
  const where = (c: Conversation) => (c.type === 'channel' || c.type === 'private' ? `in ${w.ch(c.name)}` : c.type === 'im' ? 'in your DM' : 'in a group DM')
  const first = firstName(u)
  const lines = recent.map((x) => `• ${gist(fx, x.msg.text, 100)} (${where(x.conv)})${w.citeMsg(x.conv.id, x.msg)}`)
  const status = u.statusText ? ` Their status says _${u.statusText}_${u.statusEmoji ? ` :${u.statusEmoji}:` : ''}.` : ''
  const text = [
    `${w.mention(u.id)} is *${u.title ?? 'a teammate'}* at ${fx.workspace.name}. ${first} is ${u.presence === 'active' ? 'active right now' : 'away at the moment'}.${status}`,
    '',
    `*What ${first} has been working on*`,
    ...(lines.length ? lines : [`• Nothing recent in channels you're in.`]),
    '',
    `Want me to draft a message to ${first}?`,
  ].join('\n')
  return {
    title: `About ${u.realName}`,
    steps: [
      { icon: 'user', text: `Looked up ${u.realName}` },
      { icon: 'search', text: 'Searched information' },
    ],
    summary: { icon: 'search', text: `Looked up ${u.realName} and their recent messages.` },
    text,
    followUp: `Draft a message to ${first}`,
  }
}

function keywords(q: string) {
  return q
    .replace(/[^a-z0-9#@ -]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^#/, ''))
    .filter((t) => t.length > 2 && !STOP.has(t))
}

function searchResults(q: string, w: Workspace) {
  const words = keywords(q)
  if (!words.length) return []
  const person = findPerson(w.fx, q)
  return w
    .all()
    .filter((x) => x.conv.type !== 'app' || words.some((k) => x.conv.name.toLowerCase().includes(k)))
    .map((x) => {
      const t = plain(w.fx, x.msg.text).toLowerCase()
      let score = words.reduce((n, k) => n + (t.includes(k) ? 2 : 0) + (x.conv.name.toLowerCase().includes(k) ? 1 : 0), 0)
      if (person && x.msg.userId === person.id) score += 2
      return { ...x, score }
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || parseFloat(b.msg.ts) - parseFloat(a.msg.ts))
    .slice(0, 3)
}

function search(q: string, w: Workspace): Answer {
  const results = searchResults(q, w)
  const words = keywords(q).filter((k) => !findPerson(w.fx, k))
  const topic = words.slice(0, 3).join(' ') || 'that'
  const where = (c: Conversation) =>
    c.type === 'channel' || c.type === 'private' ? `in ${w.ch(c.name)}` : c.type === 'im' ? `in your DM with ${w.mention(c.userId ?? '')}` : c.type === 'app' ? `from ${c.name}` : 'in a group DM'
  const text = results.length
    ? [
        `I found ${results.length === 1 ? 'one message' : `${results.length} messages`} about *${topic}*:`,
        '',
        ...results.map((x) => `• ${x.msg.userId === w.fx.me ? 'You' : w.mention(x.msg.userId)} ${where(x.conv)}: "${gist(w.fx, x.msg.text, 120)}"${w.citeMsg(x.conv.id, x.msg)}`),
        '',
        results.length > 1 ? `The first one looks like the best match.` : '',
      ]
        .join('\n')
        .trim()
    : `I couldn't find any messages about *${topic}* in the channels and DMs you have access to. Try different keywords, or ask me to search a specific channel.`
  const firstChannel = results.find((x) => x.conv.type === 'channel' || x.conv.type === 'private')?.conv
  return {
    title: `Search for ${topic}`,
    steps: [
      { icon: 'search', text: 'Searched messages' },
      { icon: 'search', text: results.length ? `Found ${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'No matches found' },
    ],
    summary: { icon: 'search', text: results.length ? `Searched messages and found ${results.length} ${results.length === 1 ? 'result' : 'results'}.` : 'Searched messages.' },
    text,
    followUp: firstChannel ? `Summarize #${firstChannel.name}` : 'What happened in Slack this week?',
  }
}

const DRAFT_STEPS = [
  { icon: 'ai-sparkle', text: 'Reading the conversation' },
  { icon: 'edit', text: 'Drafting in your voice' },
]

function draft(q: string, w: Workspace): Answer {
  const person = findPerson(w.fx, q)
  const channel = person ? undefined : findChannel(w.fx, q)
  const topicMatch = /\babout (.+?)[?.!]*$/.exec(q)
  const topic = topicMatch?.[1]?.trim()
  let to: string
  let body: string
  if (person && person.realName.startsWith('Priya') && isNorthstar(w) && (!topic || /summary|sharing|scope|ga/.test(topic))) {
    to = w.mention(person.id)
    body =
      "Hi Priya! On summary sharing: let's keep it out of Atlas GA and ship it as a v1.1 fast-follow. Emily's two beta customers can pilot it early, and it keeps the Oct 14 date safe. Happy to walk engineering through the plan before Thursday."
  } else if (person) {
    to = w.mention(person.id)
    const first = firstName(person)
    body = topic
      ? `Hi ${first}! Quick one about ${topic}: could you share where things stand and anything you need from me? Happy to jump on a call if that's easier.`
      : `Hi ${first}! Do you have a few minutes today to sync? I'd love to hear where things stand on your side and whether anything is blocked.`
  } else if (channel) {
    to = w.ch(channel.name)
    body = topic
      ? `Hi team :wave: A quick update on ${topic}: we're on track, and I'll share details in the thread below. Questions welcome!`
      : channel.name === 'launch-atlas' && isNorthstar(w)
        ? "Hi team :wave: Launch update: load testing and security review are done, docs are at 80%, and I'm picking up the pricing page copy this week. Demo workspace lands Oct 7. We're on track for Oct 14 :rocket:"
        : `Hi team :wave: Sharing a quick update. Details in the thread, and questions are welcome!`
  } else {
    to = 'your message'
    body = topic ? `Here's a quick update on ${topic}: we're making good progress and I'll share more details soon.` : "Hi team :wave: Quick update: we're on track, and I'll share more details soon."
  }
  const target = person ? firstName(person) : channel ? `#${channel.name}` : 'your message'
  return {
    title: `Draft message to ${target}`,
    steps: DRAFT_STEPS,
    summary: { icon: 'edit', text: 'Drafted a message.' },
    text: [`Here's a draft for ${to}:`, '', `> ${body}`, '', 'Want me to make it shorter or change the tone?'].join('\n'),
    followUp: 'Make it shorter',
  }
}

function reviseDraft(q: string, last: Turn): Answer {
  const prior = /^> (.*)$/m.exec(last.answer ?? '')?.[1] ?? ''
  const toLine = /^Here's a draft for (.+?):/m.exec(last.answer ?? '')?.[1] ?? 'your message'
  let body = prior
  let note = ''
  if (/shorter|concise|brief|trim/.test(q)) {
    const sentences = prior.match(/[^.!?]+[.!?]+/g) ?? [prior]
    body = sentences.slice(0, 2).join(' ').trim()
    note = 'Trimmed it to the essentials.'
  } else if (/formal/.test(q)) {
    body = prior
      .replace(/^Hi (\w+)!/, 'Hello $1,')
      .replace(/let's/g, 'I suggest we')
      .replace(/Happy to/g, "I'd be glad to")
    note = 'Made it a little more formal.'
  } else {
    body = `${prior.replace(/[.!]$/, '')} :slightly_smiling_face:`
    note = 'Made it a bit warmer.'
  }
  return {
    title: last.title ?? 'Draft message',
    steps: [{ icon: 'edit', text: 'Revising the draft' }],
    summary: { icon: 'edit', text: 'Revised the draft.' },
    text: [`${note} Here's the new version for ${toLine}:`, '', `> ${body}`].join('\n'),
    followUp: 'Make it more formal',
  }
}

/** "Based on my activity in Slack, what animal would I be?" and "Surprise me" (the NUX prompts). */
function playful(q: string, w: Workspace): Answer {
  const mine = w.all().filter((x) => x.msg.userId === w.fx.me)
  const where = new Set(mine.map((x) => x.conv.id)).size
  if (/animal/.test(q)) {
    return {
      title: 'Your Slack spirit animal',
      steps: [
        { icon: 'ai-sparkle', text: 'Scoring your recent activity' },
        { icon: 'search', text: 'Read your recent messages' },
      ],
      summary: { icon: 'ai-sparkle', text: 'Looked at your recent activity.' },
      text: [
        `You'd be a *border collie* :dog:`,
        '',
        `• You've posted ${mine.length} ${mine.length === 1 ? 'message' : 'messages'} across ${where} ${where === 1 ? 'conversation' : 'conversations'} lately: always herding the team toward the goal`,
        '• You follow up, keep everyone on schedule and still find time to cheer people on',
        '',
        'High energy, loyal and very good at keeping the flock together.',
      ].join('\n'),
      followUp: 'What needs my attention today?',
    }
  }
  const pick = w.busiest()[0]
  return {
    title: 'A little surprise',
    steps: [{ icon: 'ai-sparkle', text: 'Thinking' }],
    summary: { icon: 'ai-sparkle', text: 'Thought about your request.' },
    text: [
      `Here's a fun one :tada:`,
      '',
      pick ? `${w.ch(pick.name)} is your workspace's busiest channel this week, with ${w.msgs(pick.id).length} messages.` : `${w.fx.workspace.name} has ${people(w.fx).length} people in it.`,
      `And a fact to go with it: octopuses have three hearts, which is roughly how many you need to keep up with Slack on a Monday.`,
    ].join('\n'),
    followUp: 'What happened in Slack this week?',
  }
}

// ------------------------------------------------------------------------------------------------
// The landing page's prompts (Discover, Create, Find, Brainstorm)

const docUrl = (fx: Fixture, id: string) => `https://${fx.workspace.domain}.slack.com/docs/${fx.workspace.id}/${id}`
const listUrl = (fx: Fixture, id: string) => `https://${fx.workspace.domain}.slack.com/lists/${fx.workspace.id}/${id}`
let artifactSeq = 0
const newFileId = () => `F0SB${Date.now().toString(36).toUpperCase().slice(-6)}${++artifactSeq}`

interface CalendarEvent {
  start: number
  end: number
  /** "10:30 – 11:00 AM" */
  when: string
  title: string
  detail: string
}

/** Today's events from a calendar app's agenda message ("*10:30 – 11:00 AM* · Atlas design review\nZoom · Sofia"). */
function agenda(w: Workspace): { events: CalendarEvent[]; conv?: Conversation; msg?: Message } {
  for (const conv of Object.values(w.fx.conversations)) {
    if (conv.type !== 'app') continue
    for (const msg of [...w.msgs(conv.id)].reverse()) {
      if (!/^your agenda for/i.test(msg.text)) continue
      const events: CalendarEvent[] = []
      for (const b of (msg.blocks ?? []) as { type?: string; text?: { text?: string } }[]) {
        const t = b.type === 'section' ? b.text?.text : undefined
        const m = t && /\*(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)\*\s*·\s*([^\n]+)\n?([^\n]*)/.exec(t)
        if (!m) continue
        const [, sh, sm, eh, em, mer, title, detail] = m
        const mins = (h: number, min: number, pm: boolean) => ((h % 12) + (pm ? 12 : 0)) * 60 + min
        const end = mins(+eh, +em, mer === 'PM')
        let start = mins(+sh, +sm, mer === 'PM')
        if (start > end) start = mins(+sh, +sm, false)
        events.push({ start, end, when: `${sh}:${sm} – ${eh}:${em} ${mer}`, title: title.trim(), detail: detail.trim() })
      }
      if (events.length) return { events: events.sort((a, b) => a.start - b.start), conv, msg }
    }
  }
  return { events: [] }
}

const clock = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
const duration = (mins: number) => (mins < 60 ? `${mins}m` : mins % 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins / 60}h`)

function calendar(w: Workspace, focus: boolean): Answer {
  const { events, conv, msg } = agenda(w)
  const steps = [
    { icon: 'calendar', text: 'Checked your calendar' },
    ...(focus ? [{ icon: 'clock', text: 'Looked for open time' }] : []),
  ]
  const summary = { icon: 'calendar', text: focus ? 'Checked your calendar for open time.' : 'Checked your calendar.' }
  if (!events.length)
    return {
      title: focus ? 'Focus time on your calendar' : 'Your calendar today',
      steps,
      summary,
      text: "I can't see a calendar for you yet. Connect Google Calendar or Outlook from the calendar app's *Home* tab, and I'll be able to check your schedule, find focus time and prep you for meetings.",
      followUp: 'What needs my attention today?',
    }
  const cite = conv && msg ? w.citeMsg(conv.id, msg) : ''
  if (focus) {
    const gaps: { start: number; end: number }[] = []
    let at = 9 * 60
    for (const e of events) {
      if (e.start - at >= 30) gaps.push({ start: at, end: e.start })
      at = Math.max(at, e.end)
    }
    if (18 * 60 - at >= 30) gaps.push({ start: at, end: 18 * 60 })
    const best = [...gaps].sort((a, b) => b.end - b.start - (a.end - a.start))[0]
    return {
      title: 'Focus time on your calendar',
      steps,
      summary,
      text: [
        `You have ${events.length} ${events.length === 1 ? 'meeting' : 'meetings'} today, so there's room for focus time${cite}:`,
        '',
        ...gaps.map((g) => `• *${clock(g.start)} – ${clock(g.end)}* (${duration(g.end - g.start)})`),
        '',
        best ? `The longest block is *${clock(best.start)} – ${clock(best.end)}*. Want me to hold it as focus time?` : '',
      ]
        .join('\n')
        .trim(),
      followUp: 'Brainstorm ways to optimize my calendar',
    }
  }
  const next = events[0]
  return {
    title: 'Your calendar today',
    steps,
    summary,
    text: [
      `Here's your day: ${events.length} ${events.length === 1 ? 'meeting' : 'meetings'}${cite}.`,
      '',
      ...events.map((e) => `• *${e.when}* · ${e.title}${e.detail ? ` (${e.detail})` : ''}`),
      '',
      `First up is *${next.title}*. Want talking points for it?`,
    ].join('\n'),
    followUp: 'Brainstorm talking points for my next meeting',
  }
}

function canDocuments(w: Workspace): Answer {
  const ch = w.busiest()[0]
  return {
    title: 'Creating documents with Slackbot',
    steps: [{ icon: 'ai-sparkle', text: 'Thinking' }],
    summary: { icon: 'ai-sparkle', text: 'Thought about your request.' },
    text: [
      'Yes! I can create canvases and lists for you, and fill them in from your conversations:',
      '',
      `• *Canvases*: meeting notes, project briefs, kickoff docs, weekly updates${ch ? ` (for example, a summary of ${w.ch(ch.name)})` : ''}`,
      '• *Lists*: task lists, trackers and checklists with owners and due dates',
      '• *Drafts*: messages, announcements and replies, ready for you to edit',
      '',
      'Try "Create a project kickoff document" to see one.',
    ].join('\n'),
    followUp: 'Create a project kickoff document',
  }
}

function canRemind(w: Workspace): Answer {
  const { events } = agenda(w)
  const example = events[0] ? `"Remind me 10 minutes before ${events[0].title}"` : '"Remind me to send the weekly update on Friday at 3pm"'
  return {
    title: 'Setting reminders',
    steps: [{ icon: 'ai-sparkle', text: 'Thinking' }],
    summary: { icon: 'ai-sparkle', text: 'Thought about your request.' },
    text: [
      "Yes. Tell me what and when, and I'll remind you right here in our DM. For example:",
      '',
      `• ${example}`,
      '• "Remind me tomorrow morning to follow up on this thread"',
      '• "Every Monday at 9am, remind me to review my goals"',
      '',
      'You can also save any message for later from its menu and set a reminder on it.',
    ].join('\n'),
    followUp: 'What needs my attention today?',
  }
}

function canSummarize(w: Workspace): Answer {
  const top = w.busiest().slice(0, 2)
  return {
    title: 'Summarizing conversations',
    steps: [{ icon: 'ai-sparkle', text: 'Thinking' }],
    summary: { icon: 'ai-sparkle', text: 'Thought about your request.' },
    text: [
      'Yes, I can catch you up on any channel, thread or DM you have access to:',
      '',
      ...top.map((c) => `• "Summarize ${w.ch(c.name)}"`),
      '• "What did I miss this week?"',
      '• "Recap this thread" (from the thread\'s menu)',
      '',
      "Summaries link back to the messages they're based on, so you can check the details.",
    ].join('\n'),
    followUp: top[0] ? `Summarize #${top[0].name}` : 'What happened in Slack this week?',
  }
}

interface OpenTask {
  title: string
  ownerId?: string
  due?: string
  status?: string
  list?: { id: string; title: string }
}

/** Open rows of the workspace's lists (not done), yours first, then by due date. */
function openTasks(w: Workspace): OpenTask[] {
  const out: OpenTask[] = []
  for (const list of Object.values(w.fx.lists ?? {})) {
    const text = list.columns.find((c) => c.type === 'text')
    const person = list.columns.find((c) => c.type === 'person')
    const status = list.columns.find((c) => c.type === 'select')
    const date = list.columns.find((c) => c.type === 'date')
    const check = list.columns.find((c) => c.type === 'checkbox')
    for (const row of list.rows) {
      const label = status ? status.options?.find((o) => o.id === row.cells[status.id])?.label : undefined
      if ((label && /done|complete/i.test(label)) || (check && row.cells[check.id] === 'true')) continue
      out.push({ title: text ? row.cells[text.id] : list.title, ownerId: person ? row.cells[person.id] : undefined, due: date ? row.cells[date.id] : undefined, status: label, list: { id: list.id, title: list.title } })
    }
  }
  const me = w.fx.me
  return out.sort((a, b) => Number(b.ownerId === me) - Number(a.ownerId === me) || (a.due ?? '9').localeCompare(b.due ?? '9'))
}

const shortDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function tasks(w: Workspace): Answer {
  const list = openTasks(w).slice(0, 6)
  const me = w.fx.me
  const steps = [
    { icon: 'lists', text: 'Checked your lists' },
    { icon: 'search', text: 'Looked for tasks assigned to you' },
  ]
  if (!list.length)
    return {
      title: 'Open tasks this week',
      steps,
      summary: { icon: 'lists', text: 'Checked your lists and tasks.' },
      text: "You don't have any open tasks in lists this week :relieved: Tasks assigned to you in lists and canvases will show up here.",
      followUp: 'What needs my attention today?',
    }
  const mine = list.filter((t) => t.ownerId === me)
  return {
    title: 'Open tasks this week',
    steps,
    summary: { icon: 'lists', text: `Found ${list.length} open ${list.length === 1 ? 'task' : 'tasks'}.` },
    text: [
      mine.length ? `You have ${mine.length} open ${mine.length === 1 ? 'task' : 'tasks'}, plus a few your team is working on:` : "Nothing is assigned to you yet, but here's what's open for your team:",
      '',
      ...list.map((t) => `• *${t.title}*${t.ownerId ? ` · ${t.ownerId === me ? 'you' : w.mention(t.ownerId)}` : ''}${t.due ? ` · due ${shortDate(t.due)}` : ''}${t.status ? ` · ${t.status}` : ''}`),
      '',
      list[0].list ? `They're from <${listUrl(w.fx, list[0].list.id)}|${list[0].list.title}>.` : '',
    ]
      .join('\n')
      .trim(),
    followUp: 'Create a task list for the week',
  }
}

function importantChannels(w: Workspace): Answer {
  const starred = w.fx.sections.find((s) => s.kind === 'stars')?.conversationIds.map((id) => w.fx.conversations[id]).filter((c): c is Conversation => !!c && (c.type === 'channel' || c.type === 'private')) ?? []
  const list = (starred.length ? starred : w.busiest().slice(0, 3)).slice(0, 4)
  const lines = list.flatMap((c) => {
    const m = [...w.msgs(c.id)].reverse().find((x) => x.subtype !== 'channel_join' && x.subtype !== 'huddle_thread')
    const unread = w.fx.unreads[c.id]?.count ?? 0
    return m ? [`• *${w.ch(c.name)}*${unread ? ` (${unread} new)` : ''}: ${m.userId === w.fx.me ? 'you' : w.mention(m.userId)} said "${gist(w.fx, m.text, 100)}"${w.citeMsg(c.id, m)}`] : []
  })
  return {
    title: "Today in your important channels",
    steps: [
      { icon: 'search', text: starred.length ? 'Read your starred channels' : 'Read your busiest channels' },
      { icon: 'search', text: 'Found latest messages' },
    ],
    summary: { icon: 'search', text: 'Searched channels and found latest messages.' },
    text: lines.length ? [`Here's what's happening in your ${starred.length ? 'starred' : 'most active'} channels:`, '', ...lines].join('\n') : 'Your important channels are quiet today.',
    followUp: list[0] ? `Summarize #${list[0].name}` : 'What happened in Slack this week?',
  }
}

function projectConversations(w: Workspace): Answer {
  const list = channels(w.fx)
  const project = list.find((c) => /launch|project|atlas/.test(c.name)) ?? w.busiest()[0]
  if (!project) return fallback('Find recent conversations about a project', w)
  const recent = [...w.msgs(project.id)]
    .filter((m) => m.subtype !== 'channel_join')
    .reverse()
    .slice(0, 4)
  return {
    title: `Recent conversations in #${project.name}`,
    steps: [
      { icon: 'search', text: 'Searched messages' },
      { icon: 'search', text: `Read #${project.name}` },
    ],
    summary: { icon: 'search', text: 'Searched channels and found latest messages.' },
    text: [
      `Here are the latest conversations in ${w.ch(project.name)}${project.topic ? ` (_${plain(w.fx, project.topic)}_)` : ''}:`,
      '',
      ...recent.map((m) => {
        const replies = w.replies(project.id, m.ts).length
        return `• ${m.userId === w.fx.me ? 'You' : w.mention(m.userId)}: ${gist(w.fx, m.text, 100)}${replies ? ` (${replies} ${replies === 1 ? 'reply' : 'replies'})` : ''}${w.citeMsg(project.id, m)}`
      }),
    ].join('\n'),
    followUp: `Summarize #${project.name}`,
  }
}

function brainstorm(q: string, w: Workspace): Answer {
  const steps = [
    { icon: 'ai-sparkle', text: 'Scoring your recent activity' },
    { icon: 'ai-sparkle', text: 'Brainstorming' },
  ]
  const summary = { icon: 'ai-sparkle', text: 'Brainstormed with your recent activity.' }
  const mine = openTasks(w).filter((t) => t.ownerId === w.fx.me)
  const top = w.busiest()
  if (/\bgoals?\b/.test(q)) {
    const goals = [
      ...mine.slice(0, 2).map((t) => `*Ship ${t.title.charAt(0).toLowerCase()}${t.title.slice(1)}*${t.due ? ` by ${shortDate(t.due)}` : ''}`),
      top[0] ? `*Get ${w.ch(top[0].name)} to inbox zero*: reply to open questions and close threads` : '',
      '*Block two focus sessions* for deep work',
      '*Share a weekly update* with your team on Friday',
    ].filter(Boolean)
    return {
      title: 'Goals for next week',
      steps,
      summary,
      text: ['Here are some goals for next week, based on what you have going on:', '', ...goals.slice(0, 5).map((g, i) => `${i + 1}. ${g}`), '', 'Want me to turn these into a task list?'].join('\n'),
      followUp: 'Create a task list for the week',
    }
  }
  if (/\b(talking points|meeting)\b/.test(q)) {
    const next = agenda(w).events[0]
    const related = next ? findChannel(w.fx, next.title.toLowerCase()) : undefined
    const recent = related ? [...w.msgs(related.id)].reverse().slice(0, 2) : []
    return {
      title: next ? `Talking points for ${next.title}` : 'Talking points for your next meeting',
      steps: [{ icon: 'calendar', text: 'Checked your calendar' }, ...steps.slice(1)],
      summary,
      text: [
        next ? `Your next meeting is *${next.title}* at ${clock(next.start)}. Some talking points:` : "I couldn't find your next meeting, but here are talking points that work for most syncs:",
        '',
        ...recent.map((m) => `• Follow up on ${w.mention(m.userId)}'s note: "${gist(w.fx, m.text, 80)}"${related ? w.citeMsg(related.id, m) : ''}`),
        '• What changed since the last sync, and what is blocked',
        '• Decisions you need from the group, with owners',
        '• Next steps and dates, recapped at the end',
      ].join('\n'),
      followUp: 'Create a meeting agenda template',
    }
  }
  if (/\bnames?\b/.test(q))
    return {
      title: 'Names for a new project',
      steps: steps.slice(1),
      summary,
      text: [
        `Here are some project names that would fit right in at ${w.fx.workspace.name}:`,
        '',
        '• *Lighthouse*: guides the way, easy to say',
        '• *Relay*: great for anything about handoffs and speed',
        '• *Keystone*: the piece everything else depends on',
        '• *Tailwind*: for work that makes everything else faster',
        '• *Compass*: points the team in one direction',
        '• *Basecamp*: a home for a big effort',
        '',
        'Tell me what the project is about and I can make these more specific.',
      ].join('\n'),
      followUp: 'Create a project kickoff document',
    }
  if (/\bcalendar\b/.test(q)) {
    const { events } = agenda(w)
    return {
      title: 'Ways to optimize your calendar',
      steps: [{ icon: 'calendar', text: 'Checked your calendar' }, ...steps.slice(1)],
      summary,
      text: [
        events.length ? `You have ${events.length} ${events.length === 1 ? 'meeting' : 'meetings'} today. A few ideas:` : 'A few ideas for a calmer calendar:',
        '',
        '• *Hold a focus block* every morning before your first meeting',
        '• *Batch short syncs* back to back, so the rest of the day stays open',
        '• *Swap status meetings for async updates* in a channel or canvas',
        '• *Default to 25 or 50 minutes* so there is time between meetings',
        '• *Use huddles* for quick questions instead of scheduling a call',
      ].join('\n'),
      followUp: 'Find gaps in my calendar for focus time',
    }
  }
  return {
    title: 'Ways to improve team communication',
    steps: steps.slice(1),
    summary,
    text: [
      'Here are some ideas to help your team communicate better:',
      '',
      '• *Use threads* for replies, so channels stay easy to scan',
      '• *Pin a canvas* in each project channel with goals, owners and links',
      '• *Post async updates* on a regular day instead of status meetings',
      '• *Huddle it out* when a thread gets long; post the decision back in the thread',
      `• *Agree on channel norms*${top[0] ? `, starting with ${w.ch(top[0].name)}` : ''}: what goes where, and expected response times`,
    ].join('\n'),
    followUp: 'Create a canvas to track project ideas',
  }
}

/** The Create prompts: an agentic answer that works through a plan, then makes a canvas or a list. */
function create(q: string, w: Workspace): Answer {
  const fx = w.fx
  const top = w.busiest()
  const recent = top.slice(0, 2).flatMap((c) => [...w.msgs(c.id)].reverse().slice(0, 3).map((m) => ({ c, m })))
  const wantsList = /\b(task list|list|tracker)\b/.test(q) && !/\bcanvas\b/.test(q)
  if (wantsList || /\btask\b/.test(q)) {
    const open = openTasks(w).filter((t) => t.ownerId === fx.me)
    const items = (open.length ? open.map((t) => ({ title: t.title, ownerId: fx.me, due: t.due })) : []).concat(
      recent.slice(0, Math.max(0, 5 - open.length)).map(({ c, m }) => ({ title: `Follow up in #${c.name}: ${gist(fx, m.text, 48)}`, ownerId: fx.me, due: undefined })),
    )
    const id = newFileId()
    const title = 'Tasks for the week'
    return {
      title: 'Task list for the week',
      steps: [
        { icon: 'lists', text: 'Checked your lists' },
        { icon: 'search', text: 'Looked for follow-ups in your conversations' },
        { icon: 'lists', text: 'Created a list' },
      ],
      summary: { icon: 'lists', text: 'Created a list.' },
      plan: {
        title: 'Creating your task list',
        tasks: [
          { title: 'Find your open tasks', details: `Checked ${Object.keys(fx.lists ?? {}).length || 'your'} lists and your recent conversations` },
          { title: 'Add owners and due dates' },
          { title: 'Create the list' },
        ],
      },
      artifact: { kind: 'list', id, title, items: items.length ? items : [{ title: 'Plan the week', ownerId: fx.me }] },
      text: [
        `I made you a list: *<${listUrl(fx, id)}|${title}>*, with ${Math.max(1, items.length)} ${items.length === 1 ? 'task' : 'tasks'} for the week, each assigned to you${items.some((i) => i.due) ? ' and due dates where they came with one' : ''}.`,
        '',
        ...items.slice(0, 5).map((i) => `• ${i.title}${i.due ? ` · due ${shortDate(i.due)}` : ''}`),
        '',
        'Check things off as you go, or ask me to add more.',
      ].join('\n'),
      followUp: 'Find gaps in my calendar for focus time',
    }
  }
  const id = newFileId()
  let title: string
  let lines: string[]
  let planTitle: string
  let first: { title: string; details?: string }
  if (/\bideas?\b/.test(q)) {
    title = 'Project ideas tracker'
    planTitle = 'Creating your project ideas canvas'
    first = { title: 'Gather ideas from your conversations', details: top.length ? `Read ${top.slice(0, 2).map((c) => `#${c.name}`).join(' and ')}` : undefined }
    lines = [
      'A running list of project ideas, where they came from and what happens next.',
      '# 💡 Ideas',
      ...recent.slice(0, 4).map(({ c, m }) => `[] ${gist(fx, m.text, 70)} (from <#${c.id}|${c.name}>)`),
      '[] Add your next idea here',
      '## 🧭 How we pick',
      '- Impact on customers',
      '- Effort and risk',
      '- Who wants to own it',
    ]
  } else if (/\bkickoff\b/.test(q)) {
    const ch = top.find((c) => /launch|project|atlas/.test(c.name)) ?? top[0]
    title = 'Project kickoff'
    planTitle = 'Creating your kickoff document'
    first = { title: 'Read the project channel', details: ch ? `Read #${ch.name}` : undefined }
    lines = [
      `${ch ? `Kickoff doc for the work in <#${ch.id}|${ch.name}>. ` : ''}Fill in anything I got wrong.`,
      '# 🎯 Goals',
      '- What success looks like',
      '- How we will measure it',
      '# 📦 Scope',
      '- In scope',
      '- Out of scope',
      '# 📅 Timeline',
      '1. Kickoff',
      '1. First review',
      '1. Launch',
      '# 👥 Team',
      `- *Owner:* <@${fx.me}>`,
      '# ⚠️ Risks and open questions',
      '[] Add risks here',
    ]
  } else if (/\bagenda\b/.test(q)) {
    title = 'Meeting agenda'
    planTitle = 'Creating your agenda template'
    first = { title: 'Pick a structure for the meeting' }
    lines = ['Copy this template for your next meeting.', '## 🗓️ Agenda', '1. Updates (5 min)', '1. Discussion (15 min)', '1. Decisions and next steps (5 min)', '## ✅ Action items', '[] ', '## 📝 Notes', '']
  } else if (/\breflection\b/.test(q)) {
    title = 'Weekly reflection'
    planTitle = 'Creating your weekly reflection'
    first = { title: 'Look back at your week', details: 'Read your recent messages' }
    const mine = w
      .all()
      .filter((x) => x.msg.userId === fx.me && x.conv.type !== 'app')
      .slice(0, 3)
    lines = [
      `Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      '## 🌟 What went well',
      ...(mine.length ? mine.map((x) => `- ${gist(fx, x.msg.text, 80)}`) : ['- ']),
      '## 🧗 What was hard',
      '- ',
      '## 📚 What I learned',
      '- ',
      '## ➡️ Next week',
      '[] ',
    ]
  } else {
    title = 'New canvas'
    planTitle = 'Creating your canvas'
    first = { title: 'Gather what you need' }
    lines = ['Start writing here.', '## Notes', '- ']
  }
  return {
    title: `Create: ${title}`,
    steps: [
      { icon: 'search', text: 'Searched information' },
      { icon: 'canvas-content', text: 'Drafted a canvas' },
    ],
    summary: { icon: 'canvas-content', text: 'Created a canvas.' },
    plan: { title: planTitle, tasks: [first, { title: 'Draft the canvas' }, { title: 'Share it with you' }] },
    artifact: { kind: 'canvas', id, title, lines },
    text: [`I created a canvas for you: *<${docUrl(fx, id)}|${title}>* :sparkles:`, '', `It's ready to edit, and only you can see it until you share it.`].join('\n'),
    followUp: 'Can you create documents for me?',
  }
}

function fallback(question: string, w: Workspace): Answer {
  const ch = w.busiest()[0]
  const a = people(w.fx)[0]
  const b = people(w.fx)[1] ?? a
  const text = [
    `I'm not sure I have enough context for that yet, but here's how I can help in ${w.fx.workspace.name}:`,
    '',
    `• *Catch you up* on a channel${ch ? `: "Summarize ${w.ch(ch.name)}"` : ''}`,
    `• *Find* messages and people${a ? `: "What is ${firstName(a)} working on?"` : ''}`,
    `• *Draft* messages in your voice${b ? `: "Draft a reply to ${firstName(b)}"` : ''}`,
    `• *Prioritize* your day: "What needs my attention today?"`,
  ].join('\n')
  return {
    title: provisionalTitle(question),
    steps: [{ icon: 'ai-sparkle', text: 'Thinking' }],
    summary: { icon: 'ai-sparkle', text: 'Thought about your request.' },
    text,
    followUp: 'What needs my attention today?',
  }
}

/** Every `<cite://C/TS>` in an answer, in order, deduped: the Sources sheet's messages. */
export function citationsOf(text: string): { conversationId: string; ts: string }[] {
  const out: { conversationId: string; ts: string }[] = []
  const seen = new Set<string>()
  for (const m of text.matchAll(/<cite:\/\/([A-Z0-9]+)\/([0-9.]+)>/g)) {
    const key = `${m[1]}/${m[2]}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ conversationId: m[1], ts: m[2] })
  }
  return out
}
