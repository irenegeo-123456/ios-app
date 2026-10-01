# Messages and the conversation screen

> **Updated to slack-objc main @ 14b3cbaf (2026-09-30).** Every citation was re-pointed to that checkout (1,101 parsed:
> 623 moved, 199 changed and re-read, 6 in files that are gone, 273 unchanged; yaml and `Colors.swift` lines too).
> What changed since June (cd22922):
> - **Colors.** MessageKit and MessageKitTransformation no longer use legacy `sk_*` colors. Body text is `content_primary`
>   (dark `#d1d2d3` → `#f8f8f8`, as the device draws it); ephemeral, system, join/leave and huddle bodies `content_secondary`;
>   reply counts and the broadcast parent `content_highlight_1`; "(edited)" `content_tertiary`; APP badges
>   `content_secondary` on `surface_primary`; focused rows `surface_highlight_3`; the default unfurl pipe `outline_tertiary`;
>   the list `base_primary` (§1.2-1.7, §3, §5, §7, §9.8).
> - **Design tokens `f76ac0a`** (was `df1f228`): high-contrast variants (component PNGs are now 2 × 2 grids) and new dark
>   values for `base_inverse_highlight_1` `#0a77a7`, `base_inverse_highlight_2` `#177e56`, `base_inverse_important` `#d3305d`.
> - **Rows without a name** center short content on the ornament and put the timestamp beside the body
>   (`MKOuterHorizontalStack`; new PNGs `testMessageViewWithTimestampNextToSecondaryContent`,
>   `…NoPrimaryTextWithContentTallerThanOrnament`); in the transcript only the flagged system-message redesign uses it (§1.1, §9.8).
> - **Reply bar** lost the AI app thread title; attachment thumbnails lost their "ALT" badges (§4.5, §7).
> - **Transcript:** typing moved to a workspace `TypingUsersService` shown in the context-bar drawer plugin; the unread pill
>   now leaves sliding and fading; a message pending over 1 s gets a full header (§9).
> - **Conversation screen:** the navigation-controller files moved to `Modules/UIInfra/NavigationController`; right bar
>   arrays read leading → trailing; the huddle button is `SKHuddleBarButtonView`; thread and app titles `content_primary`;
>   the context bar is its own bottom-drawer item on every iOS version (§10).
> - **AI footer bar** (Slackbot answers): share replaced copy; the disclaimer line only with `hangbarUpdatesV2` (off) (§2.1).
> - **New, flagged off:** shared-thread cards, forwarded-message cards, link-card media types, the system-message redesign,
>   the elevator pill in conversations (§2, §5, §9).

How a message row, its content (text, attachments, unfurls, reactions, reply bar), the message list and the
conversation/thread screens look and behave in Slack iOS. Composer and the long-press menu are covered by other specs.

All paths are relative to the iOS repo root (`slack-objc-latest`: github.com/tinyspeck/slack-objc `main` @ `14b3cbaf`,
2026-09-30; first written against the June snapshot `cd22922`). Snapshot PNGs are in the same checkout (Git LFS,
`Modules/**/Snapshots/iOS_26/`). Sizes are pt (PNG px / 3). Colors are `dt_color_*` tokens from `output/ios/Colors.swift`
(design-tokens `f76ac0a`, the commit the app pins in `internal.MODULE.bazel:209`, vendored in
`reference/ios/vendor/design-tokens-f76ac0a/`; line numbers given as `Colors.swift:N`) or legacy `sk_*` colors from
`Modules/Data/Color/Implementation/SKLegacyColors.swift` (cited as `SKLegacyColors.swift:N`; the file is unchanged since June, but
MessageKit and MessageKitTransformation no longer use any of them: every one is now a `CoreColorSet` token). Alpha colors are written
`#rrggbb@a`; "on white" / "on #1a1d21" gives the composited value when it was measured from a PNG.

Legacy colors still cited in this spec (light / dark). In June MessageKit drew body text, hidden-message copy, code
blocks and the list background with `sk_primary_foreground` / `sk_primary_background`; the September code uses
`content_primary` / `base_primary` for all of them (§1.4, §1.6, §1.7, §3.4):

