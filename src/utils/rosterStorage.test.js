import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { saveCharacterToRoster, loadCharacterFromRoster, loadRoster, getLastSaveStatus } from './rosterStorage.js'

// A controlled localStorage so we can deterministically simulate quota failures
// (jsdom's Storage shape varies by version). setItemImpl lets a test override
// write behaviour per key.
function makeStore(setItemImpl) {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (setItemImpl) setItemImpl(k, v); m.set(k, String(v)) },
    removeItem: k => { m.delete(k) },
    clear: () => m.clear(),
  }
}

const quota = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e }

const mk = (over = {}) => ({
  _rosterId: 'fixed-id', name: 'Test', race: 'human', archetype: 'worldly', level: 1,
  hitPoints: { total: 10, current: 10 }, ...over,
})

beforeEach(() => { vi.stubGlobal('localStorage', makeStore()) })
afterEach(() => { vi.unstubAllGlobals() })

describe('saveCharacterToRoster storage hardening', () => {
  it('saves normally and reports ok', () => {
    const c = saveCharacterToRoster(mk())
    expect(c._rosterId).toBe('fixed-id')
    expect(getLastSaveStatus()).toBe('ok')
    expect(loadCharacterFromRoster('fixed-id')).toMatchObject({ name: 'Test' })
    expect(loadRoster().find(r => r.id === 'fixed-id')).toBeTruthy()
  })

  it('does not throw and still saves the character when version history cannot be written', () => {
    vi.stubGlobal('localStorage', makeStore(k => { if (k.startsWith('sidherun_versions_')) quota() }))
    expect(() => saveCharacterToRoster(mk())).not.toThrow()
    expect(getLastSaveStatus()).toBe('truncated')
    expect(loadCharacterFromRoster('fixed-id')).toMatchObject({ name: 'Test' })
  })

  it('reports failed (without throwing) when storage is entirely unwritable', () => {
    vi.stubGlobal('localStorage', makeStore(() => quota()))
    expect(() => saveCharacterToRoster(mk())).not.toThrow()
    expect(getLastSaveStatus()).toBe('failed')
  })
})
