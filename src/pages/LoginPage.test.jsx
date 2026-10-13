import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthProvider.jsx'
import LoginPage from './LoginPage.jsx'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, signIn
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container); signIn = vi.fn().mockResolvedValue({ error: null })
  act(() => root.render(<AuthContext.Provider value={{ signIn }}><LoginPage /></AuthContext.Provider>))
})
afterEach(() => { act(() => root.unmount()); container.remove() })
function button(text) { return [...container.querySelectorAll('button')].find(b => b.textContent === text) }
function email(value) {
  const input = container.querySelector('input')
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() { await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
it('explains invited-email access and lets players resend or change the address', async () => {
  expect(container.textContent).toContain('email address your GM invited')
  email(' player@example.com '); await submit()
  expect(signIn).toHaveBeenCalledWith('player@example.com')
  await act(async () => button('Resend sign-in link').click())
  expect(signIn).toHaveBeenCalledTimes(2)
  act(() => button('Use a different email').click())
  expect(container.querySelector('input')).not.toBeNull()
  email('other@example.com'); await submit()
  expect(signIn).toHaveBeenLastCalledWith('other@example.com')
})
it('keeps change-email available after a rejected resend and shows an error', async () => {
  email('player@example.com'); await submit()
  signIn.mockRejectedValueOnce(new Error('Too many requests'))
  await act(async () => button('Resend sign-in link').click())
  expect(container.querySelector('[role="alert"]').textContent).toBe('Too many requests')
  expect(button('Use a different email').disabled).toBe(false)
})
it('blocks duplicate clicks while a resend is pending', async () => {
  email('player@example.com'); await submit()
  let finish
  signIn.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  act(() => button('Resend sign-in link').click())
  expect(button('Sending…').disabled).toBe(true)
  expect(button('Use a different email').disabled).toBe(true)
  await act(async () => finish({ error: null }))
  expect(button('Resend sign-in link').disabled).toBe(false)
})
