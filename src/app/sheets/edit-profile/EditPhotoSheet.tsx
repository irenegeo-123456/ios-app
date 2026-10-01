import { useApp } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { SKGenericEntity, SKHeaderEntity } from '../../../slackkit/SKEntities'
import { SectionFooter, iconOrnament } from '../../screens/you/SettingsRows'

// The photo options (EditPhotoBottomSheet/EditPhotoBottomSheet.swift, spec you-settings.md §2.2; slack-objc 14b3cbaf): an
// SKListBottomSheet (the legacy SKBottomSheet; a native self-sized sheet with bottomsheetMigration,
// SKListBottomSheetFeatureDeprecated.swift:120-132). "Upload a new photo" over "View photo library" and "Take a Photo"
// (contentPrimary; June sk_primary_foreground), then "Remove photo" (svgTrash, sk_raspberry_red) when the photo isn't
// the default (EditPhotoBottomSheet.swift:26-72, :81-110). A row dismisses the sheet, then acts
// (SKListBottomSheetStaticPlugin.swift:75-85); removing has no confirmation (users.deletePhoto). The system photo picker
// and camera aren't in the prototype.
//
//   presentSheet('edit-profile-photo', { userId? })

export function EditPhotoSheet({ userId }: SheetProps & { userId?: string }) {
  const sheet = useSheet()
  const user = useApp((s) => (typeof userId === 'string' && s.fx.users[userId]) || s.fx.users[s.fx.me])
  const then = (fn: () => void) => (sheet ? sheet.dismiss(fn) : (useApp.getState().dismissSheet(), fn()))
  const notInPrototype = () => useApp.getState().showToast('Not in the prototype')
  const remove = () =>
    useApp.setState((s) => {
      const u = user && s.fx.users[user.id]
      if (!u) return {}
      return { fx: { ...s.fx, users: { ...s.fx.users, [u.id]: { ...u, avatar: '', avatar2x: undefined } } } }
    })
  return (
    <div className="ep-photo-sheet" data-screen="edit-profile-photo">
      <SKHeaderEntity primaryText="Upload a new photo" />
      {/* .image and .camera are icon-font glyphs (SKIconManifest.swift:56, :179); svgImage / svgCamera are the closest assets */}
      <SKGenericEntity primaryText="View photo library" ornament={iconOrnament('image', 'var(--dt_color_content_primary)')} onSelected={() => then(notInPrototype)} />
      <SKGenericEntity primaryText="Take a Photo" ornament={iconOrnament('camera', 'var(--dt_color_content_primary)')} onSelected={() => then(notInPrototype)} />
      {user?.avatar && (
        <>
          <SectionFooter />
          <SKGenericEntity primaryText={<span className="ep-remove">Remove photo</span>} ornament={iconOrnament('trash', 'var(--sk_raspberry_red)')} onSelected={() => then(remove)} />
        </>
      )}
    </div>
  )
}
