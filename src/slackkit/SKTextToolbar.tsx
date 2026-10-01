import { Fragment, type CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { cx, haptic } from './util'
import './text-input.css'

// SKTextToolbar (DesignerComponents/TextToolbar): the formatting toolbar above the keyboard, a horizontally scrolling
// row of 36 pt icon items, 4 pt apart (itemSpacing), in sections split by a 1 × 20 outlineTertiary divider with 6 pt
// on either side (SKTextToolbarLayout.swift:31-36, :60-113). Items: the icon in iconColor (contentSecondary). Since
// September 2026 an item has a selectionStyle (none / selected / emphasized; June's isSelected + blue/grey
// highlightStyle is gone): selected and emphasized draw the same chrome, a circle inset 2 pt in highlight1.surface
// behind the icon in highlight1.content (emphasized without the .selected trait); disabled alpha 0.35; pressed bounce
// 0.96 unless disableAnimations (the default) (Cells/SKTextToolbarItemCell.swift:14-126). A tap reports whether the
// item is `.selected`; the owner flips it. Spec: slackkit-components.md › SKTextToolbar.
//
//   <SKTextToolbar sections={[{ items: [{ id: 'bold', icon: 'bold', isSelected: bold }, { id: 'italic', icon: 'italic' }] },
//     { items: [{ id: 'list', icon: 'bulleted_list' }] }]} onSelectedItem={(id, wasSelected) => toggle(id, !wasSelected)} />

export interface SKTextToolbarItem {
  id: string
  icon: string
  /** default primary.contentSecondary */
  iconColor?: string
  voiceoverText?: string
  /** SelectionStyle (September 2026): `selected` (with the selected trait) or `emphasized` (the same chrome, decorative) */
  selectionStyle?: 'none' | 'selected' | 'emphasized'
  /** the June API: true is `selectionStyle: 'selected'` */
  isSelected?: boolean
  isEnabled?: boolean
  /** @deprecated June's blue / grey selected styles; September has one (highlight1), so this is ignored */
  highlightStyle?: 'blue' | 'grey'
  /** no pressed bounce (default true, as on iOS) */
  disableAnimations?: boolean
}

interface Props {
  sections: { items: SKTextToolbarItem[] }[]
  /** default primary.basePrimary */
  backgroundColor?: string
  /** Spacing.small */
  itemSpacing?: number
  /** selectedItem(id, isSelected): the item's state before the tap */
  onSelectedItem?: (id: string, isSelected: boolean) => void
  className?: string
  style?: CSSProperties
}

export function SKTextToolbar({ sections, backgroundColor = 'var(--dt_color_base_primary)', itemSpacing = 4, onSelectedItem, className, style }: Props) {
  const visible = sections.filter((s) => s.items.length)
  return (
    <div className={cx('sk-text-toolbar', className)} style={{ background: backgroundColor, ...style }} role="toolbar" data-scroll-x="">
      <div className="sk-text-toolbar__content" style={{ gap: itemSpacing }}>
        {visible.map((section, si) => (
          <Fragment key={si}>
            {si > 0 && <span className="sk-text-toolbar__divider" style={{ marginLeft: 6 - itemSpacing, marginRight: 6 - itemSpacing }} />}
            {section.items.map((item) => {
              const enabled = item.isEnabled ?? true
              const style = item.selectionStyle ?? (item.isSelected ? 'selected' : 'none')
              const selected = style === 'selected'
              const chrome = style !== 'none'
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cx('sk-text-toolbar__item', chrome && 'is-selected', !enabled && 'is-disabled', !(item.disableAnimations ?? true) && 'sk-bounce')}
                  style={{ ['--sk-bounce-scale' as string]: 0.96 }}
                  aria-label={item.voiceoverText ?? item.id}
                  aria-pressed={selected}
                  aria-disabled={!enabled || undefined}
                  data-tap=""
                  onClick={() => {
                    if (!enabled) return
                    haptic()
                    onSelectedItem?.(item.id, selected)
                  }}
                >
                  {chrome && <span className="sk-text-toolbar__circle" />}
                  <Icon name={item.icon} size={20} color={chrome ? 'var(--dt_color_content_highlight_1)' : (item.iconColor ?? 'var(--dt_color_content_secondary)')} />
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
