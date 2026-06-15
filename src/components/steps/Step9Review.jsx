import { calcDefense, calcHitPoints, calcMana, attrTotal, calcSkillTotal } from '../../utils/characterDerived.js'
import { encodeCharacterToURL } from '../../utils/urlState.js'
import { generateCharacterHTML } from '../../utils/generateCharacterHTML.js'
import styles from './Step9Review.module.css'

const ATTR_LABELS = {
  strength: 'Strength', agility: 'Agility', dexterity: 'Dexterity',
  endurance: 'Endurance', constitution: 'Constitution', intelligence: 'Intelligence',
  wisdom: 'Wisdom', thaumaturgy: 'Thaumaturgy', enlightenment: 'Enlightenment',
  charisma: 'Charisma', comeliness: 'Comeliness', fame: 'Fame',
}

export default function Step9Review({ character, onEnterPlayMode, onSaveToRoster, addToast }) {
  const defense  = calcDefense(character)
  const calcedHP = calcHitPoints(character)
  const calcedMana = calcMana(character)

  function exportJSON() {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${character.name || 'character'}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('JSON exported!', 'success')
  }

  function exportHTML() {
    const html = generateCharacterHTML(character)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${character.name || 'character'}.html`
    a.click()
    URL.revokeObjectURL(url)
    addToast('HTML exported!', 'success')
  }

  function copyShareURL() {
    const url = encodeCharacterToURL(character)
    navigator.clipboard.writeText(url)
    addToast('Share URL copied!', 'success')
  }

  return (
    <div className={styles.sheet}>
      {/* Header */}
      <div className={styles.sheetHeader}>
        <div className={styles.title}>
          <h1>{character.name || 'Unnamed Character'}</h1>
          <p className={styles.subtitle}>
            {character.race} · {character.archetype === 'custom' ? (character.customArchetypeName || 'Custom') : character.archetype} · Level {character.level}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-primary" onClick={() => { onSaveToRoster(); onEnterPlayMode() }}>
            ▶ Enter Play Mode
          </button>
        </div>
      </div>

      {/* Export bar */}
      <div className={styles.exportBar}>
        <span className={styles.exportLabel}>Export:</span>
        <button className="btn-secondary" onClick={exportJSON}>JSON</button>
        <button className="btn-secondary" onClick={exportHTML}>HTML / PDF</button>
        <button className="btn-secondary" onClick={copyShareURL}>Copy Share URL</button>
      </div>

      {/* Resources row */}
      <div className={styles.resourcesRow}>
        <div className={styles.resourceChip} style={{ borderColor: '#8b1a1a' }}>
          <span>HP</span>
          <strong>{character.hitPoints?.current ?? calcedHP} / {character.hitPoints?.total || calcedHP}</strong>
        </div>
        {character.hasMagic && (
          <div className={styles.resourceChip} style={{ borderColor: '#1a3a8b' }}>
            <span>Mana</span>
            <strong>{character.mana?.current ?? calcedMana} / {character.mana?.total || calcedMana}</strong>
          </div>
        )}
        <div className={styles.resourceChip} style={{ borderColor: '#2d5a27' }}>
          <span>Story Pts</span>
          <strong>{character.storyPoints?.current} / {character.storyPoints?.total}</strong>
        </div>
        {character.armor?.type !== 'none' && (
          <div className={styles.resourceChip} style={{ borderColor: '#5a4a27' }}>
            <span>Armor</span>
            <strong>{character.armor.remaining} / {character.armor.max}</strong>
          </div>
        )}
        <div className={styles.resourceChip} style={{ borderColor: 'var(--gold-dim)' }}>
          <span>XP</span>
          <strong>{(character.xp?.current || 0).toLocaleString()}</strong>
        </div>
      </div>

      <div className={styles.columns}>
        {/* Left column */}
        <div className={styles.left}>
          {/* Attributes */}
          <section className={styles.section}>
            <h3>Attributes</h3>
            <div className={styles.attrGrid}>
              {Object.entries(character.attributes).filter(([key]) => key in ATTR_LABELS).map(([key, val]) => (
                <div key={key} className={styles.attrChip}>
                  <span className={styles.attrName}>{ATTR_LABELS[key]}</span>
                  <strong className={styles.attrVal}>{attrTotal(val)}</strong>
                </div>
              ))}
            </div>
          </section>

          {/* Defense */}
          <section className={styles.section}>
            <h3>Defense</h3>
            <div className={styles.defTable}>
              {[
                { label: 'Typical',  val: defense.typical  },
                { label: 'Prone',    val: defense.prone    },
                { label: 'Magic',    val: defense.magic    },
                { label: 'Psychic',  val: defense.psychic  },
                { label: 'Other',    val: defense.other    },
              ].map(d => (
                <div key={d.label} className={styles.defRow}>
                  <span>{d.label}</span>
                  <strong>{d.val}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className={styles.right}>
          {/* Weapons */}
          {character.weapons?.length > 0 && (
            <section className={styles.section}>
              <h3>Weapons</h3>
              {character.weapons.map(w => {
                const total = (w.attributeBonus || 0) + (w.skillBonus || 0)
                return (
                  <div key={w.id} className={styles.weaponRow}>
                    <span className={styles.weaponName}>{w.name || '—'}</span>
                    <span className={styles.weaponAttr}>{w.attribute}</span>
                    <span className={styles.weaponTotal}>+{total}</span>
                    <span className={styles.weaponDesc}>{w.descriptor}</span>
                  </div>
                )
              })}
            </section>
          )}

          {/* Skills */}
          {character.skills?.length > 0 && (
            <section className={styles.section}>
              <h3>Skills {character.skills.some(s => s.isSpecialty) && <span className={styles.starNote}>★ = Specialty</span>}</h3>
              {character.skills.map(s => (
                <div key={s.id} className={styles.skillRow}>
                  <span className={styles.skillName}>
                    {s.isSpecialty && '★ '}{s.name || '—'}
                  </span>
                  <span className={styles.skillAttr}>{s.attributeName}</span>
                  <span className={styles.skillTotal}>{calcSkillTotal(s)}</span>
                </div>
              ))}
            </section>
          )}

          {/* Powers */}
          {character.hasPowers && character.powers?.length > 0 && (
            <section className={styles.section}>
              <h3>Powers</h3>
              {character.powers.map(p => {
                const total = p.attributeType
                  ? attrTotal(character.attributes[p.attributeType] || {}) + (p.powerBonus || 0)
                  : (p.base||0) + (p.attributeBonus||0) + (p.skillBonus||0) + (p.misc||0)
                return (
                  <div key={p.id} className={styles.powerRow}>
                    <span className={styles.powerName}>{p.name || '—'}</span>
                    <span className={styles.powerTotal}>+{total}</span>
                    {p.description && <span className={styles.powerDesc}>{p.description}</span>}
                  </div>
                )
              })}
            </section>
          )}

          {/* Crafts */}
          {character.hasMagic && character.crafts?.length > 0 && (
            <section className={styles.section}>
              <h3>Magic Crafts</h3>
              {character.crafts.map(c => (
                <div key={c.id} className={styles.craftRow}>
                  <span className={styles.craftName}>{c.name || '—'}</span>
                  <span className={styles.craftAttr}>{c.attributeName}</span>
                  <span className={styles.craftTotal}>{(c.attributeValue||0) + (c.skillBonus||0) + (c.misc||0)}</span>
                  {c.description && <span className={styles.craftDesc}>{c.description}</span>}
                </div>
              ))}
            </section>
          )}
          {/* Inventory */}
          {character.inventory?.length > 0 && (
            <section className={styles.section}>
              <h3>Inventory</h3>
              {character.inventory.map((item, i) => {
                const isStr = typeof item === 'string'
                const name  = isStr ? item : (item.name || '—')
                const qty   = !isStr && item.quantity != null && item.quantity !== '' ? ` ×${item.quantity}` : ''
                const notes = !isStr && item.notes ? ` — ${item.notes}` : ''
                return (
                  <div key={i} className={styles.skillRow}>
                    <span className={styles.skillName}>{name}{notes}</span>
                    {qty && <span className={styles.skillAttr}>{qty}</span>}
                  </div>
                )
              })}
            </section>
          )}
        </div>
      </div>

      {/* Backstory */}
      {character.backstory && (
        <section className={styles.backstory}>
          <h3>Backstory</h3>
          <p>{character.backstory}</p>
        </section>
      )}
    </div>
  )
}
