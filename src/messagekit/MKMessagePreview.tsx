import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { Emoji } from '../emoji/Emoji'
import { useLongPress } from '../app/gestures'
import { InlineText } from '../app/text/RichText'
import { SKBadge } from '../slackkit/SKBadge'
import { SKMemberAvatar } from '../slackkit/SKMemberAvatar'
import { SKOrnamentBox } from '../slackkit/SKOrnamentBox'
import { SKGroupAvatar } from '../slackkit/SKGroupAvatar'
import { SKSpinner } from '../slackkit/SKSpinner'
import { asset } from '../lib/asset'
import { ordinal } from '../lib/slackDate'
import type { FileAttachment, Message, MessageAttachment, Reaction } from '../data/types'
import './MKMessagePreview.css'

// MKMessagePreview (Modules/UIInfra/MessageKit/Implementation/MKMessagePreview.swift): the preview row MessageKit draws in
// DMs, Activity, Later, Drafts, Scheduled, Sent and Search (spec dms-activity.md §1.1). Top to bottom, 8 pt apart
// (:55, :255), items without content taking no space:
//
//   [hairline pill]                     an SKPillButton hugging its content (:183-194)
//   [eyebrow]                           captionBold 13, highlight1.content, 1 line (:308-313)
//   [header ········ timestamp ● 3]     only with a header: micro 12 content_secondary, truncating first (MKTopContentStackView)
//   [ornament]  12  [primary · decoration ······ timestamp ● 3]   36 pt ornament, top aligned (MKOuterHorizontalStack:129)
//                   [mustache]          caption 13, 1 line, 8 pt above the body (:199-203)
//                   [body ······ accessory] [attachments] [unfurls] [reactions]   MKMessageContentView, 8 pt apart
//                   [footer]            smallBody 15, highlight1.content (:300-306)
//
// Sept (slack-objc-latest @ 14b3cbaf): the timestamp sits next to the top-most content: the header, else the name, else
// the body, as a third item of the outer row, 12 pt after the column (MKCoreMessageProperties.swift:101-120;
// MKMessagePreview.swift:249-259, :373-379; MKOuterHorizontalStack.swift:142-160, :219-221; PNG
// MKMessagePreviewSnapshotTests/testMessagePreviewWithTimestampNextToSecondaryContent). With an ornament and no name the
// ornament and the column center on each other while the column is no taller than the ornament (top aligned once it is,
// testMessagePreviewNoPrimaryTextWithContentTallerThanOrnament; MKCoreMessageProperties.swift:261-263,
// MKOuterHorizontalStack.swift:64-116). The dot / badge / spinner stay in the header row, else the name row.
//
// The row is padded 10/16/10/16 (:53). Text starts at x = 16 + 36 + 12 = 64 with an ornament, 16 without. Texts take the
// caller's font and color first ("fallback" attributes, Text.swift:122-127): pass `primaryFont`, `bodyFont`… to override.
//
//   <MKMessagePreview ornament={<SKMemberAvatar … />} primaryText="Priya Patel" timestamp="5m ago"
//     accessory={{ badge: <SKBadge count={2} /> }} body="You: sounds good" bodyFont="var(--sk-small-body)" />

// ------------------------------------------------------------------------------------------------------------ types

/** MKCoreMessageProperties.BackgroundStyle (MKCoreMessageProperties.swift:137-177): the row's tint, only when the caller
 *  enables background styling. */
export type MKBackgroundStyle = 'failed' | 'pinned' | 'highlighted' | 'slackbotResponse' | 'savedForLater' | 'broadcast' | 'huddle' | 'ephemeral'

/** HeaderAccessory (MKMessagePreview.swift:469-474 [Sept]): a 12 pt dot (default important.baseInverse), an SKBadge, or a
 *  small darkOnLight SKSpinner while an agent is working, a11y "Processing" (`agent_processing`; :172-175, :391-394;
 *  MKPrimaryContentStackView.swift:257-263, :355-356). */
export type MKHeaderAccessory = { dot: true | string } | { badge: ReactNode } | { spinner: true }

/** A reaction pill in the preview's reacji bar. */
export interface MKReaction {
  name: string
  count: number
  /** you reacted: highlight1 surface, 2 pt outline, highlight1 text */
  selected?: boolean
}

