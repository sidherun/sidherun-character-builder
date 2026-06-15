import { describe, it, expect, afterEach, vi } from 'vitest'
import { uuid } from './uuid.js'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

afterEach(() => vi.unstubAllGlobals())

describe('uuid', () => {
  it('returns v4-shaped ids that are unique across many calls', () => {
    const ids = new Set()
    for (let i = 0; i < 1000; i++) {
      const id = uuid()
      expect(id).toMatch(V4)
      ids.add(id)
    }
    expect(ids.size).toBe(1000)
  })

  it('works without crypto.randomUUID (non-secure context) via getRandomValues', () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues }) // randomUUID absent → must not throw
    expect(uuid()).toMatch(V4)
  })

  it('falls back to Math.random when crypto is entirely unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    expect(uuid()).toMatch(V4)
  })
})
