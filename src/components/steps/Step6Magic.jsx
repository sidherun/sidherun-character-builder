import { useState } from 'react'
import { attrTotal } from '../../utils/characterDerived.js'
import { uuid } from '../../utils/uuid.js'
import { getFinalSpellTarget } from '../../utils/spellTarget.js'
import styles from './Step6Magic.module.css'

const ATTR_OPTIONS = [
  'Thaumaturgy','Enlightenment','Intelligence','Wisdom',
  'Strength','Agility','Dexterity','Endurance','Constitution','Charisma',
]

export default function Step6Magic({ character, onUpdate }) {
  const { crafts, level, magicAttribute, attributes } = character
  const [targetLevel, setTargetLevel] = useState(1)

  const magicAttrVal = magicAttribute ? attrTotal(attributes[magicAttribute] || {}) : 0
  const finalTarget  = getFinalSpellTarget(level, targetLevel, magicAttrVal)

  // Total of an attribute given its display name (e.g. "Thaumaturgy").
  function attrTotalByName(name) {
    const key = (name || '').toLowerCase()
    return attributes[key] ? attrTotal(attributes[key]) : 0
  }

  function addCraft() {
    onUpdate({
      crafts: [...crafts, {
        id: uuid(),
        name: '', attributeName: 'Wisdom',
        attributeValue: attrTotalByName('Wisdom'), skillBonus: 0, misc: 0, description: '',
      }]
    })
  }

  function updateCraft(id, patch) {
    onUpdate({ crafts: crafts.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, ...patch }
      // Keep the attribute value in sync when the linked attribute changes.
      if (patch.attributeName) updated.attributeValue = attrTotalByName(patch.attributeName)
      return updated
    }) })
  }

  function removeCraft(id) {
    onUpdate({ crafts: crafts.filter(c => c.id !== id) })
  }

  const targetColor = finalTarget === null ? 'var(--danger)' : finalTarget >= 50 ? 'var(--story)' : finalTarget >= 30 ? 'var(--bronze)' : 'var(--danger)'

  return (
    <div className={styles.step}>
      <h2>Magic & Craft</h2>
      <p className={styles.intro}>
        Define your character&#39;s magical crafts and consult the Spell Target table to understand
        your chances when casting against foes of different levels.
      </p>

      {/* Crafts */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Magic Crafts</h3>
          <button className="btn-secondary" onClick={addCraft}>+ Add Craft</button>
        </div>
        {crafts.length === 0 && (
          <p className={styles.empty}>No crafts defined. Add your magical disciplines below.</p>
        )}
        {crafts.map(c => {
          const total = (c.attributeValue || 0) + (c.skillBonus || 0) + (c.misc || 0)
          return (
            <div key={c.id} className={styles.craftCard}>
              <div className={styles.craftTop}>
                <input
                  className={styles.craftName}
                  value={c.name}
                  onChange={e => updateCraft(c.id, { name: e.target.value })}
                  placeholder="Craft name (e.g. Affinity to Nature)…"
                />
                <button className="btn-danger" onClick={() => removeCraft(c.id)}>✕</button>
              </div>
              <div className={styles.craftRow}>
                <label className={styles.selectField}>
                  <span>Attribute</span>
                  <select value={c.attributeName} onChange={e => updateCraft(c.id, { attributeName: e.target.value })}>
                    {ATTR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
                <label className={styles.numField}>
                  <span>Attr Value</span>
                  <input type="number" value={c.attributeValue || ''} onChange={e => updateCraft(c.id, { attributeValue: parseInt(e.target.value) || 0 })} />
                </label>
                <label className={styles.numField}>
                  <span>Skill Bonus</span>
                  <input type="number" value={c.skillBonus || ''} onChange={e => updateCraft(c.id, { skillBonus: parseInt(e.target.value) || 0 })} />
                </label>
                <label className={styles.numField}>
                  <span>Misc</span>
                  <input type="number" value={c.misc || ''} onChange={e => updateCraft(c.id, { misc: parseInt(e.target.value) || 0 })} />
                </label>
                <div className={styles.totalBadge}>
                  <span>Total</span>
                  <strong>{total}</strong>
                </div>
              </div>
              <textarea
                className={styles.craftDesc}
                value={c.description}
                onChange={e => updateCraft(c.id, { description: e.target.value })}
                placeholder="Describe this craft and its narrative basis…"
                rows={2}
              />
            </div>
          )
        })}
      </section>

      <hr className="divider" />

      {/* Spell Target */}
      <section className={styles.section}>
        <h3>Spell Target Calculator</h3>
        <p className={styles.spellNote}>
          Roll below this target (%) to cast successfully. Based on your level ({level}) vs target&#39;s level.
          Your magical attribute ({magicAttribute || '—'}: {magicAttrVal}) is added to the base target (capped at 95%).
        </p>
        <div className={styles.spellCalc}>
          <label className={styles.selectField}>
            <span>Target&#39;s Level</span>
            <select value={targetLevel} onChange={e => setTargetLevel(parseInt(e.target.value))}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </label>
          <div className={styles.targetResult} style={{ color: targetColor }}>
            <span className={styles.targetLabel}>Spell Target</span>
            <span className={styles.targetNum}>{finalTarget ?? '—'}%</span>
            {finalTarget !== null && finalTarget < 25 && (
              <span className={styles.redNote}>Very outmatched — low odds</span>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
