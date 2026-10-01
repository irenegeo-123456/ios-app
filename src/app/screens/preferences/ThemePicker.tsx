import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useApp, useMe } from '../../store'
import { useSheet } from '../../nav/SheetHost'
import type { SheetProps } from '../../nav/registry'
import { GlassButton, NavBar } from '../../nav/NavBar'
import { showActionSheet } from '../../sheets/ui/Alert'
import { Icon } from '../../../icons/Icon'
import { useSim } from '../../../sim/store'
import { useTheme } from '../../../theme/ThemeStyle'
import { PRESETS, presetById } from '../../../theme/presets'
import { computeTheme, palette, STANDARD_PALETTES, type Pair, type PaletteRef, type StandardPalette, type ThemeInput } from '../../../theme/engine'
import { SKPageController } from '../../../slackkit/SKPageController'
import { SKButton } from '../../../slackkit/SKButton'
import { SKGenericEntity, SKChannelEntity } from '../../../slackkit/SKEntities'
import { SKWorkspaceAvatar } from '../../../slackkit/SKWorkspaceAvatar'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKColorSwatch } from '../../../slackkit/SKColorSwatch'
import { XMark } from '../you/SheetNavBar'
import './theme-picker.css'

// Themes (Modules/Features/ThemePicker, spec theme-colors.md §7 and you-settings.md §5.4; slack-objc 14b3cbaf): a
// full-screen modal (ThemePickerFeature.swift:25-31, swipe to dismiss disabled) titled "Themes" (themes 21369) with a
// close button and, on iOS 26, an svgCheck "Done" item (ThemePickerViewController.swift:51-85, ThemePickerPresenter.swift:60-82). On top, the preview card on the selection's
// primary._0 (an overlay animating 0.2 s, :115-123); below, a 36 pt-radius panel with two tabs, "Theme Presets" and
// "Customize Theme" (ThemeSelectorView.swift:71-91). Picking a preset previews it everywhere at once
// (themeService.setTemporaryOverrideTheme, ThemePickerInteractor.swift:140-150); the check saves it; closing with a change
// asks "Save changes?" (:179-206). Here the preview is useTheme.setTheme, saving a preset is setPreset (it persists), and
// leaving without saving puts the theme back.
//
//   presentSheet('theme-picker')

interface Selection {
  id: string
  input: ThemeInput
}

const sameColors = (a: ThemeInput, b: ThemeInput) =>
  JSON.stringify([a.primary, a.highlight1, a.highlight2, a.important, a.brightness]) === JSON.stringify([b.primary, b.highlight1, b.highlight2, b.important, b.brightness])
const sameSelection = (a: Selection, b: Selection) => sameColors(a.input, b.input) && a.input.gradientEnabled === b.input.gradientEnabled
/** the preset whose ColorSet equals the theme's (ColorSet == ignores the gradient pref: ThemePresetsView.swift:189) */
const presetFor = (input: ThemeInput) => PRESETS.find((p) => sameColors(p.theme, input))

