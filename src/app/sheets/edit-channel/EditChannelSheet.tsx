import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import { Icon } from '../../../icons/Icon'
import { SheetBar } from '../ui/SheetBar'
import { showSnackbar } from '../../ui/Toast'
import { isChannel, useDismissIfMissing } from '../shared'
import './edit-channel.css'

// Edit Channel (EditChannelRoute, presentationStyle .modal; EC = Modules/Features/EditChannel/Implementation). A grouped
// table on sk_foreground_min_solid: "Name" — "#" and the name, a clear button while editing, the rule "Names must be
// lowercase, without spaces or periods, and can’t be longer than 80 characters." under it (red when it's wrong) —
// "Current Topic" (placeholder "Add a topic") and "Description" ("Set a description"), 200 pt text areas
// (EC/EditChannelViewController.swift:56-62, 114-165, 233-374; EditChannelNameCell.swift; EditChannelTopicCell.swift;
// September 2026 source, 14b3cbaf).
// Editing a field switches the bar to "Cancel" / "Save" (Lato 17 / Lato Bold 17 in sk_highlight, Save greyed until
// something changed) and titles it "Edit Name", "Edit Topic" or "Edit Description" (EditChannelViewModel.swift:91-103).
// Saving a new name shows "Channel renamed to #name" in a snackbar, then the sheet closes (:211-277). DMs and group DMs
// only have a topic.
//
//   presentSheet('edit-channel', { conversationId, focus?: 'name' | 'topic' | 'description' })

type Field = 'name' | 'topic' | 'description'
const TITLES: Record<Field, string> = { name: 'Edit Name', topic: 'Edit Topic', description: 'Edit Description' }
/** ChannelPropertiesClientSideValidationRules.maxCharactersInChannelName (ChannelNameUtility.swift:13) */
const MAX_NAME = 80
const RULE = `Names must be lowercase, without spaces or periods, and can’t be longer than ${MAX_NAME} characters.`

export function EditChannelSheet({ conversationId, focus }: { sheetKey: string; conversationId: string; focus?: Field }) {
  const sheet = useSheet()
  const conv = useApp((s) => s.fx.conversations[conversationId])
  const [data, setData] = useState({ name: conv?.name ?? '', topic: conv?.topic ?? '', description: conv?.description ?? '' })
  const [editing, setEditing] = useState<Field | null>(null)
  // Presented modally, the sheet keeps Cancel as its left item once you've edited: exitEditMode only restores the
  // close button in a navigation stack (EditChannelViewController.swift:184-190); Cancel then dismisses (:210-224)
  const [edited, setEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refs = { name: useRef<HTMLInputElement>(null), topic: useRef<HTMLTextAreaElement>(null), description: useRef<HTMLTextAreaElement>(null) }
  useEffect(() => {
    if (!focus) return
    // becomeFirstResponder puts the caret at the end
    const t = setTimeout(() => {
      const el = refs[focus].current
      el?.focus()
      el?.setSelectionRange(el.value.length, el.value.length)
    }, 450)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useDismissIfMissing(!conv)
  if (!conv) return null
  const channel = isChannel(conv)
  const original = { name: conv.name, topic: conv.topic ?? '', description: conv.description ?? '' }
  const changed = data.name !== original.name || data.topic !== original.topic || data.description !== original.description

  const cancel = () => {
    // cancelEdits: in edit mode, drop the changes and leave edit mode (EditChannelViewController.swift:210-215)
    setData(original)
    setError(null)
    setEditing(null)
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  }
  const save = () => {
    const s = useApp.getState()
    // saveName: spaces become dashes; empty or invalid names keep the sheet open with the error (EditChannelViewModel.swift:241-277, 316-319)
    const name = data.name.trim().replace(/ /g, '-')
    if (channel && name !== original.name) {
      if (!name) return fail('Name cannot be empty')
      if (name.length > MAX_NAME) return fail(RULE)
      if (/[A-Z.]/.test(name) || !/^[\p{L}\p{N}_-]+$/u.test(name)) return fail('Channel names must be lowercase, and can’t contain spaces, periods, or most punctuation.')
    }
    s.editConversation(conversationId, channel ? { name, topic: data.topic, description: data.description } : { topic: data.topic })
    if (channel && name !== original.name) {
      // "Channel renamed to #name" / "Private channel renamed to 🔒name" with the name in bold (EditChannelViewModel.swift:378-394)
      showSnackbar(
        <>
          {conv.type === 'private' ? 'Private channel renamed to ' : 'Channel renamed to '}
          <b>{`${conv.type === 'private' ? '' : '#'}${name}`}</b>
        </>,
      )
    }
    sheet?.dismiss()
  }
  const fail = (message: string) => {
    setError(message)
    setEditing('name')
    refs.name.current?.focus()
  }
  const begin = (f: Field) => {
    setEditing(f)
    setEdited(true)
  }

  return (
    <div className="ec">
      <SheetBar
        title={editing ? TITLES[editing] : 'Edit Channel'}
        // Cancel Lato 17, Save Lato Bold 17, both highlight1.content; Save disabled contentTertiary
        // (EditChannelViewController.swift:136-142; June used sk_highlight and sk_foreground_high_solid)
        leading={editing || edited ? { title: 'Cancel', onClick: editing ? cancel : () => sheet?.dismiss(), weight: 'regular', color: 'var(--dt_color_content_highlight_1)' } : 'close'}
        onClose={() => sheet?.dismiss()}
        trailing={editing ? { title: 'Save', onClick: save, disabled: !changed, weight: 'bold', color: 'var(--dt_color_content_highlight_1)', disabledColor: 'var(--dt_color_content_tertiary)' } : undefined}
      />
      <div className="ec__list ios-scroll">
        {channel && (
          <section>
            <div className="ec-header">Name</div>
            <div className="ec-cell ec-cell--name">
              {/* "#" in body contentTertiary, 15 from the edge, 8 to the field (EditChannelNameCell.swift:21-32, 123-126) */}
              <span className="ec-cell__hash">{conv.type === 'private' ? <Icon name="lock" size={16} /> : '#'}</span>
              <input
                ref={refs.name}
                className="ec-cell__input"
                value={data.name}
                placeholder="Name"
                aria-label="Edit channel name"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                onFocus={() => begin('name')}
                onChange={(e) => {
                  setError(null)
                  setData({ ...data, name: e.target.value })
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              {editing === 'name' && data.name && (
                <button type="button" className="ec-cell__clear" aria-label="Clear Text" onMouseDown={(e) => e.preventDefault()} onClick={() => setData({ ...data, name: '' })}>
                  <Icon name="close_filled" size={20} />
                </button>
              )}
            </div>
            <div className={`ec-footer${error ? ' is-error' : ''}`}>{error ?? RULE}</div>
          </section>
        )}
        <section>
          <div className="ec-header">Current Topic</div>
          <div className="ec-cell ec-cell--text">
            <textarea ref={refs.topic} className="ec-cell__area" value={data.topic} placeholder="Add a topic" aria-label="Current Topic" onFocus={() => begin('topic')} onChange={(e) => setData({ ...data, topic: e.target.value })} />
          </div>
        </section>
        {channel && (
          <section>
            <div className="ec-header">Description</div>
            <div className="ec-cell ec-cell--text">
              <textarea ref={refs.description} className="ec-cell__area" value={data.description} placeholder="Set a description" aria-label="Description" onFocus={() => begin('description')} onChange={(e) => setData({ ...data, description: e.target.value })} />
            </div>
          </section>
        )}
        <div className="ec__end" />
      </div>
    </div>
  )
}
