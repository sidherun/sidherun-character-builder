import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { clearDestination, rememberDestination, validDestination } from '../auth/returnDestination.js'
import styles from './AccountControls.module.css'

export default function AccountControls() {
  const { user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null

  async function leave() {
    const destination = validDestination(window.location.hash.slice(1)) || 'app'
    setBusy(true)
    setError('')
    try {
      await signOut()
      clearDestination()
      rememberDestination(destination)
      window.location.hash = '#login'
    } catch {
      setError('Could not sign out. Please try again.')
      setBusy(false)
    }
  }

  return (
    <details className={styles.account}>
      <summary>Account</summary>
      <div className={styles.panel}>
        <span>Signed in as</span>
        <strong>{user.email || 'your account'}</strong>
        <button type="button" className="btn-secondary" disabled={busy} onClick={leave}>
          {busy ? 'Signing out…' : 'Sign out / change account'}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  )
}
