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
  const type = DAMAGE_TYPES.find(candidate => (
    lower === candidate || new RegExp(`^${candidate}(?:[\\s,;:-]|$)`).test(lower)
  ))
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

// Range cannot be inferred from the governing attack attribute: a dagger may
// use Dexterity and still be melee, while a pistol may use Agility and be
// ranged. Only explicit legacy wording is safe to migrate automatically.
export function migrateLegacyRange(weapon) {
  const descriptor = String(weapon?.descriptor || '').toLowerCase()
  if (/\b(ranged|thrown)\b/.test(descriptor)) {
    return { isMelee: false, rangeNeedsReview: false }
  }
  return { isMelee: true, rangeNeedsReview: true }
}

export function migrateWeaponDamage(weapon) {
  if (!weapon || typeof weapon !== 'object') return weapon
  const hasOwn = key => Object.prototype.hasOwnProperty.call(weapon, key)
  const parsed = parseLegacyDamageDescriptor(weapon.descriptor)
  const missingAmount = !hasOwn('damageDice') && !hasOwn('damageBonus')
  const missingType = !hasOwn('damageType')
  const migrated = { ...weapon }

  if (missingAmount) {
    migrated.damageDice = parsed?.damageDice || ''
    migrated.damageBonus = parsed?.damageBonus || 0
  }
  if (missingType) migrated.damageType = parsed?.damageType || ''
  if (parsed && (missingAmount || missingType)) migrated.descriptor = parsed.descriptor

  if (!hasOwn('damageNeedsReview')) {
    migrated.damageNeedsReview = Boolean(
      (weapon.descriptor || '').trim()
      && !parsed
      && weaponStructureIssues(migrated).length,
    )
  }

  if (!hasOwn('isMelee')) Object.assign(migrated, migrateLegacyRange(weapon))
  else if (!hasOwn('rangeNeedsReview')) migrated.rangeNeedsReview = false

  return migrated
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

// Derived completeness audit for both migrated and newly edited weapons. These
// issues do not guess values; they tell the owner exactly what still needs an
// explicit decision.
export function weaponStructureIssues(weapon) {
  const issues = []
  const diceText = weapon?.damageDice || ''
  const dice = parseDamageDice(diceText)
  const bonus = Number(weapon?.damageBonus) || 0
  if (diceText && !dice) issues.push('Invalid damage dice')
  if (!diceText && !bonus) issues.push('Damage amount missing')
  if ((dice || bonus) && !String(weapon?.damageType || '').trim()) issues.push('Damage type missing')
  return issues
}
