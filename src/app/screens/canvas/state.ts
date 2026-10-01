import { create } from 'zustand'
import { useApp } from '../../store'
import { NO_FORMATS, type CanvasEditor, type Formats } from './editor'

// The canvas being edited, shared with what its toolbar opens outside the screen (the format picker sheet), and the
// canvases you saved for Later this session.

interface CanvasEditing {
  /** the editor of the canvas on screen that has the caret */
  editor: CanvasEditor | null
  /** what's active at its caret (the toolbar's and the format picker's selected / disabled states) */
  formats: Formats
  /** saved for Later from the canvas menu, by canvas id */
  saved: Record<string, boolean>
}

export const useCanvasEditing = create<CanvasEditing>()(() => ({ editor: null, formats: NO_FORMATS, saved: {} }))

/** The key of a presented sheet of this type, if one is up. */
export const sheetKeyOf = (type: string) => useApp.getState().sheets.find((s) => s.type === type)?.key

/** Runs `fn` once the sheet of this type has gone (its key leaves the store), and stops listening. */
export function whenSheetCloses(key: string | undefined, fn: () => void) {
  if (!key) return fn()
  const unsub = useApp.subscribe((s) => {
    if (s.sheets.some((x) => x.key === key)) return
    unsub()
    fn()
  })
}

/** A stable small hash of a string (the body placeholder is chosen per canvas id, CanvasSessionLoader.swift:232-243). */
export function hashOf(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * The body placeholders (canvas_placeholder_random_ahead / _docket / _once / _time / _words, yaml:3215-3227), one per
 * canvas by a hash of its id (CanvasSessionLoader.swift:232-243).
 */
const BODY_PLACEHOLDERS = ['Go ahead, start writing!', "What's on the docket for today?", 'Once upon a time…', 'Time to document your genius!', 'Words go here']
export const bodyPlaceholder = (id: string) => BODY_PLACEHOLDERS[hashOf(id) % BODY_PLACEHOLDERS.length]
/** canvas_placeholder_title (yaml:3230; CanvasService.swift:399-400) */
export const TITLE_PLACEHOLDER = 'Your canvas title'
