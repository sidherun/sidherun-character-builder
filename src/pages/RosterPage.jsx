import { useState } from 'react'
import { loadRoster, deleteCharacterFromRoster, loadCharacterFromRoster, saveCurrent } from '../utils/rosterStorage.js'
import CharacterCard from '../components/CharacterCard.jsx'
import styles from './RosterPage.module.css'

export default function RosterPage({ onNavigate }) {
  const [roster, setRoster] = useState(() => loadRoster())

  function handleLoad(id) {
    const char = loadCharacterFromRoster(id)
    if (char) {
      saveCurrent(char)
      onNavigate('app')
    }
  }

  function handleDelete(id) {
    if (!confirm('Delete this character? This cannot be undone.')) return
    deleteCharacterFromRoster(id)
    setRoster(loadRoster())
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1>Sidherun</h1>
          <span>Character Roster</span>
        </div>
        <div className={styles.actions}>
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
