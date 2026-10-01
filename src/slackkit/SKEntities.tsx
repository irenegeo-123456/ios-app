import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { useLongPress } from '../app/gestures'
import { asset } from '../lib/asset'
import { SKBadge } from './SKBadge'
import { SKButton } from './SKButton'
import { SKColorSwatch } from './SKColorSwatch'
import { SKEmoji } from './SKEmoji'
import { SKGroupAvatar } from './SKGroupAvatar'
import { renderAccessory, type SKListCellAccessory } from './SKListCellAccessory'
import { SKMemberAvatar, type Presence, type SKMemberAvatarType } from './SKMemberAvatar'
import { SKOrnamentBox, type SKOrnament } from './SKOrnamentBox'
import { SKWorkspaceAvatar, type SKWorkspaceType } from './SKWorkspaceAvatar'
import { cx, haptic } from './util'
import './entities.css'

// SlackKit's list rows (DesignerComponents/Entities, Helpers/EntityViews). One anatomy, SKEntityBaseView: margins 10 /
// 16 (+48 when indented with a message), an ornament, 12 pt (16 extraLarge), the content, 12 pt, the accessories (8 pt
// apart); rows as tall as the tallest of the three plus 20 (SKEntityBaseView.swift:56-66, :236-277, :386-394).
// Content (SKEntityContentView / SKEntityPrimaryContentView): the title (SKFont.body; bodyBold for people, channels,
// group DMs and workspaces; bodyBlack extraLarge) in contentPrimary, then 8 pt apart a trailing text (body,
// contentSecondary), an adjacent tag, an inline icon, emoji or badge, and a workspace (20 pt avatar + name); below it
// the secondary text (caption; smallBody extraLarge) in contentSecondary; an accessory text (body) at the right, at most
// half the width. Disabled: texts contentTertiary, ornaments and inline items alpha 0.6. Pressed
// (SKEntityBackgroundView.swift:18-122, SKListCollectionViewCell.swift:214-240): a highlight 4 pt in from the sides,
// radius 12 (or concentric, or full bleed), and the row shrinks by 8 pt with the bounce timing — not when swipeable.
// Swipe actions (SKSwipeableContentDecorator.swift): drag to reveal an action; past 40 % of the width it triggers.
// Spec: slackkit-components.md › Entity row anatomy … SKHeaderEntity, SKList row cell, SKList swipe actions.
//
//   <SKGenericEntity primaryText="Notifications" secondaryText="Mentions only" ornament={{ icon: { icon: 'notifications' } }}
//     size="medium" accessories={['chevron']} onSelected={open} />
//   <SKMemberEntity name="Lisa Dawson" displayName="lisa" avatar={src} presence="active" size="medium" />
//   <SKChannelEntity name="announcements" channelType="private" secondaryText="Company news" size="medium" />
//   <SKHeaderEntity primaryText="2,910 People" rightButton={{ text: 'See All' }} shouldShowCollapseIndicator />

/** SKEntityOrnament (Helpers/EntityViews/Models/SKEntityOrnament.swift:11-21) */
export type SKEntityOrnament =
  | { memberAvatar: { src?: string; icon?: string; name: string; presence?: Presence; avatarType?: SKMemberAvatarType; isDeactivated?: boolean; fallbackBackgroundColor?: string } }
  | { workspaceAvatar: { src?: string; name: string; initials?: string; workspaceType?: SKWorkspaceType; variant?: 'default' | 'govSlack' } }
  | { groupAvatar: { count: number; primarySrc?: string; secondarySrc?: string; primaryName?: string; secondaryName?: string } }
  | { icon: SKOrnament; backgroundColor?: string; border?: 'none' | 'rainbow' | { color: string }; iconAlpha?: number }
  | { image: string }
  | { emoji: string }
  | { colorSwatch: string | null }
  | 'placeholder'
  | 'none'

/** SKEntityOrnamentView.Size (:361-470) */
export type SKEntityOrnamentSize = 'verySmall' | 'small' | 'large' | 'extraLarge'
const ORNAMENT_SIDE = { verySmall: 16, small: 24, large: 36, extraLarge: 56 } as const
const IMAGE_RADIUS = { verySmall: 4, small: 4, large: 6, extraLarge: 8 } as const

