import type { ReactNode } from 'react'
import { renderInlines } from '../../app/text/RichText'
import { registerBlock } from '../surface'
import { toInlines, type RtBlockElement } from '../rich-text'
import { BKButton } from '../elements/Elements'
import type { DataTableBlock, DataTableCell, TableBlock, TableCell } from '../types'

// The table block (spec blockkit.md §3.12; Blocks/Table/BKTableBlockView.swift, Views/BKTableBlockCell.swift,
// Layout/BKTableBlockCollectionViewLayout.swift): Lato 17 cells (the first row bold) padded 8 / 12, each column as wide
// as its widest cell (cells measured at most 260, at least 40), 1 pt grid lines and a 1 pt outer border in
// outline_tertiary with radius 8; wider than the block, it scrolls sideways. At most 8 rows show (the header + 7); a
// longer table fades into base_primary over its last 50 pt. 2 pt above and below.
//
// data_table (Slack-internal, §3.19) has its own iOS view that the spec doesn't cover; the clone draws it as a table
// (its action cells as their buttons) so a prototype's data still reads.

const MAX_ROWS = 8

function cellContent(cell: TableCell | DataTableCell | null, blockId: string): ReactNode {
  if (!cell) return null
  switch (cell.type) {
    case 'raw_text':
    case 'cell_text':
    case 'raw_number':
      return cell.text
    case 'rich_text':
      return (cell.elements ?? []).map((el: RtBlockElement, i: number) => ('elements' in el && Array.isArray(el.elements) && el.type !== 'rich_text_list' ? <span key={i}>{renderInlines(toInlines(el.elements as never))}</span> : null))
    case 'action_cell':
      return <BKButton el={cell.element} blockId={blockId} fill={false} />
    default:
      return null
  }
}

function TableView({ block, blockId }: { block: TableBlock | DataTableBlock; blockId: string }) {
  const rows = (block.rows ?? []).filter(Array.isArray)
  const shown = rows.slice(0, MAX_ROWS)
  const width = Math.max(0, ...rows.map((r) => r.length))
  const settings = (block as TableBlock).column_settings ?? []
  return (
    <div className="bk-table">
      <div className="bk-table__scroll" data-scroll-x>
        <table className="bk-table__grid">
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className={i === 0 ? 'is-header' : undefined}>
                {Array.from({ length: width }, (_, c) => (
                  <td key={c} style={{ textAlign: settings[c]?.align ?? 'left' }}>
                    <div className="bk-table__cell">{cellContent(r[c] ?? null, blockId)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_ROWS && <div className="bk-table__fade" />}
    </div>
  )
}

registerBlock('table', TableView as never)
registerBlock('data_table', TableView as never)
