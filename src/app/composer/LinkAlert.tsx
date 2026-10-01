import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { registerSheet, type SheetProps } from '../nav/registry'
import { useSheet } from '../nav/SheetHost'
import '../sheets/ui/ios.css'

// The formatting toolbar's link editor (WysiwygLinkEditor.swift, Modules/Integration/RichTextEditor): a system alert.
// Adding: "Add Link" with a "Text" field and a "Link" field, then Save / Cancel. On an existing link: its URL as the
// message, with Edit, Remove link (remove_link, yaml:16268; destructive) and Cancel; Edit opens the fields as "Edit Link". SKAlertController only
// maps title, message, actions and text fields onto UIAlertController (sheets-menus.md §5.2), so it's drawn with the
// app's iOS 26 alert (src/app/sheets/ui/Alert.tsx, ios.css), plus the text fields that one doesn't have.
//
//   presentSheet('composer-link', { label, url, isEdit, onDone: (r: { label, url } | 'remove' | null) => … })

type Result = { label: string; url: string } | 'remove' | null

function LinkAlert(props: SheetProps) {
  const sheet = useSheet()
  const onDone = props.onDone as ((r: Result) => void) | undefined
  const [step, setStep] = useState<'options' | 'fields'>(props.isEdit ? 'options' : 'fields')
  const [label, setLabel] = useState(String(props.label ?? ''))
  const [url, setUrl] = useState(String(props.url ?? ''))
  const first = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  // the first enabled field becomes first responder (WysiwygLinkEditor.swift:89-95)
  useEffect(() => {
    if (step !== 'fields') return
    const t = setTimeout(() => first.current?.focus(), 10)
    return () => clearTimeout(t)
  }, [step])

  const finish = (r: Result) => {
    if (done.current) return
    done.current = true
    const run = () => onDone?.(r)
    if (sheet) sheet.dismiss(run)
    else {
      useApp.getState().dismissSheet(props.sheetKey)
      run()
    }
  }
  // handleSaveButtonTapped (:131-156): a link without a scheme gets one; an empty label uses the link
  const save = () => {
    const u = url.trim()
    if (!u) return finish('remove')
    const link = /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`
    finish({ label: label.trim() ? label : link, url: link })
  }
  const button = (title: string, onClick: () => void, cls = '') => (
    <button type="button" className={`ios-alert__button ${cls}`} onClick={onClick} data-tap>
      {title}
    </button>
  )

  return (
    <div className="ios-alert-overlay" data-kind="alert">
      <div className="ios-alert-dim" />
      {step === 'options' ? (
        <div className="ios-alert glass-platter" role="alertdialog" aria-label={url}>
          <div className="ios-alert__text">
            <div className="ios-alert__message cmp-link-alert__url">{url}</div>
          </div>
          {/* edit, remove_link, cancel (yaml:3204) */}
          <div className="ios-alert__buttons">
            {button('Edit', () => setStep('fields'))}
            {button('Remove link', () => finish('remove'), 'is-destructive')}
            {button('Cancel', () => finish(null), 'is-cancel')}
          </div>
        </div>
      ) : (
        <div className="ios-alert glass-platter" role="alertdialog" aria-label={props.isEdit ? 'Edit Link' : 'Add Link'}>
          <div className="ios-alert__text">
            {/* add_link "Add Link" (yaml:774) / edit_link "Edit Link" (yaml:6035) */}
            <div className="ios-alert__title">{props.isEdit ? 'Edit Link' : 'Add Link'}</div>
          </div>
          <div className="cmp-link-alert__fields">
            {/* placeholders R.strings.text "Text" and R.strings.link "Link" (yaml:10878); the link field's URL keyboard */}
            <input ref={first} className="cmp-link-alert__field" placeholder="Text" aria-label="Text" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
            <input className="cmp-link-alert__field" placeholder="Link" aria-label="Link" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </div>
          <div className="ios-alert__buttons is-row">
            {button('Cancel', () => finish(null), 'is-cancel')}
            {button('Save', save)}
          </div>
        </div>
      )}
    </div>
  )
}

registerSheet('composer-link', LinkAlert, 'overlay')
