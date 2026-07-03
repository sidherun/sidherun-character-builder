import { describe, it, expect } from 'vitest'
import { rollD100, rollTotal, resolveUnder } from './dice.js'

// Deterministic rng: Math.floor(v * 100) + 1 is the resulting d100 roll.
const fixed = (v) => () => v

describe('rollD100', () => {
  it('maps rng across the full [1, 100] range', () => {
    expect(rollD100(fixed(0))).toBe(1)       // 0.00 → 1
    expect(rollD100(fixed(0.61))).toBe(62)   // 0.61 → 62
    expect(rollD100(fixed(0.999))).toBe(100) // 0.999 → 100
  })

  it('clamps to 100 and never exceeds it', () => {
    expect(rollD100(fixed(0.9999999))).toBe(100)
    expect(rollD100(fixed(1))).toBe(100)
  })
})

describe('rollTotal (skills + attacks — display total, no pass/fail)', () => {
  it('adds the single modifier to the roll', () => {
    expect(rollTotal({ modifier: 18, rng: fixed(0.61) })).toEqual({
      roll: 62, modifier: 18, total: 80,
    })
  })

  it('defaults modifier to 0', () => {
    expect(rollTotal({ rng: fixed(0.61) })).toEqual({ roll: 62, modifier: 0, total: 62 })
  })

  it('does not compute success — that is the GM\'s call', () => {
    expect(rollTotal({ modifier: 5, rng: fixed(0.1) })).not.toHaveProperty('success')
  })
})

describe('resolveUnder (spells — app resolves pass/fail)', () => {
  it('succeeds when roll < target', () => {
    expect(resolveUnder({ target: 62, rng: fixed(0.5) })).toEqual({
      roll: 51, target: 62, success: true, margin: 11,
    })
  })

  it('treats roll === target as a success (≤)', () => {
    expect(resolveUnder({ target: 62, rng: fixed(0.61) })).toMatchObject({
      roll: 62, success: true, margin: 0,
    })
  })

  it('fails when roll > target, with a negative margin', () => {
    expect(resolveUnder({ target: 62, rng: fixed(0.62) })).toMatchObject({
      roll: 63, success: false, margin: -1,
    })
  })

  it('flags an out-of-range (null) target instead of silently passing', () => {
    expect(resolveUnder({ target: null, rng: fixed(0) })).toMatchObject({
      target: null, success: false, outOfRange: true,
    })
  })
})
