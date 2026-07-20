import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Step4Combat from './Step4Combat.jsx'
import { createDefaultCharacter } from '../../utils/defaultCharacter.js'

const character = (weapon) => ({
  ...createDefaultCharacter(),
  weapons: [weapon],
})

describe('Step4Combat structured weapon damage', () => {
  it('renders dice, flat bonus, type, melee, and flavor fields', () => {
    const html = renderToStaticMarkup(<Step4Combat character={character({
      id: 'w1', name: 'Sword', attribute: 'Strength', attributeBonus: 15,
      skillBonus: 0, usesSkill: false, damageDice: '1d8', damageBonus: 2,
      damageType: 'slashing', isMelee: true, damageNeedsReview: false, descriptor: 'silvered',
      rangeNeedsReview: false,
    })} onUpdate={() => {}} />)
    for (const label of ['Damage dice for Sword', 'Flat damage bonus for Sword', 'Damage type for Sword', 'Sword is a melee weapon', 'Weapon notes for Sword']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('value="1d8"')
    expect(html).toContain('value="slashing"')
  })

  it('requires explicit confirmation when legacy range was ambiguous', () => {
    const html = renderToStaticMarkup(<Step4Combat character={character({
      id: 'w1', name: 'Dagger', attribute: 'Dexterity', attributeBonus: 10,
      skillBonus: 0, usesSkill: false, damageDice: '1d4', damageBonus: 0,
      damageType: 'piercing', isMelee: true, rangeNeedsReview: true,
      damageNeedsReview: false, descriptor: 'concealable',
    })} onUpdate={() => {}} />)
    expect(html).toContain('Melee/ranged needs review')
    expect(html).toContain('Confirm melee')
  })

  it('surfaces incomplete structured damage even when legacy review is false', () => {
    const html = renderToStaticMarkup(<Step4Combat character={character({
      id: 'w1', name: 'Pistol', attribute: 'Agility', attributeBonus: 10,
      skillBonus: 0, usesSkill: false, damageDice: '', damageBonus: 20,
      damageType: '', isMelee: false, rangeNeedsReview: false,
      damageNeedsReview: false, descriptor: '',
    })} onUpdate={() => {}} />)
    expect(html).toContain('Damage type missing')
  })

  it('surfaces an unrecognized legacy descriptor for explicit review', () => {
    const html = renderToStaticMarkup(<Step4Combat character={character({
      id: 'w1', name: 'Oddity', attribute: 'Dexterity', attributeBonus: 10,
      skillBonus: 0, usesSkill: false, damageDice: '', damageBonus: 0,
      damageType: '', isMelee: false, damageNeedsReview: true, descriptor: 'ask the GM',
    })} onUpdate={() => {}} />)
    expect(html).toContain('Legacy damage needs review')
    expect(html).toContain('ask the GM')
    expect(html).toContain('Notes only')
  })
})
