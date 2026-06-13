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
          return (
            <div key={w.id} className={styles.weaponRow}>
              <input
                className={styles.wName}
                value={w.name}
                onChange={e => updateWeapon(w.id, { name: e.target.value })}
                placeholder="Weapon name…"
              />
              <select value={w.attribute} onChange={e => updateWeapon(w.id, { attribute: e.target.value })}>
                {ATTR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <label className={styles.numLabel}>
                <span>Attr Bonus</span>
                <input type="number" value={w.attributeBonus || ''} onChange={e => updateWeapon(w.id, { attributeBonus: parseInt(e.target.value) || 0 })} />
              </label>
              <label className={styles.numLabel}>
                <span>Skill Bonus</span>
                <input type="number" value={w.skillBonus || ''} onChange={e => updateWeapon(w.id, { skillBonus: parseInt(e.target.value) || 0 })} />
              </label>
              <div className={styles.totalBadge}>
                <span>Total</span>
                <strong>{total}</strong>
              </div>
              <input
                className={styles.wDesc}
                value={w.descriptor}
                onChange={e => updateWeapon(w.id, { descriptor: e.target.value })}
                placeholder="Damage / notes…"
              />
              <button className="btn-danger" onClick={() => removeWeapon(w.id)}>✕</button>
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
              <label>
                Remaining:
                <input
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
        <p className={styles.hint}>
          Totals are auto-calculated from attributes. Edit Skill Bonus and Misc as needed.
          {shieldBonus > 0 && ` Shield (+${shieldBonus}) applied to Typical and Prone.`}
        </p>
        <div className={styles.defenseTable}>
          <div className={styles.defenseHeader}>
            <span>Type</span><span>Base</span><span>Attribute</span>
            <span>Skill Bonus</span><span>Misc</span><span>Total</span>
          </div>
          {[
            { key: 'typical',  label: 'Typical',  base: 50, attrVal: attrTotal(character.attributes.agility),    attrName: 'AGI', total: derived.typical },
            { key: 'prone',    label: 'Prone',    base: 0,  attrVal: attrTotal(character.attributes.agility),    attrName: 'AGI', total: derived.prone   },
            { key: 'magic',    label: 'Magic',    base: 0,  attrVal: Math.round((attrTotal(character.attributes.thaumaturgy) + attrTotal(character.attributes.enlightenment)) / 2), attrName: 'THA+EN÷2', total: derived.magic },
            { key: 'psychic',  label: 'Psychic',  base: 0,  attrVal: attrTotal(character.attributes.intelligence), attrName: 'INT', total: derived.psychic },
            { key: 'other',    label: 'Other',    base: character.defense.other.base, attrVal: 0, attrName: '—', total: derived.other },
          ].map(row => (
            <div key={row.key} className={styles.defenseRow}>
              <span className={styles.defLabel}>{row.label}</span>
              <span>
                {row.key === 'other'
                  ? <input type="number" value={character.defense.other.base || ''} onChange={e => updateDefense('other','base',e.target.value)} style={{ width: 50 }} />
                  : row.base
                }
              </span>
              <span className={styles.attrCell}>{row.attrVal} <em>({row.attrName})</em></span>
              <input
                type="number"
                value={character.defense[row.key]?.skillBonus || ''}
                onChange={e => updateDefense(row.key, 'skillBonus', e.target.value)}
              />
              <input
                type="number"
                value={character.defense[row.key]?.misc || ''}
                onChange={e => updateDefense(row.key, 'misc', e.target.value)}
              />
              <strong className={styles.defTotal}>{row.total}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
