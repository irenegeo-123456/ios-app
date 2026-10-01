import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { registerSheet, type SheetProps } from '../nav/registry'
import { configureSheet, useSheet } from '../nav/SheetHost'
import { Icon } from '../../icons/Icon'
import { SKEntityRow, SKListFooter, SKListHeader } from '../../slackkit/SKEntity'
import { SKButton } from '../../slackkit/SKButton'
import { DEMO_FILES } from '../../data/demo-media'
import type { FileAttachment } from '../../data/types'
import { asset } from '../../lib/asset'

// The composer's "+" sheet: attachments and shortcuts (spec composer.md §16; ComposerOmnipickerPlugin.swift:143-180).
// With bottomsheetMigration off it's Slack's SKBottomSheet: content height, 12 pt top corners, 48 × 4 grabber, 70 %
// dim, 0.5 s spring (the sheet host draws it: configureSheet chrome 'legacy'). Content, in the plugin order of
// ComposerToolbarPluginFactory+Dependencies.swift:128-197: Photos & Videos (camera + recent photos), the add-content
// actions, then recent canvases and files.
//
//   presentSheet('composer-plus', { onAttach: (files: FileAttachment[]) => … })

/** The demo's recent photos (the strip shows up to 30, OmnipickerPhotoGalleryPlugin.swift:37). */
const PHOTOS: FileAttachment[] = [DEMO_FILES.heroLight, DEMO_FILES.cardsLight, DEMO_FILES.cardSpec, DEMO_FILES.onboarding, DEMO_FILES.cardsDark, DEMO_FILES.heroDark, DEMO_FILES.incident]

function PlusSheet(props: SheetProps) {
  const onAttach = props.onAttach as ((files: FileAttachment[]) => void) | undefined
  // Slackbot's DM: "Photos", and no audio, video or GIF rows (OmnipickerAddContentPlugin.swift:118-177)
  const slackbot = !!props.slackbot
  const sheet = useSheet()
  const showToast = useApp((s) => s.showToast)
  const [selected, setSelected] = useState<string[]>([])
  const pending = useRef<string[]>([])
  pending.current = selected
  const attached = useRef(false)

  const attach = (files: FileAttachment[]) => {
    if (attached.current || !files.length) return
    attached.current = true
    onAttach?.(files)
  }
  const photos = (ids: string[]) => ids.map((id) => PHOTOS.find((p) => p.id === id)).filter((p): p is FileAttachment => !!p)
  // selected items attach when the sheet closes, too (SKListBottomSheetFeatureDeprecated.swift:179-186)
  useEffect(() => () => attach(photos(pending.current)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) =>
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id)
      // at most 10 (OmnipickerPhotoGalleryPlugin.swift:338-356); too_many_items_selected (yaml:21916)
      if (s.length >= 10) {
        showToast('Too many items selected.')
        return s
      }
      return [...s, id]
    })

  const close = (then?: () => void) => (sheet ? sheet.dismiss(then) : useApp.getState().dismissSheet(props.sheetKey))
  const notHere = () => showToast('Not in the prototype')
  const row = (fn: () => void) => () => close(fn)

  const n = selected.length
  return (
    <div className="cmp-plus">
      <section>
        {/* photos_and_videos_header_title (yaml:14730; photos_header_title in Slackbot's DM, yaml:14733) +
            view_library_header_button (yaml:23217), SKHeaderEntity .medium */}
        <SKListHeader title={slackbot ? 'Photos' : 'Photos & Videos'} collapsible={false} button={{ text: 'View Library', label: 'View Library', onClick: notHere }} />
        <div className="cmp-plus__strip" data-scroll-x>
          {/* tile 1: the camera (PhotoGalleryHorizontalScrollerCell.swift:252-257), a11y "Open Camera" */}
          <button type="button" className="cmp-plus__tile cmp-plus__tile--camera" aria-label="Open Camera" onClick={notHere} data-tap>
            <Icon name="camera" size={20} />
          </button>
          {PHOTOS.map((p) => {
            const i = selected.indexOf(p.id)
            return (
              <button key={p.id} type="button" className={`cmp-plus__tile${i >= 0 ? ' is-selected' : ''}`} aria-label={p.name} aria-pressed={i >= 0} onClick={() => toggle(p.id)} data-tap>
                <img src={asset(p.url)} alt="" draggable={false} />
                <span className="cmp-plus__badge">{i >= 0 ? i + 1 : ''}</span>
              </button>
            )
          })}
        </div>
      </section>
      {slackbot && (
        // Sept: Slackbot's DM (Slackbot AI on) gets its own section after the photos, a blank divider above and a hairline
        // below: "Skills" (svgAiSkills, with canvas access) and "Apps" (svgPlug), contentPrimary icons in 24 pt boxes;
        // "Deep Research" and "Web Search" toggles follow behind slackbotDeepResearch / slackbotWebSearch, both default
        // off (OmnipickerSlackbotActionsPlugin.swift:114-168; ComposerToolbarPluginFactory+Dependencies.swift:128-197;
        // `skills` yaml:19231, `apps` yaml:2041)
        <>
          <div className="cmp-plus__gap" />
          <SKEntityRow ornament={<Icon name="ai_skills" size={20} />} title="Skills" onClick={row(notHere)} />
          <SKEntityRow ornament={<Icon name="plug" size={20} />} title="Apps" onClick={row(notHere)} />
          <SKListFooter />
        </>
      )}
      {/* actions (OmnipickerAddContentPlugin.swift:118-177; labels and icons PlusMenuOption.swift:52-89); a blank
          divider above, a hairline divider below */}
      <div className="cmp-plus__gap" />
      {!slackbot && <SKEntityRow ornament={<Icon name="microphone" size={20} />} title="Record an Audio Clip" onClick={row(notHere)} />}
      {!slackbot && <SKEntityRow ornament={<Icon name="video" size={20} />} title="Record a Video Clip" onClick={row(notHere)} />}
      <SKEntityRow
        ornament={<Icon name="file_upload" size={20} />}
        title="Upload a File"
        // the system document picker, standing in: the demo's PDF lands in the tray
        onClick={() => close(() => attach([DEMO_FILES.onePager]))}
      />
      {!slackbot && <SKEntityRow ornament={<Icon name="gif_wink" size={20} />} title="Add a GIF" onClick={row(notHere)} />}
      <SKListFooter />
      <div className="cmp-plus__gap" />
      {/* recent (OmnipickerRecentContentPlugin.swift:96-140): recent_canvases_list (yaml:15809), recent_files (15818) */}
      <SKEntityRow ornament={<Icon name="canvas_browser" size={20} />} title="Recent Canvases" onClick={row(notHere)} />
      <SKEntityRow ornament={<Icon name="file_browser" size={20} />} title="Recent Files" onClick={row(notHere)} />
      {n > 0 && (
        // "Attach 1 item" / "Attach %d items" (attachOneItem yaml:2254, attachNItems yaml:2251): SKButton primary
        // large, 16 pt from the sides, 30 pt from the bottom, over a fade (SKListBottomSheetViewController.swift:187-224)
        <div className="cmp-plus__attach">
          <SKButton
            title={n === 1 ? 'Attach 1 item' : `Attach ${n} items`}
            buttonStyle="primary"
            size="large"
            onClick={() => close(() => attach(photos(selected)))}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}

registerSheet('composer-plus', PlusSheet, 'fit')
configureSheet('composer-plus', { chrome: 'legacy', legacy: { shortForm: 'content', longForm: 'content' }, migrated: { detents: ['fit'] } })
