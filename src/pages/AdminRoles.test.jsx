/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const repo = vi.hoisted(() => ({
  users: [
    { id: 'me', display_name: 'Ed Martin', email: 'ed@example.com', role: 'admin' },
    { id: 'dave', display_name: 'Dave Robinson', email: 'dave@example.com', role: 'player' },
    { id: 'max', display_name: 'Max Chartier', email: 'max@example.com', role: 'gm' },
  ],
  setDisplayName: vi.fn(),
  setUserRole: vi.fn(),
}))

vi.mock('../utils/characterRepo.js', () => ({
  listPlayers: vi.fn(async () => repo.users),
  setDisplayName: repo.setDisplayName,
  setUserRole: repo.setUserRole,
}))

import AdminRoles from './AdminRoles.jsx'
import { AuthContext } from '../auth/AuthProvider.jsx'
import { isAdmin, isGmOrAdmin } from '../auth/useAuth.js'
import { filterUsers } from '../utils/adminRoles.js'

let container
let root

const auth = (role = 'admin') => ({ user: { id: 'me' }, role, signOut: () => {} })

async function render(role = 'admin') {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      <AuthContext.Provider value={auth(role)}>
        <AdminRoles onNavigate={() => {}} theme="dark" onToggleTheme={() => {}} />
      </AuthContext.Provider>
    )
    await Promise.resolve()
  })
}

function fill(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  repo.setDisplayName.mockReset()
  repo.setUserRole.mockReset()
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
})

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

describe('filterUsers', () => {
  it('composes case-insensitive name/email search with role filtering', () => {
    expect(filterUsers(repo.users, 'ROBINSON', 'all').map(u => u.id)).toEqual(['dave'])
    expect(filterUsers(repo.users, '@example.com', 'gm').map(u => u.id)).toEqual(['max'])
    expect(filterUsers(repo.users, 'ed', 'player')).toEqual([])
  })
})

describe('AdminRoles', () => {
  it('shows an admins-only message to a non-admin', async () => {
    await render('player')
    expect(container.textContent).toContain('Admins only')
    expect(container.textContent).not.toContain('Manage Roles')
  })

  it('filters the visible rows by search and role', async () => {
    await render()
    const search = container.querySelector('input[type="search"]')
    await act(async () => fill(search, 'example.com'))
    const gm = [...container.querySelectorAll('button')].find(b => b.textContent.startsWith('gm '))
    await act(async () => gm.click())
    expect(container.querySelectorAll('li')).toHaveLength(1)
    expect(container.querySelector('li input[aria-label^="Display name"]').value).toBe('Max Chartier')
  })

  it('rejects a blank display name without writing', async () => {
    await render()
    const input = container.querySelector('input[aria-label="Display name for Dave Robinson"]')
    await act(async () => fill(input, '   '))
    await act(async () => input.form.requestSubmit())
    expect(repo.setDisplayName).not.toHaveBeenCalled()
    expect(input.closest('li').textContent).toContain('Display name is required')
  })

  it('persists a trimmed display name', async () => {
    repo.setDisplayName.mockResolvedValue({ id: 'dave', display_name: 'David Robinson' })
    await render()
    const input = container.querySelector('input[aria-label="Display name for Dave Robinson"]')
    await act(async () => fill(input, '  David Robinson  '))
    await act(async () => { input.form.requestSubmit(); await Promise.resolve() })
    expect(repo.setDisplayName).toHaveBeenCalledWith('dave', 'David Robinson')
    expect(input.value).toBe('David Robinson')
    expect(input.closest('li').textContent).toContain('saved ✓')
  })

  it('rolls the display name back when Supabase rejects the save', async () => {
    repo.setDisplayName.mockRejectedValue(new Error('RLS denied'))
    await render()
    const input = container.querySelector('input[aria-label="Display name for Dave Robinson"]')
    await act(async () => fill(input, 'Wrong Name'))
    await act(async () => { input.form.requestSubmit(); await Promise.resolve() })
    expect(input.value).toBe('Dave Robinson')
    expect(input.closest('li').textContent).toContain('RLS denied')
  })
})
