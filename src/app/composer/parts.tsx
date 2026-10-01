import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Icon } from '../../icons/Icon'
import { LONG_PRESS_MS } from '../gestures'
import { SKButton } from '../../slackkit/SKButton'
import { SKAvatarPile } from '../../slackkit/SKAvatarPile'
import type { Conversation, FileAttachment, User } from '../../data/types'
import { asset } from '../../lib/asset'

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

/**
 * The typing indicator (copy from ContextBarTypingConfiguration.swift:34-38): 16 pt avatars overlapping by 4, then
 * "Jane is **typing…**". `standalone`: Sept's SKContextBar, its own interactive glass capsule above the composer (min 36 tall,
 * 6 / 12 padding, caption 13 contentPrimary; SKContextBar.swift:38-41, :66-77, :136-152, :682-689); otherwise June's
 * ContextBarView inside the glass card (spec §14).
 */
export function TypingBanner({ users, standalone }: { users: User[]; standalone?: boolean }) {
  const names = users.map((u) => u.name || 'User')
  // user_is_typing (yaml:22968), two_users_are_typing (20930), several_people_are_typing (16751)
  const lead = names.length === 1 ? `${names[0]} is ` : names.length === 2 ? `${names[0]} and ${names[1]} are ` : 'Several people are '
  return (
    <div className={standalone ? 'cmp-banner cmp-banner--bar glass' : 'cmp-banner'} role="status">
      {/* SKAvatarPile .extraSmall, overlapping, at most 5 (ContextBarView.swift:541; SKAvatarPile.swift:207-220, :236) */}
      <SKAvatarPile avatars={users.map((u) => u.avatar)} size="extraSmall" shouldOverlap maxAvatarCount={5} className="cmp-banner__pile" />
      <span className="cmp-banner__text">
        {lead}
        <b>typing…</b>
      </span>
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
                <img src={asset(f.url)} alt="" draggable={false} />
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
