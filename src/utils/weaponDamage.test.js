import { describe, it, expect } from 'vitest'
import { migrateCharacterWeaponDamage, migrateLegacyRange, migrateWeaponDamage, parseDamageDice, parseLegacyDamageDescriptor, weaponDamageLabel, weaponStructureIssues } from './weaponDamage.js'

describe('parseDamageDice', () => {
  it('accepts bounded NdS notation', () => {
    expect(parseDamageDice('2d8')).toEqual({ count: 2, sides: 8, notation: '2d8' })
    expect(parseDamageDice('nope')).toBeNull()
  })
})

describe('legacy weapon damage migration', () => {
  it.each([
    ['1d8 slashing', { damageDice: '1d8', damageBonus: 0, damageType: 'slashing', descriptor: '' }],
    ['1d8 piercing, ranged', { damageDice: '1d8', damageBonus: 0, damageType: 'piercing', descriptor: 'ranged' }],
    ['Dmg = 8', { damageDice: '', damageBonus: 8, damageType: '', descriptor: '' }],
    ['base dmg 8', { damageDice: '', damageBonus: 8, damageType: '', descriptor: '' }],
    ['metal tip (6)', { damageDice: '', damageBonus: 6, damageType: '', descriptor: 'metal tip' }],
  ])('parses %s without guessing', (input, expected) => {
    expect(parseLegacyDamageDescriptor(input)).toEqual(expected)
  })

  it('preserves and flags an unrecognized descriptor', () => {
    expect(migrateWeaponDamage({ attribute: 'Dexterity', descriptor: 'ask Ed' })).toMatchObject({
      descriptor: 'ask Ed', damageNeedsReview: true, isMelee: true, rangeNeedsReview: true,
    })
  })

  it('never infers range from Dexterity or Agility', () => {
    expect(migrateLegacyRange({ attribute: 'Dexterity', descriptor: 'concealable' }))
      .toEqual({ isMelee: true, rangeNeedsReview: true })
    expect(migrateLegacyRange({ attribute: 'Agility', descriptor: 'Dmg = 20' }))
      .toEqual({ isMelee: true, rangeNeedsReview: true })
  })

  it('accepts only explicit ranged/thrown legacy wording without review', () => {
    expect(migrateLegacyRange({ descriptor: '1d6, ranged' }))
      .toEqual({ isMelee: false, rangeNeedsReview: false })
    expect(migrateLegacyRange({ descriptor: '1d6, thrown' }))
      .toEqual({ isMelee: false, rangeNeedsReview: false })
  })

  it('never overwrites explicit structured fields', () => {
    const weapon = {
      descriptor: 'old text', damageDice: '1d10', damageBonus: 2,
      damageType: 'fire', isMelee: false, rangeNeedsReview: false,
    }
    expect(migrateWeaponDamage(weapon)).toMatchObject(weapon)
  })

  it('completes a partially structured weapon without overwriting corrections', () => {
    expect(migrateWeaponDamage({
      descriptor: '1d6, thrown', damageType: 'slashing', isMelee: false,
    })).toMatchObject({
      damageDice: '1d6', damageBonus: 0, damageType: 'slashing',
      descriptor: 'thrown', isMelee: false, rangeNeedsReview: false,
      damageNeedsReview: false,
    })
  })

  it('migrates missing range independently of structured damage', () => {
    expect(migrateWeaponDamage({
      descriptor: '1d6, ranged', damageDice: '1d6', damageBonus: 0, damageType: 'piercing',
    })).toMatchObject({ isMelee: false, rangeNeedsReview: false })
  })

  it('normalizes every weapon when a legacy character is loaded', () => {
    const character = migrateCharacterWeaponDamage({
      name: 'Hero', weapons: [
        { attribute: 'strength', descriptor: 'base dmg 8' },
        { attribute: 'dexterity', descriptor: 'unknown format' },
      ],
    })
    expect(character.weapons[0]).toMatchObject({ damageBonus: 8, damageNeedsReview: false })
    expect(character.weapons[1]).toMatchObject({ descriptor: 'unknown format', damageNeedsReview: true })
  })
})

describe('weaponStructureIssues', () => {
  it('reports missing damage, missing type, and invalid dice without guessing', () => {
    expect(weaponStructureIssues({ damageDice: '', damageBonus: 0, damageType: '' }))
      .toEqual(['Damage amount missing'])
    expect(weaponStructureIssues({ damageDice: '', damageBonus: 8, damageType: '' }))
      .toEqual(['Damage type missing'])
    expect(weaponStructureIssues({ damageDice: 'd8', damageBonus: 0, damageType: 'slashing' }))
      .toEqual(['Invalid damage dice'])
  })

  it('returns no issues for complete dice or flat damage', () => {
    expect(weaponStructureIssues({ damageDice: '1d8', damageBonus: 0, damageType: 'slashing' })).toEqual([])
    expect(weaponStructureIssues({ damageDice: '', damageBonus: 8, damageType: 'blunt' })).toEqual([])
  })
})

describe('weaponDamageLabel', () => {
  it('formats dice, signed bonus, and type', () => {
    expect(weaponDamageLabel({ damageDice: '1d8', damageBonus: 2, damageType: 'slashing' }))
      .toBe('1d8 + 2 slashing')
  })
})
