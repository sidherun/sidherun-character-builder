import { useState, useEffect, useRef } from 'react'
import { loadRoster, loadCharacterFromRoster, saveCharacterToRoster, saveCurrent } from '../utils/rosterStorage.js'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, subscribeCharacter, unsubscribeCharacter, syncCharacter, mergeRemote } from '../utils/cloudSync.js'
import {
  repoEnabled, listCharacters, listPlayers, assignPlayer, patchLive,
  subscribeLive, removeLiveSubscription,
} from '../utils/characterRepo.js'
import { useAuth, isGmOrAdmin } from '../auth/useAuth.js'
import { applyAdjust } from '../utils/gmAdjust.js'
import { subscribeRollFeed } from '../utils/rollFeed.js'
import { formatRoll } from '../utils/rollFormat.js'
import { trackPush } from '../utils/cloudStatus.js'
import CloudStatus from '../components/CloudStatus.jsx'
import styles from './GMScreen.module.css'

const loadAll = () => loadRoster().map(e => loadCharacterFromRoster(e.id)).filter(Boolean)

export default function GMScreen({ onNavigate, theme, onToggleTheme }) {
  const { role, signOut } = useAuth()
  const useRepo = repoEnabled()
  // Authenticated GM/admin pull the whole campaign from the cloud (RLS-scoped);
  // the legacy localStorage path is unchanged when auth is off.
  const [chars, setChars] = useState(useRepo ? [] : loadAll)
  const [players, setPlayers] = useState([])
  const [rollFeed, setRollFeed] = useState([])
  const charsRef = useRef(chars)
  charsRef.current = chars

  // Live dice-roll feed from the whole table (#148). One shared channel; every
  // player's roll lands here. Ephemeral — keep the last 20 in view only.
  useEffect(() => {
    if (!cloudEnabled) return
    return subscribeRollFeed(entry => {
      setRollFeed(prev => [{ ...entry, _key: `${entry.ts}-${entry.actor}-${entry.roll}` }, ...prev].slice(0, 20))
    })
  }, [])

  // Cloud-first load (authenticated). Falls back to localStorage when auth off.
  useEffect(() => {
    if (!useRepo) return
    let alive = true
    listCharacters().then(rows => { if (alive) setChars(rows) }).catch(() => {})
    if (isGmOrAdmin(role)) listPlayers().then(p => { if (alive) setPlayers(p) }).catch(() => {})
    return () => { alive = false }
  }, [useRepo, role])

  // Stable key of the subscribable character ids (not the count) so the live
  // subscriptions re-bind whenever the SET changes — including a swap that keeps
  // the roster length the same, which a `.length` dep would miss.
  const subKey = (useRepo
    ? chars.filter(c => c._rosterId).map(c => c._rosterId)
    : (cloudEnabled ? chars.filter(c => c._rosterId && getCloudMap()[c._rosterId]).map(c => c._rosterId) : [])
  ).sort().join(',')

  // Live updates. Repo path: subscribe to row changes (covers both player edits
  // and guest token writes). Legacy path: per-character broadcast channel.
  useEffect(() => {
    if (useRepo) {
      const ids = []
      for (const c of charsRef.current) {
        if (!c._rosterId) continue
        subscribeLive(c._rosterId, ({ live }) => {
          setChars(prev => prev.map(x => x._rosterId === c._rosterId ? mergeRemote(x, { live }) : x))
        })
        ids.push(c._rosterId)
      }
      return () => ids.forEach(removeLiveSubscription)
    }
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
  }, [useRepo, subKey])

  const syncedCount = useRepo
    ? chars.length
    : (cloudEnabled ? chars.filter(c => getCloudMap()[c._rosterId]).length : 0)

  function adjust(c, kind, delta) {
    const next = applyAdjust(c, kind, delta)
    setChars(prev => prev.map(x => x._rosterId === next._rosterId ? next : x))
    if (useRepo) {
      trackPush(patchLive(next._rosterId, next)).catch(() => {})
    } else {
      saveCharacterToRoster(next)
      if (cloudEnabled) trackPush(syncCharacter(next)).catch(() => {})
    }
  }

  function reassign(c, playerUserId) {
    setChars(prev => prev.map(x => x._rosterId === c._rosterId
      ? { ...x, _assignedPlayerId: playerUserId || null } : x))
    assignPlayer(c._rosterId, playerUserId).catch(() => {})
  }

  function openPlay(c) {
    // Open the existing roster character in Play Mode directly (bare #play loads
    // the current slot). Cloud sync + realtime still work via its own _rosterId,
    // and we avoid routing through #c= which would create a duplicate entry.
    saveCurrent({ ...c, wizardStep: 9 })
    onNavigate('play')
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

  const canAssign = useRepo && isGmOrAdmin(role)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => onNavigate('roster')} aria-label="Back to roster">
          <h1>Sidherun</h1>
          <span>GM Screen{syncedCount > 0 ? ` · ${syncedCount} live` : ''}</span>
        </button>
        <div className={styles.actions}>
          <CloudStatus />
          {onToggleTheme && (
            <button className="btn-secondary" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          )}
          <button className="btn-secondary" onClick={() => onNavigate('roster')}>Roster</button>
          <button className="btn-secondary" onClick={() => useRepo
            ? listCharacters().then(setChars).catch(() => {})
            : setChars(loadAll())}>Refresh</button>
          {useRepo && (
            <button className="btn-secondary" onClick={() => { signOut(); onNavigate('app') }}>Sign out</button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {cloudEnabled && rollFeed.length > 0 && (
          <section className={styles.rollFeed} aria-label="Live roll feed" aria-live="polite">
            <h2 className={styles.feedTitle}>Live Rolls</h2>
            <ul className={styles.feedList}>
              {rollFeed.map(r => {
                const f = formatRoll(r)
                return (
                  <li key={r._key} className={styles.feedItem}>
                    <span className={styles.feedHeadline} style={{ color: f.color }}>{f.headline}</span>
                    <span className={styles.feedWho}>{r.actor}</span>
                    <span className={styles.feedRoll}>{r.label}</span>
                    <span className={styles.feedDetail}>{f.detail}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
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
                  {canAssign && (
                    <select
                      className={styles.assign}
                      value={c._assignedPlayerId || ''}
                      onChange={e => reassign(c, e.target.value)}
                      aria-label={`Assign player for ${c.name || 'Unnamed'}`}
                    >
                      <option value="">— Unassigned —</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.display_name || p.email}</option>
                      ))}
                    </select>
                  )}
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
