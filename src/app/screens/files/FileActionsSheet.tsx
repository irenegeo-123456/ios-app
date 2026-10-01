import { Fragment } from 'react'
import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SheetBar } from '../../sheets/ui/SheetBar'
import { SKGenericEntity } from '../../../slackkit/SKEntities'
import { SKNavigationTitle } from '../../../slackkit/SKNavigationTitle'
import './files.css'

// A file's actions, from the file viewer's options button: not a UIMenu but the FileAction feature, a self-sized sheet in
// a navigation controller (FileActionFeature.swift:41-55; the options item has no menu, FileCarouselToolbarHelper.swift:
// 168-176 → FileCarouselFeature.swift:408-436) titled with the file's name in an SKNavigationTitle
// (FileActionPresenter.swift:40), no close button on iPhone. SKGenericEntity .small rows with icon ornament boxes, an 8 pt
// blank divider between sections (FileActionDataTypes.swift:449-492), in the order action / rename / delete
// (FileActionPresenter.swift:31-38; media, AI summary and folder are off). Cited from the September 2026 source.
//
//   presentSheet('file-actions', { title, kind: 'image' | 'video' | 'audio' | 'file', mine, saved, onToggleSaved })

interface Props extends SheetProps {
  title: string
  kind: 'image' | 'video' | 'audio' | 'file'
  /** you uploaded it: Rename (and Add Description for images) and Delete (FileActionInteractor.swift:548-574) */
  mine?: boolean
  saved?: boolean
  onToggleSaved?: () => void
}

interface Row {
  title: string
  icon: string
  destructive?: boolean
  run: () => void
}

export function FileActionsSheet({ title, kind, mine, saved, onToggleSaved }: Props) {
  const sheet = useSheet()
  const showToast = useApp((s) => s.showToast)
  const later = () => showToast('Not in the prototype')
  const done = (fn: () => void) => () => sheet?.dismiss(fn)
  // The action section (FileActionInteractor.swift:362-443; titles and icons FileActionDataTypes.swift:191-322): Share
  // (downloads allowed), Save Image / Save Video, Save for later / Remove from Later, Share in Slack, Copy Link, View in
  // Browser (not for media). Copy Image is behind copyImageMessageAction, off.
  const actions: Row[] = [
    { title: 'Share', icon: 'share', run: done(later) }, // share
    ...(kind === 'image' ? [{ title: 'Save Image', icon: 'download', run: done(later) }] : []), // save_image
    ...(kind === 'video' ? [{ title: 'Save Video', icon: 'download', run: done(later) }] : []), // save_video
    saved
      ? { title: 'Remove from Later', icon: 'bookmark_filled', run: done(() => onToggleSaved?.()) } // remove_from_later
      : { title: 'Save for Later', icon: 'bookmark', run: done(() => onToggleSaved?.()) }, // save_for_later_menu (FileActionDataTypes.swift:256)
    { title: 'Share in Slack', icon: 'share_message', run: done(later) }, // shareInSlack
    { title: 'Copy Link', icon: 'link', run: done(() => showToast('Link copied')) }, // copy_link, link_copied
    ...(kind === 'file' ? [{ title: 'View in Browser', icon: 'file', run: done(later) }] : []), // view_in_browser
  ]
  const sections: Row[][] = [actions]
  // The uploader's rename section (:548-557) and delete section (:559-574: Delete in sk_raspberry_red, its icon too)
  if (mine) {
    sections.push([{ title: 'Rename', icon: 'edit', run: done(later) }, ...(kind === 'image' ? [{ title: 'Add Description', icon: 'quote_post', run: done(later) }] : [])]) // rename, files_action_add_description
    sections.push([{ title: 'Delete', icon: 'trash', destructive: true, run: done(later) }]) // delete
  }
  return (
    <div className="file-actions" data-qa="file_actions">
      <SheetBar title={<SKNavigationTitle title={title} />} />
      {sections.map((rows, i) => (
        <Fragment key={i}>
          {i > 0 && <div className="file-actions__divider" aria-hidden />}
          {rows.map((r) => (
            <SKGenericEntity
              key={r.title}
              size="small"
              primaryText={r.destructive ? <span className="file-actions__destructive">{r.title}</span> : r.title}
              ornament={{ icon: { icon: r.icon, color: r.destructive ? 'var(--sk_raspberry_red)' : undefined } }}
              onSelected={r.run}
            />
          ))}
        </Fragment>
      ))}
    </div>
  )
}
