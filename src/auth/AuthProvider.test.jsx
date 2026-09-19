import { describe, it, expect, vi } from 'vitest'
import { act, useContext } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// A fake Supabase client that reproduces auth-js's init lock: getSession() and
// every query wait for initialization, and initialization (a stale session being
// refreshed on load) awaits the onAuthStateChange callbacks. An async callback
// that awaits a query therefore deadlocks, leaving the app blank forever.
const { fake } = vi.hoisted(() => {
  const user = { id: 'u1', email: 'gm@example.com' }
  const session = { user }
  const listeners = []
  let finishInit
  const initialized = new Promise((res) => { finishInit = res })
  const fake = {
    auth: {
      getSession: async () => { await initialized; return { data: { session } } },
      onAuthStateChange: (cb) => {
        listeners.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            await initialized // queries need the access token → wait for init
            return { data: { id: 'u1', email: user.email, display_name: 'GM', role: 'gm' } }
          },
        }),
      }),
    }),
    // Startup refresh: notify subscribers and await them before init resolves.
    async refreshOnLoad() {
      await Promise.all(listeners.map((cb) => cb('TOKEN_REFRESHED', session)))
      finishInit()
    },
  }
  return { fake }
})

vi.mock('../utils/supabaseClient.js', () => ({ supabase: fake, authEnabled: true, cloudEnabled: true }))

import { AuthProvider, AuthContext } from './AuthProvider.jsx'

describe('AuthProvider startup with a stale persisted session', () => {
  it('settles loading and loads the profile instead of deadlocking', async () => {
    let auth
    function Probe() { auth = useContext(AuthContext); return null }
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => { root.render(<AuthProvider><Probe /></AuthProvider>) })
    expect(auth.loading).toBe(true)

    await act(async () => {
      await Promise.race([
        fake.refreshOnLoad(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('auth init deadlocked')), 500)),
      ])
      await new Promise((r) => setTimeout(r, 10)) // let the deferred profile load run
    })

    expect(auth.loading).toBe(false)
    expect(auth.user?.id).toBe('u1')
    expect(auth.role).toBe('gm')
    act(() => root.unmount())
  })
})
