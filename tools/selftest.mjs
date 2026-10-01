#!/usr/bin/env node
// Runs the app's self-test (/?selftest) in headless Chrome and prints what failed. Exits 1 on failures.
//
//   npm run selftest                         against the dev server (http://localhost:5190)
//   npm run selftest -- --dark               in dark mode
//   npm run selftest -- --base http://localhost:4190/   against `npm run demo`
//   npm run selftest -- --proto launch-day   inside a prototype (and plays its scenes)
//   npm run selftest -- --all                the demo, then every prototype

import fs from 'node:fs'
import { launch } from './lib/chrome.mjs'

const args = process.argv.slice(2)
const opt = { base: 'http://localhost:5190/', dark: false, proto: null, all: false }
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base') opt.base = args[++i]
  else if (args[i] === '--dark') opt.dark = true
  else if (args[i] === '--proto') opt.proto = args[++i]
  else if (args[i] === '--all') opt.all = true
}
const runs = opt.all
  ? [null, ...fs.readdirSync('prototypes', { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name).sort()]
  : [opt.proto]

let failures = 0
for (const proto of runs) {
  const page = await launch({ width: 402, height: 874, scale: 1 })
  try {
    const url = new URL(opt.base.replace(/\/*$/, '/'))
    url.searchParams.set('selftest', '')
    url.searchParams.set('chrome', 'screen')
    if (opt.dark) url.searchParams.set('appearance', 'dark')
    if (proto) url.searchParams.set('proto', proto)
    await page.goto(url.href)
    if (!(await page.waitFor(`document.body.dataset.selftest === 'done'`, 240000))) throw new Error('the self-test did not finish within 4 minutes')
    const report = await page.evaluate('window.__selftest')
    const failed = report.results.filter((r) => !r.ok)
    failures += failed.length
    console.log(`Self-test${proto ? ` of ${proto}` : ''}${opt.dark ? ' (dark)' : ''}: ${report.results.length - failed.length}/${report.results.length} passed`)
    for (const f of failed) console.log(`  ✗ ${f.step}: ${f.detail ?? ''}`)
  } finally {
    await page.close()
  }
}
process.exitCode = failures ? 1 : 0
