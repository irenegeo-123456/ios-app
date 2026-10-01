import type { CSSProperties } from 'react'
import { SKMemberAvatar, type AvatarSize, type Presence } from '../../../slackkit/SKMemberAvatar'
import { useApp } from '../../store'
import { SLACKBOT_AVATAR, SLACKBOT_USER_ID } from './constants'

/**
 * Slackbot's avatar at any size: an SKMemberAvatar with Slackbot's image (the workspace's USLACKBOT avatar if a prototype
 * set one, else the slackbot_color mark), rounded like every member avatar (min(20, 0.25 × side), or a circle).
 */
export function SlackbotAvatar({ size = 'large', round, presence, className, style }: { size?: AvatarSize | number; round?: boolean; presence?: Presence; className?: string; style?: CSSProperties }) {
  const src = useApp((s) => s.fx.users[SLACKBOT_USER_ID]?.avatar) ?? SLACKBOT_AVATAR
  return <SKMemberAvatar src={src} name="Slackbot" size={size} round={round} presence={presence} className={className} style={style} />
}
