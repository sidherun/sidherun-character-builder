import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AdminRoles from './AdminRoles.jsx'
import { AuthContext } from '../auth/AuthProvider.jsx'
import { isAdmin, isGmOrAdmin } from '../auth/useAuth.js'

const render = (role) => renderToStaticMarkup(
  <AuthContext.Provider value={{ user: { id: 'me' }, role, signOut: () => {} }}>
    <AdminRoles onNavigate={() => {}} theme="dark" onToggleTheme={() => {}} />
  </AuthContext.Provider>
)

describe('role helpers', () => {
  it('isAdmin is true only for admin', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('gm')).toBe(false)
    expect(isAdmin('player')).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
  it('isGmOrAdmin covers gm and admin, not player', () => {
    expect(isGmOrAdmin('admin')).toBe(true)
    expect(isGmOrAdmin('gm')).toBe(true)
    expect(isGmOrAdmin('player')).toBe(false)
  })
})

describe('AdminRoles gating', () => {
  it('shows an admins-only message to a non-admin', () => {
    const html = render('player')
    expect(html).toContain('Admins only')
    expect(html).not.toContain('Manage Roles')
  })

  it('renders the manage-roles view for an admin', () => {
    const html = render('admin')
    expect(html).toContain('Manage Roles')
    // the sign-in-once guidance is always shown so an admin knows who appears
    expect(html).toContain('signed in at least once')
  })
})
