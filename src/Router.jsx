import { useState, useEffect } from 'react'
import App from './App.jsx'
import RosterPage from './pages/RosterPage.jsx'
import GMScreen from './pages/GMScreen.jsx'
import { useTheme } from './hooks/useTheme.js'

function getRoute(hash = window.location.hash) {
  if (hash.startsWith('#roster')) return 'roster'
  if (hash.startsWith('#gm'))     return 'gm'
  if (hash.startsWith('#share=')) return 'share'
  if (hash.startsWith('#play'))   return 'play' // #play= (embedded) or bare #play (open current)
  if (hash.startsWith('#c='))     return 'play' // cloud link → Play Mode
  return 'app'
}

export default function Router() {
  const [hash, setHash] = useState(window.location.hash)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const route = getRoute(hash)

  function navigate(to) {
    window.location.hash = (to === 'app' || to === 'home') ? '' : to
  }

  if (route === 'roster') return <RosterPage onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  if (route === 'gm') return <GMScreen onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
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
