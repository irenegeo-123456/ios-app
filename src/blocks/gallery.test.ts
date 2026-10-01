import { describe, expect, it } from 'vitest'
import { buildSpecimen, specimenSurfaces, SPECIMENS } from './gallery'
import { validateBlocks } from './validate'

// Every Block Kit gallery specimen (?kit=blocks) builds from its snippet and is valid Block Kit on each surface it's
// drawn on, so what people copy from the gallery works in a prototype.

describe('Block Kit gallery specimens', () => {
  it('have unique ids', () => {
    const ids = SPECIMENS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const s of SPECIMENS) {
    it(`${s.id} builds and validates`, () => {
      const blocks = buildSpecimen(s.code)
      expect(blocks.length).toBeGreaterThan(0)
      const surfaces = specimenSurfaces(s, blocks)
      expect(surfaces.length).toBeGreaterThan(0)
      if (s.internal) return
      for (const surface of surfaces) {
        const errors = validateBlocks(blocks, surface).filter((i) => i.level === 'error')
        expect(errors.map((e) => `${surface} ${e.path}: ${e.message}`)).toEqual([])
      }
    })
  }
})
