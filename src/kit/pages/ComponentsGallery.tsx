import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { installTouchGestures } from '../../app/gestures'
import * as SK from '../../slackkit'
import './ComponentsGallery.css'
// Slack's own snapshot-test images (Modules/UIInfra/SlackKit/Tests/Unit/Data/SlackKitTests.xcassets: tim_cook,
// steve_jobs, acme@3x, slackbot), for the specimens the snapshot suite compares, so a diff measures geometry rather than photos
import fixtureTimCook from './fixtures/tim_cook.jpeg'
import fixtureSteveJobs from './fixtures/steve_jobs.jpeg'
import fixtureAcme from './fixtures/acme.png'
import fixtureSlackbot from './fixtures/slackbot.png'
import fixtureKiwi from './fixtures/kiwi.jpg'

// ?kit=components: every SlackKit component (src/slackkit) with its main variants, each on a light and a dark 393 pt
// preview surface side by side, the way Slack's snapshot tests render them (light over dark). Each shows its Swift
// source and a usage snippet to copy. ?only=SKButton,SKSwitch shows just those; ?dark=1 darkens the page.
//
// Surfaces are .ios-screen elements with data-appearance, so the iOS tokens, SKFont type and theme resolve inside them,
// and each gets the app's touch gestures (pressed states, drag scrolling) like the simulated screen.

