import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { guideEnabled, setGuide } from './onboarding.js'

const KEY = 'sidherun_guide'

// A controlled localStorage, matching rosterStorage.test.js's idiom (jsdom's
// Storage shape varies by version, so tests stub it rather than relying on it).
function makeStore(overrides = {}) {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => { m.delete(k) },
    clear: () => m.clear(),
    ...overrides,
  }
}

beforeEach(() => { vi.stubGlobal('localStorage', makeStore()) })
afterEach(() => { vi.unstubAllGlobals() })

describe('onboarding guide preference (#onboarding)', () => {
  it('defaults on for a first-time visitor (empty roster, no explicit setting)', () => {
    expect(guideEnabled(true)).toBe(true)
  })

  it('defaults off for a returning visitor (non-empty roster, no explicit setting)', () => {
    expect(guideEnabled(false)).toBe(false)
  })

  it('an explicit "on" setting wins even with a non-empty roster', () => {
    setGuide(true)
    expect(guideEnabled(false)).toBe(true)
  })

  it('an explicit "off" setting wins even with an empty roster', () => {
    setGuide(false)
    expect(guideEnabled(true)).toBe(false)
  })

  it('setGuide persists the raw on/off string under the sidherun_guide key', () => {
    setGuide(true)
    expect(localStorage.getItem(KEY)).toBe('on')
    setGuide(false)
    expect(localStorage.getItem(KEY)).toBe('off')
  })

  it('does not throw when localStorage.getItem fails (e.g. private-mode quota)', () => {
    vi.stubGlobal('localStorage', makeStore({ getItem: () => { throw new Error('blocked') } }))
    expect(() => guideEnabled(true)).not.toThrow()
    expect(guideEnabled(true)).toBe(true)
    expect(guideEnabled(false)).toBe(false)
  })

  it('does not throw when localStorage.setItem fails', () => {
    vi.stubGlobal('localStorage', makeStore({ setItem: () => { throw new Error('blocked') } }))
    expect(() => setGuide(true)).not.toThrow()
  })
})
