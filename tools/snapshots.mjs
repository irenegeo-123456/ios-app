#!/usr/bin/env node
// Snapshot regression suite: renders each entry of reference/ios/snapshots.json in headless Chrome at @3x, diffs it
// against Slack's own iOS snapshot-test PNG (pixelmatch), prints a table and writes ours | Slack's | diff images to
// reference/shots/snapshots/<id>.png (gitignored). Exits 1 when an entry goes over its maxDiff.
//
//   npm run snapshots                          every entry (dev server on http://localhost:5190)
//   npm run snapshots -- --only skbutton-xs,home-tiles
//   npm run snapshots -- --update              rewrite every maxDiff to just above today's number (after a deliberate change)
//   npm run snapshots -- --base http://localhost:4190/
//   npm run snapshots -- --css what-if.css         inject a stylesheet into every page first (try a change without editing src/)
//
// An entry (docs/conventions.md, "Snapshot suite"):
//   { "id": "skbutton-xs",
//     "route": "/?kit=components&only=SKButton",            a kit gallery page or an app route ("/?chrome=screen")
//     "steps": ["slack.app.getState().setTab('dms')"],      optional JS run before the shot (awaited)
//     "clip": "[data-specimen=\"SKButton/sizes\"][data-appearance=light] > :nth-child(1)",   optional; default the screen
//     "isolate": true,                                     clone the clip to a fresh .ios-screen at a whole-pt position (default for kit pages)
//     "device": "iphone-16", "appearance": "light",
//     "png": "Modules/UIInfra/SlackKit/Snapshots/iOS_26/SlackKitTests.SKButtonSnapshotTests/testButtonExtraSmall@3x.png",
//     "crop": "light",                                     which part of Slack's PNG: see reference() below
//     "maxDiff": 4.2,                                      % of pixels allowed to differ
//     "note": "…" }
// PNG paths are relative to SLACK_IOS_LFS_DIR (the iOS checkout with the LFS objects; default in tools/ios/paths.mjs).
// Transparent pixels of Slack's PNG are laid over the background our render has at its top-left corner.

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { launch } from './lib/chrome.mjs'

const DEVICES = { 'iphone-17-pro': [402, 874], 'iphone-17-pro-max': [440, 956], 'iphone-16': [393, 852], 'iphone-se': [375, 667] }
const MANIFEST = 'reference/ios/snapshots.json'
const OUT = 'reference/shots/snapshots'
const { IOS_LFS_DIR: LFS } = await import('./ios/paths.mjs')

const args = process.argv.slice(2)
const opt = { base: 'http://localhost:5190/', only: null, update: false, threshold: 0.1, css: null }
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base') opt.base = args[++i]
  else if (args[i] === '--only') opt.only = args[++i].split(',')
  else if (args[i] === '--update') opt.update = true
  else if (args[i] === '--threshold') opt.threshold = Number(args[++i])
  else if (args[i] === '--css') opt.css = fs.readFileSync(args[++i], 'utf8')
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const entries = manifest.entries.filter((e) => !opt.only || opt.only.includes(e.id))
if (!entries.length) {
  console.error(opt.only ? `no entry matches ${opt.only.join(', ')}` : `${MANIFEST} has no entries`)
  process.exit(2)
}
fs.mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Slack's PNG, cropped to the entry's part. Component snapshots are a 2 × 2 grid: rows light / dark, columns normal /
 * high contrast (ComponentSnapshotTestCase.swift:197-209), so `light` and `dark` are the normal-contrast column and
 * `light-high` / `dark-high` the other; `top` / `bottom` are the halves of a two-row stack (June 2026 and older
 * baselines, other test cases); `full` the whole PNG; or [x, y, w, h] in PNG px.
 */
function reference(e) {
  const file = path.isAbsolute(e.png) ? e.png : path.join(LFS, e.png)
  if (!fs.existsSync(file)) throw new Error(`no PNG at ${file}`)
  if (fs.readFileSync(file).subarray(0, 8).toString() === 'version ') throw new Error(`${file} is a Git LFS pointer; set SLACK_IOS_LFS_DIR to the checkout with LFS objects`)
  const img = PNG.sync.read(fs.readFileSync(file))
  const W = img.width
  const H = img.height
  const hw = Math.floor(W / 2)
  const hh = Math.floor(H / 2)
  const parts = { light: [0, 0, hw, hh], dark: [0, H - hh, hw, hh], 'light-high': [W - hw, 0, hw, hh], 'dark-high': [W - hw, H - hh, hw, hh], top: [0, 0, W, hh], bottom: [0, H - hh, W, hh], full: [0, 0, W, H] }
  const rect = Array.isArray(e.crop) ? e.crop : parts[e.crop ?? 'full']
  if (!rect) throw new Error(`unknown crop ${e.crop}`)
  return crop(img, ...rect)
}

