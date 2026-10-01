import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useApp } from '../store'
import { useSheet } from '../nav/SheetHost'
import { useDevice } from '../../sim/store'
import { Icon } from '../../icons/Icon'
import { Emoji } from '../../emoji/Emoji'
import { displayName } from '../../messagekit/format'
import { useHuddle, useMyRoom, type FeedPill } from './state'
import { closeCallSheet, leaveHuddle, toggleCamera, toggleMic, toggleNotes, toggleScreen } from './actions'
import { MutedMicIcon, ParticipantTile, VideoOffIcon, huddleTitle } from './parts'
import './huddle.css'

// The huddle sheet (spec search-slackbot-huddles.md §3.3-§3.8; HuddlesSheetViewV2.swift:305-380): a page sheet whose
// layers are, back to front, the background, the participant grid, the top and bottom fades, the header over a black
// gradient, the reaction feed, the controls bar and the full-screen effect. Swiping it down minimizes the huddle to the
// in-app PiP (HuddlesSessionManager.swift:756-757), like the minimize button.
//
// The background is the huddle theme, a server-provided image the user picks with Edit Theme (§3.3 layer 1); it isn't
// in the source, so this draws a dark brand-aubergine gradient from Slack's brand constants in its place.

export function HuddleCallSheet() {
  const room = useMyRoom()
  const mine = useHuddle((s) => s.mine)
  const fx = useApp((s) => s.fx)
  const sheet = useSheet()
  const device = useDevice()
  const threads = useApp((s) => s.threads)
  const seen = useRef<number | null>(null)

  // The huddle ended (you left, or everyone did): the sheet goes with it.
  useEffect(() => {
    if (!room && sheet && !sheet.closing) sheet.dismiss()
  }, [room, sheet])

  const replies = room ? (threads[`${room.conversationId}/${room.msgTs}`] ?? []) : []
  const othersReplies = replies.filter((m) => m.userId !== fx.me && room && parseFloat(m.ts) * 1000 >= room.startedAt).length
  if (seen.current === null) seen.current = othersReplies

  // You first, then everyone else in join order.
  const peers = useMemo(() => (room ? [...room.peers].sort((a, b) => (a.userId === fx.me ? -1 : b.userId === fx.me ? 1 : a.joinedAt - b.joinedAt)) : []), [room, fx.me])

  if (!room || !mine) return <div className="huddle-call" />
  const conv = fx.conversations[room.conversationId]
  const me = room.peers.find((p) => p.userId === fx.me)
  const count = room.peers.length
  // HuddleHeaderPresenter.swift:66-88: "Just you" (huddle_just_you) / "%d people" (multiple_people_in_huddle). Your own
  // share shows its banner instead ("live screen sharing" is for someone else's share, the sharer as the title).
  const subtitle = count <= 1 ? 'Just you' : `${count} people`
  // HuddlesCanvasGridLayout.swift:36-44: 2 per row, 24 pt apart, 16 pt side margins, square tiles
  const tile = (device.width - 32 - 24) / 2
  const unread = Math.max(0, othersReplies - (seen.current ?? 0))
  const sticker = room.stickers[fx.me]

  const openThread = () => {
    seen.current = othersReplies
    const { conversationId, msgTs } = room
    // The Thread button minimizes the huddle and shows its thread (HuddleActionButtonContentView .openThread).
    sheet?.dismiss(() => useApp.getState().openThread(conversationId, msgTs))
  }

  return (
    <div className="huddle-call" data-qa="huddle_sheet">
      <div className="huddle-bg" />
      <div className="huddle-call__grid ios-scroll">
        <div className="huddle-call__grid-inner" style={{ width: device.width - 32 }}>
          {room.notes && (
            <div className="huddle-banner huddle-banner--notes">
              {/* HuddlesSheetPresenter.swift:190-230: svgRadioButton in sk_raspberry_red, bodyBold white, a "…" button */}
              <Icon name="radio_button" size={20} color="var(--sk_raspberry_red)" />
              <span className="huddle-banner__text">AI notes and transcription on</span>
              <button type="button" className="huddle-banner__more" aria-label="More Options" onClick={() => toggleNotes()} data-tap>
                <Icon name="ellipsis_horizontal_filled" size={20} />
              </button>
            </div>
          )}
          {mine.screen && (
            <div className="huddle-banner huddle-banner--share">
              {/* HuddlesSheetLocalScreenShareCell.swift:15-140 */}
              <span className="huddle-chip huddle-banner__share-label">
                <Icon name="screen_share" size={16} />
                You’re Sharing Your Screen
              </span>
              <button type="button" className="huddle-stop-share" onClick={toggleScreen} data-tap>
                Stop Sharing
              </button>
            </div>
          )}
          <div className="huddle-call__tiles" style={{ gap: 24 }}>
            {peers.map((p) => {
              const u = fx.users[p.userId]
              const isMe = p.userId === fx.me
              if (isMe && mine.selfViewHidden && peers.length > 1) return null
              const reaction = room.reactions[p.userId]
              return (
                <ParticipantTile
                  key={p.userId}
                  user={u}
                  isMe={isMe}
                  muted={!p.mic}
                  speaking={room.speakerId === p.userId}
                  camera={p.camera}
                  reaction={reaction?.emoji}
                  reactionKey={reaction?.key}
                  sticker={room.stickers[p.userId]}
                  size={tile}
                  onClick={isMe ? undefined : () => useApp.getState().push({ screen: 'profile', userId: p.userId })}
                />
              )
            })}
          </div>
        </div>
      </div>
      <div className="huddle-bg huddle-bg--top-fade" aria-hidden />
      <div className="huddle-bg huddle-bg--bottom-fade" aria-hidden />

      <Header
        title={huddleTitle(fx, conv)}
        subtitle={subtitle}
        onMinimize={() => closeCallSheet()}
        onLeave={() => leaveHuddle()}
        onTitle={() => useApp.getState().showToast('Not in the prototype')}
      />

      <Feed />

      <div className="huddle-controls" role="toolbar" aria-label="Toolbar">
        <ControlButton label={me?.mic ? 'Mute' : 'Unmute'} on={!!me?.mic} onClick={toggleMic}>
          {me?.mic ? <Icon name="microphone" size={20} /> : <MutedMicIcon />}
        </ControlButton>
        <ControlButton label={me?.camera ? 'Turn Video Off' : 'Turn Video On'} on={!!me?.camera} onClick={toggleCamera}>
          {me?.camera ? (
            <span className="huddle-ctrl__video">
              <Icon name="video" size={20} />
              <span className="huddle-ctrl__video-dot" />
            </span>
          ) : (
            <VideoOffIcon />
          )}
        </ControlButton>
        <ControlButton label="Add Reaction" onClick={() => useApp.getState().presentSheet('huddle-reactions')}>
          {sticker ? <Emoji key={sticker} name={sticker} size={30} className="huddle-ctrl__sticker" /> : <Icon name="emoji" size={20} />}
        </ControlButton>
        <ControlButton label={unread ? `Thread, ${unread} new replies` : 'Thread'} onClick={openThread}>
          <Icon name="threads" size={20} />
          {unread > 0 && (
            <span className="huddle-ctrl__badge" aria-hidden>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </ControlButton>
        <ControlButton label="More Options" onClick={() => useApp.getState().presentSheet('huddle-more')}>
          <Icon name="ellipsis_horizontal_filled" size={20} />
        </ControlButton>
      </div>

      <EffectLayer />
    </div>
  )
}

/**
 * The header (HuddlesSheetHeaderView.swift:25-374): the minimize circle 16 pt from the leading edge, the title stack 16 pt
 * after it (top 12 below the sheet's safe top, bottom 16 above the header's bottom), the Leave pill 16 pt from the
 * trailing edge, over a black 50 % → 0 gradient one header + 4 pt tall (HuddlesSheetViewV2.swift:144-151, 201).
 */
function Header({ title, subtitle, onMinimize, onLeave, onTitle }: { title: ReactNode; subtitle: string; onMinimize: () => void; onLeave: () => void; onTitle: () => void }) {
  const prev = useRef(subtitle)
  const key = useRef(0)
  if (prev.current !== subtitle) {
    prev.current = subtitle
    key.current++
  }
  return (
    <div className="huddle-header">
      <div className="huddle-header__gradient" />
      <button type="button" className="huddle-circle huddle-header__close" aria-label="Close" onClick={onMinimize} data-tap>
        <Icon name="caret_down_full" size={20} />
      </button>
      <div className="huddle-header__labels" role="button" aria-label={`${typeof title === 'string' ? title : ''}, ${subtitle}`} onClick={onTitle}>
        <div className="huddle-header__title">{title}</div>
        <div className="huddle-header__subtitle">
          {/* a changed subtitle slides in from +20 pt (HuddlesSheetHeaderView.swift:202-250) */}
          <span key={key.current} className={key.current ? 'is-new' : undefined}>
            {subtitle}
          </span>
        </div>
      </div>
      <button type="button" className="huddle-leave" aria-label="Leave huddle" onClick={onLeave} data-tap>
        Leave
      </button>
    </div>
  )
}

/** One of the five 40 pt round glass buttons (HuddleActionButtonContentView.swift:95-108, 289-311). */
function ControlButton({ label, on, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`huddle-circle huddle-ctrl${on ? ' is-on' : ''}`} aria-label={label} onClick={onClick} data-tap>
      {children}
    </button>
  )
}

/**
 * The reaction feed (HuddleNotificationFeedStack.swift:103-213): pills 16 pt from the left, stacked upward 12 pt apart from
 * 12 pt above the footer's bottom, newest at the bottom; opacity by position 1, 1, 0.8, 0.2, then hidden; each hangs 3 s
 * and fades out over 0.5 s. A pill is the emoji then " Name" (" +N" when combined) in bodyBold, insets 8/12, fully rounded,
 * a 1 pt outlineTertiary border on basePrimary; your own is highlight1.baseInverse with white text and no border
 * (HuddleNotificationFeedView.swift:22-24, 50-120, 156-170).
 */
function Feed() {
  const feed = useHuddle((s) => s.feed)
  const users = useApp((s) => s.fx.users)
  const me = useApp((s) => s.fx.me)
  const newestFirst = [...feed].reverse()
  let offset = 12
  return (
    <div className="huddle-feed" aria-live="polite">
      {newestFirst.map((p, i) => {
        const bottom = offset
        offset += PILL_H + 12
        const opacity = p.leaving ? 0 : [1, 1, 0.8, 0.2][i] ?? 0
        return <FeedPillView key={p.key} pill={p} bottom={bottom} opacity={opacity} name={p.userId === me ? 'You' : displayName(p.userId ? users[p.userId] : undefined)} mine={!p.text && p.userId === me} />
      })}
    </div>
  )
}

/** 8 + a bodyBold line + 8, measured 35.33 pt (HuddleNotificationFeedStackTest/testMultipleReactions@3x.png). */
const PILL_H = 35.33

function FeedPillView({ pill, bottom, opacity, name, mine }: { pill: FeedPill; bottom: number; opacity: number; name: string; mine: boolean }) {
  return (
    <div className={`huddle-feed__pill${mine ? ' is-mine' : ''}`} style={{ bottom, opacity }}>
      {pill.text ? (
        pill.text
      ) : (
        <>
          {pill.emojis.map((e) => (
            <Emoji key={e} name={e} size={20} className="huddle-feed__emoji" />
          ))}
          {` ${name}${pill.plus > 0 ? ` +${pill.plus}` : ''}`}
        </>
      )}
    </div>
  )
}

/** The full-screen effect (HuddlesSheetViewV2.swift:153-158, 291-295, 403-414): fades in, plays, fades out over 0.2 s. */
function EffectLayer() {
  const effect = useHuddle((s) => s.effect)
  const drops = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, delay: (i % 7) * 0.12, scale: 0.7 + ((i * 13) % 10) / 12 })), [])
  if (!effect) return null
  return (
    <div key={effect.key} className="huddle-effect" aria-hidden>
      {drops.map((d, i) => (
        <span key={i} className="huddle-effect__drop" style={{ left: `${d.x}%`, animationDelay: `${d.delay}s`, ['--drop-scale' as string]: d.scale }}>
          <Emoji name={effect.emoji} size={56} />
        </span>
      ))}
    </div>
  )
}
