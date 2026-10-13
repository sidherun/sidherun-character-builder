import { beforeEach, describe, expect, it } from 'vitest'
import { validDestination, rememberDestination, pendingDestination, clearDestination, signInRedirectUrl } from './returnDestination.js'

beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, '', '/') })
describe('login return destinations', () => {
  it('rejects external URLs, capability tokens, and unknown routes', () => {
    for (const value of ['https://evil.invalid', '//evil.invalid', 'c=secret', 'play=secret', 'login', '', null]) {
      expect(validDestination(value)).toBeNull()
      rememberDestination(value)
      expect(pendingDestination()).toBeNull()
    }
  })
  it('carries a protected destination in the email callback without hash tokens', () => {
    rememberDestination('gm')
    window.history.replaceState(null, '', '/#access_token=secret')
    const url = new URL(signInRedirectUrl())
    expect(url.searchParams.get('returnTo')).toBe('gm')
    expect(url.hash).toBe('')
    expect(url.href).not.toContain('secret')
  })
  it('uses a validated callback destination in a fresh browser and consumes it', () => {
    window.history.replaceState(null, '', '/?returnTo=roster&other=keep#login')
    expect(pendingDestination()).toBe('roster')
    clearDestination()
    expect(pendingDestination()).toBeNull()
    expect(window.location.search).toBe('?other=keep')
    expect(window.location.hash).toBe('#login')
  })
  it('ignores a malicious callback and falls back to a remembered internal route', () => {
    rememberDestination('admin')
    window.history.replaceState(null, '', '/?returnTo=https://evil.invalid')
    expect(pendingDestination()).toBe('admin')
  })
})
