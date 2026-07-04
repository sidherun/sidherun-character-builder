import { describe, it, expect } from 'vitest'
import { presentMatchCount, visibleChars, visibleRolls } from './gmSession.js'

const chars = [
  { _rosterId: 'a', name: 'Thorin' },
  { _rosterId: 'b', name: 'Galadriel' },
  { _rosterId: 'c', name: 'Aragorn' },
]

describe('presentMatchCount', () => {
  it('counts only present ids that still exist in the roster', () => {
    expect(presentMatchCount(chars, ['a', 'c'])).toBe(2)
  })
  it('ignores stale ids that no longer match a character', () => {
    expect(presentMatchCount(chars, ['a', 'gone'])).toBe(1)
    expect(presentMatchCount(chars, [])).toBe(0)
  })
})

describe('visibleChars', () => {
  it('returns all characters when not filtering', () => {
    expect(visibleChars(chars, ['a'], false)).toHaveLength(3)
  })
  it('returns only present characters when filtering', () => {
    const v = visibleChars(chars, ['a', 'c'], true)
    expect(v.map(c => c._rosterId)).toEqual(['a', 'c'])
  })
  it('drops stale ids while filtering (no phantom rows)', () => {
    expect(visibleChars(chars, ['a', 'gone'], true).map(c => c._rosterId)).toEqual(['a'])
  })
})

describe('visibleRolls', () => {
  const feed = [
    { actor: 'Thorin', roll: 88 },
    { actor: 'Aragorn', roll: 12 },
    { actor: 'Someone', roll: 50 },
  ]
  it('leaves the feed untouched when not filtering', () => {
    expect(visibleRolls(feed, ['Thorin'], false)).toHaveLength(3)
  })
  it('keeps only rolls whose actor is a present character name', () => {
    const v = visibleRolls(feed, ['Thorin', 'Galadriel'], true)
    expect(v.map(r => r.actor)).toEqual(['Thorin'])
  })
  it('hides rolls from unknown actors while filtering', () => {
    expect(visibleRolls(feed, ['Aragorn'], true).map(r => r.actor)).toEqual(['Aragorn'])
  })
})
