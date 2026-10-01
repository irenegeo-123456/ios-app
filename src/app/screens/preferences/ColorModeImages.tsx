import { useId } from 'react'

// The Color Mode rows' pictures: Modules/Features/Preferences/ResourceBundle/Settings.xcassets/{System,Light,Dark}
// .imageset, each one 120 × 92 SVG (a little Slack window: header bar, divider, two messages with split-color avatars),
// drawn aspect-fit into the row's 93 × 72 pt image view (AppearanceOptionRow.swift:15-23). Ported as is: the colors are
// the asset's own literals. The System picture is the light window on its left half and the dark one on its right.

type Variant = 'light' | 'dark'
const C = {
  light: { bg: '#FFFFFF', bar: '#1D1C1D', title: '#1264A3', divider: '#D9D9D9', square: '#454447', stroke: '#1D1C1D', avatarOpacity: 1 },
  dark: { bg: '#35383C', bar: '#B9BABD', title: '#2BA5CE', divider: '#494C51', square: '#B9BABD', stroke: '#F8F8F8', avatarOpacity: 0.8 },
} as const

function Window({ variant, id }: { variant: Variant; id: string }) {
  const c = C[variant]
  return (
    <>
      <rect width="120" height="92" fill={c.bg} />
      <path d="M120 25V24H60H0V25H60H120Z" fill={c.divider} />
      <rect opacity={c.avatarOpacity} x="10" y="35" width="20" height="20" rx="5" fill={`url(#${id}a)`} />
      <rect x="35" y="39" width="59" height="4" rx="2" fill={c.bar} />
      <rect x="35" y="47" width="73" height="4" rx="2" fill={c.bar} />
      {variant === 'light' && <rect x="10" y="63" width="20" height="20" rx="5" fill="white" />}
      <rect opacity={c.avatarOpacity} x="10" y="63" width="20" height="20" rx="5" fill={`url(#${id}b)`} />
      <rect x="35" y="67" width="59" height="4" rx="2" fill={c.bar} />
      <rect x="35" y="75" width="73" height="4" rx="2" fill={c.bar} />
      <rect x="10" y="7" width="12" height="12" rx="4" fill={c.square} />
      <rect x="28" y="11" width="52" height="4" rx="2" fill={c.title} />
    </>
  )
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}a`} x1="11.5" y1="36.5" x2="29" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0.47598" stopColor="#FFE17D" />
        <stop offset="0.478476" stopColor="#FF77D4" />
      </linearGradient>
      <linearGradient id={`${id}b`} x1="11.5" y1="64.5" x2="29" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0.47598" stopColor="#9BFFB3" />
        <stop offset="0.478476" stopColor="#78B0FF" />
      </linearGradient>
      <clipPath id={`${id}clip`}>
        <path d="M0 10C0 4.47715 4.47715 0 10 0H110C115.523 0 120 4.47715 120 10V92H0V10Z" fill="white" />
      </clipPath>
      <clipPath id={`${id}left`}>
        <rect width="60" height="92" />
      </clipPath>
      <clipPath id={`${id}right`}>
        <rect x="60" width="60" height="92" />
      </clipPath>
    </defs>
  )
}

/** The picture for a Color Mode row. */
export function ColorModeImage({ mode }: { mode: 'system' | 'light' | 'dark' }) {
  const id = useId().replace(/:/g, '')
  const stroke = mode === 'dark' ? C.dark.stroke : C.light.stroke
  return (
    <svg className="pf-mode__image" width="93" height="72" viewBox="0 0 120 92" fill="none" aria-hidden>
      <Defs id={id} />
      <g clipPath={`url(#${id}clip)`}>
        {mode === 'system' ? (
          <>
            <g clipPath={`url(#${id}left)`}>
              <Window variant="light" id={id} />
            </g>
            <g clipPath={`url(#${id}right)`}>
              <Window variant="dark" id={id} />
            </g>
          </>
        ) : (
          <Window variant={mode} id={id} />
        )}
        <path d="M0.5 10C0.5 4.75329 4.75329 0.5 10 0.5H110C115.247 0.5 119.5 4.75329 119.5 10V91.5H0.5V10Z" stroke={stroke} strokeOpacity="0.13" fill="none" />
      </g>
    </svg>
  )
}
