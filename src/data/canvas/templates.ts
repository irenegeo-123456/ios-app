import type { CanvasBlock } from '../types'
import { esc, mrkdwnToHtml, newId, type InlineCtx } from './model'

// The "Get Started" options Slack shows on an empty canvas (live bundle: CanvasTemplateOptions), and the
// content each template drops in. Lines use a tiny markup: "# "…"### ", "- ", "1. ", "[] "/"[x] ", "> ",
// "---", "```code" (\n for more lines), "@message:CHANNEL/TS", "@file:FILE_ID", else a paragraph (mrkdwn).

export const TEMPLATE_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'blank_page', label: 'Blank canvas', icon: 'canvas-content' },
  { key: 'EmployeeOnboardingTemplate', label: 'Employee onboarding', icon: 'heart' },
  { key: 'MonthlyNewsletterTemplate', label: 'Newsletter', icon: 'megaphone' },
  { key: 'ChannelOverviewTemplate', label: 'Channel overview', icon: 'rocket' },
  { key: 'WeeklySyncTemplate', label: 'Weekly sync', icon: 'calendar' },
  { key: 'AgendaTemplate', label: 'Agenda', icon: 'checkbox' },
  { key: 'SharedResourcesTemplate', label: 'Shared resources', icon: 'link' },
  { key: 'OOOCoveragePlanTemplate', label: 'Out of office coverage', icon: 'notifications-off' },
]

const TEMPLATES: Record<string, { title: string; lines: string[] }> = {
  EmployeeOnboardingTemplate: {
    title: 'Employee Onboarding',
    lines: [
      "Welcome [name]! We're happy you're here.",
      '# ✅ Your First Week Tasks',
      'Make sure to complete these tasks by the end of the week.',
      '[] Set up your laptop and accounts',
      '[] Meet your onboarding buddy',
      '[] Read the team handbook',
      '# 👥 Your Onboarding Buddies',
      'Your onboarding buddies are here for questions about processes, recurring meetings, and more.',
    ],
  },
  MonthlyNewsletterTemplate: {
    title: 'Monthly Newsletter',
    lines: ['# 👋 Hello team', "Welcome to this month's newsletter! Here's what happened across the company.", '## 🎉 Wins', '- ', '## 📅 Coming up', '- '],
  },
  ChannelOverviewTemplate: {
    title: 'Channel Overview',
    lines: ['## 📌 About this channel', 'What this channel is for, and who should be here.', '## 👥 Points of contact', '- ', '## 🔗 Resources', '- ', '## ✅ Channel norms', '- Use threads to keep conversations tidy'],
  },
  WeeklySyncTemplate: {
    title: 'Weekly Sync',
    lines: ['## 🗓️ Agenda', '- ', '## ✅ Action items', '[] ', '## 📝 Notes', ''],
  },
  AgendaTemplate: {
    title: 'Agenda',
    lines: ['## 🎯 Goals', '- ', '## 🗣️ Topics', '1. ', '## ✅ Next steps', '[] '],
  },
  SharedResourcesTemplate: {
    title: 'Shared Resources',
    lines: ['## 📚 Docs', '- ', '## 🛠️ Tools', '- ', '## 📎 Links', '- '],
  },
  OOOCoveragePlanTemplate: {
    title: 'Out of Office Coverage Plan',
    lines: ['## ⛱️ OOO Details', '*Dates offline:* Add your dates here', '*Availability:* Will you be completely off the grid?', '---', '## 📝 Project Coverage', '*Project Name*', '- Point of contact:'],
  },
}

/** Builds canvas blocks from the tiny line markup. */
export function blocksFromLines(lines: string[], ctx: InlineCtx): CanvasBlock[] {
  const blocks: CanvasBlock[] = []
  const push = (b: CanvasBlock) => {
    const last = blocks[blocks.length - 1]
    if (last && 'items' in last && 'items' in b && last.type === b.type) last.items.push(...b.items)
    else blocks.push(b)
  }
  for (const line of lines) {
    const m = /^(#{1,3}) (.*)$/.exec(line)
    const embed = /^@(message|file):(\S+)$/.exec(line)
    if (embed) {
      const [conversationId, ts] = embed[2].split('/')
      push(embed[1] === 'message' ? { id: newId(), type: 'message', conversationId, ts } : { id: newId(), type: 'file', fileId: embed[2] })
    } else if (line.startsWith('```')) push({ id: newId(), type: 'code', html: line.slice(3).split('\n').map(esc).join('<br>') })
    else if (m) push({ id: newId(), type: (['h1', 'h2', 'h3'] as const)[m[1].length - 1], html: mrkdwnToHtml(m[2], ctx) })
    else if (line === '---') push({ id: newId(), type: 'hr' })
    else if (/^\[[ x]?\] ?/.test(line)) push({ id: newId(), type: 'checklist', items: [{ id: newId(), html: mrkdwnToHtml(line.replace(/^\[[ x]?\] ?/, ''), ctx), checked: line.startsWith('[x]') || undefined }] })
    else if (/^- ?/.test(line) && (line === '-' || line.startsWith('- '))) push({ id: newId(), type: 'bullet', items: [{ id: newId(), html: mrkdwnToHtml(line.slice(2), ctx) }] })
    else if (/^\d+\. ?/.test(line)) push({ id: newId(), type: 'ordered', items: [{ id: newId(), html: mrkdwnToHtml(line.replace(/^\d+\. ?/, ''), ctx) }] })
    else if (line.startsWith('> ')) push({ id: newId(), type: 'quote', html: mrkdwnToHtml(line.slice(2), ctx) })
    else push({ id: newId(), type: 'p', html: mrkdwnToHtml(line, ctx) })
  }
  return blocks
}

export function templateContent(key: string, ctx: InlineCtx): { title: string; blocks: CanvasBlock[] } | null {
  const t = TEMPLATES[key]
  if (!t) return null
  return { title: t.title, blocks: blocksFromLines(t.lines, ctx) }
}
