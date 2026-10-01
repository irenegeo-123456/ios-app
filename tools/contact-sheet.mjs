#!/usr/bin/env node
// A contact sheet of many app states in one PNG, for reviewing the clone at a glance:
//
//   node tools/contact-sheet.mjs out.png [--dark] [--device iphone-17-pro] [--cols 6] [--only home,dms]
//
// Each state is a set of steps run in the page (slack.app is the store). Screens are shot at 1x and tiled with labels.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import { launch } from './lib/chrome.mjs'

const args = process.argv.slice(2)
const out = args.find((a) => !a.startsWith('--')) ?? 'contact-sheet.png'
const opt = { dark: args.includes('--dark'), device: 'iphone-17-pro', cols: 6, only: null, base: 'http://localhost:5190/' }
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--device') opt.device = args[++i]
  if (args[i] === '--cols') opt.cols = Number(args[++i])
  if (args[i] === '--only') opt.only = args[++i].split(',')
  if (args[i] === '--base') opt.base = args[++i]
}
const SIZES = { 'iphone-17-pro': [402, 874], 'iphone-17-pro-max': [440, 956], 'iphone-16': [393, 852], 'iphone-se': [375, 667] }
const [W, H] = SIZES[opt.device]

const s = 'slack.app.getState()'
const conv = (id) => `${s}.openConversation('${id}')`
const STATES = [
  ['home', ''],
  ['dms', `${s}.setTab('dms')`],
  ['activity', `${s}.setTab('activity')`],
  ['search', `${s}.setTab('search')`],
  ['more', `${s}.setTab('more')`],
  ['channel', conv('C04LAUNCHQ')],
  ['channel-code', conv('C04ENGINER')],
  ['dm', `(() => { const st = ${s}; const dm = Object.values(st.fx.conversations).find(c => c.type === 'im' && c.userId !== st.fx.me); st.openConversation(dm.id) })()`],
  ['thread', `(() => { const st = ${s}; const k = Object.keys(st.threads)[0]; const [c, t] = k.split('/'); st.openConversation(c); st.openThread(c, t) })()`],
  ['app-home', `(() => { const st = ${s}; const a = Object.values(st.fx.conversations).find(c => c.type === 'app' && st.fx.apps?.[c.userId]?.home?.length); st.navigate('home', [{ screen: 'conversation', id: a.id, appTab: 'home' }]) })()`],
  ['app-about', `(() => { const st = ${s}; const a = Object.values(st.fx.conversations).find(c => c.type === 'app'); st.navigate('home', [{ screen: 'conversation', id: a.id, appTab: 'about' }]) })()`],
  ['message-actions', `(() => { const st = ${s}; st.openConversation('C04ENGINER'); st.presentSheet('message-actions', { conversationId: 'C04ENGINER', ts: st.messages.C04ENGINER.at(-1).ts }) })()`],
  ['emoji-picker', `(() => { const st = ${s}; st.openConversation('C04ENGINER'); st.presentSheet('emoji-picker', { conversationId: 'C04ENGINER', ts: st.messages.C04ENGINER.at(-1).ts }) })()`],
  ['conversation-menu', `(() => { const st = ${s}; st.openConversation('C04ENGINER'); st.presentSheet('conversation-menu', { conversationId: 'C04ENGINER' }) })()`],
  ['channel-details', `${s}.navigate('home', [{ screen: 'conversation', id: 'C04ENGINER' }, { screen: 'channel-details', conversationId: 'C04ENGINER' }])`],
  ['profile', `(() => { const st = ${s}; const u = Object.values(st.fx.users).find(u => !u.isBot && !u.isApp && u.id !== st.fx.me); st.navigate('home', [{ screen: 'profile', userId: u.id }]) })()`],
  ['home-filter', `${s}.presentSheet('home-filter')`],
  ['create', `${s}.presentSheet('create')`],
  ['customize-home', `${s}.presentSheet('customize-home')`],
  ['context-menu', `(() => { const st = ${s}; st.presentSheet('conversation-context-menu', { conversationId: 'C04ENGINER', anchor: document.querySelector('[data-qa^=home_row_]') }) })()`],
  ['compose', `${s}.push({ screen: 'compose' })`],
  ['threads', `${s}.push({ screen: 'threads' })`],
  ['catch-up', `${s}.push({ screen: 'catch-up' })`],
  ['later', `${s}.push({ screen: 'later' })`],
  ['drafts', `${s}.push({ screen: 'drafts' })`],
  ['huddles', `${s}.push({ screen: 'huddles' })`],
  ['huddle', `(() => { const st = ${s}; st.openConversation('C04ENGINER'); st.presentSheet('huddle', { conversationId: 'C04ENGINER' }) })()`],
  ['slackbot', `${s}.push({ screen: 'slackbot' })`],
  ['files', `${s}.push({ screen: 'files' })`],
  ['you', `${s}.presentSheet('you')`],
  ['workspaces', `${s}.presentSheet('workspaces')`],
  ['keyboard', `(() => { ${conv('C04ENGINER')}; setTimeout(() => { const e = document.querySelector('.ios-screen [contenteditable=true]'); e?.focus() }, 500) })()`],
]

