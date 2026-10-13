import { useState, useEffect } from 'react'
import App from './App.jsx'
import RosterPage from './pages/RosterPage.jsx'
import GMScreen from './pages/GMScreen.jsx'
import AdminRoles from './pages/AdminRoles.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { AuthLoadingPage, AuthRecoveryPage } from './pages/AuthGatePage.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useAuth, isGmOrAdmin, isAdmin } from './auth/useAuth.js'
import { authEnabled } from './utils/supabaseClient.js'
import AccountControls from './components/AccountControls.jsx'
import { rememberDestination, pendingDestination, clearDestination } from './auth/returnDestination.js'

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
  const { user, role, loading, startupError, recoverAuth } = useAuth()

  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const route = getRoute(hash)

  useEffect(() => {
    if (!authEnabled || loading || startupError) return
    if (!user && !GUEST_ROUTES.has(route) && route !== 'login') {
      rememberDestination(route)
      window.location.hash = '#login'
    } else if (user && (route === 'login' || (route === 'app' && new URL(window.location.href).searchParams.has('returnTo')))) {
      const destination = pendingDestination() || 'roster'
      clearDestination()
      window.location.hash = destination === 'app' ? '' : `#${destination}`
    }
  }, [route, user, loading, startupError])

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
    if (loading) return <AuthLoadingPage />
    if (startupError) return <AuthRecoveryPage reason={startupError} onReset={recoverAuth} />
    if (!user && route !== 'login') return <AuthLoadingPage />
    if (user && route === 'login') return <AuthLoadingPage />
    // Explain role restrictions and let the player choose their next action.
    if ((route === 'gm' && !isGmOrAdmin(role)) || (route === 'admin' && !isAdmin(role))) {
      return (
        <main className="auth-permission">
          <h1>Account access</h1>
          <p>This page requires {route === 'admin' ? 'an admin' : 'a GM or admin'} account.</p>
          <p>You’re signed in as <strong>{user.email}</strong>. Use your invited account, or ask your GM to check your access.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><AccountControls /></div>
          <button className="btn-secondary" onClick={() => navigate('roster')}>Go to my roster</button>
        </main>
      )
    }
  }

  if (route === 'login') return <LoginPage />
  if (route === 'roster') return <RosterPage key={user?.id || 'guest'} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  if (route === 'gm') return <GMScreen key={user?.id || 'guest'} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  if (route === 'admin') return <AdminRoles key={user?.id || 'guest'} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  return (
    <App
      // Key by the hash so navigating into a #play=/#c= link (an in-session
      // hash change, not a full reload) remounts App and re-initializes its
      // mount-time state (playMode, cloudLoading). Without this, isPlayMode
      // stays stuck at its first-mount value and Play Mode never shows.
      key={`${hash || 'app'}:${user?.id || 'guest'}`}
      onNavigate={navigate}
      shareMode={route === 'share'}
      playMode={route === 'play'}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
