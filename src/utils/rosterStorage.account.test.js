import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCurrent, loadCurrent, saveCurrent } from './rosterStorage.js'
import { createDefaultCharacter } from './defaultCharacter.js'

beforeEach(() => {
  const data = new Map()
  vi.stubGlobal('localStorage', {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  })
})
afterEach(() => vi.unstubAllGlobals())
describe('account current drafts (#390)', () => {
  it('keeps legacy Oryn and account A out of a new account B', () => {
    const oryn = { ...createDefaultCharacter(), name: 'Oryn Vesh', _ownerUserId: 'account-a' }
    saveCurrent(oryn)
    saveCurrent(oryn, 'account-a')
    expect(loadCurrent('account-b')).toBeNull()
    expect(loadCurrent('account-a').name).toBe('Oryn Vesh')
    expect(loadCurrent().name).toBe('Oryn Vesh')
  })
  it('preserves both accounts through switching and clears only the selected draft', () => {
    saveCurrent({ ...createDefaultCharacter(), name: 'Oryn Vesh' }, 'account-a')
    saveCurrent({ ...createDefaultCharacter(), name: 'New player' }, 'account-b')
    clearCurrent('account-b')
    expect(loadCurrent('account-b')).toBeNull()
    expect(loadCurrent('account-a').name).toBe('Oryn Vesh')
  })
  it('keeps explicit guest drafts independent of signed-in drafts', () => {
    saveCurrent({ ...createDefaultCharacter(), name: 'Guest link' })
    saveCurrent({ ...createDefaultCharacter(), name: 'Player' }, 'account-a')
    clearCurrent()
    expect(loadCurrent()).toBeNull()
    expect(loadCurrent('account-a').name).toBe('Player')
  })
})
