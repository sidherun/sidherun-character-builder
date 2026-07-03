import { describe, it, expect } from 'vitest'
import { formatRoll } from './rollFormat.js'

describe('formatRoll — skills & attacks (display total, no pass/fail)', () => {
  it('shows the total as the headline and the roll math as detail', () => {
    const out = formatRoll({ kind: 'total', label: 'Herbalism', roll: 62, modifier: 19, total: 81 })
    expect(out.headline).toBe('81')
    expect(out.detail).toBe('d100 62 + 19 · GM adjudicates')
    expect(out.color).toBe('var(--bronze)') // neutral — the GM decides hit/miss
  })
})

describe('formatRoll — spells (app resolves pass/fail)', () => {
  it('renders a success in green with the margin', () => {
    const out = formatRoll({ kind: 'spell', label: 'Spell vs Lvl 4', roll: 51, target: 75, success: true, margin: 24 })
    expect(out.headline).toBe('Success')
    expect(out.color).toBe('var(--story)')
    expect(out.detail).toBe('d100 51 ≤ 75 · +24')
  })

  it('renders a miss in red with the > comparison and no positive margin', () => {
    const out = formatRoll({ kind: 'spell', label: 'Spell vs Lvl 4', roll: 81, target: 75, success: false, margin: -6 })
    expect(out.headline).toBe('Miss')
    expect(out.color).toBe('var(--danger)')
    expect(out.detail).toBe('d100 81 > 75')
  })

  it('flags an out-of-range target level instead of showing a bogus result', () => {
    const out = formatRoll({ kind: 'spell', label: 'Spell vs Lvl 21', roll: 40, target: null, success: false, outOfRange: true })
    expect(out.headline).toBe('—')
    expect(out.detail).toBe('Target level out of range')
  })
})
