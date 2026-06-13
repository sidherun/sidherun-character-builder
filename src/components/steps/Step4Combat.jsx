import { calcDefense, attrTotal } from '../../utils/characterDerived.js'
import armorTypes from '../../data/armorTypes.json'
import styles from './Step4Combat.module.css'

const SHIELD_OPTIONS = [
  { id: 'none',    label: 'None',    bonus: 0  },
  { id: 'buckler', label: 'Buckler', bonus: 5  },
  { id: 'small',   label: 'Small',   bonus: 10 },
  { id: 'medium',  label: 'Medium',  bonus: 15 },
  { id: 'large',   label: 'Large',   bonus: 20 },
]

const ATTR_OPTIONS = [
  'Strength','Agility','Dexterity','Endurance','Constitution',
  'Intelligence','Wisdom','Thaumaturgy','Enlightenment','Charisma',
]

export default function Step4Combat({ character, onUpdate }) {
  const derived = calcDefense(character)

  function addWeapon() {
    onUpdate({
      weapons: [...character.weapons, {
        id: crypto.randomUUID(),
        name: '', attribute: 'Agility',
        attributeBonus: 0, skillBonus: 0, descriptor: '',
      }]
    })
  }

  function updateWeapon(id, patch) {
    onUpdate({ weapons: character.weapons.map(w => w.id === id ? { ...w, ...patch } : w) })
  }

  function removeWeapon(id) {
    onUpdate({ weapons: character.weapons.filter(w => w.id !== id) })
  }

  function handleArmorChange(type) {
    const armor = armorTypes.find(a => a.id === type)
    if (armor) {
      onUpdate({ armor: { type, absorption: armor.absorption, remaining: armor.maxDurability, max: armor.maxDurability } })
    }
  }

  function updateDefense(type, field, val) {
    onUpdate({ defense: { ...character.defense, [type]: { ...character.defense[type], [field]: parseInt(val) || 0 } } })
  }

  const shieldBonus = SHIELD_OPTIONS.find(s => s.id === character.shield)?.bonus ?? 0

  return (
    <div className={styles.step}>
      <h2>Combat</h2>

      {/* Weapons */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Weapons</h3>
          <button className="btn-secondary" onClick={addWeapon}>+ Add Weapon</button>
        </div>
        {character.weapons.length === 0 && (
          <p className={styles.empty}>No weapons added yet.</p>
        )}
        {character.weapons.map(w => {
          const total = (parseInt(w.attributeBonus) || 0) + (parseInt(w.skillBonus) || 0)
          const weaponName = w.name || 'unnamed weapon'
          return (
            <div key={w.id} className={styles.weaponRow} role="group" aria-label={`Weapon: ${weaponName}`}>
              <input
                className={styles.wName}
                value={w.name}
                onChange={e => updateWeapon(w.id, { name: e.target.value })}
                placeholder="Weapon name…"
                aria-label="Weapon name"
              />
              <select
                value={w.attribute}
                onChange={e => updateWeapon(w.id, { attribute: e.target.value })}
                aria-label={`Attribute for ${weaponName}`}
              >
                {ATTR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <label className={styles.numLabel}>
                <span>Attr Bonus</span>
                <input
                  type="number"
                  value={w.attributeBonus || ''}
                  onChange={e => updateWeapon(w.id, { attributeBonus: parseInt(e.target.value) || 0 })}
                  aria-label={`Attribute bonus for ${weaponName}`}
                />
              </label>
              <label className={styles.numLabel}>
                <span>Skill Bonus</span>
                <input
                  type="number"
                  value={w.skillBonus || ''}
                  onChange={e => updateWeapon(w.id, { skillBonus: parseInt(e.target.value) || 0 })}
                  aria-label={`Skill bonus for ${weaponName}`}
                />
              </label>
              <div className={styles.totalBadge}>
                <span>Total</span>
                <strong aria-label={`Total bonus: ${total}`}>{total}</strong>
              </div>
              <input
                className={styles.wDesc}
                value={w.descriptor}
                onChange={e => updateWeapon(w.id, { descriptor: e.target.value })}
                placeholder="Damage / notes…"
                aria-label={`Damage and notes for ${weaponName}`}
              />
              <button
                className="btn-danger"
                onClick={() => removeWeapon(w.id)}
                aria-label={`Remove ${weaponName}`}
              >
                ✕
              </button>
            </div>
          )
        })}
      </section>

      <hr className="divider" />

      {/* Armor & Shield */}
      <section className={styles.section}>
        <h3>Armor & Shield</h3>
        <div className={styles.armorRow}>
          <label className={styles.selectLabel}>
            <span>Armor Type</span>
            <select value={character.armor.type} onChange={e => handleArmorChange(e.target.value)}>
              {armorTypes.map(a => (
                <option key={a.id} value={a.id}>{a.name} {a.absorption > 0 ? `(${a.absorption} absorb)` : ''}</option>
              ))}
            </select>
          </label>
          <label className={styles.selectLabel}>
            <span>Shield</span>
            <select value={character.shield} onChange={e => onUpdate({ shield: e.target.value })}>
              {SHIELD_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}{s.bonus > 0 ? ` (+${s.bonus})` : ''}</option>)}
            </select>
          </label>
          {character.armor.type !== 'none' && (
            <div className={styles.armorStats}>
              <span>Absorb: <strong>{character.armor.absorption}</strong></span>
              <label htmlFor="armor-remaining">
                Remaining:
                <input
                  id="armor-remaining"
                  type="number"
                  value={character.armor.remaining}
                  onChange={e => onUpdate({ armor: { ...character.armor, remaining: parseInt(e.target.value) || 0 } })}
                  style={{ width: 60, marginLeft: 6 }}
                />
              </label>
              <span>/ Max: <strong>{character.armor.max}</strong></span>
            </div>
          )}
        </div>
      </section>

      <hr className="divider" />

      {/* Defense */}
      <section className={styles.section}>
        <h3>Defense</h3>
        <p id="defense-hint" className={styles.hint}>
          Totals are auto-calculated from attributes. Edit Skill Bonus and Misc as needed.
          {shieldBonus > 0 && ` Shield (+${shieldBonus}) applied to Typical and Prone.`}
        </p>
        <div
          className={styles.defenseTable}
          role="table"
          aria-label="Defense values"
          aria-describedby="defense-hint"
        >
          <div className={styles.defenseHeader} role="row">
            <span role="columnheader">Type</span>
            <span role="columnheader">Base</span>
            <span role="columnheader">Attribute</span>
            <span role="columnheader">Skill Bonus</span>
            <span role="columnheader">Misc</span>
            <span role="columnheader">Total</span>
          </div>
          {[
            { key: 'typical',  label: 'Typical',  base: 50, attrVal: attrTotal(character.attributes.agility),    attrName: 'AGI', total: derived.typical },
            { key: 'prone',    label: 'Prone',    base: 0,  attrVal: attrTotal(character.attributes.agility),    attrName: 'AGI', total: derived.prone   },
            { key: 'magic',    label: 'Magic',    base: 0,  attrVal: Math.round((attrTotal(character.attributes.thaumaturgy) + attrTotal(character.attributes.enlightenment)) / 2), attrName: 'THA+EN÷2', total: derived.magic },
            { key: 'psychic',  label: 'Psychic',  base: 0,  attrVal: attrTotal(character.attributes.intelligence), attrName: 'INT', total: derived.psychic },
            { key: 'other',    label: 'Other',    base: character.defense.other.base, attrVal: 0, attrName: '—', total: derived.other },
          ].map(row => (
            <div key={row.key} className={styles.defenseRow} role="row">
              <span className={styles.defLabel} role="rowheader">{row.label}</span>
              <span role="cell">
                {row.key === 'other'
                  ? <input
                      type="number"
                      value={character.defense.other.base || ''}
                      onChange={e => updateDefense('other','base',e.target.value)}
                      style={{ width: 50 }}
                      aria-label="Other defense base value"
                    />
                  : row.base
                }
              </span>
              <span className={styles.attrCell} role="cell">{row.attrVal} <em>({row.attrName})</em></span>
              <input
                type="number"
                value={character.defense[row.key]?.skillBonus || ''}
                onChange={e => updateDefense(row.key, 'skillBonus', e.target.value)}
                aria-label={`${row.label} defense skill bonus`}
                role="cell"
              />
              <input
                type="number"
                value={character.defense[row.key]?.misc || ''}
                onChange={e => updateDefense(row.key, 'misc', e.target.value)}
                aria-label={`${row.label} defense miscellaneous bonus`}
                role="cell"
              />
              <strong className={styles.defTotal} role="cell" aria-label={`${row.label} defense total: ${row.total}`}>{row.total}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
