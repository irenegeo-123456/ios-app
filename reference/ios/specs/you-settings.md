# You and settings (iOS): Set a Status, Edit Profile, Notifications, Preferences

**Updated to slack-objc main @ 14b3cbaf (2026-09-30).** What changed since June (cd22922):

- Colors: these screens moved off the legacy `sk_*` colors onto CoreColorSet tokens — `sk_primary_background` →
  `basePrimary`, `sk_primary_foreground` → `contentPrimary`, `sk_foreground_max(_solid)` → `contentSecondary`, the status
  pill's border `outlineTertiary`, Set a Status's "Clear" `important.content`, links `highlight1.content`, error borders
  `important.outline`, Color Mode rows `basePrimary` / `baseTertiary`. Still legacy: Resume notifications, Remove photo and
  Edit Profile's error text (`sk_raspberry_red`), the themes card shadow.
- Preferences: Swipe Actions is always listed (the `ios_swipe_actions` flag is gone) and Activity's right swipe defaults to
  Clear/Restore; Huddles lost "Raise to listen" ("Change music settings"); new conditional rows (Passkeys, Intune
  diagnostics, Disconnect Google, Commit / Pull Request in PR builds) and an internal "Prototypes" section, all off here;
  Administration no longer needs the upgrades flag; the app version reads 26.10.10 (370000).
- Pause Notifications opens with nothing chosen and Save disabled until you pick (June preselected 30 minutes).
- Set a Status: a "Scheduled" section behind the new `ios_scheduled_status` flag (off); the editor section's
  `.blankDivider()` header is hidden as the first section (this spec said 8 pt).
- Default reminder time: always a native self-sized sheet with the grabber (June: the legacy SKBottomSheet).
- Bars: the navigation controllers moved to `Modules/UIInfra/NavigationController`; `UnifiedNavigationTitleConfigurator`
  now sets titles, close and right items but keeps the legacy look on the default `.legacy` navigation variant. The
  route executions for Edit Profile and Settings moved into their feature modules. Title bar items are their text + 12 pt
  a side (measurements.md); the clone had 16.
- June's `InlineTestData.swift` fixture (status presets with durations, DND hours) is gone; its values are kept, cited to
  cd22922.

The flows the You screen (shell-navigation.md §4) and the profile open, measured from Slack's iOS source: Set a Status,
Edit Profile, the app-wide Notifications settings and their sub-screens, a conversation's notification settings (opened
from the header menu), and Preferences with Color Mode and the internal Themes picker.

Conventions (see `README.md` in this folder):

- Paths are relative to the root of `slack-objc-latest` (github.com/tinyspeck/slack-objc main @ `14b3cbaf`, 2026-09-30);
  snapshot PNGs are opened from the same checkout (LFS objects pulled). Citations marked "June" or "cd22922" point into
  the older `slack-objc-main` checkout. Hex values come from design tokens `f76ac0a` (`reference/ios/vendor/`).
- Strings are the English value, its key and the line of the key in
  `Modules/Data/Strings/Implementation/localized_strings.yaml` (`key` 1234). Swift uses `R.strings.<key>`.
- Icons: `SKIconManifest.svgFooBar` → `Modules/Data/Icon/ResourceBundle/Icons.xcassets/foo_bar.imageset`.
- Colors are the iOS property; hex values for core tokens are in `slackkit-components.md` › Color tokens and
  `sheets-menus.md` §0.6, legacy `sk_*` in `theme-colors.md` §4.
- Fonts are SKFont cases (`.body` = Lato 17, `.smallBodyBold` = Lato Bold 15, `.caption` = Lato 13, …).
- Abbreviations: `ES/` = `Modules/Features/EditStatus/Implementation/` (CSVC / CSP / CSI / CSF = CustomStatus
  ViewController / Presenter / Interactor / Feature), `EP/` = `Modules/Features/EditProfile/Implementation/`,
  `NS/` = `Modules/Features/NotificationSettings/Implementation/`, `CN/` =
  `Modules/Features/NotificationConversationNoiseSettings/Implementation/`, `CA/` =
  `Modules/Features/NotificationConversationNoiseAdvanced/Implementation/`, `NP/` =
  `Modules/NetworkPersistence/NotificationPreferences/`, `P/` = `Modules/Features/Preferences/Implementation/`,
  `TP/` = `Modules/Features/ThemePicker/Implementation/`, `NAV/` = `Modules/UIInfra/Architecture/Implementation/Navigation/`,
  `NC/` = `Modules/UIInfra/NavigationController/Implementation/`, `SK/` = `Modules/UIInfra/SlackKit/Implementation/`.
- "not found (looked in …)" means the value isn't in the source. Nothing here is guessed.

## The clone's names

| Name | What | Props | Section |
|---|---|---|---|
| `set-status` | sheet (form sheet; "Clear after…" pushes inside it) | none (the signed-in user) | §1 |
| `edit-profile` | sheet (form sheet) | `{ userId?, section?: 'header' \| 'contact' }` | §2 |
| `edit-profile-photo` | sheet (the photo options bottom sheet) | `{ userId? }` | §2.2 |
| `notifications` | sheet (form sheet with its own stack) and screen (pushed on a tab) | none | §3 |
| `notification-reminder-time` | sheet (the Default reminder time picker) | none | §3.9 |
| `notification-settings` | screen: a conversation's notification settings | `{ conversationId }` | §4 |
| `preferences` | sheet (form sheet with its own stack) and screen | none | §5 |
| `theme-picker` | sheet (fullScreen) | none | §5.4 |

The sheets' sub-screens are pages of one stack (`src/app/screens/you/ModalStack.tsx`: Preferences pushes Notifications'
pages too, as iOS does); registered as screens, the same pages push onto the tab's stack instead. Data:
`setMyStatus`, `useStatusPresets`, `useRecentStatuses` (`src/app/sheets/set-status`); `useNotificationPrefs`
(`src/app/screens/notifications/prefs.ts`; a conversation's level and mute are the store's `setNotify`); `useColorMode`
(`src/app/screens/preferences/colorMode.ts`, which drives the simulator's appearance).

---

## 0. Shared: presentation, bars, lists

### 0.1 Who presents what

`ModalPresentationController` keeps a modal's navigation controller only when it was presented with
`.allowsFuturePushesToThisModal`; a route with `.pushesToCurrentModal(IfAvailable)` pushes onto the top such modal and
otherwise presents a new one (`NAV/ModalPresentationController.swift:27-35`, `:111-124`, `:271-313`, `:349-371`).

| From | Route | Result |
|---|---|---|
| You's status pill | `EditStatusRoute` | a form sheet in its own nav controller (`ES/EditStatusRouteExecution.swift:5-9`, `ES/CustomStatusFeature.swift:171-178`) |
| You's profile row; profile › Edit Profile; Contact Information › Edit | `EditProfileRoute(initialSelectedSection:)` | a form sheet in a nav controller (`Modules/Features/EditProfile/Implementation/EditProfileRouteExecution.swift:7-11`) |
| You › Notifications | `NotificationSettingsRoute(entryPoint: .youTab)` | You's own modal takes no pushes (`Modules/Features/You/Implementation/YouRouteExecution.swift:10-14`), so a **new form sheet over You**, which takes pushes (`NS/NotificationSettingsRouteExecution.swift:11-26`) |
| You › Preferences | `SettingsRoute()` | a **new form sheet over You** with `.allowsFuturePushesToThisModal` (`Modules/Features/Preferences/Implementation/SettingsRouteExecution.swift:14-18`) |
| Preferences › Notifications | `NotificationSettingsRoute(entryPoint: .preferences)` | **pushed inside the Preferences sheet** (`P/PreferencesFeature.swift:222-223`) |
| Header menu › Notifications; Channel details › Notifications | `NotificationConversationNoiseSettingsRoute` | a plain push (`CN/NotificationConversationNoiseSettingsRouteExecution.swift:17-22`) onto the conversation's stack, or into the top pushable modal |
| Preferences › Themes (internal) | `ThemePickerRoute` | `.fullScreen` on iPhone, swipe to dismiss off (`TP/ThemePickerFeature.swift:23-31`) |

None of these features choose a style, so they're `.standard(.formSheet)` (`NAV/ModallyPresentableFeature.swift:64-68`,
`:345-354`) with swipe to dismiss allowed, except where noted. You → Preferences → (sub-screen) is therefore two sheets: the
You sheet recedes under the Preferences sheet (measurements.md › Sheets). (Route executions call `workspaceDependencies()`
now; the presentations are unchanged.)

