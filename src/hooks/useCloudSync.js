import { useEffect, useRef } from 'react'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, syncCharacter } from '../utils/cloudSync.js'
import { trackPush } from '../utils/cloudStatus.js'

// Background cloud push, mirroring useAutoSave's debounce. Runs only when cloud
// sync is enabled AND this character is already opted into the cloud (present in
// the cloud map). It never creates rows — the "Push roster to cloud" button and
// cloud-link opens do that. localStorage remains the instant store; this is a
// fire-and-forget background sync.
//
// Pick the write plane from the resolved session, not the build-time auth flag.
// A #c= link explicitly grants capability-token access, even when its visitor is
// signed in. Otherwise signed-in sessions use characterRepo and signed-out
// sessions use this guest plane. While auth is still resolving, neither plane
// should write.
export function selectCloudWritePlane({ user, authLoading, capabilityToken } = {}) {
  if (capabilityToken) return 'guest'
  if (authLoading) return null
  return user ? 'repo' : 'guest'
}

// CRITICAL: this is the GUEST/legacy token plane. Authenticated repository
// characters must stay off it or they can double-write stale localStorage data
// over the authoritative row. App uses the same returned plane to disable its
// characterRepo effects when a signed-in visitor explicitly opens a #c= link.
export function useCloudSync(character, session, pendingWrites) {
  const fallbackTimer = useRef(null)
  const plane = selectCloudWritePlane(session)
  useEffect(() => {
    if (plane !== 'guest') return
    if (!cloudEnabled) return
    if (!character?.name?.trim() || !character?._rosterId) return
    if (!getCloudMap()[character._rosterId]) return // not opted into cloud yet

    const snapshot = character
    if (pendingWrites) {
      pendingWrites.schedule('guest', {
        characterId: character._rosterId,
        delay: 1500,
        run: () => trackPush(syncCharacter(snapshot)),
      })
      return
    }
    clearTimeout(fallbackTimer.current)
    fallbackTimer.current = setTimeout(() => {
      trackPush(syncCharacter(snapshot)).catch(() => { /* local-first: a failed push never disrupts the user */ })
    }, 1500)
    return () => clearTimeout(fallbackTimer.current)
  }, [character, plane, pendingWrites])

  useEffect(() => {
    if (!pendingWrites || plane !== 'guest' || !character?._rosterId) return
    const rosterId = character._rosterId
    return () => { pendingWrites.flushCharacter(rosterId) }
  }, [character?._rosterId, plane, pendingWrites])
  return plane
}
