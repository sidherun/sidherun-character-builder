import { useState, useEffect } from 'react'
import App from './App.jsx'
import RosterPage from './pages/RosterPage.jsx'
import GMScreen from './pages/GMScreen.jsx'
import AdminRoles from './pages/AdminRoles.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useAuth, isGmOrAdmin, isAdmin } from './auth/useAuth.js'
import { authEnabled } from './utils/supabaseClient.js'

function getRoute(hash = window.location.hash) {
  if (hash.startsWith('#login'))  return 'login'
  if (hash.startsWith('#roster')) return 'roster'
  if (hash.startsWith('#gm'))     return 'gm'
  if (hash.startsWith('#admin'))  return 'admin'
  if (hash.startsWith('#share=')) return 'share'
  if (hash.startsWith('#play'))   return 'play' // #play= (embedded) or bare #play (open current)
  if (hash.startsWith('#c='))     return 'play' // cloud link → Play Mode
  return 'app'
}

// Guest links open WITHOUT login so game-day QR / printout scans keep working.
// Everything else is gated when auth is enabled.
const GUEST_ROUTES = new Set(['share', 'play'])

export default function Router() {
  const [hash, setHash] = useState(window.location.hash)
  const { theme, toggleTheme } = useTheme()
  const { user, role, loading } = useAuth()

  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const route = getRoute(hash)

  // Give each screen its own document title — every route used to read the same
  // "Sidherun Character Builder", so tabs, history, and screen readers couldn't
  // tell them apart (#216).
  useEffect(() => {
    const names = {
      login: 'Sign in', roster: 'Roster', gm: 'GM Screen', admin: 'Manage Roles',
      play: 'Play Mode', share: 'Shared Character', app: 'Character Builder',
    }
    document.title = `${names[route] || 'Character Builder'} · Sidherun`
  }, [route])

  function navigate(to) {
    window.location.hash = (to === 'app' || to === 'home') ? '' : to
  }

  // Auth gating (only when auth is actually enabled). Guest links stay open.
  if (authEnabled && !GUEST_ROUTES.has(route)) {
    if (loading) return null // brief: resolving the persisted session
    if (!user && route !== 'login') { navigate('login'); return null }
    if (user && route === 'login') { navigate('app'); return null }
    // GM Screen is GM/admin only; players are redirected to their roster.
    if (route === 'gm' && !isGmOrAdmin(role)) { navigate('roster'); return null }
    // Manage Roles is admin-only.
    if (route === 'admin' && !isAdmin(role)) { navigate('roster'); return null }
  }

  if (route === 'login') return <LoginPage />
  if (route === 'roster') return <RosterPage onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  if (route === 'gm') return <GMScreen onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  if (route === 'admin') return <AdminRoles onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  return (
    <App
      // Key by the hash so navigating into a #play=/#c= link (an in-session
      // hash change, not a full reload) remounts App and re-initializes its
      // mount-time state (playMode, cloudLoading). Without this, isPlayMode
      // stays stuck at its first-mount value and Play Mode never shows.
      key={hash || 'app'}
      onNavigate={navigate}
      shareMode={route === 'share'}
      playMode={route === 'play'}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
