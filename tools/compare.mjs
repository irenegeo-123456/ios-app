#!/usr/bin/env node
// Puts the clone next to Slack's own iOS snapshot baseline: ours | Slack's | pixel diff, in one PNG, plus the share
// of pixels that differ. Slack's baselines are the snapshot-test PNGs in the iOS repo (Modules/**/Snapshots/iOS_26/),
// mostly 393×852 pt at @3x; render ours at the same size with --device iphone-16 (tools/shot.mjs --screen).
//
//   npm run compare -- <ours.png | "route"> <slack.png> [out.png] [--device iphone-16] [--threshold 0.1]
//   npm run compare -- "/?chrome=screen" Modules/Features/Home/Snapshots/iOS_26/…/testSomeTiles@3x.png
//
// A relative baseline path is looked up in SLACK_IOS_LFS_DIR (the iOS checkout with LFS objects, tools/ios/paths.mjs).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const args = process.argv.slice(2)
const pos = []
const opt = { device: 'iphone-16', threshold: 0.1, dark: false }
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--device') opt.device = args[++i]
  else if (args[i] === '--threshold') opt.threshold = Number(args[++i])
  else if (args[i] === '--dark') opt.dark = true
  else pos.push(args[i])
}
let [ours, ref, out] = pos
if (!ours || !ref) {
  console.error('usage: npm run compare -- <ours.png | "route"> <slack-baseline.png> [out.png] [--device iphone-16] [--dark]')
  process.exit(2)
}
const { IOS_LFS_DIR: LFS } = await import('./ios/paths.mjs')
if (!path.isAbsolute(ref) && !fs.existsSync(ref)) ref = path.join(LFS, ref)
if (!fs.existsSync(ref)) throw new Error(`no baseline at ${ref}`)
if (fs.readFileSync(ref).subarray(0, 8).toString() === 'version ') throw new Error(`${ref} is a Git LFS pointer; use the checkout with LFS objects (SLACK_IOS_LFS_DIR)`)

if (!ours.endsWith('.png')) {
  const shot = path.join('reference/shots', `compare-ours-${Date.now()}.png`)
  execFileSync(process.execPath, ['tools/shot.mjs', ours, shot, '--screen', '--device', opt.device, ...(opt.dark ? ['--dark'] : [])], { stdio: 'inherit' })
  ours = shot
}
out ??= path.join('reference/shots', `compare-${path.basename(ref).replace(/@\dx\.png$/, '')}.png`)

const a = PNG.sync.read(fs.readFileSync(ours))
const b = PNG.sync.read(fs.readFileSync(ref))
const w = Math.min(a.width, b.width)
const h = Math.min(a.height, b.height)
const crop = (img) => {
  const c = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) img.data.copy(c.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4)
  return c
}
const ca = crop(a)
const cb = crop(b)
const diff = new PNG({ width: w, height: h })
const bad = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: opt.threshold, alpha: 0.35 })

const gap = 24
const sheet = new PNG({ width: w * 3 + gap * 2, height: h })
sheet.data.fill(255)
const blit = (img, x0) => {
  for (let y = 0; y < h; y++) img.data.copy(sheet.data, (y * sheet.width + x0) * 4, y * w * 4, (y + 1) * w * 4)
}
blit(ca, 0)
blit(cb, w + gap)
blit(diff, 2 * (w + gap))
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, PNG.sync.write(sheet))
if (a.width !== b.width || a.height !== b.height) console.warn(`sizes differ: ours ${a.width}×${a.height}, Slack's ${b.width}×${b.height} (compared the top-left ${w}×${h})`)
console.log(`${out}\n${((bad / (w * h)) * 100).toFixed(2)}% of pixels differ (ours | Slack's | diff)`)
