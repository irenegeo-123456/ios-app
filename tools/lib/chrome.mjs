// Headless Chrome over the DevTools protocol, with no dependencies (Node 22's fetch and WebSocket).
// Always launches a throwaway profile, never the user's Chrome profile.
//
//   const page = await launch({ width: 1512, height: 805 })
//   await page.goto('http://localhost:5173/')
//   await page.waitFor(`!!document.querySelector('.p-view_contents--primary')`)
//   await page.screenshot('out.png')
//   await page.close()
//
// Chrome is found via $CHROME_PATH, then the usual install locations (Google Chrome, Chromium, Playwright's and
// Puppeteer's caches).

import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function newestIn(dir, pattern, rel) {
  if (!fs.existsSync(dir)) return null
  const hits = fs
    .readdirSync(dir)
    .filter((d) => pattern.test(d))
    .sort((a, b) => Number(b.replace(/\D/g, '')) - Number(a.replace(/\D/g, '')))
    .map((d) => path.join(dir, d, rel))
    .filter((p) => fs.existsSync(p))
  return hits[0] ?? null
}

export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const home = os.homedir()
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          newestIn(`${home}/Library/Caches/ms-playwright`, /^chromium_headless_shell-\d+$/, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
          newestIn(`${home}/Library/Caches/ms-playwright`, /^chromium_headless_shell-\d+$/, 'chrome-headless-shell-mac-x64/chrome-headless-shell'),
        ]
      : process.platform === 'win32'
        ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
        : [
            ...['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map((bin) => {
              try {
                return execFileSync('which', [bin], { encoding: 'utf8' }).trim() || null
              } catch {
                return null
              }
            }),
            newestIn(`${home}/.cache/ms-playwright`, /^chromium_headless_shell-\d+$/, 'chrome-headless-shell-linux64/chrome-headless-shell'),
          ]
  const found = candidates.find((p) => p && fs.existsSync(p))
  if (!found) throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH to a Chrome/Chromium binary.')
  return found
}

/**
 * Launches headless Chrome with one page at the given viewport. Returns helpers bound to that page.
 * `logs` collects console errors/warnings, uncaught exceptions and failed requests.
 */
export async function launch({ width = 1512, height = 805, scale = 2, chrome = findChrome() } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'slack-mobile-chrome-'))
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--mute-audio',
    // Software raster and a fixed color profile make screenshots repeatable (GPU dithering otherwise changes ~4%
    // of the pixels of gradients between two identical captures, which drowns real diffs).
    '--disable-gpu',
    '--disable-gpu-compositing',
    '--force-color-profile=srgb',
    '--disable-partial-raster',
    '--disable-threaded-animation',
    '--disable-threaded-scrolling',
    '--disable-checker-imaging',
    '--disable-image-animation-resync',
    '--disable-features=PaintHolding',
    // Nested inside CI containers and sandboxed shells, Chrome's own sandbox can't start.
    ...(process.env.CI || process.env.CHROME_NO_SANDBOX ? ['--no-sandbox'] : []),
    ...(/headless-shell/.test(chrome) ? [] : ['--headless=new']),
    'about:blank',
  ]
  const proc = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = ''
    const timer = setTimeout(() => reject(new Error(`Chrome didn't start within 20s:\n${buf}`)), 20000)
    proc.stderr.on('data', (d) => {
      buf += d
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) {
        clearTimeout(timer)
        resolve(m[1])
      }
    })
    proc.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`Chrome exited (${code}) before it was ready:\n${buf}`))
    })
  })
  const port = new URL(wsUrl).port
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => {
    ws.addEventListener('open', r, { once: true })
    ws.addEventListener('error', j, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  const logs = []
  const listeners = new Set()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(`${m.error.message} ${m.error.data ?? ''}`)) : resolve(m.result)
      return
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
      logs.push({ kind: `console.${m.params.type}`, text })
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      logs.push({ kind: 'exception', text: d.exception?.description ?? d.text })
    } else if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
      logs.push({ kind: `log.${m.params.entry.level}`, text: `${m.params.entry.text} ${m.params.entry.url ?? ''}`.trim() })
    }
    for (const l of listeners) l(m)
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Runtime.enable')
  await send('Log.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
  // A headless page never has window focus, so focus() wouldn't fire focus events (the app's keyboard listens for them).
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined)

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }

  return {
    send,
    evaluate,
    logs,
    /** Navigates and waits for the load event. */
    async goto(url) {
      const loaded = new Promise((resolve) => {
        const l = (m) => m.method === 'Page.loadEventFired' && (listeners.delete(l), resolve())
        listeners.add(l)
      })
      await send('Page.navigate', { url })
      await Promise.race([loaded, sleep(30000)])
    },
    /** Polls a JS expression until it's truthy. Returns false on timeout. */
    async waitFor(expression, timeout = 30000) {
      for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(200)) {
        try {
          if (await evaluate(expression)) return true
        } catch {
          // page still navigating
        }
      }
      return false
    },
    /** Waits until fonts and every <img> have loaded, so screenshots are stable. */
    async settle(extraMs = 300) {
      await evaluate(`Promise.race([
        (async () => {
          await document.fonts.ready
          await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r })))
        })(),
        new Promise((r) => setTimeout(r, 10000)),
      ])`)
      await sleep(extraMs)
    },
    async screenshot(file, clip) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, Buffer.from(data, 'base64'))
      return file
    },
    async close() {
      try {
        ws.close()
      } catch {}
      proc.kill()
      await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)))
      try {
        // Chrome can still be flushing into the profile for a moment after it exits.
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      } catch {
        // a leftover temp profile is harmless
      }
    },
  }
}

/** Starts `vite` (dev) or `vite preview` on a free port and resolves with its base URL once it answers. */
export async function serve({ mode = 'dev', port = 5199 } = {}) {
  const bin = path.resolve('node_modules/.bin/vite')
  const args = mode === 'preview' ? ['preview', '--port', String(port), '--strictPort'] : ['--port', String(port), '--strictPort']
  const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BROWSER: 'none' } })
  let out = ''
  proc.stdout.on('data', (d) => (out += d))
  proc.stderr.on('data', (d) => (out += d))
  const base = `http://localhost:${port}`
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    if (proc.exitCode !== null) throw new Error(`vite exited:\n${out}`)
    try {
      if ((await fetch(base)).ok) return { base, stop: () => proc.kill() }
    } catch {}
  }
  proc.kill()
  throw new Error(`vite didn't answer on ${base} within 60s:\n${out}`)
}
