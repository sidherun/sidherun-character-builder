import { useState, Fragment } from 'react'
import { useFocusOnAdd } from '../../hooks/useFocusOnAdd.js'
import { calcDefense, calcHitPoints, calcMana, attrTotal, calcSkillTotal } from '../../utils/characterDerived.js'
import { skillBudget } from '../../utils/skillPoints.js'
import { canLevelUp, applyLevelUp } from '../../utils/leveling.js'
import { ITEM_DICTIONARY } from '../../utils/spellcheck.js'
import { weaponModifier } from '../../utils/rollActions.js'
import { weaponDamageLabel } from '../../utils/weaponDamage.js'
import LevelUpDialog from '../LevelUpDialog.jsx'
import SpellSuggest from '../SpellSuggest.jsx'
import { encodeCharacterToURL } from '../../utils/urlState.js'
import { generateCharacterHTML } from '../../utils/generateCharacterHTML.js'
import styles from './Step9Review.module.css'

const ATTR_LABELS = {
  strength: 'Strength', agility: 'Agility', dexterity: 'Dexterity',
  endurance: 'Endurance', constitution: 'Constitution', intelligence: 'Intelligence',
  wisdom: 'Wisdom', thaumaturgy: 'Thaumaturgy', enlightenment: 'Enlightenment',
  charisma: 'Charisma', comeliness: 'Comeliness', fame: 'Fame',
}

// Per-section edit affordance on the character sheet (manage mode only). Renders
// nothing in the wizard's read-only Review (no onEdit passed).
function EditBtn({ step, label, onEdit }) {
  if (!onEdit) return null
  return (
    <button type="button" className={styles.editBtn} onClick={() => onEdit(step)} aria-label={label} title={label}>
      ✎ Edit
    </button>
  )
}

