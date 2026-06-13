import styles from './Toast.module.css'

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} onClick={() => onRemove(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
