import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { asset } from '../lib/asset'
import { SKBadge } from './SKBadge'
import { SKGroupAvatar } from './SKGroupAvatar'
import { cx } from './util'
import './nav-title.css'

// SKNavigationTitle (DesignerComponents/NavigationTitle/SKNavigationTitle.swift, SKNavigationTitleOrnament.swift): the
// custom nav-bar title view. A title (Lato Black 17, contentPrimary) and an optional subtitle (Lato 15,
// contentSecondary), one line each, stacked inside 0 / 5 / 0 / 5 insets, centered or leading. Each line can have left and
// right 20 × 20 ornaments: an icon (tinted like its line, 2 pt from the text), an image (proportional corners, 8 pt),
// a member count (an SKGroupAvatar, 8 pt) or a badge (4 pt) (:68-86, :195-262, :323-341). Tapping fires `selected`.
// A subtitle added with shouldAnimateContentTransition fades in with the smooth/medium spring (0.4 s) (:150-180).
// Spec: slackkit-components.md › SKNavigationTitle.
//
//   <SKNavigationTitle title="design" leftTitleOrnament={{ icon: 'channel' }} subtitle="16 members" onSelected={…} />
//   <SKNavigationTitle title="Title" subtitle="Subtitle" rightSubtitleOrnament={{ icon: 'caret_down' }} />

/** SKNavigationTitle.PresentationObject.Ornament (:323-341) */
export type SKNavigationTitleOrnament = { icon: string } | { image: string } | { count: number } | { badge: Parameters<typeof SKBadge>[0] } | 'none'

interface Props {
  title: ReactNode
  leftTitleOrnament?: SKNavigationTitleOrnament
  rightTitleOrnament?: SKNavigationTitleOrnament
  subtitle?: ReactNode
  leftSubtitleOrnament?: SKNavigationTitleOrnament
  rightSubtitleOrnament?: SKNavigationTitleOrnament
  alignment?: 'center' | 'leading'
  shouldAnimateContentTransition?: boolean
  /** selected */
  onSelected?: () => void
  className?: string
  style?: CSSProperties
}

/** Ornament.horizontalSpacing: icon 2, badge 4, image or count 8 */
const spacing = (o?: SKNavigationTitleOrnament) => (!o || o === 'none' ? 0 : 'icon' in o ? 2 : 'badge' in o ? 4 : 8)

function Ornament({ o }: { o?: SKNavigationTitleOrnament }) {
  if (!o || o === 'none') return null
  let inner: ReactNode
  if ('icon' in o) inner = <Icon name={o.icon} size={20} />
  else if ('image' in o) inner = <img className="sk-nav-title__image" src={asset(o.image)} alt="" draggable={false} />
  else if ('count' in o) inner = <SKGroupAvatar count={o.count} size={20} style={{ borderRadius: 5 }} />
  else inner = <SKBadge {...o.badge} />
  return <span className={cx('sk-nav-title__ornament', 'badge' in o && 'is-badge')}>{inner}</span>
}

function Line({ text, left, right, className }: { text: ReactNode; left?: SKNavigationTitleOrnament; right?: SKNavigationTitleOrnament; className: string }) {
  return (
    <span className={cx('sk-nav-title__line', className)}>
      <Ornament o={left} />
      <span className="sk-nav-title__text" style={{ marginLeft: spacing(left), marginRight: spacing(right) }}>
        {text}
      </span>
      <Ornament o={right} />
    </span>
  )
}

export function SKNavigationTitle({
  title,
  leftTitleOrnament,
  rightTitleOrnament,
  subtitle,
  leftSubtitleOrnament,
  rightSubtitleOrnament,
  alignment = 'center',
  shouldAnimateContentTransition = false,
  onSelected,
  className,
  style,
}: Props) {
  return (
    <div
      className={cx('sk-nav-title', alignment === 'leading' && 'is-leading', className)}
      style={style}
      role={onSelected ? 'button' : 'heading'}
      aria-level={onSelected ? undefined : 1}
      onClick={onSelected}
    >
      <Line text={title} left={leftTitleOrnament} right={rightTitleOrnament} className="sk-nav-title__title" />
      {subtitle !== undefined && subtitle !== null && (
        <Line text={subtitle} left={leftSubtitleOrnament} right={rightSubtitleOrnament} className={cx('sk-nav-title__subtitle', shouldAnimateContentTransition && 'is-animated')} />
      )}
    </div>
  )
}
