---
name: slack-platform-facts
description: Verified reference for what the Slack platform can actually do — Block Kit blocks and elements, field limits, the six surfaces (App Home, Canvases, Lists, Messages, Modals, Split view), agents, and Slackbot. Use whenever a question asks whether Slack supports something ("does Block Kit have", "can I put X in Y", "is there a chip/tag/chart element", "what fields does X take", "can a Home tab show this", "what surfaces are there", "where do agents appear", "what about Slackbot"), or when building or reviewing a Block Kit payload. ALWAYS use this instead of answering Slack platform questions from memory.
allowed-tools: [Read, WebFetch, Bash, Grep]
---

# Slack Platform Facts

Answer Slack platform capability questions from verified sources, never from recall.

## Why this skill exists

Recall of the Block Kit surface is unreliable and skews small and old. The real list is 21 block types and 47+
element types; memory reliably returns only the dozen classic interactive elements and badly under-represents the
`rich_text_*` family and newer blocks (`table`, `data_table`, `card`, `container`, `data_visualization`,
`task_card`, `tag`). Wrong **negative** claims have killed viable design directions.

## The negative-claim trap — read this first

1. **Never assert absence without naming the page you checked.** Say "I checked
   `docs.slack.dev/reference/block-kit/blocks/` and there's no KPI block", never a bare "that doesn't exist."
2. **Lead with what DOES exist.** "There's a `tag` element, rich_text only", never "**No chip element.**"
3. **Absence of a *name* is not absence of the *capability*.** No "chip" and no "KPI tile", but `tag` and section
   `fields` do those jobs. Answer the underlying need.

## How to answer

1. Read the verified reference in this skill directory: `block-kit.md` (blocks, elements, fields, limits, where
   they're valid) and `surfaces.md` (the six surfaces, agents, Slackbot).
2. **Confirm against the live page** (`docs.slack.dev/reference/block-kit/blocks/<name>-block`,
   `.../block-elements/<name>-element`) before stating anything as fact; the cache says where to look.
3. Answer with the page cited and the date.

## In this kit (iPhone)

The platform facts say what's *valid*; how the **iPhone app draws** it is a separate question, answered by
`reference/ios/specs/blockkit.md` (from Slack's iOS source): e.g. section `fields` stack in one column, overflow is a
"More" text button, a `markdown` block shows "Not available on mobile yet". Preview at `/?kit=blocks`. For design
values (colors, sizes) use the iOS tokens (`docs/conventions.md`), not this skill.
