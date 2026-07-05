import { useState, useEffect } from 'react'
import { useAuth, isAdmin } from '../auth/useAuth.js'
import { listPlayers, setUserRole } from '../utils/characterRepo.js'
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
  const [status, setStatus] = useState({}) // id -> { saving? | saved? | error? }

  useEffect(() => {
    let alive = true
    listPlayers()
      .then(u => { if (alive) { setUsers(u); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

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
    setStatus(s => ({ ...s, [u.id]: { saving: true } }))
    setUsers(list => list.map(x => x.id === u.id ? { ...x, role: newRole } : x)) // optimistic
    try {
      await setUserRole(u.id, newRole)
      setStatus(s => ({ ...s, [u.id]: { saved: true } }))
    } catch (e) {
      setUsers(list => list.map(x => x.id === u.id ? { ...x, role: prevRole } : x)) // revert
      setStatus(s => ({ ...s, [u.id]: { error: e?.message || 'Change rejected.' } }))
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
          <ul className={styles.list}>
            {users.map(u => {
              const st = status[u.id] || {}
              const label = u.display_name || u.email || u.id
              return (
                <li key={u.id} className={styles.row}>
                  <div className={styles.who}>
                    <span className={styles.name}>
                      {label}{u.id === user?.id && <span className={styles.youTag}> you</span>}
                    </span>
                    {u.email && u.display_name && <span className={styles.email}>{u.email}</span>}
                  </div>
                  <div className={styles.roleCell}>
                    <select
                      value={u.role}
                      disabled={st.saving}
                      onChange={e => changeRole(u, e.target.value)}
                      aria-label={`Role for ${label}`}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {st.saving && <span className={styles.pending}>saving…</span>}
                    {st.saved && <span className={styles.ok}>saved ✓</span>}
                    {st.error && <span className={styles.err} role="alert">{st.error}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
