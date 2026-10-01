# Channels and people (iOS)

Creating, browsing, previewing and joining channels; the people directory and inviting people to the workspace; and
the pages a conversation opens from its header menu and its details: pins, files, apps, agents and search in the
conversation. Measured from Slack's iOS source.

**Updated to slack-objc main @ 14b3cbaf (2026-09-30).** First written against the June snapshot (`cd22922`). What
changed since June:

- Add Members rows are `SKMemberEntity` **.small** with an always-visible one-line subtitle (56.33 pt), not .medium;
  "Already in channel" replaces "Already in this channel"; frontline-restricted people read "Only admins can add" /
  "Cannot be added to Slack Connect channels" (§1.5).
- Name and visibility error banners lost their explicit caption font: the error text is the banner's `.body` 17 (the
  generic hint stays caption 13). The name field's "#" ornament is `contentTertiary`, not `.sk_foreground_high` (§1.3).
- Search in a conversation: the header's Done is UIKit's system done item with glass styling, a prominent checkmark
  circle in the tint, not the text "Done"; the find bar's field is inset 16 pt; the header menu's Search opens the find
  bar when `ios_find_in_channel` is on (still off) (§9).
- Legacy colors became CoreColorSet tokens: the browser's search rule is `outlineTertiary` (was primary foreground at
  25 %), the Pins empty state `baseSecondary`, the Apps add-row icon `contentPrimary`, Search's create/invite tiles
  `highlight1.baseInverse` (§2, §6, §8).
- Frontline workers get no "Create Channel" (Home's action sheet, the browser's Create). The picker's network error is
  the generic "Something Went Wrong" empty state. Search People adds an "Org Chart" row (§1.1, §2, §4).
- Files moved modules: `NavigationManager` and `ChannelPickerCoordinator` → `Modules/Features/LegacyNavigation`,
  `SearchInChannelRouteExecution` → `Modules/Features/Find`, the navigation controller → `Modules/UIInfra/NavigationController`.

Conventions (see `README.md` in this folder):

- Citations are `path:line`, relative to the repo root of `slack-objc-latest` (main @ `14b3cbaf`). Snapshot PNGs are
  relative to the same root (its iOS_26 LFS objects are pulled). @3x, so px ÷ 3 = pt.
