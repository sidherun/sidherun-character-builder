import { calcHitPoints, calcMana } from '../../utils/characterDerived.js'
import NumberInput from '../NumberInput.jsx'
import xpTable from '../../data/xpTable.json'
import styles from './Step8Resources.module.css'
import { useEffect } from 'react'

function ResourceBlock({ title, total, current, onCurrentChange, color, formula }) {
  return (
    <div className={styles.resourceCard} style={{ borderTopColor: color }}>
      <div className={styles.resourceTitle} style={{ color }}>{title}</div>
      {formula && <div className={styles.formula}>{formula}</div>}
      <div className={styles.resourceRow}>
        <div className={styles.resourceStat}>
          <span>Total</span>
          <strong>{total}</strong>
        </div>
        <div className={styles.resourceStat}>
          <span>Current</span>
          <NumberInput
            value={current}
            onChange={onCurrentChange}
            min={0}
            max={total}
            showZero
          />
        </div>
      </div>
      {total > 0 && (
        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{ width: `${Math.min(100, (current / total) * 100)}%`, background: color }}
          />
        </div>
      )}
    </div>
  )
}

export default function Step8Resources({ character, onUpdate }) {
  const calcedHP   = calcHitPoints(character)
  const calcedMana = calcMana(character)

  // Sync calculated values to character on render
  const hp   = character.hitPoints
  const mana = character.mana
  const sp   = character.storyPoints
  const xp   = character.xp
  const armor = character.armor

  const { raceType, raceSize, ageCategory } = character
  const str = character.attributes.strength.base + character.attributes.strength.racialMod + character.attributes.strength.tempMod
  const end = character.attributes.endurance.base + character.attributes.endurance.racialMod + character.attributes.endurance.tempMod
  const con = character.attributes.constitution.base + character.attributes.constitution.racialMod + character.attributes.constitution.tempMod
  const hpFormula = `(${raceType}×${raceSize}×${ageCategory}) + (${str}+${end})/2 + ${con} = ${calcedHP}`

  const nextLevelRow = xpTable.find(r => r.level === character.level + 1)
  const xpNeeded = nextLevelRow?.xpStart ?? null

  function updateHP(field, val) {
    onUpdate({ hitPoints: { ...hp, [field]: val } })
  }
  function updateMana(field, val) {
    onUpdate({ mana: { ...mana, [field]: val } })
  }
  function updateSP(field, val) {
    onUpdate({ storyPoints: { ...sp, [field]: val } })
  }

  // Auto-sync on first visit (when total is 0, meaning never synced)
  useEffect(() => {
    if (hp.total === 0) {
      onUpdate({
        hitPoints: { ...hp, total: calcedHP, current: calcedHP },
        mana:      { ...mana, total: calcedMana, current: calcedMana },
        xp:        { ...xp, needed: xpNeeded ?? xp.needed },
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync calculated totals
  function syncTotals() {
    onUpdate({
      hitPoints:   { ...hp, total: calcedHP, current: hp.current || calcedHP },
      mana:        { ...mana, total: calcedMana, current: mana.current || calcedMana },
      xp:          { ...xp, needed: xpNeeded ?? xp.needed },
    })
  }

  return (
    <div className={styles.step}>
      <h2>Resources</h2>
      <p className={styles.intro}>
        Hit Points and Mana are calculated from your attributes. Story Points default to 2.
        Click &quot;Sync Calculated Values&quot; to pull the latest from your attributes.
      </p>

      <button className={`btn-secondary ${styles.syncBtn}`} onClick={syncTotals}>
        ↻ Sync Calculated Values
      </button>

      <div className={styles.grid}>
        <ResourceBlock
          title="Hit Points"
          total={hp.total || calcedHP}
          current={hp.current}
          onCurrentChange={val => updateHP('current', val)}
          color="var(--hp)"
          formula={hpFormula}
        />

        {character.hasMagic && (
          <ResourceBlock
            title="Mana"
            total={mana.total || calcedMana}
            current={mana.current}
            onCurrentChange={val => updateMana('current', val)}
            color="var(--mana)"
            formula={`${character.magicAttribute || '—'} total = ${calcedMana}`}
          />
        )}

        <div className={styles.resourceCard} style={{ borderTopColor: 'var(--story)' }}>
          <div className={styles.resourceTitle} style={{ color: 'var(--story)' }}>Story Points</div>
          <div className={styles.formula}>GM awards additional points for great play</div>
          <div className={styles.resourceRow}>
            <div className={styles.resourceStat}>
              <span>Total</span>
              <NumberInput
                value={sp.total}
                onChange={n => updateSP('total', n)}
                min={0}
                showZero
              />
            </div>
            <div className={styles.resourceStat}>
              <span>Current</span>
              <NumberInput
                value={sp.current}
                onChange={n => updateSP('current', n)}
                min={0}
                max={sp.total}
                showZero
              />
            </div>
          </div>
          {sp.total > 0 && (
            <div className={styles.bar}>
              <div
                className={styles.barFill}
                style={{ width: `${Math.min(100, (sp.current / sp.total) * 100)}%`, background: 'var(--story)' }}
              />
            </div>
          )}
        </div>

        {armor.type !== 'none' && (
          <div className={styles.resourceCard} style={{ borderTopColor: 'var(--armor)' }}>
            <div className={styles.resourceTitle} style={{ color: 'var(--armor)' }}>Armor</div>
            <div className={styles.formula}>{armor.absorption} absorption per hit</div>
            <div className={styles.resourceRow}>
              <div className={styles.resourceStat}>
                <span>Remaining</span>
                <NumberInput
                  value={armor.remaining}
                  onChange={n => onUpdate({ armor: { ...armor, remaining: n } })}
                  min={0}
                  max={armor.max}
                  showZero
                />
              </div>
              <div className={styles.resourceStat}>
                <span>Max</span>
                <strong>{armor.max}</strong>
              </div>
            </div>
            {armor.max > 0 && (
              <div className={styles.bar}>
                <div
                  className={styles.barFill}
                  style={{ width: `${Math.min(100, (armor.remaining / armor.max) * 100)}%`, background: 'var(--armor)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="divider" />

      {/* XP */}
      <div className={styles.xpBlock}>
        <h3>Experience Points</h3>
        <div className={styles.xpRow}>
          <label className={styles.xpField}>
            <span>Current XP</span>
            <NumberInput
              value={xp.current}
              onChange={n => onUpdate({ xp: { ...xp, current: n } })}
              min={0}
              showZero
            />
          </label>
          <div className={styles.xpStat}>
            <span>Level {character.level}</span>
            {xpNeeded && <span className={styles.xpNeeded}>Next level at: {xpNeeded.toLocaleString()} XP</span>}
            {!xpNeeded && <span className={styles.xpMax}>Maximum level reached</span>}
          </div>
          {xpNeeded && xp.current > 0 && (
            <div className={styles.bar} style={{ alignSelf: 'flex-end', flex: 1, minWidth: 120 }}>
              <div
                className={styles.barFill}
                style={{
                  width: `${Math.min(100, (xp.current / xpNeeded) * 100)}%`,
                  background: 'var(--bronze)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
