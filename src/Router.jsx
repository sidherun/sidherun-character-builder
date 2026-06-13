import { useState, useEffect } from 'react'
import App from './App.jsx'
import RosterPage from './pages/RosterPage.jsx'

function getRoute() {
  const hash = window.location.hash
  if (hash.startsWith('#roster')) return 'roster'
  if (hash.startsWith('#share=')) return 'share'
  return 'app'
}

export default function Router() {
  const [route, setRoute] = useState(getRoute())

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  function navigate(to) {
    window.location.hash = to === 'app' ? '' : to
  }

  if (route === 'roster') return <RosterPage onNavigate={navigate} />
  return <App onNavigate={navigate} shareMode={route === 'share'} />
}