### 0.2 Navigation bars in these modals

All of them use the legacy `SKNavigationController` (`NAV/FeatureNavigationController.swift:23-39`, `:50-55`:
`useModernNavController` defaults off; only the root tabs and the huddle sheet use `SKNavigationControllerLiquidGlass`).
Titles, close buttons and right items now go through `UnifiedNavigationTitleConfigurator`, which applies them the old way
on the default `.legacy` navigation variant (`Modules/UIInfra/Architecture/Implementation/Helpers/UnifiedNavigationTitleConfigurator.swift:104-200`;
`Modules/Data/Toggles/Interface/NavigationArchitectureVariant.swift:27-45`, `:130-140`); the unified variants aren't drawn:

- Title: `.bodyBold` (Lato Bold 17) in `contentPrimary`; iOS 26: a clear bar without the hairline
  (`Modules/UIInfra/NavigationController/Implementation/UINavigationBar+SlackStyles.swift:29-50`,
  `:75-98`). Screens that set an `SKNavigationTitle` as the title view get `.bodyBlack` (Lato Black 17) `contentPrimary`
  over a `.smallBody` `contentSecondary` subtitle (`SK/DesignerComponents/NavigationTitle/SKNavigationTitle.swift:70-88`).
- The first screen's close button: SF Symbol `xmark`, `contentPrimary`, "Close" (`close` 4081)
  (`NC/UIViewController+CloseButton.swift:61-77`).
- Pushed screens: an `SKBarButtonItem .back` — `svgCaretLeftFull` (`caret_left_full`) 20 pt in `contentPrimary`, "Back"
  (`back` 2370) (`NC/SKNavigationController.swift:68-117`,
  `SK/DeveloperComponents/BarButtonItem/SKBarButtonItem.swift:133-143`, `:241-296`). On iOS 26 UIKit puts bar items in Liquid
  Glass (a 44 pt circle or capsule, measurements.md); `SNAP/SKBarButtonItemTests/testBackButtons@3x.png` shows the caret.
- Title items with Slack's style (`SKBarButtonItem .title(style: .default)` → `SKButton .systemDefault()` at `.barButton`):
  Lato Bold 17 in `highlight1.content` (pressed: lightened 50 %), `contentSecondary` while disabled
  (`SKBarButtonItem.swift:153-213`, `SK/DesignerComponents/Button/SKButton+Types.swift:200-207`, `:224-234`, `:255-256`,
  `…/Button/SKButton.swift:242-251`; `testSystemSaveButton@3x.png`). Under Liquid Glass the item turns on its custom view's
  layout margins (`SKBarButtonItem.swift:170-172`): a title is its text plus 12 pt a side in the capsule (measurements.md:
  `testTitleButtons` 12.3, the system Edit / Save / Cancel 11–12.3). Plain `UIBarButtonItem` titles keep the system font
  in the bar's tint.

### 0.3 List anatomy

Every list is an `SKList` (`SKEntitiesList`) on `basePrimary` unless noted (`SK/CoreComponents/List/SKListPresentationObject.swift:456`):

- Rows: `SKGenericEntity .small` — margins 10 / 16, a clear 24 pt ornament box with a 20 pt icon, 12 pt to the text, 8 pt
  between accessories; the title `.body` `contentPrimary` (settings rows wrap: `primaryTextNumberOfLines 0`), the value as
  **secondary text under the title** (`.caption` `contentSecondary`), not as trailing text; pressed `baseTertiary`, inset 4,
  radius 12 (`SK/Helpers/EntityViews/SKEntityBaseView.swift:61-67`, `:400-408`; `SK/CoreComponents/List/SKList.swift:144-146`).
  Measured: 44 pt with one line, 56.33 with a subtitle, at least 51 with a switch.
- Headers: `SKHeaderEntity .medium` — 8 pt + 12 / 16 margins, `.smallBodyBold` `contentPrimary`, a `.smallBody`
  `contentSecondary` secondary line 4 pt under it, 50 pt with one line (`SK/DesignerComponents/Entities/SKHeaderEntity.swift:82-89`, `:467-496`).
- Footers: `.hairlineDivider` — 8 pt with a 1 px `outlineTertiary` line at its bottom (the section default); none after
  the last section (`SK/CoreComponents/List/Footer/SKListFooterView.swift:17-21`, `:106-113`; `SKList.swift:2087-2141`;
  `SK/CoreComponents/List/SKListPresentationObject.swift:153-154`). `.default` header (the section default): 8 pt on the
  first section, 0 elsewhere; `.blankDivider()`: 8 pt, but 0 on the first section (`hidesWhenFirstRow` defaults to true,
  `SK/CoreComponents/List/Header/SKListHeaderPresentationObject.swift:17`; `SKList.swift:2067-2085`).
- Accessories: chevron `caret_right_full` 20 pt `contentSecondary`; `SKSwitch` 51 × 31; `SKRadioButton` 20 pt; `.delete`
  = `svgClose` 20 pt `contentSecondary` (`SK/CoreComponents/List/Accessories/SKListRowAccessoryStackView.swift:77-131`).