export function ThemePickerSheet(_props: SheetProps) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const me = useMe()
  const appearance = useSim((s) => s.appearance)
  const initial = useRef<Selection>({ id: useTheme.getState().id, input: useTheme.getState().input })
  const [sel, setSel] = useState<Selection>(initial.current)
  const saved = useRef(false)

  // ThemePickerInteractor deinit: clearTemporaryOverrideTheme — leaving without saving restores the theme
  useEffect(
    () => () => {
      if (!saved.current) useTheme.getState().setTheme(initial.current.input, initial.current.id)
    },
    [],
  )

  const select = (next: Selection) => {
    // handleThemeSelection: nothing when it's the same; otherwise preview it at once (:140-150)
    if (sameSelection(next, sel)) return
    setSel(next)
    useTheme.getState().setTheme(next.input, next.id)
  }
  const dismiss = () => (sheet ? sheet.dismiss() : useApp.getState().dismissSheet())
  const save = () => {
    saved.current = true
    const preset = presetById(sel.id)
    if (preset && sameSelection({ id: preset.id, input: preset.theme }, sel)) useTheme.getState().setPreset(preset.id)
    else useTheme.getState().setTheme(sel.input, presetFor(sel.input)?.id ?? 'custom')
    dismiss()
  }
  const close = () => {
    if (sameSelection(sel, initial.current)) return dismiss()
    // an action sheet with Save Changes and Discard Changes (destructive), no cancel (:179-206)
    showActionSheet({
      title: 'Save changes?',
      message: 'This will change the appearance of your Slack',
      actions: [
        { title: 'Save Changes', onPress: save },
        { title: 'Discard Changes', style: 'destructive', onPress: dismiss },
      ],
    })
  }
  const surprise = () => {
    // handleSurpriseTheme: a random standard palette per role, brightness Int.random(in: 1..<6), gradient on (:208-224)
    const pick = (): StandardPalette => STANDARD_PALETTES[Math.floor(Math.random() * STANDARD_PALETTES.length)]
    const input: ThemeInput = { primary: pick(), highlight1: pick(), highlight2: pick(), important: pick(), brightness: 1 + Math.floor(Math.random() * 5), gradientEnabled: true }
    select({ id: presetFor(input)?.id ?? 'custom', input })
  }

  const selectedPreset = presetFor(sel.input)
  const roles = useMemo(() => computeTheme(sel.input), [sel.input])
  const mode = appearance === 'dark' ? 'dark' : 'light'

  return (
    // the view is basePrimary; the overlay over it animates to primary._0 of the selection (:34-39, :115-123)
    <div className="tp" data-screen="theme-picker" style={{ '--tp-overlay': palette(sel.input.primary).at(0)[mode] } as CSSProperties}>
      <div className="tp__overlay" />
      <div className="tp__preview" role="img" aria-label={['Theme Preview', 'Current Theme', selectedPreset?.name ?? 'Custom'].join(', ')}>
        <PreviewCard workspace={{ name: fx.workspace.name, initials: fx.workspace.initials, icon: fx.workspace.iconUrl }} user={{ name: me?.realName ?? '', avatar: me?.avatar, away: me?.presence === 'away' }} gradient={sel.input.gradientEnabled} />
      </div>
      <div className="tp__selector">
        <SKPageController
          tabBarPosition="top"
          pages={[
            { id: 'presets', tab: { title: 'Theme Presets' }, content: <Presets selectedId={selectedPreset?.id} mode={mode} onSelect={(id) => select({ id, input: presetById(id)!.theme })} onSurprise={surprise} /> },
            {
              id: 'customize',
              tab: { title: 'Customize Theme' },
              content: <Customize input={sel.input} roles={roles} mode={mode} onToggleGradient={() => select({ id: sel.id, input: { ...sel.input, gradientEnabled: !sel.input.gradientEnabled } })} />,
            },
          ]}
        />
      </div>
      <NavBar
        title={<span className="you-title">Themes</span>}
        leading={
          <GlassButton label="Close" onClick={close}>
            <XMark />
          </GlassButton>
        }
        trailing={
          <GlassButton label="Done" onClick={save}>
            <Icon name="check" size={20} />
          </GlassButton>
        }
      />
    </div>
  )
}

/**
 * ThemePreviewCardView (Subviews/Preview/ThemePreviewCardView.swift): radius 20 continuous, a shadow of sk_black at
 * 0.12, offset (0, 8), radius 24; a radial gradient from the bottom-leading corner, 100 → 500 pt, of [g1, gradient ? g2 :
 * g1]; 12 pt down, 16 pt in, a 40 pt line spaced 12: the workspace avatar in a Liquid Glass capsule (6 pt inset,
 * .smallPlus, concentric), the workspace name (.title max 34, contentInversePrimary, 1 line) and your avatar with
 * presence (both colors baseInverseHighlight2) in another capsule; 12 pt below, the list (basePrimary, radius 16): a
 * public channel "channel-name" (bodyBold, contentPrimary) with an emphasized "2" badge in baseInverseImportant,
 * and a presence dot with "Team Member" (body) (:20-28, :112-141, :184-287).
 */
