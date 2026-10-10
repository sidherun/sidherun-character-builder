import { describe, it, expect, vi, afterEach } from 'vitest'
import { broadcastRoll, subscribeRollFeed, publishLocalRoll } from './rollFeed.js'

// In the test env the cloud flags are unset, so `supabase` is null. Rolls stay
// on the same-device channel and never touch a network topic.
describe('rollFeed (cloud off)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the in-page bus when BroadcastChannel is unavailable', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    const heard = []
    const stop = subscribeRollFeed(entry => heard.push(entry), { local: true })
    broadcastRoll({ kind: 'total', total: 81, actor: 'Ada' })
    expect(heard[0]).toMatchObject({ kind: 'total', total: 81, actor: 'Ada', transport: 'local' })
    stop()
  })

  it('broadcastRoll is a no-op against the network and never throws', () => {
    expect(() => broadcastRoll({ kind: 'total', label: 'Herbalism', roll: 62, modifier: 19, total: 81 })).not.toThrow()
  })

  it('delivers a same-device roll to another subscriber', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    const heard = []
    const stop = subscribeRollFeed(entry => heard.push(entry), { local: true })
    publishLocalRoll({ kind: 'initiative', actor: 'Ada', total: 14, rosterId: 'local-ada' })
    expect(heard).toEqual([
      expect.objectContaining({ kind: 'initiative', actor: 'Ada', total: 14, transport: 'local' }),
    ])
    stop()
  })

  it('subscribeRollFeed returns an unsubscribe that stops delivery', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    const onRoll = vi.fn()
    const unsub = subscribeRollFeed(onRoll, { local: true })
    unsub()
    publishLocalRoll({ kind: 'total', total: 1 })
    expect(onRoll).not.toHaveBeenCalled()
  })
})