export interface MKMessagePreviewProps {
  /** the 36 pt leading ornament (SKEntityOrnamentView .large): an SKMemberAvatar, MKGroupAvatar, MKIconOrnament… */
  ornament?: ReactNode
  /** the name line. A string is mrkdwn (emoji, bold…) drawn in `primaryFont` */
  primaryText?: ReactNode
  /** bodyBold 17 for previews (MKCoreMessageProperties.swift:220-227); unread DMs and Activity pass var(--sk-body-black) */
  primaryFont?: string
  /** content_primary by default (:221-228); DM names pass sk_primary_foreground */
  primaryColor?: string
  /** 4 unless the caller sets primaryTextNumberOfLines (MKMessagePreview.swift:529-530) */
  primaryLines?: number
  /** PrimaryTextDecoration, 8 pt after the name: an SKBadge ("APP") or a 20 pt icon (MKPrimaryContentStackView.swift:64-87) */
  primaryDecoration?: ReactNode
  /** captionBold 13 highlight1.content, 1 line ("Saved for Later • Due in 60 mins") */
  eyebrow?: ReactNode
  /** the line above the name (Activity's "Mention in #general"); micro 12 content_secondary unless the caller styles it */
  header?: ReactNode
  headerFont?: string
  headerColor?: string
  /** micro 12 content_tertiary, never truncated; in the header row when there's a header, else at the name row's end */
  timestamp?: ReactNode
  /** the dot or badge after the timestamp */
  accessory?: MKHeaderAccessory
  /** how the name row aligns its timestamp and accessory: 'top' (default) or 'center' (Activity) */
  accessoryAlignment?: 'top' | 'center'
  /** caption 13 under the name ("replied to: …"); the caller passes its color (usually content_secondary) */
  mustache?: ReactNode
  mustacheColor?: string
  mustacheFont?: string
  mustacheLines?: number
  /** the message text: a string is mrkdwn, folded to `bodyLines`; prefix "You: " yourself (TextMapper.swift:105-112) */
  body?: ReactNode
  /** the caller's baseFont (default body 17) and baseTextColor (default content_primary [Sept]; June sk_primary_foreground),
   *  MessageViewPresentationObjectFactory.swift:58-59 */
  bodyFont?: string
  bodyColor?: string
  /** 2 for previews (DefaultTransformationPath.swift:370); Activity reactions fold to 1 */
  bodyLines?: number
  /** a trailing accessory next to the body, 8 pt away, top aligned (chevron, mute icon, checkbox) */
  bodyAccessory?: ReactNode
  /** files, laid out as SKAttachmentBar's .preview styling: one expands (image) or shows as a card (file); more become
   *  64 pt thumbnails with a "+N" tile (MessageViewPresentationObjectFactory.swift:89-155) */
  files?: FileAttachment[]
  /** link unfurls and app attachments, shown with a 4 pt bar (MKMessageUnfurlContent) */
  unfurls?: MessageAttachment[]
  /** any other content between the body and the reactions (custom attachment previews) */
  attachments?: ReactNode
  /** the reacji bar, collapsed to `reactionRows` rows with an "N more" pill (SKReacjiBar) */
  reactions?: MKReaction[]
  reactionRows?: number
  onReactionLongPress?: (name: string) => void
  /** smallBody 15, highlight1.content ("2 more replies") */
  footer?: ReactNode
  /** customInnerSpacing: the name → body gap when the body is text (0 by default; Activity uses 4) */
  innerSpacing?: number
  /** an optional pill at the very top (Activity's AI "Action item") */
  hairlinePill?: ReactNode
  /** the row tint (failed, pinned, saved…); default: the list's background */
  background?: MKBackgroundStyle
  /** HiddenMessageState.hidden: "This message is hidden" / "You're hiding messages from this person." */
  hidden?: boolean
  /** deep-link target (focused) highlight, surface_highlight_3 (SKEntityBackgroundView.swift:111-114 [Sept]) */
  focused?: boolean
  onClick?: () => void
  onLongPress?: (el: HTMLElement) => void
  className?: string
  style?: CSSProperties
  'data-qa'?: string
}

// ------------------------------------------------------------------------------------------------------ the preview

