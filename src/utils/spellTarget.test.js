import { describe, it, expect } from 'vitest'
import { getSpellTarget, getSpellZone, getFinalSpellTarget } from './spellTarget.js'
import matrix from '../../rules/data/spell-matrix.json'

const BASE = matrix.base.grid
const ZONES = matrix.color_zones.grid

describe('spell target (golden pages spell matrix + 2026-07-09 red-zone ruling)', () => {
  it('matches the PHB worked example: level 5 caster vs level 4 target, stat 15 → 75', () => {
    expect(getFinalSpellTarget(5, 4, 15)).toBe(75)
  })

  it('red-zone cells do NOT add the attribute — raw base is the target', () => {
    // Verbatim source example: L1 caster vs L2 is 40 (+attr → 55), but vs L3
    // the cell is red: target is 30 with no modifier.
    expect(getFinalSpellTarget(1, 2, 15)).toBe(55)
    expect(getSpellZone(1, 3)).toBe('red')
    expect(getFinalSpellTarget(1, 3, 15)).toBe(30)
    // caster 1 vs target 4: base 15, red → 15 regardless of stat.
    expect(getFinalSpellTarget(1, 4, 15)).toBe(15)
    expect(getFinalSpellTarget(1, 4, 0)).toBe(15)
  })

  it('matches the acceptance row: caster L5 across targets 1→20 at stat 15', () => {
    const expected = [95, 95, 85, 75, 65, 55, 30, 15, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1]
    const actual = Array.from({ length: 20 }, (_, i) => getFinalSpellTarget(5, i + 1, 15))
    expect(actual).toEqual(expected)
  })

  it('walks the full 20×20 grid at stat 15: red → base, else min(base+15, 95)', () => {
    let redCells = 0
    for (let c = 1; c <= 20; c++) {
      for (let t = 1; t <= 20; t++) {
        const base = BASE[c - 1][t - 1]
        const zone = ZONES[c - 1][t - 1]
        const expected = zone === 'red' ? base : Math.min(95, base + 15)
        expect(getFinalSpellTarget(c, t, 15), `caster ${c} vs target ${t}`).toBe(expected)
        expect(getSpellZone(c, t)).toBe(zone)
        expect(getSpellTarget(c, t)).toBe(base)
        if (zone === 'red') redCells++
      }
    }
    // The ruling affects exactly the 171 red cells (each −15 vs uniform-add).
    expect(redCells).toBe(171)
  })

  it('is monotonic: success never rises as the target level climbs', () => {
    for (let c = 1; c <= 20; c++) {
      for (let t = 2; t <= 20; t++) {
        expect(getFinalSpellTarget(c, t, 15)).toBeLessThanOrEqual(getFinalSpellTarget(c, t - 1, 15))
      }
    }
  })

  it('zone boundaries match the documented bands (red ≤ 30, yellow 40–60, green ≥ 70)', () => {
    for (let c = 1; c <= 20; c++) {
      for (let t = 1; t <= 20; t++) {
        const base = BASE[c - 1][t - 1]
        const zone = ZONES[c - 1][t - 1]
        if (zone === 'red') expect(base).toBeLessThanOrEqual(30)
        else if (zone === 'yellow') { expect(base).toBeGreaterThanOrEqual(40); expect(base).toBeLessThanOrEqual(60) }
        else expect(base).toBeGreaterThanOrEqual(70)
      }
    }
  })

  it('caps at 95 outside the red zone', () => {
    expect(getFinalSpellTarget(10, 1, 40)).toBe(95)
  })

  it('returns null out of range', () => {
    expect(getSpellTarget(0, 1)).toBeNull()
    expect(getSpellTarget(1, 21)).toBeNull()
    expect(getSpellZone(0, 1)).toBeNull()
    expect(getFinalSpellTarget(99, 1, 10)).toBeNull()
  })
})
