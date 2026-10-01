import { isValidElement, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SKEmoji } from './SKEmoji'
import { SKButton, type SKButtonProps } from './SKButton'
import { SKIconButton } from './SKIconButton'
import { SKSwitch } from './SKSwitch'
import { SKCheckbox } from './SKCheckbox'
import { SKRadioButton } from './SKRadioButton'
import { SKBadge } from './SKBadge'
import { SKDot } from './SKDot'
import { SKSpinner, type SKSpinnerColor, type SKSpinnerSize } from './SKSpinner'
import { cx } from './util'
import './entities.css'

// SKListCellAccessory (CoreComponents/List/Accessories/SKListCellAccessory.swift:14-460, rendered by
// SKListRowAccessoryStackView.swift:20-840): the trailing controls of list rows and banners, 8 pt apart
// (SKListRowAccessoryStackView.swift:679). Spec: slackkit-components.md › SKList row accessories.
//
//   accessories={['chevron']}
//   accessories={[{ toggleSwitch: { isOn, onToggled } }]}
//   accessories={[{ badge: { count: 3 } }, 'chevron']}
//   accessories={[<MyCustomThing />]}                        any element renders as is

export type SKListCellAccessory =
  /** caret_right_full, 20 pt, contentSecondary (:76) */
  | 'chevron'
  /** reorder, 20 pt, contentSecondary (:83) */
  | 'grabber'
  /** ellipsis_horizontal_filled, contentSecondary (:94-95); { more: { onClick } } makes it its own button */
  | 'more'
  | { more: { onClick?: () => void } }
  /** an SKIconButton close, size accessory (20), default contentSecondary (:114-125) */
  | { delete: { color?: string; onClick?: () => void } }
  | { toggleSwitch: { isOn: boolean; isEnabled?: boolean; onToggled?: (isOn: boolean) => void } }
  | { checkbox: { isOn: boolean; isEnabled?: boolean; onToggled?: (isOn: boolean) => void } }
  | { radioButton: { isOn: boolean; isEnabled?: boolean; onToggled?: (isOn: boolean) => void } }
  /** an SKButton of any style or size (buttonTapped) (:233-253) */
  | { button: SKButtonProps }
  | { icon: string; color?: string }
  | { badge: Parameters<typeof SKBadge>[0] }
  | { spinner: { size?: SKSpinnerSize; color?: SKSpinnerColor } }
  | { emoji: string }
  | { iconButton: Parameters<typeof SKIconButton>[0] }
  /** an SKDot, the small status (unread) dot (September 2026, :43-44, :480-490) */
  | { dot: Parameters<typeof SKDot>[0] }
  | ReactNode

/** Controls in a row take their own taps; the row doesn't also get selected. */
const Own = ({ children }: { children: ReactNode }) => (
  <span className="sk-accessories__control" onClick={(e) => e.stopPropagation()}>
    {children}
  </span>
)

export function renderAccessory(a: SKListCellAccessory, i: number): ReactNode {
  if (a === 'chevron') return <Icon key={i} name="caret_right_full" size={20} color="var(--dt_color_content_secondary)" />
  if (a === 'grabber') return <Icon key={i} name="reorder" size={20} color="var(--dt_color_content_secondary)" />
  if (a === 'more') return <Icon key={i} name="ellipsis_horizontal_filled" size={20} color="var(--dt_color_content_secondary)" />
  if (a === null || a === undefined || typeof a !== 'object' || isValidElement(a) || Array.isArray(a)) return a as ReactNode
  const o = a as Record<string, unknown>
  if ('more' in o) {
    const m = o.more as { onClick?: () => void }
    return (
      <Own key={i}>
        <SKIconButton icon="ellipsis_horizontal_filled" size="accessory" iconColor="var(--dt_color_content_secondary)" accessibilityLabel="More" onClick={m.onClick} />
      </Own>
    )
  }
  if ('delete' in o) {
    const d = o.delete as { color?: string; onClick?: () => void }
    return (
      <Own key={i}>
        <SKIconButton icon="close" size="accessory" iconColor={d.color ?? 'var(--dt_color_content_secondary)'} accessibilityLabel="Delete" onClick={d.onClick} />
      </Own>
    )
  }
  if ('toggleSwitch' in o)
    return (
      <Own key={i}>
        <SKSwitch {...(o.toggleSwitch as Parameters<typeof SKSwitch>[0])} />
      </Own>
    )
  if ('checkbox' in o)
    return (
      <Own key={i}>
        <SKCheckbox {...(o.checkbox as Parameters<typeof SKCheckbox>[0])} />
      </Own>
    )
  if ('radioButton' in o)
    return (
      <Own key={i}>
        <SKRadioButton {...(o.radioButton as Parameters<typeof SKRadioButton>[0])} />
      </Own>
    )
  if ('button' in o)
    return (
      <Own key={i}>
        <SKButton {...(o.button as SKButtonProps)} />
      </Own>
    )
  if ('icon' in o) return <Icon key={i} name={o.icon as string} size={20} color={(o.color as string) ?? 'var(--dt_color_content_primary)'} />
  if ('badge' in o) return <SKBadge key={i} {...(o.badge as Parameters<typeof SKBadge>[0])} />
  if ('spinner' in o) return <SKSpinner key={i} {...(o.spinner as Parameters<typeof SKSpinner>[0])} />
  if ('emoji' in o) return <SKEmoji key={i} name={o.emoji as string} size={20} />
  if ('iconButton' in o)
    return (
      <Own key={i}>
        <SKIconButton {...(o.iconButton as Parameters<typeof SKIconButton>[0])} />
      </Own>
    )
  if ('dot' in o) return <SKDot key={i} {...(o.dot as Parameters<typeof SKDot>[0])} />
  return null
}

/** The trailing accessory stack (SKListRowAccessoryStackView): accessories 8 pt apart, vertically centered. */
export function SKListRowAccessoryStack({ accessories, className }: { accessories: SKListCellAccessory[]; className?: string }) {
  if (!accessories.length) return null
  return (
    <span className={cx('sk-accessories', className)}>
      {accessories.map(renderAccessory)}
    </span>
  )
}
