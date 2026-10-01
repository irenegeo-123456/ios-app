#!/usr/bin/env node
// Builds the kit as a static site into a folder you then commit to an internal Pages repo (docs/publishing.md).
//
//   node tools/publish.mjs <folder> [base-path]
//
//   node tools/publish.mjs ../design-pages/slack-mobile /colson-rice/design-pages/slack-mobile/
//       Slack's Design Pages (https://pages.slack-github.com/colson-rice/design-pages/slack-mobile/)
//   node tools/publish.mjs site /
//       a gh-pages worktree served at the site root (Salesforce's private GitHub Pages)
//
// The folder's contents are replaced (a .git file or folder in it, and CNAME, are kept). INTERNAL ONLY: the build
// carries Slack's fonts, icons and design tokens; publish it only to access-controlled internal hosts.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [target, baseArg = '/'] = process.argv.slice(2)
if (!target) {
  console.error('Usage: node tools/publish.mjs <folder> [base-path]   (docs/publishing.md)')
  process.exit(1)
}
const base = `/${baseArg}/`.replace(/\/{2,}/g, '/')
const out = path.resolve(target)
if (out === path.resolve('.') || out === path.resolve('..') || out === os.homedir()) {
  console.error(`Refusing to publish into ${out}: pick a folder of its own.`)
  process.exit(1)
}
if (fs.existsSync(out) && fs.readdirSync(out).some((f) => f === 'package.json' || f === 'src')) {
  console.error(`${out} looks like a source checkout (it has package.json or src/). Publish into an empty folder or a Pages checkout.`)
  process.exit(1)
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'slack-mobile-publish-'))
const run = (cmd, args, env = {}) => execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })

console.log(`Type-checking…`)
run('npx', ['tsc', '--noEmit', '-p', '.'])
console.log(`Building with BASE_PATH=${base}…`)
run('npx', ['vite', 'build', '--outDir', tmp, '--emptyOutDir'], { BASE_PATH: base })

fs.mkdirSync(out, { recursive: true })
const KEEP = new Set(['.git', 'CNAME'])
for (const f of fs.readdirSync(out)) if (!KEEP.has(f)) fs.rmSync(path.join(out, f), { recursive: true, force: true })
fs.cpSync(tmp, out, { recursive: true })
// GitHub Pages runs Jekyll unless told not to, and Jekyll drops files that start with "_".
fs.writeFileSync(path.join(out, '.nojekyll'), '')
fs.rmSync(tmp, { recursive: true, force: true })

const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0)
console.log(`\n✓ ${count(out)} files in ${out}, for a site at ${base}`)
console.log('  Next: commit and push that folder\'s repository (docs/publishing.md). Check the page loads before you share the link.')
