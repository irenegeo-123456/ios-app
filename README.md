# Slack for iPhone, in the browser

A clone of Slack's iOS app that runs in Chrome inside a simulated iPhone, for prototyping with Claude. It's built
from Slack's iOS source (SlackKit, MessageKit, Block Kit, the iOS 26 Liquid Glass shell), with the iOS design
tokens, icons, Lato and sounds harvested from the app, and the Northstar demo workspace, personas and App Kit shared
with the web kit (slack-remix). Prototypes are small files in `prototypes/`, and the same files run in the web kit.

**Internal only**: it ships Slack's fonts, icons, sounds and design tokens (see `NOTICE`). Never publish it
publicly; `docs/publishing.md` lists the internal hosts.

## Quick start

```sh
nvm use            # Node 22 (.nvmrc)
npm install
npm run doctor     # checks this machine
npm run dev        # http://localhost:5190
```

| | |
|---|---|
| http://localhost:5190 | the iPhone with the Northstar demo |
| `/?kit=prototypes` | every prototype |
| `/?proto=<name>` | one prototype |
| `/?kit=components` · `/?kit=blocks` · `/?kit=icons` · `/?kit=assets` | SlackKit, Block Kit, icons, personas and logos |
| `/?selftest` | opens every screen and reports what's broken |

URL options: `&device=iphone-16` (`iphone-17-pro`, `iphone-17-pro-max`, `iphone-se`), `&appearance=dark`,
`&theme=jade`, `&slackbotTab=1`, `&chrome=device` (just the phone) or `&chrome=screen` (just the screen), `&panel=0`, `&clock=10:30`.

## Docs

| | |
|---|---|
| `docs/prototyping.md` | making prototypes (for designers; no coding needed) |
| `docs/publishing.md` | building and hosting the site internally |
| `docs/conventions.md` | how the clone is built (for contributors and Claude) |
| `CLAUDE.md` | rules for agents |
| `reference/ios/specs/` | the specs every screen is built from, with Swift citations |

## Checks

```sh
npm run check      # typecheck, unit tests (every prototype is loaded and checked), production build
npm run selftest   # every tab, conversation, thread, screen and sheet in headless Chrome (-- --dark too)
```
