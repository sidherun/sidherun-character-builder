import { describe, it, expect, vi } from 'vitest'
import { getCloudStatus, trackPush, subscribeCloudStatus } from './cloudStatus.js'

// Cloud is off in the test env, so the badge reports 'off' and the app is
// unaffected — but trackPush must still pass promises through untouched.
describe('cloudStatus', () => {
  it('reports "off" when cloud is disabled', () => {
    expect(getCloudStatus()).toBe('off')
  })

  it('trackPush passes a resolved value straight through', async () => {
    await expect(trackPush(Promise.resolve('ok'))).resolves.toBe('ok')
  })

  it('trackPush re-throws a rejection so callers keep their .catch', async () => {
    await expect(trackPush(Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })

  it('subscribeCloudStatus returns an unsubscribe fn and notifies on a push', async () => {
    const fn = vi.fn()
    const unsub = subscribeCloudStatus(fn)
    expect(typeof unsub).toBe('function')
    await trackPush(Promise.resolve())
    expect(fn).toHaveBeenCalled()
    unsub()
  })
})
