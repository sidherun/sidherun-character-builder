import { useCloudStatus } from '../hooks/useCloudStatus.js'
import styles from './SyncBanner.module.css'

// Prominent, persistent banner shown ONLY while cloud sync is failing or offline
// (#200). At the table a silent failure reads as "the numbers are fine" when they
// aren't — this makes "your changes aren't saving" impossible to miss, so a GM
// can fix the connection or fall back to paper on purpose. Clears itself when
// sync recovers; the small CloudStatus badge still shows the normal Live/Saving
// states. Renders nothing for the localStorage-only build (status 'off').
const MESSAGES = {
  error:   '⚠ Sync failed — your latest changes may not be saved. Check your connection.',
  offline: '⚠ Offline — changes aren’t syncing. They’ll save when you reconnect.',
}

export default function SyncBanner() {
  const status = useCloudStatus()
  const message = MESSAGES[status]
  if (!message) return null
  return (
    <div className={styles.banner} role="alert" aria-live="assertive">
      {message}
    </div>
  )
}
