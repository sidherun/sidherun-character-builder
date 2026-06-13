import data from '../data/spellTarget.json'

// Returns base spell target (before adding magical attribute). Returns null if out of range.
export function getSpellTarget(casterLevel, targetLevel) {
  const row = casterLevel - 1
  const col = targetLevel - 1
  if (row < 0 || row >= data.table.length) return null
  if (col < 0 || col >= data.table[0].length) return null
  return data.table[row][col]
}

// Returns final target (base + attribute), capped at 95
export function getFinalSpellTarget(casterLevel, targetLevel, magicAttrValue) {
  const base = getSpellTarget(casterLevel, targetLevel)
  if (base === null) return null
  // Red zone: attribute not added when base is very low (below 25 threshold is "red")
  if (base < 25) return base
  return Math.min(95, base + (magicAttrValue || 0))
}
