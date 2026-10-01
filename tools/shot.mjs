#!/usr/bin/env node
// Screenshot of any route in headless Chrome, once fonts and images have loaded.
//
//   npm run shot -- "<route>" out.png [--dark] [--screen] [--device iphone-16] [--width 1440 --height 1000]
//                  [--scale 2] [--wait <css selector>] [--eval <js>] [--clip <css selector>] [--base <url>]
//
//   npm run shot -- "/" out.png                                 the simulator page
//   npm run shot -- "/?chrome=screen" out.png --screen          just the screen at 3x, like Slack's snapshot PNGs
//   npm run shot -- "/?kit=components" out.png --wait "[data-kit-ready]"
//
// --screen sizes the window to the device's screen and uses scale 3 (iPhone Pro density), so the PNG matches the
// size of Slack's iOS snapshot baselines (393×852 @3x = 1179×2556 with --device iphone-16). The app's own
// `?chrome=screen` draws the screen with nothing around it.

import { launch } from './lib/chrome.mjs'

const DEVICES = { 'iphone-17-pro': [402, 874], 'iphone-17-pro-max': [440, 956], 'iphone-16': [393, 852], 'iphone-se': [375, 667] }

const args = process.argv.slice(2)
const pos = []
const opt = { base: 'http://localhost:5190/', dark: false, width: 1440, height: 1000, scale: 2, wait: '[data-app-ready]', evals: [], clip: null, screen: false, device: null }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--dark') opt.dark = true
  else if (a === '--screen') opt.screen = true
  else if (a === '--device') opt.device = args[++i]
  else if (a === '--base') opt.base = args[++i]
  else if (a === '--width') opt.width = Number(args[++i])
  else if (a === '--height') opt.height = Number(args[++i])
  else if (a === '--scale') opt.scale = Number(args[++i])
  else if (a === '--wait') opt.wait = args[++i]
  else if (a === '--eval') opt.evals.push(args[++i])
  else if (a === '--clip') opt.clip = args[++i]
  else pos.push(a)
}
const [route, out] = pos
if (!route || !out) {
  console.error('usage: npm run shot -- "<route>" <out.png> [--dark] [--screen] [--device id] [--wait selector] [--eval js] [--clip selector]')
  process.exit(2)
}
if (opt.screen) {
  const [w, h] = DEVICES[opt.device ?? 'iphone-17-pro'] ?? DEVICES['iphone-17-pro']
  opt.width = w
  opt.height = h
  if (!args.includes('--scale')) opt.scale = 3
}

const page = await launch({ width: opt.width, height: opt.height, scale: opt.scale })
try {
  const root = opt.base.replace(/\/*$/, '/')
  const url = new URL(route.replace(/^\/(?!\/)/, ''), root)
  const q = url.searchParams
  if (opt.dark && !q.has('appearance')) q.set('appearance', 'dark')
  if (opt.device && !q.has('device')) q.set('device', opt.device)
  if (opt.screen && !q.has('chrome')) q.set('chrome', 'screen')
  await page.goto(url.href)
  if (!(await page.waitFor(`!!document.querySelector(${JSON.stringify(opt.wait)})`, 45000))) throw new Error(`timed out waiting for ${opt.wait}`)
  for (const js of opt.evals) await page.evaluate(js)
  await page.settle()
  let clip
  if (opt.clip) {
    clip = await page.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(opt.clip)})?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height } })()`)
    if (!clip) throw new Error(`no element matches ${opt.clip}`)
  }
  console.log(await page.screenshot(out, clip))
  const errors = page.logs.filter((l) => /error|exception/.test(l.kind) && !/React DevTools/.test(l.text))
  for (const e of errors) console.error(`[${e.kind}] ${e.text.slice(0, 300)}`)
} finally {
  await page.close()
}
