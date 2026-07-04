import { useState, useRef, useEffect } from 'react'
import { loadRoster, deleteCharacterFromRoster, loadCharacterFromRoster, saveCharacterToRoster, saveCurrent, clearCurrent } from '../utils/rosterStorage.js'
import { generateBatchHTML } from '../utils/generateCharacterHTML.js'
import { buildRosterBackup, extractCharacters, validateCharacters, extractCloudState } from '../utils/rosterBackup.js'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { pushRoster, ensureGmKey, getGmKey, getCloudMap, importCloudState, deleteCloudCharacter, syncCharacter } from '../utils/cloudSync.js'
import { repoEnabled, listCharacters, listPlayers, assignPlayer, deleteCharacter as repoDelete, saveCharacterData } from '../utils/characterRepo.js'
import { trackPush } from '../utils/cloudStatus.js'
import { useAuth, isGmOrAdmin } from '../auth/useAuth.js'
import { sortRoster, SORT_KEYS } from '../utils/rosterSort.js'
import { listTables, createTable, renameTable, deleteTable, importTables, toggleMembership, withoutTable } from '../utils/tables.js'
import CharacterCard from '../components/CharacterCard.jsx'
import TablesManager from '../components/TablesManager.jsx'
import styles from './RosterPage.module.css'

// Project a full (repo) character into the lightweight roster-entry shape the
// sort + CharacterCard already expect, carrying ownership for role gating.
function toEntry(c) {
  return {
    id: c._rosterId,
    name: c.name || 'Unnamed',
    playerName: c.playerName || '',
    race: c.race,
    archetype: c.archetype,
    customArchetypeName: c.customArchetypeName || '',
    level: c.level,
    hp: c.hitPoints?.total ?? 0,
    tableIds: Array.isArray(c.tableIds) ? c.tableIds : [],
    savedAt: c._updatedAt || new Date().toISOString(),
    ownerUserId: c._ownerUserId ?? null,
    assignedPlayerId: c._assignedPlayerId ?? null,
  }
}