- `Y:n` is line n of `Modules/Data/Strings/Implementation/localized_strings.yaml` (the key's line). Apostrophes in the
  values are the typographic ’ unless shown otherwise.
- Colors: CoreColorSet property → token (`primary.contentSecondary` = `dt_color_content_secondary`, light / dark in
  `sheets-menus.md` §0.6 and `slackkit-components.md` › Color tokens; hex from design-tokens `f76ac0a`,
  `reference/ios/vendor/design-tokens-f76ac0a/Colors.swift`, the commit the app pins now); legacy `.sk_*` colors in
  `theme-colors.md` §4.
- Fonts: SKFont case → Lato (body 17 Regular, bodyBold 17 Bold, bodyBlack 17 Black, smallBody 15, smallBodyBold 15
  Bold, smallBodyBlack 15 Black, caption 13, captionBold 13 Bold, micro 12, microBold 12 Bold, subtitleBold 20 Bold,
  title 22 Black, headline 28 Black).
- **No screen in this file has a snapshot test.** Every layout comes from the Swift constants plus the SlackKit
  component snapshots listed in §10. Where the clone has to stand in for the server (name validation, membership),
  it says so.

Abbreviations: `CC/` = `Modules/Features/CreateChannel/Implementation/`, `CNI/` =
`Modules/Features/ChannelNameInput/Implementation/`, `CVP/` = `Modules/Features/ChannelVisibilityPicker/Implementation/`,
`I2C/` = `Modules/Features/InviteToChannel/Implementation/`, `IP/` = `Modules/Features/InvitePicker/Implementation/`,
`UCP/` = `Modules/Integration/SlackKitPickers/Implementation/UserConversationPicker/`, `BD/` =
`Modules/Features/AnyConversation/Implementation/Plugins/ConversationBottomDrawerPlugin.swift`, `ITW/` =
`Modules/Features/InviteToWorkspace/Implementation/`, `IE/` = `Modules/Features/InviteEmail/Implementation/`, `IC/` =
`Modules/Features/InviteConfirmation/Implementation/`, `PI/` = `Modules/Features/PinnedItems/Implementation/`, `MG/` =
`Modules/Features/MediaGallery/Implementation/`, `AP/` = `Modules/Features/AppPicker/Implementation/`, `FIC/` =
`Modules/Features/FindInChannel/Implementation/`.

## 0. The clone's names

| Name | What | Props | Section |
|---|---|---|---|
| `create-channel` | sheet (form sheet, its own navigation stack) | none | §1 |
| `browse-channels` | screen | none | §2 |
| `channel-preview` | screen: a channel you aren't in, with the Join drawer | `{ conversationId }` | §3 |
| `people` | screen: the Directories screen on People (iOS has no people directory, §4) | none | §4 |
| `invite` | sheet: "Invite people to join your team" | none | §5 |
| `invite-by-email` | sheet: "Add by Email", then the confirmation | none | §5.3 |
| `conversation-pins` | screen: the conversation's Pins page | `{ conversationId }` | §6 |
| `conversation-files` | screen: the conversation's Files page; `documents: true` is its "Documents" list | `{ conversationId, documents? }` | §7 |
| `conversation-apps`, `conversation-agents` | screens: the AppPicker list | `{ conversationId }` | §8 |
| `conversation-add-apps` | screen: "Add an app" / "Add an agent" | `{ conversationId, agents? }` | §8 |
| `search-in-channel` | screen: the conversation with the find bar | `{ conversationId }` | §9 |

Screens opened without a `conversationId` use the nearest conversation on the stack below them (Channel details'
Apps/Agents rows don't pass one), then the workspace's first conversation.

## 1. Create a channel

### 1.1 Entry points

- Home › Channels › "Add channel" row and the section's "+" (15+ channels): an action sheet "Create Channel"
  (`create_channel_title`, Y:4960), "Browse Channels" (`browse_channels`, Y:2612), "Cancel" (Y:3202)
  (`Modules/Features/Home/Implementation/Plugins/ConversationList/ConversationListHomePlugin.swift:539-569`); frontline
  workers get only "Browse Channels" and "Cancel" (`:562-564`, new since June). "Create Channel" → `CreateChannelRoute`
  (`Modules/Features/LegacyNavigation/Implementation/NavigationManager.swift:637-650`; the initial name is ignored).
- The compose button's creation menu: the "Channel" row (`channel`, Y:3693, capitalized) with "Organize teams and work"
  (`channels_creation_subtitle`, Y:3924) and `channel.svg`, only if you may create channels
  (`Modules/Features/CreationEntryPoints/Implementation/CreationEntryPointsPresenter.swift:253,266,279`;
  `…/EntryPoints/ChannelEntryPoint.swift:31-37`).
- The channel browser's "Create" (§2.1).
- Not allowed: an alert "Create a Channel" (Y:4874) / "Your organization's settings have changed and may limit who can
  create channels. Contact an Admin or channel Owner to add people." (Y:4956) / "Ok" (Y:13603)
  (`CC/CreateChannelRouteExecution.swift:22-51,87-113`). The clone always allows it.

### 1.2 Container

- One modal: the default `.formSheet` (a full-height card on iPhone, no grabber, swipe to dismiss)
  (`Modules/UIInfra/Architecture/Implementation/Navigation/ModallyPresentableFeature.swift:64-68`) holding one
  navigation stack (`CC/CreateChannelFeature.swift:119-126`). Steps after the first are pushed (UIKit push, back caret
  `caret_left_full.svg`, `SKNavigationController.swift:68-81`).
- Organizations with several workspaces first get a workspace picker (`CC/CreateChannelModeProvider.swift:79-97`); the
  clone has one workspace, so it starts at the name.
- Background `basePrimary` on every step (`SKList.swift:584`). Titles are an `SKNavigationTitle` (title Lato Black 17
  contentPrimary, subtitle Lato 15 contentSecondary; `SKNavigationTitle.swift:70-88`). Bar button titles are UIKit's
  system font in the bar tint `highlight1.content` (`Modules/UIInfra/SlackKit/Implementation/Global/SLAppearance.swift:37`).

### 1.3 Step 1: Name (`CNI/`)

| Part | Value | Source |
|---|---|---|
| Title | "Create a Channel" (`create_a_channel`, Y:4874), no subtitle | `CNI/ChannelNameInputPresenter.swift:67-74` |
| Left | the automatic close button (SF `xmark` in a glass circle) as the stack's first screen | `CNI/ChannelNameInputFeature.swift:71-79`, `UIViewController+CloseButton.swift:61-77` |
| Right | "Next" (`next`, Y:12867), `.plain` on iOS 26; enabled when the name isn't empty; an 18 pt `SKSpinner` (medium, darkOnLight) replaces it while the name is checked | `CNI/ChannelNameInputViewController.swift:65-82`, `CNI/ChannelNameInputPresenter.swift:36-38,67` |
| List | one section: header, input row, banner row; row separators on (1 px `outlineTertiary` under each row); a blank 8 pt footer | `CNI/ChannelNameInputPresenter.swift:41-52` |
| Header | `SKHeaderEntity` M "Name" (`name`, Y:12685): smallBodyBold contentPrimary, 8 + 12 top, 12 bottom, 16 sides (50 pt) | `SKHeaderEntity.swift:82-88,466-477` |
| Input row | `SKSingleLineTextInputEntity`, borderless (no border, no radius, zero field insets), row margins 12/16/12/16 → 48 pt | `CNI/ChannelNameInputPresenter.swift:80-102`; `SKSingleLineTextInputEntity.swift:78-111` |
| Ornament | `svgChannel` → `channel.svg`, 20 pt in a 24 pt box at x 16, `contentTertiary` #5e5d60 / #9a9b9e (`Colors.swift:212`; June `.sk_foreground_high`, #1d1c1d / #d1d2d3 at 50 %); stays "#" for private channels | `CNI/ChannelNameInputPresenter.swift:88-93` |
| Text | Lato 17 contentPrimary from x 52 (16 + 24 + 12); no autocapitalization, no autocorrection; the clear ⓧ while editing with text | `SKTextField.swift:45-53,387-401`; `CNI/ChannelNameInputPresenter.swift:94-95` |
| Placeholder | "project-pigeon" (`create_channel_name_placeholder`, Y:4936) in `.sk_black_high_contrast` (#1d1c1d at 50 % in both modes) | `CNI/ChannelNameInputPresenter.swift:85-87`; `SKLegacyColors.swift:157,162` |
| Banner row | `SKBannerEntity` (margins 12/16/12/16) with an `SKBanner` .regular: tone genericLight, caption 13, "Channels are where conversations happen around a topic. Use a name that’s easy to find and understand." (`channels_are_where_conversations_happen`, Y:3920); on an error tone .error with the error text, `<bold>` spans bold, in the banner's own `.body` 17 (the Sept source builds it with `Text(format:spanOperationGroups:)` and no font, so `Banner.swift:371` falls back to the .regular font, `SKBanner.swift:139-146`; June set caption 13) | `CNI/ChannelNameInputPresenter.swift:104-144` |
| Focus | the field becomes first responder when the screen appears | `CNI/ChannelNameInputViewController.swift:36-39` |

There is no description, topic or privacy control on this step, and no character counter.

**Name rules.** On every keystroke the text is trimmed of leading and trailing spaces and tabs, and if anything was
trimmed one "-" is appended: "my " → "my-", " my" → "my-" (`Modules/Foundation/StringExtensions/Implementation/String+Extensions.swift:85-92`,
`CNI/ChannelNameInputInteractor.swift:58-64`). Nothing else happens client-side: "Next" calls `conversations.validateName`
and the server decides (`CNI/ChannelNameInputInteractor.swift:65-88`). Typing clears the error. Errors
(`CNI/ChannelNameInputPresenter.swift:146-174`):

| Server code | Text (key, Y) |
|---|---|
| `invalid_name_required` | "Give your channel a name to continue. You can always change the name later." (`give_your_channel_a_name_to_continue`, 7657) |
| `invalid_name_punctuation` | "Channel names can’t contain spaces or punctuation. Use dashes to separate words." (3841) |
| `invalid_name_maxlength` | "Channel names can’t be longer than 80 characters." (3838) |
| `invalid_name_specials` | "Channel names can’t contain special characters or Upper case letters. Use dashes to separate words." (3845) |
| `name_taken` | "That name is already taken by a channel, username, or user group in **%@**." (21186), the workspace name |
| `invalid_name` | "**%@** is invalid." (3822), the name |
| anything else | "For some weird reason, that didn’t work. Please try again to continue." (7332) |

The clone checks locally (the server's rules aren't in the client): empty → required; more than 80 characters
(`ChannelPropertiesClientSideValidationRules.maxCharactersInChannelName`,
`Modules/Data/DataModels/Implementation/Helpers/ChannelNameUtility.swift:13`) → maxlength; spaces or ASCII punctuation
other than `-` and `_`, or only dashes and underscores → punctuation; upper-case letters or other symbols → specials; a
channel, person or user group already called that → taken.

### 1.4 Step 2: Visibility (`CVP/`), pushed

| Part | Value | Source |
|---|---|---|
| Title | "Create a Channel", subtitle "#" + the name | `CVP/ChannelVisibilityPickerPresenter.swift:53-56` |
| Left | back caret | `SKNavigationController.swift:68-81` |
| Right | "Create" (`create`, Y:4865), `.prominent` on iOS 26 (a filled capsule in the tint, white title); disabled with nothing selected; the spinner while creating | `CVP/ChannelVisibilityPickerViewController.swift:54-71`, presenter `:61` |
| Header | `SKHeaderEntity` M "Visibility" (`visibility`, Y:23333) | presenter `:47-51` |
| Rows | `SKGenericEntity` .medium, no ornament, title wraps, a trailing `SKRadioButton`; tapping the row selects it; no separators | presenter `:67-88`; `SKEntitiesListAdapter.swift:108-122` |
| Public | "Public - Anyone in **%@**" (`public_channel_visibility_in_team`, Y:15384), the workspace name bold; no subtitle | presenter `:163-175` |
| Private | "Private - Only specific people" (Y:15235) with "Can only be viewed or joined by invitation." (Y:15238) in caption contentSecondary | presenter `:172-180` |
| Default | Public, unless the team's `default_create_private_channel` | `CVP/ChannelVisibilityPickerInteractor.swift:114-137` |
| Radio | 20 pt, 2 pt ring; selected a `highlight1.outline` ring and a 10 pt `highlight1.content` dot (both #1264a3 / #2ba5ce); unselected an `outlinePrimary` ring | `SKRadioButton.swift:20-46` |

Create calls `conversations.create` (name, is_private) and stores the channel as joined
(`Modules/NetworkPersistence/ConversationNetworking/Implementation/HttpActions/ConversationsCreateAction.swift:35-50`); errors become an error banner
row under the radios, its text in the banner's `.body` 17 as in §1.3, with the §1.3 texts plus "Your organization's
settings have changed and may limit who can create channels. Contact an Admin or channel Owner to add people."
(`create_channel_restricted_action`, Y:4956) and "Your organization has reached the limit of channels it can create."
(`too_many_conversations_for_team`, Y:21910) (presenter `:90-106,128-160`). A workspace that allows only one kind shows a
genericLight caption banner instead: "This workspace only allows you to create public channels." (Y:23899) / "…private
channels." (Y:23896) / "This workspace does not allow you to create channels." (Y:23871) (presenter `:107-119,183-196`).

### 1.5 Step 3: Add Members

After the create succeeds the stack's screens are **replaced** by Add Members (it slides in like a push, no back
button) (`CC/CreateChannelFeature.swift:373-384`), configured for channel creation
(`I2C/Helpers/I2CInvitePickerConfigFactory.swift:81-130`):

| Part | Value | Source |
|---|---|---|
| Title | "Add Members" (`add_members`, Y:785) | `I2CInvitePickerConfigFactory.swift:118` |
| Left | `svgClose` → `close.svg` icon (VoiceOver "Close", Y:4081) | `:83-86`, `IP/InvitePickerViewController.swift:96-102` |
| Right | "Add" (`add`, Y:639), plain, disabled until someone is picked and no token has an error | `:122`, `IP/InvitePickerViewController.swift:291-303` |
| Stack | Add Everyone row → token field → 1 px `outlineTertiary` rule → (16) info banner (16 pt sides) → (16) list | `IP/InvitePickerViewController.swift:104-182,268-276` |
| Add Everyone | only from channel creation when the initial list has ≤ 10 people (`addEveryoneVisibilityMembersThreshold`): `SKGenericEntity` .medium "Add Everyone" (Y:748) / "Everyone in your workspace will be added to this channel." (`everyone_in_your_workspace`, Y:6528) with a checkbox; **checked, with everyone selected, on first load**; checked again whenever all of them are | `IP/InvitePickerDisplayProvider.swift:310-333`; `IP/InvitePickerInteractor.swift:220-235,361-400`; `Modules/Integration/Onboarding/Interface/OnboardingConstants.swift:18-20` |
| Token field | insets 4/16, 8 between tokens, 48 → 108 pt tall, placeholder "Laura, @mahesh, name@example.com" (Y:17077) in body contentSecondary; not focused automatically | `TokenizedSearch/Interface/Views/TokenSearchInputStyle.swift:12-26` |
| Info banner | `SKBanner` .regular genericLight, body text, `svgEmojiObjects` ornament in contentPrimary, a delete ✕ accessory: "**Working with external people from other organizations?** Simply type their email above." (`invite_slack_connect_prompt_formatted`, Y:10048) when you can invite internal and external people (the sponsored-connection variant adds "It’s free for them to join.", Y:10059; a guest-restricted channel shows an info banner instead, `only_members_guests_not_allowed_banner`); gone once you start editing the field or tap ✕ | `I2C/InviteToChannelInvitePickerAdapter.swift:224-230,483-554` |
| Rows | `SKMemberEntity` **.small** with `secondaryTextVisibility: .always` (Sept 2026; June .medium): a 24 pt avatar with presence, the name bold, one truncating caption line under it — the title, or "Already in channel" (`already_in_channel`, Y:1739; June "Already in this channel") for members, who get the deactivated look (grayscale avatar, tertiary text), no checkbox and no tap; frontline-restricted people read "Only admins can add" (`cannot_be_added_to_this_channel`, Y:3231) or, in Slack Connect channels, "Cannot be added to Slack Connect channels" (Y:3227), disabled with their avatar in color; guest-restricted people get the deactivated look; everyone else a checkbox. 56.33 pt a row (`SKMemberEntitySnapshotTests/testMemberEntitySmallAlwaysVisibleSecondaryText@3x.png`) | `IP/InvitePickerDisplayProvider.swift:520-569`; `SKMemberEntity.swift:151-187,463-469` |
| No matches | "No matches found" (Y:12991) / "Try using their email instead" (Y:22317), `svgSearch` in contentPrimary, an M row | `IP/InvitePickerDisplayProvider.swift:604-620` |

The ✕ and "Add" end the same way: the modal closes and the new channel opens (`CC/CreateChannelFeature.swift:392-414`;
`I2C/Root/InviteToChannelRootFeature.swift:601-607,753-764`). People are added without a toast.

### 1.6 After creating

- **Toast**: 0.2 s after Add Members appears, an `SKToast` "Channel\ncreated" (`channel_created`, Y:3720, a real line
  break) with `toast_checkmark`, 1.3 s (`CC/CreateChannelFeature.swift:386-389`; look in `sheets-menus.md` §5.3).
- The channel opens with the `.createChannel` context; the only effect is confetti behind `ios_channel_creation_confetti`
  (off) (`CC/CreateChannelFeature.swift:403-414`; `AnyConversationViewController.swift:53,322-327`).
- Its history starts with the channel header: the name (Lato Black 28), "You created this channel today. This is the
  very beginning of the #name channel." (`you_created_this_channel_at_date` Y:24311 / private 24315, `today_lowercased`
  Y:21790, `beginning_of_x_channel` Y:2426) and the "Add description" / "Add people" buttons
  (`Modules/Features/MessageTranscript/Implementation/Plugins/ConversationHeader/ChannelHeaderTransformer.swift:168-189,320-436`),
  then the server's join message "joined #name" (`joined_x_channel`, Y:10447).
- Home lists it in Channels, A–Z (`Modules/Features/Home/Implementation/Plugins/ConversationList/Pipelines/Pipes/ConversationGrouping/SectionsReadsFinalGroupingPipe.swift:205-275`).

### 1.7 Gaps

- No snapshots of any step. The bar buttons' iOS 26 look (plain text, prominent capsule) is UIKit's.
- The server's name rules are approximated (§1.3). The workspace picker and the Solutions templates variant
  (`ios_solutions_add_to_channel`, off) aren't built.
- Inviting by email from Add Members (the "**Invite** %@" row and its extra screens) isn't built: an email there finds
  no one ("No matches found"). Add Members' paste handling and error tokens aren't built either.
- The clone's keyboard doesn't follow the field's autocapitalization (it always starts shifted).

## 2. Browse channels

### 2.1 Presentation

`NavigationManager.showChannelBrowser` → `ChannelPickerCoordinator` → `UserConversationPickerFactory.paginatedChannelPicker`
(`Modules/Features/LegacyNavigation/Implementation/NavigationManager.swift:432-465`; `Modules/Features/LegacyNavigation/Implementation/ChannelPickerCoordinator.swift:87-176`).

| Part | Value | Source |
|---|---|---|
| How | presented modally from Home (Cancel on the left; a `caret_left_full` "Back" icon in an iPad side panel); with a `.push` context it's pushed and the left item is the navigation back button, or the `caret_left_full` "Back" icon when the browser is the stack's root | `ChannelPickerCoordinator.swift:87-111,139-159` |
| Title | "Channels" (`channels`, Y:3917) | `:172` |
| Right | "Create" (`create`, Y:4865), a plain `UIBarButtonItem` (system font, tint `highlight1.content`); opens §1 and opens the new channel the same way; none for frontline workers (new since June) | `:161-164,231-244`; `UCP/Configuration/UserConversationPickerConfiguration.swift:65-77` |
| Background | `basePrimary` #ffffff / #1a1d21 (`Colors.swift:42`; June `.sk_primary_background`, the same values) | `UCP/Controller/UserConversationPickerViewController.swift:195` |

The clone's `browse-channels` is the pushed variant (Activity pushes it by name).

### 2.2 Search

- `SKSearchBar` in 12/16/12/16 margins (`UCP/Views/UserConversationPickerSearchView.swift:23`), placeholder "Search"
  (`search`, Y:17029, not the default "Search…") (`:93-95`); 42 pt field: radius 12, 1 pt `outlineTertiary`, `baseSecondary`
  fill, magnifier and placeholder `contentTertiary` (`SKSearchBar.swift:134,318-326`). Not focused on appear. (A Liquid
  Glass capsule replaces the fill and border behind `ios_sksearchbar_liquid_glass`, default off, or the unified
  navigation architecture, `SKSearchBar.swift:34-38,147-149,174-188`.)
- Under it a 1 px rule of `outlineTertiary` #5e5d60/21 / #797c81/4d (`Colors.swift:302`; June `.sk_primary_foreground` at
  25 %) (`UserConversationPickerViewController.swift:201,218`).
- Typing ranks autocomplete results (up to 100); a leading "#" is ignored; clearing brings the full list back; the list
  scrolls to the top on every query change (`UCP/Models/UserConversationPickerQuery.swift:61-73`;
  `UserConversationPickerViewController.swift:290-291`).

### 2.3 List and rows

- Every non-archived channel the server returns, joined or not, sorted by name; one section, no header, no separators
  (`PaginatedChannelPickerAdapter.swift:72`; `PaginatableChannelAdapter.swift:23-47`; `UserConversationPickerViewController.swift:293`).
  Private channels show only when you're in them.
- Row: `SKChannelEntity` **.small** (the picker's `cellSize`): 44 pt, a 24 pt clear box holding the 20 pt icon
  (`channel_filled.svg`, `lock_filled.svg`; muted channels the outline `channel.svg` / `lock.svg` in contentTertiary),
  12 pt, the name in bodyBold contentPrimary, one line (`SKListCellPresentationObject+Channel.swift:22-56,142-172`;
  `SKChannelEntity.swift:187-208`). (A coding-agent channel's `codeChannelStatus` adds a status ornament, `:210-233`;
  none in the demo.)
- **No secondary text at .small**: no member count, no "Joined" mark, no accessories, no shared-channel icon
  (`SKChannelEntity.swift:178-185`; `shouldHideChannelInlineShareTypeIcon: true`, `ChannelPickerCoordinator.swift:170`).
  Member counts and a joined filter live in the Search tab's Channels results instead (§2.6).
- Pressed: the list highlight, inset 4, radius 12 (`SKEntityBackgroundView.swift:43-72`).

### 2.4 Empty, loading

| State | Look | Source |
|---|---|---|
| No channels | `SKEmptyState`: the `emoji_no_results` image (120), "No channel found" (Y:12930) | `UCP/Transformers/UserConversationEmptyResultDisplayableTransformer.swift:31-47,56-66` |
| No matches | the same image, "No channel matches these keywords." (Y:12933), outline "Clear search" (Y:4063) | `:36-41,68-78` |
| Network error | the generic error state (Sept 2026; June "Network Connection Failed"): its image, "Something Went Wrong" (`something_went_wrong_title`, Y:20396), "Try again in a few minutes." (`generic_error_empty_state_body`, Y:7564), an outline "Retry" (Y:16649) | `:50-53`; `SKEmptyState+GenericErrorEmptyState.swift:12-22` |
| Loading | small skeleton rows: a 24 pt box (radius 6), 12 pt, a 12 pt bar at 75 % width, margins 10 / 16 | `UserConversationLoadingStateDisplayableTransformer.swift:19-38`; `SKLoadingEntity.swift:22,219-235`; `SKLoadingPathHelper.swift:15-19` |

### 2.5 Tapping a row

The search clears, the browser goes away and the channel opens with `.reset` (the stack becomes Home → channel), joined
or not (`ChannelPickerCoordinator.swift:178-209`; `RootTabViewController.swift:122-123`). The clone pops the browser and
pushes the conversation (joined) or `channel-preview` (not joined), as New Message hands over to its conversation.

### 2.6 The other browse surface

The Search tab's Channels results (Activity's "Browse Channels" goes there, `ActivityFeature.swift:469`): "Create a
channel" (Y:4883) first, then `.medium` rows with "%d members" (Y:13569) / "1 member" (Y:13572), and a membership filter
"All channels" (Y:1619) / "Channels you've joined" (Y:3933) / "Other channels" (Y:14303)
(`Modules/Features/Find/Implementation/Subfeatures/Channels/SearchChannelsFeature.swift:89-111`, `SearchChannelsPresenter.swift:251-287`);
the create row's white plus sits on `highlight1.baseInverse` #1264a3 / #0a77a7 (`:102-107`, `Colors.swift:98`; June
`.sk_sapphire_blue`). That's the Search area's.

