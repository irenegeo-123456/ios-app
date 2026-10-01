# Block Kit — verified reference

Every claim here checked page by page against `docs.slack.dev` on **2026-09-01** (copied from the web kit's skill).
Confirm the specific page before stating any of it as fact — Slack ships new fields continuously.

## The 21 block types

`actions` · `alert` · `card` · `carousel` · `container` · `context` · `context_actions` · `data_table` · `data_visualization` · `divider` · `file` · `header` · `image` · `input` · `markdown` · `plan` · `rich_text` · `section` · `table` · `task_card` · `video`

Commonly assumed not to exist, but real: `table`, `data_table`, `card`, `container`, `data_visualization`, `task_card`.

Genuinely absent: no **chip** element, no **stat-tile / KPI** block. Use `tag` and section `fields` respectively.

## Surface availability

| Surfaces | Blocks |
|---|---|
| Modals + Messages + Home tabs | `actions`, `card`, `context`, `divider`, `header`, `image`, `input`, `rich_text`, `section`, `video` |
| Messages + Home tabs (no modals) | `carousel`, `container`, `data_table`, `table` |
| **Messages only** | `context_actions`, `data_visualization`, `file`, `markdown`, `plan`, `task_card` |
| **Modals only** | `alert` — "Alert blocks are currently only supported in modals." |

Consequences worth remembering:
- **A Home tab cannot contain a chart.** `data_visualization` is Messages-only. Put charts in a posted message.
- `alert` is modals-only — not messages, not Home tabs.
- `file` can't be added to app surfaces directly; it appears when retrieving messages containing remote files.

## Tags

`tag` is a **rich_text element**, not a block. Valid only inside `rich_text_section`, `rich_text_list`, or `rich_text_quote`, within a `rich_text` block. Available in modals, messages, and Home tabs.

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `"tag"` |
| `text` | yes | label |
| `color` | no | gray, brown, purple, indigo, blue, green, yellow, orange, red |
| `style` | no | bold, italic, strike, highlight, client_highlight, underline, unlink |

```json
{ "type": "rich_text", "elements": [
  { "type": "rich_text_section", "elements": [
    { "type": "tag", "text": "In progress", "color": "blue" }
  ]}
]}
```

**A tag cannot go in a section's `text`** — that's a text object, not rich_text. Status text inside a `section` has to be mrkdwn (inline code reads well).

## Buttons

Valid **only** in `section` and `actions` blocks — verbatim: "The button element must be used inside either the section or actions block." So **no button in a table cell.**

Fields: `type`, `text`, `action_id`, `url`, `value`, `style`, `confirm`, `accessibility_label`, `agent_prompt`.

**No icon field.** Emoji in the text label is the legal way to get a glyph. `style` accepts only `primary` and `danger` (plus default).

## Section

Exactly **one** `accessory` — the field is singular. Button + overflow on one row needs a following `actions` block.

`text` up to 3,000 chars. `fields` max 10 items, 2,000 chars each, two-column layout on desktop (one column on iOS). `block_id` max 255. Also `expand`.

Accessory-compatible elements: button, checkboxes, date picker, image, multi-select, overflow, radio, select, time picker, workflow button.

## Tables

**`table`** — cells accept only `rich_text`, `raw_text`, `raw_number`. **No interactive elements in cells.** `column_settings` supports only `align` (left/center/right) and `is_wrapped` — no width tracks. Max 100 rows × 20 cells per row, 10,000 chars per table.

**`data_table`** — fields: `type`*, `rows`*, `caption`*, `block_id`, `page_size`, `row_header_column_index` (* required; **`caption` is required**). `page_size` 1-100, default 5. Rows 2-201 (1 header + 200 data). Columns 1-20. **No `column_settings`**.

## Charts (`data_visualization`)

Line, bar, area, pie. **Messages only.** Max **2 per message**. `title` required, ≤50 chars, plus a `chart` object. Series 1-12, names unique. Data points 1-20 per series. Labels ≤20 chars.

## Other limits

- **`context`** — "image elements and text objects" only, max 10.
- **`container`** — max 10 `child_blocks`, drawn from: actions, context, divider, file, header, image, input, rich_text, section, table, video. **No `card`.**
- **App Home** — exactly three tabs: Home, Messages, About. Fixed client chrome; you can enable/disable Home and Messages but cannot create or rename tabs. Home tab caps at **100 blocks**.

## Unverified

- Pie segment "value > 0" — docs say only that each segment requires a label and a numeric value.
