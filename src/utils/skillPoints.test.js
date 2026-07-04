import { describe, it, expect } from 'vitest'
import { poolSize, maxAddPerSkill, cumulativeSkillCap, skillBudget } from './skillPoints.js'

describe('poolSize (PHB pp.14-15)', () => {
  it('matches the rulebook table', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(poolSize)).toEqual([30, 50, 70, 80, 90, 100, 110, 120, 125, 130])
  })
  it("L2->L3 is the +20 from Ed's example", () => {
    expect(poolSize(3) - poolSize(2)).toBe(20)
  })
  it('adds 5 per level past 10', () => {
    expect(poolSize(11)).toBe(135)
    expect(poolSize(13)).toBe(145)
  })
  it('clamps junk levels to 1', () => {
    expect(poolSize(0)).toBe(30)
    expect(poolSize(undefined)).toBe(30)
  })
})

describe('maxAddPerSkill / cumulativeSkillCap', () => {
  it('per-level add cap follows the table', () => {
    expect([1, 2, 3, 9].map(maxAddPerSkill)).toEqual([15, 15, 10, 5])
  })
  it('cumulative per-skill cap is 40 at level 3 (15+15+10)', () => {
    expect(cumulativeSkillCap(3)).toBe(40)
    expect(cumulativeSkillCap(1)).toBe(15)
    expect(cumulativeSkillCap(2)).toBe(30)
    expect(cumulativeSkillCap(10)).toBe(100)
  })
})

describe('skillBudget', () => {
  const mk = (level, pts) => ({ level, skills: pts.map((p, i) => ({ name: `S${i}`, skillPoints: p })) })

  it('sums dedicated points and reports remaining', () => {
    const b = skillBudget(mk(3, [20, 20, 10])) // pool 70, used 50
    expect(b.used).toBe(50)
    expect(b.pool).toBe(70)
    expect(b.remaining).toBe(20)
    expect(b.overBudget).toBe(false)
  })

  it('flags over-pool allocation', () => {
    const b = skillBudget(mk(2, [40, 20])) // pool 50, used 60
    expect(b.remaining).toBe(-10)
    expect(b.overBudget).toBe(true)
  })

  it('flags a single skill over the cumulative cap (40 at L3)', () => {
    const b = skillBudget(mk(3, [45])) // one skill at 45 > cap 40
    expect(b.violations).toHaveLength(1)
    expect(b.violations[0]).toMatchObject({ points: 45, cap: 40 })
    expect(b.overBudget).toBe(true)
  })

  it('is clean for an empty / new character', () => {
    const b = skillBudget({ level: 1, skills: [] })
    expect(b.used).toBe(0)
    expect(b.overBudget).toBe(false)
  })
})
