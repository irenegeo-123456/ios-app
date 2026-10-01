import icons from './generated/icons.json'
import type { CSSProperties } from 'react'

// Slack's iOS icons: the SVGs in Modules/Data/Icon/ResourceBundle/Icons.xcassets (tools/ios/harvest.mjs), drawn on a
// 20-unit grid. `name` is the imageset name (`home_filled`, `direct_messages`, `notifications`): the iOS code refers to
// them as SKIconManifest.svgHomeFilled etc. (src/icons/generated/manifest.json maps one to the other). Monochrome icons
// take the text color (iOS renders them as templates); the few multicolor ones (slackbot_color…) keep their colors.

export type IconName = keyof typeof icons

const ICONS = icons as Record<string, { viewBox: string; body: string; multicolor?: boolean }>

export const iconNames = Object.keys(ICONS) as IconName[]
export const isIconName = (s: string): s is IconName => s in ICONS

interface Props {
  name: IconName | (string & {})
  /** points; iOS draws most icons at 20 or 24 */
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
  title?: string
}

export function Icon({ name, size = 20, color, className, style, title }: Props) {
  const icon = ICONS[name]
  if (!icon) {
    if (import.meta.env.DEV) console.warn(`[icon] no iOS icon named "${name}"`)
    return <span className={className} style={{ display: 'inline-block', width: size, height: size, ...style }} />
  }
  return (
    <svg
      className={['ios-icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ color, flex: 'none', display: 'block', ...style }}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  )
}
