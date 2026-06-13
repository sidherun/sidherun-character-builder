import { useCallback } from 'react'
import {
  loadCharacterFromRoster,
  saveCharacterToRoster,
  clearCurrent,
} from '../utils/rosterStorage.js'
import { decodeCharacterFromURL } from '../utils/urlState.js'
import { createDefaultCharacter } from '../utils/defaultCharacter.js'
import { safeParseCharacter } from '../utils/characterSchema.js'

export function useCharacterManagement(setCharacter) {
  const startNew = useCallback(() => {
    clearCurrent()
    setCharacter(createDefaultCharacter())
  }, [setCharacter])

  const loadFromRoster = useCallback(id => {
    const data = loadCharacterFromRoster(id)
    if (data) setCharacter(data)
    return !!data
  }, [setCharacter])

  const loadFromURL = useCallback(() => {
    try {
      const data = decodeCharacterFromURL()
      if (!data) return false
      const result = safeParseCharacter(data)
      if (result.success) setCharacter(result.data)
      return result.success
    } catch { return false }
  }, [setCharacter])

  const importJSON = useCallback(jsonStr => {
    try {
      const data = JSON.parse(jsonStr)
      const result = safeParseCharacter(data)
      if (result.success) {
        const char = { ...result.data, _rosterId: null }
        const saved = saveCharacterToRoster(char)
        setCharacter(saved)
        return true
      }
    } catch { /* ignore */ }
    return false
  }, [setCharacter])

  return { startNew, loadFromRoster, loadFromURL, importJSON }
}
