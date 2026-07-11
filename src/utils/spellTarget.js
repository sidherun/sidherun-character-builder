// Spell Target engine — consumes the golden-pages matrix directly
// (rules/data/spell-matrix.json, PR #244) so the engine and the book
// physically can't drift. 20×20 grids indexed [casterLevel-1][targetLevel-1]:
// `base` (stat-0 values, authoritative) and `color_zones` (rules-bearing —
// the zone decides whether the attribute applies, per the 2026-07-09 ruling).
import matrix from '../../rules/data/spell-matrix.json'

const BASE = matrix.base.grid
const ZONES = matrix.color_zones.grid

function cell(grid, casterLevel, targetLevel) {
  const row = casterLevel - 1
  const col = targetLevel - 1
  if (row < 0 || row >= grid.length) return null
  if (col < 0 || col >= grid[0].length) return null
  return grid[row][col]
}

// Base spell target (before any attribute). Null if out of range.
export function getSpellTarget(casterLevel, targetLevel) {
  return cell(BASE, casterLevel, targetLevel)
}

// Matrix color zone: 'green' | 'yellow' | 'red'. Null if out of range.
export function getSpellZone(casterLevel, targetLevel) {
  return cell(ZONES, casterLevel, targetLevel)
}

// Spell Target = base (Spell Matrix: caster level vs target level) + the
// caster's relevant magic attribute, capped at 95 — EXCEPT red-zone cells,
// where the attribute is NOT added and the raw base is the target (ruled
// 2026-07-09, rules/FIDELITY-NOTES.md §1.2). Roll under the result to succeed.
export function getFinalSpellTarget(casterLevel, targetLevel, magicAttrValue) {
  const base = getSpellTarget(casterLevel, targetLevel)
  if (base === null) return null
  if (getSpellZone(casterLevel, targetLevel) === 'red') return base
  return Math.min(95, base + (magicAttrValue || 0))
}
