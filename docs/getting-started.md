# Getting started: the kit on your Mac

This gets the Slack for iPhone kit running on your Mac, so you can make prototypes by talking to Claude. The easy
way is to paste one prompt into Claude Code and let it do everything. The steps by hand and a troubleshooting
table are below it.

To **look at** the kit or a published prototype, you don't need any of this: open the live site,
https://pages.slack-github.com/colson-rice/design-pages/slack-mobile/ (Slack sign-in) or
https://laughing-adventure-8g6g51z.pages.github.io/ (Salesforce sign-in).

> **Internal only.** The kit carries Slack's fonts, icons, sounds and design tokens. Keep it on your Mac and on the
> internal sites: no public repositories, no public links, no claude.ai Artifacts.

## What you need

- **A Mac with Google Chrome.**
- **Access to the code.** Open https://slack-github.com/colson-rice/slack-mobile-clone in Chrome. If you can see the
  files, you're set. At Salesforce, use https://github.com/salesforce-ux-emu/slack-mobile-clone, signed in with your
  Salesforce EMU account (its username ends in `_sfemu`). A personal GitHub account gets a 404 there.
- **Claude Code**: the Code tab of the Claude desktop app, or `claude` in Terminal.
- **About 250 MB of disk.**

## The easy way: let Claude set it up

1. **Open Claude Code in your home folder.** In the desktop app, go to **Code**, choose **Local**, then
   **Select folder** and pick your home folder (the one with the house icon). In Terminal, open a new window and
   type `claude`.
2. **Paste this** and press Return:

   ```text
   Set up Slack's iPhone prototyping kit on my Mac and open it in Chrome: https://slack-github.com/colson-rice/slack-mobile-clone. Clone it to ~/slack-mobile-clone and follow its docs/getting-started.md. If git can't sign in, run gh auth login --hostname slack-github.com --web and show me the code.
   ```

   At Salesforce, use `https://github.com/salesforce-ux-emu/slack-mobile-clone` and `--hostname github.com`, and
   sign in with your `_sfemu` account.
3. **Allow what it asks to run.** Claude asks before each command; read it and click Allow. It stops for the few
   things only you can do: signing in to GitHub in the browser (it shows you a code and a link), or clicking
   Install if macOS offers the "command line developer tools".
4. When it's done, Chrome shows the iPhone. **Keep talking to Claude in the same session** to make changes
   ("make a prototype where…"). `docs/prototyping.md` has ideas for what to ask.

### For Claude: setting it up

You're setting this up for a designer, not an engineer: do the work, ask only for what they must do themselves, in
plain words, one step at a time.

1. **The code.** If there's already a `slack-mobile-clone` folder (home, Desktop, Documents, Developer), use it and
   `git pull`, keeping their work. Otherwise clone into `~/slack-mobile-clone`. "could not read Username", a
   username prompt or "Repository not found" mean Git isn't signed in: get the GitHub CLI (`brew install gh`; with
   no Homebrew, the macOS zip from https://github.com/cli/cli/releases/latest in `~/.local/bin`), run
   `gh auth login --hostname slack-github.com --git-protocol https --web` in the background (github.com and their
   `_sfemu` account at Salesforce), show them the one-time code and the link, wait, then `gh auth setup-git` and
   clone again. Never ask for a password or token in the chat. If macOS offers the command line developer tools,
   ask them to click Install.
2. **Node before packages.** The kit needs Node 22.12+ (24 and 26+ work too). Every command starts a fresh shell,
   so `nvm use` doesn't last: `nvm install 22 && nvm alias default 22`. With no nvm, install it with its script
   from https://github.com/nvm-sh/nvm (no admin password) and load it with `. ~/.nvm/nvm.sh` in the same command.
   Don't `npm install` until `node -v` says v22 or later.
3. **Install and check:** `npm install`, then `npm run doctor`, and fix what it lists.
4. **Start it:** `npm run dev` as a background task, outside the sandbox if you have one (inside it, the server
   never sees file changes). When http://localhost:5190 answers, `open -a "Google Chrome" http://localhost:5190`,
   or give them the link.
5. **Hand over.** Read `CLAUDE.md`, `docs/prototyping.md` and `.claude/skills/`, and follow them from now on. Tell
   them in a few lines what they're looking at, with two or three example requests. Their changes are prototypes
   in `prototypes/<name>/` (never the Northstar demo): open `?proto=<name>` for them and look at a screenshot
   before you say it's done.
6. Tell them the kit runs only while this session is open, and that next time they open Claude Code in the
   `slack-mobile-clone` folder and say "start the kit".

Internal only: never publish the kit or push it anywhere public. No sudo. If a step fails twice the same way, stop
and tell them exactly what it says.

### Coming back to it

