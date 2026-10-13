import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./utils/supabaseClient.js', () => ({ authEnabled: true, supabase: null }))
vi.mock('./App.jsx', () => ({ default: () => <p>Builder</p> }))
vi.mock('./pages/RosterPage.jsx', () => ({ default: () => <p>Roster</p> }))
vi.mock('./pages/GMScreen.jsx', () => ({ default: () => <p>GM screen</p> }))
vi.mock('./pages/AdminRoles.jsx', () => ({ default: () => <p>Admin</p> }))
import Router from './Router.jsx'
import { AuthContext } from './auth/AuthProvider.jsx'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container, root
const account = { user: { id: 'p', email: 'player@example.com' }, role: 'player', loading: false, signOut: vi.fn(), signIn: vi.fn() }
beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, '', '/'); container = document.createElement('div'); document.body.append(container); root = createRoot(container) })
afterEach(() => { act(() => root.unmount()); container.remove() })
async function render(auth) { await act(async () => root.render(<AuthContext.Provider value={auth}><Router /></AuthContext.Provider>)) }
it('remembers the requested protected route before login and returns after sign-in', async () => {
  window.history.replaceState(null, '', '/#roster')
  await render({ ...account, user: null })
  expect(window.location.hash).toBe('#login')
  await act(async () => window.dispatchEvent(new Event('hashchange')))
  await render(account)
  expect(window.location.hash).toBe('#roster')
})
it('honors a callback destination in a fresh signed-in browser', async () => {
  window.history.replaceState(null, '', '/?returnTo=gm')
  await render({ ...account, role: 'gm' })
  expect(window.location.hash).toBe('#gm')
  expect(window.location.search).toBe('')
})
it('explains wrong-role access without silently redirecting', async () => {
  window.history.replaceState(null, '', '/#admin')
  await render(account)
  expect(container.textContent).toContain('requires an admin account')
  expect(container.textContent).toContain('player@example.com')
  expect(container.textContent).toContain('Sign out / change account')
  expect(window.location.hash).toBe('#admin')
})
it('does not gate guest play links behind login', async () => {
  window.history.replaceState(null, '', '/#play=snapshot')
  await render({ ...account, user: null })
  expect(window.location.hash).toBe('#play=snapshot')
  expect(container.textContent).toBe('Builder')
})
