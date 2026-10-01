import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  channels: [],
  removed: 0,
  setAuth: vi.fn(async () => {}),
  invoke: vi.fn(),
  session: null,
  sessionGate: null,
}))

vi.mock('./supabaseClient.js', () => ({
  supabase: {
    rpc: (...args) => h.rpc(...args),
    channel(topic, opts) {
      const ch = {
        topic,
        opts,
        subscribed: false,
        on() { return ch },
        subscribe() { ch.subscribed = true; return ch },
      }
      h.channels.push(ch)
      return ch
    },
    removeChannel() { h.removed += 1 },
    realtime: { setAuth: (...args) => h.setAuth(...args) },
    auth: { getSession: async () => {
      if (h.sessionGate) await h.sessionGate
      return { data: { session: h.session } }
    } },
    functions: { invoke: (...args) => h.invoke(...args) },
  },
}))

import { bindRollPublisher, broadcastRoll, subscribeRollFeed } from './rollFeed.js'
import { installRealtimeAuth, resetRealtimeAuthForTests } from './realtimeAuth.js'

beforeEach(() => {
  resetRealtimeAuthForTests()
  h.rpc.mockReset().mockResolvedValue({ error: null })
  h.channels = []
  h.removed = 0
  h.setAuth.mockClear()
  h.invoke.mockReset()
  h.session = null
  h.sessionGate = null
  bindRollPublisher(null)
})

describe('authorized and unauthorized roll publish', () => {
  it('publishes a capability-token roll without the client identity', async () => {
    bindRollPublisher({ capabilityToken: 'capability-token', characterId: 'should-not-be-used' })
    await broadcastRoll({
      kind: 'initiative', actor: 'Hacker', rosterId: 'fake', total: 18, roll: 9,
    })
    expect(h.rpc).toHaveBeenCalledWith('publish_roll_for_token', {
      p_token: 'capability-token',
      p_roll: { kind: 'initiative', total: 18, roll: 9 },
    })
    expect(h.channels).toEqual([])
  })

  it('publishes a signed-in roll by character id, still without client identity', async () => {
    bindRollPublisher({ characterId: '33200000-0000-4000-8000-000000000010' })
    await broadcastRoll({ kind: 'total', actor: 'Hacker', rosterId: 'fake', total: 40 })
    expect(h.rpc).toHaveBeenCalledWith('publish_roll', {
      p_character_id: '33200000-0000-4000-8000-000000000010',
      p_roll: { kind: 'total', total: 40 },
    })
  })

  it('does not publish to a campaign when the roller has no character credential', async () => {
    await broadcastRoll({ kind: 'total', actor: 'Hacker', total: 5 })
    expect(h.rpc).not.toHaveBeenCalled()
  })
})

describe('authorized and unauthorized roll subscribe', () => {
  it('joins the private campaign channel for a signed-in member', async () => {
    installRealtimeAuth({ type: 'user', key: 'user' })
    h.session = { access_token: 'member-jwt', expires_at: Math.floor(Date.now() / 1000) + 3600 }
    const stop = subscribeRollFeed(() => {}, { campaignId: 'a1111111-1111-4111-8111-111111111111' })
    await vi.waitFor(() => expect(h.channels[0]?.subscribed).toBe(true))
    expect(h.channels[0].topic).toBe('table:a1111111-1111-4111-8111-111111111111')
    expect(h.channels[0].opts.config.private).toBe(true)
    expect(h.setAuth).toHaveBeenCalledWith('member-jwt')
    stop()
  })

  it('does not join when the signed-in session is missing', async () => {
    installRealtimeAuth({ type: 'user', key: 'user' })
    const stop = subscribeRollFeed(() => {}, { campaignId: 'a1111111-1111-4111-8111-111111111111' })
    await vi.waitFor(() => expect(h.removed).toBe(1))
    expect(h.channels[0].subscribed).toBe(false)
    stop()
  })

  it('joins every campaign channel opened while the first grant is still in flight', async () => {
    let release
    h.sessionGate = new Promise(resolve => { release = resolve })
    installRealtimeAuth({ type: 'user', key: 'user' })
    h.session = { access_token: 'member-jwt', expires_at: Math.floor(Date.now() / 1000) + 3600 }
    const stopA = subscribeRollFeed(() => {}, { campaignId: 'a1111111-1111-4111-8111-111111111111' })
    const stopB = subscribeRollFeed(() => {}, { campaignId: 'b2222222-2222-4222-8222-222222222222' })
    release()
    await vi.waitFor(() => expect(h.channels.filter(ch => ch.subscribed)).toHaveLength(2))
    expect(h.removed).toBe(0)
    expect(h.channels.map(ch => ch.topic).sort()).toEqual([
      'table:a1111111-1111-4111-8111-111111111111',
      'table:b2222222-2222-4222-8222-222222222222',
    ])
    stopA()
    stopB()
  })

  it('does not join a guest whose capability token no longer exchanges', async () => {
    installRealtimeAuth({
      type: 'capability',
      key: 'old-token',
      secret: () => 'old-token',
    })
    h.invoke.mockResolvedValue({ data: null, error: { context: { status: 401 } } })
    const stop = subscribeRollFeed(() => {}, { campaignId: 'a1111111-1111-4111-8111-111111111111' })
    await vi.waitFor(() => expect(h.removed).toBe(1))
    expect(h.channels[0].subscribed).toBe(false)
    expect(h.invoke).toHaveBeenCalledWith('realtime-token', { body: { capabilityToken: 'old-token' } })
    stop()
  })
})
