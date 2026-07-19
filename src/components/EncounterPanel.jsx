import { useEffect, useState } from 'react'
import { uuid } from '../utils/uuid.js'
import {
  emptyEncounter, startEncounter, addNpc, removeCombatant, setInitiative,
  rollInitiative, applyInitiativeRoll, orderedCombatants, advanceTurn, adjustNpcHp, applyNpcDamage,
  loadEncounter, saveEncounter,
} from '../utils/encounter.js'
import styles from './EncounterPanel.module.css'

const blankNpc = () => ({ name: '', maxHp: '', defense: '', armorSoak: '', armorPool: '' })

function HpControls({ name, current, total, onAdjust, onDamage }) {
  const [amount, setAmount] = useState('')

  function apply(direction) {
    const value = Math.floor(Math.abs(Number(amount)))
    if (!Number.isFinite(value) || value <= 0) return
    if (direction < 0) onDamage(value)
    else onAdjust(value)
    setAmount('')
  }

  return (
    <div className={styles.hpControls}>
      <span className={styles.hpValue}>{current}<small>/{total}</small></span>
      <div className={styles.quickRow} aria-label={`Quick HP adjustment for ${name}`}>
        {[-5, -3, -1, 1, 3, 5].map(delta => (
          <button
            key={delta}
            className={styles.smallButton}
            onClick={() => onAdjust(delta)}
            aria-label={`${delta < 0 ? 'Damage' : 'Heal'} ${Math.abs(delta)} HP for ${name}`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>
      <form className={styles.amountRow} onSubmit={e => { e.preventDefault(); apply(-1) }}>
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          aria-label={`HP adjustment amount for ${name}`}
        />
        <button className={styles.smallButton} type="submit">Damage</button>
        <button className={styles.smallButton} type="button" onClick={() => apply(1)}>Heal</button>
      </form>
    </div>
  )
}

export default function EncounterPanel({ characters, seedCharacters, onAdjustPc, onActiveChange, initiativeRoll }) {
  const [encounter, setEncounter] = useState(loadEncounter)
  const [showNpcForm, setShowNpcForm] = useState(false)
  const [npcDraft, setNpcDraft] = useState(blankNpc)

  useEffect(() => { saveEncounter(encounter) }, [encounter])
  useEffect(() => { onActiveChange?.(encounter.active) }, [encounter.active, onActiveChange])
  useEffect(() => {
    if (initiativeRoll) setEncounter(prev => applyInitiativeRoll(prev, initiativeRoll))
  }, [initiativeRoll])

  if (!encounter.active) {
    return (
      <div className={styles.launch}>
        <button
          className={styles.primaryButton}
          disabled={!seedCharacters.length}
          onClick={() => setEncounter(startEncounter(seedCharacters))}
        >
          Start encounter{seedCharacters.length ? ` (${seedCharacters.length} PCs)` : ''}
        </button>
        <span>Initiative, turns, and temporary NPCs stay in this browser session.</span>
      </div>
    )
  }

  const ordered = orderedCombatants(encounter.combatants)
  const characterById = new Map(characters.map(c => [c._rosterId, c]))

  function updateNpcDraft(field, value) {
    setNpcDraft(prev => ({ ...prev, [field]: value }))
  }

  function submitNpc(e) {
    e.preventDefault()
    if (!npcDraft.name.trim() || !(Number(npcDraft.maxHp) > 0)) return
    setEncounter(prev => addNpc(prev, { ...npcDraft, id: `npc:${uuid()}` }))
    setNpcDraft(blankNpc())
    setShowNpcForm(false)
  }

  function endEncounter() {
    if (!window.confirm('End this encounter? Initiative and temporary NPCs will be cleared.')) return
    setEncounter(emptyEncounter())
    setShowNpcForm(false)
  }

  return (
    <section className={styles.panel} aria-label="Encounter mode">
      <div className={styles.toolbar}>
        <div>
          <span className={styles.eyebrow}>Encounter mode</span>
          <strong>{ordered.length} combatant{ordered.length === 1 ? '' : 's'}</strong>
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.secondaryButton} onClick={() => setShowNpcForm(v => !v)}>
            {showNpcForm ? 'Cancel NPC' : '+ Add NPC'}
          </button>
          <button className={styles.primaryButton} disabled={!ordered.length} onClick={() => setEncounter(advanceTurn)}>
            Next turn →
          </button>
          <button className={styles.dangerButton} onClick={endEncounter}>End</button>
        </div>
      </div>

      {showNpcForm && (
        <form className={styles.npcForm} onSubmit={submitNpc}>
          <label>
            <span>Name</span>
            <input value={npcDraft.name} onChange={e => updateNpcDraft('name', e.target.value)} required />
          </label>
          <label>
            <span>HP</span>
            <input type="number" min="1" inputMode="numeric" value={npcDraft.maxHp} onChange={e => updateNpcDraft('maxHp', e.target.value)} required />
          </label>
          <label>
            <span>Defense</span>
            <input type="number" min="0" inputMode="numeric" value={npcDraft.defense} onChange={e => updateNpcDraft('defense', e.target.value)} />
          </label>
          <label>
            <span>Armor / blow</span>
            <input type="number" min="0" inputMode="numeric" value={npcDraft.armorSoak} onChange={e => updateNpcDraft('armorSoak', e.target.value)} />
          </label>
          <label>
            <span>Armor pool</span>
            <input type="number" min="0" inputMode="numeric" value={npcDraft.armorPool} onChange={e => updateNpcDraft('armorPool', e.target.value)} />
          </label>
          <button className={styles.primaryButton} type="submit">Add combatant</button>
        </form>
      )}

      <div className={styles.combatants}>
        {ordered.length === 0 && <p className={styles.empty}>Add an NPC to begin.</p>}
        {ordered.map(combatant => {
          const isCurrent = combatant.id === encounter.currentId
          const character = combatant.type === 'pc' ? characterById.get(combatant.rosterId) : null
          const currentHp = combatant.type === 'pc' ? (character?.hitPoints?.current || 0) : combatant.hp
          const totalHp = combatant.type === 'pc' ? (character?.hitPoints?.total || 0) : combatant.maxHp
          return (
            <article key={combatant.id} className={`${styles.combatant}${isCurrent ? ` ${styles.current}` : ''}`}>
              <div className={styles.identity}>
                <span className={styles.turnMarker}>{isCurrent ? 'Current turn' : combatant.type === 'pc' ? 'Player character' : 'NPC'}</span>
                <strong>{combatant.name}</strong>
                {combatant.type === 'npc' && (
                  <span>Defense {combatant.defense || '—'} · Armor {combatant.armorSoak || 0}/blow · Pool {combatant.armorPool}/{combatant.armorMax}</span>
                )}
              </div>

              <div className={styles.initiative}>
                <label htmlFor={`initiative-${combatant.id}`}>Initiative</label>
                <div>
                  <input
                    id={`initiative-${combatant.id}`}
                    type="number"
                    inputMode="numeric"
                    value={combatant.initiative ?? ''}
                    onChange={e => setEncounter(prev => setInitiative(prev, combatant.id, e.target.value))}
                    aria-label={`Initiative for ${combatant.name}`}
                  />
                  <button className={styles.smallButton} onClick={() => setEncounter(prev => rollInitiative(prev, combatant.id))}>
                    Roll d10{combatant.initiativeBonus ? ` +${combatant.initiativeBonus}` : ''}
                  </button>
                </div>
              </div>

              {combatant.type === 'pc' && !character ? (
                <span className={styles.missing}>Roster character unavailable</span>
              ) : (
                <HpControls
                  name={combatant.name}
                  current={currentHp}
                  total={totalHp}
                  onAdjust={delta => combatant.type === 'pc'
                    ? onAdjustPc(character, 'hp', delta)
                    : setEncounter(prev => delta < 0
                      ? applyNpcDamage(prev, combatant.id, Math.abs(delta))
                      : adjustNpcHp(prev, combatant.id, delta))}
                  onDamage={amount => combatant.type === 'pc'
                    ? onAdjustPc(character, 'hp', -amount)
                    : setEncounter(prev => applyNpcDamage(prev, combatant.id, amount))}
                />
              )}

              <div className={styles.rowActions}>
                {combatant.type === 'npc' && combatant.lastHit && (
                  <span className={styles.hitResult} role="status">
                    {combatant.lastHit.absorbed} blocked · {combatant.lastHit.hpDamage} to HP
                  </span>
                )}
                {combatant.type === 'npc' && (
                  <button className={styles.removeButton} onClick={() => setEncounter(prev => removeCombatant(prev, combatant.id))}>
                    Remove
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
