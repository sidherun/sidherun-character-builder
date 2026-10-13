import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthProvider.jsx'
import AccountControls from './AccountControls.jsx'
import { pendingDestination } from '../auth/returnDestination.js'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container, root, signOut
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); signOut = vi.fn().mockResolvedValue(); window.history.replaceState(null, '', '/#gm') })
afterEach(() => { act(() => root.unmount()); container.remove() })
function render(user = { email: 'gm@example.com' }) { act(() => root.render(<AuthContext.Provider value={{ user, signOut }}><AccountControls /></AuthContext.Provider>)) }
it('awaits sign-out before moving to login', async () => {
  let finish; signOut.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  render(); act(() => container.querySelector('button').click())
  expect(window.location.hash).toBe('#gm')
  expect(container.querySelector('button').disabled).toBe(true)
  await act(async () => finish())
  expect(window.location.hash).toBe('#login')
  expect(pendingDestination()).toBe('gm')
})
it('preserves the current page and offers retry when sign-out fails', async () => {
  signOut.mockRejectedValueOnce(new Error('offline')); render()
  await act(async () => container.querySelector('button').click())
  expect(window.location.hash).toBe('#gm')
  expect(container.querySelector('[role="alert"]').textContent).toContain('try again')
  expect(container.querySelector('button').disabled).toBe(false)
})
it('keeps guest screens free of account controls', () => { render(null); expect(container.textContent).toBe('') })