export default function RosterPage({ onNavigate, theme, onToggleTheme }) {
  const { user, role, signOut } = useAuth()
  const useRepo = repoEnabled()
  const [roster, setRoster] = useState(() => (useRepo ? [] : loadRoster()))
  // Full characters by id (repo path), so onGetCharacter/handleLoad have the blob.
  const [repoChars, setRepoChars] = useState({})
  const [players, setPlayers] = useState([])

  // Cloud-first load for signed-in users (RLS-scoped). localStorage path is
  // untouched when auth is off.
  useEffect(() => {
    if (!useRepo) return
    let alive = true
    listCharacters().then(chars => {
      if (!alive) return
      setRoster(chars.map(toEntry))
      setRepoChars(Object.fromEntries(chars.map(c => [c._rosterId, c])))
    }).catch(() => {})
    if (isGmOrAdmin(role)) listPlayers().then(p => { if (alive) setPlayers(p) }).catch(() => {})
    return () => { alive = false }
  }, [useRepo, role])

  async function refreshRepo() {
    const chars = await listCharacters()
    setRoster(chars.map(toEntry))
    setRepoChars(Object.fromEntries(chars.map(c => [c._rosterId, c])))
  }

  const getCharacter = useRepo ? (id => repoChars[id] || null) : loadCharacterFromRoster
  const [sortKey, setSortKey] = useState(() => {
    try { return localStorage.getItem('sidherun_roster_sort') || 'name' } catch { return 'name' }
  })
  const [status, setStatus] = useState('')
  const [pushing, setPushing] = useState(false)
  const restoreRef = useRef(null)

  // Named tables (#175). Registry lives GM-side (localStorage + backup file);
  // per-character membership rides the character blob's tableIds.
  const [tables, setTables] = useState(listTables)
  const [showTables, setShowTables] = useState(false)

  const tableCounts = {}
  for (const e of roster) for (const tid of (e.tableIds || [])) tableCounts[tid] = (tableCounts[tid] || 0) + 1

  // Persist a character's changed membership on the active storage plane, and
  // reflect it in the roster index so chips/checkboxes update immediately.
  function persistMembership(id, updated, nextIds) {
    if (useRepo) {
      setRepoChars(prev => ({ ...prev, [id]: updated }))
      saveCharacterData(id, updated, updated._dataRev).catch(() => setStatus('Could not save table change to cloud.'))
    } else {
      saveCharacterToRoster(updated)
      if (cloudEnabled && getCloudMap()[id]) trackPush(syncCharacter(updated)).catch(() => {})
    }
    setRoster(prev => prev.map(e => (e.id === id ? { ...e, tableIds: nextIds } : e)))
  }

  function handleToggleTable(id, tableId) {
    const char = getCharacter(id)
    if (!char) return
    const nextIds = toggleMembership(char, tableId)
    persistMembership(id, { ...char, tableIds: nextIds }, nextIds)
  }

  // Re-list after each mutation so state is an array regardless of the mutator's
  // return shape (createTable returns the new table, not the list).
  function handleCreateTable(name) { createTable(name); setTables(listTables()) }
  function handleRenameTable(id, name) { renameTable(id, name); setTables(listTables()) }

  // Delete a table: characters are kept, just stripped of this table's id.
  function handleDeleteTable(id, name) {
    if (!confirm(`Delete table “${name}”? Characters stay — they’re just removed from this table.`)) return
    for (const e of roster) {
      if (!(e.tableIds || []).includes(id)) continue
      const char = getCharacter(e.id)
      if (!char) continue
      const nextIds = withoutTable(char, id)
      persistMembership(e.id, { ...char, tableIds: nextIds }, nextIds)
    }
    deleteTable(id)
    setTables(listTables())
  }

  // Push the whole local roster to the cloud (idempotent: already-synced
  // characters are updated, not duplicated). Opt-in entry point for cloud sync.
  async function handlePushToCloud() {
    const chars = roster.map(e => getCharacter(e.id)).filter(Boolean)
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
    const chars = roster.map(e => getCharacter(e.id)).filter(Boolean)
    if (chars.length === 0) return
    const backup = buildRosterBackup(chars, new Date().toISOString(), { gmKey: getGmKey(), cloudMap: getCloudMap(), tables })
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
        const cloudState = extractCloudState(parsed)
        importCloudState(cloudState) // restore GM key + cloud map if present
        if (cloudState.tables) setTables(importTables(cloudState.tables)) // restore table registry (#175)
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
    // Go to the Welcome/home screen (Create New / Load / Import). Clear the
    // current draft so App mounts fresh: with no _rosterId it's create mode and
    // shows Welcome, rather than re-opening the last character as a sheet
    // (manage mode keys off _rosterId). Saved roster characters are untouched.
    clearCurrent()
    onNavigate('app')
  }

  function handleLoad(id) {
    const char = getCharacter(id)
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
      .map(entry => getCharacter(entry.id))
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
    // Confirmation (naming the character) is handled in CharacterCard's menu.
    if (useRepo) {
      try { await repoDelete(id) } catch { setStatus('Could not delete from cloud.'); return }
      await refreshRepo()
      return
    }
    if (cloudEnabled) await deleteCloudCharacter(id) // best-effort cloud row delete
    deleteCharacterFromRoster(id)
    setRoster(loadRoster())
  }

  // GM/admin: assign or reassign a character to a player (authenticated plane).
  async function handleReassign(id, playerUserId) {
    try { await assignPlayer(id, playerUserId); await refreshRepo() }
    catch { setStatus('Could not reassign character.') }
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
          {roster.length > 0 && (!useRepo || isGmOrAdmin(role)) && (
            <button className="btn-secondary" onClick={() => onNavigate('gm')}>
              GM Screen
            </button>
          )}
          {roster.length > 0 && (!useRepo || isGmOrAdmin(role)) && (
            <button className="btn-secondary" aria-expanded={showTables} onClick={() => setShowTables(s => !s)}>
              Tables ({tables.length})
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
          {cloudEnabled && !useRepo && roster.length > 0 && (
            <button className="btn-secondary" onClick={handlePushToCloud} disabled={pushing}>
              {pushing ? 'Syncing…' : 'Push to cloud'}
            </button>
          )}
          {cloudEnabled && !useRepo && (
            <button className="btn-secondary" onClick={handleCopyGmKey}>
              Copy GM key
            </button>
          )}
          <button className="btn-primary" onClick={handleNew}>
            + New Character
          </button>
          {useRepo && (
            <button className="btn-secondary" onClick={() => { signOut(); onNavigate('app') }}>
              Sign out
            </button>
          )}
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
        {showTables && roster.length > 0 && (!useRepo || isGmOrAdmin(role)) && (
          <TablesManager
            tables={tables}
            counts={tableCounts}
            onCreate={handleCreateTable}
            onRename={handleRenameTable}
            onDelete={handleDeleteTable}
          />
        )}
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
              onGetCharacter={getCharacter}
              canManage={!useRepo || isGmOrAdmin(role) || entry.ownerUserId === user?.id}
              canReassign={useRepo && isGmOrAdmin(role)}
              players={players}
              onReassign={handleReassign}
              tables={tables}
              onToggleTable={handleToggleTable}
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
