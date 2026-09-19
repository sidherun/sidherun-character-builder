import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({ syncCharacter: vi.fn(), trackPush: vi.fn() }))

vi.mock('../utils/supabaseClient.js', () => ({ cloudEnabled: true }))
vi.mock('../utils/cloudSync.js', () => ({
  getCloudMap: () => ({ localHero: { id: 'cloud-hero', token: 'capability-token' } }),
  syncCharacter: h.syncCharacter,
}))
vi.mock('../utils/cloudStatus.js', () => ({ trackPush: h.trackPush }))

import { selectCloudWritePlane, useCloudSync } from './useCloudSync.js'
import { createPendingCharacterWrites } from '../utils/pendingCharacterWrites.js'

const character = { name: 'Hero', _rosterId: 'localHero' }

function Probe({ session, value = character, pendingWrites }) {
  useCloudSync(value, session, pendingWrites)
  return null
}

async function renderSession(session, pendingWrites) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => { root.render(<Probe session={session} pendingWrites={pendingWrites} />) })
  return root
}

beforeEach(() => {
  vi.useFakeTimers()
  h.syncCharacter.mockReset().mockResolvedValue({ channel: 'live' })
  h.trackPush.mockReset().mockImplementation(promise => promise)
})

describe('cloud write-plane selection', () => {
  it('keeps a valid capability link on the guest plane for signed-out and signed-in visitors', () => {
    expect(selectCloudWritePlane({ user: null, authLoading: false, capabilityToken: 'token' })).toBe('guest')
    expect(selectCloudWritePlane({ user: { id: 'visitor' }, authLoading: false, capabilityToken: 'token' })).toBe('guest')
  })

  it('routes an authenticated repository character only through the repo plane', () => {
    expect(selectCloudWritePlane({ user: { id: 'owner' }, authLoading: false })).toBe('repo')
  })

  it('selects neither plane while the ordinary auth session is resolving', () => {
    expect(selectCloudWritePlane({ user: { id: 'owner' }, authLoading: true })).toBeNull()
  })
})

describe('useCloudSync', () => {
  it.each([
    ['signed out', null],
    ['signed in', { id: 'visitor' }],
  ])('pushes a mapped capability-link character when the visitor is %s', async (_label, user) => {
    const root = await renderSession({ user, authLoading: false, capabilityToken: 'token' })

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    expect(h.syncCharacter).toHaveBeenCalledOnce()
    expect(h.syncCharacter).toHaveBeenCalledWith(character)
    act(() => root.unmount())
  })

  it('does not guest-push an authenticated repository character', async () => {
    const root = await renderSession({ user: { id: 'owner' }, authLoading: false })

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })

    expect(h.syncCharacter).not.toHaveBeenCalled()
    expect(h.trackPush).not.toHaveBeenCalled()
    act(() => root.unmount())
  })

  it('wires guest writes through the shared coordinator and flushes once on unmount', async () => {
    const pendingWrites = createPendingCharacterWrites()
    const root = await renderSession(
      { user: null, authLoading: false, capabilityToken: 'token' },
      pendingWrites,
    )

    await act(async () => { root.unmount(); await Promise.resolve() })
    expect(h.syncCharacter).toHaveBeenCalledOnce()
    expect(h.syncCharacter).toHaveBeenCalledWith(character)

    pendingWrites.flushAll()
    await Promise.resolve()
    expect(h.syncCharacter).toHaveBeenCalledOnce()
  })

  it('defers a guest structural nudge through debounce and the in-flight push', async () => {
    let finishPush
    h.syncCharacter.mockReturnValue(new Promise(resolve => { finishPush = resolve }))
    const pendingWrites = createPendingCharacterWrites()
    const remote = vi.fn()
    const root = await renderSession(
      { user: null, authLoading: false, capabilityToken: 'token' },
      pendingWrites,
    )

    expect(pendingWrites.requestRemote('localHero', remote)).toBe(false)
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(h.syncCharacter).toHaveBeenCalledOnce()
    expect(remote).not.toHaveBeenCalled()

    await act(async () => { finishPush({ channel: 'data' }); await Promise.resolve() })
    expect(remote).toHaveBeenCalledOnce()
    act(() => root.unmount())
  })

  it('serializes two guest snapshots scheduled through the hook', async () => {
    let finishFirst
    h.syncCharacter
      .mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce({ channel: 'data' })
    const pendingWrites = createPendingCharacterWrites()
    const session = { user: null, authLoading: false, capabilityToken: 'token' }
    const root = await renderSession(session, pendingWrites)

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    await act(async () => {
      root.render(<Probe session={session} value={{ ...character, name: 'Hero two' }} pendingWrites={pendingWrites} />)
      await Promise.resolve()
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(h.syncCharacter).toHaveBeenCalledTimes(1)

    await act(async () => { finishFirst({ channel: 'data' }); await Promise.resolve() })
    expect(h.syncCharacter).toHaveBeenCalledTimes(2)
    expect(h.syncCharacter).toHaveBeenLastCalledWith({ ...character, name: 'Hero two' })
    act(() => root.unmount())
  })
})
