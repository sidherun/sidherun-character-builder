import { describe, it, expect, vi } from 'vitest'
import { saveStoryPointOp } from './gmAdjust.js'

const base = { name: 'Haagen', storyPoints: { total: 2, current: 2 }, _dataRev: 5 }

describe('saveStoryPointOp (GM screen structural save, #377)', () => {
  it('applies the op to the freshest row and saves with its revision', async () => {
    const repo = {
      getCharacter: vi.fn().mockResolvedValue(base),
      saveCharacterData: vi.fn().mockResolvedValue({ ...base, _dataRev: 6 }),
    }
    const { next } = await saveStoryPointOp('id1', { type: 'reason', id: 'sp-1', reason: 'Spot award' }, repo)
    expect(repo.saveCharacterData).toHaveBeenCalledWith('id1', next, 5)
    expect(next.storyPoints.entries[0].reason).toBe('Spot award')
  })

  it('re-applies the op to the newer copy after a conflict', async () => {
    const playerEdited = { ...base, inventory: ['rope'], _dataRev: 6 }
    const repo = {
      getCharacter: vi.fn().mockResolvedValueOnce(base).mockResolvedValueOnce(playerEdited),
      saveCharacterData: vi.fn().mockResolvedValueOnce({ conflict: true }).mockResolvedValueOnce({ ...playerEdited, _dataRev: 7 }),
    }
    const { next } = await saveStoryPointOp('id1', { type: 'add', id: 'new' }, repo)
    expect(repo.saveCharacterData).toHaveBeenLastCalledWith('id1', next, 6)
    expect(next.inventory).toEqual(['rope']) // the player's edit survives
    expect(next.storyPoints).toMatchObject({ total: 3, current: 3 })
  })

  it('gives up with a clear error if it keeps conflicting', async () => {
    const repo = {
      getCharacter: vi.fn().mockResolvedValue(base),
      saveCharacterData: vi.fn().mockResolvedValue({ conflict: true }),
    }
    await expect(saveStoryPointOp('id1', { type: 'add' }, repo)).rejects.toThrow(/changed on another device/)
    expect(repo.saveCharacterData).toHaveBeenCalledTimes(2)
  })
})
