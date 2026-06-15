import { useState, useRef } from 'react'
import { loadRoster, deleteCharacterFromRoster, loadCharacterFromRoster, saveCharacterToRoster, saveCurrent, loadCurrent, clearCurrent } from '../utils/rosterStorage.js'
import { generateBatchHTML } from '../utils/generateCharacterHTML.js'
import { buildRosterBackup, extractCharacters, validateCharacters } from '../utils/rosterBackup.js'
import CharacterCard from '../components/CharacterCard.jsx'
import styles from './RosterPage.module.css'

export default function RosterPage({ onNavigate, theme, onToggleTheme }) {
  const [roster, setRoster] = useState(() => loadRoster())
  const [status, setStatus] = useState('')
  const restoreRef = useRef(null)

  // Download the whole roster as one portable JSON file. localStorage is
  // per-origin/per-browser, so this is the cross-device / pre-migration backup.
  function handleBackup() {
    const chars = roster.map(e => loadCharacterFromRoster(e.id)).filter(Boolean)
    if (chars.length === 0) return
    const backup = buildRosterBackup(chars, new Date().toISOString())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sidherun-roster-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10000)
    setStatus(`Backed up ${chars.length} character${chars.length === 1 ? '' : 's'}.`)
  }

  // Restore from one or more files. Each file may be a backup wrapper, a bare
  // array, or a single character (so this also bulk-imports individual
  // *-import.json files). Valid characters are upserted into the roster.
  async function handleRestore(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    const candidates = []
    let unreadable = 0
    for (const f of files) {
      try { candidates.push(...extractCharacters(JSON.parse(await f.text()))) }
      catch { unreadable++ }
    }
    const { valid, invalid } = validateCharacters(candidates)
    valid.forEach(saveCharacterToRoster)
    setRoster(loadRoster())
    const parts = [`Restored ${valid.length} character${valid.length === 1 ? '' : 's'}.`]
    if (invalid) parts.push(`${invalid} invalid skipped.`)
    if (unreadable) parts.push(`${unreadable} unreadable file${unreadable === 1 ? '' : 's'}.`)
    setStatus(parts.join(' '))
  }

  function handleGoHome() {
    const current = loadCurrent()
    if (current) saveCurrent({ ...current, wizardStep: 1 })
    onNavigate('app')
  }

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
          onClick={handleGoHome}
          aria-label="Sidherun — return to home screen"
        >
          <h1>Sidherun</h1>
          <span>Character Roster</span>
        </button>
        <div className={styles.actions}>
          {onToggleTheme && (
            <button className="btn-secondary" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          )}
          {roster.length > 0 && (
            <button className="btn-secondary" onClick={handlePrintAll}>
              Print all ({roster.length})
            </button>
          )}
          {roster.length > 0 && (
            <button className="btn-secondary" onClick={handleBackup}>
              Back up all
            </button>
          )}
          <button className="btn-secondary" onClick={() => restoreRef.current?.click()}>
            Restore…
          </button>
          <button className="btn-primary" onClick={handleNew}>
            + New Character
          </button>
          <input
            ref={restoreRef}
            type="file"
            accept=".json,application/json"
            multiple
            onChange={handleRestore}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {status && (
        <div className={styles.status} role="status" style={{ textAlign: 'center', padding: '0.5rem 1rem', opacity: 0.85 }}>
          {status}
        </div>
      )}

      <main className={styles.main}>
        {roster.length === 0 ? (
          <div className={styles.empty}>
            <p>No saved characters yet.</p>
            <div className={styles.actions}>
              <button className="btn-primary" onClick={handleNew}>
                Create Your First Character
              </button>
              <button className="btn-secondary" onClick={() => restoreRef.current?.click()}>
                Restore from backup
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {roster.map(entry => (
              <CharacterCard
                key={entry.id}
                entry={entry}
                onLoad={handleLoad}
                onDelete={handleDelete}
                onGetCharacter={loadCharacterFromRoster}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