function crop(img, x, y, w, h) {
  const out = new PNG({ width: w, height: h })
  for (let r = 0; r < h; r++) {
    const sy = y + r
    if (sy < 0 || sy >= img.height) continue
    for (let c = 0; c < w; c++) {
      const sx = x + c
      if (sx < 0 || sx >= img.width) continue
      img.data.copy(out.data, (r * w + c) * 4, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4)
    }
  }
  return out
}

/** Lays an image with transparency over a solid color. */
function flatten(img, [br, bg, bb]) {
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3] / 255
    img.data[i] = Math.round(img.data[i] * a + br * (1 - a))
    img.data[i + 1] = Math.round(img.data[i + 1] * a + bg * (1 - a))
    img.data[i + 2] = Math.round(img.data[i + 2] * a + bb * (1 - a))
    img.data[i + 3] = 255
  }
  return img
}

/** Renders one entry and returns our PNG at the entry's device size or clip, in device pixels (@3x). */
async function render(page, e) {
  const root = opt.base.replace(/\/*$/, '/')
  const url = new URL((e.route ?? '/?chrome=screen').replace(/^\/(?!\/)/, ''), root)
  const kit = url.searchParams.has('kit')
  if (!kit) {
    if (!url.searchParams.has('chrome')) url.searchParams.set('chrome', 'screen')
    url.searchParams.set('device', e.device ?? 'iphone-16')
    url.searchParams.set('panel', '0')
  }
  if ((e.appearance ?? 'light') === 'dark' && !kit) url.searchParams.set('appearance', 'dark')
  // Slack's snapshot tests render with the code's fallback theme (ColorSet.defaultAubergine), not production's preset
  if (!url.searchParams.has('theme')) url.searchParams.set('theme', 'fallback')
  const [w, h] = kit ? [1400, 3000] : DEVICES[e.device ?? 'iphone-16']
  await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: false })
  await page.goto(url.href)
  const ready = e.wait ?? (kit ? e.clip ?? '[data-kit-ready]' : '[data-app-ready]')
  if (!(await page.waitFor(`!!document.querySelector(${JSON.stringify(ready)})`, 45000))) throw new Error(`timed out waiting for ${ready}`)
  if (opt.css) await page.evaluate(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(opt.css)}; document.head.appendChild(s) })()`)
  for (const js of e.steps ?? []) await page.evaluate(js)
  await page.settle(e.settle ?? 600)
  let rect = { x: 0, y: 0, width: w, height: h }
  if (e.clip) {
    const isolate = e.isolate ?? kit
    rect = await page.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(e.clip)})
      if (!el) return null
      let target = el
      if (${isolate}) {
        // a copy of the element in a fresh screen of its appearance, at a whole-point position, so the gallery's layout
        // (fractional offsets) doesn't move its text or edges (Chrome paints text baselines on whole CSS px)
        const w = el.getBoundingClientRect().width
        document.querySelectorAll('.snapshots-host').forEach((x) => x.remove())
        const host = document.createElement('div')
        host.className = 'ios-screen snapshots-host'
        host.dataset.appearance = ${JSON.stringify(e.appearance ?? 'light')}
        host.style.cssText = 'position:absolute;left:0;top:0;width:' + Math.ceil(w) + 'px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-start;overflow:visible'
        target = el.cloneNode(true)
        target.style.margin = '0'
        target.style.width = w + 'px'
        target.style.flex = 'none'
        host.appendChild(target)
        document.body.appendChild(host)
      }
      const r = target.getBoundingClientRect()
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
    })()`)
    if (!rect) throw new Error(`no element matches ${e.clip}`)
    await sleep(150)
  }
  const clip = { x: Math.floor(rect.x), y: Math.floor(rect.y) }
  clip.width = Math.ceil(rect.x + rect.width) - clip.x
  clip.height = Math.ceil(rect.y + rect.height) - clip.y
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })
  const shot = PNG.sync.read(Buffer.from(data, 'base64'))
  // the element's own box, in device px
  return crop(shot, Math.round((rect.x - clip.x) * 3), Math.round((rect.y - clip.y) * 3), Math.round(rect.width * 3), Math.round(rect.height * 3))
}

/** Pixel diff over the union of both sizes: anything outside the overlap counts as different. */
function compare(ours, theirs) {
  const w = Math.min(ours.width, theirs.width)
  const h = Math.min(ours.height, theirs.height)
  const a = crop(ours, 0, 0, w, h)
  const b = crop(theirs, 0, 0, w, h)
  const diff = new PNG({ width: w, height: h })
  const bad = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: opt.threshold, alpha: 0.35 })
  const W = Math.max(ours.width, theirs.width)
  const H = Math.max(ours.height, theirs.height)
  // a size difference of a pixel row or column is rounding (a fractional pt size), not a regression
  const extra = Math.abs(ours.width - theirs.width) <= 1 && Math.abs(ours.height - theirs.height) <= 1 ? 0 : W * H - w * h
  return { pct: ((bad + extra) / (w * h + extra)) * 100, a, b, diff, w, h }
}

