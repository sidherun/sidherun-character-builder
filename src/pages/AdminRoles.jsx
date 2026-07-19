import { useState, useEffect, useMemo } from 'react'
import { useAuth, isAdmin } from '../auth/useAuth.js'
import { listPlayers, setDisplayName, setUserRole } from '../utils/characterRepo.js'
import { filterUsers } from '../utils/adminRoles.js'
import styles from './AdminRoles.module.css'

const ROLES = ['player', 'gm', 'admin']

// Admin-only role management (#179): view everyone who has signed in and change
// their role, instead of hand-editing profiles.role in the Supabase SQL editor.
// The write goes straight through the client — the profiles_admin_all RLS policy
// + guard_role_change trigger only permit it for an admin, so a non-admin call
// is rejected and surfaced. Router gates this route to admins; the check here is
// a defensive backstop.
export default function AdminRoles({ onNavigate, theme, onToggleTheme }) {
  const { user, role, signOut } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [nameDrafts, setNameDrafts] = useState({})
  const [roleStatus, setRoleStatus] = useState({})
  const [nameStatus, setNameStatus] = useState({})

  useEffect(() => {
    let alive = true
    listPlayers()
      .then(u => { if (alive) { setUsers(u); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const visibleUsers = useMemo(
    () => filterUsers(users, query, roleFilter),
    [users, query, roleFilter]
  )
  const counts = useMemo(() => ({
    all: users.length,
    ...Object.fromEntries(ROLES.map(r => [r, users.filter(u => u.role === r).length])),
  }), [users])

  async function changeRole(u, newRole) {
    if (newRole === u.role) return
    // Guard: don't let an admin silently strip their own admin access.
    if (u.id === user?.id && u.role === 'admin' && newRole !== 'admin') {
      const ok = window.confirm(
        'This removes your own admin access — you will not be able to manage roles after you reload. Continue?'
      )
      if (!ok) return
    }
    const prevRole = u.role
    setRoleStatus(s => ({ ...s, [u.id]: { saving: true } }))
    setUsers(list => list.map(x => x.id === u.id ? { ...x, role: newRole } : x)) // optimistic
    try {
      await setUserRole(u.id, newRole)
      setRoleStatus(s => ({ ...s, [u.id]: { saved: true } }))
    } catch (e) {
      setUsers(list => list.map(x => x.id === u.id ? { ...x, role: prevRole } : x)) // revert
      setRoleStatus(s => ({ ...s, [u.id]: { error: e?.message || 'Change rejected.' } }))
    }
  }

  async function saveDisplayName(u) {
    const nextName = (nameDrafts[u.id] ?? u.display_name ?? '').trim()
    if (!nextName) {
      setNameStatus(s => ({ ...s, [u.id]: { error: 'Display name is required.' } }))
      return
    }
    const previousName = u.display_name
    setNameStatus(s => ({ ...s, [u.id]: { saving: true } }))
    setUsers(list => list.map(x => x.id === u.id ? { ...x, display_name: nextName } : x))
    setNameDrafts(drafts => ({ ...drafts, [u.id]: nextName }))
    try {
      const saved = await setDisplayName(u.id, nextName)
      const savedName = saved?.display_name || nextName
      setUsers(list => list.map(x => x.id === u.id ? { ...x, display_name: savedName } : x))
      setNameDrafts(drafts => ({ ...drafts, [u.id]: savedName }))
      setNameStatus(s => ({ ...s, [u.id]: { saved: true } }))
    } catch (e) {
      setUsers(list => list.map(x => x.id === u.id ? { ...x, display_name: previousName } : x))
      setNameDrafts(drafts => ({ ...drafts, [u.id]: previousName || '' }))
      setNameStatus(s => ({ ...s, [u.id]: { error: e?.message || 'Name change rejected.' } }))
    }
  }

  if (!isAdmin(role)) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.empty}>Admins only.</p>
          <button className="btn-secondary" onClick={() => onNavigate('roster')}>Back to roster</button>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => onNavigate('roster')} aria-label="Back to roster">
          <h1>Sidherun</h1>
          <span>Manage Roles</span>
        </button>
        <div className={styles.actions}>
          {onToggleTheme && (
            <button className="btn-secondary" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          )}
          <button className="btn-secondary" onClick={() => onNavigate('roster')}>Roster</button>
          <button className="btn-secondary" onClick={() => { signOut(); onNavigate('app') }}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.note}>
          Only people who have <strong>signed in at least once</strong> appear here (a profile is
          created on first login). A role change takes effect the next time that person <strong>reloads</strong> the app.
        </p>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : users.length === 0 ? (
          <p className={styles.empty}>
            No users yet. Ask someone to sign in once with their email (magic link) and they’ll appear here.
          </p>
        ) : (
          <>
            <div className={styles.filters}>
              <label className={styles.searchLabel}>
                <span>Search people</span>
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Name or email"
                />
              </label>
              <div className={styles.roleFilters} role="group" aria-label="Filter people by role">
                {['all', ...ROLES].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={roleFilter === r ? styles.activeFilter : styles.filter}
                    aria-pressed={roleFilter === r}
                    onClick={() => setRoleFilter(r)}
                  >
                    {r} <span>{counts[r]}</span>
                  </button>
                ))}
              </div>
            </div>
            {visibleUsers.length === 0 ? (
              <p className={styles.empty} role="status">No matching users.</p>
            ) : <ul className={styles.list}>
            {visibleUsers.map(u => {
              const roleSt = roleStatus[u.id] || {}
              const nameSt = nameStatus[u.id] || {}
              const label = u.display_name || u.email || u.id
              return (
                <li key={u.id} className={styles.row}>
                  <div className={styles.who}>
                    <form className={styles.nameForm} onSubmit={e => { e.preventDefault(); saveDisplayName(u) }}>
                      <label>
                        <span>Display name{u.id === user?.id && <span className={styles.youTag}> you</span>}</span>
                        <input
                          value={nameDrafts[u.id] ?? u.display_name ?? ''}
                          disabled={nameSt.saving}
                          onChange={e => setNameDrafts(drafts => ({ ...drafts, [u.id]: e.target.value }))}
                          aria-label={`Display name for ${label}`}
                        />
                      </label>
                      <button className="btn-secondary" type="submit" disabled={nameSt.saving}>Save name</button>
                    </form>
                    {u.email && <span className={styles.email}>{u.email}</span>}
                    <div className={styles.nameFeedback} aria-live="polite">
                      {nameSt.saving && <span className={styles.pending}>saving…</span>}
                      {nameSt.saved && <span className={styles.ok}>saved ✓</span>}
                      {nameSt.error && <span className={styles.err} role="alert">{nameSt.error}</span>}
                    </div>
                  </div>
                  <div className={styles.roleCell}>
                    <select
                      value={u.role}
                      disabled={roleSt.saving}
                      onChange={e => changeRole(u, e.target.value)}
                      aria-label={`Role for ${label}`}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleSt.saving && <span className={styles.pending}>saving…</span>}
                    {roleSt.saved && <span className={styles.ok}>saved ✓</span>}
                    {roleSt.error && <span className={styles.err} role="alert">{roleSt.error}</span>}
                  </div>
                </li>
              )
            })}
          </ul>}
          </>
        )}
      </main>
    </div>
  )
}
