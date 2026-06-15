import { useEffect, useRef } from 'react'
import { cloudEnabled } from '../utils/supabaseClient.js'
import { getCloudMap, syncCharacter } from '../utils/cloudSync.js'

// Background cloud push, mirroring useAutoSave's debounce. Runs only when cloud
// sync is enabled AND this character is already opted into the cloud (present in
// the cloud map). It never creates rows — the "Push roster to cloud" button and
// cloud-link opens do that. localStorage remains the instant store; this is a
// fire-and-forget background sync.
export function useCloudSync(character) {
  const timer = useRef(null)
  useEffect(() => {
    if (!cloudEnabled) return
    if (!character?.name?.trim() || !character?._rosterId) return
    if (!getCloudMap()[character._rosterId]) return // not opted into cloud yet

    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      syncCharacter(character).catch(() => { /* local-first: a failed push never disrupts the user */ })
    }, 1500)
    return () => clearTimeout(timer.current)
  }, [character])
}