- Tapping a switch row toggles its switch (`SK/DesignerComponents/Entities/SKEntitiesListAdapter.swift:109-137`, `:174-176`).
- Some screens pin the list 12 / 8 / 12 / 8 inside the view (Spacing.large / .medium): rows end up 8 pt narrower on each
  side (Schedule, a conversation's settings, Advanced) (§3.6, §4.1).

---

## 1. Set a Status (EditStatus)

No snapshot PNGs (none under `Modules/Features/EditStatus`). The building blocks have component snapshots (§6).

### 1.1 Presentation and bar

- Form sheet, title "Set a Status" (`set_a_status` 17691), background `basePrimary` (June `.sk_primary_background`), the
  list `basePrimary` (`ES/CustomStatusViewController.swift:48-55`). Close: `xmark` (`:55`), dismisses without asking even
  with changes.
- Right item, one of (`ES/CustomStatusInteractor.swift:789-806`):
  - **"Clear"** (`clear` 4039) in `important.content` #c01343 / #de678a (June `.sk_raspberry_red`), system font,
    VoiceOver "Clear Status" (`clear_status` 4066), when nothing changed and a status is set (`CSVC:21`, `:58-59`).
    Since September a pause-notifications change counts only against the value the active status loaded with, so being
    in DND alone no longer hides Clear (`CSI:790-793`);
  - otherwise the **check**: `UIBarButtonItem(icon: .svgCheck)` 25 × 25, the bar tint `highlight1.content`, "Save"
    (`save` 16880), enabled when something changed and the text is ≤ 100 characters (`CSVC:20`;
    `SK/CoreComponents/Icon/UIBarButtonItem+Icons.swift:16-21`). It's the icon on iOS 26 too (no text "Save" here).
  - while saving: an 18 pt spinner ("Saving…", `saving` 16939) and a 75 % `basePrimary` overlay (`CSVC:22-27`, `:68-87`).
- Swipe to dismiss is blocked while anything changed or while saving (`CSVC:98-103`, `CSI:531`, `:544`, `:799-800`).

### 1.2 The list (`ES/CustomStatusPresenter.swift:212-292`)

Sections in order: widget banner (optional) → editor → expiry → Scheduled (flag) → pause (flag) → Recent → Seasonal
(flag) → Out of office (Enterprise) → presets. Every section keeps the default hairline footer (none after the last).

| Section | Rows |
|---|---|
| Widget NUX (only if not seen and the Status widget isn't installed) | regular info `SKBanner`, heading "Add the Status widget" (`status_widget_nux_banner_title` 20700, `.bodyBold`), text "Set and clear your status right from your mobile home screen." (`status_widget_nux_subtitle` 20706), an X; tapping opens a dialog "Press and hold the home screen to find and add the Slack Status widget." (20703) with "Got it" (`got_it` 7721) (`CSP:274-288`; `ES/New/StatusWidgetNuxContentProvider.swift:31-86`) |
| Editor (header `.blankDivider()`: hidden as the first section, so the row sits right under the bar; 8 pt below the widget banner) | `SKSingleLineTextInputEntity .borderless` (below), then an error banner when the text is too long, then (flag `profileModerationCopy`, off) "Your status is subject to the **Slack Engagement Policy**" (15365) in `.caption` `contentSecondary`, centered (`CSP:151-162`) |
| Expiry (header `.blankDivider()`: 8 pt) | "Clear after…" (§1.4) (`CSP:212-215`) |
| Scheduled (flag `ios_scheduled_status`, added 2026-09-15, default off) | header "Scheduled"; rows: emoji, text, "From %@" / "To %@" lines (`scheduled_status_from` / `_to`, short ordinal dates with times) and a `svgClose` icon button that asks "Delete scheduled status?" with Delete status / Keep status; tapping a row fills the editor (`CSP:217-223`, `:295-361`; `CSI:465-479`, `:965-1003`; `CSF:244-262`). Not drawn |
| Recent (only when there are some) | header "Recent" (`recent` 15798); rows as presets plus a `.delete` X (users.customStatus.hide) (`CSP:51-63`, `:247-266`; `CSI:507-515`) |
| Presets | header "For %@" (`for_presets` 7324) with the workspace's name, "Status" (`status` 20667) without one (`CSP:105-111`) |

**Editor row** (`CSP:130-144`; `SK/DesignerComponents/Entities/TextInput/SingleLine/SKSingleLineTextInputEntity.swift:78-112`):

- Row margins 12 / 16 / 12 / 16; the `SKTextField` has no border, radius 0 and no text insets; `.body` `contentPrimary`;
  placeholder "What’s your status?" (`whats_your_status` 23636) in `contentTertiary`. Measured 46.33 pt, the text at x 52
  (`SNAP/SKSingleLineTextInputEntitySnapshotTests/testTextInputEntityWithOrnamentAndText@3x.png`).
- Emoji button: an interactive 24 pt `SKOrnamentBox` (clear) with a 20 pt glyph, 12 pt before the text. No emoji: `svgEmoji`
  in `contentSecondary`, pressed `svgEmojiFilled` in `contentPrimary` (June `.sk_foreground_max_solid` /
  `.sk_primary_foreground`), VoiceOver "Select Emoji" (`select_emoji` 17377) (`CSI:48-49`;
  `SK/DesignerComponents/OrnamentBox/SKOrnamentBox.swift:446-473`). Tap: the emoji picker with the keyboard hidden; the
  pick replaces the icon (`CSI:482-493`, `CSF:200-213`).
- **Default emoji**: `speech_balloon` 💬 shows as soon as there's text and no emoji was picked; emptying the text brings
  the smiley back, a picked emoji stays (`CSI:47`, `:597-633`). The team pref `custom_status_default_emoji` is never read.
- Clear (x) button: `close_circle_filled` 20 pt, `contentPrimary` 30 % (15 % pressed), "Clear text"
  (`clear_button_accessibility_label` 4051), only while editing with text; it clears the text **and the emoji and resets
  the expiry to Don't Clear** (`SK/DesignerComponents/TextField/SKTextField.swift:625-676`; `CSI:494-506`, `:635-654`).
- No autofocus; Return does nothing useful (no next field); scrolling drags the keyboard down.
- **100 characters**: typing isn't cut off; over 100 a small error `SKBanner` (12 / 8 padding, radius 10, `.caption`
  `contentPrimary` on `important.base`, 16 pt `svgWarningFilled` in `important.content`, row margins 12 / 16) says "Status
  must be 100 characters or fewer." (`status_must_be_n_characters_or_fewer` 20691, "%i") and the check is disabled
  (`CSI:46`, `:761-773`; `CSP:146-149`). No counter.

**Preset and recent rows** (`CSP:51-62`, `:97-103`): `.small`, an `.ornamentBox(.emoji)` (20 pt emoji in the 24 pt box),
the text `.body` (wraps), the duration title as `.caption` secondary text, no accessory (recents: the X). **Tapping one
fills the editor** (emoji, text, expiry) and doesn't save (`CSI:410-431`).

Presets are the workspace's `custom_status_presets` (`[emoji, text, canonical text, duration]`, `CSI:177-183`, `:305-319`,
`:886-916`). Slack's defaults with their durations, as June's fixture had them
(`Modules/NetworkPersistence/SlackAPI/Tests/Mocks/Fixtures/InlineTestData.swift:225-231` at cd22922; that fixture is gone
now — the i18n fixture lists the same five texts plus "On a call" (`slack_call`), without durations:
`Modules/NetworkPersistence/SlackAPI/Tests/Unit/Requests/TranslationsGetRequestTests.swift:38-62`):

| Emoji | Text | Duration → secondary text |
|---|---|---|
| `spiral_calendar_pad` | In a meeting | `1_hour` → "1 hour" |
| `bus` | Commuting | `30_minutes` → "30 minutes" |
| `face_with_thermometer` | Out sick | `all_day` → "Today" |
| `palm_tree` | Vacationing | `no_expiration` → "Don’t Clear" |
| `house_with_garden` | Working remotely | `all_day` → "Today" |

### 1.3 ExpiryDuration (`Modules/Data/DataModels/Implementation/Constants/ExpiryDuration.swift`)

| Case | Server string | Title (key) | Ends |
|---|---|---|---|
| dontClear | `no_expiration` | Don’t Clear (`expiry_dont_clear` 6582) | never (sent as 0) |
| thirtyMinutes | `30_minutes` | 30 minutes (`thirty_minutes` 21424) | now + 30 min |
| oneHour | `1_hour` | 1 hour (`one_hour` 13726) | now + 1 h |
| twoHours | `2_hours` | 2 hours (`two_hours` 22419) | now + 2 h (presets only; not on the Clear after screen) |
| fourHours | `4_hours` | 4 hours (`four_hours` 7426) | now + 4 h |
| today | `all_day` | Today (`expiry_today` 6588) | the start of tomorrow − 1 s (11:59:59 PM) |
| thisWeek | `week`, `this_week` | This Week (`expiry_this_week` 6585) | the start of the next weekend − 1 s (Friday 11:59:59 PM) |
| custom(date) | — | Custom (`custom` 5027) | that date |

(`:23-133`.) "Now" is the moment Save is tapped (`CSI:685`). A status loaded from the server always comes back as a custom
date (`CSI:292`).

### 1.4 "Clear after…"

- **Row** (`CSP:164-210`): `svgClock` in `contentPrimary` (June `.sk_primary_foreground`), "Clear after…" (`clear_after` 4042) `.body`, the choice
  as secondary text, a chevron. Custom: `DateFormattingUtilities.formatText("{date_pretty} {time}")` — "Today 5:00 PM",
  "Tomorrow 5:00 PM", "October 6th 5:00 PM" (", 2027" more than six months out), nothing for a past date (`today` 21781,
  `tomorrow` 21898, `yesterday` 24196, `st` 20533 / `nd` 12742 / `rd` 15523 / `th` 21138;
  `Modules/Data/I18n/Implementation/DateFormattingUtilities.swift:56-68`, `:118-266`; `CSI:929-937`). With flag
  `customStatusPauseNotif` (off) it reads "Duration" (`duration` 5923, `.bodyBlack`) with the choice as accessory text.
- **Screen** (`ES/New/StatusExpiration/`): pushed, title "Clear after…" (set with `configureDetailTitle`, drawn as before;
  `basePrimary`: `…ViewController.swift:20-23`), one section 8 pt down, `.small` radio rows in this
  order: Don’t Clear, 30 minutes, 1 hour, 4 hours, Today, This Week, Custom (`…Interactor.swift:16`,
  `…Presenter.swift:32-71`). Every choice goes straight to the editor; anything but Custom pops back (tapping the selected
  row too). Custom adds a date picker row under it: `UIDatePicker` compact, date and time, 5-minute steps, earliest the next
  :00 or :30, starting from the current choice's end time (now for Don't Clear); the row has 8 / 16 / 8 / 10 padding
  (`…Interactor.swift:49-153`; `SK/DeveloperComponents/DateTimePickerView/SKDateTimePickerEntity.swift:17-36`, `:106-221`).

### 1.5 Pause notifications (flag `customStatusPauseNotif`, `ios_custom_status_pause_notif.json` default false)

Shown only with the flag on and an expiry other than Don't Clear: `svgNotifications` in `contentPrimary`, "Pause
notifications" (`pause_notifications_sentence_case` 14618) `.bodyBlack`, "VIPs always allowed" (`vips_always_allowed`
23329) when `priority_dnd_override` is on, an `SKSwitch`. On save it pauses notifications until the expiry or resumes them
(`CSP:225-242`; `CSI:240`, `:561-572`, `:740-755`). Recent rows then add ", notifications paused" (13498, lowercased).

### 1.6 Save and Clear (`CSI:656-724`; `CSF:164-207`)

