import { useState, useEffect, useRef } from 'react'
import { loadRoster, loadCharacterFromRoster, saveCharacterToRoster, saveCurrent } from '../utils/rosterStorage.js'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, subscribeCharacter, unsubscribeCharacter, syncCharacter, mergeRemote, hydrateCharacter } from '../utils/cloudSync.js'
import {
  repoEnabled, listCharacters, listPlayers, assignPlayer, patchLive,
  subscribeLive, removeLiveSubscription, getCharacter,
} from '../utils/characterRepo.js'
import { useAuth, isGmOrAdmin } from '../auth/useAuth.js'
import { applyAdjust } from '../utils/gmAdjust.js'
import { subscribeRollFeed } from '../utils/rollFeed.js'
import { formatRoll } from '../utils/rollFormat.js'
import { listTables, visibleForTable, tableMemberCount, visibleRollsForTable, deriveRegistry, mergeRegistry } from '../utils/tables.js'
import { skillBudget } from '../utils/skillPoints.js'
import { trackPush } from '../utils/cloudStatus.js'
import CloudStatus from '../components/CloudStatus.jsx'
import SyncBanner from '../components/SyncBanner.jsx'
import styles from './GMScreen.module.css'

const loadAll = () => loadRoster().map(e => loadCharacterFromRoster(e.id)).filter(Boolean)

// One HP/Mana/Story stepper. Defined at MODULE scope, not inside GMScreen: a
// component declared inside the render is a new type every render, so React
// remounted this whole node on every +/- (via setChars) — dropping focus and
// silently eating rapid clicks mid-combat (13 fast clicks once landed as −1).
// Hoisting it keeps the node stable so every click and keypress registers (#218).
function Stat({ c, kind, label, cur, total, color, onAdjust }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel} style={{ color }}>{label}</span>
      <div className={styles.statControls}>
        <button className={styles.adj} onClick={() => onAdjust(c, kind, -1)} aria-label={`${label} minus for ${c.name || 'Unnamed'}`}>−</button>
        <span className={styles.statVal} style={{ color }}>{cur}<span className={styles.statTotal}>/{total}</span></span>
        <button className={styles.adj} onClick={() => onAdjust(c, kind, +1)} aria-label={`${label} plus for ${c.name || 'Unnamed'}`}>+</button>
      </div>
    </div>
  )
}

