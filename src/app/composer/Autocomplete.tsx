import { useEffect, useRef, type CSSProperties } from 'react'
import { Icon } from '../../icons/Icon'
import { Emoji } from '../../emoji/Emoji'
import { SKMemberAvatar } from '../../slackkit/SKMemberAvatar'
import { SKAdjacentLabel, SKEntityRow } from '../../slackkit/SKEntity'
import { asset } from '../../lib/asset'
import { keepFocus } from './parts'
import { rowKey, type AcRow } from './suggestions'

// The autocomplete card (spec composer.md §18.2–18.3): a glass card floating above the conversation, 16 pt above the
// caret, between the layout margins; SlackKit entity rows at size .small (44 pt; commands 56.33 pt with their caption).

/** Row heights, for the card's height (sum of rows, capped): one line 44, with a caption line 56.33 (§18.3). */
export const rowHeight = (r: AcRow) => (r.kind === 'command' ? 56.33 : 44)

const BROADCAST: Record<string, string> = {
  here: 'Notify everyone online in this channel', // yaml:2203
  channel: 'Notify everyone in this channel', // yaml:2173
  everyone: 'Notify everyone on your team', // yaml:2188
}

function RowView({ row, highlighted, onPick }: { row: AcRow; highlighted: boolean; onPick: (r: AcRow) => void }) {
  const cls = `cmp-ac-row${highlighted ? ' is-highlighted' : ''}`
  const pick = () => onPick(row)
  switch (row.kind) {
    case 'user': {
      const u = row.user
      const bot = u.isApp || u.isBot
      const other = u.realName && u.realName !== u.name ? u.realName : null
      return (
        <SKEntityRow
          className={cls}
          ornament={
            bot ? (
              // bots and apps: a 24 pt image, radius 4, no presence (SKListCellPresentationObject+Member.swift:172-207)
              <img className="cmp-ac-row__app" src={asset(u.avatar)} alt="" draggable={false} />
            ) : (
              <SKMemberAvatar src={u.avatar} name={u.realName} size="small" presence={u.presence === 'away' ? 'away' : 'active'} />
            )
          }
          title={<b className="cmp-ac-row__name">{u.name || u.realName}</b>}
          inline={
            <>
              {other && <span className="cmp-ac-row__secondary">{other}</span>}
              {u.statusEmoji && <Emoji name={u.statusEmoji} size={20} />}
              {bot && <SKAdjacentLabel>APP</SKAdjacentLabel>}
            </>
          }
          // "Not in channel" (not_in_channel, yaml:13181)
          accessories={row.notInChannel ? <span className="cmp-ac-row__secondary">Not in channel</span> : undefined}
          onClick={pick}
        />
      )
    }
    case 'broadcast':
      return (
        <SKEntityRow
          className={cls}
          disabled={row.disabled}
          ornament={<Icon name="megaphone" size={20} />}
          title={row.name}
          // disabled_in_threads (yaml:5477)
          inline={<span className="cmp-ac-row__secondary">{row.disabled ? 'Disabled in threads' : BROADCAST[row.name]}</span>}
          onClick={row.disabled ? undefined : pick}
        />
      )
    case 'group':
      return (
        <SKEntityRow
          className={cls}
          ornament={<Icon name="user_groups" size={20} />}
          // the group's name, its description as the trailing text (SKListCellPresentationObject+UserGroup.swift:16-22)
          title={row.group.name}
          inline={row.group.description ? <span className="cmp-ac-row__secondary">{row.group.description}</span> : undefined}
          onClick={pick}
        />
      )
    case 'channel': {
      const c = row.conv
      const muted = !!c.muted
      const icon = c.type === 'private' ? (muted ? 'lock' : 'lock_filled') : muted ? 'channel' : 'channel_filled'
      return (
        <SKEntityRow
          className={`${cls}${muted ? ' is-muted' : ''}`}
          ornament={<Icon name={icon} size={20} />}
          title={<b className="cmp-ac-row__name">{c.name}</b>}
          onClick={pick}
        />
      )
    }
    case 'emoji':
      return <SKEntityRow className={cls} ornament={<Emoji name={row.name} size={20} />} title={row.name} onClick={pick} />
    case 'command':
      return (
        <SKEntityRow
          className={`${cls} cmp-ac-row--two-line`}
          ornament={<Icon name="slack_logo" size={20} />}
          title={
            <span className="cmp-ac-row__lines">
              <span className="cmp-ac-row__cmd">{row.cmd.name}</span>
              {/* "Command • {description}" (SKListCellPresentationObject+SlashCommand.swift:23-52) */}
              <span className="cmp-ac-row__caption">Command • {row.cmd.description}</span>
            </span>
          }
          onClick={pick}
        />
      )
  }
}

interface Props {
  rows: AcRow[]
  highlighted: number
  onPick: (r: AcRow) => void
  /** placement in the composer's coordinates */
  style: CSSProperties
  maxHeight: number
  /** a new query scrolls back to the top (ARVM:180-185) */
  query: string
}

export function AutocompleteCard({ rows, highlighted, onPick, style, maxHeight, query }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [query])
  // keep the keyboard-highlighted row in view
  useEffect(() => {
    const el = scroller.current?.children[highlighted] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])
  if (!rows.length) return null
  const height = Math.min(maxHeight, rows.reduce((h, r) => h + rowHeight(r), 0))
  return (
    <div className="cmp-ac" style={{ ...style, height }} role="listbox" onPointerDown={keepFocus} data-no-swipe>
      <div className="cmp-ac__scroll ios-scroll" ref={scroller}>
        {rows.map((r, i) => (
          <div key={rowKey(r)} role="option" aria-selected={i === highlighted}>
            <RowView row={r} highlighted={i === highlighted} onPick={onPick} />
          </div>
        ))}
      </div>
    </div>
  )
}
