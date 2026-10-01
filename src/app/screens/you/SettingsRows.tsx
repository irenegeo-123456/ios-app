import type { ReactNode } from 'react'
import { SKGenericEntity, SKHeaderEntity, type SKEntityProps } from '../../../slackkit/SKEntities'
import type { SKListCellAccessory } from '../../../slackkit/SKListCellAccessory'
import { SKListFooter } from '../../../slackkit/SKEntity'
import './settings-rows.css'

// The rows Slack's settings lists are made of (Preferences, Notifications, Set a Status, Edit Profile): SKGenericEntity
// .small inside an SKList, with SKList's section chrome (spec you-settings.md §0.3, sheets-menus.md §0.3, §0.5):
//
//   row      margins 10 / 16, a clear 24 pt ornament box with a 20 pt icon (contentPrimary unless the screen tints it),
//            12 pt to the text, the title .body contentPrimary (wrapping: primaryTextNumberOfLines 0), the value as
//            secondary text under it (.caption contentSecondary), 8 pt to the accessories; pressed: baseTertiary, inset 4,
//            radius 12 (SKEntityBaseView.swift:60-66, :386-394; SKList.swift:140-142)
//   header   SKHeaderEntity .medium: 8 pt + 12 / 16 margins, .smallBodyBold contentPrimary, a .smallBody secondary line
//            4 pt under it (SKHeaderEntity.swift:80-87, :455-484)
//   footer   .hairlineDivider: 8 pt with a 1 px outlineTertiary line at its bottom, none after the last section
//            (SKListFooterView.swift:17-21, :106-113; SKList.swift:2028-2082)
//   blank    .default header (8 pt on the first section) and .blankDivider (8 pt) (SKList.swift:2008-2022)
//
// Tapping a switch row toggles its switch, as SKEntitiesListAdapter does for every toggle row (:109-143, :173-175).

/** A clear 24 pt ornament box holding a 20 pt icon (SKOrnamentBox .small, :243-254, :559-576). */
export const iconOrnament = (icon: string, color = 'var(--dt_color_content_primary)') => ({ icon: { icon, color } })

type RowBase = Omit<SKEntityProps, 'primaryText' | 'accessories' | 'onSelected'> & {
  title: ReactNode
  subtitle?: ReactNode
  icon?: string
  iconColor?: string
}

const base = ({ title, subtitle, icon, iconColor, ...rest }: RowBase): SKEntityProps => ({
  primaryTextNumberOfLines: 0,
  ...rest,
  primaryText: title,
  secondaryText: subtitle,
  ornament: rest.ornament ?? (icon ? iconOrnament(icon, iconColor) : undefined),
})

/** A row that opens something: a chevron (or another accessory: new_window, a badge…). */
export function NavRow({ accessories = ['chevron'], onSelect, ...rest }: RowBase & { accessories?: SKListCellAccessory[]; onSelect?: () => void }) {
  return <SKGenericEntity {...base(rest)} accessories={accessories} onSelected={onSelect} />
}

/** A row with a switch; tapping anywhere on it toggles. */
export function SwitchRow({ isOn, onChange, ...rest }: RowBase & { isOn: boolean; onChange: (on: boolean) => void }) {
  const enabled = rest.isEnabled !== false
  return (
    <SKGenericEntity
      {...base(rest)}
      accessories={[{ toggleSwitch: { isOn, isEnabled: enabled, onToggled: onChange } }]}
      onSelected={enabled ? () => onChange(!isOn) : undefined}
    />
  )
}

/** A single-choice row with a trailing SKRadioButton. */
export function RadioRow({ isOn, onSelect, ...rest }: RowBase & { isOn: boolean; onSelect: () => void }) {
  return <SKGenericEntity {...base(rest)} accessories={[{ radioButton: { isOn, onToggled: () => onSelect() } }]} onSelected={onSelect} />
}

/** A row with a trailing SKCheckbox. */
export function CheckboxRow({ isOn, onChange, ...rest }: RowBase & { isOn: boolean; onChange: (on: boolean) => void }) {
  return <SKGenericEntity {...base(rest)} accessories={[{ checkbox: { isOn, onToggled: onChange } }]} onSelected={() => onChange(!isOn)} />
}

/** SKHeaderEntity .medium (the section headers of every settings list); its labels wrap (SKLabel's numberOfLines 0,
 *  SKLabelPresentationObject.swift:51; SKHeaderEntity.swift:325-336). */
export const SectionHeader = ({ title, secondary, rightButton, onRightButton }: { title: ReactNode; secondary?: ReactNode; rightButton?: string; onRightButton?: () => void }) => (
  <SKHeaderEntity className="settings-header" primaryText={title} secondaryText={secondary} rightButton={rightButton ? { text: rightButton } : undefined} onRightButtonTapped={onRightButton} />
)

/** The default section footer: 8 pt and a hairline (omit it after the last section). */
export const SectionFooter = () => <SKListFooter />

/** A blank 8 pt header or footer (.default on the first section, .blankDivider). */
export const Blank = ({ height = 8 }: { height?: number }) => <div style={{ height }} aria-hidden />
