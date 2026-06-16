import { useEffect, useRef, useState } from 'react'
import { saveCurrent, saveCharacterToRoster } from '../utils/rosterStorage.js'

// Autosaves the working character and reports a status the UI can show:
//   'unsaved' — not yet in the roster (no name/_rosterId); saves only on Complete
//   'saving'  — a roster write is pending (debounced)
//   'saved'   — the latest change has been written to the roster
//
// Always writes the immediate "current draft" slot. The roster write is
// debounced, and any pending roster write is flushed on unmount so navigating
// away within the debounce window never leaves the roster entry stale.
export function useAutoSave(character) {
  const [status, setStatus] = useState('idle')
  const timerRef = useRef(null)
  const charRef = useRef(character)
  charRef.current = character

  const eligible = (c) => Boolean(c?.name?.trim() && c?._rosterId)

  useEffect(() => {
    saveCurrent(character)
    if (!eligible(character)) {
      setStatus('unsaved')
      return
    }
    setStatus('saving')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveCharacterToRoster(character)
      setStatus('saved')
    }, 1500)
    return () => clearTimeout(timerRef.current)
  }, [character])

  // Flush a pending roster save on unmount (e.g. navigating away mid-debounce).
  useEffect(() => () => {
    const c = charRef.current
    if (eligible(c)) saveCharacterToRoster(c)
  }, [])

  return status
}
