import { describe, expect, it, vi } from 'vitest'
import { openCharacterPrintWindow } from './printCharacters.js'
import { createDefaultCharacter } from './defaultCharacter.js'

const character = name => ({ ...createDefaultCharacter(), name })

describe('openCharacterPrintWindow', () => {
  it('opens one batch document and schedules URL cleanup', () => {
    const revokeObjectURL = vi.fn()
    const scheduleRevoke = vi.fn(fn => fn())
    const openWindow = vi.fn(() => ({}))
    expect(openCharacterPrintWindow([character('Bella'), character('Dulu')], 'Thursday Table', {
      createObjectURL: () => 'blob:print', revokeObjectURL, scheduleRevoke, openWindow,
    })).toBe(true)
    expect(openWindow).toHaveBeenCalledWith('blob:print')
    expect(scheduleRevoke).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:print')
  })

  it('reports a blocked popup and revokes the unused URL immediately', () => {
    const revokeObjectURL = vi.fn()
    const scheduleRevoke = vi.fn()
    expect(openCharacterPrintWindow([character('Bella')], 'Bella', {
      createObjectURL: () => 'blob:blocked', revokeObjectURL, scheduleRevoke,
      openWindow: () => null,
    })).toBe(false)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:blocked')
    expect(scheduleRevoke).not.toHaveBeenCalled()
  })

  it('does nothing for an empty selection', () => {
    expect(openCharacterPrintWindow([], 'Empty', { openWindow: vi.fn() })).toBe(false)
  })
})