- Save: `users.profile.set` with `status_text`, `status_emoji` (":name:"), `status_expiration` (seconds, 0 = Don't Clear),
  `status_is_dnd`. Empty text and emoji is a clear. Then the toast **"Set Status"** (`set_status` 17709; not `status_set`)
  with `toast_checkmark`, and the sheet dismisses.
- Clear (and an empty save): empty text and emoji, expiration 0, toast "Status Cleared" (`status_cleared` 20670), dismiss.
- You's status pill X clears too ("Status Cleared", `Modules/Features/You/Implementation/YouFeature.swift:124-126`).

### 1.7 Where the end time shows

- You menu (flag `youMenu`, off): "Status does not clear" (`status_does_not_clear` 20676) or "Until %@"
  (`until_expiration` 22684) (`Modules/Features/YouMenu/Implementation/YouMenu.swift:235-269`).
- The You screen's pill shows no end time; its placeholder "What’s your status?" is `contentSecondary` (June
  `.sk_foreground_max_solid`) (`Modules/Features/You/Implementation/YouPresenter.swift:251-280`).
- Profile out-of-office banner: "%1$@ until %2$@" (14456).

---

## 2. Edit Profile (EditProfile)

No snapshot PNGs (none under `Modules/Features/EditProfile` or `ProfilePhotoPicker`).

### 2.1 Presentation and bar

- Form sheet, swipe to dismiss allowed, **no unsaved-changes prompt** (`NAV/ModallyPresentableFeature.swift:64-68`,
  `:345-354`). It always edits the signed-in user (`EP/EditProfileFeature+Dependencies.swift:61-66`).
- Title: an `SKLabel` title view, "Edit Profile" (`edit_profile` 6053) in `.bodyBlack` `contentPrimary`
  (`EP/EditProfileViewController.swift:89-91`, via `configureLabelTitle`). Left: `xmark` (`:62-64`). Right: "Save" (`save`
  16880), `SKBarButtonItem .title(.default)` (§0.2), now built by the presenter (`EP/EditProfilePresenter.swift:129-145`;
  VC `:70-86`), disabled until a value differs from where it started (typing the old value back disables it again), a
  spinner and a 70 % `basePrimary` overlay while saving (`EP/EditProfileViewController.swift:46-52`;
  `EP/EditProfileInteractor.swift:88-92`, `:208-230`).
