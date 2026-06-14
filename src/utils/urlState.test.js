import { describe, it, expect, beforeEach } from 'vitest'
import { encodeCharacterToPlayURL, encodeCharacterToURL, decodeCharacterFromURL, getPlayLinkId } from './urlState.js'
import { safeParseCharacter } from './characterSchema.js'

const A = (b) => ({ base: b, racialMod: 0, tempMod: 0 })
const D = () => ({ skillBonus: 0, misc: 0 })

const character = () => ({
  wizardStep: 9, _rosterId: null,
  name: 'Tarben Jarlson', race: 'human', raceType: 'healthy', raceValue: 20, raceSize: 'medium',
  archetype: 'paladin', hasPowers: true, hasMagic: true, magicAttribute: 'enlightenment',
  level: 3, ageCategory: 'adult', backstory: 'Long backstory '.repeat(20),
  attributes: Object.fromEntries(
    ['strength','agility','dexterity','endurance','constitution','intelligence','wisdom','thaumaturgy','enlightenment','charisma','comeliness','fame']
      .map((k, i) => [k, A(20 - i)])),
  weapons: [{ id: 'w-x', name: 'Sword', attribute: 'strength', attributeBonus: 20, skillBonus: 0, descriptor: 'base dmg 8' }],
  armor: { type: 'plate', absorption: 8, remaining: 160, max: 160 }, shield: 'small',
  defense: { typical: { skillBonus: 0, misc: 10 }, prone: D(), magic: D(), psychic: D(), other: { base: 0, skillBonus: 0, misc: 0 } },
  powers: [{ id: 'p-x', name: 'Talk to Trees', base: 0, attributeBonus: 0, skillBonus: 0, misc: 0, description: 'commune' }],
  crafts: [{ id: 'c-x', name: 'Divinity', attributeName: 'enlightenment', attributeValue: 20, skillBonus: 0, misc: 0, description: 'Fortify' }],
  skills: [{ id: 's-x', name: 'Dodge', attributeName: 'agility', attributeScore: 16, skillPoints: 10, tempMod: 0, isSpecialty: false, usePips: 3 }],
  inventory: [{ name: 'Potion', quantity: 2, notes: 'heals' }, 'Rope'],
  hitPoints: { total: 70, current: 64 }, mana: { total: 20, current: 18 },
  storyPoints: { total: 3, current: 2 }, xp: { current: 3651, needed: 6001 },
  _notes: [{ id: 'n1', title: 't', body: 'b', lastEdited: '2026-06-14' }],
  _tracking: { hp: 0, mana: 0, storyPoints: 3 },
})

beforeEach(() => { window.location.hash = '' })

describe('play URL compact codec', () => {
  it('round-trips through the play URL and passes schema validation', () => {
    const c = character()
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const decoded = decodeCharacterFromURL()
    const result = safeParseCharacter(decoded)
    expect(result.success).toBe(true)
  })

  it('preserves the fields Play Mode and the printout need', () => {
    const c = character()
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const d = decodeCharacterFromURL()
    expect(d.name).toBe('Tarben Jarlson')
    expect(d.level).toBe(3)
    expect(d.hasMagic).toBe(true)
    expect(d.hasPowers).toBe(true)
    expect(d.magicAttribute).toBe('enlightenment')
    expect(d.attributes.strength.base).toBe(20)
    expect(d.attributes.fame.base).toBe(9)
    expect(d.hitPoints).toEqual({ total: 70, current: 64 })
    expect(d.mana).toEqual({ total: 20, current: 18 })
    expect(d.storyPoints).toEqual({ total: 3, current: 2 })
    expect(d.xp).toEqual({ current: 3651, needed: 6001 })
    expect(d.armor).toEqual({ type: 'plate', absorption: 8, remaining: 160, max: 160 })
    expect(d.shield).toBe('small')
    expect(d.defense.typical.misc).toBe(10)
    expect(d.weapons[0]).toMatchObject({ name: 'Sword', attribute: 'strength', attributeBonus: 20, descriptor: 'base dmg 8' })
    expect(d.skills[0]).toMatchObject({ name: 'Dodge', attributeName: 'agility', attributeScore: 16, skillPoints: 10, isSpecialty: false, usePips: 3 })
    expect(d.powers[0]).toMatchObject({ name: 'Talk to Trees' })
    expect(d.crafts[0]).toMatchObject({ name: 'Divinity', attributeName: 'enlightenment', attributeValue: 20 })
    expect(d.inventory[0]).toMatchObject({ name: 'Potion', quantity: 2, notes: 'heals' })
    expect(d.inventory[1]).toBe('Rope')
  })

  it('produces a much smaller payload than full JSON (keeps the QR scannable)', () => {
    const c = character()
    const playLen = encodeCharacterToPlayURL(c).length
    const shareLen = encodeCharacterToURL(c).length
    expect(playLen).toBeLessThan(shareLen * 0.6)
  })

  it('round-trips in-app (attributeType/powerBonus) power fields', () => {
    const c = character()
    c.powers = [{ id: 'p-new', name: 'Wild Shape', attributeType: 'wisdom', powerBonus: 5, description: 'become a beast' }]
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const d = decodeCharacterFromURL()
    expect(d.powers[0]).toMatchObject({ name: 'Wild Shape', attributeType: 'wisdom', powerBonus: 5 })
  })

  it('getPlayLinkId is stable for one play link and distinct across links', () => {
    const c = character()
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const id1 = getPlayLinkId()
    const id2 = getPlayLinkId()
    expect(id1).toBe(id2)
    expect(id1).toMatch(/^play-/)
    const other = character()
    other.name = 'Someone Else'
    const url2 = encodeCharacterToPlayURL(other)
    window.location.hash = url2.slice(url2.indexOf('#'))
    expect(getPlayLinkId()).not.toBe(id1)
  })

  it('returns null for getPlayLinkId off a play link', () => {
    window.location.hash = '#roster'
    expect(getPlayLinkId()).toBeNull()
  })

  it('still decodes full-object (#share=) payloads', () => {
    const c = character()
    const url = encodeCharacterToURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const d = decodeCharacterFromURL()
    expect(safeParseCharacter(d).success).toBe(true)
    expect(d.name).toBe('Tarben Jarlson')
  })
})
