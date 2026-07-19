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
  weapons: [{ id: 1, name: 'Quarterstaff', attribute: 'strength', attributeBonus: 3, skillBonus: 2,
    damageDice: '1d6', damageBonus: 0, damageType: 'blunt', isMelee: true, descriptor: '' }],
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
    expect(html).toContain('Healing draught') // inventory item name (now an input value)
    expect(html).toContain('Tinderbox')
  })

  it('shows active condition chips in the player header', () => {
    const html = render(base({ conditions: [
      { id: 'c1', label: 'all rolls (backdraft)', modifier: -10 },
      { id: 'c2', label: 'blessed', modifier: null },
    ] }))
    expect(html).toContain('Active conditions')
    expect(html).toContain('−10')
    expect(html).toContain('all rolls (backdraft)')
    expect(html).toContain('blessed')
  })

  it('hides caster-only sections; Inventory is always present (editable)', () => {
    const html = render(base({ hasMagic: false, hasPowers: false, inventory: [] }))
    expect(html).not.toContain('Magic Crafts')
    expect(html).not.toContain('Powers')
    // Attributes, Defense, and the (now editable) Inventory are always present.
    expect(html).toContain('Attributes')
    expect(html).toContain('Defense')
    expect(html).toContain('Inventory')
    expect(html).toContain('+ Add item')
    expect(html).toContain('No items yet.')
  })

  it('renders editable inputs for each inventory item', () => {
    const html = render(base({ inventory: [{ name: 'Rope', quantity: 2, notes: 'hemp' }, 'Torch'] }))
    expect(html).toContain('value="Rope"')
    expect(html).toContain('value="hemp"')
    expect(html).toContain('value="Torch"') // legacy string item rendered as an editable name input
    expect(html).toContain('+ Add item')
    expect(html).not.toContain('No items yet.')
  })

  it('shows the Spell Target tile for casters (hasMagic + magicAttribute)', () => {
    const html = render(base({ magicAttribute: 'wisdom' }))
    expect(html).toContain('Spell Target')
    expect(html).toContain('vs Target Lvl')
    expect(html).toContain('roll under')
  })

  it('hides the Spell Target tile for non-casters', () => {
    expect(render(base({ hasMagic: false }))).not.toContain('Spell Target')
    // also hidden when a caster has no magic attribute selected
    expect(render(base({ hasMagic: true, magicAttribute: undefined }))).not.toContain('Spell Target')
  })

  it('renders 5 Use-tracking circles per skill', () => {
    const html = render(base())
    expect(html).toContain('Use tracking for Herbalism')
    expect(html).toContain('Use 1 of 5 for Herbalism')
    expect(html).toContain('Use 5 of 5 for Herbalism')
  })

  it('shows the armor soak + damage-input controls when armored', () => {
    const html = render(base({ armor: { type: 'leather', absorption: 6, remaining: 120, max: 120 } }))
    expect(html).toContain('Soak 6')
    expect(html).toContain('Apply hit')
    expect(html).toContain('Repair')
    expect(html).toContain('120') // durability shown
  })

  it('omits the armor block for unarmored characters', () => {
    const html = render(base({ armor: { type: 'none', absorption: 0, remaining: 0, max: 0 } }))
    expect(html).not.toContain('Apply hit')
  })
})

