import { describe, it, expect } from 'vitest'
import { generateCharacterHTML, generateBatchHTML } from './generateCharacterHTML.js'

const mk = (name, extra = {}) => ({
  name, race: 'Human', archetype: 'Druid', level: 2, hasMagic: true, hasPowers: true,
  attributes: {
    strength: { base: 10 }, agility: { base: 12 }, dexterity: { base: 11 }, endurance: { base: 9 },
    constitution: { base: 10 }, intelligence: { base: 13 }, wisdom: { base: 14 }, thaumaturgy: { base: 8 },
    enlightenment: { base: 12 }, charisma: { base: 10 }, comeliness: { base: 9 }, fame: { base: 5 },
  },
  hitPoints: { total: 24, current: 24 }, mana: { total: 18, current: 18 }, storyPoints: { total: 3, current: 3 },
  xp: { current: 1500 }, armor: { type: 'leather', absorption: 2, remaining: 6, max: 6 },
  defense: {
    typical: { skillBonus: 0, misc: 0 }, prone: { skillBonus: 0, misc: 0 },
    magic: { skillBonus: 0, misc: 0 }, psychic: { skillBonus: 0, misc: 0 },
    other: { base: 0, skillBonus: 0, misc: 0 },
  },
  weapons: [{ id: 1, name: 'Quarterstaff', attribute: 'strength', attributeBonus: 3, skillBonus: 2, descriptor: '1d6 blunt' }],
  skills: [{ id: 1, name: 'Herbalism', attributeName: 'wisdom', attributeScore: 14, skillPoints: 5, isSpecialty: true }],
  powers: [{ id: 1, name: 'Beast Sense', base: 2, attributeBonus: 3, description: 'commune with animals' }],
  crafts: [{ id: 1, name: 'Entangle', attributeName: 'wisdom', attributeValue: 14, skillBonus: 3, description: 'roots grasp foes' }],
  backstory: 'Raised in the deep wood. Speaks for the trees & beasts <of the glen>.',
  ...extra,
})

describe('generateCharacterHTML', () => {
  it('includes every table-play section', () => {
    const html = generateCharacterHTML(mk('Dulu Breac'))
    for (const section of ['Attributes', 'Defense', 'Weapons', 'Skills', 'Powers', 'Magic Crafts', 'Backstory']) {
      expect(html).toContain(`<h2>${section}</h2>`)
    }
  })

  it('renders inventory when present and accepts strings or objects', () => {
    const html = generateCharacterHTML(mk('Dulu Breac', {
      inventory: [{ name: 'Healing draught', quantity: 3, notes: 'restores 1d8' }, 'Tinderbox'],
    }))
    expect(html).toContain('<h2>Inventory</h2>')
    expect(html).toContain('Healing draught')
    expect(html).toContain('×3')
    expect(html).toContain('Tinderbox')
  })

  it('does not render a bare "×" for an item without a quantity (schema defaults quantity to "")', () => {
    const html = generateCharacterHTML(mk('Dulu', {
      inventory: [{ name: 'Cloak' }, { name: 'Cloak2', quantity: '' }],
    }))
    expect(html).toContain('Cloak')
    expect(html).not.toContain('×')
  })

  it('omits the inventory section when there are no items', () => {
    const html = generateCharacterHTML(mk('Aerin', { inventory: [] }))
    expect(html).not.toContain('<h2>Inventory</h2>')
  })

  it('escapes user text so markup cannot break the sheet', () => {
    const html = generateCharacterHTML(mk('Dulu'))
    expect(html).toContain('&lt;of the glen&gt;')
    expect(html).not.toContain('<of the glen>')
  })

  it('hides mana/crafts for non-casters', () => {
    const html = generateCharacterHTML(mk('Aerin', { hasMagic: false }))
    expect(html).not.toContain('<h2>Magic Crafts</h2>')
  })
})

describe('generateBatchHTML', () => {
  it('stacks every character with a page break and a print toolbar', () => {
    const html = generateBatchHTML([mk('A'), mk('B'), mk('C')])
    expect((html.match(/class="sheet"/g) || []).length).toBe(3)
    expect(html).toContain('Print all 3 sheets')
    expect(html).toContain('page-break-after: always')
  })

  it('handles an empty roster without throwing', () => {
    expect(() => generateBatchHTML([])).not.toThrow()
  })
})
