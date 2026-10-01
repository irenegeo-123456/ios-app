# Publishing the kit

The kit builds to a static website: the simulator, every prototype and the galleries, with no server. Anyone with
the link can open `…/?proto=<name>` in Chrome.

> **Internal only.** The build carries Slack's fonts, icons, sounds and design tokens. Publish it only to
> access-controlled internal hosts: Slack's GitHub Pages (pages.slack-github.com, Slack sign-in) or Salesforce's
> private GitHub Pages (a `*.pages.github.io` site of a `salesforce-ux-emu` repository, Salesforce sign-in). Never
> to public GitHub Pages, a public bucket or any other public host.

## How the build works

`npm run build` writes `dist/`. A site served from a sub-path needs that path at build time:
`BASE_PATH=/<owner>/<repo>/ npm run build` (vite.config.ts; `src/lib/asset.ts` puts the base in front of every
public file). Routing is in the query string (`?proto=`, `?kit=`), so any static host serves every page without
rewrites; `404.html` is a copy of `index.html` for hosts that send unknown paths there.

`tools/publish.mjs` does the whole thing into a folder you then commit: it type-checks, builds with the base path,
replaces the folder's contents (keeping `.git` and `CNAME`) and adds `.nojekyll`.

## Slack: Design Pages

The web kit and the Salesforce Setup clone are published as folders of
https://slack-github.com/colson-rice/design-pages, served at https://pages.slack-github.com/colson-rice/design-pages/.
With a clone of that repository next to this one:

```sh
node tools/publish.mjs ../design-pages/slack-mobile /colson-rice/design-pages/slack-mobile/
cd ../design-pages && git add slack-mobile && git commit -m "Slack mobile kit: build of $(git -C ../slack-mobile-clone rev-parse --short HEAD)" && git push
```

The kit is then at https://pages.slack-github.com/colson-rice/design-pages/slack-mobile/ and a prototype at
`…/slack-mobile/?proto=<name>`.

## Salesforce: private GitHub Pages

A `salesforce-ux-emu` repository serves its `gh-pages` branch at its private Pages address (set Pages visibility
to Private in the repository settings first). Check the branch out into `site/` (ignored by Git) once per clone,
then publish, commit and push:

```sh
git worktree add site gh-pages        # once (git worktree add --orphan site gh-pages for a new branch)
node tools/publish.mjs site /
git -C site add -A && git -C site commit -m "Slack mobile kit: build of $(git rev-parse --short HEAD)" && git -C site push
```

## With GitHub Actions

`ci/workflows/pages.yml` builds and deploys on every push to `main` where Actions has runners and Pages is
access-controlled (`ci/README.md` says how to switch it on). Until then, publish by hand as above.

## Before you share a link

1. `npm run check` (types, tests, every prototype, build) and `npm run selftest` against the build
   (`npm run demo`, then `npm run selftest -- --base http://localhost:4190/`).
2. Open the published address and a prototype on it; check the phone loads, fonts and emoji show, and a scene
   plays.
