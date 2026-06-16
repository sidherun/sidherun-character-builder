import { useState, useRef } from 'react'
import { loadRoster, deleteCharacterFromRoster, loadCharacterFromRoster, saveCharacterToRoster, saveCurrent, loadCurrent, clearCurrent } from '../utils/rosterStorage.js'
import { generateBatchHTML } from '../utils/generateCharacterHTML.js'
import { buildRosterBackup, extractCharacters, validateCharacters, extractCloudState } from '../utils/rosterBackup.js'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { pushRoster, ensureGmKey, getGmKey, getCloudMap, importCloudState, deleteCloudCharacter } from '../utils/cloudSync.js'
import { sortRoster, SORT_KEYS } from '../utils/rosterSort.js'
import CharacterCard from '../components/CharacterCard.jsx'
import styles from './RosterPage.module.css'

export default function RosterPage({ onNavigate, theme, onToggleTheme }) {
  const [roster, setRoster] = useState(() => loadRoster())
  const [sortKey, setSortKey] = useState(() => {
    try { return localStorage.getItem('sidherun_roster_sort') || 'name' } catch { return 'name' }
  })
  const [status, setStatus] = useState('')
  const [pushing, setPushing] = useState(false)
  const restoreRef = useRef(null)

  // Push the whole local roster to the cloud (idempotent: already-synced
  // characters are updated, not duplicated). Opt-in entry point for cloud sync.
  async function handlePushToCloud() {
    const chars = roster.map(e => loadCharacterFromRoster(e.id)).filter(Boolean)
    if (chars.length === 0) return
    setPushing(true)
    setStatus('Pushing roster to cloud…')
    try {
      const { created, updated, failed } = await pushRoster(chars)
      const parts = [`Synced to cloud: ${created} new, ${updated} updated.`]
      if (failed) parts.push(`${failed} failed.`)
      setStatus(parts.join(' '))
    } catch {
      setStatus('Cloud push failed — your local characters are unaffected.')
    } finally {
      setPushing(false)
    }
  }

  function handleCopyGmKey() {
    const key = ensureGmKey()
    navigator.clipboard?.writeText(key).then(
      () => setStatus('GM key copied — keep it to manage these characters from another device.'),
      () => setStatus(`GM key: ${key}`),
    )
  }

  // Download the whole roster as one portable JSON file. localStorage is
  // per-origin/per-browser, so this is the cross-device / pre-migration backup.
  function handleBackup() {
    const chars = roster.map(e => loadCharacterFromRoster(e.id)).filter(Boolean)
    if (chars.length === 0) return
    const backup = buildRosterBackup(chars, new Date().toISOString(), { gmKey: getGmKey(), cloudMap: getCloudMap() })
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
      try {
        const parsed = JSON.parse(await f.text())
        candidates.push(...extractCharacters(parsed))
        importCloudState(extractCloudState(parsed)) // restore GM key + cloud map if present
      } catch { unreadable++ }
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

  async function handleDelete(id) {
    if (!confirm('Delete this character? This cannot be undone.')) return
    if (cloudEnabled) await deleteCloudCharacter(id) // best-effort cloud row delete
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
            <button className="btn-secondary" onClick={() => onNavigate('gm')}>
              GM Screen
            </button>
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
          {cloudEnabled && roster.length > 0 && (
            <button className="btn-secondary" onClick={handlePushToCloud} disabled={pushing}>
              {pushing ? 'Syncing…' : 'Push to cloud'}
            </button>
          )}
          {cloudEnabled && (
            <button className="btn-secondary" onClick={handleCopyGmKey}>
              Copy GM key
            </button>
          )}
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
        ) : (() => {
          const { withPlayer, noPlayer } = sortRoster(roster, sortKey)
          const card = entry => (
            <CharacterCard
              key={entry.id}
              entry={entry}
              onLoad={handleLoad}
              onDelete={handleDelete}
              onGetCharacter={loadCharacterFromRoster}
            />
          )
          return (
            <>
              {roster.length > 1 && (
                <div className={styles.sortbar}>
                  <label htmlFor="roster-sort">Sort by</label>
                  <select
                    id="roster-sort"
                    value={sortKey}
                    onChange={e => {
                      setSortKey(e.target.value)
                      try { localStorage.setItem('sidherun_roster_sort', e.target.value) } catch { /* ignore */ }
                    }}
                  >
                    {SORT_KEYS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
              )}
              {withPlayer.length > 0 && <div className={styles.grid}>{withPlayer.map(card)}</div>}
              {withPlayer.length > 0 && noPlayer.length > 0 && (
                <div className={styles.cutLine}>No player assigned</div>
              )}
              {noPlayer.length > 0 && <div className={styles.grid}>{noPlayer.map(card)}</div>}
            </>
          )
        })()}
      </main>
    </div>
  )
}
