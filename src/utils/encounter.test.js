import { describe, it, expect } from 'vitest'
import {
  startEncounter, addNpc, removeCombatant, setInitiative, rollInitiative,
  orderedCombatants, advanceTurn, adjustNpcHp, applyNpcDamage,
  loadEncounter, saveEncounter,
} from './encounter.js'

const pc = (id, name, agility) => ({
  _rosterId: id,
  name,
  attributes: { agility: { base: agility, racialMod: 1, tempMod: -1 } },
})

const npc = {
  id: 'npc:wraith', name: 'Shard-Wraith', maxHp: 75,
  defense: 80, armorSoak: 8, armorPool: 60,
}

describe('encounter model (#239)', () => {
  it('starts from roster characters and snapshots AGI initiative bonuses', () => {
    const encounter = startEncounter([pc('a', 'Ada', 12), pc('b', 'Bram', 9)])
    expect(encounter.active).toBe(true)
    expect(encounter.currentId).toBe('pc:a')
    expect(encounter.combatants).toMatchObject([
      { id: 'pc:a', type: 'pc', initiativeBonus: 12 },
      { id: 'pc:b', type: 'pc', initiativeBonus: 9 },
    ])
  })

  it('adds and removes a temporary NPC without roster fields', () => {
    const withNpc = addNpc(startEncounter([]), npc)
    expect(withNpc.combatants[0]).toMatchObject({
      id: 'npc:wraith', hp: 75, maxHp: 75, defense: 80,
      armorSoak: 8, armorPool: 60, armorMax: 60,
    })
    expect(removeCombatant(withNpc, 'npc:wraith').combatants).toEqual([])
  })

  it('rolls d10 + AGI, accepts manual initiative, sorts descending, and advances with wrap', () => {
    let encounter = startEncounter([pc('a', 'Ada', 12), pc('b', 'Bram', 9)])
    encounter = rollInitiative(encounter, 'pc:a', () => 0.99) // 10 + 12
    encounter = setInitiative(encounter, 'pc:b', 25)
    expect(orderedCombatants(encounter.combatants).map(c => c.id)).toEqual(['pc:b', 'pc:a'])
    encounter = { ...encounter, currentId: 'pc:b' }
    expect(advanceTurn(encounter).currentId).toBe('pc:a')
    expect(advanceTurn(advanceTurn(encounter)).currentId).toBe('pc:b')
  })

  it('tracks raw NPC HP adjustments and armor-aware incoming damage', () => {
    let encounter = addNpc(startEncounter([]), npc)
    encounter = adjustNpcHp(encounter, 'npc:wraith', -5)
    expect(encounter.combatants[0].hp).toBe(70)
    encounter = applyNpcDamage(encounter, 'npc:wraith', 13)
    expect(encounter.combatants[0]).toMatchObject({
      hp: 65,
      armorPool: 52,
      lastHit: { damage: 13, absorbed: 8, hpDamage: 5 },
    })
    encounter = applyNpcDamage(encounter, 'npc:wraith', 60)
    expect(encounter.combatants[0]).toMatchObject({ hp: 13, armorPool: 44 })
  })

  it('persists only active encounters in session storage', () => {
    const values = new Map()
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    }
    const encounter = addNpc(startEncounter([]), npc)
    saveEncounter(encounter, storage)
    expect(loadEncounter(storage)).toEqual(encounter)
    saveEncounter({ active: false, currentId: null, combatants: [] }, storage)
    expect(loadEncounter(storage).active).toBe(false)
  })
})
