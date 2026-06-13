import styles from './Toast.module.css'

export default function Toast({ toasts, onRemove }) {
  return (
    <div
      className={styles.container}
      aria-live="assertive"
      aria-atomic="true"
      role="status"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`${styles.toast} ${styles[t.type]}`}
          onClick={() => onRemove(t.id)}
          aria-label={`${t.message} — click to dismiss`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
