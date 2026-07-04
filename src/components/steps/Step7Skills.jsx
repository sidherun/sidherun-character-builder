import { calcSkillTotal, calcSkillBudgetUsed } from '../../utils/characterDerived.js'
import { attrTotal } from '../../utils/characterDerived.js'
import { poolSize, cumulativeSkillCap } from '../../utils/skillPoints.js'
import { uuid } from '../../utils/uuid.js'
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

export default function Step7Skills({ character, onUpdate }) {
  const { skills, attributes } = character
  // Single source of truth for the budget tables (PHB pp.14-15): utils/skillPoints.js.
  const MAX_BUDGET = poolSize(character.level)
  const MAX_PER_SKILL = cumulativeSkillCap(character.level)
  const budgetUsed = calcSkillBudgetUsed(skills)
  const overBudget = budgetUsed > MAX_BUDGET

  function getAttrScore(attrName) {
    const key = ATTR_MAP[attrName]
    return key ? attrTotal(attributes[key] || {}) : 0
  }

  function addSkill() {
    onUpdate({
      skills: [...skills, {
        id: uuid(),
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
      // Warn, don't block (#178): a skill may exceed the per-level cap so the GM
      // can override; the input flags it red and the over-budget badge surfaces
      // it on the sheet / roster / GM screen. Only guard against negatives.
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

  const budgetColor = overBudget ? 'var(--danger)' : budgetUsed >= MAX_BUDGET * 0.85 ? 'var(--bronze)' : 'var(--story)'

  return (
    <div className={styles.step}>
      <h2>Skills & Specialties</h2>
      <p className={styles.intro}>
        Skills are defined during character creation based on your backstory. Allocate your {MAX_BUDGET} skill points
        (max {MAX_PER_SKILL} per skill at Level {character.level}). Mark Specialties — exceptional skills that require use each level to maintain bonuses.
      </p>

      <div
        className={styles.budget}
        style={{ color: budgetColor }}
        role="status"
        aria-live="polite"
        aria-label={`Skill points used: ${budgetUsed} of ${MAX_BUDGET} at Level ${character.level}${overBudget ? ' — over budget' : ''}`}
      >
        <span>Skill Points Used:</span>
        <strong>{budgetUsed} / {MAX_BUDGET}</strong>
        {overBudget && <span className={styles.overWarning}>⚠ Over budget!</span>}
      </div>

      <div className={styles.header}>
        <button className="btn-secondary" onClick={addSkill}>+ Add Skill</button>
      </div>

      {skills.length === 0 && (
        <p className={styles.empty}>
          No skills yet. Add skills based on your character&#39;s background and story.
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
        const skillLabel = s.name || 'unnamed skill'
        return (
          <div
            key={s.id}
            className={`${styles.skillRow} ${s.isSpecialty ? styles.specialty : ''}`}
            role="group"
            aria-label={`Skill: ${skillLabel}`}
          >
            <input
              value={s.name}
              onChange={e => updateSkill(s.id, { name: e.target.value })}
              placeholder="Skill name…"
              className={styles.nameInput}
              aria-label="Skill name"
            />
            <select
              value={s.attributeName}
              onChange={e => updateSkill(s.id, { attributeName: e.target.value })}
              aria-label={`Linked attribute for ${skillLabel}`}
            >
              {ATTR_KEYS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className={styles.attrScore} aria-label={`Attribute score: ${s.attributeScore}`}>{s.attributeScore}</span>
            <input
              type="number"
              value={s.skillPoints || ''}
              min={0}
              max={MAX_PER_SKILL}
              onChange={e => updateSkill(s.id, { skillPoints: parseInt(e.target.value) || 0 })}
              className={`${styles.numInput}${s.skillPoints > MAX_PER_SKILL ? ` ${styles.overCap}` : ''}`}
              aria-label={`Skill points for ${skillLabel} (max ${MAX_PER_SKILL})`}
            />
            <input
              type="number"
              value={s.tempMod || ''}
              onChange={e => updateSkill(s.id, { tempMod: parseInt(e.target.value) || 0 })}
              className={styles.numInput}
              aria-label={`Temporary modifier for ${skillLabel}`}
            />
            <strong className={styles.total} aria-label={`Total: ${total}`}>{total}</strong>
            <label
              className={styles.specialtyToggle}
              title="Mark as Specialty (use-it-or-lose-it)"
              aria-label={`Mark ${skillLabel} as specialty`}
            >
              <input
                type="checkbox"
                checked={s.isSpecialty}
                onChange={e => updateSkill(s.id, { isSpecialty: e.target.checked })}
              />
              {s.isSpecialty && <span className={styles.specialtyTag} aria-hidden="true">★</span>}
            </label>
            <div className={styles.pips} role="group" aria-label={`Use tracking for ${skillLabel}`}>
              {[0,1,2,3,4].map(i => (
                <button
                  key={i}
                  className={`${styles.pip} ${i < s.usePips ? styles.pipFilled : ''}`}
                  onClick={() => togglePip(s.id, i)}
                  aria-pressed={i < s.usePips}
                  aria-label={`Use pip ${i + 1} of 5 for ${skillLabel}`}
                />
              ))}
            </div>
            <button
              className="btn-danger"
              onClick={() => removeSkill(s.id)}
              aria-label={`Remove skill: ${skillLabel}`}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
