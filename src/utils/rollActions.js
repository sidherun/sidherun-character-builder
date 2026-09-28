// Binds the dice core to the rules engine so nothing duplicates a formula.
// Skills and attacks roll-and-display a total (GM adjudicates verbally); spells
// self-resolve against the computed spell target.

import { calcSkillTotal, attrTotal, skillAttributeScore } from './characterDerived.js'
import { getFinalSpellTarget, getSpellTarget, getSpellZone } from './spellTarget.js'
import { rollTotal, resolveUnder } from './dice.js'
import { parseDamageDice } from './weaponDamage.js'

// ── Roll breakdowns (#372) ───────────────────────────────────────────────────
// Every roll carries `parts`: the sources of its modifier (or, for spells, of
// the target), so the banner, GM feed and sheet can say WHY a number is there.
// `note` records anything deliberately left out.

const cap = (s) => {
  const t = String(s || '').trim()
  return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : ''
}

// Drop zero-value parts, but keep the first so a +0 still names its source.
const nonZero = (parts) => {
  const kept = parts.filter(p => p.value)
  return kept.length ? kept : parts.slice(0, 1)
}

export function skillParts(skill, attributes) {
  return nonZero([
    { label: cap(skill.attributeName) || 'Attribute', value: skillAttributeScore(skill, attributes) },
    { label: 'skill', value: Number(skill.skillPoints) || 0 },
    { label: 'temp', value: Number(skill.tempMod) || 0 },
  ])
}

export function attributeParts(attribute = {}) {
  return nonZero([
    { label: 'base', value: Number(attribute.base) || 0 },
    { label: 'racial', value: Number(attribute.racialMod) || 0 },
    { label: 'temp', value: Number(attribute.tempMod) || 0 },
  ])
}

// Which single value an attack uses, and the one it ignores (non-stacking).
export function attackParts(weapon = {}) {
  const skill = Number(weapon.skillBonus) || 0
  const attr = Number(weapon.attributeBonus) || 0
  const usesSkill = weapon.usesSkill ?? skill > 0
  const attrLabel = cap(weapon.attribute) || 'Attribute'
  return {
    parts: usesSkill ? [{ label: 'weapon skill', value: skill }] : [{ label: attrLabel, value: attr }],
    note: usesSkill
      ? (attr ? `${attrLabel} ${attr} not added (doesn't stack)` : null)
      : (skill ? `weapon skill ${skill} not added (doesn't stack)` : null),
  }
}

// A spell target's sources: the matrix cell plus the casting value, or the
// PHB exceptions (red zone drops the attribute; the target caps at 95).
function spellTargetParts(casterLevel, targetLevel, castLabel, castValue) {
  const base = getSpellTarget(casterLevel, targetLevel)
  if (base === null) return { parts: [], note: null }
  const matrix = { label: `matrix L${casterLevel} vs L${targetLevel}`, value: base }
  if (getSpellZone(casterLevel, targetLevel) === 'red') {
    return { parts: [matrix], note: `red zone: ${castLabel} not added` }
  }
  const capped = base + (castValue || 0) > 95
  return { parts: [matrix, { label: castLabel, value: castValue || 0 }], note: capped ? 'capped at 95' : null }
}

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
  return { ...rollTotal({ modifier: calcSkillTotal(skill, character?.attributes), rng }), parts: skillParts(skill, character?.attributes) }
}

// Bare attribute check: d100 + the attribute's fully derived value (base,
// racial, and temporary modifiers), using the same total-roll rules as skills.
export function rollAttribute(attribute, rng = Math.random) {
  return { ...rollTotal({ modifier: attrTotal(attribute || {}), rng }), parts: attributeParts(attribute || {}) }
}

// Plain roll (#370): d100 with no modifier, same explode/fumble rules. For when
// the GM just says "roll" and nothing on the sheet applies.
export function rollPlain(rng = Math.random) {
  return rollTotal({ modifier: 0, rng })
}

// Attack: d100 + the single (non-stacking) weapon modifier, display the total.
// No defense input — the GM adjudicates the total against the target's defense.
export function rollAttack(character, weapon, rng = Math.random) {
  return { ...rollTotal({ modifier: weaponModifier(weapon), rng }), ...attackParts(weapon) }
}

// Roll structured weapon damage. A melee critical adds the character's full
// Strength once per additional percentile roll generated by the attack.
export function rollWeaponDamage(character, weapon, attackRoll, rng = Math.random) {
  const spec = parseDamageDice(weapon?.damageDice)
  const rolls = spec
    ? Array.from({ length: spec.count }, () => Math.min(spec.sides, Math.max(1, Math.floor(rng() * spec.sides) + 1)))
    : []
  const rolled = rolls.reduce((sum, value) => sum + value, 0)
  const bonus = Number(weapon?.damageBonus) || 0
  const extraCritRolls = Math.max(0, (attackRoll?.rolls?.length || 1) - 1)
  const strength = attrTotal(character?.attributes?.strength || {})
  const critBonus = weapon?.isMelee ? extraCritRolls * strength : 0
  return {
    rolls,
    dice: spec?.notation || '',
    bonus,
    critBonus,
    extraCritRolls,
    damageType: weapon?.damageType || '',
    total: rolled + bonus + critBonus,
  }
}

// Spell: roll under ( spell matrix[casterLevel][targetLevel] + magic attribute ),
// capped at 95 — except red-zone cells, where the attribute is not added (#245).
// Exactly what getFinalSpellTarget already computes. Self-resolves.
export function rollSpell(character, targetLevel, rng = Math.random) {
  const attr = character.magicAttribute && character.attributes?.[character.magicAttribute]
  const magicAttrValue = attr ? attrTotal(attr) : 0
  const target = getFinalSpellTarget(character.level, targetLevel, magicAttrValue)
  const why = spellTargetParts(character.level, targetLevel, cap(character.magicAttribute) || 'attribute', magicAttrValue)
  return { ...resolveUnder({ target, rng }), ...why }
}

// A craft's casting value: its governing attribute + skill + misc — the number
// the sheet displays next to the craft. The PHB matrix note says to add "your
// relevant attribute … whichever governs your casting"; the craft row is where
// that governing attribute (and any tradition-specific bonuses) lives.
export function craftTotal(craft) {
  return (Number(craft?.attributeValue) || 0)
       + (Number(craft?.skillBonus) || 0)
       + (Number(craft?.misc) || 0)
}

// Cast through a specific magic craft (#237): same zone-aware spell target as
// rollSpell, but the added value is the CRAFT's total (e.g. Evie casts Arcane
// with INT 14 and Awakened Arcane with THA 20), not the single sheet-level
// magic attribute. Red-zone suppression and the 95 cap come from
// getFinalSpellTarget. Self-resolves.
export function rollCast(character, craft, targetLevel, rng = Math.random) {
  const target = getFinalSpellTarget(character.level, targetLevel, craftTotal(craft))
  const why = spellTargetParts(character.level, targetLevel, craft?.name || 'craft', craftTotal(craft))
  return { ...resolveUnder({ target, rng }), ...why }
}
