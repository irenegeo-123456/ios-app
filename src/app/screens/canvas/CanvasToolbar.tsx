import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'
import { Icon } from '../../../icons/Icon'
import { SKTextToolbar, type SKTextToolbarItem } from '../../../slackkit/SKTextToolbar'
import type { Formats } from './editor'

// The canvas editing toolbar (CanvasToolbarView.swift, the keyboard's inputAccessoryView; spec canvas-lists-creation.md
// §1.5): on iOS 26 a Liquid Glass capsule centered over the keyboard, 12 pt above it, at least 16 pt from the sides,
// holding a 16 pt spacer, an SKTextToolbar (36 pt items, 12 pt apart, contentPrimary icons) and a 16 pt spacer
// (CanvasToolbarView.swift:24-32, 64-86, 222-258, 354-364; CanvasPresenter.swift:663-708). Its items follow
// CanvasToolbarLayoutBuilder.swift:19-111: root [+ (drawn selected) · Aa · checklist · emoji · comment · reaction], the
// title section (all disabled but emoji), a selection [« · Aa · comment · reaction], comment-only [comment · reaction].

export type ToolbarAction = 'plusMenu' | 'formatting' | 'checklist' | 'emoji' | 'addComment' | 'reaction' | 'back'

/** Toolbar taps never take the focus from the canvas (the keyboard stays up). */
const keep = (e: ReactPointerEvent | ReactMouseEvent) => e.preventDefault()

const ICON = 'var(--dt_color_content_primary)'

/** CanvasToolbarItem.ButtonId / SectionStyleId icons and VoiceOver labels (CanvasToolbarItem.swift:63-260) */
const ITEMS: Record<Exclude<ToolbarAction, 'back'>, { icon: string; label: string }> = {
  plusMenu: { icon: 'plus', label: 'Attach photos and videos' }, // attach_photos_and_videos (yaml:2160)
  formatting: { icon: 'formatting', label: 'Formatting' }, // formatting_a11y (yaml:6898)
  checklist: { icon: 'checkbox', label: 'Checklist text formatting' }, // checklist_formatting (yaml:3804)
  emoji: { icon: 'emoji', label: 'Emoji Picker' }, // emoji_picker (yaml:5828)
  addComment: { icon: 'add_comment', label: 'Add Comment' }, // add_comment (yaml:683)
  reaction: { icon: 'add_reaction', label: 'Add Reaction' }, // add_reaction (yaml:791)
}

const item = (id: Exclude<ToolbarAction, 'back'>, state: { selected?: boolean; enabled?: boolean } = {}): SKTextToolbarItem => ({
  id,
  icon: ITEMS[id].icon,
  iconColor: ICON,
  voiceoverText: ITEMS[id].label,
  isSelected: !!state.selected,
  isEnabled: state.enabled ?? true,
  // canvas items bounce when pressed (CanvasPresenter.swift:680, 692, 704)
  disableAnimations: false,
})

export function CanvasToolbar({ formats, commentOnly, onAction }: { formats: Formats; commentOnly?: boolean; onAction: (a: ToolbarAction) => void }) {
  let items: SKTextToolbarItem[]
  const range = !commentOnly && formats.ranged
  if (commentOnly) items = [item('addComment'), item('reaction')]
  else if (range) items = [item('formatting'), item('addComment'), item('reaction')]
  else {
    const t = formats.inTitle
    // "+" is `.all` (selected and enabled) outside the title, for its blue background (LB:95-97)
    items = [
      item('plusMenu', t ? { enabled: false } : { selected: true }),
      item('formatting', { enabled: !t }),
      item('checklist', { enabled: !t }),
      item('emoji'),
      item('addComment', { enabled: !t }),
      item('reaction', { enabled: !t }),
    ]
  }
  // SKTextToolbar's width is n × 36 + n × (spacing − 1): the last item has 6 pt after it (SKTextToolbar.swift:109-144)
  const width = items.length * 36 + items.length * (12 - 1)
  return (
    <div className="cv-toolbar" onPointerDown={keep} onMouseDown={keep} data-no-drag>
      <div className="cv-toolbar__glass glass" role="toolbar">
        {range && (
          // the range layout's back button: svgCaretLeftDoubleFull, contentPrimary, no circle; "Dismiss formatting
          // toolbar" (dismiss_formatting_toolbar, yaml:5140) (CanvasToolbarView.swift:409-432)
          <button type="button" className="cv-toolbar__back" aria-label="Dismiss formatting toolbar" onClick={() => onAction('back')} data-tap>
            <Icon name="caret_left_double_full" size={20} color={ICON} />
          </button>
        )}
        <SKTextToolbar sections={[{ items }]} backgroundColor="transparent" itemSpacing={12} onSelectedItem={(id) => onAction(id as ToolbarAction)} style={{ width }} />
      </div>
    </div>
  )
}
