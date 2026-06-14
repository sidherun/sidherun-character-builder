import { useState, useCallback } from 'react'

export function usePlayMode(initialState = false) {
  const [isPlayMode, setIsPlayMode] = useState(initialState)
  const enterPlayMode = useCallback(() => setIsPlayMode(true), [])
  const exitPlayMode  = useCallback(() => setIsPlayMode(false), [])
  return { isPlayMode, enterPlayMode, exitPlayMode }
}
