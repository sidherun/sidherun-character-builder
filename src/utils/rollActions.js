// Binds the dice core to the rules engine so nothing duplicates a formula.
// Skills and attacks roll-and-display a total (GM adjudicates verbally); spells
// self-resolve against the computed spell target.

import { calcSkillTotal, attrTotal } from './characterDerived.js'
import { getFinalSpellTarget } from './spellTarget.js'
import { rollTotal, resolveUnder } from './dice.js'

// Attack bonus is NON-STACKING: the weapon's skill value applies when the
// character has the relevant skill, otherwise the governing attribute value —
// never both (PHB: "they do not stack"). The explicit `weapon.usesSkill` flag
// decides which one applies, so a legitimate skill value of 0 can still win over
// the attribute. Legacy weapons saved before the flag existed fall back to the
// old "nonzero skillBonus means skilled" heuristic (the schema migrates stored
// data; this fallback covers any un-parsed object). Values are coerced with
// Number() so this works for both the schema's ints and the combat editor's
// string inputs; always returns a number.
export function weaponModifier(weapon) {
  if (!weapon) return 0
  const skill = Number(weapon.skillBonus) || 0
  const attr = Number(weapon.attributeBonus) || 0
  const usesSkill = weapon.usesSkill ?? skill > 0
  return usesSkill ? skill : attr
}

// Skill check: d100 + skill total, display the total. No target.
export function rollSkill(character, skill, rng = Math.random) {
  return rollTotal({ modifier: calcSkillTotal(skill), rng })
}

// Attack: d100 + the single (non-stacking) weapon modifier, display the total.
// No defense input — the GM adjudicates the total against the target's defense.
export function rollAttack(character, weapon, rng = Math.random) {
  return rollTotal({ modifier: weaponModifier(weapon), rng })
}

// Spell: roll under ( spell matrix[casterLevel][targetLevel] + magic attribute ),
// capped at 95 — except red-zone cells, where the attribute is not added (#245).
// Exactly what getFinalSpellTarget already computes. Self-resolves.
export function rollSpell(character, targetLevel, rng = Math.random) {
  const attr = character.magicAttribute && character.attributes?.[character.magicAttribute]
  const magicAttrValue = attr ? attrTotal(attr) : 0
  const target = getFinalSpellTarget(character.level, targetLevel, magicAttrValue)
  return resolveUnder({ target, rng })
}
