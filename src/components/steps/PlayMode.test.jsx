import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PlayMode from './PlayMode.jsx'

const D = () => ({ skillBonus: 0, misc: 0 })
const noop = () => {}

const base = (extra = {}) => ({
  name: 'Dulu Breac', race: 'Human', archetype: 'Druid', level: 2,
  hasMagic: true, hasPowers: true,
  attributes: Object.fromEntries(
    ['strength', 'agility', 'dexterity', 'endurance', 'constitution', 'intelligence',
      'wisdom', 'thaumaturgy', 'enlightenment', 'charisma', 'comeliness', 'fame']
      .map((a, i) => [a, { base: 8 + i }])
  ),
  hitPoints: { total: 24, current: 24 }, mana: { total: 18, current: 18 },
  storyPoints: { total: 3, current: 3 }, armor: { type: 'leather', absorption: 2, remaining: 6, max: 6 },
  defense: { typical: D(), prone: D(), magic: D(), psychic: D(), other: { base: 0, skillBonus: 0, misc: 0 } },
  weapons: [{ id: 1, name: 'Quarterstaff', attribute: 'strength', attributeBonus: 3, skillBonus: 2, descriptor: '1d6 blunt' }],
  skills: [{ id: 1, name: 'Herbalism', attributeName: 'wisdom', attributeScore: 14, skillPoints: 5, isSpecialty: true }],
  powers: [{ id: 1, name: 'Beast Sense', base: 2, attributeBonus: 3, description: 'commune with animals' }],
  crafts: [{ id: 1, name: 'Entangle', attributeName: 'wisdom', attributeValue: 14, skillBonus: 3, description: 'roots grasp foes' }],
  inventory: [{ name: 'Healing draught', quantity: 3, notes: 'restores 1d8' }, 'Tinderbox'],
  ...extra,
})

const render = (char) =>
  renderToStaticMarkup(<PlayMode character={char} onUpdate={noop} onExit={noop} onToggleNotes={noop} />)

describe('PlayMode', () => {
  it('shows all the sections a GM needs to run the table', () => {
    const html = render(base())
    for (const s of ['Attributes', 'Defense', 'Weapons', 'Skills', 'Powers', 'Magic Crafts', 'Inventory']) {
      expect(html).toContain(s)
    }
    expect(html).toContain('STR')
    expect(html).toContain('FAM')
    expect(html).toContain('Beast Sense')
    expect(html).toContain('Entangle')
    expect(html).toContain('Healing draught')
    expect(html).toContain('×3')
    expect(html).toContain('Tinderbox')
  })

  it('hides caster-only and empty sections appropriately', () => {
    const html = render(base({ hasMagic: false, hasPowers: false, inventory: [] }))
    expect(html).not.toContain('Magic Crafts')
    expect(html).not.toContain('Powers')
    expect(html).not.toContain('Inventory')
    // Attributes and Defense are always present.
    expect(html).toContain('Attributes')
    expect(html).toContain('Defense')
  })
})
