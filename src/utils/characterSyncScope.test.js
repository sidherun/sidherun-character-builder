import { expect, it, vi } from 'vitest'
import { createCharacterSyncScopeRegistry } from './characterSyncScope.js'

it('disposes callbacks and revisions when the sync identity changes', async () => {
  vi.useFakeTimers()
  const registry = createCharacterSyncScopeRegistry()
  const userA = registry.forIdentity('repository:user-a')
  const run = vi.fn()
  userA.revisions.set('hero', 7)
  userA.writes.schedule('repo-data', {
    characterId: 'hero',
    delay: 100,
    run,
  })

  const userB = registry.forIdentity('repository:user-b')
  expect(userB).not.toBe(userA)
  expect(userA.disposed).toBe(true)
  expect(userA.revisions.size).toBe(0)

  await vi.advanceTimersByTimeAsync(100)
  expect(run).not.toHaveBeenCalled()
  expect(userA.writes.retryAllFailed()).toBe(false)
  vi.useRealTimers()
})

it('prevents queued write and refetch microtasks from starting after disposal', async () => {
  vi.useFakeTimers()
  const registry = createCharacterSyncScopeRegistry()
  const userA = registry.forIdentity('repository:user-a')
  const write = vi.fn()
  const refetch = vi.fn()

  userA.writes.schedule('repo-data', {
    characterId: 'hero',
    delay: 100,
    run: write,
  })
  userA.writes.flushCharacter('hero') // queued, but its Promise callback has not run
  userA.writes.requestRemote('other-hero', refetch)

  registry.forIdentity('repository:user-b')
  await Promise.resolve()
  await Promise.resolve()

  expect(write).not.toHaveBeenCalled()
  expect(refetch).not.toHaveBeenCalled()
  vi.useRealTimers()
})
