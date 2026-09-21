import { describe, expect, it, vi } from 'vitest'
import {
  clearPersistedAuthSession,
  REALTIME_EVENTS_PER_SECOND,
} from './supabaseClient.js'

describe('Supabase Realtime client capacity', () => {
  it('allows one GM client to broadcast a full 14-character table burst with headroom', () => {
    expect(REALTIME_EVENTS_PER_SECOND).toBeGreaterThanOrEqual(20)
  })
})

describe('clearPersistedAuthSession', () => {
  it('removes only the local Supabase session entries', () => {
    const removeItem = vi.fn()
    const storage = { removeItem }

    clearPersistedAuthSession(storage, 'sb-project-auth-token')

    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([
      'sb-project-auth-token',
      'sb-project-auth-token-code-verifier',
      'sb-project-auth-token-user',
    ])
    expect(removeItem).not.toHaveBeenCalledWith('sidherun_roster')
    expect(removeItem).not.toHaveBeenCalledWith('sidherun_theme')
    expect(removeItem).not.toHaveBeenCalledWith('sidherun_cloud_map')
  })
})
