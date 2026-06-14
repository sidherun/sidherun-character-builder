import { useState } from 'react'
import { encodeCharacterToPlayURL } from '../utils/urlState.js'
import styles from './CharacterCard.module.css'

async function shortenURL(longUrl) {
  const res = await fetch(
    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
  )
  if (!res.ok) throw new Error('TinyURL request failed')
  const short = await res.text()
  if (!short.startsWith('https://')) throw new Error('Unexpected response')
  return short.trim()
}

export default function CharacterCard({ entry, onLoad, onDelete, onGetCharacter }) {
  const [linkState, setLinkState] = useState('idle') // idle | loading | copied | error

  async function handleCopyPlayLink() {
    const char = onGetCharacter(entry.id)
    if (!char) return
    const longUrl = encodeCharacterToPlayURL(char)
    setLinkState('loading')
    try {
      const short = await shortenURL(longUrl)
      await navigator.clipboard.writeText(short)
      setLinkState('copied')
      setTimeout(() => setLinkState('idle'), 2500)
    } catch {
      // Fall back to the long URL so the GM isn't left empty-handed
      await navigator.clipboard.writeText(longUrl).catch(() => {})
      setLinkState('error')
      setTimeout(() => setLinkState('idle'), 2500)
    }
  }

  const btnLabel = { idle: 'Copy play link', loading: 'Shortening…', copied: 'Copied!', error: 'Copied (long)' }

  return (
    <div className={styles.card}>
      <div className={styles.name}>{entry.name || 'Unnamed'}</div>
      <div className={styles.meta}>
        {entry.race} · {entry.archetype === 'custom' ? (entry.customArchetypeName || 'Custom') : entry.archetype} · Level {entry.level}
      </div>
      <div className={styles.hp}>HP: {entry.hp}</div>
      <div className={styles.saved}>
        Saved {new Date(entry.savedAt).toLocaleDateString()}
      </div>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => onLoad(entry.id)}>Load</button>
        <button
          className="btn-secondary"
          onClick={handleCopyPlayLink}
          disabled={linkState === 'loading'}
        >
          {btnLabel[linkState]}
        </button>
        <button className="btn-danger" onClick={() => onDelete(entry.id)}>Delete</button>
      </div>
    </div>
  )
}