const shots = []
const page = await launch({ width: W, height: H, scale: 1 })
try {
  for (const [label, js] of STATES.filter(([l]) => !opt.only || opt.only.includes(l))) {
    const url = new URL(opt.base)
    url.searchParams.set('chrome', 'screen')
    url.searchParams.set('device', opt.device)
    url.searchParams.set('panel', '0')
    if (opt.dark) url.searchParams.set('appearance', 'dark')
    await page.goto(url.href)
    await page.waitFor(`!!document.querySelector('[data-app-ready]')`, 20000)
    await new Promise((r) => setTimeout(r, 400))
    if (js) {
      try {
        await page.evaluate(js)
      } catch (e) {
        console.warn(`${label}: ${e.message}`)
      }
    }
    await new Promise((r) => setTimeout(r, 1100))
    await page.settle(100)
    const file = path.join(os.tmpdir(), `contact-${process.pid}-${label}.png`)
    await page.screenshot(file)
    shots.push({ label, png: PNG.sync.read(fs.readFileSync(file)) })
    fs.rmSync(file, { force: true })
    process.stdout.write('.')
  }
} finally {
  await page.close()
}
console.log()

// Tile them: label strip 18 px above each screen.
const cols = Math.min(opt.cols, shots.length)
const rows = Math.ceil(shots.length / cols)
const GAP = 16
const LABEL = 22
const sheet = new PNG({ width: cols * (W + GAP) + GAP, height: rows * (H + LABEL + GAP) + GAP })
sheet.data.fill(255)
// a tiny 5x7 font for labels
const FONT = {}
const glyphs = {
  a: '01110000010111110001011110', b: '10000100001111010001111100', c: '01110100001000010001011100', d: '00001000010111110001011110', e: '01110100011111110000011110',
  f: '00110010001111000100001000', g: '01111100010111100001011100', h: '10000100001111010001100010', i: '00100000000110000100011100', j: '00010000000001000010110010',
  k: '10000100101110010010100010', l: '01100001000010000100011100', m: '11010101011010110101101011', n: '11110100011000110001100010', o: '01110100011000110001011100',
  p: '11110100011111010000100000', q: '01111100010111100001000010', r: '10110110001000010000100000', s: '01111100000111000001111100', t: '01000111000100001000001100',
  u: '10001100011000110011011010', v: '10001100011000101010001000', w: '10001101011010110101010100', x: '10001010100010001010100010', y: '10001100010111100001011100',
  z: '11111000100010001000111110', '-': '00000000001111100000000000',
}
for (const [k, v] of Object.entries(glyphs)) FONT[k] = v
function text(str, x0, y0) {
  let x = x0
  for (const ch of str.toLowerCase()) {
    const g = FONT[ch]
    if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (g[r * 5 + c] === '1') for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = ((y0 + r * 2 + dy) * sheet.width + (x + c * 2 + dx)) * 4
      sheet.data[i] = sheet.data[i + 1] = sheet.data[i + 2] = 40
    }
    x += 12
  }
}
shots.forEach(({ label, png }, n) => {
  const cx = GAP + (n % cols) * (W + GAP)
  const cy = GAP + Math.floor(n / cols) * (H + LABEL + GAP)
  text(label, cx, cy + 4)
  PNG.bitblt(png, sheet, 0, 0, Math.min(W, png.width), Math.min(H, png.height), cx, cy + LABEL)
})
fs.writeFileSync(out, PNG.sync.write(sheet))
console.log(`${shots.length} states → ${out}`)