export default function GMScreen({ onNavigate, theme, onToggleTheme }) {
  const { role, signOut } = useAuth()
  const useRepo = repoEnabled()
  // Authenticated GM/admin pull the whole campaign from the cloud (RLS-scoped);
  // the legacy localStorage path is unchanged when auth is off.
  const [chars, setChars] = useState(useRepo ? [] : loadAll)
  const [players, setPlayers] = useState([])
  const [rollFeed, setRollFeed] = useState([])
  // Distinguish "still loading" and "load failed" from a genuinely empty
  // campaign — a swallowed fetch error used to render "No saved characters",
  // making a broken app look empty mid-session (#218).
  const [loadState, setLoadState] = useState(useRepo ? 'loading' : 'ready')
  const charsRef = useRef(chars)
  charsRef.current = chars

  // Table filter (#175): show only a chosen named table's characters. The
  // selection persists so it survives a reload mid-session. '' = show all. The
  // registry merges localStorage with names derived from the loaded characters,
  // so the filter works on a fresh device where localStorage is empty (#176).
  const tables = mergeRegistry(listTables(), deriveRegistry(chars))
  const [selectedTable, setSelectedTable] = useState(() => {
    try { return localStorage.getItem('sidherun_gm_table') || '' } catch { return '' }
  })

  function chooseTable(id) {
    setSelectedTable(id)
    try { localStorage.setItem('sidherun_gm_table', id) } catch { /* non-fatal */ }
  }

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
    setLoadState('loading')
    listCharacters()
      .then(rows => { if (alive) { setChars(rows); setLoadState('ready') } })
      .catch(() => { if (alive) setLoadState('error') })
    if (isGmOrAdmin(role)) listPlayers().then(p => { if (alive) setPlayers(p) }).catch(() => {})
    return () => { alive = false }
  }, [useRepo, role])

  // Retry a failed load (surfaced by the error state below).
  function reloadRoster() {
    setLoadState('loading')
    listCharacters()
      .then(rows => { setChars(rows); setLoadState('ready') })
      .catch(() => setLoadState('error'))
  }

  // RECONCILE: a dropped live Broadcast can leave a character's counters stale on
  // the dashboard until it's reopened. The GM Screen is a viewer (the GM's own
  // adjusts push immediately), so when the tab regains focus / becomes visible,
  // re-read the authoritative rows and self-heal any missed update (#196/#200) —
  // the same fetch the mount load and Open action already trust.
  useEffect(() => {
    if (!useRepo) return
    const reconcile = () => {
      if (document.visibilityState !== 'visible') return
      listCharacters().then(rows => setChars(rows)).catch(() => {})
    }
    document.addEventListener('visibilitychange', reconcile)
    window.addEventListener('focus', reconcile)
    return () => {
      document.removeEventListener('visibilitychange', reconcile)
      window.removeEventListener('focus', reconcile)
    }
  }, [useRepo])

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
        const rid = c._rosterId
        subscribeLive(rid, ({ live }) => {
          setChars(prev => prev.map(x => x._rosterId === rid ? mergeRemote(x, { live }) : x))
        }, () => {
          // Structural edit (inventory/skills/name) → adopt the fresh row.
          getCharacter(rid).then(fresh => {
            if (!fresh) return
            setChars(prev => prev.map(x => x._rosterId === rid ? fresh : x))
          }).catch(() => {})
        })
        ids.push(rid)
      }
      return () => ids.forEach(removeLiveSubscription)
    }
    if (!cloudEnabled) return
    const map = getCloudMap()
    const subscribed = []
    for (const c of charsRef.current) {
      if (c._rosterId && map[c._rosterId]) {
        const rid = c._rosterId
        subscribeCharacter(rid, payload => {
          setChars(prev => prev.map(x => {
            if (x._rosterId !== rid) return x
            const merged = mergeRemote(x, payload)
            saveCharacterToRoster(merged) // persist the remote change locally; don't re-push (echo)
            return merged
          }))
        }, () => {
          // Structural edit → adopt the fresh character's data fields.
          hydrateCharacter(rid).then(fresh => {
            if (!fresh) return
            setChars(prev => prev.map(x => {
              if (x._rosterId !== rid) return x
              const merged = { ...x, ...fresh }
              saveCharacterToRoster(merged)
              return merged
            }))
          }).catch(() => {})
        })
        subscribed.push(rid)
      }
    }
    return () => subscribed.forEach(unsubscribeCharacter)
  }, [useRepo, subKey])

  const syncedCount = useRepo
    ? chars.length
    : (cloudEnabled ? chars.filter(c => getCloudMap()[c._rosterId]).length : 0)

  // Table-filter derivations. A stale selection (table deleted elsewhere) falls
  // back to "all" so the grid never blanks.
  const activeTable = tables.some(t => t.id === selectedTable) ? selectedTable : ''
  const filtering = !!activeTable
  const visible = visibleForTable(chars, activeTable)
  const feedToShow = visibleRollsForTable(rollFeed, chars, activeTable)

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

  async function openPlay(c) {
    // Pull the freshest cloud copy first so a player's just-made structural edit
    // (inventory/skills) is there the moment the GM opens the character — the live
    // broadcast is a bonus, this makes "Open" authoritative without a page refresh.
    let fresh = c
    try {
      if (useRepo) {
        const r = await getCharacter(c._rosterId)
        if (r) fresh = r
      } else if (cloudEnabled && getCloudMap()[c._rosterId]) {
        const r = await hydrateCharacter(c._rosterId)
        if (r) fresh = { ...c, ...r }
      }
    } catch { /* offline / fetch failed → fall back to the in-memory copy */ }
    // Open the existing roster character in Play Mode directly (bare #play loads
    // the current slot). Cloud sync + realtime still work via its own _rosterId,
    // and we avoid routing through #c= which would create a duplicate entry.
    saveCurrent({ ...fresh, wizardStep: 9 })
    onNavigate('play')
  }

  const canAssign = useRepo && isGmOrAdmin(role)

  return (
    <div className={styles.page}>
      <SyncBanner />
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
            <h2 className={styles.feedTitle}>Live Rolls{filtering ? ` · ${tables.find(t => t.id === activeTable)?.name}` : ''}</h2>
            <ul className={styles.feedList}>
              {feedToShow.map(r => {
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
        {loadState === 'loading' && chars.length === 0 ? (
          <p className={styles.empty} role="status" aria-live="polite">Loading the roster…</p>
        ) : loadState === 'error' ? (
          <p className={styles.empty} role="alert">
            Couldn’t load the roster — check your connection.{' '}
            <button className="btn-secondary" onClick={reloadRoster}>Retry</button>
          </p>
        ) : chars.length === 0 ? (
          <p className={styles.empty}>No saved characters. Add characters from the Roster first.</p>
        ) : (
          <>
            {tables.length > 0 && (
              <div className={styles.sessionBar}>
                <label className={styles.sessionLabel} htmlFor="gm-table-filter">Show</label>
                <select
                  id="gm-table-filter"
                  className={styles.tableSelect}
                  value={activeTable}
                  onChange={e => chooseTable(e.target.value)}
                >
                  <option value="">All characters ({chars.length})</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({tableMemberCount(chars, t.id)})</option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.grid}>
            {visible.map(c => (
              <div key={c._rosterId} className={styles.row}>
                <div className={styles.who}>
                  <div className={styles.name}>
                    {c.name || 'Unnamed'}
                    {skillBudget(c).overBudget && <span className={styles.overBudget} title="Skill points over the level budget">⚠</span>}
                  </div>
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
                <Stat c={c} kind="hp" label="HP" cur={c.hitPoints?.current || 0} total={c.hitPoints?.total || 0} color="var(--hp)" onAdjust={adjust} />
                {c.hasMagic
                  ? <Stat c={c} kind="mana" label="Mana" cur={c.mana?.current || 0} total={c.mana?.total || 0} color="var(--mana)" onAdjust={adjust} />
                  : <div className={styles.stat}><span className={styles.statLabel}>Mana</span><span className={styles.dash}>—</span></div>}
                <Stat c={c} kind="sp" label="Story" cur={c.storyPoints?.current || 0} total={c.storyPoints?.total || 0} color="var(--story)" onAdjust={adjust} />
                <button className="btn-secondary" onClick={() => openPlay(c)}>Open</button>
              </div>
            ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