/** Renders an SKEntityOrnament at an entity size (SKEntityOrnamentView.configure :60-160). */
export function EntityOrnament({ ornament, size, isEnabled = true }: { ornament: SKEntityOrnament | ReactNode; size: SKEntityOrnamentSize; isEnabled?: boolean }) {
  const side = ORNAMENT_SIDE[size]
  let node: ReactNode
  if (ornament === 'none' || ornament == null) return null
  if (ornament === 'placeholder') node = <SKOrnamentBox ornament={{ placeholder: true }} size={size} backgroundColor="var(--dt_color_base_tertiary)" />
  else if (typeof ornament !== 'object' || !isEntityOrnament(ornament)) node = ornament as ReactNode
  else if ('memberAvatar' in ornament) {
    const m = ornament.memberAvatar
    node = (
      <SKMemberAvatar
        src={m.src}
        icon={m.icon}
        name={m.name}
        size={size}
        presence={m.presence}
        avatarType={m.avatarType}
        isDeactivated={m.isDeactivated}
        fallbackBackgroundColor={m.fallbackBackgroundColor}
      />
    )
  } else if ('workspaceAvatar' in ornament) {
    const w = ornament.workspaceAvatar
    node = <SKWorkspaceAvatar src={w.src} name={w.name} initials={w.initials} size={size} workspaceType={w.workspaceType} workspaceVariant={w.variant} />
  } else if ('groupAvatar' in ornament) {
    const g = ornament.groupAvatar
    node = <SKGroupAvatar count={g.count} size={size === 'large' ? 'large' : size} primarySrc={g.primarySrc} secondarySrc={g.secondarySrc} primaryName={g.primaryName} secondaryName={g.secondaryName} />
  } else if ('icon' in ornament) node = <SKOrnamentBox ornament={ornament.icon} size={size} backgroundColor={ornament.backgroundColor} border={ornament.border} iconAlpha={ornament.iconAlpha} />
  else if ('image' in ornament)
    node = <img className="sk-entity__image" src={asset(ornament.image)} alt="" draggable={false} style={{ width: side, height: side, borderRadius: IMAGE_RADIUS[size] }} />
  else if ('emoji' in ornament) node = <SKEmoji name={ornament.emoji} size={side} />
  else node = <SKColorSwatch color={ornament.colorSwatch} size={side} />
  return <span className={cx('sk-entity__ornament', !isEnabled && 'is-disabled')}>{node}</span>
}

const ORNAMENT_KEYS = ['memberAvatar', 'workspaceAvatar', 'groupAvatar', 'icon', 'image', 'emoji', 'colorSwatch']
function isEntityOrnament(o: object): o is Exclude<SKEntityOrnament, string> {
  return !('$$typeof' in o) && ORNAMENT_KEYS.some((k) => k in o)
}

/** SKGenericEntity.AdjacentText: the tag after the title. Strings: R.strings.app_badge … skill, skill_set (:494-545). */
export type SKAdjacentText = { text: 'APP' | 'TEMPLATE' | 'AI APP' | 'AGENTFORCE' | 'AGENT' | 'Skill' | 'Skill set' | (string & {}); textColor: string; backgroundColor: string }

/**
 * The skill and (September 2026) skill-set presets (GenericEntity/SKGenericEntity+Extensions.swift:21-70): an ornament
 * box with ai_skills in aubergine 70 on aubergine 10, or book in indigo 60 on indigo 10, and the matching "Skill" /
 * "Skill set" adjacent tags. A file that is a skill set gets the book ornament (:21-29).
 */
export const SK_SKILL_ORNAMENT: SKEntityOrnament = { icon: { icon: 'ai_skills', color: 'var(--dt_color_palettes_aubergine_70)' }, backgroundColor: 'var(--dt_color_palettes_aubergine_10)' }
export const SK_SKILL_SET_ORNAMENT: SKEntityOrnament = { icon: { icon: 'book', color: 'var(--dt_color_palettes_indigo_60)' }, backgroundColor: 'var(--dt_color_palettes_indigo_10)' }
export const SK_SKILL_ADJACENT_TEXT: SKAdjacentText = { text: 'Skill', textColor: 'var(--dt_color_palettes_aubergine_70)', backgroundColor: 'var(--dt_color_palettes_aubergine_10)' }
export const SK_SKILL_SET_ADJACENT_TEXT: SKAdjacentText = { text: 'Skill set', textColor: 'var(--dt_color_palettes_indigo_60)', backgroundColor: 'var(--dt_color_palettes_indigo_10)' }

/** SKSwipeAction (CoreComponents/List/SwipeableContentDecorator/SKSwipeActions.swift:37-69) */
export interface SKSwipeAction {
  id: string
  icon: string
  /** shown once past the threshold */
  activeIcon?: string
  label: string
  backgroundColor: string
  foregroundColor: string
  /** bounceBack (default) or slideAwayAndDelete */
  dismissalStyle?: 'bounceBack' | 'slideAwayAndDelete'
  onTriggered?: () => void
}

