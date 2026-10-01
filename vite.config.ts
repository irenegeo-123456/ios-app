/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH is the URL path the app is served from, for hosting under a sub-path: BASE_PATH=/<owner>/<repo>/ for
// GitHub Pages (ci/workflows/pages.yml, docs/publishing.md). Unset, it's '/'. Code reaches public files through
// src/lib/asset.ts, which puts this base in front of root-relative paths; index.html's links get it from Vite.
const BASE_PATH = process.env.BASE_PATH?.trim()
const BASE = BASE_PATH ? `/${BASE_PATH}/`.replace(/\/{2,}/g, '/') : '/'

// Apple emoji (64px) come from the emoji-datasource-apple package, the same set the web clone uses. They're served
// from node_modules in dev and copied into the build, so the repo doesn't carry 3,800 PNGs.
const EMOJI_64 = path.resolve('node_modules/emoji-datasource-apple/img/apple/64')
const EMOJI_FILE = /^\/([0-9a-f-]+\.png)$/

function emojiFromPackage(): Plugin {
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const file = EMOJI_FILE.exec((req.url ?? '').split('?')[0])?.[1]
    const src = file && path.join(EMOJI_64, file)
    if (!src || !fs.existsSync(src)) return next()
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'max-age=31536000, immutable')
    fs.createReadStream(src).pipe(res)
  }
  let outDir = 'dist'
  return {
    name: 'emoji-from-package',
    configResolved: (c) => void (outDir = path.resolve(c.root, c.build.outDir)),
    configureServer: (server) => void server.middlewares.use(`${server.config.base}emoji`, serve),
    configurePreviewServer: (server) => void server.middlewares.use(`${server.config.base}emoji`, serve),
    closeBundle() {
      if (!fs.existsSync(EMOJI_64)) return
      fs.mkdirSync(path.join(outDir, 'emoji'), { recursive: true })
      for (const f of fs.readdirSync(EMOJI_64)) fs.copyFileSync(path.join(EMOJI_64, f), path.join(outDir, 'emoji', f))
    },
  }
}

// GitHub Pages answers a path it has no file for with the site's 404.html. As a copy of index.html it boots the
// app, so deep links still load.
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    writeBundle(options, bundle) {
      if (!options.dir || !bundle['index.html']) return
      fs.copyFileSync(path.join(options.dir, 'index.html'), path.join(options.dir, '404.html'))
    },
  }
}

export default defineConfig({
  base: process.env.VITEST ? '/' : BASE,
  plugins: [react(), emojiFromPackage(), spaFallback()],
  build: { target: 'es2022' },
  server: { port: 5190, strictPort: true },
  preview: { port: 4190, strictPort: true },
  test: {
    exclude: ['**/node_modules/**', '**/.git/**', '.claude/**', 'dist/**'],
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
})