- Only the section you came from starts open: the header (You, the profile's button) or the contact section
  (Contact Information › Edit) (`EP/EditProfileInteractor.swift:71`; `EP/EditProfileDataTypes+UserProfile.swift:17-28`).

### 2.2 Photo row (`EP/Views/EditProfilePhotoRow.swift`)

A centered stack, spacing 16, 16 pt above and below: the photo (`SKImageView` 160 × 160, aspect fill, radius 6), then
"Edit Photo" (`edit_photo` 6050), `SKButton .outlineDefault .medium`, 160 × 40; 248 pt in all (`:25-42`, `:82-217`). Its own
section with no header; a hairline footer. A locked photo: a 20 pt lock on the photo's top-right corner, no button.

**Photo options** (`EP/EditPhotoBottomSheet/EditPhotoBottomSheet.swift:26-110`): an `SKListBottomSheet` (the legacy
`SKBottomSheet`; a native self-sized sheet with `bottomsheetMigration`:
`Modules/Features/SKListBottomSheet/Implementation/SKListBottomSheetFeatureDeprecated.swift:120-132`) on `basePrimary`
(`…/SKListBottomSheetViewController.swift:165`; June `.sk_primary_background`):

| Section | Row (key) | Icon | Color | Action |
|---|---|---|---|---|
| header "Upload a new photo" (`upload_a_new_photo` 22813) | View photo library (`view_photo_library` 23258) | `.image` (icon-font glyph; nearest asset `image`) | `contentPrimary` (June `.sk_primary_foreground`) | the photo library |
| | Take a Photo (`take_a_photo` 21002) | `.camera` (glyph; nearest `camera`) | `contentPrimary` | the front camera |
| (no header; only when the photo isn't the default) | Remove photo (`remove_photo` 16293) | `svgTrash` | `.sk_raspberry_red` (still legacy), icon and text | `users.deletePhoto`, **no confirmation** |

A row dismisses the sheet, then acts (`Modules/Features/SKListBottomSheet/…/SKListBottomSheetStaticPlugin.swift:75-85`).
Picking a photo goes through a square crop ("Cancel" / "Choose") and uploads; no toast.

### 2.3 Sections and fields

The fields are the team's (`team.profile.get`): only `header` and `contact` sections, only `text` fields, sorted by
`ordering` (`EP/EditProfileContentProvider.swift:30`, `:101-130`, `:255-324`); which fields are editable now also comes
from server permissions (`editProfilePhoto`, `updateDisplayName`, `updateName`: `EP/EditProfileContentProvider.swift:156-168`,
`Modules/DataService/TeamProfile/Interface/UserProfileFieldEditability.swift`), email stays locked (`:34-37`). The header section is always titled
"Personal information" (`personal_information` 14704); the contact section keeps the team's label. Section headers are
`SKHeaderEntity .medium` with the collapse caret (`caret_down_full` `contentTertiary`, −90° when collapsed); a collapsed
section keeps its header and footer (`EP/EditProfilePresenter.swift:114-115`). With `ios_edit_profile_map_user_fields` off
(its default) Slack's fixture gives (`Modules/Features/EditProfile/Tests/Unit/EditProfileContentProviderTests.swift:452-672`):

| Section | Fields (label, ordering) |
|---|---|
| Personal information | Name (0), Title (1), Display name (2), Pronouns (3), Name Pronunciation (6) |
| Contact information | Email (0, always locked), Phone (2) |

(With the flag on the client adds "Full name" (`full_name` 7542), "Display name" (`display_name` 5526), "Pronouns"
(`pronouns` 15378, if the team shows pronouns) and "Email" (`email` 6151).) Every hint in the fixture is empty, so no
placeholders show; **there's no helper text and no client-side length limit**.

**A field** (`EP/EditProfilePresenter.swift:146-195`), three rows:

1. Label: `SKGenericEntity .small` (10 / 16), `.smallBodyBold` `contentPrimary` (June `.sk_primary_foreground`), 1 line.
   Locked fields start with the `.lockMedium` glyph (no SVG; nearest `lock`) in `contentPrimary` and a space (`:149-160`).
2. Input: `SKMultiLineTextInputEntity .border` — row margins 12 / 16, a 1 pt `outlinePrimary` border (`important.outline`
   with an error; June `.sk_raspberry_red`), radius 12, text inset 12 / 16, `.body` `contentPrimary`, placeholder
   `contentTertiary`; it grows with its text (an optional character counter and a maximum height are new, unused here);
   Return inserts a newline (`SK/DesignerComponents/Entities/TextInput/MultiLine/SKMultiLineTextInputEntity.swift:56-114`,
   `…/MultiLineTextInputEmbeddableViewController.swift:36-46`, `:255-303`). Locked: `contentTertiary` text on
   `baseSecondary`, not editable, VoiceOver "Locked field" (`a11y_text_field_is_locked` 291).
3. Error (after a failed save): `svgInfo` and the message in `.caption` `.sk_raspberry_red` (still legacy), wrapping (`:180-191`).

### 2.4 Save (`EP/EditProfileInteractor.swift:154-239`)

`users.validateName` for changed name fields, then `users.profile.set` with the changed keys (`real_name`, `display_name`,
`title`, `pronouns`, `fields`). Success dismisses, **no toast**. Field errors (`EP/EditProfileErrorParser.swift:10-48`):

| Server error | Message (key) |
|---|---|
| `invalid_name_specials`, `invalid_starts_with_at`, `invalid_name_punctuation` | Mostly, names can’t include punctuation. (Spaces and periods are fine.) (`invalid_characters_in_name_error` 9812) |
| `invalid_emoji_not_allowed` | Nice idea! But sadly, names can’t contain emoji. (`emoji_in_name_error` 6229) |
| `invalid_name_maxlength` | Names can’t be longer than 80 characters. (`name_too_long_error` 12731) |
| `invalid_name_required` | Unfortunately, you can’t leave this blank. (`empty_display_name_error` 6241) |
| `invalid_reserved_word` | That name’s already being used by Slack. (`name_reserved_error` 12725) |
| other | Sorry, an error occurred. Please try again. (20416), also as a `toast_error` toast |

Errors clear on the next keystroke.

---

## 3. Notifications (NotificationSettings)

No snapshot PNGs (none under `Modules/Features/Notification*` or `CustomizeMobileNotifications`).

### 3.1 The screen

- A form sheet over You (§0.1), or pushed inside Preferences. Title: `SKNavigationTitle` "Notifications" (`notifications`
  13451) (`NS/NotificationSettingsPresenter.swift:555-556`); right: `.questionCircle` → `svgHelp` 20 pt `contentPrimary`,
  "Help Center" (`help_center` 7876), opening the help article — the item is built by the presenter now
  (`NS/NotificationSettingsPresenter.swift:34-50`; VC `NS/NotificationSettingsViewController.swift:20-32`). Background
  `basePrimary` (`:21`; June `.sk_primary_background`).
- Every row is `.small` with an `ornamentBox` icon in `contentPrimary`; values are secondary text; **every change saves at
  once** (no Save button) (`NS/NotificationSettingsInteractor.swift:417-511`).

| # | Header | Row — secondary text | Icon | Accessory | Shown when |
|---|---|---|---|---|---|
| 0 | (`.default`) | small warning banner, no ornament: "If you want to be notified about **everything**, you’ll need to turn mobile notifications on." (22332; the `<bold>` span bold in the banner's own text style: `:106-136`) | — | — | desktop = everything and push off |
| 1 | How to notify you (`how_to_notify_you` 8006) | Mobile notifications (`mobile_notifications` 12430) | `mobile_notification` | switch: OS permission granted and `global_mobile` ≠ nothing | always |
| 2 | What to notify you about (`what_to_notify_you_about` 23614) | Let you know about (`let_you_know_about` 10838) — Everything (`everything` 6531) / Mentions and direct messages (`mentions_and_dms` 12042) / Custom (with mobile overrides) | `notifications_all_new_posts` (everything) / `notifications` | chevron → §3.2 | always |
| 3 | Also notify you about: (`also_notify_you_about` 1756) | Threads you follow (21680) | `threads` | switch `threads_everything` | always |
| | | New huddles (12831) — You'll see incoming huddles on your home screen. (24497) | `headphones` | switch `use_voip_huddle_invite` | always |
| | | Incoming messages (9676) — See every new message while you’re active in a workspace (17297) | `apps` | switch (default on) | always |
| | | VIP messages, even if paused (23314) | `vip` | switch `priority_dnd_override` | VIP access |
| | | VIP sound (`priority_sound` 15211) — the sound | `sound` | chevron → §3.5 (VIP) | VIP access and the switch on |
| | | Add channel keywords (713) — the keywords, or None (`none` 13165) | `key` | chevron → §3.7 | always |
| 4 | What to show in Activity (23617) | three switches | | | flags `ios_notification_show_in_activity` + `ios_activity_dm_opt_out_pref` (off) |
| 5 | Notification schedule (13301) | Allow notifications (1705) — Every day (6508) / Weekdays (23553) / Custom | `schedule_send` | chevron → §3.6 | always |
| | | Default reminder time (5280) — the time, or nothing until set | `clock` | chevron → §3.9 | always |
| | | Notify me on mobile (13523) — the timing (§3.4) | `mobile` | chevron → §3.4 | always |
| 6 | Sound & appearances (20505) | Sound (`sound` 20502) — the sound's name | `sound` | chevron → §3.5 | always |
| | | Include a preview (9673) — Disable this for extra privacy (5465) | `presentation` | switch `push_show_preview` | always |
| 7 | Exceptions to the defaults (6546), secondary "You've set specific guidance for the conversations below." (24398) | Channels (3917) — the count | `channel` | chevron → §3.8 | one customized channel |
| | | Direct messages (5461) — the count | `direct_messages` | chevron → §3.8 | one customized DM or group DM |
| 8 | Calendar (2734) | two switches | | | flag `mobile_huddles_jit` (off) |
| 9 | Troubleshooting (22261) | Troubleshoot notifications (22255) | `mobile_notification` | chevron → test runner | always |

(`NS/NotificationSettingsPresenter.swift:56-557`.) The Mobile notifications switch turns `global_mobile` to `nothing`, or back
to the desktop value (a legacy `nothing` desktop becomes `mentions_dms` first) (`NS/NotificationSettingsInteractor.swift:146-163`,
`:417-452`).

### 3.2 What to notify you about (NotificationGlobalDefaults) and Push overrides

- Pushed; `SKNavigationTitle` "What to notify you about". A warning banner "Your desktop and mobile notifications don’t
  match.\n**Edit Mobile Overrides**" (24542; the banner's `.caption` text, the link span bold in `highlight1.content` —
  June `.sk_primary_foreground` / `.sk_highlight`: `…Presenter.swift:28-33`)
  when they differ; header "Let you know about"; radio rows Everything (`notifications_all_new_posts`) and Mentions and
  direct messages (`notifications`; also selected for `nothing`); with push on, "Mobile notification overrides" (12427,
  `mobile_notification`, chevron) (`Modules/Features/NotificationGlobalDefaults/Implementation/NotificationGlobalDefaultsPresenter.swift:28-119`).
  A pick saves; mobile follows when it was equal (`NP/Implementation/NotificationPreferencesService.swift:209-222`).
- **Push overrides** (`mobile_overrides` 12433, CustomizeMobileNotifications): header "Mobile notification overrides" with
  "Impacts your mobile push notifications only, not Activity updates in Slack, or desktop notifications." (9595); radio
  rows without icons (global: Everything / Mentions and direct messages; a conversation: All new posts (1637) / Just
  mentions (10493), subtitled with its name); the option equal to desktop says "Same as desktop" (16877). Picking the other
  one asks "Are you sure?" (2089) / "That means your mobile and desktop notifications will be different." (12423) /
  Cancel / Save (`Modules/Features/CustomizeMobileNotifications/Implementation/CustomizeMobileNotificationsPresenter.swift:30-71`,
  `…Interactor.swift:77-134`).

### 3.3 Data model (`NP/Interface/`)

| Pref | Values | Default |
|---|---|---|
| `global_desktop`, `global_mobile` | `everything` / `mentions_dms` / `nothing` (legacy, shown as mentions) | `mentions_dms` |
| `global_mpdm_desktop`, `global_mpdm_mobile` | same | `everything` |
| `threads_everything` | bool | false |
| `global_keywords` | a comma-separated string | "" |
| `push_idle_wait` | −1 always, 0, 1, 2, 5, 10, 15, 20, 30 minutes | 0 |
| `mobile_sound`, `priority_mobile_sound` | §3.5 | `none` when missing (the fixtures: `b2.mp3`) |
| `push_show_preview` | bool | true |
| per conversation | `desktop`, `mobile`, `muted`, `suppress_at_channel`, `badge_all_unreads`, `follow_all_threads`, `temp_mute_expiration_ts`; unset = follow the global | — |

(`GlobalNotificationPreferences.swift:24-54`, `ConversationNotificationPreferences.swift:28-61`, `NoiseLevelPreference.swift:8-14`.)
Mobile overrides exist when mobile isn't `nothing` and differs from desktop (`NP/Implementation/NotificationPushOverrideService.swift:18-43`).

### 3.4 Timing (`Modules/Features/NotificationTiming/Implementation/`)

Pushed; title "Timing" (`timing` 21713); header "Send notifications:" (17561); radio rows "Always, even when I’m active"
(1802, −1), "As soon as I’m inactive" (15408, 0), "After I’ve been idle on desktop" (15405, writes 1); for "After…" a
second section with a `UIPickerView` wheel: 1 Minute (13777), 2 Minutes (22428), 5 Minutes (7204), 10 Minutes (21132), 15
Minutes (6902), 20 Minutes (22396), 30 Minutes (21430) (`NotificationTimingPresenter.swift:62-185`,
`NotificationTimingInteractor.swift:77-93`). The main list says "Always", "As soon as I’m inactive" or "After %@" (1068)
(`NS/NotificationPrefsFormatter.swift:13-52`).

### 3.5 Sound (`Modules/Features/NotificationSounds/Implementation/`)

Pushed; title "Sound"; one section 8 pt down (`.blankDivider(hidesWhenFirstRow: false)`); `.small` **radio** rows with
`svgSound` (`svgSoundOff` for None) in `contentPrimary` (June `.sk_primary_foreground`;
`NotificationSoundsPresenter.swift:44-75`): None (13334), Device Default (13313), Ding `b2.mp3` (13316), Boing `animal_stick.mp3` (13304),
Drop `been_tree.mp3` (13319), Ta-da `complete_quest_requirement.mp3` (13340), Plink `confirm_delivery.mp3` (13337), Wow
`flitterbug.mp3` (13346), Here you go `here_you_go_lighter.mp3` (13322), Hi `hi_flowers_hit.mp3` (13325), Knock Brush
`knock_brush.mp3` (13331), Whoa! `save_and_checkout.mp3` (13343), Yoink `item_pickup.mp3` (13349), Hummus `hummus.mp3`
(13328), Boop `boop.mp3` (13307), Boop Plus `boop_remix.mp3` (13310) (`NP/Interface/Data/NotificationSound.swift:11-28`,
`NotificationSoundsDataTypes.swift:37-56`). A pick saves and **plays the sound** (not None / Device Default)
(`NotificationSoundsInteractor.swift:48-91`).

### 3.6 Notification Schedule (`Modules/Features/NotificationSchedule/Implementation/`)

Pushed; title "Notification Schedule" (13298); the list inset 12 / 8; header "Allow notifications:" (1711); radios Every
day / Weekdays / Custom. Then (`.blankDivider`) "Start" (5620) and "End" (5664) with the time as accessory text, a tap
opening an inline `.wheels` `.time` picker under the row; or, for Custom, Monday … Sunday (5636 …) with "8:00 AM - 10:00 PM"
or "Notifications off" (13495) and a chevron to the day (a "Notifications" switch, its hours). Last, "You’ll only receive
notifications during the hours you selected. **Learn more**" (`dnd_schedule_info` 5647; `.body` `contentSecondary`, the
link a `.link` span — links draw in `highlight1.content`, underlined only with Underline Links:
`NotificationSchedulePresenter.swift:206-215`, `SK/Extensions/Text+Display.swift:740-753`; June `.sk_foreground_max` /
`.sk_highlight`). Windows stay ≥ 30 minutes; turning off the last day alerts "Pick at least one time window…" (5639) /
"Ok" (`NotificationSchedulePresenter.swift:63-225`, `Modules/NetworkPersistence/Dnd/Implementation/DndService.swift:98-158`).
The test defaults: DND 22:00–08:00 every day (`Modules/NetworkPersistence/Dnd/Tests/Unit/DndServiceTests.swift:36-43`; June's
`InlineTestData.swift:222-223` fixture is gone).

### 3.7 Keywords

Pushed; `SKNavigationTitle` "Keywords" (10534); header "Channel keywords" (3757) with "These act like mentions and trigger
notifications about topics that are important to you." (21406); a bordered multi-line field (no placeholder, focused when
empty); "Use commas to separate each keyword. Keywords are not case sensitive." (7954, `.caption`
`contentSecondary`; June `.sk_foreground_max_solid`: `NotificationKeywordsPresenter.swift:41-56`). **Saved when you leave the screen** (`Modules/Features/NotificationKeywords/Implementation/NotificationKeywordsInteractor.swift:43-68`).