export interface SKEntityProps {
  primaryText: ReactNode
  /** 1 by default; 0 = unlimited */
  primaryTextNumberOfLines?: number
  shouldBoldPrimaryText?: boolean
  /** SKEntityPrimaryContentView.secondaryText: after the title, body contentSecondary, 1 line (a display name) */
  trailingText?: ReactNode
  adjacentText?: SKAdjacentText
  inlineIcon?: { icon: string; color?: string }
  inlineEmoji?: string
  inlineBadge?: Parameters<typeof SKBadge>[0]
  workspace?: { image?: string; title?: string }
  secondaryText?: ReactNode
  /** 0 = unlimited (default) */
  secondaryTextNumberOfLines?: number
  accessoryText?: ReactNode
  accessoryTextNumberOfLines?: number
  ornament?: SKEntityOrnament | ReactNode
  accessories?: SKListCellAccessory[]
  /** accessorySpacing: standard 8, small 0 */
  accessorySpacing?: 'standard' | 'small'
  size?: 'small' | 'medium' | 'extraLarge'
  isEnabled?: boolean
  /** the ornament's own enabled state (default isEnabled): a deactivated member dims the texts but not the avatar
   *  (SKMemberEntity.swift:96-101 vs :148) */
  isOrnamentEnabled?: boolean
  isIndentedWithMessage?: boolean
  shouldInsetHorizontalEdges?: boolean
  shouldCenterContent?: boolean
  alignment?: 'center' | 'top'
  highlightCornerStyle?: 'rounded' | 'concentric' | 'none'
  /** default primary.basePrimary (the list's cell background) */
  backgroundColor?: string
  /** default the SKList highlight, primary.baseTertiary (a bare SKGenericEntity uses primary.baseSecondary) */
  highlightBackgroundColor?: string
  /** focusState .focused: the highlight3.surface highlight (September 2026; June sk_pale_yellow) */
  isFocused?: boolean
  /** a button 15 pt below the row (footerButton) */
  footerButton?: Parameters<typeof SKButton>[0]
  swipeActions?: { left?: SKSwipeAction; right?: SKSwipeAction }
  onSelected?: () => void
  onLongPress?: (el: HTMLElement) => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

const clampLines = (n: number | undefined): CSSProperties | undefined =>
  n === 1 || n === undefined ? undefined : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: n === 0 ? 'unset' : n, whiteSpace: 'normal' }

