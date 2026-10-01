import { registerSheet } from '../../nav/registry'
import { configureSheet } from '../../nav/SheetHost'
import { EditProfileSheet } from './EditProfileSheet'
import { EditPhotoSheet } from './EditPhotoSheet'

// Edit Profile (spec you-settings.md §2): EditProfileRoute presents a form sheet
// (Modules/Features/EditProfile/Implementation/EditProfileRouteExecution.swift:7-11) from You's profile row and the
// profile's "Edit Profile" / Contact Information › "Edit":
// presentSheet('edit-profile', { userId?, section?: 'contact' }). Its photo options are an SKListBottomSheet, a native
// self-sized sheet with bottomsheetMigration (SKListBottomSheetFeatureDeprecated.swift:120-132).
registerSheet('edit-profile', EditProfileSheet as never, 'page')
registerSheet('edit-profile-photo', EditPhotoSheet as never, 'fit')
configureSheet('edit-profile-photo', { chrome: 'legacy', migrated: { detents: ['fit'] } })