### 2.7 Gaps

- No snapshot of the browser. Pagination and the network states don't apply to the clone's local data.

## 3. Previewing and joining a channel

### 3.1 When

A channel that isn't frozen or archived and that you're not a member of gets the join drawer **instead of the
composer** — and, since June, instead of the context bar, whose content the drawer's dialog embeds (`BD:53-102,285-293`). The history shows as usual, without the new-messages line or the last-read banner,
and replying in threads is off (`ReadMarkerMessageTranscriptPipeline.swift:56-59`, `LastReadBannerPlugin.swift:251`,
`ThreadRootMessagePlugin.swift:297-319`). There is no "You're viewing…" string in iOS.

### 3.2 The drawer

| Part | Value | Source |
|---|---|---|
| Card (iOS 26) | an interactive `UIGlassEffect` card, radius 32 (16 + `ContextBarView.Constants.cornerRadius` 16), 16 pt from the sides, 12 pt above the bottom (where the composer sits) | `…/Plugins/ConversationBottomDrawerViewController.swift:92-104`; `Modules/Integration/ContextBar/Interface/ContextBarView.swift:30` |
| Margins | an `SKDialog`, 20/24/20/24 on iOS 26 | `BD:376-378,487-491` |
| Name | "#%@" (`channel_label_format`, `Modules/Data/Strings/Implementation/Unlocalized.swift:15-17`) in bodyBold contentPrimary, centered, wraps | `BD:470-472,494-503` |
| Purpose | the channel's purpose (description), 4 pt below (label → label), smallBody 15 fixed size, contentSecondary, centered, 2 lines | `BD:474-479`; `SKDialog.swift:231-244,272` |
| Button | 20 pt below: "Join Channel" (`join_channel`, Y:10326), `SKButton` .primary, size .medium (38 pt, smallBodyBold, radius 12, `.sk_lilypad_green`), full width | `BD:480-481`; `SKDialog.swift:276` |
| Tap the name or purpose | fades to 0.6 and opens Channel details, presented modally (`displayAsModal: true`) | `BD:298-310` |

