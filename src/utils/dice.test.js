import { describe, it, expect } from 'vitest'
import { rollD100, rollTotal, resolveUnder } from './dice.js'

// Deterministic rng: Math.floor(v * 100) + 1 is the resulting d100 roll.
const fixed = (v) => () => v
// Sequence rng: successive calls return successive values (clamped to the last).
const seq = (vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)] }

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
  it('adds the single modifier to a normal roll (6-95)', () => {
    expect(rollTotal({ modifier: 18, rng: fixed(0.61) })).toMatchObject({
      rolls: [62], roll: 62, modifier: 18, total: 80, exploded: false,
    })
  })

  it('defaults modifier to 0', () => {
    expect(rollTotal({ rng: fixed(0.61) })).toMatchObject({ roll: 62, modifier: 0, total: 62 })
  })

  it('does not compute success — that is the GM\'s call', () => {
    expect(rollTotal({ modifier: 5, rng: fixed(0.5) })).not.toHaveProperty('success')
  })

  it('EXPLODES on a die over 95: rolls again and adds before the modifier', () => {
    // 97 (>95) → roll again → 40. Combined 137, then + 8 = 145. (GM example.)
    expect(rollTotal({ modifier: 8, rng: seq([0.96, 0.39]) })).toMatchObject({
      rolls: [97, 40], roll: 137, modifier: 8, total: 145, exploded: true,
    })
  })

  it('keeps exploding while each new die is over 95', () => {
    // 97, 98, 10 → 205 + 0.
    expect(rollTotal({ rng: seq([0.96, 0.97, 0.09]) })).toMatchObject({
      rolls: [97, 98, 10], roll: 205, total: 205, exploded: true,
    })
  })

  it('does not explode on exactly 95 (only over 95)', () => {
    expect(rollTotal({ rng: fixed(0.949) })).toMatchObject({ rolls: [95], exploded: false })
  })

  it('FUMBLES on a natural 1-5: flags it and rolls an unmodified fumble die', () => {
    // First die 3 (≤5) → fumble; fumble die 40 (unmodified, for the GM).
    expect(rollTotal({ modifier: 8, rng: seq([0.02, 0.39]) })).toMatchObject({
      rolls: [3], isFumble: true, fumble: 40,
    })
  })

  it('treats a roll of exactly 5 as a fumble, 6 as normal', () => {
    expect(rollTotal({ rng: fixed(0.04) })).toMatchObject({ isFumble: true }) // 5
    expect(rollTotal({ rng: fixed(0.05) })).not.toHaveProperty('isFumble')    // 6
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
