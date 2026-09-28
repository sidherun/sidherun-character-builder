import { describe, it, expect } from 'vitest'
import { calcSkillTotal, skillAttributeScore } from './characterDerived.js'

// #373: skills stored a snapshot of the linked attribute when added, so later
// attribute changes (level up) never reached the skill total.
describe('skill totals use the current attribute (#373)', () => {
  // Haagen's live data: Survival saved against Wisdom 11, Wisdom now 14.
  const attributes = { wisdom: { base: 12, racialMod: 1, tempMod: 1 } } // 14
  const survival = { name: 'Survival', attributeName: 'Wisdom', attributeScore: 11, skillPoints: 20, tempMod: 0 }

  it('ignores a stale stored attributeScore', () => {
    expect(skillAttributeScore(survival, attributes)).toBe(14)
    expect(calcSkillTotal(survival, attributes)).toBe(34)
  })

  it('resolves attribute names case-insensitively', () => {
    expect(skillAttributeScore({ ...survival, attributeName: 'wisdom' }, attributes)).toBe(14)
  })

  it('still adds skill points and the temporary modifier', () => {
    expect(calcSkillTotal({ ...survival, tempMod: -2 }, attributes)).toBe(32)
  })

  it('falls back to the stored score when the attribute does not resolve', () => {
    expect(calcSkillTotal({ ...survival, attributeName: '' }, attributes)).toBe(31)
    expect(calcSkillTotal({ ...survival, attributeName: 'Luck' }, attributes)).toBe(31)
    expect(calcSkillTotal(survival)).toBe(31)
  })
})
