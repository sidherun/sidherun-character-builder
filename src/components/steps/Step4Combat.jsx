import { calcDefense, attrTotal } from '../../utils/characterDerived.js'
import { uuid } from '../../utils/uuid.js'
import NumberInput from '../NumberInput.jsx'
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

const ATTR_ABBREV = {
  strength: 'STR', agility: 'AGI', dexterity: 'DEX', endurance: 'END',
  constitution: 'CON', intelligence: 'INT', wisdom: 'WIS',
  thaumaturgy: 'THA', enlightenment: 'EN', charisma: 'CHA',
}

export default function Step4Combat({ character, onUpdate }) {
  const derived = calcDefense(character)

  // Total of an attribute given its display name (e.g. "Dexterity").
  function attrTotalByName(name) {
    const key = (name || '').toLowerCase()
    return character.attributes[key] ? attrTotal(character.attributes[key]) : 0
  }

  function addWeapon() {
    onUpdate({
      weapons: [...character.weapons, {
        id: uuid(),
        name: '', attribute: 'Agility',
        attributeBonus: attrTotalByName('Agility'), skillBonus: 0, descriptor: '',
      }]
    })
  }

  function updateWeapon(id, patch) {
    onUpdate({ weapons: character.weapons.map(w => {
      if (w.id !== id) return w
      const updated = { ...w, ...patch }
      // Keep the attribute bonus in sync when the linked attribute changes.
      if (patch.attribute) updated.attributeBonus = attrTotalByName(patch.attribute)
      return updated
    }) })
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
    onUpdate({ defense: { ...character.defense, [type]: { ...character.defense[type], [field]: val } } })
  }

  const shieldBonus = SHIELD_OPTIONS.find(s => s.id === character.shield)?.bonus ?? 0

  const magicAttrKey = character.hasMagic && character.magicAttribute ? character.magicAttribute : null
  const magicDefAttrVal = magicAttrKey
    ? attrTotal(character.attributes[magicAttrKey] || {})
    : Math.round((attrTotal(character.attributes.thaumaturgy) + attrTotal(character.attributes.enlightenment)) / 2)
  const magicDefAttrName = magicAttrKey
    ? (ATTR_ABBREV[magicAttrKey] || magicAttrKey.toUpperCase())
    : 'THA+EN÷2'

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
                <NumberInput
                  value={w.attributeBonus}
                  onChange={n => updateWeapon(w.id, { attributeBonus: n })}
                  aria-label={`Attribute bonus for ${weaponName}`}
                />
              </label>
              <label className={styles.numLabel}>
                <span>Skill Bonus</span>
                <NumberInput
                  value={w.skillBonus}
                  onChange={n => updateWeapon(w.id, { skillBonus: n })}
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
                <NumberInput
                  id="armor-remaining"
                  value={character.armor.remaining}
                  onChange={n => onUpdate({ armor: { ...character.armor, remaining: n } })}
                  min={0}
                  max={character.armor.max}
                  showZero
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
            { key: 'magic',    label: 'Magic',    base: 0,  attrVal: magicDefAttrVal, attrName: magicDefAttrName, total: derived.magic },
            { key: 'psychic',  label: 'Psychic',  base: 0,  attrVal: attrTotal(character.attributes.intelligence), attrName: 'INT', total: derived.psychic },
            { key: 'other',    label: 'Other',    base: character.defense.other.base, attrVal: 0, attrName: '—', total: derived.other },
          ].map(row => (
            <div key={row.key} className={styles.defenseRow} role="row">
              <span className={styles.defLabel} role="rowheader">{row.label}</span>
              <span role="cell">
                {row.key === 'other'
                  ? <NumberInput
                      value={character.defense.other.base}
                      onChange={n => updateDefense('other','base',n)}
                      style={{ width: 50 }}
                      aria-label="Other defense base value"
                    />
                  : row.base
                }
              </span>
              <span className={styles.attrCell} role="cell">{row.attrVal} <em>({row.attrName})</em></span>
              <NumberInput
                value={character.defense[row.key]?.skillBonus}
                onChange={n => updateDefense(row.key, 'skillBonus', n)}
                aria-label={`${row.label} defense skill bonus`}
                role="cell"
              />
              <NumberInput
                value={character.defense[row.key]?.misc}
                onChange={n => updateDefense(row.key, 'misc', n)}
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
