import type { CSSProperties, ReactNode } from 'react'
import { useLongPress } from '../../gestures'
import './entity-row.css'

// The SKEntityBaseView anatomy at both entity sizes (spec slackkit-components.md › Entity row anatomy, SKGenericEntity,
// SKMemberEntity, SKChannelEntity), for the rows of More, You, Search, Files, Huddles and Slackbot's sheets. SlackKit's
// SKEntityRow is the .small row only; this adds .medium (36 pt ornament, a secondary line) until SlackKit has it.
//
//   margins 10 / 16 / 10 / 16                                     SKEntityBaseView.swift:60-66
//   ornament small 24 / medium 36, 12 pt to the text              :386-389, SKEntityOrnamentView.swift:361-470
//   primary .body (Lato 17) contentPrimary, 1 line; bold for      SKEntityPrimaryContentView.swift:94-111
//   people, channels and group DMs; inline items 8 pt apart
//   secondary .caption (Lato 13) contentSecondary, 0 spacing      SKEntityContentView.swift:51, 56-62
//   accessories 8 pt after the content                            :391-394
//   disabled: texts contentTertiary, ornament alpha 0.6           SKEntityContentView.swift:57, SKEntityOrnamentView.swift:32
//   pressed: a radius-12 highlight inset 4 pt (SKList's           SKEntityBackgroundView.swift:18-122, SKList.swift:140-142
//   baseTertiary) and the content scales to (W − 8) / W           SKListCollectionViewCell.swift:215-241
//
// Heights come out as UIKit's: 44 (small), 56.33 (medium with a secondary line), since text lines round up to the
// 1/3 pt pixel grid (20.67 for Lato 17, 15.67 for Lato 13; shell-navigation.md §4.2).

export interface EntityRowProps {
  /** small (24 pt ornament), medium (36), extraLarge (56; bodyBlack title, smallBody subtitle, 16 pt gaps: SKWorkspaceEntity,
   *  SKGenericEntity .extraLarge, SKEntityBaseView.swift:386-389, SKEntityContentView.swift:52-60) */
  size?: 'small' | 'medium' | 'extraLarge'
  /** the leading ornament, drawn at the size's box (24 or 36 pt): an avatar, SKOrnamentBox, file-type box… */
  ornament?: ReactNode
  /** the primary text */
  title: ReactNode
  /** bodyBold for member / channel / MPDM entities (shouldBoldPrimaryText) */
  bold?: boolean
  titleFont?: string
  titleColor?: string
  /** 1 by default; 0 = unlimited */
  titleLines?: number
  /** after the title, 8 pt apart: status emoji, "APP" tag, inline secondary text */
  inline?: ReactNode
  /** the second line (.caption contentSecondary unless styled) */
  subtitle?: ReactNode
  subtitleFont?: string
  subtitleColor?: string
  /** 0 = unlimited (SKGenericEntity's default); member and channel entities use 3 */
  subtitleLines?: number
  /** trailing controls, 8 pt apart (badges, chevrons, switches, checkmarks) */
  accessories?: ReactNode
  disabled?: boolean
  /** the row's own background (emphasized rows) */
  background?: string
  /** the highlight while pressed; default SKList's baseTertiary */
  pressedColor?: string
  /** a permanently highlighted row (the current workspace), no bounce */
  selected?: boolean
  /** top-align the ornament with a multi-line text column (default centered) */
  alignTop?: boolean
  onClick?: () => void
  onLongPress?: (el: HTMLElement) => void
  className?: string
  style?: CSSProperties
  'data-qa'?: string
}

export function EntityRow({
  size = 'small',
  ornament,
  title,
  bold,
  titleFont,
  titleColor,
  titleLines = 1,
  inline,
  subtitle,
  subtitleFont,
  subtitleColor,
  subtitleLines = 0,
  accessories,
  disabled,
  background,
  pressedColor,
  selected,
  alignTop,
  onClick,
  onLongPress,
  className,
  style,
  ...rest
}: EntityRowProps) {
  const lp = useLongPress((el) => onLongPress?.(el))
  const tappable = !!onClick && !disabled && !selected
  const vars: Record<string, string> = {}
  if (background) vars['--ent-bg'] = background
  if (pressedColor) vars['--ent-pressed'] = pressedColor
  return (
    <div
      className={['ent-row', `ent-row--${size}`, disabled && 'is-disabled', selected && 'is-selected', alignTop && 'is-top', className].filter(Boolean).join(' ')}
      style={{ ...vars, ...style } as CSSProperties}
      role={onClick ? 'button' : undefined}
      aria-disabled={disabled || undefined}
      data-tap={tappable ? '' : undefined}
      onClick={disabled ? undefined : onClick}
      data-qa={rest['data-qa']}
      {...(onLongPress && !disabled ? lp : {})}
    >
      <div className="ent-row__bg" />
      <div className="ent-row__content">
        {ornament !== undefined && ornament !== null && <div className="ent-row__ornament">{ornament}</div>}
        <div className="ent-row__text">
          <div className="ent-row__primary">
            <span className={`ent-row__title${bold ? ' is-bold' : ''}`} style={{ ...clamp(titleLines), font: titleFont, color: titleColor }}>
              {title}
            </span>
            {inline && <span className="ent-row__inline">{inline}</span>}
          </div>
          {subtitle !== undefined && subtitle !== null && subtitle !== '' && (
            <div className="ent-row__subtitle" style={{ ...clamp(subtitleLines), font: subtitleFont, color: subtitleColor }}>
              {subtitle}
            </div>
          )}
        </div>
        {accessories && <div className="ent-row__accessories">{accessories}</div>}
      </div>
    </div>
  )
}

const clamp = (lines: number): CSSProperties =>
  lines === 1
    ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
    : lines > 1
      ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden' }
      : {}

/**
 * SKListFooter .hairlineDivider: 8 pt of list background with a 1 px outlineTertiary line on its bottom edge
 * (SKListFooterView.swift:18-20, 50, 106-112). `padding={false}` is the bare hairline.
 */
export const SectionFooter = ({ hairline = true, padding = true }: { hairline?: boolean; padding?: boolean }) => (
  <div className={`ent-footer${padding ? '' : ' is-flush'}`}>{hairline && <i />}</div>
)

/** A blankDivider header or footer: empty space (SKListBlankDividerView), 8 pt unless told. */
export const BlankDivider = ({ height = 8 }: { height?: number }) => <div style={{ height }} aria-hidden />
