import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import styles from './LoginPage.module.css'

// Passwordless magic-link sign-in (epic #109). The player enters their email,
// receives a one-tap link, and lands back signed in (detectSessionInUrl).
export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) return
    setState('sending')
    setError('')
    const { error: err } = await signIn(addr)
    if (err) {
      setState('error')
      setError(err.message || 'Could not send the sign-in link. Try again.')
    } else {
      setState('sent')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.brand}>Sidherun</h1>
        <p className={styles.subtitle}>Sign in to reach your characters</p>

        {state === 'sent' ? (
          <p className={styles.sent} role="status">
            Check <strong>{email}</strong> for a sign-in link. Open it on this
            device to continue.
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              aria-label="Email address"
            />
            <button className="btn-primary" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {state === 'error' && (
              <p className={styles.error} role="alert">{error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
