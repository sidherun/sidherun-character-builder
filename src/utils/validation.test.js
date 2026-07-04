import { describe, it, expect } from 'vitest'
import { validateStep } from './validation.js'

const withSkills = (level, pts) => ({
  level,
  skills: pts.map((p, i) => ({ name: `S${i}`, skillPoints: p })),
})

describe('validateStep — skill budget is level-aware (#178)', () => {
  it('allows spending up to the level pool (70 at L3)', () => {
    expect(validateStep(withSkills(3, [40, 30]), 7)).toEqual([]) // 70 == pool
  })
  it('flags exceeding the level pool with the correct max in the message', () => {
    const errs = validateStep(withSkills(3, [50, 30]), 7) // 80 > 70
    expect(errs).toHaveLength(1)
    expect(errs[0]).toContain('max 70')
    expect(errs[0]).toContain('level 3')
  })
  it('does not falsely flag a level-2 character at 50 points (old bug used a flat 30)', () => {
    expect(validateStep(withSkills(2, [30, 20]), 7)).toEqual([]) // 50 == L2 pool
  })
})