export default function ComponentsGallery() {
  const params = new URLSearchParams(location.search)
  const only = params.get('only')?.split(',').filter(Boolean)
  const [dark, setDark] = useState(params.get('dark') === '1')
  const [q, setQ] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const shown = useMemo(
    () => SECTIONS.filter((s) => (!only || only.includes(s.name)) && (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.group.toLowerCase().includes(q.toLowerCase()))),
    [only, q],
  )
  const groups = [...new Set(SECTIONS.map((s) => s.group))]
  return (
    <div className={`kit-page kit-components ${dark ? 'is-dark' : ''}`} data-kit-ready={ready ? '' : undefined}>
      <header className="kit-page__head">
        <h1>SlackKit components</h1>
        <p>
          The web SlackKit in <code>src/slackkit</code>: one component per iOS SlackKit component (Modules/UIInfra/SlackKit), same names, props = the
          PresentationObject. Spec: reference/ios/specs/slackkit-components.md. <code>{"import { SKButton } from '../slackkit'"}</code>
        </p>
        <div className="kit-page__tools">
          <label>
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark page
          </label>
        </div>
      </header>
      <div className="kit-gallery">
        <nav className="kit-gallery__toc">
          <input className="kit-gallery__filter" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} />
          {groups.map((g) => (
            <div key={g}>
              <h2>{g}</h2>
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <a key={s.name} href={`#${s.name}`}>
                  {s.name}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <main>
          {shown.length === 0 && <p className="kit-gallery__empty">No component matches.</p>}
          {groups
            .flatMap((g) => shown.filter((s) => s.group === g))
            .map((s) => (
              <Section key={s.name} s={s} />
            ))}
        </main>
      </div>
    </div>
  )
}

function Section({ s }: { s: GallerySection }) {
  return (
    <section className="kit-c" id={s.name}>
      <div className="kit-c__head">
        <h2 className="kit-c__name">{s.name}</h2>
        <span className="kit-c__swift">{s.swift}</span>
      </div>
      <p className="kit-c__about">{s.about}</p>
      <Code text={s.usage} />
      <div className="kit-variants">
        {s.specimens.map((sp) => (
          <div className="kit-variant" key={sp.id}>
            <div className="kit-variant__label">
              {sp.label}
              {sp.snapshot && <small>{sp.snapshot}</small>}
            </div>
            <Surface appearance="light" sp={sp} section={s.name} />
            <Surface appearance="dark" sp={sp} section={s.name} />
          </div>
        ))}
      </div>
    </section>
  )
}

function Surface({ appearance, sp, section }: { appearance: 'light' | 'dark'; sp: Specimen; section: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? installTouchGestures(ref.current) : undefined), [])
  return (
    <div ref={ref} className="ios-screen kit-surface" data-appearance={appearance} style={sp.surfaceStyle}>
      <div className={`kit-surface__pad${sp.layout === 'fill' ? ' is-fill' : sp.layout === 'flush' ? ' is-flush' : ''}`}>
        <div className="kit-specimen" data-specimen={`${section}/${sp.id}`} data-appearance={appearance}>
          {sp.render()}
        </div>
      </div>
    </div>
  )
}

function Code({ text }: { text: string }): ReactNode {
  const [copied, setCopied] = useState(false)
  return (
    <div className="kit-code">
      <pre>
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ specimens

interface Specimen {
  id: string
  label: ReactNode
  /** the Slack snapshot this variant matches, under Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests. */
  snapshot?: string
  /** wrap (default): hugs the component, 16 pt around it; fill: the surface's full 393 pt width; flush: no padding */
  layout?: 'wrap' | 'fill' | 'flush'
  surfaceStyle?: CSSProperties
  render: () => ReactNode
}

interface GallerySection {
  name: string
  group: string
  swift: string
  about: string
  usage: string
  specimens: Specimen[]
}

const AV = {
  lisa: '/kit/personas/lisa-dawson.png',
  arcadio: '/kit/personas/arcadio-buendia.png',
  zoe: '/kit/personas/zoe-maxwell.png',
  lee: '/kit/personas/lee-hao.png',
  geeta: '/kit/personas/geeta-joshi.png',
  matt: '/kit/personas/matt-brewer.png',
  acme: '/kit/logos/acme.png',
}

/** Slack's snapshot-test fixtures (see the imports) */
const FIXTURE = { timCook: fixtureTimCook, steveJobs: fixtureSteveJobs, acme: fixtureAcme, slackbot: fixtureSlackbot, kiwi: fixtureKiwi }

const IMG = { campfire: '/kit/thumbnails/campfire.png', lagoon: '/kit/thumbnails/lagoon.png', slides: '/kit/files/previews/slides-preview.jpg', clip: '/kit/files/previews/video-clip.jpg' }

const TITLE = 'Button Title'
const BANNER_TEXT = 'All of the alert text goes here.'

const FILES: SK.SKAttachmentBarItem[] = [
  { id: 'doc', state: { file: { type: 'doc', title: 'doc', subtitle: '64Mb' } } },
  { id: 'canvas', state: { file: { type: 'canvas', title: 'canvas', subtitle: '100Mb' } } },
  { id: 'pdf', state: { file: { type: 'pdf', title: 'pdf', subtitle: '200Mb' } } },
]

const SOLID: SK.SKLoadingPlaceholderStyle = { solid: { backgroundColor: 'var(--sk_primary_background)', placeholderColor: 'var(--dt_color_base_tertiary)' } }

const CHANNEL_SECONDARY = 'This is some secondary text that should wrap to the next line of the label.'

/** A toggle that owns its state, for the interactive specimens. */
function Stateful<T>({ initial, children }: { initial: T; children: (v: T, set: (v: T) => void) => ReactNode }) {
  const [v, set] = useState(initial)
  return <>{children(v, set)}</>
}

const SECTIONS: GallerySection[] = [
  // ------------------------------------------------------------------------------------------------ Buttons
  {
    name: 'SKButton',
    group: 'Buttons',
    swift: 'DesignerComponents/Button/SKButton.swift',
    about:
      'Text button: default and system (text only), primary and danger (filled), outline, custom and quickAction styles; 13 sizes; an icon left, right or on top; inactive (disabled) and processing (spinner, same size). Press and hold to see the pressed fill and the 0.96 bounce (none for the text-only styles).',
    usage: `<SKButton title="Save" buttonStyle="primary" onClick={save} />
<SKButton title="Remind me" icon="reminder" size="large" />
<SKButton title="Delete" buttonStyle="danger" state="processing" />
<SKButton title="" icon="reminder" />                     // icon only
<SKButton title="Done" buttonStyle="systemDefault" isPadded={false} size="barButton" />
<SKButton title="Go" buttonStyle="custom" customColors={{ backgroundColor: 'var(--sk_indigo)', titleColor: '#fff', borderColor: 'var(--sk_indigo)' }} />`,
    specimens: [
      { id: 'outlineDefault', label: 'outlineDefault (default)', snapshot: 'SKButtonSnapshotTests/testButtonOutlineDefaultEnabled', render: () => <SK.SKButton title={TITLE} /> },
      { id: 'primary', label: 'primary', snapshot: 'SKButtonSnapshotTests/testButtonPrimaryEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="primary" /> },
      { id: 'danger', label: 'danger', snapshot: 'SKButtonSnapshotTests/testButtonDangerEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="danger" /> },
      { id: 'outlinePrimary', label: 'outlinePrimary', snapshot: 'SKButtonSnapshotTests/testButtonOutlinePrimaryEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="outlinePrimary" /> },
      { id: 'outlineDanger', label: 'outlineDanger', snapshot: 'SKButtonSnapshotTests/testButtonOutlineDangerEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="outlineDanger" /> },
      { id: 'default', label: 'default(textColor:)', snapshot: 'SKButtonSnapshotTests/testButtonDefaultEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="default" /> },
      { id: 'systemDefault', label: 'systemDefault', snapshot: 'SKButtonSnapshotTests/testButtonSystemDefaultEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="systemDefault" /> },
      { id: 'systemDanger', label: 'systemDanger', snapshot: 'SKButtonSnapshotTests/testButtonSystemDangerEnabled', render: () => <SK.SKButton title={TITLE} buttonStyle="systemDanger" /> },
      {
        id: 'custom',
        label: 'custom (sk_indigo) with icon, left / right / top',
        snapshot: 'SKButtonSnapshotTests/testButtonCustomWithIconEnabled',
        render: () => (
          <>
            {(['left', 'right', 'top'] as const).map((p) => (
              <SK.SKButton key={p} title={TITLE} buttonStyle="custom" customColors={{ backgroundColor: 'var(--sk_indigo)', titleColor: 'var(--dt_color_constants_white)', borderColor: 'var(--sk_indigo)' }} icon="slack_logo" iconPosition={p} />
            ))}
          </>
        ),
      },
      {
        id: 'iconColor',
        label: 'icon color override: outlineDefault, custom (the icon keeps highlight2.content)',
        snapshot: 'SKButtonSnapshotTests/testButtonIconColorOverride, …TakesPriorityOverTitleColor',
        render: () => (
          <>
            <SK.SKButton title={TITLE} icon="check_circle_filled" iconColor="var(--dt_color_content_highlight_2)" />
            <SK.SKButton title={TITLE} buttonStyle="custom" customColors={{ backgroundColor: 'var(--sk_indigo)', titleColor: 'var(--dt_color_constants_white)', borderColor: 'var(--sk_indigo)' }} icon="check_circle_filled" iconColor="var(--dt_color_content_highlight_2)" />
          </>
        ),
      },
      {
        id: 'quickAction',
        label: 'quickAction, unselected / selected',
        render: () => (
          <>
            <SK.SKButton title="Huddle" buttonStyle="quickAction" icon="headphones" iconPosition="top" size="singleRecordViewQuickAction" />
            <SK.SKButton title="Huddle" buttonStyle="quickAction" isSelected icon="headphones" iconPosition="top" size="singleRecordViewQuickAction" />
          </>
        ),
      },
      {
        id: 'disabled',
        label: 'inactive (disabled): outlineDefault, primary, danger, default',
        snapshot: 'SKButtonSnapshotTests/testButtonPrimaryDisabled',
        render: () => (
          <>
            <SK.SKButton title={TITLE} state="inactive" />
            <SK.SKButton title={TITLE} buttonStyle="primary" state="inactive" />
            <SK.SKButton title={TITLE} buttonStyle="danger" state="inactive" />
            <SK.SKButton title={TITLE} buttonStyle="default" state="inactive" />
          </>
        ),
      },
      {
        id: 'processing',
        label: 'processing: primary, outlineDefault, default',
        snapshot: 'SKButtonSnapshotTests/testButtonPrimaryLoading',
        render: () => (
          <>
            <SK.SKButton title={TITLE} buttonStyle="primary" state="processing" />
            <SK.SKButton title={TITLE} state="processing" />
            <SK.SKButton title={TITLE} buttonStyle="default" state="processing" />
          </>
        ),
      },
      {
        id: 'sizes',
        label: 'extraSmall, small, medium, large, xLarge',
        snapshot: 'SKButtonSnapshotTests/testButtonSmall … testButtonExtraLarge',
        render: () => (
          <>
            {(['extraSmall', 'small', 'medium', 'large', 'xLarge'] as const).map((s) => (
              <SK.SKButton key={s} title={TITLE} size={s} />
            ))}
          </>
        ),
      },
      {
        id: 'iconOnly',
        label: 'icon only, medium / large',
        snapshot: 'SKButtonSnapshotTests/testButtonIconOnly',
        render: () => (
          <>
            <SK.SKButton title="" icon="reminder" />
            <SK.SKButton title="" icon="reminder" size="large" />
          </>
        ),
      },
      {
        id: 'internal',
        label: 'barButton, toastButton, huddleBarButton',
        snapshot: 'SKButtonSnapshotTests/testButtonBarButton',
        render: () => (
          <>
            <SK.SKButton title={TITLE} size="barButton" />
            <SK.SKButton title={TITLE} size="toastButton" />
            <SK.SKButton title={TITLE} size="huddleBarButton" />
          </>
        ),
      },
      {
        id: 'longText',
        label: 'long title, full width (wraps)',
        snapshot: 'SKButtonSnapshotTests/testButtonDefaultLongText',
        layout: 'fill',
        render: () => <SK.SKButton title="This is a very long title that should cut off at some point" style={{ width: '100%' }} />,
      },
    ],
  },
  {
    name: 'SKIconButton',
    group: 'Buttons',
    swift: 'DesignerComponents/IconButton/SKIconButton.swift',
    about:
      'A 20 pt icon, bare (dims to 0.75 when pressed) or on a circular backdrop that scales to 0.9 and takes its selected fill. small 40, medium 56, accessory 20, nativeMinimum 44; caption, shadow, stroke, pulse, disabled and processing states; the iOS 26 glass circle.',
    usage: `<SKIconButton icon="add_reaction" onClick={…} />
<SKIconButton icon="add_reaction" size="medium" iconColor="var(--sk_lilypad_green)"
  backdrop={{ unselected: 'var(--sk_foreground_low_solid)', selected: 'var(--sk_foreground_min_solid)', withShadow: true }} />
<SKIconButton icon="compose" size="medium" useGlassEffect backdrop={{ unselected: 'var(--theme_fabBackground)' }} iconColor="var(--theme_fabIcon)" />`,
    specimens: [
      {
        id: 'backdrop',
        label: 'small / medium with backdrop, + shadow, + stroke',
        snapshot: 'SKFloatingActionButtonSnapshotTests/testMediumButtonWithBackdropAndShadow',
        render: () => {
          const b = { unselected: 'var(--sk_foreground_low_solid)', selected: 'var(--sk_foreground_min_solid)' }
          return (
            <>
              <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" backdrop={b} />
              <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" backdrop={{ ...b, withShadow: true }} size="medium" />
              <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" backdrop={{ ...b, withStroke: true }} />
              <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" backdrop={b} isSelected />
              <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" backdrop={b} size="accessory" />
            </>
          )
        },
      },
      {
        id: 'bare',
        label: 'bare, with title, disabled, processing',
        snapshot: 'SKFloatingActionButtonSnapshotTests/testSmallButtonWithTitle',
        render: () => (
          <>
            <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" title="Add Reaction" />
            <SK.SKIconButton icon="add_reaction" iconColor="var(--sk_lilypad_green)" interactionState="disabled" />
            <SK.SKIconButton icon="add_reaction" backdrop={{ unselected: 'var(--sk_foreground_low_solid)' }} interactionState="processing" />
          </>
        ),
      },
      {
        id: 'glass',
        label: 'useGlassEffect (the compose FAB)',
        render: () => (
          <>
            <SK.SKIconButton icon="compose" size="medium" useGlassEffect backdrop={{ unselected: 'var(--theme_fabBackground)' }} iconColor="var(--theme_fabIcon)" />
            <SK.SKIconButton icon="plus" size="medium" useGlassEffect backdrop={{ unselected: 'var(--dt_color_base_primary)', withPulse: { color: 'var(--dt_color_surface_highlight_1)', repeatCount: 50 } }} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKPillButton',
    group: 'Buttons',
    swift: 'DesignerComponents/PillButton/SKPillButton.swift',
    about: 'A capsule with an emoji, label, icon (left or right) and a count badge on its top-right corner. small or medium insets; surfacePrimary, surfaceSecondary when pressed or selected; an optional outline.',
    usage: `<SKPillButton text="Add Reaction" />
<SKPillButton emoji="man-shrugging" text="Add Reaction" icon="channel" iconPosition="right" badge={{ count: 5 }} />
<SKPillButton text="Unreads" size="small" outlineColor="var(--sk_foreground_max_solid)" />`,
    specimens: [
      { id: 'text', label: 'medium, text only', snapshot: 'SKPillButtonSnapshotTests/testMediumButtonWithOnlyText', render: () => <SK.SKPillButton text="Add Reaction" /> },
      {
        id: 'everything',
        label: 'medium, emoji + text + icon + badge',
        snapshot: 'SKPillButtonSnapshotTests/testMediumButtonWithEverythingAndBadge',
        surfaceStyle: { paddingTop: 6 },
        render: () => <SK.SKPillButton emoji="man-shrugging" text="Add Reaction" icon="channel" iconColor="var(--dt_color_constants_white)" iconPosition="right" badge={{ count: 5 }} />,
      },
      {
        id: 'caption',
        label: 'caption text, small / medium: no 20 pt minimum without an icon (September 2026)',
        snapshot: 'SKPillButtonSnapshotTests/testSmallButtonWithShortCaptionText, testMediumButtonWithShortCaptionText',
        render: () => (
          <>
            <SK.SKPillButton text="Confirm" textFont="var(--sk-caption)" size="small" />
            <SK.SKPillButton text="Confirm" textFont="var(--sk-caption)" />
          </>
        ),
      },
      {
        id: 'small',
        label: 'small: icon left, outline, selected, disabled',
        snapshot: 'SKPillButtonSnapshotTests/testSmallButtonWithTextAndOutline',
        render: () => (
          <>
            <SK.SKPillButton text="Add Reaction" size="small" icon="add_reaction" />
            <SK.SKPillButton text="Add Reaction" size="small" outlineColor="var(--sk_foreground_max_solid)" />
            <SK.SKPillButton text="Selected" size="small" isSelected shouldAnimateTransition />
            <SK.SKPillButton text="Disabled" size="small" isEnabled={false} />
          </>
        ),
      },
    ],
  },
  // ------------------------------------------------------------------------------------------------ Controls
  {
    name: 'SKSwitch',
    group: 'Selection controls',
    swift: 'DesignerComponents/Switch/SKSwitch.swift',
    about: 'The iOS 26 system switch (SKSwitch wraps a UISwitch since September 2026): 61 × 28, a highlight2.content track when on, dimmed to 35 % when disabled.',
    usage: `<SKSwitch isOn={on} onToggled={setOn} />
<SKSwitch isOn isEnabled={false} />`,
    specimens: [
      {
        id: 'states',
        label: 'on, off, on disabled, off disabled',
        snapshot: 'SKSwitchSnapshotTests/testIsOnandEnabledSwitch …',
        render: () => (
          <>
            <SK.SKSwitch isOn />
            <SK.SKSwitch />
            <SK.SKSwitch isOn isEnabled={false} />
            <SK.SKSwitch isEnabled={false} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKCheckbox',
    group: 'Selection controls',
    swift: 'DesignerComponents/Checkbox/SKCheckbox.swift',
    about: 'The circular 21 pt check on a clear background. Tapping flips it; the fill grows from the center.',
    usage: `<SKCheckbox isOn={checked} onToggled={setChecked} />
<SKCheckbox isOn isEnabled={false} />`,
    specimens: [
      {
        id: 'states',
        label: 'on, off, on disabled, off disabled',
        snapshot: 'SKCheckboxSnapshotTests/testIsOnandEnabledCheckbox …',
        render: () => (
          <>
            <SK.SKCheckbox isOn />
            <SK.SKCheckbox isOn={false} />
            <SK.SKCheckbox isOn isEnabled={false} />
            <SK.SKCheckbox isOn={false} isEnabled={false} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKRadioButton',
    group: 'Selection controls',
    swift: 'DesignerComponents/RadioButton/SKRadioButton.swift',
    about: 'A 20 pt single-choice radio. Tapping one that is on does nothing.',
    usage: `<SKRadioButton isOn={choice === 'a'} onToggled={() => setChoice('a')} />`,
    specimens: [
      {
        id: 'states',
        label: 'on, off, on disabled, off disabled',
        snapshot: 'SKRadioButtonSnapshotTests/testIsOnAndEnabledRadioButton …',
        render: () => (
          <>
            <SK.SKRadioButton isOn />
            <SK.SKRadioButton isOn={false} />
            <SK.SKRadioButton isOn isEnabled={false} />
            <SK.SKRadioButton isOn={false} isEnabled={false} />
          </>
        ),
      },
      {
        id: 'group',
        label: 'a group (tap one)',
        render: () => (
          <Stateful initial={0}>
            {(v, set) => (
              <>
                {[0, 1, 2].map((i) => (
                  <SK.SKRadioButton key={i} isOn={v === i} onToggled={() => set(i)} />
                ))}
              </>
            )}
          </Stateful>
        ),
      },
    ],
  },
  {
    name: 'SKBadge',
    group: 'Selection controls',
    swift: 'DesignerComponents/Badge/SKBadge.swift',
    about: 'Count, text and tag badges: an 18 pt pill (20 pt rounded rectangle), Lato Bold 12, counts above the max read "9+".',
    usage: `<SKBadge count={3} />
<SKBadge count={222} icon="headphones" />
<SKBadge title="Last used" />
<SKBadge title="PRO" badgeStyle="emphasized" backgroundColor="var(--sk_aubergine)" shape="roundedRectangle" />`,
    specimens: [
      {
        id: 'counts',
        label: '2, 22, 9+ (max 9), 99+ (max 99), icon + 9+',
        snapshot: 'SKBadgeSnapshotTests/testBadgeTripleDigitWithIcon',
        render: () => (
          <>
            <SK.SKBadge count={2} />
            <SK.SKBadge count={22} maxBadgeCount={99} />
            <SK.SKBadge count={22} />
            <SK.SKBadge count={222} maxBadgeCount={99} />
            <SK.SKBadge count={222} icon="headphones" />
          </>
        ),
      },
      {
        id: 'styles',
        label: 'deemphasized, text, tag, rounded rectangle',
        snapshot: 'SKBadgeSnapshotTests/testBadgeTextDefault, testBadgeRoundedRectangleShape',
        render: () => (
          <>
            <SK.SKBadge count={2} badgeStyle="deemphasized" />
            <SK.SKBadge title="Last used" />
            <SK.SKBadge title="New" badgeStyle="tag" />
            <SK.SKBadge title="PRO" badgeStyle="emphasized" backgroundColor="var(--sk_aubergine)" textColor="var(--dt_color_constants_white)" shape="roundedRectangle" />
            <SK.SKBadge count={1} withPulse={{ color: 'var(--dt_color_surface_important)', repeatCount: 100 }} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKDot',
    group: 'Selection controls',
    swift: 'DesignerComponents/Dot/SKDot.swift',
    about: 'New in September 2026: a 12 pt status (unread) dot with 2 pt of padding, 16 pt overall, important.baseInverse by default. Also a list-row accessory ({ dot: {} }).',
    usage: `<SKDot />
<SKDot color="var(--dt_color_palettes_grass_70)" accessibilityLabel="Unread" />`,
    specimens: [
      { id: 'default', label: 'default color (important.baseInverse)', snapshot: 'SKDotSnapshotTests/testDefaultColor', render: () => <SK.SKDot /> },
      { id: 'custom', label: 'custom color (grass 70)', snapshot: 'SKDotSnapshotTests/testCustomColor', render: () => <SK.SKDot color="var(--dt_color_palettes_grass_70)" /> },
    ],
  },
  // ------------------------------------------------------------------------------------------------ Progress
  {
    name: 'SKSpinner',
    group: 'Progress',
    swift: 'DesignerComponents/Spinner/SKSpinner.swift',
    about: 'The ring spinner: small 12, medium 18, large 24, extraLarge 46, jumbo 52; darkOnLight (lagoon), lightOnDark, monochrome, custom. SKCircularProgressIndicator is its determinate twin.',
    usage: `<SKSpinner />
<SKSpinner size="large" color="lightOnDark" />
<SKCircularProgressIndicator progress={0.4} size="large" />`,
    specimens: [
      {
        id: 'sizes',
        label: 'small → jumbo, darkOnLight',
        snapshot: 'SKSpinnerSnapshotTests/testSmallSize … testJumboSize',
        render: () => (
          <>
            {(['small', 'medium', 'large', 'extraLarge', 'jumbo'] as const).map((s) => (
              <SK.SKSpinner key={s} size={s} />
            ))}
          </>
        ),
      },
      {
        id: 'colors',
        label: 'monochrome, lightOnDark (on a dark tile), circular progress 0.4',
        snapshot: 'SKSpinnerSnapshotTests/testMonochromeColor',
        render: () => (
          <>
            <SK.SKSpinner size="large" color="monochrome" />
            <span style={{ background: 'var(--dt_color_base_inverse_primary)', padding: 8, borderRadius: 8, display: 'inline-flex' }}>
              <SK.SKSpinner size="large" color="lightOnDark" />
            </span>
            <SK.SKCircularProgressIndicator progress={0.4} size="large" />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKProgressBar',
    group: 'Progress',
    swift: 'DesignerComponents/ProgressBar/SKProgressBar.swift',
    about: 'A determinate bar: small 2, medium 4, xLarge 12 pt; lagoon on baseTertiary.',
    usage: `<SKProgressBar progress={0.5} />
<SKProgressBar progress={0.5} size="xLarge" roundCorners progressTintColor="var(--sk_raspberry_red)" />`,
    specimens: [
      {
        id: 'sizes',
        label: '0.5 at small, medium, xLarge (roundCorners); 0 and 1',
        snapshot: 'SKProgressBarSnapshotTests/testHalfwayProgress',
        layout: 'fill',
        render: () => (
          <div style={{ display: 'grid', gap: 12 }}>
            <SK.SKProgressBar progress={0.5} />
            <SK.SKProgressBar progress={0.5} size="medium" progressTintColor="var(--sk_raspberry_red)" />
            <SK.SKProgressBar progress={0.5} size="xLarge" roundCorners />
            <SK.SKProgressBar progress={0} size="medium" />
            <SK.SKProgressBar progress={1} size="medium" />
          </div>
        ),
      },
    ],
  },
  {
    name: 'SKLoadingBar',
    group: 'Progress',
    swift: 'DesignerComponents/LoadingBar/SKLoadingBar.swift',
    about: 'The indeterminate bar under a nav bar: a segment sweeping every 1.1 s, and a green flash on completion.',
    usage: `<SKLoadingBar />
<SKLoadingBar state={done ? 'loadingComplete' : 'loading'} />`,
    specimens: [
      { id: 'loading', label: 'loading, medium 2 pt', snapshot: 'SKLoadingBarSnapshotTests/testLoadingAnimation', layout: 'fill', render: () => <SK.SKLoadingBar /> },
      { id: 'large', label: 'loading, large 3 pt', layout: 'fill', render: () => <SK.SKLoadingBar size="large" /> },
      {
        id: 'complete',
        label: 'tap to complete / restart',
        layout: 'fill',
        render: () => (
          <Stateful initial={false}>
            {(done, set) => (
              <div onClick={() => set(!done)} style={{ display: 'grid', gap: 8 }}>
                <SK.SKLoadingBar state={done ? 'loadingComplete' : 'loading'} />
                <span className="sk-caption" style={{ padding: '0 16px', color: 'var(--dt_color_content_secondary)' }}>
                  {done ? 'loadingComplete (tap to restart)' : 'loading (tap to complete)'}
                </span>
              </div>
            )}
          </Stateful>
        ),
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ Feedback
  {
    name: 'SKBanner',
    group: 'Feedback and empty states',
    swift: 'DesignerComponents/Banner/SKBanner.swift, Banner.swift',
    about:
      'Inline alert card: 11 tones (opaque base or transparent surface), regular or small, an optional heading (regular only), a leading ornament (the tone icon, an icon or emoji on a circle, an image, a badge), trailing accessories and an action button. Selectable banners dim to 0.6 while pressed.',
    usage: `<SKBanner type="regular" tone="info" text="All of the alert text goes here." />
<SKBanner type="regular" tone="genericLight" heading="Your alert heading" text="…" />
<SKBanner type="small" tone="coachmark" text="…" actionButton={{ title: 'Action' }} onActionButtonTapped={…} />
<SKBanner type="regular" tone="info" text="…" accessories={['chevron']} isSelectable onSelected={…} />
<SKBanner type="regular" tone="genericLight" text="…" ornament={{ badge: 'PRO', textColor: '#fff', backgroundColor: 'var(--sk_aubergine)' }} />`,
    specimens: [
      ...(['genericLight', 'info', 'success', 'warning', 'error', 'trials', 'trials_new', 'coachmark'] as const).map((tone) => ({
        id: `regular-${tone}`,
        label: `regular, ${tone}`,
        snapshot: `SKBannerSnapshotTests/testBannerRegular${tone === 'genericLight' ? 'Generic' : tone === 'trials_new' ? 'Trials_New' : tone === 'coachmark' ? '' : tone[0].toUpperCase() + tone.slice(1)}`.replace('testBannerRegular', tone === 'coachmark' ? 'testBannerCoachmark' : 'testBannerRegular'),
        render: () => <SK.SKBanner type="regular" tone={tone} text={BANNER_TEXT} />,
      })),
      {
        id: 'heading',
        label: 'regular with heading',
        snapshot: 'SKBannerSnapshotTests/testBannerRegularGenericWithHeading',
        render: () => <SK.SKBanner type="regular" tone="genericLight" heading="Your alert heading" text={BANNER_TEXT} />,
      },
      ...(['genericLight', 'info', 'success', 'warning', 'error'] as const).map((tone) => ({
        id: `small-${tone}`,
        label: `small, ${tone}`,
        snapshot: `SKBannerSnapshotTests/testBannerSmall${tone === 'genericLight' ? 'Generic' : tone[0].toUpperCase() + tone.slice(1)}`,
        render: () => <SK.SKBanner type="small" tone={tone} text={BANNER_TEXT} />,
      })),
      {
        id: 'action',
        label: 'small coachmark with an action button, full width',
        snapshot: 'SKBannerSnapshotTests/testBannerActionButton',
        layout: 'flush',
        render: () => <SK.SKBanner type="small" tone="coachmark" text={BANNER_TEXT} actionButton={{ title: 'Action' }} />,
      },
      {
        id: 'accessory',
        label: 'selectable, chevron accessory (press it)',
        snapshot: 'SKBannerSnapshotTests/testBannerAccessory',
        render: () => <SK.SKBanner type="regular" tone="info" text={BANNER_TEXT} accessories={['chevron']} isSelectable />,
      },
      {
        id: 'ornaments',
        label: 'ornaments: emoji on a circle, icon on a circle, PRO badge',
        snapshot: 'SKBannerSnapshotTests/testBannerRegularGenericEmojiWithBackground',
        render: () => (
          <div style={{ display: 'grid', gap: 12 }}>
            <SK.SKBanner type="regular" tone="coachmark" text={BANNER_TEXT} ornament={{ emoji: '+1', backgroundCircle: {} }} />
            <SK.SKBanner type="regular" tone="genericLight" text={BANNER_TEXT} ornament={{ icon: 'paper_plane', color: 'var(--dt_color_content_inverse_primary)', backgroundCircle: { color: 'var(--theme_baseInversePrimary)' } }} />
            <SK.SKBanner type="regular" tone="genericLight" text={BANNER_TEXT} ornament={{ badge: 'PRO', textColor: 'var(--dt_color_constants_white)', backgroundColor: 'var(--sk_aubergine)' }} />
          </div>
        ),
      },
      {
        id: 'pro',
        label: 'pro tone, heading and icon, full width',
        snapshot: 'SKBannerSnapshotTests/testBannerProToneWithHeadingAndIcon',
        layout: 'flush',
        render: () => <SK.SKBanner type="regular" tone="pro" heading="View Excalidraw's Reply" text="Tap to view the results returned by the tool." ornament={{ icon: 'open_in_window' }} />,
      },
      {
        id: 'wrap',
        label: 'regular, long text wraps, full width',
        snapshot: 'SKBannerSnapshotTests/testBannerRegularGenericTextWrap',
        layout: 'flush',
        render: () => (
          <SK.SKBanner
            type="regular"
            tone="genericLight"
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
          />
        ),
      },
    ],
  },
  {
    name: 'SKEmptyState',
    group: 'Feedback and empty states',
    swift: 'DesignerComponents/EmptyState/SKEmptyState.swift',
    about:
      'A centered empty or error screen: an illustration (120 pt), emoji or icon (48 pt), title, adjacent tag, body and medium buttons. It fills its container; give it a height. SKGenericErrorEmptyState is the "Something Went Wrong" preset.',
    usage: `<SKEmptyState content={{ illustration: 'activity' }} title="Nothing here yet" body="…" buttons={[{ title: 'Browse channels', onClick }]} />
<SKEmptyState content={{ icon: 'schedule_send' }} title="Great title" body="…" />
<SKGenericErrorEmptyState onRetry={reload} />
// illustrations: ${Object.keys(SK.EMPTY_STATE_ILLUSTRATIONS).join(', ')}`,
    specimens: [
      {
        id: 'full',
        label: 'image, title, body, button (393 × 852)',
        snapshot: 'SKEmptyStateSnapshotTests/testEmptyStateFull',
        layout: 'flush',
        render: () => (
          <SK.SKEmptyState
            style={{ height: 852 }}
            content={{ illustration: 'emoji_no_results' }}
            title="Great title"
            body="Some copy to explain what the heck is goin on!"
            buttons={[{ title: 'Primary action' }]}
          />
        ),
      },
      {
        id: 'icon',
        label: 'icon, title, tag, body',
        snapshot: 'SKEmptyStateSnapshotTests/testEmptyStateAdjacentText',
        layout: 'flush',
        render: () => (
          <SK.SKEmptyState
            style={{ height: 360 }}
            content={{ icon: 'schedule_send' }}
            title="Great title"
            adjacentText={{ text: 'APP', textColor: 'var(--dt_color_content_highlight_1)', backgroundColor: 'var(--dt_color_base_highlight_1)' }}
            body="Some copy to explain what the heck is goin on!"
          />
        ),
      },
      {
        id: 'buttons',
        label: 'body and two buttons',
        snapshot: 'SKEmptyStateSnapshotTests/testEmptyStateBodyAndTwoButtons',
        layout: 'flush',
        render: () => <SK.SKEmptyState style={{ height: 220 }} body="Some copy to explain what the heck is goin on!" buttons={[{ title: 'Primary action' }, { title: 'Another action' }]} />,
      },
      {
        id: 'illustration',
        label: 'illustration: activity (light / dark art)',
        layout: 'flush',
        render: () => <SK.SKEmptyState style={{ height: 380 }} content={{ illustration: 'activity' }} title="You're all caught up" body="Mentions, reactions and replies will show up here." />,
      },
      { id: 'error', label: 'SKGenericErrorEmptyState', layout: 'flush', render: () => <SK.SKGenericErrorEmptyState style={{ height: 400 }} /> },
    ],
  },
  {
    name: 'SKToast',
    group: 'Feedback and empty states',
    swift: 'DesignerComponents/Toast/SKToast.swift',
    about: 'The centered HUD. It scales in from 0.9, holds for 0.55 s by default and leaves; put it in the screen and it centers itself. These specimens are held with presentation="manual".',
    usage: `{copied && <SKToast message="Link copied" onDismissed={() => setCopied(false)} />}
<SKToast message="Uploading…" presentation="manual" contentStyle={{ activityIndicator: <SKSpinner size="extraLarge" color="lightOnDark" /> }} />`,
    specimens: [
      { id: 'message', label: 'messageOnly', layout: 'flush', surfaceStyle: { position: 'relative', height: 140 }, render: () => <SK.SKToast message="Link copied" presentation="manual" /> },
      {
        id: 'activity',
        label: 'activityIndicator, wrapping message',
        layout: 'flush',
        surfaceStyle: { position: 'relative', height: 260 },
        render: () => <SK.SKToast message="Uploading your file, this can take a moment" presentation="manual" contentStyle={{ activityIndicator: <SK.SKSpinner size="extraLarge" color="lightOnDark" /> }} />,
      },
      {
        id: 'auto',
        label: 'automatic (tap to show again)',
        layout: 'flush',
        surfaceStyle: { position: 'relative', height: 140 },
        render: () => (
          <Stateful initial={0}>
            {(n, set) => (
              <div style={{ height: 140 }} onClick={() => set(n + 1)}>
                <span className="sk-caption" style={{ display: 'block', padding: 12, color: 'var(--dt_color_content_secondary)' }}>
                  Tap to show the toast
                </span>
                {n > 0 && <SK.SKToast key={n} message="Saved" />}
              </div>
            )}
          </Stateful>
        ),
      },
    ],
  },
  {
    name: 'SKNavigationTitle',
    group: 'Feedback and empty states',
    swift: 'DesignerComponents/NavigationTitle/SKNavigationTitle.swift',
    about: 'The nav-bar title view: Lato Black 17 over a Lato 15 subtitle, with icon, image, count or badge ornaments on either side of each line.',
    usage: `<SKNavigationTitle title="design" leftTitleOrnament={{ icon: 'channel' }} subtitle="16 members" onSelected={openDetails} />
<SKNavigationTitle title="Title" subtitle="Subtitle" rightSubtitleOrnament={{ icon: 'caret_down' }} />`,
    specimens: [
      { id: 'title', label: 'title', snapshot: 'SKNavigationTitleSnapshotTests/testTitle', render: () => <SK.SKNavigationTitle title="Title" /> },
      { id: 'subtitle', label: 'title and subtitle', snapshot: 'SKNavigationTitleSnapshotTests/testSubtitle', render: () => <SK.SKNavigationTitle title="Title" subtitle="Subtitle" /> },
      {
        id: 'ornaments',
        label: 'icons, count, image, badge',
        snapshot: 'SKNavigationTitleSnapshotTests/testTitleWithBothIcons',
        render: () => (
          <>
            <SK.SKNavigationTitle title="Title" leftTitleOrnament={{ icon: 'lock_filled' }} rightTitleOrnament={{ icon: 'caret_down' }} />
            <SK.SKNavigationTitle title="Title" leftTitleOrnament={{ count: 4 }} />
            <SK.SKNavigationTitle title="Title" leftTitleOrnament={{ image: AV.lisa }} subtitle="Subtitle" rightSubtitleOrnament={{ icon: 'caret_down' }} />
            <SK.SKNavigationTitle title="Title" rightTitleOrnament={{ badge: { title: 'PRO', badgeStyle: 'emphasized', backgroundColor: 'var(--sk_aubergine)', shape: 'roundedRectangle' } }} />
          </>
        ),
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ Text inputs
  {
    name: 'SKTextField',
    group: 'Text inputs and tokens',
    swift: 'DesignerComponents/TextField/SKTextField.swift',
    about: 'A bordered single-line field (42 pt): ornament, clear button while editing, spinner, ghost text, secure entry. Click in to type; the iOS keyboard comes up in the simulator.',
    usage: `<SKTextField placeholderText="Channel name" text={name} onTextChanged={setName} />
<SKTextField ornament={{ ornament: { icon: 'search' }, size: 'small' }} placeholderText="Search…" />
<SKTextField isSecureTextEntry shouldShowSecureTextEntryToggle placeholderText="Password" />`,
    specimens: [
      { id: 'default', label: 'default', snapshot: 'SKTextFieldSnapshotTests/testTextFieldDefault', layout: 'flush', render: () => <SK.SKTextField /> },
      {
        id: 'ornament',
        label: 'ornament and placeholder',
        snapshot: 'SKTextFieldSnapshotTests/testTextFieldWithOrnamentAndPlaceholder',
        layout: 'flush',
        render: () => <SK.SKTextField ornament={{ ornament: { icon: 'user_add' }, size: 'small' }} placeholderText="Special placeholder..." />,
      },
      { id: 'text', label: 'with text', snapshot: 'SKTextFieldSnapshotTests/testTextFieldWithText', layout: 'flush', render: () => <SK.SKTextField text="This is some text" /> },
      { id: 'spinner', label: 'spinner', snapshot: 'SKTextFieldSnapshotTests/testTextFieldWithSpinner', layout: 'flush', render: () => <SK.SKTextField text="This is some text" shouldShowLoadingIndicator /> },
      { id: 'disabled', label: 'disabled', snapshot: 'SKTextFieldSnapshotTests/testTextFieldDisabled', layout: 'flush', render: () => <SK.SKTextField text="This is some text" isEnabled={false} /> },
      {
        id: 'suggestion',
        label: 'matching suggestion',
        snapshot: 'SKTextFieldSnapshotTests/testTextFieldWithMatchingSuggestion',
        layout: 'flush',
        render: () => <SK.SKTextField text="th" ghostText={{ suggestedResult: 'This is some text' }} />,
      },
      {
        id: 'trailing',
        label: 'placeholder with trailing ghost text',
        snapshot: 'SKTextFieldSnapshotTests/testTextFieldWithPlaceholderAndTrailingText',
        layout: 'flush',
        render: () => <SK.SKTextField placeholderText="workspace-url" ghostText={{ trailing: '.slack.com', color: 'var(--sk_primary_foreground)', font: 'var(--sk-body-bold)' }} />,
      },
      { id: 'secure', label: 'secure entry with toggle', layout: 'flush', render: () => <SK.SKTextField placeholderText="Password" text="hunter2" isSecureTextEntry shouldShowSecureTextEntryToggle /> },
    ],
  },
  {
    name: 'SKSearchBar',
    group: 'Text inputs and tokens',
    swift: 'DesignerComponents/SearchBar/SKSearchBar.swift',
    about: "The in-page search field: magnifier, baseSecondary fill, outlineTertiary border, 'Search…'. Type in it: the clear button appears, and a suggestedResult completes the typed prefix in gray.",
    usage: `<SKSearchBar text={query} onTextChanged={setQuery} />
<SKSearchBar text="Ja" suggestedResult="Jason" />
<SKSearchBar useLiquidGlass shouldShowCancelButton onCancelTapped={close} />`,
    specimens: [
      { id: 'empty', label: 'empty, with ornament', snapshot: 'SKSearchBarSnapshotTests/testEmptySearchBarWithOrnament', layout: 'flush', render: () => <SK.SKSearchBar /> },
      { id: 'noOrnament', label: 'empty, no ornament', snapshot: 'SKSearchBarSnapshotTests/testEmptySearchBarNoOrnament', layout: 'flush', render: () => <SK.SKSearchBar shouldShowSearchOrnament={false} /> },
      {
        id: 'populated',
        label: 'populated (long text truncates)',
        snapshot: 'SKSearchBarSnapshotTests/testPopulatedSearchBar',
        layout: 'flush',
        render: () => <SK.SKSearchBar text="This is very long text that should cause overflow." />,
      },
      { id: 'suggested', label: 'suggested result', snapshot: 'SKSearchBarSnapshotTests/testPopulatedSearchBarWithSuggestedResult', layout: 'flush', render: () => <SK.SKSearchBar text="Ja" suggestedResult="Jason" /> },
      { id: 'loading', label: 'loading indicator', snapshot: 'SKSearchBarSnapshotTests/testEmptySearchBarWithLoadingIndicator', layout: 'flush', render: () => <SK.SKSearchBar shouldShowLoadingIndicator /> },
      { id: 'shadow', label: 'shadow', snapshot: 'SKSearchBarSnapshotTests/testEmptySearchBarWithShadow', layout: 'flush', render: () => <SK.SKSearchBar shouldShowShadow /> },
      {
        id: 'leadingOrnament',
        label: 'custom leading ornament: channel icon (small), group avatar count (verySmall) (September 2026)',
        snapshot: 'SKSearchBarSnapshotTests/testSearchBarWithCustomLeadingOrnament, …WithGroupAvatarLeadingOrnament',
        layout: 'flush',
        render: () => (
          <>
            {/* the test tints the icon UIKit's secondaryLabel */}
            <SK.SKSearchBar leadingOrnament={{ ornament: { icon: 'channel', color: 'var(--sk-ui-secondary-label)' }, size: 'small' }} />
            <SK.SKSearchBar leadingOrnament={{ ornament: { groupAvatar: { memberCount: 3 } }, size: 'verySmall' }} />
          </>
        ),
      },
      {
        id: 'cancel',
        label: 'cancel button: "Cancel", and the Liquid Glass bar with its glass ✕ (September 2026)',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKSearchBar shouldShowCancelButton onCancelTapped={() => {}} />
            <SK.SKSearchBar useLiquidGlass shouldShowCancelButton onCancelTapped={() => {}} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKSearchBarButton',
    group: 'Text inputs and tokens',
    swift: 'DesignerComponents/SearchBarButton/SKSearchBarButton.swift',
    about: 'A tappable field that opens search: basePrimary fill, baseTertiary while pressed.',
    usage: `<SKSearchBarButton onButtonTapped={openSearch} />`,
    // no snapshot of its own: SKSearchBarButtonSnapshotTests/testSearchBarButton renders an SKSearchBar (SKSearchBarButtonSnapshotTests.swift:14)
    specimens: [{ id: 'default', label: 'default (press it)', layout: 'flush', render: () => <SK.SKSearchBarButton /> }],
  },
  {
    name: 'SKTokenView',
    group: 'Text inputs and tokens',
    swift: 'DesignerComponents/TokenView/SKTokenView.swift',
    about: 'Chips for people, channels and workspaces in "To:" fields and filters, and inline tags: resolved (default, warning, custom tones), unresolved (spinner) and error; selected and disabled; dismissible.',
    usage: `<SKTokenView ornament={{ channel: { type: 'public' } }} text="design" />
<SKTokenView ornament={{ member: { src: avatar } }} text="Steve" isSelected isDismissible onDismissTapped={remove} />
<SKTokenView state="unresolved" text="someone@acme.com" />
<SKTokenView ornament={{ icon: 'lists' }} text="Lists" spacing="inline" colors="uniform" />   // a tag`,
    specimens: [
      {
        id: 'resolved',
        label: 'resolved: channel (external), selected, disabled',
        snapshot: 'SKTokenViewSnapshotTests/testTokenResolved, …Selected, …Disabled',
        render: () => (
          <>
            <SK.SKTokenView ornament={{ channel: { type: 'public', shareType: 'external' } }} text="This is a token" />
            <SK.SKTokenView ornament={{ channel: { type: 'public', shareType: 'external' } }} text="This is a token" isSelected />
            <SK.SKTokenView ornament={{ channel: { type: 'public', shareType: 'external' } }} text="This is a token" isDisabled />
          </>
        ),
      },
      {
        id: 'dismiss',
        label: 'with dismiss: resolved, selected, unresolved, error',
        snapshot: 'SKTokenViewSnapshotTests/testTokenResolvedWithDismiss …',
        render: () => (
          <>
            <SK.SKTokenView ornament={{ channel: { type: 'public' } }} text="This is a token" isDismissible />
            <SK.SKTokenView ornament={{ channel: { type: 'public' } }} text="This is a token" isSelected isDismissible />
            <SK.SKTokenView state="unresolved" text="This is a token" isDismissible />
            <SK.SKTokenView state="error" text="This is a token" isDismissible />
          </>
        ),
      },
      {
        id: 'states',
        label: 'warning, warning selected, unresolved, unresolved selected, error, error selected',
        snapshot: 'SKTokenViewSnapshotTests/testTokenResolvedWarning …',
        render: () => (
          <>
            <SK.SKTokenView ornament={{ channel: { type: 'public', shareType: 'external' } }} tone="warning" text="This is a token" />
            <SK.SKTokenView ornament={{ channel: { type: 'public', shareType: 'external' } }} tone="warning" text="This is a token" isSelected />
            <SK.SKTokenView state="unresolved" text="This is a token" />
            <SK.SKTokenView state="unresolved" text="This is a token" isSelected />
            <SK.SKTokenView state="error" text="This is a token" />
            <SK.SKTokenView state="error" text="This is a token" isSelected />
          </>
        ),
      },
      {
        id: 'ornaments',
        label: 'ornaments: private + enterprise, member photo, member icon, workspace, number, icon, none',
        snapshot: 'SKTokenViewSnapshotTests/testTokenResolvedChannelOrnamentEnterprise …',
        render: () => (
          <>
            <SK.SKTokenView ornament={{ channel: { type: 'private', shareType: 'enterprise' } }} text="This is a token" />
            <SK.SKTokenView ornament={{ member: { src: AV.lisa } }} text="This is a token" />
            <SK.SKTokenView ornament={{ member: { icon: 'user_hide' } }} text="This is a token" />
            <SK.SKTokenView ornament={{ workspace: { src: AV.acme, name: 'Acme' } }} text="This is a token" />
            <SK.SKTokenView ornament={{ number: 2 }} text="This is a token" />
            <SK.SKTokenView ornament={{ icon: 'paper_plane' }} text="This is a token" />
            <SK.SKTokenView text="This is a token" />
          </>
        ),
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixture: workspace ornament (slackbot image): a 24 pt SKWorkspaceAvatar since September 2026; a trailing accessory icon",
        snapshot: 'SKTokenViewSnapshotTests/testTokenResolvedWorkspaceOrnament',
        render: () => (
          <>
            <SK.SKTokenView ornament={{ workspace: { src: FIXTURE.slackbot, name: 'This is a token' } }} text="This is a token" />
            <SK.SKTokenView ornament={{ channel: { type: 'public' } }} text="This is a token" trailingAccessoryIcon="caret_down" />
          </>
        ),
      },
      {
        id: 'tags',
        label: 'tags (inline, uniform colors): text, dismissible, icon only',
        snapshot: 'SKTokenViewSnapshotTests/testTagDefault, testTagWithDismiss, testTestIconOnly',
        render: () => (
          <>
            <SK.SKTokenView ornament={{ icon: 'lists' }} text="This is a token" spacing="inline" colors="uniform" />
            <SK.SKTokenView ornament={{ icon: 'lists' }} text="This is a token" spacing="inline" colors="uniform" isDismissible />
            <SK.SKTokenView ornament={{ icon: 'lists' }} spacing="inline" colors="uniform" />
            <SK.SKTokenView ornament={{ icon: 'lists' }} spacing="inline" colors="uniform" isDismissible />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKTokenBar',
    group: 'Text inputs and tokens',
    swift: 'DesignerComponents/TokenBar/SKTokenBar.swift',
    about: 'Wrapping tokens, 8 pt apart, at most two rows by default with the rest collapsed into "+N". Dismiss tokens to watch it reflow.',
    usage: `<SKTokenBar tokens={people.map((p) => ({ ornament: { member: { src: p.avatar } }, text: p.name, isDismissible: true }))}
  onTokenDismissed={(i) => remove(i)} />`,
    specimens: [
      {
        id: 'unlimited',
        label: 'maximumRowCount 0 (unlimited)',
        snapshot: 'SKTokenBarSnapshotTests/testTokenBarLarge (light only)',
        layout: 'flush',
        render: () => (
          <SK.SKTokenBar
            maximumRowCount={0}
            tokens={[
              { ornament: { channel: { type: 'public' } }, text: 'team-slack-kit' },
              { ornament: { channel: { type: 'private' } }, text: 'avengers' },
              { ornament: { member: { src: AV.arcadio } }, text: 'Steve' },
              { ornament: { workspace: { src: AV.acme } }, text: 'Acme' },
              { ornament: { icon: 'user_groups' }, text: 'ios-team' },
              { ornament: { icon: 'megaphone' }, text: 'announcements' },
              { ornament: { number: 5 }, text: 'mpdm-group' },
              { ornament: { channel: { type: 'public' } }, text: 'team-slack-kit' },
              { ornament: { channel: { type: 'private' } }, text: 'avengers' },
              { ornament: { member: { src: AV.arcadio } }, text: 'Steve' },
            ]}
          />
        ),
      },
      {
        id: 'twoRows',
        label: 'maximumRowCount 2 (+N), dismissible',
        snapshot: 'SKTokenBarSnapshotTests/testTokenBarTruncated',
        layout: 'flush',
        render: () => (
          <Stateful initial={['Lisa Dawson', 'Arcadio Buendía', 'Zoe Maxwell', 'Lee Hao', 'Geeta Joshi', 'Matt Brewer', 'Sara Parras', 'Rahul Khanna']}>
            {(names, set) => (
              <SK.SKTokenBar
                tokens={names.map((n, i) => ({ ornament: { member: { src: [AV.lisa, AV.arcadio, AV.zoe, AV.lee, AV.geeta, AV.matt][i % 6] } }, text: n, isDismissible: true }))}
                onTokenDismissed={(i) => set(names.filter((_, k) => k !== i))}
              />
            )}
          </Stateful>
        ),
      },
      { id: 'placeholder', label: 'empty, placeholder', layout: 'flush', render: () => <SK.SKTokenBar tokens={[]} placeholder="Add people" /> },
    ],
  },
  // ------------------------------------------------------------------------------------------------ Tabs
  {
    name: 'SKTabBar',
    group: 'Tabs',
    swift: 'DesignerComponents/TabBar/SKTabBar.swift, TabBarCollectionViewCell.swift',
    about: 'Tabs with an underline (default), a pill background or pill buttons; fitToBar (equal) or fitAllContent (intrinsic, scrolls when wider than the bar). Tap a tab: the underline animates; press to see the selection view and the 0.96 bounce.',
    usage: `<SKTabBar tabs={[{ title: 'Messages' }, { title: 'Files', count: { label: '4' } }]} selectionProgress={tab} onTabTapped={setTab} />
<SKTabBar tabs={…} widthMode="fitAllContent" tabDisplayStyle="pillBackground"
  selectedBackgroundColor="var(--sk_foreground_soft)" textColor="var(--sk_foreground_max)" selectedTextColor="var(--sk_primary_foreground)" />`,
    specimens: [
      {
        id: 'fitToBar',
        label: 'fitToBar, five tabs',
        snapshot: 'SKTabBarSnapshotTests/testFitToBar',
        layout: 'flush',
        render: () => <SK.SKTabBar tabs={['First tab', 'Second tab', 'Third tab', 'Fourth tab', 'Fifth tab'].map((title) => ({ title }))} />,
      },
      {
        id: 'small',
        label: 'fitAllContent, two tabs',
        snapshot: 'SKTabBarSnapshotTests/testSmallContentFitAllContent',
        layout: 'flush',
        render: () => <SK.SKTabBar widthMode="fitAllContent" tabs={[{ title: 'First tab' }, { title: 'Second tab' }]} />,
      },
      {
        id: 'large',
        label: 'fitAllContent, five tabs (drag to scroll)',
        snapshot: 'SKTabBarSnapshotTests/testLargeContentFitAllContent',
        layout: 'flush',
        render: () => <SK.SKTabBar widthMode="fitAllContent" tabs={['First tab', 'Second tab', 'Third tab', 'Fourth tab', 'Fifth tab'].map((title) => ({ title }))} />,
      },
      {
        id: 'numbers',
        label: 'count labels',
        snapshot: 'SKTabBarSnapshotTests/testNumbers',
        layout: 'flush',
        render: () => <SK.SKTabBar widthMode="fitAllContent" tabs={[{ title: 'First tab', count: { label: '4' } }, { title: 'Second tab' }, { title: 'Third tab', count: { label: '99+' } }]} />,
      },
      {
        id: 'badges',
        label: 'count badges',
        snapshot: 'SKTabBarSnapshotTests/testBadgedNumbers',
        layout: 'flush',
        render: () => <SK.SKTabBar widthMode="fitAllContent" tabs={[{ title: 'First tab', count: { badge: 4 } }, { title: 'Second tab' }, { title: 'Third tab', count: { badge: 100 } }]} />,
      },
      {
        id: 'icons',
        label: 'icons (sk_sky_blue, sk_raspberry_red)',
        snapshot: 'SKTabBarSnapshotTests/testIcons',
        layout: 'flush',
        render: () => (
          <SK.SKTabBar
            widthMode="fitAllContent"
            tabs={[
              { title: 'First tab', ornament: { icon: 'info', iconColor: 'var(--sk_sky_blue)' } },
              { title: 'Second tab' },
              { title: 'Third tab', count: { label: '99+' }, ornament: { icon: 'warning', iconColor: 'var(--sk_raspberry_red)' } },
            ]}
          />
        ),
      },
      {
        id: 'underlineColor',
        label: 'underline color sk_just_orange, dot',
        snapshot: 'SKTabBarSnapshotTests/testUnderline',
        layout: 'flush',
        render: () => <SK.SKTabBar widthMode="fitAllContent" underlineColor="var(--sk_just_orange)" tabs={[{ title: 'First tab' }, { title: 'Second tab', count: 'dot' }, { title: 'Third tab' }]} />,
      },
      {
        id: 'pill',
        label: 'pillBackground',
        snapshot: 'SKTabBarSnapshotTests/testPill',
        layout: 'flush',
        render: () => (
          <SK.SKTabBar
            widthMode="fitAllContent"
            tabDisplayStyle="pillBackground"
            animateSelection
            tabs={[{ title: 'First tab', ornament: { icon: 'info', iconColor: 'var(--sk_sky_blue)' } }, { title: 'Second tab' }, { title: 'Third tab', count: { badge: 100 }, ornament: { icon: 'warning', iconColor: 'var(--sk_raspberry_red)' } }]}
          />
        ),
      },
      {
        id: 'pillButton',
        label: 'pillButton',
        layout: 'flush',
        render: () => (
          <SK.SKTabBar
            widthMode="fitAllContent"
            tabDisplayStyle="pillButton"
            selectedBackgroundColor="var(--dt_color_base_inverse_primary)"
            textColor="var(--dt_color_content_primary)"
            selectedTextColor="var(--dt_color_content_inverse_primary)"
            borderColor="var(--dt_color_outline_tertiary)"
            tabs={[{ title: 'All' }, { title: 'Unreads' }, { title: 'Mentions' }]}
          />
        ),
      },
    ],
  },
  {
    name: 'SKPageController',
    group: 'Tabs',
    swift: 'DesignerComponents/PageController/SKPageController.swift',
    about: 'Swipeable pages under an SKTabBar; the underline follows the swipe. Drag the colored page sideways, or tap a tab.',
    usage: `<SKPageController tabBarPosition="top" pages={[
  { id: 'all', tab: { title: 'All' }, content: <AllList /> },
  { id: 'mentions', tab: { title: 'Mentions' }, content: <Mentions /> },
]} />`,
    specimens: [
      {
        id: 'pages',
        label: 'four pages (red, orange, yellow, green)',
        snapshot: 'SKPageControllerSnapshotTests/testFirstPage (light only)',
        layout: 'flush',
        render: () => (
          <div style={{ height: 300 }}>
            <SK.SKPageController
              tabBarPosition="top"
              pages={['#FF0000', '#FF8000', '#FFFF00', '#00FF00'].map((c) => ({
                id: c,
                tab: { title: c.slice(1) + '_1' },
                content: (
                  <div style={{ height: '100%', background: c, display: 'grid', placeItems: 'center', font: 'var(--sk-body)', color: '#000' }}>{c.slice(1)}_1</div>
                ),
              }))}
            />
          </div>
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ Avatars
  {
    name: 'SKMemberAvatar',
    group: 'Avatars and ornaments',
    swift: 'DesignerComponents/MemberAvatar/SKMemberAvatar.swift',
    about:
      'A person: photo, initials (SKFont.body on baseTertiary) or icon; radius min(20, 0.25 × side) or a circle. Annotations at the bottom-right, in a cut-out (small 24 … jumbo 120): presence, single- / multi-channel guest marks, an external member’s workspace icon, a small icon, external presence. The presence icon overhangs the corner.',
    usage: `<SKMemberAvatar src={u.avatar} name={u.realName} size="large" presence="active" />
<SKMemberAvatar src={u.avatar} name={u.realName} size="extraLarge" avatarType={{ externalMember: org.icon }} />
<SKMemberAvatar src={u.avatar} name={u.realName} size="extraLarge" avatarType="externalMemberWithPresence" presence="external-away" />
<SKMemberAvatar name="Steve Jobs" size="large" />          // initials "SJ"
<SKMemberAvatar icon="user_hide" name="Hidden" size="large" />
// presence from member flags: memberPresence({ isActive, isDnd, isUltraRestricted, isExternal, isSlackbot, … })`,
    specimens: [
      {
        id: 'sizes',
        label: 'small, smallPlus, medium, large, extraLarge, jumbo',
        snapshot: 'SKMemberAvatarSnapshotTests/testSmall… testJumboMemberAvatarMemberConfiguration',
        render: () => (
          <>
            {(['small', 'smallPlus', 'medium', 'large', 'extraLarge', 'jumbo'] as const).map((s) => (
              <SK.SKMemberAvatar key={s} src={AV.lisa} name="Lisa Dawson" size={s} />
            ))}
          </>
        ),
      },
      {
        id: 'presence',
        label: 'presence: active, away, dnd-active, dnd-away (extraLarge)',
        snapshot: 'testExtraLargeMemberAvatarOnlinePresenceConfiguration, …OfflineDndPresence…',
        render: () => (
          <>
            {(['active', 'away', 'dnd-active', 'dnd-away'] as const).map((p) => (
              <SK.SKMemberAvatar key={p} src={AV.lisa} name="Lisa Dawson" size="extraLarge" presence={p} />
            ))}
          </>
        ),
      },
      {
        id: 'guests',
        label: 'singleChannelGuest (large), multiChannelGuest, externalMember (extraLarge)',
        snapshot: 'testLargeMemberAvatarSingleChannelGuestConfiguration, testExtraLarge…MultiChannelGuest…, …ExternalWorkspace…',
        render: () => (
          <>
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="large" avatarType="singleChannelGuest" />
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="extraLarge" avatarType="multiChannelGuest" />
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="extraLarge" avatarType={{ externalMember: AV.acme }} />
          </>
        ),
      },
      {
        id: 'external',
        label: 'externalMemberWithPresence: external-active, -away, -dnd-active, -dnd-away',
        snapshot: 'testExtraLargeExternalMemberAvatar…PresenceConfiguration',
        render: () => (
          <>
            {(['external-active', 'external-away', 'external-dnd-active', 'external-dnd-away'] as const).map((p) => (
              <SK.SKMemberAvatar key={p} src={AV.lisa} name="Lisa Dawson" size="extraLarge" avatarType="externalMemberWithPresence" presence={p} />
            ))}
          </>
        ),
      },
      {
        id: 'fallbacks',
        label: 'initials, icon (large); icon + presence, Slackbot icon, Slackbot presence (small); deactivated',
        snapshot: 'testMemberInitialsConfiguration, testIconConfiguration, testSmallIconWithPresence…, testSlackbot…, testDeactivated…',
        render: () => (
          <>
            <SK.SKMemberAvatar name="Steve Jobs" size="large" />
            <SK.SKMemberAvatar icon="user_hide" name="Hidden member" size="large" />
            <SK.SKMemberAvatar icon="user_hide" name="Hidden member" size="small" presence="active" />
            <SK.SKMemberAvatar icon="heart_filled" name="Slackbot" size="small" presence="slackbot" />
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="small" presence="slackbot" />
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="large" isDeactivated />
          </>
        ),
      },
      {
        id: 'round',
        label: 'round (shouldMakeConcentric), with presence: the header avatar. Since September 2026 the circle stays whole and the presence sits on its edge',
        snapshot: 'testSmallPlusMemberAvatarOnlinePresenceConcentricConfiguration …',
        render: () => (
          <>
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="smallPlus" round presence="active" />
            <SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="large" round />
          </>
        ),
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixtures (tim_cook): medium; extraLarge active, dnd-away; SCG; MCG; external; concentric smallPlus active, dnd-away, slackbot; concentric extraLarge; small slackbot; deactivated",
        snapshot: 'SKMemberAvatarSnapshotTests/*',
        render: () => (
          <>
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="medium" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="extraLarge" presence="active" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="extraLarge" presence="dnd-away" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="large" avatarType="singleChannelGuest" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="extraLarge" avatarType="multiChannelGuest" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="extraLarge" avatarType={{ externalMember: FIXTURE.timCook }} />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="smallPlus" round presence="active" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="smallPlus" round presence="dnd-away" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="smallPlus" round presence="slackbot" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="extraLarge" round presence="active" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="small" presence="slackbot" />
            <SK.SKMemberAvatar src={FIXTURE.timCook} name="Tim Cook" size="large" isDeactivated />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKWorkspaceAvatar',
    group: 'Avatars and ornaments',
    swift: 'DesignerComponents/WorkspaceAvatar/SKWorkspaceAvatar.swift',
    about:
      'A workspace icon, or its initials in Lato Black 22; a 1 px outlineTertiary hairline. Top-right annotations in a cut-out (smallPlus and up): a mention-count badge ("9+"; a red dot at medium), an unreads dot, a lock for pending authentication. "active" draws a ring outside (medium and up); govSlack adds a lagoon tile.',
    usage: `<SKWorkspaceAvatar name="Acme" src={logo} size="extraLarge" workspaceType={{ mentionCount: 3 }} />
<SKWorkspaceAvatar name="Acme" src={logo} size="jumbo" workspaceType="hasUnreads" />
<SKWorkspaceAvatar name="Acme" src={logo} size="large" workspaceType="active" />
<SKWorkspaceAvatar name="Acme" src={logo} size="extraLarge" workspaceVariant="govSlack" />`,
    specimens: [
      {
        id: 'standard',
        label: 'standard, initials (extraLarge)',
        snapshot: 'SKWorkspaceAvatarSnapshotTests/testWorkspaceAvatarStandardExtraLarge, …NoneImageSourceExtraLarge',
        render: () => (
          <>
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="extraLarge" />
            <SK.SKWorkspaceAvatar name="Test Workspace" size="extraLarge" />
          </>
        ),
      },
      {
        id: 'mentions',
        label: 'mentionCount: 1 (medium), 10 (large), 10 (extraLarge)',
        snapshot: 'testWorkspaceAvatarMentionCountMedium, …Large, …ExtraLarge',
        render: () => (
          <>
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="medium" workspaceType={{ mentionCount: 1 }} />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="large" workspaceType={{ mentionCount: 10 }} />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="extraLarge" workspaceType={{ mentionCount: 10 }} />
          </>
        ),
      },
      {
        id: 'unreads',
        label: 'hasUnreads (jumbo, small: no dot below smallPlus)',
        snapshot: 'testWorkspaceAvatarHasUnreadsJumbo, …Small',
        render: () => (
          <>
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="jumbo" workspaceType="hasUnreads" />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="small" workspaceType="hasUnreads" />
          </>
        ),
      },
      {
        id: 'pending',
        label: 'pendingAuthentication (jumbo, extraLarge, medium)',
        snapshot: 'testWorkspaceAvatarPendingAuthenticationJumbo, …ExtraLarge, …Medium',
        render: () => (
          <>
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="jumbo" workspaceType="pendingAuthentication" />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="extraLarge" workspaceType="pendingAuthentication" />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="medium" workspaceType="pendingAuthentication" />
          </>
        ),
      },
      {
        id: 'active',
        label: 'active (large; small shows no ring), govSlack (extraLarge)',
        snapshot: 'testWorkspaceAvatarActiveLarge, …ActiveSmall, …GovVariantExtraLarge',
        render: () => (
          <>
            {/* the test's canvas: 10 pt around the avatar */}
            <span style={{ padding: 10, display: 'inline-flex' }}>
              <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="large" workspaceType="active" />
            </span>
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="small" workspaceType="active" />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="extraLarge" workspaceVariant="govSlack" />
          </>
        ),
      },
      {
        id: 'round',
        label: 'round (concentric) hasUnreads: toolbarItem 32 (the unified header) and extraLarge: the dot on the edge (September 2026)',
        snapshot: 'testWorkspaceAvatarHasUnreadsConcentricToolbarItem, …ConcentricExtraLarge',
        render: () => (
          <>
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="toolbarItem" round workspaceType="hasUnreads" />
            <SK.SKWorkspaceAvatar name="Acme" src={AV.acme} size="extraLarge" round workspaceType="hasUnreads" />
          </>
        ),
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixture (acme): standard; mentions medium 1, large 10, extraLarge 10; unreads jumbo; pending extraLarge, medium; concentric unreads toolbarItem, extraLarge; govSlack",
        snapshot: 'SKWorkspaceAvatarSnapshotTests/*',
        render: () => (
          <>
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="extraLarge" />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="medium" workspaceType={{ mentionCount: 1 }} />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="large" workspaceType={{ mentionCount: 10 }} />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="extraLarge" workspaceType={{ mentionCount: 10 }} />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="jumbo" workspaceType="hasUnreads" />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="extraLarge" workspaceType="pendingAuthentication" />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="medium" workspaceType="pendingAuthentication" />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="toolbarItem" round workspaceType="hasUnreads" />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="extraLarge" round workspaceType="hasUnreads" />
            <SK.SKWorkspaceAvatar name="Test Workspace" src={FIXTURE.acme} size="extraLarge" workspaceVariant="govSlack" />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKGroupAvatar',
    group: 'Avatars and ornaments',
    swift: 'DeveloperComponents/GroupAvatar/SKGroupAvatar.swift',
    about: 'The group-DM avatar: a member-count box at small sizes (the Home row), two overlapping photos at large and extraLarge, the top-left one cut away around the other.',
    usage: `<SKGroupAvatar count={3} />
<SKGroupAvatar size="extraLarge" count={4} primarySrc={a} secondarySrc={b} />`,
    specimens: [
      {
        id: 'sizes',
        label: 'small (count), large, extraLarge',
        snapshot: 'SKGroupAvatarSnapshotTests/testGroupAvatarSmall, …Large, …ExtraLarge',
        render: () => (
          <>
            <SK.SKGroupAvatar count={2} size="small" />
            <SK.SKGroupAvatar count={2} size="large" primarySrc={AV.lisa} secondarySrc={AV.lee} />
            <SK.SKGroupAvatar count={2} size="extraLarge" primarySrc={AV.lisa} secondarySrc={AV.lee} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKOrnamentBox',
    group: 'Avatars and ornaments',
    swift: 'DesignerComponents/OrnamentBox/SKOrnamentBox.swift',
    about:
      'The tile that holds a row’s leading ornament: an icon, emoji, image, “/”, badge, member avatar, spinner or placeholder. Sides 16 … 120; radius min(20, 0.25 × side) or a circle; a surfacePrimary background from medium (32) up unless forced; optional color or rainbow border.',
    usage: `<SKOrnamentBox ornament={{ icon: 'channel' }} size="large" />
<SKOrnamentBox ornament={{ emoji: 'squid' }} size="medium" />
<SKOrnamentBox ornament={{ slashCommand: true }} size="large" />
<SKOrnamentBox ornament={{ icon: 'search' }} size="extraLarge" backgroundColor="var(--dt_color_base_primary)" border={{ color: 'var(--sk_soft_gray)' }} />`,
    specimens: [
      {
        id: 'icons',
        label: 'icon: small, medium, large; iconAlpha 0.5 (small, large)',
        snapshot: 'SKOrnamentBoxSnapshotTests/testOrnamentBoxSmall, …Medium, …Large, …LowAlpha',
        render: () => (
          <>
            <SK.SKOrnamentBox ornament={{ icon: 'channel' }} size="small" />
            <SK.SKOrnamentBox ornament={{ icon: 'channel' }} size="medium" />
            <SK.SKOrnamentBox ornament={{ icon: 'channel' }} size="large" />
            <SK.SKOrnamentBox ornament={{ icon: 'channel' }} size="small" iconAlpha={0.5} />
            <SK.SKOrnamentBox ornament={{ icon: 'channel' }} size="large" iconAlpha={0.5} />
          </>
        ),
      },
      {
        id: 'emoji',
        label: 'emoji (small, medium, large); slash command (small, large, extraLarge)',
        snapshot: 'testOrnamentBoxEmojiSmall … , testOrnamentBox…WithSlashCommand',
        render: () => (
          <>
            <SK.SKOrnamentBox ornament={{ emoji: 'squid' }} size="small" />
            <SK.SKOrnamentBox ornament={{ emoji: 'squid' }} size="medium" />
            <SK.SKOrnamentBox ornament={{ emoji: 'squid' }} size="large" />
            <SK.SKOrnamentBox ornament={{ slashCommand: true }} size="small" />
            <SK.SKOrnamentBox ornament={{ slashCommand: true }} size="large" />
            <SK.SKOrnamentBox ornament={{ slashCommand: true }} size="extraLarge" />
          </>
        ),
      },
      {
        id: 'backgrounds',
        label: 'backgroundColor green, roundedRectangle and circle: tiny … jumbo',
        snapshot: 'testOrnamentBox…WithRoundedRectangleShapeAndBackgroundStyle, …CircleShape…',
        render: () => (
          <>
            {(['tiny', 'verySmall', 'small', 'medium', 'large', 'extraLarge', 'jumbo'] as const).map((z) => (
              <SK.SKOrnamentBox key={z} ornament={{ icon: 'channel' }} size={z} backgroundColor="#00FF00" />
            ))}
            {(['tiny', 'verySmall', 'small', 'medium', 'large', 'extraLarge', 'jumbo'] as const).map((z) => (
              <SK.SKOrnamentBox key={`c${z}`} ornament={{ icon: 'channel' }} size={z} shape="circle" backgroundColor="#00FF00" />
            ))}
          </>
        ),
      },
      {
        id: 'others',
        label: 'colored border, rainbow border, spinner (small, medium), badge "PRO", member avatar',
        snapshot: 'testOrnamentBoxColoredBorder, …WithRainbowBorder, …Spinner…, …WithBadge, …WithMemberAvatar',
        render: () => (
          <>
            <SK.SKOrnamentBox ornament={{ icon: 'search' }} size="extraLarge" backgroundColor="var(--sk_primary_background)" border={{ color: 'var(--sk_soft_gray)' }} />
            <SK.SKOrnamentBox ornament={{ icon: 'channel' }} size="medium" border="rainbow" />
            <SK.SKOrnamentBox ornament={{ spinner: { size: 'small', color: 'darkOnLight' } }} size="small" />
            <SK.SKOrnamentBox ornament={{ spinner: { size: 'medium', color: 'darkOnLight' } }} size="medium" />
            <SK.SKOrnamentBox ornament={{ badge: { title: 'PRO' } }} size="medium" />
            <SK.SKOrnamentBox ornament={{ memberAvatar: { name: 'Test Workspace', src: AV.acme } }} size="medium" />
          </>
        ),
      },
      {
        id: 'groupAvatar',
        label: 'groupAvatar(memberCount: 5), verySmall and small (September 2026)',
        snapshot: 'testOrnamentBoxGroupAvatarVerySmall, testOrnamentBoxGroupAvatarSmall',
        render: () => (
          <>
            <SK.SKOrnamentBox ornament={{ groupAvatar: { memberCount: 5 } }} size="verySmall" />
            <SK.SKOrnamentBox ornament={{ groupAvatar: { memberCount: 5 } }} size="small" />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKAvatarPile',
    group: 'Avatars and ornaments',
    swift: 'DesignerComponents/AvatarPile/SKAvatarPile.swift',
    about:
      'A row of avatars (extraSmall 16, small 28, medium 32, large 64) spaced or overlapping by a quarter of their side, each overlapping one cutting a rounded gap into the one before it; an optional “+N” tile (“99+” above 99).',
    usage: `<SKAvatarPile avatars={[a, b, c]} shouldOverlap size="medium" />
<SKAvatarPile avatars={members.map((m) => m.avatar)} maxAvatarCount={2} shouldOverlap shouldShowOverflowCount />`,
    specimens: [
      {
        id: 'small',
        label: 'small: maxAvatarCount 2; + overflow, overlapping; + overflow; 102 avatars',
        snapshot: 'SKAvatarPileSnapshotTests/testMaxAvatars, testAvatarOverflow, testAvatarOverflowWithoutOverlap, testAvatarOverflowWithHighCount',
        render: () => (
          <>
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="small" maxAvatarCount={2} shouldOverlap={false} />
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="small" maxAvatarCount={2} shouldOverlap shouldShowOverflowCount />
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="small" maxAvatarCount={2} shouldOverlap={false} shouldShowOverflowCount />
            <SK.SKAvatarPile avatars={Array.from({ length: 102 }, () => AV.lisa)} size="small" maxAvatarCount={2} shouldOverlap={false} shouldShowOverflowCount />
          </>
        ),
      },
      {
        id: 'medium',
        label: 'medium: spaced, overlapping, single',
        snapshot: 'testMediumAvatars, testMediumOverlappingAvatars, testSingleAvatar',
        render: () => (
          <>
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="medium" shouldOverlap={false} />
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="medium" shouldOverlap />
            <SK.SKAvatarPile avatars={[AV.lisa]} size="medium" shouldOverlap={false} />
          </>
        ),
      },
      {
        id: 'large',
        label: 'large: spaced, overlapping',
        snapshot: 'testLargeAvatars, testLargeOverlappingAvatars',
        render: () => (
          <>
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="large" shouldOverlap={false} />
            <SK.SKAvatarPile avatars={[AV.lisa, AV.lee, AV.zoe]} size="large" shouldOverlap />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKHuddleFacePile',
    group: 'Avatars and ornaments',
    swift: 'DeveloperComponents/HuddleFacePile/SKHuddleFacePile.swift',
    about:
      'Huddle participants: up to 5 round faces (small 18, medium 24) overlapping by 5 / 8 pt, the leftmost on top, after an optional headphones count badge or icon circle. Borders: basePrimary (default), sk_dark_gray (dark), or a transparent gap (clear).',
    usage: `<SKHuddleFacePile avatars={[a, b, c]} badge={{ huddle: { count: 12, color: 'var(--sk_highlight)' } }} />
<SKHuddleFacePile avatars={[a, b, c]} badge={{ custom: { icon: 'clock', color: 'var(--sk_foreground_max_solid)' } }} />
<SKHuddleFacePile avatars={[a, b, c]} size="small" border="clear" />`,
    specimens: [
      {
        id: 'default',
        label: 'single, multiple, huddle badge, custom icon; dark border',
        snapshot: 'SKHuddleFacePileSnapshotTests/testFacePileSingle, …Multiple, …WithHuddleBadge, …WithIcon, …DarkStyle',
        render: () => (
          <>
            <SK.SKHuddleFacePile avatars={[AV.lisa]} />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} badge={{ huddle: { count: 12, color: 'var(--sk_highlight)' } }} />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} badge={{ custom: { icon: 'clock', color: 'var(--sk_foreground_max_solid)' } }} />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} border="dark" />
          </>
        ),
      },
      {
        id: 'clear',
        label: 'clear border: single, multiple, huddle badge, custom icon',
        snapshot: 'testFacePile…WithClearBorder',
        render: () => (
          <>
            <SK.SKHuddleFacePile avatars={[AV.lisa]} border="clear" />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} border="clear" />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} border="clear" badge={{ huddle: { count: 12, color: 'var(--sk_highlight)' } }} />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} border="clear" badge={{ custom: { icon: 'clock', color: 'var(--sk_foreground_max_solid)' } }} />
          </>
        ),
      },
      {
        id: 'small',
        label: 'small: default, clear',
        snapshot: 'testFacePileSmallSize, …WithClearBorder',
        render: () => (
          <>
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} size="small" />
            <SK.SKHuddleFacePile avatars={[AV.lisa, AV.lee, AV.zoe]} size="small" border="clear" />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKDecoratedIcon',
    group: 'Avatars and ornaments',
    swift: 'DeveloperComponents/DecoratedIcon/SKDecoratedIcon.swift',
    about: 'An icon with a small badge at its top-right, the icon cut away around it: a dot (circle) or a 14 pt icon, optionally on a background.',
    usage: `<SKDecoratedIcon icon="notifications" badge={{ circle: { color: 'var(--sk_raspberry_red)' } }} />
<SKDecoratedIcon icon="headphones" color="var(--dt_color_content_highlight_2)" padding={{ top: 8, left: 8, bottom: 8, right: 8 }}
  badge={{ icon: { icon: 'laptop', padding: { top: 2, left: 2, bottom: 2, right: 2 } } }} />`,
    specimens: [
      {
        id: 'badges',
        label: 'circle badge; icon badge; icon badge on jade_5',
        snapshot: 'SKDecoratedIconTests/testCircleBadge, testIconBadge, testIconBadgeWithBackground',
        render: () => (
          <>
            <SK.SKDecoratedIcon icon="brand_android_filled" size={20} badge={{ circle: { color: 'var(--sk_raspberry_red)' } }} />
            <SK.SKDecoratedIcon
              icon="headphones"
              size={20}
              color="var(--dt_color_content_highlight_2)"
              padding={{ top: 8, left: 8, bottom: 8, right: 8 }}
              badge={{ icon: { icon: 'laptop', padding: { top: 2, left: 2, bottom: 2, right: 2 } } }}
            />
            <SK.SKDecoratedIcon
              icon="headphones"
              size={20}
              color="var(--dt_color_content_highlight_2)"
              padding={{ top: 8, left: 8, bottom: 8, right: 8 }}
              badge={{ icon: { icon: 'laptop', backgroundColor: 'var(--dt_color_palettes_jade_5)', padding: { top: 2, left: 2, bottom: 2, right: 2 } } }}
            />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKColorSwatch',
    group: 'Avatars and ornaments',
    swift: 'DesignerComponents/ColorSwatch/SKColorSwatch.swift',
    about: 'A 20 pt color chip with a 1 pt outlinePrimary border; translucent colors over a checkerboard. Rounded rect (radius 5) or circle.',
    usage: `<SKColorSwatch color="#cccccc" />
<SKColorSwatch color="rgb(204 204 204 / 0.5)" />
<SKColorSwatch color="#cccccc" swatchStyle="circle" />`,
    specimens: [
      {
        id: 'styles',
        label: 'opaque, 50 % alpha, circle',
        snapshot: 'SKColorSwatchSnapshotTests/testOpaqueColorSwatch, testTransparentColorSwatch, testCircleColorSwatch',
        render: () => (
          <>
            <SK.SKColorSwatch color="#cccccc" />
            <SK.SKColorSwatch color="rgb(204 204 204 / 0.5)" />
            <SK.SKColorSwatch color="#cccccc" swatchStyle="circle" />
          </>
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ Attachments
  {
    name: 'SKThumbnailAttachment',
    group: 'Attachments',
    swift: 'DesignerComponents/ThumbnailAttachment/SKThumbnailAttachment.swift',
    about:
      'A square attachment tile (small 64, medium 96, any side): image (ALT badge), video (duration badge), file-type icon, loading, error, "+N" or a placeholder icon. Multi-select badge; selected adds a 3 pt yellow border and a dim. Radius min(20, 0.225 × side). Press to see alpha 0.6.',
    usage: `<SKThumbnailAttachment state={{ image: { src: photo, altText: 'A cat' } }} onSelected={open} />
<SKThumbnailAttachment state={{ video: { src: poster, durationInSeconds: 1000 } }} />   // "17m"
<SKThumbnailAttachment state={{ file: 'mp3' }} selection={{ selected: 2 }} />
<SKThumbnailAttachment state={{ overflow: 2 }} size="medium" />
<SKThumbnailAttachment state={{ loading: { shimmer: true } }} />`,
    specimens: [
      {
        id: 'small',
        label: 'small: loading, error, +2, placeholder, file (mp3), image, video 10000 s / 1000 s / 10 s / none',
        snapshot: 'SKThumbnailAttachmentSnapshotTests/test…Small, testAttachmentVideoDurationIn…',
        render: () => (
          <>
            <SK.SKThumbnailAttachment state="loading" />
            <SK.SKThumbnailAttachment state="error" />
            <SK.SKThumbnailAttachment state={{ overflow: 2 }} />
            <SK.SKThumbnailAttachment state={{ placeholder: { icon: 'camera' } }} />
            <SK.SKThumbnailAttachment state={{ file: 'mp3' }} />
            <SK.SKThumbnailAttachment state={{ image: { src: IMG.campfire } }} onSelected={() => {}} />
            <SK.SKThumbnailAttachment state={{ video: { src: IMG.campfire, durationInSeconds: 10000 } }} />
            <SK.SKThumbnailAttachment state={{ video: { src: IMG.campfire, durationInSeconds: 1000 } }} />
            <SK.SKThumbnailAttachment state={{ video: { src: IMG.campfire, durationInSeconds: 10 } }} />
            <SK.SKThumbnailAttachment state={{ video: { src: IMG.campfire } }} />
          </>
        ),
      },
      {
        id: 'medium',
        label: 'medium: loading, error, +2, placeholder, file, image, plain, ALT, ALT reminder, video',
        snapshot: 'test…Medium, testAttachmentImageMediumPlain, …WithAltText, …WithAltTextReminder',
        render: () => (
          <>
            <SK.SKThumbnailAttachment size="medium" state="loading" />
            <SK.SKThumbnailAttachment size="medium" state="error" />
            <SK.SKThumbnailAttachment size="medium" state={{ overflow: 2 }} />
            <SK.SKThumbnailAttachment size="medium" state={{ placeholder: { icon: 'camera' } }} />
            <SK.SKThumbnailAttachment size="medium" state={{ file: 'mp3' }} />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: IMG.campfire } }} />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: IMG.campfire } }} selection="plain" />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: IMG.campfire, altText: 'Alt text' } }} altTextBadgeVisibility="visibleIfPresent" />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: IMG.campfire } }} altTextBadgeVisibility="visibleAlways" />
            <SK.SKThumbnailAttachment size="medium" state={{ video: { src: IMG.campfire } }} />
          </>
        ),
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixture (acme): ALT hidden (the default since September 2026); edit icon; edit icon with alt text; edit icon with the reminder; ALT; + ALT",
        snapshot: 'testAttachmentImageMediumAltTextBadgeHidden, …WithEditIcon, …WithAltTextAndEditIcon, …WithAltTextReminderAndEditIcon, …WithAltText, …WithAltTextReminder',
        render: () => (
          <>
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: FIXTURE.acme, altText: 'Alt text' } }} />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: FIXTURE.acme } }} displayEditIcon />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: FIXTURE.acme, altText: 'Alt text' } }} displayEditIcon />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: FIXTURE.acme } }} altTextBadgeVisibility="visibleAlways" displayEditIcon />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: FIXTURE.acme, altText: 'Alt text' } }} altTextBadgeVisibility="visibleIfPresent" />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: FIXTURE.acme } }} altTextBadgeVisibility="visibleAlways" />
          </>
        ),
      },
      {
        id: 'selection',
        label: 'selection: file, image, video × unselected / selected(2)',
        snapshot: 'test…SingleUnselected, test…Selected',
        render: () => (
          <Stateful initial={[false, true, false, true, false, true]}>
            {(sel, set) => (
              <>
                {(['file', 'file', 'image', 'image', 'video', 'video'] as const).map((k, i) => (
                  <SK.SKThumbnailAttachment
                    key={i}
                    state={k === 'file' ? { file: 'mp3' } : k === 'image' ? { image: { src: IMG.campfire } } : { video: { src: IMG.campfire } }}
                    selection={sel[i] ? { selected: 2 } : 'unselected'}
                    onSelected={() => set(sel.map((v, j) => (j === i ? !v : v)))}
                  />
                ))}
              </>
            )}
          </Stateful>
        ),
      },
      {
        id: 'more',
        label: 'custom size 150, favorited (heart), list and canvas files, shimmer',
        snapshot: 'testAttachmentImageCustomSize',
        render: () => (
          <>
            <SK.SKThumbnailAttachment size={150} state={{ image: { src: IMG.campfire } }} />
            <SK.SKThumbnailAttachment size="medium" state={{ image: { src: IMG.lagoon } }} displayHeartIcon />
            <SK.SKThumbnailAttachment state={{ file: 'list' }} />
            <SK.SKThumbnailAttachment state={{ file: 'canvas' }} />
            <SK.SKThumbnailAttachment state={{ file: 'pdf' }} />
            <SK.SKThumbnailAttachment state={{ loading: { shimmer: true } }} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKCompactAttachment',
    group: 'Attachments',
    swift: 'DesignerComponents/CompactAttachment/SKCompactAttachment.swift',
    about:
      'The one-row attachment card: a 36 pt AttachmentOrnament (file-type tile, image, video, audio, error), the title (Lato Bold 15) over the subtitle (Lato 13, contentTertiary). Radius 15, 1 pt border. Hugs its content; a file can add a preview image below a hairline (≤ 300 tall) and a 12 pt accessory icon.',
    usage: `<SKCompactAttachment state={{ file: { type: 'pdf', title: 'Q3 plan.pdf', subtitle: '10 KB PDF' } }} onSelected={open} />
<SKCompactAttachment state={{ image: { title: 'Title', subtitle: 'Something to read.', src: photo } }} />
<SKCompactAttachment state={{ error: { title: 'Error', subtitle: 'Something went wrong.' } }} />
<SKCompactAttachment state={{ file: { type: 'pdf', title: 'Deck', subtitle: '10 KB PDF', accessoryIcon: 'ai_sparkle_filled',
  previewImage: { src: preview, width: 100, height: 100 } } }} />
// file-type helpers: fileTypeFor('plan.pdf') → 'pdf'; fileTypeIcon, fileTypePrimaryColor, fileTypeSecondaryColor`,
    specimens: [
      {
        id: 'error',
        label: 'error',
        snapshot: 'SKCompactAttachmentSnapshotTests/testAttachmentError',
        layout: 'flush',
        render: () => <SK.SKCompactAttachment state={{ error: { title: 'Error', subtitle: 'Something went wrong.' } }} />,
      },
      {
        id: 'file',
        label: 'file (pdf)',
        snapshot: 'testAttachmentFile',
        layout: 'flush',
        render: () => <SK.SKCompactAttachment state={{ file: { type: 'pdf', title: 'Title', subtitle: 'Something to read.' } }} onSelected={() => {}} />,
      },
      {
        id: 'image',
        label: 'image',
        snapshot: 'testAttachmentImage',
        layout: 'flush',
        render: () => <SK.SKCompactAttachment state={{ image: { title: 'Title', subtitle: 'Something to read.', src: IMG.campfire } }} />,
      },
      {
        id: 'video',
        label: 'video (no duration)',
        snapshot: 'testAttachmentVideoNoDuration',
        layout: 'flush',
        render: () => <SK.SKCompactAttachment state={{ video: { title: 'Title', subtitle: 'Something to read.', src: IMG.campfire } }} />,
      },
      {
        id: 'accessory',
        label: 'accessory icon + skinny preview (50 × 200, capped at 300)',
        snapshot: 'testFileWithAccessoryIcon_shortFileName',
        layout: 'flush',
        render: () => (
          <SK.SKCompactAttachment
            state={{ file: { type: 'pdf', title: 'Shorter title', subtitle: '10 KB PDF', accessoryIcon: 'ai_sparkle_filled', previewImage: { src: IMG.slides, width: 50, height: 200 } } }}
          />
        ),
      },
      {
        id: 'wide',
        label: 'wide preview (200 × 50)',
        snapshot: 'testWideFileWithPreviewImage',
        layout: 'flush',
        render: () => (
          <SK.SKCompactAttachment state={{ file: { type: 'pdf', title: 'This is a PDF that has a preview image', subtitle: '10 KB PDF', previewImage: { src: IMG.slides, width: 200, height: 50 } } }} />
        ),
      },
      {
        id: 'types',
        label: 'file-type tiles: doc, xlsx, pptx, canvas, list, mp4, zip, md; audio; inverted',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            {(['docx', 'xlsx', 'pptx', 'canvas', 'list', 'mp4', 'binary', 'markdown'] as const).map((t) => (
              <SK.SKCompactAttachment key={t} state={{ file: { type: t, title: `${t} file`, subtitle: 'Uploaded just now' } }} />
            ))}
            <SK.SKCompactAttachment state={{ audio: { title: 'Voice memo', subtitle: '0:42' } }} />
            <SK.SKCompactAttachment state={{ file: { type: 'pdf', title: 'Inverted ornament', subtitle: '10 KB PDF', invertOrnamentColors: true } }} />
          </div>
        ),
      },
    ],
  },
  {
    name: 'SKExpandedAttachment',
    group: 'Attachments',
    swift: 'DesignerComponents/ExpandedAttachment/SKExpandedAttachment.swift',
    about:
      'A large inline image or video preview: full width, height from the known aspect ratio (5/8 without one), at most 400. Radius 15 (cornerRadius standard: 12), a 1 pt outlineTertiary border and baseSecondary fill (both overridable since September 2026), ALT badge 7⅔ pt from the corner, video badge (medium) 7 pt. The ALT badge follows altTextBadgeVisibility (default visibleIfPresent); an aspect-filled crop favors anchor.',
    usage: `<SKExpandedAttachment state={{ image: { src: photo, altText: 'Launch day' } }} knownImageSize={{ width: 1200, height: 800 }} />
<SKExpandedAttachment state={{ video: { src: poster, durationInSeconds: 95 } }} />
<SKExpandedAttachment state={{ image: { src: photo } }} borderColor="transparent" backgroundColor="transparent" cornerRadius="standard" />`,
    specimens: [
      {
        id: 'image',
        label: 'image with alt text (no known size: 5/8)',
        layout: 'fill',
        render: () => <SK.SKExpandedAttachment state={{ image: { src: IMG.campfire, altText: 'acme' } }} />,
      },
      {
        id: 'video',
        label: 'video, 95 s; known size 1200 × 800',
        layout: 'fill',
        render: () => <SK.SKExpandedAttachment state={{ video: { src: IMG.clip, durationInSeconds: 95 } }} knownImageSize={{ width: 1200, height: 800 }} />,
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixture (kiwi): ALT; ALT hidden; + ALT (visibleAlways); clear border and background; standard (12 pt) corners; anchored top-leading",
        snapshot: 'testAttachmentImageWithAltText, …AltTextBadgeHidden, …WithAltTextReminder, …WithClearBorderAndBackground, …WithSquareCorners',
        layout: 'fill',
        render: () => (
          <>
            <SK.SKExpandedAttachment width={393} state={{ image: { src: FIXTURE.kiwi, altText: 'This is some alt text' } }} />
            <SK.SKExpandedAttachment width={393} state={{ image: { src: FIXTURE.kiwi, altText: 'This is some alt text' } }} altTextBadgeVisibility="hidden" style={{ marginTop: 12 }} />
            <SK.SKExpandedAttachment width={393} state={{ image: { src: FIXTURE.kiwi } }} altTextBadgeVisibility="visibleAlways" style={{ marginTop: 12 }} />
            <SK.SKExpandedAttachment width={393} state={{ image: { src: FIXTURE.kiwi } }} borderColor="transparent" backgroundColor="transparent" style={{ marginTop: 12 }} />
            <SK.SKExpandedAttachment width={393} state={{ image: { src: FIXTURE.kiwi } }} cornerRadius="standard" style={{ marginTop: 12 }} />
            <SK.SKExpandedAttachment width={393} state={{ image: { src: IMG.slides } }} anchor="topLeading" style={{ marginTop: 12 }} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKAttachmentBar',
    group: 'Attachments',
    swift: 'DesignerComponents/AttachmentBar/SKAttachmentBar.swift',
    about:
      'A message’s attachments: compact cards and expanded previews stacked 8 pt apart, or rows of thumbnails; overflow becomes a "+N" tile, a compact card with "+N", or a "See N More" button, per the preferences (default mixed: 1 expanded, 1 thumbnail row, 1 compact).',
    usage: `<SKAttachmentBar attachments={[
  { id: 'doc', state: { file: { type: 'doc', title: 'doc', subtitle: '64Mb' } } },
  { id: 'img', state: { image: { src: photo, altText: 'acme' } } },
]} attachmentPreferences={{ expanded: { maximumCount: 10 } }} onSelectedAttachment={(id) => open(id)} />`,
    specimens: [
      {
        id: 'thumbs',
        label: '4 images (mixed → 1 row of thumbnails)',
        snapshot: 'SKAttachmentBarSnapshotTests/testAttachmentBarMultipleImages',
        layout: 'flush',
        render: () => (
          <SK.SKAttachmentBar attachments={[IMG.campfire, IMG.lagoon, IMG.slides, IMG.clip].map((src, i) => ({ id: `i${i}`, state: { image: { src, altText: 'alt' } } }))} />
        ),
      },
      {
        id: 'bigger',
        label: '7 images, resizing thumbnails (not below 64): 4 + "+3"',
        snapshot: 'testAttachmentBarThumbnailsAreBiggerThanSmall',
        layout: 'flush',
        render: () => (
          <SK.SKAttachmentBar
            useStaticallySizedThumbnails={false}
            attachments={[IMG.campfire, IMG.lagoon, IMG.slides, IMG.clip, IMG.clip, IMG.clip, IMG.clip].map((src, i) => ({ id: `i${i}`, state: { image: { src, altText: 'alt' } } }))}
          />
        ),
      },
      {
        id: 'resizing',
        label: '2 images, resizing thumbnails',
        snapshot: 'testAttachmentBarResizingThumbnails',
        layout: 'flush',
        render: () => <SK.SKAttachmentBar useStaticallySizedThumbnails={false} attachments={[IMG.campfire, IMG.lagoon].map((src, i) => ({ id: `i${i}`, state: { image: { src, altText: 'alt' } } }))} />,
      },
      {
        id: 'compact',
        label: 'one file; three files (expanded, max 10)',
        snapshot: 'testIndividualCompactAttachment, testMultipleCompactAttachments',
        layout: 'flush',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SK.SKAttachmentBar attachments={[{ id: 'doc', state: { file: { type: 'doc', title: 'doc', subtitle: '64Mb' } } }]} />
            <SK.SKAttachmentBar attachmentPreferences={{ expanded: { maximumCount: 10 } }} attachments={FILES} />
          </div>
        ),
      },
      {
        id: 'truncated',
        label: 'three files, mixed → compact overflow "+2"; two files, vertical overflow',
        snapshot: 'testMultipleCompactAttachmentsTruncated, testVerticalOverflowMultipleExpandedAttachments',
        layout: 'flush',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SK.SKAttachmentBar attachments={FILES} />
            <SK.SKAttachmentBar attachmentPreferences={{ expanded: { maximumCount: 1, shouldOverflowVertically: true } }} attachments={FILES.slice(0, 2)} />
          </div>
        ),
      },
      {
        id: 'mixed',
        label: 'doc, canvas, 2 images (expanded, max 3)',
        snapshot: 'testMixedTypeMultipleAttachmentsTruncated',
        layout: 'flush',
        render: () => (
          <SK.SKAttachmentBar
            attachmentPreferences={{ expanded: { maximumCount: 3 } }}
            attachments={[...FILES.slice(0, 2), { id: 'a', state: { image: { src: IMG.campfire, altText: 'acme' } } }, { id: 'b', state: { image: { src: IMG.lagoon, altText: 'kiwi' } } }]}
          />
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ Loading
  {
    name: 'SKLoadingEntity',
    group: 'Loading',
    swift: 'DesignerComponents/Entities/LoadingEntity/SKLoadingEntity.swift',
    about:
      'A skeleton list row (small 44, medium 56): an optional square ornament, a 12 pt bar at 75 % and, from medium, 10 pt bars at 50 %, all pill-shaped; or N button pills. Shapes show the shimmer (1.8 s sweep) or a flat placeholder color.',
    usage: `<SKLoadingEntity />                                             medium, with an ornament, shimmering
<SKLoadingEntity entityType={{ generic: { hasOrnament: false } }} size="small" />
<SKLoadingEntity entityType={{ button: { count: 3 } }} size="small" />
<SKLoadingEntity fillStyle={{ placeholder: { placeholderColor: 'var(--dt_color_base_tertiary)' } }} />`,
    specimens: [
      {
        id: 'shimmer',
        label: 'shimmering: image small, image medium, no image small / medium, 3 buttons, custom',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKLoadingEntity size="small" />
            <SK.SKLoadingEntity size="medium" />
            <SK.SKLoadingEntity size="small" entityType={{ generic: { hasOrnament: false } }} />
            <SK.SKLoadingEntity size="medium" entityType={{ generic: { hasOrnament: false } }} />
            <SK.SKLoadingEntity size="small" entityType={{ button: { count: 3 } }} />
            <SK.SKLoadingEntity size="small" entityType="custom" />
          </>
        ),
      },
      {
        id: 'inverted',
        label: 'placeholder fill (sk_just_orange), medium, no image',
        snapshot: 'SKLoadingEntitySnapshotTests/testInverted',
        layout: 'flush',
        render: () => <SK.SKLoadingEntity size="medium" entityType={{ generic: { hasOrnament: false } }} fillStyle={{ placeholder: { placeholderColor: 'var(--sk_just_orange)' } }} />,
      },
      {
        id: 'buttons',
        label: '3 buttons, small, placeholder fill (baseTertiary)',
        snapshot: 'testButtonMaskSmall (holes filled here)',
        layout: 'flush',
        render: () => <SK.SKLoadingEntity size="small" entityType={{ button: { count: 3 } }} fillStyle={{ placeholder: { placeholderColor: 'var(--dt_color_base_tertiary)' } }} />,
      },
    ],
  },
  {
    name: 'SKLoadingHeader',
    group: 'Loading',
    swift: 'DesignerComponents/LoadingHeader/SKLoadingHeader.swift',
    about: 'A skeleton section header (16 pt margins): small (24, no second bar) or medium (36 with a second bar), or a strip of button pills.',
    usage: `<SKLoadingHeader size="small" />
<SKLoadingHeader entityType={{ button: { count: 3 } }} size="small" />`,
    specimens: [
      {
        id: 'sizes',
        label: 'image small, no image small, image medium, 3 buttons',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKLoadingHeader size="small" />
            <SK.SKLoadingHeader size="small" entityType={{ generic: { hasOrnament: false } }} />
            <SK.SKLoadingHeader size="medium" />
            <SK.SKLoadingHeader size="small" entityType={{ button: { count: 3 } }} />
          </>
        ),
      },
      {
        id: 'inverted',
        label: 'placeholder fill (sk_just_orange), medium, no image',
        snapshot: 'SKLoadingHeaderSnapshotTests/testInverted',
        layout: 'flush',
        render: () => <SK.SKLoadingHeader size="medium" entityType={{ generic: { hasOrnament: false } }} fillStyle={{ placeholder: { placeholderColor: 'var(--sk_just_orange)' } }} />,
      },
    ],
  },
  {
    name: 'SKWrappedLoadingView',
    group: 'Loading',
    swift: 'DesignerComponents/LoadingState/SKWrappedLoadingView.swift',
    about:
      'A fixed skeleton list: an optional header, then N rows, or sections split by hairlines. SKLoadingState is the same but fills its container. One shimmer spans the whole view; solid draws flat shapes.',
    usage: `<SKWrappedLoadingView cellContent={{ hasImageMask: true, size: 'medium' }} layout={{ list: { cellCount: 3 } }} />
<SKWrappedLoadingView headerContent={{ hasImageMask: true, size: 'small' }} cellContent={{ hasImageMask: true, size: 'small' }}
  layout={{ sections: { cellsPerSection: 1, sectionCount: 3 } }} />
<SKLoadingState cellContent={{ hasImageMask: true, size: 'medium' }} />   // fills its parent's height`,
    specimens: [
      {
        id: 'sections',
        label: 'sections: small header + 1 small cell × 3 (solid)',
        snapshot: 'SKWrappedLoadingViewSnapshotTests/testImageMaskSectionsSmall',
        layout: 'flush',
        render: () => (
          <SK.SKWrappedLoadingView
            headerContent={{ hasImageMask: true, size: 'small' }}
            cellContent={{ hasImageMask: true, size: 'small' }}
            layout={{ sections: { cellsPerSection: 1, sectionCount: 3 } }}
            placeholderStyle={SOLID}
          />
        ),
      },
      {
        id: 'mixed',
        label: 'list: small header (no image) + 3 medium cells (solid)',
        snapshot: 'testMixedImageMaskList',
        layout: 'flush',
        render: () => <SK.SKWrappedLoadingView headerContent={{ hasImageMask: false, size: 'small' }} cellContent={{ hasImageMask: true, size: 'medium' }} layout={{ list: { cellCount: 3 } }} placeholderStyle={SOLID} />,
      },
      {
        id: 'target',
        label: 'dynamic secondary text, target 190, wide, 2 sections (solid)',
        snapshot: 'testSectionWithTargetCellHeight',
        layout: 'flush',
        render: () => (
          <SK.SKWrappedLoadingView
            cellContent={{ hasImageMask: true, size: { dynamicSecondaryText: { targetTotalHeight: 190 } }, hasWideSecondaryText: true }}
            layout={{ sections: { cellsPerSection: 1, sectionCount: 2 } }}
            placeholderStyle={SOLID}
          />
        ),
      },
      {
        id: 'shimmer',
        label: 'shimmering: medium header + 4 medium cells',
        layout: 'flush',
        render: () => <SK.SKWrappedLoadingView headerContent={{ hasImageMask: true, size: 'medium' }} cellContent={{ hasImageMask: true, size: 'medium' }} layout={{ list: { cellCount: 4 } }} />,
      },
      {
        id: 'state',
        label: 'SKLoadingState in a 400 pt tall container (sections of 3)',
        layout: 'flush',
        render: () => (
          <div style={{ height: 400 }}>
            <SK.SKLoadingState cellContent={{ hasImageMask: true, size: 'small' }} layout={{ sections: { cellsPerSection: 3 } }} />
          </div>
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ Text input
  {
    name: 'SKTextToolbar',
    group: 'Text inputs and tokens',
    swift: 'DesignerComponents/TextToolbar/SKTextToolbar.swift',
    about: 'The formatting toolbar: 36 pt icon items 4 pt apart, sections split by a 1 × 20 divider (6 pt each side). Selected (or emphasized): a 32 pt highlight1.surface circle behind a highlight1.content icon. Disabled 0.35. Tap to toggle.',
    usage: `<SKTextToolbar
  sections={[{ items: [{ id: 'bold', icon: 'bold', isSelected: bold }, { id: 'italic', icon: 'italic' }] },
             { items: [{ id: 'bullets', icon: 'bulleted_list' }] }]}
  onSelectedItem={(id, wasSelected) => setSelected(id, !wasSelected)} />`,
    specimens: [
      {
        id: 'formatting',
        label: 'selected (tap to toggle); emphasized; disabled',
        layout: 'fill',
        render: () => (
          <Stateful initial={['bold', 'numbered']}>
            {(sel, set) => {
              const item = (id: string, icon: string, extra?: Partial<SK.SKTextToolbarItem>): SK.SKTextToolbarItem => ({ id, icon, isSelected: sel.includes(id), voiceoverText: id, ...extra })
              return (
                <SK.SKTextToolbar
                  sections={[
                    { items: [item('bold', 'bold'), item('italic', 'italic'), item('strike', 'strikethrough'), item('code', 'code')] },
                    { items: [item('bullets', 'bulleted_list'), item('numbered', 'numbered_list'), item('plus', 'plus', { selectionStyle: 'emphasized' })] },
                    { items: [item('quote', 'quote', { isEnabled: false }), item('link', 'link')] },
                  ]}
                  onSelectedItem={(id, was) => set(was ? sel.filter((x) => x !== id) : [...sel, id])}
                />
              )
            }}
          </Stateful>
        ),
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixtures: none; bold selected; plus emphasized; bold disabled; bold selected + disabled",
        snapshot: 'SKTextToolbarSnapshotTests/testAllItemsUnselected, …SelectedItem, …EmphasizedItemMatchesSelectedChrome, …DisabledItem, …SelectedAndDisabledItem',
        render: () => {
          const bar = (first: SK.SKTextToolbarItem) => <SK.SKTextToolbar sections={[{ items: [first, { id: 'h1', icon: 'heading_1' }, { id: 'checklist', icon: 'checkbox' }] }]} style={{ width: 117 }} />
          return (
            <>
              {bar({ id: 'bold', icon: 'bold' })}
              {bar({ id: 'bold', icon: 'bold', selectionStyle: 'selected' })}
              {bar({ id: 'plusMenu', icon: 'plus', selectionStyle: 'emphasized' })}
              {bar({ id: 'bold', icon: 'bold', isEnabled: false })}
              {bar({ id: 'bold', icon: 'bold', selectionStyle: 'selected', isEnabled: false })}
            </>
          )
        },
      },
    ],
  },
  {
    name: 'SKTextInput',
    group: 'Text inputs and tokens',
    swift: 'CoreComponents/TextInput/SKTextInput.swift',
    about: 'The multi-line text view under the composer: Lato 17, 8 pt top and bottom insets, a one-line SKFont.body placeholder in contentSecondary. Grows to fit (disabled), up to a height (maximumHeight), or scrolls in its own height (enabled).',
    usage: `<SKTextInput placeholderText="Message #general" scrollBehavior={{ maximumHeight: 120 }} onChange={setDraft} />`,
    specimens: [
      {
        id: 'grow',
        label: 'maximumHeight 120: type a few lines',
        layout: 'fill',
        render: () => (
          <div style={{ padding: '0 16px' }}>
            <SK.SKTextInput placeholderText="Message #general" scrollBehavior={{ maximumHeight: 120 }} />
          </div>
        ),
      },
      {
        id: 'text',
        label: 'with text, grows to fit (disabled)',
        layout: 'fill',
        render: () => (
          <div style={{ padding: '0 16px' }}>
            <SK.SKTextInput defaultValue={'Quick pop quiz for everyone!\nWhat did the fox say?'} scrollBehavior="disabled" />
          </div>
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ Lists
  {
    name: 'SKGenericEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/GenericEntity/SKGenericEntity.swift',
    about:
      'The general list row: any ornament (small 24, medium 36, extraLarge 56), a title with a trailing text, adjacent tag, inline icon / emoji / badge and workspace, secondary text below, an accessory text, and trailing accessories. Press for the rounded highlight and the 8 pt shrink; disabled goes tertiary.',
    usage: `<SKGenericEntity primaryText="Notifications" secondaryText="Mentions only" size="medium"
  ornament={{ icon: { icon: 'notifications' } }} accessories={['chevron']} onSelected={open} />
<SKGenericEntity primaryText="Dark mode" accessories={[{ toggleSwitch: { isOn: dark, onToggled: setDark } }]} />
<SKGenericEntity primaryText="Polly" adjacentText={{ text: 'APP', textColor: 'var(--sk_foreground_max_solid)', backgroundColor: 'var(--sk_foreground_low_solid)' }} />`,
    specimens: [
      {
        id: 'small',
        label: 'small: text; secondary text; accessory text; icon; slash command; APP tag',
        snapshot: 'SKGenericEntitySnapshotTests/testGenericEntitySmall, …WithSecondaryText, testGenericEntityWithAccessorySmall, …WithIconSmall, …',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKGenericEntity primaryText="Title" size="small" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" secondaryText="This is some detail text that should wrap to a new line." size="small" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" accessoryText="Accessory" size="small" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" ornament={{ icon: { icon: 'notifications_off', color: 'var(--sk_raspberry_red)' } }} size="small" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" ornament={{ icon: { slashCommand: true } }} size="small" onSelected={() => {}} />
            <SK.SKGenericEntity
              primaryText="Title"
              secondaryText="This is some detail text that should wrap to a new line."
              adjacentText={{ text: 'APP', textColor: 'var(--sk_foreground_max_solid)', backgroundColor: 'var(--sk_foreground_low_solid)' }}
              size="small"
              onSelected={() => {}}
            />
          </>
        ),
      },
      {
        id: 'medium',
        label: 'medium: secondary text; + accessory text; icon; icon + secondary; emoji; image; disabled',
        snapshot: 'testGenericEntityLarge, …WithAccessoryLarge, …WithIconLarge, …WithIconLargeWithSecondaryText, …WithEmojiLarge, …WithImageLarge, …DisabledLarge',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKGenericEntity primaryText="Title" secondaryText="This is some detail text that should wrap to a new line." size="medium" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" secondaryText="This is some detail text that should wrap to a new line." accessoryText="Accessory" size="medium" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" ornament={{ icon: { icon: 'notifications_off', color: 'var(--sk_raspberry_red)' } }} size="medium" onSelected={() => {}} />
            <SK.SKGenericEntity
              primaryText="Title"
              secondaryText="This is some detail text that should wrap to a new line."
              ornament={{ icon: { icon: 'notifications_off', color: 'var(--sk_raspberry_red)' } }}
              size="medium"
              onSelected={() => {}}
            />
            <SK.SKGenericEntity primaryText="Title" ornament={{ icon: { emoji: 'squid' } }} size="medium" onSelected={() => {}} />
            <SK.SKGenericEntity primaryText="Title" ornament={{ image: AV.acme }} size="medium" onSelected={() => {}} />
            <SK.SKGenericEntity
              primaryText="Title"
              secondaryText="This is some detail text that should wrap to a new line."
              ornament={{ icon: { icon: 'notifications_off', color: 'var(--sk_raspberry_red)' } }}
              size="medium"
              isEnabled={false}
            />
          </>
        ),
      },
      {
        id: 'xl',
        label: 'extraLarge: APP tag; member avatar (icon)',
        snapshot: 'testGenericEntityExtraLargeWithApplicationLabel, testGenericEntityWithIconMemberAvatarOrnament',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKGenericEntity
              primaryText="Title"
              secondaryText="This is some detail text that should wrap to a new line."
              adjacentText={{ text: 'APP', textColor: 'var(--sk_foreground_max_solid)', backgroundColor: 'var(--sk_foreground_low_solid)' }}
              size="extraLarge"
            />
            <SK.SKGenericEntity primaryText="Title" secondaryText="This is some detail text that should wrap to a new line." ornament={{ memberAvatar: { icon: 'user_hide', name: '' } }} size="extraLarge" />
          </>
        ),
      },
      {
        id: 'accessories',
        label: 'accessories: chevron, switch, checkbox, radio, badge, button, more; swipe right or left on the last row',
        layout: 'flush',
        render: () => (
          <Stateful initial={{ sw: true, cb: false, radio: 1 }}>
            {(v, set) => (
              <>
                <SK.SKGenericEntity primaryText="Preferences" ornament={{ icon: { icon: 'settings' } }} accessories={['chevron']} onSelected={() => {}} />
                <SK.SKGenericEntity primaryText="Dark mode" accessories={[{ toggleSwitch: { isOn: v.sw, onToggled: (on) => set({ ...v, sw: on }) } }]} onSelected={() => set({ ...v, sw: !v.sw })} />
                <SK.SKGenericEntity primaryText="Mark as read" accessories={[{ checkbox: { isOn: v.cb, onToggled: (on) => set({ ...v, cb: on }) } }]} onSelected={() => set({ ...v, cb: !v.cb })} />
                {[0, 1].map((i) => (
                  <SK.SKGenericEntity key={i} primaryText={i ? 'Mentions only' : 'Everything'} accessories={[{ radioButton: { isOn: v.radio === i } }]} onSelected={() => set({ ...v, radio: i })} />
                ))}
                <SK.SKGenericEntity primaryText="Unreads" accessories={[{ badge: { count: 3 } }, 'chevron']} onSelected={() => {}} />
                <SK.SKGenericEntity primaryText="Invite people" accessories={[{ button: { title: 'Invite', size: 'small' } }]} />
                <SK.SKGenericEntity
                  primaryText="Swipe me"
                  secondaryText="left action: Mark read · right action: Delete"
                  ornament={{ icon: { icon: 'channel' } }}
                  size="medium"
                  accessories={['more']}
                  swipeActions={{
                    left: { id: 'read', icon: 'check', activeIcon: 'check_circle_filled', label: 'Mark read', backgroundColor: 'var(--sk_sapphire_blue)', foregroundColor: 'var(--dt_color_constants_white)' },
                    right: { id: 'delete', icon: 'trash', activeIcon: 'trash_filled', label: 'Delete', backgroundColor: 'var(--sk_raspberry_red)', foregroundColor: 'var(--dt_color_constants_white)' },
                  }}
                  onSelected={() => {}}
                />
              </>
            )}
          </Stateful>
        ),
      },
    ],
  },
  {
    name: 'SKMemberEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/MemberEntity/SKMemberEntity.swift',
    about: 'A person: avatar with presence, bold name, display name, status emoji, workspace; secondary text only at medium; deactivated goes tertiary with a grayscale avatar.',
    usage: `<SKMemberEntity name="Lisa Dawson" displayName="lisa" avatar={src} presence="active" size="medium" />
<SKMemberEntity name="Lisa Dawson" avatar={src} workspace={{ image: org.icon, title: 'Enterprise' }} />`,
    specimens: [
      {
        id: 'rows',
        label: 'medium active + display name; medium + secondary; small + workspace; small + status; deactivated; presence only',
        snapshot: 'SKMemberEntitySnapshotTests/testMemberEntityMediumWithUserDataActive, …MediumWithSecondaryText, …SmallWithWorkspace, …SmallWithStatus',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKMemberEntity name="Steve Jobs" displayName="Steve" avatar={AV.matt} presence="active" size="medium" onSelected={() => {}} />
            <SK.SKMemberEntity name="Steve Jobs" secondaryText="Chief Executive Officer" avatar={AV.matt} size="medium" onSelected={() => {}} />
            <SK.SKMemberEntity name="Steve Jobs" avatar={AV.matt} workspace={{ image: AV.acme, title: 'Enterprise' }} onSelected={() => {}} />
            <SK.SKMemberEntity name="This is a lot of text that should push the status to the side" avatar={AV.matt} statusEmoji="joy" onSelected={() => {}} />
            <SK.SKMemberEntity name="Steve Jobs" secondaryText="Chief Executive Officer" avatar={AV.matt} size="medium" isDeactivated />
            <SK.SKMemberEntity name="Steve Jobs" presence="active" shouldHideMemberAvatars onSelected={() => {}} />
          </>
        ),
      },
      {
        id: 'fixtures',
        label: "Slack's snapshot fixture (steve_jobs): medium active + display name; medium away; small with secondaryTextVisibility always (September 2026), and deactivated",
        snapshot: 'SKMemberEntitySnapshotTests/testMemberEntityMediumWithUserDataActive, …Inactive, …SmallAlwaysVisibleSecondaryText, …SmallAlwaysVisibleSecondaryTextDeactivated',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKMemberEntity name="Steve Jobs" displayName="Steve" avatar={FIXTURE.steveJobs} presence="active" size="medium" onSelected={() => {}} />
            <SK.SKMemberEntity name="Steve Jobs" displayName="Steve" avatar={FIXTURE.steveJobs} presence="away" size="medium" onSelected={() => {}} />
            <SK.SKMemberEntity name="Steve Jobs" avatar={FIXTURE.steveJobs} secondaryText="Chief Executive Officer" secondaryTextVisibility="always" onSelected={() => {}} />
            <SK.SKMemberEntity name="Steve Jobs" avatar={FIXTURE.steveJobs} secondaryText="Chief Executive Officer" secondaryTextVisibility="always" isDeactivated onSelected={() => {}} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKChannelEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/ChannelEntity/SKChannelEntity.swift',
    about: 'A channel: a #, lock or archive tile, the bold name, a shared-channel icon, secondary text (3 lines).',
    usage: `<SKChannelEntity name="announcements" secondaryText="Company-wide news" size="medium" onSelected={open} />
<SKChannelEntity name="design-team" channelType="private" shareType="external" />`,
    specimens: [
      {
        id: 'rows',
        label: 'medium + secondary; medium external + secondary; small archived; small private',
        snapshot: 'SKChannelEntitySnapshotTests/testChannelEntityMediumWithSecondaryText, …MediumWithInlineIconAndWorkspace, …SmallArchived',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKChannelEntity name="announcements" secondaryText={CHANNEL_SECONDARY} size="medium" onSelected={() => {}} />
            <SK.SKChannelEntity name="announcements" secondaryText={CHANNEL_SECONDARY} shareType="external" size="medium" onSelected={() => {}} />
            <SK.SKChannelEntity name="announcements" channelType="archived" onSelected={() => {}} />
            <SK.SKChannelEntity name="design-team" channelType="private" onSelected={() => {}} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKMultiPersonDirectMessageEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/MPDMEntity/SKMultiPersonDirectMessageEntity.swift',
    about: 'A group DM: an SKGroupAvatar (a count at small, two faces at medium), the members’ names in bold up to 4 lines.',
    usage: `<SKMultiPersonDirectMessageEntity names="Lisa, Lee, Zoe" count={3} primarySrc={a} secondarySrc={b} size="medium" />`,
    specimens: [
      {
        id: 'rows',
        label: 'small (count), medium (faces), medium long names',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKMultiPersonDirectMessageEntity names="Lisa Dawson, Lee Hao" count={3} onSelected={() => {}} />
            <SK.SKMultiPersonDirectMessageEntity names="Lisa Dawson, Lee Hao" count={3} primarySrc={AV.lisa} secondarySrc={AV.lee} size="medium" onSelected={() => {}} />
            <SK.SKMultiPersonDirectMessageEntity
              names="Lisa Dawson, Lee Hao, Zoe Maxwell, Arcadio Buendía, Geeta Joshi, Matt Brewer"
              count={7}
              primarySrc={AV.lisa}
              secondarySrc={AV.lee}
              size="medium"
              onSelected={() => {}}
            />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKUserGroupEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/UserGroupEntity/SKUserGroupEntity.swift',
    about: 'A user group: a user_groups (or megaphone for broadcast) tile and the handle.',
    usage: `<SKUserGroupEntity handle="@design" secondaryText="12 members" size="medium" />`,
    specimens: [
      {
        id: 'rows',
        label: 'small, medium + secondary, broadcast',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKUserGroupEntity handle="@design" onSelected={() => {}} />
            <SK.SKUserGroupEntity handle="@design" secondaryText="12 members" size="medium" onSelected={() => {}} />
            <SK.SKUserGroupEntity handle="@here" isBroadcast size="medium" onSelected={() => {}} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKWorkspaceEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/WorkspaceEntity/SKWorkspaceEntity.swift',
    about: 'A workspace: its avatar (with badges) and the bold name; extraLarge for the switcher.',
    usage: `<SKWorkspaceEntity name="Acme" icon={logo} secondaryText="acme.slack.com" size="medium" />`,
    specimens: [
      {
        id: 'rows',
        label: 'small, medium + secondary, medium with a mention badge, extraLarge',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKWorkspaceEntity name="Acme" icon={AV.acme} onSelected={() => {}} />
            <SK.SKWorkspaceEntity name="Acme" icon={AV.acme} secondaryText="acme.slack.com" size="medium" onSelected={() => {}} />
            <SK.SKWorkspaceEntity name="Acme" icon={AV.acme} workspaceType={{ mentionCount: 3 }} secondaryText="acme.slack.com" size="medium" onSelected={() => {}} />
            <SK.SKWorkspaceEntity name="Acme" icon={AV.acme} secondaryText="acme.slack.com" size="extraLarge" onSelected={() => {}} />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKAppEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/AppEntity/SKAppEntity.swift',
    about: 'An app or bot: its icon image and the name with an adjacent tag ("APP", "AGENTFORCE"…).',
    usage: `<SKAppEntity name="Polly" icon={polly} adjacentText={{ text: 'APP', textColor: 'var(--sk_foreground_max_solid)', backgroundColor: 'var(--sk_foreground_low_solid)' }} />`,
    specimens: [
      {
        id: 'rows',
        label: 'small APP, medium + secondary, Agentforce tag',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKAppEntity name="Polly" icon="/kit/apps/polly.png" adjacentText={{ text: 'APP', textColor: 'var(--sk_foreground_max_solid)', backgroundColor: 'var(--sk_foreground_low_solid)' }} onSelected={() => {}} />
            <SK.SKAppEntity
              name="Google Drive"
              icon="/kit/apps/google-drive.png"
              secondaryText="Access files and get notifications"
              adjacentText={{ text: 'APP', textColor: 'var(--sk_foreground_max_solid)', backgroundColor: 'var(--sk_foreground_low_solid)' }}
              size="medium"
              onSelected={() => {}}
            />
            <SK.SKAppEntity
              name="Sales Agent"
              icon="/kit/apps/sales-agent.png"
              adjacentText={{ text: 'AGENTFORCE', textColor: 'var(--dt_color_content_highlight_1)', backgroundColor: 'var(--dt_color_base_highlight_1)' }}
              onSelected={() => {}}
            />
          </>
        ),
      },
    ],
  },
  {
    name: 'SKHeaderEntity',
    group: 'Lists',
    swift: 'DesignerComponents/Entities/SKHeaderEntity.swift',
    about: 'A list section header: 8 pt extra top padding, a 20 pt ornament, the title (Lato Bold 15) over an optional second line, a badge, a right text or icon button, and a collapse caret. Tap the title or caret to collapse.',
    usage: `<SKHeaderEntity primaryText="2,910 People" rightButton={{ text: 'See All' }} shouldShowCollapseIndicator
  isCollapsed={collapsed} onHeaderTapped={() => setCollapsed(!collapsed)} />
<SKHeaderEntity primaryText="Recent" size="small" />`,
    specimens: [
      {
        id: 'tests',
        label: 'medium title; collapsible + "See All"; + secondary text; small title; small + secondary text',
        snapshot: 'SKListHeaderSnapshotTests/testMediumShortTitle, …CollapsibleWithTextButton, …ShortTitleWithShortSecondaryText, testSmallShortTitle, …WithShortSecondaryText',
        layout: 'flush',
        render: () => (
          <>
            <SK.SKHeaderEntity primaryText="Title" />
            <SK.SKHeaderEntity primaryText="2,910 People" rightButton={{ text: 'See All' }} shouldShowCollapseIndicator />
            <SK.SKHeaderEntity primaryText="Title" secondaryText="Secondary text" />
            <SK.SKHeaderEntity primaryText="Title" size="small" />
            <SK.SKHeaderEntity primaryText="Title" secondaryText="Secondary text" size="small" />
          </>
        ),
      },
      {
        id: 'medium',
        label: 'medium collapsible with text button; with secondary text; ornament + badge; small',
        snapshot: 'SKListHeaderSnapshotTests/testMediumCollapsibleWithTextButton, …ShortTitleWithShortSecondaryText, testSmallShortTitle',
        layout: 'flush',
        render: () => (
          <Stateful initial={false}>
            {(collapsed, set) => (
              <>
                <SK.SKHeaderEntity primaryText="2,910 People" rightButton={{ text: 'See All' }} shouldShowCollapseIndicator isCollapsed={collapsed} onHeaderTapped={() => set(!collapsed)} />
                <SK.SKHeaderEntity primaryText="Channels" secondaryText="Short secondary text" />
                <SK.SKHeaderEntity primaryText="Starred" ornament={{ ornamentBox: { icon: 'star_filled', color: 'var(--sk_sunshine_yellow)' } }} rightBadge={{ count: 4 }} rightButton={{ icon: 'plus', accessibilityLabel: 'Add' }} />
                <SK.SKHeaderEntity primaryText="Recent" size="small" rightButton={{ text: 'Edit' }} />
              </>
            )}
          </Stateful>
        ),
      },
    ],
  },

  {
    name: 'SKEntityRow',
    group: 'Lists',
    swift: 'Helpers/EntityViews/SKEntityBaseView.swift (Home’s .small rows)',
    about:
      'The compact 44 pt row Home and most screens use (an SKEntityBaseView .small): a 24 pt ornament, the name in the row state’s weight and color (unread Black, read/action secondary, muted tertiary), inline items, trailing accessories. With SKListHeader (the 52 pt Home section header) and SKListFooter (8 pt + hairline).',
    usage: `<SKListHeader title="Channels" collapsed={c} onToggle={toggle} button={{ icon: 'plus', label: 'Add', onClick: add }} />
<SKEntityRow ornament={<RowIcon name="channel" />} title="general" state="unread" accessories={<SKBadge count={3} />} onClick={open} />
<SKEntityRow ornament={<SKMemberAvatar src={a} name="Lisa" size="small" presence="active" />} title="Lisa Dawson" state="read" />
<SKListFooter />`,
    specimens: [
      {
        id: 'home',
        label: 'header, unread / read / muted / action rows, footer (press a row)',
        layout: 'flush',
        render: () => (
          <Stateful initial={false}>
            {(collapsed, set) => (
              <>
                <SK.SKListHeader title="Channels" collapsed={collapsed} onToggle={() => set(!collapsed)} button={{ icon: 'plus', label: 'Add channel', onClick: () => {} }} />
                {!collapsed && (
                  <>
                    <SK.SKEntityRow ornament={<SK.RowIcon name="channel" />} title="announcements" state="unread" accessories={<SK.SKBadge count={3} />} onClick={() => {}} />
                    <SK.SKEntityRow ornament={<SK.RowIcon name="channel" />} title="design-crit" state="read" onClick={() => {}} />
                    <SK.SKEntityRow ornament={<SK.RowIcon name="lock" />} title="leadership" state="muted" onClick={() => {}} />
                    <SK.SKEntityRow
                      ornament={<SK.SKMemberAvatar src={AV.lisa} name="Lisa Dawson" size="small" presence="active" />}
                      title="Lisa Dawson"
                      state="read"
                      inline={<SK.SKEmoji name="palm_tree" />}
                      onClick={() => {}}
                    />
                    <SK.SKEntityRow ornament={<SK.RowIcon name="plus" />} title="Add channels" state="action" onClick={() => {}} />
                  </>
                )}
                <SK.SKListFooter />
              </>
            )}
          </Stateful>
        ),
      },
    ],
  },
]
