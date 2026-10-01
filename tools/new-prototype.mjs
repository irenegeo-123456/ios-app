#!/usr/bin/env node
// Makes a new prototype from the template (docs/prototyping.md):
//
//   npm run new -- my-idea
//   npm run new -- my-idea --title "Expense approvals" --author "Zoe Maxwell"
//   npm run new -- my-idea --from launch-day               start from another prototype instead
//
// It copies prototypes/_template/ (or the --from prototype) to prototypes/<slug>/ and fills in the title, the
// author (your git name) and today's date. Then open http://localhost:5190/?proto=<slug>.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
// --dir <path> points at another prototypes folder (the tests use it).
const dirAt = args.indexOf('--dir')
const dir = dirAt === -1 ? path.join(root, 'prototypes') : path.resolve(args.splice(dirAt, 2)[1] ?? '.')

const USAGE = `Usage: npm run new -- <slug> [--title "My idea"] [--author "Your name"] [--from <prototype>]

  <slug>     the folder and URL name: lowercase letters, numbers and hyphens (my-idea)
  --title    the gallery title (default: from the slug)
  --author   your name (default: your git name)
  --from     copy an existing prototype instead of the template (e.g. launch-day)`

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const opt = { slug: '', title: '', author: '', from: '_template' }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--help' || a === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else if (a === '--title' || a === '--author' || a === '--from') {
    const value = args[++i]
    if (!value || value.startsWith('--')) fail(`${a} needs a value.\n\n${USAGE}`)
    opt[a.slice(2)] = value
  } else if (a.startsWith('--')) fail(`Unknown option ${a}.\n\n${USAGE}`)
  else if (!opt.slug) opt.slug = a
  else fail(`One prototype at a time: got "${opt.slug}" and "${a}". Put a title with spaces in quotes: --title "My idea".`)
}

if (!opt.slug) fail(USAGE)
const slug = opt.slug.trim()
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.length > 60)
  fail(`"${slug}" can't be a prototype name: use lowercase letters, numbers and hyphens, like "expense-approvals".`)
const target = path.join(dir, slug)
if (fs.existsSync(target)) fail(`prototypes/${slug} already exists. Pick another name, or open http://localhost:5190/?proto=${slug}`)
const source = path.join(dir, opt.from)
const entry = ['index.ts', 'index.tsx'].find((f) => fs.existsSync(path.join(source, f)))
if (!entry) {
  const choices = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => ['index.ts', 'index.tsx'].some((f) => fs.existsSync(path.join(dir, d, f)))) : []
  fail(`There's no prototypes/${opt.from}/index.ts to copy. Choose one of: ${choices.join(', ') || '(none)'}`)
}

const gitName = () => {
  try {
    return execFileSync('git', ['config', 'user.name'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}
const title = opt.title.trim() || slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
const author = opt.author.trim() || gitName() || process.env.USER || 'Your name'
const d = new Date()
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** A TypeScript single-quoted string. */
const quoted = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

// Copy the folder (not a screenshot of the prototype it came from: the new one shows a live preview).
fs.cpSync(source, target, { recursive: true, filter: (p) => !/(^|\/)thumbnail\.(png|jpe?g|webp)$/.test(p) && !p.endsWith('.DS_Store') })

const file = path.join(target, entry)
const code = fs.readFileSync(file, 'utf8')
// Only the definePrototype({ … }) card fields: apps and modals have `title:` fields too.
const start = Math.max(0, code.indexOf('definePrototype({'))
const head = code.slice(0, start)
let card = code.slice(start)
const set = (field, value) => {
  const re = new RegExp(`^(\\s*)${field}: '(?:[^'\\\\]|\\\\.)*',`, 'm')
  if (!re.test(card)) console.warn(`  (couldn't find \`${field}:\` in index.ts; set it by hand)`)
  card = card.replace(re, `$1${field}: ${quoted(value)},`)
}
set('title', title)
set('author', author)
set('updated', today)
fs.writeFileSync(file, (head + card).replace(/\?proto=[a-z0-9_-]+/g, `?proto=${slug}`))

console.log(`
  Created prototypes/${slug}/ (from ${opt.from === '_template' ? 'the template' : opt.from})

  1. Start the app if it isn't running:   npm run dev
  2. Open your prototype:                 http://localhost:5190/?proto=${slug}
  3. Edit prototypes/${slug}/${entry}; the simulator reloads when you save.

  All prototypes: http://localhost:5190/?kit=prototypes · Guide: docs/prototyping.md
`)
