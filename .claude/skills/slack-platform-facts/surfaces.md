# Slack surfaces — verified reference

Checked against `docs.slack.dev/surfaces/` on **2026-09-01** (copied from the web kit's skill). Confirm the specific
page before stating as fact.

"Surfaces are where users engage with your app."

## The six documented surfaces

| Surface | Purpose |
|---|---|
| **App Home** | Private, one-to-one space with persistent content |
| **Canvases** | Built-in documents — guidelines, onboarding, project updates |
| **Lists** | Task management and status tracking |
| **Messages** | Apps communicating within conversations |
| **Modals** | Prominent interfaces for data collection and interactive workflows |
| **Split view** | Conversational agent container for multi-turn interactions (desktop; on iPhone an agent is its app DM) |

**Do not conflate this with the Block Kit surface matrix** in `block-kit.md`. That matrix lists only Messages / Modals / Home tabs, because those are the only ones individual Block Kit block pages enumerate under "Available in Surfaces." It describes where *blocks* are valid — not the full set of surfaces.

## Split view — the agent surface

"Private conversations with agents side by side with the rest of Slack, in the flow of work."

Enabled via **Agents** in app configuration. Supporting pieces: suggested prompts, loading states, app threads, text streaming. See `docs.slack.dev/ai/`.

## Slackbot is NOT a surface

Checked `docs.slack.dev/surfaces/` — Slackbot is not among the six. It IS a real integration point: the **Slackbot MCP Client** (`docs.slack.dev/ai/slackbot-mcp-client`) connects a remote MCP server; Slackbot discovers its tools and invokes them from natural-language prompts, and results render **in a DM with Slackbot**.
