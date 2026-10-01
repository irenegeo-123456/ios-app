import type { Fixture } from './types'
import { demo } from './demo'

// Area data files (src/data/demo-<area>.ts) extend the demo fixture when imported. They're the web clone's
// Northstar demo (slack-remix src/data), shared so a prototype reads the same on web and mobile.
import.meta.glob('./demo-*.ts', { eager: true })

/** A fresh copy of the demo workspace; the store and prototypes change the copy, never the module. */
export function pickFixture(): Fixture {
  return structuredClone(demo)
}
