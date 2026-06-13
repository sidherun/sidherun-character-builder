import { useEffect, useRef } from 'react'
import { saveCurrent, saveCharacterToRoster } from '../utils/rosterStorage.js'

export function useAutoSave(character) {
  const timerRef = useRef(null)

  useEffect(() => {
    saveCurrent(character)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (character.name?.trim() && character._rosterId) {
        saveCharacterToRoster(character)
      }
    }, 1500)

    return () => clearTimeout(timerRef.current)
  }, [character])
}
