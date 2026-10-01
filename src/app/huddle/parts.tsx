import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../icons/Icon'
import { Emoji } from '../../emoji/Emoji'
import { SKMemberAvatar } from '../../slackkit/SKMemberAvatar'
import { SKSpinner } from '../../slackkit/SKSpinner'
import { displayName } from '../../messagekit/format'
import type { Conversation, Fixture, User } from '../../data/types'

// Pieces the huddle sheet, the preview, the PiP and the Huddles page share (spec search-slackbot-huddles.md §3).

/** Sticker names (StickerConfiguration, Modules/Data/HuddlesModels/Implementation/HuddlesStickerInfo.swift:18-30). */
export const STICKERS: { emoji: string; label: string }[] = [
  { emoji: 'raised_hand', label: 'Raise hand' }, // huddle_sticker_raise_hand
  { emoji: 'coffee', label: 'Be right back' }, // huddle_sticker_be_right_back
  { emoji: '+1', label: 'Yes' }, // huddle_sticker_thumbs_up
  { emoji: '-1', label: 'No' }, // huddle_sticker_thumbs_down
  { emoji: 'white_check_mark', label: 'Done' }, // huddle_sticker_done
  { emoji: 'iphone', label: 'On mobile' }, // huddle_sticker_mobile
]
export const stickerLabel = (emoji: string) => STICKERS.find((s) => s.emoji === emoji)?.label

/** The huddle's title (HuddleHeaderPresenter.swift:58-129): the conversation's name with its # / lock prefix. */
export function huddleTitle(fx: Fixture, conv: Conversation | undefined): ReactNode {
  if (!conv) return 'Huddle' // `huddle`, yaml:7479
  if (conv.type === 'channel') return `#${conv.name}`
  if (conv.type === 'private')
    return (
      <span className="huddle-lock-name">
        <Icon name="lock" size={16} />
        {conv.name}
      </span>
    )
  if (conv.type === 'mpim') {
    const names = (conv.userIds ?? []).filter((id) => id !== fx.me).map((id) => displayName(fx.users[id]))
    return names.join(', ') || conv.name
  }
  const u = conv.userId ? fx.users[conv.userId] : undefined
  return u ? displayName(u) : conv.name
}

/**
 * The muted mic: HuddleAVButton draws the slash-less mic glyph in white and a separate slash in sk_raspberry_red that
 * scales in (HuddleAVButton.swift:32-57, 161-228). With SVG look-alikes: microphone_off.svg (its own slash runs from
 * (16, 2) to (3.4, 15)) and the red slash drawn over it.
 */