/** SKGenericEntity (DesignerComponents/Entities/GenericEntity/SKGenericEntity.swift) and the base every entity shares. */
export function SKGenericEntity(props: SKEntityProps) {
  const {
    primaryText,
    primaryTextNumberOfLines = 1,
    shouldBoldPrimaryText = false,
    trailingText,
    adjacentText,
    inlineIcon,
    inlineEmoji,
    inlineBadge,
    workspace,
    secondaryText,
    secondaryTextNumberOfLines = 0,
    accessoryText,
    accessoryTextNumberOfLines = 1,
    ornament,
    accessories = [],
    accessorySpacing = 'standard',
    size = 'small',
    isEnabled = true,
    isOrnamentEnabled,
    isIndentedWithMessage = false,
    shouldInsetHorizontalEdges = true,
    shouldCenterContent = false,
    alignment = 'center',
    highlightCornerStyle = 'rounded',
    backgroundColor = 'var(--dt_color_base_primary)',
    highlightBackgroundColor = 'var(--dt_color_base_tertiary)',
    isFocused = false,
    footerButton,
    swipeActions,
    onSelected,
    onLongPress,
    accessibilityLabel,
    className,
    style,
  } = props
  const xl = size === 'extraLarge'
  const ornamentSize: SKEntityOrnamentSize = size === 'small' ? 'small' : size === 'medium' ? 'large' : 'extraLarge'
  const lp = useLongPress((el) => onLongPress?.(el))
  const root = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    // the concentric highlight's radius is height / 2 − 8
    const el = root.current
    if (!el || highlightCornerStyle !== 'concentric') return
    const ro = new ResizeObserver(([e]) => setHeight(e!.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [highlightCornerStyle])
  const swipe = useSwipe(swipeActions, root)
  const padding = shouldInsetHorizontalEdges ? `10px 16px 10px ${16 + (isIndentedWithMessage ? 48 : 0)}px` : '10px 0'
  const texts = (
    <span className={cx('sk-entity__texts', shouldCenterContent && 'is-centered')}>
      <span className="sk-entity__primary">
        <span className={cx('sk-entity__title', xl ? 'is-black' : shouldBoldPrimaryText && 'is-bold')} style={clampLines(primaryTextNumberOfLines)}>
          {primaryText}
        </span>
        {trailingText != null && trailingText !== '' && <span className="sk-entity__trailing">{trailingText}</span>}
        {adjacentText && (
          <span className="sk-entity__adjacent sk-entity__inline" style={{ color: adjacentText.textColor, background: adjacentText.backgroundColor }}>
            {adjacentText.text}
          </span>
        )}
        {inlineIcon && <Icon name={inlineIcon.icon} size={20} color={inlineIcon.color ?? 'var(--dt_color_content_primary)'} className="sk-entity__inline-icon sk-entity__inline" />}
        {inlineEmoji && <SKEmoji name={inlineEmoji} size={20} className="sk-entity__inline" />}
        {inlineBadge && <SKBadge {...inlineBadge} className={cx('sk-entity__inline', inlineBadge.className)} />}
        {workspace?.image && <SKWorkspaceAvatar src={workspace.image} name={workspace.title ?? ''} size="verySmall" className="sk-entity__inline" />}
        {workspace?.title && <span className="sk-entity__workspace">{workspace.title}</span>}
      </span>
      {secondaryText != null && secondaryText !== '' && (
        <span className={cx('sk-entity__secondary', xl && 'is-large')} style={clampLines(secondaryTextNumberOfLines)}>
          {secondaryText}
        </span>
      )}
    </span>
  )
  const interactive = !!onSelected && isEnabled
  const bounce = interactive && !swipeActions
  return (
    <div
      ref={root}
      className={cx('sk-entity', `sk-entity--${size}`, !isEnabled && 'is-disabled', isFocused && 'is-focused', bounce && 'has-bounce', swipe.active && 'is-swiping', className)}
      style={
        {
          '--entity-bg': backgroundColor,
          '--entity-highlight': highlightBackgroundColor,
          ...style,
        } as CSSProperties
      }
      role={interactive ? 'button' : undefined}
      aria-disabled={!isEnabled || undefined}
      aria-label={accessibilityLabel}
      data-tap={interactive ? '' : undefined}
      onClick={(e) => {
        if (swipe.consumeClick()) return e.preventDefault()
        if (interactive) onSelected?.()
      }}
      {...(onLongPress ? lp : {})}
      {...swipe.handlers}
    >
      {swipe.backdrop}
      <div className="sk-entity__body" style={swipe.bodyStyle} onTransitionEnd={(e) => e.propertyName === 'transform' && e.target === e.currentTarget && swipe.onSettled()}>
        <div
          className="sk-entity__highlight"
          style={
            highlightCornerStyle === 'none'
              ? { inset: 0, borderRadius: 0 }
              : highlightCornerStyle === 'concentric'
                ? { inset: '0 8px', borderRadius: Math.max(0, height / 2 - 8) }
                : undefined
          }
        />
        <div className="sk-entity__row" style={{ padding, gap: xl ? 16 : 12, alignItems: alignment === 'top' ? 'flex-start' : 'center' }}>
          {ornament !== undefined && ornament !== 'none' && <EntityOrnament ornament={ornament} size={ornamentSize} isEnabled={isOrnamentEnabled ?? isEnabled} />}
          <span className="sk-entity__content" style={{ gap: xl ? 16 : 8 }}>
            {texts}
            {accessoryText != null && accessoryText !== '' && (
              <span className="sk-entity__accessory-text" style={clampLines(accessoryTextNumberOfLines)}>
                {accessoryText}
              </span>
            )}
          </span>
          {accessories.length > 0 && (
            <span className="sk-accessories" style={{ gap: accessorySpacing === 'small' ? 0 : 8 }}>
              {accessories.map((a, i) => renderAccessory(a, i))}
            </span>
          )}
        </div>
        {footerButton && (
          <div className="sk-entity__footer" style={{ padding: `0 16px 10px ${16 + (isIndentedWithMessage ? 48 : 0)}px` }}>
            <SKButton {...footerButton} />
          </div>
        )}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------------------------- swipe actions

const THRESHOLD = 0.4 // goldenRatio (SKSwipeToActionGestureRecognizer.swift:24)
const PROJECTION = 0.05 // projectionTimeScale
// swipes that begin this close to either edge are left to navigation's edge swipes, judged by where the finger first
// landed (edgeSwipeExclusionWidth, September 2026: SKSwipeableContentDecorator.swift:18, :521-527)
const EDGE_EXCLUSION = 25

function useSwipe(actions: SKEntityProps['swipeActions'], root: React.RefObject<HTMLDivElement | null>) {
  const [offset, setOffset] = useState(0)
  const [settling, setSettling] = useState(false)
  const [open, setOpen] = useState<'closed' | 'left' | 'right'>('closed')
  const [past, setPast] = useState(false)
  // the revealed side stays until the content has settled back (updateButtonVisibility in the animation's completion)
  const [shown, setShown] = useState<'left' | 'right' | null>(null)
  const drag = useRef<{ x: number; y: number; start: number; axis?: 'x' | 'y'; t: number; vx: number; lastX: number; moved: boolean } | null>(null)
  const clickBlock = useRef(false)
  const buttons = useRef<{ left: HTMLSpanElement | null; right: HTMLSpanElement | null }>({ left: null, right: null })
  const left = actions?.left
  const right = actions?.right
  const width = () => root.current?.clientWidth ?? 393
  const buttonWidth = (side: 'left' | 'right') => buttons.current[side]?.offsetWidth ?? 0
  const rubber = (t: number) => {
    const th = width() * THRESHOLD
    const over = Math.abs(t) - th
    return over > 0 ? (th + Math.sqrt(over) * 2) * Math.sign(t) : t
  }
  const handlers = actions
    ? {
        onPointerDown: (e: ReactPointerEvent) => {
          // in the row's own points (the device frame may be scaled)
          const r = root.current?.getBoundingClientRect()
          const startX = r && r.width ? ((e.clientX - r.left) / r.width) * width() : EDGE_EXCLUSION
          if (startX < EDGE_EXCLUSION || startX > width() - EDGE_EXCLUSION) {
            drag.current = null
            return
          }
          drag.current = { x: e.clientX, y: e.clientY, start: offset, t: e.timeStamp, vx: 0, lastX: e.clientX, moved: false }
        },
        onPointerMove: (e: ReactPointerEvent) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (!d.axis) {
            if (Math.hypot(dx, dy) < 6) return
            d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
            if (d.axis === 'x') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          }
          if (d.axis !== 'x') return
          d.moved = true
          const dt = Math.max(1, e.timeStamp - d.t)
          d.vx = ((e.clientX - d.lastX) / dt) * 1000
          d.lastX = e.clientX
          d.t = e.timeStamp
          let next = rubber(d.start + dx)
          if ((next > 0 && !left) || (next < 0 && !right)) next = 0
          const isPast = Math.abs(d.start + dx) > width() * THRESHOLD && next !== 0
          if (isPast !== past) {
            haptic() // selectionChanged when crossing the threshold
            setPast(isPast)
          }
          setSettling(false)
          setOffset(next)
          if (next !== 0) setShown(next > 0 ? 'left' : 'right')
        },
        onPointerUp: () => {
          const d = drag.current
          drag.current = null
          if (!d || d.axis !== 'x' || !d.moved) return
          clickBlock.current = true
          const translation = offset
          const projected = translation + d.vx * PROJECTION
          const w = width()
          setSettling(true)
          setPast(false)
          // calculateFinalState (:131-196)
          if (translation > w * THRESHOLD && left) {
            left.onTriggered?.()
            setOffset(left.dismissalStyle === 'slideAwayAndDelete' ? w : 0)
            setOpen('closed')
          } else if (-translation > w * THRESHOLD && right) {
            right.onTriggered?.()
            setOffset(right.dismissalStyle === 'slideAwayAndDelete' ? -w : 0)
            setOpen('closed')
          } else if (translation > 0 && left && projected > buttonWidth('left') / 2) {
            setOffset(buttonWidth('left'))
            setOpen('left')
          } else if (translation < 0 && right && -projected > buttonWidth('right') / 2) {
            setOffset(-buttonWidth('right'))
            setOpen('right')
          } else {
            setOffset(0)
            setOpen('closed')
          }
        },
        onPointerCancel: () => {
          drag.current = null
          setSettling(true)
          setOffset(0)
          setOpen('closed')
        },
      }
    : {}
  const side = offset > 0 ? 'left' : offset < 0 ? 'right' : open === 'closed' ? shown : open
  const action = side === 'left' ? left : side === 'right' ? right : undefined
  const backdrop = actions ? (
    <div className="sk-entity__swipe" style={{ background: action?.backgroundColor, visibility: action ? 'visible' : 'hidden' }} aria-hidden={!action}>
      {left && (
        <span
          ref={(el) => {
            buttons.current.left = el
          }}
          className="sk-entity__swipe-button is-left"
          style={{ visibility: side === 'left' ? 'visible' : 'hidden', ...(past && side === 'left' ? { left: 'auto', right: `calc(100% - ${offset}px)` } : null) }}
        >
          <SKButton
            title={left.label}
            buttonStyle="default"
            textColor={left.foregroundColor}
            size="medium"
            icon={past && side === 'left' ? (left.activeIcon ?? left.icon) : left.icon}
            onClick={() => {
              left.onTriggered?.()
              setSettling(true)
              setOffset(0)
              setOpen('closed')
            }}
          />
        </span>
      )}
      {right && (
        <span
          ref={(el) => {
            buttons.current.right = el
          }}
          className="sk-entity__swipe-button is-right"
          style={{ visibility: side === 'right' ? 'visible' : 'hidden', ...(past && side === 'right' ? { right: 'auto', left: `calc(100% + ${offset}px)` } : null) }}
        >
          <SKButton
            title={right.label}
            buttonStyle="default"
            textColor={right.foregroundColor}
            size="medium"
            icon={past && side === 'right' ? (right.activeIcon ?? right.icon) : right.icon}
            onClick={() => {
              right.onTriggered?.()
              setSettling(true)
              setOffset(0)
              setOpen('closed')
            }}
          />
        </span>
      )}
    </div>
  ) : null
  return {
    active: offset !== 0 || open !== 'closed' || shown !== null,
    handlers,
    backdrop,
    bodyStyle: actions ? ({ transform: `translateX(${offset}px)`, transition: settling ? 'transform 0.4s var(--sk-spring-smooth), border-radius 0.4s, box-shadow 0.4s' : 'border-radius 0.4s, box-shadow 0.4s' } as CSSProperties) : undefined,
    onSettled: () => {
      if (offset === 0 && open === 'closed') setShown(null)
    },
    consumeClick: () => {
      const b = clickBlock.current
      clickBlock.current = false
      return b
    },
  }
}

// ------------------------------------------------------------------------------------------ entity variants

type Common = Omit<SKEntityProps, 'primaryText' | 'size' | 'ornament' | 'shouldBoldPrimaryText'> & { size?: 'small' | 'medium' }

/**
 * SKMemberEntity (Entities/MemberEntity/SKMemberEntity.swift): a person. Avatar (small 24 / medium 36) with presence,
 * the bold full name, the display name after it, a status emoji, a workspace; secondary text at medium (3 lines), and
 * since September 2026 also at small with secondaryTextVisibility 'always', then kept to one truncating line
 * (:152-188, :460-468); accessory text 2 lines. Deactivated: a grayscale avatar and tertiary texts.
 * shouldHideMemberAvatars shows the bare presence icon in the avatar's place.
 */
export function SKMemberEntity({
  name,
  displayName,
  avatar,
  avatarIcon,
  presence,
  avatarType,
  statusEmoji,
  isDeactivated = false,
  shouldHideMemberAvatars = false,
  secondaryText,
  secondaryTextNumberOfLines = 3,
  secondaryTextVisibility = 'automatic',
  size = 'small',
  isEnabled = true,
  ...rest
}: Common & {
  name: string
  /** SecondaryTextVisibility (September 2026): 'automatic' shows it at medium only, 'always' at any size */
  secondaryTextVisibility?: 'automatic' | 'always'
  displayName?: string
  avatar?: string
  avatarIcon?: string
  presence?: Presence
  avatarType?: SKMemberAvatarType
  statusEmoji?: string
  isDeactivated?: boolean
  shouldHideMemberAvatars?: boolean
}) {
  const ornament: SKEntityOrnament =
    shouldHideMemberAvatars && presence && presence !== 'none'
      ? { icon: { icon: presenceIcon(presence), color: presence.endsWith('away') ? 'var(--dt_color_content_tertiary)' : 'var(--dt_color_content_highlight_2)' } }
      : { memberAvatar: { src: avatar, icon: avatarIcon, name, presence, avatarType, isDeactivated } }
  return (
    <SKGenericEntity
      {...rest}
      primaryText={name}
      shouldBoldPrimaryText
      trailingText={displayName}
      inlineEmoji={statusEmoji}
      secondaryText={size === 'medium' || secondaryTextVisibility === 'always' ? secondaryText : undefined}
      secondaryTextNumberOfLines={secondaryTextVisibility === 'always' && size === 'small' ? 1 : secondaryTextNumberOfLines}
      accessoryTextNumberOfLines={rest.accessoryTextNumberOfLines ?? 2}
      ornament={ornament}
      size={size}
      isEnabled={isEnabled && !isDeactivated}
      isOrnamentEnabled={isEnabled}
    />
  )
}

function presenceIcon(p: Presence) {
  const base = p.startsWith('ura-') ? 'status_single_channel_guest' : p.startsWith('external-') ? 'status_guest' : p === 'slackbot' ? 'heart_filled' : 'status_member'
  if (p === 'slackbot') return base
  return `${base}${p.includes('dnd') ? '_dnd' : ''}${p.endsWith('active') ? '_filled' : ''}`
}

/**
 * SKChannelEntity (Entities/ChannelEntity/SKChannelEntity.swift:182-372): a channel. A #, lock or archive icon tile
 * (filled with iconStyle filled) in iconColor, the bold name, an org- or externally-shared inline icon, a workspace,
 * secondary text (3 lines). Since September 2026 a code channel's status replaces the icon (statusOrnament :211-235):
 * a small spinner while working, otherwise check_circle, info, minus, pr_open, branch, pr_closed or status_member in
 * contentTertiary; archived keeps the channel icon.
 */
export type SKCodeChannelStatus = 'working' | 'done' | 'waitingForInput' | 'stale' | 'prOpen' | 'prMerged' | 'prClosed' | 'idle' | 'archived'

const CODE_CHANNEL_STATUS_ICON: Record<Exclude<SKCodeChannelStatus, 'working' | 'archived'>, string> = {
  done: 'check_circle',
  waitingForInput: 'info',
  stale: 'minus',
  prOpen: 'pr_open',
  prMerged: 'branch',
  prClosed: 'pr_closed',
  idle: 'status_member',
}

function codeChannelStatusOrnament(status: SKCodeChannelStatus | undefined): SKEntityOrnament | null {
  if (!status || status === 'archived') return null
  if (status === 'working') return { icon: { spinner: { size: 'small', color: 'darkOnLight' } } }
  return { icon: { icon: CODE_CHANNEL_STATUS_ICON[status], color: 'var(--dt_color_content_tertiary)' } }
}

export function SKChannelEntity({
  name,
  channelType = 'public',
  shareType = 'none',
  iconStyle = 'unfilled',
  iconColor = 'var(--dt_color_content_primary)',
  codeChannelStatus,
  secondaryTextNumberOfLines = 3,
  size = 'small',
  ...rest
}: Common & {
  name: ReactNode
  channelType?: 'public' | 'private' | 'archived'
  shareType?: 'none' | 'enterprise' | 'external'
  iconStyle?: 'filled' | 'unfilled'
  iconColor?: string
  /** a code channel's status, shown in place of the icon (September 2026) */
  codeChannelStatus?: SKCodeChannelStatus
}) {
  const filled = iconStyle === 'filled'
  const icon = channelType === 'archived' ? 'archive' : channelType === 'private' ? (filled ? 'lock_filled' : 'lock') : filled ? 'channel_filled' : 'channel'
  const status = codeChannelStatusOrnament(codeChannelStatus)
  return (
    <SKGenericEntity
      {...rest}
      primaryText={name}
      shouldBoldPrimaryText
      inlineIcon={shareType === 'enterprise' ? { icon: 'org_shared_channel' } : shareType === 'external' ? { icon: 'shared_channel' } : rest.inlineIcon}
      secondaryTextNumberOfLines={secondaryTextNumberOfLines}
      ornament={status ?? { icon: { icon, color: iconColor } }}
      size={size}
    />
  )
}

/** SKMultiPersonDirectMessageEntity (Entities/MPDMEntity): a group DM, an SKGroupAvatar and bold names (4 lines). */
export function SKMultiPersonDirectMessageEntity({
  names,
  count,
  primarySrc,
  secondarySrc,
  size = 'small',
  ...rest
}: Common & { names: ReactNode; count: number; primarySrc?: string; secondarySrc?: string }) {
  return (
    <SKGenericEntity
      {...rest}
      primaryText={names}
      primaryTextNumberOfLines={rest.primaryTextNumberOfLines ?? 4}
      shouldBoldPrimaryText
      ornament={{ groupAvatar: { count, primarySrc, secondarySrc } }}
      size={size}
    />
  )
}

/** SKUserGroupEntity (Entities/UserGroupEntity/SKUserGroupEntity.swift:53-56): a user group, user_groups or megaphone. */
export function SKUserGroupEntity({ handle, isBroadcast = false, size = 'small', ...rest }: Common & { handle: ReactNode; isBroadcast?: boolean }) {
  return <SKGenericEntity {...rest} primaryText={handle} ornament={{ icon: { icon: isBroadcast ? 'megaphone' : 'user_groups', color: 'var(--dt_color_content_primary)' } }} size={size} />
}

/** SKWorkspaceEntity (Entities/WorkspaceEntity): a workspace avatar (with its badges) and the bold name. */
export function SKWorkspaceEntity({
  name,
  icon,
  initials,
  workspaceType,
  size = 'small',
  ...rest
}: Omit<Common, 'size'> & { name: string; icon?: string; initials?: string; workspaceType?: SKWorkspaceType; size?: 'small' | 'medium' | 'extraLarge' }) {
  return <SKGenericEntity {...rest} primaryText={name} shouldBoldPrimaryText ornament={{ workspaceAvatar: { src: icon, name, initials, workspaceType } }} size={size} />
}

/** SKAppEntity (Entities/AppEntity): an app or bot, its icon and the name with an adjacent tag. */
export function SKAppEntity({ name, icon, size = 'small', ...rest }: Common & { name: ReactNode; icon?: string }) {
  return <SKGenericEntity {...rest} primaryText={name} ornament={icon ? { image: icon } : { icon: { icon: 'apps' } }} size={size} />
}

// ------------------------------------------------------------------------------------------- SKHeaderEntity

export type SKHeaderEntityOrnament =
  | { image: string }
  | { ornamentBox: SKOrnament; backgroundColor?: string }
  | { workspaceAvatar: { name: string; src?: string } }
  | { memberAvatar: { name: string; src?: string; avatarType?: SKMemberAvatarType; presence?: Presence } }

/**
 * SKHeaderEntity (DesignerComponents/Entities/SKHeaderEntity.swift): a list section header. Margins 12 / 16 (+8 on top
 * with shouldAddSymmetricalFooterPadding, the default); a 20 pt ornament 12 pt before the title; the title
 * (smallBodyBold; contentSecondary small, contentPrimary medium) over the secondary text 4 pt below (micro small,
 * smallBody medium); then a badge, a right text or icon button (4 pt padding; microBold / smallBodyBold in
 * highlight1.content) and the collapse caret (caret_down_full, contentTertiary; rotated −90° when collapsed, or 180°
 * when expanded with the down orientation). Pressed parts fade to 0.4 (:80-87, :455-484, :526-590, :694-795).
 */
export function SKHeaderEntity({
  primaryText,
  secondaryText,
  ornament,
  rightBadge,
  rightButton,
  size = 'medium',
  shouldShowCollapseIndicator = false,
  collapseIndicatorCollapsedOrientation = 'right',
  isCollapsed = false,
  shouldAddSymmetricalFooterPadding = true,
  isHeaderAlwaysTappable = false,
  onHeaderTapped,
  onRightButtonTapped,
  className,
  style,
}: {
  primaryText: ReactNode
  secondaryText?: ReactNode
  ornament?: SKHeaderEntityOrnament
  rightBadge?: Parameters<typeof SKBadge>[0]
  rightButton?: { text: string; numberOfLines?: number } | { icon: string; color?: string; accessibilityLabel?: string }
  size?: 'small' | 'medium'
  shouldShowCollapseIndicator?: boolean
  collapseIndicatorCollapsedOrientation?: 'right' | 'down'
  isCollapsed?: boolean
  shouldAddSymmetricalFooterPadding?: boolean
  isHeaderAlwaysTappable?: boolean
  onHeaderTapped?: () => void
  onRightButtonTapped?: () => void
  className?: string
  style?: CSSProperties
}) {
  const small = size === 'small'
  const tappable = shouldShowCollapseIndicator || isHeaderAlwaysTappable
  let orn: ReactNode = null
  if (ornament) {
    if ('image' in ornament) orn = <img className="sk-header-entity__image" src={asset(ornament.image)} alt="" draggable={false} />
    else if ('ornamentBox' in ornament)
      orn = <SKOrnamentBox ornament={ornament.ornamentBox} size={ornament.backgroundColor ? 'medium' : 'small'} backgroundColor={ornament.backgroundColor} />
    else if ('workspaceAvatar' in ornament) orn = <SKWorkspaceAvatar name={ornament.workspaceAvatar.name} src={ornament.workspaceAvatar.src} size="large" />
    else orn = <SKMemberAvatar name={ornament.memberAvatar.name} src={ornament.memberAvatar.src} avatarType={ornament.memberAvatar.avatarType} presence={ornament.memberAvatar.presence} size="small" />
  }
  const rotate = collapseIndicatorCollapsedOrientation === 'right' ? (isCollapsed ? -90 : 0) : isCollapsed ? 0 : 180
  return (
    <div className={cx('sk-header-entity', `sk-header-entity--${size}`, className)} style={{ paddingTop: shouldAddSymmetricalFooterPadding ? 8 : 0, ...style }} role="heading" aria-level={2}>
      <div className="sk-header-entity__row">
        {orn && <span className="sk-header-entity__ornament">{orn}</span>}
        <span
          className={cx('sk-header-entity__texts', tappable && 'is-tappable')}
          role={tappable ? 'button' : undefined}
          aria-expanded={shouldShowCollapseIndicator ? !isCollapsed : undefined}
          data-tap={tappable ? '' : undefined}
          onClick={tappable ? onHeaderTapped : undefined}
        >
          <span className="sk-header-entity__title" style={{ color: small ? 'var(--dt_color_content_secondary)' : 'var(--dt_color_content_primary)' }}>
            {primaryText}
          </span>
          {secondaryText != null && (
            <span className={cx('sk-header-entity__secondary', small && 'is-small')}>
              {secondaryText}
            </span>
          )}
        </span>
        {rightBadge && <SKBadge {...rightBadge} />}
        {rightButton && (
          <button type="button" className="sk-header-entity__button" data-tap="" onClick={onRightButtonTapped} aria-label={'icon' in rightButton ? rightButton.accessibilityLabel : undefined}>
            {'icon' in rightButton ? (
              <Icon name={rightButton.icon} size={20} color={rightButton.color ?? 'var(--dt_color_content_primary)'} />
            ) : (
              <span className={cx('sk-header-entity__button-text', small && 'is-small')} style={clampLines(rightButton.numberOfLines ?? 1)}>
                {rightButton.text}
              </span>
            )}
          </button>
        )}
        {shouldShowCollapseIndicator && (
          <span className="sk-header-entity__caret" data-tap="" role="button" onClick={onHeaderTapped} aria-label={isCollapsed ? 'Collapsed' : 'Expanded'}>
            <Icon name="caret_down_full" size={20} color="var(--dt_color_content_tertiary)" style={{ transform: `rotate(${rotate}deg)` }} />
          </span>
        )}
      </div>
    </div>
  )
}
