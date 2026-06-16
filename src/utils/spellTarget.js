import data from '../data/spellTarget.json'

// Returns base spell target (before adding magical attribute). Returns null if out of range.
export function getSpellTarget(casterLevel, targetLevel) {
  const row = casterLevel - 1
  const col = targetLevel - 1
  if (row < 0 || row >= data.table.length) return null
  if (col < 0 || col >= data.table[0].length) return null
  return data.table[row][col]
}

// Spell Target = base (Spell Matrix: caster level vs target level) + the
// caster's relevant magic attribute, capped at 95 (PHB 2.8.2026). The attribute
// is always added — there is no "red-zone" suppression in the rules. Roll under
// the result to succeed.
export function getFinalSpellTarget(casterLevel, targetLevel, magicAttrValue) {
  const base = getSpellTarget(casterLevel, targetLevel)
  if (base === null) return null
  return Math.min(95, base + (magicAttrValue || 0))
}
