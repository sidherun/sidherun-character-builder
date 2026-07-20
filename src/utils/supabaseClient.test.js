import { describe, expect, it } from 'vitest'
import { REALTIME_EVENTS_PER_SECOND } from './supabaseClient.js'

describe('Supabase Realtime client capacity', () => {
  it('allows one GM client to broadcast a full 14-character table burst with headroom', () => {
    expect(REALTIME_EVENTS_PER_SECOND).toBeGreaterThanOrEqual(20)
  })
})
