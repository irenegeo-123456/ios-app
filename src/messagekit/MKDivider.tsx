// MKDivider (Modules/UIInfra/MessageKit/Implementation/MKDivider.swift, spec messages.md §8): the date divider ("Today",
// "Yesterday", "Jun 4th") and the unread "NEW" divider, merged when they fall in the same place; with no labels, a bare
// hairline (the separator under a thread root). Not tappable (MessageTransformationMapper.swift:122).

interface Props {
  /** "Today" / "Yesterday" / "Jun 4th" (dayDividerLabel) */
  date?: string
  /** the last-read marker: a red line and "NEW" (`new_all_caps`, yaml:12791) */
  isNew?: boolean
}

export function MKDivider({ date, isNew }: Props) {
  const bare = !date && !isNew
  return (
    <div
      className={['mk-divider', bare && 'is-bare', isNew && 'is-new'].filter(Boolean).join(' ')}
      role={bare ? 'separator' : 'heading'}
      aria-level={bare ? undefined : 3}
      aria-label={bare ? undefined : [date, isNew && 'NEW'].filter(Boolean).join(', ')}
    >
      {!bare && (
        <div className="mk-divider__labels">
          {date && <span className="mk-divider__date">{date}</span>}
          {isNew && <span className="mk-divider__new">NEW</span>}
        </div>
      )}
      <div className="mk-divider__line" />
    </div>
  )
}
