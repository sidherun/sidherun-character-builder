import { describe, it, expect, vi } from 'vitest'
import { broadcastRoll, subscribeRollFeed, SESSION_ID } from './rollFeed.js'

// In the test env the cloud flags are unset, so `supabase` is null and the roll
// feed must be a safe no-op — the localStorage-only build never touches it.
describe('rollFeed (cloud off)', () => {
  it('uses the single home-table session id (approach A)', () => {
    expect(SESSION_ID).toBe('default')
  })

  it('broadcastRoll is a no-op that never throws', () => {
    expect(() => broadcastRoll({ kind: 'total', label: 'Herbalism', roll: 62, modifier: 19, total: 81 })).not.toThrow()
  })

  it('subscribeRollFeed returns a no-op unsubscribe and never invokes the listener', () => {
    const onRoll = vi.fn()
    const unsub = subscribeRollFeed(onRoll)
    expect(typeof unsub).toBe('function')
    expect(() => unsub()).not.toThrow()
    expect(onRoll).not.toHaveBeenCalled()
  })
})
