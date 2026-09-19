import { useEffect, useRef } from 'react'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, subscribeCharacter, unsubscribeCharacter } from '../utils/cloudSync.js'

// Subscribe to a cloud-mapped character's realtime channel and hand each remote
// live-counter broadcast to `onLive`. Callbacks also receive the subscribed
// rosterId so a late event cannot be mistaken for the newly opened character.
// No-op unless cloud is enabled and this
// character is in the cloud map. The callback is kept in a ref so a new closure
// each render doesn't churn the subscription — we only re-subscribe when the
// rosterId changes.
export function useRealtimeCharacter(rosterId, onLive, onData) {
  const cb = useRef(onLive)
  cb.current = onLive
  const dataCb = useRef(onData)
  dataCb.current = onData

  useEffect(() => {
    if (!cloudEnabled || !rosterId) return
    if (!getCloudMap()[rosterId]) return
    subscribeCharacter(
      rosterId,
      payload => cb.current(payload, rosterId),
      () => dataCb.current?.(rosterId),
    )
    return () => unsubscribeCharacter(rosterId)
  }, [rosterId])
}
