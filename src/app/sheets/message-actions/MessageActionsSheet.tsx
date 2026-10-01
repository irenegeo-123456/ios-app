import { useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { useDevice } from '../../../sim/store'
import { Icon } from '../../../icons/Icon'
import { Emoji } from '../../../emoji/Emoji'
import { SKButton } from '../../../slackkit/SKButton'
import { RowIcon, SKEntityRow, SKListFooter } from '../../../slackkit/SKEntity'
import { showActionSheet } from '../ui/Alert'
import { toast } from '../../ui/Toast'
import { copyText, findMessage, frequentEmoji, messageElement, openOrToast, openRegistered, permalink, plainText } from '../shared'
import './message-actions.css'

// Message actions: the sheet a long press on a message opens (spec sheets-menus.md §1; MA/ =
// Modules/Features/MessageActions/Implementation/). Sections (MessageActionsPresenter.swift:41-149): quick reactions
// (8 pt blank above) → Reply · Forward · Save (8 pt blank above) → main actions (hairline below) → copy actions (8 pt
// blank above, hairline below) → More Actions, collapsed (hairline below) → Delete (8 pt blank above). The last
// section has no footer. Presented as Slack's SKBottomSheet hugging its content (MA/MessageActionsFeature.swift:80-99;
// the native self-sized sheet with bottomsheetMigration, still off in September 2026).
// Every row is an S generic row: a 20 pt contentPrimary icon, the label in body 17, wrapping allowed.

interface Props {
  sheetKey: string
  conversationId: string
  ts: string
  /** set inside a thread: the thread's parent (context .messageThread) */
  threadTs?: string
}

export function MessageActionsSheet({ conversationId, ts, threadTs }: Props) {
  const sheet = useSheet()
  const device = useDevice()
  const s = useApp()
  const msg = findMessage(s, conversationId, ts, threadTs)
  const conv = s.fx.conversations[conversationId]
  const [moreOpen, setMoreOpen] = useState(false)
  if (!msg || !conv) return <div style={{ padding: 24, font: 'var(--sk-body)' }}>This message is gone.</div>

  const key = `${conversationId}/${ts}`
  const mine = msg.userId === s.fx.me
  const inThread = !!threadTs
  const isReply = inThread && threadTs !== ts
  const isDm = conv.type === 'im' || conv.type === 'mpim' || conv.type === 'app'
  const author = s.fx.users[msg.userId]
  const isSlackbotReply = !!author?.isBot && author.name === 'Slackbot'
  const saved = s.saved.includes(key) || (s.fx.later ?? []).some((l) => l.conversationId === conversationId && l.ts === ts && l.status !== 'completed' && l.status !== 'archived')
  const pinned = !!msg.pinnedBy
  const hasText = !!msg.text.trim()
  // Reply notifications: you follow threads you started or replied in, unless you've switched it (§1.6).
  const root = inThread ? findMessage(s, conversationId, threadTs!) : msg
  const followKey = `${conversationId}/${root?.ts ?? ts}`
  const following = s.following[followKey] ?? (!!root && (root.userId === s.fx.me || (root.replyUsers ?? []).includes(s.fx.me)))

  /** Every action dismisses the sheet (MA/MessageActionsInteractor.swift:303-535): data changes happen right away… */
  const now = (fn: () => void) => {
    fn()
    sheet?.dismiss()
  }
  /** …and anything that presents or navigates waits for the sheet to go (MA/MessageActionsFeature.swift:322-445). */
  const done = (fn?: () => void) => sheet?.dismiss(fn)

  // ---- quick reactions (QR/QuickReactionsView.swift): n = min(floor((width − 24) / 56), 15) slots, the last one
  // "add reaction"; cells 48 × 48, justified across the row.
  const slots = Math.min(Math.floor((device.width - 24) / 56), 15)
  const emoji = frequentEmoji(s, slots - 1)

  // ---- rows, per MA/MessageActionsPresenter.swift:232-433 with the conditions of MA/Message+ActionConditionals.swift
  const main: Row[] = []
  if (!isSlackbotReply) main.push({ id: 'mark_unread', icon: 'mark_as_unread', text: 'Mark Unread', run: () => now(() => s.markUnread(conversationId, ts)) })
  main.push({
    id: 'remind',
    icon: 'clock',
    text: 'Remind Me',
    run: () =>
      done(() => {
        // TasksCustomReminderRoute (MA/MessageActionsFeature.swift:331-346), if an area registered it.
        if (!openRegistered(['set-reminder', 'tasks-custom-reminder', 'reminder'], { conversationId, ts, threadTs })) remindMeSheet(conversationId, ts)
      }),
  })
  if (!isSlackbotReply)
    main.push({
      id: 'follow',
      icon: following ? 'notifications_off' : 'notifications',
      text: following ? "Don't Get Reply Notifications" : 'Get Reply Notifications', // dont_get_reply_notifications, yaml:5393 (ASCII apostrophe)
      run: () => now(() => s.setFollowing(conversationId, root?.ts ?? ts, !following)),
    })
  // Ask Slackbot (ask_slackbot, svgSlackbotColor) after Follow, before Edit, whenever Slackbot AI is available and this
  // isn't the Slackbot DM — no flag since June (`slackbotModal` is gone); it replaces Explain Message (September 2026:
  // MessageActionsPresenter.swift:253-255, 611-612; Message+ActionConditionals.swift:807-821). It opens Slackbot
  // (MessageActionsInteractor.swift:472-473).
  if (conv?.userId !== 'USLACKBOT')
    main.push({ id: 'slackbot', icon: 'slackbot_color', text: 'Ask Slackbot', run: () => done(() => useApp.getState().push({ screen: 'slackbot' })) })
  if (mine)
    main.push({
      id: 'edit',
      icon: 'edit',
      text: 'Edit Message',
      // the composer on screen picks it up (src/app/composer; MA/MessageActionsInteractor.swift:476-479)
      run: () => done(() => useApp.getState().setEditing({ conversationId, ts, threadTs: isReply ? threadTs : undefined })),
    })

  const copy: Row[] = [
    {
      id: 'copy_link',
      icon: 'link',
      text: 'Copy Link to Message',
      run: () =>
        now(() => {
          copyText(permalink(s.fx, conversationId, ts, threadTs))
          // "Link copied" with toast_checkmark (CopyPasteHandler.swift:251-273)
          toast({ text: 'Link copied', image: 'toast_checkmark' })
        }),
    },
  ]
  if (hasText)
    copy.push({
      id: 'copy_text',
      icon: 'text',
      text: 'Copy Message',
      run: () =>
        now(() => {
          copyText(plainText(s.fx, msg.text))
          toast({ text: 'Copied', image: 'toast_checkmark' })
        }),
    })

  const more: Row[] = []
  // Send reply to channel: your own thread reply (MA/Message+ActionConditionals.swift:194-223)
  if (isReply && mine)
    more.push({
      id: 'broadcast',
      icon: 'channel_arrow_left',
      text: isDm ? 'Send Reply to This Conversation' : 'Send Reply to This Channel',
      run: () => now(() => s.sendMessage(conversationId, msg.text, threadTs, { alsoSendToChannel: true })),
    })
  more.push({
    id: 'pin',
    icon: 'pin',
    text: pinned ? 'Unpin from Channel' : 'Pin to Channel',
    run: () =>
      now(() => {
        s.togglePin(conversationId, ts)
        // MA/MessageActionHandlingHelper.swift:347-362
        toast({ text: pinned ? 'Pinned item removed' : 'Pinned item added', image: 'toast_checkmark' })
      }),
  })
  if (hasText) more.push({ id: 'select_text', icon: 'select_text', text: 'Select Text', run: () => done(() => openOrToast(['select-text', 'text-copying'], { conversationId, ts, threadTs })) })

  const deleteRow: Row | null = mine
    ? {
        id: 'delete',
        icon: 'trash',
        text: 'Delete Message',
        destructive: true,
        run: () => done(() => confirmDelete(conversationId, ts, threadTs)),
      }
    : null

  const sections: ReactNode[] = []
  sections.push(
    <div key="qr" className="ma-section">
      <div className="ma-blank" />
      <div className="ma-reactions" style={{ ['--slots' as string]: slots } as CSSProperties}>
        {emoji.map((name) => (
          <button
            key={name}
            type="button"
            className="ma-reaction"
            aria-label={`Add ${name} emoji as reaction`}
            // adds the reaction and dismisses (QR/QuickReactionsView.swift:184-195); one you've already added comes off
            onClick={() => now(() => s.toggleReaction(conversationId, ts, name))}
            data-tap
          >
            <span className="ma-reaction__circle" />
            <Emoji name={name} size={24} />
          </button>
        ))}
        <button type="button" className="ma-reaction" aria-label="Add Reaction" onClick={() => done(() => useApp.getState().presentSheet('emoji-picker', { conversationId, ts, threadTs }))} data-tap>
          <span className="ma-reaction__circle" />
          <Icon name="add_reaction" size={24} className="ma-reaction__add" />
        </button>
      </div>
    </div>,
  )
  sections.push(
    <div key="buttons" className="ma-section">
      <div className="ma-blank" />
      <div className="ma-buttons">
        {!inThread && <SKButton title="Reply" icon="threads" iconPosition="top" buttonStyle="quickAction" size="messageActionsPrimaryButton" onClick={() => done(() => s.openThread(conversationId, msg.threadTs && msg.threadTs !== msg.ts ? msg.threadTs : ts))} />}
        <SKButton title="Forward" icon="share_message" iconPosition="top" buttonStyle="quickAction" size="messageActionsPrimaryButton" onClick={() => done(() => openOrToast(['forward', 'forward-message', 'share-message'], { conversationId, ts, threadTs }))} />
        <SKButton
          title={saved ? 'Saved' : 'Save'}
          icon={saved ? 'bookmark_filled' : 'bookmark'}
          iconPosition="top"
          buttonStyle="quickAction"
          isSelected={saved}
          size="messageActionsPrimaryButton"
          onClick={() => now(() => s.toggleSaved(conversationId, ts))}
        />
      </div>
    </div>,
  )
  if (main.length) sections.push(<RowSection key="main" rows={main} />)
  sections.push(<RowSection key="copy" rows={copy} blankAbove />)
  sections.push(
    <div key="more" className="ma-section">
      <button type="button" className="ma-more" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} data-tap-fade>
        <Icon name="ellipsis_horizontal_filled" size={20} />
        <span className="ma-more__title">More Actions</span>
        <Icon name="caret_down_full" size={20} className={`ma-more__caret${moreOpen ? '' : ' is-collapsed'}`} />
      </button>
      {moreOpen && more.map((r) => <ActionRow key={r.id} row={r} />)}
    </div>,
  )
  if (deleteRow) sections.push(<RowSection key="delete" rows={[deleteRow]} blankAbove />)

  // Footers: hairlines under main, copy and More Actions — never under the last section (SKList.swift:2128-2131).
  const hairlineAfter = new Set(['main', 'copy', 'more'])
  return (
    <div className="ma-sheet" data-qa="message_actions">
      {sections.map((sec, i) => {
        const k = (sec as { key: string }).key
        return (
          <div key={k} className="ma-group">
            {sec}
            {hairlineAfter.has(k) && i < sections.length - 1 && <SKListFooter />}
          </div>
        )
      })}
    </div>
  )
}

