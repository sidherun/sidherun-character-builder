import { describe, expect, it, vi } from 'vitest'
import { restoreCloudCharacters } from './cloudRestore.js'
const a = { name: 'Oryn Vesh', _rosterId: 'existing' }
const b = { name: 'New hero', _rosterId: 'other' }
const plan = { characters: [a, b], mode: 'copy', targets: {}, existing: [a], userId: 'player' }
function services() { return { create: vi.fn(async c => ({ ...c, _rosterId: `new-${c.name}` })), replace: vi.fn(async (_t,c) => ({ ...c, _rosterId: 'existing' })), getUser: vi.fn(async () => 'player') } }
describe('cloud restore', () => {
  it('creates new copies even when backup ids match existing characters', async () => {
    const s = services(); const results = await restoreCloudCharacters(plan, s)
    expect(s.replace).not.toHaveBeenCalled()
    expect(s.create).toHaveBeenCalledWith({ ...a, _rosterId: null }, { ownerUserId: 'player', signal: undefined })
    expect(results.every(r => r.status === 'saved')).toBe(true)
  })
  it('reports per-character failure and retains successful imports', async () => {
    const s = services(); s.create.mockRejectedValueOnce(new Error('Permission denied'))
    const results = await restoreCloudCharacters(plan, s)
    expect(results.map(r => r.status)).toEqual(['failed','saved'])
    expect(results[0].message).toBe('Permission denied')
  })
  it('replaces only explicitly selected accessible targets and skips unselected rows', async () => {
    const s = services(); const results = await restoreCloudCharacters({ ...plan, mode: 'replace', targets: { 0: 'existing' } }, s)
    expect(s.replace).toHaveBeenCalledWith(a, a, { signal: undefined })
    expect(s.create).not.toHaveBeenCalled()
    expect(results.map(r => r.status)).toEqual(['saved','skipped'])
  })
  it('rejects duplicate replacement targets before any writes', async () => {
    const s = services()
    await expect(restoreCloudCharacters({ ...plan, mode: 'replace', targets: { 0: 'existing', 1: 'existing' } }, s)).rejects.toThrow('only once')
    expect(s.replace).not.toHaveBeenCalled()
  })
  it('stops writes on an account change without losing earlier results', async () => {
    const s = services(); s.getUser.mockResolvedValueOnce('player').mockResolvedValueOnce('another')
    const results = await restoreCloudCharacters(plan, s)
    expect(s.create).toHaveBeenCalledTimes(1)
    expect(results.map(r => r.status)).toEqual(['saved','failed'])
    expect(results[1].message).toContain('account changed')
  })
  it('does not issue a write when the preview is cancelled', async () => {
    const s = services(); const controller = new AbortController(); controller.abort()
    expect(await restoreCloudCharacters({ ...plan, signal: controller.signal }, s)).toEqual([])
    expect(s.create).not.toHaveBeenCalled()
  })
})
