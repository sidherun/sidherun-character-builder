import { useState, useEffect, useRef } from 'react'
import { loadRoster, loadCharacterFromRoster, saveCharacterToRoster, saveCurrent } from '../utils/rosterStorage.js'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, subscribeCharacter, unsubscribeCharacter, syncCharacter, mergeRemote, qrLinkFor } from '../utils/cloudSync.js'
import { applyAdjust } from '../utils/gmAdjust.js'
import styles from './GMScreen.module.css'

const loadAll = () => loadRoster().map(e => loadCharacterFromRoster(e.id)).filter(Boolean)

export default function GMScreen({ onNavigate, theme, onToggleTheme }) {
  const [chars, setChars] = useState(loadAll)
  const charsRef = useRef(chars)
  charsRef.current = chars

  // Live: subscribe to each cloud-synced character so a player's change on their
  // device appears here in real time. No-op when cloud is off / nothing synced.
  useEffect(() => {
    if (!cloudEnabled) return
    const map = getCloudMap()
    const subscribed = []
    for (const c of charsRef.current) {
      if (c._rosterId && map[c._rosterId]) {
        subscribeCharacter(c._rosterId, payload => {
          setChars(prev => prev.map(x => {
            if (x._rosterId !== c._rosterId) return x
            const merged = mergeRemote(x, payload)
            saveCharacterToRoster(merged) // persist the remote change locally; don't re-push (echo)
            return merged
          }))
        })
        subscribed.push(c._rosterId)
      }
    }
    return () => subscribed.forEach(unsubscribeCharacter)
  }, [])

  const syncedCount = cloudEnabled ? chars.filter(c => getCloudMap()[c._rosterId]).length : 0

  function adjust(c, kind, delta) {
    const next = applyAdjust(c, kind, delta)
    setChars(prev => prev.map(x => x._rosterId === next._rosterId ? next : x))
    saveCharacterToRoster(next)
    if (cloudEnabled) syncCharacter(next).catch(() => {})
  }

  function openPlay(c) {
    // Open the actual roster character in Play Mode. Cloud-synced → its live
    // link; otherwise set it as current and open the bare #play route.
    const cloudLink = cloudEnabled ? qrLinkFor(c) : null
    if (cloudLink && cloudLink.includes('#c=')) {
      window.location.hash = cloudLink.slice(cloudLink.indexOf('#'))
    } else {
      saveCurrent({ ...c, wizardStep: 9 })
      onNavigate('play')
    }
  }

  const Stat = ({ c, kind, label, cur, total, color }) => (
    <div className={styles.stat}>
      <span className={styles.statLabel} style={{ color }}>{label}</span>
      <div className={styles.statControls}>
        <button className={styles.adj} onClick={() => adjust(c, kind, -1)} aria-label={`${label} minus for ${c.name || 'Unnamed'}`}>−</button>
        <span className={styles.statVal} style={{ color }}>{cur}<span className={styles.statTotal}>/{total}</span></span>
        <button className={styles.adj} onClick={() => adjust(c, kind, +1)} aria-label={`${label} plus for ${c.name || 'Unnamed'}`}>+</button>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => onNavigate('roster')} aria-label="Back to roster">
          <h1>Sidherun</h1>
          <span>GM Screen{syncedCount > 0 ? ` · ${syncedCount} live` : ''}</span>
        </button>
        <div className={styles.actions}>
          {onToggleTheme && (
            <button className="btn-secondary" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          )}
          <button className="btn-secondary" onClick={() => onNavigate('roster')}>Roster</button>
          <button className="btn-secondary" onClick={() => setChars(loadAll())}>Refresh</button>
        </div>
      </header>

      <main className={styles.main}>
        {chars.length === 0 ? (
          <p className={styles.empty}>No saved characters. Add characters from the Roster first.</p>
        ) : (
          <div className={styles.grid}>
            {chars.map(c => (
              <div key={c._rosterId} className={styles.row}>
                <div className={styles.who}>
                  <div className={styles.name}>{c.name || 'Unnamed'}</div>
                  {c.playerName && <div className={styles.player}>{c.playerName}</div>}
                  <div className={styles.meta}>
                    {c.race} · {c.archetype === 'custom' ? (c.customArchetypeName || 'Custom') : c.archetype} · L{c.level}
                  </div>
                </div>
                <Stat c={c} kind="hp" label="HP" cur={c.hitPoints?.current || 0} total={c.hitPoints?.total || 0} color="var(--hp)" />
                {c.hasMagic
                  ? <Stat c={c} kind="mana" label="Mana" cur={c.mana?.current || 0} total={c.mana?.total || 0} color="var(--mana)" />
                  : <div className={styles.stat}><span className={styles.statLabel}>Mana</span><span className={styles.dash}>—</span></div>}
                <Stat c={c} kind="sp" label="Story" cur={c.storyPoints?.current || 0} total={c.storyPoints?.total || 0} color="var(--story)" />
                <button className="btn-secondary" onClick={() => openPlay(c)}>Open</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
