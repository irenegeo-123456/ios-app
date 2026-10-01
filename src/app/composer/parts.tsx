import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Icon } from '../../icons/Icon'
import { LONG_PRESS_MS } from '../gestures'
import { SKButton } from '../../slackkit/SKButton'
import { SKAvatarPile } from '../../slackkit/SKAvatarPile'
import { SKOrnamentBox } from '../../slackkit/SKOrnamentBox'
import type { Conversation, FileAttachment, User } from '../../data/types'
import { SKThumbnailAttachment } from '../../slackkit/SKThumbnailAttachment'
import type { ContextBarState } from './contextBar'

// The composer's small pieces (spec composer.md §5, §6, §9, §10, §14).

/** Toolbar buttons never take focus from the text view (the keyboard stays up). */
export const keepFocus = (e: ReactPointerEvent) => e.preventDefault()

export type ButtonStyle = 'default' | 'plus' | 'send' | 'send-disabled' | 'cancel' | 'close-format' | 'format' | 'mic' | 'stop'

/**
 * An SKIconButton in the toolbar: a 36 pt circle with a 20 pt icon (SKIconButton.swift:447-449, :711-719 [Sept]). Pressed:
 * the selected colors and a 0.9 bounce (spec §5.3); selected (an active format): the selected colors only; disabled (the
 * plugin's `enabled` is false, read for every icon button since Sept, ComposerToolbarView.swift:501-502): alpha 0.35 and
 * no taps (SKIconButton.swift:236-241).
 */