### 3.8 Channel / Direct messages exceptions (NotificationChannelList)

Title "Channel exceptions" (3738) / "Direct messages exceptions" (5455); one section of `.medium` rows: the icon (`lock` /
`channel` in the name's color; avatars for DMs), the name (`.body`, `contentSecondary` when muted, else `contentPrimary`;
June `.sk_foreground_max_solid` / `.sk_primary_foreground`: `…Presenter.swift:119-122`), the summary ("Muted", "All new posts, mobile push notifications on" (1646) / "…customized"
(1640) / "…off" (1643), "Just mentions, mobile push notifications on" (10490) / …), a chevron (not for DMs) to §4. Long
press: "Reset to default" (3855, `refresh`), "Go to conversation" (13291, `arrow_right_channel`), "Leave channel" (3852,
`sign_out`, destructive) (`Modules/Features/NotificationChannelList/Implementation/NotificationChannelListPresenter.swift:29-165`;
`NP/Interface/AllNotificationPreferences.swift:42-73`).

### 3.9 Default reminder time

A DateTimePicker in a **native sheet with one self-sized detent** and the system grabber on iPhone (a popover on iPad;
`Modules/Features/DateTimePicker/Implementation/DateTimePickerFeature.swift:50-64` — June: the legacy SKBottomSheet unless
`bottomsheetMigration`): margins 20 / 16 / 12 / 16 on `basePrimary`, the stack not pinned to the bottom so the sheet fits
it, "Set a default time for reminder notifications:" (5273, `.smallBodyBold`), `.time` wheels (1-minute steps, 9:00 AM
when unset), "Reminders you set for a specific day (like "tomorrow") will be sent at the time you select." (5276,
`.caption` `contentSecondary`, 2 lines; June `.sk_foreground_max_solid`); no Done button — it saves on dismissal
(`…/DateTimePickerViewController.swift:42-46`, `:76-122`, `:168-171`, `:261-299`; `NS/NotificationSettingsFeature.swift:183-227`).

---

## 4. A conversation's notification settings (NotificationConversationNoiseSettings)

### 4.1 Screen

- Pushed (§0.1) for channels and group DMs you're in; DMs have no row for it. Title: `SKNavigationTitle` "Channel
  Notifications" (`channel_notifications` 3858) over the name with its icon prefix; "Reset" (`reset` 16550, §0.2 style)
  while customized (now built by the presenter, `CN/…Presenter.swift:94-109`); background `basePrimary` (June
  `.sk_primary_background`); the list inset 12 / 8 / 12 / 8 (`CN/NotificationConversationNoiseSettingsViewController.swift:19-50`;
  `CN/…Presenter.swift:75-92`).
- Sections (`CN/…Presenter.swift:111-327`): a banner (at most one, footer none, in priority order: warning "If you want to be
  notified about all new posts, you’ll need to turn on mobile notifications." (22327); the "Edit Mobile Overrides" warning;
  info "You've set this conversation to be temporarily muted until %@." (24789); info "You’ve customized notifications for
  this channel so things may look different from your default settings." (24778)) → "How to notify you": Mobile
  notifications switch (`.mobileNotification` glyph; nearest asset `mobile_notification`) → "Let you know about": radio rows
  **All new posts** — Messages and threads you follow (12323, `notifications_all_new_posts`), **Just mentions** — @you,
  @channel, @here (2243, `notifications`), **Mute Channel** (12625) — Only get notified if someone @mentions you
  personally (12631, `notifications_off`) → (not while muted) "Advanced options" (1055) — Customize your defaults (5126),
  `.filters` glyph (nearest asset `filters`), chevron.
- Saving: immediate. All new posts → `desktop=everything`, Just mentions → `mentions_dms` (and `muted=false`), Mute
  Channel → `muted=true`; the current option does nothing; Reset → toast "Reset" (`toast_checkmark`)
  (`CN/…Interactor.swift:197-293`).

| Header menu (`ConversationTabsMenuDataTypes.swift:94-132`) | Condition | Radio here |
|---|---|---|
| All (`all` 1603), `notifications_all_new_posts` | not muted, desktop everything | All new posts |
| Mentions (`mentions_title_case` 12057), `notifications` | not muted, mentions or nothing | Just mentions |
| Muted (`muted` 12646), `notifications_off` | muted | Mute Channel |

### 4.2 Advanced options (NotificationConversationNoiseAdvanced)

Pushed; `SKNavigationTitle` "Advanced options" with the name; the same inset; the overrides banner (its link bold in
`highlight1.content`, `CA/…Presenter.swift:168-172`); "Also notify you
about:" — Follow every thread (7298, `threads`); with all new posts (not group DMs) Badge every unread message (2389,
`mark_as_unread`); with mentions "Include **@channel** and **@here**" (9668, `channel`, on = not `suppress_at_channel`);
with push on, "Overrides" (14495) › Mobile notification overrides — Customize options only for mobile push notifications.
(5119) → Push overrides for the conversation (`CA/NotificationConversationNoiseAdvancedPresenter.swift:59-217`).

---

## 5. Preferences

No snapshot PNGs (none under `Modules/Features/Preferences`).

### 5.1 The list

- A form sheet over You (§0.1); title "Preferences" (`preferences` 14979) as a plain title; close on the left, nothing on
  the right (`P/PreferencesViewController.swift:32-40`). Headers `SKHeaderEntity .medium`, **pinned to the top** while
  their section scrolls (`sectionHeaderPinningBehavior .pinToTop`, `P/PreferencesPresenter.swift:67`); hairline footers;
  every row `.small` with a chevron or `new_window`, a `.caption` `contentSecondary` subtitle; no switches in this list.

