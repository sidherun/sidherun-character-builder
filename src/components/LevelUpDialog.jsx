import { levelUpPreview, canLevelUp } from '../utils/leveling.js'
import styles from './LevelUpDialog.module.css'

// Level-up summary + confirm (#134). Sidherun level-up only grows the skill-point
// pool; everything else (HP via attributes, powers) is freeform, so this dialog
// explains what changes and then hands off to the Skills editor to allocate.
export default function LevelUpDialog({ character, onConfirm, onClose }) {
  const p = levelUpPreview(character)
  const eligible = canLevelUp(character)
  const xp = character.xp?.current || 0

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Level up">
      <div className={styles.dialog}>
        <h2 className={styles.title}>Level Up</h2>

        {p.atMax ? (
          <p className={styles.body}>{character.name || 'This character'} is already at the maximum level ({p.from}).</p>
        ) : (
          <>
            <p className={styles.levelLine}>
              Level {p.from} <span className={styles.arrow}>→</span> <strong className={styles.toLevel}>{p.to}</strong>
            </p>
            <ul className={styles.changes}>
              <li><strong>+{p.addedPoints} skill points</strong> — pool grows {p.poolBefore} → {p.poolAfter}.</li>
              <li>Spend them in the <strong>Skills</strong> editor; your filled use-circles justify where they go.</li>
              <li>HP, Mana, attributes and powers are edited by hand as your story warrants.</li>
            </ul>
            {!eligible && (
              <p className={styles.warn}>
                XP is {xp.toLocaleString()} — level {p.to} normally needs {p.xpToReach?.toLocaleString() ?? '—'}.
                Leveling anyway (GM discretion).
              </p>
            )}
          </>
        )}

        <div className={styles.actions}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {!p.atMax && (
            <button className="btn-primary" onClick={onConfirm}>Level up to {p.to} →</button>
          )}
        </div>
      </div>
    </div>
  )
}
