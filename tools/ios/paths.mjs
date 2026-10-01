// Where the iOS sources live on this machine. Everything the harvest reads comes from one of these; everything it
// writes is committed, so the app builds (and GitHub Pages deploys) without any of them.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const home = os.homedir()

// Slack's iOS app source: github.com/tinyspeck/slack-objc (private, branch main), a shallow clone with the iOS 26
// snapshot PNGs pulled from Git LFS:
//   git clone --depth 1 --branch main https://github.com/tinyspeck/slack-objc.git slack-objc-latest
//   git -C slack-objc-latest lfs pull --include "Modules/**/Snapshots/iOS_26/**"
// Update it with `git -C <dir> pull --depth 1` and the same lfs pull.
export const IOS_DIR = process.env.SLACK_IOS_DIR || path.join(home, 'Desktop/Slack Mobile Code Base/slack-objc-latest')

/** A checkout of the same code with Git LFS objects (the snapshot-test PNGs are LFS pointers without them). */
export const IOS_LFS_DIR = process.env.SLACK_IOS_LFS_DIR || IOS_DIR

/**
 * slack/design-tokens (slack-github.com) at the commit the iOS app pins (internal.MODULE.bazel DESIGN_TOKENS_SHA).
 * Its output/ios/Colors.swift, output/ios/Presets.swift and scripts/ios-colors.ts are vendored into
 * reference/ios/vendor/design-tokens-<sha>/ (fetch them with `gh api repos/slack/design-tokens/contents/<path>?ref=<sha>`
 * against slack-github.com), so the harvest runs without Bazel. A local design-tokens checkout can be used instead.
 */
export const DESIGN_TOKENS_DIR = process.env.SLACK_DESIGN_TOKENS_DIR || ''

export const DESIGN_TOKENS_SHA = 'f76ac0a'

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
export const VENDOR_DIR = path.join(ROOT, 'reference/ios/vendor')

export function need(p, what) {
  if (!fs.existsSync(p)) {
    console.error(`missing ${what}: ${p}\nSet the matching SLACK_* variable (tools/ios/paths.mjs) to where it is on your machine.`)
    process.exit(1)
  }
  return p
}
