import { useState } from 'react'
import { loadRoster, deleteCharacterFromRoster, loadCharacterFromRoster, saveCurrent, loadCurrent } from '../utils/rosterStorage.js'
import { generateBatchHTML } from '../utils/generateCharacterHTML.js'
import CharacterCard from '../components/CharacterCard.jsx'
import styles from './RosterPage.module.css'

export default function RosterPage({ onNavigate }) {
  const [roster, setRoster] = useState(() => loadRoster())

  function handleGoHome() {
    const current = loadCurrent()
    if (current) saveCurrent({ ...current, wizardStep: 1 })
    onNavigate('app')
  }

  function handleLoad(id) {
    const char = loadCharacterFromRoster(id)
    if (char) {
      saveCurrent(char)
      onNavigate('app')
    }
  }

  function handlePrintAll() {
    const chars = roster
      .map(entry => loadCharacterFromRoster(entry.id))
      .filter(Boolean)
    if (chars.length === 0) return
    const html = generateBatchHTML(chars)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Revoke after the new tab has had time to load the document.
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  function handleDelete(id) {
    if (!confirm('Delete this character? This cannot be undone.')) return
    deleteCharacterFromRoster(id)
    setRoster(loadRoster())
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.brand}
          onClick={handleGoHome}
          aria-label="Sidherun — return to home screen"
        >
          <h1>Sidherun</h1>
          <span>Character Roster</span>
        </button>
        <div className={styles.actions}>
          {roster.length > 0 && (
            <button className="btn-secondary" onClick={handlePrintAll}>
              🖨 Print all ({roster.length})
            </button>
          )}
          <button className="btn-primary" onClick={() => onNavigate('app')}>
            + New Character
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {roster.length === 0 ? (
          <div className={styles.empty}>
            <p>No saved characters yet.</p>
            <button className="btn-primary" onClick={() => onNavigate('app')}>
              Create Your First Character
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {roster.map(entry => (
              <CharacterCard
                key={entry.id}
                entry={entry}
                onLoad={handleLoad}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
