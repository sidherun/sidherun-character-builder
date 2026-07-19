const DAMAGE_TYPES = [
  'slashing', 'piercing', 'blunt', 'cold', 'fire', 'acid', 'poison',
  'lightning', 'psychic', 'necrotic', 'radiant', 'force',
]

export function parseDamageDice(value) {
  const match = /^\s*(\d+)d(\d+)\s*$/i.exec(value || '')
  if (!match) return null
  const count = Number(match[1])
  const sides = Number(match[2])
  if (count < 1 || count > 20 || sides < 2 || sides > 1000) return null
  return { count, sides, notation: `${count}d${sides}` }
}

function splitType(text) {
  const trimmed = text.trim().replace(/^[,;:\s-]+|[,;:\s-]+$/g, '')
  if (!trimmed) return { damageType: '', descriptor: '' }
  const lower = trimmed.toLowerCase()
  const type = DAMAGE_TYPES.find(candidate => lower === candidate || lower.startsWith(`${candidate} `))
  if (!type) return { damageType: '', descriptor: trimmed }
  return {
    damageType: type,
    descriptor: trimmed.slice(type.length).replace(/^[,;:\s-]+/, ''),
  }
}

// Best-effort migration for the known roster formats. A null result is an
// explicit "needs review" signal; callers must preserve the original text.
export function parseLegacyDamageDescriptor(value) {
  const descriptor = (value || '').trim()
  if (!descriptor) return { damageDice: '', damageBonus: 0, damageType: '', descriptor: '' }

  const dice = /\b(\d+d\d+)(?:\s*([+-])\s*(\d+))?\b/i.exec(descriptor)
  if (dice && parseDamageDice(dice[1])) {
    const remainder = `${descriptor.slice(0, dice.index)} ${descriptor.slice(dice.index + dice[0].length)}`
    const split = splitType(remainder)
    return {
      damageDice: dice[1].toLowerCase(),
      damageBonus: dice[3] ? Number(dice[3]) * (dice[2] === '-' ? -1 : 1) : 0,
      ...split,
    }
  }

  const flat = /^(?:base\s+)?dmg\s*=?\s*(\d+)\s*$/i.exec(descriptor)
  if (flat) return { damageDice: '', damageBonus: Number(flat[1]), damageType: '', descriptor: '' }

  const parenthetical = /^(.*?)\s*\(\s*(\d+)\s*\)\s*$/.exec(descriptor)
  if (parenthetical) {
    return {
      damageDice: '', damageBonus: Number(parenthetical[2]), damageType: '',
      descriptor: parenthetical[1].trim(),
    }
  }

  return null
}

export function migrateWeaponDamage(weapon) {
  if (!weapon || typeof weapon !== 'object') return weapon
  const hasStructuredFields = [
    'damageDice', 'damageBonus', 'damageType', 'damageNeedsReview',
  ].some(key => weapon[key] !== undefined)
  if (hasStructuredFields) return weapon

  const parsed = parseLegacyDamageDescriptor(weapon.descriptor)
  const inferredMelee = String(weapon.attribute || '').toLowerCase() !== 'dexterity'
  if (!parsed) {
    return {
      ...weapon,
      damageDice: '', damageBonus: 0, damageType: '',
      damageNeedsReview: Boolean((weapon.descriptor || '').trim()),
      isMelee: inferredMelee,
    }
  }
  return { ...weapon, ...parsed, damageNeedsReview: false, isMelee: inferredMelee }
}

export function migrateCharacterWeaponDamage(character) {
  if (!character || !Array.isArray(character.weapons)) return character
  return { ...character, weapons: character.weapons.map(migrateWeaponDamage) }
}

export function weaponDamageLabel(weapon) {
  const normalized = migrateWeaponDamage(weapon)
  const dice = parseDamageDice(normalized?.damageDice)?.notation || ''
  const bonus = Number(normalized?.damageBonus) || 0
  const amount = dice
    ? `${dice}${bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}` : ''}`
    : bonus ? String(bonus) : ''
  const typed = [amount, normalized?.damageType].filter(Boolean).join(' ')
  if (typed) return typed
  return normalized?.damageNeedsReview ? 'Damage needs review' : 'No damage set'
}