| name | light | dark | source |
|---|---|---|---|
| `sk_primary_foreground` (June's body-text default) | `#1d1c1d` | `#d1d2d3` | SKLegacyColors.swift:27-29, 157 |
| `sk_primary_background` (June's list background) | `#ffffff` | `#1a1d21` (trueDark `#000000`) | SKLegacyColors.swift:34-39 |
| `sk_foreground_max_solid` | `#616061` | `#9a9c9e` | SKLegacyColors.swift:70, 167 |
| `sk_foreground_high_solid` | `#868686` | `#75777a` | SKLegacyColors.swift:80, 172 |
| `sk_foreground_low_solid` | `#dddddd` | `#323538` | SKLegacyColors.swift:95, 177 |
| `sk_foreground_low` | `#1d1c1d@0.13` | `#d1d2d3@0.13` | SKLegacyColors.swift:90 |
| `sk_highlight` (June: mustache parent text, reply counts; now `content_highlight_1`) | `#1264a3` | `#1d9bd1` | SKLegacyColors.swift:125, 227, 232 |
| `sk_raspberry_red` | `#e01e5a` | `#e01e5a` | SKLegacyColors.swift:202 |
| `sk_pale_yellow` (June's focused row; now `surface_highlight_3`) | `#f2c744@0.2` | `#f2c744@0.2` | SKLegacyColors.swift:217, 242 |

Core tokens used most (light / dark, `Colors.swift` line): `base_primary` `#ffffff`/`#1a1d21` (42), `base_secondary`
`#f8f8f8`/`#1a1d21` (50), `base_tertiary` `#eaeaea`/`#212428` (56), `content_primary` `#1d1c1d`/`#f8f8f8` (200),
`content_secondary` `#454447`/`#b9babd` (206), `content_tertiary` `#5e5d60`/`#9a9b9e` (212), `content_highlight_1`
`#1264a3`/`#2ba5ce` (218), `content_important` `#c01343`/`#de678a` (236), `outline_tertiary` `#5e5d60@0.13`/`#797c81@0.3`
(302; = `#eaeaea` on white, `#37393e` on `#1a1d21`, both measured), `outline_important` `#e01e5a`/`#d94c75` (344),
`surface_primary` `#1d1c1d@0.06`/`#f8f8f8@0.06` (134; = `#f2f2f2` on white, measured). f76ac0a adds
`lightHighContrast` / `darkHighContrast` variants to the tokens and changes three dark values used here:
`base_inverse_highlight_1` `#004d76` → `#0a77a7` (98), `base_inverse_highlight_2` `#00553d` → `#177e56` (104),
`base_inverse_important` `#b41541` → `#d3305d` (116).

Fonts are Lato (`Modules/Data/Font/Implementation/FontStyle.swift:11-18`); monospace is Menlo (`FontStyle.swift:20-23`).
At the default content size a Lato line box is 1.2 × point size (hhea ascender 1974 / descender −426 / gap 0 on a
2000 em in `Modules/Data/Font/ResourceBundle/Font/Lato/Lato-Regular.ttf`, same for Bold and Black; cap height 0.717 em):
body 17 → 20.4pt. iOS rounds each label up to the pixel grid, so a one-line body label measures 20.67pt in snapshots.
Web: bundle the same Lato TTFs and use `line-height: 1.2`.

---

## 1. Message row (`MKMessageView`)

**Source:** `Modules/UIInfra/MessageKit/Implementation/MKMessageView.swift` (the row), `HorizontalStacks/MKOuterHorizontalStack.swift`
(avatar + column), `HorizontalStacks/MKPrimaryContentStackView.swift` (name/badge/timestamp row),
`HorizontalStacks/MKPreHeaderHorizontalStack.swift` (pre-header), `MKCoreMessageProperties.swift` (fonts/colors/background
styles). Built for the channel transcript by `Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/DefaultTransformationPath.swift`
with the config in `Modules/Features/MessageTranscript/Implementation/Pipeline/State/MessageTransformationMapper.swift:142-187`.

**Snapshots** (`Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageViewSnapshotTests/`, 393pt wide, light,
fixtures in `Modules/UIInfra/MessageKit/Tests/Unit/MKMessageViewSnapshotTests.swift`; most use a 36pt gray icon box with an
Apple logo as the "avatar"):

| PNG | shows |
|---|---|
| `testMessageViewBasic@3x.png` | header row only, no avatar: bold name + "10:00AM"; row 36.67pt tall |
| `testMessageViewWithSecondaryText@3x.png` | header + one body line; row 57.33pt (8 + 20.67 + 20.67 + 8) |
| `testMessageViewWithSecondaryTextAndTextInspectionAccessibilityMode@3x.png` | identical render (a11y mode only) |
| `testMessageViewWithOrnament@3x.png` | 36pt avatar box at x16 y8, header only |
| `testMessageViewWithHeaderBadge@3x.png` | name + gray pill "APP" + timestamp + body |
| `testMessageViewWithPrimaryTextDecoration@3x.png` | name followed by a headphones icon (icon decoration instead of badge) |
| `testMessageViewWithMetadata@3x.png` | pre-header: red warning icon + "Error sending message. Tap to try again" above the header |
| `testMessageViewPreHeaderWithNoIcon@3x.png` | same pre-header without icon; text still starts at x64 |
| `testMessageViewCustomBackgroundStyle@3x.png` | failed style: whole row `#ffe8ef` |
| `testMessageViewNoPrimaryText@3x.png` | avatar + body, no header row; the one-line body is centered on the 36pt box (row 52pt) |
| `testMessageViewWithTimestampNextToSecondaryContent@3x.png` | (new) no header text but a timestamp: body centered on the box (ink y19.7–35.3), "10:00AM" (`#5e5d60`) at the row's right edge, ink x327.7–375.3, also centered; row 52pt |
| `testMessageViewNoPrimaryTextWithContentTallerThanOrnament@3x.png` | (new) no header text, 5-line body (y8–110): box stays top-aligned at y8, row 118pt |
| `testMessageViewNoPrimaryTextWithRepliesInfo@3x.png` | avatar + body + reply bar |
| `testMessageViewHiddenMessage@3x.png` | lock box, "This message is hidden", "You're hiding messages from this person.", blue "Show anyway" |
| `testMessageViewUnhiddenMessage@3x.png` | normal message + 2 rows of reactions + blue "Hide message" |
| `testMessageViewMustacheTextAndViewNewerReplies@3x.png` | "Replied to a thread" (gray) / "Root message" (blue bold) above the body, reactions, blue "View newer replies" |
| `testMessageViewWithReactions@3x.png`, `testMessageViewWithReactionAndAddReacjiPill@3x.png` | 2 rows of pills, "N more" pill, add-reaction pill (see Reactions) |
| `testMessageViewWithRepliesInfo*.png`, `testMessageViewWithSecondaryTextAndEmptyReplyBar@3x.png` | reply bar variants (see Thread reply bar) |
| `testMessageViewWithBlockContentAttachments@3x.png` | 2-line body, then one gray-piped attachment: 16pt icon + bold "Header text", bold "Title Text", "Test Text", 16pt icon + gray "Footer text goes here." |
| `testMessageViewWithPreviewAttachments@3x.png` | same attachment with text / hairline divider / text / divider blocks |
| `testMessageViewWithPreviewAttachmentAndPretext@3x.png` | as above with "Pretext wuz hur." (Lato 17, black) 4pt above the pipe |
| `testMessageViewWithPreviewAttachmentsSection@3x.png` | best "real message" reference: member avatar "Smokey Bear" (radius 9), name + "10:00AM", "Quick pop quiz for everyone!", piped attachment with header/title/text/divider and a 4-option checkbox section, footer |
| `testMessageViewWithMixedAttachments@3x.png` | four piped attachments stacked 8pt apart (header+title+blocks+footer / text only / repeat / text+divider+text) |
| `testMessageViewWithMixedAttachmentsAndReactions@3x.png` | same + a row of 4 reaction pills 8pt under the last pipe |

### 1.1 Layout

```
row, full list width (393)
┌──────────────────────────────────────────────────────────────────────────────┐
│ top inset 8 (4 when the row is a grouped continuation)                        │
│ [pre-header, optional]   icon 12.48□ right edge at x=52 · 12 · caption text  │
│   8                                                                           │
│ x=16 ┌avatar 36×36┐ 12 ┌ content column x=64 … 377 (313 wide) ────────────┐  │
│      │ radius 9   │    │ Name (Lato Black 17) ·4· [APP] ·4· 10:42 AM (12) │  │
│      └────────────┘    │ 4 (first BlockKit block's top inset, §3.2)       │  │
│                        │ body text / blocks …                            │  │
│                        │ attachments, unfurls, reactions … (8 apart)      │  │
│                        │ 8 · reply bar                                    │  │
│                        └──────────────────────────────────────────────────┘  │
│ bottom inset 8                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Row insets: left/right 16, bottom 8 (`MKMessageView.swift:55-56, 121-127`); top = `topSpacing`, 8 by default and 4 for
  rolled-up (grouped) messages (`MKMessageView.swift:539-542`, set at `DefaultTransformationPath.swift:320`
  `verticalSpacing: config.shouldRollup ? .small : .default`). Row height = content + top + 8 (`MKMessageView.swift:432-439`).
- Avatar column: 36×36 (`SKEntityOrnamentView.Size.large`, `MKCoreMessageProperties.swift:244`,
  `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityOrnamentView.swift:416-427`;
  `SKMemberAvatar.Size.large.sideLength = 36`, `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/MemberAvatar/SKMemberAvatar.swift:940-941`).
  Gap avatar → column 12 (`MKOuterHorizontalStack.swift:219-221`). Avatar and column are top-aligned
  (`MKOuterHorizontalStack.swift:189`), so the avatar top = the name line top (measured: avatar y=8, x=16; text x=64,
  `testMessageViewWithPreviewAttachmentsSection@3x.png`). Exception: with an avatar and **no header text**, the column is
  vertically centered on the avatar whenever its content (measured at the width left after the avatar, the timestamp and
  their 12pt gaps) is no taller than the 36pt avatar; taller content stays top-aligned. Decided at layout time
  (`MKMessageView.swift:335`; `MKCoreMessageProperties.swift:257-263`; `MKOuterHorizontalStack.swift:64-116`). June
  centered only when the column held exactly one item (`MKMessageView.swift:321-324` [June]).
- **Timestamp with no header text** (new): the timestamp leaves the header row and becomes a third item of the
  avatar row, after the column, 12pt from it, hugging its text, at the row's trailing edge (x ≤ 377); `.micro` 12
  `content_tertiary`, 1 line; vertically centered with the rest when the content is short
  (`MKCoreMessageProperties.swift:101-120, 249-255`; `MKMessageView.swift:337-341`; `MKOuterHorizontalStack.swift:148-158`;
  `testMessageViewWithTimestampNextToSecondaryContent@3x.png`). Channel rows always have a name, and grouped rows have no
  timestamp (`TimestampMapper.swift:51`), so this only shows for header-less rows such as the redesigned system messages
  (flag `systemMessagesRedesign`, default off: `CustomPaths/SystemMessageTransformationPath.swift:30, 61-76`;
  `Modules/Data/Toggles/Definitions/ios_system_messages_redesign.json`).
- When there is no avatar (grouped rows) the column keeps its x=64 by adding `36 + 12` leading padding
  (`MKMessageView.swift:209-224`).
- Column items, top to bottom, default gap 0 (`MKMessageView.swift:243-333`; `SKRecyclerViewPresentationObject` default
  `spacing: 0`, `Modules/UIInfra/SlackKitFoundations/Implementation/RecyclerView/SKRecyclerViewPresentationObject.swift:20`):
  1. header row (name/badge/timestamp). Gap after it: 0 when text follows — but the first BlockKit block of a real
     message carries its own **4pt top inset**, so name row → first body line = 4pt (§3.2); 4 when the message has no
     text and starts with an attachment, a shared thread or an unfurl (`MKMessageView.swift:271-273`,
     `MKMessageContentViewPresentationObject.swift:89-91`).
  2. "mustache" label (broadcast replies shown in the channel): "Replied to a thread: " in Lato 17 `content_secondary`
     (`#454447` / `#b9babd`; June `sk_foreground_max_solid`), a line break, then the parent message text in Lato Bold 17
     `content_highlight_1` (`#1264a3` / `#2ba5ce`; June `sk_highlight`, dark `#1d9bd1`)
     (`Mappers/BroadcastMessageMapper.swift:17-22, 38-43`); max 2 lines (`DefaultTransformationPath.swift:311`); gap after 8
     (`MKMessageView.swift:253-257, 399-405`). See §7.4.
  3. message content (text, files, unfurls, reactions — §2); gap after 8 (`MKMessageView.swift:259-269`).
  4. thread reply bar (§7); gap after 4 if a footer follows (`MKMessageView.swift:276-288`).
  5. footer label, max 5 lines; gap after 8 (`MKMessageView.swift:287-298`).
  6. "View newer replies" link: Lato Regular 17, `content_highlight_1` (`#1264a3`/`#2ba5ce`), 1 line
     (`MKMessageView.swift:301-308, 407-415`).
  7. hidden-message link (§1.6).
  8. optional accessory: a button or (new) a label (`MKMessageView.swift:317-328, 505-515`). The Channel Expert handoff
     button — "Request human help" / "Help requested!" / "Loading" (`ce_handoff_request_button` yaml:3594,
     `ce_handoff_requested_button` yaml:3598, `loading` yaml:11484), icons `svgHelp` / `svgCheck` — now shows whenever the
     message carries an Agentforce help request; the `ceHandoffButton` flag is gone (`DefaultTransformationPath.swift:275-299`).
- Items with zero size are skipped and get no gap (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/RecyclerView/Helpers/SKLayoutCalculator.swift:110-113`)
  — in CSS terms, a flex column with `gap` only between rendered children.
- Pre-header (pinned / saved / ephemeral / error line, strings in §9.8) sits above everything with an 8pt gap to the avatar row
  (`MKMessageView.swift:226-241, 361`). Icon side = caption line height × 0.8 = 15.6 × 0.8 ≈ 12.5pt
  (`MKMessageView.swift:60, 417-419`), placed so its right edge lines up with the avatar's right edge (leading padding
  `36 − 12.5`, `MKMessageView.swift:211-214`); 12pt gap to the label (`MKPreHeaderHorizontalStack.swift:16-18, 103`),
  icon and label vertically centered. Label: Lato Regular 13 (`.caption`), default color `content_tertiary`
  (`MKMessageView.swift:391-397`). Without an icon the label starts at x=64 (`MKMessageView.swift:215-219`). Measured in
  `testMessageViewWithMetadata@3x.png`: icon ink x40.3–51.3, text x65, avatar top y31.7.

### 1.2 Header row (name · badge · timestamp)

Source: `MKPrimaryContentStackView.swift:51-114`, built at `MKMessageView.swift:372-389` with `alignment: .center, spacing: 4`.
Order: name label → optional decoration (badge or icon) → timestamp (+ optional dot / count badge / small spinner, not used
in channels: only `MKMessagePreview` sets them, `MKMessagePreview.swift:174, 393`). The timestamp joins this row only when
there is a name (`MKMessageView.swift:382-385`); without one it moves to the end of the avatar row (§1.1).
All items vertically centered on each other, 4pt apart. Measured (`testMessageViewWithHeaderBadge@3x.png`): name ink ends
x118, badge x163.7–205, timestamp ink starts x204.7+… (side bearings make visual gaps ~5pt).

| element | type | color | other | source |
|---|---|---|---|---|
| name | Lato **Black** 17 (`.bodyBlack`) | `content_primary` `#1d1c1d` / `#f8f8f8` | wraps (no line limit by default); tappable | `MKCoreMessageProperties.swift:220-227, 265-272`; `MKMessageView.swift:550` |
| status emoji | inline emoji after the name, separated by one space | — | only when the author has a status emoji | `Mappers/AuthorMapper.swift:38-46, 136-138` |
| VIP icon | `SKIconManifest.svgVipFilled`, after a space | `content_primary` | a11y "VIP"; only for priority (VIP) senders | `AuthorMapper.swift:60-74` |
| APP / WORKFLOW / AGENT badge | `SKBadge` pill | text `content_secondary` (`#454447`/`#b9babd`) on `surface_primary` (`#1d1c1d@0.06`/`#f8f8f8@0.06`; June `sk_foreground_max_solid` on `sk_foreground_low_solid` `#dddddd`/`#323538`) | see below | `Mappers/BadgeMapper.swift:22-70` |
| timestamp | Lato Regular 12 (`.micro`) | `content_tertiary` `#5e5d60` / `#9a9b9e` | 1 line | `MKCoreMessageProperties.swift:249-255` |

- Name text is the sender's display name (respecting the "display full names" pref); for bot posts with a custom
  `username`, that username; "Slack" for welcome-party messages (`Modules/Data/DataModels/Implementation/ClientModels/Messages/Message.swift:758-781`).
  Redacted messages show "This message can’t be shown" (`ekm_this_message_cant_be_shown`, `AuthorMapper.swift:36-37`).
  Canvas-updated messages show "Canvas updated" (`canvas_updated`, `AuthorMapper.swift:118-120`).
- Badge rules (`BadgeMapper.swift:73-99`): none for grouped rows; email-integration posts → "APP"; bot user → "APP"
  (`app_badge`), workflow bot → "WORKFLOW" (`workflow_app_badge`), Agentforce bot → "AGENTFORCE", a bot shown as an
  agent → "AGENT" only with `agentsAndAppsBadging` (`BadgeMapper.swift:87`; flag read at `DefaultTransformationPath.swift:59`);
  humans get none (channel experts get "AGENT"). Strings: `localized_strings.yaml:1931` "APP", yaml:23766 "WORKFLOW", yaml:1085 "AGENT", yaml:1185 "AGENTFORCE".
- Badge geometry (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Badge/SKBadge.swift`): font Lato Bold 12
  (`.microBold`, capped at 18pt, `:382-393`); height = max(12, 12) + 2×3 = **18**; horizontal padding 9 (pill shape,
  `:419-435`); min width 24 (`:27`, `:194-201`); corner radius = height/2 = 9 (`:217-228`); text centered, 1 line (`:168-171`).
  Measured: 18pt tall, "APP" badge 41.3pt wide, fill `#f2f2f2` on white (`testMessageViewWithHeaderBadge@3x.png`; that
  fixture's default `.text()` style is the same `content_secondary` on `surface_primary` the mapper now uses).
- Timestamp formats (`Mappers/TimestampMapper.swift:23-77`, `Modules/Data/I18n/Implementation/TimeUtility.swift`):
  - channel messages: `.timeOnly` (`MessageTransformationMapper.swift:147-151`) → `h:mm a` with a no-break space before
    AM/PM, e.g. "10:42 AM"; "HH:mm" when the 24-hour pref is on (`TimeUtility.swift:208-211`).
  - thread replies: `.threadReply` (`MessageTransformationMapper.swift:152-156`) → "Just now" (<1 min), "N mins"
    (pluralized, <1 h), time only (same day or <8 h), "Yesterday at 10:42 AM", "Wednesday at 10:42 AM" (<7 days),
    else "Jun 4th at 10:42 AM" / "Jun 4th, 2025 at 10:42 AM" (`TimeUtility.swift:474-501`).
  - thread root (`MKRootMessageView`): `.absolute` → "Today at 10:42 AM", "Yesterday at 10:42 AM", "Jun 4th at 10:42 AM",
    "Jun 4th, 2025 at 10:42 AM" (`TimestampMapper.swift:31-33`, `TimeUtility.swift:719-785`).
  - while sending: "Sending…" (`sending`, yaml:17613); while saving an edit: "Saving…" (`saving`, yaml:16939)
    (`TimestampMapper.swift:43-46, 61-63`).
  - Strings: "Just now" (`just_now`, yaml:10496), "Yesterday at %@" (`yesterday_at_x`, yaml:24199), "Today at %@"
    (`today_at_x`, yaml:21784), "%@ at %@" (`date_at_time`, yaml:5175); ordinal suffixes "st" "nd" "rd" "th" (11–13 → "th")
    (`TimeUtility.swift:1155-1169`).
- Grouped (rolled-up) rows render no avatar, name, badge or timestamp (`AvatarMapper.swift:59`, `AuthorMapper.swift:76`,
  `BadgeMapper.swift:74`, `TimestampMapper.swift:51`); the time is still in the a11y label. There is no hover/press
  timestamp reveal. Grouping rules are in §9.2.

### 1.3 Avatar

- Member avatar 36×36, corner radius = min(20, 0.25 × side) = **9** (`SKMemberAvatar.swift:97-104`,
  `Modules/UIInfra/SlackKitFoundations/Implementation/Utilities/UIUtilities.swift:94-98`). Measured radius ≈ 9pt
  (`testMessageViewWithPreviewAttachmentsSection@3x.png`). Image `scaleAspectFill`.
- Image-type ornaments (e.g. "access denied" lock image) use radius 6 (`SKEntityOrnamentView.swift:403-414`); icon
  ornaments (channel/canvas/system icons) are a 36pt `SKOrnamentBox` with radius 9 and `surface_primary` fill
  (`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/OrnamentBox/SKOrnamentBox.swift:25, 532-538, 618-639`).
- Which avatar (`Mappers/AvatarMapper.swift:120-208`): the user's medium avatar; bot messages use the bot's icon or
  emoji avatar; external (Slack Connect) users get their org logo in a square cut-out at the bottom-right
  (`AvatarMapper.swift:38-44, 146-148`); guests get the single/multi-channel guest corner annotation
  (`SKMemberAvatar.swift:279-286`); deactivated users render grayscale (`SKMemberAvatar.swift:317`). No presence dot in
  the transcript (`HeaderStyling(content: .author, shouldShowStatusEmoji: true)` without `shouldShowPresence`,
  `MessageTransformationMapper.swift:179`). Missing image → initials placeholder with fallback background
  (`SKMemberAvatar.swift:527-529`). Canvas-updated (`svgCanvasContent`) and welcome-party (`svgNotifications`) rows show a
  `content_secondary` icon on a `surface_primary` box (June `sk_foreground_max` on `sk_foreground_low`)
  (`AvatarMapper.swift:150-166`); email-integration posts use that bot's avatar (`AvatarMapper.swift:123-127`).
- Pressed: alpha 0.6 (`MKTappableOrnamentView.swift:14, 40`). Tap avatar or name → user profile (app profile for bots);
  no-op on canvas-updated rows, huddle avatars, and Slackbot's non-AI (or custom-response) messages when Slackbot AI is on
  (`Modules/Features/Handlers/MessageActionHandler/Implementation/Handlers/PrimaryMessageActionHandler.swift:150-198`).

### 1.4 Row background, pressed and focused states

- Transcript list background: `base_primary` (`#ffffff` / `#1a1d21`; June `sk_primary_background`, same light/dark)
  (`Modules/Integration/ThemesIntegration/Interface/ListThemeOptions.swift:65-69`, used at
  `Modules/Features/MessageTranscript/Implementation/MessageTranscriptPresenter.swift:266`).
- Row background styles fill the whole row (`MKCoreMessageProperties.swift:137-177`, applied at `MKMessageView.swift:140-145`):

| style | when (see §9.8) | background light / dark | pressed light / dark (computed: darken = 10% black blend) |
|---|---|---|---|
| none | normal | `base_primary` `#ffffff` / `#1a1d21` | `base_tertiary` `#eaeaea` / `#212428` |
| failed | failed to send | `base_important` `#ffe8ef` / `#300005` | ≈`#fffcfd` / ≈`#2b0004` |
| pinned | pinned message | `base_highlight_3` `#fffae0` / `#2f1e00` | ≈`#e6e1ca` / ≈`#2a1b00` |
| highlighted | highlighted (e.g. from search) | `base_highlight_3` | as pinned |
| savedForLater | saved | `base_highlight_1` `#e3f8ff` / `#001a2d` | ≈`#ccdfe6` / ≈`#001729` |
| slackbotResponse | Slackbot auto-response | `base_highlight_1` | as saved |
| broadcast | "also sent to channel" reply, only in thread view (`shouldUseBroadcastBackgroundColor`, `MessageTransformationMapper.swift:150, 155`) | `base_highlight_3` | as pinned |
| huddle | huddle message | `base_highlight_2` `#e3fff3` / `#05241b` | ≈`#cce6db` / ≈`#042018` |
| ephemeral | only-visible-to-you | `base_secondary` `#f8f8f8` / `#1a1d21` | ≈`#dfdfdf` / ≈`#171a1e` |

  Pressed colors: `MKCoreMessageProperties.swift:179-205`; darken/lighten are blends with black/white
  (`Modules/Data/Color/Implementation/UIColor+Extensions.swift:53-59`); failed uses lighten 0.85 (light) / darken 0.1 (dark).
  Hex values marked ≈ are computed, not measured.
- Pressed (touch-down) state for normal rows: full-row `base_tertiary` (`#eaeaea` / `#212428`). The transcript sets
  `isBounceModeEnabled: false` (`MessageTranscriptPresenter.swift:267-272`), so there is no scale-down and the highlight
  has no inset and no corner radius (`MKMessageView.swift:142-145`,
  `Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityBackgroundView.swift:69-80`); the row highlight
  color defaults to `base_tertiary` (`Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/SKList.swift:144-146`,
  `ListThemeOptions.swift:70-71`). No animation (`SKEntityBackgroundView.swift:93-95` ignores `animated`).
- Focused row (jumped-to / permalinked message, `focusState: .focused` when `displayConfig.isHighlighted`,
  `MessageTransformationMapper.swift:211`): background `surface_highlight_3` = `#ffc600@0.18` / `#a07300@0.18`
  (Colors.swift:158; June `sk_pale_yellow` `#f2c744@0.2`) (`SKEntityBackgroundView.swift:111-114`). Being deleted:
  `base_inverse_important` at 25% = `#e01e5a@0.25` / `#d3305d@0.25` (Colors.swift:116; June `sk_raspberry_red`)
  (`SKEntityBackgroundView.swift:106-109`).

### 1.5 Gestures on a row

- Tap a message in a channel → opens its thread (the message-details/thread screen), highlighting the tapped reply if it
  is one; failed messages instead open the message-actions sheet (pending ones too behind
  `blockPendingMessageDetailsNavigation`, default off); canvas-updated messages open the canvas and (new) canvas-comment
  roots open the canvas's comment section (`MessageListActionHandler.swift:410-439, 458-533`). In a thread, tapping a reply
  does nothing unless it failed.
- Double-tap your own message → edit it (`MessageTransformationMapper.swift:215-216`,
  `MessageListActionHandler.swift:94-108`).
- Swipe (only `swipeToReply` now, default off; the `swipeActions` flag is gone): "Reply" action, icon `svgThreads` →
  `svgThreadsFilled` when active, background `base_inverse_highlight_1` (`#1264a3` / `#0a77a7`, June dark `#004d76`),
  foreground `content_inverse_primary` (`MessageTransformationMapper.swift:220-245`; label `reply` = "Reply", yaml:16440;
  `Modules/Data/Toggles/Definitions/ios_swipe_to_reply.json:6`). Opens the thread with the composer focused (at the
  latest reply behind `replyActionOpensThreadAtLatest`, default off); in a thread it quote-replies in place
  (`MessageListActionHandler.swift:441-456`).
- Long press → message actions (other spec).

### 1.6 Hidden messages (muted sender)

`MKCoreMessageProperties.swift:88-99, 274-310`, fonts and colors from `DefaultTransformationPath.swift:316-317`:
header text "This message is hidden" (`this_message_is_hidden`, yaml:21543) in Lato Black 17 `content_primary` (June
`sk_primary_foreground`), body "You're hiding messages from this person." (`youre_hiding_messages_from_user`,
yaml:24722) Lato 17 `content_primary`, then link
"Show anyway" (`show_anyway`, yaml:18950) — Lato Bold 13 (`.captionBold`), `content_highlight_1`. After revealing, the
link reads "Hide message" (`hide_message`, yaml:7917). Snapshots: `testMessageViewHiddenMessage@3x.png`,
`testMessageViewUnhiddenMessage@3x.png`.

### 1.7 Body text defaults

Message body = BlockKit rich text blocks rendered at `.body` (Lato Regular 17) in `content_primary`
(`#1d1c1d` / `#f8f8f8`; June `sk_primary_foreground`, dark `#d1d2d3`) (`MessageViewPresentationObjectFactory.swift:58-59`).
Ephemeral, system and redacted messages use `content_secondary` (`#454447` / `#b9babd`; June `sk_foreground_max_solid`
`#616061` / `#9a9c9e`) instead (`DefaultTransformationPath.swift:892-896`). `/me` messages are italic
(`DefaultTransformationPath.swift:898-904`). Emoji-only messages use jumbomoji in the transcript
(`shouldUseJumbomojis: true`, `MessageTransformationMapper.swift:174-178`). Everything else about text styling is in §3.

---

## 2. Message content stack (`MKMessageContentView`)

**Source:** `Modules/UIInfra/MessageKit/Implementation/MKMessageContentView.swift`,
`PresentationObjects/MKMessageContentViewPresentationObject.swift`.

Vertical stack, **8pt between rendered items** (`MKMessageContentView.swift:17, 294`), in this order
(`MKMessageContentView.swift:191-296`):

1. text/blocks (`MKMessageBlockContent`, blocks stacked with 0 gap, `MKMessageBlockContent.swift:44-49, 366`), with
   optional trailing accessories (8pt gap, top-aligned, `MKMessageContentView.swift:408-452`);
2. file embeddables — e.g. the multi-image media carousel (§4.4);
3. (new) shared-thread cards, one per `threadShare` file, flag `sharableThreads` (default off): the thread's root as an
   unfurl body inset 12 all round, then a 1px divider and the thread's reply bar (10pt above and below), in an 8pt-radius
   box with a 1px `outline_secondary` border; tap opens the thread (`MKMessageContentView.swift:218-234`;
   `MKThreadShareView.swift:50-56, 118-151, 158-161, 192-195`; `Mappers/ThreadShareMapper.swift:37-46`;
   `Modules/Data/Toggles/Definitions/ios_sharable_threads.json:6`);
4. the file attachment bar (`SKAttachmentBar`, §4);
5. unfurls: legacy/piped attachments then new link cards, 8pt apart (`MKMessageContentView.swift:18, 317-350`);
6. AI translation bar;
7. reactions bar (`SKReacjiBarFrames`, always present, zero height when empty, §6);
8. AI footer action bar (Slackbot AI answers only, §2.1).

**Snapshots** (`Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageContentViewSnapshotTests/`, content
column only, no avatar/header): `testSimpleMessageContent@3x.png` ("Test Text", 20.67pt); `testMessageWithContentAndAccessories@3x.png`
(text with a red "9+" count badge on the right); `testMessageViewContentWithReactions@3x.png` /
`…WithReactionAndAddReacjiPill@3x.png` (text + reaction rows); `…WithBlockContentAttachments@3x.png`,
`…WithPreviewAttachments@3x.png`, `…WithPreviewAttachmentsSection@3x.png`, `…WithPreviewAttachmentAndPretext@3x.png`,
`…WithMixedAttachments@3x.png`, `…WithMixedAttachmentsAndReactions@3x.png` (piped attachments stacked 8pt apart);
`testMessageWithContentAndMessageFooterActionBar@3x.png` (text, reactions with "10 more" and add pill, then the footer
bar: hairline at y104.7, "Slackbot is AI and can make mistakes." ink y120–130, share/👍/👎 icons ink y147.7–165.7; 176.67pt
tall, 4pt taller than June because the label's 4pt gap now counts in the height, `MessageFooterActionBar.swift:301`).
Every other MessageKit PNG in this section is pixel-identical to June on white
(`testMessageViewContentWithPreviewAttachmentsSection` only re-encoded its transparent pixels).

### 2.1 AI footer action bar (Slackbot AI answers)

Reworked since June (`Modules/UIInfra/MessageKit/Implementation/MessageFooterActionBar.swift:26-40, 114-127, 160-186,
222-304`; `Mappers/AiResultFooterMapper.swift:16-38`). A vertical stack, top to bottom:
- a 1px `outline_tertiary` hairline, 12pt, then the disclaimer "Slackbot is AI and can make mistakes."
  (`slackbot_is_ai_and_can_make_mistakes`, yaml:20145) in Lato 13 (`.caption`) `content_tertiary`, left-aligned, 4pt —
  both only on the last loaded item and only with `hangbarUpdatesV2` (default off,
  `Modules/Data/Toggles/Definitions/ios_hangbar_updates_v2.json:6`); otherwise neither hairline nor text is drawn
  (`MessageFooterActionBar.swift:182-183`; `AiResultFooterMapper.swift:31-32`). June put the hairline and the old disclaimer
  "This tool uses generative AI, which can produce inaccurate or harmful responses." (`ai_responses_may_be_inaccurate`,
  yaml:1517, `content_secondary`) *below* the buttons on every last item;
- a 40pt row of small clear-backdrop icon buttons in `content_secondary`: share `svgShareMessage` (replaces June's
  `svgCopy`), then `thumbsUp` / `thumbsDown` only when feedback is allowed; an optional "Sources" button
  (`base_tertiary` fill, `content_secondary` text) at the trailing edge. A11y "Share Message", "Good response", "Bad
  response" (yaml:18639, 7706, 2382).
Shown for Slackbot's generated replies in the Slackbot DM once streaming ends (`AiResultFooterMapper.swift:22-27, 49-51`).

---

## 3. Text rendering (mrkdwn)

### 3.1 Which code renders a message body

- Transcript rows use `MessageStyling(headerAccessoryBadgeStyle: nil, shouldIdentifyYourMessages: true,
  shouldUseJumbomojis: true)` (`MessageTransformationMapper.swift:174-178`); the thread root adds
  `contentFolding: .unsupported(numberOfLines: 0)` (`:270-275`). Defaults: `baseFont: .body`,
  `baseTextColor: CoreColorSet.default.primary.contentPrimary` (June `.sk_primary_foreground`)
  (`MessageViewPresentationObjectFactory.swift:58-59`).
- `rich_text` blocks → `Modules/Unlayered/Services/BlockKitPresentation/Implementation/Blocks/RichTextBlock+BKContainerBlockConvertible.swift:27-49`
  → `BKRichTextBlockView` (an `SKLabel`). Messages without blocks (plain `text`) are tokenized by TSF into the same span
  model (`Modules/Data/TextExtensions/Implementation/TextResolvableSpansHelper.swift:13-107`, `TextMapper.swift:182-195`).
  **Both are styled by one file**, `Modules/UIInfra/SlackKit/Implementation/Extensions/Text+Display.swift`, drawn by
  `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Label/Layout/LayoutManager.swift`.
- Element mapping (`Modules/Data/TextExtensions/Implementation/TextWithRichBlocksResolvableBlocks+Init.swift:96-180`):
  section → paragraph; quote (border 0/1) → quote with single/double bar; preformatted (border 0/1) → code block without/with
  bar; list → one list item per entry (indent, border, style); text with `style.code` → inline code. New since June: an
  unknown element renders its `fallback` (`:167-177`); rich-text `header` elements and `header` / `divider` blocks render
  natively only with `markdownInComposer` or `opaqueBlocksInComposer` (both default off: `:25-32, 43-68, 104-112`;
  `Modules/Integration/ToggleMigrationAppRootPlugin/Implementation/ToggleMigrationPlugin+Dependencies.swift:116-120`) —
  then a header is Lato Black 28 / Black 22 / Bold 20 for levels 1 / 2 / 3+ (`.headline` / `.title` / `.subtitleBold`;
  `.subtitle` / `.bodyBlack` / `.bodyBold` with the flatter heading scale) and a divider a full-width 2-device-pixel
  `outline_tertiary` line with 8pt above and below (`Text+Display.swift:49-61, 224-292`;
  `Modules/UIInfra/SlackKit/Implementation/CoreComponents/Label/Attachments/DividerAttachment.swift:21-24`). Off (production
  default): headers read as plain paragraphs and dividers are dropped. The flatter scale is `ios_flat_message_heading_scale`
  (default off, added 2026-07-14, "to match web PR #403398"), wired at `ToggleMigrationPlugin+Dependencies.swift:71-73`.
  Block Kit `header` blocks use the same `.header` text blocks unconditionally (level 2 when unset,
  `Modules/UIInfra/BlockKitComponents/Implementation/Blocks/Header/BKHeaderBlockView.swift:77-92`).
  **The clone:** `src/app/text` draws mrkdwn, and TSF has no header or divider syntax (`TSF2NativeTokenizer.swift:105-123`),
  so headings reach a message only as Block Kit header blocks or `rich_text_header` elements, drawn by `src/blocks`
  (`blocks.css` `.bk-header--1/2/3` = headline / title / subtitleBold). Open there: `src/blocks/blocks/RichText.tsx` draws
  `rich_text_header` / `rich_text_divider` natively always, which is production only with `markdownInComposer` /
  `opaqueBlocksInComposer` on (off: a plain paragraph, no divider), and its divider is 10 pt above and below where
  `DividerAttachment` has 8.
- Not the message path (legacy/composer; don't copy their colors): `Modules/Integration/TextRendering/Interface/RichText/*`,
  `Modules/Data/TSFKit/Implementation/TextRenderer/TSF2TextRenderer.swift` ("hardly used / soon to be completely removed", `:187`) with
  `Modules/UIInfra/TSFTheme/Implementation/TSF2Theme+Default.swift:22-43`, and `App/Source/RichText/*`.

**Snapshots:** `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKLabelSnapshotTests/` (393 wide, light on top,
dark below, transparent background; many use `.title` 22pt Black instead of body 17 — scale accordingly):
`testCodeText@3x.png` (body 17 "Here is some code: `func sayHello()`"), `testStrikeText` (strike + link + channel),
`testMentionText` (@you yellow, @other and #channel blue pills, gray loading placeholders), `testQuoteText`,
`testQuoteTextWithDoubleIndent`, `testPreRenderedText`, `testPlainTextWithPreRenderedText`,
`testQuotedPreRenderedWithDoubleIndentText` (code blocks with quote bars), `testListText`, `testQuotedListText`,
`testJumboEmoji_onlyEmojis`, `testNonJumboEmoji_onlyEmojis`, `testHighlightText` / `testHighlightedText` (keyword
highlight); `Modules/UIInfra/BlockKitComponents/Snapshots/iOS_26/BlockKitComponentsTests.BKRichTextBlockSnapshotTests/testRichTextBlockWithMultipleLines@3x.png`
(17pt line pitch 20.37pt).

### 3.2 Paragraph

| property | value | source |
|---|---|---|
| font | Lato Regular 17 (`.body`); `/me` messages Lato Italic 17 | `MessageViewPresentationObjectFactory.swift:58`; `DefaultTransformationPath.swift:898-903` |
| color | `content_primary` `#1d1c1d` / `#f8f8f8` (Colors.swift:200; June `sk_primary_foreground`, dark `#d1d2d3`, measured 209,210,211 then); ephemeral/system/redacted `content_secondary` `#454447` / `#b9babd` (June `sk_foreground_max_solid`) | `MessageViewPresentationObjectFactory.swift:59`; `DefaultTransformationPath.swift:892-896` |
| line height | 1.2 em = 20.4pt, no extra leading (`usesFontLeading = false`, `lineFragmentPadding = 0`, `textContainerInset = .zero`); measured pitch 20.37pt | `Modules/UIInfra/SlackKit/Implementation/Helpers/Text/SKLabelHelpers.swift:54-56` |
| paragraph spacing | 0 | `Text+Display.swift:110-114, 1702-1711` |
| between text blocks of one `rich_text` | a single line break, no extra gap (a blank line only for `\n\n`) | `Text+Display.swift:93-102` |
| wrapping / truncation | word wrap; **no line limit and no "Show more" on message bodies** (folding only exists in previews and unfurls) | `SKLabel+PresentationObject.swift:34-46`; `Utilities/BlocksConverterUtility.swift:135`; `TextMapper.swift:219-225`; `SKLabel.swift:1041-1058` |
| top inset of each BlockKit block | first block **4pt**, later blocks 12pt (actions/divider 10, input 16), horizontal 0; plain-text (no blocks) bodies 0 | `Modules/UIInfra/BlockKitComponents/Implementation/Helpers/Utils.swift:24-53`; `RichTextBlock+BKContainerBlockConvertible.swift:38-41`; `BKRichTextBlockView.swift:78, 152-153` |

So in a real channel message the first body line starts **4pt below the name row** (the MessageKit snapshots use
zero-inset test blocks and show 0).

### 3.3 Inline styles

| style | rendering | source |
|---|---|---|
| `*bold*` | Lato Bold 17 | `TextAttributes+Display.swift:27-54`; `Modules/Data/Font/Implementation/SKFont.swift:188-218` |
| `_italic_` | Lato Italic 17; bold + italic → Lato Bold Italic | `SKFont.swift:242-276` |
| `~strike~` | single 1pt line in the span's color (≈4.4pt above the baseline, measured) | `Text+Display.swift:1600-1609` |
| underline (rich_text `style.underline` only) | single underline, text color | `Text+Display.swift:1590-1599` |
| dates (`<!date…>`) | plain formatted text, body color | `Text+Display.swift:788-795` |
| `#RRGGBB` | text + a color swatch | `Text+Display.swift:797-817` |

**Inline code** (`Text+Display.swift:774-786, 1743-1749`; `LayoutManager.swift:19, 159`;
`LayoutManagerRoundedRectanglePlugin.swift:15-104`):
- Font Menlo Regular **16** (base size − 1; Menlo Bold/Italic 16 when bold/italic) (`SKFont.swift:320-345`).
- Text `message_rendering_code`: `#e01e5a` / `#e8912d` (`SKLegacyColors.swift:339`; measured). **Unchanged in Sept**:
  `Text+Display.swift:778` still tints it, and the Sept `testCodeText@3x.png` measures (224,30,90) / (232,145,45). (The
  `content_primary` Menlo 13 in `TextAttributes+Display.swift:13-17`, "inline code in contentPrimary" in
  slackkit-components.md › SKLabel, is `defaultCodeText`, the flagged-off rich code block's style, not inline code's.)
- Background `surface_primary` `#1d1c1d@0.06` / `#f8f8f8@0.06`; border 1pt `outline_tertiary` `#5e5d60@0.13` /
  `#797c81@0.3`; corner radius 3.
- The box is the glyph run's rect: **full line height, no horizontal padding** (measured: box = whole 20.67pt line;
  glyphs start 1pt inside). Across a line wrap the first fragment rounds only its left corners, the last only its right,
  middle fragments are square (CSS `box-decoration-break: slice`, the default).
- CSS sketch: `font: 16px Menlo, monospace; color: #e01e5a; background: rgba(29,28,29,.06);
  box-shadow: inset 0 0 0 1px rgba(94,93,96,.13); border-radius: 3px; padding: 1px 0` (the padding brings Menlo's
  18.6px content box up to the 20.4px Lato line).

### 3.4 Code blocks (```)

Production uses the legacy style (the "rich" style is behind `ios_rich_code_block_rendering`, default off,
`Modules/Data/Toggles/Definitions/ios_rich_code_block_rendering.json:6-7`, switch at `Text+Display.swift:133`).

- Font Menlo Regular 16, text `content_primary` `#1d1c1d` / `#f8f8f8` (June `sk_primary_foreground`; the dark half of
  `testPreRenderedText` already measured `#f8f8f8`) (`Text+Display.swift:139-155`; `Modules/UIInfra/TextDisplay/Implementation/RichTextTheming.swift:48-57`).
  The block sets that color itself (`:145-147`), so a code block in an ephemeral or system message (`content_secondary`
  body) is still `content_primary`; the clone's `.rt-pre` does the same (`src/app/text/text.css`).
- Box spans the **full column width** (`LayoutManager.swift:163-174`); fill `message_rendering_code_block_fill` =
  `#1d1c1d@0.04` / `#d1d2d3@0.13`; 1pt border `message_rendering_code_block_stroke` = `#1d1c1d@0.13` / `#d1d2d3@0.5`;
  radius 3 (`SKLegacyColors.swift:342-343`; `Text+Display.swift:1767-1774`).
- Text inset 10pt left and right; each code line is a paragraph with 2pt spacing before and after, so lines are
  18.6 + 4 = 22.6pt apart (Menlo 16 line = 18.6pt). Box top: 0 when the block starts the message, 2pt when text precedes
  it; box bottom: 0 at the end of the message. Measured: two code lines = 41.33pt box with the first line touching the
  top (`testPreRenderedText@3x.png`); "Hello" + one code line = 21pt box with the code line 2pt below the box top
  (`testPlainTextWithPreRenderedText@3x.png`). The box sits directly under the previous line (no margin).
- Lines wrap (no horizontal scroll); all inline formatting inside is dropped except links (`Text+Display.swift:1976-1987`).
- Quoted code block: box inset 15pt (single bar) / 30pt (double) with the quote bars beside it (`Text+Display.swift:1647-1655`).
  Consecutive code blocks render as separate boxes ~0–1pt apart.
- Rich style (flag on, internal builds): Menlo 13, line height ×1.15, 12pt insets, 4pt (8 with a language) top/bottom
  spacers, language name in Lato Bold 13 `content_tertiary` (June `sk_foreground_high_solid`), copy button `svgCopy` in
  `content_secondary` → toast "Copied" (`copied`, yaml:4671), line numbers in `content_secondary` (June
  `sk_foreground_max_solid`) (`Text+DisplayCodeBlock.swift:22-29, 86, 172-192`).

### 3.5 Block quotes (`>`)

- Same font and color as the body (not grayed); indent 15pt left and 15pt right (double quote 30pt); paragraph spacing 0
  (`RichTextTheming.swift:28-37, 106-119`; `Text+Display.swift:170-193, 1687-1690`).
- Bar: 4pt wide, radius 2, at x=0 of the text area, from 2pt below the top of the first line to the bottom of the last
  line, color `outline_tertiary` (`LayoutManager.swift:111-129`; `Text+Display.swift:312-328`); second bar of a double
  quote at x=15 (`LayoutManager.swift:17, 102-106`); adjacent quoted blocks merge into one bar (`Text+Display.swift:364-384`).
  Measured: bar x 0–3.7pt, text at 15 / 30pt.

### 3.6 Lists

- Marker at `level × 29`pt; text and wrapped lines at `level × 29 + 28`pt (tab stop); inside a quote +15pt per level;
  no extra spacing between items (`RichTextTheming.swift:72-104`; `Text+Display.swift:194-223, 1526-1562`). Measured:
  numbers at x≈0, text at 28pt (`testListText`); quoted: 15 / 43pt (`testQuotedListText`).
- Bullets are icon-font glyphs in the text color, cycling by level (`Modules/UIInfra/TextDisplay/Implementation/RichTextListPrefixGenerating.swift:26-29`;
  `RichTextTheming.swift:127-158`): level 0 filled circle (`presenceOnline` U+E506, ≈ "•"), level 1 hollow ring
  (`presenceOffline` U+E507, ≈ "◦"), level 2 filled rounded square (`presenceExternalOnline` U+E509, ≈ "▪"). Dot ≈ 7.5pt
  at 17pt text, vertically centered (computed from `Modules/Data/Font/ResourceBundle/Icon/slack-icons.otf`; `SKIcon.swift:104-105`).
- Numbers: `symbol + "." + tab` — level 0 "1.", level 1 "a.", level 2 "i." (lowercase roman), repeating; starts at 1 +
  the list offset (`Modules/Data/TextModels/Implementation/OrderedListPrefixGenerator.swift:11-26`;
  `TextWithRichBlocksResolvableBlocks+Init.swift:145`). Checklists render as bullets unless checklist rendering is on
  (`checkboxEmpty` / `checkboxFull` glyphs, `:138-143`).

### 3.7 Links

`content_highlight_1` `#1264a3` / `#2ba5ce` (`Text+Display.swift:749-751`; measured), **no underline** (only with iOS
"Underline links") and no background; text = link label or the raw URL (`TextWithRichBlocksResolvableBlocks+Init.swift:311`).
Pressed: a radius-3 `surface_primary` rect behind the link until touch-up (`Modules/UIInfra/SlackKit/Implementation/Helpers/Text/TextDrawingView.swift:21-31`;
`SKLabel.swift:289-298, 401-403`). Tap → open; long-press → link actions (`SKLabel.swift:309-324, 815-886`).

### 3.8 Mentions and references

Mentions keep the surrounding weight (no bold added); background = the glyph-run rect at full line height, no padding,
radius 3 (`Text+Display.swift:1776-1783`; `LayoutManager.swift:159`; measured in `testMentionText`).

| reference | text light / dark | background light / dark | source |
|---|---|---|---|
| @other user ("@" + display name, else real name) | `message_rendering_mention_text` `#0b4c8c` / `#1d9bd1` | `surface_highlight_1` `#36c5f0@0.13` / `#036696@0.25` | `Text+Display.swift:432-494`; `SKLegacyColors.swift:338`; Colors.swift:146 |
| @you | `#0b4c8c` / `content_highlight_3` `#dea700` | `surface_highlight_3` `#ffc600@0.18` / `#a07300@0.18` | `Text+HighlightColors.swift:13-23`; Colors.swift:158, 230 |
| @here, @channel, @everyone | as @you | as @you | `Text+Display.swift:621-644` |
| user group `@handle` | yellow (as @you) if you're a member, else blue | as left | `Text+Display.swift:591-619` |
| unavailable group "[group unavailable]" (`usergroup_unavailable`, yaml:23074) | `content_secondary` (June `sk_foreground_max_solid`) | `surface_primary` | same |
| #channel ("#" + name inside the pill) | blue as @other | blue | `Text+Display.swift:526-561, 1912-1968` |
| private channel | `svgLockFilled` (≈16.7pt) + name, no "#" | blue | same |
| archived / canvas / list / unknown channel | `archive_filled.svg` / `canvas.svg` / `list_view.svg` / `info.svg` + name | blue | same |
| (new) code / Block Kit / HTML tab references | `code.svg` / `info.svg` / `eye_open_filled.svg` + name | blue | same; `Modules/Data/TextModels/Implementation/TextDependencyTypes/TextChannelConfig.swift:55-65` |
| inaccessible channel: lock + "Private Channel" (`private_channel`, yaml:15223) | `content_secondary` | `surface_primary` | `ResolvableSpans+Resolving.swift:519` |
| hidden user: `user_hide.svg` + "Name hidden" (`name_hidden`, yaml:12704) | `content_secondary` | `surface_primary` | `Text+Display.swift:443-475` |
| user not in the conversation | body text color | none | `Text+Display.swift:446-447, 490` |
| loading (unresolved) mention | 20 non-breaking spaces wide | `surface_primary` pill, 40% of line height, fully rounded | `Text+Display.swift:1228-1252`; `LayoutManager.swift:141-156` |
| DM / group-DM reference: the name only, no prefix | blue as @other | blue | `Text+Display.swift:563-589` |

Tap → user profile / channel (new: a reference that carries a tab id opens that channel tab) / group; long-press → slug
actions (`SKLabel.swift:309-324, 815-886`). Mentions have no
pressed state (only URL links do). Plain-text taps pass through to the row (`SKLabel.swift:252-287`).

### 3.9 Emoji and jumbomoji

- Unicode emoji are characters of the text font (17pt; measured ink 0.92 em, advance 1.09 em) (`Text+Display.swift:1802-1820`).
- Custom emoji: square image, side = font ascender ≈ 16.7pt at 17pt, vertically centered
  (`Attachment.swift:47-58`; `TextViewAttachmentManager.swift:185`). (New `.chip` attachments — inline compact cards
  240pt wide (full line width at accessibility sizes), ≥ 64pt tall — come only from the flagged opaque-block path,
  `Attachment.swift:16-20, 35-45`; `Text+Display.swift:243-277`.)
- **Jumbomoji** (transcript and thread): when the text is exactly one paragraph whose spans are all emoji/whitespace, the
  whole block is drawn at font × **2.0** = 34pt (line 40.8pt) (`Modules/Data/TextModels/Implementation/TextBlock.swift:257-268`;
  `TextSpan.swift:646-655`; `Text+Display.swift:46, 88, 117-121`). **No emoji-count limit** in this path. Not applied to
  plain-text (no blocks) messages (`TextMapper.swift:30`) nor to edited emoji-only messages (the "(edited)" span breaks
  the rule). Measured at 22pt → 44pt in `testJumboEmoji_onlyEmojis` (advance 44pt, row 53pt).

### 3.10 Keyword highlights

Your notification keywords (`MessageKitTransformation+Dependencies.swift:100-102`) get a square-cornered
`surface_highlight_3` background (`#ffc600@0.18` / `#a07300@0.18`); text color unchanged in light, `#dea700` in dark
(`Text+Display.swift:1610-1618`).

### 3.11 "(edited)"

- String `message_edited_label` = "  (edited)" (two leading spaces, yaml:12093); stopped AI streams: "  (stopped)"
  (`message_stopped_label`, yaml:12282), or (new) "  (stopped by %@)" when someone else stopped it
  (`message_stopped_by_user_label`, yaml:12279); (new) resolved canvas-comment roots: "  (resolved)"
  (`message_resolved_label`, yaml:12257) (`TextMapper.swift:41-61, 119-136`).
- Lato Regular **15** (`.smallBody`), `content_tertiary` `#5e5d60` / `#9a9b9e` (June `sk_foreground_high_solid`
  `#868686` / `#75777a`) (`TextMapper.swift:36-39`).
- Shown when `editedTimestamp` is set (not tombstones/huddle threads), not a bot message, not a canvas update, not a
  canvas-comment root (new), not a preview, and (for block messages) all blocks are `rich_text`; "(resolved)" takes
  precedence (`TextMapper.swift:63-70, 114-123, 249-251`).
- Appended inline at the end of the last paragraph (same baseline); if the last element is a list, quote or code block
  it goes on a new line (`TextMapper.swift:200-217`; `Text+Adding.swift:48-69, 97-113`).

### 3.12 mrkdwn syntax recognized (plain-text messages)

`Modules/Data/TSFKit/Implementation/Tokenizer/TSF2NativeTokenizer.swift:105-123`: `*bold*`, `_italic_`, `~strike~`,
`` `code` ``, ```` ```pre``` ````, `>` quote, `>>>` multi-line quote, `:emoji:` (+ `:skin-tone-2…6:`), bare URLs, `<…>`
tags (links, users, channels, groups, `!here` / `!channel` / `!everyone`, dates), `#RRGGBB`.

---

## 4. File attachments

**Source:** `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/AttachmentBar/SKAttachmentBar.swift` (layout),
`ExpandedAttachment/SKExpandedAttachment.swift` (single image/video), `ThumbnailAttachment/SKThumbnailAttachment.swift`,
`CompactAttachment/SKCompactAttachment.swift` (file card), mappers
`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Mappers/FileMapper.swift`, `FilesAndAttachmentsMapper.swift`,
`Utilities/FileUtility.swift`.

**Snapshots** (`Modules/UIInfra/SlackKit/Snapshots/iOS_26/`; since September each is a 2 × 2 grid: rows light / dark,
columns normal / high contrast, `Modules/UIInfra/SnapshotTestFoundations/Implementation/ComponentSnapshotTestCase.swift:196-215`;
the left column is pixel-identical to the June light-over-dark PNGs except where noted):
`SlackKitTests.SKAttachmentBarSnapshotTests/` (14: single expanded image, 2 resizing thumbnails — the June "ALT" badges are
gone, §4.5 —, compact file + "+2" overflow tile, multiple compact files, mixed types, vertical "See N More" overflow, AI
annotations), `SlackKitTests.SKCompactAttachmentSnapshotTests/` (9: file, image, video, error, long/short file names with
accessory icon, file with preview image, skinny/wide previews), `SlackKitTests.SKExpandedAttachmentSnapshotTests/` (14:
images with known sizes — wide, tall, skinny, small — video, alt-text badge; new: badge hidden, clear border/background,
square corners), `SlackKitTests.SKThumbnailAttachmentSnapshotTests/` (32: 64/96pt thumbnails of every state; new: badge
hidden, edit icon — composer only), `SlackKitTests.PipedTextPreviewSnapshotTests/` (2: AI summary annotation with a pipe).

### 4.1 Which layout (channel transcript)

The transcript uses `AttachmentStyling.chatView` = `.mixed(maximumExpandedCount: 1, maximumThumbnailRowCount: 1,
maximumCompactCount: nil)`, thumbnails that stretch to fill the width, known image sizes, and file preview images
(`MessageViewPresentationObjectFactory.swift:101-154`, default at `DefaultTransformationPath.swift:71-73`).
Rules (`SKAttachmentBar.swift:267-323, 448-538`):

- 2+ images/videos in one message → the **media carousel** embeddable instead of the bar (§4.4,
  `FilesAndAttachmentsMapper.swift:383-434`; classified by the resolved file state, so media downgraded to a file card
  don't count, `:417-424`).
- Any file (PDF, doc, …) present → every attachment renders full-size, file cards first, then images; unlimited rows.
- A single image/video → one expanded attachment.
- Anything else → one row of square thumbnails; overflow becomes a "+N" tile.
- Items are laid out left→right, wrapping; 8pt horizontal and vertical gaps (`SKAttachmentBar.swift:38-40, 396-424`).

### 4.2 Single image or video (`SKExpandedAttachment`)

- Width = min(original pixel width, column width) — the original size in **pixels** is used as points
  (`SKExpandedAttachment.swift:422-431, 572`); max 400 (`:85, 440`). Height = width × (h / w), clamped to
  [2 × radius, 400] (`:542-562`); unknown size → ratio 5 : 8 (h = 0.625 w, `:77-78`). Measured: 393 × 245.3 for an
  unknown-size video (`Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKUnfurlViewSnapshotTests/testUnfurlViewBlockContentWithVideoAttachment@3x.png`).
- Corner radius **15** (`SKExpandedAttachment.swift:70-71, 88-97`: the presentation object's `cornerRadius` defaults to
  `.moreRounded`, `:587, 603, 621-628`; June's `useMoreRoundedCornerRadius: true` became that enum, with `.standard` 12 and
  `.custom`), 1pt border `outline_tertiary` (`:72, 156`), placeholder background `base_secondary`; both colors can now be
  overridden per attachment, nil = those defaults (`:120-131, 583-586`, applied at `:236-238`); image `scaleAspectFill`
  (the attachment bar passes it, `SKAttachmentBar.swift:902`). Pressed: alpha 0.6 (`:73, 508-510`). Tap → full-screen file carousel
  (`Modules/Features/Handlers/MessageActionHandler/Implementation/Handlers/AttachmentsAndLinksActionHandler.swift:116-199`;
  a file with a Work Object id opens the Work Object view instead, no longer behind `workObjectLegacyFilePreview`, `:139-164`).
- Video: play badge bottom-left, inset 15 − 8 = 7pt (`:103-106, 256-258`); badge `#1d1c1d@0.7`, radius 8, padding 2/4,
  2pt gap, white `svgPlayFilled` 20pt + duration in Lato Bold 15 white, abbreviated one unit ("3m", "32s", "1h")
  (`Modules/UIInfra/SlackKit/Implementation/Helpers/VideoDurationBadge/VideoDurationBadge.swift:16-56, 123-126, 177-201`).
  Measured badge 51 × 24 at x7, 7 from bottom.
- Loading: spinner/progress 32pt; failed load: `svgWarningFilled` 30pt or refresh button `svgRefresh`
  (`SKExpandedAttachment.swift:74-75, 492-506`).
- Setting "collapse images" → images render as a file card with subtitle "Tap to view image." (`tap_to_view_image`,
  yaml:21053; `FileMapper.swift:278-289`).

### 4.3 File card (`SKCompactAttachment`) — PDF, docs, videos in unfurls, etc.

Measured in `SKAttachmentBarSnapshotTests/testMultipleCompactAttachmentsTruncated@3x.png` and
`MKUnfurlViewSnapshotTests/testUnfurlViewBlockContentWithFileAttachment@3x.png`:

- Card: full column width, height **60** (12 + 36 + 12), padding 12 all sides (`SKCompactAttachment.swift:77`),
  corner radius **15** (`:72-73, 86-88`), 1pt border `outline_tertiary` (measured `#eaeaea` light / `#37393e` dark),
  background `base_primary` (`:74, 90-93`). Max height 300 (`:80`). Pressed alpha 0.6 (`:75`).
- Icon: 36 × 36 rounded square (radius 9) filled with the file-type color, white glyph ~20pt (measured glyph 17 × 14 in
  the box) (`Modules/UIInfra/SlackKit/Implementation/Helpers/AttachmentOrnament/AttachmentOrnament.swift:25, 103-110`).
  Icon → label gap 8 (`SKCompactAttachment.swift:76`).
- Title: Lato Bold 15 (`.smallBodyBold`), `content_primary`, 1 line (`:578-580`); subtitle: Lato Regular 13, `content_tertiary`
  (`:628-633`); 2pt between them (`:78`). Title-only cards center the title vertically.
- Subtitle text (`FileUtility.swift:34-71`): "<size> <type>", e.g. "10 KB PDF" — sizes are decimal "1 KB" / "1 MB"
  (`Modules/Data/I18n/Tests/Unit/FileSizeUtilityTests.swift:21-22`), type = the file's pretty type; canvases "Last edited %@ ago" (`last_edited_time_ago`, yaml:10561); lists "Created by %@"
  (`created_by_user`, yaml:4986); emails "Email, From: …, To: …"; Surface reports (new) just the pretty type (`FileUtility.swift:49-51`).
- File type → color (`_50` palette step; `Modules/UIInfra/SlackKit/Implementation/Extensions/UIColor+FileTypeExtensions.swift:15-131`)
  and filled icon (`Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift:48-127`); palette values unchanged in
  design-tokens f76ac0a (line numbers below are f76ac0a's `Colors.swift`):

| types | color (light / dark, Colors.swift line) | icon |
|---|---|---|
| images (jpg, png, gif, heic…) | ocean `#2985cd` / `#307ec0` (1526) | `svgImageFilled` |
| audio | ocean | `svgSoundFilled` |
| video (mov, mp4…) | mojito `#2fa659` / `#369d56` (1238) | `svgVideoFilled` |
| pdf | flamingo `#ef3e75` / `#d94c75` (1814) | `svgPdfFileFilled` |
| doc/docx | ocean | `svgBrandMicrosoftWordFilled` |
| xls/xlsx/csv | mojito | `svgBrandMicrosoftExcelFilled` |
| ppt/pptx | tomato `#de4e2b` / `#d05038` (662) | `svgBrandMicrosoftPptFilled` |
| gdoc / gsheet / gpres | ocean / mojito / tangerine `#e96825` / `#d56a37` (806) | `svgDocument` / `svgSpreadsheet` / `svgPresentation` |
| canvas | lagoon `#0e9dd3` / `#1699ca` (1454) | `svgCanvasContentFilled` |
| list | honeycomb `#d38d00` / `#c48305` (950) | `svgListsFilled` |
| text, email, key/pages/rtf | ocean | `svgText`, `svgEmailFilled`, `svgFileFilled` |
| zip/binary, markdown | gray `#7c7a7f` / `#797c81` (590) | `svgNumber`, `svgBrandMarkdownFilled` |
| html/js/sql | tomato | `svgCode` / `svgCode` / `svgDatabase` |
| folder, thread share (new types) | `surface_primary` (no palette, `UIColor+FileTypeExtensions.swift:122-123`) | `svgFolderFilled` / `svgThreadsFilled` (`SKIconManifest+FileType.swift:122-125`) |
| unknown | `surface_primary` | `svgFileFilled` |

  Icons live at `Modules/Data/Icon/ResourceBundle/Icons.xcassets/<name>.imageset/<name>.svg`.
- With a preview image (e.g. PDF first page): the header row above, a 1px `outline_tertiary` divider, then the preview
  image full-bleed to the card edges, its height = card width × the image's aspect ratio, max 300 (Sept fix: June used the
  header's intrinsic width) (`SKCompactAttachment.swift:478-483`; `SKCompactAttachmentSnapshotTests/testFileWithPreviewImage@3x.png`).
- Many files: all render; when truncated the last visible card becomes a compact card + "+N" tile (64pt square, "+2" in
  Lato Bold 17 `content_secondary`) (`SKAttachmentBar.swift:519-532`, `SKThumbnailAttachment.swift:609-617`).
  Vertical overflow button: "See N More" (`see_prefix` "See " + count + " " + `more` "More", yaml:17314/12436),
  medium button, `base_primary` fill, `outline_tertiary` border (`SKAttachmentBar.swift:670-675`).
- Error/no-access cards: "This file was deleted." (`svgTrash` in `content_secondary` `#454447` / `#b9babd`, June
  `sk_foreground_max_solid`; `this_file_was_deleted`, yaml:21482), "This file isn’t visible to you" + "This file is only
  visible to members of the conversation where it was originally shared." (yaml:6915/6911), "This file was not found."
  (yaml:7000); the no-access icons (`svgWarning`, `question` glyph) are `content_primary` (June `sk_primary_foreground`)
  (`FileMapper.swift:85-86, 164-199`). The cards' default error icon is `svgWarningFilled` in `content_important`
  (`#c01343` / `#de678a`, June `sk_raspberry_red`) (`SKAttachmentBar.swift:773`; `SKCompactAttachment.swift:846`).

### 4.4 Several images/videos: media carousel

`Modules/Features/MediaCarouselEmbeddable/Implementation/MediaCarouselEmbeddableViewController.swift:16-23, 92-111, 137-140, 184-193`:
label "N attachments" (`x_attachments` "%i attachments", yaml:23963) in Lato 13 `content_secondary` `#454447` / `#b9babd`
(June `sk_foreground_max_solid` `#616061` / `#9a9c9e`) (`MediaCarouselEmbeddablePresenter.swift:79`), 6pt gap, then a
horizontally scrolling row **196pt** tall; each item an
expanded attachment (radius 15, 1pt border) **260** wide for landscape/unknown, **164** wide for portrait; 8pt apart;
the row bleeds 80pt past both column edges while scrolling, no scroll indicator; a right-swipe at the start goes back
instead of scrolling (`:196-208`). Tap an item → file carousel (as §4.2).

### 4.5 Thumbnails (`SKThumbnailAttachment`)

Square; `.small` 64, `.medium` 96, or stretched to `(width − 8 × (n − 1)) / n` (min 64) (`SKThumbnailAttachment.swift:732-747`,
`SKAttachmentBar.swift:350-372`); radius = min(20, 0.225 × side) (`SKThumbnailAttachment.swift:72-75, 90`); 1pt
`outline_tertiary` border; `base_primary` fill; overflow tile "+N" Lato Bold 17 `content_secondary`; video badge
small (Lato Bold 13, 12pt play icon); error state `svgWarningFilled` in `content_important` (`SKThumbnailAttachment.swift:753`).
**No "ALT" badge on thumbnails any more**: the badge visibility defaults to hidden for thumbnails and the attachment bar
only passes one to expanded attachments ("ALT" when alt text exists, "+ALT" when you may add missing alt text)
(`SKThumbnailAttachment.swift:366, 642, 655`; `SKAttachmentBar.swift:874-880, 902`;
`Modules/UIInfra/SlackKit/Implementation/Helpers/AltText/AltTextBadgeVisibility.swift:6-26`). June's
`SKAttachmentBarSnapshotTests/testAttachmentBarResizingThumbnails@3x.png` showed "ALT" on both thumbnails; the Sept PNG has none.

---

## 5. Unfurls and legacy attachments

**Source:** `Modules/UIInfra/MessageKit/Implementation/MKMessageUnfurlContent.swift` (pretext + pipe), `MKUnfurlView.swift`
(attachment body), `MKFieldsView.swift`, `MKActionsView.swift`,
`Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/PipeDecorator/SKPipeDecorator.swift`; new link card
`MKExternalLinkUnfurlCard*.swift`; mappers `Mappers/UnfurlMapper.swift`, `UnfurlHeaderMapper.swift`, `UnfurlTitleMapper.swift`,
`UnfurlFooterMapper.swift`, `UnfurlFieldsMapper.swift`, `ExternalLinkUnfurlMapper.swift`, `Utilities/UnfurlClassifier.swift`.

**Snapshots:** `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageUnfurlContentSnapshotTests/`
(`testUnfurlContentSimple` gray pipe, header with 16pt icon, title, divider, text, image, footer; `…PipeColor` yellow pipe;
`…Pretext` "PreText" above the pipe; `…PretextAndPipeColor` light-blue pipe; `testUnfurlWithFields` two-column fields;
since June only the colored pipes changed: the fixtures moved from `sk_sunshine_yellow` / `sk_frosty_blue` to
`highlight3.outlineSecondary` / `highlight1.outlineSecondary`, `Modules/UIInfra/MessageKit/Tests/Unit/MKMessageUnfurlContentSnapshotTests.swift:35, 56, 67`),
`MessageKitTests.MKUnfurlViewSnapshotTests/` (14 bodies without the pipe: title only, header only, header + title, block
text/section/divider combos, footer text with/without icon, single image, video with "▶ 3m" badge, file card "BipBop",
Salesforce record card, everything), `MessageKitTests.MKBlockContentSnapshotTests/` (4 block-only bodies). In the section
variants of both (and `MKMessageContentViewSnapshotTests/testMessageViewContentWithPreviewAttachmentsSection`) the
unchecked checkbox accessories (x 372–393) lost their white fill (now clear); that is a BlockKit change (blockkit.md).

### 5.1 Piped attachment (default for link unfurls, bot attachments, shared messages)

- Pretext (optional): Lato 17 `content_primary`, 4pt above the pipe block (`MKMessageUnfurlContent.swift:21-24, 61-83, 109-112`).
- Pipe: **4pt** wide bar, full height of the block, fully rounded (radius 2), at the column's left edge; content inset
  top 4, left 12, bottom 4, right 0 (`SKPipeDecorator.swift:11-14, 57-68, 83-97`). Measured: content x=12 from the pipe,
  pipe spans the whole block (`testUnfurlWithFields@3x.png`). Color = the attachment's `color` hex, else
  `outline_tertiary` (`#5e5d60@0.13` / `#797c81@0.3` = `#eaeaea` on white, `#37393e` on `#1a1d21`; June
  `sk_foreground_low_solid` `#dddddd` / `#323538`); hidden when `hideColorBar` or when the attachment is only GIFs,
  tables, shortcuts or prompts (`UnfurlMapper.swift:617-633`); block-only unfurls also `outline_tertiary` (`:184`). The
  view's own default is `outline_tertiary` too (`MKMessageUnfurlContentPresentationObject.swift:29`).
- Forwarded (shared) messages behind `forwardMessageCard` (default off, `Modules/Data/Toggles/Definitions/ios_forward_message_card.json:6`;
  `UnfurlMapper.swift:117, 138`): a card instead of the pipe, radius 12 continuous, 1pt `outline_tertiary` border, 12pt
  padding all round (`MKMessageUnfurlContent.swift:68-80`;
  `Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/CardDecorator/SKCardDecorator.swift:6-10, 26-45, 58-70`).
- Body stack, 4pt gaps (`MKUnfurlView.swift:20-29, 82-189`): header → title → compact file card → text blocks → fields →
  files/images → embeddables → footer → action buttons → forwarded child attachments, each a nested unfurl or link card
  (flag `forwardMessageAttachments`, default off, `UnfurlMapper.swift:116, 141-163`; `MKUnfurlView.swift:156-186`).
  - Header: 16pt icon (author/service icon; `.verySmall` ornament, image radius 4, `SKEntityOrnamentView.swift:403-427`)
    + 4pt + Lato Bold 17 `content_primary`, 1 line (`MKUnfurlView.swift:228-236, 334`). Header text is the author name
    (bold, `content_primary`; June `sk_primary_foreground`) optionally followed by the author subname in
    `content_tertiary` `#5e5d60` / `#9a9b9e` (June `sk_foreground_high_solid` `#868686` / `#75777a`), or the service name
    (`content_primary`); "Service | Author" uses `attachment_service_name` "%@ | %@" (yaml:2285) in `content_tertiary`;
    forwarded bot messages show the attachment's author subname as the name, with no subname after it
    (`UnfurlHeaderMapper.swift:128-188`). Not shown for twitter/salesforce/slackhelp/bluesky service names (`:190-192`).
  - Title: Lato Bold 17 `content_primary`; a link (link color, §3) when the attachment has a title URL
    (`MKUnfurlView.swift:248-251`, `UnfurlTitleMapper.swift:27-39`).
  - Text: blocks rendered like message text, collapsed to **14 lines** with "Show more" / "Show less"
    (`show_more` yaml:18969, `show_less` yaml:18960) (`UnfurlMapper.swift:29, 886-893`). New flag `unfurlBlockTruncation`
    (default off) instead folds the whole block stack to 300pt with a Show more/less control (`UnfurlMapper.swift:33,
    479-485`; `MKUnfurlView.swift:105-118`; `MKMessageBlockContent.swift:390-406`).
  - Fields: title Lato Bold 17, value Lato 17, both `content_primary`; short fields pair up in two equal columns with a
    4pt gap, a short field without a neighbour and long fields take the full width; 4pt between rows and between title
    and value (`MKFieldsView.swift:16-41, 279-283`). Measured second column x = 12 + (381 − 4)/2 + 4 ≈ 205.
  - Image: expanded attachment rules of §4.2 (radius 15, 1pt border).
  - Footer: 16pt icon + 4pt + Lato 13 `content_secondary`, wraps (`MKUnfurlView.swift:238-246`). For shared messages
    the footer reads "Posted in #channel | Jun 4th at 10:42 AM", "Thread in #channel | …", "From a thread in #channel | …",
    "Direct Message | …" or "From a private conversation" (`UnfurlFooterMapper.swift:155, 171-205`; strings
    `posted_in_channel_x` yaml:14973, `thread_in_x` yaml:21638, `from_a_thread_in_channel_no_prefix_symbol` yaml:7494,
    `direct_message` yaml:5452, `from_a_private_conversation` yaml:7488).
  - Actions: legacy attachment buttons stacked vertically, 4pt apart (`MKActionsView.swift:14-16, 43-56`).
- Tap anywhere not handled by a child → opens the unfurl/link (`MKUnfurlView.swift:65-80`).

### 5.2 New link preview card (behind the `newLinkUnfurlPreviews` flag, still default off)

Reworked since June. Only when the flag is on (`Modules/Data/Toggles/Definitions/ios_new_link_unfurl_previews.json:6`), the
attachment carries the server's `media_type`, and it isn't a shared message with blocks or text (`UnfurlClassifier.swift:54-68`;
June instead excluded any blocks, channel, file or Slackbot-search attachment); otherwise links use §5.1. The **style comes
from `media_type`**, no longer from the number of links: link → full, video → video, social → social, audio and compact →
compact (`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Mappers/ExternalLinkUnfurlMapper.swift:199-214`).
`MKExternalLinkUnfurlCard.swift:18-47, 182-273`, `MKExternalLinkUnfurlCard+Header.swift:21-105, 131-193`:

- Card: radius 12, clipped, 1pt border `outline_tertiary` (June `sk_foreground_low`), at most **420** wide, no pipe
  (`MKExternalLinkUnfurlCard.swift:18-47, 108-115`).
- Full / video: header (padding 12 all round, 4pt stack gap): title Lato Bold 15 `content_primary` (unlimited lines),
  subtitle (author) Lato 13 `content_secondary` 1 line, then the service row: 18pt service icon, 8pt gap, source name
  Lato 13 `content_tertiary` (June: 20pt icon, 6pt gap, `sk_foreground_max_solid`); then the image full width at 16 : 9
  with a 1pt `outline_tertiary` hairline on its top edge when a header is shown (`MKExternalLinkUnfurlCard+Header.swift:131-193`;
  `MKExternalLinkUnfurlCard+Image.swift:33-53`; `ExternalLinkUnfurlMapper.swift:136-140, 216-225`). With no service name the
  author is used as the source (`:170-180`).
- Social: as full plus the post text in Lato 15 `content_secondary`, max 5 lines; title = display name (or author),
  subtitle = the handle (`MKExternalLinkUnfurlCard+Header.swift:59-77`; `ExternalLinkUnfurlMapper.swift:146-168`).
- Compact (audio, compact): at least 90 tall, header style compact (title max 2 lines, source 1 line, centered), a square
  image as tall as the card on the trailing side with a hairline on its leading edge, dropped when the header wouldn't fit
  in 90pt beside it (`MKExternalLinkUnfurlCard+Compact.swift:24, 34, 58-61, 126-143`).
- Tap → open URL; long-press → context menu (only when it has actions) with a preview card (title Lato Bold 17,
  description 7 lines, padding 20); forwarded child cards have no menu (`MKExternalLinkUnfurlCard.swift:54-68, 132-178`;
  `MKExternalLinkUnfurlCard+Header.swift:32-95`; `ExternalLinkUnfurlMapper.swift:75-95`).

---

## 6. Reactions

**Source:** pill `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Reacji Pill/SKReacjiPill.swift` (animations in
`…/Reacji Pill/ReacjiAnimationHelpers.swift`); bar (layout, wrapping, overflow)
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Reacji Bar/SKReacjiBar.swift`; placement
`Modules/UIInfra/MessageKit/Implementation/MKMessageContentView.swift:269-294`; data rules
`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Mappers/ReactionsMapper.swift`; transcript config
`MessageTransformationMapper.swift:159-164` (channel + thread replies) and `:259-266` (thread root); reactors sheet
`Modules/Integration/Reactors`; quick-react popover `Modules/UIInfra/ReactionUI`.

**Snapshots** (SlackKit PNGs, transparent background, since September a 2 × 2 grid: rows light / dark, columns normal /
high contrast, `ComponentSnapshotTestCase.swift:196-215`; the normal-contrast column is unchanged since June):

- `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKReacjiPillSnapshotTests/`: `testReacjiPill@3x.png` (👍🏻 99,
  unselected, 59.33 × 30); `testReacjiPillSelected@3x.png` (2pt blue border, light-blue fill, blue count);
  `testReacjiPillNoEmoji…` (text-only "99", 35.33 × 30); `testReacjiPillMultiEmoji…` (5 skin-tone 👍 + "99", 155.33 wide);
  `testReacjiPillMultiSkinToneEmoji@3x.png` (5 💏 + "50"); `…Truncated@3x.png` (6 variants then "… 99").
- `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKReacjiBarSnapshotTests/` (393 wide, 20 reactions, first selected):
  `testReacjiBar@3x.png` (4 rows), `…WithAddReacjiPill` (add pill last), `testReacjiBarTruncated@3x.png` (2 rows ending
  "9 more"), `testReacjiBarTruncatedWithAddReacjiPill@3x.png` (2 rows, "10 more" + add pill), `testReacjiBarExpanded…`
  (4 rows + "Show less"), `testReacjiBarEmptyWithAddReacjiPill@3x.png` (only the 38 × 30 add pill).
- In messages: `MKMessageViewSnapshotTests/testMessageViewWithReactions@3x.png` (collapsed to 2 rows, "11 more"),
  `…WithReactionAndAddReacjiPill@3x.png` ("12 more" + add pill), `MKMessageContentViewSnapshotTests/testMessageViewContentWithReactions@3x.png`,
  `…WithMixedAttachmentsAndReactions@3x.png` (bar 8pt under the last unfurl),
  `MKMessagePreviewSnapshotTests/testMessagePreviewWithNonInteractableReactions@3x.png` (disabled pills look the same).

### 6.1 Placement

Last content block of the message: after text, files, unfurls and the translation bar, before the AI footer bar; 8pt
below the previous block (`MKMessageContentView.swift:17, 269-280, 294`); x = 64, 313 wide in a 393 row (measured); the
row's 8pt bottom inset follows (`MKMessageView.swift:56`). No reactions → zero size, no gap
(`SKLayoutCalculator.swift:110-113`).

### 6.2 Pill

| property | value | source |
|---|---|---|
| height | **30** = 22 content + 4 top + 4 bottom (measured 30) | `SKReacjiPill.swift:38, 40` |
| horizontal padding | 8 left, 8 right | `SKReacjiPill.swift:38` |
| emoji | 22 × 22 frame per skin-tone variant, 2pt apart; native emoji drawn with the system emoji font sized to the box (👍 ink ≈ 17 × 19 measured); custom emoji are images | `SKReacjiPill.swift:37, 179`; `SKEmoji.swift:25, 181-206` |
| count label | Lato **Bold 13** (`.captionBold`), padding 0/2/0/2, min height 22, vertically centered, 1 line; raw integer (no "K") | `SKReacjiPill.swift:39, 48, 196-207, 374, 417` |
| emoji → label gap | 2 | `SKReacjiPill.swift:37` |
| width | 16 + n × 22 + (n − 1) × 2 + (2 + label width incl. its 4pt padding, if there is a count); no minimum; capped at the bar width. Measured: 👻 "1" = 51.67, text-only "99" = 35.33, add pill = 38 | `SKReacjiPill.swift:226-239`; `SKReacjiBar.swift:390-391` |
| corner radius | min(w, h) / 2 = 15 (capsule), continuous curve | `SKReacjiPill.swift:84, 107` |
| border | none; **2pt** inside the bounds when selected (CSS: inset box-shadow) | `SKReacjiPill.swift:41, 288-309` |

| state | background | count text | border |
|---|---|---|---|
| normal | `surface_primary` `#1d1c1d@0.06` / `#f8f8f8@0.06` (Colors.swift:134; `#f2f2f2` on white, measured) | `content_primary` `#1d1c1d` / `#f8f8f8` | — |
| pressed | `surface_secondary` `#1d1c1d@0.25` / `#f8f8f8@0.25` (Colors.swift:140) | `content_primary` | — |
| selected (you reacted) | `surface_highlight_1` `#36c5f0@0.13` / `#036696@0.25` (Colors.swift:146) | `content_highlight_1` `#1264a3` / `#2ba5ce` | 2pt `outline_highlight_1` `#1264a3` / `#2ba5ce` (Colors.swift:308) |
| selected + pressed | `surface_highlight_1` darkened 20% (computed ≈ `rgba(43,158,192,0.30)` / `rgba(2,82,120,0.40)`) | blue | as selected |

Styles: `SKReacjiPill.swift:47-56, 311-341`. (The standalone dark `testReacjiPillSelected` PNG shows a `#1264a3`
border; the bar PNGs and the token give `#2ba5ce` — use the token.)

### 6.3 Bar layout, wrapping, overflow (`SKReacjiBar.swift:364-559`)

- Left-aligned; 8pt between pills and 8pt between rows (`SKReacjiBar.swift:25-28`); a pill that doesn't fit wraps (`:400-419`).
- Transcript bars are collapsed to at most **2 rows** (`MessageTransformationMapper.swift:163, 265`). When collapsed,
  trailing pills are removed to make room for an **"N more"** pill (N = hidden reactions), then the add pill
  (`SKReacjiBar.swift:467-510, 522-548`). Expanded bars with more than 2 rows end with a **"Show less"** pill before the
  add pill (`:527-531, 550-554`). Both are text-only pills styled like unselected pills (`:568-581`).
- Add-reaction pill: icon only, `SKIconManifest.svgAddReaction` →
  `Modules/Data/Icon/ResourceBundle/Icons.xcassets/add_reaction.imageset/add_reaction.svg`, drawn in a 22 × 22 frame,
  tinted `content_primary` (`SKReacjiPill.swift:181-192`; `SKReacjiBar.swift:561-566`); 38 × 30 (measured); always last.
  Shown in channels and thread replies only when at least one reaction exists (`MessageTransformationMapper.swift:162`);
  always shown on the thread root except file-channel comment roots (`:259-266`, `ReactionsMapper.swift:145-150`).
- Data (`ReactionsMapper.swift`): skin-tone variants of one base emoji merge into one pill (variants side by side,
  counts summed, selected if you used any variant, `:122-139`); more than 6 variants → first 6 then "… N"
  (`SKReacjiPill.swift:42, 409-418`); order = server order (`ReactionsMapper.swift:98, 143`); no bar when reactions are off or content is
  redacted (`:85-86`); read-only messages make pills non-interactive with no visual change (`:65-68`). A reaction whose
  emoji isn't loaded yet now always gets a placeholder custom-emoji pill (June: skipped unless a flag was on) (`:115-121`).

### 6.4 Behavior and animation

- Tap a pill → toggle your reaction (removes all your variants if you reacted; else adds it with your default skin tone),
  selection haptic (`ReactionAction.swift:79-101`; `SKReacjiPill.swift:261-265`); adding one now also bumps that emoji in
  your frecent emoji (`PrimaryMessageActionHandler.swift:212-227`).
- Long-press a pill (0.25s, fires on begin) → Reactors sheet, view-only, on that reaction's tab (`SKReacjiPill.swift:44, 92-96`;
  `PrimaryMessageActionHandler.swift:200-204`).
- Tap "N more" / "Show less" → expand/collapse that message's bar, remembered per message
  (`MessageListActionHandler.swift:156-164`). Tap the add pill → emoji picker (`PrimaryMessageActionHandler.swift:229-231`);
  long-press it → quick-react popover (flag `quickEmojiReactionOnMessage`, `:206-210`).
- Press: pill scales to **0.94**, smooth spring (damping 1.0), 0.2s down / 0.4s up, color change inside the same
  animation (`SKReacjiPill.swift:43, 330-340`; `UIView+BounceMode.swift:21-35`; `UIView+SpringAnimation.swift:73-129`).
- Select/deselect border: spring, perceptual 0.25s, bounce 0.15 (`SKReacjiPill.swift:292-306`).
- Your new pill: alpha 0→1, scale 0.7→1, bouncy spring (damping 0.7) 0.431s; your +1 on an existing pill: new number
  slides up from below while the old one slides out the top (2.5pt past the edge) and fades, pill clips
  (`ReacjiAnimationHelpers.swift:26, 46-97`). Add pill first appearing: fade in 0.3s ease-in-out after 0.1s
  (`ReacjiAnimationHelpers.swift:14-17, 33-43`). Only your own actions animate (`SKReacjiBar.swift:119-164`). All skipped
  with Reduce Motion.

### 6.5 Copy (`localized_strings.yaml`)

`ellipsis_with_count` "… %d" (6148), `show_number_more` "%@ more" (18978), `show_less` "Show less" (18960), `reactions`
"Reactions" (15556, bar a11y prefix), `view_reactions` "View Reactions" (23264), `a11y_custom_action_add_reaction`
"Add %@ reaction" (127), `a11y_custom_action_remove_reaction` "Remove %@ reaction" (136), `add_reaction` "Add Reaction" (827).
Pill a11y label: "<count>, <emoji names>" (`SKReacjiPill.swift:467-481`).

### 6.6 Reactors sheet (who reacted)

Snapshots: `Modules/Integration/Reactors/Snapshots/iOS_26/ReactorsServiceTests.ReactorsViewControllerViewTests/`
(`testViewInViewOnlyMode@3x.png`: tabs "🙂 2" and "▢ 1", two user rows; `testViewInEditMode@3x.png`: adds a red "Remove"
button and the "Add a reaction" footer; `testReactWithEmojiButton…` variants).

- Bottom sheet: short form 300pt, long form to 12pt below the top; dragging up locks long form
  (`Modules/Integration/Reactors/Implementation/ReactorsViewController.swift:24, 325-340`).
- Tab strip 60pt tall, `base_primary`, 1pt bottom border `outline_tertiary` (`#5e5d60@0.13` / `#797c81@0.3`), 3pt
  selection indicator `content_highlight_1` (`#1264a3` / `#2ba5ce`) (June `sk_primary_background`,
  `sk_foreground_low_solid` `#dddddd`/`#323538`, `sk_highlight` `#1264a3`/`#1d9bd1`), insets 0/10/0/10, tabs stretch when
  narrower than the screen (`ReactorsViewController.swift:35-39, 222-226, 264-277`). Tab: 24pt emoji, 6pt gap, count Lato
  17, insets 18/12/18/12; unselected tabs scaled 0.8; count color moves from `content_primary` to `content_highlight_1`
  when selected (June `sk_primary_foreground` → `sk_highlight`) (`ReactorsPagingCell.swift:18-38, 102-126`). Counts ≥ 1000 use "%@K" (`reaction_count_in_thousands`, yaml:15549);
  ≥ 99999 shows "∞" (`ReactionsHelper.swift:18-33`; note the code passes `count % 1000` into "%@K").
- Page: header ":<emoji name>:" in Lato Bold 15 `content_primary` (`ReactorsPageListModel.swift:76-81`); user rows with
  36pt avatar at x=16, 56pt pitch (measured); tap a row → dismiss + open that profile (`ReactorsPageViewController.swift:80-89`).
- Edit mode only (the transcript opens view-only): red "Remove" on your row (`remove`), header button "React with :%@:"
  (`react_with_emoji`, yaml:15546), and a 60pt "Add a reaction" footer (`add_a_reaction`, yaml:674) with the add-reaction
  icon (`content_primary`), text `content_tertiary` `#5e5d60` / `#9a9b9e` (June `sk_foreground_high_solid` `#868686` /
  `#75777a`), `base_primary` fill, 1pt top border `outline_tertiary` (June `sk_foreground_low` `#1d1c1d@0.13`), 16pt
  rounded top corners, alpha 0.6 pressed (`AddReactionControl.swift:16-50`; `ReactorsAddReactionContainerView.swift:12-30, 59-74`).

### 6.7 Quick-react popover (long-press the add pill; flagged)

Your 5 most-used emoji + an add button (`QuickEmojiReactionsPresenter.swift:57, 78-97`); 44 × 44 pill buttons (12pt
insets around 20pt content), 6pt apart, inside a 12pt inset; container radius 20, `base_primary`; buttons `base_secondary`,
`surface_secondary` when selected; ≈ 318 × 68 (computed) (`QuickReactionPickerViewController.swift:265-277, 290-299`;
`SKPillButton.swift:166, 341-347, 470, 502-507`; a pill without an icon no longer reserves the 20pt icon height, `:341`,
but the emoji buttons are pinned to the add button's height, `QuickReactionPickerViewController.swift:279-287`). Picking an
emoji now also records it in your frecency list (`QuickEmojiReactionsPresenter.swift:110-122`). Placed 8pt above the pill (or 4pt below if no room), centered; screen
dimmed black@0.5, tap outside dismisses (`FloatingPopoverPresentationController.swift:55, 137-209`). Present: grows from
the pill, spring 0.3s damping 0.7; dismiss 0.2s ease-in-out (`QuickReactionPickerTransitionAnimator.swift:133-138`).

---

## 7. Thread reply bar

**Source:** `Modules/UIInfra/MessageKit/Implementation/MKRepliesInfoView.swift`, mapper
`Modules/Unlayered/Libraries/MessageKitTransformation/Implementation/Mappers/RepliesInfoMapper.swift`, avatar pile
`Modules/UIInfra/SlackKit/Implementation/DesignerComponents/AvatarPile/SKAvatarPile.swift`, press feedback
`Modules/UIInfra/SlackUI/Implementation/LegacyWidgets/ContainerControl.swift`.

**Snapshots** (`Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageViewSnapshotTests/`):
`testMessageViewWithRepliesInfo@3x.png` (4 avatars, "99 replies", "Yesterday at…" truncated);
`testMessageViewNoPrimaryTextWithRepliesInfo@3x.png` (bar directly under the body);
`testMessageViewWithRepliesInfoAndAiAppThreadTitle@3x.png` (bold gray title line above the replies row, avatars
top-aligned; the view still supports it but the transcript no longer passes a title, §7.3); `…_long` (title truncated
"…"); `…_empty` (blank title ignored, same height as plain); `…_dynamicTypeXXL`;
`…_withDraft` ("✎ 1 draft"); `…_withScheduled` ("🕓 1 scheduled"); `testMessageViewWithRepliesInfoWithOnlyDraft@3x.png`
("✎ 1 draft", no avatars); `testMessageViewWithSecondaryTextAndEmptyReplyBar@3x.png` (one 28pt `#eaeaea` placeholder
square). Avatar pile: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKAvatarPileSnapshotTests/testMaxAvatars@3x.png`
(28pt avatars, 7pt gap).

### 7.1 Layout

- Placement: 8pt below the message content (incl. reactions) (`MKMessageView.swift:268, 276-286`), directly under the
  header when there is no content; left edge at the text column (x = 64); row bottom inset 8 follows. Measured in
  `testMessageViewWithRepliesInfo@3x.png`: last reaction row ends y125.33, avatars y133.33–161.33, view 169.33 tall.
- `[avatar pile] 8 [right column]`, vertically centered (top-aligned when an AI title is present)
  (`MKRepliesInfoView.swift:21-24, 92-110`). Right column: `[title] 4 [replies label 8 timestamp]` (`:112-136`).
- Avatars: up to 5 (`RepliesInfoMapper.swift:21, 101`), **28 × 28** (`.small`), **7pt** apart (side / 4), no overlap and no
  "+N" tile (`MKRepliesInfoView.swift:154-164`; `SKAvatarPile.swift:112-119, 207-224`); corner radius 7 (10/40 of the side,
  `SKImageView.swift:85-92, 213-229`); placeholder `base_tertiary` `#eaeaea` / `#212428`. Measured avatar x: 64, 99, 134,
  169; text starts at x205.
- The replies label never truncates; the timestamp truncates with "…" (`MKRepliesInfoView.swift:129-133`).

| element | font | color |
|---|---|---|
| replies count ("3 replies") | Lato Regular 15 (`.smallBody`), 1 line | `content_highlight_1` `#1264a3` / `#2ba5ce` (`RepliesInfoMapper.swift:22`, `highlight1.content`; June `sk_highlight` `#1264a3` / `#1d9bd1`; the view's own color is the same token, `MKRepliesInfoView.swift:166-168`) |
| last-reply timestamp | Lato Regular 15, 1 line | `content_tertiary` `#5e5d60` / `#9a9b9e` (`MKRepliesInfoView.swift:170-176`; measured `#5e5d60`) |
| AI app thread title (no longer set by the transcript, §7.3) | Lato Bold 15 (`.smallBodyBold`), 1 line | `content_secondary` `#454447` / `#b9babd` (`MKRepliesInfoView.swift:138-152`) |

### 7.2 Copy

Counts via `SLKPluralString+Helpers.swift:573-637` (yaml line in parentheses): "1 reply" (13872), "%@ replies" (6847 /
14397; used for 0, 2+), "1 draft" (13699), "1 reply & 1 draft" (13875), "%@ replies & 1 draft" (6850 / 14400),
"%@ scheduled" (17011), "1 reply & %@ scheduled" (13878), "%@ replies & %@ scheduled" (6853), "%@ scheduled & 1 draft" (6859).

Timestamp = latest reply time via `shortOrdinalDisplayString` (`TimeUtility.swift:713-786`): "Today at 10:00 AM",
"Yesterday at 11:03 AM", "Jun 3rd at 9:41 AM", "Dec 12th, 2025 at 9:41 AM" (other year). There is **no "Last reply"
prefix** in iOS (the `last_reply` key is only used for email thread headers).

### 7.3 Rules and states

- Hidden on thread-broadcast copies and on replies inside the thread view (`RepliesInfoMapper.swift:26`); hidden when
  there are no replies, drafts, failed or scheduled replies (`:43-45`).
- Timestamp only when replies exist and there is no draft/scheduled reply (`:50, 88-90`); with exactly one scheduled
  reply and nothing else it shows the scheduled send time (`:78-80`).
- Draft → "✎ " prefix and scheduled → "🕓 " prefix, both glyphs `content_highlight_1` (June `sk_highlight`); failed
  replies → trailing cloud glyph in `content_important` `#c01343` / `#de678a` (June `sk_raspberry_red` `#e01e5a`)
  (`:71-83, 116-147`). These are legacy icon-font glyphs (pencil U+E024, scheduledSend U+E07A, cloudOfflineSmall U+E0A1,
  `SKIconManifest.swift:42, 105, 141`); nearest SVG assets are `edit`, `schedule_send`, `cloud_offline` (substitutes).
- Failed replies count toward the total; you are added to the avatars (`:39-47`). Huddle threads (new): Slackbot's reply is
  not counted and Slackbot is dropped from the avatars (`:34-37`). June's Slackbot-as-bell avatar swap (Slackbot AI) is gone:
  repliers show their own avatar, system-notification users their resolved one (`:100-114`).
- **No AI app thread title any more**: June's `aiAppThreadTitle(for:)` (AI-agent conversations) was removed and the mapper
  builds the bar without a title (`:93-95`), so it is always one row, vertically centered.
- Pressed: `base_tertiary` background extending 4pt beyond the bar on every side, radius 11 (7 + 4, continuous); appears
  instantly, fades out over 0.15s on release (`MKRepliesInfoView.swift:26-31`; `ContainerControl.swift:27-38, 70-146`).
- Tap → pushes the thread (`MessageListActionHandler.swift:243-252, 458-533`); a canvas-comment thread root opens the
  canvas comment section instead (`:483-486`); failed messages (and, behind `blockPendingMessageDetailsNavigation`,
  pending ones) open the message actions instead (`:488-511`). VoiceOver: "<title>, <replies text>".

### 7.4 Broadcast replies in the channel

- Mustache above the body (max 2 lines, 8pt below it): "Replied to a thread: " (`replied_to_a_thread`, yaml:16427) in
  Lato 17 `content_secondary` `#454447` / `#b9babd` (June `sk_foreground_max_solid` `#616061` / `#9a9c9e`), a line
  break, then the parent message text in Lato Bold 17 `content_highlight_1` `#1264a3` / `#2ba5ce` (June `sk_highlight`
  `#1264a3` / `#1d9bd1`) (`Mappers/BroadcastMessageMapper.swift:17-44`; `MKMessageView.swift:253-257`;
  `DefaultTransformationPath.swift:311`).
- "View newer replies" (`view_newer_replies`, yaml:23246): Lato 17 `content_highlight_1`, 1 line, only on channel copies
  of thread replies when newer replies exist (`ViewNewerRepliesMapper.swift:11-26`); tap opens the thread
  (`MessageListActionHandler.swift:253-258`).

---

## 8. Dividers: date and "NEW" (`MKDivider`)

**Source:** `Modules/UIInfra/MessageKit/Implementation/MKDivider.swift`; inserted by the transcript
(`MessageTransformationMapper.swift:100-126`; insertion rules in §9.3).

**Snapshots** (`Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKDividerSnapShotTests/`):
`test_newUnread_date_boldAndReturnError_@3x.png` ("Yesterday" bold left, red "NEW" right, red hairline under both, 36pt
tall); `test_newUnreadAndReturnError_@3x.png` ("NEW" only + red hairline, 31pt); `testDividerWithNoLabelAndReturnError_@3x.png`
(a single 1px `#eaeaea` line — the separator used under a thread root).

- Layout: 5pt top padding, label row, 5pt, 1px separator, 5pt bottom padding; with no label: only the 1px line, no
  padding (`MKDivider.swift:21-25, 96-111, 266-282`). Label row inset 12pt left and right (`Spacing.large`,
  `Modules/Data/DataModels/Implementation/Layout/Spacing.swift:39`); the separator is inset 12pt on the left only and
  runs to the right edge (`MKDivider.swift:142-146`). Background = list background (`MKDivider.swift:91`).
- Date label: Lato **Black** 17, `content_primary`, left (`MKDivider.swift:209-218`). Text = "Today", "Yesterday", else
  "MMM d" + ordinal ("Jun 4th"), + ", yyyy" when not the current year ("Jun 4th, 2025")
  (`MessageTransformationMapper.swift:105-108` → `TimeUtility.swift:879-927`; `today` yaml:21781, `yesterday` yaml:24196).
- "NEW" label (`new_all_caps` = "NEW", yaml:12791): Lato Bold 13, `content_important` (`#c01343` / `#de678a`),
  right-aligned (`MKDivider.swift:186-188, 220-230`); 5pt from the date label when both are shown (`:130`).
- Separator color: `outline_important` (`#e01e5a` / `#d94c75`) when the divider marks the last-read position, else
  `outline_tertiary` (`MKDivider.swift:241-249`). Height = 1 physical pixel (0.33pt @3x) (`MKDivider.swift:22`,
  `MKRootMessageView.swift:29`). Measured: red line `#e01e5a`, gray line `#eaeaea`, labels at x=12, "NEW" ends at x≈381.
- At accessibility text sizes (AX XXL+) the labels stack vertically and "NEW" becomes left-aligned (`MKDivider.swift:78-85, 227`).
- Not tappable (`MessageTransformationMapper.swift:122`); a11y trait header, label "Yesterday, NEW".

---

## 9. Message list (transcript)

**Source:** `Modules/Features/MessageTranscript/Implementation/` (view controller, presenter, interactor, `Pipeline/`,
`Plugins/`). There is no transcript-level snapshot (no channel intro, join/leave, ephemeral or pinned row PNGs in any
`Snapshots/iOS_26` or `App/Snapshots`).

### 9.1 List container

| property | value | source |
|---|---|---|
| view | `SKList<MKMessagesListAdapter>` pinned to the VC edges, safe area ignored | `MessageTranscriptViewController.swift:39-47, 71-76`; `Modules/UIInfra/MessageKit/Implementation/MKMessagesAndEntitiesListAdapter+Typealias.swift:11` |
| orientation | **not inverted**; bottom-anchored (`scrollAnchoring = .bottom(alignShortContentToBottom:, shouldReanchorOnContentChange:)`): new messages stay in view when you are near the bottom; re-anchoring pauses while an AI message is actively streaming. The first output waits for the list state, so a conversation's content lands in one non-animated update. (Slackbot threads, flag `slackbotPinToTop`, default off: `.bottom(pinnedRowId:)` pins your latest prompt to the top of the viewport while the answer streams in below it.) | `MessageTranscriptInteractor.swift:133-135, 647-660`; `Modules/UIInfra/SlackKit/Implementation/CoreComponents/List/PresentationObject/SKListScrollAnchoring.swift:11-16`; `Plugins/SlackbotThreadScrollBehaviorsPlugin.swift:22-25, 57-68` |
| short history | channels/DMs: pushed down to sit right above the composer (`alignShortContentToBottom = true`: top inset = max(chrome, viewport − content)); threads: start at the top (AI-assistant threads excepted) | `Implementation/Data/MessageTranscriptPluginInput+SKList.swift:13-26`; `…/List/Accounting/TopContentInsetAccounting.swift:76-84` |
| background / pressed row | see §1.4 (`base_primary` `#ffffff` / `#1a1d21`, June `sk_primary_background`; full-row `base_tertiary`, no bounce) | `ListThemeOptions.swift:65-71`; `MessageTranscriptPresenter.swift:266-272` |
| space between rows | no separators; 8 bottom + 8 top = **16** between two full messages, 8 + 4 = **12** before a grouped continuation | `MKMessageView.swift:55-57, 124-125, 539-542`; `DefaultTransformationPath.swift:320` |
| insert/update animation | spring, smooth, medium: 0.4s, damping 1.0 (none with Reduce Motion); at most 2 inserts/deletes animate, and inserts only animate at the bottom; Slackbot threads animate only inserts, deletes and moves (iOS 26: not while a reply streams) | `SKList.swift:2528-2533, 2805-2810, 2887-2888`; `UIView+SpringAnimation.swift:24-30, 78-80, 124-125`; `MessageTranscriptInteractor.swift:662-678` |
| keyboard | insets follow the keyboard; drag dismisses it interactively; tapping the status bar scrolls to top (flag `statusBarJump`, default off: a thread jumps all the way to its root, loading older pages; a conversation scrolls to the top of what's loaded) | `MessageTranscriptViewController.swift:42-44`; `MKMessagesAndEntitiesListAdapter+Typealias.swift:24`; `MessageTranscriptInteractor.swift:268-286` |

- Initial position: channels open at the latest message (bottom); at the oldest unread only when the user pref
  `startScrollAtOldestUnread` and the `markAsReadPref` flag are on; threads open at the top (root), or at the last-read
  position with the flag `openThreadsAtLastRead` (default off); a permalink scrolls that message to the top
  (`Implementation/Data/MessageTranscriptPreferences.swift:51-79`;
  `Pipeline/State/MessageAnchoringScrollCoordinator.swift:242-278`). Data-driven scrolls are not animated, user jumps are (`:290-295`).
- Jumped-to message: `sk_pale_yellow` background (§1.4), applied instantly and removed **5s** after the row first becomes
  visible (`Pipeline/HighlightMessageTranscriptPipeline.swift:28-35`; `Pipeline/State/MessageTranscriptPipelineController.swift:54-55, 477-496`).
- Initial load: skeleton `SKLoadingState` (medium cells, avatar mask), held back for the first 0.5s so fast loads don't
  flash (`MessageTranscriptPresenter.swift:286-300`; `MessageTranscriptInteractor.swift:48, 577-586`). Paging older/newer:
  a shimmer row at the top/bottom, 3 sections × 1 cell, each a 36pt avatar mask + 2 bars, margins 10/16, never animated
  (`MKMessagesListAdapter.swift:16-21, 50-58`; `…/Entities/LoadingEntity/SKLoadingEntity.swift:22-23`; `SKList.swift:2875-2878`;
  PNG `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKLoadingEntitySnapshotTests/testImageMaskTransparencyMedium@3x.png`).
- Load error (composer still shown): "Something Went Wrong" (`something_went_wrong_title`, yaml:20396), "Try again in a
  few minutes." (`generic_error_empty_state_body`, yaml:7564), outline button "Retry" (`retry`, yaml:16649)
  (`…/EmptyState/SKEmptyState+GenericErrorEmptyState.swift:12-21`; `MessageTranscriptPresenter.swift:303-308`).
  Permalink not found (composer hidden): "We’re unable to open this link." (yaml:22473) / "This link opens a message or
  conversation that you don’t have access to, or that’s been deleted." (yaml:12253) (`Plugins/HighlightedMessageErrorPlugin.swift:79-106`).
- Plugin order in a normal conversation, top to bottom: floating banner, last-read (unread) pill, latest-messages pill,
  elevator pill (§9.4), context bar (typing etc., §9.6), composer, conversation header (channel intro), thread root,
  messages, bottom drawer, "up to date" footer
  (`Modules/Features/AnyConversation/Implementation/Data/MessageTranscriptPluginsBuilder.swift:157-174`). In Slackbot AI
  DMs the intro, both banners, the floating banner, the megaphone and the elevator pill are dropped and the Slackbot
  scroll-behaviors plugin goes in before the composer (`:180-199`). Typing is no longer a behavior plugin (June's
  `.typingIndicator` is gone from `:17-36`); it reaches the screen through the context bar (§9.6).
- Pipeline order: transform → timestamp filter → highlight → drafts/failed replies → date dividers → sort (pending, then
  failed, moved to the bottom) → join/leave rollup → read marker → profile rollup (grouping) → MessageKit rows
  (`Pipeline/MessageTranscriptPipelineFactory.swift:101-114`; `Pipeline/SortingMessageTranscriptPipeline.swift:29-50`).

### 9.2 Grouping (continuation rows)

`Pipeline/ProfileRollupMessageTranscriptPipeline.swift`. Each message is compared with the item directly before it; a
divider (date or NEW) resets that, so the first message after any divider always has a full header (`:37-49`). Checks
run in order; the first that decides wins (`:57-85`):

| # | rule | result |
|---|---|---|
| 1 | canvas-updated message | full header (`:87-90`) |
| 2 | author is a hidden user | full (`:218-221`) |
| 3 | tombstone (deleted) | full (`:92-95`) |
| 4 | moderated | full (`:97-100`) |
| 5 | this or the previous message is a join/leave (archive/unarchive excluded) | full (`:102-105`) |
| 5a | this or the previous message is a redesigned system message (flag `systemMessagesRedesign`, default off; §9.8) | full (`:107-115`) |
| 6 | failed delivery, or still pending more than 1s after it was created (`pendingMessageRollupDelay`); a pending message right after another pending one falls through | full (`:21, 117-135`) |
| 7 | this or the previous message has thread replies | full (`:137-144`) |
| 8 | this or the previous message is a thread broadcast | full (`:146-153`) |
| 9 | **≥ 5 minutes** (300s) after the previous message | full (`:155-162`) |
| 10 | both `bot_message`: different `username` → full; same `botId` → grouped | (`:164-178`) |
| 11 | huddle message | full (`:180-187`) |
| 12 | unsent with files (uploading) | full (`:208-215`) |
| 13 | same `userId` as the previous message (not redacted) | **grouped** (`:189-206`) |
| — | anything else | full |

A grouped row has no avatar, name, badge or timestamp (the time stays in its VoiceOver label,
`MKCoreMessageProperties.swift:121-125`), top inset 4, and keeps the 64pt text column (§1.1–1.2). No timestamp appears
on press or in the gutter.

### 9.3 Where dividers go (visuals in §8)

- Date divider (`Pipeline/DateDividerInterjectorMessageTranscriptPipeline.swift`): conversations only, never threads
  (`:26-29`); between two items on different calendar days (`:49-55`); above the first message only once the top of
  history is loaded (`:57-60`). Text: "Today" / "Yesterday" / "Jun 4th" / "Jun 4th, 2025" — never a weekday (§8).
- "NEW" (`Pipeline/ReadMarkerMessageTranscriptPipeline.swift`): right before the oldest unread message you can mark
  (your own messages and join/leave skipped, `:39-52, 82-87`); merged into a date divider that sits in the same spot
  (date + NEW, `:239-250`); never above pending/failed messages (`:223-227`); for a fully unread history, at the very top
  once the oldest page is loaded, except in Slackbot threads (`:119-124, 178-209`); waits while the last-read message is
  on an unloaded page (`:106-118`); stays put after you read past it and moves when you mark a message unread
  (`:148-172`). Slackbot threads get a marker only if they were unread on entry, and it doesn't move while the thread
  stays open (`:47`).

### 9.4 Unread pill, latest-messages pill, elevator pill

**Unread pill** (`Plugins/LastReadBanner/LastReadBannerPlugin.swift`, view `PillBannerView.swift`):

- Shows only while the conversation is unread and you are a member (threads: only subscribed threads)
  (`LastReadBannerPlugin.swift:251-259`); arrow points up when the last-read position is above the visible rows, down
  when below (`:276-326`); hides once the NEW divider is on screen or the unread count is 0 (`:224-226, 277-281`).
- Copy (`:348-353`): "1 unread" (`one_unread`, yaml:13917) / "%@ unread" (`other_unread` yaml:14415, `few_unread`
  yaml:6875); unknown exact count: "1+ unread" (yaml:13860) / "%@+ unread" (yaml:14385).

| part | value | source |
|---|---|---|
| pill | capsule, height **36**, radius 18 | `PillBannerView.swift:130-138` |
| fill | iOS 26: `UIGlassEffect(.clear)`, interactive, tinted `base_inverse_highlight_1` (`highlight1.baseInverse`) `#1264a3` / `#0a77a7` (June `sk_sapphire_blue`, `#1264a3` in both); older iOS: solid, same color | `PillBannerView.swift:56-77, 97-107` |
| shadow | black, radius 0.5, opacity 0.2, offset 0 | `PillBannerView.swift:109-112` |
| contents | arrow button 32 wide · label · close button 32 wide, spacing 0; icons white, accessory size × 0.8 | `PillBannerView.swift:86-95, 114-122` |
| icons | `svgArrowUp` / `svgArrowDown` (`arrow_up.svg` / `arrow_down.svg`), close `svgClose` (`close.svg`) | `LastReadBannerPlugin.swift:359-364` |
| label | Lato Bold 13 (`.captionBold`, max 20), white | `PillBannerView.swift:143-148` |
| a11y | "Jump to first unread message" (`jump_to_first_unread`, yaml:10474), "Close" (`close`, yaml:4081) | `PillBannerView.swift:117-118` |
| position | top drawer, centered, 12pt below the safe-area top | `LastReadBannerEmbeddablePresenter.swift:79-85`; `LastReadBannerPlugin.swift:365-372`; `…/List/BottomDrawer/ListDrawerView.swift:501-503` |
| animation | slides down from above without fading (glass can't fade reliably); leaves sliding back up **and** fading; spring bouncy medium 0.431s damping 0.7; drawer items it pushes aside glide with it (June: no fade either way) | `…/BottomDrawer/Animation/DefaultListDrawerAppearanceAnimation.swift:10-21`; `…/Animation/ListDrawerAppearanceAnimation.swift:20-25`; `ListDrawerView.swift:297-335, 414-431` |

  Tap arrow/label → jump to the last-read position (marks read if loaded) (`LastReadBannerPlugin.swift:398-414`);
  tap ✕ or swipe up faster than 200pt/s → mark read + dismiss (`:415-421`; `BottomDrawer/PanDismissalHandler.swift:12-19, 125-126`);
  both with a light 0.5 haptic, now unconditional (`LastReadBannerPlugin.swift:389-391`). While it shows, the transcript offers the VoiceOver
  action "Jump to first unread message" (`LastReadBannerPlugin.swift:372`; `Modules/Features/MessageTranscript/Interface/Plugins/MessageTranscriptPluginOutput.swift:15-30`).

**Latest-messages pill** — the iOS equivalent of "Jump to recent" (there is no "Jump to recent" string)
(`Plugins/LastReadBanner/LatestMessagesBannerPlugin.swift`, behind the `latestMessagesBanner` flag,
`Dependencies/MessageTranscriptContentPlugins+Dependencies.swift:264`): same `PillBannerView` with `svgArrowDown` and
"Latest messages" (`latest_messages`, yaml:10707) (`LatestMessagesBannerPlugin.swift:27-31`); in the **bottom** drawer just above the composer, no
animation (`:105-111`); shows when the newest message on the server is newer than the newest one you've seen
(`:89-104`); tap → jump to latest, ✕ → hide (`:113-119`). While it shows, the transcript offers the VoiceOver action
"Jump to latest" (`jump_to_latest_message`, yaml:10477; `LatestMessagesBannerPlugin.swift:110`).

**Elevator pill** (jump to bottom; `Modules/Features/ElevatorPill`, driven by `Plugins/ElevatorPillController.swift`, which
replaces June's `ElevatorPillPlugin.swift`): a round glass `SKPillButton` in the bottom drawer, 12pt padding around a 20pt
icon, its leading edge 65pt from the right edge and 16pt above the drawer item below it (context bar or composer); it
fades in and out without sliding or scaling (June: scaled 0.5 → 1) (`ElevatorPillViewController.swift:21-23, 74-80, 106-133`;
`ElevatorPillFeature.swift:54-77`). It shows once you're more than the threshold above the bottom or newer pages are
unloaded, 80 ms after you get there, and hides at once (`ElevatorPillController.swift:17-34, 114-129, 168-171`). Two
variants, both flagged and default off:
- every conversation but Slackbot (flag `messageTranscriptElevatorPill`): neutral `.regular` glass, `svgArrowDown`
  (`arrow_down.svg`) in `content_primary`, threshold 240pt; tap → jump to latest (`Plugins/MessageTranscriptElevatorPillPlugin.swift:17-22, 51-69, 115-123`);
- Slackbot threads (flag `slackbotElevatorPill`): white `svgCaretDownFull` (`caret_down_full.svg`; `svgArrowDown` when the
  first flag is on too) on glass tinted `base_inverse_highlight_1` `#1264a3` / `#0a77a7` (June `sk_sapphire_blue`),
  threshold 120pt; tap scrolls to the bottom and keeps following the reply as it streams
  (`Plugins/SlackbotThreadScrollBehaviorsPlugin.swift:116-131, 305-344`; `ElevatorPillViewController.swift:169-180`).

a11y "Jump to bottom" (`jump_to_bottom`, yaml:10471; `ElevatorPillController.swift:162`), plus the transcript's "Jump to
latest" action while it shows.

### 9.5 "You’re up to date" footer

Below the last row, outside the content size; only when nothing newer can load and nothing is streaming
(`Plugins/UpToDate/UpToDatePlugin.swift:48-57`; `UpToDateEmbeddablePresenter.swift:57-66`). "You’re up to date"
(`youre_up_to_date`, yaml:24765) + " 🎉"; failure: "Couldn’t load messages." (yaml:4814) + " 😳". Lato 13
`content_secondary`, centered, 12pt top padding, 5pt text→emoji (`Plugins/SyncStateView.swift:67-88, 99-114, 144-188`).
It fades in only while you overscroll past the bottom: alpha = (overscroll − 25) / height; the emoji pops in (spring
0.25s, damping 0.7) past alpha 0.85 (`SyncStateView.swift:27-44, 190-192`).

### 9.6 Typing indicator (context bar above the composer)

June's transcript plugin and controller (`Plugins/TypingIndicatorPlugin.swift`, `TypingIndicatorController.swift`) are
gone. Typers now come from one workspace-wide `Modules/DataService/TypingUsers/Implementation/TypingUsersService.swift`:
your own typing, and everyone's when the "show typing" pref is off, is ignored (`:102-106`); typers are kept per
conversation **and** thread, so a thread shows only its own typers, in the order they started (`:27-35, 51-74`); each
expires 6s after their last `user_typing` event (`:21-25, 76-89`) or as soon as their message arrives
(`Modules/Integration/WebSocketIntegration/Implementation/WebSocketEvents/EventHandlers/MessageEventHandler.swift:126`); no
polling or throttling, a one-shot timer evicts at the earliest deadline (`TypingUsersService.swift:110-158`). Names are `user.name` (display or
real name per the pref, "Name hidden" for hidden users) and unresolved ids are dropped, so June's "User" fallback is gone
(`TypingUsersService.swift:56-70`; `Modules/Integration/ContextBar/Implementation/ContextBarService.swift:411-436`).

Copy (`Modules/Integration/ContextBar/Implementation/Configurations/ContextBarTypingConfiguration.swift:31-42`), a bold
span (`.bold()`) in Lato 13 `content_primary`:
"%@ is **typing…**" (`user_is_typing`, yaml:22965), "%@ and %@ are **typing…**" (`two_users_are_typing`, yaml:22435),
"Several people are **typing…**" (`several_people_are_typing`, yaml:17730). When agents are active, the combined
participants row (`ContextBarActiveParticipantsConfiguration.swift`, higher priority) shows the typers instead
(`ContextBarTypingConfiguration.swift:12-14`).

Drawn by the `.contextBar` transcript plugin as an `SKContextBar` in the bottom drawer, right above the composer (glass
capsule, 16pt avatars overlapping by 4, layout in §10.4): it slides up without fading (glass can't fade reliably), slides
down while fading out (bouncy spring, 0.431s, §9.4), and counts toward the list's bottom inset (`Modules/Features/AnyConversation/Implementation/Plugins/ContextBarContentPlugin.swift:78-95`;
`SKAvatarPile.swift:207-220, 236`). The legacy `ContextBarView` now only appears in the join/archived drawer, canvases and
the share sheet (`ConversationBottomDrawerViewController.swift:167`): insets 6/12/6/12, 8pt spacing, radius 16 on the top
corners (all four with the liquid-glass composer), Lato 13 `content_primary` (bold parts Lato Black 13), 22pt icons
`content_secondary` (June `sk_foreground_max_solid`), background `base_tertiary` `#eaeaea` / `#212428` (June
`sk_foreground_soft_solid` `#f3f3f3` / `#24272a`; measured `#eaeaea` in the DND snapshot, was `#f3f3f3`)
(`Modules/Integration/ContextBar/Interface/ContextBarView.swift:29-65, 268-275, 455-467, 678-686, 786-808`).

### 9.7 Channel intro (top of history)

Conversations only (`Plugins/ConversationHeader/ConversationHeaderPlugin.swift:194-201`), shown once the top of history
is loaded (`:257-268`). Text rows are `SKGenericEntity` `.small`, unlimited lines, header trait
(`MessageTransformationMapper.swift:359-377`), padding 10/16/10/16 (`…/EntityViews/SKEntityBaseView.swift:61-67`).

**Channel** (`ChannelHeaderTransformer.swift:168-367`):
1. Title: channel name with its `#` or lock, Lato Black 28 (`.headline`), `content_primary`. #general: "Welcome!"
   (`welcome_with_exclamation`, yaml:23584) in Lato Black 22 (`.title`).
2. Description, Lato 17, `content_secondary`: "{creator} created this channel {date}." (yaml:22908; yours: "You created
   this channel %@." yaml:24311; private variants yaml:22912 / 24315), where {date} = "today" (yaml:21790), "yesterday"
   (yaml:24202) or "on %@" (yaml:13631) with the long date ("on June 11, 2013") (`TimeUtility.swift:701-711`); then
   " This is the very beginning of the %@ channel." (`beginning_of_x_channel`, yaml:2426, `%@` = channel link); then
   "Channel Description: %@" (yaml:3723) when there's a purpose. #general body: "Slack is a messaging app for groups of
   people who work together. You can send updates, share files, and organize conversations so that everyone is in the
   loop." (yaml:19874). #random: "A place for non-work-related flimflam, faffing, hodge-podge or jibber-jabber you’d prefer
   to keep out of more focused work-related channels." (yaml:5266). Code channels (`isCodeChannel`, new) replace the
   description with "This is a code channel — %@ can see and respond to every message and file." (Lato 17
   `content_secondary`, `code_channel_header_description`, yaml:4105) and "Content shared here is also processed by %1$@
   according to its terms. %2$@ uses AI and can make mistakes." (Lato 13, `code_channel_header_disclaimer`, yaml:4109),
   `%@` = the agent's mention, else "Agent" (yaml:1099) (`ChannelHeaderTransformer.swift:200-205, 283-318`).
3. Buttons (if permitted, `:369-435`): "Add description" (yaml:726, `svgEdit` `edit.svg`) and "Add people" (yaml:811,
   `svgUserAdd` `user_add.svg`) (`ChannelHeaderAction.swift:16-32`; `ChannelTypeInfo.swift:46-55`). One button: large
   outline button — `base_primary` fill, 1pt `outline_secondary` border (`#5e5d60@0.45` / `#797c81@0.5`), Lato Bold 17,
   padding 14/16, radius 14, 20pt icon left (`…/Button/SKButton+Types.swift:135-138, 249-332, 370-374`). Two buttons:
   equal widths 8pt apart, icon on top, `base_primary` fill, `content_primary` text, `outline_tertiary` border
   (`ChannelHeaderTransformer.swift:399-435`). "Add description" opens Edit Channel (modal), "Add people" opens Invite to
   Channel (`ConversationHeaderPlugin.swift:425-463, 606-644`).

**DM** (`ImHeaderTransformer.swift:47-178`): avatar row of 56pt avatars, radius 14, 16pt inset/top
(`MKConversationMemberCollectionView.swift:32-37`; measured gap 10pt because the flow layout uses its default spacing,
`:313-328`; PNG `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKConversationMemberCollectionViewSnapshotTests/testView_3members@3x.png`,
now a 2 × 2 grid, light / dark rows × normal / high-contrast columns, 393pt each: tiles at x16 y16, 56pt, 10 apart,
placeholder `base_tertiary` `#eaeaea` / `#212428` (`#1a1d21` dark high contrast), unchanged from June's left column);
name + status emoji Lato Black 22; subtitle title (`content_secondary`) and pronouns (`content_tertiary`)
Lato 13; then "This is the very beginning of your direct message history with %@. Only the two of you are in this
conversation." (yaml:2408) Lato 17 `content_secondary`. Self-DM: "**This is your space.** Draft messages, list your
to-dos, or keep links and files handy. You can also talk to yourself here, but please bear in mind you’ll have to supply
both sides of the conversation." (yaml:2413). Slackbot: "Hello! And welcome!" (yaml:7867), "I’m a simple bot, who can do
one or two things (mostly nudges and reminders, really). Nevertheless, I’m happy you’re here!" (yaml:9371), "Questions
about Slack? Check out our %@." (yaml:15465, `%@` = link "Help Center", yaml:7876).

**Group DM** (`MpdmHeaderTransformer.swift:23-127`): avatar row of the other members; names in Lato Black 22 joined
"A, B and C."; "This is the very beginning of your direct message history. Only the %@ of you are in this conversation."
(yaml:2421).

**Free-plan banner** (when the floating-banner flag is off): `SKBanner` regular, tone `.trials_new` with a "PRO" badge
(white on aubergine_70), Lato 15: "Messages and files older than 90 days are hidden on your current plan." + a line
break + a bold `content_highlight_1` link, "Upgrade today" when you can upgrade, "Start a free trial" when you can start
one, else "Learn more about Pro features" (`messages_and_files_older_than_90_days_upgrade_eligible` /
`…_trials_eligible` / `…_non_purchaser`, yaml:12319 / 12315 / 12311). June's default "On the free version of Slack,
messages and files older than 90 days are hidden. Learn more" (yaml:12304) is no longer used
(`ConversationMessageHistoryBanner.swift:166-205`; `ConversationHeaderPlugin.swift:287-301`).

### 9.8 Special rows

Custom transformation paths, tried in order: internal error, tombstone, moderated, join/leave, huddle, AI thread,
channel tab, folder item, system message (new) (`MessageViewPresentationObjectFactory.swift:513-523`).

**System messages, redesigned** (flag `systemMessagesRedesign`, default off,
`Modules/Data/Toggles/Definitions/ios_system_messages_redesign.json`). Joins/leaves, channel name/topic/purpose/archive/
convert/permission changes, canvas updates, retention, reminders, welcome party, folder adds and huddle-notes on/off
(`Modules/Data/BaseModels/Implementation/Constants/MessageSubtype.swift:295-313`; join/leave defers to it,
`CustomPaths/JoinLeaveMessageTransformationPath.swift:28-30`) get no name line: a 36pt `base_primary` box, no border,
holding a `content_secondary` icon at 0.8 scale (`svgUserAdd` join, `svgUser` leave, `svgChannel` channel changes,
`svgCanvasContent` canvas, `svgHourglass` retention, `svgReminder` reminders, `svgAiHuddleSummary` huddle notes); the body
in Lato 15 (`.smallBody`) `content_secondary` names the actor ("%@ joined %@", `x_joined_y_channel`, yaml:24053; "%1$@
left %2$@", `x_left_y_channel`, yaml:24066); the timestamp sits next to the body; never grouped
(`CustomPaths/SystemMessageTransformationPath.swift:20-78, 96-207`; `MKCoreMessageProperties.swift:100-120`; §9.2 rule 5a).

**Join/leave.** Consecutive join/leave messages collapse into one row with the first message's author, avatar and time
(`Pipeline/JoinLeaveRollupMessageTranscriptPipeline.swift:58-99`); always a full header, and so is the next message.
Body in `content_secondary` `#454447` / `#b9babd` (June `sk_foreground_max_solid` `#616061` / `#9a9c9e`)
(`CustomPaths/JoinLeaveMessageTransformationPath.swift:26-66, 129-130`). Copy
(`Pipeline/JoinLeaveMessageHelper.swift:227-326`, max 8 names `:78`): "joined %@" (yaml:10447, channel name as plain
text), "joined %@ from an invitation by %@" (yaml:10450), "left %@" (yaml:10817), "left and rejoined %@" (yaml:10811),
"joined and left %@" (yaml:10427), "%@ joined %@" (welcome party, yaml:24053); each followed by ". " (`JoinLeaveMessageHelper.swift:342`). Others:
" along with %@. " (yaml:1725), " along with %@ and %@. " (yaml:1728), or " along with " (yaml:1722) + "A, B, and %@. "
(yaml:10349) / "and %@ others. " (yaml:10367). Opposite actions after "Also, " (yaml:1765): "%@ joined. " (yaml:10379),
"%@ left. " (yaml:10385), "%@ joined and %@ joined. " (yaml:10373), "and %@ others joined. " (yaml:1858). With
`systemMessagesRedesign` on, each opening phrase names the first person too ("%@ joined %@", "%1$@ left %2$@"…, the
`x_…` keys) (`JoinLeaveMessageHelper.swift:236-305`; `JoinLeaveRollupMessageTranscriptPipeline.swift:87-90`).

**Pre-headers** (`Mappers/PreHeaderMapper.swift:58-157, 160-262`; layout in §1.1), all Lato 13:

| state | text (key, yaml line) | icon | color |
|---|---|---|---|
| ephemeral | "Only visible to you" (`only_visible_to_you`, 14002) | legacy glyph `.eye` (icon font U+E049, `SKIconManifest.swift:2945`; nearest SVG `eye_open.svg`) in `content_secondary` | text falls back to `content_tertiary` (`MKMessageView.swift:391-395`) |
| pinned | "Pinned" (14762); "Pinned • Saved for later" (14768); "Pinned • Custom response" (14765) | `svgPinFilled` `pin_filled.svg` | `content_highlight_3` `#6b5000` / `#dea700` |
| saved | "Saved for later" (16921); with due date "Saved for later ● In 2 days" ("In" 9652, "ago" 1233) | `svgBookmarkFilled` `bookmark_filled.svg` | `content_highlight_1` `#1264a3` / `#2ba5ce` |
| to-do | "Added to your To-dos" (1009; June "…to-dos") / "To-do" (21821) | `svgCheckCircleFilled` | `content_highlight_1` |
| failed | "Failed to send. **Tap to retry.**" (12246); "Edits not saved. **Tap to retry.**" (6097); "Review this message before sending" (DLP, 5555) | `svgWarning` `warning.svg` | `content_important` (`important.content`) `#c01343` / `#de678a` (June `sk_raspberry_red` `#e01e5a`) |
| broadcast (threads only) | "Also sent to the channel" (21608) / "…to the conversation" (21611); "%@ • pinned" (21618) | legacy glyph `.jump` (icon font U+E084, no SVG) | icon `content_highlight_1` `#1264a3` / `#2ba5ce` (June `sk_highlight`, dark `#1d9bd1`) |

Row backgrounds for these states: §1.4 (`Mappers/BackgroundStyleMapper.swift:11-49` picks the style).

**Tombstone (deleted).** Trash icon (`svgTrash`, `trash.svg`) in `content_secondary` `#454447` / `#b9babd` (June
`sk_foreground_max_solid`) on a 36pt box that now takes the default `surface_primary` fill `#1d1c1d@0.06` / `#f8f8f8@0.06`
(June `sk_foreground_low_solid` `#dddddd` / `#323538`; `…/OrnamentBox/SKOrnamentBox.swift:24-25, 287-288`); no name/time;
body = the server's fallback text (e.g. "This message was deleted.") in `content_secondary`; the reply bar stays
(`CustomPaths/TombstoneMessageTransformationPath.swift:16, 28-49, 97-104`).

**Moderated.** Legacy glyph `.eyeClosed` (U+E050) in `content_secondary` on the same `surface_primary` box; "This message
was removed." (yaml:21550) or "This thread has been removed by an admin." (yaml:21593) in `content_secondary`
(`ModeratedMessageTransformationPath.swift:16-18, 30-43`).

**Huddle message** (`CustomPaths/HuddleMessageTransformationPath.swift:108-159, 177-203, 213-238`;
`Utilities/MessageFormattingHuddleUtility.swift`): avatar = `svgHeadphones` icon — live: white on
`base_inverse_highlight_2` (`#007a5a` / `#177e56`; June dark `#00553d`); ended: `content_secondary` on `surface_primary`
(June `sk_foreground_max` on `sk_foreground_low`); missed: `content_important` on `base_important`. Name line: "A huddle is
happening" (yaml:8632) / "You joined the huddle" (8643) / "A huddle happened" (8625) / "You missed a huddle" (8726); with
a topic "%1$@ is happening" / "%1$@ happened". Badge "LIVE" (8924) white on `base_inverse_highlight_2`, or "MISSED"
(12398) `content_important` on `base_important`. Body in `content_secondary` (June `sk_foreground_max_solid`): live "%@
is already there." (8669) / "%@ and %@ are already there." / "%@ and %d others are already there."; ended "%@ was in the
huddle for %@." (8664) / "You and %@ were in the huddle for %@." (8711) / "You were in the huddle by yourself for %@. A
nice, meditative session." (8721). Full-width "Join huddle" button (yaml:10303) while live and you're not in it: `SKButton`
`.primary`, now `base_inverse_highlight_2` `#007a5a` / `#177e56` (June `sk_lilypad_green` `#007a5a`), white text
(`Modules/Features/HuddlesEmbeddable/Implementation/HuddleMessageEmbeddablePresenter.swift:30`;
`…/Button/SKButton+Types.swift:166-167, 188-189`). Row background `base_highlight_2` while live (§1.4). Never grouped.

**Folder/tab added.** `svgFolder` icon (`content_secondary`, June `sk_foreground_max`); name "Folder added" (yaml:7264); body "%@ added the folder "
(yaml:7260) + folder link, or "Deleted folder" (yaml:7268) (`ChannelTabMessageTransformationPath.swift:129-177`).

Hidden-user rows: §1.6. Broadcast mustache and "View newer replies": §7.4. Gestures: §1.5.

---

## 10. Conversation screen and thread screen

Extra tokens used here (light / dark, `Colors.swift` line): `container_secondary` `#f8f8f8` / `#212428` (194),
`content_inverse_primary` `#ffffff` / `#f8f8f8` (248), `outline_secondary` `#5e5d60@0.45` / `#797c81@0.5` (296),
`base_highlight_1` `#e3f8ff` / `#001a2d` (62), `base_inverse_highlight_1` `#1264a3` / `#0a77a7` (98; June's pin had
dark `#004d76`), `base_inverse_highlight_2` `#007a5a` / `#177e56` (104; June dark `#00553d`). Legacy:
`sk_foreground_soft_solid` `#f3f3f3` / `#24272a` (`SKLegacyColors.swift:105-107`), `sk_lilypad_green` `#007a5a`
(`:192`), `sk_off_white` `#f8f8f8` (`:187`). Sept moved most of this section's `sk_*` colors to `CoreColorSet` tokens
(noted per item).
Icon names without an `svg` prefix below are glyphs of the `slack-icons` icon font (no SVG); codepoints are in
`Modules/Data/Icon/Implementation/Generated/SKIconManifest.swift` (ellipsis U+E067 :2969, headphones U+E09F :3016,
smallReply U+E171 :3113, bookmark U+E195 :3139, jump U+E084 :2989, presenceOnline U+E506 :3419, cogO U+E020 :2915).

### 10.1 Structure, top to bottom (iOS 26 / Liquid Glass)

Source: `Modules/Features/AnyConversation/Implementation/AnyConversationViewController.swift`.

- Root background `base_primary` (:161); an `SKPageController` holds the pages (:168). For channels, DMs and group DMs
  the page is pinned to `view.top` (:170, :250) so content scrolls under the glass nav bar (`shouldUseHeaderMenu` is
  true for every non-bot conversation, `DataTypes/AnyConversationState.swift:79-90`); on iOS 26 it is pinned to
  `view.bottom` too (`AnyConversationViewController.swift:172-176`); the composer floats in the list's bottom drawer
  (§10.1 drawer slots).
- **No visible tab bar for channels/DMs** (`tabBarPosition: shouldHideTabs ? .hidden : .top`,
  `AnyConversationViewController.swift:292`; paging disabled, :294): the channel's tabs are reached only through the
  title's menu (§10.3). The legacy 2pt loading bar (`AnyConversationViewController.swift:149-158`) is hidden on iOS 26
  (:187); the title capsule shows a 3pt bar instead.
- Pages (`AnyConversationPresenter.swift:112-148`): "Messages", then `ConversationTabsBuilder.buildTabs()`; threads have
  no tabs (`Data/ConversationTabsBuilder.swift:60`); order = static tabs, server tabs, "Add canvas" (:85). Sept: the
  conversation opens on the tab its route names, if any (`config.initialChannelTabId`,
  `AnyConversationPresenter.swift:135-146`).
- Messages page plugins, in stack order (`Data/MessageTranscriptPluginsBuilder.swift:157-174`): floating banner (top
  drawer) · find-in-channel (flagged, :176-178) · unread pill · latest-messages pill · elevator pill (new, flag
  `messageTranscriptElevatorPill`, default off) · **context bar** (new: its own bottom-drawer plugin, §10.4) · composer
  (bottom drawer) · Slackbot stop-streaming · channel intro · thread root (threads only) · messages · conversation
  bottom drawer · Slackbot usage limit · "up to date" footer · megaphone coachmark
  (`Plugins/MegaphoneConversationPlugin.swift:191-206`) · highlighted-message error · Agentforce loading. Behavior
  plugins (`MessageTranscriptPluginsBuilder.swift:17-36`) include read-state marking, Slackbot haptics / unread marking
  and temporary-channel expiry; Sept dropped the typing and active-huddle-speedbump behaviors (typing now arrives
  through the context bar plugin).
- Drawer slots (`Modules/Features/MessageTranscript/Interface/Plugins/MessageTranscriptPluginOutput.swift:106-113`): the
  top drawer sits at the top of the list and can push the top inset; the bottom drawer is attached to the keyboard and
  pushes the bottom inset (context bar, composer, join/archived drawer, latest-messages pill).
- Unavailable conversation: `SKEmptyState` "We’re unable to open this link." (yaml:22473) / "This link opens a message
  or conversation that you don’t have access to." (`message_or_conversation_unable_to_access`, yaml:12250)
  (`AnyConversationPresenter.swift:393-398`).
- New-channel confetti: starts after 0.5s, runs 2.0s (`AnyConversationViewController.swift:322-327, 356`).
- One tooltip per conversation, none in the Slackbot DM (`AnyConversationPresenter.swift:706-765`, :714;
  `AnyConversationViewController.swift:361-391`): channel-tabs tip anchored to the title, arrow top-left, x offset 16:
  "**Access everything related to your channel from one spot.** Open to find channel resources, update settings, and
  more." (`channel_tabs_nux_tooltip_updated`, yaml:3896); huddle tip anchored to the huddle button (found by its
  identifier, `AnyConversationViewController.swift:384-389`), arrow top-right, offset 16: "**Try a huddle** to talk it
  out live with your team over audio or video." (`huddle_onboarding_tip_content`, yaml:8351).

### 10.2 Navigation bar

**Title capsule** (channels, DMs, group DMs; not threads) —
`Modules/UIInfra/NavigationController/Implementation/ConversationNavigationTitleView.swift`,
`Modules/Features/ConversationHeaderMenu/Implementation/ConversationHeaderPresentationObject.swift:186-263`:

- Interactive `UIGlassEffect` capsule, height 36 + 8 = **44** (`ConversationNavigationTitleView.swift:120-140,
  253-258`); as wide as the bar allows, left-aligned (:73-82; iPad non-compact max 400, :70, :264-266). While loading, a
  3pt `SKLoadingBar` runs along the capsule's bottom: track `base_tertiary`, progress lagoon_40 `#1cb6eb` / `#0a77a7`
  (`Colors.swift:1448`), done `base_inverse_highlight_2`, 1.1s loop (`ConversationNavigationTitleView.swift:228-235`;
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/LoadingBar/SKLoadingBar.swift:32, 138, 213-214`). iOS 18
  fallback: solid `container_secondary`, radius 11 = 9 + 2 (`ConversationNavigationTitleView.swift:59-66, 108-116,
  451-459`). Sept: while the tabs menu shows its own copy, the pill hides in place (alpha 0 and the glass effect
  removed; back with a smooth medium spring, out snappy/fast) instead of being remounted
  (`ConversationNavigationTitleView.swift:197-226`).
- Contents (`ConversationTitleInfoView`, `ConversationNavigationTitleView.swift:451-496, 508-541`): `[ornament] [title /
  subtitle] [unread dot]`, 8 apart, vertically centered.
  - Ornament: channel-type icon 20pt in a 36pt-wide slot, 0 gap after (:955-960); or, for DMs, the 36pt avatar in a
    44pt slot (4pt padding each side), 4pt gap after (:962-966) — a **circle** on iOS 26 (`shouldMakeConcentric`,
    `ConversationHeaderMenu/Implementation/ConversationUtility.swift:26-30`) with presence.
  - Icons by type (`ConversationHeaderPresentationObject.swift:309-325, 344-362`), tinted `content_primary`: public
    channel `svgChannelFilled` (`channel_filled.svg`), private `svgLockFilled`, archived `svgArchiveFilled`, group DM
    `svgMessageFilled`, DM = avatar. On the Messages tab the name has no "#"/lock prefix
    (`showChannelPrefixInCollapsedState: false`, :253).
  - Title: 1 line, Lato **Black 15** (`.smallBodyBlack`, no Dynamic Type), `content_primary`
    (`ConversationHeaderPresentationObject.swift:301-306`; `ConversationNavigationTitleView.swift:799-805`), 4pt after
    (:539). VIP DMs append `svgVipFilled` 16pt (`ConversationHeaderPresentationObject.swift:336-341`;
    `ConversationNavigationTitleView.swift:495`).
  - Subtitle: 1 line, Lato 13, `content_secondary` (`ConversationHeaderPresentationObject.swift:418`); optional 12pt
    status emoji + 5pt before it (`ConversationNavigationTitleView.swift:473-477, 583-590`). Text
    (`ConversationHeaderPresentationObject.swift:376-442`): channels/group DMs "12 members • 4 tabs" (:408-411), or "{N
    members} • {N updates}" when other pages have updates (:380-384); DMs "{N tabs}"/"{N updates}", or the status emoji
    + status text. Plurals (`Modules/Data/I18n/Implementation/SLKPluralString+Helpers.swift:226-238, 1008-1034`): "1
    member" (`one_member`, yaml:13753) / "%@ members" (`other_members`, 14340); "1 tab" (13899) / "%@ tabs" (11714); "1
    update" (13932) / "%@ updates" (11748).
  - Unread dot: 12pt = 8pt `content_highlight_1` dot in a 2pt `base_primary` ring, 4pt from the trailing edge
    (`ConversationNavigationTitleView.swift:479-492, 687-706`), when another page has a badge
    (`NewConversationHeaderHelperService.swift:54-58`); appears with a smooth medium spring, leaves snappy/fast scaling
    to 0.5 (`ConversationNavigationTitleView.swift:827-842`).
  - On other tabs: that tab's filled icon, the "#"-prefixed name, subtitle = tab name
    (`ConversationHeaderPresentationObject.swift:266-299`).
  - Tap → tabs menu (§10.3); a11y hint "Open Menu" (`open_menu`, yaml:14085). Sept: no tap in the modal Slackbot DM
    (`isHeaderTapEnabled`, `ConversationHeaderPresentationObject.swift:245-247`); the title is then a header with no
    hint (`ConversationNavigationTitleView.swift:181-183`).

**Production (device screenshots, Sept 2026):** `reference/device/IMG_2247` (#general) / `IMG_2248` (a thread), 440 pt:
the bar region is 54 pt under the status bar (content inset 116, controls y 62–106); the title capsule fills x 76–309
(the thread's x 82–309, leading-aligned like the channel's: see shell-navigation.md §3.4); the right side is **one glass
capsule x 321–420** holding the full-color **Slackbot** entry (47 wide) left of the headphones (44), 8 pt apart
(shell-navigation.md §3.5; Sept `HeaderBarButtonPresentable.swift:281-298`, clone flag `slackbotConversationHeaderEntry`).
Sept colors the thread's "Thread" `content_primary` (`HeaderTitleView.swift:430` [Sept]) and message authors and bodies
`content_primary` (`AuthorMapper.swift:53-55`, `MessageViewPresentationObjectFactory.swift:59` [Sept]; both measure
(248,248,248)); the reply count measures `#2ba4ce` = `content_highlight_1` (`RepliesInfoMapper.swift:22` [Sept]), timestamps
`content_tertiary`, the thread toolbar's "1 reply" and icons `content_secondary`. The device PNGs carry a **Display P3**
profile: convert them to sRGB before reading a saturated color (grays are the same in both); unconverted, the reply count
reads `#53a2ca`. The clone draws all of these since this update.

**Bar buttons** (system glass; `Modules/UIInfra/SlackKit/Implementation/DeveloperComponents/BarButtonItem/SKBarButtonItem.swift`):
20 × 20 icons in `content_primary` (disabled `outline_secondary`; a `.prominent` item uses its own icon color on tinted
prominent glass) (:277-288, :322-333), 10pt vertical padding, none horizontal on glass (:258-269), badge = 8pt dot
(:679-703).

- Left: back `svgCaretLeftFull` (`caret_left_full.svg`), a11y "Back" (yaml:2370) (`SKBarButtonItem.swift:133-143`);
  modal close `svgCloseFilled` "Close"
  (`Modules/Integration/HeaderHelper/Implementation/HeaderHelperService.swift:81-87`).
- Right. Sept's `rightButtons` array is **leading-to-trailing** (index 0 nearest the title; June's was right → left) and
  the call sites flipped to match, so nothing moved on screen except search (item 4)
  (`Modules/Integration/HeaderHelper/Interface/HeaderBarButtonPresentable.swift:196-197, 204-343`;
  `ConversationHeaderPresentationObject.swift:724-767`). From the right edge:
  1. Huddle (if huddles are enabled and you're a member, else a call button `svgCall`)
     (`Modules/Integration/AnyConversation/Implementation/Resolvables/HuddleStateResolvable.swift:87-99`). Sept draws it
     as an `SKBarButtonItem` `.huddle` (`SKBarButtonItem.swift:216-239`, `SKHuddleBarButtonView.swift`), built by
     `HeaderHelperService.swift:520-557`:

     | state | look | a11y |
     |---|---|---|
     | no huddle | 32 × 32 slot, 20pt `svgHeadphones` (`headphones.svg`) `content_primary`; on iOS 26 the bar's glass is its only background (iOS 18: a `base_primary` circle) (`SKHuddleBarButtonView.swift:27-31, 122-136, 190-216`) | "Start Huddle" (yaml:20629) |
     | coachmark | icon `content_inverse_primary` on prominent glass tinted `base_inverse_highlight_1` (`#1264a3` / `#0a77a7`); the icon pulses (scale 1.2, 1.5s ease-in-out, autoreversing, ×20); iOS 18: a `base_inverse_highlight_1` circle with a 30%-alpha ring pulse (`HeaderBarButtonPresentable.swift:153-164`; `SKHuddleBarButtonView.swift:73-90, 218-238`; `SKBarButtonItem.swift:232-238`) | — |
     | huddle live | pill: `svgHeadphones` 16pt + member count, Lato Bold 15 (iOS 26), padding 6/8, radius 14, 5pt icon→count, count `sk_off_white`; iOS 26: a clear button on prominent glass tinted `base_inverse_highlight_2` (`#007a5a` / `#177e56`) (`SKButton+Types.swift:249-256, 280-285, 311-316, 336-339, 370-373`; `SKHuddleBarButtonView.swift:151-188`) | "Join huddle, %@" (yaml:10336) |

     Tap starts/joins (thread: passes the root ts) (`AnyConversationInteractor.swift:347-356`).
  2. Slackbot entry, left of the huddle (Slackbot AI on and not the Slackbot DM,
     `NewConversationHeaderHelperService.swift:1093-1108`): full-color `svgSlackbotColor` 25 × 25, a11y "Slackbot"
     (`SKBarButtonItem.swift:110-118`; `HeaderHelperService.swift:206-212`). Under the experimental Radical
     Simplification navigation it moves beside the composer instead
     (`ConversationHeaderPresentationObject.swift:762-764`).
  3. AI summary, only when the Slackbot entry isn't shown (`ConversationHeaderPresentationObject.swift:754`; not
     bots/Slackbot): `svgAiSummary` (`ai_summary.svg`); loading/loaded: `svgAiSummaryFilled` + a `content_highlight_1`
     dot (June `sk_highlight`); channel tap opens a menu "Summarize" (yaml:20808) → "Unreads" (22638), "Last 7 days"
     (10583), each disabled when unavailable; in a thread it summarizes directly
     (`NewConversationHeaderHelperService.swift:910-968`).
  4. Search (flag `findInChannel`, default off): Sept makes it `svgQuickSwitch`, puts it **inboard** (left of the
     conversation's own buttons; June: rightmost) and drops the Slackbot entry; "Search…" (yaml:17204); while
     find-in-channel is open the right side is just "Done" (`NewConversationHeaderHelperService.swift:786-805`).
  - Non-Messages tabs with their own actions: only "⋯" (`ellipsis`, "Show more options", yaml:18972) or a spinner
    (`ConversationHeaderPresentationObject.swift:851-885`).

**Thread / legacy title** (`HeaderTitleView.swift` in the same folder): title Lato Black capped at **16** in the capsule
(17 outside), `content_primary` (June `sk_primary_foreground`), 1 line (:425-435); subtitle Lato 13 (capped at 13),
`content_secondary` in the capsule (measured `#454447`), outside it `content_highlight_1` when it's a link else
`content_secondary` (June `sk_highlight` / `sk_foreground_max`) (:527-552). iOS 26 capsule for threads: glass, 44 tall,
text inset 16 leading / 10 trailing, with the 3pt loading bar (:30-32, :358-364, :502-514;
`Modules/Integration/HeaderHelper/Interface/HeaderTitlePresentable.swift:289-299`). Pressed alpha 0.5
(`HeaderTitleView.swift:223-227`). A11y hint "Opens details" (yaml:14128). New in Sept: an optional skill badge before
the title (`HeaderTitleView.swift:450`, snapshot `testTitleWithSkillBadge`) and a title menu as the primary action,
which drops the hint (`HeaderTitleView.swift:412-422`).

### 10.3 Channel tabs (the header menu; iOS has no horizontal bookmarks bar)

Tab rows (`ConversationTabsBuilder.swift:180-314, 427-443`; `AnyConversationPresenter.swift:454-474`), outline icon, filled
when current:

| page | title (key, yaml) | icon / current |
|---|---|---|
| Messages | "Messages" (`messages`, 12301) | `svgDirectMessages` / `svgDirectMessagesFilled` |
| Canvas | canvas title, fallback "Canvas" (3884) | `svgCanvasContent` / filled |
| Pins | "Pins" (`channel_tab_bookmarks`, 3881) | `svgPin` / `svgPinFilled` |
| Bookmarks folder | folder label, fallback "Bookmarks" (2520) | `svgFolder` / `svgFolderFilled` |
| Files | "Files" (3887) or "Files & Links" (7116) | `svgFiles` or glyph `allFiles` |
| Workflows | "Workflows" (3893) | `svgBolt` / `svgBoltFilled` |
| List | list title, fallback "List" (3890) | `svgLists` / `svgListsFilled` |
| Add canvas | "Add canvas" (3878) | `svgAddChannelCanvas` |
| deleted file | "Deleted file" (5375) | `svgTrash` |

Menu (`Modules/Features/ConversationHeaderMenu/Implementation/MenuFeature/ConversationTabsMenuView.swift:39-64, 107-114, 184-245, 283-302, 478-523, 542-624`):

- Morphs out of the title capsule. Content view 8pt from the screen sides, radius 20, pinned to the top safe area;
  height = 16 + expanded title + list, list capped at 70% of the screen. Top-right 40pt `svgEllipsisHorizontalFilled`
  "More actions" (yaml:12439), 8 from the top, 6 trailing.
- iOS 26: non-interactive glass, clear scrim. iOS 18: `base_primary`, shadow black@0.66 offset (0,24) radius 24,
  black@0.5 scrim. Dark: 1pt `outline_tertiary` border.
- Expanded title: the ornament becomes a close button (`svgClose`, 52pt slot), the name gets its "#"/lock, subtitle =
  topic / member names / pronouns (`ConversationNavigationTitleView.swift:657-671, 949-952`;
  `ConversationHeaderPresentationObject.swift:459-488`).
- Sections (`ConversationTabsMenuPresenter.swift:46-72`):
  1. Buttons, equal widths, 8 apart, padding 4/16 (`:424-467`): "Add" (yaml:639, `svgUserAdd`, a11y "Add Members";
     hidden in app DMs, Slackbot and, Sept, for frontline workers who can't invite,
     `ConversationTabsMenuPresenter.swift:437`), "Star"/"Starred" (20536/20543, `svgStar`/`svgStarFilled`; paid plans:
     "Move" with a section menu; inactive for non-members and, Sept, temporary channels, :482-485), "Search" (17029,
     `svgSearch`; `svgQuickSwitch` with `findInChannel`, :452-458). Clear fill, `content_primary` text, 1pt
     `outline_tertiary` border; medium `SKButton`: Lato Bold 15, padding 10/12, radius 12, 20pt icon, 6pt icon gap
     (`SKButton+Types.swift:271-375`).
  2. Tabs (`ConversationTabsMenuPresenter.swift:76-176`; Sept hides "Add canvas" for frontline workers, :77-82): 24pt
     icon box + title Lato 17 (bold when current or badged); accessories: item count, "PRO"
     (white on aubergine_70 `#83388a`), "NEW" (`content_highlight_1` on `base_highlight_1`), unread dot
     (`presenceOnline` glyph, `content_highlight_1`); current row = rounded highlight radius 12, inset 4pt
     (`SKEntityBackgroundView.swift:43-79`); rows 10/16 insets, 12pt icon→text.
  3. Navigation rows with chevrons (`ConversationTabsMenuPresenter.swift:214-337`): channels/group DMs "Members" (12004,
     count, `svgUserDirectory`), then (Sept, flag `channelAgentsAppsScreen`, default off; not guests or Slack Connect)
     "Agents & Apps" (1226, `svgAiAgents`), "Notifications" (13451) with "All"/"Mentions"/"Muted" (1603/12057/12646;
     `svgNotificationsAllNewPosts`/`svgNotifications`/`svgNotificationsOff`); DMs "View Profile" (8148, `svgUser`), "Org
     Chart" (14188, `svgHierarchy`); Slackbot DM (Sept, flag `slackbotSkillsHeaderEntry`, default off) "Skills" (19229,
     `svgAiSkills`); always last "Settings & Details" (17727, glyph `cogO`)
     (`ConversationTabsMenuInteractor.swift:348-361`).
- "⋯" menu (`ConversationTabsMenuPresenter.swift:397-422`;
  `Modules/Features/Handlers/SectionItemAction/Implementation/ConversationActionBuilder.swift:221-235`): "Channel
  Details" (3726; "Conversation Details" 4591), "Copy Channel Link" (4698), "Copy Channel ID" (4695), "Archive
  Channel"/"Unarchive Channel" (2059/22501), "Leave Channel" (10766).
- Behavior (`MenuFeature/ConversationTabsMenuFeature.swift:298-366`): light haptic 0.4 on open; morph = smooth spring
  0.4s (dismiss on navigate 0.2s); tap the scrim or swipe up (translation < −75 or velocity < −500) to dismiss, with
  rubber-banding (shrinks up to 7%, grows 2%); selecting a row = selection haptic + switch page; the nav title hides
  while the menu is open. "Search" opens the in-place find-in-channel bar when `findInChannel` is on, else the
  search-in-channel screen (:323-331).
- App DMs without the menu (Home / Messages / About): a visible `SKTabBar`, 48 tall, 4pt `base_inverse_highlight_2`
  underline (June `sk_lilypad_green`; dark now `#177e56`) radius 2, titles Lato 15 regular/bold (color
  `content_secondary` → `content_primary`), 1px `outline_tertiary` hairline (`SKTabBar.swift:22-28, 86-89, 301-307`;
  `TabBarCollectionViewCell.swift:365-382`; `SKPageController.swift:115-121`); "Home" (yaml:1941), "About" (1938). PNG
  `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKTabBarSnapshotTests/testUnderline@3x.png`.

### 10.4 Context bar (strip above the composer: typing, DND, time zone, Slack Connect, drafts, coachmarks)

Sept made the context bar its own bottom-drawer plugin on every iOS version (`.contextBar`,
`Data/MessageTranscriptPluginsBuilder.swift:162`; the `composerContextBar` flag and the composer-hosted bar are gone):
`Modules/Features/AnyConversation/Implementation/Plugins/ContextBarContentPlugin.swift:78-95` renders an `SKContextBar`
in `ContextBarBottomDrawer.swift`, 6pt top inset, vertically centered, its leading/trailing insets tracking the
composer capsule's (`:77-79, :101-130`); it slides in without a fade (glass misrenders at alpha < 1,
`ContextBarContentPlugin.swift:85-93`). Geometry relative to the composer: composer.md §2 and §14.

`Modules/UIInfra/ContextBarUI/Implementation/SKContextBar.swift`:
- Glass capsule, min height 36; padding 6/12; with action buttons or agent rows uniform corners radius 26 and padding
  12/16 (:38-47, :66-77, :152, :452-480). iOS 18: `surface_primary` fill, radius 16 (:79-88).
- Sept rebuilt the content as a vertical recycler: a header row, optional agent rows, then the action buttons, 16pt
  apart (:35, :228-309). Header row `[icon or avatars] [label] [dismiss / chevron / stop]`, 8 apart
  (`Views/ContextBarRowView.swift:19, 167-190`): icon in a 16pt `.tiny` `SKOrnamentBox` (radius 4; with a background
  color the glyph is `base_primary` on that fill), avatar pile 16pt overlapping 4, dismiss 30pt `svgClose` in the text
  color (`SKContextBar.swift:313-365`; `ContextBarRowView.swift:20, 225-253`).
- Label Lato 13, 2 lines by default (`SKContextBar.swift:49, 339-341, 618-629`). Action buttons 12 apart; `SKPillButton`
  medium, `base_primary` fill, pressed `base_tertiary` (`SKContextBar.swift:36, 394-450`;
  `SKContextBarAdapter.swift:207-214`).
- No content cross-fade any more (June's 0.3s cross-fade is gone); a chevron header (expandable) dims to alpha 0.75
  over 0.15s while pressed (`ContextBarRowView.swift:21-22, 260-269`).
- New "active participants" content (flags `agentSessionsContextBar` / `channelSessionsContextBar`, both default off):
  header "N agents are **working…**" + chevron, then one row per agent (16pt avatar, 1 line, optional stop button),
  12pt apart and 12pt below the header (`SKContextBar.swift:50-52, 268-292, 367-392`;
  `Modules/Integration/ContextBar/Implementation/Configurations/ContextBarActiveParticipantsConfiguration.swift:21-30`).

| style | background | text |
|---|---|---|
| neutral | glass (clear) | `content_primary` |
| warning | campfire_0 `#fff2e0` / campfire_5 `#4b2200` (Colors.swift:842/848) | `content_primary` |
| highWarning | campfire_10 `#fbcc91` / campfire_20 `#7b3a00` (:854/860) | `content_primary` |
| coachmark | `base_inverse_highlight_1` | `content_inverse_primary` |
| info | `base_highlight_1` | `content_primary` |

Styles `SKContextBar.swift:660-690`; content by configuration `SKContextBarAdapter.swift:48-100` (one builder per case,
:127-559) and `Modules/Integration/ContextBar/Implementation/Configurations/*`:
- Typing: §9.6 strings, with avatars (:153-161).
- DND: glyph `snoozeFilled`, "%@ has **paused their notifications**" (yaml:22952).
- Time zone (other person's local time 10 PM–8 AM only, `ContextBarTimezoneConfiguration.swift:43-62`): glyph `clockO`,
  "It’s %@ for %@" (yaml:11515).
- Slack Connect (org avatar, warning/highWarning, 1 line): "%@ is from **%@**" (24040) / "%@ is from **%@**." (24043).
- Drafts (glyph `pencil`): "1 draft is saved. See drafts" (24014) / "%@ drafts are saved. See drafts" (24011), "See
  drafts" bold `content_highlight_1` (June `sk_highlight`) (`ContextBarDraftConfiguration.swift:24-29`).
- Scheduled (glyph `scheduledSend`): "Your message will be sent %@. See all scheduled messages" (24594) / "%@ messages
  will be sent. See all scheduled messages" (24075), link bold `content_highlight_1`
  (`ContextBarScheduleMessageConfiguration.swift:49-54`).
- Audio recording: centered `svgMicrophone`, Lato 12, "Recording an audio clip…" (15974).
- Coachmarks: coachmark style, `svgClose` dismiss, pill buttons.
- New in Sept: coding-channel, workflow-continue and active-participants bars (`SKContextBarAdapter.swift:57-58,
  95-98`).

Legacy `ContextBarView` (`Modules/Integration/ContextBar/Interface/ContextBarView.swift:29-66, 267-278, 635-659, 805-827`),
which Sept keeps only for the bottom drawer's join dialog (§10.5), Canvas and Share Message: insets 6/12/6/12, radius 16
(top corners only without glass), fill `base_tertiary` (`#eaeaea` / `#212428`; June `sk_foreground_soft_solid`
`#f3f3f3` / `#24272a`), Lato 13 `content_primary` (June `sk_primary_foreground`), 22pt icon `content_secondary` (June
`sk_foreground_max_solid`); coachmark buttons Lato Bold 17 `content_primary` on `base_primary`; new states slide in
(spring 0.3s, damping 0.7).

### 10.5 Bottom drawer (replaces the composer)

`Modules/Features/AnyConversation/Implementation/Plugins/ConversationBottomDrawerPlugin.swift` (composer **and** context
bar hidden while a drawer state applies; the drawer's dialog embeds any context bar itself, :283-294); iOS 26
container: glass panel inset 16 left/right (safe area) and 12 from the bottom, radius 16 + 16 = 32, interactive glass
only for the join dialog; label margins 14/5/18/5 (June 15/5/15/5) (`ConversationBottomDrawerViewController.swift:51-55,
92-109, 112-150`).

- Label states, Lato 17 `content_tertiary`, centered (`ConversationBottomDrawerPlugin.swift:396-493`): "Archived
  Channel" (yaml:2077), "This user account is inactive" (9661), "This channel is no longer shared with your
  organization." (7532), "Your two organizations are no longer connected" (7536), "These organizations are no longer
  connected" (7539), "Resolved Thread" (16615), "Threads in archived are view only" (21666); Sept adds
  information-barrier / no-permission variants (`information_barrier_*`, `you_dont_have_permission_to_message_*`) and
  agent states (`agent_not_eligible_for_dms`, `agent_has_been_deleted`, `agent_has_been_disabled`)
  (`ConversationBottomDrawerPlugin.swift:396-467`).
- Join dialog for non-members (`ConversationBottomDrawerPlugin.swift:376-379, 470-488`): margins 20/24/20/24; "#name"
  Lato Bold 17 `content_primary` centered ("#%@", `Modules/Data/Strings/Implementation/Unlocalized.swift:15-17`), 4pt,
  purpose Lato 15 `content_secondary` 2 lines (both tap through to details), 20pt, full-width primary button "Join
  Channel" (yaml:10326), fill `base_inverse_highlight_2` (`#007a5a` / `#177e56`; June `sk_lilypad_green` in both modes),
  white text (`SKDialog.swift:231-280, 459-469`;
  `Modules/UIInfra/SlackKit/Implementation/DesignerComponents/Button/SKButton+Types.swift:166-167`). Full channel: alert
  "You can’t join this channel. Channel membership limit reached." (10329) + "Okay" (13613).

### 10.6 Floating banner (top drawer, channels, flag `conversationFloatingBanner`, default off)

`Modules/Features/MessageTranscript/Implementation/Plugins/ConversationHeader/FloatingConversationBannerPlugin.swift:118-193`,
`ConversationFloatingBannerViewController.swift:41-51`: strip `base_primary` at 92%; `SKBanner` regular, radius 12,
insets 16 sides / 8 top-bottom (`SKBanner.swift:157-163`); tone `trials_new` = horchata_0 `#f4ede4` / `#2a1707`
(`Colors.swift:1922`) with `outline_tertiary` border and a "PRO" badge (white on aubergine_70) (`SKBanner.swift:210-225,
319`); text Lato 15 `content_primary`, links bold `content_highlight_1`. Copy for free teams
(`ConversationMessageHistoryBanner.swift:166-205`): "Messages and files older than 90 days are hidden on your current
plan." + line break + a link "Upgrade today" (`messages_and_files_older_than_90_days_upgrade_eligible`, yaml:12319) /
"Start a free trial" (`…_trials_eligible`, 12315) / "Learn more about Pro features" (`…_non_purchaser`, 12311). Sept
always uses these three (June gated them behind `isTrialUpgradeEnabled`); June's "On the free version of Slack,
messages and files older than 90 days are hidden. Learn more" (yaml:12304) and its gray info-icon variant are no longer
used. Trial teams: `trial_awareness_access_files_and_message_*` strings, an hourglass icon instead of the badge in the
last 7 days (`ConversationMessageHistoryBanner.swift:207-269`). PNG
`Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKBannerSnapshotTests/testBannerRegularTrials_New@3x.png`
(Sept PNGs are 2 columns: normal and high contrast).

### 10.7 Thread screen

Same `AnyConversation` with `messageSource = .thread`, pushed (`AnyConversationRoute.swift:26-31`), no tabs.

- Header: capsule title "Thread" (`thread`, yaml:21605), subtitle = channel name with a "#"/lock prefix (DMs:
  `svgUserFilled` + name) (`HeaderTitlePresentable.swift:50, 70-80`;
  `ConversationHeaderPresentationObject.swift:552-565`); tapping it opens the parent conversation
  (`AnyConversationInteractor.swift:310-318`); right buttons as in §10.2 (AI summary summarizes the thread directly).
  Sept: the back-button menu / VoiceOver name is "Thread in #channel" (`thread_in_x`, yaml:21638;
  `HeaderTitlePresentable.swift:60-68`; `ConversationHeaderPresentationObject.swift:490-494`); agent-session threads
  show the session title in place of "Thread", with a title menu Rename / Copy link / Go to message
  (`NewConversationHeaderHelperService.swift:587-608`); Slackbot, AI-app and Agentforce threads use the conversation
  title capsule instead (`ConversationHeaderPresentationObject.swift:364-374`).
- Rows (`Modules/Features/MessageTranscript/Implementation/Plugins/ThreadRootMessagePlugin.swift:164-274`; the root
  shows at once when the thread opens at its oldest message, else once the first page has loaded or every reply is in,
  :109-127; never for AI-app threads, :137-140):
  1. **Root message — `MKRootMessageView`** (`Modules/UIInfra/MessageKit/Implementation/MKRootMessageView.swift:24-30,
     58-62, 106-161`): 12pt top/bottom padding; items 12 apart, each with 12pt side padding. Header = 36pt avatar at
     (12, 12) + name (Lato Black 17, `content_primary`, up to 4 lines, `:306`) with the timestamp **under** the name as
     "mustache" text (Lato 12, `content_tertiary`, `:163-169`), name block at x=60 (measured). Timestamp `.absolute`:
     "Today at 10:42 AM", "Yesterday at 10:42 AM", "Jun 12th at 9:41 AM", "…, 2025 at …"
     (`MessageTransformationMapper.swift:277`). Body starts at **x=12, full width** (not indented under the name)
     (measured in `testRootMessageViewBasicSecondaryContent@3x.png`: avatar 12–48, body x12.3). Add-reaction pill always
     shown; jumbomoji on (`MessageTransformationMapper.swift:259-276`). Pressed `base_secondary`
     (`MKRootMessageView.swift:91-92`); focused `surface_highlight_3` (`#ffc600@0.18` / `#a07300@0.18`; June
     `sk_pale_yellow` `#f2c744@0.2`); being deleted `base_inverse_important`@0.25 (`MKRootMessageView.swift:180-190`).
  2. Divider: `MKDivider` without label — 1px `outline_tertiary`, inset 12 on the left (§8).
  3. **Toolbar — `MKMessageActionToolbar`** (`ThreadRootMessagePlugin.swift:314-399`;
     `MKMessageActionToolbar.swift:79-190`): left "1 reply" (`one_reply`, yaml:13872) / "%@ replies" (`other_replies`,
     14397) as an inactive button (Lato Bold 15, `content_secondary`, 12pt side padding); with no replies and
     permission: "Reply in Thread" (16447) with the `smallReply` glyph, tap focuses the composer
     (`ThreadRootMessagePlugin.swift:276-281`). Right: icon-only buttons, `content_secondary`, 20pt icons, 8pt trailing
     inset — Save (`bookmark` glyph; saved: `svgBookmarkFilled` in `content_highlight_1`; with to-dos:
     `svgCheckCircle`/filled; a11y "Save" / "Remove From Saved Items", 16880/16231), Forward (`svgShareMessage`,
     "Forward Message"/"Share Message", 7407/18639; Sept hides it when the channel restricts sharing,
     `ThreadRootMessagePlugin.swift:143-145, 359`), More (`ellipsis`, "Show more options"). File-channel comment threads
     count "comments" (`ThreadRootMessagePlugin.swift:340`).
  4. Divider (as 2).
  5. Replies: normal `MKMessageView` rows (§1) with thread-reply timestamps (§1.2) and the same grouping rules (§9.2);
     no date dividers in threads (§9.3). Broadcast replies get the `base_highlight_3` background and the pre-header
     (`jump` glyph, `content_highlight_1`; June `sk_highlight`) "Also sent to the channel" / "Also sent to the
     conversation" (yaml:21608/21611; `PreHeaderMapper.swift:62-63, 148-157`).
  6. Composer (other spec).

**Root message snapshots** (`Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKRootMessageViewSnapshotTests/`, 393 wide):

| PNG | height | shows |
|---|---|---|
| `testRootMessageViewBasic@3x.png` | 59.3 | no avatar: black 17 name + gray 12 time line at x12 |
| `testRootMessageViewBasicOrnament@3x.png` | 60 | 36pt avatar at (12,12), text at x60 |
| `testRootMessageViewBasicSecondaryContent@3x.png` | 154.7 | header + four "Test Text" lines at x12 |
| `testRootMessageViewBasicSecondaryContentAttachments@3x.png` | 226.7 | + one 64pt image tile |
| `testRootMessageViewBasicSecondaryContentMultipleFileAttachments@3x.png` | 226.7 | image, audio and video ("▶ 30s") tiles |
| `testRootMessageViewBasicSecondaryContentSingleFileAttachmentCompact@3x.png` | 222.7 | full-width file card "This is a png file" |
| `testRootMessageWithWrappedPrimaryText@3x.png` | 246.3 | two-line name + two image tiles |
| `testRootMessageWithWrappedMustacheText@3x.png` | 188.7 | two-line time/mustache |
| `testRootMessageWithDivider@3x.png` | 167 | hairline between header and body |
| `testRootMessageWithNoPrimaryText@3x.png` | 106.7 | body only |
| `testRootMessageWithOnlyUnfurlAndNoPipe@3x.png` | 134.7 | unfurl without pipe: header, bold title, divider, text, footer |
| `testRootMessageViewHiddenMessage@3x.png` | 120.3 | lock tile, hidden-message copy, "Show anyway" |
| `testRootMessageViewUnhiddenMessage@3x.png` | 182.3 | body + "Hide message" |
| `testRootMessageCustomBackgroundStyle@3x.png` | 154.7 | saved-for-later background `#e3f8ff` |

**Other snapshots for this section:**
- `Modules/UIInfra/ContextBarUI/Snapshots/iOS_26/ContextBarUITests.SKContextBarSnapshotTests/` (30 in Sept: + four
  `testActiveParticipants_*` (agent rows, chevron, stop buttons) and `testDND_ShortUsername` /
  `…_LongUsername_TwoLines`; glass is not rendered, so neutral bars look white): `testTypingIndicator_ShortText@3x.png`
  (16pt avatar at (12,10), text x36, "Jason Winn is **typing...**", 36 tall), `…_LongText` (2 lines, 43.3),
  `…_MultipleAvatars` (3 overlapping), `Icon_*` (check/info glyphs), `…_WarningStyle` (`#fff2e0`), `…_HighWarningStyle`
  (`#fbcc91`), `…_CoachmarkStyle` (`#1264a3`, white), `…_VeryLongText_ThreeLines` (truncates at 3 lines, 59 tall),
  `…_WithDismissButton` (Sept: always the `svgClose` ✕), `…_SlackbotLimitWarning`, `…_WithPrimaryActionButton` /
  `…Secondary…` / `…BothActionButtons` (gray pills "Upgrade now"/"Learn more" 16pt below, 95.7 tall),
  `…_WithActionButtons_*` variants (`…_LongText` grew from 126.7 to 142.3 tall in Sept); `testIcon_WithBackgroundColor`
  (16pt tile, larger glyph since Sept).
- `Modules/Integration/ContextBar/Snapshots/iOS_26/ContextBarServiceTests.ContextBarViewSnapshotTests/` (7, legacy
  view): `FirstMessageJoiner_WithActionButton` (blue `#1264a3` top-rounded panel, white "Introduce yourself to the
  team", ✕, white pill "Say hello", 102.7 tall), `AtMentionCoachmark_…` ("Got it"), `FirstMessageCoachmark_…` ("Send a
  message" / "Learn more"), `DND_WithIcon` (Sept: `#eaeaea` bar, `#454447` icon; June `#f3f3f3` / `#616061`;
  "Notifications paused. Learn more", 28 tall), `SlackbotAIUsage_WithIcon` (same fill change),
  `AudioRecording_CenterAlignment`.
- `Modules/UIInfra/NavigationController/Snapshots/iOS_26/NavigationControllerTests.HeaderTitleViewSnapshotTests/`:
  `testLiquidGlassCapsuleHeaderWithTitleAndSubtitle@3x.png` (134.7 × 44 capsule, "Thread Title" Lato Black 16, subtitle
  `#454447`, inset 16); nine non-capsule variants (37.3 tall, "#title" 17 black, gray subtitle, lock/private,
  highlighted blue subtitle, workspace avatar; Sept's non-capsule subtitles are `content_secondary`);
  `testTitleWithSkillBadge` (new). Moved here from DeveloperComponents with the NavigationController module; otherwise
  pixel-identical to June.
- Huddle bar buttons: the iOS_26
  `Modules/Integration/HeaderHelper/Snapshots/iOS_26/HeaderHelperServiceTests.HeaderHelperBarButtonItemTests/` PNGs are
  blank; use `…/iOS_18/…/testActiveWithMembers@3x.png` (green "🎧 15" pill, 51 × 28) and
  `testInactiveHuddleWithCoachmark@3x.png` (32pt blue circle).

---

## 11. `Modules/Integration/MessageComponent`

Not a layout module for chat messages: it is the legacy component/image framework — `ImageManager`, disk/memory image
caches, `SLKImage`, and a small `ComponentCell` system (`Modules/Integration/MessageComponent/Implementation/`). Its
iOS_26 snapshots (`Modules/Integration/MessageComponent/Snapshots/iOS_26/MessageComponentTests.ComponentViewControllerTests/`)
are test-harness renders with no Slack styling: `testComponentViewController@3x.png` (a photo with "COMPONENT 1/2" labels in
system font), `testComponentViewControllerUpdateConfig@3x.png` (same, narrower), `testComponentCell@3x.png` ("COMPONENT CELL"
in blue Lato Black). The test source that produced them no longer exists in the repo. Nothing to replicate.

---

## 12. Gaps

Text rendering:
- Legacy code block text in dark mode (resolved in Sept): June's source said `sk_primary_foreground` `#d1d2d3` while the
  dark half of `testPreRenderedText` rendered `#f8f8f8`; Sept's source is `content_primary`
  (`Text+Display.swift:145-147`), which is the `#f8f8f8` the snapshot shows.
- No snapshot shows bulleted lists, "(edited)" or custom emoji; bullet size is computed from `slack-icons.otf`.
- Menlo is not in the repo; its metrics come from macOS `Menlo.ttc` (ascent 1901, descent 483 / 2048).
- Unresolved custom emoji placeholder not specified beyond "image placeholder" (`SKEmoji.swift:124-133`).
- The 4pt first-block inset (§3.2) is from source; no snapshot renders a production-built message.

Message row, attachments, unfurls:
- No snapshot shows a real channel transcript (several messages, grouping, dividers, intro, system rows) — looked in
  every `Snapshots/iOS_26` and `App/Snapshots`. Row spacing and grouping are from source only.
- Pressed colors for pinned/saved/huddle/ephemeral/failed rows are computed from the darken/lighten blend, not measured.
- GIF attachments in the transcript (label, autoplay) not specced (only `GifMapper` for previews was read).
- Legacy attachment action-button styling (`UnfurlActionsMapper.swift`) not traced; buttons stack vertically 4pt apart.
- Embeddable unfurls (Work Objects, Salesforce records, lists, Tableau, calendar events, huddle cards) not specced
  beyond "rendered as embeddables" (`UnfurlClassifier.swift:15-36`, `Mappers/EmbeddableMapper.swift`).
- Expanded images use the original pixel width as a point width (`SKExpandedAttachment.swift:428`); that is what the
  code does, not verified on device.
- The file-type icon glyph color is `DefaultThemeColorSet.contentInversePrimary` of a palette-based color set
  (`UIColor+FileTypeExtensions.swift:31-52`); rendered white in every snapshot, exact value not derived.
- `MKMessagePreview` (search/activity rows) is not specced; it is not used in the conversation.
- `Modules/Integration/MessageComponent` snapshots are stale harness renders with no test source.

Reactions and reply bar:
- Pill growth at larger Dynamic Type sizes, custom-emoji scaling inside pills, and the reactors-sheet row fonts were not
  traced (`SKReacjiPill.swift`, `PaddedLabel.swift`, `SKEmoji.swift:124-137`, `SKGenericEntity`).
- Native emoji size inside pills is measured (≈17–19pt ink in a 22pt box), not from source.
- Number formatting of "%@ replies" (grouping separator) not verified (`NumberUtility`).

Message list:
- Row insert animation beyond the 0.4s spring is the UICollectionView default.
- Tombstone body text comes from the server (`fallbackTextSource`), no client string.
- There is no "Jump to recent" string in iOS; the equivalents are the "Latest messages" pill and the unread pill.
- Channel-intro sub-cases (team-creation copy, trial variants) only skimmed.

Conversation / thread screen:
- iOS 26 glass (nav bar, title capsule, menu, context bar, drawer) is the system `UIGlassEffect`; no blur/tint/opacity
  values exist in source. Context-bar and title snapshots don't render glass; the iOS_26 HeaderHelper huddle baselines
  are blank.
- The conversation header menu, bottom drawer and thread toolbar have no snapshots; values are from source.
- Nav bar height and scroll-edge treatment are system defaults (`SKNavigationBarLiquidGlass.swift:83-120` sets an empty
  background).
- Tab order inside `conversation.tabs` is server-driven (`ConversationTabsBuilder.swift:89-91`).
- Glyph-font icons (ellipsis, smallReply, bookmark, cogO, jump, pencil, scheduledSend, snoozeFilled, clockO…) have no
  SVG asset; nearest existing SVGs: `ellipsis_horizontal_filled`, `bookmark`, `settings`, `edit`, `schedule_send`,
  `cloud_offline` (all present in `Icons.xcassets`; using them is a substitution).
- Agentforce / AI-app header variants and the Slackbot DM's own bar (past threads, new chat) were not specced beyond
  §10.2's notes; the experimental Radical Simplification navigation (Slackbot and search beside the composer,
  `AnyConversationPresenter.swift:449-452`) is not specced here.

## 13. Most useful reference PNGs

1. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageViewSnapshotTests/testMessageViewWithPreviewAttachmentsSection@3x.png`
   — real avatar, name + time, body, piped attachment.
2. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageViewSnapshotTests/testMessageViewWithRepliesInfo@3x.png`
   — reactions collapsed to 2 rows + "N more", thread reply bar.
3. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKDividerSnapShotTests/test_newUnread_date_boldAndReturnError_@3x.png`
   — date + NEW divider.
4. `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKReacjiBarSnapshotTests/testReacjiBarTruncatedWithAddReacjiPill@3x.png`
   — pills light + dark, selected state, add pill.
5. `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKRootMessageViewSnapshotTests/testRootMessageViewBasicSecondaryContent@3x.png`
   — thread root layout (body not indented).

Also: `Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKAttachmentBarSnapshotTests/testMultipleCompactAttachmentsTruncated@3x.png`
(file cards light/dark), `Modules/UIInfra/MessageKit/Snapshots/iOS_26/MessageKitTests.MKMessageUnfurlContentSnapshotTests/testUnfurlWithFields@3x.png`
(pipe, fields), `Modules/UIInfra/ContextBarUI/Snapshots/iOS_26/ContextBarUITests.SKContextBarSnapshotTests/testTypingIndicator_ShortText@3x.png`
(typing bar), `Modules/UIInfra/NavigationController/Snapshots/iOS_26/NavigationControllerTests.HeaderTitleViewSnapshotTests/testLiquidGlassCapsuleHeaderWithTitleAndSubtitle@3x.png`
(thread title capsule).
