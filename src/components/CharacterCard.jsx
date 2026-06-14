import { useState } from 'react'
import { encodeCharacterToPlayURL } from '../utils/urlState.js'
import styles from './CharacterCard.module.css'

export default function CharacterCard({ entry, onLoad, onDelete, onGetCharacter }) {
  const [copied, setCopied] = useState(false)

  function handleCopyPlayLink() {
    const char = onGetCharacter(entry.id)
    if (!char) return
    const url = encodeCharacterToPlayURL(char)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
        <button className="btn-secondary" onClick={handleCopyPlayLink}>
          {copied ? 'Copied!' : 'Copy play link'}
        </button>
        <button className="btn-danger" onClick={() => onDelete(entry.id)}>Delete</button>
      </div>
    </div>
  )
}
