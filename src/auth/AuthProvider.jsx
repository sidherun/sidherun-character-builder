// Authenticated-plane session context (epic #109). Wraps the app and exposes the
// current Supabase user + their profile role. When cloud/auth is disabled
// (supabase === null), it yields a stable anonymous value so the app behaves
// exactly like the localStorage-only build — the guest plane is unaffected.
import { createContext, useEffect, useState, useCallback } from 'react'
import {
  supabase,
  authEnabled,
  clearPersistedAuthSession,
} from '../utils/supabaseClient.js'

export const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000

const AuthContext = createContext({
  user: null, profile: null, role: null, loading: false,
  startupError: null,
  signIn: async () => {}, signOut: async () => {}, recoverAuth: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Only "loading" while we actually have an auth backend to resolve a session
  // from; otherwise we're immediately settled as anonymous.
  const [loading, setLoading] = useState(authEnabled)
  const [startupError, setStartupError] = useState(null)

  const fetchProfile = useCallback(async (uid) => {
    if (!supabase || !uid) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', uid)
      .maybeSingle()
    if (error) throw error
    return data || null
  }, [])

  useEffect(() => {
    if (!authEnabled || !supabase) { setLoading(false); return }
    let active = true
    let startupState = 'pending' // pending | ready | recovery
    let startupStage = 'restoring your saved session'
    let currentUserId = null
    let timeout

    const armTimeout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (!active || startupState !== 'pending') return
        startupState = 'recovery'
        currentUserId = null
        setUser(null)
        setProfile(null)
        setStartupError(`The app timed out while ${startupStage}.`)
        setLoading(false)
        console.error(`Auth bootstrap timed out while ${startupStage}`)
      }, AUTH_BOOTSTRAP_TIMEOUT_MS)
    }
    armTimeout()

    const finishStartup = (nextUser, nextProfile) => {
      if (!active || startupState === 'recovery') return
      startupState = 'ready'
      currentUserId = nextUser?.id ?? null
      clearTimeout(timeout)
      setUser(nextUser)
      setProfile(nextProfile)
      setStartupError(null)
      setLoading(false)
    }

    const failStartup = (stage, err) => {
      if (!active || startupState === 'recovery') return
      if (startupState === 'ready') {
        console.error(`Auth update failed while ${stage}`, err)
        return
      }
      startupState = 'recovery'
      currentUserId = null
      clearTimeout(timeout)
      setUser(null)
      setProfile(null)
      setStartupError(`The app could not finish ${stage}.`)
      setLoading(false)
      console.error(`Auth bootstrap failed while ${stage}`, err)
    }

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!active || startupState === 'recovery') return
        const u = data?.session?.user ?? null
        startupStage = u ? 'loading your account permissions' : startupStage
        const nextProfile = await fetchProfile(u?.id)
        finishStartup(u, nextProfile)
      })
      .catch((err) => failStartup(startupStage, err))

    // Must NOT await Supabase calls inside this callback: auth-js awaits it while
    // holding its init lock, and any query needs that lock for its token. With a
    // stale persisted session the startup refresh fires TOKEN_REFRESHED here, the
    // profile query waits on init, init waits on us, and the app stays blank
    // forever. Defer the profile load until after the callback returns.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setTimeout(() => {
        if (!active || startupState === 'recovery') return
        startupStage = u ? 'loading your account permissions' : startupStage
        // A magic-link callback can arrive just after getSession() settled as
        // anonymous. Treat that first signed-in profile load as bootstrap too,
        // with its own deadline, so a fresh private session cannot hang.
        if (startupState === 'ready' && !currentUserId && u) {
          startupState = 'pending'
          setLoading(true)
          armTimeout()
        }
        fetchProfile(u?.id)
          .then((nextProfile) => finishStartup(u, nextProfile))
          .catch((err) => failStartup(startupStage, err))
      }, 0)
    })

    return () => {
      active = false
      clearTimeout(timeout)
      sub?.subscription?.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email) => {
    if (!supabase) return { error: new Error('Auth is not enabled') }
    return supabase.auth.signInWithOtp({
      email,
      options: {
        // Invite-only: never create a new account from the app. An unknown email
        // is refused (LoginPage shows an invite-only message) rather than silently
        // registering a stranger. Existing players sign in unchanged. The matching
        // server-side gate is Supabase's "disable new sign-ups" setting — see
        // README (auth section); this is the app-side half of that lockdown (#209).
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const recoverAuth = useCallback(() => {
    // Do not call supabase.auth.signOut() here. A stuck auth initialization can
    // block signOut on the same internal lock. Removing the three namespaced
    // auth entries is synchronous, local to this browser, and leaves all
    // Sidherun character and preference data untouched.
    clearPersistedAuthSession()
    window.location.hash = '#login'
    window.location.reload()
  }, [])

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    startupError,
    signIn,
    signOut,
    recoverAuth,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
