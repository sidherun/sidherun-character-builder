const STORAGE_KEY = 'sidherun_encounter_v1'

export function emptyEncounter() {
  return { active: false, currentId: null, combatants: [] }
}

const attributeTotal = (attribute = {}) =>
  (attribute.base || 0) + (attribute.racialMod || 0) + (attribute.tempMod || 0)

export function startEncounter(characters) {
  const combatants = characters
    .filter(c => c?._rosterId)
    .map(c => ({
      id: `pc:${c._rosterId}`,
      type: 'pc',
      rosterId: c._rosterId,
      name: c.name || 'Unnamed',
      initiative: null,
      initiativeBonus: attributeTotal(c.attributes?.agility),
    }))
  return { active: true, currentId: combatants[0]?.id || null, combatants }
}

export function addNpc(encounter, npc) {
  const maxHp = Math.max(0, Math.floor(Number(npc.maxHp) || 0))
  const armorPool = Math.max(0, Math.floor(Number(npc.armorPool) || 0))
  const combatant = {
    id: npc.id,
    type: 'npc',
    name: npc.name.trim(),
    initiative: null,
    initiativeBonus: 0,
    hp: maxHp,
    maxHp,
    defense: Math.max(0, Math.floor(Number(npc.defense) || 0)),
    armorSoak: Math.max(0, Math.floor(Number(npc.armorSoak) || 0)),
    armorPool,
    armorMax: armorPool,
    lastHit: null,
  }
  return {
    ...encounter,
    currentId: encounter.currentId || combatant.id,
    combatants: [...encounter.combatants, combatant],
  }
}

export function removeCombatant(encounter, id) {
  const combatants = encounter.combatants.filter(c => c.id !== id)
  return {
    ...encounter,
    currentId: encounter.currentId === id ? (orderedCombatants(combatants)[0]?.id || null) : encounter.currentId,
    combatants,
  }
}

export function setInitiative(encounter, id, value) {
  const parsed = value === '' || value == null ? null : Math.floor(Number(value))
  return {
    ...encounter,
    combatants: encounter.combatants.map(c => c.id === id
      ? { ...c, initiative: Number.isFinite(parsed) ? parsed : null }
      : c),
  }
}

export function rollInitiative(encounter, id, rng = Math.random) {
  const combatant = encounter.combatants.find(c => c.id === id)
  if (!combatant) return encounter
  const roll = Math.floor(rng() * 10) + 1
  return setInitiative(encounter, id, roll + (combatant.initiativeBonus || 0))
}

export function orderedCombatants(combatants) {
  return [...combatants].sort((a, b) => {
    if (a.initiative == null && b.initiative != null) return 1
    if (a.initiative != null && b.initiative == null) return -1
    if (a.initiative !== b.initiative) return (b.initiative || 0) - (a.initiative || 0)
    return a.name.localeCompare(b.name)
  })
}

export function advanceTurn(encounter) {
  const ordered = orderedCombatants(encounter.combatants)
  if (!ordered.length) return { ...encounter, currentId: null }
  const currentIndex = ordered.findIndex(c => c.id === encounter.currentId)
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % ordered.length
  return { ...encounter, currentId: ordered[nextIndex].id }
}

export function adjustNpcHp(encounter, id, delta) {
  return {
    ...encounter,
    combatants: encounter.combatants.map(c => {
      if (c.id !== id || c.type !== 'npc') return c
      return { ...c, hp: Math.max(0, Math.min(c.maxHp || Infinity, c.hp + delta)), lastHit: null }
    }),
  }
}

export function applyNpcDamage(encounter, id, amount) {
  const damage = Math.max(0, Math.floor(Number(amount) || 0))
  if (!damage) return encounter
  return {
    ...encounter,
    combatants: encounter.combatants.map(c => {
      if (c.id !== id || c.type !== 'npc') return c
      const absorbed = Math.min(damage, c.armorSoak || 0, c.armorPool || 0)
      const hpDamage = damage - absorbed
      return {
        ...c,
        hp: Math.max(0, c.hp - hpDamage),
        armorPool: Math.max(0, c.armorPool - absorbed),
        lastHit: { damage, absorbed, hpDamage },
      }
    }),
  }
}

export function loadEncounter(storage = globalThis.sessionStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY))
    return parsed?.active && Array.isArray(parsed.combatants) ? parsed : emptyEncounter()
  } catch {
    return emptyEncounter()
  }
}

export function saveEncounter(encounter, storage = globalThis.sessionStorage) {
  try {
    if (encounter.active) storage?.setItem(STORAGE_KEY, JSON.stringify(encounter))
    else storage?.removeItem(STORAGE_KEY)
  } catch { /* session persistence is best-effort */ }
}
