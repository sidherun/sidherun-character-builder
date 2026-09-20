/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const repo = vi.hoisted(() => ({
  character: null,
  characters: [],
  saveCharacterData: vi.fn(),
  getCharacter: vi.fn(),
}))

vi.mock('../utils/characterRepo.js', () => ({
  repoEnabled: () => true,
  listCharacters: vi.fn(async () => repo.characters),
  listPlayers: vi.fn(async () => []),
  assignPlayer: vi.fn(),
  deleteCharacter: vi.fn(),
  getCharacter: repo.getCharacter,
  saveCharacterData: repo.saveCharacterData,
}))

import RosterPage from './RosterPage.jsx'
import { AuthContext } from '../auth/AuthProvider.jsx'
import { createDefaultCharacter } from '../utils/defaultCharacter.js'

function memoryStorage() {
  const values = new Map([
    ['sidherun_tables', JSON.stringify([
      { id: 'alpha', name: 'Alpha' },
      { id: 'beta', name: 'Beta' },
    ])],
  ])
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

const auth = {
  user: { id: 'gm-1' },
  role: 'gm',
  signOut: vi.fn(),
}

describe('RosterPage authenticated table membership', () => {
  let container
  let root

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    repo.character = {
      ...createDefaultCharacter(),
      _rosterId: 'character-1',
      _ownerUserId: 'gm-1',
      _dataRev: 4,
      _updatedAt: '2026-09-19T12:00:00.000Z',
      name: 'Dulu',
      tableIds: [],
      _tableNames: {},
    }
    repo.characters = [repo.character]
    repo.saveCharacterData.mockReset()
    repo.getCharacter.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    container?.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  async function renderAndOpenTables() {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={auth}>
          <RosterPage onNavigate={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />
        </AuthContext.Provider>
      )
      await Promise.resolve()
    })
    const menu = container.querySelector('button[aria-label="More options for Dulu"]')
    act(() => menu.click())
    return [...container.querySelectorAll('input[type="checkbox"]')]
  }

  it('serializes rapid changes and advances the revision for the second save', async () => {
    const first = deferred()
    repo.saveCharacterData
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(async (_id, character, revision) => ({
        ...character,
        _dataRev: revision + 1,
        _updatedAt: '2026-09-19T12:02:00.000Z',
      }))

    let checkboxes = await renderAndOpenTables()
    await act(async () => {
      checkboxes[0].click()
      await Promise.resolve()
    })
    checkboxes = [...container.querySelectorAll('input[type="checkbox"]')]
    await act(async () => {
      checkboxes[1].click()
      await Promise.resolve()
    })

    expect(repo.saveCharacterData).toHaveBeenCalledTimes(1)
    expect(repo.saveCharacterData.mock.calls[0][2]).toBe(4)
    expect(repo.saveCharacterData.mock.calls[0][1].tableIds).toEqual(['alpha'])

    await act(async () => {
      first.resolve({
        ...repo.saveCharacterData.mock.calls[0][1],
        _dataRev: 5,
        _updatedAt: '2026-09-19T12:01:00.000Z',
        serverMarker: 'returned by first save',
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(repo.saveCharacterData).toHaveBeenCalledTimes(2)
    expect(repo.saveCharacterData.mock.calls[1][2]).toBe(5)
    expect(repo.saveCharacterData.mock.calls[1][1].tableIds).toEqual(['alpha', 'beta'])
    expect(repo.saveCharacterData.mock.calls[1][1].serverMarker).toBe('returned by first save')
    expect(container.textContent).toContain('Alpha')
    expect(container.textContent).toContain('Beta')
  })

  it('refetches and safely retries a conflict while surfacing it to the GM', async () => {
    const remote = {
      ...repo.character,
      _dataRev: 8,
      notes: [{ title: 'Remote note', text: 'Keep this change' }],
    }
    repo.getCharacter.mockResolvedValue(remote)
    repo.saveCharacterData
      .mockResolvedValueOnce({ conflict: true })
      .mockImplementationOnce(async (_id, character, revision) => ({
        ...character,
        _dataRev: revision + 1,
        _updatedAt: '2026-09-19T12:03:00.000Z',
      }))

    const checkboxes = await renderAndOpenTables()
    await act(async () => {
      checkboxes[0].click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(repo.getCharacter).toHaveBeenCalledWith('character-1')
    expect(repo.saveCharacterData).toHaveBeenCalledTimes(2)
    expect(repo.saveCharacterData.mock.calls[1][2]).toBe(8)
    expect(repo.saveCharacterData.mock.calls[1][1]).toMatchObject({
      tableIds: ['alpha'],
      notes: remote.notes,
    })
    expect(container.textContent).toContain('Table change reconciled with a newer cloud update.')
  })

  it('filters roster cards by table and remembers the choice for the GM screen', async () => {
    repo.character = {
      ...repo.character,
      tableIds: ['alpha'],
      _tableNames: { alpha: 'Alpha' },
    }
    repo.characters = [
      repo.character,
      {
        ...repo.character,
        _rosterId: 'character-2',
        name: 'Vela',
        tableIds: ['beta'],
        _tableNames: { beta: 'Beta' },
      },
    ]

    await act(async () => {
      root.render(
        <AuthContext.Provider value={auth}>
          <RosterPage onNavigate={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />
        </AuthContext.Provider>
      )
      await Promise.resolve()
    })

    const filter = container.querySelector('#roster-table-filter')
    expect(filter).not.toBeNull()
    expect(container.querySelector('label[for="roster-table-filter"]').textContent).toBe('Table Filter')
    expect([...filter.options].map(option => option.textContent)).toEqual([
      'All characters (2)',
      'Alpha (1)',
      'Beta (1)',
    ])

    act(() => {
      filter.value = 'alpha'
      filter.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.textContent).toContain('Dulu')
    expect(container.textContent).not.toContain('Vela')
    expect(localStorage.getItem('sidherun_gm_table')).toBe('alpha')
  })
})
