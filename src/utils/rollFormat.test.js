import { describe, it, expect } from 'vitest'
import { formatRoll } from './rollFormat.js'

describe('formatRoll — skills & attacks (display total, no pass/fail)', () => {
  it('shows the total as the headline and the roll math as detail', () => {
    const out = formatRoll({ kind: 'total', label: 'Herbalism', rolls: [62], roll: 62, modifier: 19, total: 81, exploded: false })
    expect(out.headline).toBe('81')
    expect(out.detail).toBe('d100 62 + 19 · GM adjudicates')
    expect(out.color).toBe('var(--bronze)') // neutral — the GM decides hit/miss
  })

  it('shows the summed dice for an exploded roll, with a player-facing tag (no "exploded" jargon)', () => {
    const out = formatRoll({ kind: 'total', label: 'Quarterstaff', rolls: [97, 40], roll: 137, modifier: 8, total: 145, exploded: true })
    expect(out.headline).toBe('145')
    expect(out.detail).toBe('d100 97+40 = 137 + 8 · GM adjudicates') // no engine jargon in the math
    expect(out.tag).toBe('Exploding roll!')
    expect(out.detail).not.toMatch(/exploded/)
  })

  it('shows a fumble with the unmodified fumble die for the GM', () => {
    const out = formatRoll({ kind: 'total', label: 'Stealth', rolls: [3], roll: 3, modifier: 17, total: 20, isFumble: true, fumble: 40 })
    expect(out.headline).toBe('Fumble')
    expect(out.color).toBe('var(--danger)')
    expect(out.detail).toBe('d100 3 · fumble die 40 → GM determines the result')
  })

  it('marks a total as passing when it matches or beats the captured GM target', () => {
    const out = formatRoll({ kind: 'total', rolls: [62], roll: 62, modifier: 13, total: 75, gmTarget: 75 })
    expect(out).toMatchObject({ headline: 'Pass', color: 'var(--story)' })
    expect(out.detail).toBe('d100 62 + 13 = 75 ≥ 75')
  })

  it('marks a total below the captured GM target as failing', () => {
    const out = formatRoll({ kind: 'total', rolls: [62], roll: 62, modifier: 12, total: 74, gmTarget: 75 })
    expect(out).toMatchObject({ headline: 'Fail', color: 'var(--danger)' })
    expect(out.detail).toBe('d100 62 + 12 = 74 < 75')
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

describe('formatRoll — interim mana cost on casts (#237)', () => {
  it('appends the deducted mana to the spell detail', () => {
    const out = formatRoll({ kind: 'spell', roll: 20, target: 55, success: true, margin: 35, manaCost: 3 })
    expect(out.detail).toContain('−3 mana')
  })

  it('omits the mana note when no cost was entered', () => {
    const out = formatRoll({ kind: 'spell', roll: 20, target: 55, success: true, margin: 35, manaCost: 0 })
    expect(out.detail).not.toContain('mana')
  })
})