function sheet(e, ours, theirs, diff) {
  const gap = 24
  const H = Math.max(ours.height, theirs.height, diff.height)
  const out = new PNG({ width: ours.width + theirs.width + diff.width + gap * 2, height: H })
  out.data.fill(255)
  let x0 = 0
  for (const img of [ours, theirs, diff]) {
    for (let y = 0; y < img.height; y++) img.data.copy(out.data, (y * out.width + x0) * 4, y * img.width * 4, (y + 1) * img.width * 4)
    x0 += img.width + gap
  }
  const file = path.join(OUT, `${e.id}.png`)
  fs.writeFileSync(file, PNG.sync.write(out))
  return file
}

const page = await launch({ width: 1400, height: 3000, scale: 3 })
const rows = []
try {
  for (const e of entries) {
    try {
      const ours = await render(page, e)
      const bg = [ours.data[4 * (ours.width + 1)], ours.data[4 * (ours.width + 1) + 1], ours.data[4 * (ours.width + 1) + 2]]
      const theirs = flatten(reference(e), bg)
      const r = compare(ours, theirs)
      sheet(e, ours, theirs, r.diff)
      const size = ours.width !== theirs.width || ours.height !== theirs.height ? `ours ${ours.width}×${ours.height}, Slack's ${theirs.width}×${theirs.height}` : ''
      rows.push({ e, pct: r.pct, size })
    } catch (err) {
      rows.push({ e, error: err.message.split('\n')[0] })
    }
  }
} finally {
  await page.close()
}

const pad = (s, n) => String(s).padEnd(n)
const idW = Math.max(...rows.map((r) => r.e.id.length), 5)
console.log(`${pad('entry', idW)}  ${pad('diff %', 7)}  ${pad('max %', 6)}  result`)
let failed = 0
for (const r of rows) {
  if (r.error) {
    failed++
    console.log(`${pad(r.e.id, idW)}  ${pad('—', 7)}  ${pad(r.e.maxDiff ?? '—', 6)}  ERROR ${r.error}`)
    continue
  }
  const ok = r.e.maxDiff === undefined || r.pct <= r.e.maxDiff
  if (!ok) failed++
  console.log(`${pad(r.e.id, idW)}  ${pad(r.pct.toFixed(2), 7)}  ${pad(r.e.maxDiff ?? '—', 6)}  ${ok ? 'pass' : 'FAIL'}${r.size ? `  (${r.size})` : ''}`)
}
console.log(`\n${rows.length - failed}/${rows.length} passed; ours | Slack's | diff in ${OUT}/`)

if (opt.update) {
  // just above today's number: +10 % of it and at least 0.3 points, rounded up to a tenth
  const byId = new Map(rows.filter((r) => !r.error).map((r) => [r.e.id, r.pct]))
  for (const e of manifest.entries) if (byId.has(e.id)) e.maxDiff = Math.ceil((byId.get(e.id) + Math.max(0.3, byId.get(e.id) * 0.1)) * 10) / 10
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`updated maxDiff in ${MANIFEST}`)
}
process.exitCode = failed && !opt.update ? 1 : 0