function PreviewCard({ workspace, user, gradient }: { workspace: { name: string; initials: string; icon?: string }; user: { name: string; avatar?: string; away?: boolean }; gradient: boolean }) {
  return (
    <div className={`tp-card${gradient ? '' : ' is-flat'}`}>
      <div className="tp-card__top">
        <span className="tp-card__glass glass">
          <SKWorkspaceAvatar src={workspace.icon} name={workspace.name} initials={workspace.initials} size="smallPlus" round />
        </span>
        <span className="tp-card__workspace">{workspace.name}</span>
        <span className="tp-card__glass glass">
          <SKMemberAvatar src={user.avatar} name={user.name} size="smallPlus" presence={user.away ? 'away' : 'active'} activeColor="var(--theme_baseInverseHighlight2)" awayColor="var(--theme_baseInverseHighlight2)" round />
        </span>
      </div>
      <div className="tp-card__list">
        <SKChannelEntity
          name={<span className="tp-card__channel">channel-name</span>}
          channelType="public"
          // contentPrimary, a stroked # (ThemePreviewCardView.swift:254-255)
          iconColor="var(--dt_color_content_primary)"
          accessories={[{ badge: { title: '2', badgeStyle: 'emphasized', backgroundColor: 'var(--theme_baseInverseImportant)' } }]}
          backgroundColor="var(--dt_color_base_primary)"
        />
        <SKGenericEntity
          primaryText={<span className="tp-card__member">Team Member</span>}
          ornament={{ icon: { icon: 'status_member_filled', color: 'var(--theme_baseInverseHighlight2)' } }}
          backgroundColor="var(--dt_color_base_primary)"
        />
      </div>
    </div>
  )
}

/**
 * ThemePresetsView: the 28 presets in two columns (one at accessibility sizes), section insets 24 / 24 / 12, 8 pt gaps
 * (:24-27, :143-163); "Surprise Me" (SKButton primary, medium, svgSparkles) 16 pt in at the bottom over a basePrimary
 * fade (0 → 0.9 alpha at 40 %, from 24 pt above the button) (:47-80, :118-133).
 */
function Presets({ selectedId, mode, onSelect, onSurprise }: { selectedId?: string; mode: 'light' | 'dark'; onSelect: (id: string) => void; onSurprise: () => void }) {
  return (
    <div className="tp-presets">
      <div className="ios-scroll tp-presets__grid">
        {PRESETS.map((p) => (
          <PresetCell key={p.id} id={p.id} name={p.name} theme={p.theme} monochromatic={p.monochromatic} selected={p.id === selectedId} mode={mode} onSelect={onSelect} />
        ))}
      </div>
      <div className="tp-presets__fade" />
      <div className="tp-presets__surprise">
        <SKButton title="Surprise Me" buttonStyle="primary" size="medium" icon="sparkles" iconPosition="left" accessibilityLabel="Surprise Me" onClick={onSurprise} />
      </div>
    </div>
  )
}

/**
 * ThemePresetCell: radius 12 continuous with a 1 pt outlineTertiary border; a 36 pt circle (radial from the bottom-leading
 * corner, 10 → 50 pt, of g1 → g2) 12 pt in, 12 pt to the name (captionBold, contentPrimary, 1 line); height
 * max(label, 36) + 2 × 8. Selected: a 2 pt border painted with primary._60 → highlight1._60 left to right (solid
 * primary._60 when monochromatic) and the same at 6 % behind; pressed scales to 0.96 (:20-26, :65-94, :107-152, :160-226).
 */