interface Row {
  id: string
  icon: string
  text: string
  destructive?: boolean
  run: () => void
}

function RowSection({ rows, blankAbove }: { rows: Row[]; blankAbove?: boolean }) {
  return (
    <div className="ma-section">
      {blankAbove && <div className="ma-blank" />}
      {rows.map((r) => (
        <ActionRow key={r.id} row={r} />
      ))}
    </div>
  )
}

function ActionRow({ row }: { row: Row }) {
  return (
    <SKEntityRow
      ornament={<RowIcon name={row.icon} />}
      title={row.text}
      lines={3}
      onClick={row.run}
      className={row.destructive ? 'ma-row--destructive' : undefined}
      data-qa={`message_action_${row.id}`}
    />
  )
}

/**
 * "Are you sure you want to delete this message? This cannot be undone." and the message in quotes, cut at 200
 * characters with "…" (MA/MessageActionHandlingHelper.swift:484-519), as an action sheet by the message.
 */
export function confirmDelete(conversationId: string, ts: string, threadTs?: string) {
  const s = useApp.getState()
  const msg = findMessage(s, conversationId, ts, threadTs)
  if (!msg) return
  let text = 'Are you sure you want to delete this message? This cannot be undone.'
  const clean = plainText(s.fx, msg.text).trim()
  if (clean) text += `\n\n"${clean.length > 200 ? `${clean.slice(0, 200)}…` : clean}"`
  showActionSheet({
    title: text,
    anchor: messageElement(ts),
    actions: [
      { title: 'Delete Message', style: 'destructive', onPress: () => useApp.getState().deleteMessage(conversationId, ts) },
      { title: 'Cancel', style: 'cancel' },
    ],
  })
}

/**
 * Remind Me, when no area has registered the Later reminder picker: the native action sheet of §1.8
 * (MA/MessageActionHandlingHelper.swift:185-239). Choosing a time saves the message with that due date.
 */
function remindMeSheet(conversationId: string, ts: string) {
  const at = () => () => {
    const s = useApp.getState()
    if (!s.saved.includes(`${conversationId}/${ts}`)) s.toggleSaved(conversationId, ts)
    // "Reminder Added" (15273)
    toast({ text: 'Reminder Added', image: 'toast_checkmark' })
  }
  showActionSheet({
    message: 'When would you like to be reminded?',
    actions: [
      { title: 'In 20 Minutes', onPress: at() },
      { title: 'In 1 Hour', onPress: at() },
      { title: 'In 3 Hours', onPress: at() },
      { title: 'Tomorrow', onPress: at() },
      { title: 'Next Week', onPress: at() },
      { title: 'Custom', onPress: at() },
      { title: 'Cancel', style: 'cancel' },
    ],
  })
}
