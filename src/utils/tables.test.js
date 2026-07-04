import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listTables, createTable, renameTable, deleteTable, importTables,
  inTable, toggleMembership, tableNamesFor, withoutTable,
  visibleForTable, tableMemberCount, visibleRollsForTable,
  deriveRegistry, mergeRegistry,
} from './tables.js'

// Minimal in-memory localStorage so the registry helpers are testable.
function stubStorage() {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  })
}

describe('table registry (localStorage)', () => {
  beforeEach(stubStorage)

  it('creates, lists, renames, and deletes tables', () => {
    const a = createTable('Thursday Table')
    createTable('Campaign B')
    expect(listTables().map(t => t.name)).toEqual(['Thursday Table', 'Campaign B'])

    renameTable(a.id, 'Thursday Night')
    expect(listTables().find(t => t.id === a.id).name).toBe('Thursday Night')

    deleteTable(a.id)
    expect(listTables().map(t => t.name)).toEqual(['Campaign B'])
  })

  it('falls back to a placeholder name for blank input', () => {
    const t = createTable('   ')
    expect(t.name).toBe('Untitled table')
  })

  it('imports a registry, merging by id with imported name winning', () => {
    const a = createTable('Local A')
    importTables([{ id: a.id, name: 'Renamed A' }, { id: 't_new', name: 'New One' }])
    const names = listTables()
    expect(names.find(t => t.id === a.id).name).toBe('Renamed A')
    expect(names.find(t => t.id === 't_new').name).toBe('New One')
  })
})

describe('membership helpers (pure)', () => {
  const char = { tableIds: ['t1', 't2'] }

  it('inTable / toggleMembership', () => {
    expect(inTable(char, 't1')).toBe(true)
    expect(inTable(char, 'tX')).toBe(false)
    expect(toggleMembership(char, 't3')).toEqual(['t1', 't2', 't3'])
    expect(toggleMembership(char, 't1')).toEqual(['t2'])
  })

  it('toggleMembership tolerates a missing tableIds array', () => {
    expect(toggleMembership({}, 't1')).toEqual(['t1'])
  })

  it('tableNamesFor returns member names in registry order', () => {
    const tables = [{ id: 't2', name: 'Two' }, { id: 't1', name: 'One' }, { id: 't9', name: 'Nine' }]
    expect(tableNamesFor(char, tables)).toEqual(['Two', 'One'])
  })

  it('withoutTable strips an id, returning the same ref when unchanged', () => {
    expect(withoutTable(char, 't1')).toEqual(['t2'])
    const ids = char.tableIds
    expect(withoutTable({ tableIds: ids }, 'tX')).toBe(ids) // no-op keeps ref (skip needless save)
  })
})

describe('cross-device registry (#176)', () => {
  it('derives id→name from characters\' denormalized _tableNames', () => {
    const chars = [
      { _rosterId: 'a', tableIds: ['t1', 't2'], _tableNames: { t1: 'Thursday', t2: 'Campaign B' } },
      { _rosterId: 'b', tableIds: ['t1'], _tableNames: { t1: 'Thursday' } },
    ]
    expect(deriveRegistry(chars)).toEqual([
      { id: 't1', name: 'Thursday' },
      { id: 't2', name: 'Campaign B' },
    ])
  })
  it('also reads lightweight roster entries (tableNames)', () => {
    const entries = [{ tableIds: ['t9'], tableNames: { t9: 'Night Owls' } }]
    expect(deriveRegistry(entries)).toEqual([{ id: 't9', name: 'Night Owls' }])
  })
  it('falls back to the bare id when no name is carried yet', () => {
    expect(deriveRegistry([{ tableIds: ['t1'], _tableNames: {} }])).toEqual([{ id: 't1', name: 't1' }])
  })
  it('mergeRegistry lets the local (localStorage) name win over derived', () => {
    const derived = [{ id: 't1', name: 'old' }, { id: 't2', name: 'Campaign B' }]
    const local = [{ id: 't1', name: 'Thursday (renamed)' }]
    const merged = mergeRegistry(local, derived)
    expect(merged.find(t => t.id === 't1').name).toBe('Thursday (renamed)')
    expect(merged.find(t => t.id === 't2').name).toBe('Campaign B') // derived-only kept
  })
})

describe('GM-screen filtering', () => {
  const chars = [
    { _rosterId: 'a', name: 'Thorin', tableIds: ['t1'] },
    { _rosterId: 'b', name: 'Galadriel', tableIds: ['t2'] },
    { _rosterId: 'c', name: 'Aragorn', tableIds: ['t1', 't2'] },
  ]

  it('visibleForTable filters to members; falsy id shows all', () => {
    expect(visibleForTable(chars, '').map(c => c._rosterId)).toEqual(['a', 'b', 'c'])
    expect(visibleForTable(chars, 't1').map(c => c._rosterId)).toEqual(['a', 'c'])
  })

  it('tableMemberCount counts current members', () => {
    expect(tableMemberCount(chars, 't1')).toBe(2)
    expect(tableMemberCount(chars, 't2')).toBe(2)
    expect(tableMemberCount(chars, 'gone')).toBe(0)
  })

  it('visibleRollsForTable scopes the feed to a table by member name', () => {
    const feed = [{ actor: 'Thorin' }, { actor: 'Galadriel' }, { actor: 'Someone' }]
    expect(visibleRollsForTable(feed, chars, '').length).toBe(3)
    expect(visibleRollsForTable(feed, chars, 't1').map(r => r.actor)).toEqual(['Thorin'])
  })
})
