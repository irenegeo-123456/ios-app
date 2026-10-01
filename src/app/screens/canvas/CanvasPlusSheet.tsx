import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { Icon } from '../../../icons/Icon'
import { SKEntityRow, SKListFooter } from '../../../slackkit/SKEntity'

// The canvas toolbar's "+" (CanvasOmnipickerPlugin.swift:122-167 at 14b3cbaf; spec canvas-lists-creation.md §1.7): an
// SKListBottomSheet of plugin sections — Record a Video Clip, Divider, Profile, then Canvases, Lists, Recent Files and
// Upload a File — SKGenericEntity .small rows with contentPrimary icons (were sk_primary_foreground in June). Each
// section has the default .hairlineDivider footer (8 pt, a 1 px line at its bottom; none on the last) and an 8 pt blank
// header (none on the first) (CanvasDividerPlugin.swift:53-75; UserPickerPlugin.swift:65-81; FilePickerPlugin.swift:253-363;
// SKListPresentationObject.swift:153-154). Divider inserts a
// horizontal rule at the caret; the canvas model has no image, video or profile sections, so the photo strip is left
// out and those rows show the prototype toast.
//
//   presentSheet('canvas-plus', { onDivider })

export function CanvasPlusSheet(props: SheetProps) {
  const sheet = useSheet()
  const onDivider = props.onDivider as (() => void) | undefined
  const close = (then?: () => void) => (sheet ? sheet.dismiss(then) : useApp.getState().dismissSheet(props.sheetKey))
  const notHere = () => close(() => useApp.getState().showToast('Not in the prototype'))
  const icon = (name: string) => <Icon name={name} size={20} color="var(--dt_color_content_primary)" />
  // between sections: the previous one's hairline footer, then this one's blank header
  const gap = (
    <>
      <SKListFooter />
      <div className="cv-plus__gap" />
    </>
  )
  return (
    <div className="cv-plus">
      {/* record_a_video_clip (yaml:15850), svgVideo */}
      <SKEntityRow ornament={icon('video')} title="Record a Video Clip" onClick={notHere} />
      {gap}
      {/* divider (yaml:5546), svgDivider */}
      <SKEntityRow ornament={icon('divider')} title="Divider" onClick={() => close(() => onDivider?.())} />
      {gap}
      {/* profile (yaml:15323), svgUser: a person's profile card */}
      <SKEntityRow ornament={icon('user')} title="Profile" onClick={notHere} />
      {gap}
      {/* canvases (yaml:3463), lists (yaml:11249), recent_files (yaml:15816), upload_a_file (yaml:22810; the icon font's
          .upload has no SVG: file_upload, as the composer's "+" uses) */}
      <SKEntityRow ornament={icon('canvas_browser')} title="Canvases" onClick={notHere} />
      <SKEntityRow ornament={icon('lists')} title="Lists" onClick={notHere} />
      <SKEntityRow ornament={icon('file_browser')} title="Recent Files" onClick={notHere} />
      <SKEntityRow ornament={icon('file_upload')} title="Upload a File" onClick={notHere} />
    </div>
  )
}