export default function Step9Review({ character, onEnterPlayMode, onSaveToRoster, addToast, onUpdate, onEditSection }) {
  const defense  = calcDefense(character)
  const calcedHP = calcHitPoints(character)
  const calcedMana = calcMana(character)

  // `editable` = the manage-mode character sheet (per-section ✎ + inline
  // inventory). When absent (the wizard's Review step), this stays a read-only
  // summary, exactly as before.
  const editable = Boolean(onEditSection)

  // Skills-only point budget (#178). Shown while editing; drives the GM-visible
  // over-budget badge (also surfaced on the roster card + GM screen).
  const budget = editable ? skillBudget(character) : null

  // Level-up flow (#134). The button is always available (GM discretion) but
  // cues when XP has crossed the threshold. Confirming applies the level bump +
  // baseline snapshot, then drops into the Skills editor to spend the new points.
  const [showLevelUp, setShowLevelUp] = useState(false)
  const levelReady = editable && canLevelUp(character)
  function confirmLevelUp() {
    onUpdate?.(applyLevelUp(character))
    setShowLevelUp(false)
    onEditSection?.(7)
  }

  // Inline inventory editing on the sheet — inventory has no wizard editor of its
  // own, and "add a potion" is the headline use case. Mirrors Play Mode: "Add
  // item" focuses the new Name field, Enter in Notes commits + adds (#153, #185).
  const invFocus = useFocusOnAdd()
  function addInventoryItem() {
    const inventory = [...(character.inventory || []), { name: '', quantity: '', notes: '' }]
    invFocus.markLast(inventory.length)
    onUpdate?.({ inventory })
  }
  function updateInventoryItem(i, patch) {
    const inventory = (character.inventory || []).map((it, idx) => {
      if (idx !== i) return it
      const obj = typeof it === 'string' ? { name: it, quantity: '', notes: '' } : it
      return { ...obj, ...patch }
    })
    onUpdate?.({ inventory })
  }
  function removeInventoryItem(i) {
    onUpdate?.({ inventory: (character.inventory || []).filter((_, idx) => idx !== i) })
  }

  // Record a homebrew item name so the spell check stops flagging it (#157).
  function keepTerm(term) {
    const dict = character._dictionary || []
    if (term && !dict.includes(term)) onUpdate?.({ _dictionary: [...dict, term] })
  }

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
            {character.playerName ? ` · played by ${character.playerName}` : ''}
            <EditBtn step={2} label="Edit identity — race, archetype, level, powers/magic" onEdit={onEditSection} />
          </p>
        </div>
        <div className={styles.headerActions}>
          {editable && (
            <button
              className="btn-secondary"
              onClick={() => setShowLevelUp(true)}
              title={levelReady ? 'XP threshold reached — ready to level up' : 'Level up (GM discretion)'}
            >
              ⬆ Level Up{levelReady && <span className={styles.levelDot} aria-label="XP threshold reached">●</span>}
            </button>
          )}
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

      {/* Resources */}
      {editable && (
        <h3 className={styles.resourcesHead}>Resources<EditBtn step={8} label="Edit resources — HP, Mana, Story Points, XP" onEdit={onEditSection} /></h3>
      )}
      <div className={styles.resourcesRow}>
        <div className={styles.resourceChip} style={{ borderColor: 'var(--hp)' }}>
          <span>HP</span>
          <strong>{character.hitPoints?.current ?? calcedHP} / {character.hitPoints?.total || calcedHP}</strong>
        </div>
        {character.hasMagic && (
          <div className={styles.resourceChip} style={{ borderColor: 'var(--mana)' }}>
            <span>Mana</span>
            <strong>{character.mana?.current ?? calcedMana} / {character.mana?.total || calcedMana}</strong>
          </div>
        )}
        <div className={styles.resourceChip} style={{ borderColor: 'var(--story)' }}>
          <span>Story Pts</span>
          <strong>{character.storyPoints?.current} / {character.storyPoints?.total}</strong>
        </div>
        {character.armor?.type !== 'none' && (
          <div className={styles.resourceChip} style={{ borderColor: 'var(--armor)' }}>
            <span>Armor</span>
            <strong>{character.armor.remaining} / {character.armor.max}</strong>
          </div>
        )}
        <div className={styles.resourceChip} style={{ borderColor: 'var(--bronze)' }}>
          <span>XP</span>
          <strong>{(character.xp?.current || 0).toLocaleString()}</strong>
        </div>
      </div>

      <div className={styles.columns}>
        {/* Left column */}
        <div className={styles.left}>
          {/* Attributes */}
          <section className={styles.section}>
            <h3>Attributes<EditBtn step={3} label="Edit attributes" onEdit={onEditSection} /></h3>
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
            <h3>Defense<EditBtn step={4} label="Edit combat — defense" onEdit={onEditSection} /></h3>
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
          {/* Weapons — always shown when editing so an empty section isn't a dead-end */}
          {(editable || character.weapons?.length > 0) && (
            <section className={styles.section}>
              <h3>Weapons<EditBtn step={4} label="Edit combat — weapons" onEdit={onEditSection} /></h3>
              {character.weapons?.length > 0 ? (
                character.weapons.map(w => {
                  const total = weaponModifier(w) // non-stacking: skill OR attribute, matches the attack roll
                  return (
                    <div key={w.id} className={styles.weaponRow}>
                      <span className={styles.weaponName}>{w.name || '—'}</span>
                      <span className={styles.weaponAttr}>{w.attribute}</span>
                      <span className={styles.weaponTotal}>+{total}</span>
                      <span className={styles.weaponDesc}>
                        {weaponDamageLabel(w)}{(w.damageNeedsReview || w.rangeNeedsReview) ? ' ⚠ needs review' : ''}
                        {w.descriptor ? ` · ${w.descriptor}` : ''}
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className={styles.emptyHint}>No weapons yet. <button type="button" className={styles.addLink} onClick={() => onEditSection(4)}>+ Add a weapon</button></p>
              )}
            </section>
          )}

          {/* Skills — with the point-budget indicator + GM-visible over-budget flag */}
          {(editable || character.skills?.length > 0) && (
            <section className={styles.section}>
              <h3>
                Skills
                {character.skills?.some(s => s.isSpecialty) && <span className={styles.starNote}>★ = Specialty</span>}
                {editable && budget && (
                  <span className={budget.overBudget ? styles.budgetOver : styles.budget}>
                    {budget.used}/{budget.pool} pts
                    {budget.overBudget ? ' ⚠ over budget' : budget.available > 0 ? ` · +${budget.available} unspent` : ''}
                  </span>
                )}
                <EditBtn step={7} label="Edit skills" onEdit={onEditSection} />
              </h3>
              {character.skills?.length > 0 ? (
                character.skills.map(s => (
                  <div key={s.id} className={styles.skillRow}>
                    <span className={styles.skillName}>
                      {s.isSpecialty && '★ '}{s.name || '—'}
                    </span>
                    <span className={styles.skillAttr}>{s.attributeName}</span>
                    <span className={styles.skillTotal}>{calcSkillTotal(s)}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyHint}>No skills yet. <button type="button" className={styles.addLink} onClick={() => onEditSection(7)}>+ Add a skill</button></p>
              )}
            </section>
          )}

          {/* Powers — gated by the hasPowers capability (toggled in Identity) */}
          {character.hasPowers && (editable || character.powers?.length > 0) && (
            <section className={styles.section}>
              <h3>Powers<EditBtn step={5} label="Edit powers" onEdit={onEditSection} /></h3>
              {character.powers?.length > 0 ? (
                character.powers.map(p => {
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
                })
              ) : (
                <p className={styles.emptyHint}>No powers yet. <button type="button" className={styles.addLink} onClick={() => onEditSection(5)}>+ Add a power</button></p>
              )}
            </section>
          )}

          {/* Crafts — gated by the hasMagic capability (toggled in Identity) */}
          {character.hasMagic && (editable || character.crafts?.length > 0) && (
            <section className={styles.section}>
              <h3>Magic Crafts<EditBtn step={6} label="Edit magic" onEdit={onEditSection} /></h3>
              {character.crafts?.length > 0 ? (
                character.crafts.map(c => (
                  <div key={c.id} className={styles.craftRow}>
                    <span className={styles.craftName}>{c.name || '—'}</span>
                    <span className={styles.craftAttr}>{c.attributeName}</span>
                    <span className={styles.craftTotal}>{(c.attributeValue||0) + (c.skillBonus||0) + (c.misc||0)}</span>
                    {c.description && <span className={styles.craftDesc}>{c.description}</span>}
                  </div>
                ))
              ) : (
                <p className={styles.emptyHint}>No crafts yet. <button type="button" className={styles.addLink} onClick={() => onEditSection(6)}>+ Add a craft</button></p>
              )}
            </section>
          )}
          {/* Inventory — inline-editable on the sheet; read-only in the wizard review */}
          {(editable || character.inventory?.length > 0) && (
            <section className={styles.section}>
              <h3>Inventory</h3>
              {editable ? (
                <>
                  {(character.inventory || []).map((item, i) => {
                    const obj = typeof item === 'string' ? { name: item, quantity: '', notes: '' } : item
                    return (
                      <Fragment key={i}>
                        <div className={styles.invRow}>
                          <input className={styles.invInput} value={obj.name || ''} placeholder="Item"
                            ref={invFocus.focusRef(i)}
                            onChange={e => updateInventoryItem(i, { name: e.target.value })} aria-label={`Item ${i + 1} name`} />
                          <input className={styles.invQty} value={obj.quantity ?? ''} placeholder="Qty"
                            onChange={e => updateInventoryItem(i, { quantity: e.target.value })} aria-label={`Item ${i + 1} quantity`} />
                          <input className={styles.invInput} value={obj.notes || ''} placeholder="Notes"
                            onChange={e => updateInventoryItem(i, { notes: e.target.value })}
                            onKeyDown={invFocus.enterAdds(addInventoryItem)}
                            aria-label={`Item ${i + 1} notes`} />
                          <button type="button" className={styles.invRemove} onClick={() => removeInventoryItem(i)} aria-label={`Remove item ${i + 1}`}>✕</button>
                        </div>
                        <SpellSuggest
                          value={obj.name || ''}
                          dictionary={ITEM_DICTIONARY}
                          custom={character._dictionary || []}
                          onAccept={name => updateInventoryItem(i, { name })}
                          onKeep={keepTerm}
                        />
                      </Fragment>
                    )
                  })}
                  {(character.inventory || []).length === 0 && <p className={styles.invEmpty}>No items yet.</p>}
                  <button type="button" className="btn-secondary" onClick={addInventoryItem} style={{ marginTop: 8 }}>+ Add item</button>
                </>
              ) : (
                character.inventory.map((item, i) => {
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
                })
              )}
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

      {showLevelUp && (
        <LevelUpDialog character={character} onConfirm={confirmLevelUp} onClose={() => setShowLevelUp(false)} />
      )}
    </div>
  )
}
