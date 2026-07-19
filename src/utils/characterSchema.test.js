import { describe, it, expect } from 'vitest'
import { safeParseCharacter } from './characterSchema.js'

// Minimal valid character: only the fields the schema has no default for
// (every attribute key, every defense row). Everything else fills in.
const ATTR_KEYS = [
  'strength','agility','dexterity','endurance','constitution','intelligence',
  'wisdom','thaumaturgy','enlightenment','charisma','comeliness','fame',
]
const base = (weapons) => ({
  attributes: Object.fromEntries(ATTR_KEYS.map(k => [k, {}])),
  defense: { typical: {}, prone: {}, magic: {}, psychic: {}, other: {} },
  weapons,
})

const parseWeapon = (weapon) => {
  const result = safeParseCharacter(base([weapon]))
  expect(result.success).toBe(true)
  return result.data.weapons[0]
}

describe('weapon usesSkill migration', () => {
  it('infers usesSkill=true for a legacy weapon with a nonzero skillBonus', () => {
    const w = parseWeapon({ id: 'w', name: 'Sword', attribute: 'strength', attributeBonus: 5, skillBonus: 12 })
    expect(w.usesSkill).toBe(true)
  })

  it('infers usesSkill=false for a legacy weapon with no skill', () => {
    const w = parseWeapon({ id: 'w', name: 'Sling', attribute: 'dexterity', attributeBonus: 6, skillBonus: 0 })
    expect(w.usesSkill).toBe(false)
  })

  it('preserves an explicit usesSkill=true even when skillBonus is 0', () => {
    const w = parseWeapon({ id: 'w', name: 'Skilled', attribute: 'agility', attributeBonus: 9, skillBonus: 0, usesSkill: true })
    expect(w.usesSkill).toBe(true)
  })

  it('preserves an explicit usesSkill=false even when a skill bonus exists', () => {
    const w = parseWeapon({ id: 'w', name: 'Unskilled', attribute: 'agility', attributeBonus: 9, skillBonus: 15, usesSkill: false })
    expect(w.usesSkill).toBe(false)
  })

  it('defaults usesSkill to false for a fresh weapon with no skill', () => {
    const w = parseWeapon({ id: 'w', name: 'New', attribute: 'agility' })
    expect(w.usesSkill).toBe(false)
  })
})

describe('legacy race name migration', () => {
  const parseRace = (race) => {
    const result = safeParseCharacter({ ...base([]), race })
    expect(result.success).toBe(true)
    return result.data.race
  }

  it('maps the old eledhel id to quindhel', () => {
    expect(parseRace('eledhel')).toBe('quindhel')
  })

  it('maps the old glamredhel id to glamdroi', () => {
    expect(parseRace('glamredhel')).toBe('glamdroi')
  })

  it('rewrites free-text hybrid race strings from imported rosters', () => {
    expect(parseRace('Human / Eledhel')).toBe("Human / Quin'dhel")
    expect(parseRace('Half-Glamredhel')).toBe("Half-Gla'mdroi")
  })

  it('leaves current race values alone', () => {
    expect(parseRace('human')).toBe('human')
    expect(parseRace('quindhel')).toBe('quindhel')
  })

  it('defaults to human when race is absent', () => {
    const result = safeParseCharacter(base([]))
    expect(result.success).toBe(true)
    expect(result.data.race).toBe('human')
  })
})

describe('conditions', () => {
  it('defaults legacy characters to no conditions', () => {
    expect(safeParseCharacter(base([])).data.conditions).toEqual([])
  })

  it('preserves a free-text label and optional numeric modifier', () => {
    const result = safeParseCharacter({
      ...base([]),
      conditions: [{ id: 'c1', label: 'all rolls (backdraft)', modifier: -10 }],
    })
    expect(result.success).toBe(true)
    expect(result.data.conditions).toEqual([{ id: 'c1', label: 'all rolls (backdraft)', modifier: -10 }])
  })
})