export function ToolButton({
  icon,
  selectedIcon,
  label,
  onPress,
  onLongPress,
  look = 'default',
  selected,
  disabled,
  className,
  style,
}: {
  icon: string
  selectedIcon?: string
  label: string
  onPress?: () => void
  onLongPress?: () => void
  look?: ButtonStyle
  selected?: boolean
  disabled?: boolean
  className?: string
  style?: CSSProperties
}) {
  const timer = useRef(0)
  const longPressed = useRef(false)
  return (
    <button
      type="button"
      className={['cmp-btn', `cmp-btn--${look}`, selected && 'is-selected', disabled && 'is-disabled', className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-pressed={look === 'format' ? !!selected : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      data-tap
      style={style}
      onPointerDown={(e) => {
        keepFocus(e)
        longPressed.current = false
        if (onLongPress) {
          timer.current = window.setTimeout(() => {
            longPressed.current = true
            onLongPress()
          }, LONG_PRESS_MS)
        }
      }}
      onPointerUp={() => clearTimeout(timer.current)}
      onPointerLeave={() => clearTimeout(timer.current)}
      onContextMenu={(e) => {
        if (!onLongPress) return
        e.preventDefault()
        longPressed.current = true
        onLongPress()
      }}
      onClick={() => {
        if (longPressed.current || disabled) return
        onPress?.()
      }}
    >
      {selectedIcon && <Icon name={selectedIcon} size={20} className="cmp-btn__icon cmp-btn__icon--selected" />}
      <Icon name={icon} size={20} className={selectedIcon ? 'cmp-btn__icon cmp-btn__icon--normal' : 'cmp-btn__icon'} />
    </button>
  )
}

/**
 * The thread option's checkbox: the icon-font glyphs checkboxEmpty (U+E0A4) / checkboxFull (U+E577) at 16 pt
 * (ComposerSendToChannelView.swift:173-180). Drawn from the glyphs' outlines in
 * Modules/Data/Font/ResourceBundle/Icon/slack-icons.otf, measured at 1000 units/em: a rounded square spanning
 * 0.05–0.95 em, 0.075 em stroke, ~0.235 em corners; the full glyph knocks a 0.125 em check out of the filled square.
 */
export function CheckboxGlyph({ checked }: { checked: boolean }) {
  return (
    <svg className="cmp-stc__box" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      {checked ? (
        <>
          <mask id="cmp-check-knockout">
            <rect x="0.8" y="0.8" width="14.4" height="14.4" rx="3.76" fill="#fff" />
            <path d="M4.7 8.4 6.5 10.9 11.3 5.3" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </mask>
          <rect x="0.8" y="0.8" width="14.4" height="14.4" rx="3.76" fill="currentColor" mask="url(#cmp-check-knockout)" />
        </>
      ) : (
        <rect x="1.4" y="1.4" width="13.2" height="13.2" rx="3.16" fill="none" stroke="currentColor" strokeWidth="1.2" />
      )}
    </svg>
  )
}

/**
 * "Also send to #channel" (ComposerSendToChannelView.swift; PNG testDefaultComposerSendToChannelView): checkbox +
 * caption, 12 pt from the leading edge, 2 pt above and below, 12 pt to the text view.
 */
export function SendToChannel({ conv, checked, onToggle }: { conv: Conversation | undefined; checked: boolean; onToggle: () => void }) {
  let label: ReactNode
  if (conv?.type === 'im' || conv?.type === 'app') label = 'Also send as a direct message' // also_send_as_direct_message (yaml:1761)
  else if (conv?.type === 'mpim') label = 'Also send to the group' // also_send_to_the_group (yaml:1764)
  else
    label = (
      // thread_broadcast_button_title "Also send to %@" (yaml:21617); the name in captionBold, a lock glyph first on private channels
      <>
        Also send to{' '}
        <b className="cmp-stc__name">
          {conv?.type === 'private' ? <Icon name="lock" size={14} className="cmp-stc__lock" /> : '#'}
          {conv?.name}
        </b>
      </>
    )
  return (
    <div className="cmp-stc">
      <button type="button" className={`cmp-stc__button${checked ? ' is-checked' : ''}`} role="checkbox" aria-checked={checked} onPointerDown={keepFocus} onClick={onToggle} data-tap>
        <CheckboxGlyph checked={checked} />
        <span className="cmp-stc__label">{label}</span>
      </button>
    </div>
  )
}

/** "Jane is **typing…**" / "Jane and Sam are **typing…**" / "Several people are **typing…**" (user_is_typing yaml:22968,
 *  two_users_are_typing :22438, several_people_are_typing :17733; ContextBarTypingConfiguration.swift:31-42). Names are
 *  `user.name`, display or real, and the avatars the users' own (ContextBarService.swift:411-430). */
function typingLabel(users: User[]): ReactNode {
  const names = users.map((u) => u.name || u.realName)
  const lead = names.length === 1 ? `${names[0]} is ` : names.length === 2 ? `${names[0]} and ${names[1]} are ` : 'Several people are '
  return (
    <>
      {lead}
      <b>typing…</b>
    </>
  )
}

/**
 * Sept's SKContextBar above the composer (Modules/UIInfra/ContextBarUI/Implementation/SKContextBar.swift): its own
 * interactive glass capsule, at least 36 tall, 6 / 12 padding (:38-41, :66-77, :136-152); a header row `[left] [label]`
 * 8 apart (Views/ContextBarRowView.swift:18-23, :61-68): a 16 pt overlapping avatar pile or nothing (SKContextBar.swift:
 * 331-335), then the label, Lato 13 contentPrimary on up to 2 lines, <bold> spans Lato Bold (:339-341, :618-629, :682-689).
 * Its states are worked out in contextBar.ts; each draws as SKContextBarAdapter.swift does.
 */
export function ContextBar({ state }: { state: ContextBarState }) {
  let avatars: string[] = []
  let icon: string | undefined
  let label: ReactNode
  if (state.kind === 'dnd') {
    // `user_has_paused_notifications` "%@ has <bold>paused their notifications</bold>" (yaml:22952), the name plain
    // (ContextBarConfiguration.swift:76-79); left the `.snoozeFilled` icon with no fill, so in the text color, a 16 pt
    // .tiny SKOrnamentBox (SKContextBarAdapter.swift:291-299; SKContextBar.swift:318-331), drawn as svgNotificationsDnd
    // (SKIcon.swift:131; SKIconManifest+SVGMapping.swift:191). Not tappable (only .channelContextbar has a link, :460-464).
    icon = 'notifications_dnd'
    label = (
      <>
        {state.name} has <b>paused their notifications</b>
      </>
    )
  } else if (state.kind === 'typing') {
    avatars = state.users.map((u) => u.avatar)
    label = typingLabel(state.users)
  } else if (state.kind === 'aiAppProcessing') {
    // Text(data.name + " " + data.status), no left component (ContextBarAiAppProcessingConfiguration.swift:22; SKContextBarAdapter.swift:282-289)
    label = state.text
  } else {
    // Slackbot's avatar + slackbot_is_typing "Slackbot is <bold>typing...</bold>", three periods (yaml:20148;
    // ContextBarSlackbotAIProcessingConfiguration.swift:31, :39-40; SKContextBarAdapter.swift:410-418)
    avatars = state.avatar ? [state.avatar] : []
    label = (
      <>
        Slackbot is <b>typing...</b>
      </>
    )
  }
  return (
    <div className="cmp-banner cmp-banner--bar glass" role="status">
      {/* SKAvatarPile .extraSmall, overlapping (SKContextBar.swift:37, :331-335); none when there's no avatar */}
      {avatars.length > 0 && <SKAvatarPile avatars={avatars} size="extraSmall" shouldOverlap maxAvatarCount={5} className="cmp-banner__pile" />}
      {icon && <SKOrnamentBox ornament={{ icon, color: 'currentColor' }} size="tiny" className="cmp-banner__icon" />}
      <span className="cmp-banner__text">{label}</span>
    </div>
  )
}

/**
 * June's typing banner, ContextBarView inside the glass card (flag composerContextBar off; spec §14): 16 pt avatars
 * overlapping by 4, then "Jane is **typing…**".
 */
export function TypingBanner({ users }: { users: User[] }) {
  return (
    <div className="cmp-banner" role="status">
      {/* SKAvatarPile .extraSmall, overlapping, at most 5 (ContextBarView.swift:541; SKAvatarPile.swift:207-220, :236) */}
      <SKAvatarPile avatars={users.map((u) => u.avatar)} size="extraSmall" shouldOverlap maxAvatarCount={5} className="cmp-banner__pile" />
      <span className="cmp-banner__text">{typingLabel(users)}</span>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ attachments

const isImage = (f: FileAttachment) => f.mimetype.startsWith('image/')

/** The file-type tile's color: the type's palette color at step 50 (UIColor+FileTypeExtensions.swift:15-26, :53-81). */
function fileTile(f: FileAttachment): { bg: string; icon: string } {
  switch (f.filetype) {
    case 'pdf':
      return { bg: 'var(--dt_color_palettes_flamingo_50)', icon: 'pdf_file_filled' }
    case 'gsheet':
      return { bg: 'var(--dt_color_palettes_mojito_50)', icon: 'file_filled' }
    case 'gdoc':
      return { bg: 'var(--dt_color_palettes_ocean_50)', icon: 'file_filled' }
    default:
      return { bg: 'var(--dt_color_surface_primary)', icon: 'file_filled' }
  }
}

/**
 * The attachments tray (ComposerAttachmentsView.swift:71-91): 76 pt, a horizontal strip of 64 pt cards with a remove
 * button on each card's top-right corner. Images are 64 × 64 thumbnails; files are compact cards up to 220 wide.
 * An image's ALT badge (Sept): SKThumbnailAttachment with altTextBadgeVisibility `.visibleAlways` ("ALT", or the
 * "+ ALT" reminder) when the user's or team's alt-text-reminder pref is on, else `.visibleIfPresent` ("ALT" only when the
 * image has alt text) (ComposerAttachmentsPresenter.swift:253-261; prefs `altTextReminders` / `teamAltTextReminders`,
 * default false, ComposerFeature+Dependencies.swift:225-226, :243). The clone has neither pref nor alt text on files, so
 * it's `.visibleIfPresent` and no badge shows. (The image-markup edit icon would replace it; flag off, §9.)
 */
export function AttachmentsTray({ files, onRemove }: { files: FileAttachment[]; onRemove: (id: string) => void }) {
  return (
    <div className="cmp-tray" data-scroll-x>
      {files.map((f) => {
        const tile = fileTile(f)
        return (
          <div key={f.id} className={`cmp-tray__item${isImage(f) ? ' is-thumb' : ' is-file'}`}>
            <div className="cmp-tray__card" data-tap>
              {isImage(f) ? (
                <SKThumbnailAttachment state={{ image: { src: f.url } }} altTextBadgeVisibility="visibleIfPresent" isInteractionEnabled={false} className="cmp-tray__thumb" />
              ) : (
                <>
                  <span className="cmp-tray__tile" style={{ background: tile.bg }}>
                    <Icon name={tile.icon} size={20} />
                  </span>
                  <span className="cmp-tray__text">
                    <span className="cmp-tray__title">{f.title}</span>
                    <span className="cmp-tray__type">{(f.prettyType ?? f.filetype ?? '').toUpperCase()}</span>
                  </span>
                </>
              )}
            </div>
            {/* ComposerAttachmentRemoveButton.swift: close_circle_filled on a ringed circle; remove_attachment (yaml:16188) */}
            <button type="button" className="cmp-tray__remove" aria-label={`Remove attachment ${f.name}`} onPointerDown={keepFocus} onClick={() => onRemove(f.id)} data-tap>
              <Icon name="close_circle_filled" size={20} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The collapsed composer's attachment count (ComposerAttachmentsPlugin.swift:33-40; ComposerToolbarView.swift:526-570):
 * an SKButton .small with svgAttachment + the count, contentPrimary on baseTertiary (radius 10, 34 pt tall).
 */
export function AttachmentChip({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <SKButton
      title={String(count)}
      icon="attachment"
      size="small"
      buttonStyle="custom"
      customColors={{ backgroundColor: 'var(--dt_color_base_tertiary)', titleColor: 'var(--dt_color_content_primary)', borderColor: 'transparent' }}
      onClick={onPress}
      accessibilityLabel={`${count} attachments`}
    />
  )
}
