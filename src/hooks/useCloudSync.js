import { useEffect, useRef } from 'react'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, syncCharacter } from '../utils/cloudSync.js'
import { repoEnabled } from '../utils/characterRepo.js'
import { trackPush } from '../utils/cloudStatus.js'

// Background cloud push, mirroring useAutoSave's debounce. Runs only when cloud
// sync is enabled AND this character is already opted into the cloud (present in
// the cloud map). It never creates rows — the "Push roster to cloud" button and
// cloud-link opens do that. localStorage remains the instant store; this is a
// fire-and-forget background sync.
//
// CRITICAL: this is the GUEST/legacy token plane. For authenticated users
// (repoEnabled), the app writes through characterRepo against the cloud — if this
// also ran, it would push the stale localStorage character over the cloud row via
// the old capability token, clobbering authoritative cloud data (e.g. wiping a
// character's notes). So it must stay off whenever the repo is the source of truth.
export function useCloudSync(character) {
  const timer = useRef(null)
  useEffect(() => {
    if (repoEnabled()) return // authenticated → characterRepo owns cloud writes
    if (!cloudEnabled) return
    if (!character?.name?.trim() || !character?._rosterId) return
    if (!getCloudMap()[character._rosterId]) return // not opted into cloud yet

    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      trackPush(syncCharacter(character)).catch(() => { /* local-first: a failed push never disrupts the user */ })
    }, 1500)
    return () => clearTimeout(timer.current)
  }, [character])
}
