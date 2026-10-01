// SlackKit for the web: one component per iOS SlackKit component, same names (Modules/UIInfra/SlackKit).
// Specs: reference/ios/specs/slackkit-components.md. Import from here. Gallery with usage: /?kit=components.

// Buttons
export { SKButton, buttonMetrics } from './SKButton'
export type { SKButtonProps, SKButtonSize, SKButtonState, SKButtonStyle } from './SKButton'
export { SKIconButton, ICON_BUTTON_SIZES } from './SKIconButton'
export type { SKIconButtonBackdrop, SKIconButtonSize } from './SKIconButton'
export { SKPillButton } from './SKPillButton'
export type { SKPillButtonSize } from './SKPillButton'

// Selection controls and small indicators
export { SKSwitch } from './SKSwitch'
export { SKCheckbox } from './SKCheckbox'
export { SKRadioButton } from './SKRadioButton'
export { SKBadge, badgeCountText } from './SKBadge'
export { SKDot } from './SKDot'
export type { SKBadgeStyle } from './SKBadge'
export { SKSpinner, SKCircularProgressIndicator, SPINNER_SIZES, spinnerColors } from './SKSpinner'
export type { SKSpinnerColor, SKSpinnerSize } from './SKSpinner'
export { SKProgressBar, PROGRESS_BAR_HEIGHTS } from './SKProgressBar'
export { SKLoadingBar } from './SKLoadingBar'
export type { SKLoadingBarState } from './SKLoadingBar'
export { SKPageController } from './SKPageController'
export type { SKPageControllerPage } from './SKPageController'
export { SKTabBar } from './SKTabBar'
export type { SKTabBarDisplayStyle, SKTabBarProps, SKTabBarTab } from './SKTabBar'

// Avatars and ornaments
export { SKMemberAvatar, AVATAR_SIZES, initialsOf, memberPresence, presenceGeometry } from './SKMemberAvatar'
export type { AvatarSize, Presence, SKMemberAvatarType } from './SKMemberAvatar'
export { SKWorkspaceAvatar } from './SKWorkspaceAvatar'
export type { SKWorkspaceType } from './SKWorkspaceAvatar'
export { SKOrnamentBox, ORNAMENT_SIZES } from './SKOrnamentBox'
export type { SKOrnament, SKOrnamentBoxSize } from './SKOrnamentBox'
export { SKGroupAvatar } from './SKGroupAvatar'
export type { SKGroupAvatarSize } from './SKGroupAvatar'
export { SKAvatarPile, AVATAR_PILE_SIZES } from './SKAvatarPile'
export type { SKAvatarPileSource } from './SKAvatarPile'
export { SKHuddleFacePile } from './SKHuddleFacePile'
export type { SKHuddleFacePileBadge } from './SKHuddleFacePile'
export { SKDecoratedIcon } from './SKDecoratedIcon'
export type { SKDecoratedIconBadge } from './SKDecoratedIcon'
export { SKColorSwatch } from './SKColorSwatch'
export { SKEmoji, NATIVE_EMOJI_SCALE } from './SKEmoji'

// Attachments
export { SKThumbnailAttachment, THUMBNAIL_SIZES } from './SKThumbnailAttachment'
export type { SKThumbnailAttachmentState, SKThumbnailSelection } from './SKThumbnailAttachment'
export { SKCompactAttachment, SKCompactOverflow, AttachmentOrnament } from './SKCompactAttachment'
export type { SKAttachmentIcon, SKAttachmentOrnament, SKCompactAttachmentState } from './SKCompactAttachment'
export { SKExpandedAttachment, expandedAttachmentSize } from './SKExpandedAttachment'
export type { SKExpandedAttachmentState } from './SKExpandedAttachment'
export { SKAttachmentBar, attachmentBarLayout } from './SKAttachmentBar'
export type { SKAttachmentBarItem, SKAttachmentBarState, SKAttachmentPreferences } from './SKAttachmentBar'
export { VideoDurationBadge, AltTextBadge, MultiSelectBadge, formatVideoDuration } from './attachmentBadges'
export { fileTypeIcon, fileTypePrimaryColor, fileTypeSecondaryColor, fileTypeLegacyColor, fileTypeFor } from './fileTypes'
export type { SKFileType } from './fileTypes'

// Feedback, empty and loading states
export { SKLoadingShimmer } from './SKLoadingShimmer'
export type { SKShimmerShape } from './SKLoadingShimmer'
export { SKLoadingEntity, SKLoadingHeader, SKLoadingState, SKWrappedLoadingView, loadingShapes, loadingShapesHeight } from './SKLoadingState'
export type { SKLoadingCellContent, SKLoadingEntitySize, SKLoadingEntityType, SKLoadingFillStyle, SKLoadingHeaderContent, SKLoadingPlaceholderStyle } from './SKLoadingState'
export { SKBanner, BANNER_TONE_ICONS } from './SKBanner'
export type { SKBannerCustomTone, SKBannerOrnament, SKBannerTone } from './SKBanner'
export { SKToast, TOAST_DEFAULT_DELAY } from './SKToast'
export type { SKToastContentStyle } from './SKToast'
export { SKEmptyState, SKGenericErrorEmptyState } from './SKEmptyState'
export type { SKEmptyStateButton, SKEmptyStateContent } from './SKEmptyState'
export { EMPTY_STATE_ILLUSTRATIONS } from './illustrations'
export type { SKEmptyStateIllustration } from './illustrations'
export { SKNavigationTitle } from './SKNavigationTitle'
export type { SKNavigationTitleOrnament } from './SKNavigationTitle'

// Text inputs, search and tokens
export { SKTextField, ClearButton } from './SKTextField'
export type { SKGhostText, SKTextFieldProps } from './SKTextField'
export { SKSearchBar } from './SKSearchBar'
export { SKSearchBarButton } from './SKSearchBarButton'
export { SKTokenView, tokenColors } from './SKTokenView'
export type { SKTokenColors, SKTokenOrnament, SKTokenViewProps } from './SKTokenView'
export { SKTokenBar, tokenBarLayout } from './SKTokenBar'
export { SKTextInput } from './SKTextInput'
export { SKTextToolbar } from './SKTextToolbar'
export type { SKTextToolbarItem } from './SKTextToolbar'

// Lists
export { SKEntityRow, RowIcon, SKListHeader, SKListFooter, SKAdjacentLabel } from './SKEntity'
export {
  SKGenericEntity,
  SKMemberEntity,
  SKChannelEntity,
  SKMultiPersonDirectMessageEntity,
  SKUserGroupEntity,
  SKWorkspaceEntity,
  SKAppEntity,
  SKHeaderEntity,
  EntityOrnament,
  SK_SKILL_ORNAMENT,
  SK_SKILL_SET_ORNAMENT,
  SK_SKILL_ADJACENT_TEXT,
  SK_SKILL_SET_ADJACENT_TEXT,
} from './SKEntities'
export type { SKAdjacentText, SKCodeChannelStatus, SKEntityOrnament, SKEntityOrnamentSize, SKEntityProps, SKHeaderEntityOrnament, SKSwipeAction } from './SKEntities'
export { SKListRowAccessoryStack, renderAccessory } from './SKListCellAccessory'
export type { SKListCellAccessory } from './SKListCellAccessory'

// Helpers (UIColor+Extensions color math, the proportional radius)
export { darken, dynamicLighten, withAlpha, proportionalRadius, roundRectToScreenScale, cx } from './util'
