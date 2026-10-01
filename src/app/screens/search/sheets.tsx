import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from '../../store'
import type { SheetProps } from '../../nav/registry'
import { useSheet } from '../../nav/SheetHost'
import { GlassButton, GlassGroup, GlassGroupItem } from '../../nav/NavBar'
import { Icon } from '../../../icons/Icon'
import { SKMemberAvatar } from '../../../slackkit/SKMemberAvatar'
import { SKCheckbox } from '../../../slackkit/SKCheckbox'
import { SKRadioButton } from '../../../slackkit/SKRadioButton'
import { SKSearchBar } from '../../../slackkit/SKSearchBar'
import { SKListHeader } from '../../../slackkit/SKEntity'
import { EntityRow, SectionFooter } from '../more/EntityRow'
import { useSearch } from './state'
import { XMark } from '../../sheets/ui/SheetBar'
import { CHANNEL_TYPE_TITLES, DATE_TITLES, FILE_TYPE_TITLES, MEMBERSHIP_TITLES, prefixIndex, type ChannelMembership, type ChannelTypeFilter, type DateRange, type FileTypeFilter } from './searchIndex'

// The search filter pickers (SearchFilters/Implementation/PickerModal). From / With / Created By / In are the
// UserConversationPicker in multi-select (SearchFiltersPickerFeature.swift:55-140): nav title = the filter's name, an
// svgClose close button on the left and "Apply" on the right, enabled once the selection changed (:297-304, :314-340);
// a search field; .small rows with checkboxes. Date / File type / "More filters" are SearchFiltersPickerViewController
// (:1-105): nav title "Filter by" (search_filter), sections "Date" (radios) and "File type" (checkboxes) with .medium
// headers and hairline footers (SearchFiltersPickerPresenter.swift:32-66). Channel type / membership are single radio
// sections (:68-101). All are modal sheets embedded in a navigation controller (shouldEmbedInNavController).

/**
 * A sheet's navigation bar: iOS 26 glass close circle, the title (Lato Bold 17), a glass text button. UIKit's chrome.
 * The close glyph: the people / channel pickers set svgClose themselves (SearchFiltersPickerFeature.swift:302;
 * UserConversationPickerViewController.swift); SearchFiltersPickerViewController sets only Apply (:43), so its sheets
 * get the modal's own SF "xmark" close button (ModalPresentationController.swift:312, 380-399;
 * UIViewController+CloseButton.swift:66-76): `systemClose`. Apply is `.title(apply, .default)` (SearchFiltersPickerPresenter
 * .swift:139-148), an SKButton .systemDefault .barButton: Lato Bold 17 in highlight1, contentSecondary when disabled
 * (SKButton+Types.swift:206-207, 255-256; SKButton.swift:249-250). Cited from the September 2026 source.
 */
