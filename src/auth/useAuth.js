import { useContext } from 'react'
import { AuthContext } from './AuthProvider.jsx'

// Access the current authenticated-plane session: { user, profile, role,
// loading, signIn, signOut }. Returns the anonymous default when auth is off.
export function useAuth() {
  return useContext(AuthContext)
}

export const isGmOrAdmin = (role) => role === 'gm' || role === 'admin'
