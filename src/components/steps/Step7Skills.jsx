import { calcSkillTotal, calcSkillBudgetUsed } from '../../utils/characterDerived.js'
import { attrTotal } from '../../utils/characterDerived.js'
import styles from './Step7Skills.module.css'

const ATTR_KEYS = [
  'Strength','Agility','Dexterity','Endurance','Constitution',
  'Intelligence','Wisdom','Thaumaturgy','Enlightenment','Charisma',
]

const ATTR_MAP = {
  'Strength': 'strength', 'Agility': 'agility', 'Dexterity': 'dexterity',
  'Endurance': 'endurance', 'Constitution': 'constitution', 'Intelligence': 'intelligence',
  'Wisdom': 'wisdom', 'Thaumaturgy': 'thaumaturgy', 'Enlightenment': 'enlightenment', 'Charisma': 'charisma',
}

const MAX_BUDGET = 30
const MAX_PER_SKILL = 15

export default function Step7Skills({ character, onUpdate }) {
  const { skills, attributes } = character
  const budgetUsed = calcSkillBudgetUsed(skills)
  const overBudget = budgetUsed > MAX_BUDGET

  function getAttrScore(attrName) {
    const key = ATTR_MAP[attrName]
    return key ? attrTotal(attributes[key] || {}) : 0
  }

  function addSkill() {
    onUpdate({
      skills: [...skills, {
        id: crypto.randomUUID(),
        name: '', attributeName: 'Intelligence',
        attributeScore: getAttrScore('Intelligence'),
        skillPoints: 0, tempMod: 0,
        isSpecialty: false, usePips: 0,
      }]
    })
  }

  function updateSkill(id, patch) {
    onUpdate({ skills: skills.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, ...patch }
      // Sync attributeScore when attribute changes
      if (patch.attributeName) {
        updated.attributeScore = getAttrScore(patch.attributeName)
      }
      // Clamp skill points
      if (updated.skillPoints > MAX_PER_SKILL) updated.skillPoints = MAX_PER_SKILL
      if (updated.skillPoints < 0) updated.skillPoints = 0
      return updated
    })})
  }

  function removeSkill(id) {
    onUpdate({ skills: skills.filter(s => s.id !== id) })
  }

  function togglePip(skillId, pipIdx) {
    const skill = skills.find(s => s.id === skillId)
    if (!skill) return
    const newPips = skill.usePips === pipIdx + 1 ? pipIdx : pipIdx + 1
    updateSkill(skillId, { usePips: newPips })
  }

  const budgetColor = overBudget ? '#8b1a1a' : budgetUsed >= 25 ? '#8b6914' : '#2d5a27'

  return (
    <div className={styles.step}>
      <h2>Skills & Specialties</h2>
      <p className={styles.intro}>
        Skills are defined during character creation based on your backstory. Allocate your 30 skill points
        (max 15 per skill). Mark Specialties — exceptional skills that require use each level to maintain bonuses.
      </p>

      <div className={styles.budget} style={{ color: budgetColor }}>
        <span>Skill Points Used:</span>
        <strong>{budgetUsed} / {MAX_BUDGET}</strong>
        {overBudget && <span className={styles.overWarning}>⚠ Over budget!</span>}
      </div>

      <div className={styles.header}>
        <button className="btn-secondary" onClick={addSkill}>+ Add Skill</button>
      </div>

      {skills.length === 0 && (
        <p className={styles.empty}>
          No skills yet. Add skills based on your character's background and story.
        </p>
      )}

      <div className={styles.tableHeader}>
        <span>Skill Name</span>
        <span>Attribute</span>
        <span>Attr Score</span>
        <span>Skill Pts</span>
        <span>Temp Mod</span>
        <span>Total</span>
        <span>Specialty</span>
        <span>Use</span>
        <span></span>
      </div>

      {skills.map(s => {
        const total = calcSkillTotal(s)
        return (
          <div key={s.id} className={`${styles.skillRow} ${s.isSpecialty ? styles.specialty : ''}`}>
            <input
              value={s.name}
              onChange={e => updateSkill(s.id, { name: e.target.value })}
              placeholder={`Skill name…`}
              className={styles.nameInput}
            />
            <select
              value={s.attributeName}
              onChange={e => updateSkill(s.id, { attributeName: e.target.value })}
            >
              {ATTR_KEYS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className={styles.attrScore}>{s.attributeScore}</span>
            <input
              type="number"
              value={s.skillPoints || ''}
              min={0}
              max={MAX_PER_SKILL}
              onChange={e => updateSkill(s.id, { skillPoints: parseInt(e.target.value) || 0 })}
              className={styles.numInput}
            />
            <input
              type="number"
              value={s.tempMod || ''}
              onChange={e => updateSkill(s.id, { tempMod: parseInt(e.target.value) || 0 })}
              className={styles.numInput}
            />
            <strong className={styles.total}>{total}</strong>
            <label className={styles.specialtyToggle} title="Mark as Specialty (use-it-or-lose-it)">
              <input
                type="checkbox"
                checked={s.isSpecialty}
                onChange={e => updateSkill(s.id, { isSpecialty: e.target.checked })}
              />
              {s.isSpecialty && <span className={styles.specialtyTag}>★</span>}
            </label>
            <div className={styles.pips}>
              {[0,1,2,3,4].map(i => (
                <button
                  key={i}
                  className={`${styles.pip} ${i < s.usePips ? styles.pipFilled : ''}`}
                  onClick={() => togglePip(s.id, i)}
                  title="Track skill use"
                />
              ))}
            </div>
            <button className="btn-danger" onClick={() => removeSkill(s.id)}>✕</button>
          </div>
        )
      })}
    </div>
  )
}
