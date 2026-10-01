import { describe, expect, it } from 'vitest'
import { FLAGS, FLAG_NAMES, parseFlags, useFlags, applyPrototypeFlags } from './flags'

describe('flags', () => {
  it('defaults to production values', () => {
    const s = useFlags.getState()
    for (const n of FLAG_NAMES) expect(s[n]).toBe(FLAGS[n].value)
  })

  it('parses ?flags=: -name off, name / +name on, unknown names ignored', () => {
    expect(parseFlags('-agentsInDms,+refreshedOnboardingV2, agentsAndAppsBadging,nope')).toEqual({ agentsInDms: false, refreshedOnboardingV2: true, agentsAndAppsBadging: true })
    expect(parseFlags('')).toEqual({})
    expect(parseFlags(null)).toEqual({})
  })

  it("applies a prototype's flags and resets to production", () => {
    applyPrototypeFlags({ agentsInDms: false, notAFlag: true })
    expect(useFlags.getState().agentsInDms).toBe(false)
    useFlags.getState().reset()
    expect(useFlags.getState().agentsInDms).toBe(true)
  })

  it('keeps only flags Slack still decides at runtime (the June toggles removed in 14b3cbaf are gone)', () => {
    for (const gone of ['iaNextHomeTabV3', 'iaNextDmsFilters', 'activityViews', 'activityRowRedesign']) expect(FLAG_NAMES as string[]).not.toContain(gone)
  })

  it('cites a source for every flag', () => {
    for (const n of FLAG_NAMES) {
      expect(FLAGS[n].source.length).toBeGreaterThan(20)
      expect(FLAGS[n].effect.length).toBeGreaterThan(20)
    }
  })
})
