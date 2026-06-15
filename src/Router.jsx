import { useState, useEffect } from 'react'
import App from './App.jsx'
import RosterPage from './pages/RosterPage.jsx'
import { useTheme } from './hooks/useTheme.js'

function getRoute() {
  const hash = window.location.hash
  if (hash.startsWith('#roster')) return 'roster'
  if (hash.startsWith('#share=')) return 'share'
  if (hash.startsWith('#play='))  return 'play'
  if (hash.startsWith('#c='))     return 'play' // cloud link → Play Mode
  return 'app'
}

export default function Router() {
  const [route, setRoute] = useState(getRoute())
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  function navigate(to) {
    window.location.hash = (to === 'app' || to === 'home') ? '' : to
  }

  if (route === 'roster') return <RosterPage onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />
  return (
    <App
      onNavigate={navigate}
      shareMode={route === 'share'}
      playMode={route === 'play'}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
