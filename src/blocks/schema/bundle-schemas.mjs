#!/usr/bin/env node
// Regenerates block-kit-input.json (next to this file): Slack's Block Kit input JSON schemas (webapp api_metadata/schemas)
// bundled into one map, { roots: { message, view }, schemas: { "<path>": schema } }, every $ref rewritten to
// "<path>#<pointer>". validate.ts checks payloads against it.
//
//   SLACK_WEBAPP=<webapp checkout> node src/blocks/schema/bundle-schemas.mjs
//
// SLACK_WEBAPP (required, docs/block-kit.md): a slack/webapp checkout; the script reads api_metadata/schemas/.
import fs from 'node:fs'
import path from 'node:path'

const WEBAPP = process.env.SLACK_WEBAPP
if (!WEBAPP || !fs.existsSync(`${WEBAPP}/api_metadata/schemas`)) {
  console.error(
    `${WEBAPP ? `SLACK_WEBAPP=${WEBAPP} has no api_metadata/schemas/.` : "SLACK_WEBAPP isn't set."} Set it to a slack/webapp checkout:\n\n` +
      '  SLACK_WEBAPP=<webapp checkout> node src/blocks/schema/bundle-schemas.mjs\n',
  )
  process.exit(1)
}
const ROOT = `${WEBAPP}/api_metadata/schemas`
const OUT = process.argv[2] ?? path.join(import.meta.dirname, 'block-kit-input.json')
const DROP = new Set(['description', 'desc', 'title', 'version', '$schema', 'examples', 'sanitize', 'coerce', '$comment', 'hackEnum', 'hackType', 'x-renderer'])

const schemas = {}
const queue = []
const want = (rel) => {
  if (!(rel in schemas)) {
    schemas[rel] = null
    queue.push(rel)
  }
}

function rewrite(node, fileRel) {
  if (Array.isArray(node)) return node.map((n) => rewrite(n, fileRel))
  if (!node || typeof node !== 'object') return node
  const out = {}
  for (const [k, v] of Object.entries(node)) {
    if (DROP.has(k) && typeof v !== 'object') continue
    if (k === '$ref' && typeof v === 'string') {
      const [file, frag = ''] = v.split('#')
      const target = file ? path.normalize(path.join(path.dirname(fileRel), file)) : fileRel
      want(target)
      out[k] = `${target}#${frag}`
    } else out[k] = rewrite(v, fileRel)
  }
  return out
}

want('block-kit/input/blocks.json')
want('views/input/blocks.json')
want('views/input/modal.json')
want('views/input/home.json')
while (queue.length) {
  const rel = queue.shift()
  const file = path.join(ROOT, rel)
  if (!fs.existsSync(file)) {
    console.error('missing', rel)
    schemas[rel] = {}
    continue
  }
  schemas[rel] = rewrite(JSON.parse(fs.readFileSync(file, 'utf8')), rel)
}
const bundle = { source: 'slack/webapp api_metadata/schemas (webapp-master snapshot, 2026-08-12)', roots: { message: 'block-kit/input/blocks.json#', view: 'views/input/blocks.json#' }, schemas }
fs.writeFileSync(OUT, JSON.stringify(bundle))
console.log(Object.keys(schemas).length, 'schemas', (fs.statSync(OUT).size / 1024).toFixed(0), 'KB')
