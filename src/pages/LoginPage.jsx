import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { friendlyAuthError } from '../auth/authErrors.js'
import styles from './LoginPage.module.css'

// Passwordless magic-link sign-in (epic #109). The player enters their email,
// receives a one-tap link, and lands back signed in (detectSessionInUrl).
export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')
  const [sentEmail, setSentEmail] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) return
    setState('sending')
    setError('')
    try {
      const { error: err } = await signIn(addr)
      if (err) throw err
      setSentEmail(addr)
      setState('sent')
    } catch (err) {
      setState('error')
      setError(friendlyAuthError(err))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.brand}>Sidherun</h1>
        <p className={styles.subtitle}>Sign in to reach your characters</p>
        <p className={styles.detail}>
          Access is invitation-only. Use the email address your GM invited.
          We’ll email you a sign-in link; no password or new account is needed.
          Open the link in the browser where you want to play.
        </p>

        {sentEmail ? (
          <div className={styles.form}>
          <p className={styles.sent} role="status">
            {state === 'sending' ? 'Sending another link to ' : 'Check '}
            <strong>{sentEmail}</strong> for a sign-in link. Check your spam folder
            if it hasn’t arrived. Use the most recent link.
          </p>
          <button type="button" className="btn-primary" disabled={state === 'sending'} onClick={handleSubmit}>
            {state === 'sending' ? 'Sending…' : 'Resend sign-in link'}
          </button>
          <button type="button" className="btn-secondary" disabled={state === 'sending'} onClick={() => {
            setSentEmail(''); setState('idle'); setError('')
          }}>Use a different email</button>
          {error && <p className={styles.error} role="alert">{error}</p>}
          </div>
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
              disabled={state === 'sending'}
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
