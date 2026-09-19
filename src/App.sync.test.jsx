import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  getCharacter: vi.fn(),
  saveCharacterData: vi.fn(),
  subscribeLive: vi.fn(),
  saveRoster: vi.fn(),
  saveCurrent: vi.fn(),
  dataNudge: null,
  user: { id: 'owner' },
  initialCharacter: {
    name: 'Hero',
    _rosterId: 'hero-a',
    _ownerUserId: 'owner',
    _dataRev: 4,
    _updatedAt: '2026-09-19T10:00:00Z',
    hitPoints: { current: 10 },
    mana: { current: 5 },
    storyPoints: { current: 2 },
    armor: { remaining: 3 },
    skills: [],
    wizardStep: 9,
  },
}))

const initialCharacter = h.initialCharacter

vi.mock('./utils/rosterStorage.js', () => ({
  loadCurrent: () => h.cached,
  saveCharacterToRoster: c => {
    h.cached = { ...c }
    h.saveRoster(c)
    return c
  },
  saveCurrent: h.saveCurrent,
  loadCharacterFromRoster: () => null,
  loadRoster: () => [h.cached],
  getLastSaveStatus: () => 'saved',
}))
vi.mock('./utils/urlState.js', () => ({
  decodeCharacterFromURL: () => null,
  getPlayLinkId: () => null,
  parseCloudLink: () => null,
}))
vi.mock('./utils/cloudSync.js', () => ({
  registerCloudLink: vi.fn(),
  fetchCloudCharacter: vi.fn(),
  rosterIdForCloudId: () => null,
  hydrateCharacter: vi.fn(),
  mergeRemote: (character, payload) => payload?.live
    ? { ...character, hitPoints: { ...character.hitPoints, current: payload.live.hpCurrent } }
    : character,
  projectLive: c => ({ hpCurrent: c.hitPoints?.current ?? 0 }),
  dataSignature: c => JSON.stringify({ name: c.name }),
}))
vi.mock('./utils/characterRepo.js', () => ({
  repoEnabled: () => true,
  upsertCharacter: vi.fn(),
  getCharacter: h.getCharacter,
  saveCharacterData: h.saveCharacterData,
  patchLive: vi.fn().mockResolvedValue(true),
  subscribeLive: h.subscribeLive,
  removeLiveSubscription: vi.fn(),
}))
vi.mock('./auth/useAuth.js', () => ({
  useAuth: () => ({ user: h.user, role: 'player', loading: false }),
  isGmOrAdmin: () => false,
}))
vi.mock('./hooks/useAutoSave.js', () => ({ useAutoSave: () => null }))
vi.mock('./hooks/useCloudSync.js', () => ({ useCloudSync: () => 'repo' }))
vi.mock('./hooks/useRealtimeCharacter.js', () => ({ useRealtimeCharacter: vi.fn() }))
vi.mock('./hooks/usePlayMode.js', () => ({
  usePlayMode: () => ({ isPlayMode: true, enterPlayMode: vi.fn(), exitPlayMode: vi.fn() }),
}))
vi.mock('./components/steps/PlayMode.jsx', () => ({
  default: ({ character, onUpdate }) => (
    <div>
      <span data-testid="name">{character.name}</span>
      <button onClick={() => onUpdate({ name: 'Edit one' })}>Edit one</button>
      <button onClick={() => onUpdate({ name: 'Edit two' })}>Edit two</button>
      <button onClick={() => onUpdate({ name: 'Hero B', _rosterId: 'hero-b', _dataRev: 2 })}>Switch B</button>
      <button onClick={() => onUpdate({ name: 'Edit one', _rosterId: 'hero-a', _dataRev: 4 })}>Reopen A</button>
    </div>
  ),
}))
vi.mock('./utils/cloudStatus.js', () => ({ trackPush: promise => promise }))

import App from './App.jsx'
import { appCharacterSyncScopes } from './utils/characterSyncScope.js'

