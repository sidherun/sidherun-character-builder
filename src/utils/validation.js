import { calcSkillBudgetUsed } from './characterDerived.js'

export function validateStep(character, step) {
  const errors = []
  if (step === 2) {
    if (!character.name?.trim()) errors.push('Character name is required.')
    if (!character.race) errors.push('Race is required.')
    if (!character.archetype) errors.push('Archetype is required.')
  }
  if (step === 3) {
    const core = ['strength','agility','dexterity','endurance','constitution',
                  'intelligence','wisdom','thaumaturgy','enlightenment','charisma']
    const allZero = core.every(k => {
      const a = character.attributes?.[k]
      return !a || (a.base === 0 && a.racialMod === 0 && a.tempMod === 0)
    })
    if (allZero) errors.push('Please set at least one attribute score.')
  }
  if (step === 7) {
    const used = calcSkillBudgetUsed(character.skills || [])
    if (used > 30) errors.push('Skill point budget exceeded (max 30).')
  }
  return errors
}
