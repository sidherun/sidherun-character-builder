import xpTable from '../data/xpTable.json'

const RACE_VALUES  = { frail: 10, slight: 15, healthy: 20, stout: 30 }
const SIZE_VALUES  = { small: 0.5, medium: 1, large: 1.5, huge: 2, gargantuan: 3 }
const AGE_VALUES   = { young: 0.75, adult: 1, elderly: 0.75 }
const SHIELD_BONUS = { none: 0, buckler: 5, small: 10, medium: 15, large: 20 }

export function attrTotal(attr) {
  return (attr.base || 0) + (attr.racialMod || 0) + (attr.tempMod || 0)
}

export function calcHitPoints(character) {
  const { raceType, raceSize, ageCategory, attributes } = character
  const raceVal = RACE_VALUES[raceType] ?? 20
  const sizeVal = SIZE_VALUES[raceSize] ?? 1
  const ageVal  = AGE_VALUES[ageCategory] ?? 1
  const base    = raceVal * sizeVal * ageVal
  const str = attrTotal(attributes.strength)
  const end = attrTotal(attributes.endurance)
  const con = attrTotal(attributes.constitution)
  return Math.round(base + Math.round((str + end) / 2) + con)
}

export function calcMana(character) {
  if (!character.hasMagic) return 0
  const attr = character.magicAttribute
  if (!attr || !character.attributes[attr]) return 0
  return attrTotal(character.attributes[attr])
}

export function calcDefense(character) {
  const attrs = character.attributes
  const agi  = attrTotal(attrs.agility)
  const int_ = attrTotal(attrs.intelligence)
  const tha  = attrTotal(attrs.thaumaturgy)
  const en   = attrTotal(attrs.enlightenment)
  const shieldBonus = SHIELD_BONUS[character.shield] ?? 0
  const d = character.defense

  // Magic users defend with their casting attribute; non-magic characters use (THA+EN)/2
  const magicDefAttr = character.hasMagic && character.magicAttribute
    ? attrTotal(attrs[character.magicAttribute] || {})
    : Math.round((tha + en) / 2)

  return {
    typical:  50  + agi          + (d.typical.skillBonus || 0)  + shieldBonus + (d.typical.misc || 0),
    prone:    0   + agi          + (d.prone.skillBonus || 0)    + shieldBonus + (d.prone.misc || 0),
    magic:    0   + magicDefAttr + (d.magic.skillBonus || 0)   + (d.magic.misc || 0),
    psychic:  0   + int_         + (d.psychic.skillBonus || 0)  + (d.psychic.misc || 0),
    other:    (d.other.base || 0) + (d.other.skillBonus || 0)  + (d.other.misc || 0),
  }
}

export function calcCoreAttrAverage(attributes) {
  const core = ['strength','agility','dexterity','endurance','constitution',
                'intelligence','wisdom','thaumaturgy','enlightenment','charisma']
  const sum = core.reduce((acc, k) => acc + attrTotal(attributes[k] || {}), 0)
  return Math.round((sum / core.length) * 10) / 10
}

export function calcSkillTotal(skill) {
  return (skill.attributeScore || 0) + (skill.skillPoints || 0) + (skill.tempMod || 0)
}

export function calcSkillBudgetUsed(skills) {
  return skills.reduce((acc, s) => acc + (s.skillPoints || 0), 0)
}

export function xpForLevel(level) {
  const row = xpTable.find(r => r.level === level)
  return row ? row.xpEnd : null
}

export function xpNeededForNextLevel(level) {
  const next = xpTable.find(r => r.level === level + 1)
  return next ? next.xpStart : null
}