The kit runs only while the Claude session that started it is open. Next time, open Claude Code **in the
`slack-mobile-clone` folder** (desktop app: **Select folder**, then `slack-mobile-clone` in your home folder;
Terminal: `cd ~/slack-mobile-clone && claude`) and say **"start the kit"**. In that folder Claude follows the kit's
own instructions from the first message.

To get the newest version of the kit, ask Claude to "update the kit" (it runs `git pull` and `npm install`). Your
prototypes stay.

## By hand

You'll type a few commands in **Terminal** (Applications › Utilities › Terminal): paste each line and press Return.

1. **Sign Git in to GitHub** (once). Git doesn't take your password; it signs in through the browser with the
   GitHub CLI. Install the CLI with `brew install gh` (or the installer from https://cli.github.com), then:

   ```sh
   gh auth login --hostname slack-github.com --git-protocol https --web
   gh auth setup-git
   ```

   It shows a one-time code and opens slack-github.com: enter the code and approve. At Salesforce, use
   `--hostname github.com` and sign in with your `_sfemu` account.

2. **Get the kit** (if your Mac asks to install the command line developer tools, click Install, then run the line
   again):

   ```sh
   cd ~
   git clone https://slack-github.com/colson-rice/slack-mobile-clone.git
   cd slack-mobile-clone
   ```

   At Salesforce, clone `https://github.com/salesforce-ux-emu/slack-mobile-clone.git` instead.

3. **Use Node 22**, the program that runs the kit. With nvm (most Macs that have run Node projects):

   ```sh
   nvm install && nvm alias default 22
   ```

   `alias default` makes every new Terminal window use it; `nvm use` alone lasts for one window. If Terminal says
   `nvm: command not found`, either install Node 24 LTS from [nodejs.org](https://nodejs.org) (it asks for your Mac's
   admin password), or install nvm, which doesn't:

   ```sh
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
   ```

   Then open a new Terminal window, `cd ~/slack-mobile-clone` and run the `nvm install` line above. `node -v`
   should now say v22 (v24 or v26 work too).

4. **Install the kit's parts and check the Mac** (a minute or two the first time):

   ```sh
   npm install
   npm run doctor
   ```

   The doctor lists anything that's still wrong and how to fix it.

5. **Start it:** `npm run dev`, then open http://localhost:5190 in Chrome. Leave that Terminal window open while
   you work (Ctrl+C stops the kit).

6. **Make changes with Claude:** open Claude Code in the `slack-mobile-clone` folder and describe what you want.
   `docs/prototyping.md` shows how.

## Troubleshooting

Every message below is one we've seen on a real Mac. `npm run doctor` checks most of them for you.

| What you see | What to do |
|---|---|
| `could not read Username for 'https://slack-github.com'`, or Git asks for a username and password | Git isn't signed in, and it doesn't take your password. Do step 1 of **By hand** (`gh auth login`), or ask Claude to |
| `remote: Repository not found.` from github.com/salesforce-ux-emu | Git used a personal GitHub account. Sign in with your `_sfemu` account (`gh auth login --hostname github.com --web`), or switch to it if you already have: `gh auth switch --hostname github.com --user <you>_sfemu` |
| `npm error notsup Required: {"node":"^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0"}`, or `Node 20.x can't run the kit` | The wrong Node is active. `nvm install 22 && nvm alias default 22` (or install Node 24 from nodejs.org), then `npm install` again |
| `nvm: command not found` | nvm isn't installed: see step 3 of **By hand** |
| `Cannot find native binding`, or the doctor says `node_modules is missing Vite's native part` | The parts were installed with an older Node. With Node 22 active (`node -v`): `rm -rf node_modules && npm install` |
| `Error: Port 5190 is already in use` | The kit is already running, in another Terminal window or Claude session: just open http://localhost:5190. To restart it, press Ctrl+C in that window first |
| `npm error enoent` … `package.json` | You're not in the kit's folder: `cd ~/slack-mobile-clone` |
| `This site can't be reached: localhost refused to connect` | The kit isn't running (its Terminal window or Claude session was closed). Start it again: `npm run dev`, or ask Claude to "start the kit" |
| The phone doesn't change when Claude edits a prototype | The dev server can't see the edits, usually because it was started inside Claude's sandbox. Ask Claude to "restart the dev server outside the sandbox", or run `npm run dev` yourself in Terminal |
| `macOS has quarantined node_modules` | The folder came by AirDrop or as a zip: `xattr -dr com.apple.quarantine node_modules`, or delete `node_modules` and run `npm install` |
| Anything else | Ask Claude, pasting the message. If it's stuck on access to the code, ask Colson Rice |

For problems inside a prototype (a red screen, "things to fix" in the panel), see **Troubleshooting** in
`docs/prototyping.md`.
