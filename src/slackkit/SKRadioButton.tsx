import type { CSSProperties } from 'react'
import { cx, haptic, useMirroredState } from './util'
import './controls.css'

// SKRadioButton (DesignerComponents/RadioButton/SKRadioButton.swift): a single-choice radio, 20 × 20. A 2 pt ring
// (2.5 pt while pressed) on basePrimary; when on the ring is highlight1.outline and a 10 pt highlight1.content dot sits
// inside (inset 5; 5.25 while pressed, both sk_highlight_hover). Disabled: baseTertiary with outlineTertiary ring and
// dot (:20-43, :117-138, :256-271). Tapping one that's already on does nothing; otherwise it turns on and fires
// `toggled(true)` (:273-282). Spec: slackkit-components.md › SKRadioButton.
//
//   <SKRadioButton isOn={choice === 'a'} onToggled={() => setChoice('a')} />

interface Props {
  isOn: boolean
  isEnabled?: boolean
  /** toggled(true) */
  onToggled?: (isOn: boolean) => void
  accessibilityLabel?: string
  className?: string
  style?: CSSProperties
}

export function SKRadioButton({ isOn, isEnabled = true, onToggled, accessibilityLabel, className, style }: Props) {
  const [on, setOn] = useMirroredState(isOn)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={accessibilityLabel}
      className={cx('sk-radio', on && 'is-on', !isEnabled && 'is-disabled', className)}
      style={style}
      disabled={!isEnabled}
      data-tap={isEnabled ? '' : undefined}
      onClick={() => {
        if (!isEnabled) return
        haptic()
        if (on) return
        setOn(true)
        onToggled?.(true)
      }}
    >
      <span className="sk-radio__dot" />
    </button>
  )
}
