import { describe, it, expect, beforeEach } from 'vitest'
import LZString from 'lz-string'
import { encodeCharacterToPlayURL, encodeCharacterToURL, decodeCharacterFromURL, getPlayLinkId, encodeCloudLink, parseCloudLink, getURLRouteType } from './urlState.js'
import { safeParseCharacter } from './characterSchema.js'

const A = (b) => ({ base: b, racialMod: 0, tempMod: 0 })
const D = () => ({ skillBonus: 0, misc: 0 })

const character = () => ({
  wizardStep: 9, _rosterId: null,
  name: 'Tarben Jarlson', playerName: 'Ed', race: 'human', raceType: 'healthy', raceValue: 20, raceSize: 'medium',
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
    expect(d.playerName).toBe('Ed')
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
    expect(d.weapons[0]).toMatchObject({
      name: 'Sword', attribute: 'strength', attributeBonus: 20,
      damageBonus: 8, damageNeedsReview: false, descriptor: '',
    })
    expect(d.skills[0]).toMatchObject({ name: 'Dodge', attributeName: 'agility', attributeScore: 16, skillPoints: 10, isSpecialty: false, usePips: 3 })
    expect(d.powers[0]).toMatchObject({ name: 'Talk to Trees' })
    expect(d.crafts[0]).toMatchObject({ name: 'Divinity', attributeName: 'enlightenment', attributeValue: 20 })
    expect(d.inventory[0]).toMatchObject({ name: 'Potion', quantity: 2, notes: 'heals' })
    expect(d.inventory[1]).toBe('Rope')
    expect(d.backstory).toBe(c.backstory)
    expect(d._notes).toEqual(c._notes)
  })

  it('produces a much smaller payload than full JSON (keeps the QR scannable)', () => {
    const c = character()
    const playLen = encodeCharacterToPlayURL(c).length
    const shareLen = encodeCharacterToURL(c).length
    expect(playLen).toBeLessThan(shareLen * 0.6)
  })

  it('carries the weapon usesSkill flag through the play URL (skilled weapon with a 0 skill)', () => {
    const c = character()
    // The exact case the flag exists for: skilled but skill total is 0. A
    // skill-inferring codec would decode this as attribute-based (wrong).
    c.weapons = [{ id: 'w-s', name: 'Trained Fist', attribute: 'agility', attributeBonus: 12, skillBonus: 0, usesSkill: true, descriptor: '' }]
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const d = decodeCharacterFromURL()
    expect(d.weapons[0]).toMatchObject({ name: 'Trained Fist', usesSkill: true })
  })

  it('carries structured weapon damage through the compact play URL', () => {
    const c = character()
    c.weapons = [{
      id: 'w-d', name: 'Longbow', attribute: 'dexterity', attributeBonus: 12, skillBonus: 8,
      usesSkill: true, damageDice: '1d8', damageBonus: 2, damageType: 'piercing',
      isMelee: false, damageNeedsReview: false, rangeNeedsReview: true, descriptor: 'silvered',
    }]
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    expect(decodeCharacterFromURL().weapons[0]).toMatchObject({
      damageDice: '1d8', damageBonus: 2, damageType: 'piercing', isMelee: false,
      rangeNeedsReview: true, descriptor: 'silvered',
    })
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

function openCompact(array) {
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(array))
  window.location.hash = '#play=' + encoded
  return decodeCharacterFromURL()
}

// ~4,955 characters, the length of Tarben Jarlson's restored backstory, with a
// unique tail so a truncated payload cannot pass.
function longBackstory() {
  const sentence = 'Tarben Jarlson kept the north road past Kaelorun, speaking with Æsir traders at the café in 北風. '
  let text = ''
  let i = 0
  while (text.length < 4900) {
    text += sentence.replace('Tarben', `Tarben#${i}`)
    i++
  }
  const tail = '— final line: the gate holds. 🗡️'
  return text.slice(0, 4955 - tail.length) + tail
}

describe('play URL backstory and session notes', () => {
  it('round-trips a long backstory and several notes, including unicode', () => {
    const backstory = longBackstory()
    const notes = [
      { id: 'n-watch', title: 'Watch the 北 gate', body: 'Left open — Æsir riders.', lastEdited: '2026-06-14T12:00:00.000Z' },
      { id: 'n-oath', title: 'Oath', body: 'Do not break bread with the jarl’s rivals.\nSecond line.', lastEdited: '2026-06-15T08:00:00.000Z' },
      { id: 'n-mark', title: '🗡️', body: 'Café password is 北風.', lastEdited: '' },
    ]
    const c = character()
    c.backstory = backstory
    c._notes = notes
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const d = decodeCharacterFromURL()
    expect(safeParseCharacter(d).success).toBe(true)
    expect(d.backstory).toBe(backstory)
    expect(d.backstory).toHaveLength(4955)
    expect(d.backstory.endsWith('🗡️')).toBe(true)
    expect(d._notes).toEqual(notes)
    expect(d.name).toBe('Tarben Jarlson')
    expect(d.playerName).toBe('Ed')

    // Text with almost no repetition still round-trips whole. It is not cut
    // down when it no longer fits in one QR (the sheet reports that instead).
    let x = 123456789
    let packed = ''
    while (packed.length < 4930) {
      x = (1103515245 * x + 12345) & 0x7fffffff
      packed += String.fromCharCode(65 + (x % 26))
      if (packed.length % 48 === 0) packed += ' Æsir 北風 '
    }
    packed += 'ENDMARK 🗡️'
    c.backstory = packed
    const packedUrl = encodeCharacterToPlayURL(c)
    window.location.hash = packedUrl.slice(packedUrl.indexOf('#'))
    expect(decodeCharacterFromURL().backstory).toBe(packed)
  })

  it('round-trips notes when the backstory is empty', () => {
    const c = character()
    c.backstory = ''
    c._notes = [{ id: 'n-only', title: '', body: 'Body only — 北風', lastEdited: '2026-01-02' }]
    const url = encodeCharacterToPlayURL(c)
    window.location.hash = url.slice(url.indexOf('#'))
    const d = decodeCharacterFromURL()
    expect(d.backstory).toBe('')
    expect(d._notes).toEqual(c._notes)
  })

  it('omits an empty history so older payloads stay the same length', () => {
    const c = character()
    c.backstory = ''
    c._notes = []
    const url = encodeCharacterToPlayURL(c)
    const encoded = url.slice(url.indexOf('#play=') + '#play='.length)
    const arr = JSON.parse(LZString.decompressFromEncodedURIComponent(encoded))
    expect(arr).toHaveLength(17)
    expect(arr[16]).toBe('Ed')
  })

  it('decodes a pre-history play link with empty backstory and notes', () => {
    // Positional layout minted before backstory/notes were appended.
    // playerName is last. An even older link stops before that slot.
    const withPlayer = [
      'Legacy Hero', 'human', 'warrior', 2, 0, 0,
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 8],
      [['Axe', 'strength', 10, 2, '']],
      ['leather', 2, 10, 10],
      'none',
      [[1, 0], [0, 0], [0, 0], [0, 0], [0, 0, 0]],
      [], [], [], [],
      [30, 28, 0, 0, 2, 2, 100, 1000],
      'Max',
    ]
    const current = openCompact(withPlayer)
    expect(safeParseCharacter(current).success).toBe(true)
    expect(current.name).toBe('Legacy Hero')
    expect(current.playerName).toBe('Max')
    expect(current.hitPoints).toEqual({ total: 30, current: 28 })
    expect(current.weapons[0].name).toBe('Axe')
    expect(current.backstory).toBe('')
    expect(current._notes).toEqual([])

    const oldest = openCompact(withPlayer.slice(0, 16))
    expect(safeParseCharacter(oldest).success).toBe(true)
    expect(oldest.name).toBe('Legacy Hero')
    expect(oldest.playerName).toBe('')
    expect(oldest.backstory).toBe('')
    expect(oldest._notes).toEqual([])
    expect(oldest.hitPoints).toEqual({ total: 30, current: 28 })
  })
})

describe('cloud link', () => {
  const ID = 'fa2d17b4-18a5-4a84-8900-c7e04d5a50de'
  const TOKEN = 'dpL6DXJU65f8CSIXCGew0RV3DF2POAk2ZkYFvDbTiRo' // base64url, no '~'

  it('round-trips id + token and routes as cloud', () => {
    const url = encodeCloudLink(ID, TOKEN)
    window.location.hash = url.slice(url.indexOf('#'))
    expect(getURLRouteType()).toBe('cloud')
    expect(parseCloudLink()).toEqual({ id: ID, token: TOKEN })
  })

  it('parseCloudLink returns null off a cloud link', () => {
    window.location.hash = '#play=xyz'
    expect(parseCloudLink()).toBeNull()
  })

  it('does not collide with legacy decoders', () => {
    window.location.hash = `#c=${ID}~${TOKEN}`
    expect(decodeCharacterFromURL()).toBeNull() // embedded decoder ignores #c=
  })
})