export function MKMessagePreview(props: MKMessagePreviewProps) {
  const {
    ornament,
    primaryFont,
    primaryColor,
    primaryLines = 4,
    primaryDecoration,
    eyebrow,
    header,
    headerFont,
    headerColor,
    timestamp,
    accessory,
    accessoryAlignment = 'top',
    mustache,
    mustacheColor,
    mustacheFont,
    mustacheLines = 1,
    bodyAccessory,
    bodyLines = 2,
    files,
    unfurls,
    attachments,
    reactions,
    reactionRows = 2,
    onReactionLongPress,
    footer,
    innerSpacing,
    hairlinePill,
    background,
    focused,
    onClick,
    onLongPress,
    className,
    style,
  } = props
  const lp = useLongPress((el) => onLongPress?.(el))

  // HiddenMessageState.hidden replaces the name and the body (MKCoreMessageProperties.swift:81-85, :294-310).
  const hidden = !!props.hidden
  const primaryText = hidden ? "This message is hidden" : props.primaryText
  const body = hidden ? "You're hiding messages from this person." : props.body
  const bodyFont = hidden ? 'var(--sk-small-body)' : props.bodyFont
  const bodyColor = hidden ? 'var(--dt_color_content_secondary)' : props.bodyColor

  const hasBody = body !== undefined && body !== null && body !== ''
  const hasFiles = !hidden && !!files?.length
  const hasUnfurls = !hidden && !!unfurls?.length
  const hasAttachments = !hidden && attachments !== undefined && attachments !== null && attachments !== false
  const hasReactions = !hidden && !!reactions?.length
  const hasContent = hasBody || !!bodyAccessory || hasFiles || hasUnfurls || hasAttachments || hasReactions
  // The inner column stacks 12 pt apart (MKMessagePreview.swift:246) with custom gaps: after the name 8 when the content
  // starts with an attachment or unfurl (isFirstItemNonBlockContent), the caller's spacing (default 0) when it starts
  // with text, 12 with no content (:224-236); after the mustache 8 (:202).
  const firstIsNonBlock = !hasBody && !bodyAccessory && (hasFiles || hasUnfurls || hasAttachments)

  const primary =
    typeof primaryText === 'string' ? <InlineText text={primaryText} /> : primaryText
  const hasPrimary = primaryText !== undefined && primaryText !== null
  const hasHeader = header !== undefined && header !== null
  const hasOrnament = ornament !== undefined && ornament !== null

  const dot = accessory && 'dot' in accessory ? <MKDot color={accessory.dot === true ? undefined : accessory.dot} /> : null
  const badge = accessory && 'badge' in accessory ? accessory.badge : null
  const spinner = accessory && 'spinner' in accessory ? <SKSpinner size="small" aria-label="Processing" /> : null
  const hasTimestamp = timestamp !== undefined && timestamp !== null && timestamp !== ''
  // MKCoreMessageProperties.timestampPlacement (MKCoreMessageProperties.swift:115-120 [Sept]): the header, else the name,
  // else beside the content. The accessories stay with the header, else in the name row (MKMessagePreview.swift:152-180).
  const placement = !hasTimestamp ? null : hasHeader ? 'header' : hasPrimary ? 'primary' : 'content'
  const stamp = hasTimestamp ? <span className="mk-preview__timestamp mk-label">{timestamp}</span> : null
  const accessories =
    dot || badge || spinner ? (
      <>
        {dot}
        {badge && <span className="mk-preview__badge">{badge}</span>}
        {spinner}
      </>
    ) : null
  const headerTrailing =
    hasHeader && (stamp || accessories) ? (
      <>
        {stamp}
        {accessories}
      </>
    ) : null
  const primaryTrailing =
    !hasHeader && ((placement === 'primary' && stamp) || accessories) ? (
      <>
        {placement === 'primary' && stamp}
        {accessories}
      </>
    ) : null
  // An empty MKPrimaryContentStackView has no size, so it and its spacing are skipped (SKLayoutCalculator.swift:110-113).
  const primaryRendered = hasPrimary || !!primaryDecoration || !!primaryTrailing

  const afterPrimary = !primaryRendered ? 0 : !hasContent ? 12 : firstIsNonBlock ? 8 : (innerSpacing ?? 0)
  const hasMustache = mustache !== undefined && mustache !== null && mustache !== ''
  const hasFooter = footer !== undefined && footer !== null && footer !== ''
  const gapAfter = (item: 'primary' | 'mustache' | 'content') => (item === 'primary' ? afterPrimary : item === 'mustache' ? 8 : 12)
  const mustacheTop = gapAfter('primary')
  const contentTop = hasMustache ? gapAfter('mustache') : gapAfter('primary')
  const footerTop = hasContent ? gapAfter('content') : hasMustache ? gapAfter('mustache') : gapAfter('primary')

  // centersContentShorterThanOrnament (MKCoreMessageProperties.swift:261-263 [Sept]): with an ornament and no name, the
  // row centers while the column is no taller than the ornament, measured at layout time (MKOuterHorizontalStack.swift:64-116).
  const centerable = hasOrnament && !hasPrimary
  const center = useCenteredAgainstOrnament(centerable)

  const cls = [
    'mk-preview',
    background && `mk-preview--${background}`,
    hasOrnament && 'has-ornament',
    focused && 'is-focused',
    onClick && 'is-tappable',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} style={style} data-tap={onClick || onLongPress ? '' : undefined} role={onClick ? 'button' : undefined} onClick={onClick} data-qa={props['data-qa']} {...(onLongPress ? lp : {})}>
      <div className="mk-preview__bg" />
      <div className="mk-preview__stack">
        {hairlinePill && <div className="mk-preview__pill">{hairlinePill}</div>}
        {eyebrow && <div className="mk-preview__eyebrow mk-label">{eyebrow}</div>}
        {hasHeader && (
          // MKTopContentStackView: header (low compression resistance, fills), timestamp, dot, badge, spinner; 8 pt, top aligned
          <div className="mk-preview__top">
            <div className="mk-preview__header mk-label" style={{ font: headerFont, color: headerColor }}>
              {typeof header === 'string' ? <InlineText text={header} /> : header}
            </div>
            {headerTrailing}
          </div>
        )}
        <div className={`mk-preview__main${center.on ? ' is-centered' : ''}`} ref={center.ref}>
          {hasOrnament && <div className="mk-preview__ornament">{ornament}</div>}
          <div className="mk-preview__column">
            {/* MKPrimaryContentStackView: name (hugs), decoration, spacer, then timestamp · dot · badge · spinner when there's no header */}
            {primaryRendered && (
              <div className={`mk-preview__primary-row is-${accessoryAlignment}`}>
                {hasPrimary && (
                  <div className="mk-preview__primary mk-label" style={{ font: hidden ? 'var(--sk-body)' : primaryFont, color: primaryColor, WebkitLineClamp: primaryLines }}>
                    {primary}
                  </div>
                )}
                {primaryDecoration && <span className="mk-preview__decoration">{primaryDecoration}</span>}
                {primaryTrailing && <span className="mk-preview__trailing">{primaryTrailing}</span>}
              </div>
            )}
            {hasMustache && (
              <div className="mk-preview__mustache mk-label" style={{ marginTop: mustacheTop, color: mustacheColor, font: mustacheFont, WebkitLineClamp: mustacheLines }}>
                {typeof mustache === 'string' ? <InlineText text={mustache} /> : mustache}
              </div>
            )}
            {hasContent && (
              // MKMessageContentView: text (+ accessory), attachment bar, unfurls, reacji bar; 8 pt apart (:17, :273)
              <div className="mk-preview__content" style={{ marginTop: contentTop, ['--mk-body-font' as string]: bodyFont, ['--mk-body-color' as string]: bodyColor }}>
                {(hasBody || bodyAccessory) && (
                  <div className="mk-preview__body-row">
                    <div className="mk-preview__body mk-label" style={{ WebkitLineClamp: bodyLines }}>
                      {typeof body === 'string' ? <InlineText text={body} /> : body}
                    </div>
                    {bodyAccessory && !hidden && <span className="mk-preview__body-accessory">{bodyAccessory}</span>}
                  </div>
                )}
                {hasFiles && <MKPreviewFiles files={files!} />}
                {hasUnfurls && unfurls!.map((u, i) => <MKPreviewUnfurl key={`${u.id}-${i}`} unfurl={u} />)}
                {hasAttachments && attachments}
                {hasReactions && <MKPreviewReactions reactions={reactions!} rows={reactionRows} onLongPress={onReactionLongPress} />}
              </div>
            )}
            {hasFooter && (
              <div className="mk-preview__footer mk-label" style={{ marginTop: footerTop }}>
                {footer}
              </div>
            )}
          </div>
          {/* no header and no name: the timestamp is the outer row's third item, 12 pt after the column (MKOuterHorizontalStack.swift:142-160 [Sept]) */}
          {placement === 'content' && <span className="mk-preview__timestamp mk-preview__outer-timestamp mk-label">{timestamp}</span>}
        </div>
      </div>
    </div>
  )
}

