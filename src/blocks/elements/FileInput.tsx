import { useRef } from 'react'
import { Icon } from '../../icons/Icon'
import { SKButton } from '../../slackkit'
import { stateFromAction } from '../modal-state'
import { useSurface } from '../surface'
import type { FileInputElement, InputBlock } from '../types'

// file_input (spec blockkit.md §4.8; Elements/FileUpload/BKFileUploadView.swift:18,223-235): an outline SKButton
// "Upload File" (`upload_file`, yaml:21313) with file.svg on the left, then the picked files 8 pt apart. The clone has
// no uploads: the browser's file chooser stands in for the photo library / files sheet, and picked files are recorded
// in the view state like Slack's file objects.

const prettySize = (n: number) => (n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}MB` : n >= 1000 ? `${Math.round(n / 1000)}KB` : `${n}B`)

export function BKFileInput({ el, block, blockId }: { el: FileInputElement; block: InputBlock; blockId: string }) {
  const s = useSurface()
  const input = useRef<HTMLInputElement>(null)
  const value = s.values[blockId]?.[el.action_id]
  const files = value?.type === 'file_input' ? value.files : []
  const accept = el.filetypes?.length ? el.filetypes.map((t) => `.${t.replace(/^\./, '')}`).join(',') : undefined
  const pick = (list: FileList | null) => {
    if (!list?.length) return
    const picked = [...list].slice(0, Math.max(1, (el.max_files ?? 10) - files.length)).map((f) => ({ name: f.name, size: f.size, type: f.type }))
    const prev = files.map((f) => ({ name: f.name, size: f.size, type: f.mimetype }))
    const action = { type: 'file_input' as const, actionId: el.action_id, blockId, files: [...prev, ...picked] }
    const state = stateFromAction(action)
    if (state) s.setValue(blockId, el.action_id, state)
    if (s.errors[blockId]) s.setError(blockId, null)
    if (block.dispatch_action) void s.dispatch(action)
  }
  const remove = (id: string) => {
    s.setValue(blockId, el.action_id, { type: 'file_input', files: files.filter((f) => f.id !== id) })
  }
  return (
    <div className="bk-file-input">
      <SKButton title="Upload File" icon="file" iconPosition="left" buttonStyle="outlineDefault" size="medium" state={s.interactive ? 'enabled' : 'inactive'} className="bk-button is-fill" onClick={() => input.current?.click()} />
      <input ref={input} type="file" hidden multiple={(el.max_files ?? 10) > 1} accept={accept} onChange={(e) => (pick(e.target.files), (e.target.value = ''))} />
      {files.length > 0 && (
        <div className="bk-file-input__files" data-scroll-x>
          {files.map((f) => (
            <div key={f.id} className="bk-file-card">
              <span className="bk-file-card__ornament">
                <Icon name="file" size={20} />
              </span>
              <span className="bk-file-card__text">
                <span className="bk-file-card__title">{f.name}</span>
                <span className="bk-file-card__subtitle">{`${prettySize(f.size)} ${(f.name.split('.').pop() ?? '').toUpperCase()}`}</span>
              </span>
              <button type="button" className="bk-file-card__remove" aria-label="Remove" onClick={() => remove(f.id)} data-tap>
                <Icon name="close_circle_filled" size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