export function MutedMicIcon({ size = 20, slash = 'var(--sk_raspberry_red)', className }: { size?: number; slash?: string; className?: string }) {
  return (
    <span className={['huddle-slashed', className].filter(Boolean).join(' ')} style={{ width: size, height: size }}>
      <Icon name="microphone_off" size={size} />
      <svg className="huddle-slashed__slash" width={size} height={size} viewBox="0 0 20 20" aria-hidden>
        <path d="M15.5 2.25 3.99 15.25" stroke={slash} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** Video off: the camera glyph with the red slash (stopVideoSlashless + slash, HuddleAVButton.swift:59-70). */
export function VideoOffIcon({ size = 20, slash = 'var(--sk_raspberry_red)' }: { size?: number; slash?: string }) {
  return (
    <span className="huddle-slashed" style={{ width: size, height: size }}>
      <Icon name="video_off" size={size} />
      <svg className="huddle-slashed__slash" width={size} height={size} viewBox="0 0 20 20" aria-hidden>
        <path d="M15.5 2.25 2 17.25" stroke={slash} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** The 16 × 16 "soundwave" Lottie shown in the name pill while someone speaks (HuddlesSheetParticipantCell.swift:104-106). */
export const SoundWave = ({ size = 16 }: { size?: number }) => (
  <span className="huddle-soundwave" style={{ width: size, height: size }} aria-hidden>
    <i />
    <i />
    <i />
    <i />
  </span>
)

export interface TileProps {
  user?: User
  /** "You" on your own tile (`you`, yaml:22647) */
  isMe?: boolean
  muted?: boolean
  speaking?: boolean
  camera?: boolean
  reaction?: string
  /** a sticker that stays ("Raise hand") */
  sticker?: string
  /** re-keys the badge so each new reaction pops in again */
  reactionKey?: number
  invited?: 'invited' | 'joiningSoon' | 'declined'
  disconnected?: boolean
  pinned?: boolean
  /** side in pt */
  size: number
  onClick?: () => void
  style?: CSSProperties
}

/**
 * A participant tile (HuddlesSheetParticipantCell.swift:84-115, 178-263, 448-511, 632-856): the avatar fills a square with
 * radius 16; a 1 pt outlineTertiary outline, or a 3 pt white one with a 10 % shadow for the active speaker (the outline is
 * a filled view one border-width larger, radius 16 + border, behind the avatar; 0.6 s spring); the name pill 8 pt from
 * the bottom-left (sk_black 70 %, insets 4/6, 4 pt gaps, captionBold white, a 16 pt mic-off icon when muted or the
 * soundwave while speaking); the reaction or sticker badge 8 pt from the top-left (insets 5, 22 pt emoji, radius 8).
 */
export function ParticipantTile({ user, isMe, muted, speaking, camera, reaction, sticker, reactionKey, invited, disconnected, pinned, size, onClick, style }: TileProps) {
  const name = isMe ? 'You' : displayName(user)
  const badgeEmoji = reaction ?? sticker
  const label = !reaction && sticker ? stickerLabel(sticker) : undefined
  return (
    <div
      className={['huddle-tile', speaking && 'is-speaking', invited && 'is-invited', camera && 'is-camera', pinned && 'is-pinned'].filter(Boolean).join(' ')}
      style={{ width: size, height: size, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={[name, muted ? 'Muted' : null].filter(Boolean).join(', ')}
    >
      <span className="huddle-tile__outline" />
      <span className="huddle-tile__image" style={{ opacity: disconnected ? 0.5 : undefined }}>
        {/* SKMemberAvatar .presentation, square (shouldRoundCorners: false), clipped by the tile's radius */}
        <SKMemberAvatar src={user?.avatar} name={user?.realName ?? name} size={size} style={{ borderRadius: 0 }} />
      </span>
      {invited && <span className="huddle-tile__dim" />}
      {disconnected && (
        <span className="huddle-tile__spinner">
          <SKSpinner size="extraLarge" color="lightOnDark" />
        </span>
      )}
      {invited ? (
        <span className="huddle-chip huddle-tile__invite">
          {/* svgPaperPlane " Invited" / svgClock " Joining soon" / svgCloseCircle " Declined" (huddle_participant_declined),
              HuddlesSheetParticipantCell.swift:954-1000 */}
          <Icon name={invited === 'invited' ? 'paper_plane' : invited === 'declined' ? 'close_circle' : 'clock'} size={16} />
          {invited === 'invited' ? 'Invited' : invited === 'declined' ? 'Declined' : 'Joining soon'}
        </span>
      ) : (
        badgeEmoji && (
          <span key={reactionKey ?? badgeEmoji} className={`huddle-chip huddle-tile__reaction${reaction ? ' is-reaction' : ' is-sticker'}`}>
            <Emoji name={badgeEmoji} size={22} />
            {label && <span className="huddle-tile__sticker-label">{label}</span>}
          </span>
        )
      )}
      {pinned && (
        <span className="huddle-tile__pin" aria-label="Pinned">
          <Emoji name="pushpin" size={20} />
        </span>
      )}
      <span className="huddle-tile__name">
        {speaking && !invited ? <SoundWave /> : muted && !invited ? <MutedMicIcon size={16} slash="currentColor" className="huddle-tile__muted" /> : null}
        <span className="huddle-tile__name-text">{name}</span>
      </span>
      {camera && isMe && (
        <span className="huddle-tile__flip" aria-label="Flip camera">
          <Icon name="camera_swap_filled" size={20} />
        </span>
      )}
    </div>
  )
}

/**
 * SKHuddleFacePile (SKHuddleFacePile.swift:74, 183-226, 325-379): round 24 pt avatars overlapping 8 pt (small 18 / 5),
 * at most 5, later faces on top, a 1 pt basePrimary border (none on the live cards).
 */
export function FacePile({ users, size = 24, overlap = 8, max = 5, border = 'var(--dt_color_base_primary)' }: { users: (User | undefined)[]; size?: number; overlap?: number; max?: number; border?: string | null }) {
  const shown = users.filter(Boolean).slice(0, max) as User[]
  return (
    <span className="huddle-facepile" style={{ height: size }}>
      {shown.map((u, i) => (
        <span key={u.id} className="huddle-facepile__face" style={{ width: size, height: size, marginLeft: i ? -overlap : 0, boxShadow: border ? `0 0 0 1px ${border}` : undefined }}>
          <SKMemberAvatar src={u.avatar} name={u.realName} size={size} round />
        </span>
      ))}
    </span>
  )
}