Computed card height on a 402 pt screen: 20 + 20.5 + (4 + 18 per purpose line) + 20 + 38 + 20 ≈ 118 / 140 / 158.

### 3.3 Header

The same title pill ("N members • N tabs"); no huddle button (`ConversationHeaderState.swift:139`). In the header menu
Add and Star/Move are inactive and Notifications is hidden (`ConversationTabsMenuPresenter.swift:247,482-485,559-561`;
`ConversationTabsMenuInteractor.swift:287-297`).

### 3.4 Join

`conversations.join`; the drawer is replaced by the composer at once (no toast, no spinner) and the server posts
"joined #name" (`BD:312-325`; `ConversationsJoinAction.swift:53-58`). If the channel has added tabs, the tabs menu
opens, unless it's archived (`Modules/Features/AnyConversation/Implementation/AnyConversationInteractor.swift:624-639`). Only a full channel
alerts: "You can’t join this channel. Channel membership limit reached." (Y:10329) / "Okay" (Y:13613). Back leaves
without joining.

### 3.5 Gaps

- No snapshot. Slack Connect channels add a context bar inside the card (`ConversationBottomDrawerViewController.swift:233-246`); not built.
- The clone's own conversation screen doesn't know about membership: a non-member channel opened elsewhere (Search,
  a link) still shows the composer; `channel-preview` is the screen with the drawer.

