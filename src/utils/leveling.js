import xpTable from '../data/xpTable.json'
import { poolSize } from './skillPoints.js'

// Leveling engine (#134). Sidherun level-up is deliberately light: the only
// formula-driven change is the SKILL-POINT pool growing (PHB pp.14-15). HP is
// static ("only raised by raising Attributes"), Mana is attribute-driven, and
// attributes/powers are GM/narrative freeform — all handled by the sheet's
// section editors, not here. The use-circles are a justification aid, so this
// flow leaves them untouched.

const MAX_LEVEL = 20

const rowFor = (level) => xpTable.find(r => r.level === level) || null

// XP at which a level begins (level 1 = 0). null past the table.
export function xpStartForLevel(level) {
  return rowFor(level)?.xpStart ?? null
}

// XP at which a level ends — reaching the next level's start makes you eligible.
export function xpEndForLevel(level) {
  return rowFor(level)?.xpEnd ?? null
}

const clampLevel = (level) => Math.max(1, Math.floor(level || 1))

// Eligible to level up once current XP reaches the next level's starting XP.
export function canLevelUp(character) {
  const level = clampLevel(character?.level)
  if (level >= MAX_LEVEL) return false
  const nextStart = xpStartForLevel(level + 1)
  return nextStart != null && (character?.xp?.current || 0) >= nextStart
}

// What a level-up grants — no mutation. addedPoints is the base pool growth.
export function levelUpPreview(character) {
  const from = clampLevel(character?.level)
  const atMax = from >= MAX_LEVEL
  const to = atMax ? from : from + 1
  const poolBefore = poolSize(from)
  const poolAfter = poolSize(to)
  return {
    from,
    to,
    atMax,
    addedPoints: poolAfter - poolBefore,
    poolBefore,
    poolAfter,
    xpToReach: xpStartForLevel(to),    // XP threshold to legitimately reach `to`
    xpNeeded: xpStartForLevel(to + 1), // threshold shown for the level after `to`
  }
}

// The patch to apply on level-up: bump level, snapshot the skill-point baseline
// at the new level (so the Skills editor can show "N added this level" against
// the per-level cap), and refresh the XP threshold. Leaves use-circles,
// attributes, and HP/Mana alone (raised freeform per the rulebook).
export function applyLevelUp(character) {
  const p = levelUpPreview(character)
  if (p.atMax) return {}
  const points = {}
  for (const s of character?.skills || []) points[s.id] = Number(s.skillPoints) || 0
  return {
    level: p.to,
    xp: { ...(character?.xp || {}), needed: p.xpNeeded ?? (character?.xp?.needed ?? null) },
    _levelBaseline: { level: p.to, points },
  }
}
