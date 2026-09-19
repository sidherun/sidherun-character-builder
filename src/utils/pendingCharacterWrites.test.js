import { describe, expect, it, vi } from 'vitest'
import { createPendingCharacterWrites } from './pendingCharacterWrites.js'

describe('pending character writes', () => {
  it('defers a structural remote nudge until the debounced local edit settles', async () => {
    vi.useFakeTimers()
    const events = []
    let finishWrite
    const write = new Promise(resolve => { finishWrite = resolve })
    const writes = createPendingCharacterWrites()

    writes.schedule('repo-data', {
      characterId: 'hero-a',
      expectedRevision: 7,
      delay: 1200,
      run: ({ characterId, expectedRevision }) => {
        events.push(`write:${characterId}:${expectedRevision}`)
        return write
      },
    })
    expect(writes.requestRemote('hero-a', () => events.push('remote'))).toBe(false)

    await vi.advanceTimersByTimeAsync(1200)
    expect(events).toEqual(['write:hero-a:7'])

    finishWrite()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect(events).toEqual(['write:hero-a:7', 'remote'])
    vi.useRealTimers()
  })

  it('flushes A on a character switch and cannot replay A when B backgrounds', async () => {
    vi.useFakeTimers()
    const events = []
    const writes = createPendingCharacterWrites()

    writes.schedule('repo-data', {
      characterId: 'hero-a',
      expectedRevision: 3,
      delay: 1200,
      run: ({ characterId, expectedRevision }) => events.push(`${characterId}:${expectedRevision}`),
    })
    writes.flushCharacter('hero-a')
    await Promise.resolve()

    writes.schedule('repo-data', {
      characterId: 'hero-b',
      expectedRevision: 11,
      delay: 1200,
      run: ({ characterId, expectedRevision }) => events.push(`${characterId}:${expectedRevision}`),
    })
    writes.flushAll() // pagehide while B is open
    writes.flushAll() // duplicate visibility/pagehide signals are harmless
    await Promise.resolve()

    expect(events).toEqual(['hero-a:3', 'hero-b:11'])
    await vi.runAllTimersAsync()
    expect(events).toEqual(['hero-a:3', 'hero-b:11'])
    vi.useRealTimers()
  })

  it('serializes a second edit behind an in-flight write and resolves its revision at execution', async () => {
    vi.useFakeTimers()
    const events = []
    let revision = 4
    let finishFirst
    const first = new Promise(resolve => { finishFirst = resolve })
    const writes = createPendingCharacterWrites()

    writes.schedule('repo-data', {
      characterId: 'hero-a',
      expectedRevision: () => revision,
      delay: 1,
      run: ({ expectedRevision }) => {
        events.push(`first:${expectedRevision}`)
        return first.then(() => { revision = 5 })
      },
    })
    await vi.advanceTimersByTimeAsync(1)

    writes.schedule('repo-data', {
      characterId: 'hero-a',
      expectedRevision: () => revision,
      delay: 1,
      run: ({ expectedRevision }) => events.push(`second:${expectedRevision}`),
    })
    await vi.advanceTimersByTimeAsync(1)
    expect(events).toEqual(['first:4'])

    finishFirst()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect(events).toEqual(['first:4', 'second:5'])
    vi.useRealTimers()
  })

  it('keeps a remote nudge parked when the local write fails', async () => {
    vi.useFakeTimers()
    const remote = vi.fn()
    const writes = createPendingCharacterWrites()
    let online = false
    writes.schedule('guest', {
      characterId: 'hero-a',
      delay: 1,
      run: () => online ? Promise.resolve() : Promise.reject(new Error('offline')),
    })
    writes.requestRemote('hero-a', remote)

    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect(remote).not.toHaveBeenCalled()
    expect(writes.isBusy('hero-a')).toBe(true)

    online = true
    expect(writes.retryCharacter('hero-a')).toBe(true)
    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect(remote).toHaveBeenCalledOnce()
    expect(writes.isBusy('hero-a')).toBe(false)
    vi.useRealTimers()
  })

  it('retains a failed remote refetch for one retry on the next recovery event', async () => {
    const writes = createPendingCharacterWrites()
    const remote = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)

    writes.requestRemote('hero-a', remote)
    await Promise.resolve()
    await Promise.resolve()
    expect(remote).toHaveBeenCalledOnce()

    await vi.waitFor(() => expect(writes.retryAllFailed()).toBe(true))
    await Promise.resolve()
    await Promise.resolve()
    expect(remote).toHaveBeenCalledTimes(2)
  })

  it('queues a requested retry behind another slot already in flight', async () => {
    vi.useFakeTimers()
    const events = []
    let firstAttempt = true
    let finishLive
    const liveWrite = new Promise(resolve => { finishLive = resolve })
    const writes = createPendingCharacterWrites()

    writes.schedule('repo-data', {
      characterId: 'hero-a',
      delay: 1,
      run: () => {
        events.push('data')
        if (firstAttempt) {
          firstAttempt = false
          return Promise.reject(new Error('offline'))
        }
        return Promise.resolve()
      },
    })
    await vi.advanceTimersByTimeAsync(1)
    await Promise.resolve()
    await Promise.resolve()

    writes.schedule('repo-live', {
      characterId: 'hero-a',
      delay: 1,
      run: () => { events.push('live'); return liveWrite },
    })
    await vi.advanceTimersByTimeAsync(1)
    expect(events).toEqual(['data', 'live'])

    expect(writes.retryCharacter('hero-a')).toBe(true)
    finishLive()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect(events).toEqual(['data', 'live', 'data'])
    vi.useRealTimers()
  })
})
