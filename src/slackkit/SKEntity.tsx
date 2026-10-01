import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { useLongPress } from '../app/gestures'

// SlackKit's entity rows and list chrome, as Home and every list screen use them (spec home.md §2, §4, §5):
//
//   SKEntityRow     SKEntityBaseView .small: 44 pt, insets 10/16, a 24 pt ornament, 12 pt to the text, 12 pt to the
//                   accessories (8 pt apart); pressed → a 12 pt-radius fill inset 4 pt, content scales to (w − 8)/w
//   SKListHeader    SKHeaderEntity .medium: 8 pt extra top padding, 12/16 margins, 52 pt, smallBody Bold/Black 15,
//                   a 20 pt caret at the right, "+" or text button
//   SKListFooter    the 8 pt section footer with a 1 px hairline at its bottom (.hairlineDivider)
//   SKGroupAvatar   the group-DM count box: 24 pt, radius 6, baseTertiary, caption Bold 13
//   SKAdjacentLabel the "APP" tag: micro Bold 12, padding 2/4, radius 4

interface RowProps {
  ornament?: ReactNode
  /** the name; a string is drawn with the row's font, anything else as is */
  title: ReactNode
  /** unread (Black), read (Regular, secondary), muted (Regular, tertiary), action (Regular, secondary) */
  state?: 'unread' | 'read' | 'muted' | 'action' | 'plain'
  /** after the name, 8 pt apart (status emoji, "APP" tag, workspace name) */
  inline?: ReactNode
  /** at the right edge (badges, times, chevrons) */
  accessories?: ReactNode
  /** more than one line (group DMs wrap to 4) */
  lines?: number
  onClick?: () => void
  onLongPress?: (el: HTMLElement) => void
  disabled?: boolean
  className?: string
  style?: CSSProperties
  'data-qa'?: string
}

export function SKEntityRow({ ornament, title, state = 'plain', inline, accessories, lines = 1, onClick, onLongPress, disabled, className, style, ...rest }: RowProps) {
  const lp = useLongPress((el) => onLongPress?.(el))
  return (
    <div
      className={['sk-row', `sk-row--${state}`, disabled && 'is-disabled', className].filter(Boolean).join(' ')}
      style={style}
      data-tap
      role="button"
      onClick={onClick}
      data-qa={rest['data-qa']}
      {...(onLongPress ? lp : {})}
    >
      <div className="sk-row__bg" />
      <div className="sk-row__content">
        {ornament !== undefined && <div className="sk-row__ornament">{ornament}</div>}
        <div className="sk-row__primary">
          <span className="sk-row__title" style={lines > 1 ? { WebkitLineClamp: lines, whiteSpace: 'normal', display: '-webkit-box', WebkitBoxOrient: 'vertical' } : undefined}>
            {title}
          </span>
          {inline && <span className="sk-row__inline">{inline}</span>}
        </div>
        {accessories && <div className="sk-row__accessories">{accessories}</div>}
      </div>
    </div>
  )
}

/** A 20 pt icon in the row's 24 pt ornament box, tinted like the name. */
export const RowIcon = ({ name }: { name: string }) => <Icon name={name} size={20} className="sk-row__icon" />

interface HeaderProps {
  title: ReactNode
  unread?: boolean
  collapsible?: boolean
  collapsed?: boolean
  /** the collapsed chevron points right (default) or down (iaNextHomeTabV3) */
  onToggle?: () => void
  /** an emoji or icon before the title */
  ornament?: ReactNode
  /** "+" (icon) or a text button at the right */
  button?: { icon?: string; text?: string; label: string; onClick: () => void }
  badge?: ReactNode
  className?: string
}

export function SKListHeader({ title, unread, collapsible = true, collapsed, onToggle, ornament, button, badge, className }: HeaderProps) {
  return (
    <div className={['sk-list-header', unread && 'is-unread', className].filter(Boolean).join(' ')} role="heading" aria-level={2}>
      <div className="sk-list-header__content" onClick={onToggle} data-tap-fade>
        {ornament && <span className="sk-list-header__ornament">{ornament}</span>}
        <span className="sk-list-header__title">{title}</span>
        <span className="sk-list-header__spacer" />
        {badge}
        {button && (
          <button
            type="button"
            className={button.icon ? 'sk-list-header__icon-button' : 'sk-list-header__text-button'}
            aria-label={button.label}
            onClick={(e) => {
              e.stopPropagation()
              button.onClick()
            }}
          >
            {button.icon ? <Icon name={button.icon} size={20} /> : button.text}
          </button>
        )}
        {collapsible && <Icon name="caret_down_full" size={20} className={`sk-list-header__caret${collapsed ? ' is-collapsed' : ''}`} />}
      </div>
    </div>
  )
}

export const SKListFooter = ({ hairline = true, color }: { hairline?: boolean; color?: string }) => (
  <div className="sk-list-footer" style={color ? ({ ['--hairline-color' as string]: color } as CSSProperties) : undefined}>
    {hairline && <i />}
  </div>
)

export { SKGroupAvatar } from './SKGroupAvatar'

/**
 * The adjacent tag after a row's name ("APP", "TEMPLATE", "AI APP", "AGENTFORCE", "AGENT", "Skill"): SKFont.microBold,
 * insets 2/4/2/4, radius 4, with SKGenericEntity.AdjacentText's colors (SKGenericEntity.swift:494-541). Without colors
 * it uses Home's primaryAdjacentLabelColors; `prominent` is highlight1.content on highlight1.base.
 */
export const SKAdjacentLabel = ({ children, prominent, textColor, backgroundColor }: { children: ReactNode; prominent?: boolean; textColor?: string; backgroundColor?: string }) => (
  <span className={`sk-adjacent-label${prominent ? ' is-prominent' : ''}`} style={textColor || backgroundColor ? { color: textColor, background: backgroundColor } : undefined}>
    {children}
  </span>
)
