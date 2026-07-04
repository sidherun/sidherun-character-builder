import { describe, it, expect } from 'vitest'
import { buildRosterBackup, extractCharacters, validateCharacters, extractCloudState } from './rosterBackup.js'
import { createDefaultCharacter } from './defaultCharacter.js'

describe('buildRosterBackup', () => {
  it('wraps characters with a typed, versioned envelope', () => {
    const chars = [createDefaultCharacter()]
    const b = buildRosterBackup(chars, '2026-06-15T00:00:00.000Z')
    expect(b._type).toBe('sidherun-roster-backup')
    expect(b.version).toBe(1)
    expect(b.exportedAt).toBe('2026-06-15T00:00:00.000Z')
    expect(b.characters).toBe(chars)
  })
})

describe('cloud state in backup', () => {
  it('includes GM key + cloud map when provided, and round-trips', () => {
    const cloud = { gmKey: 'gm_abc', cloudMap: { r1: { id: 'i1', token: 't1' } } }
    const b = buildRosterBackup([], 'now', cloud)
    expect(b._gmKey).toBe('gm_abc')
    expect(b._cloudMap).toEqual(cloud.cloudMap)
    expect(extractCloudState(b)).toEqual({ gmKey: 'gm_abc', cloudMap: cloud.cloudMap })
  })
  it('omits cloud fields when empty', () => {
    const b = buildRosterBackup([], 'now')
    expect(b._gmKey).toBeUndefined()
    expect(b._cloudMap).toBeUndefined()
    expect(extractCloudState(b)).toEqual({ gmKey: undefined, cloudMap: undefined })
  })
  it('carries the named-table registry and round-trips it (#175)', () => {
    const tables = [{ id: 't1', name: 'Thursday Table' }]
    const b = buildRosterBackup([], 'now', { tables })
    expect(b._tables).toEqual(tables)
    expect(extractCloudState(b).tables).toEqual(tables)
  })
  it('omits the table registry when empty', () => {
    const b = buildRosterBackup([], 'now', { tables: [] })
    expect(b._tables).toBeUndefined()
  })
})

describe('extractCharacters', () => {
  it('reads the backup wrapper', () => {
    expect(extractCharacters({ characters: [{ a: 1 }, { a: 2 }] })).toHaveLength(2)
  })
  it('reads a bare array', () => {
    expect(extractCharacters([{ a: 1 }])).toHaveLength(1)
  })
  it('treats a single object as one character', () => {
    expect(extractCharacters({ name: 'Solo' })).toEqual([{ name: 'Solo' }])
  })
  it('returns [] for junk', () => {
    expect(extractCharacters(null)).toEqual([])
    expect(extractCharacters('nope')).toEqual([])
  })
})

describe('validateCharacters', () => {
  it('keeps valid characters and counts invalid ones', () => {
    const good = createDefaultCharacter()
    const { valid, invalid } = validateCharacters([good, { not: 'a character' }, 42])
    expect(valid).toHaveLength(1)
    expect(valid[0].name).toBe('')
    expect(invalid).toBe(2)
  })
})