## 4. People

iOS has **no people directory screen**. The DMs empty state's "Browse Teammates" (Y:2629) opens the Search tab with
People selected (`Modules/Features/DM/Implementation/DMFeature.swift:287-294`;
`Modules/Features/Find/Implementation/Subfeatures/Users/FindPeoplePlugin.swift:49-51`): "Invite a teammate" (Y:9898,
white plus on `highlight1.baseInverse` #1264a3 / #0a77a7, June `.sk_sapphire_blue`) first, then — new since June, when you
can see the org chart — "Org Chart" (`org_chart`, `svgHierarchy` on `.sk_lilypad_green`, opening your org chart), then
everyone A–Z as `SKMemberEntity` .medium (avatar + presence, bold name, status emoji, title)
(`…/Users/SearchPeopleFeature.swift:110-146,246-256,320-324`). A deep-link-only legacy list
titled "People" exists (`UCP/Coordinators/UserListCoordinator.swift:157-192`).

The clone's Directories screen (`src/app/screens/directories`, not an iOS screen) already lists people that way, so
`people` is registered as that screen.

## 5. Invite people to the workspace

### 5.1 Entry points

DMs' "Add Teammates" row (`add_teammates`, Y:854; "By SMS, email, or phone contacts", Y:2728;
`Modules/Features/DM/Implementation/DMPresentationObjectFactory.swift:354-390`), the DMs empty state's button, the
creation menu's "Invite" (Y:9892), Home's "Add Teammates" (flag `ios_refreshed_onboarding_v2`, off). All call
`InvitesNavigationService.presentInviteFeature` (`Modules/Integration/InvitesNavigation/Implementation/InvitesNavigationService.swift:75-208`):
people who can invite get the sheet below; people who can only ask get InviteRequest (not built).

### 5.2 "Invite people to join your team" (`ITW/`)

| Part | Value | Source |
|---|---|---|
| Presentation | legacy `SKBottomSheet` hugging its content (12 pt corners, 48 × 4 grabber, 70 % dim; `sheets-menus.md` §0.1); with `bottomsheetMigration` a self-sized native sheet; no bar, no close button | `ITW/InviteToWorkspaceFeature.swift:30-47` |
| Layout | an `SKDialog`, margins 24 (+10 top with the flag: `addsBottomSheetTopPadding`), basePrimary; 20 between kinds, 16 between buttons | `SKDialog.swift:231-244,251-256,271-280`; `ITW/InviteToWorkspaceFeature.swift:36-42` |
| Title | "Invite people to join your team" (Y:10031), subtitleBold 20, centered | `ITW/InviteToWorkspacePresenter.swift:82-92` |
| Share a Link | when the server allows a shared link: "Share a Link" (Y:18517), `.primary` .large with `share.svg`; under it (12 pt) "Expires in %d days. " (Y:18871) / "Expires in 1 day. " (Y:18868) in captionBold and a red "Deactivate link" (Y:5207) | `ITW/InviteLinkDetailDialogContentItem.swift:62-63,193-223,260-262` |
| Add from Contacts | "Add from Contacts" (Y:761), outlineDefault .large, `user_add.svg` | presenter `:108-117` |
| Add from Google Contacts | (Y:764), `brand_google_filled.svg`, only with Google sign-in | `:120-131` |
| Add by Email | "Add by Email" (Y:710), outlineDefault .large, `email.svg` | `:134-143` |
| Large button | 48.7 pt tall, radius 14, bodyBold, the icon 8 pt before the title | `SKButton+Types.swift:273-274,304-305,329-330` |

