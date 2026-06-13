import styles from './CharacterCard.module.css'

export default function CharacterCard({ entry, onLoad, onDelete }) {
  return (
    <div className={styles.card}>
      <div className={styles.name}>{entry.name || 'Unnamed'}</div>
      <div className={styles.meta}>
        {entry.race} · {entry.archetype} · Level {entry.level}
      </div>
      <div className={styles.hp}>HP: {entry.hp}</div>
      <div className={styles.saved}>
        Saved {new Date(entry.savedAt).toLocaleDateString()}
      </div>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => onLoad(entry.id)}>Load</button>
        <button className="btn-danger" onClick={() => onDelete(entry.id)}>Delete</button>
      </div>
    </div>
  )
}
