import { describe, it, expect } from 'vitest'
import { storyPointRows, sortForDisplay, applyStoryPointOp } from './storyPoints.js'

const summary = (sp) => storyPointRows(sp).map(r => `${r.active ? '●' : '○'}${r.reason}`).join(' ')

describe('storyPointRows', () => {
  it('derives rows for characters saved before the list existed', () => {
    const rows = storyPointRows({ total: 3, current: 1 })
    expect(rows.map(r => r.active)).toEqual([true, false, false])
    expect(rows.map(r => r.id)).toEqual(['sp-1', 'sp-2', 'sp-3'])
    expect(rows.every(r => r.reason === '')).toBe(true)
  })

  it('never shows fewer rows than active points', () => {
    expect(storyPointRows({ total: 1, current: 2 })).toHaveLength(2)
  })

  const entries = [
    { id: 'a', active: true, reason: 'start' },
    { id: 'b', active: true, reason: 'saved the mule' },
    { id: 'c', active: false, reason: 'spent at the gate' },
  ]

  it('keeps the list when it agrees with the live count', () => {
    expect(summary({ entries, current: 2 })).toBe('●start ●saved the mule ○spent at the gate')
  })

  it('spends the most recently gained point when the live count drops (GM spend)', () => {
    expect(summary({ entries, current: 1 })).toBe('●start ○saved the mule ○spent at the gate')
  })

  it('restores the earliest spent point when the live count rises', () => {
    expect(summary({ entries, current: 3 })).toBe('●start ●saved the mule ●spent at the gate')
  })

  it('adds active rows if the live count exceeds the list', () => {
    const rows = storyPointRows({ entries, current: 4 })
    expect(rows).toHaveLength(4)
    expect(rows.filter(r => r.active)).toHaveLength(4)
  })
})

describe('sortForDisplay', () => {
  it('lists active points above spent ones, in gained order', () => {
    const rows = [{ id: 'a', active: false }, { id: 'b', active: true }, { id: 'c', active: true }]
    expect(sortForDisplay(rows).map(r => r.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('applyStoryPointOp', () => {
  const sp = { total: 2, current: 2 }

  it('toggles a point and keeps total/current in step', () => {
    const next = applyStoryPointOp(sp, { type: 'toggle', id: 'sp-1' })
    expect(next).toMatchObject({ total: 2, current: 1 })
    expect(next.entries.map(r => r.active)).toEqual([false, true])
  })

  it('records a reason without changing the counts', () => {
    const next = applyStoryPointOp(sp, { type: 'reason', id: 'sp-2', reason: 'Spot award' })
    expect(next).toMatchObject({ total: 2, current: 2 })
    expect(next.entries[1].reason).toBe('Spot award')
  })

  it('adding a point raises the maximum (2/2 → 3/3)', () => {
    const next = applyStoryPointOp(sp, { type: 'add', id: 'new' })
    expect(next).toMatchObject({ total: 3, current: 3 })
    expect(next.entries[2]).toEqual({ id: 'new', active: true, reason: '' })
  })

  it('deleting a point lowers the maximum', () => {
    const next = applyStoryPointOp(sp, { type: 'delete', id: 'sp-2' })
    expect(next).toMatchObject({ total: 1, current: 1 })
  })

  it('re-applies cleanly to a fresher copy (GM conflict retry)', () => {
    const fresh = applyStoryPointOp(sp, { type: 'reason', id: 'sp-1', reason: 'player edit' })
    const next = applyStoryPointOp(fresh, { type: 'reason', id: 'sp-2', reason: 'gm edit' })
    expect(next.entries.map(r => r.reason)).toEqual(['player edit', 'gm edit'])
  })

  it('preserves unrelated storyPoints fields', () => {
    expect(applyStoryPointOp({ ...sp, extra: 1 }, { type: 'add' }).extra).toBe(1)
  })
})
