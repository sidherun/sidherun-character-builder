import { calcCoreAttrAverage, attrTotal } from '../../utils/characterDerived.js'
import styles from './Step3Attributes.module.css'

const CORE_ATTRS = [
  { key: 'strength',      label: 'Strength',      abbr: 'STR', desc: 'Physical power; melee damage, lifting' },
  { key: 'agility',       label: 'Agility',       abbr: 'AGI', desc: 'Full-body movement; dodge, stealth' },
  { key: 'dexterity',     label: 'Dexterity',     abbr: 'DEX', desc: 'Hand-eye coordination; ranged, spellwork' },
  { key: 'endurance',     label: 'Endurance',     abbr: 'END', desc: 'Fitness; marching, sustained effort' },
  { key: 'constitution',  label: 'Constitution',  abbr: 'CON', desc: 'Physical resilience; hit points' },
  { key: 'intelligence',  label: 'Intelligence',  abbr: 'INT', desc: 'Knowledge and recall; psychic defense' },
  { key: 'wisdom',        label: 'Wisdom',        abbr: 'WIS', desc: 'Understanding and linkages across domains' },
  { key: 'thaumaturgy',   label: 'Thaumaturgy',   abbr: 'THA', desc: 'Arcane/supernatural magic ability' },
  { key: 'enlightenment', label: 'Enlightenment', abbr: 'EN',  desc: 'Divine/spiritual attunement' },
  { key: 'charisma',      label: 'Charisma',      abbr: 'CHA', desc: 'Personality; charm, persuasion' },
]

const SOCIAL_ATTRS = [
  { key: 'comeliness', label: 'Comeliness', abbr: 'COM', desc: 'Physical attractiveness to your race' },
  { key: 'fame',       label: 'Fame',       abbr: 'FAM', desc: 'How well-known you are in your region' },
]

function AttrRow({ attrKey, label, abbr, desc, value, onChange }) {
  const total = attrTotal(value)

  function handleChange(field, raw) {
    const n = parseInt(raw) || 0
    onChange(attrKey, { ...value, [field]: n })
  }

  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span className={styles.abbr}>{abbr}</span>
        <span className={styles.name}>{label}</span>
        <span className={styles.desc}>{desc}</span>
      </div>
      <input
        type="number"
        className={styles.input}
        value={value.base || ''}
        onChange={e => handleChange('base', e.target.value)}
        placeholder="Base"
        min={0}
      />
      <input
        type="number"
        className={styles.input}
        value={value.racialMod || ''}
        onChange={e => handleChange('racialMod', e.target.value)}
        placeholder="Racial"
      />
      <input
        type="number"
        className={styles.input}
        value={value.tempMod || ''}
        onChange={e => handleChange('tempMod', e.target.value)}
        placeholder="Temp"
      />
      <div className={`${styles.total} ${total >= 15 ? styles.totalGood : ''}`}>
        {total}
      </div>
    </div>
  )
}

export default function Step3Attributes({ character, onUpdate }) {
  const { attributes } = character
  const avg = calcCoreAttrAverage(attributes)

  function handleAttrChange(key, newAttr) {
    onUpdate({ attributes: { ...attributes, [key]: newAttr } })
  }

  const avgColor = avg >= 15 ? '#2d5a27' : avg >= 12 ? '#8b6914' : '#8b1a1a'

  return (
    <div className={styles.step}>
      <div className={styles.titleRow}>
        <h2>Attributes</h2>
        <div className={styles.avgBadge} style={{ color: avgColor }}>
          Core avg: <strong>{avg}</strong>
          <span className={styles.target}>(target: 15)</span>
        </div>
      </div>
      <p className={styles.intro}>
        Set each attribute. Work with your GM during Session 0 to establish your scores.
        The 10 core attributes should average around 15 for a starting character.
      </p>

      <div className={styles.tableHeader}>
        <span>Attribute</span>
        <span>Base</span>
        <span>Racial Mod</span>
        <span>Temp Mod</span>
        <span>Total</span>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Core Attributes</div>
        {CORE_ATTRS.map(a => (
          <AttrRow
            key={a.key}
            attrKey={a.key}
            label={a.label}
            abbr={a.abbr}
            desc={a.desc}
            value={attributes[a.key] || { base: 0, racialMod: 0, tempMod: 0 }}
            onChange={handleAttrChange}
          />
        ))}
      </div>

      <hr className="divider" />

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Social Attributes <span className={styles.sectionNote}>(not included in core average)</span></div>
        {SOCIAL_ATTRS.map(a => (
          <AttrRow
            key={a.key}
            attrKey={a.key}
            label={a.label}
            abbr={a.abbr}
            desc={a.desc}
            value={attributes[a.key] || { base: 0, racialMod: 0, tempMod: 0 }}
            onChange={handleAttrChange}
          />
        ))}
      </div>
    </div>
  )
}
