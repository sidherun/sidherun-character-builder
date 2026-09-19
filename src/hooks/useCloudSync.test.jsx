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

const character = { name: 'Hero', _rosterId: 'localHero' }

function Probe({ session }) {
  useCloudSync(character, session)
  return null
}

async function renderSession(session) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => { root.render(<Probe session={session} />) })
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
})
