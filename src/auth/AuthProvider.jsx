// Authenticated-plane session context (epic #109). Wraps the app and exposes the
// current Supabase user + their profile role. When cloud/auth is disabled
// (supabase === null), it yields a stable anonymous value so the app behaves
// exactly like the localStorage-only build — the guest plane is unaffected.
import { createContext, useEffect, useState, useCallback } from 'react'
import { supabase, authEnabled } from '../utils/supabaseClient.js'

const AuthContext = createContext({
  user: null, profile: null, role: null, loading: false,
  signIn: async () => {}, signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Only "loading" while we actually have an auth backend to resolve a session
  // from; otherwise we're immediately settled as anonymous.
  const [loading, setLoading] = useState(authEnabled)

  const loadProfile = useCallback(async (uid) => {
    if (!supabase || !uid) { setProfile(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', uid)
      .maybeSingle()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    if (!authEnabled || !supabase) { setLoading(false); return }
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const u = data?.session?.user ?? null
      setUser(u)
      await loadProfile(u?.id)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      await loadProfile(u?.id)
    })

    return () => { active = false; sub?.subscription?.unsubscribe() }
  }, [loadProfile])

  const signIn = useCallback(async (email) => {
    if (!supabase) return { error: new Error('Auth is not enabled') }
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
