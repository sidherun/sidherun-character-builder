import { describe, it, expect } from 'vitest'
import { migrateCharacterWeaponDamage, migrateWeaponDamage, parseDamageDice, parseLegacyDamageDescriptor, weaponDamageLabel } from './weaponDamage.js'

describe('parseDamageDice', () => {
  it('accepts bounded NdS notation', () => {
    expect(parseDamageDice('2d8')).toEqual({ count: 2, sides: 8, notation: '2d8' })
    expect(parseDamageDice('nope')).toBeNull()
  })
})

describe('legacy weapon damage migration', () => {
  it.each([
    ['1d8 slashing', { damageDice: '1d8', damageBonus: 0, damageType: 'slashing', descriptor: '' }],
    ['Dmg = 8', { damageDice: '', damageBonus: 8, damageType: '', descriptor: '' }],
    ['base dmg 8', { damageDice: '', damageBonus: 8, damageType: '', descriptor: '' }],
    ['metal tip (6)', { damageDice: '', damageBonus: 6, damageType: '', descriptor: 'metal tip' }],
  ])('parses %s without guessing', (input, expected) => {
    expect(parseLegacyDamageDescriptor(input)).toEqual(expected)
  })

  it('preserves and flags an unrecognized descriptor', () => {
    expect(migrateWeaponDamage({ attribute: 'Dexterity', descriptor: 'ask Ed' })).toMatchObject({
      descriptor: 'ask Ed', damageNeedsReview: true, isMelee: false,
    })
  })

  it('never overwrites explicit structured fields', () => {
    const weapon = { descriptor: 'old text', damageDice: '1d10', damageBonus: 2 }
    expect(migrateWeaponDamage(weapon)).toBe(weapon)
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

describe('weaponDamageLabel', () => {
  it('formats dice, signed bonus, and type', () => {
    expect(weaponDamageLabel({ damageDice: '1d8', damageBonus: 2, damageType: 'slashing' }))
      .toBe('1d8 + 2 slashing')
  })
})
