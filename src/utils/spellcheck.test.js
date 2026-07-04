import { describe, it, expect } from 'vitest'
import { levenshtein, suggest, SKILL_DICTIONARY, ITEM_DICTIONARY } from './spellcheck.js'

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('seamonship', 'seamanship')).toBe(1)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })
})

describe('suggest — skills', () => {
  it('catches the real "Seamonship" typo', () => {
    expect(suggest('Seamonship', SKILL_DICTIONARY)).toBe('Seamanship')
  })
  it('suggests for a one-edit slip', () => {
    expect(suggest('Stelth', SKILL_DICTIONARY)).toBe('Stealth')
    expect(suggest('Percepton', SKILL_DICTIONARY)).toBe('Perception')
  })
  it('returns null for a correct term (case-insensitive)', () => {
    expect(suggest('Stealth', SKILL_DICTIONARY)).toBeNull()
    expect(suggest('stealth', SKILL_DICTIONARY)).toBeNull()
  })
  it('does not flag homebrew / in-world names', () => {
    expect(suggest('Bartuka Rolls', SKILL_DICTIONARY)).toBeNull()
    expect(suggest('Krumchach Card Game', SKILL_DICTIONARY)).toBeNull()
  })
  it('ignores very short entries', () => {
    expect(suggest('Bo', SKILL_DICTIONARY)).toBeNull()
  })
  it('respects kept custom terms', () => {
    // "Seamonship" would normally suggest, but if the player kept it, suppress.
    expect(suggest('Seamonship', SKILL_DICTIONARY, ['Seamonship'])).toBeNull()
  })
})

describe('suggest — items', () => {
  it('catches a misspelled item', () => {
    expect(suggest('Daggr', ITEM_DICTIONARY)).toBe('Dagger')
    expect(suggest('Quaterstaff', ITEM_DICTIONARY)).toBe('Quarterstaff')
  })
  it('leaves correct items alone', () => {
    expect(suggest('Longsword', ITEM_DICTIONARY)).toBeNull()
  })
})
