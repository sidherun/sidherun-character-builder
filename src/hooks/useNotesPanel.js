import { useState, useCallback } from 'react'

export function useNotesPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const openNotes  = useCallback(() => setIsOpen(true), [])
  const closeNotes = useCallback(() => setIsOpen(false), [])
  const toggleNotes = useCallback(() => setIsOpen(v => !v), [])
  return { isNotesOpen: isOpen, openNotes, closeNotes, toggleNotes }
}