| Section (key) | Rows (subtitle) — icon | Shown when |
|---|---|---|
| Prototypes (internal, hard-coded English) | "Production Slack" / "Radical Simplification A" / "…B" radio rows (`svgSlackLogo` / `svgSparkles`) that pick the next launch's navigation variant and ask to restart (`P/PreferencesPresenter.swift:77-161`) | only when Radical Simplification is offered (toggles, off); first |
| Internally Visible (`internally_visible` 9780) | Internal Settings — `cogs`; Playgrounds — `magic_wand`; **Themes** (`themes` 21369) — `paintbrush` in `contentPrimary`, a "NEW" (12791) `.text` badge `highlight1.content` on `.sk_frosty_blue` + chevron (June `.sk_primary_foreground` / `.sk_highlight`; `P/PreferencesPresenter.swift:296-308`) | builds with internal settings enabled (`areInternalSettingsEnabled`, injected: `P/PreferencesFeature+Dependencies.swift:47`, `:94`); Themes also needs `ios_ia4_theme_picker` (off) |
| Notifications (13451) | Notifications (Customize your notifications 5129) — `mobile_notification` → §3 pushed; VIP List (Manage your VIP list and notifications 15124) — `vip` | VIP: a paid plan |
| Appearance (2000) | App Icon (White 23665) — `slack_logo`; **Color Mode** (the mode: System / Light / Dark) — `paintbrush`; Default Emoji Skin Tone — `emoji`, the `hand` emoji in your tone + chevron; Message Display (Modify name, image, typing display 15064) — `message`; Calendar Display — `calendar` (flag `mobile_calendar_page`, off); Links (Customize the style of links 15061) — `link`; Input Options (Configure message formatting and input settings 9731) — `formatting` | |
| Accessibility (369) | Animation & Haptics (GIFs and touch 15010) — `gif`; Screen Reader (Customize how messages are read out by your screen reader 15100) — `direct_messages`; **Swipe Actions** (20874) — `arrow_right` in `contentPrimary`, no subtitle (always shown since September: the `ios_swipe_actions` filter is gone, `P/PreferencesPresenter.swift:235-238`, `:558-559`) | |
| Audio, Video & Images (15013) | Images & Video (Optimize files & save media 15052) — `image`; Huddles (**Change music settings**, `prefs_huddles_subtitle_music_only` 15049; June "Change music & raise to listen" 15046) — `headphones` (`:579-590`) | Huddles: huddles on |
| Language & Region (15058) | Language (the server's locale name) — `globe`; Translation Language — `ai_translate` (AI translation on); Time ("<zone> (REGION)") — `clock` | |
| Privacy & Security (15088) | Slack Connect Discoverability (Visibility to people outside your organization 15106) — `eye_open`; Privacy Policy (How Slack collects and uses information 15091) — `lock`, `new_window`; Passkeys (`prefs_passkeys_title` 15085, "The quickest, most secure way to log into Slack" 15082) — `key`, a "NEW" badge or `new_window` (flags `ios_passkeys_registration_promotion` + global `ios_passkeys_sign_in`, both off; `:622-639`); Account Settings — `user`, `new_window` (non-Enterprise, normal auth) | |
| Device & Troubleshooting (15034) | Browser Application (Select the browser to open links 15022) — `new_window`; Network Settings (Diagnostics and bug reports 15067) — `plug`; Debug & Reset Cache (Send logs and clear cache 15031) — `bug`; Help Center — `help`, `new_window`; Send Feedback — `share_feedback`; then, only when they apply, Intune diagnostics and Disconnect Google services (`:263-274`) | |
| Administration (15004) | Billing ("View or manage your **%@**" 15016, the plan in `.captionBold`) — `credit_card`, `new_window`; Analytics (View your Slack analytics dashboard 15007) — `gauge`, `new_window` | free and standard plans (no longer also the upgrades-visibility flag: `P/PreferencesInteractor.swift:308-316`) |
| About Slack (15001) | Version ("26.10.10 (370000)": `App/Info.plist:23-24`, `:50-51`; June 26.07.10) — `info`, no accessory, a tap copies it ("Copied" 4671, `toast_checkmark`; `P/PreferencesInteractor.swift:468-473`); in PR builds "Commit" (the short SHA, `svgCode`) and "Pull Request" (`svgBranch`), both `new_window` (hard-coded English, `:847-869`); Libraries We Use (Open source licenses 15112) — `book`, `new_window`; Analytics when Administration is hidden | |

(Sections in this order: `P/PreferencesPresenter.swift:50-75`; rows `:164-292`, `:296-892`; `P/PreferencesInteractor.swift:171-335`,
`:468-632`.) Production users have no theme control on iOS: the only `ThemePickerRoute` caller is the internal Themes row
(`P/PreferencesFeature.swift:254-255`).

### 5.2 Color Mode (`P/Appearance/`)

- Pushed; title "Color Mode" (`color_mode` 4346, `configureDetailTitle`); `basePrimary` (`P/Appearance/AppearanceViewController.swift:27-29`).
  One section of `AppearanceOptionRow`s (`AppearanceOptionRow.swift:16-144`): 96 pt, 20 pt in, a 93 × 72 picture (the
  120 × 92 SVGs `System`, `Light`, `Dark`, `True Dark` in `Modules/Features/Preferences/ResourceBundle/Settings.xcassets`,
  aspect fit), 16 pt, the title `.body` `contentPrimary` (and a `.caption` subtitle in UIKit's `secondaryLabel`), 16 pt, an
  `SKRadioButton` that only shows the state; `basePrimary`, `baseTertiary` highlighted (`:74-76`, `:116-118`; June UIKit's
  `.systemBackground` / `.systemGray5`).
- Rows: System — Uses device settings (`follow_system_settings` 7308, `system_subtitle` 20911), Light (`light_mode` 10860),
  Dark (`dark_mode` 5136); True Dark 😎 (`true_dark_mode` 22264) only with the global flag `ios_true_dark` (off). A
  "Contrast" section needs `ios_high_contrast`, now a workspace flag (off) (`AppearancePresenter.swift:57-139`,
  `AppearanceInteractor.swift:51`); June's migrations out of True Dark and high contrast when their flags are off are gone.
- Stored as `AppearanceModeKey` 0 / 1 / 2 / 3 and applied as the window's `overrideUserInterfaceStyle` (`.unspecified`,
  `.light`, `.dark`) (`Modules/NetworkPersistence/Preferences/Interface/ConfigManager.swift:19-48`,
  `Modules/Features/Root/Implementation/LoggedIn/LoggedInViewController.swift:69-91`). theme-colors.md §2.3 has the details.

### 5.3 Simple screens (all pushed; switches save at once)

| Screen | Rows (subtitle) — icon, default | Source |
|---|---|---|
| Message Display | Display Full Names (See first and last names 15037) — `user`, off, enabled when a team shows real names; Display Typing Indicator (15040) — `keyboard`, on; Collapse All Images (15025) — `image`, off. One-row sections, no footers | `P/MessageDisplaySettings/MessageDisplaySettingsPresenter.swift:32-125` |
| Links | Sync with iOS (553) — "Matches device setting for Increase Contrast" (456 + 450), `link`, on; Underline Links (556) — `underline`, disabled while synced | `P/LinkSettings/LinkSettingsPresenter.swift:32-113` |
| Input Options | "Format messages with markup" — "The text formatting toolbar won't show in the composer." (hard-coded, unlocalized), `code_block`, off | `P/InputOptions/InputOptionsPresenter.swift:35-75` |
| Animation & Haptics | header Animation (523): Sync with iOS — Matches device setting for Reduce Motion (499), `refresh`, on; Allow Animated Images (1698), `gif`, the system's value while synced · header Haptics (520): Allow Haptics (15043) — Adds a sense of touch when interacting with the app. (517), `remind`, on | `P/AnimationHapticsSettings/` |
| Images & Video | header Images (9589): Optimize Images for Upload (15070) — Images are optimized for upload performance (15073), `image`, on; Save Media to Camera Roll (15097), `save`, on · header Video (23132): Optimize Videos for Upload (15076) — (15079), `video`, on | `P/ImagesAndVideoSettings/` |
| Huddles | Play music when alone in a huddle (14832), `music`, off — the only row since September ("Raise to listen" is gone) | `P/HuddlesSettings/HuddlesSettingsPresenter.swift:28-90` |
| Time | Set Time Zone Automatically (17712), `hourglass`, on; Use 24-hour Clock (22836) — Display time in 24-hour format (15118), `clock`, off | `P/TimeSettings/` |

Not drawn in the clone (they say "Not in the prototype"): App Icon (radio rows with 36 pt icon images), Default Emoji Skin
Tone, Screen Reader (reorderable verbosity rows), Language, Slack Connect Discoverability, Browser Application, Network
Settings, Debug & Reset Cache, the web links, VIP List.

**Swipe Actions** (pushed; title "Swipe Actions", `SwipeActionsSettingsViewController.swift:40`): sections DMs (5586) /
Activity (586) / Chat (3939, flag `ios_swipe_to_reply`, off), each under an `SKHeaderEntity` with no row separators and a
hairline footer; rows "Left Swipe" (10814) / "Right Swipe" (16716), `.small`, with a `.quickAction` `.medium` button
accessory showing the action and `svgCaretDown` on the right, a pull-down (`isPrimaryAction`) of the actions with the
current one checked: DMs Mark as Read/Unread (21892, `svgMarkAsRead`) / Mute/Unmute (21889, `svgNotificationsOff`) / None
(13165); Activity Mark as Read/Unread / Clear/Restore (21879, `svgEraser`; always offered now, June needed
`activityInbox`) / None; Chat Reply (16440, `svgThreads`) / None. Defaults when unset: DMs read / mute, Activity read /
**archive** (June none), Chat none / reply. A pick saves at once
(`P/SwipeActionsSettings/SwipeActionsSettingsPresenter.swift:22-105`, `SwipeActionsSettingsDataTypes.swift:38-116`,
`SwipeActionsManager.swift:18-100`, `Modules/Features/Preferences/Interface/SwipeActionsSettings/SwipeActionsManagerInterface.swift:23-38`).

### 5.4 Themes (ThemePicker; internal builds)

theme-colors.md §7 specifies the picker; the parts the clone builds:

- `.fullScreen`; close (custom, asks on unsaved changes) on the left; on iOS 26 an `svgCheck` "Done" item on the right
  (`TP/ThemePickerViewController.swift:51-85`, `TP/ThemePickerPresenter.swift:60-82`); title "Themes". The view is `basePrimary` under an overlay that animates
  (0.2 s) to `primary._0` of the selection (`:36-41`, `:95-103`).
- The preview card (`TP/Subviews/Preview/ThemePreviewCardView.swift:20-289`) 16 pt in under the bar: radius 20, a shadow of
  `sk_black` at 0.12 (offset 0 / 8, radius 24); a radial gradient from the bottom-leading corner, 100 → 500 pt, of
  g1 → g2 (g1 → g1 without gradients); 12 pt down, 16 pt in, a 40 pt line spaced 12: the workspace avatar `.smallPlus` in a
  glass capsule (6 pt inset), the name (`.title` max 34, `contentInversePrimary`), your avatar with presence
  (`baseInverseHighlight2`); 12 pt below, the list (`basePrimary`, radius 16): "channel-name" (21363, `.bodyBold`
  `contentPrimary`, the stroked `#` in `contentPrimary`; June `.sk_primary_foreground`) with an emphasized "2" in
  `baseInverseImportant`, and "Team Member" (21366, `.body` `contentPrimary`) by a presence dot (`:244-262`). The shadow
  colors stay legacy (`sk_black`, dark `sk_shadowColor`: `:34-36`, `:159-165`). Measured on
  `testGeneralPreviewWithGradient@3x.png`: card y 16–176, header 64, list 96.
- The panel (radius 36, `basePrimary`) with an `SKPageController`: "Theme Presets" (21357) and "Customize Theme" (5123).
  Presets: 2 columns, insets 24 / 24 / 12, gaps 8, cells 52 tall (radius 12, 1 pt `outlineTertiary`, a 36 pt circle
  radial 10 → 50 pt of g1 → g2, 12 pt, `.captionBold` `contentPrimary`); selected: a 2 pt border and a 6 % fill
  of `primary._60` → `highlight1._60` (solid for monochromatic presets); pressed 0.96
  (`TP/Subviews/Selection/Preset/ThemePresetCell.swift:19-225`, `ThemePresetsView.swift:25-164`). "Surprise Me" (20871,
  primary medium, `svgSparkles`) 16 pt in at the bottom over a fade. Customize: Header (23345) / Selected Items (17423) /
  Presence Indication (15147) / Notifications (13451) rows (`.medium`, circle swatch, `.bodyBold` `contentPrimary`,
  "#RRGGBB"), then Window Gradient (21270) — Blend **Window background** and **Selected items** colors together in window
  backgrounds. (21266, `.caption` `contentSecondary`) with a checkbox (`TP/ThemePickerPresenter.swift:86-170`).
- A pick previews everywhere at once (`setTemporaryOverrideTheme`); the check saves; closing with a change asks "Save
  changes?" (21263) / "This will change the appearance of your Slack" (21260) / Save Changes (21257) / Discard Changes
  (21254, destructive) (`TP/ThemePickerInteractor.swift:149-215`).

---

## 6. Snapshot PNGs

None of these screens have snapshot tests (checked `Modules/Features/{EditStatus,EditProfile,ProfilePhotoPicker,
NotificationSettings,Notification*,CustomizeMobileNotifications,Preferences,You}` in both checkouts; none of the PNGs below
were re-recorded since June). The references are components, all under `Modules/UIInfra/SlackKit/Snapshots/iOS_26/` of the
latest checkout (light over dark) unless noted. The new `ArchitectureTests.SelfSizedSheetPresentationSnapshotTests`
baselines (self-sized sheets) are fully transparent PNGs, so they show nothing:

| PNG | Shows |
|---|---|
| `Modules/Features/ThemePicker/Snapshots/iOS_26/ThemePickerFeatureTests.ThemePreviewCardViewTests/testGeneralPreviewWithGradient@3x.png` (and `…WithoutGradient`) | the Themes preview card on defaultAubergine (§5.4). Its `iOS_27` copy renders the avatars' `UIGlassEffect` capsules as translucent glass, (197,137,204) over (95,31,102), where iOS_26 draws an opaque (255,212,255); every other pixel is identical. The clone follows iOS_27 (snapshot entry `theme-preview-card`) |
| `SlackKitTests.SKSingleLineTextInputEntitySnapshotTests/testTextInputEntityWithOrnamentAndText@3x.png` | the status editor row's geometry: 46.33 pt, text at x 52 |
| `SlackKitTests.SKBarButtonItemTests/testBackButtons@3x.png`, `testSystemSaveButton@3x.png` | the pushed screens' back caret; "Save" enabled / disabled in a glass pill |
| `SlackKitTests.SKGenericEntitySnapshotTests/testGenericEntityWithIconSmall@3x.png`, `…WithIconSmallWithSecondaryText@3x.png` | the 44 / 56.33 pt settings rows |
| `SlackKitTests.SKListHeaderSnapshotTests/testMediumShortTitle@3x.png`, `testMediumCollapsibleNotCollapsed@3x.png` | section headers; Edit Profile's collapsible header |
| `SlackKitTests.SKRadioButtonSnapshotTests/*`, `SlackKitTests.SKSwitchSnapshotTests/*` | the accessories |

## 7. Gaps

- Server data: status presets (the fixture's defaults are used), recent statuses, profile fields and their hints, the
  locale's display name, VIP access, team prefs (display_real_names, display_pronouns).
- UIKit draws the iOS 26 bars' glass, the form sheets, `UIDatePicker` (compact on Clear after…, wheels elsewhere) and
  `UIPickerView`; none are in Slack's source. The clone approximates the compact picker with wheels.
- Swipe-to-dismiss blocking while a status has unsaved changes is UIKit's `isModalInPresentation`; not reproduced.
- Temporary mutes (`temp_mute_expiration_ts`) have no UI to set them on these screens.
- Flag-gated September additions not drawn: Set a Status's Scheduled section (`ios_scheduled_status`), Passkeys, the
  internal Prototypes section, PR-build Commit / Pull Request rows, Intune / Google troubleshooting rows, Swipe Actions'
  Chat section (`ios_swipe_to_reply`), and the unified (SwiftUI) navigation variant's bars.
- Troubleshoot notifications (a test runner), App Icon, Default Emoji Skin Tone, Screen Reader, Language, Browser
  Application and the internal tools are specified only as far as this file says.
