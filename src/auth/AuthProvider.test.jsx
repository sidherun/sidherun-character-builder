import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act, useContext } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { fake, controls } = vi.hoisted(() => {
  const user = { id: 'u1', email: 'gm@example.com' }
  const session = { user }
  let listeners = []
  let getSessionImpl
  let profileImpl

  const controls = {
    user,
    session,
    reset() {
      listeners = []
      getSessionImpl = async () => ({ data: { session } })
      profileImpl = async () => ({
        data: { id: 'u1', email: user.email, display_name: 'GM', role: 'gm' },
        error: null,
      })
    },
    setGetSession(fn) { getSessionImpl = fn },
    setProfile(fn) { profileImpl = fn },
    async emit(event, nextSession) {
      await Promise.all(listeners.map((cb) => cb(event, nextSession)))
    },
  }
  controls.reset()

  const fake = {
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: (...args) => getSessionImpl(...args),
      onAuthStateChange: (cb) => {
        listeners.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: (...args) => profileImpl(...args) }),
      }),
    }),
  }
  return { fake, controls }
})

vi.mock('../utils/supabaseClient.js', () => ({
  supabase: fake,
  authEnabled: true,
  cloudEnabled: true,
  clearPersistedAuthSession: vi.fn(),
}))

import {
  AuthProvider,
  AuthContext,
  AUTH_BOOTSTRAP_TIMEOUT_MS,
} from './AuthProvider.jsx'

function renderProbe() {
  let auth
  function Probe() { auth = useContext(AuthContext); return null }
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => { root.render(<AuthProvider><Probe /></AuthProvider>) })
  return { root, getAuth: () => auth }
}

beforeEach(() => {
  controls.reset()
  fake.auth.signOut.mockReset().mockResolvedValue({ error: null })
  fake.auth.signInWithOtp.mockReset().mockResolvedValue({ error: null })
  window.history.replaceState(null, '', '/')
  sessionStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('AuthProvider login and logout', () => {
  it('includes the allowed return destination in the emailed callback', async () => {
    const probe = renderProbe()
    await act(async () => {})
    window.history.replaceState(null, '', '/?returnTo=gm#login')
    await act(async () => probe.getAuth().signIn('gm@example.com'))
    const options = fake.auth.signInWithOtp.mock.calls[0][0].options
    expect(options.shouldCreateUser).toBe(false)
    expect(new URL(options.emailRedirectTo).searchParams.get('returnTo')).toBe('gm')
    expect(new URL(options.emailRedirectTo).hash).toBe('')
    act(() => probe.root.unmount())
  })

  it('keeps the account when logout fails and signs out this browser on success', async () => {
    const probe = renderProbe()
    await act(async () => {})
    fake.auth.signOut.mockResolvedValueOnce({ error: new Error('offline') })
    await act(async () => {
      await expect(probe.getAuth().signOut()).rejects.toThrow('offline')
    })
    expect(probe.getAuth().user.id).toBe('u1')
    await act(async () => probe.getAuth().signOut())
    expect(fake.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
    expect(probe.getAuth().user).toBeNull()
    act(() => probe.root.unmount())
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AuthProvider startup', () => {
  it('settles loading and loads the profile without the auth-init deadlock from #330', async () => {
    let finishInit
    const initialized = new Promise((resolve) => { finishInit = resolve })
    controls.setGetSession(async () => {
      await initialized
      return { data: { session: controls.session } }
    })
    controls.setProfile(async () => {
      await initialized
      return {
        data: { id: 'u1', email: controls.user.email, display_name: 'GM', role: 'gm' },
        error: null,
      }
    })

    const view = renderProbe()
    expect(view.getAuth().loading).toBe(true)

    await act(async () => {
      await Promise.race([
        controls.emit('TOKEN_REFRESHED', controls.session),
        new Promise((_, reject) => setTimeout(() => reject(new Error('auth init deadlocked')), 500)),
      ])
      finishInit()
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(view.getAuth().loading).toBe(false)
    expect(view.getAuth().startupError).toBe(null)
    expect(view.getAuth().user?.id).toBe('u1')
    expect(view.getAuth().role).toBe('gm')
    act(() => view.root.unmount())
  })

  it('leaves loading for recovery when getSession never resolves', async () => {
    vi.useFakeTimers()
    controls.setGetSession(() => new Promise(() => {}))
    const view = renderProbe()

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS) })

    expect(view.getAuth().loading).toBe(false)
    expect(view.getAuth().startupError).toContain('restoring your saved session')
    expect(view.getAuth().user).toBe(null)
    act(() => view.root.unmount())
  })

  it('leaves loading for recovery when the initial profile lookup never resolves', async () => {
    vi.useFakeTimers()
    controls.setProfile(() => new Promise(() => {}))
    const view = renderProbe()
    await act(async () => { await Promise.resolve() })

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS) })

    expect(view.getAuth().loading).toBe(false)
    expect(view.getAuth().startupError).toContain('loading your account permissions')
    expect(view.getAuth().user).toBe(null)
    act(() => view.root.unmount())
  })

  it('bounds the first profile lookup when a magic-link session arrives after anonymous startup', async () => {
    vi.useFakeTimers()
    controls.setGetSession(async () => ({ data: { session: null } }))
    const view = renderProbe()
    await act(async () => { await Promise.resolve() })
    expect(view.getAuth().loading).toBe(false)

    controls.setProfile(() => new Promise(() => {}))
    await act(async () => {
      await controls.emit('SIGNED_IN', controls.session)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(view.getAuth().loading).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS) })
    expect(view.getAuth().loading).toBe(false)
    expect(view.getAuth().startupError).toContain('loading your account permissions')
    act(() => view.root.unmount())
  })

  it('does not let a late session result dismiss recovery after timeout', async () => {
    vi.useFakeTimers()
    let resolveSession
    controls.setGetSession(() => new Promise((resolve) => { resolveSession = resolve }))
    const view = renderProbe()

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS) })
    const recoveryMessage = view.getAuth().startupError
    await act(async () => {
      resolveSession({ data: { session: controls.session } })
      await Promise.resolve()
    })

    expect(view.getAuth().loading).toBe(false)
    expect(view.getAuth().startupError).toBe(recoveryMessage)
    expect(view.getAuth().user).toBe(null)
    act(() => view.root.unmount())
  })
})
