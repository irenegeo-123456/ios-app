import type { CSSProperties } from 'react'
import { cx, haptic, useMirroredState } from './util'
import './controls.css'

// SKSwitch (DesignerComponents/Switch/SKSwitch.swift, September 2026): since 14b3cbaf a wrapper around a native
// UISwitch (:26-41), so on iOS 26 it is the system switch: a 63 × 28 capsule track, a white 37 × 24 capsule thumb 2 pt
// in from the ends, laid out in UISwitch's intrinsic 61 × 28 (:53-74; the track runs 2 pt past it on the right, as in
// SNAP/SKSwitchSnapshotTests). On: onTintColor highlight2.content (:22, :37); off: UIKit's own gray track. Disabled
// keeps the colors and dims the whole switch to Modifiers.disabledOpacity 0.35 (:85-91). Spec: slackkit-components.md
// › SKSwitch. (June's custom 51 × 31 switch with the check mark is gone.)
//
//   <SKSwitch isOn={on} onToggled={setOn} />
//
// Like the UISwitch it wraps, the switch flips itself, then reports the new value (`toggled(isOn)`, :123-132); it
// follows `isOn` whenever the owner changes it (:92-95).

interface Props {
  isOn?: boolean
  isEnabled?: boolean
  /** toggled(Bool): the switch's new value */
  onToggled?: (isOn: boolean) => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKSwitch({ isOn = false, isEnabled = true, onToggled, accessibilityLabel, className, style }: Props) {
  const [on, setOn] = useMirroredState(isOn)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={accessibilityLabel}
      className={cx('sk-switch', on && 'is-on', !isEnabled && 'is-disabled', className)}
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
      <span className="sk-switch__track" />
      <span className="sk-switch__thumb" />
    </button>
  )
}
