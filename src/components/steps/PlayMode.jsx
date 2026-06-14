import { calcDefense, calcSkillTotal, attrTotal } from '../../utils/characterDerived.js'
import styles from './PlayMode.module.css'

const ATTR_LABELS = {
  strength: 'STR', agility: 'AGI', dexterity: 'DEX', endurance: 'END',
  constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', thaumaturgy: 'THA',
  enlightenment: 'EN', charisma: 'CHA', comeliness: 'COM', fame: 'FAM',
}

export default function PlayMode({ character, onUpdate, onExit, onToggleNotes }) {
  const defense = calcDefense(character)
  const hp    = character.hitPoints
  const mana  = character.mana
  const sp    = character.storyPoints
  const armor = character.armor

  function adjustHP(delta) {
    const newCurrent = Math.max(0, Math.min(hp.total, (hp.current || 0) + delta))
    onUpdate({ hitPoints: { ...hp, current: newCurrent } })
  }

  function adjustMana(delta) {
    const newCurrent = Math.max(0, Math.min(mana.total, (mana.current || 0) + delta))
    onUpdate({ mana: { ...mana, current: newCurrent } })
  }

  function adjustSP(delta) {
    const newCurrent = Math.max(0, Math.min(sp.total, (sp.current || 0) + delta))
    onUpdate({ storyPoints: { ...sp, current: newCurrent } })
  }

  function adjustArmor(delta) {
    const newRem = Math.max(0, Math.min(armor.max, (armor.remaining || 0) + delta))
    onUpdate({ armor: { ...armor, remaining: newRem } })
  }

  return (
    <div className={styles.playMode}>
      <header className={styles.header}>
        <div className={styles.charInfo}>
          <h1>{character.name || 'Unnamed'}</h1>
          <span>{character.race} · {character.archetype} · Level {character.level}</span>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-secondary" onClick={onToggleNotes}>Notes</button>
          <button className="btn-secondary" onClick={onExit}>← Edit</button>
        </div>
      </header>

      <div className={styles.content}>
        {/* Counters */}
        <div className={styles.counters}>
          <Counter
            label="Hit Points"
            current={hp.current || 0}
            total={hp.total || 0}
            color="#8b1a1a"
            onAdjust={adjustHP}
          />
          {character.hasMagic && (
            <Counter
              label="Mana"
              current={mana.current || 0}
              total={mana.total || 0}
              color="#1a3a8b"
              onAdjust={adjustMana}
            />
          )}
          <Counter
            label="Story Points"
            current={sp.current || 0}
            total={sp.total || 0}
            color="#2d5a27"
            onAdjust={adjustSP}
          />
          {armor.type !== 'none' && (
            <div className={styles.armorCounter}>
              <div className={styles.counterLabel} style={{ color: '#5a4a27' }}>Armor</div>
              <div className={styles.armorAbsorb}>Absorbs {armor.absorption} per hit</div>
              <div className={styles.counterDisplay}>
                <button className={styles.adjBtn} onClick={() => adjustArmor(-armor.absorption)}>-hit</button>
                <span className={styles.counterValue} style={{ color: '#5a4a27' }}>
                  {armor.remaining}<span className={styles.counterTotal}>/{armor.max}</span>
                </span>
                <button className={styles.adjBtn} onClick={() => adjustArmor(armor.absorption)}>+repair</button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.reference}>
          {/* Attributes quick-ref */}
          {character.attributes && (
            <section className={styles.refSection}>
              <h3>Attributes</h3>
              <div className={styles.attrGrid}>
                {Object.entries(character.attributes)
                  .filter(([key]) => key in ATTR_LABELS)
                  .map(([key, val]) => (
                    <div key={key} className={styles.attrItem}>
                      <span>{ATTR_LABELS[key]}</span>
                      <strong>{attrTotal(val)}</strong>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Defense quick-ref */}
          <section className={styles.refSection}>
            <h3>Defense</h3>
            <div className={styles.defGrid}>
              {[
                { label: 'Typical',  val: defense.typical  },
                { label: 'Prone',    val: defense.prone    },
                { label: 'Magic',    val: defense.magic    },
                { label: 'Psychic',  val: defense.psychic  },
                { label: 'Other',    val: defense.other    },
              ].map(d => (
                <div key={d.label} className={styles.defItem}>
                  <span>{d.label}</span>
                  <strong>{d.val}</strong>
                </div>
              ))}
            </div>
          </section>

          {/* Weapons quick-ref */}
          {character.weapons?.length > 0 && (
            <section className={styles.refSection}>
              <h3>Weapons</h3>
              {character.weapons.map(w => (
                <div key={w.id} className={styles.weaponItem}>
                  <span>{w.name}</span>
                  <span className={styles.weaponBonus}>+{(w.attributeBonus||0)+(w.skillBonus||0)}</span>
                  <span className={styles.weaponDesc}>{w.descriptor}</span>
                </div>
              ))}
            </section>
          )}

          {/* Skills quick-ref */}
          {character.skills?.length > 0 && (
            <section className={styles.refSection}>
              <h3>Skills</h3>
              {character.skills.map(s => (
                <div key={s.id} className={styles.skillItem}>
                  <span>{s.isSpecialty ? '★ ' : ''}{s.name}</span>
                  <strong>{calcSkillTotal(s)}</strong>
                </div>
              ))}
            </section>
          )}

          {/* Powers quick-ref */}
          {character.hasPowers && character.powers?.length > 0 && (
            <section className={styles.refSection}>
              <h3>Powers</h3>
              {character.powers.map(p => (
                <div key={p.id} className={styles.skillItem}>
                  <span>{p.name}{p.description ? ` — ${p.description}` : ''}</span>
                  <strong>+{(p.base||0)+(p.attributeBonus||0)+(p.skillBonus||0)+(p.misc||0)}</strong>
                </div>
              ))}
            </section>
          )}

          {/* Magic Crafts quick-ref */}
          {character.hasMagic && character.crafts?.length > 0 && (
            <section className={styles.refSection}>
              <h3>Magic Crafts</h3>
              {character.crafts.map(c => (
                <div key={c.id} className={styles.skillItem}>
                  <span>{c.name}{c.description ? ` — ${c.description}` : ''}</span>
                  <strong>{(c.attributeValue||0)+(c.skillBonus||0)+(c.misc||0)}</strong>
                </div>
              ))}
            </section>
          )}

          {/* Inventory quick-ref (forward-compatible with Session A schema work) */}
          {character.inventory?.length > 0 && (
            <section className={styles.refSection}>
              <h3>Inventory</h3>
              {character.inventory.map((item, i) => {
                const isStr = typeof item === 'string'
                const name  = isStr ? item : (item.name || '—')
                const qty   = !isStr && item.quantity ? `×${item.quantity}` : ''
                const notes = !isStr && item.notes ? item.notes : ''
                return (
                  <div key={i} className={styles.skillItem}>
                    <span>{name}{notes ? ` — ${notes}` : ''}</span>
                    {qty && <strong>{qty}</strong>}
                  </div>
                )
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function Counter({ label, current, total, color, onAdjust }) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0
  return (
    <div className={styles.counter}>
      <div className={styles.counterLabel} style={{ color }}>{label}</div>
      <div className={styles.counterDisplay}>
        <button className={styles.adjBtn} onClick={() => onAdjust(-1)}>−</button>
        <span className={styles.counterValue} style={{ color }}>
          {current}<span className={styles.counterTotal}>/{total}</span>
        </span>
        <button className={styles.adjBtn} onClick={() => onAdjust(+1)}>+</button>
      </div>
      <div className={styles.counterBar}>
        <div className={styles.counterFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.quickAdj}>
        {[-5,-3,-1,1,3,5].map(d => (
          <button key={d} className={styles.quickBtn} onClick={() => onAdjust(d)}>
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
    </div>
  )
}
