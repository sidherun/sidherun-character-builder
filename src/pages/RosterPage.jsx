import { useState } from 'react'
import { loadRoster, deleteCharacterFromRoster, loadCharacterFromRoster, saveCurrent, clearCurrent } from '../utils/rosterStorage.js'
import { generateBatchHTML } from '../utils/generateCharacterHTML.js'
import CharacterCard from '../components/CharacterCard.jsx'
import styles from './RosterPage.module.css'

export default function RosterPage({ onNavigate }) {
  const [roster, setRoster] = useState(() => loadRoster())

  function handleLoad(id) {
    const char = loadCharacterFromRoster(id)
    if (char) {
      // Always open the character sheet (Review / step 9), not whatever wizard
      // step the character was saved at. A character at step 1 (e.g. an import
      // that omitted wizardStep, which the schema defaults to 1) would otherwise
      // land on the welcome screen instead of the sheet.
      saveCurrent({ ...char, wizardStep: 9 })
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

  // Clear the saved "current" slot first, otherwise App re-opens the last
  // character (loadCurrent) instead of starting blank. The roster entries
  // themselves are untouched.
  function handleNew() {
    clearCurrent()
    onNavigate('app')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.brand}
          onClick={() => onNavigate('app')}
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
          <button className="btn-primary" onClick={handleNew}>
            + New Character
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {roster.length === 0 ? (
          <div className={styles.empty}>
            <p>No saved characters yet.</p>
            <button className="btn-primary" onClick={handleNew}>
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
