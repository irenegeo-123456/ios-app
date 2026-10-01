import { useState } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { GlassButton, GlassGroup } from '../../nav/NavBar'
import { SKButton } from '../../../slackkit/SKButton'
import { SKListRowAccessoryStack } from '../../../slackkit/SKListCellAccessory'
import { EntityRow } from '../more/EntityRow'
import { FILE_TYPES, useFiles, type DocsFileType } from './state'

// The File types sheet (DocsFilterFileTypes, spec search-slackbot-huddles.md §4.2): a native sheet at the large
// detent (DocsFilterFileTypesFeature.swift:40-42) in a navigation controller: the automatic close button, the
// SKNavigationTitle "File types" (file_types 6586) and a "Done" bar button (done 5390, SKButton .systemDefault
// .barButton), disabled until the selection changes (DocsFilterFileTypesViewController.swift:34-83). Background
// containerPrimary. Rows: SKGenericEntity .small, no ornament, a checkbox accessory (DocsFilterFileTypesPresenter.swift:59-77).

export function FileTypesSheet({ sheetKey }: SheetProps) {
  const sheet = useSheet()
  const dismiss = useApp((s) => s.dismissSheet)
  const initial = useFiles((s) => s.types)
  const saveTypes = useFiles((s) => s.saveTypes)
  const [selected, setSelected] = useState<DocsFileType[]>(initial)
  const changed = selected.length !== initial.length || selected.some((t) => !initial.includes(t))
  const close = (then?: () => void) => (sheet ? sheet.dismiss(then) : (dismiss(sheetKey), then?.()))
  const toggle = (t: DocsFileType) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : FILE_TYPES.map((f) => f.type).filter((x) => x === t || s.includes(x))))

  return (
    <div className="files-sheet">
      <div className="files-sheet__bar">
        <GlassButton label="Close" onClick={() => close()} className="files-sheet__close">
          <XMark />
        </GlassButton>
        <div className="files-sheet__title">File types</div>
        <GlassGroup className={`files-sheet__done${changed ? '' : ' is-disabled'}`}>
          <SKButton
            title="Done"
            buttonStyle="systemDefault"
            size="barButton"
            isPadded={false}
            state={changed ? 'enabled' : 'inactive'}
            onClick={() => close(() => saveTypes(selected))}
          />
        </GlassGroup>
      </div>
      <div className="ios-scroll files-sheet__list" data-sheet-scroll>
        {FILE_TYPES.map(({ type, title }) => {
          const on = selected.includes(type)
          return (
            <EntityRow
              key={type}
              title={title}
              // the checkbox takes its own taps (SKListRowAccessoryStack); the row toggles it too
              accessories={<SKListRowAccessoryStack accessories={[{ checkbox: { isOn: on, onToggled: () => toggle(type) } }]} />}
              onClick={() => toggle(type)}
              data-qa={`file_type_${type}`}
            />
          )
        })}
      </div>
    </div>
  )
}

/** SF Symbols "xmark", the automatic close button's glyph (UIViewController+CloseButton.swift:61-87). */
const XMark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M1.9 1.9 14.1 14.1M14.1 1.9 1.9 14.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