/** MKOuterHorizontalStack's width-dependent alignment (MKOuterHorizontalStack.swift:64-116 [Sept]): center the ornament and
 *  the column on each other while the column is no taller than the ornament, else keep them top aligned. */
function useCenteredAgainstOrnament(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useLayoutEffect(() => {
    const main = ref.current
    if (!enabled || !main) {
      setOn(false)
      return
    }
    const ornament = main.querySelector<HTMLElement>(':scope > .mk-preview__ornament')
    const column = main.querySelector<HTMLElement>(':scope > .mk-preview__column')
    if (!ornament || !column) return
    const update = () => setOn(column.offsetHeight <= ornament.offsetHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(column)
    ro.observe(ornament)
    return () => ro.disconnect()
  }, [enabled])
  return { ref, on }
}

/** MKMessagePreview.MKDotView, now SlackKit's SKDot (MKMessagePreview.swift:563; SKDot.swift:21-30 [Sept]): a 12 pt circle
 *  centered in a 16 × 16 box. */
export function MKDot({ color }: { color?: string }) {
  return (
    <span className="mk-dot" aria-label="Unread">
      <i style={color ? { background: color } : undefined} />
    </span>
  )
}

// ---------------------------------------------------------------------------------------------------------- ornaments
// SKEntityOrnamentView at .large (Modules/UIInfra/SlackKit/Implementation/Helpers/EntityViews/SKEntityOrnamentView.swift:397-506):
// member avatars 36 (use SKMemberAvatar), group avatars, 36 pt ornament boxes, images (radius 6) and emoji.

export interface MKFace {
  src?: string
  name: string
}

/**
 * SKGroupAvatar .large, the group-DM ornament: two 24 pt faces in a 36 pt box, the first cut away around the second
 * (DeveloperComponents/GroupAvatar/SKGroupAvatar.swift:195-282, :343-424). Faces are the first two other members.
 */
export function MKGroupAvatar({ faces }: { faces: MKFace[] }) {
  const [a, b] = faces
  return <SKGroupAvatar size="large" count={faces.length} primarySrc={a?.src} primaryName={a?.name} secondarySrc={b?.src} secondaryName={b?.name} />
}

/**
 * SKOrnamentBox .large (DesignerComponents/OrnamentBox/SKOrnamentBox.swift:618-659): 36 pt, radius min(20, 0.25 × 36) = 9,
 * surface_primary fill by default, the icon at SKIcon's intrinsic 20 pt, centered.
 */
export function MKIconOrnament({ icon, color, background }: { icon: string; color?: string; background?: string }) {
  return <SKOrnamentBox ornament={{ icon, color }} size="large" backgroundColor={background} />
}

/** An image ornament: 36 pt, radius 6 at .large (SKEntityOrnamentView.swift imageViewCornerRadius), base_tertiary placeholder. */
export function MKImageOrnament({ src, size = 36, radius = 6 }: { src?: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="mk-image-ornament" style={{ width: size, height: size, borderRadius: radius }}>
      {src && !failed && <img src={asset(src)} alt="" draggable={false} onError={() => setFailed(true)} />}
    </span>
  )
}

/** An emoji ornament: the emoji at 36 pt (SKEntityOrnamentView emojiSideLength, .large). Activity's D reaction rows. */
export function MKEmojiOrnament({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className="mk-emoji-ornament" style={{ width: size, height: size }}>
      <Emoji name={name} size={size} />
    </span>
  )
}

/**
 * SKMemberAvatar .memberWithIcon (DesignerComponents/MemberAvatar/SKMemberAvatar.swift:109-162, :266-271, :363-413): the
 * photo with three rounded corners and a notch at the bottom-right holding an icon, as Activity draws its rows (spec §3.6).
 * For a side s: cut-out c = 10 + 0.15 s, gap g = 2 + 0.015 s; the notch starts at s − (c − 4) − g with a corner of c / 3,
 * and the icon (c × c) sits at s − c + g, overhanging the photo by g. At 36 pt: notch 22.06 → 36, icon 15.4 pt at 23.14.
 */
export function MKAvatarWithIcon({ src, name, icon, iconColor, size = 36 }: { src?: string; name: string; icon: string; iconColor?: string; size?: number }) {
  const s = size
  const c = 10 + 0.15 * s
  const g = 2 + 0.015 * s
  const adj = c - 4
  const x0 = s - adj - g
  const cr = c / 3
  const r = Math.min(20, 0.25 * s)
  // memberSquareCutoutPath (:373-389), subtracted from the rounded photo (TL, TR, BL rounded; BR square)
  const photo = `M${r} 0H${s}V${s}H${r}A${r} ${r} 0 0 1 0 ${s - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
  const notch = `M${x0} ${s}V${s - adj + cr}Q${x0} ${x0} ${x0 + cr} ${x0}H${s}V${s}Z`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'><path fill-rule='evenodd' d='${photo}${notch}'/></svg>`
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  const [failed, setFailed] = useState(false)
  return (
    <span className="mk-avatar-icon" style={{ width: s, height: s }} role="img" aria-label={name}>
      <span className="mk-avatar-icon__image" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        {src && !failed ? (
          <img src={asset(src)} alt="" draggable={false} onError={() => setFailed(true)} />
        ) : (
          <span className="mk-avatar-icon__initials">{name.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      <Icon name={icon} size={c} color={iconColor ?? 'var(--dt_color_content_primary)'} className="mk-avatar-icon__icon" style={{ position: 'absolute', left: s - c + g, top: s - c + g }} />
    </span>
  )
}

/** A member avatar at the preview's 36 pt, with presence in the list theme's colors (ListThemeOptions.ia4Phone). */
export function MKMemberOrnament({ src, name, presence }: { src?: string; name: string; presence?: 'active' | 'away' | 'dnd-active' | 'dnd-away' }) {
  return <SKMemberAvatar src={src} name={name} size="large" presence={presence ?? 'none'} activeColor="var(--theme_presenceActive)" awayColor="var(--dt_color_content_tertiary)" />
}

// ---------------------------------------------------------------------------------------------------------- reactions

const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
/** Text width in points (Lato, as loaded), for layouts UIKit computes up front (reacji bar, tab widths). */
export function textWidth(text: string, font: string): number {
  const ctx = measureCanvas?.getContext('2d')
  if (!ctx) return text.length * 7
  ctx.font = font
  return ctx.measureText(text).width
}

// SKReacjiPill (DesignerComponents/Reacji Pill/SKReacjiPill.swift:36-55, :212-240): insets 4/8, a 22 pt emoji, 2 pt, the
// count in captionBold 13 with 2 pt side insets → 30 pt tall, 44 + count wide; a text-only pill is 20 + text wide.
const PILL_FONT = '700 13px Lato'
const pillWidth = (label: string, emoji: boolean) => (emoji ? 8 + 22 + 2 : 8) + 2 + textWidth(label, PILL_FONT) + 2 + 8

/**
 * SKReacjiBar collapsed to `rows` rows (DesignerComponents/Reacji Bar/SKReacjiBar.swift:372-582): pills 8 pt apart in
 * both directions; when they don't all fit, pills come off the end until an "N more" pill (`show_number_more`) fits.
 */
export function MKPreviewReactions({
  reactions,
  rows = 2,
  showAddReaction,
  onLongPress,
}: {
  reactions: MKReaction[]
  rows?: number
  /** the trailing add-reaction pill (`svgAddReaction`); previews leave it off */
  showAddReaction?: boolean
  onLongPress?: (name: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = useMemo(() => (width ? reacjiLayout(reactions, width, rows, !!showAddReaction) : { shown: reactions.length, more: 0 }), [reactions, width, rows, showAddReaction])
  return (
    <div className="mk-reacji-bar" ref={ref}>
      {reactions.slice(0, layout.shown).map((r, i) => (
        <MKReacjiPill key={`${r.name}-${i}`} reaction={r} onLongPress={onLongPress} />
      ))}
      {layout.more > 0 && (
        <span className="mk-reacji-pill mk-reacji-pill--text" data-tap>
          <span className="mk-reacji-pill__label">{`${layout.more} more`}</span>
        </span>
      )}
      {showAddReaction && (
        <span className="mk-reacji-pill mk-reacji-pill--add" aria-label="Add Reaction" data-tap>
          <Icon name="add_reaction" size={22} />
        </span>
      )}
    </div>
  )
}

/** SKReacjiBar.pillLayout (:370-580), collapsed: as many pills as fit in `maxRows` rows, then an "N more" pill. */
function reacjiLayout(reactions: MKReaction[], width: number, maxRows: number, addPill: boolean): { shown: number; more: number } {
  const GAP = 8
  const ADD = 8 + 22 + 8
  const ends: number[] = []
  let x = 0
  let row = 0
  let remaining = 0
  for (let i = 0; i < reactions.length; i++) {
    const w = Math.min(width, pillWidth(String(reactions[i].count), true))
    if (x + (x === 0 ? 0 : GAP) + w > width) {
      if (row + 1 === maxRows) {
        remaining = reactions.length - i
        break
      }
      row++
      x = w
    } else x += (x === 0 ? 0 : GAP) + w
    ends.push(x)
  }
  // Pills come off the end until the "more" (and "add") pills fit after the last one.
  const need = () => (remaining > 0 ? GAP + pillWidth(`${remaining} more`, false) + (addPill ? GAP + ADD : 0) : 0)
  while (remaining > 0 && need() > width - x && ends.length) {
    ends.pop()
    remaining++
    x = ends.length ? ends[ends.length - 1] : 0
  }
  // Everything fit, but the add pill doesn't: two more come off for "N more" + add (:540-551).
  if (addPill && remaining === 0 && x + GAP + ADD > width && row + 1 === maxRows && ends.length >= 2) {
    ends.splice(-2)
    remaining = 2
  }
  return { shown: ends.length, more: remaining }
}

function MKReacjiPill({ reaction, onLongPress }: { reaction: MKReaction; onLongPress?: (name: string) => void }) {
  const lp = useLongPress(() => onLongPress?.(reaction.name), 250)
  return (
    <span className={`mk-reacji-pill${reaction.selected ? ' is-selected' : ''}`} data-tap {...(onLongPress ? lp : {})} onClick={(e) => e.stopPropagation()}>
      <Emoji name={reaction.name} size={22} className="mk-reacji-pill__emoji" />
      <span className="mk-reacji-pill__label">{reaction.count}</span>
    </span>
  )
}

/** Message reactions as the preview's pills, in the message's order (ReactionsMapper). */
export function mkReactions(reactions: Reaction[] | undefined, me: string): MKReaction[] {
  return (reactions ?? []).filter((r) => r.users.length > 0).map((r) => ({ name: r.name, count: r.users.length, selected: r.users.includes(me) }))
}

// -------------------------------------------------------------------------------------------------------- attachments

type FileKind = 'image' | 'video' | 'file'
const fileKind = (f: FileAttachment): FileKind => (f.mimetype.startsWith('image/') ? 'image' : f.mimetype.startsWith('video/') ? 'video' : 'file')

/** SKIconManifest.icon(for: fileType) (Modules/Data/Icon/Implementation/SKIconManifest+FileType.swift:48-128) */
export function fileTypeIcon(f: FileAttachment): string {
  const t = (f.filetype ?? f.name.split('.').pop() ?? '').toLowerCase()
  if (/^(jpe?g|png|gif|tiff|bmp|heic|webp)$/.test(t) || f.mimetype.startsWith('image/')) return 'image_filled'
  if (/^(mov|mp4|mpv|3gp)$/.test(t) || f.mimetype.startsWith('video/')) return 'video_filled'
  if (t === 'pdf') return 'pdf_file_filled'
  if (t === 'gsheet') return 'spreadsheet'
  if (t === 'gdoc') return 'document'
  if (t === 'gpres') return 'presentation'
  if (t === 'doc' || t === 'docx') return 'brand_microsoft_word_filled'
  if (t === 'xls' || t === 'xlsx' || t === 'csv') return 'brand_microsoft_excel_filled'
  if (t === 'ppt' || t === 'pptx') return 'brand_microsoft_ppt_filled'
  if (t === 'canvas' || t === 'quip') return 'canvas_content_filled'
  if (t === 'list') return 'lists_filled'
  if (t === 'html' || t === 'js') return 'code'
  if (t === 'text' || t === 'txt') return 'text'
  return 'file_filled'
}

/** UIColor.primaryColor(for: fileType) (SlackKitExtensions/UIColor+FileTypeExtensions.swift:15-127): palette _50. */
export function fileTypeColor(f: FileAttachment): string {
  const t = (f.filetype ?? '').toLowerCase()
  if (/^(mov|mp4|gsheet|xls|xlsx|csv|apk)$/.test(t) || f.mimetype.startsWith('video/')) return 'var(--dt_color_palettes_mojito_50)'
  if (/^(pdf|css|indesign)$/.test(t)) return 'var(--dt_color_palettes_flamingo_50)'
  if (/^(html|ppt|pptx|swf|js|sql)$/.test(t)) return 'var(--dt_color_palettes_tomato_50)'
  if (/^(gpres|ai)$/.test(t)) return 'var(--dt_color_palettes_tangerine_50)'
  if (t === 'canvas' || t === 'quip') return 'var(--dt_color_palettes_lagoon_50)'
  if (t === 'list') return 'var(--dt_color_palettes_honeycomb_50)'
  if (t === 'gform') return 'var(--dt_color_palettes_aubergine_50)'
  if (/^(binary|ipa|numbers|markdown)$/.test(t)) return 'var(--dt_color_palettes_gray_50)'
  return 'var(--dt_color_palettes_ocean_50)'
}

/** UIColor.color(for: fileType) (SlackKitFoundations/Colors/UIColor+Extensions.swift:19-122 [Sept], unchanged since June but
 *  for lint comments; it still uses the legacy sk_* palette): a thumbnail's file glyph. */
export function fileTypeGlyphColor(f: FileAttachment): string {
  const t = (f.filetype ?? f.name.split('.').pop() ?? '').toLowerCase()
  if (t === 'doc' || t === 'docx') return 'var(--sk_indigo)'
  if (/^(csv|xls|xlsx|xlsm|gsheet|apk)$/.test(t)) return 'var(--sk_lilypad_green)'
  if (t === 'ppt' || t === 'pptx') return 'var(--sk_just_orange)'
  if (/^(pdf|indesign|flash|swf|gform|gdraw)$/.test(t)) return 'var(--sk_raspberry_red)'
  if (t === 'ai' || t === 'sketch') return 'var(--sk_reddish_orange)'
  if (t === 'gpres') return 'var(--sk_sunshine_yellow)'
  if (/^(key|numbers|pages|rtf|text|txt|sql)$/.test(t) || !t) return 'var(--dt_color_content_secondary)'
  return 'var(--sk_highlight_accent)'
}

const THUMB = 64
const THUMB_GAP = 8

/**
 * SKAttachmentBar with the preview styling (`.mixed()`, statically sized thumbnails, no known image size;
 * DesignerComponents/AttachmentBar/SKAttachmentBar.swift): a single image expands to the column's width at 5/8 of it
 * (SKExpandedAttachment, radius 15); a single file is an SKCompactAttachment card; several files are 64 pt
 * SKThumbnailAttachments 8 pt apart in one row, the last replaced by a "+N" tile when they don't fit.
 */
export function MKPreviewFiles({ files }: { files: FileAttachment[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (files.length === 1) {
    const f = files[0]
    return (
      <div ref={ref} className="mk-files-single">
        {fileKind(f) === 'file' ? <MKCompactFile file={f} /> : <MKExpandedImage file={f} />}
      </div>
    )
  }
  const fit = width ? Math.max(1, Math.floor((width + THUMB_GAP) / (THUMB + THUMB_GAP))) : 4
  const overflow = files.length > fit
  const shown = overflow ? files.slice(0, fit - 1) : files
  return (
    <div className="mk-thumbs" ref={ref}>
      {shown.map((f) => (
        <MKThumbnail key={f.id} file={f} />
      ))}
      {overflow && (
        <span className="mk-thumb mk-thumb--overflow" aria-label={`There are ${files.length - shown.length} more attachments.`}>
          +{files.length - shown.length}
        </span>
      )}
    </div>
  )
}

/** SKThumbnailAttachment .small (64 pt; DesignerComponents/ThumbnailAttachment/SKThumbnailAttachment.swift:72-106). */
function MKThumbnail({ file }: { file: FileAttachment }) {
  const kind = fileKind(file)
  return (
    <span className={`mk-thumb mk-thumb--${kind}`}>
      {kind !== 'file' ? <img src={asset(file.url)} alt="" draggable={false} /> : <Icon name={fileTypeIcon(file)} size={36} color={fileTypeGlyphColor(file)} />}
      {kind === 'video' && (
        // VideoDurationBadge .small: a 12 pt play icon and the duration in captionBold 13 ("8m")
        <span className="mk-video-badge">
          <Icon name="play_filled" size={12} />
          {file.duration !== undefined && <span className="mk-video-badge__label">{videoDuration(file.duration)}</span>}
        </span>
      )}
    </span>
  )
}

/** DateComponentsFormatter, abbreviated units (VideoDurationBadge.swift:179-202): "8m", "1h 2m", "45s". */
function videoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  return [h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ') || '0s'
}

/** SKExpandedAttachment (DesignerComponents/ExpandedAttachment/SKExpandedAttachment.swift:69-86): 5/8 of the width tall. */
function MKExpandedImage({ file }: { file: FileAttachment }) {
  return (
    <span className="mk-expanded">
      <img src={asset(file.url)} alt={file.title} draggable={false} />
    </span>
  )
}

/** SKCompactAttachment (DesignerComponents/CompactAttachment/SKCompactAttachment.swift:71-84, :578-633). */
function MKCompactFile({ file }: { file: FileAttachment }) {
  return (
    <span className="mk-compact">
      <span className="mk-compact__tile" style={{ background: fileTypeColor(file) }}>
        <Icon name={fileTypeIcon(file)} size={20} color="var(--dt_color_content_inverse_primary)" />
      </span>
      <span className="mk-compact__text">
        <span className="mk-compact__title">{file.title || file.name}</span>
        <span className="mk-compact__subtitle">{fileSubtitle(file)}</span>
      </span>
    </span>
  )
}

/** The compact card's subtitle: the pretty type, or the size ("64Mb" in the fixture). */
function fileSubtitle(f: FileAttachment): string {
  if (f.prettyType && f.prettyType.toUpperCase() !== f.prettyType) return f.prettyType
  if (f.size) {
    const kb = f.size / 1024
    return kb >= 1024 ? `${(kb / 1024).toFixed(kb >= 10240 ? 0 : 1)} MB` : `${Math.round(kb)} KB`
  }
  return f.prettyType ?? ''
}

/**
 * MKMessageUnfurlContent in a preview: SKPipeDecorator (a 4 pt pipe, radius 2, outline_tertiary or the attachment's
 * color; the content inset 4 / 12 / 4, SKPipeDecorator.swift:11-14) around MKUnfurlView's stack, 4 pt apart
 * (MKUnfurlView.swift:21): the service or author header (16 pt icon + bodyBold, 1 line), the title (bodyBold), the text
 * in the preview's body font and color folded to 2 lines (UnfurlMapper.swift:29-30, :886-889), the footer (caption).
 */
export function MKPreviewUnfurl({ unfurl }: { unfurl: MessageAttachment }) {
  const header = unfurl.serviceName ?? unfurl.authorName
  const headerIcon = unfurl.serviceName ? unfurl.serviceIcon : unfurl.authorIcon
  return (
    <div className="mk-unfurl">
      <i className="mk-unfurl__pipe" style={unfurl.color ? { background: unfurl.color } : undefined} />
      <div className="mk-unfurl__content">
        {header && (
          <div className="mk-unfurl__header">
            {headerIcon && <img className="mk-unfurl__header-icon" src={asset(headerIcon)} alt="" draggable={false} />}
            <span className="mk-unfurl__header-text mk-label">{header}</span>
          </div>
        )}
        {unfurl.title && <div className="mk-unfurl__title mk-label">{unfurl.title}</div>}
        {unfurl.text && (
          <div className="mk-unfurl__text mk-label">
            <InlineText text={unfurl.text} />
          </div>
        )}
        {unfurl.footer && <div className="mk-unfurl__footer mk-label">{unfurl.footer}</div>}
      </div>
    </div>
  )
}

/**
 * What a message contributes to its preview (DefaultTransformationPath.swift:325-617): the text summarized into one
 * paragraph (blocks joined by a space), its files, and its unfurls only when there's no other content (:501).
 */
export function mkPreviewContent(msg: Pick<Message, 'text' | 'files' | 'attachments'>): { body?: string; files?: FileAttachment[]; unfurls?: MessageAttachment[] } {
  const body = msg.text?.trim() ? msg.text : undefined
  const files = msg.files?.length ? msg.files : undefined
  const unfurls = !body && !files && msg.attachments?.length ? msg.attachments : undefined
  return { body, files, unfurls }
}

// --------------------------------------------------------------------------------------------------------- timestamps
// TimestampMapper (MessageKitTransformation/Implementation/Mappers/TimestampMapper.swift:23-77) → TimeUtility
// (Modules/Data/I18n/Implementation/TimeUtility.swift), en-US, 12-hour. Spec dms-activity.md §0.5.

export type MKTimestampStyle = 'relative' | 'timeOnly' | 'longPrefix' | 'absolute' | 'threadReply'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds())

/** timeFormatter "h:mm a" with a no-break space before AM/PM (TimeUtility.swift:208-211): "9:41 AM". */
export function mkTime(d: Date): string {
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "Jun 4th" (prefixDateFormatter "MMM d" + suffix), ", 2024" in other years (shortOrdinalDisplayString, :723-789). */
export function mkShortOrdinal(d: Date, now = new Date(), { shortMonth = true, excludeYear = false } = {}): string {
  const month = shortMonth ? MONTHS[d.getMonth()].slice(0, 3) : MONTHS[d.getMonth()]
  let s = `${month} ${ordinal(d.getDate())}`
  if (!excludeYear && d.getFullYear() !== now.getFullYear()) s += `, ${d.getFullYear()}`
  return s
}

/** A message timestamp in one of MessageKit's styles. `ts` is a Slack ts (seconds) or a Date. */
export function mkTimestamp(ts: string | number | Date, style: MKTimestampStyle = 'relative', nowArg: Date | number = Date.now()): string {
  const d = ts instanceof Date ? ts : new Date(parseFloat(String(ts)) * 1000)
  const now = nowArg instanceof Date ? nowArg : new Date(nowArg)
  if (Number.isNaN(d.getTime())) return ''
  switch (style) {
    case 'timeOnly':
      return mkTime(d)
    case 'longPrefix':
      // longPrefixDateFormatter "MMMM d" (:111)
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`
    case 'absolute': {
      // shortOrdinalDisplayString(includeTime: true): "Today at 9:41 AM", "Yesterday at 9:41 AM", "Jun 4th at 9:41 AM"
      if (sameDay(d, now)) return `Today at ${mkTime(d)}`
      if (sameDay(d, addDays(now, -1))) return `Yesterday at ${mkTime(d)}`
      return `${mkShortOrdinal(d, now)} at ${mkTime(d)}`
    }
    case 'threadReply': {
      // threadReplyTimestamp (:470-505)
      const secs = (now.getTime() - d.getTime()) / 1000
      if (secs < 60) return 'Just now'
      if (secs < 3600) {
        const m = Math.floor(secs / 60)
        return m === 1 ? '1 min' : `${m} mins`
      }
      if (sameDay(d, now) || secs < 8 * 3600) return mkTime(d)
      if (sameDay(d, addDays(now, -1))) return `Yesterday at ${mkTime(d)}`
      if (secs < 7 * 86400) return `${WEEKDAYS[d.getDay()]} at ${mkTime(d)}`
      return `${mkShortOrdinal(d, now, { shortMonth: false })} at ${mkTime(d)}`
    }
    case 'relative':
    default: {
      // relativeFromTodayString(verbosity: .simple) (:556-620)
      const yesterday = sameDay(d, addDays(now, -1))
      if (!yesterday && !sameDay(d, now)) return mkShortOrdinal(d, now)
      if (yesterday) return '1d ago'
      const secs = Math.floor((now.getTime() - d.getTime()) / 1000)
      const hour = Math.floor(secs / 3600)
      const minute = Math.floor((secs % 3600) / 60)
      const second = secs % 60
      if (hour > 1) return `${hour}h ago`
      if (hour === 1) return '1h ago'
      if (minute > 1) return `${minute}m ago`
      if (minute === 1) return '1m ago'
      if (second > 1) return '1m ago'
      return 'now'
    }
  }
}
