import { describe, it, expect } from 'vitest'
import { getSpellTarget, getFinalSpellTarget } from './spellTarget.js'

describe('spell target (PHB 2.8.2026 Spell Matrix)', () => {
  it('matches the PHB worked example: level 5 caster vs level 4 target, stat 15 → 75', () => {
    expect(getFinalSpellTarget(5, 4, 15)).toBe(75)
  })

  it('reproduces the PHB chart (base + 15, capped 95) across the playable band', () => {
    // (caster, target) → displayed value at stat 15, read from the PHB screenshot
    const phb = [
      [1, 1, 65], [1, 2, 55], [1, 3, 45], [1, 4, 30], [1, 5, 20],
      [2, 1, 75], [3, 3, 65], [4, 1, 95], [6, 6, 65], [5, 6, 55],
    ]
    for (const [c, t, v] of phb) expect(getFinalSpellTarget(c, t, 15)).toBe(v)
  })

  it('always adds the attribute — no red-zone suppression at low base', () => {
    // caster 1 vs target 4: base 15. Old code returned 15 (suppressed); PHB adds the stat.
    expect(getSpellTarget(1, 4)).toBe(15)
    expect(getFinalSpellTarget(1, 4, 15)).toBe(30)
    expect(getFinalSpellTarget(1, 4, 0)).toBe(15)
  })

  it('caps at 95', () => {
    expect(getFinalSpellTarget(10, 1, 40)).toBe(95)
  })

  it('returns null out of range', () => {
    expect(getSpellTarget(0, 1)).toBeNull()
    expect(getSpellTarget(1, 21)).toBeNull()
    expect(getFinalSpellTarget(99, 1, 10)).toBeNull()
  })
})
