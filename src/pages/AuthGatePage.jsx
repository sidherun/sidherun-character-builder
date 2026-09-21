import styles from './LoginPage.module.css'

export function AuthLoadingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card} role="status" aria-live="polite">
        <h1 className={styles.brand}>Sidherun</h1>
        <p className={styles.subtitle}>Restoring your sign-in…</p>
      </div>
    </div>
  )
}

export function AuthRecoveryPage({ reason, onReset }) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.brand}>Sidherun</h1>
        <h2 className={styles.recoveryTitle}>Sign-in needs a fresh start</h2>
        <p className={styles.error} role="alert">
          {reason || 'The app could not restore your saved sign-in.'}
        </p>
        <p className={styles.detail}>
          Your characters, roster backups, and app settings will stay in this browser.
        </p>
        <button className="btn-primary" type="button" onClick={onReset}>
          Clear saved sign-in and try again
        </button>
      </div>
    </div>
  )
}
