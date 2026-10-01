#!/usr/bin/env node
// Which of the specs' source citations changed between two iOS checkouts. The specs in reference/ios/specs/ cite
// `Path/File.swift:120-140, 160` (or `File.swift:120` after the full path was named once, or a bare `:180-190` that
// continues the last file named in the same paragraph; `yaml:18820` means localized_strings.yaml and `Colors.swift:…`
// the vendored design tokens). This re-reads every cited range in the old checkout, looks for the same lines in the new
// one, and reports what moved, changed or went away.
//
//   node tools/ios/spec-drift.mjs <old checkout> [new checkout]   (new defaults to SLACK_IOS_DIR, tools/ios/paths.mjs)
//   node tools/ios/spec-drift.mjs <old> <new> --json drift.json     the full list as JSON
//   node tools/ios/spec-drift.mjs <old> <new> --spec home.md        one spec
//
// "moved" means every cited line still exists, at new line numbers (update the citation); "changed" means some of
// the cited lines are gone (re-read the code and the spec's claim); "gone" means the file is gone. Citations that
// don't resolve in the old checkout (ambiguous short names, typos) are counted as "unresolved".

import fs from 'node:fs'
import path from 'node:path'
import { IOS_DIR, ROOT } from './paths.mjs'

const args = process.argv.slice(2)
const OLD = args[0]
const NEW = args[1] && !args[1].startsWith('--') ? args[1] : IOS_DIR
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const jsonOut = flag('--json')
const onlySpec = flag('--spec')
if (!OLD || !fs.existsSync(OLD)) {
  console.error('Usage: node tools/ios/spec-drift.mjs <old checkout> [new checkout] [--json out.json] [--spec name.md]')
  process.exit(1)
}

// Index the old tree's source files by basename, to resolve short citations
const byBase = new Map()
function walk(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'Snapshots' || e.name === 'node_modules' || e.name.startsWith('bazel-')) continue
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(path.join(dir, e.name), r)
    else if (/\.(swift|m|h|mm|yaml)$/.test(e.name)) (byBase.get(e.name) ?? byBase.set(e.name, []).get(e.name)).push(r)
  }
}
for (const top of ['Modules', 'App']) if (fs.existsSync(path.join(OLD, top))) walk(path.join(OLD, top), top)
const yamlPath = (byBase.get('localized_strings.yaml') ?? [])[0]

const cache = new Map()
const read = (root, rel) => {
  const key = `${root}\0${rel}`
  if (!cache.has(key)) {
    let lines = null
    try {
      lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n')
    } catch {
      // missing
    }
    cache.set(key, lines)
  }
  return cache.get(key)
}
const norm = (s) => s.trim().replace(/\s+/g, ' ')

/** `File.swift`, `Path/File.swift`, `yaml`, `Colors.swift`, then `:12-20, 33` (ranges separated by commas). */
const FILE = String.raw`((?:Modules|App)\/[\w/+.-]+?\.(?:swift|m|h|mm|yaml)|[A-Z][\w+]*\.(?:swift|m|h|mm)|localized_strings\.yaml|yaml)`
const RANGES = String.raw`:(\d+(?:-\d+)?(?:\s*,\s*\d+(?:-\d+)?)*)`
const CITE = new RegExp(`${FILE}\`?${RANGES}|(?<=[\\s(\`;])${RANGES}`, 'g')

/** A short name → its path: unique matches; else the non-test one; else the one in the module the spec cites most. */
function resolve(file, specModules) {
  if (file === 'yaml' || file === 'localized_strings.yaml') return yamlPath
  if (file.includes('/')) return file
  let hits = byBase.get(file) ?? []
  if (hits.length > 1) hits = hits.filter((h) => !/\/(Tests|TestSupport|Mocks?)\//.test(h))
  if (hits.length > 1) {
    const score = (h) => specModules.get(h.split('/').slice(0, 3).join('/')) ?? 0
    const best = [...hits].sort((x, y) => score(y) - score(x))
    if (score(best[0]) > score(best[1] ?? '')) hits = [best[0]]
  }
  return hits.length === 1 ? hits[0] : undefined
}

const SPECS = path.join(ROOT, 'reference/ios/specs')
const results = []
for (const spec of fs.readdirSync(SPECS).filter((f) => f.endsWith('.md') && (!onlySpec || f === onlySpec))) {
  const text = fs.readFileSync(path.join(SPECS, spec), 'utf8')
  // which modules (Modules/<Layer>/<Module>) the spec names in full paths: they decide ambiguous short names
  const specModules = new Map()
  for (const m of text.matchAll(/(Modules\/[\w+-]+\/[\w+-]+)\//g)) specModules.set(m[1], (specModules.get(m[1]) ?? 0) + 1)
  // Bare `:N` continues the last file named in the same paragraph
  for (const para of text.split(/\n\s*\n/)) {
    let last
    for (const m of para.matchAll(CITE)) {
      const file = m[1]
      const ranges = m[2] ?? m[3]
      let rel
      if (file) {
        rel = resolve(file, specModules)
        last = rel
      } else rel = last
      for (const range of ranges.split(/\s*,\s*/)) {
        const [a, b] = range.split('-').map(Number)
        const citation = `${file ?? '…'}:${range}`
        if (!rel) {
          if (file) results.push({ spec, citation, file: file, status: 'unresolved' })
          continue
        }
        const oldLines = read(OLD, rel)
        if (!oldLines) {
          results.push({ spec, citation, file: rel, status: 'unresolved' })
          continue
        }
        // the cited lines that carry content (closing braces and blank lines prove nothing), with their old index
        const cited = oldLines
          .slice(a - 1, b ?? a)
          .map((l, i) => ({ text: norm(l), at: a - 1 + i }))
          .filter((l) => l.text.length > 3)
        if (!cited.length) continue
        const newLines = read(NEW, rel)
        let status
        let newLine = null
        if (!newLines) status = 'gone'
        else {
          const newNorm = newLines.map(norm)
          const all = cited.every((l) => newNorm.includes(l.text))
          if (cited.every((l) => newNorm[l.at] === l.text)) status = 'same'
          else if (all) {
            status = 'moved'
            newLine = newNorm.indexOf(cited[0].text) + 1 - (cited[0].at - (a - 1))
          } else status = 'changed'
        }
        results.push({ spec, citation, file: rel, status, newLine })
      }
    }
  }
}

const summary = {}
for (const r of results) {
  summary[r.spec] ??= { same: 0, moved: 0, changed: 0, gone: 0, unresolved: 0 }
  summary[r.spec][r.status]++
}
console.log(`Spec citations, ${path.basename(OLD)} → ${path.basename(NEW)}:\n`)
console.log('spec'.padEnd(30), 'same'.padStart(6), 'moved'.padStart(6), 'changed'.padStart(8), 'gone'.padStart(6), 'unresolved'.padStart(11))
for (const [spec, s] of Object.entries(summary))
  console.log(spec.padEnd(30), String(s.same).padStart(6), String(s.moved).padStart(6), String(s.changed).padStart(8), String(s.gone).padStart(6), String(s.unresolved).padStart(11))
const bad = results.filter((r) => r.status === 'changed' || r.status === 'gone')
const count = {}
for (const r of bad) count[r.file] = (count[r.file] ?? 0) + 1
console.log(`\n${bad.length} citations in ${Object.keys(count).length} files changed or are gone. Most-cited changed files:`)
for (const [f, n] of Object.entries(count).sort((x, y) => y[1] - x[1]).slice(0, 25)) console.log(`  ${String(n).padStart(3)}  ${f}`)
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1))
