import { describe, it, expect } from 'vitest'
import { percentileForced, percentileRead, primaryRoll, rollToDiceSpec } from './diceNotation.js'

describe('percentileForced (1–100 → forced tens+units dice)', () => {
  it('splits a mid-range roll: 47 → tens 40, ones 7', () => {
    expect(percentileForced(47)).toEqual({ d100val: 40, d10val: 7, notation: '1d100+1d10@40,7' })
  })
  it('reads 100 as both zero faces (00 + 0)', () => {
    expect(percentileForced(100)).toEqual({ d100val: 100, d10val: 10, notation: '1d100+1d10@100,10' })
  })
  it('handles a single-digit roll: 1 → 00 + 1', () => {
    expect(percentileForced(1)).toEqual({ d100val: 100, d10val: 1, notation: '1d100+1d10@100,1' })
  })
  it('handles a round ten: 10 → tens 10, ones 0', () => {
    expect(percentileForced(10)).toEqual({ d100val: 10, d10val: 10, notation: '1d100+1d10@10,10' })
  })
})

describe('percentileRead (dice values → 1–100) round-trips', () => {
  it('inverts percentileForced across the whole range', () => {
    for (let n = 1; n <= 100; n++) {
      const { d100val, d10val } = percentileForced(n)
      expect(percentileRead(d100val, d10val)).toBe(n)
    }
  })
})

describe('primaryRoll / rollToDiceSpec', () => {
  it('animates a spell by its single roll', () => {
    expect(primaryRoll({ kind: 'spell', roll: 51, target: 75 })).toBe(51)
    expect(rollToDiceSpec({ kind: 'spell', roll: 51 })).toMatchObject({ notation: '1d100+1d10@50,1' })
  })
  it('animates skills/attacks by the first (lead) d100', () => {
    expect(primaryRoll({ kind: 'total', rolls: [62, 40], total: 130 })).toBe(62)
    expect(rollToDiceSpec({ kind: 'total', rolls: [62] })).toMatchObject({ d100val: 60, d10val: 2 })
  })
  it('animates a fumble by its low die', () => {
    expect(primaryRoll({ kind: 'total', rolls: [3], isFumble: true, fumble: 43 })).toBe(3)
  })
  it('returns null when there is nothing valid to animate (out-of-range spell)', () => {
    expect(rollToDiceSpec({ kind: 'spell', roll: null, outOfRange: true })).toBeNull()
    expect(rollToDiceSpec(null)).toBeNull()
  })
})
