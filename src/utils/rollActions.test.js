import { describe, it, expect } from 'vitest'
import { weaponModifier, rollSkill, rollAttack, rollSpell } from './rollActions.js'

const fixed = (v) => () => v // Math.floor(v * 100) + 1 = the d100 roll

describe('weaponModifier (non-stacking skill-or-attribute)', () => {
  it('uses the skill value when the weapon has one', () => {
    expect(weaponModifier({ skillBonus: 18, attributeBonus: 5 })).toBe(18)
  })

  it('falls back to the attribute when there is no skill', () => {
    expect(weaponModifier({ skillBonus: 0, attributeBonus: 12 })).toBe(12)
  })

  it('never stacks skill + attribute', () => {
    const w = { skillBonus: 18, attributeBonus: 5 }
    expect(weaponModifier(w)).not.toBe(18 + 5)
  })

  it('handles a missing weapon', () => {
    expect(weaponModifier(null)).toBe(0)
    expect(weaponModifier({})).toBe(0)
  })
})

describe('rollSkill (roll d100 + skill total, display total)', () => {
  it('adds calcSkillTotal to the roll', () => {
    const skill = { attributeScore: 10, skillPoints: 8, tempMod: 0 } // total 18
    expect(rollSkill({}, skill, fixed(0.61))).toEqual({ roll: 62, modifier: 18, total: 80 })
  })
})

describe('rollAttack (roll d100 + non-stacking weapon modifier, display total)', () => {
  it('uses the single weapon modifier', () => {
    const weapon = { skillBonus: 18, attributeBonus: 5 }
    expect(rollAttack({}, weapon, fixed(0.61))).toEqual({ roll: 62, modifier: 18, total: 80 })
  })

  it('uses the attribute when the weapon is unskilled', () => {
    const weapon = { skillBonus: 0, attributeBonus: 12 }
    expect(rollAttack({}, weapon, fixed(0.61))).toMatchObject({ modifier: 12, total: 74 })
  })
})

describe('rollSpell (roll under spell matrix + magic attribute, capped 95)', () => {
  // PHB worked example: level 5 caster vs level 4 target, thaumaturgy 15 → target 75.
  const caster = { level: 5, magicAttribute: 'thaumaturgy', attributes: { thaumaturgy: { base: 15 } } }

  it('succeeds when the roll is under the computed target', () => {
    expect(rollSpell(caster, 4, fixed(0.5))).toMatchObject({
      roll: 51, target: 75, success: true, margin: 24,
    })
  })

  it('fails when the roll exceeds the target', () => {
    expect(rollSpell(caster, 4, fixed(0.8))).toMatchObject({
      roll: 81, target: 75, success: false,
    })
  })

  it('adds nothing when the caster has no magic attribute (target = base 60)', () => {
    const noAttr = { level: 5, attributes: {} }
    expect(rollSpell(noAttr, 4, fixed(0.5))).toMatchObject({ target: 60, success: true })
  })

  it('flags an out-of-range target level', () => {
    expect(rollSpell(caster, 21, fixed(0.5))).toMatchObject({ target: null, outOfRange: true })
  })
})