async function renderApp() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<App playMode onNavigate={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />)
  })
  return { container, root }
}

function click(container, label) {
  const button = [...container.querySelectorAll('button')].find(node => node.textContent === label)
  button.click()
}

beforeEach(() => {
  vi.useFakeTimers()
  appCharacterSyncScopes.reset()
  h.user = { id: 'owner' }
  h.cached = { ...h.initialCharacter }
  h.saveRoster.mockReset()
  h.saveCurrent.mockReset()
  h.getCharacter.mockReset().mockResolvedValue(null)
  h.saveCharacterData.mockReset()
  h.subscribeLive.mockReset().mockImplementation((_id, _live, data) => { h.dataNudge = data })
  h.dataNudge = null
})

describe('App authenticated sync coordination', () => {
  it('defers an authenticated structural nudge behind the local debounce/write', async () => {
    let finishSave
    h.saveCharacterData.mockReturnValue(new Promise(resolve => { finishSave = resolve }))
    h.getCharacter.mockResolvedValue({ ...initialCharacter, name: 'Remote', _dataRev: 6 })
    const { container, root } = await renderApp()

    await act(async () => { click(container, 'Edit one'); await Promise.resolve() })
    expect(container.querySelector('[data-testid="name"]').textContent).toBe('Edit one')
    await act(async () => { h.dataNudge(); await Promise.resolve() })
    expect(h.getCharacter).not.toHaveBeenCalled()

    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    expect(h.saveCharacterData).toHaveBeenCalledWith('hero-a', expect.objectContaining({ name: 'Edit one' }), 4)
    expect(h.getCharacter).not.toHaveBeenCalled()

    await act(async () => { finishSave({ ...initialCharacter, name: 'Edit one', _dataRev: 5 }); await Promise.resolve() })
    expect(h.getCharacter).toHaveBeenCalledWith('hero-a')
    act(() => root.unmount())
  })

  it('keeps a newer edit through conflict adoption and runs it with the refreshed revision', async () => {
    let finishFirst
    h.saveCharacterData
      .mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce({ ...initialCharacter, name: 'Edit two', _dataRev: 6 })
    h.getCharacter.mockResolvedValue({ ...initialCharacter, name: 'Remote', _dataRev: 5 })
    const { container, root } = await renderApp()

    await act(async () => { click(container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    await act(async () => { click(container, 'Edit two'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)

    await act(async () => { finishFirst({ conflict: true }); await Promise.resolve() })
    await act(async () => { await Promise.resolve() })

    expect(container.querySelector('[data-testid="name"]').textContent).toBe('Edit two')
    expect(h.saveCharacterData).toHaveBeenCalledTimes(2)
    expect(h.saveCharacterData).toHaveBeenLastCalledWith(
      'hero-a',
      expect.objectContaining({ name: 'Edit two' }),
      5,
    )
    act(() => root.unmount())
  })

  it('retries the failed newest snapshot once when focus returns', async () => {
    h.saveCharacterData
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...initialCharacter, name: 'Edit one', _dataRev: 5 })
    const { container, root } = await renderApp()

    await act(async () => { click(container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); await Promise.resolve() })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)
    const attemptedRevision = h.saveCharacterData.mock.calls[0][2]

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(2)
    expect(h.saveCharacterData).toHaveBeenLastCalledWith(
      'hero-a',
      expect.objectContaining({ name: 'Edit one' }),
      attemptedRevision,
    )
    act(() => root.unmount())
  })

  it('keeps a switched-away conflict retryable and resumes it when A reopens', async () => {
    let finishFirst
    h.saveCharacterData
      .mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce({ ...initialCharacter, name: 'Edit one', _dataRev: 6 })
    h.getCharacter.mockResolvedValue({ ...initialCharacter, name: 'Remote', _dataRev: 5 })
    const { container, root } = await renderApp()

    await act(async () => { click(container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    await act(async () => { click(container, 'Switch B'); await Promise.resolve() })
    await act(async () => { finishFirst({ conflict: true }); await Promise.resolve() })
    await act(async () => { await Promise.resolve() })
    expect(container.querySelector('[data-testid="name"]').textContent).toBe('Hero B')
    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)

    await act(async () => { click(container, 'Reopen A'); await Promise.resolve() })
    await act(async () => { await Promise.resolve() })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(2)
    expect(h.saveCharacterData).toHaveBeenLastCalledWith(
      'hero-a',
      expect.objectContaining({ name: 'Edit one' }),
      5,
    )
    act(() => root.unmount())
  })

  it('retains an unresolved conflict across App unmount and retries when A remounts', async () => {
    let finishFirst
    h.saveCharacterData
      .mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce({ ...initialCharacter, name: 'Edit one', _dataRev: 6 })
    h.getCharacter.mockResolvedValue({ ...initialCharacter, name: 'Remote', _dataRev: 5 })
    let rendered = await renderApp()

    await act(async () => { click(rendered.container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    h.cached = { ...initialCharacter, name: 'Edit one' } // useAutoSave's flushed local copy
    act(() => rendered.root.unmount())

    await act(async () => { finishFirst({ conflict: true }); await Promise.resolve() })
    await act(async () => { await Promise.resolve() })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)

    rendered = await renderApp()
    await act(async () => { await Promise.resolve() })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(2)
    expect(h.saveCharacterData).toHaveBeenLastCalledWith(
      'hero-a',
      expect.objectContaining({ name: 'Edit one' }),
      5,
    )
    act(() => rendered.root.unmount())
  })

  it('persists the returned revision so a reload saves against the fresh revision', async () => {
    h.saveCharacterData
      .mockResolvedValueOnce({ ...initialCharacter, name: 'Edit one', _dataRev: 5, _updatedAt: 'newer' })
      .mockResolvedValueOnce({ ...initialCharacter, name: 'Edit two', _dataRev: 6 })
    let rendered = await renderApp()

    await act(async () => { click(rendered.container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); await Promise.resolve() })
    expect(h.cached._dataRev).toBe(5)
    expect(h.saveCurrent).toHaveBeenCalledWith(expect.objectContaining({ _dataRev: 5 }))
    act(() => rendered.root.unmount())

    rendered = await renderApp()
    await act(async () => { click(rendered.container, 'Edit two'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); await Promise.resolve() })
    expect(h.saveCharacterData).toHaveBeenLastCalledWith(
      'hero-a',
      expect.objectContaining({ name: 'Edit two' }),
      5,
    )
    act(() => rendered.root.unmount())
  })

  it('disposes user A failures so they cannot retry under user B', async () => {
    h.saveCharacterData.mockRejectedValue(new Error('offline'))
    const { container, root } = await renderApp()

    await act(async () => { click(container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); await Promise.resolve() })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)

    h.user = { id: 'user-b' }
    await act(async () => {
      root.render(<App playMode onNavigate={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />)
      await Promise.resolve()
    })
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })

    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
  })

  it('ignores an already-started user A completion after switching to user B', async () => {
    let finishUserA
    h.saveCharacterData.mockReturnValue(new Promise(resolve => { finishUserA = resolve }))
    const { container, root } = await renderApp()

    await act(async () => { click(container, 'Edit one'); await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    expect(h.saveCharacterData).toHaveBeenCalledTimes(1)

    h.user = { id: 'user-b' }
    await act(async () => {
      root.render(<App playMode onNavigate={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />)
      await Promise.resolve()
    })
    await act(async () => {
      finishUserA({ ...initialCharacter, name: 'Edit one', _dataRev: 99 })
      await Promise.resolve()
    })

    expect(h.cached._dataRev).toBe(4)
    expect(h.saveRoster).not.toHaveBeenCalled()
    expect(h.saveCurrent).not.toHaveBeenCalled()
    act(() => root.unmount())
  })
})
