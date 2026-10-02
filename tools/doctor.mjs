#!/usr/bin/env node
// Checks that this machine can run the kit and says how to fix what it can't.
//
//   npm run doctor                  full check
//   node tools/doctor.mjs --quick   only the checks that stop `npm run dev` from starting (runs before dev/build)
//
// No dependencies, so it runs (and explains the fix) even on a Node too old for Vite.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const quick = process.argv.includes('--quick')
const problems = []
const notes = []

// 1. Node version (Vite 8 needs ^20.19 or >=22.12; vitest 5 needs ^22.12, ^24 or >=26)
const [major, minor] = process.versions.node.split('.').map(Number)
const nodeOk = (major === 22 && minor >= 12) || major === 24 || major >= 26
if (!nodeOk) {
  const nvm = fs.existsSync(path.join(process.env.HOME || '', '.nvm'))
  // `nvm use` lasts for one Terminal window; the default is what every new window (and Claude Code) starts with.
  problems.push(
    `Node ${process.versions.node} can't run the kit (it needs Node 22.12+, 24 or 26+).\n` +
      (nvm
        ? '    Fix: nvm install 22 && nvm alias default 22   (this repo has an .nvmrc)'
        : '    Fix: install Node 24 LTS from https://nodejs.org (or nvm: https://github.com/nvm-sh/nvm), then open a new Terminal window'),
  )
}

// 2. Dependencies installed
const hasModules = fs.existsSync('node_modules/vite/package.json')
if (!hasModules) problems.push('Dependencies are not installed.\n    Fix: npm install')

// 2b. Vite's native binding. npm skips an optional dependency that doesn't support the running Node without saying
//     so, so a node_modules installed on an older Node has no binding and Vite stops with "Cannot find native
//     binding". (.npmrc's engine-strict now refuses that install, but an older node_modules can still be missing it.)
if (hasModules && fs.existsSync('node_modules/rolldown/package.json')) {
  const bindings = fs.existsSync('node_modules/@rolldown') ? fs.readdirSync('node_modules/@rolldown').filter((d) => d.startsWith('binding-')) : []
  if (!bindings.length)
    problems.push(
      "node_modules is missing Vite's native part: it was installed with an older Node.\n" +
        '    Fix: rm -rf node_modules && npm install   (with Node 22 active; node -v says which)',
    )
}

// 3. macOS quarantine: a folder copied via AirDrop / downloaded as a zip marks every file, and macOS then refuses to
//    load the bundler's native binary.
if (process.platform === 'darwin' && hasModules) {
  const binding = ['node_modules/@rolldown/binding-darwin-arm64', 'node_modules/@rolldown/binding-darwin-x64']
    .filter((d) => fs.existsSync(d))
    .flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.node')).map((f) => path.join(d, f)))[0]
  if (binding) {
    try {
      execFileSync('xattr', ['-p', 'com.apple.quarantine', binding], { stdio: 'pipe' })
      problems.push(
        'macOS has quarantined node_modules (this folder was AirDropped or unzipped), so Vite cannot load its native binary.\n' +
          '    Fix: xattr -dr com.apple.quarantine node_modules   (or delete node_modules and run npm install)',
      )
    } catch {
      // no quarantine attribute: fine
    }
  }
}

if (!quick) {
  // 4. Emoji images come from the emoji package
  const large = fs.existsSync('node_modules/emoji-datasource-apple/img/apple/64') ? fs.readdirSync('node_modules/emoji-datasource-apple/img/apple/64').length : 0
  if (hasModules && large < 3000) problems.push('emoji-datasource-apple has no 64px images. Fix: npm install')

  // 5. What the harvest came from (the iOS checkout isn't needed to run the kit, only to re-harvest)
  const tokens = 'src/tokens/generated/colors.css'
  if (fs.existsSync(tokens)) notes.push(`iOS color tokens: ${fs.readFileSync(tokens, 'utf8').split('\n')[0].replace(/^\/\* |\*\/$/g, '').trim()}`)
  const ios = process.env.SLACK_IOS_DIR || path.join(process.env.HOME || '', 'Desktop/Slack Mobile Code Base/slack-objc-latest')
  notes.push(fs.existsSync(ios) ? `Slack iOS source (for npm run harvest and the specs): ${ios}` : 'No Slack iOS checkout found (only needed to re-harvest tokens and icons; set SLACK_IOS_DIR).')

  // 6. Chrome for self-tests and screenshots
  try {
    const { findChrome } = await import('./lib/chrome.mjs')
    notes.push(`Chrome for self-tests: ${findChrome()}`)
  } catch (e) {
    notes.push(`No Chrome found: \`npm run selftest\` and \`npm run shot\` need Google Chrome (or set CHROME_PATH). ${e.message}`)
  }

  // 7. Port
  try {
    await fetch('http://localhost:5190/', { signal: AbortSignal.timeout(1000) })
    notes.push('Something is already serving http://localhost:5190 (probably the dev server). `npm run dev` needs that port.')
  } catch {
    // free
  }
}

for (const n of notes) console.log(`• ${n}`)
if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length > 1 ? 's' : ''} to fix before the kit can run:\n`)
  for (const p of problems) console.error(`✗ ${p}\n`)
  process.exit(1)
}
if (!quick) console.log('\n✓ Ready. Start the kit with: npm run dev')