export function SheetBar({ title, onClose, action, systemClose }: { title: string; onClose: () => void; action?: { title: string; enabled: boolean; onClick: () => void }; systemClose?: boolean }) {
  return (
    <div className="search-sheet-bar">
      <GlassButton label="Close" onClick={onClose}>
        {systemClose ? <XMark /> : <Icon name="close" size={20} />}
      </GlassButton>
      <div className="search-sheet-bar__title">{title}</div>
      {action ? (
        <GlassGroup className={action.enabled ? undefined : 'is-disabled'}>
          <GlassGroupItem label={action.title} onClick={action.enabled ? action.onClick : undefined}>
            <span className="search-sheet-bar__action">{action.title}</span>
          </GlassGroupItem>
        </GlassGroup>
      ) : (
        <span style={{ width: 44 }} />
      )}
    </div>
  )
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

// ------------------------------------------------------------------------------------------------ people

type PeopleFilter = 'from' | 'with' | 'createdBy'
const PEOPLE_TITLES: Record<PeopleFilter, string> = { from: 'From', with: 'With', createdBy: 'Created By' }

export function PeoplePickerSheet({ filter = 'from' }: SheetProps & { filter?: PeopleFilter }) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const visited = useSearch((s) => s.visited)
  const initial = useSearch((s) => s.filters[filter === 'createdBy' ? 'createdBy' : filter])
  const setFilters = useSearch((s) => s.setFilters)
  const [picked, setPicked] = useState<string[]>(initial)
  const [q, setQ] = useState('')
  // frecent first: people you've visited DMs with, then everyone A–Z; bots are left out (includeBots: false)
  const people = useMemo(() => {
    const dmOf = (uid: string) => Object.values(fx.conversations).find((c) => c.type === 'im' && c.userId === uid)?.id
    const rank = (uid: string) => {
      const i = visited.indexOf(dmOf(uid) ?? '')
      return i === -1 ? 99 : i
    }
    return Object.values(fx.users)
      .filter((u) => !u.isBot && !u.isApp)
      .filter((u) => !q.trim() || prefixIndex(u.realName, q) !== -1 || prefixIndex(u.name, q) !== -1)
      .sort((a, b) => rank(a.id) - rank(b.id) || a.realName.localeCompare(b.realName))
  }, [fx, q, visited])
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  return (
    <div className="search-sheet" data-qa={`search_picker_${filter}`}>
      <SheetBar
        title={PEOPLE_TITLES[filter]}
        onClose={() => sheet?.dismiss()}
        action={{ title: 'Apply', enabled: !sameSet(picked, initial), onClick: () => sheet?.dismiss(() => setFilters({ [filter]: picked })) }}
      />
      <div className="search-sheet__search">
        <SKSearchBar text={q} onTextChanged={setQ} placeholderText="Search" />
      </div>
      <div className="search-sheet__list ios-scroll" data-sheet-scroll>
        {people.map((u) => (
          <EntityRow
            key={u.id}
            ornament={<SKMemberAvatar src={u.avatar} name={u.realName} size="small" presence={u.presence === 'away' ? 'away' : 'active'} activeColor="var(--theme_presenceActive)" />}
            title={u.name}
            bold
            inline={u.id === fx.me ? <span className="search-alt-name">(you)</span> : undefined}
            accessories={<SKCheckbox isOn={picked.includes(u.id)} onToggled={() => toggle(u.id)} />}
            onClick={() => toggle(u.id)}
          />
        ))}
        {!people.length && <div className="search-sheet__empty">No results</div>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ channels

export function ChannelPickerSheet(_props: SheetProps) {
  const sheet = useSheet()
  const fx = useApp((s) => s.fx)
  const initial = useSearch((s) => s.filters.in)
  const setFilters = useSearch((s) => s.setFilters)
  const [picked, setPicked] = useState<string[]>(initial)
  const [q, setQ] = useState('')
  const channels = Object.values(fx.conversations)
    .filter((c) => c.type === 'channel' || c.type === 'private')
    .filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  return (
    <div className="search-sheet" data-qa="search_picker_in">
      <SheetBar title="In" onClose={() => sheet?.dismiss()} action={{ title: 'Apply', enabled: !sameSet(picked, initial), onClick: () => sheet?.dismiss(() => setFilters({ in: picked })) }} />
      <div className="search-sheet__search">
        <SKSearchBar text={q} onTextChanged={setQ} placeholderText="Search" />
      </div>
      <div className="search-sheet__list ios-scroll" data-sheet-scroll>
        {channels.map((c) => (
          <EntityRow
            key={c.id}
            ornament={<Icon name={c.type === 'private' ? 'lock' : 'channel'} size={20} />}
            title={c.name}
            accessories={<SKCheckbox isOn={picked.includes(c.id)} onToggled={() => toggle(c.id)} />}
            onClick={() => toggle(c.id)}
          />
        ))}
        {!channels.length && <div className="search-sheet__empty">No results</div>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ date and file type

const DATE_ROWS: DateRange['kind'][] = ['anytime', 'last7', 'last30', 'last3m', 'last12m', 'custom']
const FILE_ROWS = Object.keys(FILE_TYPE_TITLES) as FileTypeFilter[]
const dayInput = (secs: number) => new Date(secs * 1000).toISOString().slice(0, 10)
const fromDayInput = (v: string) => Math.floor(new Date(`${v}T00:00:00`).getTime() / 1000)

export function MoreFiltersSheet({ showDate = true, showFileType = true }: SheetProps & { showDate?: boolean; showFileType?: boolean }) {
  const sheet = useSheet()
  const filters = useSearch((s) => s.filters)
  const setFilters = useSearch((s) => s.setFilters)
  const [date, setDate] = useState<DateRange>(filters.date)
  const [types, setTypes] = useState<FileTypeFilter[]>(filters.fileTypes)
  const changed = JSON.stringify(date) !== JSON.stringify(filters.date) || !sameSet(types, filters.fileTypes)
  const now = Math.floor(Date.now() / 1000)
  const pickKind = (kind: DateRange['kind']) => setDate(kind === 'custom' ? { kind, start: now - 7 * 86400, end: now } : { kind })
  return (
    <div className="search-sheet" data-qa="search_more_filters">
      <SheetBar title="Filter by" systemClose onClose={() => sheet?.dismiss()} action={{ title: 'Apply', enabled: changed, onClick: () => sheet?.dismiss(() => setFilters({ date, fileTypes: types })) }} />
      <div className="search-sheet__list ios-scroll" data-sheet-scroll>
        {showDate && (
          <Section title="Date">
            {DATE_ROWS.map((k) => (
              <EntityRow key={k} title={DATE_TITLES[k]} accessories={<SKRadioButton isOn={date.kind === k} onToggled={() => pickKind(k)} />} onClick={() => pickKind(k)} />
            ))}
            {date.kind === 'custom' && (
              <>
                {/* the custom range's start and end rows (dnd_start / dnd_end "Start" / "End", :170-190) */}
                <EntityRow title="Start" accessories={<input type="date" className="search-date-input" value={dayInput(date.start)} onChange={(e) => e.target.value && setDate({ ...date, start: fromDayInput(e.target.value) })} />} />
                <EntityRow title="End" accessories={<input type="date" className="search-date-input" value={dayInput(date.end ?? date.start)} onChange={(e) => e.target.value && setDate({ ...date, end: fromDayInput(e.target.value) })} />} />
              </>
            )}
          </Section>
        )}
        {showFileType && (
          <Section title="File type">
            {FILE_ROWS.map((t) => {
              const on = types.includes(t)
              const flip = () => setTypes((p) => (on ? p.filter((x) => x !== t) : [...p, t]))
              return <EntityRow key={t} title={FILE_TYPE_TITLES[t]} accessories={<SKCheckbox isOn={on} onToggled={flip} />} onClick={flip} />
            })}
          </Section>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ channel type / membership

const TYPE_ROWS = Object.keys(CHANNEL_TYPE_TITLES) as ChannelTypeFilter[]
const MEMBERSHIP_ROWS = Object.keys(MEMBERSHIP_TITLES) as ChannelMembership[]

export function ChannelOptionsSheet({ filter = 'type' }: SheetProps & { filter?: 'type' | 'membership' }) {
  const sheet = useSheet()
  const filters = useSearch((s) => s.filters)
  const setFilters = useSearch((s) => s.setFilters)
  const [type, setType] = useState(filters.channelType)
  const [membership, setMembership] = useState(filters.channelMembership)
  const changed = type !== filters.channelType || membership !== filters.channelMembership
  const title = filter === 'type' ? 'Channel type' : 'Channel membership'
  return (
    <div className="search-sheet">
      {/* the bar says "Filter by" (search_filter) for every SearchFiltersPickerViewController; "Channel type" / "Channel
          membership" are only the section headers (SearchFiltersPickerPresenter.swift:87, 102, 137-153) */}
      <SheetBar title="Filter by" systemClose onClose={() => sheet?.dismiss()} action={{ title: 'Apply', enabled: changed, onClick: () => sheet?.dismiss(() => setFilters({ channelType: type, channelMembership: membership })) }} />
      <div className="search-sheet__list ios-scroll" data-sheet-scroll>
        <Section title={title}>
          {filter === 'type'
            ? TYPE_ROWS.map((t) => <EntityRow key={t} title={CHANNEL_TYPE_TITLES[t]} accessories={<SKRadioButton isOn={type === t} onToggled={() => setType(t)} />} onClick={() => setType(t)} />)
            : MEMBERSHIP_ROWS.map((m) => (
                <EntityRow key={m} title={MEMBERSHIP_TITLES[m]} accessories={<SKRadioButton isOn={membership === m} onToggled={() => setMembership(m)} />} onClick={() => setMembership(m)} />
              ))}
        </Section>
      </div>
    </div>
  )
}

/** An SKList section: .medium SKHeaderEntity title, rows, a hairline footer. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SKListHeader title={title} collapsible={false} />
      {children}
      <SectionFooter />
    </section>
  )
}