"Add by Email" closes the sheet and presents §5.3. "Share a Link" opens the share sheet (not built: the clone copies
the link and shows "Copied", Y:4671, as the share sheet's Copy action does, `CopyUIActivity.swift:24-76`).

### 5.3 "Add by Email" (`IE/`, `IP/`)

| Part | Value | Source |
|---|---|---|
| Presentation | a form sheet in a navigation controller | `IE/InviteEmailFeature.swift:47-75` |
| Bar | "Cancel" (`cancel`, Y:3202; a plain title item, but its VoiceOver label is "Close", `close` Y:4081, as the picker relabels every left item) · "Add by Email" (Y:710) · "Send" (Y:17429), Send enabled with at least one token and no error token, off while sending | `IE/InviteEmailFeature.swift:49-60`; `IP/InvitePickerViewController.swift:96-102,291-303` |
| Field | the token field (§1.5), no "To:" label; placeholder "name@%@" (Y:9911) with your email's domain, or "name@example.com" (Y:9915) for gmail.com, yahoo.com, outlook.com, hotmail.com; email keyboard, focused | `IE/InviteEmailFeature.swift:65,78-85`; `SearchInputTextView.swift:83-105` |
| Rule | 1 px `outlineTertiary` under the field | `IP/InvitePickerViewController.swift:155-176` |
| Rows (56 pt) | not yet an email: "Keep typing a full email" (`keep_typing_full_email`, Y:10524) with `paper_plane.svg` in a default box; a valid email: "**Invite** %@" (Y:10110) with `paper_plane.svg` on `.sk_frosty_blue` and a checkbox; tap or Return adds a token and clears the text | `IP/InvitePickerDisplayProvider.swift:250-289,383-405` |
| Token | `SKTokenView` with an icon ornament (`paper_plane.svg`), highlight1.base | `TokenCellViewModel.swift:133-142` |
| Valid email | local@domain, the domain with a dot and no `_` or `@`, the local part without spaces or `()<>[]:;@\,."` | `Modules/Foundation/StringExtensions/Implementation/EmailAddressUtility.swift:26-47` |

Send posts the invites (as members: no guest option, `IE/InviteEmailFeature.swift:144`) and **pushes the confirmation**
(there is no toast): since June only when the caller asks for it or some invites failed, and the invite sheet always
asks (`shouldShowSuccessConfirmation: true`, `ITW/InviteToWorkspaceFeature.swift:154-170`), so from §5.2 it still always
shows (`IE/InviteEmailFeature.swift:128-166`). A failure re-enables Send and alerts "Oops! Something went wrong."
(Y:14022) — "Your email is not verified. Please verify your email before you can send invites to this workspace."
(Y:9944) when that's the reason — with "Ok" (Y:13603) (`:162-165,209-223`).

### 5.4 Confirmation (`IC/`), pushed

- Bar: a `close.svg` ✕ on the left, no title (`IC/InviteConfirmationViewController.swift:40-47`).
- 16 pt below the bar: a 60 pt circle of `.sk_lilypad_green` at 15 % holding a 22 pt `check_filled.svg` in green, 16 pt,
  "Invitations sent" (Y:9882) in title (Lato Black 22) centered, 36 pt, the list (`IC/InviteConfirmationViewController.swift:18-26,89-127`).
- One `SKGenericEntity` .small row: the emails joined by ", " in bodyBold, "Invited as a member of %@. They’ll be able
  to receive and reply to messages by email until they join." (Y:10125), `svgUserAdd` in contentPrimary
  (`IC/InviteConfirmationPresenter.swift:164-184`; `IC/InviteConfirmationInteractor.swift:163-169`). External invitees get
  the same row with `svgEmail` (:186-206).
- A `.primary` "Done" (Y:5777) pinned above the bottom safe area, 16 pt in, dismisses (`IC/InviteConfirmationPresenter.swift:48-63`).

### 5.5 Gaps

- No snapshots of any invite screen. Contacts, Google contacts, the share sheet, phone invites and InviteRequest aren't built.

## 6. Pins

On iOS 26 "Pins" is a **page of the conversation** (server tab type `bookmarks`, "Pins" `channel_tab_bookmarks` Y:3881,
`pin.svg` / `pin_filled.svg`; `ConversationTabsBuilder.swift:181-183`, `ConversationPageDiffableDataSource.swift:270-282`)
hosting `PinnedItemsFeature`. The clone pushes it as a screen.

| Part | Value | Source |
|---|---|---|
| Header | the conversation's pill showing the page: the selected tab icon (`pin_filled`, 20 pt contentPrimary), "#name" in smallBodyBlack, "Pins" in caption contentSecondary; no huddle or "…" buttons | `ConversationHeaderPresentationObject.swift:225-230,266-306`; `AnyConversationDataTypes.swift:272-279` |
| Content | message pins only, newest pin first (sorted by `created`), all at once | `PI/PinnedItemsInteractor.swift:70-86`; `Modules/DataService/SlackDataProviders/Implementation/Data Providers/Pins/PinsDataProvider.swift:73` |
| List | one section, row separators (1 px `outlineTertiary`), basePrimary | `PI/PinnedItemsPresenter.swift:61-64` |
| Row | `MKMessagePreview`: 36 pt avatar (radius 9), the author in bodyBold, the time right-aligned in micro contentTertiary in the absolute style ("Today at 3:12 PM", "Yesterday at …", "Jun 3rd at …"; `today_at_x` Y:21784, `yesterday_at_x` Y:24199, `date_at_time` Y:5175), the text summarized in body `.sk_primary_foreground`, 2 lines, files as the preview strip; no reactions, no status emoji, no "Pinned by" | `PI/PinnedItemsPresenter.swift:80-116`; `MKCoreMessageProperties.swift:220-269`; `TimestampMapper.swift:31-33` |
| Tap | a reply pushes its thread at the message; anything else pushes the conversation at the message, highlighted | `PI/PinnedItemsInteractor.swift:119-135`; `PI/PinnedItemsFeature.swift:95-115` |
| Long press | a menu with "Unpin from Conversation" (`unpin_item_prompt`, Y:22604, `pin.svg`); it unpins at once and toasts "Pinned item removed" (Y:14777, `toast_checkmark`); a failure toasts "Couldn’t pin" (Y:4826, `icn_error_pin`, 2 s) | `PI/PinnedItemsPresenter.swift:117-125`; `PI/PinnedItemsFeature.swift:116-124`; `Modules/Integration/NetworkingIntegration/Implementation/HttpActions/PinMessageAction.swift:96-117` |
| Empty | `SKEmptyState` on `baseSecondary` #f8f8f8 / #1a1d21 (`Colors.swift:50`; June `.sk_foreground_min_solid`, #f8f8f8 / #212428): the `placeholder_pinning` illustration (190 × 115, aspect-fit in the 120 pt box), no title, body "Pin important items by tapping the message or file, then tapping "…"" (`pin_how_to_by_tapping_ellipsis`, Y:14750) | `PI/PinnedItemsPresenter.swift:48-59`; `App/Resource/SlackAppResources/SlackApp.xcassets/Empty Data Set/placeholder_pinning.imageset/` |
| Title (unused in tab context) | "Pinned Messages" (Y:14780) | `PI/PinnedItemsViewController.swift:16` |

Gaps: the clone's messages carry who pinned them but not when, so "newest pin first" is newest message first. The
long-press menu is the clone's pull-down menu, not UIKit's context menu with the row lifted. The page's title pill isn't
tappable (iOS opens the tabs menu from it).

## 7. Files in a conversation

The "Files" page (server tab `files`, "Files" Y:3887, `files.svg` / `files_filled.svg`; `ConversationTabsBuilder.swift:201-207`)
hosts `MediaGalleryFeature`. With `ios_channel_links_in_files_tab` off (the default) it's the single scrolling page below
(`MG/MediaGalleryFeature.swift:114-125`); the flagged "Files & Links" page with Files / Media / Links pills isn't built.

| Part | Value | Source |
|---|---|---|
| Header | the pill with `files_filled`, "#name", "Files" | as §6 |
| Background | `basePrimary` #ffffff / #1a1d21 (June `.sk_primary_background`, the same values) | `MG/MediaGalleryViewController.swift:60` |
| Documents header | `SKHeaderEntity` M "Documents" (Y:5745) + " - N" when there are any; "Show All" (Y:18938) when N > 3 | `MG/MediaGalleryPresenter.swift:143-159` |
| Document rows | at most 3; `SKGenericEntity` .medium: the file-type box (36, radius 9, the type's palette _50 with a white glyph), the title (body, 3 lines), "%@ · %@" (`search_file_metadata`, Y:17086) uploader · relative date (caption, 2 lines) | `MG/MediaGalleryPresenter.swift:126-141,274-289`; `MG/MediaGalleryInteractor.swift:86-87,130` |
| No documents | an M row "No documents shared yet." (`no_documents_new`, Y:12958) with `files.svg` in contentSecondary on a `surfacePrimary` box | `MG/MediaGalleryPresenter.swift:47-54,107-124` |
| Media header | "Images & Videos" (Y:9592) + " - N", a header-style row | `MG/MediaGalleryPresenter.swift:161-171` |
| Month sections | "This Month" (Y:21553), "Last Month" (Y:10570), else "MMMM yyyy"; `SKHeaderEntity` .small with the title in smallBodyBold contentPrimary | `MG/MediaGalleryPresenter.swift:173-182`; `MG/FileSegmenter.swift:11-62` |
| Grid | 3 square tiles a row, edge to edge, each (width − 4) / 3, so the flow layout leaves 2 pt between columns; rows 1 pt apart; 1 pt above and below a section; no radius (`.none(.plain)`); videos get the duration badge 8 pt from the left and bottom; pressed 0.94 and alpha 0.6 | `MG/MediaGalleryLayoutDelegate.swift:13,72-101`; `MG/MediaGalleryViewController.swift:53-55`; `MG/MediaGalleryCollectionImageViewCell.swift:17-18,77-89`; `SKThumbnailAttachment.swift:72-75,469-471` |
| No media | "No images or videos shared yet." (`no_images_or_videos_new`, Y:12985) with `image_input.svg` | `MG/MediaGalleryPresenter.swift:253-270` |
| Taps | a document or tile opens the file viewer; "Show All" pushes FilesList: title "Documents" over "#channel" (`SKNavigationTitle`), the same rows, paged | `MG/MediaGalleryFeature.swift:109-158`; `Modules/Features/FilesList/Implementation/FilesListPresenter.swift:130-169` |

Gaps: no snapshot of V1 (the V2 Media and Links tabs have some,
`Modules/Features/MediaGallery/Snapshots/iOS_26/MediaGalleryFeatureTests.MediaGalleryMediaTabViewControllerSnapshotTests/testLoaded@3x.png`).
Only message attachments are listed (canvases and lists aren't files of a conversation in the clone's data). The page's
title pill isn't tappable in the clone (iOS opens the tabs menu from it); Back returns to the conversation.

## 8. Apps and agents

Channel details' "In this conversation" rows "Apps" (`apps`, Y:2039, "Connect apps to power up your channel" Y:2046) and
"Agents" (Y:1223, "Connect agents to power up your channel" Y:1192; only with Salesforce access) push the AppPicker in
list mode, filtered `.excludingAgents` / `.onlyAgents` (`Modules/Features/ConversationDetails/Implementation/ConversationDetailsFeature.swift:341-369`).

| Part | Value | Source |
|---|---|---|
| Title | "Apps" (`apps_title`, Y:2052) / "Agents" (Y:1223); the add screen "Add an app" (Y:704) / "Add an agent" (Y:701) | `AP/AppPickerViewController.swift:153-163` |
| Right | "Edit" (Y:5994) ↔ "Done" (Y:5777), plain; none for externally limited channels | `AP/AppPickerViewController.swift:87-108` |
| Search | `SKSearchView` (66 pt, "Search" Y:17029, 1 px rule), then 4 pt | `UDC/SearchView/SKSearchView.swift:23-37,163-171`; `AP/AppPickerViewController.swift:27,58` |
| Add row | first, `SKGenericEntity` .small "Add an app" / "Add an agent" with `plus_filled.svg` in `contentPrimary` #1d1c1d / #f8f8f8 (`Colors.swift:200`; June `.sk_primary_foreground`, #1d1c1d / #d1d2d3); hidden while editing or searching | `AP/AppPickerPresenter.swift:105-116,290-303` |
| App rows | `SKAppEntity` .medium: the 36 pt app icon, the name in bodyBold, the adjacent tag "APP" (Y:1931) — "AGENT" (Y:1085) for agents — microBold contentSecondary on baseTertiary, radius 4; no subtitle | `SKListCellPresentationObject+Member.swift:172-200,237-252`; `SKAppEntity.swift:162-163` |
| Tap | the app's profile, pushed | `AP/AppPickerFeature.swift:153-168` |
| Edit mode | a `close.svg` button per row → alert "Remove %@ from %@?" (`remove_app_from_channel_prompt`, Y:16182) / "%@ will no longer be able to access or post to %@, unless you add it again." (`alert_app_lost_access`, Y:1595) / destructive "Remove" (Y:16166) + "Cancel" | `AP/AppPickerPresenter.swift:263-288`; `AppPickerHandlerService.swift:145-202` |
| Add screen | the same search, the apps not in the channel; tapping one adds it and pops back | `AP/AppPickerFeature.swift:129-151,170-189` |
| Empty | none in practice: the list shows only the Add row; an empty Add screen is blank | `AP/AppPickerPresenter.swift:307-339` |

The clone's apps "in" a conversation are the apps and bots that posted there, plus the ones added on the Add screen,
minus the removed ones; agents are apps whose `isAgent` is set (none in Northstar).

## 9. Search in a conversation

The header menu's "Search" (`search`, Y:17029; VoiceOver "Search in Channel", Y:17118) pushes the Search screen scoped
to the conversation (`SearchInChannelRoute`, legacy Find in `.searchInChannel`: the field in the bar with "Search #name",
Y:17041, or "Search direct message", Y:17125, dismissing any modal) — unless `ios_find_in_channel` (default **off**) is
on: since June the menu's Search then opens the find bar below instead (`ConversationTabsMenuFeature.swift:185-191`;
`Modules/Features/Find/Implementation/SearchInChannelRouteExecution.swift:26-51`, which goes to the global Search
behind `ios_search_navigate_to_global_search_from_channel`, also off). With the flag the header also gets a magnifier,
`svgQuickSwitch` "Search…" (`NewConversationHeaderHelperService.swift:788-795`), and ⌘F. The clone's `search-in-channel`
is the find bar, mounted on a copy of the conversation:

| Part | Value | Source |
|---|---|---|
| Header | back; the title pill, not tappable; only Done, which on iOS 26 is UIKit's system done item with glass styling: the SF Symbol `checkmark`, white, in a `.prominent` circle filled with the bar's tint `highlight1.content` (`SLAppearance.swift:37`); VoiceOver "Done" (Y:5777) (Sept 2026; June the text "Done", an `SKButton` .systemDefault .barButton in Lato Bold 17 `highlight1.content`) | `NewConversationHeaderHelperService.swift:402-418,786-787`; `HeaderHelperService.swift:229-235,413-414`; `SKBarButtonItem.swift:375-394,419-421` |
| Bar | a top drawer under the nav bar, margin 0; the `SKSearchBar` "Search…" (Y:17204) inset 16 pt from its sides (Sept 2026; June edge to edge), top and bottom flush, focused on appear; the list's top inset grows by it | `FIC/FindInChannelPlugin.swift:339-351`; `FIC/FindInChannelViewController.swift:44-51` |
| Composer | removed while the bar shows, with the floating conversation banner | `FIC/FindInChannelPlugin.swift:150-162` |
| Keyboard bar | Previous (`chevronDown`), Next (`chevronUp`), the count, Show All (Y:18938) in an iOS 26 glass capsule 48 pt, 16 from the sides, 12 above the keyboard | `FIC/FindInChannelViewController.swift:127-173`; `SKInputAccessoryView.swift:29-39,83-100,204-207` |
| Search | 300 ms after typing, "<text> in:<#C…>", newest first; a reply counts as its parent; the first result is jumped to; Next/Previous stop at the ends | `FIC/FindInChannelPlugin.swift:28,166-257,275-320` |
| Jump | the row scrolls to the top of the list and gets the pale-yellow highlight (#f2c744 at 20 %), gone 5 s after it's seen | `FIC/FindInChannelPlugin.swift:308-313`; `MessageTranscriptPipelineController.swift:55,294-301` |
| Close | only Done; it restores the composer and header | `NewConversationHeaderHelperService.swift:644-645`; `AnyConversationFeature.swift:600-603` |

The clone mounts the Search area's `FindInChannel` (`src/app/screens/search/FindInChannel.tsx`). Its count style and
Show All behavior differ from iOS (count Lato Bold 17 contentSecondary and "No results" before typing; Show All pushes
the channel's Search screen and keeps the bar): the Search area's to fix. Done lands you in the conversation at the
current result (`openMessage`).

## 10. Snapshot PNGs to compare against

None of these screens has a snapshot; these are the component baselines they're built from (all iOS 26, in
`slack-objc-latest`; component PNGs are a 2 × 2 grid since June: light / dark rows × normal / high-contrast columns,
unchanged pixels otherwise). The `SKSearchView` baselines also have `iOS_27` copies, pixel-identical to iOS_26:

| PNG | Use it for |
|---|---|
| `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKSingleLineTextInputEntitySnapshotTests/testTextInputEntityWithOrnamentAndText@3x.png` | the channel-name row: icon at x 19–36.7, text from x 52 |
| `…/SlackKitTests.SKBannerEntitySnapshotTests/testBannerRegularGeneric@3x.png`, `testBannerRegularError@3x.png`, `testBannerRegularWithDeleteButton@3x.png` | the name banner (generic and error) and Add Members' info banner |
| `…/SlackKitTests.SKNavigationTitleSnapshotTests/testSubtitle@3x.png` | "Create a Channel" over "#name" |
| `…/SlackKitTests.SKRadioButtonSnapshotTests/testIsOnAndEnabledRadioButton@3x.png`, `…/SlackKitTests.SKCheckboxSnapshotTests/testIsOnandEnabledCheckbox@3x.png` | visibility radios, Add Members checkboxes |
| `…/SlackKitTests.SKTokenViewSnapshotTests/testTokenResolvedMemberOrnament@3x.png`, `testTokenResolvedIconOrnament@3x.png` | person and email tokens |
| `…/SlackKitTests.SKMemberEntitySnapshotTests/testMemberEntitySmallAlwaysVisibleSecondaryText@3x.png` (and `…Deactivated`) | Add Members rows (Sept 2026: .small, 56.33 pt) |
| `…/SlackKitTests.SKChannelEntitySnapshotTests/testChannelEntitySmall@3x.png` | browser rows: glyph x 20–35.7, text from x 52.3 |
| `…/SlackKitTests.SKSearchBarSnapshotTests/testEmptySearchBarWithOrnament@3x.png` | the browser's and find bar's field (42 pt) |
| `…/SlackKitTests.SKEmptyStateSnapshotTests/testEmptyStateImageAndTitle@3x.png`, `testEmptyStateFull@3x.png` | the browser's empty states |
| `Modules/UIInfra/DeveloperComponents/Snapshots/iOS_26/DeveloperComponentsTests.SKDialogSnapshotTests/testDialog@3x.png` | the join drawer's and invite sheet's dialog layout (full-width 38 pt button) |
| `…/SlackKitTests.SKButtonSnapshotTests/testButtonPrimaryEnabled@3x.png`, `testButtonLarge@3x.png` | Join Channel; the invite sheet's buttons (48.7 pt) |
| `…/SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconLargeWithSecondaryText@3x.png` | document rows, invite rows |
| `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessagePreviewSnapshotTests/testMessagePreviewWithSecondaryText@3x.png`, `testMessagePreviewWithAttachments@3x.png` | pinned rows |
| `…/SlackKitTests.SKAppEntitySnapshotTests/testAppEntityMedium@3x.png` | app rows (the test draws the name Regular; production is Bold) |
| `Modules/UIInfra/DeveloperComponents/Snapshots/iOS_26/DeveloperComponentsTests.SKSearchViewSnapshotTests/testSearchViewWithoutCancelAndWithSeparator@3x.png` | the apps search view |
| `…/SlackKitTests.SKListHeaderSnapshotTests/testMediumShortTitle@3x.png`, `testMediumCollapsibleWithTextButton@3x.png` | "Name", "Visibility", "Documents - N … Show All" |

## 11. Gaps summary

- No screen-level snapshots anywhere in this file; sizes that depend on text metrics are computed.
- iOS 26 system chrome (glass bar buttons, the prominent "Create" capsule, the form sheet) is UIKit's.
- Server-side behavior is stood in for locally: channel-name validation (§1.3), membership and joining (§3.4), the
  apps and agents in a channel (§8), invites (§5).
- Flags kept at their defaults: `ios_find_in_channel` (off; the clone builds its bar anyway, §9),
  `ios_channel_links_in_files_tab` (off), `bottomsheetMigration` (off), `ios_solutions_add_to_channel` (off).
