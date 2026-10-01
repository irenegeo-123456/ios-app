import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { cx, haptic, useMirroredState } from './util'
import './controls.css'

// SKCheckbox (DesignerComponents/Checkbox/SKCheckbox.swift): a circular check control, 21 × 21. A 1.5 pt
// outlinePrimary ring (2.5 pt while pressed) on a clear background (September 2026: the skcheckboxClearBackground flag
// is gone and the inner background is always clear, :97-108; June filled it basePrimary); when on, a highlight1.content fill grows from the center to
// the full circle and a 14 pt check_filled appears, offset (−0.16, +0.24) and rotated −4°. Pressed fill is
// highlight1.baseInverse @50 %; disabled: an outlineTertiary @13 % ring, baseTertiary fill and contentInverseSecondary
// check (:23-53, :133-154, :259-276). A 0.25 s spring (damping 1). Tapping flips it and fires `toggled(isOn)`.
// Spec: slackkit-components.md › SKCheckbox.
//
//   <SKCheckbox isOn={checked} onToggled={setChecked} />

interface Props {
  isOn: boolean
  isEnabled?: boolean
  /** toggled(Bool), after the checkbox has flipped itself */
  onToggled?: (isOn: boolean) => void
  /** @deprecated the inner background is always clear since September 2026; ignored */
  hasTransparentBackground?: boolean
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKCheckbox({ isOn, isEnabled = true, onToggled, accessibilityLabel, className, style }: Props) {
  const [on, setOn] = useMirroredState(isOn)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={accessibilityLabel}
      className={cx('sk-checkbox', on && 'is-on', !isEnabled && 'is-disabled', className)}
      style={style}
      disabled={!isEnabled}
      data-tap={isEnabled ? '' : undefined}
      onClick={() => {
        if (!isEnabled) return
        haptic()
        setOn(!on)
        onToggled?.(!on)
      }}
    >
      <span className="sk-checkbox__ring" />
      <span className="sk-checkbox__fill" />
      <Icon name="check_filled" size={14} className="sk-checkbox__check" />
    </button>
  )
}
