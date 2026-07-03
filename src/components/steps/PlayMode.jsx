import { useState } from 'react'
import { calcDefense, calcSkillTotal, attrTotal } from '../../utils/characterDerived.js'
import { getFinalSpellTarget } from '../../utils/spellTarget.js'
import { rollSkill, rollAttack, rollSpell, weaponModifier } from '../../utils/rollActions.js'
import { formatRoll } from '../../utils/rollFormat.js'
import styles from './PlayMode.module.css'

const ATTR_LABELS = {
  strength: 'STR', agility: 'AGI', dexterity: 'DEX', endurance: 'END',
  constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', thaumaturgy: 'THA',
  enlightenment: 'EN', charisma: 'CHA', comeliness: 'COM', fame: 'FAM',
}

export default function PlayMode({ character, onUpdate, onExit, onToggleNotes, theme, onToggleTheme, readOnly = false, onRoll }) {
  const defense = calcDefense(character)
  const hp    = character.hitPoints
  const mana  = character.mana
  const sp    = character.storyPoints
  const armor = character.armor

  const [armorDmg, setArmorDmg] = useState('')
  const [lastHit, setLastHit]   = useState(null)
  const [lastRoll, setLastRoll] = useState(null)
  const [targetLevel, setTargetLevel] = useState(1)

  // Read-only viewers (a player opening a character they don't own/aren't
  // assigned, when auth is enabled) can see the sheet but not change counters.
  // Guests on #c=/#play= links stay editable (readOnly defaults to false).
  const mutate = (patch) => { if (readOnly) return; onUpdate(patch) }

  // Spell Target reference (casters only): roll under base(caster vs target) +
  // magic attribute, capped 95. Same calc as the wizard's Step 6.
  const magicAttrVal = character.magicAttribute
    ? attrTotal(character.attributes?.[character.magicAttribute] || {})
    : 0
  const spellTarget = getFinalSpellTarget(character.level, targetLevel, magicAttrVal)
  const spellColor = spellTarget == null ? 'var(--danger)'
    : spellTarget >= 50 ? 'var(--story)'
    : spellTarget >= 30 ? 'var(--bronze)'
    : 'var(--danger)'

  // Apply an incoming hit: armor absorbs up to its soak value (capped by the
  // durability it has left), durability drops by what it absorbed, and any
  // leftover damage passes through to HP.
  function applyArmorHit() {
    const dmg = Math.max(0, Math.floor(Number(armorDmg) || 0))
    if (dmg <= 0) return
    const soak     = armor.absorption || 0
    const absorbed = Math.min(dmg, soak, armor.remaining || 0)
    const overflow = dmg - absorbed
    mutate({
      armor:     { ...armor, remaining: (armor.remaining || 0) - absorbed },
      hitPoints: { ...hp, current: Math.max(0, (hp.current || 0) - overflow) },
    })
    setLastHit({ dmg, absorbed, overflow })
    setArmorDmg('')
  }

  function repairArmor() {
    mutate({ armor: { ...armor, remaining: armor.max } })
    setLastHit(null)
  }

  // Skill "Use" tracking (PHB: strike a circle each time a skill is used in a
  // session). Clicking a circle sets the count; clicking the highest filled one
  // clears it back, so you can correct mistakes.
  function toggleSkillUse(skillId, pipIdx) {
    const skills = (character.skills || []).map(s => {
      if (s.id !== skillId) return s
      const newPips = s.usePips === pipIdx + 1 ? pipIdx : pipIdx + 1
      return { ...s, usePips: newPips }
    })
    mutate({ skills })
  }

  // Inventory editing during play. Items may be legacy strings or objects;
  // normalize to { name, quantity, notes } on edit (the schema accepts both).
  function addInventoryItem() {
    mutate({ inventory: [...(character.inventory || []), { name: '', quantity: '', notes: '' }] })
  }
  function updateInventoryItem(i, patch) {
    const inventory = (character.inventory || []).map((it, idx) => {
      if (idx !== i) return it
      const obj = typeof it === 'string' ? { name: it, quantity: '', notes: '' } : it
      return { ...obj, ...patch }
    })
    mutate({ inventory })
  }
  function removeInventoryItem(i) {
    mutate({ inventory: (character.inventory || []).filter((_, idx) => idx !== i) })
  }

  // A non-positive total means the cap is unknown (e.g. a play link generated
  // before Resources were synced); treat it as no cap so the GM can still raise
  // the value rather than being pinned at 0.
  const capOf = (total) => (total > 0 ? total : Infinity)

  function adjustHP(delta) {
    const newCurrent = Math.max(0, Math.min(capOf(hp.total), (hp.current || 0) + delta))
    mutate({ hitPoints: { ...hp, current: newCurrent } })
  }

  function adjustMana(delta) {
    const newCurrent = Math.max(0, Math.min(capOf(mana.total), (mana.current || 0) + delta))
    mutate({ mana: { ...mana, current: newCurrent } })
  }

  function adjustSP(delta) {
    const newCurrent = Math.max(0, Math.min(capOf(sp.total), (sp.current || 0) + delta))
    mutate({ storyPoints: { ...sp, current: newCurrent } })
  }

  // Dice rolls are ephemeral — shown in the result banner, never persisted.
  // Skills and attacks roll d100 + one modifier and display the total for the
  // GM to adjudicate verbally; spells roll under the computed Spell Target and
  // resolve pass/fail in-app (the target is fully known). Each roll is also
  // pushed to the shared table feed via onRoll (a no-op when cloud is off).
  const emitRoll = (entry) => {
    setLastRoll(entry)
    onRoll?.({ ...entry, actor: character.name || character.playerName || 'Someone' })
  }
  function rollSkillCheck(skill) {
    emitRoll({ kind: 'total', label: skill.name, ...rollSkill(character, skill) })
  }
  function rollWeapon(weapon) {
    emitRoll({ kind: 'total', label: weapon.name || 'Attack', ...rollAttack(character, weapon) })
  }
  function rollSpellCheck() {
    emitRoll({ kind: 'spell', label: `Spell vs Lvl ${targetLevel}`, ...rollSpell(character, targetLevel) })
  }

  return (
    <div className={styles.playMode}>
      <header className={styles.header}>
        <div className={styles.charInfo}>
          <h1>{character.name || 'Unnamed'}</h1>
          <span>{character.race} · {character.archetype === 'custom' ? (character.customArchetypeName || 'Custom') : character.archetype} · Level {character.level}{character.playerName ? ` · played by ${character.playerName}` : ''}</span>
        </div>
        <div className={styles.headerActions}>
          {onToggleTheme && (
            <button className="btn-secondary" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          )}
          <button className="btn-secondary" onClick={onToggleNotes}>Notes</button>
          {!readOnly && <button className="btn-secondary" onClick={onExit}>← Edit</button>}
        </div>
      </header>

      <div className={styles.content}>
        {lastRoll && <RollResult roll={lastRoll} onClear={() => setLastRoll(null)} />}
        {/* Counters */}
        <div className={styles.counters}>
          <Counter
            label="Hit Points"
            current={hp.current || 0}
            total={hp.total || 0}
            color="var(--hp)"
            onAdjust={adjustHP}
            readOnly={readOnly}
          />
          {character.hasMagic && (
            <Counter
              label="Mana"
              current={mana.current || 0}
              total={mana.total || 0}
              color="var(--mana)"
              onAdjust={adjustMana}
              readOnly={readOnly}
            />
          )}
          {/* Spell Target sits directly under Mana (magic grouping) */}
          {character.hasMagic && character.magicAttribute && (
            <div className={styles.spellTile}>
              <div className={styles.counterLabel} style={{ color: 'var(--mana)' }}>Spell Target</div>
              <div className={styles.armorAbsorb}>
                L{character.level} caster · {ATTR_LABELS[character.magicAttribute] || character.magicAttribute} {magicAttrVal} · roll under
              </div>
              <div className={styles.spellRow}>
                <label className={styles.spellSel}>
                  <span>vs Target Lvl</span>
                  <select value={targetLevel} onChange={e => setTargetLevel(parseInt(e.target.value))} aria-label="Target level">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <div className={styles.spellResult}>
                  <span className={styles.spellNum} style={{ color: spellColor }}>{spellTarget ?? '—'}%</span>
                  <button className={styles.rollBtn} onClick={rollSpellCheck} disabled={spellTarget == null}>Roll</button>
                </div>
              </div>
            </div>
          )}
          <Counter
            label="Story Points"
            current={sp.current || 0}
            total={sp.total || 0}
            color="var(--story)"
            onAdjust={adjustSP}
            readOnly={readOnly}
          />
          {armor.type !== 'none' && (
            <div className={styles.armorCounter}>
              <div className={styles.counterLabel} style={{ color: 'var(--armor)' }}>Armor</div>
              <div className={styles.armorAbsorb}>Soak {armor.absorption} (absorbs up to) · {armor.type}</div>
              <div className={styles.counterDisplay}>
                <span className={styles.counterValue} style={{ color: 'var(--armor)' }}>
                  {armor.remaining}<span className={styles.counterTotal}>/{armor.max}</span>
                </span>
              </div>
              <div className={styles.counterBar}>
                <div
                  className={styles.counterFill}
                  style={{ width: `${armor.max > 0 ? Math.min(100, (armor.remaining / armor.max) * 100) : 0}%`, background: 'var(--armor)' }}
                />
              </div>
              <div className={styles.armorHitRow}>
                <input
                  type="number"
                  min="0"
                  className={styles.armorInput}
                  placeholder="dmg"
                  aria-label="Incoming damage"
                  value={armorDmg}
                  onChange={e => setArmorDmg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyArmorHit() }}
                />
                <button className={styles.quickBtn} onClick={applyArmorHit}>Apply hit</button>
                <button className={styles.quickBtn} onClick={repairArmor}>Repair</button>
              </div>
              {lastHit && (
                <div className={styles.hitBanner}>
                  <span className={styles.hitBannerTitle}>Hit: {lastHit.dmg} damage</span>
                  <span className={styles.hitBannerDetail}>
                    Armor absorbed {lastHit.absorbed}
                    {lastHit.overflow > 0
                      ? <> · <strong>{lastHit.overflow} damage to HP</strong></>
                      : <> · <strong>Fully blocked</strong></>
                    }
                  </span>
                </div>
              )}
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
                  <span className={styles.weaponBonus}>+{weaponModifier(w)}</span>
                  <span className={styles.weaponDesc}>{w.descriptor}</span>
                  <button className={styles.rollBtn} onClick={() => rollWeapon(w)}>Attack</button>
                </div>
              ))}
            </section>
          )}

          {/* Skills quick-ref */}
          {character.skills?.length > 0 && (
            <section className={styles.refSection}>
              <h3>Skills</h3>
              {character.skills.map(s => (
                <div key={s.id} className={styles.skillRow}>
                  <div className={styles.skillItem}>
                    <span>{s.isSpecialty ? '★ ' : ''}{s.name}</span>
                    <span className={styles.skillRight}>
                      <strong>{calcSkillTotal(s)}</strong>
                      <button className={styles.rollBtn} onClick={() => rollSkillCheck(s)}>Roll</button>
                    </span>
                  </div>
                  <div className={styles.usePips} role="group" aria-label={`Use tracking for ${s.name}`}>
                    {[0,1,2,3,4].map(i => (
                      <button
                        key={i}
                        className={`${styles.usePip} ${i < (s.usePips || 0) ? styles.usePipFilled : ''}`}
                        onClick={() => toggleSkillUse(s.id, i)}
                        aria-pressed={i < (s.usePips || 0)}
                        aria-label={`Use ${i + 1} of 5 for ${s.name}`}
                      />
                    ))}
                  </div>
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
                  <strong>+{p.attributeType
                    ? attrTotal(character.attributes[p.attributeType] || {}) + (p.powerBonus || 0)
                    : (p.base||0)+(p.attributeBonus||0)+(p.skillBonus||0)+(p.misc||0)
                  }</strong>
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

          {/* Inventory — editable during play (add / edit name·qty·notes / remove) */}
          <section className={styles.refSection}>
            <h3>Inventory</h3>
            {(character.inventory || []).map((item, i) => {
              const obj = typeof item === 'string' ? { name: item, quantity: '', notes: '' } : item
              return (
                <div key={i} className={styles.invRow}>
                  <input
                    className={styles.invInput}
                    value={obj.name || ''}
                    placeholder="Item"
                    onChange={e => updateInventoryItem(i, { name: e.target.value })}
                    aria-label={`Item ${i + 1} name`}
                  />
                  <input
                    className={styles.invQty}
                    value={obj.quantity ?? ''}
                    placeholder="Qty"
                    onChange={e => updateInventoryItem(i, { quantity: e.target.value })}
                    aria-label={`Item ${i + 1} quantity`}
                  />
                  <input
                    className={styles.invInput}
                    value={obj.notes || ''}
                    placeholder="Notes"
                    onChange={e => updateInventoryItem(i, { notes: e.target.value })}
                    aria-label={`Item ${i + 1} notes`}
                  />
                  <button
                    className={styles.invRemove}
                    onClick={() => removeInventoryItem(i)}
                    aria-label={`Remove item ${i + 1}`}
                  >✕</button>
                </div>
              )
            })}
            {(character.inventory || []).length === 0 && (
              <p className={styles.invEmpty}>No items yet.</p>
            )}
            <button className={styles.quickBtn} onClick={addInventoryItem} style={{ marginTop: 8 }}>
              + Add item
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}

function Counter({ label, current, total, color, onAdjust, readOnly = false }) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0
  return (
    <div className={styles.counter}>
      <div className={styles.counterLabel} style={{ color }}>{label}</div>
      <div className={styles.counterDisplay}>
        <button className={styles.adjBtn} onClick={() => onAdjust(-1)} disabled={readOnly}>−</button>
        <span className={styles.counterValue} style={{ color }}>
          {current}<span className={styles.counterTotal}>/{total}</span>
        </span>
        <button className={styles.adjBtn} onClick={() => onAdjust(+1)} disabled={readOnly}>+</button>
      </div>
      <div className={styles.counterBar}>
        <div className={styles.counterFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      {!readOnly && (
        <div className={styles.quickAdj}>
          {[-5,-3,-1,1,3,5].map(d => (
            <button key={d} className={styles.quickBtn} onClick={() => onAdjust(d)}>
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Shared roll-result banner. For skills/attacks it shows the total to read aloud
// (the GM adjudicates); for spells it resolves pass/fail against the known target.
function RollResult({ roll, onClear }) {
  const { color, headline, detail } = formatRoll(roll)
  return (
    <div className={styles.rollResult} role="status" aria-live="polite" style={{ '--roll-color': color }}>
      <div className={styles.rollHeadline} style={{ color }}>{headline}</div>
      <div className={styles.rollMeta}>
        <span className={styles.rollLabel}>{roll.label}</span>
        <span className={styles.rollDetail}>{detail}</span>
      </div>
      <button className={styles.rollClear} onClick={onClear} aria-label="Clear roll">✕</button>
    </div>
  )
}
