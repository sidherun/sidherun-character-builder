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

describe('formatRoll — weapon damage', () => {
  it('shows dice, flat bonus, melee crit STR, and type without GM target resolution', () => {
    const out = formatRoll({
      kind: 'damage', rolls: [6], dice: '1d8', bonus: 2, critBonus: 15,
      total: 23, damageType: 'slashing', gmTarget: 75,
    })
    expect(out).toEqual({
      color: 'var(--danger)', headline: '23',
      detail: '1d8 [6] + 2 + 15 crit STR · slashing',
      breakdown: null, note: null,
    })
  })

  it('formats migrated flat damage', () => {
    expect(formatRoll({ kind: 'damage', rolls: [], dice: '', bonus: 8, critBonus: 0, total: 8, damageType: '' }).detail)
      .toBe('flat damage + 8')
  })
})

describe('formatRoll — initiative', () => {
  it('shows d10 + AGI without applying a GM difficulty target', () => {
    expect(formatRoll({ kind: 'initiative', roll: 7, modifier: 12, total: 19, gmTarget: 75 })).toEqual({
      color: 'var(--bronze)', headline: '19', detail: 'd10 7 + 12',
      breakdown: null, note: null, // an entry from a client that predates #372
    })
  })
})

describe('formatRoll — plain Roll Dice (#370)', () => {
  const plain = { kind: 'total', label: 'Roll Dice', plain: true, rolls: [62], roll: 62, modifier: 0, total: 62 }

  it('shows the bare d100 without a "+ 0" modifier', () => {
    const out = formatRoll(plain)
    expect(out.headline).toBe('62')
    expect(out.detail).toBe('d100 62 · GM adjudicates')
  })

  it('resolves pass/fail against an active GM target', () => {
    expect(formatRoll({ ...plain, gmTarget: 50 })).toMatchObject({ headline: 'Pass', detail: 'd100 62 ≥ 50' })
    expect(formatRoll({ ...plain, gmTarget: 75 })).toMatchObject({ headline: 'Fail', detail: 'd100 62 < 75' })
  })

  it('keeps the exploding-roll tag and summed dice', () => {
    const out = formatRoll({ ...plain, rolls: [97, 40], roll: 137, total: 137 })
    expect(out.tag).toBe('Exploding roll!')
    expect(out.detail).toBe('d100 97+40 = 137 · GM adjudicates')
  })
})

describe('formatRoll — breakdowns (#372)', () => {
  const total = { kind: 'total', rolls: [62], roll: 62, total: 81 }

  it('names the source of an initiative modifier', () => {
    const out = formatRoll({ kind: 'initiative', roll: 3, modifier: 12, total: 15, parts: [{ label: 'Agility', value: 12 }] })
    expect(out.detail).toBe('d10 3 + 12')
    expect(out.breakdown).toBe('+12 = Agility 12')
  })

  it('breaks a skill modifier into attribute, skill points and temp', () => {
    const out = formatRoll({ ...total, modifier: 18, parts: [
      { label: 'Wisdom', value: 14 }, { label: 'skill', value: 5 }, { label: 'temp', value: -1 },
    ] })
    expect(out.breakdown).toBe('+18 = Wisdom 14 + skill 5 − temp 1')
  })

  it('shows a negative modifier with a proper minus sign', () => {
    expect(formatRoll({ ...total, modifier: -3, parts: [{ label: 'base', value: -3 }] }).breakdown).toBe('−3 = base −3')
  })

  it('carries a note about what was not added', () => {
    const out = formatRoll({ ...total, modifier: 17, parts: [{ label: 'Agility', value: 17 }], note: "weapon skill 10 not added (doesn't stack)" })
    expect(out.note).toBe("weapon skill 10 not added (doesn't stack)")
  })

  it('joins the roll note with the conditions note', () => {
    const out = formatRoll({ ...total, modifier: 0, parts: [{ label: 'Agility', value: 0 }], note: 'a', conditionNote: 'Not included: −10 Frightened' })
    expect(out.note).toBe('a · Not included: −10 Frightened')
  })

  it('skips the breakdown on a fumble (the modifier does not apply)', () => {
    const out = formatRoll({ ...total, modifier: 19, isFumble: true, fumble: 40, rolls: [3], parts: [{ label: 'Wisdom', value: 19 }] })
    expect(out.breakdown).toBeNull()
  })

  it('explains a spell target', () => {
    const out = formatRoll({ kind: 'spell', roll: 40, target: 57, success: true, margin: 17,
      parts: [{ label: 'matrix L3 vs L2', value: 43 }, { label: 'Thaumaturgy', value: 14 }] })
    expect(out.breakdown).toBe('target 57 = matrix L3 vs L2 43 + Thaumaturgy 14')
  })

  it('shows no breakdown for a plain roll', () => {
    expect(formatRoll({ ...total, kind: 'total', plain: true, modifier: 0, total: 62 }).breakdown).toBeNull()
  })
})
