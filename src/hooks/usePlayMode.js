import { useState, useCallback } from 'react'

export function usePlayMode() {
  const [isPlayMode, setIsPlayMode] = useState(false)
  const enterPlayMode = useCallback(() => setIsPlayMode(true), [])
  const exitPlayMode  = useCallback(() => setIsPlayMode(false), [])
  return { isPlayMode, enterPlayMode, exitPlayMode }
}
