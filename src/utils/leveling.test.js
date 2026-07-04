import { describe, it, expect } from 'vitest'
import { canLevelUp, levelUpPreview, applyLevelUp, xpStartForLevel } from './leveling.js'
import { skillBudget } from './skillPoints.js'

const mk = (over) => ({ level: 2, xp: { current: 3500, needed: 3001 }, skills: [
  { id: 'a', name: 'Sword', skillPoints: 20 },
  { id: 'b', name: 'Climb', skillPoints: 10 },
], ...over })

describe('canLevelUp', () => {
  it('is true once XP reaches the next level start (L3 begins at 3001)', () => {
    expect(canLevelUp(mk())).toBe(true) // 3500 >= 3001
  })
  it('is false below the threshold', () => {
    expect(canLevelUp(mk({ level: 2, xp: { current: 1500 } }))).toBe(false) // still in L2 range
  })
  it('is false at max level', () => {
    expect(canLevelUp(mk({ level: 20, xp: { current: 999999 } }))).toBe(false)
  })
})

describe('levelUpPreview', () => {
  it('reports the base pool growth (L2->L3 = +20)', () => {
    const p = levelUpPreview(mk())
    expect(p.from).toBe(2)
    expect(p.to).toBe(3)
    expect(p.addedPoints).toBe(20)
    expect(p.poolBefore).toBe(50)
    expect(p.poolAfter).toBe(70)
    expect(p.xpToReach).toBe(xpStartForLevel(3))
  })
  it('flags max level', () => {
    expect(levelUpPreview(mk({ level: 20 })).atMax).toBe(true)
  })
})

describe('applyLevelUp', () => {
  it('bumps level, refreshes the XP threshold, and snapshots the baseline', () => {
    const patch = applyLevelUp(mk())
    expect(patch.level).toBe(3)
    expect(patch.xp.needed).toBe(xpStartForLevel(4)) // 6001
    expect(patch._levelBaseline).toEqual({ level: 3, points: { a: 20, b: 10 } })
  })
  it('does not touch skills/attributes (only level, xp, baseline in the patch)', () => {
    const patch = applyLevelUp(mk())
    expect(patch.skills).toBeUndefined()
    expect(patch.attributes).toBeUndefined()
  })
  it('is a no-op at max level', () => {
    expect(applyLevelUp(mk({ level: 20 }))).toEqual({})
  })
})

describe('skillBudget per-level add (baseline)', () => {
  it('flags a skill that gained more than the per-level cap since level-up', () => {
    // L3 maxAdd = 10; Sword goes 20 -> 35 (+15 > 10)
    const c = mk({ level: 3, skills: [{ id: 'a', name: 'Sword', skillPoints: 35 }],
      _levelBaseline: { level: 3, points: { a: 20 } } })
    const b = skillBudget(c)
    expect(b.perLevelAdds).toHaveLength(1)
    expect(b.perLevelAdds[0]).toMatchObject({ added: 15, maxAdd: 10 })
    expect(b.overBudget).toBe(true)
    expect(b.available).toBe(b.pool - b.used)
  })
  it('no per-level flag when the baseline is for a different level', () => {
    const c = mk({ level: 4, skills: [{ id: 'a', name: 'Sword', skillPoints: 35 }],
      _levelBaseline: { level: 3, points: { a: 20 } } })
    expect(skillBudget(c).perLevelAdds).toHaveLength(0)
  })
})
