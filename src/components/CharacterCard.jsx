import { useState, useRef, useEffect } from 'react'
import { encodeCharacterToPlayURL } from '../utils/urlState.js'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudLink, rotateCloudLink } from '../utils/cloudSync.js'
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

export default function CharacterCard({
  entry, onLoad, onDelete, onGetCharacter,
  // Authenticated-plane role gating (epic #109). Defaults preserve the legacy
  // single-user behavior: everything manageable, no reassign control.
  canManage = true, canReassign = false, players = [], onReassign,
  // Named tables (#175): the GM's table registry + a toggle for membership.
  tables = [], onToggleTable,
}) {
  const [linkState, setLinkState] = useState('idle') // idle | loading | copied | error
  const [cloudState, setCloudState] = useState('idle') // idle | copied | error
  const [cloudLink, setCloudLink] = useState(cloudEnabled ? getCloudLink(entry.id) : null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)

  function closeMenu() { setMenuOpen(false); setConfirmDelete(false) }

  // Close the menu on an outside click or Escape. Only wired while open.
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu() }
    function onKey(e) { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Cloud links are short (id + token), so no URL shortener needed — copy directly.
  async function handleCopyCloudLink() {
    if (!cloudLink) return
    try {
      await navigator.clipboard.writeText(cloudLink)
      setCloudState('copied')
    } catch {
      setCloudState('error')
    }
    setTimeout(() => setCloudState('idle'), 2500)
  }

  // Rotate the capability token: any link already shared stops working, a fresh
  // one is generated and copied.
  async function handleResetLink() {
    if (!confirm('Reset this character’s live link? Any link you already shared will stop working.')) return
    try {
      const fresh = await rotateCloudLink(entry.id)
      if (fresh) { setCloudLink(fresh); await navigator.clipboard.writeText(fresh).catch(() => {}); setCloudState('copied') }
      else setCloudState('error')
    } catch { setCloudState('error') }
    setTimeout(() => setCloudState('idle'), 2500)
  }

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
  const cloudLabel = { idle: 'Copy live link', copied: 'Copied!', error: 'Copy failed' }

  const name = entry.name || 'Unnamed'
  const memberIds = Array.isArray(entry.tableIds) ? entry.tableIds : []
  const memberTables = tables.filter(t => memberIds.includes(t.id))

  return (
    <div className={styles.card}>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          className={styles.menuBtn}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More options for ${name}`}
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className={styles.menu} role="menu">
            {!confirmDelete ? (
              <>
                <button
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={handleCopyPlayLink}
                  disabled={linkState === 'loading'}
                >
                  {btnLabel[linkState]}
                </button>
                {cloudLink && (
                  <button role="menuitem" className={styles.menuItem} onClick={handleCopyCloudLink}>
                    {cloudLabel[cloudState]}
                  </button>
                )}
                {cloudLink && (
                  <button
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={handleResetLink}
                    title="Revoke the shared link and generate a new one"
                  >
                    Reset link
                  </button>
                )}
                {canManage && onToggleTable && (
                  <div className={styles.menuSection} role="group" aria-label="Tables">
                    <div className={styles.menuHeading}>Tables</div>
                    {tables.length === 0 ? (
                      <div className={styles.menuHint}>No tables yet — create one on the roster.</div>
                    ) : (
                      tables.map(t => (
                        <label key={t.id} className={styles.menuCheck}>
                          <input
                            type="checkbox"
                            checked={memberIds.includes(t.id)}
                            onChange={() => onToggleTable(entry.id, t.id)}
                          />
                          <span>{t.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
                {canManage && (
                  <button
                    role="menuitem"
                    className={`${styles.menuItem} ${styles.danger}`}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete…
                  </button>
                )}
              </>
            ) : (
              <div className={styles.confirm}>
                <span className={styles.confirmText}>Delete <strong>{name}</strong>? This can’t be undone.</span>
                <div className={styles.confirmRow}>
                  <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  <button className="btn-danger" onClick={() => { closeMenu(); onDelete(entry.id) }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.name}>
        {name}
        {entry.overBudget && <span className={styles.overBudget} title="Skill points over the level budget">⚠ over budget</span>}
      </div>
      {entry.playerName && <div className={styles.player}>Player: {entry.playerName}</div>}
      <div className={styles.meta}>
        {entry.race} · {entry.archetype === 'custom' ? (entry.customArchetypeName || 'Custom') : entry.archetype} · Level {entry.level}
      </div>
      <div className={styles.hp}>HP: {entry.hp}</div>
      {memberTables.length > 0 && (
        <div className={styles.chips}>
          {memberTables.map(t => <span key={t.id} className={styles.chip}>{t.name}</span>)}
        </div>
      )}
      <div className={styles.saved}>
        Saved {new Date(entry.savedAt).toLocaleDateString()}
      </div>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => onLoad(entry.id)}>Load</button>
      </div>
      {canReassign && (
        <label className={styles.assign}>
          <span>Player</span>
          <select
            value={entry.assignedPlayerId || ''}
            onChange={e => onReassign?.(entry.id, e.target.value)}
            aria-label={`Assign player for ${entry.name || 'Unnamed'}`}
          >
            <option value="">— Unassigned —</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.display_name || p.email}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
