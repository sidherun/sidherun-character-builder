import { useCloudStatus } from '../hooks/useCloudStatus.js'
import styles from './CloudStatus.module.css'

// Small badge showing whether cloud sync is live. Renders nothing when cloud is
// off (the localStorage-only build), so it's safe to drop into any header.
const MAP = {
  synced:  { color: 'var(--story)',    label: 'Live' },
  syncing: { color: 'var(--bronze)',   label: 'Saving…' },
  error:   { color: 'var(--danger)',   label: 'Sync error' },
  offline: { color: 'var(--ink-400)',  label: 'Offline' },
}

export default function CloudStatus() {
  const status = useCloudStatus()
  if (status === 'off') return null
  const s = MAP[status] || MAP.synced
  return (
    <span className={styles.status} role="status" aria-live="polite" title={`Cloud sync: ${s.label}`}>
      <span className={styles.dot} style={{ background: s.color }} />
      <span className={styles.label} style={{ color: s.color }}>{s.label}</span>
    </span>
  )
}
