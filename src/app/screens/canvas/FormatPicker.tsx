import { useEffect, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { useDevice } from '../../../sim/store'
import { Icon } from '../../../icons/Icon'
import { SKButton } from '../../../slackkit/SKButton'
import { useCanvasEditing } from './state'
import type { Formats, InlineMark, SectionStyle } from './editor'
import '../../sheets/ui/sheet-bar.css'

// The format picker the toolbar's Aa opens on iPhone (CanvasFormatPicker; spec canvas-lists-creation.md §1.6): a native
// sheet with one fixed 340 pt detent, no grabber, undimmed — the canvas stays visible and live above it — and no swipe to
// dismiss, in a navigation controller titled "Format" with a close button (CanvasFormatPickerFeature.swift:23-70,
// CanvasFormatPickerViewController.swift:140-166). The keyboard and its toolbar hide while it's up; the caret stays.
// Rows (CanvasFormatPickerPresenter.swift:36-89): the headings (scrollable labels in their own fonts), B I U S, the lists,
// then quote · code · link and indent · outdent, as segmented controls. Taps apply at once; link closes the sheet and
// opens the link editor.
//
//   presentSheet('canvas-format', { onLink })        (the canvas screen does)

const keep = (e: ReactPointerEvent | ReactMouseEvent) => e.preventDefault()

/** the sheet's detent (Constants.sheetDetentHeight, CanvasFormatPickerFeature.swift:25) */
const DETENT = 340

type ButtonId = InlineMark | SectionStyle | 'link' | 'indent' | 'outdent'

/** icons and VoiceOver labels (CanvasToolbarItem.swift:72-243) */
const BUTTONS: Record<Exclude<ButtonId, 'p' | 'h1' | 'h2' | 'h3'>, { icon: string; label: string }> = {
  bold: { icon: 'bold', label: 'Bold text formatting' }, // bold_formatting (yaml:2348)
  italic: { icon: 'italic', label: 'Italics text formatting' }, // italics_formatting (yaml:9562)
  underline: { icon: 'underline', label: 'Underline text formatting' }, // underline_formatting (yaml:22513)
  strike: { icon: 'strikethrough', label: 'Strike-through text formatting' }, // strike_through_formatting (yaml:19268)
  bullet: { icon: 'bulleted_list', label: 'Bullet list text formatting' }, // bullet_formatting (yaml:2498)
  ordered: { icon: 'numbered_list', label: 'Numbered list text formatting' }, // numbered_list_formatting (yaml:12812)
  checklist: { icon: 'checkbox', label: 'Checklist text formatting' }, // checklist_formatting (yaml:3804)
  quote: { icon: 'quote', label: 'Quoted text formatting' }, // quoted_formatting (yaml:14633)
  code: { icon: 'code', label: 'Code text formatting' }, // code_formatting (yaml:3935)
  link: { icon: 'link', label: 'Link text formatting' }, // link_formatting (yaml:10173)
  indent: { icon: 'indent_left', label: 'Indent' }, // indent_a11y (yaml:8999)
  outdent: { icon: 'indent_right', label: 'Outdent' }, // outdent_a11y (yaml:13674)
}

/** The heading row: H1 .headline, H2 .title, H3 .subtitle, body .body (CanvasToolbarItem.swift:214-259) */
const HEADINGS: { id: SectionStyle; title: string; font: string }[] = [
  { id: 'h1', title: 'Big heading', font: 'var(--sk-headline)' }, // format_heading_h1_title (yaml:6889)
  { id: 'h2', title: 'Medium heading', font: 'var(--sk-title)' }, // format_heading_h2_title (yaml:6892)
  { id: 'h3', title: 'Small heading', font: 'var(--sk-subtitle)' }, // format_heading_h3_title (yaml:6895)
  { id: 'p', title: 'body', font: 'var(--sk-body)' }, // format_heading_body (yaml:6886), lowercase as shipped
]

/** Each button's state (FormatButtonItemState.swift:88-153): the title disables everything, headings disable bold,
 *  indent / outdent work only in lists. */
function stateOf(id: ButtonId, f: Formats): { selected: boolean; enabled: boolean } {
  const off = f.inTitle || !f.focused
  switch (id) {
    case 'bold':
      return { selected: f.bold, enabled: !off && f.style !== 'h1' && f.style !== 'h2' && f.style !== 'h3' }
    case 'italic':
    case 'underline':
    case 'strike':
      return { selected: f[id], enabled: !off }
    case 'code':
      return { selected: f.code, enabled: !off }
    case 'link':
      return { selected: f.link, enabled: !off }
    case 'indent':
      return { selected: false, enabled: !off && f.canIndent }
    case 'outdent':
      return { selected: false, enabled: !off && f.canOutdent }
    default:
      return { selected: f.style === id, enabled: !off }
  }
}

export function FormatPickerSheet(props: SheetProps) {
  const sheet = useSheet()
  const device = useDevice()
  const formats = useCanvasEditing((s) => s.formats)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(r)
  }, [])
  const open = entered && !sheet?.closing
  const onLink = props.onLink as (() => void) | undefined

  const tap = (id: ButtonId) => {
    const editor = useCanvasEditing.getState().editor
    if (!editor) return
    // link: the picker goes first, then the link editor (CanvasFormatPickerFeature.swift:86-99)
    if (id === 'link') return sheet?.dismiss(() => onLink?.())
    if (id === 'indent' || id === 'outdent') editor.indentBy(id === 'indent' ? 1 : -1)
    else if (id === 'bold' || id === 'italic' || id === 'underline' || id === 'strike' || id === 'code') editor.toggleInline(id)
    else editor.applySection(id)
  }

  const button = (id: Exclude<ButtonId, 'p' | 'h1' | 'h2' | 'h3'>) => {
    const st = stateOf(id, formats)
    // skFormatButtonPresentationObject: an icon-only SKButton .medium, icon on top, fill basePrimary / highlight1.base
    // when selected / baseTertiary when disabled, icon contentPrimary / highlight1.content / contentTertiary
    // (CanvasFormatPickerPresenter.swift:192-251); square corners inside the control (CanvasFormatItemView.swift:247, 370)
    return (
      <SKButton
        key={id}
        title=""
        icon={BUTTONS[id].icon}
        iconPosition="top"
        size="medium"
        buttonStyle="custom"
        customColors={{
          backgroundColor: !st.enabled ? 'var(--dt_color_base_tertiary)' : st.selected ? 'var(--dt_color_base_highlight_1)' : 'var(--dt_color_base_primary)',
          titleColor: !st.enabled ? 'var(--dt_color_content_tertiary)' : st.selected ? 'var(--dt_color_content_highlight_1)' : 'var(--dt_color_content_primary)',
          borderColor: 'transparent',
        }}
        state={st.enabled ? 'enabled' : 'inactive'}
        isSelected={false}
        animationStyle="scaleContentOnly"
        accessibilityLabel={BUTTONS[id].label}
        className="cv-format__button"
        style={{ ['--btn-radius' as string]: '0px' }}
        onClick={() => tap(id)}
      />
    )
  }
  const segment = (ids: Exclude<ButtonId, 'p' | 'h1' | 'h2' | 'h3'>[], grow?: number) => (
    // CanvasFormatItemView: a 1 pt outlineTertiary @13 % border, radius 8; the buttons 1 pt inside (radius 7) with 1 pt
    // outlineTertiary separators (CanvasFormatItemView.swift:21-71, 148-156)
    <div className="cv-format__segment" style={grow ? { flexGrow: grow } : undefined}>
      {ids.map((id, i) => (
        <span key={id} className="cv-format__cell">
          {i > 0 && <span className="cv-format__separator" />}
          {button(id)}
        </span>
      ))}
    </div>
  )

  return (
    <div className="cv-format-host" style={{ ['--display-radius' as string]: `${device.radius}px` }}>
      <div
        className={['ios-sheet', 'ios-sheet--native', 'is-floating', 'cv-format', open && 'is-open'].filter(Boolean).join(' ')}
        // a fixed detent's height sits above the bottom safe area (the sheet floats 6 pt up, SheetHost's geometry)
        style={{ height: DETENT + Math.max(0, device.safeBottom - 6), ['--sheet-float' as string]: 1 }}
        role="dialog"
        aria-label="Format"
        onPointerDown={keep}
        onMouseDown={keep}
        data-no-drag
      >
        <div className="sheet-bar cv-format__bar">
          {/* SKBarButtonItem .icon(svgClose), "Close" (yaml:3911) */}
          <button type="button" className="sheet-bar__glass sheet-bar__close" aria-label="Close" onClick={() => sheet?.dismiss()} data-tap>
            <Icon name="close" size={20} />
          </button>
          {/* SKNavigationTitle: Lato Black 17; edit_menu_item_format_button "Format" (yaml:5642) */}
          <div className="sheet-bar__title cv-format__title">Format</div>
        </div>
        <div className="cv-format__rows">
          {/* CanvasFormatHeadingCustomRow: scrollable, 12 pt end insets, cells label + 8 / 5 pt, selected highlight1.base
              radius 8, labels contentPrimary / highlight1.content / contentTertiary (:25-30, :90-221) */}
          <div className="cv-format__headings" data-scroll-x>
            {HEADINGS.map((h) => {
              const st = stateOf(h.id, formats)
              return (
                <button
                  key={h.id}
                  type="button"
                  className={['cv-format__heading', st.selected && 'is-selected', !st.enabled && 'is-disabled'].filter(Boolean).join(' ')}
                  style={{ font: h.font }}
                  aria-pressed={st.selected}
                  disabled={!st.enabled}
                  onClick={() => tap(h.id)}
                  data-tap
                >
                  {h.title}
                </button>
              )
            })}
          </div>
          {/* B · I · U · S: underline is always on at 14b3cbaf (FormatButtonItemState.swift:27-46;
              CanvasFormatPickerPresenter.swift:45-51) */}
          <div className="cv-format__row">{segment(['bold', 'italic', 'underline', 'strike'])}</div>
          <div className="cv-format__row">{segment(['bullet', 'ordered', 'checklist'])}</div>
          {/* quote · code · link and indent · outdent, 16 pt apart, proportional widths (…MiscellaneousStyleCustomRow.swift:478-495) */}
          <div className="cv-format__row cv-format__row--misc">
            {segment(['quote', 'code', 'link'], 3)}
            {segment(['indent', 'outdent'], 2)}
          </div>
        </div>
      </div>
    </div>
  )
}