function PresetCell({ id, name, theme, monochromatic, selected, mode, onSelect }: { id: string; name: string; theme: ThemeInput; monochromatic: boolean; selected: boolean; mode: 'light' | 'dark'; onSelect: (id: string) => void }) {
  const roles = useMemo(() => computeTheme(theme), [theme])
  const g1 = roles.backgroundGradient1[mode]
  const g2 = roles.backgroundGradient2[mode]
  const s1 = palette(theme.primary).at(60)[mode]
  const s2 = monochromatic ? s1 : palette(theme.highlight1).at(60)[mode]
  return (
    <button
      type="button"
      className={`tp-cell${selected ? ' is-selected' : ''}`}
      style={{ '--tp-g1': g1, '--tp-g2': g2, '--tp-s1': s1, '--tp-s2': s2 } as CSSProperties}
      aria-label={name}
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      data-tap
    >
      <span className="tp-cell__selected" aria-hidden />
      <span className="tp-cell__swatch" aria-hidden />
      <span className="tp-cell__title">{name}</span>
    </button>
  )
}

/** ThemeColorType titles (ThemePickerDataTypes.swift:46-64): Header, Selected Items, Presence Indication, Notifications. */
const COLOR_ROWS: { key: 'primary' | 'highlight1' | 'highlight2' | 'important'; title: string }[] = [
  { key: 'primary', title: 'Header' },
  { key: 'highlight1', title: 'Selected Items' },
  { key: 'highlight2', title: 'Presence Indication' },
  { key: 'important', title: 'Notifications' },
]

/**
 * The Customize Theme tab (ThemePickerPresenter.swift:86-170): four M rows — a circle color swatch, the color's role in
 * bodyBold contentPrimary, its "#RRGGBB" — then "Window Gradient" with "Blend **Window background** and
 * **Selected items** colors together in window backgrounds." (caption, contentSecondary) and a checkbox. A color
 * row opens UIColorPickerViewController, which isn't in the prototype.
 */
function Customize({ input, roles, mode, onToggleGradient }: { input: ThemeInput; roles: ReturnType<typeof computeTheme>; mode: 'light' | 'dark'; onToggleGradient: () => void }) {
  const showToast = useApp((s) => s.showToast)
  return (
    <div className="ios-scroll tp-customize">
      {COLOR_ROWS.map((r) => {
        const color = displayColor(r.key, input[r.key], roles)[mode]
        return (
          <SKGenericEntity
            key={r.key}
            size="medium"
            primaryText={<span className="tp-customize__title">{r.title}</span>}
            secondaryText={color.slice(0, 7).toUpperCase()}
            ornament={<SKColorSwatch color={color} swatchStyle="circle" size={36} accessibilityLabel={color} />}
            onSelected={() => showToast('Not in the prototype')}
          />
        )
      })}
      <SKGenericEntity
        size="medium"
        primaryText="Window Gradient"
        primaryTextNumberOfLines={0}
        secondaryText={
          <span className="tp-customize__gradient">
            Blend <b>Window background</b> and <b>Selected items</b> colors together in window backgrounds.
          </span>
        }
        accessories={[{ checkbox: { isOn: input.gradientEnabled, onToggled: onToggleGradient } }]}
        onSelected={onToggleGradient}
      />
    </div>
  )
}

/** ColorSet.displayColor (ThemePickerDataTypes.swift:88-107): what the Customize rows show for each role. */
function displayColor(key: 'primary' | 'highlight1' | 'highlight2' | 'important', ref: PaletteRef, roles: ReturnType<typeof computeTheme>): Pair {
  if (typeof ref !== 'string') return palette(ref).literal ?? palette(ref).at(50)
  if (key === 'primary') return roles.baseInverseSecondary
  if (key === 'important') return roles.baseInverseImportant
  if (key === 'highlight2') return roles.baseInverseHighlight2
  return palette(ref).at(50)
}