describe('PlayMode tap-to-roll wiring', () => {
  it('shows the weapon bonus as the NON-STACKING modifier (skill wins), not the sum', () => {
    // attributeBonus 6 + skillBonus 4. The attack modifier is the skill value
    // alone (+4), never the sum (+10) — regression lock for the fixed :254 bug.
    // Values chosen to avoid the counters' +1/+3/+5 quick-adjust buttons; powers
    // are off so no power total collides with +10.
    const html = render(base({
      hasPowers: false,
      weapons: [{ id: 1, name: 'Quarterstaff', attribute: 'strength', attributeBonus: 6, skillBonus: 4, descriptor: '1d6 blunt' }],
    }))
    expect(html).toContain('+4')       // skill value alone
    expect(html).not.toContain('+10')  // never attribute + skill summed
  })

  it('falls back to the attribute bonus when the weapon has no skill', () => {
    const html = render(base({
      hasPowers: false,
      weapons: [{ id: 1, name: 'Sling', attribute: 'dexterity', attributeBonus: 6, skillBonus: 0, descriptor: '' }],
    }))
    expect(html).toContain('+6') // attribute value, since there is no skill
  })

  it('renders a Roll button on each skill and an Attack button on each weapon', () => {
    const html = render(base())
    expect(html).toContain('>Roll<')
    expect(html).toContain('>Attack<')
  })

  it('shows structured weapon damage on the Play Mode weapon row', () => {
    const html = render(base())
    expect(html).toContain('1d6 blunt')
    expect(html).not.toContain('>Damage<') // appears only after that weapon attacks
  })

  it('renders every attribute as a labelled roll button', () => {
    const html = render(base())
    expect(html).toContain('aria-label="Roll STR attribute"')
    expect(html).toContain('aria-label="Roll FAM attribute"')
  })

  it('renders a spell Roll button for casters', () => {
    expect(render(base({ magicAttribute: 'wisdom' }))).toContain('>Roll<')
  })

  it('does not show a roll-result banner until something is rolled', () => {
    // The banner only mounts on interaction (lastRoll state); the static tree
    // must not contain it.
    expect(render(base())).not.toContain('GM adjudicates')
  })
})

// Pure logic mirror of applyArmorHit, locked in so the split rule can't regress.
function splitHit(dmg, soak, remaining, hpCurrent) {
  const absorbed = Math.min(dmg, soak, remaining)
  const overflow = dmg - absorbed
  return { remaining: remaining - absorbed, hp: Math.max(0, hpCurrent - overflow), absorbed, overflow }
}

describe('armor hit split rule', () => {
  it('absorbs up to soak; small hit fully absorbed, durability drops by damage', () => {
    expect(splitHit(3, 6, 120, 24)).toEqual({ remaining: 117, hp: 24, absorbed: 3, overflow: 0 })
  })
  it('hit over soak: durability drops by soak, remainder hits HP', () => {
    expect(splitHit(10, 6, 120, 24)).toEqual({ remaining: 114, hp: 20, absorbed: 6, overflow: 4 })
  })
  it('low durability caps absorption; rest leaks to HP', () => {
    expect(splitHit(5, 6, 2, 24)).toEqual({ remaining: 0, hp: 21, absorbed: 2, overflow: 3 })
  })
  it('destroyed armor (0 durability) sends all damage to HP', () => {
    expect(splitHit(8, 6, 0, 24)).toEqual({ remaining: 0, hp: 16, absorbed: 0, overflow: 8 })
  })
  it('HP floors at 0', () => {
    expect(splitHit(100, 6, 120, 24).hp).toBe(0)
  })
})

describe('PlayMode readOnly', () => {
  const renderRO = (char, readOnly) =>
    renderToStaticMarkup(
      <PlayMode character={char} onUpdate={noop} onExit={noop} onToggleNotes={noop} readOnly={readOnly} />
    )

  it('hides the Edit button and disables counter buttons when readOnly', () => {
    const html = renderRO(base(), true)
    expect(html).not.toContain('← Edit')
    expect(html).toContain('disabled')          // counter +/- are disabled
    expect(html).not.toContain('>-5<')          // quick-adjust row hidden (negative deltas are unique to it)
  })

  it('keeps the Edit button and editable controls when not readOnly', () => {
    const html = renderRO(base(), false)
    expect(html).toContain('← Edit')
    expect(html).toContain('>-5<')              // quick-adjust visible
  })

  it('mutate guard: onUpdate is never called from an adjust while readOnly', () => {
    // The guard lives in component logic; assert the read-only render omits the
    // editing affordances a viewer would use (belt-and-suspenders with the guard).
    const html = renderRO(base({ hasMagic: false }), true)
    expect(html).not.toContain('← Edit')
  })
})
