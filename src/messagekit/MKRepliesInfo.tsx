import { useApp } from '../app/store'
import { SKMemberAvatar } from '../slackkit/SKMemberAvatar'
import { repliesText, shortOrdinal } from './format'

// The thread reply bar under a message (MKRepliesInfoView, spec messages.md §7): up to five 28 pt avatars 7 apart, the
// reply count in content_highlight_1 (RepliesInfoMapper.swift:22 [Sept]; June sk_highlight) and the latest reply's time.
// Tap → the thread (MessageListActionHandler.swift:231-239).

interface Props {
  conversationId: string
  ts: string
  count: number
  /** reply authors, first repliers first (RepliesInfoMapper.swift:21, 101) */
  users: string[]
  /** ts of the latest reply; shown as "Today at 10:42 AM" (shortOrdinalDisplayString, RepliesInfoMapper.swift:88-90) */
  latest?: string
  /** directly under the header (no content): no 8 pt gap */
  first?: boolean
}

export function MKRepliesInfo({ conversationId, ts, count, users, latest, first }: Props) {
  const people = useApp((s) => s.fx.users)
  const openThread = useApp((s) => s.openThread)
  if (count <= 0 || !users.length) return null
  const text = repliesText(count)
  const time = latest ? shortOrdinal(latest) : undefined
  return (
    <div
      className={`mk-replies${first ? ' is-first' : ''}`}
      role="button"
      aria-label={text}
      data-tap
      onClick={(e) => {
        e.stopPropagation()
        openThread(conversationId, ts)
      }}
    >
      <div className="mk-replies__pile" aria-hidden>
        {users.slice(0, 5).map((id) => {
          const u = people[id]
          // SKAvatarPile .small: 28 pt, radius 7 (10/40 of the side), base_tertiary placeholder (SKImageView.swift:85-92)
          return <SKMemberAvatar key={id} src={u?.avatar} name={u?.realName ?? id} size={28} />
        })}
      </div>
      <div className="mk-replies__row">
        <span className="mk-replies__count">{text}</span>
        {time && <span className="mk-replies__time">{time}</span>}
      </div>
    </div>
  )
}
